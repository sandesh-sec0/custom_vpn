"""
Unit tests for server/logger.py.

Verifies correct sanitisation, JSON formatting, and metrics tracking.
"""

import sys
import os
import json
import unittest

_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

from _custom_ssl_vpn.server.logger import sanitize, VPNLogger, JSONFormatter
import logging


class TestLoggerSanitization(unittest.TestCase):
    def test_sanitize_scrubs_secrets(self):
        data = {
            "username": "user1",
            "password": "super_secret_password",
            "access_token": "abcd123",
            "public_key": "some_key_material",
            "my_Secret": "hidden"
        }
        safe_data = sanitize(data)
        
        self.assertEqual(safe_data["username"], "user1")
        self.assertEqual(safe_data["password"], "[REDACTED]")
        self.assertEqual(safe_data["access_token"], "[REDACTED]")
        self.assertEqual(safe_data["public_key"], "[REDACTED]")
        self.assertEqual(safe_data["my_Secret"], "[REDACTED]")

    def test_sanitize_recursive(self):
        data = {
            "nested": {
                "user": "admin",
                "api_key": "mykey"
            }
        }
        safe_data = sanitize(data)
        self.assertEqual(safe_data["nested"]["user"], "admin")
        self.assertEqual(safe_data["nested"]["api_key"], "[REDACTED]")


class TestJSONFormatter(unittest.TestCase):
    def test_format_valid_json(self):
        formatter = JSONFormatter()
        record = logging.LogRecord(
            name="test", level=logging.INFO, pathname="", lineno=0,
            msg="User login", args=(), exc_info=None
        )
        # Attach data like VPNLogger does
        setattr(record, "data", {"ip": "10.0.0.1"})
        
        output = formatter.format(record)
        parsed = json.loads(output)
        
        self.assertIn("timestamp", parsed)
        self.assertEqual(parsed["level"], "INFO")
        self.assertEqual(parsed["event"], "User login")
        self.assertEqual(parsed["data"]["ip"], "10.0.0.1")


class TestVPNLoggerMetrics(unittest.TestCase):
    def setUp(self):
        self.log_file = "test_metrics_logger.log"
        self.logger = VPNLogger("test", self.log_file, "INFO")

    def tearDown(self):
        if os.path.exists(self.log_file):
            try:
                os.remove(self.log_file)
            except OSError:
                pass

    def test_auth_success_increments_active(self):
        stats = self.logger.get_stats()
        self.assertEqual(stats["active_sessions_count"], 0)
        
        self.logger.log_auth_success("user1", "session_1")
        stats = self.logger.get_stats()
        self.assertEqual(stats["active_sessions_count"], 1)

    def test_disconnect_decrements_active(self):
        self.logger.log_auth_success("user1", "session_1")
        self.logger.log_disconnect("session_1", "timeout")
        
        stats = self.logger.get_stats()
        self.assertEqual(stats["active_sessions_count"], 0)

    def test_traffic_accumulation(self):
        self.logger.log_traffic(100, 200)
        self.logger.log_traffic(50, 100)
        
        stats = self.logger.get_stats()
        self.assertEqual(stats["total_bytes_up"], 150)
        self.assertEqual(stats["total_bytes_down"], 300)


if __name__ == "__main__":
    unittest.main()

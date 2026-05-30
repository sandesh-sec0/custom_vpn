"""
Structured, JSON-formatted logging for the VPN server.

Every log record is serialised as a single JSON object (NDJSON / JSON-Lines)
containing ``timestamp``, ``level``, ``event``, and ``data`` keys.  This
format can be consumed directly by log aggregators such as Elasticsearch,
Splunk, or a simple ``grep | jq`` pipeline.

Design decisions:

* **No ``print()`` calls** — everything goes through ``VPNLogger``.
* **Sanitisation before write** — any dict key matching ``password``,
  ``secret``, ``key``, or ``token`` is replaced with ``"[REDACTED]"``
  before the record is written to disk or stderr.
* **Thread safety** — a ``threading.Lock`` serialises counter mutations.
* **Singleton pattern** — ``setup_logger`` creates the global instance and
  ``get_logger`` retrieves it from any module without re-importing the object.
"""

import logging
import json
import threading
import time
from datetime import datetime
from typing import Any, Dict, Optional, List

__all__ = ["VPNLogger", "setup_logger", "get_logger"]


class JSONFormatter(logging.Formatter):
    """
    Custom logging formatter that outputs records as JSON lines.
    Includes time, severity, the main event message, and arbitrarily
    attached secure context data.
    """

    def format(self, record: logging.LogRecord) -> str:
        """Serialise a log record to a single-line JSON string.

        Args:
            record: Standard library ``LogRecord`` object.  If the record
                carries an extra ``data`` attribute (attached via
                ``extra={"data": {...}}``), it is included in the output.

        Returns:
            A JSON string with keys ``timestamp``, ``level``, ``event``,
            and ``data``.  Guaranteed to contain no embedded newlines.
        """
        log_data = {
            "timestamp": datetime.fromtimestamp(record.created).isoformat() + "Z",
            "level": record.levelname,
            "event": record.getMessage(),
        }

        if hasattr(record, "data"):
            log_data["data"] = getattr(record, "data")
        else:
            log_data["data"] = {}

        return json.dumps(log_data)


def sanitize(data: Dict[str, Any]) -> Dict[str, Any]:
    """Recursively scrub sensitive values from a dict before it is logged.

    Walks the entire *data* dict (including nested dicts) and replaces the
    value of any key that contains the substrings ``"password"``,
    ``"secret"``, ``"key"``, or ``"token"`` (case-insensitive) with the
    literal string ``"[REDACTED]"``.

    Args:
        data: The dictionary to sanitise.  Nested dicts are processed
            recursively; non-dict values that are not under a sensitive key
            are passed through unchanged.

    Returns:
        A new dictionary (the input is not modified in-place) with all
        sensitive fields replaced by ``"[REDACTED]"``.

    Security note:
        Call this on every ``data`` dict before passing it to any logging
        method.  The ``VPNLogger._log`` helper does this automatically;
        call ``sanitize`` explicitly only when building structured output
        outside of ``VPNLogger``.

    Example:
        >>> sanitize({"username": "alice", "password": "s3cr3t"})
        {'username': 'alice', 'password': '[REDACTED]'}
        >>> sanitize({"nested": {"api_token": "abc123"}})
        {'nested': {'api_token': '[REDACTED]'}}
    """
    redacted = {}
    sensitive_substrings = ["password", "secret", "key", "token"]

    for k, v in data.items():
        is_sensitive = any(sub in k.lower() for sub in sensitive_substrings)

        if is_sensitive:
            redacted[k] = "[REDACTED]"
        elif isinstance(v, dict):
            redacted[k] = sanitize(v)
        else:
            redacted[k] = v

    return redacted


class VPNLogger:
    """
    Thread-safe structured logger for the VPN server.
    Wraps the standard logging module to enforce JSON formatting,
    data sanitisation, and basic operational metric tracking.
    """

    def __init__(
        self, name: str, log_file: str, level: str = "INFO", log_to_stderr: bool = False
    ) -> None:
        """
        Initializes the logger and backing metrics.

        Args:
            name (str): Name of the underlying python logger representation.
            log_file (str): Path to output the log messages.
            level (str): Minimum severity level to log.
            log_to_stderr (bool): Whether to duplicate logs to sys.stderr.
        """
        self._name = name
        self._log_file = log_file
        self._level = level.upper()
        self._log_to_stderr = log_to_stderr
        
        self._logger = logging.getLogger(name)
        self._logger.setLevel(getattr(logging, self._level, logging.INFO))

        # Clear existing handlers to prevent duplicates
        if self._logger.hasHandlers():
            self._logger.handlers.clear()

        formatter = JSONFormatter()

        file_handler = logging.FileHandler(log_file, encoding="utf-8")
        file_handler.setFormatter(formatter)
        self._logger.addHandler(file_handler)

        if log_to_stderr:
            stream_handler = logging.StreamHandler()
            stream_handler.setFormatter(formatter)
            self._logger.addHandler(stream_handler)

        # Metrics state lock to ensure thread safety
        self._lock = threading.Lock()

        self._connection_count = 0
        self._auth_failure_count = 0
        self._active_sessions_count = 0

        self._total_bytes_up = 0
        self._total_bytes_down = 0
        self._ip_auth_failures: Dict[str, List[float]] = {}
        self._start_time = time.time()

    def create_session_logger(self, username: str, user_id: int, session_id: str) -> 'SessionLogger':
        """
        Creates a dedicated session-specific logger that writes to:
        server/logs/[user_id-username]/[session_id].log
        """
        import os
        log_path = os.path.join("server", "logs", f"{user_id}-{username}", f"{session_id}.log")
        os.makedirs(os.path.dirname(log_path), exist_ok=True)
        
        return SessionLogger(session_id, log_path, self._level)

    def _log(
        self, level: int, event: str, data: Optional[Dict[str, Any]] = None
    ) -> None:
        """Sanitise *data* and emit a log record at the given severity level."""
        safe_data = sanitize(data) if data else {}
        self._logger.log(level, event, extra={"data": safe_data})

    def info(self, event: str, data: Optional[Dict[str, Any]] = None) -> None:
        """Log an informational event."""
        self._log(logging.INFO, event, data)

    def warning(self, event: str, data: Optional[Dict[str, Any]] = None) -> None:
        """Log a warning event."""
        self._log(logging.WARNING, event, data)

    def error(self, event: str, data: Optional[Dict[str, Any]] = None) -> None:
        """Log an error event."""
        self._log(logging.ERROR, event, data)

    def get_stats(self) -> Dict[str, Any]:
        """Returns a snapshot of the current operational metrics."""
        with self._lock:
            return {
                "connection_count": self._connection_count,
                "auth_failure_count": self._auth_failure_count,
                "active_sessions_count": self._active_sessions_count,
                "total_bytes_up": self._total_bytes_up,
                "total_bytes_down": self._total_bytes_down,
                "uptime_seconds": int(time.time() - self._start_time),
            }

    def log_connection(self, client_ip: str, client_port: int) -> None:
        """Record an incoming TCP/TLS connection."""
        with self._lock:
            self._connection_count += 1

        self._log(
            logging.INFO,
            "New Client Connection",
            {"client_ip": client_ip, "client_port": client_port},
        )

    def log_auth_success(self, username: str, session_id: str) -> None:
        """Record a successful authentication event."""
        with self._lock:
            self._active_sessions_count += 1

        self._log(
            logging.INFO,
            "Authentication Success",
            {"username": username, "session_id": session_id},
        )

    def log_auth_failure(
        self, username: str, reason: str, attempt: int, client_ip: str
    ) -> None:
        """Record a failed authentication attempt."""
        current_time = time.time()
        with self._lock:
            self._auth_failure_count += 1

            # Record time of failure for anomalies calculations (track 5 min window)
            ip_failures = self._ip_auth_failures.setdefault(client_ip, [])
            cutoff = current_time - 300
            self._ip_auth_failures[client_ip] = [t for t in ip_failures if t > cutoff]
            self._ip_auth_failures[client_ip].append(current_time)

        self._log(
            logging.WARNING,
            "Authentication Failure",
            {
                "username": username,
                "client_ip": client_ip,
                "reason": reason,
                "attempt": attempt,
            },
        )

    def log_disconnect(self, session_id: str, reason: str) -> None:
        """Record session termination."""
        with self._lock:
            if self._active_sessions_count > 0:
                self._active_sessions_count -= 1

        self._log(
            logging.INFO,
            "Client Disconnected",
            {"session_id": session_id, "reason": reason},
        )

    def log_tunnel_open(
        self, session_id: str, target_host: str, target_port: int
    ) -> None:
        """Record the opening of a bidirectional relay."""
        self._log(
            logging.INFO,
            "Tunnel Open",
            {
                "session_id": session_id,
                "target_host": target_host,
                "target_port": target_port,
            },
        )

    def log_tunnel_close(self, session_id: str) -> None:
        """Record the closure of the bidirectional relay."""
        self._log(logging.INFO, "Tunnel Closed", {"session_id": session_id})

    def log_traffic(self, bytes_up: int, bytes_down: int) -> None:
        """Accumulate global byte counters."""
        with self._lock:
            self._total_bytes_up += bytes_up
            self._total_bytes_down += bytes_down

    def get_ip_auth_failures(self, window_seconds: int = 300) -> Dict[str, int]:
        """Return recent authentication failure counts per source IP."""
        failure_rates = {}
        current_time = time.time()
        cutoff = current_time - window_seconds

        with self._lock:
            for ip, failures in self._ip_auth_failures.items():
                recent_failures = len([t for t in failures if t > cutoff])
                if recent_failures > 0:
                    failure_rates[ip] = recent_failures

        return failure_rates

    def log_security_event(self, event_type: str, data: Dict[str, Any]) -> None:
        """Record a security-notable event at WARNING severity."""
        self._log(
            logging.WARNING,
            "Security Event",
            {"event_type": event_type, "details": data},
        )


class SessionLogger:
    """
    Lightweight logger for a single VPN session.
    Delegates to a temporary session-specific file.
    """
    def __init__(self, session_id: str, log_file: str, level: str) -> None:
        self.session_id = session_id
        self._logger = logging.getLogger(f"session_{session_id}")
        self._logger.setLevel(getattr(logging, level, logging.INFO))
        
        # Prevent handler duplication if session_id is reused (unlikely with UUID)
        if not self._logger.handlers:
            formatter = JSONFormatter()
            fh = logging.FileHandler(log_file, encoding="utf-8")
            fh.setFormatter(formatter)
            self._logger.addHandler(fh)

    def _log(self, level: int, event: str, data: Optional[Dict[str, Any]] = None) -> None:
        safe_data = sanitize(data) if data else {}
        self._logger.log(level, event, extra={"data": safe_data})

    def info(self, event: str, data: Optional[Dict[str, Any]] = None) -> None:
        self._log(logging.INFO, event, data)

    def warning(self, event: str, data: Optional[Dict[str, Any]] = None) -> None:
        self._log(logging.WARNING, event, data)

    def error(self, event: str, data: Optional[Dict[str, Any]] = None) -> None:
        self._log(logging.ERROR, event, data)


# Global logger instance management loosely coupling components
_global_logger: Optional[VPNLogger] = None


def setup_logger(
    log_level: str = "INFO", log_file: str = "server.log", log_to_stderr: bool = False
) -> None:
    import os
    log_dir = os.path.dirname(log_file)
    if log_dir:
        os.makedirs(log_dir, exist_ok=True)
        
    global _global_logger
    _global_logger = VPNLogger("vpn_server", log_file, log_level, log_to_stderr)


def get_logger(module_name: str = "") -> "VPNLogger":
    global _global_logger
    if _global_logger is None:
        setup_logger()
    return _global_logger  # type: ignore

"""
Structured JSON logging utility.

All logs output as JSON for easy parsing and monitoring.
Automatically sanitizes sensitive keys (password, secret, key, token).
"""

import json
import logging
import sys
from datetime import datetime
from typing import Any

# Sensitive keywords to redact in logs
SENSITIVE_KEYS = {"password", "secret", "key", "token", "api_key", "jwt"}


def sanitize_dict(data: dict) -> dict:
    """
    Recursively sanitize sensitive values in a dictionary.

    Args:
        data: Dictionary to sanitize

    Returns:
        New dictionary with sensitive values redacted
    """
    if not isinstance(data, dict):
        return data

    sanitized = {}
    for key, value in data.items():
        # Check if key contains any sensitive keyword
        if any(keyword in key.lower() for keyword in SENSITIVE_KEYS):
            sanitized[key] = "[REDACTED]"
        elif isinstance(value, dict):
            sanitized[key] = sanitize_dict(value)
        elif isinstance(value, list):
            sanitized[key] = [
                sanitize_dict(item) if isinstance(item, dict) else item
                for item in value
            ]
        else:
            sanitized[key] = value

    return sanitized


class JSONFormatter(logging.Formatter):
    """Custom formatter that outputs JSON logs."""

    def format(self, record: logging.LogRecord) -> str:
        """Convert log record to JSON string."""
        log_dict = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        # Add exception info if present
        if record.exc_info:
            log_dict["exception"] = self.formatException(record.exc_info)

        # Add extra fields if present
        if hasattr(record, "extra_fields"):
            log_dict.update(sanitize_dict(record.extra_fields))

        return json.dumps(log_dict)


def get_logger(name: str) -> logging.Logger:
    """
    Get a structured logger instance.

    Args:
        name: Logger name (usually __name__)

    Returns:
        Configured logger with JSON formatter
    """
    logger = logging.getLogger(name)

    # Only configure if not already configured
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(JSONFormatter())
        logger.addHandler(handler)

    logger.setLevel(logging.INFO)
    return logger


def log_with_context(logger: logging.Logger, level: str, message: str, **context):
    """
    Log a message with additional context fields.

    Args:
        logger: Logger instance
        level: Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        message: Log message
        **context: Additional context fields (automatically sanitized)
    """
    # Sanitize context before logging
    clean_context = sanitize_dict(context)

    record = logging.LogRecord(
        name=logger.name,
        level=getattr(logging, level.upper()),
        pathname="",
        lineno=0,
        msg=message,
        args=(),
        exc_info=None,
    )
    record.extra_fields = clean_context

    logger.handle(record)

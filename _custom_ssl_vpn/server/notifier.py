"""
Asynchronous HTTP push notifier for session lifecycle events.

Pushes session START/STOP events to the FastAPI management backend so the
dashboard can reflect real-time session state.  Each notification is dispatched
in a short-lived daemon thread to avoid blocking the VPN server's
authentication and relay hot paths.

**Retry logic (C6):** If the backend is unreachable, the notifier retries up
to ``max_retries`` times with exponential backoff (1s, 2s, 4s) before giving
up.  Failed events are logged but never block the VPN server.

The backend URL is configurable via ``backend_url`` so deployment environments
can override the default ``localhost:8000`` target.
"""

import json
import logging
import threading
import time
import urllib.request
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from _custom_ssl_vpn.server.logger import get_logger

if TYPE_CHECKING:
    from _custom_ssl_vpn.server.session import Session

__all__ = ["VPNPushNotifier"]


class VPNPushNotifier:
    """Pushes session lifecycle events to the management backend via HTTP POST.

    Each ``notify()`` call spawns a daemon thread that fires an HTTP POST
    to the configured backend endpoint.  If the backend is unreachable,
    the notifier retries with exponential backoff before logging a
    warning and giving up.

    Attributes:
        backend_url: Full URL of the backend notification endpoint.
        max_retries: Maximum number of retry attempts on failure.
    """

    def __init__(
        self,
        backend_url: str = "http://localhost:8000/api/vpn-events/notify",
        max_retries: int = 3,
        monitor_secret: str = "default_unsafe_monitor_secret_123",
    ) -> None:
        """Initialise the notifier with the target backend URL.

        Args:
            backend_url: The HTTP endpoint that accepts session event POST
                payloads.  Must include the full path (not just the base URL).
            max_retries: Number of retry attempts with exponential backoff
                before the event is permanently dropped.  Defaults to ``3``.
            monitor_secret: Shared secret used to authenticate internal 
                notifications and bypass CSRF checks.
        """
        self.backend_url = backend_url
        self.max_retries = max_retries
        self.monitor_secret = monitor_secret
        self._logger = get_logger("VPNPushNotifier")

    def notify(self, session: "Session", event_type: str) -> None:
        """Dispatch a session event notification in a background thread.

        Args:
            session: The VPN session whose lifecycle event is being reported.
            event_type: One of ``"START"`` or ``"STOP"``.
        """
        threading.Thread(
            target=self._send_with_retry,
            args=(session, event_type),
            daemon=True,
            name=f"PushNotify-{event_type}-{session.session_id[:8]}",
        ).start()

    def _send_with_retry(self, session: "Session", event_type: str) -> None:
        """Attempt to send the notification with exponential backoff retries.

        Tries ``max_retries`` times.  Delay between attempts doubles each
        round (1s → 2s → 4s).  If all attempts fail, the event is logged
        at WARNING and silently dropped.

        Args:
            session: Source session for the event payload.
            event_type: ``"START"`` or ``"STOP"``.
        """
        data = {
            "session_id": session.session_id,
            "username": session.username,
            "client_ip": session.client_ip,
            "client_port": session.client_port,
            "event_type": event_type,
            "bytes_up": session.bytes_up,
            "bytes_down": session.bytes_down,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        delay = 1.0
        for attempt in range(1, self.max_retries + 1):
            try:
                body = json.dumps(data).encode("utf-8")
                req = urllib.request.Request(
                    self.backend_url,
                    data=body,
                    headers={
                        "Content-Type": "application/json",
                        "X-Monitor-Secret": self.monitor_secret
                    },
                )
                with urllib.request.urlopen(req, timeout=5) as resp:
                    if resp.status == 200:
                        return  # Success
                    self._logger._log(
                        logging.WARNING,
                        f"Backend returned {resp.status} for {event_type} (attempt {attempt}/{self.max_retries})",
                        {"session_id": session.session_id},
                    )
            except Exception as e:
                self._logger._log(
                    logging.WARNING,
                    f"Push {event_type} attempt {attempt}/{self.max_retries} failed: {e}",
                    {"session_id": session.session_id},
                )

            if attempt < self.max_retries:
                time.sleep(delay)
                delay *= 2  # Exponential backoff

        # All retries exhausted
        self._logger._log(
            logging.WARNING,
            f"Permanently failed to push {event_type} notification after {self.max_retries} attempts",
            {"session_id": session.session_id, "event_data": data},
        )

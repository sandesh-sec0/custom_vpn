"""
VPN statistics and health routes.

Exposes the VPN server's real-time telemetry to the frontend dashboard
via a clean REST endpoint, abstracting away the internal IPC details.
"""

import logging
from fastapi import APIRouter, Depends
from app.dependencies import get_admin_user
from app.models import User, Session as VPNSession
from app.services.vpn_control import vpn_control
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.database import get_database

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vpn", tags=["vpn"])


@router.get("/stats")
async def get_vpn_stats(
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_database),
):
    """
    Get full VPN server telemetry snapshot (admin only).

    Proxies the VPN's internal monitoring dashboard data and wraps it
    in a frontend-friendly format. Returns online/offline status even
    when the VPN server is unreachable.

    Args:
        admin_user: Currently logged-in admin user

    Returns:
        Dict with vpn_online, uptime, capacity, bandwidth, and anomalies.
    """
    try:
        # Attempt to fetch the full snapshot from VPN monitoring dashboard
        import socket
        import json

        with socket.create_connection(
            (vpn_control.host, vpn_control.port), timeout=vpn_control.timeout
        ) as sock:
            request = (
                "GET /stats HTTP/1.1\r\n"
                f"Host: {vpn_control.host}\r\n"
                "Connection: close\r\n"
                "\r\n"
            )
            sock.sendall(request.encode("utf-8"))

            response = b""
            while True:
                chunk = sock.recv(4096)
                if not chunk:
                    break
                response += chunk

            response_text = response.decode("utf-8", errors="replace")
            parts = response_text.split("\r\n\r\n", 1)

            if len(parts) < 2:
                raise ConnectionError("Empty response from VPN")

            data = json.loads(parts[1])

            # Calculate persistent totals from the database instead of volatile IPC
            total_db_up = db.query(func.sum(VPNSession.bytes_up)).scalar() or 0
            total_db_down = db.query(func.sum(VPNSession.bytes_down)).scalar() or 0
            total_conns = db.query(VPNSession).count()

            return {
                "vpn_online": True,
                "uptime_seconds": data.get("uptime_seconds", 0),
                "active_sessions": data.get("active_sessions_count", 0),
                "max_capacity": data.get("max_capacity_allowed", 0),
                "total_bytes_up": total_db_up,
                "total_bytes_down": total_db_down,
                "total_connections": total_conns,
                "anomalies": data.get("anomalies", []),
                "auth_failures_last_5m": data.get("auth_failures_last_5m_by_ip", {}),
                "snapshot_timestamp": data.get("snapshot_timestamp", ""),
            }

    except (socket.error, ConnectionError, Exception) as e:
        logger.debug("VPN control interface unreachable: %s", str(e))
        return {
            "vpn_online": False,
            "uptime_seconds": 0,
            "active_sessions": 0,
            "max_capacity": 0,
            "total_bytes_up": 0,
            "total_bytes_down": 0,
            "total_connections": 0,
            "anomalies": [],
            "auth_failures_last_5m": {},
            "snapshot_timestamp": "",
        }

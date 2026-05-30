"""
Session Sync Service — VPN → Backend Database Bridge

Periodically polls the VPN server's monitoring dashboard (HTTP on port 9999)
and synchronizes live session data into the backend's SQLite database.

This is the critical glue layer that makes the frontend dashboard reflect
real-time VPN state. Without this, the Session table stays empty.

Sync logic:
    1. Fetch live sessions from VPN via IPC (GET /stats).
    2. For each live session:
       - If session_id exists in DB → update bytes, last_active.
       - If session_id is new → insert a new Session row.
    3. For DB sessions marked "active" but NOT in the live set → mark "disconnected".
"""

import asyncio
import logging
from datetime import datetime
from typing import List, Dict, Any

from sqlalchemy.orm import Session as DbSession
from app.database import SessionLocal
from app.models.session import Session as SessionModel
from app.models.user import User
from app.services.vpn_control import vpn_control

logger = logging.getLogger(__name__)

# Sync interval in seconds
SYNC_INTERVAL_SECONDS: int = 5


async def session_sync_loop() -> None:
    """Background async loop that polls VPN and syncs sessions every N seconds.

    Runs indefinitely until the application shuts down. Each iteration:
    1. Fetches live sessions from VPN control interface.
    2. Upserts session data into the database.
    3. Marks stale sessions as disconnected.

    Errors are caught and logged — a single failed poll does not crash the loop.
    """
    logger.info("Session sync service started (interval=%ds)", SYNC_INTERVAL_SECONDS)

    while True:
        try:
            await asyncio.to_thread(_sync_sessions)
        except Exception as e:
            logger.warning("Session sync cycle failed: %s", str(e))

        await asyncio.sleep(SYNC_INTERVAL_SECONDS)


def _sync_sessions() -> None:
    """Perform one sync cycle: fetch VPN state and reconcile with DB.

    Runs in a thread (via asyncio.to_thread) so it doesn't block the event loop.
    Opens and closes its own DB session to avoid thread-safety issues.
    """
    db: DbSession = SessionLocal()
    try:
        # 1. Fetch live sessions from VPN
        live_sessions: List[Dict[str, Any]] = vpn_control.get_live_sessions()
        live_session_ids = set()

        for vpn_session in live_sessions:
            session_id = vpn_session.get("session_id", "")
            if not session_id:
                continue

            live_session_ids.add(session_id)

            # 2. Check if this session already exists in DB
            db_session = (
                db.query(SessionModel)
                .filter(SessionModel.session_id == session_id)
                .first()
            )

            if db_session:
                # Update existing session with latest bandwidth and timing
                db_session.bytes_up = vpn_session.get("bytes_up", db_session.bytes_up)
                db_session.bytes_down = vpn_session.get("bytes_down", db_session.bytes_down)
                db_session.last_active = datetime.utcnow()
                db_session.status = "active"
                # Clear disconnected_at if session came back (unlikely but safe)
                db_session.disconnected_at = None
            else:
                # Insert new session — resolve user_id from username
                username = vpn_session.get("username", "[unknown]")
                user_id = _resolve_user_id(db, username)

                new_session = SessionModel(
                    user_id=user_id,
                    username=username,
                    client_ip=vpn_session.get("client_ip", "0.0.0.0"),
                    session_id=session_id,
                    status="active",
                    created_at=datetime.utcnow(),
                    last_active=datetime.utcnow(),
                    bytes_up=vpn_session.get("bytes_up", 0),
                    bytes_down=vpn_session.get("bytes_down", 0),
                )
                db.add(new_session)

        # 3. Mark sessions that are no longer live as disconnected
        active_db_sessions = (
            db.query(SessionModel)
            .filter(SessionModel.status == "active")
            .all()
        )

        for db_session in active_db_sessions:
            if db_session.session_id not in live_session_ids:
                db_session.status = "disconnected"
                db_session.disconnected_at = datetime.utcnow()

        db.commit()

        if live_sessions:
            logger.debug(
                "Sync complete: %d live, %d total in DB",
                len(live_session_ids),
                len(active_db_sessions),
            )

    except Exception as e:
        db.rollback()
        raise
    finally:
        db.close()


def _resolve_user_id(db: DbSession, username: str) -> int | None:
    """Look up a user's DB ID by their VPN username.

    Args:
        db: Active database session.
        username: VPN username string.

    Returns:
        The user's integer ID, or None if the username doesn't exist
        in the backend's user table.
    """
    if not username or username in ("[unknown]", "[pending_auth]"):
        return None

    user = db.query(User).filter(User.username == username).first()
    return user.id if user else None

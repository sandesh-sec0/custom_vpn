"""
VPN Event routes.

Receives session start/stop notifications from the VPN server.
"""

from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_database
from app.models import Session as VPNSession
from app.utils.logger import get_logger
from pydantic import BaseModel

router = APIRouter(prefix="/vpn-events", tags=["vpn-events"])
logger = get_logger(__name__)

class VPNEvent(BaseModel):
    session_id: str
    username: str
    client_ip: str
    client_port: int
    event_type: str  # "START" or "STOP"
    bytes_up: Optional[int] = 0
    bytes_down: Optional[int] = 0
    timestamp: str

@router.post("/notify")
async def notify_vpn_event(
    event: VPNEvent,
    db: Session = Depends(get_database)
):
    """
    Handle session start/stop notifications from the VPN.
    """
    logger.info(f"Received VPN event: {event.event_type} for session {event.session_id}")
    
    # Extract timestamp (handling 'Z' for UTC compatibility)
    try:
        ts_str = event.timestamp.replace('Z', '+00:00')
        ts = datetime.fromisoformat(ts_str)
    except ValueError:
        ts = datetime.utcnow()

    if event.event_type == "START":
        # Create or update session in DB
        db_session = VPNSession(
            session_id=event.session_id,
            username=event.username,
            client_ip=event.client_ip,
            status="Active",
            created_at=ts,
            last_active=ts
        )
        db.merge(db_session)
    elif event.event_type == "STOP":
        # Mark session as closed in DB
        db_session = db.query(VPNSession).filter(VPNSession.session_id == event.session_id).first()
        if db_session:
            db_session.status = "Closed"
            db_session.disconnected_at = ts
            db_session.last_active = ts
            db_session.bytes_up = event.bytes_up or db_session.bytes_up
            db_session.bytes_down = event.bytes_down or db_session.bytes_down
    
    db.commit()
    return {"status": "ok"}

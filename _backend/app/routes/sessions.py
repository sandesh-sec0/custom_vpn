"""
Session management routes.

Admin endpoints for monitoring and terminating VPN sessions.
Session data is kept in sync by the background session_sync service,
so these endpoints read directly from the database.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_database
from app.models import User, Session as SessionModel, AuditLog
from app.dependencies import get_current_user, get_admin_user
from app.schemas.session import SessionResponse, SessionListResponse
from app.utils.errors import APIException, NotFoundError
from app.services.vpn_control import vpn_control
from fastapi.exceptions import HTTPException as FastAPIHTTPException
from datetime import datetime

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.get("", response_model=SessionListResponse)
async def list_sessions(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    user_id: int = Query(None),
    active_only: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_database),
):
    """
    List VPN sessions (admin only).

    Returns sessions from the database, which are kept in sync with
    the live VPN server by the background session_sync service.

    Args:
        skip: Number of records to skip
        limit: Number of records to return (max 100)
        user_id: Filter by user ID (optional)
        active_only: If true, only return sessions with status="active"
        admin_user: Currently logged-in admin user
        db: Database session

    Returns:
        SessionListResponse with paginated list
    """
    # If not admin, force filter to only their own sessions
    if not current_user.is_admin:
        user_id = current_user.id

    query = db.query(SessionModel)

    if user_id:
        query = query.filter(SessionModel.user_id == user_id)

    if active_only:
        query = query.filter(SessionModel.status == "active")

    total = query.count()
    items = (
        query.order_by(SessionModel.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    return {
        "items": items,
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(
    session_id: int,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_database),
):
    """
    Get a session by ID (admin only).

    Args:
        session_id: Session ID to retrieve
        admin_user: Currently logged-in admin user
        db: Database session

    Returns:
        SessionResponse

    Raises:
        HTTPException: If session not found
    """
    session = db.query(SessionModel).filter(SessionModel.id == session_id).first()

    if not session:
        raise FastAPIHTTPException(
            status_code=404, detail=f"Session {session_id} not found"
        )

    return session


@router.delete("/{session_id}")
async def delete_session(
    session_id: int,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_database),
):
    """
    Terminate a VPN session (admin only).

    Sends a termination command to the VPN server via IPC, then marks
    the session as disconnected in the database.

    Args:
        session_id: Session DB ID to terminate
        admin_user: Currently logged-in admin user
        db: Database session

    Returns:
        Success message

    Raises:
        HTTPException: If session not found
    """
    session = db.query(SessionModel).filter(SessionModel.id == session_id).first()

    if not session:
        raise FastAPIHTTPException(
            status_code=404, detail=f"Session {session_id} not found"
        )

    # 1. Attempt live termination via IPC
    ipc_success = False
    if session.session_id:
        ipc_success = vpn_control.terminate_session(session.session_id)

    # 2. Mark as disconnected in DB (don't delete — preserve history)
    session.status = "disconnected"
    session.disconnected_at = datetime.utcnow()

    # 3. Log audit event
    audit = AuditLog(
        user_id=admin_user.id,
        action="terminate_session",
        resource="Session",
        resource_id=session.id,
        timestamp=datetime.utcnow(),
        ip_address="dashboard",
        details=f"VPN IPC: {'success' if ipc_success else 'failed/offline'}",
        status_code=200,
    )
    db.add(audit)
    db.commit()

    return {
        "message": f"Session {session_id} terminated",
        "ipc_success": ipc_success,
    }

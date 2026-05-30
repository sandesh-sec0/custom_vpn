"""
Audit log routes.

Admin endpoints for viewing the system's audit trail.
Every administrative action (user CRUD, session termination) is logged
here with timestamps, IPs, and user IDs for compliance and traceability.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_database
from app.models import User, AuditLog
from app.dependencies import get_admin_user
from pydantic import BaseModel
from datetime import datetime
from typing import Optional

router = APIRouter(prefix="/audit-logs", tags=["audit"])


class AuditLogResponse(BaseModel):
    """Audit log entry response schema."""

    id: int
    user_id: int
    action: str
    resource: str
    resource_id: Optional[int] = None
    timestamp: datetime
    ip_address: str
    details: Optional[str] = None
    status_code: Optional[int] = None

    class Config:
        from_attributes = True


class AuditLogListResponse(BaseModel):
    """Paginated list of audit log entries."""

    items: list[AuditLogResponse]
    total: int
    skip: int
    limit: int

    class Config:
        from_attributes = True


@router.get("", response_model=AuditLogListResponse)
async def list_audit_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    action: str = Query(None, description="Filter by action type"),
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_database),
):
    """
    List audit log entries (admin only).

    Returns a paginated, reverse-chronological list of all administrative
    actions. Supports filtering by action type.

    Args:
        skip: Number of records to skip for pagination
        limit: Number of records to return (max 200)
        action: Optional filter by action type (e.g., 'create_user', 'terminate_session')
        admin_user: Currently logged-in admin user
        db: Database session

    Returns:
        AuditLogListResponse with paginated audit entries
    """
    query = db.query(AuditLog)

    if action:
        query = query.filter(AuditLog.action == action)

    total = query.count()
    items = (
        query.order_by(AuditLog.timestamp.desc())
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

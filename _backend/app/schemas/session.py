"""
Session request/response schemas.

Pydantic models for VPN session tracking.
"""

from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class SessionResponse(BaseModel):
    """Session information response."""

    id: int
    user_id: Optional[int] = None
    username: Optional[str] = None
    client_ip: str
    session_id: str
    status: str = "active"
    created_at: datetime
    last_active: datetime
    disconnected_at: Optional[datetime] = None
    bytes_up: int
    bytes_down: int

    class Config:
        orm_mode = True


class SessionListResponse(BaseModel):
    """List of sessions with pagination."""

    items: list[SessionResponse]
    total: int
    skip: int
    limit: int

    class Config:
        orm_mode = True

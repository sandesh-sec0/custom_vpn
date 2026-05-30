"""
Audit log database model.

Tracks all administrative actions for compliance and security.
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text
from app.database import Base


class AuditLog(Base):
    """
    Audit log entry model.

    Records all user management and administrative actions.

    Attributes:
        id: Unique log entry identifier (primary key)
        user_id: ID of the user who performed the action
        action: Type of action (create_user, delete_user, update_user, etc.)
        resource: Resource affected (User, Session, etc.)
        resource_id: ID of the affected resource
        timestamp: When action occurred
        ip_address: IP address of the user
        details: Additional context about the action (JSON string)
        status_code: HTTP response code (for API actions)
    """

    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    action = Column(String(255), nullable=False, index=True)
    resource = Column(String(255), nullable=False)
    resource_id = Column(Integer, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    ip_address = Column(String(45), nullable=False)
    details = Column(Text, nullable=True)  # JSON or free text
    status_code = Column(Integer, nullable=True)

    def __repr__(self) -> str:
        return f"<AuditLog(id={self.id}, user_id={self.user_id}, action={self.action}, resource={self.resource})>"

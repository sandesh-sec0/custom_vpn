"""
UserPermission database model.

Links users to the services they are authorized to access.
"""

from datetime import datetime
from sqlalchemy import Column, Integer, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.database import Base


class UserPermission(Base):
    """
    Mapping between users and allowable services.

    Attributes:
        id: Unique permission record ID
        user_id: Foreign key to users.id
        service_id: Foreign key to services.id
        created_at: Assignment timestamp
    """

    __tablename__ = "user_permissions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    service_id = Column(Integer, ForeignKey("services.id", ondelete="CASCADE"), index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Note: Not explicitly defining back_populates relationships on User right now to keep User model intact,
    # but could be added later if helpful.
    
    def __repr__(self) -> str:
        return f"<UserPermission(id={self.id}, user_id={self.user_id}, service_id={self.service_id})>"

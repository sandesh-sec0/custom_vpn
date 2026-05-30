"""
User database model.

Stores user accounts with password hashes, roles, and timestamps.
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from app.database import Base


class User(Base):
    """
    User account model.

    Attributes:
        id: Unique user identifier (primary key)
        username: Unique username for login
        email: Unique email address
        password_hash: Bcrypt-hashed password (never store plaintext)
        is_admin: True if user has administration privileges
        is_active: False means soft-deleted (not shown in queries)
        created_at: Account creation timestamp
        updated_at: Last modification timestamp
    """

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(255), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    is_admin = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self) -> str:
        return f"<User(id={self.id}, username={self.username}, email={self.email}, is_admin={self.is_admin})>"

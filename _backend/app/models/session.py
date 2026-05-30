"""
Session database model.

Tracks active VPN tunnels and bandwidth usage.
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, BigInteger, ForeignKey, Enum
from app.database import Base


class Session(Base):
    """
    VPN session model.

    Represents an active tunnel connection with traffic metrics.

    Attributes:
        id: Unique session identifier (primary key)
        user_id: Foreign key to User table
        client_ip: Client's source IP address
        session_id: Unique tunnel identifier from VPN server
        created_at: Connection start timestamp
        last_active: Last activity timestamp
        bytes_up: Bytes uploaded through tunnel
        bytes_down: Bytes downloaded through tunnel
    """

    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=True)
    username = Column(String(255), nullable=True, index=True)
    client_ip = Column(String(45), nullable=False)  # IPv6 can be up to 45 chars
    session_id = Column(String(255), unique=True, index=True, nullable=False)
    status = Column(String(20), default="active", index=True)  # active | disconnected
    created_at = Column(DateTime, default=datetime.utcnow)
    last_active = Column(DateTime, default=datetime.utcnow)
    disconnected_at = Column(DateTime, nullable=True)
    bytes_up = Column(BigInteger, default=0)
    bytes_down = Column(BigInteger, default=0)

    def __repr__(self) -> str:
        return f"<Session(id={self.id}, username={self.username}, client_ip={self.client_ip}, status={self.status})>"

    def is_expired(self, timeout_seconds: int) -> bool:
        """
        Check if session has exceeded idle timeout.

        Args:
            timeout_seconds: Maximum idle time in seconds

        Returns:
            True if session is older than timeout, False otherwise
        """
        elapsed = datetime.utcnow() - self.last_active
        return elapsed.total_seconds() > timeout_seconds

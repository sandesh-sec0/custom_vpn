"""
Service database model.

Stores defined internal services that VPN clients can connect to.
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Boolean
from app.database import Base


class Service(Base):
    """
    Service definition model.

    Attributes:
        id: Unique service identifier (primary key)
        name: Human-readable name for the service
        host: Target IP or internal hostname
        port: Target TCP port
        protocol: Application protocol hint (e.g., 'http', 'ssh', 'mysql')
        description: Informational description of the service
        created_at: Creation timestamp
        updated_at: Last modification timestamp
    """

    __tablename__ = "services"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, index=True, nullable=False)
    host = Column(String(255), nullable=False)
    port = Column(Integer, nullable=False)
    protocol = Column(String(50), default="tcp")  # e.g., 'http', 'ssh', 'tcp'
    description = Column(String(1000), nullable=True)
    is_persistent = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self) -> str:
        return f"<Service(id={self.id}, name={self.name}, host={self.host}, port={self.port})>"

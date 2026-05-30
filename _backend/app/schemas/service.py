"""
Service Pydantic schemas.

Contains schemas for Service and UserPermission structures.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


# Service Schemas

class ServiceBase(BaseModel):
    name: str = Field(..., max_length=255, description="Name of the service")
    host: str = Field(..., max_length=255, description="Target host IP or domain")
    port: int = Field(..., ge=1, le=65535, description="Target host port")
    protocol: Optional[str] = Field("tcp", max_length=50, description="App protocol (e.g. http, ssh)")
    description: Optional[str] = Field(None, max_length=1000, description="Helpful description")
    is_persistent: bool = Field(True, description="Whether the tunnel handles multiple subsequent connections")


class ServiceCreate(ServiceBase):
    pass


class ServiceUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    host: Optional[str] = Field(None, max_length=255)
    port: Optional[int] = Field(None, ge=1, le=65535)
    protocol: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = Field(None, max_length=1000)
    is_persistent: Optional[bool] = Field(None)


class ServiceResponse(ServiceBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# UserPermission Schemas

class UserPermissionBase(BaseModel):
    user_id: int
    service_id: int


class UserPermissionCreate(UserPermissionBase):
    pass


class UserPermissionResponse(UserPermissionBase):
    id: int
    created_at: datetime

    class Config:
        orm_mode = True


class PermissionDetailResponse(BaseModel):
    """Enriched permission record with user and service details."""
    id: int
    user_id: int
    username: str
    email: str
    service_id: int
    service_name: str
    created_at: datetime

    class Config:
        orm_mode = True


# Aggregated Response Schema

class ConfigResponse(BaseModel):
    """Schema for the downloadable JSON config format."""
    server: str
    service_name: str
    local_port: int
    credentials: Optional[str] = None
    target_host: str
    target_port: int
    persistent: bool = True

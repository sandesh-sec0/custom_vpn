"""
User request/response schemas.

Pydantic models for user CRUD operations.
"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


class UserCreateRequest(BaseModel):
    """Request to create a new user (admin only)."""

    username: str = Field(..., min_length=3, max_length=255)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=255)
    is_admin: bool = False


class UserUpdateRequest(BaseModel):
    """Request to update a user (admin only)."""

    email: Optional[EmailStr] = None
    is_active: Optional[bool] = None
    is_admin: Optional[bool] = None


class UserResponse(BaseModel):
    """User information (without sensitive data)."""

    id: int
    username: str
    email: str
    is_admin: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True


class UserListResponse(BaseModel):
    """List of users with pagination info."""

    items: list[UserResponse]
    total: int
    skip: int
    limit: int

    class Config:
        orm_mode = True

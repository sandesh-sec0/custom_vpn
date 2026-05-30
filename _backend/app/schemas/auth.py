"""
Authentication request/response schemas.

Pydantic models for login, logout, and token refresh.
"""

from pydantic import BaseModel, Field
from typing import Optional


class LoginRequest(BaseModel):
    """User login request."""

    username: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=6, max_length=255)


class TokenResponse(BaseModel):
    """JWT token response."""

    access_token: str
    token_type: str = "bearer"
    expires_in: int  # Seconds until token expiry


class UserResponse(BaseModel):
    """User information (without sensitive data)."""

    id: int
    username: str
    email: str
    is_admin: bool
    is_active: bool

    class Config:
        orm_mode = True  # Allows building from ORM objects


class LoginResponse(BaseModel):
    """Complete login response with token and user info."""

    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class LogoutRequest(BaseModel):
    """Logout request (minimal, mainly for consistency)."""

    pass


class ForgotPasswordRequest(BaseModel):
    """Request for a password reset email."""

    email: str = Field(..., max_length=255)


class ResetPasswordRequest(BaseModel):
    """Request to update password with a reset token."""

    token: str
    new_password: str = Field(..., min_length=6, max_length=255)


class ChangePasswordRequest(BaseModel):
    """Request to change currently logged-in user's password."""

    current_password: str = Field(..., min_length=6, max_length=255)
    new_password: str = Field(..., min_length=8, max_length=255)

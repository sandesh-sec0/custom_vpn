"""
Security utilities for JWT and password operations.

Handles token generation/verification and bcrypt password hashing.
Implements timing-safe comparisons per project rules.
"""

import jwt
import hmac
from datetime import datetime, timedelta
from passlib.context import CryptContext
from app.config import settings

# Bcrypt password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """
    Hash a plaintext password using bcrypt.

    Args:
        password: Plaintext password to hash

    Returns:
        Bcrypt hash string
    """
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify plaintext password against bcrypt hash using timing-safe comparison.

    Args:
        plain_password: User-provided password
        hashed_password: Stored bcrypt hash

    Returns:
        True if password matches, False otherwise
    """
    # passlib.verify() uses timing-safe comparison internally
    return pwd_context.verify(plain_password, hashed_password)


def create_jwt_token(user_id: int, username: str, is_admin: bool) -> str:
    """
    Create a signed JWT token.

    Token includes user_id, username, is_admin, issued time, and expiry.

    Args:
        user_id: User's database ID
        username: User's username
        is_admin: Whether user has admin privileges

    Returns:
        JWT token string
    """
    now = datetime.utcnow()
    expiry = now + timedelta(hours=settings.jwt_expiry_hours)

    payload = {
        "user_id": user_id,
        "username": username,
        "is_admin": is_admin,
        "iat": now,
        "exp": expiry,
    }

    token = jwt.encode(
        payload,
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )
    return token


def verify_jwt_token(token: str) -> dict | None:
    """
    Verify and decode a JWT token.

    Args:
        token: JWT token string to verify

    Returns:
        Decoded payload dict if valid, None if invalid or expired
    """
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
        )
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def get_token_expiry_seconds(token: str) -> int:
    """
    Get remaining seconds until token expires.

    Args:
        token: JWT token string

    Returns:
        Seconds until expiry, or 0 if token is invalid/expired
    """
    payload = verify_jwt_token(token)
    if not payload:
        return 0

    exp_timestamp = payload.get("exp", 0)
    remaining = exp_timestamp - datetime.utcnow().timestamp()
    return max(0, int(remaining))


def create_reset_token(email: str) -> str:
    """
    Create a short-lived reset token for password recovery.

    Args:
        email: User's email address

    Returns:
        JWT token string
    """
    now = datetime.utcnow()
    expiry = now + timedelta(minutes=15)  # Short 15-minute window for resets

    payload = {
        "sub": email,
        "purpose": "password_reset",
        "iat": now,
        "exp": expiry,
    }

    token = jwt.encode(
        payload,
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )
    return token


def verify_reset_token(token: str) -> str | None:
    """
    Verify a password reset token and return the email if valid.

    Args:
        token: Reset token to verify

    Returns:
        Email address if valid, None otherwise
    """
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
        )

        if payload.get("purpose") != "password_reset":
            return None

        return payload.get("sub")
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None

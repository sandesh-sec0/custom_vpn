"""
FastAPI dependency injection functions.

Provides database sessions, authentication checks, and other shared logic.
"""

from fastapi import Depends, HTTPException, Header, Request
from sqlalchemy.orm import Session
from app.database import get_database
from app.models import User
from app.utils.security import verify_jwt_token
from typing import Optional


def get_db():
    """
    Dependency to inject database session into route handlers.

    Yields:
        SQLAlchemy Session for database operations
    """
    yield from get_database()


async def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
) -> User:
    """
    Dependency to get the currently authenticated user from JWT token.

    Extracts token from access_token cookie, or falls back to Authorization header.

    Args:
        request: FastAPI Request object
        db: Database session

    Returns:
        User object if token is valid

    Raises:
        HTTPException: If token is missing, invalid, or user not found
    """
    token = request.cookies.get("access_token")
    
    if not token:
        authorization = request.headers.get("Authorization")
        if authorization:
            parts = authorization.split()
            if len(parts) == 2 and parts[0].lower() == "bearer":
                token = parts[1]
                
    if not token:
        raise HTTPException(status_code=401, detail="Missing authorization token")

    # Verify token
    payload = verify_jwt_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    # Load user from database
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return user


async def get_admin_user(current_user: User = Depends(get_current_user)) -> User:
    """
    Dependency to ensure current user is an admin.

    Args:
        current_user: Currently authenticated user

    Returns:
        User object if they have admin privileges

    Raises:
        HTTPException: If user is not an admin
    """
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin privileges required")

    return current_user

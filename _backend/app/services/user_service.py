"""
User management service.

Handles user CRUD operations (admin only).
"""

from sqlalchemy.orm import Session
from app.models import User
from app.utils.security import hash_password
from app.utils.errors import ConflictError, NotFoundError, ValidationError
from app.utils.logger import get_logger
from app.services.vpn_user_sync_service import sync_user_to_vpn, remove_user_from_vpn

logger = get_logger(__name__)


def create_user(
    username: str, email: str, password: str, is_admin: bool, db: Session
) -> User:
    """
    Create a new user account.

    Args:
        username: Unique username
        email: Unique email address
        password: Plaintext password (will be hashed)
        is_admin: Whether user has admin privileges
        db: Database session

    Returns:
        Created User object

    Raises:
        ConflictError: If username or email already exists
        ValidationError: If inputs are invalid
    """
    # Validate inputs
    if not username or len(username) < 3:
        raise ValidationError("Username must be at least 3 characters")

    if not email or "@" not in email:
        raise ValidationError("Invalid email format")

    if not password or len(password) < 8:
        raise ValidationError("Password must be at least 8 characters")

    # Check for duplicates
    existing = (
        db.query(User)
        .filter((User.username.ilike(username)) | (User.email.ilike(email)))
        .first()
    )

    if existing:
        if existing.username.lower() == username.lower():
            raise ConflictError(f"Username '{username}' already exists")
        else:
            raise ConflictError(f"Email '{email}' already exists")

    # Hash password and create user
    user = User(
        username=username,
        email=email,
        password_hash=hash_password(password),
        is_admin=is_admin,
        is_active=True,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    # Sync to VPN store
    sync_user_to_vpn(username, password, user.id)

    logger.info(
        f"User {username} created",
        extra={"user_id": user.id, "username": username, "is_admin": is_admin},
    )

    return user


def get_user(user_id: int, db: Session) -> User:
    """
    Get a user by ID.

    Args:
        user_id: User's database ID
        db: Database session

    Returns:
        User object

    Raises:
        NotFoundError: If user not found
    """
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise NotFoundError(f"User with ID {user_id} not found")

    return user


def list_users(
    skip: int = 0, limit: int = 20, search: str = None, db: Session = None
) -> tuple[list[User], int]:
    """
    List all users with pagination.

    Args:
        skip: Number of records to skip
        limit: Maximum records to return (max 100)
        search: Optional search term for username/email
        db: Database session

    Returns:
        Tuple of (list of User objects, total count)
    """
    if limit > 100:
        limit = 100

    query = db.query(User)
    
    if search:
        query = query.filter(
            (User.username.ilike(f"%{search}%")) | (User.email.ilike(f"%{search}%"))
        )

    total = query.count()
    users = query.offset(skip).limit(limit).all()

    return users, total


def update_user(
    user_id: int,
    email: str = None,
    is_active: bool = None,
    is_admin: bool = None,
    db: Session = None,
) -> User:
    """
    Update user fields (email, active status, admin status).

    Args:
        user_id: User's database ID
        email: New email (optional)
        is_active: New active status (optional)
        is_admin: New admin status (optional)
        db: Database session

    Returns:
        Updated User object

    Raises:
        NotFoundError: If user not found
        ConflictError: If email is already in use
    """
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise NotFoundError(f"User with ID {user_id} not found")

    # Check if new email is unique
    if email and email != user.email:
        existing = db.query(User).filter(User.email.ilike(email)).first()
        if existing:
            raise ConflictError(f"Email '{email}' already exists")
        user.email = email

    if is_active is not None:
        user.is_active = is_active

    if is_admin is not None:
        user.is_admin = is_admin

    db.commit()
    db.refresh(user)

    logger.info(
        f"User {user.username} updated",
        extra={
            "user_id": user.id,
            "is_active": user.is_active,
            "is_admin": user.is_admin,
        },
    )

    return user


def change_password(user_id: int, new_password: str, db: Session) -> User:
    """
    Change a user's password.

    Args:
        user_id: User's database ID
        new_password: New plaintext password
        db: Database session

    Returns:
        Updated User object

    Raises:
        NotFoundError: If user not found
        ValidationError: If password is too short
    """
    if not new_password or len(new_password) < 8:
        raise ValidationError("Password must be at least 8 characters")

    user = get_user(user_id, db)
    user.password_hash = hash_password(new_password)

    db.commit()
    db.refresh(user)

    # Sync to VPN store
    sync_user_to_vpn(user.username, new_password, user.id)

    logger.info(
        f"Password changed for user {user.username}",
        extra={"user_id": user.id},
    )

    return user


def delete_user(user_id: int, db: Session) -> User:
    """
    Soft delete a user (set is_active = False).

    Args:
        user_id: User's database ID
        db: Database session

    Returns:
        Deleted User object

    Raises:
        NotFoundError: If user not found
    """
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise NotFoundError(f"User with ID {user_id} not found")

    user.is_active = False
    db.commit()
    db.refresh(user)

    # Remove from VPN store
    remove_user_from_vpn(user.username)

    logger.info(
        f"User {user.username} deleted",
        extra={"user_id": user.id},
    )

    return user

"""
Tests for user management routes and services.
"""

import pytest
from sqlalchemy.orm import Session
from app.models import User
from app.services.user_service import (
    create_user,
    get_user,
    list_users,
    update_user,
    delete_user,
)
from app.utils.security import hash_password
from app.utils.errors import ConflictError, NotFoundError


@pytest.fixture
def admin_user(db: Session):
    """Create an admin test user."""
    user = User(
        username="admin",
        email="admin@example.com",
        password_hash=hash_password("adminpass123"),
        is_admin=True,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def regular_user(db: Session):
    """Create a regular test user."""
    user = User(
        username="regular",
        email="regular@example.com",
        password_hash=hash_password("password123"),
        is_admin=False,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def test_create_user_success(db: Session):
    """Test creating a new user."""
    user = create_user(
        username="newuser",
        email="newuser@example.com",
        password="password123",
        is_admin=False,
        db=db,
    )

    assert user.id is not None
    assert user.username == "newuser"
    assert user.email == "newuser@example.com"
    assert user.is_admin is False
    assert user.is_active is True


def test_create_user_duplicate_username(db: Session, regular_user):
    """Test creating user with duplicate username."""
    with pytest.raises(ConflictError):
        create_user(
            username="regular",  # Already exists
            email="duplicate@example.com",
            password="password123",
            is_admin=False,
            db=db,
        )


def test_create_user_duplicate_email(db: Session, regular_user):
    """Test creating user with duplicate email."""
    with pytest.raises(ConflictError):
        create_user(
            username="different",
            email="regular@example.com",  # Already exists
            password="password123",
            is_admin=False,
            db=db,
        )


def test_create_user_short_password(db: Session):
    """Test creating user with short password."""
    with pytest.raises(Exception):  # ValidationError
        create_user(
            username="user",
            email="user@example.com",
            password="short",
            is_admin=False,
            db=db,
        )


def test_get_user(db: Session, regular_user):
    """Test retrieving a user."""
    user = get_user(user_id=regular_user.id, db=db)
    assert user.id == regular_user.id
    assert user.username == "regular"


def test_get_user_not_found(db: Session):
    """Test retrieving non-existent user."""
    with pytest.raises(NotFoundError):
        get_user(user_id=9999, db=db)


def test_list_users(db: Session, admin_user, regular_user):
    """Test listing users."""
    users, total = list_users(skip=0, limit=10, db=db)

    assert total == 2
    assert len(users) == 2


def test_list_users_pagination(db: Session):
    """Test user pagination."""
    # Create 25 users
    for i in range(25):
        user = User(
            username=f"user{i}",
            email=f"user{i}@example.com",
            password_hash=hash_password("password123"),
            is_admin=False,
            is_active=True,
        )
        db.add(user)
    db.commit()

    # Get first page
    users, total = list_users(skip=0, limit=10, db=db)
    assert len(users) == 10
    assert total == 25

    # Get second page
    users, total = list_users(skip=10, limit=10, db=db)
    assert len(users) == 10


def test_update_user(db: Session, regular_user):
    """Test updating a user."""
    updated = update_user(
        user_id=regular_user.id,
        email="newemail@example.com",
        is_active=False,
        is_admin=True,
        db=db,
    )

    assert updated.email == "newemail@example.com"
    assert updated.is_active is False
    assert updated.is_admin is True


def test_update_user_not_found(db: Session):
    """Test updating non-existent user."""
    with pytest.raises(NotFoundError):
        update_user(user_id=9999, email="test@example.com", db=db)


def test_delete_user(db: Session, regular_user):
    """Test soft-deleting a user."""
    deleted = delete_user(user_id=regular_user.id, db=db)

    assert deleted.is_active is False

    # User still exists in database but is inactive
    db.refresh(regular_user)
    assert regular_user.is_active is False

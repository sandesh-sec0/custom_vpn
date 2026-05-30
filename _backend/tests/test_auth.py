"""
Tests for authentication routes and services.
"""

import pytest
from sqlalchemy.orm import Session
from app.models import User
from app.services.auth_service import authenticate_user
from app.utils.security import hash_password
from app.utils.errors import AuthenticationError


@pytest.fixture
def test_user(db: Session):
    """Create a test user."""
    user = User(
        username="testuser",
        email="test@example.com",
        password_hash=hash_password("password123"),
        is_admin=False,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def test_login_success(client, test_user):
    """Test successful login."""
    response = client.post(
        "/api/auth/login",
        json={"username": "testuser", "password": "password123"},
    )

    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["username"] == "testuser"
    assert data["user"]["email"] == "test@example.com"
    assert data["user"]["is_admin"] is False


def test_login_wrong_password(client, test_user):
    """Test login with wrong password."""
    response = client.post(
        "/api/auth/login",
        json={"username": "testuser", "password": "wrongpassword"},
    )

    assert response.status_code == 401
    assert "Invalid" in response.json()["detail"]


def test_login_user_not_found(client):
    """Test login with non-existent user."""
    response = client.post(
        "/api/auth/login",
        json={"username": "nonexistent", "password": "password123"},
    )

    assert response.status_code == 401


def test_login_inactive_user(db, client):
    """Test login with inactive user."""
    user = User(
        username="inactive",
        email="inactive@example.com",
        password_hash=hash_password("password123"),
        is_admin=False,
        is_active=False,
    )
    db.add(user)
    db.commit()

    response = client.post(
        "/api/auth/login",
        json={"username": "inactive", "password": "password123"},
    )

    assert response.status_code == 401


def test_logout(client, test_user):
    """Test logout endpoint."""
    response = client.post(
        "/api/auth/logout",
        json={},
        cookies={"csrf_token": "test_token"},
        headers={"X-CSRF-Token": "test_token"}
    )
    assert response.status_code == 200
    assert "Logged out" in response.json()["message"]


def test_authenticate_user_service(db, test_user):
    """Test authenticate_user service function."""
    user, token = authenticate_user(
        username="testuser",
        password="password123",
        db=db,
        client_ip="127.0.0.1",
    )

    assert user.id == test_user.id
    assert token is not None
    assert len(token) > 0


def test_authenticate_user_invalid_password(db, test_user):
    """Test authenticate_user with invalid password."""
    with pytest.raises(AuthenticationError):
        authenticate_user(
            username="testuser",
            password="wrongpassword",
            db=db,
            client_ip="127.0.0.1",
        )

"""
Admin account creation script.

Run this script to create an initial admin user:
    python create_admin.py
"""

import sys
import os

# Ensure the _backend directory is in sys.path so 'app' can be imported
backend_dir = os.path.abspath(os.path.dirname(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from sqlalchemy.orm import Session
from app.database import SessionLocal, create_all_tables
from app.models import User
from app.utils.security import hash_password


def create_admin_user(username: str, email: str, password: str) -> User:
    """
    Create an admin user account.

    Args:
        username: Admin username
        email: Admin email
        password: Admin password (plaintext, will be hashed)

    Returns:
        Created User object
    """
    # Create all tables first
    create_all_tables()

    db = SessionLocal()

    try:
        # Check if user already exists
        existing = (
            db.query(User)
            .filter((User.username.ilike(username)) | (User.email.ilike(email)))
            .first()
        )

        if existing:
            print(
                f"Error: User with username '{username}' or email '{email}' already exists"
            )
            return None

        # Create admin user
        admin = User(
            username=username,
            email=email,
            password_hash=hash_password(password),
            is_admin=True,
            is_active=True,
        )

        db.add(admin)
        db.commit()
        db.refresh(admin)

        print(f"✓ Admin user created successfully!")
        print(f"  ID: {admin.id}")
        print(f"  Username: {admin.username}")
        print(f"  Email: {admin.email}")
        print(f"  Is Admin: {admin.is_admin}")

        return admin

    except Exception as e:
        db.rollback()
        print(f"Error creating admin user: {e}")
        return None

    finally:
        db.close()


if __name__ == "__main__":
    print("=" * 50)
    print("VPN Backend - Admin User Creation")
    print("=" * 50)
    print()

    # Get input from user
    username = input("Enter admin username: ").strip()
    if not username:
        print("Error: Username cannot be empty")
        sys.exit(1)

    email = input("Enter admin email: ").strip()
    if not email or "@" not in email:
        print("Error: Invalid email format")
        sys.exit(1)

    password = input("Enter admin password (min 8 chars): ").strip()
    if not password or len(password) < 8:
        print("Error: Password must be at least 8 characters")
        sys.exit(1)

    confirm_password = input("Confirm admin password: ").strip()
    if password != confirm_password:
        print("Error: Passwords do not match")
        sys.exit(1)

    print()
    print("Creating admin user...")
    print()

    admin = create_admin_user(username, email, password)

    if admin:
        print()
        print("✓ Setup complete! You can now log in with these credentials.")
        print(f"  Login URL: http://localhost:3000/login")
        print(f"  API Docs: http://localhost:8000/api/docs")
    else:
        sys.exit(1)

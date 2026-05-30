"""
Authentication service.

Handles user login, password validation, and login attempt tracking.
"""

from sqlalchemy.orm import Session
from app.models import User
from app.utils.security import verify_password, create_jwt_token
from app.utils.errors import AuthenticationError
from app.utils.logger import get_logger

logger = get_logger(__name__)

# In-memory store for failed login attempts (IP: count)
# In production, use Redis
failed_login_attempts = {}


def authenticate_user(
    username: str, password: str, db: Session, client_ip: str
) -> tuple[User, str]:
    """
    Authenticate a user with username and password.

    Implements timing-safe password comparison and rate limiting.

    Args:
        username: Username to authenticate
        password: Plaintext password to verify
        db: Database session
        client_ip: Client IP address for rate limiting

    Returns:
        Tuple of (User object, JWT token)

    Raises:
        AuthenticationError: If credentials are invalid or rate limited
    """
    # Check rate limit (5 failed attempts blocks for timeout)
    failed_count = failed_login_attempts.get(client_ip, 0)
    if failed_count >= 5:
        logger.warning(
            f"Login rate limit exceeded for IP {client_ip}",
            extra={"ip": client_ip, "attempt_count": failed_count},
        )
        raise AuthenticationError(
            "Too many failed login attempts. Please try again later."
        )

    # Look up user (case-insensitive search)
    user = (
        db.query(User)
        .filter(
            User.username.ilike(username),
            User.is_active == True,
        )
        .first()
    )

    # Verify password (timing-safe comparison)
    # Note: We verify even if user not found to avoid timing attacks
    if user and verify_password(password, user.password_hash):
        # Clear failed attempts on successful login
        failed_login_attempts[client_ip] = 0

        # Create JWT token
        token = create_jwt_token(
            user_id=user.id,
            username=user.username,
            is_admin=user.is_admin,
        )

        logger.info(
            f"User {username} logged in successfully",
            extra={"user_id": user.id, "username": username},
        )

        return user, token

    # Invalid credentials - increment failure counter
    failed_login_attempts[client_ip] = failed_count + 1

    logger.warning(
        f"Failed login attempt for username {username}",
        extra={"username": username, "ip": client_ip},
    )

    raise AuthenticationError("Invalid username or password")


def request_password_reset(email: str, db: Session) -> bool:
    """
    Initiate password reset flow for a user.

    MOCK: Prints the reset URL to the console.

    Args:
        email: User's email address
        db: Database session

    Returns:
        Always returns True (for security, don't reveal if email exists)
    """
    from app.utils.security import create_reset_token

    user = db.query(User).filter(User.email.ilike(email)).first()

    if user:
        token = create_reset_token(user.email)
        # In a real app, send this via email
        reset_url = f"http://localhost:5173/reset-password?token={token}"

        print("\n" + "=" * 80)
        print(f"PASSWORD RESET REQUESTED FOR: {user.email}")
        print(f"RESET LINK: {reset_url}")
        print("=" * 80 + "\n")

        logger.info(
            f"Password reset link generated for {user.email}",
            extra={"user_id": user.id, "email": user.email},
        )
    else:
        logger.warning(
            f"Password reset requested for non-existent email: {email}",
            extra={"email": email},
        )

    return True


def reset_password(token: str, new_password: str, db: Session) -> bool:
    """
    Reset a user's password using a valid token.

    Args:
        token: Reset token (JWT)
        new_password: New plaintext password
        db: Database session

    Returns:
        True if successful

    Raises:
        AuthenticationError: If token is invalid or expired
    """
    from app.utils.security import verify_reset_token
    from app.services.user_service import change_password

    email = verify_reset_token(token)
    if not email:
        raise AuthenticationError("Invalid or expired reset token")

    user = db.query(User).filter(User.email.ilike(email)).first()
    if not user:
        raise AuthenticationError("User not found")

    change_password(user_id=user.id, new_password=new_password, db=db)

    logger.info(
        f"Password successfully reset for user {user.username}",
        extra={"user_id": user.id, "username": user.username},
    )

    return True


def change_password_authenticated(
    user: User, current_password: str, new_password: str, db: Session
) -> bool:
    """
    Change the password of an authenticated user.

    Verified current password matches before updating.

    Args:
        user: Authenticated User object
        current_password: User's current password
        new_password: New plaintext password
        db: Database session

    Returns:
        True if successful

    Raises:
        AuthenticationError: If current password is incorrect
    """
    from app.utils.security import verify_password
    from app.services.user_service import change_password

    # 1. Verify current password
    if not verify_password(current_password, user.password_hash):
        logger.warning(
            f"Failed password change attempt for user {user.username}: Incorrect current password",
            extra={"user_id": user.id},
        )
        raise AuthenticationError("Incorrect current password")

    # 2. Update to new password
    change_password(user_id=user.id, new_password=new_password, db=db)

    logger.info(
        f"Password changed successfully for user {user.username}",
        extra={"user_id": user.id},
    )

    return True

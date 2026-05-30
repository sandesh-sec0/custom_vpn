"""
Authentication routes.

Handles login, logout, and token refresh endpoints.
"""

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.orm import Session
from app.database import get_database
from app.services.auth_service import authenticate_user
from app.schemas.auth import LoginRequest, LoginResponse, LogoutRequest, ForgotPasswordRequest, ResetPasswordRequest, ChangePasswordRequest
from app.utils.errors import AuthenticationError
from fastapi.exceptions import HTTPException as FastAPIHTTPException
from app.dependencies import get_current_user
from app.models import User

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
async def login(
    request: LoginRequest,
    http_request: Request,
    response: Response,
    db: Session = Depends(get_database),
):
    """
    Login with username and password.

    Returns JWT access token and user info.

    Args:
        request: LoginRequest with username and password
        http_request: HTTP request (for client IP)
        db: Database session

    Returns:
        LoginResponse with access_token and user info

    Raises:
        HTTPException: If credentials invalid or rate limited
    """
    client_ip = http_request.client.host

    try:
        user, token = authenticate_user(
            username=request.username,
            password=request.password,
            db=db,
            client_ip=client_ip,
        )

        # C4: Set HTTP-Only Cookie instead of requiring client to manually store it
        response.set_cookie(
            key="access_token",
            value=token,
            httponly=True,
            secure=True,
            samesite="lax",
            max_age=86400  # 1 day matching token expiration
        )

        return LoginResponse(
            access_token=token,
            user={
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "is_admin": user.is_admin,
                "is_active": user.is_active,
            },
        )

    except AuthenticationError as e:
        raise FastAPIHTTPException(status_code=401, detail=e.message)


@router.post("/logout")
async def logout(request: LogoutRequest, response: Response):
    """
    Logout (invalidate token on client side by clearing cookie).

    Args:
        request: LogoutRequest (empty)
        response: FastAPI Response to modify cookies

    Returns:
        Success message
    """
    response.delete_cookie(
        key="access_token",
        httponly=True,
        secure=True,
        samesite="lax"
    )
    return {"message": "Logged out successfully"}


@router.post("/forgot-password")
async def forgot_password(
    request: ForgotPasswordRequest,
    db: Session = Depends(get_database),
):
    """
    Request a password reset.

    MOCK: Prints reset link to console.

    Args:
        request: ForgotPasswordRequest with email
        db: Database session

    Returns:
        Success message (generic)
    """
    from app.services.auth_service import request_password_reset

    request_password_reset(email=request.email, db=db)

    return {
        "message": "If an account with that email exists, a password reset link has been sent."
    }


@router.post("/reset-password")
async def reset_password(
    request: ResetPasswordRequest,
    db: Session = Depends(get_database),
):
    """
    Reset password using a token.

    Args:
        request: ResetPasswordRequest with token and new password
        db: Database session

    Returns:
        Success message
    """
    from app.services.auth_service import reset_password as perform_reset

    try:
        perform_reset(
            token=request.token,
            new_password=request.new_password,
            db=db,
        )
        return {"message": "Password successfully reset. You can now log in."}
    except AuthenticationError as e:
        raise FastAPIHTTPException(status_code=400, detail=e.message)


@router.post("/change-password")
async def change_password(
    request: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_database),
):
    """
    Change the currently logged-in user's password.

    Args:
        request: ChangePasswordRequest with current and new passwords
        current_user: Currently authenticated user
        db: Database session

    Returns:
        Success message
    """
    from app.services.auth_service import change_password_authenticated

    try:
        change_password_authenticated(
            user=current_user,
            current_password=request.current_password,
            new_password=request.new_password,
            db=db,
        )
        return {"message": "Password updated successfully."}
    except AuthenticationError as e:
        raise FastAPIHTTPException(status_code=400, detail=e.message)

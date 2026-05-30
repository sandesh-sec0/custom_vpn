"""
User management routes.

Admin-only endpoints for managing user accounts.
"""

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session
from app.database import get_database
from app.models import User, AuditLog
from app.dependencies import get_admin_user
from app.services.user_service import (
    create_user,
    get_user,
    list_users,
    update_user,
    delete_user,
)
from app.schemas.user import (
    UserCreateRequest,
    UserUpdateRequest,
    UserResponse,
    UserListResponse,
)
from app.utils.errors import APIException
from fastapi.exceptions import HTTPException as FastAPIHTTPException
from datetime import datetime

router = APIRouter(prefix="/users", tags=["users"])


def _log_audit(
    db: Session,
    user_id: int,
    action: str,
    resource: str,
    resource_id: int,
    ip_address: str,
    details: str = None,
    status_code: int = 200,
):
    """Helper to log audit events."""
    audit = AuditLog(
        user_id=user_id,
        action=action,
        resource=resource,
        resource_id=resource_id,
        timestamp=datetime.utcnow(),
        ip_address=ip_address,
        details=details,
        status_code=status_code,
    )
    db.add(audit)
    db.commit()


@router.post("", response_model=UserResponse)
async def create_user_endpoint(
    request: UserCreateRequest,
    admin_user: User = Depends(get_admin_user),
    http_request: Request = None,
    db: Session = Depends(get_database),
):
    """
    Create a new user (admin only).

    Args:
        request: UserCreateRequest with username, email, password, is_admin
        admin_user: Currently logged-in admin user
        http_request: HTTP request (for IP logging)
        db: Database session

    Returns:
        Created UserResponse

    Raises:
        HTTPException: If validation fails or user already exists
    """
    client_ip = http_request.client.host if http_request else "unknown"

    try:
        new_user = create_user(
            username=request.username,
            email=request.email,
            password=request.password,
            is_admin=request.is_admin,
            db=db,
        )

        # Log audit event
        _log_audit(
            db=db,
            user_id=admin_user.id,
            action="create_user",
            resource="User",
            resource_id=new_user.id,
            ip_address=client_ip,
            status_code=201,
        )

        return new_user

    except APIException as e:
        _log_audit(
            db=db,
            user_id=admin_user.id,
            action="create_user",
            resource="User",
            resource_id=None,
            ip_address=client_ip,
            status_code=e.status_code,
        )
        raise FastAPIHTTPException(status_code=e.status_code, detail=e.message)


@router.get("", response_model=UserListResponse)
async def list_users_endpoint(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    search: str = Query(None, description="Search by username or email"),
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_database),
):
    """
    List all users (admin only).

    Args:
        skip: Number of records to skip
        limit: Number of records to return (max 100)
        search: Optional search term for username/email
        admin_user: Currently logged-in admin user
        db: Database session

    Returns:
        UserListResponse with paginated list
    """
    users, total = list_users(skip=skip, limit=limit, search=search, db=db)

    return {
        "items": users,
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.get("/{user_id}", response_model=UserResponse)
async def get_user_endpoint(
    user_id: int,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_database),
):
    """
    Get a user by ID (admin only).

    Args:
        user_id: User ID to retrieve
        admin_user: Currently logged-in admin user
        db: Database session

    Returns:
        UserResponse

    Raises:
        HTTPException: If user not found
    """
    try:
        user = get_user(user_id=user_id, db=db)
        return user

    except APIException as e:
        raise FastAPIHTTPException(status_code=e.status_code, detail=e.message)


@router.put("/{user_id}", response_model=UserResponse)
async def update_user_endpoint(
    user_id: int,
    request: UserUpdateRequest,
    admin_user: User = Depends(get_admin_user),
    http_request: Request = None,
    db: Session = Depends(get_database),
):
    """
    Update a user (admin only).

    Args:
        user_id: User ID to update
        request: UserUpdateRequest with fields to update
        admin_user: Currently logged-in admin user
        http_request: HTTP request (for IP logging)
        db: Database session

    Returns:
        Updated UserResponse

    Raises:
        HTTPException: If validation fails or user not found
    """
    client_ip = http_request.client.host if http_request else "unknown"

    try:
        updated_user = update_user(
            user_id=user_id,
            email=request.email,
            is_active=request.is_active,
            is_admin=request.is_admin,
            db=db,
        )

        # Log audit event
        _log_audit(
            db=db,
            user_id=admin_user.id,
            action="update_user",
            resource="User",
            resource_id=updated_user.id,
            ip_address=client_ip,
            status_code=200,
        )

        return updated_user

    except APIException as e:
        _log_audit(
            db=db,
            user_id=admin_user.id,
            action="update_user",
            resource="User",
            resource_id=user_id,
            ip_address=client_ip,
            status_code=e.status_code,
        )
        raise FastAPIHTTPException(status_code=e.status_code, detail=e.message)


@router.delete("/{user_id}")
async def delete_user_endpoint(
    user_id: int,
    admin_user: User = Depends(get_admin_user),
    http_request: Request = None,
    db: Session = Depends(get_database),
):
    """
    Delete a user (soft delete, admin only).

    Args:
        user_id: User ID to delete
        admin_user: Currently logged-in admin user
        http_request: HTTP request (for IP logging)
        db: Database session

    Returns:
        Success message

    Raises:
        HTTPException: If user not found
    """
    client_ip = http_request.client.host if http_request else "unknown"

    try:
        deleted_user = delete_user(user_id=user_id, db=db)

        # Log audit event
        _log_audit(
            db=db,
            user_id=admin_user.id,
            action="delete_user",
            resource="User",
            resource_id=deleted_user.id,
            ip_address=client_ip,
            status_code=200,
        )

        return {"message": f"User {deleted_user.username} deleted successfully"}

    except APIException as e:
        _log_audit(
            db=db,
            user_id=admin_user.id,
            action="delete_user",
            resource="User",
            resource_id=user_id,
            ip_address=client_ip,
            status_code=e.status_code,
        )
        raise FastAPIHTTPException(status_code=e.status_code, detail=e.message)

"""
Service and Permission management routes.
"""

from fastapi import APIRouter, Depends, Query, Request, HTTPException
from sqlalchemy.orm import Session
from app.database import get_database
from app.models import User, Service, UserPermission, AuditLog
from app.dependencies import get_current_user, get_admin_user
from app.schemas.service import (
    ServiceCreate,
    ServiceResponse,
    UserPermissionCreate,
    UserPermissionResponse,
    PermissionDetailResponse,
    ConfigResponse,
)
from app.config import settings
from datetime import datetime

router = APIRouter(prefix="/services", tags=["services"])


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


# Admin Routes

@router.post("", response_model=ServiceResponse)
async def create_service(
    request: ServiceCreate,
    admin_user: User = Depends(get_admin_user),
    http_request: Request = None,
    db: Session = Depends(get_database),
):
    client_ip = http_request.client.host if http_request else "unknown"
    
    existing = db.query(Service).filter(Service.name == request.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Service with this name already exists")
        
    new_service = Service(**request.dict())
    db.add(new_service)
    db.commit()
    db.refresh(new_service)
    
    _log_audit(db, admin_user.id, "create_service", "Service", new_service.id, client_ip, status_code=201)
    return new_service


@router.get("", response_model=dict)
async def list_services(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    name: str = Query(None, description="Filter by service name"),
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_database),
):
    query = db.query(Service)
    if name:
        query = query.filter(Service.name.ilike(f"%{name}%"))
    
    total = query.count()
    items = query.offset(skip).limit(limit).all()
    
    return {
        "items": [ServiceResponse.model_validate(item) for item in items],
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.post("/permissions", response_model=UserPermissionResponse)
async def assign_permission(
    request: UserPermissionCreate,
    admin_user: User = Depends(get_admin_user),
    http_request: Request = None,
    db: Session = Depends(get_database),
):
    client_ip = http_request.client.host if http_request else "unknown"
    
    # Check if user and service exist
    user = db.query(User).filter(User.id == request.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    service = db.query(Service).filter(Service.id == request.service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
        
    # Check if existing permission
    existing = db.query(UserPermission).filter(
        UserPermission.user_id == request.user_id,
        UserPermission.service_id == request.service_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Permission already exists")
        
    new_perm = UserPermission(user_id=request.user_id, service_id=request.service_id)
    db.add(new_perm)
    db.commit()
    db.refresh(new_perm)
    
    _log_audit(db, admin_user.id, "assign_permission", "UserPermission", new_perm.id, client_ip, status_code=201)
    return new_perm


@router.delete("/permissions/{perm_id}")
async def revoke_permission(
    perm_id: int,
    admin_user: User = Depends(get_admin_user),
    http_request: Request = None,
    db: Session = Depends(get_database),
):
    client_ip = http_request.client.host if http_request else "unknown"
    
    perm = db.query(UserPermission).filter(UserPermission.id == perm_id).first()
    if not perm:
        raise HTTPException(status_code=404, detail="Permission not found")
        
    db.delete(perm)
    db.commit()
    
    _log_audit(db, admin_user.id, "revoke_permission", "UserPermission", perm_id, client_ip, status_code=200)
    return {"message": "Permission revoked successfully"}


@router.get("/permissions/all", response_model=list[PermissionDetailResponse])
async def list_all_permissions(
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_database),
):
    """List all permissions with joined user and service details."""
    perms = db.query(UserPermission).all()
    results = []
    for p in perms:
        user = db.query(User).filter(User.id == p.user_id).first()
        service = db.query(Service).filter(Service.id == p.service_id).first()
        if user and service:
            results.append(PermissionDetailResponse(
                id=p.id,
                user_id=p.user_id,
                username=user.username,
                email=user.email,
                service_id=p.service_id,
                service_name=service.name,
                created_at=p.created_at,
            ))
    return results


@router.get("/{service_id}/permissions", response_model=list[PermissionDetailResponse])
async def list_service_permissions(
    service_id: int,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_database),
):
    """List all user permissions for a specific service."""
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    perms = db.query(UserPermission).filter(UserPermission.service_id == service_id).all()
    results = []
    for p in perms:
        user = db.query(User).filter(User.id == p.user_id).first()
        if user:
            results.append(PermissionDetailResponse(
                id=p.id,
                user_id=p.user_id,
                username=user.username,
                email=user.email,
                service_id=p.service_id,
                service_name=service.name,
                created_at=p.created_at,
            ))
    return results


@router.delete("/{service_id}")
async def delete_service(
    service_id: int,
    admin_user: User = Depends(get_admin_user),
    http_request: Request = None,
    db: Session = Depends(get_database),
):
    """Delete a service and all its associated permissions."""
    client_ip = http_request.client.host if http_request else "unknown"

    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    # CASCADE will remove permissions, but let's be explicit
    db.query(UserPermission).filter(UserPermission.service_id == service_id).delete()
    db.delete(service)
    db.commit()

    _log_audit(db, admin_user.id, "delete_service", "Service", service_id, client_ip, status_code=200)
    return {"message": "Service deleted successfully"}


# User Routes

@router.get("/my-services", response_model=list[ServiceResponse])
async def my_services(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_database),
):
    # Join Services with UserPermissions for the current user
    services = db.query(Service).join(UserPermission).filter(UserPermission.user_id == current_user.id).all()
    return services


@router.get("/{service_id}/config", response_model=ConfigResponse)
async def generate_config(
    service_id: int,
    current_user: User = Depends(get_current_user),
    http_request: Request = None,
    db: Session = Depends(get_database),
):
    client_ip = http_request.client.host if http_request else "unknown"
    
    # Check permission
    perm = db.query(UserPermission).filter(
        UserPermission.user_id == current_user.id,
        UserPermission.service_id == service_id
    ).first()
    
    if not perm and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Access denied to this service")
        
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
        
    _log_audit(db, current_user.id, "download_config", "Service", service.id, client_ip, status_code=200)
    
    # Assuming VPN Server is running on localhost for local tests, 
    # but ideally it should pull from config.
    vpn_host = "127.0.0.1"
    vpn_port = 8443
    
    # Example downloaded JSON shape expected by VPN client SOCKS logic or SOCKS override
    return ConfigResponse(
        server=f"{vpn_host}:{vpn_port}",
        service_name=service.name,
        local_port=9000, # Defaulting mapping proxy local port
        credentials="", # No plaintext password by default. User types it.
        target_host=service.host,
        target_port=service.port,
        persistent=service.is_persistent
    )


# Internal / VPN Server Validation Route

@router.get("/verify")
async def verify_permission(
    username: str,
    target_host: str,
    target_port: int,
    db: Session = Depends(get_database),
):
    """
    Internal route used by the VPN server during CONNECT to verify
    if the identified user is allowed to access the specified host:port.
    """
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Is admin? True. Admin can access everything usually or must we enforce perms?
    # Let's enforce strictly based on permissions or let admin bypass.
    if user.is_admin:
        return {"status": "ok", "message": "Admin permitted"}
        
    # Check if there is a permission mapping to a service with this host/port
    perm = db.query(UserPermission).join(Service).filter(
        UserPermission.user_id == user.id,
        Service.host == target_host,
        Service.port == target_port
    ).first()
    
    if not perm:
        raise HTTPException(status_code=403, detail="Forbidden: User lacks permission for this target")
        
    return {"status": "ok", "message": "Permitted"}

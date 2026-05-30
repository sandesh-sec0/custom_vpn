"""
Health check and status routes.

Public endpoints for monitoring service health.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_database
from app.services.vpn_control import get_vpn_status

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check(db: Session = Depends(get_database)):
    """
    Health check endpoint.

    Verifies database connectivity and VPN server status.

    Returns:
        Status dictionary with service health info
    """
    # Check database
    try:
        from sqlalchemy import text
        db.execute(text("SELECT 1"))
        db_status = "healthy"
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    # Check VPN server
    vpn_status = get_vpn_status()

    return {
        "status": "healthy" if db_status == "healthy" else "unhealthy",
        "database": db_status,
        "vpn": vpn_status.get("status"),
    }

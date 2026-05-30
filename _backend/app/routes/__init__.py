"""Routes package - API endpoint handlers."""

from app.routes.auth import router as auth_router
from app.routes.users import router as users_router
from app.routes.sessions import router as sessions_router
from app.routes.health import router as health_router
from app.routes.vpn_stats import router as vpn_stats_router
from app.routes.audit_logs import router as audit_logs_router
from app.routes.vpn_events import router as vpn_events_router
from app.routes.services import router as services_router

__all__ = [
    "auth_router",
    "users_router",
    "sessions_router",
    "health_router",
    "vpn_stats_router",
    "audit_logs_router",
    "vpn_events_router",
    "services_router",
]

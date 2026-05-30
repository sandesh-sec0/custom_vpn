"""
FastAPI application factory and main entry point.

Initializes the app, registers routes, sets up middleware,
and starts the VPN session sync background task.
"""

import asyncio
import logging
from contextlib import asynccontextmanager

import secrets
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import HTTPException
from app.database import create_all_tables
from app.routes import (
    auth_router,
    users_router,
    sessions_router,
    health_router,
    vpn_stats_router,
    audit_logs_router,
    vpn_events_router,
    services_router,
)
from app.utils.errors import APIException
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager — runs startup and shutdown hooks.

    On startup:
        1. Creates all database tables (if not existing).
        2. Launches the VPN session sync background task.

    On shutdown:
        1. Cancels the sync task gracefully.
    """
    # Startup
    create_all_tables()

    # Start the VPN session sync background loop
    from app.services.session_sync import session_sync_loop

    sync_task = asyncio.create_task(session_sync_loop())
    logger.info("VPN session sync background task started")

    yield

    # Shutdown
    sync_task.cancel()
    try:
        await sync_task
    except asyncio.CancelledError:
        logger.info("VPN session sync background task stopped")


app = FastAPI(
    title="VPN Management API",
    description="Backend API for VPN user and session management",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS (allow frontend only, not *)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
	"http://localhost:5174",
        "https://custom-vpn.vercel.app",
        "https://custom-vpn-git-main-sandesh-s-projects1.vercel.app",
    ],  # Vite default ports
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def csrf_middleware(request: Request, call_next):
    """
    C3: CSRF Protection middleware using Double Submit Cookie pattern.
    Validates that X-CSRF-Token header matches the HttpOnly csrf_token cookie.
    """
    if request.method not in ["GET", "OPTIONS", "HEAD", "TRACE"]:
        # Exempt specific paths or internal secrets
        is_exempt = (
            request.url.path in ["/api/csrf-token", "/api/auth/login"] or
            request.headers.get("X-Monitor-Secret") == "default_unsafe_monitor_secret_123"
        )
        if not is_exempt:
            csrf_cookie = request.cookies.get("csrf_token")
            csrf_header = request.headers.get("X-CSRF-Token")
            if not csrf_cookie or not csrf_header or csrf_cookie != csrf_header:
                return JSONResponse(
                    status_code=403,
                    content={"detail": "CSRF token missing or invalid"}
                )
    return await call_next(request)


# Exception handlers
@app.exception_handler(APIException)
async def api_exception_handler(request, exc: APIException):
    """Convert domain exceptions to HTTP responses."""
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.message},
    )


# Register routers
app.include_router(auth_router, prefix="/api")
app.include_router(users_router, prefix="/api")
app.include_router(sessions_router, prefix="/api")
app.include_router(health_router, prefix="/api")
app.include_router(vpn_stats_router, prefix="/api")
app.include_router(audit_logs_router, prefix="/api")
app.include_router(vpn_events_router, prefix="/api")
app.include_router(services_router, prefix="/api")


@app.get("/api/csrf-token", tags=["auth"])
async def get_csrf_token(response: Response):
    """Generate and return a new CSRF token."""
    token = secrets.token_urlsafe(32)
    response.set_cookie(
        key="csrf_token",
        value=token,
        httponly=False,
        secure=True,
        samesite="none",
    )
    return {"csrfToken": token}

@app.get("/")
async def root():
    """Root endpoint - redirects to docs."""
    return {
        "message": "VPN Management API",
        "docs": "/api/docs",
        "health": "/api/health",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)

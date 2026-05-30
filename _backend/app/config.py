"""
Application configuration management.

Loads environment variables and provides centralized config access.
Never hardcode secrets or tunables.
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database
    database_url: str = "sqlite:///./vpn_db.db"

    # JWT
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expiry_hours: int = 1

    # Authentication
    auth_timeout_seconds: int = 300
    max_login_attempts: int = 5

    # Session
    session_timeout_seconds: int = 3600

    # Logging
    log_level: str = "INFO"

    # VPN Control
    vpn_control_enabled: bool = False
    vpn_control_socket: str = "/tmp/vpn_control.sock"
    vpn_monitor_secret: str = "default_unsafe_monitor_secret_123"
    vpn_users_json_path: str = "../server_users.json"

    class Config:
        env_file = ".env.development"
        env_file_encoding = "utf-8"

    def get_database_url(self) -> str:
        """Return the database connection URL."""
        url = self.database_url
        if url.startswith("sqlite:///./"):
            import os
            # Resolve relative to the app directory's parent (i.e. _backend)
            backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            db_name = url.replace("sqlite:///./", "")
            abs_path = os.path.join(backend_dir, db_name)
            
            # Ensure the directory exists (useful for SQLite initialization)
            os.makedirs(os.path.dirname(abs_path), exist_ok=True)
            
            # Convert abs_path to a standard SQLAlchemy SQLite URL
            # SQLAlchemy handles 'sqlite:///C:\path\to\db'
            return f"sqlite:///{abs_path}"
        return url

    def get_vpn_users_json_path(self) -> str:
        """Return the absolute path to the VPN server_users.json file."""
        import os
        backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        # Resolved relative to _backend
        abs_path = os.path.normpath(os.path.join(backend_dir, self.vpn_users_json_path))
        return abs_path


# Global settings instance
settings = Settings()

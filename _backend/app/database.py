"""
Database initialization and session management.

Provides SQLAlchemy engine, session factory, and base model.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import settings

# Create database engine
engine_args = {"echo": False}
if "sqlite" in settings.get_database_url():
    engine_args["connect_args"] = {"check_same_thread": False}
else:
    engine_args["pool_pre_ping"] = True

engine = create_engine(
    settings.get_database_url(),
    **engine_args
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for all models
Base = declarative_base()


def get_database():
    """
    Dependency function for FastAPI to inject database session.

    Yields:
        Session: SQLAlchemy session for database operations.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_all_tables():
    """
    Create all tables defined in models.

    This is called on application startup if tables don't exist.
    """
    Base.metadata.create_all(bind=engine)

import sys
import os

# Ensure the _backend directory is in sys.path so 'app' can be imported
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from sqlalchemy.orm import Session
from app.database import SessionLocal, create_all_tables
from app.models import User
from app.utils.security import hash_password

def init_database(admin_username="admin", admin_email="admin@vpn.local", admin_password="admin12345"):
    """
    Initialize database: create tables and a default admin user.
    Designed for non-interactive use (CD/CD, initial setup).
    """
    print(f"Initializing database at: {os.getcwd()}")
    
    try:
        # 1. Create tables
        print("Creating tables...")
        create_all_tables()
        
        # 2. Check for existing admin
        db = SessionLocal()
        try:
            existing = db.query(User).filter(User.is_admin == True).first()
            if existing:
                print(f"Admin user already exists: {existing.username}")
                return True
            
            # 3. Create default admin
            print(f"Creating default admin: {admin_username}...")
            admin = User(
                username=admin_username,
                email=admin_email,
                password_hash=hash_password(admin_password),
                is_admin=True,
                is_active=True
            )
            db.add(admin)
            db.commit()
            print("Database initialized successfully.")
            return True
            
        finally:
            db.close()
            
    except Exception as e:
        print(f"Error initializing database: {e}")
        return False

if __name__ == "__main__":
    success = init_database()
    if not success:
        sys.exit(1)

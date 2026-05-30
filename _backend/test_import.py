"""
Quick test to verify the FastAPI app loads without errors.
"""

import sys

try:
    from app.main import app
    from app.database import SessionLocal

    print("✓ FastAPI app loaded successfully")
    print(f"✓ Routes registered: {len(app.routes)}")
    print(f"✓ Middleware configured: {len(app.user_middleware)}")
    print("\n✓ Backend setup complete!")
    sys.exit(0)
except Exception as e:
    print(f"✗ Error loading app: {e}")
    import traceback

    traceback.print_exc()
    sys.exit(1)

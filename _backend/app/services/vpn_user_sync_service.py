"""
VPN User Synchronization Service.

Handles syncing dashboard users to the VPN engine's server_users.json.
Uses project-standard PBKDF2-HMAC-SHA256 for compatibility with the VPN core.
"""

import os
import json
import hashlib
import threading
from app.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)
_sync_lock = threading.Lock()

# VPN Security Constants (must match _custom_ssl_vpn/server/auth.py)
HASH_ALGO = "sha256"
ITERATIONS = 100000
SALT_BYTES = 32

def sync_user_to_vpn(username: str, password: str, user_id: int) -> bool:
    """
    Synchronize a user to the VPN's server_users.json file.
    
    Args:
        username: The user's username.
        password: The plaintext password.
        user_id: The database ID of the user.
        
    Returns:
        True if successful, False otherwise.
    """
    try:
        # 1. Generate salt and hash
        salt = os.urandom(SALT_BYTES)
        derived_hash = hashlib.pbkdf2_hmac(
            HASH_ALGO, 
            password.encode("utf-8"), 
            salt, 
            ITERATIONS
        )
        
        # 2. Load existing users
        db_path = settings.get_vpn_users_json_path()
        
        with _sync_lock:
            # Ensure file exists
            if not os.path.exists(db_path):
                os.makedirs(os.path.dirname(db_path), exist_ok=True)
                with open(db_path, "w", encoding="utf-8") as f:
                    json.dump({}, f)
            
            try:
                with open(db_path, "r", encoding="utf-8") as f:
                    users = json.load(f)
            except (json.JSONDecodeError, FileNotFoundError):
                users = {}
            
            # 3. Update user entry
            users[username] = {
                "id": user_id,
                "hash": derived_hash.hex(),
                "salt": salt.hex()
            }
            
            # 4. Atomic write
            tmp_path = db_path + ".tmp"
            with open(tmp_path, "w", encoding="utf-8") as f:
                json.dump(users, f, indent=2)
            os.replace(tmp_path, db_path)
            
        logger.info(f"Successfully synced user {username} (ID: {user_id}) to VPN store")
        return True
        
    except Exception as e:
        logger.error(f"Failed to sync user {username} to VPN store: {e}")
        return False

def remove_user_from_vpn(username: str) -> bool:
    """
    Remove a user from the VPN's server_users.json file.
    """
    try:
        db_path = settings.get_vpn_users_json_path()
        if not os.path.exists(db_path):
            return True
            
        with _sync_lock:
            try:
                with open(db_path, "r", encoding="utf-8") as f:
                    users = json.load(f)
            except (json.JSONDecodeError, FileNotFoundError):
                return True
                
            if username in users:
                del users[username]
                
                tmp_path = db_path + ".tmp"
                with open(tmp_path, "w", encoding="utf-8") as f:
                    json.dump(users, f, indent=2)
                os.replace(tmp_path, db_path)
                
        logger.info(f"Successfully removed user {username} from VPN store")
        return True
    except Exception as e:
        logger.error(f"Failed to remove user {username} from VPN store: {e}")
        return False

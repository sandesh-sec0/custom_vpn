"""
VPN Control Service — IPC Client

Communicates with the running VPN Server's MonitoringDashboard via TCP.
Provides real-time session visibility and termination control.
"""

import socket
import json
import logging
from typing import Dict, List, Any, Optional
from app.config import settings

logger = logging.getLogger(__name__)

class VpnControlService:
    """
    Client for the VPN Server's Monitoring Dashboard.
    
    Defaults to localhost:9999 as configured in the VPN Server.
    """
    
    def __init__(self, host: str = "127.0.0.1", port: int = 9999):
        self.host = host
        self.port = port
        self.timeout = 2.0

    def get_live_sessions(self) -> List[Dict[str, Any]]:
        """
        Fetch the current active sessions from the VPN server.
        
        Returns:
            List of session dicts. Empty list if server is unreachable.
        """
        try:
            with socket.create_connection((self.host, self.port), timeout=self.timeout) as sock:
                # Send simple HTTP GET request manually to avoid external deps like requests/httpx
                # for this internal bridge
                request = (
                    "GET /stats HTTP/1.1\r\n"
                    f"Host: {self.host}\r\n"
                    "Connection: close\r\n"
                    "\r\n"
                )
                sock.sendall(request.encode('utf-8'))
                
                response = b""
                while True:
                    chunk = sock.recv(4096)
                    if not chunk:
                        break
                    response += chunk
                
                # Parse HTTP response
                response_text = response.decode('utf-8', errors='replace')
                parts = response_text.split("\r\n\r\n", 1)
                if len(parts) < 2:
                    return []
                
                body = parts[1]
                data = json.loads(body)
                return data.get("sessions", [])
                
        except (socket.error, json.JSONDecodeError) as e:
            logger.warning(f"Could not connect to VPN control interface: {e}")
            return []

    def terminate_session(self, session_id: str) -> bool:
        """
        Request the VPN server to terminate a specific session.
        
        Args:
            session_id: The ID of the session to drop.
            
        Returns:
            bool: True if termination succeeded.
        """
        try:
            with socket.create_connection((self.host, self.port), timeout=self.timeout) as sock:
                payload = json.dumps({"session_id": session_id})
                request = (
                    "POST /terminate HTTP/1.1\r\n"
                    f"Host: {self.host}\r\n"
                    f"Content-Length: {len(payload)}\r\n"
                    "Content-Type: application/json\r\n"
                    f"X-Monitor-Secret: {settings.vpn_monitor_secret}\r\n"
                    "Connection: close\r\n"
                    "\r\n"
                    f"{payload}"
                )
                sock.sendall(request.encode('utf-8'))
                
                response = b""
                while True:
                    chunk = sock.recv(4096)
                    if not chunk:
                        break
                    response += chunk
                
                response_text = response.decode('utf-8', errors='replace')
                return "200 OK" in response_text
                
        except socket.error as e:
            logger.error(f"Failed to send termination command to VPN: {e}")
            return False

# Global singleton
vpn_control = VpnControlService()

def get_vpn_status() -> Dict[str, Any]:
    """
    Convenience wrapper to check if the VPN core is responding.
    """
    sessions = vpn_control.get_live_sessions()
    # If we get a response (even empty list), it's reachable
    # In a real scenario, we might have a specific /ping or /health on the VPN side
    return {
        "status": "healthy" if isinstance(sessions, list) else "unhealthy",
        "active_sessions": len(sessions) if isinstance(sessions, list) else 0
    }

def terminate_session(session_id: str) -> bool:
    """
    Convenience wrapper for session termination.
    """
    return vpn_control.terminate_session(session_id)

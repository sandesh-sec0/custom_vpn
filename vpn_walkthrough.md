# Core VPN Layer: Demo Walkthrough

This document records the exact steps taken to successfully run and verify the base **Custom SSL VPN** tunnel. This verifies the **Confidentiality** and **Integrity** of the underlying engine.

## 🛠️ Environment Setup

Tested on **Windows** using **Git Bash**. Ensure your virtual environment is active.

### 1. Prerequisite Modules
Ensure `cryptography` is installed for certificate generation:
```bash
pip install cryptography
```

### 2. Identity Generation
Generate the CA and Server TLS certificates:
```bash
python _custom_ssl_vpn/gen_certs.py
```

### 3. User Registration
Register a test account in the encrypted user database:
```bash
PYTHONPATH=. python _custom_ssl_vpn/server/auth.py --add-user test.user1
```
> **Note:** The engine now supports flexible usernames containing dots (e.g. `test.user1`) and hyphens.

---

## 🚀 Execution Flow (Terminal Demo)

Follow this sequence across 4 Git Bash terminal windows:

| Terminal | Component | Command | Purpose |
| :--- | :--- | :--- | :--- |
| **1** | **Echo Server** | `python _custom_ssl_vpn/echo_server/echo_server.py` | Acts as the final target destination |
| **2** | **VPN Server** | `PYTHONPATH=. python _custom_ssl_vpn/server/vpn_server.py` | Handles TLS encryption and session logic |
| **3** | **VPN Client** | `python -m _custom_ssl_vpn.client.vpn_client --service-config internal_api_config.json -u test.user1` | Establishes the secure TLS tunnel using a profile |
| **4** | **Test Trigger** | `python -c "import socket; s = socket.create_connection(('127.0.0.1', 1111)); s.sendall(b'Hello VPN'); print(s.recv(1024).decode())"` | Sends data through the local VPN listener |

---

## 🔍 Verification (Wireshark)

1. **Interface**: Select `Adapter for loopback traffic capture`.
2. **Filter**: Set to `tcp.port == 8443 || tcp.port == 9000`.

### Observations:
- **Port 8443 (The Tunnel)**: Data appears as `Application Data`. This proves the payload is encrypted and unreadable by observers.
- **Port 9000 (The Destination)**: Data appears as plain `TCP`. Following the stream reveals the original `Hello VPN` message, proving the VPN successfully decrypted the relay.

> [!IMPORTANT]
> This "Base Walkthrough" confirms the core crypto-logic is sound before moving on to the management dashboard or multi-service multiplexing.

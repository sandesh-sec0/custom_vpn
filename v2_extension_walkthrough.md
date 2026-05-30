# Extension Checklist V2 — Walkthrough & Verification Guide

**Date:** 2026-04-15 | **Phase:** V2 Complete

---

## Summary of All Changes

### Priority B (Code Quality) — 9 fixes + C1

| Fix | File | What Changed |
|---|---|---|
| B1 | `vpn_server.py` | Inline `import urllib` → top-level |
| B2 | `vpn_server.py`, `config.py` | Hardcoded URL → `ServerConfig.BACKEND_API_URL` |
| B3 | `session.py` → `notifier.py` | Extracted `VPNPushNotifier` to own module |
| B4 | `vpn_server.py` | Typo `TunneyRelay` → `TunnelRelay` |
| B5 | `notifier.py` | `datetime.utcnow()` → `datetime.now(timezone.utc)` |
| B6 | `vpn_server.py` | Renamed `_send_error_and_close` → `_send_error` |
| B7 | `vpn_server.py` | Documented double `remove_session` as safety net |
| B8 | `vpn_server.py` | `.warn()` → `._log(WARNING)` |
| B9 | `server/protocol.py`, `client/protocol.py` | Removed `sys.path.append`, fixed imports |
| C1 | `vpn_server.py` | `except Exception` → `except (URLError, OSError, ValueError)` |

### Priority A (Persistent Sessions) — 4 architectural changes

| Fix | File(s) | What Changed |
|---|---|---|
| A1 | `client/forwarder.py` | **Rewritten.** Persistent `_accept_loop()` re-enters accept after each connection |
| A2 | `server/vpn_server.py`, `server/tunnel.py` | Server loops on CONNECT/DISCONNECT/KEEPALIVE. TLS socket ownership moved to `_handle_client` |
| A3 | `shared/protocol.py` | Added `KEEPALIVE` command (byte 7) |
| A4 | `client/vpn_client.py` | Persistent is now **default**. `--one-shot` flag for single-connection mode |

### Priority C (Security) — 3 more fixes

| Fix | File | What Changed |
|---|---|---|
| C2 | documented | Monitor endpoint documented as localhost-only limitation |
| C5 | `vpn_server.py` | Cert expiry check at startup — warns if ≤30 days |
| C6 | `notifier.py` | Exponential backoff retry (1s→2s→4s, 3 attempts) |

---

## How to Verify

### Step 1: Import Smoke Tests

```powershell
cd g:\Studies\7th_sem\project_report\vpn_prototype_v3_AG

python -c "from _custom_ssl_vpn.server.config import ServerConfig; c = ServerConfig(); print('OK: BACKEND_API_URL =', c.BACKEND_API_URL)"
python -c "from _custom_ssl_vpn.server.notifier import VPNPushNotifier; n = VPNPushNotifier(); print('OK: notifier retry=', n.max_retries)"
python -c "from _custom_ssl_vpn.server.session import SessionManager; print('OK: session imported')"
python -c "from _custom_ssl_vpn.shared.protocol import Commands; print('OK: KEEPALIVE =', Commands.KEEPALIVE)"
python -c "from _custom_ssl_vpn.client.forwarder import LocalForwarder; f = LocalForwarder('127.0.0.1', 9000, 4096, persistent=True); print('OK: persistent forwarder')"
python -c "from _custom_ssl_vpn.client.vpn_client import VPNClient; print('OK: vpn_client imported')"
```

### Step 2: Run Existing Tests

```powershell
cd _custom_ssl_vpn
python -m pytest tests/ -v
```

### Step 3: Test Persistent Mode (Default Behavior)

**Terminal 1 — Backend:**
```powershell
cd _backend && python -m uvicorn app.main:app --reload --port 8000
```

**Terminal 2 — VPN Server:**
```powershell
python -m _custom_ssl_vpn.server.vpn_server
```

**Terminal 3 — VPN Client (persistent by default now):**
```powershell
python -m _custom_ssl_vpn.client.vpn_client --target-host 127.0.0.1 --target-port 80 -u admin -p admin123
```

You should see:
```
VPN tunnel ready (persistent mode). Connect to: 127.0.0.1:9000
Multiple connections supported. Press Ctrl+C to disconnect.
```

**Terminal 4 — Multiple connections:**
```powershell
curl -x http://127.0.0.1:9000 http://example.com   # Connection #1
curl -x http://127.0.0.1:9000 http://example.com   # Connection #2 (same session!)
```

### Step 4: Test One-Shot Mode (Backward Compatibility)

```powershell
python -m _custom_ssl_vpn.client.vpn_client --target-host 127.0.0.1 --target-port 80 --one-shot -u admin -p admin123
```

This should exit after the first application disconnects (original behavior).

---

## Architecture: TLS Socket Ownership Change

```
BEFORE (one-shot):
  _handle_client() → AUTH → CONNECT → relay → _cleanup() closes BOTH sockets → done

AFTER (persistent, default):
  _handle_client() → AUTH → loop:
    → CONNECT → relay → _cleanup() closes ONLY internal socket
    → Read next: CONNECT? → loop. DISCONNECT? → exit. KEEPALIVE? → ACK.
  → finally block closes TLS socket
```

---

## Service Type Feasibility Report

### How the VPN Handles Services

The VPN operates as a **raw TCP tunnel**. It accepts a `(target_host, target_port)` pair and forwards bytes verbatim between the client's local proxy port and the internal service. The `protocol` field in the service definition is a **metadata label** — the VPN does not inspect or modify the application-layer bytes.

### Verdict per Service Type

| Service Type | Frontend Label | Default Port | Works? | Demo Difficulty | Notes |
|---|---|---|---|---|---|
| **TCP Generic** | `tcp` | Any | ✅ **Yes** | Easy | This is literally what the VPN does — raw TCP forwarding |
| **HTTP / Web** | `http` | 80/443 | ✅ **Yes** | Easy | `curl -x http://127.0.0.1:9000 http://target` — perfect demo |
| **SSH Shell** | `ssh` | 22 | ✅ **Yes** | Medium | `ssh -o ProxyCommand="nc -X connect -x 127.0.0.1:9000 %h %p" user@target` or use PuTTY proxy settings |
| **PostgreSQL** | `postgres` | 5432 | ✅ **Yes** | Easy | `psql -h 127.0.0.1 -p 9000 -U dbuser dbname` — connects through the tunnel |
| **MySQL** | `mysql` | 3306 | ✅ **Yes** | Easy | `mysql -h 127.0.0.1 -P 9000 -u dbuser -p` — works directly |
| **Windows RDP** | `rdp` | 3389 | ✅ **Yes** | Medium | Use `mstsc.exe` pointed at `127.0.0.1:9000` — requires RDP target running |

### Why They All Work

Because the VPN tunnel is **protocol-agnostic**:
1. The client opens a local proxy port (default: `127.0.0.1:9000`)
2. Any application connects to that port
3. The `TunnelRelay` + `LocalForwarder` forward raw bytes to the target service through the TLS tunnel
4. The application on the other end sees a normal TCP connection

The `protocol` label is only used for:
- Frontend UI display (icon, badge color)
- Backend audit logs (what kind of service was accessed)
- Potential future protocol-aware health checks (not implemented yet)

### Easiest Demo Setup

For your project defense, the easiest demos are:

1. **HTTP**: Run Python's `http.server` on port 8080, create a service for it, connect through VPN, show the webpage
2. **PostgreSQL/MySQL**: If you have a local DB, just point the service at it — `psql` or `mysql` CLI works directly through the tunnel
3. **SSH**: Run OpenSSH server, connect through PuTTY or `ssh` with proxy settings

### Service Config Security Analysis

The downloaded service JSON file contains `target_host` and `target_port`. Even if a user modifies these values:

1. **Server-side verification**: The VPN server calls `GET /api/services/verify?username=X&target_host=Y&target_port=Z` before opening any tunnel
2. **Permission check**: The backend queries `UserPermission` → `Service` tables to confirm the user has explicit ACL for that exact `host:port` pair
3. **Fail-closed**: If the backend is unreachable, the connection is **denied** (not allowed by default)

**Result:** The config file is tamper-safe because the server enforces permissions regardless of what the client sends.

---

## Final Status

| Priority | Done | Remaining |
|---|---|---|
| 🔴 A (Persistent) | **4/4** ✅ | 0 |
| 🟠 B (Code Quality) | **9/9** ✅ | 0 |
| 🟡 C (Security) | **4/6** | 2 → V3 |
| 🟢 E (Documentation) | **2/6** | 4 → V3 |
| 🔵 D (Tests) | 0 | All → V3 |
| ⚪ F (Nice-to-have) | 0 | All → V3 |

# Extension Checklist V3 — Future Improvements

**Created:** 2026-04-15 | **Status:** Remaining items from V2 + new discoveries

---

## 🟡 Security (Carried from V2)

- [x] **C3. CSRF Protection**
    - Implement CSRF token middleware on FastAPI backend
    - Send token with every state-changing `fetch()` request from frontend
    - Requires: backend middleware + frontend API client update

- [x] **C4. JWT → httpOnly Cookies**
    - Move JWT from `sessionStorage` to `httpOnly` Secure cookies
    - Requires: backend auth routes to `Set-Cookie`, frontend to stop reading tokens from response body
    - **Risk:** Changes login/logout flow significantly

- [x] **C2+. Shared-Secret Auth on Monitor `/terminate`**
    - Add `X-Monitor-Secret` header check on `POST /terminate`
    - Generate secret at startup and pass to backend via IPC config

---

## 🔵 Test Coverage (Carried from V2)

- [ ] **D1. Missing VPN Core Tests**
    - `test_tunnel.py`, `test_forwarder.py`, `test_vpn_server.py`, `test_monitor.py`
- [ ] **D2. Missing Backend Tests**
    - `test_sessions.py`, `test_services.py`, `test_vpn_events.py`
- [ ] **D3. Missing Frontend Tests**
    - Component tests for `LoginPage.tsx`, `ProtectedRoute`
- [ ] **D4. Test Runner Script**
    - Verify `pytest` discovers all tests with a single command

---

## ⚪ Nice-to-Have (Carried from V2)

- [ ] F1. Bandwidth Throttling per User/Session
- [ ] F2. Session Resume / Reconnection Tokens
- [ ] F3. WebSocket Real-Time Dashboard Updates
- [ ] F4. Multi-Target Tunneling per Session
- [ ] F5. Configuration Hot-Reload (SIGHUP)
- [ ] F6. Automated Certificate Rotation
- [ ] F7. Docker Compose Full Stack
- [ ] F8. Frontend Error Boundary

---

## 🆕 New Items Discovered

- [ ] **N1. Protocol-Aware Service Handling**
    - Currently all service types (TCP/HTTP/SSH/PostgreSQL/MySQL) use raw TCP forwarding
    - Could add protocol-aware health checks or connection validation per protocol type

- [ ] **N2. Service Config Download — Include `persistent` / `one_shot` Mode**
    - Admin-configurable per-service session mode in the download config JSON

- [ ] **N3. Windows RDP Service Type**
    - Listed in frontend UI but may need special proxy handling for RDP protocol
    - Works with raw TCP forwarding but needs port 3389 and RDP client configuration

---

_Items here are lower priority and meant for post-defense improvements._

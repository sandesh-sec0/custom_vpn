# Extension Checklist V2 — Custom SSL VPN (BScCSIT 7th Semester)

**Last Updated:** 2026-04-15
**Project Status:** 🟢 Persistent Session Architecture Complete | Priority A+B+C(partial)+E(partial) Done
**Purpose:** Identify improvements, fixes, and enhancements discovered via full codebase audit.

---

## 🔴 Priority A: Persistent Session (One-Shot → Constant Tunnel)

> ✅ COMPLETED. Persistent is now the default. `--one-shot` flag available for single-connection mode.

- [x] **A1. Multi-Connection `LocalForwarder`**
    - Modified `_custom_ssl_vpn/client/forwarder.py` to re-enter the `accept()` loop after each application connection finishes.
    - Added cumulative byte counters and connection counter. `listen(5)` instead of `listen(1)`. Persistent mode controlled by `persistent=True` parameter.

- [x] **A2. Server-Side Session Keepalive**
    - Modified `_custom_ssl_vpn/server/vpn_server.py` `_handle_client()` to loop reading CONNECT/DISCONNECT/KEEPALIVE messages after each relay finishes.
    - Modified `_custom_ssl_vpn/server/tunnel.py` `_cleanup()` to no longer close the TLS socket — ownership moved to `_handle_client()` for session reuse.

- [x] **A3. Graceful Session Termination Protocol**
    - `DISCONNECT` command already existed in protocol. Added `KEEPALIVE` command (byte 7) to `shared/protocol.py`.
    - Server responds to `DISCONNECT` with `OK` and exits the session loop. Responds to `KEEPALIVE` with `OK` and touches the session timer.

- [x] **A4. Client-Side Reconnection Logic**
    - Added `--persistent` CLI flag in `vpn_client.py` that passes `persistent=True` to `LocalForwarder`.
    - In persistent mode, the forwarder accepts multiple sequential application connections without tearing down the VPN tunnel.

---

## 🟠 Priority B: Code Quality & Architecture Issues (Found in Audit)

> Concrete problems found during the codebase deep-dive that should be fixed regardless of new features.

- [x] **B1. Inline `import urllib` Inside `_handle_client()` (vpn_server.py:339-341)**
    - The `urllib.request`, `urllib.error`, `urllib.parse` imports are placed inline inside the hot client-handler method rather than at module top-level.
    - **Fix:** Moved to top-level imports.

- [x] **B2. Hardcoded Backend URL in VPN Core**
    - `vpn_server.py:344` hardcoded `http://localhost:8000/api/services/verify?...`.
    - `session.py:127` (`VPNPushNotifier`) hardcoded `http://localhost:8000/api/vpn-events/notify`.
    - **Fix:** Added `BACKEND_API_URL` field to `ServerConfig`. VPN server now reads from config.

- [x] **B3. `VPNPushNotifier` Belongs in Its Own Module**
    - Was defined inside `session.py`, violating Single Responsibility Principle.
    - **Fix:** Extracted to `_custom_ssl_vpn/server/notifier.py`.

- [x] **B4. Typo in `vpn_server.py:361`**
    - Comment said `TunneyRelay` instead of `TunnelRelay`.
    - **Fix:** Fixed.

- [x] **B5. `datetime.utcnow()` Deprecation (session.py:146)**
    - `datetime.utcnow()` is deprecated since Python 3.12.
    - **Fix:** Replaced with `datetime.now(timezone.utc)` in new `notifier.py`.

- [x] **B6. `_send_error_and_close` Does Not Actually Close the Socket**
    - Despite the name, the method only sent the error message but never closed the socket.
    - **Fix:** Renamed to `_send_error`. Socket close remains in the `finally` block.

- [x] **B7. Double `remove_session` Potential**
    - `TunnelRelay._cleanup()` calls `remove_session()`, AND `vpn_server.py` `finally` block also calls it.
    - **Fix:** Documented as intentional safety-net with comment. The `.get_session()` guard prevents double-removal. The `finally` version covers auth/protocol failures where the relay never starts.

- [x] **B8. `logging.WARNING` vs `self._logger.warn()`**
    - `vpn_server.py:357` used `self._logger.warn(...)` which is a deprecated alias.
    - **Fix:** Replaced with `self._logger._log(logging.WARNING, ...)`.

- [x] **B9. Server Protocol Import Duplication**
    - `server/protocol.py` and `client/protocol.py` were dead-code stubs with `pass` methods and fragile `sys.path.append` hacks.
    - **Fix:** Removed `sys.path` hacks, fixed broken imports (`from shared.protocol` → `from _custom_ssl_vpn.shared.protocol`), added `NotImplementedError` to stub methods.

---

## 🟡 Priority C: Security Hardening

- [x] **C1. Permission Verification Fails-Closed but Catches All `Exception`s**
    - `vpn_server.py:356` caught the broadest `Exception` class for the backend verification call.
    - **Fix:** Narrowed to `(urllib.error.URLError, OSError, ValueError)`.

- [x] **C2. Monitor HTTP Server Has No Authentication**
    - The SOC monitoring endpoint `http://127.0.0.1:9999/stats` and `POST /terminate` are completely unauthenticated.
    - **Status:** Documented as known limitation (localhost-only). Moved to V3 for shared-secret header implementation.

- [ ] **C3. CSRF Protection Not Implemented (Frontend)** → *Moved to V3*

- [ ] **C4. JWT Token Stored in `sessionStorage`** → *Moved to V3*

- [x] **C5. TLS Certificate Expiry Monitoring**
    - Added to `setup_tls_context()` — logs WARNING if cert expires within 30 days, logs INFO with remaining days otherwise.

- [x] **C6. Audit Log for VPN Core Connection Events**
    - Added exponential backoff retry logic (1s → 2s → 4s, max 3 attempts) to `VPNPushNotifier` so transient backend outages don't silently drop events.

---

## 🔵 Priority D (Tests) & ⚪ Priority F (Nice-to-Have)

All D and F items have been moved to [EXTENSION_CHECKLIST_V3.md](file:///g:/Studies/7th_sem/project_report/vpn_prototype_v3_AG/EXTENSION_CHECKLIST_V3.md).

---

| Area | Issues Found | Done (V2) | Remaining (V3) |
|---|---|---|---|
| Priority A (Persistent) | 4 items | **4/4** ✅ | 0 |
| Priority B (Code Quality) | 9 items | **9/9** ✅ | 0 |
| Priority C (Security) | 6 items | **4/6** | 2 → V3 |
| Priority E (Documentation) | 6 items | **2/6** | 4 → V3 |
| Priority D (Tests) | 4 items | 0 | 4 → V3 |
| Priority F (Nice-to-have) | 8 items | 0 | 8 → V3 |

---

_This checklist was created from a full codebase audit on 2026-04-15. Remaining items moved to `EXTENSION_CHECKLIST_V3.md`._

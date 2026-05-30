# Demo-Ready Integration Plan: VPN ↔ Backend Sync

## The Problem

Your three tiers exist but **don't truly talk to each other at runtime**. Here's the gap:

| What works today | What's broken/missing |
|---|---|
| VPN server tracks live sessions in-memory (`SessionManager`) | Sessions are **never written to the backend DB** — the frontend shows an empty table |
| VPN monitor exposes `/stats` on port 9999 | Backend `vpn_control.py` can *read* it, but **never pushes session data into SQLite** |
| Backend has `Session` DB model | **No code ever creates Session rows** when a VPN client connects |
| Frontend fetches `GET /sessions` | Returns only DB rows (always empty) — never sees live VPN data |
| Dashboard shows bandwidth stats | All stats are `0` because no session data flows into the DB |
| Session termination exists | Works for IPC → VPN, but the DB row doesn't exist to trigger it from the UI |

**In short: your VPN is a running engine, your dashboard is a beautiful cockpit, but the gauges aren't wired to the engine.**

---

## Resolved Decisions

| Question | Decision |
|---|---|
| **User sync strategy** | Users created in dashboard **automatically** become valid VPN users |
| **Session history** | Keep history — sessions marked `"disconnected"` when client drops, **never deleted** |
| **Certificate distribution** | Post-demo concern — not needed for defence |

---

## What Must Be Done (Priority 1 — Non-Negotiable for Demo)

These are the **minimum changes** to make your defence demo work end-to-end:

### 1. Session Sync Service (Backend → VPN polling)

| Task | Status |
|---|---|
| `[NEW] _backend/app/services/session_sync.py` — background poller (5s interval) | ✅ Done |
| `[MODIFY] _backend/app/models/session.py` — add `status`, `disconnected_at`, `username` columns | ✅ Done |
| `[MODIFY] _backend/app/schemas/session.py` — update Pydantic schema with new fields | ✅ Done |
| `[MODIFY] _backend/app/main.py` — register startup event for sync task via `lifespan` | ✅ Done |
| `[MODIFY] _backend/app/routes/sessions.py` — use synced data, `active_only` filter, preserve history on terminate | ✅ Done |

### 2. VPN Health + Stats Endpoint (Backend + Frontend)

| Task | Status |
|---|---|
| `[NEW] _backend/app/routes/vpn_stats.py` — `GET /vpn/stats` endpoint (admin only) | ✅ Done |
| `[MODIFY] _frontend/src/pages/DashboardPage.tsx` — VPN status card (🟢/🔴), uptime, anomaly warnings | ✅ Done |
| `[MODIFY] _frontend/src/api/types.ts` — add `VpnStats` interface | ✅ Done |

### 3. Audit Log Visibility (Backend + Frontend)

| Task | Status |
|---|---|
| `[NEW] _backend/app/routes/audit_logs.py` — `GET /audit-logs` admin endpoint with pagination + filter | ✅ Done |
| `[NEW] _frontend/src/pages/AuditLogPage.tsx` — styled table with action badges, pagination, filter | ✅ Done |
| `[MODIFY] _frontend/src/App.tsx` — add `/audit-logs` route | ✅ Done |
| `[MODIFY] _frontend/src/components/common/Sidebar.tsx` — add Audit Log nav item | ✅ Done |

---

## What Should Be Done (Priority 2 — Makes Demo Impressive)

### 4. Live Auto-Refresh

| Task | Status |
|---|---|
| `[MODIFY] _frontend/src/hooks/useSessions.ts` — add `autoRefreshMs` parameter | ✅ Done |
| `[MODIFY] _frontend/src/pages/SessionsPage.tsx` — 5s auto-refresh | ✅ Done |
| `[MODIFY] _frontend/src/pages/DashboardPage.tsx` — 10s auto-refresh for stats + sessions | ✅ Done |

### 5. Dashboard "VPN Core Status" Card

| Task | Status |
|---|---|
| VPN status card with green/red indicator, uptime, capacity | ✅ Done (in DashboardPage) |

### 6. Session Status Display

| Task | Status |
|---|---|
| `[MODIFY] _frontend/src/components/tables/SessionsTable.tsx` — Status column with Active/Closed badges | ✅ Done |
| `[MODIFY] _frontend/src/components/tables/SessionsTable.tsx` — Hide terminate button for closed sessions | ✅ Done |
| `[MODIFY] _frontend/src/components/tables/SessionsTable.tsx` — Status in detail modal | ✅ Done |

### 7. Backend Router Registration

| Task | Status |
|---|---|
| `[MODIFY] _backend/app/routes/__init__.py` — register `vpn_stats_router` and `audit_logs_router` | ✅ Done |

### 8. VPN Push Notifications (Session Start/End)

| Task | Status |
|---|---|
| `[MODIFY] _custom_ssl_vpn/server/vpn_server.py` — fire HTTP POST to backend on auth success | ❌ Not Done |

### 9. Unified User Sync (Dashboard → VPN `server_users.json`)

| Task | Status |
|---|---|
| Auto-sync users created in dashboard to `server_users.json` | ❌ Not Done |
| Show "VPN-enabled" badge on Users page | ❌ Not Done |

---

## What Can Be Skipped (Nice-to-Have, Post-Defence)

| Feature | Why Skip |
|---|---|
| SOCKS5 Multiplexing | Complex, not needed for demo |
| Docker/CI/CD | Not relevant for a local live demo |
| CSRF tokens | Good practice but not demo-critical |
| Component tests | Won't be examined during defence |
| Production SSL certs | Localhost demo is fine |
| Certificate distribution to clients | Post-demo architecture concern |

---

## Demo Script (After Implementation)

Once implemented, your defence demo would flow like this:

```
1. Start VPN Server       → Terminal 1 (port 8443 + monitor on 9999)
2. Start Backend API      → Terminal 2 (port 8000)  
3. Start Frontend         → Terminal 3 (port 5173)
4. Open Dashboard         → Browser shows "VPN Core: 🟢 Online"
5. Connect VPN Client     → Terminal 4
6. Watch Dashboard        → Session appears in real-time ✨
7. Show Wireshark         → Encrypted on 8443, plain on 9000
8. Show Sessions Page     → Live bandwidth updating
9. Terminate Session      → Click button → VPN tunnel drops
10. Show Audit Logs       → "admin terminated session xyz"
11. Show Users Page       → CRUD a user
```

This end-to-end flow proves **all three tiers working in harmony**.

---

## Verification Plan

### Automated Tests
- Run existing backend tests: `cd _backend && python -m pytest`
- Test session sync manually by connecting a VPN client and checking `/sessions` endpoint
- Test VPN stats endpoint: `curl http://localhost:8000/api/vpn/stats`

### Manual Verification (Demo Rehearsal)
- Full 4-terminal demo flow as described above
- Verify dashboard updates within 5 seconds of VPN client connecting
- Verify session termination from frontend kills the actual VPN tunnel
- Verify audit log captures all actions

---

**Last Updated:** 2026-04-15
**Status:** Priority 1 + most of Priority 2: ✅ COMPLETE | Remaining: User sync (#9), VPN push (#8)

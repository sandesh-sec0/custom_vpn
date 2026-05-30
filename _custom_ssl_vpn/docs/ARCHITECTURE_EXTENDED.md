# Extended Architecture: Frontend + Backend + VPN

This document describes the three-tier architecture introduced to transform the VPN from a CLI-only tool into a full-fledged management platform.

---

## System Overview

```
┌─────────────────────────────────────────────────────┐
│         Frontend (React + Shadcn + Tailwind)        │
│  - User Dashboard                                    │
│  - User Management (Admin Panel)                     │
│  - Session Monitoring                                │
│  - Analytics & Logs                                  │
└────────────────┬────────────────────────────────────┘
                 │ HTTPS REST API
                 ↓
┌─────────────────────────────────────────────────────┐
│           Backend (FastAPI + MySQL)                 │
│  - Authentication & Authorization                    │
│  - User CRUD Operations                              │
│  - Session Management                                │
│  - Audit Logging                                     │
│  - VPN Server Control                                │
└────────────────┬────────────────────────────────────┘
                 │ IPC (Control Socket / gRPC)
                 ↓
┌─────────────────────────────────────────────────────┐
│       VPN Backend (Pure Python - custom_ssl_vpn)    │
│  - TLS Listener (port 8443)                         │
│  - AuthManager (credential validation)              │
│  - SessionManager (tunnel lifecycle)                │
│  - TunnelRelay (bidirectional forwarding)           │
│  - SecurityPolicy (IP blocking)                     │
└─────────────────────────────────────────────────────┘
```

---

## Directory Structure

```
vpn_prototype_v3_AG/
├── backend/                          # FastAPI management layer
│   ├── app/
│   │   ├── main.py                   # FastAPI application entry
│   │   ├── config.py                 # Backend configuration (DB, secrets)
│   │   ├── dependencies.py           # Shared dependencies (auth, DB)
│   │   ├── models/
│   │   │   ├── user.py               # User database model
│   │   │   ├── session.py            # Session tracking model
│   │   │   └── audit_log.py          # Audit log model
│   │   ├── schemas/
│   │   │   ├── user.py               # Pydantic request/response models
│   │   │   ├── session.py
│   │   │   └── auth.py
│   │   ├── routes/
│   │   │   ├── auth.py               # /auth/* endpoints
│   │   │   ├── users.py              # /users/* endpoints
│   │   │   ├── sessions.py           # /sessions/* endpoints
│   │   │   └── admin.py              # /admin/* endpoints
│   │   ├── services/
│   │   │   ├── user_service.py       # Business logic for users
│   │   │   ├── auth_service.py       # Token/session logic
│   │   │   └── vpn_control.py        # IPC to VPN backend
│   │   └── utils/
│   │       ├── security.py           # JWT, hashing utilities
│   │       └── logger.py             # Structured logging
│   ├── tests/
│   ├── requirements.txt
│   ├── .env.example
│   └── docker/
│       └── Dockerfile
│
├── frontend/                         # React SPA management UI
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── UsersPage.tsx
│   │   │   ├── SessionsPage.tsx
│   │   │   └── AdminPage.tsx
│   │   ├── components/
│   │   │   ├── UserForm.tsx
│   │   │   ├── SessionMonitor.tsx
│   │   │   └── StatsChart.tsx
│   │   ├── api/
│   │   │   ├── client.ts             # Axios/Fetch wrapper
│   │   │   └── types.ts              # API response types
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   └── useSessions.ts
│   │   ├── context/
│   │   │   └── AuthContext.tsx
│   │   ├── styles/
│   │   │   └── globals.css           # Tailwind config
│   │   └── utils/
│   │       └── auth.ts
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   ├── .env.example
│   └── docker/
│       └── Dockerfile
│
├── custom_ssl_vpn/                   # Core VPN logic (pure Python)
│   ├── gen_certs.py                  # Certificate generation utility
│   ├── server/
│   ├── client/
│   ├── shared/
│   ├── tests/
│   ├── docs/
│   │   ├── ag_doc_before_mid_def/   # Core VPN documentation
│   │   │   ├── ARCHITECTURE.md
│   │   │   ├── FULL_LIFECYCLE_EXPLANATION.md
│   │   │   ├── ALGORITHMS_AND_CONCEPTS.md
│   │   │   ├── FUNCTION_INDEX.md
│   │   │   ├── CALL_GRAPH.md
│   │   │   └── threat_model.md
│   │   └── ARCHITECTURE_EXTENDED.md  # This file
│   └── __init__.py
│
├── docker-compose.yml                # Local development orchestration
├── .gitignore
├── README.md
└── requirements.txt (root)
```

---

## Component Interaction

### 1. Frontend → Backend Communication

**Protocol:** HTTPS REST API
**Authentication:** Bearer token (JWT) or Session cookie

**Example Flow:**

```
User clicks "Create User"
  ↓
POST /api/users with JSON payload
  ↓
FastAPI validates Pydantic schema
  ↓
Database transaction executes
  ↓
VPN server notified (optional)
  ↓
Response: 201 Created with user record
  ↓
Frontend updates state & re-renders
```

### 2. Backend → VPN Backend Communication

**Protocol:** IPC (Options)

- **Option A:** Control socket (JSON over encrypted TCP)
- **Option B:** gRPC (protobuf for efficiency)
- **Option C:** Subprocess/signals (simpler for CLI)

**Use Cases:**

- Get active session list
- Force-terminate a session
- Update user permissions (user can only access service X)
- Get bandwidth statistics

**Example:**

```python
# Backend wants to know current sessions
vpn_control_service.get_sessions()
  → Sends gRPC call to VPN server
  → VPN server returns SessionManager.list_sessions()
  → Backend caches result in FastAPI response
```

### 3. Client (CLI) → VPN Backend Communication

**Protocol:** TLS-encrypted protocol (custom binary + JSON)

**Unchanged:**

- Client still uses `python vpn_client.py` or new multi-service client
- Authentication, tunnel, relay logic remains the same
- Backend API has no direct visibility into individual tunnel traffic (for security)

---

## Data Flow: User Registration to VPN Access

```
1. Admin opens Frontend Dashboard
   ↓ (POST /api/users)
2. Backend creates User in MySQL, hashes password
   ↓ (optionally notify VPN server)
3. VPN Server updates its credentials (either reload DB or via control API)
   ↓
4. User receives credentials (email or in-app)
5. User runs: python vpn_client.py --username alice --target-host db.internal
   ↓
6. Client connects to VPN Server (port 8443)
7. VPN Server checks AuthManager against DB credentials
8. TLS tunnel established, bidirectional relay active
```

---

## Security Boundaries

### Frontend Security

- **XSS Protection:** Shadcn components auto-escape HTML
- **CSRF:** Token validation on state-changing requests
- **Token Storage:** httpOnly, Secure cookies (not localStorage)
- **Session Timeout:** Auto-logout after 30 min of inactivity

### Backend Security

- **API Authentication:** All endpoints require valid JWT
- **Rate Limiting:** 5 failed logins = 15 min IP ban
- **SQL Injection:** Parameterized queries (SQLAlchemy ORM)
- **Audit Logging:** Database logs all admin actions
- **IPC Auth:** Control messages signed with shared secret or mTLS

### VPN Backend Security

- **No API Dependencies:** VPN never trusts unauthenticated API calls
- **Backward Compatible:** Works with old CLI clients (no API dependency)
- **Network Isolation:** VPN server can run on separate machine from Backend
- **Credentials:** Sources truth from either local file or Backend (configurable)

---

## Deployment Scenarios

### Scenario 1: Local Development

```bash
docker-compose up
# Starts:
# - Frontend on localhost:3000
# - Backend on localhost:8000
# - VPN Server on localhost:8443
# - MySQL on localhost:3306
```

### Scenario 2: Separate Infrastructure

```
VPN Server: 192.168.1.100:8443 (internal network only)
Backend: 10.0.1.50:8000 (internal)
Frontend: vpn.company.com (HTTPS, CDN)
MySQL: 10.0.1.75:3306 (internal, replicated)
```

### Scenario 3: Hybrid (VPN-only)

```
VPN Server standalone (CLI mode)
Backend/Frontend optional (for managing users)
Credentials synced via: cron job, webhook, or gRPC
```

---

## Configuration

### Frontend (.env)

```
VITE_API_URL=http://localhost:8000/api
VITE_API_TIMEOUT=30000
```

### Backend (.env)

```
DATABASE_URL=mysql+pymysql://root:password@localhost:3306/vpn_db
SQLALCHEMY_ECHO=False
JWT_SECRET=<long-random-key>
VPN_CONTROL_SOCKET=/tmp/vpn_control.sock
LOG_LEVEL=INFO
```

### VPN (.env or config.json)

```
# Option 1: Use backend API for creds
CREDENTIALS_SOURCE=backend_api
BACKEND_API_URL=http://localhost:8000
BACKEND_AUTH_TOKEN=<token>

# Option 2: Use local file (traditional)
CREDENTIALS_SOURCE=local_file
CREDENTIALS_FILE=server_users.json
```

---

## Next Steps for Extension

1. **Phase 1:** Implement FastAPI backend with user management
2. **Phase 2:** Add React frontend with basic dashboard
3. **Phase 3:** Implement IPC between Backend and VPN Server
4. **Phase 4:** Add multi-service tunneling (SOCKS5 or multiplexing)
5. **Phase 5:** Deploy with Docker Compose and test end-to-end
6. **Phase 6:** Add advanced features (quotas, time-based access, 2FA)

---

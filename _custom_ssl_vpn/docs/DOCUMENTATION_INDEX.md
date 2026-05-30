# VPN Project Documentation Index

Complete documentation for the Custom SSL VPN project, including core VPN architecture and extended frontend/backend layers.

---

## 📋 Content Navigator

### Core VPN Layer (Pure Python)

These documents explain the VPN engine itself - the TLS protocol, authentication, session management, and tunnel mechanics.

| Document                                                                                 | Purpose                                                                      | Audience                              |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------- |
| **[ARCHITECTURE.md](ag_doc_before_mid_def/ARCHITECTURE.md)**                             | Module structure, dependencies, threading model, TLS termination             | Engineers, Architects                 |
| **[FULL_LIFECYCLE_EXPLANATION.md](ag_doc_before_mid_def/FULL_LIFECYCLE_EXPLANATION.md)** | End-to-end walkthrough from client startup to data relay (0-100%)            | Students, New Team Members, Reviewers |
| **[ALGORITHMS_AND_CONCEPTS.md](ag_doc_before_mid_def/ALGORITHMS_AND_CONCEPTS.md)**       | Cryptographic rationale: AES, ECDHE, PBKDF2, RSA, and why they're chosen     | Security Engineers, Academics         |
| **[FUNCTION_INDEX.md](ag_doc_before_mid_def/FUNCTION_INDEX.md)**                         | Complete API reference: all public classes, methods, signatures, and returns | Developers, Code Reviewers            |
| **[CALL_GRAPH.md](ag_doc_before_mid_def/CALL_GRAPH.md)**                                 | Execution flow diagrams showing server and client call hierarchies           | Debuggers, Developers                 |
| **[threat_model.md](ag_doc_before_mid_def/threat_model.md)**                             | Security attack surface analysis, threat actors, mitigations                 | Security Team, Project Managers       |

### Extended Architecture (Frontend + Backend)

These documents cover the three-tier system that adds management UI, API, and user administration to the VPN.

| Document                                                 | Purpose                                                                         | Audience                         |
| -------------------------------------------------------- | ------------------------------------------------------------------------------- | -------------------------------- |
| **[ARCHITECTURE_EXTENDED.md](ARCHITECTURE_EXTENDED.md)** | Three-tier system design, directory structure, component interaction, data flow | Full-Stack Engineers, Architects |

### Development & Reference

| Document                                                                         | Purpose                                                                       | Audience       |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | -------------- |
| **[.agents/rules/vpn-project-rule.md](../../.agents/rules/vpn-project-rule.md)** | Architectural constraints, security mandates, coding standards for all layers | All Developers |

---

## 🎯 Quick Start by Role

### **If you're a Student / Learning the Project**

1. Start with [FULL_LIFECYCLE_EXPLANATION.md](ag_doc_before_mid_def/FULL_LIFECYCLE_EXPLANATION.md) — understand what happens end-to-end
2. Read [ARCHITECTURE.md](ag_doc_before_mid_def/ARCHITECTURE.md) — see how modules fit together
3. Read [ALGORITHMS_AND_CONCEPTS.md](ag_doc_before_mid_def/ALGORITHMS_AND_CONCEPTS.md) — understand the "why" behind crypto choices

### **If you're a Backend Developer (FastAPI)**

1. Read [ARCHITECTURE_EXTENDED.md](ARCHITECTURE_EXTENDED.md) — understand the three-tier system
2. Skim [FUNCTION_INDEX.md](ag_doc_before_mid_def/FUNCTION_INDEX.md) — know what VPN APIs you can call
3. Check [.agents/rules/vpn-project-rule.md](../../.agents/rules/vpn-project-rule.md) Section 3.2 — Backend coding standards
4. Focus on `backend/app/services/vpn_control.py` — your IPC to VPN server

### **If you're a Frontend Developer (React)**

1. Read [ARCHITECTURE_EXTENDED.md](ARCHITECTURE_EXTENDED.md) Section "Frontend → Backend Communication"
2. Check [.agents/rules/vpn-project-rule.md](../../.agents/rules/vpn-project-rule.md) Section 3.3 — Frontend coding standards
3. Focus on `frontend/src/api/client.ts` — your REST API wrapper

### **If you're a Security Engineer**

1. Read [threat_model.md](ag_doc_before_mid_def/threat_model.md) — understand our threat model
2. Read [ALGORITHMS_AND_CONCEPTS.md](ag_doc_before_mid_def/ALGORITHMS_AND_CONCEPTS.md) — understand crypto choices
3. Skim [ARCHITECTURE.md](ag_doc_before_mid_def/ARCHITECTURE.md) — understand threading and socket safety
4. Check [.agents/rules/vpn-project-rule.md](../../.agents/rules/vpn-project-rule.md) Sections 2.1-2.3 — security mandates across all layers

### **If you're a Reviewer / Project Manager**

1. Read [FULL_LIFECYCLE_EXPLANATION.md](ag_doc_before_mid_def/FULL_LIFECYCLE_EXPLANATION.md) — understand the value proposition
2. Read [threat_model.md](ag_doc_before_mid_def/threat_model.md) — understand security posture
3. Skim [ARCHITECTURE_EXTENDED.md](ARCHITECTURE_EXTENDED.md) — understand scalability approach

---

## 📊 Architecture Layers at a Glance

```
┌──────────────────────────────────────┐
│  Frontend                            │
│  (Vite + React + Shadcn + Tailwind) │ → User dashboard, user management
└─────────────────┬────────────────────┘
                  │ HTTPS REST API
                  ↓
┌──────────────────────────────────────┐
│  Backend                             │
│  (FastAPI + MySQL)                  │ → User CRUD, auth, audit logging
└─────────────────┬────────────────────┘
                  │ IPC (gRPC / Sockets)
                  ↓
┌──────────────────────────────────────┐
│  VPN Backend                         │
│  (Pure Python: custom_ssl_vpn)       │ → Core tunnel, encryption, relay
└──────────────────────────────────────┘
```

**Key Principle:** Each layer is **loosely coupled**. VPN can run standalone (CLI mode), Backend can run standalone (API-only), Frontend can run standalone (mock API).

---

## 🔐 Security Design Philosophy

**Application-Layer VPN** (vs IP-Level VPN):

- ✅ No privilege escalation (runs as regular user)
- ✅ Explicit service access (only what you configure)
- ✅ Prevents lateral network movement
- ✅ Cleaner audit trails (application-level logging)
- ⚠️ Requires per-service configuration (not "full network access")

**Multi-Layer Security:**

- **VPN Layer:** TLS 1.2+, PBKDF2-HMAC, timing-safe comparisons
- **Backend Layer:** JWT auth, rate limiting, SQL parameter binding
- **Frontend Layer:** XSS prevention, CSRF tokens, httpOnly cookies

---

## 📁 How Files are Organized

```
custom_ssl_vpn/
├── gen_certs.py                      # 🔧 Run this to regenerate certificates
├── server/     & client/             # Core VPN logic
├── shared/                           # Protocol, exceptions (shared between server/client)
├── tests/                            # Unit & integration tests
└── docs/
    ├── ag_doc_before_mid_def/        # ← Original documentation (6 files)
    │   ├── ARCHITECTURE.md
    │   ├── FULL_LIFECYCLE_EXPLANATION.md
    │   ├── ALGORITHMS_AND_CONCEPTS.md
    │   ├── FUNCTION_INDEX.md
    │   ├── CALL_GRAPH.md
    │   └── threat_model.md
    ├── ARCHITECTURE_EXTENDED.md      # ← NEW: Three-tier system design
    └── DOCUMENTATION_INDEX.md         # ← This file
```

---

## 🚀 How to Use This Documentation

### Reading Order for Understanding the Full System

1. **What does it do?** → FULL_LIFECYCLE_EXPLANATION.md
2. **How does it work?** → ARCHITECTURE.md + ARCHITECTURE_EXTENDED.md
3. **Why these choices?** → ALGORITHMS_AND_CONCEPTS.md + threat_model.md
4. **How do I use the APIs?** → FUNCTION_INDEX.md
5. **What are the rules?** → .agents/rules/vpn-project-rule.md

### Finding Answers to Specific Questions

| Question                                    | See                                              |
| ------------------------------------------- | ------------------------------------------------ |
| "How does TLS handshake work?"              | FULL_LIFECYCLE_EXPLANATION.md (Phase 2)          |
| "What's the authentication flow?"           | FULL_LIFECYCLE_EXPLANATION.md (Phase 3)          |
| "What threads run in the server?"           | ARCHITECTURE.md (Threading Model)                |
| "How do I create a new VPN user?"           | FUNCTION_INDEX.md (AuthManager.register_user)    |
| "What if an attacker tries to brute-force?" | threat_model.md (Brute Force Authentication)     |
| "How does the Frontend talk to Backend?"    | ARCHITECTURE_EXTENDED.md (Component Interaction) |
| "What are the coding standards?"            | .agents/rules/vpn-project-rule.md                |

---

## 📝 Keeping Docs in Sync

**Rule:** When you modify code, update the relevant docs:

| If you change                         | Update doc(s)                                     |
| ------------------------------------- | ------------------------------------------------- |
| Module structure or dependencies      | ARCHITECTURE.md                                   |
| Class/function signatures             | FUNCTION_INDEX.md                                 |
| Thread spawning or lifecycle          | ARCHITECTURE.md (Threading Model) + CALL_GRAPH.md |
| Crypto algorithm or security approach | ALGORITHMS_AND_CONCEPTS.md + threat_model.md      |
| Authentication flow                   | FULL_LIFECYCLE_EXPLANATION.md (Phase 3-4)         |
| Backend API endpoints                 | Backend's Swagger docs (auto-generated)           |
| File/folder structure                 | ARCHITECTURE_EXTENDED.md (Directory Structure)    |

**Policy:** Stale documentation is worse than no documentation. Keep docs fresh or mark them as "draft."

---

## ✅ Verification Checklist

Before submitting a PR:

- [ ] Code follows [vpn-project-rule.md](../../.agents/rules/vpn-project-rule.md)
- [ ] New public APIs are documented in FUNCTION_INDEX.md
- [ ] Thread changes are reflected in ARCHITECTURE.md
- [ ] Security changes are justified in threat_model.md
- [ ] Tests are written (unit + integration)
- [ ] Commit messages reference the docs (e.g., "Implement SOCKS5 multiplexing (see ARCHITECTURE_EXTENDED.md)")

---

## 🤝 Contributing

See `.agents/rules/vpn-project-rule.md` for:

- Architecture constraints
- Security mandates
- Coding standards
- Exception handling
- Testing requirements
- Deployment guidelines

---

## 📚 External References

- TLS 1.2 Spec: [RFC 5246](https://tools.ietf.org/html/rfc5246)
- PBKDF2: [RFC 2898](https://tools.ietf.org/html/rfc2898)
- X.509 Certificates: [RFC 5280](https://tools.ietf.org/html/rfc5280)
- ECDHE: [RFC 5480](https://tools.ietf.org/html/rfc5480)

---

_Last Updated: 2026-04-12_
_Maintained by: Development Team_

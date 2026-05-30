# Backend Layer Walkthrough

This document describes the FastAPI management layer that powers the VPN infrastructure.

## ⚙️ Overview
The backend is a robust REST API built with **FastAPI** and **Python 3.11**. It acts as the "brain," managing user identities, session persistence, and security policies while communicating with the VPN core via IPC.

## 🚀 Key Features

### 1. Secure Authentication
- **OAuth2 with JWT**: Industry-standard token-based security.
- **PBKDF2 Hashing**: Passwords stored using 100,000 iterations for high brute-force resistance.
- **Rate Limiting**: Integrated protection against automated login attacks.

### 2. Database & Persistence
- **SQLAlchemy ORM**: Clean, typed database interactions.
- **Unified Models**: Centralized tracking for Users, Sessions, and Audit Logs.
- **Soft Deletion**: Ensuring data integrity by flagging records instead of hard removal.

### 3. VPN Control (IPC Bridge)
- **JSON over TCP**: A high-speed, secure control socket.
- **Capabilities**: The API can query the VPN server for live stats or command it to disconnect a specific session.

### 4. Audit Logging & Verification
- **Traceability**: Every administrative action is logged with timestamps, IPs, and user IDs.
- **Persistent Telemetry**: Global traffic counters are calculated directly from the database, ensuring they survive server restarts.
- **Session Byte Sync**: Implemented real-time push notifications from VPN to Backend to ensure final byte counts are saved even on sudden disconnects.

## 📂 Project Structure
- `app/routes/`: Functional endpoints (Auth, Users, Sessions, Health).
- `app/models/`: Database schemas (User, Session, AuditLog).
- `app/services/`: Core business logic (AuthService, UserService, VpnControl).
- `app/dependencies/`: Reusable logic for database sessions and auth checks.

## 🔐 Security Mandates
- **HTTPS Only**: All production traffic uses TLS 1.2+.
- **No Plaintext**: Strict zero-plaintext policy for credentials.
- **SQLi Protection**: Full use of parameterized queries through SQLAlchemy.

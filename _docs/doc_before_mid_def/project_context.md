# Algorithms and Cryptographic Concepts

This document explains the technical "brain" of the Custom SSL VPN. It breaks down the algorithms used, the security concepts they provide, and the engineering rationale for choosing them over alternatives.

---

## 1. Transport Security (The Tunnel)

The VPN uses **TLS (Transport Layer Security) 1.2 / 1.3** to wrap all traffic.

### 1.1 AES (Advanced Encryption Standard)

- **Concept**: **Confidentiality** (Ensures no one can read the data).
- **Alternative**: DES, 3DES, ChaCha20.
- **Why this?**:
    - AES is the industry gold standard. It is a "Symmetric" algorithm, meaning it is extremely fast because it uses the same key for encryption and decryption.
    - **Alternative Rationale**: DES is "broken" (cryptographically weak). ChaCha20 is great for mobile devices without hardware acceleration, but AES is hardware-accelerated on almost all modern CPUs, making it more efficient for a server.

### 1.2 ECDHE (Elliptic Curve Diffie-Hellman Ephemeral)

- **Concept**: **Forward Secrecy** (Ensures past sessions remain safe if the server key is stolen later).
- **Alternative**: Static Diffie-Hellman (DH), RSA Key Exchange.
- **Why this?**:
    - In `vpn_server.py`, we use `OP_SINGLE_ECDH_USE`. This generates a _new_ temporary key for every single connection.
    - **Alternative Rationale**: Standard RSA key exchange is vulnerable; if an attacker records your traffic today and steals your private key next year, they can decrypt today's traffic. ECDHE prevents this.

### 1.3 RSA / ECDSA (Digital Signatures)

- **Concept**: **Authenticity** (Ensures the client is talking to the _real_ server).
- **Alternative**: Shared Keys (PSK).
- **Why this?**:
    - We use X.509 Certificates. The client checks the server's cert against a trusted Certificate Authority (CA).
    - **Alternative Rationale**: Shared keys are hard to manage at scale. Certificates allow the server to prove its identity without the client needing to know a "secret" beforehand.

---

## 2. Authentication (The Gateway)

How we verify the user's identity before letting them through the tunnel.

### 2.1 PBKDF2-HMAC-SHA256

- **Concept**: **Credential Security** (Protects passwords at rest).
- **Alternative**: Argon2, bcrypt, MD5 (Plain).
- **Why this?**:
    - Matches the **standard library** (no 3rd party dependencies). We use 100,000 iterations to make "brute-forcing" the database extremely slow for an attacker.
    - **Unified User Sync**: The backend synchronization service (`vpn_user_sync_service.py`) uses identical parameters to ensure that credentials created via the Admin Dashboard are compatible with the VPN core.
    - **Alternative Rationale**: MD5 is dangerously fast and insecure. Argon2 is technically superior but requires external C libraries (like `pynacl`). PBKDF2 is the best "batteries-included" choice for a Python project.

### 2.2 hmac.compare_digest

- **Concept**: **Timing Attack Prevention** (Confidentiality of the comparison).
- **Alternative**: Standard `==` operator.
- **Why this?**:
    - The `==` operator stops as soon as it finds a mismatch, meaning it returns faster for "wrong" passwords than for "almost right" ones. This allows an attacker to guess the hash character by character. `compare_digest` always takes the same amount of time.
    - **Alternative Rationale**: Using `==` is a classic security "gotcha."

---

## 3. Network Reliability / Continuity

### 3.1 Sliding Window Rate Limiting (In `VPNLogger`)

- **Concept**: **Availability** (Prevents DOS/Brute Force crashes).
- **Alternative**: Fixed Window, Token Bucket.
- **Why this?**:
    - We track failures in the last 300 seconds (5 mins). This is more "fair" than a fixed window (e.g., "10 fails per hour") because it resets smoothly.
    - **Alternative Rationale**: Token Bucket is better for high-traffic APIs, but Sliding Window is easier to implement for a VPN security monitor.

### 3.2 TCP SO_REUSEADDR

- **Concept**: **Reliability / Operational Continuity**.
- **Alternative**: Waiting for OS timeout.
- **Why this?**:
    - Allows the server to restart immediately on the same port. Without it, we have to wait 1-2 minutes for the OS to release the socket.

---

## Summary Table

| Goal                | Technique                 | Component      |
| ------------------- | ------------------------- | -------------- |
| **Confidentiality** | AES-256-GCM               | TLS Layer      |
| **Integrity**       | SHA-256 (HMAC)            | TLS / Protocol |
| **Authenticity**    | X.509 Certs (RSA)         | TLS Handshake  |
| **Identity**        | PBKDF2-HMAC               | AuthManager    |
| **Forward Secrecy** | ECDHE                     | TLS Handshake  |
| **Availability**    | IP Blocklist / Rate Limit | SecurityPolicy |
| **Timing Safety**   | `compare_digest`          | AuthManager    |

# VPN Architecture Overview

This document outlines the architectural design, module dependencies, data flow, threading model, and TLS termination strategy for the custom SSL/TLS application-layer VPN.

## 1. Core VPN Tier (Pure Python)

This is the traditional "engine" of the VPN. It handles the raw sockets, TLS handshakes, and application-layer relay.

### Module Dependencies

```text
custom_ssl_vpn/
├── client/
│   ├── vpn_client.py  --------------> shared/protocol.py
│   │   ├── config.py
│   │   └── forwarder.py
│
├── server/
│   ├── vpn_server.py  --------------> shared/protocol.py
│   │   ├── config.py
│   │   ├── logger.py
│   │   ├── auth.py
│   │   ├── session.py
│   │   ├── security.py
│   │   ├── monitor.py
│   │   └── tunnel.py
│
└── shared/
    ├── protocol.py    --------------> shared/exceptions.py
    └── exceptions.py
```

## 2. Extended Architecture (Three-Tier System)

The project has been extended with a management layer to provide an Administrative Dashboard and REST API.

```text
Frontend (React + Vite)
  ↓ [HTTPS REST API + JWT]
Backend (FastAPI + SQLAlchemy)
  ↓ [Sync: server_users.json | Events: HTTP Push]
VPN Core (Pure Python)
```

### 2.1 Management Backend (FastAPI)
- **Identity**: Centralized user database (Bcrypt hashed) with automatic sync to VPN engine (PBKDF2).
- **Control**: Receives real-time push events (including final byte counts) from the VPN core via HTTP.
- **Audit**: Log all administrative actions to the database.
- **Persistence**: Global stats are calculated from the SQL database, making them survive restarts.

### 2.2 Administrative Dashboard (React)
- **Visualization**: Premium dark-mode dashboard with real-time analytics.
- **User Management**: Unified CRUD with role-based access control (Admin vs User).
- **Service Center**: Users can download pre-configured `.json` profiles for authorized internal services.

## Data Flow

The lifecycle of a tunneled connection flows sequentially through several layers before bidirectional relay begins:

1. **Client Startup:**
   `VPNClient` connects to `VPNServer` and performs a TLS handshake.
2. **Authentication:**
   Client sends `AUTH` message. Server's `AuthManager` validates credentials. On success, an `OK` message containing a `session_id` is returned.
3. **Local Forwarder Binding:**
   The `LocalForwarder` binds to a configured local port (e.g., `9000`) and accepts downstream application connections.
4. **Service-Config Handshake:**
   The Client uses a downloaded Service Configuration file to dynamically route to the correct internal target without requiring manual CLI flags.
5. **Relay Setup:**
   The server's `TunnelRelay` establishes a plain TCP connection to the internal service AFTER verifying user permissions against the backend database.
6. **Data Relay:**
   Bidirectional traffic starts immediately:
    `Application <──TCP──> LocalForwarder <──TLS (VPN)──> TunnelRelay <──TCP──> Internal Service`
7. **One-Shot Teardown & Sync**:
   The `LocalForwarder` ensures exactly one application session is proxied. Upon exit, it triggers a `STOP` event which pushes **final byte counts** to the backend instantly.

## Threading Model

The server uses a thread-per-client model combined with asynchronous non-blocking relays to maximize throughput and isolation.

### Server Threads

- **Main Thread:** Runs `VPNServer._accept_loop()`. Accepts raw TCP sockets, runs IP blocklist checks, and spawns a new daemon thread for each client.
- **Client Handler Threads (`_handle_client`):** Wraps the socket in TLS, handles the AUTH/CONNECT protocol handshake, and configures the session. Yields to `TunnelRelay`.
- **Tunnel Relay Threads (`TunnelRelay.start_relay`):** Performs bidirectional multiplexing via `select()`. Blocks tightly on I/O.
- **Session Reaper Thread (`SessionManager._expiry_loop`):** Background daemon sweeping expired sessions every 60 seconds.
- **Security Unblock Thread (`SecurityPolicy._scheduled_unblock_loop`):** Background daemon lifting expired temporal IP bans every 10 seconds.
- **Monitor HTTP Thread:** Base HTTP server serving JSON stats on port 9999.
- **Push Notification Threads (`VPNPushNotifier`):** Short-lived daemon threads for asynchronous event delivery to the backend API.

### Client Threads

- **Main Thread:** Handles the CLI interface, TLS connection, authentication, and blocks on `LocalForwarder.start()` until the session ends. No multi-threading is typically launched on the client as it proxies exactly one application connection at a time.

## TLS Termination Points

The VPN relies heavily on end-to-end encryption for the untrusted segment of the journey.

- **Client Terminus:** `ssl.SSLSocket` inside `VPNClient`. Validates the Server CA certificate before transmitting any authentication data.
- **Server Terminus:** `ssl.SSLSocket` created in `VPNServer._handle_client()`. Uses strict TLSv1.2+ configuration with Perfect Forward Secrecy, effectively denying outdated SSLv3 clients before any application byte is read.
- **Internal Network:** The final hop from `VPNServer` (via `TunnelRelay`) to the internal service (e.g., test webserver) uses **plain TCP**, under the zero-trust paradigm assumption that the internal subnet segment connecting the VPN orchestrator and the target is considered explicitly trusted or loopback.

# VPN Call Graph

This document visualizes the execution flow and call hierarchy of the system.

**Legend:**

- ★ = Primary Entry Point (CLI)
- 🔐 = Security Critical (Auth, Encryption, or Firewalling)

## Server Execution Flow

★ **`server.vpn_server.main`**
└── `server.config.load_config` (Loads settings)
└── `server.logger.setup_logger` (Initialises JSON logging)
└── `server.vpn_server.VPNServer.start`
├── `server.vpn_server.VPNServer.setup_tls_context` 🔐 (Harden TLS)
├── `server.monitor.MonitoringDashboard.start` (SOC data feed)
└── `server.vpn_server.VPNServer._accept_loop`
├── `server.security.SecurityPolicy.is_blocked` 🔐 (TCP-level check)
└── `server.vpn_server.VPNServer._handle_client` (New Thread)
├── `server.session.SessionManager.create_session`
├── `shared.protocol.decode_message` (Parse AUTH)
├── **`server.auth.AuthManager.authenticate`** 🔐 (Validate Credentials)
│ └── `server.auth.AuthManager.rate_limit_check`
├── `server.session.SessionManager.authenticate_session`
├── `shared.protocol.encode_message` (Send OK)
├── `shared.protocol.decode_message` (Parse CONNECT)
├── `server.tunnel.TunnelRelay.connect` (Upstream TCP)
└── `server.tunnel.TunnelRelay.start_relay` (Data Plane)
└── `server.session.SessionManager.touch_session` (Activity)

## Client Execution Flow

★ **`client.vpn_client.main`**
└── `client.config.load_config`
└── `client.vpn_client.VPNClient.run`
├── **`client.vpn_client.VPNClient.connect_to_server`** 🔐 (TLS Handshake)
├── **`client.vpn_client.VPNClient.authenticate`** 🔐 (App-layer Handshake)
│ ├── `shared.protocol.encode_message`
│ └── `shared.protocol.decode_message`
└── `client.forwarder.LocalForwarder.start`
└── `client.forwarder.LocalForwarder._run_relay`
└── `client.forwarder.LocalForwarder._send_all`

## 🔑 Key Management Files
- `_backend/app/routes/auth.py`: JWT-based management auth.
- `_backend/app/services/vpn_control.py`: IPC bridge to the VPN Core.
- `_frontend/src/pages/DashboardPage.tsx`: Admin visualization layer.

# The Complete Custom SSL VPN Lifecycle (0% to 100%)

This document is a comprehensive script to explain the entire VPN system to an external reviewer, teacher, or engineering peer. It walks through what happens from the very start (the setup) to the exact moment data flows securely.

---

## 1. The Goal: Why does this exist?

**The Scenario:** Imagine an internal company server (like an HR database or a private web app). It sits on port `8080`. It is blocked from the internet by a firewall. A remote employee working from home needs to access it, but we don't want to expose port `8080` to the world.

**The Solution:** We run this Custom SSL VPN Server on the edge of the company network. It opens exactly one secure port (`8443`) to the public internet. The remote employee runs the VPN Client, which bypasses the firewall via `8443` and securely tunnels their traffic to the internal `8080` server.

---

## 2. Phase 1: Security Setup (The "0%")

Before anyone can connect, two foundational things must happen:

1.  **Identity (Certificates):** The VPN server generates an **X.509 Certificate** using RSA. This is like a digital passport. The remote employee (the client) has the Certificate Authority (CA) file on their laptop, so they can verify they are talking to the real company server, not a hacker in a coffee shop.
2.  **Authentication (Users):** The server administrator registers the employee's username and password. The password is _never_ saved in plain text. It is passed through the **PBKDF2-HMAC-SHA256** algorithm 100,000 times to create a secure cryptographic hash.

_State: The VPN Server is now running. It is waiting on port `8443`._

---

## 3. Phase 2: The Handshake (0% to 30%)

The remote employee starts the `VPNClient` program on their laptop.

1.  **The TCP Connection:** The client reaches out over the internet and hits the server on port `8443`.
2.  **The Bouncer (Security Policy):** Before the server even replies, the `SecurityPolicy` checks the client's IP address against a Blocklist. If the IP is banned (due to past attacks), the connection is instantly cut off.
3.  **The TLS Handshake (AES & ECDHE):** If allowed, the client and server negotiate a secure TLS 1.2+ connection. They use **ECDHE** (Elliptic Curve Ephemeral) to mathematically agree on a temporary, one-time secret key. All future traffic will be encrypted using **AES-256**.
    - _Analogy: They are now in a soundproof, bulletproof tunnel._

_State: We have a secure pipe, but the server still doesn't know WHO the employee is._

---

## 4. Phase 3: Authentication (30% to 60%)

Inside the bulletproof tunnel, the client application asks the user for their username and password.

1.  **The AUTH Packet:** The client packs the username and password into JSON, encrypts it, and sends it to the server with a command flag: `[AUTH]`.
2.  **Rate Limiting:** The server receives it. The `AuthManager` checks that this IP hasn't failed a password check more than 3 times in the last 5 minutes. If they have, they are temporarily banned.
3.  **Timing-Safe Compare:** The server hashes the password provided by the user and compares it to the database hash using `hmac.compare_digest`. This prevents "timing attacks" where hackers guess passwords by seeing how fast the server rejects them.
4.  **The Session ID:** The password is correct! The server creates a unique `session_id` (a UUID4) and sends an `[OK]` message back to the client.

_State: The secure tunnel is now authenticated._

---

## 5. Phase 4: Proxied Connection (60% to 90%)

The remote employee now wants to talk to the internal Web App on port `8080`.

1.  **The Target Request:** The client sends a `[CONNECT]` packet over the tunnel, asking the server to connect to `127.0.0.1:8080`.
2.  **The Local Gateway:** On the employee's laptop, the `VPNClient` opens a local proxy port (`localhost:9000`). It tells the employee: _"Point your browser to localhost:9000."_
3.  **The Internal Bridge:** On the company side, the `VPNServer` takes the `[CONNECT]` request and reaches into the internal network, finally connecting a raw TCP socket to the Web App at port `8080`.

_State: Both sides are fully wired up._

---

## 6. Phase 5: The Data Plane Relay (90% to 100%)

The employee opens their browser and types `http://localhost:9000`.

1.  **Upstream (Client -> Server):**
    - The browser sends an HTTP `GET /` request locally.
    - The `LocalForwarder` snatches that HTTP text.
    - It shoves the text into the TLS socket (AES encrypted).
    - The encrypted bytes fly across the public internet.
    - The `TunnelRelay` on the server receives them, decrypts them automatically, and pushes the plain HTTP text into port `8080`.
2.  **Downstream (Server -> Client):**
    - The internal app processes the request and sends the HTML response back.
    - The server's `TunnelRelay` catches the HTML, encrypts it, and sends it back across the internet.
    - The client's `LocalForwarder` decrypts it and hands the raw HTML back to the browser.
3.  **The Session Lifecycle (One-Shot Relay):** In this implementation, the `LocalForwarder` is designed for **High Isolation**. It accepts exactly one application connection (e.g., one browser session or one file download). As soon as the browser finishes its request and closes the connection, the `LocalForwarder` breaks the relay loop, triggers a `[DISCONNECT]` to the server, and safely terminates the VPN client. This ensures that the tunnel is never left "hanging" and vulnerable after use.
4.  **The Background Reapers:** While this happens, a `SessionManager` thread constantly checks if anyone has been idle for 60 minutes. If so, it kills the tunnel to save resources. A SOC `Monitor` watches live traffic to detect if someone is downloading too much data or if the server is reaching maximum capacity.

## Conclusion

The lifecycle of the Custom SSL VPN is built around **Transactional Security**. When the employee finishes their work in the browser, the VPN detects the closure and performs a multi-step cleanup: the `[DISCONNECT]` commands fire, the TLS sockets are gracefully shut down, the bytes-transferred metrics are logged for security auditing, and the internal Web App returns to being safely isolated behind the firewall.

> [!NOTE]
> While this "one-shot" behavior provides maximum session isolation, future versions of the project can implement **Multiplexing** to allow multiple browser tabs or concurrent applications to share the same persistent tunnel.

# Function Reference Index

This document provides a complete technical reference for every public class and function within the Custom SSL VPN project.

## Shared Modules

### `shared.protocol`

Definitions for the application-layer frame and binary codecs.

| Module            | Name             | Signature           | Returns      | Raises                                         | Purpose                                             | Dependencies |
| ----------------- | ---------------- | ------------------- | ------------ | ---------------------------------------------- | --------------------------------------------------- | ------------ |
| `shared.protocol` | `Commands`       | `Enum(str)`         | N/A          | N/A                                            | All valid command tokens (AUTH, CONNECT, etc.)      | None         |
| `shared.protocol` | `VPNMessage`     | `dataclass`         | N/A          | N/A                                            | Decoupled representation of a protocol frame        | None         |
| `shared.protocol` | `encode_message` | `(msg: VPNMessage)` | `bytes`      | `UnknownCommandError`, `MalformedMessageError` | Serialises a message to the wire-format buffer      | `exceptions` |
| `shared.protocol` | `decode_message` | `(raw: bytes)`      | `VPNMessage` | `MalformedMessageError`, `UnknownCommandError` | Deserialises a raw buffer into a structured message | `exceptions` |

### `shared.exceptions`

Domain-specific exception hierarchy.

| Module              | Name               | Signature                       | Returns | Raises | Purpose                                    | Dependencies |
| ------------------- | ------------------ | ------------------------------- | ------- | ------ | ------------------------------------------ | ------------ |
| `shared.exceptions` | `VPNBaseException` | `(message: str, context: dict)` | N/A     | N/A    | Base class for all project-specific errors | None         |

---

## Server Modules

### `server.vpn_server`

Central orchestrator for the server daemon.

| Module              | Name                          | Signature                | Returns          | Raises                    | Purpose                                         | Dependencies                                                           |
| ------------------- | ----------------------------- | ------------------------ | ---------------- | ------------------------- | ----------------------------------------------- | ---------------------------------------------------------------------- |
| `server.vpn_server` | `VPNServer`                   | `(config: ServerConfig)` | N/A              | N/A                       | Manages TLS listeners and client worker threads | `config`, `logger`, `auth`, `session`, `tunnel`, `security`, `monitor` |
| `server.vpn_server` | `VPNServer.setup_tls_context` | `()`                     | `ssl.SSLContext` | `ssl.SSLError`            | Hardens TLS settings (PFS, No SSLv3)            | `config`                                                               |
| `server.vpn_server` | `VPNServer.start`             | `()`                     | `None`           | `OSError`, `ssl.SSLError` | Binds port and enters the accept loop           | `logger`, `monitor`                                                    |
| `server.vpn_server` | `VPNServer.stop`              | `()`                     | `None`           | N/A                       | Triggers graceful teardown of all subsystems    | `logger`, `monitor`, `session`, `security`                             |

### `server.auth`

Secure credential and rate-limit management.

| Module        | Name                           | Signature                 | Returns | Raises                                            | Purpose                                         | Dependencies |
| ------------- | ------------------------------ | ------------------------- | ------- | ------------------------------------------------- | ----------------------------------------------- | ------------ |
| `server.auth` | `AuthManager`                  | `(db_path, max_attempts)` | N/A     | N/A                                               | Managed PBKDF2 hashing and brute-force tracking | `exceptions` |
| `server.auth` | `AuthManager.authenticate`     | `(user, pass, ip)`        | `bool`  | `TooManyAttemptsError`, `InvalidCredentialsError` | Validates credentials with timing-safe checks   | `exceptions` |
| `server.auth` | `AuthManager.register_user`    | `(user, pass)`            | `None`  | `ValueError`                                      | Securely provisions new users to the datastore  | None         |
| `server.auth` | `AuthManager.rate_limit_check` | `(client_ip)`             | `None`  | `TooManyAttemptsError`                            | Protects server from distributed brute force    | `exceptions` |

### `server.tunnel`

The high-performance data plane.

| Module          | Name                      | Signature                    | Returns | Raises                                  | Purpose                                    | Dependencies                      |
| --------------- | ------------------------- | ---------------------------- | ------- | --------------------------------------- | ------------------------------------------ | --------------------------------- |
| `server.tunnel` | `TunnelRelay`             | `(session, host, port, ...)` | N/A     | N/A                                     | Bridges TLS client to internal TCP service | `session`, `logger`               |
| `server.tunnel` | `TunnelRelay.connect`     | `()`                         | `None`  | `ConnectionRefusedError`, `TunnelError` | Establishes upstream leg of the tunnel     | `logger`, `exceptions`            |
| `server.tunnel` | `TunnelRelay.start_relay` | `()`                         | `None`  | `ForwardingError`                       | Blocks in a bidirectional read/write loop  | `logger`, `session`, `exceptions` |

### `server.session`

Lifecycle tracking for active connections.

| Module           | Name                            | Signature                | Returns   | Raises         | Purpose                                       | Dependencies           |
| ---------------- | ------------------------------- | ------------------------ | --------- | -------------- | --------------------------------------------- | ---------------------- |
| `server.session` | `Session`                       | `dataclass`              | N/A       | N/A            | Holds socket, IP, and byte-accounting state   | None                   |
| `server.session` | `SessionManager`                | `(max_clients, timeout)` | N/A       | N/A            | Tracks all active tunnels; runs reaper thread | `logger`               |
| `server.session` | `SessionManager.create_session` | `(ip, port, tls_socket)` | `Session` | `SessionError` | Registers a new pre-auth connection           | `logger`, `exceptions` |

### `server.security`

Low-level firewalling.

| Module            | Name                        | Signature                | Returns | Raises | Purpose                                     | Dependencies |
| ----------------- | --------------------------- | ------------------------ | ------- | ------ | ------------------------------------------- | ------------ |
| `server.security` | `SecurityPolicy`            | `()`                     | N/A     | N/A    | Manages IP-level blocklists (manual & auto) | `logger`     |
| `server.security` | `SecurityPolicy.block_ip`   | `(ip, reason, duration)` | `None`  | N/A    | Bans a hostile IP address                   | `logger`     |
| `server.security` | `SecurityPolicy.is_blocked` | `(ip)`                   | `bool`  | N/A    | Fast-path check called in `_accept_loop`    | None         |

---

## Client Modules

### `client.vpn_client`

Client orchestrator.

| Module              | Name                          | Signature             | Returns         | Raises                                 | Purpose                                             | Dependencies             |
| ------------------- | ----------------------------- | --------------------- | --------------- | -------------------------------------- | --------------------------------------------------- | ------------------------ |
| `client.vpn_client` | `VPNClient`                   | `(config)`            | N/A             | N/A                                    | High-level CLI wrapper for the VPN connection       | `config`, `forwarder`    |
| `client.vpn_client` | `VPNClient.connect_to_server` | `()`                  | `ssl.SSLSocket` | `TunnelError`                          | Handshakes TLS with certificate verification        | `config`                 |
| `client.vpn_client` | `VPNClient.authenticate`      | `(sock, user, pass)`  | `str`           | `AuthenticationError`, `ProtocolError` | Performs the application-layer auth exchange        | `protocol`, `exceptions` |
| `client.vpn_client` | `VPNClient.run`               | `(target, port, ...)` | `None`          | `Exception`                            | Orchestrates the full connection and auth lifecycle | `forwarder`              |

### `client.forwarder`

Local application gateway.

| Module             | Name                   | Signature           | Returns | Raises            | Purpose                                        | Dependencies             |
| ------------------ | ---------------------- | ------------------- | ------- | ----------------- | ---------------------------------------------- | ------------------------ |
| `client.forwarder` | `LocalForwarder`       | `(host, port, buf)` | N/A     | N/A               | Listens on localhost to capture app traffic    | `protocol`, `exceptions` |
| `client.forwarder` | `LocalForwarder.start` | `(vpn_socket)`      | `None`  | `ForwardingError` | Bridges the first app connection to the tunnel | `protocol`, `exceptions` |

---

## Backend Management Tier

### `app.services.vpn_user_sync_service`

Synchronization bridge between SQL and JSON user stores.

| Module                               | Name                        | Signature                | Returns | Raises | Purpose                                        | Dependencies |
| ------------------------------------ | --------------------------- | ------------------------ | ------- | ------ | ---------------------------------------------- | ------------ |
| `app.services.vpn_user_sync_service` | `sync_user_to_vpn`          | `(username, password)`   | `None`  | N/A    | Hashes password and updates `server_users.json` | `config`     |
| `app.services.vpn_user_sync_service` | `remove_user_from_vpn`      | `(username)`             | `None`  | N/A    | Removes user entry from `server_users.json`     | `config`     |

### `app.routes.vpn_events`

Real-time session event handlers.

| Module                   | Name               | Signature        | Returns | Raises | Purpose                                | Dependencies |
| ------------------------ | ------------------ | ---------------- | ------- | ------ | -------------------------------------- | ------------ |
| `app.routes.vpn_events`  | `notify_vpn_event` | `(event: Event)` | `JSON`  | N/A    | Receives and logs START/STOP notifications | `models`, `db` |

# Threat Model: Custom SSL/TLS VPN

This document outlines the security posture of the application-layer VPN, identifying what is being protected, who might attack it, where they might attack, and how the system defends itself.

## 1. Assets (What We Protect)

- **User Credentials:** The plaintext passwords used by clients to authenticate with the server.
- **Session Tokens:** The `session_id` (UUID4) assigned to approved connections, allowing them to tunnel traffic.
- **Tunneled Data:** The raw byte streams of application data (e.g., HTTP headers, payloads, database queries) passing through the VPN.
- **Internal Network Access:** The trusted network segment behind the VPN server where the target services reside.
- **Server Availability:** The ability of the VPN server to accept and process legitimate client connections without being exhausted.

## 2. Threat Actors

- **Script Kiddie / Botnet:** Automated scanners looking for open ports, attempting brute-force logins, or sending garbage data to crash services.
- **MITM (Man-in-the-Middle) Attacker:** An adversary positioned on the network path between the VPN client and server (e.g., a malicious Wi-Fi hotspot acting as a router) attempting to eavesdrop or tamper.
- **Credential Stuffer:** An attacker using lists of compromised usernames and passwords from other breaches to try and gain unauthorized access.

## 3. Attack Surfaces

- **TCP Listener Port (e.g., 8443):** The publicly reachable network port accepting incoming connections before TLS is negotiated.
- **TLS Handshake:** The cryptographic negotiation phase where certificates are exchanged and cipher suites are selected.
- **Authentication Flow:** The custom `AUTH` message protocol where users present their username and password.
- **Tunnel Data Relay:** The bidirectional payload forwarding logic (`DATA` messages) processing untrusted bytes.

## 4. Threat Analysis and Mitigations

| Attack Vector                       | Likelihood | Impact                    | Mitigation Implemented                                                                                                                                               |
| ----------------------------------- | ---------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Brute Force Authentication**      | High       | High (Network Compromise) | Rate-limiting tracks failures per IP. IPs are locked out for 5 minutes after 3 consecutive failures. Passwords are hashed using PBKDF2-HMAC (100k iterations).       |
| **Distributed Brute Force**         | Medium     | High (Network Compromise) | Global rate limiter triggers after 100 total failures in a short window across _all_ IPs, stopping wide-net distributed attacks.                                     |
| **Eavesdropping (Packet Sniffing)** | High       | High (Data Breach)        | End-to-End TLSv1.2+ encryption using Perfect Forward Secrecy (`OP_SINGLE_DH_USE`, `OP_SINGLE_ECDH_USE`). Raw data cannot be decrypted from packet captures.          |
| **Man-in-the-Middle (MITM)**        | Medium     | High (Data / Auth Breach) | The Client strictly verifies the Server's certificate against a pinned Root CA (`ssl.CERT_REQUIRED`) and checks the hostname matching.                               |
| **Timing Attacks on Auth**          | Low        | Medium (User Enumeration) | `AuthManager` uses `hmac.compare_digest()` for constant-time comparisons. Dummy hashes are calculated for non-existent users to equalize response times.             |
| **Denial of Service (DoS)**         | High       | Medium (Downtime)         | A `SecurityPolicy` blocklist drops repeat offenders _before_ the expensive TLS handshake. `MAX_CLIENTS` strictly caps memory usage to prevent Out-Of-Memory crashes. |
| **Stale Session Hijacking**         | Low        | High (Network Compromise) | Background reaper threads violently expire sessions idle for more than the configured timeout (e.g., 3600 seconds), closing their sockets.                           |
| **Database Corruption**             | Low        | Medium (Loss of Auth)     | The credential JSON store is written atomically (temp file + `os.replace`) to prevent file corruption during power loss.                                             |

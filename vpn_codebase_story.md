# Custom SSL/TLS VPN — Codebase Story (Execution Flow)

> A chronological narrative of every major function call, from startup to teardown.
> Use this as the basis for your **System Architecture**, **Sequence**, and **Use Case** diagrams.

---

## 📁 Codebase Map (Quick Reference)

```
_custom_ssl_vpn/
├── gen_certs.py              ← Run once: generate CA + TLS certificates
├── shared/
│   ├── protocol.py           ← Wire format (encode/decode binary frames)
│   └── exceptions.py         ← Typed error hierarchy
├── server/
│   ├── config.py             ← Immutable ServerConfig dataclass
│   ├── auth.py               ← AuthManager (PBKDF2, rate-limiting)
│   ├── session.py            ← Session + SessionManager (lifecycle, reaper)
│   ├── tunnel.py             ← TunnelRelay (bidirectional data forwarding)
│   ├── logger.py             ← Structured JSON logger (VPNLogger)
│   ├── security.py           ← SecurityPolicy (IP block list)
│   ├── monitor.py            ← MonitoringDashboard (HTTP telemetry)
│   ├── notifier.py           ← VPNPushNotifier (pushes events to backend)
│   └── vpn_server.py         ← VPNServer orchestrator + main() CLI entry
└── client/
    ├── config.py             ← Immutable ClientConfig dataclass
    ├── forwarder.py          ← LocalForwarder (local port → VPN tunnel)
    └── vpn_client.py         ← VPNClient orchestrator + main() CLI entry
```

---

## ⚙️ Part 0 — Before Anyone Runs Anything: Certificates ([gen_certs.py](file:///g:/Studies/7th_sem/project_report/vpn_prototype_v3_AG/_custom_ssl_vpn/gen_certs.py))

**This is the pre-requisite. Run once.**

| Step | What Happens                                                                                                                                  |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | [gen_certs.py](file:///g:/Studies/7th_sem/project_report/vpn_prototype_v3_AG/_custom_ssl_vpn/gen_certs.py) uses Python `cryptography` library |
| 2    | Generates a **CA (Certificate Authority) private key** (RSA 2048-bit)                                                                         |
| 3    | Creates a **self-signed CA certificate** (`Custom VPN Demo CA`) valid 10 years                                                                |
| 4    | Generates a **server private key** (RSA 2048-bit)                                                                                             |
| 5    | Creates a **server certificate** signed by the CA, with SAN for `127.0.0.1` / `localhost`                                                     |
| 6    | Writes: `server/certs/server.crt`, `server/certs/server.key`, `client/certs/ca.crt`                                                           |

> **Diagram hint**: This is a "Certificate Authority Lifecycle" use case — pre-conditions for all TLS connections.

---

## 🖥️ Part 1 — The Server Boots Up (`vpn_server.py → main()`)

**Real-life analogy**: The VPN company opens its office and turns on the front door.

```
main()
 └─ load_config("server/config.json")         → ServerConfig (frozen dataclass)
     Fields: HOST=0.0.0.0, PORT=8443, MAX_CLIENTS=50,
             AUTH_TIMEOUT=10s, SESSION_TIMEOUT=3600s, BUFFER_SIZE=4096 ...

 └─ setup_logger(...)                          → VPNLogger starts writing JSON logs

 └─ VPNServer(config).__init__()
     ├─ AuthManager(max_attempts=3)            → loads/creates server_users.json
     ├─ SessionManager(max_clients, timeout)   → starts background SessionReaper thread
     ├─ SecurityPolicy()                        → IP blocklist manager
     └─ MonitoringDashboard(port=9999)          → HTTP telemetry endpoint

 └─ signal.signal(SIGINT, signal_handler)      → Ctrl+C = graceful shutdown

 └─ server.start()
     ├─ setup_tls_context()                    → builds hardened SSLContext
     │    ├─ ssl.PROTOCOL_TLS_SERVER
     │    ├─ minimum_version = TLSv1.2
     │    ├─ flags: NO_SSLv2/SSLv3/TLSv1/TLSv1.1 + Perfect Forward Secrecy
     │    ├─ set_ciphers("HIGH:!aNULL:!MD5:!RC4")
     │    └─ load_cert_chain(server.crt, server.key)
     │
     ├─ server_socket.bind(0.0.0.0:8443)
     ├─ server_socket.listen(50)
     ├─ monitor.start()                         → opens monitoring on port 9999
     └─ _accept_loop(context)                   → 🔄 LOOPS FOREVER, waiting for clients
```

> **Diagram hint**: `VPNServer.__init__` is your **System Initialization** use case. All 4 components initialized here should appear as sub-systems in your architecture diagram.

---

## 👤 Part 2 — The Client Starts (`vpn_client.py → main()`)

**Real-life analogy**: A remote employee opens the VPN app on their laptop.

```
main()
 └─ argparse: --target-host 127.0.0.1 --target-port 8080 --username alice

 └─ load_config("client/config.json")     → ClientConfig
     Fields: SERVER_HOST=127.0.0.1, SERVER_PORT=8443,
             CA_CERT_PATH=client/certs/ca.crt,
             LOCAL_LISTEN_HOST=127.0.0.1, LOCAL_LISTEN_PORT=9000

 └─ VPNClient(config).__init__()
     └─ (sets up Python logger, stores config)

 └─ signal handlers registered (SIGINT = graceful stop)

 └─ client.run(target_host, target_port, username, password, persistent=True)
     ├─ prompts "VPN Username:" + getpass("VPN Password:")
     ├─ connect_to_server()                  → Step 3 ↓
     └─ authenticate(tls_sock, user, pass)   → Step 4 ↓
```

---

## 🔐 Part 3 — TLS Handshake: Client Connects to Server

**Real-life analogy**: The employee's laptop "proves" it's talking to the real office, and the office locks the communication channel.

### Client Side (`VPNClient.connect_to_server()`)

```
ssl.create_default_context(Purpose.SERVER_AUTH)   → forces certificate verification
context.load_verify_locations(ca.crt)             → trust only our custom CA
socket.create_connection(127.0.0.1:8443)          → TCP connect
context.wrap_socket(raw_socket, server_hostname)  → TLS handshake
  └─ verifies server.crt is signed by ca.crt ✓
  └─ verifies SAN matches hostname ✓
→ returns ssl.SSLSocket (encrypted channel established)
```

### Server Side (`VPNServer._accept_loop()` notices a new connection)

```
_accept_loop():
 └─ raw_socket, addr = server_socket.accept()    → a client knocked
 └─ security_policy.is_blocked(client_ip)?       → check IP blocklist first
     ├─ YES → close raw socket, continue (no TLS cost)
     └─ NO  → spawn new daemon thread → _handle_client(raw_socket, addr, context)

_handle_client() [runs in its OWN THREAD]:
 └─ context.wrap_socket(raw_socket, server_side=True)  → server completes TLS handshake
 └─ tls_socket.settimeout(AUTH_TIMEOUT=10s)             → client has 10 sec to auth
 └─ session_manager.create_session(ip, port, tls_socket)
     └─ checks capacity ≤ MAX_CLIENTS
     └─ generates UUID-4 session_id
     └─ creates Session(session_id, ip, port, created_at, last_active) → pre-auth state
```

> **Diagram hint**: This is your **"Establish Secure Connection"** use case. The TLS handshake is the key sequence here. The SecurityPolicy check happens _before_ TLS — highlight that.

---

## 🔑 Part 4 — Application-Layer Authentication

**Real-life analogy**: Even though the secure channel is open, the employee still has to show their ID badge.

### Client sends AUTH message (`VPNClient.authenticate()`)

```
payload = json.dumps({"username": "alice", "password": "mypassword"})

auth_msg = VPNMessage(command="AUTH", payload=payload.encode())
wire_bytes = encode_message(auth_msg)
  → [4-byte total_length][1-byte 0x01=AUTH][36-byte null session_id][JSON payload]

tls_socket.sendall(wire_bytes)   → encrypted by TLS, sent to server
```

### Server receives and validates ([\_handle_client()](file:///g:/Studies/7th_sem/project_report/vpn_prototype_v3_AG/_custom_ssl_vpn/server/vpn_server.py#277-516) continued)

```
buffer = tls_socket.recv(4096)
msg = decode_message(buffer)           → parse binary frame → VPNMessage

if msg.command != "AUTH" → raise AuthenticationError

auth_payload = json.loads(msg.payload)  →  {"username": "alice", "password": "mypassword"}

AuthManager.authenticate("alice", "mypassword", "127.0.0.1"):
 ├─ rate_limit_check(client_ip):
 │    ├─ is_locked_out(ip)?  → check _attempts[ip].locked_until > now → TooManyAttemptsError
 │    └─ global failure count > 100 in 60s? → TooManyAttemptsError
 │
 ├─ _validate_input_formats():
 │    ├─ len(username) ≤ 64, len(password) ≤ 256
 │    ├─ username: 3-32 chars, regex [\\w\\.\\-]+
 │    ├─ password: 8-128 chars, no null bytes
 │    └─ FAIL → record_failure(ip) → InvalidCredentialsError
 │
 ├─ _load_users():  → reads server_users.json
 │    returns {"alice": {"hash": "deadbeef...", "salt": "cafebabe..."}}
 │
 ├─ if user NOT FOUND:
 │    → compute dummy PBKDF2 hash (timing equalization, prevents username enumeration)
 │    → record_failure → InvalidCredentialsError
 │
 ├─ stored_salt = bytes.fromhex(record["salt"])
 ├─ stored_hash = bytes.fromhex(record["hash"])
 ├─ derived_hash = hashlib.pbkdf2_hmac("sha256", password.encode(), stored_salt, 100_000)
 └─ hmac.compare_digest(derived_hash, stored_hash):   ← TIMING-SAFE comparison
     ├─ MATCH → clear_failures(ip) → return user_id ✓
     └─ NO MATCH → record_failure(ip) → InvalidCredentialsError

session_manager.authenticate_session(session_id, "alice"):
 └─ session.username = "alice"
 └─ session.is_authenticated = True
 └─ session.last_active = now()
 └─ notifier.notify(session, "START")   → push event to backend API

# Server sends OK back
tls_socket.sendall(encode_message(VPNMessage(
    command="OK", payload=b"Authenticated.", session_id="uuid-xyz"
)))
```

### Client receives OK ([authenticate()](file:///g:/Studies/7th_sem/project_report/vpn_prototype_v3_AG/_custom_ssl_vpn/client/vpn_client.py#106-150) continued)

```
response = decode_message(buffer)
if response.command == "ERROR" → raise AuthenticationError
if response.command == "OK"   → return response.session_id  ("uuid-xyz") ✓

# Client immediately overwrites password in memory
password = "x" * len(password)
del password
```

> **Diagram hint**: This is your **"User Authentication"** use case. The `AuthManager.authenticate()` sequence with PBKDF2 + `hmac.compare_digest` is the core security mechanism. Show [record_failure](file:///g:/Studies/7th_sem/project_report/vpn_prototype_v3_AG/_custom_ssl_vpn/server/auth.py#168-193) → lockout in your auth failure sequence diagram.

---

## 🌐 Part 5 — Setting Up the Local Proxy & Requesting a Tunnel

**Real-life analogy**: The employee's VPN app opens a local door (port 9000) on their machine — any app can now go through that door to reach the internal server.

### Client side (`VPNClient.run()` continued)

```
LocalForwarder(
    listen_host="127.0.0.1", listen_port=9000,
    target_host="127.0.0.1", target_port=8080,
    session_id="uuid-xyz",
    buffer_size=4096,
    persistent=True
)

forwarder.start(tls_socket):
 └─ server_socket.bind(127.0.0.1:9000)   → local "door" opened
 └─ server_socket.listen(5)
 └─ print("VPN tunnel ready. Connect to: 127.0.0.1:9000")
 └─ _accept_loop()                        → waiting for a local app to connect
```

### When a local app connects (e.g., browser to 127.0.0.1:9000)

```
_accept_loop():
 └─ local_socket, addr = server_socket.accept()   → browser connected!
 └─ _open_remote_tunnel():
     ├─ connect_msg = VPNMessage("CONNECT", {"host":"127.0.0.1","port":8080}, session_id)
     ├─ vpn_socket.sendall(encode_message(connect_msg))   → sent over TLS to server
     └─ waits for server OK...
```

### Server receives CONNECT ([\_handle_client()](file:///g:/Studies/7th_sem/project_report/vpn_prototype_v3_AG/_custom_ssl_vpn/server/vpn_server.py#277-516) persistent loop)

```
next_msg = decode_message(buffer)
# command == "CONNECT"

target_data = json.loads(next_msg.payload)
target_host = "127.0.0.1", target_port = 8080

# PERMISSION CHECK via Backend API (IPC)
urllib.request.urlopen(
    "http://localhost:8000/api/services/verify?username=alice&target_host=127.0.0.1&target_port=8080"
)
 ├─ 200 OK → allowed ✓
 ├─ 403    → raise TunnelError("Access Denied") → send ERROR to client
 └─ URLError (backend down) → fail-closed → raise TunnelError

# If allowed:
relay = TunnelRelay(session, "127.0.0.1", 8080, buffer_size=4096, session_manager)
relay.connect():
 └─ internal_socket = socket.connect(127.0.0.1:8080)   → plain TCP to internal service
 └─ log TunnelOpen event

# Acknowledge to client
tls_socket.sendall(encode_message(VPNMessage("OK", b"Tunnel ready.", session_id)))
```

### Client receives tunnel OK

```
_open_remote_tunnel():
 └─ response.command == "OK" → ✓ tunnel is open
 └─ _run_relay(local_socket, vpn_socket) → Step 6 ↓
```

> **Diagram hint**: The [\_open_remote_tunnel()](file:///g:/Studies/7th_sem/project_report/vpn_prototype_v3_AG/_custom_ssl_vpn/client/forwarder.py#361-383) + backend `/services/verify` sequence is your **"Permission Check / Access Control"** use case. This is critical for your architecture.

---

## 📡 Part 6 — Bidirectional Data Relay (The VPN "In Action")

**Real-life analogy**: Data flows like water through two pipes — one from your laptop to the office server, one back.

### The two relay loops run simultaneously via `select.select`

```
CLIENT SIDE: forwarder._run_relay(local_socket, vpn_socket)
SERVER SIDE: relay.start_relay()   [runs in same _handle_client thread, blocking]

Both use select.select([socket_A, socket_B], timeout=1.0s)
```

#### Upload path (browser → internal server):

```
LOCAL APP                   CLIENT (forwarder)              VPN SERVER (tunnel)         INTERNAL SVC
    |                            |                                |                          |
    |── HTTP GET /index ────────►|                                |                          |
    |                            | data = local_sock.recv(4096)   |                          |
    |                            | msg = VPNMessage("DATA", data) |                          |
    |                            | encode_message(msg) ──────────►|                          |
    |                            |                  [TLS encrypted]|                          |
    |                            |                                | decode_message(raw)      |
    |                            |                                | if DATA: send payload ──►|
    |                            |                                | bytes_up += len(payload)  |
    |                            |                                | session_manager.touch()   |
```

#### Download path (internal server → browser):

```
INTERNAL SVC                VPN SERVER (tunnel)              CLIENT (forwarder)          LOCAL APP
    |                            |                                |                          |
    |── HTTP 200 OK ────────────►|                                |                          |
    |                            | data = internal_sock.recv(4096)|                          |
    |                            | msg = VPNMessage("DATA", data) |                          |
    |                            | encode_message(msg) ──────────►|                          |
    |                            |                  [TLS encrypted]|                          |
    |                            |                                | decode_message(raw)      |
    |                            |                                | if DATA: send payload ──►|
    |                            |                                | bytes_down += len(data)   |
```

> **Key functions in the relay loop:**
>
> - [\_recv_exactly(sock, n)](file:///g:/Studies/7th_sem/project_report/vpn_prototype_v3_AG/_custom_ssl_vpn/client/forwarder.py#330-351) — reads exact bytes (handles partial TCP reads)
> - [\_send_all(sock, data)](file:///g:/Studies/7th_sem/project_report/vpn_prototype_v3_AG/_custom_ssl_vpn/client/forwarder.py#316-329) — sends all bytes (handles partial writes)
> - `session_manager.touch_session(session_id)` — resets idle timer on every packet

---

## 💓 Part 7 — KEEPALIVE (Persistent Session Heartbeat)

If the session is idle (no data), the client can send a heartbeat:

```
CLIENT sends:  VPNMessage("KEEPALIVE", b"", session_id)

SERVER receives in persistent loop:
 └─ msg.command == "KEEPALIVE"
 └─ session_manager.touch_session(session_id)   → reset idle timer
 └─ send VPNMessage("OK", b"KEEPALIVE_ACK", session_id)
```

---

## 🔂 Part 8 — Persistent Sessions (Multi-Connection Reuse)

In `persistent=True` mode, after one connection finishes:

```
CLIENT:
 └─ local app disconnects → send DATA(payload=b"") as EOF signal
 └─ relay_active = False (not self._running)   → relay loop exits
 └─ _close_local_socket()                       → cleanup app socket
 └─ back to _accept_loop()                      → wait for NEXT connection
 └─ when next app connects → _open_remote_tunnel() sends new CONNECT to server

SERVER:
 └─ TunnelRelay loop receives DATA(b"") EOF → _running = False → relay ends
 └─ _cleanup() closes internal_socket (NOT tls_socket!)
 └─ returns to _handle_client() persistent loop
 └─ waits for next CONNECT from client
```

> This is a critical architectural feature — **one TLS session = many app connections** without re-authentication.

---

## 🔒 Part 9 — Background: Session Reaper Thread

Runs forever in the background, every 60 seconds:

```
SessionManager._expiry_loop() [daemon thread]:
 └─ time.sleep(60)
 └─ for each session:
     └─ session.is_expired(SESSION_TIMEOUT=3600s)?
         └─ YES:
             ├─ pop from _sessions dict
             ├─ _close_socket(session)          → TLS socket closed
             ├─ log_disconnect(session_id, "timeout")
             └─ notifier.notify(session, "STOP") → push to backend
```

---

## 🚪 Part 10 — Graceful Teardown (DISCONNECT)

### Normal Client-Initiated Disconnect

```
CLIENT (user presses Ctrl+C → signal_handler → client.stop()):
 └─ forwarder.stop()        → _running = False
 └─ VPN sends VPNMessage("DISCONNECT", b"", session_id)
 └─ tls_socket.shutdown() + close()

SERVER receives DISCONNECT in persistent loop:
 └─ msg.command == "DISCONNECT"
 └─ send VPNMessage("OK", b"Session terminated.", session_id)
 └─ break from persistent loop
 └─ finally block:
     ├─ session_manager.remove_session(session_id)
     │    ├─ _close_socket(session)
     │    ├─ log_disconnect
     │    └─ notifier.notify(session, "STOP")  → backend notified
     └─ tls_socket.shutdown() + close()
```

### Server-Initiated Shutdown (SIGTERM/SIGINT)

```
signal_handler → server.stop():
 └─ _running = False
 └─ monitor.stop()
 └─ server_socket.shutdown() + close()
 └─ session_manager.shutdown():
     └─ _running = False
     └─ force_expire_all():
         └─ for each session: _close_socket(session)
         └─ _sessions.clear()
     └─ reaper_thread.join(timeout=1.0)
 └─ security_policy.shutdown()
 └─ join all client threads (1s timeout each)
```

---

## 📊 Background Subsystems (Always Running)

| Component             | What it does                                           | Thread Model                                                                                                                               |
| --------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `SessionReaper`       | Expires idle sessions every 60s                        | Daemon thread in [SessionManager](file:///g:/Studies/7th_sem/project_report/vpn_prototype_v3_AG/_custom_ssl_vpn/server/session.py#124-379) |
| `MonitoringDashboard` | HTTP endpoint on :9999, shows active sessions, metrics | Daemon thread via `monitor.start()`                                                                                                        |
| `VPNPushNotifier`     | Pushes START/STOP session events to backend REST API   | Called synchronously inside locks                                                                                                          |
| `SecurityPolicy`      | Checks/updates IP blocklist before TLS wrap            | In-memory, thread-safe                                                                                                                     |
| `VPNLogger`           | JSON structured log every event to file                | Thread-safe via Python logging                                                                                                             |

---

## 🗺️ Complete Execution Timeline (Summary)

```
[Server]  gen_certs.py → certificates created
[Server]  main() → config loaded → VPNServer init → TLS context → bind:8443 → accept_loop

[Client]  main() → config loaded → VPNClient init → user inputs credentials

[Network] TCP connect → TLS handshake (cert verified by CA)
[Server]  New thread spawned → create_session() [pre-auth]

[Protocol] Client: encode AUTH → Server: decode AUTH
[Server]  AuthManager.authenticate() [PBKDF2 verify, rate-limit check]
[Server]  authenticate_session() → notifier.notify "START" → send OK + session_id

[Client]  decode OK → overwrite password memory
[Client]  LocalForwarder.start() → bind local:9000

[App]     browser/app connects to 127.0.0.1:9000
[Client]  _open_remote_tunnel() → encode CONNECT → send over TLS

[Server]  decode CONNECT → backend permission check → TunnelRelay.connect()
[Server]  TCP connect to internal service → send OK

[Client]  decode OK → _run_relay() starts
[Server]  relay.start_relay() starts

[Relay]   DATA messages flow bidirectionally (framed binary protocol over TLS)
[Session] touch_session() called on every packet

[Persistent] app disconnects → EOF signal → relay stops → new connection accepted
[Heartbeat]  KEEPALIVE → touch_session → OK

[Teardown] DISCONNECT → session removed → notifier "STOP" → sockets closed
[Reaper]   Idle sessions expired every 60s in background
```

---

## 🧩 Use Case Summary (for your UML)

| #    | Use Case                    | Actor               | Key Classes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ---- | --------------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UC1  | Generate TLS Certificates   | Admin               | [gen_certs.py](file:///g:/Studies/7th_sem/project_report/vpn_prototype_v3_AG/_custom_ssl_vpn/gen_certs.py)                                                                                                                                                                                                                                                                                                                                                                                   |
| UC2  | Start VPN Server            | Admin               | [VPNServer](file:///g:/Studies/7th_sem/project_report/vpn_prototype_v3_AG/_custom_ssl_vpn/server/vpn_server.py#57-576), [ServerConfig](file:///g:/Studies/7th_sem/project_report/vpn_prototype_v3_AG/_custom_ssl_vpn/server/config.py#26-131), [AuthManager](file:///g:/Studies/7th_sem/project_report/vpn_prototype_v3_AG/_custom_ssl_vpn/server/auth.py#61-380), [SessionManager](file:///g:/Studies/7th_sem/project_report/vpn_prototype_v3_AG/_custom_ssl_vpn/server/session.py#124-379) |
| UC3  | Connect Client to Server    | VPN Client          | [VPNClient](file:///g:/Studies/7th_sem/project_report/vpn_prototype_v3_AG/_custom_ssl_vpn/client/vpn_client.py#39-236), [ClientConfig](file:///g:/Studies/7th_sem/project_report/vpn_prototype_v3_AG/_custom_ssl_vpn/client/config.py#24-109), `ssl.SSLContext`                                                                                                                                                                                                                              |
| UC4  | Authenticate User           | VPN Client          | `VPNClient.authenticate()`, `AuthManager.authenticate()`                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| UC5  | Rate Limit Brute-Force      | System              | `AuthManager.rate_limit_check()`, [record_failure()](file:///g:/Studies/7th_sem/project_report/vpn_prototype_v3_AG/_custom_ssl_vpn/server/auth.py#168-193)                                                                                                                                                                                                                                                                                                                                   |
| UC6  | Manage VPN Session          | System              | [SessionManager](file:///g:/Studies/7th_sem/project_report/vpn_prototype_v3_AG/_custom_ssl_vpn/server/session.py#124-379), [Session](file:///g:/Studies/7th_sem/project_report/vpn_prototype_v3_AG/_custom_ssl_vpn/server/session.py#35-98)                                                                                                                                                                                                                                                  |
| UC7  | Request Tunnel to Service   | VPN Client          | `LocalForwarder._open_remote_tunnel()`, `VPNServer._handle_client()`                                                                                                                                                                                                                                                                                                                                                                                                                         |
| UC8  | Check Service Permission    | System              | [vpn_server.py](file:///g:/Studies/7th_sem/project_report/vpn_prototype_v3_AG/_custom_ssl_vpn/server/vpn_server.py) → Backend `/api/services/verify`                                                                                                                                                                                                                                                                                                                                         |
| UC9  | Relay Encrypted Traffic     | VPN Client + Server | `TunnelRelay.start_relay()`, `LocalForwarder._run_relay()`                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| UC10 | Maintain Persistent Session | VPN Client          | `LocalForwarder._accept_loop()`, KEEPALIVE handling                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| UC11 | Expire Idle Sessions        | System (background) | `SessionManager._expiry_loop()`                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| UC12 | Graceful Disconnect         | VPN Client          | `DISCONNECT` command, [remove_session()](file:///g:/Studies/7th_sem/project_report/vpn_prototype_v3_AG/_custom_ssl_vpn/server/session.py#263-278), `notifier.notify("STOP")`                                                                                                                                                                                                                                                                                                                 |
| UC13 | Monitor Active Sessions     | Admin               | `MonitoringDashboard` (port 9999)                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| UC14 | Register VPN User           | Admin               | `AuthManager.register_user()` (CLI tool)                                                                                                                                                                                                                                                                                                                                                                                                                                                     |

## Extra info

Let me be completely honest with you. I've read the full codebase and I know exactly what you're working with.

---

### 🔍 Brutal Truth: What You Actually Built

Your VPN is **not** a network-layer VPN (like OpenVPN/WireGuard). It's an **application-layer TCP proxy tunnel over custom TLS**. The honest name is:

> **"Application-Layer VPN Proxy with Per-Service Access Control"**

---

### ⚠️ The Real Limitation You Identified

You're 100% correct. Your server can only relay to services **reachable from the server machine itself**. This means:

```
[Client] ──TLS──► [VPN Server] ──plain TCP──► [Internal Service on SAME machine or LAN]
```

This is the same as **SSH local port forwarding** (`ssh -L 9000:localhost:8080 user@server`). Brutal but true.

---

### 🔪 "Commercial tools already do this" — The Examiner's Attack

| What they'll say               | Reality                                         |
| ------------------------------ | ----------------------------------------------- |
| "SSH -L does port forwarding"  | ✅ Yes, 1 command                               |
| "Ngrok does tunneling"         | ✅ Yes, free tier even                          |
| "Stunnel does TLS wrapping"    | ✅ Yes                                          |
| "SOCKS5 proxies exist"         | ✅ Yes                                          |
| "OpenVPN/WireGuard are better" | ✅ Completely different scope (OS kernel layer) |

**You cannot win a "feature comparison" fight. Don't try.**

---

### 🛡️ How You ACTUALLY Win the Defense

Your differentiator is **NOT the tunnel**. It's everything around it:

#### What OpenVPN/WireGuard/SSH do NOT have:

- ❌ Per-user, per-service access control (who can reach what port)
- ❌ Centralized session audit logs with IP, timestamps, bytes transferred
- ❌ Rate-limited brute force protection with lockout windows
- ❌ Real-time session monitoring dashboard
- ❌ Backend management API (create users, assign services, revoke access)
- ❌ Push notifications to a management plane on session start/stop
- ❌ Frontend admin panel for all of the above

**This is exactly what enterprise "Zero Trust Network Access" (ZTNA) looks like.** Cloudflare Access, Zscaler ZPA, and Microsoft Azure Application Proxy sell this as SaaS for thousands of dollars. Your project is a from-scratch academic implementation of the same concept.

---

### 🎯 Your Pitch for Defense

> _"Commercial VPNs like OpenVPN operate at the network layer and create a full virtual NIC — they give authenticated users blanket network access. Our system operates at the application layer with granular, policy-based access control per service, per user, with full audit trails. This maps to the Zero Trust security model — authenticate, then authorize every connection, log everything. We implemented the custom binary protocol, TLS stack hardening, session management, and management plane from scratch."_

---

### 🖥️ Demo Options — Realistic Assessment

#### Option 1: Local-only (Simplest, Safest for Defense)

Run **everything on one laptop**:

- VPN Server on port 8443
- An echo server / simple webpage on port 8080
- Client connects to VPN → tunnels to the webpage

**Verdict**: Totally valid for a defense. The value demonstrated is the protocol + management system, not the network topology.

#### Option 2: Two devices on same WiFi (Better Visual)

- Your laptop = VPN Server
- Teammate's laptop = VPN Client connecting to your IP
- Shows real cross-device tunneling

**Verdict**: Best bang for effort. Works without ngrok/EC2. Just need your WiFi IP.

#### Option 3: EC2 (Most impressive, most risky)

- t2.micro free tier
- Run VPN server + a simple internal HTTP service on EC2
- Client connects from home → tunnels to EC2's internal service

**Verdict**: Great if you have time and nothing breaks. EC2 firewalls (Security Groups) can bite you during demo.

#### Option 4: Ngrok tunnel to your VPN server

- Run VPN server locally
- Ngrok TCP tunnel → `ngrok tcp 8443`
- Client uses the ngrok address

**Verdict**: Works but ngrok free tier has connection limits and random URLs that change on restart.

---

### 💡 My Recommendation

**For defense**: Demo with Option 2 (two devices, same WiFi). Emphasize the **management plane** — show the admin frontend, show a user being denied access to a service they don't have permission for, show the audit logs capturing that event in real-time. **That's what's unique. That's what they can't say "SSH does this."**

Your project is strong. Just frame it correctly — you're not competing with OpenVPN, you're demonstrating ZTNA principles with a from-scratch implementation.

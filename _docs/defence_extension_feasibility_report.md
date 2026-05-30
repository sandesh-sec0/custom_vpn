# Final Defence Feasibility Report
### Custom SSL VPN · April 2026

---

## Executive Summary

Your project is in **very strong shape** for defence. The three-tier architecture (React Frontend → FastAPI Backend → Pure-Python VPN Core) is complete, documented, and working. The supervisor's three requirements are all **achievable**, but they vary significantly in difficulty and risk. This report gives you a realistic picture of each.

| Requirement | Difficulty | Timeline Estimate | Risk |
|---|---|---|---|
| 1. Custom AES/RSA Algorithm | 🟡 Medium | 1–2 days | Medium – don't break existing crypto |
| 2. Cross-Network Demo | 🟠 Medium-Hard | Half day | Low once setup is done |
| 3. Polished Demo Setup | 🟢 Low | 2–3 hours | Very Low |

---

## What You Already Have (The Good News)

Before looking at what's needed, here's what's already impressive:

- ✅ **Custom binary wire protocol** — your own framed protocol ([protocol.py](file:///g:/Studies/7th_sem/project_report/vpn_prototype_v3_AG/_custom_ssl_vpn/shared/protocol.py)) with `[length][cmd][session_id][payload]` format. This is already a custom implementation.
- ✅ **PBKDF2-HMAC-SHA256** password hashing with 100,000 iterations, timing-safe `hmac.compare_digest()`, dummy-hash timing equalization — this is textbook security.
- ✅ **TLS hardening** — `OP_NO_SSLv2/3/TLSv1/TLSv1.1` flags, Perfect Forward Secrecy.
- ✅ **RSA key generation** already used in [gen_certs.py](file:///g:/Studies/7th_sem/project_report/vpn_prototype_v3_AG/_custom_ssl_vpn/gen_certs.py) via the `cryptography` library (2048-bit RSA for CA + server certs).
- ✅ **IP-level security policy** — temporal and permanent blocklists with background sweeper thread.
- ✅ **Rate limiting** — per-IP brute-force lockout + global rate throttle.
- ✅ **Full management dashboard** — React SPA with JWT auth, session monitoring, user CRUD, analytics.
- ✅ **IPC bridge** — Backend ↔ VPN Server control socket for live stats and session termination.

---

## Requirement 1: Custom Algorithm Implementation (AES + RSA)

### Current State

Your project **already uses RSA** (in [gen_certs.py](file:///g:/Studies/7th_sem/project_report/vpn_prototype_v3_AG/_custom_ssl_vpn/gen_certs.py) via `cryptography.hazmat.primitives.asymmetric.rsa`) for certificate generation. The supervisor likely wants to see a **from-scratch implementation** of the algorithm logic itself, not just calling a library.

> [!IMPORTANT]
> **The key nuance:** You don't have to replace your production TLS. Instead, add a **"Custom Crypto Layer" as a demonstration module** that proves you understand the math behind it. Think of it as a "show your work" layer that sits alongside your real TLS.

### Recommended Strategy: Add a `custom_crypto/` Module

Create `_custom_ssl_vpn/custom_crypto/` with:

```
custom_crypto/
├── __init__.py
├── aes_impl.py      # Pure Python AES-128 (SubBytes, ShiftRows, MixColumns, AddRoundKey)
├── rsa_impl.py      # Pure Python RSA (key gen, encrypt, decrypt using math only)
└── demo_crypto.py   # A runnable demo script that shows both working
```

**AES From Scratch** (`aes_impl.py`):
- Implement the 4 core operations: SubBytes (S-Box), ShiftRows, MixColumns, AddRoundKey.
- 10-round key schedule for AES-128.
- ~250-300 lines of pure Python, no imports except `os` for random.
- You can demonstrate it by encrypting "Hello VPN" and decrypting it back.

**RSA From Scratch** (`rsa_impl.py`):
- Generate primes using Miller-Rabin primality test (you can implement this from scratch).
- Implement `e`, `d`, `n` key generation using Extended Euclidean Algorithm.
- Encrypt/decrypt using modular exponentiation (`pow(m, e, n)` — Python's built-in is fine here).
- ~150-200 lines.

**How to Present It:**
```
CUSTOM CRYPTO DEMO:
  RSA: Generates ephemeral 1024-bit key pair → encrypts session token → decrypts it ✓
  AES: Encrypts plaintext message with custom S-Box → decrypts back ✓
  TLS Layer: Uses industry RSA-2048 (via cryptography lib) for actual tunnel ✓
```

> [!NOTE]
> This is academically honest and actually stronger to present: "We implemented AES and RSA from first principles to prove understanding, then use the battle-tested `cryptography` library for the actual tunnel, because rolling your own crypto in production is a known anti-pattern."

### Complexity Warning

- **Don't implement AES-GCM from scratch** — mixing block ciphers with authenticated encryption modes is very error-prone.
- **Stick to AES-128 ECB for demo** (encrypt/decrypt a fixed block) — enough to show the algorithm.
- **RSA 1024-bit for demo** (real work uses 2048-bit) — 1024 generates faster during demo.

---

## Requirement 2: Cross-Network Demo Between Different Machines

### Current Blocker

Your [gen_certs.py](file:///g:/Studies/7th_sem/project_report/vpn_prototype_v3_AG/_custom_ssl_vpn/gen_certs.py) hardcodes the server's SAN (Subject Alternative Name) as `127.0.0.1` and `localhost`. This **will cause TLS certificate errors** when a client connects from a real IP address.

```python
# Current gen_certs.py line 100 — THIS is the problem for cross-network
x509.IPAddress(ipaddress.IPv4Address("127.0.0.1")),
x509.DNSName("localhost"),
```

### Fix Required: Parameterize [gen_certs.py](file:///g:/Studies/7th_sem/project_report/vpn_prototype_v3_AG/_custom_ssl_vpn/gen_certs.py)

Modify [gen_certs.py](file:///g:/Studies/7th_sem/project_report/vpn_prototype_v3_AG/_custom_ssl_vpn/gen_certs.py) to accept the actual server IP:

```bash
# Instead of just:
python _custom_ssl_vpn/gen_certs.py

# Make it accept:
python _custom_ssl_vpn/gen_certs.py --server-ip 192.168.1.100
# Or for internet-facing:
python _custom_ssl_vpn/gen_certs.py --server-ip YOUR_PUBLIC_IP
```

### Network Scenarios (Pick One)

#### Option A: Same Local Network (LAN) — Easiest ⭐ Recommended for Demo
- Server machine: Run VPN server on its actual LAN IP (e.g., `192.168.1.50:8443`).
- Client machine: Connect using `--server-ip 192.168.1.50`.
- No port forwarding needed. Works immediately.
- **Best for classroom demo** — reliable, zero latency.

#### Option B: Different Networks via ngrok (Internet Demo) — Most Impressive
```bash
# On server machine, after starting VPN server on port 8443:
ngrok tcp 8443
# ngrok gives you: tcp://0.tcp.ngrok.io:12345
# Client connects to: 0.tcp.ngrok.io:12345
```
- ngrok free tier supports this. TCP tunneling works with your TLS.
- **Impressive for "different networks" requirement.** 
- Client in one room, server in another with a phone hotspot = visually different networks.

#### Option C: Cloud VM (Most Real-World)
- Deploy VPN server to a free-tier cloud VM (Oracle Cloud Always Free, Railway, etc.)
- Client connects from your laptop to the cloud IP.
- **Most "real world" but hardest to set up.**

### Files That Need Changes for Cross-Network

| File | Change Needed |
|---|---|
| [gen_certs.py](file:///g:/Studies/7th_sem/project_report/vpn_prototype_v3_AG/_custom_ssl_vpn/gen_certs.py) | Add `--server-ip` argument, inject real IP into SAN |
| [server/config.py](file:///g:/Studies/7th_sem/project_report/vpn_prototype_v3_AG/_custom_ssl_vpn/server/config.py) | Ensure `BIND_HOST = "0.0.0.0"` (not `127.0.0.1`) |
| [client/config.py](file:///g:/Studies/7th_sem/project_report/vpn_prototype_v3_AG/_custom_ssl_vpn/client/config.py) | Make server IP configurable via arg/env |
| `internal_api_config.json` | Update target server host |

---

## Requirement 3: Polished, Easy-to-Setup Demo

### Current Setup (3 terminals required)

Your walkthrough already shows a good flow. The polish needed is a **single setup script** and a clear demo script.

### Recommended Additions

**1. `setup_demo.py` — One-time setup script:**
```bash
python setup_demo.py --server-ip 192.168.1.50
# Generates certs with correct IP
# Registers demo user: demo.user / Demo@12345
# Prints "✓ Ready. Run start_server.py on server machine."
```

**2. `start_server.py` — Server-side one-liner:**
```bash
python start_server.py
# Starts echo server + VPN server in same process (different threads)
# Shows: "✓ VPN Server listening on 0.0.0.0:8443"
```

**3. `start_client.py` — Client-side one-liner:**
```bash
python start_client.py --server-ip 192.168.1.50 -u demo.user
# Prompts for password, connects, shows green "✓ Tunnel Active"
```

**4. `run_demo.py` — Live demonstration:**
```bash
python run_demo.py
# Sends "Hello from [machine-name]! Encrypted via Custom VPN"
# Shows the encrypted bytes in transit
# Shows the decrypted response received
```

### Frontend Polish During Demo
The management dashboard should be open showing:
- Active session count going from 0 → 1 when client connects.
- Bandwidth charts updating.
- Admin can click "Terminate Session" during demo.

This is already built. Just make sure it's loaded before the demo.

---

## What I Would Implement (Priority Order)

If I were coding this for you, here is the order I'd do it:

1. **Fix [gen_certs.py](file:///g:/Studies/7th_sem/project_report/vpn_prototype_v3_AG/_custom_ssl_vpn/gen_certs.py)** — Add `--server-ip` arg. **30 minutes.** This unblocks cross-network.
2. **Fix [server/config.py](file:///g:/Studies/7th_sem/project_report/vpn_prototype_v3_AG/_custom_ssl_vpn/server/config.py)** — Ensure `BIND_HOST = "0.0.0.0"`. **5 minutes.**
3. **`custom_crypto/aes_impl.py`** — Pure Python AES-128 demo. **3-4 hours.**
4. **`custom_crypto/rsa_impl.py`** — Pure Python RSA demo. **2-3 hours.**
5. **`setup_demo.py` + `start_server.py` + `start_client.py`** — Convenience scripts. **1-2 hours.**
6. **Test cross-network on LAN** — Two machines, run through full flow. **1 hour.**

**Total: ~2 days of focused work.** Very doable before a defence.

---

## Risk Factors

> [!WARNING]
> **Custom AES/RSA timing.** Implementing AES block cipher from scratch is the most time-consuming part. If time is very short (< 1 day), implement RSA only — it's simpler mathematically. RSA demo (key gen + encrypt/decrypt a string) can be done in ~100 lines.

> [!CAUTION]
> **Never replace your TLS with your custom crypto.** Keep the demo crypto completely separate (`custom_crypto/` module, called only in `demo_crypto.py`). Your TLS tunnel must remain using the `cryptography` library for the actual VPN to function correctly.

> [!TIP]
> **ngrok for cross-network** is the easiest path to "different networks." Sign up at ngrok.com (free tier), install the CLI, and run `ngrok tcp 8443` while the VPN server is on. The client just uses the ngrok hostname. This avoids all firewall/NAT issues.

---

## Talking Points for Defence

When the supervisor asks about your custom implementation, you can say:

1. **"We implemented custom RSA and AES from first principles in `custom_crypto/` to demonstrate understanding of the underlying mathematics — key generation, S-Box substitution, Feistel structure, modular arithmetic."**

2. **"In production, we deliberately use the `cryptography` library for TLS because rolling your own crypto is a documented security anti-pattern — but the demo module proves the conceptual foundation."**

3. **"Our custom protocol on top of TLS is our own framed binary format — `[4-byte length][1-byte command][36-byte session_id][payload]` — with 7 application-layer commands (AUTH, CONNECT, DATA, DISCONNECT, OK, ERROR, KEEPALIVE)."**

4. **"The PBKDF2-HMAC-SHA256 password hashing with 100,000 iterations and timing-safe comparison is our custom security implementation that goes beyond what most academic projects implement."**

---

## Bottom Line

**This is very doable.** Your project is already more sophisticated than most academic VPN projects. The cross-network fix (cert SAN) is a small code change. The custom crypto module is the bulk of new work but it's self-contained and won't risk breaking anything. The demo polish is mostly scripting convenience wrappers around what already works.

**Ask me to implement any of these and I will write the code for you.**

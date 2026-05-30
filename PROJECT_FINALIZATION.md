# PROJECT_FINALIZATION.md
# VPN Project — Demo Finalization Checklist

**Last Updated:** 2026-05-19
**Goal:** Get the project 100% demo-ready — local demo + cross-network (public WiFi) demo.

---

## ✅ VERIFIED COMPLETE (No Action Needed)

These were audit concerns that turned out to be already done correctly:

- [x] **CSRF — Frontend sends `X-CSRF-Token`**
  - `_frontend/src/api/client.ts` fetches `/api/csrf-token` on first mutating call and injects the header automatically.
  - Backend exempts `/auth/login` — this is correct.
  - **Status: 100% working. Nothing to do.**

- [x] **IPC (Backend ↔ VPN)** — `vpn_control.py` connects directly to VPN monitor on port 9999. `VPN_CONTROL_ENABLED=false` in `.env.development` is **not checked anywhere in routes** — IPC is always live.
  - **Status: Working. The env var is misleading but harmless.**

- [x] **Certificates exist** — `server/certs/` has `ca.crt`, `server.crt`, `server.key`. Client has `ca.crt`.

- [x] **echo_server** — `_custom_ssl_vpn/echo_server/echo_server.py` is a simple TCP echo server on port 9000. Useful for the demo to prove the tunnel works.

- [x] **Demo start commands** — `project_walkthrough.md` is accurate for local demo.

---

## 🔴 CRITICAL — Must Do Before Cross-Network Demo

### Task 1: Check Certificate Subject Alternative Names (SAN)
> **Why:** Your TLS certificate must list the hostname your client connects to. If it only has `127.0.0.1`, cross-network will fail with a certificate verification error.

**Steps:**
1. Open a terminal in the **project root** (`vpn_prototype_v3_AG`).
2. Run this one-liner — uses the `cryptography` library already installed by `gen_certs.py`:
   ```bash
   python -c "from cryptography import x509; c=x509.load_pem_x509_certificate(open('_custom_ssl_vpn/server/certs/server.crt','rb').read()); print([str(v) for v in c.extensions.get_extension_for_class(x509.SubjectAlternativeName).value])"
   ```
   **Expected output (current cert):** `['<DNSName(value=\'localhost\')>', '<IPAddress(value=IPv4Address(\'127.0.0.1\'))>']`

   **If that's all you see** → cert only works for local. You need Task 2 for cross-network.

3. Mark done once you know what SANs exist.

- [ ] Ran the cert check command above
- [ ] Noted SAN values: __________ (fill in: e.g. `127.0.0.1, localhost`)

---

### Task 2: Regenerate Certificates for Cross-Network (If Needed)
> **Why:** The cert at `_custom_ssl_vpn/server/certs/server.crt` currently has only `127.0.0.1` and `localhost` in its SAN (confirmed by reading `gen_certs.py` lines 98–105). Your friend's client verifies the server hostname against the SAN — mismatch = instant TLS failure.
>
> **Skip this task** if doing local-only demo.

**Steps:**
1. Decide how your friend will reach your server:
   - **Ngrok TCP** (recommended): gives `0.tcp.ngrok.io` as hostname
   - **LAN IP** (same WiFi): your machine's IP e.g. `192.168.1.x` (run `ipconfig` to find it)
   - **Public IP** (router port-forward setup needed)

2. Open `_custom_ssl_vpn/gen_certs.py`. Go to **lines 97–105** — this is the exact block to edit:
   ```python
   # CURRENT (lines 97-105 of gen_certs.py):
   .add_extension(
       x509.SubjectAlternativeName(
           [
               x509.IPAddress(ipaddress.IPv4Address("127.0.0.1")),
               x509.DNSName("localhost"),
           ]
       ),
       critical=False,
   )
   ```
   **Edit it** — add ONE more entry depending on your connection method:

   **Option A — Ngrok hostname (e.g. `0.tcp.ngrok.io`):**
   ```python
   .add_extension(
       x509.SubjectAlternativeName(
           [
               x509.IPAddress(ipaddress.IPv4Address("127.0.0.1")),
               x509.DNSName("localhost"),
               x509.DNSName("0.tcp.ngrok.io"),   # ← ADD THIS LINE
           ]
       ),
       critical=False,
   )
   ```

   **Option B — LAN or Public IP (e.g. `192.168.1.100`):**
   ```python
   .add_extension(
       x509.SubjectAlternativeName(
           [
               x509.IPAddress(ipaddress.IPv4Address("127.0.0.1")),
               x509.DNSName("localhost"),
               x509.IPAddress(ipaddress.IPv4Address("192.168.1.100")),  # ← YOUR IP
           ]
       ),
       critical=False,
   )
   ```

3. Save `gen_certs.py`. Then from the **project root**, run:
   ```bash
   python -m _custom_ssl_vpn.gen_certs
   ```
   You should see:
   ```
   ✓ Certificates generated successfully:
     ...server.crt
     ...server.key
     ...ca.crt
   Done.
   ```

4. Send `_custom_ssl_vpn/client/certs/ca.crt` to your friend. They place it at the same path on their machine.

5. Your friend runs with the correct server address:
   ```bash
   python -m _custom_ssl_vpn.client.vpn_client \
     --server-host 0.tcp.ngrok.io \
     --server-port 12345 \
     --service-config internal_api_server_config.json \
     -u "test.user1" -p "admin12345"
   ```

- [ ] Decided on connection method (Ngrok / LAN IP / Public IP)
- [ ] Edited `gen_certs.py` lines 97–105 to add the new SAN entry
- [ ] Ran `python -m _custom_ssl_vpn.gen_certs` — got success message
- [ ] Confirmed file modification date on `server/certs/server.crt` is updated
- [ ] Sent `client/certs/ca.crt` to friend's machine

---

### Task 3: Set Up Ngrok TCP Tunnel (If Using Ngrok)
> **Why:** On public WiFi you don't control the router, so you can't port-forward. Ngrok creates a public TCP endpoint that tunnels to your local port 8443.

**Steps:**
1. Download Ngrok from https://ngrok.com/download (free account is fine).
2. Install and authenticate: `ngrok authtoken YOUR_TOKEN` (one-time, found in ngrok dashboard).
3. Start the tunnel: `ngrok tcp 8443`
4. Note the assigned address — it looks like: `tcp://0.tcp.ngrok.io:12345`
   - Host: `0.tcp.ngrok.io`
   - Port: `12345` (random each time on free plan)
5. Update `internal_api_server_config.json` with the new server address:
   ```json
   {
     "server": "0.tcp.ngrok.io:12345",
     "target_host": "127.0.0.1",
     "target_port": 8000,
     "local_port": 9000
   }
   ```
6. Send this updated config file to your friend.
7. On the **friend's machine**: put `ca.crt` in `_custom_ssl_vpn/client/certs/ca.crt` and run:
   ```bash
   python -m _custom_ssl_vpn.client.vpn_client \
     --service-config internal_api_server_config.json \
     -u "test.user1" -p "admin12345"
   ```

> **NOTE for demo day:** Ngrok free plan assigns a new random port every time you restart `ngrok tcp`. Before the demo, start Ngrok, note the port, update the config file and send it to your friend. Do this 10 minutes before the demo.

- [ ] Ngrok installed and auth token configured
- [ ] `ngrok tcp 8443` runs and shows public URL
- [ ] `internal_api_server_config.json` updated with Ngrok address
- [ ] Test: friend successfully connects from outside network
- [ ] `curl http://localhost:9000/...` works from friend's machine through the VPN tunnel

---

## 🟡 IMPORTANT — Start Script (Smooth Demo Experience)

### Task 4: Create Demo Startup Script (`start_demo.bat`)
> **Why:** Instead of opening 4 terminals manually and typing commands, one double-click launches everything in separate windows. This is what makes the demo "smooth".
>
> **Status:** Already created by AI at project root — see `start_demo.bat`.

- [x] `start_demo.bat` created (opens Backend, VPN Server, Frontend in separate cmd windows)
- [ ] Run `start_demo.bat` and verify all 3 services start without errors
- [ ] Wait 5 seconds after all windows open, then manually run the client command (Terminal 4 is always manual — the client needs your credentials)
- [ ] Test the full flow once: start script → client → `curl http://localhost:9000/api/health`

---

### Task 5: Verify Backend + VPN IPC Integration End-to-End
> **Why:** The "Terminate Session" button on the Sessions page calls Backend → Backend sends POST /terminate to VPN monitor on port 9999. This needs to be tested.

**Steps:**
1. Run the full stack (use `start_demo.bat`).
2. Connect a VPN client: `python -m _custom_ssl_vpn.client.vpn_client --target-host 127.0.0.1 --target-port 8000 -u "test.user1" -p "admin12345"`
3. Open the frontend dashboard at http://localhost:5173 and log in as admin.
4. Go to **Sessions** page — you should see the active session listed.
5. Click **Terminate** on the session.
6. Verify the session disappears from the list.
7. On the client terminal, you should see a disconnect message.

- [ ] Session appears in frontend Sessions page
- [ ] Terminate button removes session from list
- [ ] VPN client terminal shows disconnection

---

## 🟢 NICE TO HAVE — Polish Before Defense

### Task 6: Update `PROJECT_EXTENSION_CHECKLIST.md` to Match Reality
> Minor documentation sync. Not critical for demo.

- [ ] Mark CSRF as `[x]` (it's implemented in frontend and backend both)
- [ ] Mark Phase 4 items that are genuinely not done (Dockerfiles, CI/CD)
- [ ] Add note that `VPN_CONTROL_ENABLED` in `.env.development` is unused and misleading

---

### Task 7: Verify `internal_api_server_config.json` is Correct for Local Demo
> This file is what the client loads with `--service-config`. Check its contents.

**Steps:**
1. Open `internal_api_server_config.json` at project root.
2. Verify `target_host` and `target_port` point to something that's running locally (e.g. the Backend API at `127.0.0.1:8000` or echo_server at `127.0.0.1:9000`).
3. Verify `server` points to `127.0.0.1:8443` for local demo.
4. Verify `local_port` is something memorable (e.g. `9000`).

- [ ] Opened and verified `internal_api_server_config.json`
- [ ] Local demo works with this config file

---

### Task 8: Practice the Full Demo Flow (No Script Stumbles)
> Do a cold run of everything — from zero to "curl works and dashboard shows session".

**Full Demo Script (memorize this):**

1. Double-click `start_demo.bat` → 3 windows open
2. Wait ~5 seconds for backend to initialize
3. Open browser → `http://localhost:5173` → login with `test.user1` / `admin12345`
4. Go to Dashboard → note "Active Sessions: 0"
5. Open Terminal 4:
   ```bash
   python -m _custom_ssl_vpn.client.vpn_client --service-config internal_api_server_config.json -u "test.user1" -p "admin12345"
   ```
6. Client prints "Authentication granted" and "Local forwarder listening on 0.0.0.0:9000"
7. Open browser tab → `http://localhost:9000` (or the target service)
8. **Dashboard auto-updates: "Active Sessions: 1"** with bytes shown
9. Show the Sessions tab — session listed with IP, duration, bytes
10. (Optional) Click Terminate — session drops, client exits

- [ ] Rehearsal 1 — timed (target: under 2 minutes from double-click to curl)
- [ ] Rehearsal 2 — show someone else running it
- [ ] Rehearsal 3 (cross-network, with friend)

---

## 📋 Summary Checklist for Quick Reference

```
CRITICAL (must do for cross-network demo):
[ ] Task 1: Check cert SANs
[ ] Task 2: Regenerate certs with Ngrok/public IP SAN
[ ] Task 3: Ngrok setup + end-to-end cross-network test

DONE BY AI:
[x] CSRF verified (already working)
[x] start_demo.bat created (see Task 4)

VERIFY:
[ ] Task 4: Run start_demo.bat and test it works
[ ] Task 5: Test IPC session termination end-to-end

POLISH:
[ ] Task 6: Update PROJECT_EXTENSION_CHECKLIST.md
[ ] Task 7: Verify internal_api_server_config.json
[ ] Task 8: Practice full demo 3x
```

# Project Defense Walkthrough (Full System)

Alright, here's exactly how to get the whole thing running for the demo. You'll need 4 terminals open.

## Step 1: Fire up the Backend
First, we need the API server running so the VPN can check permissions and the dashboard can load.

1. Go to the `_backend` folder.
2. Activate your virtual environment.
3. Start the server.

```bash
# Terminal 1
cd _backend
.venv/Scripts/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## Step 2: Start the VPN Core
This is the heart of the system. It handles the actual encrypted tunnels.

```bash
# Terminal 2
# From the root project folder
python -m _custom_ssl_vpn.server.vpn_server
```

## Step 3: Launch the Dashboard (Frontend)
This is where you'll see the stats and download your configs.

```bash
# Terminal 3
cd _frontend
npm run dev
```
Now open your browser to **http://localhost:5173**. 
Log in as `test.user1` (pass: `admin12345`). Download the config for the service you want to test.

## Step 4: Run the VPN Client
Once you have your config file (e.g., `internal_api_server_config.json`), just run this to connect.

```bash
# Terminal 4
# From the root project folder
python -m _custom_ssl_vpn.client.vpn_client --service-config internal_api_server_config.json -u "test.user1"
```

### Verification
Once the client says "Authentication Granted", try accessing the internal service via the local port:
```bash
# In any terminal or browser
curl http://localhost:9000/api/health
```
You should see `{"status":"healthy"}` and your "My Stats" card on the dashboard will jump up instantly!

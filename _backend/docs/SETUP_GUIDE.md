# VPN Backend - Setup & Usage Guide

## 🎯 Quick Navigation

- **First Time Setup?** → See [First Time Setup](#first-time-setup) below
- **Returning User?** → See [Running Again](#running-again) below
- **Having Issues?** → See [Troubleshooting](#troubleshooting)

---

## 🆕 First Time Setup

### Prerequisites Check

Before starting, you need:

```bash
# Check Python version (must be 3.11+)
python --version

# Check if venv is activated
# You should see (.venv) in your terminal prompt
# If not, activate it:
.venv/Scripts/activate   # Windows
source .venv/bin/activate   # Mac/Linux
```

### Step 1: Install Dependencies

**WARNING:** Dependencies have pre-built wheels to avoid compilation issues on Windows.

```bash
# Navigate to backend folder
cd _backend

# Install dependencies
pip install -r requirements.txt
```

**Expected output:**

```
Successfully installed fastapi-0.100.0 uvicorn-0.23.2 sqlalchemy-2.0.20 ... pydantic-1.10.12
```

**If you see errors:**

- See [Dependency Installation Issues](#dependency-installation-issues)

### Step 2: Configure Environment

Check `.env.development` - it should have MySQL connection details:

```bash
# Edit .env.development if needed
cat .env.development
```

**What to configure:**

```
DATABASE_URL=mysql+pymysql://root:@localhost:3306/vpn_db
JWT_SECRET=your-super-secret-key-change-in-production-long-one
```

**MySQL Setup:**

```bash
# Make sure MySQL is running
mysql -u root

# Create database if doesn't exist
mysql -u root -e "CREATE DATABASE IF NOT EXISTS vpn_db;"
```

### Step 3: Create Admin Account

This creates the first user with admin privileges:

```bash
# Run from backend folder
python create_admin.py
```

**You'll be prompted for:**

```
Enter admin username: admin
Enter admin email: admin@example.com
Enter admin password (min 8 chars): yourpassword123
Confirm admin password: yourpassword123
```

**Expected output:**

```
✓ Admin user created successfully!
  ID: 1
  Username: admin
  Email: admin@example.com
  Is Admin: True

✓ Setup complete! You can now log in with these credentials.
  Login URL: http://localhost:3000/login
  API Docs: http://localhost:8000/api/docs
```

**Important:** Save these credentials safely!

### Step 4: Run the Backend Server

```bash
# Make sure you're in the backend folder
cd _backend

# Start the server
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Expected output:**

```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started server process [12345]
```

### Step 5: Verify It's Working

**Option A: Using Browser**

```
http://localhost:8000/api/docs
```

This opens Swagger UI where you can test endpoints.

**Option B: Using curl**

```bash
# Test login
curl -X POST "http://localhost:8000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"yourpassword123"}'
```

**Expected response:**

```json
{
    "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
    "token_type": "bearer",
    "user": {
        "id": 1,
        "username": "admin",
        "email": "admin@example.com",
        "is_admin": true,
        "is_active": true
    }
}
```

### Step 6: (Optional) Run Tests

```bash
# From backend folder
pytest

# With coverage report
pytest --cov=app --cov-report=html
```

**Expected output:**

```
======================== test session starts ========================
collected 14 items

tests/test_auth.py ......                                     [42%]
tests/test_users.py ........                                 [100%]

======================== 14 passed in 0.95s =========================
```

---

## 🔄 Running Again

### Returning User Workflow

When you come back to work on this project:

```bash
# 1. Navigate to project folder
cd "g:/Studies/7th_sem/project_report/vpn_prototype_v3_AG"

# 2. Activate virtual environment (if not already active)
.venv/Scripts/activate

# 3. Verify MySQL is running
mysql -u root -e "SELECT 1"

# 4. Start the backend
cd _backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 5. In another terminal, run frontend (when ready)
cd frontend
npm run dev
```

**That's it!** The database and admin account persist between sessions.

---

## 📦 Dependency Details

### What Was Installed

```
fastapi          0.100.0    # Web framework
uvicorn          0.23.2     # Server runtime
sqlalchemy       2.0.20     # Database ORM
pymysql          1.1.0      # MySQL driver
pydantic         1.10.12    # Input validation
pyjwt            2.8.0      # JWT tokens
passlib          1.7.4      # Password hashing
bcrypt           4.1.1      # Secure hashing
pytest           7.4.3      # Testing
httpx            0.25.1     # HTTP client
python-dotenv    1.0.0      # Environment loader
```

### Why These Versions

- **Pre-built wheels only** - Avoids C++ compilation on Windows
- **No pydantic 2.x** - Would require building pydantic-core (Rust)
- **Tested combination** - Verified to work together
- **Latest stable** - As of April 2026

### If Dependencies Won't Install

**Quick Fix:**

```bash
# Clear pip cache
pip cache purge

# Upgrade pip
python -m pip install --upgrade pip

# Try again
pip install -r requirements.txt
```

**Last Resort:**

```bash
# Use pre-built wheels only
pip install --only-binary :all: -r requirements.txt

# Or specific versions that have wheels
pip install fastapi==0.100.0 --only-binary :all:
```

---

## 🔐 Working with Admin Account

### Create Additional Users

```bash
# Option 1: Use API (Swagger UI)
# 1. Go to http://localhost:8000/api/docs
# 2. Click "Authorize" and enter your admin token
# 3. Try POST /api/users with:
{
  "username": "john",
  "email": "john@example.com",
  "password": "secure123",
  "is_admin": false
}
```

```bash
# Option 2: Use curl
TOKEN="your-jwt-token-from-login"

curl -X POST "http://localhost:8000/api/users" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john",
    "email": "john@example.com",
    "password": "secure123",
    "is_admin": false
  }'
```

### Login as Regular User

```bash
curl -X POST "http://localhost:8000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"john","password":"secure123"}'
```

### View All Users

```bash
TOKEN="your-admin-jwt-token"

curl -X GET "http://localhost:8000/api/users?skip=0&limit=20" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🗄️ Database

### Database Structure

**MySQL database: `vpn_db`**

Three tables are auto-created on first run:

```
users          - User accounts with passwords
sessions       - Active VPN connections
audit_logs     - Compliance audit trail
```

### Verify Database Setup

```bash
# Connect to MySQL
mysql -u root

# Check database exists
SHOW DATABASES LIKE 'vpn_db';

# See tables
USE vpn_db;
SHOW TABLES;

# Check admin user
SELECT id, username, email, is_admin FROM users;
```

### Reset Database

**WARNING: This deletes all data!**

```bash
# Method 1: Drop and recreate
mysql -u root -e "DROP DATABASE vpn_db; CREATE DATABASE vpn_db;"

# Method 2: Soft reset (keep schema, clear data)
mysql -u root -e "USE vpn_db; DELETE FROM audit_logs; DELETE FROM sessions; DELETE FROM users;"

# Then recreate admin:
python create_admin.py
```

---

## 🔧 Environment Variables

Edit `.env.development` to configure:

```bash
# Database connection
DATABASE_URL=mysql+pymysql://root:@localhost:3306/vpn_db

# Security
JWT_SECRET=change-me-in-production-use-32-chars-minimum
JWT_EXPIRY_HOURS=1

# Rate limiting
MAX_LOGIN_ATTEMPTS=5
AUTH_TIMEOUT_SECONDS=300

# Session timeout
SESSION_TIMEOUT_SECONDS=3600

# Logging
LOG_LEVEL=INFO

# VPN integration (disabled by default)
VPN_CONTROL_ENABLED=false
```

---

## 🧪 Testing During Development

```bash
# Run all tests
pytest

# Run specific test file
pytest tests/test_auth.py

# Run specific test
pytest tests/test_auth.py::test_login_success

# With verbose output
pytest -v

# Show print statements
pytest -s

# Coverage report
pytest --cov=app
```

---

## 📊 Monitoring & Logs

### View Logs

Logs are output to console in JSON format:

```json
{
    "timestamp": "2026-04-12T10:30:45.123456",
    "level": "INFO",
    "logger": "app.services.auth_service",
    "message": "User admin logged in successfully",
    "user_id": 1,
    "username": "admin"
}
```

### Set Log Level

In `.env.development`:

```
LOG_LEVEL=DEBUG   # More verbose
LOG_LEVEL=INFO    # Default
LOG_LEVEL=WARNING # Less verbose
```

### Health Check

```bash
curl http://localhost:8000/api/health
```

Output:

```json
{
    "status": "healthy",
    "database": "healthy",
    "vpn": "disabled"
}
```

---

## 🐛 Troubleshooting

### Dependency Installation Issues

**Error: `Failed building wheel for pydantic-core`**

This happens when pip tries to compile from source.

**Solution:**

```bash
# Use pre-built wheels only
pip install --only-binary :all: -r requirements.txt
```

**Error: `No module named 'fastapi'`**

Dependency didn't install properly.

**Solution:**

```bash
# Check venv is activated
.venv/Scripts/activate

# Reinstall
pip uninstall fastapi pydantic -y
pip install -r requirements.txt
```

### MySQL Connection Issues

**Error: `Can't connect to MySQL server`**

MySQL might not be running.

**Solution:**

```bash
# Ubuntu/Debian
sudo service mysql start

# Windows
# Start MySQL service from Services app

# Verify connection
mysql -u root
```

**Error: `Unknown database 'vpn_db'`**

Database wasn't created.

**Solution:**

```bash
mysql -u root -e "CREATE DATABASE vpn_db;"
```

### admin not found

Admin account wasn't created.

**Solution:**

```bash
python create_admin.py
```

### Port 8000 Already in Use

Another process is using port 8000.

**Solution:**

```bash
# Kill process on port 8000
# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Linux/Mac
lsof -i :8000
kill -9 <PID>

# Or use different port
python -m uvicorn app.main:app --reload --port 8001
```

### JWT Token Expired

Token expired (default 1 hour).

**Solution:**

```bash
# Login again to get new token
curl -X POST "http://localhost:8000/api/auth/login" \
  -d '{"username":"admin","password":"..."}' \
  -H "Content-Type: application/json"
```

### Rate Limited (5 failed login attempts)

Too many failed login attempts from your IP.

**Solution:**

```bash
# Wait 15 minutes, or
# Check code in app/services/auth_service.py line ~50
# (Failed attempts stored in failed_login_attempts dict)
```

---

## 📚 Useful Commands

```bash
# Activate virtual environment
.venv/Scripts/activate

# Deactivate virtual environment
deactivate

# Install dependencies
pip install -r requirements.txt

# Check installed packages
pip list

# Create admin account
python create_admin.py

# Run server
python -m uvicorn app.main:app --reload

# Run tests
pytest

# Format code (when black is added)
black app/

# Type checking (when mypy is added)
mypy app/

# Watch files and restart server
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

---

## 🚀 Next Steps

After backend is working:

1. **Frontend Development** (Phase 2)
    - Navigate to `frontend/` folder
    - Follow similar setup process
    - React + Vite + TypeScript

2. **VPN Integration** (Phase 3)
    - Implement IPC communication
    - Session tracking from VPN server
    - SOCKS5 multiplexing

3. **Deployment** (Phase 4)
    - Docker setup
    - GitHub Actions CI/CD
    - Production configuration

---

## 📞 Getting Help

1. **Check logs** - Detailed error messages
2. **Read docstrings** - Hover over functions in VS Code
3. **Check tests** - Tests show how to use code
4. **Swagger UI** - http://localhost:8000/api/docs

---

**Happy coding!** 🎉

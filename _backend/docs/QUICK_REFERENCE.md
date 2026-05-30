# VPN Backend - Quick Reference Card

## 🚀 Quick Start (30 seconds)

```bash
# 1. Activate venv
.venv/Scripts/activate

# 2. Install dependencies (first time only)
pip install -r requirements.txt

# 3. Create admin account (first time only)
python create_admin.py

# 4. Run server
cd backend
python -m uvicorn app.main:app --reload --port 8000

# 5. Access API
http://localhost:8000/api/docs
```

---

## 🔑 Credentials (Save These!)

```
Your Admin Account:
  Username: _______________
  Email:    _______________
  Password: _______________

API Endpoint: http://localhost:8000/api
Swagger Docs: http://localhost:8000/api/docs
```

---

## 📱 Common Requests

### Login

```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"yourpass"}'
```

### Create User

```bash
curl -X POST http://localhost:8000/api/users \
  -H "Authorization: Bearer TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "username":"john",
    "email":"john@example.com",
    "password":"secure123"
  }'
```

### List Users

```bash
curl http://localhost:8000/api/users \
  -H "Authorization: Bearer TOKEN_HERE"
```

### Health Check

```bash
curl http://localhost:8000/api/health
```

---

## 🐞 Quick Fixes

| Issue                          | Solution                                      |
| ------------------------------ | --------------------------------------------- |
| `ModuleNotFoundError: fastapi` | Run: `pip install -r requirements.txt`        |
| MySQL won't connect            | Run: `mysql -u root` (make sure it's running) |
| Port 8000 in use               | Use: `--port 8001`                            |
| Can't find admin account       | Run: `python create_admin.py`                 |
| Tests fail                     | Run: `pytest -v` to see details               |

---

## 📁 Important Files

```
backend/
├── app/main.py              ← FastAPI app
├── app/config.py            ← Configuration
├── create_admin.py          ← Create first user
├── requirements.txt         ← Dependencies
├── .env.development         ← Local config
├── docs/                    ← Documentation
└── tests/                   ← Unit tests
```

---

## 🔒 Security Reminders

- ✅ Never commit `.env.development` to git
- ✅ Use strong JWT_SECRET in production
- ✅ Change default password immediately
- ✅ Keep backups of admin credentials
- ✅ All endpoints require JWT except `/health`

---

## 📊 Endpoints

| Method | Path           | Auth | Role   |
| ------ | -------------- | ---- | ------ |
| POST   | /auth/login    | -    | Public |
| POST   | /auth/logout   | JWT  | Any    |
| POST   | /users         | JWT  | Admin  |
| GET    | /users         | JWT  | Admin  |
| GET    | /users/{id}    | JWT  | Admin  |
| PUT    | /users/{id}    | JWT  | Admin  |
| DELETE | /users/{id}    | JWT  | Admin  |
| GET    | /sessions      | JWT  | Admin  |
| GET    | /sessions/{id} | JWT  | Admin  |
| DELETE | /sessions/{id} | JWT  | Admin  |
| GET    | /health        | -    | Public |
| GET    | /api/docs      | -    | Public |

---

## 🧪 Testing

```bash
pytest                    # Run all tests
pytest -v                 # Verbose output
pytest test_auth.py       # Run one file
pytest --cov=app          # Coverage report
```

---

## 🛠️ Development Workflow

```bash
# Terminal 1: Run backend
cd backend
python -m uvicorn app.main:app --reload --port 8000

# Terminal 2: Run tests (when needed)
cd backend
pytest --watch

# Terminal 3: Monitor logs
cd backend
tail -f uvicorn.log | grep ERROR
```

---

## 🌍 Environment Variables

| Variable             | Default                                       | Purpose              |
| -------------------- | --------------------------------------------- | -------------------- |
| `DATABASE_URL`       | `mysql+pymysql://root:@localhost:3306/vpn_db` | MySQL connection     |
| `JWT_SECRET`         | `change-me`                                   | Token signing key    |
| `JWT_EXPIRY_HOURS`   | `1`                                           | Token validity       |
| `MAX_LOGIN_ATTEMPTS` | `5`                                           | Rate limit threshold |
| `LOG_LEVEL`          | `INFO`                                        | Logging verbosity    |

---

## ⏱️ First Run Checklist

- [ ] Python 3.11+ installed
- [ ] MySQL running
- [ ] Virtual environment activated
- [ ] Dependencies installed
- [ ] Admin account created
- [ ] Server starts without errors
- [ ] Can access http://localhost:8000/api/docs
- [ ] Can login with admin credentials

---

## 🎯 TODO After Setup

- [ ] Create test users
- [ ] Login and get JWT token
- [ ] Test endpoints in Swagger UI
- [ ] Read through code comments
- [ ] Run all tests
- [ ] Review database schema
- [ ] Plan frontend integration

---

## 📞 Help Commands

```bash
# Show Python version
python --version

# Show installed packages
pip list

# Check MySQL is running
mysql -u root -e "SELECT 1"

# See available endpoints
curl http://localhost:8000/api/docs

# Check server status
curl http://localhost:8000/api/health
```

---

**Last Updated:** 2026-04-12  
**For detailed setup:** See `SETUP_GUIDE.md`  
**For code details:** See `IMPLEMENTATION_SUMMARY.md`

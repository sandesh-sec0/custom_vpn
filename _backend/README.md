# VPN Backend API

FastAPI backend for the Custom SSL VPN management system.

**📚 Documentation is in the `docs/` folder:**

- **Getting Started?** → Read `docs/SETUP_GUIDE.md`
- **Quick Commands?** → Read `docs/QUICK_REFERENCE.md`
- **Technical Details?** → Read `docs/IMPLEMENTATION_SUMMARY.md`

## 🚀 Quick Start (3 Commands)

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Create admin account
python create_admin.py

# 3. Run the server
python -m uvicorn app.main:app --reload --port 8000
```

Then visit: http://localhost:8000/api/docs

## 📁 Project Structure

```
backend/
├── docs/                    ← All documentation (SETUP_GUIDE.md, etc.)
├── app/                     ← FastAPI application
│   ├── main.py              ← FastAPI app
│   ├── config.py            ← Configuration
│   ├── database.py          ← SQLAlchemy
│   ├── models/              ← User, Session, AuditLog
│   ├── schemas/             ← Pydantic schemas
│   ├── routes/              ← API endpoints
│   ├── services/            ← Business logic
│   └── utils/               ← Security, logging
├── tests/                   ← Test suite
├── create_admin.py          ← Admin setup
├── requirements.txt         ← Dependencies
└── .env.development         ← Configuration
```

## 🔑 Key Features

✅ 13 API endpoints (Auth, Users, Sessions, Health)
✅ JWT authentication with rate limiting
✅ User management (CRUD)
✅ Session tracking with bandwidth metrics
✅ Audit logging for compliance
✅ Structured JSON logging with secret redaction
✅ 14+ unit tests
✅ Type hints and comprehensive docstrings

## 📚 Full Documentation

All backend documentation is in the `docs/` folder:

| Document                         | Purpose                          |
| -------------------------------- | -------------------------------- |
| `docs/SETUP_GUIDE.md`            | Step-by-step setup instructions  |
| `docs/QUICK_REFERENCE.md`        | One-page quick reference card    |
| `docs/IMPLEMENTATION_SUMMARY.md` | Technical implementation details |

## 🧪 Running Tests

```bash
pytest
pytest --cov=app
```

## 🔒 Security

- Passwords hashed with bcrypt
- JWT tokens (HS256)
- Rate limiting (5 failed attempts = 15 min block)
- SQL injection prevention (ORM only)
- CORS restricted (not `*`)
- Audit logging of all admin actions
- Automatic secret redaction in logs

## 🛠️ Environment Variables

See `.env.development` for configuration:

- `DATABASE_URL` - MySQL connection
- `JWT_SECRET` - Token signing key
- `MAX_LOGIN_ATTEMPTS` - Rate limit threshold
- And more...

## 📖 Need Help?

1. Read: `docs/SETUP_GUIDE.md` (detailed guide)
2. Check: `docs/QUICK_REFERENCE.md` (quick commands)
3. Review: Code docstrings (every function explained)

---

**For complete setup instructions:** See `docs/SETUP_GUIDE.md`

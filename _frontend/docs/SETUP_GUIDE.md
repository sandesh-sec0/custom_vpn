# VPN Frontend — Setup & Usage Guide

## 🎯 Quick Navigation

- **First time setup?** → [First Time Setup](#-first-time-setup)
- **Returning user?** → [Running Again](#-running-again)
- **Having issues?** → [Troubleshooting](#-troubleshooting)

---

## 🆕 First Time Setup

### Prerequisites

| Tool | Min Version | Check |
|------|-------------|-------|
| Node.js | 18+ | `node --version` |
| npm | 9+ | `npm --version` |
| Backend running | — | `curl http://localhost:8000/api/health` |

> **The backend must be running before the frontend will work.**
> See `_backend/docs/SETUP_GUIDE.md` for backend setup.

---

### Step 1: Navigate to the Frontend Folder

```bash
cd g:\Studies\7th_sem\project_report\vpn_prototype_v3_AG\_frontend
```

### Step 2: Install Dependencies

```bash
npm install
```

Expected output:
```
added 197 packages, and audited 197 packages in ...
found 0 vulnerabilities
```

**If you see errors:** See [Troubleshooting](#-troubleshooting).

---

### Step 3: Verify Environment Config

The `.env.development` file should already be present. Verify it points to your backend:

```bash
type .env.development
```

Expected content:
```
VITE_API_URL=http://localhost:8000/api
VITE_API_TIMEOUT=30000
VITE_ENV=development
```

Change `VITE_API_URL` if your backend runs on a different port.

---

### Step 4: Start the Dev Server

```bash
npm run dev
```

Expected output:
```
  VITE v8.x.x  ready in 200 ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: http://192.168.x.x:3000/
```

---

### Step 5: Open the App

Navigate to: **http://localhost:3000**

You'll be redirected to the **Login page**.

Log in with the admin account you created during backend setup:
```
Username: admin     (or whatever you set)
Password: (your admin password)
```

---

### Step 6: (Optional) Type Check

```bash
npx tsc --noEmit
```

Should output nothing — zero errors.

---

## 🔄 Running Again

When you return to this project after a break:

```bash
# 1. Make sure the project venv is activated (for backend)
#    (from the root project folder):
.venv\Scripts\activate

# 2. Start the backend first (Terminal 1):
cd _backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 3. Start the frontend (Terminal 2):
cd _frontend
npm run dev

# 4. Open browser: http://localhost:3000
```

That's it — no reinstall needed unless `package.json` changed.

---

## 🔧 Environment Variables

All variables are prefixed with `VITE_` so Vite bundles them at build time.

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:8000/api` | Backend API base URL |
| `VITE_API_TIMEOUT` | `30000` | Request timeout (ms) |
| `VITE_ENV` | `development` | Environment label |

Edit `.env.development` for local overrides.
Never commit secrets or production URLs to `.env.development`.

---

## 📁 Project Structure

```
_frontend/src/
├── api/
│   ├── client.ts           # fetch() wrapper (no axios!)
│   └── types.ts            # TypeScript interfaces
├── components/
│   ├── auth/
│   │   └── ProtectedRoute.tsx
│   ├── charts/
│   │   └── StatsChart.tsx
│   ├── common/
│   │   ├── AppLayout.tsx
│   │   ├── Header.tsx
│   │   └── Sidebar.tsx
│   ├── forms/
│   │   ├── ChangePasswordForm.tsx
│   │   ├── LoginForm.tsx
│   │   └── UserForm.tsx
│   └── tables/
│       ├── SessionsTable.tsx
│       └── UsersTable.tsx
├── context/
│   ├── AuthContext.tsx      # Global auth state
│   └── ThemeContext.tsx     # Dark/light mode
├── hooks/
│   ├── useAuth.ts
│   ├── useSessions.ts
│   ├── useTheme.ts
│   └── useUsers.ts
├── pages/
│   ├── DashboardPage.tsx
│   ├── LoginPage.tsx
│   ├── NotFoundPage.tsx
│   ├── ProfilePage.tsx
│   ├── SessionsPage.tsx
│   └── UsersPage.tsx
├── utils/
│   ├── auth.ts             # sessionStorage helpers
│   ├── errors.ts           # Error parsing
│   └── formatting.ts       # Bytes, dates, duration
├── App.tsx                 # Router + providers
├── index.css               # Tailwind v4 + globals
└── main.tsx                # Entry point
```

---

## 🔐 Token Storage

Tokens are stored in **`sessionStorage`** — they are automatically cleared when the browser tab is closed. You must log in again in each new session.

**Why not `localStorage`?** The project security rules prohibit persistent token storage without httpOnly cookies. `sessionStorage` is the safest available client-side option until the backend supports httpOnly cookie auth.

---

## 🧪 Commands Reference

```bash
# Start dev server (port 3000)
npm run dev

# Type check (zero output = passing)
npx tsc --noEmit

# Build for production (when needed)
npm run build

# Preview production build
npm run preview
```

---

## 🐛 Troubleshooting

### Port 3000 already in use

```bash
# Windows: kill the process on port 3000
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Or run on a different port:
npm run dev -- --port 3001
```

### Cannot connect to API / CORS errors

1. Make sure the backend is running: `curl http://localhost:8000/api/health`
2. Check `.env.development` — `VITE_API_URL` must match backend port
3. The backend already allows `localhost:3000` and `localhost:5173` in CORS

### Login fails immediately

1. Backend might be down — check Terminal 1 for backend logs
2. Check admin credentials — run `python create_admin.py` again if unsure
3. Open browser DevTools → Network tab → look at the failed `/api/auth/login` response

### `npm install` fails

```bash
# Clear cache and retry
npm cache clean --force
npm install
```

### TypeScript errors after pulling changes

```bash
# Reinstall deps (package.json may have changed)
npm install

# Check errors
npx tsc --noEmit
```

---

## 🚀 Next Steps

After the frontend is working:

1. **VPN Integration** (Phase 3)
   - Implement IPC between backend and VPN server
   - Real-time session tracking

2. **Deployment** (Phase 4, when ready)
   - Docker setup for all services
   - Production environment config

---

**Questions?** Check `_backend/docs/SETUP_GUIDE.md` for backend issues.
**Architecture?** See `_docs/ARCHITECTURE_EXTENDED.md`.

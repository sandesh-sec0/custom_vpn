# VPN Frontend — Quick Reference

## 🚀 Start Everything

```bash
# Terminal 1 — Backend
cd g:\Studies\7th_sem\project_report\vpn_prototype_v3_AG
.venv\Scripts\activate
cd _backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2 — Frontend
cd g:\Studies\7th_sem\project_report\vpn_prototype_v3_AG\_frontend
npm run dev
```

Open: **http://localhost:3000**

---

## ⚡ Common Commands

| Action | Command |
|--------|---------|
| Start dev server | `npm run dev` |
| Type check | `npx tsc --noEmit` |
| Build production | `npm run build` |
| Preview build | `npm run preview` |
| Install deps | `npm install` |

---

## 🔗 Key URLs

| URL | Description |
|-----|-------------|
| http://localhost:3000 | Frontend app |
| http://localhost:3000/login | Login page |
| http://localhost:3000/users | Users (admin) |
| http://localhost:3000/sessions | Sessions (admin) |
| http://localhost:8000/api/docs | Backend Swagger UI |
| http://localhost:8000/api/health | API health check |

---

## 🌐 API Endpoints Used

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Log in |
| POST | `/api/auth/logout` | Log out |
| GET | `/api/users` | List users |
| POST | `/api/users` | Create user |
| PUT | `/api/users/{id}` | Update user |
| DELETE | `/api/users/{id}` | Delete user |
| GET | `/api/sessions` | List sessions |
| DELETE | `/api/sessions/{id}` | Terminate session |
| GET | `/api/health` | Health check |

---

## 📁 Important Files

| File | Purpose |
|------|---------|
| `src/api/client.ts` | fetch() wrapper — **no axios** |
| `src/api/types.ts` | All TypeScript interfaces |
| `src/context/AuthContext.tsx` | Auth state + login/logout |
| `src/utils/auth.ts` | sessionStorage helpers |
| `.env.development` | Local dev config |
| `vite.config.ts` | Vite + Tailwind + proxy |

---

## 🚫 Forbidden

- **No axios** — use native fetch() only
- **No dangerouslySetInnerHTML** — XSS risk
- **No localStorage for tokens** — use sessionStorage
- **No hardcoded API URLs** — use `import.meta.env.VITE_API_URL`

# VPN Backend — Setup Guide

> **⚠️ This file is a redirect notice.**
> The backend setup guide has been consolidated to avoid duplicate documentation.
>
> **The canonical setup guide is located at:**
> **[`_backend/docs/SETUP_GUIDE.md`](docs/SETUP_GUIDE.md)**
>
> Please read and update that file only.

---

## Quick Start (copy-paste)

```bash
# From project root
.venv\Scripts\activate

cd _backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

For complete first-time setup, dependency details, and troubleshooting → see **[docs/SETUP_GUIDE.md](docs/SETUP_GUIDE.md)**.

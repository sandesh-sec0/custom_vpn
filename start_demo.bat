@echo off
echo ================================================================
echo   VPN Project Demo Launcher
echo   Starting: Backend API, VPN Server, Frontend Dashboard
echo ================================================================
echo.

:: ── Resolve project root (folder where this script lives) ────────────────────
set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

:: .venv is at project ROOT (shared by backend and VPN server)
set "VENV_ACTIVATE=%ROOT%\.venv\Scripts\activate.bat"

echo [1/3] Starting Backend API (FastAPI on port 8000)...
start "VPN Backend API" cmd /k "cd /d %ROOT%\_backend && call %VENV_ACTIVATE% && echo [Backend] Ready - starting uvicorn... && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

:: Wait 5 seconds for backend to initialize before VPN server tries permission checks
echo Waiting 5 seconds for backend to initialize...
timeout /t 5 /nobreak >nul

echo [2/3] Starting VPN Core Server (TLS on port 8443)...
start "VPN Core Server" cmd /k "cd /d %ROOT% && call %VENV_ACTIVATE% && echo [VPN Server] Starting... && python -m _custom_ssl_vpn.server.vpn_server"

:: Short pause then start frontend
echo Waiting 2 seconds for VPN server to bind...
timeout /t 2 /nobreak >nul

echo [3/3] Starting Frontend Dashboard (Vite on port 5173)...
start "VPN Frontend Dashboard" cmd /k "cd /d %ROOT%\_frontend && npm run dev"

echo.
echo ================================================================
echo   All 3 services launching in separate windows!
echo.
echo   Backend API  ^> http://localhost:8000/docs
echo   Frontend UI  ^> http://localhost:5173     ^<-- open this
echo   VPN Monitor  ^> http://127.0.0.1:9999/stats
echo.
echo   WAIT ~10 seconds, then run the VPN client in a new terminal:
echo.
echo   python -m _custom_ssl_vpn.client.vpn_client ^
echo     --service-config internal_api_server_config.json ^
echo     -u "test.user1" -p "admin12345"
echo ================================================================
echo.
pause

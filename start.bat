@echo off

title SafeRoute AI Launcher

echo ==========================================
echo        Starting SafeRoute AI
echo ==========================================
echo.

echo Starting SafeRoute AI Backend...
start "SafeRoute Backend" cmd /k "cd /d %~dp0backend && .venv\Scripts\python.exe -m uvicorn app.main:app --reload"

timeout /t 2 /nobreak >nul

echo Starting SafeRoute AI Frontend...
start "SafeRoute Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ==========================================
echo   SafeRoute AI services are starting...
echo ==========================================
echo.
echo Frontend: http://localhost:5173
echo Backend:  http://127.0.0.1:8000
echo API Docs: http://127.0.0.1:8000/docs
echo.

pause
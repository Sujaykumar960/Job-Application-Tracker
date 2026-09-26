@echo off
setlocal
echo ======================================================================
echo Starting CareerX Platform (Backend: Port 8000 ^| Frontend: Port 3000)
echo ======================================================================

set "PROJECT_ROOT=%~dp0.."
cd /d "%PROJECT_ROOT%"

start "CareerX Backend API" cmd /k "python -m uvicorn app.main:app --reload --port 8000 --app-dir backend"
start "CareerX Frontend App" cmd /k "npm run dev"

echo.
echo Both servers successfully launched in independent processes.
echo - Backend API:      http://localhost:8000
echo - Swagger Docs:     http://localhost:8000/docs
echo - Frontend Web:     http://localhost:3000
echo.
endlocal

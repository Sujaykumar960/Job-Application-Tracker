@echo off
echo ========================================================
echo Starting CareerX Backend (Port 8000) and Frontend (Port 3000)...
echo ========================================================

start "CareerX Backend" cmd /k "cd backend && python -m uvicorn app.main:app --reload --port 8000"
start "CareerX Frontend" cmd /k "npm run dev"

echo Both processes launched in separate windows!
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:3000

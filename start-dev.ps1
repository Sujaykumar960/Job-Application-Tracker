Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "Starting CareerX Backend (Port 8000) and Frontend (Port 3000)..." -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

# Start backend in new PowerShell window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; python -m uvicorn app.main:app --reload --port 8000"

# Start frontend in new PowerShell window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev"

Write-Host "Both processes launched in separate windows!" -ForegroundColor Green
Write-Host "Backend API:  http://localhost:8000" -ForegroundColor Yellow
Write-Host "Swagger Docs: http://localhost:8000/docs" -ForegroundColor Yellow
Write-Host "Frontend App: http://localhost:3000" -ForegroundColor Magenta

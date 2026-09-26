# CareerX Platform Local Development Launcher
[CmdletBinding()]
param()

$ProjectRoot = (Resolve-Path "$PSScriptRoot\..").Path
Set-Location $ProjectRoot

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "Starting CareerX Platform Services..." -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$ProjectRoot'; python -m uvicorn app.main:app --reload --port 8000 --app-dir backend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$ProjectRoot'; npm run dev"

Write-Host ""
Write-Host "Development processes launched in dedicated PowerShell windows:" -ForegroundColor Green
Write-Host "  * Backend API:      http://localhost:8000" -ForegroundColor Yellow
Write-Host "  * API Docs:         http://localhost:8000/docs" -ForegroundColor Yellow
Write-Host "  * Frontend Client:  http://localhost:3000" -ForegroundColor Yellow
Write-Host ""

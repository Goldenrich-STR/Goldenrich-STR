# Set console encoding to UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "Starting Goldenrich STR application..." -ForegroundColor Yellow

# Start backend in a new PowerShell window
Write-Host "Launching FastAPI Backend on http://localhost:8001..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; python -m uvicorn server:app --host 0.0.0.0 --port 8001 --reload"

# Start frontend in a new PowerShell window
Write-Host "Launching React Frontend on http://localhost:3000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm start"

Write-Host "Backend and Frontend are starting in separate windows!" -ForegroundColor Yellow

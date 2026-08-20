$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $root "backend"
$mobileDir = Join-Path $root "mobile"
$backendLog = Join-Path $root "backend_server.log"
$backendErrorLog = Join-Path $root "backend_server_error.log"
$backendUrl = "http://127.0.0.1:8001/docs"

function Test-BackendReady {
    try {
        $response = Invoke-WebRequest -Uri $backendUrl -UseBasicParsing -TimeoutSec 5
        return $response.StatusCode -eq 200
    } catch {
        return $false
    }
}

Write-Host "Checking backend..."
if (-not (Test-BackendReady)) {
    Write-Host "Starting backend on port 8001..."
    Start-Process `
        -FilePath "python" `
        -ArgumentList @("-m", "uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001") `
        -WorkingDirectory $backendDir `
        -RedirectStandardOutput $backendLog `
        -RedirectStandardError $backendErrorLog `
        -WindowStyle Hidden

    $ready = $false
    for ($i = 0; $i -lt 60; $i++) {
        if (Test-BackendReady) {
            $ready = $true
            break
        }
        Start-Sleep -Seconds 2
    }

    if (-not $ready) {
        throw "Backend did not start on port 8001. Check $backendLog and $backendErrorLog"
    }
} else {
    Write-Host "Backend is already running."
}

Write-Host "Starting mobile preview..."
Push-Location $mobileDir
try {
    powershell -ExecutionPolicy Bypass -File ".\run_mobile_preview.ps1"
} finally {
    Pop-Location
}

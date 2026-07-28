# Set console encoding to UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = "Stop"

Write-Host "=============================================" -ForegroundColor Yellow
Write-Host "Goldenrich STR Mobile App Launcher" -ForegroundColor Yellow
Write-Host "=============================================" -ForegroundColor Yellow

$avdName = "Pixel_10_Pro"
$emulatorPath = Join-Path $env:LOCALAPPDATA "Android\Sdk\emulator\emulator.exe"
$adbPath = Join-Path $env:LOCALAPPDATA "Android\Sdk\platform-tools\adb.exe"
$backendLog = Join-Path $PSScriptRoot "backend_server.log"
$backendErrorLog = Join-Path $PSScriptRoot "backend_uvicorn.err.log"
$backendOutLog = Join-Path $PSScriptRoot "backend_uvicorn.out.log"
function Ensure-Flutter {
    $flutterCheck = Get-Command flutter -ErrorAction SilentlyContinue

    if ($flutterCheck -eq $null) {
        $detectedPath = "D:\flutter_windows_3.44.1-stable\flutter\bin"
        if (Test-Path "$detectedPath\flutter.bat") {
            Write-Host "Detected Flutter SDK at $detectedPath. Adding to session path..." -ForegroundColor Cyan
            $env:Path = "$env:Path;$detectedPath"
            $flutterCheck = Get-Command flutter -ErrorAction SilentlyContinue
        }
    }

    if ($flutterCheck -eq $null) {
        throw "Flutter SDK is not detected in PATH."
    }
}

function Get-PythonLaunchCommand {
    $pyCommand = Get-Command py -ErrorAction SilentlyContinue
    if ($pyCommand -ne $null) {
        return "py -m uvicorn server:app --host 0.0.0.0 --port 8001 --reload"
    }

    $pythonCommand = Get-Command python -ErrorAction SilentlyContinue
    if ($pythonCommand -ne $null) {
        return "python -m uvicorn server:app --host 0.0.0.0 --port 8001 --reload"
    }

    throw "Neither 'py' nor 'python' is available to start the backend."
}

function Get-RunningEmulatorId {
    if (-not (Test-Path $adbPath)) {
        return $null
    }

    $adbDevices = & $adbPath devices 2>$null
    $match = $adbDevices | Select-String -Pattern "emulator-\d+\s+device" | Select-Object -First 1
    if ($match) {
        return ($match.Matches[0].Value -split "\s+")[0]
    }

    return $null
}

function Wait-ForBoot([string]$deviceId) {
    Write-Host "Waiting for Android boot to complete on $deviceId..." -ForegroundColor Yellow
    for ($i = 0; $i -lt 120; $i++) {
        $bootCompleted = (& $adbPath -s $deviceId shell getprop sys.boot_completed 2>$null).Trim()
        if ($bootCompleted -eq "1") {
            Write-Host "Emulator boot complete." -ForegroundColor Green
            return
        }
        Start-Sleep -Seconds 2
        Write-Host -NoNewline "."
    }
    Write-Host ""
    throw "Emulator boot timed out."
}

function Wake-Emulator([string]$deviceId) {
    if (-not (Test-Path $adbPath)) {
        return
    }

    Write-Host "Waking emulator screen..." -ForegroundColor Cyan
    & $adbPath -s $deviceId shell input keyevent 224 | Out-Null
    & $adbPath -s $deviceId shell wm dismiss-keyguard | Out-Null
    & $adbPath -s $deviceId shell input swipe 540 1800 540 300 200 | Out-Null
}

function Ensure-AdbReverse([string]$deviceId) {
    if (-not $deviceId -or -not (Test-Path $adbPath)) {
        return
    }

    Write-Host "Configuring emulator localhost port forwarding..." -ForegroundColor Cyan
    & $adbPath -s $deviceId reverse tcp:3000 tcp:3000 | Out-Null
    & $adbPath -s $deviceId reverse tcp:8001 tcp:8001 | Out-Null
}

function Ensure-Emulator {
    if (-not (Test-Path $emulatorPath)) {
        Write-Host "Android emulator.exe not found. Assuming a real device is connected." -ForegroundColor Yellow
        return $null
    }

    $deviceId = Get-RunningEmulatorId
    if ($deviceId) {
        Write-Host "Emulator already running: $deviceId" -ForegroundColor Green
        Wake-Emulator $deviceId
        return $deviceId
    }

    Write-Host "Android Emulator is not running. Launching '$avdName'..." -ForegroundColor Cyan
    $avdPath = Join-Path $env:USERPROFILE ".android\avd\$avdName.avd"
    if (Test-Path $avdPath) {
        $lockFiles = Get-ChildItem -Path $avdPath -Filter "*.lock" -Recurse -ErrorAction SilentlyContinue
        if ($lockFiles) {
            Write-Host "Clearing stale emulator lock files..." -ForegroundColor Yellow
            $lockFiles | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
        }
    }

    Start-Process -FilePath $emulatorPath -ArgumentList @("-avd", $avdName, "-no-snapshot-load")
    Write-Host "Waiting for emulator device to appear..." -ForegroundColor Yellow

    for ($i = 0; $i -lt 60; $i++) {
        Start-Sleep -Seconds 2
        $deviceId = Get-RunningEmulatorId
        if ($deviceId) {
            Write-Host "Detected emulator: $deviceId" -ForegroundColor Green
            Wait-ForBoot $deviceId
            Wake-Emulator $deviceId
            return $deviceId
        }
        Write-Host -NoNewline "."
    }

    Write-Host ""
    throw "Failed to detect Android emulator after launch."
}

function Test-BackendReady {
    try {
        $response = Invoke-WebRequest -Uri "http://127.0.0.1:8001/docs" -UseBasicParsing -TimeoutSec 3
        return $response.StatusCode -ge 200 -and $response.StatusCode -lt 500
    } catch {
        return $false
    }
}

function Ensure-Backend {
    if (Test-BackendReady) {
        Write-Host "Backend already running on port 8001." -ForegroundColor Green
        return
    }

    Write-Host "Backend is not running. Starting FastAPI server..." -ForegroundColor Cyan
    $pythonLaunch = Get-PythonLaunchCommand
    Start-Process -FilePath powershell.exe -ArgumentList @(
        "-WindowStyle", "Hidden",
        "-Command",
        "Set-Location '$PSScriptRoot\backend'; $pythonLaunch 1>> '$backendOutLog' 2>> '$backendErrorLog'"
    ) -WindowStyle Hidden

    for ($i = 0; $i -lt 30; $i++) {
        Start-Sleep -Seconds 2
        if (Test-BackendReady) {
            Write-Host "Backend started successfully." -ForegroundColor Green
            return
        }
        Write-Host -NoNewline "."
    }

    Write-Host ""
    Write-Host "Backend did not become ready in time. Check logs:" -ForegroundColor Yellow
    Write-Host "  $backendOutLog" -ForegroundColor Yellow
    Write-Host "  $backendErrorLog" -ForegroundColor Yellow
}

Ensure-Flutter

Ensure-Backend
$deviceId = Ensure-Emulator
Ensure-AdbReverse $deviceId

Write-Host "Flutter detected! Installing dependencies..." -ForegroundColor Green
Set-Location -Path "mobile"
flutter pub get

Write-Host "Launching Flutter App on emulator/device..." -ForegroundColor Green
if ($deviceId) {
    Write-Host "Targeting emulator: $deviceId" -ForegroundColor Green
    flutter run -d $deviceId --device-timeout 90
} else {
    flutter run
}

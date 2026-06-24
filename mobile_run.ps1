# Set console encoding to UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "=============================================" -ForegroundColor Yellow
Write-Host "Goldenrich STR Mobile App Launcher (Auto)" -ForegroundColor Yellow
Write-Host "=============================================" -ForegroundColor Yellow

# Check if flutter is installed
$flutterCheck = Get-Command flutter -ErrorAction SilentlyContinue

# Fallback: check if we can locate it in D:\flutter_windows_3.44.1-stable
if ($flutterCheck -eq $null) {
    $detectedPath = "D:\flutter_windows_3.44.1-stable\flutter\bin"
    if (Test-Path "$detectedPath\flutter.bat") {
        Write-Host "Detected Flutter SDK at $detectedPath. Adding to session path..." -ForegroundColor Cyan
        $env:Path = "$env:Path;$detectedPath"
        $flutterCheck = Get-Command flutter -ErrorAction SilentlyContinue
    }
}

if ($flutterCheck -eq $null) {
    Write-Host "[ERROR] Flutter SDK is not detected in your system PATH." -ForegroundColor Red
    exit 1
}

$emulatorPath = "C:\Users\Legend\AppData\Local\Android\Sdk\emulator\emulator.exe"
$adbPath = "C:\Users\Legend\AppData\Local\Android\Sdk\platform-tools\adb.exe"

# 1. Check if any device is already connected and fully online
$deviceOnline = $false
if (Test-Path $adbPath) {
    $adbDevices = & $adbPath devices
    foreach ($line in $adbDevices) {
        if ($line -match "emulator-\d+\s+device" -or ($line -match "\bdevice\b" -and -not ($line -match "List of"))) {
            Write-Host "Found active and online device: $line" -ForegroundColor Green
            $deviceOnline = $true
            break
        }
    }
}

# 2. If no device is online, launch the emulator
if (-not $deviceOnline) {
    if (Test-Path $emulatorPath) {
        Write-Host "No active Android device found. Launching Emulator 'Pixel_10_Pro'..." -ForegroundColor Cyan
        
        # Clear lock files if they exist to prevent "Running multiple emulators" fatal error
        $avdPath = Join-Path $env:USERPROFILE ".android\avd\Pixel_10_Pro.avd"
        if (Test-Path $avdPath) {
            $lockFiles = Get-ChildItem -Path $avdPath -Filter "*.lock" -Recurse -ErrorAction SilentlyContinue
            if ($lockFiles) {
                Write-Host "Clearing stale emulator lock files..." -ForegroundColor Yellow
                $lockFiles | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
            }
        }
        
        # Launch emulator with -no-snapshot to prevent qcow2 or snapshot corruption crashes
        Start-Process $emulatorPath -ArgumentList "-avd Pixel_10_Pro -no-snapshot"
        Write-Host "Waiting for emulator to start (this can take up to 2 minutes)..." -ForegroundColor Yellow
        
        $timeout = 120 # seconds
        $elapsed = 0
        $booted = $false
        
        while ($elapsed -lt $timeout) {
            Start-Sleep -Seconds 3
            $elapsed += 3
            
            # Check if device is detected by adb
            $adbCheck = & $adbPath devices 2>&1
            if ($adbCheck -match "emulator-\d+\s+device") {
                # Check if Android OS boot is complete
                $bootStatus = & $adbPath shell getprop sys.boot_completed 2>&1
                if ($bootStatus.Trim() -eq "1") {
                    $booted = $true
                    break
                } else {
                    Write-Host -NoNewline " (Android is starting...)"
                }
            } else {
                Write-Host -NoNewline "."
            }
        }
        Write-Host ""
        
        if ($booted) {
            Write-Host "Emulator is fully booted and ready!" -ForegroundColor Green
            Start-Sleep -Seconds 2
        } else {
            Write-Host "Emulator is taking longer to boot. Proceeding anyway..." -ForegroundColor Yellow
        }
    } else {
        Write-Host "[WARNING] Emulator path not found at $emulatorPath." -ForegroundColor Yellow
    }
}

Write-Host "Flutter detected! Installing dependencies..." -ForegroundColor Green
Set-Location -Path "mobile"
flutter pub get

Write-Host "Launching Flutter App on emulator/device..." -ForegroundColor Green
$connectedDevices = & $adbPath devices 2>&1 | Out-String
if ($connectedDevices -match "emulator-\d+") {
    $deviceId = $Matches[0]
    Write-Host "Targeting Emulator: $deviceId" -ForegroundColor Green
    flutter run -d $deviceId
} else {
    flutter run
}

# Set console encoding to UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "=============================================" -ForegroundColor Yellow
Write-Host "Goldenrich STR Mobile App Launcher" -ForegroundColor Yellow
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

# Auto-start Android Emulator if no mobile device is active
$emulatorPath = "C:\Users\Legend\AppData\Local\Android\Sdk\emulator\emulator.exe"
if (Test-Path $emulatorPath) {
    # Check if any android/emulator device is connected
    $androidDevices = flutter devices | Select-String -Pattern "android|emulator-[0-9]"
    
    if ($androidDevices -eq $null -or $androidDevices.Count -eq 0) {
        Write-Host "Android Emulator is not running. Launching 'Pixel_10_Pro'..." -ForegroundColor Cyan
        
        # Clear lock files if they exist to prevent "Running multiple emulators" fatal error
        $avdPath = Join-Path $env:USERPROFILE ".android\avd\Pixel_10_Pro.avd"
        if (Test-Path $avdPath) {
            $lockFiles = Get-ChildItem -Path $avdPath -Filter "*.lock" -Recurse -ErrorAction SilentlyContinue
            if ($lockFiles) {
                Write-Host "Clearing stale emulator lock files..." -ForegroundColor Yellow
                $lockFiles | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
            }
        }
        
        Start-Process $emulatorPath -ArgumentList "-avd Pixel_10_Pro"
        Write-Host "Waiting for emulator to start and connect (up to 45 seconds)..." -ForegroundColor Yellow
        
        $sdkPath = Split-Path (Split-Path $emulatorPath -Parent) -Parent
        $adbPath = Join-Path $sdkPath "platform-tools\adb.exe"
        
        $timeout = 45 # seconds
        $elapsed = 0
        $deviceReady = $false
        
        while ($elapsed -lt $timeout) {
            if (Test-Path $adbPath) {
                $adbCheck = & $adbPath devices 2>&1
                if ($adbCheck -match "emulator-\d+\s+device") {
                    $deviceReady = $true
                    break
                }
            } else {
                # Fallback to flutter devices if adb is not found
                $flutterCheck = flutter devices | Select-String -Pattern "emulator-[0-9]"
                if ($flutterCheck -ne $null -and $flutterCheck.Count -gt 0) {
                    $deviceReady = $true
                    break
                }
            }
            Start-Sleep -Seconds 2
            $elapsed += 2
            Write-Host -NoNewline "."
        }
        Write-Host ""
        
        if ($deviceReady) {
            Write-Host "Emulator is ready and online!" -ForegroundColor Green
            # Additional brief sleep to ensure emulator services are fully ready
            Start-Sleep -Seconds 3
        } else {
            Write-Host "Emulator launch timed out or still booting. Proceeding anyway..." -ForegroundColor Yellow
        }
    }
}

Write-Host "Flutter detected! Installing dependencies..." -ForegroundColor Green
Set-Location -Path "mobile"
flutter pub get

Write-Host "Launching Flutter App on emulator/device..." -ForegroundColor Green
$connectedDevices = flutter devices | Out-String
if ($connectedDevices -match "emulator-\d+") {
    $deviceId = $Matches[0]
    Write-Host "Targeting Emulator: $deviceId" -ForegroundColor Green
    flutter run -d $deviceId
} else {
    flutter run
}

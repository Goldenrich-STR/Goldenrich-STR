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
        Start-Process $emulatorPath -ArgumentList "-avd Pixel_10_Pro"
        Write-Host "Waiting 15 seconds for emulator to start..." -ForegroundColor Yellow
        Start-Sleep -Seconds 15
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

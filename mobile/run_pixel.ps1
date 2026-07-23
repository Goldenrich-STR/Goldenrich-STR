$ErrorActionPreference = "Stop"

$env:ANDROID_AVD_HOME = "D:\Android\avd"
$emulator = Join-Path $env:LOCALAPPDATA "Android\Sdk\emulator\emulator.exe"
$adb = Join-Path $env:LOCALAPPDATA "Android\Sdk\platform-tools\adb.exe"

Write-Host "Starting Pixel_10_Pro emulator..."
Start-Process -FilePath $emulator -ArgumentList @("-avd", "Pixel_10_Pro", "-no-snapshot-load")

Write-Host "Waiting for emulator-5554..."
& $adb wait-for-device

Write-Host "Waiting for Android boot to complete..."
$booted = ""
for ($i = 0; $i -lt 90; $i++) {
    $booted = (& $adb -s emulator-5554 shell getprop sys.boot_completed 2>$null).Trim()
    if ($booted -eq "1") {
        break
    }
    Start-Sleep -Seconds 2
}

if ($booted -ne "1") {
    throw "Pixel_10_Pro did not finish booting. Keep the emulator window open and try again."
}

Write-Host "Pixel_10_Pro is ready. Running Flutter app..."
flutter run -d emulator-5554 --device-timeout 60

$ErrorActionPreference = "Stop"

$env:ANDROID_AVD_HOME = "D:\Android\avd"
$emulator = Join-Path $env:LOCALAPPDATA "Android\Sdk\emulator\emulator.exe"
$adb = Join-Path $env:LOCALAPPDATA "Android\Sdk\platform-tools\adb.exe"

Write-Host "Cleaning old emulator/adb state..."
Get-Process emulator,qemu-system-x86_64 -ErrorAction SilentlyContinue | Stop-Process -Force
try {
    & $adb kill-server 2>$null
} catch {
    Write-Host "ADB server was not running. Continuing..."
}
Start-Sleep -Seconds 3
& $adb start-server

Write-Host "Starting Pixel_10_Pro emulator..."
Start-Process -FilePath $emulator -ArgumentList @("-avd", "Pixel_10_Pro", "-no-snapshot-load")

Write-Host "Waiting for emulator-5554..."
& $adb wait-for-device

Write-Host "Waiting for Android boot to complete..."
$booted = ""
for ($i = 0; $i -lt 180; $i++) {
    $booted = (& $adb -s emulator-5554 shell getprop sys.boot_completed 2>$null).Trim()
    if ($booted -eq "1") {
        break
    }
    Start-Sleep -Seconds 2
}

if ($booted -ne "1") {
    Write-Host "Pixel_10_Pro boot is stuck. Restarting once with wiped emulator data..."
    Get-Process emulator,qemu-system-x86_64 -ErrorAction SilentlyContinue | Stop-Process -Force
    Start-Sleep -Seconds 5
    Start-Process -FilePath $emulator -ArgumentList @("-avd", "Pixel_10_Pro", "-no-snapshot-load", "-wipe-data")
    & $adb wait-for-device

    $booted = ""
    for ($i = 0; $i -lt 180; $i++) {
        $booted = (& $adb -s emulator-5554 shell getprop sys.boot_completed 2>$null).Trim()
        if ($booted -eq "1") {
            break
        }
        Start-Sleep -Seconds 2
    }

    if ($booted -ne "1") {
        throw "Pixel_10_Pro did not finish booting after retry. Open Android Studio > Device Manager and cold boot or recreate the AVD."
    }
}

Write-Host "Waiting for Android package installer to be ready..."
$ready = $false
for ($i = 0; $i -lt 180; $i++) {
    $bootAnim = (& $adb -s emulator-5554 shell getprop init.svc.bootanim 2>$null).Trim()
    $packages = (& $adb -s emulator-5554 shell pm list packages android 2>$null)
    if ($bootAnim -eq "stopped" -and $LASTEXITCODE -eq 0 -and $packages) {
        $ready = $true
        break
    }
    Start-Sleep -Seconds 2
}

if (-not $ready) {
    throw "Pixel_10_Pro booted, but Android package installer was not ready. Try running the script again."
}

Start-Sleep -Seconds 10
Write-Host "Pixel_10_Pro is ready. Running Flutter app..."
flutter run -d emulator-5554 --device-timeout 60 --no-resident
if ($LASTEXITCODE -ne 0) {
    Write-Host "Flutter run failed once. Waiting 30 seconds and retrying..."
    Start-Sleep -Seconds 30
    flutter run -d emulator-5554 --device-timeout 60 --no-resident
}

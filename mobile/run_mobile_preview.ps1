$ErrorActionPreference = "Stop"

$avdName = "Pixel_10_Pro"
$deviceId = "emulator-5554"
$packageNames = @(
    "com.xspace360.app.dev",
    "com.xspace360.app",
    "com.goldenrich.str.goldenrich_str_mobile"
)
$env:ANDROID_AVD_HOME = "D:\Android\avd"
$emulator = Join-Path $env:LOCALAPPDATA "Android\Sdk\emulator\emulator.exe"
$adb = Join-Path $env:LOCALAPPDATA "Android\Sdk\platform-tools\adb.exe"

function Invoke-IgnoreError {
    param(
        [scriptblock]$Command
    )
    try {
        & $Command | Out-Null
    } catch {
    }
}

function Assert-FileExists {
    param(
        [string]$Path,
        [string]$Label
    )
    if (-not (Test-Path -LiteralPath $Path)) {
        throw "$Label not found at $Path"
    }
}

function Wait-ForDevice {
    param(
        [int]$Seconds
    )
    for ($i = 0; $i -lt $Seconds; $i += 2) {
        $devices = & $adb devices 2>$null
        if ($devices -match "$deviceId\s+device") {
            return $true
        }
        Start-Sleep -Seconds 2
    }
    return $false
}

function Wait-ForBoot {
    param(
        [int]$Seconds
    )
    for ($i = 0; $i -lt $Seconds; $i += 2) {
        $booted = (& $adb -s $deviceId shell getprop sys.boot_completed 2>$null).Trim()
        if ($booted -eq "1") {
            return $true
        }
        Start-Sleep -Seconds 2
    }
    return $false
}

function Wait-ForPackageManager {
    param(
        [int]$Seconds
    )
    for ($i = 0; $i -lt $Seconds; $i += 2) {
        $bootAnim = (& $adb -s $deviceId shell getprop init.svc.bootanim 2>$null).Trim()
        $packages = (& $adb -s $deviceId shell pm list packages android 2>$null)
        if ($bootAnim -eq "stopped" -and $LASTEXITCODE -eq 0 -and $packages) {
            return $true
        }
        Start-Sleep -Seconds 2
    }
    return $false
}

function Start-PreviewEmulator {
    param(
        [switch]$WipeData
    )
    $args = @(
        "-avd", $avdName,
        "-no-snapshot-load",
        "-no-snapshot-save",
        "-gpu", "swiftshader_indirect"
    )
    if ($WipeData) {
        $args += "-wipe-data"
    }

    Write-Host "Starting $avdName emulator..."
    Start-Process -FilePath $emulator -ArgumentList $args
}

Assert-FileExists $emulator "Android emulator"
Assert-FileExists $adb "ADB"

$availableAvds = & $emulator -list-avds
if ($availableAvds -notcontains $avdName) {
    throw "$avdName AVD not found. Open Android Studio > Device Manager and create/start Pixel_10_Pro."
}

Write-Host "Cleaning old emulator/adb state..."
Get-Process emulator,qemu-system-x86_64 -ErrorAction SilentlyContinue | Stop-Process -Force
Invoke-IgnoreError { & $adb kill-server }
Start-Sleep -Seconds 3
& $adb start-server | Out-Null

Start-PreviewEmulator

Write-Host "Waiting for $deviceId..."
$deviceReady = Wait-ForDevice -Seconds 240
if (-not $deviceReady) {
    Write-Host "$avdName did not connect. Retrying once with wiped emulator data..."
    Get-Process emulator,qemu-system-x86_64 -ErrorAction SilentlyContinue | Stop-Process -Force
    Invoke-IgnoreError { & $adb kill-server }
    Start-Sleep -Seconds 3
    & $adb start-server | Out-Null
    Start-PreviewEmulator -WipeData
    $deviceReady = Wait-ForDevice -Seconds 300
}
if (-not $deviceReady) {
    throw "$avdName did not open/connect. Restart Windows or recreate this AVD from Android Studio Device Manager."
}

Write-Host "Waiting for Android boot to complete..."
$bootReady = Wait-ForBoot -Seconds 360
if (-not $bootReady) {
    Write-Host "$avdName boot is stuck. Retrying once with wiped emulator data..."
    Get-Process emulator,qemu-system-x86_64 -ErrorAction SilentlyContinue | Stop-Process -Force
    Start-Sleep -Seconds 5
    Start-PreviewEmulator -WipeData
    if (-not (Wait-ForDevice -Seconds 300)) {
        throw "$avdName did not reconnect after wipe retry."
    }
    $bootReady = Wait-ForBoot -Seconds 420
}
if (-not $bootReady) {
    throw "$avdName did not finish booting after retry. Recreate Pixel_10_Pro in Android Studio Device Manager."
}

Write-Host "Waiting for Android package installer to be ready..."
if (-not (Wait-ForPackageManager -Seconds 240)) {
    throw "$avdName booted, but Android package installer was not ready. Run this script again."
}

Start-Sleep -Seconds 10

Write-Host "Removing old installed app builds..."
foreach ($packageName in $packageNames) {
    Invoke-IgnoreError { & $adb -s $deviceId uninstall $packageName }
}

Write-Host "Running Flutter mobile preview..."
flutter run -d $deviceId --flavor dev --device-timeout 60 --no-resident `
    --dart-define=APP_ENV=dev `
    --dart-define=API_BASE_URL=http://10.0.2.2:8001 `
    --dart-define=PAYMENT_MODE=test `
    --dart-define=DEBUG_FEATURES=true

if ($LASTEXITCODE -ne 0) {
    Write-Host "Flutter run failed once. Waiting 30 seconds and retrying..."
    Start-Sleep -Seconds 30
    flutter run -d $deviceId --flavor dev --device-timeout 60 --no-resident `
        --dart-define=APP_ENV=dev `
        --dart-define=API_BASE_URL=http://10.0.2.2:8001 `
        --dart-define=PAYMENT_MODE=test `
        --dart-define=DEBUG_FEATURES=true
}

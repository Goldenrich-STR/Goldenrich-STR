$ErrorActionPreference = "Stop"

$mobileDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Push-Location $mobileDir
try {
    powershell -ExecutionPolicy Bypass -File ".\run_mobile_preview.ps1"
} finally {
    Pop-Location
}

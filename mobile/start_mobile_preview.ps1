$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$parentScript = Join-Path (Split-Path -Parent $scriptDir) "start_mobile_preview.ps1"
if (Test-Path $parentScript) {
    powershell -ExecutionPolicy Bypass -File $parentScript
} else {
    throw "Root start_mobile_preview.ps1 script not found at $parentScript"
}

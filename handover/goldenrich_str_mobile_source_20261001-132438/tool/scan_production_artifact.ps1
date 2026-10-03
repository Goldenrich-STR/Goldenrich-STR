param(
  [Parameter(Mandatory = $true)]
  [string]$ArtifactPath
)

if (!(Test-Path -LiteralPath $ArtifactPath)) {
  Write-Error "Artifact not found: $ArtifactPath"
  exit 2
}

$blocked = @(
  "localhost:8001",
  "127.0.0.1",
  "10.0.2.2",
  "0.0.0.0",
  "uat.x-space360.in"
)

$bytes = [System.IO.File]::ReadAllBytes((Resolve-Path -LiteralPath $ArtifactPath))
$text = [System.Text.Encoding]::Latin1.GetString($bytes)
$hits = @()
foreach ($needle in $blocked) {
  if ($text.Contains($needle)) {
    $hits += $needle
  }
}

if ($hits.Count -gt 0) {
  Write-Error "Production artifact contains blocked endpoint strings: $($hits -join ', ')"
  exit 1
}

Write-Host "Production artifact scan passed: $ArtifactPath"

$ErrorActionPreference="Stop"
$base="http://10.0.0.239:3000"

# ensure proofs folder
mkdir .\proofs -ErrorAction SilentlyContinue | Out-Null

Write-Host "=== A) HEALTH ==="
curl.exe -s -i "$base/health"

Write-Host "`n=== B) AUTH/PROFILES PROOF ==="
.\scripts\proof-auth.ps1

Write-Host "`n=== DONE ==="

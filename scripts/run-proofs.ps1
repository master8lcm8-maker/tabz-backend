$ErrorActionPreference="Stop"

# Base URL: prefer env override, else default to localhost
$base = $env:TABZ_BASE
if ([string]::IsNullOrWhiteSpace($base)) { $base = "http://127.0.0.1:3000" }

"BASE=$base"

# 0) Health gate (never run proofs if backend isn't up)
$r = Invoke-WebRequest -UseBasicParsing -Uri "$base/health" -TimeoutSec 5
if ($r.StatusCode -ne 200) { throw "FAIL: health not 200" }
"HEALTH_OK $($r.StatusCode)"

# 1) Proofs (add more here as we finish milestones)
$proofs = @(
  "FV24-venues-proof.ps1",
  "M27-profiles-upload-proof.ps1"
)

foreach($p in $proofs){
  $fp = Join-Path $PSScriptRoot $p
  if (!(Test-Path $fp)) { throw "MISSING_PROOF_FILE: $fp" }

  "=== RUN $p ==="
  powershell -NoProfile -ExecutionPolicy Bypass -File $fp
  if ($LASTEXITCODE -ne 0) { throw "FAIL_PROOF_EXITCODE: $p ($LASTEXITCODE)" }
  "=== PASS $p ==="
}

"ALL_PROOFS_PASS"

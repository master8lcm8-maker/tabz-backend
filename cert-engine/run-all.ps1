param(
  [ValidateSet("pillar3","pillar4","pillar5","all")]
  [string]$Pillar = "all"
)

$ErrorActionPreference = "Stop"

Write-Host "=== BUILD cert-engine ==="
npx tsc -p .\tsconfig.cert-engine.json

function Run-One($p) {
  Write-Host "`n=== RUN $p ==="
  node .\dist\cert-engine\run-cert.js $p
}

if ($Pillar -eq "all") {
  Run-One "pillar3"
  Run-One "pillar4"
  Run-One "pillar5"
} else {
  Run-One $Pillar
}

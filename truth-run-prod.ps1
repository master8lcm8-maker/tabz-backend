param([Parameter(Mandatory=$true)][string]$Base)
$ErrorActionPreference = "Stop"
$ts = Get-Date -Format "yyyyMMdd-HHmmss"
$out = Join-Path (Get-Location) ("truth-run-prod-" + $ts + ".log")
function Log($s){ ("[{0}] {1}" -f (Get-Date -Format "s"), $s) | Tee-Object -FilePath $out -Append | Out-Null }
function J($obj){ $obj | ConvertTo-Json -Depth 30 }
function TryJson($label, [scriptblock]$fn){
  Log "== $label =="
  try {
    $r = & $fn
    (J $r) | Tee-Object -FilePath $out -Append | Out-Null
    Log "== $label OK =="
    return $r
  } catch {
    Log "== $label FAIL =="
    if ($_.ErrorDetails -and $_.ErrorDetails.Message) { Log $_.ErrorDetails.Message } else { Log $_.Exception.Message }
    throw
  }
}
Log "BASE=$Base"
Log "== HEALTH =="
$health = Invoke-WebRequest "$Base/health" -UseBasicParsing
Log ("healthStatus=" + $health.StatusCode)
$ownerBody = @{ email="owner@tabz.app"; password="password" } | ConvertTo-Json
$ownerAuth = TryJson "LOGIN OWNER" { Invoke-RestMethod "$Base/auth/login-owner" -Method POST -ContentType "application/json" -Body $ownerBody }
$ownerToken = $ownerAuth.access_token
if (-not $ownerToken) { throw "Missing access_token in owner login response" }
Log ("ownerTokenLen=" + $ownerToken.Length)
TryJson "USERS/ME (OWNER)" { Invoke-RestMethod "$Base/users/me" -Headers @{ Authorization="Bearer $ownerToken" } }
$buyerBody = @{ email="buyer@tabz.app"; password="password" } | ConvertTo-Json
$buyerAuth = TryJson "LOGIN BUYER" { Invoke-RestMethod "$Base/auth/login-buyer" -Method POST -ContentType "application/json" -Body $buyerBody }
$buyerToken = $buyerAuth.access_token
if (-not $buyerToken) { throw "Missing access_token in buyer login response" }
Log ("buyerTokenLen=" + $buyerToken.Length)
TryJson "USERS/ME (BUYER)" { Invoke-RestMethod "$Base/users/me" -Headers @{ Authorization="Bearer $buyerToken" } }
$staffBody = @{ email="staff@tabz.app"; password="password" } | ConvertTo-Json
$staffAuth = TryJson "LOGIN STAFF" { Invoke-RestMethod "$Base/auth/login-staff" -Method POST -ContentType "application/json" -Body $staffBody }
$staffToken = $staffAuth.access_token
if (-not $staffToken) { throw "Missing access_token in staff login response" }
Log ("staffTokenLen=" + $staffToken.Length)
TryJson "AUTH/ME (STAFF)" { Invoke-RestMethod "$Base/auth/me" -Headers @{ Authorization="Bearer $staffToken" } }
foreach ($p in @("/wallet/summary","/profiles/me")) {
  Log "== OPTIONAL GET $p =="
  try {
    $r = Invoke-RestMethod ($Base + $p) -Headers @{ Authorization="Bearer $buyerToken" }
    (J $r) | Tee-Object -FilePath $out -Append | Out-Null
    Log "optionalOK=true"
  } catch {
    Log ("optionalOK=false err=" + $_.Exception.Message)
  }
}
Log "TRUTH_RUN_DONE file=$out"
Write-Output $out

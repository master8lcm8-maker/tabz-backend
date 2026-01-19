$ErrorActionPreference = "Stop"
$base = "https://tabz-backend-bxxbf.ondigitalocean.app"

Write-Host "R10 OWNER->VENUE PROD PROOF START"

$r = Invoke-RestMethod -TimeoutSec 20 -Method POST `
  -Uri "$base/auth/login" `
  -ContentType "application/json" `
  -Body (@{ email="owner@tabz.app"; password="password" } | ConvertTo-Json)

if (-not $r.access_token) { throw "NO TOKEN RETURNED" }
$token = $r.access_token

$auth = Invoke-RestMethod -TimeoutSec 20 -Method GET `
  -Uri "$base/auth/me" `
  -Headers @{ Authorization = "Bearer $token" }

if (-not $auth.userId) { throw "auth/me missing userId" }
if ($auth.role -ne "owner") { throw "auth/me role expected owner, got: $($auth.role)" }
if (-not $auth.profileId) { throw "auth/me missing profileId" }
if (-not $auth.venueId) { throw "auth/me missing venueId" }

Write-Host "R10 OWNER->VENUE PROD PROOF PASSED ✅"
Write-Host ("venueId=" + $auth.venueId)

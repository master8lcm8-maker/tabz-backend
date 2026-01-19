$ErrorActionPreference = "Stop"

$base = "https://tabz-backend-bxxbf.ondigitalocean.app"

Write-Host "R9 AUTH PROD PROOF START"

$r = Invoke-RestMethod -TimeoutSec 20 -Method POST `
  -Uri "$base/auth/login" `
  -ContentType "application/json" `
  -Body (@{
    email = "owner@tabz.app"
    password = "password"
  } | ConvertTo-Json)

if (-not $r.access_token) { throw "NO TOKEN RETURNED" }

$token = $r.access_token

$auth = Invoke-RestMethod -TimeoutSec 20 -Method GET `
  -Uri "$base/auth/me" `
  -Headers @{ Authorization = "Bearer $token" }

if (-not $auth.userId) { throw "auth/me missing userId" }
if (-not $auth.profileId) { throw "auth/me missing profileId" }

$profile = Invoke-RestMethod -TimeoutSec 20 -Method GET `
  -Uri "$base/profiles/me" `
  -Headers @{ Authorization = "Bearer $token" }

if (-not $profile.profile.id) { throw "profiles/me missing profile.id" }

Write-Host "R9 AUTH PROD PROOF PASSED ✅"

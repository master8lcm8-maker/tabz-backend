$ErrorActionPreference="Stop"

function Decode-JwtPayload($jwt){
  $parts = $jwt.Split('.')
  if($parts.Count -lt 2){ throw "Not a JWT" }
  $p = $parts[1].Replace('-','+').Replace('_','/')
  switch ($p.Length % 4) { 2 {$p+='=='} 3 {$p+='='} }
  $json = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($p))
  $json | ConvertFrom-Json | ConvertTo-Json -Depth 10
}

$base="http://10.0.0.239:3000"

Write-Host "=== 1) Seed (idempotent) ==="
Invoke-RestMethod -Method POST -Uri "$base/dev-seed/all" | Out-Null
Invoke-RestMethod -Method POST -Uri "$base/dev-seed/all" | Out-Null

Write-Host "`n=== 2) DB uniqueness check (userId+type must be exactly 1) ==="
sqlite3 .\tabz-dev.sqlite "SELECT userId, type, COUNT(*) AS c FROM profiles GROUP BY userId, type HAVING c <> 1;"

Write-Host "`n=== 3) Tokens ==="
$ownerToken=(Invoke-RestMethod -Method POST -Uri "$base/auth/login-owner" -Body (@{email="owner@tabz.app";password="password"}|ConvertTo-Json) -ContentType "application/json").access_token
$buyerToken=(Invoke-RestMethod -Method POST -Uri "$base/auth/login-buyer" -Body (@{email="buyer@tabz.app";password="password"}|ConvertTo-Json) -ContentType "application/json").access_token
$staffToken=(Invoke-RestMethod -Method POST -Uri "$base/auth/login-staff" -Body (@{email="staff@tabz.app";password="password123"}|ConvertTo-Json) -ContentType "application/json").access_token

Write-Host "`n=== 4) /profiles/me (owner/buyer/staff) ==="
"OWNER:"; curl.exe -s -H "Authorization: Bearer $ownerToken" "$base/profiles/me"; ""
"BUYER:"; curl.exe -s -H "Authorization: Bearer $buyerToken" "$base/profiles/me"; ""
"STAFF:"; curl.exe -s -H "Authorization: Bearer $staffToken" "$base/profiles/me"; ""

Write-Host "`n=== 5) /auth/me (owner/buyer/staff) ==="
"OWNER:"; curl.exe -s -H "Authorization: Bearer $ownerToken" "$base/auth/me"; ""
"BUYER:"; curl.exe -s -H "Authorization: Bearer $buyerToken" "$base/auth/me"; ""
"STAFF:"; curl.exe -s -H "Authorization: Bearer $staffToken" "$base/auth/me"; ""

Write-Host "`n=== 6) Staff JWT payload ==="
"STAFF JWT PAYLOAD:"; Decode-JwtPayload $staffToken

Write-Host "`n=== DONE ==="

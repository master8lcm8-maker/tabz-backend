$ErrorActionPreference="Stop"
cd D:\TABZ\tabz-backend-full\tabz-backend

$base="http://127.0.0.1:3000"

# Load DATABASE_URL + force SSL (for this shell)
$dburl=((Get-Content .\.env | Where-Object { $_ -match '^\s*DATABASE_URL\s*=' } | Select-Object -First 1) -replace '^\s*DATABASE_URL\s*=\s*','').Trim()
if(-not $dburl){ throw "DATABASE_URL not found in .env" }
$env:DATABASE_URL=$dburl
$env:DB_SSL="true"
$env:PGSSLMODE="require"

# Kill anything on :3000
$portPid=(netstat -ano | findstr ":3000" | findstr "LISTENING" | ForEach-Object { ($_ -split '\s+')[-1] } | Select-Object -First 1)
if($portPid){ taskkill /PID $portPid /F | Out-Null; Start-Sleep -Seconds 1 }

# Build (ensures new module compiled)
npm run build

# Start backend w/ logs
$proofDir=".\proofs"; if(!(Test-Path $proofDir)){New-Item -ItemType Directory -Path $proofDir | Out-Null}
$ts=(Get-Date).ToString("yyyyMMdd-HHmmss")
$out="$proofDir\run-$ts.log"; $err="$proofDir\run-$ts.err.log"
Start-Process -FilePath "node" -ArgumentList @("-r","dotenv/config","dist/main.js") -RedirectStandardOutput $out -RedirectStandardError $err -WindowStyle Hidden

# Wait for /health
$ok=$false
1..80 | ForEach-Object {
  Start-Sleep -Milliseconds 300
  try { $h=Invoke-RestMethod ($base+"/health"); if($h.status -eq "ok"){ $ok=$true } } catch {}
  if($ok){ return }
}
if(-not $ok){
  "FAILED: backend not healthy"
  "STDERR_TAIL:"; if(Test-Path $err){ Get-Content $err -Tail 260 }
  throw "backend not healthy"
}
"HEALTH_OK"

function J($o){ $o | ConvertTo-Json -Depth 20 -Compress }
function Token($r){
  if($r -and $r.PSObject.Properties.Name -contains "access_token" -and $r.access_token){ return [string]$r.access_token }
  if($r -and $r.PSObject.Properties.Name -contains "accessToken"   -and $r.accessToken){   return [string]$r.accessToken }
  if($r -and $r.PSObject.Properties.Name -contains "token"         -and $r.token){         return [string]$r.token }
  return $null
}

# Login buyer (proof user)
$tokBuyer = Token (Invoke-RestMethod -Method Post -Uri ($base+"/auth/login-buyer") -ContentType "application/json" -Body (J @{email="buyer@tabz.app";password="password"}))
if(-not $tokBuyer){ throw "login buyer failed" }

# Request deletion (returns confirmToken in DEV for proof)
$req = Invoke-RestMethod -Method Post -Uri ($base+"/account-deletion/request") -Headers @{Authorization=("Bearer "+$tokBuyer)} -ContentType "application/json" -Body (J @{reason=("P5-PROOF "+$ts)})
$token = $null
if($req.PSObject.Properties.Name -contains "confirmToken"){ $token = [string]$req.confirmToken }
if(-not $token){ throw "request did not return confirmToken (expected for proof)" }
"REQUEST_OK token=$token"

# Confirm deletion
$conf = Invoke-RestMethod -Method Post -Uri ($base+"/account-deletion/confirm") -Headers @{Authorization=("Bearer "+$tokBuyer)} -ContentType "application/json" -Body (J @{token=$token})
"CONFIRM_OK ok=$($conf.ok)"

# Determine buyer id (best-effort from /profiles/me)
$me = $null
try { $me = Invoke-RestMethod -Method Get -Uri ($base+"/profiles/me") -Headers @{Authorization=("Bearer "+$tokBuyer)} } catch {}
$userId = 0
if($me){
  if($me.PSObject.Properties.Name -contains "id"){ $userId = [int]$me.id }
  elseif($me.PSObject.Properties.Name -contains "userId"){ $userId = [int]$me.userId }
}
if(-not $userId){ $userId = 4 } # fallback to known demo user id used earlier
"USER_ID=$userId"

# Direct DO Postgres readback
node .\scripts\do-p5-account-deletion-readback.pg.js $token $userId

# Negative proof: token must NOT be in local SQLite
node .\scripts\local-sqlite-check-deletion-token.js $token

$ErrorActionPreference="Stop"
$base="http://127.0.0.1:3000"
$proofDir=".\proofs"
if(!(Test-Path $proofDir)){ New-Item -ItemType Directory -Path $proofDir | Out-Null }
$ts=(Get-Date).ToString("yyyyMMdd-HHmmss")
$proof=(Join-Path $proofDir ("PROOF-P3-FREEBOARD-REWARD-WALLET-" + $ts + ".txt"))

function J($o){ $o | ConvertTo-Json -Depth 20 -Compress }
function Write0([string]$s){ [System.IO.File]::WriteAllText($proof, $s, [System.Text.UTF8Encoding]::new($false)) }
function Append([string]$s){ [System.IO.File]::AppendAllText($proof, $s, [System.Text.UTF8Encoding]::new($false)) }

function Get-TokenFromResponse($r){
  if($null -ne $r -and $r.PSObject.Properties.Name -contains "access_token" -and $r.access_token){ return [string]$r.access_token }
  if($null -ne $r -and $r.PSObject.Properties.Name -contains "accessToken"   -and $r.accessToken){   return [string]$r.accessToken }
  if($null -ne $r -and $r.PSObject.Properties.Name -contains "token"         -and $r.token){         return [string]$r.token }
  return $null
}
function LoginTok([string]$path,[string]$email){
  $r = Invoke-RestMethod -Method Post -Uri ($base + $path) -ContentType "application/json" -Body (J @{email=$email;password="password"})
  $t = Get-TokenFromResponse $r
  if(-not $t){ throw ("No token returned from " + $path) }
  return $t
}

# sanity (fail fast if server not reachable)
$h = Invoke-RestMethod ($base + "/health")
Write0 ("ANCHOR_LOCAL=" + (Get-Date).ToString("o") + "`r`nHEALTH=" + (J $h) + "`r`n")

# login
$tokOwner=$null
try { $tokOwner = LoginTok "/auth/login-owner" "owner@tabz.app" } catch { }
if(-not $tokOwner){ $tokOwner = LoginTok "/auth/login-buyer" "buyer@tabz.app" }
$tokBuyer = LoginTok "/auth/login-buyer" "buyer@tabz.app"

# create drop + claim
$dropBody = @{ venueId=1; title=("P3 proof drop " + $ts); rewardCents=111; expiresInMinutes=60 }
$drop = Invoke-RestMethod -Method Post -Uri ($base + "/freeboard/drops") -Headers @{Authorization=("Bearer " + $tokOwner)} -ContentType "application/json" -Body (J $dropBody)

$code=$null
if($drop.PSObject.Properties.Name -contains "claimCode"){ $code=[string]$drop.claimCode }
if(-not $code -and $drop.PSObject.Properties.Name -contains "claim_code"){ $code=[string]$drop.claim_code }
if(-not $code){ throw "createDrop missing claimCode/claim_code" }

$claim = Invoke-RestMethod -Method Post -Uri ($base + "/freeboard/claim") -Headers @{Authorization=("Bearer " + $tokBuyer)} -ContentType "application/json" -Body (J @{code=$code})
$claimId = [int]$claim.id
Append ("`r`nCREATE_DROP_RESPONSE=`r`n" + (J $drop) + "`r`n`r`nCLAIM_RESPONSE=`r`n" + (J $claim) + "`r`n")

# DO Postgres check via pg (NO TypeORM)
$dburl = ((Get-Content .\.env | Where-Object { $_ -match '^\s*DATABASE_URL\s*=' } | Select-Object -First 1) -replace '^\s*DATABASE_URL\s*=\s*','').Trim()
$env:DATABASE_URL = $dburl
$sinceUtc = (Get-Date).ToUniversalTime().AddMinutes(-10).ToString("o")

$node = (Join-Path $proofDir ("_p3_pg_check_" + $ts + ".js"))
@'
require('dotenv/config');
const { Client } = require('pg');

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();

  const since = process.argv[2];
  const dropId = Number(process.argv[3]);

  const drop = (await c.query(
    'SELECT id, \"claimedByUserId\", \"rewardCents\", \"createdAt\", \"claimedAt\" FROM freeboard_drops WHERE id = $1',
    [dropId]
  )).rows[0];

  const userId = Number(drop.claimedByUserId);

  const wallet = (await c.query(
    'SELECT id, \"userId\", \"balanceCents\", \"spendableBalanceCents\", \"updatedAt\" FROM wallets WHERE \"userId\" = $1',
    [userId]
  )).rows[0];

  const tx = wallet ? (await c.query(
    'SELECT id, \"walletId\", type, \"amountCents\", metadata, \"createdAt\" FROM wallet_transactions WHERE \"walletId\" = $1 AND \"createdAt\" >= $2 ORDER BY \"createdAt\" DESC LIMIT 50',
    [wallet.id, since]
  )).rows : [];

  console.log(JSON.stringify({ since, drop, wallet, tx }, null, 2));
  await c.end();
})().catch(e => { console.error(e); process.exit(1); });
'@ | Set-Content -NoNewline -Path $node

$pgOut = node $node $sinceUtc $claimId
Append ("`r`nPG_CHECK=`r`n" + $pgOut + "`r`n")
"OK: wrote $proof"
$pgOut
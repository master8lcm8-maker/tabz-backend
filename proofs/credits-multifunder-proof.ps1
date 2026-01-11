# TABZ LOCKED PROOF: Credits Request Multi-Funder + Cap + Read-Gate
# Expected: PASS with no throws.
# Date: 2026-01-10
# Requires backend running on http://127.0.0.1:3000

$ErrorActionPreference="Stop"

function Login($email,$password){
  (irm -Method Post -Uri "http://127.0.0.1:3000/auth/login" -ContentType "application/json" -Body (@{ email=$email; password=$password } | ConvertTo-Json)).access_token
}
function Me($token){
  irm -Headers @{ Authorization="Bearer $token" } "http://127.0.0.1:3000/auth/me"
}
function Bal($token){
  (irm -Headers @{ Authorization="Bearer $token" } "http://127.0.0.1:3000/credits/balance").balanceCents
}

$ownerToken  = Login "owner@tabz.app"  "password"
$buyerToken  = Login "buyer@tabz.app"  "password"
$owner2Token = Login "owner2@tabz.app" "password"
if (-not $ownerToken -or -not $buyerToken -or -not $owner2Token) { throw "missing_token" }

$ownerMe  = Me $ownerToken
$buyerMe  = Me $buyerToken
$owner2Me = Me $owner2Token

$ownerId  = [int]$ownerMe.userId
$buyerId  = [int]$buyerMe.userId
$owner2Id = [int]$owner2Me.userId

"REQUESTER owner userId=$ownerId"
"FUNDER A  buyer userId=$buyerId"
"FUNDER B owner2 userId=$owner2Id"

if ($ownerId -le 0 -or $buyerId -le 0 -or $owner2Id -le 0) { throw "BUG: bad_userId_detected" }

$req = irm -Method Post `
  -Headers @{ Authorization="Bearer $ownerToken" } `
  -Uri "http://127.0.0.1:3000/credits/requests" `
  -ContentType "application/json" `
  -Body (@{ amountCents=500; note="MULTI-FUNDER PROOF (LOCKED)" } | ConvertTo-Json)

$rid = [int]$req.request.id
"NEW REQUEST ID: $rid"

irm -Method Post `
  -Headers @{ Authorization="Bearer $buyerToken" } `
  -Uri "http://127.0.0.1:3000/credits/dev/mint" `
  -ContentType "application/json" `
  -Body (@{ toUserId=$buyerId; amountCents=2000 } | ConvertTo-Json) | Out-Null

irm -Method Post `
  -Headers @{ Authorization="Bearer $buyerToken" } `
  -Uri "http://127.0.0.1:3000/credits/dev/mint" `
  -ContentType "application/json" `
  -Body (@{ toUserId=$owner2Id; amountCents=2000 } | ConvertTo-Json) | Out-Null

$balBuyerBefore  = Bal $buyerToken
$balOwner2Before = Bal $owner2Token
"BAL BEFORE buyer=$balBuyerBefore owner2=$balOwner2Before"

irm -Method Post `
  -Headers @{ Authorization="Bearer $buyerToken" } `
  -Uri "http://127.0.0.1:3000/credits/requests/$rid/fund" `
  -ContentType "application/json" `
  -Body (@{ amountCents=200 } | ConvertTo-Json) | Out-Null

"OWNER2 READ BEFORE FUND (should FAIL):"
try {
  irm -Headers @{ Authorization="Bearer $owner2Token" } "http://127.0.0.1:3000/credits/requests/$rid" | Out-Null
  throw "BUG: owner2_should_not_read_before_funding"
} catch {
  "EXPECTED FAIL: " + $_.Exception.Message
}

$fundRes = irm -Method Post `
  -Headers @{ Authorization="Bearer $owner2Token" } `
  -Uri "http://127.0.0.1:3000/credits/requests/$rid/fund" `
  -ContentType "application/json" `
  -Body (@{ amountCents=400 } | ConvertTo-Json)

"FUND RESPONSE:"; $fundRes | ConvertTo-Json -Depth 10

$balBuyerAfter  = Bal $buyerToken
$balOwner2After = Bal $owner2Token
"BAL AFTER  buyer=$balBuyerAfter owner2=$balOwner2After"

$deltaBuyer  = $balBuyerBefore  - $balBuyerAfter
$deltaOwner2 = $balOwner2Before - $balOwner2After
"DELTA buyer=$deltaBuyer (expected 200)"
"DELTA owner2=$deltaOwner2 (expected 300)"

if ($deltaBuyer -ne 200) { throw "BUG: buyer_delta_wrong_$deltaBuyer" }
if ($deltaOwner2 -ne 300) { throw "BUG: owner2_delta_wrong_$deltaOwner2" }

"REQUESTER READ (should succeed):"
irm -Headers @{ Authorization="Bearer $ownerToken" }  "http://127.0.0.1:3000/credits/requests/$rid" | ConvertTo-Json -Depth 10

"FUNDER A READ (should succeed):"
irm -Headers @{ Authorization="Bearer $buyerToken" }  "http://127.0.0.1:3000/credits/requests/$rid" | ConvertTo-Json -Depth 10

"FUNDER B READ (should succeed now):"
irm -Headers @{ Authorization="Bearer $owner2Token" } "http://127.0.0.1:3000/credits/requests/$rid" | ConvertTo-Json -Depth 10

"DB SOURCE OF TRUTH:"
sqlite3 "D:\TABZ\tabz-backend-full\tabz-backend\tabz-dev.sqlite" "select id, amountCents, fundedCents, status, fromUserId, toUserId, updatedAt from credits_transfer where id=$rid;"

"✅ MULTI-FUNDER PROOF PASSED"

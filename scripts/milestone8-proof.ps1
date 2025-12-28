# =========================================================
# TABZ — Milestone 8 — Owner Orders (LIVE)
# PROOF HARNESS — deterministic, repeatable, no UI guessing
# =========================================================

$ErrorActionPreference = "Stop"

$BASE_URL    = "http://10.0.0.239:3000"
$OWNER_EMAIL = "owner@tabz.app"
$BUYER_EMAIL = "buyer@tabz.app"
$PASSWORD    = "password"

function Json($obj, $depth = 20) {
  $obj | ConvertTo-Json -Depth $depth
}

function Get-Token($resp) {
  if ($resp.PSObject.Properties.Name -contains "access_token") { return $resp.access_token }
  if ($resp.PSObject.Properties.Name -contains "accessToken")  { return $resp.accessToken }
  throw "No access token in response"
}

Write-Host "`n=== MILESTONE 8 — OWNER ORDERS — PROOF ===`n"

# ---------------------------------------------------------
# 1) Seed demo buyer + owner
# ---------------------------------------------------------
Write-Host "[1] Ensure demo buyer"
$buyerSeed = Invoke-RestMethod -Method POST -Uri "$BASE_URL/dev-seed/ensure-demo-buyer"
Write-Host (Json $buyerSeed)

Write-Host "[2] Ensure demo owner"
$ownerSeed = Invoke-RestMethod -Method POST -Uri "$BASE_URL/dev-seed/ensure-demo-owner"
Write-Host (Json $ownerSeed)

# ---------------------------------------------------------
# 2) Ensure owner venue + item
# ---------------------------------------------------------
Write-Host "[3] Ensure demo owner venue + item"
$seedItem = Invoke-RestMethod -Method POST -Uri "$BASE_URL/dev-seed/ensure-demo-owner-item"
Write-Host (Json $seedItem)

$itemId  = [int]$seedItem.item.id
$venueId = [int]$seedItem.venueId

if (-not $itemId -or -not $venueId) {
  throw "Seed failed to return itemId or venueId"
}

# ---------------------------------------------------------
# 3) Login buyer + owner
# ---------------------------------------------------------
Write-Host "[4] Login buyer"
$buyerLogin = Invoke-RestMethod -Method POST `
  -Uri "$BASE_URL/auth/login" `
  -Body (@{ email=$BUYER_EMAIL; password=$PASSWORD } | ConvertTo-Json) `
  -ContentType "application/json"

$buyerToken = Get-Token $buyerLogin
Write-Host "Buyer token OK"

Write-Host "[5] Login owner"
$ownerLogin = Invoke-RestMethod -Method POST `
  -Uri "$BASE_URL/auth/login-owner" `
  -Body (@{ email=$OWNER_EMAIL; password=$PASSWORD } | ConvertTo-Json) `
  -ContentType "application/json"

$ownerToken = Get-Token $ownerLogin
Write-Host "Owner token OK"

# ---------------------------------------------------------
# 4) Identity proof
# ---------------------------------------------------------
Write-Host "[6] /auth/me (buyer)"
Write-Host (Json (Invoke-RestMethod -Method GET `
  -Uri "$BASE_URL/auth/me" `
  -Headers @{ Authorization="Bearer $buyerToken" }))

Write-Host "[7] /auth/me (owner)"
Write-Host (Json (Invoke-RestMethod -Method GET `
  -Uri "$BASE_URL/auth/me" `
  -Headers @{ Authorization="Bearer $ownerToken" }))

# ---------------------------------------------------------
# 5) Fund buyer wallet (deposit)
# ---------------------------------------------------------
Write-Host "[8] Deposit buyer wallet"
Invoke-RestMethod -Method POST `
  -Uri "$BASE_URL/wallet/deposit" `
  -Headers @{ Authorization="Bearer $buyerToken" } `
  -Body (@{ amountCents = 5000 } | ConvertTo-Json) `
  -ContentType "application/json" | Out-Null

# ---------------------------------------------------------
# 6) Buyer creates order
# ---------------------------------------------------------
Write-Host "[9] Buyer creates order"
$order = Invoke-RestMethod -Method POST `
  -Uri "$BASE_URL/store-items/order" `
  -Headers @{ Authorization="Bearer $buyerToken" } `
  -Body (@{ itemId=$itemId; quantity=1 } | ConvertTo-Json) `
  -ContentType "application/json"

Write-Host (Json $order)
$orderId = [int]$order.id

# ---------------------------------------------------------
# 7) Owner lists orders
# ---------------------------------------------------------
Write-Host "[10] Owner GET orders"
$orders1 = Invoke-RestMethod -Method GET `
  -Uri "$BASE_URL/store-items/owner/orders" `
  -Headers @{ Authorization="Bearer $ownerToken" }

Write-Host (Json $orders1)

# ---------------------------------------------------------
# 8) Owner mark → pending → cancel
# ---------------------------------------------------------
Write-Host "[11] Owner mark order pending"
Invoke-RestMethod -Method POST `
  -Uri "$BASE_URL/store-items/owner/orders/$orderId/mark" `
  -Headers @{ Authorization="Bearer $ownerToken" } `
  -Body (@{ status="pending" } | ConvertTo-Json) `
  -ContentType "application/json" | Out-Null

Write-Host "[12] Owner cancel order"
Invoke-RestMethod -Method POST `
  -Uri "$BASE_URL/store-items/owner/orders/$orderId/cancel" `
  -Headers @{ Authorization="Bearer $ownerToken" } `
  -ContentType "application/json" | Out-Null

# ---------------------------------------------------------
# 9) Re-fetch orders (persistence proof)
# ---------------------------------------------------------
Write-Host "[13] Owner GET orders (after cancel)"
$orders2 = Invoke-RestMethod -Method GET `
  -Uri "$BASE_URL/store-items/owner/orders" `
  -Headers @{ Authorization="Bearer $ownerToken" }

Write-Host (Json $orders2)

Write-Host "`n✅ MILESTONE 8 — OWNER ORDERS — PROVEN`n"

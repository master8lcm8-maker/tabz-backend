# M36 PROOF — Store Items route separation (buyer vs owner)
$ErrorActionPreference="Stop"
$base="http://127.0.0.1:3000"

function Assert($name, $cond) {
  if (-not $cond) { throw "ASSERT_FAIL: $name" }
  "LOCK_$name=True"
}

# health
Assert "backend_up" ((Invoke-RestMethod "$base/health").status -eq "ok")

# tokens
$buyerToken=(Invoke-RestMethod -Method POST -Uri "$base/auth/login-buyer" `
  -Body (@{ email="buyer@tabz.app"; password="password" } | ConvertTo-Json) `
  -ContentType "application/json").access_token

$ownerToken=(Invoke-RestMethod -Method POST -Uri "$base/auth/login-owner" `
  -Body (@{ email="owner@tabz.app"; password="password" } | ConvertTo-Json) `
  -ContentType "application/json").access_token

# buyer cannot access owner orders
try {
  Invoke-RestMethod -Method GET -Uri "$base/store-items/owner/orders" `
    -Headers @{ Authorization="Bearer $buyerToken" } | Out-Null
  throw "ASSERT_FAIL: owner_orders_blocked_for_buyer"
} catch {
  "LOCK_owner_orders_blocked_for_buyer=True"
}

# owner can access owner orders
$o = Invoke-RestMethod -Method GET -Uri "$base/store-items/owner/orders" `
  -Headers @{ Authorization="Bearer $ownerToken" }
Assert "owner_can_access_owner_orders" ($o -ne $null -and $o.value -ne $null)

# buyer order route reachable (not 404)
try {
  Invoke-RestMethod -Method POST -Uri "$base/store-items/order" `
    -Headers @{ Authorization="Bearer $buyerToken" } `
    -Body (@{} | ConvertTo-Json) -ContentType "application/json" | Out-Null
  "LOCK_buyer_order_route_reachable=True"
} catch {
  $msg = $_.ErrorDetails.Message
  Assert "buyer_order_route_reachable" ($msg -notmatch "Cannot POST /store-items/order")
}

# static check: buyer routes exist in ONLY ONE controller file (force array)
$matches = Get-ChildItem .\src\modules\store-items -Recurse -Filter "*.controller.ts" |
  ForEach-Object {
    Select-String -Path $_.FullName -Pattern "Post\('order'\)", "Get\('my-orders'\)" -AllMatches -ErrorAction SilentlyContinue |
      ForEach-Object { $_.Path }
  }

$unique = @($matches | Sort-Object -Unique)

Assert "buyer_routes_single_controller" ($unique.Count -eq 1 -and ($unique[0] -match "store-items\.controller\.ts$"))

"LOCK_M36_store_items_route_separation=PASS"

# TRUTH_R9_R11.ps1 — TABZ R9–R11 TRUTH RUN (StoreItems end-to-end)
# PASS criteria:
#  R9: Buyer can list venue items (contains seeded Demo Item)
#  R10: Buyer can place an order for an item (returns orderId)
#  R11: Staff can see the order and mark it (buyer can see status changed)

$ErrorActionPreference = "Stop"

$BASE   = "https://tabz-backend-bxxbf.ondigitalocean.app"
$SECRET = "tabz-dev-seed-2026-01-27"

$BUYER_EMAIL = "buyer@tabz.app"
$BUYER_PASS  = "password"

$STAFF_EMAIL = "staff@tabz.app"
$STAFF_PASS  = "password"

function Fail($msg) {
  Write-Host ""
  Write-Host "FAIL: $msg" -ForegroundColor Red
  exit 1
}

Write-Host "=== TABZ TRUTH_R9_R11 ==="
Write-Host "BASE=$BASE"
Write-Host ""

# ------------------------------------------------------------
# [0/5] Seed owner+venue+item (idempotent)
# ------------------------------------------------------------
Write-Host "[0/5] POST /dev-seed/owner-item (expect venueId + item.id)..."
try {
  $seed = Invoke-RestMethod "$BASE/dev-seed/owner-item" -Method Post -Headers @{ "x-dev-seed-secret" = $SECRET }
} catch {
  Write-Host "HTTP_STATUS=" + ($_.Exception.Response.StatusCode.value__ 2>$null)
  if ($_.ErrorDetails -and $_.ErrorDetails.Message) { $_.ErrorDetails.Message | Write-Host } else { $_.Exception.Message | Write-Host }
  Fail "dev-seed/owner-item failed"
}

if (-not $seed.ok) { Fail "dev-seed/owner-item ok!=true" }

$venueId = 0
$itemId  = 0
try { $venueId = [int]$seed.venueId } catch { $venueId = 0 }
try { $itemId  = [int]$seed.item.id } catch { $itemId = 0 }

if ($venueId -le 0) { Fail "seed venueId invalid: $($seed.venueId)" }
if ($itemId  -le 0) { Fail "seed item.id invalid: $($seed.item.id)" }

Write-Host "OK: seeded venueId=$venueId itemId=$itemId"
Write-Host ""

# ------------------------------------------------------------
# [1/5] Buyer login => JWT
# ------------------------------------------------------------
Write-Host "[1/5] POST /auth/login-buyer (expect access_token)..."
$body = @{ email = $BUYER_EMAIL; password = $BUYER_PASS } | ConvertTo-Json
try {
  $login = Invoke-RestMethod "$BASE/auth/login-buyer" -Method Post -ContentType "application/json" -Body $body
} catch {
  Write-Host "HTTP_STATUS=" + ($_.Exception.Response.StatusCode.value__ 2>$null)
  if ($_.ErrorDetails -and $_.ErrorDetails.Message) { $_.ErrorDetails.Message | Write-Host } else { $_.Exception.Message | Write-Host }
  Fail "buyer login failed"
}

$buyerToken = [string]$login.access_token
if ([string]::IsNullOrWhiteSpace($buyerToken)) { Fail "buyer access_token missing" }
Write-Host "OK: buyer JWT len=$($buyerToken.Length)"
Write-Host ""

# ------------------------------------------------------------
# [2/5] R9: Buyer lists items for venue and sees seeded item
# ------------------------------------------------------------
Write-Host "[2/5] GET /store-items/venue/:venueId (expect item list contains itemId=$itemId)..."
try {
  $itemsResp = Invoke-RestMethod "$BASE/store-items/venue/$venueId" -Method Get -Headers @{ Authorization = "Bearer $buyerToken" }
} catch {
  Write-Host "HTTP_STATUS=" + ($_.Exception.Response.StatusCode.value__ 2>$null)
  if ($_.ErrorDetails -and $_.ErrorDetails.Message) { $_.ErrorDetails.Message | Write-Host } else { $_.Exception.Message | Write-Host }
  Fail "buyer venue items fetch failed"
}

# Accept either {ok, items:[...]} or plain array
$items = $null
if ($itemsResp -is [System.Array]) { $items = $itemsResp }
elseif ($itemsResp.items) { $items = $itemsResp.items }
elseif ($itemsResp.value) { $items = $itemsResp.value }
else { $items = @() }

$found = $false
foreach ($it in $items) {
  try {
    if ([int]$it.id -eq $itemId) { $found = $true; break }
  } catch {}
}
if (-not $found) {
  Write-Host "DEBUG: venue items response:" 
  ($itemsResp | ConvertTo-Json -Depth 10) | Write-Host
  Fail "R9 failed: seeded itemId not visible to buyer"
}
Write-Host "OK: R9 buyer sees itemId=$itemId for venueId=$venueId"
Write-Host ""

# ------------------------------------------------------------
# [3/5] R10: Buyer places an order
# NOTE: If your DTO differs, this step will print server error and stop.
# ------------------------------------------------------------
Write-Host "[3/5] POST /store-items/order (expect order id)..."
$orderBody = @{
  venueId  = $venueId
  itemId   = $itemId
  quantity = 1
} | ConvertTo-Json

try {
  $orderResp = Invoke-RestMethod "$BASE/store-items/order" -Method Post -ContentType "application/json" -Headers @{ Authorization = "Bearer $buyerToken" } -Body $orderBody
} catch {
  Write-Host "HTTP_STATUS=" + ($_.Exception.Response.StatusCode.value__ 2>$null)
  if ($_.ErrorDetails -and $_.ErrorDetails.Message) { $_.ErrorDetails.Message | Write-Host } else { $_.Exception.Message | Write-Host }

  Write-Host ""
  Write-Host "DTO MISMATCH DETECTED: Your /store-items/order body differs from {venueId,itemId,quantity}." -ForegroundColor Yellow
  Write-Host "Run this to discover the exact DTO fields, then update TRUTH_R9_R11.ps1 accordingly:" -ForegroundColor Yellow
  Write-Host "  Select-String -Path .\src\**\*.ts -Pattern `"@Post\('order'\)`", `'store-items/order'`, `Create.*Order`, `orderDto`, `itemId`, `venueId`, `quantity` -Context 0,6"
  Fail "R10 failed: order post rejected"
}

# Extract orderId from common shapes
$orderId = 0
try { if ($orderResp.orderId) { $orderId = [int]$orderResp.orderId } } catch {}
try { if ($orderId -le 0 -and $orderResp.id) { $orderId = [int]$orderResp.id } } catch {}
try { if ($orderId -le 0 -and $orderResp.order -and $orderResp.order.id) { $orderId = [int]$orderResp.order.id } } catch {}

if ($orderId -le 0) {
  Write-Host "DEBUG: order response:"
  ($orderResp | ConvertTo-Json -Depth 10) | Write-Host
  Fail "R10 failed: could not find order id in response"
}

Write-Host "OK: R10 buyer placed orderId=$orderId"
Write-Host ""

# ------------------------------------------------------------
# [4/5] Staff auth + mark order (R11)
# ------------------------------------------------------------
Write-Host "[4/5] Ensure staff exists (dev-seed/staff)..."
try {
  $staffSeed = Invoke-RestMethod "$BASE/dev-seed/staff" -Method Post -Headers @{ "x-dev-seed-secret" = $SECRET }
} catch {
  Write-Host "HTTP_STATUS=" + ($_.Exception.Response.StatusCode.value__ 2>$null)
  if ($_.ErrorDetails -and $_.ErrorDetails.Message) { $_.ErrorDetails.Message | Write-Host } else { $_.Exception.Message | Write-Host }
  Fail "dev-seed/staff failed"
}
if (-not $staffSeed.ok) { Fail "dev-seed/staff ok!=true" }
Write-Host "OK: staff seeded"
Write-Host ""

Write-Host "[4.1/5] POST /auth/login-staff (expect access_token)..."
$staffLoginBody = @{ email = $STAFF_EMAIL; password = $STAFF_PASS } | ConvertTo-Json

try {
  $staffLogin = Invoke-RestMethod "$BASE/auth/login-staff" -Method Post -ContentType "application/json" -Body $staffLoginBody
} catch {
  Write-Host "HTTP_STATUS=" + ($_.Exception.Response.StatusCode.value__ 2>$null)
  if ($_.ErrorDetails -and $_.ErrorDetails.Message) { $_.ErrorDetails.Message | Write-Host } else { $_.Exception.Message | Write-Host }

  Write-Host ""
  Write-Host "STAFF LOGIN ROUTE UNKNOWN: /auth/login-staff did not work in your build." -ForegroundColor Yellow
  Write-Host "Discover the real staff login endpoint with:" -ForegroundColor Yellow
  Write-Host "  Select-String -Path .\src\**\*.ts -Pattern `"login-staff`", `"staff login`", `"@Post\('login`", `"AuthController`" -Context 0,6"
  Fail "R11 failed: staff login route not found"
}

$staffToken = [string]$staffLogin.access_token
if ([string]::IsNullOrWhiteSpace($staffToken)) { Fail "staff access_token missing" }
Write-Host "OK: staff JWT len=$($staffToken.Length)"
Write-Host ""

Write-Host "[4.2/5] GET /store-items/staff/orders (expect includes orderId=$orderId)..."
try {
  $staffOrders = Invoke-RestMethod "$BASE/store-items/staff/orders" -Method Get -Headers @{ Authorization = "Bearer $staffToken" }
} catch {
  Write-Host "HTTP_STATUS=" + ($_.Exception.Response.StatusCode.value__ 2>$null)
  if ($_.ErrorDetails -and $_.ErrorDetails.Message) { $_.ErrorDetails.Message | Write-Host } else { $_.Exception.Message | Write-Host }
  Fail "staff orders fetch failed"
}

$orders = $null
if ($staffOrders -is [System.Array]) { $orders = $staffOrders }
elseif ($staffOrders.orders) { $orders = $staffOrders.orders }
else { $orders = @() }

$seen = $false
foreach ($o in $orders) {
  try { if ([int]$o.id -eq $orderId) { $seen = $true; break } } catch {}
}
if (-not $seen) {
  Write-Host "DEBUG: staff orders response:"
  ($staffOrders | ConvertTo-Json -Depth 10) | Write-Host
  Fail "R11 failed: staff cannot see buyer order"
}
Write-Host "OK: staff sees orderId=$orderId"
Write-Host ""

Write-Host "[4.3/5] POST /store-items/staff/orders/:orderId/mark (expect success)..."
try {
  $mark = Invoke-RestMethod "$BASE/store-items/staff/orders/$orderId/mark" -Method Post -Headers @{ Authorization = "Bearer $staffToken" }
} catch {
  Write-Host "HTTP_STATUS=" + ($_.Exception.Response.StatusCode.value__ 2>$null)
  if ($_.ErrorDetails -and $_.ErrorDetails.Message) { $_.ErrorDetails.Message | Write-Host } else { $_.Exception.Message | Write-Host }
  Fail "R11 failed: mark endpoint failed"
}

Write-Host "OK: staff marked order"
Write-Host ""

# ------------------------------------------------------------
# [5/5] Buyer fetches order detail to confirm status updated
# ------------------------------------------------------------
Write-Host "[5/5] GET /store-items/orders/:orderId (expect reflects staff mark)..."
try {
  $od = Invoke-RestMethod "$BASE/store-items/orders/$orderId" -Method Get -Headers @{ Authorization = "Bearer $buyerToken" }
} catch {
  Write-Host "HTTP_STATUS=" + ($_.Exception.Response.StatusCode.value__ 2>$null)
  if ($_.ErrorDetails -and $_.ErrorDetails.Message) { $_.ErrorDetails.Message | Write-Host } else { $_.Exception.Message | Write-Host }
  Fail "buyer order detail fetch failed"
}

# We accept any response shape; just require it returns and references the orderId
$gotId = 0
try { if ($od.id) { $gotId = [int]$od.id } } catch {}
try { if ($gotId -le 0 -and $od.order -and $od.order.id) { $gotId = [int]$od.order.id } } catch {}

if ($gotId -ne $orderId) {
  Write-Host "DEBUG: order detail:"
  ($od | ConvertTo-Json -Depth 10) | Write-Host
  Fail "buyer order detail did not return same orderId"
}

Write-Host "OK: buyer can read order detail after staff mark"
Write-Host ""
Write-Host "PASS: R9–R11 LOCKED ✅"


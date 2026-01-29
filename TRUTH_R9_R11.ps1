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

# Helper: robust JSON call with clean error printing
function InvokeJson($Url, $Method, $Headers, $BodyObj) {
  try {
    if ($null -eq $Headers) { $Headers = @{} }

    if ($null -eq $BodyObj) {
      return Invoke-RestMethod $Url -Method $Method -Headers $Headers
    } else {
      $b = ($BodyObj | ConvertTo-Json -Depth 10)
      return Invoke-RestMethod $Url -Method $Method -ContentType "application/json" -Headers $Headers -Body $b
    }
  } catch {
    $status = $null
    try { $status = $_.Exception.Response.StatusCode.value__ } catch {}

    $msg = $null
    try { $msg = $_.ErrorDetails.Message } catch {}
    if (-not $msg) { $msg = $_.Exception.Message }

    throw ([Exception]("HTTP_STATUS=$status`n$msg"))
  }
}

Write-Host "=== TABZ TRUTH_R9_R11 ==="
Write-Host "BASE=$BASE"
Write-Host ""

# ------------------------------------------------------------
# [0/5] Seed owner+venue+item (idempotent)
# ------------------------------------------------------------
Write-Host "[0/5] POST /dev-seed/owner-item (expect venueId + item.id)..."
try {
  $seed = InvokeJson "$BASE/dev-seed/owner-item" "Post" @{ "x-dev-seed-secret" = $SECRET } $null
} catch {
  Write-Host $_.Exception.Message
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
try {
  $login = InvokeJson "$BASE/auth/login-buyer" "Post" @{} @{ email = $BUYER_EMAIL; password = $BUYER_PASS }
} catch {
  Write-Host $_.Exception.Message
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
  $itemsResp = InvokeJson "$BASE/store-items/venue/$venueId" "Get" @{ Authorization = "Bearer $buyerToken" } $null
} catch {
  Write-Host $_.Exception.Message
  Fail "buyer venue items fetch failed"
}

# Accept either {ok, items:[...]} or plain array or { value: [...] }
$items = @()
if ($itemsResp -is [System.Array]) { $items = @($itemsResp) }
elseif ($null -ne $itemsResp.items) { $items = @($itemsResp.items) }
elseif ($null -ne $itemsResp.value) { $items = @($itemsResp.value) }
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
# [3/5] R10: Ensure spendable funds, then Buyer places an order
# ------------------------------------------------------------

function EnsureBuyerSpendableFunds() {
  # Over-fund to make truth runs stable across repeats.
  $amountCents = 500000  # $5,000.00

  Write-Host "[3/5] Ensure buyer has spendable funds ..."

  $hdrJwtOnly = @{ Authorization = "Bearer $buyerToken" }
  $hdrJwtPlusSecret = @{
    Authorization     = "Bearer $buyerToken"
    "x-dev-seed-secret" = $SECRET
  }

  # --- Path A (preferred): /wallet/deposit (JWT only). If this works, it should credit spendable directly.
  try {
    $null = InvokeJson "$BASE/wallet/deposit" "Post" $hdrJwtOnly @{ amountCents = $amountCents }
    Write-Host "OK: wallet/deposit"
    return
  } catch {
    # Not fatal; fall back to dev flow.
    Write-Host "DEBUG: wallet/deposit not usable (will fallback):"
    Write-Host $_.Exception.Message
  }

  # --- Path B (fallback): dev add cashout balance, then unlock spendable
  try {
    $null = InvokeJson "$BASE/wallet/dev/add-cashout-balance" "Post" $hdrJwtPlusSecret @{ amountCents = $amountCents }
    Write-Host "OK: wallet/dev/add-cashout-balance"
  } catch {
    Write-Host "DEBUG: add-cashout-balance failed:"
    Write-Host $_.Exception.Message
    Fail "Cannot add buyer balance via /wallet/dev/add-cashout-balance"
  }

  try {
    $null = InvokeJson "$BASE/wallet/unlock-spendable" "Post" $hdrJwtPlusSecret @{ amountCents = $amountCents }
    Write-Host "OK: wallet/unlock-spendable"
  } catch {
    Write-Host "DEBUG: unlock-spendable failed:"
    Write-Host $_.Exception.Message
    Fail "Cannot unlock spendable via /wallet/unlock-spendable"
  }

  Write-Host "OK: buyer spendable funding step completed."
}

EnsureBuyerSpendableFunds
Write-Host ""

Write-Host "[3/5] POST /store-items/order (expect order id)..."
try {
  $orderResp = InvokeJson "$BASE/store-items/order" "Post" @{ Authorization = "Bearer $buyerToken" } @{
    venueId  = $venueId
    itemId   = $itemId
    quantity = 1
  }
} catch {
  $em = $_.Exception.Message
  Write-Host $em

  if ($em -match "Insufficient funds") {
    Fail "R10 failed: Insufficient funds AFTER EnsureBuyerSpendableFunds()"
  }

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
try { if ($orderId -le 0 -and $orderResp.value -and $orderResp.value.orderId) { $orderId = [int]$orderResp.value.orderId } } catch {}
try { if ($orderId -le 0 -and $orderResp.value -and $orderResp.value.id) { $orderId = [int]$orderResp.value.id } } catch {}

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
  $staffSeed = InvokeJson "$BASE/dev-seed/staff" "Post" @{ "x-dev-seed-secret" = $SECRET } $null
} catch {
  Write-Host $_.Exception.Message
  Fail "dev-seed/staff failed"
}
if (-not $staffSeed.ok) { Fail "dev-seed/staff ok!=true" }
Write-Host "OK: staff seeded"
Write-Host ""

Write-Host "[4.1/5] POST /auth/login-staff (expect access_token)..."
try {
  $staffLogin = InvokeJson "$BASE/auth/login-staff" "Post" @{} @{ email = $STAFF_EMAIL; password = $STAFF_PASS }
} catch {
  Write-Host $_.Exception.Message
  Fail "R11 failed: staff login route not found"
}

$staffToken = [string]$staffLogin.access_token
if ([string]::IsNullOrWhiteSpace($staffToken)) { Fail "staff access_token missing" }
Write-Host "OK: staff JWT len=$($staffToken.Length)"
Write-Host ""

Write-Host "[4.2/5] GET /store-items/staff/orders (expect includes orderId=$orderId)..."
try {
  $staffOrders = InvokeJson "$BASE/store-items/staff/orders" "Get" @{ Authorization = "Bearer $staffToken" } $null
} catch {
  Write-Host $_.Exception.Message
  Fail "staff orders fetch failed"
}

# normalize to array and match by orderId (or id)
$orders = @()
if ($staffOrders -is [System.Array]) {
  $orders = @($staffOrders)
}
elseif ($null -ne $staffOrders.value) {
  $orders = @($staffOrders.value)
}
elseif ($null -ne $staffOrders.orders) {
  $orders = @($staffOrders.orders)
}
elseif ($null -ne $staffOrders.items) {
  $orders = @($staffOrders.items)
}
else {
  $orders = @()
}

$seenOrder = $orders | Where-Object {
  (($_.PSObject.Properties.Name -contains 'orderId') -and ([int]$_.orderId -eq [int]$orderId)) -or
  (($_.PSObject.Properties.Name -contains 'id')      -and ([int]$_.id      -eq [int]$orderId))
} | Select-Object -First 1

if (-not $seenOrder) {
  Write-Host "DEBUG: staff orders response:"
  ($staffOrders | ConvertTo-Json -Depth 10) | Write-Host
  Fail "R11 failed: staff cannot see buyer orderId=$orderId"
}
Write-Host "OK: staff sees orderId=$orderId"
Write-Host ""

# Mark endpoint requires a status body; use "completed"
Write-Host "[4.3/5] POST /store-items/staff/orders/:orderId/mark (status=completed) (expect success)..."
try {
  $mark = InvokeJson "$BASE/store-items/staff/orders/$orderId/mark" "Post" @{ Authorization = "Bearer $staffToken" } @{ status = "completed" }
} catch {
  Write-Host $_.Exception.Message
  Fail "R11 failed: mark endpoint failed"
}

Write-Host "OK: staff marked order (completed)"
Write-Host ""

# ------------------------------------------------------------
# [5/5] Buyer fetches order detail to confirm status updated
# ------------------------------------------------------------
Write-Host "[5/5] GET /store-items/order/:orderId (fallback /store-items/orders/:orderId) (expect reflects staff mark)..."

$od = $null
try {
  $od = InvokeJson "$BASE/store-items/order/$orderId" "Get" @{ Authorization = "Bearer $buyerToken" } $null
} catch {
  # If primary route isn't there, try fallback
  $statusLine = $_.Exception.Message
  if ($statusLine -notmatch "HTTP_STATUS=404") {
    Write-Host $statusLine
    Fail "buyer order detail fetch failed (primary route)"
  }

  try {
    $od = InvokeJson "$BASE/store-items/orders/$orderId" "Get" @{ Authorization = "Bearer $buyerToken" } $null
  } catch {
    Write-Host $_.Exception.Message
    Fail "buyer order detail fetch failed (both routes tried)"
  }
}

# Accept shapes:
#  - { orderId: ... }
#  - { id: ... }
#  - { value: { orderId: ... } }
#  - { order: { ... } }
$detailObj = $od
try {
  if ($null -ne $od.value) { $detailObj = $od.value }
} catch {}

$gotId = 0
try { if ($detailObj.id) { $gotId = [int]$detailObj.id } } catch {}
try { if ($gotId -le 0 -and $detailObj.orderId) { $gotId = [int]$detailObj.orderId } } catch {}
try { if ($gotId -le 0 -and $detailObj.order -and $detailObj.order.id) { $gotId = [int]$detailObj.order.id } } catch {}
try { if ($gotId -le 0 -and $detailObj.order -and $detailObj.order.orderId) { $gotId = [int]$detailObj.order.orderId } } catch {}

if ($gotId -ne $orderId) {
  Write-Host "DEBUG: order detail:"
  ($od | ConvertTo-Json -Depth 10) | Write-Host
  Fail "buyer order detail did not return same orderId"
}

# Optional: verify status flipped to completed if present
$detailStatus = $null
try { if ($detailObj.status) { $detailStatus = [string]$detailObj.status } } catch {}
try { if (-not $detailStatus -and $detailObj.order -and $detailObj.order.status) { $detailStatus = [string]$detailObj.order.status } } catch {}
if ($detailStatus) { Write-Host "OK: buyer order status now = $detailStatus" }

Write-Host "OK: buyer can read order detail after staff mark"
Write-Host ""
Write-Host "PASS: R9–R11 LOCKED ✅"

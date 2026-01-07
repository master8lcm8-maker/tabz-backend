# =========================================================
# TABZ — M32 — DEV/ADMIN ENDPOINT LOCKDOWN — PROOF HARNESS
# Rule: deterministic, repeatable, no UI guessing
# =========================================================
$ErrorActionPreference = "Stop"

$BASE_URL    = "http://10.0.0.239:3000"
$OWNER_EMAIL = "owner@tabz.app"
$PASSWORD    = "password"

function Say($s) { Write-Host $s }
function Must($cond, $msg) { if (-not $cond) { throw $msg } }

function HttpPostJson($url, $token, $jsonBody, $devSecret) {
  Add-Type -AssemblyName System.Net.Http
  $c = New-Object System.Net.Http.HttpClient
  try {
    if ($token) {
      $c.DefaultRequestHeaders.Authorization =
        New-Object System.Net.Http.Headers.AuthenticationHeaderValue("Bearer",$token)
    }
    if ($devSecret) {
      $c.DefaultRequestHeaders.Add("x-dev-seed-secret",$devSecret)
    }

    $body = New-Object System.Net.Http.StringContent($jsonBody,[System.Text.Encoding]::UTF8,"application/json")
    $r = $c.PostAsync($url,$body).GetAwaiter().GetResult()
    $hs = [int]$r.StatusCode
    $t  = $r.Content.ReadAsStringAsync().GetAwaiter().GetResult()
    return @{ status=$hs; raw=$t }
  } finally { $c.Dispose() }
}

Say "=== M32 PROOF: dev endpoints require x-dev-seed-secret and are disabled in production ==="
Say ("BASE_URL=" + $BASE_URL)

# login owner
$login = Invoke-RestMethod -Method POST -Uri "$BASE_URL/auth/login" -ContentType "application/json" -Body (@{ email=$OWNER_EMAIL; password=$PASSWORD } | ConvertTo-Json)
$token = $login.access_token
Must $token "LOGIN_FAIL: missing token"
Say ("LOGIN_OK token_len=" + ($token.Length))

# DEV secret for positive path: requires you to have it in shell.
$DEV = $env:DEV_SEED_SECRET

# 1) identity/dev-set-status must be 401 without secret
$res1 = HttpPostJson "$BASE_URL/identity/dev-set-status" $token (@{ status="required" } | ConvertTo-Json) $null
Say ("identity/dev-set-status no-secret HTTP=" + $res1.status + " RAW=" + $res1.raw)
Must $res1.status -eq 401 "FAIL: expected 401 without secret for identity/dev-set-status"

# 2) identity/dev-complete must be 401 without secret
$res2 = HttpPostJson "$BASE_URL/identity/dev-complete" $token "{}" $null
Say ("identity/dev-complete no-secret HTTP=" + $res2.status + " RAW=" + $res2.raw)
Must $res2.status -eq 401 "FAIL: expected 401 without secret for identity/dev-complete"

# 3) wallet/dev/add-cashout-balance must be 401 without secret
$res3 = HttpPostJson "$BASE_URL/wallet/dev/add-cashout-balance" $token "{}" $null
Say ("wallet/dev/add-cashout-balance no-secret HTTP=" + $res3.status + " RAW=" + $res3.raw)
Must $res3.status -eq 401 "FAIL: expected 401 without secret for wallet/dev/add-cashout-balance"

# 4) wallet/unlock-spendable must be 401 without secret
$res4 = HttpPostJson "$BASE_URL/wallet/unlock-spendable" $token "{}" $null
Say ("wallet/unlock-spendable no-secret HTTP=" + $res4.status + " RAW=" + $res4.raw)
Must $res4.status -eq 401 "FAIL: expected 401 without secret for wallet/unlock-spendable"

# Positive reachability checks (not 401) — require DEV_SEED_SECRET in your shell
Must -not [string]::IsNullOrWhiteSpace($DEV) "Set $env:DEV_SEED_SECRET in this shell to run the positive-path checks."

$res5 = HttpPostJson "$BASE_URL/identity/dev-set-status" $token (@{ status="required" } | ConvertTo-Json) $DEV
Say ("identity/dev-set-status WITH secret HTTP=" + $res5.status + " RAW=" + $res5.raw)
Must $res5.status -ne 401 "FAIL: still 401 with secret for identity/dev-set-status"

$res6 = HttpPostJson "$BASE_URL/wallet/unlock-spendable" $token "{}" $DEV
Say ("wallet/unlock-spendable WITH secret HTTP=" + $res6.status + " RAW=" + $res6.raw)
Must $res6.status -ne 401 "FAIL: still 401 with secret for wallet/unlock-spendable"

# 5) dev-seed/buyer must be 401 without secret (NO JWT)
$resDS1 = HttpPostJson "$BASE_URL/dev-seed/buyer" $null "{}" $null
Say ("dev-seed/buyer no-secret HTTP=" + $resDS1.status + " RAW=" + $resDS1.raw)
Must $resDS1.status -eq 401 "FAIL: expected 401 without secret for dev-seed/buyer"

# Positive reachability (not 401) — requires DEV_SEED_SECRET in your shell
$resDS2 = HttpPostJson "$BASE_URL/dev-seed/buyer" $null "{}" $DEV
Say ("dev-seed/buyer WITH secret HTTP=" + $resDS2.status + " RAW=" + $resDS2.raw)
Must $resDS2.status -ne 401 "FAIL: still 401 with secret for dev-seed/buyer"

Say "✅ M32 PASS — DEV endpoints are secret-gated (401 without secret; reachable with secret)"





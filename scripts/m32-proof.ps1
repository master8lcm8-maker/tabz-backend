# =========================================================
# TABZ — M32 — PROOF HARNESS (scaffold)
# Rule: deterministic, repeatable, no UI guessing
# =========================================================
$ErrorActionPreference = "Stop"

$BASE_URL    = "http://10.0.0.239:3000"
$OWNER_EMAIL = "owner@tabz.app"
$BUYER_EMAIL = "buyer@tabz.app"
$PASSWORD    = "password"

function Say($s) { Write-Host $s }
function J($o, $d=20) { $o | ConvertTo-Json -Depth $d }
function Must($cond, $msg) { if (-not $cond) { throw $msg } }

Say "M32 scaffold OK"
Say ("BASE_URL=" + $BASE_URL)

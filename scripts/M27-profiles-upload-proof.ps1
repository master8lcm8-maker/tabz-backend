$ErrorActionPreference="Stop"

$base = $env:TABZ_BASE
if ([string]::IsNullOrWhiteSpace($base)) { $base = "http://127.0.0.1:3000" }

Write-Host "BASE=$base"

$r = Invoke-WebRequest -UseBasicParsing -Uri "$base/health" -TimeoutSec 5
if ($r.StatusCode -ne 200) { throw "FAIL: health not 200" }
Write-Host "HEALTH_OK $($r.StatusCode)"

$buyerToken = (Invoke-RestMethod -Method POST -Uri "$base/auth/login-buyer" `
  -Body (@{ email="buyer@tabz.app"; password="password" } | ConvertTo-Json) `
  -ContentType "application/json").access_token

if (-not $buyerToken) { throw "FAIL: buyer token missing" }
Write-Host "LOGIN_OK token_len=$($buyerToken.Length)"

$png = Join-Path $env:TEMP "tabz-m27-proof.png"
[IO.File]::WriteAllBytes($png,[Convert]::FromBase64String(
"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+X2m0AAAAASUVORK5CYII="
))
if (!(Test-Path $png)) { throw "FAIL: png not created" }

function Invoke-CurlRaw {
  param([string]$url,[string]$token,[string]$filePath)
  # IMPORTANT: capture as ONE string (Out-String), not string[]
  $raw = (curl.exe -s -i -X POST $url `
    -H "Authorization: Bearer $token" `
    -F "file=@$filePath" | Out-String)
  return $raw
}

function Parse-RawHttp {
  param([string]$raw)
  # Find the first blank line separating headers/body
  $idx = $raw.IndexOf("`r`n`r`n")
  if ($idx -lt 0) { $idx = $raw.IndexOf("`n`n") }

  $headers = if ($idx -ge 0) { $raw.Substring(0,$idx) } else { $raw }
  $body    = if ($idx -ge 0) { $raw.Substring($idx).Trim() } else { "" }

  $statusLine = ($headers -split "`r?`n" | Where-Object { $_ -match '^HTTP/' } | Select-Object -First 1)
  $code = 0
  if ($statusLine -match '^HTTP/\d\.\d\s+(\d{3})') { $code = [int]$Matches[1] }

  [pscustomobject]@{ StatusLine=$statusLine; StatusCode=$code; HeadersRaw=$headers; BodyRaw=$body }
}

function Require-201-Json {
  param([string]$label,[string]$raw)
  $p = Parse-RawHttp $raw

  Write-Host "$label STATUS: $($p.StatusLine)"

  if ($p.StatusCode -ne 201) {
    Write-Host "$label HEADERS:"
    Write-Host $p.HeadersRaw
    Write-Host "$label BODY:"
    Write-Host $p.BodyRaw
    throw "FAIL: $label upload not 201"
  }

  if ([string]::IsNullOrWhiteSpace($p.BodyRaw)) {
    Write-Host "$label HEADERS:"
    Write-Host $p.HeadersRaw
    throw "FAIL: $label body empty"
  }

  try { return ($p.BodyRaw | ConvertFrom-Json) } catch {
    Write-Host "$label BODY (unparseable json):"
    Write-Host $p.BodyRaw
    throw "FAIL: $label response not valid json"
  }
}

function Get-UrlFromResponse {
  param($json,[string]$field)
  $v = $null
  try { $v = $json.profile.$field } catch {}
  if ($v) { return [string]$v }

  try {
    if ($json.profiles -and $json.profiles.Count -gt 0) {
      $v = $json.profiles[0].$field
      if ($v) { return [string]$v }
    }
  } catch {}

  try { $v = $json.value.profile.$field } catch {}
  if ($v) { return [string]$v }

  try { $v = $json.upload.url } catch {}
  if ($v -and $field -eq "avatarUrl") { return [string]$v }

  return $null
}

# --- AVATAR ---
$rawA = Invoke-CurlRaw "$base/profiles/me/avatar" $buyerToken $png
$ja = Require-201-Json "AVATAR" $rawA

$avatarUrl = Get-UrlFromResponse $ja "avatarUrl"
if (-not $avatarUrl) {
  Write-Host "AVATAR_JSON_DUMP:"
  Write-Host ($ja | ConvertTo-Json -Depth 30)
  throw "FAIL: avatarUrl missing"
}
Write-Host "AVATAR_URL=$avatarUrl"

# --- COVER ---
$rawC = Invoke-CurlRaw "$base/profiles/me/cover" $buyerToken $png
$jc = Require-201-Json "COVER" $rawC

$coverUrl = Get-UrlFromResponse $jc "coverUrl"
if (-not $coverUrl) {
  Write-Host "COVER_JSON_DUMP:"
  Write-Host ($jc | ConvertTo-Json -Depth 30)
  throw "FAIL: coverUrl missing"
}
Write-Host "COVER_URL=$coverUrl"

# Public HEAD checks
$h1 = curl.exe -s -I "$avatarUrl" | Select-String -Pattern "HTTP/|content-type|content-length"
$h2 = curl.exe -s -I "$coverUrl"  | Select-String -Pattern "HTTP/|content-type|content-length"
Write-Host "AVATAR_HEAD:"
$h1
Write-Host "COVER_HEAD:"
$h2

if (($h1 | Out-String) -notmatch "HTTP/.* 200") { throw "FAIL: avatar HEAD not 200" }
if (($h2 | Out-String) -notmatch "HTTP/.* 200") { throw "FAIL: cover HEAD not 200" }

Write-Host "M27_PROFILES_UPLOAD_PASS"

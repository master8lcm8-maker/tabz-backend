$ErrorActionPreference="Stop"
$base="http://127.0.0.1:3000"

# health must be OK first
$r = Invoke-WebRequest -UseBasicParsing -Uri "$base/health" -TimeoutSec 3
if ($r.StatusCode -ne 200) { throw "FAIL: health not 200" }

# login owner -> token
$token = (Invoke-RestMethod -Method POST -Uri "$base/auth/login-owner" `
  -Body (@{ email="owner@tabz.app"; password="password" } | ConvertTo-Json) `
  -ContentType "application/json").access_token

if (-not $token) { throw "FAIL: owner token missing" }

# create venue (must return slug + ownerProfileId)
$venue = Invoke-RestMethod -Method POST -Uri "$base/venues" `
  -Headers @{ Authorization="Bearer $token" } `
  -Body (@{ name="FV24 Venue"; address="1 Parity Ave"; city="Miami"; state="FL"; country="US" } | ConvertTo-Json) `
  -ContentType "application/json"

"CREATE_OK id=$($venue.id) slug=$($venue.slug) ownerProfileId=$($venue.ownerProfileId)"
if (-not $venue.id) { throw "FAIL: id missing" }
if (-not $venue.slug) { throw "FAIL: slug missing" }
if (-not $venue.ownerProfileId) { throw "FAIL: ownerProfileId missing" }

# public venue must resolve
$pub = Invoke-RestMethod -Method GET -Uri "$base/venues/$($venue.slug)/public"
if (-not $pub.ok) { throw "FAIL: /venues/:slug/public ok=false" }
"PUBLIC_OK venueSlug=$($pub.venue.slug) ownerSlug=$($pub.ownerProfile.slug)"

# public directory must include it
$list = Invoke-RestMethod -Method GET -Uri "$base/venues/public"
if (-not $list.ok) { throw "FAIL: /venues/public ok=false" }

$found = $list.venues | Where-Object { $_.slug -eq $venue.slug }
if (-not $found) { throw "FAIL: slug not found in /venues/public ($($venue.slug))" }

"PUBLIC_LIST_OK slug=$($venue.slug)"

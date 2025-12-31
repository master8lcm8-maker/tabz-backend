# scripts/proof-profiles.ps1
$ErrorActionPreference = "Stop"

if (-not $base) { $base = "http://10.0.0.239:3000" }

function Assert-HasKeys($obj, $keys, $label) {
  foreach ($k in $keys) {
    if (-not ($obj.PSObject.Properties.Name -contains $k)) {
      throw "[$label] Missing key: $k"
    }
  }
}

$reqKeys = @("id","userId","type","displayName","slug","avatarUrl","createdAt")

Write-Host "== Step 2 Proof: Profile Read Surfacing =="

if (-not $buyerToken) { throw "buyerToken missing (run proof-auth.ps1 first)" }
if (-not $ownerToken) { throw "ownerToken missing (run proof-auth.ps1 first)" }
if (-not $staffToken) { throw "staffToken missing (run proof-auth.ps1 first)" }

$bh = @{ Authorization="Bearer $buyerToken" }
$oh = @{ Authorization="Bearer $ownerToken" }
$sh = @{ Authorization="Bearer $staffToken" }

# /profiles/me
$b = Invoke-RestMethod -Uri "$base/profiles/me" -Headers $bh
$o = Invoke-RestMethod -Uri "$base/profiles/me" -Headers $oh
$s = Invoke-RestMethod -Uri "$base/profiles/me" -Headers $sh

Assert-HasKeys $b.profile $reqKeys "buyer /profiles/me"
Assert-HasKeys $o.profile $reqKeys "owner /profiles/me"
Assert-HasKeys $s.profile $reqKeys "staff /profiles/me"

# /profiles/:slug (returns { ok, profile })
$bSlug = Invoke-RestMethod -Uri "$base/profiles/$($b.profile.slug)" -Headers $bh
$oSlug = Invoke-RestMethod -Uri "$base/profiles/$($o.profile.slug)" -Headers $oh
$sSlug = Invoke-RestMethod -Uri "$base/profiles/$($s.profile.slug)" -Headers $sh

Assert-HasKeys $bSlug.profile $reqKeys "buyer /profiles/:slug"
Assert-HasKeys $oSlug.profile $reqKeys "owner /profiles/:slug"
Assert-HasKeys $sSlug.profile $reqKeys "staff /profiles/:slug"

if ($oSlug.profile.id -ne $o.profile.id) {
  throw "[determinism] slug lookup returned different profile"
}

Write-Host "✅ Step 2 Proof PASS"

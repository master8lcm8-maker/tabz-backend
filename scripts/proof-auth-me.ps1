# scripts/proof-auth-me.ps1
$ErrorActionPreference = "Stop"

if (-not $base) { $base = "http://10.0.0.239:3000" }

function Assert-HasKeys($obj, $keys, $label) {
  foreach ($k in $keys) {
    if (-not ($obj.PSObject.Properties.Name -contains $k)) {
      throw "[$label] Missing key: $k"
    }
  }
}

$meKeys = @("userId","email","role","venueId","profileId","profile","profiles")
$profileKeys = @("id","userId","type","displayName","slug","avatarUrl","createdAt")

Write-Host "== Step 3 Proof: /auth/me Canonical Identity Context =="

if (-not $buyerToken) { throw "buyerToken missing (dot-source proof-auth.ps1 first)" }
if (-not $ownerToken) { throw "ownerToken missing (dot-source proof-auth.ps1 first)" }
if (-not $staffToken) { throw "staffToken missing (dot-source proof-auth.ps1 first)" }

$oh = @{ Authorization="Bearer $ownerToken" }
$bh = @{ Authorization="Bearer $buyerToken" }
$sh = @{ Authorization="Bearer $staffToken" }

$owner = Invoke-RestMethod -Method GET -Uri "$base/auth/me" -Headers $oh
$buyer = Invoke-RestMethod -Method GET -Uri "$base/auth/me" -Headers $bh
$staff = Invoke-RestMethod -Method GET -Uri "$base/auth/me" -Headers $sh

Assert-HasKeys $owner $meKeys "owner /auth/me"
Assert-HasKeys $buyer $meKeys "buyer /auth/me"
Assert-HasKeys $staff $meKeys "staff /auth/me"

Assert-HasKeys $owner.profile $profileKeys "owner /auth/me.profile"
Assert-HasKeys $buyer.profile $profileKeys "buyer /auth/me.profile"
Assert-HasKeys $staff.profile $profileKeys "staff /auth/me.profile"

if ($owner.role -ne "owner") { throw "[owner /auth/me] role mismatch: $($owner.role)" }
if ($buyer.role -ne "buyer") { throw "[buyer /auth/me] role mismatch: $($buyer.role)" }
if ($staff.role -ne "staff") { throw "[staff /auth/me] role mismatch: $($staff.role)" }

if ($owner.profileId -ne $owner.profile.id) { throw "[owner] profileId mismatch" }
if ($buyer.profileId -ne $buyer.profile.id) { throw "[buyer] profileId mismatch" }
if ($staff.profileId -ne $staff.profile.id) { throw "[staff] profileId mismatch" }

Write-Host "✅ Step 3 Proof PASS"

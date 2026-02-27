$ErrorActionPreference="Stop"

function TABZ_InsertAfter {
  param(
    [Parameter(Mandatory=$true)][string]$Path,
    [Parameter(Mandatory=$true)][string]$Pattern,
    [Parameter(Mandatory=$true)][string]$InsertText
  )

  $txt = Get-Content -Raw -Encoding UTF8 $Path
  if ($txt -match [regex]::Escape($InsertText)) { return }

  $m = ([regex]$Pattern).Match($txt)
  if (!$m.Success) { throw ("Pattern not found in " + $Path) }

  $idx = $m.Index + $m.Length
  $new = $txt.Substring(0,$idx) + $InsertText + $txt.Substring($idx)
  Set-Content -Encoding UTF8 -NoNewline $Path $new
}

# ------------------------------------------------------------
# 1) freeboard.module.ts : import WalletModule + add to imports[]
# ------------------------------------------------------------
$freeboardModule = ".\src\modules\freeboard\freeboard.module.ts"
$fm = Get-Content -Raw -Encoding UTF8 $freeboardModule

if ($fm -notmatch "WalletModule\s*\}\s*from\s*'\.\.\/\.\.\/wallet\/wallet\.module'") {
  TABZ_InsertAfter -Path $freeboardModule `
    -Pattern "import\s+\{\s*FreeboardController\s*\}\s+from\s+'\.\/freeboard\.controller';\s*" `
    -InsertText "`r`nimport { WalletModule } from '../../wallet/wallet.module';`r`n"
}

$fm = Get-Content -Raw -Encoding UTF8 $freeboardModule
if ($fm -notmatch "imports:\s*\[[^\]]*WalletModule") {
  $fm2 = [regex]::Replace(
    $fm,
    "imports:\s*\[\s*",
    "imports: [`r`n    WalletModule,`r`n    ",
    1
  )
  Set-Content -Encoding UTF8 -NoNewline $freeboardModule $fm2
}

# ------------------------------------------------------------
# 2) freeboard.service.ts : import WalletService + inject + reward deposit on claim success
# ------------------------------------------------------------
$freeboardService = ".\src\modules\freeboard\freeboard.service.ts"
$fs = Get-Content -Raw -Encoding UTF8 $freeboardService

if ($fs -notmatch "WalletService\s*\}\s*from\s*'\.\.\/\.\.\/wallet\/wallet\.service'") {
  TABZ_InsertAfter -Path $freeboardService `
    -Pattern "import\s+\{\s*InjectRepository\s*\}\s+from\s+'@nestjs\/typeorm';\s*" `
    -InsertText "import { WalletService } from '../../wallet/wallet.service';`r`n"
}

$fs = Get-Content -Raw -Encoding UTF8 $freeboardService
if ($fs -notmatch "private readonly walletService:\s*WalletService") {
  # insert walletService param right after dropsRepo param (non-destructive)
  $fs2 = [regex]::Replace(
    $fs,
    "(private readonly dropsRepo:\s*Repository<FreeboardDrop>\s*,)",
    "`$1`r`n    private readonly walletService: WalletService,",
    1
  )
  if ($fs2 -eq $fs) { throw "Constructor injection patch failed (dropsRepo match not found)" }
  Set-Content -Encoding UTF8 -NoNewline $freeboardService $fs2
}

$fs = Get-Content -Raw -Encoding UTF8 $freeboardService
if ($fs -notmatch "freeboard_reward_deposit_patch") {
  $needle = "const claimed = await this\.dropsRepo\.findOne\(\{ where: \{ claimCode \} \}\);\s*return claimed!;"
  $replace = @"
const claimed = await this.dropsRepo.findOne({ where: { claimCode } });

      // freeboard_reward_deposit_patch
      const reward = Number((claimed as any)?.rewardCents ?? 0);
      if (Number.isFinite(reward) && reward > 0) {
        await this.walletService.deposit(claimerId, reward);
      }

      return claimed!;
"@
  $fs2 = [regex]::Replace($fs, $needle, $replace, 1)
  if ($fs2 -eq $fs) { throw "Claim success patch failed (needle not found)" }
  Set-Content -Encoding UTF8 -NoNewline $freeboardService $fs2
}

git diff -- .\src\modules\freeboard\freeboard.module.ts .\src\modules\freeboard\freeboard.service.ts

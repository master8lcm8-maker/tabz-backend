$ErrorActionPreference="Stop"

function Insert-AfterPattern {
  param(
    [Parameter(Mandatory=$true)][string]$Path,
    [Parameter(Mandatory=$true)][string]$Pattern,
    [Parameter(Mandatory=$true)][string]$InsertText,

    # Accept -Encoding if it gets accidentally passed (prevents crash)
    [Parameter(Mandatory=$false)][string]$Encoding = "UTF8"
  )

  $txt = Get-Content -Raw -Encoding UTF8 $Path
  if ($txt -match [regex]::Escape($InsertText)) { return }

  $rx = [regex]$Pattern
  $m = $rx.Match($txt)
  if (!$m.Success) { throw ("Pattern not found in " + $Path) }

  $idx = $m.Index + $m.Length
  $new = $txt.Substring(0,$idx) + $InsertText + $txt.Substring($idx)

  Set-Content -Encoding UTF8 -NoNewline $Path $new
}

# ------------------------------------------------------------
# 1) freeboard.module.ts
# ------------------------------------------------------------
$freeboardModule = ".\src\modules\freeboard\freeboard.module.ts"
$fm = Get-Content -Raw -Encoding UTF8 $freeboardModule

if ($fm -notmatch "from '\.\.\/\.\.\/wallet\/wallet\.module'") {
  Insert-AfterPattern -Path $freeboardModule `
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
# 2) freeboard.service.ts
# ------------------------------------------------------------
$freeboardService = ".\src\modules\freeboard\freeboard.service.ts"
$fs = Get-Content -Raw -Encoding UTF8 $freeboardService

if ($fs -notmatch "from '\.\.\/\.\.\/wallet\/wallet\.service'") {
  Insert-AfterPattern -Path $freeboardService `
    -Pattern "import\s+\{\s*InjectRepository\s*\}\s+from\s+'@nestjs\/typeorm';\s*" `
    -InsertText "import { WalletService } from '../../wallet/wallet.service';`r`n"
}

$fs = Get-Content -Raw -Encoding UTF8 $freeboardService

if ($fs -notmatch "private readonly walletService:\s*WalletService") {
  $fs2 = [regex]::Replace(
    $fs,
    "constructor\(\s*[\r\n]+\s*@InjectRepository\(FreeboardDrop\)[\s\r\n]+private readonly dropsRepo:\s*Repository<FreeboardDrop>,\s*[\r\n]+\s*\)\s*\{\s*\}",
    "constructor(`r`n    @InjectRepository(FreeboardDrop)`r`n    private readonly dropsRepo: Repository<FreeboardDrop>,`r`n    private readonly walletService: WalletService,`r`n  ) {}`r`n",
    1
  )
  if ($fs2 -eq $fs) { throw "Constructor patch failed" }
  Set-Content -Encoding UTF8 -NoNewline $freeboardService $fs2
}

$fs = Get-Content -Raw -Encoding UTF8 $freeboardService

if ($fs -notmatch "freeboard_reward") {
  $needle = "const claimed = await this\.dropsRepo\.findOne\(\{ where: \{ claimCode \} \}\);\s*return claimed!;"
  $replace = @"
const claimed = await this.dropsRepo.findOne({ where: { claimCode } });

      const reward = Number((claimed as any)?.rewardCents ?? 0);
      if (Number.isFinite(reward) && reward > 0) {
        const existing = await this.walletService.getTransactionsForUser(claimerId).catch(() => []);
        const already = (existing || []).some((t: any) => {
          const m = t?.metadata;
          return m && Number(m.dropId) === Number((claimed as any).id) && String(m.reason) === 'freeboard_reward';
        });

        if (!already) {
          await this.walletService.deposit(claimerId, reward);
        }
      }

      return claimed!;
"@
  $fs2 = [regex]::Replace($fs, $needle, $replace, 1)
  if ($fs2 -eq $fs) { throw "Claim patch failed" }
  Set-Content -Encoding UTF8 -NoNewline $freeboardService $fs2
}

git diff -- .\src\modules\freeboard\freeboard.module.ts .\src\modules\freeboard\freeboard.service.ts

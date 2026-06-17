$ErrorActionPreference = 'Continue'
Set-Location 'd:\starai\starai-exchange\server'

Write-Host '=== Step 1: tsc typecheck ===' -ForegroundColor Cyan
npx tsc -p tsconfig.json --noEmit 2>&1 | Out-String | ForEach-Object { if ($_ -match '\S') { Write-Host "  $_" } }
if ($LASTEXITCODE -ne 0) { Write-Host "  TYPECHECK FAILED" -ForegroundColor Red; exit 1 }

Write-Host ''
Write-Host '=== Step 2: ensure all dependencies are installed ===' -ForegroundColor Cyan
npm install --no-audit --no-fund --loglevel=error 2>&1 | Out-String | ForEach-Object { if ($_ -match '\S') { Write-Host "  $_" } }
if ($LASTEXITCODE -ne 0) { Write-Host "  npm install FAILED" -ForegroundColor Red; exit 1 }

Write-Host ''
Write-Host '=== Step 3: smoke-test the start command (boot + /healthz) ===' -ForegroundColor Cyan
$proc = Start-Process -FilePath 'node' -ArgumentList '--import','tsx/esm','src/index.ts' -PassThru -RedirectStandardOutput 'startup.log' -RedirectStandardError 'startup.err' -WorkingDirectory 'd:\starai\starai-exchange\server'
Start-Sleep -Seconds 6
try {
  $r = Invoke-WebRequest -Uri 'http://127.0.0.1:4000/healthz' -UseBasicParsing -TimeoutSec 5
  Write-Host "  /healthz: $($r.StatusCode) - $($r.Content)"
} catch {
  Write-Host "  /healthz FAILED: $($_.Exception.Message)" -ForegroundColor Red
}
try {
  $r = Invoke-WebRequest -Uri 'http://127.0.0.1:4000/api/market/global' -UseBasicParsing -TimeoutSec 8
  Write-Host "  /api/market/global: $($r.StatusCode) (length $($r.Content.Length))"
} catch {
  Write-Host "  /api/market/global FAILED: $($_.Exception.Message)" -ForegroundColor Red
}
Get-Process -Id $proc.Id -ErrorAction SilentlyContinue | Stop-Process -Force
Write-Host ''
Write-Host '=== startup.log tail ==='
if (Test-Path startup.log) { Get-Content startup.log -Tail 15 }
Write-Host ''
Write-Host '=== startup.err tail ==='
if (Test-Path startup.err) { Get-Content startup.err -Tail 10 }
Remove-Item -Force startup.log,startup.err -ErrorAction SilentlyContinue

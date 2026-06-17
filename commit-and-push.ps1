$ErrorActionPreference = 'Continue'
Set-Location 'd:\starai\starai-exchange'

Write-Host '=== Pre-flight: ensure no .env secrets will be staged ===' -ForegroundColor Cyan
$dry = git add --dry-run . 2>&1 | Out-String
# Only block actual secrets. Helper scripts get deleted at the end.
$leak = $dry | Select-String -Pattern '(^|[\/\\])\.env$|server[\/\\]\.env$'
if ($leak) {
  Write-Host "PROBLEM: would stage these forbidden paths:" -ForegroundColor Red
  $leak | ForEach-Object { Write-Host "  $_" }
  exit 1
}
Write-Host "  OK" -ForegroundColor Green

Write-Host ''
Write-Host '=== git add . ===' -ForegroundColor Cyan
git add . 2>&1 | Out-String | ForEach-Object { if ($_ -match '\S') { Write-Host "  $_" } }

Write-Host ''
Write-Host '=== git status (top of staged set) ===' -ForegroundColor Cyan
git diff --cached --name-only 2>&1 | Select-Object -First 30 | ForEach-Object { Write-Host "  $_" }

Write-Host ''
Write-Host '=== git commit ===' -ForegroundColor Cyan
git commit -m 'feat: add Express backend with auth, wallet, market routes for render deploy' 2>&1 | Out-String | ForEach-Object { if ($_ -match '\S') { Write-Host "  $_" } }

Write-Host ''
Write-Host '=== git push origin main ===' -ForegroundColor Cyan
git push origin main 2>&1 | Out-String | ForEach-Object { if ($_ -match '\S') { Write-Host "  $_" } }

Write-Host ''
Write-Host '=== final log ===' -ForegroundColor Cyan
git log --oneline -3

# cleanup helpers
Remove-Item -Force 'd:\starai\starai-exchange\verify-server.ps1' -ErrorAction SilentlyContinue
Remove-Item -Force 'd:\starai\starai-exchange\commit-and-push.ps1' -ErrorAction SilentlyContinue
Remove-Item -Force 'd:\starai\inspect-server.ps1' -ErrorAction SilentlyContinue
Write-Host ''
Write-Host "helper scripts removed"

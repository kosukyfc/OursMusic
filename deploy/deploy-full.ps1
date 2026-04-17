# ══════════════════════════════════════════════════════════════════════════════
# deploy-full.ps1 — Deploy completo: banco + frontend + backend
# Execute na raiz do projeto: .\deploy\deploy-full.ps1
# ══════════════════════════════════════════════════════════════════════════════

param(
    [switch]$SkipDb      = $false,  # pula exportação do banco
    [switch]$SkipBuild   = $false,  # pula build do frontend
    [switch]$SkipBackend = $false   # pula build do backend
)

$ErrorActionPreference = "Stop"

Write-Host "══════════════════════════════════════" -ForegroundColor Magenta
Write-Host "  OursMusic — Deploy Completo"          -ForegroundColor Magenta
Write-Host "══════════════════════════════════════" -ForegroundColor Magenta
Write-Host ""

# ── 1. Exportar banco ─────────────────────────────────────────────────────────
if (-not $SkipDb) {
    Write-Host "[1/4] Exportando banco de dados..." -ForegroundColor Cyan
    & .\deploy\db-export.ps1
    Write-Host ""
}

# ── 2. Build do frontend ──────────────────────────────────────────────────────
if (-not $SkipBuild) {
    Write-Host "[2/4] Buildando frontend React..." -ForegroundColor Cyan
    Set-Location web
    npm run build
    if ($LASTEXITCODE -ne 0) { Write-Host "Erro no build do frontend!" -ForegroundColor Red; exit 1 }
    Set-Location ..
    Write-Host "Frontend buildado em C:\xampp\htdocs\oursmusics" -ForegroundColor Green
    Write-Host ""
}

# ── 3. Build do backend ───────────────────────────────────────────────────────
if (-not $SkipBackend) {
    Write-Host "[3/4] Buildando backend NestJS..." -ForegroundColor Cyan
    Set-Location backend
    npm run build
    if ($LASTEXITCODE -ne 0) { Write-Host "Erro no build do backend!" -ForegroundColor Red; exit 1 }
    Set-Location ..
    Write-Host "Backend buildado em backend/dist" -ForegroundColor Green
    Write-Host ""
}

# ── 4. Migrations do Prisma ───────────────────────────────────────────────────
Write-Host "[4/4] Aplicando migrations do Prisma..." -ForegroundColor Cyan
Set-Location backend
npx prisma migrate deploy
if ($LASTEXITCODE -ne 0) { Write-Host "Erro nas migrations!" -ForegroundColor Red; exit 1 }
Set-Location ..
Write-Host "Migrations aplicadas!" -ForegroundColor Green
Write-Host ""

# ── Resumo ────────────────────────────────────────────────────────────────────
Write-Host "══════════════════════════════════════" -ForegroundColor Green
Write-Host "  Deploy concluido!"                    -ForegroundColor Green
Write-Host "══════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "Checklist final:" -ForegroundColor Yellow
Write-Host "  [ ] backend/.env preenchido com secrets reais"
Write-Host "  [ ] GOOGLE_CALLBACK_URL=https://oursmusics.shop/auth/google/callback"
Write-Host "  [ ] Apache VirtualHost configurado (deploy/apache-vhost.conf)"
Write-Host "  [ ] SSL instalado (Win-ACME ou certbot)"
Write-Host "  [ ] Backend rodando: cd backend && node dist/src/main"
Write-Host "  [ ] Acesse: https://oursmusics.shop"

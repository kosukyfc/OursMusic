# ══════════════════════════════════════════════════════════════════════════════
# db-import.ps1 — Importa o backup SQL na VPS
# Execute NA VPS: .\deploy\db-import.ps1
# ══════════════════════════════════════════════════════════════════════════════

param(
    [string]$SqlFile = ""
)

# Se não passou o arquivo, pega o mais recente
if (-not $SqlFile) {
    $SqlFile = Get-ChildItem "deploy\backup_*.sql" |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1 -ExpandProperty FullName
}

if (-not $SqlFile -or -not (Test-Path $SqlFile)) {
    Write-Host "Nenhum arquivo SQL encontrado. Execute db-export.ps1 primeiro." -ForegroundColor Red
    exit 1
}

$DB_HOST = "localhost"
$DB_PORT = "5432"
$DB_NAME = "music_streaming"
$DB_USER = "postgres"

Write-Host "Importando '$SqlFile' para '$DB_NAME'..." -ForegroundColor Cyan

# Cria o banco se não existir
$env:PGPASSWORD = Read-Host "Senha do PostgreSQL da VPS" -AsSecureString |
    [System.Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($_)
    )

# Cria o banco (ignora erro se já existir)
& psql --host=$DB_HOST --port=$DB_PORT --username=$DB_USER --dbname=postgres `
    --command="CREATE DATABASE $DB_NAME ENCODING 'UTF8';" 2>$null

# Importa o dump
& psql `
    --host=$DB_HOST `
    --port=$DB_PORT `
    --username=$DB_USER `
    --dbname=$DB_NAME `
    --file=$SqlFile

if ($LASTEXITCODE -eq 0) {
    Write-Host "Banco importado com sucesso!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Proximo passo: rode as migrations pendentes:" -ForegroundColor Yellow
    Write-Host "  cd backend && npx prisma migrate deploy"
} else {
    Write-Host "Erro ao importar. Verifique os logs acima." -ForegroundColor Red
}

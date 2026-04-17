# ══════════════════════════════════════════════════════════════════════════════
# db-export.ps1 — Exporta o banco local para um arquivo SQL
# Execute na raiz do projeto: .\deploy\db-export.ps1
#
# Requisito: pg_dump no PATH (vem com o PostgreSQL)
#   Normalmente em: C:\Program Files\PostgreSQL\<versao>\bin\pg_dump.exe
# ══════════════════════════════════════════════════════════════════════════════

$DB_HOST     = "localhost"
$DB_PORT     = "5432"
$DB_NAME     = "music_streaming"
$DB_USER     = "postgres"
$OUTPUT_FILE = "deploy\backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql"

Write-Host "Exportando banco '$DB_NAME'..." -ForegroundColor Cyan

$env:PGPASSWORD = Read-Host "Senha do PostgreSQL local" -AsSecureString |
    [System.Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($_)
    )

# Exporta schema + dados, sem owner (facilita importar em outro servidor)
& pg_dump `
    --host=$DB_HOST `
    --port=$DB_PORT `
    --username=$DB_USER `
    --dbname=$DB_NAME `
    --no-owner `
    --no-acl `
    --format=plain `
    --encoding=UTF8 `
    --file=$OUTPUT_FILE

if ($LASTEXITCODE -eq 0) {
    $size = [math]::Round((Get-Item $OUTPUT_FILE).Length / 1MB, 2)
    Write-Host "Exportado com sucesso: $OUTPUT_FILE ($size MB)" -ForegroundColor Green
    Write-Host ""
    Write-Host "Proximo passo: copie o arquivo para a VPS e execute:" -ForegroundColor Yellow
    Write-Host "  .\deploy\db-import.ps1"
    Write-Host "  ou via psql na VPS:"
    Write-Host "  psql -U postgres -d music_streaming -f $OUTPUT_FILE"
} else {
    Write-Host "Erro ao exportar. Verifique se pg_dump esta no PATH." -ForegroundColor Red
    Write-Host "Adicione ao PATH: C:\Program Files\PostgreSQL\<versao>\bin"
}

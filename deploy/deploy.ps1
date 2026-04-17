# deploy.ps1 — build do frontend e deploy para XAMPP
# Execute na raiz do projeto: .\deploy\deploy.ps1

Write-Host "Buildando frontend..." -ForegroundColor Cyan
Set-Location web
npm run build
Set-Location ..

Write-Host "Frontend copiado para C:\xampp\htdocs\oursmusics" -ForegroundColor Green
Write-Host ""
Write-Host "Proximos passos:" -ForegroundColor Yellow
Write-Host "1. Certifique-se que o backend esta rodando: cd backend && npm run start:prod"
Write-Host "2. Certifique-se que o Apache esta com o VirtualHost configurado"
Write-Host "3. Acesse https://oursmusics.shop"

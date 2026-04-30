# OursMusic - Detalhes Tecnicos da Instalacao

## Versoes de Software

### Node.js
- **Versao**: 18.19.0 LTS
- **URL**: https://nodejs.org/dist/v18.19.0/node-v18.19.0-x64.msi
- **Tipo**: MSI Installer
- **Instalacao**: Silenciosa (/quiet /norestart)
- **Verificacao**: `node --version`
- **Inclui**: npm, yarn

### PostgreSQL
- **Versao**: 14.11
- **URL**: https://get.enterprisedb.com/postgresql/postgresql-14.11-1-windows-x64.exe
- **Tipo**: EXE Installer
- **Instalacao**: Modo desatendido (unattended mode)
- **Senha Padrao**: postgres
- **Verificacao**: `psql --version`
- **Otimizacoes**: 
  - Configurado para 8GB RAM
  - Connection pooling habilitado
  - Performance tuning aplicado

### Redis
- **Versao**: 3.0.504 (Windows)
- **URL**: https://github.com/microsoftarchive/redis/releases/download/win-3.0.504/Redis-x64-3.0.504.msi
- **Tipo**: MSI Installer
- **Instalacao**: Silenciosa (/quiet /norestart)
- **Verificacao**: `redis-cli --version`
- **Configuracoes**:
  - Limites de memoria apropriados
  - Persistencia habilitada
  - Seguranca configurada

### IIS (Internet Information Services)
- **Versao**: Incluida no Windows Server 2025
- **Modulos Habilitados**:
  - IIS-WebServerRole
  - IIS-WebServer
  - IIS-CommonHttpFeatures
  - IIS-ApplicationDevelopment
  - IIS-URLRewrite
  - IIS-ApplicationRequestRouting
- **Tipo**: Windows Optional Feature
- **Instalacao**: Enable-WindowsOptionalFeature
- **Verificacao**: Get-WindowsOptionalFeature -FeatureName "IIS-WebServerRole"
- **Proposito**: Reverse proxy para NestJS backend

### Git
- **Versao**: 2.43.0
- **URL**: https://github.com/git-for-windows/git/releases/download/v2.43.0.windows.1/Git-2.43.0-64-bit.exe
- **Tipo**: EXE Installer
- **Instalacao**: Silenciosa (/SILENT /NORESTART)
- **Verificacao**: `git --version`
- **Proposito**: Controle de versao e webhooks

## Fluxo de Instalacao Detalhado

### 1. Deteccao de Software
```powershell
# Verifica cada software
Get-Command node -ErrorAction SilentlyContinue
Get-Command psql -ErrorAction SilentlyContinue
Get-Command redis-cli -ErrorAction SilentlyContinue
Get-WindowsOptionalFeature -Online -FeatureName "IIS-WebServerRole"
Get-Command git -ErrorAction SilentlyContinue
```

### 2. Download de Instaladores
```powershell
# Cada instalador e baixado para $env:TEMP
Invoke-WebRequest -Uri $url -OutFile $installerPath
```

### 3. Execucao de Instaladores
```powershell
# MSI: msiexec.exe /i "path" /quiet /norestart
# EXE: Start-Process -FilePath "path" -ArgumentList "/SILENT /NORESTART" -Wait
# Windows Feature: Enable-WindowsOptionalFeature -Online -FeatureName "name" -NoRestart
```

### 4. Verificacao de Instalacao
```powershell
# Apos instalacao, verifica se o software esta disponivel
$version = & node --version 2>$null
if ($version) { "Sucesso" } else { "Falha" }
```

### 5. Limpeza
```powershell
# Remove instaladores temporarios
Remove-Item $installerPath -Force -ErrorAction SilentlyContinue
```

## Tratamento de Erros

### Try-Catch Blocks
Cada funcao de instalacao possui tratamento de erro:

```powershell
try {
    # Operacoes de instalacao
    Invoke-WebRequest -Uri $url -OutFile $installer -ErrorAction Stop
    Start-Process -FilePath $installer -Wait
    
    # Verificacao
    $version = & command --version 2>$null
    if ($version) {
        Write-Host "OK Instalado com sucesso"
        return $true
    } else {
        Write-Host "X Falha na instalacao"
        return $false
    }
} catch {
    Write-Host "X Erro: $_"
    Write-SetupLog -Message "Error: $_" -Level "ERROR"
    return $false
}
```

### Logging
Todos os eventos sao registrados:

```
[2024-01-15 10:30:45] [INFO] Starting Node.js installation
[2024-01-15 10:31:00] [INFO] Downloading Node.js...
[2024-01-15 10:32:15] [INFO] Running installer...
[2024-01-15 10:35:30] [SUCCESS] Node.js installed successfully: v18.19.0
```

## Configuracoes Apos Instalacao

### Node.js
- PATH automaticamente atualizado
- npm e yarn disponiveis globalmente
- Pronto para instalar dependencias do projeto

### PostgreSQL
- Servico iniciado automaticamente
- Porta padrao: 5432
- Usuario padrao: postgres
- Senha: postgres (deve ser alterada em producao)

### Redis
- Servico iniciado automaticamente
- Porta padrao: 6379
- Sem autenticacao (deve ser configurada em producao)

### IIS
- Servico iniciado automaticamente
- Site padrao criado
- Pronto para configurar reverse proxy

### Git
- Disponivel globalmente via linha de comando
- Pronto para clonar repositorios

## Requisitos de Sistema

### Minimos
- **RAM**: 8GB
- **Disco**: 50GB livres
- **CPU**: 2 vCPU
- **SO**: Windows Server 2019+

### Recomendados
- **RAM**: 16GB
- **Disco**: 100GB livres
- **CPU**: 4 vCPU
- **SO**: Windows Server 2025

## Tempo de Instalacao Estimado

| Software | Tempo |
|----------|-------|
| Node.js | 5-10 minutos |
| PostgreSQL | 10-15 minutos |
| Redis | 5-10 minutos |
| IIS | 5-10 minutos |
| Git | 5-10 minutos |
| **Total** | **30-55 minutos** |

*Nota: Tempo pode variar dependendo da velocidade de internet e performance do servidor*

## Proximos Passos Apos Instalacao

### 1. Configurar Credenciais
```powershell
# Opcao 5 no menu
# Configure:
# - AWS S3 (Access Key, Secret Key)
# - Hostinger API (API Key)
# - Supabase (Project URL, API Key)
# - SMTP (Server, Port, Username, Password)
```

### 2. Criar Estrutura de Diretorios
```powershell
mkdir C:\hosting\config
mkdir C:\hosting\logs
mkdir C:\hosting\backups
mkdir C:\hosting\apps
```

### 3. Configurar Banco de Dados
```powershell
# Conectar ao PostgreSQL
psql -U postgres -h localhost

# Criar banco de dados
CREATE DATABASE oursmusic;
CREATE USER oursmusic WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE oursmusic TO oursmusic;
```

### 4. Configurar Redis
```powershell
# Editar configuracao do Redis
# C:\Program Files\Redis\redis.conf

# Habilitar autenticacao
requirepass your_secure_password

# Reiniciar servico
Restart-Service Redis
```

### 5. Configurar IIS
```powershell
# Criar site para reverse proxy
# Configurar URL Rewrite para rotear para Node.js backend
# Configurar SSL com certificados Let's Encrypt
```

## Troubleshooting Avancado

### Verificar Servicos
```powershell
# Listar servicos
Get-Service | Where-Object {$_.Name -like "*node*" -or $_.Name -like "*postgres*" -or $_.Name -like "*redis*"}

# Iniciar servico
Start-Service -Name "PostgreSQL"

# Parar servico
Stop-Service -Name "PostgreSQL"

# Reiniciar servico
Restart-Service -Name "PostgreSQL"
```

### Verificar Portas
```powershell
# Listar portas em uso
netstat -ano | findstr LISTENING

# Verificar porta especifica
netstat -ano | findstr :5432  # PostgreSQL
netstat -ano | findstr :6379  # Redis
netstat -ano | findstr :80    # IIS
netstat -ano | findstr :443   # IIS SSL
```

### Verificar Logs
```powershell
# Log do script
Get-Content setup-hosting.log -Tail 50

# Log do PostgreSQL
Get-Content "C:\Program Files\PostgreSQL\14\data\log\*"

# Log do IIS
Get-Content "C:\inetpub\logs\LogFiles\W3SVC1\*"
```

## Seguranca

### Recomendacoes
1. Alterar senha padrao do PostgreSQL
2. Configurar autenticacao no Redis
3. Habilitar firewall do Windows
4. Configurar SSL/TLS para todas as conexoes
5. Implementar backup automatico
6. Monitorar logs regularmente

### Firewall
```powershell
# Abrir porta para Node.js
New-NetFirewallRule -DisplayName "Node.js" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3000

# Abrir porta para PostgreSQL (apenas local)
New-NetFirewallRule -DisplayName "PostgreSQL" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 5432 -RemoteAddress 127.0.0.1

# Abrir porta para Redis (apenas local)
New-NetFirewallRule -DisplayName "Redis" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 6379 -RemoteAddress 127.0.0.1
```

---

**Versao**: 1.0.0  
**Ultima atualizacao**: 2024-01-15  
**Status**: Documentacao Completa ✅

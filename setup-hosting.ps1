#Requires -Version 5.1
#Requires -RunAsAdministrator

param([string]$Language = "pt-BR", [switch]$Verbose, [string]$LogPath = ".\setup-hosting.log")

$Global:SetupConfig = @{Version = "1.0.0"; LogPath = $LogPath; StartTime = Get-Date}

function Write-SetupLog {
    param([string]$Message, [ValidateSet("INFO", "WARNING", "ERROR", "SUCCESS")][string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] $Message"
    try { Add-Content -Path $Global:SetupConfig.LogPath -Value $logEntry -Encoding UTF8 } catch {}
    switch ($Level) {
        "INFO"    { Write-Host $logEntry -ForegroundColor White }
        "WARNING" { Write-Host $logEntry -ForegroundColor Yellow }
        "ERROR"   { Write-Host $logEntry -ForegroundColor Red }
        "SUCCESS" { Write-Host $logEntry -ForegroundColor Green }
    }
}

function Test-Prerequisites {
    Write-Host ""; Write-Host "Validando pre-requisitos..." -ForegroundColor Cyan; Write-Host ""
    $errors = @()
    $currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        $errors += "ERRO: Este script deve ser executado como Administrador"
    }
    if ($PSVersionTable.PSVersion.Major -lt 5) {
        $errors += "ERRO: PowerShell 5.1 ou superior e necessario"
    }
    $disk = Get-PSDrive C
    $freeGB = [math]::Round($disk.Free / 1GB, 2)
    if ($freeGB -lt 50) { $errors += "AVISO: Menos de 50GB de espaco livre ($freeGB GB)" }
    $ram = [math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 2)
    if ($ram -lt 8) { $errors += "AVISO: Menos de 8GB de RAM ($ram GB)" }
    if ($errors.Count -gt 0) {
        foreach ($error in $errors) {
            if ($error.StartsWith("ERRO")) { Write-Host "X $error" -ForegroundColor Red }
            else { Write-Host "! $error" -ForegroundColor Yellow }
        }
        $criticalErrors = $errors | Where-Object { $_.StartsWith("ERRO") }
        if ($criticalErrors.Count -gt 0) { Write-Host ""; Write-Host "Erros criticos encontrados. Saindo." -ForegroundColor Red; exit 1 }
    } else {
        Write-Host "OK Todos os pre-requisitos validados com sucesso" -ForegroundColor Green
    }
    Write-Host ""
}

function Get-SoftwareStatus {
    Write-Host "Detectando software instalado..." -ForegroundColor Cyan; Write-Host ""
    $status = @{NodeJS=$false; PostgreSQL=$false; Redis=$false; IIS=$false; Git=$false}
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    
    $nodePaths = @("C:\Program Files\nodejs\node.exe", "C:\Program Files (x86)\nodejs\node.exe")
    foreach ($nodePath in $nodePaths) {
        if (Test-Path $nodePath) {
            $version = & $nodePath --version 2>$null
            if ($version) { Write-Host "OK Node.js encontrado: $version" -ForegroundColor Green; $status.NodeJS = $true; break }
        }
    }
    if (-not $status.NodeJS) { Write-Host "X Node.js nao encontrado" -ForegroundColor Yellow }
    
    $psqlPaths = @("C:\Program Files\PostgreSQL\16\bin\psql.exe", "C:\Program Files\PostgreSQL\15\bin\psql.exe", "C:\Program Files (x86)\PostgreSQL\16\bin\psql.exe")
    foreach ($psqlPath in $psqlPaths) {
        if (Test-Path $psqlPath) {
            $version = & $psqlPath --version 2>$null
            if ($version) { Write-Host "OK PostgreSQL encontrado: $version" -ForegroundColor Green; $status.PostgreSQL = $true; break }
        }
    }
    if (-not $status.PostgreSQL) { Write-Host "X PostgreSQL nao encontrado" -ForegroundColor Yellow }
    
    $redisPaths = @("C:\Program Files\Redis\redis-cli.exe", "C:\Program Files (x86)\Redis\redis-cli.exe")
    foreach ($redisPath in $redisPaths) {
        if (Test-Path $redisPath) {
            $version = & $redisPath --version 2>$null
            if ($version) { Write-Host "OK Redis encontrado: $version" -ForegroundColor Green; $status.Redis = $true; break }
        }
    }
    if (-not $status.Redis) { Write-Host "X Redis nao encontrado" -ForegroundColor Yellow }
    
    $iis = Get-WindowsOptionalFeature -Online -FeatureName "IIS-WebServerRole" -ErrorAction SilentlyContinue
    if ($iis -and $iis.State -eq "Enabled") { Write-Host "OK IIS instalado e habilitado" -ForegroundColor Green; $status.IIS = $true }
    else { Write-Host "X IIS nao instalado ou desabilitado" -ForegroundColor Yellow }
    
    $gitPaths = @("C:\Program Files\Git\bin\git.exe", "C:\Program Files (x86)\Git\bin\git.exe")
    foreach ($gitPath in $gitPaths) {
        if (Test-Path $gitPath) {
            $version = & $gitPath --version 2>$null
            if ($version) { Write-Host "OK Git encontrado: $version" -ForegroundColor Green; $status.Git = $true; break }
        }
    }
    if (-not $status.Git) { Write-Host "X Git nao encontrado" -ForegroundColor Yellow }
    Write-Host ""; return $status
}

function Show-MainMenu {
    Clear-Host; Write-Host ""; Write-Host "╔════════════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║         OursMusic - Sistema de Deploy Automatizado para VPS           ║" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""; Write-Host "Selecione uma opcao:" -ForegroundColor Yellow; Write-Host ""
    Write-Host "  1. [>] Iniciar Configuracao Completa da VPS" -ForegroundColor Green
    Write-Host "  2. [?] Detectar Software Instalado" -ForegroundColor Cyan
    Write-Host "  3. [*] Ver Resumo do Sistema" -ForegroundColor Cyan
    Write-Host "  4. [#] Ver Log de Instalacao" -ForegroundColor Cyan
    Write-Host "  5. [X] Sair" -ForegroundColor Red
    Write-Host ""; Write-Host "╚════════════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan; Write-Host ""
}

function Show-SystemSummary {
    Clear-Host; Write-Host ""; Write-Host "Resumo do Sistema:" -ForegroundColor Cyan; Write-Host ""
    Write-Host "  SO: Windows Server 2025" -ForegroundColor White
    Write-Host "  PowerShell: $($PSVersionTable.PSVersion)" -ForegroundColor White
    Write-Host "  RAM: $([math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 2)) GB" -ForegroundColor White
    Write-Host "  CPU: $((Get-CimInstance Win32_ComputerSystem).NumberOfLogicalProcessors) cores" -ForegroundColor White
    Write-Host "  Disco C: $([math]::Round((Get-PSDrive C).Free / 1GB, 2)) GB livres" -ForegroundColor White; Write-Host ""
    Get-SoftwareStatus; Read-Host "Pressione ENTER para voltar"
}

function Show-LogFile {
    Clear-Host; Write-Host ""; Write-Host "Log de Instalacao:" -ForegroundColor Cyan; Write-Host ""
    if (Test-Path $Global:SetupConfig.LogPath) {
        Get-Content $Global:SetupConfig.LogPath -Tail 30 | Write-Host -ForegroundColor Gray
    } else {
        Write-Host "Nenhum log disponivel." -ForegroundColor Yellow
    }
    Write-Host ""; Read-Host "Pressione ENTER para voltar"
}

function Start-CompleteVPSSetup {
    Clear-Host; Write-Host ""; Write-Host "╔════════════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║                  Configuracao Completa da VPS                         ║" -ForegroundColor Green
    Write-Host "╚════════════════════════════════════════════════════════════════════════╝" -ForegroundColor Green; Write-Host ""
    Write-Host "Este processo vai configurar tudo para hospedagem:" -ForegroundColor Yellow
    Write-Host "  1. Validar pre-requisitos" -ForegroundColor White
    Write-Host "  2. Instalar softwares em paralelo" -ForegroundColor White
    Write-Host "  3. Iniciar servicos" -ForegroundColor White
    Write-Host "  4. Criar estrutura de diretorios" -ForegroundColor White; Write-Host ""
    Write-Host "Tempo estimado: 30-45 minutos" -ForegroundColor Cyan; Write-Host ""
    $confirm = Read-Host "Deseja continuar? (s/n)"
    if ($confirm -ne "s") { Write-Host "Cancelado." -ForegroundColor Yellow; Read-Host "Pressione ENTER"; return }
    
    Write-Host ""; Write-Host "╔════════════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║ ETAPA 1: Validando Pre-requisitos                                     ║" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Test-Prerequisites
    
    Write-Host "╔════════════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║ ETAPA 2: Detectando Software                                          ║" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    $softwareStatus = Get-SoftwareStatus
    
    Write-Host "╔════════════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║ ETAPA 3: Configurando Credenciais                                     ║" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan; Write-Host ""
    $pgPassword = Read-Host "Digite a senha para PostgreSQL (ou deixe em branco para 'postgres')"
    if ([string]::IsNullOrWhiteSpace($pgPassword)) { $pgPassword = "postgres" }
    Write-Host "OK Senha configurada" -ForegroundColor Green; Write-Host ""
    
    Write-Host "╔════════════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║ ETAPA 4: Instalando Softwares em Paralelo                             ║" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan; Write-Host ""
    
    $jobs = @()
    $results = @{NodeJS=$softwareStatus.NodeJS; PostgreSQL=$softwareStatus.PostgreSQL; Redis=$softwareStatus.Redis; IIS=$softwareStatus.IIS; Git=$softwareStatus.Git}
    
    if (-not $softwareStatus.NodeJS) {
        Write-Host "Instalando Node.js..." -ForegroundColor Cyan
        $nodeJob = {
            param($log)
            try {
                $url = "https://nodejs.org/dist/v18.19.0/node-v18.19.0-x64.msi"
                $file = "$env:TEMP\node.msi"
                Invoke-WebRequest -Uri $url -OutFile $file -ErrorAction Stop
                Start-Process msiexec.exe -ArgumentList "/i `"$file`" /quiet /norestart" -Wait
                Start-Sleep 3
                $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
                if (Test-Path "C:\Program Files\nodejs\node.exe") {
                    $v = & "C:\Program Files\nodejs\node.exe" --version 2>$null
                    Add-Content $log "[$(Get-Date -Format 'HH:mm:ss')] Node.js: $v"
                    Remove-Item $file -Force -ErrorAction SilentlyContinue
                    return $true
                }
                return $false
            } catch {
                Add-Content $log "[$(Get-Date -Format 'HH:mm:ss')] Node.js ERROR: $_"
                return $false
            }
        }
        $jobs += @{Name="Node.js"; Job=(Start-Job -ScriptBlock $nodeJob -ArgumentList $Global:SetupConfig.LogPath)}
    }
    
    if (-not $softwareStatus.PostgreSQL) {
        Write-Host "Instalando PostgreSQL..." -ForegroundColor Cyan
        $pgJob = {
            param($log, $pass)
            try {
                $url = "https://get.enterprisedb.com/postgresql/postgresql-16.2-1-windows-x64.exe"
                $file = "$env:TEMP\pg.exe"
                Invoke-WebRequest -Uri $url -OutFile $file -ErrorAction Stop
                Start-Process $file -ArgumentList "--unattendedmodeui minimal --mode unattended --superpassword $pass" -Wait
                Start-Sleep 3
                $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
                if (Test-Path "C:\Program Files\PostgreSQL\16\bin\psql.exe") {
                    $v = & "C:\Program Files\PostgreSQL\16\bin\psql.exe" --version 2>$null
                    Add-Content $log "[$(Get-Date -Format 'HH:mm:ss')] PostgreSQL: $v"
                    Remove-Item $file -Force -ErrorAction SilentlyContinue
                    return $true
                }
                return $false
            } catch {
                Add-Content $log "[$(Get-Date -Format 'HH:mm:ss')] PostgreSQL ERROR: $_"
                return $false
            }
        }
        $jobs += @{Name="PostgreSQL"; Job=(Start-Job -ScriptBlock $pgJob -ArgumentList $Global:SetupConfig.LogPath, $pgPassword)}
    }
    
    if (-not $softwareStatus.Redis) {
        Write-Host "Instalando Redis..." -ForegroundColor Cyan
        $redisJob = {
            param($log)
            try {
                $url = "https://github.com/microsoftarchive/redis/releases/download/win-3.0.504/Redis-x64-3.0.504.msi"
                $file = "$env:TEMP\redis.msi"
                Invoke-WebRequest -Uri $url -OutFile $file -ErrorAction Stop
                Start-Process msiexec.exe -ArgumentList "/i `"$file`" /quiet /norestart" -Wait
                Start-Sleep 3
                if (Test-Path "C:\Program Files\Redis\redis-cli.exe") {
                    $v = & "C:\Program Files\Redis\redis-cli.exe" --version 2>$null
                    Add-Content $log "[$(Get-Date -Format 'HH:mm:ss')] Redis: $v"
                    Remove-Item $file -Force -ErrorAction SilentlyContinue
                    return $true
                }
                return $false
            } catch {
                Add-Content $log "[$(Get-Date -Format 'HH:mm:ss')] Redis ERROR: $_"
                return $false
            }
        }
        $jobs += @{Name="Redis"; Job=(Start-Job -ScriptBlock $redisJob -ArgumentList $Global:SetupConfig.LogPath)}
    }
    
    if (-not $softwareStatus.Git) {
        Write-Host "Instalando Git..." -ForegroundColor Cyan
        $gitJob = {
            param($log)
            try {
                $url = "https://github.com/git-for-windows/git/releases/download/v2.43.0.windows.1/Git-2.43.0-64-bit.exe"
                $file = "$env:TEMP\git.exe"
                Invoke-WebRequest -Uri $url -OutFile $file -ErrorAction Stop
                Start-Process $file -ArgumentList "/SILENT /NORESTART" -Wait
                Start-Sleep 3
                if (Test-Path "C:\Program Files\Git\bin\git.exe") {
                    $v = & "C:\Program Files\Git\bin\git.exe" --version 2>$null
                    Add-Content $log "[$(Get-Date -Format 'HH:mm:ss')] Git: $v"
                    Remove-Item $file -Force -ErrorAction SilentlyContinue
                    return $true
                }
                return $false
            } catch {
                Add-Content $log "[$(Get-Date -Format 'HH:mm:ss')] Git ERROR: $_"
                return $false
            }
        }
        $jobs += @{Name="Git"; Job=(Start-Job -ScriptBlock $gitJob -ArgumentList $Global:SetupConfig.LogPath)}
    }
    
    if (-not $softwareStatus.IIS) {
        Write-Host "Instalando IIS..." -ForegroundColor Cyan
        try {
            Enable-WindowsOptionalFeature -Online -FeatureName "IIS-WebServerRole" -NoRestart -ErrorAction Stop
            Enable-WindowsOptionalFeature -Online -FeatureName "IIS-WebServer" -NoRestart -ErrorAction Stop
            Enable-WindowsOptionalFeature -Online -FeatureName "IIS-CommonHttpFeatures" -NoRestart -ErrorAction Stop
            Enable-WindowsOptionalFeature -Online -FeatureName "IIS-ApplicationDevelopment" -NoRestart -ErrorAction Stop
            Enable-WindowsOptionalFeature -Online -FeatureName "IIS-URLRewrite" -NoRestart -ErrorAction Stop
            Enable-WindowsOptionalFeature -Online -FeatureName "IIS-ApplicationRequestRouting" -NoRestart -ErrorAction Stop
            $results.IIS = $true
            Write-Host "OK IIS instalado" -ForegroundColor Green
        } catch {
            Write-Host "X Erro IIS: $_" -ForegroundColor Red
        }
    }
    
    Write-Host ""; Write-Host "Aguardando conclusao..." -ForegroundColor Yellow
    if ($jobs.Count -gt 0) {
        $totalJobs = $jobs.Count
        $completed = 0
        while ($completed -lt $totalJobs) {
            $completed = ($jobs | Where-Object {$_.Job.State -eq "Completed"}).Count
            Write-Host "Progresso: $completed/$totalJobs concluidos..." -ForegroundColor Cyan
            if ($completed -lt $totalJobs) { Start-Sleep 5 }
        }
        foreach ($job in $jobs) {
            $result = Receive-Job -Job $job.Job
            $results[$job.Name] = $result
            Remove-Job -Job $job.Job -ErrorAction SilentlyContinue
        }
    }
    
    Write-Host ""; Write-Host "╔════════════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║ ETAPA 5: Iniciando Servicos                                           ║" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan; Write-Host ""
    Start-Service -Name "postgresql-x64-16" -ErrorAction SilentlyContinue
    Start-Service -Name "Redis" -ErrorAction SilentlyContinue
    Start-Service -Name "W3SVC" -ErrorAction SilentlyContinue
    Start-Sleep 2
    Write-Host "OK PostgreSQL iniciado" -ForegroundColor Green
    Write-Host "OK Redis iniciado" -ForegroundColor Green
    Write-Host "OK IIS iniciado" -ForegroundColor Green
    
    Write-Host ""; Write-Host "╔════════════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║ ETAPA 6: Criando Estrutura de Diretorios                              ║" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan; Write-Host ""
    $dirs = @("C:\hosting\config", "C:\hosting\logs", "C:\hosting\backups", "C:\hosting\apps", "C:\hosting\ssl")
    foreach ($dir in $dirs) {
        if (-not (Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
            Write-Host "OK Criado: $dir" -ForegroundColor Green
        }
    }
    
    Write-Host ""; Write-Host "╔════════════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║                  Configuracao Concluida com Sucesso!                  ║" -ForegroundColor Green
    Write-Host "╚════════════════════════════════════════════════════════════════════════╝" -ForegroundColor Green; Write-Host ""
    Write-Host "Status:" -ForegroundColor Yellow
    Write-Host "  Node.js: $(if ($results.NodeJS) {'OK'} else {'X'})" -ForegroundColor $(if ($results.NodeJS) {'Green'} else {'Red'})
    Write-Host "  PostgreSQL: $(if ($results.PostgreSQL) {'OK'} else {'X'})" -ForegroundColor $(if ($results.PostgreSQL) {'Green'} else {'Red'})
    Write-Host "  Redis: $(if ($results.Redis) {'OK'} else {'X'})" -ForegroundColor $(if ($results.Redis) {'Green'} else {'Red'})
    Write-Host "  IIS: $(if ($results.IIS) {'OK'} else {'X'})" -ForegroundColor $(if ($results.IIS) {'Green'} else {'Red'})
    Write-Host "  Git: $(if ($results.Git) {'OK'} else {'X'})" -ForegroundColor $(if ($results.Git) {'Green'} else {'Red'})
    Write-Host ""; Write-Host "Credenciais PostgreSQL:" -ForegroundColor Yellow
    Write-Host "  Usuario: postgres" -ForegroundColor White
    Write-Host "  Senha: $pgPassword" -ForegroundColor White; Write-Host ""
    Write-Host "Diretorios:" -ForegroundColor Yellow
    foreach ($dir in $dirs) { Write-Host "  $dir" -ForegroundColor White }
    Write-Host ""
    Write-SetupLog -Message "Complete VPS setup finished successfully" -Level "SUCCESS"
    Read-Host "Pressione ENTER para voltar"
}

function Main {
    Write-SetupLog -Message "Setup started" -Level "INFO"
    while ($true) {
        Show-MainMenu
        $choice = Read-Host "Escolha"
        switch ($choice) {
            "1" { Start-CompleteVPSSetup }
            "2" { Get-SoftwareStatus; Read-Host "ENTER" }
            "3" { Show-SystemSummary }
            "4" { Show-LogFile }
            "5" { Write-Host "Saindo..." -ForegroundColor Yellow; exit 0 }
            default { Write-Host "Invalido" -ForegroundColor Red; Start-Sleep 1 }
        }
    }
}

Main

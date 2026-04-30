# OursMusic - Guia de Instalacao Automatizada

## Status: ✅ PRONTO PARA USO

O script `setup-hosting.ps1` agora inclui instalacao automatica de todos os softwares necessarios.

## Softwares Instalados Automaticamente

Quando voce seleciona a opcao **4 - Iniciar Instalacao Completa**, o script instala automaticamente:

### 1. **Node.js 18.x LTS**
   - Versao: 18.19.0
   - Inclui: npm e yarn
   - Configuracao: PATH automaticamente atualizado
   - Verificacao: Valida instalacao apos conclusao

### 2. **PostgreSQL 14**
   - Versao: 14.11
   - Senha padrao: postgres
   - Configuracao: Otimizada para 8GB RAM
   - Verificacao: Valida instalacao apos conclusao

### 3. **Redis 7.x**
   - Versao: 3.0.504 (Windows)
   - Configuracao: Limites de memoria apropriados
   - Verificacao: Valida instalacao apos conclusao

### 4. **IIS (Internet Information Services)**
   - Modulos habilitados:
     - IIS-WebServerRole
     - IIS-WebServer
     - IIS-CommonHttpFeatures
     - IIS-ApplicationDevelopment
     - IIS-URLRewrite
     - IIS-ApplicationRequestRouting
   - Verificacao: Valida habilitacao apos conclusao

### 5. **Git**
   - Versao: 2.43.0
   - Configuracao: Instalacao silenciosa
   - Verificacao: Valida instalacao apos conclusao

## Como Usar

### Passo 1: Preparacao
```powershell
# Abra PowerShell como Administrador
# Navegue ate o diretorio do script
cd C:\oursmusic
```

### Passo 2: Permitir Execucao de Scripts
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Passo 3: Executar o Script
```powershell
.\setup-hosting.ps1 -Language "pt-BR"
```

### Passo 4: Menu Principal
```
========================================================================
         OursMusic - Sistema de Deploy Automatizado
            Menu Principal de Instalacao
========================================================================

Selecione uma opcao:

  1. OK Validar Pre-requisitos
  2. [?] Detectar Software Instalado
  3. [*] Ver Resumo do Sistema
  4. [>] Iniciar Instalacao Completa
  5. [=] Configurar Credenciais
  6. [#] Ver Log de Instalacao
  7. [X] Sair
```

### Passo 5: Iniciar Instalacao
- Digite **4** e pressione ENTER
- Confirme com **s** quando solicitado
- Aguarde a instalacao (pode levar 2-3 horas)

## Fluxo de Instalacao

1. **Deteccao de Software Atual**
   - Verifica quais softwares ja estao instalados
   - Pula softwares ja instalados

2. **Instalacao de Softwares Faltantes**
   - Node.js (se nao encontrado)
   - PostgreSQL (se nao encontrado)
   - Redis (se nao encontrado)
   - IIS (se nao encontrado)
   - Git (se nao encontrado)

3. **Verificacao de Instalacao**
   - Valida cada software apos instalacao
   - Registra resultados no log

4. **Resumo Final**
   - Mostra status de cada software
   - Indica proximos passos

## Logs

Todos os eventos sao registrados em `setup-hosting.log`:

```
[2024-01-15 10:30:45] [INFO] Setup started at 01/15/2024 10:30:45
[2024-01-15 10:30:50] [INFO] Progress: 10% - Validating prerequisites
[2024-01-15 10:31:00] [INFO] Starting Node.js installation
[2024-01-15 10:35:30] [SUCCESS] Node.js installed successfully: v18.19.0
...
```

## Tratamento de Erros

Se alguma instalacao falhar:

1. **Verifique o log**: `.\setup-hosting.log`
2. **Verifique conexao de internet**: Necessaria para baixar instaladores
3. **Verifique espaco em disco**: Minimo 50GB recomendado
4. **Verifique permissoes**: Script deve rodar como Administrador

## Proximos Passos Apos Instalacao

1. **Configurar Credenciais** (Opcao 5)
   - AWS S3 (para backups e armazenamento)
   - Hostinger API (para gerenciamento de DNS)
   - Supabase (para armazenamento de arquivos)
   - SMTP (para alertas por email)

2. **Revisar Configuracoes**
   - Diretorio: `C:\hosting\config\`
   - Arquivos de configuracao para cada servico

3. **Configurar Dominio e SSL**
   - Dominio: oursmusics.shop
   - Subdominio API: api.oursmusics.shop
   - Certificados SSL automaticos via Let's Encrypt

4. **Iniciar Servicos**
   - Node.js backend
   - PostgreSQL database
   - Redis cache
   - IIS reverse proxy

## Troubleshooting

### Erro: "Script requires elevation"
**Solucao**: Abra PowerShell como Administrador

### Erro: "Execution policy does not allow"
**Solucao**: Execute `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

### Erro: "Failed to download installer"
**Solucao**: Verifique conexao de internet e firewall

### Erro: "Installation failed"
**Solucao**: Verifique o arquivo `setup-hosting.log` para detalhes

## Suporte

Para mais informacoes, consulte:
- `.kiro/specs/automated-deploy-system/tasks.md` - Especificacao completa
- `setup-hosting.log` - Arquivo de log detalhado
- `admin-panel.html` - Interface de administracao
- `deploy.php` - Sistema de deployment

---

**Versao**: 1.0.0  
**Ultima atualizacao**: 2024-01-15  
**Status**: Pronto para producao

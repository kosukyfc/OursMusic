# OursMusic - Quick Start Guide

## 🚀 Comece em 3 Passos

### Passo 1: Abra PowerShell como Administrador
```powershell
# Clique com botao direito em PowerShell e selecione "Executar como Administrador"
```

### Passo 2: Navegue ate o Diretorio
```powershell
cd C:\oursmusic
```

### Passo 3: Execute o Script
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\setup-hosting.ps1 -Language "pt-BR"
```

## 📋 Menu de Opcoes

Quando o script iniciar, voce vera este menu:

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

## 🔧 Fluxo Recomendado

### Primeira Execucao:
1. **Digite 1** - Validar pre-requisitos
2. **Digite 2** - Detectar software instalado
3. **Digite 3** - Ver resumo do sistema
4. **Digite 5** - Configurar credenciais (AWS, Hostinger, Supabase, SMTP)
5. **Digite 4** - Iniciar instalacao completa

### Instalacao Completa Faz:
- ✅ Detecta software ja instalado
- ✅ Instala Node.js 18.x LTS (se nao encontrado)
- ✅ Instala PostgreSQL 14 (se nao encontrado)
- ✅ Instala Redis 7.x (se nao encontrado)
- ✅ Instala IIS com modulos (se nao encontrado)
- ✅ Instala Git (se nao encontrado)
- ✅ Verifica cada instalacao
- ✅ Mostra resumo final

## 📊 Exemplo de Saida

```
========================================================================
                    Iniciando Instalacao Completa
========================================================================

AVISO: Esta operacao pode levar 2-3 horas para ser concluida.
Certifique-se de que:
  - Todas as credenciais foram configuradas
  - O servidor nao sera reiniciado durante a instalacao
  - Voce tem conexao de internet estavel

Deseja continuar? (s/n): s

Iniciando instalacao...

========================================================================
                    Instalando Softwares Necessarios
========================================================================

Detectando software instalado...
OK Node.js encontrado: v18.19.0
X PostgreSQL nao encontrado
X Redis nao encontrado
OK IIS instalado e habilitado
OK Git encontrado: git version 2.43.0.windows.1

Instalando PostgreSQL 14...
Baixando PostgreSQL...
Executando instalador...
OK PostgreSQL instalado com sucesso: psql (PostgreSQL) 14.11

Instalando Redis 7.x...
Baixando Redis...
Executando instalador...
OK Redis instalado com sucesso: Redis server v=3.0.504

========================================================================
                        Resumo da Instalacao
========================================================================

Resultados:
  Node.js: OK Instalado
  PostgreSQL: OK Instalado
  Redis: OK Instalado
  IIS: OK Instalado
  Git: OK Instalado

OK Todos os softwares foram instalados com sucesso!

Proximos passos:
  1. Revisar configuracoes em C:\hosting\config\
  2. Configurar dominio e SSL
  3. Configurar reverse proxy IIS
  4. Iniciar servicos
```

## 📝 Logs

Todos os eventos sao salvos em `setup-hosting.log`:

```powershell
# Ver ultimas 30 linhas do log
Get-Content setup-hosting.log -Tail 30

# Ver log completo
Get-Content setup-hosting.log
```

## ⚠️ Requisitos Minimos

- **SO**: Windows Server 2019 ou superior
- **PowerShell**: 5.1 ou superior
- **RAM**: 8GB minimo
- **Disco**: 50GB livres minimo
- **Permissoes**: Administrador
- **Internet**: Conexao estavel (para download de instaladores)

## 🆘 Troubleshooting

### Erro: "Script requires elevation"
```powershell
# Abra PowerShell como Administrador
```

### Erro: "Execution policy does not allow"
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Erro: "Failed to download installer"
- Verifique conexao de internet
- Verifique firewall
- Tente novamente

### Erro: "Installation failed"
- Verifique `setup-hosting.log` para detalhes
- Verifique espaco em disco
- Tente instalar manualmente

## 📞 Suporte

Para mais informacoes:
- Leia `INSTALLATION_GUIDE.md` para guia completo
- Consulte `.kiro/specs/automated-deploy-system/tasks.md` para especificacao
- Verifique `setup-hosting.log` para detalhes de erros

---

**Versao**: 1.0.0  
**Status**: Pronto para Producao ✅

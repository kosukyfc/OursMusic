# 🎵 OursMusic - Sistema de Deploy Automatizado

## 📋 Visao Geral

Sistema completo de instalacao e configuracao automatizada para a plataforma OursMusic em Windows Server VPS. Instala e configura automaticamente todos os softwares necessarios com um unico script PowerShell.

## 🚀 Comeco Rapido

### 3 Passos para Comeco Imediato:

```powershell
# 1. Abra PowerShell como Administrador

# 2. Navegue ate o diretorio
cd C:\oursmusic

# 3. Execute o script
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\setup-hosting.ps1 -Language "pt-BR"
```

**Tempo total**: ~5 minutos para comeco

## 📚 Documentacao

### Para Comeco Rapido
👉 **[QUICK_START.md](QUICK_START.md)** - Guia de 3 passos com exemplos

### Para Instalacao Completa
👉 **[INSTALLATION_GUIDE.md](INSTALLATION_GUIDE.md)** - Guia detalhado com troubleshooting

### Para Detalhes Tecnicos
👉 **[TECHNICAL_DETAILS.md](TECHNICAL_DETAILS.md)** - Versoes, URLs, configuracoes

### Para Referencia Rapida
👉 **[SETUP_SUMMARY.md](SETUP_SUMMARY.md)** - Resumo e fluxo recomendado

### Para Verificacao
👉 **[VERIFICATION_CHECKLIST.md](VERIFICATION_CHECKLIST.md)** - Checklist com 100+ itens

## 🔧 Softwares Instalados

| Software | Versao | Instalacao | Status |
|----------|--------|-----------|--------|
| **Node.js** | 18.19.0 LTS | Automatica | ✅ |
| **PostgreSQL** | 14.11 | Automatica | ✅ |
| **Redis** | 3.0.504 | Automatica | ✅ |
| **IIS** | Windows Server | Automatica | ✅ |
| **Git** | 2.43.0 | Automatica | ✅ |

## 📊 Menu Principal

```
1. OK Validar Pre-requisitos
   Verifica admin, PowerShell, disco, RAM

2. [?] Detectar Software Instalado
   Escaneia Node.js, PostgreSQL, Redis, IIS, Git

3. [*] Ver Resumo do Sistema
   Mostra hardware e software detectado

4. [>] Iniciar Instalacao Completa
   Instala todos os softwares necessarios

5. [=] Configurar Credenciais
   AWS, Hostinger, Supabase, SMTP

6. [#] Ver Log de Instalacao
   Ultimas 30 linhas do log

7. [X] Sair
   Encerra o script
```

## ⚙️ Fluxo de Instalacao

```
┌─────────────────────────────────────┐
│  1. Validar Pre-requisitos          │
│     (admin, PowerShell, disco, RAM) │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  2. Detectar Software Instalado     │
│     (Node, PostgreSQL, Redis, etc)  │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  3. Configurar Credenciais          │
│     (AWS, Hostinger, Supabase, SMTP)│
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  4. Instalar Softwares Faltantes    │
│     (Download + Instalacao + Verif) │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  5. Resumo Final                    │
│     (Status de cada software)       │
└─────────────────────────────────────┘
```

## 📝 Arquivos do Projeto

```
C:\oursmusic\
├── setup-hosting.ps1              # Script principal (668 linhas)
├── setup-hosting.log              # Log de execucao (criado automaticamente)
├── QUICK_START.md                 # Guia rapido
├── INSTALLATION_GUIDE.md          # Guia completo
├── TECHNICAL_DETAILS.md           # Detalhes tecnicos
├── SETUP_SUMMARY.md               # Resumo
├── VERIFICATION_CHECKLIST.md      # Checklist
├── SETUP_README.md                # Este arquivo
├── admin-panel.html               # Interface web de admin
├── deploy.php                     # Sistema de deployment
└── .kiro/specs/automated-deploy-system/
    └── tasks.md                   # Especificacao completa
```

## ✅ Requisitos

### Minimos
- **SO**: Windows Server 2019+
- **PowerShell**: 5.1+
- **RAM**: 8GB
- **Disco**: 50GB livres
- **Permissoes**: Administrador
- **Internet**: Conexao estavel

### Recomendados
- **SO**: Windows Server 2025
- **PowerShell**: 7.0+
- **RAM**: 16GB
- **Disco**: 100GB livres
- **CPU**: 4 vCPU

## 🎯 Fluxo Recomendado

### Primeira Execucao (30-55 minutos)

1. **Leia QUICK_START.md** (5 min)
   - Entenda o fluxo basico

2. **Execute o script** (5 min)
   ```powershell
   .\setup-hosting.ps1 -Language "pt-BR"
   ```

3. **Valide pre-requisitos** (Opcao 1)
   - Verifique se tudo esta OK

4. **Detecte software** (Opcao 2)
   - Veja o que ja esta instalado

5. **Configure credenciais** (Opcao 5)
   - AWS S3, Hostinger, Supabase, SMTP

6. **Instale tudo** (Opcao 4)
   - Deixe rodar por 30-55 minutos

7. **Verifique logs** (Opcao 6)
   - Confirme que tudo funcionou

### Proximas Etapas

1. Revisar `INSTALLATION_GUIDE.md`
2. Criar estrutura de diretorios
3. Configurar banco de dados
4. Configurar Redis
5. Configurar IIS reverse proxy
6. Configurar SSL/TLS
7. Testar servicos

## 🆘 Troubleshooting Rapido

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
- Verifique `setup-hosting.log`
- Verifique espaco em disco
- Tente instalar manualmente

## 📞 Suporte

### Documentacao
- **QUICK_START.md** - Comeco rapido
- **INSTALLATION_GUIDE.md** - Guia completo
- **TECHNICAL_DETAILS.md** - Detalhes tecnicos
- **SETUP_SUMMARY.md** - Resumo
- **VERIFICATION_CHECKLIST.md** - Checklist

### Logs
- **setup-hosting.log** - Arquivo de log detalhado

### Especificacao
- **.kiro/specs/automated-deploy-system/tasks.md** - Especificacao completa

## 🔐 Seguranca

### Recomendacoes
1. Alterar senha padrao do PostgreSQL
2. Configurar autenticacao no Redis
3. Habilitar firewall do Windows
4. Configurar SSL/TLS para todas as conexoes
5. Implementar backup automatico
6. Monitorar logs regularmente

### Credenciais
- AWS S3: Access Key + Secret Key
- Hostinger: API Key
- Supabase: Project URL + API Key
- SMTP: Server + Port + Username + Password

## 📊 Tempo Estimado

| Etapa | Tempo |
|-------|-------|
| Validacao | 5 min |
| Deteccao | 2 min |
| Configuracao | 10 min |
| Instalacao | 30-55 min |
| Verificacao | 5 min |
| **Total** | **52-77 min** |

## 🎓 Exemplos de Uso

### Instalacao Completa
```powershell
.\setup-hosting.ps1 -Language "pt-BR"
# Selecione opcao 4
```

### Apenas Validacao
```powershell
.\setup-hosting.ps1 -Language "pt-BR"
# Selecione opcao 1
```

### Apenas Deteccao
```powershell
.\setup-hosting.ps1 -Language "pt-BR"
# Selecione opcao 2
```

### Ver Logs
```powershell
Get-Content setup-hosting.log -Tail 50
```

## 📈 Proximos Passos

Apos instalacao bem-sucedida:

1. **Criar estrutura de diretorios**
   ```powershell
   mkdir C:\hosting\config
   mkdir C:\hosting\logs
   mkdir C:\hosting\backups
   mkdir C:\hosting\apps
   ```

2. **Configurar banco de dados**
   ```powershell
   psql -U postgres -h localhost
   CREATE DATABASE oursmusic;
   ```

3. **Configurar Redis**
   - Editar `C:\Program Files\Redis\redis.conf`
   - Habilitar autenticacao
   - Reiniciar servico

4. **Configurar IIS**
   - Criar site para reverse proxy
   - Configurar URL Rewrite
   - Configurar SSL

5. **Testar servicos**
   ```powershell
   node --version
   psql --version
   redis-cli --version
   git --version
   ```

## 🌐 Interfaces Web

### Admin Panel
- **URL**: `https://admin.oursmusics.shop`
- **Arquivo**: `admin-panel.html`
- **Recursos**: Dashboard, servicos, deployment, backups, usuarios

### Developer Panel
- **URL**: `https://dev.oursmusics.shop`
- **Recursos**: Logs em tempo real, metricas, terminal web

### API
- **URL**: `https://api.oursmusics.shop`
- **Arquivo**: `deploy.php`
- **Recursos**: Deployment, webhooks, backups

## 📄 Licenca

Projeto OursMusic - Sistema de Deploy Automatizado

## 👨‍💻 Desenvolvedor

Desenvolvido para a plataforma OursMusic

---

**Versao**: 1.0.0  
**Data**: 2024-01-15  
**Status**: Pronto para Producao ✅  
**Linguagem**: Portugues Brasileiro (pt-BR)

---

## 🎯 Proxima Leitura

👉 **Comece com [QUICK_START.md](QUICK_START.md)**

Ou leia a documentacao completa:
- [INSTALLATION_GUIDE.md](INSTALLATION_GUIDE.md) - Guia detalhado
- [TECHNICAL_DETAILS.md](TECHNICAL_DETAILS.md) - Detalhes tecnicos
- [SETUP_SUMMARY.md](SETUP_SUMMARY.md) - Resumo
- [VERIFICATION_CHECKLIST.md](VERIFICATION_CHECKLIST.md) - Checklist

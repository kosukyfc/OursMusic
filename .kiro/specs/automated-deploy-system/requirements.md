# Requirements Document

## Introduction

Sistema de Deploy Automatizado para plataforma de streaming de música rodando em XAMPP/Windows VPS. Implementado como um único arquivo PHP (`/admin/deploy.php`), plug-and-play, integrado ao painel administrativo. Suporta upload de pacotes `.zip`, backup automático, limpeza seletiva, extração inteligente com roteamento backend/frontend, modo de manutenção, rollback e log em tempo real — tudo com interface moderna em dark mode e mensagens em Português Brasileiro.

## Glossary

- **Deploy_System**: O arquivo `deploy.php` e toda a lógica nele contida
- **Admin_Session**: Sessão PHP autenticada de um usuário administrador
- **Allowed_IPs**: Array configurável de endereços IP autorizados a acessar o sistema
- **Maintenance_Mode**: Estado ativado pela criação do arquivo `maintenance.flag` na raiz da plataforma
- **Backup**: Arquivo `.zip` comprimido do estado atual da plataforma, armazenado em `/backup_deploy/`
- **Upload_Package**: Arquivo `.zip` enviado pelo administrador contendo os arquivos de atualização
- **Smart_Deploy**: Modo de deploy que detecta subdiretórios `/backend/` e `/frontend/` no ZIP e os roteia para caminhos distintos
- **ROOT_PATH**: Caminho raiz da plataforma (`C:/xampp/htdocs/your-platform/`)
- **BACKEND_PATH**: Caminho do servidor backend (`C:/backend-server/`)
- **BACKUP_PATH**: Diretório de armazenamento de backups (`/backup_deploy/`)
- **ZipArchive**: Classe nativa do PHP usada para manipulação de arquivos ZIP
- **Integrity_Check**: Verificação pós-extração que confirma a presença dos arquivos extraídos no destino
- **Rollback**: Operação de restauração de um backup anterior
- **Version_Tag**: Identificador de versão associado a um deploy, armazenado em arquivo de metadados
- **Log_Panel**: Painel de interface que exibe mensagens de status do deploy em tempo real
- **Validator**: Componente responsável por validar sessão, IP e arquivo enviado

---

## Requirements

### Requirement 1: Controle de Acesso e Segurança

**User Story:** Como administrador, quero que o sistema de deploy seja acessível apenas por usuários autenticados e IPs autorizados, para que operações críticas de deploy não sejam expostas a acessos não autorizados.

#### Acceptance Criteria

1. WHEN uma requisição chega ao `deploy.php`, THE `Validator` SHALL verificar se existe uma `Admin_Session` PHP válida antes de processar qualquer operação.
2. WHEN uma requisição chega ao `deploy.php`, THE `Validator` SHALL comparar o IP do solicitante com a lista `Allowed_IPs` e rejeitar a requisição com HTTP 403 se o IP não estiver na lista.
3. IF a `Admin_Session` não for válida, THEN THE `Deploy_System` SHALL encerrar a execução e exibir mensagem de erro "Acesso negado: sessão inválida" sem revelar detalhes internos do sistema.
4. IF o IP do solicitante não estiver na `Allowed_IPs`, THEN THE `Deploy_System` SHALL encerrar a execução e exibir mensagem de erro "Acesso negado: IP não autorizado" sem revelar detalhes internos do sistema.
5. THE `Deploy_System` SHALL sanitizar todos os inputs recebidos via `$_POST` e `$_FILES` antes de qualquer processamento.
6. THE `Deploy_System` SHALL utilizar apenas a classe nativa `ZipArchive` do PHP para manipulação de arquivos ZIP, sem dependências externas.

---

### Requirement 2: Validação do Arquivo de Upload

**User Story:** Como administrador, quero que apenas arquivos `.zip` válidos sejam aceitos para deploy, para que arquivos maliciosos ou incorretos não comprometam o sistema.

#### Acceptance Criteria

1. WHEN um arquivo é enviado, THE `Validator` SHALL verificar se a extensão do arquivo é `.zip` e rejeitar qualquer outro formato.
2. WHEN um arquivo é enviado, THE `Validator` SHALL verificar o MIME type real do arquivo (não apenas o declarado pelo cliente) e aceitar somente `application/zip` ou `application/x-zip-compressed`.
3. WHEN um arquivo é enviado, THE `Validator` SHALL verificar se o tamanho do arquivo não excede 500MB (524.288.000 bytes).
4. IF a extensão do arquivo não for `.zip`, THEN THE `Deploy_System` SHALL rejeitar o upload e exibir a mensagem "❌ Erro: apenas arquivos .zip são permitidos".
5. IF o MIME type não corresponder a um arquivo ZIP válido, THEN THE `Deploy_System` SHALL rejeitar o upload e exibir a mensagem "❌ Erro: tipo de arquivo inválido".
6. IF o tamanho do arquivo exceder 500MB, THEN THE `Deploy_System` SHALL rejeitar o upload e exibir a mensagem "❌ Erro: arquivo excede o limite de 500MB".
7. THE `Validator` SHALL verificar se o caminho do arquivo extraído permanece dentro do `ROOT_PATH` para prevenir ataques de directory traversal.
8. IF um caminho de arquivo extraído tentar escapar do `ROOT_PATH`, THEN THE `Deploy_System` SHALL abortar a extração e registrar o evento no `Log_Panel` como erro crítico.

---

### Requirement 3: Modo de Manutenção

**User Story:** Como administrador, quero que o sistema ative automaticamente uma página de manutenção antes do deploy, para que os usuários finais não vejam o sistema em estado inconsistente durante a atualização.

#### Acceptance Criteria

1. WHEN o processo de deploy é iniciado, THE `Deploy_System` SHALL criar o arquivo `maintenance.flag` na `ROOT_PATH` como primeira ação antes de qualquer outra operação.
2. WHILE o arquivo `maintenance.flag` existir, THE `Deploy_System` SHALL garantir que o frontend da plataforma exiba uma página de manutenção moderna ao invés do conteúdo normal.
3. WHEN o deploy é concluído com sucesso, THE `Deploy_System` SHALL remover o arquivo `maintenance.flag` para desativar o `Maintenance_Mode`.
4. IF o deploy falhar em qualquer etapa, THEN THE `Deploy_System` SHALL manter o `maintenance.flag` ativo e registrar o erro no `Log_Panel` sem remover o arquivo automaticamente.
5. THE `Deploy_System` SHALL registrar no `Log_Panel` a mensagem "🛠️ Modo de manutenção ativado" ao criar o `maintenance.flag`.

---

### Requirement 4: Sistema de Backup Completo

**User Story:** Como administrador, quero que um backup completo da plataforma seja criado automaticamente antes de qualquer alteração, para que eu possa restaurar o sistema em caso de falha no deploy.

#### Acceptance Criteria

1. WHEN o `Maintenance_Mode` é ativado, THE `Deploy_System` SHALL criar um backup comprimido em `.zip` de todos os arquivos da plataforma em `BACKUP_PATH`, nomeado no formato `backup_YYYY-MM-DD_HH-mm-ss.zip`.
2. THE `Deploy_System` SHALL excluir o diretório `BACKUP_PATH` do conteúdo do backup para evitar recursão.
3. THE `Deploy_System` SHALL registrar no `Log_Panel` o progresso do backup com a mensagem "📦 Criando backup..." e ao concluir "✅ Backup criado: backup_YYYY-MM-DD_HH-mm-ss.zip".
4. IF a criação do backup falhar, THEN THE `Deploy_System` SHALL abortar o processo de deploy, manter o `Maintenance_Mode` ativo e exibir "❌ Erro crítico: falha ao criar backup. Deploy abortado.".
5. THE `Deploy_System` SHALL armazenar um arquivo de metadados `version.json` dentro do backup contendo timestamp, nome do arquivo e `Version_Tag` quando fornecido.

---

### Requirement 5: Limpeza Seletiva de Arquivos

**User Story:** Como administrador, quero controlar quais diretórios são preservados durante a limpeza pré-deploy, para que arquivos de mídia e configurações críticas não sejam perdidos.

#### Acceptance Criteria

1. WHEN o backup é concluído, THE `Deploy_System` SHALL remover todos os arquivos e diretórios da `ROOT_PATH`, exceto os diretórios e arquivos protegidos por padrão.
2. THE `Deploy_System` SHALL preservar por padrão os seguintes itens: `backup_deploy/`, `config.php`.
3. WHERE a opção "Manter uploads/" estiver marcada, THE `Deploy_System` SHALL preservar o diretório `uploads/` durante a limpeza.
4. WHERE a opção "Manter db/" estiver marcada, THE `Deploy_System` SHALL preservar o diretório `db/` durante a limpeza.
5. THE `Deploy_System` SHALL registrar no `Log_Panel` cada arquivo/diretório removido e cada item preservado durante a limpeza.
6. IF a limpeza falhar em remover algum arquivo, THEN THE `Deploy_System` SHALL registrar o erro como aviso no `Log_Panel` e continuar o processo sem abortar.

---

### Requirement 6: Extração e Deploy Inteligente

**User Story:** Como administrador, quero que o sistema extraia o pacote de atualização e o distribua corretamente para os caminhos de backend e frontend, para que a arquitetura da plataforma seja respeitada automaticamente.

#### Acceptance Criteria

1. WHEN a limpeza é concluída, THE `Deploy_System` SHALL extrair o `Upload_Package` para a `ROOT_PATH` usando `ZipArchive`.
2. WHERE a opção "Smart Deploy" estiver marcada e o ZIP contiver o subdiretório `/backend/`, THE `Deploy_System` SHALL copiar o conteúdo de `/backend/` para o `BACKEND_PATH`.
3. WHERE a opção "Smart Deploy" estiver marcada e o ZIP contiver o subdiretório `/frontend/`, THE `Deploy_System` SHALL copiar o conteúdo de `/frontend/` para a `ROOT_PATH` do XAMPP.
4. THE `Deploy_System` SHALL registrar no `Log_Panel` cada arquivo extraído com indicador de sucesso "✅" ou falha "❌".
5. IF a extração falhar, THEN THE `Deploy_System` SHALL abortar o processo, manter o `Maintenance_Mode` ativo e exibir "❌ Erro crítico: falha na extração. Deploy abortado.".
6. WHEN a extração é concluída, THE `Deploy_System` SHALL executar um `Integrity_Check` verificando se os arquivos extraídos existem nos caminhos de destino esperados.
7. IF o `Integrity_Check` detectar arquivos ausentes, THEN THE `Deploy_System` SHALL registrar cada arquivo ausente como aviso no `Log_Panel`.

---

### Requirement 7: Conclusão do Deploy e Feedback

**User Story:** Como administrador, quero receber um relatório completo ao final do deploy e poder retornar ao painel administrativo, para que eu tenha visibilidade total do que foi executado.

#### Acceptance Criteria

1. WHEN o deploy é concluído com sucesso, THE `Deploy_System` SHALL remover o `maintenance.flag` e exibir a mensagem "🚀 Deploy concluído com sucesso!".
2. WHEN o deploy é concluído, THE `Deploy_System` SHALL exibir no `Log_Panel` um resumo completo contendo: arquivos de backup criados, arquivos removidos, arquivos extraídos e resultado do `Integrity_Check`.
3. THE `Deploy_System` SHALL exibir um botão "Voltar ao Painel Admin" ao final do processo de deploy.
4. THE `Deploy_System` SHALL registrar o timestamp de início e fim do deploy no `Log_Panel`.
5. WHEN um `Version_Tag` é fornecido pelo administrador, THE `Deploy_System` SHALL salvar o tag em um arquivo `deploy_version.txt` na `ROOT_PATH` após o deploy bem-sucedido.

---

### Requirement 8: Sistema de Rollback

**User Story:** Como administrador, quero poder restaurar um backup anterior com um clique, para que eu possa reverter rapidamente um deploy com problemas.

#### Acceptance Criteria

1. THE `Deploy_System` SHALL listar todos os backups disponíveis em `BACKUP_PATH` na interface, ordenados do mais recente para o mais antigo.
2. WHEN o administrador seleciona um backup para rollback, THE `Deploy_System` SHALL ativar o `Maintenance_Mode` antes de iniciar a restauração.
3. WHEN o rollback é iniciado, THE `Deploy_System` SHALL executar a limpeza seletiva (preservando `backup_deploy/`, `uploads/`, `config.php`) antes de extrair o backup selecionado.
4. WHEN a restauração é concluída com sucesso, THE `Deploy_System` SHALL desativar o `Maintenance_Mode` e exibir "✅ Rollback concluído com sucesso!".
5. IF a restauração falhar, THEN THE `Deploy_System` SHALL manter o `Maintenance_Mode` ativo e exibir "❌ Erro: falha no rollback. Sistema em manutenção.".
6. THE `Deploy_System` SHALL registrar no `Log_Panel` todas as etapas do rollback com os mesmos indicadores visuais do deploy normal.

---

### Requirement 9: Interface de Usuário

**User Story:** Como administrador, quero uma interface moderna, responsiva e em Português Brasileiro, para que o processo de deploy seja claro e agradável de usar.

#### Acceptance Criteria

1. THE `Deploy_System` SHALL renderizar uma interface em dark mode com design limpo e profissional.
2. THE `Deploy_System` SHALL exibir todas as mensagens de status, erros e confirmações em Português Brasileiro.
3. THE `Deploy_System` SHALL utilizar emojis como indicadores visuais: 🚀 para início, 📦 para backup, 🛠️ para manutenção, ✅ para sucesso e ❌ para erro.
4. THE `Deploy_System` SHALL exibir os seguintes checkboxes de opção: "Manter uploads/", "Manter db/" e "Ativar Smart Deploy (Backend + Frontend)".
5. THE `Deploy_System` SHALL exibir um campo de texto opcional para inserção do `Version_Tag`.
6. THE `Deploy_System` SHALL exibir um indicador de progresso visual durante o processo de deploy.
7. THE `Deploy_System` SHALL ser responsivo e funcionar corretamente em resoluções de desktop e mobile.
8. THE `Deploy_System` SHALL exibir o `Log_Panel` com diferenciação visual entre mensagens de sucesso (verde), erro (vermelho) e aviso (amarelo).

---

### Requirement 10: Configuração e Estrutura do Código

**User Story:** Como desenvolvedor, quero que o sistema seja configurável no topo do arquivo e organizado em funções modulares, para que seja fácil de manter e adaptar a diferentes ambientes.

#### Acceptance Criteria

1. THE `Deploy_System` SHALL definir as seguintes constantes de configuração no topo do arquivo: `ROOT_PATH`, `BACKEND_PATH`, `BACKUP_PATH`, `MAX_UPLOAD_SIZE`, `ALLOWED_IPS`.
2. THE `Deploy_System` SHALL organizar a lógica em funções nomeadas e documentadas: `checkSecurity()`, `enableMaintenance()`, `disableMaintenance()`, `createBackup()`, `cleanupFiles()`, `extractPackage()`, `smartDeploy()`, `integrityCheck()`, `rollback()`, `logMessage()`.
3. THE `Deploy_System` SHALL incluir comentários explicativos em cada função descrevendo seu propósito, parâmetros e retorno.
4. THE `Deploy_System` SHALL implementar tratamento de erros sem falhas silenciosas — toda exceção ou falha SHALL ser capturada e registrada no `Log_Panel`.
5. THE `Deploy_System` SHALL ser compatível com execução via CLI do PHP para automação futura, detectando o contexto de execução via `php_sapi_name()`.

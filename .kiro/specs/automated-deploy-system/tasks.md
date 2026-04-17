# Tasks — Sistema de Deploy Automatizado

## Task List

- [x] 1. Estrutura base e configuração do arquivo deploy.php
  - [x] 1.1 Criar o arquivo `admin/deploy.php` com as constantes de configuração no topo (`ROOT_PATH`, `BACKEND_PATH`, `BACKUP_PATH`, `MAX_UPLOAD_SIZE`, `ALLOWED_IPS`)
  - [x] 1.2 Implementar detecção de contexto CLI via `php_sapi_name()` para compatibilidade futura
  - [x] 1.3 Implementar a função `logMessage(string $msg, string $type): void` com output HTML e `flush()`/`ob_flush()`

- [x] 2. Controle de acesso e segurança (`checkSecurity`)
  - [x] 2.1 Implementar verificação de `Admin_Session` PHP válida
  - [x] 2.2 Implementar verificação de IP contra `ALLOWED_IPS` com rejeição HTTP 403
  - [x] 2.3 Implementar sanitização de inputs de `$_POST` e `$_FILES`

- [x] 3. Validação do arquivo de upload (`Validator`)
  - [x] 3.1 Implementar verificação de extensão `.zip`
  - [x] 3.2 Implementar verificação de MIME type real (não apenas o declarado pelo cliente)
  - [x] 3.3 Implementar verificação de tamanho máximo (500MB)
  - [x] 3.4 Implementar proteção contra directory traversal nos caminhos extraídos

- [x] 4. Modo de manutenção (`enableMaintenance` / `disableMaintenance`)
  - [x] 4.1 Implementar `enableMaintenance()`: criar `maintenance.flag` em `ROOT_PATH` e registrar no log
  - [x] 4.2 Implementar `disableMaintenance()`: remover `maintenance.flag` e registrar no log
  - [x] 4.3 Adicionar regra no `.htaccess` para redirecionar para `maintenance.html` quando o flag existir

- [x] 5. Sistema de backup (`createBackup`)
  - [x] 5.1 Implementar compressão recursiva de `ROOT_PATH` em ZIP com nome `backup_YYYY-MM-DD_HH-mm-ss.zip`
  - [x] 5.2 Implementar exclusão do diretório `BACKUP_PATH` do conteúdo do backup (evitar recursão)
  - [x] 5.3 Implementar geração e inclusão do arquivo `version.json` com metadados no ZIP
  - [x] 5.4 Registrar progresso e conclusão do backup no `Log_Panel`

- [x] 6. Limpeza seletiva de arquivos (`cleanupFiles`)
  - [x] 6.1 Implementar remoção recursiva de `ROOT_PATH` com lista de preservação configurável
  - [x] 6.2 Garantir preservação padrão de `backup_deploy/` e `config.php`
  - [x] 6.3 Implementar preservação condicional de `uploads/` e `db/` conforme opções do formulário
  - [x] 6.4 Registrar cada arquivo removido e cada item preservado no `Log_Panel`

- [x] 7. Extração e deploy inteligente (`extractPackage` / `smartDeploy`)
  - [x] 7.1 Implementar `extractPackage()` usando `ZipArchive` com validação de path traversal em cada entrada
  - [x] 7.2 Implementar `smartDeploy()`: detectar subdiretórios `/backend/` e `/frontend/` no ZIP e rotear para `BACKEND_PATH` e `ROOT_PATH` respectivamente
  - [x] 7.3 Registrar cada arquivo extraído com indicador ✅ ou ❌ no `Log_Panel`

- [x] 8. Verificação de integridade (`integrityCheck`)
  - [x] 8.1 Implementar verificação de existência de cada arquivo extraído no caminho de destino esperado
  - [x] 8.2 Registrar arquivos ausentes como avisos no `Log_Panel`

- [x] 9. Conclusão do deploy e relatório
  - [x] 9.1 Implementar exibição do resumo completo no `Log_Panel` (backup, remoções, extrações, integrity check)
  - [x] 9.2 Implementar salvamento do `Version_Tag` em `deploy_version.txt` na `ROOT_PATH`
  - [x] 9.3 Registrar timestamps de início e fim do deploy no `Log_Panel`
  - [x] 9.4 Exibir botão "Voltar ao Painel Admin" ao final do processo

- [x] 10. Sistema de rollback (`rollback` / `listBackups`)
  - [x] 10.1 Implementar `listBackups()`: listar backups em `BACKUP_PATH` ordenados por data decrescente
  - [x] 10.2 Implementar `rollback()`: ativar manutenção → limpeza seletiva → extrair backup selecionado → desativar manutenção
  - [x] 10.3 Registrar todas as etapas do rollback no `Log_Panel` com os mesmos indicadores visuais do deploy

- [x] 11. Interface de usuário (`renderUI`)
  - [x] 11.1 Implementar layout HTML completo em dark mode com CSS inline
  - [x] 11.2 Implementar formulário com checkboxes ("Manter uploads/", "Manter db/", "Ativar Smart Deploy"), campo de Version_Tag e input de arquivo ZIP
  - [x] 11.3 Implementar seção de listagem de backups disponíveis com botões de rollback
  - [x] 11.4 Implementar `Log_Panel` com diferenciação visual por tipo (success=verde, error=vermelho, warning=amarelo, info=cinza)
  - [x] 11.5 Implementar indicador de progresso visual durante o deploy
  - [x] 11.6 Garantir responsividade para desktop e mobile

- [x] 12. Testes
  - [x] 12.1 Escrever testes unitários para `checkSecurity()` (sessão válida/inválida, IP autorizado/não autorizado)
  - [x] 12.2 Escrever testes unitários para `Validator` (extensão, MIME, tamanho, path traversal)
  - [x] 12.3 Escrever testes unitários para `enableMaintenance()` / `disableMaintenance()` (criação/remoção do flag)
  - [x] 12.4 Escrever testes unitários para `listBackups()` (ordenação por data)
  - [x] 12.5 Escrever teste de propriedade para rejeição de IPs não autorizados (Property 2)
  - [x] 12.6 Escrever teste de propriedade para rejeição de arquivos não-ZIP (Property 3)
  - [x] 12.7 Escrever teste de propriedade para proteção contra directory traversal (Property 5)
  - [x] 12.8 Escrever teste de propriedade para lifecycle do maintenance flag (Property 6)
  - [x] 12.9 Escrever teste de propriedade para limpeza preserva itens protegidos (Property 9)
  - [x] 12.10 Escrever teste de propriedade para Smart Deploy routing (Property 10)
  - [x] 12.11 Escrever teste de propriedade para rollback restaura estado do backup (Property 14)

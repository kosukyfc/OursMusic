<?php
/**
 * Sistema de Deploy Automatizado — OursMusic
 * Arquivo único, plug-and-play, sem dependências externas.
 *
 * Acesso: GET  /admin/deploy.php          → Interface de deploy
 *         POST /admin/deploy.php          → Executa deploy
 *         POST /admin/deploy.php?rollback → Executa rollback
 */

// ============================================================
// CONFIGURAÇÃO — ajuste conforme o ambiente
// ============================================================
if (!defined('ROOT_PATH'))       define('ROOT_PATH',       'C:/xampp/htdocs/oursmusics/');
if (!defined('BACKEND_PATH'))    define('BACKEND_PATH',    'C:/backend-server/');
if (!defined('BACKUP_PATH'))     define('BACKUP_PATH',     ROOT_PATH . 'backup_deploy/');
if (!defined('MAX_UPLOAD_SIZE')) define('MAX_UPLOAD_SIZE', 524288000); // 500 MB
if (!defined('ALLOWED_IPS'))     define('ALLOWED_IPS',     ['127.0.0.1', '::1']); // adicione IPs reais aqui

// ============================================================
// CONTEXTO DE EXECUÇÃO
// ============================================================
if (!isset($isCli)) {
    $isCli = (php_sapi_name() === 'cli');
}

// ============================================================
// SESSÃO
// ============================================================
if (!$isCli) {
    session_start();
}

// ============================================================
// FUNÇÃO: logMessage
// Emite uma linha no Log_Panel com flush imediato para streaming.
// @param string $msg  Mensagem a exibir
// @param string $type success | error | warning | info
// ============================================================
function logMessage(string $msg, string $type = 'info'): void {
    global $isCli;
    $time = date('H:i:s');
    if ($isCli) {
        echo "[$time][$type] $msg\n";
    } else {
        $safe = htmlspecialchars($msg, ENT_QUOTES, 'UTF-8');
        echo "<div class=\"log-line log-{$type}\"><span class=\"log-time\">{$time}</span><span class=\"log-msg\">{$safe}</span></div>\n";
        if (ob_get_level()) ob_flush();
        flush();
    }
}

// ============================================================
// FUNÇÃO: sanitizePost
// Sanitiza recursivamente um array de strings (ex: $_POST).
// Remove tags HTML, espaços extras e escapa caracteres especiais.
// @param array $data  Array de inputs a sanitizar
// @return array  Array sanitizado
// ============================================================
function sanitizePost(array $data): array {
    $clean = [];
    foreach ($data as $key => $value) {
        if (is_array($value)) {
            $clean[$key] = sanitizePost($value);
        } elseif (is_string($value)) {
            $clean[$key] = htmlspecialchars(trim($value), ENT_QUOTES, 'UTF-8');
        } else {
            $clean[$key] = $value;
        }
    }
    return $clean;
}

// ============================================================
// FUNÇÃO: sanitizeFileInput
// Sanitiza os metadados de uma entrada de $_FILES.
// Limpa o nome do arquivo removendo caracteres perigosos.
// @param array $file  Entrada de $_FILES['campo']
// @return array  Entrada com nome sanitizado
// ============================================================
function sanitizeFileInput(array $file): array {
    if (isset($file['name']) && is_string($file['name'])) {
        // Remove path separators, null bytes e caracteres de controle do nome
        $name = basename($file['name']);
        $name = preg_replace('/[\x00-\x1F\x7F]/', '', $name);
        $name = htmlspecialchars(strip_tags(trim($name)), ENT_QUOTES, 'UTF-8');
        $file['name'] = $name;
    }
    return $file;
}

// ============================================================
// FUNÇÃO: checkSecurity
// Valida sessão admin, IP e sanitiza inputs.
// Encerra execução com HTTP 403 em caso de falha.
// ============================================================
function checkSecurity(): void {
    global $isCli;
    if ($isCli) return;

    // 2.1 — Verificação de Admin_Session PHP válida
    $isAdmin = isset($_SESSION['user']['is_admin']) && $_SESSION['user']['is_admin'] === true;
    if (!$isAdmin) {
        http_response_code(403);
        die('Acesso negado: sessão inválida.');
    }

    // 2.2 — Verificação de IP contra ALLOWED_IPS
    $ip = $_SERVER['REMOTE_ADDR'] ?? '';
    if (!in_array($ip, ALLOWED_IPS, true)) {
        http_response_code(403);
        die('Acesso negado: IP não autorizado.');
    }

    // 2.3 — Sanitização de $_POST e $_FILES
    $_POST = sanitizePost($_POST);

    foreach ($_FILES as $key => $file) {
        if (is_array($file['name'] ?? null)) {
            // Múltiplos arquivos no mesmo campo (array de uploads)
            $count = count($file['name']);
            for ($i = 0; $i < $count; $i++) {
                $entry = [
                    'name'     => $file['name'][$i],
                    'type'     => $file['type'][$i],
                    'tmp_name' => $file['tmp_name'][$i],
                    'error'    => $file['error'][$i],
                    'size'     => $file['size'][$i],
                ];
                $sanitized = sanitizeFileInput($entry);
                $_FILES[$key]['name'][$i] = $sanitized['name'];
            }
        } else {
            $sanitized = sanitizeFileInput($file);
            $_FILES[$key]['name'] = $sanitized['name'];
        }
    }
}

// ============================================================
// FUNÇÃO: validateUpload
// Valida extensão, MIME type real e tamanho do arquivo enviado.
// @param array $file  Entrada de $_FILES
// @return string|true  true se válido, mensagem de erro se inválido
// ============================================================
function validateUpload(array $file): string|bool {
    // Extensão
    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if ($ext !== 'zip') {
        return '❌ Erro: apenas arquivos .zip são permitidos.';
    }

    // Tamanho
    if ($file['size'] > MAX_UPLOAD_SIZE) {
        return '❌ Erro: arquivo excede o limite de 500MB.';
    }

    // MIME type real (magic bytes)
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime  = $finfo->file($file['tmp_name']);
    $validMimes = ['application/zip', 'application/x-zip-compressed', 'application/x-zip', 'application/octet-stream'];
    if (!in_array($mime, $validMimes, true)) {
        return '❌ Erro: tipo de arquivo inválido.';
    }

    return true;
}

// ============================================================
// FUNÇÃO: isPathSafe
// Verifica se um caminho permanece dentro do diretório base.
// @param string $base  Diretório base (com trailing slash)
// @param string $path  Caminho a verificar
// ============================================================
function isPathSafe(string $base, string $path): bool {
    // Normaliza separadores
    $base = str_replace('\\', '/', rtrim($base, '/\\')) . '/';
    $path = str_replace('\\', '/', $path);

    // Resolve o base com realpath se possível
    $realBase = realpath(rtrim($base, '/'));
    if ($realBase !== false) {
        $base = str_replace('\\', '/', $realBase) . '/';
    }

    // Normaliza o path manualmente (resolve . e .. sem precisar que exista)
    $normalized = normalizePath($path);

    // Verifica se o caminho normalizado começa com o base
    return strpos($normalized . '/', $base) === 0;
}

// Helper: normaliza um caminho resolvendo . e .. sem exigir existência no filesystem
function normalizePath(string $path): string {
    $path = str_replace('\\', '/', $path);
    $parts = explode('/', $path);
    $stack = [];
    foreach ($parts as $part) {
        if ($part === '' || $part === '.') continue;
        if ($part === '..') {
            array_pop($stack);
        } else {
            $stack[] = $part;
        }
    }
    $result = implode('/', $stack);
    // Preserva leading slash para caminhos absolutos
    if (str_starts_with($path, '/')) $result = '/' . $result;
    return $result;
}

// ============================================================
// FUNÇÃO: enableMaintenance
// Cria maintenance.flag em ROOT_PATH.
// ============================================================
function enableMaintenance(): bool {
    $flag = ROOT_PATH . 'maintenance.flag';
    $result = file_put_contents($flag, '') !== false;
    if ($result) {
        logMessage('🛠️ Modo de manutenção ativado.', 'warning');
    } else {
        logMessage('❌ Falha ao criar maintenance.flag.', 'error');
    }
    return $result;
}

// ============================================================
// FUNÇÃO: disableMaintenance
// Remove maintenance.flag de ROOT_PATH.
// ============================================================
function disableMaintenance(): bool {
    $flag = ROOT_PATH . 'maintenance.flag';
    if (!file_exists($flag)) return true;
    $result = unlink($flag);
    if ($result) {
        logMessage('✅ Modo de manutenção desativado.', 'success');
    } else {
        logMessage('❌ Falha ao remover maintenance.flag.', 'error');
    }
    return $result;
}

// ============================================================
// FUNÇÃO: createBackup
// Comprime ROOT_PATH em ZIP datado, excluindo BACKUP_PATH.
// @param string $tag  Version tag opcional
// @return string|false  Caminho do backup criado ou false em falha
// ============================================================
function createBackup(string $tag = ''): string|false {
    logMessage('📦 Criando backup...', 'info');

    if (!is_dir(BACKUP_PATH)) {
        mkdir(BACKUP_PATH, 0755, true);
    }

    $filename = 'backup_' . date('Y-m-d_H-i-s') . '.zip';
    $zipPath  = BACKUP_PATH . $filename;

    $zip = new ZipArchive();
    if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
        logMessage('❌ Erro crítico: não foi possível criar o arquivo ZIP de backup.', 'error');
        return false;
    }

    $backupRealPath = rtrim(str_replace('\\', '/', realpath(BACKUP_PATH) ?: BACKUP_PATH), '/') . '/';
    $rootRealPath   = rtrim(str_replace('\\', '/', realpath(ROOT_PATH) ?: ROOT_PATH), '/') . '/';

    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator(ROOT_PATH, RecursiveDirectoryIterator::SKIP_DOTS),
        RecursiveIteratorIterator::SELF_FIRST
    );

    foreach ($iterator as $file) {
        $filePath = str_replace('\\', '/', $file->getRealPath()) . ($file->isDir() ? '/' : '');
        // Excluir BACKUP_PATH do backup
        if (strpos($filePath, $backupRealPath) === 0) continue;

        $relative = substr($filePath, strlen($rootRealPath));
        if ($file->isDir()) {
            $zip->addEmptyDir($relative);
        } else {
            $zip->addFile($file->getRealPath(), $relative);
        }
    }

    // Metadados version.json
    $meta = json_encode([
        'timestamp'   => date('c'),
        'backup_file' => $filename,
        'version_tag' => $tag,
        'deployed_by' => 'admin',
    ], JSON_PRETTY_PRINT);
    $zip->addFromString('version.json', $meta);

    $zip->close();
    logMessage("✅ Backup criado: {$filename}", 'success');
    return $zipPath;
}

// ============================================================
// FUNÇÃO: cleanupFiles
// Remove recursivamente ROOT_PATH exceto lista de preservação.
// @param array $preserve  Nomes de itens a preservar (relativos a ROOT_PATH)
// @return array  Log de operações
// ============================================================
function cleanupFiles(array $preserve = []): array {
    $defaultPreserve = ['backup_deploy', 'config.php'];
    $preserve = array_unique(array_merge($defaultPreserve, $preserve));
    $log = [];

    $items = scandir(ROOT_PATH);
    foreach ($items as $item) {
        if ($item === '.' || $item === '..') continue;
        if (in_array($item, $preserve, true)) {
            logMessage("🔒 Preservado: {$item}", 'info');
            $log[] = ['action' => 'preserved', 'item' => $item];
            continue;
        }
        $fullPath = ROOT_PATH . $item;
        if (is_dir($fullPath)) {
            if (deleteDirectory($fullPath)) {
                logMessage("🗑️ Removido: {$item}/", 'info');
                $log[] = ['action' => 'removed', 'item' => $item];
            } else {
                logMessage("⚠️ Falha ao remover diretório: {$item}/", 'warning');
                $log[] = ['action' => 'failed', 'item' => $item];
            }
        } else {
            if (unlink($fullPath)) {
                logMessage("🗑️ Removido: {$item}", 'info');
                $log[] = ['action' => 'removed', 'item' => $item];
            } else {
                logMessage("⚠️ Falha ao remover arquivo: {$item}", 'warning');
                $log[] = ['action' => 'failed', 'item' => $item];
            }
        }
    }
    return $log;
}

// Helper: remove diretório recursivamente
function deleteDirectory(string $dir): bool {
    if (!is_dir($dir)) return false;
    $items = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($dir, RecursiveDirectoryIterator::SKIP_DOTS),
        RecursiveIteratorIterator::CHILD_FIRST
    );
    foreach ($items as $item) {
        $item->isDir() ? rmdir($item->getRealPath()) : unlink($item->getRealPath());
    }
    return rmdir($dir);
}

// ============================================================
// FUNÇÃO: extractPackage
// Extrai ZIP para destino com proteção de path traversal.
// @param string $zipPath  Caminho do arquivo ZIP
// @param string $dest     Diretório de destino
// @return array  Lista de arquivos extraídos com status
// ============================================================
function extractPackage(string $zipPath, string $dest): array {
    $extracted = [];
    $zip = new ZipArchive();

    if ($zip->open($zipPath) !== true) {
        logMessage('❌ Erro crítico: não foi possível abrir o pacote ZIP.', 'error');
        return $extracted;
    }

    if (!is_dir($dest)) mkdir($dest, 0755, true);

    for ($i = 0; $i < $zip->numFiles; $i++) {
        $entry    = $zip->getNameIndex($i);
        $destFile = rtrim($dest, '/\\') . DIRECTORY_SEPARATOR . $entry;

        // Proteção contra directory traversal
        if (!isPathSafe($dest, $destFile)) {
            logMessage("❌ Path traversal detectado e bloqueado: {$entry}", 'error');
            $extracted[] = ['file' => $entry, 'ok' => false];
            continue;
        }

        if (substr($entry, -1) === '/') {
            if (!is_dir($destFile)) mkdir($destFile, 0755, true);
            continue;
        }

        $dir = dirname($destFile);
        if (!is_dir($dir)) mkdir($dir, 0755, true);

        $content = $zip->getFromIndex($i);
        if (file_put_contents($destFile, $content) !== false) {
            logMessage("✅ Extraído: {$entry}", 'success');
            $extracted[] = ['file' => $entry, 'ok' => true];
        } else {
            logMessage("❌ Falha ao extrair: {$entry}", 'error');
            $extracted[] = ['file' => $entry, 'ok' => false];
        }
    }

    $zip->close();
    return $extracted;
}

// ============================================================
// FUNÇÃO: smartDeploy
// Detecta /backend/ e /frontend/ no ZIP e roteia para os caminhos corretos.
// @param string $zipPath  Caminho do arquivo ZIP
// @return bool
// ============================================================
function smartDeploy(string $zipPath): bool {
    logMessage('🚀 Iniciando Smart Deploy...', 'info');
    $zip = new ZipArchive();
    if ($zip->open($zipPath) !== true) {
        logMessage('❌ Erro ao abrir ZIP para Smart Deploy.', 'error');
        return false;
    }

    $hasBackend  = false;
    $hasFrontend = false;
    for ($i = 0; $i < $zip->numFiles; $i++) {
        $name = $zip->getNameIndex($i);
        if (strpos($name, 'backend/') === 0)  $hasBackend  = true;
        if (strpos($name, 'frontend/') === 0) $hasFrontend = true;
    }
    $zip->close();

    $ok = true;

    if ($hasBackend) {
        logMessage('📂 Roteando /backend/ → ' . BACKEND_PATH, 'info');
        $files = extractSubdir($zipPath, 'backend/', BACKEND_PATH);
        foreach ($files as $f) {
            if (!$f['ok']) { $ok = false; }
        }
    }

    if ($hasFrontend) {
        logMessage('📂 Roteando /frontend/ → ' . ROOT_PATH, 'info');
        $files = extractSubdir($zipPath, 'frontend/', ROOT_PATH);
        foreach ($files as $f) {
            if (!$f['ok']) { $ok = false; }
        }
    }

    if (!$hasBackend && !$hasFrontend) {
        logMessage('⚠️ Smart Deploy: nenhum subdiretório /backend/ ou /frontend/ encontrado. Extraindo na raiz.', 'warning');
        extractPackage($zipPath, ROOT_PATH);
    }

    return $ok;
}

// Helper: extrai apenas um subdiretório do ZIP para um destino
function extractSubdir(string $zipPath, string $prefix, string $dest): array {
    $extracted = [];
    $zip = new ZipArchive();
    if ($zip->open($zipPath) !== true) return $extracted;

    if (!is_dir($dest)) mkdir($dest, 0755, true);

    for ($i = 0; $i < $zip->numFiles; $i++) {
        $entry = $zip->getNameIndex($i);
        if (strpos($entry, $prefix) !== 0) continue;

        $relative = substr($entry, strlen($prefix));
        if ($relative === '') continue;

        $destFile = rtrim($dest, '/\\') . DIRECTORY_SEPARATOR . $relative;

        if (!isPathSafe($dest, $destFile)) {
            logMessage("❌ Path traversal bloqueado: {$entry}", 'error');
            $extracted[] = ['file' => $entry, 'ok' => false];
            continue;
        }

        if (substr($entry, -1) === '/') {
            if (!is_dir($destFile)) mkdir($destFile, 0755, true);
            continue;
        }

        $dir = dirname($destFile);
        if (!is_dir($dir)) mkdir($dir, 0755, true);

        $content = $zip->getFromIndex($i);
        if (file_put_contents($destFile, $content) !== false) {
            logMessage("✅ Extraído [{$prefix}]: {$relative}", 'success');
            $extracted[] = ['file' => $relative, 'ok' => true];
        } else {
            logMessage("❌ Falha [{$prefix}]: {$relative}", 'error');
            $extracted[] = ['file' => $relative, 'ok' => false];
        }
    }

    $zip->close();
    return $extracted;
}

// ============================================================
// FUNÇÃO: integrityCheck
// Verifica se os arquivos extraídos existem no destino.
// @param array  $files  Lista retornada por extractPackage/smartDeploy
// @param string $dest   Diretório de destino
// @return array  Arquivos ausentes
// ============================================================
function integrityCheck(array $files, string $dest): array {
    $missing = [];
    foreach ($files as $f) {
        if (!$f['ok']) continue;
        $path = rtrim($dest, '/\\') . DIRECTORY_SEPARATOR . $f['file'];
        if (!file_exists($path)) {
            logMessage("⚠️ Arquivo ausente após extração: {$f['file']}", 'warning');
            $missing[] = $f['file'];
        }
    }
    if (empty($missing)) {
        logMessage('✅ Verificação de integridade concluída sem erros.', 'success');
    }
    return $missing;
}

// ============================================================
// FUNÇÃO: listBackups
// Lista backups em BACKUP_PATH ordenados por data decrescente.
// @return array
// ============================================================
function listBackups(): array {
    if (!is_dir(BACKUP_PATH)) return [];
    $files = glob(BACKUP_PATH . 'backup_*.zip');
    if (!$files) return [];
    usort($files, fn($a, $b) => filemtime($b) - filemtime($a));
    return $files;
}

// ============================================================
// FUNÇÃO: rollback
// Restaura um backup: manutenção → limpeza → extração → desmanutenção.
// @param string $backupFile  Nome do arquivo de backup (sem path)
// @return bool
// ============================================================
function rollback(string $backupFile): bool {
    logMessage('🔄 Iniciando rollback...', 'info');

    $backupPath = BACKUP_PATH . basename($backupFile);
    if (!file_exists($backupPath)) {
        logMessage("❌ Backup não encontrado: {$backupFile}", 'error');
        return false;
    }

    enableMaintenance();

    // Limpeza preservando backup, uploads e config
    cleanupFiles(['backup_deploy', 'uploads', 'config.php']);

    // Extração do backup
    $extracted = extractPackage($backupPath, ROOT_PATH);
    $failed = array_filter($extracted, fn($f) => !$f['ok']);

    if (!empty($failed)) {
        logMessage('❌ Erro: falha no rollback. Sistema em manutenção.', 'error');
        return false;
    }

    disableMaintenance();
    logMessage('✅ Rollback concluído com sucesso!', 'success');
    return true;
}

// ============================================================
// PIPELINE: runDeploy
// Executa o pipeline completo de deploy.
// ============================================================
function runDeploy(): void {
    $startTime = microtime(true);
    logMessage('🚀 Deploy iniciado em ' . date('d/m/Y H:i:s'), 'info');

    $tag         = trim($_POST['version_tag'] ?? '');
    $keepUploads = isset($_POST['keep_uploads']);
    $keepDb      = isset($_POST['keep_db']);
    $smartMode   = isset($_POST['smart_deploy']);

    // Validação do upload
    if (empty($_FILES['package']['tmp_name'])) {
        logMessage('❌ Nenhum arquivo enviado.', 'error');
        return;
    }
    $validation = validateUpload($_FILES['package']);
    if ($validation !== true) {
        logMessage($validation, 'error');
        return;
    }

    // Manutenção
    if (!enableMaintenance()) return;

    // Backup
    $backupFile = createBackup($tag);
    if ($backupFile === false) {
        logMessage('❌ Erro crítico: falha ao criar backup. Deploy abortado.', 'error');
        return;
    }

    // Limpeza
    $preserve = [];
    if ($keepUploads) $preserve[] = 'uploads';
    if ($keepDb)      $preserve[] = 'db';
    cleanupFiles($preserve);

    // Extração / Smart Deploy
    $tmpPath = $_FILES['package']['tmp_name'];
    if ($smartMode) {
        $ok = smartDeploy($tmpPath);
        if (!$ok) {
            logMessage('❌ Erro crítico: falha na extração. Deploy abortado.', 'error');
            return;
        }
        $extracted = []; // Smart deploy faz seu próprio log
    } else {
        $extracted = extractPackage($tmpPath, ROOT_PATH);
        $failed = array_filter($extracted, fn($f) => !$f['ok']);
        if (!empty($failed)) {
            logMessage('❌ Erro crítico: falha na extração. Deploy abortado.', 'error');
            return;
        }
        integrityCheck($extracted, ROOT_PATH);
    }

    // Salvar version tag
    if ($tag !== '') {
        file_put_contents(ROOT_PATH . 'deploy_version.txt', $tag);
        logMessage("🏷️ Versão registrada: {$tag}", 'info');
    }

    disableMaintenance();

    $elapsed = round(microtime(true) - $startTime, 2);
    logMessage("🚀 Deploy concluído com sucesso! Tempo total: {$elapsed}s", 'success');
    logMessage('Fim em ' . date('d/m/Y H:i:s'), 'info');

    echo '<div style="margin-top:20px;text-align:center;">';
    echo '<a href="../admin/" style="display:inline-block;padding:12px 28px;background:#4ade80;color:#0f172a;border-radius:8px;font-weight:700;text-decoration:none;">← Voltar ao Painel Admin</a>';
    echo '</div>';
}

// ============================================================
// FUNÇÃO: renderUI
// Renderiza a interface HTML completa em dark mode.
// ============================================================
function renderUI(): void {
    $backups = listBackups();
    $version = file_exists(ROOT_PATH . 'deploy_version.txt')
        ? trim(file_get_contents(ROOT_PATH . 'deploy_version.txt'))
        : 'N/A';
    ?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Deploy — OursMusic</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#0f172a;color:#e2e8f0;font-family:'Segoe UI',system-ui,sans-serif;min-height:100vh;padding:24px 16px}
  .container{max-width:860px;margin:0 auto}
  h1{font-size:1.6rem;font-weight:700;color:#f8fafc;margin-bottom:4px}
  .subtitle{color:#94a3b8;font-size:.9rem;margin-bottom:28px}
  .card{background:#1e293b;border:1px solid #334155;border-radius:12px;padding:24px;margin-bottom:20px}
  .card h2{font-size:1rem;font-weight:600;color:#cbd5e1;margin-bottom:16px;text-transform:uppercase;letter-spacing:.05em}
  label{display:flex;align-items:center;gap:8px;color:#cbd5e1;font-size:.9rem;margin-bottom:10px;cursor:pointer}
  input[type=checkbox]{width:16px;height:16px;accent-color:#4ade80}
  input[type=text],input[type=file]{width:100%;padding:10px 14px;background:#0f172a;border:1px solid #334155;border-radius:8px;color:#e2e8f0;font-size:.9rem;margin-top:4px}
  input[type=file]{padding:8px}
  .field{margin-bottom:16px}
  .field>span{display:block;font-size:.85rem;color:#94a3b8;margin-bottom:4px}
  .btn{display:inline-block;padding:12px 28px;border:none;border-radius:8px;font-size:.95rem;font-weight:700;cursor:pointer;transition:opacity .2s}
  .btn-primary{background:#4ade80;color:#0f172a}
  .btn-danger{background:#f87171;color:#0f172a}
  .btn:hover{opacity:.85}
  .btn:disabled{opacity:.5;cursor:not-allowed}
  .log-panel{background:#020617;border:1px solid #1e293b;border-radius:8px;padding:16px;font-family:'Courier New',monospace;font-size:.82rem;max-height:420px;overflow-y:auto}
  .log-line{display:flex;gap:10px;padding:2px 0;border-bottom:1px solid #0f172a}
  .log-time{color:#475569;min-width:60px}
  .log-success .log-msg{color:#4ade80}
  .log-error   .log-msg{color:#f87171}
  .log-warning .log-msg{color:#fbbf24}
  .log-info    .log-msg{color:#94a3b8}
  .backup-list{list-style:none}
  .backup-list li{display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid #334155;font-size:.88rem;gap:12px;flex-wrap:wrap}
  .backup-list li:last-child{border-bottom:none}
  .badge{background:#1e3a5f;color:#93c5fd;padding:2px 8px;border-radius:4px;font-size:.78rem}
  .version-tag{color:#94a3b8;font-size:.82rem}
  .progress-bar{height:6px;background:#1e293b;border-radius:3px;overflow:hidden;margin-bottom:16px}
  .progress-fill{height:100%;background:linear-gradient(90deg,#4ade80,#22d3ee);width:0%;transition:width .4s;animation:pulse 1.5s infinite}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.6}}
  @media(max-width:600px){.backup-list li{flex-direction:column;align-items:flex-start}}
</style>
</head>
<body>
<div class="container">
  <h1>🚀 Sistema de Deploy</h1>
  <p class="subtitle">Versão atual: <strong><?= htmlspecialchars($version) ?></strong></p>

  <div class="card">
    <h2>📦 Novo Deploy</h2>
    <form method="POST" enctype="multipart/form-data" id="deployForm">
      <input type="hidden" name="action" value="deploy">

      <div class="field">
        <span>Opções de preservação</span>
        <label><input type="checkbox" name="keep_uploads" checked> Manter uploads/</label>
        <label><input type="checkbox" name="keep_db" checked> Manter db/</label>
        <label><input type="checkbox" name="smart_deploy"> Ativar Smart Deploy (Backend + Frontend)</label>
      </div>

      <div class="field">
        <span>Version Tag (opcional)</span>
        <input type="text" name="version_tag" placeholder="ex: v2.1.0">
      </div>

      <div class="field">
        <span>Pacote ZIP</span>
        <input type="file" name="package" accept=".zip" required>
      </div>

      <div class="progress-bar" id="progressBar" style="display:none"><div class="progress-fill" id="progressFill"></div></div>

      <button type="submit" class="btn btn-primary" id="deployBtn">🚀 Iniciar Deploy</button>
    </form>
  </div>

  <?php if (!empty($backups)): ?>
  <div class="card">
    <h2>🔄 Backups Disponíveis</h2>
    <ul class="backup-list">
      <?php foreach ($backups as $b):
        $name = basename($b);
        $size = round(filesize($b) / 1048576, 1);
        $date = date('d/m/Y H:i', filemtime($b));
        // Tenta ler version.json do backup
        $tag = '';
        $bz = new ZipArchive();
        if ($bz->open($b) === true) {
            $meta = $bz->getFromName('version.json');
            if ($meta) {
                $m = json_decode($meta, true);
                $tag = $m['version_tag'] ?? '';
            }
            $bz->close();
        }
      ?>
      <li>
        <span><?= htmlspecialchars($name) ?> <span class="badge"><?= $size ?>MB</span></span>
        <span class="version-tag"><?= $date ?><?= $tag ? " · {$tag}" : '' ?></span>
        <form method="POST" style="display:inline" onsubmit="return confirm('Confirmar rollback para <?= htmlspecialchars($name) ?>?')">
          <input type="hidden" name="action" value="rollback">
          <input type="hidden" name="backup" value="<?= htmlspecialchars($name) ?>">
          <button type="submit" class="btn btn-danger" style="padding:6px 16px;font-size:.82rem">↩ Rollback</button>
        </form>
      </li>
      <?php endforeach; ?>
    </ul>
  </div>
  <?php endif; ?>

</div>
<script>
document.getElementById('deployForm').addEventListener('submit', function() {
  document.getElementById('progressBar').style.display = 'block';
  document.getElementById('deployBtn').disabled = true;
  document.getElementById('progressFill').style.width = '80%';
});
</script>
</body>
</html>
    <?php
}

// ============================================================
// DISPATCHER — ponto de entrada principal
// ============================================================
if (!$isCli) {
    checkSecurity();

    $action = $_POST['action'] ?? ($_GET['action'] ?? 'ui');

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // Cabeçalho para streaming em tempo real
        header('Content-Type: text/html; charset=UTF-8');
        header('X-Accel-Buffering: no');
        if (ob_get_level() === 0) ob_start();

        echo '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">';
        echo '<meta name="viewport" content="width=device-width,initial-scale=1">';
        echo '<title>Deploy — OursMusic</title>';
        echo '<style>
          body{background:#0f172a;color:#e2e8f0;font-family:"Segoe UI",system-ui,sans-serif;padding:24px 16px}
          .container{max-width:860px;margin:0 auto}
          h1{font-size:1.4rem;font-weight:700;color:#f8fafc;margin-bottom:20px}
          .log-panel{background:#020617;border:1px solid #1e293b;border-radius:8px;padding:16px;font-family:"Courier New",monospace;font-size:.82rem}
          .log-line{display:flex;gap:10px;padding:2px 0;border-bottom:1px solid #0f172a}
          .log-time{color:#475569;min-width:60px}
          .log-success .log-msg{color:#4ade80}
          .log-error   .log-msg{color:#f87171}
          .log-warning .log-msg{color:#fbbf24}
          .log-info    .log-msg{color:#94a3b8}
        </style></head><body><div class="container">';
        echo '<h1>🚀 Deploy em andamento...</h1><div class="log-panel">';

        if ($action === 'rollback') {
            $backupFile = $_POST['backup'] ?? '';
            if ($backupFile === '') {
                logMessage('❌ Nenhum backup selecionado.', 'error');
            } else {
                rollback($backupFile);
            }
        } else {
            runDeploy();
        }

        echo '</div></div></body></html>';
        if (ob_get_level()) ob_end_flush();
    } else {
        renderUI();
    }
}

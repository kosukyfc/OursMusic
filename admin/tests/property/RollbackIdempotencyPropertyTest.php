<?php
/**
 * Teste de propriedade: rollback restaura estado do backup
 * Feature: automated-deploy-system, Property 8: Rollback idempotency
 *
 * Para qualquer backup válido, executar rollback deve restaurar
 * o sistema ao estado contido no backup, independentemente do
 * estado atual da plataforma.
 *
 * Execução: php admin/tests/property/RollbackIdempotencyPropertyTest.php
 */

$testRoot = sys_get_temp_dir() . '/pbt_rollback_' . uniqid() . '/';
mkdir($testRoot, 0755, true);
mkdir($testRoot . 'backup_deploy/', 0755, true);

define('ROOT_PATH',       $testRoot);
define('BACKEND_PATH',    $testRoot . 'backend_ext/');
define('BACKUP_PATH',     $testRoot . 'backup_deploy/');
define('MAX_UPLOAD_SIZE', 524288000);
define('ALLOWED_IPS',     ['127.0.0.1']);

$isCli = true;
require_once __DIR__ . '/../../deploy.php';

$passed = 0;
$failed = 0;
$iterations = 20;

function assert_true(bool $cond, string $label): void {
    global $passed, $failed;
    if ($cond) { $passed++; }
    else        { echo "  ❌ FAIL: {$label}\n"; $failed++; }
}

// Cria um conjunto de arquivos em ROOT_PATH e retorna o mapa nome→conteúdo
function createFileSet(string $root, array $files): void {
    foreach ($files as $name => $content) {
        $path = $root . $name;
        $dir  = dirname($path);
        if (!is_dir($dir)) mkdir($dir, 0755, true);
        file_put_contents($path, $content);
    }
}

// Lê o conteúdo de todos os arquivos em um diretório (exceto backup_deploy/)
function readFileSet(string $root): array {
    $result = [];
    if (!is_dir($root)) return $result;
    $it = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($root, RecursiveDirectoryIterator::SKIP_DOTS)
    );
    foreach ($it as $file) {
        if ($file->isDir()) continue;
        $rel = str_replace(str_replace('\\', '/', $root), '', str_replace('\\', '/', $file->getRealPath()));
        // Ignora backup_deploy/ e maintenance.flag
        if (str_starts_with($rel, 'backup_deploy/')) continue;
        if ($rel === 'maintenance.flag') continue;
        $result[$rel] = file_get_contents($file->getRealPath());
    }
    ksort($result);
    return $result;
}

// Limpa ROOT_PATH exceto backup_deploy/
function clearRoot(string $root): void {
    $items = scandir($root);
    foreach ($items as $item) {
        if ($item === '.' || $item === '..' || $item === 'backup_deploy') continue;
        $path = $root . $item;
        if (is_dir($path)) {
            $it = new RecursiveIteratorIterator(
                new RecursiveDirectoryIterator($path, RecursiveDirectoryIterator::SKIP_DOTS),
                RecursiveIteratorIterator::CHILD_FIRST
            );
            foreach ($it as $f) {
                $f->isDir() ? rmdir($f->getRealPath()) : unlink($f->getRealPath());
            }
            rmdir($path);
        } else {
            unlink($path);
        }
    }
}

$filePool = [
    'index.html'        => '<html><body>v1</body></html>',
    'app.js'            => 'console.log("v1")',
    'style.css'         => 'body { color: red; }',
    'assets/logo.png'   => 'PNG_DATA_V1',
    'config.php'        => '<?php define("VERSION", "1.0");',
    'data/users.json'   => '{"users":[]}',
];

echo "\n[Property 8: Rollback restaura estado do backup — {$iterations} iterações]\n";

for ($i = 0; $i < $iterations; $i++) {
    clearRoot(ROOT_PATH);

    // Seleciona subconjunto aleatório de arquivos para o estado original
    $numFiles = mt_rand(2, count($filePool));
    $keys = array_keys($filePool);
    shuffle($keys);
    $originalFiles = [];
    foreach (array_slice($keys, 0, $numFiles) as $k) {
        $originalFiles[$k] = $filePool[$k];
    }

    // Cria o estado original em ROOT_PATH
    createFileSet(ROOT_PATH, $originalFiles);
    $originalState = readFileSet(ROOT_PATH);

    // Cria backup do estado original
    $backupPath = createBackup("v{$i}");
    assert_true($backupPath !== false, "Ciclo {$i}: backup criado com sucesso");
    if ($backupPath === false) continue;

    // Modifica ROOT_PATH (simula um deploy que deu errado)
    clearRoot(ROOT_PATH);
    createFileSet(ROOT_PATH, [
        'index.html' => '<html><body>BROKEN DEPLOY</body></html>',
        'broken.js'  => 'throw new Error("broken")',
    ]);

    // Executa rollback
    $backupName = basename($backupPath);
    $result = rollback($backupName);
    assert_true($result === true, "Ciclo {$i}: rollback retorna true");

    // Verifica que o estado foi restaurado
    $restoredState = readFileSet(ROOT_PATH);

    // Cada arquivo do estado original deve existir com o conteúdo correto
    foreach ($originalState as $file => $content) {
        if ($file === 'config.php') continue; // config.php é preservado pelo rollback
        assert_true(
            isset($restoredState[$file]) && $restoredState[$file] === $content,
            "Ciclo {$i}: arquivo '{$file}' restaurado com conteúdo correto"
        );
    }

    // Arquivo do deploy quebrado não deve existir (exceto se estava no original)
    if (!isset($originalState['broken.js'])) {
        assert_true(
            !file_exists(ROOT_PATH . 'broken.js'),
            "Ciclo {$i}: arquivo do deploy quebrado foi removido"
        );
    }

    // Maintenance flag deve estar desativado após rollback bem-sucedido
    assert_true(
        !file_exists(ROOT_PATH . 'maintenance.flag'),
        "Ciclo {$i}: maintenance flag desativado após rollback"
    );
}

// Limpeza final
clearRoot(ROOT_PATH);
$backups = glob(BACKUP_PATH . '*.zip');
if ($backups) array_map('unlink', $backups);
@rmdir(BACKUP_PATH);
@rmdir(ROOT_PATH);

echo "\n────────────────────────────────────────\n";
echo "Iterações: {$iterations} | Passou: {$passed} | Falhou: {$failed}\n";
exit($failed > 0 ? 1 : 0);

<?php
/**
 * Teste de propriedade: Smart Deploy routing
 * Feature: automated-deploy-system, Property 7: Smart deploy routing
 *
 * Para qualquer ZIP com estrutura backend/frontend,
 * arquivos de /backend/ devem ir para BACKEND_PATH
 * e arquivos de /frontend/ devem ir para ROOT_PATH.
 *
 * Execução: php admin/tests/property/SmartDeployRoutingPropertyTest.php
 */

$testRoot    = sys_get_temp_dir() . '/pbt_smart_root_' . uniqid() . '/';
$testBackend = sys_get_temp_dir() . '/pbt_smart_backend_' . uniqid() . '/';
mkdir($testRoot, 0755, true);
mkdir($testBackend, 0755, true);

define('ROOT_PATH',       $testRoot);
define('BACKEND_PATH',    $testBackend);
define('BACKUP_PATH',     $testRoot . 'backup_deploy/');
define('MAX_UPLOAD_SIZE', 524288000);
define('ALLOWED_IPS',     ['127.0.0.1']);

$isCli = true;
require_once __DIR__ . '/../../deploy.php';

$passed = 0;
$failed = 0;
$iterations = 30;

function assert_true(bool $cond, string $label): void {
    global $passed, $failed;
    if ($cond) { $passed++; }
    else        { echo "  ❌ FAIL: {$label}\n"; $failed++; }
}

// Nomes de arquivo para geração aleatória
$fileNames = ['index.js', 'app.css', 'main.php', 'config.json', 'README.md', 'server.js', 'dist/bundle.js'];

echo "\n[Property 7: Smart Deploy routing — {$iterations} iterações]\n";

for ($i = 0; $i < $iterations; $i++) {
    // Limpa diretórios de destino
    foreach ([ROOT_PATH, BACKEND_PATH] as $dir) {
        $it = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($dir, RecursiveDirectoryIterator::SKIP_DOTS),
            RecursiveIteratorIterator::CHILD_FIRST
        );
        foreach ($it as $f) {
            $f->isDir() ? rmdir($f->getRealPath()) : unlink($f->getRealPath());
        }
    }

    // Gera arquivos aleatórios para backend e frontend
    $numBackend  = mt_rand(1, 4);
    $numFrontend = mt_rand(1, 4);
    shuffle($fileNames);
    $backendFiles  = array_slice($fileNames, 0, $numBackend);
    $frontendFiles = array_slice($fileNames, $numBackend, $numFrontend);

    // Cria ZIP com estrutura backend/ e frontend/
    $zipPath = sys_get_temp_dir() . '/smart_test_' . uniqid() . '.zip';
    $zip = new ZipArchive();
    $zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE);

    foreach ($backendFiles as $f) {
        $zip->addFromString('backend/' . $f, "backend content of {$f}");
    }
    foreach ($frontendFiles as $f) {
        $zip->addFromString('frontend/' . $f, "frontend content of {$f}");
    }
    $zip->close();

    // Executa Smart Deploy
    smartDeploy($zipPath);

    // Verifica: arquivos de backend foram para BACKEND_PATH
    foreach ($backendFiles as $f) {
        $dest = BACKEND_PATH . $f;
        assert_true(
            file_exists($dest),
            "Ciclo {$i}: arquivo backend '{$f}' está em BACKEND_PATH"
        );
        // Verifica que NÃO está em ROOT_PATH (a menos que seja o mesmo arquivo em frontend)
        if (!in_array($f, $frontendFiles)) {
            assert_true(
                !file_exists(ROOT_PATH . $f),
                "Ciclo {$i}: arquivo backend '{$f}' NÃO está em ROOT_PATH"
            );
        }
    }

    // Verifica: arquivos de frontend foram para ROOT_PATH
    foreach ($frontendFiles as $f) {
        $dest = ROOT_PATH . $f;
        assert_true(
            file_exists($dest),
            "Ciclo {$i}: arquivo frontend '{$f}' está em ROOT_PATH"
        );
        // Verifica que NÃO está em BACKEND_PATH (a menos que seja o mesmo arquivo em backend)
        if (!in_array($f, $backendFiles)) {
            assert_true(
                !file_exists(BACKEND_PATH . $f),
                "Ciclo {$i}: arquivo frontend '{$f}' NÃO está em BACKEND_PATH"
            );
        }
    }

    @unlink($zipPath);
}

// Limpeza final
foreach ([ROOT_PATH, BACKEND_PATH] as $dir) {
    $it = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($dir, RecursiveDirectoryIterator::SKIP_DOTS),
        RecursiveIteratorIterator::CHILD_FIRST
    );
    foreach ($it as $f) {
        $f->isDir() ? rmdir($f->getRealPath()) : unlink($f->getRealPath());
    }
    @rmdir($dir);
}

echo "\n────────────────────────────────────────\n";
echo "Iterações: {$iterations} | Passou: {$passed} | Falhou: {$failed}\n";
exit($failed > 0 ? 1 : 0);

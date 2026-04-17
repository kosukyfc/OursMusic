<?php
/**
 * Teste de propriedade: proteção contra directory traversal
 * Feature: automated-deploy-system, Property 3: Path traversal protection
 *
 * Para qualquer caminho gerado contendo "../" ou variantes,
 * isPathSafe() deve retornar false e nenhum arquivo deve ser
 * escrito fora do diretório de destino.
 *
 * Execução: php admin/tests/property/PathTraversalPropertyTest.php
 */

define('ROOT_PATH',       sys_get_temp_dir() . '/pbt_traversal_' . uniqid() . '/');
define('BACKEND_PATH',    ROOT_PATH . 'backend/');
define('BACKUP_PATH',     ROOT_PATH . 'backup_deploy/');
define('MAX_UPLOAD_SIZE', 524288000);
define('ALLOWED_IPS',     ['127.0.0.1']);

$isCli = true;
require_once __DIR__ . '/../../deploy.php';

$passed = 0;
$failed = 0;
$iterations = 100;

function assert_true(bool $cond, string $label): void {
    global $passed, $failed;
    if ($cond) { $passed++; }
    else        { echo "  ❌ FAIL: {$label}\n"; $failed++; }
}

$base = sys_get_temp_dir() . '/pbt_base_' . uniqid() . '/';
mkdir($base, 0755, true);

// Padrões de traversal para geração aleatória
$traversalPatterns = [
    '../etc/passwd',
    '../../etc/shadow',
    '../../../windows/system32/config',
    'subdir/../../etc/passwd',
    'a/b/../../../etc/passwd',
];

// Caminhos seguros para contraste
$safePaths = [
    'file.txt',
    'subdir/file.txt',
    'a/b/c/file.txt',
    'assets/img/logo.png',
];

echo "\n[Property 3: Path traversal bloqueado — {$iterations} iterações]\n";

for ($i = 0; $i < $iterations; $i++) {
    $pattern  = $traversalPatterns[array_rand($traversalPatterns)];
    $fullPath = $base . $pattern;

    $result = isPathSafe($base, $fullPath);
    assert_true(
        $result === false,
        "Traversal '{$pattern}' deve ser bloqueado por isPathSafe"
    );
}

echo "\n[Property 3: Caminhos seguros são permitidos]\n";

foreach ($safePaths as $safe) {
    $fullPath = $base . $safe;
    $result   = isPathSafe($base, $fullPath);
    assert_true($result === true, "Caminho seguro '{$safe}' deve ser permitido");
}

echo "\n[Property 3: extractPackage bloqueia traversal no ZIP]\n";

// Cria ZIP com entrada maliciosa
$maliciousZip = sys_get_temp_dir() . '/malicious_' . uniqid() . '.zip';
$zip = new ZipArchive();
$zip->open($maliciousZip, ZipArchive::CREATE | ZipArchive::OVERWRITE);
$zip->addFromString('../../../evil.txt', 'malicious content');
$zip->addFromString('safe/file.txt', 'safe content');
$zip->close();

$dest = sys_get_temp_dir() . '/pbt_extract_' . uniqid() . '/';
mkdir($dest, 0755, true);

$extracted = extractPackage($maliciousZip, $dest);

// Verifica que o arquivo malicioso não foi escrito fora do destino
$evilPath = dirname($dest) . '/evil.txt';
assert_true(!file_exists($evilPath), 'Arquivo malicioso não foi escrito fora do destino');

// Verifica que o arquivo seguro foi extraído
$safeFile = $dest . 'safe/file.txt';
assert_true(file_exists($safeFile), 'Arquivo seguro foi extraído normalmente');

// Limpeza
@unlink($maliciousZip);
@unlink($safeFile);
@rmdir($dest . 'safe');
@rmdir($dest);
@rmdir($base);

echo "\n────────────────────────────────────────\n";
echo "Iterações: {$iterations} | Passou: {$passed} | Falhou: {$failed}\n";
exit($failed > 0 ? 1 : 0);

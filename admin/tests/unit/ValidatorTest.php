<?php
/**
 * Testes unitários para validateUpload() e isPathSafe()
 * Feature: automated-deploy-system
 *
 * Execução: php admin/tests/unit/ValidatorTest.php
 */

define('ROOT_PATH',       sys_get_temp_dir() . '/val_test_' . uniqid() . '/');
define('BACKEND_PATH',    ROOT_PATH . 'backend/');
define('BACKUP_PATH',     ROOT_PATH . 'backup_deploy/');
define('MAX_UPLOAD_SIZE', 524288000);
define('ALLOWED_IPS',     ['127.0.0.1']);
$isCli = true;

require_once __DIR__ . '/../../deploy.php';

$passed = 0;
$failed = 0;

function assert_true(bool $cond, string $label): void {
    global $passed, $failed;
    if ($cond) { echo "  ✅ PASS: {$label}\n"; $passed++; }
    else        { echo "  ❌ FAIL: {$label}\n"; $failed++; }
}

// ── Helpers para criar arquivos ZIP de fixture ────────────────────────────────

function makeZipFixture(string $path): void {
    $zip = new ZipArchive();
    $zip->open($path, ZipArchive::CREATE | ZipArchive::OVERWRITE);
    $zip->addFromString('test.txt', 'hello');
    $zip->close();
}

function makeFakeZipFixture(string $path): void {
    // Arquivo com extensão .zip mas conteúdo inválido (não é ZIP real)
    file_put_contents($path, 'NOT A ZIP FILE - plain text content');
}

// ── Testes: validateUpload — extensão ────────────────────────────────────────

echo "\n[validateUpload — extensão]\n";

$tmpZip = sys_get_temp_dir() . '/test_valid.zip';
makeZipFixture($tmpZip);

$result = validateUpload(['name' => 'deploy.zip', 'size' => filesize($tmpZip), 'tmp_name' => $tmpZip]);
assert_true($result === true, 'Arquivo .zip válido é aceito');

$result = validateUpload(['name' => 'deploy.tar.gz', 'size' => 100, 'tmp_name' => $tmpZip]);
assert_true($result !== true && str_contains($result, '.zip'), 'Extensão .tar.gz é rejeitada');

$result = validateUpload(['name' => 'deploy.php', 'size' => 100, 'tmp_name' => $tmpZip]);
assert_true($result !== true, 'Extensão .php é rejeitada');

$result = validateUpload(['name' => 'deploy.ZIP', 'size' => filesize($tmpZip), 'tmp_name' => $tmpZip]);
assert_true($result === true, 'Extensão .ZIP (maiúscula) é aceita');

// ── Testes: validateUpload — tamanho ─────────────────────────────────────────

echo "\n[validateUpload — tamanho]\n";

$result = validateUpload(['name' => 'big.zip', 'size' => MAX_UPLOAD_SIZE + 1, 'tmp_name' => $tmpZip]);
assert_true($result !== true && str_contains($result, '500MB'), 'Arquivo acima de 500MB é rejeitado');

$result = validateUpload(['name' => 'ok.zip', 'size' => MAX_UPLOAD_SIZE, 'tmp_name' => $tmpZip]);
assert_true($result === true, 'Arquivo exatamente no limite é aceito');

// ── Testes: validateUpload — MIME type ───────────────────────────────────────

echo "\n[validateUpload — MIME type]\n";

$tmpFake = sys_get_temp_dir() . '/test_fake.zip';
makeFakeZipFixture($tmpFake);

$result = validateUpload(['name' => 'fake.zip', 'size' => filesize($tmpFake), 'tmp_name' => $tmpFake]);
assert_true($result !== true && str_contains($result, 'inválido'), 'Arquivo com MIME inválido é rejeitado');

// ── Testes: isPathSafe — directory traversal ─────────────────────────────────

echo "\n[isPathSafe — directory traversal]\n";

$base = sys_get_temp_dir() . '/deploy_test_base/';

assert_true(isPathSafe($base, $base . 'subdir/file.txt'), 'Caminho dentro do base é seguro');
assert_true(isPathSafe($base, $base . 'a/b/c/file.txt'), 'Caminho aninhado é seguro');
assert_true(!isPathSafe($base, $base . '../etc/passwd'), 'Path traversal ../ é bloqueado');
assert_true(!isPathSafe($base, '/etc/passwd'), 'Caminho absoluto fora do base é bloqueado');
assert_true(!isPathSafe($base, $base . 'a/../../etc/passwd'), 'Double traversal é bloqueado');

// Limpeza
@unlink($tmpZip);
@unlink($tmpFake);

// ── Resumo ────────────────────────────────────────────────────────────────────

echo "\n────────────────────────────────────────\n";
echo "Resultado: {$passed} passou(aram), {$failed} falhou(aram)\n";
exit($failed > 0 ? 1 : 0);

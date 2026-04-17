<?php
/**
 * Testes unitários para listBackups()
 * Feature: automated-deploy-system
 *
 * Execução: php admin/tests/unit/BackupListTest.php
 */

$testBackupDir = sys_get_temp_dir() . '/deploy_backup_test_' . uniqid() . '/';
mkdir($testBackupDir, 0755, true);

define('ROOT_PATH',       $testBackupDir);
define('BACKEND_PATH',    $testBackupDir . 'backend/');
define('BACKUP_PATH',     $testBackupDir . 'backup_deploy/');
define('MAX_UPLOAD_SIZE', 524288000);
define('ALLOWED_IPS',     ['127.0.0.1']);

$isCli = true;
require_once __DIR__ . '/../../deploy.php';

mkdir(BACKUP_PATH, 0755, true);

$passed = 0;
$failed = 0;

function assert_true(bool $cond, string $label): void {
    global $passed, $failed;
    if ($cond) { echo "  ✅ PASS: {$label}\n"; $passed++; }
    else        { echo "  ❌ FAIL: {$label}\n"; $failed++; }
}

function assert_equals(mixed $expected, mixed $actual, string $label): void {
    assert_true($expected === $actual, "{$label} (esperado: " . json_encode($expected) . ", obtido: " . json_encode($actual) . ")");
}

// ── Cria backups de fixture com timestamps diferentes ─────────────────────────

function makeBackupFile(string $name): void {
    $zip = new ZipArchive();
    $zip->open(BACKUP_PATH . $name, ZipArchive::CREATE | ZipArchive::OVERWRITE);
    $zip->addFromString('version.json', json_encode(['version_tag' => 'test']));
    $zip->close();
}

// ── Testes ────────────────────────────────────────────────────────────────────

echo "\n[listBackups — sem backups]\n";

$result = listBackups();
assert_true(is_array($result), 'Retorna array quando não há backups');
assert_equals(0, count($result), 'Array vazio quando não há backups');

echo "\n[listBackups — com backups]\n";

makeBackupFile('backup_2025-01-01_10-00-00.zip');
sleep(1); // garante mtime diferente
makeBackupFile('backup_2025-01-02_10-00-00.zip');
sleep(1);
makeBackupFile('backup_2025-01-03_10-00-00.zip');

$backups = listBackups();
assert_equals(3, count($backups), 'Lista todos os 3 backups');

// Verifica ordenação decrescente por mtime
$mtimes = array_map('filemtime', $backups);
$sorted = $mtimes;
rsort($sorted);
assert_true($mtimes === $sorted, 'Backups ordenados do mais recente para o mais antigo');

// Verifica que todos são arquivos .zip
foreach ($backups as $b) {
    assert_true(str_ends_with($b, '.zip'), "Backup é arquivo .zip: " . basename($b));
}

echo "\n[listBackups — ignora arquivos não-backup]\n";

file_put_contents(BACKUP_PATH . 'readme.txt', 'not a backup');
file_put_contents(BACKUP_PATH . 'other.zip', 'not matching pattern');

$backups2 = listBackups();
assert_equals(3, count($backups2), 'Ignora arquivos que não seguem o padrão backup_*.zip');

// ── Limpeza ───────────────────────────────────────────────────────────────────

array_map('unlink', glob(BACKUP_PATH . '*'));
rmdir(BACKUP_PATH);
rmdir(ROOT_PATH);

echo "\n────────────────────────────────────────\n";
echo "Resultado: {$passed} passou(aram), {$failed} falhou(aram)\n";
exit($failed > 0 ? 1 : 0);

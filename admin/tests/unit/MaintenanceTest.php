<?php
/**
 * Testes unitários para enableMaintenance() e disableMaintenance()
 * Feature: automated-deploy-system
 *
 * Execução: php admin/tests/unit/MaintenanceTest.php
 */

// Redireciona ROOT_PATH para diretório temporário de teste
$testRoot = sys_get_temp_dir() . '/deploy_maintenance_test_' . uniqid() . '/';
mkdir($testRoot, 0755, true);

// Sobrescreve constante antes de carregar deploy.php
define('ROOT_PATH',       $testRoot);
define('BACKEND_PATH',    $testRoot . 'backend/');
define('BACKUP_PATH',     $testRoot . 'backup_deploy/');
define('MAX_UPLOAD_SIZE', 524288000);
define('ALLOWED_IPS',     ['127.0.0.1']);

// Carrega apenas as funções (sem executar o dispatcher)
$isCli = true;
require_once __DIR__ . '/../../deploy.php';

$passed = 0;
$failed = 0;

function assert_true(bool $cond, string $label): void {
    global $passed, $failed;
    if ($cond) { echo "  ✅ PASS: {$label}\n"; $passed++; }
    else        { echo "  ❌ FAIL: {$label}\n"; $failed++; }
}

$flag = ROOT_PATH . 'maintenance.flag';

// ── enableMaintenance ─────────────────────────────────────────────────────────

echo "\n[enableMaintenance]\n";

assert_true(!file_exists($flag), 'Flag não existe antes de enableMaintenance');

$result = enableMaintenance();
assert_true($result === true, 'enableMaintenance retorna true');
assert_true(file_exists($flag), 'Flag é criado após enableMaintenance');

// Idempotência: chamar novamente não deve falhar
$result2 = enableMaintenance();
assert_true($result2 === true, 'enableMaintenance é idempotente (segunda chamada)');
assert_true(file_exists($flag), 'Flag ainda existe após segunda chamada');

// ── disableMaintenance ────────────────────────────────────────────────────────

echo "\n[disableMaintenance]\n";

$result = disableMaintenance();
assert_true($result === true, 'disableMaintenance retorna true');
assert_true(!file_exists($flag), 'Flag é removido após disableMaintenance');

// Idempotência: chamar sem flag existente não deve falhar
$result2 = disableMaintenance();
assert_true($result2 === true, 'disableMaintenance é idempotente quando flag não existe');

// ── Ciclo completo ────────────────────────────────────────────────────────────

echo "\n[Ciclo enable → disable]\n";

enableMaintenance();
assert_true(file_exists($flag), 'Flag existe após enable');
disableMaintenance();
assert_true(!file_exists($flag), 'Flag removido após disable');

// ── Limpeza ───────────────────────────────────────────────────────────────────

@rmdir($testRoot);

echo "\n────────────────────────────────────────\n";
echo "Resultado: {$passed} passou(aram), {$failed} falhou(aram)\n";
exit($failed > 0 ? 1 : 0);

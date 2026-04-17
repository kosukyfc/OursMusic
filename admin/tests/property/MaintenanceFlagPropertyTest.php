<?php
/**
 * Teste de propriedade: lifecycle do maintenance flag
 * Feature: automated-deploy-system, Property 4: Maintenance flag lifecycle
 *
 * Para qualquer sequência de enable/disable,
 * o flag deve existir após enable e não existir após disable.
 * Em N ciclos aleatórios, a invariante deve sempre se manter.
 *
 * Execução: php admin/tests/property/MaintenanceFlagPropertyTest.php
 */

$testRoot = sys_get_temp_dir() . '/pbt_maint_' . uniqid() . '/';
mkdir($testRoot, 0755, true);

define('ROOT_PATH',       $testRoot);
define('BACKEND_PATH',    $testRoot . 'backend/');
define('BACKUP_PATH',     $testRoot . 'backup_deploy/');
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

$flag = ROOT_PATH . 'maintenance.flag';

echo "\n[Property 4: Maintenance flag lifecycle — {$iterations} ciclos]\n";

for ($i = 0; $i < $iterations; $i++) {
    // Estado inicial: flag não existe
    if (file_exists($flag)) unlink($flag);

    // enable → flag deve existir
    enableMaintenance();
    assert_true(file_exists($flag), "Ciclo {$i}: flag existe após enableMaintenance");

    // disable → flag não deve existir
    disableMaintenance();
    assert_true(!file_exists($flag), "Ciclo {$i}: flag removido após disableMaintenance");
}

echo "\n[Property 4: enable é idempotente — {$iterations} iterações]\n";

for ($i = 0; $i < $iterations; $i++) {
    if (file_exists($flag)) unlink($flag);
    $n = mt_rand(1, 5);
    for ($j = 0; $j < $n; $j++) {
        enableMaintenance();
    }
    assert_true(file_exists($flag), "Flag existe após {$n} chamadas a enableMaintenance");
    unlink($flag);
}

echo "\n[Property 4: disable é idempotente — {$iterations} iterações]\n";

for ($i = 0; $i < $iterations; $i++) {
    // Começa sem flag
    if (file_exists($flag)) unlink($flag);
    $n = mt_rand(1, 5);
    for ($j = 0; $j < $n; $j++) {
        disableMaintenance();
    }
    assert_true(!file_exists($flag), "Flag não existe após {$n} chamadas a disableMaintenance");
}

// Limpeza
if (file_exists($flag)) unlink($flag);
@rmdir($testRoot);

echo "\n────────────────────────────────────────\n";
echo "Iterações: {$iterations} | Passou: {$passed} | Falhou: {$failed}\n";
exit($failed > 0 ? 1 : 0);

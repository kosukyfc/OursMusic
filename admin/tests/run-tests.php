<?php
/**
 * Runner de testes — Sistema de Deploy Automatizado
 * Executa todos os testes unitários e de propriedade.
 *
 * Uso: php admin/tests/run-tests.php
 */

$tests = [
    'Unitários' => [
        __DIR__ . '/unit/SecurityTest.php',
        __DIR__ . '/unit/ValidatorTest.php',
        __DIR__ . '/unit/MaintenanceTest.php',
        __DIR__ . '/unit/BackupListTest.php',
    ],
    'Propriedade' => [
        __DIR__ . '/property/IpRejectionPropertyTest.php',
        __DIR__ . '/property/FileValidationPropertyTest.php',
        __DIR__ . '/property/PathTraversalPropertyTest.php',
        __DIR__ . '/property/MaintenanceFlagPropertyTest.php',
        __DIR__ . '/property/CleanupPreservationPropertyTest.php',
        __DIR__ . '/property/SmartDeployRoutingPropertyTest.php',
        __DIR__ . '/property/RollbackIdempotencyPropertyTest.php',
    ],
];

$totalPassed = 0;
$totalFailed = 0;

// Detecta o executável PHP correto
$phpBin = PHP_BINARY ?: 'php';

foreach ($tests as $group => $files) {
    echo "\n══════════════════════════════════════════\n";
    echo "  Testes {$group}\n";
    echo "══════════════════════════════════════════\n";

    foreach ($files as $file) {
        $name = basename($file);
        echo "\n▶ {$name}\n";

        // Executa em subprocesso para isolar constantes e estado global
        $output = [];
        $code   = 0;
        exec(escapeshellarg($phpBin) . " " . escapeshellarg($file) . " 2>&1", $output, $code);

        foreach ($output as $line) {
            echo "  {$line}\n";
        }

        if ($code === 0) {
            $totalPassed++;
            echo "  → PASSOU\n";
        } else {
            $totalFailed++;
            echo "  → FALHOU (código {$code})\n";
        }
    }
}

echo "\n══════════════════════════════════════════\n";
echo "  RESULTADO FINAL\n";
echo "══════════════════════════════════════════\n";
echo "  Suítes passaram: {$totalPassed}\n";
echo "  Suítes falharam: {$totalFailed}\n";
echo "══════════════════════════════════════════\n\n";

exit($totalFailed > 0 ? 1 : 0);

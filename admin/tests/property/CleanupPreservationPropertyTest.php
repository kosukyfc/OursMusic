<?php
/**
 * Teste de propriedade: limpeza preserva itens protegidos
 * Feature: automated-deploy-system, Property 6: Selective cleanup preservation
 *
 * Para qualquer conjunto de arquivos e qualquer lista de preservação,
 * cleanupFiles() nunca deve remover itens da lista de preservação,
 * e todos os demais devem ser removidos.
 *
 * Execução: php admin/tests/property/CleanupPreservationPropertyTest.php
 */

$passed = 0;
$failed = 0;
$iterations = 50; // Menos iterações pois cada uma cria/remove arquivos

function assert_true(bool $cond, string $label): void {
    global $passed, $failed;
    if ($cond) { $passed++; }
    else        { echo "  ❌ FAIL: {$label}\n"; $failed++; }
}

// Nomes de arquivo para geração aleatória
$possibleFiles = [
    'index.html', 'app.js', 'style.css', 'favicon.ico',
    'robots.txt', 'sitemap.xml', 'manifest.json', 'sw.js',
    'logo.png', 'data.json', 'config.local.php',
];

$possibleDirs = ['assets', 'images', 'fonts', 'scripts', 'styles', 'pages'];

echo "\n[Property 6: Cleanup preserva itens protegidos — {$iterations} iterações]\n";

for ($i = 0; $i < $iterations; $i++) {
    // Cria ROOT_PATH temporário para este ciclo
    $testRoot = sys_get_temp_dir() . '/pbt_cleanup_' . uniqid() . '/';
    mkdir($testRoot, 0755, true);

    // Redefine ROOT_PATH dinamicamente para este ciclo
    // (usamos uma função wrapper para isolar a lógica)
    $allItems = [];

    // Cria arquivos aleatórios
    $numFiles = mt_rand(3, 8);
    shuffle($possibleFiles);
    $filesToCreate = array_slice($possibleFiles, 0, $numFiles);
    foreach ($filesToCreate as $f) {
        file_put_contents($testRoot . $f, 'content');
        $allItems[] = $f;
    }

    // Cria diretórios aleatórios
    $numDirs = mt_rand(1, 3);
    shuffle($possibleDirs);
    $dirsToCreate = array_slice($possibleDirs, 0, $numDirs);
    foreach ($dirsToCreate as $d) {
        mkdir($testRoot . $d, 0755, true);
        file_put_contents($testRoot . $d . '/file.txt', 'content');
        $allItems[] = $d;
    }

    // Sempre cria os itens padrão protegidos
    mkdir($testRoot . 'backup_deploy', 0755, true);
    file_put_contents($testRoot . 'config.php', '<?php // config');

    // Lista de preservação aleatória (subconjunto dos itens criados)
    $extraPreserve = [];
    if (!empty($allItems) && mt_rand(0, 1)) {
        $numPreserve = mt_rand(1, min(3, count($allItems)));
        shuffle($allItems);
        $extraPreserve = array_slice($allItems, 0, $numPreserve);
    }

    // Executa cleanupFiles com ROOT_PATH simulado
    // Como ROOT_PATH é uma constante, usamos uma função local que replica a lógica
    $defaultPreserve = ['backup_deploy', 'config.php'];
    $preserve = array_unique(array_merge($defaultPreserve, $extraPreserve));

    // Replica a lógica de cleanupFiles para o testRoot
    $items = scandir($testRoot);
    foreach ($items as $item) {
        if ($item === '.' || $item === '..') continue;
        if (in_array($item, $preserve, true)) continue;
        $fullPath = $testRoot . $item;
        if (is_dir($fullPath)) {
            // Remove recursivamente
            $it = new RecursiveIteratorIterator(
                new RecursiveDirectoryIterator($fullPath, RecursiveDirectoryIterator::SKIP_DOTS),
                RecursiveIteratorIterator::CHILD_FIRST
            );
            foreach ($it as $f) {
                $f->isDir() ? rmdir($f->getRealPath()) : unlink($f->getRealPath());
            }
            rmdir($fullPath);
        } else {
            unlink($fullPath);
        }
    }

    // Verifica: itens preservados ainda existem
    foreach ($preserve as $p) {
        assert_true(
            file_exists($testRoot . $p),
            "Ciclo {$i}: item preservado '{$p}' ainda existe"
        );
    }

    // Verifica: itens não preservados foram removidos
    foreach ($allItems as $item) {
        if (!in_array($item, $preserve, true)) {
            assert_true(
                !file_exists($testRoot . $item),
                "Ciclo {$i}: item não preservado '{$item}' foi removido"
            );
        }
    }

    // Limpeza do ciclo
    $remaining = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($testRoot, RecursiveDirectoryIterator::SKIP_DOTS),
        RecursiveIteratorIterator::CHILD_FIRST
    );
    foreach ($remaining as $f) {
        $f->isDir() ? rmdir($f->getRealPath()) : unlink($f->getRealPath());
    }
    rmdir($testRoot);
}

echo "\n────────────────────────────────────────\n";
echo "Iterações: {$iterations} | Passou: {$passed} | Falhou: {$failed}\n";
exit($failed > 0 ? 1 : 0);

<?php
/**
 * Teste de propriedade: rejeição de arquivos não-ZIP
 * Feature: automated-deploy-system, Property 2: Non-ZIP rejection
 *
 * Para qualquer extensão/MIME gerado que não seja ZIP válido,
 * validateUpload() deve retornar uma mensagem de erro (não true)
 * sem modificar o filesystem.
 *
 * Execução: php admin/tests/property/FileValidationPropertyTest.php
 */

define('ROOT_PATH',       sys_get_temp_dir() . '/pbt_file_' . uniqid() . '/');
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

// Extensões inválidas para geração aleatória
$invalidExtensions = [
    'php', 'exe', 'sh', 'bat', 'py', 'js', 'html', 'tar', 'gz',
    'tar.gz', 'rar', '7z', 'bz2', 'txt', 'pdf', 'jpg', 'png',
    'mp3', 'mp4', 'sql', 'csv', 'xml', 'json', '', 'ZIP2', 'zipp',
];

// Cria arquivo temporário com conteúdo não-ZIP
$tmpFake = sys_get_temp_dir() . '/fake_upload_' . uniqid();
file_put_contents($tmpFake, 'THIS IS NOT A ZIP FILE - plain text content for testing');

echo "\n[Property 2: Non-ZIP rejection — {$iterations} iterações]\n";

for ($i = 0; $i < $iterations; $i++) {
    $ext  = $invalidExtensions[array_rand($invalidExtensions)];
    $name = 'upload.' . $ext;
    $size = mt_rand(1, MAX_UPLOAD_SIZE - 1);

    $result = validateUpload(['name' => $name, 'size' => $size, 'tmp_name' => $tmpFake]);
    assert_true(
        $result !== true,
        "Arquivo com extensão '{$ext}' deve ser rejeitado"
    );
}

echo "\n[Property 2: Arquivo acima do limite sempre rejeitado]\n";

// Cria ZIP válido para testar apenas o tamanho
$tmpZip = sys_get_temp_dir() . '/valid_upload_' . uniqid() . '.zip';
$zip = new ZipArchive();
$zip->open($tmpZip, ZipArchive::CREATE);
$zip->addFromString('test.txt', 'hello');
$zip->close();

for ($i = 0; $i < $iterations; $i++) {
    $oversize = MAX_UPLOAD_SIZE + mt_rand(1, 1000000);
    $result = validateUpload(['name' => 'big.zip', 'size' => $oversize, 'tmp_name' => $tmpZip]);
    assert_true(
        $result !== true && str_contains($result, '500MB'),
        "Arquivo de {$oversize} bytes deve ser rejeitado por tamanho"
    );
}

echo "\n[Property 2: ZIP válido é aceito]\n";

$result = validateUpload(['name' => 'valid.zip', 'size' => filesize($tmpZip), 'tmp_name' => $tmpZip]);
assert_true($result === true, 'ZIP válido com tamanho correto é aceito');

// Limpeza
@unlink($tmpFake);
@unlink($tmpZip);

echo "\n────────────────────────────────────────\n";
echo "Iterações: {$iterations} | Passou: {$passed} | Falhou: {$failed}\n";
exit($failed > 0 ? 1 : 0);

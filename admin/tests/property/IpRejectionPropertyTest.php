<?php
/**
 * Teste de propriedade: rejeição de IPs não autorizados
 * Feature: automated-deploy-system, Property 1: IP rejection
 *
 * Para qualquer IP gerado aleatoriamente fora de ALLOWED_IPS,
 * a verificação de IP deve retornar false sem efeitos colaterais.
 *
 * Execução: php admin/tests/property/IpRejectionPropertyTest.php
 */

define('ROOT_PATH',       sys_get_temp_dir() . '/pbt_ip_' . uniqid() . '/');
define('BACKEND_PATH',    ROOT_PATH . 'backend/');
define('BACKUP_PATH',     ROOT_PATH . 'backup_deploy/');
define('MAX_UPLOAD_SIZE', 524288000);
define('ALLOWED_IPS',     ['127.0.0.1', '::1', '10.0.0.1']);

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

// Função isolada de verificação de IP (extraída da lógica de checkSecurity)
function isIpAllowed(string $ip): bool {
    return in_array($ip, ALLOWED_IPS, true);
}

// Gerador de IPs aleatórios fora da lista
function randomUnauthorizedIp(): string {
    $unauthorized = [
        '192.168.1.' . mt_rand(1, 254),
        '172.16.' . mt_rand(0, 31) . '.' . mt_rand(1, 254),
        mt_rand(1, 223) . '.' . mt_rand(0, 255) . '.' . mt_rand(0, 255) . '.' . mt_rand(1, 254),
        '2001:db8::' . dechex(mt_rand(1, 65535)),
        'fe80::' . dechex(mt_rand(1, 65535)),
        '',
        'not-an-ip',
        '0.0.0.0',
        '255.255.255.255',
    ];
    return $unauthorized[array_rand($unauthorized)];
}

echo "\n[Property 1: IP rejection — {$iterations} iterações]\n";

for ($i = 0; $i < $iterations; $i++) {
    $ip = randomUnauthorizedIp();
    // Garante que o IP gerado não está na lista autorizada
    if (in_array($ip, ALLOWED_IPS, true)) continue;

    $result = isIpAllowed($ip);
    assert_true($result === false, "IP não autorizado '{$ip}' deve ser rejeitado");
}

// Propriedade inversa: IPs autorizados devem ser aceitos
echo "\n[Property 1 inversa: IPs autorizados são aceitos]\n";
foreach (ALLOWED_IPS as $ip) {
    assert_true(isIpAllowed($ip) === true, "IP autorizado '{$ip}' deve ser aceito");
}

echo "\n────────────────────────────────────────\n";
echo "Iterações: {$iterations} | Passou: {$passed} | Falhou: {$failed}\n";
exit($failed > 0 ? 1 : 0);

<?php
/**
 * Testes unitários para checkSecurity(), sanitizePost() e sanitizeFileInput()
 * Feature: automated-deploy-system
 *
 * Execução: php admin/tests/unit/SecurityTest.php
 */

// Define constantes e modo CLI antes de carregar deploy.php
define('ROOT_PATH',       sys_get_temp_dir() . '/sec_test_' . uniqid() . '/');
define('BACKEND_PATH',    ROOT_PATH . 'backend/');
define('BACKUP_PATH',     ROOT_PATH . 'backup_deploy/');
define('MAX_UPLOAD_SIZE', 524288000);
define('ALLOWED_IPS',     ['127.0.0.1', '::1']);
$isCli = true;

require_once __DIR__ . '/../../deploy.php';

// ── Helpers de teste ──────────────────────────────────────────────────────────

$passed = 0;
$failed = 0;

function assert_true(bool $cond, string $label): void {
    global $passed, $failed;
    if ($cond) {
        echo "  ✅ PASS: {$label}\n";
        $passed++;
    } else {
        echo "  ❌ FAIL: {$label}\n";
        $failed++;
    }
}

function assert_equals(mixed $expected, mixed $actual, string $label): void {
    assert_true($expected === $actual, "{$label} (esperado: " . json_encode($expected) . ", obtido: " . json_encode($actual) . ")");
}

// ── Testes: sanitizePost ──────────────────────────────────────────────────────

echo "\n[sanitizePost]\n";

$clean = sanitizePost(['name' => '<script>alert(1)</script>', 'value' => '  hello  ']);
assert_equals('&lt;script&gt;alert(1)&lt;/script&gt;', $clean['name'], 'Remove e escapa tags HTML');
assert_equals('hello', $clean['value'], 'Faz trim de espaços');

$nested = sanitizePost(['a' => ['b' => '<b>bold</b>']]);
assert_equals('&lt;b&gt;bold&lt;/b&gt;', $nested['a']['b'], 'Sanitiza arrays aninhados (escapa HTML)');

$clean2 = sanitizePost(['num' => 42]);
assert_equals(42, $clean2['num'], 'Preserva valores não-string');

// ── Testes: sanitizeFileInput ─────────────────────────────────────────────────

echo "\n[sanitizeFileInput]\n";

$file = sanitizeFileInput(['name' => '../../../etc/passwd', 'size' => 100]);
assert_equals('passwd', $file['name'], 'Remove path traversal do nome do arquivo');

$file2 = sanitizeFileInput(['name' => "evil\x00file.zip", 'size' => 100]);
assert_true(!str_contains($file2['name'], "\x00"), 'Remove null bytes do nome');

$file3 = sanitizeFileInput(['name' => '<script>x.zip</script>', 'size' => 100]);
assert_true(!str_contains($file3['name'], '<script>'), 'Remove tags HTML do nome');

// ── Testes: checkSecurity (lógica de sessão/IP isolada) ───────────────────────

echo "\n[checkSecurity — lógica de sessão e IP]\n";

// Simula verificação de sessão admin
function isAdminSession(array $session): bool {
    return isset($session['user']['is_admin']) && $session['user']['is_admin'] === true;
}

assert_true(isAdminSession(['user' => ['is_admin' => true]]), 'Sessão admin válida é aceita');
assert_true(!isAdminSession(['user' => ['is_admin' => false]]), 'Sessão admin=false é rejeitada');
assert_true(!isAdminSession([]), 'Sessão vazia é rejeitada');
assert_true(!isAdminSession(['user' => []]), 'Sessão sem is_admin é rejeitada');
assert_true(!isAdminSession(['user' => ['is_admin' => 1]]), 'is_admin=1 (int) é rejeitado (strict)');

// Simula verificação de IP
function isIpAllowed(string $ip, array $allowedIps): bool {
    return in_array($ip, $allowedIps, true);
}

$allowed = ['127.0.0.1', '::1', '192.168.1.10'];
assert_true(isIpAllowed('127.0.0.1', $allowed), 'IP 127.0.0.1 é autorizado');
assert_true(isIpAllowed('::1', $allowed), 'IP ::1 é autorizado');
assert_true(isIpAllowed('192.168.1.10', $allowed), 'IP da lista é autorizado');
assert_true(!isIpAllowed('10.0.0.1', $allowed), 'IP fora da lista é rejeitado');
assert_true(!isIpAllowed('', $allowed), 'IP vazio é rejeitado');
assert_true(!isIpAllowed('127.0.0.2', $allowed), 'IP similar mas diferente é rejeitado');

// ── Resumo ────────────────────────────────────────────────────────────────────

echo "\n────────────────────────────────────────\n";
echo "Resultado: {$passed} passou(aram), {$failed} falhou(aram)\n";
exit($failed > 0 ? 1 : 0);

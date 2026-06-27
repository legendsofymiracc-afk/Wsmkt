<?php
// Roteador simples e rate limiting
require_once __DIR__ . '/config.php';

// Rate limiting (30 req/min por IP)
function checkRateLimit(): void {
    $ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
    $key = 'rate_' . md5($ip);
    $now = time();
    $window = 60;
    $maxRequests = 30;

    $db = getDB();
    // Criar tabela de rate limit se não existir
    $db->exec('CREATE TABLE IF NOT EXISTS rate_limits (
        chave TEXT PRIMARY KEY,
        contagem INTEGER DEFAULT 0,
        janela_inicio INTEGER DEFAULT 0
    )');

    $stmt = $db->prepare('SELECT contagem, janela_inicio FROM rate_limits WHERE chave = ?');
    $stmt->execute([$key]);
    $row = $stmt->fetch();

    if ($row) {
        $count = (int) $row['contagem'];
        $windowStart = (int) $row['janela_inicio'];
        if ($now - $windowStart > $window) {
            $count = 1;
            $windowStart = $now;
        } else {
            $count++;
        }
        if ($count > $maxRequests) {
            http_response_code(429);
            echo json_encode(['error' => 'Muitas requisições. Aguarde.']);
            exit();
        }
        $stmt = $db->prepare('UPDATE rate_limits SET contagem = ?, janela_inicio = ? WHERE chave = ?');
        $stmt->execute([$count, $windowStart, $key]);
    } else {
        $stmt = $db->prepare('INSERT INTO rate_limits (chave, contagem, janela_inicio) VALUES (?, 1, ?)');
        $stmt->execute([$key, $now]);
    }
}

// CSRF token
function generateCsrfToken(): string {
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function verifyCsrfToken(): bool {
    if ($_SERVER['REQUEST_METHOD'] === 'GET' || $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        return true;
    }
    $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? ($_POST['csrf_token'] ?? '');
    return !empty($_SESSION['csrf_token']) && hash_equals($_SESSION['csrf_token'], $token);
}

// Headers de segurança
function sendSecurityHeaders(): void {
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, X-CSRF-Token');
}

// Aplica proteções
checkRateLimit();
sendSecurityHeaders();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

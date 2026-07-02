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

    $db->beginTransaction();
    try {
        // Upsert com reset se janela expirou
        $stmt = $db->prepare('INSERT INTO rate_limits (chave, contagem, janela_inicio) VALUES (?, 1, ?)
            ON CONFLICT(chave) DO UPDATE SET
                contagem = CASE WHEN janela_inicio < ? THEN 1 ELSE contagem + 1 END,
                janela_inicio = CASE WHEN janela_inicio < ? THEN ? ELSE janela_inicio END');
        $stmt->execute([$key, $now, $now - $window, $now - $window, $now]);

        // Lê a contagem atual
        $stmt = $db->prepare('SELECT contagem FROM rate_limits WHERE chave = ?');
        $stmt->execute([$key]);
        $count = (int) $stmt->fetchColumn();

        $db->commit();

        if ($count > $maxRequests) {
            http_response_code(429);
            echo json_encode(['error' => 'Muitas requisições. Aguarde.']);
            exit();
        }
    } catch (Throwable $e) {
        if ($db->inTransaction()) $db->rollBack();
        // Falha no rate limit não bloqueia a requisição
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
    $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    return !empty($_SESSION['csrf_token']) && !empty($token) && hash_equals($_SESSION['csrf_token'], $token);
}

// Headers de segurança
function sendSecurityHeaders(): void {
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY');
    header('Referrer-Policy: strict-origin-when-cross-origin');
    header('X-Permitted-Cross-Domain-Policies: none');

    // CORS: restrito em produção, permissivo em dev local
    $requestOrigin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $origin = $requestOrigin ?: ($_SERVER['HTTP_HOST'] ?? '');
    $isLocal = (
        strpos($origin, '127.0.0.1') !== false ||
        strpos($origin, 'localhost') !== false ||
        strpos($origin, 'file://') !== false ||
        empty($origin)
    );
    if ($isLocal) {
        if ($requestOrigin !== '') {
            header('Access-Control-Allow-Origin: ' . $requestOrigin);
            header('Access-Control-Allow-Credentials: true');
            header('Vary: Origin');
        } else {
            header('Access-Control-Allow-Origin: *');
        }
    } else {
        // Em produção, whitelist explícita de origens permitidas
        $requestHost = $_SERVER['HTTP_HOST'] ?? 'localhost';
        $allowedOrigins = [
            'https://' . $requestHost,
            'https://www.' . $requestHost,
        ];
        if (in_array($requestOrigin, $allowedOrigins, true)) {
            header('Access-Control-Allow-Origin: ' . $requestOrigin);
            header('Access-Control-Allow-Credentials: true');
            header('Vary: Origin');
        } else {
            // Fallback: permite mesma origem (navegadores modernos respeitam)
            header('Access-Control-Allow-Origin: https://' . $requestHost);
        }
    }
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, X-CSRF-Token');
}

// Timeout de sessão por inatividade (30 minutos)
// Só se aplica a usuários autenticados; endpoints públicos não são afetados
function enforceSessionTimeout(int $timeoutSeconds = 1800): void {
    if (!isset($_SESSION['usuario_id']) || $_SESSION['usuario_id'] <= 0) {
        return; // Não autenticado, nada a expirar
    }
    $now = time();
    $lastActivity = $_SESSION['last_activity'] ?? 0;
    if ($lastActivity > 0 && ($now - $lastActivity) > $timeoutSeconds) {
        // Sessão expirada — destrói e exige novo login
        $_SESSION = [];
        if (session_status() === PHP_SESSION_ACTIVE) {
            session_destroy();
        }
        http_response_code(401);
        echo json_encode(['error' => 'Sessão expirada por inatividade. Faça login novamente.']);
        exit();
    }
    $_SESSION['last_activity'] = $now;
}

// Aplica proteções
checkRateLimit();
sendSecurityHeaders();
enforceSessionTimeout();

// Verificar CSRF em métodos que alteram estado
if (in_array($_SERVER['REQUEST_METHOD'], ['POST', 'PUT', 'DELETE'])) {
    if (!verifyCsrfToken()) {
        http_response_code(403);
        echo json_encode(['error' => 'Token CSRF inválido']);
        exit();
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

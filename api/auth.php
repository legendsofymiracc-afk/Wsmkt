<?php
require_once __DIR__ . '/routes.php';

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
$action = $_GET['action'] ?? '';

function extractCredentials(string $method): array {
    $email = '';
    $password = '';
    $rawBody = file_get_contents('php://input');
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';

    if ($method === 'POST' || $method === 'PUT') {
        if ($rawBody !== false && strlen(trim($rawBody)) > 0) {
            if (stripos($contentType, 'application/json') !== false) {
                $data = json_decode($rawBody, true) ?: [];
                $email = $data['email'] ?? '';
                $password = $data['password'] ?? ($data['senha'] ?? '');
            } elseif (stripos($contentType, 'application/x-www-form-urlencoded') !== false) {
                parse_str($rawBody, $parsed);
                $email = $parsed['email'] ?? '';
                $password = $parsed['password'] ?? ($parsed['senha'] ?? '');
            }
        }
        if ($email === '' && isset($_POST['email'])) {
            $email = $_POST['email'];
            $password = $_POST['password'] ?? ($_POST['senha'] ?? '');
        }
    }

    // Não usa $_REQUEST — previne vazamento de credenciais via URL (GET params
    // ficam gravados em logs, histórico do navegador e headers Referer)
    return [trim((string) $email), (string) $password];
}

switch ($action) {
    case 'login':
        [$email, $password] = extractCredentials($method);

        if ($email === '' || $password === '') {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Email e senha obrigatórios']);
            exit();
        }

        $db = getDB();

        // Proteção contra brute force: tabela de tentativas de login
        $db->exec('CREATE TABLE IF NOT EXISTS login_attempts (
            email TEXT PRIMARY KEY,
            failures INTEGER DEFAULT 0,
            last_attempt INTEGER DEFAULT 0,
            locked_until INTEGER DEFAULT 0
        )');

        // Verifica se conta está bloqueada
        $stmt = $db->prepare('SELECT failures, locked_until FROM login_attempts WHERE email = ?');
        $stmt->execute([$email]);
        $attempt = $stmt->fetch();
        if ($attempt && $attempt['locked_until'] > time()) {
            $waitSeconds = $attempt['locked_until'] - time();
            $waitMinutes = ceil($waitSeconds / 60);
            http_response_code(429);
            echo json_encode(['success' => false, 'error' => "Conta temporariamente bloqueada. Tente novamente em {$waitMinutes} minuto(s)."]);
            exit();
        }

        $stmt = $db->prepare('SELECT id, email, senha_hash, papel, nome, whatsapp, ativo, senha_trocada FROM usuarios WHERE email = ? LIMIT 1');
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($password, $user['senha_hash'])) {
            // Registra falha de login
            $now = time();
            $currentFailures = $attempt ? (int)$attempt['failures'] : 0;
            $newFailures = $currentFailures + 1;
            $lockedUntil = $newFailures >= 5 ? $now + 900 : 0; // Bloqueia por 15 min após 5 falhas
            $db->prepare('INSERT INTO login_attempts (email, failures, last_attempt, locked_until) VALUES (?, 1, ?, ?)
                ON CONFLICT(email) DO UPDATE SET failures = ?, last_attempt = ?, locked_until = ?')
                ->execute([$email, $now, $lockedUntil, $newFailures, $now, $lockedUntil]);

            http_response_code(401);
            echo json_encode(['success' => false, 'error' => 'Email ou senha incorretos']);
            exit();
        }

        if (!$user['ativo']) {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'Conta desativada. Contate o administrador.']);
            exit();
        }

        $role = normalizeUserRole($user['email'], $user['papel']);
        if ($role !== $user['papel']) {
            $stmt = $db->prepare('UPDATE usuarios SET papel = ?, ativo = 1 WHERE id = ?');
            $stmt->execute([$role, (int)$user['id']]);
            $user['papel'] = $role;
        }

        if (session_status() === PHP_SESSION_ACTIVE) {
            session_regenerate_id(true);
        }
        $_SESSION['usuario_id'] = (int) $user['id'];
        $_SESSION['usuario_papel'] = $role;
        $_SESSION['usuario_nome'] = $user['nome'];
        $_SESSION['usuario_email'] = $user['email'];
        $_SESSION['is_admin'] = ($role === 'dono');

        // Limpa tentativas de login após sucesso
        $db->prepare('DELETE FROM login_attempts WHERE email = ?')->execute([$email]);

        echo json_encode([
            'success' => true,
            'papel' => $role,
            'nome' => $user['nome'],
            'email' => $user['email'],
            'id' => (int) $user['id'],
            'is_admin' => ($role === 'dono'),
            'senha_trocada' => (bool) $user['senha_trocada']
        ]);
        exit();

    case 'logout':
        if ($method !== 'POST') {
            http_response_code(400);
            echo json_encode(['error' => 'Uso incorreto da rota de logout']);
            exit();
        }
        $_SESSION = [];
        if (session_status() === PHP_SESSION_ACTIVE) {
            session_destroy();
        }
        echo json_encode(['success' => true]);
        exit();

    case 'check':
        $response = [
            'is_admin' => false,
            'is_seller' => isSeller(),
            'is_buyer' => isBuyer(),
            'is_logged_in' => isLoggedIn(),
            'papel' => $_SESSION['usuario_papel'] ?? null,
            'nome' => $_SESSION['usuario_nome'] ?? null,
            'id' => $_SESSION['usuario_id'] ?? null
        ];
        if (isLoggedIn()) {
            $db = getDB();
            $userId = getCurrentUserId();
            $stmt = $db->prepare('SELECT email, papel, nome, ativo FROM usuarios WHERE id = ? LIMIT 1');
            $stmt->execute([$userId]);
            $sessionUser = $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
            if (!$sessionUser || !(int)$sessionUser['ativo']) {
                $_SESSION = [];
                if (session_status() === PHP_SESSION_ACTIVE) {
                    session_destroy();
                }
                echo json_encode([
                    'is_admin' => false,
                    'is_seller' => false,
                    'is_buyer' => false,
                    'is_logged_in' => false,
                    'papel' => null,
                    'nome' => null,
                    'id' => null
                ]);
                exit();
            }
            $role = normalizeUserRole($sessionUser['email'], $sessionUser['papel']);
            if ($role !== $sessionUser['papel']) {
                $stmt = $db->prepare('UPDATE usuarios SET papel = ?, ativo = 1 WHERE id = ?');
                $stmt->execute([$role, $userId]);
            }
            $_SESSION['usuario_papel'] = $role;
            $_SESSION['usuario_nome'] = $sessionUser['nome'];
            $_SESSION['usuario_email'] = $sessionUser['email'];
            $_SESSION['is_admin'] = ($role === 'dono');
            $response['is_admin'] = ($role === 'dono');
            $response['is_seller'] = ($role === 'vendedor');
            $response['is_buyer'] = ($role === 'comprador');
            $response['papel'] = $role;
            $response['nome'] = $sessionUser['nome'];
            $response['email'] = $sessionUser['email'];
            $stmt = $db->prepare('SELECT id, status, criado_em, analisado_em FROM vendedor_solicitacoes WHERE id_usuario = ? ORDER BY id DESC LIMIT 1');
            $stmt->execute([$userId]);
            $response['seller_request'] = $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
            $stmt = $db->prepare('SELECT COALESCE(SUM(quantidade), 0) FROM carrinho WHERE id_usuario = ?');
            $stmt->execute([$userId]);
            $response['cart_count'] = (int)$stmt->fetchColumn();
            $stmt = $db->prepare('SELECT COUNT(*) FROM favoritos WHERE id_usuario = ?');
            $stmt->execute([$userId]);
            $response['favorite_count'] = (int)$stmt->fetchColumn();
        }
        echo json_encode($response);
        exit();

    case 'change-password':
        // Qualquer usuário logado pode trocar a própria senha
        if (!isLoggedIn()) {
            http_response_code(401);
            echo json_encode(['error' => 'Faça login primeiro']);
            exit();
        }
        if ($method !== 'POST' && $method !== 'PUT') {
            http_response_code(405);
            echo json_encode(['error' => 'Use POST ou PUT']);
            exit();
        }

        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $currentPassword = (string)($data['current_password'] ?? '');
        $newPassword = (string)($data['new_password'] ?? '');

        if ($currentPassword === '' || $newPassword === '') {
            http_response_code(400);
            echo json_encode(['error' => 'Senha atual e nova senha são obrigatórias']);
            exit();
        }
        if (strlen($newPassword) < 6) {
            http_response_code(400);
            echo json_encode(['error' => 'Nova senha deve ter ao menos 6 caracteres']);
            exit();
        }

        $db = getDB();
        $userId = getCurrentUserId();
        $stmt = $db->prepare('SELECT senha_hash FROM usuarios WHERE id = ? LIMIT 1');
        $stmt->execute([$userId]);
        $currentHash = $stmt->fetchColumn();

        if (!$currentHash || !password_verify($currentPassword, $currentHash)) {
            http_response_code(403);
            echo json_encode(['error' => 'Senha atual incorreta']);
            exit();
        }

        $hash = password_hash($newPassword, PASSWORD_DEFAULT);
        $stmt = $db->prepare('UPDATE usuarios SET senha_hash = ?, senha_trocada = 1 WHERE id = ?');
        $stmt->execute([$hash, $userId]);

        echo json_encode(['success' => true]);
        exit();

    case 'csrf':
        echo json_encode(['csrf_token' => generateCsrfToken()]);
        exit();

    case 'register':
        if ($method !== 'POST') {
            http_response_code(405);
            echo json_encode(['error' => 'Use POST para registrar']);
            exit();
        }
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $email = trim((string)($data['email'] ?? ''));
        $nome = trim((string)($data['nome'] ?? ''));
        $senha = (string)($data['senha'] ?? '');

        if ($email === '' || $nome === '') {
            http_response_code(400);
            echo json_encode(['error' => 'Email e nome obrigatórios']);
            exit();
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            http_response_code(400);
            echo json_encode(['error' => 'Email inválido']);
            exit();
        }

        $senhaGerada = '';
        if ($senha === '') {
            $senha = '#' . bin2hex(random_bytes(8));
            $senhaGerada = $senha;
        } elseif (strlen($senha) < 6) {
            http_response_code(400);
            echo json_encode(['error' => 'Senha deve ter ao menos 6 caracteres']);
            exit();
        }

        $db = getDB();
        $stmt = $db->prepare('SELECT id, senha_hash, senha_trocada FROM usuarios WHERE email = ? LIMIT 1');
        $stmt->execute([$email]);
        $existing = $stmt->fetch();

        $hash = password_hash($senha, PASSWORD_DEFAULT);
        $role = normalizeUserRole($email, 'comprador');

        if ($existing) {
            if ((int)$existing['senha_trocada'] === 1) {
                http_response_code(409);
                echo json_encode(['error' => 'Email já cadastrado. Faça login.']);
                exit();
            }
            // Re-registro: usuário com senha padrão nunca trocada
            $stmt = $db->prepare('UPDATE usuarios SET senha_hash = ?, nome = ?, papel = ?, ativo = 1 WHERE id = ?');
            $stmt->execute([$hash, $nome, $role, (int)$existing['id']]);
            $newId = (int)$existing['id'];
        } else {
            $stmt = $db->prepare('INSERT INTO usuarios (email, senha_hash, papel, nome, ativo, senha_trocada) VALUES (?, ?, ?, ?, 1, 0)');
            $stmt->execute([$email, $hash, $role, $nome]);
            $newId = (int)$db->lastInsertId();
        }

        // Auto-login
        session_regenerate_id(true);
        $_SESSION['usuario_id'] = $newId;
        $_SESSION['usuario_papel'] = $role;
        $_SESSION['usuario_nome'] = $nome;
        $_SESSION['usuario_email'] = $email;
        $_SESSION['is_admin'] = ($role === 'dono');

        echo json_encode([
            'success' => true,
            'id' => $newId,
            'nome' => $nome,
            'email' => $email,
            'papel' => $role,
            'is_admin' => ($role === 'dono'),
            'senha_gerada' => $senhaGerada ?: null
        ]);
        exit();

    default:
        http_response_code(400);
        echo json_encode(['error' => 'Ação inválida']);
        exit();
}
?>

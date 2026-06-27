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
                $password = $data['password'] ?? '';
            } elseif (stripos($contentType, 'application/x-www-form-urlencoded') !== false) {
                parse_str($rawBody, $parsed);
                $email = $parsed['email'] ?? '';
                $password = $parsed['password'] ?? '';
            }
        }
        if ($email === '' && isset($_POST['email'])) {
            $email = $_POST['email'];
            $password = $_POST['password'] ?? '';
        }
    }

    if ($email === '' && isset($_REQUEST['email'])) {
        $email = $_REQUEST['email'];
        $password = $_REQUEST['password'] ?? '';
    }

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
        $stmt = $db->prepare('SELECT id, email, senha_hash, papel, nome, whatsapp, ativo, senha_trocada FROM usuarios WHERE email = ? LIMIT 1');
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($password, $user['senha_hash'])) {
            http_response_code(401);
            echo json_encode(['success' => false, 'error' => 'Email ou senha incorretos']);
            exit();
        }

        if (!$user['ativo']) {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'Conta desativada. Contate o administrador.']);
            exit();
        }

        if (session_status() === PHP_SESSION_ACTIVE) {
            session_regenerate_id(true);
        }
        $_SESSION['usuario_id'] = (int) $user['id'];
        $_SESSION['usuario_papel'] = $user['papel'];
        $_SESSION['usuario_nome'] = $user['nome'];
        $_SESSION['is_admin'] = ($user['papel'] === 'dono');

        echo json_encode([
            'success' => true,
            'papel' => $user['papel'],
            'nome' => $user['nome'],
            'id' => (int) $user['id'],
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
        echo json_encode([
            'is_admin' => isAdmin(),
            'is_seller' => isSeller(),
            'is_logged_in' => isLoggedIn(),
            'papel' => $_SESSION['usuario_papel'] ?? null,
            'nome' => $_SESSION['usuario_nome'] ?? null,
            'id' => $_SESSION['usuario_id'] ?? null
        ]);
        exit();

    default:
        http_response_code(400);
        echo json_encode(['error' => 'Ação inválida']);
        exit();
}
?>

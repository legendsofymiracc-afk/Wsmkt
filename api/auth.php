<?php
require_once __DIR__ . '/routes.php';

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
$action = $_GET['action'] ?? '';

function extractPassword(string $method): string {
    $password = '';
    $rawBody = file_get_contents('php://input');
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';

    if ($method === 'POST' || $method === 'PUT' || $method === 'PATCH') {
        if ($rawBody !== false && strlen(trim($rawBody)) > 0) {
            if (stripos($contentType, 'application/json') !== false) {
                $data = json_decode($rawBody, true) ?: [];
                $password = $data['password'] ?? '';
            } elseif (stripos($contentType, 'application/x-www-form-urlencoded') !== false) {
                parse_str($rawBody, $parsed);
                $password = $parsed['password'] ?? '';
            }
        }

        if ($password === '' && isset($_POST['password'])) {
            $password = $_POST['password'];
        }
    }

    if ($password === '' && isset($_REQUEST['password'])) {
        $password = $_REQUEST['password'];
    }

    return (string) $password;
}

switch ($action) {
    case 'login':
        $password = extractPassword($method);

        if ($password === '') {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Senha não informada']);
            exit();
        }

        $storedHash = getSetting('admin_password_hash', '');
        $authOK = false;
        if ($storedHash) {
            // Verifica contra hash salvo
            $authOK = password_verify($password, $storedHash);
        } else {
            // Fallback para senha padrão em texto se hash não configurado
            $authOK = ($password === ADMIN_PASSWORD);
        }

        if ($authOK) {
            if (session_status() === PHP_SESSION_ACTIVE) {
                @session_regenerate_id(true);
            }
            $_SESSION['is_admin'] = true;
            echo json_encode(['success' => true]);
        } else {
            http_response_code(401);
            echo json_encode(['success' => false, 'error' => 'Senha incorreta']);
        }
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
        echo json_encode(['is_admin' => isAdmin()]);
        exit();

    default:
        http_response_code(400);
        echo json_encode(['error' => 'Ação inválida']);
        exit();
}
?>


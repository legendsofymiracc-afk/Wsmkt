<?php
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// chaves suportadas no app
$allowedKeys = ['corner_image_url', 'whatsapp_number']; // não inclui senha para não expor

switch ($method) {
    case 'GET':
        $config = [];
        foreach ($allowedKeys as $k) {
            $config[$k] = getSetting($k, $k === 'corner_image_url' ? DEFAULT_CORNER_IMAGE : '');
        }
        echo json_encode($config);
        break;

    case 'PUT':
    case 'POST':
        if (!isAdmin()) {
            http_response_code(401);
            echo json_encode(['error' => 'Não autorizado']);
            break;
        }

        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        foreach ($allowedKeys as $k) {
            if (array_key_exists($k, $data)) {
                setSetting($k, (string)$data[$k]);
            }
        }

        // Atualização opcional da senha do admin
        if (!empty($data['new_admin_password'])) {
            $newPass = (string)$data['new_admin_password'];
            if (strlen($newPass) < 6) {
                http_response_code(400);
                echo json_encode(['error' => 'Senha deve ter ao menos 6 caracteres']);
                break;
            }
            $hash = password_hash($newPass, PASSWORD_DEFAULT);
            // Atualizar também na tabela usuarios (nova estrutura)
            $db = getDB();
            $stmt = $db->prepare("UPDATE usuarios SET senha_hash = ?, senha_trocada = 1 WHERE papel = 'dono' LIMIT 1");
            $stmt->execute([$hash]);
            // Mantém compatibilidade com código antigo
            setSetting('admin_password_hash', $hash);
        }

        echo json_encode(['success' => true]);
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Método não permitido']);
}
?>

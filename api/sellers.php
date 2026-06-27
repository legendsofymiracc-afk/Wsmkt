<?php
require_once __DIR__ . '/routes.php';

if (!isAdmin()) {
    http_response_code(401);
    echo json_encode(['error' => 'Acesso restrito ao administrador']);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];
$db = getDB();

switch ($method) {
    case 'GET':
        $stmt = $db->query('SELECT u.id, u.email, u.nome, u.whatsapp, u.ativo, u.criado_em, (SELECT COUNT(*) FROM itens WHERE id_vendedor = u.id) AS total_itens FROM usuarios u WHERE u.papel = "vendedor" ORDER BY u.nome');
        echo json_encode($stmt->fetchAll());
        break;

    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $nome = trim((string)($data['nome'] ?? ''));
        $email = trim((string)($data['email'] ?? ''));
        $whatsapp = trim((string)($data['whatsapp'] ?? ''));
        $senha = trim((string)($data['senha'] ?? ''));

        if ($nome === '' || $email === '' || $senha === '') {
            http_response_code(400);
            echo json_encode(['error' => 'Nome, email e senha sao obrigatorios']);
            break;
        }
        if (strlen($senha) < 6) {
            http_response_code(400);
            echo json_encode(['error' => 'Senha deve ter ao menos 6 caracteres']);
            break;
        }
        // Verifica email unico
        $check = $db->prepare('SELECT COUNT(*) FROM usuarios WHERE email = ?');
        $check->execute([$email]);
        if ($check->fetchColumn() > 0) {
            http_response_code(409);
            echo json_encode(['error' => 'Email ja cadastrado']);
            break;
        }
        $hash = password_hash($senha, PASSWORD_DEFAULT);
        $stmt = $db->prepare('INSERT INTO usuarios (email, senha_hash, papel, nome, whatsapp, ativo, senha_trocada) VALUES (?, ?, "vendedor", ?, ?, 1, 0)');
        $stmt->execute([$email, $hash, $nome, $whatsapp]);
        echo json_encode(['success' => true, 'id' => (int) $db->lastInsertId()]);
        break;

    case 'PUT':
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $id = isset($data['id']) ? (int) $data['id'] : 0;
        if ($id <= 0) {
            http_response_code(400);
            echo json_encode(['error' => 'ID invalido']);
            break;
        }
        $stmt = $db->prepare('SELECT id FROM usuarios WHERE id = ? AND papel = "vendedor"');
        $stmt->execute([$id]);
        if (!$stmt->fetch()) {
            http_response_code(404);
            echo json_encode(['error' => 'Vendedor nao encontrado']);
            break;
        }
        $fields = [];
        $params = [];
        if (isset($data['nome'])) { $fields[] = 'nome = ?'; $params[] = trim((string) $data['nome']); }
        if (isset($data['email'])) {
            $newEmail = trim((string) $data['email']);
            $check = $db->prepare('SELECT COUNT(*) FROM usuarios WHERE email = ? AND id != ?');
            $check->execute([$newEmail, $id]);
            if ($check->fetchColumn() > 0) {
                http_response_code(409);
                echo json_encode(['error' => 'Email ja cadastrado']);
                break;
            }
            $fields[] = 'email = ?';
            $params[] = $newEmail;
        }
        if (isset($data['whatsapp'])) { $fields[] = 'whatsapp = ?'; $params[] = trim((string) $data['whatsapp']); }
        if (isset($data['ativo'])) { $fields[] = 'ativo = ?'; $params[] = (int) $data['ativo']; }
        if (!empty($data['nova_senha'])) {
            if (strlen($data['nova_senha']) < 6) {
                http_response_code(400);
                echo json_encode(['error' => 'Senha deve ter ao menos 6 caracteres']);
                break;
            }
            $fields[] = 'senha_hash = ?'; $params[] = password_hash($data['nova_senha'], PASSWORD_DEFAULT);
            $fields[] = 'senha_trocada = 0';
        }
        if (empty($fields)) {
            http_response_code(400);
            echo json_encode(['error' => 'Nenhum campo para atualizar']);
            break;
        }
        $params[] = $id;
        $stmt = $db->prepare('UPDATE usuarios SET ' . implode(', ', $fields) . ' WHERE id = ?');
        $stmt->execute($params);
        echo json_encode(['success' => true]);
        break;

    case 'DELETE':
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $id = isset($data['id']) ? (int) $data['id'] : 0;
        if ($id <= 0) {
            http_response_code(400);
            echo json_encode(['error' => 'ID invalido']);
            break;
        }
        $stmt = $db->prepare('DELETE FROM usuarios WHERE id = ? AND papel = "vendedor"');
        $stmt->execute([$id]);
        echo json_encode(['success' => true]);
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Metodo nao permitido']);
}

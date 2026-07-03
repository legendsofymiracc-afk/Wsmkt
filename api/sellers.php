<?php
require_once __DIR__ . '/routes.php';

$method = $_SERVER['REQUEST_METHOD'];
$db = getDB();

function readSellerBody(): array {
    return json_decode(file_get_contents('php://input'), true) ?: [];
}

function getSellerRequestForUser(PDO $db, int $userId): ?array {
    $stmt = $db->prepare('SELECT id, status, criado_em, analisado_em FROM vendedor_solicitacoes WHERE id_usuario = ? ORDER BY id DESC LIMIT 1');
    $stmt->execute([$userId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return $row ?: null;
}

function getSellerRequests(PDO $db, string $status = 'pendente'): array {
    $allowed = ['pendente', 'aprovada', 'negada', 'todas'];
    if (!in_array($status, $allowed, true)) $status = 'pendente';
    $where = $status === 'todas' ? '' : 'WHERE s.status = ?';
    $stmt = $db->prepare("SELECT s.id,
            s.id_usuario,
            s.nome_loja,
            s.whatsapp,
            s.mensagem,
            s.status,
            s.criado_em,
            s.analisado_em,
            u.nome AS usuario_nome,
            u.email AS usuario_email,
            u.papel AS usuario_papel
        FROM vendedor_solicitacoes s
        JOIN usuarios u ON u.id = s.id_usuario
        {$where}
        ORDER BY CASE s.status WHEN 'pendente' THEN 0 WHEN 'aprovada' THEN 1 ELSE 2 END, s.criado_em DESC");
    $stmt->execute($status === 'todas' ? [] : [$status]);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

// Comprador logado solicita virar vendedor. A conta continua compradora ate aprovacao.
if ($method === 'POST' && !isAdmin()) {
    if (!isLoggedIn()) {
        http_response_code(401);
        echo json_encode(['error' => 'Faça login para solicitar acesso de vendedor']);
        exit();
    }
    if (isSeller()) {
        http_response_code(409);
        echo json_encode(['error' => 'Sua conta já é de vendedor']);
        exit();
    }

    $userId = getCurrentUserId();
    $existing = getSellerRequestForUser($db, $userId);
    if ($existing && $existing['status'] === 'pendente') {
        http_response_code(409);
        echo json_encode(['error' => 'Você já possui uma solicitação pendente']);
        exit();
    }

    $data = readSellerBody();
    $nomeLoja = trim(strip_tags((string)($data['nome_loja'] ?? $data['nome'] ?? ($_SESSION['usuario_nome'] ?? ''))));
    $whatsapp = trim(strip_tags((string)($data['whatsapp'] ?? '')));
    $mensagem = trim(strip_tags((string)($data['mensagem'] ?? '')));
    if (mb_strlen($nomeLoja) > 120 || mb_strlen($whatsapp) > 40 || mb_strlen($mensagem) > 500) {
        http_response_code(400);
        echo json_encode(['error' => 'Dados muito longos']);
        exit();
    }

    $stmt = $db->prepare('INSERT INTO vendedor_solicitacoes (id_usuario, nome_loja, whatsapp, mensagem, status) VALUES (?, ?, ?, ?, "pendente")');
    $stmt->execute([$userId, $nomeLoja, $whatsapp, $mensagem]);
    logActivity($userId, 'solicitar', 'vendedor', (int)$db->lastInsertId(), $nomeLoja);
    echo json_encode([
        'success' => true,
        'message' => 'Solicitação enviada. Aguarde aprovação do administrador.',
        'request' => getSellerRequestForUser($db, $userId)
    ]);
    exit();
}

// Visitantes e usuarios comuns podem ver apenas vendedores ativos.
if (!isAdmin()) {
    if ($method === 'GET') {
        if (isset($_GET['requests'])) {
            http_response_code(403);
            echo json_encode(['error' => 'Acesso restrito ao administrador']);
            exit();
        }
        $stmt = $db->query('SELECT u.id, u.nome, u.whatsapp, u.criado_em, (SELECT COUNT(*) FROM itens WHERE id_vendedor = u.id) AS total_itens FROM usuarios u WHERE u.papel = "vendedor" AND u.ativo = 1 ORDER BY u.nome');
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        exit();
    }
    http_response_code(401);
    echo json_encode(['error' => 'Acesso restrito ao administrador']);
    exit();
}

switch ($method) {
    case 'GET':
        if (isset($_GET['requests'])) {
            $status = isset($_GET['status']) ? (string)$_GET['status'] : 'pendente';
            echo json_encode(getSellerRequests($db, $status));
            break;
        }
        $stmt = $db->query('SELECT u.id, u.email, u.nome, u.whatsapp, u.ativo, u.criado_em, (SELECT COUNT(*) FROM itens WHERE id_vendedor = u.id) AS total_itens FROM usuarios u WHERE u.papel = "vendedor" ORDER BY u.nome');
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        break;

    case 'POST':
        $data = readSellerBody();
        $nome = trim((string)($data['nome'] ?? ''));
        $email = trim((string)($data['email'] ?? ''));
        $whatsapp = trim((string)($data['whatsapp'] ?? ''));
        $senha = trim((string)($data['senha'] ?? ''));

        if ($nome === '' || $email === '') {
            http_response_code(400);
            echo json_encode(['error' => 'Nome e email são obrigatórios']);
            break;
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            http_response_code(400);
            echo json_encode(['error' => 'Formato de email inválido']);
            break;
        }
        if (strlen($senha) < 6) {
            $senha = bin2hex(random_bytes(8));
        }
        $check = $db->prepare('SELECT COUNT(*) FROM usuarios WHERE email = ?');
        $check->execute([$email]);
        if ($check->fetchColumn() > 0) {
            http_response_code(400);
            echo json_encode(['error' => 'Dados inválidos. Verifique as informações.']);
            break;
        }
        $hash = password_hash($senha, PASSWORD_DEFAULT);
        $stmt = $db->prepare('INSERT INTO usuarios (email, senha_hash, papel, nome, whatsapp, ativo, senha_trocada) VALUES (?, ?, "vendedor", ?, ?, 1, 0)');
        $stmt->execute([$email, $hash, $nome, $whatsapp]);
        $newId = (int)$db->lastInsertId();
        logActivity(getCurrentUserId(), 'criar', 'vendedor', $newId, $nome);
        echo json_encode(['success' => true, 'id' => $newId, 'senha_gerada' => $senha]);
        break;

    case 'PUT':
        $data = readSellerBody();
        $action = (string)($data['action'] ?? '');

        if (in_array($action, ['approve', 'deny'], true)) {
            $requestId = (int)($data['request_id'] ?? 0);
            if ($requestId <= 0) {
                http_response_code(400);
                echo json_encode(['error' => 'Solicitação inválida']);
                break;
            }
            $stmt = $db->prepare('SELECT s.*, u.nome AS usuario_nome FROM vendedor_solicitacoes s JOIN usuarios u ON u.id = s.id_usuario WHERE s.id = ? LIMIT 1');
            $stmt->execute([$requestId]);
            $request = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$request || $request['status'] !== 'pendente') {
                http_response_code(404);
                echo json_encode(['error' => 'Solicitação pendente não encontrada']);
                break;
            }

            $newStatus = $action === 'approve' ? 'aprovada' : 'negada';
            $db->beginTransaction();
            try {
                $stmt = $db->prepare("UPDATE vendedor_solicitacoes SET status = ?, analisado_por = ?, analisado_em = datetime('now','localtime') WHERE id = ?");
                $stmt->execute([$newStatus, getCurrentUserId(), $requestId]);
                if ($action === 'approve') {
                    $stmt = $db->prepare('UPDATE usuarios SET papel = "vendedor", whatsapp = CASE WHEN ? != "" THEN ? ELSE whatsapp END, ativo = 1 WHERE id = ?');
                    $stmt->execute([(string)$request['whatsapp'], (string)$request['whatsapp'], (int)$request['id_usuario']]);
                }
                $db->commit();
            } catch (Throwable $e) {
                if ($db->inTransaction()) $db->rollBack();
                http_response_code(500);
                echo json_encode(['error' => 'Erro ao analisar solicitação']);
                break;
            }
            logActivity(getCurrentUserId(), $action === 'approve' ? 'aprovar' : 'negar', 'vendedor_solicitacao', $requestId, (string)$request['usuario_nome']);
            echo json_encode(['success' => true, 'status' => $newStatus]);
            break;
        }

        $id = isset($data['id']) ? (int)$data['id'] : 0;
        if ($id <= 0) {
            http_response_code(400);
            echo json_encode(['error' => 'ID invalido']);
            break;
        }
        $stmt = $db->prepare('SELECT id FROM usuarios WHERE id = ? AND papel = "vendedor"');
        $stmt->execute([$id]);
        if (!$stmt->fetch()) {
            http_response_code(404);
            echo json_encode(['error' => 'Vendedor não encontrado']);
            break;
        }
        $fields = [];
        $params = [];
        if (isset($data['nome'])) { $fields[] = 'nome = ?'; $params[] = trim((string)$data['nome']); }
        if (isset($data['email'])) {
            $newEmail = trim((string)$data['email']);
            if (!filter_var($newEmail, FILTER_VALIDATE_EMAIL)) {
                http_response_code(400);
                echo json_encode(['error' => 'Formato de email invalido']);
                break;
            }
            $check = $db->prepare('SELECT COUNT(*) FROM usuarios WHERE email = ? AND id != ?');
            $check->execute([$newEmail, $id]);
            if ($check->fetchColumn() > 0) {
                http_response_code(400);
                echo json_encode(['error' => 'Dados inválidos. Verifique as informações.']);
                break;
            }
            $fields[] = 'email = ?';
            $params[] = $newEmail;
        }
        if (isset($data['whatsapp'])) { $fields[] = 'whatsapp = ?'; $params[] = trim((string)$data['whatsapp']); }
        if (isset($data['ativo'])) { $fields[] = 'ativo = ?'; $params[] = (int)$data['ativo']; }
        if (!empty($data['nova_senha'])) {
            if (strlen($data['nova_senha']) < 6) {
                http_response_code(400);
                echo json_encode(['error' => 'Senha deve ter ao menos 6 caracteres']);
                break;
            }
            $fields[] = 'senha_hash = ?';
            $params[] = password_hash($data['nova_senha'], PASSWORD_DEFAULT);
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
        logActivity(getCurrentUserId(), 'editar', 'vendedor', $id, '');
        echo json_encode(['success' => true]);
        break;

    case 'DELETE':
        $data = readSellerBody();
        $id = isset($data['id']) ? (int)$data['id'] : 0;
        if ($id <= 0) {
            http_response_code(400);
            echo json_encode(['error' => 'ID invalido']);
            break;
        }
        $stmt = $db->prepare('UPDATE itens SET id_vendedor = NULL WHERE id_vendedor = ?');
        $stmt->execute([$id]);
        $stmt = $db->prepare('DELETE FROM usuarios WHERE id = ? AND papel = "vendedor"');
        $stmt->execute([$id]);
        logActivity(getCurrentUserId(), 'excluir', 'vendedor', $id, '');
        echo json_encode(['success' => true]);
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Método não permitido']);
}

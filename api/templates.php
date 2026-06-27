<?php
require_once __DIR__ . '/routes.php';

$method = $_SERVER['REQUEST_METHOD'];
$db = getDB();

switch ($method) {
    case 'GET':
        $search = isset($_GET['search']) ? trim($_GET['search']) : '';
        $limit = isset($_GET['limit']) ? min((int)$_GET['limit'], 50) : 20;

        if (strlen($search) >= 2) {
            // Busca por nome (ILIKE nao existe no SQLite, usar LIKE case-insensitive via COLLATE)
            $stmt = $db->prepare('SELECT * FROM templates WHERE nome LIKE ? COLLATE NOCASE ORDER BY nome LIMIT ?');
            $stmt->execute(['%' . $search . '%', $limit]);
        } elseif (!empty($search) && strlen($search) === 1) {
            // 1 caractere: retorna vazio para evitar excesso de resultados
            echo json_encode([]);
            exit;
        } else {
            $stmt = $db->query('SELECT * FROM templates ORDER BY nome LIMIT ' . $limit);
        }
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        break;

    case 'POST':
        if (!isAdmin()) {
            http_response_code(401);
            echo json_encode(['error' => 'Acesso negado']);
            exit;
        }
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $stmt = $db->prepare('INSERT INTO templates (nome, item_id, categoria, subcategoria, imagem_url, atributos, nivel_min, nivel_max, profissao, rarity, origem) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([
            $data['nome'] ?? '',
            (int)($data['item_id'] ?? 0),
            $data['categoria'] ?? '',
            $data['subcategoria'] ?? '',
            $data['imagem_url'] ?? '',
            is_string($data['atributos'] ?? '{}') ? ($data['atributos'] ?? '{}') : json_encode($data['atributos'] ?? []),
            (int)($data['nivel_min'] ?? 0),
            (int)($data['nivel_max'] ?? 0),
            $data['profissao'] ?? '',
            $data['rarity'] ?? '',
            $data['origem'] ?? ''
        ]);
        echo json_encode(['success' => true, 'id' => (int)$db->lastInsertId()]);
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Método não permitido']);
}

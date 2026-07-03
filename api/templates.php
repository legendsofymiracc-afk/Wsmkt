<?php
require_once __DIR__ . '/routes.php';
require_once __DIR__ . '/skin_image_resolver.php';

$method = $_SERVER['REQUEST_METHOD'];
$db = getDB();

switch ($method) {
    case 'GET':
        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
        $search = isset($_GET['search']) ? trim($_GET['search']) : '';
        $limit = isset($_GET['limit']) ? max(1, min((int)$_GET['limit'], 50)) : 20;

        // Detalhe de um template específico
        if ($id > 0) {
            $stmt = $db->prepare('SELECT * FROM templates WHERE id = ?');
            $stmt->execute([$id]);
            $template = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($template) {
                $template = applySkinImageToTemplateRow($template);
                $template['atributos'] = json_decode($template['atributos'] ?: '{}', true);
            }
            echo json_encode($template ?: null);
            break;
        }

        if (strlen($search) >= 2) {
            $stmt = $db->prepare('
                SELECT *
                FROM templates
                WHERE nome LIKE ? COLLATE NOCASE
                ORDER BY
                    CASE
                        WHEN nome = ? COLLATE NOCASE THEN 0
                        WHEN nome LIKE ? COLLATE NOCASE THEN 1
                        WHEN categoria LIKE ? COLLATE NOCASE THEN 2
                        ELSE 3
                    END,
                    nome
                LIMIT ?
            ');
            $stmt->execute(['%' . $search . '%', $search, $search . '%', '%Trajes%', $limit]);
        } elseif (!empty($search) && strlen($search) === 1) {
            echo json_encode([]);
            exit;
        } else {
            $stmt = $db->query('SELECT * FROM templates ORDER BY nome LIMIT ' . $limit);
        }
        $rows = array_map('applySkinImageToTemplateRow', $stmt->fetchAll(PDO::FETCH_ASSOC));
        echo json_encode($rows);
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

<?php
require_once __DIR__ . '/routes.php';

$method = $_SERVER['REQUEST_METHOD'];
$db = getDB();

switch ($method) {
    case 'GET':
        if (isset($_GET['seller'])) {
            if (!isSeller() && !isAdmin()) {
                http_response_code(403);
                echo json_encode(['error' => 'Acesso restrito ao vendedor']);
                break;
            }
            $sellerId = isAdmin() && isset($_GET['seller_id']) ? (int)$_GET['seller_id'] : getCurrentUserId();
            if ($sellerId <= 0) {
                http_response_code(400);
                echo json_encode(['error' => 'Vendedor inválido']);
                break;
            }
            $stmt = $db->prepare('SELECT AVG(a.estrelas) as media, COUNT(*) as total
                FROM avaliacoes a
                JOIN itens i ON i.id = a.id_item
                WHERE i.id_vendedor = ?');
            $stmt->execute([$sellerId]);
            $stats = $stmt->fetch(PDO::FETCH_ASSOC);

            $stmt = $db->prepare('SELECT a.id, a.id_item, a.estrelas, a.comentario, a.comprou, a.criado_em,
                    u.nome as usuario_nome,
                    i.nome as item_nome
                FROM avaliacoes a
                JOIN usuarios u ON u.id = a.id_usuario
                JOIN itens i ON i.id = a.id_item
                WHERE i.id_vendedor = ?
                ORDER BY a.criado_em DESC
                LIMIT 100');
            $stmt->execute([$sellerId]);
            echo json_encode([
                'media' => round((float)($stats['media'] ?? 0), 1),
                'total' => (int)($stats['total'] ?? 0),
                'reviews' => $stmt->fetchAll(PDO::FETCH_ASSOC)
            ]);
            break;
        }

        $itemId = isset($_GET['item_id']) ? (int)$_GET['item_id'] : 0;
        if ($itemId <= 0) {
            http_response_code(400);
            echo json_encode(['error' => 'ID do item obrigatório']);
            break;
        }
        // Média de estrelas + lista de avaliações
        $stmt = $db->prepare('SELECT AVG(estrelas) as media, COUNT(*) as total FROM avaliacoes WHERE id_item = ?');
        $stmt->execute([$itemId]);
        $stats = $stmt->fetch(PDO::FETCH_ASSOC);

        $stmt = $db->prepare('SELECT a.id, a.estrelas, a.comentario, a.comprou, a.criado_em, u.nome as usuario_nome
            FROM avaliacoes a JOIN usuarios u ON u.id = a.id_usuario
            WHERE a.id_item = ? ORDER BY a.criado_em DESC LIMIT 50');
        $stmt->execute([$itemId]);
        $reviews = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(['media' => round((float)($stats['media'] ?? 0), 1), 'total' => (int)($stats['total'] ?? 0), 'reviews' => $reviews]);
        break;

    case 'POST':
        if (!isLoggedIn()) { http_response_code(401); echo json_encode(['error' => 'Faça login para avaliar']); break; }
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $itemId = (int)($data['item_id'] ?? 0);
        $estrelas = (int)($data['estrelas'] ?? 0);
        $comentario = trim(strip_tags((string)($data['comentario'] ?? '')));
        $comprou = !empty($data['comprou']) ? 1 : 0;

        if ($itemId <= 0 || $estrelas < 1 || $estrelas > 5) {
            http_response_code(400); echo json_encode(['error' => 'Dados inválidos']); break;
        }
        $userId = getCurrentUserId();

        // Um usuário só pode ter uma avaliação por item
        $check = $db->prepare('SELECT id FROM avaliacoes WHERE id_item = ? AND id_usuario = ?');
        $check->execute([$itemId, $userId]);
        if ($check->fetch()) {
            http_response_code(409); echo json_encode(['error' => 'Você já avaliou este item']); break;
        }

        $stmt = $db->prepare('INSERT INTO avaliacoes (id_item, id_usuario, estrelas, comentario, comprou) VALUES (?, ?, ?, ?, ?)');
        $stmt->execute([$itemId, $userId, $estrelas, $comentario, $comprou]);

        echo json_encode(['success' => true, 'id' => (int)$db->lastInsertId()]);
        break;

    default:
        http_response_code(405); echo json_encode(['error' => 'Método não permitido']);
}

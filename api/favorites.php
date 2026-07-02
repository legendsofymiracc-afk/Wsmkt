<?php
require_once __DIR__ . '/routes.php';
require_once __DIR__ . '/skin_image_resolver.php';

if (!isLoggedIn()) {
    http_response_code(401);
    echo json_encode(['error' => 'Faça login para usar favoritos']);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];
$db = getDB();
$userId = getCurrentUserId();

function readFavoriteBody(): array {
    return json_decode(file_get_contents('php://input'), true) ?: [];
}

function getFavoriteSummary(PDO $db, int $userId): array {
    $stmt = $db->prepare('SELECT f.id AS favorite_id,
            i.id,
            i.id_subcategoria,
            i.id_categoria,
            i.id_geral,
            i.id_template,
            i.id_vendedor,
            i.nome,
            i.descricao,
            i.servidor,
            i.preco_moedas,
            i.preco_reais,
            i.quantidade_disponivel,
            i.imagem_url,
            v.nome AS nome_vendedor,
            v.whatsapp AS vendedor_whatsapp,
            t.imagem_url AS template_imagem,
            t.item_id AS template_item_id,
            t.nome AS template_nome,
            t.categoria AS template_categoria,
            t.subcategoria AS template_subcategoria,
            t.atributos AS template_atributos,
            t.atributos_detalhes AS template_atributos_raw,
            sub.nome AS subcategoria_nome,
            COALESCE(cat_explicit.id, cat_from_sub.id) AS categoria_id,
            COALESCE(cat_explicit.nome, cat_from_sub.nome) AS categoria_nome,
            COALESCE(geral_explicit.id, geral_from_cat.id, geral_from_sub.id) AS geral_id,
            COALESCE(geral_explicit.nome, geral_from_cat.nome, geral_from_sub.nome) AS geral_nome
        FROM favoritos f
        JOIN itens i ON i.id = f.id_item
        LEFT JOIN categorias sub ON sub.id = i.id_subcategoria
        LEFT JOIN categorias cat_from_sub ON cat_from_sub.id = sub.id_pai
        LEFT JOIN categorias geral_from_sub ON geral_from_sub.id = cat_from_sub.id_pai
        LEFT JOIN categorias cat_explicit ON cat_explicit.id = i.id_categoria
        LEFT JOIN categorias geral_from_cat ON geral_from_cat.id = cat_explicit.id_pai
        LEFT JOIN categorias geral_explicit ON geral_explicit.id = i.id_geral
        LEFT JOIN usuarios v ON v.id = i.id_vendedor
        LEFT JOIN templates t ON t.id = i.id_template
        WHERE f.id_usuario = ?
        ORDER BY f.criado_em DESC');
    $stmt->execute([$userId]);
    $items = array_map('applySkinImageToItemRow', $stmt->fetchAll(PDO::FETCH_ASSOC));
    $ids = array_map(static function($item) { return (int)$item['id']; }, $items);
    return ['ids' => $ids, 'items' => $items, 'count' => count($items)];
}

switch ($method) {
    case 'GET':
        echo json_encode(getFavoriteSummary($db, $userId));
        break;

    case 'POST':
        $data = readFavoriteBody();
        $ids = [];
        if (!empty($data['item_ids']) && is_array($data['item_ids'])) {
            $ids = array_map('intval', $data['item_ids']);
        } elseif (!empty($data['item_id'])) {
            $ids = [(int)$data['item_id']];
        }
        $ids = array_values(array_unique(array_filter($ids, static function($id) { return $id > 0; })));
        if (!$ids) {
            http_response_code(400);
            echo json_encode(['error' => 'ID inválido']);
            break;
        }

        $insert = $db->prepare('INSERT OR IGNORE INTO favoritos (id_usuario, id_item) SELECT ?, ? WHERE EXISTS (SELECT 1 FROM itens WHERE id = ?)');
        foreach ($ids as $itemId) {
            $insert->execute([$userId, $itemId, $itemId]);
        }
        echo json_encode(['success' => true] + getFavoriteSummary($db, $userId));
        break;

    case 'DELETE':
        $data = readFavoriteBody();
        $itemId = (int)($data['item_id'] ?? 0);
        if ($itemId <= 0) {
            http_response_code(400);
            echo json_encode(['error' => 'ID inválido']);
            break;
        }
        $stmt = $db->prepare('DELETE FROM favoritos WHERE id_usuario = ? AND id_item = ?');
        $stmt->execute([$userId, $itemId]);
        echo json_encode(['success' => true] + getFavoriteSummary($db, $userId));
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Método não permitido']);
}

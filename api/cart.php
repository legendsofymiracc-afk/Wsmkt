<?php
require_once __DIR__ . '/routes.php';
require_once __DIR__ . '/skin_image_resolver.php';

if (!isLoggedIn()) {
    http_response_code(401);
    echo json_encode(['error' => 'Faça login para usar o carrinho']);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];
$db = getDB();
$userId = getCurrentUserId();

function getCartSummary(PDO $db, int $userId): array {
    $stmt = $db->prepare('SELECT c.id AS cart_id,
            c.quantidade AS quantidade,
            c.quantidade AS cart_quantity,
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
            t.atributos_detalhes AS template_atributos_raw
        FROM carrinho c
        JOIN itens i ON i.id = c.id_item
        LEFT JOIN usuarios v ON v.id = i.id_vendedor
        LEFT JOIN templates t ON t.id = i.id_template
        WHERE c.id_usuario = ?
        ORDER BY c.criado_em DESC');
    $stmt->execute([$userId]);
    $items = array_map('applySkinImageToItemRow', $stmt->fetchAll(PDO::FETCH_ASSOC));
    $totalCoins = 0;
    $totalBRL = 0.0;
    $count = 0;
    foreach ($items as $item) {
        $qty = max(1, (int)($item['quantidade'] ?? 1));
        $count += $qty;
        $totalCoins += ((int)($item['preco_moedas'] ?? 0)) * $qty;
        $totalBRL += ((float)($item['preco_reais'] ?? 0)) * $qty;
    }
    return [
        'items' => $items,
        'total_price' => $totalCoins,
        'total_coins' => $totalCoins,
        'total_brl' => $totalBRL,
        'count' => $count
    ];
}

function fetchCartItem(PDO $db, int $userId, int $itemId): ?array {
    $stmt = $db->prepare('SELECT c.id, c.quantidade FROM carrinho c WHERE c.id_usuario = ? AND c.id_item = ? LIMIT 1');
    $stmt->execute([$userId, $itemId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return $row ?: null;
}

function fetchStoreItem(PDO $db, int $itemId): ?array {
    $stmt = $db->prepare('SELECT id, quantidade_disponivel FROM itens WHERE id = ? LIMIT 1');
    $stmt->execute([$itemId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return $row ?: null;
}

function readJsonBody(): array {
    return json_decode(file_get_contents('php://input'), true) ?: [];
}

switch ($method) {
    case 'GET':
        echo json_encode(getCartSummary($db, $userId));
        break;

    case 'POST':
        $data = readJsonBody();
        $itemId = (int)($data['item_id'] ?? 0);
        $qty = max(1, min(99, (int)($data['quantidade'] ?? $data['quantity'] ?? 1)));
        if ($itemId <= 0) {
            http_response_code(400);
            echo json_encode(['error' => 'ID inválido']);
            break;
        }

        $item = fetchStoreItem($db, $itemId);
        if (!$item) {
            http_response_code(404);
            echo json_encode(['error' => 'Item não encontrado']);
            break;
        }
        $stock = (int)($item['quantidade_disponivel'] ?? 0);
        if ($stock <= 0) {
            http_response_code(400);
            echo json_encode(['error' => 'Item sem estoque']);
            break;
        }

        $existing = fetchCartItem($db, $userId, $itemId);
        $nextQty = min($stock, ($existing ? (int)$existing['quantidade'] : 0) + $qty);
        if ($existing) {
            $stmt = $db->prepare('UPDATE carrinho SET quantidade = ? WHERE id_usuario = ? AND id_item = ?');
            $stmt->execute([$nextQty, $userId, $itemId]);
        } else {
            $stmt = $db->prepare('INSERT INTO carrinho (id_usuario, id_item, quantidade) VALUES (?, ?, ?)');
            $stmt->execute([$userId, $itemId, $nextQty]);
        }

        echo json_encode(['success' => true] + getCartSummary($db, $userId));
        break;

    case 'PUT':
        $data = readJsonBody();
        $cartId = (int)($data['cart_id'] ?? $data['id'] ?? 0);
        $itemId = (int)($data['item_id'] ?? 0);
        $qty = (int)($data['quantidade'] ?? $data['quantity'] ?? 1);

        if ($cartId <= 0 && $itemId <= 0) {
            http_response_code(400);
            echo json_encode(['error' => 'ID inválido']);
            break;
        }

        if ($cartId > 0) {
            $stmt = $db->prepare('SELECT id_item FROM carrinho WHERE id_usuario = ? AND id = ? LIMIT 1');
            $stmt->execute([$userId, $cartId]);
            $itemId = (int)$stmt->fetchColumn();
        }
        if ($itemId <= 0) {
            http_response_code(404);
            echo json_encode(['error' => 'Item não encontrado no carrinho']);
            break;
        }
        if ($qty <= 0) {
            $stmt = $db->prepare('DELETE FROM carrinho WHERE id_usuario = ? AND id_item = ?');
            $stmt->execute([$userId, $itemId]);
            echo json_encode(['success' => true] + getCartSummary($db, $userId));
            break;
        }

        $item = fetchStoreItem($db, $itemId);
        if (!$item) {
            http_response_code(404);
            echo json_encode(['error' => 'Item não encontrado']);
            break;
        }
        $stock = (int)($item['quantidade_disponivel'] ?? 0);
        if ($stock <= 0) {
            http_response_code(400);
            echo json_encode(['error' => 'Item sem estoque']);
            break;
        }
        $nextQty = min($stock, max(1, min(99, $qty)));
        $stmt = $db->prepare('UPDATE carrinho SET quantidade = ? WHERE id_usuario = ? AND id_item = ?');
        $stmt->execute([$nextQty, $userId, $itemId]);
        echo json_encode(['success' => true] + getCartSummary($db, $userId));
        break;

    case 'DELETE':
        $data = readJsonBody();
        $cartId = (int)($data['cart_id'] ?? ($data['id'] ?? 0));
        $itemId = (int)($data['item_id'] ?? 0);
        if ($cartId > 0) {
            $stmt = $db->prepare('DELETE FROM carrinho WHERE id_usuario = ? AND id = ?');
            $stmt->execute([$userId, $cartId]);
        } elseif ($itemId > 0) {
            $stmt = $db->prepare('DELETE FROM carrinho WHERE id_usuario = ? AND id_item = ?');
            $stmt->execute([$userId, $itemId]);
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'ID inválido']);
            break;
        }
        echo json_encode(['success' => true] + getCartSummary($db, $userId));
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Método não permitido']);
}

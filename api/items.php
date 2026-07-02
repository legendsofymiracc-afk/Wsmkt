<?php
require_once __DIR__ . '/routes.php';
require_once __DIR__ . '/skin_image_resolver.php';

$method = $_SERVER['REQUEST_METHOD'];
$db = getDB();

function fetchItemsWithRelations(PDO $db, ?string $where = '', array $params = [], int $limit = 0, int $offset = 0): array {
    $sql = 'SELECT
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
                t.atributos AS template_atributos,
                t.atributos_detalhes AS template_atributos_raw,
                t.imagem_url AS template_imagem,
                t.item_id AS template_item_id,
                t.nome AS template_nome,
                t.categoria AS template_categoria,
                t.subcategoria AS template_subcategoria,
                sub.nome AS subcategoria_nome,
                COALESCE(cat_explicit.id, cat_from_sub.id) AS categoria_id,
                COALESCE(cat_explicit.nome, cat_from_sub.nome) AS categoria_nome,
                COALESCE(geral_explicit.id, geral_from_cat.id, geral_from_sub.id) AS geral_id,
                COALESCE(geral_explicit.nome, geral_from_cat.nome, geral_from_sub.nome) AS geral_nome
            FROM itens i
            LEFT JOIN categorias sub ON sub.id = i.id_subcategoria
            LEFT JOIN categorias cat_from_sub ON cat_from_sub.id = sub.id_pai
            LEFT JOIN categorias geral_from_sub ON geral_from_sub.id = cat_from_sub.id_pai
            LEFT JOIN categorias cat_explicit ON cat_explicit.id = i.id_categoria
            LEFT JOIN categorias geral_from_cat ON geral_from_cat.id = cat_explicit.id_pai
            LEFT JOIN categorias geral_explicit ON geral_explicit.id = i.id_geral
            LEFT JOIN usuarios v ON v.id = i.id_vendedor
            LEFT JOIN templates t ON t.id = i.id_template';

    if ($where !== null && $where !== '') {
        $sql .= ' WHERE ' . $where;
    }

    $sql .= ' ORDER BY i.id ASC';

    if ($limit > 0) {
        $sql .= ' LIMIT ' . $limit;
        if ($offset > 0) {
            $sql .= ' OFFSET ' . $offset;
        }
    }

    $stmt = $db->prepare($sql);
    foreach ($params as $i => $param) {
        if (is_int($param)) {
            $stmt->bindValue($i + 1, $param, PDO::PARAM_INT);
        } else {
            $stmt->bindValue($i + 1, $param, PDO::PARAM_STR);
        }
    }
    $stmt->execute();
    return array_map('applySkinImageToItemRow', $stmt->fetchAll());
}

/**
 * Sanitiza e valida campos de texto de um item.
 * Retorna array [campos, erro] — erro é string ou null se válido.
 */
function sanitizeItemInput(array $data): array {
    $MAX_NOME = 200;
    $MAX_DESCRICAO = 5000;
    $MAX_SERVIDOR = 100;
    $MAX_IMAGEM_URL = 500;

    $nome = trim(strip_tags((string)($data['nome'] ?? '')));
    $descricao = trim(strip_tags((string)($data['descricao'] ?? '')));
    $servidor = trim(strip_tags((string)($data['servidor'] ?? '')));
    $imagemUrl = trim((string)($data['imagem_url'] ?? ''));

    if ($nome === '') {
        return [null, 'Nome do item é obrigatório'];
    }
    if (mb_strlen($nome) > $MAX_NOME) {
        return [null, "Nome deve ter no máximo {$MAX_NOME} caracteres"];
    }
    if (mb_strlen($descricao) > $MAX_DESCRICAO) {
        return [null, "Descrição deve ter no máximo {$MAX_DESCRICAO} caracteres"];
    }
    if (mb_strlen($servidor) > $MAX_SERVIDOR) {
        return [null, "Servidor deve ter no máximo {$MAX_SERVIDOR} caracteres"];
    }
    if (mb_strlen($imagemUrl) > $MAX_IMAGEM_URL) {
        return [null, "URL da imagem muito longa"];
    }

    return [[
        'nome' => $nome,
        'descricao' => $descricao,
        'servidor' => $servidor,
        'imagem_url' => $imagemUrl,
        'preco_moedas' => isset($data['preco_moedas']) ? (int)$data['preco_moedas'] : 0,
        'preco_reais' => isset($data['preco_reais']) ? (float)$data['preco_reais'] : 0,
        'quantidade_disponivel' => isset($data['quantidade_disponivel']) ? (int)$data['quantidade_disponivel'] : 0,
    ], null];
}

function normalizeNameForCompare(string $value): string {
    $value = mb_strtolower(trim($value), 'UTF-8');
    $converted = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value);
    return $converted !== false ? $converted : $value;
}

function categoryIdsFromNode(PDO $db, int $nodeId): array {
    $stmt = $db->prepare('SELECT id, id_pai, nivel FROM categorias WHERE id = ?');
    $stmt->execute([$nodeId]);
    $node = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$node) return ['id_geral' => null, 'id_categoria' => null, 'id_subcategoria' => null];

    $id = (int)$node['id'];
    $parentId = (int)$node['id_pai'];
    $level = (int)$node['nivel'];
    if ($level <= 1) return ['id_geral' => $id, 'id_categoria' => null, 'id_subcategoria' => null];

    $parentStmt = $db->prepare('SELECT id, id_pai, nivel FROM categorias WHERE id = ?');
    $parentStmt->execute([$parentId]);
    $parent = $parentStmt->fetch(PDO::FETCH_ASSOC);
    if ($level === 2) {
        return ['id_geral' => $parent ? (int)$parent['id'] : null, 'id_categoria' => $id, 'id_subcategoria' => null];
    }

    $grandId = $parent ? (int)$parent['id_pai'] : 0;
    return ['id_geral' => $grandId ?: null, 'id_categoria' => $parent ? (int)$parent['id'] : null, 'id_subcategoria' => $id];
}

function findCategoryNodeForTemplate(PDO $db, string $categoria, string $subcategoria): ?int {
    $cat = normalizeNameForCompare($categoria);
    $sub = normalizeNameForCompare($subcategoria);

    if ($sub !== '') {
        $stmt = $db->query('
            SELECT child.id, child.nome, parent.nome parent_nome, child.nivel
            FROM categorias child
            JOIN categorias parent ON parent.id = child.id_pai
            ORDER BY child.nivel DESC, child.id ASC
        ');
        foreach ($stmt as $row) {
            if (normalizeNameForCompare((string)$row['nome']) === $sub && normalizeNameForCompare((string)$row['parent_nome']) === $cat) {
                return (int)$row['id'];
            }
        }

        $stmt = $db->query('SELECT id, nome, nivel FROM categorias ORDER BY nivel DESC, id ASC');
        foreach ($stmt as $row) {
            if (normalizeNameForCompare((string)$row['nome']) === $sub) return (int)$row['id'];
        }
    }

    if ($cat !== '') {
        $stmt = $db->query('SELECT id, nome, nivel FROM categorias ORDER BY nivel ASC, id ASC');
        foreach ($stmt as $row) {
            if (normalizeNameForCompare((string)$row['nome']) === $cat) return (int)$row['id'];
        }
    }

    return null;
}

function templateAutoFields(PDO $db, int $templateId): ?array {
    if ($templateId <= 0) return null;
    $stmt = $db->prepare('SELECT nome, item_id, categoria, subcategoria, imagem_url, atributos, atributos_detalhes FROM templates WHERE id = ?');
    $stmt->execute([$templateId]);
    $template = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$template) return null;
    $template = applySkinImageToTemplateRow($template);

    $nodeId = findCategoryNodeForTemplate($db, (string)$template['categoria'], (string)$template['subcategoria']);
    if (!$nodeId) return null;

    return array_merge(categoryIdsFromNode($db, $nodeId), [
        'nome' => (string)$template['nome'],
        'imagem_url' => (string)$template['imagem_url'],
    ]);
}

// Helper: adiciona filtro de servidor ao WHERE
$appendServerFilter = function(string $w, array &$p) use (&$serverFilter): string {
    if (!empty($serverFilter)) {
        $w = ($w !== '' ? "($w) AND " : '') . 'i.servidor = ?';
        $p[] = $serverFilter;
    }
    return $w;
};

// Helper: executa contagem e query paginada
$fetchPaged = function(PDO $db, string $where, array $params, int $perPage, int $page) {
    $countSql = 'SELECT COUNT(*)
        FROM itens i
        LEFT JOIN categorias sub ON sub.id = i.id_subcategoria
        LEFT JOIN categorias cat_from_sub ON cat_from_sub.id = sub.id_pai
        LEFT JOIN categorias geral_from_sub ON geral_from_sub.id = cat_from_sub.id_pai
        LEFT JOIN categorias cat_explicit ON cat_explicit.id = i.id_categoria
        LEFT JOIN categorias geral_from_cat ON geral_from_cat.id = cat_explicit.id_pai
        LEFT JOIN categorias geral_explicit ON geral_explicit.id = i.id_geral';
    $cnt = $db->prepare($countSql . ($where !== '' ? ' WHERE ' . $where : ''));
    foreach ($params as $i => $p) { $cnt->bindValue($i + 1, $p, is_int($p) ? PDO::PARAM_INT : PDO::PARAM_STR); }
    $cnt->execute();
    $total = (int) $cnt->fetchColumn();
    $items = fetchItemsWithRelations($db, $where !== '' ? $where : null, $params, $perPage, ($page - 1) * $perPage);
    return ['items' => $items, 'total' => $total, 'page' => $page, 'per_page' => $perPage];
};

switch ($method) {
    case 'GET':
        $subcategoryId = isset($_GET['subcategory_id']) ? (int) $_GET['subcategory_id'] : 0;
        $categoryId = isset($_GET['category_id']) ? (int) $_GET['category_id'] : 0;
        $generalId = isset($_GET['general_id']) ? (int) $_GET['general_id'] : 0;
        $itemId = isset($_GET['id']) ? (int) $_GET['id'] : 0;
        $sellerFilter = isset($_GET['seller_id']) ? (int) $_GET['seller_id'] : 0;
        $searchTerm = isset($_GET['search']) ? trim($_GET['search']) : '';
        $serverFilter = isset($_GET['servidor']) ? trim($_GET['servidor']) : '';
        $page = isset($_GET['page']) ? max(1, (int) $_GET['page']) : 0;
        $perPage = isset($_GET['per_page']) ? min(100, max(1, (int) $_GET['per_page'])) : 0;
        $returnPaged = ($page > 0 && $perPage > 0);

        // Busca textual (com ou sem paginacao)
        if ($searchTerm !== '' && strlen($searchTerm) >= 2) {
            $where = 'i.nome LIKE ?';
            $params = ['%' . $searchTerm . '%'];
            $where = $appendServerFilter($where, $params);
            if ($returnPaged) {
                echo json_encode($fetchPaged($db, $where, $params, $perPage, $page));
            } else {
                $items = fetchItemsWithRelations($db, $where, $params, 100);
                echo json_encode($items);
            }
            break;
        }

        // Filtro por vendedor (sem paginacao)
        if ($sellerFilter > 0) {
            $items = fetchItemsWithRelations($db, 'i.id_vendedor = ?', [$sellerFilter]);
            echo json_encode($items);
            break;
        }

        // Item unico
        if ($itemId > 0) {
            $items = fetchItemsWithRelations($db, 'i.id = ?', [$itemId]);
            echo json_encode($items ? $items[0] : null);
            break;
        }

        // Categorias
        $where = '';
        $params = [];
        if ($subcategoryId > 0) {
            $where = 'i.id_subcategoria = ?'; $params = [$subcategoryId];
        } elseif ($categoryId > 0) {
            $where = 'COALESCE(cat_explicit.id, cat_from_sub.id) = ?'; $params = [$categoryId];
        } elseif ($generalId > 0) {
            $where = 'i.id_geral = ? OR COALESCE(geral_from_cat.id, geral_from_sub.id) = ?'; $params = [$generalId, $generalId];
        }
        $where = $appendServerFilter($where, $params);

        if ($returnPaged) {
            echo json_encode($fetchPaged($db, $where, $params, $perPage, $page));
        } else {
            $items = fetchItemsWithRelations($db, $where !== '' ? $where : null, $params);
            echo json_encode($items);
        }
        break;

    case 'POST':
        if (!isAdmin() && !isSeller()) {
            http_response_code(401);
            echo json_encode(['error' => 'Não autorizado']);
            exit();
        }

        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        if (isSeller() && !isAdmin()) {
            $data['id_vendedor'] = getCurrentUserId();
        }

        [$clean, $err] = sanitizeItemInput($data);
        if ($err !== null) {
            http_response_code(400);
            echo json_encode(['error' => $err]);
            exit();
        }

        $idSub = !empty($data['id_subcategoria']) ? (int)$data['id_subcategoria'] : null;
        $idCat = !empty($data['id_categoria']) ? (int)$data['id_categoria'] : null;
        $idGer = !empty($data['id_geral']) ? (int)$data['id_geral'] : null;
        $idTemplate = !empty($data['id_template']) ? (int)$data['id_template'] : null;
        $auto = $idTemplate ? templateAutoFields($db, $idTemplate) : null;
        if ($auto) {
            $idGer = $auto['id_geral'];
            $idCat = $auto['id_categoria'];
            $idSub = $auto['id_subcategoria'];
            $clean['nome'] = $auto['nome'];
            if ($clean['imagem_url'] === '') $clean['imagem_url'] = $auto['imagem_url'];
        }

        if ($idSub) { $idCat = null; $idGer = null; }
        elseif ($idCat) { $idGer = null; }
        elseif (!$idGer) {
            http_response_code(400);
            echo json_encode(['error' => 'É necessário informar pelo menos um id (geral, categoria ou subcategoria).']);
            exit();
        }

        $stmt = $db->prepare('INSERT INTO itens (id_subcategoria, id_categoria, id_geral, nome, descricao, servidor, preco_moedas, preco_reais, quantidade_disponivel, imagem_url, id_vendedor, id_template) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([$idSub, $idCat, $idGer, $clean['nome'], $clean['descricao'], $clean['servidor'], $clean['preco_moedas'], $clean['preco_reais'], $clean['quantidade_disponivel'], $clean['imagem_url'], isset($data['id_vendedor']) ? (int)$data['id_vendedor'] : null, $idTemplate]);
        logActivity(getCurrentUserId(), 'criar', 'item', (int)$db->lastInsertId(), $clean['nome']);

        echo json_encode(['success' => true, 'id' => $db->lastInsertId()]);
        break;

    case 'PUT':
        if (!isAdmin() && !isSeller()) {
            http_response_code(401);
            echo json_encode(['error' => 'Não autorizado']);
            exit();
        }

        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $id = $data['id'] ?? 0;

        if (isSeller() && !isAdmin()) {
            $check = $db->prepare('SELECT id_vendedor FROM itens WHERE id = ?');
            $check->execute([$id]);
            $owner = $check->fetchColumn();
            if ($owner != getCurrentUserId()) {
                http_response_code(403);
                echo json_encode(['error' => 'Você só pode editar seus próprios itens']);
                break;
            }
        }

        [$clean, $err] = sanitizeItemInput($data);
        if ($err !== null) {
            http_response_code(400);
            echo json_encode(['error' => $err]);
            exit();
        }

        $idSub = !empty($data['id_subcategoria']) ? (int)$data['id_subcategoria'] : null;
        $idCat = !empty($data['id_categoria']) ? (int)$data['id_categoria'] : null;
        $idGer = !empty($data['id_geral']) ? (int)$data['id_geral'] : null;
        $idTemplate = !empty($data['id_template']) ? (int)$data['id_template'] : null;
        $auto = $idTemplate ? templateAutoFields($db, $idTemplate) : null;
        if ($auto) {
            $idGer = $auto['id_geral'];
            $idCat = $auto['id_categoria'];
            $idSub = $auto['id_subcategoria'];
            $clean['nome'] = $auto['nome'];
            if ($clean['imagem_url'] === '') $clean['imagem_url'] = $auto['imagem_url'];
        }

        if ($idSub) { $idCat = null; $idGer = null; }
        elseif ($idCat) { $idGer = null; }
        elseif (!$idGer) {
            http_response_code(400);
            echo json_encode(['error' => 'É necessário informar pelo menos um id (geral, categoria ou subcategoria).']);
            exit();
        }

        $stmt = $db->prepare('UPDATE itens SET id_subcategoria = ?, id_categoria = ?, id_geral = ?, nome = ?, descricao = ?, servidor = ?, preco_moedas = ?, preco_reais = ?, quantidade_disponivel = ?, imagem_url = ?, id_template = ? WHERE id = ?');
        $stmt->execute([$idSub, $idCat, $idGer, $clean['nome'], $clean['descricao'], $clean['servidor'], $clean['preco_moedas'], $clean['preco_reais'], $clean['quantidade_disponivel'], $clean['imagem_url'], $idTemplate, $id]);
        logActivity(getCurrentUserId(), 'editar', 'item', $id, $clean['nome']);

        echo json_encode(['success' => true]);
        break;

    case 'DELETE':
        if (!isAdmin() && !isSeller()) {
            http_response_code(401);
            echo json_encode(['error' => 'Não autorizado']);
            exit();
        }

        $data = json_decode(file_get_contents('php://input'), true);

        // Bulk delete
        if (!empty($data['ids']) && is_array($data['ids'])) {
            if (isSeller() && !isAdmin()) {
                $placeholders = implode(',', array_fill(0, count($data['ids']), '?'));
                $check = $db->prepare("SELECT id FROM itens WHERE id IN ($placeholders) AND id_vendedor = ?");
                $check->execute([...$data['ids'], getCurrentUserId()]);
                $allowed = $check->fetchAll(PDO::FETCH_COLUMN);
                $idsToDelete = array_map('intval', $allowed);
            } else {
                $idsToDelete = array_map('intval', $data['ids']);
            }
            if (!empty($idsToDelete)) {
                $placeholders = implode(',', array_fill(0, count($idsToDelete), '?'));
                $db->prepare("DELETE FROM itens WHERE id IN ($placeholders)")->execute($idsToDelete);
                foreach ($idsToDelete as $did) {
                    logActivity(getCurrentUserId(), 'excluir', 'item', $did, '');
                }
            }
            echo json_encode(['success' => true, 'deleted' => count($idsToDelete)]);
            break;
        }

        $id = $data['id'] ?? 0;

        if (isSeller() && !isAdmin()) {
            $check = $db->prepare('SELECT id_vendedor FROM itens WHERE id = ?');
            $check->execute([$id]);
            $owner = $check->fetchColumn();
            if ($owner != getCurrentUserId()) {
                http_response_code(403);
                echo json_encode(['error' => 'Você só pode excluir seus próprios itens']);
                break;
            }
        }

        $stmt = $db->prepare('DELETE FROM itens WHERE id = ?');
        $stmt->execute([$id]);
        logActivity(getCurrentUserId(), 'excluir', 'item', $id, '');

        echo json_encode(['success' => true]);
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Método não permitido']);
}
?>

<?php
require_once __DIR__ . '/routes.php';

$method = $_SERVER['REQUEST_METHOD'];
$db = getDB();

function fetchItemsWithRelations(PDO $db, string $where = '', array $params = []): array {
    $sql = 'SELECT
                i.id,
                i.id_subcategoria,
                i.id_categoria,
                i.id_geral,
                i.id_template,
                i.nome,
                i.descricao,
                i.preco_moedas,
                i.preco_reais,
                i.quantidade_disponivel,
                i.imagem_url,
                v.nome AS nome_vendedor,
                v.whatsapp AS vendedor_whatsapp,
                t.atributos AS template_atributos,
                t.atributos_detalhes AS template_atributos_raw,
                t.imagem_url AS template_imagem,
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

    if ($where) {
        $sql .= ' WHERE ' . $where;
    }

    // Ordem por cadastro (ID crescente)
    $sql .= ' ORDER BY i.id ASC';

    $stmt = $db->prepare($sql);
    // Bind params with explicit types to avoid string coercion in COALESCE comparisons
    foreach ($params as $i => $param) {
        if (is_int($param)) {
            $stmt->bindValue($i + 1, $param, PDO::PARAM_INT);
        } else {
            $stmt->bindValue($i + 1, $param, PDO::PARAM_STR);
        }
    }
    $stmt->execute();
    return $stmt->fetchAll();
}

switch ($method) {
    case 'GET':
        $subcategoryId = isset($_GET['subcategory_id']) ? (int) $_GET['subcategory_id'] : 0;
        $categoryId = isset($_GET['category_id']) ? (int) $_GET['category_id'] : 0;
        $generalId = isset($_GET['general_id']) ? (int) $_GET['general_id'] : 0;
        $itemId = isset($_GET['id']) ? (int) $_GET['id'] : 0;
        $sellerFilter = isset($_GET['seller_id']) ? (int) $_GET['seller_id'] : 0;
        $searchTerm = isset($_GET['search']) ? trim($_GET['search']) : '';

        if ($searchTerm !== '' && strlen($searchTerm) >= 2) {
            $items = fetchItemsWithRelations($db, 'i.nome LIKE ?', ['%' . $searchTerm . '%']);
            echo json_encode($items);
            break;
        }

        if ($sellerFilter > 0) {
            $items = fetchItemsWithRelations($db, 'i.id_vendedor = ?', [$sellerFilter]);
            echo json_encode($items);
            break;
        }

        if ($itemId > 0) {
            $items = fetchItemsWithRelations($db, 'i.id = ?', [$itemId]);
            echo json_encode($items ? $items[0] : null);
            break;
        }

        if ($subcategoryId > 0) {
            $items = fetchItemsWithRelations($db, 'i.id_subcategoria = ?', [$subcategoryId]);
        } elseif ($categoryId > 0) {
            // Categoria pode vir de id_categoria explícito ou da subcategoria
            $items = fetchItemsWithRelations($db, 'COALESCE(cat_explicit.id, cat_from_sub.id) = ?', [$categoryId]);
        } elseif ($generalId > 0) {
            // Geral pode vir de id_geral explícito ou derivado de categoria/subcategoria
            // Busca itens que têm id_geral = generalId OU que têm categoria/subcategoria que pertencem a essa geral
            $items = fetchItemsWithRelations($db, 'i.id_geral = ? OR COALESCE(geral_from_cat.id, geral_from_sub.id) = ?', [$generalId, $generalId]);
        } else {
            $items = fetchItemsWithRelations($db);
        }

        echo json_encode($items);
        break;

    case 'POST':
        if (!isAdmin() && !isSeller()) {
            http_response_code(401);
            echo json_encode(['error' => 'Não autorizado']);
            exit();
        }

        $data = json_decode(file_get_contents('php://input'), true);
        // Se for vendedor (não admin), força id_vendedor = session user
        if (isSeller() && !isAdmin()) {
            $data['id_vendedor'] = getCurrentUserId();
        }

        // Determina o nível mais profundo disponível
        $idSub = !empty($data['id_subcategoria']) ? (int)$data['id_subcategoria'] : null;
        $idCat = !empty($data['id_categoria']) ? (int)$data['id_categoria'] : null;
        $idGer = !empty($data['id_geral']) ? (int)$data['id_geral'] : null;

        if ($idSub) {
            $idCat = null; $idGer = null; // subcategoria domina
        } elseif ($idCat) {
            $idGer = null; // categoria domina
        } elseif (!$idGer) {
            http_response_code(400);
            echo json_encode(['error' => 'É necessário informar pelo menos um id (geral, categoria ou subcategoria).']);
            exit();
        }

        $idTemplate = !empty($data['id_template']) ? (int)$data['id_template'] : null;

        $stmt = $db->prepare('INSERT INTO itens (id_subcategoria, id_categoria, id_geral, nome, descricao, preco_moedas, preco_reais, quantidade_disponivel, imagem_url, id_vendedor, id_template) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([
            $idSub,
            $idCat,
            $idGer,
            $data['nome'] ?? '',
            $data['descricao'] ?? '',
            isset($data['preco_moedas']) ? (int)$data['preco_moedas'] : 0,
            isset($data['preco_reais']) ? (float)$data['preco_reais'] : 0,
            isset($data['quantidade_disponivel']) ? (int)$data['quantidade_disponivel'] : 0,
            $data['imagem_url'] ?? '',
            isset($data['id_vendedor']) ? (int)$data['id_vendedor'] : null,
            $idTemplate
        ]);

        echo json_encode([
            'success' => true,
            'id' => $db->lastInsertId()
        ]);
        break;

    case 'PUT':
        if (!isAdmin() && !isSeller()) {
            http_response_code(401);
            echo json_encode(['error' => 'Não autorizado']);
            exit();
        }

        $data = json_decode(file_get_contents('php://input'), true);
        $id = $data['id'] ?? 0;

        // Se vendedor, verificar se o item é dele
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

        $idSub = !empty($data['id_subcategoria']) ? (int)$data['id_subcategoria'] : null;
        $idCat = !empty($data['id_categoria']) ? (int)$data['id_categoria'] : null;
        $idGer = !empty($data['id_geral']) ? (int)$data['id_geral'] : null;

        if ($idSub) { $idCat = null; $idGer = null; }
        elseif ($idCat) { $idGer = null; }
        elseif (!$idGer) {
            http_response_code(400);
            echo json_encode(['error' => 'É necessário informar pelo menos um id (geral, categoria ou subcategoria).']);
            exit();
        }

        $stmt = $db->prepare('UPDATE itens SET id_subcategoria = ?, id_categoria = ?, id_geral = ?, nome = ?, descricao = ?, preco_moedas = ?, preco_reais = ?, quantidade_disponivel = ?, imagem_url = ? WHERE id = ?');
        $stmt->execute([
            $idSub,
            $idCat,
            $idGer,
            $data['nome'] ?? '',
            $data['descricao'] ?? '',
            isset($data['preco_moedas']) ? (int) $data['preco_moedas'] : 0,
            isset($data['preco_reais']) ? (float) $data['preco_reais'] : 0,
            isset($data['quantidade_disponivel']) ? (int) $data['quantidade_disponivel'] : 0,
            $data['imagem_url'] ?? '',
            $id
        ]);

        echo json_encode(['success' => true]);
        break;

    case 'DELETE':
        if (!isAdmin() && !isSeller()) {
            http_response_code(401);
            echo json_encode(['error' => 'Não autorizado']);
            exit();
        }

        $data = json_decode(file_get_contents('php://input'), true);
        $id = $data['id'] ?? 0;

        // Se vendedor, verificar se o item é dele
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

        echo json_encode(['success' => true]);
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Método não permitido']);
}
?>

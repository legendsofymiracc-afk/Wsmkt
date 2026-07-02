<?php
require_once __DIR__ . '/routes.php';

$method = $_SERVER['REQUEST_METHOD'];
$db = getDB();

function buildCategoryTree(array $rows): array {
    $map = [];
    foreach ($rows as $row) {
        $row['filhos'] = [];
        $map[$row['id']] = $row;
    }

    $tree = [];
    foreach ($map as $id => &$node) {
        $parentId = (int) $node['id_pai'];
        if ($parentId > 0 && isset($map[$parentId])) {
            $map[$parentId]['filhos'][] =& $node;
        } else {
            $tree[] =& $node;
        }
    }
    unset($node);

    return $tree;
}

switch ($method) {
    case 'GET':
        $nivel = isset($_GET['nivel']) ? (int) $_GET['nivel'] : null;
        $idPai = isset($_GET['id_pai']) ? (int) $_GET['id_pai'] : null;
        $id = isset($_GET['id']) ? (int) $_GET['id'] : null;
        $tree = isset($_GET['tree']) && (int) $_GET['tree'] === 1;

        if ($tree) {
            // Mantém a ordem de cadastro (IDs crescentes), refletindo a ordem do seeder
            $stmt = $db->query('SELECT id, id_pai, nome, nivel, imagem_url FROM categorias ORDER BY id ASC');
            $rows = $stmt->fetchAll();
            echo json_encode(buildCategoryTree($rows));
            break;
        }

        $conditions = [];
        $params = [];

        if (!is_null($id)) {
            $conditions[] = 'id = ?';
            $params[] = $id;
        }

        if (!is_null($nivel)) {
            $conditions[] = 'nivel = ?';
            $params[] = $nivel;
        }

        if (!is_null($idPai)) {
            $conditions[] = 'id_pai = ?';
            $params[] = $idPai;
        }

        $sql = 'SELECT id, id_pai, nome, nivel, imagem_url FROM categorias';
        if ($conditions) {
            $sql .= ' WHERE ' . implode(' AND ', $conditions);
        }
        // Mantém a ordem de cadastro por ID
        $sql .= ' ORDER BY id ASC';

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $categorias = $stmt->fetchAll();

        echo json_encode($categorias);
        break;

    case 'PUT':
        if (!isAdmin()) {
            http_response_code(401);
            echo json_encode(['error' => 'Não autorizado']);
            break;
        }

        $data = json_decode(file_get_contents('php://input'), true);
        $id = isset($data['id']) ? (int)$data['id'] : 0;
        $newImage = isset($data['imagem_url']) ? trim((string)$data['imagem_url']) : '';

        if ($id <= 0 || $newImage === '') {
            http_response_code(400);
            echo json_encode(['error' => 'Parâmetros inválidos']);
            break;
        }

        // Obtém imagem atual
        $stmt = $db->prepare('SELECT imagem_url FROM categorias WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        $oldImage = $stmt->fetchColumn();
        if ($oldImage === false) {
            http_response_code(404);
            echo json_encode(['error' => 'Categoria não encontrada']);
            break;
        }

        // Atualiza para a nova imagem
        $stmt = $db->prepare('UPDATE categorias SET imagem_url = ? WHERE id = ?');
        $stmt->execute([$newImage, $id]);

        // Se a imagem antiga era um upload local, remove o arquivo (com proteção contra path traversal)
        try {
            if ($oldImage && $oldImage !== $newImage) {
                $normalized = str_replace('\\', '/', $oldImage);
                if (preg_match('#^(?:\./|\.\./)?images/uploads/#', $normalized)) {
                    $relative = preg_replace('#^(?:\./|\.\./)#', '', $normalized);
                    $fullPath = __DIR__ . '/../' . $relative;
                    // Verifica com realpath para prevenir path traversal (ex: ../../../etc/passwd)
                    $realPath = realpath($fullPath);
                    $uploadsDir = realpath(__DIR__ . '/../images/uploads');
                    if ($realPath !== false && $uploadsDir !== false && strpos($realPath, $uploadsDir) === 0 && is_file($realPath)) {
                        @unlink($realPath);
                    }
                }
            }
        } catch (Throwable $e) {
            // Não falha a operação por erro ao excluir arquivo
        }

        echo json_encode(['success' => true]);
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Método não permitido']);
}
?>


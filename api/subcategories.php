<?php
require_once __DIR__ . '/routes.php';

$method = $_SERVER['REQUEST_METHOD'];
$db = getDB();

switch ($method) {
    case 'GET':
        $categoriaId = isset($_GET['category_id']) ? (int) $_GET['category_id'] : 0;
        $stmt = $db->prepare('SELECT id, id_pai, nome, nivel, imagem_url FROM categorias WHERE id_pai = ? ORDER BY nome');
        $stmt->execute([$categoriaId]);
        $subcategorias = $stmt->fetchAll();
        echo json_encode($subcategorias);
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Método não permitido para categorias fixas']);
}
?>


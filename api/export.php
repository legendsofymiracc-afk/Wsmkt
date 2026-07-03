<?php
require_once __DIR__ . '/routes.php';
if (!isAdmin()) { http_response_code(401); echo json_encode(['error'=>'Acesso negado']); exit(); }

$db = getDB();
$format = $_GET['format'] ?? 'json';
$type = $_GET['type'] ?? 'items'; // items | sellers | reviews

if ($type === 'items') {
    $stmt = $db->query('SELECT i.*, v.nome as vendedor_nome, sub.nome as sub_nome, cat.nome as cat_nome, g.nome as geral_nome FROM itens i LEFT JOIN usuarios v ON v.id=i.id_vendedor LEFT JOIN categorias sub ON sub.id=i.id_subcategoria LEFT JOIN categorias cat ON cat.id=i.id_categoria LEFT JOIN categorias g ON g.id=i.id_geral ORDER BY i.id');
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
} elseif ($type === 'sellers') {
    $stmt = $db->query("SELECT id, email, nome, whatsapp, ativo, criado_em FROM usuarios WHERE papel='vendedor' ORDER BY nome");
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
} else {
    $stmt = $db->query('SELECT a.*, u.nome as usuario_nome, i.nome as item_nome FROM avaliacoes a JOIN usuarios u ON u.id=a.id_usuario JOIN itens i ON i.id=a.id_item ORDER BY a.criado_em DESC');
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
}

if ($format === 'csv') {
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="export_' . $type . '_' . date('Ymd') . '.csv"');
    $out = fopen('php://output', 'w');
    if (!empty($rows)) {
        fputcsv($out, array_keys($rows[0]));
        foreach ($rows as $row) fputcsv($out, $row);
    }
    fclose($out);
} else {
    header('Content-Type: application/json');
    header('Content-Disposition: attachment; filename="export_' . $type . '_' . date('Ymd') . '.json"');
    echo json_encode($rows, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
}

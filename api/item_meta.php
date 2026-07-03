<?php
// Retorna meta tags OG para um item (usado para SEO / link previews)
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/skin_image_resolver.php';
$itemId = isset($_GET['id']) ? (int)$_GET['id'] : 0;
if ($itemId <= 0) { http_response_code(404); exit(); }

$db = getDB();
$stmt = $db->prepare('
    SELECT i.nome, i.descricao, i.preco_moedas, i.imagem_url,
        t.imagem_url AS template_imagem,
        t.item_id AS template_item_id,
        t.nome AS template_nome,
        t.categoria AS template_categoria,
        t.subcategoria AS template_subcategoria,
        t.atributos AS template_atributos,
        t.atributos_detalhes AS template_atributos_raw
    FROM itens i
    LEFT JOIN templates t ON t.id = i.id_template
    WHERE i.id = ?
');
$stmt->execute([$itemId]);
$item = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$item) { http_response_code(404); exit(); }
$item = applySkinImageToItemRow($item);

$image = $item['imagem_url'] ?: $item['template_imagem'] ?: 'images/uploads/gold_coin.png';
$title = $item['nome'] . ' — Mercado Warspear';
$desc = ($item['descricao'] ? substr($item['descricao'], 0, 160) . '...' : 'Item do Warspear Online') . ' | ' . number_format($item['preco_moedas'], 0, ',', '.') . ' moedas';
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= htmlspecialchars($title) ?></title>
    <meta name="description" content="<?= htmlspecialchars($desc) ?>">
    <meta property="og:title" content="<?= htmlspecialchars($title) ?>">
    <meta property="og:description" content="<?= htmlspecialchars($desc) ?>">
    <meta property="og:image" content="<?= htmlspecialchars($image) ?>">
    <meta property="og:type" content="product">
    <meta name="twitter:card" content="summary">
    <meta http-equiv="refresh" content="0;url=/#/item/<?= $itemId ?>">
</head><body></body></html>

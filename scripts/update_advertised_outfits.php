<?php
declare(strict_types=1);

$root = dirname(__DIR__);
$db = new PDO('sqlite:' . $root . '/database/mercado.db');
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

$rows = $db->query("
    SELECT DISTINCT t.item_id
    FROM itens i
    JOIN templates t ON t.id = i.id_template
    WHERE t.item_id > 0
      AND (t.categoria LIKE '%Trajes%' OR t.atributos LIKE '%\"itemType\":19%')
    ORDER BY t.item_id
")->fetchAll(PDO::FETCH_COLUMN);

$rarities = [0 => 'Comum', 1 => 'Incomum', 2 => 'Raro', 3 => 'Epico', 4 => 'Lendario', 5 => 'Mitico'];
$updated = 0;
$failed = 0;

foreach ($rows as $itemId) {
    $itemId = (int)$itemId;
    $ctx = stream_context_create(['http' => [
        'timeout' => 20,
        'header' => "Accept: application/json\r\nUser-Agent: MercadoWarspear/1.0\r\n",
    ]]);
    $raw = @file_get_contents('https://wsdb.xyz/api/data/item/pt/' . $itemId, false, $ctx);
    $data = $raw ? json_decode($raw, true) : null;
    if (!is_array($data) || (int)($data['id'] ?? 0) !== $itemId) {
        $failed++;
        continue;
    }

    $attrs = [
        'level' => (int)($data['level'] ?? 1),
        'color' => (int)($data['color'] ?? 3),
        'itemType' => (int)($data['itemType'] ?? 19),
        'icon' => (int)($data['icon'] ?? 0),
        'source' => 'wsdb_detail',
    ];

    $stmt = $db->prepare('
        UPDATE templates
        SET atributos = ?, atributos_detalhes = ?, nivel_min = ?, nivel_max = ?, rarity = ?
        WHERE item_id = ?
    ');
    $stmt->execute([
        json_encode($attrs, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        (int)($data['level'] ?? 1),
        (int)($data['level'] ?? 1),
        $rarities[(int)($data['color'] ?? 0)] ?? 'Comum',
        $itemId,
    ]);
    $updated += $stmt->rowCount();
}

echo json_encode(['success' => true, 'checked' => count($rows), 'updated' => $updated, 'failed' => $failed], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) . PHP_EOL;

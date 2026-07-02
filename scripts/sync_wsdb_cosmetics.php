<?php
declare(strict_types=1);

/*
 * Importa/atualiza templates cosméticos para anúncio:
 * - WSDB categoria 23: Trajes luxuosos, incluindo Redemoinho.
 * - Catálogo local extraído: outfit_items.csd e haircut_pack_items.csd como fallback.
 *
 * Uso:
 *   C:\xampp\php\php.exe scripts\sync_wsdb_cosmetics.php
 */

set_time_limit(1200);

$root = dirname(__DIR__);
$db = new PDO('sqlite:' . $root . '/database/mercado.db');
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

$templateIconDir = $root . '/images/uploads/templates';
if (!is_dir($templateIconDir)) {
    mkdir($templateIconDir, 0777, true);
}

function wsdbCosmeticsJson(string $url): ?array {
    $ctx = stream_context_create(['http' => [
        'timeout' => 30,
        'header' => "Accept: application/json\r\nUser-Agent: MercadoWarspear/1.0\r\n",
    ]]);
    $raw = @file_get_contents($url, false, $ctx);
    if (!$raw) return null;
    $json = json_decode($raw, true);
    return is_array($json) ? $json : null;
}

function downloadCosmeticIcon(int $iconId, string $dir): string {
    if ($iconId <= 0) return '';
    $target = $dir . '/' . $iconId . '.webp';
    if (!is_file($target)) {
        $data = @file_get_contents('https://wsdb.xyz/icons/' . $iconId . '.webp');
        if ($data) {
            file_put_contents($target, $data);
        }
    }
    return is_file($target) ? 'images/uploads/templates/' . $iconId . '.webp' : '';
}

function fetchWsdbItemDetail(int $itemId): ?array {
    static $cache = [];
    if ($itemId <= 0) return null;
    if (array_key_exists($itemId, $cache)) return $cache[$itemId];
    $cache[$itemId] = wsdbCosmeticsJson('https://wsdb.xyz/api/data/item/pt/' . $itemId);
    return $cache[$itemId];
}

function rarityLabel(int $color): string {
    return [0 => 'Comum', 1 => 'Incomum', 2 => 'Raro', 3 => 'Epico', 4 => 'Lendario', 5 => 'Mitico'][$color] ?? 'Comum';
}

function upsertCosmeticTemplate(PDO $db, array $item, string $categoria, string $subcategoria, string $source): string {
    $itemId = (int)($item['id'] ?? $item['item_id'] ?? 0);
    $name = trim((string)($item['name'] ?? $item['name_exact'] ?? ''));
    if ($itemId <= 0 || $name === '') return 'skipped';

    $detail = fetchWsdbItemDetail($itemId);
    if (is_array($detail) && (int)($detail['id'] ?? 0) === $itemId) {
        $item = array_merge($item, $detail);
    }

    $level = (int)($item['level'] ?? 1);
    $color = (int)($item['color'] ?? 3);
    $iconId = (int)($item['icon'] ?? 0);
    $image = $iconId > 0 ? downloadCosmeticIcon($iconId, $GLOBALS['templateIconDir']) : '';
    if ($image === '' && !empty($item['icon_by_id_path'])) {
        $image = 'market_item_database_assets/' . ltrim((string)$item['icon_by_id_path'], '/\\');
    } elseif ($image === '' && !empty($item['icon_path'])) {
        $image = 'market_item_database_assets/' . ltrim((string)$item['icon_path'], '/\\');
    }

    $attrs = [
        'level' => $level,
        'color' => $color,
        'itemType' => (int)($item['itemType'] ?? 19),
        'source' => $source,
    ];
    if (!empty($item['description'])) {
        $attrs['description'] = (string)$item['description'];
    }
    if ($iconId > 0) {
        $attrs['icon'] = $iconId;
    }
    $attrsJson = json_encode($attrs, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $rawJson = json_encode($item, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

    $find = $db->prepare('SELECT id, imagem_url FROM templates WHERE item_id = ? LIMIT 1');
    $find->execute([$itemId]);
    $existing = $find->fetch();
    $existingId = $existing ? (int)$existing['id'] : 0;
    if ($image === '' && $existing && !empty($existing['imagem_url'])) {
        $image = (string)$existing['imagem_url'];
    }

    if ($existingId) {
        $stmt = $db->prepare('
            UPDATE templates
            SET nome = ?, categoria = ?, subcategoria = ?, imagem_url = ?, atributos = ?, atributos_detalhes = ?,
                nivel_min = ?, nivel_max = ?, profissao = "", rarity = ?, origem = ?
            WHERE id = ?
        ');
        $stmt->execute([$name, $categoria, $subcategoria, $image, $attrsJson, $rawJson, $level, $level, rarityLabel($color), $source, $existingId]);
        return 'updated';
    }

    $stmt = $db->prepare('
        INSERT INTO templates (nome, item_id, categoria, subcategoria, imagem_url, atributos, atributos_detalhes, nivel_min, nivel_max, profissao, rarity, origem)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, "", ?, ?)
    ');
    $stmt->execute([$name, $itemId, $categoria, $subcategoria, $image, $attrsJson, $rawJson, $level, $level, rarityLabel($color), $source]);
    return 'inserted';
}

$db->exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_templates_item_id_unique_nonzero ON templates(item_id) WHERE item_id > 0');

$stats = ['inserted' => 0, 'updated' => 0, 'skipped' => 0];

$wsdb = wsdbCosmeticsJson('https://wsdb.xyz/api/data/item/items/pt/23');
foreach (($wsdb['list'] ?? []) as $item) {
    $result = upsertCosmeticTemplate($db, $item, 'Trajes Luxuosos', '', 'wsdb_cosmetics');
    $stats[$result]++;
}

$catalogPath = $root . '/market_item_database_assets/items_market_catalog.json';
if (is_file($catalogPath)) {
    $catalog = json_decode(file_get_contents($catalogPath), true);
    $items = is_array($catalog['items'] ?? null) ? $catalog['items'] : [];
    foreach ($items as $item) {
        $sourceFile = (string)($item['source_file'] ?? '');
        if ($sourceFile === 'outfit_items.csd') {
            $result = upsertCosmeticTemplate($db, $item, 'Trajes Luxuosos', '', 'local_outfit_catalog');
            $stats[$result]++;
        } elseif ($sourceFile === 'haircut_pack_items.csd') {
            $result = upsertCosmeticTemplate($db, $item, 'Visuais Decorativos', 'Penteados', 'local_visual_catalog');
            $stats[$result]++;
        }
    }
}

$redemoinho = $db->query("SELECT item_id, nome, imagem_url FROM templates WHERE nome = 'Redemoinho' ORDER BY item_id")->fetchAll();

echo json_encode([
    'success' => true,
    'stats' => $stats,
    'redemoinho' => $redemoinho,
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT) . PHP_EOL;

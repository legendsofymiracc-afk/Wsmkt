<?php
declare(strict_types=1);

/*
 * Sincroniza 100% das reliquias atuais do WSDB.
 *
 * Uso:
 *   C:\xampp\php\php.exe scripts\sync_wsdb_relics.php
 */

set_time_limit(1200);

$root = dirname(__DIR__);
$db = new PDO('sqlite:' . $root . '/database/mercado.db');
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

$iconDir = $root . '/images/uploads/templates';
$categoryIconDir = $root . '/images/uploads/wsdb_categories';
@mkdir($iconDir, 0777, true);
@mkdir($categoryIconDir, 0777, true);
@mkdir($root . '/output', 0777, true);

function wsdbRelicJson(string $url): ?array {
    $ctx = stream_context_create(['http' => [
        'timeout' => 30,
        'header' => "Accept: application/json\r\nUser-Agent: MercadoWarspear/1.0\r\n",
    ]]);
    $raw = @file_get_contents($url, false, $ctx);
    if (!$raw) return null;
    $json = json_decode($raw, true);
    return is_array($json) ? $json : null;
}

function relicKey(string $value): string {
    $value = trim(mb_strtolower($value, 'UTF-8'));
    $ascii = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value);
    if ($ascii !== false && $ascii !== '') $value = $ascii;
    return preg_replace('/[^a-z0-9]+/i', '', $value) ?? '';
}

function loadWsdbRelicTree(int $parentId = 0, array $path = [], array &$seen = []): array {
    if (isset($seen[$parentId])) return [];
    $seen[$parentId] = true;
    $data = wsdbRelicJson('https://wsdb.xyz/api/data/item/category/pt/' . $parentId);
    $nodes = [];
    foreach (($data['list'] ?? []) as $row) {
        $id = (int)($row['id'] ?? 0);
        $name = trim((string)($row['name'] ?? ''));
        if ($id <= 0 || $name === '') continue;
        $nodePath = array_merge($path, [$name]);
        $nodes[] = [
            'id' => $id,
            'name' => $name,
            'icon' => (int)($row['icon'] ?? 0),
            'path' => $nodePath,
            'children' => loadWsdbRelicTree($id, $nodePath, $seen),
        ];
    }
    return $nodes;
}

function findRelicRoot(array $nodes): ?array {
    foreach ($nodes as $node) {
        if (relicKey((string)$node['name']) === 'reliquias') return $node;
        $found = findRelicRoot($node['children'] ?? []);
        if ($found) return $found;
    }
    return null;
}

function collectLeaves(array $node): array {
    $children = $node['children'] ?? [];
    if (!$children) return [$node];
    $out = [];
    foreach ($children as $child) {
        foreach (collectLeaves($child) as $leaf) $out[] = $leaf;
    }
    return $out;
}

function downloadRelicIcon(int $iconId, string $dir, string $publicPrefix): string {
    if ($iconId <= 0) return '';
    $target = $dir . '/' . $iconId . '.webp';
    if (!is_file($target)) {
        $data = @file_get_contents('https://wsdb.xyz/icons/' . $iconId . '.webp');
        if ($data) file_put_contents($target, $data);
    }
    return is_file($target) ? $publicPrefix . '/' . $iconId . '.webp' : '';
}

function rarityLabelForRelic(int $color): string {
    return [0 => 'Comum', 1 => 'Incomum', 2 => 'Raro', 3 => 'Epico', 4 => 'Lendario', 5 => 'Mitico'][$color] ?? 'Comum';
}

function ensureCategoryPath(PDO $db, array $path, array $icons): int {
    $parentId = 0;
    $level = 1;
    foreach ($path as $idx => $name) {
        $icon = (int)($icons[$idx] ?? 0);
        $image = downloadRelicIcon($icon, $GLOBALS['categoryIconDir'], 'images/uploads/wsdb_categories');
        $stmt = $db->prepare('SELECT id, imagem_url FROM categorias WHERE id_pai = ? AND nome = ? LIMIT 1');
        $stmt->execute([$parentId, $name]);
        $found = $stmt->fetch();
        if ($found) {
            $parentId = (int)$found['id'];
            if ($image !== '' && empty($found['imagem_url'])) {
                $upd = $db->prepare('UPDATE categorias SET imagem_url = ? WHERE id = ?');
                $upd->execute([$image, $parentId]);
            }
        } else {
            $ins = $db->prepare('INSERT INTO categorias (id_pai, nome, nivel, imagem_url) VALUES (?, ?, ?, ?)');
            $ins->execute([$parentId, $name, $level, $image]);
            $parentId = (int)$db->lastInsertId();
        }
        $level++;
    }
    return $parentId;
}

$tree = loadWsdbRelicTree(0);
$relicRoot = findRelicRoot($tree);
if (!$relicRoot) {
    fwrite(STDERR, "Relic category not found in WSDB tree.\n");
    exit(1);
}

$db->exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_templates_item_id_unique_nonzero ON templates(item_id) WHERE item_id > 0');
$find = $db->prepare('SELECT id, imagem_url, atributos, atributos_detalhes FROM templates WHERE item_id = ? LIMIT 1');
$insert = $db->prepare('
    INSERT INTO templates (nome, item_id, categoria, subcategoria, imagem_url, atributos, atributos_detalhes, nivel_min, nivel_max, profissao, rarity, origem)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, "", ?, "wsdb_relics")
');
$update = $db->prepare('
    UPDATE templates
    SET nome = ?, categoria = ?, subcategoria = ?, imagem_url = ?, atributos = ?, atributos_detalhes = ?,
        nivel_min = ?, nivel_max = ?, profissao = "", rarity = ?, origem = "wsdb_relics"
    WHERE id = ?
');

$stats = [
    'expected' => 0,
    'inserted' => 0,
    'updated' => 0,
    'failed_lists' => [],
    'failed_details' => [],
    'failed_icons' => [],
    'missing_after_import' => [],
    'subcategories' => [],
];
$expectedIds = [];

foreach (collectLeaves($relicRoot) as $leaf) {
    $subName = (string)$leaf['name'];
    ensureCategoryPath($db, (array)$leaf['path'], array_fill(0, count((array)$leaf['path']), (int)($leaf['icon'] ?? 0)));

    $list = wsdbRelicJson('https://wsdb.xyz/api/data/item/items/pt/' . (int)$leaf['id']);
    if (!is_array($list)) {
        $stats['failed_lists'][] = ['id' => (int)$leaf['id'], 'name' => $subName];
        continue;
    }
    $items = is_array($list['list'] ?? null) ? $list['list'] : [];
    $stats['subcategories'][] = ['id' => (int)$leaf['id'], 'name' => $subName, 'count' => count($items)];

    foreach ($items as $listItem) {
        $itemId = (int)($listItem['id'] ?? 0);
        $name = trim((string)($listItem['name'] ?? ''));
        if ($itemId <= 0 || $name === '') continue;
        $expectedIds[$itemId] = $name;
        $stats['expected']++;

        $find->execute([$itemId]);
        $existing = $find->fetch();

        $detailUnavailable = false;
        $detail = wsdbRelicJson('https://wsdb.xyz/api/data/item/pt/' . $itemId);
        if (!is_array($detail) || (int)($detail['id'] ?? 0) !== $itemId) {
            $detail = $listItem;
            $detailUnavailable = true;
            $stats['failed_details'][] = ['id' => $itemId, 'name' => $name];
        } else {
            $name = trim((string)($detail['name'] ?? $name));
        }

        $iconId = (int)($detail['icon'] ?? $listItem['icon'] ?? 0);
        $image = downloadRelicIcon($iconId, $iconDir, 'images/uploads/templates');
        if ($iconId > 0 && $image === '') {
            $stats['failed_icons'][] = ['id' => $itemId, 'icon' => $iconId, 'name' => $name];
        }

        $level = (int)($detail['level'] ?? $listItem['level'] ?? 0);
        $color = (int)($detail['color'] ?? $listItem['color'] ?? 0);
        $attrs = [
            'level' => $level,
            'color' => $color,
            'itemType' => (int)($detail['itemType'] ?? $listItem['itemType'] ?? 36),
            'icon' => $iconId,
            'wsdb_id' => $itemId,
            'bound' => (int)($detail['bound'] ?? 0),
            'description' => (string)($detail['description'] ?? ''),
            'coefficients' => $detail['coefficients'] ?? [],
            'skills_count' => is_array($detail['skills'] ?? null) ? count($detail['skills']) : 0,
        ];
        $attrsJson = json_encode($attrs, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $detailJson = json_encode($detail, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($detailUnavailable && $existing) {
            $oldDetail = json_decode((string)($existing['atributos_detalhes'] ?? ''), true);
            if (is_array($oldDetail) && isset($oldDetail['description'], $oldDetail['coefficients'])) {
                $detailJson = json_encode($oldDetail, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            }
        }
        if ($existing) {
            $update->execute([$name, 'Relíquias', $subName, $image, $attrsJson, $detailJson, $level, $level, rarityLabelForRelic($color), (int)$existing['id']]);
            $stats['updated']++;
        } else {
            $insert->execute([$name, $itemId, 'Relíquias', $subName, $image, $attrsJson, $detailJson, $level, $level, rarityLabelForRelic($color)]);
            $stats['inserted']++;
        }
    }
}

if ($expectedIds) {
    $placeholders = implode(',', array_fill(0, count($expectedIds), '?'));
    $stmt = $db->prepare("SELECT item_id FROM templates WHERE item_id IN ($placeholders)");
    $stmt->execute(array_keys($expectedIds));
    $found = array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN));
    $foundSet = array_fill_keys($found, true);
    foreach ($expectedIds as $id => $name) {
        if (empty($foundSet[$id])) {
            $stats['missing_after_import'][] = ['id' => $id, 'name' => $name];
        }
    }
}

$stats['success'] = count($stats['missing_after_import']) === 0 && count($stats['failed_lists']) === 0;
$stats['verified_at'] = date(DATE_ATOM);
$stats['wsdb_relic_root'] = ['id' => (int)$relicRoot['id'], 'name' => (string)$relicRoot['name']];

file_put_contents(
    $root . '/output/wsdb_relics_import_report.json',
    json_encode($stats, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT) . PHP_EOL
);

echo json_encode($stats, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT) . PHP_EOL;

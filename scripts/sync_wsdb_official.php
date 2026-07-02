<?php
declare(strict_types=1);

/*
 * Sincroniza categorias e templates oficiais do WSDB.
 * Uso: C:\xampp\php\php.exe scripts\sync_wsdb_official.php
 */

set_time_limit(1200);

$root = dirname(__DIR__);
$db = new PDO('sqlite:' . $root . '/database/mercado.db');
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

$categoryIconDir = $root . '/images/uploads/wsdb_categories';
$templateIconDir = $root . '/images/uploads/templates';
@mkdir($categoryIconDir, 0777, true);
@mkdir($templateIconDir, 0777, true);

function wsdbJson(string $url): ?array {
    $ctx = stream_context_create(['http' => [
        'timeout' => 25,
        'header' => "Accept: application/json\r\nUser-Agent: MercadoWarspear/1.0\r\n",
    ]]);
    $raw = @file_get_contents($url, false, $ctx);
    if (!$raw) return null;
    $json = json_decode($raw, true);
    return is_array($json) ? $json : null;
}

function downloadWsdbIcon(int $iconId, string $dir, string $prefix): string {
    if ($iconId <= 0) return '';
    $target = $dir . '/' . $iconId . '.webp';
    if (!is_file($target)) {
        $data = @file_get_contents('https://wsdb.xyz/icons/' . $iconId . '.webp');
        if ($data) file_put_contents($target, $data);
    }
    return is_file($target) ? $prefix . '/' . $iconId . '.webp' : '';
}

function loadWsdbCategoryTree(int $parentId = 0, array $seen = []): array {
    if (isset($seen[$parentId])) return [];
    $seen[$parentId] = true;
    $data = wsdbJson('https://wsdb.xyz/api/data/item/category/pt/' . $parentId);
    $nodes = [];
    foreach (($data['list'] ?? []) as $row) {
        $id = (int)($row['id'] ?? 0);
        if ($id <= 0) continue;
        $nodes[] = [
            'wsdb_id' => $id,
            'nome' => (string)($row['name'] ?? ''),
            'icon' => (int)($row['icon'] ?? 0),
            'filhos' => loadWsdbCategoryTree($id, $seen),
        ];
    }
    return $nodes;
}

$tree = loadWsdbCategoryTree(0);
$localByWsdb = [];
$pathByWsdb = [];
$flatNodes = [];

$insertCategory = $db->prepare('INSERT INTO categorias (id_pai, nome, nivel, imagem_url) VALUES (?, ?, ?, ?)');

function insertCategoryTree(PDO $db, PDOStatement $insertCategory, array $nodes, int $parentLocalId, int $level, array $path): void {
    global $categoryIconDir, $localByWsdb, $pathByWsdb, $flatNodes;
    foreach ($nodes as $node) {
        $image = downloadWsdbIcon((int)$node['icon'], $categoryIconDir, 'images/uploads/wsdb_categories');
        $insertCategory->execute([$parentLocalId, $node['nome'], $level, $image]);
        $localId = (int)$db->lastInsertId();
        $wsdbId = (int)$node['wsdb_id'];
        $nodePath = array_merge($path, [$node['nome']]);
        $localByWsdb[$wsdbId] = $localId;
        $pathByWsdb[$wsdbId] = $nodePath;
        $flatNodes[] = ['id' => $localId, 'wsdb_id' => $wsdbId, 'nome' => $node['nome'], 'nivel' => $level, 'id_pai' => $parentLocalId, 'path' => $nodePath];
        insertCategoryTree($db, $insertCategory, $node['filhos'] ?? [], $localId, $level + 1, $nodePath);
    }
}

function categoryForTemplate(array $path): array {
    $count = count($path);
    if ($count <= 1) return [$path[0] ?? '', ''];
    if ($count === 2) return [$path[0], $path[1]];
    return [$path[$count - 2], $path[$count - 1]];
}

function rarityName(int $color): string {
    return [0 => 'Comum', 1 => 'Incomum', 2 => 'Raro', 3 => 'Epico', 4 => 'Lendario', 5 => 'Mitico'][$color] ?? 'Comum';
}

function findCategoryByTemplate(PDO $db, string $categoria, string $subcategoria): ?array {
    if ($subcategoria !== '') {
        $stmt = $db->prepare('
            SELECT child.id, child.nivel
            FROM categorias child
            JOIN categorias parent ON parent.id = child.id_pai
            WHERE child.nome = ? AND parent.nome = ?
            ORDER BY child.nivel DESC, child.id ASC
            LIMIT 1
        ');
        $stmt->execute([$subcategoria, $categoria]);
        $found = $stmt->fetch();
        if ($found) return ['id' => (int)$found['id'], 'nivel' => (int)$found['nivel']];

        $stmt = $db->prepare('SELECT id, nivel FROM categorias WHERE nome = ? ORDER BY nivel DESC, id ASC LIMIT 1');
        $stmt->execute([$subcategoria]);
        $found = $stmt->fetch();
        if ($found) return ['id' => (int)$found['id'], 'nivel' => (int)$found['nivel']];
    }

    $stmt = $db->prepare('SELECT id, nivel FROM categorias WHERE nome = ? ORDER BY nivel ASC, id ASC LIMIT 1');
    $stmt->execute([$categoria]);
    $found = $stmt->fetch();
    return $found ? ['id' => (int)$found['id'], 'nivel' => (int)$found['nivel']] : null;
}

$db->beginTransaction();
try {
    $db->exec('DELETE FROM categorias');
    insertCategoryTree($db, $insertCategory, $tree, 0, 1, []);

    $db->exec('DROP INDEX IF EXISTS idx_templates_item_id_unique');
    $db->exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_templates_item_id_unique_nonzero ON templates(item_id) WHERE item_id > 0');
    $findTemplate = $db->prepare('SELECT id, atributos_detalhes FROM templates WHERE item_id = ? LIMIT 1');
    $insertTemplate = $db->prepare('
        INSERT INTO templates (nome, item_id, categoria, subcategoria, imagem_url, atributos, nivel_min, nivel_max, profissao, rarity, origem, atributos_detalhes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, "", ?, "wsdb", ?)
    ');
    $updateTemplate = $db->prepare('
        UPDATE templates
        SET nome = ?, categoria = ?, subcategoria = ?, imagem_url = ?, atributos = ?, nivel_min = ?, nivel_max = ?, rarity = ?, origem = "wsdb", atributos_detalhes = ?
        WHERE id = ?
    ');

    $templates = 0;
    foreach ($pathByWsdb as $wsdbId => $path) {
        $data = wsdbJson('https://wsdb.xyz/api/data/item/items/pt/' . $wsdbId);
        foreach (($data['list'] ?? []) as $item) {
            $itemId = (int)($item['id'] ?? 0);
            $name = trim((string)($item['name'] ?? ''));
            if ($itemId <= 0 || $name === '') continue;
            [$categoria, $subcategoria] = categoryForTemplate($path);
            $level = (int)($item['level'] ?? 0);
            $color = (int)($item['color'] ?? 0);
            $iconId = (int)($item['icon'] ?? 0);
            $image = downloadWsdbIcon($iconId, $templateIconDir, 'images/uploads/templates');
            $attrs = ['level' => $level, 'color' => $color];
            $attrsJson = json_encode($attrs, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            $findTemplate->execute([$itemId]);
            $existing = $findTemplate->fetch();
            if ($existing) {
                $details = (string)($existing['atributos_detalhes'] ?? '');
                if ($details === '' || $details === '{}') $details = $attrsJson;
                $updateTemplate->execute([$name, $categoria, $subcategoria, $image, $attrsJson, $level, $level, rarityName($color), $details, (int)$existing['id']]);
            } else {
                $insertTemplate->execute([$name, $itemId, $categoria, $subcategoria, $image, $attrsJson, $level, $level, rarityName($color), $attrsJson]);
            }
            $templates++;
        }
    }

    $updateItem = $db->prepare('UPDATE itens SET id_geral = ?, id_categoria = ?, id_subcategoria = ?, imagem_url = ?, nome = ? WHERE id = ?');
    $items = $db->query('
        SELECT i.id, i.nome, i.id_template, t.nome template_nome, t.categoria, t.subcategoria, t.imagem_url
        FROM itens i
        LEFT JOIN templates t ON t.id = i.id_template OR (i.id_template IS NULL AND t.nome = i.nome)
        ORDER BY i.id
    ')->fetchAll();
    $relinked = 0;
    foreach ($items as $item) {
        if (!$item['template_nome']) continue;
        $node = findCategoryByTemplate($db, (string)$item['categoria'], (string)$item['subcategoria']);
        if (!$node) continue;
        $idGeral = null; $idCategoria = null; $idSub = null;
        if ($node['nivel'] <= 1) $idGeral = $node['id'];
        elseif ($node['nivel'] === 2) $idCategoria = $node['id'];
        else $idSub = $node['id'];
        $updateItem->execute([$idGeral, $idCategoria, $idSub, (string)$item['imagem_url'], (string)$item['template_nome'], (int)$item['id']]);
        $relinked++;
    }

    file_put_contents(
        $root . '/database/categories.seed.json',
        json_encode(array_map(function (array $node): array {
            $rewrite = function (array $n) use (&$rewrite): array {
                $out = [
                    'nome' => $n['nome'],
                    'imagem_url' => 'images/uploads/wsdb_categories/' . (int)$n['icon'] . '.webp',
                    'filhos' => [],
                ];
                foreach (($n['filhos'] ?? []) as $child) $out['filhos'][] = $rewrite($child);
                return $out;
            };
            return $rewrite($node);
        }, $tree), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT) . PHP_EOL
    );

    $db->commit();
    echo "Categorias oficiais: " . count($flatNodes) . PHP_EOL;
    echo "Templates WSDB importados/atualizados: {$templates}" . PHP_EOL;
    echo "Anuncios reclassificados: {$relinked}" . PHP_EOL;
} catch (Throwable $e) {
    if ($db->inTransaction()) $db->rollBack();
    fwrite(STDERR, $e->getMessage() . PHP_EOL);
    exit(1);
}

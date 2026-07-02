<?php
/**
 * Sync COMPLETO do wsdb.xyz - TODAS as categorias
 */
define('DB_PATH', __DIR__ . '/database/mercado.db');
function getDB() { $db = new PDO('sqlite:' . DB_PATH); $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION); $db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC); return $db; }
function fetchJson($url) { $ctx = stream_context_create(['http' => ['timeout' => 15, 'header' => "Accept: application/json\r\nUser-Agent: MercadoWarspear/1.0\r\n"]]); $data = @file_get_contents($url, false, $ctx); return $data ? json_decode($data, true) : null; }

set_time_limit(900);
$db = getDB();
$base = 'https://wsdb.xyz';

// MAPEAMENTO COMPLETO
$parentCategories = [
    2 => 'Armas',
    3 => 'Armadura de Tecido', 5 => 'Armadura de Tecido',
    6 => 'Armadura Leve', 7 => 'Armadura Pesada',
    38 => 'Acessórios',
    48 => 'Consumíveis', 49 => 'Consumíveis', 50 => 'Consumíveis', 51 => 'Consumíveis',
    9 => 'Aprimoramentos', 10 => 'Aprimoramentos', 43 => 'Aprimoramentos',
    60 => 'Visuais Decorativos',
    70 => 'Recursos',
    73 => 'Relíquias',
    79 => 'Equipamentos Especiais',
    88 => 'Aprimoramentos',
    100 => 'Artefatos',
];

$slotNames = [];
for ($i = 1; $i <= 110; $i++) {
    $data = fetchJson("$base/api/data/item/category/pt/$i");
    if ($data && !empty($data['list'])) {
        foreach ($data['list'] as $sub) {
            $slotNames[(int)$sub['id']] = [
                'name' => $sub['name'] ?? '',
                'parent' => $i,
                'icon' => (int)($sub['icon'] ?? 0)
            ];
        }
    }
}

echo "Encontradas " . count($slotNames) . " subcategorias.\n";

// Limpar
$db->exec('DELETE FROM templates');
$totalItems = 0;
$totalIcons = 0;
$iconDir = __DIR__ . '/images/uploads/templates/';
if (!is_dir($iconDir)) mkdir($iconDir, 0777, true);

function downloadIcon($iconId, $iconDir, &$totalIcons) {
    global $base;
    if ($iconId <= 0) return '';
    $path = $iconDir . $iconId . '.webp';
    if (!file_exists($path)) {
        $d = @file_get_contents("$base/icons/$iconId.webp");
        if ($d) { file_put_contents($path, $d); $totalIcons++; return true; }
    }
    return file_exists($path);
}

$insert = $db->prepare('INSERT OR IGNORE INTO templates (nome, categoria, subcategoria, imagem_url, nivel_min, rarity) VALUES (?, ?, ?, ?, ?, ?)');

foreach ($slotNames as $subId => $subInfo) {
    $subName = $subInfo['name'];
    $parentId = $subInfo['parent'];
    $subIcon = $subInfo['icon'];

    downloadIcon($subIcon, $iconDir, $totalIcons);

    $categoria = $parentCategories[$parentId] ?? 'Outros';
    $subcategoria = $subName;

    $data = fetchJson("$base/api/data/item/items/pt/$subId");
    if (!$data || empty($data['list'])) {
        echo "  $subName: vazio\n";
        continue;
    }

    $count = 0;
    foreach ($data['list'] as $item) {
        $name = $item['name'] ?? '';
        $level = (int)($item['level'] ?? 0);
        $iconId = (int)($item['icon'] ?? 0);
        $color = (int)($item['color'] ?? 0);
        if (empty($name)) continue;

        downloadIcon($iconId, $iconDir, $totalIcons);
        $img = $iconId > 0 ? 'images/uploads/templates/' . $iconId . '.webp' : '';

        $rarityMap = [0 => 'Comum', 1 => 'Incomum', 2 => 'Raro', 3 => 'Épico', 4 => 'Lendário', 5 => 'Mítico'];
        $rarity = $rarityMap[$color] ?? 'Comum';

        try {
            $insert->execute([$name, $categoria, $subcategoria, $img, $level, $rarity]);
            $count++;
        } catch (Exception $e) {}
    }
    $totalItems += $count;
    echo "  $categoria → $subName: $count itens\n";
}

echo "\n✅ TOTAL: $totalItems itens em " . count($slotNames) . " subcategorias\n";
echo "   Ícones baixados: $totalIcons\n";

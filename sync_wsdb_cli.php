<?php
/**
 * CLI script: Sincroniza templates do wsdb.xyz
 * Rode: php sync_wsdb_cli.php
 */
define('DB_PATH', __DIR__ . '/database/mercado.db');

function getDB() {
    $db = new PDO('sqlite:' . DB_PATH);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    return $db;
}

set_time_limit(600);
$db = getDB();
$baseUrl = 'https://wsdb.xyz';

function fetchJson($url) {
    $ctx = stream_context_create(['http' => ['timeout' => 15, 'header' => "Accept: application/json\r\nUser-Agent: MercadoWarspear/1.0\r\n"]]);
    $data = @file_get_contents($url, false, $ctx);
    if ($data === false) return null;
    return json_decode($data, true);
}

$armorSlots = [
    8 => 'Cabeça', 24 => 'Tronco', 25 => 'Mãos', 26 => 'Cintura', 27 => 'Pernas',
    28 => 'Cabeça', 29 => 'Tronco', 30 => 'Mãos', 31 => 'Cintura', 32 => 'Pernas',
    33 => 'Cabeça', 34 => 'Tronco', 35 => 'Mãos', 36 => 'Cintura', 37 => 'Pernas',
];
$armorType = [];
foreach ([8,24,25,26,27] as $s) $armorType[$s] = 'Armadura de Tecido';
foreach ([28,29,30,31,32] as $s) $armorType[$s] = 'Armadura Leve';
foreach ([33,34,35,36,37] as $s) $armorType[$s] = 'Armadura Pesada';

// Limpar
$db->exec('DELETE FROM templates');
echo "Limpo.\n";

$totalItems = 0;
$totalIcons = 0;
$iconDir = __DIR__ . '/images/uploads/templates/';
if (!is_dir($iconDir)) mkdir($iconDir, 0777, true);

// 1. Coletar categorias
$allSubs = [];
for ($catId = 1; $catId <= 15; $catId++) {
    $data = fetchJson("$baseUrl/api/data/item/category/pt/$catId");
    if (!$data || empty($data['list'])) continue;
    foreach ($data['list'] as $sub) {
        $subId = (int)$sub['id'];
        $name = $sub['name'] ?? '';
        $iconId = (int)($sub['icon'] ?? 0);

        if ($iconId > 0) {
            $path = $iconDir . $iconId . '.webp';
            if (!file_exists($path)) {
                $d = @file_get_contents("$baseUrl/icons/$iconId.webp");
                if ($d) { file_put_contents($path, $d); $totalIcons++; }
            }
        }
        $allSubs[] = ['id' => $subId, 'name' => $name, 'icon' => $iconId, 'parent' => $catId];
    }
}
echo count($allSubs) . " subcategorias encontradas.\n";

// 2. Buscar itens de cada subcategoria
$insert = $db->prepare('INSERT OR IGNORE INTO templates (nome, categoria, subcategoria, imagem_url, nivel_min, rarity) VALUES (?, ?, ?, ?, ?, ?)');

foreach ($allSubs as $cat) {
    $subId = $cat['id'];
    $subName = $cat['name'];
    $parentId = $cat['parent'];

    $categoria = 'Outros';
    $subcategoria = $subName;

    if ($parentId == 2) {
        $categoria = 'Armas';
    } elseif (in_array($parentId, [3, 5, 6, 7])) {
        $categoria = $armorType[$subId] ?? 'Armadura';
        $subcategoria = $armorSlots[$subId] ?? $subName;
    } elseif ($parentId == 9) {
        $categoria = 'Aprimoramentos';
    } elseif ($parentId == 10) {
        $categoria = 'Aprimoramentos';
    }

    $data = fetchJson("$baseUrl/api/data/item/items/pt/$subId");
    if (!$data || empty($data['list'])) continue;

    foreach ($data['list'] as $item) {
        $name = $item['name'] ?? '';
        $level = (int)($item['level'] ?? 0);
        $iconId = (int)($item['icon'] ?? 0);
        $color = (int)($item['color'] ?? 0);
        if (empty($name)) continue;

        $rarityMap = [0 => 'Comum', 1 => 'Incomum', 2 => 'Raro', 3 => 'Épico', 4 => 'Lendário', 5 => 'Mítico'];
        $rarity = $rarityMap[$color] ?? 'Comum';

        $img = '';
        if ($iconId > 0) {
            $path = $iconDir . $iconId . '.webp';
            if (!file_exists($path)) {
                $d = @file_get_contents("$baseUrl/icons/$iconId.webp");
                if ($d) { file_put_contents($path, $d); $totalIcons++; }
            }
            $img = 'images/uploads/templates/' . $iconId . '.webp';
        }

        try {
            $insert->execute([$name, $categoria, $subcategoria, $img, $level, $rarity]);
            $totalItems++;
        } catch (Exception $e) {}
    }
    echo "  $subName: OK\n";
}

echo "\n✅ CONCLUÍDO!\n";
echo "   Itens: $totalItems\n";
echo "   Ícones: $totalIcons\n";

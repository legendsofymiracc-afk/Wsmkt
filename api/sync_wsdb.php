<?php
/**
 * Importador de templates do wsdb.xyz
 * Extrai TODOS os equipamentos com ícones e atributos via API pública
 * Uso: curl http://127.0.0.1:8080/api/sync_wsdb.php (admin only)
 */
require_once __DIR__ . '/routes.php';

if (!isAdmin()) {
    http_response_code(401);
    die(json_encode(['error' => 'Acesso restrito ao admin']));
}

set_time_limit(600);
header('Content-Type: application/json; charset=utf-8');

$db = getDB();
$baseUrl = 'https://wsdb.xyz';

// Estrutura de categorias do wsdb.xyz mapeadas para o sistema
$categoryMap = [
    2 => ['nome' => 'Armas', 'nivel' => 1],
    3 => ['nome' => 'Armadura', 'nivel' => 1],
    5 => ['nome' => 'Armadura de Tecido', 'nivel' => 2, 'pai' => 'Armadura'],
    6 => ['nome' => 'Armadura Leve', 'nivel' => 2, 'pai' => 'Armadura'],
    7 => ['nome' => 'Armadura Pesada', 'nivel' => 2, 'pai' => 'Armadura'],
    9 => ['nome' => 'Aprimoramentos', 'nivel' => 1],
    10 => ['nome' => 'Cristais', 'nivel' => 2, 'pai' => 'Aprimoramentos'],
];

$subCategoryNames = [
    4 => 'Adagas', 12 => 'Espadas de uma mão', 13 => 'Espadas de duas mãos',
    14 => 'Machados de uma mão', 15 => 'Machados de duas mãos', 16 => 'Maças de uma mão',
    17 => 'Maças de duas mãos', 18 => 'Lanças', 19 => 'Escudos', 20 => 'Cajados',
    21 => 'Arcos', 22 => 'Bestas',
    8 => 'Cabeça', 24 => 'Tronco', 25 => 'Mãos', 26 => 'Cintura', 27 => 'Pernas',
    28 => 'Cabeça', 29 => 'Tronco', 30 => 'Mãos', 31 => 'Cintura', 32 => 'Pernas',
    33 => 'Cabeça', 34 => 'Tronco', 35 => 'Mãos', 36 => 'Cintura', 37 => 'Pernas',
    10 => 'Cristais', 43 => 'Runas', 47 => 'Amplificação',
    11 => 'Cristais Milagrosos', 46 => 'Cristais Comuns',
];

// Mapeia slots de armadura para os tipos corretos
$armorSlots = [
    8 => 'Cabeça', 24 => 'Tronco', 25 => 'Mãos', 26 => 'Cintura', 27 => 'Pernas',
    28 => 'Cabeça', 29 => 'Tronco', 30 => 'Mãos', 31 => 'Cintura', 32 => 'Pernas',
    33 => 'Cabeça', 34 => 'Tronco', 35 => 'Mãos', 36 => 'Cintura', 37 => 'Pernas',
];

// Armadura: mapeia subcategorias para tipo (tecido/leve/pesada)
$armorType = [];
foreach ([8,24,25,26,27] as $s) $armorType[$s] = 'Armadura de Tecido';
foreach ([28,29,30,31,32] as $s) $armorType[$s] = 'Armadura Leve';
foreach ([33,34,35,36,37] as $s) $armorType[$s] = 'Armadura Pesada';

function fetchJson($url) {
    $ctx = stream_context_create(['http' => ['timeout' => 15, 'header' => "Accept: application/json\r\nUser-Agent: MercadoWarspear/1.0\r\n"]]);
    $data = @file_get_contents($url, false, $ctx);
    if ($data === false) return null;
    return json_decode($data, true);
}

// Limpar templates existentes
$db->exec('DELETE FROM templates');
echo json_encode(['status' => 'limpando']) . "\n";
flush();

$totalItems = 0;
$totalIcons = 0;
$iconDir = __DIR__ . '/../images/uploads/templates/';
if (!is_dir($iconDir)) mkdir($iconDir, 0777, true);

// 1. Coletar todas as categorias principais
$allCategories = [];
for ($catId = 1; $catId <= 15; $catId++) {
    $data = fetchJson("$baseUrl/api/data/item/category/pt/$catId");
    if (!$data || empty($data['list'])) continue;

    foreach ($data['list'] as $sub) {
        $subId = (int)$sub['id'];
        $subName = $sub['name'] ?? '';
        $iconId = (int)($sub['icon'] ?? 0);

        // Download icon if available
        if ($iconId > 0) {
            $iconPath = $iconDir . $iconId . '.webp';
            if (!file_exists($iconPath)) {
                $iconData = @file_get_contents("$baseUrl/icons/$iconId.webp");
                if ($iconData) {
                    file_put_contents($iconPath, $iconData);
                    $totalIcons++;
                }
            }
        }

        $allCategories[] = ['id' => $subId, 'name' => $subName, 'icon' => $iconId, 'parent' => $catId];
    }
}

echo json_encode(['status' => 'categorias', 'count' => count($allCategories)]) . "\n";
flush();

// 2. Para cada subcategoria, buscar itens
$insertStmt = $db->prepare('INSERT OR IGNORE INTO templates (nome, categoria, subcategoria, imagem_url, nivel_min, rarity) VALUES (?, ?, ?, ?, ?, ?)');

foreach ($allCategories as $cat) {
    $subId = $cat['id'];
    $subName = $cat['name'];
    $parentId = $cat['parent'];

    // Determinar categoria e subcategoria no nosso sistema
    $categoria = 'Outros';
    $subcategoria = $subName;

    if ($parentId == 2) {
        // Armas
        $categoria = 'Armas';
        $subcategoria = $subName;
    } elseif (in_array($parentId, [3, 5, 6, 7])) {
        // Armaduras
        $categoria = $armorType[$subId] ?? 'Armadura';
        $subcategoria = $armorSlots[$subId] ?? $subName;
    } elseif ($parentId == 9) {
        $categoria = 'Aprimoramentos';
    } elseif ($parentId == 10) {
        $categoria = 'Aprimoramentos';
        $subcategoria = $subName;
    }

    $data = fetchJson("$baseUrl/api/data/item/items/pt/$subId");
    if (!$data || empty($data['list'])) continue;

    foreach ($data['list'] as $item) {
        $itemId = (int)$item['id'];
        $name = $item['name'] ?? '';
        $level = (int)($item['level'] ?? 0);
        $iconId = (int)($item['icon'] ?? 0);
        $color = (int)($item['color'] ?? 0);

        if (empty($name)) continue;

        // Raridade baseada no color
        $rarityMap = [0 => 'Comum', 1 => 'Incomum', 2 => 'Raro', 3 => 'Épico', 4 => 'Lendário', 5 => 'Mítico'];
        $rarity = $rarityMap[$color] ?? 'Comum';

        // Download icon
        $imagemUrl = '';
        if ($iconId > 0) {
            $iconPath = $iconDir . $iconId . '.webp';
            if (!file_exists($iconPath)) {
                $iconData = @file_get_contents("$baseUrl/icons/$iconId.webp");
                if ($iconData) {
                    file_put_contents($iconPath, $iconData);
                    $totalIcons++;
                }
            }
            $imagemUrl = 'images/uploads/templates/' . $iconId . '.webp';
        }

        try {
            $insertStmt->execute([$name, $categoria, $subcategoria, $imagemUrl, $level, $rarity]);
            $totalItems++;
        } catch (Exception $e) {
            // Skip duplicates
        }
    }

    echo json_encode(['status' => 'progresso', 'subcategoria' => $subName, 'itens' => $totalItems]) . "\n";
    flush();
}

echo json_encode([
    'success' => true,
    'itens_importados' => $totalItems,
    'icones_baixados' => $totalIcons,
    'categorias' => count($allCategories),
    'mensagem' => 'Dados extraídos do wsdb.xyz com sucesso!'
], JSON_PRETTY_PRINT);

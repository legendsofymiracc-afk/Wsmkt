<?php
/**
 * Baixa atributos detalhados de TODOS os templates via API pública do wsdb.xyz
 * Rode: php sync_attributes.php
 */
define('DB_PATH', __DIR__ . '/database/mercado.db');
function getDB() { $db = new PDO('sqlite:' . DB_PATH); $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION); $db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC); return $db; }
function fetchJson($url) { $ctx = stream_context_create(['http' => ['timeout' => 10, 'header' => "Accept: application/json\r\nUser-Agent: MercadoWarspear/1.0\r\n"]]); $data = @file_get_contents($url, false, $ctx); return $data ? json_decode($data, true) : null; }

set_time_limit(3600);
$db = getDB();
$base = 'https://wsdb.xyz';

// PEGA TODOS OS ITENS DA API
echo "🔍 Buscando todos os itens da API...\n";

$allItems = [];
for ($catId = 1; $catId <= 110; $catId++) {
    $cats = fetchJson("$base/api/data/item/category/pt/$catId");
    if (!$cats || empty($cats['list'])) continue;
    foreach ($cats['list'] as $sub) {
        $items = fetchJson("$base/api/data/item/items/pt/" . $sub['id']);
        if (!$items || empty($items['list'])) continue;
        foreach ($items['list'] as $item) {
            $allItems[(int)$item['id']] = ['name' => $item['name'], 'sub' => $sub['name']];
        }
        echo "  " . $sub['name'] . ": " . count($items['list']) . "\n";
    }
}
echo count($allItems) . " itens encontrados.\n\n";

// BUSCA ATRIBUTOS DETALHADOS
echo "📊 Buscando atributos detalhados...\n";

// Adiciona coluna de atributos se não existir
try { $db->exec('ALTER TABLE templates ADD COLUMN atributos_detalhes TEXT DEFAULT "{}"'); } catch (Exception $e) {}

$update = $db->prepare('UPDATE templates SET atributos = ?, atributos_detalhes = ? WHERE nome = ?');
$insert = $db->prepare('INSERT OR IGNORE INTO templates (nome, categoria, subcategoria, imagem_url, nivel_min, rarity, atributos, atributos_detalhes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');

$count = 0;
$withDetails = 0;
$batch = [];

foreach ($allItems as $id => $info) {
    $count++;

    // Busca detalhes em lotes
    $detail = fetchJson("$base/api/data/item/pt/$id");
    if (!$detail) continue;

    $withDetails++;
    $name = $detail['name'] ?? $info['name'];
    $level = (int)($detail['level'] ?? 0);
    $color = (int)($detail['color'] ?? 0);
    $iconId = (int)($detail['icon'] ?? 0);

    // Extrai atributos relevantes
    $attrs = [
        'level' => $level,
        'color' => $color,
        'itemType' => (int)($detail['itemType'] ?? 0),
    ];

    // Bônus do item
    for ($i = 1; $i <= 4; $i++) {
        if (!empty($detail["bonus{$i}Name"])) {
            $attrs["bonus{$i}"] = [
                'name' => $detail["bonus{$i}Name"],
                'value' => (int)($detail["value{$i}"] ?? 0),
                'icon' => (int)($detail["bonus{$i}Icon"] ?? 0),
            ];
        }
    }

    // Habilidade
    if (!empty($detail['skillName'])) {
        $attrs['skill'] = ['name' => $detail['skillName'], 'icon' => (int)($detail['skillIcon'] ?? 0)];
    }

    // Set
    if (!empty($detail['itemSet'])) {
        $attrs['itemSet'] = $detail['itemSet'];
        for ($i = 1; $i <= 2; $i++) {
            if (!empty($detail["setBonus{$i}Name"])) {
                $attrs["setBonus{$i}"] = ['name' => $detail["setBonus{$i}Name"], 'value' => (int)($detail["setValue{$i}"] ?? 0)];
            }
        }
    }

    $rarityMap = [0 => 'Comum', 1 => 'Incomum', 2 => 'Raro', 3 => 'Épico', 4 => 'Lendário', 5 => 'Mítico'];
    $rarity = $rarityMap[$color] ?? 'Comum';
    $img = $iconId > 0 ? 'images/uploads/templates/' . $iconId . '.webp' : '';

    // Determina categoria
    $categoria = 'Outros';
    $subcategoria = $info['sub'];
    if (in_array($info['sub'], ['Adagas','Espadas de uma mão','Espadas de duas mãos','Machados de uma mão','Machados de duas mãos','Maças de uma mão','Maças de duas mãos','Lanças','Escudos','Cajados','Arcos','Bestas'])) {
        $categoria = 'Armas';
    } elseif (in_array($info['sub'], ['Cabeça','Tronco','Mãos','Cintura','Pernas'])) {
        $categoria = 'Armadura';
    } elseif (in_array($info['sub'], ['Capotes','Anéis','Amuletos','Braceletes'])) {
        $categoria = 'Acessórios';
    } elseif (in_array($info['sub'], ['Alimento','Poções','Pergaminhos','Artefatos','Poções milagrosas','Poções comuns','Pergaminhos milagrosos','Pergaminhos comuns'])) {
        $categoria = 'Consumíveis';
    } elseif (in_array($info['sub'], ['Aprimoramento','Ataque','Defesa','Grupo'])) {
        $categoria = 'Relíquias';
    }

    try {
        $update->execute([json_encode($attrs), json_encode($detail), $name]);
    } catch (Exception $e) {
        try {
            $insert->execute([$name, $categoria, $subcategoria, $img, $level, $rarity, json_encode($attrs), json_encode($detail)]);
        } catch (Exception $e2) {}
    }

    if ($count % 100 === 0) {
        echo "  $count/" . count($allItems) . " ($withDetails com detalhes)\n";
    }

    // Delay para não sobrecarregar
    if ($count % 20 === 0) usleep(100000);
}

echo "\n✅ CONCLUÍDO!\n";
echo "   Total processado: $count\n";
echo "   Com detalhes: $withDetails\n";

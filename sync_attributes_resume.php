<?php
// Continua de onde parou - só processa itens SEM atributos
define('DB_PATH', __DIR__ . '/database/mercado.db');
function getDB() { $db = new PDO('sqlite:' . DB_PATH); $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION); $db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC); return $db; }

set_time_limit(3600);
$db = getDB();
$base = 'https://wsdb.xyz';

// Pega só IDs que faltam processar
$allIds = [];
for ($cat = 1; $cat <= 110; $cat++) {
    $cats = json_decode(@file_get_contents("$base/api/data/item/category/pt/$cat", false, stream_context_create(['http'=>['timeout'=>10,'header'=>"Accept: application/json\r\n"]])) ?: '{}', true);
    if (!$cats || empty($cats['list'])) continue;
    foreach ($cats['list'] as $sub) {
        $items = json_decode(@file_get_contents("$base/api/data/item/items/pt/{$sub['id']}", false, stream_context_create(['http'=>['timeout'=>10,'header'=>"Accept: application/json\r\n"]])) ?: '{}', true);
        if (!$items || empty($items['list'])) continue;
        foreach ($items['list'] as $item) {
            $name = $item['name'] ?? '';
            if ($name) $allIds[(int)$item['id']] = ['name' => $name, 'sub' => $sub['name'], 'icon' => (int)($item['icon'] ?? 0), 'level' => (int)($item['level'] ?? 0), 'color' => (int)($item['color'] ?? 0)];
        }
    }
}

// Verifica quais já têm atributos
$existing = $db->query("SELECT nome FROM templates WHERE atributos_detalhes != '{}'")->fetchAll(PDO::FETCH_COLUMN);
$existingNames = array_flip($existing);

$pending = [];
foreach ($allIds as $id => $info) {
    if (!isset($existingNames[$info['name']])) $pending[$id] = $info;
}
echo count($pending) . " pendentes de " . count($allIds) . "\n";

if (count($pending) === 0) { echo "✅ TUDO JÁ SINCRONIZADO!\n"; exit; }

$update = $db->prepare('UPDATE templates SET atributos = ?, atributos_detalhes = ?, nivel_min = ?, rarity = ? WHERE nome = ?');
$insert = $db->prepare('INSERT OR IGNORE INTO templates (nome, categoria, subcategoria, imagem_url, nivel_min, rarity, atributos, atributos_detalhes) VALUES (?,?,?,?,?,?,?,?)');

$catMap = [
    'Adagas'=>'Armas','Espadas de uma mão'=>'Armas','Espadas de duas mãos'=>'Armas','Machados de uma mão'=>'Armas','Machados de duas mãos'=>'Armas','Maças de uma mão'=>'Armas','Maças de duas mãos'=>'Armas','Lanças'=>'Armas','Escudos'=>'Armas','Cajados'=>'Armas','Arcos'=>'Armas','Bestas'=>'Armas',
    'Cabeça'=>'Armadura','Tronco'=>'Armadura','Mãos'=>'Armadura','Cintura'=>'Armadura','Pernas'=>'Armadura',
    'Capotes'=>'Acessórios','Anéis'=>'Acessórios','Amuletos'=>'Acessórios','Braceletes'=>'Acessórios',
    'Poções'=>'Consumíveis','Poções milagrosas'=>'Consumíveis','Poções comuns'=>'Consumíveis','Pergaminhos'=>'Consumíveis','Pergaminhos milagrosos'=>'Consumíveis','Pergaminhos comuns'=>'Consumíveis','Alimento'=>'Consumíveis','Alimentos milagrosos'=>'Consumíveis','Alimentos comuns'=>'Consumíveis','Artefatos'=>'Consumíveis',
    'Aprimoramento'=>'Relíquias','Ataque'=>'Relíquias','Defesa'=>'Relíquias','Grupo'=>'Relíquias',
];

$count = 0;
foreach ($pending as $id => $info) {
    $detail = json_decode(@file_get_contents("$base/api/data/item/pt/$id", false, stream_context_create(['http'=>['timeout'=>8,'header'=>"Accept: application/json\r\n"]])), true);
    if (!$detail) continue;

    $name = $detail['name'] ?? $info['name'];
    $level = (int)($detail['level'] ?? 0);
    $color = (int)($detail['color'] ?? 0);
    $iconId = (int)($detail['icon'] ?? 0);
    $rarityMap = [0=>'Comum',1=>'Incomum',2=>'Raro',3=>'Épico',4=>'Lendário',5=>'Mítico'];
    $rarity = $rarityMap[$color] ?? 'Comum';
    $img = $iconId>0 ? 'images/uploads/templates/'.$iconId.'.webp' : '';
    $categoria = $catMap[$info['sub']] ?? 'Outros';

    $attrs = ['level'=>$level,'color'=>$color,'itemType'=>(int)($detail['itemType']??0)];
    for ($i=1;$i<=4;$i++) {
        if (!empty($detail["bonus{$i}Name"])) $attrs["bonus{$i}"] = ['name'=>$detail["bonus{$i}Name"],'value'=>(int)($detail["value{$i}"]??0),'icon'=>(int)($detail["bonus{$i}Icon"]??0)];
    }
    if (!empty($detail['skillName'])) $attrs['skill'] = ['name'=>$detail['skillName'],'icon'=>(int)($detail['skillIcon']??0)];
    if (!empty($detail['itemSet'])) {
        $attrs['itemSet']=$detail['itemSet'];
        for ($i=1;$i<=2;$i++) {
            if (!empty($detail["setBonus{$i}Name"])) $attrs["setBonus{$i}"] = ['name'=>$detail["setBonus{$i}Name"],'value'=>(int)($detail["setValue{$i}"]??0)];
        }
    }

    try {
        $update->execute([json_encode($attrs), json_encode($detail), $level, $rarity, $name]);
        if ($update->rowCount()===0) {
            $insert->execute([$name,$categoria,$info['sub'],$img,$level,$rarity,json_encode($attrs),json_encode($detail)]);
        }
        $count++;
        if ($count%200===0) echo "$count/".count($pending)."\n";
    } catch(Exception $e) {}

    if ($count%20===0) usleep(50000);
}
echo "\n✅ +$count atributos adicionados!\n";

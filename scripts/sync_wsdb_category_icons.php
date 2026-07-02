<?php
declare(strict_types=1);

/**
 * Sincroniza imagens de categorias com icones oficiais do WSDB.
 *
 * Uso:
 *   C:\xampp\php\php.exe scripts\sync_wsdb_category_icons.php
 */

$root = dirname(__DIR__);
$dbPath = $root . '/database/mercado.db';
$targetDir = $root . '/images/uploads/wsdb_categories';
$seedPath = $root . '/database/categories.seed.json';

if (!is_dir($targetDir)) {
    mkdir($targetDir, 0777, true);
}

$pathIcons = [
    'Baús' => 2244,
    'Pacotes de Iniciante' => 2306,
    'Armas' => 1423,
    'Armas > Adagas' => 1106,
    'Armas > Espadas de uma mão' => 1423,
    'Armas > Espadas de duas mãos' => 1391,
    'Armas > Machados de uma mão' => 1049,
    'Armas > Machados de duas mãos' => 1037,
    'Armas > Maças de uma mão' => 1115,
    'Armas > Maças de duas mãos' => 1091,
    'Armas > Lanças' => 1217,
    'Armas > Escudos' => 1202,
    'Armas > Cajados' => 1235,
    'Armas > Arcos' => 1076,
    'Armas > Bestas' => 1376,
    'Armadura' => 1620,
    'Armadura > Armadura de Tecido' => 1533,
    'Armadura > Armadura de Tecido > Cabeça' => 1313,
    'Armadura > Armadura de Tecido > Tronco' => 1527,
    'Armadura > Armadura de Tecido > Mãos' => 1453,
    'Armadura > Armadura de Tecido > Cintura' => 974,
    'Armadura > Armadura de Tecido > Pernas' => 1698,
    'Armadura > Armadura Leve' => 1602,
    'Armadura > Armadura Leve > Cabeça' => 1647,
    'Armadura > Armadura Leve > Tronco' => 1602,
    'Armadura > Armadura Leve > Mãos' => 1479,
    'Armadura > Armadura Leve > Cintura' => 980,
    'Armadura > Armadura Leve > Pernas' => 1725,
    'Armadura > Armadura Pesada' => 1277,
    'Armadura > Armadura Pesada > Cabeça' => 1283,
    'Armadura > Armadura Pesada > Tronco' => 1268,
    'Armadura > Armadura Pesada > Mãos' => 1497,
    'Armadura > Armadura Pesada > Cintura' => 995,
    'Armadura > Armadura Pesada > Pernas' => 1722,
    'Acessórios' => 1758,
    'Acessórios > Braceletes' => 7223,
    'Acessórios > Capotes' => 1581,
    'Acessórios > Anéis' => 1154,
    'Acessórios > Amuletos' => 1758,
    'Aprimoramentos' => 2250,
    'Aprimoramentos > Runas' => 2269,
    'Aprimoramentos > Cristais' => 2270,
    'Aprimoramentos > Amplificação' => 2238,
    'Consumíveis' => 2173,
    'Consumíveis > Alimento' => 622,
    'Consumíveis > Poções' => 2173,
    'Consumíveis > Poções comuns' => 2173,
    'Consumíveis > Poções milagrosas' => 2173,
    'Consumíveis > Pergaminhos' => 2183,
    'Consumíveis > Pergaminhos comuns' => 2183,
    'Consumíveis > Pergaminhos milagrosos' => 2183,
    'Consumíveis > Artefatos' => 7224,
    'Consumíveis > Evento' => 7224,
    'Utilidades' => 1869,
    'Lacaios' => 2729,
    'Relíquias' => 3699,
    'Relíquias > Aprimoramento' => 3700,
    'Relíquias > Ataque' => 3671,
    'Relíquias > Defesa' => 3677,
    'Relíquias > Grupo' => 4397,
    'Livros de Habilidade' => 2848,
    'Visuais Decorativos' => 2674,
    'Visuais Decorativos > Armas de uma Mão' => 1423,
    'Visuais Decorativos > Armas Corpo a Corpo de Duas Mãos' => 1037,
    'Visuais Decorativos > Cajados' => 1229,
    'Visuais Decorativos > Arcos' => 1076,
    'Visuais Decorativos > Bestas' => 1367,
    'Visuais Decorativos > Escudos' => 1202,
    'Visuais Decorativos > Pergaminho da Purificação' => 2684,
    'Trajes Luxuosos' => 1779,
    'Sorrisos' => 3116,
    'Recursos' => 2915,
    'Recursos > Substâncias' => 4524,
    'Recursos > Essências' => 2963,
    'Recursos > Catalizadores' => 235,
    'Recursos > Recursos de Artesanato' => 3286,
    'Recursos > Recursos de Castelo' => 4066,
    'Saquear' => 915,
];

function localIconPath(int $iconId): string {
    return 'images/uploads/wsdb_categories/' . $iconId . '.webp';
}

function downloadIcon(int $iconId, string $targetDir): bool {
    $target = $targetDir . '/' . $iconId . '.webp';
    if (is_file($target)) {
        return true;
    }
    $ctx = stream_context_create([
        'http' => [
            'timeout' => 20,
            'header' => "User-Agent: MercadoWarspear/1.0\r\nAccept: image/webp,*/*\r\n",
        ],
    ]);
    $data = @file_get_contents('https://wsdb.xyz/icons/' . $iconId . '.webp', false, $ctx);
    if ($data === false || $data === '') {
        return false;
    }
    file_put_contents($target, $data);
    return true;
}

function findCategoryId(PDO $db, array $parts): ?int {
    $parentId = 0;
    foreach ($parts as $index => $name) {
        $level = $index + 1;
        $stmt = $db->prepare('SELECT id FROM categorias WHERE nome = ? AND nivel = ? AND id_pai = ? LIMIT 1');
        $stmt->execute([$name, $level, $parentId]);
        $id = $stmt->fetchColumn();
        if ($id === false) {
            return null;
        }
        $parentId = (int)$id;
    }
    return $parentId;
}

$downloaded = 0;
$failed = [];
foreach (array_unique(array_values($pathIcons)) as $iconId) {
    if (downloadIcon((int)$iconId, $targetDir)) {
        $downloaded++;
    } else {
        $failed[] = (int)$iconId;
    }
}

$db = new PDO('sqlite:' . $dbPath);
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$update = $db->prepare('UPDATE categorias SET imagem_url = ? WHERE id = ?');

$updated = 0;
$missingPaths = [];
$db->beginTransaction();
foreach ($pathIcons as $path => $iconId) {
    if (in_array((int)$iconId, $failed, true)) {
        continue;
    }
    $parts = array_map('trim', explode('>', $path));
    $id = findCategoryId($db, $parts);
    if (!$id) {
        $missingPaths[] = $path;
        continue;
    }
    $update->execute([localIconPath((int)$iconId), $id]);
    $updated += $update->rowCount();
}
$db->commit();

if (is_file($seedPath)) {
    $seed = json_decode(file_get_contents($seedPath), true);
    $rewrite = function (array &$nodes, array $parents = []) use (&$rewrite, $pathIcons): void {
        foreach ($nodes as &$node) {
            $path = implode(' > ', array_merge($parents, [(string)($node['nome'] ?? '')]));
            if (isset($pathIcons[$path])) {
                $node['imagem_url'] = localIconPath((int)$pathIcons[$path]);
            }
            if (!empty($node['filhos']) && is_array($node['filhos'])) {
                $rewrite($node['filhos'], array_merge($parents, [(string)$node['nome']]));
            }
        }
    };
    if (is_array($seed)) {
        $rewrite($seed);
        file_put_contents($seedPath, json_encode($seed, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT) . PHP_EOL);
    }
}

echo "Icones WSDB disponiveis: {$downloaded}\n";
echo "Categorias atualizadas no banco: {$updated}\n";
if ($missingPaths) {
    echo "Caminhos nao encontrados no banco: " . implode('; ', $missingPaths) . "\n";
}
if ($failed) {
    echo "Falhas de download: " . implode(', ', $failed) . "\n";
}

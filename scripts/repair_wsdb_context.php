<?php
declare(strict_types=1);

/**
 * Repara o contexto WSDB local:
 * - alinha imagens de categorias com assets semanticos locais;
 * - cria subcategorias que existem nos templates importados;
 * - vincula itens aos templates por nome exato;
 * - corrige categoria/subcategoria e imagem do item a partir do template.
 *
 * Uso:
 *   C:\xampp\php\php.exe scripts\repair_wsdb_context.php
 */

$dbPath = __DIR__ . '/../database/mercado.db';
if (!is_file($dbPath)) {
    fwrite(STDERR, "Banco nao encontrado: {$dbPath}\n");
    exit(1);
}

$db = new PDO('sqlite:' . $dbPath);
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

$assetRoot = __DIR__ . '/../';

function imageExists(string $relativePath): bool {
    global $assetRoot;
    return $relativePath !== '' && is_file($assetRoot . str_replace('/', DIRECTORY_SEPARATOR, $relativePath));
}

function getCategory(PDO $db, string $name, int $level, int $parentId): ?array {
    $stmt = $db->prepare('SELECT id, nome, imagem_url FROM categorias WHERE nome = ? AND nivel = ? AND id_pai = ? LIMIT 1');
    $stmt->execute([$name, $level, $parentId]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function ensureCategory(PDO $db, string $name, int $level, int $parentId, string $image = ''): int {
    $found = getCategory($db, $name, $level, $parentId);
    if ($found) {
        if ($image !== '' && imageExists($image) && ($found['imagem_url'] ?? '') !== $image) {
            $stmt = $db->prepare('UPDATE categorias SET imagem_url = ? WHERE id = ?');
            $stmt->execute([$image, (int)$found['id']]);
        }
        return (int)$found['id'];
    }

    $stmt = $db->prepare('INSERT INTO categorias (id_pai, nome, nivel, imagem_url) VALUES (?, ?, ?, ?)');
    $stmt->execute([$parentId, $name, $level, $image]);
    return (int)$db->lastInsertId();
}

$categoryImages = [
    'Baús' => 'images/uploads/baus.png',
    'Pacotes de Iniciante' => 'images/uploads/pacotes.jpg',
    'Armas' => 'images/uploads/armas.png',
    'Armadura' => 'images/uploads/armadura.png',
    'Armadura de Tecido' => 'images/uploads/armadura_tecido.png',
    'Armadura Leve' => 'images/uploads/armadura_leve.png',
    'Armadura Pesada' => 'images/uploads/armadura_pesada.png',
    'Acessórios' => 'images/uploads/acessorios.png',
    'Braceletes' => 'images/uploads/braceletes.png',
    'Capotes' => 'images/uploads/capotes.png',
    'Anéis' => 'images/uploads/aneis.png',
    'Amuletos' => 'images/uploads/amuletos.png',
    'Aprimoramentos' => 'images/uploads/aprimoramentos.png',
    'Runas' => 'images/uploads/runas.png',
    'Cristais' => 'images/uploads/cristais.png',
    'Amplificação' => 'images/uploads/amplificacao.jpg',
    'Consumíveis' => 'images/uploads/consumiveis.png',
    'Alimento' => 'images/uploads/alimento.png',
    'Poções' => 'images/uploads/pocoes.png',
    'Poções comuns' => 'images/uploads/pocoes.png',
    'Poções milagrosas' => 'images/uploads/pocoes.png',
    'Pergaminhos' => 'images/uploads/pergaminhos.png',
    'Pergaminhos comuns' => 'images/uploads/pergaminhos.png',
    'Pergaminhos milagrosos' => 'images/uploads/pergaminhos.png',
    'Artefatos' => 'images/uploads/artefatos.png',
    'Evento' => 'images/uploads/artefatos.png',
    'Utilidades' => 'images/uploads/utilidades.jpg',
    'Lacaios' => 'images/uploads/lacaios.jpg',
    'Relíquias' => 'images/uploads/reliquias.jpg',
    'Aprimoramento' => 'images/uploads/aprimoramento.jpg',
    'Ataque' => 'images/uploads/ataque.jpg',
    'Defesa' => 'images/uploads/defesa.jpg',
    'Grupo' => 'images/uploads/grupo.jpg',
    'Livros de Habilidade' => 'images/uploads/livros.jpg',
    'Visuais Decorativos' => 'images/uploads/visuais.png',
    'Armas de uma Mão' => 'images/uploads/armas_uma_mao.png',
    'Armas Corpo a Corpo de Duas Mãos' => 'images/uploads/armas_duas_maos.png',
    'Cajados' => 'images/uploads/cajados.png',
    'Arcos' => 'images/uploads/arcos.png',
    'Bestas' => 'images/uploads/bestas.png',
    'Escudos' => 'images/uploads/escudos.png',
    'Pergaminho da Purificação' => 'images/uploads/pergaminho.jpg',
    'Trajes Luxuosos' => 'images/uploads/trajes.jpg',
    'Sorrisos' => 'images/uploads/sorrisos.jpg',
    'Recursos' => 'images/uploads/recursos.png',
    'Substâncias' => 'images/uploads/subatancias.jpg',
    'Essências' => 'images/uploads/essencias.png',
    'Catalizadores' => 'images/uploads/catalizadores.jpg',
    'Recursos de Artesanato' => 'images/uploads/recursos_artesanato.png',
    'Recursos de Castelo' => 'images/uploads/recursos_castelo.png',
    'Saquear' => 'images/uploads/saquear.png',
];

function imageFor(string $name): string {
    $wsdbIcons = [
        'Braceletes' => 7223,
        'Capotes' => 1581,
        'Anéis' => 1154,
        'Amuletos' => 1758,
        'Escudos' => 1202,
        'Cajados' => 1235,
        'Arcos' => 1076,
        'Bestas' => 1376,
        'Poções comuns' => 2173,
        'Poções milagrosas' => 2173,
        'Pergaminhos comuns' => 2183,
        'Pergaminhos milagrosos' => 2183,
        'Evento' => 7224,
        'Aprimoramento' => 3700,
        'Ataque' => 3671,
        'Defesa' => 3677,
        'Grupo' => 4397,
    ];
    if (isset($wsdbIcons[$name])) {
        $wsdbPath = 'images/uploads/wsdb_categories/' . $wsdbIcons[$name] . '.webp';
        if (imageExists($wsdbPath)) {
            return $wsdbPath;
        }
    }
    global $categoryImages;
    $path = $categoryImages[$name] ?? '';
    return imageExists($path) ? $path : '';
}

function resolveTemplatePath(PDO $db, string $categoria, string $subcategoria): ?array {
    $categoria = trim($categoria);
    $subcategoria = trim($subcategoria);
    if ($categoria === '') {
        return null;
    }

    $root = getCategory($db, $categoria, 1, 0);
    if ($root) {
        if ($subcategoria === '') {
            return ['id_geral' => (int)$root['id'], 'id_categoria' => null, 'id_subcategoria' => null];
        }
        $catId = ensureCategory($db, $subcategoria, 2, (int)$root['id'], imageFor($subcategoria));
        return ['id_geral' => null, 'id_categoria' => $catId, 'id_subcategoria' => null];
    }

    $stmt = $db->prepare('SELECT c.id, c.id_pai FROM categorias c WHERE c.nome = ? AND c.nivel = 2 ORDER BY c.id LIMIT 1');
    $stmt->execute([$categoria]);
    $category = $stmt->fetch();
    if ($category) {
        if ($subcategoria === '') {
            return ['id_geral' => null, 'id_categoria' => (int)$category['id'], 'id_subcategoria' => null];
        }
        $subId = ensureCategory($db, $subcategoria, 3, (int)$category['id'], imageFor($subcategoria));
        return ['id_geral' => null, 'id_categoria' => null, 'id_subcategoria' => $subId];
    }

    return null;
}

$db->beginTransaction();
try {
    $createdFromTemplates = 0;
    $pairs = $db->query('SELECT DISTINCT categoria, subcategoria FROM templates ORDER BY categoria, subcategoria')->fetchAll();
    foreach ($pairs as $pair) {
        $before = (int)$db->query('SELECT COUNT(*) FROM categorias')->fetchColumn();
        resolveTemplatePath($db, (string)$pair['categoria'], (string)$pair['subcategoria']);
        $after = (int)$db->query('SELECT COUNT(*) FROM categorias')->fetchColumn();
        $createdFromTemplates += max(0, $after - $before);
    }

    $items = $db->query('SELECT id, nome FROM itens ORDER BY id')->fetchAll();
    $templateStmt = $db->prepare('SELECT * FROM templates WHERE nome = ? ORDER BY id LIMIT 1');
    $updateItem = $db->prepare('UPDATE itens SET id_subcategoria = ?, id_categoria = ?, id_geral = ?, id_template = ?, imagem_url = ? WHERE id = ?');

    $linkedItems = 0;
    $unmatchedItems = [];
    foreach ($items as $item) {
        $templateStmt->execute([(string)$item['nome']]);
        $template = $templateStmt->fetch();
        if (!$template) {
            $unmatchedItems[] = (string)$item['nome'];
            continue;
        }

        $path = resolveTemplatePath($db, (string)$template['categoria'], (string)$template['subcategoria']);
        if (!$path) {
            $unmatchedItems[] = (string)$item['nome'];
            continue;
        }

        $updateItem->execute([
            $path['id_subcategoria'],
            $path['id_categoria'],
            $path['id_geral'],
            (int)$template['id'],
            (string)$template['imagem_url'],
            (int)$item['id'],
        ]);
        $linkedItems++;
    }

    $db->commit();

    echo "Categorias criadas a partir dos templates: {$createdFromTemplates}\n";
    echo "Itens vinculados/reclassificados: {$linkedItems}\n";
    if ($unmatchedItems) {
        echo "Itens sem template exato: " . implode(', ', $unmatchedItems) . "\n";
    }
} catch (Throwable $e) {
    if ($db->inTransaction()) {
        $db->rollBack();
    }
    fwrite(STDERR, "Falha no reparo: " . $e->getMessage() . "\n");
    exit(1);
}

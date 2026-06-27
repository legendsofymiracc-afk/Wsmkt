<?php
/**
 * Seed templates table from items_market_catalog.json
 *
 * Uso:   php seed_templates.php
 *        curl http://127.0.0.1:8080/api/seed_templates.php
 *
 * Le o JSON do catálogo, filtra itens com ícone,
 * e insere como templates (preenchíveis por vendedores).
 */

require_once __DIR__ . '/routes.php';

if (!isAdmin()) {
    http_response_code(401);
    echo json_encode(['error' => 'Acesso negado']);
    exit;
}

set_time_limit(120);

$jsonPath = __DIR__ . '/../market_item_database_assets/items_market_catalog.json';
$iconsDir = __DIR__ . '/../images/uploads/templates/';

if (!file_exists($jsonPath)) {
    http_response_code(500);
    echo json_encode(['error' => 'Arquivo JSON não encontrado: ' . $jsonPath]);
    exit;
}

$raw = json_decode(file_get_contents($jsonPath), true);
$items = $raw['items'] ?? [];

$db = getDB();
$inserted = 0;
$skipped = 0;
$errors = 0;

// Previne duplicatas: pula se item_id já existe
$existing = [];
$stmt = $db->query('SELECT item_id FROM templates WHERE item_id > 0');
foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
    $existing[(int)$row['item_id']] = true;
}

// Mapa de category_label -> (categoria, subcategoria)
$catMap = [
    'Poção/Elixir' => ['categoria' => 'Consumíveis', 'subcategoria' => 'Poções'],
    'Relíquia'     => ['categoria' => 'Relíquias', 'subcategoria' => 'Aprimoramento'],
    'Evento'       => ['categoria' => 'Consumíveis', 'subcategoria' => 'Evento'],
];

$insertStmt = $db->prepare('INSERT INTO templates (nome, item_id, categoria, subcategoria, imagem_url, atributos, origem) VALUES (?, ?, ?, ?, ?, ?, ?)');

$db->beginTransaction();
try {
    foreach ($items as $item) {
        // Só importa itens com ícone
        if (empty($item['has_icon_by_same_id'])) {
            continue;
        }

        $itemId = (int)($item['item_id'] ?? 0);
        if ($itemId > 0 && isset($existing[$itemId])) {
            $skipped++;
            continue;
        }

        $nome = trim($item['name_exact'] ?? '');
        if (empty($nome)) {
            $nome = trim($item['name_original'] ?? '');
        }
        if (empty($nome)) {
            $nome = 'Item #' . $itemId;
        }

        // Determina categoria pelo label
        $label = $item['category_label'] ?? 'Outros Efeitos';
        $cat = $catMap[$label] ?? ['categoria' => 'Utilidades', 'subcategoria' => ''];

        // Caminho do ícone
        $iconPath = $item['icon_path'] ?? '';
        $iconFilename = basename($iconPath);
        $imagemUrl = 'images/uploads/templates/' . $iconFilename;

        // Atributos (stats do item)
        $atributos = $item['attributes_json'] ?? '{}';

        $insertStmt->execute([
            $nome,
            $itemId,
            $cat['categoria'],
            $cat['subcategoria'],
            $imagemUrl,
            $atributos,
            $label
        ]);

        if ($itemId > 0) {
            $existing[$itemId] = true;
        }
        $inserted++;
    }

    $db->commit();
} catch (Throwable $e) {
    if ($db->inTransaction()) {
        $db->rollBack();
    }
    http_response_code(500);
    echo json_encode([
        'error' => 'Erro durante seed: ' . $e->getMessage(),
        'inserted' => $inserted,
        'skipped' => $skipped
    ]);
    exit;
}

echo json_encode([
    'success' => true,
    'total_catalogo' => count($items),
    'com_icone' => $inserted + $skipped,
    'inseridos' => $inserted,
    'pulados_duplicatas' => $skipped,
    'erros' => $errors
], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

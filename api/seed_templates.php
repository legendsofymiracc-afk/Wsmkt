<?php
/**
 * Seed templates table from local SQLite database with correct category mapping
 *
 * Uso:   curl http://127.0.0.1:8080/api/seed_templates.php
 *        (requer sessão de admin ativa)
 *
 * Le o banco SQLite local, limpa a tabela de templates,
 * mapeia itens para as categorias corretas do Warspear via keywords,
 * e reinsere todos os 2053 templates com categorização correta.
 */

require_once __DIR__ . '/routes.php';
require_once __DIR__ . '/template_category_map.php';

if (!isAdmin()) {
    http_response_code(401);
    echo json_encode(['error' => 'Acesso negado']);
    exit;
}

set_time_limit(300);

$srcDbPath = __DIR__ . '/../market_item_database_assets/items_market.sqlite';

if (!file_exists($srcDbPath)) {
    http_response_code(500);
    echo json_encode(['error' => 'Banco SQLite não encontrado: ' . $srcDbPath]);
    exit;
}

// ============================================================
// CONECTA AO BANCO DE DADOS ORIGEM
// ============================================================
try {
    $srcDb = new PDO('sqlite:' . $srcDbPath);
    $srcDb->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $srcDb->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Erro ao conectar ao banco origem: ' . $e->getMessage()]);
    exit;
}

// ============================================================
// LIMPA TEMPLATES EXISTENTES E REINSERE
// ============================================================
$db = getDB();
$countBefore = $db->query('SELECT COUNT(*) FROM templates')->fetchColumn();
$db->exec('DELETE FROM templates');

$stmt = $srcDb->query("
    SELECT item_id, name_exact, name_original, category, category_label, icon_path, attributes_json
    FROM items
    WHERE has_icon_by_same_id = 1
    ORDER BY item_id
");
$items = $stmt->fetchAll(PDO::FETCH_ASSOC);

$insertStmt = $db->prepare(
    'INSERT INTO templates (nome, item_id, categoria, subcategoria, imagem_url, atributos, origem) VALUES (?, ?, ?, ?, ?, ?, ?)'
);

$inserted = 0;
$errors = 0;
$catCounts = [];

$db->beginTransaction();
try {
    foreach ($items as $item) {
        $itemId = (int)($item['item_id'] ?? 0);

        $nome = trim($item['name_exact'] ?? '');
        if (empty($nome)) $nome = trim($item['name_original'] ?? '');
        if (empty($nome)) $nome = 'Item #' . $itemId;

        $label = $item['category_label'] ?? 'Outros Efeitos';
        $cat = mapCategory($nome, $label);

        $iconFilename = basename($item['icon_path'] ?? '');
        $imagemUrl = 'images/uploads/templates/' . $iconFilename;

        $atributos = $item['attributes_json'] ?? '{}';
        if (empty($atributos) || $atributos === 'null') $atributos = '{}';

        $insertStmt->execute([$nome, $itemId, $cat['categoria'], $cat['subcategoria'], $imagemUrl, $atributos, $label]);
        $inserted++;
        $key = $cat['categoria'] . ($cat['subcategoria'] ? ' › ' . $cat['subcategoria'] : '');
        $catCounts[$key] = ($catCounts[$key] ?? 0) + 1;
    }

    $db->commit();
} catch (Throwable $e) {
    if ($db->inTransaction()) $db->rollBack();
    http_response_code(500);
    echo json_encode([
        'error' => 'Erro durante seed: ' . $e->getMessage(),
        'inserted' => $inserted
    ]);
    exit;
}

// Ordena resultado
arsort($catCounts);
$catSummary = [];
foreach ($catCounts as $key => $count) {
    $catSummary[] = "$key: $count";
}

echo json_encode([
    'success' => true,
    'total_no_banco_origem' => count($items),
    'removidos' => (int)$countBefore,
    'inseridos' => $inserted,
    'erros' => $errors,
    'distribuicao' => $catSummary
], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

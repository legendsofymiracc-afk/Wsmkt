<?php
/**
 * CLI seed script: rebuild templates from local SQLite database.
 * Uso: C:\xampp\php\php.exe api\seed_templates_cli.php
 *
 * Bypasses web auth/CSRF — designed for CLI / one-shot execution only.
 */

require_once __DIR__ . '/template_category_map.php';

// ---- Paths ----
$srcDbPath = __DIR__ . '/../market_item_database_assets/items_market.sqlite';
$dstDbPath = __DIR__ . '/../database/mercado.db';
$iconsSourceDir = __DIR__ . '/../market_item_database_assets/item_icons_named_png/';
$iconsTargetDir = __DIR__ . '/../images/uploads/templates/';

if (!file_exists($srcDbPath)) {
    die("ERRO: Banco origem não encontrado: $srcDbPath\n");
}
if (!file_exists($dstDbPath)) {
    die("ERRO: Banco destino não encontrado: $dstDbPath\n");
}

// ---- Connect ----
$srcDb = new PDO('sqlite:' . $srcDbPath);
$srcDb->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$srcDb->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

$dstDb = new PDO('sqlite:' . $dstDbPath);
$dstDb->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$dstDb->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

echo "Conectado aos bancos.\n";

// ---- 1. DELETE existing templates ----
$countBefore = $dstDb->query('SELECT COUNT(*) FROM templates')->fetchColumn();
echo "Templates antes: $countBefore\n";
$dstDb->exec('DELETE FROM templates');
echo "Templates deletados.\n";

// ---- 2. COPY icons ----
echo "Copiando ícones...\n";
$sourceFiles = glob($iconsSourceDir . '*.png');
$copied = 0;
$skipped = 0;
foreach ($sourceFiles as $srcFile) {
    $filename = basename($srcFile);
    $targetFile = $iconsTargetDir . $filename;
    if (file_exists($targetFile)) {
        $skipped++;
        continue;
    }
    if (copy($srcFile, $targetFile)) {
        $copied++;
    }
}
echo "Ícones: $copied copiados, $skipped já existentes.\n";

// ---- 3. FETCH items from source ----
echo "Carregando itens do banco origem...\n";
$stmt = $srcDb->query("
    SELECT item_id, name_exact, name_original, category, category_label, icon_path, attributes_json
    FROM items
    WHERE has_icon_by_same_id = 1
    ORDER BY item_id
");
$items = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo "Total de itens com ícone: " . count($items) . "\n";

// ---- 4. INSERT ----
$insertStmt = $dstDb->prepare(
    'INSERT INTO templates (nome, item_id, categoria, subcategoria, imagem_url, atributos, origem) VALUES (?, ?, ?, ?, ?, ?, ?)'
);

$inserted = 0;
$errors = 0;
$catCounts = [];

$dstDb->beginTransaction();
try {
    foreach ($items as $item) {
        $itemId = (int)($item['item_id'] ?? 0);

        $nome = trim($item['name_exact'] ?? '');
        if (empty($nome)) {
            $nome = trim($item['name_original'] ?? '');
        }
        if (empty($nome)) {
            $nome = 'Item #' . $itemId;
        }

        $label = $item['category_label'] ?? 'Outros Efeitos';
        $cat = mapCategory($nome, $label);

        $iconPath = $item['icon_path'] ?? '';
        $iconFilename = basename($iconPath);
        $imagemUrl = 'images/uploads/templates/' . $iconFilename;

        $atributos = $item['attributes_json'] ?? '{}';
        if (empty($atributos) || $atributos === 'null') {
            $atributos = '{}';
        }

        $insertStmt->execute([
            $nome,
            $itemId,
            $cat['categoria'],
            $cat['subcategoria'],
            $imagemUrl,
            $atributos,
            $label
        ]);

        $key = $cat['categoria'] . ' / ' . $cat['subcategoria'];
        $catCounts[$key] = ($catCounts[$key] ?? 0) + 1;
        $inserted++;
    }

    $dstDb->commit();
} catch (Throwable $e) {
    if ($dstDb->inTransaction()) {
        $dstDb->rollBack();
    }
    echo "ERRO durante insert: " . $e->getMessage() . "\n";
    exit(1);
}

echo "\n=== RESULTADO ===\n";
echo "Inseridos: $inserted\n";
echo "Erros: $errors\n";

// Sort by count desc
arsort($catCounts);
echo "\n=== DISTRIBUIÇÃO POR CATEGORIA ===\n";
foreach ($catCounts as $key => $count) {
    echo sprintf("  %-40s %d\n", $key, $count);
}

echo "\nSeed concluído com sucesso!\n";

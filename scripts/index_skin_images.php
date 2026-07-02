<?php
declare(strict_types=1);

/*
 * Indexa imagens de skins para associacao automatica aos templates.
 *
 * Pasta observada:
 *   images/uploads/skins
 *
 * Convencoes suportadas:
 *   12345.webp
 *   12345-nome-da-skin.webp
 *   nome-da-skin-12345.webp
 *   nome-da-skin.webp
 *
 * Uso:
 *   C:\xampp\php\php.exe scripts\index_skin_images.php
 */

require_once __DIR__ . '/../api/skin_image_resolver.php';

$root = dirname(__DIR__);
$skinDir = $root . '/' . SKIN_IMAGE_BASE_PATH;
@mkdir($skinDir, 0777, true);

function publicPathFromFile(string $root, string $file): string {
    return str_replace('\\', '/', substr($file, strlen($root) + 1));
}

function collectSkinImages(string $root, string $skinDir): array {
    $index = [
        'generated_at' => date(DATE_ATOM),
        'base_path' => SKIN_IMAGE_BASE_PATH,
        'by_id' => [],
        'by_slug' => [],
        'files' => [],
    ];

    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($skinDir, FilesystemIterator::SKIP_DOTS)
    );

    foreach ($iterator as $fileInfo) {
        if (!$fileInfo->isFile()) continue;
        $ext = strtolower($fileInfo->getExtension());
        if (!in_array($ext, SKIN_IMAGE_EXTENSIONS, true)) continue;

        $file = $fileInfo->getPathname();
        $publicPath = publicPathFromFile($root, $file);
        $base = pathinfo($fileInfo->getFilename(), PATHINFO_FILENAME);
        $slug = normalizeSkinImageKey($base);
        if ($slug === '') continue;

        $ids = [];
        if (preg_match_all('/(?:^|-)(\d{3,})(?:-|$)/', $slug, $matches)) {
            foreach ($matches[1] as $id) $ids[(string)(int)$id] = true;
        }
        foreach (array_keys($ids) as $id) {
            $index['by_id'][$id] ??= $publicPath;
        }

        $slugWithoutIds = trim(preg_replace('/(?:^|-)\d{3,}(?:-|$)/', '-', $slug) ?? $slug, '-');
        if ($slugWithoutIds !== '') {
            $index['by_slug'][$slugWithoutIds] ??= $publicPath;
        }
        $index['by_slug'][$slug] ??= $publicPath;
        $index['files'][] = $publicPath;
    }

    ksort($index['by_id'], SORT_NATURAL);
    ksort($index['by_slug'], SORT_NATURAL);
    sort($index['files'], SORT_NATURAL);
    return $index;
}

function rowLooksLikeSkinForIndex(array $row): bool {
    return rowLooksLikeSkinTemplate([
        'categoria' => (string)$row['categoria'],
        'atributos' => (string)$row['atributos'],
        'atributos_detalhes' => (string)$row['atributos_detalhes'],
    ]);
}

$index = collectSkinImages($root, $skinDir);
file_put_contents(
    SKIN_IMAGE_INDEX_PATH,
    json_encode($index, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT) . PHP_EOL
);

$db = new PDO('sqlite:' . $root . '/database/mercado.db');
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

$templates = $db->query('SELECT id, item_id, nome, categoria, imagem_url, atributos, atributos_detalhes FROM templates ORDER BY id')->fetchAll();
$update = $db->prepare('UPDATE templates SET imagem_url = ?, atributos = ? WHERE id = ?');

$matched = 0;
$unchanged = 0;
$scannedTemplates = 0;

foreach ($templates as $template) {
    if (!rowLooksLikeSkinForIndex($template)) continue;
    $scannedTemplates++;
    $skinImage = resolveSkinImageUrl((int)$template['item_id'], (string)$template['nome']);
    if ($skinImage === '') {
        $unchanged++;
        continue;
    }

    $attrs = decodeTemplateJson((string)$template['atributos']);
    if (empty($attrs['icon_image_url']) && !empty($template['imagem_url']) && $template['imagem_url'] !== $skinImage) {
        $attrs['icon_image_url'] = (string)$template['imagem_url'];
    }
    $attrs['skin_image_url'] = $skinImage;
    $attrs['skin_image_source'] = 'auto-folder';

    $update->execute([
        $skinImage,
        json_encode($attrs, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        (int)$template['id'],
    ]);
    $matched++;
}

echo json_encode([
    'success' => true,
    'skin_folder' => SKIN_IMAGE_BASE_PATH,
    'indexed_files' => count($index['files']),
    'indexed_ids' => count($index['by_id']),
    'indexed_slugs' => count($index['by_slug']),
    'skin_templates_checked' => $scannedTemplates,
    'templates_matched' => $matched,
    'templates_without_custom_image' => $unchanged,
    'index_file' => 'database/skin_images.index.json',
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT) . PHP_EOL;

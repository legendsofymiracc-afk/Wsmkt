<?php
declare(strict_types=1);

const SKIN_IMAGE_BASE_PATH = 'images/uploads/skins';
const SKIN_IMAGE_INDEX_PATH = __DIR__ . '/../database/skin_images.index.json';
const SKIN_IMAGE_EXTENSIONS = ['webp', 'png', 'jpg', 'jpeg', 'gif'];
const SKIN_IMAGE_PLACEHOLDER = 'images/uploads/gold_coin.png';

function normalizeSkinImageKey(string $value): string {
    $value = trim(mb_strtolower($value, 'UTF-8'));
    $ascii = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value);
    if ($ascii !== false && $ascii !== '') {
        $value = $ascii;
    }
    $value = preg_replace('/[^a-z0-9]+/i', '-', $value) ?? '';
    return trim($value, '-');
}

function projectFileExistsForPublicPath(string $publicPath): bool {
    if ($publicPath === '' || preg_match('#^(https?:)?//#i', $publicPath)) {
        return false;
    }
    $path = realpath(__DIR__ . '/../' . ltrim($publicPath, '/\\'));
    return $path !== false && is_file($path);
}

function loadSkinImageIndex(): array {
    static $index = null;
    if ($index !== null) return $index;
    if (!is_file(SKIN_IMAGE_INDEX_PATH)) {
        $index = ['by_id' => [], 'by_slug' => []];
        return $index;
    }
    $data = json_decode((string)file_get_contents(SKIN_IMAGE_INDEX_PATH), true);
    $index = is_array($data) ? $data : ['by_id' => [], 'by_slug' => []];
    $index['by_id'] = is_array($index['by_id'] ?? null) ? $index['by_id'] : [];
    $index['by_slug'] = is_array($index['by_slug'] ?? null) ? $index['by_slug'] : [];
    return $index;
}

function resolveSkinImageUrl(int $itemId, string $name): string {
    $slug = normalizeSkinImageKey($name);
    $candidates = [];
    foreach (SKIN_IMAGE_EXTENSIONS as $ext) {
        if ($itemId > 0) {
            $candidates[] = SKIN_IMAGE_BASE_PATH . '/' . $itemId . '.' . $ext;
            if ($slug !== '') {
                $candidates[] = SKIN_IMAGE_BASE_PATH . '/' . $itemId . '-' . $slug . '.' . $ext;
                $candidates[] = SKIN_IMAGE_BASE_PATH . '/' . $slug . '-' . $itemId . '.' . $ext;
            }
        }
        if ($slug !== '') {
            $candidates[] = SKIN_IMAGE_BASE_PATH . '/' . $slug . '.' . $ext;
        }
    }

    foreach ($candidates as $candidate) {
        if (projectFileExistsForPublicPath($candidate)) return $candidate;
    }

    $index = loadSkinImageIndex();
    if ($itemId > 0 && !empty($index['by_id'][(string)$itemId])) {
        $path = (string)$index['by_id'][(string)$itemId];
        if (projectFileExistsForPublicPath($path)) return $path;
    }
    if ($slug !== '' && !empty($index['by_slug'][$slug])) {
        $path = (string)$index['by_slug'][$slug];
        if (projectFileExistsForPublicPath($path)) return $path;
    }

    return '';
}

function decodeTemplateJson(?string $json): array {
    if (!$json) return [];
    $data = json_decode($json, true);
    return is_array($data) ? $data : [];
}

function rowLooksLikeSkinTemplate(array $row): bool {
    $category = mb_strtolower((string)($row['categoria'] ?? $row['template_categoria'] ?? ''), 'UTF-8');
    if (strpos($category, 'trajes') !== false || strpos($category, 'visuais') !== false) return true;

    $attrs = decodeTemplateJson((string)($row['atributos'] ?? $row['template_atributos'] ?? ''));
    $details = decodeTemplateJson((string)($row['atributos_detalhes'] ?? $row['template_atributos_raw'] ?? ''));
    return (int)($attrs['itemType'] ?? $details['itemType'] ?? 0) === 19;
}

function applySkinImageToTemplateRow(array $row): array {
    $itemId = (int)($row['item_id'] ?? 0);
    $name = (string)($row['nome'] ?? '');
    $skinImage = rowLooksLikeSkinTemplate($row) ? resolveSkinImageUrl($itemId, $name) : '';
    $row['skin_image_url'] = $skinImage;
    if ($skinImage !== '') {
        $row['imagem_url'] = $skinImage;
    } elseif (empty($row['imagem_url']) && projectFileExistsForPublicPath(SKIN_IMAGE_PLACEHOLDER)) {
        $row['imagem_url'] = SKIN_IMAGE_PLACEHOLDER;
    }
    return $row;
}

function applySkinImageToItemRow(array $row): array {
    $templateRow = [
        'item_id' => (int)($row['template_item_id'] ?? 0),
        'nome' => (string)($row['template_nome'] ?? $row['nome'] ?? ''),
        'categoria' => (string)($row['template_categoria'] ?? ''),
        'atributos' => (string)($row['template_atributos'] ?? ''),
        'atributos_detalhes' => (string)($row['template_atributos_raw'] ?? ''),
        'imagem_url' => (string)($row['template_imagem'] ?? ''),
    ];
    $resolved = applySkinImageToTemplateRow($templateRow);
    if (!empty($resolved['skin_image_url'])) {
        $row['template_imagem'] = $resolved['skin_image_url'];
        if (empty($row['imagem_url'])) {
            $row['imagem_url'] = $resolved['skin_image_url'];
        }
    } elseif (empty($row['template_imagem']) && projectFileExistsForPublicPath(SKIN_IMAGE_PLACEHOLDER)) {
        $row['template_imagem'] = SKIN_IMAGE_PLACEHOLDER;
    }
    $row['skin_image_url'] = (string)($resolved['skin_image_url'] ?? '');
    return $row;
}


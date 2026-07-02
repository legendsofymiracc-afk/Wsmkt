<?php
declare(strict_types=1);

$part = preg_replace('/[^a-z0-9-]/i', '', (string)($_GET['part'] ?? ''));
$id = (int)($_GET['id'] ?? 0);
$file = preg_replace('/[^a-z0-9_-]/i', '', (string)($_GET['file'] ?? ''));
$format = ($_GET['format'] ?? 'webp') === 'png' ? 'png' : 'webp';
$fallback = ($_GET['fallback'] ?? '') === 'empty';

$allowed = ['head', 'body', 'hands', 'legs', 'hair', 'helmet', 'ears', 'cape', '1-hand', '2-hand', 'shield', 'bow', 'crossbow'];
if ($id <= 0 || $file === '' || !in_array($part, $allowed, true)) {
    http_response_code(400);
    exit;
}

$cacheDir = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'cache' . DIRECTORY_SEPARATOR . 'wsdb_textures'
    . DIRECTORY_SEPARATOR . $part . DIRECTORY_SEPARATOR . (string)$id;
$cachePath = $cacheDir . DIRECTORY_SEPARATOR . $file . '.' . $format;

if (is_file($cachePath)) {
    header('Content-Type: image/' . $format);
    header('Cache-Control: public, max-age=604800');
    header('X-WSDB-Cache: HIT');
    readfile($cachePath);
    exit;
}

$url = "https://wsdb.xyz/textures/{$part}/{$id}/{$file}.{$format}";
$ctx = stream_context_create(['http' => [
    'timeout' => 12,
    'header' => "User-Agent: MercadoWarspear/1.0\r\n",
]]);
$data = @file_get_contents($url, false, $ctx);
if (!$data) {
    if ($fallback) {
        header('Content-Type: image/png');
        header('Cache-Control: public, max-age=604800');
        echo base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADElEQVR42mNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=');
        exit;
    }
    http_response_code(404);
    exit;
}

if (!is_dir($cacheDir)) {
    @mkdir($cacheDir, 0775, true);
}
if (is_dir($cacheDir) && is_writable($cacheDir)) {
    @file_put_contents($cachePath, $data, LOCK_EX);
}

header('Content-Type: image/' . $format);
header('Cache-Control: public, max-age=604800');
header('X-WSDB-Cache: MISS');
echo $data;

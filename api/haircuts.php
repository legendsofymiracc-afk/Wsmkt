<?php
declare(strict_types=1);

require_once __DIR__ . '/routes.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Metodo nao permitido']);
    exit;
}

$gender = isset($_GET['gender']) ? (int) $_GET['gender'] : 0;
if ($gender !== 0 && $gender !== 1) {
    http_response_code(400);
    echo json_encode(['error' => 'Genero invalido']);
    exit;
}

$cacheDir = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'cache';
$cachePath = $cacheDir . DIRECTORY_SEPARATOR . "wsdb_haircuts_{$gender}.json";
$cacheTtl = 86400;

$readCachedHaircuts = static function () use ($cachePath): ?array {
    if (!is_file($cachePath)) return null;
    $cached = json_decode((string) @file_get_contents($cachePath), true);
    if (!is_array($cached) || !isset($cached['list']) || !is_array($cached['list'])) return null;
    return $cached;
};

$cached = $readCachedHaircuts();
if ($cached && time() - (int) filemtime($cachePath) < $cacheTtl) {
    header('Cache-Control: public, max-age=86400');
    header('X-WSDB-Cache: HIT');
    echo json_encode($cached);
    exit;
}

$url = "https://wsdb.xyz/api/data/haircuts/{$gender}";
$ctx = stream_context_create(['http' => [
    'timeout' => 12,
    'header' => "User-Agent: MercadoWarspear/1.0\r\n",
]]);

$data = @file_get_contents($url, false, $ctx);
if ($data === false || $data === '') {
    if ($cached) {
        header('Cache-Control: public, max-age=300');
        header('X-WSDB-Cache: STALE');
        echo json_encode($cached);
        exit;
    }
    http_response_code(502);
    echo json_encode(['error' => 'Nao foi possivel carregar os cortes do WSDB']);
    exit;
}

$json = json_decode($data, true);
if (!is_array($json) || !isset($json['list']) || !is_array($json['list'])) {
    http_response_code(502);
    echo json_encode(['error' => 'Resposta invalida do WSDB']);
    exit;
}

$list = [];
foreach ($json['list'] as $id) {
    $id = (int) $id;
    if ($id >= 0) {
        $list[] = $id;
    }
}

$payload = ['list' => array_values(array_unique($list))];

if (!is_dir($cacheDir)) {
    @mkdir($cacheDir, 0775, true);
}
if (is_dir($cacheDir) && is_writable($cacheDir)) {
    @file_put_contents($cachePath, json_encode($payload), LOCK_EX);
}

header('Cache-Control: public, max-age=86400');
header('X-WSDB-Cache: MISS');
echo json_encode($payload);

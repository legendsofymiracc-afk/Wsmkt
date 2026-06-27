<?php
require_once __DIR__ . '/routes.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if (!isAdmin() && !isSeller()) {
    http_response_code(401);
    echo json_encode(['error' => 'Não autorizado']);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método não permitido']);
    exit();
}

if (!isset($_FILES['file'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Arquivo não enviado']);
    exit();
}

$file = $_FILES['file'];
if ($file['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['error' => 'Erro no upload', 'code' => $file['error']]);
    exit();
}

// Limite de 2MB
if ($file['size'] > 2 * 1024 * 1024) {
    http_response_code(400);
    echo json_encode(['error' => 'Arquivo excede 2MB']);
    exit();
}

$allowed = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
$finfo = new finfo(FILEINFO_MIME_TYPE);
$mime = $finfo->file($file['tmp_name']);
if (!isset($allowed[$mime])) {
    http_response_code(400);
    echo json_encode(['error' => 'Tipo de arquivo não suportado']);
    exit();
}

// Rejeitar extensão dupla
$originalName = strtolower($file['name']);
if (substr_count($originalName, '.') > 1) {
    http_response_code(400);
    echo json_encode(['error' => 'Nome de arquivo inválido']);
    exit();
}

$ext = $allowed[$mime];
$uploadsDir = __DIR__ . '/../images/uploads';
if (!is_dir($uploadsDir)) {
    mkdir($uploadsDir, 0777, true);
}

$basename = date('Ymd_His') . '_' . bin2hex(random_bytes(6));
$filename = $basename . '.' . $ext;
$target = $uploadsDir . '/' . $filename;

if (!move_uploaded_file($file['tmp_name'], $target)) {
    http_response_code(500);
    echo json_encode(['error' => 'Falha ao salvar arquivo']);
    exit();
}

// Caminho público relativo ao root do site
$publicPath = 'images/uploads/' . $filename;
echo json_encode(['success' => true, 'path' => $publicPath]);

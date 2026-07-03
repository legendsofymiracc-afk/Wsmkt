<?php
/**
 * Roteador para o servidor embutido do PHP (php -S).
 * Bloqueia acesso direto a arquivos sensíveis e roteia API.
 *
 * Uso: php -S 127.0.0.1:8080 router.php
 */

$uri = $_SERVER['REQUEST_URI'];
$path = parse_url($uri, PHP_URL_PATH);

// Bloqueia acesso direto ao banco de dados SQLite (inclui WAL/SHM)
if (preg_match('/\.db(-wal|-shm)?$/i', $path)) {
    http_response_code(403);
    echo json_encode(['error' => 'Acesso negado']);
    return false;
}

// Bloqueia acesso direto a diretórios sensíveis
if (preg_match('#^/(api|database)/.*\.php$#', $path)) {
    // Arquivos PHP na pasta api/ e database/ são servidos normalmente via PHP
    return false;
}

// Bloqueia listagem de diretórios sensíveis
if (preg_match('#^/(database|\.git|\.claude)/#', $path)) {
    http_response_code(403);
    echo json_encode(['error' => 'Acesso negado']);
    return false;
}

// Arquivos estáticos: servir diretamente se existirem
$filePath = __DIR__ . $path;
if (is_file($filePath)) {
    return false; // PHP serve o arquivo estaticamente
}

// Para diretórios, tenta index.php ou index.html
if (is_dir($filePath)) {
    $indexPhp = $filePath . '/index.php';
    $indexHtml = $filePath . '/index.html';
    if (is_file($indexPhp)) {
        require $indexPhp;
        return true;
    }
    if (is_file($indexHtml)) {
        return false; // Serve o HTML estático
    }
}

// Fallback: deixa o PHP decidir (provavelmente 404)
return false;

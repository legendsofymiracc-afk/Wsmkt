<?php
// Atualiza imagens das categorias com icones do wsdb.xyz
define('DB_PATH', __DIR__ . '/database/mercado.db');
$db = new PDO('sqlite:' . DB_PATH);
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

function fetch($url) {
    $ctx = stream_context_create(['http'=>['timeout'=>10,'header'=>"Accept: application/json\r\n"]]);
    $d = @file_get_contents($url, false, $ctx);
    return $d ? json_decode($d, true) : null;
}

$base = 'https://wsdb.xyz';
$iconDir = __DIR__ . '/images/uploads/templates/';

// Mapeamento: nome da categoria no site -> ID da categoria no wsdb.xyz (ou ID do ícone direto)
$catIcons = [
    'Armas' => 1423,        // icon da subcategoria Espadas
    'Armadura' => 1533,     // icon da subcategoria Armadura de tecido
    'Acessórios' => 1154,   // icon de Anéis
    'Consumíveis' => 2173,  // icon de Poções
    'Relíquias' => 3700,    // icon de Aprimoramento
    'Aprimoramentos' => 2270, // icon de Cristais
    'Recursos' => 2963,     // icon de Essências
    'Visuais Decorativos' => 2871, // icon de Armas de longo alcance
    'Lacaios' => 880,       // icon de Progressão
    'Livros de Habilidade' => 880, // genérico
];

// Download icons e update DB
$update = $db->prepare('UPDATE categorias SET imagem_url = ? WHERE nome = ? AND nivel = 1');

foreach ($catIcons as $nome => $iconId) {
    // Download icon
    $iconPath = $iconDir . $iconId . '.webp';
    if (!file_exists($iconPath)) {
        $data = @file_get_contents("$base/icons/$iconId.webp");
        if ($data) {
            file_put_contents($iconPath, $data);
            echo "  Baixado: $iconId.webp para $nome\n";
        }
    }

    $newUrl = 'images/uploads/templates/' . $iconId . '.webp';
    $update->execute([$newUrl, $nome]);
    echo "  ✅ $nome -> $newUrl\n";
}

echo "\nCategorias atualizadas!\n";

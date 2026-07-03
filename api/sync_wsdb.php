<?php
/**
 * Importador completo do wsdb.xyz
 * Extrai TODAS as categorias, subcategorias e itens com atributos completos
 * via API pública. Faz download de todos os ícones.
 *
 * Uso: curl http://127.0.0.1:8080/api/sync_wsdb.php (admin only)
 *
 * Endpoints conhecidos da WSDB API:
 *   /api/data/item/category/pt/{catId}  — subcategorias de uma categoria
 *   /api/data/item/items/pt/{subId}     — itens de uma subcategoria
 *   /api/item/{id}                      — detalhe do item (requer auth, 401)
 *
 * Padrão de resposta dos endpoints de lista:
 *   {"list": [{"id": 123, "level": 1, "icon": 456, "name": "...", "itemType": 0, "color": 0}, ...]}
 *
 * Estrutura de categorias descoberta (catId -> nome):
 *    2: Armas               60: Visuais Decorativos
 *    3: Armadura            70: Recursos
 *    5: Armadura de Tecido   73: Relíquias
 *    6: Armadura Leve       79: Recursos de Artesanato
 *    7: Armadura Pesada     88: Recursos do Castelo
 *    9: Aprimoramentos      38: Acessórios
 *   10: Cristais            44: Runas
 *   49: Consumíveis         50: Poções
 *  100: Artefatos
 *   Demais catId retornam {"list":[]}
 */

require_once __DIR__ . '/routes.php';

if (!isAdmin()) {
    http_response_code(401);
    die(json_encode(['error' => 'Acesso restrito ao admin']));
}

set_time_limit(600);
header('Content-Type: application/json; charset=utf-8');

$db = getDB();
$baseUrl = 'https://wsdb.xyz';

// ============================================================
// Helpers
// ============================================================

function fetchJson($url) {
    $ctx = stream_context_create([
        'http' => [
            'timeout' => 30,
            'header' => "Accept: application/json\r\nUser-Agent: MercadoWarspear/1.0\r\n"
        ]
    ]);
    $data = @file_get_contents($url, false, $ctx);
    if ($data === false) return null;
    return json_decode($data, true);
}

function fetchJsonWithStatus($url, &$httpCode = null) {
    $ctx = stream_context_create([
        'http' => [
            'timeout' => 10,
            'ignore_errors' => true,
            'header' => "Accept: application/json\r\nUser-Agent: MercadoWarspear/1.0\r\n"
        ]
    ]);
    $data = @file_get_contents($url, false, $ctx);
    if ($data === false) { $httpCode = 0; return null; }
    // Extrair código HTTP dos headers da resposta
    if (isset($http_response_header) && preg_match('/HTTP\/\d\.\d\s+(\d+)/', $http_response_header[0], $m)) {
        $httpCode = (int)$m[1];
    } else {
        $httpCode = 200;
    }
    return json_decode($data, true);
}

function logProgress($msg) {
    echo json_encode($msg, JSON_UNESCAPED_UNICODE) . "\n";
    flush();
    if (ob_get_level()) ob_flush();
}

function downloadIcon($iconId, $dir) {
    $path = $dir . $iconId . '.webp';
    if (file_exists($path)) return $path;
    $iconData = @file_get_contents("https://wsdb.xyz/icons/$iconId.webp");
    if ($iconData) {
        file_put_contents($path, $iconData);
        return $path;
    }
    return null;
}

// ============================================================
// 0. Limpeza e preparação
// ============================================================

$db->exec('DELETE FROM templates');

$iconDir = __DIR__ . '/../images/uploads/templates/';
if (!is_dir($iconDir)) mkdir($iconDir, 0777, true);

$categoryIconDir = __DIR__ . '/../images/uploads/wsdb_categories/';
if (!is_dir($categoryIconDir)) mkdir($categoryIconDir, 0777, true);

logProgress(['status' => 'iniciando', 'mensagem' => 'Limpando templates existentes...']);

// ============================================================
// 1. Escanear TODAS as categorias (catId 1-200)
// ============================================================

logProgress(['status' => 'scan_categorias', 'mensagem' => 'Escaneando categorias wsdb.xyz...']);

$validCatIds = [];       // catIds que retornam dados (não vazios)
$allSubcategories = [];  // flat list: { subId, subName, subIcon, parentCatId }
$subNameMap = [];        // subId -> subName (usado para nomear a subcategoria do item)
$catSubMap = [];         // catId -> [ [subId, subName, subIcon], ... ]
$catNameMap = [];        // catId -> nome conhecido (hardcoded para os que conhecemos)

// Nomes conhecidos para catIds (descobertos via exploração)
$catKnownNames = [
    2  => 'Armas',
    3  => 'Armadura',
    5  => 'Armadura de Tecido',
    6  => 'Armadura Leve',
    7  => 'Armadura Pesada',
    9  => 'Aprimoramentos',
    10 => 'Cristais',
    38 => 'Acessórios',
    44 => 'Runas',
    49 => 'Consumíveis',
    50 => 'Poções',
    60 => 'Visuais Decorativos',
    70 => 'Recursos',
    73 => 'Relíquias',
    79 => 'Recursos de Artesanato',
    88 => 'Recursos do Castelo',
    100 => 'Artefatos',
];

// Mapa de catId -> categoria no nosso sistema (para itens)
$catToOurCategory = [
    2  => 'Armas',
    5  => 'Armadura de Tecido',
    6  => 'Armadura Leve',
    7  => 'Armadura Pesada',
    9  => 'Aprimoramentos',
    10 => 'Aprimoramentos',
    38 => 'Acessórios',
    44 => 'Aprimoramentos',
    49 => 'Consumíveis',
    50 => 'Consumíveis',
    60 => 'Visuais Decorativos',
    70 => 'Recursos',
    73 => 'Relíquias',
    79 => 'Recursos',
    88 => 'Recursos',
    100 => 'Consumíveis',
];

// Mapa de subId -> cat pai conhecido (para itens órfãos)
$subToParentCat = [];

$emptyCount = 0;
for ($catId = 1; $catId <= 200; $catId++) {
    $data = fetchJson("$baseUrl/api/data/item/category/pt/$catId");
    if (!$data || empty($data['list'])) {
        $emptyCount++;
        // Se tivermos 20 vazios consecutivos depois de já ter passado do ID 50,
        // podemos parar cedo (mas continuamos até 200 pra garantir)
        if ($emptyCount >= 30 && $catId > 100) break;
        continue;
    }
    $emptyCount = 0;
    $validCatIds[] = $catId;
    $catSubMap[$catId] = [];

    $catName = $catKnownNames[$catId] ?? "Categoria $catId";

    foreach ($data['list'] as $sub) {
        $subId = (int)$sub['id'];
        $subName = $sub['name'] ?? '';
        $subIcon = (int)($sub['icon'] ?? 0);

        // Baixar ícone da subcategoria (ícone de categoria)
        if ($subIcon > 0) {
            downloadIcon($subIcon, $categoryIconDir);
        }

        $catSubMap[$catId][] = ['id' => $subId, 'name' => $subName, 'icon' => $subIcon];
        $subNameMap[$subId] = $subName;
        $subToParentCat[$subId] = $catId;

        // Coletar para flat list
        $allSubcategories[] = [
            'id' => $subId,
            'name' => $subName,
            'icon' => $subIcon,
            'parentCatId' => $catId,
        ];
    }
}

logProgress([
    'status' => 'categorias_encontradas',
    'total_catIds' => count($validCatIds),
    'total_subcategorias' => count($allSubcategories),
    'catIds_validos' => $validCatIds,
    'mensagem' => 'Categorias escaneadas.'
]);

// ============================================================
// 2. Coletar IDs únicos de subcategoria para buscar itens
// ============================================================

// Uma subcategoria pode aparecer como filha de múltiplos pais? Às vezes sim.
// Usamos conjunto para garantir unicidade.
$uniqueSubIds = [];
foreach ($allSubcategories as $sub) {
    $uniqueSubIds[$sub['id']] = true;
}
$uniqueSubIds = array_keys($uniqueSubIds);
sort($uniqueSubIds);

logProgress([
    'status' => 'subcategorias_unicas',
    'count' => count($uniqueSubIds),
    'ids' => $uniqueSubIds,
    'mensagem' => 'Iniciando extração de itens por subcategoria...'
]);

// ============================================================
// 2.5. Testar disponibilidade do endpoint de detalhes do item
// ============================================================

// O endpoint de detalhes (/api/item/{id}) retorna 401 sem auth.
// Testamos uma vez com o primeiro item encontrado; se falhar,
// não tentamos para cada item individualmente.
$detailApiAvailable = false;
if (!empty($uniqueSubIds)) {
    $testSubId = $uniqueSubIds[0];
    $testData = fetchJson("$baseUrl/api/data/item/items/pt/$testSubId");
    if ($testData && !empty($testData['list'])) {
        $testItemId = (int)$testData['list'][0]['id'];
        $httpCode = 0;
        $testDetail = fetchJsonWithStatus("$baseUrl/api/item/$testItemId", $httpCode);
        if ($testDetail !== null && $httpCode === 200) {
            $detailApiAvailable = true;
            logProgress(['status' => 'detail_api', 'disponivel' => true, 'mensagem' => 'API de detalhes do item disponivel!']);
        } else {
            logProgress(['status' => 'detail_api', 'disponivel' => false, 'http_code' => $httpCode, 'mensagem' => 'API de detalhes do item NAO disponivel. Salvando apenas dados do list endpoint.']);
        }
    }
}

// ============================================================
// 3. Preparar statement de inserção
// ============================================================

// A tabela templates tem colunas: id, nome, item_id, categoria, subcategoria,
// imagem_url, atributos, atributos_detalhes, nivel_min, nivel_max,
// profissao, rarity, cor, origem
//
// A tabela é limpa no início (DELETE FROM templates), então INSERT simples é suficiente.

// Primeiro verifica se a coluna atributos_detalhes existe
$colCheck = $db->query("PRAGMA table_info(templates)")->fetchAll(PDO::FETCH_ASSOC);
$hasDetalhes = false;
foreach ($colCheck as $col) {
    if ($col['name'] === 'atributos_detalhes') {
        $hasDetalhes = true;
        break;
    }
}
if (!$hasDetalhes) {
    $db->exec("ALTER TABLE templates ADD COLUMN atributos_detalhes TEXT");
}

// Também adicionar coluna de cor se não existir
$hasColor = false;
foreach ($colCheck as $col) {
    if ($col['name'] === 'cor') {
        $hasColor = true;
        break;
    }
}
if (!$hasColor) {
    $db->exec("ALTER TABLE templates ADD COLUMN cor INTEGER DEFAULT 0");
}

$insertStmt = $db->prepare('
    INSERT INTO templates
        (nome, item_id, categoria, subcategoria, imagem_url,
         atributos, atributos_detalhes, nivel_min, nivel_max,
         profissao, rarity, cor, origem)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
');

// ============================================================
// 4. Buscar itens para cada subcategoria
// ============================================================

$totalItems = 0;
$totalIcons = 0;
$totalErrors = 0;
$skippedEmptyNames = 0;

foreach ($uniqueSubIds as $subId) {
    $subName = $subNameMap[$subId] ?? "Sub $subId";
    $parentCatId = $subToParentCat[$subId] ?? 0;

    // Determinar categoria no nosso sistema
    $ourCategory = $catToOurCategory[$parentCatId] ?? 'Outros';

    // Para armaduras, determinar o tipo específico baseado no pai
    // catId 5 = tecido, 6 = leve, 7 = pesada
    if ($parentCatId == 5) $ourCategory = 'Armadura de Tecido';
    elseif ($parentCatId == 6) $ourCategory = 'Armadura Leve';
    elseif ($parentCatId == 7) $ourCategory = 'Armadura Pesada';
    elseif ($parentCatId == 10 || $parentCatId == 44) $ourCategory = 'Aprimoramentos';
    elseif ($parentCatId == 50 || $parentCatId == 100) $ourCategory = 'Consumíveis';
    elseif ($parentCatId == 79 || $parentCatId == 88) $ourCategory = 'Recursos';

    $data = fetchJson("$baseUrl/api/data/item/items/pt/$subId");
    if (!$data || empty($data['list'])) {
        continue; // subcategoria sem itens
    }

    $itemsInSub = 0;
    foreach ($data['list'] as $item) {
        $itemId = (int)$item['id'];
        $name = $item['name'] ?? '';
        $level = (int)($item['level'] ?? 0);
        $iconId = (int)($item['icon'] ?? 0);
        $color = (int)($item['color'] ?? 0);
        $itemType = (int)($item['itemType'] ?? 0);

        // Pular itens sem nome
        if (empty(trim($name))) {
            $skippedEmptyNames++;
            continue;
        }

        // Raridade
        $rarity = $color;

        // Download do ícone do item
        $imagemUrl = '';
        if ($iconId > 0) {
            $downloaded = downloadIcon($iconId, $iconDir);
            if ($downloaded) $totalIcons++;
            $imagemUrl = 'images/uploads/templates/' . $iconId . '.webp';
        }

        // --- ATRIBUTOS COMPLETOS ---
        // Salvamos TODOS os campos disponíveis da API no JSON de atributos.
        // O items endpoint retorna: id, level, icon, name, itemType, color.
        // Se o detail endpoint estiver acessível, enriquecemos com dados extras.

        $attrs = [
            'level' => $level,
            'color' => $color,
            'rarity' => $rarity,
            'itemType' => $itemType,
            'icon' => $iconId,
            'wsdb_id' => $itemId,
        ];

        // Tentar buscar detalhes do item apenas se a API de detalhes estiver disponível
        $detalhesData = null;
        if ($detailApiAvailable) {
            $httpCode = 0;
            $detailResp = fetchJsonWithStatus("$baseUrl/api/item/$itemId", $httpCode);
            if ($detailResp !== null && $httpCode === 200) {
                $detalhesData = $detailResp;
            }
        }

        // Se conseguiu detalhes, mesclar campos extras nos atributos
        if ($detalhesData && is_array($detalhesData)) {
            foreach (['render', 'body', 'legs', 'hand', 'head', 'cape',
                      'profession', 'maxLevel', 'options', 'bound',
                      'bodyColor', 'legsColor', 'handColor', 'headColor',
                      'capeColor', 'hair', 'ears', 'helmet'] as $field) {
                if (isset($detalhesData[$field])) {
                    $attrs[$field] = $detalhesData[$field];
                }
            }
            // Suporta wrappers: { item: { ... } } ou { data: { ... } }
            foreach (['item', 'data'] as $wrapKey) {
                if (isset($detalhesData[$wrapKey]) && is_array($detalhesData[$wrapKey])) {
                    foreach ($detalhesData[$wrapKey] as $k => $v) {
                        if (!isset($attrs[$k])) {
                            $attrs[$k] = $v;
                        }
                    }
                }
            }
            // Bonus / stats / skills / setBonus
            if (isset($detalhesData['bonus'])) $attrs['bonus'] = $detalhesData['bonus'];
            if (isset($detalhesData['stats']))  $attrs['stats'] = $detalhesData['stats'];
            if (isset($detalhesData['skills'])) $attrs['skills'] = $detalhesData['skills'];
            if (isset($detalhesData['setBonus'])) $attrs['setBonus'] = $detalhesData['setBonus'];
        }

        $attrsJson = json_encode($attrs, JSON_UNESCAPED_UNICODE);

        // atributos_detalhes = cópia raw de tudo que veio da API de detalhes
        $detalhesJson = null;
        if ($detalhesData) {
            $detalhesJson = json_encode($detalhesData, JSON_UNESCAPED_UNICODE);
        }

        // Determinar profissão (vem dos detalhes ou inferir do tipo)
        $profession = $attrs['profession'] ?? '';
        $maxLevel = $attrs['maxLevel'] ?? $level;

        try {
            $insertStmt->execute([
                $name,
                $itemId,
                $ourCategory,
                $subName,
                $imagemUrl,
                $attrsJson,      // atributos (dados compactos do item)
                $detalhesJson,    // atributos_detalhes (raw response)
                $level,
                $maxLevel,
                $profession,
                $rarity,
                $color,
                'wsdb'
            ]);
            $itemsInSub++;
            $totalItems++;
        } catch (Exception $e) {
            $totalErrors++;
        }
    }

    logProgress([
        'status' => 'progresso',
        'subcategoria' => $subName,
        'sub_id' => $subId,
        'categoria' => $ourCategory,
        'itens_sub' => $itemsInSub,
        'itens_total' => $totalItems,
        'icones_total' => $totalIcons,
        'erros' => $totalErrors,
    ]);

    // Pequena pausa para não sobrecarregar a API (rate limiting amigável)
    usleep(100000); // 100ms
}

// ============================================================
// 5. Finalizar
// ============================================================

logProgress([
    'success' => true,
    'itens_importados' => $totalItems,
    'icones_baixados' => $totalIcons,
    'erros' => $totalErrors,
    'pulados_sem_nome' => $skippedEmptyNames,
    'categorias_escaneadas' => count($validCatIds),
    'subcategorias_processadas' => count($uniqueSubIds),
    'mensagem' => 'Sincronização completa do wsdb.xyz finalizada!'
]);

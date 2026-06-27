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
// FUNÇÃO DE MAPEAMENTO DE CATEGORIA POR KEYWORDS
// ============================================================
function mapCategory(string $name, string $category_label): array {
    $nameUpper = mb_strtoupper($name, 'UTF-8');

    // --- ARMAS (ordem específica primeiro) ---
    if (preg_match('/ESPAD[AÃ]O/', $nameUpper) || preg_match('/GRANDE\s+ESPADA/', $nameUpper) || preg_match('/ESPADA\s+DE\s+DUAS/', $nameUpper))
        return ['categoria' => 'Armas', 'subcategoria' => 'Espadas de duas mãos'];
    if (preg_match('/MACHADO\s+DE\s+DUAS/', $nameUpper))
        return ['categoria' => 'Armas', 'subcategoria' => 'Machados de duas mãos'];
    if (preg_match('/MAÇ[AÃ]?\s*[A-Z\s]*DUAS/', $nameUpper) || preg_match('/MARTELO\s+DE\s+GUERRA/', $nameUpper))
        return ['categoria' => 'Armas', 'subcategoria' => 'Maças de duas mãos'];
    if (preg_match('/BESTA/', $nameUpper) || preg_match('/ARBALEST/', $nameUpper))
        return ['categoria' => 'Armas', 'subcategoria' => 'Bestas'];
    if (preg_match('/\bARCO\b/', $nameUpper))
        return ['categoria' => 'Armas', 'subcategoria' => 'Arcos'];
    if (preg_match('/\bADAGA\b/', $nameUpper))
        return ['categoria' => 'Armas', 'subcategoria' => 'Adagas'];
    if (preg_match('/\bLANÇ[AÃ]\b/', $nameUpper) || preg_match('/TRIDENTE/', $nameUpper))
        return ['categoria' => 'Armas', 'subcategoria' => 'Lanças'];
    if (preg_match('/\bESCUDO\b/', $nameUpper))
        return ['categoria' => 'Armas', 'subcategoria' => 'Escudos'];
    if (preg_match('/\bCAJADO\b/', $nameUpper) || preg_match('/BÁCULO/', $nameUpper) || preg_match('/BASTÃO/', $nameUpper))
        return ['categoria' => 'Armas', 'subcategoria' => 'Cajados'];
    if (preg_match('/\bESPADA\b/', $nameUpper) || preg_match('/LÂMIN[AE]/', $nameUpper) || preg_match('/SABRE/', $nameUpper) || preg_match('/KATANA/', $nameUpper))
        return ['categoria' => 'Armas', 'subcategoria' => 'Espadas de uma mão'];
    if (preg_match('/\bMACHADO\b/', $nameUpper) || preg_match('/FOICE/', $nameUpper))
        return ['categoria' => 'Armas', 'subcategoria' => 'Machados de uma mão'];
    if (preg_match('/\bMAÇ[AÃ]\b/', $nameUpper) || preg_match('/\bMARTELO\b/', $nameUpper) || preg_match('/CLAVA/', $nameUpper) || preg_match('/PORRETE/', $nameUpper))
        return ['categoria' => 'Armas', 'subcategoria' => 'Maças de uma mão'];
    if (preg_match('/ARPÃO/', $nameUpper) || preg_match('/ALABARDA/', $nameUpper))
        return ['categoria' => 'Armas', 'subcategoria' => 'Lanças'];

    // --- ARMADURA ---
    if (preg_match('/CAPACETE/', $nameUpper) || preg_match('/\bELMO\b/', $nameUpper) || preg_match('/COROA/', $nameUpper) || preg_match('/DIADEMA/', $nameUpper) || preg_match('/MÁSCARA/', $nameUpper) || preg_match('/CARAPUÇ[AÃ]/', $nameUpper) || preg_match('/CHAPÉU/', $nameUpper))
        return ['categoria' => 'Armadura', 'subcategoria' => 'Cabeça'];
    if (preg_match('/\bARMADURA\b/', $nameUpper) || preg_match('/PEITORAL/', $nameUpper) || preg_match('/MALHA/', $nameUpper) || preg_match('/COURAÇ[AÃ]/', $nameUpper) || preg_match('/TÚNICA/', $nameUpper) || preg_match('/VESTES/', $nameUpper) || preg_match('/MANTO/', $nameUpper) || preg_match('/COTA\s+DE/', $nameUpper) || preg_match('/CASACO/', $nameUpper))
        return ['categoria' => 'Armadura', 'subcategoria' => 'Tronco'];
    if (preg_match('/LUVAS/', $nameUpper) || preg_match('/MANOPLA/', $nameUpper) || preg_match('/BRAÇADEIRAS/', $nameUpper))
        return ['categoria' => 'Armadura', 'subcategoria' => 'Mãos'];
    if (preg_match('/\bCINTO\b/', $nameUpper) || preg_match('/FAIXA/', $nameUpper))
        return ['categoria' => 'Armadura', 'subcategoria' => 'Cintura'];
    if (preg_match('/BOTAS/', $nameUpper) || preg_match('/COTURNOS/', $nameUpper) || preg_match('/GREVAS/', $nameUpper) || preg_match('/CALÇAS/', $nameUpper) || preg_match('/CALÇ[AÃ]O/', $nameUpper))
        return ['categoria' => 'Armadura', 'subcategoria' => 'Pernas'];

    // --- ACESSÓRIOS ---
    if (preg_match('/\bANEL\b/', $nameUpper) || preg_match('/\bANÉIS\b/', $nameUpper))
        return ['categoria' => 'Acessórios', 'subcategoria' => 'Anéis'];
    if (preg_match('/AMULETO/', $nameUpper) || preg_match('/TALISMÃ/', $nameUpper) || preg_match('/COLAR/', $nameUpper) || preg_match('/GARGANTILHA/', $nameUpper) || preg_match('/MEDALH[AÃ]O/', $nameUpper))
        return ['categoria' => 'Acessórios', 'subcategoria' => 'Amuletos'];
    if (preg_match('/BRACELETE/', $nameUpper) || preg_match('/MANILHA/', $nameUpper))
        return ['categoria' => 'Acessórios', 'subcategoria' => 'Braceletes'];
    if (preg_match('/CAPOTE/', $nameUpper) || preg_match('/\bCAPA\b/', $nameUpper))
        return ['categoria' => 'Acessórios', 'subcategoria' => 'Capotes'];

    // --- CONSUMÍVEIS (por label + nome) ---
    if ($category_label === 'Poção/Elixir') {
        if (preg_match('/PERGAMINHO/', $nameUpper))
            return ['categoria' => 'Consumíveis', 'subcategoria' => 'Pergaminhos'];
        if (preg_match('/ALIMENTO/', $nameUpper) || preg_match('/QUEIJO/', $nameUpper) || preg_match('/PRESUNTO/', $nameUpper) || preg_match('/MINGAU/', $nameUpper) || preg_match('/CIDRA/', $nameUpper))
            return ['categoria' => 'Consumíveis', 'subcategoria' => 'Alimento'];
        if (preg_match('/ARTEFATO/', $nameUpper))
            return ['categoria' => 'Consumíveis', 'subcategoria' => 'Artefatos'];
        return ['categoria' => 'Consumíveis', 'subcategoria' => 'Poções'];
    }
    if (preg_match('/^POÇ[AÃ]O/', $nameUpper) || preg_match('/^ELIXIR/', $nameUpper))
        return ['categoria' => 'Consumíveis', 'subcategoria' => 'Poções'];
    if (preg_match('/PERGAMINHO/', $nameUpper))
        return ['categoria' => 'Consumíveis', 'subcategoria' => 'Pergaminhos'];
    if (preg_match('/ALIMENTO/', $nameUpper) || preg_match('/QUEIJO/', $nameUpper) || preg_match('/PRESUNTO/', $nameUpper) || preg_match('/MINGAU/', $nameUpper) || preg_match('/CERVEJA/', $nameUpper))
        return ['categoria' => 'Consumíveis', 'subcategoria' => 'Alimento'];
    if (preg_match('/ARTEFATO/', $nameUpper))
        return ['categoria' => 'Consumíveis', 'subcategoria' => 'Artefatos'];

    // --- EVENTO ---
    if ($category_label === 'Evento')
        return ['categoria' => 'Consumíveis', 'subcategoria' => 'Evento'];

    // --- RELÍQUIAS ---
    if ($category_label === 'Relíquia' || preg_match('/RELÍQUIA/', $nameUpper) || preg_match('/RELICÁRIO/', $nameUpper))
        return ['categoria' => 'Relíquias', 'subcategoria' => 'Aprimoramento'];

    // --- APRIMORAMENTOS ---
    if (preg_match('/\bRUNA\b/', $nameUpper) && !preg_match('/CRISTAL/', $nameUpper))
        return ['categoria' => 'Aprimoramentos', 'subcategoria' => preg_match('/AMPLIFICAÇÃO/', $nameUpper) ? 'Amplificação' : 'Runas'];
    if (preg_match('/CRISTAL/', $nameUpper))
        return ['categoria' => 'Aprimoramentos', 'subcategoria' => preg_match('/AMPLIFICAÇÃO/', $nameUpper) ? 'Amplificação' : 'Cristais'];
    if (preg_match('/ESFERA\s+DE\s+APRIMORAMENTO/', $nameUpper) || preg_match('/AMPLIFICAÇÃO/', $nameUpper))
        return ['categoria' => 'Aprimoramentos', 'subcategoria' => 'Amplificação'];

    // --- LACAIOS ---
    $petPatterns = ['/^FADA/', '/^PANDA/', '/^COELH/', '/^GAT[OA]/', '/^RENA/', '/^ELFO\s+DA\s+NEVE/', '/^URSO\s+DE\s+PELÚCIA/', '/^DEMÔNI[OA]/', '/^DEMONI[OA]/', '/^FEITICEIR[OA]/', '/^SENHOR\s+(D[OA]|DAS)/', '/^MESTRE\s+DO\s+HORROR/', '/^MOSQUETEIRO/', '/^GUARDA\s+DOU?RADO/', '/^CAPITÃO/', '/^CUPIDO/', '/^AMUR/', '/^PANTERA/', '/^MARRAKSHA/', '/^PUM[AÃ]/'];
    foreach ($petPatterns as $pat) {
        if (preg_match($pat, $nameUpper))
            return ['categoria' => 'Lacaios', 'subcategoria' => ''];
    }

    // --- TRAJES LUXUOSOS ---
    $costumePatterns = ['/^VESTIDO/', '/^TERNO\b/', '/^SMOKING/', '/^ROUPA\b/', '/^TRAJE\b/', '/^CONJUNTO\s+DE\s+BARBEIRO/'];
    foreach ($costumePatterns as $pat) {
        if (preg_match($pat, $nameUpper))
            return ['categoria' => 'Trajes Luxuosos', 'subcategoria' => ''];
    }

    // --- LIVROS DE HABILIDADE ---
    if (preg_match('/^LIVRO\s+(D[AEIO]|DO|DE)/', $nameUpper) || preg_match('/^GRIMÓRIO/', $nameUpper))
        return ['categoria' => 'Livros de Habilidade', 'subcategoria' => ''];

    // --- RECURSOS ---
    if (preg_match('/SUBSTÂNCIA/', $nameUpper) || preg_match('/ESSÊNCIA/', $nameUpper) || preg_match('/CATALIZADOR/', $nameUpper) || preg_match('/CATALISADOR/', $nameUpper))
        return ['categoria' => 'Recursos', 'subcategoria' => ''];

    // --- PACOTES DE INICIANTE ---
    if (preg_match('/^PACOTE\s+INICIANTE/', $nameUpper))
        return ['categoria' => 'Pacotes de Iniciante', 'subcategoria' => ''];

    // --- BAÚS ---
    if (preg_match('/^BA[UÚ]\b/', $nameUpper) || preg_match('/^BA[UÚ]\s+SECRETO/', $nameUpper) || preg_match('/^BA[UÚ]\s+LENDÁRIO/', $nameUpper))
        return ['categoria' => 'Baús', 'subcategoria' => ''];

    // --- SORRISOS ---
    if (preg_match('/^SORRISO/', $nameUpper))
        return ['categoria' => 'Sorrisos', 'subcategoria' => ''];

    // Fallback
    return ['categoria' => 'Utilidades', 'subcategoria' => ''];
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

<?php
/**
 * CLI seed script: rebuild templates from local SQLite database.
 * Uso: C:\xampp\php\php.exe api\seed_templates_cli.php
 *
 * Bypasses web auth/CSRF — designed for CLI / one-shot execution only.
 */

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

// ---- Category mapping function (same as seed_templates.php) ----
function mapCategory(string $name, string $category_label): array {
    $nameUpper = mb_strtoupper($name, 'UTF-8');

    // --- ARMAS: ordem específica primeiro ---
    if (preg_match('/ESPAD[AÃ]O/', $nameUpper) || preg_match('/GRANDE\s+ESPADA/', $nameUpper) || preg_match('/ESPADA\s+DE\s+DUAS/', $nameUpper)) {
        return ['categoria' => 'Armas', 'subcategoria' => 'Espadas de duas mãos'];
    }
    if (preg_match('/MACHADO\s+DE\s+DUAS/', $nameUpper)) {
        return ['categoria' => 'Armas', 'subcategoria' => 'Machados de duas mãos'];
    }
    if (preg_match('/MAÇ[AÃ]?\s*[A-Z\s]*DUAS/', $nameUpper) || preg_match('/MARTELO\s+DE\s+GUERRA/', $nameUpper)) {
        return ['categoria' => 'Armas', 'subcategoria' => 'Maças de duas mãos'];
    }
    if (preg_match('/BESTA/', $nameUpper) || preg_match('/ARBALEST/', $nameUpper)) {
        return ['categoria' => 'Armas', 'subcategoria' => 'Bestas'];
    }
    if (preg_match('/\bARCO\b/', $nameUpper)) {
        return ['categoria' => 'Armas', 'subcategoria' => 'Arcos'];
    }
    if (preg_match('/\bADAGA\b/', $nameUpper)) {
        return ['categoria' => 'Armas', 'subcategoria' => 'Adagas'];
    }
    if (preg_match('/\bLANÇ[AÃ]\b/', $nameUpper) || preg_match('/TRIDENTE/', $nameUpper)) {
        return ['categoria' => 'Armas', 'subcategoria' => 'Lanças'];
    }
    if (preg_match('/\bESCUDO\b/', $nameUpper)) {
        return ['categoria' => 'Armas', 'subcategoria' => 'Escudos'];
    }
    if (preg_match('/\bCAJADO\b/', $nameUpper) || preg_match('/BÁCULO/', $nameUpper) || preg_match('/BASTÃO/', $nameUpper)) {
        return ['categoria' => 'Armas', 'subcategoria' => 'Cajados'];
    }
    if (preg_match('/\bESPADA\b/', $nameUpper) || preg_match('/LÂMIN[AE]/', $nameUpper) || preg_match('/SABRE/', $nameUpper) || preg_match('/KATANA/', $nameUpper)) {
        return ['categoria' => 'Armas', 'subcategoria' => 'Espadas de uma mão'];
    }
    if (preg_match('/\bMACHADO\b/', $nameUpper) || preg_match('/FOICE/', $nameUpper)) {
        return ['categoria' => 'Armas', 'subcategoria' => 'Machados de uma mão'];
    }
    if (preg_match('/\bMAÇ[AÃ]\b/', $nameUpper) || preg_match('/\bMARTELO\b/', $nameUpper) || preg_match('/CLAVA/', $nameUpper) || preg_match('/PORRETE/', $nameUpper)) {
        return ['categoria' => 'Armas', 'subcategoria' => 'Maças de uma mão'];
    }
    if (preg_match('/ARPÃO/', $nameUpper) || preg_match('/ALABARDA/', $nameUpper)) {
        return ['categoria' => 'Armas', 'subcategoria' => 'Lanças'];
    }

    // --- ARMADURA ---
    if (preg_match('/CAPACETE/', $nameUpper) || preg_match('/\bELMO\b/', $nameUpper) || preg_match('/COROA/', $nameUpper) || preg_match('/DIADEMA/', $nameUpper) || preg_match('/MÁSCARA/', $nameUpper) || preg_match('/CARAPUÇ[AÃ]/', $nameUpper) || preg_match('/CHAPÉU/', $nameUpper)) {
        return ['categoria' => 'Armadura', 'subcategoria' => 'Cabeça'];
    }
    if (preg_match('/\bARMADURA\b/', $nameUpper) || preg_match('/PEITORAL/', $nameUpper) || preg_match('/MALHA/', $nameUpper) || preg_match('/COURAÇ[AÃ]/', $nameUpper) || preg_match('/TÚNICA/', $nameUpper) || preg_match('/VESTES/', $nameUpper) || preg_match('/MANTO/', $nameUpper) || preg_match('/COTA\s+DE/', $nameUpper) || preg_match('/CASACO/', $nameUpper)) {
        return ['categoria' => 'Armadura', 'subcategoria' => 'Tronco'];
    }
    if (preg_match('/LUVAS/', $nameUpper) || preg_match('/MANOPLA/', $nameUpper) || preg_match('/BRAÇADEIRAS/', $nameUpper)) {
        return ['categoria' => 'Armadura', 'subcategoria' => 'Mãos'];
    }
    if (preg_match('/\bCINTO\b/', $nameUpper) || preg_match('/FAIXA/', $nameUpper)) {
        return ['categoria' => 'Armadura', 'subcategoria' => 'Cintura'];
    }
    if (preg_match('/BOTAS/', $nameUpper) || preg_match('/COTURNOS/', $nameUpper) || preg_match('/GREVAS/', $nameUpper) || preg_match('/CALÇAS/', $nameUpper) || preg_match('/CALÇ[AÃ]O/', $nameUpper)) {
        return ['categoria' => 'Armadura', 'subcategoria' => 'Pernas'];
    }

    // --- ACESSÓRIOS ---
    if (preg_match('/\bANEL\b/', $nameUpper) || preg_match('/\bANÉIS\b/', $nameUpper)) {
        return ['categoria' => 'Acessórios', 'subcategoria' => 'Anéis'];
    }
    if (preg_match('/AMULETO/', $nameUpper) || preg_match('/TALISMÃ/', $nameUpper) || preg_match('/COLAR/', $nameUpper) || preg_match('/GARGANTILHA/', $nameUpper) || preg_match('/MEDALH[AÃ]O/', $nameUpper)) {
        return ['categoria' => 'Acessórios', 'subcategoria' => 'Amuletos'];
    }
    if (preg_match('/BRACELETE/', $nameUpper) || preg_match('/MANILHA/', $nameUpper)) {
        return ['categoria' => 'Acessórios', 'subcategoria' => 'Braceletes'];
    }
    if (preg_match('/CAPOTE/', $nameUpper) || preg_match('/\bCAPA\b/', $nameUpper)) {
        return ['categoria' => 'Acessórios', 'subcategoria' => 'Capotes'];
    }

    // --- CONSUMÍVEIS ---
    if ($category_label === 'Poção/Elixir') {
        $potionName = $nameUpper;
        if (preg_match('/PERGAMINHO/', $potionName)) {
            return ['categoria' => 'Consumíveis', 'subcategoria' => 'Pergaminhos'];
        }
        if (preg_match('/ALIMENTO/', $potionName) || preg_match('/QUEIJO/', $potionName) || preg_match('/PRESUNTO/', $potionName) || preg_match('/MINGAU/', $potionName) || preg_match('/CIDRA/', $potionName)) {
            return ['categoria' => 'Consumíveis', 'subcategoria' => 'Alimento'];
        }
        if (preg_match('/ARTEFATO/', $potionName)) {
            return ['categoria' => 'Consumíveis', 'subcategoria' => 'Artefatos'];
        }
        return ['categoria' => 'Consumíveis', 'subcategoria' => 'Poções'];
    }
    if (preg_match('/^POÇ[AÃ]O/', $nameUpper) || preg_match('/^ELIXIR/', $nameUpper)) {
        return ['categoria' => 'Consumíveis', 'subcategoria' => 'Poções'];
    }
    if (preg_match('/PERGAMINHO/', $nameUpper)) {
        return ['categoria' => 'Consumíveis', 'subcategoria' => 'Pergaminhos'];
    }
    if (preg_match('/ALIMENTO/', $nameUpper) || preg_match('/QUEIJO/', $nameUpper) || preg_match('/PRESUNTO/', $nameUpper) || preg_match('/MINGAU/', $nameUpper) || preg_match('/CERVEJA/', $nameUpper)) {
        return ['categoria' => 'Consumíveis', 'subcategoria' => 'Alimento'];
    }
    if (preg_match('/ARTEFATO/', $nameUpper)) {
        return ['categoria' => 'Consumíveis', 'subcategoria' => 'Artefatos'];
    }

    // --- EVENTO ---
    if ($category_label === 'Evento') {
        return ['categoria' => 'Consumíveis', 'subcategoria' => 'Evento'];
    }

    // --- RELÍQUIAS ---
    if ($category_label === 'Relíquia' || preg_match('/RELÍQUIA/', $nameUpper) || preg_match('/RELICÁRIO/', $nameUpper)) {
        return ['categoria' => 'Relíquias', 'subcategoria' => 'Aprimoramento'];
    }

    // --- APRIMORAMENTOS ---
    if (preg_match('/\bRUNA\b/', $nameUpper) && !preg_match('/CRISTAL/', $nameUpper)) {
        if (preg_match('/AMPLIFICAÇÃO/', $nameUpper)) {
            return ['categoria' => 'Aprimoramentos', 'subcategoria' => 'Amplificação'];
        }
        return ['categoria' => 'Aprimoramentos', 'subcategoria' => 'Runas'];
    }
    if (preg_match('/CRISTAL/', $nameUpper)) {
        if (preg_match('/AMPLIFICAÇÃO/', $nameUpper)) {
            return ['categoria' => 'Aprimoramentos', 'subcategoria' => 'Amplificação'];
        }
        return ['categoria' => 'Aprimoramentos', 'subcategoria' => 'Cristais'];
    }
    if (preg_match('/ESFERA\s+DE\s+APRIMORAMENTO/', $nameUpper) || preg_match('/AMPLIFICAÇÃO/', $nameUpper)) {
        return ['categoria' => 'Aprimoramentos', 'subcategoria' => 'Amplificação'];
    }

    // --- LACAIOS ---
    $petPatterns = ['/^FADA/', '/^PANDA/', '/^COELH/', '/^GAT[OA]/', '/^RENA/', '/^ELFO\s+DA\s+NEVE/', '/^URSO\s+DE\s+PELÚCIA/', '/^DEMÔNI[OA]/', '/^DEMONI[OA]/', '/^FEITICEIR[OA]/', '/^SENHOR\s+(D[OA]|DAS)/', '/^MESTRE\s+DO\s+HORROR/', '/^MOSQUETEIRO/', '/^GUARDA\s+DOU?RADO/', '/^CAPITÃO/', '/^CUPIDO/', '/^AMUR/', '/^PANTERA/', '/^MARRAKSHA/', '/^PUM[AÃ]/'];
    foreach ($petPatterns as $pat) {
        if (preg_match($pat, $nameUpper)) {
            return ['categoria' => 'Lacaios', 'subcategoria' => ''];
        }
    }

    // --- TRAJES LUXUOSOS ---
    $costumePatterns = ['/^VESTIDO/', '/^TERNO\b/', '/^SMOKING/', '/^ROUPA\b/', '/^TRAJE\b/', '/^CONJUNTO\s+DE\s+BARBEIRO/'];
    foreach ($costumePatterns as $pat) {
        if (preg_match($pat, $nameUpper)) {
            return ['categoria' => 'Trajes Luxuosos', 'subcategoria' => ''];
        }
    }

    // --- LIVROS DE HABILIDADE ---
    if (preg_match('/^LIVRO\s+(D[AEIO]|DO|DE)/', $nameUpper) || preg_match('/^GRIMÓRIO/', $nameUpper)) {
        return ['categoria' => 'Livros de Habilidade', 'subcategoria' => ''];
    }

    // --- RECURSOS ---
    if (preg_match('/SUBSTÂNCIA/', $nameUpper) || preg_match('/ESSÊNCIA/', $nameUpper) || preg_match('/CATALIZADOR/', $nameUpper) || preg_match('/CATALISADOR/', $nameUpper)) {
        return ['categoria' => 'Recursos', 'subcategoria' => ''];
    }

    // --- SAQUEAR ---
    if (preg_match('/SAQUEAR/', $nameUpper) || preg_match('/DESPOJO/', $nameUpper)) {
        return ['categoria' => 'Saquear', 'subcategoria' => ''];
    }

    // --- PACOTES DE INICIANTE ---
    if (preg_match('/^PACOTE\s+INICIANTE/', $nameUpper)) {
        return ['categoria' => 'Pacotes de Iniciante', 'subcategoria' => ''];
    }

    // --- BAÚS ---
    if (preg_match('/^BA[UÚ]\b/', $nameUpper) || preg_match('/^BA[UÚ]\s+SECRETO/', $nameUpper) || preg_match('/^BA[UÚ]\s+LENDÁRIO/', $nameUpper)) {
        return ['categoria' => 'Baús', 'subcategoria' => ''];
    }

    // --- SORRISOS ---
    if (preg_match('/^SORRISO/', $nameUpper)) {
        return ['categoria' => 'Sorrisos', 'subcategoria' => ''];
    }

    // Fallback: Utilidades
    return ['categoria' => 'Utilidades', 'subcategoria' => ''];
}

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

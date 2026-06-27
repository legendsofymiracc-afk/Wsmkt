<?php
/**
 * Importa catalogo de itens do Warspear Online
 *
 * Le o arquivo JSON com ~11.772 itens e importa apenas aqueles
 * que possuem icone (has_icon_by_same_id = true, ~2.053 itens).
 * Mapeia categorias conforme rules de negocio definidas e cria
 * registros na tabela "itens" com imagem_url, nome, descricao.
 *
 * Uso:   GET /api/import_catalog.php (requer sessao admin)
 *        curl -b /tmp/c http://127.0.0.1:8080/api/import_catalog.php
 */

require_once __DIR__ . '/routes.php';

// Apenas admin pode importar
if (!isAdmin()) {
    http_response_code(401);
    echo json_encode(['error' => 'Acesso negado. Apenas administradores podem importar catalogo.']);
    exit;
}

set_time_limit(300); // Pode levar alguns segundos para 2k+ itens

$db = getDB();

// ---------------------------------------------------------------------------
// 1. Descobrir mapeamento de categories existentes
// ---------------------------------------------------------------------------

$catMap = []; // nome => row
$stmt = $db->query('SELECT id, id_pai, nome, nivel FROM categorias ORDER BY id ASC');
foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
    $catMap[$row['nome']] = $row;
}

// Helper para criar subcategoria se nao existir
function ensureCategory(PDO $db, string $nome, int $idPai, int $nivel): array {
    global $catMap;
    // Ja existe?
    foreach ($catMap as $existing) {
        if ($existing['nome'] === $nome && (int)$existing['id_pai'] === $idPai) {
            return $existing;
        }
    }
    // Criar
    $stmt = $db->prepare('INSERT INTO categorias (id_pai, nome, nivel, imagem_url) VALUES (?, ?, ?, ?)');
    $stmt->execute([$idPai, $nome, $nivel, '']);
    $newId = (int)$db->lastInsertId();
    $row = ['id' => $newId, 'id_pai' => $idPai, 'nome' => $nome, 'nivel' => $nivel];
    $catMap[$nome] = $row;
    return $row;
}

// ---------------------------------------------------------------------------
// 2. Mapeamento category_label -> ID no banco
// ---------------------------------------------------------------------------

$poesSub = $catMap['Poções'] ?? null;    // id=46, nivel=2 sob Consumiveis (id=44)
$consumiveis = $catMap['Consumíveis'] ?? null; // id=44
$reliquiasAp = $catMap['Aprimoramento'] ?? null; // id=52, nivel=2 sob Reliquias (id=51)
$utilidades = $catMap['Utilidades'] ?? null; // id=49, nivel=1

// Cria "Evento" sob "Consumiveis" se necessario
$eventoCat = ensureCategory($db, 'Evento', (int)($consumiveis['id'] ?? 44), 2);

// ---------------------------------------------------------------------------
// 3. Mapeamento de keywords para categories (para "Outros Efeitos")
// ---------------------------------------------------------------------------

/**
 * Tenta encontrar a categoria mais especifica para um item dado seu nome.
 * Retorna ['type'=>'id_subcategoria|id_categoria|id_geral', 'id'=>int] ou null.
 */
function matchCategoryByKeywords(string $nome, array $catMap): ?array {
    $nomeLower = mb_strtolower(trim($nome));
    if (empty($nomeLower)) return null;

    // --------------- Armas (nivel 1 id=3) ---------------
    $armasGeral = 3;

    // Precisamos verificar "duas maos" antes de "uma mao"
    $isDuasMaos = (bool) preg_match('/duas\s*mãos|duas\s*maos/', $nomeLower);

    // Adaga / Faca -> id=4
    if (preg_match('/\badaga\b|\bfaca\b|\bpunhal\b/', $nomeLower)) {
        return ['type' => 'id_categoria', 'id' => 4];
    }
    // Espada -> 5 (uma mao) ou 6 (duas maos)
    if (preg_match('/\bespada\b/', $nomeLower)) {
        return ['type' => 'id_categoria', 'id' => $isDuasMaos ? 6 : 5];
    }
    // Machado -> 7 (uma mao) ou 8 (duas maos)
    if (preg_match('/\bmachado\b/', $nomeLower)) {
        return ['type' => 'id_categoria', 'id' => $isDuasMaos ? 8 : 7];
    }
    // Maca -> 9 (uma mao) ou 10 (duas maos)
    if (preg_match('/\bmaça\b|\bmaca\b|\bmassa\b/', $nomeLower)) {
        return ['type' => 'id_categoria', 'id' => $isDuasMaos ? 10 : 9];
    }
    // Lanca -> 11
    if (preg_match('/\blança\b|\blanca\b/', $nomeLower)) {
        return ['type' => 'id_categoria', 'id' => 11];
    }
    // Escudo -> 12
    if (preg_match('/\bescudo\b/', $nomeLower)) {
        return ['type' => 'id_categoria', 'id' => 12];
    }
    // Cajado -> 13
    if (preg_match('/\bcajado\b/', $nomeLower)) {
        return ['type' => 'id_categoria', 'id' => 13];
    }
    // Arco -> 14
    if (preg_match('/\barco\b/', $nomeLower)) {
        return ['type' => 'id_categoria', 'id' => 14];
    }
    // Besta -> 15
    if (preg_match('/\bbesta\b/', $nomeLower)) {
        return ['type' => 'id_categoria', 'id' => 15];
    }

    // --------------- Armadura (nivel 1 id=16) ---------------
    $armaduraGeral = 16;

    // Determina tipo de armadura
    $tipoArmadura = 'tecido'; // default
    if (preg_match('/\bpesad[ao]\b/', $nomeLower)) {
        $tipoArmadura = 'pesada';
    } elseif (preg_match('/\bleve\b/', $nomeLower)) {
        $tipoArmadura = 'leve';
    } elseif (preg_match('/\btecido\b/', $nomeLower)) {
        $tipoArmadura = 'tecido';
    }

    // IDs das subcategorias de armadura por tipo
    $armorSlots = [
        'tecido' => ['cabeca' => 18, 'tronco' => 19, 'maos' => 20, 'cintura' => 21, 'pernas' => 22],
        'leve'   => ['cabeca' => 24, 'tronco' => 25, 'maos' => 26, 'cintura' => 27, 'pernas' => 28],
        'pesada' => ['cabeca' => 30, 'tronco' => 31, 'maos' => 32, 'cintura' => 33, 'pernas' => 34],
    ];

    // Detecta parte do corpo
    $slot = null;
    if (preg_match('/\bcabeça\b|\bcabeca\b|\bcapacete\b|\belmo\b/', $nomeLower)) $slot = 'cabeca';
    elseif (preg_match('/\btronco\b|\btúnica\b|\btunica\b|\bveste\b|\bvestido\b|\bmanto\b|\bcota\b/', $nomeLower)) $slot = 'tronco';
    elseif (preg_match('/\bmão\b|\bmao\b|\bmaos\b|\bmãos\b|\bluva\b/', $nomeLower)) $slot = 'maos';
    elseif (preg_match('/\bcintura\b|\bcinto\b|\bfivela\b/', $nomeLower)) $slot = 'cintura';
    elseif (preg_match('/\bperna\b|\bpernas\b|\bcalça\b|\bcalca\b|\bbota\b/', $nomeLower)) $slot = 'pernas';

    if ($slot !== null && isset($armorSlots[$tipoArmadura][$slot])) {
        return ['type' => 'id_subcategoria', 'id' => $armorSlots[$tipoArmadura][$slot]];
    }

    // Pecas de armadura genericas sem parte do corpo
    if (preg_match('/\barmadura\b/', $nomeLower)) {
        return ['type' => 'id_categoria', 'id' => 17]; // Armadura de Tecido (generico)
    }

    // --------------- Acessorios (nivel 1 id=35) ---------------
    if (preg_match('/\banel\b/', $nomeLower)) {
        return ['type' => 'id_categoria', 'id' => 38];
    }
    if (preg_match('/\bamuleto\b/', $nomeLower)) {
        return ['type' => 'id_categoria', 'id' => 39];
    }
    if (preg_match('/\bcapote\b/', $nomeLower)) {
        return ['type' => 'id_categoria', 'id' => 37];
    }
    if (preg_match('/\bbr?acelete\b/', $nomeLower)) {
        return ['type' => 'id_categoria', 'id' => 36];
    }

    // --------------- Aprimoramentos/Runas (nivel 1 id=40) ---------------
    if (preg_match('/\bruna\b/', $nomeLower)) {
        return ['type' => 'id_categoria', 'id' => 41];
    }
    if (preg_match('/\bcristal\b/', $nomeLower)) {
        return ['type' => 'id_categoria', 'id' => 42];
    }
    if (preg_match('/\bamplificação\b|\bamplificacao\b/', $nomeLower)) {
        return ['type' => 'id_categoria', 'id' => 43];
    }

    // --------------- Consumiveis (nivel 1 id=44) ---------------
    // Pocoes - cuidado para nao pegar nomes de equipamentos com "pocao"
    if (preg_match('/\bpoção\b|\bpocao\b|\belixir\b/', $nomeLower)) {
        return ['type' => 'id_categoria', 'id' => 46];
    }
    // Alimento
    if (preg_match('/\balimento\b|\bcarne\b|\bpão\b|\bpao\b|\bqueijo\b|\bcogumelo\b|\bpeixe\b|\bisca\b/', $nomeLower)) {
        return ['type' => 'id_categoria', 'id' => 45];
    }
    // Pergaminho
    if (preg_match('/\bpergaminho\b/', $nomeLower)) {
        return ['type' => 'id_categoria', 'id' => 47];
    }
    // Artefato
    if (preg_match('/\bartefato\b/', $nomeLower)) {
        return ['type' => 'id_categoria', 'id' => 48];
    }

    // --------------- Recursos (nivel 1 id=67) ---------------
    if (preg_match('/\bessência\b|\bessencia\b/', $nomeLower)) {
        return ['type' => 'id_categoria', 'id' => 69];
    }
    if (preg_match('/\bsubstância\b|\bsubstancia\b/', $nomeLower)) {
        return ['type' => 'id_categoria', 'id' => 68];
    }
    if (preg_match('/\bcatalizador\b/', $nomeLower)) {
        return ['type' => 'id_categoria', 'id' => 70];
    }

    // --------------- Outros gerais (nivel 1) ---------------
    if (preg_match('/\bbau\b|\bbaú\b/', $nomeLower)) {
        return ['type' => 'id_geral', 'id' => 1];
    }
    if (preg_match('/\bpacote\b/', $nomeLower)) {
        return ['type' => 'id_geral', 'id' => 2];
    }
    if (preg_match('/\blacaio\b/', $nomeLower)) {
        return ['type' => 'id_geral', 'id' => 50];
    }
    if (preg_match('/\blivro\b/', $nomeLower)) {
        return ['type' => 'id_geral', 'id' => 56];
    }
    if (preg_match('/\btraje\b/', $nomeLower)) {
        return ['type' => 'id_geral', 'id' => 65];
    }
    if (preg_match('/\bsorriso\b/', $nomeLower)) {
        return ['type' => 'id_geral', 'id' => 66];
    }
    if (preg_match('/\bsaquear\b/', $nomeLower)) {
        return ['type' => 'id_geral', 'id' => 73];
    }
    // Chave -> muitas vezes sao chaves de bau
    if (preg_match('/\bchave\b/', $nomeLower)) {
        return ['type' => 'id_geral', 'id' => 1]; // Baus
    }

    // --------------- Reliquias ---------------
    if (preg_match('/\brelíquia\b|\breliquia\b/', $nomeLower)) {
        return ['type' => 'id_categoria', 'id' => 52]; // Aprimoramento
    }

    return null; // nao reconhecido
}

// ---------------------------------------------------------------------------
// 4. Ler JSON e importar
// ---------------------------------------------------------------------------

$jsonPath = __DIR__ . '/../market_item_database_assets/items_market_catalog.json';
if (!file_exists($jsonPath)) {
    http_response_code(500);
    echo json_encode(['error' => 'Arquivo JSON do catalogo nao encontrado: ' . $jsonPath]);
    exit;
}

$raw = json_decode(file_get_contents($jsonPath), true);
$items = $raw['items'] ?? [];

$imported = 0;
$skipped = 0;
$errors = 0;
$duplicates = 0;
$notFound = 0;

// Mapa de nomes para detectar duplicatas (case-insensitive)
$existingNames = [];
$stmt = $db->query('SELECT LOWER(nome) AS nome_lower FROM itens');
foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
    $existingNames[$row['nome_lower']] = true;
}

$insertStmt = $db->prepare('INSERT INTO itens (id_subcategoria, id_categoria, id_geral, nome, descricao, preco_moedas, preco_reais, quantidade_disponivel, imagem_url) VALUES (?, ?, ?, ?, ?, 0, 0, 0, ?)');

$db->beginTransaction();

try {
    foreach ($items as $item) {
        // So importa se tem icone
        if (empty($item['has_icon_by_same_id'])) {
            $skipped++;
            continue;
        }

        $nome = trim($item['name_exact'] ?? '');
        // Se nome vazio, gera a partir do item_id
        if (empty($nome)) {
            $nome = 'Item #' . $item['item_id'];
        }

        // Pular duplicatas pelo nome
        $nomeLower = mb_strtolower($nome);
        if (isset($existingNames[$nomeLower])) {
            $duplicates++;
            continue;
        }

        // Descricao
        $descricao = trim($item['description'] ?? '');

        // Caminho do icone
        $iconPath = $item['icon_path'] ?? '';
        $iconFilename = basename($iconPath);
        $imagemUrl = 'images/uploads/items/' . $iconFilename;

        // Determinar categoria
        $categoryLabel = $item['category_label'] ?? '';

        $idSub = null;
        $idCat = null;
        $idGer = null;

        switch ($categoryLabel) {
            case 'Poção/Elixir':
                $idCat = (int)($poesSub['id'] ?? 46);
                break;

            case 'Relíquia':
                $idCat = (int)($reliquiasAp['id'] ?? 52);
                break;

            case 'Evento':
                $idCat = (int)$eventoCat['id'];
                break;

            case 'Outros Efeitos':
                $match = matchCategoryByKeywords($nome, $catMap);
                if ($match !== null) {
                    $t = $match['type'];
                    $v = (int)$match['id'];
                    if ($t === 'id_subcategoria') $idSub = $v;
                    elseif ($t === 'id_categoria') $idCat = $v;
                    elseif ($t === 'id_geral') $idGer = $v;
                } else {
                    // Fallback: Utilidades
                    $idGer = (int)($utilidades['id'] ?? 49);
                }
                break;

            default:
                $idGer = (int)($utilidades['id'] ?? 49);
                break;
        }

        $insertStmt->execute([
            $idSub,
            $idCat,
            $idGer,
            $nome,
            $descricao,
            $imagemUrl
        ]);

        $existingNames[$nomeLower] = true;
        $imported++;
    }

    $db->commit();
} catch (Throwable $e) {
    if ($db->inTransaction()) {
        $db->rollBack();
    }
    http_response_code(500);
    echo json_encode([
        'error' => 'Erro durante importacao: ' . $e->getMessage(),
        'imported' => $imported,
        'skipped' => $skipped,
        'duplicates' => $duplicates
    ]);
    exit;
}

// ---------------------------------------------------------------------------
// 5. Resultado
// ---------------------------------------------------------------------------

echo json_encode([
    'success' => true,
    'message' => 'Importacao concluida',
    'total_no_catalogo' => count($items),
    'com_icone' => $imported + $duplicates + $errors,
    'importados' => $imported,
    'duplicatas' => $duplicates,
    'sem_icone_pulados' => $skipped,
    'erros' => $errors
], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

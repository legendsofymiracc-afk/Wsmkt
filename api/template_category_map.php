<?php
declare(strict_types=1);

function mapTemplateCategory(string $name, string $categoryLabel): array {
    $nameUpper = mb_strtoupper($name, 'UTF-8');
    $labelFolded = foldTemplateText($categoryLabel);

    if (preg_match('/ESPAD[AÃ]O/u', $nameUpper) || preg_match('/GRANDE\s+ESPADA/u', $nameUpper) || preg_match('/ESPADA\s+DE\s+DUAS/u', $nameUpper)) {
        return ['categoria' => 'Armas', 'subcategoria' => 'Espadas de duas mãos'];
    }
    if (preg_match('/MACHADO\s+DE\s+DUAS/u', $nameUpper)) {
        return ['categoria' => 'Armas', 'subcategoria' => 'Machados de duas mãos'];
    }
    if (preg_match('/MAÇ[AÃ]?\s*[A-Z\s]*DUAS/u', $nameUpper) || preg_match('/MARTELO\s+DE\s+GUERRA/u', $nameUpper)) {
        return ['categoria' => 'Armas', 'subcategoria' => 'Maças de duas mãos'];
    }
    if (preg_match('/BESTA/u', $nameUpper) || preg_match('/ARBALEST/u', $nameUpper)) {
        return ['categoria' => 'Armas', 'subcategoria' => 'Bestas'];
    }
    if (preg_match('/\bARCO\b/u', $nameUpper)) {
        return ['categoria' => 'Armas', 'subcategoria' => 'Arcos'];
    }
    if (preg_match('/\bADAGA\b/u', $nameUpper)) {
        return ['categoria' => 'Armas', 'subcategoria' => 'Adagas'];
    }
    if (preg_match('/\bLANÇ[AÃ]\b/u', $nameUpper) || preg_match('/TRIDENTE/u', $nameUpper)) {
        return ['categoria' => 'Armas', 'subcategoria' => 'Lanças'];
    }
    if (preg_match('/\bESCUDO\b/u', $nameUpper)) {
        return ['categoria' => 'Armas', 'subcategoria' => 'Escudos'];
    }
    if (preg_match('/\bCAJADO\b/u', $nameUpper) || preg_match('/BÁCULO/u', $nameUpper) || preg_match('/BASTÃO/u', $nameUpper)) {
        return ['categoria' => 'Armas', 'subcategoria' => 'Cajados'];
    }
    if (preg_match('/\bESPADA\b/u', $nameUpper) || preg_match('/LÂMIN[AE]/u', $nameUpper) || preg_match('/SABRE/u', $nameUpper) || preg_match('/KATANA/u', $nameUpper)) {
        return ['categoria' => 'Armas', 'subcategoria' => 'Espadas de uma mão'];
    }
    if (preg_match('/\bMACHADO\b/u', $nameUpper) || preg_match('/FOICE/u', $nameUpper)) {
        return ['categoria' => 'Armas', 'subcategoria' => 'Machados de uma mão'];
    }
    if (preg_match('/\bMAÇ[AÃ]\b/u', $nameUpper) || preg_match('/\bMARTELO\b/u', $nameUpper) || preg_match('/CLAVA/u', $nameUpper) || preg_match('/PORRETE/u', $nameUpper)) {
        return ['categoria' => 'Armas', 'subcategoria' => 'Maças de uma mão'];
    }
    if (preg_match('/ARPÃO/u', $nameUpper) || preg_match('/ALABARDA/u', $nameUpper)) {
        return ['categoria' => 'Armas', 'subcategoria' => 'Lanças'];
    }

    if (preg_match('/CAPACETE/u', $nameUpper) || preg_match('/\bELMO\b/u', $nameUpper) || preg_match('/COROA/u', $nameUpper) || preg_match('/DIADEMA/u', $nameUpper) || preg_match('/MÁSCARA/u', $nameUpper) || preg_match('/CARAPUÇ[AÃ]/u', $nameUpper) || preg_match('/CHAPÉU/u', $nameUpper)) {
        return ['categoria' => 'Armadura', 'subcategoria' => 'Cabeça'];
    }
    if (preg_match('/\bARMADURA\b/u', $nameUpper) || preg_match('/PEITORAL/u', $nameUpper) || preg_match('/MALHA/u', $nameUpper) || preg_match('/COURAÇ[AÃ]/u', $nameUpper) || preg_match('/TÚNICA/u', $nameUpper) || preg_match('/VESTES/u', $nameUpper) || preg_match('/MANTO/u', $nameUpper) || preg_match('/COTA\s+DE/u', $nameUpper) || preg_match('/CASACO/u', $nameUpper)) {
        return ['categoria' => 'Armadura', 'subcategoria' => 'Tronco'];
    }
    if (preg_match('/LUVAS/u', $nameUpper) || preg_match('/MANOPLA/u', $nameUpper) || preg_match('/BRAÇADEIRAS/u', $nameUpper)) {
        return ['categoria' => 'Armadura', 'subcategoria' => 'Mãos'];
    }
    if (preg_match('/\bCINTO\b/u', $nameUpper) || preg_match('/FAIXA/u', $nameUpper)) {
        return ['categoria' => 'Armadura', 'subcategoria' => 'Cintura'];
    }
    if (preg_match('/BOTAS/u', $nameUpper) || preg_match('/COTURNOS/u', $nameUpper) || preg_match('/GREVAS/u', $nameUpper) || preg_match('/CALÇAS/u', $nameUpper) || preg_match('/CALÇ[AÃ]O/u', $nameUpper)) {
        return ['categoria' => 'Armadura', 'subcategoria' => 'Pernas'];
    }

    if (preg_match('/\bANEL\b/u', $nameUpper) || preg_match('/\bANÉIS\b/u', $nameUpper)) {
        return ['categoria' => 'Acessórios', 'subcategoria' => 'Anéis'];
    }
    if (preg_match('/AMULETO/u', $nameUpper) || preg_match('/TALISMÃ/u', $nameUpper) || preg_match('/COLAR/u', $nameUpper) || preg_match('/GARGANTILHA/u', $nameUpper) || preg_match('/MEDALH[AÃ]O/u', $nameUpper)) {
        return ['categoria' => 'Acessórios', 'subcategoria' => 'Amuletos'];
    }
    if (preg_match('/BRACELETE/u', $nameUpper) || preg_match('/MANILHA/u', $nameUpper)) {
        return ['categoria' => 'Acessórios', 'subcategoria' => 'Braceletes'];
    }
    if (preg_match('/CAPOTE/u', $nameUpper) || preg_match('/\bCAPA\b/u', $nameUpper)) {
        return ['categoria' => 'Acessórios', 'subcategoria' => 'Capotes'];
    }

    if ($labelFolded === 'POCAO/ELIXIR' || $categoryLabel === 'PoÃ§Ã£o/Elixir') {
        $miraculous = preg_match('/MILAGROS|MIRACUL/u', $nameUpper);
        if (preg_match('/PERGAMINHO/u', $nameUpper)) {
            return ['categoria' => 'Consumíveis', 'subcategoria' => $miraculous ? 'Pergaminhos milagrosos' : 'Pergaminhos comuns'];
        }
        return ['categoria' => 'Consumíveis', 'subcategoria' => $miraculous ? 'Poções milagrosas' : 'Poções comuns'];
    }
    if (preg_match('/^(POÇ[AÃ]O|POCAO)/u', $nameUpper) || preg_match('/^ELIXIR/u', $nameUpper)) {
        return ['categoria' => 'Consumíveis', 'subcategoria' => preg_match('/MILAGROS|MIRACUL/u', $nameUpper) ? 'Poções milagrosas' : 'Poções comuns'];
    }
    if (preg_match('/PERGAMINHO/u', $nameUpper)) {
        return ['categoria' => 'Consumíveis', 'subcategoria' => preg_match('/MILAGROS|MIRACUL/u', $nameUpper) ? 'Pergaminhos milagrosos' : 'Pergaminhos comuns'];
    }
    if (preg_match('/ALIMENTO/u', $nameUpper) || preg_match('/QUEIJO/u', $nameUpper) || preg_match('/PRESUNTO/u', $nameUpper) || preg_match('/MINGAU/u', $nameUpper) || preg_match('/CERVEJA/u', $nameUpper)) {
        return ['categoria' => 'Consumíveis', 'subcategoria' => 'Poções comuns'];
    }
    if (preg_match('/ARTEFATO/u', $nameUpper)) {
        return ['categoria' => 'Consumíveis', 'subcategoria' => 'Poções comuns'];
    }

    if ($categoryLabel === 'Evento') {
        return ['categoria' => 'Consumíveis', 'subcategoria' => 'Poções comuns'];
    }
    if ($categoryLabel === 'Relíquia' || $categoryLabel === 'RelÃ­quia' || preg_match('/RELÍQUIA/u', $nameUpper) || preg_match('/RELICÁRIO/u', $nameUpper)) {
        return ['categoria' => 'Relíquias', 'subcategoria' => 'Aprimoramento'];
    }

    if (preg_match('/\bRUNA\b/u', $nameUpper) && !preg_match('/CRISTAL/u', $nameUpper)) {
        return ['categoria' => 'Aprimoramentos', 'subcategoria' => preg_match('/AMPLIFICAÇÃO/u', $nameUpper) ? 'Amplificação' : 'Runas'];
    }
    if (preg_match('/CRISTAL/u', $nameUpper)) {
        return ['categoria' => 'Aprimoramentos', 'subcategoria' => preg_match('/AMPLIFICAÇÃO/u', $nameUpper) ? 'Amplificação' : 'Cristais'];
    }
    if (preg_match('/ESFERA\s+DE\s+APRIMORAMENTO/u', $nameUpper) || preg_match('/AMPLIFICAÇÃO/u', $nameUpper)) {
        return ['categoria' => 'Aprimoramentos', 'subcategoria' => 'Amplificação'];
    }

    $petPatterns = ['/^FADA/u', '/^PANDA/u', '/^COELH/u', '/^GAT[OA]/u', '/^RENA/u', '/^ELFO\s+DA\s+NEVE/u', '/^URSO\s+DE\s+PELÚCIA/u', '/^DEMÔNI[OA]/u', '/^DEMONI[OA]/u', '/^FEITICEIR[OA]/u', '/^SENHOR\s+(D[OA]|DAS)/u', '/^MESTRE\s+DO\s+HORROR/u', '/^MOSQUETEIRO/u', '/^GUARDA\s+DOU?RADO/u', '/^CAPITÃO/u', '/^CUPIDO/u', '/^AMUR/u', '/^PANTERA/u', '/^MARRAKSHA/u', '/^PUM[AÃ]/u'];
    foreach ($petPatterns as $pattern) {
        if (preg_match($pattern, $nameUpper)) {
            return ['categoria' => 'Lacaios', 'subcategoria' => ''];
        }
    }

    $costumePatterns = ['/^VESTIDO/u', '/^TERNO\b/u', '/^SMOKING/u', '/^ROUPA\b/u', '/^TRAJE\b/u', '/^CONJUNTO\s+DE\s+BARBEIRO/u'];
    foreach ($costumePatterns as $pattern) {
        if (preg_match($pattern, $nameUpper)) {
            return ['categoria' => 'Trajes Luxuosos', 'subcategoria' => ''];
        }
    }

    if (preg_match('/^LIVRO\s+(D[AEIO]|DO|DE)/u', $nameUpper) || preg_match('/^GRIMÓRIO/u', $nameUpper)) {
        return ['categoria' => 'Livros de Habilidade', 'subcategoria' => ''];
    }
    if (preg_match('/SUBSTÂNCIA/u', $nameUpper) || preg_match('/ESSÊNCIA/u', $nameUpper) || preg_match('/CATALIZADOR/u', $nameUpper) || preg_match('/CATALISADOR/u', $nameUpper)) {
        return ['categoria' => 'Recursos', 'subcategoria' => ''];
    }
    if (preg_match('/SAQUEAR/u', $nameUpper) || preg_match('/DESPOJO/u', $nameUpper)) {
        return ['categoria' => 'Saquear', 'subcategoria' => ''];
    }
    if (preg_match('/^PACOTE\s+INICIANTE/u', $nameUpper)) {
        return ['categoria' => 'Pacotes de Iniciante', 'subcategoria' => ''];
    }
    if (preg_match('/^BA[UÚ]\b/u', $nameUpper) || preg_match('/^BA[UÚ]\s+SECRETO/u', $nameUpper) || preg_match('/^BA[UÚ]\s+LENDÁRIO/u', $nameUpper)) {
        return ['categoria' => 'Baús', 'subcategoria' => ''];
    }
    if (preg_match('/^SORRISO/u', $nameUpper)) {
        return ['categoria' => 'Sorrisos', 'subcategoria' => ''];
    }

    return ['categoria' => 'Utilidades', 'subcategoria' => ''];
}

if (!function_exists('mapCategory')) {
    function mapCategory(string $name, string $category_label): array {
        return mapTemplateCategory($name, $category_label);
    }
}

function foldTemplateText(string $text): string {
    $upper = mb_strtoupper($text, 'UTF-8');
    $folded = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $upper);
    return $folded === false ? $upper : $folded;
}

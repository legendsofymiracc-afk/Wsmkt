<?php
declare(strict_types=1);

set_time_limit(1800);

$root = dirname(__DIR__);
$db = new PDO('sqlite:' . $root . '/database/mercado.db');
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

function isCompactDetails(?string $json): bool {
    if (!$json || $json === '{}') return true;
    $data = json_decode($json, true);
    if (!is_array($data)) return true;
    return count($data) <= 2 || !array_key_exists('itemType', $data);
}

function compactAttrs(array $detail): string {
    return json_encode([
        'level' => (int)($detail['level'] ?? 0),
        'color' => (int)($detail['color'] ?? 0),
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

function rarityName(int $color): string {
    return [0 => 'Comum', 1 => 'Incomum', 2 => 'Raro', 3 => 'Épico', 4 => 'Lendário', 5 => 'Mítico'][$color] ?? 'Comum';
}

function fetchDetailsBatch(array $ids, int $concurrency = 24): array {
    $out = [];
    foreach (array_chunk($ids, $concurrency, true) as $chunk) {
        $mh = curl_multi_init();
        $handles = [];
        foreach ($chunk as $templateId => $itemId) {
            $ch = curl_init('https://wsdb.xyz/api/data/item/pt/' . (int)$itemId);
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT => 20,
                CURLOPT_CONNECTTIMEOUT => 8,
                CURLOPT_HTTPHEADER => ['Accept: application/json', 'User-Agent: MercadoWarspear/1.0'],
            ]);
            curl_multi_add_handle($mh, $ch);
            $handles[(int)$templateId] = $ch;
        }

        do {
            $status = curl_multi_exec($mh, $running);
            if ($running) curl_multi_select($mh, 1.0);
        } while ($running && $status === CURLM_OK);

        foreach ($handles as $templateId => $ch) {
            $raw = curl_multi_getcontent($ch);
            $code = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
            $json = $code === 200 ? json_decode($raw, true) : null;
            if (is_array($json) && !empty($json['id'])) $out[$templateId] = $json;
            curl_multi_remove_handle($mh, $ch);
            curl_close($ch);
        }
        curl_multi_close($mh);
    }
    return $out;
}

$db->beginTransaction();
$merged = 0;
$deleted = 0;
try {
    $oldRows = $db->query("
        SELECT old.id old_id, newer.id new_id, old.atributos_detalhes old_details, newer.atributos_detalhes new_details
        FROM templates old
        JOIN templates newer ON newer.item_id > 0 AND lower(newer.nome) = lower(old.nome)
        WHERE old.item_id = 0
        ORDER BY old.id
    ")->fetchAll();

    $updateTemplateDetails = $db->prepare('UPDATE templates SET atributos = ?, atributos_detalhes = ?, nivel_min = ?, nivel_max = ?, rarity = ? WHERE id = ?');
    $moveItems = $db->prepare('UPDATE itens SET id_template = ? WHERE id_template = ?');
    $deleteTemplate = $db->prepare('DELETE FROM templates WHERE id = ?');

    foreach ($oldRows as $row) {
        $oldDetails = json_decode((string)$row['old_details'], true);
        if (is_array($oldDetails) && !isCompactDetails((string)$row['old_details']) && isCompactDetails((string)$row['new_details'])) {
            $attrs = compactAttrs($oldDetails);
            $updateTemplateDetails->execute([
                $attrs,
                json_encode($oldDetails, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                (int)($oldDetails['level'] ?? 0),
                (int)($oldDetails['level'] ?? 0),
                rarityName((int)($oldDetails['color'] ?? 0)),
                (int)$row['new_id'],
            ]);
            $merged++;
        }
        $moveItems->execute([(int)$row['new_id'], (int)$row['old_id']]);
        $deleteTemplate->execute([(int)$row['old_id']]);
        $deleted++;
    }
    $db->commit();
} catch (Throwable $e) {
    $db->rollBack();
    throw $e;
}

$candidates = [];
$stmt = $db->query('SELECT id, item_id, atributos_detalhes FROM templates WHERE item_id > 0 ORDER BY id');
foreach ($stmt as $row) {
    if (isCompactDetails((string)$row['atributos_detalhes'])) {
        $candidates[(int)$row['id']] = (int)$row['item_id'];
    }
}

$updated = 0;
$failed = 0;
$updateFull = $db->prepare('
    UPDATE templates
    SET atributos = ?, atributos_detalhes = ?, nivel_min = ?, nivel_max = ?, rarity = ?
    WHERE id = ?
');

foreach (array_chunk($candidates, 240, true) as $chunk) {
    $details = fetchDetailsBatch($chunk);
    $db->beginTransaction();
    foreach ($chunk as $templateId => $itemId) {
        if (empty($details[$templateId])) {
            $failed++;
            continue;
        }
        $detail = $details[$templateId];
        $attrs = compactAttrs($detail);
        $updateFull->execute([
            $attrs,
            json_encode($detail, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            (int)($detail['level'] ?? 0),
            (int)($detail['level'] ?? 0),
            rarityName((int)($detail['color'] ?? 0)),
            $templateId,
        ]);
        $updated++;
    }
    $db->commit();
    echo "Atualizados: {$updated} / " . count($candidates) . PHP_EOL;
}

echo "Duplicados fundidos: {$merged}" . PHP_EOL;
echo "Duplicados removidos: {$deleted}" . PHP_EOL;
echo "Detalhes WSDB atualizados: {$updated}" . PHP_EOL;
echo "Falhas WSDB: {$failed}" . PHP_EOL;

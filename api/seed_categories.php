<?php
require_once __DIR__ . '/routes.php';

// Apenas admin pode aplicar seed de categorias
if (!isAdmin()) {
    http_response_code(401);
    echo json_encode(['error' => 'Acesso restrito ao administrador']);
    exit();
}

header('Content-Type: application/json; charset=utf-8');

$db = getDB();
$seedPath = __DIR__ . '/../database/categories.seed.json';

if (!file_exists($seedPath)) {
    http_response_code(404);
    echo json_encode(['error' => 'Arquivo de seed não encontrado em database/categories.seed.json']);
    exit();
}

$json = file_get_contents($seedPath);
$data = json_decode($json, true);
if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(['error' => 'JSON inválido em categories.seed.json']);
    exit();
}

$selectNode = $db->prepare('SELECT id, imagem_url FROM categorias WHERE nome = :nome AND nivel = :nivel AND id_pai = :id_pai LIMIT 1');
$insertNode = $db->prepare('INSERT INTO categorias (id_pai, nome, nivel, imagem_url) VALUES (:id_pai, :nome, :nivel, :imagem)');
$updateImg  = $db->prepare('UPDATE categorias SET imagem_url = :imagem WHERE id = :id');

$created = 0; $reused = 0; $updated = 0;

function upsertNode(PDO $db, array $node, int $nivel, int $idPai = 0): int {
    global $selectNode, $insertNode, $updateImg, $created, $reused, $updated;

    if ($nivel < 1 || $nivel > 3) {
        throw new InvalidArgumentException('Nível inválido: ' . $nivel);
    }

    $nome = trim((string)($node['nome'] ?? ''));
    $imagem = trim((string)($node['imagem_url'] ?? ''));

    if ($nome === '') {
        throw new InvalidArgumentException('Cada nó precisa de um "nome"');
    }

    $selectNode->execute([':nome' => $nome, ':nivel' => $nivel, ':id_pai' => $idPai]);
    $found = $selectNode->fetch(PDO::FETCH_ASSOC);

    if ($found) {
        $reused++;
        $id = (int)$found['id'];
        if ($imagem !== '' && (!isset($found['imagem_url']) || $found['imagem_url'] === '' || $found['imagem_url'] !== $imagem)) {
            $updateImg->execute([':imagem' => $imagem, ':id' => $id]);
            $updated++;
        }
        return $id;
    }

    $insertNode->execute([
        ':id_pai' => $idPai,
        ':nome'   => $nome,
        ':nivel'  => $nivel,
        ':imagem' => $imagem
    ]);
    $created++;
    return (int)$db->lastInsertId();
}

try {
    $db->beginTransaction();
    foreach ($data as $general) {
        $idGeneral = upsertNode($db, $general, 1, 0);
        foreach (($general['filhos'] ?? []) as $cat) {
            $idCat = upsertNode($db, $cat, 2, $idGeneral);
            foreach (($cat['filhos'] ?? []) as $sub) {
                upsertNode($db, $sub, 3, $idCat);
            }
        }
    }
    $db->commit();

    echo json_encode([
        'success' => true,
        'created' => $created,
        'reused'  => $reused,
        'updated' => $updated
    ]);
} catch (Throwable $e) {
    if ($db->inTransaction()) $db->rollBack();
    http_response_code(500);
    echo json_encode(['error' => 'Falha ao aplicar seed: ' . $e->getMessage()]);
}

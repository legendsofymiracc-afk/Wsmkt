<?php
require_once __DIR__ . '/routes.php';
if (!isLoggedIn()) { http_response_code(401); echo json_encode(['error'=>'Faça login']); exit(); }

$method = $_SERVER['REQUEST_METHOD'];
$db = getDB();
$userId = getCurrentUserId();

$db->exec('CREATE TABLE IF NOT EXISTS mensagens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    de_id INTEGER NOT NULL,
    para_id INTEGER NOT NULL,
    item_id INTEGER,
    texto TEXT NOT NULL,
    lida INTEGER DEFAULT 0,
    criado_em TEXT DEFAULT (datetime("now","localtime")),
    FOREIGN KEY (de_id) REFERENCES usuarios(id),
    FOREIGN KEY (para_id) REFERENCES usuarios(id)
)');
$db->exec('CREATE INDEX IF NOT EXISTS idx_msg_de ON mensagens(de_id)');
$db->exec('CREATE INDEX IF NOT EXISTS idx_msg_para ON mensagens(para_id)');

switch ($method) {
    case 'GET':
        $withUserId = (int)($_GET['with'] ?? 0);
        $itemId = (int)($_GET['item_id'] ?? 0);
        if ($withUserId > 0) {
            $stmt = $db->prepare('SELECT m.*, du.nome as de_nome, pu.nome as para_nome FROM mensagens m JOIN usuarios du ON du.id=m.de_id JOIN usuarios pu ON pu.id=m.para_id WHERE ((m.de_id=? AND m.para_id=?) OR (m.de_id=? AND m.para_id=?)) ORDER BY m.criado_em ASC LIMIT 200');
            $stmt->execute([$userId, $withUserId, $withUserId, $userId]);
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        } else {
            // List conversations (last message per user)
            $stmt = $db->prepare("
                SELECT
                    x.other_id,
                    u.nome AS other_nome,
                    (
                        SELECT m2.texto
                        FROM mensagens m2
                        WHERE (m2.de_id = ? AND m2.para_id = x.other_id)
                           OR (m2.de_id = x.other_id AND m2.para_id = ?)
                        ORDER BY m2.criado_em DESC
                        LIMIT 1
                    ) AS last_msg,
                    (
                        SELECT m3.criado_em
                        FROM mensagens m3
                        WHERE (m3.de_id = ? AND m3.para_id = x.other_id)
                           OR (m3.de_id = x.other_id AND m3.para_id = ?)
                        ORDER BY m3.criado_em DESC
                        LIMIT 1
                    ) AS last_time
                FROM (
                    SELECT DISTINCT CASE WHEN de_id = ? THEN para_id ELSE de_id END AS other_id
                    FROM mensagens
                    WHERE de_id = ? OR para_id = ?
                ) x
                JOIN usuarios u ON u.id = x.other_id
                ORDER BY last_time DESC
            ");
            $stmt->execute([$userId, $userId, $userId, $userId, $userId, $userId, $userId]);
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
            // Mark as read
            $db->prepare('UPDATE mensagens SET lida=1 WHERE para_id=? AND lida=0')->execute([$userId]);
        }
        break;
    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $paraId = (int)($data['para'] ?? 0);
        $texto = trim(strip_tags((string)($data['texto'] ?? '')));
        $itemId = (int)($data['item_id'] ?? 0);
        if ($paraId <= 0 || $texto === '') { http_response_code(400); echo json_encode(['error'=>'Dados inválidos']); break; }
        $stmt = $db->prepare('INSERT INTO mensagens (de_id, para_id, item_id, texto) VALUES (?, ?, ?, ?)');
        $stmt->execute([$userId, $paraId, $itemId, $texto]);
        echo json_encode(['success'=>true, 'id'=>(int)$db->lastInsertId()]);
        break;
    default:
        http_response_code(405); echo json_encode(['error'=>'Método não permitido']);
}

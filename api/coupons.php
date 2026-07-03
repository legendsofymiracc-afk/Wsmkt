<?php
require_once __DIR__ . '/routes.php';
$method = $_SERVER['REQUEST_METHOD'];
$db = getDB();

// Ensure table exists
$db->exec('CREATE TABLE IF NOT EXISTS coupons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo TEXT UNIQUE NOT NULL,
    desconto_percentual INTEGER NOT NULL DEFAULT 10,
    max_usos INTEGER DEFAULT 0,
    usos INTEGER DEFAULT 0,
    ativo INTEGER DEFAULT 1,
    criado_em TEXT DEFAULT CURRENT_TIMESTAMP
)');

switch ($method) {
    case 'GET':
        if (!isAdmin()) { http_response_code(401); echo json_encode(['error'=>'Admin only']); break; }
        echo json_encode($db->query('SELECT * FROM coupons ORDER BY criado_em DESC')->fetchAll(PDO::FETCH_ASSOC));
        break;
    case 'POST':
        if (isAdmin()) {
            // Create coupon
            $data = json_decode(file_get_contents('php://input'), true) ?: [];
            $codigo = strtoupper(preg_replace('/[^A-Z0-9_-]/', '', trim((string)($data['codigo'] ?? ''))));
            $desconto = max(1, min(100, (int)($data['desconto'] ?? 10)));
            $maxUsos = max(0, (int)($data['max_usos'] ?? 0));
            if ($codigo === '') { http_response_code(400); echo json_encode(['error'=>'Código obrigatório']); break; }
            try {
                $stmt = $db->prepare('INSERT INTO coupons (codigo, desconto_percentual, max_usos) VALUES (?, ?, ?)');
                $stmt->execute([$codigo, $desconto, $maxUsos]);
                echo json_encode(['success'=>true, 'id'=>(int)$db->lastInsertId()]);
            } catch (PDOException $e) {
                http_response_code(409);
                echo json_encode(['error'=>'Já existe um cupom com esse código']);
            }
        } else {
            // Validate coupon (public)
            $data = json_decode(file_get_contents('php://input'), true) ?: [];
            $codigo = strtoupper(trim((string)($data['codigo'] ?? '')));
            $stmt = $db->prepare('SELECT * FROM coupons WHERE codigo = ? AND ativo = 1 AND (max_usos = 0 OR usos < max_usos)');
            $stmt->execute([$codigo]);
            $coupon = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($coupon) {
                echo json_encode(['valid'=>true, 'desconto'=>$coupon['desconto_percentual'], 'codigo'=>$coupon['codigo']]);
            } else {
                echo json_encode(['valid'=>false, 'error'=>'Cupom inválido ou expirado']);
            }
        }
        break;
    case 'PUT':
        if (!isAdmin()) { http_response_code(401); echo json_encode(['error'=>'Admin only']); break; }
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $id = (int)($data['id'] ?? 0);
        if ($id <= 0) { http_response_code(400); echo json_encode(['error'=>'ID inválido']); break; }
        $fields = [];
        $params = [];
        if (array_key_exists('ativo', $data)) {
            $fields[] = 'ativo = ?';
            $params[] = !empty($data['ativo']) ? 1 : 0;
        }
        if (array_key_exists('desconto', $data)) {
            $fields[] = 'desconto_percentual = ?';
            $params[] = max(1, min(100, (int)$data['desconto']));
        }
        if (array_key_exists('max_usos', $data)) {
            $fields[] = 'max_usos = ?';
            $params[] = max(0, (int)$data['max_usos']);
        }
        if (!$fields) { http_response_code(400); echo json_encode(['error'=>'Nada para atualizar']); break; }
        $params[] = $id;
        $stmt = $db->prepare('UPDATE coupons SET ' . implode(', ', $fields) . ' WHERE id = ?');
        $stmt->execute($params);
        echo json_encode(['success'=>true]);
        break;
    case 'DELETE':
        if (!isAdmin()) { http_response_code(401); echo json_encode(['error'=>'Admin only']); break; }
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $db->prepare('DELETE FROM coupons WHERE id = ?')->execute([(int)($data['id'] ?? 0)]);
        echo json_encode(['success'=>true]);
        break;
    default:
        http_response_code(405); echo json_encode(['error'=>'Método não permitido']);
}

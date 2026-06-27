<?php
// Configuração do banco de dados SQLite
define('DB_PATH', __DIR__ . '/../database/mercado.db');

// Caminho padrão das cantoneiras (usado se não houver configuração)
// Observação: como a resolução de url() ocorre no CSS (arquivo em css/),
// o caminho relativo precisa subir um nível.
define('DEFAULT_CORNER_IMAGE', '../images/cantoneira.png');

if (!isset($_SERVER['REQUEST_METHOD'])) {
    $_SERVER['REQUEST_METHOD'] = 'GET';
}

// Função para obter conexão com o banco
function getDB() {
    try {
        $db = new PDO('sqlite:' . DB_PATH);
        $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        $db->exec('PRAGMA journal_mode=WAL');
        return $db;
    } catch (PDOException $e) {
        die(json_encode(['error' => 'Erro ao conectar ao banco de dados: ' . $e->getMessage()]));
    }
}

// Inicializar banco de dados se não existir
function initDB() {
    $db = getDB();

    // Tabela hierárquica de categorias (1: Geral, 2: Categoria, 3: Subcategoria)
    $db->exec('CREATE TABLE IF NOT EXISTS categorias (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        id_pai INTEGER NOT NULL DEFAULT 0,
        nome TEXT NOT NULL,
        nivel INTEGER NOT NULL,
        imagem_url TEXT,
        FOREIGN KEY (id_pai) REFERENCES categorias(id) ON DELETE CASCADE
    )');
    $db->exec('CREATE INDEX IF NOT EXISTS idx_categorias_pai ON categorias(id_pai)');
    $db->exec('CREATE INDEX IF NOT EXISTS idx_categorias_nivel ON categorias(nivel)');

    // Tabela de itens
    $db->exec('CREATE TABLE IF NOT EXISTS itens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        id_subcategoria INTEGER,
        id_categoria INTEGER,
        id_geral INTEGER,
        nome TEXT NOT NULL,
        descricao TEXT,
        preco_moedas INTEGER DEFAULT 0,
        preco_reais REAL DEFAULT 0,
        quantidade_disponivel INTEGER DEFAULT 0,
        imagem_url TEXT,
        FOREIGN KEY (id_subcategoria) REFERENCES categorias(id) ON DELETE SET NULL,
        FOREIGN KEY (id_categoria) REFERENCES categorias(id) ON DELETE SET NULL,
        FOREIGN KEY (id_geral) REFERENCES categorias(id) ON DELETE SET NULL
    )');
    // Migração: adiciona colunas se tabela já existia no formato antigo
    $info = $db->query('PRAGMA table_info(itens)')->fetchAll(PDO::FETCH_ASSOC);
    $cols = array_column($info, 'name');
    if (!in_array('id_categoria', $cols)) {
        $db->exec('ALTER TABLE itens ADD COLUMN id_categoria INTEGER');
    }
    if (!in_array('id_geral', $cols)) {
        $db->exec('ALTER TABLE itens ADD COLUMN id_geral INTEGER');
    }
    // Índices
    $db->exec('CREATE INDEX IF NOT EXISTS idx_itens_subcategoria ON itens(id_subcategoria)');
    $db->exec('CREATE INDEX IF NOT EXISTS idx_itens_categoria ON itens(id_categoria)');
    $db->exec('CREATE INDEX IF NOT EXISTS idx_itens_geral ON itens(id_geral)');

    // Tabela de configurações gerais (chave/valor)
    $db->exec('CREATE TABLE IF NOT EXISTS configuracoes (
        chave TEXT PRIMARY KEY,
        valor TEXT
    )');

    // Tabela de usuários (dono + vendedores)
    $db->exec('CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        senha_hash TEXT NOT NULL,
        papel TEXT NOT NULL CHECK(papel IN ("dono","vendedor")),
        nome TEXT NOT NULL,
        whatsapp TEXT DEFAULT "",
        ativo INTEGER DEFAULT 1,
        senha_trocada INTEGER DEFAULT 0,
        criado_em TEXT DEFAULT CURRENT_TIMESTAMP
    )');

    // Coluna de vendedor nos itens
    $info = $db->query('PRAGMA table_info(itens)')->fetchAll(PDO::FETCH_ASSOC);
    $cols = array_column($info, 'name');
    if (!in_array('id_vendedor', $cols)) {
        $db->exec('ALTER TABLE itens ADD COLUMN id_vendedor INTEGER DEFAULT NULL');
    }
    $db->exec('CREATE INDEX IF NOT EXISTS idx_itens_vendedor ON itens(id_vendedor)');

    // Email master padrão
    $stmt = $db->prepare('INSERT OR IGNORE INTO configuracoes (chave, valor) VALUES (?, ?)');
    $stmt->execute(['email_master', 'admin@mercado.com']);

    // Migrar admin existente para tabela usuarios
    $hasUsers = $db->query('SELECT COUNT(*) FROM usuarios')->fetchColumn();
    if ($hasUsers == 0) {
        $emailMaster = getSetting('email_master', 'admin@mercado.com');
        // Verifica se já existe hash salvo nas configurações
        $existingHash = getSetting('admin_password_hash', '');
        if (!$existingHash) {
            // Usa a senha padrão
            $existingHash = password_hash(ADMIN_PASSWORD, PASSWORD_DEFAULT);
        }
        $stmt = $db->prepare('INSERT INTO usuarios (email, senha_hash, papel, nome, whatsapp, ativo, senha_trocada) VALUES (?, ?, ?, ?, ?, 1, 1)');
        $stmt->execute([$emailMaster, $existingHash, 'dono', 'Administrador', '']);
    }

    // Garante configuração padrão da cantoneira
    $stmt = $db->prepare('INSERT OR IGNORE INTO configuracoes (chave, valor) VALUES (?, ?)');
    $stmt->execute(['corner_image_url', DEFAULT_CORNER_IMAGE]);
    // Corrige valor legado antigo (sem ../) se existir
    $current = getSetting('corner_image_url', '');
    if ($current === 'images/cantoneira.png') {
        setSetting('corner_image_url', DEFAULT_CORNER_IMAGE);
    }

    maybeMigrateLegacyData($db);
}

function tableExists(PDO $db, string $table): bool {
    $stmt = $db->prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1");
    $stmt->execute([$table]);
    return (bool) $stmt->fetchColumn();
}

function maybeMigrateLegacyData(PDO $db): void {
    try {
        $newCount = (int) $db->query('SELECT COUNT(*) FROM categorias')->fetchColumn();
        if ($newCount > 0) {
            return;
        }

        if (!tableExists($db, 'categories') || !tableExists($db, 'subcategories')) {
            return;
        }

        $legacyCount = (int) $db->query('SELECT COUNT(*) FROM categories')->fetchColumn();
        if ($legacyCount === 0) {
            return;
        }

        $legacyCategories = $db->query('SELECT id, name, image FROM categories ORDER BY id')->fetchAll(PDO::FETCH_ASSOC);
        $legacySubcategories = $db->query('SELECT id, category_id, name, image FROM subcategories ORDER BY id')->fetchAll(PDO::FETCH_ASSOC);

        $db->beginTransaction();

        $insertRoot = $db->prepare('INSERT OR IGNORE INTO categorias (id, id_pai, nome, nivel, imagem_url) VALUES (:id, 0, :nome, 1, :imagem)');
        $insertMiddle = $db->prepare('INSERT INTO categorias (id_pai, nome, nivel, imagem_url) VALUES (:id_pai, :nome, 2, :imagem)');
        $insertSub = $db->prepare('INSERT OR IGNORE INTO categorias (id, id_pai, nome, nivel, imagem_url) VALUES (:id, :id_pai, :nome, 3, :imagem)');

        $categoryBridge = [];
        foreach ($legacyCategories as $category) {
            $insertRoot->execute([
                ':id' => (int) $category['id'],
                ':nome' => $category['name'] ?? '',
                ':imagem' => $category['image'] ?? ''
            ]);

            $middleName = ($category['name'] ?? '') ? ($category['name'] . ' • Coleções') : 'Coleções';
            $insertMiddle->execute([
                ':id_pai' => (int) $category['id'],
                ':nome' => $middleName,
                ':imagem' => $category['image'] ?? ''
            ]);
            $categoryBridge[(int) $category['id']] = (int) $db->lastInsertId();
        }

        $subIds = [];
        foreach ($legacySubcategories as $subcategory) {
            $parentLegacyId = (int) $subcategory['category_id'];
            if (!isset($categoryBridge[$parentLegacyId])) {
                continue;
            }
            $insertSub->execute([
                ':id' => (int) $subcategory['id'],
                ':id_pai' => $categoryBridge[$parentLegacyId],
                ':nome' => $subcategory['name'] ?? '',
                ':imagem' => $subcategory['image'] ?? ''
            ]);
            $subIds[(int) $subcategory['id']] = true;
        }

        if (tableExists($db, 'items')) {
            $legacyItems = $db->query('SELECT id, subcategory_id, name, description, price, quantity, image FROM items ORDER BY id')->fetchAll(PDO::FETCH_ASSOC);
            $insertItem = $db->prepare('INSERT OR IGNORE INTO itens (id, id_subcategoria, nome, descricao, preco_moedas, preco_reais, quantidade_disponivel, imagem_url) VALUES (:id, :id_sub, :nome, :descricao, :moedas, :reais, :quantidade, :imagem)');

            foreach ($legacyItems as $item) {
                $legacySubId = (int) ($item['subcategory_id'] ?? 0);
                if ($legacySubId === 0 || !isset($subIds[$legacySubId])) {
                    continue;
                }

                $insertItem->execute([
                    ':id' => (int) $item['id'],
                    ':id_sub' => $legacySubId,
                    ':nome' => $item['name'] ?? '',
                    ':descricao' => $item['description'] ?? '',
                    ':moedas' => (int) ($item['price'] ?? 0),
                    ':reais' => 0,
                    ':quantidade' => (int) ($item['quantity'] ?? 0),
                    ':imagem' => $item['image'] ?? ''
                ]);
            }
        }

        // Ajusta sequência de autoincremento para refletir maiores IDs usados manualmente
        $db->exec("UPDATE sqlite_sequence SET seq = (SELECT MAX(id) FROM categorias) WHERE name = 'categorias'");
        $db->exec("UPDATE sqlite_sequence SET seq = (SELECT MAX(id) FROM itens) WHERE name = 'itens'");

        $db->commit();
    } catch (Throwable $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        error_log('Falha na migração de dados legados: ' . $e->getMessage());
    }
}

// Senha do admin (em produção, use hash)
define('ADMIN_PASSWORD', 'admin123');

// Inicializar banco ao incluir este arquivo
initDB();

// Configuração de sessão para admin
session_start();

// Verificar se está autenticado
function isAdmin() {
    return isset($_SESSION['is_admin']) && $_SESSION['is_admin'] === true;
}

function isSeller(): bool {
    return isset($_SESSION['usuario_papel']) && $_SESSION['usuario_papel'] === 'vendedor';
}

function isLoggedIn(): bool {
    return isset($_SESSION['usuario_id']) && $_SESSION['usuario_id'] > 0;
}

function getCurrentUserId(): int {
    return isset($_SESSION['usuario_id']) ? (int) $_SESSION['usuario_id'] : 0;
}

function getSetting($key, $default = null) {
    $db = getDB();
    $stmt = $db->prepare('SELECT valor FROM configuracoes WHERE chave = ? LIMIT 1');
    $stmt->execute([$key]);
    $row = $stmt->fetchColumn();
    return $row !== false ? $row : $default;
}

function setSetting($key, $value) {
    $db = getDB();
    $stmt = $db->prepare('INSERT INTO configuracoes (chave, valor) VALUES (:chave, :valor)
        ON CONFLICT(chave) DO UPDATE SET valor = :valor_atualizado');
    $stmt->bindValue(':chave', $key);
    $stmt->bindValue(':valor', $value);
    $stmt->bindValue(':valor_atualizado', $value);
    $stmt->execute();
}

?>


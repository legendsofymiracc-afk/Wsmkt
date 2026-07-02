<?php
// Configuração do banco de dados SQLite
define('DB_PATH', __DIR__ . '/../database/mercado.db');

// Caminho padrão das cantoneiras (usado se não houver configuração)
// Observação: como a resolução de url() ocorre no CSS (arquivo em css/),
// o caminho relativo precisa subir um nível.
define('DEFAULT_CORNER_IMAGE', '../images/cantoneira.png');

// Contas que sempre devem ser tratadas como dono/admin do marketplace.
define('OWNER_EMAILS', ['admin@mercado.local']);

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
        error_log('Erro de conexão SQLite: ' . $e->getMessage());
        die(json_encode(['error' => 'Erro interno do servidor. Tente novamente.']));
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
        servidor TEXT DEFAULT "",
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
    if (!in_array('servidor', $cols)) {
        $db->exec('ALTER TABLE itens ADD COLUMN servidor TEXT DEFAULT ""');
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
        papel TEXT NOT NULL CHECK(papel IN ("dono","vendedor","comprador")),
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
    if (!in_array('id_template', $cols)) {
        $db->exec('ALTER TABLE itens ADD COLUMN id_template INTEGER DEFAULT NULL');
    }
    $db->exec('CREATE INDEX IF NOT EXISTS idx_itens_vendedor ON itens(id_vendedor)');

    // Email master padrão
    $stmt = $db->prepare('UPDATE usuarios SET papel = "dono", ativo = 1 WHERE lower(email) = lower(?)');
    foreach (OWNER_EMAILS as $ownerEmail) {
        $stmt->execute([$ownerEmail]);
    }

    $stmt = $db->prepare('INSERT OR IGNORE INTO configuracoes (chave, valor) VALUES (?, ?)');
    $stmt->execute(['email_master', 'admin@mercado.com']);
    $stmt = $db->prepare('UPDATE configuracoes SET valor = ? WHERE chave = ?');
    $stmt->execute([OWNER_EMAILS[0], 'email_master']);

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

    // Tabela de templates de equipamentos (para preenchimento rápido)
    $db->exec('CREATE TABLE IF NOT EXISTS templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        item_id INTEGER DEFAULT 0,
        categoria TEXT DEFAULT "",
        subcategoria TEXT DEFAULT "",
        imagem_url TEXT DEFAULT "",
        atributos TEXT DEFAULT "{}",
        atributos_detalhes TEXT DEFAULT "{}",
        nivel_min INTEGER DEFAULT 0,
        nivel_max INTEGER DEFAULT 0,
        profissao TEXT DEFAULT "",
        rarity INTEGER DEFAULT 0,
        origem TEXT DEFAULT ""
    )');
    $db->exec('CREATE INDEX IF NOT EXISTS idx_templates_nome ON templates(nome)');
    $db->exec('CREATE INDEX IF NOT EXISTS idx_templates_item_id ON templates(item_id)');

    // Migração: adiciona colunas se tabela já existia sem elas
    $info = $db->query('PRAGMA table_info(templates)')->fetchAll(PDO::FETCH_ASSOC);
    $tcols = array_column($info, 'name');
    if (!in_array('atributos_detalhes', $tcols)) {
        $db->exec('ALTER TABLE templates ADD COLUMN atributos_detalhes TEXT DEFAULT "{}"');
    }
    if (!in_array('nivel_max', $tcols)) {
        $db->exec('ALTER TABLE templates ADD COLUMN nivel_max INTEGER DEFAULT 0');
    }
    if (!in_array('profissao', $tcols)) {
        $db->exec('ALTER TABLE templates ADD COLUMN profissao TEXT DEFAULT ""');
    }

    // Tabela de rate limits (controle de taxa por IP)
    $db->exec('CREATE TABLE IF NOT EXISTS rate_limits (
        chave TEXT PRIMARY KEY,
        contagem INTEGER DEFAULT 0,
        janela_inicio INTEGER DEFAULT 0
    )');

    // Tabela de log de atividades
    $db->exec('CREATE TABLE IF NOT EXISTS activity_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id INTEGER,
        acao TEXT NOT NULL,
        entidade TEXT NOT NULL,
        entidade_id INTEGER,
        detalhes TEXT DEFAULT "",
        criado_em TEXT DEFAULT CURRENT_TIMESTAMP
    )');
    $db->exec('CREATE INDEX IF NOT EXISTS idx_activity_log_usuario ON activity_log(usuario_id)');
    $db->exec('CREATE INDEX IF NOT EXISTS idx_activity_log_entidade ON activity_log(entidade)');
    $db->exec('CREATE INDEX IF NOT EXISTS idx_activity_log_data ON activity_log(criado_em)');

    // Tabela de avaliações
    $db->exec("CREATE TABLE IF NOT EXISTS avaliacoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        id_item INTEGER NOT NULL,
        id_usuario INTEGER NOT NULL,
        estrelas INTEGER NOT NULL CHECK(estrelas BETWEEN 1 AND 5),
        comentario TEXT DEFAULT '',
        comprou INTEGER DEFAULT 0,
        criado_em TEXT DEFAULT (datetime('now','localtime')),
        FOREIGN KEY (id_item) REFERENCES itens(id) ON DELETE CASCADE,
        FOREIGN KEY (id_usuario) REFERENCES usuarios(id) ON DELETE CASCADE
    )");
    $db->exec('CREATE INDEX IF NOT EXISTS idx_avaliacoes_item ON avaliacoes(id_item)');
    $db->exec('CREATE INDEX IF NOT EXISTS idx_avaliacoes_usuario ON avaliacoes(id_usuario)');

    // Tabela de carrinho
    $db->exec("CREATE TABLE IF NOT EXISTS carrinho (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        id_usuario INTEGER NOT NULL,
        id_item INTEGER NOT NULL,
        quantidade INTEGER DEFAULT 1,
        criado_em TEXT DEFAULT (datetime('now','localtime')),
        FOREIGN KEY (id_usuario) REFERENCES usuarios(id) ON DELETE CASCADE,
        FOREIGN KEY (id_item) REFERENCES itens(id) ON DELETE CASCADE,
        UNIQUE(id_usuario, id_item)
    )");
    $cartCols = array_column($db->query('PRAGMA table_info(carrinho)')->fetchAll(PDO::FETCH_ASSOC), 'name');
    if (!in_array('quantidade', $cartCols)) {
        $db->exec('ALTER TABLE carrinho ADD COLUMN quantidade INTEGER DEFAULT 1');
    }
    $db->exec('CREATE INDEX IF NOT EXISTS idx_carrinho_usuario ON carrinho(id_usuario)');

    // Tabela de favoritos por usuario logado
    $db->exec("CREATE TABLE IF NOT EXISTS favoritos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        id_usuario INTEGER NOT NULL,
        id_item INTEGER NOT NULL,
        criado_em TEXT DEFAULT (datetime('now','localtime')),
        FOREIGN KEY (id_usuario) REFERENCES usuarios(id) ON DELETE CASCADE,
        FOREIGN KEY (id_item) REFERENCES itens(id) ON DELETE CASCADE,
        UNIQUE(id_usuario, id_item)
    )");
    $db->exec('CREATE INDEX IF NOT EXISTS idx_favoritos_usuario ON favoritos(id_usuario)');

    // Solicitacoes de compradores que querem se tornar vendedores.
    // O comprador continua com papel "comprador" ate o dono aprovar.
    $db->exec("CREATE TABLE IF NOT EXISTS vendedor_solicitacoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        id_usuario INTEGER NOT NULL,
        nome_loja TEXT DEFAULT '',
        whatsapp TEXT DEFAULT '',
        mensagem TEXT DEFAULT '',
        status TEXT NOT NULL DEFAULT 'pendente' CHECK(status IN ('pendente','aprovada','negada')),
        analisado_por INTEGER,
        analisado_em TEXT,
        criado_em TEXT DEFAULT (datetime('now','localtime')),
        FOREIGN KEY (id_usuario) REFERENCES usuarios(id) ON DELETE CASCADE,
        FOREIGN KEY (analisado_por) REFERENCES usuarios(id) ON DELETE SET NULL
    )");
    $db->exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_vendedor_solicitacao_pendente
        ON vendedor_solicitacoes(id_usuario)
        WHERE status = 'pendente'");

    // Migration: adiciona coluna idioma + comprador na CHECK constraint de usuarios
    $tableSql = $db->query("SELECT sql FROM sqlite_master WHERE type='table' AND name='usuarios'")->fetchColumn();
    if ($tableSql && strpos($tableSql, 'comprador') === false) {
        $db->exec("PRAGMA foreign_keys = OFF");
        $db->beginTransaction();
        try {
            $db->exec("CREATE TABLE IF NOT EXISTS usuarios_v2 (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                senha_hash TEXT NOT NULL,
                papel TEXT NOT NULL CHECK(papel IN ('dono','vendedor','comprador')),
                nome TEXT NOT NULL,
                whatsapp TEXT DEFAULT '',
                ativo INTEGER DEFAULT 1,
                senha_trocada INTEGER DEFAULT 0,
                criado_em TEXT DEFAULT CURRENT_TIMESTAMP,
                idioma TEXT DEFAULT 'pt'
            )");
            $existingCols = array_column($db->query('PRAGMA table_info(usuarios)')->fetchAll(PDO::FETCH_ASSOC), 'name');
            $selectCols = array_intersect($existingCols, ['id','email','senha_hash','papel','nome','whatsapp','ativo','senha_trocada','criado_em']);
            $colList = implode(',', $selectCols);
            $db->exec("INSERT INTO usuarios_v2 ({$colList}) SELECT {$colList} FROM usuarios");
            $db->exec('DROP TABLE usuarios');
            $db->exec('ALTER TABLE usuarios_v2 RENAME TO usuarios');
            $db->commit();
        } catch (Exception $e) {
            if ($db->inTransaction()) { $db->rollBack(); }
            error_log('Migration usuarios failed: ' . $e->getMessage());
        }
        $db->exec("PRAGMA foreign_keys = ON");
    } else {
        $ucols = array_column($db->query('PRAGMA table_info(usuarios)')->fetchAll(PDO::FETCH_ASSOC), 'name');
        if (!in_array('idioma', $ucols)) {
            $db->exec('ALTER TABLE usuarios ADD COLUMN idioma TEXT DEFAULT "pt"');
        }
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

// Configuração de sessão segura
$isLocalhost = in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1', '::1', 'localhost']);
session_set_cookie_params([
    'httponly' => true,   // Impede acesso ao cookie via JavaScript (mitiga XSS)
    'samesite' => 'Lax',  // Protege contra CSRF em navegadores modernos
    'secure' => !$isLocalhost, // Só envia cookie em HTTPS (desligado em dev local)
]);
session_start();

function normalizeEmail(?string $email): string {
    return strtolower(trim((string)$email));
}

function isOwnerEmail(?string $email): bool {
    return in_array(normalizeEmail($email), array_map('normalizeEmail', OWNER_EMAILS), true);
}

function normalizeUserRole(?string $email, ?string $role): string {
    if (isOwnerEmail($email)) {
        return 'dono';
    }
    return in_array($role, ['dono', 'vendedor', 'comprador'], true) ? (string)$role : 'comprador';
}

// Verificar se está autenticado
function isAdmin() {
    if ((isset($_SESSION['is_admin']) && $_SESSION['is_admin'] === true)
        || (isset($_SESSION['usuario_papel']) && $_SESSION['usuario_papel'] === 'dono')
        || isOwnerEmail($_SESSION['usuario_email'] ?? null)) {
        return true;
    }

    if (!isset($_SESSION['usuario_id']) || (int)$_SESSION['usuario_id'] <= 0) {
        return false;
    }

    try {
        $db = getDB();
        $stmt = $db->prepare('SELECT email, papel FROM usuarios WHERE id = ? AND ativo = 1 LIMIT 1');
        $stmt->execute([(int)$_SESSION['usuario_id']]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
        if (!$user) {
            return false;
        }
        $role = normalizeUserRole($user['email'], $user['papel']);
        $_SESSION['usuario_email'] = $user['email'];
        $_SESSION['usuario_papel'] = $role;
        $_SESSION['is_admin'] = ($role === 'dono');
        if ($role !== $user['papel']) {
            $stmt = $db->prepare('UPDATE usuarios SET papel = ? WHERE id = ?');
            $stmt->execute([$role, (int)$_SESSION['usuario_id']]);
        }
        return $role === 'dono';
    } catch (Throwable $e) {
        error_log('Falha ao verificar permissao admin: ' . $e->getMessage());
        return false;
    }
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

function getCurrentUserRole(): ?string {
    return $_SESSION['usuario_papel'] ?? null;
}

function isBuyer(): bool {
    return getCurrentUserRole() === 'comprador';
}

function canSell(): bool {
    return isAdmin() || isSeller();
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

function logActivity(?int $userId, string $acao, string $entidade, ?int $entidadeId = null, string $detalhes = ''): void {
    try {
        $db = getDB();
        $stmt = $db->prepare('INSERT INTO activity_log (usuario_id, acao, entidade, entidade_id, detalhes) VALUES (?, ?, ?, ?, ?)');
        $stmt->execute([$userId, $acao, $entidade, $entidadeId, mb_substr($detalhes, 0, 500)]);
    } catch (Throwable $e) {
        error_log('Activity log failed: ' . $e->getMessage());
    }
}

?>

# Marketplace Warspear com Vendedores — Plano de Implementação

> **Para agentes:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para implementar task por task. Checkboxes (`- [ ]`) para tracking.

**Goal:** Transformar catálogo atual em marketplace híbrido — dono cadastra vendedores, vendedores gerenciam anúncios, compra via WhatsApp. Login unificado com detecção de papel.

**Architecture:** Evolução incremental sobre base existente. Backend: PHP + SQLite com novo roteador unificado. Frontend: módulos JS vanilla separados por responsabilidade. CSS refatorado com animações isoladas.

**Tech Stack:** PHP 8.x (built-in server), SQLite 3, Vanilla JS ES6+, CSS Custom Properties. Sem frameworks. Sem npm. Sem Composer.

## Global Constraints

- PHP: sem framework, sem dependências externas. Composer só se inevitável.
- JS: vanilla, sem bundler, sem npm. Módulos via `<script>` tags com `defer`.
- CSS: sem preprocessador. CSS custom properties para variáveis.
- Banco: SQLite. Sem MySQL/Postgres.
- Compatibilidade: Chrome, Firefox, Safari, Edge (últimos 2 major). iOS Safari 15+.
- Essência: manter visual escuro/dourado/medieval e experiência tipo NPC do jogo.
- Manter compatibilidade: não quebrar rota de login antiga durante migração.

## File Structure

```
api/
  config.php              # MODIFICAR — initDB estendido, WAL mode, helpers auth
  routes.php              # CRIAR — roteador simples unificado
  auth.php                # MODIFICAR — login email+senha contra usuarios
  categories.php          # MODIFICAR — usar isAdmin() compatível
  subcategories.php       # MANTER
  items.php               # MODIFICAR — filtro id_vendedor, permissões
  settings.php            # MODIFICAR — email_master
  upload.php              # MANTER
  seed_categories.php     # MANTER
  sellers.php             # CRIAR — CRUD vendedores
js/
  app.js                  # MODIFICAR — enxugar para ~200 linhas, orquestrador
  api.js                  # CRIAR — fetchJSON, resolveApiBase, uploadImage
  views/
    home.js               # CRIAR — renderHome
    categories.js         # CRIAR — renderGeneralCategories, renderCategories, renderSubcategories, loaders
    items.js              # CRIAR — renderItems, renderItemDetails, loadItems*
    admin.js              # CRIAR — renderAdminLogin, renderAdminPanel, accordions
    seller.js             # CRIAR — renderSellerPanel, seller CRUD
  components/
    panel.js              # CRIAR — moldura do painel
    toast.js              # CRIAR — showToast
    modal.js              # CRIAR — renderModal, closeModal, confirmModal
    utils.js              # CRIAR — sanitize*, formatCurrencyBRL, resolveBRLValue
css/
  style.css               # MODIFICAR — refatorar seções, tipografia, grid cards
  animations.css          # CRIAR — animações isoladas
index.html                # MODIFICAR — meta tags SEO, scripts modulares, navbar mobile
.htaccess                 # CRIAR — proteção de arquivos sensíveis
database/
  .htaccess               # CRIAR — bloqueio de acesso direto
```

---

### Task 1: Banco de dados — novas tabelas e migração

**Files:**
- Modify: `api/config.php`

**Interfaces:**
- Produces: `usuarios` table with columns `id, email, senha_hash, papel, nome, whatsapp, ativo, senha_trocada, criado_em`
- Produces: `itens.id_vendedor` column (INTEGER DEFAULT NULL)
- Produces: `configuracoes` key `email_master` with default `'admin@mercado.com'`
- Produces: `isAdmin()` continues working, `isSeller()`, `isLoggedIn()` added

- [ ] **Step 1: Adicionar criação da tabela usuarios e coluna id_vendedor no initDB()**

No arquivo `api/config.php`, localizar função `initDB()`. Após a criação da tabela `configuracoes`, adicionar:

```php
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
    criado_em TEXT DEFAULT (datetime("now","localtime"))
)');

// Coluna de vendedor nos itens
$info = $db->query('PRAGMA table_info(itens)')->fetchAll(PDO::FETCH_ASSOC);
$cols = array_column($info, 'name');
if (!in_array('id_vendedor', $cols)) {
    $db->exec('ALTER TABLE itens ADD COLUMN id_vendedor INTEGER DEFAULT NULL');
}

// Email master padrão
$stmt = $db->prepare('INSERT OR IGNORE INTO configuracoes (chave, valor) VALUES (?, ?)');
$stmt->execute(['email_master', 'admin@mercado.com']);
```

- [ ] **Step 2: Adicionar migração do admin existente para tabela usuarios**

Na mesma função `initDB()`, após o código do Step 1, adicionar migração:

```php
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
```

- [ ] **Step 3: Adicionar funções de verificação de papel**

No final de `api/config.php`, após a função `isAdmin()`, adicionar:

```php
function isSeller(): bool {
    return isset($_SESSION['usuario_papel']) && $_SESSION['usuario_papel'] === 'vendedor';
}

function isLoggedIn(): bool {
    return isset($_SESSION['usuario_id']) && $_SESSION['usuario_id'] > 0;
}

function getCurrentUserId(): int {
    return isset($_SESSION['usuario_id']) ? (int) $_SESSION['usuario_id'] : 0;
}
```

- [ ] **Step 4: Ativar WAL mode no SQLite**

No início da função `getDB()`, após criar a conexão PDO, adicionar:

```php
$db->exec('PRAGMA journal_mode=WAL');
```

- [ ] **Step 5: Testar — rodar servidor e verificar criação**

```bash
# Iniciar servidor e forçar initDB
curl -s http://127.0.0.1:8080/api/categories.php?tree=1 | head -c 100
# Deve retornar JSON válido, não erro
```

Verificar no banco:
```bash
sqlite3 database/mercado.db "PRAGMA table_info(usuarios);"
sqlite3 database/mercado.db "SELECT * FROM usuarios;"
sqlite3 database/mercado.db "PRAGMA table_info(itens);" | grep id_vendedor
```

- [ ] **Step 6: Commit**

```bash
git add api/config.php
git commit -m "feat: adiciona tabela usuarios, id_vendedor em itens, email_master, WAL mode"
```

---

### Task 2: Roteador unificado e rate limiting

**Files:**
- Create: `api/routes.php`
- Modify: `api/config.php` (adicionar rate limiting)

**Interfaces:**
- Consumes: `isAdmin()`, `isSeller()`, `isLoggedIn()` from config.php
- Produces: `route_request()` function used by all endpoints
- Produces: rate limiting applied to all requests

- [ ] **Step 1: Criar api/routes.php**

```php
<?php
// Roteador simples e rate limiting
require_once __DIR__ . '/config.php';

// Rate limiting (30 req/min por IP)
function checkRateLimit(): void {
    $ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
    $key = 'rate_' . md5($ip);
    $now = time();
    $window = 60;
    $maxRequests = 30;

    $db = getDB();
    // Criar tabela de rate limit se não existir
    $db->exec('CREATE TABLE IF NOT EXISTS rate_limits (
        chave TEXT PRIMARY KEY,
        contagem INTEGER DEFAULT 0,
        janela_inicio INTEGER DEFAULT 0
    )');

    $stmt = $db->prepare('SELECT contagem, janela_inicio FROM rate_limits WHERE chave = ?');
    $stmt->execute([$key]);
    $row = $stmt->fetch();

    if ($row) {
        $count = (int) $row['contagem'];
        $windowStart = (int) $row['janela_inicio'];
        if ($now - $windowStart > $window) {
            $count = 1;
            $windowStart = $now;
        } else {
            $count++;
        }
        if ($count > $maxRequests) {
            http_response_code(429);
            echo json_encode(['error' => 'Muitas requisições. Aguarde.']);
            exit();
        }
        $stmt = $db->prepare('UPDATE rate_limits SET contagem = ?, janela_inicio = ? WHERE chave = ?');
        $stmt->execute([$count, $windowStart, $key]);
    } else {
        $stmt = $db->prepare('INSERT INTO rate_limits (chave, contagem, janela_inicio) VALUES (?, 1, ?)');
        $stmt->execute([$key, $now]);
    }
}

// CSRF token
function generateCsrfToken(): string {
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function verifyCsrfToken(): bool {
    if ($_SERVER['REQUEST_METHOD'] === 'GET' || $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        return true;
    }
    $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? ($_POST['csrf_token'] ?? '');
    return !empty($_SESSION['csrf_token']) && hash_equals($_SESSION['csrf_token'], $token);
}

// Headers de segurança
function sendSecurityHeaders(): void {
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, X-CSRF-Token');
}

// Aplica proteções
checkRateLimit();
sendSecurityHeaders();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}
```

- [ ] **Step 2: Remover headers duplicados do config.php**

No `api/config.php`, remover as linhas duplicadas de CORS headers (linhas ~222-231). Elas agora estão no `routes.php`. Substituir por:

```php
// Headers e proteções agora no routes.php
// Incluir routes.php no início de cada endpoint
```

- [ ] **Step 3: Atualizar auth.php para usar routes.php**

No topo de `api/auth.php`, substituir `require_once 'config.php'` por:

```php
require_once __DIR__ . '/routes.php';
```

- [ ] **Step 4: Commit**

```bash
git add api/routes.php api/config.php api/auth.php
git commit -m "feat: adiciona roteador com rate limiting, CSRF e headers de segurança"
```

---

### Task 3: Auth — login unificado email+senha

**Files:**
- Modify: `api/auth.php`
- Modify: `js/app.js` (checkAuth, doLogin, estado)
- Create: `js/api.js`

**Interfaces:**
- Consumes: `usuarios` table from Task 1
- Produces: `auth.php?action=login` accepts email+password, returns `{success, papel, nome, id}`
- Produces: `auth.php?action=check` returns `{is_admin, is_seller, is_logged_in, papel, nome}`
- Produces: `APP_STATE.currentUser` object with `{id, nome, papel, isLoggedIn}`

- [ ] **Step 1: Reescrever auth.php para login email+senha**

```php
<?php
require_once __DIR__ . '/routes.php';

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
$action = $_GET['action'] ?? '';

function extractCredentials(string $method): array {
    $email = '';
    $password = '';
    $rawBody = file_get_contents('php://input');
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';

    if ($method === 'POST' || $method === 'PUT') {
        if ($rawBody !== false && strlen(trim($rawBody)) > 0) {
            if (stripos($contentType, 'application/json') !== false) {
                $data = json_decode($rawBody, true) ?: [];
                $email = $data['email'] ?? '';
                $password = $data['password'] ?? '';
            } elseif (stripos($contentType, 'application/x-www-form-urlencoded') !== false) {
                parse_str($rawBody, $parsed);
                $email = $parsed['email'] ?? '';
                $password = $parsed['password'] ?? '';
            }
        }
        if ($email === '' && isset($_POST['email'])) {
            $email = $_POST['email'];
            $password = $_POST['password'] ?? '';
        }
    }

    if ($email === '' && isset($_REQUEST['email'])) {
        $email = $_REQUEST['email'];
        $password = $_REQUEST['password'] ?? '';
    }

    return [trim((string) $email), (string) $password];
}

switch ($action) {
    case 'login':
        [$email, $password] = extractCredentials($method);

        if ($email === '' || $password === '') {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Email e senha obrigatórios']);
            exit();
        }

        $db = getDB();
        $stmt = $db->prepare('SELECT id, email, senha_hash, papel, nome, whatsapp, ativo, senha_trocada FROM usuarios WHERE email = ? LIMIT 1');
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($password, $user['senha_hash'])) {
            http_response_code(401);
            echo json_encode(['success' => false, 'error' => 'Email ou senha incorretos']);
            exit();
        }

        if (!$user['ativo']) {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'Conta desativada. Contate o administrador.']);
            exit();
        }

        if (session_status() === PHP_SESSION_ACTIVE) {
            session_regenerate_id(true);
        }
        $_SESSION['usuario_id'] = (int) $user['id'];
        $_SESSION['usuario_papel'] = $user['papel'];
        $_SESSION['usuario_nome'] = $user['nome'];
        $_SESSION['is_admin'] = ($user['papel'] === 'dono');

        echo json_encode([
            'success' => true,
            'papel' => $user['papel'],
            'nome' => $user['nome'],
            'id' => (int) $user['id'],
            'senha_trocada' => (bool) $user['senha_trocada']
        ]);
        exit();

    case 'logout':
        if ($method !== 'POST') {
            http_response_code(400);
            echo json_encode(['error' => 'Uso incorreto da rota de logout']);
            exit();
        }
        $_SESSION = [];
        if (session_status() === PHP_SESSION_ACTIVE) {
            session_destroy();
        }
        echo json_encode(['success' => true]);
        exit();

    case 'check':
        echo json_encode([
            'is_admin' => isAdmin(),
            'is_seller' => isSeller(),
            'is_logged_in' => isLoggedIn(),
            'papel' => $_SESSION['usuario_papel'] ?? null,
            'nome' => $_SESSION['usuario_nome'] ?? null,
            'id' => $_SESSION['usuario_id'] ?? null
        ]);
        exit();

    default:
        http_response_code(400);
        echo json_encode(['error' => 'Ação inválida']);
        exit();
}
```

- [ ] **Step 2: Criar js/api.js com funções de rede**

```javascript
// js/api.js — Funções de comunicação com a API
const CONFIG = {
    API_URL: 'api',
    COIN_TO_BRL: 0.01,
    DEFAULT_CORNER_IMAGE: 'images/cantoneira.png',
    PLACEHOLDER_IMAGE_64: 'https://via.placeholder.com/64',
    PLACEHOLDER_IMAGE_200: 'https://via.placeholder.com/200'
};

function resolveApiBase() {
    try {
        const override = localStorage.getItem('API_BASE');
        if (override && override.trim()) return override.trim().replace(/\/$/, '');
    } catch (_) {}
    const origin = (window.location.origin || '').toLowerCase();
    const isLiveServer = origin.includes('127.0.0.1:5500') || origin.includes('localhost:5500');
    const isFile = window.location.protocol === 'file:';
    if (isLiveServer || isFile) return 'http://127.0.0.1:8080/api';
    return 'api';
}

async function fetchJSON(endpoint, options = {}) {
    const init = { credentials: 'same-origin', ...options };
    const response = await fetch(`${CONFIG.API_URL}/${endpoint}`, init);
    const contentType = response.headers.get('content-type') || '';
    if (!response.ok) {
        let message = `Erro ${response.status}`;
        if (contentType.includes('application/json')) {
            try { const data = await response.json(); if (data && data.error) message = data.error; } catch (_) {}
        } else {
            try {
                const text = await response.text();
                if (text && text.trim().length) message = text.slice(0, 200);
            } catch (_) {}
        }
        throw new Error(message);
    }
    if (!contentType.includes('application/json')) {
        const text = await response.text();
        const hint = text.includes('<?php') ? 'Parece que o PHP não está sendo executado. Inicie um servidor PHP.' : 'Resposta não é JSON.';
        throw new Error(`${hint}\nResposta inicial: ${text.slice(0, 120)}`);
    }
    return response.json();
}

function resolveImage(url, fallback = CONFIG.PLACEHOLDER_IMAGE_64) {
    if (!url || !url.trim()) return fallback;
    return url;
}

async function uploadImage(file) {
    const maxBytes = 2 * 1024 * 1024;
    if (file.size > maxBytes) throw new Error('Imagem excede 2MB');
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${CONFIG.API_URL}/upload.php`, { method: 'POST', body: formData });
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Falha no upload');
    return data.path;
}
```

- [ ] **Step 3: Atualizar APP_STATE e checkAuth no app.js**

Substituir a declaração de `APP_STATE` atual por:

```javascript
const APP_STATE = {
    currentView: 'home',
    currentUser: { id: null, nome: null, papel: null, isLoggedIn: false },
    // Compatibilidade com código existente
    get isAdmin() { return this.currentUser.papel === 'dono'; },
    set isAdmin(v) { /* mantido por compatibilidade */ },
    currentGeneralId: null,
    currentCategoryId: null,
    currentSubcategoryId: null,
    currentItemId: null,
    viewingGeneralRootItems: false,
    generalCategories: [],
    categoriesLevel2: [],
    categoriesLevel3: [],
    categoryIndex: new Map(),
    categoryTree: [],
    itemsList: [],
    allItems: [],
    settings: {
        corner_image_url: CONFIG.DEFAULT_CORNER_IMAGE,
        whatsapp_number: ''
    }
};
```

Substituir `checkAuth()` por:

```javascript
async function checkAuth() {
    try {
        const data = await fetchJSON('auth.php?action=check');
        APP_STATE.currentUser = {
            id: data.id || null,
            nome: data.nome || null,
            papel: data.papel || null,
            isLoggedIn: data.is_logged_in || false
        };
    } catch (error) {
        APP_STATE.currentUser = { id: null, nome: null, papel: null, isLoggedIn: false };
        console.error('Erro ao verificar autenticação:', error);
    }
}
```

- [ ] **Step 4: Atualizar doLogin() para email+senha**

No `js/app.js`, substituir a função `doLogin()` por:

```javascript
async function doLogin() {
    const email = document.getElementById('admin-email')?.value || '';
    const password = document.getElementById('admin-password')?.value || '';
    if (!email || !password) {
        showToast('Informe email e senha', 'error');
        return;
    }
    try {
        const body = new URLSearchParams({ email, password }).toString();
        let response = await fetch(`${CONFIG.API_URL}/auth.php?action=login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
            credentials: 'same-origin',
            body
        });
        if (response.status === 405) {
            response = await fetch(`${CONFIG.API_URL}/auth.php?action=login&email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`, {
                method: 'GET',
                credentials: 'same-origin'
            });
        }
        if (!response.ok) {
            let msg = `Erro ${response.status}`;
            try { const j = await response.json(); if (j && j.error) msg = j.error; } catch {}
            throw new Error(msg);
        }
        const data = await response.json();
        if (data.success) {
            APP_STATE.currentUser = { id: data.id, nome: data.nome, papel: data.papel, isLoggedIn: true };
            showToast('Login efetuado', 'success');
            if (data.papel === 'dono') navigateTo('admin-panel');
            else if (data.papel === 'vendedor') navigateTo('seller-panel');
        } else {
            showToast('Email ou senha incorretos', 'error');
        }
    } catch (error) {
        console.error('Erro ao fazer login:', error);
        showToast(error.message || 'Erro ao fazer login', 'error');
    }
}
```

- [ ] **Step 5: Atualizar doLogout()**

```javascript
async function doLogout() {
    try {
        await fetchJSON('auth.php?action=logout', { method: 'POST' });
    } catch (error) {
        console.error('Erro ao fazer logout:', error);
    }
    APP_STATE.currentUser = { id: null, nome: null, papel: null, isLoggedIn: false };
    navigateTo('home');
}
```

- [ ] **Step 6: Atualizar renderAdminLogin com campo email**

No `js/app.js`, substituir `renderAdminLogin()` por:

```javascript
function renderAdminLogin(container) {
    container.innerHTML = `
        <section class="panel" role="dialog">
            <div class="corner top-left"></div>
            <div class="corner top-right"></div>
            <header class="header">
                <h1 class="title">Acesso</h1>
            </header>
            <div class="admin-login">
                <h2>Entrar</h2>
                <input type="email" id="admin-email" placeholder="Email" autocomplete="email">
                <input type="password" id="admin-password" placeholder="Senha" autocomplete="current-password">
                <button onclick="doLogin()">Entrar</button>
            </div>
            <div class="footer">
                <button class="login-btn" onclick="goBack()">VOLTAR</button>
            </div>
        </section>
    `;
}
```

- [ ] **Step 7: Atualizar index.html para carregar api.js antes de app.js**

```html
<script src="js/api.js" defer></script>
<script src="js/app.js" defer></script>
```

- [ ] **Step 8: Testar login**

```bash
# Testar login como dono (senha padrão admin123)
curl -X POST http://127.0.0.1:8080/api/auth.php?action=login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "email=admin@mercado.com&password=admin123"
# Deve retornar: {"success":true,"papel":"dono","nome":"Administrador","id":1,"senha_trocada":true}

# Testar check
curl -c /tmp/cookie -b /tmp/cookie \
  http://127.0.0.1:8080/api/auth.php?action=check
# Deve retornar is_logged_in: true se cookie de sessão enviado
```

- [ ] **Step 9: Commit**

```bash
git add api/auth.php js/api.js js/app.js index.html
git commit -m "feat: login unificado email+senha com detecção de papel"
```

---

### Task 4: Atualizar endpoints existentes para nova auth

**Files:**
- Modify: `api/categories.php`
- Modify: `api/items.php`
- Modify: `api/settings.php`
- Modify: `api/upload.php`

**Interfaces:**
- Consumes: `routes.php`, `isAdmin()`, `isSeller()`, `isLoggedIn()`, `getCurrentUserId()` from Task 1-2
- Produces: todas as verificações de permissão atualizadas

- [ ] **Step 1: Atualizar categories.php — trocar require e verificação**

No topo de `api/categories.php`, substituir `require_once 'config.php'` por `require_once __DIR__ . '/routes.php';`. A função `isAdmin()` continua funcionando (já existe no config carregado pelo routes.php).

- [ ] **Step 2: Atualizar settings.php**

No topo de `api/settings.php`, substituir `require_once 'config.php'` por `require_once __DIR__ . '/routes.php';`. Adicionar `email_master` nos `allowedKeys`:

```php
$allowedKeys = ['corner_image_url', 'whatsapp_number', 'email_master'];
```

- [ ] **Step 3: Atualizar items.php — adicionar filtro por vendedor**

No topo de `api/items.php`, substituir `require_once 'config.php'` por `require_once __DIR__ . '/routes.php';`.

No case POST, após verificar `isAdmin()` ou `isSeller()`, adicionar lógica de vendedor:

```php
case 'POST':
    if (!isAdmin() && !isSeller()) {
        http_response_code(401);
        echo json_encode(['error' => 'Não autorizado']);
        break;
    }
    // ... validação de dados ...
    // Se for vendedor (não admin), força id_vendedor = session user
    if (isSeller() && !isAdmin()) {
        $data['id_vendedor'] = getCurrentUserId();
    }
    // ... resto da lógica ...
```

No case PUT/DELETE, adicionar verificação de propriedade:

```php
case 'PUT':
case 'DELETE':
    if (!isAdmin() && !isSeller()) {
        http_response_code(401);
        echo json_encode(['error' => 'Não autorizado']);
        break;
    }
    // Se vendedor, verificar se o item é dele
    if (isSeller() && !isAdmin()) {
        $itemId = isset($data['id']) ? (int) $data['id'] : 0;
        $check = $db->prepare('SELECT id_vendedor FROM itens WHERE id = ?');
        $check->execute([$itemId]);
        $owner = $check->fetchColumn();
        if ($owner != getCurrentUserId()) {
            http_response_code(403);
            echo json_encode(['error' => 'Você só pode editar seus próprios itens']);
            break;
        }
    }
    // ... resto da lógica ...
```

No GET para todos os itens, adicionar filtro opcional:

```php
// Se vendedor logado e não admin, retorna só itens dele (no painel)
$sellerFilter = isset($_GET['seller_id']) ? (int) $_GET['seller_id'] : 0;
if ($sellerFilter > 0) {
    $items = fetchItemsWithRelations($db, 'i.id_vendedor = ?', [$sellerFilter]);
    echo json_encode($items);
    break;
}
```

- [ ] **Step 4: Atualizar upload.php**

No topo de `api/upload.php`, substituir `require_once 'config.php'` por `require_once __DIR__ . '/routes.php';`. A verificação `isAdmin()` existente deve ser estendida:

```php
if (!isAdmin() && !isSeller()) {
    http_response_code(401);
    echo json_encode(['error' => 'Não autorizado']);
    exit();
}
```

- [ ] **Step 5: Commit**

```bash
git add api/categories.php api/items.php api/settings.php api/upload.php
git commit -m "feat: atualiza endpoints para nova auth com suporte a vendedores"
```

---

### Task 5: Extrair componentes JS (panel, toast, modal, utils)

**Files:**
- Create: `js/components/panel.js`
- Create: `js/components/toast.js`
- Create: `js/components/modal.js`
- Create: `js/components/utils.js`
- Modify: `js/app.js` (remover código extraído)
- Modify: `index.html` (adicionar novos scripts)

**Interfaces:**
- Produces: `renderPanel(container, title, content, footer)` — gera HTML completo do painel
- Produces: `showToast(message, type, timeout)` — exibe toast notification
- Produces: `renderModal(html)`, `closeModal()`, `confirmModal(msg)` — modais
- Produces: `sanitizeItems(arr)`, `sanitizeCategoriesTree(nodes)`, `formatCurrencyBRL(v)`, `resolveBRLValue(item)`

- [ ] **Step 1: Criar js/components/utils.js**

Extrair funções de sanitização e formatação do `app.js`:

```javascript
// js/components/utils.js
function sanitizeCategoriesTree(nodes) {
    if (!Array.isArray(nodes)) return [];
    return nodes.map(node => ({
        id: Number(node.id),
        id_pai: Number(node.id_pai || 0),
        nome: node.nome,
        nivel: Number(node.nivel || 1),
        imagem_url: node.imagem_url || '',
        filhos: sanitizeCategoriesTree(node.filhos || [])
    }));
}

function sanitizeItems(items) {
    if (!Array.isArray(items)) return [];
    return items.map(item => ({
        id: Number(item.id),
        id_subcategoria: item.id_subcategoria != null ? Number(item.id_subcategoria) : 0,
        id_categoria: item.id_categoria != null ? Number(item.id_categoria) : 0,
        id_geral: item.id_geral != null ? Number(item.id_geral) : 0,
        id_vendedor: item.id_vendedor != null ? Number(item.id_vendedor) : null,
        nome_vendedor: item.nome_vendedor || '',
        nome: item.nome,
        descricao: item.descricao,
        preco_moedas: item.preco_moedas != null ? Number(item.preco_moedas) : 0,
        preco_reais: item.preco_reais != null ? Number(item.preco_reais) : 0,
        quantidade_disponivel: item.quantidade_disponivel != null ? Number(item.quantidade_disponivel) : 0,
        imagem_url: item.imagem_url || '',
        subcategoria_nome: item.subcategoria_nome || '',
        categoria_id: item.categoria_id != null ? Number(item.categoria_id) : (item.id_categoria != null ? Number(item.id_categoria) : null),
        categoria_nome: item.categoria_nome || '',
        geral_id: item.geral_id != null ? Number(item.geral_id) : (item.id_geral != null ? Number(item.id_geral) : null),
        geral_nome: item.geral_nome || ''
    }));
}

function formatCurrencyBRL(value) {
    if (isNaN(value)) return 'R$ 0,00';
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function resolveBRLValue(item) {
    if (item.preco_reais && item.preco_reais > 0) return item.preco_reais;
    return (item.preco_moedas || 0) * CONFIG.COIN_TO_BRL;
}

function updateViewportUnit() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
}
window.addEventListener('resize', updateViewportUnit);
updateViewportUnit();

function addRowSelectionBehavior() {
    const rows = document.querySelectorAll('.row');
    rows.forEach(row => {
        row.addEventListener('click', function () {
            rows.forEach(r => r.classList.remove('active'));
            this.classList.add('active');
        });
    });
}
```

- [ ] **Step 2: Criar js/components/toast.js**

```javascript
// js/components/toast.js
function ensureToastContainer() {
    if (!document.querySelector('.toast-container')) {
        const div = document.createElement('div');
        div.className = 'toast-container';
        document.body.appendChild(div);
    }
}

function showToast(message, type = 'info', timeout = 3000) {
    ensureToastContainer();
    const container = document.querySelector('.toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), timeout);
}
```

- [ ] **Step 3: Criar js/components/modal.js**

```javascript
// js/components/modal.js
function renderModal(innerHTML) {
    closeModal();
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `<div class="modal">${innerHTML}</div>`;
    overlay.addEventListener('click', event => {
        if (event.target === overlay) closeModal();
    });
    document.body.appendChild(overlay);
}

function closeModal() {
    const existing = document.querySelector('.modal-overlay');
    if (existing) existing.remove();
}

function confirmModal(message, confirmText = 'Confirmar', cancelText = 'Cancelar') {
    return new Promise(resolve => {
        const html = `
            <h2>Confirmação</h2>
            <div class="form-row"><div>${message}</div></div>
            <div class="form-actions">
                <button class="btn cancel" id="confirm-cancel">${cancelText}</button>
                <button class="btn" id="confirm-ok">${confirmText}</button>
            </div>
        `;
        renderModal(html);
        document.getElementById('confirm-cancel').addEventListener('click', () => { closeModal(); resolve(false); });
        document.getElementById('confirm-ok').addEventListener('click', () => { closeModal(); resolve(true); });
    });
}
```

- [ ] **Step 4: Criar js/components/panel.js**

```javascript
// js/components/panel.js
function renderPanel(title, bodyHTML, footerHTML, showBack = true) {
    const backButton = showBack ? `<button class="back-button" onclick="goBack()">←</button>` : '';
    return `
        <section class="panel" role="dialog">
            <div class="corner top-left"></div>
            <div class="corner top-right"></div>
            <header class="header">
                ${backButton}
                <h1 class="title">${title}</h1>
            </header>
            <div class="list">${bodyHTML}</div>
            <div class="footer">${footerHTML}</div>
        </section>
    `;
}
```

- [ ] **Step 5: Remover funções extraídas do app.js**

Do `js/app.js`, remover as definições de: `sanitizeCategoriesTree`, `sanitizeItems`, `formatCurrencyBRL`, `resolveBRLValue`, `updateViewportUnit`, `addRowSelectionBehavior`, `ensureToastContainer`, `showToast`, `renderModal`, `closeModal`, `confirmModal`, `uploadImage`.

- [ ] **Step 6: Atualizar index.html com novos scripts**

```html
<script src="js/api.js" defer></script>
<script src="js/components/utils.js" defer></script>
<script src="js/components/toast.js" defer></script>
<script src="js/components/modal.js" defer></script>
<script src="js/components/panel.js" defer></script>
<script src="js/app.js" defer></script>
```

- [ ] **Step 7: Testar**

Abrir `index.html` no navegador (via Live Server ou file://). Verificar se toast, modais e navegação continuam funcionando.

- [ ] **Step 8: Commit**

```bash
git add js/components/ js/app.js index.html
git commit -m "refactor: extrai componentes JS reutilizáveis do app.js"
```

---

### Task 6: Separar views do frontend

**Files:**
- Create: `js/views/home.js`
- Create: `js/views/categories.js`
- Create: `js/views/items.js`
- Modify: `js/app.js` (remover render functions, manter router e state)
- Modify: `index.html` (adicionar view scripts)

**Interfaces:**
- Consumes: `APP_STATE`, `CONFIG`, `fetchJSON()`, `resolveImage()`, `showToast()`, `renderPanel()`, `sanitizeItems()`, `formatCurrencyBRL()`, `resolveBRLValue()`, `addRowSelectionBehavior()`
- Produces: `renderHome(container)`, `renderGeneralCategories(container)`, `renderCategories(container)`, `renderSubcategories(container)`, `renderItems(container)`, `renderItemDetails(container)`

- [ ] **Step 1: Criar js/views/home.js**

Extrair `renderHome()` do `app.js` para este arquivo:

```javascript
// js/views/home.js
function renderHome(container) {
    const isLoggedIn = APP_STATE.currentUser.isLoggedIn;
    const papel = APP_STATE.currentUser.papel;
    const adminBtn = isLoggedIn && papel === 'dono'
        ? `<div class="row" onclick="navigateTo('admin-panel')" tabindex="0">
            <img class="icon" src="images/uploads/administrativo.png" alt="Admin">
            <div class="label">Painel Administrativo</div>
           </div>`
        : `<div class="row" onclick="navigateTo('admin-login')" tabindex="0">
            <img class="icon" src="images/uploads/administrativo.png" alt="Acesso">
            <div class="label">Acesso</div>
           </div>`;
    const sellerBtn = isLoggedIn && papel === 'vendedor'
        ? `<div class="row" onclick="navigateTo('seller-panel')" tabindex="0">
            <img class="icon" src="images/uploads/mercado.png" alt="Anúncios">
            <div class="label">Meus Anúncios</div>
           </div>`
        : '';
    const logoutBtn = isLoggedIn
        ? `<button class="login-btn" onclick="doLogout()">SAIR (${APP_STATE.currentUser.nome})</button>`
        : `<button class="login-btn" onclick="window.close()">FECHAR</button>`;

    container.innerHTML = renderPanel('Mercado', `
        <div class="row" onclick="navigateTo('general-categories')" tabindex="0">
            <img class="icon" src="images/uploads/mercado.png" alt="Procurar">
            <div class="label">Procurar no mercado</div>
        </div>
        ${sellerBtn}
        ${adminBtn}
    `, logoutBtn, false);
    addRowSelectionBehavior();
}
```

- [ ] **Step 2: Criar js/views/categories.js**

Extrair `renderGeneralCategories()`, `renderCategories()`, `renderSubcategories()`, `selectGeneralCategory()`, `selectCategory()`, `selectSubcategory()`, `selectGeneralRootItems()`, `ensureCategoryTree()`, `prepareCategoryStructures()`, `getGeneralById()`, `getCategoriesByGeneral()`, `getSubcategoriesByCategory()` do `app.js` para este arquivo.

Manter funções auxiliares: `loadAllItems()`, `loadItemsBySubcategory()`, `loadItemsByCategory()`, `loadItemsByGeneral()` (vão para `items.js`).

```javascript
// js/views/categories.js
async function ensureCategoryTree(force = false) {
    if (!force && APP_STATE.categoryTree.length) return APP_STATE.categoryTree;
    try {
        const data = await fetchJSON('categories.php?tree=1');
        const sanitized = sanitizeCategoriesTree(Array.isArray(data) ? data : []);
        prepareCategoryStructures(sanitized);
    } catch (error) {
        console.error('Erro ao carregar categorias:', error);
        showToast('Não foi possível carregar as categorias', 'error');
        APP_STATE.categoryTree = [];
        APP_STATE.generalCategories = [];
        APP_STATE.categoriesLevel2 = [];
        APP_STATE.categoriesLevel3 = [];
        APP_STATE.categoryIndex = new Map();
    }
    return APP_STATE.categoryTree;
}

function prepareCategoryStructures(tree) {
    APP_STATE.categoryTree = tree;
    APP_STATE.generalCategories = [];
    APP_STATE.categoriesLevel2 = [];
    APP_STATE.categoriesLevel3 = [];
    APP_STATE.categoryIndex = new Map();
    tree.forEach(general => {
        const record = { id: general.id, id_pai: general.id_pai, nome: general.nome, nivel: general.nivel, imagem_url: general.imagem_url, filhos: general.filhos, geral_id: general.id };
        APP_STATE.generalCategories.push(record);
        APP_STATE.categoryIndex.set(record.id, record);
        (general.filhos || []).forEach(cat => {
            const catRec = { id: cat.id, id_pai: cat.id_pai, nome: cat.nome, nivel: cat.nivel, imagem_url: cat.imagem_url, filhos: cat.filhos, geral_id: general.id, categoria_id: cat.id };
            APP_STATE.categoriesLevel2.push(catRec);
            APP_STATE.categoryIndex.set(catRec.id, catRec);
            (cat.filhos || []).forEach(sub => {
                const subRec = { id: sub.id, id_pai: sub.id_pai, nome: sub.nome, nivel: sub.nivel, imagem_url: sub.imagem_url, filhos: sub.filhos, geral_id: general.id, categoria_id: cat.id };
                APP_STATE.categoriesLevel3.push(subRec);
                APP_STATE.categoryIndex.set(subRec.id, subRec);
            });
        });
    });
}

function getGeneralById(id) { return id != null ? (APP_STATE.categoryIndex.get(id) || null) : null; }
function getCategoriesByGeneral(gid) { return APP_STATE.categoriesLevel2.filter(c => c.geral_id === gid); }
function getSubcategoriesByCategory(cid) { return APP_STATE.categoriesLevel3.filter(s => s.categoria_id === cid); }

async function selectGeneralCategory(generalId) {
    await ensureCategoryTree();
    if (!APP_STATE.allItems.length) await loadAllItems();
    APP_STATE.currentGeneralId = generalId;
    APP_STATE.currentCategoryId = null;
    APP_STATE.currentSubcategoryId = null;
    APP_STATE.viewingGeneralRootItems = false;
    const categories = getCategoriesByGeneral(generalId);
    if (categories.length === 0) { await loadItemsByGeneral(generalId); navigateTo('items'); return; }
    navigateTo('categories');
}

async function selectCategory(categoryId) {
    await ensureCategoryTree();
    if (!APP_STATE.allItems.length) await loadAllItems();
    APP_STATE.currentCategoryId = categoryId;
    APP_STATE.currentSubcategoryId = null;
    APP_STATE.viewingGeneralRootItems = false;
    const subs = getSubcategoriesByCategory(categoryId);
    if (subs.length === 0) { await loadItemsByCategory(categoryId); navigateTo('items'); return; }
    navigateTo('subcategories');
}

async function selectSubcategory(subcategoryId) {
    APP_STATE.currentSubcategoryId = subcategoryId;
    await loadItemsBySubcategory(subcategoryId);
    navigateTo('items');
}

async function selectGeneralRootItems(generalId) {
    APP_STATE.currentGeneralId = generalId;
    APP_STATE.currentCategoryId = null;
    APP_STATE.currentSubcategoryId = null;
    APP_STATE.viewingGeneralRootItems = true;
    await loadItemsByGeneral(generalId);
    APP_STATE.itemsList = APP_STATE.itemsList.filter(it => !it.categoria_id && it.id_subcategoria === 0);
    navigateTo('items');
}

function countItemsGeneral(general) { return APP_STATE.allItems.filter(it => (it.geral_id === general.id || it.id_geral === general.id)).length; }
function countItemsCategory(cat) { return APP_STATE.allItems.filter(it => (it.categoria_id === cat.id || it.id_categoria === cat.id)).length; }
function countItemsForSub(subId) { return APP_STATE.allItems.filter(it => it.id_subcategoria === subId).length; }

async function renderGeneralCategories(container) {
    await ensureCategoryTree();
    if (!APP_STATE.allItems.length) await loadAllItems();
    const html = APP_STATE.generalCategories.map(cat => `
        <div class="row" onclick="selectGeneralCategory(${cat.id})" tabindex="0">
            <div class="icon-wrapper"><img class="icon" src="${resolveImage(cat.imagem_url)}" alt="${cat.nome}"><span class="count-badge">${countItemsGeneral(cat)}</span></div>
            <div class="label">${cat.nome}</div>
        </div>`).join('') || '<div class="row"><div class="label">Nenhuma categoria cadastrada.</div></div>';
    container.innerHTML = renderPanel('Catálogo', html, '<button class="login-btn" onclick="goBack()">VOLTAR</button>');
    addRowSelectionBehavior();
}

async function renderCategories(container) {
    await ensureCategoryTree();
    if (!APP_STATE.allItems.length) await loadAllItems();
    const general = getGeneralById(APP_STATE.currentGeneralId);
    if (!general) { navigateTo('general-categories'); return; }
    const categories = getCategoriesByGeneral(general.id);
    const rootItems = APP_STATE.allItems.filter(it => (it.geral_id === general.id || it.id_geral === general.id) && !it.categoria_id && it.id_subcategoria === 0);
    const rows = [
        ...(rootItems.length ? [`<div class="row" onclick="selectGeneralRootItems(${general.id})" tabindex="0"><div class="icon-wrapper"><img class="icon" src="${resolveImage(general.imagem_url)}" alt="Itens"><span class="count-badge">${rootItems.length}</span></div><div class="label">Itens sem categoria</div></div>`] : []),
        ...categories.map(cat => `<div class="row" onclick="selectCategory(${cat.id})" tabindex="0"><div class="icon-wrapper"><img class="icon" src="${resolveImage(cat.imagem_url)}" alt="${cat.nome}"><span class="count-badge">${countItemsCategory(cat)}</span></div><div class="label">${cat.nome}</div></div>`)
    ].join('') || '<div class="row"><div class="label">Nenhuma categoria disponível.</div></div>';
    container.innerHTML = renderPanel(general.nome, rows, '<button class="login-btn" onclick="goBack()">VOLTAR</button>');
    addRowSelectionBehavior();
}

async function renderSubcategories(container) {
    await ensureCategoryTree();
    if (!APP_STATE.allItems.length) await loadAllItems();
    const cat = APP_STATE.categoryIndex.get(APP_STATE.currentCategoryId);
    if (!cat) { navigateTo('categories'); return; }
    const subs = getSubcategoriesByCategory(cat.id);
    const html = subs.map(sub => `<div class="row" onclick="selectSubcategory(${sub.id})" tabindex="0"><div class="icon-wrapper"><img class="icon" src="${resolveImage(sub.imagem_url)}" alt="${sub.nome}"><span class="count-badge">${countItemsForSub(sub.id)}</span></div><div class="label">${sub.nome}</div></div>`).join('') || '<div class="row"><div class="label">Nenhuma subcategoria disponível.</div></div>';
    container.innerHTML = renderPanel(cat.nome, html, '<button class="login-btn" onclick="goBack()">VOLTAR</button>');
    addRowSelectionBehavior();
}
```

- [ ] **Step 3: Criar js/views/items.js**

Extrair `renderItems()`, `renderItemDetails()`, `loadItemsBySubcategory()`, `loadItemsByCategory()`, `loadItemsByGeneral()`, `loadAllItems()`, `selectItem()`, `buildWhatsAppLink()`, `whatsBuy()`:

```javascript
// js/views/items.js
async function loadItemsBySubcategory(subId) {
    if (!subId) { APP_STATE.itemsList = []; return []; }
    try { const data = await fetchJSON(`items.php?subcategory_id=${subId}`); APP_STATE.itemsList = sanitizeItems(data); }
    catch (e) { console.error(e); showToast('Erro ao carregar itens', 'error'); APP_STATE.itemsList = []; }
    return APP_STATE.itemsList;
}
async function loadItemsByCategory(catId) {
    if (!catId) { APP_STATE.itemsList = []; return []; }
    try { const data = await fetchJSON(`items.php?category_id=${catId}`); APP_STATE.itemsList = sanitizeItems(data); }
    catch (e) { console.error(e); showToast('Erro ao carregar itens', 'error'); APP_STATE.itemsList = []; }
    return APP_STATE.itemsList;
}
async function loadItemsByGeneral(genId) {
    if (!genId) { APP_STATE.itemsList = []; return []; }
    try { const data = await fetchJSON(`items.php?general_id=${genId}`); APP_STATE.itemsList = sanitizeItems(data); }
    catch (e) { console.error(e); showToast('Erro ao carregar itens', 'error'); APP_STATE.itemsList = []; }
    return APP_STATE.itemsList;
}
async function loadAllItems() {
    try { const data = await fetchJSON('items.php'); APP_STATE.allItems = sanitizeItems(data); }
    catch (e) { console.error(e); APP_STATE.allItems = []; }
    return APP_STATE.allItems;
}

function selectItem(itemId) { APP_STATE.currentItemId = itemId; navigateTo('item-details'); }

function renderItems(container) {
    let title = 'Itens';
    if (APP_STATE.currentSubcategoryId) { const s = APP_STATE.categoryIndex.get(APP_STATE.currentSubcategoryId); if (s) title = s.nome; }
    else if (APP_STATE.currentCategoryId) { const c = APP_STATE.categoryIndex.get(APP_STATE.currentCategoryId); if (c) title = c.nome; }
    else if (APP_STATE.currentGeneralId) { const g = APP_STATE.categoryIndex.get(APP_STATE.currentGeneralId); if (g) title = g.nome; }
    const html = APP_STATE.itemsList.map(item => {
        const pCoins = item.preco_moedas || 0;
        const pBRL = formatCurrencyBRL(resolveBRLValue(item));
        return `<div class="row" onclick="selectItem(${item.id})" tabindex="0"><img class="icon" src="${resolveImage(item.imagem_url)}" alt="${item.nome}"><div class="label">${item.nome}<div style="font-size:12px;color:var(--gold);">${pCoins} moedas • ${pBRL}</div></div></div>`;
    }).join('') || '<div class="row"><div class="label">Nenhum item cadastrado.</div></div>';
    container.innerHTML = renderPanel(title, html, '<button class="login-btn" onclick="goBack()">VOLTAR</button>');
    addRowSelectionBehavior();
}

async function renderItemDetails(container) {
    let item = APP_STATE.itemsList.find(i => i.id === APP_STATE.currentItemId) || APP_STATE.allItems.find(i => i.id === APP_STATE.currentItemId);
    if (!item && APP_STATE.currentItemId != null) {
        try { const data = await fetchJSON(`items.php?id=${APP_STATE.currentItemId}`); if (data) { const s = sanitizeItems([data]); item = s[0]; } } catch (e) { console.error(e); }
    }
    if (!item) { showToast('Item não encontrado', 'error'); goBack(); return; }
    const pCoins = item.preco_moedas || 0;
    const pBRL = formatCurrencyBRL(resolveBRLValue(item));
    const sellerInfo = item.nome_vendedor ? `<p><strong>Vendido por:</strong> ${item.nome_vendedor}</p>` : '';
    container.innerHTML = renderPanel(item.nome, `
        <div class="item-details">
            <div class="item-details-image"><img src="${resolveImage(item.imagem_url, CONFIG.PLACEHOLDER_IMAGE_200)}" alt="${item.nome}"></div>
            <div class="item-details-info">
                <h2>${item.nome}</h2>
                <p><strong>Descrição:</strong> ${item.descricao || 'Sem descrição'}</p>
                <p class="price-line"><span class="price-label">Preço:</span> <span class="price-value">${pCoins} moedas</span></p>
                <p class="price-line"><span class="price-label">Preço R$:</span> <span class="price-value">${pBRL}</span></p>
                ${sellerInfo}
                <div class="purchase-actions"><button type="button" class="btn-whatsapp" onclick="whatsBuy(${item.id})"><span class="wa-icon" aria-hidden="true"></span>Comprar no WhatsApp</button></div>
                <p class="stock-line"><strong>Quantidade:</strong> ${item.quantidade_disponivel}</p>
            </div>
        </div>`, '<button class="login-btn" onclick="goBack()">VOLTAR</button>');
}

function buildWhatsAppLink(item) {
    const number = (APP_STATE.settings.whatsapp_number || '').replace(/\D+/g, '');
    if (!number) return null;
    const pBRL = formatCurrencyBRL(resolveBRLValue(item));
    const text = encodeURIComponent(`Olá! Tenho interesse no item "${item.nome}" por ${pBRL}. Ainda está disponível?`);
    return `https://wa.me/${number}?text=${text}`;
}

function whatsBuy(itemId) {
    let item = APP_STATE.itemsList.find(i => i.id === itemId) || APP_STATE.allItems.find(i => i.id === itemId);
    if (!item) return;
    const url = buildWhatsAppLink(item);
    if (!url) { showToast('Configure o número de WhatsApp nas configurações.', 'error'); navigateTo('admin-panel'); return; }
    window.open(url, '_blank');
}
```

- [ ] **Step 4: Enxugar app.js**

Remover do `app.js`: todas as funções movidas para `views/` e `components/`. Manter apenas:
- `CONFIG` e `APP_STATE` (já modificados)
- `initializeApp()`, `checkAuth()`, `loadSettings()`, `applySettingsToTheme()`, `ensureBackgroundTexture()`
- `renderView()` (router), `navigateTo()`, `goBack()`
- `doLogin()`, `doLogout()`, `renderAdminLogin()`
- Admin panel (será movido depois para `admin.js`)
- `window.*` exports

- [ ] **Step 5: Atualizar index.html com scripts de views**

```html
<script src="js/api.js" defer></script>
<script src="js/components/utils.js" defer></script>
<script src="js/components/toast.js" defer></script>
<script src="js/components/modal.js" defer></script>
<script src="js/components/panel.js" defer></script>
<script src="js/views/categories.js" defer></script>
<script src="js/views/items.js" defer></script>
<script src="js/views/home.js" defer></script>
<script src="js/app.js" defer></script>
```

- [ ] **Step 6: Testar navegação**

Abrir o site e verificar: home → categorias → subcategorias → itens → detalhes → voltar. Tudo deve funcionar como antes.

- [ ] **Step 7: Commit**

```bash
git add js/views/ js/components/ js/app.js index.html
git commit -m "refactor: separa views em módulos independentes"
```

---

### Task 7: CRUD de vendedores (backend)

**Files:**
- Create: `api/sellers.php`
- Modify: `api/items.php` (adicionar JOIN com usuarios para nome_vendedor)

**Interfaces:**
- Consumes: `routes.php`, `isAdmin()`, `usuarios` table
- Produces: `sellers.php` — GET lista todos, POST cria, PUT atualiza, DELETE remove
- Produces: `items.php` GET inclui `nome_vendedor` do JOIN com `usuarios`

- [ ] **Step 1: Criar api/sellers.php**

```php
<?php
require_once __DIR__ . '/routes.php';

if (!isAdmin()) {
    http_response_code(401);
    echo json_encode(['error' => 'Acesso restrito ao administrador']);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];
$db = getDB();

switch ($method) {
    case 'GET':
        $stmt = $db->query('SELECT u.id, u.email, u.nome, u.whatsapp, u.ativo, u.criado_em, (SELECT COUNT(*) FROM itens WHERE id_vendedor = u.id) AS total_itens FROM usuarios u WHERE u.papel = "vendedor" ORDER BY u.nome');
        echo json_encode($stmt->fetchAll());
        break;

    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $nome = trim((string)($data['nome'] ?? ''));
        $email = trim((string)($data['email'] ?? ''));
        $whatsapp = trim((string)($data['whatsapp'] ?? ''));
        $senha = trim((string)($data['senha'] ?? ''));

        if ($nome === '' || $email === '' || $senha === '') {
            http_response_code(400);
            echo json_encode(['error' => 'Nome, email e senha são obrigatórios']);
            break;
        }
        if (strlen($senha) < 6) {
            http_response_code(400);
            echo json_encode(['error' => 'Senha deve ter ao menos 6 caracteres']);
            break;
        }
        // Verifica email único
        $check = $db->prepare('SELECT COUNT(*) FROM usuarios WHERE email = ?');
        $check->execute([$email]);
        if ($check->fetchColumn() > 0) {
            http_response_code(409);
            echo json_encode(['error' => 'Email já cadastrado']);
            break;
        }
        $hash = password_hash($senha, PASSWORD_DEFAULT);
        $stmt = $db->prepare('INSERT INTO usuarios (email, senha_hash, papel, nome, whatsapp, ativo, senha_trocada) VALUES (?, ?, "vendedor", ?, ?, 1, 0)');
        $stmt->execute([$email, $hash, $nome, $whatsapp]);
        echo json_encode(['success' => true, 'id' => (int) $db->lastInsertId()]);
        break;

    case 'PUT':
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $id = isset($data['id']) ? (int) $data['id'] : 0;
        if ($id <= 0) {
            http_response_code(400);
            echo json_encode(['error' => 'ID inválido']);
            break;
        }
        $stmt = $db->prepare('SELECT id FROM usuarios WHERE id = ? AND papel = "vendedor"');
        $stmt->execute([$id]);
        if (!$stmt->fetch()) {
            http_response_code(404);
            echo json_encode(['error' => 'Vendedor não encontrado']);
            break;
        }
        $fields = [];
        $params = [];
        if (isset($data['nome'])) { $fields[] = 'nome = ?'; $params[] = trim((string) $data['nome']); }
        if (isset($data['email'])) { $fields[] = 'email = ?'; $params[] = trim((string) $data['email']); }
        if (isset($data['whatsapp'])) { $fields[] = 'whatsapp = ?'; $params[] = trim((string) $data['whatsapp']); }
        if (isset($data['ativo'])) { $fields[] = 'ativo = ?'; $params[] = (int) $data['ativo']; }
        if (!empty($data['nova_senha'])) {
            if (strlen($data['nova_senha']) < 6) {
                http_response_code(400);
                echo json_encode(['error' => 'Senha deve ter ao menos 6 caracteres']);
                break;
            }
            $fields[] = 'senha_hash = ?'; $params[] = password_hash($data['nova_senha'], PASSWORD_DEFAULT);
            $fields[] = 'senha_trocada = 0';
        }
        if (empty($fields)) {
            http_response_code(400);
            echo json_encode(['error' => 'Nenhum campo para atualizar']);
            break;
        }
        $params[] = $id;
        $stmt = $db->prepare('UPDATE usuarios SET ' . implode(', ', $fields) . ' WHERE id = ?');
        $stmt->execute($params);
        echo json_encode(['success' => true]);
        break;

    case 'DELETE':
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $id = isset($data['id']) ? (int) $data['id'] : 0;
        if ($id <= 0) {
            http_response_code(400);
            echo json_encode(['error' => 'ID inválido']);
            break;
        }
        $stmt = $db->prepare('DELETE FROM usuarios WHERE id = ? AND papel = "vendedor"');
        $stmt->execute([$id]);
        echo json_encode(['success' => true]);
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Método não permitido']);
}
```

- [ ] **Step 2: Atualizar items.php GET para incluir nome_vendedor**

Na função `fetchItemsWithRelations()` do `api/items.php`, adicionar o JOIN:

```php
LEFT JOIN usuarios v ON v.id = i.id_vendedor
```

E adicionar no SELECT:

```php
v.nome AS nome_vendedor,
```

- [ ] **Step 3: Testar**

```bash
# Criar vendedor (deve falhar sem autenticação)
curl -X POST http://127.0.0.1:8080/api/sellers.php \
  -H "Content-Type: application/json" \
  -d '{"nome":"Teste","email":"teste@test.com","whatsapp":"5511999999999","senha":"123456"}'
# Deve retornar erro 401

# Fazer login como admin primeiro
curl -c /tmp/cookie -b /tmp/cookie -X POST \
  http://127.0.0.1:8080/api/auth.php?action=login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "email=admin@mercado.com&password=admin123"

# Criar vendedor logado como admin
curl -c /tmp/cookie -b /tmp/cookie -X POST \
  http://127.0.0.1:8080/api/sellers.php \
  -H "Content-Type: application/json" \
  -d '{"nome":"Teste","email":"teste@test.com","whatsapp":"5511999999999","senha":"123456"}'
# Deve retornar {"success":true,"id":2}

# Listar vendedores
curl -c /tmp/cookie -b /tmp/cookie http://127.0.0.1:8080/api/sellers.php
# Deve listar o vendedor criado
```

- [ ] **Step 4: Commit**

```bash
git add api/sellers.php api/items.php
git commit -m "feat: CRUD de vendedores no backend"
```

---

### Task 8: Painel do vendedor (frontend)

**Files:**
- Create: `js/views/seller.js`
- Modify: `js/app.js` (adicionar rota 'seller-panel' no router)
- Modify: `index.html` (adicionar script)

**Interfaces:**
- Consumes: `APP_STATE`, `fetchJSON()`, `showToast()`, `renderPanel()`, `renderModal()`, `closeModal()`, `confirmModal()`, `uploadImage()`, `ensureCategoryTree()`
- Produces: `renderSellerPanel(container)`, seller CRUD UI

- [ ] **Step 1: Criar js/views/seller.js**

```javascript
// js/views/seller.js
async function loadSellerItems() {
    try {
        const data = await fetchJSON(`items.php?seller_id=${APP_STATE.currentUser.id}`);
        APP_STATE.itemsList = sanitizeItems(data);
    } catch (e) {
        console.error(e);
        APP_STATE.itemsList = [];
    }
    return APP_STATE.itemsList;
}

function renderSellerItemsList(container, term = '') {
    const filterTerm = (term || '').toLowerCase();
    const filtered = APP_STATE.itemsList.filter(item =>
        !filterTerm || (item.nome || '').toLowerCase().includes(filterTerm)
    );
    if (!filtered.length) {
        container.innerHTML = '<div class="accordion-empty">Nenhum item encontrado. Crie seu primeiro anúncio!</div>';
        return;
    }
    container.innerHTML = filtered.map(item => {
        const pCoins = item.preco_moedas || 0;
        const pBRL = formatCurrencyBRL(resolveBRLValue(item));
        const catPath = [item.geral_nome, item.categoria_nome, item.subcategoria_nome].filter(Boolean).join(' › ');
        return `
            <div class="admin-row">
                <img class="thumb" src="${resolveImage(item.imagem_url)}" alt="${item.nome}">
                <div>
                    <div class="title">${item.nome}</div>
                    <div class="subtitle">${pCoins} moedas • ${pBRL}</div>
                    <div class="subtitle">${catPath || 'Sem categoria'}</div>
                </div>
                <div class="admin-item-actions">
                    <button class="admin-button" onclick="openSellerItemForm(${item.id})">Editar</button>
                    <button class="admin-button danger" onclick="promptDeleteSellerItem(${item.id})">Excluir</button>
                </div>
            </div>`;
    }).join('');
}

async function renderSellerPanel(container) {
    if (!APP_STATE.currentUser.isLoggedIn || APP_STATE.currentUser.papel !== 'vendedor') {
        navigateTo('admin-login');
        return;
    }
    await ensureCategoryTree();
    await loadSellerItems();
    const count = APP_STATE.itemsList.length;

    container.innerHTML = `
        <section class="panel" role="dialog">
            <div class="corner top-left"></div>
            <div class="corner top-right"></div>
            <header class="header">
                <h1 class="title">Meus Anúncios (${count})</h1>
            </header>
            <div class="admin-panel">
                <div class="accordion-filters">
                    <button class="admin-button" id="btn-new-seller-item">+ Novo Item</button>
                    <input type="text" id="seller-filter-term" placeholder="Buscar item...">
                </div>
                <div class="accordion-list" id="seller-items-list"></div>
            </div>
            <div class="footer">
                <button class="login-btn" onclick="goBack()">VOLTAR</button>
            </div>
        </section>`;

    const listContainer = document.getElementById('seller-items-list');
    const searchInput = document.getElementById('seller-filter-term');
    const newBtn = document.getElementById('btn-new-seller-item');

    renderSellerItemsList(listContainer);
    searchInput.addEventListener('input', () => renderSellerItemsList(listContainer, searchInput.value));
    newBtn.addEventListener('click', () => openSellerItemForm());
}

async function openSellerItemForm(itemId = null) {
    await ensureCategoryTree();
    let item = null;
    if (itemId != null) {
        item = APP_STATE.itemsList.find(i => i.id === itemId) || null;
        if (!item) {
            try { const data = await fetchJSON(`items.php?id=${itemId}`); const s = sanitizeItems([data]); item = s[0]; } catch (e) {}
        }
    }
    const defGeneralId = item ? (item.geral_id || item.id_geral || APP_STATE.generalCategories[0]?.id || 0) : (APP_STATE.generalCategories[0]?.id || 0);
    const catsForGeneral = defGeneralId ? getCategoriesByGeneral(defGeneralId) : APP_STATE.categoriesLevel2;
    const defCatId = item ? (item.categoria_id || item.id_categoria || catsForGeneral[0]?.id || 0) : (catsForGeneral[0]?.id || 0);
    const subsForCat = defCatId ? getSubcategoriesByCategory(defCatId) : [];
    const defSubId = item ? (item.id_subcategoria || subsForCat[0]?.id || 0) : (subsForCat[0]?.id || 0);

    const genOpts = APP_STATE.generalCategories.map(g => `<option value="${g.id}" ${g.id === defGeneralId ? 'selected' : ''}>${g.nome}</option>`).join('');
    const catOpts = catsForGeneral.map(c => `<option value="${c.id}" ${c.id === defCatId ? 'selected' : ''}>${c.nome}</option>`).join('');
    const subOpts = subsForCat.map(s => `<option value="${s.id}" ${s.id === defSubId ? 'selected' : ''}>${s.nome}</option>`).join('');

    renderModal(`
        <h2>${item ? 'Editar Item' : 'Novo Item'}</h2>
        <div class="form-row"><label>Categoria Geral</label><select id="sf-general">${genOpts}</select></div>
        <div class="form-row" id="sf-row-cat" style="${catsForGeneral.length ? '' : 'display:none;'}"><label>Categoria</label><select id="sf-category">${catOpts}</select></div>
        <div class="form-row" id="sf-row-sub" style="${subsForCat.length ? '' : 'display:none;'}"><label>Subcategoria</label><select id="sf-subcategory">${subOpts}</select></div>
        <div class="form-row"><label>Nome</label><input type="text" id="sf-name" value="${item ? item.nome : ''}"></div>
        <div class="form-row"><label>Descrição</label><textarea id="sf-desc">${item ? (item.descricao || '') : ''}</textarea></div>
        <div class="form-row"><label>Preço (moedas)</label><input type="number" min="0" id="sf-coins" value="${item ? item.preco_moedas : 0}"></div>
        <div class="form-row"><label>Preço em R$</label><input type="number" step="0.01" min="0" id="sf-brl" value="${item ? item.preco_reais : 0}"></div>
        <div class="form-row"><label>Quantidade</label><input type="number" min="0" id="sf-qty" value="${item ? item.quantidade_disponivel : 0}"></div>
        <div class="form-row"><label>Imagem</label><input type="file" accept="image/*" id="sf-image"></div>
        <div class="form-actions"><button class="btn cancel" onclick="closeModal()">Cancelar</button><button class="btn" id="sf-submit">${item ? 'Salvar' : 'Criar'}</button></div>
    `);

    const genSel = document.getElementById('sf-general');
    const catSel = document.getElementById('sf-category');
    const subSel = document.getElementById('sf-subcategory');

    genSel.addEventListener('change', () => {
        const gid = parseInt(genSel.value || '0', 10);
        const cats = gid ? getCategoriesByGeneral(gid) : [];
        fillSelect(catSel, cats, 'Selecione');
        document.getElementById('sf-row-cat').style.display = cats.length ? '' : 'none';
        document.getElementById('sf-row-sub').style.display = 'none';
    });
    catSel.addEventListener('change', () => {
        const cid = parseInt(catSel.value || '0', 10);
        const subs = cid ? getSubcategoriesByCategory(cid) : [];
        fillSelect(subSel, subs, 'Selecione');
        document.getElementById('sf-row-sub').style.display = subs.length ? '' : 'none';
    });

    document.getElementById('sf-submit').addEventListener('click', async () => {
        const nome = document.getElementById('sf-name').value.trim();
        const desc = document.getElementById('sf-desc').value.trim();
        const coins = parseInt(document.getElementById('sf-coins').value || '0', 10);
        const brl = parseFloat(document.getElementById('sf-brl').value || '0');
        const qty = parseInt(document.getElementById('sf-qty').value || '0', 10);
        const gid = parseInt(genSel.value || '0', 10);
        const cid = document.getElementById('sf-row-cat').style.display !== 'none' ? parseInt(catSel.value || '0', 10) : 0;
        const sid = document.getElementById('sf-row-sub').style.display !== 'none' ? parseInt(subSel.value || '0', 10) : 0;

        if (!nome) { showToast('Informe o nome', 'error'); return; }
        if (!gid) { showToast('Selecione uma categoria geral', 'error'); return; }

        const payload = { nome, descricao: desc, preco_moedas: coins, preco_reais: brl, quantidade_disponivel: qty, imagem_url: item ? item.imagem_url : '' };
        if (sid) payload.id_subcategoria = sid;
        else if (cid) payload.id_categoria = cid;
        else payload.id_geral = gid;

        const fileInput = document.getElementById('sf-image');
        if (fileInput.files && fileInput.files[0]) {
            try { payload.imagem_url = await uploadImage(fileInput.files[0]); } catch (e) { showToast(e.message, 'error'); return; }
        }

        try {
            if (item) {
                payload.id = item.id;
                await fetchJSON('items.php', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                showToast('Item atualizado', 'success');
            } else {
                await fetchJSON('items.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                showToast('Item criado', 'success');
            }
            closeModal();
            await loadSellerItems();
            renderSellerItemsList(document.getElementById('seller-items-list'));
        } catch (e) { console.error(e); showToast(e.message || 'Erro ao salvar', 'error'); }
    });
}

async function promptDeleteSellerItem(itemId) {
    const confirmed = await confirmModal('Deseja excluir este item?');
    if (!confirmed) return;
    try {
        await fetchJSON('items.php', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: itemId }) });
        showToast('Item excluído', 'success');
        await loadSellerItems();
        renderSellerItemsList(document.getElementById('seller-items-list'));
    } catch (e) { console.error(e); showToast(e.message || 'Erro ao excluir', 'error'); }
}

function fillSelect(select, items, placeholder) {
    if (!select) return;
    select.innerHTML = [`<option value="0">${placeholder}</option>`, ...items.map(i => `<option value="${i.id}">${i.nome}</option>`)].join('');
}

window.openSellerItemForm = openSellerItemForm;
window.promptDeleteSellerItem = promptDeleteSellerItem;
```

- [ ] **Step 2: Adicionar rota 'seller-panel' no router do app.js**

No `renderView()` do `js/app.js`, adicionar o case:

```javascript
case 'seller-panel':
    await renderSellerPanel(container);
    break;
```

- [ ] **Step 3: Atualizar index.html**

Adicionar após os outros view scripts:
```html
<script src="js/views/seller.js" defer></script>
```

- [ ] **Step 4: Testar**

1. Logar como admin, criar vendedor via curl
2. Logar como vendedor no navegador, verificar painel "Meus Anúncios"
3. Criar item, editar, excluir
4. Verificar que itens aparecem no catálogo público com "Vendido por: [nome]"

- [ ] **Step 5: Commit**

```bash
git add js/views/seller.js js/app.js index.html
git commit -m "feat: painel do vendedor com CRUD de anúncios"
```

---

### Task 9: Gestão de vendedores no painel admin

**Files:**
- Create: `js/views/admin.js` (extrair do app.js + adicionar seção sellers)
- Modify: `js/app.js` (remover funções admin, manter referência)
- Modify: `index.html` (adicionar admin.js)

**Interfaces:**
- Consumes: `APP_STATE`, `fetchJSON()`, `showToast()`, `renderPanel()`, `renderModal()`, `closeModal()`, `uploadImage()`, `ensureCategoryTree()`
- Produces: `renderAdminLogin()`, `renderAdminPanel()`, accordions, gestão de vendedores

- [ ] **Step 1: Criar js/views/admin.js**

Mover do `app.js` para cá:
- `renderAdminLogin()`, `renderAdminPanel()`, `renderAccordionGeneral()`, `renderAccordionCategories()`, `renderAccordionSubcategories()`
- `updateCategoryImage()`, `attachCategoryImageUploadHandlers()`, `setupItemsAccordion()`, `fillSelect()`, `renderAdminItemsList()`, `setupAppearanceAccordion()`
- `openItemForm()`, `promptDeleteItem()`

Adicionar nova seção de vendedores no `renderAdminPanel()`:

No accordion, após o `<details>` de Personalização Visual, adicionar:

```javascript
`<details class="accordion-item">
    <summary>Vendedores <span class="accordion-chevron">▶</span></summary>
    <div class="accordion-content" id="accordion-sellers">
        <button class="admin-button" id="btn-new-seller">+ Novo Vendedor</button>
        <div class="accordion-list" id="sellers-list"></div>
    </div>
</details>`
```

E adicionar chamada no final de `renderAdminPanel()`:
```javascript
renderAccordionSellers();
```

Nova função `renderAccordionSellers()`:

```javascript
async function renderAccordionSellers() {
    const container = document.getElementById('sellers-list');
    const btn = document.getElementById('btn-new-seller');
    if (!container) return;
    try {
        const sellers = await fetchJSON('sellers.php');
        if (!sellers.length) {
            container.innerHTML = '<div class="accordion-empty">Nenhum vendedor cadastrado.</div>';
        } else {
            container.innerHTML = sellers.map(s => `
                <div class="admin-row">
                    <div>
                        <div class="title">${s.nome}</div>
                        <div class="subtitle">📧 ${s.email} • 📱 ${s.whatsapp || 'N/A'} • ${s.total_itens} itens</div>
                        <div class="subtitle">${s.ativo ? '🟢 Ativo' : '🔴 Inativo'} • Desde ${s.criado_em || 'N/A'}</div>
                    </div>
                    <div class="admin-item-actions">
                        <button class="admin-button" onclick="openSellerForm(${s.id})">Editar</button>
                        <button class="admin-button" onclick="toggleSeller(${s.id}, ${s.ativo ? 0 : 1})">${s.ativo ? 'Desativar' : 'Ativar'}</button>
                    </div>
                </div>`).join('');
        }
        btn.onclick = () => openSellerForm();
        window.openSellerForm = openSellerForm;
        window.toggleSeller = toggleSeller;
    } catch (e) { console.error(e); showToast('Erro ao carregar vendedores', 'error'); }
}

async function openSellerForm(sellerId = null) {
    let seller = null;
    if (sellerId) {
        try {
            const sellers = await fetchJSON('sellers.php');
            seller = sellers.find(s => s.id === sellerId) || null;
        } catch (e) {}
    }
    renderModal(`
        <h2>${seller ? 'Editar Vendedor' : 'Novo Vendedor'}</h2>
        <div class="form-row"><label>Nome</label><input type="text" id="sf-name" value="${seller ? seller.nome : ''}"></div>
        <div class="form-row"><label>Email</label><input type="email" id="sf-email" value="${seller ? seller.email : ''}"></div>
        <div class="form-row"><label>WhatsApp</label><input type="text" id="sf-whatsapp" value="${seller ? seller.whatsapp : ''}" placeholder="5511999999999"></div>
        <div class="form-row"><label>${seller ? 'Nova senha (deixe em branco para manter)' : 'Senha inicial'}</label><input type="password" id="sf-password" placeholder="${seller ? '••••••' : 'Mínimo 6 caracteres'}"></div>
        <div class="form-actions"><button class="btn cancel" onclick="closeModal()">Cancelar</button><button class="btn" id="sf-submit">${seller ? 'Salvar' : 'Criar'}</button></div>
    `);
    document.getElementById('sf-submit').addEventListener('click', async () => {
        const nome = document.getElementById('sf-name').value.trim();
        const email = document.getElementById('sf-email').value.trim();
        const whatsapp = document.getElementById('sf-whatsapp').value.trim();
        const senha = document.getElementById('sf-password').value.trim();
        if (!nome || !email || (!seller && !senha)) { showToast('Preencha os campos obrigatórios', 'error'); return; }
        if (!seller && senha.length < 6) { showToast('Senha deve ter 6+ caracteres', 'error'); return; }
        try {
            const payload = { nome, email, whatsapp };
            if (senha) payload.nova_senha = senha;
            if (seller) {
                payload.id = seller.id;
                await fetchJSON('sellers.php', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                showToast('Vendedor atualizado', 'success');
            } else {
                payload.senha = senha;
                await fetchJSON('sellers.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                showToast('Vendedor criado', 'success');
            }
            closeModal();
            await renderAccordionSellers();
        } catch (e) { console.error(e); showToast(e.message || 'Erro ao salvar', 'error'); }
    });
}

async function toggleSeller(id, ativo) {
    try {
        await fetchJSON('sellers.php', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ativo }) });
        showToast(ativo ? 'Vendedor ativado' : 'Vendedor desativado', 'success');
        await renderAccordionSellers();
    } catch (e) { console.error(e); showToast('Erro ao alterar status', 'error'); }
}
```

- [ ] **Step 2: Atualizar app.js — remover funções admin**

Remover do `app.js` todas as funções extraídas para `admin.js`. Manter apenas o `case 'admin-login'` e `case 'admin-panel'` no router, delegando para as funções no `admin.js`.

- [ ] **Step 3: Atualizar index.html**

```html
<script src="js/views/admin.js" defer></script>
```

- [ ] **Step 4: Testar**

1. Logar como admin
2. Navegar para Painel Admin → Vendedores
3. Criar, editar, ativar/desativar vendedor
4. Logar como vendedor, verificar acesso

- [ ] **Step 5: Commit**

```bash
git add js/views/admin.js js/app.js index.html
git commit -m "feat: gestão de vendedores no painel admin"
```

---

### Task 10: CSS — refatoração, grid cards, tipografia

**Files:**
- Modify: `css/style.css`
- Create: `css/animations.css`
- Modify: `index.html` (link animations.css)

- [ ] **Step 1: Criar css/animations.css**

```css
/* =====================================================
   ANIMAÇÕES
   ===================================================== */

/* Fade in para transições de view */
@keyframes fadeIn {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
}
.panel {
    animation: fadeIn 200ms ease-out;
}

/* Hover em cards de categoria */
.row:hover {
    transform: scale(1.03);
    box-shadow: 0 0 12px rgba(212, 175, 55, 0.3);
    transition: transform 150ms ease, box-shadow 150ms ease;
}
.row {
    transition: transform 150ms ease, box-shadow 150ms ease;
}

/* Ripple effect (ativado via JS) */
.ripple {
    position: relative;
    overflow: hidden;
}
.ripple-effect {
    position: absolute;
    border-radius: 50%;
    background: rgba(255, 215, 0, 0.4);
    transform: scale(0);
    animation: ripple 600ms ease-out;
    pointer-events: none;
}
@keyframes ripple {
    to { transform: scale(4); opacity: 0; }
}

/* Toast slide-in */
@keyframes slideInRight {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
}
.toast {
    animation: slideInRight 300ms ease-out;
}

/* Accordion chevron */
.accordion-item summary .accordion-chevron {
    display: inline-block;
    transition: transform 200ms ease;
}
.accordion-item[open] summary .accordion-chevron {
    transform: rotate(90deg);
}

/* Modal scale-in */
@keyframes scaleIn {
    from { transform: scale(0.95); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
}
.modal {
    animation: scaleIn 200ms ease-out;
}
.modal-overlay {
    animation: fadeIn 150ms ease-out;
}

/* Skeleton shimmer */
@keyframes shimmer {
    0% { background-position: -200px 0; }
    100% { background-position: calc(200px + 100%) 0; }
}
.skeleton {
    background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.04) 75%);
    background-size: 200px 100%;
    animation: shimmer 1.5s ease-in-out infinite;
    border-radius: 4px;
}
```

- [ ] **Step 2: Atualizar CSS — tipografia e grid cards**

No `css/style.css`, adicionar/seções:

```css
/* Tipografia melhorada */
body {
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    line-height: 1.5;
}
.title {
    letter-spacing: 0.5px;
    font-weight: 700;
}
.price-value {
    font-weight: 600;
    color: #ffd700;
}

/* Grid de cards (2 colunas) para categorias */
.row {
    min-height: 56px;
}
.icon-wrapper {
    position: relative;
    display: inline-block;
}
.count-badge {
    position: absolute;
    top: -4px;
    right: -8px;
    background: #d46a2e;
    color: #fff;
    border-radius: 10px;
    padding: 1px 6px;
    font-size: 11px;
    font-weight: 600;
    min-width: 18px;
    text-align: center;
}

/* Scroll indicator */
.list::after {
    content: '';
    position: sticky;
    bottom: 0;
    left: 0;
    right: 0;
    height: 20px;
    background: linear-gradient(transparent, rgba(0,0,0,0.6));
    pointer-events: none;
    opacity: 0;
    transition: opacity 200ms;
}
.list.has-scroll::after {
    opacity: 1;
}

/* Navbar mobile */
.mobile-nav {
    display: none;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: #1a1a1a;
    border-top: 2px solid #d4af37;
    padding: 8px 16px;
    z-index: 100;
    justify-content: space-around;
}
.mobile-nav button {
    background: transparent;
    border: none;
    color: #ffd700;
    font-size: 20px;
    padding: 8px 16px;
    cursor: pointer;
}
@media (max-width: 768px) {
    .mobile-nav { display: flex; }
    body { padding-bottom: 60px; }
}
```

- [ ] **Step 3: Adicionar link do animations.css no index.html**

```html
<link rel="stylesheet" href="css/style.css">
<link rel="stylesheet" href="css/animations.css" media="print" onload="this.media='all'">
```

- [ ] **Step 4: Adicionar ripple effect nos botões (app.js)**

No `js/app.js`, adicionar no `initializeApp()`:

```javascript
document.addEventListener('click', function(e) {
    const btn = e.target.closest('button');
    if (!btn) return;
    btn.classList.add('ripple');
    const ripple = document.createElement('span');
    ripple.className = 'ripple-effect';
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${e.clientX - rect.left - size/2}px`;
    ripple.style.top = `${e.clientY - rect.top - size/2}px`;
    btn.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
});
```

- [ ] **Step 5: Adicionar scroll indicator na lista (app.js)**

No `renderView()` ou após cada render, adicionar:

```javascript
// Após renderizar a view, verificar scroll
const list = document.querySelector('.list');
if (list) {
    const hasScroll = list.scrollHeight > list.clientHeight;
    list.classList.toggle('has-scroll', hasScroll);
}
```

- [ ] **Step 6: Testar visual**

Abrir site, verificar: animações, grid de cards, tipografia, ripple effect.

- [ ] **Step 7: Commit**

```bash
git add css/style.css css/animations.css js/app.js index.html
git commit -m "feat: animações CSS, tipografia melhorada, grid cards, ripple effect"
```

---

### Task 11: Navbar mobile e micro-interações

**Files:**
- Modify: `js/app.js` (navbar mobile, favoritos, tooltip)
- Modify: `css/style.css` (navbar styles)
- Modify: `index.html` (navbar HTML, meta tags SEO)

- [ ] **Step 1: Adicionar navbar mobile no index.html**

Após `<div id="app">`:

```html
<nav class="mobile-nav" id="mobile-nav">
    <button onclick="navigateTo('home')" title="Home">🏠</button>
    <button onclick="navigateTo('general-categories')" title="Categorias">📋</button>
    <button onclick="scrollToTop()" title="Voltar ao topo">⬆️</button>
</nav>
```

- [ ] **Step 2: Mostrar/esconder navbar no scroll**

No `initializeApp()` do `js/app.js`:

```javascript
let lastScrollY = 0;
const mobileNav = document.getElementById('mobile-nav');
window.addEventListener('scroll', () => {
    if (!mobileNav) return;
    const currentScroll = window.scrollY;
    if (currentScroll > lastScrollY && currentScroll > 100) {
        mobileNav.style.transform = 'translateY(100%)';
    } else {
        mobileNav.style.transform = 'translateY(0)';
    }
    lastScrollY = currentScroll;
}, { passive: true });
```

- [ ] **Step 3: Adicionar sistema de favoritos (localStorage)**

No `js/app.js` ou novo arquivo `js/components/favorites.js`:

```javascript
function getFavorites() {
    try { return JSON.parse(localStorage.getItem('favorites') || '[]'); } catch { return []; }
}
function toggleFavorite(itemId) {
    let favs = getFavorites();
    const idx = favs.indexOf(itemId);
    if (idx >= 0) { favs.splice(idx, 1); showToast('Removido dos favoritos', 'info'); }
    else { favs.push(itemId); showToast('Adicionado aos favoritos ❤️', 'success'); }
    localStorage.setItem('favorites', JSON.stringify(favs));
    return favs;
}
function isFavorite(itemId) { return getFavorites().includes(itemId); }
```

Adicionar ícone de coração nos cards de item (em `renderItems()` no `items.js`):

```javascript
const favClass = isFavorite(item.id) ? '❤️' : '🤍';
// Adicionar no HTML do item:
`<span class="fav-icon" onclick="event.stopPropagation();toggleFavorite(${item.id});renderItems(document.getElementById('app'));">${favClass}</span>`
```

- [ ] **Step 4: Adicionar tooltip de primeiro acesso**

No `initializeApp()`:

```javascript
const hasVisited = localStorage.getItem('has_visited');
if (!hasVisited) {
    setTimeout(() => showToast('👋 Clique nas categorias para explorar itens!', 'info', 5000), 1000);
    localStorage.setItem('has_visited', '1');
}
```

- [ ] **Step 5: Atualizar meta tags SEO no index.html**

```html
<meta name="description" content="Mercado Warspear - Compre e venda itens do jogo">
<meta name="robots" content="index, follow">
<meta property="og:title" content="Mercado Warspear">
<meta property="og:description" content="Catálogo de itens do Warspear Online">
<meta property="og:image" content="images/uploads/mercado.png">
<meta property="og:type" content="website">
<title id="page-title">Mercado Warspear</title>
```

Adicionar atualização de título no `renderView()`:

```javascript
const titles = { home: 'Mercado Warspear', 'general-categories': 'Catálogo', items: 'Itens', 'item-details': 'Detalhes', 'admin-panel': 'Admin', 'seller-panel': 'Meus Anúncios' };
document.getElementById('page-title').textContent = (titles[APP_STATE.currentView] || 'Mercado') + ' — Mercado Warspear';
```

- [ ] **Step 6: Testar mobile**

Redimensionar navegador para <768px. Verificar: navbar visível, esconde no scroll, favoritos, tooltip.

- [ ] **Step 7: Commit**

```bash
git add css/style.css js/app.js js/views/items.js index.html
git commit -m "feat: navbar mobile, favoritos, tooltip primeiro acesso, SEO meta tags"
```

---

### Task 12: Segurança — .htaccess, CSRF, hardenings

**Files:**
- Create: `.htaccess`
- Create: `database/.htaccess`
- Modify: `api/routes.php` (CSRF enforcement)
- Modify: `api/upload.php` (extensão dupla)

- [ ] **Step 1: Criar .htaccess raiz**

```apache
Options -Indexes

# Bloquear acesso a arquivos sensíveis
<FilesMatch "^(config\.php)$">
    <IfModule mod_authz_core.c>
        Require all denied
    </IfModule>
    <IfModule !mod_authz_core.c>
        Order allow,deny
        Deny from all
    </IfModule>
</FilesMatch>

# Bloquear acesso direto ao diretório database
RedirectMatch 403 ^/database/.*$

# Forçar HTTPS (descomentar em produção)
# <IfModule mod_rewrite.c>
#     RewriteEngine On
#     RewriteCond %{HTTPS} off
#     RewriteRule ^(.*)$ https://%{HTTP_HOST}/$1 [R=301,L]
# </IfModule>
```

- [ ] **Step 2: Criar database/.htaccess**

```apache
<IfModule mod_authz_core.c>
    Require all denied
</IfModule>
<IfModule !mod_authz_core.c>
    Order allow,deny
    Deny from all
</IfModule>
```

- [ ] **Step 3: Adicionar verificação CSRF no routes.php**

No `api/routes.php`, adicionar após `sendSecurityHeaders()`:

```php
// Verificar CSRF em métodos que alteram estado
if (in_array($_SERVER['REQUEST_METHOD'], ['POST', 'PUT', 'DELETE'])) {
    if (!verifyCsrfToken()) {
        http_response_code(403);
        echo json_encode(['error' => 'Token CSRF inválido']);
        exit();
    }
}
```

E expor o token para o frontend. Adicionar endpoint no `auth.php`:

```php
case 'csrf':
    echo json_encode(['csrf_token' => generateCsrfToken()]);
    exit();
```

No `js/api.js`, adicionar obtenção automática:

```javascript
let csrfToken = '';
async function getCsrfToken() {
    if (csrfToken) return csrfToken;
    try {
        const data = await fetch(`${CONFIG.API_URL}/auth.php?action=csrf`, { credentials: 'same-origin' });
        const json = await data.json();
        csrfToken = json.csrf_token;
    } catch (_) {}
    return csrfToken;
}
// Adicionar header CSRF em todas as requisições de escrita
async function fetchJSON(endpoint, options = {}) {
    const init = { credentials: 'same-origin', ...options };
    if (!init.headers) init.headers = {};
    if (['POST', 'PUT', 'DELETE'].includes(init.method || 'GET')) {
        const token = await getCsrfToken();
        if (token) init.headers['X-CSRF-Token'] = token;
    }
    // ... resto igual
}
```

- [ ] **Step 4: Hardening upload.php**

No `api/upload.php`, após verificar MIME type, adicionar:

```php
// Rejeitar extensão dupla
$originalName = strtolower($file['name']);
if (substr_count($originalName, '.') > 1) {
    http_response_code(400);
    echo json_encode(['error' => 'Nome de arquivo inválido']);
    exit();
}
```

- [ ] **Step 5: Testar**

```bash
# Tentar acessar banco diretamente
curl -I http://127.0.0.1:8080/database/mercado.db
# Deve retornar 403 (se Apache com .htaccess)

# Testar CSRF (sem token, POST deve falhar)
curl -X POST http://127.0.0.1:8080/api/items.php \
  -H "Content-Type: application/json" \
  -d '{"nome":"test"}'
# Deve retornar 403
```

- [ ] **Step 6: Commit**

```bash
git add .htaccess database/.htaccess api/routes.php api/upload.php js/api.js api/auth.php
git commit -m "feat: segurança — .htaccess, CSRF tokens, proteção upload"
```

---

### Task 13: Testes finais e ajustes

**Files:**
- Modify: `js/app.js` (ajustes de integração)
- Modify: diversos (bug fixes)

- [ ] **Step 1: Testar fluxo completo**

1. Abrir site como visitante
2. Navegar por todas as categorias
3. Ver detalhes de item com vendedor
4. Clicar "Comprar no WhatsApp" (deve abrir com número do vendedor)
5. Logar como admin (admin@mercado.com / admin123)
6. Criar vendedor
7. Logar como vendedor
8. Criar item, verificar no catálogo público
9. Logar como admin, ver o item do vendedor
10. Desativar vendedor, verificar que não consegue logar
11. Reativar vendedor

- [ ] **Step 2: Verificar compatibilidade mobile**

Abrir Chrome DevTools → Device Toolbar → iPhone SE, iPhone 12, iPad. Verificar:
- Navbar mobile visível
- Layout não quebra
- Toasts visíveis
- Modais centralizados
- Scroll suave

- [ ] **Step 3: Verificar performance**

```bash
# Verificar WAL mode
sqlite3 database/mercado.db "PRAGMA journal_mode;"
# Deve retornar: wal

# Verificar tamanho do banco
ls -lh database/mercado.db
```

- [ ] **Step 4: Ajustes finos**

- Verificar se `email_master` pode ser alterado via settings.php
- Verificar se `nome_vendedor` aparece nos detalhes do item
- Verificar scroll indicator nas listas
- Verificar ripple effect nos botões
- Verificar animações em todas as views

- [ ] **Step 5: Commit final**

```bash
git add -A
git commit -m "feat: marketplace com vendedores — testes e ajustes finais"
```

# Mercado — Catálogo Online (Warspear Online)

Catálogo web de itens do jogo Warspear Online, estilo loja/trading. Frontend vanilla JS SPA + backend PHP REST + SQLite. Tema visual escuro/dourado medieval com textura de fundo tileada e cantoneiras decorativas.

## Como rodar

```bash
# Backend (PHP built-in server na porta 8080) — usar router.php para segurança
php -S 127.0.0.1:8080 router.php

# Frontend — abrir index.html via Live Server (VS Code, porta 5500) ou direto no navegador (file://)
# O app detecta ambiente automaticamente (resolveApiBase):
#   - 127.0.0.1:5500 ou file:// → usa http://127.0.0.1:8080/api
#   - outros → usa 'api' (caminho relativo, espera mesmo domínio)
# Override manual: localStorage.setItem('API_BASE', 'http://...')
```

Banco SQLite em `database/mercado.db`. Criado automaticamente na primeira request (`config.php` → `initDB()`).

**IMPORTANTE:** Sempre use `router.php` como entrypoint do `php -S`. Ele bloqueia acesso direto a `mercado.db`, diretórios sensíveis (`.git`, `.claude`, `database/`) e arquivos `.db`. O `.htaccess` é ignorado pelo servidor embutido do PHP.

## Estrutura de arquivos

```
index.html                          # Shell SPA — <div id="app"> vazio + <nav class="mobile-nav"> + CSP meta tag
router.php                          # Roteador php -S: bloqueia acesso a .db, /database/, /.git/, /.claude/
api/
  config.php                        # Conexão PDO SQLite, initDB(), CORS, sessão, getSetting/setSetting, isAdmin/isSeller/isLoggedIn, maybeMigrateLegacyData
  routes.php                        # Middleware: rate limit (30 req/min), CSRF (verifyCsrfToken), security headers (CORS, nosniff, DENY frame)
  auth.php                          # ?action=login|logout|check|csrf — email+senha, tabela usuarios, hash bcrypt, papéis dono/vendedor
  categories.php                    # GET (tree=1|id=|nivel=|id_pai=), PUT (imagem_url por id, admin only, remove arquivo antigo)
  subcategories.php                 # GET ?category_id= — subcategorias por id_pai (nível 3)
  items.php                         # GET (id|subcategory_id|category_id|general_id|seller_id|search), POST/PUT/DELETE — admin ou seller (ownership)
  settings.php                      # GET/PUT — corner_image_url, whatsapp_number, email_master; PUT admin only, new_admin_password (bcrypt, min 6 chars)
  sellers.php                       # GET/POST/PUT/DELETE — CRUD de vendedores (admin only), desvincula itens no delete
  templates.php                     # GET ?search=|?id= — busca templates por nome (min 2 chars, LIMIT 50) ou detalhe por id
  seed_categories.php               # Aplica database/categories.seed.json no banco (upsert, transacional, idempotente)
  seed_templates.php                # GET admin only — importa templates de market_item_database_assets/items_market.sqlite (~2053 templates)
  seed_templates_cli.php            # CLI puro (sem web) — mesmo seed de templates + cópia de ícones PNG. Uso: php api/seed_templates_cli.php
  sync_wsdb.php                     # GET admin only — importa dados do wsdb.xyz (categorias, itens, ícones .webp)
css/
  style.css                         # 2204 linhas — tema escuro/dourado, CSS custom properties, responsivo, cantoneiras, accordion, modal, toast, showcase
  animations.css                    # Animações complementares (lazy-load via media="print" onload)
js/
  app.js                            # 220 linhas — bootstrap SPA (initializeApp, navigateTo, goBack, renderView), auth check, favorites, mobile nav
  api.js                            # 66 linhas — resolveApiBase, fetchJSON (CSRF, erro PHP detect), getCsrfToken, resolveImage
  components/
    utils.js                        # 85 linhas — escapeHtml, sanitizeItems, sanitizeCategoriesTree, formatCurrencyBRL, resolveBRLValue, fillSelect
    toast.js                        # 19 linhas — showToast(message, type, timeout)
    modal.js                        # 33 linhas — renderModal, closeModal, confirmModal (Promise-based)
    panel.js                        # 17 linhas — renderPanel(title, bodyHTML, footerHTML, showBack)
  views/
    home.js                         # Renderiza tela inicial
    categories.js                   # 127 linhas — ensureCategoryTree, prepareCategoryStructures, select/render de todos os níveis
    items.js                        # 265 linhas — loadItems, selectItem, renderItems, renderItemDetails (stats wsdb.xyz), whatsBuy
    admin.js                        # 1134 linhas — login, painel admin com sidebar/tabs, CRUD itens/vendedores, settings, template autocomplete
    seller.js                       # 321 linhas — painel vendedor, CRUD itens próprios, template autocomplete com categoryMap
database/
  categories.seed.json              # 16 categorias gerais + subcategorias aninhadas (3 níveis)
  mercado.db                        # SQLite (gerado automaticamente na primeira request)
images/
  cantoneira.png                    # Imagem decorativa de borda (cantoneira)
  fundo.png                         # Textura de fundo tileada
  uploads/                          # Uploads de imagem e ícones de template
  uploads/wsdb_categories/          # Ícones de categoria importados do wsdb.xyz
  uploads/templates/                # Ícones de template copiados do items_market.sqlite
.claude/
  settings.json                     # Configuração do Claude Code (modelo, API key)
.htaccess                           # Bloqueia acesso direto a config.php e /database/, desabilita directory listing
```

## Banco de dados

### Tabela `categorias`
Hierarquia de 3 níveis. `nivel`: 1=Geral, 2=Categoria, 3=Subcategoria. `id_pai` referencia o pai no mesmo nível ou acima. Índices em `id_pai` e `nivel`.

| Coluna | Tipo | Descrição |
|---|---|---|
| id | INTEGER PK | Auto increment |
| id_pai | INTEGER | FK → categorias.id (0 = raiz) |
| nome | TEXT | Nome da categoria |
| nivel | INTEGER | 1=Geral, 2=Categoria, 3=Subcategoria |
| imagem_url | TEXT | Caminho ou URL da imagem |

### Tabela `itens`
Referência a qualquer nível da hierarquia — apenas UM dos três campos de referência deve ser preenchido por item. Preços em moedas (int) e reais (float). Índices em `id_subcategoria`, `id_categoria`, `id_geral`, `id_vendedor`.

| Coluna | Tipo | Descrição |
|---|---|---|
| id | INTEGER PK | Auto increment |
| id_subcategoria | INTEGER | FK → categorias.id (nível 3) |
| id_categoria | INTEGER | FK → categorias.id (nível 2) |
| id_geral | INTEGER | FK → categorias.id (nível 1) |
| nome | TEXT | Nome do item |
| descricao | TEXT | Descrição |
| servidor | TEXT | Nome do servidor (opcional) |
| preco_moedas | INTEGER | Preço em moedas do jogo |
| preco_reais | REAL | Preço em reais (opcional) |
| quantidade_disponivel | INTEGER | Estoque |
| imagem_url | TEXT | Caminho ou URL da imagem |
| id_vendedor | INTEGER | FK → usuarios.id (dono do item, para vendedores) |
| id_template | INTEGER | FK → templates.id (template de atributos associado) |

### Tabela `configuracoes`
Chave/valor simples.

| Chave | Descrição |
|---|---|
| corner_image_url | Imagem das cantoneiras decorativas (default: ../images/cantoneira.png) |
| whatsapp_number | Número WhatsApp para compra (apenas dígitos, com DDI) |
| email_master | Email do administrador/dono (default: admin@mercado.local) |

### Tabela `usuarios`
Usuários do sistema com papéis. Senha hash bcrypt.

| Coluna | Tipo | Descrição |
|---|---|---|
| id | INTEGER PK | Auto increment |
| email | TEXT UNIQUE | Email de login |
| senha_hash | TEXT | Hash bcrypt da senha |
| papel | TEXT CHECK | 'dono' (admin) ou 'vendedor' (seller) |
| nome | TEXT | Nome de exibição |
| whatsapp | TEXT | Número WhatsApp do vendedor |
| ativo | INTEGER | 1 = ativo, 0 = desativado |
| senha_trocada | INTEGER | 0 = senha padrão, 1 = já trocada |
| criado_em | TEXT | Timestamp de criação |

Usuário dono padrão criado em `initDB()` se tabela vazia: email `admin@mercado.local`, senha `admin123`.

### Tabela `templates`
Templates de itens com atributos pré-definidos (importados do wsdb.xyz ou items_market.sqlite).

| Coluna | Tipo | Descrição |
|---|---|---|
| id | INTEGER PK | Auto increment |
| nome | TEXT | Nome do template |
| item_id | INTEGER | ID original do item no jogo |
| categoria | TEXT | Categoria do template |
| subcategoria | TEXT | Subcategoria do template |
| imagem_url | TEXT | Caminho do ícone |
| atributos | TEXT | Atributos em JSON (compacto) |
| atributos_detalhes | TEXT | Atributos detalhados em JSON (raw API) |
| nivel_min | INTEGER | Nível mínimo |
| nivel_max | INTEGER | Nível máximo |
| profissao | TEXT | Profissão requerida |
| rarity | INTEGER | Raridade (0=Comum a 5=Mítico) |
| origem | TEXT | Fonte dos dados ('wsdb' ou 'sqlite_seed') |

### Tabela `rate_limits`
Controle de taxa de requests por IP.

| Coluna | Tipo | Descrição |
|---|---|---|
| chave | TEXT PK | IP do cliente |
| contagem | INTEGER | Requests na janela atual |
| janela_inicio | INTEGER | Timestamp de início da janela (60s) |

## Fluxo de navegação (SPA)

```
home → general-categories → categories → subcategories → items → item-details
                                  │            │
                                  └──→ items ──┘  (pula nível se não houver categorias/subcategorias)
```

- **home**: dois botões — "Procurar no mercado" e "Painel Administrativo"
- **general-categories**: grid de 16 categorias gerais com ícones e contagem de itens
- **categories**: grid de categorias (nível 2) + opção "Itens sem categoria" se houver itens diretos no nível geral
- **subcategories**: grid de subcategorias (nível 3) com contagem de itens
- **items**: lista de itens com nome, ícone, preço (moedas + R$), coração de favorito. Cada item tem `selectItem()` para detalhes
- **item-details**: showcase completo — imagem grande, breadcrumb de categoria, stats do wsdb.xyz (raridade, nível, 4 bônus, skills, set bonuses), preços, vendedor, servidor, botão "Comprar no WhatsApp", quantidade disponível
- **admin-login**: campos de email + senha, botão Entrar
- **admin-panel**: sidebar com tabs (Dashboard, Itens, Categorias, Vendedores, Config) — CRUD completo, métricas, template autocomplete
- **seller-panel**: painel do vendedor com stats, busca, CRUD de itens próprios, template autocomplete com mapeamento de categorias

Estado global em `APP_STATE`:
```js
currentView, currentUser {id, nome, papel, isLoggedIn},
isAdmin (getter → currentUser.papel === 'dono'),
currentGeneralId, currentCategoryId, currentSubcategoryId,
currentItemId, viewingGeneralRootItems, generalCategories, categoriesLevel2,
categoriesLevel3, categoryIndex (Map), categoryTree, itemsList, allItems, settings
```

Estado admin em `ADMIN_STATE`:
```js
activeTab: 'dashboard'  // uma de: dashboard, items, categories, sellers, settings
```

## API — Endpoints

| Endpoint | Método | Auth | Descrição |
|---|---|---|---|
| auth.php?action=login | POST/GET | Não | Login com email+senha. Fallback POST→GET se 405. Retorna `{success, papel, nome, id, senha_trocada}` |
| auth.php?action=logout | POST | Não | Destroi sessão |
| auth.php?action=check | GET | Não | Retorna `{is_admin, is_seller, is_logged_in, papel, nome, id}` |
| auth.php?action=csrf | GET | Não | Retorna `{csrf_token}` (32 bytes hex) |
| categories.php?tree=1 | GET | Não | Árvore completa de categorias (aninhada, `buildCategoryTree()`) |
| categories.php?nivel=&id_pai= | GET | Não | Categorias filtradas por nível/pai |
| categories.php | PUT | admin | Atualiza imagem_url de categoria `{id, imagem_url}`, remove arquivo antigo |
| subcategories.php?category_id= | GET | Não | Subcategorias (nível 3) de uma categoria pai. Ordenado por nome |
| items.php | GET | Não | Todos os itens (com JOINs resolvendo nomes, vendedor, template) |
| items.php?id= | GET | Não | Item único |
| items.php?subcategory_id= | GET | Não | Itens por subcategoria |
| items.php?category_id= | GET | Não | Itens por categoria (usa COALESCE para cobrir via sub também) |
| items.php?general_id= | GET | Não | Itens por categoria geral (OR: id_geral direto OU resolvido) |
| items.php?seller_id= | GET | Não | Itens de um vendedor específico |
| items.php?search= | GET | Não | Busca textual (min 2 chars, LIKE %term%, LIMIT 100) |
| items.php | POST | admin/seller | Criar item. Seller tem id_vendedor forçado. Lógica de nível: sub > cat > geral |
| items.php | PUT | admin/seller | Atualizar item. Seller só edita itens próprios (ownership check) |
| items.php | DELETE | admin/seller | Deletar item `{id}`. Seller só exclui itens próprios |
| sellers.php | GET | admin | Lista vendedores com contagem de itens |
| sellers.php | POST | admin | Cria vendedor (nome, email, senha 6+ chars). Email único (409 se duplicado) |
| sellers.php | PUT | admin | Atualiza vendedor (nome, email, whatsapp, ativo, nova_senha). Email único |
| sellers.php | DELETE | admin | Exclui vendedor. Desvincula itens primeiro (id_vendedor = NULL) |
| templates.php | GET | Não | Lista templates (limit 20, max 50) ou `?search=` (min 2 chars, COLLATE NOCASE) |
| templates.php?id= | GET | Não | Detalhe do template com atributos decodificados |
| settings.php | GET | Não | Retorna `{corner_image_url, whatsapp_number}` (email_master só admin) |
| settings.php | PUT/POST | admin | Salva corner_image_url, whatsapp_number, email_master. new_admin_password exige current_password + bcrypt, min 6 chars |
| seed_categories.php | GET | admin | Aplica seed do JSON no banco (upsert idempotente, transacional) |
| seed_templates.php | GET | admin | Importa ~2053 templates do items_market.sqlite com categorização por regex |
| sync_wsdb.php | GET | admin | Importa categorias/itens do wsdb.xyz (set_time_limit 600s, streaming flush) |

## Autenticação

Sistema de papéis com tabela `usuarios`. Sessão PHP padrão.

**Papéis:**
- `dono` — administrador completo (isAdmin = true)
- `vendedor` — vendedor com acesso restrito (isSeller = true): gerencia apenas seus próprios itens

**Usuário dono padrão:** email `admin@mercado.local`, senha `admin123` (constante `ADMIN_PASSWORD` em `config.php`). Criado em `initDB()` se tabela `usuarios` vazia.

**Fluxo de login:**
1. Extrai credenciais de JSON body, form-urlencoded, POST vars ou REQUEST (`extractCredentials()`)
2. Busca usuário por email em `usuarios`
3. `password_verify()` contra `senha_hash` (bcrypt)
4. Verifica campo `ativo` (403 se desativado)
5. `session_regenerate_id(true)` — previne session fixation
6. Seta `$_SESSION['usuario_id']`, `usuario_papel`, `usuario_nome`, `is_admin`

**Verificações (funções em config.php):**
- `isAdmin()` → `$_SESSION['is_admin'] === true`
- `isSeller()` → `$_SESSION['usuario_papel'] === 'vendedor'`
- `isLoggedIn()` → `$_SESSION['usuario_id'] > 0`
- `getCurrentUserId()` → `(int)$_SESSION['usuario_id']`

**CSRF:** token gerado via `auth.php?action=csrf`, enviado no header `X-CSRF-Token` em todos POST/PUT/DELETE. Verificado por `routes.php` (exceto GET/OPTIONS).

**Rate limit:** 30 req/min por IP via tabela `rate_limits`, gerenciado por `routes.php`. Falha no rate limit não bloqueia (try/catch silencioso).

**Alteração de senha:** `settings.php` com `new_admin_password` (min 6 chars). Gera bcrypt, salva em `usuarios.senha_hash` (dono) + `configuracoes` (compatibilidade legada). Seta `senha_trocada = 1`.

## Categorias (Seed — categories.seed.json)

16 categorias gerais, ~70 subcategorias no total:

| Categoria Geral | Subcategorias |
|---|---|
| Baús | — |
| Pacotes de Iniciante | — |
| Armas | Adagas, Espadas (1M/2M), Machados (1M/2M), Maças (1M/2M), Lanças, Escudos, Cajados, Arcos, Bestas |
| Armadura | Tecido/Leve/Pesada (Cabeça, Tronco, Mãos, Cintura, Pernas cada) |
| Acessórios | Braceletes, Capotes, Anéis, Amuletos |
| Aprimoramentos | Runas, Cristais, Amplificação |
| Consumíveis | Alimento, Poções, Poções comuns, Poções milagrosas, Pergaminhos, Pergaminhos comuns, Pergaminhos milagrosos, Artefatos, Poções de Vida |
| Utilidades | — |
| Lacaios | — |
| Relíquias | Aprimoramento, Ataque, Defesa, Grupo |
| Livros de Habilidade | — |
| Visuais Decorativos | Armas 1M, Armas 2M, Cajados, Arcos, Bestas, Escudos, Pergaminho da Purificação |
| Trajes Luxuosos | — |
| Sorrisos | — |
| Recursos | Substâncias, Essências, Catalizadores, Recursos de Artesanato, Recursos de Castelo |
| Saquear | — |

Ícones em `images/uploads/wsdb_categories/{id}.webp`.

## Funcionalidades principais

### Loja (usuário)
- Navegação hierárquica em 3 níveis com contagem de itens por categoria
- Pulo automático de níveis vazios (ex: se categoria não tem subcategorias, vai direto pra itens)
- "Itens sem categoria": itens vinculados diretamente ao nível geral aparecem como linha especial
- Detalhes do item com showcase completo: imagem grande, breadcrumb, stats do wsdb.xyz (raridade, nível, atributos, skills, set bonuses)
- Preço em moedas + R$ lado a lado com ícones distintos
- **Compra via WhatsApp**: botão abre `https://wa.me/<numero>?text=Olá! Tenho interesse no item "..."` — prioriza número do vendedor, fallback para número global
- Preço em R$: usa `preco_reais` se preenchido, senão converte moedas × 0.0001 (`COIN_TO_BRL`)
- **Favoritos**: coração em cada item, salvo em `localStorage.favorites` (array de IDs)

### Painel Admin (dono)
- **Dashboard**: métricas (total itens, vendedores, categorias, subcategorias, imagens), ações rápidas, últimos 5 itens
- **Itens**: CRUD completo com filtros em cascata (Geral → Categoria → Subcategoria), busca textual, modal com template autocomplete (debounce 300ms, teclas de seta, auto-preenchimento de categoria)
- **Categorias**: três seções (Categorias Gerais, Categorias por Geral, Subcategorias com breadcrumb), upload de imagem por arquivo
- **Vendedores**: CRUD completo, toggle ativo/inativo, desvincula itens ao excluir
- **Config**: URL da cantoneira, número WhatsApp, email master, alteração de senha (min 6 chars, confirmação)

### Painel Vendedor (seller)
- Stats cards: total de itens, itens com ícone, itens sem preço
- Busca textual nos próprios itens
- CRUD de itens com template autocomplete e mapeamento de categorias (hardcoded `categoryMap`)
- Retry logic para cascata de selects (setTimeout recursivo até 3 tentativas)
- Acesso restrito: `APP_STATE.currentUser.papel === 'vendedor'`

### Template Autocomplete
- Input de busca com debounce 300ms (min 2 caracteres)
- Dropdown com ícone, nome e categoria do template
- Navegação por teclas (ArrowDown/ArrowUp/Enter)
- Fechamento ao clicar fora
- Admin: `findTemplateCategoryPath()` com normalização NFD e matching difuso por nome
- Seller: `categoryMap` hardcoded com fallback para matching parcial de string

### Tema visual (CSS)
- 8 CSS custom properties em `:root`: `--bg-url`, `--img-w`, `--img-h`, `--tile-scale-body`, `--tile-scale-panel`, `--gold`, `--gold-border`, `--orange`, `--row-default`, `--row-selected`, `--corner-image`, `--vh`
- Textura de fundo tileada com escala configurável por variável CSS
- Painel central com cantoneiras decorativas nos cantos superiores
- Cores douradas (`#ffd700`, `#d4af37`, `#d46a2e`)
- Seleção de linha com destaque azulado (`rgba(38,52,95,0.32)`)
- Toast notifications (info/success/error) — container fixo no topo
- Modal overlay (z-index 9999) com clique fora para fechar, confirmModal Promise-based
- Accordion com chevron animado (rotação 90deg) para cards de categoria no admin
- Sidebar admin (220px + workspace 1fr) com navegação por tabs e métricas em grid
- Item showcase 3-colunas (visual card, spec section, buy card)
- Login glassmorphism (backdrop-filter blur, box-shadow animado)
- Mobile nav (3 botões: Home, Categorias, Scroll top) — hidden em desktop, visível ≤768px
- Ripple effect global em todos os botões
- Correção de viewport para iOS Safari (`--vh` dinâmico)
- Responsivo: 5 breakpoints (940px, 900px, 768px, 760px, 480px/460px)
- Scrollbar customizada (dark track, gold thumb)
- Indicador de scroll no fim da lista (`has-scroll`)

## Padrões e comportamentos importantes

- `fetchJSON()`: detecta PHP não executado (conteúdo `<?php` no response), erro 405, Content-Type não-JSON, injeta header CSRF em mutações
- `doLogin()`: fallback POST→GET se servidor retorna 405 (hosts que bloqueiam POST)
- `resolveApiBase()`: adapta URL da API conforme ambiente (Live Server vs file:// vs produção), com override via `localStorage.API_BASE`
- `resolveBRLValue()`: preço em R$ usa `preco_reais` se >0, senão converte `preco_moedas × 0.0001`
- `resolveImage()`: fallback para placeholder se URL vazia
- `sanitizeItems()` / `sanitizeCategoriesTree()`: normalização de tipos (Number, String) e defaults; `sanitizeItems` lida com `categoria_id`/`id_categoria` e `geral_id`/`id_geral`
- `fetchItemsWithRelations()` (PHP): JOIN complexo — itens LEFT JOIN categorias 3× (sub, cat, geral) + usuarios (vendedor) + templates. COALESCE para resolver categoria/geral via subcategoria
- `buildCategoryTree()` (PHP): converte flat rows em árvore aninhada por `id_pai`
- `prepareCategoryStructures()` (JS): achata árvore aninhada em arrays planos com FK (`geral_id`, `categoria_id`) + Map `categoryIndex`
- `maybeMigrateLegacyData()`: converte tabelas antigas (`categories`, `subcategories`, `items`) para novo esquema de 3 níveis (nível 1=antiga category, nível 2="Coleções", nível 3=antiga subcategory)
- `seed_categories.php`: upsert idempotente — se categoria já existe por nome+nivel+id_pai, reusa; se imagem mudou, atualiza. Transacional
- Ao trocar imagem de categoria, arquivo antigo é removido do disco (se for em `images/uploads/`, regex + `@unlink`)
- CSS: `--vh` corrigido via JS (`updateViewportUnit()`) no resize e load para iOS Safari
- Background texture: fallback para gradiente escuro se imagem inacessível (`ensureBackgroundTexture()`)
- SPA: todas as funções de navegação expostas no `window` para `onclick` inline
- `subcategories.php`: agora usa `routes.php` (corrigido — antes usava `config.php` direto, sem CSRF/rate limit)
- `admin.js`: duplicatas removidas. `renderAdminLogin` antiga (glassmorphism) deletada, versao brand-style "Acesso restrito" e a unica ativa. Demais funcoes (`renderAdminPanel`, `renderAdminDashboard`, `renderAdminCategories`, `switchAdminTab`) foram unificadas em sessoes anteriores.
- Stats do wsdb.xyz: `formatTemplateStatValue()` detecta percentual via bitmask (`params` bit 0 = %, bit 16 = div 100 senão div 10), ícones em `https://wsdb.xyz/icons/<icon>.webp`
- WhatsApp: `buildWhatsAppLink()` prioriza `vendedor_whatsapp` do item, fallback para `settings.whatsapp_number`, retorna null se nenhum
- Seed templates CLI: `seed_templates_cli.php` é script standalone (sem web), conecta SQLite direto, copia ícones PNG. Uso: `C:\xampp\php\php.exe api\seed_templates_cli.php`
- `resolveImage()`: agora escapa HTML automaticamente (`escapeHtml()`) na URL retornada — previne XSS via `imagem_url` maliciosa com `onerror` injection
- `fetchJSON()`: em produção (`CONFIG.API_URL === 'api'`), não vaza conteúdo da resposta PHP em mensagens de erro (previne leak de código fonte/stack traces)

## Segurança

Medidas implementadas para hardening do sistema em produção.

### Proteção contra XSS (Cross-Site Scripting)
| Camada | Onde | O que faz |
|---|---|---|
| HTML escaping | `escapeHtml()` em `js/components/utils.js` | Escapa `<>"\'&` em todo texto inserido no DOM |
| URL escaping | `resolveImage()` em `js/api.js` | Escapa `imagem_url` antes de inserir em atributo `src` |
| CSP | `<meta>` em `index.html` | `default-src 'self'; script-src 'self' 'unsafe-inline'; frame-src 'none'; object-src 'none'` |
| CSP headers | `routes.php` `sendSecurityHeaders()` | Headers complementares: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` |

### Proteção contra CSRF (Cross-Site Request Forgery)
| Camada | Onde | O que faz |
|---|---|---|
| Token CSRF | `routes.php` | Token 32 bytes hex via `generateCsrfToken()`, verificado em POST/PUT/DELETE |
| Header dedicado | `js/api.js` `fetchJSON()` | Envia token via `X-CSRF-Token` header |
| SameSite cookie | `config.php` | Cookie de sessão com `SameSite=Lax` |
| Todos endpoints | `routes.php` | Incluído por todos endpoints exceto legados |

### Proteção contra Brute Force
| Camada | Onde | O que faz |
|---|---|---|
| Lockout por email | `auth.php` | Tabela `login_attempts`: 5 falhas = bloqueio de 15 minutos |
| Rate limit global | `routes.php` | 30 req/min por IP via tabela `rate_limits` |
| Senha bcrypt | `config.php`, `auth.php`, `sellers.php` | `password_hash(PASSWORD_DEFAULT)` com custo adaptativo |
| Senha atual exigida | `settings.php` | Troca de senha requer `current_password` válido |

### Proteção de Dados
| Camada | Onde | O que faz |
|---|---|---|
| `email_master` oculto | `settings.php` GET | Só retorna `email_master` se `isAdmin()` |
| `mercado.db` bloqueado | `router.php` | Bloqueia acesso HTTP a arquivos `.db` |
| Path traversal | `categories.php` PUT | `realpath()` verifica que arquivo a deletar está dentro de `images/uploads/` |
| Erro interno genérico | `js/api.js` `fetchJSON()` | Em produção, não vaza corpo da resposta PHP |
| Email validado | `sellers.php` POST/PUT | `filter_var($email, FILTER_VALIDATE_EMAIL)` |
| Sessão segura | `config.php` | `HttpOnly` (impede `document.cookie`), `Secure` em produção (HTTPS only), `SameSite=Lax` |
| `.htaccess` | Raiz | Bloqueia acesso a `config.php` e `/database/` (Apache). `router.php` cobre `php -S` |

### Proteção contra DOS
| Camada | Onde | O que faz |
|---|---|---|
| LIMIT em busca | `items.php` search | LIMIT 100 na busca textual |
| Rate limit | `routes.php` | 30 req/min por IP |
| Timeout seeds | `seed_templates.php`, `sync_wsdb.php` | `set_time_limit(300)` e `set_time_limit(600)` |
| seed_categories auth | `seed_categories.php` | Requer `isAdmin()` (antes era público) |

### CORS
| Ambiente | Comportamento |
|---|---|
| Local (`127.0.0.1`, `localhost`, `file://`) | `Access-Control-Allow-Origin: *` (dev) |
| Produção | Restrito à origem da requisição (`HTTP_ORIGIN` ou `HTTP_HOST`) |

### Checklist pré-deploy
- [ ] Trocar senha padrão `admin123` no painel admin → Config
- [ ] Trocar email `admin@mercado.local` se necessário
- [ ] Verificar HTTPS ativo (necessário para `Secure` cookie)
- [ ] Rodar `php -S` com `router.php` (nunca `-t .` sozinho)
- [ ] Configurar CSP se domínio de produção difere de `self`
- [ ] Remover/Criptografar `ANTHROPIC_AUTH_TOKEN` de `.claude/settings.json` se o diretório for deployado

## Atualizacao de contexto - 2026-06-29

Rodada focada em corrigir bugs visuais e alinhar o mercado ao estilo do jogo/WSDB.

- Categorias raiz visiveis atualizadas para 16 entradas oficiais do catalogo: Baus, Saquear, Pacotes de iniciante, Armas, Armadura, Acessorios, Aprimoramentos, Consumiveis, Utilidades, Lacaios, Recursos, Reliquias, Livros de habilidade, Visuais decorativos, Sorrisos e Trajes luxuosos.
- A UI continua no estilo vertical do mercado original do jogo, nao no grid do WSDB. O WSDB e usado como fonte de dados, imagens e organizacao.
- Conversao correta de moedas mantida em `CONFIG.COIN_TO_BRL = 0.0001`: 1.000 moedas = R$ 0,10 e 100.000 moedas = R$ 10,00. Exemplo: 66.666 moedas -> R$ 6,67.
- `images/uploads/gold_coin.png` e o icone padrao de moeda em listas, admin, vendedor e detalhe do item.
- Precos em gold usam numero amarelo com contorno preto e moldura escura compacta. A moeda fica separada/fora da moldura, como no mercado do jogo.
- Formulario de item do admin ficou automatico: o usuario escolhe o template, e nome/categoria/imagem vem do template. Campos principais: estoque, servidor, preco moedas, preco R$ e descricao.
- Painel de vendedor foi simplificado no mesmo sentido: classificacao manual fica escondida para a API, e o vendedor preenche somente item, estoque, servidor, precos e descricao.
- Servidores agora sao dropdown fixo em `GAME_SERVERS`: BR-Tourmaline, US-Sapphire, EU-Emerald, SEA-Pearl, RU-Amber, RU-Topaz e RU-Ruby.
- Lista de itens do admin/vendedor e do comprador usa moldura WSDB (`images/wsdb_slot_frame.png`), nivel no canto do item, cor de raridade no nome e preco a direita.
- Visualizacao de trajes usa `api/texture.php` como proxy local para texturas WSDB e monta o personagem em canvas com partes `body`, `hands`, `legs`, `head`, `helmet`, `cape`, `hair` e `ears`.
- A visualizacao de trajes agora tem selecao de raca/genero para evitar traje parecer incompleto quando renderizado numa base fixa.
- Hover com atributos foi removido da logica visivel; atributos ficam integrados ao item/autocomplete/detalhe, com icones oficiais.
- `index.html` usa favicon `images/uploads/gold_coin.png`, evitando 404 em `favicon.ico`.
- Limpeza feita em `admin.js`: blocos duplicados antigos de `renderAdminPanel`, `renderAdminDashboard`, `renderAdminCategories` e `switchAdminTab` foram removidos. `renderLastItemsList` foi preservado porque a dashboard moderna usa.
- Verificacao: `node --check` passou em `utils.js`, `categories.js`, `items.js`, `admin.js` e `seller.js`. `php -l` nao rodou nesta sessao porque `php` nao esta no PATH atual.
- Validacao visual via Playwright: categorias novas aparecem; admin abre sem mojibake; modal de novo item mostra servidor dropdown; detalhe de traje renderizou canvas com pixels visiveis; console ficou sem erros apos favicon.

## Atualizacao de contexto - 2026-06-29 (tarde)

Rodada de correcoes, refatoracao e auditoria de seguranca.

### Traje Rendering — Correcao do "meio traje"

**Problema:** Canvas 36x42px. Coordenadas `WSDB_TEXTURES` tinham `x2` negativos nos pares simetricos (LEGS, HAND, SHOULDER, EARS), fazendo lado esquerdo e direito se sobreporem ou cairem fora do canvas. Alem disso, `base = 2*race-1-gender` resultava em 0 para Humano Feminino, e `loadWsdbTexture` rejeita `!id`, fazendo corpo/cabeca sumirem.

**Correcoes aplicadas:**
- Historico obsoleto: ajuste intermediario de `WSDB_TEXTURES` foi substituido pelas coordenadas oficiais WSDB listadas no fim deste arquivo.
- `base = Math.max(1, 2*race-1-gender)` — previne id=0
- HAIR sempre desenhado (nao mais condicional `render!==0`). Usa `rawAttrs.render` como hairId ou fallback `base`
- EARS: raças nao-elficas usam `base` em vez de 0 (orelhas ficam visiveis com skin correta)
- HEAD usa `base` corrigido (≥1)

### API Endpoints adicionados a documentacao

| Endpoint | Metodo | Auth | Descricao |
|---|---|---|---|
| auth.php?action=change-password | POST/PUT | logado | Troca senha do usuario atual. Exige `current_password` + `new_password` (min 6 chars) |
| texture.php?part=&id=&file=&format= | GET | Nao | Proxy de texturas WSDB. Partes: head/body/hands/legs/hair/helmet/ears/cape/1-hand/2-hand/shield/bow/crossbow. Cache 7 dias |

### Constantes e dados globais

**`js/components/utils.js`:**
- `GAME_SERVERS`: `['BR-Tourmaline','US-Sapphire','EU-Emerald','SEA-Pearl','RU-Amber','RU-Topaz','RU-Ruby']`

**`js/views/items.js` — Traje rendering:**
- `WSDB_SKINS`: mapas de troca de cor de pele por raca (HUMAN, MOUNTAIN, ELF, DEAD). Cada entrada: `{s: cor_origem, d: cor_destino}`
- `WSDB_SKIN_BY_RACE`: indice `{1: HUMAN, 2: MOUNTAIN, 3: ELF, 4: DEAD}`
- `WSDB_TEXTURES`: mapeamento de partes para texturas WSDB `[part, file, {coords}]` usando coordenadas oficiais do bundle WSDB. Estado atual: canvas interno `36x42`, sem origem central/translacao.
- `OUTFIT_CW/OUTFIT_CH`: constantes do canvas de renderizacao (`36x42`).
- Dimensoes reais das texturas WSDB (medidas): base body 12×13, head 12×13, legs 7×14, hands 7×12, hair 16-19×14-23, costume body ate 14×21, helmet ate 21×30, cape ate 20×24, shoulder ate 12×15.
- Head textures (headD.webp) existem APENAS para IDs de skin base (1-8), NAO para IDs de traje. Trajes usam head base + helmet overlay.
- Ears texture (ears_front.webp) nao existe no servidor WSDB — drawTexture silenciosamente pula quando load falha.

**Pipeline de renderizacao de traje (`itemType===19 && render!=null`):**
1. `texture.php` faz proxy `wsdb.xyz/textures/{part}/{id}/{file}.webp` com cache 7d
2. `loadWsdbTexture()` carrega como Image (retorna null se !id ou load falhar)
3. `tintWsdbImage()` aplica shift de cor (pula se color==8421504=cinza/sem tint)
4. `drawTexture()` desenha no buffer `36x42` nas coordenadas oficiais do WSDB.
   - Partes simetricas (LEGS/HAND/SHOULDER/EARS): `scale(-1,1)` para lado esquerdo, normal para direito.
   - canvas x = cx - x1 (mirrored) | canvas x = cx + x2 (normal)
5. `replaceSkinColors()` troca cores de pele origem→destino (raca) no canvas inteiro
6. CSS escala para `width:180px; height:210px; image-rendering:pixelated`

**Ordem de camadas (fundo→frente):** CAPE → LEGS → BODY → SHOULDER → HAND → EARS → HEAD → HAIR → HELMET

**Sistema de coordenadas (reescrito 2026-06-29 tarde):**
- Historico obsoleto: nao usar canvas 72x108 com `ctx.translate(36, 54)`; o estado atual fiel ao WSDB usa canvas `36x42`.
- Coordenadas atuais ficam na seção "Ajuste de render WSDB fiel - 2026-06-29" e no objeto `WSDB_TEXTURES` de `js/views/items.js`.

### Bugs PHP Corrigidos

- **Coluna `atributos_detalhes` inexistente:** Adicionada ao `CREATE TABLE templates` em `initDB()` + migracao ALTER TABLE para bancos existentes. Tambem adicionadas migracoes para `nivel_max`, `profissao`.
- **`sync_wsdb.php` salvando dados incompletos:** INSERT agora inclui `item_id`, `atributos` (JSON com level/color/itemType/render/profession), `nivel_max`, `profissao`, `rarity` (int), `origem='wsdb'`.
- **`rarity` como string:** Coluna alterada para INTEGER no schema. `sync_wsdb.php` salva `$color` diretamente como int.
- **`mapCategory()` unificado:** `seed_templates.php` e `seed_templates_cli.php` usam `api/template_category_map.php`, incluindo "Saquear"/"Despojo".
- **`rate_limits` DDL movido para `initDB()`:** `CREATE TABLE IF NOT EXISTS` estava em `routes.php` executando a cada request. Removido de la.

### Seguranca — Correcoes

- **PDO path leak:** `getDB()` agora retorna erro generico em producao. Path do SQLite vai para `error_log()`, nao para o response.
- **CORS production:** Substituido `HTTP_ORIGIN` direto (spoofable) por whitelist: `[$requestHost, www.$requestHost]`. Verifica com `in_array()`.
- **CSRF token:** Removido fallback `$_POST['csrf_token']`. So aceita header `X-CSRF-Token`.
- **WAL/SHM bloqueados:** `router.php` regex atualizada de `/\.db$/i` para `/\.db(-wal|-shm)?$/i`.
- **`admin123` no fonte:** Documentado no checklist pre-deploy. Nao removido do codigo (necessario para primeiro setup), mas `senha_trocada` flag forca alteracao no primeiro login.

### CSS — Limpeza

-Removidos ~230 linhas de CSS admin antigo (`.admin-login`, `.admin-tabs`, `.admin-tab`, `.admin-toolbar`, `.admin-actions`) ja sobrescritos pelo ADMIN MODERNO.
- `.admin-button` (compartilhado) mantido como base; moderno sobrescreve com regras especificas.
- Accordion chevron duplicado removido do `animations.css` (ja existe em `style.css`).

### JS — Limpeza

- `renderAdminLogin` duplicada removida (linhas 7-34 antigas). Versao linha ~860 mantida (brand-style "Acesso restrito").
- Strings de UI com encoding quebrado em `seller.js`, `items.js`, `categories.js` e `sellers.php` foram corrigidas.
- `admin.js`: encoding de comentarios corrigido (`â€"→—`, `obrigatória`, `Variáveis`, `edição`).

### Ajuste complementar - 2026-06-29

- Ordem do catalogo corrigida para bater com o print do mercado do jogo: Baus, Pacotes de iniciante, Armas, Armadura, Acessorios, Aprimoramentos, Consumiveis, Utilidades, Lacaios, Reliquias, Livros de habilidade, Visuais decorativos, Trajes luxuosos, Sorrisos, Recursos, Saquear.
- Historico obsoleto: nao usar bbox/crop/centralizacao automatica no preview de trajes; o estado atual copia o buffer `36x42` sem auto-fit.
- Cache de texturas WSDB e cache de tint foram adicionados em `items.js` para reduzir o tempo de carregamento/re-render do traje.
- Chamada de textura de orelhas foi limitada a raca Elfo para evitar 404 e deixar o console limpo.
- Validacao: `node --check js/views/items.js js/views/categories.js`; Playwright confirmou ordem do catalogo, canvas 96x128 com margens livres e console sem erros.

### Ajuste de render WSDB fiel - 2026-06-29

- A rotina real do WSDB esta no bundle `wsdb_data/chunks/380.js`, modulo `2766`.
- O preview de traje deve usar canvas interno `36x42`, nao canvas grande com origem centralizada e auto-fit.
- Coordenadas oficiais WSDB:
  - HEAD `head/headD`: `{x:6,y:3}`
  - BODY `body/bodyD`: `{x:6,y:11}`
  - CAPE `cape/cloakD`: `{x:3,y:11}`
  - HAIR `hair/hairD`: `{x:3,y:-3}`
  - HELMET `helmet/helmetD`: `{x:-1,y:-20}`
  - LEGS `legs/leg_d4`: normal `{x:13,y:22}`, mirrored `{x:-13,y:22}`
  - HAND `hands/handD1`: normal `{x:1,y:13}`, mirrored `{x:-25,y:13}`
  - SHOULDER `body/shoulderD1`: normal `{x:-2,y:4}`, mirrored `{x:-28,y:4}`
  - EARS `ears/ears_front`: normal `{x:16,y:6}`, mirrored `{x:-10,y:6}`
- Nao usar bbox/crop/centralizacao automatica no personagem; isso muda a escala e a pose. Desenhar no buffer 36x42, trocar cores de pele e copiar 1:1 para o canvas final; CSS faz apenas a ampliacao pixelada.
- Fonte local dos numeros: `fonts/press-start-2p.ttf`, aplicada via `--number-font` em `style.css`. Precos e badges numericos devem ficar menores e com molduras quadradas (`border-radius:0`).

### Estado atual validado - 2026-06-29

- `api/template_category_map.php` é a única fonte para categorização de templates. `seed_templates.php` e `seed_templates_cli.php` devem usar `mapCategory()` desse helper, sem duplicar regex.
- O mapeador aceita nomes e labels com ou sem acento para casos comuns como `Poção/Pocao`, `Baú/Bau`, `Saquear` e `Despojo`. Os padrões com `Ã` no helper são intencionais para cobrir dados legados/mojibake.
- `api/texture.php` aceita `fallback=empty`; nesse modo, textura WSDB ausente retorna PNG transparente 1x1 com HTTP 200. O renderer de traje usa esse fallback para manter o console limpo quando uma parte opcional do WSDB não existe.
- Render fiel WSDB permanece em `js/views/items.js`: canvas interno `36x42`, coordenadas oficiais do bundle WSDB, sem auto-fit/bbox. CSS escala `.outfit-canvas` para `180x210` com `image-rendering: pixelated`.
- Layout do detalhe do item deve ficar centralizado: smoke validado com `panelCenterDelta = 0` em viewport `1280x900`.
- Fonte pixelada local (`fonts/press-start-2p.ttf`) deve ser usada só em valores monetários (`.item-price-card strong`, `.market-ad-price strong`). Badges de quantidade/nível continuam com fonte antiga (`Arial Black`/Impact).
- Moeda de gold usa `images/uploads/gold_coin.png` como sprite, `background-position: left top`, `background-size: 188.235% 188.235%`. Ícone validado em `36x36`, área dourada visível `32x32`, sem corte.
- Validação desta rodada:
  - `C:\xampp\php\php.exe -l` em todos os arquivos `api/*.php`
  - `node --check` em todos os arquivos `js/**/*.js`
  - Puppeteer em `http://127.0.0.1:8080/`, item `1902` (`Traje azul do apanhador de serpentes`): sem 4xx, sem erro de console, canvas com 596 pixels visíveis, moeda sem corte.

## Atualizacao de contexto - 2026-06-30

Rodada de UI: substituicao de botoes de autenticacao por imagens e correcao da ribbon ESGOTADO.

### Botoes de autenticacao — imagens no lugar de botoes retangulares

- **Antes:** botoes `.home-auth-icon` com fundo escuro, borda dourada, icone generico + texto "Entrar"/"Cadastrar".
- **Depois:** botoes `.auth-image-button` transparentes, sem fundo/borda/padding, com imagens `images/login.png` e `images/Criarconta.png`.
- CSS novo em `style.css` (linha ~5958): `.auth-image-button` com `background:transparent; border:none; padding:0; display:block; width:100%`. Imagem com `max-width:160px; height:auto` centralizada. Hover: `translateY(2px) scale(0.98)` + `brightness(1.08)`. Active: `translateY(5px) scale(0.95)` + `brightness(0.92)`.
- HTML em `js/views/home.js` (linha ~119): container `.home-auth-icons` (grid 2 colunas) com `<button class="auth-image-button" onclick="showQuickLogin()">` contendo `<img>` puro, sem span de texto.
- Container `.home-auth-icons` ficou com `background: transparent` (era `rgba(0,0,0,0.18)`). Bordas e painel escuro removidos.
- Logica de autenticacao inalterada: ambos botoes chamam `showQuickLogin()` que navega para `quick-login`.
- Imagens em `images/login.png` e `images/Criarconta.png` (raiz `images/`, nao `images/uploads/`).

### Ribbon ESGOTADO — sobreposicao correta da moldura dourada

**Problema inicial (2026-06-30 manha):** Tres blocos CSS conflitantes para `.esgotado-badge`. `.item-esgotado .esgotado-badge` (especificidade alta) sobrescrevia `z-index:20` com `z-index:5`.

**Correcao inicial:** Blocos 1 e 2 removidos. Bloco 3 consolidado com `z-index:50` e `overflow:visible` em `.market-ad-icon`.

**Problema persistente:** Ribbon ainda parecia "preso" dentro da area do icone. Causa raiz: `.esgotado-badge` era filho DOM de `.market-ad-icon` (72x72px). Mesmo com `overflow:visible`, o badge pintava dentro do contexto do icone, parecendo contido pela moldura.

**Correcao estrutural (2026-06-30 tarde):**
- **DOM (`items.js:361`):** `${soldOutOverlay}` movido para FORA de `.market-ad-icon`, agora primeiro filho de `.game-market-row` (que tem `position:relative`).
- **CSS:** `.esgotado-badge` reposicionado: `position:absolute; top:4px; left:-4px; transform:rotate(-18deg); transform-origin:left top; z-index:100`. Badge agora flutua no stacking context do `.panel`, acima de tudo no card.
- **Mobile:** `top:2px; left:-6px; transform:rotate(-16deg); font-size:11px`.
- Moldura `wsdb_slot_frame.png` permanece como `background-image` de `.market-ad-icon` — badge agora cruza a borda dourada como selo diagonal no canto superior esquerdo.
- `.list` tem `overflow-x:hidden` mas badge nao cruza borda esquerda (rotaciona para direita/cima a partir do canto).
- `.panel` tem `overflow:hidden` mas badge fica bem dentro da area visivel do painel.

### Arquivos alterados

| Arquivo | Mudanca |
|---|---|
| `js/views/home.js` | Botoes auth trocados por `<button class="auth-image-button">` com `<img>`. Caminhos: `images/login.png`, `images/Criarconta.png` |
| `css/style.css` | `.home-auth-icon` removido; `.auth-image-button` adicionado; `.home-auth-icons` background zerado; 3 blocos `.esgotado-badge` consolidados em 1 com `z-index:50`; `.market-ad-icon` com `overflow:visible`; mobile ribbon ajustado |

### Validacao

- `node --check` passou em `home.js`, `items.js`, `admin.js`.
- CSS verificado sem duplicatas de `.auth-image-button` e `.esgotado-badge`.
- Imagens `login.png` e `Criarconta.png` confirmadas em `images/`.

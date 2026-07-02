# Spec: Marketplace Warspear com Vendedores

**Data:** 2026-06-27
**Status:** Aprovado
**Abordagem:** A — Evolução incremental sobre base existente

---

## 1. Visão Geral

Transformar o catálogo atual em marketplace híbrido: dono cadastra vendedores, cada vendedor administra seus próprios anúncios, comprador fecha negócio via WhatsApp. Login unificado com detecção automática de papel (dono/vendedor). Manter essência visual escura/dourada/medieval do Warspear.

### Não-escopo (YAGNI)
- Carrinho de compras, checkout, pagamento online
- Cadastro público de vendedores
- Chat interno
- Avaliações/reviews
- Sistema de comissão automática

---

## 2. Arquitetura

### Backend — Nova estrutura de arquivos

```
api/
  config.php              # Conexão DB, CORS, sessão, helpers (mantido + env vars)
  routes.php              # NOVO — roteador simples: parse REQUEST_URI, dispatcher
  auth.php                # Mantido + papel do usuário no retorno
  categories.php          # Mantido
  subcategories.php       # Mantido
  items.php               # Estendido: filtra por id_vendedor quando vendedor logado
  settings.php            # Estendido: email_master configurável
  upload.php              # Mantido
  seed_categories.php     # Mantido
  sellers.php             # NOVO — CRUD vendedores (super-admin only)
```

### Frontend — Nova estrutura de módulos

```
js/
  app.js                  # Init, APP_STATE, roteador (~200 linhas)
  api.js                  # fetchJSON, resolveApiBase, uploadImage
  views/
    home.js                # renderHome
    categories.js          # renderGeneralCategories, renderCategories, renderSubcategories
    items.js               # renderItems, renderItemDetails, loaders
    admin.js               # renderAdminLogin, renderAdminPanel, accordions
    seller.js              # NOVO — renderSellerPanel, seller CRUD
  components/
    panel.js               # Moldura do painel (header, corners, footer)
    toast.js               # showToast
    modal.js               # renderModal, closeModal, confirmModal
    utils.js               # sanitizers, formatCurrencyBRL, resolveBRLValue
css/
  style.css               # Refatorado com seções claras, comentado
  animations.css           # NOVO — animações isoladas
```

### Banco de dados — Alterações

**Nova tabela `usuarios`** (substitui lógica de senha única):
```sql
CREATE TABLE usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    senha_hash TEXT NOT NULL,
    papel TEXT NOT NULL CHECK(papel IN ('dono','vendedor')),
    nome TEXT NOT NULL,
    whatsapp TEXT DEFAULT '',
    ativo INTEGER DEFAULT 1,
    senha_trocada INTEGER DEFAULT 0,
    criado_em TEXT DEFAULT (datetime('now','localtime'))
);
```

**Alteração em `itens`**:
```sql
ALTER TABLE itens ADD COLUMN id_vendedor INTEGER DEFAULT NULL;
-- NULL = item do admin/dono. Preenchido = item de vendedor.
```

**Nova chave em `configuracoes`**:
```sql
INSERT OR IGNORE INTO configuracoes (chave, valor) VALUES ('email_master', 'admin@mercado.com');
```

**Migração automática** no `initDB()`: criar tabela `usuarios`, migrar senha admin atual para `usuarios` com papel 'dono' e email master.

---

## 3. Autenticação e Papéis

### Tela de login unificada
- Campo email + campo senha + botão Entrar
- Sistema consulta `usuarios` pelo email, verifica `password_verify(senha, senha_hash)`
- Retorna `{success, papel: 'dono'|'vendedor', nome, id}` na sessão
- `$_SESSION['usuario_id']`, `$_SESSION['usuario_papel']`, `$_SESSION['usuario_nome']`

### Verificação de papel
- `isAdmin()` → verifica se `$_SESSION['usuario_papel'] === 'dono'`
- `isSeller()` → verifica se `$_SESSION['usuario_papel'] === 'vendedor'`
- `isLoggedIn()` → verifica se `$_SESSION['usuario_id']` existe

### Acesso por rota

| Endpoint | Visitante | Vendedor | Dono |
|---|---|---|---|
| categories.php GET | ✅ | ✅ | ✅ |
| categories.php PUT | ❌ | ❌ | ✅ |
| items.php GET | ✅ | ✅ | ✅ |
| items.php POST/PUT/DELETE | ❌ | ✅ (próprios) | ✅ (todos) |
| sellers.php CRUD | ❌ | ❌ | ✅ |
| settings.php GET | ✅ | ✅ | ✅ |
| settings.php PUT | ❌ | ❌ | ✅ |
| upload.php POST | ❌ | ✅ | ✅ |

### Frontend — O que cada papel vê

**Visitante (não logado):**
- Home: "Procurar no mercado" + botão "Acesso" (login)
- Navegação completa do catálogo
- Detalhes do item com "Vendido por: [nome]" e botão WhatsApp
- Nenhum acesso administrativo

**Vendedor (logado):**
- Home: "Procurar no mercado" + "Meus Anúncios" + "Sair"
- Painel "Meus Anúncios": CRUD dos próprios itens
- Item novo herda automaticamente seu WhatsApp
- Não vê itens de outros vendedores no painel

**Dono (logado com email master):**
- Home: "Procurar no mercado" + "Painel Admin" + "Sair"
- Painel Admin completo (categorias, itens, configurações)
- Seção "Vendedores": CRUD de contas de vendedor
- Pode ver/editar/excluir qualquer item de qualquer vendedor
- Configurações globais: cantoneira, WhatsApp padrão, email master, senha

---

## 4. Painel do Vendedor

### Layout
```
┌──────────────────────────────────────┐
│  ╔══════════════════════════════════╗ │
│  ║  Meus Anúncios (12)   [+ Novo]  ║ │
│  ╚══════════════════════════════════╝ │
│                                       │
│  Filtro: [Buscar...]                  │
│                                       │
│  ┌──────────────────────────────────┐ │
│  │ [img] Nome Item                  │ │
│  │       Preço • Categoria/Sub      │ │
│  │                   [Editar] [✕]   │ │
│  └──────────────────────────────────┘ │
│                                       │
│  [SAIR]                               │
└──────────────────────────────────────┘
```

### Funcionalidades
- Lista apenas itens onde `id_vendedor = $_SESSION['usuario_id']`
- CRUD via items.php (backend filtra por `id_vendedor` na session)
- Upload de imagem do item
- NÃO pode editar categorias, configurações, nem ver outros vendedores
- Contador de itens ativos no cabeçalho
- Formulário de item igual ao existente, mas sem dropdown de vendedor (fixo = ele mesmo)

### Detalhes do item (visitante)
- Mostra "Vendido por: [nome do vendedor]" abaixo do preço
- Botão WhatsApp usa o número do vendedor, não número global
- Se item sem vendedor (admin), usa número global do site

---

## 5. Painel do Dono — Gestão de Vendedores

Nova seção no accordion admin existente:

```
▼ Vendedores
  ┌──────────────────────────────────────┐
  │  FerreiroDaLua                       │
  │  wa.me/551199999... • 12 itens       │
  │  🟢 Ativo       [Editar] [Desat.]   │
  ├──────────────────────────────────────┤
  │  MageSupremo                         │
  │  wa.me/551198888... • 5 itens        │
  │  🔴 Inativo     [Editar] [Ativar]   │
  └──────────────────────────────────────┘
  [+ Novo Vendedor]
```

### Formulário de vendedor (modal)
- Nome (texto)
- Email (texto, único)
- WhatsApp (texto, só dígitos com DDI)
- Senha inicial (texto, min 6 chars)
- Ao criar, gera hash bcrypt e insere em `usuarios`
- Ao editar, pode alterar nome, email, WhatsApp, resetar senha
- Ativar/Desativar: toggle booleano (itens de vendedor inativo continuam visíveis, mas ele não loga)

---

## 6. Melhorias Visuais e UX

### Animações (animations.css)

| Elemento | Animação |
|---|---|
| Transição entre views | fadeIn 200ms ease-out no container do painel |
| Cards de categoria (hover) | scale(1.03) + box-shadow glow dourado, 150ms |
| Botões (clique) | ripple effect via JS (círculo que expande do ponto de clique) |
| Toast | slideInRight 300ms + fadeOut 300ms |
| Accordion chevron | rotate 200ms ease |
| Modal | scaleIn(0.95 → 1) 200ms + overlay fade |
| Loading | skeleton shimmer (placeholder animado enquanto carrega) |

### Layout — Cards de categoria

Home e níveis de categoria mudam de lista para grid 2 colunas:
```
┌──────────────┐ ┌──────────────┐
│   ╔══════╗   │ │   ╔══════╗   │
│   ║ IMG  ║   │ │   ║ IMG  ║   │
│   ╚══════╝   │ │   ╚══════╝   │
│   Armas (15) │ │  Armaduras   │
│              │ │    (32)      │
└──────────────┘ └──────────────┘
```

### Mobile — Barra inferior fixa
```
┌──────────────────────────────────────┐
│            Conteúdo                   │
│                                       │
├──────────────────────────────────────┤
│  🏠 Home  │  📋 Cat  │  🔍 Buscar   │
└──────────────────────────────────────┘
```
Só visível em telas < 768px. Esconde no scroll-down, mostra no scroll-up.

### Micro-interações
- Favoritos: ícone ❤️ no canto do card de item. Salvo em localStorage. Sem login.
- Tooltip no primeiro acesso: "Clique nas categorias para explorar itens"
- Indicador de scroll: gradiente sutil no fundo da lista quando scrollável
- Confirmação de cópia: ao clicar no nome do item, copia e mostra toast "Copiado!"

### Tipografia
- `font-family: 'Segoe UI', system-ui, -apple-system, sans-serif`
- Headers: `letter-spacing: 0.5px`, `font-weight: 700`
- Body: `line-height: 1.5`
- Preços: `font-weight: 600`, cor gold mais intensa
- Row min-height: 56px (acessibilidade de toque)

---

## 7. Segurança

### API
- **Rate limiting**: array em memória, IP → contagem, reset a 60s. Max 30 req/min. Retorna 429.
- **CSRF**: token gerado na sessão, enviado em header `X-CSRF-Token` nos POST/PUT/DELETE. Verificado no `routes.php`.
- **Prepared statements**: já usado via PDO. Verificar 100% dos endpoints.
- **Upload**: já valida MIME via `finfo`. Adicionar: rejeitar nome com extensão dupla, renomear sempre.
- **Headers**: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`

### Senhas
- Bcrypt via `password_hash(PASSWORD_DEFAULT)` — já usado
- Mínimo 6 caracteres
- Bloqueio temporário: 5 tentativas erradas = 5 min de lock no IP
- Senha inicial de vendedor: força troca no primeiro login (campo `senha_trocada` booleano)

### Arquivos
- `.htaccess` bloqueia acesso direto a `database/`, `api/config.php`, `api/*.php` (só via router)
- Configurações sensíveis movidas para `api/.env.php` (não comitado, gitignore)

### .htaccess (novo)
```apache
# Bloquear acesso direto a arquivos sensíveis
<FilesMatch "^(config\.php|\.env\.php)$">
    Order allow,deny
    Deny from all
</FilesMatch>

# Bloquear acesso ao banco
RedirectMatch 403 ^/database/.*$

# Bloquear listagem de diretório
Options -Indexes
```

---

## 8. Performance

| Ação | Implementação |
|---|---|
| CSS | Minificar style.css (~1600→~1000 linhas). animations.css carregado async |
| JS | `<script defer>` nos módulos. Só carrega view ativa (dynamic import) |
| Imagens | `loading="lazy"` em todas as `<img>`. Thumbnails CSS `object-fit: cover` |
| Cache | `Cache-Control: max-age=3600` em imagens estáticas. ETag nos GET |
| SQLite | `PRAGMA journal_mode=WAL` para leituras concorrentes |
| Fonte | System font stack — sem Google Fonts, carregamento instantâneo |

---

## 9. SEO

```html
<!-- Meta tags no index.html -->
<meta name="description" content="Mercado Warspear - Compre e venda itens do jogo">
<meta name="robots" content="index, follow">
<link rel="canonical" href="https://mercadobrasil.com">

<!-- Open Graph -->
<meta property="og:title" content="Mercado Warspear">
<meta property="og:description" content="Catálogo de itens do Warspear Online">
<meta property="og:image" content="https://mercadobrasil.com/images/uploads/mercado.png">
<meta property="og:type" content="website">

<!-- Título dinâmico -->
<title id="page-title">Mercado Warspear</title>
```

- Título da página muda conforme view navegada
- `sitemap.xml` dinâmico listando categorias
- Dados estruturados JSON-LD para itens (schema.org/Product)

---

## 10. Plano de Migração

### Fase 1 — Banco e Auth (sem quebrar existente)
1. `initDB()` cria tabela `usuarios`, coluna `id_vendedor` em `itens`
2. Migra senha admin atual → `usuarios` com email master, papel 'dono', e `senha_trocada=1` (não força troca)
3. `auth.php` estendido para verificar `usuarios` e retornar papel
4. Login via email+senha (mantendo compatibilidade com senha antiga por 1 versão)

### Fase 2 — Frontend modular
1. Extrair `api.js`, `components/` sem mudar comportamento
2. Separar views em arquivos próprios
3. `app.js` vira orquestrador de ~200 linhas

### Fase 3 — Painel vendedor
1. `sellers.php` (CRUD, só dono)
2. `items.php` estendido com `id_vendedor`
3. Frontend: `seller.js` com painel próprio

### Fase 4 — Visual e UX
1. `animations.css` isolado
2. Grid de cards nas categorias
3. Navbar mobile
4. Micro-interações (favoritos, tooltip)
5. SEO meta tags

### Fase 5 — Segurança e Performance
1. Rate limiting
2. CSRF tokens
3. `.htaccess`
4. WAL mode, cache headers

---

## 11. Restrições

- **PHP**: sem framework, sem dependências externas (Composer só se inevitável)
- **JS**: vanilla, sem bundler, sem npm. Módulos via `<script>` tags com `defer`
- **CSS**: sem preprocessador. CSS custom properties para variáveis
- **Banco**: SQLite. Sem MySQL/Postgres
- **Compatibilidade**: Chrome, Firefox, Safari, Edge (últimos 2 major). iOS Safari 15+
- **Essência**: manter visual escuro/dourado/medieval e experiência tipo NPC do jogo

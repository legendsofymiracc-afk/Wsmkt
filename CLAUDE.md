# Mercado — Catálogo Online (Warspear Online)

Catálogo web de itens do jogo Warspear Online, estilo loja/trading. Frontend vanilla JS SPA + backend PHP REST + SQLite. Tema visual escuro/dourado medieval com textura de fundo tileada e cantoneiras decorativas.

## Como rodar

```bash
# Backend (PHP built-in server na porta 8080)
php -S 127.0.0.1:8080 -t .

# Frontend — abrir index.html via Live Server (VS Code, porta 5500) ou direto no navegador (file://)
# O app detecta ambiente automaticamente (resolveApiBase):
#   - 127.0.0.1:5500 ou file:// → usa http://127.0.0.1:8080/api
#   - outros → usa 'api' (caminho relativo, espera mesmo domínio)
# Override manual: localStorage.setItem('API_BASE', 'http://...')
```

Banco SQLite em `database/mercado.db`. Criado automaticamente na primeira request (`config.php` → `initDB()`).

## Estrutura de arquivos

```
index.html                          # Shell SPA — <div id="app"> vazio
api/
  config.php                        # Conexão PDO SQLite, initDB(), CORS, sessão, getSetting/setSetting, maybeMigrateLegacyData
  auth.php                          # ?action=login|logout|check — senha default 'admin123', hash bcrypt
  categories.php                    # GET (tree=1|id=|nivel=|id_pai=), PUT (imagem_url por id, admin only, remove arquivo antigo)
  subcategories.php                 # GET ?category_id= — subcategorias por id_pai (nível 3)
  items.php                         # GET (id|subcategory_id|category_id|general_id), POST, PUT, DELETE — fetchItemsWithRelations() com JOINs
  settings.php                      # GET/PUT — corner_image_url, whatsapp_number, new_admin_password (bcrypt, min 6 chars, admin only)
  upload.php                        # POST upload imagem — 2MB max, jpg/png/webp, nome único (data+random), admin only
  seed_categories.php               # Aplica database/categories.seed.json no banco (upsert, transacional, idempotente)
css/style.css                       # ~1600 linhas — tema escuro/dourado, CSS custom properties, responsivo, cantoneiras, accordion, modal, toast
js/app.js                           # ~1450 linhas — SPA completa (navegação, renderização, admin CRUD, upload, WhatsApp)
database/
  categories.seed.json              # 15 categorias gerais + subcategorias aninhadas (3 níveis)
  mercado.db                        # SQLite (gerado automaticamente na primeira request)
images/
  cantoneira.png                    # Imagem decorativa de borda (cantoneira)
  uploads/                          # Uploads de imagem via painel admin (~100+ arquivos de seed)
.claude/
  settings.json                     # Configuração do Claude Code (modelo, API key)
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
Referência a qualquer nível da hierarquia — apenas UM dos três campos de referência deve ser preenchido por item. Preços em moedas (int) e reais (float). Índices em `id_subcategoria`, `id_categoria`, `id_geral`.

| Coluna | Tipo | Descrição |
|---|---|---|
| id | INTEGER PK | Auto increment |
| id_subcategoria | INTEGER | FK → categorias.id (nível 3) |
| id_categoria | INTEGER | FK → categorias.id (nível 2) |
| id_geral | INTEGER | FK → categorias.id (nível 1) |
| nome | TEXT | Nome do item |
| descricao | TEXT | Descrição |
| preco_moedas | INTEGER | Preço em moedas do jogo |
| preco_reais | REAL | Preço em reais (opcional) |
| quantidade_disponivel | INTEGER | Estoque |
| imagem_url | TEXT | Caminho ou URL da imagem |

### Tabela `configuracoes`
Chave/valor simples.

| Chave | Descrição |
|---|---|
| corner_image_url | Imagem das cantoneiras decorativas (default: ../images/cantoneira.png) |
| whatsapp_number | Número WhatsApp para compra (apenas dígitos, com DDI) |
| admin_password_hash | Hash bcrypt da senha admin |

## Fluxo de navegação (SPA)

```
home → general-categories → categories → subcategories → items → item-details
                                  │            │
                                  └──→ items ──┘  (pula nível se não houver categorias/subcategorias)
```

- **home**: dois botões — "Procurar no mercado" e "Painel Administrativo"
- **general-categories**: grid de categorias gerais com ícones e contagem de itens
- **categories**: grid de categorias (nível 2) + opção "Itens sem categoria" se houver itens diretos no nível geral
- **subcategories**: grid de subcategorias (nível 3) com contagem de itens
- **items**: lista de itens com nome, ícone, preço (moedas + R$). Cada item tem `selectItem()` para detalhes
- **item-details**: imagem grande, descrição, preços, botão "Comprar no WhatsApp", quantidade disponível
- **admin-login**: campo de senha + botão Entrar
- **admin-panel**: acordeões com CRUD de categorias gerais/categorias/subcategorias (upload de imagem), CRUD de itens (CRUD completo com filtros), personalização visual (cantoneira, WhatsApp, senha)

Estado global em `APP_STATE`:
```js
currentView, isAdmin, currentGeneralId, currentCategoryId, currentSubcategoryId,
currentItemId, viewingGeneralRootItems, generalCategories, categoriesLevel2,
categoriesLevel3, categoryIndex (Map), categoryTree, itemsList, allItems, settings
```

## API — Endpoints

| Endpoint | Método | Admin | Descrição |
|---|---|---|---|
| auth.php?action=login | POST/GET | Não | Login com senha (POST com body ou GET fallback) |
| auth.php?action=logout | POST | Não | Destroi sessão |
| auth.php?action=check | GET | Não | Retorna `{is_admin: bool}` |
| categories.php?tree=1 | GET | Não | Árvore completa de categorias (aninhada) |
| categories.php?nivel=&id_pai= | GET | Não | Categorias filtradas por nível/pai |
| categories.php | PUT | Sim | Atualiza imagem_url de categoria `{id, imagem_url}` |
| subcategories.php?category_id= | GET | Não | Subcategorias (nível 3) de uma categoria pai |
| items.php | GET | Não | Todos os itens (com JOINs resolvendo nomes) |
| items.php?id= | GET | Não | Item único |
| items.php?subcategory_id= | GET | Não | Itens por subcategoria |
| items.php?category_id= | GET | Não | Itens por categoria |
| items.php?general_id= | GET | Não | Itens por categoria geral |
| items.php | POST | Sim | Criar item |
| items.php | PUT | Sim | Atualizar item |
| items.php | DELETE | Sim | Deletar item `{id}` |
| settings.php | GET | Não | Retorna `{corner_image_url, whatsapp_number}` |
| settings.php | PUT/POST | Sim | Salva corner_image_url, whatsapp_number, new_admin_password |
| upload.php | POST | Sim | Upload de imagem (multipart, campo `file`) |
| seed_categories.php | GET | Não | Aplica seed do JSON no banco (idempotente) |

## Autenticação

Sessão PHP (`$_SESSION['is_admin']`). Senha padrão `admin123` (constante `ADMIN_PASSWORD` em `config.php`).

Fluxo de verificação:
1. Tenta `password_verify()` contra hash bcrypt em `admin_password_hash`
2. Se não houver hash salvo, fallback para comparação direta com `ADMIN_PASSWORD`

Ao alterar senha pelo painel (`settings.php?new_admin_password`), salva hash bcrypt. Senha deve ter 6+ caracteres.

## Categorias (Seed — categories.seed.json)

15 categorias gerais, ~70 subcategorias no total:

| Categoria Geral | Subcategorias |
|---|---|
| Baús | — |
| Pacotes de Iniciante | — |
| Armas | Adagas, Espadas (1M/2M), Machados (1M/2M), Maças (1M/2M), Lanças, Escudos, Cajados, Arcos, Bestas |
| Armadura | Tecido/Leve/Pesada (Cabeça, Tronco, Mãos, Cintura, Pernas cada) |
| Acessórios | Braceletes, Capotes, Anéis, Amuletos |
| Aprimoramentos | Runas, Cristais, Amplificação |
| Consumíveis | Alimento, Poções, Pergaminhos, Artefatos |
| Utilidades | — |
| Lacaios | — |
| Relíquias | Aprimoramento, Ataque, Defesa, Grupo |
| Livros de Habilidade | — |
| Visuais Decorativos | Armas 1M, Armas 2M, Cajados, Arcos, Bestas, Escudos, Pergaminho da Purificação |
| Trajes Luxuosos | — |
| Sorrisos | — |
| Recursos | Substâncias, Essências, Catalizadores, Recursos de Artesanato, Recursos de Castelo |
| Saquear | — |

## Funcionalidades principais

### Loja (usuário)
- Navegação hierárquica em 3 níveis com contagem de itens por categoria
- Pulo automático de níveis vazios (ex: se categoria não tem subcategorias, vai direto pra itens)
- Detalhes do item com imagem, descrição, preços (moedas + R$), quantidade
- **Compra via WhatsApp**: botão abre `https://wa.me/<numero>?text=Olá! Tenho interesse no item "..."` — número configurável no admin
- Preço em R$: usa `preco_reais` se preenchido, senão converte moedas × 0.01 (`COIN_TO_BRL`)

### Painel Admin
- **Categorias Gerais**: visualização com contagem de categorias filhas, upload de imagem por arquivo
- **Categorias**: agrupadas por categoria geral, upload de imagem por arquivo
- **Subcategorias**: lista com breadcrumb (Categoria → Geral), upload de imagem por arquivo
- **Itens**: CRUD completo com filtros em cascata (Geral → Categoria → Subcategoria), busca textual, modal de formulário com seleção dinâmica de níveis
- **Personalização Visual**: URL da cantoneira, número WhatsApp, alteração de senha

### Tema visual (CSS)
- Textura de fundo tileada (Google Photos) com escala configurável por variável CSS
- Painel central com cantoneiras decorativas nos cantos superiores
- Cores douradas (`#ffd700`, `#d4af37`, `#d46a2e`)
- Seleção de linha com destaque azulado
- Toast notifications (info/success/error)
- Modal overlay para formulários e confirmações
- Accordion com chevron animado para painel admin
- Correção de viewport para iOS Safari (`--vh` dinâmico)
- Responsivo: `min(92vw, 540px)` no painel

## Padrões e comportamentos importantes

- `fetchJSON()`: detecta PHP não executado (conteúdo `<?php` no response), erro 405, Content-Type não-JSON
- `doLogin()`: fallback POST→GET se servidor retorna 405 (hosts que bloqueiam POST)
- `resolveApiBase()`: adapta URL da API conforme ambiente (Live Server vs file:// vs produção), com override via `localStorage.API_BASE`
- `resolveBRLValue()`: preço em R$ usa `preco_reais` se >0, senão converte `preco_moedas × 0.01`
- `resolveImage()`: fallback para placeholder se URL vazia
- `sanitizeItems()` / `sanitizeCategoriesTree()`: normalização de tipos (Number, String) e defaults
- `buildCategoryTree()` (PHP): converte flat rows em árvore aninhada por `id_pai`
- `maybeMigrateLegacyData()`: converte tabelas antigas (`categories`, `subcategories`, `items`) para novo esquema de 3 níveis (nível 1=antiga category, nível 2="Coleções", nível 3=antiga subcategory)
- `seed_categories.php`: upsert idempotente — se categoria já existe por nome+nivel+id_pai, reusa; se imagem mudou, atualiza
- Upload de imagem: nome único `YYYYmmdd_HHMMSS_<random6bytes>.<ext>`, valida MIME type via `finfo`, não confia em extensão
- Ao trocar imagem de categoria, arquivo antigo é removido do disco (se for em `images/uploads/`)
- CSS: `--vh` corrigido via JS (`updateViewportUnit()`) no resize e load para iOS Safari
- Background texture: fallback para gradiente escuro se Google Photos inacessível (`ensureBackgroundTexture()`)
- SPA: todas as funções de navegação expostas no `window` para `onclick` inline

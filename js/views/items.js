// js/views/items.js

/* ====================================================
   PAGINATION STATE
   ==================================================== */
const ITEMS_PAGE_STATE = {
    items: [],
    total: 0,
    page: 1,
    perPage: 20,
    hasMore: false
};

/* ====================================================
   SORT / FILTER STATE
   ==================================================== */
const ITEMS_SORT_OPTIONS = [
    { value: 'default',     label: 'Padrão' },
    { value: 'price-asc',   label: 'Menor preço' },
    { value: 'price-desc',  label: 'Maior preço' },
    { value: 'name-asc',    label: 'Nome A-Z' },
    { value: 'name-desc',   label: 'Nome Z-A' },
    { value: 'level-asc',   label: 'Menor nível' },
    { value: 'level-desc',  label: 'Maior nível' }
];

let currentSort     = 'default';
let currentServerFilter = '';
let currentPriceMin = '';
let currentPriceMax = '';
let isLoadingMore   = false;

/* ====================================================
   ITEM LOADERS (original + paginated)
   ==================================================== */
async function loadItemsBySubcategory(subId) {
    if (!subId) { APP_STATE.itemsList = []; return []; }
    try {
        const data = await fetchJSON(`items.php?subcategory_id=${subId}&page=${ITEMS_PAGE_STATE.page}&per_page=${ITEMS_PAGE_STATE.perPage}`);
        if (data && Array.isArray(data)) {
            APP_STATE.itemsList = sanitizeItems(data);
            ITEMS_PAGE_STATE.hasMore = false;
        } else if (data && data.items) {
            APP_STATE.itemsList = sanitizeItems(data.items);
            ITEMS_PAGE_STATE.total   = data.total   || 0;
            ITEMS_PAGE_STATE.page    = data.page    || 1;
            ITEMS_PAGE_STATE.perPage = data.per_page || ITEMS_PAGE_STATE.perPage;
            ITEMS_PAGE_STATE.hasMore = (ITEMS_PAGE_STATE.page * ITEMS_PAGE_STATE.perPage) < ITEMS_PAGE_STATE.total;
        } else {
            APP_STATE.itemsList = [];
            ITEMS_PAGE_STATE.hasMore = false;
        }
    } catch (e) {
        console.error(e);
        showToast('Erro ao carregar itens', 'error');
        APP_STATE.itemsList = [];
        ITEMS_PAGE_STATE.hasMore = false;
    }
    ITEMS_PAGE_STATE.items = [...APP_STATE.itemsList];
    return APP_STATE.itemsList;
}

async function loadItemsByCategory(catId) {
    if (!catId) { APP_STATE.itemsList = []; return []; }
    try {
        const data = await fetchJSON(`items.php?category_id=${catId}&page=${ITEMS_PAGE_STATE.page}&per_page=${ITEMS_PAGE_STATE.perPage}`);
        if (data && Array.isArray(data)) {
            APP_STATE.itemsList = sanitizeItems(data);
            ITEMS_PAGE_STATE.hasMore = false;
        } else if (data && data.items) {
            APP_STATE.itemsList = sanitizeItems(data.items);
            ITEMS_PAGE_STATE.total   = data.total   || 0;
            ITEMS_PAGE_STATE.page    = data.page    || 1;
            ITEMS_PAGE_STATE.perPage = data.per_page || ITEMS_PAGE_STATE.perPage;
            ITEMS_PAGE_STATE.hasMore = (ITEMS_PAGE_STATE.page * ITEMS_PAGE_STATE.perPage) < ITEMS_PAGE_STATE.total;
        } else {
            APP_STATE.itemsList = [];
            ITEMS_PAGE_STATE.hasMore = false;
        }
    } catch (e) {
        console.error(e);
        showToast('Erro ao carregar itens', 'error');
        APP_STATE.itemsList = [];
        ITEMS_PAGE_STATE.hasMore = false;
    }
    ITEMS_PAGE_STATE.items = [...APP_STATE.itemsList];
    return APP_STATE.itemsList;
}

async function loadItemsByGeneral(genId) {
    if (!genId) { APP_STATE.itemsList = []; return []; }
    try {
        const data = await fetchJSON(`items.php?general_id=${genId}&page=${ITEMS_PAGE_STATE.page}&per_page=${ITEMS_PAGE_STATE.perPage}`);
        if (data && Array.isArray(data)) {
            APP_STATE.itemsList = sanitizeItems(data);
            ITEMS_PAGE_STATE.hasMore = false;
        } else if (data && data.items) {
            APP_STATE.itemsList = sanitizeItems(data.items);
            ITEMS_PAGE_STATE.total   = data.total   || 0;
            ITEMS_PAGE_STATE.page    = data.page    || 1;
            ITEMS_PAGE_STATE.perPage = data.per_page || ITEMS_PAGE_STATE.perPage;
            ITEMS_PAGE_STATE.hasMore = (ITEMS_PAGE_STATE.page * ITEMS_PAGE_STATE.perPage) < ITEMS_PAGE_STATE.total;
        } else {
            APP_STATE.itemsList = [];
            ITEMS_PAGE_STATE.hasMore = false;
        }
    } catch (e) {
        console.error(e);
        showToast('Erro ao carregar itens', 'error');
        APP_STATE.itemsList = [];
        ITEMS_PAGE_STATE.hasMore = false;
    }
    ITEMS_PAGE_STATE.items = [...APP_STATE.itemsList];
    return APP_STATE.itemsList;
}

async function loadAllItems() {
    try {
        const data = await fetchJSON('items.php');
        APP_STATE.allItems = sanitizeItems(data);
    } catch (e) {
        console.error(e);
        APP_STATE.allItems = [];
    }
    return APP_STATE.allItems;
}

/* ====================================================
   PAGE RESET
   ==================================================== */
function resetItemsPage() {
    ITEMS_PAGE_STATE.items    = [];
    ITEMS_PAGE_STATE.total    = 0;
    ITEMS_PAGE_STATE.page     = 1;
    ITEMS_PAGE_STATE.hasMore  = false;
    APP_STATE.itemsList       = [];
}

/* ====================================================
   LOAD MORE (pagination)
   ==================================================== */
async function loadMoreItems() {
    if (isLoadingMore || !ITEMS_PAGE_STATE.hasMore) return;
    isLoadingMore = true;

    const loadBtn = document.getElementById('load-more-btn');
    if (loadBtn) { loadBtn.disabled = true; loadBtn.textContent = 'Carregando...'; }

    ITEMS_PAGE_STATE.page++;
    const page = ITEMS_PAGE_STATE.page;

    try {
        let endpoint = 'items.php?';
        if (APP_STATE.currentSubcategoryId) endpoint += `subcategory_id=${APP_STATE.currentSubcategoryId}&`;
        else if (APP_STATE.currentCategoryId)   endpoint += `category_id=${APP_STATE.currentCategoryId}&`;
        else if (APP_STATE.currentGeneralId)    endpoint += `general_id=${APP_STATE.currentGeneralId}&`;
        endpoint += `page=${page}&per_page=${ITEMS_PAGE_STATE.perPage}`;

        const data = await fetchJSON(endpoint);
        let newItems = [];
        if (data && Array.isArray(data)) {
            newItems = sanitizeItems(data);
            ITEMS_PAGE_STATE.hasMore = false;
        } else if (data && data.items) {
            newItems = sanitizeItems(data.items);
            ITEMS_PAGE_STATE.total    = data.total    || 0;
            ITEMS_PAGE_STATE.perPage  = data.per_page || ITEMS_PAGE_STATE.perPage;
            ITEMS_PAGE_STATE.hasMore  = (page * ITEMS_PAGE_STATE.perPage) < ITEMS_PAGE_STATE.total;
        }

        APP_STATE.itemsList = [...APP_STATE.itemsList, ...newItems];
        ITEMS_PAGE_STATE.items = [...APP_STATE.itemsList];
        ITEMS_PAGE_STATE.page = page;

        // Re-render with new items appended
        appendMoreItems(newItems);
    } catch (e) {
        console.error(e);
        ITEMS_PAGE_STATE.page--;
        showToast('Erro ao carregar mais itens', 'error');
    }

    isLoadingMore = false;
    if (loadBtn) {
        loadBtn.disabled = false;
        if (ITEMS_PAGE_STATE.hasMore) {
            loadBtn.textContent = 'Carregar mais';
        } else {
            loadBtn.remove();
        }
    }
}

function appendMoreItems(newItems) {
    const listContainer = document.getElementById('market-items-list');
    if (!listContainer) return;
    const filtered = applyFiltersAndSort(newItems, currentSort, currentServerFilter, currentPriceMin, currentPriceMax);
    listContainer.insertAdjacentHTML('beforeend', renderMarketRows(filtered));

    const loadBtn = document.getElementById('load-more-btn');
    if (loadBtn && !ITEMS_PAGE_STATE.hasMore) {
        loadBtn.remove();
    }
}

/* ====================================================
   SORT / FILTER LOGIC
   ==================================================== */
function applyFiltersAndSort(items, sort, serverFilter, priceMin, priceMax) {
    let filtered = [...items];

    // Server filter
    if (serverFilter) {
        filtered = filtered.filter(item => item.servidor === serverFilter);
    }

    // Price filter (preco_moedas)
    const min = priceMin !== '' ? Number(priceMin) : NaN;
    const max = priceMax !== '' ? Number(priceMax) : NaN;
    if (!isNaN(min)) {
        filtered = filtered.filter(item => (item.preco_moedas || 0) >= min);
    }
    if (!isNaN(max)) {
        filtered = filtered.filter(item => (item.preco_moedas || 0) <= max);
    }

    // Sort
    switch (sort) {
        case 'price-asc':
            filtered.sort((a, b) => (a.preco_moedas || 0) - (b.preco_moedas || 0));
            break;
        case 'price-desc':
            filtered.sort((a, b) => (b.preco_moedas || 0) - (a.preco_moedas || 0));
            break;
        case 'name-asc':
            filtered.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
            break;
        case 'name-desc':
            filtered.sort((a, b) => (b.nome || '').localeCompare(a.nome || ''));
            break;
        case 'level-asc': {
            filtered.sort((a, b) => {
                const la = Number(getItemLevel(a)) || 0;
                const lb = Number(getItemLevel(b)) || 0;
                return la - lb;
            });
            break;
        }
        case 'level-desc': {
            filtered.sort((a, b) => {
                const la = Number(getItemLevel(a)) || 0;
                const lb = Number(getItemLevel(b)) || 0;
                return lb - la;
            });
            break;
        }
        default:
            // Padrão — keep original order
            break;
    }

    return filtered;
}

function onSortChange() {
    const sel = document.getElementById('sort-select');
    if (sel) currentSort = sel.value;
    resetItemsPage();
    reloadCurrentItemsView();
}

function onServerFilterChange() {
    const sel = document.getElementById('server-filter-select');
    if (sel) currentServerFilter = sel.value;
    resetItemsPage();
    reloadCurrentItemsView();
}

function onPriceFilterChange() {
    const minInput = document.getElementById('price-min-input');
    const maxInput = document.getElementById('price-max-input');
    if (minInput) currentPriceMin = minInput.value;
    if (maxInput) currentPriceMax = maxInput.value;
    resetItemsPage();
    reloadCurrentItemsView();
}

async function reloadCurrentItemsView() {
    const container = document.getElementById('app');
    if (!container) return;
    if (APP_STATE.currentSubcategoryId) {
        await loadItemsBySubcategory(APP_STATE.currentSubcategoryId);
    } else if (APP_STATE.currentCategoryId) {
        await loadItemsByCategory(APP_STATE.currentCategoryId);
    } else if (APP_STATE.currentGeneralId) {
        await loadItemsByGeneral(APP_STATE.currentGeneralId);
    }
    renderItems(container);
}

function selectItem(itemId) {
    APP_STATE.currentItemId = itemId;
    APP_STATE.returnViewAfterDetails = APP_STATE.currentView === 'favorites' ? 'favorites' : 'items';
    const item = APP_STATE.itemsList.find(i => i.id === itemId) || APP_STATE.allItems.find(i => i.id === itemId);
    if (item) trackRecentlyViewed(item);
    navigateTo('item-details');
}

function renderSortFilterBar() {
    const serverOptions = ['<option value="">Todos</option>'];
    GAME_SERVERS.forEach(s => {
        serverOptions.push(`<option value="${escapeHtml(s)}" ${currentServerFilter === s ? 'selected' : ''}>${escapeHtml(s)}</option>`);
    });

    const sortOptions = ITEMS_SORT_OPTIONS.map(opt =>
        `<option value="${opt.value}" ${currentSort === opt.value ? 'selected' : ''}>${escapeHtml(opt.label)}</option>`
    ).join('');

    return `<div class="items-sort-filter-bar">
        <div class="sort-filter-row">
            <div class="sort-filter-group">
                <label for="sort-select">Ordenar</label>
                <select id="sort-select" onchange="onSortChange()">${sortOptions}</select>
            </div>
            <div class="sort-filter-group">
                <label for="server-filter-select">Servidor</label>
                <select id="server-filter-select" onchange="onServerFilterChange()">${serverOptions.join('')}</select>
            </div>
            <div class="sort-filter-group price-range">
                <label>Preço</label>
                <div class="price-range-inputs">
                    <input type="number" id="price-min-input" placeholder="Min" min="0" value="${escapeHtml(currentPriceMin)}" oninput="onPriceFilterChange()">
                    <span class="price-range-sep">-</span>
                    <input type="number" id="price-max-input" placeholder="Max" min="0" value="${escapeHtml(currentPriceMax)}" oninput="onPriceFilterChange()">
                </div>
            </div>
        </div>
    </div>`;
}

function renderMarketRows(items) {
    return items.map(item => {
        const isSoldOut = Number(item.quantidade_disponivel || 0) === 0;
        const pCoins = formatGoldValue(item.preco_moedas);
        const fullCoins = formatGoldValue(item.preco_moedas, { compact: false });
        const goldFit = getGoldFitClass(item.preco_moedas);
        const favClass = isFavorite(item.id) ? '<span style="color:#ff2d2d">❤</span>' : '<span style="color:rgba(255,255,255,0.4)">♡</span>';
        const level = getItemLevel(item);
        const color = getItemColor(item);
        const image = resolveImage(item.imagem_url || item.template_imagem);
        const soldOutClass = isSoldOut ? ' item-esgotado' : '';
        const soldOutOverlay = isSoldOut ? '<div class="esgotado-badge">ESGOTADO</div>' : '';
        const stockCount = Number(item.quantidade_disponivel || 0);
        const canManageStock = APP_STATE.currentUser && (
            APP_STATE.currentUser.papel === 'dono' ||
            (APP_STATE.currentUser.papel === 'vendedor' && Number(item.id_vendedor) === Number(APP_STATE.currentUser.id))
        );
        const stockHTML = canManageStock
            ? `<span class="stock-control market-stock-control"><button class="stock-btn" onclick="event.stopPropagation();quickStockUpdate(${item.id},-1)" title="-1">-</button><span class="stock-qty" id="sq-${item.id}">${stockCount}</span><button class="stock-btn" onclick="event.stopPropagation();quickStockUpdate(${item.id},1)" title="+1">+</button></span>`
            : `<div class="market-stock-pill ${stockCount === 0 ? 'is-empty' : ''}">Estoque <strong>${stockCount}</strong></div>`;
        return `<article class="game-market-row${soldOutClass}" onclick="selectItem(${item.id})" tabindex="0">
            ${soldOutOverlay}
            <button class="game-market-fav" onclick="event.stopPropagation();toggleFavorite(${item.id});">${favClass}</button>
            <div class="market-ad-icon"><img src="${image}" alt="${escapeHtml(item.nome)}">${level ? `<b>${level}</b>` : ''}</div>
            <div class="game-market-copy">
                <div class="game-market-name rarity-name-${color}">${escapeHtml(item.nome)}</div>
                ${stockHTML}
            </div>
            <div class="market-ad-price"><span class="market-coin-dot" aria-hidden="true"></span><div><strong class="${goldFit}" title="${fullCoins}">${pCoins}</strong></div></div>
        </article>`;
    }).join('');
}

function refreshCurrentItemsView() {
    const container = document.getElementById('app');
    if (APP_STATE.currentView === 'favorites') {
        renderFavorites(container);
        return;
    }
    renderItems(container);
}

function renderItems(container) {
    let title = 'Itens';
    if (APP_STATE.currentSubcategoryId) { const s = APP_STATE.categoryIndex.get(APP_STATE.currentSubcategoryId); if (s) title = s.nome; }
    else if (APP_STATE.currentCategoryId) { const c = APP_STATE.categoryIndex.get(APP_STATE.currentCategoryId); if (c) title = c.nome; }
    else if (APP_STATE.currentGeneralId) { const g = APP_STATE.categoryIndex.get(APP_STATE.currentGeneralId); if (g) title = g.nome; }
    title = typeof translateCategoryName === 'function' ? translateCategoryName(title) : title;

    const filteredItems = applyFiltersAndSort(APP_STATE.itemsList, currentSort, currentServerFilter, currentPriceMin, currentPriceMax);
    const rowsHtml = renderMarketRows(filteredItems) || '<div class="row"><div class="label">Nenhum item cadastrado.</div></div>';

    const sortFilterHtml = renderSortFilterBar();
    const paginationHtml = ITEMS_PAGE_STATE.hasMore
        ? `<div class="load-more-wrapper"><button class="login-btn" id="load-more-btn" onclick="loadMoreItems()">Carregar mais (${Math.min(ITEMS_PAGE_STATE.perPage, ITEMS_PAGE_STATE.total - (ITEMS_PAGE_STATE.page * ITEMS_PAGE_STATE.perPage))} restantes)</button></div>`
        : '';

    const favCount = getFavorites().length;
    const favoritesToolbar = favCount > 0
        ? `<div class="items-toolbar"><button class="login-btn favorites-link" onclick="renderFavoritesView()">Favoritos (${favCount})</button></div>`
        : '';
    const itemsHtml = `${favoritesToolbar}
    ${sortFilterHtml}
    <div id="market-items-list">${rowsHtml}</div>
    ${paginationHtml}`;

    container.innerHTML = renderPanel(title, itemsHtml, '<button class="login-btn" onclick="goBack()">VOLTAR</button>');
    addRowSelectionBehavior();
}

async function renderFavoritesView() {
    if (!APP_STATE.currentUser.isLoggedIn) {
        showToast('Faça login para ver favoritos', 'error');
        showQuickLogin();
        return;
    }
    navigateTo('favorites');
}

async function renderFavorites(container) {
    if (!APP_STATE.currentUser.isLoggedIn) {
        container.innerHTML = renderPanel('Favoritos', '<div class="row"><div class="label">Faça login para ver seus favoritos.</div></div>', '<button class="login-btn" onclick="showQuickLogin()">ENTRAR</button>');
        return;
    }
    await loadFavoritesState(false);
    const items = APP_STATE.favoriteItems || [];
    const html = renderMarketRows(items) || '<div class="row"><div class="label">Nenhum favorito salvo.</div></div>';
    container.innerHTML = renderPanel('Favoritos', html, '<button class="login-btn" onclick="goBack()">VOLTAR</button>');
    addRowSelectionBehavior();
}

function formatTemplateStatValue(value, params = 0) {
    const rawVal = Number(value);
    if (!Number.isFinite(rawVal)) return '';

    if (params & 1) {
        const divisor = (params & 16) ? 100 : 10;
        return (rawVal / divisor).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 }) + '%';
    }

    if (rawVal > 999) {
        return (rawVal / 100).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 });
    }

    return rawVal.toLocaleString('pt-BR');
}

function renderWsdbStatSlot(icon, value, title = '', extraClass = '') {
    const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
    const imageHTML = icon ? `<img src="https://wsdb.xyz/icons/${icon}.webp" alt="">` : '';
    const valueHTML = value !== '' && value != null ? `<strong>${escapeHtml(String(value))}</strong>` : '';
    return `<div class="wsdb-stat-slot ${extraClass}"${titleAttr}>${imageHTML}${valueHTML}</div>`;
}

function renderWsdbLevelSlot(level) {
    return `<div class="wsdb-stat-slot wsdb-level-slot"><strong>${escapeHtml(String(level || '?'))}</strong></div>`;
}

function renderWsdbEmptySlot(title = '') {
    const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
    return `<div class="wsdb-stat-slot wsdb-empty-slot"${titleAttr}></div>`;
}

function renderWsdbSection(title, content, className = '') {
    if (!content) return '';
    return `<div class="wsdb-stat-section ${className}">
        <h3>${escapeHtml(title)}</h3>
        <div class="wsdb-stat-grid">${content}</div>
    </div>`;
}

// Renderiza atributos como no wsdb.xyz, usando dados RAW da API.
function renderStatsHTML(attrs, rawAttrs, item, itemImage) {
    if (!attrs || typeof attrs !== 'object') return '';
    let contentCount = 0;

    // Usa rawAttrs (dados completos da API) se disponivel; senao, usa o compacto.
    const detail = (rawAttrs && typeof rawAttrs === 'object' && Object.keys(rawAttrs).length > 10) ? rawAttrs : null;

    const rarityMap = {0:'Comum',1:'Incomum',2:'Raro',3:'Epico',4:'Lendario',5:'Mitico'};
    const rarityColor = Number((detail && detail.color) ?? attrs.color ?? 0);
    const rar = rarityMap[rarityColor] || 'Comum';
    const level = (detail && detail.level) || attrs.level || '?';

    let requirements = renderWsdbLevelSlot(level);
    let parameters = '';
    let bonuses = '';
    let enchants = '';

    for (let i = 1; i <= 4; i++) {
        const nameKey = 'bonus' + i + 'Name';
        const valKey = 'value' + i;
        const iconKey = 'bonus' + i + 'Icon';
        let name, value, icon;
        if (detail && detail[nameKey]) {
            name = detail[nameKey];
            value = detail[valKey];
            icon = detail[iconKey];
        } else {
            const b = attrs['bonus' + i];
            if (b && b.name) { name = b.name; value = b.value; icon = b.icon; }
        }
        if (name) {
            const params = (detail ? detail['bonus' + i + 'Params'] : null) || 0;
            const displayVal = formatTemplateStatValue(value, params);
            bonuses += renderWsdbStatSlot(icon, displayVal, name);
            contentCount++;
        }
    }

    if (detail) {
        if (detail.skillIcon) {
            parameters += renderWsdbStatSlot(detail.skillIcon, '', detail.skillName || '');
            contentCount++;
        }
        if (detail.setSkill1Icon) {
            parameters += renderWsdbStatSlot(detail.setSkill1Icon, '', detail.setSkill1Name || '');
            contentCount++;
        }
        if (detail.setSkill2Icon) {
            parameters += renderWsdbStatSlot(detail.setSkill2Icon, '', detail.setSkill2Name || '');
            contentCount++;
        }
    }

    if (detail && detail.crystalIcon) {
        enchants += renderWsdbStatSlot(detail.crystalIcon, '', detail.crystalName || '');
    } else {
        enchants += renderWsdbEmptySlot('Cristal');
    }
    if (detail && detail.runeIcon) {
        enchants += renderWsdbStatSlot(detail.runeIcon, '', detail.runeName || '');
    } else {
        enchants += renderWsdbEmptySlot('Runa');
    }

    if (contentCount === 0) return '';
    return `<div class="item-stats wsdb-item-viewer">
        <div class="wsdb-view-item-head">
            <img src="${itemImage}" alt="${escapeHtml(item.nome)}">
            <span class="rarity-name-${rarityColor}">${escapeHtml(item.nome)}</span>
            <em class="rarity-pill rarity-${rarityColor}">${rar}</em>
        </div>
        <div class="wsdb-view-body">
            <div class="wsdb-view-top">
                ${renderWsdbSection('Requisitos', requirements, 'requirements')}
                ${renderWsdbSection('Parâmetros', parameters, 'parameters')}
            </div>
            ${renderWsdbSection('Bônus', bonuses, 'bonuses')}
            ${renderWsdbSection('Encantamentos', enchants, 'enchants')}
        </div>
    </div>`;
}

function isOutfitAttrs(rawAttrs) {
    return rawAttrs && Number(rawAttrs.itemType) === 19 && rawAttrs.render != null;
}

function shouldShowOutfitPreview(item, rawAttrs, categoryPath) {
    const text = [item.nome, item.geral_nome, item.categoria_nome, item.subcategoria_nome, categoryPath].join(' ').toLowerCase();
    return Number(rawAttrs?.itemType) === 19 || text.includes('traje');
}

function renderOutfitIcon(name) {
    const icons = {
        male: '<span class="outfit-wsdb-icon outfit-wsdb-gender-icon outfit-wsdb-gender-male" aria-hidden="true"></span>',
        female: '<span class="outfit-wsdb-icon outfit-wsdb-gender-icon outfit-wsdb-gender-female" aria-hidden="true"></span>',
        hair: '<span class="outfit-wsdb-icon outfit-wsdb-icon-hair" aria-hidden="true"></span>',
        palette: '<span class="outfit-wsdb-icon outfit-wsdb-icon-palette" aria-hidden="true"></span>',
        reset: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7"></path><path d="M3 4v6h6"></path></svg>'
    };
    return icons[name] || '';
}

function renderOutfitControlHTML(control, icon, label) {
    return `<button class="outfit-control-btn outfit-slot-button" type="button" data-outfit-action="${control}" data-outfit-label="${control}" aria-label="${label}" title="${label}">${renderOutfitIcon(icon)}</button>`;
}

function renderOutfitPreviewHTML(item, rawAttrs, itemImage, canRenderOutfit) {
    const controlsHTML = canRenderOutfit ? `
        <div class="outfit-controls" aria-label="Personalizacao da visualizacao">
            ${renderOutfitControlHTML('gender', 'male', 'Sexo do personagem')}
            ${renderOutfitControlHTML('haircut', 'hair', 'Corte de cabelo')}
            ${renderOutfitControlHTML('hair-color', 'palette', 'Cor do cabelo')}
            <button class="outfit-control-btn outfit-slot-button outfit-reset-btn" type="button" data-outfit-action="reset" aria-label="Voltar para o padrao" title="Voltar para o padrao">${renderOutfitIcon('reset')}</button>
        </div>` : '';
    const stageHTML = canRenderOutfit
        ? '<div class="outfit-stage"><span class="outfit-loading">Carregando visual...</span><canvas class="outfit-canvas" width="36" height="42"></canvas></div>'
        : `<div class="outfit-stage outfit-stage-fallback"><img src="${itemImage}" alt="${escapeHtml(item.nome)}"></div>`;

    return `<section class="outfit-preview-box" aria-label="Visualizar traje">
        <div class="outfit-preview-title">Visualizar item</div>
        <div class="outfit-preview-name">
            <img src="${itemImage}" alt="${escapeHtml(item.nome)}">
            <span class="rarity-name-${Number(rawAttrs?.color || 0)}">${escapeHtml(item.nome)}</span>
        </div>
        ${controlsHTML}
        ${stageHTML}
        <div class="outfit-picker-host"></div>
    </section>`;
}

// Mapas de troca de cor de pele por raca (source->destination)
const WSDB_SKINS = {
    HUMAN: [{s:56089,d:2186661},{s:65313,d:9223910},{s:3271498,d:4883141},{s:10288037,d:13559799}],
    MOUNTAIN: [{s:56089,d:4350356},{s:65313,d:10275558},{s:3271498,d:7050949},{s:10288037,d:13559799}],
    ELF: [{s:56089,d:4353428},{s:65313,d:10278886},{s:3271498,d:7055045},{s:10288037,d:13561847}],
    DEAD: [{s:56089,d:7043468},{s:65313,d:11912910},{s:3271498,d:8096412},{s:10288037,d:13559799}]
};
const WSDB_SKIN_BY_RACE = { 1: WSDB_SKINS.HUMAN, 2: WSDB_SKINS.MOUNTAIN, 3: WSDB_SKINS.ELF, 4: WSDB_SKINS.DEAD };
const OUTFIT_DEFAULT_RACE = 2;
const OUTFIT_DEFAULT_GENDER = 0;
const OUTFIT_DEFAULT_HAIR_COLOR = 8421504;
const OUTFIT_HAIRCUT_CACHE = new Map();
const OUTFIT_HEAD_PREVIEW_CACHE = new Map();
const OUTFIT_PREVIEW_PRELOADS = new Set();
const OUTFIT_HAIR_COLORS = [
    {id: 'default', color: [128, 128, 128]},
    {id: 0, color: [0, 16, 132]},
    {id: 1, color: [214, 69, 66]},
    {id: 2, color: [181, 202, 132]},
    {id: 3, color: [90, 243, 222]},
    {id: 4, color: [123, 231, 222]},
    {id: 5, color: [181, 61, 230]},
    {id: 6, color: [66, 223, 156]},
    {id: 7, color: [222, 210, 33]},
    {id: 8, color: [33, 89, 16]},
    {id: 9, color: [49, 49, 8]},
    {id: 10, color: [206, 219, 99]},
    {id: 11, color: [132, 16, 25]},
    {id: 12, color: [247, 198, 41]},
    {id: 13, color: [115, 198, 132]},
    {id: 14, color: [41, 40, 107]},
    {id: 15, color: [66, 69, 181]},
    {id: 16, color: [156, 109, 247]},
    {id: 17, color: [25, 121, 255]},
    {id: 18, color: [222, 255, 255]},
    {id: 19, color: [156, 219, 165]},
    {id: 20, color: [115, 206, 90]},
    {id: 21, color: [25, 178, 206]},
    {id: 22, color: [66, 150, 181]},
    {id: 23, color: [140, 219, 66]},
    {id: 24, color: [0, 0, 0]},
    {id: 25, color: [8, 61, 230]},
    {id: 26, color: [0, 69, 165]},
    {id: 27, color: [173, 65, 107]},
    {id: 28, color: [0, 235, 255]},
    {id: 29, color: [16, 117, 173]},
    {id: 30, color: [214, 105, 107]},
    {id: 31, color: [25, 194, 173]},
    {id: 32, color: [181, 210, 123]},
    {id: 33, color: [214, 73, 230]},
    {id: 34, color: [222, 215, 189]},
    {id: 35, color: [0, 227, 0]},
    {id: 36, color: [255, 105, 99]},
    {id: 37, color: [255, 255, 255]}
].map(entry => ({
    ...entry,
    value: entry.color[2] << 16 | entry.color[1] << 8 | entry.color[0]
}));

const OUTFIT_CW = 36, OUTFIT_CH = 42;
const WSDB_TEXTURES = {
    CAPE:     ['cape',   'cloakD',     {x: 3, y: 11}],
    BODY:     ['body',   'bodyD',      {x: 6, y: 11}],
    HEAD:     ['head',   'headD',      {x: 6, y: 3}],
    LEGS:     ['legs',   'leg_d4',     {mirrorX: -13, normalX: 13, y: 22}],
    HAND:     ['hands',  'handD1',     {mirrorX: -25, normalX: 1, y: 13}],
    SHOULDER: ['body',   'shoulderD1', {mirrorX: -28, normalX: -2, y: 4}],
    HAIR:     ['hair',   'hairD',      {x: 3, y: -3}],
    HELMET:   ['helmet', 'helmetD',    {x: -1, y: -20}],
    EARS:     ['ears',   'ears_front', {mirrorX: -10, normalX: 16, y: 6}]
};

function wsdbTextureUrl(part, id, file) {
    // Dev local: proxy PHP com query params
    // Producao (Vercel): reverse proxy via path segments → wsdb.xyz/textures/...
    const isLocal = /^(https?:\/\/)?(127\.0\.0\.1|localhost|file:)/i.test(window.location.origin || '') || window.location.protocol === 'file:';
    if (isLocal) {
        return `api/texture.php?part=${encodeURIComponent(part)}&id=${encodeURIComponent(id)}&file=${encodeURIComponent(file)}&fallback=empty`;
    }
    return `api/texture/${encodeURIComponent(part)}/${encodeURIComponent(id)}/${encodeURIComponent(file)}.webp`;
}

const WSDB_TEXTURE_CACHE = new Map();
const WSDB_TINT_CACHE = new Map();

function loadWsdbTexture(part, id, file) {
    const cacheKey = `${part}/${id}/${file}`;
    if (WSDB_TEXTURE_CACHE.has(cacheKey)) return WSDB_TEXTURE_CACHE.get(cacheKey);
    const promise = new Promise(resolve => {
        if (!id) { resolve(null); return; }
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = wsdbTextureUrl(part, id, file);
    });
    WSDB_TEXTURE_CACHE.set(cacheKey, promise);
    return promise;
}

function colorIntToRgb(value) {
    return [(16711680 & value) >> 16, (65280 & value) >> 8, (255 & value) >> 0];
}
function rgbToInt(r, g, b) { return r << 16 | g << 8 | b; }

function imageToData(img) {
    const canvas = document.createElement('canvas');
    canvas.width = img.width; canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0);
    return ctx.getImageData(0, 0, img.width, img.height);
}

function imageDataToImage(data) {
    return new Promise(resolve => {
        const canvas = document.createElement('canvas');
        canvas.width = data.width; canvas.height = data.height;
        const ctx = canvas.getContext('2d');
        ctx.putImageData(data, 0, 0);
        const img = new Image();
        img.onload = () => resolve(img);
        img.src = canvas.toDataURL('image/png');
    });
}

async function tintWsdbImage(img, color, protectedColors = []) {
    if (!img || Number(color) === 8421504) return img;
    const protectedKey = protectedColors.map(c => `${c.s}:${c.d}`).join('|');
    const tintKey = `${img.src}|${Number(color)}|${protectedKey}`;
    if (WSDB_TINT_CACHE.has(tintKey)) return WSDB_TINT_CACHE.get(tintKey);
    const data = imageToData(img);
    const protectedSet = new Set(protectedColors.map(c => c.s));
    const shift = colorIntToRgb(Number(color)).map(v => v - 128);
    const snap = [0,15,23,31,39,47,55,63,71,79,87,95,103,111,119,127,135,143,151,159,167,175,183,191,199,207,215,223,231,239,247,255];
    for (let i = 0; i < data.data.length; i += 4) {
        const key = rgbToInt(data.data[i + 2], data.data[i + 1], data.data[i]);
        if (data.data[i + 3] && !protectedSet.has(key)) {
            for (let c = 0; c < 3; c++) {
                const next = Math.min(Math.max(data.data[i + c] + shift[c], 0), 255);
                data.data[i + c] = snap[Math.floor(next / 8)];
            }
        }
    }
    const tinted = imageDataToImage(data);
    WSDB_TINT_CACHE.set(tintKey, tinted);
    return tinted;
}

function replaceSkinColors(ctx, skin) {
    const data = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    const map = skin.map(c => ({s: c.s, d: colorIntToRgb(c.d)}));
    for (let i = 0; i < data.data.length; i += 4) {
        const key = rgbToInt(data.data[i + 2], data.data[i + 1], data.data[i]);
        const hit = map.find(c => c.s === key);
        if (data.data[i + 3] && hit) {
            data.data[i] = hit.d[2];
            data.data[i + 1] = hit.d[1];
            data.data[i + 2] = hit.d[0];
        }
    }
    ctx.putImageData(data, 0, 0);
}

function canvasToTrimmedDataUrl(canvas, padding = 2) {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let minX = canvas.width;
    let minY = canvas.height;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
            if (data.data[(y * canvas.width + x) * 4 + 3] === 0) continue;
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
        }
    }

    if (maxX < minX || maxY < minY) return canvas.toDataURL('image/png');

    const width = maxX - minX + 1;
    const height = maxY - minY + 1;
    const size = Math.max(width, height) + padding * 2;
    const output = document.createElement('canvas');
    output.width = size;
    output.height = size;
    const outputCtx = output.getContext('2d');
    outputCtx.imageSmoothingEnabled = false;
    outputCtx.drawImage(
        canvas,
        minX,
        minY,
        width,
        height,
        Math.floor((size - width) / 2),
        Math.floor((size - height) / 2),
        width,
        height
    );
    return output.toDataURL('image/png');
}

async function drawTexture(ctx, key, id, color = 8421504, skin = []) {
    const [part, file, pos] = WSDB_TEXTURES[key];
    let img = await loadWsdbTexture(part, id || 1, file);
    if (!img || !img.width) return;
    img = await tintWsdbImage(img, Number(color || 8421504), skin);

    if (pos.mirrorX !== undefined) {
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(img, pos.mirrorX, pos.y);
        ctx.restore();
        ctx.drawImage(img, pos.normalX, pos.y);
        return;
    }
    ctx.drawImage(img, pos.x, pos.y);
}

function getOutfitBase(gender) {
    return Math.max(1, 2 * OUTFIT_DEFAULT_RACE - 1 - Number(gender || 0));
}

function sanitizeHaircutList(data) {
    const list = Array.isArray(data?.list) ? data.list : [];
    return [...new Set(list.map(Number).filter(id => Number.isInteger(id) && id >= 0))];
}

function findClosestHaircutIndex(list, preferredId) {
    if (!list.length) return 0;
    const exact = list.indexOf(Number(preferredId));
    if (exact >= 0) return exact;
    return list.reduce((bestIndex, id, index) => {
        const bestDistance = Math.abs(list[bestIndex] - preferredId);
        const distance = Math.abs(id - preferredId);
        return distance < bestDistance ? index : bestIndex;
    }, 0);
}

function findHairColorIndex(color) {
    const index = OUTFIT_HAIR_COLORS.findIndex(item => item.value === Number(color));
    return index >= 0 ? index : 0;
}

function wrapIndex(index, length) {
    if (length <= 0) return 0;
    return (index % length + length) % length;
}

async function loadOutfitHaircuts(gender) {
    const normalizedGender = Number(gender) === 1 ? 1 : 0;
    if (OUTFIT_HAIRCUT_CACHE.has(normalizedGender)) return OUTFIT_HAIRCUT_CACHE.get(normalizedGender);

    const promise = (async () => {
        try {
            const data = typeof fetchJSON === 'function'
                ? await fetchJSON(`haircuts.php?gender=${normalizedGender}`)
                : await fetch(`api/haircuts.php?gender=${normalizedGender}`).then(response => response.json());
            const list = sanitizeHaircutList(data);
            if (list.length) return list;
        } catch (error) {
            console.warn('Falha ao carregar cortes pelo proxy local.', error);
        }

        try {
            const response = await fetch(`https://wsdb.xyz/api/data/haircuts/${normalizedGender}`);
            const list = sanitizeHaircutList(await response.json());
            if (list.length) return list;
        } catch (error) {
            console.warn('Falha ao carregar cortes do WSDB.', error);
        }

        return [getOutfitBase(normalizedGender)];
    })();

    OUTFIT_HAIRCUT_CACHE.set(normalizedGender, promise);
    return promise;
}

function getSelectedHairColor(state) {
    return OUTFIT_HAIR_COLORS[state.hairColorIndex]?.value || OUTFIT_DEFAULT_HAIR_COLOR;
}

async function renderOutfitHeadPreview(gender, hairId, hairColor) {
    const race = OUTFIT_DEFAULT_RACE;
    const normalizedGender = Number(gender) === 1 ? 1 : 0;
    const color = Number(hairColor || OUTFIT_DEFAULT_HAIR_COLOR);
    const cacheKey = `${normalizedGender}:${Number(hairId)}:${color}`;
    if (OUTFIT_HEAD_PREVIEW_CACHE.has(cacheKey)) return OUTFIT_HEAD_PREVIEW_CACHE.get(cacheKey);

    const promise = (async () => {
        const canvas = document.createElement('canvas');
        canvas.width = 28;
        canvas.height = 28;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.imageSmoothingEnabled = false;
        const base = getOutfitBase(normalizedGender);
        const skin = WSDB_SKIN_BY_RACE[race] || WSDB_SKINS.MOUNTAIN;

        if (race === 3) await drawTexture(ctx, 'EARS', 1);
        await drawTexture(ctx, 'HEAD', base);
        await drawTexture(ctx, 'HAIR', Number(hairId || base), color, skin);
        replaceSkinColors(ctx, skin);
        return canvasToTrimmedDataUrl(canvas);
    })();

    OUTFIT_HEAD_PREVIEW_CACHE.set(cacheKey, promise);
    return promise;
}

function scheduleOutfitTask(callback) {
    if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(callback, { timeout: 1200 });
        return;
    }
    setTimeout(callback, 50);
}

function preloadOutfitHeadPreviews(gender, haircuts, hairColor) {
    const normalizedGender = Number(gender) === 1 ? 1 : 0;
    const color = Number(hairColor || OUTFIT_DEFAULT_HAIR_COLOR);
    const list = [...new Set((haircuts || []).map(Number).filter(id => Number.isInteger(id) && id >= 0))];
    if (!list.length) return;

    const preloadKey = `${normalizedGender}:${color}:${list.join(',')}`;
    if (OUTFIT_PREVIEW_PRELOADS.has(preloadKey)) return;
    OUTFIT_PREVIEW_PRELOADS.add(preloadKey);

    scheduleOutfitTask(() => {
        let index = 0;
        const workerCount = Math.min(8, list.length);
        const worker = async () => {
            while (index < list.length) {
                const hairId = list[index++];
                await renderOutfitHeadPreview(normalizedGender, hairId, color);
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        };
        Promise.all(Array.from({ length: workerCount }, worker)).catch(error => {
            console.warn('Falha ao pre-carregar cortes de cabelo.', error);
        });
    });
}

function updateOutfitControls(root, state) {
    const controls = root.querySelector('.outfit-controls');
    if (!controls) return;

    controls.classList.toggle('is-loading', !!state.loadingHaircuts);
    const genderLabel = state.gender === 1 ? 'Feminino' : 'Masculino';
    const haircutId = state.haircuts[state.haircutIndex] || getOutfitBase(state.gender);
    const color = OUTFIT_HAIR_COLORS[state.hairColorIndex] || OUTFIT_HAIR_COLORS[0];

    const genderBtn = controls.querySelector('[data-outfit-label="gender"]');
    if (genderBtn) {
        genderBtn.innerHTML = renderOutfitIcon(state.gender === 1 ? 'female' : 'male');
        genderBtn.setAttribute('aria-label', `Sexo do personagem: ${genderLabel}`);
        genderBtn.title = `Sexo: ${genderLabel}`;
    }

    const haircutBtn = controls.querySelector('[data-outfit-label="haircut"]');
    if (haircutBtn) {
        haircutBtn.setAttribute('aria-label', `Corte de cabelo: ${haircutId}`);
        haircutBtn.title = `Corte de cabelo: ${haircutId}`;
    }

    const colorBtn = controls.querySelector('[data-outfit-label="hair-color"]');
    if (colorBtn) {
        colorBtn.setAttribute('aria-label', color.id === 'default' ? 'Cor do cabelo: padrao' : `Cor do cabelo: ${color.id}`);
        colorBtn.title = color.id === 'default' ? 'Cor do cabelo: padrao' : `Cor do cabelo: ${color.id}`;
    }
}

async function initializeOutfitPreview(root, rawAttrs) {
    const canvas = root.querySelector('.outfit-canvas');
    if (!canvas || !isOutfitAttrs(rawAttrs)) return;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const buffer = document.createElement('canvas');
    buffer.width = canvas.width;
    buffer.height = canvas.height;
    const bufferCtx = buffer.getContext('2d', { willReadFrequently: true });
    bufferCtx.imageSmoothingEnabled = false;
    const controls = root.querySelector('.outfit-controls');
    const state = {
        gender: OUTFIT_DEFAULT_GENDER,
        haircuts: [],
        haircutIndex: 0,
        hairColorIndex: findHairColorIndex(OUTFIT_DEFAULT_HAIR_COLOR),
        loadingHaircuts: false
    };
    let drawToken = 0;
    let hairLoadToken = 0;

    async function drawOutfit() {
        const token = ++drawToken;
        bufferCtx.clearRect(0, 0, buffer.width, buffer.height);

        const race = OUTFIT_DEFAULT_RACE;
        const gender = state.gender;
        const base = Math.max(1, 2 * race - 1 - gender);
        const skin = WSDB_SKIN_BY_RACE[race] || WSDB_SKINS.MOUNTAIN;
        const hairId = state.haircuts[state.haircutIndex] || base;
        const hairColor = getSelectedHairColor(state);

        if (rawAttrs.cape) await drawTexture(bufferCtx, 'CAPE', rawAttrs.cape, rawAttrs.capeColor, skin);

        await drawTexture(bufferCtx, 'LEGS', rawAttrs.legs || base, rawAttrs.legsColor, skin);

        await drawTexture(bufferCtx, 'BODY', rawAttrs.body || base, rawAttrs.bodyColor, skin);

        await drawTexture(bufferCtx, 'SHOULDER', rawAttrs.hand || base, rawAttrs.handColor, skin);

        await drawTexture(bufferCtx, 'HAND', rawAttrs.hand || base, rawAttrs.handColor, skin);

        if (race === 3) await drawTexture(bufferCtx, 'EARS', 1);

        await drawTexture(bufferCtx, 'HEAD', base);

        if (Number(rawAttrs.render ?? 1) !== 0) {
            await drawTexture(bufferCtx, 'HAIR', hairId, hairColor, skin);
        }

        if (rawAttrs.head) await drawTexture(bufferCtx, 'HELMET', rawAttrs.head, rawAttrs.headColor, skin);

        replaceSkinColors(bufferCtx, skin);
        if (token === drawToken) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(buffer, 0, 0);
            canvas.classList.add('is-ready');
            const loading = root.querySelector('.outfit-loading');
            if (loading) loading.remove();
        }
    }

    async function setGender(gender, preserveHair = true) {
        const token = ++hairLoadToken;
        const previousHair = state.haircuts[state.haircutIndex] || getOutfitBase(state.gender);
        state.gender = Number(gender) === 1 ? 1 : 0;
        state.loadingHaircuts = true;
        updateOutfitControls(root, state);

        const haircuts = await loadOutfitHaircuts(state.gender);
        if (token !== hairLoadToken) return;

        state.haircuts = haircuts;
        state.haircutIndex = findClosestHaircutIndex(
            state.haircuts,
            preserveHair ? previousHair : getOutfitBase(state.gender)
        );
        state.loadingHaircuts = false;
        updateOutfitControls(root, state);
        await drawOutfit();
        preloadOutfitHeadPreviews(state.gender, state.haircuts, getSelectedHairColor(state));
    }

    function closeOutfitPicker() {
        root.querySelector('.outfit-picker')?.remove();
    }

    function openOutfitPicker(title, contentHTML) {
        const host = root.querySelector('.outfit-picker-host');
        if (!host) return null;
        host.innerHTML = `<div class="outfit-picker" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
            <div class="outfit-picker-panel">
                <div class="outfit-picker-title">
                    <span>${escapeHtml(title)}</span>
                    <button class="outfit-picker-close" type="button" data-outfit-picker-close aria-label="Fechar" title="Fechar">X</button>
                </div>
                <div class="outfit-picker-content">${contentHTML}</div>
            </div>
        </div>`;
        return host.querySelector('.outfit-picker-content');
    }

    function renderPickerSlot(type, value, label, contentHTML, selected = false) {
        return `<button class="outfit-picker-option outfit-slot-button${selected ? ' is-selected' : ''}" type="button" data-outfit-option="${type}" data-outfit-value="${value}" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}">${contentHTML}</button>`;
    }

    function renderPreviewPickerSlot(type, value, label, selected = false) {
        const previewKey = `${type}:${value}`;
        const html = renderPickerSlot(
            type,
            value,
            label,
            `<img class="outfit-picker-preview" data-outfit-preview="${escapeHtml(previewKey)}" alt="">`,
            selected
        );
        return { previewKey, html };
    }

    function hydratePickerPreviewImages(content, entries) {
        if (!content || !entries.length) return;
        const images = new Map(
            [...content.querySelectorAll('[data-outfit-preview]')].map(img => [img.dataset.outfitPreview, img])
        );
        let index = 0;
        const workerCount = Math.min(8, entries.length);
        const worker = async () => {
            while (index < entries.length) {
                const entry = entries[index++];
                const img = images.get(entry.previewKey);
                if (!img || !img.isConnected) continue;
                try {
                    const src = await entry.src();
                    if (img.isConnected) img.src = src;
                } catch (error) {
                    console.warn('Falha ao renderizar previa do visual.', error);
                }
            }
        };
        Promise.all(Array.from({ length: workerCount }, worker)).catch(error => {
            console.warn('Falha ao preencher a grade de personalizacao.', error);
        });
    }

    function openGenderPicker() {
        openOutfitPicker('Escolha o sexo', `
            <div class="outfit-picker-grid compact">
                ${renderPickerSlot('gender', 0, 'Masculino', renderOutfitIcon('male'), state.gender === 0)}
                ${renderPickerSlot('gender', 1, 'Feminino', renderOutfitIcon('female'), state.gender === 1)}
            </div>`);
    }

    async function openHaircutPicker() {
        const content = openOutfitPicker('Escolha o corte de cabelo', '<div class="outfit-picker-loading">Carregando...</div>');
        if (!content) return;
        const haircuts = state.haircuts.length ? state.haircuts : await loadOutfitHaircuts(state.gender);
        const currentHair = haircuts[state.haircutIndex] || getOutfitBase(state.gender);
        const color = getSelectedHairColor(state);
        const entries = haircuts.map(hairId => {
            const slot = renderPreviewPickerSlot('haircut', hairId, `Corte de cabelo ${hairId}`, hairId === currentHair);
            return {
                ...slot,
                src: () => renderOutfitHeadPreview(state.gender, hairId, color)
            };
        });
        content.innerHTML = `<div class="outfit-picker-grid">${entries.map(entry => entry.html).join('')}</div>`;
        hydratePickerPreviewImages(content, entries);
        preloadOutfitHeadPreviews(state.gender, haircuts, color);
    }

    async function openHairColorPicker() {
        const content = openOutfitPicker('Escolha a cor', '<div class="outfit-picker-loading">Carregando...</div>');
        if (!content) return;
        const hairId = state.haircuts[state.haircutIndex] || getOutfitBase(state.gender);
        const entries = OUTFIT_HAIR_COLORS.map((item, index) => {
            const label = item.id === 'default' ? 'Cor padrao' : `Cor ${item.id}`;
            const slot = renderPreviewPickerSlot('hair-color', index, label, index === state.hairColorIndex);
            return {
                ...slot,
                src: () => renderOutfitHeadPreview(state.gender, hairId, item.value)
            };
        });
        content.innerHTML = `<div class="outfit-picker-grid">${entries.map(entry => entry.html).join('')}</div>`;
        hydratePickerPreviewImages(content, entries);
    }

    function setHaircut(hairId) {
        const index = state.haircuts.indexOf(Number(hairId));
        if (index < 0) return;
        state.haircutIndex = index;
        updateOutfitControls(root, state);
        drawOutfit();
    }

    function setHairColor(index) {
        state.hairColorIndex = wrapIndex(Number(index), OUTFIT_HAIR_COLORS.length);
        updateOutfitControls(root, state);
        drawOutfit();
        preloadOutfitHeadPreviews(state.gender, state.haircuts, getSelectedHairColor(state));
    }

    async function resetOutfitCustomization() {
        closeOutfitPicker();
        state.hairColorIndex = findHairColorIndex(OUTFIT_DEFAULT_HAIR_COLOR);
        await setGender(OUTFIT_DEFAULT_GENDER, false);
    }

    controls?.addEventListener('click', event => {
        const button = event.target.closest('button[data-outfit-action]');
        if (!button || state.loadingHaircuts) return;

        const action = button.dataset.outfitAction;
        if (action === 'gender') {
            openGenderPicker();
        } else if (action === 'haircut') {
            openHaircutPicker();
        } else if (action === 'hair-color') {
            openHairColorPicker();
        } else if (action === 'reset') {
            resetOutfitCustomization();
        }
    });

    root.addEventListener('click', event => {
        if (event.target.closest('[data-outfit-picker-close]')) {
            closeOutfitPicker();
            return;
        }

        const option = event.target.closest('[data-outfit-option]');
        if (!option || state.loadingHaircuts) return;

        const type = option.dataset.outfitOption;
        const value = option.dataset.outfitValue;
        if (type === 'gender') {
            setGender(Number(value), true).then(closeOutfitPicker);
        } else if (type === 'haircut') {
            setHaircut(value);
            closeOutfitPicker();
        } else if (type === 'hair-color') {
            setHairColor(value);
            closeOutfitPicker();
        }
    });

    updateOutfitControls(root, state);
    await setGender(OUTFIT_DEFAULT_GENDER, false);
}

async function renderItemDetails(container) {
    let item = APP_STATE.itemsList.find(i => i.id === APP_STATE.currentItemId) || APP_STATE.allItems.find(i => i.id === APP_STATE.currentItemId);
    if (!item && APP_STATE.currentItemId != null) {
        try {
            const data = await fetchJSON(`items.php?id=${APP_STATE.currentItemId}`);
            if (data) item = sanitizeItems([data])[0];
        } catch (e) {
            console.error(e);
        }
    }
    if (!item) { showToast('Item nao encontrado', 'error'); goBack(); return; }

    let attrs = parseJSONValue(item.template_atributos);
    let rawAttrs = parseJSONValue(item.template_atributos_raw);
    if (!attrs && rawAttrs) attrs = { level: rawAttrs.level, color: rawAttrs.color };

    if (!attrs && !rawAttrs) {
        try {
            const templates = await fetchJSON(`templates.php?search=${encodeURIComponent(item.nome)}`);
            const match = (templates || []).find(t => t.nome === item.nome) || (templates || [])[0];
            if (match) {
                attrs = parseJSONValue(match.atributos);
                rawAttrs = parseJSONValue(match.atributos_detalhes);
                if (!attrs && rawAttrs) attrs = { level: rawAttrs.level, color: rawAttrs.color };
            }
        } catch (_) {}
    }

    const categoryPath = typeof translateCategoryPath === 'function'
        ? (translateCategoryPath([item.geral_nome, item.categoria_nome, item.subcategoria_nome], ' > ') || translateCategoryName('Item do mercado'))
        : ([item.geral_nome, item.categoria_nome, item.subcategoria_nome].filter(Boolean).join(' > ') || 'Item do mercado');
    const stockCount = Number(item.quantidade_disponivel || 0);
    const isSoldOut = stockCount === 0;
    const coinText = formatGoldValue(item.preco_moedas);
    const fullCoinText = formatGoldValue(item.preco_moedas, { compact: false });
    const goldFit = getGoldFitClass(item.preco_moedas);
    const itemImage = resolveImage(item.imagem_url || item.template_imagem, CONFIG.PLACEHOLDER_IMAGE_200);
    const statsHTML = attrs ? renderStatsHTML(attrs, rawAttrs, item, itemImage) : '';
    const pBRL = formatCurrencyBRL(resolveBRLValue(item));
    const canRenderOutfit = isOutfitAttrs(rawAttrs);
    const showOutfitPreview = shouldShowOutfitPreview(item, rawAttrs, categoryPath);
    const outfitHTML = showOutfitPreview ? renderOutfitPreviewHTML(item, rawAttrs || attrs || {}, itemImage, canRenderOutfit) : '';
    const statsSectionHTML = statsHTML ? `<section class="item-spec-section" aria-label="Atributos do item">${statsHTML}</section>` : '';
    const detailMainHTML = statsSectionHTML || outfitHTML || '<section class="item-spec-section"><div class="item-stats wsdb-item-viewer empty-stats">Item sem visualizacao disponivel.</div></section>';
    const reviewsSectionHTML = `<section class="item-reviews" id="item-reviews-${item.id}">
        <div class="reviews-head">
            <div>
                <h2 class="reviews-title">Avaliações</h2>
                <span>Opiniões de compradores</span>
            </div>
            <div class="reviews-summary" id="reviews-summary-${item.id}">
                <div class="reviews-loading">Carregando...</div>
            </div>
        </div>
        <div class="reviews-list" id="reviews-list-${item.id}"></div>
        ${APP_STATE.currentUser.isLoggedIn ? `
        <div class="review-form" id="review-form-${item.id}">
            <h3>Escreva uma avaliação</h3>
            <div class="review-form-grid">
                <label class="review-form-field">Nota
                    <select id="review-stars" class="review-stars-select">
                        <option value="5">5 ★★★★★</option>
                        <option value="4">4 ★★★★</option>
                        <option value="3">3 ★★★</option>
                        <option value="2">2 ★★</option>
                        <option value="1">1 ★</option>
                    </select>
                </label>
                <label class="review-form-field checkbox-field"><input type="checkbox" id="review-comprou"> Comprei este item</label>
            </div>
            <label class="review-form-field">Comentário
                <textarea id="review-comment" rows="2" placeholder="Conte como foi a compra..."></textarea>
            </label>
            <button class="login-btn" onclick="submitReview(${item.id})">Enviar avaliação</button>
        </div>` : ''}
    </section>`;

    container.innerHTML = `
        <section class="panel item-showcase-panel item-showcase-panel-preview-first item-ad-preview-panel" role="dialog" aria-labelledby="item-detail-title">
            <div class="corner top-left"></div>
            <div class="corner top-right"></div>
            <div class="item-detail-topline">
                <button class="item-detail-back-button" type="button" onclick="goBack()" aria-label="Voltar">
                    <span aria-hidden="true">&larr;</span>
                    <strong>Voltar</strong>
                </button>
                <h1 class="item-detail-heading" id="item-detail-title">${escapeHtml(item.nome)}</h1>
            </div>
            <div class="item-showcase ${outfitHTML ? 'has-outfit-preview' : 'no-outfit-preview'} ${statsHTML ? 'has-stats' : 'no-stats'}">
                ${detailMainHTML}
                ${statsSectionHTML && outfitHTML ? outfitHTML : ''}
                <main class="item-buy-card">
                    <div class="item-buy-head">
                        <span class="item-store-tag">Oferta ativa</span>
                        <p>${escapeHtml(item.descricao || 'Sem descricao')}</p>
                    </div>
                    <div class="item-price-stack">
                        <div class="item-price-card primary">
                            <span><i class="price-icon game-coin" aria-hidden="true"></i> Moedas</span>
                            <strong class="${goldFit}" title="${fullCoinText}">${coinText}</strong>
                        </div>
                        <div class="item-price-card">
                            <span><i class="price-icon brl-coin" aria-hidden="true"></i> Preco em R$</span>
                            <strong>${pBRL}</strong>
                        </div>
                    </div>
                    <div class="purchase-actions">
                        ${isSoldOut ? '' : (APP_STATE.currentUser.isLoggedIn
                            ? `<button type="button" class="btn-whatsapp item-primary-buy" onclick="whatsBuy(${item.id})"><span class="wa-icon" aria-hidden="true"></span>Comprar no WhatsApp</button>
                            <button type="button" class="btn-whatsapp" onclick="addToCart(${item.id})" style="margin-top:8px;"><span aria-hidden="true" style="font-size:18px;">🛒</span>Adicionar ao carrinho</button>
                            ${(item.id_vendedor) ? `<button type="button" class="btn-whatsapp" onclick="openChatWithSeller(${item.id_vendedor}, ${item.id})" style="margin-top:8px;"><span aria-hidden="true" style="font-size:18px;">💬</span>Chat com vendedor</button>` : ''}`
                            : `<button type="button" class="btn-whatsapp item-primary-buy" onclick="showQuickLogin()"><span class="wa-icon" aria-hidden="true"></span>Faça login para comprar</button>`
                        )}
                        <button type="button" class="btn-whatsapp" onclick="shareItem(${item.id})" style="margin-top:8px;"><span aria-hidden="true" style="font-size:18px;">🔗</span>Compartilhar</button>
                    </div>
                </main>
                ${reviewsSectionHTML}
            </div>
            <div class="footer item-showcase-footer"><button class="login-btn" onclick="goBack()">VOLTAR</button></div>
        </section>`;
    if (canRenderOutfit) initializeOutfitPreview(container, rawAttrs);

    // Load and render reviews
    loadReviews(item.id).then(function(reviewData) {
        var summaryEl = document.getElementById('reviews-summary-' + item.id);
        var listEl = document.getElementById('reviews-list-' + item.id);
        if (!summaryEl) return;

        if (reviewData && reviewData.media !== undefined) {
            summaryEl.innerHTML = '<div class="reviews-average">' + renderStars(reviewData.media) + ' <span class="reviews-count">(' + reviewData.total + ')</span></div>';
        }

        if (reviewData && reviewData.reviews && reviewData.reviews.length) {
            listEl.innerHTML = reviewData.reviews.map(function(r) {
                return '<div class="review-item">' +
                    '<div class="review-header">' +
                        '<strong>' + escapeHtml(r.usuario_nome || 'Anônimo') + '</strong>' +
                        '<span class="review-stars">' + renderStars(r.estrelas) + '</span>' +
                        '<span class="review-date">' + (r.criado_em ? new Date(r.criado_em).toLocaleDateString('pt-BR') : '') + '</span>' +
                    '</div>' +
                    (r.comentario ? '<div class="review-comment">' + escapeHtml(r.comentario) + '</div>' : '') +
                    (r.comprou ? '<div class="review-comprou-badge">Compra confirmada</div>' : '') +
                '</div>';
            }).join('');
        } else {
            listEl.innerHTML = '<div class="review-empty">Nenhuma avaliação ainda.</div>';
        }
    }).catch(function() {
        var summaryEl = document.getElementById('reviews-summary-' + item.id);
        if (summaryEl) summaryEl.innerHTML = '<div class="reviews-loading">Erro ao carregar avaliações.</div>';
    });
}

function buildWhatsAppLink(item) {
    // Prefer seller's WhatsApp number, fall back to global admin number
    const sellerNumber = (item.vendedor_whatsapp || '').replace(/\D+/g, '');
    const globalNumber = (APP_STATE.settings.whatsapp_number || '').replace(/\D+/g, '');
    const number = sellerNumber || globalNumber;
    if (!number) return null;
    const pBRL = formatCurrencyBRL(resolveBRLValue(item));
    const pCoins = formatGoldValue(item.preco_moedas, { compact: false }).replace(/\u00a0/g, '.');
    const categoryPath = typeof translateCategoryPath === 'function'
        ? (translateCategoryPath([item.geral_nome, item.categoria_nome, item.subcategoria_nome], ' > ') || translateCategoryName('Sem categoria'))
        : ([item.geral_nome, item.categoria_nome, item.subcategoria_nome].filter(Boolean).join(' > ') || 'Sem categoria');
    const itemImage = toPublicUrl(resolveImage(item.imagem_url || item.template_imagem, ''));
    const lines = [
        `Ola! Tenho interesse no item "${item.nome}".`,
        `Moedas: ${pCoins}`,
        `Preco em R$: ${pBRL}`,
        item.servidor ? `Servidor: ${item.servidor}` : '',
        `Estoque: ${Number(item.quantidade_disponivel || 0)}`,
        `Categoria: ${categoryPath}`,
        itemImage ? `Imagem do item: ${itemImage}` : '',
        'Ainda esta disponivel?'
    ].filter(Boolean);
    const text = encodeURIComponent(lines.join('\n'));
    return `https://wa.me/${number}?text=${text}`;
}

function whatsBuy(itemId) {
    let item = APP_STATE.itemsList.find(i => i.id === itemId) || APP_STATE.allItems.find(i => i.id === itemId);
    if (!item) return;
    const url = buildWhatsAppLink(item);
    if (!url) { showToast('WhatsApp não configurado para este anúncio.', 'error'); return; }
    window.open(url, '_blank');
}

function openChatWithSeller(sellerId, itemId, sellerName) {
    APP_STATE.chatWith = { id: sellerId, nome: sellerName || 'Vendedor', itemId: itemId };
    navigateTo('chat');
}

/* ====================================================
   CHAT
   ==================================================== */

let chatPollInterval = null;

async function renderChat(container) {
    if (!APP_STATE.currentUser.isLoggedIn) {
        showToast('Faça login para usar o chat', 'error');
        navigateTo('home');
        return;
    }

    const chatWith = APP_STATE.chatWith || { id: 0, nome: '', itemId: 0 };

    container.innerHTML = renderPanel('Chat', `
        <div id="chat-container" style="display:flex;flex-direction:column;height:70vh;max-height:600px;">
            <div id="chat-conversations" style="border-bottom:1px solid rgba(255,255,255,0.1);padding:8px 0;overflow-y:auto;max-height:100px;display:none;">
                <div id="chat-conversations-list"></div>
            </div>
            <div id="chat-messages" style="flex:1;overflow-y:auto;padding:8px 0;display:flex;flex-direction:column;gap:6px;"></div>
            <div id="chat-input-area" style="display:flex;gap:8px;padding:8px 0;border-top:1px solid rgba(255,255,255,0.1);">
                <input type="text" id="chat-input" placeholder="Digite sua mensagem..." style="flex:1;padding:8px 12px;border-radius:6px;border:1px solid rgba(255,215,0,0.3);background:rgba(0,0,0,0.4);color:#fff;">
                <button id="chat-send-btn" class="btn" style="white-space:nowrap;">Enviar</button>
            </div>
        </div>
    `, `<button class="login-btn" onclick="goBack()">VOLTAR</button>`);

    // Bind send
    document.getElementById('chat-send-btn').addEventListener('click', sendChatMessage);
    document.getElementById('chat-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') sendChatMessage();
    });

    // Load conversations and messages
    await loadChatConversations();
    await loadChatMessages();
    startChatPolling();
}

async function loadChatConversations() {
    try {
        const data = await fetchJSON('chat.php');
        if (!data || !data.length) return;
        const list = document.getElementById('chat-conversations-list');
        if (!list) return;
        list.innerHTML = data.map(c => {
            const active = APP_STATE.chatWith && APP_STATE.chatWith.id === Number(c.other_id) ? 'active' : '';
            return `<div class="chat-conv-item ${active}" onclick="selectChatConversation(${c.other_id})" style="padding:6px 10px;border-radius:6px;cursor:pointer;display:flex;justify-content:space-between;">
                <strong>${escapeHtml(c.other_nome)}</strong>
                <small style="opacity:0.6;">${escapeHtml((c.last_msg || '').slice(0, 40))}</small>
            </div>`;
        }).join('');
        document.getElementById('chat-conversations').style.display = data.length ? '' : 'none';
    } catch(_) {}
}

async function selectChatConversation(otherId, otherNome) {
    APP_STATE.chatWith = { id: otherId, nome: otherNome, itemId: 0 };
    await loadChatMessages();
}

async function loadChatMessages() {
    if (!APP_STATE.chatWith || !APP_STATE.chatWith.id) return;
    try {
        const data = await fetchJSON(`chat.php?with=${APP_STATE.chatWith.id}`);
        const msgContainer = document.getElementById('chat-messages');
        if (!msgContainer) return;
        const userId = APP_STATE.currentUser.id;
        msgContainer.innerHTML = data.map(m => {
            const isMine = Number(m.de_id) === Number(userId);
            return `<div style="display:flex;flex-direction:column;align-items:${isMine ? 'flex-end' : 'flex-start'};">
                <div style="background:${isMine ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.08)'};padding:8px 12px;border-radius:12px;max-width:80%;">
                    <small style="opacity:0.5;font-size:11px;">${isMine ? 'Você' : escapeHtml(m.de_nome)}</small>
                    <div>${escapeHtml(m.texto)}</div>
                    <small style="opacity:0.4;font-size:10px;">${m.criado_em || ''}</small>
                </div>
            </div>`;
        }).join('');
        msgContainer.scrollTop = msgContainer.scrollHeight;
    } catch(_) {}
}

async function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const texto = input ? input.value.trim() : '';
    if (!texto || !APP_STATE.chatWith || !APP_STATE.chatWith.id) return;
    try {
        await fetchJSON('chat.php', {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({para: APP_STATE.chatWith.id, texto, item_id: APP_STATE.chatWith.itemId || 0})
        });
        input.value = '';
        await loadChatMessages();
    } catch(e) {
        showToast(e.message || 'Erro ao enviar mensagem', 'error');
    }
}

function startChatPolling() {
    stopChatPolling();
    chatPollInterval = setInterval(async () => {
        if (!APP_STATE.chatWith || !APP_STATE.chatWith.id) return;
        try {
            const data = await fetchJSON(`chat.php?with=${APP_STATE.chatWith.id}`);
            const msgContainer = document.getElementById('chat-messages');
            if (!msgContainer) return;
            const userId = APP_STATE.currentUser.id;
            msgContainer.innerHTML = data.map(m => {
                const isMine = Number(m.de_id) === Number(userId);
                return `<div style="display:flex;flex-direction:column;align-items:${isMine ? 'flex-end' : 'flex-start'};">
                    <div style="background:${isMine ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.08)'};padding:8px 12px;border-radius:12px;max-width:80%;">
                        <small style="opacity:0.5;font-size:11px;">${isMine ? 'Você' : escapeHtml(m.de_nome)}</small>
                        <div>${escapeHtml(m.texto)}</div>
                        <small style="opacity:0.4;font-size:10px;">${m.criado_em || ''}</small>
                    </div>
                </div>`;
            }).join('');
            msgContainer.scrollTop = msgContainer.scrollHeight;
        } catch(_) {}
    }, 5000);
}

function stopChatPolling() {
    if (chatPollInterval) {
        clearInterval(chatPollInterval);
        chatPollInterval = null;
    }
}

/* ====================================================
   SHARE BUTTON
   ==================================================== */
function shareItem(itemId) {
    const url = new URL(window.location.href);
    url.hash = `#/item/${itemId}`;
    const shareUrl = url.href;

    navigator.clipboard.writeText(shareUrl).then(() => {
        showToast('Link copiado para a area de transferencia!', 'success');
    }).catch(() => {
        // Fallback
        const textarea = document.createElement('textarea');
        textarea.value = shareUrl;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            showToast('Link copiado para a area de transferencia!', 'success');
        } catch (_) {
            showToast('Erro ao copiar link.', 'error');
        }
        document.body.removeChild(textarea);
    });
}

/* ====================================================
   CART
   ==================================================== */
async function addToCart(itemId) {
    if (!APP_STATE.currentUser.isLoggedIn) {
        showToast('Faça login para adicionar ao carrinho', 'error');
        showQuickLogin();
        return;
    }
    try {
        const data = await fetchJSON('cart.php', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({item_id: itemId}) });
        APP_STATE.cartCount = Number(data.count || APP_STATE.cartCount || 0);
        updateMobileNavState();
        showToast('Adicionado ao carrinho!', 'success');
    } catch(e) {
        showToast(e.message || 'Erro', 'error');
    }
    return;
    if (!APP_STATE.currentUser.isLoggedIn) { showToast('Faça login primeiro', 'error'); return; }
    try {
        await fetchJSON('cart.php', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({item_id: itemId}) });
        showToast('Adicionado ao carrinho!', 'success');
    } catch(e) { showToast(e.message || 'Erro', 'error'); }
}

/* ====================================================
   REVIEWS
   ==================================================== */
function renderStars(n) {
    n = Math.round(Number(n));
    let h = '';
    for (let i = 1; i <= 5; i++) h += '<span class="review-star ' + (i <= n ? 'filled' : 'empty') + '">★</span>';
    return h;
}

async function loadReviews(itemId) {
    try {
        const data = await fetchJSON('reviews.php?item_id=' + itemId);
        return data;
    } catch (_) { return {media:0, total:0, reviews:[]}; }
}

async function submitReview(itemId) {
    if (!APP_STATE.currentUser.isLoggedIn) { showToast('Faça login para avaliar', 'error'); return; }
    const stars = parseInt(document.getElementById('review-stars')?.value || '5');
    const comment = document.getElementById('review-comment')?.value || '';
    const comprou = document.getElementById('review-comprou')?.checked || false;
    try {
        await fetchJSON('reviews.php', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({item_id: itemId, estrelas: stars, comentario: comment, comprou: comprou}) });
        showToast('Avaliação enviada!', 'success');
        renderItemDetails(document.getElementById('app'));
    } catch(e) { showToast(e.message || 'Erro ao enviar avaliação', 'error'); }
}

window.openChatWithSeller = openChatWithSeller;
window.renderChat = renderChat;
window.stopChatPolling = stopChatPolling;
window.sendChatMessage = sendChatMessage;
window.loadChatMessages = loadChatMessages;
window.loadChatConversations = loadChatConversations;
window.selectChatConversation = selectChatConversation;

const APP_STATE = {
    currentView: 'home',
    currentUser: { id: null, nome: null, email: null, papel: null, isLoggedIn: false },
    sellerRequest: null,
    cartCount: 0,
    favoriteIds: [],
    favoriteItems: [],
    // Compatibilidade com código existente
    get isAdmin() {
        const email = String(this.currentUser.email || '').trim().toLowerCase();
        return this.currentUser.papel === 'dono' || email === 'admin@mercado.local';
    },
    set isAdmin(v) { /* mantido por compatibilidade */ },
    currentGeneralId: null,
    currentCategoryId: null,
    currentSubcategoryId: null,
    currentItemId: null,
    returnViewAfterDetails: 'items',
    viewingGeneralRootItems: false,
    generalCategories: [],
    categoriesLevel2: [],
    categoriesLevel3: [],
    categoryIndex: new Map(),
    categoryTree: [],
    itemsList: [],
    allItems: [],
    searchResults: [],
    searchTerm: '',
    settings: {
        corner_image_url: CONFIG.DEFAULT_CORNER_IMAGE,
        whatsapp_number: ''
    }
};

document.addEventListener('DOMContentLoaded', initializeApp);

// =====================================================================
// DEEP LINKING (URL hash routing)
// =====================================================================
let _ignoreHashChange = false;

function navigateFromHash() {
    const hash = location.hash;
    if (!hash || hash.indexOf('#/') !== 0) {
        // Also handle legacy share link format: #item-123
        const itemMatch = hash ? hash.match(/^#item[-=](\d+)$/) : null;
        if (itemMatch) {
            APP_STATE.currentItemId = parseInt(itemMatch[1], 10);
            APP_STATE.currentView = 'item-details';
            renderView();
            return;
        }
        APP_STATE.currentView = 'home';
        renderView();
        return;
    }

    const parts = hash.slice(2).split('/');
    const view = parts[0];

    // #/item/123 → item-details
    if (view === 'item' && parts[1]) {
        APP_STATE.currentItemId = parseInt(parts[1], 10);
        APP_STATE.currentView = 'item-details';
        renderView();
        return;
    }

    const validViews = [
        'home', 'general-categories', 'categories', 'subcategories',
        'items', 'favorites', 'admin-login', 'admin-panel',
        'seller-panel', 'change-password', 'search-results',
        'quick-login', 'cart', 'chat', 'login', 'register', 'profile'
    ];
    if (validViews.indexOf(view) !== -1) {
        APP_STATE.currentView = view;
        renderView();
        return;
    }

    // Unknown hash → home
    APP_STATE.currentView = 'home';
    renderView();
}

function getHashForView(view) {
    if (view === 'item-details' && APP_STATE.currentItemId) {
        return '#/item/' + APP_STATE.currentItemId;
    }
    return '#/' + view;
}

// =====================================================================
// RECENTLY VIEWED ITEMS
// =====================================================================
function getRecentlyViewed() {
    try { return JSON.parse(localStorage.getItem('recentlyViewed') || '[]'); } catch { return []; }
}

function clearRecentlyViewed() {
    localStorage.removeItem('recentlyViewed');
    showToast('Histórico limpo', 'info');
    if (APP_STATE.currentView === 'home') renderView();
}

function trackRecentlyViewed(item) {
    if (!item || !item.id) return;
    let viewed = getRecentlyViewed();
    const idx = viewed.findIndex(function(v) { return Number(v.id) === Number(item.id); });
    if (idx >= 0) viewed.splice(idx, 1);
    viewed.unshift({
        id: Number(item.id),
        nome: item.nome || '',
        imagem_url: item.imagem_url || '',
        template_imagem: item.template_imagem || ''
    });
    if (viewed.length > 20) viewed = viewed.slice(0, 20);
    localStorage.setItem('recentlyViewed', JSON.stringify(viewed));
}

function renderRecentlyViewedRow() {
    const items = getRecentlyViewed();
    if (!items.length) return '';
    const html = items.map(function(item) {
        const image = resolveImage(item.imagem_url || item.template_imagem);
        return '<div class="recently-viewed-item" onclick="navigateToItemFromHash(' + item.id + ')" title="' + escapeHtml(item.nome) + '">' +
            '<img src="' + image + '" alt="' + escapeHtml(item.nome) + '">' +
            '<span>' + escapeHtml(item.nome) + '</span>' +
            '</div>';
    }).join('');
    return '<div class="recently-viewed-section">' +
        '<div class="recently-viewed-title">Vistos recentemente</div>' +
        '<div class="recently-viewed-row">' + html + '</div>' +
        '</div>';
}

function navigateToItemFromHash(itemId) {
    APP_STATE.currentItemId = itemId;
    APP_STATE.returnViewAfterDetails = 'home';
    navigateTo('item-details');
}

// =====================================================================
// SEARCH BAR
// =====================================================================
function manageSearchBar() {
    const header = document.querySelector('.panel .header');
    if (!header) return;

    // Remove old search bar if it exists from a previous render
    const old = document.getElementById('header-search');
    if (old) old.remove();

    const showOn = ['general-categories', 'categories', 'subcategories', 'items', 'search-results', 'favorites'];
    if (showOn.indexOf(APP_STATE.currentView) === -1) return;

    const div = document.createElement('div');
    div.className = 'header-search';
    div.id = 'header-search';
    div.innerHTML = '<input type="text" id="search-input" placeholder="Buscar itens..." autocomplete="off" />' +
        '<button id="search-btn" aria-label="Buscar">Buscar</button>';
    header.appendChild(div);

    // Bind events on next frame (DOM is fresh)
    requestAnimationFrame(function() {
        const inp = document.getElementById('search-input');
        const btn = document.getElementById('search-btn');
        if (inp) {
            inp.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') doSearchByInput();
            });
        }
        if (btn) {
            btn.addEventListener('click', doSearchByInput);
        }
    });
}

function doSearchByInput() {
    const inp = document.getElementById('search-input');
    doSearch(inp ? inp.value : '');
}

function doSearch(term) {
    term = (term || '').trim();
    if (term.length < 2) {
        showToast('Digite pelo menos 2 caracteres para buscar', 'info');
        return;
    }
    // Dispatch to avoid blocking UI
    setTimeout(async function() {
        try {
            APP_STATE.searchTerm = term;
            const data = await fetchJSON('items.php?search=' + encodeURIComponent(term));
            APP_STATE.searchResults = sanitizeItems(data);
            navigateTo('search-results');
        } catch (e) {
            console.error('Search error:', e);
            showToast('Erro ao buscar itens', 'error');
        }
    }, 0);
}

async function renderSearchResults(container) {
    const items = APP_STATE.searchResults || [];
    const term = APP_STATE.searchTerm || '';
    const body = items.length
        ? renderMarketRows(items)
        : '<div class="row"><div class="label">Nenhum item encontrado para "' + escapeHtml(term) + '".</div></div>';
    container.innerHTML = renderPanel(
        'Resultados: "' + escapeHtml(term) + '"',
        body,
        '<button class="login-btn" onclick="goBack()">VOLTAR</button>'
    );
    addRowSelectionBehavior();
}

// =====================================================================
// CORE APP
// =====================================================================
async function initializeApp() {
    // Ajusta dinamicamente a base da API conforme o ambiente
    CONFIG.API_URL = resolveApiBase();
    ensureToastContainer();
    await loadSettings();
    await checkAuth();
    ensureBackgroundTexture();

    // Deep linking: check initial hash
    const hasHash = location.hash && location.hash.indexOf('#/') === 0 ||
        !!(location.hash && location.hash.match(/^#item[-=]\d+$/));
    if (hasHash) {
        navigateFromHash();
    } else {
        renderView();
    }

    // Listen for hash changes (browser back/forward)
    window.addEventListener('hashchange', function() {
        if (_ignoreHashChange) {
            _ignoreHashChange = false;
            return;
        }
        navigateFromHash();
    });

    // Mobile nav scroll hide/show
    let lastScrollY = 0;
    const mobileNav = document.getElementById('mobile-nav');
    window.addEventListener('scroll', function() {
        if (!mobileNav) return;
        const currentScroll = window.scrollY;
        if (currentScroll > lastScrollY && currentScroll > 100) {
            mobileNav.style.transform = 'translateY(100%)';
        } else {
            mobileNav.style.transform = 'translateY(0)';
        }
        lastScrollY = currentScroll;
    }, { passive: true });

    // First-visit tooltip
    localStorage.setItem('has_visited', '1');

    // Ripple effect em todos os botões
    document.addEventListener('click', function(e) {
        const btn = e.target.closest('button');
        if (!btn) return;
        btn.classList.add('ripple');
        const ripple = document.createElement('span');
        ripple.className = 'ripple-effect';
        const rect = btn.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
        ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
        btn.appendChild(ripple);
        ripple.addEventListener('animationend', function() { ripple.remove(); });
    });
}

async function loadSettings() {
    try {
        const data = await fetchJSON('settings.php');
        APP_STATE.settings.corner_image_url = data.corner_image_url || CONFIG.DEFAULT_CORNER_IMAGE;
        APP_STATE.settings.whatsapp_number = data.whatsapp_number || '';
    } catch (error) {
        console.error('Erro ao carregar configurações:', error);
        APP_STATE.settings.corner_image_url = CONFIG.DEFAULT_CORNER_IMAGE;
        APP_STATE.settings.whatsapp_number = '';
    }
    applySettingsToTheme();
}

function applySettingsToTheme() {
    const corner = APP_STATE.settings.corner_image_url || CONFIG.DEFAULT_CORNER_IMAGE;
    document.documentElement.style.setProperty('--corner-image', 'url("' + corner + '")');
}

function ensureBackgroundTexture() {
    try {
        const bg = getComputedStyle(document.body).backgroundImage;
        if (!bg || bg === 'none') {
            document.documentElement.style.setProperty('--bg-url', 'linear-gradient(#2b2b2b,#1a1a1a)');
        }
    } catch (_) {}
}

function getLocalFavoriteIds() {
    try {
        const parsed = JSON.parse(localStorage.getItem('favorites') || '[]');
        return Array.isArray(parsed)
            ? parsed.map(Number).filter(id => Number.isFinite(id) && id > 0)
            : [];
    } catch (_) {
        return [];
    }
}

function applyFavoritesPayload(data) {
    const ids = Array.isArray(data && data.ids) ? data.ids : [];
    APP_STATE.favoriteIds = ids.map(Number).filter(id => Number.isFinite(id) && id > 0);
    APP_STATE.favoriteItems = sanitizeItems((data && data.items) || []);
}

async function loadFavoritesState(migrateLocal = false) {
    if (!APP_STATE.currentUser.isLoggedIn) {
        APP_STATE.favoriteIds = [];
        APP_STATE.favoriteItems = [];
        updateMobileNavState();
        return;
    }
    if (migrateLocal) {
        const localIds = getLocalFavoriteIds();
        if (localIds.length) {
            try {
                await fetchJSON('favorites.php', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({item_ids: localIds})
                });
                localStorage.removeItem('favorites');
            } catch (_) {}
        }
    }
    try {
        const data = await fetchJSON('favorites.php');
        applyFavoritesPayload(data);
    } catch (error) {
        APP_STATE.favoriteIds = [];
        APP_STATE.favoriteItems = [];
    }
    updateMobileNavState();
}

function updateMobileNavState() {
    const favButton = document.getElementById('mobile-nav-favorites');
    if (favButton) {
        favButton.hidden = !(APP_STATE.currentUser.isLoggedIn && APP_STATE.favoriteIds.length > 0);
    }
    const cartButton = document.getElementById('mobile-nav-cart');
    if (cartButton) {
        cartButton.hidden = !APP_STATE.currentUser.isLoggedIn;
        const cartLabel = typeof t === 'function' ? t('cartShort') : 'Carrinho';
        cartButton.textContent = APP_STATE.cartCount > 0 ? cartLabel + ' (' + APP_STATE.cartCount + ')' : cartLabel;
    }
}

function guardProtectedView() {
    const loggedOnlyViews = ['favorites', 'cart', 'chat'];
    if (loggedOnlyViews.includes(APP_STATE.currentView) && !APP_STATE.currentUser.isLoggedIn) {
        showToast('Faça login para acessar essa área', 'error');
        navigateTo('home');
        return true;
    }
    if (APP_STATE.currentView === 'seller-panel' && APP_STATE.currentUser.papel !== 'vendedor') {
        showToast('Área liberada apenas para vendedores aprovados', 'error');
        navigateTo('home');
        return true;
    }
    if (APP_STATE.currentView === 'admin-panel' && !APP_STATE.isAdmin) {
        showToast('Area liberada apenas para o dono do sistema', 'error');
        navigateTo('home');
        return true;
    }
    return false;
}

async function checkAuth() {
    try {
        const data = await fetchJSON('auth.php?action=check');
        APP_STATE.currentUser = {
            id: data.id || null,
            nome: data.nome || null,
            email: data.email || null,
            papel: data.papel || null,
            isLoggedIn: data.is_logged_in || false
        };
        APP_STATE.sellerRequest = data.seller_request || null;
        APP_STATE.cartCount = Number(data.cart_count || 0);
        if (APP_STATE.currentUser.isLoggedIn) {
            await loadFavoritesState(true);
        } else {
            APP_STATE.favoriteIds = [];
            APP_STATE.favoriteItems = [];
            APP_STATE.cartCount = 0;
        }
    } catch (error) {
        APP_STATE.currentUser = { id: null, nome: null, email: null, papel: null, isLoggedIn: false };
        APP_STATE.sellerRequest = null;
        APP_STATE.cartCount = 0;
        APP_STATE.favoriteIds = [];
        APP_STATE.favoriteItems = [];
        console.error('Erro ao verificar autenticação:', error);
    }
}

function navigateTo(view) {
    if (typeof stopChatPolling === 'function') stopChatPolling();
    APP_STATE.currentView = view;
    // Update URL hash for deep linking
    _ignoreHashChange = true;
    location.hash = getHashForView(view);
    renderView();
}

function goBack() {
    if (typeof stopChatPolling === 'function') stopChatPolling();
    switch (APP_STATE.currentView) {
        case 'item-details':
            navigateTo(APP_STATE.returnViewAfterDetails || 'items');
            break;
        case 'items':
        case 'search-results':
            if (APP_STATE.currentSubcategoryId) navigateTo('subcategories');
            else if (APP_STATE.currentCategoryId) navigateTo('categories');
            else if (APP_STATE.viewingGeneralRootItems) navigateTo('categories');
            else if (APP_STATE.currentGeneralId) navigateTo('general-categories');
            else navigateTo('general-categories');
            break;
        case 'favorites':
            navigateTo('home');
            break;
        case 'subcategories':
            navigateTo('categories');
            break;
        case 'categories':
            navigateTo('general-categories');
            break;
        case 'general-categories':
        case 'change-password':
        case 'admin-login':
        case 'admin-panel':
        case 'quick-login':
        case 'cart':
        case 'chat':
        default:
            navigateTo('home');
            break;
    }
}

async function renderView() {
    const container = document.getElementById('app');
    if (guardProtectedView()) return;
    document.body.classList.toggle('detail-page', APP_STATE.currentView === 'item-details');
    document.body.classList.toggle('auth-page', ['quick-login', 'login', 'register', 'profile', 'change-password', 'admin-login'].includes(APP_STATE.currentView));
    switch (APP_STATE.currentView) {
        case 'home':
            renderHome(container);
            break;
        case 'general-categories':
            await renderGeneralCategories(container);
            break;
        case 'categories':
            await renderCategories(container);
            break;
        case 'subcategories':
            await renderSubcategories(container);
            break;
        case 'items':
            renderItems(container);
            break;
        case 'favorites':
            await renderFavorites(container);
            break;
        case 'item-details':
            await renderItemDetails(container);
            // Track recently viewed after item details are rendered
            var trackedItem = APP_STATE.itemsList.find(function(i) { return i.id === APP_STATE.currentItemId; }) ||
                APP_STATE.allItems.find(function(i) { return i.id === APP_STATE.currentItemId; });
            if (trackedItem) trackRecentlyViewed(trackedItem);
            break;
        case 'admin-login':
            renderAdminLogin(container);
            break;
        case 'admin-panel':
            await renderAdminPanel(container);
            break;
        case 'seller-panel':
            await renderSellerPanel(container);
            break;
        case 'change-password':
            renderChangePassword(container);
            break;
        case 'quick-login':
            renderQuickLogin(container);
            break;
        case 'login':
            renderLogin(container);
            break;
        case 'register':
            renderRegister(container);
            break;
        case 'profile':
            renderProfile(container);
            break;
        case 'cart':
            await renderCart(container);
            break;
        case 'chat':
            stopChatPolling();
            await renderChat(container);
            break;
        case 'search-results':
            await renderSearchResults(container);
            break;
        default:
            renderHome(container);
    }

    // Manage search bar visibility (inject into panel header for relevant views)
    manageSearchBar();
    updateMobileNavState();

    // Update page title
    const titles = {
        home: 'Mercado Warspear',
        'general-categories': 'Catálogo',
        items: 'Itens',
        favorites: 'Favoritos',
        'item-details': 'Detalhes',
        'admin-panel': 'Admin',
        'seller-panel': 'Meus Anúncios',
        'search-results': 'Busca',
        'quick-login': 'Entrar / Cadastrar',
        login: 'Entrar',
        register: 'Criar Conta',
        profile: 'Perfil',
        cart: 'Carrinho',
        chat: 'Chat'
    };
    const pageTitle = document.getElementById('page-title');
    if (pageTitle) {
        const rawTitle = titles[APP_STATE.currentView] || 'Mercado';
        const translatedTitle = window.I18N ? I18N.translatePhrase(rawTitle) : rawTitle;
        const appTitle = typeof t === 'function' ? t('appName') : 'Mercado Warspear';
        pageTitle.textContent = translatedTitle + ' — ' + appTitle;
    }
    if (typeof applyI18n === 'function') {
        applyI18n(document);
    }

    // Verificar scroll na lista após renderizar
    requestAnimationFrame(function() {
        const list = document.querySelector('.list');
        if (list) {
            const hasScroll = list.scrollHeight > list.clientHeight;
            list.classList.toggle('has-scroll', hasScroll);
        }
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    });
}

function injectRecentlyViewedHome() {
    const list = document.querySelector('.panel .list');
    if (!list) return;
    const html = renderRecentlyViewedRow();
    if (!html) return;
    list.insertAdjacentHTML('afterbegin', html);
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function getFavorites() {
    if (!APP_STATE.currentUser.isLoggedIn) return [];
    return APP_STATE.favoriteIds || [];
}
async function toggleFavorite(itemId) {
    if (!APP_STATE.currentUser.isLoggedIn) {
        showToast('Faça login para adicionar favoritos', 'error');
        return getFavorites();
    }
    const id = Number(itemId);
    if (!Number.isFinite(id) || id <= 0) return getFavorites();
    const wasFavorite = isFavorite(id);
    try {
        const data = await fetchJSON('favorites.php', {
            method: wasFavorite ? 'DELETE' : 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({item_id: id})
        });
        applyFavoritesPayload(data);
        showToast(wasFavorite ? 'Removido dos favoritos' : 'Adicionado aos favoritos', wasFavorite ? 'info' : 'success');
        refreshCurrentItemsView();
        updateMobileNavState();
    } catch (error) {
        showToast(error.message || 'Erro ao atualizar favoritos', 'error');
    }
    return getFavorites();
    let favs = getFavorites();
    const idx = favs.indexOf(itemId);
    if (idx >= 0) { favs.splice(idx, 1); showToast('Removido dos favoritos', 'info'); }
    else { favs.push(itemId); showToast('Adicionado aos favoritos ❤️', 'success'); }
    // Legacy localStorage favorites are migrated on login; server state is authoritative.
    return favs;
}
function isFavorite(itemId) { return getFavorites().includes(Number(itemId)); }

// =====================================================================
// QUICK LOGIN
// =====================================================================
function showQuickLogin() {
    navigateTo('quick-login');
}

function renderQuickLogin(container) {
    container.innerHTML = `
        <section class="panel auth-panel" role="dialog" aria-labelledby="quick-login-title">
            <div class="corner top-left"></div>
            <div class="corner top-right"></div>
            <header class="header auth-header">
                <button class="back-button" onclick="goBack()" aria-label="Voltar">&larr;</button>
                <h1 class="title" id="quick-login-title">Acesso ao Mercado</h1>
            </header>
            <div class="auth-shell">
                <aside class="auth-emblem">
                    <div class="auth-orb"><img src="${resolveImage('images/uploads/gold_coin.png')}" alt=""></div>
                    <strong>WsMkt</strong>
                    <span>Conta de comprador</span>
                </aside>
                <form class="quick-login-form auth-card" onsubmit="event.preventDefault();doQuickLogin();">
                    <label class="auth-field">Email
                        <input type="email" id="ql-email" placeholder="seu@email.com" autocomplete="email" required>
                    </label>
                    <label class="auth-field">Nome
                        <input type="text" id="ql-nome" placeholder="Seu nome" autocomplete="name">
                    </label>
                    <label class="auth-field">Senha
                        <input type="password" id="ql-senha" placeholder="Sua senha" autocomplete="current-password">
                    </label>
                    <button type="submit" class="login-btn auth-submit">Entrar / Cadastrar</button>
                </form>
            </div>
            <div class="footer auth-footer"><button class="login-btn" onclick="goBack()">VOLTAR</button></div>
        </section>`;
}

async function doQuickLogin() {
    var email = document.getElementById('ql-email')?.value?.trim();
    var nome = document.getElementById('ql-nome')?.value?.trim();
    var senha = document.getElementById('ql-senha')?.value;

    if (!email) { showToast('Digite seu email', 'error'); return; }

    if (nome) {
        try {
            var regData = await fetchJSON('auth.php?action=register', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({email: email, nome: nome, senha: senha || null})
            });
            if (regData && regData.success) {
                showToast('Cadastro realizado!', 'success');
                await checkAuth();
                goBack();
                return;
            }
        } catch (e) {
            if (!String(e.message || '').toLowerCase().includes('cadastrado')) {
                showToast(e.message || 'Erro ao cadastrar', 'error');
                return;
            }
        }
    }

    // Try login first
    try {
        var data = await fetchJSON('auth.php?action=login', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({email: email, password: senha || '', senha: senha || ''})
        });
        if (data && data.success) {
            showToast('Login realizado!', 'success');
            await checkAuth();
            goBack();
            return;
        }
    } catch (_) {
        // Login failed, try register
    }

    // Try register
    try {
        var data = await fetchJSON('auth.php?action=register', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({email: email, nome: nome, senha: senha || null})
        });
        if (data && data.success) {
            showToast('Cadastro realizado!', 'success');
            await checkAuth();
            goBack();
        } else {
            showToast(data.message || 'Erro ao cadastrar', 'error');
        }
    } catch(e) {
        showToast(e.message || 'Erro ao fazer login/cadastro', 'error');
    }
}

// =====================================================================
// LOGIN (tela separada estilo RPG)
// =====================================================================
function renderLogin(container) {
    container.innerHTML = `
        <section class="panel auth-panel" role="dialog" aria-labelledby="login-title">
            <div class="corner top-left"></div>
            <div class="corner top-right"></div>
            <header class="header auth-header">
                <button class="back-button" onclick="goBack()" aria-label="Voltar">&larr;</button>
                <h1 class="title" id="login-title">Entrar</h1>
            </header>
            <div class="auth-shell">
                <aside class="auth-emblem">
                    <div class="auth-orb"></div>
                    <strong>WsMkt</strong>
                    <span>Bem-vindo de volta</span>
                </aside>
                <form class="auth-card" onsubmit="event.preventDefault();doLoginSubmit();">
                    <label class="auth-field">Email
                        <input type="email" id="login-email" placeholder="seu@email.com" autocomplete="email" required>
                    </label>
                    <label class="auth-field">Senha
                        <input type="password" id="login-senha" placeholder="Sua senha" autocomplete="current-password" required>
                    </label>
                    <button type="submit" class="login-btn auth-submit">Entrar</button>
                    <div class="auth-switch">Não tem conta? <a href="javascript:void(0)" onclick="navigateTo('register')">Criar conta</a></div>
                </form>
            </div>
            <div class="footer auth-footer"><button class="login-btn" onclick="goBack()">VOLTAR</button></div>
        </section>`;
}

async function doLoginSubmit() {
    const email = document.getElementById('login-email')?.value?.trim();
    const senha = document.getElementById('login-senha')?.value;

    if (!email) { showToast('Digite seu email', 'error'); return; }
    if (!senha) { showToast('Digite sua senha', 'error'); return; }

    try {
        const data = await fetchJSON('auth.php?action=login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, password: senha })
        });
        if (data && data.success) {
            showToast('Login realizado!', 'success');
            await checkAuth();
            if (data.senha_trocada === false) {
                navigateTo('change-password');
            } else {
                goBack();
            }
        }
    } catch (e) {
        showToast(e.message || 'Email ou senha incorretos', 'error');
    }
}

// =====================================================================
// REGISTER (tela separada estilo RPG)
// =====================================================================
function renderRegister(container) {
    container.innerHTML = `
        <section class="panel auth-panel" role="dialog" aria-labelledby="register-title">
            <div class="corner top-left"></div>
            <div class="corner top-right"></div>
            <header class="header auth-header">
                <button class="back-button" onclick="goBack()" aria-label="Voltar">&larr;</button>
                <h1 class="title" id="register-title">Criar Conta</h1>
            </header>
            <div class="auth-shell">
                <aside class="auth-emblem">
                    <div class="auth-orb"></div>
                    <strong>WsMkt</strong>
                    <span>Nova conta</span>
                </aside>
                <form class="auth-card" onsubmit="event.preventDefault();doRegisterSubmit();">
                    <label class="auth-field">Email
                        <input type="email" id="reg-email" placeholder="seu@email.com" autocomplete="email" required>
                    </label>
                    <label class="auth-field">Nome
                        <input type="text" id="reg-nome" placeholder="Seu nome" autocomplete="name" required>
                    </label>
                    <label class="auth-field">Senha
                        <input type="password" id="reg-senha" placeholder="Mínimo 6 caracteres" autocomplete="new-password" required>
                    </label>
                    <label class="auth-field">Confirmar senha
                        <input type="password" id="reg-senha-confirm" placeholder="Repita a senha" autocomplete="new-password" required>
                    </label>
                    <button type="submit" class="login-btn auth-submit">Criar conta</button>
                    <div class="auth-switch">Já tem conta? <a href="javascript:void(0)" onclick="navigateTo('login')">Entrar</a></div>
                </form>
            </div>
            <div class="footer auth-footer"><button class="login-btn" onclick="goBack()">VOLTAR</button></div>
        </section>`;
}

async function doRegisterSubmit() {
    const email = document.getElementById('reg-email')?.value?.trim();
    const nome = document.getElementById('reg-nome')?.value?.trim();
    const senha = document.getElementById('reg-senha')?.value || '';
    const confirm = document.getElementById('reg-senha-confirm')?.value || '';

    if (!email) { showToast('Digite seu email', 'error'); return; }
    if (!nome) { showToast('Digite seu nome', 'error'); return; }
    if (!senha) { showToast('Digite uma senha', 'error'); return; }
    if (senha.length < 6) { showToast('Senha deve ter ao menos 6 caracteres', 'error'); return; }
    if (senha !== confirm) { showToast('Senhas não conferem', 'error'); return; }

    try {
        const data = await fetchJSON('auth.php?action=register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, nome: nome, senha: senha })
        });
        if (data && data.success) {
            showToast('Cadastro realizado!', 'success');
            await checkAuth();
            goBack();
        }
    } catch (e) {
        showToast(e.message || 'Erro ao cadastrar', 'error');
    }
}

// =====================================================================
// PROFILE (tela de perfil do usuário)
// =====================================================================
function renderProfile(container) {
    const user = APP_STATE.currentUser || {};
    if (!user.isLoggedIn) { navigateTo('login'); return; }

    const papelLabel = { dono: 'Dono (Admin)', vendedor: 'Vendedor', comprador: 'Comprador' }[user.papel] || user.papel || '—';

    container.innerHTML = `
        <section class="panel auth-panel" role="dialog">
            <div class="corner top-left"></div>
            <div class="corner top-right"></div>
            <header class="header auth-header">
                <button class="back-button" onclick="goBack()" aria-label="Voltar">&larr;</button>
                <h1 class="title">Perfil</h1>
            </header>
            <div class="auth-shell">
                <aside class="auth-emblem">
                    <div class="auth-orb"></div>
                    <strong>${escapeHtml(user.nome || 'Usuário')}</strong>
                    <span>${papelLabel}</span>
                </aside>
                <div class="auth-card">
                    <div class="profile-info">
                        <div class="profile-row"><span>Email</span><strong>${escapeHtml(user.email || user.id || '—')}</strong></div>
                        <div class="profile-row"><span>Nome</span><strong>${escapeHtml(user.nome || '—')}</strong></div>
                        <div class="profile-row"><span>Papel</span><strong>${papelLabel}</strong></div>
                    </div>
                    <button type="button" class="login-btn auth-submit" onclick="navigateTo('change-password')">Alterar senha</button>
                    <button type="button" class="login-btn" onclick="doLogout()" style="margin-top:6px;">Sair da conta</button>
                </div>
            </div>
            <div class="footer auth-footer"><button class="login-btn" onclick="goBack()">VOLTAR</button></div>
        </section>`;
}

function renderProfileWsdb(container) {
    const user = APP_STATE.currentUser || {};
    if (!user.isLoggedIn) { navigateTo('login'); return; }

    const papelLabel = { dono: 'Dono (Admin)', vendedor: 'Vendedor', comprador: 'Comprador' }[user.papel] || user.papel || '-';
    const displayName = user.nome || 'Usuario';

    container.innerHTML = `
        <section class="panel auth-panel auth-panel-wsdb" role="dialog" aria-labelledby="profile-title">
            <div class="corner top-left"></div>
            <div class="corner top-right"></div>
            <header class="header auth-header">
                <button class="back-button" onclick="goBack()" aria-label="Voltar">&larr;</button>
                <h1 class="title" id="profile-title">Perfil: ${escapeHtml(displayName)}</h1>
            </header>
            <div class="auth-shell">
                <div class="auth-card profile-card">
                    <div class="profile-line">
                        <span>E-mail:</span>
                        <strong>${escapeHtml(user.email || '-')}</strong>
                    </div>
                    <div class="profile-line">
                        <span>Nome de usuario:</span>
                        <strong>${escapeHtml(displayName)}</strong>
                    </div>
                    <div class="profile-line">
                        <span>Conta:</span>
                        <strong>${escapeHtml(papelLabel)}</strong>
                    </div>
                    <div class="auth-actions">
                        <button type="button" class="login-btn auth-submit" onclick="navigateTo('change-password')">Mudar senha</button>
                        <button type="button" class="login-btn auth-submit" onclick="doLogout()">Sair da conta</button>
                        <button type="button" class="login-btn auth-submit" onclick="goBack()">Desistir</button>
                    </div>
                </div>
            </div>
        </section>`;
}

renderProfile = renderProfileWsdb;

// =====================================================================
// CART
// =====================================================================
async function renderCart(container) {
    try {
        var data = await fetchJSON('cart.php');
        var items = Array.isArray(data) ? data : ((data && data.items) || []);

        if (!items.length) {
            APP_STATE.cartCount = 0;
            updateMobileNavState();
            container.innerHTML = renderPanel('Meu Carrinho', '<div class="row"><div class="label">Seu carrinho está vazio.</div></div>', '<button class="login-btn" onclick="goBack()">VOLTAR</button>');
            return;
        }

        APP_STATE.cartCount = Number(data.count || items.reduce(function(sum, cartItem) {
            return sum + Number(cartItem.quantidade || cartItem.cart_quantity || 1);
        }, 0));
        updateMobileNavState();

        var rowsHtml = items.map(function(cartItem, index) {
            var item = cartItem.item || cartItem;
            var qty = Math.max(1, Number(cartItem.quantidade || cartItem.cart_quantity || 1));
            var stock = Math.max(0, Number(item.quantidade_disponivel || 0));
            var price = formatGoldValue(item.preco_moedas || 0);
            var fullPrice = formatGoldValue(item.preco_moedas || 0, { compact: false });
            var image = resolveImage(item.imagem_url || item.template_imagem);
            return '<div class="cart-row">' +
                '<img class="icon cart-row-icon" src="' + image + '" alt="' + escapeHtml(item.nome || 'Item') + '">' +
                '<div class="cart-row-main">' +
                    '<strong>' + escapeHtml(item.nome || 'Item #' + (cartItem.item_id || '?')) + '</strong>' +
                    '<span><strong class="gold-amount-inline" title="' + fullPrice + '">' + price + '</strong> moedas cada</span>' +
                    '<small>Estoque: ' + stock + '</small>' +
                '</div>' +
                '<div class="cart-qty-control">' +
                    '<button type="button" onclick="updateCartQuantity(' + (cartItem.cart_id || 0) + ', ' + (item.id || cartItem.item_id || 0) + ', ' + (qty - 1) + ')" aria-label="Diminuir">-</button>' +
                    '<span>' + qty + '</span>' +
                    '<button type="button" onclick="updateCartQuantity(' + (cartItem.cart_id || 0) + ', ' + (item.id || cartItem.item_id || 0) + ', ' + (qty + 1) + ')" aria-label="Aumentar">+</button>' +
                '</div>' +
                '<button class="cart-remove-btn" onclick="removeFromCart(' + (cartItem.cart_id || 0) + ', ' + (item.id || cartItem.item_id || 0) + ')" aria-label="Remover">x</button>' +
            '</div>';
            return '<div class="row" style="display:flex;align-items:center;">' +
                '<img class="icon" src="' + image + '" alt="' + escapeHtml(item.nome || 'Item') + '" style="width:32px;height:32px;object-fit:contain;border-radius:4px;">' +
                '<div class="label" style="flex:1;">' + escapeHtml(item.nome || 'Item #' + (cartItem.item_id || '?')) + ' - <strong>' + price + '</strong></div>' +
                '<button class="login-btn" onclick="removeFromCart(' + (cartItem.cart_id || 0) + ', ' + (item.id || cartItem.item_id || 0) + ')" style="margin-left:8px;padding:4px 8px;font-size:12px;">×</button>' +
            '</div>';
        }).join('');

        var totalCoins = data.total_coins || data.total_price || 0;
        var totalsHtml = '<div class="cart-total-line"><span>Total</span><strong><span class="gold-amount-inline" title="' + formatGoldValue(totalCoins, { compact: false }) + '">' + formatGoldValue(totalCoins) + '</span> moedas</strong></div>';
        var waBtn = '<div style="padding:12px 0;text-align:center;">' +
            '<button class="login-btn" onclick="checkoutCartWhatsApp()" style="font-size:16px;padding:12px 24px;">' +
                '<span class="wa-icon" aria-hidden="true"></span> Finalizar compra no WhatsApp' +
            '</button>' +
        '</div>';

        container.innerHTML = renderPanel('Meu Carrinho', rowsHtml + totalsHtml + waBtn, '<button class="login-btn" onclick="goBack()">VOLTAR</button>');
    } catch(e) {
        container.innerHTML = renderPanel('Meu Carrinho', '<div class="row"><div class="label">Erro ao carregar carrinho.</div></div>', '<button class="login-btn" onclick="goBack()">VOLTAR</button>');
        showToast(e.message || 'Erro ao carregar carrinho', 'error');
    }
}

async function removeFromCart(cartItemId, itemId) {
    try {
        var data = await fetchJSON('cart.php', {
            method: 'DELETE',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({cart_id: cartItemId || 0, item_id: itemId || 0})
        });
        APP_STATE.cartCount = Number(data.count || 0);
        updateMobileNavState();
        showToast('Removido do carrinho', 'info');
        renderCart(document.getElementById('app'));
    } catch(e) { showToast(e.message || 'Erro', 'error'); }
}

async function updateCartQuantity(cartItemId, itemId, quantity) {
    try {
        var data = await fetchJSON('cart.php', {
            method: 'PUT',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({cart_id: cartItemId || 0, item_id: itemId || 0, quantidade: Number(quantity || 0)})
        });
        APP_STATE.cartCount = Number(data.count || 0);
        updateMobileNavState();
        renderCart(document.getElementById('app'));
    } catch(e) {
        showToast(e.message || 'Erro ao alterar quantidade', 'error');
    }
}

async function checkoutCartWhatsApp() {
    try {
        var data = await fetchJSON('cart.php');
        var items = Array.isArray(data) ? data : ((data && data.items) || []);
        if (!items.length) { showToast('Carrinho vazio', 'info'); return; }

        var globalNumber = (APP_STATE.settings.whatsapp_number || '').replace(/\D+/g, '');
        if (!globalNumber) { showToast('WhatsApp não configurado', 'error'); return; }

        var lines = ['Olá! Gostaria de comprar os seguintes itens:'];
        items.forEach(function(cartItem, i) {
            var item = cartItem.item || cartItem;
            var qty = Math.max(1, Number(cartItem.quantidade || cartItem.cart_quantity || 1));
            lines.push((i + 1) + '. ' + qty + 'x ' + (item.nome || 'Item') + ' - ' + formatGoldValue((item.preco_moedas || 0) * qty, { compact: false }) + ' moedas');
        });
        lines.push('');
        lines.push('Estão disponíveis?');

        var text = encodeURIComponent(lines.join('\n'));
        window.open('https://wa.me/' + globalNumber + '?text=' + text, '_blank');
    } catch(e) {
        showToast('Erro ao processar carrinho', 'error');
    }
}

// Window exports — preserve all existing plus new ones
window.navigateTo = navigateTo;
window.renderView = renderView;
window.selectGeneralCategory = selectGeneralCategory;
window.selectCategory = selectCategory;
window.selectSubcategory = selectSubcategory;
window.selectItem = selectItem;
window.selectGeneralRootItems = selectGeneralRootItems;
window.goBack = goBack;
window.onSortChange = onSortChange;
window.onServerFilterChange = onServerFilterChange;
window.onPriceFilterChange = onPriceFilterChange;
window.loadMoreItems = loadMoreItems;
window.shareItem = shareItem;
window.reloadCurrentItemsView = reloadCurrentItemsView;
// New exports for deep linking, search, and recently viewed
window.navigateToItemFromHash = navigateToItemFromHash;
window.doSearch = doSearch;
window.trackRecentlyViewed = trackRecentlyViewed;
window.getRecentlyViewed = getRecentlyViewed;
window.clearRecentlyViewed = clearRecentlyViewed;
// Phase 2 exports
window.addToCart = addToCart;
window.submitReview = submitReview;
window.showQuickLogin = showQuickLogin;
window.doQuickLogin = doQuickLogin;
window.doLoginSubmit = doLoginSubmit;
window.doRegisterSubmit = doRegisterSubmit;
window.renderCart = renderCart;
window.removeFromCart = removeFromCart;
window.updateCartQuantity = updateCartQuantity;
window.checkoutCartWhatsApp = checkoutCartWhatsApp;

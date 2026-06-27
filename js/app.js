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

document.addEventListener('DOMContentLoaded', initializeApp);

async function initializeApp() {
    // Ajusta dinamicamente a base da API conforme o ambiente
    CONFIG.API_URL = resolveApiBase();
    ensureToastContainer();
    await loadSettings();
    await checkAuth();
    ensureBackgroundTexture();
    renderView();

    // Ripple effect em todos os botões
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
    document.documentElement.style.setProperty('--corner-image', `url("${corner}")`);
}

function ensureBackgroundTexture() {
    try {
        const bg = getComputedStyle(document.body).backgroundImage;
        if (!bg || bg === 'none') {
            document.documentElement.style.setProperty('--bg-url', 'linear-gradient(#2b2b2b,#1a1a1a)');
        }
    } catch (_) {}
}

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

function navigateTo(view) {
    APP_STATE.currentView = view;
    renderView();
}

function goBack() {
    switch (APP_STATE.currentView) {
        case 'item-details':
            navigateTo('items');
            break;
        case 'items':
            if (APP_STATE.currentSubcategoryId) navigateTo('subcategories');
            else if (APP_STATE.currentCategoryId) navigateTo('categories');
            else if (APP_STATE.viewingGeneralRootItems) navigateTo('categories');
            else if (APP_STATE.currentGeneralId) navigateTo('general-categories');
            else navigateTo('general-categories');
            break;
        case 'subcategories':
            navigateTo('categories');
            break;
        case 'categories':
            navigateTo('general-categories');
            break;
        case 'general-categories':
        case 'admin-login':
        case 'admin-panel':
        default:
            navigateTo('home');
            break;
    }
}

async function renderView() {
    const container = document.getElementById('app');
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
        case 'item-details':
            await renderItemDetails(container);
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
        default:
            renderHome(container);
    }

    // Verificar scroll na lista após renderizar
    requestAnimationFrame(() => {
        const list = document.querySelector('.list');
        if (list) {
            const hasScroll = list.scrollHeight > list.clientHeight;
            list.classList.toggle('has-scroll', hasScroll);
        }
    });
}

window.navigateTo = navigateTo;
window.selectGeneralCategory = selectGeneralCategory;
window.selectCategory = selectCategory;
window.selectSubcategory = selectSubcategory;
window.selectItem = selectItem;
window.selectGeneralRootItems = selectGeneralRootItems;
window.goBack = goBack;

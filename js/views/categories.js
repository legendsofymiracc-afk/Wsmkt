// js/views/categories.js
const CATEGORY_ORDER = [
    'baus',
    'pacotes de iniciante',
    'armas',
    'armadura',
    'acessorios',
    'aprimoramentos',
    'consumiveis',
    'utilidades',
    'lacaios',
    'reliquias',
    'livros de habilidade',
    'visuais decorativos',
    'trajes luxuosos',
    'sorrisos',
    'recursos',
    'saquear'
];

function normalizeCategoryName(value) {
    return (value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function categorySortValue(node) {
    const index = CATEGORY_ORDER.indexOf(normalizeCategoryName(node.nome));
    return index >= 0 ? index : 999;
}

function isVisibleRootCategory(node) {
    return CATEGORY_ORDER.includes(normalizeCategoryName(node.nome));
}

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
    APP_STATE.categoryTree = sortCategoryNodes(tree).filter(isVisibleRootCategory);
    APP_STATE.generalCategories = [];
    APP_STATE.categoriesLevel2 = [];
    APP_STATE.categoriesLevel3 = [];
    APP_STATE.categoryIndex = new Map();
    APP_STATE.categoryTree.forEach(general => {
        const record = { id: general.id, id_pai: general.id_pai, nome: general.nome, nivel: general.nivel, imagem_url: general.imagem_url, filhos: general.filhos, geral_id: general.id };
        APP_STATE.generalCategories.push(record);
        APP_STATE.categoryIndex.set(record.id, record);
        sortCategoryNodes(general.filhos || []).forEach(cat => {
            const catRec = { id: cat.id, id_pai: cat.id_pai, nome: cat.nome, nivel: cat.nivel, imagem_url: cat.imagem_url, filhos: cat.filhos, geral_id: general.id, categoria_id: cat.id };
            APP_STATE.categoriesLevel2.push(catRec);
            APP_STATE.categoryIndex.set(catRec.id, catRec);
            sortCategoryNodes(cat.filhos || []).forEach(sub => {
                const subRec = { id: sub.id, id_pai: sub.id_pai, nome: sub.nome, nivel: sub.nivel, imagem_url: sub.imagem_url, filhos: sub.filhos, geral_id: general.id, categoria_id: cat.id };
                APP_STATE.categoriesLevel3.push(subRec);
                APP_STATE.categoryIndex.set(subRec.id, subRec);
            });
        });
    });
    APP_STATE.generalCategories.sort((a, b) => categorySortValue(a) - categorySortValue(b) || a.id - b.id);
}

function sortCategoryNodes(nodes) {
    const index = new Map(CATEGORY_ORDER.map((name, idx) => [name, idx]));
    return [...(nodes || [])].sort((a, b) => {
        const ai = index.has(normalizeCategoryName(a.nome)) ? index.get(normalizeCategoryName(a.nome)) : 1000;
        const bi = index.has(normalizeCategoryName(b.nome)) ? index.get(normalizeCategoryName(b.nome)) : 1000;
        if (ai !== bi) return ai - bi;
        return Number(a.id || 0) - Number(b.id || 0);
    }).map(node => ({ ...node, filhos: sortCategoryNodes(node.filhos || []) }));
}

function getGeneralById(id) { return id != null ? (APP_STATE.categoryIndex.get(id) || null) : null; }
function getCategoriesByGeneral(gid) { return APP_STATE.categoriesLevel2.filter(c => c.geral_id === gid); }
function getSubcategoriesByCategory(cid) { return APP_STATE.categoriesLevel3.filter(s => s.categoria_id === cid); }

function countItemsGeneral(general) { return APP_STATE.allItems.filter(it => (it.geral_id === general.id || it.id_geral === general.id)).length; }
function countItemsCategory(cat) { return APP_STATE.allItems.filter(it => (it.categoria_id === cat.id || it.id_categoria === cat.id)).length; }
function countItemsForSub(subId) { return APP_STATE.allItems.filter(it => it.id_subcategoria === subId).length; }

function getCategoryLabel(name) {
    return typeof translateCategoryName === 'function' ? translateCategoryName(name) : name;
}

function renderCategoryRow(node, onclick, count) {
    const label = getCategoryLabel(node.nome);
    return `<div class="row" onclick="${onclick}" tabindex="0">
        <div class="icon-wrapper"><img class="icon" src="${resolveImage(node.imagem_url)}" alt="${escapeHtml(label)}"><span class="count-badge">${count}</span></div>
        <div class="label">${escapeHtml(label)}</div>
    </div>`;
}

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

async function renderGeneralCategories(container) {
    await ensureCategoryTree();
    if (!APP_STATE.allItems.length) await loadAllItems();
    const rows = APP_STATE.generalCategories.map(cat => renderCategoryRow(cat, `selectGeneralCategory(${cat.id})`, countItemsGeneral(cat))).join('') || '<div class="row"><div class="label">Nenhuma categoria cadastrada.</div></div>';
    container.innerHTML = renderPanel('Catálogo', rows, '<button class="login-btn" onclick="goBack()">VOLTAR</button>');
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
        ...(rootItems.length ? [renderCategoryRow({ ...general, nome: 'Itens sem categoria' }, `selectGeneralRootItems(${general.id})`, rootItems.length)] : []),
        ...categories.map(cat => renderCategoryRow(cat, `selectCategory(${cat.id})`, countItemsCategory(cat)))
    ].join('') || '<div class="row"><div class="label">Nenhuma categoria disponível.</div></div>';
    container.innerHTML = renderPanel(escapeHtml(getCategoryLabel(general.nome)), rows, '<button class="login-btn" onclick="goBack()">VOLTAR</button>');
    addRowSelectionBehavior();
}

async function renderSubcategories(container) {
    await ensureCategoryTree();
    if (!APP_STATE.allItems.length) await loadAllItems();
    const cat = APP_STATE.categoryIndex.get(APP_STATE.currentCategoryId);
    if (!cat) { navigateTo('categories'); return; }
    const subs = getSubcategoriesByCategory(cat.id);
    const rows = subs.map(sub => renderCategoryRow(sub, `selectSubcategory(${sub.id})`, countItemsForSub(sub.id))).join('') || '<div class="row"><div class="label">Nenhuma subcategoria disponível.</div></div>';
    container.innerHTML = renderPanel(escapeHtml(getCategoryLabel(cat.nome)), rows, '<button class="login-btn" onclick="goBack()">VOLTAR</button>');
    addRowSelectionBehavior();
}

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

function countItemsGeneral(general) { return APP_STATE.allItems.filter(it => (it.geral_id === general.id || it.id_geral === general.id)).length; }
function countItemsCategory(cat) { return APP_STATE.allItems.filter(it => (it.categoria_id === cat.id || it.id_categoria === cat.id)).length; }
function countItemsForSub(subId) { return APP_STATE.allItems.filter(it => it.id_subcategoria === subId).length; }

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
    const html = APP_STATE.generalCategories.map(cat => `
        <div class="row" onclick="selectGeneralCategory(${cat.id})" tabindex="0">
            <div class="icon-wrapper"><img class="icon" src="${resolveImage(cat.imagem_url)}" alt="${escapeHtml(cat.nome)}"><span class="count-badge">${countItemsGeneral(cat)}</span></div>
            <div class="label">${escapeHtml(cat.nome)}</div>
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
        ...categories.map(cat => `<div class="row" onclick="selectCategory(${cat.id})" tabindex="0"><div class="icon-wrapper"><img class="icon" src="${resolveImage(cat.imagem_url)}" alt="${escapeHtml(cat.nome)}"><span class="count-badge">${countItemsCategory(cat)}</span></div><div class="label">${escapeHtml(cat.nome)}</div></div>`)
    ].join('') || '<div class="row"><div class="label">Nenhuma categoria disponível.</div></div>';
    container.innerHTML = renderPanel(escapeHtml(general.nome), rows, '<button class="login-btn" onclick="goBack()">VOLTAR</button>');
    addRowSelectionBehavior();
}

async function renderSubcategories(container) {
    await ensureCategoryTree();
    if (!APP_STATE.allItems.length) await loadAllItems();
    const cat = APP_STATE.categoryIndex.get(APP_STATE.currentCategoryId);
    if (!cat) { navigateTo('categories'); return; }
    const subs = getSubcategoriesByCategory(cat.id);
    const html = subs.map(sub => `<div class="row" onclick="selectSubcategory(${sub.id})" tabindex="0"><div class="icon-wrapper"><img class="icon" src="${resolveImage(sub.imagem_url)}" alt="${escapeHtml(sub.nome)}"><span class="count-badge">${countItemsForSub(sub.id)}</span></div><div class="label">${escapeHtml(sub.nome)}</div></div>`).join('') || '<div class="row"><div class="label">Nenhuma subcategoria disponível.</div></div>';
    container.innerHTML = renderPanel(escapeHtml(cat.nome), html, '<button class="login-btn" onclick="goBack()">VOLTAR</button>');
    addRowSelectionBehavior();
}

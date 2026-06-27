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
}

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

async function doLogout() {
    try {
        await fetchJSON('auth.php?action=logout', { method: 'POST' });
    } catch (error) {
        console.error('Erro ao fazer logout:', error);
    }
    APP_STATE.currentUser = { id: null, nome: null, papel: null, isLoggedIn: false };
    navigateTo('home');
}

async function renderAdminPanel(container) {
    if (!APP_STATE.isAdmin) {
        navigateTo('admin-login');
        return;
    }
    await ensureCategoryTree(true);
    await loadAllItems();

    container.innerHTML = `
        <section class="panel" role="dialog">
            <div class="corner top-left"></div>
            <div class="corner top-right"></div>
            <header class="header">
                <h1 class="title">Painel Administrativo</h1>
            </header>
            <div class="admin-panel">
                <div class="accordion">
                    <details class="accordion-item" open>
                        <summary>Categorias Gerais <span class="accordion-chevron">▶</span></summary>
                        <div class="accordion-content" id="accordion-general"></div>
                    </details>
                    <details class="accordion-item">
                        <summary>Categorias <span class="accordion-chevron">▶</span></summary>
                        <div class="accordion-content" id="accordion-categories"></div>
                    </details>
                    <details class="accordion-item">
                        <summary>Subcategorias <span class="accordion-chevron">▶</span></summary>
                        <div class="accordion-content" id="accordion-subcategories"></div>
                    </details>
                    <details class="accordion-item" open>
                        <summary>Itens <span class="accordion-chevron">▶</span></summary>
                        <div class="accordion-content" id="accordion-items">
                            <div class="accordion-filters">
                                <button class="admin-button" id="btn-new-item">➕ Novo Item</button>
                                <label for="filter-general">Categoria Geral</label>
                                <select id="filter-general"></select>
                                <label for="filter-category">Categoria</label>
                                <select id="filter-category"></select>
                                <label for="filter-subcategory">Subcategoria</label>
                                <select id="filter-subcategory"></select>
                                <input type="text" id="filter-term" placeholder="Buscar item...">
                            </div>
                            <div class="accordion-list" id="items-list"></div>
                        </div>
                    </details>
                    <details class="accordion-item">
                        <summary>Personalização Visual <span class="accordion-chevron">▶</span></summary>
                        <div class="accordion-content" id="accordion-appearance">
                            <div class="form-row">
                                <label for="corner-image-input">Imagem das cantoneiras</label>
                                <input type="text" id="corner-image-input" value="${APP_STATE.settings.corner_image_url || ''}" placeholder="ex: images/cantoneira.png">
                            </div>
                            <div class="form-row">
                                <label for="whatsapp-number-input">WhatsApp (somente números, com DDI)</label>
                                <input type="text" id="whatsapp-number-input" value="${APP_STATE.settings.whatsapp_number || ''}" placeholder="ex: 5511999999999">
                            </div>
                            <div class="form-row">
                                <label for="admin-new-password">Nova senha (6+)</label>
                                <input type="password" id="admin-new-password" placeholder="Opcional">
                            </div>
                            <div class="form-row">
                                <label for="admin-new-password-confirm">Confirmar senha</label>
                                <input type="password" id="admin-new-password-confirm" placeholder="Repita a nova senha">
                            </div>
                            <div class="form-actions">
                                <button class="btn" id="btn-save-corner">Salvar</button>
                            </div>
                            <div style="font-size:12px; opacity:0.8;">Use caminhos relativos ao projeto ou URLs completas.</div>
                        </div>
                    </details>
                </div>
            </div>
            <div class="footer">
                <button class="login-btn" onclick="doLogout()">SAIR</button>
            </div>
        </section>
    `;

    renderAccordionGeneral();
    renderAccordionCategories();
    renderAccordionSubcategories();
    setupItemsAccordion();
    setupAppearanceAccordion();
}

function renderAccordionGeneral() {
    const container = document.getElementById('accordion-general');
    if (!container) return;
    if (!APP_STATE.generalCategories.length) {
        container.innerHTML = '<div class="accordion-empty">Nenhuma categoria geral cadastrada.</div>';
        return;
    }
    container.innerHTML = APP_STATE.generalCategories.map(cat => {
        const categoriesCount = getCategoriesByGeneral(cat.id).length;
        return `
            <div class="admin-row">
                <img class="thumb" src="${resolveImage(cat.imagem_url)}" alt="${cat.nome}">
                <div>
                    <div class="title">${cat.nome}</div>
                    <div class="subtitle">${categoriesCount} categorias</div>
                </div>
                <div><input type="file" accept="image/*" data-cat-id="${cat.id}"></div>
            </div>
        `;
    }).join('');
    attachCategoryImageUploadHandlers(container);
}

function renderAccordionCategories() {
    const container = document.getElementById('accordion-categories');
    if (!container) return;
    if (!APP_STATE.generalCategories.length) {
        container.innerHTML = '<div class="accordion-empty">Nenhuma categoria disponível.</div>';
        return;
    }
    container.innerHTML = APP_STATE.generalCategories.map(general => {
        const categories = getCategoriesByGeneral(general.id);
        const list = categories.length ? categories.map(cat => `
            <div class="admin-row">
                <img class="thumb" src="${resolveImage(cat.imagem_url)}" alt="${cat.nome}">
                <div>
                    <div class="title">${cat.nome}</div>
                    <div class="subtitle">Pertence a ${general.nome}</div>
                </div>
                <div><input type="file" accept="image/*" data-cat-id="${cat.id}"></div>
            </div>
        `).join('') : '<div class="accordion-empty">Sem categorias vinculadas.</div>';
        return `
            <div>
                <div class="accordion-group-title">${general.nome}</div>
                <div class="accordion-list">${list}</div>
            </div>
        `;
    }).join('');
    attachCategoryImageUploadHandlers(container);
}

function renderAccordionSubcategories() {
    const container = document.getElementById('accordion-subcategories');
    if (!container) return;
    if (!APP_STATE.categoriesLevel3.length) {
        container.innerHTML = '<div class="accordion-empty">Nenhuma subcategoria cadastrada.</div>';
        return;
    }
    container.innerHTML = APP_STATE.categoriesLevel3.map(sub => {
        const category = APP_STATE.categoryIndex.get(sub.categoria_id);
        const general = APP_STATE.categoryIndex.get(sub.geral_id);
        return `
            <div class="admin-row">
                <img class="thumb" src="${resolveImage(sub.imagem_url)}" alt="${sub.nome}">
                <div>
                    <div class="title">${sub.nome}</div>
                    <div class="subtitle">Categoria: ${category ? category.nome : 'N/A'} • Geral: ${general ? general.nome : 'N/A'}</div>
                </div>
                <div><input type="file" accept="image/*" data-cat-id="${sub.id}"></div>
            </div>
        `;
    }).join('');
    attachCategoryImageUploadHandlers(container);
}

async function updateCategoryImage(catId, imagePath) {
    return fetchJSON('categories.php', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: catId, imagem_url: imagePath })
    });
}

function attachCategoryImageUploadHandlers(root) {
    if (!root) return;
    const inputs = root.querySelectorAll('input[type="file"][data-cat-id]');
    inputs.forEach(input => {
        input.addEventListener('change', async () => {
            const file = input.files && input.files[0];
            if (!file) return;
            const id = parseInt(input.getAttribute('data-cat-id') || '0', 10);
            try {
                const path = await uploadImage(file);
                await updateCategoryImage(id, path);
                showToast('Imagem atualizada', 'success');
                await ensureCategoryTree(true);
                // Re-render as três seções para refletir as novas imagens
                renderAccordionGeneral();
                renderAccordionCategories();
                renderAccordionSubcategories();
            } catch (err) {
                console.error('Falha ao atualizar imagem da categoria:', err);
                showToast(err.message || 'Erro ao atualizar imagem', 'error');
            } finally {
                input.value = '';
            }
        });
    });
}

function setupItemsAccordion() {
    const generalSelect = document.getElementById('filter-general');
    const categorySelect = document.getElementById('filter-category');
    const subcategorySelect = document.getElementById('filter-subcategory');
    const searchInput = document.getElementById('filter-term');
    const listContainer = document.getElementById('items-list');
    const newButton = document.getElementById('btn-new-item');

    if (!generalSelect || !categorySelect || !subcategorySelect || !searchInput || !listContainer || !newButton) {
        return;
    }

    fillSelect(generalSelect, APP_STATE.generalCategories, 'Todas');
    fillSelect(categorySelect, [], 'Todas');
    fillSelect(subcategorySelect, [], 'Todas');

    generalSelect.addEventListener('change', () => {
        const generalId = parseInt(generalSelect.value || '0', 10);
        const categories = generalId ? getCategoriesByGeneral(generalId) : APP_STATE.categoriesLevel2;
        fillSelect(categorySelect, categories, 'Todas');
        fillSelect(subcategorySelect, [], 'Todas');
        renderAdminItemsList(listContainer, generalId, 0, 0, searchInput.value);
    });

    categorySelect.addEventListener('change', () => {
        const generalId = parseInt(generalSelect.value || '0', 10);
        const categoryId = parseInt(categorySelect.value || '0', 10);
        const subcategories = categoryId ? getSubcategoriesByCategory(categoryId) : (generalId ? APP_STATE.categoriesLevel3.filter(sub => sub.geral_id === generalId) : APP_STATE.categoriesLevel3);
        fillSelect(subcategorySelect, subcategories, 'Todas');
        renderAdminItemsList(listContainer, generalId, categoryId, 0, searchInput.value);
    });

    subcategorySelect.addEventListener('change', () => {
        const generalId = parseInt(generalSelect.value || '0', 10);
        const categoryId = parseInt(categorySelect.value || '0', 10);
        const subcategoryId = parseInt(subcategorySelect.value || '0', 10);
        renderAdminItemsList(listContainer, generalId, categoryId, subcategoryId, searchInput.value);
    });

    searchInput.addEventListener('input', () => {
        const generalId = parseInt(generalSelect.value || '0', 10);
        const categoryId = parseInt(categorySelect.value || '0', 10);
        const subcategoryId = parseInt(subcategorySelect.value || '0', 10);
        renderAdminItemsList(listContainer, generalId, categoryId, subcategoryId, searchInput.value);
    });

    newButton.addEventListener('click', () => openItemForm());

    renderAdminItemsList(listContainer, 0, 0, 0, '');
}

function fillSelect(select, items, placeholder) {
    if (!select) return;
    const options = [`<option value="0">${placeholder}</option>`];
    items.forEach(item => {
        options.push(`<option value="${item.id}">${item.nome}</option>`);
    });
    select.innerHTML = options.join('');
}

function renderAdminItemsList(container, generalId, categoryId, subcategoryId, term) {
    if (!container) return;
    const filterTerm = (term || '').toLowerCase();
    const filtered = APP_STATE.allItems.filter(item => {
        if (generalId && item.geral_id !== generalId) return false;
        if (categoryId && item.categoria_id !== categoryId) return false;
        if (subcategoryId && item.id_subcategoria !== subcategoryId) return false;
        if (filterTerm && !(item.nome || '').toLowerCase().includes(filterTerm)) return false;
        return true;
    });

    if (!filtered.length) {
        container.innerHTML = '<div class="accordion-empty">Nenhum item encontrado.</div>';
        return;
    }

    container.innerHTML = filtered.map(item => {
        const priceCoins = item.preco_moedas || 0;
        const priceBRL = formatCurrencyBRL(resolveBRLValue(item));
        return `
            <div class="admin-row">
                <img class="thumb" src="${resolveImage(item.imagem_url)}" alt="${item.nome}">
                <div>
                    <div class="title">${item.nome}</div>
                    <div class="subtitle">${priceCoins} moedas • ${priceBRL}</div>
                    <div class="subtitle">Subcategoria: ${item.subcategoria_nome || 'N/A'} • Quantidade: ${item.quantidade_disponivel}</div>
                </div>
                <div class="admin-item-actions">
                    <button class="admin-button" onclick="openItemForm(${item.id})">Editar</button>
                    <button class="admin-button danger" onclick="promptDeleteItem(${item.id})">Excluir</button>
                </div>
            </div>
        `;
    }).join('');
}

function setupAppearanceAccordion() {
    const input = document.getElementById('corner-image-input');
    const saveButton = document.getElementById('btn-save-corner');
    const waInput = document.getElementById('whatsapp-number-input');
    const newPassInput = document.getElementById('admin-new-password');
    const newPassConfirmInput = document.getElementById('admin-new-password-confirm');
    if (!input || !saveButton) return;
    saveButton.addEventListener('click', async () => {
        const value = input.value.trim() || CONFIG.DEFAULT_CORNER_IMAGE;
        const wa = (waInput?.value || '').trim();
        const pass = (newPassInput?.value || '').trim();
        const passConfirm = (newPassConfirmInput?.value || '').trim();
        try {
            const payload = { corner_image_url: value, whatsapp_number: wa };
            if (pass || passConfirm) {
                if (pass !== passConfirm) {
                    showToast('Senhas não conferem', 'error');
                    return;
                }
                if (pass.length < 6) {
                    showToast('Senha deve ter 6+ caracteres', 'error');
                    return;
                }
                payload.new_admin_password = pass;
            }
            const data = await fetchJSON('settings.php', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (data.success) {
                APP_STATE.settings.corner_image_url = value;
                APP_STATE.settings.whatsapp_number = wa;
                applySettingsToTheme();
                showToast('Configurações salvas', 'success');
                if (payload.new_admin_password) {
                    showToast('Senha alterada', 'success');
                    if (newPassInput) newPassInput.value = '';
                    if (newPassConfirmInput) newPassConfirmInput.value = '';
                }
            } else {
                showToast('Não foi possível salvar a configuração', 'error');
            }
        } catch (error) {
            console.error('Erro ao salvar cantoneira:', error);
            showToast(error.message || 'Erro ao salvar cantoneira', 'error');
        }
    });
}

async function openItemForm(itemId = null) {
    await ensureCategoryTree();
    let item = null;
    if (itemId != null) {
        item = APP_STATE.allItems.find(i => i.id === itemId) || null;
        if (!item) {
            try {
                const data = await fetchJSON(`items.php?id=${itemId}`);
                const sanitized = sanitizeItems([data]);
                item = sanitized[0];
            } catch (error) {
                console.error('Erro ao carregar item para edição:', error);
            }
        }
    }

    const defaultGeneralId = item ? (item.geral_id || item.id_geral || 0) : (APP_STATE.currentGeneralId || (APP_STATE.generalCategories[0]?.id || 0));
    const categoriesForGeneral = defaultGeneralId ? getCategoriesByGeneral(defaultGeneralId) : APP_STATE.categoriesLevel2;
    const defaultCategoryId = item ? (item.categoria_id || item.id_categoria || 0) : (categoriesForGeneral[0]?.id || 0);
    const subcategoriesForCategory = defaultCategoryId ? getSubcategoriesByCategory(defaultCategoryId) : [];
    const defaultSubId = item ? (item.id_subcategoria || 0) : (subcategoriesForCategory[0]?.id || 0);

    const generalOptions = APP_STATE.generalCategories.map(g => `<option value="${g.id}" ${g.id === defaultGeneralId ? 'selected' : ''}>${g.nome}</option>`).join('');
    const categoryOptions = categoriesForGeneral.map(c => `<option value="${c.id}" ${c.id === defaultCategoryId ? 'selected' : ''}>${c.nome}</option>`).join('');
    const subcategoryOptions = subcategoriesForCategory.map(s => `<option value="${s.id}" ${s.id === defaultSubId ? 'selected' : ''}>${s.nome}</option>`).join('');

    const inner = `
        <h2>${item ? 'Editar Item' : 'Novo Item'}</h2>
        <div class="form-row"><label>Categoria Geral</label><select id="form-general">${generalOptions}</select></div>
        <div class="form-row" id="row-category" style="${categoriesForGeneral.length ? '' : 'display:none;'}"><label>Categoria</label><select id="form-category">${categoryOptions}</select></div>
        <div class="form-row" id="row-subcategory" style="${subcategoriesForCategory.length ? '' : 'display:none;'}"><label>Subcategoria</label><select id="form-subcategory">${subcategoryOptions}</select></div>
        <div class="form-row"><label>Nome</label><input type="text" id="form-name" value="${item ? item.nome : ''}"></div>
        <div class="form-row"><label>Descrição</label><textarea id="form-description">${item ? (item.descricao || '') : ''}</textarea></div>
        <div class="form-row"><label>Preço (moedas)</label><input type="number" min="0" id="form-price-coins" value="${item ? item.preco_moedas : 0}"></div>
        <div class="form-row"><label>Preço em R$</label><input type="number" step="0.01" min="0" id="form-price-brl" value="${item ? item.preco_reais : 0}"></div>
        <div class="form-row"><label>Quantidade</label><input type="number" min="0" id="form-quantity" value="${item ? item.quantidade_disponivel : 0}"></div>
        <div class="form-row"><label>Imagem</label><input type="file" accept="image/*" id="form-image"></div>
        <div class="form-actions">
            <button class="btn cancel" onclick="closeModal()">Cancelar</button>
            <button class="btn" id="form-submit">${item ? 'Salvar' : 'Criar'}</button>
        </div>
    `;

    renderModal(inner);

    const generalSelect = document.getElementById('form-general');
    const categorySelect = document.getElementById('form-category');
    const subcategorySelect = document.getElementById('form-subcategory');

    function refreshCategoryVisibility() {
        const generalId = parseInt(generalSelect.value || '0', 10);
        const categories = generalId ? getCategoriesByGeneral(generalId) : [];
        fillSelect(categorySelect, categories, 'Selecione');
        document.getElementById('row-category').style.display = categories.length ? '' : 'none';
        if (!categories.length) {
            document.getElementById('row-subcategory').style.display = 'none';
            fillSelect(subcategorySelect, [], 'Selecione');
        } else {
            categorySelect.value = categories.length ? String(categories[0].id) : '0';
            refreshSubcategoryVisibility();
        }
    }

    function refreshSubcategoryVisibility() {
        const categoryId = parseInt(categorySelect.value || '0', 10);
        const subs = categoryId ? getSubcategoriesByCategory(categoryId) : [];
        fillSelect(subcategorySelect, subs, 'Selecione');
        document.getElementById('row-subcategory').style.display = subs.length ? '' : 'none';
        if (subs.length) {
            subcategorySelect.value = String(subs[0].id);
        }
    }

    generalSelect.addEventListener('change', () => {
        const generalId = parseInt(generalSelect.value || '0', 10);
        refreshCategoryVisibility();
    });

    categorySelect.addEventListener('change', refreshSubcategoryVisibility);

    document.getElementById('form-submit').addEventListener('click', async () => {
        const name = document.getElementById('form-name').value.trim();
        const description = document.getElementById('form-description').value.trim();
        const priceCoins = parseInt(document.getElementById('form-price-coins').value || '0', 10);
        const priceBRL = parseFloat(document.getElementById('form-price-brl').value || '0');
        const quantity = parseInt(document.getElementById('form-quantity').value || '0', 10);
    const generalId = parseInt(generalSelect.value || '0', 10);
    const categoryVisible = document.getElementById('row-category').style.display !== 'none';
    const subVisible = document.getElementById('row-subcategory').style.display !== 'none';
    const categoryId = categoryVisible ? parseInt(categorySelect.value || '0', 10) : 0;
    const subcategoryId = subVisible ? parseInt(subcategorySelect.value || '0', 10) : 0;

        if (!name) {
            showToast('Informe o nome do item', 'error');
            return;
        }
        if (!generalId) {
            showToast('Selecione uma categoria geral', 'error');
            return;
        }
        if (priceCoins < 0 || isNaN(priceCoins)) {
            showToast('Preço em moedas inválido', 'error');
            return;
        }
        if (priceBRL < 0 || isNaN(priceBRL)) {
            showToast('Preço em R$ inválido', 'error');
            return;
        }
        if (quantity < 0 || isNaN(quantity)) {
            showToast('Quantidade inválida', 'error');
            return;
        }

        const payload = {
            nome: name,
            descricao: description,
            preco_moedas: priceCoins,
            preco_reais: priceBRL,
            quantidade_disponivel: quantity,
            imagem_url: item ? item.imagem_url : ''
        };
        if (subcategoryId) {
            payload.id_subcategoria = subcategoryId;
        } else if (categoryId) {
            payload.id_categoria = categoryId;
        } else if (generalId) {
            payload.id_geral = generalId;
        }

        const fileInput = document.getElementById('form-image');
        if (fileInput.files && fileInput.files[0]) {
            try {
                payload.imagem_url = await uploadImage(fileInput.files[0]);
            } catch (error) {
                console.error('Erro ao enviar imagem:', error);
                showToast(error.message || 'Erro ao enviar imagem', 'error');
                return;
            }
        }

        try {
            if (item) {
                payload.id = item.id;
                await fetchJSON('items.php', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                showToast('Item atualizado', 'success');
            } else {
                await fetchJSON('items.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                showToast('Item criado', 'success');
            }
            closeModal();
            await loadAllItems();
            if (APP_STATE.currentSubcategoryId) await loadItemsBySubcategory(APP_STATE.currentSubcategoryId);
            else if (APP_STATE.currentCategoryId) await loadItemsByCategory(APP_STATE.currentCategoryId);
            else if (APP_STATE.currentGeneralId) await loadItemsByGeneral(APP_STATE.currentGeneralId);
            renderAdminItemsList(
                document.getElementById('items-list'),
                parseInt(document.getElementById('filter-general').value || '0', 10),
                parseInt(document.getElementById('filter-category').value || '0', 10),
                parseInt(document.getElementById('filter-subcategory').value || '0', 10),
                document.getElementById('filter-term').value || ''
            );
        } catch (error) {
            console.error('Erro ao salvar item:', error);
            showToast(error.message || 'Erro ao salvar item', 'error');
        }
    });
}

async function promptDeleteItem(itemId) {
    const confirmed = await confirmModal('Deseja excluir este item?');
    if (!confirmed) return;
    try {
        await fetchJSON('items.php', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: itemId })
        });
        showToast('Item excluído', 'success');
        await loadAllItems();
        if (APP_STATE.currentSubcategoryId) await loadItemsBySubcategory(APP_STATE.currentSubcategoryId);
        else if (APP_STATE.currentCategoryId) await loadItemsByCategory(APP_STATE.currentCategoryId);
        else if (APP_STATE.currentGeneralId) await loadItemsByGeneral(APP_STATE.currentGeneralId);
        renderAdminItemsList(
            document.getElementById('items-list'),
            parseInt(document.getElementById('filter-general').value || '0', 10),
            parseInt(document.getElementById('filter-category').value || '0', 10),
            parseInt(document.getElementById('filter-subcategory').value || '0', 10),
            document.getElementById('filter-term').value || ''
        );
    } catch (error) {
        console.error('Erro ao excluir item:', error);
        showToast(error.message || 'Erro ao excluir item', 'error');
    }
}

window.navigateTo = navigateTo;
window.selectGeneralCategory = selectGeneralCategory;
window.selectCategory = selectCategory;
window.selectSubcategory = selectSubcategory;
window.selectItem = selectItem;
window.selectGeneralRootItems = selectGeneralRootItems;
window.goBack = goBack;
window.doLogin = doLogin;
window.doLogout = doLogout;
window.openItemForm = openItemForm;
window.promptDeleteItem = promptDeleteItem;

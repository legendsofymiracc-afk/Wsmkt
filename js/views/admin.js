// js/views/admin.js — Painel administrativo premium

/* -----------------------------------------
   Login
   ----------------------------------------- */

function renderAdminLogin(container) {
    container.innerHTML = `
        <section class="panel" role="dialog">
            <div class="corner top-left"></div>
            <div class="corner top-right"></div>
            <header class="header">
                <h1 class="title">Acesso</h1>
            </header>
            <div class="login-container">
                <div class="login-card">
                    <div class="login-icon">⚔️</div>
                    <h2>Mercado Warspear</h2>
                    <p class="login-subtitle">Acesso ao Painel</p>
                    <div class="login-field">
                        <span class="login-field-icon">📧</span>
                        <input type="email" id="admin-email" placeholder="Email" autocomplete="email">
                    </div>
                    <div class="login-field">
                        <span class="login-field-icon">🔒</span>
                        <input type="password" id="admin-password" placeholder="Senha" autocomplete="current-password">
                    </div>
                    <button class="login-submit" onclick="doLogin()">Entrar</button>
                    <button class="login-btn" onclick="goBack()">VOLTAR</button>
                </div>
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
        const token = await getCsrfToken();
        const body = new URLSearchParams({ email, password }).toString();
        let response = await fetch(`${CONFIG.API_URL}/auth.php?action=login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8', ...(token ? { 'X-CSRF-Token': token } : {}) },
            credentials: 'same-origin',
            body
        });
        if (response.status === 405) {
            response = await fetch(`${CONFIG.API_URL}/auth.php?action=login&email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`, {
                method: 'GET',
                headers: token ? { 'X-CSRF-Token': token } : {},
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

/* -----------------------------------------
   Variáveis de estado do admin
   ----------------------------------------- */

let ADMIN_STATE = { activeTab: 'dashboard' };

/* -----------------------------------------
   Painel principal premium
   ----------------------------------------- */

async function renderAdminPanel(container) {
    if (!APP_STATE.isAdmin) {
        navigateTo('admin-login');
        return;
    }
    await ensureCategoryTree(true);
    await loadAllItems();

    // Stats
    const totalItems = APP_STATE.allItems.length;
    const totalGenerals = APP_STATE.generalCategories.length;
    const totalCategories = APP_STATE.categoriesLevel2.length;
    const totalSubs = APP_STATE.categoriesLevel3.length;
    const itemsWithImg = APP_STATE.allItems.filter(i => i.imagem_url && i.imagem_url.trim()).length;

    container.innerHTML = `
        <section class="panel" role="dialog">
            <div class="corner top-left"></div>
            <div class="corner top-right"></div>
            <header class="header">
                <h1 class="title">Painel Administrativo</h1>
                <div class="user-info-bar">Logado como: ${escapeHtml(APP_STATE.currentUser.nome)} (Dono)</div>
            </header>
            <div class="admin-panel">
                <div class="admin-tabs">
                    <div class="admin-tab active" data-tab="dashboard">📊 Dashboard</div>
                    <div class="admin-tab" data-tab="items">📦 Itens</div>
                    <div class="admin-tab" data-tab="categories">📁 Categorias</div>
                    <div class="admin-tab" data-tab="sellers">👥 Vendedores</div>
                    <div class="admin-tab" data-tab="settings">⚙️ Config</div>
                </div>
                <div class="admin-content" id="admin-content">
                    <!-- Renderizado dinamicamente -->
                </div>
            </div>
            <div class="footer">
                <button class="login-btn" onclick="doLogout()">SAIR</button>
            </div>
        </section>
    `;

    // Tab switching
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            ADMIN_STATE.activeTab = tab.dataset.tab;
            renderAdminTabContent();
        });
    });

    renderAdminTabContent();
}

/* -----------------------------------------
   Renderizador de abas
   ----------------------------------------- */

function renderAdminTabContent() {
    const content = document.getElementById('admin-content');
    if (!content) return;

    switch (ADMIN_STATE.activeTab) {
        case 'dashboard': renderAdminDashboard(content); break;
        case 'items': renderAdminItems(content); break;
        case 'categories': renderAdminCategories(content); break;
        case 'sellers': renderAdminSellers(content); break;
        case 'settings': renderAdminSettings(content); break;
        default: renderAdminDashboard(content);
    }
}

/* -----------------------------------------
   Aba: Dashboard
   ----------------------------------------- */

function renderAdminDashboard(container) {
    const totalItems = APP_STATE.allItems.length;
    const totalGenerals = APP_STATE.generalCategories.length;
    const totalCategories = APP_STATE.categoriesLevel2.length;
    const totalSubs = APP_STATE.categoriesLevel3.length;
    const itemsWithImg = APP_STATE.allItems.filter(i => i.imagem_url && i.imagem_url.trim()).length;
    const itemsWithVendor = APP_STATE.allItems.filter(i => i.id_vendedor).length;

    container.innerHTML = `
        <div class="admin-card">
            <div class="admin-card-header">📊 Resumo</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                <div class="stat-item"><div class="stat-value">${totalItems}</div><div class="stat-label">Total de Itens</div></div>
                <div class="stat-item"><div class="stat-value">${itemsWithVendor}</div><div class="stat-label">Com Vendedor</div></div>
                <div class="stat-item"><div class="stat-value">${totalGenerals}</div><div class="stat-label">Categorias Gerais</div></div>
                <div class="stat-item"><div class="stat-value">${totalCategories}</div><div class="stat-label">Categorias</div></div>
                <div class="stat-item"><div class="stat-value">${totalSubs}</div><div class="stat-label">Subcategorias</div></div>
                <div class="stat-item"><div class="stat-value">${itemsWithImg}</div><div class="stat-label">Itens com Imagem</div></div>
            </div>
        </div>
        <div class="admin-card">
            <div class="admin-card-header">⚡ Ações Rápidas</div>
            <div style="display:flex;flex-wrap:wrap;gap:8px;">
                <button class="admin-button" onclick="switchAdminTab('items');setTimeout(()=>document.getElementById('btn-new-item')?.click(),100)">➕ Novo Item</button>
                <button class="admin-button" onclick="switchAdminTab('sellers')">👥 Gerenciar Vendedores</button>
                <button class="admin-button" onclick="switchAdminTab('settings')">⚙️ Configurações</button>
            </div>
        </div>
        <div class="admin-card">
            <div class="admin-card-header">📦 Últimos Itens</div>
            <div id="dashboard-last-items">${renderLastItemsList()}</div>
        </div>
    `;
}

function renderLastItemsList() {
    const items = APP_STATE.allItems.slice(-5).reverse();
    if (!items.length) return '<div style="opacity:0.6;font-size:13px;">Nenhum item cadastrado.</div>';
    return `<table class="admin-table">
        <tr><th>Item</th><th>Preço</th><th>Vendedor</th></tr>
        ${items.map(i => `<tr><td>${escapeHtml(i.nome)}</td><td>${i.preco_moedas || 0} moedas</td><td>${i.nome_vendedor || '-'}</td></tr>`).join('')}
    </table>`;
}

function switchAdminTab(tabName) {
    ADMIN_STATE.activeTab = tabName;
    document.querySelectorAll('.admin-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.tab === tabName);
    });
    renderAdminTabContent();
}
window.switchAdminTab = switchAdminTab;

/* -----------------------------------------
   Aba: Itens (com filtros premium)
   ----------------------------------------- */

function renderAdminItems(container) {
    container.innerHTML = `
        <div class="admin-card">
            <div class="admin-card-header">📦 Gerenciar Itens</div>
            <div style="margin-bottom:12px;">
                <button class="admin-button" id="btn-new-item">➕ Novo Item</button>
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px;">
                <select id="af-general" style="padding:6px 10px;background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.1);color:var(--gold);border-radius:6px;"></select>
                <select id="af-category" style="padding:6px 10px;background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.1);color:var(--gold);border-radius:6px;"></select>
                <select id="af-subcategory" style="padding:6px 10px;background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.1);color:var(--gold);border-radius:6px;"></select>
                <input type="text" id="af-search" placeholder="Buscar item..." style="padding:6px 10px;background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.1);color:var(--gold);border-radius:6px;min-width:160px;">
            </div>
            <div id="admin-items-list"></div>
        </div>
    `;

    const genSel = document.getElementById('af-general');
    const catSel = document.getElementById('af-category');
    const subSel = document.getElementById('af-subcategory');
    const searchInput = document.getElementById('af-search');
    const listContainer = document.getElementById('admin-items-list');
    const newBtn = document.getElementById('btn-new-item');

    fillSelect(genSel, APP_STATE.generalCategories, 'Todas');
    fillSelect(catSel, [], 'Todas');
    fillSelect(subSel, [], 'Todas');

    function refreshItemsList() {
        const gid = parseInt(genSel.value || '0', 10);
        const cid = parseInt(catSel.value || '0', 10);
        const sid = parseInt(subSel.value || '0', 10);
        const term = searchInput.value || '';
        renderAdminItemsList(listContainer, gid, cid, sid, term);
    }

    genSel.addEventListener('change', () => {
        const gid = parseInt(genSel.value || '0', 10);
        const cats = gid ? getCategoriesByGeneral(gid) : [];
        fillSelect(catSel, cats, 'Todas');
        fillSelect(subSel, [], 'Todas');
        refreshItemsList();
    });
    catSel.addEventListener('change', () => {
        const cid = parseInt(catSel.value || '0', 10);
        const subs = cid ? getSubcategoriesByCategory(cid) : [];
        fillSelect(subSel, subs, 'Todas');
        refreshItemsList();
    });
    subSel.addEventListener('change', refreshItemsList);
    searchInput.addEventListener('input', refreshItemsList);
    newBtn.addEventListener('click', () => openItemForm());
    refreshItemsList();
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
        container.innerHTML = '<div style="opacity:0.6;font-size:13px;padding:12px;">Nenhum item encontrado.</div>';
        return;
    }

    container.innerHTML = `<table class="admin-table">
        <tr><th>Item</th><th>Preço</th><th>Categoria</th><th>Estoque</th><th>Ações</th></tr>
        ${filtered.map(item => {
            const pCoins = item.preco_moedas || 0;
            const pBRL = formatCurrencyBRL(resolveBRLValue(item));
            const catPath = [item.geral_nome, item.categoria_nome, item.subcategoria_nome].filter(Boolean).join(' › ');
            return `<tr>
                <td style="display:flex;align-items:center;gap:10px;">
                    <img src="${resolveImage(item.imagem_url)}" style="width:36px;height:36px;object-fit:cover;border:1px solid var(--gold-border);background:#1a1a1a;border-radius:4px;">
                    <span>${escapeHtml(item.nome)}</span>
                </td>
                <td>${pCoins} moedas<br><span style="font-size:11px;color:#888;">${pBRL}</span></td>
                <td style="font-size:12px;">${catPath || 'N/A'}</td>
                <td>${item.quantidade_disponivel}</td>
                <td>
                    <button class="admin-button" style="padding:4px 10px;font-size:12px;" onclick="openItemForm(${item.id})">Editar</button>
                    <button class="admin-button danger" style="padding:4px 10px;font-size:12px;" onclick="promptDeleteItem(${item.id})">Excluir</button>
                </td>
            </tr>`;
        }).join('')}
    </table>`;
}

/* -----------------------------------------
   Aba: Categorias
   ----------------------------------------- */

function renderAdminCategories(container) {
    container.innerHTML = `
        <div class="admin-card">
            <div class="admin-card-header">📁 Categorias Gerais</div>
            <div id="ac-general">${renderGeneralCategoryRows()}</div>
        </div>
        <div class="admin-card">
            <div class="admin-card-header">📂 Categorias</div>
            <div id="ac-categories">${renderCategoryRows()}</div>
        </div>
        <div class="admin-card">
            <div class="admin-card-header">📋 Subcategorias</div>
            <div id="ac-subcategories">${renderSubcategoryRows()}</div>
        </div>
    `;
    attachCategoryImageUploadHandlers(document.getElementById('admin-content'));
}

function renderGeneralCategoryRows() {
    if (!APP_STATE.generalCategories.length) {
        return '<div style="opacity:0.6;font-size:13px;">Nenhuma categoria geral.</div>';
    }
    return `<table class="admin-table">
        <tr><th>Geral</th><th>Imagem</th></tr>
        ${APP_STATE.generalCategories.map(c => `
            <tr>
                <td><strong>${escapeHtml(c.nome)}</strong></td>
                <td><input type="file" accept="image/*" data-cat-id="${c.id}" style="font-size:12px;"></td>
            </tr>
        `).join('')}
    </table>`;
}

function renderCategoryRows() {
    if (!APP_STATE.generalCategories.length) {
        return '<div style="opacity:0.6;font-size:13px;">Nenhuma categoria disponível.</div>';
    }
    let html = '';
    APP_STATE.generalCategories.forEach(general => {
        const cats = getCategoriesByGeneral(general.id);
        if (!cats.length) return;
        html += `<div style="margin-bottom:8px;"><strong style="color:var(--gold);font-size:13px;">${escapeHtml(general.nome)}</strong>`;
        html += `<table class="admin-table">
            <tr><th>Categoria</th><th>Imagem</th></tr>
            ${cats.map(c => `<tr><td>${escapeHtml(c.nome)}</td><td><input type="file" accept="image/*" data-cat-id="${c.id}" style="font-size:12px;"></td></tr>`).join('')}
        </table></div>`;
    });
    return html || '<div style="opacity:0.6;font-size:13px;">Nenhuma categoria vinculada.</div>';
}

function renderSubcategoryRows() {
    if (!APP_STATE.categoriesLevel3.length) {
        return '<div style="opacity:0.6;font-size:13px;">Nenhuma subcategoria.</div>';
    }
    return `<table class="admin-table">
        <tr><th>Subcategoria</th><th>Caminho</th><th>Imagem</th></tr>
        ${APP_STATE.categoriesLevel3.map(sub => {
            const cat = APP_STATE.categoryIndex.get(sub.categoria_id);
            const gen = APP_STATE.categoryIndex.get(sub.geral_id);
            return `<tr>
                <td>${escapeHtml(sub.nome)}</td>
                <td style="font-size:12px;color:#aaa;">${gen ? escapeHtml(gen.nome) : 'N/A'} › ${cat ? escapeHtml(cat.nome) : 'N/A'}</td>
                <td><input type="file" accept="image/*" data-cat-id="${sub.id}" style="font-size:12px;"></td>
            </tr>`;
        }).join('')}
    </table>`;
}

/* -----------------------------------------
   Upload de imagem para categorias
   ----------------------------------------- */

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
                renderAdminTabContent();
            } catch (err) {
                showToast(err.message || 'Erro ao atualizar imagem', 'error');
            } finally {
                input.value = '';
            }
        });
    });
}

/* -----------------------------------------
   Aba: Vendedores
   ----------------------------------------- */

async function renderAdminSellers(container) {
    container.innerHTML = `
        <div class="admin-card">
            <div class="admin-card-header">👥 Gerenciar Vendedores</div>
            <div style="margin-bottom:12px;">
                <button class="admin-button" id="btn-new-seller-admin">+ Novo Vendedor</button>
            </div>
            <div id="admin-sellers-list">Carregando...</div>
        </div>
    `;
    document.getElementById('btn-new-seller-admin').addEventListener('click', () => openSellerForm());
    await renderSellersTable();
}

async function renderSellersTable() {
    const container = document.getElementById('admin-sellers-list');
    if (!container) return;
    try {
        const sellers = await fetchJSON('sellers.php');
        if (!sellers.length) {
            container.innerHTML = '<div style="opacity:0.6;font-size:13px;">Nenhum vendedor cadastrado.</div>';
            return;
        }
        container.innerHTML = `<table class="admin-table">
            <tr><th>Nome</th><th>Email</th><th>WhatsApp</th><th>Itens</th><th>Status</th><th>Ações</th></tr>
            ${sellers.map(s => `
                <tr>
                    <td><strong>${escapeHtml(s.nome)}</strong></td>
                    <td>${escapeHtml(s.email)}</td>
                    <td>${escapeHtml(s.whatsapp || '-')}</td>
                    <td>${s.total_itens || 0}</td>
                    <td><span class="admin-badge ${s.ativo ? 'badge-active' : 'badge-inactive'}">${s.ativo ? 'Ativo' : 'Inativo'}</span></td>
                    <td style="display:flex;gap:4px;">
                        <button class="admin-button" style="padding:4px 10px;font-size:12px;" onclick="openSellerForm(${s.id})">Editar</button>
                        <button class="admin-button info" style="padding:4px 10px;font-size:12px;" onclick="toggleSeller(${s.id}, ${s.ativo ? 0 : 1})">${s.ativo ? 'Desativar' : 'Ativar'}</button>
                        <button class="admin-button danger" style="padding:4px 10px;font-size:12px;" onclick="deleteSeller(${s.id})">Excluir</button>
                    </td>
                </tr>
            `).join('')}
        </table>`;
        window.openSellerForm = openSellerForm;
        window.toggleSeller = toggleSeller;
        window.deleteSeller = deleteSeller;
    } catch (e) {
        container.innerHTML = '<div style="opacity:0.6;font-size:13px;">Erro ao carregar vendedores.</div>';
    }
}

/* -----------------------------------------
   Aba: Configurações
   ----------------------------------------- */

function renderAdminSettings(container) {
    container.innerHTML = `
        <div class="admin-card">
            <div class="admin-card-header">⚙️ Configurações</div>
            <div class="form-row">
                <label style="width:200px;">Imagem das cantoneiras</label>
                <input type="text" id="adm-corner-input" value="${escapeHtml(APP_STATE.settings.corner_image_url || '')}" placeholder="ex: images/cantoneira.png">
            </div>
            <div class="form-row">
                <label style="width:200px;">WhatsApp (números, com DDI)</label>
                <input type="text" id="adm-wa-input" value="${escapeHtml(APP_STATE.settings.whatsapp_number || '')}" placeholder="ex: 5511999999999">
            </div>
            <div class="form-row">
                <label style="width:200px;">Nova senha (opcional, 6+)</label>
                <input type="password" id="adm-new-pass" placeholder="Nova senha">
            </div>
            <div class="form-row">
                <label style="width:200px;">Confirmar senha</label>
                <input type="password" id="adm-new-pass-confirm" placeholder="Repita a senha">
            </div>
            <div class="form-actions">
                <button class="btn" id="btn-save-settings">💾 Salvar Configurações</button>
            </div>
        </div>
    `;

    document.getElementById('btn-save-settings').addEventListener('click', async () => {
        const corner = document.getElementById('adm-corner-input').value.trim() || CONFIG.DEFAULT_CORNER_IMAGE;
        const wa = document.getElementById('adm-wa-input').value.trim();
        const pass = document.getElementById('adm-new-pass').value.trim();
        const passConfirm = document.getElementById('adm-new-pass-confirm').value.trim();
        try {
            const payload = { corner_image_url: corner, whatsapp_number: wa };
            if (pass || passConfirm) {
                if (pass !== passConfirm) { showToast('Senhas não conferem', 'error'); return; }
                if (pass.length < 6) { showToast('Senha deve ter 6+ caracteres', 'error'); return; }
                payload.new_admin_password = pass;
            }
            const data = await fetchJSON('settings.php', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (data.success) {
                APP_STATE.settings.corner_image_url = corner;
                APP_STATE.settings.whatsapp_number = wa;
                applySettingsToTheme();
                showToast('Configurações salvas', 'success');
                document.getElementById('adm-new-pass').value = '';
                document.getElementById('adm-new-pass-confirm').value = '';
            }
        } catch (e) {
            showToast(e.message || 'Erro ao salvar', 'error');
        }
    });
}

/* -----------------------------------------
   CRUD de Itens (modal com template autocomplete)
   ----------------------------------------- */

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

    const itemImage = item ? resolveImage(item.imagem_url) : '';

    const inner = `
        <h2>${item ? 'Editar Item' : 'Novo Item'}</h2>
        <div class="form-row"><label>Buscar Template</label>
            <div class="autocomplete-wrap" style="flex:1;">
                <input type="text" id="af-template-search" placeholder="Digite o nome do equipamento..." style="width:100%;box-sizing:border-box;">
                <div class="autocomplete-dropdown" id="af-template-dropdown"></div>
            </div>
        </div>
        <div class="form-row"><label>Categoria Geral</label><select id="form-general">${generalOptions}</select></div>
        <div class="form-row" id="form-row-cat" style="${categoriesForGeneral.length ? '' : 'display:none;'}"><label>Categoria</label><select id="form-category">${categoryOptions}</select></div>
        <div class="form-row" id="form-row-sub" style="${subcategoriesForCategory.length ? '' : 'display:none;'}"><label>Subcategoria</label><select id="form-subcategory">${subcategoryOptions}</select></div>
        <div class="form-row"><label>Nome</label><input type="text" id="form-name" value="${item ? escapeHtml(item.nome) : ''}" style="flex:1;"></div>
        <div class="form-row"><label>Descrição</label><textarea id="form-description" style="flex:1;">${item ? escapeHtml(item.descricao || '') : ''}</textarea></div>
        <div class="form-row"><label>Preço (moedas)</label><input type="number" min="0" id="form-price-coins" value="${item ? item.preco_moedas : 0}"></div>
        <div class="form-row"><label>Preço em R$</label><input type="number" step="0.01" min="0" id="form-price-brl" value="${item ? item.preco_reais : 0}"></div>
        <div class="form-row"><label>Quantidade</label><input type="number" min="0" id="form-quantity" value="${item ? item.quantidade_disponivel : 0}"></div>
        <div class="form-row"><label>Imagem URL</label><input type="text" id="form-image-url" value="${item ? item.imagem_url : ''}" placeholder="URL da imagem" style="flex:1;"></div>
        <div class="form-row"><label>Upload</label><input type="file" accept="image/*" id="form-image"></div>
        ${itemImage ? `<div class="form-row"><label>Preview</label><img src="${itemImage}" style="max-width:64px;max-height:64px;border:1px solid var(--gold-border);border-radius:4px;"></div>` : ''}
        <div class="form-actions">
            <button class="btn cancel" onclick="closeModal()">Cancelar</button>
            <button class="btn" id="form-submit">${item ? 'Salvar' : 'Criar'}</button>
        </div>
    `;

    renderModal(inner);

    // Template autocomplete
    setupTemplateAutocomplete('af-template-search', 'af-template-dropdown', (template) => {
        document.getElementById('form-name').value = template.nome;
        if (template.imagem_url) {
            document.getElementById('form-image-url').value = template.imagem_url;
        }
        if (template.categoria || template.subcategoria) {
            // Try to auto-select matching categories
            // For now just fill name and image
        }
        showToast('Template carregado: ' + template.nome, 'info');
    });

    const generalSelect = document.getElementById('form-general');
    const categorySelect = document.getElementById('form-category');
    const subcategorySelect = document.getElementById('form-subcategory');

    function refreshCategoryVisibility() {
        const generalId = parseInt(generalSelect.value || '0', 10);
        const categories = generalId ? getCategoriesByGeneral(generalId) : [];
        fillSelect(categorySelect, categories, 'Selecione');
        document.getElementById('form-row-cat').style.display = categories.length ? '' : 'none';
        if (!categories.length) {
            document.getElementById('form-row-sub').style.display = 'none';
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
        document.getElementById('form-row-sub').style.display = subs.length ? '' : 'none';
        if (subs.length) subcategorySelect.value = String(subs[0].id);
    }

    generalSelect.addEventListener('change', refreshCategoryVisibility);
    categorySelect.addEventListener('change', refreshSubcategoryVisibility);

    document.getElementById('form-submit').addEventListener('click', async () => {
        const name = document.getElementById('form-name').value.trim();
        const description = document.getElementById('form-description').value.trim();
        const priceCoins = parseInt(document.getElementById('form-price-coins').value || '0', 10);
        const priceBRL = parseFloat(document.getElementById('form-price-brl').value || '0');
        const quantity = parseInt(document.getElementById('form-quantity').value || '0', 10);
        const generalId = parseInt(generalSelect.value || '0', 10);
        const catVisible = document.getElementById('form-row-cat').style.display !== 'none';
        const subVisible = document.getElementById('form-row-sub').style.display !== 'none';
        const categoryId = catVisible ? parseInt(categorySelect.value || '0', 10) : 0;
        const subcategoryId = subVisible ? parseInt(subcategorySelect.value || '0', 10) : 0;
        let imageUrl = document.getElementById('form-image-url').value.trim() || (item ? item.imagem_url : '');

        if (!name) { showToast('Informe o nome do item', 'error'); return; }
        if (!generalId) { showToast('Selecione uma categoria geral', 'error'); return; }

        const fileInput = document.getElementById('form-image');
        if (fileInput.files && fileInput.files[0]) {
            try { imageUrl = await uploadImage(fileInput.files[0]); }
            catch (e) { showToast(e.message || 'Erro ao enviar imagem', 'error'); return; }
        }

        const payload = { nome: name, descricao: description, preco_moedas: priceCoins, preco_reais: priceBRL, quantidade_disponivel: quantity, imagem_url: imageUrl };
        if (subcategoryId) payload.id_subcategoria = subcategoryId;
        else if (categoryId) payload.id_categoria = categoryId;
        else if (generalId) payload.id_geral = generalId;

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
            await loadAllItems();
            renderAdminTabContent();
        } catch (error) {
            showToast(error.message || 'Erro ao salvar item', 'error');
        }
    });
}

/* -----------------------------------------
   Template Autocomplete (shared)
   ----------------------------------------- */

function setupTemplateAutocomplete(inputId, dropdownId, onSelect) {
    const input = document.getElementById(inputId);
    const dropdown = document.getElementById(dropdownId);
    if (!input || !dropdown) return;

    let timeout = null;
    let selectedIndex = -1;

    input.addEventListener('input', () => {
        clearTimeout(timeout);
        const val = input.value.trim();
        if (val.length < 2) {
            dropdown.classList.remove('active');
            dropdown.innerHTML = '';
            return;
        }
        timeout = setTimeout(async () => {
            try {
                const data = await fetchJSON(`templates.php?search=${encodeURIComponent(val)}`);
                if (!data || !data.length) {
                    dropdown.innerHTML = '<div class="autocomplete-item" style="opacity:0.5;">Nenhum template encontrado</div>';
                    dropdown.classList.add('active');
                    return;
                }
                dropdown.innerHTML = data.map((t, idx) => `
                    <div class="autocomplete-item" data-index="${idx}" data-id="${t.id}">
                        <img src="${resolveImage(t.imagem_url)}" alt="${escapeHtml(t.nome)}">
                        <div class="ac-name">${escapeHtml(t.nome)}</div>
                        <div class="ac-cat">${escapeHtml(t.categoria)}${t.subcategoria ? ' › ' + escapeHtml(t.subcategoria) : ''}</div>
                    </div>
                `).join('');
                dropdown.classList.add('active');
                selectedIndex = -1;

                dropdown.querySelectorAll('.autocomplete-item').forEach(el => {
                    el.addEventListener('click', () => {
                        const idx = parseInt(el.dataset.index, 10);
                        if (data[idx]) {
                            input.value = data[idx].nome;
                            dropdown.classList.remove('active');
                            if (onSelect) onSelect(data[idx]);
                        }
                    });
                });
            } catch (e) {
                console.error('Erro ao buscar templates:', e);
            }
        }, 300);
    });

    input.addEventListener('keydown', (e) => {
        const items = dropdown.querySelectorAll('.autocomplete-item');
        if (!items.length) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
            items.forEach((el, i) => el.style.background = i === selectedIndex ? 'rgba(255,215,0,0.15)' : '');
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedIndex = Math.max(selectedIndex - 1, -1);
            items.forEach((el, i) => el.style.background = i === selectedIndex ? 'rgba(255,215,0,0.15)' : '');
        } else if (e.key === 'Enter' && selectedIndex >= 0) {
            e.preventDefault();
            const el = items[selectedIndex];
            if (el) el.click();
        }
    });

    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.remove('active');
        }
    });
}

/* -----------------------------------------
   Delete Item
   ----------------------------------------- */

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
        renderAdminTabContent();
    } catch (error) {
        showToast(error.message || 'Erro ao excluir item', 'error');
    }
}

/* -----------------------------------------
   CRUD Vendedores
   ----------------------------------------- */

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
        <div class="form-row"><label>Nome</label><input type="text" id="sf-name" value="${seller ? escapeHtml(seller.nome) : ''}"></div>
        <div class="form-row"><label>Email</label><input type="email" id="sf-email" value="${seller ? escapeHtml(seller.email) : ''}"></div>
        <div class="form-row"><label>WhatsApp</label><input type="text" id="sf-whatsapp" value="${seller ? escapeHtml(seller.whatsapp) : ''}" placeholder="5511999999999"></div>
        <div class="form-row"><label>${seller ? 'Nova senha (opcional)' : 'Senha'}</label><input type="password" id="sf-password" placeholder="${seller ? 'Deixe em branco para manter' : 'Mínimo 6 caracteres'}"></div>
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
            renderAdminSellers(document.getElementById('admin-content'));
        } catch (e) { showToast(e.message || 'Erro ao salvar', 'error'); }
    });
}

async function toggleSeller(id, ativo) {
    try {
        await fetchJSON('sellers.php', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ativo }) });
        showToast(ativo ? 'Vendedor ativado' : 'Vendedor desativado', 'success');
        renderAdminSellers(document.getElementById('admin-content'));
    } catch (e) { showToast('Erro ao alterar status', 'error'); }
}

async function deleteSeller(id) {
    try {
        const sellers = await fetchJSON('sellers.php');
        const s = sellers.find(seller => seller.id === id);
        if (s && s.total_itens > 0) {
            const confirmed = await confirmModal(`O vendedor "${s.nome}" tem ${s.total_itens} itens. Ao excluir, os itens permanecerão mas ficarão sem vendedor. Deseja continuar?`);
            if (!confirmed) return;
        } else {
            const confirmed = await confirmModal('Deseja realmente excluir este vendedor?');
            if (!confirmed) return;
        }
        await fetchJSON('sellers.php', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
        showToast('Vendedor excluído', 'success');
        renderAdminSellers(document.getElementById('admin-content'));
    } catch (e) { showToast('Erro ao excluir vendedor', 'error'); }
}

/* -----------------------------------------
   Globals expostos para onclick
   ----------------------------------------- */

window.doLogin = doLogin;
window.doLogout = doLogout;
window.openItemForm = openItemForm;
window.promptDeleteItem = promptDeleteItem;
window.openSellerForm = openSellerForm;
window.toggleSeller = toggleSeller;
window.deleteSeller = deleteSeller;

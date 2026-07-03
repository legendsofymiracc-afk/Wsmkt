// js/views/admin.js — Painel administrativo premium

/* -----------------------------------------
   Login
   ----------------------------------------- */

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
            credentials: getFetchCredentials(),
            body
        });
        // Sem fallback GET: previne vazamento de senha em URL (logs, histórico, Referer).
        if (response.status === 405) {
            throw new Error('Servidor não aceita POST. Verifique a configuração do PHP.');
        }
        if (!response.ok) {
            let msg = `Erro ${response.status}`;
            try { const j = await response.json(); if (j && j.error) msg = j.error; } catch {}
            throw new Error(msg);
        }
        const data = await response.json();
        if (data.success) {
            APP_STATE.currentUser = { id: data.id, nome: data.nome, email: data.email || email, papel: data.papel, isLoggedIn: true };
            if (!data.senha_trocada) {
                // Força troca de senha no primeiro login.
                showToast('Por segurança, troque sua senha antes de continuar.', 'info');
                navigateTo('change-password');
                return;
            }
            showToast('Login efetuado', 'success');
            if (data.papel === 'dono') navigateTo('admin-panel');
            else if (data.papel === 'vendedor') navigateTo('seller-panel');
            else navigateTo('home');
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
    if (typeof resetCsrfToken === 'function') resetCsrfToken();
    APP_STATE.currentUser = { id: null, nome: null, email: null, papel: null, isLoggedIn: false };
    APP_STATE.sellerRequest = null;
    APP_STATE.cartCount = 0;
    APP_STATE.favoriteIds = [];
    APP_STATE.favoriteItems = [];
    navigateTo('home');
}

/* -----------------------------------------
   Troca de senha obrigatória (primeiro login)
   ----------------------------------------- */

function renderChangePassword(container) {
    container.innerHTML = `
        <section class="panel auth-panel" role="dialog">
            <div class="corner top-left"></div>
            <div class="corner top-right"></div>
            <header class="header auth-header">
                <button class="back-button" onclick="goBack()" aria-label="Voltar">&larr;</button>
                <h1 class="title">Trocar Senha</h1>
            </header>
            <div class="auth-shell">
                <aside class="auth-emblem">
                    <div class="auth-orb"></div>
                    <strong>WsMkt</strong>
                    <span>Segurança</span>
                </aside>
                <div class="auth-card">
                    <p style="color:rgba(255,255,255,0.64);font-size:13px;margin:0;">Por segurança, crie uma nova senha antes de continuar.</p>
                    <label class="auth-field">Senha atual
                        <input type="password" id="change-current-password" placeholder="Senha atual" autocomplete="current-password">
                    </label>
                    <label class="auth-field">Nova senha
                        <input type="password" id="change-new-password" placeholder="Mínimo 6 caracteres" autocomplete="new-password">
                    </label>
                    <label class="auth-field">Confirmar nova senha
                        <input type="password" id="change-new-password-confirm" placeholder="Repita a nova senha" autocomplete="new-password">
                    </label>
                    <button type="button" class="login-btn auth-submit" onclick="doChangePassword()">TROCAR SENHA</button>
                </div>
            </div>
            <div class="footer auth-footer"><button class="login-btn" onclick="goBack()">VOLTAR</button></div>
        </section>
    `;
}

async function doChangePassword() {
    const current = document.getElementById('change-current-password')?.value || '';
    const newPass = document.getElementById('change-new-password')?.value || '';
    const confirm = document.getElementById('change-new-password-confirm')?.value || '';

    if (!current || !newPass || !confirm) {
        showToast('Preencha todos os campos', 'error');
        return;
    }
    if (newPass.length < 6) {
        showToast('Nova senha deve ter ao menos 6 caracteres', 'error');
        return;
    }
    if (newPass !== confirm) {
        showToast('Senhas não conferem', 'error');
        return;
    }
    if (current === newPass) {
        showToast('A nova senha deve ser diferente da atual', 'error');
        return;
    }

    try {
        const data = await fetchJSON('auth.php?action=change-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ current_password: current, new_password: newPass })
        });
        if (data.success) {
            showToast('Senha alterada com sucesso!', 'success');
            if (APP_STATE.currentUser.papel === 'dono') navigateTo('admin-panel');
            else if (APP_STATE.currentUser.papel === 'vendedor') navigateTo('seller-panel');
            else navigateTo('profile');
        }
    } catch (error) {
        showToast(error.message || 'Erro ao trocar senha', 'error');
    }
}

function renderChangePasswordWsdb(container) {
    if (!APP_STATE.currentUser.isLoggedIn) { navigateTo('login'); return; }
    const userName = APP_STATE.currentUser.nome || 'Usuario';

    container.innerHTML = `
        <section class="panel auth-panel auth-panel-wsdb" role="dialog" aria-labelledby="change-password-title">
            <div class="corner top-left"></div>
            <div class="corner top-right"></div>
            <header class="header auth-header">
                <button class="back-button" onclick="goBack()" aria-label="Voltar">&larr;</button>
                <h1 class="title" id="change-password-title">Perfil: ${escapeHtml(userName)}</h1>
            </header>
            <div class="auth-shell">
                <form class="auth-card" onsubmit="event.preventDefault();doChangePassword();">
                    <div class="profile-line">
                        <span>E-mail:</span>
                        <strong>${escapeHtml(APP_STATE.currentUser.email || '-')}</strong>
                    </div>
                    <label class="auth-field">Senha
                        <input type="password" id="change-current-password" autocomplete="current-password">
                    </label>
                    <label class="auth-field">Nova Senha
                        <input type="password" id="change-new-password" autocomplete="new-password">
                    </label>
                    <label class="auth-field">Confirmar senha:
                        <input type="password" id="change-new-password-confirm" autocomplete="new-password">
                    </label>
                    <button type="submit" class="login-btn auth-submit">Mudar</button>
                    <button type="button" class="login-btn auth-submit" onclick="goBack()">Desistir</button>
                </form>
            </div>
        </section>
    `;
}

renderChangePassword = renderChangePasswordWsdb;

/* -----------------------------------------
   Variáveis de estado do admin
   ----------------------------------------- */

let ADMIN_STATE = { activeTab: 'dashboard' };

const ADMIN_TABS = [
    { id: 'dashboard', label: 'Dashboard', icon: 'D' },
    { id: 'items', label: 'Itens', icon: 'I' },
    { id: 'categories', label: 'Categorias', icon: 'C' },
    { id: 'sellers', label: 'Vendedores', icon: 'V' },
    { id: 'settings', label: 'Config', icon: 'S' },
    { id: 'coupons', label: 'Cupons', icon: 'U' }
];

/* -----------------------------------------
   Painel principal premium
   ----------------------------------------- */

function renderLastItemsList() {
    const items = APP_STATE.allItems.slice(-5).reverse();
    if (!items.length) return '<div style="opacity:0.6;font-size:13px;">Nenhum item cadastrado.</div>';
    return `<table class="admin-table">
        <tr><th>Item</th><th>Preço</th><th>Vendedor</th></tr>
        ${items.map(i => `<tr><td>${escapeHtml(i.nome)}</td><td>${i.preco_moedas || 0} moedas</td><td>${i.nome_vendedor || '-'}</td></tr>`).join('')}
    </table>`;
}



/* -----------------------------------------
   Aba: Itens (com filtros premium)
   ----------------------------------------- */

function renderAdminItems(container) {
    const totalItems = APP_STATE.allItems.length;
    const outCount = APP_STATE.allItems.filter(item => Number(item.quantidade_disponivel || 0) <= 0).length;
    const lowCount = APP_STATE.allItems.filter(item => Number(item.quantidade_disponivel || 0) > 0 && Number(item.quantidade_disponivel || 0) <= 3).length;
    const okCount = Math.max(0, totalItems - outCount - lowCount);
    container.innerHTML = `
        <div class="admin-card">
            <div class="admin-card-header">Gerenciar itens</div>
            <div class="admin-stock-overview" id="admin-stock-overview">
                <button type="button" class="admin-stock-card is-total" data-stock-filter="all"><span>${totalItems}</span><small>Total</small></button>
                <button type="button" class="admin-stock-card is-ok" data-stock-filter="ok"><span>${okCount}</span><small>Em estoque</small></button>
                <button type="button" class="admin-stock-card is-low" data-stock-filter="low"><span>${lowCount}</span><small>Baixo</small></button>
                <button type="button" class="admin-stock-card is-out" data-stock-filter="out"><span>${outCount}</span><small>Zerado</small></button>
            </div>
            <div style="margin-bottom:12px;">
                <button class="admin-button" id="btn-new-item">Novo item</button>
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px;">
                <select id="af-general" style="padding:6px 10px;background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.1);color:var(--gold);border-radius:6px;"></select>
                <select id="af-category" style="padding:6px 10px;background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.1);color:var(--gold);border-radius:6px;"></select>
                <select id="af-subcategory" style="padding:6px 10px;background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.1);color:var(--gold);border-radius:6px;"></select>
                <select id="af-stock" style="padding:6px 10px;background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.1);color:var(--gold);border-radius:6px;">
                    <option value="all">Todos os estoques</option>
                    <option value="ok">Em estoque</option>
                    <option value="low">Estoque baixo</option>
                    <option value="out">Zerados</option>
                </select>
                <input type="text" id="af-search" placeholder="Buscar item..." style="padding:6px 10px;background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.1);color:var(--gold);border-radius:6px;min-width:160px;">
            </div>
            <div id="admin-items-list"></div>
        </div>
    `;

    const genSel = document.getElementById('af-general');
    const catSel = document.getElementById('af-category');
    const subSel = document.getElementById('af-subcategory');
    const stockSel = document.getElementById('af-stock');
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
        renderAdminItemsList(listContainer, gid, cid, sid, term, stockSel.value || 'all');
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
    stockSel.addEventListener('change', refreshItemsList);
    document.querySelectorAll('#admin-stock-overview [data-stock-filter]').forEach(btn => {
        btn.addEventListener('click', () => {
            stockSel.value = btn.dataset.stockFilter || 'all';
            refreshItemsList();
        });
    });
    searchInput.addEventListener('input', refreshItemsList);
    newBtn.addEventListener('click', () => openItemForm());
    refreshItemsList();
}

function renderAdminItemsList(container, generalId, categoryId, subcategoryId, term, stockFilter = 'all') {
    if (!container) return;
    const filterTerm = (term || '').toLowerCase();
    const filtered = APP_STATE.allItems.filter(item => {
        const qty = Number(item.quantidade_disponivel || 0);
        if (generalId && item.geral_id !== generalId) return false;
        if (categoryId && item.categoria_id !== categoryId) return false;
        if (subcategoryId && item.id_subcategoria !== subcategoryId) return false;
        if (filterTerm && !(item.nome || '').toLowerCase().includes(filterTerm)) return false;
        if (stockFilter === 'out' && qty > 0) return false;
        if (stockFilter === 'low' && !(qty > 0 && qty <= 3)) return false;
        if (stockFilter === 'ok' && qty <= 3) return false;
        return true;
    });

    refreshAdminStockSummary();

    if (!filtered.length) {
        container.innerHTML = '<div style="opacity:0.6;font-size:13px;padding:12px;">Nenhum item encontrado.</div>';
        return;
    }

    container.innerHTML = `<div class="market-ad-list">
        ${filtered.map(item => {
            const pCoins = formatGoldValue(item.preco_moedas);
            const fullCoins = formatGoldValue(item.preco_moedas, { compact: false });
            const goldFit = getGoldFitClass(item.preco_moedas);
            const pBRL = formatCurrencyBRL(resolveBRLValue(item));
            const catPath = typeof translateCategoryPath === 'function'
                ? translateCategoryPath([item.geral_nome, item.categoria_nome, item.subcategoria_nome], ' > ')
                : [item.geral_nome, item.categoria_nome, item.subcategoria_nome].filter(Boolean).join(' > ');
            const image = resolveImage(item.imagem_url || item.template_imagem);
            const level = getItemLevel(item);
            const color = getItemColor(item);
            const qty = Number(item.quantidade_disponivel || 0);
            const stockState = qty <= 0 ? 'out' : (qty <= 3 ? 'low' : 'ok');
            const stockText = qty <= 0 ? 'Zerado' : (qty <= 3 ? 'Baixo' : 'OK');
            return `<article class="market-ad-row admin-stock-row stock-${stockState}" data-item-id="${item.id}">
                <div class="market-ad-icon"><img src="${image}" alt="${escapeHtml(item.nome)}">${level ? `<b>${level}</b>` : ''}</div>
                <div class="market-ad-info">
                    <strong class="rarity-name-${color}">${escapeHtml(item.nome)}</strong>
                    <span>${escapeHtml(catPath || 'Sem categoria')}</span>
                    <small>${item.servidor ? `Servidor: ${escapeHtml(item.servidor)}` : 'Sem servidor definido'}</small>
                </div>
                <div class="market-ad-price" aria-label="Preço">
                    <span class="market-coin-dot" aria-hidden="true"></span>
                    <div><strong class="${goldFit}" title="${fullCoins}">${pCoins}</strong><small>${pBRL}</small></div>
                </div>
                <div class="admin-stock-cell" aria-label="Estoque rapido">
                    <div class="admin-stock-state stock-${stockState}" data-stock-state-id="${item.id}">${stockText}</div>
                    <div class="admin-stock-quick">
                        <button type="button" onclick="event.stopPropagation();quickStockUpdate(${item.id},-5)" title="Remover 5">-5</button>
                        <button type="button" onclick="event.stopPropagation();quickStockUpdate(${item.id},-1)" title="Remover 1">-1</button>
                        <span class="stock-qty" id="sq-${item.id}" data-stock-id="${item.id}" title="Quantidade atual">${qty}</span>
                        <button type="button" onclick="event.stopPropagation();quickStockUpdate(${item.id},1)" title="Adicionar 1">+1</button>
                        <button type="button" onclick="event.stopPropagation();quickStockUpdate(${item.id},5)" title="Adicionar 5">+5</button>
                    </div>
                </div>
                <div class="market-ad-actions">
                    <button class="admin-button" onclick="openItemForm(${item.id})">Editar</button>
                    <button class="admin-button danger" onclick="promptDeleteItem(${item.id})">Excluir</button>
                </div>
            </article>`;
        }).join('')}
    </div>`;
}

function getAdminStockCounts() {
    const total = APP_STATE.allItems.length;
    const out = APP_STATE.allItems.filter(item => Number(item.quantidade_disponivel || 0) <= 0).length;
    const low = APP_STATE.allItems.filter(item => Number(item.quantidade_disponivel || 0) > 0 && Number(item.quantidade_disponivel || 0) <= 3).length;
    return { total, out, low, ok: Math.max(0, total - out - low) };
}

function refreshAdminStockSummary() {
    const root = document.getElementById('admin-stock-overview');
    if (!root) return;
    const counts = getAdminStockCounts();
    const values = { all: counts.total, ok: counts.ok, low: counts.low, out: counts.out };
    root.querySelectorAll('[data-stock-filter]').forEach(btn => {
        const span = btn.querySelector('span');
        if (span) span.textContent = values[btn.dataset.stockFilter || 'all'];
    });
}

function updateAdminStockRow(itemId, qty) {
    const state = qty <= 0 ? 'out' : (qty <= 3 ? 'low' : 'ok');
    const label = qty <= 0 ? 'Zerado' : (qty <= 3 ? 'Baixo' : 'OK');
    document.querySelectorAll(`[data-item-id="${itemId}"]`).forEach(row => {
        row.classList.remove('stock-out', 'stock-low', 'stock-ok');
        row.classList.add('stock-' + state);
    });
    document.querySelectorAll(`[data-stock-state-id="${itemId}"]`).forEach(el => {
        el.classList.remove('stock-out', 'stock-low', 'stock-ok');
        el.classList.add('stock-' + state);
        el.textContent = label;
    });
}

/* -----------------------------------------
   Aba: Categorias
   ----------------------------------------- */

/* -----------------------------------------
   Aba: Vendedores
   ----------------------------------------- */

async function renderAdminSellers(container) {
    container.innerHTML = `
        <div class="admin-card">
            <div class="admin-card-header">Gerenciar vendedores</div>
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
            <div class="admin-card-header">Configurações</div>
            <div class="form-row">
                <label style="width:200px;">Imagem das cantoneiras</label>
                <input type="text" id="adm-corner-input" value="${escapeHtml(APP_STATE.settings.corner_image_url || '')}" placeholder="ex: images/cantoneira.png">
            </div>
            <div class="form-row">
                <label style="width:200px;">WhatsApp (números, com DDI)</label>
                <input type="text" id="adm-wa-input" value="${escapeHtml(APP_STATE.settings.whatsapp_number || '')}" placeholder="ex: 5511999999999">
            </div>
            <div class="form-row">
                <label style="width:200px;">Senha atual</label>
                <input type="password" id="adm-current-pass" placeholder="Obrigatória para trocar senha">
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
                <button class="btn" id="btn-save-settings">Salvar configurações</button>
            </div>
        </div>
    `;

    document.getElementById('btn-save-settings').addEventListener('click', async () => {
        const corner = document.getElementById('adm-corner-input').value.trim() || CONFIG.DEFAULT_CORNER_IMAGE;
        const wa = document.getElementById('adm-wa-input').value.trim();
        const currentPass = document.getElementById('adm-current-pass').value.trim();
        const pass = document.getElementById('adm-new-pass').value.trim();
        const passConfirm = document.getElementById('adm-new-pass-confirm').value.trim();
        try {
            const payload = { corner_image_url: corner, whatsapp_number: wa };
            if (pass || passConfirm) {
                if (pass !== passConfirm) { showToast('Senhas não conferem', 'error'); return; }
                if (pass.length < 6) { showToast('Senha deve ter 6+ caracteres', 'error'); return; }
                if (!currentPass) { showToast('Informe a senha atual para trocar a senha', 'error'); return; }
                payload.current_password = currentPass;
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
                document.getElementById('adm-current-pass').value = '';
                document.getElementById('adm-new-pass').value = '';
                document.getElementById('adm-new-pass-confirm').value = '';
            }
        } catch (e) {
            showToast(e.message || 'Erro ao salvar', 'error');
        }
    });
}

/* -----------------------------------------
   Aba: Cupons
   ----------------------------------------- */

async function renderAdminCoupons(container) {
    container.innerHTML = `
        <div class="admin-page-head">
            <div>
                <h2>Cupons de Desconto</h2>
                <p>Gerenciar cupons promocionais.</p>
            </div>
        </div>
        <div class="admin-card coupons-forge">
            <div class="admin-card-header">Novo cupom</div>
            <div class="coupon-form-grid">
                <label class="item-field">Código
                    <input type="text" id="cupom-codigo" placeholder="PROMO10" autocomplete="off">
                </label>
                <label class="item-field">Desconto
                    ${renderNumberStepper('cupom-desconto', 10, 1, 1, 'desconto')}
                </label>
                <label class="item-field">Usos máximos
                    ${renderNumberStepper('cupom-max-usos', 0, 0, 1, 'usos máximos')}
                </label>
                <button class="admin-button rpg-action-btn" id="btn-criar-cupom">Criar cupom</button>
            </div>
        </div>
        <div class="admin-card">
            <div class="admin-card-header">Cupons existentes</div>
            <div id="admin-coupons-list" class="coupon-list-state">Carregando...</div>
        </div>
    `;

    document.getElementById('btn-criar-cupom').addEventListener('click', async () => {
        const codigo = document.getElementById('cupom-codigo').value.trim().toUpperCase();
        const desconto = parseInt(document.getElementById('cupom-desconto').value || '0', 10);
        const maxUsos = parseInt(document.getElementById('cupom-max-usos').value || '0', 10);
        if (!codigo) { showToast('Digite um código para o cupom', 'error'); return; }
        if (desconto < 1 || desconto > 100) { showToast('Desconto deve ser entre 1 e 100', 'error'); return; }
        try {
            await fetchJSON('coupons.php', {
                method: 'POST',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify({codigo, desconto, max_usos: maxUsos})
            });
            showToast('Cupom criado!', 'success');
            document.getElementById('cupom-codigo').value = '';
            document.getElementById('cupom-desconto').value = '';
            document.getElementById('cupom-max-usos').value = '';
            await renderAdminCoupons(container);
        } catch(e) {
            showToast(e.message || 'Erro ao criar cupom', 'error');
        }
    });

    // Load existing coupons
    try {
        const coupons = await fetchJSON('coupons.php');
        const list = document.getElementById('admin-coupons-list');
        if (!coupons || !coupons.length) {
            list.innerHTML = '<div style="opacity:0.6;font-size:13px;padding:12px;">Nenhum cupom cadastrado.</div>';
            return;
        }
        list.innerHTML = `<table class="admin-table coupon-table">
            <tr><th>Código</th><th>Desconto</th><th>Usos</th><th>Status</th><th>Ações</th></tr>
            ${coupons.map(c => `
                <tr>
                    <td><strong>${escapeHtml(c.codigo)}</strong></td>
                    <td>${c.desconto_percentual}%</td>
                    <td>${c.usos || 0} / ${c.max_usos || 'Ilimitado'}</td>
                    <td><span class="admin-badge ${c.ativo ? 'badge-active' : 'badge-inactive'}">${c.ativo ? 'Ativo' : 'Inativo'}</span></td>
                    <td class="coupon-actions">
                        <button class="admin-button info" onclick="toggleCoupon(${c.id}, ${c.ativo ? 0 : 1})">${c.ativo ? 'Pausar' : 'Ativar'}</button>
                        <button class="admin-button danger" onclick="deleteCoupon(${c.id})">Excluir</button>
                    </td>
                </tr>
            `).join('')}
        </table>`;
    } catch(e) {
        document.getElementById('admin-coupons-list').innerHTML = '<div style="opacity:0.6;font-size:13px;">Erro ao carregar cupons.</div>';
    }
}

async function toggleCoupon(id, ativo) {
    try {
        await fetchJSON('coupons.php', {
            method: 'PUT',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({id, ativo})
        });
        showToast(ativo ? 'Cupom ativado' : 'Cupom pausado', 'success');
        await renderAdminTabContent();
    } catch(e) {
        showToast(e.message || 'Erro ao atualizar cupom', 'error');
    }
}

async function deleteCoupon(id) {
    try {
        const confirmed = await confirmModal('Excluir este cupom?');
        if (!confirmed) return;
        await fetchJSON('coupons.php', {
            method: 'DELETE',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({id})
        });
        showToast('Cupom excluído', 'success');
        await renderAdminTabContent();
    } catch(e) {
        showToast(e.message || 'Erro ao excluir cupom', 'error');
    }
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

    const generalOptions = APP_STATE.generalCategories.map(g => `<option value="${g.id}" ${g.id === defaultGeneralId ? 'selected' : ''}>${escapeHtml(typeof translateCategoryName === 'function' ? translateCategoryName(g.nome) : g.nome)}</option>`).join('');
    const categoryOptions = categoriesForGeneral.map(c => `<option value="${c.id}" ${c.id === defaultCategoryId ? 'selected' : ''}>${escapeHtml(typeof translateCategoryName === 'function' ? translateCategoryName(c.nome) : c.nome)}</option>`).join('');
    const subcategoryOptions = subcategoriesForCategory.map(s => `<option value="${s.id}" ${s.id === defaultSubId ? 'selected' : ''}>${escapeHtml(typeof translateCategoryName === 'function' ? translateCategoryName(s.nome) : s.nome)}</option>`).join('');

    const itemImage = item ? resolveImage(item.imagem_url) : '';
    const selectedPathText = item
        ? (typeof translateCategoryPath === 'function'
            ? translateCategoryPath([item.geral_nome, item.categoria_nome, item.subcategoria_nome], ' > ')
            : [item.geral_nome, item.categoria_nome, item.subcategoria_nome].filter(Boolean).join(' > '))
        : '';
    const selectedLevel = item ? getItemLevel(item) : '';

    const inner = `
        <div class="item-form-modern">
        <div class="item-form-head">
            <div>
                <span>Anúncio do mercado</span>
                <h2>${item ? 'Editar Item' : 'Novo Item'}</h2>
            </div>
        </div>
        <input type="hidden" id="form-template-id" value="${item && item.id_template ? item.id_template : ''}">
        <input type="hidden" id="form-auto-path" value="${item ? '1' : ''}">
        <input type="hidden" id="form-name" value="${item ? escapeHtml(item.nome) : ''}">
        <input type="hidden" id="form-image-url" value="${item ? escapeHtml(item.imagem_url || '') : ''}">
        <div class="item-form-hidden" aria-hidden="true">
            <select id="form-general">${generalOptions}</select>
            <div id="form-row-cat" style="${categoriesForGeneral.length ? '' : 'display:none;'}"><select id="form-category">${categoryOptions}</select></div>
            <div id="form-row-sub" style="${subcategoriesForCategory.length ? '' : 'display:none;'}"><select id="form-subcategory">${subcategoryOptions}</select></div>
        </div>
        <label class="item-field item-field-full">Item
            <div class="autocomplete-wrap">
                <input type="text" id="af-template-search" value="${item ? escapeHtml(item.nome) : ''}" placeholder="Digite o nome do equipamento..." autocomplete="off">
                <div class="autocomplete-dropdown" id="af-template-dropdown"></div>
            </div>
        </label>
        <div class="item-selected-card ${item ? '' : 'is-empty'}" id="item-selected-card">
            <div class="item-selected-thumb">${itemImage ? `<img src="${itemImage}" alt="">${selectedLevel ? `<b>${selectedLevel}</b>` : ''}` : ''}</div>
            <div>
                <strong>${item ? escapeHtml(item.nome) : 'Nenhum item selecionado'}</strong>
                <span>${selectedPathText ? escapeHtml(selectedPathText) : 'A categoria será preenchida automaticamente'}</span>
            </div>
        </div>
        <div class="item-form-grid">
            <label class="item-field">Estoque
                ${renderNumberStepper('form-quantity', item ? item.quantidade_disponivel : 0, 0, 1, 'estoque')}
            </label>
            <label class="item-field">Servidor
                <select id="form-server">${renderServerSelectOptions(item ? item.servidor || '' : '')}</select>
            </label>
            <label class="item-field">Preço moedas
                ${renderNumberStepper('form-price-coins', item ? item.preco_moedas : 0, 0, 1000, 'preço em moedas')}
            </label>
            <label class="item-field">Preço R$
                ${renderNumberStepper('form-price-brl', item ? item.preco_reais : 0, 0, 1, 'preço em reais')}
            </label>
        </div>
        <label class="item-field item-field-full">Descrição
            <textarea id="form-description" placeholder="Opcional">${item ? escapeHtml(item.descricao || '') : ''}</textarea>
        </label>
        <div class="form-actions">
            <button class="btn cancel" onclick="closeModal()">Cancelar</button>
            <button class="btn" id="form-submit">${item ? 'Salvar' : 'Criar'}</button>
        </div>
        </div>
    `;

    renderModal(inner);

    // Template autocomplete
    setupTemplateAutocomplete('af-template-search', 'af-template-dropdown', (template) => {
        applyTemplateToItemForm(template);
    });

    const generalSelect = document.getElementById('form-general');
    const categorySelect = document.getElementById('form-category');
    const subcategorySelect = document.getElementById('form-subcategory');

    function selectFormCategoryPath(path) {
        if (!path) return false;
        const generalId = Number(path.general_id || 0);
        const categoryId = Number(path.category_id || 0);
        const subcategoryId = Number(path.subcategory_id || 0);
        if (!generalId) return false;

        generalSelect.value = String(generalId);
        const categories = getCategoriesByGeneral(generalId);
        fillSelect(categorySelect, categories, 'Selecione');
        document.getElementById('form-row-cat').style.display = categories.length ? '' : 'none';

        if (categoryId) {
            categorySelect.value = String(categoryId);
            const subs = getSubcategoriesByCategory(categoryId);
            fillSelect(subcategorySelect, subs, 'Selecione');
            document.getElementById('form-row-sub').style.display = subs.length ? '' : 'none';
            if (subcategoryId) subcategorySelect.value = String(subcategoryId);
        } else {
            fillSelect(subcategorySelect, [], 'Selecione');
            document.getElementById('form-row-sub').style.display = 'none';
        }
        return true;
    }

    function findTemplateCategoryPath(template) {
        const normalize = (value) => (value || '').trim().toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const catName = normalize(template.categoria);
        const subName = normalize(template.subcategoria);
        if (!catName && !subName) return null;

        const root = APP_STATE.generalCategories.find(g => normalize(g.nome) === catName);
        if (root) {
            if (!subName) return { general_id: root.id, category_id: 0, subcategory_id: 0 };
            const child = getCategoriesByGeneral(root.id).find(c => normalize(c.nome) === subName);
            if (child) return { general_id: root.id, category_id: child.id, subcategory_id: 0 };
        }

        const category = APP_STATE.categoriesLevel2.find(c => normalize(c.nome) === catName);
        if (category) {
            if (!subName) return { general_id: category.geral_id, category_id: category.id, subcategory_id: 0 };
            const sub = getSubcategoriesByCategory(category.id).find(s => normalize(s.nome) === subName);
            if (sub) return { general_id: category.geral_id, category_id: category.id, subcategory_id: sub.id };
        }

        const directSub = APP_STATE.categoriesLevel3.find(s => [catName, subName].filter(Boolean).includes(normalize(s.nome)));
        if (directSub) return { general_id: directSub.geral_id, category_id: directSub.categoria_id, subcategory_id: directSub.id };

        return null;
    }

    function applyTemplateToItemForm(template) {
        document.getElementById('form-template-id').value = template.id || '';
        document.getElementById('form-name').value = template.nome;
        if (template.imagem_url) {
            document.getElementById('form-image-url').value = template.imagem_url;
        }
        const path = findTemplateCategoryPath(template);
        if (path) {
            selectFormCategoryPath(path);
        }
        document.getElementById('form-auto-path').value = path ? '1' : '';
        const categoryText = path
            ? ([template.categoria, template.subcategoria].filter(Boolean).join(' > ') || 'Categoria automática')
            : 'Categoria não encontrada';
        const card = document.getElementById('item-selected-card');
        if (card) {
            const level = parseTemplateDetails(template).level || template.nivel_min || '';
            card.classList.remove('is-empty');
            card.innerHTML = `
                <div class="item-selected-thumb">${template.imagem_url ? `<img src="${resolveImage(template.imagem_url)}" alt="">${level ? `<b>${level}</b>` : ''}` : ''}</div>
                <div>
                    <strong>${escapeHtml(template.nome)}</strong>
                    <span>${escapeHtml(categoryText)}</span>
                </div>`;
        }
        showToast('Template carregado: ' + template.nome, 'info');
    }

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
        const server = document.getElementById('form-server').value.trim();
        const priceCoins = parseInt(document.getElementById('form-price-coins').value || '0', 10);
        const priceBRL = parseFloat(document.getElementById('form-price-brl').value || '0');
        const quantity = parseInt(document.getElementById('form-quantity').value || '0', 10);
        const generalId = parseInt(generalSelect.value || '0', 10);
        const catVisible = document.getElementById('form-row-cat').style.display !== 'none';
        const subVisible = document.getElementById('form-row-sub').style.display !== 'none';
        const categoryId = catVisible ? parseInt(categorySelect.value || '0', 10) : 0;
        const subcategoryId = subVisible ? parseInt(subcategorySelect.value || '0', 10) : 0;
        const templateId = parseInt(document.getElementById('form-template-id').value || '0', 10);
        let imageUrl = document.getElementById('form-image-url').value.trim() || (item ? item.imagem_url : '');

        if (!name) { showToast('Escolha o item pelo campo de busca', 'error'); return; }
        if (!item && !templateId) { showToast('Escolha um item da lista para organizar automaticamente', 'error'); return; }
        if (!document.getElementById('form-auto-path').value) { showToast('Não foi possível organizar a categoria automaticamente', 'error'); return; }
        if (!generalId) { showToast('Não foi possível organizar a categoria automaticamente', 'error'); return; }

        const payload = { nome: name, descricao: description, servidor: server, preco_moedas: priceCoins, preco_reais: priceBRL, quantidade_disponivel: quantity, imagem_url: imageUrl, id_template: templateId || null };
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
            await renderAdminTabContent();
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
                dropdown.innerHTML = data.map((t, idx) => {
                    const detail = parseTemplateDetails(t);
                    const level = detail.level || t.nivel_min || '';
                    return `
                    <div class="autocomplete-item" data-index="${idx}" data-id="${t.id}">
                        <span class="ac-icon-wrap">
                            <img src="${resolveImage(t.imagem_url)}" alt="${escapeHtml(t.nome)}">
                            ${level ? `<b>${level}</b>` : ''}
                        </span>
                        <div class="ac-main">
                            <div class="ac-name rarity-name-${Number(detail.color || 0)}">${escapeHtml(t.nome)}</div>
                            ${renderTemplateInlineStats(t)}
                        </div>
                        <div class="ac-cat">${escapeHtml(t.categoria)}${t.subcategoria ? ' > ' + escapeHtml(t.subcategoria) : ''}</div>
                    </div>
                `; }).join('');
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

function parseTemplateDetails(template) {
    const source = template.atributos_detalhes || template.atributos || null;
    if (!source) return {};
    try { return typeof source === 'string' ? JSON.parse(source) : source; }
    catch (_) { return {}; }
}

function renderTemplateInlineStats(template) {
    const d = parseTemplateDetails(template);
    const rows = [];
    const baseIconUrl = 'https://wsdb.xyz/icons/';
    for (let i = 1; i <= 4; i++) {
        const name = d[`bonus${i}Name`] || d[`bonus${i}`]?.name;
        const value = d[`value${i}`] ?? d[`bonus${i}`]?.value;
        const icon = d[`bonus${i}Icon`] || d[`bonus${i}`]?.icon;
        const params = d[`bonus${i}Params`] || 0;
        if (name && value != null && icon) {
            rows.push(`<span class="ac-mini-stat" title="${escapeHtml(name)}"><img src="${baseIconUrl}${icon}.webp" alt=""><b>${formatTemplateStatValue(value, params)}</b></span>`);
        }
    }
    return rows.length ? `<div class="ac-inline-stats">${rows.join('')}</div>` : '';
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
        await renderAdminTabContent();
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
            const confirmed = await confirmModal(`O vendedor "${escapeHtml(s.nome)}" tem ${s.total_itens} itens. Ao excluir, os itens permanecerão mas ficarão sem vendedor. Deseja continuar?`);
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

async function renderAdminSellers(container) {
    container.innerHTML = `
        <div class="admin-page-head">
            <div>
                <h2>Vendedores</h2>
                <p>Aprove compradores que solicitaram venda e gerencie vendedores ativos.</p>
            </div>
            <button class="admin-button" id="btn-new-seller-admin">+ Novo Vendedor</button>
        </div>
        <section class="admin-card">
            <div class="admin-card-header">Solicitações pendentes</div>
            <div id="seller-requests-list">Carregando...</div>
        </section>
        <section class="admin-card">
            <div class="admin-card-header">Vendedores cadastrados</div>
            <div id="admin-sellers-list">Carregando...</div>
        </section>
    `;
    document.getElementById('btn-new-seller-admin').addEventListener('click', () => openSellerForm());
    await renderSellerRequests();
    await renderSellersTable();
}

async function renderSellerRequests() {
    const container = document.getElementById('seller-requests-list');
    if (!container) return;
    try {
        const requests = await fetchJSON('sellers.php?requests=1');
        if (!requests.length) {
            container.innerHTML = '<div style="opacity:0.65;font-size:13px;">Nenhuma solicitação pendente.</div>';
            return;
        }
        container.innerHTML = `<table class="admin-table">
            <tr><th>Comprador</th><th>Email</th><th>Loja</th><th>WhatsApp</th><th>Data</th><th>Ações</th></tr>
            ${requests.map(req => `
                <tr>
                    <td><strong>${escapeHtml(req.usuario_nome || '-')}</strong></td>
                    <td>${escapeHtml(req.usuario_email || '-')}</td>
                    <td>${escapeHtml(req.nome_loja || '-')}</td>
                    <td>${escapeHtml(req.whatsapp || '-')}</td>
                    <td>${escapeHtml(req.criado_em || '-')}</td>
                    <td style="display:flex;gap:4px;">
                        <button class="admin-button" style="padding:4px 10px;font-size:12px;" onclick="reviewSellerRequest(${req.id}, 'approve')">Aprovar</button>
                        <button class="admin-button danger" style="padding:4px 10px;font-size:12px;" onclick="reviewSellerRequest(${req.id}, 'deny')">Negar</button>
                    </td>
                </tr>
            `).join('')}
        </table>`;
    } catch (e) {
        container.innerHTML = '<div style="opacity:0.65;font-size:13px;">Erro ao carregar solicitações.</div>';
    }
}

async function reviewSellerRequest(requestId, action) {
    const label = action === 'approve' ? 'aprovar' : 'negar';
    const confirmed = await confirmModal(`Deseja ${label} esta solicitação?`);
    if (!confirmed) return;
    try {
        await fetchJSON('sellers.php', {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({request_id: requestId, action})
        });
        showToast(action === 'approve' ? 'Vendedor aprovado' : 'Solicitação negada', 'success');
        await renderAdminSellers(document.getElementById('admin-content'));
    } catch (e) {
        showToast(e.message || 'Erro ao analisar solicitação', 'error');
    }
}

/* -----------------------------------------
   Admin moderno
   ----------------------------------------- */

function renderAdminNav() {
    return ADMIN_TABS.map(tab => `
        <button class="admin-nav-item ${ADMIN_STATE.activeTab === tab.id ? 'active' : ''}" data-tab="${tab.id}">
            <span class="admin-nav-icon">${tab.icon}</span>
            <span>${tab.label}</span>
        </button>
    `).join('');
}

function bindAdminNav() {
    document.querySelectorAll('.admin-nav-item').forEach(tab => {
        tab.addEventListener('click', () => {
            ADMIN_STATE.activeTab = tab.dataset.tab;
            renderAdminTabContent();
        });
    });
}

function renderAdminLogin(container) {
    container.innerHTML = `
        <section class="panel auth-panel admin-login-panel" role="dialog">
            <div class="corner top-left"></div>
            <div class="corner top-right"></div>
            <div class="admin-login-layout">
                <div class="admin-login-brand">
                    <span>Acesso restrito</span>
                    <h1>Mercado Warspear</h1>
                    <p>Entre para gerenciar catálogo, vendedores, preços e configurações.</p>
                </div>
                <div class="admin-login-box">
                    <h2>Painel Administrativo</h2>
                    <label>Email</label>
                    <input type="email" id="admin-email" placeholder="admin@mercado.com" autocomplete="email">
                    <label>Senha</label>
                    <input type="password" id="admin-password" placeholder="Senha" autocomplete="current-password">
                    <button class="login-submit" onclick="doLogin()">Entrar</button>
                    <button class="login-btn" onclick="goBack()">Voltar</button>
                </div>
            </div>
        </section>
    `;
}

async function renderAdminPanel(container) {
    if (!APP_STATE.isAdmin) {
        navigateTo('admin-login');
        return;
    }
    await ensureCategoryTree(true);
    await loadAllItems();

    container.innerHTML = `
        <section class="panel admin-dashboard-panel" role="dialog">
            <div class="corner top-left"></div>
            <div class="corner top-right"></div>
            <header class="header admin-hero">
                <div>
                    <h1 class="title">Painel Administrativo</h1>
                    <div class="user-info-bar">Logado como: ${escapeHtml(APP_STATE.currentUser.nome)} (Dono)</div>
                </div>
                <div class="admin-hero-actions">
                    <button class="admin-button" onclick="switchAdminTab('items');setTimeout(()=>document.getElementById('btn-new-item')?.click(),80)">Novo Item</button>
                    <button class="admin-button ghost" onclick="doLogout()">Sair</button>
                </div>
            </header>
            <div class="admin-panel admin-shell">
                <aside class="admin-sidebar">${renderAdminNav()}</aside>
                <main class="admin-workspace">
                    <div class="admin-content" id="admin-content"></div>
                </main>
            </div>
        </section>
    `;

    bindAdminNav();
    await renderAdminTabContent();
}

async function renderAdminTabContent() {
    const content = document.getElementById('admin-content');
    if (!content) return;
    document.querySelectorAll('.admin-nav-item').forEach(t => {
        t.classList.toggle('active', t.dataset.tab === ADMIN_STATE.activeTab);
    });

    switch (ADMIN_STATE.activeTab) {
        case 'dashboard': renderAdminDashboard(content); break;
        case 'items': renderAdminItems(content); break;
        case 'categories': renderAdminCategories(content); break;
        case 'sellers': await renderAdminSellers(content); break;
        case 'settings': renderAdminSettings(content); break;
        case 'coupons': await renderAdminCoupons(content); break;
        default: renderAdminDashboard(content);
    }
}

async function switchAdminTab(tabName) {
    ADMIN_STATE.activeTab = tabName;
    await renderAdminTabContent();
}

function renderAdminDashboard(container) {
    const totalItems = APP_STATE.allItems.length;
    const totalGenerals = APP_STATE.generalCategories.length;
    const totalCategories = APP_STATE.categoriesLevel2.length;
    const totalSubs = APP_STATE.categoriesLevel3.length;
    const itemsWithImg = APP_STATE.allItems.filter(i => i.imagem_url && i.imagem_url.trim()).length;
    const itemsWithVendor = APP_STATE.allItems.filter(i => i.id_vendedor).length;

    container.innerHTML = `
        <div class="admin-page-head">
            <div>
                <h2>Visão geral</h2>
                <p>Resumo rápido do catálogo e atalhos de manutenção.</p>
            </div>
        </div>
        <div class="admin-metrics">
            <div class="admin-metric"><span>${totalItems}</span><small>Itens</small></div>
            <div class="admin-metric"><span>${itemsWithVendor}</span><small>Com vendedor</small></div>
            <div class="admin-metric"><span>${totalGenerals}</span><small>Gerais</small></div>
            <div class="admin-metric"><span>${totalCategories}</span><small>Categorias</small></div>
            <div class="admin-metric"><span>${totalSubs}</span><small>Subcategorias</small></div>
            <div class="admin-metric"><span>${itemsWithImg}</span><small>Com imagem</small></div>
        </div>
        <div class="admin-grid-two">
            <section class="admin-card">
                <div class="admin-card-header">Ações rápidas</div>
                <div class="admin-action-list">
                    <button class="admin-button" onclick="switchAdminTab('items');setTimeout(()=>document.getElementById('btn-new-item')?.click(),80)">Criar item</button>
                    <button class="admin-button" onclick="switchAdminTab('categories')">Revisar categorias</button>
                    <button class="admin-button" onclick="switchAdminTab('sellers')">Gerenciar vendedores</button>
                </div>
            </section>
            <section class="admin-card">
                <div class="admin-card-header">Últimos itens</div>
                <div class="admin-table-wrap">${renderLastItemsList()}</div>
            </section>
        </div>
    `;
}

function renderAdminCategories(container) {
    container.innerHTML = `
        <div class="admin-page-head">
            <div>
                <h2>Categorias</h2>
                <p>Imagens sincronizadas com os ícones oficiais do WSDB.</p>
            </div>
            <button class="admin-button ghost" onclick="renderAdminTabContent()">Atualizar visão</button>
        </div>
        <section class="admin-card">
            <div class="admin-card-header">Categorias gerais</div>
            <div class="admin-cat-grid">
                ${APP_STATE.generalCategories.map(cat => renderAdminCategoryCard(cat, `${getCategoriesByGeneral(cat.id).length} categorias`, countItemsGeneral(cat))).join('')}
            </div>
        </section>
        <section class="admin-card">
            <div class="admin-card-header">Categorias e subcategorias</div>
            <div class="admin-tree-grid">
                ${APP_STATE.categoriesLevel2.map(cat => {
                    const general = APP_STATE.categoryIndex.get(cat.geral_id);
                    const subs = getSubcategoriesByCategory(cat.id);
                    return `<div class="admin-tree-group">
                        ${renderAdminCategoryCard(cat, general ? general.nome : '', countItemsCategory(cat))}
                        ${subs.length ? `<div class="admin-subcat-row">${subs.map(sub => renderAdminCategoryCard(sub, cat.nome, countItemsForSub(sub.id), true)).join('')}</div>` : ''}
                    </div>`;
                }).join('')}
            </div>
        </section>
    `;
}

function renderAdminCategoryCard(cat, meta, count, compact = false) {
    return `
        <article class="admin-cat-card ${compact ? 'compact' : ''}">
            <img src="${resolveImage(cat.imagem_url)}" alt="${escapeHtml(cat.nome)}">
            <div>
                <strong>${escapeHtml(cat.nome)}</strong>
                <span>${escapeHtml(meta || '')}</span>
            </div>
            <small>${count || 0}</small>
        </article>
    `;
}

/* -----------------------------------------
   Globals expostos para onclick
   ----------------------------------------- */

window.doLogin = doLogin;
window.doLogout = doLogout;
window.doChangePassword = doChangePassword;
window.renderChangePassword = renderChangePassword;
window.openItemForm = openItemForm;
window.promptDeleteItem = promptDeleteItem;
window.openSellerForm = openSellerForm;
window.toggleSeller = toggleSeller;
window.deleteSeller = deleteSeller;
window.reviewSellerRequest = reviewSellerRequest;
window.deleteCoupon = deleteCoupon;
window.toggleCoupon = toggleCoupon;
window.renderAdminCoupons = renderAdminCoupons;
window.refreshAdminStockSummary = refreshAdminStockSummary;
window.updateAdminStockRow = updateAdminStockRow;

// js/views/seller.js
async function loadSellerItems() {
    try {
        const data = await fetchJSON(`items.php?seller_id=${APP_STATE.currentUser.id}`);
        APP_STATE.itemsList = sanitizeItems(data);
    } catch (e) {
        console.error(e);
        APP_STATE.itemsList = [];
    }
    return APP_STATE.itemsList;
}

function renderSellerItemsList(container, term = '') {
    const filterTerm = (term || '').toLowerCase();
    const filtered = APP_STATE.itemsList.filter(item =>
        !filterTerm || (item.nome || '').toLowerCase().includes(filterTerm)
    );
    if (!filtered.length) {
        container.innerHTML = '<div class="accordion-empty">Nenhum item encontrado. Crie seu primeiro anúncio!</div>';
        return;
    }
    container.innerHTML = filtered.map(item => {
        const pCoins = item.preco_moedas || 0;
        const pBRL = formatCurrencyBRL(resolveBRLValue(item));
        const catPath = [item.geral_nome, item.categoria_nome, item.subcategoria_nome].filter(Boolean).join(' › ');
        return `
            <div class="admin-row">
                <img class="thumb" src="${resolveImage(item.imagem_url)}" alt="${escapeHtml(item.nome)}">
                <div>
                    <div class="title">${escapeHtml(item.nome)}</div>
                    <div class="subtitle">${pCoins} moedas • ${pBRL}</div>
                    <div class="subtitle">${catPath || 'Sem categoria'}</div>
                </div>
                <div class="admin-item-actions">
                    <button class="admin-button" onclick="openSellerItemForm(${item.id})">Editar</button>
                    <button class="admin-button danger" onclick="promptDeleteSellerItem(${item.id})">Excluir</button>
                </div>
            </div>`;
    }).join('');
}

async function renderSellerPanel(container) {
    if (!APP_STATE.currentUser.isLoggedIn || APP_STATE.currentUser.papel !== 'vendedor') {
        navigateTo('admin-login');
        return;
    }
    await ensureCategoryTree();
    await loadSellerItems();
    const count = APP_STATE.itemsList.length;

    const itemsWithIcon = APP_STATE.itemsList.filter(i => i.imagem_url && i.imagem_url.trim() !== '').length;
    const itemsNoPrice = APP_STATE.itemsList.filter(i => (!i.preco_moedas || i.preco_moedas === 0) && (!i.preco_reais || i.preco_reais === 0)).length;

    container.innerHTML = `
        <section class="panel" role="dialog">
            <div class="corner top-left"></div>
            <div class="corner top-right"></div>
            <header class="header">
                <h1 class="title">Meus Anúncios (${count})</h1>
                <div class="user-info-bar">Logado como: ${escapeHtml(APP_STATE.currentUser.nome)} (Vendedor)</div>
            </header>
            <div class="admin-panel">
                <div class="stats-card">
                    <div class="stat-item">
                        <div class="stat-value">${count}</div>
                        <div class="stat-label">Total de itens</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${itemsWithIcon}</div>
                        <div class="stat-label">Com ícone</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${itemsNoPrice}</div>
                        <div class="stat-label">Sem preço</div>
                    </div>
                </div>
                <div class="accordion-filters">
                    <button class="admin-button" id="btn-new-seller-item">+ Novo Item</button>
                    <input type="text" id="seller-filter-term" placeholder="Buscar item...">
                </div>
                <div class="accordion-list" id="seller-items-list"></div>
            </div>
            <div class="footer">
                <button class="login-btn" onclick="goBack()">VOLTAR</button>
            </div>
        </section>`;

    const listContainer = document.getElementById('seller-items-list');
    const searchInput = document.getElementById('seller-filter-term');
    const newBtn = document.getElementById('btn-new-seller-item');

    renderSellerItemsList(listContainer);
    searchInput.addEventListener('input', () => renderSellerItemsList(listContainer, searchInput.value));
    newBtn.addEventListener('click', () => openSellerItemForm());
}

async function openSellerItemForm(itemId = null) {
    await ensureCategoryTree();
    let item = null;
    if (itemId != null) {
        item = APP_STATE.itemsList.find(i => i.id === itemId) || null;
        if (!item) {
            try { const data = await fetchJSON(`items.php?id=${itemId}`); const s = sanitizeItems([data]); item = s[0]; } catch (e) {}
        }
    }
    const defGeneralId = item ? (item.geral_id || item.id_geral || APP_STATE.generalCategories[0]?.id || 0) : (APP_STATE.generalCategories[0]?.id || 0);
    const catsForGeneral = defGeneralId ? getCategoriesByGeneral(defGeneralId) : APP_STATE.categoriesLevel2;
    const defCatId = item ? (item.categoria_id || item.id_categoria || catsForGeneral[0]?.id || 0) : (catsForGeneral[0]?.id || 0);
    const subsForCat = defCatId ? getSubcategoriesByCategory(defCatId) : [];
    const defSubId = item ? (item.id_subcategoria || subsForCat[0]?.id || 0) : (subsForCat[0]?.id || 0);

    const genOpts = APP_STATE.generalCategories.map(g => `<option value="${g.id}" ${g.id === defGeneralId ? 'selected' : ''}>${g.nome}</option>`).join('');
    const catOpts = catsForGeneral.map(c => `<option value="${c.id}" ${c.id === defCatId ? 'selected' : ''}>${c.nome}</option>`).join('');
    const subOpts = subsForCat.map(s => `<option value="${s.id}" ${s.id === defSubId ? 'selected' : ''}>${s.nome}</option>`).join('');

    renderModal(`
        <h2>${item ? 'Editar Item' : 'Novo Item'}</h2>
        <div class="form-row"><label>Categoria Geral</label><select id="sf-general">${genOpts}</select></div>
        <div class="form-row" id="sf-row-cat" style="${catsForGeneral.length ? '' : 'display:none;'}"><label>Categoria</label><select id="sf-category">${catOpts}</select></div>
        <div class="form-row" id="sf-row-sub" style="${subsForCat.length ? '' : 'display:none;'}"><label>Subcategoria</label><select id="sf-subcategory">${subOpts}</select></div>
        <div class="form-row"><label>Nome</label><input type="text" id="sf-name" value="${item ? item.nome : ''}"></div>
        <div class="form-row"><label>Descrição</label><textarea id="sf-desc"></textarea></div>
        <div class="form-row"><label>Preço (moedas)</label><input type="number" min="0" id="sf-coins" value="${item ? item.preco_moedas : 0}"></div>
        <div class="form-row"><label>Preço em R$</label><input type="number" step="0.01" min="0" id="sf-brl" value="${item ? item.preco_reais : 0}"></div>
        <div class="form-row"><label>Quantidade</label><input type="number" min="0" id="sf-qty" value="${item ? item.quantidade_disponivel : 0}"></div>
        <div class="form-row"><label>Imagem</label><input type="file" accept="image/*" id="sf-image"></div>
        <div class="form-actions"><button class="btn cancel" onclick="closeModal()">Cancelar</button><button class="btn" id="sf-submit">${item ? 'Salvar' : 'Criar'}</button></div>
    `);

    document.getElementById('sf-desc').value = item ? (item.descricao || '') : '';

    const genSel = document.getElementById('sf-general');
    const catSel = document.getElementById('sf-category');
    const subSel = document.getElementById('sf-subcategory');

    genSel.addEventListener('change', () => {
        const gid = parseInt(genSel.value || '0', 10);
        const cats = gid ? getCategoriesByGeneral(gid) : [];
        fillSelect(catSel, cats, 'Selecione');
        document.getElementById('sf-row-cat').style.display = cats.length ? '' : 'none';
        document.getElementById('sf-row-sub').style.display = 'none';
    });
    catSel.addEventListener('change', () => {
        const cid = parseInt(catSel.value || '0', 10);
        const subs = cid ? getSubcategoriesByCategory(cid) : [];
        fillSelect(subSel, subs, 'Selecione');
        document.getElementById('sf-row-sub').style.display = subs.length ? '' : 'none';
    });

    document.getElementById('sf-submit').addEventListener('click', async () => {
        const nome = document.getElementById('sf-name').value.trim();
        const desc = document.getElementById('sf-desc').value.trim();
        const coins = parseInt(document.getElementById('sf-coins').value || '0', 10);
        const brl = parseFloat(document.getElementById('sf-brl').value || '0');
        const qty = parseInt(document.getElementById('sf-qty').value || '0', 10);
        const gid = parseInt(genSel.value || '0', 10);
        const cid = document.getElementById('sf-row-cat').style.display !== 'none' ? parseInt(catSel.value || '0', 10) : 0;
        const sid = document.getElementById('sf-row-sub').style.display !== 'none' ? parseInt(subSel.value || '0', 10) : 0;

        if (!nome) { showToast('Informe o nome', 'error'); return; }
        if (!gid) { showToast('Selecione uma categoria geral', 'error'); return; }

        const payload = { nome, descricao: desc, preco_moedas: coins, preco_reais: brl, quantidade_disponivel: qty, imagem_url: item ? item.imagem_url : '' };
        if (sid) payload.id_subcategoria = sid;
        else if (cid) payload.id_categoria = cid;
        else payload.id_geral = gid;

        const fileInput = document.getElementById('sf-image');
        if (fileInput.files && fileInput.files[0]) {
            try { payload.imagem_url = await uploadImage(fileInput.files[0]); } catch (e) { showToast(e.message, 'error'); return; }
        }

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
            await loadSellerItems();
            renderSellerItemsList(document.getElementById('seller-items-list'));
        } catch (e) { console.error(e); showToast(e.message || 'Erro ao salvar', 'error'); }
    });
}

async function promptDeleteSellerItem(itemId) {
    const confirmed = await confirmModal('Deseja excluir este item?');
    if (!confirmed) return;
    try {
        await fetchJSON('items.php', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: itemId }) });
        showToast('Item excluído', 'success');
        await loadSellerItems();
        renderSellerItemsList(document.getElementById('seller-items-list'));
    } catch (e) { console.error(e); showToast(e.message || 'Erro ao excluir', 'error'); }
}
window.openSellerItemForm = openSellerItemForm;
window.promptDeleteSellerItem = promptDeleteSellerItem;

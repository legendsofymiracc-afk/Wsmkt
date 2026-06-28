// js/views/seller.js — Painel do vendedor premium

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
        container.innerHTML = '<div style="opacity:0.6;font-size:13px;padding:12px;text-align:center;">Nenhum item encontrado. Crie seu primeiro anúncio!</div>';
        return;
    }
    container.innerHTML = `<table class="admin-table">
        <tr><th>Item</th><th>Preço</th><th>Categoria</th><th>Estoque</th><th>Ações</th></tr>
        ${filtered.map(item => {
            const pCoins = item.preco_moedas || 0;
            const pBRL = formatCurrencyBRL(resolveBRLValue(item));
            const catPath = [item.geral_nome, item.categoria_nome, item.subcategoria_nome].filter(Boolean).join(' › ');
            return `<tr>
                <td style="display:flex;align-items:center;gap:8px;">
                    <img src="${resolveImage(item.imagem_url)}" style="width:36px;height:36px;object-fit:cover;border:1px solid var(--gold-border);background:#1a1a1a;border-radius:4px;">
                    <span>${escapeHtml(item.nome)}</span>
                </td>
                <td>${pCoins} moedas<br><span style="font-size:11px;color:#888;">${pBRL}</span></td>
                <td style="font-size:12px;">${catPath || '-'}</td>
                <td>${item.quantidade_disponivel}</td>
                <td style="display:flex;gap:4px;">
                    <button class="admin-button" style="padding:4px 10px;font-size:12px;" onclick="openSellerItemForm(${item.id})">Editar</button>
                    <button class="admin-button danger" style="padding:4px 10px;font-size:12px;" onclick="promptDeleteSellerItem(${item.id})">Excluir</button>
                </td>
            </tr>`;
        }).join('')}
    </table>`;
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
    const lowStock = APP_STATE.itemsList.filter(i => i.quantidade_disponivel > 0 && i.quantidade_disponivel <= 3).length;

    container.innerHTML = `
        <section class="panel" role="dialog">
            <div class="corner top-left"></div>
            <div class="corner top-right"></div>
            <header class="header">
                <h1 class="title">Meus Anúncios (${count})</h1>
                <div class="user-info-bar">Logado como: ${escapeHtml(APP_STATE.currentUser.nome)} (Vendedor)</div>
            </header>
            <div class="admin-panel">
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px;">
                    <div class="stat-item"><div class="stat-value">${count}</div><div class="stat-label">Total de Itens</div></div>
                    <div class="stat-item"><div class="stat-value">${itemsWithIcon}</div><div class="stat-label">Com Ícone</div></div>
                    <div class="stat-item"><div class="stat-value">${itemsNoPrice}</div><div class="stat-label">Sem Preço</div></div>
                </div>
                <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px;align-items:center;">
                    <button class="admin-button" id="btn-new-seller-item">➕ Novo Anúncio</button>
                    <input type="text" id="seller-filter-term" placeholder="Buscar item..." style="flex:1;min-width:140px;padding:8px 12px;background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.1);color:var(--gold);border-radius:6px;">
                </div>
                <div id="seller-items-list"></div>
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
    const itemImage = item ? resolveImage(item.imagem_url) : '';

    renderModal(`
        <h2>${item ? 'Editar Item' : 'Novo Item'}</h2>

        <div style="margin-bottom:16px;border:1px solid rgba(212,175,55,0.3);border-radius:8px;padding:12px;background:rgba(255,215,0,0.04);">
            <div style="font-size:13px;font-weight:600;color:var(--gold);margin-bottom:8px;">📦 Buscar Template de Equipamento</div>
            <div class="autocomplete-wrap" style="display:flex;flex-direction:column;">
                <input type="text" id="sf-template-search" placeholder="Digite o nome do equipamento (mín. 2 caracteres)..." style="width:100%;padding:10px 12px;background:rgba(0,0,0,0.4);border:1px solid rgba(212,175,55,0.3);border-radius:6px;color:#fff;font-size:14px;box-sizing:border-box;">
                <div class="autocomplete-dropdown" id="sf-template-dropdown"></div>
            </div>
            <div style="font-size:11px;color:#888;margin-top:6px;">Digite o nome do equipamento para preencher os campos automaticamente</div>
        </div>

        <div class="form-row"><label>Categoria Geral</label><select id="sf-general">${genOpts}</select></div>
        <div class="form-row" id="sf-row-cat" style="${catsForGeneral.length ? '' : 'display:none;'}"><label>Categoria</label><select id="sf-category">${catOpts}</select></div>
        <div class="form-row" id="sf-row-sub" style="${subsForCat.length ? '' : 'display:none;'}"><label>Subcategoria</label><select id="sf-subcategory">${subOpts}</select></div>
        <div class="form-row"><label>Nome do Item</label><input type="text" id="sf-name" value="${item ? escapeHtml(item.nome) : ''}" style="flex:1;" placeholder="Ex: Espada Lendária"></div>
        <div class="form-row"><label>Descrição</label><textarea id="sf-desc" style="flex:1;" placeholder="Opcional">${item ? escapeHtml(item.descricao || '') : ''}</textarea></div>
        <div class="form-row"><label>Preço (moedas)</label><input type="number" min="0" id="sf-coins" value="${item ? item.preco_moedas : 0}"></div>
        <div class="form-row"><label>Preço em R$</label><input type="number" step="0.01" min="0" id="sf-brl" value="${item ? item.preco_reais : 0}"></div>
        <div class="form-row"><label>Quantidade</label><input type="number" min="0" id="sf-qty" value="${item ? item.quantidade_disponivel : 0}"></div>
        <div class="form-row"><label>Imagem URL</label><input type="text" id="sf-image-url" value="${item ? item.imagem_url : ''}" placeholder="URL da imagem (opcional)" style="flex:1;"></div>
        <div class="form-row"><label>Upload Imagem</label><input type="file" accept="image/*" id="sf-image"></div>
        ${itemImage ? `<div class="form-row"><label>Preview</label><img src="${itemImage}" style="max-width:64px;max-height:64px;border:1px solid var(--gold-border);border-radius:4px;"></div>` : ''}
        <div class="form-actions"><button class="btn cancel" onclick="closeModal()">Cancelar</button><button class="btn" id="sf-submit">${item ? 'Salvar' : 'Criar Anúncio'}</button></div>
    `);

    // Template autocomplete for seller
    setupTemplateAutocomplete('sf-template-search', 'sf-template-dropdown', (template) => {
        const nameInput = document.getElementById('sf-name');
        const urlInput = document.getElementById('sf-image-url');
        if (nameInput) nameInput.value = template.nome;
        if (urlInput && template.imagem_url) urlInput.value = template.imagem_url;

        // Auto-seleciona categoria baseado no template
        if (template.categoria && template.subcategoria) {
            const genSelect = document.getElementById('sf-general');
            const catSelect = document.getElementById('sf-category');
            const subSelect = document.getElementById('sf-subcategory');

            // 1. Encontra a categoria geral correspondente
            if (genSelect) {
                let found = false;
                for (const gen of APP_STATE.generalCategories) {
                    if (template.categoria.includes(gen.nome) || gen.nome.includes(template.categoria)) {
                        genSelect.value = String(gen.id);
                        genSelect.dispatchEvent(new Event('change'));
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    // Tenta match parcial
                    for (const gen of APP_STATE.generalCategories) {
                        if (template.categoria.toLowerCase().includes(gen.nome.toLowerCase().slice(0, 4)) ||
                            gen.nome.toLowerCase().includes(template.categoria.toLowerCase().slice(0, 4))) {
                            genSelect.value = String(gen.id);
                            genSelect.dispatchEvent(new Event('change'));
                            break;
                        }
                    }
                }
            }

            // 2. Aguarda o DOM atualizar e seleciona subcategoria
            setTimeout(() => {
                const catSelect2 = document.getElementById('sf-category');
                const subSelect2 = document.getElementById('sf-subcategory');
                if (subSelect2 && template.subcategoria) {
                    for (const opt of subSelect2.options) {
                        if (opt.textContent.trim().toLowerCase() === template.subcategoria.toLowerCase()) {
                            subSelect2.value = opt.value;
                            subSelect2.dispatchEvent(new Event('change'));
                            break;
                        }
                    }
                }
                // 3. Se nao achou sub, tenta categoria nivel 2
                if (catSelect2 && subSelect2 && subSelect2.value === '0' && template.subcategoria) {
                    for (const opt of catSelect2.options) {
                        if (opt.textContent.trim().toLowerCase() === template.subcategoria.toLowerCase()) {
                            catSelect2.value = opt.value;
                            catSelect2.dispatchEvent(new Event('change'));
                            break;
                        }
                    }
                }
            }, 100);
        }

        showToast('✅ Template carregado! Ajuste os preços e publique.', 'success');
    });

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
        let imageUrl = document.getElementById('sf-image-url').value.trim() || (item ? item.imagem_url : '');

        if (!nome) { showToast('Informe o nome', 'error'); return; }
        if (!gid) { showToast('Selecione uma categoria geral', 'error'); return; }
        if (coins < 0 || isNaN(coins)) { showToast('Preço em moedas inválido', 'error'); return; }
        if (qty < 0 || isNaN(qty)) { showToast('Quantidade inválida', 'error'); return; }

        const fileInput = document.getElementById('sf-image');
        if (fileInput.files && fileInput.files[0]) {
            try { imageUrl = await uploadImage(fileInput.files[0]); }
            catch (e) { showToast(e.message, 'error'); return; }
        }

        const payload = { nome, descricao: desc, preco_moedas: coins, preco_reais: brl, quantidade_disponivel: qty, imagem_url: imageUrl };
        if (sid) payload.id_subcategoria = sid;
        else if (cid) payload.id_categoria = cid;
        else payload.id_geral = gid;

        try {
            if (item) {
                payload.id = item.id;
                await fetchJSON('items.php', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                showToast('Item atualizado', 'success');
            } else {
                await fetchJSON('items.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                showToast('Anúncio criado com sucesso!', 'success');
            }
            closeModal();
            await loadSellerItems();
            const listContainer = document.getElementById('seller-items-list');
            if (listContainer) renderSellerItemsList(listContainer, document.getElementById('seller-filter-term')?.value || '');
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
        const listContainer = document.getElementById('seller-items-list');
        if (listContainer) renderSellerItemsList(listContainer, document.getElementById('seller-filter-term')?.value || '');
    } catch (e) { console.error(e); showToast(e.message || 'Erro ao excluir', 'error'); }
}

window.openSellerItemForm = openSellerItemForm;
window.promptDeleteSellerItem = promptDeleteSellerItem;

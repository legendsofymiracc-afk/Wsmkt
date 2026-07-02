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

async function loadSellerReviews() {
    try {
        return await fetchJSON('reviews.php?seller=me');
    } catch (e) {
        return {media: 0, total: 0, reviews: []};
    }
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
    container.innerHTML = `<div class="market-ad-list">
        ${filtered.map(item => {
            const pCoins = formatGoldValue(item.preco_moedas);
            const fullCoins = formatGoldValue(item.preco_moedas, { compact: false });
            const goldFit = getGoldFitClass(item.preco_moedas);
            const pBRL = formatCurrencyBRL(resolveBRLValue(item));
            const catPath = typeof translateCategoryPath === 'function'
                ? translateCategoryPath([item.geral_nome, item.categoria_nome, item.subcategoria_nome], ' › ')
                : [item.geral_nome, item.categoria_nome, item.subcategoria_nome].filter(Boolean).join(' › ');
            const image = resolveImage(item.imagem_url || item.template_imagem);
            const level = getItemLevel(item);
            const color = getItemColor(item);
            return `<article class="market-ad-row">
                <div class="market-ad-icon"><img src="${image}" alt="${escapeHtml(item.nome)}">${level ? `<b>${level}</b>` : ''}</div>
                <div class="market-ad-info">
                    <strong class="rarity-name-${color}">${escapeHtml(item.nome)}</strong>
                    <span>${escapeHtml(catPath || 'Sem categoria')}</span>
                    <small class="stock-line">${item.servidor ? `Servidor: ${escapeHtml(item.servidor)} - ` : ''}<span class="stock-label">Estoque</span> <span class="stock-control quick-stock-control"><button class="stock-btn" onclick="event.stopPropagation();quickStockUpdate(${item.id},-1)" title="Diminuir estoque">-</button><span class="stock-qty" id="sq-${item.id}" title="Quantidade atual">${item.quantidade_disponivel}</span><button class="stock-btn" onclick="event.stopPropagation();quickStockUpdate(${item.id},1)" title="Aumentar estoque">+</button></span></small>
                </div>
                <div class="market-ad-price" aria-label="Preço">
                    <span class="market-coin-dot" aria-hidden="true"></span>
                    <div><strong class="${goldFit}" title="${fullCoins}">${pCoins}</strong><small>${pBRL}</small></div>
                </div>
                <div class="market-ad-actions">
                    <button class="admin-button" onclick="openSellerItemForm(${item.id})">Editar</button>
                    <button class="admin-button danger" onclick="promptDeleteSellerItem(${item.id})">Excluir</button>
                </div>
            </article>`;
        }).join('')}
    </div>`;
}

async function renderSellerPanel(container) {
    if (!APP_STATE.currentUser.isLoggedIn || APP_STATE.currentUser.papel !== 'vendedor') {
        navigateTo('admin-login');
        return;
    }
    await ensureCategoryTree();
    await loadSellerItems();
    const reviewData = await loadSellerReviews();
    const count = APP_STATE.itemsList.length;
    const itemsWithIcon = APP_STATE.itemsList.filter(i => i.imagem_url && i.imagem_url.trim() !== '').length;
    const itemsNoPrice = APP_STATE.itemsList.filter(i => (!i.preco_moedas || i.preco_moedas === 0) && (!i.preco_reais || i.preco_reais === 0)).length;
    const lowStock = APP_STATE.itemsList.filter(i => i.quantidade_disponivel > 0 && i.quantidade_disponivel <= 3).length;
    const soldOut = APP_STATE.itemsList.filter(i => Number(i.quantidade_disponivel || 0) <= 0).length;
    const activeAds = APP_STATE.itemsList.filter(i => Number(i.quantidade_disponivel || 0) > 0).length;
    const reviewRows = (reviewData.reviews || []).slice(0, 5).map(r => `
        <div class="seller-review-row">
            <strong>${escapeHtml(r.item_nome || 'Item')}</strong>
            <span>${renderStars(r.estrelas)} ${escapeHtml(r.usuario_nome || 'Comprador')}</span>
            ${r.comentario ? `<small>${escapeHtml(r.comentario)}</small>` : ''}
        </div>
    `).join('') || '<div style="opacity:0.65;font-size:13px;">Nenhuma avaliação recebida ainda.</div>';

    container.innerHTML = `
        <section class="panel" role="dialog">
            <div class="corner top-left"></div>
            <div class="corner top-right"></div>
            <header class="header">
                <h1 class="title">Meus Anúncios (${count})</h1>
                <div class="user-info-bar">Logado como: ${escapeHtml(APP_STATE.currentUser.nome)} (Vendedor)</div>
            </header>
            <div class="admin-panel">
                <div class="seller-legacy-metrics" style="display:none;">
                    <div class="stat-item"><div class="stat-value">${count}</div><div class="stat-label">Total de Itens</div></div>
                    <div class="stat-item"><div class="stat-value">${itemsWithIcon}</div><div class="stat-label">Com Ícone</div></div>
                    <div class="stat-item"><div class="stat-value">${itemsNoPrice}</div><div class="stat-label">Sem Preço</div></div>
                </div>
                <div class="seller-metrics-grid">
                    <div class="stat-item"><div class="stat-value">${count}</div><div class="stat-label">Anúncios</div></div>
                    <div class="stat-item"><div class="stat-value">${activeAds}</div><div class="stat-label">Ativos</div></div>
                    <div class="stat-item"><div class="stat-value">${lowStock}</div><div class="stat-label">Estoque baixo</div></div>
                    <div class="stat-item"><div class="stat-value">${soldOut}</div><div class="stat-label">Zerados</div></div>
                    <div class="stat-item"><div class="stat-value">${reviewData.total || 0}</div><div class="stat-label">Avaliações</div></div>
                    <div class="stat-item"><div class="stat-value">${reviewData.media || 0}</div><div class="stat-label">Nota média</div></div>
                </div>
                <div class="seller-admin-grid">
                    <section class="admin-card seller-store-card">
                        <div class="admin-card-header">Administrar loja</div>
                        <p>Acompanhe estoque, preços e desempenho dos seus anúncios.</p>
                    </section>
                    <section class="admin-card seller-reviews-card">
                        <div class="admin-card-header">Avaliações recebidas</div>
                        ${reviewRows}
                    </section>
                </div>
                <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px;align-items:center;">
                    <button class="admin-button" id="btn-new-seller-item">Novo anúncio</button>
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

    const genOpts = APP_STATE.generalCategories.map(g => `<option value="${g.id}" ${g.id === defGeneralId ? 'selected' : ''}>${escapeHtml(typeof translateCategoryName === 'function' ? translateCategoryName(g.nome) : g.nome)}</option>`).join('');
    const catOpts = catsForGeneral.map(c => `<option value="${c.id}" ${c.id === defCatId ? 'selected' : ''}>${escapeHtml(typeof translateCategoryName === 'function' ? translateCategoryName(c.nome) : c.nome)}</option>`).join('');
    const subOpts = subsForCat.map(s => `<option value="${s.id}" ${s.id === defSubId ? 'selected' : ''}>${escapeHtml(typeof translateCategoryName === 'function' ? translateCategoryName(s.nome) : s.nome)}</option>`).join('');
    const itemImage = item ? resolveImage(item.imagem_url) : '';

    renderModal(`
        <h2>${item ? 'Editar item' : 'Novo anúncio'}</h2>

        <div style="margin-bottom:16px;border:1px solid rgba(212,175,55,0.3);border-radius:8px;padding:12px;background:rgba(255,215,0,0.04);">
            <div style="font-size:13px;font-weight:600;color:var(--gold);margin-bottom:8px;">Item do catálogo</div>
            <div class="autocomplete-wrap" style="display:flex;flex-direction:column;">
                <input type="text" id="sf-template-search" placeholder="Digite o nome do item..." style="width:100%;padding:10px 12px;background:rgba(0,0,0,0.4);border:1px solid rgba(212,175,55,0.3);border-radius:6px;color:#fff;font-size:14px;box-sizing:border-box;">
                <div class="autocomplete-dropdown" id="sf-template-dropdown"></div>
            </div>
            <div style="font-size:11px;color:#888;margin-top:6px;">A categoria, o nome e a imagem serão preenchidos automaticamente.</div>
        </div>

        <div class="item-form-hidden" aria-hidden="true">
            <select id="sf-general">${genOpts}</select>
            <div id="sf-row-cat" style="${catsForGeneral.length ? '' : 'display:none;'}"><select id="sf-category">${catOpts}</select></div>
            <div id="sf-row-sub" style="${subsForCat.length ? '' : 'display:none;'}"><select id="sf-subcategory">${subOpts}</select></div>
            <input type="hidden" id="sf-name" value="${item ? escapeHtml(item.nome) : ''}">
            <input type="hidden" id="sf-image-url" value="${item ? item.imagem_url : ''}">
        </div>
        <div class="form-row"><label>Quantidade</label>${renderNumberStepper('sf-qty', item ? item.quantidade_disponivel : 0, 0, 1, 'quantidade')}</div>
        <div class="form-row"><label>Servidor</label><select id="sf-server">${renderServerSelectOptions(item ? item.servidor || '' : '')}</select></div>
        <div class="form-row"><label>Preço moedas</label>${renderNumberStepper('sf-coins', item ? item.preco_moedas : 0, 0, 1000, 'preço em moedas')}</div>
        <div class="form-row"><label>Preço em R$</label>${renderNumberStepper('sf-brl', item ? item.preco_reais : 0, 0, 1, 'preço em reais')}</div>
        <div class="form-row"><label>Descrição</label><textarea id="sf-desc" style="flex:1;" placeholder="Opcional">${item ? escapeHtml(item.descricao || '') : ''}</textarea></div>
        ${itemImage ? `<div class="form-row"><label>Preview</label><img src="${itemImage}" style="max-width:64px;max-height:64px;border:1px solid var(--gold-border);border-radius:4px;"></div>` : ''}
        <div class="form-actions"><button class="btn cancel" onclick="closeModal()">Cancelar</button><button class="btn" id="sf-submit">${item ? 'Salvar' : 'Criar anúncio'}</button></div>
    `);

    // Armazena o template selecionado para envio no POST
    let selectedTemplateId = item ? (item.id_template || null) : null;

    // Template autocomplete for seller
    setupTemplateAutocomplete('sf-template-search', 'sf-template-dropdown', (template) => {
        const nameInput = document.getElementById('sf-name');
        const urlInput = document.getElementById('sf-image-url');
        if (nameInput) nameInput.value = template.nome;
        if (urlInput && template.imagem_url) urlInput.value = template.imagem_url;
        selectedTemplateId = template.id;

        // Auto-seleciona categoria baseado no template
        if (template.categoria) {
            const genSelect = document.getElementById('sf-general');
            if (!genSelect) return;

            // Mapa de templates para categorias do site
            const categoryMap = {
                'Armas': { general: 'Armas', category: null, subcategory: null },
                'Armadura de Tecido': { general: 'Armadura', category: 'Armadura de Tecido', subcategory: null },
                'Armadura Leve': { general: 'Armadura', category: 'Armadura Leve', subcategory: null },
                'Armadura Pesada': { general: 'Armadura', category: 'Armadura Pesada', subcategory: null },
                'Acessórios': { general: 'Acessórios', category: null, subcategory: null },
                'Consumíveis': { general: 'Consumíveis', category: null, subcategory: null },
                'Relíquias': { general: 'Relíquias', category: null, subcategory: null },
                'Aprimoramentos': { general: 'Aprimoramentos', category: null, subcategory: null },
            };

            let mapping = categoryMap[template.categoria];
            if (!mapping) {
                // Fallback: tenta match parcial
                for (const [key, val] of Object.entries(categoryMap)) {
                    if (template.categoria.includes(key) || key.includes(template.categoria)) {
                        mapping = val;
                        break;
                    }
                }
            }
            if (!mapping) mapping = { general: template.categoria, category: null, subcategory: null };

            // 1. Set general
            let genId = null;
            for (const gen of APP_STATE.generalCategories) {
                if (gen.nome.toLowerCase() === mapping.general.toLowerCase()) {
                    genId = gen.id;
                    break;
                }
            }
            if (!genId) {
                for (const gen of APP_STATE.generalCategories) {
                    if (gen.nome.toLowerCase().includes(mapping.general.toLowerCase()) ||
                        mapping.general.toLowerCase().includes(gen.nome.toLowerCase())) {
                        genId = gen.id;
                        break;
                    }
                }
            }

            if (genId) {
                genSelect.value = String(genId);
                genSelect.dispatchEvent(new Event('change', { bubbles: true }));
            }

            // 2. Set category (nivel 2) and subcategory (nivel 3) after DOM updates
            function setSubLevels(attempt) {
                const catSel = document.getElementById('sf-category');
                const subSel = document.getElementById('sf-subcategory');

                // Try to match subcategory first (nivel 3)
                if (subSel && template.subcategoria) {
                    for (const opt of subSel.options) {
                        if (opt.textContent.trim().toLowerCase() === template.subcategoria.toLowerCase()) {
                            subSel.value = opt.value;
                            subSel.dispatchEvent(new Event('change', { bubbles: true }));
                            return;
                        }
                    }
                }

                // If subcategory not found, try category (nivel 2)
                const targetCat = mapping.category || template.subcategoria;
                if (catSel && targetCat) {
                    for (const opt of catSel.options) {
                        if (opt.textContent.trim().toLowerCase() === targetCat.toLowerCase()) {
                            catSel.value = opt.value;
                            catSel.dispatchEvent(new Event('change', { bubbles: true }));
                            // Now try subcategory again
                            setTimeout(() => {
                                const subSel2 = document.getElementById('sf-subcategory');
                                if (subSel2 && template.subcategoria && template.subcategoria !== targetCat) {
                                    for (const opt of subSel2.options) {
                                        if (opt.textContent.trim().toLowerCase() === template.subcategoria.toLowerCase()) {
                                            subSel2.value = opt.value;
                                            subSel2.dispatchEvent(new Event('change', { bubbles: true }));
                                            return;
                                        }
                                    }
                                }
                            }, 150);
                            return;
                        }
                    }
                }

                // Retry if selects haven't loaded yet
                if (attempt < 3) setTimeout(() => setSubLevels(attempt + 1), 200);
            }

            setTimeout(() => setSubLevels(0), 150);
        }

        showToast('Template carregado. Ajuste os preços e publique.', 'success');
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
        const server = document.getElementById('sf-server').value.trim();
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

        const payload = { nome, descricao: desc, servidor: server, preco_moedas: coins, preco_reais: brl, quantidade_disponivel: qty, imagem_url: imageUrl, id_template: selectedTemplateId };
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

async function quickStockUpdate(itemId, delta) {
    const item = APP_STATE.itemsList.find(i => i.id === itemId) || APP_STATE.allItems.find(i => i.id === itemId);
    if (!item) return;
    const newQty = Math.max(0, (Number(item.quantidade_disponivel) || 0) + delta);
    const payload = {
        id: itemId,
        nome: item.nome || '',
        descricao: item.descricao || '',
        servidor: item.servidor || '',
        preco_moedas: item.preco_moedas || 0,
        preco_reais: item.preco_reais || 0,
        quantidade_disponivel: newQty,
        imagem_url: item.imagem_url || '',
        id_template: item.id_template || null
    };
    if (item.id_subcategoria) payload.id_subcategoria = item.id_subcategoria;
    else if (item.categoria_id || item.id_categoria) payload.id_categoria = item.categoria_id || item.id_categoria;
    else if (item.geral_id || item.id_geral) payload.id_geral = item.geral_id || item.id_geral;

    try {
        await fetchJSON('items.php', { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
        item.quantidade_disponivel = newQty;
        const allItem = APP_STATE.allItems.find(i => i.id === itemId);
        if (allItem) allItem.quantidade_disponivel = newQty;
        const span = document.getElementById('sq-' + itemId);
        if (span) span.textContent = newQty;
        document.querySelectorAll(`[data-stock-id="${itemId}"]`).forEach(el => { el.textContent = newQty; });
        if (typeof window.updateAdminStockRow === 'function') window.updateAdminStockRow(itemId, newQty);
        if (typeof window.refreshAdminStockSummary === 'function') window.refreshAdminStockSummary();
    } catch(e) { showToast(e.message || 'Erro ao atualizar estoque', 'error'); }
}

window.openSellerItemForm = openSellerItemForm;
window.promptDeleteSellerItem = promptDeleteSellerItem;
window.quickStockUpdate = quickStockUpdate;

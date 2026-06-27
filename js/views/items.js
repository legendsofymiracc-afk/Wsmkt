// js/views/items.js
async function loadItemsBySubcategory(subId) {
    if (!subId) { APP_STATE.itemsList = []; return []; }
    try { const data = await fetchJSON(`items.php?subcategory_id=${subId}`); APP_STATE.itemsList = sanitizeItems(data); }
    catch (e) { console.error(e); showToast('Erro ao carregar itens', 'error'); APP_STATE.itemsList = []; }
    return APP_STATE.itemsList;
}
async function loadItemsByCategory(catId) {
    if (!catId) { APP_STATE.itemsList = []; return []; }
    try { const data = await fetchJSON(`items.php?category_id=${catId}`); APP_STATE.itemsList = sanitizeItems(data); }
    catch (e) { console.error(e); showToast('Erro ao carregar itens', 'error'); APP_STATE.itemsList = []; }
    return APP_STATE.itemsList;
}
async function loadItemsByGeneral(genId) {
    if (!genId) { APP_STATE.itemsList = []; return []; }
    try { const data = await fetchJSON(`items.php?general_id=${genId}`); APP_STATE.itemsList = sanitizeItems(data); }
    catch (e) { console.error(e); showToast('Erro ao carregar itens', 'error'); APP_STATE.itemsList = []; }
    return APP_STATE.itemsList;
}
async function loadAllItems() {
    try { const data = await fetchJSON('items.php'); APP_STATE.allItems = sanitizeItems(data); }
    catch (e) { console.error(e); APP_STATE.allItems = []; }
    return APP_STATE.allItems;
}

function selectItem(itemId) { APP_STATE.currentItemId = itemId; navigateTo('item-details'); }

function renderItems(container) {
    let title = 'Itens';
    if (APP_STATE.currentSubcategoryId) { const s = APP_STATE.categoryIndex.get(APP_STATE.currentSubcategoryId); if (s) title = s.nome; }
    else if (APP_STATE.currentCategoryId) { const c = APP_STATE.categoryIndex.get(APP_STATE.currentCategoryId); if (c) title = c.nome; }
    else if (APP_STATE.currentGeneralId) { const g = APP_STATE.categoryIndex.get(APP_STATE.currentGeneralId); if (g) title = g.nome; }
    const html = APP_STATE.itemsList.map(item => {
        const pCoins = item.preco_moedas || 0;
        const pBRL = formatCurrencyBRL(resolveBRLValue(item));
        return `<div class="row" onclick="selectItem(${item.id})" tabindex="0"><img class="icon" src="${resolveImage(item.imagem_url)}" alt="${item.nome}"><div class="label">${item.nome}<div style="font-size:12px;color:var(--gold);">${pCoins} moedas • ${pBRL}</div></div></div>`;
    }).join('') || '<div class="row"><div class="label">Nenhum item cadastrado.</div></div>';
    container.innerHTML = renderPanel(title, html, '<button class="login-btn" onclick="goBack()">VOLTAR</button>');
    addRowSelectionBehavior();
}

async function renderItemDetails(container) {
    let item = APP_STATE.itemsList.find(i => i.id === APP_STATE.currentItemId) || APP_STATE.allItems.find(i => i.id === APP_STATE.currentItemId);
    if (!item && APP_STATE.currentItemId != null) {
        try { const data = await fetchJSON(`items.php?id=${APP_STATE.currentItemId}`); if (data) { const s = sanitizeItems([data]); item = s[0]; } } catch (e) { console.error(e); }
    }
    if (!item) { showToast('Item não encontrado', 'error'); goBack(); return; }
    const pCoins = item.preco_moedas || 0;
    const pBRL = formatCurrencyBRL(resolveBRLValue(item));
    const sellerInfo = item.nome_vendedor ? `<p><strong>Vendido por:</strong> ${item.nome_vendedor}</p>` : '';
    container.innerHTML = renderPanel(item.nome, `
        <div class="item-details">
            <div class="item-details-image"><img src="${resolveImage(item.imagem_url, CONFIG.PLACEHOLDER_IMAGE_200)}" alt="${item.nome}"></div>
            <div class="item-details-info">
                <h2>${item.nome}</h2>
                <p><strong>Descrição:</strong> ${item.descricao || 'Sem descrição'}</p>
                <p class="price-line"><span class="price-icon game-coin" aria-hidden="true"></span><span class="price-label">Preço:</span> <span class="price-value">${pCoins} moedas</span></p>
                <p class="price-line"><span class="price-icon brl-coin" aria-hidden="true"></span><span class="price-label">Preço R$:</span> <span class="price-value">${pBRL}</span></p>
                ${sellerInfo}
                <div class="purchase-actions"><button type="button" class="btn-whatsapp" onclick="whatsBuy(${item.id})"><span class="wa-icon" aria-hidden="true"></span>Comprar no WhatsApp</button></div>
                <p class="stock-line"><strong>Quantidade:</strong> ${item.quantidade_disponivel}</p>
            </div>
        </div>`, '<button class="login-btn" onclick="goBack()">VOLTAR</button>');
}

function buildWhatsAppLink(item) {
    const number = (APP_STATE.settings.whatsapp_number || '').replace(/\D+/g, '');
    if (!number) return null;
    const pBRL = formatCurrencyBRL(resolveBRLValue(item));
    const text = encodeURIComponent(`Olá! Tenho interesse no item "${item.nome}" por ${pBRL}. Ainda está disponível?`);
    return `https://wa.me/${number}?text=${text}`;
}

function whatsBuy(itemId) {
    let item = APP_STATE.itemsList.find(i => i.id === itemId) || APP_STATE.allItems.find(i => i.id === itemId);
    if (!item) return;
    const url = buildWhatsAppLink(item);
    if (!url) { showToast('Configure o número de WhatsApp nas configurações.', 'error'); navigateTo('admin-panel'); return; }
    window.open(url, '_blank');
}

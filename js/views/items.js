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
        const favClass = isFavorite(item.id) ? '❤️' : '🤍';
        return `<div class="row" onclick="selectItem(${item.id})" tabindex="0"><span class="fav-icon" onclick="event.stopPropagation();toggleFavorite(${item.id});renderItems(document.getElementById('app'));">${favClass}</span><img class="icon" src="${resolveImage(item.imagem_url)}" alt="${escapeHtml(item.nome)}"><div class="label">${escapeHtml(item.nome)}<div style="font-size:12px;color:var(--gold);">${pCoins} moedas • ${pBRL}</div></div></div>`;
    }).join('') || '<div class="row"><div class="label">Nenhum item cadastrado.</div></div>';
    container.innerHTML = renderPanel(title, html, '<button class="login-btn" onclick="goBack()">VOLTAR</button>');
    addRowSelectionBehavior();
}

// Renderiza os atributos (bonus, skills) com icones do wsdb
function renderStatsHTML(attrs) {
    if (!attrs || typeof attrs !== 'object') return '';
    const bonuses = [];
    const baseIconUrl = 'https://wsdb.xyz/icons/';

    if (attrs.skill && attrs.skill.name) {
        bonuses.push(`<div class="stat-row"><img class="stat-icon" src="${baseIconUrl}${attrs.skill.icon}.webp" alt=""><span class="stat-label">Habilidade:</span> <span class="stat-value">${escapeHtml(attrs.skill.name)}</span></div>`);
    }
    for (let i = 1; i <= 4; i++) {
        const b = attrs['bonus' + i];
        if (b && b.name) {
            bonuses.push(`<div class="stat-row"><img class="stat-icon" src="${baseIconUrl}${b.icon}.webp" alt=""><span class="stat-label">${escapeHtml(b.name)}:</span> <span class="stat-value">${b.value.toLocaleString()}</span></div>`);
        }
    }
    if (attrs.itemSet) {
        bonuses.push(`<div class="stat-row stat-set"><span class="stat-label">Set:</span> <span class="stat-value">${escapeHtml(attrs.itemSet)}</span></div>`);
        for (let i = 1; i <= 2; i++) {
            const sb = attrs['setBonus' + i];
            if (sb && sb.name) {
                bonuses.push(`<div class="stat-row stat-set-bonus"><span class="stat-label">${escapeHtml(sb.name)}:</span> <span class="stat-value">${sb.value.toLocaleString()}</span></div>`);
            }
        }
    }

    if (bonuses.length === 0) return '';
    return `<div class="item-stats"><h3>⚔️ Atributos</h3>${bonuses.join('')}</div>`;
}

async function renderItemDetails(container) {
    let item = APP_STATE.itemsList.find(i => i.id === APP_STATE.currentItemId) || APP_STATE.allItems.find(i => i.id === APP_STATE.currentItemId);
    if (!item && APP_STATE.currentItemId != null) {
        try { const data = await fetchJSON(`items.php?id=${APP_STATE.currentItemId}`); if (data) { const s = sanitizeItems([data]); item = s[0]; } } catch (e) { console.error(e); }
    }
    if (!item) { showToast('Item não encontrado', 'error'); goBack(); return; }
    const pCoins = item.preco_moedas || 0;
    const pBRL = formatCurrencyBRL(resolveBRLValue(item));
    const sellerInfo = item.nome_vendedor ? `<p><strong>Vendido por:</strong> ${escapeHtml(item.nome_vendedor)}</p>` : '';

    // Usa atributos do template vinculado (ou busca por nome como fallback)
    let statsHTML = '';
    let attrs = null;

    // Primeiro tenta usar o template_atributos que já vem do backend
    if (item.template_atributos) {
        try {
            if (typeof item.template_atributos === 'string') {
                attrs = JSON.parse(item.template_atributos);
            } else {
                attrs = item.template_atributos;
            }
        } catch(e) { attrs = null; }
    }

    // Fallback: busca por nome
    if (!attrs) {
        try {
            const templates = await fetchJSON(`templates.php?search=${encodeURIComponent(item.nome)}`);
            if (templates && templates.length > 0) {
                const match = templates.find(t => t.nome === item.nome) || templates[0];
                if (match && match.atributos) {
                    if (typeof match.atributos === 'string') {
                        try { attrs = JSON.parse(match.atributos); } catch(e) { attrs = null; }
                    } else {
                        attrs = match.atributos;
                    }
                }
            }
        } catch(e) {}
    }

    if (attrs) statsHTML = renderStatsHTML(attrs);

    container.innerHTML = renderPanel(escapeHtml(item.nome), `
        <div class="item-details">
            <div class="item-details-image"><img src="${resolveImage(item.imagem_url, CONFIG.PLACEHOLDER_IMAGE_200)}" alt="${escapeHtml(item.nome)}"></div>
            <div class="item-details-info">
                <h2>${escapeHtml(item.nome)}</h2>
                <p><strong>Descrição:</strong> ${escapeHtml(item.descricao || 'Sem descrição')}</p>
                <p class="price-line"><span class="price-icon game-coin" aria-hidden="true"></span><span class="price-label">Preço:</span> <span class="price-value">${pCoins} moedas</span></p>
                <p class="price-line"><span class="price-icon brl-coin" aria-hidden="true"></span><span class="price-label">Preço R$:</span> <span class="price-value">${pBRL}</span></p>
                ${sellerInfo}
                ${statsHTML}
                <div class="purchase-actions"><button type="button" class="btn-whatsapp" onclick="whatsBuy(${item.id})"><span class="wa-icon" aria-hidden="true"></span>Comprar no WhatsApp</button></div>
                <p class="stock-line"><strong>Quantidade:</strong> ${item.quantidade_disponivel}</p>
            </div>
        </div>`, '<button class="login-btn" onclick="goBack()">VOLTAR</button>');
}

function buildWhatsAppLink(item) {
    // Prefer seller's WhatsApp number, fall back to global admin number
    const sellerNumber = (item.vendedor_whatsapp || '').replace(/\D+/g, '');
    const globalNumber = (APP_STATE.settings.whatsapp_number || '').replace(/\D+/g, '');
    const number = sellerNumber || globalNumber;
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

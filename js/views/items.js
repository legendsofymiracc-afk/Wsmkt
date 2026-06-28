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

// Renderiza atributos como no wsdb.xyz — usa dados RAW da API
function renderStatsHTML(attrs, rawAttrs) {
    if (!attrs || typeof attrs !== 'object') return '';
    const baseIconUrl = 'https://wsdb.xyz/icons/';
    const rows = [];

    // Usa rawAttrs (dados completos da API) se disponível, senão o compacto
    const detail = (rawAttrs && typeof rawAttrs === 'object' && Object.keys(rawAttrs).length > 10) ? rawAttrs : null;

    // Nível e Raridade
    const rarityMap = {0:'⚪ Comum',1:'🟢 Incomum',2:'🔵 Raro',3:'🟣 Épico',4:'🟠 Lendário',5:'🔴 Mítico'};
    const rar = rarityMap[attrs.color] || 'Comum';
    rows.push(`<div class="stat-header"><span>Nível ${attrs.level || '?'}</span><span>${rar}</span></div>`);

    // Stats (bonus)
    for (let i = 1; i <= 4; i++) {
        const nameKey = 'bonus' + i + 'Name';
        const valKey = 'value' + i;
        const iconKey = 'bonus' + i + 'Icon';
        let name, value, icon;
        if (detail && detail[nameKey]) {
            name = detail[nameKey];
            value = detail[valKey];
            icon = detail[iconKey];
        } else {
            const b = attrs['bonus' + i];
            if (b && b.name) { name = b.name; value = b.value; icon = b.icon; }
        }
        if (name) {
            let rawVal = Number(value);
            let displayVal;
            // Aplica escala igual ao wsdb.xyz:
            // bonusParams: bit 0 (1) = percentual, bit 4 (16) = decimal
            // Valores >1000 geralmente precisam ser divididos por 100
            const params = (detail ? detail['bonus' + i + 'Params'] : null) || 0;
            if (params & 1) {
                // Percentual
                displayVal = (rawVal / 10).toFixed(1) + '%';
            } else if (rawVal > 999) {
                // Valores grandes: divide por 100 (ex: 39100 → 391)
                displayVal = (rawVal / 100).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 });
            } else {
                displayVal = rawVal.toLocaleString();
            }
            rows.push(`<div class="stat-row"><img class="stat-icon" src="${baseIconUrl}${icon}.webp" alt=""><span class="stat-label">${escapeHtml(name)}</span><span class="stat-value">${displayVal}</span></div>`);
        }
    }

    // Habilidade
    let skillName, skillIcon;
    if (detail && detail.skillName) {
        skillName = detail.skillName;
        skillIcon = detail.skillIcon;
    } else if (attrs.skill && attrs.skill.name) {
        skillName = attrs.skill.name;
        skillIcon = attrs.skill.icon;
    }
    if (skillName) {
        rows.push(`<div class="stat-section">Habilidade</div>`);
        rows.push(`<div class="stat-row"><img class="stat-icon" src="${baseIconUrl}${skillIcon}.webp" alt=""><span class="stat-label">${escapeHtml(skillName)}</span></div>`);
    }

    // Set
    let setName, setBonus1Name, setBonus1Val, setBonus2Name, setBonus2Val;
    if (detail) {
        setName = detail.itemSet;
        setBonus1Name = detail.setBonus1Name;
        setBonus1Val = detail.setValue1;
        setBonus2Name = detail.setBonus2Name;
        setBonus2Val = detail.setValue2;
    } else {
        setName = attrs.itemSet;
        if (attrs.setBonus1) { setBonus1Name = attrs.setBonus1.name; setBonus1Val = attrs.setBonus1.value; }
        if (attrs.setBonus2) { setBonus2Name = attrs.setBonus2.name; setBonus2Val = attrs.setBonus2.value; }
    }
    if (setName) {
        rows.push(`<div class="stat-section">Set: ${escapeHtml(setName)}</div>`);
        if (setBonus1Name) rows.push(`<div class="stat-row stat-set"><span class="stat-label">${escapeHtml(setBonus1Name)}</span><span class="stat-value">${Number(setBonus1Val).toLocaleString()}</span></div>`);
        if (setBonus2Name) rows.push(`<div class="stat-row stat-set"><span class="stat-label">${escapeHtml(setBonus2Name)}</span><span class="stat-value">${Number(setBonus2Val).toLocaleString()}</span></div>`);
    }

    if (rows.length === 0) return '';
    return `<div class="item-stats">${rows.join('')}</div>`;
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
    let rawAttrs = null;

    // Primeiro tenta usar os dados RAW (completos) do backend
    if (item.template_atributos_raw) {
        try {
            rawAttrs = typeof item.template_atributos_raw === 'string'
                ? JSON.parse(item.template_atributos_raw)
                : item.template_atributos_raw;
        } catch(e) { rawAttrs = null; }
    }

    // Depois o compacto
    if (item.template_atributos) {
        try {
            attrs = typeof item.template_atributos === 'string'
                ? JSON.parse(item.template_atributos)
                : item.template_atributos;
        } catch(e) { attrs = null; }
    }

    // Fallback: busca por nome
    if (!attrs && !rawAttrs) {
        try {
            const templates = await fetchJSON(`templates.php?search=${encodeURIComponent(item.nome)}`);
            if (templates && templates.length > 0) {
                const match = templates.find(t => t.nome === item.nome) || templates[0];
                if (match) {
                    if (match.atributos_detalhes) {
                        try { rawAttrs = JSON.parse(match.atributos_detalhes); } catch(e) {}
                    }
                    if (match.atributos) {
                        try {
                            attrs = typeof match.atributos === 'string' ? JSON.parse(match.atributos) : match.atributos;
                        } catch(e) { attrs = null; }
                    }
                }
            }
        } catch(e) {}
    }

    // Garante que temos pelo menos o compacto
    if (!attrs && rawAttrs) {
        attrs = { level: rawAttrs.level, color: rawAttrs.color };
    }

    if (attrs) statsHTML = renderStatsHTML(attrs, rawAttrs);

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

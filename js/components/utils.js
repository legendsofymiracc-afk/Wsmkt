// js/components/utils.js

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
}

function sanitizeCategoriesTree(nodes) {
    if (!Array.isArray(nodes)) return [];
    return nodes.map(node => ({
        id: Number(node.id),
        id_pai: Number(node.id_pai || 0),
        nome: node.nome,
        nivel: Number(node.nivel || 1),
        imagem_url: node.imagem_url || '',
        filhos: sanitizeCategoriesTree(node.filhos || [])
    }));
}

function sanitizeItems(items) {
    if (!Array.isArray(items)) return [];
    return items.map(item => ({
        id: Number(item.id),
        id_subcategoria: item.id_subcategoria != null ? Number(item.id_subcategoria) : 0,
        id_categoria: item.id_categoria != null ? Number(item.id_categoria) : 0,
        id_geral: item.id_geral != null ? Number(item.id_geral) : 0,
        id_template: item.id_template != null ? Number(item.id_template) : null,
        id_vendedor: item.id_vendedor != null ? Number(item.id_vendedor) : null,
        nome_vendedor: item.nome_vendedor || '',
        vendedor_whatsapp: item.vendedor_whatsapp || '',
        template_atributos: item.template_atributos || null,
        template_atributos_raw: item.template_atributos_raw || null,
        template_imagem: item.template_imagem || '',
        nome: item.nome,
        descricao: item.descricao,
        servidor: item.servidor || '',
        preco_moedas: item.preco_moedas != null ? Number(item.preco_moedas) : 0,
        preco_reais: item.preco_reais != null ? Number(item.preco_reais) : 0,
        quantidade_disponivel: item.quantidade_disponivel != null ? Number(item.quantidade_disponivel) : 0,
        imagem_url: item.imagem_url || '',
        subcategoria_nome: item.subcategoria_nome || '',
        categoria_id: item.categoria_id != null ? Number(item.categoria_id) : (item.id_categoria != null ? Number(item.id_categoria) : null),
        categoria_nome: item.categoria_nome || '',
        geral_id: item.geral_id != null ? Number(item.geral_id) : (item.id_geral != null ? Number(item.id_geral) : null),
        geral_nome: item.geral_nome || ''
    }));
}

function formatCurrencyBRL(value) {
    if (isNaN(value)) return 'R$ 0,00';
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function resolveBRLValue(item) {
    if (item.preco_reais && item.preco_reais > 0) return item.preco_reais;
    return (item.preco_moedas || 0) * CONFIG.COIN_TO_BRL;
}

function parseJSONValue(value) {
    if (!value) return null;
    if (typeof value === 'object') return value;
    try { return JSON.parse(value); } catch (_) { return null; }
}

function getItemAttrs(item) {
    return parseJSONValue(item.template_atributos_raw) || parseJSONValue(item.template_atributos) || {};
}

function getItemLevel(item) {
    const attrs = getItemAttrs(item);
    return attrs.level || item.nivel_min || '';
}

function getItemColor(item) {
    const attrs = getItemAttrs(item);
    const color = Number(attrs.color ?? item.color ?? 0);
    return Number.isFinite(color) ? color : 0;
}

function updateViewportUnit() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
}
window.addEventListener('resize', updateViewportUnit);
updateViewportUnit();

function addRowSelectionBehavior() {
    const rows = document.querySelectorAll('.row');
    rows.forEach(row => {
        row.addEventListener('click', function () {
            rows.forEach(r => r.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

function fillSelect(select, items, placeholder) {
    if (!select) return;
    const options = [`<option value="0">${placeholder}</option>`];
    items.forEach(item => {
        const label = typeof translateCategoryName === 'function' ? translateCategoryName(item.nome) : item.nome;
        options.push(`<option value="${item.id}">${escapeHtml(label)}</option>`);
    });
    select.innerHTML = options.join('');
}

const GAME_SERVERS = [
    'BR-Tourmaline',
    'US-Sapphire',
    'EU-Emerald',
    'SEA-Pearl',
    'RU-Amber',
    'RU-Topaz',
    'RU-Ruby'
];

function renderServerSelectOptions(selected = '') {
    const normalized = String(selected || '').trim();
    const options = ['<option value="">Selecione</option>'];
    GAME_SERVERS.forEach(server => {
        options.push(`<option value="${escapeHtml(server)}" ${server === normalized ? 'selected' : ''}>${escapeHtml(server)}</option>`);
    });
    if (normalized && !GAME_SERVERS.includes(normalized)) {
        options.push(`<option value="${escapeHtml(normalized)}" selected>${escapeHtml(normalized)}</option>`);
    }
    return options.join('');
}

function normalizeGoldNumber(value) {
    const n = Number(value || 0);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.trunc(n));
}

function formatGoldFullValue(value) {
    return normalizeGoldNumber(value).toLocaleString('pt-BR').replace(/\./g, '\u00a0');
}

function formatGoldCompactValue(value) {
    const n = normalizeGoldNumber(value);
    const digits = String(n).length;
    if (digits <= 12) return formatGoldFullValue(n);

    const units = [
        { value: 1e15, suffix: 'Q' },
        { value: 1e12, suffix: 'T' },
        { value: 1e9, suffix: 'B' },
        { value: 1e6, suffix: 'M' }
    ];
    const unit = units.find(entry => n >= entry.value) || units[units.length - 1];
    const scaled = n / unit.value;
    const decimals = scaled >= 100 ? 0 : (scaled >= 10 ? 1 : 2);
    return scaled.toLocaleString('pt-BR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: decimals
    }) + unit.suffix;
}

function formatGoldValue(value, options = {}) {
    return options.compact === false ? formatGoldFullValue(value) : formatGoldCompactValue(value);
}

function getGoldFitClass(value) {
    const digits = String(normalizeGoldNumber(value)).length;
    if (digits > 12) return 'gold-fit-compact';
    if (digits >= 10) return 'gold-fit-xl';
    if (digits >= 7) return 'gold-fit-lg';
    return '';
}

function renderNumberStepper(inputId, value = 0, min = 0, step = 1, label = '') {
    const safeValue = escapeHtml(String(value ?? ''));
    return `<div class="number-stepper" data-step="${step}" data-min="${min}">
        <button type="button" class="stepper-btn minus" onclick="adjustNumberInput('${inputId}', -${step}, ${min})" aria-label="Diminuir ${escapeHtml(label)}">-</button>
        <input type="number" min="${min}" step="${step}" id="${inputId}" value="${safeValue}">
        <button type="button" class="stepper-btn plus" onclick="adjustNumberInput('${inputId}', ${step}, ${min})" aria-label="Aumentar ${escapeHtml(label)}">+</button>
    </div>`;
}

function adjustNumberInput(inputId, delta, min = 0) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const current = Number(input.value || 0);
    const next = Math.max(Number(min || 0), current + Number(delta || 0));
    input.value = String(next);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
}

function toPublicUrl(path) {
    if (!path) return '';
    try {
        return new URL(path, window.location.href).href;
    } catch (_) {
        return String(path);
    }
}

window.renderNumberStepper = renderNumberStepper;
window.adjustNumberInput = adjustNumberInput;

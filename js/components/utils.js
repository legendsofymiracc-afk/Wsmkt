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
        template_imagem: item.template_imagem || '',
        nome: item.nome,
        descricao: item.descricao,
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
        options.push(`<option value="${item.id}">${escapeHtml(item.nome)}</option>`);
    });
    select.innerHTML = options.join('');
}

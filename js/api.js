// js/api.js — Funções de comunicação com a API
const CONFIG = {
    API_URL: 'api',
    COIN_TO_BRL: 0.0001,
    DEFAULT_CORNER_IMAGE: '../images/cantoneira.png',
    PLACEHOLDER_IMAGE_64: 'https://via.placeholder.com/64',
    PLACEHOLDER_IMAGE_200: 'https://via.placeholder.com/200'
};

function resolveApiBase() {
    try {
        const override = localStorage.getItem('API_BASE');
        if (override && override.trim()) return override.trim().replace(/\/$/, '');
    } catch (_) {}
    const origin = (window.location.origin || '').toLowerCase();
    const isLiveServer = origin.includes('127.0.0.1:5500') || origin.includes('localhost:5500');
    const isFile = window.location.protocol === 'file:';
    if (isLiveServer || isFile) return 'http://127.0.0.1:8080/api';
    return 'api';
}

let csrfToken = '';
function resetCsrfToken() {
    csrfToken = '';
}
function getFetchCredentials() {
    return /^https?:\/\//i.test(CONFIG.API_URL) ? 'include' : 'same-origin';
}

const STATIC_API_CACHE = {};

async function loadStaticJSON(path) {
    if (!STATIC_API_CACHE[path]) {
        STATIC_API_CACHE[path] = fetch(path, { credentials: 'same-origin' }).then(response => {
            if (!response.ok) throw new Error(`Erro ${response.status}`);
            return response.json();
        });
    }
    return STATIC_API_CACHE[path];
}

function cloneStaticPayload(payload) {
    return payload == null ? payload : JSON.parse(JSON.stringify(payload));
}

function parseApiEndpoint(endpoint) {
    const url = new URL(endpoint, window.location.origin + '/api/');
    const parts = url.pathname.split('/');
    return { file: parts[parts.length - 1], params: url.searchParams };
}

function flattenCategoryTree(nodes, out = []) {
    (nodes || []).forEach(node => {
        out.push(node);
        flattenCategoryTree(node.filhos || [], out);
    });
    return out;
}

function filterStaticItems(items, params) {
    let result = [...items];
    const id = Number(params.get('id') || 0);
    if (id > 0) return result.find(item => Number(item.id) === id) || null;

    const search = (params.get('search') || '').trim().toLowerCase();
    if (search.length >= 2) {
        result = result.filter(item => String(item.nome || '').toLowerCase().includes(search));
    }

    const sellerId = Number(params.get('seller_id') || 0);
    if (sellerId > 0) result = result.filter(item => Number(item.id_vendedor || 0) === sellerId);

    const subcategoryId = Number(params.get('subcategory_id') || 0);
    const categoryId = Number(params.get('category_id') || 0);
    const generalId = Number(params.get('general_id') || 0);
    if (subcategoryId > 0) {
        result = result.filter(item => Number(item.id_subcategoria || 0) === subcategoryId);
    } else if (categoryId > 0) {
        result = result.filter(item => Number(item.categoria_id || item.id_categoria || 0) === categoryId);
    } else if (generalId > 0) {
        result = result.filter(item => Number(item.geral_id || item.id_geral || 0) === generalId);
    }

    const server = (params.get('servidor') || '').trim();
    if (server) result = result.filter(item => String(item.servidor || '') === server);

    const page = Number(params.get('page') || 0);
    const perPage = Number(params.get('per_page') || 0);
    if (page > 0 && perPage > 0) {
        const start = (page - 1) * perPage;
        return {
            items: result.slice(start, start + perPage),
            total: result.length,
            page,
            per_page: perPage
        };
    }

    return result;
}

async function fetchStaticJSON(endpoint, options = {}) {
    const method = (options.method || 'GET').toUpperCase();
    if (method !== 'GET') return undefined;

    const { file, params } = parseApiEndpoint(endpoint);

    if (file === 'categories.php') {
        const tree = await loadStaticJSON('database/categories.tree.json');
        if (params.get('tree') === '1') return cloneStaticPayload(tree);

        let rows = flattenCategoryTree(tree).map(node => ({
            id: node.id,
            id_pai: node.id_pai,
            nome: node.nome,
            nivel: node.nivel,
            imagem_url: node.imagem_url
        }));
        const id = Number(params.get('id') || 0);
        const nivel = Number(params.get('nivel') || 0);
        const idPai = Number(params.get('id_pai') || 0);
        if (id > 0) rows = rows.filter(row => Number(row.id) === id);
        if (nivel > 0) rows = rows.filter(row => Number(row.nivel) === nivel);
        if (idPai > 0) rows = rows.filter(row => Number(row.id_pai) === idPai);
        return rows;
    }

    if (file === 'items.php') {
        const items = await loadStaticJSON('database/items.static.json');
        return cloneStaticPayload(filterStaticItems(items, params));
    }

    if (file === 'settings.php') {
        return cloneStaticPayload(await loadStaticJSON('database/settings.public.json'));
    }

    if (file === 'auth.php') {
        const action = params.get('action') || 'check';
        if (action === 'csrf') return { csrf_token: '' };
        if (action === 'check') {
            return { id: null, nome: null, email: null, papel: null, is_logged_in: false, cart_count: 0, seller_request: null };
        }
    }

    if (file === 'favorites.php') return { ids: [], items: [] };
    if (file === 'cart.php') return { items: [], count: 0, total_coins: 0 };
    if (file === 'reviews.php') return { media: 0, total: 0, reviews: [] };
    if (file === 'templates.php') return [];
    if (file === 'haircuts.php') {
        const gender = params.get('gender') === '1' ? '1' : '0';
        return cloneStaticPayload(await loadStaticJSON(`database/haircuts-${gender}.json`));
    }
    if (file === 'sellers.php') return [];
    if (file === 'coupons.php') return [];

    return undefined;
}

async function fetchStaticFallback(endpoint, options = {}) {
    try {
        const fallback = await fetchStaticJSON(endpoint, options);
        if (fallback !== undefined) return fallback;
    } catch (error) {
        console.warn('Fallback estatico indisponivel:', endpoint, error);
    }
    return undefined;
}

async function getCsrfToken() {
    if (csrfToken) return csrfToken;
    try {
        const data = await fetch(`${CONFIG.API_URL}/auth.php?action=csrf`, { credentials: getFetchCredentials() });
        const json = await data.json();
        csrfToken = json.csrf_token;
    } catch (_) {}
    return csrfToken;
}

async function fetchJSON(endpoint, options = {}) {
    const init = { credentials: getFetchCredentials(), ...options };
    if (!init.headers) init.headers = {};
    if (['POST', 'PUT', 'DELETE'].includes(init.method || 'GET')) {
        const token = await getCsrfToken();
        if (token) init.headers['X-CSRF-Token'] = token;
    }
    let response;
    try {
        response = await fetch(`${CONFIG.API_URL}/${endpoint}`, init);
    } catch (error) {
        const fallback = await fetchStaticFallback(endpoint, options);
        if (fallback !== undefined) return fallback;
        throw error;
    }
    const contentType = response.headers.get('content-type') || '';
    if (!response.ok) {
        const fallback = await fetchStaticFallback(endpoint, options);
        if (fallback !== undefined) return fallback;

        let message = `Erro ${response.status}`;
        if (contentType.includes('application/json')) {
            try { const data = await response.json(); if (data && data.error) message = data.error; } catch (_) {}
        } else {
            try {
                const text = await response.text();
                if (text && text.trim().length) message = text.slice(0, 200);
            } catch (_) {}
        }
        if (response.status === 403 && /csrf/i.test(message) && !options._csrfRetry) {
            resetCsrfToken();
            return fetchJSON(endpoint, { ...options, _csrfRetry: true });
        }
        throw new Error(message);
    }
    if (!contentType.includes('application/json')) {
        const fallback = await fetchStaticFallback(endpoint, options);
        if (fallback !== undefined) return fallback;

        const text = await response.text();
        const hint = text.includes('<?php') ? 'Parece que o PHP não está sendo executado. Inicie um servidor PHP.' : 'Resposta não é JSON.';
        // Em produção, não vaza conteúdo da resposta (pode conter código PHP, stack traces, etc.)
        if (CONFIG.API_URL === 'api') {
            throw new Error('Erro interno do servidor. Tente novamente.');
        }
        throw new Error(`${hint}\nResposta inicial: ${text.slice(0, 120)}`);
    }
    return response.json();
}

function resolveImage(url, fallback = CONFIG.PLACEHOLDER_IMAGE_64) {
    if (!url || !url.trim()) return fallback;
    // Escapa HTML para prevenir XSS via imagem_url maliciosa (ex: onerror injection)
    return escapeHtml(url);
}

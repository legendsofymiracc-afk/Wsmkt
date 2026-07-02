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
    const response = await fetch(`${CONFIG.API_URL}/${endpoint}`, init);
    const contentType = response.headers.get('content-type') || '';
    if (!response.ok) {
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

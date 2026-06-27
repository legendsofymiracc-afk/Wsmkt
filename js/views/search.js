// js/views/search.js

async function searchItems(term) {
    if (!term || term.length < 2) return [];
    try {
        const data = await fetchJSON(`items.php?search=${encodeURIComponent(term)}`);
        return sanitizeItems(data);
    } catch (e) { console.error(e); return []; }
}

async function renderSearchResults(container, term) {
    const results = await searchItems(term);
    APP_STATE.itemsList = results;
    APP_STATE.currentSubcategoryId = null;
    APP_STATE.currentCategoryId = null;
    APP_STATE.currentGeneralId = null;
    APP_STATE.currentView = 'items';
    // Reuse items.js renderItems
    renderItems(container);
    // Update title
    document.getElementById('page-title').textContent = `Busca: ${term} — Mercado Warspear`;
}

function renderSearchBar() {
    return `
        <div class="search-bar">
            <input type="text" id="search-input" placeholder="Buscar itens... (mínimo 2 caracteres)" autocomplete="off">
            <button id="search-btn">🔍</button>
        </div>`;
}

function setupSearchBar() {
    const input = document.getElementById('search-input');
    const btn = document.getElementById('search-btn');
    if (!input || !btn) return;

    function doSearch() {
        const term = input.value.trim();
        if (term.length < 2) {
            showToast('Digite pelo menos 2 caracteres para buscar', 'info');
            return;
        }
        navigateTo('home');
        const container = document.getElementById('app');
        renderSearchResults(container, term);
    }

    btn.addEventListener('click', doSearch);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') doSearch();
    });
}

window.renderSearchBar = renderSearchBar;
window.setupSearchBar = setupSearchBar;

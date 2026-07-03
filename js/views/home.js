// js/views/home.js

function renderRecentlyViewed() {
    // app.js fornece getRecentlyViewed() → [{id, nome, imagem_url, template_imagem}]
    const items = (typeof getRecentlyViewed === 'function') ? getRecentlyViewed() : [];
    if (!items.length) return '';
    const rows = items.map(item => {
        const image = resolveImage(item.imagem_url || item.template_imagem);
        return `<div class="recently-viewed-item" onclick="navigateToItemFromHash(${item.id})" title="${escapeHtml(item.nome)}">
            <img src="${image}" alt="${escapeHtml(item.nome)}">
            <span>${escapeHtml(item.nome)}</span>
        </div>`;
    });
    return `<div class="recently-viewed-section">
        <div class="recently-viewed-head">
            <div class="recently-viewed-title">Vistos recentemente</div>
            <button class="rpg-mini-btn" type="button" onclick="clearRecentlyViewed()">Limpar</button>
        </div>
        <div class="recently-viewed-row">${rows.join('')}</div>
    </div>`;
}

function renderHomeLegacy(container) {
    return renderHome(container);
    const isLoggedIn = APP_STATE.currentUser.isLoggedIn;
    const papel = APP_STATE.currentUser.papel;
    const adminBtn = isLoggedIn && papel === 'dono'
        ? `<div class="row" onclick="navigateTo('admin-panel')" tabindex="0">
            <img class="icon" src="images/uploads/administrativo.png" alt="Admin">
            <div class="label">Painel Administrativo</div>
           </div>`
        : `<div class="row" onclick="navigateTo('admin-login')" tabindex="0">
            <img class="icon" src="images/uploads/administrativo.png" alt="Acesso">
            <div class="label">Acesso</div>
           </div>`;
    const sellerBtn = isLoggedIn && papel === 'vendedor'
        ? `<div class="row" onclick="navigateTo('seller-panel')" tabindex="0">
            <img class="icon" src="images/uploads/mercado.png" alt="Anúncios">
            <div class="label">Meus Anúncios</div>
           </div>`
        : '';
    const cartBtn = isLoggedIn
        ? `<div class="row" onclick="navigateTo('cart')" tabindex="0">
            <img class="icon" src="images/favorito.png" alt="Carrinho">
            <div class="label">Meu Carrinho</div>
           </div>`
        : '';
    const becomeSellerBtn = !isLoggedIn
        ? `<div class="row" onclick="showSellerRegisterForm()" tabindex="0">
            <img class="icon" src="images/uploads/mercado.png" alt="Vender">
            <div class="label">Quero vender</div>
           </div>`
        : '';

    const logoutBtn = isLoggedIn
        ? `<button class="login-btn" onclick="doLogout()">SAIR (${escapeHtml(APP_STATE.currentUser.nome)})</button>`
        : `<button class="login-btn" onclick="window.close()">FECHAR</button>`;

    const recentHTML = renderRecentlyViewed();

    container.innerHTML = renderPanel('Mercado', `
        ${recentHTML}
        <div class="row" onclick="navigateTo('general-categories')" tabindex="0">
            <img class="icon" src="images/uploads/mercado.png" alt="Procurar">
            <div class="label">Procurar no mercado</div>
        </div>
        <div class="row" onclick="navigateTo('favorites')" tabindex="0">
            <img class="icon" src="images/favorito.png" alt="Favoritos">
            <div class="label">Favoritos</div>
        </div>
        ${cartBtn}
        ${becomeSellerBtn}
        ${sellerBtn}
        ${adminBtn}
    `, logoutBtn, false);
    addRowSelectionBehavior();
}

function showSellerRegisterFormLegacy() {
    return;
    renderModal(`
        <h2>Cadastrar como Vendedor</h2>
        <p style="color:rgba(255,215,0,0.7);font-size:13px;margin-bottom:12px;">Preencha os dados abaixo. Seu cadastro será analisado pelo administrador.</p>
        <div class="form-row"><label>Nome</label><input type="text" id="reg-seller-name" placeholder="Seu nome de vendedor"></div>
        <div class="form-row"><label>Email</label><input type="email" id="reg-seller-email" placeholder="seu@email.com"></div>
        <div class="form-row"><label>WhatsApp</label><input type="text" id="reg-seller-whatsapp" placeholder="5511999999999"></div>
        <div class="form-actions">
            <button class="btn cancel" onclick="closeModal()">Cancelar</button>
            <button class="btn" id="reg-seller-submit">Enviar solicitação</button>
        </div>
    `);
    document.getElementById('reg-seller-submit').addEventListener('click', async () => {
        const nome = document.getElementById('reg-seller-name').value.trim();
        const email = document.getElementById('reg-seller-email').value.trim();
        const whatsapp = document.getElementById('reg-seller-whatsapp').value.trim();
        if (!nome || !email) { showToast('Nome e email são obrigatórios', 'error'); return; }
        try {
            await fetchJSON('sellers.php', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({nome, email, whatsapp}) });
            showToast('Solicitação enviada! Aguarde aprovação do administrador.', 'success');
            closeModal();
        } catch(e) { showToast(e.message || 'Erro ao enviar solicitação', 'error'); }
    });
}

function renderHome(container) {
    const user = APP_STATE.currentUser || {};
    const isLoggedIn = !!user.isLoggedIn;
    const papel = user.papel;
    const favCount = getFavorites().length;
    const request = APP_STATE.sellerRequest;

    const rows = [
        `<div class="row primary-market-row" onclick="navigateTo('general-categories')" tabindex="0">
            <img class="icon" src="images/uploads/mercado.png" alt="Procurar">
            <div class="label">Procurar no mercado</div>
        </div>`
    ];

    if (isLoggedIn) {
        if (favCount > 0) {
            rows.push(`<div class="row" onclick="navigateTo('favorites')" tabindex="0">
                <img class="icon" src="images/favorito.png" alt="Favoritos">
                <div class="label">Favoritos (${favCount})</div>
            </div>`);
        }
        rows.push(`<div class="row" onclick="navigateTo('cart')" tabindex="0">
            <img class="icon" src="images/uploads/carrinho.png" alt="Carrinho">
            <div class="label">Meu Carrinho${APP_STATE.cartCount > 0 ? ' (' + APP_STATE.cartCount + ')' : ''}</div>
        </div>`);

        if (papel === 'comprador') {
            if (request && request.status === 'pendente') {
                rows.push(`<div class="row muted-row" tabindex="0">
                    <img class="icon" src="images/uploads/mercado.png" alt="">
                    <div class="label">Solicitação de vendedor em análise</div>
                </div>`);
            } else {
                rows.push(`<div class="row" onclick="showSellerRegisterForm()" tabindex="0">
                    <img class="icon" src="images/uploads/mercado.png" alt="Vendedor">
                    <div class="label">Quero me tornar um vendedor</div>
                </div>`);
            }
        }

        if (papel === 'vendedor') {
            rows.push(`<div class="row" onclick="navigateTo('seller-panel')" tabindex="0">
                <img class="icon" src="images/uploads/administrativo.png" alt="Meus anúncios">
                <div class="label">Meus Anúncios</div>
            </div>`);
        }

        if (papel === 'dono') {
            rows.push(`<div class="row" onclick="navigateTo('admin-panel')" tabindex="0">
                <img class="icon" src="images/uploads/administrativo.png" alt="Acesso">
                <div class="label">Acesso</div>
            </div>`);
        }
    }

    const recent = isLoggedIn ? renderRecentlyViewed() : '';

    // Footer: SAIR (logado) ou botões de auth centralizados (deslogado)
    let footerHTML;
    if (isLoggedIn) {
        footerHTML = `<button class="login-btn auth-account-button" onclick="navigateTo('profile')">Conta (${escapeHtml(user.nome || 'usuario')})</button>`;
    } else {
        footerHTML = `<div class="home-footer-bar">
            <button type="button" class="auth-image-button auth-image-inline" onclick="navigateTo('login')" title="Entrar">
                <img src="images/login.png" alt="Entrar">
            </button>
            <button type="button" class="auth-image-button auth-image-inline" onclick="navigateTo('register')" title="Criar conta">
                <img src="images/Criarconta.png" alt="Criar conta">
            </button>
        </div>`;
    }

    container.innerHTML = renderPanel('Mercado', recent + rows.join(''), footerHTML, false);
    addRowSelectionBehavior();
}

function showSellerRegisterForm() {
    if (!APP_STATE.currentUser.isLoggedIn) {
        showToast('Faça login para solicitar acesso de vendedor', 'error');
        showQuickLogin();
        return;
    }
    if (APP_STATE.currentUser.papel !== 'comprador') {
        showToast('Essa solicitação é apenas para compradores', 'info');
        return;
    }
    if (APP_STATE.sellerRequest && APP_STATE.sellerRequest.status === 'pendente') {
        showToast('Sua solicitação já está em análise', 'info');
        return;
    }

    renderModal(`
        <h2>Quero me tornar vendedor</h2>
        <p style="color:rgba(255,215,0,0.7);font-size:13px;margin-bottom:12px;">Seu acesso de venda será liberado somente após aprovação do administrador.</p>
        <div class="form-row"><label>Nome da loja</label><input type="text" id="reg-seller-store" placeholder="Nome público da sua loja"></div>
        <div class="form-row"><label>WhatsApp</label><input type="text" id="reg-seller-whatsapp" placeholder="5511999999999"></div>
        <div class="form-row"><label>Mensagem</label><textarea id="reg-seller-message" placeholder="Conte rapidamente o que pretende vender"></textarea></div>
        <div class="form-actions">
            <button class="btn cancel" onclick="closeModal()">Cancelar</button>
            <button class="btn" id="reg-seller-submit">Enviar solicitação</button>
        </div>
    `);
    document.getElementById('reg-seller-submit').addEventListener('click', async () => {
        const nome_loja = document.getElementById('reg-seller-store').value.trim();
        const whatsapp = document.getElementById('reg-seller-whatsapp').value.trim();
        const mensagem = document.getElementById('reg-seller-message').value.trim();
        try {
            const data = await fetchJSON('sellers.php', {
                method: 'POST',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify({nome_loja, whatsapp, mensagem})
            });
            APP_STATE.sellerRequest = data.request || {status: 'pendente'};
            showToast('Solicitação enviada! Aguarde aprovação do administrador.', 'success');
            closeModal();
            renderView();
        } catch(e) {
            showToast(e.message || 'Erro ao enviar solicitação', 'error');
        }
    });
}

window.showSellerRegisterForm = showSellerRegisterForm;

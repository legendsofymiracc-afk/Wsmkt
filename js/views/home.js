// js/views/home.js
function renderHome(container) {
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
    const logoutBtn = isLoggedIn
        ? `<button class="login-btn" onclick="doLogout()">SAIR (${APP_STATE.currentUser.nome})</button>`
        : `<button class="login-btn" onclick="window.close()">FECHAR</button>`;

    container.innerHTML = renderPanel('Mercado', `
        <div class="row" onclick="navigateTo('general-categories')" tabindex="0">
            <img class="icon" src="images/uploads/mercado.png" alt="Procurar">
            <div class="label">Procurar no mercado</div>
        </div>
        ${sellerBtn}
        ${adminBtn}
    `, logoutBtn, false);
    addRowSelectionBehavior();
}

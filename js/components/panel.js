// js/components/panel.js

function renderPanel(title, bodyHTML, footerHTML, showBack = true) {
    const backButton = showBack ? '<button class="back-button" onclick="goBack()" aria-label="Voltar">&larr;</button>' : '';
    return `
        <section class="panel" role="dialog">
            <div class="corner top-left"></div>
            <div class="corner top-right"></div>
            <header class="header">
                ${backButton}
                <h1 class="title">${title}</h1>
            </header>
            <div class="list">${bodyHTML}</div>
            <div class="footer">${footerHTML}</div>
        </section>
    `;
}

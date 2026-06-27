// js/components/modal.js

function renderModal(innerHTML) {
    closeModal();
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `<div class="modal">${innerHTML}</div>`;
    overlay.addEventListener('click', event => {
        if (event.target === overlay) closeModal();
    });
    document.body.appendChild(overlay);
}

function closeModal() {
    const existing = document.querySelector('.modal-overlay');
    if (existing) existing.remove();
}

function confirmModal(message, confirmText = 'Confirmar', cancelText = 'Cancelar') {
    return new Promise(resolve => {
        const html = `
            <h2>Confirmação</h2>
            <div class="form-row"><div>${message}</div></div>
            <div class="form-actions">
                <button class="btn cancel" id="confirm-cancel">${cancelText}</button>
                <button class="btn" id="confirm-ok">${confirmText}</button>
            </div>
        `;
        renderModal(html);
        document.getElementById('confirm-cancel').addEventListener('click', () => { closeModal(); resolve(false); });
        document.getElementById('confirm-ok').addEventListener('click', () => { closeModal(); resolve(true); });
    });
}

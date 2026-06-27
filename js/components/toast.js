// js/components/toast.js

function ensureToastContainer() {
    if (!document.querySelector('.toast-container')) {
        const div = document.createElement('div');
        div.className = 'toast-container';
        document.body.appendChild(div);
    }
}

function showToast(message, type = 'info', timeout = 3000) {
    ensureToastContainer();
    const container = document.querySelector('.toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), timeout);
}

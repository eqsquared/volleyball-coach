// Modal system for alerts, confirms, and prompts

let currentResolve = null;

// Initialize modal
function initModal() {
    const overlay = document.getElementById('modal-overlay');
    const closeBtn = document.getElementById('modal-close');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            hideModal();
            if (currentResolve) {
                currentResolve(false);
                currentResolve = null;
            }
        });
    }
    
    if (overlay) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                hideModal();
                if (currentResolve) {
                    currentResolve(false);
                    currentResolve = null;
                }
            }
        });
    }
    
    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && overlay && overlay.style.display !== 'none') {
            hideModal();
            if (currentResolve) {
                currentResolve(false);
                currentResolve = null;
            }
        }
    });
}

// Show modal
function showModal(title, body, footer) {
    const overlay = document.getElementById('modal-overlay');
    const titleEl = document.getElementById('modal-title');
    const bodyEl = document.getElementById('modal-body');
    const footerEl = document.getElementById('modal-footer');
    
    if (!overlay || !titleEl || !bodyEl || !footerEl) return;
    
    titleEl.textContent = title;
    bodyEl.innerHTML = body;
    footerEl.innerHTML = footer;
    
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

// Hide modal
function hideModal() {
    const overlay = document.getElementById('modal-overlay');
    if (overlay) {
        overlay.style.display = 'none';
        document.body.style.overflow = '';
    }
}

// Alert modal
export function alert(message, title = 'Alert') {
    return new Promise((resolve) => {
        const body = `<p class="modal-body-text">${escapeHtml(message)}</p>`;
        const footer = `
            <button class="modal-btn modal-btn-primary" id="modal-ok">OK</button>
        `;
        
        showModal(title, body, footer);
        
        const okBtn = document.getElementById('modal-ok');
        if (okBtn) {
            okBtn.addEventListener('click', () => {
                hideModal();
                resolve(true);
            });
            okBtn.focus();
        }
    });
}

// Confirm modal
export function confirm(message, title = 'Confirm') {
    return new Promise((resolve) => {
        currentResolve = resolve;
        
        const body = `<p class="modal-body-text">${escapeHtml(message)}</p>`;
        const footer = `
            <button class="modal-btn modal-btn-secondary" id="modal-cancel">Cancel</button>
            <button class="modal-btn modal-btn-primary" id="modal-confirm">Confirm</button>
        `;
        
        showModal(title, body, footer);
        
        const cancelBtn = document.getElementById('modal-cancel');
        const confirmBtn = document.getElementById('modal-confirm');
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                hideModal();
                currentResolve = null;
                resolve(false);
            });
        }
        
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                hideModal();
                currentResolve = null;
                resolve(true);
            });
            confirmBtn.focus();
        }
    });
}

// Prompt modal
export function prompt(message, defaultValue = '', title = 'Input') {
    return new Promise((resolve) => {
        currentResolve = resolve;
        
        const inputId = 'modal-prompt-input-' + Date.now();
        const body = `
            <p class="modal-body-text-with-margin">${escapeHtml(message)}</p>
            <input type="text" id="${inputId}" class="modal-input modal-input-with-padding" value="${escapeHtml(defaultValue)}">
        `;
        const footer = `
            <button class="modal-btn modal-btn-secondary" id="modal-cancel">Cancel</button>
            <button class="modal-btn modal-btn-primary" id="modal-confirm">OK</button>
        `;
        
        showModal(title, body, footer);
        
        const input = document.getElementById(inputId);
        const cancelBtn = document.getElementById('modal-cancel');
        const confirmBtn = document.getElementById('modal-confirm');
        
        if (input) {
            input.select();
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (confirmBtn) confirmBtn.click();
                }
            });
        }
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                hideModal();
                currentResolve = null;
                resolve(null);
            });
        }
        
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                const value = input ? input.value.trim() : '';
                hideModal();
                currentResolve = null;
                resolve(value);
            });
        }
        
        // Focus input after modal is shown
        setTimeout(() => {
            if (input) input.focus();
        }, 100);
    });
}

// Custom modal with HTML content
export function customModal(title, bodyHtml, footerHtml) {
    return new Promise((resolve) => {
        currentResolve = resolve;
        
        showModal(title, bodyHtml, footerHtml);
    });
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initModal);
} else {
    initModal();
}

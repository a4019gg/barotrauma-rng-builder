// ui/popup.js
// Toast / Popup service (max 3, animated, click-to-close)

const MAX_TOASTS = 3;

const DURATIONS = {
  neutral: 3000,
  success: 3000,
  warning: 4000,
  error: 5000
};

let container = null;
let confirmContainer = null;

function ensureContainer() {
  if (container) return container;

  container = document.createElement("div");
  container.id = "toast-container";
  document.body.appendChild(container);
  return container;
}

function createToast(type, text) {
  const el = document.createElement("div");
  el.className = `toast toast-${type}`;
  el.textContent = text;

  // click to close
  el.addEventListener("click", () => removeToast(el));

  return el;
}

function removeToast(el) {
  if (!el) return;
  el.classList.add("toast-hide");

  el.addEventListener(
    "transitionend",
    () => {
      el.remove();
    },
    { once: true }
  );
}

function pushToast(type, text) {
  const c = ensureContainer();
  const toast = createToast(type, text);

  c.appendChild(toast);

  // force reflow for animation
  requestAnimationFrame(() => {
    toast.classList.add("toast-show");
  });

  // limit amount
  const toasts = c.querySelectorAll(".toast");
  if (toasts.length > MAX_TOASTS) {
    removeToast(toasts[0]); // remove topmost
  }

  // auto close
  const duration = DURATIONS[type] ?? 3000;
  setTimeout(() => removeToast(toast), duration);
}

/* ===== PUBLIC API ===== */

export function showNeutral(text) {
  pushToast("neutral", text);
}

export function showSuccess(text) {
  pushToast("success", text);
}

export function showWarning(text) {
  pushToast("warning", text);
}

export function showError(text) {
  pushToast("error", text);
}

function ensureConfirmContainer() {
  if (confirmContainer) return confirmContainer;
  confirmContainer = document.createElement('div');
  confirmContainer.id = 'confirm-modal-root';
  document.body.appendChild(confirmContainer);
  return confirmContainer;
}

export function showConfirmPopup(text, { confirmText = 'Confirm', cancelText = 'Cancel' } = {}) {
  return new Promise(resolve => {
    const root = ensureConfirmContainer();
    const wrap = document.createElement('div');
    wrap.className = 'confirm-modal';
    wrap.innerHTML = `
      <div class="confirm-modal-backdrop"></div>
      <section class="confirm-modal-panel" role="dialog" aria-modal="true">
        <p class="confirm-modal-text"></p>
        <div class="confirm-modal-actions">
          <button type="button" class="confirm-modal-cancel">${cancelText}</button>
          <button type="button" class="confirm-modal-confirm" data-action-tier="primary">${confirmText}</button>
        </div>
      </section>
    `;
    wrap.querySelector('.confirm-modal-text').textContent = text;
    const close = result => {
      wrap.remove();
      resolve(result);
    };
    wrap.querySelector('.confirm-modal-backdrop').addEventListener('click', () => close(false));
    wrap.querySelector('.confirm-modal-cancel').addEventListener('click', () => close(false));
    wrap.querySelector('.confirm-modal-confirm').addEventListener('click', () => close(true));
    root.appendChild(wrap);
  });
}

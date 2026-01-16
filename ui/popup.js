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

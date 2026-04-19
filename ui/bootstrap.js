import { createElement } from '../core/safe-dom.js';

function renderStartupError(error) {
  console.error('Failed to initialize app', error);
  const fallback = createElement('div');
  fallback.style.cssText = 'position:fixed;inset:0;display:grid;place-items:center;padding:2rem;background:#111;color:#f4f4f4;font:500 16px/1.5 system-ui,sans-serif;z-index:9999;text-align:center;';

  const panel = createElement('div');
  panel.appendChild(createElement('h2', { text: 'Application failed to start', attrs: { style: 'margin:0 0 12px;' } }));
  panel.appendChild(createElement('p', {
    text: 'Please reload the page or clear local storage for this site.',
    attrs: { style: 'margin:0 0 6px;opacity:.9;' }
  }));
  panel.appendChild(createElement('p', {
    text: 'Ошибка запуска приложения. Попробуйте перезагрузить страницу или очистить localStorage для сайта.',
    attrs: { style: 'margin:0;opacity:.75;font-size:14px;' }
  }));

  fallback.appendChild(panel);
  document.body.classList.remove('app-loading');
  document.body.appendChild(fallback);
}

async function boot() {
  try {
    const { initEditorUI } = await import('./ui-controller.js');
    await initEditorUI();
    document.body.classList.remove('app-loading');
  } catch (error) {
    renderStartupError(error);
  }
}

window.addEventListener('DOMContentLoaded', boot);

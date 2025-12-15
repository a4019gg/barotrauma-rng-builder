// js/utils.ts — v0.9.401 — УТИЛИТЫ И ЛОКАЛИЗАЦИЯ

import LANG_EN from './lang/en';
import LANG_RU from './lang/ru';

const UTILS_VERSION = "v0.9.401";
(window as any).UTILS_VERSION = UTILS_VERSION;

let currentLang: 'en' | 'ru' = 'en';
const L: Record<string, string> = {};

// Безопасная локализация с красивым fallback
export function loc(key: string, fallback = ''): string {
  if (L[key]) {
    return L[key];
  }

  const errorMsg = `🌍 MISSING LOC KEY: "${key}"`;
  console.warn(`%c${errorMsg}`, 'color: #ff9800; font-weight: bold; background: #333; padding: 2px 6px; border-radius: 4px;');

  return fallback || `‹${key}›`;
}

// === ТЕМЫ ===
export function setTheme(theme: string): void {
  document.body.dataset.theme = theme;
  localStorage.setItem('theme', theme);
  const s = document.getElementById('theme-style') as HTMLLinkElement;
  if (!s) return;

  const themes: Record<string, string> = {
    'dark': 'css/themes/dark.css',
    'light': 'css/themes/light.css',
    'flopstyle-dark': 'css/themes/flopstyle-dark.css',
    'turbo-vision-dark': 'css/themes/turbo-vision-dark.css'
  };
  s.href = themes[theme] || 'css/themes/dark.css';

  const sel = document.getElementById('theme-select') as HTMLSelectElement;
  if (sel) sel.value = theme;
}

// === МАСШТАБ ===
export function setUIScale(val: string): void {
  document.body.dataset.uiScale = val;
  localStorage.setItem('uiScale', val);
  const sel = document.getElementById('scale-select') as HTMLSelectElement;
  if (sel) sel.value = val;
}

// === ПЛОТНОСТЬ НОД ===
export function setNodeDensity(val: string): void {
  document.body.dataset.nodeDensity = val;
  localStorage.setItem('nodeDensity', val);
  const sel = document.getElementById('density-select') as HTMLSelectElement;
  if (sel) sel.value = val;
}

// === ТЕНИ ===
export function toggleShadows(on: boolean): void {
  document.body.dataset.nodeShadows = on ? 'high' : 'off';
  localStorage.setItem('nodeShadows', on.toString());
}

// === СЕТКА ===
export function toggleGrid(on: boolean): void {
  document.body.dataset.bgGrid = on ? 'visible' : 'off';
  localStorage.setItem('bgGrid', on.toString());
}

// === ПРИВЯЗКА К СЕТКЕ ===
export function toggleSnap(on: boolean): void {
  localStorage.setItem('snapToGrid', on.toString());
}

// === ФОРМАТ XML ===
export function setXMLFormat(val: string): void {
  localStorage.setItem('xmlFormat', val);
}

// === ВАЛИДАЦИЯ XML ===
export function toggleValidation(on: boolean): void {
  localStorage.setItem('validateXML', on.toString());
}

// === ПРОВЕРКА ДУБЛИКАТОВ ID ===
export function toggleCheckDuplicateIDs(on: boolean): void {
  localStorage.setItem('checkDuplicateIDs', on.toString());
}

// === ЛОКАЛИЗАЦИЯ ===
export function applyLocalization(): void {
  document.querySelectorAll('[data-l10n]').forEach((el: Element) => {
    const htmlEl = el as HTMLElement;
    const key = htmlEl.dataset.l10n;
    if (key && L[key]) {
      htmlEl.textContent = L[key];
    }
  });
}

export function setLang(lang: 'en' | 'ru'): void {
  currentLang = lang;
  localStorage.setItem('lang', lang);
  const dict = lang === 'ru' ? LANG_RU : LANG_EN;
  Object.assign(L, dict);

  applyLocalization();

  // Обновляем текст кнопки переключения вида
  const viewBtn = document.getElementById('view-btn') as HTMLElement;
  if (viewBtn) {
    const isTree = (document.getElementById('tree-container') as HTMLElement).style.display === 'block';
    viewBtn.textContent = isTree ? loc('classicView') : loc('treeView');
  }

  const sel = document.getElementById('lang-select') as HTMLSelectElement;
  if (sel) sel.value = lang;

  // Временный вызов (в будущем — через onUpdate)
  if (typeof (window as any).updateAll === 'function') {
    (window as any).updateAll();
  }
}

// === ВЕРСИИ ===
export function showScriptVersions(): void {
  const c = document.getElementById('script-versions');
  if (!c) return;
  const v = [
    { n: 'main.js', v: (window as any).MAIN_VERSION || '—' },
    { n: 'db.js', v: (window as any).DB_VERSION || '—' },
    { n: 'utils.js', v: (window as any).UTILS_VERSION || '—' },
    { n: 'nodes.js', v: (window as any).NODES_VERSION || '—' },
    { n: 'tree.js', v: (window as any).TREE_VERSION || '—' },
    { n: 'xml.js', v: (window as any).XML_VERSION || '—' }
  ];
  c.innerHTML = v.map(x => `${x.n} → ${x.v}`).join('<br>');
}

// === СТАРТ ===
document.addEventListener('DOMContentLoaded', () => {
  setTheme(localStorage.getItem('theme') || 'dark');
  setLang((localStorage.getItem('lang') as 'en' | 'ru') || 'en');
  setUIScale(localStorage.getItem('uiScale') || '100');
  setNodeDensity(localStorage.getItem('nodeDensity') || 'normal');
  toggleShadows(localStorage.getItem('nodeShadows') !== 'false');
  toggleGrid(localStorage.getItem('bgGrid') !== 'false');
  toggleSnap(localStorage.getItem('snapToGrid') === 'true');

  applyLocalization();
  showScriptVersions();
});

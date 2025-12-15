// js/utils.js — v0.9.401 — ЛОКАЛИЗАЦИЯ, ТЕМЫ, УТИЛИТЫ

import { CONSTANTS } from './constants.js';

const UTILS_VERSION = "v0.9.401";
window.UTILS_VERSION = UTILS_VERSION;

let currentLang = 'en';
const L = {};

// Безопасная локализация
export function loc(key, fallback = '') {
  if (L[key]) return L[key];
  console.warn(`MISSING LOC KEY: "${key}"`);
  return fallback || `‹${key}›`;
}

// === ТЕМЫ ===
export function setTheme(theme) {
  document.body.dataset.theme = theme;
  localStorage.setItem('theme', theme);
  const s = document.getElementById('theme-style');
  const themes = {
    'dark': 'css/themes/dark.css',
    'light': 'css/themes/light.css',
    'flopstyle-dark': 'css/themes/flopstyle-dark.css',
    'turbo-vision-dark': 'css/themes/turbo-vision-dark.css'
  };
  s.href = themes[theme] || 'css/themes/dark.css';
  const sel = document.getElementById('theme-select');
  if (sel) sel.value = theme;
}

// === МАСШТАБ ===
export function setUIScale(val) {
  document.body.dataset.uiScale = val;
  localStorage.setItem('uiScale', val);
  const sel = document.getElementById('scale-select');
  if (sel) sel.value = val;
}

// === ПЛОТНОСТЬ НОД ===
export function setNodeDensity(val) {
  document.body.dataset.nodeDensity = val;
  localStorage.setItem('nodeDensity', val);
  const sel = document.getElementById('density-select');
  if (sel) sel.value = val;
}

// === ТЕНИ ===
export function toggleShadows(on) {
  document.body.dataset.nodeShadows = on ? 'high' : 'off';
  localStorage.setItem('nodeShadows', on);
}

// === СЕТКА ===
export function toggleGrid(on) {
  document.body.dataset.bgGrid = on ? 'visible' : 'off';
  localStorage.setItem('bgGrid', on);
}

// === ПРИВЯЗКА К СЕТКЕ ===
export function toggleSnap(on) {
  localStorage.setItem('snapToGrid', on);
}

// === ФОРМАТ XML ===
export function setXMLFormat(val) {
  localStorage.setItem('xmlFormat', val);
}

// === ВАЛИДАЦИЯ XML ===
export function toggleValidation(on) {
  localStorage.setItem('validateXML', on);
}

// === ПРОВЕРКА ДУБЛИКАТОВ ID ===
export function toggleCheckDuplicateIDs(on) {
  localStorage.setItem('checkDuplicateIDs', on);
}

// === ЛОКАЛИЗАЦИЯ ===
export function applyLocalization() {
  document.querySelectorAll(`[${CONSTANTS.DATA_ATTR.L10N}]`).forEach(el => {
    const key = el.dataset.l10n;
    if (L[key]) {
      el.textContent = L[key];
    }
  });
}

export function setLang(lang) {
  currentLang = lang;
  localStorage.setItem('lang', lang);
  const dict = lang === 'ru' ? LANG_RU : LANG_EN;
  Object.assign(L, dict);

  applyLocalization();

  // Обновляем текст кнопки переключения вида
  const viewBtn = document.getElementById('view-btn');
  if (viewBtn) {
    const isTree = document.getElementById('tree-container').style.display === 'block';
    viewBtn.textContent = isTree ? loc('classicView') : loc('treeView');
  }

  const sel = document.getElementById('lang-select');
  if (sel) sel.value = lang;

  // Временный вызов updateAll (в будущем — через onUpdate)
  if (typeof updateAll === 'function') updateAll();
}

// === ВЕРСИИ ===
export function showScriptVersions() {
  const c = document.getElementById('script-versions');
  if (!c) return;
  const v = [
    {n:'main.js',v:window.MAIN_VERSION||'—'},
    {n:'db.js',v:window.DB_VERSION||'—'},
    {n:'utils.js',v:window.UTILS_VERSION||'—'},
    {n:'NodeFactory.js',v:window.NODES_VERSION||'—'},
    {n:'tree.js',v:window.TREE_VERSION||'—'},
    {n:'xml.js',v:window.XML_VERSION||'—'}
  ];
  c.innerHTML = v.map(x=>`${x.n} → ${x.v}`).join('<br>');
}

// === СТАРТ ===
document.addEventListener('DOMContentLoaded', () => {
  setTheme(localStorage.getItem('theme') || 'dark');
  setLang(localStorage.getItem('lang') || 'en');
  setUIScale(localStorage.getItem('uiScale') || '100');
  setNodeDensity(localStorage.getItem('nodeDensity') || 'normal');
  toggleShadows(localStorage.getItem('nodeShadows') !== 'false');
  toggleGrid(localStorage.getItem('bgGrid') !== 'false');
  toggleSnap(localStorage.getItem('snapToGrid') === 'true');

  applyLocalization();
  showScriptVersions();
});

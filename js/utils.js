// js/utils.js — v0.9.99 — Настройки, темы, локализация, версии

const UTILS_VERSION = "v0.9.99";
window.UTILS_VERSION = UTILS_VERSION;

let currentLang = 'en';
const L = {};

// === ТЕМЫ ===
function setTheme(theme) {
  document.body.dataset.theme = theme;
  localStorage.setItem('theme', theme);

  const themeStyle = document.getElementById('theme-style');
  const themes = {
    'dark': '',
    'light': 'css/themes/light.css',
    'flopstyle-dark': 'css/themes/flopstyle-dark.css',
    'turbo-vision-dark': 'css/themes/turbo-vision-dark.css'
  };
  themeStyle.setAttribute('href', themes[theme] || '');

  const select = document.getElementById('theme-select');
  if (select) select.value = theme;
}

// === UI SCALE ===
function setUIScale(scale) {
  document.body.dataset.uiScale = scale;
  localStorage.setItem('uiScale', scale);
  const select = document.getElementById('scale-select');
  if (select) select.value = scale;
}

// === NODE DENSITY ===
function setNodeDensity(density) {
  document.body.dataset.nodeDensity = density;
  localStorage.setItem('nodeDensity', density);
  const select = document.getElementById('density-select');
  if (select) select.value = density;
}

// === SHADOWS ===
function toggleShadows(enabled) {
  document.body.dataset.nodeShadows = enabled ? 'high' : 'off';
  localStorage.setItem('nodeShadows', enabled);
}

// === BACKGROUND GRID ===
function toggleGrid(enabled) {
  document.body.dataset.bgGrid = enabled ? 'visible' : 'off';
  localStorage.setItem('bgGrid', enabled);
}

// === SNAP TO GRID (заглушка — будет в tree.js) ===
function toggleSnap(enabled) {
  localStorage.setItem('snapToGrid', enabled);
}

// === ЛОКАЛИЗАЦИЯ ===
function setLang(lang) {
  currentLang = lang;
  localStorage.setItem('lang', lang);
  const dict = lang === 'ru' ? LANG_RU : LANG_EN;
  Object.assign(L, dict);

  document.getElementById('root-label').textContent = L.rootLabel;
  document.querySelectorAll('.success-label').forEach(el => el.textContent = L.successLabel);
  document.querySelectorAll('.failure-label').forEach(el => el.textContent = L.failureLabel);

  document.querySelector('[onclick="generateXML()"]').textContent = L.generateXML;
  document.querySelector('[onclick="copyXML()"]').textContent = L.copyXML;
  document.querySelector('[onclick="downloadXML()"]').textContent = L.downloadXML;
  document.querySelector('[onclick="exportJSON()"]').textContent = L.export;
  document.querySelector('[onclick="importFile()"]').textContent = L.import;
  document.querySelector('[onclick="openDB()"]').textContent = L.dataBase;

  const viewBtn = document.getElementById('view-btn');
  if (viewBtn) viewBtn.textContent = document.getElementById('tree-container').classList.contains('hidden') ? 'Tree View' : 'Classic View';

  const langSelect = document.getElementById('lang-select');
  if (langSelect) langSelect.value = lang;

  updateAll();
}

// === ПОКАЗ ВЕРСИЙ СКРИПТОВ ===
function showScriptVersions() {
  const container = document.getElementById('script-versions');
  if (!container) return;

  const versions = [
    { name: 'main.js', ver: window.MAIN_VERSION || '—' },
    { name: 'db.js', ver: window.DB_VERSION || '—' },
    { name: 'utils.js', ver: window.UTILS_VERSION || '—' },
    { name: 'nodes.js', ver: window.NODES_VERSION || '—' },
    { name: 'tree.js', ver: window.TREE_VERSION || '—' },
    { name: 'xml.js', ver: window.XML_VERSION || '—' }
  ];

  container.innerHTML = versions.map(v => `${v.name} → ${v.ver}`).join('<br>');
}

// === ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ ===
document.addEventListener('DOMContentLoaded', () => {
  // Восстанавливаем настройки
  setTheme(localStorage.getItem('theme') || 'dark');
  setLang(localStorage.getItem('lang') || 'en');
  setUIScale(localStorage.getItem('uiScale') || '100');
  setNodeDensity(localStorage.getItem('nodeDensity') || 'normal');

  const shadows = localStorage.getItem('nodeShadows');
  if (shadows !== null) toggleShadows(shadows === 'true');

  const grid = localStorage.getItem('bgGrid');
  if (grid !== null) toggleGrid(grid === 'true');

  showScriptVersions();
});

// Экспорт функций
window.setTheme = setTheme;
window.setLang = setLang;
window.setUIScale = setUIScale;
window.setNodeDensity = setNodeDensity;
window.toggleShadows = toggleShadows;
window.toggleGrid = toggleGrid;
window.toggleSnap = toggleSnap;
window.showScriptVersions = showScriptVersions;

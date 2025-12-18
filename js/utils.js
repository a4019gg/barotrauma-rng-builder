// js/utils.js — v0.9.401 — УТИЛИТЫ И ЛОКАЛИЗАЦИЯ (БЕЗ import/export)

window.UTILS_VERSION = "v0.9.401";

let currentLang = 'en';
const L = {};

// Безопасная локализация
function loc(key, fallback = '') {
  if (L[key]) return L[key];
  console.warn(`MISSING LOC KEY: "${key}"`);
  return fallback || `‹${key}›`;
}

// === ТЕМЫ ===
function setTheme(theme) {
  document.body.dataset.theme = theme;
  localStorage.setItem('theme', theme);
  const s = document.getElementById('theme-style');
  if (!s) return;

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
function setUIScale(val) {
  document.body.dataset.uiScale = val;
  localStorage.setItem('uiScale', val);
  const sel = document.getElementById('scale-select');
  if (sel) sel.value = val;
}

// === ПЛОТНОСТЬ НОД ===
function setNodeDensity(val) {
  document.body.dataset.nodeDensity = val;
  localStorage.setItem('nodeDensity', val);
  const sel = document.getElementById('density-select');
  if (sel) sel.value = val;
}

// === ТЕНИ ===
function toggleShadows(on) {
  document.body.dataset.nodeShadows = on ? 'high' : 'off';
  localStorage.setItem('nodeShadows', on.toString());
}

// === СЕТКА ===
function toggleGrid(on) {
  document.body.dataset.bgGrid = on ? 'visible' : 'off';
  localStorage.setItem('bgGrid', on.toString());
}

// === ПРИВЯЗКА К СЕТКЕ ===
function toggleSnap(on) {
  localStorage.setItem('snapToGrid', on.toString());
}

// === ФОРМАТ XML ===
function setXMLFormat(val) {
  localStorage.setItem('xmlFormat', val);
}

// === ВАЛИДАЦИЯ XML ===
function toggleValidation(on) {
  localStorage.setItem('validateXML', on.toString());
}

// === ПРОВЕРКА ДУБЛИКАТОВ ID ===
function toggleCheckDuplicateIDs(on) {
  localStorage.setItem('checkDuplicateIDs', on.toString());
}

// === ЛОКАЛИЗАЦИЯ ===
function applyLocalization() {
  document.querySelectorAll('[data-l10n]').forEach(el => {
    const key = el.dataset.l10n;
    if (key && L[key]) {
      el.textContent = L[key];
    }
  });
}

function setLang(lang) {
  currentLang = lang;
  localStorage.setItem('lang', lang);
  const dict = lang === 'ru' ? LANG_RU : LANG_EN;
  Object.assign(L, dict);

  applyLocalization();

  const viewBtn = document.getElementById('view-btn');
  if (viewBtn) {
    const isTree = document.getElementById('tree-container').style.display === 'block';
    viewBtn.textContent = isTree ? loc('classicView') : loc('treeView');
  }

  const sel = document.getElementById('lang-select');
  if (sel) sel.value = lang;

  updateAll();
}

// === ВЕРСИИ ===
function showScriptVersions() {
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

// === ПОПУЛЯЦИЯ DATALIST (переместили сюда из main.js) ===
function populateDatalist() {
  const datalist = document.getElementById('item-datalist');
  if (!datalist) return;

  const commonIds = [
    'revolver', 'revolverrounds', 'divingknife', 'toolbox', 'oxygenitetank',
    'plasmacutter', 'crowbar', 'weldingtool', 'crawler', 'husk', 'mudraptor',
    'hammerhead', 'bleeding', 'burn', 'oxygenlow', 'radiationsickness', 'huskinfection'
  ];

  commonIds.forEach(id => {
    const opt = document.createElement('option');
    opt.value = id;
    datalist.appendChild(opt);
  });
}

// === СТАРТ ===
document.addEventListener('DOMContentLoaded', () => {
  setTheme(localStorage.getItem('theme') || 'dark');
  setLang((localStorage.getItem('lang') || 'en'));
  setUIScale(localStorage.getItem('uiScale') || '100');
  setNodeDensity(localStorage.getItem('nodeDensity') || 'normal');
  toggleShadows(localStorage.getItem('nodeShadows') !== 'false');
  toggleGrid(localStorage.getItem('bgGrid') !== 'false');
  toggleSnap(localStorage.getItem('snapToGrid') === 'true');

  applyLocalization();
  showScriptVersions();
  populateDatalist(); // теперь здесь
});

// Глобальные функции
window.loc = loc;
window.setTheme = setTheme;
window.setLang = setLang;
window.setUIScale = setUIScale;
window.setNodeDensity = setNodeDensity;
window.toggleShadows = toggleShadows;
window.toggleGrid = toggleGrid;
window.toggleSnap = toggleSnap;
window.setXMLFormat = setXMLFormat;
window.toggleValidation = toggleValidation;
window.toggleCheckDuplicateIDs = toggleCheckDuplicateIDs;
window.applyLocalization = applyLocalization;
window.showScriptVersions = showScriptVersions;
window.populateDatalist = populateDatalist;

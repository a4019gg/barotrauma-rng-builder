// js/utils.js — v0.9.200 — ПОЛНЫЙ, ЛОКАЛИЗАЦИЯ, ТЕМЫ, НАСТРОЙКИ

const UTILS_VERSION = "v0.9.200";
window.UTILS_VERSION = UTILS_VERSION;

let currentLang = 'en';
const L = {};

// === ТЕМЫ ===
function setTheme(theme) {
  document.body.dataset.theme = theme;
  localStorage.setItem('theme', theme);
  const s = document.getElementById('theme-style');
  const themes = {
    'dark': '',
    'light': 'css/themes/light.css',
    'flopstyle-dark': 'css/themes/flopstyle-dark.css',
    'turbo-vision-dark': 'css/themes/turbo-vision-dark.css'
  };
  s.href = themes[theme] || '';
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
  localStorage.setItem('nodeShadows', on);
}

// === СЕТКА ===
function toggleGrid(on) {
  document.body.dataset.bgGrid = on ? 'visible' : 'off';
  localStorage.setItem('bgGrid', on);
}

// === ПРИВЯЗКА К СЕТКЕ ===
function toggleSnap(on) {
  localStorage.setItem('snapToGrid', on);
}

// === ФОРМАТ XML ===
function setXMLFormat(val) {
  localStorage.setItem('xmlFormat', val);
}

// === ВАЛИДАЦИЯ XML ===
function toggleValidation(on) {
  localStorage.setItem('validateXML', on);
}

// === ПРОВЕРКА ДУБЛИКАТОВ ID ===
function toggleCheckDuplicateIDs(on) {
  localStorage.setItem('checkDuplicateIDs', on);
}

// === ЛОКАЛИЗАЦИЯ ===
function applyLocalization() {
  document.querySelectorAll('[data-l10n]').forEach(el => {
    const key = el.dataset.l10n;
    if (L[key]) el.textContent = L[key];
  });
}

function setLang(lang) {
  currentLang = lang;
  localStorage.setItem('lang', lang);
  const dict = lang === 'ru' ? LANG_RU : LANG_EN;
  Object.assign(L, dict);

  // Обновляем ключевые элементы
  document.getElementById('root-label').textContent = L.rootLabel;
  document.querySelectorAll('.success-label').forEach(el => el.textContent = L.successLabel);
  document.querySelectorAll('.failure-label').forEach(el => el.textContent = L.failureLabel);

  // Кнопки
  document.querySelector('[onclick="generateXML()"]').textContent = L.generateXML;
  document.querySelector('[onclick="copyXML()"]').textContent = L.copyXML;
  document.querySelector('[onclick="downloadXML()"]').textContent = L.downloadXML;
  document.querySelector('[onclick="exportJSON()"]').textContent = L.export;
  document.querySelector('[onclick="importFile()"]').textContent = L.import;
  document.querySelector('[onclick="openDB()"]').textContent = L.dataBase;
  document.querySelector('[onclick="importFromXML()"]').textContent = L.importXML;

  // Кнопки действий
  document.querySelectorAll('button[onclick^="addRNG"]').forEach(btn => btn.textContent = L.addRNG);
  document.querySelectorAll('button[onclick^="addSpawn"]').forEach(btn => btn.textContent = L.addItem);
  document.querySelectorAll('button[onclick^="addCreature"]').forEach(btn => btn.textContent = L.addCreature);
  document.querySelectorAll('button[onclick^="addAffliction"]').forEach(btn => btn.textContent = L.addAffliction);

  // Переключение вида
  const isTree = document.getElementById('tree-container').style.display === 'block';
  document.getElementById('view-btn').textContent = isTree ? L.classicView : L.treeView;

  const sel = document.getElementById('lang-select');
  if (sel) sel.value = lang;

  applyLocalization();
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
    {n:'nodes.js',v:window.NODES_VERSION||'—'},
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
  toggleShadows(localStorage.getItem('nodeShadows') === 'true');
  toggleGrid(localStorage.getItem('bgGrid') !== 'false');
  toggleSnap(localStorage.getItem('snapToGrid') === 'true');

  applyLocalization();
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
window.setXMLFormat = setXMLFormat;
window.toggleValidation = toggleValidation;
window.toggleCheckDuplicateIDs = toggleCheckDuplicateIDs;

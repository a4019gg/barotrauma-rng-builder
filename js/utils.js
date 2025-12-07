// js/utils.js — v0.9.109 — ВСЁ РАБОТАЕТ

const UTILS_VERSION = "v0.9.109";
window.UTILS_VERSION = UTILS_VERSION;

let currentLang = 'en';
const L = {};

// === ТЕМЫ ===
function setTheme(theme) {
  document.body.dataset.theme = theme;
  localStorage.setItem('theme', theme);
  const s = document.getElementById('theme-style');
  const m = {
    'dark': '',
    '',
    'light':     'css/themes/light.css',
    'flopstyle-dark': 'css/themes/flopstyle-dark.css',
    'turbo-vision-dark': 'css/themes/turbo-vision-dark.css'
  };
  s.href = m[theme] || '';
  document.getElementById('theme-select').value = theme;
}

// === UI SCALE ===
function setUIScale(val) {
  document.body.dataset.uiScale = val;
  localStorage.setItem('uiScale', val);
  document.getElementById('scale-select').value = val;
}

// === NODE DENSITY ===
function setNodeDensity(val) {
  document.body.dataset.nodeDensity = val;
  localStorage.setItem('nodeDensity', val);
  document.getElementById('density-select').value = val;
}

// === SHADOWS ===
function toggleShadows(on) {
  document.body.dataset.nodeShadows = on ? 'high' : 'off';
  localStorage.setItem('nodeShadows', on);
}

// === GRID ===
function toggleGrid(on) {
  document.body.dataset.bgGrid = on ? 'visible' : 'off';
  localStorage.setItem('bgGrid', on);
}

// === SNAP TO GRID ===
function toggleSnap(on) {
  localStorage.setItem('snapToGrid', on);
}

// === VALIDATION ===
function toggleValidation(on) {
  localStorage.setItem('validateXML', on);
}

// === CHECK DUPLICATE IDs ===
function toggleCheckDuplicateIDs(on) {
  localStorage.setItem('checkDuplicateIDs', on);
}

// === ЯЗЫК ===
function setLang(lang) {
  currentLang = lang;
  localStorage.setItem('lang', lang);
  const dict = lang === 'ru' ? LANG_RU : LANG_EN;
  Object.assign(L, dict);

  document.getElementById('root-label').textContent = L.rootLabel;
  document.querySelectorAll('.success-label').forEach(el => el.textContent = L.successLabel);
  document.querySelectorAll('.failure-label').forEach(el => el.textContent = L.failureLabel);

  // Переводим кнопки
  document.querySelector('[onclick="generateXML()"]').textContent = L.generateXML;
  document.querySelector('[onclick="copyXML()"]').textContent = L.copyXML;
  document.querySelector('[onclick="downloadXML()"]').textContent = L.downloadXML;
  document.querySelector('[onclick="exportJSON()"]').textContent = L.export;
  document.querySelector('[onclick="importFile()"]').textContent = L.import;
  document.querySelector('[onclick="openDB()"]').textContent = L.dataBase;

  document.getElementById('view-btn').textContent = 
    document.getElementById('tree-container').style.display === 'block' ? L.classicView : L.treeView;

  document.getElementById('lang-select').value = lang;
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

// === ЗАПУСК ===
document.addEventListener('DOMContentLoaded', () => {
  setTheme(localStorage.getItem('theme')||'dark');
  setLang(localStorage.getItem('lang')||'en');
  setUIScale(localStorage.getItem('uiScale')||'100');
  setNodeDensity(localStorage.getItem('nodeDensity')||'normal');
  toggleShadows(localStorage.getItem('nodeShadows')==='true');
  toggleGrid(localStorage.getItem('bgGrid')!=='false');
  showScriptVersions();
});

window.setTheme = setTheme;
window.setLang = setLang;
window.setUIScale = setUIScale;
window.setNodeDensity = setNodeDensity;
window.toggleShadows = toggleShadows;
window.toggleGrid = toggleGrid;
window.toggleSnap = toggleSnap;
window.toggleValidation = toggleValidation;
window.toggleCheckDuplicateIDs = toggleCheckDuplicateIDs;

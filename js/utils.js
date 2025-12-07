// js/utils.js — ЛОКАЛИЗАЦИЯ, ТЕМЫ, ИМПОРТ/ЭКСПОРТ — v0.9.8

let currentLang = 'en';
const L = {};

// === ТЕМЫ ===
function setTheme(theme) {
  document.body.dataset.theme = theme;
  localStorage.setItem('theme', theme);

  const themeStyle = document.getElementById('theme-style');
  if (theme === 'dark') {
    themeStyle.setAttribute('href', '');
  } else if (theme === 'light') {
    themeStyle.setAttribute('href', 'css/themes/light.css');
  } else if (theme === 'flopstyle-dark') {
    themeStyle.setAttribute('href', 'css/themes/flopstyle-dark.css');
  }

  // Сохраняем в селект
  const select = document.getElementById('theme-select');
  if (select) select.value = theme;
}

// === ЛОКАЛИЗАЦИЯ ===
function setLang(lang) {
  currentLang = lang;
  localStorage.setItem('lang', lang);

  const dict = lang === 'ru' ? LANG_RU : LANG_EN;
  Object.assign(L, dict);

  // Применяем ко всем элементам
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

  // View кнопка
  const viewBtn = document.getElementById('view-btn');
  if (viewBtn) {
    viewBtn.textContent = document.getElementById('tree-container').classList.contains('hidden') ? 'Tree View' : 'Classic View';
  }

  // Селект языка
  const select = document.getElementById('lang-select');
  if (select) select.value = lang;

  updateAll();
}

// === ЭКСПОРТ ===
function exportJSON() {
  const data = {
    version: "0.9.8",
    events: events.map(e => ({
      eventId: e.eventId,
      html: e.html
    }))
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'rng-events.json';
  a.click();
  URL.revokeObjectURL(url);
}

// === ИМПОРТ ===
function importFile() {
  document.getElementById('file-input').click();
}

document.getElementById('file-input').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
      if (data.events && Array.isArray(data.events)) {
        data.events.forEach(ev => {
          events.push({
            html: ev.html || '',
            eventId: ev.eventId || 'imported_event'
          });
          addEvent();
        });
        switchEvent(events.length - 1);
        alert(L.importSuccess || 'Импорт завершён!');
      } else {
        alert(L.importError || 'Неверный формат файла');
      }
    } catch (err) {
      alert(L.importError + ': ' + err.message);
    }
  };
  reader.readAsText(file);
});

// === ОЧИСТКА ===
function clearAll() {
  if (confirm(L.clearAllConfirm || 'Очистить всё?')) {
    document.getElementById('root-children').innerHTML = '';
    updateAll();
  }
}

// === ПРИМЕР ===
function loadExample() {
  clearAll();
  addRNG('');
  setTimeout(() => {
    const first = document.querySelector('#root-children > .node.rng');
    if (first) {
      first.querySelector('.chance').value = 0.6;
      addRNG(first.dataset.id + '-s');
      addSpawn(first.dataset.id + '-s.0-s');
      updateAll();
    }
  }, 100);
}

// Экспорт функций
window.setTheme = setTheme;
window.setLang = setLang;
window.exportJSON = exportJSON;
window.importFile = importFile;
window.clearAll = clearAll;
window.loadExample = loadExample;

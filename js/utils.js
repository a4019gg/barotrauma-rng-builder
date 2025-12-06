// js/utils.js — ПОЛНАЯ ЛОКАЛИЗАЦИЯ, ТЕМЫ, ИМПОРТ/ЭКСПОРТ

let currentLang = 'en';
const L = {}; // сюда загружается активный язык

// === ТЕМЫ ===
function setTheme(theme) {
  document.body.dataset.theme = theme;
  localStorage.setItem('theme', theme);

  // Обновляем выбранный пункт в настройках
  const select = document.querySelector('.dropdown-menu select[onchange*="setTheme"]');
  if (select) select.value = theme;
}

// === ЛОКАЛИЗАЦИЯ ===
function setLang(lang) {
  currentLang = lang;
  localStorage.setItem('lang', lang);

  // Загружаем нужный словарь
  const dict = lang === 'ru' ? LANG_RU : LANG_EN;
  Object.assign(L, dict);

  // Применяем перевод ко всем элементам
  document.getElementById('root-label').textContent = L.rootLabel;

  document.querySelectorAll('.success-label').forEach(el => el.textContent = L.successLabel);
  document.querySelectorAll('.failure-label').forEach(el => el.textContent = L.failureLabel);

  // Кнопки в шапке
  document.querySelector('[onclick="generateXML()"]').textContent = L.generateXML;
  document.querySelector('[onclick="copyXML()"]').textContent = L.copyXML;
  document.querySelector('[onclick="downloadXML()"]').textContent = L.downloadXML;
  document.querySelector('[onclick="exportJSON()"]').textContent = L.export;
  document.querySelector('[onclick="importFile()"]').textContent = L.import;
  document.querySelector('[onclick="openDB()"]').textContent = L.dataBase;

  // Кнопка Tree View
  const viewBtn = document.getElementById('view-btn');
  if (viewBtn) {
    viewBtn.textContent = document.getElementById('tree-container').classList.contains('hidden') ? 'Tree View' : 'Classic View';
  }

  // Обновляем пример и всё остальное
  updateAll();
}

// === ЭКСПОРТ ВСЕХ СОБЫТИЙ ===
function exportJSON() {
  const data = {
    version: "0.9.0",
    events: events.map(e => ({
      eventId: e.eventId,
      html: e.html
    }))
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'barotrauma-rng-events.json';
  a.click();
  URL.revokeObjectURL(url);
}

// === ИМПОРТ СОБЫТИЙ ===
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

      if (!data.events || !Array.isArray(data.events)) {
        throw new Error('Неверный формат файла');
      });

      data.events.forEach(ev => {
        events.push({
          html: ev.html || '',
          eventId: ev.eventId || 'imported_event'
        });
        addEvent(); // создаём вкладку
      });

      switchEvent(events.length - 1);
      alert('Импорт завершён! Добавлено ' + data.events.length + ' событий.');
    } catch (err) {
      alert('Ошибка импорта: ' + err.message);
    }
  };

  reader.readAsText(file);
});

// === ОЧИСТКА ===
function clearAll() {
  if (confirm(L.clearAllConfirm || 'Clear all?')) {
    document.getElementById('root-children').innerHTML = '';
    updateAll();
  }
}

// === ПРИМЕР ПРИ ЗАПУСКЕ ===
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

// Экспорт функций для других модулей
window.setTheme = setTheme;
window.setLang = setLang;
window.exportJSON = exportJSON;
window.importFile = importFile;
window.clearAll = clearAll;
window.loadExample = loadExample;

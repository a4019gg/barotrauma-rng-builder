// js/utils.js — темы, локализация, импорт/экспорт, утилиты

let currentLang = 'en';
const L = {}; // сюда загрузится активный язык

function setTheme(theme) {
  document.body.dataset.theme = theme;
  localStorage.setItem('theme', theme);
}

function setLang(lang) {
  currentLang = lang;
  localStorage.setItem('lang', lang);

  // Копируем нужный словарь
  const dict = lang === 'ru' ? LANG_RU : LANG_EN;
  Object.assign(L, dict);

  // Применяем переводы к интерфейсу
  document.getElementById('root-label').textContent = L.rootLabel;
  document.querySelectorAll('.success-label').forEach(el => el.textContent = L.successLabel);
  document.querySelectorAll('.failure-label').forEach(el => el.textContent = L.failureLabel);

  // Кнопки
  const btns = {
    'auto-balance-btn': L.autoBalanceTitle,
    'generate-xml-btn': L.generateXML,
    'copy-xml-btn': L.copyXML,
    'download-xml-btn': L.downloadXML,
    'export-btn': L.export,
    'import-btn': L.import,
    'pick-item-btn': L.pickItem,
    'settings-btn': L.settings
  };
  Object.entries(btns).forEach(([id, text]) => {
    const el = document.getElementById(id) || document.querySelector(`[data-lang-id="${id}"]`);
    if (el) el.textContent = text;
  });

  // Перерисовываем всё
  updateAll();
}

function exportJSON() {
  const data = {
    version: "0.6.0",
    events: events.map(e => ({ eventId: e.eventId, html: e.html }))
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'rng-events.json';
  a.click();
  URL.revokeObjectURL(url);
}

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
        events.length = 0;
        events.push(...data.events);
        document.getElementById('events-tabs').innerHTML = '';
        events.forEach((ev, i) => {
          const tab = document.createElement('button');
          tab.className = 'tab' + (i === 0 ? ' active' : '');
          tab.textContent = `Event ${i + 1}`;
          tab.onclick = () => switchEvent(i);
          document.getElementById('events-tabs').appendChild(tab);
        });
        const addBtn = document.createElement('button');
        addBtn.className = 'tab add';
        addBtn.textContent = '+ Add Event';
        addBtn.onclick = addEvent;
        document.getElementById('events-tabs').appendChild(addBtn);
        switchEvent(0);
      }
    } catch (err) {
      alert('Ошибка импорта: ' + err.message);
    }
  };
  reader.readAsText(file);
});

function clearAll() {
  if (confirm(L.deleteEventConfirm || 'Clear all?')) {
    document.getElementById('root-children').innerHTML = '';
    updateAll();
  }
}

function loadExample() {
  clearAll();
  addRNG('');
  setTimeout(() => {
    const first = document.querySelector('#root-children > .node.rng');
    first.querySelector('.chance').value = 0.6;
    addRNG(first.dataset.id + '-s');
    addSpawn(first.dataset.id + '-s.0-s');
    updateAll();
  }, 100);
}

// Экспорт функций
window.setTheme = setTheme;
window.setLang = setLang;
window.exportJSON = exportJSON;
window.importFile = importFile;
window.clearAll = clearAll;
window.loadExample = loadExample;

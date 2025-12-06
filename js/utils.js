// js/utils.js — темы, локализация, импорт/экспорт

let currentLang = 'en';
const L = {}; // сюда будет активный язык

function setTheme(theme) {
  document.body.dataset.theme = theme;
  localStorage.setItem('theme', theme);
}

function setLang(lang) {
  currentLang = lang;
  localStorage.setItem('lang', lang);
  const dict = lang === 'ru' ? LANG_RU : LANG_EN;
  Object.assign(L, dict);

  // Применяем переводы
  document.getElementById('root-label').textContent = L.rootLabel;
  document.querySelectorAll('.success-label').forEach(el => el.textContent = L.successLabel);
  document.querySelectorAll('.failure-label').forEach(el => el.textContent = L.failureLabel);
  document.querySelectorAll('[data-lang]').forEach(el => {
    const key = el.dataset.lang;
    if (L[key]) el.textContent = L[key];
  });

  updateAll();
}

function exportJSON() {
  const data = {
    version: "0.8.0",
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
      if (data.version && data.events && Array.isArray(data.events)) {
        events.length = 0;
        events.push(...data.events.map(e => ({ html: e.html || '', eventId: e.eventId || 'imported' })));
        document.getElementById('events-tabs').innerHTML = '';
        events.forEach((_, i) => {
          const tab = document.createElement('button');
          tab.className = 'tab' + (i === 0 ? ' active' : '');
          tab.innerHTML = `Event ${i + 1} <span class="delete-tab">×</span>`;
          tab.onclick = ev => {
            if (!ev.target.classList.contains('delete-tab')) switchEvent(i);
          };
          tab.querySelector('.delete-tab').onclick = ev => {
            ev.stopPropagation();
            deleteCurrentEvent();
          };
          document.getElementById('events-tabs').appendChild(tab);
        });
        const addBtn = document.createElement('button');
        addBtn.className = 'tab add';
        addBtn.textContent = '+ Add Event';
        addBtn.onclick = addEvent;
        document.getElementById('events-tabs').appendChild(addBtn);
        switchEvent(0);
        alert('Импорт завершён!');
      } else {
        alert('Неверный формат файла');
      }
    } catch (err) {
      alert('Ошибка импорта: ' + err.message);
    }
  };
  reader.readAsText(file);
});

function clearAll() {
  if (confirm('Очистить всё?')) {
    document.getElementById('root-children').innerHTML = '';
    updateAll();
  }
}

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

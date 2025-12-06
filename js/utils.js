// utils.js — темы, язык, импорт/экспорт, утилиты

function setTheme(theme) {
  if (theme === 'auto') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    theme = prefersDark ? 'dark' : 'light';
  }
  document.body.dataset.theme = theme;
  localStorage.setItem('theme', theme);
}

function setLang(lang) {
  localStorage.setItem('lang', lang);
  document.getElementById('lang-btn').textContent = lang === 'ru' ? '[RU] Русский' : '[EN] English';
  document.getElementById('root-label').textContent = lang === 'ru' ? 'Корневое событие' : 'Root Event';
  // простая локализация Success/Failure
  document.querySelectorAll('.success-label').forEach(el => el.textContent = lang === 'ru' ? 'Успех' : 'Success');
  document.querySelectorAll('.failure-label').forEach(el => el.textContent = lang === 'ru' ? 'Провал' : 'Failure');
}

function exportJSON() {
  const data = {
    version: "5.3",
    eventId: document.getElementById('event-id').value,
    treeHTML: document.getElementById('root-children').innerHTML
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${data.eventId || 'event'}.json`;
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
      document.getElementById('event-id').value = data.eventId || 'imported';
      document.getElementById('root-children').innerHTML = data.treeHTML || '';
      updateAll();
    } catch (err) {
      alert('Ошибка импорта: неверный JSON');
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

function autoBalance() {
  alert('Auto Balance — в разработке!\nСкоро будет равномерное и весовое распределение шансов.');
}

// Глобальные функции
window.setTheme = setTheme;
window.setLang = setLang;
window.exportJSON = exportJSON;
window.importFile = importFile;
window.clearAll = clearAll;
window.loadExample = loadExample;
window.autoBalance = autoBalance;

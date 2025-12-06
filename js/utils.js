// utils.js — темы, язык, импорт/экспорт

function setTheme(t) {
  document.body.dataset.theme = t;
  localStorage.setItem('theme', t);
}

function setLang(l) {
  localStorage.setItem('lang', l);
  document.getElementById('root-label').textContent = l === 'ru' ? 'Корневое событие' : 'Root Event';
  document.querySelectorAll('.success-label').forEach(e => e.textContent = l === 'ru' ? 'Успех' : 'Success');
  document.querySelectorAll('.failure-label').forEach(e => e.textContent = l === 'ru' ? 'Провал' : 'Failure');
}

function exportJSON() {
  const data = {
    version: "5.6",
    eventId: document.getElementById('event-id').value,
    treeHTML: document.getElementById('root-children').innerHTML
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
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
      const d = JSON.parse(ev.target.result);
      document.getElementById('event-id').value = d.eventId || 'imported';
      document.getElementById('root-children').innerHTML = d.treeHTML || '';
      updateAll();
    } catch { alert('Ошибка импорта'); }
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
    first.querySelector('.chance').value = 0.6;
    addRNG(first.dataset.id + '-s');
    addSpawn(first.dataset.id + '-s.0-s');
    updateAll();
  }, 100);
}

window.setTheme = setTheme;
window.setLang = setLang;
window.exportJSON = exportJSON;
window.importFile = importFile;
window.clearAll = clearAll;
window.loadExample = loadExample;

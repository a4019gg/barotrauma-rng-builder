// js/main.js — v0.9.120 — ДУБЛИ ИМЁН ИВЕНТОВ ИСПРАВЛЕНЫ

const MAIN_VERSION = "v0.9.120";
window.MAIN_VERSION = MAIN_VERSION;

let currentEvent = 0;
const events = [];

// === ПЕРЕКЛЮЧЕНИЕ ===
function switchEvent(index) {
  if (index < 0 || index >= events.length) return;

  events[currentEvent] = {
    html: document.getElementById('root-children').innerHTML,
    eventId: document.getElementById('event-id').value.trim() || `event_${currentEvent + 1}`
  };

  currentEvent = index;

  document.getElementById('root-children').innerHTML = events[index].html || '';
  document.getElementById('event-id').value = events[index].eventId;

  document.querySelectorAll('.event-tab').forEach((t, i) => t.classList.toggle('active', i === index));

  updateAll();
}

// === УДАЛЕНИЕ + ПЕРЕИМЕНОВАНИЕ ОСТАЛЬНЫХ ===
function deleteEvent(index, e) {
  e.stopPropagation();
  if (events.length <= 1) {
    alert(L.lastEventWarning || 'Нельзя удалить последний ивент!');
    return;
  }
  if (!confirm(L.deleteEventConfirm || 'Удалить ивент?')) return;

  events.splice(index, 1);
  document.querySelectorAll('.event-tab')[index].remove();

  // Переименовываем оставшиеся табы
  document.querySelectorAll('.event-tab').forEach((tab, i) => {
    const nameSpan = tab.querySelector('.tab-name');
    if (nameSpan) nameSpan.textContent = events[i]?.eventId || `event_${i + 1}`;
  });

  if (currentEvent >= events.length) currentEvent = events.length - 1;
  switchEvent(currentEvent);
}

// === ДОБАВЛЕНИЕ ===
function addEvent() {
  const index = events.length;
  const newName = `event_${index + 1}`;
  events.push({ html: '', eventId: newName });

  const tab = document.createElement('div');
  tab.className = 'event-tab';
  tab.innerHTML = `<span class="tab-name">${newName}</span><span class="delete-tab">×</span>`;
  tab.onclick = () => switchEvent(index);
  tab.querySelector('.delete-tab').onclick = e => deleteEvent(index, e);

  document.getElementById('events-list').appendChild(tab);
  switchEvent(index);
}

// === ОБНОВЛЕНИЕ ИМЕНИ ===
function updateActiveTabName() {
  const value = document.getElementById('event-id').value.trim() || `event_${currentEvent + 1}`;
  events[currentEvent].eventId = value;
  const nameSpan = document.querySelector('.event-tab.active .tab-name');
  if (nameSpan) nameSpan.textContent = value;
}

// === ПЕРЕКЛЮЧЕНИЕ ВИДА ===
function toggleView() {
  const tree = document.getElementById('tree-container');
  const classic = document.getElementById('classic-view');
  const isTree = tree.style.display === 'block';

  tree.style.display = isTree ? 'none' : 'block';
  classic.style.display = isTree ? 'block' : 'none';

  document.getElementById('view-btn').textContent = isTree ? 'Tree View' : 'Classic';

  if (!isTree) renderTree();
}

// === ИМПОРТ/ЭКСПОРТ ===
function importFile() { document.getElementById('file-input').click(); }

function exportJSON() {
  const data = { version: "0.9.120", events };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'rng-builder.json'; a.click();
  URL.revokeObjectURL(url);
}

// === ОЧИСТКА + ПРИМЕР ===
function clearAll() {
  if (confirm(L.clearAllConfirm || 'Очистить всё?')) {
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
      addSpawn(first.dataset.id + '-s');
      updateAll();
    }
  }, 100);
}

// === СТАРТ ===
document.addEventListener('DOMContentLoaded', () => {
  populateDatalist();
  addEvent();
  switchEvent(0);
  showScriptVersions();
});

window.importFile = importFile;
window.exportJSON = exportJSON;
window.clearAll = clearAll;
window.loadExample = loadExample;
window.toggleView = toggleView;
window.updateActiveTabName = updateActiveTabName;

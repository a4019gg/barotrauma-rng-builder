// js/main.js — v0.9.120 — ДУБЛИ ИМЁН ИВЕНТОВ ИСПРАВЛЕНЫ НАВСЕГДА

const MAIN_VERSION = "v0.9.120";
window.MAIN_VERSION = MAIN_VERSION;

let currentEvent = 0;
const events = [];

// === ПЕРЕКЛЮЧЕНИЕ ИВЕНТА ===
function switchEvent(index) {
  if (index < 0 || index >= events.length) return;

  // Сохраняем текущий
  events[currentEvent] = {
    html: document.getElementById('root-children').innerHTML,
    eventId: document.getElementById('event-id').value.trim() || `event_${currentEvent + 1}`
  };

  currentEvent = index;

  // Восстанавливаем
  document.getElementById('root-children').innerHTML = events[index].html || '';
  document.getElementById('event-id').value = events[index].eventId || `event_${index + 1}`;

  // Подсвечиваем активный таб
  document.querySelectorAll('.event-tab').forEach((tab, i) => {
    tab.classList.toggle('active', i === index);
  });

  updateAll();
}

// === УДАЛЕНИЕ ИВЕНТА + ПЕРЕИМЕНОВАНИЕ ОСТАЛЬНЫХ ===
function deleteEvent(index, e) {
  e.stopPropagation();

  if (events.length <= 1) {
    alert(L.lastEventWarning || 'Нельзя удалить последний ивент!');
    return;
  }

  if (!confirm(L.deleteEventConfirm || 'Удалить ивент?')) return;

  // Удаляем
  events.splice(index, 1);
  document.querySelectorAll('.event-tab')[index].remove();

  // Переименовываем все оставшиеся табы
  document.querySelectorAll('.event-tab').forEach((tab, i) => {
    const nameSpan = tab.querySelector('.tab-name');
    if (nameSpan) {
      const newName = events[i]?.eventId || `event_${i + 1}`;
      nameSpan.textContent = newName;
    }
  });

  if (currentEvent >= events.length) currentEvent = events.length - 1;
  switchEvent(currentEvent);
}

// === ДОБАВЛЕНИЕ НОВОГО ИВЕНТА ===
function addEvent() {
  const index = events.length;
  const newName = `event_${index + 1}`;

  events.push({ html: '', eventId: newName });

  const tab = document.createElement('div');
  tab.className = 'event-tab';
  tab.innerHTML = `<span class="tab-name">${newName}</span><span class="delete-tab">×</span>`;
  tab.onclick = () => switchEvent(index);
  tab.querySelector('.delete-tab').onclick = (e) => deleteEvent(index, e);

  document.getElementById('events-list').appendChild(tab);
  switchEvent(index);
}

// === ОБНОВЛЕНИЕ ИМЕНИ АКТИВНОГО ТАБА ===
function updateActiveTabName() {
  const input = document.getElementById('event-id');
  if (!input) return;

  const value = input.value.trim() || `event_${currentEvent + 1}`;
  events[currentEvent].eventId = value;

  const activeTabName = document.querySelector('.event-tab.active .tab-name');
  if (activeTabName) activeTabName.textContent = value;
}

// === ПЕРЕКЛЮЧЕНИЕ ВИДА (Classic / Tree) ===
function toggleView() {
  const tree = document.getElementById('tree-container');
  const classic = document.getElementById('classic-view');
  const isTree = tree.style.display === 'block';

  tree.style.display = isTree ? 'none' : 'block';
  classic.style.display = isTree ? 'block' : 'none';

  document.getElementById('view-btn').textContent = isTree ? 'Tree View' : 'Classic';

  if (!isTree) renderTree();
}

// === ИМПОРТ / ЭКСПОРТ ===
function importFile() {
  document.getElementById('file-input').click();
}

function exportJSON() {
  const data = {
    version: "0.9.120",
    events: events.map(e => ({ eventId: e.eventId, html: e.html }))
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'rng-builder-events.json';
  a.click();
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
  addEvent();           // создаём первый ивент
  switchEvent(0);
  showScriptVersions();
});

// Экспорт функций
window.importFile = importFile;
window.exportJSON = exportJSON;
window.clearAll = clearAll;
window.loadExample = loadExample;
window.toggleView = toggleView;
window.updateActiveTabName = updateActiveTabName;

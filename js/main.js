// js/main.js — v0.9.111 — ПОЛНЫЙ И ФИНАЛЬНЫЙ

const MAIN_VERSION = "v0.9.111";
window.MAIN_VERSION = MAIN_VERSION;

let currentEvent = 0;
const events = [];

// === ПЕРЕКЛЮЧЕНИЕ СОБЫТИЯ ===
function switchEvent(index) {
  if (index < 0 || index >= events.length) return;

  events[currentEvent] = {
    html: document.getElementById('root-children').innerHTML,
    eventId: document.getElementById('event-id')?.value.trim() || `event_${currentEvent + 1}`
  };

  currentEvent = index;

  document.getElementById('root-children').innerHTML = events[index].html || '';
  const eventIdInput = document.getElementById('event-id');
  if (eventIdInput) eventIdInput.value = events[index].eventId;

  document.querySelectorAll('.event-tab').forEach((tab, i) => {
    tab.classList.toggle('active', i === index);
  });

  updateAll();
}

// === УДАЛЕНИЕ СОБЫТИЯ ===
function deleteEvent(index, e) {
  e.stopPropagation();
  if (events.length <= 1) {
    alert(L.lastEventWarning || 'Нельзя удалить последнее событие!');
    return;
  }
  if (confirm(L.deleteEventConfirm || 'Удалить событие?')) {
    events.splice(index, 1);
    document.querySelectorAll('.event-tab')[index].remove();
    if (currentEvent >= events.length) currentEvent = events.length - 1;
    switchEvent(currentEvent);
  }
}

// === ДОБАВЛЕНИЕ СОБЫТИЯ ===
function addEvent() {
  const index = events.length;
  const newId = `event_${index + 1}`;
  events.push({ html: '', eventId: newId });

  const tab = document.createElement('div');
  tab.className = 'event-tab';
  tab.innerHTML = `<span class="tab-name">${newId}</span><span class="delete-tab">×</span>`;
  tab.onclick = () => switchEvent(index);
  tab.querySelector('.delete-tab').onclick = (e) => deleteEvent(index, e);

  document.getElementById('events-list').appendChild(tab);
  switchEvent(index);
}

// === ОБНОВЛЕНИЕ ИМЕНИ ===
function updateActiveTabName() {
  const input = document.getElementById('event-id');
  if (!input) return;
  const value = input.value.trim() || `event_${currentEvent + 1}`;
  events[currentEvent].eventId = value;
  const activeTab = document.querySelector('.event-tab.active .tab-name');
  if (activeTab) activeTab.textContent = value;
}

// === ПЕРЕКЛЮЧЕНИЕ ВИДА ===
function toggleView() {
  const tree = document.getElementById('tree-container');
  const classic = document.getElementById('classic-view');

  const isTree = tree.style.display !== 'block';

  tree.style.display = isTree ? 'block' : 'none';
  classic.style.display = isTree ? 'none' : 'block';

  tree.style.zIndex = isTree ? 10 : 5;
  classic.style.zIndex = isTree ? 5 : 10;

  document.getElementById('view-btn').textContent = isTree ? 'Classic' : 'Tree View';

  if (isTree) renderTree();
}

// === ИМПОРТ / ЭКСПОРТ ===
function importFile() {
  document.getElementById('file-input').click();
}

function exportJSON() {
  const data = {
    version: "0.9.111",
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

// === ОЧИСТКА И ПРИМЕР ===
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
      addSpawn(first.dataset.id + '-s.0-s');
      updateAll();
    }
  }, 100);
}

// === ЗАПУСК ===
document.addEventListener('DOMContentLoaded', () => {
  populateDatalist();
  setTheme(localStorage.getItem('theme') || 'dark');
  setLang(localStorage.getItem('lang') || 'en');

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

// js/main.js — v0.9.300 — МОДЕЛЬ ДАННЫХ, РЕНДЕРЕР, UNDO/REDO НА МОДЕЛИ

const MAIN_VERSION = "v0.9.300";
window.MAIN_VERSION = MAIN_VERSION;

let currentEventIndex = 0;
let events = [{ model: [] }]; // массив событий, каждое — { model: nodeModel[] }
let undoStack = [];
let redoStack = [];
const maxHistory = 50;

// Сохранение состояния
function saveState() {
  const state = JSON.stringify({
    events: events.map(e => ({ model: JSON.parse(JSON.stringify(e.model)) })), // глубокая копия
    currentEventIndex
  });

  undoStack.push(state);
  if (undoStack.length > maxHistory) undoStack.shift();
  redoStack = [];
}

// Undo
function undo() {
  if (undoStack.length === 0) return;
  redoStack.push(JSON.stringify({ events, currentEventIndex }));
  const prev = JSON.parse(undoStack.pop());
  events = prev.events;
  currentEventIndex = prev.currentEventIndex;
  renderCurrentEvent();
  rebuildTabs();
}

// Redo
function redo() {
  if (redoStack.length === 0) return;
  undoStack.push(JSON.stringify({ events, currentEventIndex }));
  const next = JSON.parse(redoStack.pop());
  events = next.events;
  currentEventIndex = next.currentEventIndex;
  renderCurrentEvent();
  rebuildTabs();
}

// Рендер текущего события
function renderCurrentEvent() {
  const container = document.getElementById('root-children');
  container.innerHTML = '';
  renderModelToDOM(events[currentEventIndex].model, container);
  updateAll();
}

// === РЕНДЕРЕР МОДЕЛИ В DOM ===
function renderModelToDOM(model, container) {
  model.forEach(nodeData => {
    const node = nodeFactory.createFromModel(nodeData);
    container.appendChild(node);
  });
}

// === ПЕРЕКЛЮЧЕНИЕ ===
function switchToEvent(index) {
  if (index < 0 || index >= events.length) return;

  saveState(); // сохраняем перед переключением

  currentEventIndex = index;
  renderCurrentEvent();
  rebuildTabs();
}

// === ДОБАВЛЕНИЕ/УДАЛЕНИЕ ИВЕНТА ===
function addEvent() {
  saveState();
  events.push({ model: [] });
  switchToEvent(events.length - 1);
}

function deleteEvent(index) {
  if (events.length <= 1) {
    alert(loc('lastEventWarning', 'Нельзя удалить последний ивент!'));
    return;
  }
  if (!confirm(loc('deleteEventConfirm', 'Удалить ивент?'))) return;

  saveState();
  events.splice(index, 1);
  if (currentEventIndex >= events.length) currentEventIndex = events.length - 1;
  switchToEvent(currentEventIndex);
}

// === ТАБЫ ===
function rebuildTabs() {
  const list = document.getElementById('events-list');
  list.innerHTML = '';

  events.forEach((ev, i) => {
    const tab = document.createElement('div');
    tab.className = 'event-tab' + (i === currentEventIndex ? ' active' : '');

    const name = document.createElement('span');
    name.className = 'tab-name';
    name.textContent = `event_${i + 1}`;

    const del = document.createElement('span');
    del.className = 'delete-tab';
    del.textContent = '×';
    del.onclick = e => {
      e.stopPropagation();
      deleteEvent(i);
    };

    tab.appendChild(name);
    tab.appendChild(del);
    tab.onclick = () => switchToEvent(i);

    list.appendChild(tab);
  });
}

// === ЭКСПОРТ/ИМПОРТ ===
function exportJSON() {
  saveState();
  const data = { version: "v0.9.300", events: events.map(e => ({ model: e.model })) };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'rng-builder-v0.9.300.json';
  a.click();
  URL.revokeObjectURL(url);
}

function importFile() {
  document.getElementById('file-input').onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.events) {
          events = data.events.map(e => ({ model: e.model || [] }));
          currentEventIndex = 0;
          renderCurrentEvent();
          rebuildTabs();
          alert('Импорт завершён');
        }
      } catch (err) {
        alert('Ошибка импорта');
      }
    };
    reader.readAsText(file);
  };
  document.getElementById('file-input').click();
}

// === СТАРТ ===
document.addEventListener('DOMContentLoaded', () => {
  renderCurrentEvent();
  rebuildTabs();
  showScriptVersions();
});

// Глобальные
window.addEvent = addEvent;
window.clearAll = () => {
  saveState();
  events[currentEventIndex].model = [];
  renderCurrentEvent();
};
window.autoBalance = () => {
  // пока заглушка — будет работать с моделью
  alert('Автобаланс — в разработке (v0.9.300)');
};
window.updateActiveTabName = () => {}; // пока не нужно — ID фиксированные
window.importFile = importFile;
window.exportJSON = exportJSON;
window.saveState = saveState;

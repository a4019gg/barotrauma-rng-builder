// js/main.js — v0.9.200 — ЭКСПОРТ/ИМПОРТ РАБОТАЕТ, ДУБЛИ ИМЁН — НЕТ, HOTKEYS

const MAIN_VERSION = "v0.9.200";
window.MAIN_VERSION = MAIN_VERSION;

let currentEvent = 0;
const events = [];
let undoStack = [];
let redoStack = [];

// Сохраняем состояние для undo
function saveState() {
  undoStack.push(JSON.stringify(events));
  redoStack = [];
}

// === ПЕРЕКЛЮЧЕНИЕ ===
function switchEvent(index) {
  if (index < 0 || index >= events.length) return;

  events[currentEvent] = {
    html: document.getElementById('root-children').innerHTML,
    eventId: document.getElementById('event-id').value.trim() || `event_${currentEvent + 1}`
  };

  currentEvent = index;

  document.getElementById('root-children').innerHTML = events[index].html || '';
  document.getElementById('event-id').value = events[index].eventId || `event_${index + 1}`;

  document.querySelectorAll('.event-tab').forEach((tab, i) => tab.classList.toggle('active', i === index));

  updateAll();
}

// === УДАЛЕНИЕ + ПЕРЕИМЕНОВАНИЕ ===
function deleteEvent(index, e) {
  e.stopPropagation();
  if (events.length <= 1) {
    alert(L.lastEventWarning || 'Нельзя удалить последний ивент!');
    return;
  }
  if (!confirm(L.deleteEventConfirm || 'Удалить ивент?')) return;

  saveState();
  events.splice(index, 1);
  document.querySelectorAll('.event-tab')[index].remove();

  // Переименовываем табы
  document.querySelectorAll('.event-tab').forEach((tab, i) => {
    const nameSpan = tab.querySelector('.tab-name');
    if (nameSpan) nameSpan.textContent = events[i]?.eventId || `event_${i + 1}`;
  });

  if (currentEvent >= events.length) currentEvent = events.length - 1;
  switchEvent(currentEvent);
}

// === ДОБАВЛЕНИЕ ===
function addEvent() {
  saveState();
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

// === HOTKEYS ===
document.addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey) {
    if (e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      undo();
    } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
      e.preventDefault();
      redo();
    } else if (e.key === 'd') {
      e.preventDefault();
      duplicateSelectedNode();
    }
  } else if (e.key === 'Delete') {
    deleteSelectedNode();
  }
});

// Undo / Redo
function undo() {
  if (undoStack.length === 0) return;
  redoStack.push(JSON.stringify(events));
  events = JSON.parse(undoStack.pop());
  switchEvent(currentEvent);
}

function redo() {
  if (redoStack.length === 0) return;
  undoStack.push(JSON.stringify(events));
  events = JSON.parse(redoStack.pop());
  switchEvent(currentEvent);
}

// === ЭКСПОРТ/ИМПОРТ ===
function exportJSON() {
  saveState();
  events[currentEvent] = {
    html: document.getElementById('root-children').innerHTML,
    eventId: document.getElementById('event-id').value.trim() || `event_${currentEvent + 1}`
  };

  const data = { version: "0.9.200", events };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'rng-builder.json';
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
        if (data.version && data.events) {
          events.length = 0;
          events.push(...data.events);
          document.getElementById('events-list').innerHTML = '';
          events.forEach((ev, i) => {
            const tab = document.createElement('div');
            tab.className = 'event-tab';
            tab.innerHTML = `<span class="tab-name">${ev.eventId}</span><span class="delete-tab">×</span>`;
            tab.onclick = () => switchEvent(i);
            tab.querySelector('.delete-tab').onclick = ee => deleteEvent(i, ee);
            document.getElementById('events-list').appendChild(tab);
          });
          switchEvent(0);
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

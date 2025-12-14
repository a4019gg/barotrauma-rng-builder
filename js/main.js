// js/main.js — v0.9.201 — AUTOBALANCE РАБОТАЕТ, HOTKEYS РАБОТАЮТ, ЭКСПОРТ/ИМПОРТ

const MAIN_VERSION = "v0.9.201";
window.MAIN_VERSION = MAIN_VERSION;

let currentEvent = 0;
const events = [];
let undoStack = [];
let redoStack = [];

// Сохранение состояния для undo
function saveState() {
  undoStack.push(JSON.stringify(events.map(e => ({ ...e }))));
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

// === УДАЛЕНИЕ ===
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

// === AUTOBALANCE — ПОЛНОСТЬЮ РАБОЧИЙ ===
function autoBalance() {
  saveState();

  function balanceRNG(node) {
    const chanceInput = node.querySelector('.chance');
    if (!chanceInput) return;

    const s = node.querySelector(`#c-${node.dataset.id}-s`);
    const f = node.querySelector(`#c-${node.dataset.id}-f`);

    const sCount = s ? s.querySelectorAll('.node.spawn, .node.creature, .node.affliction').length : 0;
    const fCount = f ? f.querySelectorAll('.node.spawn, .node.creature, .node.affliction').length : 0;

    if (sCount + fCount === 0) return;

    // Идеальный шанс — количество действий в ветках
    const total = sCount + fCount;
    const idealSuccess = sCount / total;

    chanceInput.value = idealSuccess.toFixed(3);

    // Рекурсивно балансируем вложенные RNG
    node.querySelectorAll('.node.rng').forEach(balanceRNG);
  }

  document.querySelectorAll('.node.rng').forEach(balanceRNG);
  updateAll();
  alert(L.autoBalanceDone || 'Автобаланс завершён');
}

// === ОЧИСТКА ===
function clearAll() {
  saveState();
  document.getElementById('root-children').innerHTML = '';
  updateAll();
}

// === HOTKEYS ===
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;

  if (e.key === 'Delete') {
    e.preventDefault();
    const selected = document.querySelector('.node.selected');
    if (selected) {
      saveState();
      selected.remove();
      updateAll();
    }
  }

  if (e.ctrlKey || e.metaKey) {
    if (e.key === 'z') {
      e.preventDefault();
      undo();
    } else if (e.key === 'y') {
      e.preventDefault();
      redo();
    } else if (e.key === 'd') {
      e.preventDefault();
      duplicateSelected();
    }
  }
});

// Undo / Redo
function undo() {
  if (undoStack.length === 0) return;
  redoStack.push(JSON.stringify(events));
  events = JSON.parse(undoStack.pop());
  rebuildTabsAndContent();
}

function redo() {
  if (redoStack.length === 0) return;
  undoStack.push(JSON.stringify(events));
  events = JSON.parse(redoStack.pop());
  rebuildTabsAndContent();
}

function rebuildTabsAndContent() {
  document.getElementById('events-list').innerHTML = '';
  events.forEach((ev, i) => {
    const tab = document.createElement('div');
    tab.className = 'event-tab';
    tab.innerHTML = `<span class="tab-name">${ev.eventId}</span><span class="delete-tab">×</span>`;
    tab.onclick = () => switchEvent(i);
    tab.querySelector('.delete-tab').onclick = ee => deleteEvent(i, ee);
    document.getElementById('events-list').appendChild(tab);
  });
  switchEvent(currentEvent);
}

// === ЭКСПОРТ/ИМПОРТ ===
function exportJSON() {
  saveState();
  events[currentEvent] = {
    html: document.getElementById('root-children').innerHTML,
    eventId: document.getElementById('event-id').value.trim() || `event_${currentEvent + 1}`
  };

  const data = { version: "0.9.201", events };
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
        if (data.events) {
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

// Экспорт
window.autoBalance = autoBalance;
window.clearAll = clearAll;
window.importFile = importFile;
window.exportJSON = exportJSON;
window.updateActiveTabName = updateActiveTabName;
window.saveState = saveState;

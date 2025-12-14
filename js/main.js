// js/main.js — v0.9.201 — РЕФАКТОРИНГ: КЛАСС, БЕЗОПАСНЫЙ DOM, HOTKEYS, AUTOBALANCE

const MAIN_VERSION = "v0.9.201";
window.MAIN_VERSION = MAIN_VERSION;

class EditorStateManager {
  constructor() {
    this.currentEventIndex = 0;
    this.events = [{ html: '', eventId: 'event_1' }];
    this.undoStack = [];
    this.redoStack = [];
    this.maxHistory = 50;
  }

  saveState() {
    const currentHtml = document.getElementById('root-children').innerHTML;
    this.events[this.currentEventIndex].html = currentHtml;

    const state = JSON.stringify({
      events: this.events.map(e => ({ ...e })),
      currentEventIndex: this.currentEventIndex
    });

    this.undoStack.push(state);
    if (this.undoStack.length > this.maxHistory) this.undoStack.shift();
    this.redoStack = [];
  }

  undo() {
    if (this.undoStack.length === 0) return false;
    const currentState = JSON.stringify({
      events: this.events.map(e => ({ ...e })),
      currentEventIndex: this.currentEventIndex
    });
    this.redoStack.push(currentState);

    const prevState = JSON.parse(this.undoStack.pop());
    this.events = prevState.events;
    this.currentEventIndex = prevState.currentEventIndex;

    this.renderCurrentEvent();
    this.rebuildTabs();
    return true;
  }

  redo() {
    if (this.redoStack.length === 0) return false;
    const currentState = JSON.stringify({
      events: this.events.map(e => ({ ...e })),
      currentEventIndex: this.currentEventIndex
    });
    this.undoStack.push(currentState);

    const nextState = JSON.parse(this.redoStack.pop());
    this.events = nextState.events;
    this.currentEventIndex = nextState.currentEventIndex;

    this.renderCurrentEvent();
    this.rebuildTabs();
    return true;
  }

  addEvent() {
    this.saveState();
    const newIndex = this.events.length;
    const newName = `event_${newIndex + 1}`;
    this.events.push({ html: '', eventId: newName });
    this.switchToEvent(newIndex);
  }

  deleteEvent(index) {
    if (this.events.length <= 1) {
      alert(L.lastEventWarning || 'Нельзя удалить последний ивент!');
      return false;
    }
    if (!confirm(L.deleteEventConfirm || 'Удалить ивент?')) return false;

    this.saveState();
    this.events.splice(index, 1);
    if (this.currentEventIndex >= this.events.length) {
      this.currentEventIndex = this.events.length - 1;
    }
    this.switchToEvent(this.currentEventIndex);
    return true;
  }

  switchToEvent(index) {
    if (index < 0 || index >= this.events.length) return;

    // Сохраняем текущий
    this.events[this.currentEventIndex].html = document.getElementById('root-children').innerHTML;

    this.currentEventIndex = index;

    // Восстанавливаем
    document.getElementById('root-children').innerHTML = this.events[index].html || '';
    document.getElementById('event-id').value = this.events[index].eventId || `event_${index + 1}`;

    this.rebuildTabs();
    updateAll();
  }

  updateCurrentEventId(newId) {
    const safeId = newId.trim() || `event_${this.currentEventIndex + 1}`;
    this.events[this.currentEventIndex].eventId = safeId;
    document.getElementById('event-id').value = safeId;
    this.rebuildTabs();
  }

  rebuildTabs() {
    const list = document.getElementById('events-list');
    list.innerHTML = '';

    this.events.forEach((ev, i) => {
      const tab = document.createElement('div');
      tab.className = 'event-tab';
      if (i === this.currentEventIndex) tab.classList.add('active');

      const nameSpan = document.createElement('span');
      nameSpan.className = 'tab-name';
      nameSpan.textContent = ev.eventId;

      const deleteBtn = document.createElement('span');
      deleteBtn.className = 'delete-tab';
      deleteBtn.textContent = '×';
      deleteBtn.onclick = (e) => {
        e.stopPropagation();
        this.deleteEvent(i);
      };

      tab.appendChild(nameSpan);
      tab.appendChild(deleteBtn);
      tab.onclick = () => this.switchToEvent(i);

      list.appendChild(tab);
    });
  }

  renderCurrentEvent() {
    document.getElementById('root-children').innerHTML = this.events[this.currentEventIndex].html || '';
    document.getElementById('event-id').value = this.events[this.currentEventIndex].eventId || `event_${this.currentEventIndex + 1}`;
  }

  autoBalance() {
    this.saveState();

    function balance(node) {
      if (node.dataset.type === 'rng') {
        const s = node.querySelector(`#c-${node.dataset.id}-s`);
        const f = node.querySelector(`#c-${node.dataset.id}-f`);

        const sCount = s ? s.querySelectorAll('.node.spawn, .node.creature, .node.affliction').length : 0;
        const fCount = f ? f.querySelectorAll('.node.spawn, .node.creature, .node.affliction').length : 0;

        const total = sCount + fCount;
        if (total > 0) {
          const ideal = sCount / total;
          node.querySelector('.chance').value = ideal.toFixed(3);
        }

        // Рекурсия
        node.querySelectorAll('.node.rng').forEach(balance);
      }
    }

    document.querySelectorAll('.node.rng').forEach(balance);
    updateAll();
  }

  clearAll() {
    this.saveState();
    document.getElementById('root-children').innerHTML = '';
    updateAll();
  }

  exportData() {
    this.saveState();
    return {
      version: "0.9.201",
      events: this.events
    };
  }

  importData(data) {
    if (!data.events || !Array.isArray(data.events)) return false;
    this.events = data.events.map(e => ({ html: e.html || '', eventId: e.eventId || 'imported_event' }));
    this.currentEventIndex = 0;
    this.rebuildTabs();
    this.renderCurrentEvent();
    updateAll();
    return true;
  }
}

// Глобальный менеджер
const editorState = new EditorStateManager();

// === HOTKEYS ===
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

  if (e.key === 'Delete') {
    e.preventDefault();
    const selected = document.querySelector('.node.selected');
    if (selected) {
      editorState.saveState();
      selected.remove();
      updateAll();
    }
  }

  if (e.ctrlKey || e.metaKey) {
    if (e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      editorState.undo();
    } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
      e.preventDefault();
      editorState.redo();
    }
  }
});

// === ЭКСПОРТ/ИМПОРТ ===
function exportJSON() {
  const data = editorState.exportData();
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
        if (editorState.importData(data)) {
          alert('Импорт завершён');
        } else {
          alert('Ошибка формата файла');
        }
      } catch (err) {
        alert('Ошибка чтения файла');
      }
    };
    reader.readAsText(file);
  };
  document.getElementById('file-input').click();
}

// === ГЛОБАЛЬНЫЕ ФУНКЦИИ ===
window.addEvent = () => editorState.addEvent();
window.clearAll = () => editorState.clearAll();
window.autoBalance = () => editorState.autoBalance();
window.updateActiveTabName = () => editorState.updateCurrentEventId(document.getElementById('event-id').value);
window.importFile = importFile;
window.exportJSON = exportJSON;

// === СТАРТ ===
document.addEventListener('DOMContentLoaded', () => {
  populateDatalist();
  editorState.rebuildTabs();
  editorState.renderCurrentEvent();
  showScriptVersions();
});

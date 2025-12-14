// js/main.js — v0.9.300 — КЛАСС EditorState, МОДЕЛЬ ДАННЫХ, FIND/REMOVE NODE

const MAIN_VERSION = "v0.9.300";
window.MAIN_VERSION = MAIN_VERSION;

class EditorState {
  constructor() {
    this.currentEventIndex = 0;
    this.events = [{ model: [] }];
    this.undoStack = [];
    this.redoStack = [];
    this.maxHistory = 50;
  }

  saveState() {
    const state = JSON.stringify({
      events: this.events.map(e => ({ model: this.deepCopy(e.model) })),
      currentEventIndex: this.currentEventIndex
    });

    this.undoStack.push(state);
    if (this.undoStack.length > this.maxHistory) this.undoStack.shift();
    this.redoStack = [];
  }

  deepCopy(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  undo() {
    if (this.undoStack.length === 0) return false;
    this.redoStack.push(JSON.stringify({
      events: this.events.map(e => ({ model: this.deepCopy(e.model) })),
      currentEventIndex: this.currentEventIndex
    }));

    const prev = JSON.parse(this.undoStack.pop());
    this.events = prev.events;
    this.currentEventIndex = prev.currentEventIndex;

    this.renderCurrentEvent();
    this.rebuildTabs();
    return true;
  }

  redo() {
    if (this.redoStack.length === 0) return false;
    this.undoStack.push(JSON.stringify({
      events: this.events.map(e => ({ model: this.deepCopy(e.model) })),
      currentEventIndex: this.currentEventIndex
    }));

    const next = JSON.parse(this.redoStack.pop());
    this.events = next.events;
    this.currentEventIndex = next.currentEventIndex;

    this.renderCurrentEvent();
    this.rebuildTabs();
    return true;
  }

  addEvent() {
    this.saveState();
    this.events.push({ model: [] });
    this.switchToEvent(this.events.length - 1);
  }

  deleteEvent(index) {
    if (this.events.length <= 1) {
      alert(loc('lastEventWarning', 'Нельзя удалить последний ивент!'));
      return false;
    }
    if (!confirm(loc('deleteEventConfirm', 'Удалить ивент?'))) return false;

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

    this.saveState();
    this.currentEventIndex = index;
    this.renderCurrentEvent();
    this.rebuildTabs();
  }

  renderCurrentEvent() {
    const container = document.getElementById('root-children');
    container.innerHTML = '';
    renderModelToDOM(this.events[this.currentEventIndex].model, container);
    updateAll();
  }

  rebuildTabs() {
    const list = document.getElementById('events-list');
    list.innerHTML = '';

    this.events.forEach((ev, i) => {
      const tab = document.createElement('div');
      tab.className = 'event-tab' + (i === this.currentEventIndex ? ' active' : '');

      const name = document.createElement('span');
      name.className = 'tab-name';
      name.textContent = `event_${i + 1}`;

      const del = document.createElement('span');
      del.className = 'delete-tab';
      del.textContent = '×';
      del.onclick = (e) => {
        e.stopPropagation();
        this.deleteEvent(i);
      };

      tab.appendChild(name);
      tab.appendChild(del);
      tab.onclick = () => this.switchToEvent(i);

      list.appendChild(tab);
    });
  }

  // Рекурсивный поиск узла по ID
  findNodeById(id, nodes = this.events[this.currentEventIndex].model) {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.type === 'rng' && node.children) {
        const found = this.findNodeById(id, node.children.success) || this.findNodeById(id, node.children.failure);
        if (found) return found;
      }
    }
    return null;
  }

  // Рекурсивное удаление узла по ID
  removeNodeById(id, nodes = this.events[this.currentEventIndex].model) {
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (node.id === id) {
        nodes.splice(i, 1);
        this.renderCurrentEvent();
        return true;
      }
      if (node.type === 'rng' && node.children) {
        if (this.removeNodeById(id, node.children.success) || this.removeNodeById(id, node.children.failure)) {
          this.renderCurrentEvent();
          return true;
        }
      }
    }
    return false;
  }

  autoBalance() {
    this.saveState();
    // Пока заглушка — будет работать с моделью
    alert('Автобаланс — в разработке (v0.9.300)');
  }

  clearAll() {
    this.saveState();
    this.events[this.currentEventIndex].model = [];
    this.renderCurrentEvent();
  }

  exportData() {
    this.saveState();
    return {
      version: "v0.9.300",
      events: this.events.map(e => ({ model: this.deepCopy(e.model) }))
    };
  }

  importData(data) {
    if (!data.events || !Array.isArray(data.events)) return false;
    this.events = data.events.map(e => ({ model: e.model || [] }));
    this.currentEventIndex = 0;
    this.renderCurrentEvent();
    this.rebuildTabs();
    updateAll();
    return true;
  }
}

// Глобальный экземпляр
window.editorState = new EditorState();

// Рендерер (вынесен из main.js для чистоты)
function renderModelToDOM(model, container) {
  model.forEach(nodeModel => {
    const nodeElement = nodeFactory.createFromModel(nodeModel);
    container.appendChild(nodeElement);
  });
}

// === HOTKEYS ===
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

  if (e.key === 'Delete') {
    e.preventDefault();
    const selected = document.querySelector('.node.selected');
    if (selected && selected.dataset.id) {
      window.editorState.removeNodeById(parseInt(selected.dataset.id));
    }
  }

  if (e.ctrlKey || e.metaKey) {
    if (e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      window.editorState.undo();
    } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
      e.preventDefault();
      window.editorState.redo();
    }
  }
});

// === ЭКСПОРТ/ИМПОРТ ===
function exportJSON() {
  const data = window.editorState.exportData();
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
        if (window.editorState.importData(data)) {
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
window.addEvent = () => window.editorState.addEvent();
window.clearAll = () => window.editorState.clearAll();
window.autoBalance = () => window.editorState.autoBalance();
window.importFile = importFile;
window.exportJSON = exportJSON;

// === СТАРТ ===
document.addEventListener('DOMContentLoaded', () => {
  populateDatalist();
  window.editorState.renderCurrentEvent();
  window.editorState.rebuildTabs();
  showScriptVersions();
});

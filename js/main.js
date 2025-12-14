// js/main.js — v0.9.300 — МОДЕЛЬ ДАННЫХ, АВТОБАЛАНС НА МОДЕЛИ, UI DELEGATION

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

  // АВТОБАЛАНС НА МОДЕЛИ
  autoBalance() {
    this.saveState();

    function balance(nodes) {
      nodes.forEach(node => {
        if (node.type === 'rng') {
          const successCount = node.children?.success ? node.children.success.filter(n => n.type !== 'rng').length : 0;
          const failureCount = node.children?.failure ? node.children.failure.filter(n => n.type !== 'rng').length : 0;
          const total = successCount + failureCount;

          if (total > 0) {
            node.params.chance = parseFloat((successCount / total).toFixed(3));
          }

          // Рекурсия по дочерним RNG
          if (node.children?.success) balance(node.children.success);
          if (node.children?.failure) balance(node.children.failure);
        }
      });
    }

    balance(this.events[this.currentEventIndex].model);
    this.renderCurrentEvent();
    alert(loc('autoBalanceDone', 'Автобаланс завершён'));
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

// Рендерер
function renderModelToDOM(model, container) {
  model.forEach(nodeModel => {
    const nodeElement = nodeFactory.createFromModel(nodeModel);
    container.appendChild(nodeElement);
  });
}

// === СТАРТ ===
document.addEventListener('DOMContentLoaded', () => {
  populateDatalist();
  window.editorState.renderCurrentEvent();
  window.editorState.rebuildTabs();
  showScriptVersions();
});

// Глобальные для совместимости (будут удалены в v1.0)
window.addEvent = () => window.editorState.addEvent();
window.clearAll = () => window.editorState.clearAll();
window.autoBalance = () => window.editorState.autoBalance();
window.importFile = importFile;
window.exportJSON = exportJSON;

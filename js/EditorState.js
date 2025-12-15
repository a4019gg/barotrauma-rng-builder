// js/EditorState.js — v0.9.403 — СОСТОЯНИЕ РЕДАКТОРА (ФИКС addNodeToBranch)

const MAIN_VERSION = "v0.9.403";
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
    this.currentEventIndex = this.events.length - 1;
    this.renderCurrentEvent();
    this.rebuildTabs();
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
    this.renderCurrentEvent();
    this.rebuildTabs();
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
    if (!container) return;
    container.innerHTML = '';
    const model = this.events[this.currentEventIndex].model || [];
    model.forEach(nodeModel => {
      if (nodeModel) {
        const nodeElement = nodeFactory.createFromModel(nodeModel);
        container.appendChild(nodeElement);
      }
    });
  }

  rebuildTabs() {
    const list = document.getElementById('events-list');
    if (!list) return;
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

  removeNodeById(id) {
    const removed = this._removeNodeRecursive(id, this.events[this.currentEventIndex].model);
    if (removed) {
      this.renderCurrentEvent();
    }
    return removed;
  }

  _removeNodeRecursive(id, nodes) {
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (node.id === id) {
        nodes.splice(i, 1);
        return true;
      }
      if (node.type === 'rng' && node.children) {
        if (this._removeNodeRecursive(id, node.children.success) || this._removeNodeRecursive(id, node.children.failure)) {
          return true;
        }
      }
    }
    return false;
  }

  addNodeToBranch(parentId, branch, type) {
    const parent = this.findNodeById(parentId);
    if (!parent || parent.type !== 'rng' || !parent.children || !parent.children[branch]) {
      console.warn('Cannot add to branch: invalid parent or branch', { parentId, branch, type });
      return false;
    }

    // ФИКС: правильный вызов методов экземпляра nodeFactory
    let newModel;
    switch (type) {
      case 'rng':
        newModel = nodeFactory.createModelRNG();
        break;
      case 'spawn':
        newModel = nodeFactory.createModelSpawn();
        break;
      case 'creature':
        newModel = nodeFactory.createModelCreature();
        break;
      case 'affliction':
        newModel = nodeFactory.createModelAffliction();
        break;
      default:
        console.warn('Unknown node type for branch:', type);
        return false;
    }

    parent.children[branch].push(newModel);
    this.renderCurrentEvent();
    return true;
  }

  autoBalance() {
    this.saveState();

    const balance = (nodes) => {
      nodes.forEach(node => {
        if (node.type === 'rng') {
          const successCount = node.children?.success ? node.children.success.filter(n => n.type !== 'rng').length : 0;
          const failureCount = node.children?.failure ? node.children.failure.filter(n => n.type !== 'rng').length : 0;
          const total = successCount + failureCount;

          if (total > 0) {
            node.params.chance = parseFloat((successCount / total).toFixed(3));
          }

          if (node.children?.success) balance(node.children.success);
          if (node.children?.failure) balance(node.children.failure);
        }
      });
    };

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
      version: "v0.9.403",
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

import { parseChanceInput } from '../ui/chance-utils.js';

export class EditorStore {
  constructor() {
    this.events = [{ id: 'event_1', model: [] }];
    this.currentEventIndex = 0;
    this.idCounter = 1;
    this.undoStack = [];
    this.redoStack = [];
    this.maxHistory = 50;
    this.listeners = new Set();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    for (const listener of this.listeners) listener(this.getState());
  }

  getState() {
    return {
      events: this.events,
      currentEventIndex: this.currentEventIndex,
      currentEvent: this.events[this.currentEventIndex]
    };
  }

  snapshot(label = '') {
    this.undoStack.push({
      label,
      events: structuredClone(this.events),
      currentEventIndex: this.currentEventIndex,
      idCounter: this.idCounter
    });

    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }

    this.redoStack.length = 0;
  }

  undo() {
    if (!this.undoStack.length) return false;
    const prev = this.undoStack.pop();
    this.redoStack.push({
      events: structuredClone(this.events),
      currentEventIndex: this.currentEventIndex,
      idCounter: this.idCounter
    });
    this.events = prev.events;
    this.currentEventIndex = prev.currentEventIndex;
    this.idCounter = prev.idCounter;
    this.notify();
    return true;
  }

  redo() {
    if (!this.redoStack.length) return false;
    const next = this.redoStack.pop();
    this.undoStack.push({
      events: structuredClone(this.events),
      currentEventIndex: this.currentEventIndex,
      idCounter: this.idCounter
    });
    this.events = next.events;
    this.currentEventIndex = next.currentEventIndex;
    this.idCounter = next.idCounter;
    this.notify();
    return true;
  }

  createNode(type) {
    const base = { id: this.idCounter++, type, params: {} };
    if (type === 'rng') {
      base.params = { chance: 0.5 };
      base.children = { success: [], failure: [] };
    } else if (type === 'spawn') {
      base.params = { item: '', amount: 1, quality: 0 };
    } else if (type === 'creature') {
      base.params = { creature: '', count: 1, spawnLocation: 'inside' };
    } else if (type === 'affliction') {
      base.params = { affliction: '', strength: 10 };
    }
    return base;
  }

  addEvent() {
    if (this.events.length >= 5) return false;
    this.snapshot('add-event');
    const nextId = `event_${this.events.length + 1}`;
    this.events.push({ id: nextId, model: [] });
    this.currentEventIndex = this.events.length - 1;
    this.notify();
    return true;
  }

  removeEvent(index) {
    if (!Number.isInteger(index) || index < 0 || index >= this.events.length) return false;
    if (this.events.length <= 1) return false;
    this.snapshot('remove-event');
    this.events.splice(index, 1);
    this.currentEventIndex = Math.max(0, Math.min(this.currentEventIndex, this.events.length - 1));
    this.notify();
    return true;
  }

  setCurrentEvent(index) {
    if (index < 0 || index >= this.events.length) return;
    this.currentEventIndex = index;
    this.notify();
  }


  updateEventId(index, eventId) {
    if (!Number.isInteger(index) || index < 0 || index >= this.events.length) return false;
    const safeId = String(eventId || '').trim() || `event_${index + 1}`;
    if (this.events[index].id === safeId) return false;
    this.snapshot('rename-event');
    this.events[index].id = safeId;
    this.notify();
    return true;
  }

  updateCurrentEventId(eventId) {
    const safeId = String(eventId || '').trim() || 'new_event';
    this.events[this.currentEventIndex].id = safeId;
    this.notify();
  }

  addRootNode(type) {
    this.snapshot('add-root');
    this.events[this.currentEventIndex].model.push(this.createNode(type));
    this.notify();
  }

  clearCurrentEvent() {
    this.snapshot('clear-event');
    this.events[this.currentEventIndex].model = [];
    this.notify();
  }

  findNodeById(id, nodes = this.events[this.currentEventIndex].model) {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.type === 'rng') {
        const inSuccess = this.findNodeById(id, node.children.success);
        if (inSuccess) return inSuccess;
        const inFailure = this.findNodeById(id, node.children.failure);
        if (inFailure) return inFailure;
      }
    }
    return null;
  }

  removeNodeById(id, nodes = this.events[this.currentEventIndex].model) {
    for (let i = 0; i < nodes.length; i += 1) {
      const node = nodes[i];
      if (node.id === id) {
        nodes.splice(i, 1);
        return true;
      }
      if (node.type === 'rng') {
        if (this.removeNodeById(id, node.children.success)) return true;
        if (this.removeNodeById(id, node.children.failure)) return true;
      }
    }
    return false;
  }

  removeNode(id) {
    this.snapshot('remove-node');
    if (!this.removeNodeById(id)) {
      this.undoStack.pop();
      return;
    }
    this.notify();
  }

  isDescendantOf(parentCandidateId, maybeDescendantId, nodes = this.events[this.currentEventIndex].model) {
    const walk = (list, foundParent = false) => {
      for (const node of list) {
        const nextFoundParent = foundParent || node.id === parentCandidateId;
        if (node.id === maybeDescendantId && nextFoundParent) return true;
        if (node.type === 'rng') {
          if (walk(node.children.success, nextFoundParent)) return true;
          if (walk(node.children.failure, nextFoundParent)) return true;
        }
      }
      return false;
    };
    return walk(nodes, false);
  }

  extractNodeById(id, nodes = this.events[this.currentEventIndex].model) {
    for (let i = 0; i < nodes.length; i += 1) {
      const node = nodes[i];
      if (node.id === id) {
        nodes.splice(i, 1);
        return node;
      }
      if (node.type === 'rng') {
        const fromSuccess = this.extractNodeById(id, node.children.success);
        if (fromSuccess) return fromSuccess;
        const fromFailure = this.extractNodeById(id, node.children.failure);
        if (fromFailure) return fromFailure;
      }
    }
    return null;
  }

  moveNode(nodeId, newParentId, branch = 'success') {
    if (!Number.isFinite(nodeId)) return false;
    if (newParentId != null && !Number.isFinite(newParentId)) return false;
    if (newParentId === nodeId) return false;
    if (newParentId != null && this.isDescendantOf(nodeId, newParentId)) return false;

    this.snapshot('move-node');
    const movingNode = this.extractNodeById(nodeId);
    if (!movingNode) {
      this.undoStack.pop();
      return false;
    }

    if (newParentId == null) {
      this.events[this.currentEventIndex].model.push(movingNode);
      this.notify();
      return true;
    }

    const parent = this.findNodeById(newParentId);
    if (!parent || parent.type !== 'rng' || !parent.children[branch]) {
      this.events[this.currentEventIndex].model.push(movingNode);
      this.undoStack.pop();
      return false;
    }

    parent.children[branch].push(movingNode);
    this.notify();
    return true;
  }

  addChildNode(parentId, branch, type) {
    const parent = this.findNodeById(parentId);
    if (!parent || parent.type !== 'rng' || !parent.children[branch]) return;
    this.snapshot('add-child');
    parent.children[branch].push(this.createNode(type));
    this.notify();
  }

  updateNodeParam(nodeId, key, rawValue) {
    const node = this.findNodeById(nodeId);
    if (!node) return;

    let value = rawValue;
    if (["chance", "strength"].includes(key)) {
      if (key === 'chance') {
        value = parseChanceInput(rawValue);
      } else {
        value = Number(String(rawValue).replace(',', '.'));
        if (!Number.isFinite(value)) value = 0;
      }
    }
    if (["amount", "count", "quality"].includes(key)) {
      value = Number(String(rawValue).replace(',', '.'));
      if (!Number.isFinite(value)) value = 1;
    }

    this.snapshot('update-param');
    node.params[key] = value;
    this.notify();
  }

  setModel(model) {
    this.snapshot('set-model');
    this.events[this.currentEventIndex].model = model;
    this.notify();
  }
}

export const editorStore = new EditorStore();

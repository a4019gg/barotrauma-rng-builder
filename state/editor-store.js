import { HistoryManager } from './history-manager.js';
import { cloneWithFreshIds, collectNodes, createNode, findNodeById, normalizeParamValue, removeNodeById } from './node-service.js';


function isDescendantOf(parentCandidateId, maybeDescendantId, nodes) {
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

function extractNodeById(id, nodes) {
  for (let i = 0; i < nodes.length; i += 1) {
    const node = nodes[i];
    if (node.id === id) return nodes.splice(i, 1)[0];
    if (node.type === 'rng') {
      const hit = extractNodeById(id, node.children.success) || extractNodeById(id, node.children.failure);
      if (hit) return hit;
    }
  }
  return null;
}

/**
 * EditorStore keeps app state + reducer-style dispatch while delegating history to HistoryManager.
 */
export class EditorStore {
  constructor() {
    this.events = [{ id: 'event_1', model: [] }];
    this.currentEventIndex = 0;
    this.idCounter = 1;
    this.listeners = new Set();
    this.history = new HistoryManager({ maxEntries: 100 });
    this.clipboard = null;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    const state = this.getState();
    for (const listener of this.listeners) listener(state);
  }

  getState() {
    return { events: this.events, currentEventIndex: this.currentEventIndex, currentEvent: this.events[this.currentEventIndex] };
  }

  nextId = () => this.idCounter++;

  currentModel() {
    return this.events[this.currentEventIndex].model;
  }

  dispatch(action, options = {}) {
    const result = this.reduce(action, options);
    if (result?.changed) this.notify();
    return result;
  }

  reduce(action, { skipHistory = false } = {}) {
    const currentEvent = this.events[this.currentEventIndex];
    switch (action.type) {
      case 'ADD_EVENT': {
        if (this.events.length >= 7) return { changed: false };
        const event = { id: `event_${this.events.length + 1}`, model: [] };
        const index = this.events.length;
        this.events.push(event);
        const prevIndex = this.currentEventIndex;
        this.currentEventIndex = index;
        if (!skipHistory) this.history.push({ undo: () => { this.events.splice(index, 1); this.currentEventIndex = prevIndex; }, redo: () => { this.events.splice(index, 0, event); this.currentEventIndex = index; } });
        return { changed: true };
      }
      case 'REMOVE_EVENT': {
        const index = action.index;
        if (!Number.isInteger(index) || this.events.length <= 1 || index < 0 || index >= this.events.length) return { changed: false };
        const removed = this.events[index];
        const prevIndex = this.currentEventIndex;
        this.events.splice(index, 1);
        this.currentEventIndex = Math.max(0, Math.min(this.currentEventIndex, this.events.length - 1));
        if (!skipHistory) this.history.push({ undo: () => { this.events.splice(index, 0, removed); this.currentEventIndex = prevIndex; }, redo: () => { this.events.splice(index, 1); this.currentEventIndex = Math.max(0, Math.min(prevIndex, this.events.length - 1)); } });
        return { changed: true };
      }
      case 'SET_CURRENT_EVENT':
        if (action.index < 0 || action.index >= this.events.length) return { changed: false };
        this.currentEventIndex = action.index;
        return { changed: true };
      case 'UPDATE_EVENT_ID': {
        const index = action.index;
        if (!Number.isInteger(index) || index < 0 || index >= this.events.length) return { changed: false };
        const prev = this.events[index].id;
        const next = String(action.eventId || '').trim() || `event_${index + 1}`;
        if (prev === next) return { changed: false };
        this.events[index].id = next;
        if (!skipHistory) this.history.push({ undo: () => { this.events[index].id = prev; }, redo: () => { this.events[index].id = next; } });
        return { changed: true };
      }
      case 'ADD_ROOT_NODE': {
        const node = createNode(action.nodeType, this.nextId);
        currentEvent.model.push(node);
        if (!skipHistory) this.history.push({ undo: () => removeNodeById(node.id, currentEvent.model), redo: () => currentEvent.model.push(node) });
        return { changed: true, nodeId: node.id };
      }
      case 'ADD_CHILD_NODE': {
        const parent = findNodeById(action.parentId, currentEvent.model);
        if (!parent || parent.type !== 'rng' || !parent.children[action.branch]) return { changed: false };
        const node = createNode(action.nodeType, this.nextId);
        parent.children[action.branch].push(node);
        if (!skipHistory) this.history.push({ undo: () => removeNodeById(node.id, currentEvent.model), redo: () => parent.children[action.branch].push(node) });
        return { changed: true, nodeId: node.id };
      }
      case 'MOVE_NODE': {
        if (!Number.isFinite(action.nodeId)) return { changed: false };
        if (action.newParentId != null && !Number.isFinite(action.newParentId)) return { changed: false };
        if (action.newParentId === action.nodeId) return { changed: false };
        if (action.newParentId != null && isDescendantOf(action.nodeId, action.newParentId, currentEvent.model)) return { changed: false };
        const movingNode = extractNodeById(action.nodeId, currentEvent.model);
        if (!movingNode) return { changed: false };
        if (action.newParentId == null) {
          currentEvent.model.push(movingNode);
          return { changed: true };
        }
        const parent = findNodeById(action.newParentId, currentEvent.model);
        const branch = action.branch === 'failure' ? 'failure' : 'success';
        if (!parent || parent.type !== 'rng' || !parent.children[branch]) {
          currentEvent.model.push(movingNode);
          return { changed: false };
        }
        parent.children[branch].push(movingNode);
        return { changed: true };
      }

      case 'REMOVE_NODE': {
        const removed = removeNodeById(action.id, currentEvent.model);
        if (!removed) return { changed: false };
        if (!skipHistory) this.history.push({ undo: () => currentEvent.model.push(removed), redo: () => removeNodeById(action.id, currentEvent.model) });
        return { changed: true };
      }
      case 'UPDATE_NODE_PARAM': {
        const node = findNodeById(action.id, currentEvent.model);
        if (!node) return { changed: false };
        const prev = node.params[action.key];
        const next = normalizeParamValue(action.key, action.value);
        if (prev === next) return { changed: false };
        node.params[action.key] = next;
        if (!skipHistory) this.history.push({ undo: () => { node.params[action.key] = prev; }, redo: () => { node.params[action.key] = next; } });
        return { changed: true };
      }
      case 'CLEAR_EVENT': {
        const prev = structuredClone(currentEvent.model);
        currentEvent.model = [];
        if (!skipHistory) this.history.push({ undo: () => { currentEvent.model = structuredClone(prev); }, redo: () => { currentEvent.model = []; } });
        return { changed: true };
      }
      case 'SET_MODEL': {
        const prev = structuredClone(currentEvent.model);
        const next = structuredClone(action.model || []);
        currentEvent.model = next;
        if (!skipHistory) this.history.push({ undo: () => { currentEvent.model = structuredClone(prev); }, redo: () => { currentEvent.model = structuredClone(next); } });
        return { changed: true };
      }
      case 'COPY_SUBTREE': {
        const node = findNodeById(action.id, currentEvent.model);
        if (!node) return { changed: false };
        this.clipboard = structuredClone(node);
        return { changed: false, clipboard: true };
      }
      case 'PASTE_SUBTREE': {
        if (!this.clipboard) return { changed: false };
        const pasted = cloneWithFreshIds(this.clipboard, this.nextId);
        if (action.parentId == null) {
          currentEvent.model.push(pasted);
        } else {
          const parent = findNodeById(action.parentId, currentEvent.model);
          if (!parent || parent.type !== 'rng' || !parent.children[action.branch || 'success']) return { changed: false };
          parent.children[action.branch || 'success'].push(pasted);
        }
        if (!skipHistory) this.history.push({ undo: () => removeNodeById(pasted.id, currentEvent.model), redo: () => currentEvent.model.push(pasted) });
        return { changed: true, nodeId: pasted.id };
      }
      case 'DUPLICATE_SUBTREE': {
        const node = findNodeById(action.id, currentEvent.model);
        if (!node) return { changed: false };
        const pasted = cloneWithFreshIds(node, this.nextId);
        currentEvent.model.push(pasted);
        if (!skipHistory) this.history.push({ undo: () => removeNodeById(pasted.id, currentEvent.model), redo: () => currentEvent.model.push(pasted) });
        return { changed: true, nodeId: pasted.id };
      }
      default:
        return { changed: false };
    }
  }

  undo() { const ok = this.history.undo(); if (ok) this.notify(); return ok; }
  redo() { const ok = this.history.redo(); if (ok) this.notify(); return ok; }

  // Backward-compatible methods
  addEvent() { return this.dispatch({ type: 'ADD_EVENT' }).changed; }
  removeEvent(index) { return this.dispatch({ type: 'REMOVE_EVENT', index }).changed; }
  setCurrentEvent(index) { this.dispatch({ type: 'SET_CURRENT_EVENT', index }); }
  updateEventId(index, eventId) { return this.dispatch({ type: 'UPDATE_EVENT_ID', index, eventId }).changed; }
  updateCurrentEventId(eventId) { this.dispatch({ type: 'UPDATE_EVENT_ID', index: this.currentEventIndex, eventId }, { skipHistory: true }); }
  addRootNode(type) { this.dispatch({ type: 'ADD_ROOT_NODE', nodeType: type }); }
  addChildNode(parentId, branch, type) { this.dispatch({ type: 'ADD_CHILD_NODE', parentId, branch, nodeType: type }); }
  removeNode(id) { this.dispatch({ type: 'REMOVE_NODE', id }); }
  moveNode(nodeId, newParentId, branch = 'success') { return this.dispatch({ type: 'MOVE_NODE', nodeId, newParentId, branch }, { skipHistory: true }).changed; }
  updateNodeParam(id, key, value) { this.dispatch({ type: 'UPDATE_NODE_PARAM', id, key, value }); }
  clearCurrentEvent() { this.dispatch({ type: 'CLEAR_EVENT' }); }
  setModel(model) { this.dispatch({ type: 'SET_MODEL', model }); }
  findNodeById(id, nodes = this.currentModel()) { return findNodeById(id, nodes); }
  collectNodes() { return collectNodes(this.currentModel()); }
}

export const editorStore = new EditorStore();

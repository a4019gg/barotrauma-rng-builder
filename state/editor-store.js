import { HistoryManager } from './history-manager.js';
import {
  cloneWithFreshIds,
  collectNodes,
  createNodeIndex,
  createNode,
  findNodeById,
  getChildList,
  isDescendantInIndex,
  normalizeParamValue,
  removeNodeById
} from './node-service.js';
import {
  convertLegacyRngToAdvanced,
  findRngBranch,
  getModeDefinition,
  isRngNode,
  normalizeNodeModel
} from '../core/graph-utils.js';

export class EditorStore {
  constructor() {
    this.events = [{ id: 'event_1', model: [] }];
    this.currentEventIndex = 0;
    this.idCounter = 1;
    this.listeners = new Set();
    this.history = new HistoryManager({ maxEntries: 100 });
    this.clipboard = null;
    this.editorMode = 'basic';
    this.currentIndex = new Map();
    this.rebuildIndex();
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
    return {
      events: this.events,
      currentEventIndex: this.currentEventIndex,
      currentEvent: this.events[this.currentEventIndex],
      editorMode: this.editorMode,
      modeDefinition: getModeDefinition(this.editorMode)
    };
  }

  nextId = () => this.idCounter++;

  rebuildIndex() {
    this.currentIndex = createNodeIndex(this.currentModel());
    return this.currentIndex;
  }

  ensureIndex() {
    if (!this.currentIndex) this.rebuildIndex();
    return this.currentIndex;
  }

  currentModel() {
    return this.events[this.currentEventIndex].model;
  }

  dispatch(action, options = {}) {
    const result = this.reduce(action, options);
    if (result?.changed) this.notify();
    if (action.type === 'SET_EDITOR_MODE') this.notify();
    return result;
  }

  reduce(action, { skipHistory = false } = {}) {
    const currentEvent = this.events[this.currentEventIndex];
    switch (action.type) {
      case 'SET_EDITOR_MODE': {
        const next = ['basic', 'advanced'].includes(action.mode) ? action.mode : 'basic';
        const prev = this.editorMode;
        if (prev === next) return { changed: false };
        this.editorMode = next;
        if (!skipHistory) this.history.push({ undo: () => { this.editorMode = prev; }, redo: () => { this.editorMode = next; } });
        return { changed: true };
      }
      case 'ADD_EVENT': {
        if (this.events.length >= 7) return { changed: false };
        const event = { id: `event_${this.events.length + 1}`, model: [] };
        const index = this.events.length;
        this.events.push(event);
        const prevIndex = this.currentEventIndex;
        this.currentEventIndex = index;
        this.rebuildIndex();
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
        this.rebuildIndex();
        if (!skipHistory) this.history.push({ undo: () => { this.events.splice(index, 0, removed); this.currentEventIndex = prevIndex; }, redo: () => { this.events.splice(index, 1); this.currentEventIndex = Math.max(0, Math.min(prevIndex, this.events.length - 1)); } });
        return { changed: true };
      }
      case 'SET_CURRENT_EVENT':
        if (action.index < 0 || action.index >= this.events.length) return { changed: false };
        this.currentEventIndex = action.index;
        this.rebuildIndex();
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
        this.currentIndex.set(String(node.id), { node, parentId: null, branchId: null, containerRef: currentEvent.model });
        if (!skipHistory) this.history.push({ undo: () => removeNodeById(node.id, currentEvent.model), redo: () => currentEvent.model.push(node) });
        return { changed: true, nodeId: node.id };
      }
      case 'ADD_CHILD_NODE': {
        const parent = this.ensureIndex().get(String(action.parentId))?.node || findNodeById(action.parentId, currentEvent.model);
        const target = getChildList(parent, action.branch);
        if (!target) return { changed: false };
        const node = createNode(action.nodeType, this.nextId);
        target.push(node);
        this.currentIndex.set(String(node.id), { node, parentId: parent.id, branchId: action.branch ?? null, containerRef: target });
        if (!skipHistory) this.history.push({ undo: () => removeNodeById(node.id, currentEvent.model), redo: () => target.push(node) });
        return { changed: true, nodeId: node.id };
      }
      case 'ADD_RNG_BRANCH': {
        const node = findNodeById(action.id, currentEvent.model);
        if (!isRngNode(node)) return { changed: false };
        const branchCount = node.branches?.length || 0;
        const nextBranch = { id: `branch_${branchCount + 1}`, label: `Branch ${branchCount + 1}`, value: node.params.mode === 'weight' ? 1 : 0, children: [] };
        node.branches.push(nextBranch);
        if (!skipHistory) this.history.push({ undo: () => { node.branches.pop(); }, redo: () => { node.branches.push(structuredClone(nextBranch)); } });
        return { changed: true };
      }
      case 'REMOVE_RNG_BRANCH': {
        const node = findNodeById(action.id, currentEvent.model);
        if (!isRngNode(node) || (node.branches?.length || 0) <= 2) return { changed: false };
        const index = node.branches.findIndex(branch => branch.id === action.branchId);
        if (index < 0) return { changed: false };
        const [removed] = node.branches.splice(index, 1);
        if (!skipHistory) this.history.push({ undo: () => { node.branches.splice(index, 0, removed); }, redo: () => { node.branches.splice(index, 1); } });
        return { changed: true };
      }
      case 'UPDATE_BRANCH': {
        const node = findNodeById(action.id, currentEvent.model);
        const branch = findRngBranch(node, action.branchId);
        if (!branch) return { changed: false };
        const prev = branch[action.key];
        const next = action.key === 'value'
          ? Math.max(0, Number(String(action.value).replace(',', '.')) || 0)
          : String(action.value || '');
        if (prev === next) return { changed: false };
        branch[action.key] = next;
        if (!skipHistory) this.history.push({ undo: () => { branch[action.key] = prev; }, redo: () => { branch[action.key] = next; } });
        return { changed: true };
      }
      case 'MOVE_NODE': {
        if (action.nodeId == null) return { changed: false };
        if (action.newParentId != null && action.newParentId === '') return { changed: false };
        if (action.newParentId === action.nodeId) return { changed: false };
        const index = this.ensureIndex();
        if (action.newParentId != null && isDescendantInIndex(index, action.nodeId, action.newParentId)) return { changed: false };
        const movingNode = removeNodeById(action.nodeId, currentEvent.model);
        if (!movingNode) return { changed: false };
        if (action.newParentId == null) {
          currentEvent.model.push(movingNode);
          this.rebuildIndex();
          return { changed: true };
        }
        const parent = index.get(String(action.newParentId))?.node || findNodeById(action.newParentId, currentEvent.model);
        const target = getChildList(parent, action.branch);
        if (!target) {
          currentEvent.model.push(movingNode);
          this.rebuildIndex();
          return { changed: false };
        }
        target.push(movingNode);
        this.rebuildIndex();
        return { changed: true };
      }
      case 'REMOVE_NODE': {
        const removed = removeNodeById(action.id, currentEvent.model);
        if (!removed) return { changed: false };
        this.rebuildIndex();
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
        if (isRngNode(node) && action.key === 'chance' && node.branches?.length >= 2 && node.params.mode !== 'weight') {
          node.branches[0].value = next;
          node.branches[1].value = 1 - next;
        }
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
        const next = normalizeNodeModel(action.model || []);
        currentEvent.model = next;
        this.rebuildIndex();
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
          const target = getChildList(parent, action.branch);
          if (!target) return { changed: false };
          target.push(pasted);
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
      case 'CONVERT_RNG_TO_ADVANCED': {
        const node = findNodeById(action.id, currentEvent.model);
        if (!isRngNode(node)) return { changed: false };
        const prev = structuredClone(node);
        const next = convertLegacyRngToAdvanced(node);
        Object.assign(node, next);
        if (!skipHistory) this.history.push({ undo: () => Object.assign(node, structuredClone(prev)), redo: () => Object.assign(node, structuredClone(next)) });
        return { changed: true };
      }
      default:
        return { changed: false };
    }
  }

  undo() { const ok = this.history.undo(); if (ok) { this.rebuildIndex(); this.notify(); } return ok; }
  redo() { const ok = this.history.redo(); if (ok) { this.rebuildIndex(); this.notify(); } return ok; }

  addEvent() { return this.dispatch({ type: 'ADD_EVENT' }).changed; }
  removeEvent(index) { return this.dispatch({ type: 'REMOVE_EVENT', index }).changed; }
  setCurrentEvent(index) { this.dispatch({ type: 'SET_CURRENT_EVENT', index }); }
  setEditorMode(mode) { this.dispatch({ type: 'SET_EDITOR_MODE', mode }, { skipHistory: true }); }
  updateEventId(index, eventId) { return this.dispatch({ type: 'UPDATE_EVENT_ID', index, eventId }).changed; }
  updateCurrentEventId(eventId) { this.dispatch({ type: 'UPDATE_EVENT_ID', index: this.currentEventIndex, eventId }, { skipHistory: true }); }
  addRootNode(type) { this.dispatch({ type: 'ADD_ROOT_NODE', nodeType: type }); }
  addChildNode(parentId, branch, type) { this.dispatch({ type: 'ADD_CHILD_NODE', parentId, branch, nodeType: type }); }
  removeNode(id) { this.dispatch({ type: 'REMOVE_NODE', id }); }
  moveNode(nodeId, newParentId, branch = null) { return this.dispatch({ type: 'MOVE_NODE', nodeId, newParentId, branch }, { skipHistory: true }).changed; }
  updateNodeParam(id, key, value) { this.dispatch({ type: 'UPDATE_NODE_PARAM', id, key, value }); }
  clearCurrentEvent() { this.dispatch({ type: 'CLEAR_EVENT' }); }
  setModel(model) { this.dispatch({ type: 'SET_MODEL', model }); }
  findNodeById(id, nodes = this.currentModel()) {
    if (nodes === this.currentModel()) {
      return this.ensureIndex().get(String(id))?.node || null;
    }
    return findNodeById(id, nodes);
  }
  collectNodes() { return collectNodes(this.currentModel()); }

  loadProject(projectState) {
    if (!projectState || !Array.isArray(projectState.events) || !projectState.events.length) return false;
    this.events = structuredClone(projectState.events);
    this.events.forEach(event => { event.model = normalizeNodeModel(event.model || []); });
    this.currentEventIndex = Number.isInteger(projectState.currentEventIndex)
      ? Math.max(0, Math.min(projectState.currentEventIndex, this.events.length - 1))
      : 0;
    this.editorMode = projectState.editorMode === 'advanced' ? 'advanced' : 'basic';
    this.idCounter = Number.isFinite(projectState.idCounter) ? Math.max(1, Math.floor(projectState.idCounter)) : 1;
    this.history.clear();
    this.rebuildIndex();
    this.notify();
    return true;
  }
}

export const editorStore = new EditorStore();

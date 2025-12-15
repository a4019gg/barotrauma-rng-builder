// js/EditorState.ts — v0.9.401 — КЛАСС СОСТОЯНИЯ РЕДАКТОРА НА TYPESCRIPT

import { NodeModel, EventModel } from './shared/types';
import nodeFactory from './NodeFactory';
import { loc } from './utils';

const MAIN_VERSION = "v0.9.401";
(window as any).MAIN_VERSION = MAIN_VERSION;

interface EditorStateDependencies {
  nodeFactory?: typeof nodeFactory;
  onUpdate?: () => void;
  loc?: typeof loc;
}

class EditorState {
  private currentEventIndex: number = 0;
  private events: EventModel[] = [{ model: [] }];
  private undoStack: string[] = [];
  private redoStack: string[] = [];
  private maxHistory: number = 50;

  private nodeFactory: typeof nodeFactory;
  private onUpdate: () => void;
  private loc: typeof loc;

  constructor(dependencies: EditorStateDependencies = {}) {
    this.nodeFactory = dependencies.nodeFactory || nodeFactory;
    this.onUpdate = dependencies.onUpdate || (() => console.log('update triggered'));
    this.loc = dependencies.loc || loc;
  }

  private saveState(): void {
    const state = JSON.stringify({
      events: this.events.map(e => ({ model: this.deepCopy(e.model) })),
      currentEventIndex: this.currentEventIndex
    });

    this.undoStack.push(state);
    if (this.undoStack.length > this.maxHistory) this.undoStack.shift();
    this.redoStack = [];
  }

  private deepCopy<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  undo(): boolean {
    if (this.undoStack.length === 0) return false;
    this.redoStack.push(JSON.stringify({
      events: this.events.map(e => ({ model: this.deepCopy(e.model) })),
      currentEventIndex: this.currentEventIndex
    }));

    const prev = JSON.parse(this.undoStack.pop()!);
    this.events = prev.events;
    this.currentEventIndex = prev.currentEventIndex;

    this.renderCurrentEvent();
    this.rebuildTabs();
    return true;
  }

  redo(): boolean {
    if (this.redoStack.length === 0) return false;
    this.undoStack.push(JSON.stringify({
      events: this.events.map(e => ({ model: this.deepCopy(e.model) })),
      currentEventIndex: this.currentEventIndex
    }));

    const next = JSON.parse(this.redoStack.pop()!);
    this.events = next.events;
    this.currentEventIndex = next.currentEventIndex;

    this.renderCurrentEvent();
    this.rebuildTabs();
    return true;
  }

  addEvent(): void {
    this.saveState();
    this.events.push({ model: [] });
    this.switchToEvent(this.events.length - 1);
  }

  deleteEvent(index: number): boolean {
    if (this.events.length <= 1) {
      alert(this.loc('lastEventWarning', 'Нельзя удалить последний ивент!'));
      return false;
    }
    if (!confirm(this.loc('deleteEventConfirm', 'Удалить ивент?'))) return false;

    this.saveState();
    this.events.splice(index, 1);
    if (this.currentEventIndex >= this.events.length) {
      this.currentEventIndex = this.events.length - 1;
    }
    this.switchToEvent(this.currentEventIndex);
    return true;
  }

  switchToEvent(index: number): void {
    if (index < 0 || index >= this.events.length) return;

    this.saveState();
    this.currentEventIndex = index;
    this.renderCurrentEvent();
    this.rebuildTabs();
  }

  renderCurrentEvent(): void {
    const container = document.getElementById('root-children');
    if (!container) return;
    container.innerHTML = '';
    this.renderModelToDOM(this.events[this.currentEventIndex].model, container);
    this.onUpdate();
  }

  private renderModelToDOM(model: NodeModel[], container: HTMLElement): void {
    model.forEach(nodeModel => {
      const nodeElement = this.nodeFactory.createFromModel(nodeModel);
      container.appendChild(nodeElement);
    });
  }

  rebuildTabs(): void {
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

  findNodeById(id: number, nodes: NodeModel[] = this.events[this.currentEventIndex].model): NodeModel | null {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.type === 'rng' && node.children) {
        const found = this.findNodeById(id, node.children.success) || this.findNodeById(id, node.children.failure);
        if (found) return found;
      }
    }
    return null;
  }

  removeNodeById(id: number): boolean {
    const removed = this._removeNodeRecursive(id, this.events[this.currentEventIndex].model);
    if (removed) {
      this.renderCurrentEvent();
      this.onUpdate();
    }
    return removed;
  }

  private _removeNodeRecursive(id: number, nodes: NodeModel[]): boolean {
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

  addNodeToBranch(parentId: number, branch: 'success' | 'failure', type: string): boolean {
    const parent = this.findNodeById(parentId);
    if (!parent || parent.type !== 'rng' || !parent.children || !parent.children[branch]) {
      console.warn('Cannot add to branch: invalid parent or branch', { parentId, branch, type });
      return false;
    }

    const newModel = (this.nodeFactory as any)[`createModel${type.charAt(0).toUpperCase() + type.slice(1)}`]();
    parent.children[branch].push(newModel);
    this.renderCurrentEvent();
    this.onUpdate();
    return true;
  }

  autoBalance(): void {
    this.saveState();

    const balance = (nodes: NodeModel[]) => {
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
    this.onUpdate();
    alert(this.loc('autoBalanceDone', 'Автобаланс завершён'));
  }

  clearAll(): void {
    this.saveState();
    this.events[this.currentEventIndex].model = [];
    this.renderCurrentEvent();
    this.onUpdate();
  }

  exportData(): any {
    this.saveState();
    return {
      version: "v0.9.401",
      events: this.events.map(e => ({ model: this.deepCopy(e.model) }))
    };
  }

  importData(data: any): boolean {
    if (!data.events || !Array.isArray(data.events)) return false;
    this.events = data.events.map((e: any) => ({ model: e.model || [] }));
    this.currentEventIndex = 0;
    this.renderCurrentEvent();
    this.rebuildTabs();
    this.onUpdate();
    return true;
  }
}

// Глобальный экземпляр (временно, пока не перейдём на main.ts)
const editorState = new EditorState();

// Глобальные для совместимости
(window as any).editorState = editorState;

(window as any).addEvent = () => editorState.addEvent();
(window as any).clearAll = () => editorState.clearAll();
(window as any).autoBalance = () => editorState.autoBalance();
(window as any).importFile = importFile;
(window as any).exportJSON = exportJSON;
(window as any).updateAll = updateAll;

export default editorState;

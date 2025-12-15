// js/UIController.ts — v0.9.401 — ЦЕНТРАЛИЗОВАННЫЙ КОНТРОЛЛЕР СОБЫТИЙ

import editorState from './EditorState';
import nodeFactory from './NodeFactory';
import { loc } from './utils';

interface UIControllerDependencies {
  editorState?: typeof editorState;
  nodeFactory?: typeof nodeFactory;
  loc?: typeof loc;
}

class UIController {
  private editorState: typeof editorState;
  private nodeFactory: typeof nodeFactory;
  private loc: typeof loc;

  constructor(dependencies: UIControllerDependencies = {}) {
    this.editorState = dependencies.editorState || editorState;
    this.nodeFactory = dependencies.nodeFactory || nodeFactory;
    this.loc = dependencies.loc || loc;

    this.initEventDelegation();
  }

  private initEventDelegation(): void {
    // Центральное делегирование всех событий
    document.addEventListener('click', this.handleClick.bind(this));
    document.addEventListener('change', this.handleChange.bind(this));
  }

  private handleClick(e: MouseEvent): void {
    const target = (e.target as HTMLElement).closest('[data-action]') as HTMLElement;
    if (!target) return;

    const action = target.dataset.action as string;
    const type = target.dataset.type || target.dataset.nodeType;
    const parentId = target.dataset.parentId ? parseInt(target.dataset.parentId) : undefined;
    const branch = target.dataset.branch as 'success' | 'failure' | undefined;
    const id = target.dataset.id ? parseInt(target.dataset.id) : undefined;

    switch (action) {
      case 'toggleView':
        this.toggleView();
        break;

      case 'openDB':
        this.openDB();
        break;

      case 'loadExample':
        this.openDB(); // временно, пока пресеты в DB
        break;

      case 'importFile':
        this.importFile();
        break;

      case 'exportJSON':
        this.exportJSON();
        break;

      case 'addEvent':
        this.editorState.addEvent();
        break;

      case 'addNode':
        if (type) {
          this.addNodeToRoot(type);
        }
        break;

      case 'addNodeToBranch':
        if (parentId !== undefined && branch && type) {
          this.editorState.addNodeToBranch(parentId, branch, type);
        }
        break;

      case 'removeNode':
        if (id !== undefined) {
          this.editorState.removeNodeById(id);
        }
        break;

      case 'clearAll':
        this.editorState.clearAll();
        break;

      case 'autoBalance':
        this.editorState.autoBalance();
        break;

      case 'generateXML':
        this.generateXML();
        break;

      case 'copyXML':
        this.copyXML();
        break;

      case 'downloadXML':
        this.downloadXML();
        break;

      case 'importFromXML':
        this.importFromXML();
        break;

      default:
        console.warn(`Unknown data-action: ${action}`);
    }
  }

  private handleChange(e: Event): void {
    const target = e.target as HTMLElement;
    if (!target.dataset?.action) return;

    const action = target.dataset.action;
    const value = (target as HTMLInputElement | HTMLSelectElement).type === 'checkbox' 
      ? (target as HTMLInputElement).checked 
      : (target as HTMLInputElement | HTMLSelectElement).value;

    switch (action) {
      case 'setTheme':
        setTheme(value as string);
        break;
      case 'setLang':
        setLang(value as 'en' | 'ru');
        break;
      case 'setUIScale':
        setUIScale(value as string);
        break;
      case 'setNodeDensity':
        setNodeDensity(value as string);
        break;
      case 'toggleShadows':
        toggleShadows(value as boolean);
        break;
      case 'toggleGrid':
        toggleGrid(value as boolean);
        break;
      case 'toggleSnap':
        toggleSnap(value as boolean);
        break;
      case 'setXMLFormat':
        setXMLFormat(value as string);
        break;
      case 'toggleValidation':
        toggleValidation(value as boolean);
        break;
      case 'toggleCheckDuplicateIDs':
        toggleCheckDuplicateIDs(value as boolean);
        break;
      case 'updateParam':
        const key = target.dataset.key;
        const nodeId = target.dataset.id ? parseInt(target.dataset.id) : undefined;
        if (key && nodeId !== undefined) {
          // В будущем — editorState.updateNodeParam(nodeId, key, value)
          // Пока — updateAll()
          updateAll();
        }
        break;
      default:
        console.warn(`Unknown change data-action: ${action}`);
    }
  }

  // === ДЕЙСТВИЯ ===
  private toggleView(): void {
    // Заглушка — реализация tree view
    console.log('Toggle view');
  }

  private openDB(): void {
    // Заглушка — открытие базы
    console.log('Open DB');
  }

  private importFile(): void {
    // Заглушка
    console.log('Import file');
  }

  private exportJSON(): void {
    const data = this.editorState.exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rng-builder.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  private addNodeToRoot(type: string): void {
    const newModel = (this.nodeFactory as any)[`createModel${type.charAt(0).toUpperCase() + type.slice(1)}`]();
    this.editorState.events[this.editorState.currentEventIndex].model.push(newModel);
    this.editorState.renderCurrentEvent();
  }

  private generateXML(): void {
    // Заглушка
    console.log('Generate XML');
  }

  private copyXML(): void {
    const output = document.getElementById('output') as HTMLTextAreaElement;
    if (output) {
      output.select();
      document.execCommand('copy');
      alert(this.loc('copyXML', 'XML скопирован в буфер обмена'));
    }
  }

  private downloadXML(): void {
    // Заглушка
    console.log('Download XML');
  }

  private importFromXML(): void {
    // Заглушка
    console.log('Import from XML');
  }
}

// Инициализация (временно глобально)
document.addEventListener('DOMContentLoaded', () => {
  new UIController();
});

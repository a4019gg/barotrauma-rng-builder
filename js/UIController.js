// js/UIController.js — v0.9.402 — ФИКС ДВОЙНЫХ ДЕЙСТВИЙ И МОДАЛКИ

class UIController {
  constructor() {
    this.isInitialized = false;
    this.initEventDelegation();
  }

  initEventDelegation() {
    if (this.isInitialized) return; // Защита от двойной инициализации
    this.isInitialized = true;

    document.addEventListener('click', this.handleClick.bind(this));
    document.addEventListener('change', this.handleChange.bind(this));
  }

  handleClick(e) {
    const target = e.target.closest('[data-action]');
    if (!target) return;

    e.stopPropagation(); // Предотвращаем всплытие

    const action = target.dataset.action;
    const type = target.dataset.type || target.dataset.nodeType;
    const parentId = target.dataset.parentId ? parseInt(target.dataset.parentId, 10) : null;
    const branch = target.dataset.branch;
    const id = target.dataset.id ? parseInt(target.dataset.id, 10) : null;

    switch (action) {
      case 'toggleView':
        this.toggleView();
        break;

      case 'openDB':
        if (document.querySelector('.db-modal-overlay')) return; // Уже открыта
        dbManager.openDB();
        break;

      case 'loadExample':
        if (document.querySelector('.db-modal-overlay')) return;
        dbManager.openDB(); // Пока пресеты в DB
        break;

      case 'importFile':
        importFile();
        break;

      case 'exportJSON':
        exportJSON();
        break;

      case 'addEvent':
        editorState.addEvent();
        break;

      case 'addNode':
        if (type) {
          const addMap = {
            rng: addRNG,
            spawn: addSpawn,
            creature: addCreature,
            affliction: addAffliction
          };
          const func = addMap[type];
          if (func) func();
        }
        break;

      case 'addNodeToBranch':
        if (parentId !== null && branch && type) {
          editorState.addNodeToBranch(parentId, branch, type);
        }
        break;

      case 'removeNode':
        if (id !== null) {
          editorState.removeNodeById(id);
        }
        break;

      case 'clearAll':
        editorState.clearAll();
        break;

      case 'autoBalance':
        editorState.autoBalance();
        break;

      case 'generateXML':
        generateXML();
        break;

      case 'copyXML':
        this.copyXML();
        break;

      case 'downloadXML':
        this.downloadXML();
        break;

      case 'importFromXML':
        importFromXML();
        break;

      default:
        console.warn(`Unknown action: ${action}`);
    }
  }

  handleChange(e) {
    const target = e.target;
    if (!target.dataset?.action) return;

    const action = target.dataset.action;
    const value = target.type === 'checkbox' ? target.checked : target.value;

    switch (action) {
      case 'setTheme':
        setTheme(value);
        break;
      case 'setLang':
        setLang(value);
        break;
      case 'setUIScale':
        setUIScale(value);
        break;
      case 'setNodeDensity':
        setNodeDensity(value);
        break;
      case 'toggleShadows':
        toggleShadows(value);
        break;
      case 'toggleGrid':
        toggleGrid(value);
        break;
      case 'toggleSnap':
        toggleSnap(value);
        break;
      case 'setXMLFormat':
        setXMLFormat(value);
        break;
      case 'toggleValidation':
        toggleValidation(value);
        break;
      case 'toggleCheckDuplicateIDs':
        toggleCheckDuplicateIDs(value);
        break;
      case 'updateParam':
        updateAll(); // Временно
        break;
      default:
        console.warn(`Unknown change action: ${action}`);
    }
  }

  toggleView() {
    const classic = document.getElementById('classic-view');
    const tree = document.getElementById('tree-container');
    const btn = document.getElementById('view-btn');

    if (tree.style.display === 'block') {
      tree.style.display = 'none';
      classic.style.display = 'block';
      btn.textContent = loc('treeView');
    } else {
      tree.style.display = 'block';
      classic.style.display = 'none';
      btn.textContent = loc('classicView');
      if (treeView && treeView.render) treeView.render();
    }
  }

  copyXML() {
    const output = document.getElementById('output');
    if (!output) return;
    output.select();
    output.setSelectionRange(0, 99999);
    document.execCommand('copy');
    alert(loc('copyXML'));
  }

  downloadXML() {
    generateXML();
    const output = document.getElementById('output').value;
    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'barotrauma-event.xml';
    a.click();
    URL.revokeObjectURL(url);
  }
}

// Инициализация (один раз)
if (!window.uiController) {
  window.uiController = new UIController();
}

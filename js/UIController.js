// js/UIController.js — v0.9.403 — ЦЕНТРАЛИЗОВАННОЕ ДЕЛЕГИРОВАНИЕ СОБЫТИЙ

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

    e.stopPropagation(); // Предотвращаем всплытие и дублирование

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

    switch (action) {
      case 'setTheme':
        setTheme(target.value);
        break;
      case 'setLang':
        setLang(target.value);
        break;
      case 'setUIScale':
        setUIScale(target.value);
        break;
      case 'setNodeDensity':
        setNodeDensity(target.value);
        break;
      case 'toggleShadows':
        toggleShadows(target.checked);
        break;
      case 'toggleGrid':
        toggleGrid(target.checked);
        break;
      case 'toggleSnap':
        toggleSnap(target.checked);
        break;
      case 'setXMLFormat':
        setXMLFormat(target.value);
        break;
      case 'toggleValidation':
        toggleValidation(target.checked);
        break;
      case 'toggleCheckDuplicateIDs':
        toggleCheckDuplicateIDs(target.checked);
        break;
      case 'updateParam':
        updateAll(); // Вызываем updateAll только здесь для изменений параметров
        break;
      default:
        console.warn(`Unknown change action: ${action}`);
    }
  }

  toggleView() {
    const classic = document.getElementById('classic-view');
    const tree = document.getElementById('tree-container');
    const btn = document.getElementById('view-btn');

    if (!classic || !tree || !btn) return;

    if (tree.style.display === 'block') {
      tree.style.display = 'none';
      classic.style.display = 'block';
      btn.textContent = loc('treeView');
    } else {
      tree.style.display = 'block';
      classic.style.display = 'none';
      btn.textContent = loc('classicView');
      treeView.render(); // Рендерим при открытии
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

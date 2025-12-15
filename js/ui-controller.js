// js/ui-controller.js — v0.9.302 — ДЕЛЕГИРОВАНИЕ click/change, copy/download

class UIController {
  constructor() {
    this.initEventDelegation();
  }

  initEventDelegation() {
    // Делегирование click
    document.addEventListener('click', e => {
      const target = e.target.closest('[data-action]');
      if (!target) return;

      const action = target.dataset.action;
      const type = target.dataset.type || null;

      switch (action) {
        case 'toggleView':
          treeViewManager.toggleView();
          break;

        case 'openDB':
          dbManager.openDB();
          break;

        case 'loadExample':
          dbManager.openDB(); // временно, пока пресеты в DB
          break;

        case 'importFile':
          importFile();
          break;

        case 'exportJSON':
          exportJSON();
          break;

        case 'addEvent':
          window.editorState.addEvent();
          break;

        case 'addNode':
          if (type) {
            const addMap = {
              rng: window.addRNG,
              spawn: window.addSpawn,
              creature: window.addCreature,
              affliction: window.addAffliction
            };
            const func = addMap[type];
            if (typeof func === 'function') func();
          }
          break;

        case 'clearAll':
          window.editorState.clearAll();
          break;

        case 'autoBalance':
          window.editorState.autoBalance();
          break;

        case 'generateXML':
          generateXML();
          break;

        case 'copyXML':
          this.copyOutputToClipboard();
          break;

        case 'downloadXML':
          this.downloadXML();
          break;

        case 'importFromXML':
          importFromXML();
          break;

        default:
          console.warn(`Unknown data-action: ${action}`);
      }
    });

    // Делегирование change для настроек
    document.addEventListener('change', e => {
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
        default:
          console.warn(`Unknown change data-action: ${action}`);
      }
    });

    // Обновление Event ID (input)
    const eventIdInput = document.getElementById('event-id');
    if (eventIdInput) {
      eventIdInput.addEventListener('input', () => {
        // В будущем — добавить identifier в модель
      });
    }
  }

  copyOutputToClipboard() {
    const output = document.getElementById('output');
    if (!output) return;
    output.select();
    output.setSelectionRange(0, 99999);
    document.execCommand('copy');
    alert(loc('copyXML', 'XML скопирован в буфер обмена'));
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

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
  new UIController();
});

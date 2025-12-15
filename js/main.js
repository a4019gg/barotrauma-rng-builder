// js/main.js — v0.9.402 — ТОЧКА ВХОДА И ИНИЦИАЛИЗАЦИЯ (ФИКСЫ БАГОВ)

let isInitialized = false;

document.addEventListener('DOMContentLoaded', () => {
  if (isInitialized) return; // Защита от двойной инициализации
  isInitialized = true;

  // Создаём основные компоненты
  const nodeFactory = new NodeFactory();
  const editorState = new EditorState();
  const uiController = new UIController();

  // Глобальные ссылки для совместимости
  window.nodeFactory = nodeFactory;
  window.editorState = editorState;
  window.dbManager = dbManager;

  // Глобальные функции добавления в корень
  window.addRNG = () => {
    const newModel = nodeFactory.createModelRNG();
    editorState.events[editorState.currentEventIndex].model.push(newModel);
    editorState.renderCurrentEvent();
  };

  window.addSpawn = () => {
    const newModel = nodeFactory.createModelSpawn();
    editorState.events[editorState.currentEventIndex].model.push(newModel);
    editorState.renderCurrentEvent();
  };

  window.addCreature = () => {
    const newModel = nodeFactory.createModelCreature();
    editorState.events[editorState.currentEventIndex].model.push(newModel);
    editorState.renderCurrentEvent();
  };

  window.addAffliction = () => {
    const newModel = nodeFactory.createModelAffliction();
    editorState.events[editorState.currentEventIndex].model.push(newModel);
    editorState.renderCurrentEvent();
  };

  // Заглушка updateAll
  window.updateAll = () => {
    console.log('updateAll called — probabilities recalc (placeholder)');
  };

  // Импорт JSON
  window.importFile = () => {
    const input = document.getElementById('file-input');
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          editorState.importData(data);
          alert(loc('presetLoaded'));
        } catch (err) {
          alert(loc('presetError'));
          console.error(err);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // Экспорт JSON
  window.exportJSON = () => {
    const data = editorState.exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rng-builder-event.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Функция заполнения datalist (перемещена сюда из старого main.js)
  function populateDatalist() {
    const datalist = document.getElementById('item-datalist');
    if (!datalist) return;

    const commonIds = [
      'revolver', 'revolverrounds', 'divingknife', 'toolbox', 'oxygenitetank',
      'plasmacutter', 'crowbar', 'weldingtool', 'crawler', 'husk', 'mudraptor',
      'hammerhead', 'bleeding', 'burn', 'oxygenlow', 'radiationsickness', 'huskinfection'
    ];

    commonIds.forEach(id => {
      const opt = document.createElement('option');
      opt.value = id;
      datalist.appendChild(opt);
    });
  }

  // Начальный рендер
  editorState.renderCurrentEvent();
  editorState.rebuildTabs();

  // Дополнительная инициализация
  populateDatalist();
  showScriptVersions();
});

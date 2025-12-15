// js/main.js — v0.9.403 — ТОЧКА ВХОДА И ИНИЦИАЛИЗАЦИЯ (ФИНАЛЬНАЯ ВЕРСИЯ)

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

  // Глобальные функции добавления в корень (для action-bar)
  window.addRNG = () => {
    const newModel = nodeFactory.createModelRNG();
    editorState.events[editorState.currentEventIndex].model.push(newModel);
    editorState.renderCurrentEvent();
    updateAll();
  };

  window.addSpawn = () => {
    const newModel = nodeFactory.createModelSpawn();
    editorState.events[editorState.currentEventIndex].model.push(newModel);
    editorState.renderCurrentEvent();
    updateAll();
  };

  window.addCreature = () => {
    const newModel = nodeFactory.createModelCreature();
    editorState.events[editorState.currentEventIndex].model.push(newModel);
    editorState.renderCurrentEvent();
    updateAll();
  };

  window.addAffliction = () => {
    const newModel = nodeFactory.createModelAffliction();
    editorState.events[editorState.currentEventIndex].model.push(newModel);
    editorState.renderCurrentEvent();
    updateAll();
  };

  // Глобальная функция updateAll (один раз на действие)
  window.updateAll = () => {
    console.log('updateAll called — probabilities recalc (placeholder)');
    // Здесь будет расчёт вероятностей
    if (document.getElementById('tree-container').style.display === 'block') {
      treeView.render();
    }
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

  // Начальный рендер
  editorState.renderCurrentEvent();
  editorState.rebuildTabs();

  // Дополнительная инициализация
  populateDatalist();
  showScriptVersions();
});

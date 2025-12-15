// js/main.js — v0.9.401 — ТОЧКА ВХОДА И ИНИЦИАЛИЗАЦИЯ

document.addEventListener('DOMContentLoaded', () => {
  // Инициализация компонентов
  const nodeFactory = new NodeFactory();
  const editorState = new EditorState({ nodeFactory });
  const uiController = new UIController({ editorState, nodeFactory });

  // Начальный рендер
  editorState.renderCurrentEvent();
  editorState.rebuildTabs();

  // Дополнительная инициализация
  populateDatalist();
  showScriptVersions();

  // Глобальные ссылки для совместимости (временно)
  window.editorState = editorState;
  window.nodeFactory = nodeFactory;
  window.dbManager = dbManager;

  // Глобальные функции добавления в корень (временные)
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

  // Заглушки для глобальных функций (пока не реализованы)
  window.updateAll = () => {
    console.log('updateAll called — probabilities recalc (placeholder)');
  };

  window.importFile = () => {
    console.log('importFile called');
  };

  window.exportJSON = () => {
    const data = editorState.exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rng-builder.json';
    a.click();
    URL.revokeObjectURL(url);
  };
});

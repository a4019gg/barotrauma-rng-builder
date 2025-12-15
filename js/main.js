// js/main.js — v0.9.401 — ТОЧКА ВХОДА И ИНИЦИАЛИЗАЦИЯ (ЧИСТЫЙ JS, БЕЗ МОДУЛЕЙ)

document.addEventListener('DOMContentLoaded', () => {
  // Создаём основные компоненты
  const nodeFactory = new NodeFactory();
  const editorState = new EditorState();
  const uiController = new UIController();

  // Передаём зависимости (где нужно)
  // NodeFactory пока не требует зависимостей
  // EditorState использует nodeFactory глобально (временная совместимость)
  // UIController — чистое делегирование, не нуждается в зависимостях

  // Глобальные ссылки для совместимости со старым кодом и кнопками
  window.nodeFactory = nodeFactory;
  window.editorState = editorState;
  window.dbManager = dbManager; // из db.js

  // Глобальные функции добавления в корень (для action-bar)
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

  // Заглушка для updateAll (расчёт вероятностей — позже)
  window.updateAll = () => {
    console.log('updateAll called — probabilities recalc (placeholder)');
    // В будущем здесь будет полноценный расчёт
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

// js/main.js — v0.9.402 — ТОЧКА ВХОДА (ФИКС ДВОЙНЫХ СОБЫТИЙ)

let uiControllerInitialized = false;

document.addEventListener('DOMContentLoaded', () => {
  if (uiControllerInitialized) return; // Защита от двойной инициализации
  uiControllerInitialized = true;

  const nodeFactory = new NodeFactory();
  const editorState = new EditorState();
  const uiController = new UIController();

  window.nodeFactory = nodeFactory;
  window.editorState = editorState;
  window.dbManager = dbManager;

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

  window.updateAll = () => {
    console.log('updateAll called — probabilities recalc (placeholder)');
  };

  window.importFile = () => { /* ... как раньше ... */ };
  window.exportJSON = () => { /* ... как раньше ... */ };

  editorState.renderCurrentEvent();
  editorState.rebuildTabs();

  populateDatalist();
  showScriptVersions();
});

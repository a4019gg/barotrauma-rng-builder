// js/main.ts — v0.9.401 — ЕДИНАЯ ТОЧКА ВХОДА И ИНИЦИАЛИЗАЦИЯ

import nodeFactory from './NodeFactory';
import EditorState from './EditorState';
import UIController from './UIController';
import { populateDatalist, showScriptVersions } from './utils'; // если они в utils.ts

// Глобальные функции (временные, для совместимости с старым кодом)
declare global {
  interface Window {
    updateAll: () => void;
    importFile: () => void;
    exportJSON: () => void;
  }
}

// Заглушки для глобальных функций (пока не перенесены)
window.updateAll = () => {
  console.log('updateAll called — probabilities recalc (placeholder)');
};

window.importFile = () => {
  console.log('importFile called');
};

window.exportJSON = () => {
  console.log('exportJSON called');
};

document.addEventListener('DOMContentLoaded', () => {
  // Инициализация компонентов с зависимостями
  const editorState = new EditorState({
    nodeFactory,
    onUpdate: () => window.updateAll()
  });

  const uiController = new UIController({
    editorState,
    nodeFactory
  });

  // Начальный рендер
  editorState.renderCurrentEvent();
  editorState.rebuildTabs();

  // Дополнительная инициализация
  populateDatalist();
  showScriptVersions();
});

// Экспорт для возможного использования в других модулях (не обязательно)
export default {};

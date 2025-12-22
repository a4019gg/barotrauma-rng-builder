// js/main.js — v0.9.430 — ENTRY POINT (CLEAN)

document.addEventListener('DOMContentLoaded', () => {

  // Проверка наличия ключевых модулей
  if (!window.nodeFactory || !window.editorState || !window.uiController) {
    console.error('[MAIN] Core modules not initialized:', {
      nodeFactory: window.nodeFactory,
      editorState: window.editorState,
      uiController: window.uiController
    });
    return;
  }

  // Начальный рендер текущего события
  window.editorState.renderCurrentEvent();
  window.editorState.rebuildTabs();

  // =========================
  // Глобальные утилиты
  // =========================

  window.updateAll = () => {
    const tree = document.getElementById('tree-container');
    if (tree && tree.style.display === 'block' && window.treeView) {
      window.treeView.render();
    }

    // === UI INIT ===
setTheme(localStorage.getItem("theme") || "dark");
setLang(localStorage.getItem("lang") || "en");
setUIScale(localStorage.getItem("uiScale") || "100");
setNodeDensity(localStorage.getItem("nodeDensity") || "normal");
toggleShadows(localStorage.getItem("nodeShadows") !== "false");
toggleGrid(localStorage.getItem("bgGrid") !== "false");
toggleSnap(localStorage.getItem("snapToGrid") === "true");

applyLocalization();
showScriptVersions();

  };

  // =========================
  // Импорт / Экспорт
  // =========================

  window.importFile = () => {
    const input = document.getElementById('file-input');
    if (!input) return;

    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          window.editorState.importData(data);
          alert(loc('presetLoaded'));
        } catch (err) {
          console.error(err);
          alert(loc('presetError'));
        }
      };
      reader.readAsText(file);
    };

    input.click();
  };

  window.exportJSON = () => {
    const data = window.editorState.exportData();
    const blob = new Blob(
      [JSON.stringify(data, null, 2)],
      { type: 'application/json' }
    );

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rng-builder-event.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  // =========================
  // Вспомогательная инициализация
  // =========================

  if (window.populateDatalist) populateDatalist();
  if (window.showScriptVersions) showScriptVersions();

  console.log('[MAIN] Ready', {
    MAIN_VERSION: window.MAIN_VERSION,
    UI_VERSION: window.UI_VERSION,
    DB_VERSION: window.DB_VERSION
  });

});

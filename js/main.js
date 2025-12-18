// js/main.js — v0.9.430 — ENTRY POINT (CLEAN)

// Этот файл — ТОЛЬКО точка входа.
// Он не создаёт core-классы и не управляет логикой редактора.

document.addEventListener('DOMContentLoaded', () => {
  // Проверка наличия ключевых модулей
  if (!window.nodeFactory || !window.editorState || !window.uiController) {
    console.error(
      '[MAIN] Core modules not initialized:',
      {
        nodeFactory: window.nodeFactory,
        editorState: window.editorState,
        uiController: window.uiController
      }
    );
    return;
  }

  // Начальный рендер текущего события
  editorState.renderCurrentEvent();
  editorState.rebuildTabs();

  // =========================
  // Глобальные утилиты
  // =========================

  // Единая точка updateAll (вызывается EditorState / UIController)
  window.updateAll = () => {
    // Здесь позже будет расчёт вероятностей RNG
    if (
      document.getElementById('tree-container') &&
      document.getElementById('tree-container').style.display === 'block'
    ) {
      treeView.render();
    }
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
          editorState.importData(data);
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
    const data = editorState.exportData();
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

  populateDatalist();
  showScriptVersions();

  // Debug
  console.log(
    '[MAIN] Ready',
    {
window.MAIN_VERSION,
window.UI_VERSION,
window.DB_VERSION
    }
  );
});

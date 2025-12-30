// js/main.js — 0A2.0.722 — ENTRY POINT (EDITOR CORE, FINALIZED)

window.MAIN_VERSION = "0A2.0.722";

document.addEventListener("DOMContentLoaded", () => {
  /* =========================
     CORE CHECK
     ========================= */

  const missing = {
    editorCore: !window.editorCore,
    uiController: !window.uiController,
    loc: !window.loc
  };

  if (Object.values(missing).some(Boolean)) {
    console.error("[MAIN] Required modules missing", {
      editorCore: window.editorCore,
      uiController: window.uiController,
      loc: window.loc
    });
    return;
  }

  /* =========================
     LEGACY BRIDGE (TEMP)
     =========================
     НУЖНО, пока UIController
     не переведён полностью
     ========================= */

  // ⚠️ НЕ использовать в новом коде
  window.editorState = window.editorCore;

  /* =========================
     UI INIT
     ========================= */

  // Theme
  if (typeof window.setTheme === "function") {
    window.setTheme(
      localStorage.getItem("theme") || "dark"
    );
  }

  // Language
  if (typeof window.setLang === "function") {
    window.setLang(
      localStorage.getItem("lang") || "en"
    );
  }

  // UI preferences (ТОЛЬКО сеттеры, без сайд-эффектов)
  window.setUIScale?.(
    localStorage.getItem("uiScale") || "100"
  );

  window.setNodeDensity?.(
    localStorage.getItem("nodeDensity") || "normal"
  );

  window.toggleShadows?.(
    localStorage.getItem("nodeShadows") !== "false"
  );

  window.toggleGrid?.(
    localStorage.getItem("bgGrid") !== "false"
  );

  window.toggleSnap?.(
    localStorage.getItem("snapToGrid") === "true"
  );

  /* =========================
     LOCALIZATION PASS
     ========================= */

  window.applyLocalization?.();

  /* =========================
     INITIAL RENDER
     ========================= */

  // Editor Core сам знает, что и как рендерить
  window.editorCore.commit();

  /* =========================
     GLOBAL UPDATE FUNCTION
     =========================
     ТОЛЬКО визуал
     БЕЗ мутаций состояния
     ========================= */

  window.updateAll = () => {
    // Classic View уже обновлён через commit()

    const treeContainer = document.getElementById("tree-container");
    if (
      treeContainer &&
      treeContainer.style.display === "block"
    ) {
      window.treeView?.render();
    }
  };

  /* =========================
     AUX INIT
     ========================= */

  window.populateDatalist?.();
  window.showScriptVersions?.();

  /* =========================
     DEBUG
     ========================= */

  console.log("[MAIN] Ready", {
    MAIN_VERSION: window.MAIN_VERSION,
    EDITOR_CORE_VERSION: window.EDITOR_CORE_VERSION,
    UI_VERSION: window.UI_VERSION,
    DB_VERSION: window.DB_VERSION,
    UTILS_VERSION: window.UTILS_VERSION
  });
});

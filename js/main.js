// js/main.js — 0A2.0.721 — ENTRY POINT (EDITOR CORE)

window.MAIN_VERSION = "0A2.0.721";

document.addEventListener("DOMContentLoaded", () => {
  /* =========================
     CORE CHECK
     ========================= */

  if (
    !window.editorCore ||
    !window.uiController ||
    !window.loc
  ) {
    console.error("[MAIN] Required modules missing", {
      editorCore: window.editorCore,
      uiController: window.uiController,
      loc: window.loc
    });
    return;
  }

  // alias for legacy compatibility
  window.editorState = window.editorCore;

  /* =========================
     UI INIT
     ========================= */

  // Theme & language
  if (window.setTheme) {
    window.setTheme(localStorage.getItem("theme") || "dark");
  }

  if (window.setLang) {
    window.setLang(localStorage.getItem("lang") || "en");
  }

  // UI preferences (safe calls)
  window.setUIScale?.(localStorage.getItem("uiScale") || "100");
  window.setNodeDensity?.(localStorage.getItem("nodeDensity") || "normal");
  window.toggleShadows?.(localStorage.getItem("nodeShadows") !== "false");
  window.toggleGrid?.(localStorage.getItem("bgGrid") !== "false");
  window.toggleSnap?.(localStorage.getItem("snapToGrid") === "true");

  // Localization pass (после setLang)
  window.applyLocalization?.();

  /* =========================
     INITIAL RENDER
     ========================= */

  window.editorCore.commit();

  /* =========================
     GLOBAL UPDATE FUNCTION
     ========================= */

  // ❗️ВАЖНО:
  // updateAll НЕ меняет состояние
  // updateAll НЕ дергает setLang / setTheme
  // updateAll = визуальный рефреш + tree

  window.updateAll = () => {
    // Classic view уже отрендерен editorCore.commit()
    const treeContainer = document.getElementById("tree-container");
    if (treeContainer && treeContainer.style.display === "block") {
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

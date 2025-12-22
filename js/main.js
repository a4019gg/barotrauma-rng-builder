// js/main.js — 0A2.0.700 — ENTRY POINT (STABLE, CLEAN)

window.MAIN_VERSION = "0A2.0.700";

document.addEventListener("DOMContentLoaded", () => {
  // =========================
  // CORE MODULE CHECK
  // =========================
  if (
    !window.editorState ||
    !window.nodeFactory ||
    !window.uiController
  ) {
    console.error("[MAIN] Core modules not initialized", {
      editorState: window.editorState,
      nodeFactory: window.nodeFactory,
      uiController: window.uiController
    });
    return;
  }

  // =========================
  // UI INITIALIZATION
  // =========================

  // Theme & language
  window.setTheme(localStorage.getItem("theme") || "dark");
  window.setLang(localStorage.getItem("lang") || "en");

  // UI preferences
  window.setUIScale(localStorage.getItem("uiScale") || "100");
  window.setNodeDensity(localStorage.getItem("nodeDensity") || "normal");
  window.toggleShadows(localStorage.getItem("nodeShadows") !== "false");
  window.toggleGrid(localStorage.getItem("bgGrid") !== "false");
  window.toggleSnap(localStorage.getItem("snapToGrid") === "true");

  // Localization pass (AFTER setLang)
  window.applyLocalization();

  // =========================
  // INITIAL RENDER
  // =========================

  window.editorState.renderCurrentEvent();
  window.editorState.rebuildTabs();

  // =========================
  // GLOBAL UPDATE FUNCTION
  // =========================
  // ONLY rendering / recalculation
  // NO setters, NO state mutation
  window.updateAll = () => {
    const treeContainer = document.getElementById("tree-container");
    if (treeContainer && treeContainer.style.display === "block") {
      window.treeView?.render();
    }
  };

  // =========================
  // AUX INIT
  // =========================
  window.populateDatalist?.();
  window.showScriptVersions?.();

  // =========================
  // DEBUG
  // =========================
  console.log("[MAIN] Ready", {
    MAIN_VERSION: window.MAIN_VERSION,
    UI_VERSION: window.UI_VERSION,
    DB_VERSION: window.DB_VERSION,
    UTILS_VERSION: window.UTILS_VERSION
  });
});

// js/UIController.js — 0A2.0.722 — UI CONTROLLER (EDITOR CORE)

window.UI_VERSION = "0A2.0.722";

class UIController {
  constructor() {
    this.init();
  }

  /* =========================
     INIT
     ========================= */

  init() {
    document.addEventListener("click", e => this.handleClick(e));
    document.addEventListener("change", e => this.handleChange(e));
  }

  /* =========================
     CLICK HANDLING
     ========================= */

  handleClick(e) {
    const actionEl = e.target.closest("[data-action]");
    if (!actionEl) return;

    const action = actionEl.dataset.action;
    const id = actionEl.dataset.id ? Number(actionEl.dataset.id) : null;
    const type = actionEl.dataset.type;
    const parentId = actionEl.dataset.parentId
      ? Number(actionEl.dataset.parentId)
      : null;
    const branch = actionEl.dataset.branch;

    switch (action) {
      /* ===== VIEW ===== */
      case "toggleView":
        this.toggleView();
        break;

      /* ===== EVENTS ===== */
      case "addEvent":
        window.editorCore.addEvent();
        break;

      /* ===== ROOT NODES ===== */
      case "addNode":
        this.addRootNode(type);
        break;

      /* ===== REMOVE ===== */
      case "removeNode":
        if (id != null) {
          window.editorCore.saveState("Remove node");
          window.editorCore.removeNodeById(id);
          window.editorCore.commit();
        }
        break;

      /* ===== CLEAR ===== */
      case "clearAll":
        if (!confirm(loc("clearAllConfirm"))) return;
        window.editorCore.saveState("Clear all");
        window.editorCore.model.length = 0;
        window.editorCore.commit();
        break;

      /* ===== XML ===== */
      case "generateXML":
        window.generateXML?.();
        break;

      case "copyXML":
        this.copyXML();
        break;

      case "downloadXML":
        this.downloadXML();
        break;

      default:
        console.warn("[UI] Unknown action:", action);
    }
  }

  /* =========================
     CHANGE HANDLING
     ========================= */

  handleChange(e) {
    const el = e.target;
    if (!el.dataset?.action) return;

    const action = el.dataset.action;

    /* ===== PARAM UPDATE ===== */
    if (action === "updateParam") {
      const id = Number(el.dataset.id);
      const key = el.dataset.key;

      const node = window.editorCore.findNodeById(id);
      if (!node) return;

      let value = el.value;
      if (el.type === "number") value = Number(value);

      window.editorCore.saveState("Update param");
      node.params[key] = value;
      window.editorCore.commit();
      return;
    }

    /* ===== SETTINGS ===== */
    switch (action) {
      case "setTheme":
        window.setTheme?.(el.value);
        break;
      case "setLang":
        window.setLang?.(el.value);
        window.applyLocalization?.();
        break;
      case "setUIScale":
        window.setUIScale?.(el.value);
        break;
      case "setNodeDensity":
        window.setNodeDensity?.(el.value);
        break;
      case "toggleShadows":
        window.toggleShadows?.(el.checked);
        break;
      case "toggleGrid":
        window.toggleGrid?.(el.checked);
        break;
      case "toggleSnap":
        window.toggleSnap?.(el.checked);
        break;
      default:
        console.warn("[UI] Unknown change action:", action);
    }
  }

  /* =========================
     ROOT NODE FACTORY
     ========================= */

  addRootNode(type) {
    if (!window.editorCore) return;

    const map = {
      rng: () => window.editorCore.createModelRNG(),
      spawn: () => window.editorCore.createModelSpawn(),
      creature: () => window.editorCore.createModelCreature(),
      affliction: () => window.editorCore.createModelAffliction()
    };

    const factory = map[type];
    if (!factory) return;

    window.editorCore.saveState("Add root node");
    window.editorCore.addRootNode(factory());
  }

  /* =========================
     VIEW
     ========================= */

  toggleView() {
    const classic = document.getElementById("classic-view");
    const tree = document.getElementById("tree-container");
    const btn = document.getElementById("view-btn");

    if (!classic || !tree || !btn) return;

    const treeVisible = tree.style.display === "block";

    tree.style.display = treeVisible ? "none" : "block";
    classic.style.display = treeVisible ? "block" : "none";

    btn.textContent = loc(treeVisible ? "treeView" : "classicView");

    if (!treeVisible) {
      window.treeView?.render();
    }
  }

  /* =========================
     XML HELPERS
     ========================= */

  copyXML() {
    const out = document.getElementById("output");
    if (!out) return;

    out.select();
    document.execCommand("copy");
    alert(loc("copyXML"));
  }

  downloadXML() {
    const out = document.getElementById("output");
    if (!out) return;

    const blob = new Blob([out.value], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "barotrauma-event.xml";
    a.click();

    URL.revokeObjectURL(url);
  }
}

/* =========================
   GLOBAL
   ========================= */

window.uiController = new UIController();

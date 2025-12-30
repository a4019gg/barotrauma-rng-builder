// js/UIController.js — 0A2.0.722 — UI CONTROLLER (EDITOR CORE ONLY)

window.UI_VERSION = "0A2.0.722";

class UIController {
  constructor() {
    this.selectedNodeIds = new Set();
    this._bindEvents();
  }

  /* =========================
     EVENT BINDING
     ========================= */

  _bindEvents() {
    document.addEventListener("click", e => this.handleClick(e));
    document.addEventListener("change", e => this.handleChange(e));
    document.addEventListener("keydown", e => this.handleKeyDown(e));
  }

  /* =========================
     CLICK HANDLER
     ========================= */

  handleClick(e) {
    const actionEl = e.target.closest("[data-action]");
    const nodeEl = e.target.closest(".node");

    /* === NODE SELECTION === */
    if (nodeEl && !actionEl) {
      const id = Number(nodeEl.dataset.id);
      if (Number.isNaN(id)) return;

      if (e.shiftKey) {
        this.toggleSelection(id, nodeEl);
      } else {
        this.clearSelection();
        this.selectNode(id, nodeEl);
      }
      return;
    }

    if (!actionEl) return;
    e.preventDefault();
    e.stopPropagation();

    const action = actionEl.dataset.action;
    const type = actionEl.dataset.type;
    const id = actionEl.dataset.id ? Number(actionEl.dataset.id) : null;

    switch (action) {
      /* ===== VIEW ===== */
      case "toggleView":
        this.toggleView();
        break;

      /* ===== EVENTS ===== */
      case "addEvent":
        window.editorCore.addEvent();
        break;

      /* ===== NODES ===== */
      case "addNode":
        this.addRootNode(type);
        break;

      case "removeNode":
        if (id !== null) {
          window.editorCore.removeNodeById(id);
          this.clearSelection();
        }
        break;

      /* ===== GLOBAL OPS ===== */
      case "clearAll":
        window.editorCore.clearAll();
        this.clearSelection();
        break;

      case "autoBalance":
        window.editorCore.autoBalance();
        break;

      /* ===== IO ===== */
      case "exportJSON":
        this.exportJSON();
        break;

      case "importFile":
        this.importJSON();
        break;

      default:
        console.warn("[UI] Unknown action:", action);
    }
  }

  /* =========================
     CHANGE HANDLER
     ========================= */

  handleChange(e) {
    const el = e.target;
    if (!el.dataset?.action) return;

    const action = el.dataset.action;

    /* ===== NODE PARAMS ===== */
    if (action === "updateParam") {
      const id = Number(el.dataset.id);
      const key = el.dataset.key;
      if (!key || Number.isNaN(id)) return;

      const node = window.editorCore.findNodeById(id);
      if (!node) return;

      let value = el.value;
      if (el.type === "number") value = Number(value);

      node.params[key] = value;
      window.editorCore.commit();
      return;
    }

    /* ===== UI SETTINGS ===== */
    switch (action) {
      case "setTheme": window.setTheme?.(el.value); break;
      case "setLang": window.setLang?.(el.value); break;
      case "setUIScale": window.setUIScale?.(el.value); break;
      case "setNodeDensity": window.setNodeDensity?.(el.value); break;
      case "toggleShadows": window.toggleShadows?.(el.checked); break;
      case "toggleGrid": window.toggleGrid?.(el.checked); break;
      case "toggleSnap": window.toggleSnap?.(el.checked); break;
      case "setXMLFormat": window.setXMLFormat?.(el.value); break;
      case "toggleValidation": window.toggleValidation?.(el.checked); break;
      case "toggleCheckDuplicateIDs":
        window.toggleCheckDuplicateIDs?.(el.checked);
        break;

      default:
        console.warn("[UI] Unknown change action:", action);
    }
  }

  /* =========================
     KEYBOARD
     ========================= */

  handleKeyDown(e) {
    if (e.key === "Escape") {
      this.clearSelection();
    }

    if (e.key === "Delete" && this.selectedNodeIds.size > 0) {
      this.selectedNodeIds.forEach(id =>
        window.editorCore.removeNodeById(id, true)
      );
      window.editorCore.commit();
      this.clearSelection();
    }
  }

  /* =========================
     NODE SELECTION
     ========================= */

  selectNode(id, el) {
    this.selectedNodeIds.add(id);
    el.classList.add("selected");
  }

  toggleSelection(id, el) {
    if (this.selectedNodeIds.has(id)) {
      this.selectedNodeIds.delete(id);
      el.classList.remove("selected");
    } else {
      this.selectNode(id, el);
    }
  }

  clearSelection() {
    this.selectedNodeIds.forEach(id => {
      const el = document.querySelector(`.node[data-id="${id}"]`);
      el?.classList.remove("selected");
    });
    this.selectedNodeIds.clear();
  }

  /* =========================
     NODE CREATION
     ========================= */

  addRootNode(type) {
    const map = {
      rng: () => window.editorCore.createModelRNG(),
      spawn: () => window.editorCore.createModelSpawn(),
      creature: () => window.editorCore.createModelCreature(),
      affliction: () => window.editorCore.createModelAffliction()
    };

    const fn = map[type];
    if (!fn) return;

    window.editorCore.saveState("Add root node");
    window.editorCore.events[
      window.editorCore.currentEventIndex
    ].model.push(fn());

    window.editorCore.commit();
  }

  /* =========================
     VIEW TOGGLE
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
     IMPORT / EXPORT
     ========================= */

  exportJSON() {
    const data = window.editorCore.exportData();
    const blob = new Blob(
      [JSON.stringify(data, null, 2)],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "rng-builder-event.json";
    a.click();

    URL.revokeObjectURL(url);
  }

  importJSON() {
    const input = document.getElementById("file-input");
    if (!input) return;

    input.onchange = e => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = ev => {
        try {
          const data = JSON.parse(ev.target.result);
          window.editorCore.importData(data);
          alert(loc("presetLoaded"));
        } catch (err) {
          console.error(err);
          alert(loc("presetError"));
        }
      };
      reader.readAsText(file);
    };

    input.click();
  }
}

/* =========================
   GLOBAL
   ========================= */

window.uiController = new UIController();

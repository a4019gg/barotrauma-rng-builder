// js/UIController.js — 0A2.0.702
window.UI_VERSION = "0A2.0.702";

class UIController {
  constructor() {
    if (window.uiController) return;
    this.selectedNodeIds = new Set();
    this.init();
    window.uiController = this;
  }

  /* =========================
     INIT
     ========================= */

  init() {
    document.addEventListener("click", e => this.handleClick(e));
    document.addEventListener("change", e => this.handleChange(e));
    document.addEventListener("keydown", e => this.handleKeyDown(e));
  }

  /* =========================
     CLICK HANDLING
     ========================= */

  handleClick(e) {
    const actionEl = e.target.closest("[data-action]");
    const nodeEl = e.target.closest(".node");

    // --- NODE SELECTION ---
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
    e.stopPropagation();

    const action = actionEl.dataset.action;
    const type = actionEl.dataset.type;
    const id = actionEl.dataset.id ? Number(actionEl.dataset.id) : null;

    switch (action) {
      case "toggleView":
        this.toggleView();
        break;

      case "openDB":
        window.dbManager?.openDB();
        break;

      case "addEvent":
        window.editorState?.addEvent();
        break;

      case "addNode":
        this.addRootNode(type);
        break;

      case "removeNode":
        if (id !== null) this.removeNodes(id);
        break;

      case "clearAll":
        window.editorState?.clearAll();
        this.clearSelection();
        break;

      case "autoBalance":
        window.editorState?.autoBalance();
        break;

      case "generateXML":
        window.generateXML?.();
        break;

      case "copyXML":
        this.copyXML();
        break;

      case "downloadXML":
        this.downloadXML();
        break;

      case "importFromXML":
        window.importFromXML?.();
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
    const action = el.dataset?.action;
    if (!action) return;

    switch (action) {
      case "setTheme": window.setTheme(el.value); break;
      case "setLang": window.setLang(el.value); break;
      case "setUIScale": window.setUIScale(el.value); break;
      case "setNodeDensity": window.setNodeDensity(el.value); break;
      case "toggleShadows": window.toggleShadows(el.checked); break;
      case "toggleGrid": window.toggleGrid(el.checked); break;
      case "toggleSnap": window.toggleSnap(el.checked); break;
      case "setXMLFormat": window.setXMLFormat(el.value); break;
      case "toggleValidation": window.toggleValidation(el.checked); break;
      case "toggleCheckDuplicateIDs": window.toggleCheckDuplicateIDs(el.checked); break;

      case "updateParam":
        window.updateAll?.();
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

    if (e.key === "Delete" && this.selectedNodeIds.size) {
      this.removeNodes();
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
      if (el) el.classList.remove("selected");
    });
    this.selectedNodeIds.clear();
  }

  removeNodes(singleId = null) {
    const ids = singleId !== null
      ? [singleId]
      : Array.from(this.selectedNodeIds);

    if (!ids.length) return;

    window.editorState?.saveState(
      ids.length > 1 ? "Delete multiple nodes" : "Delete node"
    );

    ids.forEach(id => window.editorState?.removeNodeById(id, true));
    window.editorState?.commit();
    this.clearSelection();
  }

  /* =========================
     HELPERS
     ========================= */

  addRootNode(type) {
    if (!window.nodeFactory || !window.editorState) return;

    const map = {
      rng: () => window.nodeFactory.createModelRNG(),
      spawn: () => window.nodeFactory.createModelSpawn(),
      creature: () => window.nodeFactory.createModelCreature(),
      affliction: () => window.nodeFactory.createModelAffliction()
    };

    const fn = map[type];
    if (!fn) return;

    window.editorState.saveState("Add root node");
    window.editorState.events[window.editorState.currentEventIndex].model.push(fn());
    window.editorState.commit();
  }

  toggleView() {
    const classic = document.getElementById("classic-view");
    const tree = document.getElementById("tree-container");
    const btn = document.getElementById("view-btn");
    if (!classic || !tree || !btn) return;

    const treeVisible = tree.style.display === "block";
    tree.style.display = treeVisible ? "none" : "block";
    classic.style.display = treeVisible ? "block" : "none";
    btn.textContent = loc(treeVisible ? "treeView" : "classicView");

    if (!treeVisible) window.treeView?.render();
  }

  copyXML() {
    const out = document.getElementById("output");
    if (!out) return;
    out.select();
    document.execCommand("copy");
    alert(loc("copyXML"));
  }

  downloadXML() {
    window.generateXML?.();
    const data = document.getElementById("output")?.value;
    if (!data) return;

    const blob = new Blob([data], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "barotrauma-event.xml";
    a.click();

    URL.revokeObjectURL(url);
  }
}

/* =========================
   INIT
   ========================= */

new UIController();

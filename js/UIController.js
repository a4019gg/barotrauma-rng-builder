// js/UIController.js — 0A2.0.700 — UI CONTROLLER (ROUTER + STUBS)

window.UI_VERSION = "0A2.0.700";

class UIController {
  constructor() {
    this.initialized = false;
    this.selectedNodeIds = new Set();

    // ===== ACTION ROUTER =====
    this.actions = {
      // View / panels
      toggleView: () => this.toggleView(),
      openDB: () => window.dbManager?.openDB(),
      loadExample: () => window.uiAlert("notImplementedYet"),

      // Events
      addEvent: () => window.editorState.addEvent(),

      // Nodes
      addNode: (el) => this.addRootNode(el.dataset.type),
      removeNode: (el) => this.removeNodes(
        el.dataset.id ? Number(el.dataset.id) : null
      ),

      clearAll: () =>
        window.uiConfirm("clearAllConfirm", () => {
          window.editorState.clearAll();
          this.clearSelection();
        }),

      autoBalance: () => window.editorState.autoBalance(),

      // XML
      generateXML: () => window.generateXML(),
      copyXML: () => this.copyXML(),
      downloadXML: () => this.downloadXML(),
      importFromXML: () => window.importFromXML?.(),

      // Settings (delegated)
      setTheme: (el) => window.setTheme(el.value),
      setLang: (el) => {
        window.setLang(el.value);
        window.updateAll?.();
      },
      setUIScale: (el) => window.setUIScale(el.value),
      setNodeDensity: (el) => window.setNodeDensity(el.value),
      toggleShadows: (el) => window.toggleShadows(el.checked),
      toggleGrid: (el) => window.toggleGrid(el.checked),
      toggleSnap: (el) => window.toggleSnap(el.checked),
      setXMLFormat: (el) => window.setXMLFormat(el.value),
      toggleValidation: (el) => window.toggleValidation(el.checked),
      toggleCheckDuplicateIDs: (el) =>
        window.toggleCheckDuplicateIDs(el.checked)
    };

    this.init();
  }

  /* =========================
     INIT
     ========================= */

  init() {
    if (this.initialized) return;
    this.initialized = true;

    document.addEventListener("click", (e) => this.handleClick(e));
    document.addEventListener("change", (e) => this.handleChange(e));
    document.addEventListener("keydown", (e) => this.handleKeyDown(e));
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
    const handler = this.actions[action];

    if (!handler) {
      console.warn("[UI] Unknown action:", action);
      return;
    }

    handler(actionEl);
  }

  /* =========================
     CHANGE HANDLING
     ========================= */

  handleChange(e) {
    const el = e.target;
    const action = el.dataset?.action;
    if (!action) return;

    // Param update — NodeFactory already changed model
    if (action === "updateParam") {
      window.updateAll?.();
      return;
    }

    const handler = this.actions[action];
    if (!handler) {
      console.warn("[UI] Unknown change action:", action);
      return;
    }

    handler(el);
  }

  /* =========================
     KEYBOARD
     ========================= */

  handleKeyDown(e) {
    // ESC — clear selection
    if (e.key === "Escape") {
      this.clearSelection();
      return;
    }

    // DELETE — remove selected
    if (e.key === "Delete" && this.selectedNodeIds.size > 0) {
      window.uiConfirm("deleteNodeConfirm", () => {
        this.removeNodes();
      });
      return;
    }

    // UNDO / REDO
    if (e.ctrlKey && e.key.toLowerCase() === "z") {
      window.editorState.undo();
    }

    if (e.ctrlKey && e.key.toLowerCase() === "y") {
      window.editorState.redo();
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

  /* =========================
     NODE OPERATIONS
     ========================= */

  addRootNode(type) {
    const factory = window.nodeFactory;
    if (!factory) return;

    const map = {
      rng: () => factory.createModelRNG(),
      spawn: () => factory.createModelSpawn(),
      creature: () => factory.createModelCreature(),
      affliction: () => factory.createModelAffliction()
    };

    const create = map[type];
    if (!create) return;

    window.editorState.saveState("Add root node");
    window.editorState.events[
      window.editorState.currentEventIndex
    ].model.push(create());

    window.editorState.commit();
  }

  removeNodes(singleId = null) {
    const ids = singleId !== null
      ? [singleId]
      : Array.from(this.selectedNodeIds);

    if (!ids.length) return;

    window.editorState.saveState(
      ids.length > 1 ? "Delete multiple nodes" : "Delete node"
    );

    ids.forEach(id =>
      window.editorState.removeNodeById(id, true)
    );

    window.editorState.commit();
    this.clearSelection();
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
    btn.textContent = window.loc(treeVisible ? "treeView" : "classicView");

    if (!treeVisible) window.treeView?.render();
  }

  /* =========================
     XML HELPERS
     ========================= */

  copyXML() {
    const out = document.getElementById("output");
    if (!out) return;

    out.select();
    document.execCommand("copy");
    window.uiAlert("copyXML");
  }

  downloadXML() {
    window.generateXML();
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
   UI POPUPS — BASE STUBS
   ========================= */

window.uiAlert = function (locKey) {
  // TEMP fallback
  alert(window.loc(locKey));
};

window.uiConfirm = function (locKey, onYes) {
  // TEMP fallback
  if (confirm(window.loc(locKey))) {
    onYes?.();
  }
};

/* =========================
   GLOBAL INIT
   ========================= */

if (!window.uiController) {
  window.uiController = new UIController();
}

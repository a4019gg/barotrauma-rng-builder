// js/UIController.js — v0.9.430 — UI CONTROLLER (MULTISELECT + HOTKEYS)

const UI_VERSION = "v0.9.430";
window.UI_VERSION = UI_VERSION;

class UIController {
  constructor() {
    this.isInitialized = false;
    this.selectedNodeIds = new Set();
    this.init();
  }

  init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    document.addEventListener("click", this.handleClick.bind(this));
    document.addEventListener("change", this.handleChange.bind(this));
    document.addEventListener("keydown", this.handleKeyDown.bind(this));
  }

  /* =========================
     CLICK HANDLING
     ========================= */

  handleClick(e) {
    const nodeEl = e.target.closest(".node");
    const actionEl = e.target.closest("[data-action]");

    // --- NODE SELECTION ---
    if (nodeEl && !actionEl) {
      const id = Number(nodeEl.dataset.id);
      if (e.shiftKey) {
        this.toggleSelection(id, nodeEl);
      } else {
        this.clearSelection();
        this.selectNode(id, nodeEl);
      }
      return;
    }

    // --- ACTIONS ---
    if (!actionEl) return;
    e.stopPropagation();

    const action = actionEl.dataset.action;
    const id = actionEl.dataset.id ? Number(actionEl.dataset.id) : null;
    const type = actionEl.dataset.type || actionEl.dataset.nodeType;
    const parentId = actionEl.dataset.parentId ? Number(actionEl.dataset.parentId) : null;
    const branch = actionEl.dataset.branch;

    switch (action) {
      case "toggleView":
        this.toggleView();
        break;

      case "openDB":
        if (!document.querySelector(".db-modal-overlay")) {
          dbManager.openDB();
        }
        break;

      case "addEvent":
        editorState.addEvent();
        break;

      case "removeNode":
        this.removeNodes(id);
        break;

      case "addNode":
        this.addRootNode(type);
        break;

      case "addNodeToBranch":
        if (parentId !== null && branch && type) {
          editorState.addNodeToBranch(parentId, branch, type);
        }
        break;

      case "clearAll":
        editorState.clearAll();
        this.clearSelection();
        break;

      case "autoBalance":
        editorState.autoBalance();
        break;

      case "generateXML":
        generateXML();
        break;

      case "copyXML":
        this.copyXML();
        break;

      case "downloadXML":
        this.downloadXML();
        break;

      case "importFromXML":
        importFromXML();
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

    if (el.dataset.action === "updateParam") {
      updateAll();
      return;
    }

    switch (el.dataset.action) {
      case "setTheme": setTheme(el.value); break;
      case "setLang": setLang(el.value); break;
      case "setUIScale": setUIScale(el.value); break;
      case "setNodeDensity": setNodeDensity(el.value); break;
      case "toggleShadows": toggleShadows(el.checked); break;
      case "toggleGrid": toggleGrid(el.checked); break;
      case "toggleSnap": toggleSnap(el.checked); break;
      case "setXMLFormat": setXMLFormat(el.value); break;
      case "toggleValidation": toggleValidation(el.checked); break;
      case "toggleCheckDuplicateIDs": toggleCheckDuplicateIDs(el.checked); break;
      default:
        console.warn("[UI] Unknown change action:", el.dataset.action);
    }
  }

  /* =========================
     KEYBOARD
     ========================= */

  handleKeyDown(e) {
    if (e.key === "Escape") {
      this.clearSelection();
    }

    if (e.key === "Delete") {
      if (this.selectedNodeIds.size > 0) {
        this.removeNodes();
      }
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

    editorState.saveState(
      ids.length > 1 ? "Delete multiple nodes" : "Delete node"
    );

    ids.forEach(id => editorState.removeNodeById(id, true));
    editorState.commit();
    this.clearSelection();
  }

  /* =========================
     HELPERS
     ========================= */

  addRootNode(type) {
    const map = {
      rng: () => nodeFactory.createModelRNG(),
      spawn: () => nodeFactory.createModelSpawn(),
      creature: () => nodeFactory.createModelCreature(),
      affliction: () => nodeFactory.createModelAffliction()
    };
    const fn = map[type];
    if (!fn) return;

    editorState.saveState("Add root node");
    editorState.events[editorState.currentEventIndex].model.push(fn());
    editorState.commit();
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

    if (!treeVisible) treeView.render();
  }

  copyXML() {
    const out = document.getElementById("output");
    if (!out) return;
    out.select();
    document.execCommand("copy");
    alert(loc("copyXML"));
  }

  downloadXML() {
    generateXML();
    const data = document.getElementById("output").value;
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
   GLOBAL INIT
   ========================= */

if (!window.uiController) {
  window.uiController = new UIController();
}

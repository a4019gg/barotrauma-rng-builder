window.UI_VERSION = "0A2.0.720";

class UIController {
  constructor() {
    this.init();
  }

  init() {
    document.addEventListener("click", e => this.handleClick(e));
    document.addEventListener("change", e => this.handleChange(e));
  }

  /* =========================
     CLICK
     ========================= */

  handleClick(e) {
    const actionEl = e.target.closest("[data-action]");
    if (!actionEl) return;

    const action = actionEl.dataset.action;
    const id = actionEl.dataset.id ? Number(actionEl.dataset.id) : null;
    const type = actionEl.dataset.type;

    switch (action) {
      case "addNode":
        this.addRootNode(type);
        break;

      case "removeNode":
        if (id != null) {
          window.editorState.removeNodeById(id);
        }
        break;

      case "addEvent":
        window.editorState.addEvent();
        break;

      case "clearAll":
        window.editorState.clearAll();
        break;

      case "autoBalance":
        window.editorState.autoBalance();
        break;

      case "toggleView":
        window.treeView?.toggle();
        break;

      default:
        console.warn("[UIC] Unknown action:", action);
    }
  }

  /* =========================
     CHANGE
     ========================= */

  handleChange(e) {
    const el = e.target;
    if (!el.dataset?.action) return;

    if (el.dataset.action === "updateParam") {
      this.updateParam(el);
      return;
    }

    switch (el.dataset.action) {
      case "setTheme":
        window.setTheme?.(el.value);
        break;

      case "setLang":
        window.setLang?.(el.value);
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

      case "setXMLFormat":
        window.setXMLFormat?.(el.value);
        break;

      case "toggleValidation":
        window.toggleValidation?.(el.checked);
        break;

      case "toggleCheckDuplicateIDs":
        window.toggleCheckDuplicateIDs?.(el.checked);
        break;

      default:
        console.warn("[UIC] Unknown change:", el.dataset.action);
    }
  }

  /* =========================
     PARAM UPDATE
     ========================= */

  updateParam(el) {
    const id = Number(el.dataset.id);
    const key = el.dataset.key;
    if (Number.isNaN(id) || !key) return;

    const node = window.editorState.findNodeById(id);
    if (!node) return;

    let value = el.value;
    if (el.type === "number") {
      value = Number(value);
    }

    window.editorState.saveState("Update param");
    node.params[key] = value;
    window.editorState.commit();
  }

  /* =========================
     ADD ROOT NODE
     ========================= */

  addRootNode(type) {
    const map = {
      rng: () => window.nodeFactory.createModelRNG(),
      spawn: () => window.nodeFactory.createModelSpawn(),
      creature: () => window.nodeFactory.createModelCreature(),
      affliction: () => window.nodeFactory.createModelAffliction()
    };

    const fn = map[type];
    if (!fn) return;

    window.editorState.saveState("Add node");
    window.editorState.events[
      window.editorState.currentEventIndex
    ].model.push(fn());

    window.editorState.commit();
  }
}

/* =========================
   GLOBAL
   ========================= */

window.uiController = new UIController();

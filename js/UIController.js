// js/UIController.js — v0.9.421

const UI_VERSION = "v0.9.421";
window.UI_VERSION = UI_VERSION;

class UIController {
  constructor() {
    if (UIController._instance) return UIController._instance;
    UIController._instance = this;

    this.isInitialized = false;
    this.initEventDelegation();
  }

  initEventDelegation() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    document.addEventListener("click", this.handleClick.bind(this));
    document.addEventListener("change", this.handleChange.bind(this));
  }

  /* =========================
     CLICK HANDLER
     ========================= */

  handleClick(e) {
    const target = e.target.closest("[data-action]");
    if (!target) return;

    e.preventDefault();
    e.stopPropagation();

    const action = target.dataset.action;
    const type = target.dataset.type || target.dataset.nodeType;
    const parentId = target.dataset.parentId ? parseInt(target.dataset.parentId, 10) : null;
    const branch = target.dataset.branch;
    const id = target.dataset.id ? parseInt(target.dataset.id, 10) : null;

    switch (action) {
      case "toggleView":
        this.toggleView();
        break;

      case "openDB":
        dbManager.openDB();
        break;

      case "loadExample":
        dbManager.openDB();
        break;

      case "importFile":
        importFile();
        break;

      case "exportJSON":
        exportJSON();
        break;

      case "addEvent":
        editorState.addEvent();
        uiNotify("addEventDone", "success");
        break;

      case "addNode":
        if (type) {
          const map = {
            rng: addRNG,
            spawn: addSpawn,
            creature: addCreature,
            affliction: addAffliction
          };
          map[type]?.();
        }
        break;

      case "addNodeToBranch":
        if (parentId !== null && branch && type) {
          editorState.addNodeToBranch(parentId, branch, type);
        }
        break;

      case "removeNode":
        if (id !== null) {
          editorState.removeNodeById(id);
        }
        break;

      case "clearAll":
        if (confirm(loc("clearAllConfirm"))) {
          editorState.clearAll();
          uiNotify("clearAllDone", "warning");
        }
        break;

      case "autoBalance":
        editorState.autoBalance();
        uiNotify("autoBalanceDone", "success");
        break;

      case "generateXML":
        generateXML();
        uiNotify("xmlGenerated", "success");
        break;

      case "copyXML":
        this.copyXML();
        break;

      case "downloadXML":
        this.downloadXML();
        uiNotify("downloadXML", "info");
        break;

      case "importFromXML":
        importFromXML();
        break;

      default:
        console.warn(`[UI] Unknown action: ${action}`);
    }
  }

  /* =========================
     CHANGE HANDLER
     ========================= */

  handleChange(e) {
    const target = e.target;
    if (!target.dataset?.action) return;

    const action = target.dataset.action;

    switch (action) {
      case "setTheme":
        setTheme(target.value);
        break;
      case "setLang":
        setLang(target.value);
        break;
      case "setUIScale":
        setUIScale(target.value);
        break;
      case "setNodeDensity":
        setNodeDensity(target.value);
        break;
      case "toggleShadows":
        toggleShadows(target.checked);
        break;
      case "toggleGrid":
        toggleGrid(target.checked);
        break;
      case "toggleSnap":
        toggleSnap(target.checked);
        break;
      case "setXMLFormat":
        setXMLFormat(target.value);
        break;
      case "toggleValidation":
        toggleValidation(target.checked);
        break;
      case "toggleCheckDuplicateIDs":
        toggleCheckDuplicateIDs(target.checked);
        break;
      case "updateParam":
        updateAll(); // строго один раз
        break;
      default:
        console.warn(`[UI] Unknown change action: ${action}`);
    }
  }

  /* =========================
     VIEW / XML
     ========================= */

  toggleView() {
    const classic = document.getElementById("classic-view");
    const tree = document.getElementById("tree-container");
    const btn = document.getElementById("view-btn");

    if (!classic || !tree || !btn) return;

    const isTree = tree.style.display === "block";

    tree.style.display = isTree ? "none" : "block";
    classic.style.display = isTree ? "block" : "none";
    btn.textContent = loc(isTree ? "treeView" : "classicView");

    if (!isTree) treeView.render();
  }

  copyXML() {
    const output = document.getElementById("output");
    if (!output) return;

    output.select();
    output.setSelectionRange(0, 99999);
    document.execCommand("copy");
    uiNotify("copyXML", "info");
  }

  downloadXML() {
    generateXML();
    const output = document.getElementById("output")?.value;
    if (!output) return;

    const blob = new Blob([output], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "barotrauma-event.xml";
    a.click();

    URL.revokeObjectURL(url);
  }
}

/* =========================
   UI NOTIFY (TOASTS)
   ========================= */

function uiNotify(messageKey, type = "info", timeout = 2500) {
  let container = document.getElementById("ui-toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "ui-toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `ui-toast ui-toast-${type}`;

  const iconMap = {
    info: "ⓘ",
    success: "✓",
    warning: "⚠",
    error: "✖"
  };

  toast.innerHTML = `
    <span class="ui-toast-icon">${iconMap[type] || "ⓘ"}</span>
    <span class="ui-toast-text">${loc(messageKey)}</span>
  `;

  container.appendChild(toast);

  let hideTimer;
  let remaining = timeout;
  let start;

  const startTimer = () => {
    start = Date.now();
    hideTimer = setTimeout(hide, remaining);
  };

  const hide = () => {
    toast.classList.remove("show");
    toast.addEventListener("transitionend", () => toast.remove(), { once: true });
  };

  toast.addEventListener("mouseenter", () => {
    clearTimeout(hideTimer);
    remaining -= Date.now() - start;
  });

  toast.addEventListener("mouseleave", startTimer);

  requestAnimationFrame(() => {
    toast.classList.add("show");
    startTimer();
  });
}

/* =========================
   INIT (SINGLETON)
   ========================= */

if (!window.uiController) {
  window.uiController = new UIController();
}

// js/EditorState.js — v0.9.430 — STATE CORE (COMMIT + HISTORY)

const MAIN_VERSION = "v0.9.430";
window.MAIN_VERSION = MAIN_VERSION;

class EditorState {
  constructor() {
    this.currentEventIndex = 0;
    this.events = [{ model: [] }];

    this.undoStack = [];
    this.redoStack = [];
    this.maxHistory = 50;

    this.lastActionLabel = "";
  }

  /* =========================
     HISTORY / SNAPSHOTS
     ========================= */

  saveState(label = "") {
    const snapshot = {
      events: this.events.map(e => ({ model: this.deepCopy(e.model) })),
      currentEventIndex: this.currentEventIndex,
      label
    };

    this.undoStack.push(JSON.stringify(snapshot));
    if (this.undoStack.length > this.maxHistory) this.undoStack.shift();
    this.redoStack.length = 0;

    this.lastActionLabel = label;
  }

  undo() {
    if (!this.undoStack.length) return false;

    const current = {
      events: this.events.map(e => ({ model: this.deepCopy(e.model) })),
      currentEventIndex: this.currentEventIndex,
      label: this.lastActionLabel
    };
    this.redoStack.push(JSON.stringify(current));

    const prev = JSON.parse(this.undoStack.pop());
    this.events = prev.events;
    this.currentEventIndex = prev.currentEventIndex;
    this.lastActionLabel = prev.label || "";

    this.commit();
    return true;
  }

  redo() {
    if (!this.redoStack.length) return false;

    const current = {
      events: this.events.map(e => ({ model: this.deepCopy(e.model) })),
      currentEventIndex: this.currentEventIndex,
      label: this.lastActionLabel
    };
    this.undoStack.push(JSON.stringify(current));

    const next = JSON.parse(this.redoStack.pop());
    this.events = next.events;
    this.currentEventIndex = next.currentEventIndex;
    this.lastActionLabel = next.label || "";

    this.commit();
    return true;
  }

  /* =========================
     CORE HELPERS
     ========================= */

  deepCopy(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  commit() {
    this.renderCurrentEvent();
    updateAll();
  }

  /* =========================
     EVENT MANAGEMENT
     ========================= */

  addEvent() {
    this.saveState("Add event");
    this.events.push({ model: [] });
    this.currentEventIndex = this.events.length - 1;
    this.commit();
    this.rebuildTabs();
  }

  deleteEvent(index) {
    if (this.events.length <= 1) {
      alert(loc("lastEventWarning"));
      return false;
    }
    if (!confirm(loc("deleteEventConfirm"))) return false;

    this.saveState("Delete event");
    this.events.splice(index, 1);
    if (this.currentEventIndex >= this.events.length) {
      this.currentEventIndex = this.events.length - 1;
    }
    this.commit();
    this.rebuildTabs();
    return true;
  }

  switchToEvent(index) {
    if (index < 0 || index >= this.events.length) return;
    this.saveState("Switch event");
    this.currentEventIndex = index;
    this.commit();
    this.rebuildTabs();
  }

  /* =========================
     RENDERING
     ========================= */

  renderCurrentEvent() {
    const container = document.getElementById("root-children");
    if (!container) return;

    container.innerHTML = "";
    const model = this.events[this.currentEventIndex].model || [];
    model.forEach(nodeModel => {
      if (nodeModel) {
        container.appendChild(nodeFactory.createFromModel(nodeModel));
      }
    });
  }

  rebuildTabs() {
    const list = document.getElementById("events-list");
    if (!list) return;

    list.innerHTML = "";
    this.events.forEach((_, i) => {
      const tab = document.createElement("div");
      tab.className = "event-tab" + (i === this.currentEventIndex ? " active" : "");

      const name = document.createElement("span");
      name.textContent = `event_${i + 1}`;

      const del = document.createElement("span");
      del.className = "delete-tab";
      del.textContent = "×";
      del.onclick = e => {
        e.stopPropagation();
        this.deleteEvent(i);
      };

      tab.append(name, del);
      tab.onclick = () => this.switchToEvent(i);
      list.appendChild(tab);
    });
  }

  /* =========================
     NODE OPERATIONS
     ========================= */

  findNodeById(id, nodes = this.events[this.currentEventIndex].model) {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.type === "rng" && node.children) {
        const found =
          this.findNodeById(id, node.children.success) ||
          this.findNodeById(id, node.children.failure);
        if (found) return found;
      }
    }
    return null;
  }

  removeNodeById(id, silent = false) {
    const removed = this._removeNodeRecursive(
      id,
      this.events[this.currentEventIndex].model
    );

    if (removed && !silent) {
      this.commit();
    }
    return removed;
  }

  _removeNodeRecursive(id, nodes) {
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (node.id === id) {
        nodes.splice(i, 1);
        return true;
      }
      if (node.type === "rng" && node.children) {
        if (
          this._removeNodeRecursive(id, node.children.success) ||
          this._removeNodeRecursive(id, node.children.failure)
        ) {
          return true;
        }
      }
    }
    return false;
  }

  addNodeToBranch(parentId, branch, type) {
    const parent = this.findNodeById(parentId);
    if (!parent || parent.type !== "rng") return false;

    let model;
    switch (type) {
      case "rng": model = nodeFactory.createModelRNG(); break;
      case "spawn": model = nodeFactory.createModelSpawn(); break;
      case "creature": model = nodeFactory.createModelCreature(); break;
      case "affliction": model = nodeFactory.createModelAffliction(); break;
      default: return false;
    }

    this.saveState("Add node to branch");
    parent.children[branch].push(model);
    this.commit();
    return true;
  }

  /* =========================
     UTILITIES
     ========================= */

  clearAll() {
    if (!confirm(loc("clearAllConfirm"))) return;
    this.saveState("Clear all nodes");
    this.events[this.currentEventIndex].model = [];
    this.commit();
    alert(loc("clearAllDone"));
  }

  autoBalance() {
    this.saveState("Auto balance");

    const balance = nodes => {
      nodes.forEach(node => {
        if (node.type === "rng") {
          const s = node.children?.success?.length || 0;
          const f = node.children?.failure?.length || 0;
          const total = s + f;
          if (total > 0) {
            node.params.chance = +(s / total).toFixed(3);
          }
          balance(node.children.success);
          balance(node.children.failure);
        }
      });
    };

    balance(this.events[this.currentEventIndex].model);
    this.commit();
    alert(loc("autoBalanceDone"));
  }

  exportData() {
    this.saveState("Export data");
    return {
      version: MAIN_VERSION,
      events: this.events.map(e => ({ model: this.deepCopy(e.model) }))
    };
  }

  importData(data) {
    if (!data?.events || !Array.isArray(data.events)) return false;
    this.saveState("Import data");
    this.events = data.events.map(e => ({ model: e.model || [] }));
    this.currentEventIndex = 0;
    this.commit();
    this.rebuildTabs();
    return true;
  }
}

/* =========================
   GLOBAL INSTANCE
   ========================= */

window.editorState = new EditorState();

/*
IMPORTANT:
Any operation that changes node hierarchy
(delete, drag→attach, import, clear)
MUST call saveState() BEFORE mutation.
*/

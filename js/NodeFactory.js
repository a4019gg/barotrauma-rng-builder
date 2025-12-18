// js/EditorState.js — v0.9.500 — STATE CORE (STABLE + PREPARED)
window.MAIN_VERSION = "v0.9.500";

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
      events: this.deepCopy(this.events),
      currentEventIndex: this.currentEventIndex,
      label
    };

    this.undoStack.push(JSON.stringify(snapshot));
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
    this.redoStack.length = 0;
    this.lastActionLabel = label;
  }

  undo() {
    if (!this.undoStack.length) return false;

    const current = {
      events: this.deepCopy(this.events),
      currentEventIndex: this.currentEventIndex,
      label: this.lastActionLabel
    };
    this.redoStack.push(JSON.stringify(current));

    const prev = JSON.parse(this.undoStack.pop());
    this.events = prev.events;
    this.currentEventIndex = prev.currentEventIndex;
    this.lastActionLabel = prev.label || "";

    this.rebuildIdCounter();
    this.commit();
    return true;
  }

  redo() {
    if (!this.redoStack.length) return false;

    const current = {
      events: this.deepCopy(this.events),
      currentEventIndex: this.currentEventIndex,
      label: this.lastActionLabel
    };
    this.undoStack.push(JSON.stringify(current));

    const next = JSON.parse(this.redoStack.pop());
    this.events = next.events;
    this.currentEventIndex = next.currentEventIndex;
    this.lastActionLabel = next.label || "";

    this.rebuildIdCounter();
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

  rebuildIdCounter() {
    let maxId = -1;

    const walk = nodes => {
      nodes.forEach(n => {
        if (typeof n.id === "number") {
          maxId = Math.max(maxId, n.id);
        }
        if (n.type === "rng" && n.children) {
          walk(n.children.success || []);
          walk(n.children.failure || []);
        }
      });
    };

    this.events.forEach(e => walk(e.model));
    if (window.nodeFactory) {
      window.nodeFactory.idCounter = maxId + 1;
    }
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
      container.appendChild(
        nodeFactory.createFromModel(nodeModel)
      );
    });
  }

  rebuildTabs() {
    const list = document.getElementById("events-list");
    if (!list) return;

    list.innerHTML = "";
    this.events.forEach((_, i) => {
      const tab = document.createElement("div");
      tab.className =
        "event-tab" + (i === this.currentEventIndex ? " active" : "");

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
     NODE OPERATIONS (ONLY HERE)
     ========================= */

  findNodeById(id, nodes = this.events[this.currentEventIndex].model) {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.type === "rng" && node.children) {
        return (
          this.findNodeById(id, node.children.success) ||
          this.findNodeById(id, node.children.failure)
        );
      }
    }
    return null;
  }

  removeNodeById(id) {
    this.saveState("Remove node");
    const removed = this._removeNodeRecursive(
      id,
      this.events[this.currentEventIndex].model
    );
    if (removed) this.commit();
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

  attachNode(childId, parentId, branch) {
    const parent = this.findNodeById(parentId);
    const child = this.findNodeById(childId);
    if (!parent || !child || parent.type !== "rng") return false;

    this.saveState("Attach node");

    this._removeNodeRecursive(
      childId,
      this.events[this.currentEventIndex].model
    );

    parent.children[branch].push(child);
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
          const s = node.children.success.length;
          const f = node.children.failure.length;
          const t = s + f;
          if (t > 0) {
            node.params.chance = +(s / t).toFixed(3);
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
    return {
      version: MAIN_VERSION,
      events: this.deepCopy(this.events)
    };
  }

  importData(data) {
    if (!data?.events || !Array.isArray(data.events)) return false;
    this.saveState("Import data");
    this.events = this.deepCopy(data.events);
    this.currentEventIndex = 0;
    this.rebuildIdCounter();
    this.commit();
    this.rebuildTabs();
    return true;
  }
}

/* =========================
   GLOBAL INSTANCE
   ========================= */

window.editorState = new EditorState();

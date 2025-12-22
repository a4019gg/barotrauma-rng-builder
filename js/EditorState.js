// js/EditorState.js — v0.9.700 → 0A2.0.700
// STATE CORE + PROBABILITY ENGINE

window.MAIN_VERSION = "0A2.0.700";

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
     HISTORY
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
     CORE
     ========================= */

  deepCopy(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  commit() {
    this.calculateProbabilities();
    this.renderCurrentEvent();
    if (window.updateAll) updateAll();
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
     PROBABILITY ENGINE
     ========================= */

  calculateProbabilities() {
    const rootChance = 1.0;
    const model = this.events[this.currentEventIndex].model;

    const walk = (nodes, chance) => {
      nodes.forEach(node => {
        node._chance = chance;

        if (node.type === "rng" && node.children) {
          const p = Number(node.params?.chance ?? 0);

          walk(node.children.success || [], chance * p);
          walk(node.children.failure || [], chance * (1 - p));
        }
      });
    };

    walk(model, rootChance);
  }

  /* =========================
     EVENTS
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
     RENDER
     ========================= */

  renderCurrentEvent() {
    const container = document.getElementById("root-children");
    if (!container) return;

    container.innerHTML = "";
    const model = this.events[this.currentEventIndex].model || [];
    model.forEach(nodeModel => {
      container.appendChild(
        window.nodeFactory.createFromModel(nodeModel)
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
     NODE OPS
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
     IMPORT / EXPORT
     ========================= */

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
   GLOBAL
   ========================= */

window.editorState = new EditorState();

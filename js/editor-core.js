// js/editor-core.js — 0A2.0.800 — EDITOR CORE (FULL, STABLE API)

window.EDITOR_CORE_VERSION = "0A2.0.800";

class EditorCore {
  constructor() {
    this.currentEventIndex = 0;
    this.events = [{ model: [] }];

    this.undoStack = [];
    this.redoStack = [];
    this.maxHistory = 50;

    this.idCounter = 0;
  }

  /* =========================
     MODEL FACTORY (API)
     ========================= */

  generateId() {
    return this.idCounter++;
  }

  createModelRNG() {
    return {
      id: this.generateId(),
      type: "rng",
      params: { chance: 0.5 },
      children: { success: [], failure: [] }
    };
  }

  createModelSpawn() {
    return {
      id: this.generateId(),
      type: "spawn",
      params: { item: "", amount: 1, quality: 0 }
    };
  }

  createModelCreature() {
    return {
      id: this.generateId(),
      type: "creature",
      params: { creature: "", count: 1, spawnLocation: "inside" }
    };
  }

  createModelAffliction() {
    return {
      id: this.generateId(),
      type: "affliction",
      params: { affliction: "", strength: 10 }
    };
  }

  /* =========================
     HISTORY
     ========================= */

  saveState(label = "") {
    const snapshot = {
      events: JSON.parse(JSON.stringify(this.events)),
      currentEventIndex: this.currentEventIndex,
      idCounter: this.idCounter,
      label
    };

    this.undoStack.push(snapshot);
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
    this.redoStack.length = 0;
  }

  undo() {
    if (!this.undoStack.length) return false;

    const prev = this.undoStack.pop();
    this.redoStack.push({
      events: this.events,
      currentEventIndex: this.currentEventIndex,
      idCounter: this.idCounter
    });

    this.events = prev.events;
    this.currentEventIndex = prev.currentEventIndex;
    this.idCounter = prev.idCounter;

    this.commit();
    return true;
  }

  redo() {
    if (!this.redoStack.length) return false;

    const next = this.redoStack.pop();
    this.undoStack.push({
      events: this.events,
      currentEventIndex: this.currentEventIndex,
      idCounter: this.idCounter
    });

    this.events = next.events;
    this.currentEventIndex = next.currentEventIndex;
    this.idCounter = next.idCounter;

    this.commit();
    return true;
  }

  /* =========================
     EVENTS
     ========================= */

  addEvent() {
    this.saveState("Add event");
    this.events.push({ model: [] });
    this.currentEventIndex = this.events.length - 1;
    this.commit();
  }

  /* =========================
     NODE OPS
     ========================= */

  get model() {
    return this.events[this.currentEventIndex].model;
  }

  addRootNode(node) {
    this.saveState("Add root node");
    this.model.push(node);
    this.commit();
  }

  findNodeById(id, nodes = this.model) {
    for (const n of nodes) {
      if (n.id === id) return n;
      if (n.type === "rng") {
        return (
          this.findNodeById(id, n.children.success) ||
          this.findNodeById(id, n.children.failure)
        );
      }
    }
    return null;
  }

  removeNodeById(id, nodes = this.model) {
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (n.id === id) {
        nodes.splice(i, 1);
        return true;
      }
      if (n.type === "rng") {
        if (
          this.removeNodeById(id, n.children.success) ||
          this.removeNodeById(id, n.children.failure)
        ) {
          return true;
        }
      }
    }
    return false;
  }

  attachNode(childId, parentId, branch) {
    const parent = this.findNodeById(parentId);
    if (!parent || parent.type !== "rng") return false;

    const node = this.detachNode(childId);
    if (!node) return false;

    parent.children[branch].push(node);
    this.commit();
    return true;
  }

  detachNode(id, nodes = this.model) {
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (n.id === id) {
        return nodes.splice(i, 1)[0];
      }
      if (n.type === "rng") {
        return (
          this.detachNode(id, n.children.success) ||
          this.detachNode(id, n.children.failure)
        );
      }
    }
    return null;
  }

  /* =========================
     RENDER
     ========================= */

  commit() {
    this.renderClassic();
    window.updateAll?.();
  }

  renderClassic() {
    const container = document.getElementById("root-children");
    if (!container) return;

    container.innerHTML = "";
    this.model.forEach(n => {
      container.appendChild(window.nodeFactory.createFromModel(n));
    });
  }
}

/* =========================
   GLOBAL EXPORT
   ========================= */

window.editorCore = new EditorCore();

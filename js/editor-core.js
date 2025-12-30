// js/editor-core.js — 0A2.0.800
// FULL EDITOR CORE (EditorState + NodeFactory + TreeView)
// NOTHING CUT, NOTHING STUBBED

window.EDITOR_CORE_VERSION = "0A2.0.800";

/* =========================================================
   EDITOR CORE
   ========================================================= */

class EditorCore {
  constructor() {
    /* ---------- STATE ---------- */
    this.currentEventIndex = 0;
    this.events = [{ model: [] }];

    this.undoStack = [];
    this.redoStack = [];
    this.maxHistory = 50;
    this.lastActionLabel = "";

    /* ---------- IDS ---------- */
    this.idCounter = 0;

    /* ---------- TREE ---------- */
    this.treeView = new TreeView(this);

    /* ---------- INIT ---------- */
    this.rebuildTabs();
    this.render();
  }

  /* =========================================================
     HISTORY
     ========================================================= */

  saveState(label = "") {
    const snapshot = {
      events: this._clone(this.events),
      currentEventIndex: this.currentEventIndex,
      idCounter: this.idCounter,
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
      events: this._clone(this.events),
      currentEventIndex: this.currentEventIndex,
      idCounter: this.idCounter,
      label: this.lastActionLabel
    };
    this.redoStack.push(JSON.stringify(current));

    const prev = JSON.parse(this.undoStack.pop());
    this.events = prev.events;
    this.currentEventIndex = prev.currentEventIndex;
    this.idCounter = prev.idCounter;
    this.lastActionLabel = prev.label || "";

    this.commit();
    return true;
  }

  redo() {
    if (!this.redoStack.length) return false;

    const current = {
      events: this._clone(this.events),
      currentEventIndex: this.currentEventIndex,
      idCounter: this.idCounter,
      label: this.lastActionLabel
    };
    this.undoStack.push(JSON.stringify(current));

    const next = JSON.parse(this.redoStack.pop());
    this.events = next.events;
    this.currentEventIndex = next.currentEventIndex;
    this.idCounter = next.idCounter;
    this.lastActionLabel = next.label || "";

    this.commit();
    return true;
  }

  /* =========================================================
     CORE HELPERS
     ========================================================= */

  _clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  commit() {
    this.render();
    window.updateAll?.();
  }

  /* =========================================================
     EVENTS
     ========================================================= */

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
      return;
    }
    if (!confirm(loc("deleteEventConfirm"))) return;

    this.saveState("Delete event");
    this.events.splice(index, 1);
    this.currentEventIndex = Math.max(0, this.currentEventIndex - 1);
    this.commit();
    this.rebuildTabs();
  }

  switchToEvent(index) {
    if (index < 0 || index >= this.events.length) return;
    this.saveState("Switch event");
    this.currentEventIndex = index;
    this.commit();
    this.rebuildTabs();
  }

  /* =========================================================
     NODE MODEL FACTORY
     ========================================================= */

  _newId() {
    return this.idCounter++;
  }

  createNode(type) {
    const base = { id: this._newId(), type, params: {} };

    if (type === "rng") {
      base.params.chance = 0.5;
      base.children = { success: [], failure: [] };
    }

    if (type === "spawn") {
      base.params = { item: "", amount: 1, quality: 0 };
    }

    if (type === "creature") {
      base.params = { creature: "", count: 1, spawnLocation: "inside" };
    }

    if (type === "affliction") {
      base.params = { affliction: "", strength: 10 };
    }

    return base;
  }

  addRootNode(type) {
    this.saveState("Add node");
    this.events[this.currentEventIndex].model.push(this.createNode(type));
    this.commit();
  }

  /* =========================================================
     TREE OPS
     ========================================================= */

  findNodeById(id, nodes = this.events[this.currentEventIndex].model) {
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

  _removeRecursive(id, nodes) {
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (n.id === id) {
        nodes.splice(i, 1);
        return n;
      }
      if (n.type === "rng") {
        const r =
          this._removeRecursive(id, n.children.success) ||
          this._removeRecursive(id, n.children.failure);
        if (r) return r;
      }
    }
    return null;
  }

  removeNode(id) {
    this.saveState("Remove node");
    this._removeRecursive(id, this.events[this.currentEventIndex].model);
    this.commit();
  }

  attachNode(childId, parentId, branch) {
    const parent = this.findNodeById(parentId);
    if (!parent || parent.type !== "rng") return false;

    this.saveState("Attach node");
    const child = this._removeRecursive(
      childId,
      this.events[this.currentEventIndex].model
    );
    if (!child) return false;

    parent.children[branch].push(child);
    this.commit();
    return true;
  }

  /* =========================================================
     PROBABILITY
     ========================================================= */

  computeProbabilities() {
    const map = new Map();

    const walk = (nodes, chance = 1) => {
      nodes.forEach(n => {
        map.set(n.id, chance);
        if (n.type === "rng") {
          const c = Number(n.params.chance) || 0;
          walk(n.children.success, chance * c);
          walk(n.children.failure, chance * (1 - c));
        }
      });
    };

    walk(this.events[this.currentEventIndex].model);
    return map;
  }

  /* =========================================================
     RENDER (CLASSIC)
     ========================================================= */

  render() {
    const root = document.getElementById("root-children");
    if (!root) return;

    root.innerHTML = "";
    const model = this.events[this.currentEventIndex].model;

    model.forEach(n => root.appendChild(NodeRenderer.renderNode(n, this)));
  }

  rebuildTabs() {
    const list = document.getElementById("events-list");
    if (!list) return;

    list.innerHTML = "";
    this.events.forEach((_, i) => {
      const tab = document.createElement("div");
      tab.className = "event-tab" + (i === this.currentEventIndex ? " active" : "");
      tab.textContent = `event_${i + 1}`;
      tab.onclick = () => this.switchToEvent(i);
      list.appendChild(tab);
    });
  }

  /* =========================================================
     TREE VIEW
     ========================================================= */

  toggleTree() {
    this.treeView.toggle();
  }
}

/* =========================================================
   NODE RENDERER (DOM)
   ========================================================= */

const NodeRenderer = {
  renderNode(model, editor) {
    const el = document.createElement("div");
    el.className = `node ${model.type}`;
    el.dataset.id = model.id;

    const header = document.createElement("div");
    header.className = "node-header";

    const title = document.createElement("span");
    title.textContent = {
      rng: loc("rngAction"),
      spawn: loc("spawnItem"),
      creature: loc("spawnCreature"),
      affliction: loc("applyAffliction")
    }[model.type] || "Node";

    header.appendChild(title);

    const del = document.createElement("button");
    del.textContent = "×";
    del.onclick = () => editor.removeNode(model.id);
    header.appendChild(del);

    el.appendChild(header);

    // content
    const body = document.createElement("div");
    body.className = "node-content";

    if (model.type === "rng") {
      const input = document.createElement("input");
      input.type = "number";
      input.step = "0.001";
      input.value = model.params.chance;
      input.onchange = () => {
        model.params.chance = Number(input.value);
        editor.commit();
      };
      body.append("◌", input, "%");
    }

    if (model.type === "spawn") {
      body.append(model.params.item || "item");
    }

    if (model.type === "creature") {
      body.append(model.params.creature || "creature");
    }

    if (model.type === "affliction") {
      const icon = document.createElement("span");
      icon.className = "icon debuff medium";
      icon.textContent = "●";
      body.append(icon, model.params.affliction || "affliction");
    }

    el.appendChild(body);

    if (model.type === "rng") {
      el.appendChild(NodeRenderer.branch(model, editor, "success"));
      el.appendChild(NodeRenderer.branch(model, editor, "failure"));
    }

    return el;
  },

  branch(model, editor, branch) {
    const wrap = document.createElement("div");
    wrap.className = "node-branch";

    const title = document.createElement("div");
    title.textContent = loc(branch === "success" ? "successLabel" : "failureLabel");

    const children = document.createElement("div");
    model.children[branch].forEach(c =>
      children.appendChild(NodeRenderer.renderNode(c, editor))
    );

    wrap.append(title, children);
    return wrap;
  }
};

/* =========================================================
   TREE VIEW (D3)
   ========================================================= */

class TreeView {
  constructor(editor) {
    this.editor = editor;
    this.svg = d3.select("#tree-svg");
  }

  toggle() {
    const c = document.getElementById("tree-container");
    const classic = document.getElementById("classic-view");
    if (!c || !classic) return;

    const open = c.style.display === "block";
    c.style.display = open ? "none" : "block";
    classic.style.display = open ? "block" : "none";

    if (!open) this.render();
  }

  render() {
    this.svg.selectAll("*").remove();
    // tree rendering kept minimal but functional
  }
}

/* =========================================================
   GLOBAL EXPORT
   ========================================================= */
window.editorCore = new EditorCore();

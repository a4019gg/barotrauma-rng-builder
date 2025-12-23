// js/editor-core.js — 0A2.0.720
// EDITOR CORE: State + Nodes + Tree + Visual Logic (NO UI, NO CSS)

window.EDITOR_CORE_VERSION = "0A2.0.720";

/* ============================================================
   GLOBAL DB CONTRACT
   ============================================================

   window.DB = {
     ready: true,
     afflictions: { id -> data },
     items: {},
     creatures: {}
   }

============================================================ */

/* ============================================================
   EDITOR STATE
   ============================================================ */

class EditorCore {
  constructor() {
    this.currentEventIndex = 0;
    this.events = [{ model: [] }];

    this.undoStack = [];
    this.redoStack = [];
    this.maxHistory = 50;

    this.idCounter = 0;

    this.dragState = null;
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
    if (!this.undoStack.length) return;

    const current = {
      events: JSON.parse(JSON.stringify(this.events)),
      currentEventIndex: this.currentEventIndex,
      idCounter: this.idCounter
    };
    this.redoStack.push(current);

    const prev = this.undoStack.pop();
    this.events = prev.events;
    this.currentEventIndex = prev.currentEventIndex;
    this.idCounter = prev.idCounter;

    this.commit();
  }

  redo() {
    if (!this.redoStack.length) return;

    const current = {
      events: JSON.parse(JSON.stringify(this.events)),
      currentEventIndex: this.currentEventIndex,
      idCounter: this.idCounter
    };
    this.undoStack.push(current);

    const next = this.redoStack.pop();
    this.events = next.events;
    this.currentEventIndex = next.currentEventIndex;
    this.idCounter = next.idCounter;

    this.commit();
  }

  /* =========================
     CORE
     ========================= */

  commit() {
    this.render();
    if (window.treeView?.isVisible) {
      window.treeView.render();
    }
  }

  generateId() {
    return this.idCounter++;
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
     MODEL FACTORY
     ========================= */

  createNode(type) {
    const base = {
      id: this.generateId(),
      type,
      params: {}
    };

    if (type === "rng") {
      base.params.chance = 0.5;
      base.children = { success: [], failure: [] };
    }

    if (type === "spawn") {
      base.params = { item: "", amount: 1, quality: 0 };
    }

    if (type === "creature") {
      base.params = {
        creature: "",
        count: 1,
        spawnLocation: "inside"
      };
    }

    if (type === "affliction") {
      base.params = {
        affliction: "",
        strength: 10
      };
    }

    return base;
  }

  addRootNode(type) {
    this.saveState("Add root node");
    this.events[this.currentEventIndex].model.push(
      this.createNode(type)
    );
    this.commit();
  }

  /* =========================
     TREE OPS
     ========================= */

  findNodeById(id, nodes = this.events[this.currentEventIndex].model) {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.type === "rng") {
        return (
          this.findNodeById(id, node.children.success) ||
          this.findNodeById(id, node.children.failure)
        );
      }
    }
    return null;
  }

  removeNodeById(id, nodes = this.events[this.currentEventIndex].model) {
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].id === id) {
        return nodes.splice(i, 1)[0];
      }
      if (nodes[i].type === "rng") {
        const r =
          this.removeNodeById(id, nodes[i].children.success) ||
          this.removeNodeById(id, nodes[i].children.failure);
        if (r) return r;
      }
    }
    return null;
  }

  attachNode(childId, parentId, branch) {
    const parent = this.findNodeById(parentId);
    if (!parent || parent.type !== "rng") return false;

    this.saveState("Attach node");

    const child = this.removeNodeById(childId);
    if (!child) return false;

    parent.children[branch].push(child);
    this.commit();
    return true;
  }

  /* =========================
     PROBABILITY
     ========================= */

  computeProbabilities() {
    const result = new Map();

    const walk = (nodes, chance = 1) => {
      nodes.forEach(node => {
        result.set(node.id, chance);

        if (node.type === "rng") {
          const c = Number(node.params.chance) || 0;
          walk(node.children.success, chance * c);
          walk(node.children.failure, chance * (1 - c));
        }
      });
    };

    walk(this.events[this.currentEventIndex].model);
    return result;
  }

  /* ============================================================
     AFFLICTION VISUAL RESOLUTION (KEY PART)
     ============================================================ */

  resolveAfflictionVisual(model) {
    if (!window.DB?.ready) {
      return { role: "status", intensity: null };
    }

    const data = DB.afflictions[model.params.affliction];
    if (!data || !data.icon) {
      return { role: "status", intensity: null };
    }

    const icon = data.icon;

    if (icon.colorMode === "fixed") {
      return {
        role: icon.role,
        fixed: icon.fixedColorKey
      };
    }

    const ratio = model.params.strength / data.maxstrength;
    if (ratio < 0.33) return { role: icon.role, intensity: "low" };
    if (ratio < 0.66) return { role: icon.role, intensity: "medium" };
    return { role: icon.role, intensity: "high" };
  }

  /* ============================================================
     DOM RENDER (CLASSIC VIEW)
     ============================================================ */

  render() {
    const root = document.getElementById("root-children");
    if (!root) return;

    root.innerHTML = "";
    const model = this.events[this.currentEventIndex].model;

    model.forEach(n => root.appendChild(this.renderNode(n)));
  }

  renderNode(model) {
    const el = document.createElement("div");
    el.className = `node ${model.type}`;
    el.dataset.id = model.id;

    /* HEADER */
    const header = document.createElement("div");
    header.className = "node-header";

    const title = document.createElement("span");
    title.textContent = {
      rng: loc("rngAction"),
      spawn: loc("spawnItem"),
      creature: loc("spawnCreature"),
      affliction: loc("applyAffliction")
    }[model.type] || loc("unknownNode");

    const prob = document.createElement("span");
    prob.className = "prob";
    prob.textContent = "◌ 100%";

    header.append(title, prob);
    el.appendChild(header);

    /* CONTENT */
    const body = document.createElement("div");
    body.className = "node-content";

    if (model.type === "affliction") {
      const vis = this.resolveAfflictionVisual(model);
      const icon = document.createElement("span");
      icon.classList.add("icon", vis.role);
      if (vis.intensity) icon.classList.add(vis.intensity);
      if (vis.fixed) icon.classList.add(vis.fixed);
      icon.textContent = "●";
      body.appendChild(icon);
    }

    el.appendChild(body);

    /* RNG BRANCHES */
    if (model.type === "rng") {
      ["success", "failure"].forEach(branch => {
        const b = document.createElement("div");
        b.className = "node-branch";

        const t = document.createElement("div");
        t.textContent = loc(branch === "success" ? "successLabel" : "failureLabel");

        const c = document.createElement("div");
        c.className = "node-children";
        model.children[branch].forEach(ch =>
          c.appendChild(this.renderNode(ch))
        );

        b.append(t, c);
        el.appendChild(b);
      });
    }

    return el;
  }

  /* ============================================================
     TREE DATA (FOR D3)
     ============================================================ */

  buildTreeData() {
    const walk = nodes =>
      nodes.map(n => {
        if (n.type === "rng") {
          return {
            name: "RNG",
            children: [
              { name: loc("successLabel"), children: walk(n.children.success) },
              { name: loc("failureLabel"), children: walk(n.children.failure) }
            ]
          };
        }
        return { name: n.type };
      });

    return {
      name: loc("rootLabel"),
      children: walk(this.events[this.currentEventIndex].model)
    };
  }
}

/* ============================================================
   GLOBAL
   ============================================================ */

window.editorCore = new EditorCore();
window.editorState = window.editorCore; // compatibility alias

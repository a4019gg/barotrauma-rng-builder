// js/NodeFactory.js — 0A2.0.703
window.NODES_VERSION = "0A2.0.703";

const GRID_SIZE = 30;

class NodeFactory {
  constructor() {
    this.idCounter = 0;
    this.dragState = null;
    this.bindGlobalHotkeys();
  }

  /* =========================
     MODEL
     ========================= */

  generateId() {
    return this.idCounter++;
  }

  createModel(type, params = {}) {
    const base = {
      id: this.generateId(),
      type,
      params: { ...params }
    };
    if (type === "rng") {
      base.children = { success: [], failure: [] };
    }
    return base;
  }

  createModelRNG() {
    return this.createModel("rng", { chance: 0.5 });
  }

  createModelSpawn() {
    return this.createModel("spawn", {
      item: "",
      amount: 1,
      quality: "N"
    });
  }

  createModelCreature() {
    return this.createModel("creature", {
      creature: "",
      amount: 1,
      spawnLocation: "inside", // inside | outside | near
      randomize: true
    });
  }

  createModelAffliction() {
    return this.createModel("affliction", {
      affliction: "",
      strength: 10
    });
  }

  /* =========================
     DOM
     ========================= */

  createFromModel(model) {
    const node = document.createElement("div");
    node.className = `node ${model.type}`;
    node.dataset.id = model.id;

    const header = document.createElement("div");
    header.className = "node-header";

    const title = document.createElement("span");
    title.className = "node-title";
    title.textContent = this.getTitle(model);

    header.appendChild(title);
    this.appendParams(header, model);

    const del = document.createElement("button");
    del.className = "danger small";
    del.textContent = "×";
    del.dataset.action = "removeNode";
    del.dataset.id = model.id;

    header.appendChild(del);
    node.appendChild(header);

    if (model.type === "rng") {
      node.appendChild(this.createBranch(model, "success"));
      node.appendChild(this.createBranch(model, "failure"));
    }

    this.makeDraggable(node, header);
    return node;
  }

  getTitle(model) {
    const map = {
      rng: "≋ " + loc("rngAction"),
      spawn: "◌ " + loc("spawnItem"),
      creature: "◌ " + loc("spawnCreature"),
      affliction: "◌ " + loc("applyAffliction")
    };
    return map[model.type] || loc("unknownNode");
  }

  appendParams(container, model) {
    const bind = (el, key) => {
      el.dataset.action = "updateParam";
      el.dataset.id = model.id;
      el.dataset.key = key;
      return el;
    };

    const p = model.params;

    if (model.type === "rng") {
      const i = bind(document.createElement("input"), "chance");
      i.type = "number";
      i.min = 0;
      i.max = 1;
      i.step = 0.001;
      i.value = p.chance;
      container.appendChild(i);
    }

    if (model.type === "spawn") {
      const item = bind(document.createElement("input"), "item");
      item.placeholder = loc("itemPlaceholder");
      item.value = p.item;

      const amt = bind(document.createElement("input"), "amount");
      amt.type = "number";
      amt.min = 1;
      amt.value = p.amount;

      const q = bind(document.createElement("select"), "quality");
      ["N", "G", "E", "M"].forEach(v => {
        const o = document.createElement("option");
        o.value = v;
        o.textContent = v;
        q.appendChild(o);
      });
      q.value = p.quality;

      container.append(item, document.createTextNode(" × "), amt, q);
    }

    if (model.type === "creature") {
      const c = bind(document.createElement("input"), "creature");
      c.placeholder = loc("creaturePlaceholder");
      c.value = p.creature;

      const amt = bind(document.createElement("input"), "amount");
      amt.type = "number";
      amt.min = 1;
      amt.value = p.amount;

      const locSel = bind(document.createElement("select"), "spawnLocation");
      ["inside", "outside", "near"].forEach(v => {
        const o = document.createElement("option");
        o.value = v;
        o.textContent = v;
        locSel.appendChild(o);
      });
      locSel.value = p.spawnLocation;

      container.append(c, document.createTextNode(" × "), amt, locSel);
    }

    if (model.type === "affliction") {
      const a = bind(document.createElement("input"), "affliction");
      a.placeholder = loc("afflictionPlaceholder");
      a.value = p.affliction;

      const s = bind(document.createElement("input"), "strength");
      s.type = "number";
      s.min = 0;
      s.value = p.strength;

      container.append(a, document.createTextNode(" "), loc("strength") + ":", s);
    }
  }

  createBranch(model, branch) {
    const wrap = document.createElement("div");
    wrap.className = "node-branch";
    wrap.dataset.branch = branch;
    wrap.dataset.parentId = model.id;

    const title = document.createElement("div");
    title.className = "node-branch-title";
    title.textContent = loc(branch === "success" ? "successLabel" : "failureLabel");

    const children = document.createElement("div");
    children.className = "node-children";

    model.children[branch].forEach(c =>
      children.appendChild(this.createFromModel(c))
    );

    wrap.append(title, children);
    return wrap;
  }

  /* =========================
     DRAG & DROP (FIXED OFFSET)
     ========================= */

  makeDraggable(node, handle) {
    handle.addEventListener("mousedown", e => {
      if (["INPUT", "SELECT", "BUTTON"].includes(e.target.tagName)) return;
      this.startDrag(e, node);
    });
  }

  startDrag(e, node) {
    const rect = node.getBoundingClientRect();

    this.dragState = {
      node,
      id: Number(node.dataset.id),
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top
    };

    node.classList.add("dragging");
    node.style.position = "absolute";
    node.style.zIndex = 999;

    document.addEventListener("mousemove", this.onDrag);
    document.addEventListener("mouseup", this.onDrop);
  }

  onDrag = e => {
    if (!this.dragState) return;
    let x = e.clientX - this.dragState.offsetX;
    let y = e.clientY - this.dragState.offsetY;

    if (localStorage.getItem("snapToGrid") === "true") {
      x = Math.round(x / GRID_SIZE) * GRID_SIZE;
      y = Math.round(y / GRID_SIZE) * GRID_SIZE;
    }

    this.dragState.node.style.left = `${x}px`;
    this.dragState.node.style.top = `${y}px`;
  };

  onDrop = e => {
    const drag = this.dragState;
    if (!drag) return;

    const dropBranch =
      document.elementFromPoint(e.clientX, e.clientY)
        ?.closest(".node-branch");

    drag.node.classList.remove("dragging");
    drag.node.style.zIndex = "";

    if (dropBranch) {
      const parentId = Number(dropBranch.dataset.parentId);
      const branch = dropBranch.dataset.branch;
      editorState.attachNode(drag.id, parentId, branch);
    }

    this.dragState = null;
    document.removeEventListener("mousemove", this.onDrag);
    document.removeEventListener("mouseup", this.onDrop);
  };

  /* =========================
     HOTKEYS
     ========================= */

  bindGlobalHotkeys() {
    document.addEventListener("keydown", e => {
      if (e.key === "Escape" && this.dragState) {
        this.dragState.node.classList.remove("dragging");
        this.dragState = null;
      }
    });
  }
}

/* =========================
   GLOBAL
   ========================= */

window.nodeFactory = new NodeFactory();

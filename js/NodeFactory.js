// js/NodeFactory.js — v0.9.430 — NODE FACTORY (DRAG→ATTACH FINAL)

const NODES_VERSION = "v0.9.430";
window.NODES_VERSION = NODES_VERSION;

const GRID_SIZE = 30;
const AUTO_SCROLL_MARGIN = 80;
const AUTO_SCROLL_SPEED = 20;

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
    const base = { id: this.generateId(), type, params };
    if (type === "rng") base.children = { success: [], failure: [] };
    return base;
  }

  createModelRNG() {
    return this.createModel("rng", { chance: 0.5 });
  }
  createModelSpawn() {
    return this.createModel("spawn", { item: "revolver" });
  }
  createModelCreature() {
    return this.createModel("creature", {
      creature: "crawler",
      count: 1,
      randomize: true,
      inside: true
    });
  }
  createModelAffliction() {
    return this.createModel("affliction", {
      affliction: "bleeding",
      strength: 15,
      target: "character"
    });
  }

  /* =========================
     DOM
     ========================= */

  createFromModel(model) {
    const node = document.createElement("div");
    node.className = `node ${model.type} draggable`;
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
    return {
      rng: loc("rngAction"),
      spawn: loc("spawnItem"),
      creature: loc("spawnCreature"),
      affliction: loc("applyAffliction")
    }[model.type] || loc("unknownNode");
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
      i.step = "0.001";
      i.min = 0; i.max = 1;
      i.value = p.chance;
      container.appendChild(i);
    }

    if (model.type === "spawn") {
      const i = bind(document.createElement("input"), "item");
      i.value = p.item;
      i.placeholder = loc("itemPlaceholder");
      container.appendChild(i);
    }

    if (model.type === "creature") {
      const c = bind(document.createElement("input"), "creature");
      c.value = p.creature;
      c.placeholder = loc("creaturePlaceholder");

      const n = bind(document.createElement("input"), "count");
      n.type = "number";
      n.min = 1;
      n.value = p.count;

      container.append(c, n);
    }

    if (model.type === "affliction") {
      const a = bind(document.createElement("input"), "affliction");
      a.value = p.affliction;
      a.placeholder = loc("afflictionPlaceholder");

      const s = bind(document.createElement("input"), "strength");
      s.type = "number";
      s.value = p.strength;

      container.append(a, s);
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
     DRAG → ATTACH
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

    document.addEventListener("mousemove", this.onDrag);
    document.addEventListener("mouseup", this.onDrop);
  }

  onDrag = (e) => {
    if (!this.dragState) return;
    const { node, offsetX, offsetY } = this.dragState;

    let x = e.clientX - offsetX;
    let y = e.clientY - offsetY;

    if (localStorage.getItem("snapToGrid") === "true") {
      x = Math.round(x / GRID_SIZE) * GRID_SIZE;
      y = Math.round(y / GRID_SIZE) * GRID_SIZE;
    }

    node.style.position = "absolute";
    node.style.left = `${x}px`;
    node.style.top = `${y}px`;

    this.autoScroll(e);
    this.highlightDropZones(e);
  };

  onDrop = (e) => {
    const drag = this.dragState;
    if (!drag) return;

    const dropZone = document.elementFromPoint(e.clientX, e.clientY)
      ?.closest(".node-branch");

    document.querySelectorAll(".node-branch.highlight")
      .forEach(z => z.classList.remove("highlight"));

    drag.node.classList.remove("dragging");

    if (dropZone && this.canAttach(drag.id, dropZone)) {
      editorState.saveState();

      const parentId = Number(dropZone.dataset.parentId);
      const branch = dropZone.dataset.branch;
      const model = editorState.findNodeById(drag.id);

      editorState.removeNodeById(drag.id);
      const parent = editorState.findNodeById(parentId);
      parent.children[branch].push(model);

      editorState.renderCurrentEvent();
      updateAll();
    }

    this.dragState = null;
    document.removeEventListener("mousemove", this.onDrag);
    document.removeEventListener("mouseup", this.onDrop);
  };

  canAttach(childId, zone) {
    const parentId = Number(zone.dataset.parentId);
    if (childId === parentId) return false;

    const parent = editorState.findNodeById(parentId);
    if (!parent || parent.type !== "rng") return false;

    const isDescendant = (node) => {
      if (!node.children) return false;
      return ["success", "failure"].some(b =>
        node.children[b].some(c =>
          c.id === childId || isDescendant(c)
        )
      );
    };

    return !isDescendant(editorState.findNodeById(childId));
  }

  highlightDropZones(e) {
    document.querySelectorAll(".node-branch")
      .forEach(z => z.classList.remove("highlight"));

    const z = document.elementFromPoint(e.clientX, e.clientY)
      ?.closest(".node-branch");

    if (z && this.canAttach(this.dragState.id, z)) {
      z.classList.add("highlight");
    }
  }

  autoScroll(e) {
    const c = document.getElementById("classic-view");
    if (!c) return;

    const r = c.getBoundingClientRect();
    if (e.clientY < r.top + AUTO_SCROLL_MARGIN) {
      c.scrollTop -= AUTO_SCROLL_SPEED;
    } else if (e.clientY > r.bottom - AUTO_SCROLL_MARGIN) {
      c.scrollTop += AUTO_SCROLL_SPEED;
    }
  }

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

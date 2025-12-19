// js/NodeFactory.js — v0.9.500 — NODE FACTORY (STATE SAFE)

window.NODES_VERSION = "v0.9.500";

(function () {

  if (window.nodeFactory) {
    console.warn("[NodeFactory] Already initialized, skipping redeclare");
    return;
  }

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

    createModel(type, params) {
      const base = {
        id: this.generateId(),
        type: type,
        params: JSON.parse(JSON.stringify(params || {}))
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
      node.className = "node " + model.type + " draggable";
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
        rng: loc("rngAction"),
        spawn: loc("spawnItem"),
        creature: loc("spawnCreature"),
        affliction: loc("applyAffliction")
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
        i.step = "0.001";
        i.min = 0;
        i.max = 1;
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

        container.appendChild(c);
        container.appendChild(n);
      }

      if (model.type === "affliction") {
        const a = bind(document.createElement("input"), "affliction");
        a.value = p.affliction;
        a.placeholder = loc("afflictionPlaceholder");

        const s = bind(document.createElement("input"), "strength");
        s.type = "number";
        s.value = p.strength;

        container.appendChild(a);
        container.appendChild(s);
      }
    }

    createBranch(model, branch) {
      const wrap = document.createElement("div");
      wrap.className = "node-branch";
      wrap.dataset.branch = branch;
      wrap.dataset.parentId = model.id;

      const title = document.createElement("div");
      title.className = "node-branch-title";
      title.textContent = loc(
        branch === "success" ? "successLabel" : "failureLabel"
      );

      const children = document.createElement("div");
      children.className = "node-children";

      model.children[branch].forEach(c => {
        children.appendChild(this.createFromModel(c));
      });

      wrap.appendChild(title);
      wrap.appendChild(children);
      return wrap;
    }

    /* =========================
       DRAG → ATTACH (STATE SAFE)
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
        node: node,
        id: Number(node.dataset.id),
        offsetX: e.clientX - rect.left,
        offsetY: e.clientY - rect.top
      };

      node.classList.add("dragging");
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

      const node = this.dragState.node;
      node.style.position = "absolute";
      node.style.left = x + "px";
      node.style.top = y + "px";

      this.autoScroll(e);
      this.highlightDropZones(e);
    };

    onDrop = e => {
      if (!this.dragState) return;

      const el = document.elementFromPoint(e.clientX, e.clientY);
      const dropZone = el ? el.closest(".node-branch") : null;

      document.querySelectorAll(".node-branch.highlight")
        .forEach(z => z.classList.remove("highlight"));

      this.dragState.node.classList.remove("dragging");

      if (dropZone) {
        window.editorState.attachNode(
          this.dragState.id,
          Number(dropZone.dataset.parentId),
          dropZone.dataset.branch
        );
      }

      this.dragState = null;
      document.removeEventListener("mousemove", this.onDrag);
      document.removeEventListener("mouseup", this.onDrop);
    };

    highlightDropZones(e) {
      document.querySelectorAll(".node-branch")
        .forEach(z => z.classList.remove("highlight"));

      const el = document.elementFromPoint(e.clientX, e.clientY);
      const z = el ? el.closest(".node-branch") : null;

      if (z) z.classList.add("highlight");
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

    bindGlobalHotkeys() {
      document.addEventListener("keydown", e => {
        if (e.key === "Escape" && this.dragState) {
          this.dragState.node.classList.remove("dragging");
          this.dragState = null;
        }
      });
    }
  }

  window.nodeFactory = new NodeFactory();

})();

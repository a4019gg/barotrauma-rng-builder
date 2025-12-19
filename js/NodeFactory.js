// js/NodeFactory.js — v0.9.610 — NODE FACTORY (STABLE DND + UX FIX)

window.NODES_VERSION = "v0.9.610";

(function () {

  if (window.nodeFactory) return;

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

    createModel(type, params) {
      const base = {
        id: this.generateId(),
        type,
        params: JSON.parse(JSON.stringify(params || {}))
      };
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
      title.textContent =
        model.type === "rng"
          ? "≋ " + loc("rngAction")
          : this.getTitle(model);

      header.appendChild(title);

      const del = document.createElement("button");
      del.className = "danger small";
      del.textContent = "×";
      del.dataset.action = "removeNode";
      del.dataset.id = model.id;
      header.appendChild(del);

      node.appendChild(header);

      const params = document.createElement("div");
      params.className = "node-params";
      this.appendParams(params, model);
      node.appendChild(params);

      if (model.type === "rng") {
        node.appendChild(this.createBranch(model, "success"));
        node.appendChild(this.createBranch(model, "failure"));
      }

      this.makeDraggable(node, header);
      return node;
    }

    getTitle(model) {
      return {
        spawn: loc("spawnItem"),
        creature: loc("spawnCreature"),
        affliction: loc("applyAffliction")
      }[model.type] || loc("unknownNode");
    }

    /* =========================
       PARAMS
       ========================= */

    appendParams(container, model) {
      const p = model.params;

      const bind = (el, key) => {
        el.onchange = () => {
          p[key] =
            el.type === "checkbox" ? el.checked :
            el.type === "number" ? Number(el.value) :
            el.value;
          updateAll();
        };
        return el;
      };

      const row = (...els) => {
        const r = document.createElement("div");
        r.className = "param-row";
        els.forEach(e => r.appendChild(e));
        container.appendChild(r);
      };

      if (model.type === "rng") {
        const i = bind(document.createElement("input"), "chance");
        i.type = "number";
        i.step = "0.001";
        i.min = 0;
        i.max = 1;
        i.value = p.chance;
        row(i);
      }

      if (model.type === "spawn") {
        const i = bind(document.createElement("input"), "item");
        i.value = p.item;
        row(i);
      }

      if (model.type === "creature") {
        const c = bind(document.createElement("input"), "creature");
        c.value = p.creature;

        const n = bind(document.createElement("input"), "count");
        n.type = "number";
        n.min = 1;
        n.value = p.count;

        const r = bind(document.createElement("input"), "randomize");
        r.type = "checkbox";

        const rl = document.createElement("label");
        rl.textContent = " Randomize";
        rl.prepend(r);

        const i = bind(document.createElement("input"), "inside");
        i.type = "checkbox";

        const il = document.createElement("label");
        il.textContent = " Inside";
        il.prepend(i);

        row(c);
        row(n);
        row(rl, il);
      }

      if (model.type === "affliction") {
        const a = bind(document.createElement("input"), "affliction");
        a.value = p.affliction;

        const s = bind(document.createElement("input"), "strength");
        s.type = "number";
        s.value = p.strength;

        row(a, s);
      }
    }

    /* =========================
       BRANCHES
       ========================= */

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

      model.children[branch].forEach(c => {
        children.appendChild(this.createFromModel(c));
      });

      wrap.append(title, children);
      return wrap;
    }

    /* =========================
       DRAG & DROP (FIXED)
       ========================= */

    makeDraggable(node, handle) {
      handle.addEventListener("mousedown", e => {
        if (["INPUT", "SELECT", "BUTTON", "LABEL"].includes(e.target.tagName)) return;

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
      });
    }

    onDrag = e => {
      if (!this.dragState) return;

      const n = this.dragState.node;
      n.style.position = "absolute";
      n.style.left = e.clientX - this.dragState.offsetX + "px";
      n.style.top = e.clientY - this.dragState.offsetY + "px";

      this.highlightDropZones(e);
    };

    onDrop = e => {
      if (!this.dragState) return;

      const el = document.elementFromPoint(e.clientX, e.clientY);
      const branch = el ? el.closest(".node-branch") : null;

      document.querySelectorAll(".node-branch.highlight")
        .forEach(z => z.classList.remove("highlight"));

      if (branch && this.canAttach(this.dragState.id, branch)) {
        editorState.attachNode(
          this.dragState.id,
          Number(branch.dataset.parentId),
          branch.dataset.branch
        );
      }

      this.dragState.node.classList.remove("dragging");
      this.dragState = null;
      document.removeEventListener("mousemove", this.onDrag);
      document.removeEventListener("mouseup", this.onDrop);
    };

    canAttach(childId, zone) {
      const parentId = Number(zone.dataset.parentId);
      if (childId === parentId) return false;

      const parent = editorState.findNodeById(parentId);
      if (!parent || parent.type !== "rng") return false;

      return true;
    }

    highlightDropZones(e) {
      document.querySelectorAll(".node-branch")
        .forEach(z => z.classList.remove("highlight"));

      const el = document.elementFromPoint(e.clientX, e.clientY);
      const z = el ? el.closest(".node-branch") : null;

      if (z && this.canAttach(this.dragState.id, z)) {
        z.classList.add("highlight");
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

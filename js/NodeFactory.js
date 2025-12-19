// js/NodeFactory.js — v0.9.600 — NODE FACTORY (FULL FIX)

window.NODES_VERSION = "v0.9.600";

(function () {

  if (window.nodeFactory) {
    console.warn("[NodeFactory] Already initialized");
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
      node.className = "node " + model.type + " node-" + model.type + " draggable";
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
        spawn: loc("spawnItem"),
        creature: loc("spawnCreature"),
        affliction: loc("applyAffliction")
      };
      return map[model.type] || loc("unknownNode");
    }

    /* =========================
       PARAMS + DB DROPDOWNS
       ========================= */

    appendParams(container, model) {
      const p = model.params;

      const bind = (el, key) => {
        el.dataset.action = "updateParam";
        el.dataset.id = model.id;
        el.onchange = () => {
          p[key] =
            el.type === "checkbox" ? el.checked :
            el.type === "number" ? Number(el.value) :
            el.value;
          if (window.updateAll) updateAll();
        };
        return el;
      };

      const makeSelect = (list, value) => {
        const s = document.createElement("select");
        list.forEach(id => {
          const o = document.createElement("option");
          o.value = id;
          o.textContent = id;
          s.appendChild(o);
        });
        s.value = value;
        return s;
      };

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
        let el;
        if (window.db && db.items) {
          el = makeSelect(db.items.map(x => x.id), p.item);
        } else {
          el = document.createElement("input");
          el.value = p.item;
        }
        bind(el, "item");
        container.appendChild(el);
      }

      if (model.type === "creature") {
        let c;
        if (window.db && db.creatures) {
          c = makeSelect(db.creatures.map(x => x.id), p.creature);
        } else {
          c = document.createElement("input");
          c.value = p.creature;
        }
        bind(c, "creature");

        const n = bind(document.createElement("input"), "count");
        n.type = "number";
        n.min = 1;
        n.value = p.count;

        const r = bind(document.createElement("input"), "randomize");
        r.type = "checkbox";
        r.checked = p.randomize;

        const i = bind(document.createElement("input"), "inside");
        i.type = "checkbox";
        i.checked = p.inside;

        container.append(c, n, r, i);
      }

      if (model.type === "affliction") {
        let a;
        if (window.db && db.afflictions) {
          a = makeSelect(db.afflictions.map(x => x.id), p.affliction);
        } else {
          a = document.createElement("input");
          a.value = p.affliction;
        }
        bind(a, "affliction");

        const s = bind(document.createElement("input"), "strength");
        s.type = "number";
        s.value = p.strength;

        const t = bind(document.createElement("select"), "target");
        ["character", "limb", "self"].forEach(v => {
          const o = document.createElement("option");
          o.value = v;
          o.textContent = v;
          t.appendChild(o);
        });
        t.value = p.target;

        container.append(a, s, t);
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
        if (["INPUT", "SELECT", "BUTTON"].includes(e.target.tagName)) return;

        const container = document.getElementById("classic-view");
        const rect = node.getBoundingClientRect();
        const cRect = container.getBoundingClientRect();

        this.dragState = {
          node,
          id: Number(node.dataset.id),
          offsetX: e.clientX - rect.left,
          offsetY: e.clientY - rect.top,
          container
        };

        node.classList.add("dragging");
        document.body.classList.add("dragging");

        document.addEventListener("mousemove", this.onDrag);
        document.addEventListener("mouseup", this.onDrop);
      });
    }

    onDrag = e => {
      if (!this.dragState) return;

      const { node, offsetX, offsetY, container } = this.dragState;
      const cRect = container.getBoundingClientRect();

      let x = e.clientX - cRect.left - offsetX + container.scrollLeft;
      let y = e.clientY - cRect.top - offsetY + container.scrollTop;

      if (localStorage.getItem("snapToGrid") === "true") {
        x = Math.round(x / GRID_SIZE) * GRID_SIZE;
        y = Math.round(y / GRID_SIZE) * GRID_SIZE;
      }

      node.style.position = "absolute";
      node.style.left = x + "px";
      node.style.top = y + "px";

      this.autoScroll(e);
      this.highlightDropZones(e);
    };

    onDrop = e => {
      if (!this.dragState) return;

      const el = document.elementFromPoint(e.clientX, e.clientY);
      const branch = el ? el.closest(".node-branch") : null;
      const root = el ? el.closest("#root-children") : null;

      document.querySelectorAll(".node-branch.highlight")
        .forEach(z => z.classList.remove("highlight"));

      const { id } = this.dragState;
      this.dragState.node.classList.remove("dragging");
      document.body.classList.remove("dragging");

      if (branch) {
        window.editorState.attachNode(
          id,
          Number(branch.dataset.parentId),
          branch.dataset.branch
        );
      } else if (root) {
        window.editorState.removeNodeById(id);
        const model = window.editorState.findNodeById(id);
        window.editorState.events[
          window.editorState.currentEventIndex
        ].model.push(model);
        window.editorState.commit();
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
          document.body.classList.remove("dragging");
          this.dragState = null;
        }
      });
    }
  }

  window.nodeFactory = new NodeFactory();

})();

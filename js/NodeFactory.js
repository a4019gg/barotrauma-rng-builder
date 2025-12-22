// js/NodeFactory.js — v0A2.0.700 — NODE FACTORY (FINAL UX + DB + PROBABILITY HOOKS)

window.NODES_VERSION = "v0A2.0.700";

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
        spawnLocation: "inside",
        randomize: true
      });
    }

    createModelAffliction() {
      return this.createModel("affliction", {
        affliction: "",
        strength: 15
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
          : loc(this.getTitleKey(model.type));

      const chance = document.createElement("span");
      chance.className = "node-chance";
      chance.textContent = "◌ --%";
      chance.dataset.tooltip = "chanceTooltip";

      header.append(title, chance);

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

    getTitleKey(type) {
      return {
        spawn: "spawnItem",
        creature: "spawnCreature",
        affliction: "applyAffliction"
      }[type] || "unknownNode";
    }

    /* =========================
       PARAMS / UI
       ========================= */

    appendParams(container, model) {
      const p = model.params;

      const row = (...els) => {
        const r = document.createElement("div");
        r.className = "param-row";
        els.forEach(e => r.appendChild(e));
        container.appendChild(r);
      };

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

      const dbInput = (list, value, key) => {
        const input = document.createElement("input");
        input.value = value || "";
        input.oninput = () => {
          p[key] = input.value;
          updateAll();
        };
        if (list && list.length) {
          input.setAttribute("list", key + "-list");
          let dl = document.getElementById(key + "-list");
          if (!dl) {
            dl = document.createElement("datalist");
            dl.id = key + "-list";
            list.forEach(e => {
              const o = document.createElement("option");
              o.value = e.id;
              dl.appendChild(o);
            });
            document.body.appendChild(dl);
          }
        }
        return input;
      };

      if (model.type === "spawn") {
        const item = bind(
          dbInput(window.db?.items, p.item, "item"),
          "item"
        );
        const amount = bind(document.createElement("input"), "amount");
        amount.type = "number";
        amount.min = 1;
        amount.value = p.amount;

        const quality = bind(document.createElement("select"), "quality");
        ["N", "G", "E", "M"].forEach(q => {
          const o = document.createElement("option");
          o.value = q;
          o.textContent = q;
          o.className = "quality-" + q.toLowerCase();
          quality.appendChild(o);
        });
        quality.value = p.quality;
        quality.dataset.tooltip = "qualityTooltip";

        row(item, document.createTextNode("×"), amount);
        row(document.createTextNode(loc("qualityLabel")), quality);
      }

      if (model.type === "creature") {
        const c = bind(
          dbInput(window.db?.creatures, p.creature, "creature"),
          "creature"
        );

        const amount = bind(document.createElement("input"), "amount");
        amount.type = "number";
        amount.min = 1;
        amount.value = p.amount;

        const locSel = bind(document.createElement("select"), "spawnLocation");
        ["inside", "outside", "near"].forEach(v => {
          const o = document.createElement("option");
          o.value = v;
          o.textContent = loc("spawnLocation_" + v);
          locSel.appendChild(o);
        });
        locSel.value = p.spawnLocation;
        locSel.dataset.tooltip = "spawnLocationTooltip";

        const rand = bind(document.createElement("input"), "randomize");
        rand.type = "checkbox";
        rand.checked = p.randomize;

        const randLabel = document.createElement("label");
        randLabel.append(rand, document.createTextNode(" " + loc("randomizeLabel")));

        row(c, document.createTextNode("×"), amount);
        row(locSel, randLabel);
      }

      if (model.type === "affliction") {
        const wrap = document.createElement("div");
        wrap.className = "affliction-row";

        const iconHolder = document.createElement("span");
        iconHolder.className = "affliction-icon";

        const idInput = bind(
          dbInput(window.db?.afflictions, p.affliction, "affliction"),
          "affliction"
        );
        idInput.onchange = () => {
          p.affliction = idInput.value;
          iconHolder.innerHTML = "";
          if (window.db?.renderAfflictionIcon) {
            iconHolder.appendChild(
              db.renderAfflictionIcon(p.affliction || "concealed", 16)
            );
          }
          updateAll();
        };

        if (window.db?.renderAfflictionIcon) {
          iconHolder.appendChild(
            db.renderAfflictionIcon(p.affliction || "concealed", 16)
          );
        }

        wrap.append(iconHolder, idInput);
        row(wrap);

        const s = bind(document.createElement("input"), "strength");
        s.type = "number";
        s.value = p.strength;
        s.dataset.tooltip = "strengthTooltip";

        row(document.createTextNode(loc("strengthLabel")), s);
      }

      if (model.type === "rng") {
        const i = bind(document.createElement("input"), "chance");
        i.type = "number";
        i.step = "0.001";
        i.min = 0;
        i.max = 1;
        i.value = p.chance;
        i.dataset.tooltip = "rngChanceTooltip";
        row(i);
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

      model.children[branch].forEach(c =>
        children.appendChild(this.createFromModel(c))
      );

      wrap.append(title, children);
      return wrap;
    }

    /* =========================
       DRAG & DROP
       ========================= */

    makeDraggable(node, handle) {
      handle.addEventListener("mousedown", e => {
        if (["INPUT", "SELECT", "BUTTON", "LABEL"].includes(e.target.tagName)) return;
        const r = node.getBoundingClientRect();
        this.dragState = {
          node,
          id: Number(node.dataset.id),
          ox: e.clientX - r.left,
          oy: e.clientY - r.top
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
      n.style.left = e.clientX - this.dragState.ox + "px";
      n.style.top = e.clientY - this.dragState.oy + "px";
    };

    onDrop = e => {
      if (!this.dragState) return;
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const branch = el?.closest(".node-branch");

      if (branch) {
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

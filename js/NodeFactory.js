// js/NodeFactory.js — 0A2.0.710 — NODE FACTORY (LEGACY SAFE + ICONS)

window.NODES_VERSION = "0A2.0.710";

class NodeFactory {
  constructor() {
    this.idCounter = 0;
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
    return this.createModel("spawn", {
      item: "",
      amount: 1,
      quality: 0
    });
  }

  createModelCreature() {
    return this.createModel("creature", {
      creature: "",
      count: 1,
      spawnLocation: "inside" // inside | outside | near
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

    header.appendChild(this.buildTitle(model));
    header.appendChild(this.buildProbability(model));

    const del = document.createElement("button");
    del.className = "danger small";
    del.textContent = "×";
    del.dataset.action = "removeNode";
    del.dataset.id = model.id;

    header.appendChild(del);
    node.appendChild(header);

    node.appendChild(this.buildContent(model));

    if (model.type === "rng") {
      node.appendChild(this.createBranch(model, "success"));
      node.appendChild(this.createBranch(model, "failure"));
    }

    return node;
  }

  /* =========================
     HEADER PARTS
     ========================= */

  buildTitle(model) {
    const span = document.createElement("span");
    span.className = "node-title";
    span.textContent = {
      rng: loc("rngAction"),
      spawn: loc("spawnItem"),
      creature: loc("spawnCreature"),
      affliction: loc("applyAffliction")
    }[model.type] || loc("unknownNode");
    return span;
  }

  buildProbability(model) {
    const wrap = document.createElement("span");
    wrap.className = "probability";

    let chance = 1;
    if (model.type === "rng") {
      chance = model.params.chance ?? 1;
    }

    wrap.textContent = `${(chance * 100).toFixed(1)}%`;
    wrap.dataset.tooltip = "chanceHint";
    return wrap;
  }

  /* =========================
     CONTENT
     ========================= */

  buildContent(model) {
    const wrap = document.createElement("div");
    wrap.className = "node-content";

    if (model.type === "spawn") {
      wrap.append(
        this.input("item", model, "item", "itemPlaceholder"),
        this.text("×"),
        this.input("number", model, "amount"),
        this.qualitySelect(model)
      );
    }

    if (model.type === "creature") {
      wrap.append(
        this.input("creature", model, "creature", "creaturePlaceholder"),
        this.text("×"),
        this.input("number", model, "count"),
        this.spawnLocationSelect(model)
      );
    }

    if (model.type === "affliction") {
      wrap.append(
        this.afflictionIcon(model),
        this.input("affliction", model, "affliction", "afflictionPlaceholder"),
        this.text(loc("strength") + ":"),
        this.input("number", model, "strength")
      );
    }

    return wrap;
  }

  /* =========================
     HELPERS
     ========================= */

  input(type, model, key, placeholderKey) {
    const i = document.createElement("input");
    i.type = type === "number" ? "number" : "text";
    i.value = model.params[key] ?? "";
    if (placeholderKey) i.placeholder = loc(placeholderKey);

    i.dataset.action = "updateParam";
    i.dataset.id = model.id;
    i.dataset.key = key;
    return i;
  }

  text(t) {
    const s = document.createElement("span");
    s.textContent = t;
    return s;
  }

  /* =========================
     QUALITY
     ========================= */

  qualitySelect(model) {
    const wrap = document.createElement("span");
    wrap.className = "item-quality Q" + (model.params.quality ?? 0);
    wrap.textContent = ["N", "G", "E", "M", "L"][model.params.quality ?? 0];
    wrap.dataset.tooltip = "itemQualityHint";
    return wrap;
  }

  /* =========================
     CREATURE LOCATION
     ========================= */

  spawnLocationSelect(model) {
    const s = document.createElement("select");
    ["inside", "outside", "near"].forEach(v => {
      const o = document.createElement("option");
      o.value = v;
      o.textContent = v;
      if (model.params.spawnLocation === v) o.selected = true;
      s.appendChild(o);
    });

    s.dataset.action = "updateParam";
    s.dataset.id = model.id;
    s.dataset.key = "spawnLocation";
    return s;
  }

  /* =========================
     AFFLICTION ICON
     ========================= */

  afflictionIcon(model) {
    const span = document.createElement("span");
    span.className = "affliction-icon debuff medium";
    span.textContent = "●"; // placeholder glyph
    return span;
  }

  /* =========================
     RNG BRANCHES
     ========================= */

  createBranch(model, branch) {
    const wrap = document.createElement("div");
    wrap.className = "node-branch";

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
}

window.nodeFactory = new NodeFactory();

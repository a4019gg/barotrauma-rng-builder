// js/db.js — 0A2.0.706
window.DB_VERSION = "0A2.0.706";

/*
  DB = DATA + VISUAL OVERVIEW
  - визуал ЕСТЬ
  - расчёта силы НЕТ
  - Node-логики НЕТ
*/

class DBManager {
  constructor() {
    this.data = {
      afflictions: [],
      items: [],
      creatures: []
    };

    this.isLoaded = false;
    this.activeTab = "afflictions";
    this.init();
  }

  /* =========================
     LOAD
     ========================= */

  async init() {
    try {
      const [aff, items, creatures] = await Promise.all([
        this.loadJSON("data/afflictions.json"),
        this.loadJSON("data/items.json"),
        this.loadJSON("data/creatures.json")
      ]);

      this.data.afflictions = aff || [];
      this.data.items = items || [];
      this.data.creatures = creatures || [];

      this.isLoaded = true;
      console.log("[DB] Loaded", {
        afflictions: aff.length,
        items: items.length,
        creatures: creatures.length
      });
    } catch (e) {
      console.error("[DB] Load error", e);
      alert(loc("dbError"));
    }
  }

  async loadJSON(path) {
    const r = await fetch(path);
    if (!r.ok) throw new Error(path);
    return r.json();
  }

  /* =========================
     OPEN / API
     ========================= */

  openDB() {
    if (!this.isLoaded) {
      alert(loc("dbError"));
      return;
    }
    if (document.querySelector(".db-modal-overlay")) return;

    document.body.appendChild(this.createModal());
    this.renderTab(this.activeTab);
  }

  getById(type, id) {
    return this.data[type]?.find(e => e.id === id) || null;
  }

  /* =========================
     MODAL
     ========================= */

  createModal() {
    const overlay = document.createElement("div");
    overlay.className = "db-modal-overlay";

    const modal = document.createElement("div");
    modal.className = "db-modal-content";

    modal.append(
      this.createHeader(),
      this.createTabs(),
      this.createSearch(),
      this.createList()
    );

    overlay.appendChild(modal);
    overlay.onclick = e => {
      if (e.target === overlay) overlay.remove();
    };

    return overlay;
  }

  createHeader() {
    const h = document.createElement("div");
    h.className = "db-modal-header";
    h.textContent = loc("dataBase");
    return h;
  }

  createTabs() {
    const wrap = document.createElement("div");
    wrap.className = "db-tabs";

    [
      ["afflictions", loc("tabAfflictions")],
      ["items", loc("tabItems")],
      ["creatures", loc("tabCreatures")]
    ].forEach(([key, label]) => {
      const b = document.createElement("button");
      b.className = "db-tab-btn" + (this.activeTab === key ? " active" : "");
      b.textContent = label;
      b.onclick = () => {
        this.activeTab = key;
        this.renderTab(key);
        wrap.querySelectorAll(".db-tab-btn")
          .forEach(x => x.classList.toggle("active", x === b));
      };
      wrap.appendChild(b);
    });

    return wrap;
  }

  createSearch() {
    const input = document.createElement("input");
    input.className = "db-search-input";
    input.placeholder = loc("searchPlaceholder");
    input.oninput = () => {
      this.renderTab(this.activeTab, input.value.trim().toLowerCase());
    };
    return input;
  }

  createList() {
    const d = document.createElement("div");
    d.id = "db-list";
    d.className = "db-list";
    return d;
  }

  /* =========================
     RENDER
     ========================= */

  renderTab(type, query = "") {
    const list = document.getElementById("db-list");
    if (!list) return;

    list.innerHTML = "";
    const entries = this.data[type] || [];

    const filtered = query
      ? entries.filter(e =>
          e.id.toLowerCase().includes(query) ||
          e.name?.toLowerCase().includes(query)
        )
      : entries;

    if (!filtered.length) {
      const empty = document.createElement("div");
      empty.className = "db-empty";
      empty.textContent = loc("nothingFound");
      list.appendChild(empty);
      return;
    }

    filtered.forEach(e => {
      list.appendChild(this.createEntry(type, e));
    });
  }

  /* =========================
     ENTRY
     ========================= */

  createEntry(type, entry) {
    const card = document.createElement("div");
    card.className = "db-entry";

    const summary = document.createElement("div");
    summary.className = "db-summary";

    if (type === "afflictions") {
      summary.appendChild(this.createIcon(entry));
    }

    const title = document.createElement("strong");
    title.textContent = entry.name || entry.id;

    const id = document.createElement("span");
    id.className = "db-id";
    id.textContent = entry.id;

    summary.append(title, " ", id);
    card.appendChild(summary);

    const details = document.createElement("div");
    details.className = "db-details";

    if (type === "afflictions") {
      details.append(
        this.detail("dbDetailMaxStrength", entry.maxstrength),
        this.detail("dbDetailLimbSpecific", entry.limbspecific ? loc("yes") : loc("no")),
        this.detail("dbDetailIsBuff", entry.isbuff ? loc("yes") : loc("no"))
      );
    }

    card.appendChild(details);

    summary.onclick = () => {
      card.classList.toggle("expanded");
    };

    summary.ondblclick = () => {
      navigator.clipboard.writeText(entry.id);
    };

    return card;
  }

  /* =========================
     ICON (SEMANTIC ONLY)
     ========================= */

  createIcon(entry) {
    const icon = document.createElement("div");
    icon.className = "db-icon";

    const role = entry.icon?.role || "status";
    const mode = entry.icon?.colorMode || "fixed";

    icon.classList.add(role);

    if (mode === "dynamic") {
      icon.classList.add("dynamic");
    } else if (entry.icon?.fixedColorKey) {
      icon.dataset.color = entry.icon.fixedColorKey;
    }

    icon.textContent = "●"; // placeholder, canvas позже
    return icon;
  }

  detail(labelKey, value) {
    const row = document.createElement("div");
    row.textContent = `${loc(labelKey)}: ${value}`;
    return row;
  }
}

/* =========================
   GLOBAL
   ========================= */

window.dbManager = new DBManager();

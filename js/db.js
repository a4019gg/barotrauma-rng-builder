// js/db.js — 0A2.0.705
window.DB_VERSION = "0A2.0.705";

/*
  DB MANAGER RESPONSIBILITY:
  - загрузка JSON
  - поиск / фильтрация
  - отдача данных по ID
  - рендер карточек
  - НИКАКОЙ визуальной логики силы / цветов
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
     INIT
     ========================= */

  init() {
    this.loadAll();
  }

  async loadAll() {
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
      console.log("[DB] Loaded:", {
        afflictions: aff.length,
        items: items.length,
        creatures: creatures.length
      });
    } catch (err) {
      console.error("[DB] Load error", err);
      alert(loc("dbError"));
    }
  }

  async loadJSON(path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error(path);
    return res.json();
  }

  /* =========================
     PUBLIC API
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

    modal.appendChild(this.createHeader());
    modal.appendChild(this.createTabs());
    modal.appendChild(this.createSearch());
    modal.appendChild(this.createList());

    overlay.appendChild(modal);
    overlay.addEventListener("click", e => {
      if (e.target === overlay) overlay.remove();
    });

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
      };
      wrap.appendChild(b);
    });

    return wrap;
  }

  createSearch() {
    const input = document.createElement("input");
    input.className = "db-search-input";
    input.placeholder = loc("searchPlaceholder");

    input.addEventListener("input", () => {
      this.renderTab(this.activeTab, input.value.trim().toLowerCase());
    });

    return input;
  }

  createList() {
    const list = document.createElement("div");
    list.className = "db-list";
    list.id = "db-list";
    return list;
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

    filtered.forEach(entry => {
      list.appendChild(this.createEntry(type, entry));
    });
  }

  createEntry(type, entry) {
    const card = document.createElement("div");
    card.className = "db-entry";

    const summary = document.createElement("div");
    summary.className = "db-summary";

    const id = document.createElement("span");
    id.className = "db-id";
    id.textContent = entry.id;

    const name = document.createElement("strong");
    name.textContent = entry.name || entry.id;

    summary.append(id, " ", name);
    card.appendChild(summary);

    const details = document.createElement("div");
    details.className = "db-details";

    details.appendChild(this.detail("dbDetailID", entry.id));

    if (type === "afflictions") {
      details.appendChild(this.detail("dbDetailMaxStrength", entry.maxstrength));
      details.appendChild(this.detail("dbDetailLimbSpecific", entry.limbspecific));
      details.appendChild(this.detail("dbDetailIsBuff", entry.isbuff));
    }

    card.appendChild(details);

    summary.onclick = () => {
      card.classList.toggle("expanded");
    };

    summary.ondblclick = () => {
      this.copyId(entry.id);
    };

    return card;
  }

  detail(labelKey, value) {
    const row = document.createElement("div");
    row.textContent = `${loc(labelKey)}: ${value}`;
    return row;
  }

  copyId(id) {
    navigator.clipboard.writeText(id);
  }
}

/* =========================
   GLOBAL
   ========================= */

window.dbManager = new DBManager();

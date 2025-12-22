// js/db.js — 0A2.0.710 — DATABASE UI (STATIC VIEW, NO LOGIC)

window.DB_VERSION = "0A2.0.710";

/* =========================
   DB MANAGER
   ========================= */

class DBManager {
  constructor() {
    this.data = {
      afflictions: [],
      items: [],
      creatures: []
    };

    this.activeTab = "afflictions";
    this.searchQuery = "";

    this.init();
  }

  async init() {
    try {
      const [aff, items, creatures] = await Promise.all([
        fetch("data/afflictions.json").then(r => r.json()),
        fetch("data/items.json").then(r => r.json()),
        fetch("data/creatures.json").then(r => r.json())
      ]);

      this.data.afflictions = aff || [];
      this.data.items = items || [];
      this.data.creatures = creatures || [];
    } catch (e) {
      console.error("[DB] Load error", e);
      alert(loc("dbError"));
    }
  }

  /* =========================
     OPEN / CLOSE
     ========================= */

  openDB() {
    if (document.querySelector(".db-modal-overlay")) return;

    const overlay = document.createElement("div");
    overlay.className = "db-modal-overlay";

    const modal = document.createElement("div");
    modal.className = "db-modal-content";

    modal.append(
      this.renderHeader(),
      this.renderTabs(),
      this.renderSearch(),
      this.renderList()
    );

    overlay.appendChild(modal);
    overlay.onclick = e => {
      if (e.target === overlay) overlay.remove();
    };

    document.body.appendChild(overlay);
  }

  /* =========================
     RENDER PARTS
     ========================= */

  renderHeader() {
    const h = document.createElement("div");
    h.className = "db-modal-header";
    h.textContent = loc("dataBase");
    return h;
  }

  renderTabs() {
    const tabs = document.createElement("div");
    tabs.className = "db-tabs";

    const makeTab = (id, labelKey) => {
      const b = document.createElement("button");
      b.className = "db-tab-btn" + (this.activeTab === id ? " active" : "");
      b.textContent = loc(labelKey);
      b.onclick = () => {
        this.activeTab = id;
        this.refresh();
      };
      return b;
    };

    tabs.append(
      makeTab("afflictions", "tabAfflictions"),
      makeTab("items", "tabItems"),
      makeTab("creatures", "tabCreatures")
    );

    return tabs;
  }

  renderSearch() {
    const wrap = document.createElement("div");
    wrap.className = "db-search";

    const input = document.createElement("input");
    input.className = "db-search-input";
    input.placeholder = loc("searchPlaceholder");
    input.oninput = e => {
      this.searchQuery = e.target.value.toLowerCase();
      this.refreshList();
    };

    wrap.appendChild(input);
    return wrap;
  }

  renderList() {
    const list = document.createElement("div");
    list.className = "db-list";
    this.listEl = list;
    this.refreshList();
    return list;
  }

  refresh() {
    const modal = document.querySelector(".db-modal-content");
    if (!modal) return;
    modal.querySelector(".db-list").replaceWith(this.renderList());
    modal.querySelectorAll(".db-tab-btn").forEach(b => b.classList.remove("active"));
    modal.querySelectorAll(".db-tab-btn")[["afflictions","items","creatures"].indexOf(this.activeTab)]
      ?.classList.add("active");
  }

  refreshList() {
    if (!this.listEl) return;
    this.listEl.innerHTML = "";

    const entries = this.data[this.activeTab] || [];
    const filtered = entries.filter(e =>
      !this.searchQuery ||
      e.id?.toLowerCase().includes(this.searchQuery) ||
      e.name?.toLowerCase().includes(this.searchQuery)
    );

    if (!filtered.length) {
      const empty = document.createElement("div");
      empty.className = "db-empty";
      empty.textContent = loc("nothingFound");
      this.listEl.appendChild(empty);
      return;
    }

    filtered.forEach(e => this.listEl.appendChild(this.renderEntry(e)));
  }

  /* =========================
     ENTRY RENDER
     ========================= */

  renderEntry(entry) {
    const card = document.createElement("div");
    card.className = "db-entry";

    const header = document.createElement("div");
    header.className = "db-summary";

    if (entry.icon) {
      header.appendChild(this.renderIcon(entry.icon));
    }

    const title = document.createElement("span");
    title.textContent = entry.name || entry.id;
    header.appendChild(title);

    const id = document.createElement("span");
    id.className = "db-id";
    id.textContent = entry.id;
    header.appendChild(id);

    const toggle = document.createElement("span");
    toggle.className = "info-toggle";
    toggle.textContent = "ℹ";
    header.appendChild(toggle);

    const details = document.createElement("div");
    details.className = "db-details";
    details.appendChild(this.renderDetails(entry));

    header.onclick = () => {
      card.classList.toggle("expanded");
    };

    card.append(header, details);
    return card;
  }

  renderIcon(icon) {
    const el = document.createElement("span");
    el.className = `db-icon ${icon.role} ${icon.colorMode}`;
    return el;
  }

  renderDetails(entry) {
    const d = document.createElement("div");

    const add = (k, v) => {
      const row = document.createElement("div");
      row.innerHTML = `<strong>${loc(k)}:</strong> ${v}`;
      d.appendChild(row);
    };

    add("dbDetailID", entry.id);
    if (entry.type) add("dbDetailType", entry.type);
    if (entry.maxstrength != null) add("dbDetailMaxStrength", entry.maxstrength);
    if (entry.limbspecific != null) add("dbDetailLimbSpecific", entry.limbspecific ? loc("yes") : loc("no"));
    if (entry.isbuff != null) add("dbDetailIsBuff", entry.isbuff ? loc("yes") : loc("no"));

    return d;
  }
}

/* =========================
   GLOBAL
   ========================= */

window.dbManager = new DBManager();

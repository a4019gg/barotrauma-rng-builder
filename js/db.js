// js/db.js — v0.9.434 — DB (RESTORED + UI EXTENSIONS)

const DB_VERSION = "v0.9.434";
window.DB_VERSION = DB_VERSION;

/* =========================
   STRICT LOCALIZATION
   ========================= */

function strictLoc(key) {
  if (typeof window.loc !== "function") {
    console.error("[LOC] loc() is not defined");
    return "";
  }
  const v = window.loc(key);
  if (!v) {
    console.error(`[LOC] Missing localization key: ${key}`);
    return "";
  }
  return v;
}

/* =========================
   DATABASE MANAGER
   ========================= */

class DatabaseManager {
  constructor() {
    this.afflictions = [];
    this.items = [];
    this.creatures = [];

    this.iconCache = new Map();
    this.atlasCache = new Map();
    this.pendingAtlases = new Map();

    this.missingIconImg = new Image();
    this.missingIconImg.src = "assets/Missing_Texture_icon.png";

    this.currentTab = "afflictions";
    this.isModalOpen = false;
    this.sortAsc = true;

    this.loadData();
  }

  /* =========================
     DATA
     ========================= */

  async loadData() {
    try {
      const [a, i, c] = await Promise.all([
        fetch("data/afflictions.json"),
        fetch("data/items.json"),
        fetch("data/creatures.json")
      ]);

      this.afflictions = await a.json();
      this.items = await i.json();
      this.creatures = await c.json();
    } catch (e) {
      console.error("[DB] Load error:", e);
    }
  }

  /* =========================
     UI
     ========================= */

  openDB() {
    if (this.isModalOpen) return;
    this.isModalOpen = true;

    const overlay = document.createElement("div");
    overlay.className = "db-modal-overlay";

    const content = document.createElement("div");
    content.className = "db-modal-content";

    const paneDB = document.createElement("div");
    paneDB.className = "db-pane";

    const paneLegend = document.createElement("div");
    paneLegend.className = "db-legend-pane";
    paneLegend.innerHTML = `
      <h3>Legend</h3>
      <div>ⓘ — toggle details</div>
      <div>⧉ — expand / collapse all</div>
      <div>Click card — copy ID</div>
    `;

    const header = document.createElement("div");
    header.className = "db-modal-header";

    const title = document.createElement("h2");
    title.textContent = strictLoc("dataBase");

    header.appendChild(title);
    header.appendChild(this.createTabs());
    header.appendChild(this.createSearchInput());

    const sortBtn = document.createElement("button");
    sortBtn.textContent = "A–Z";
    sortBtn.onclick = () => {
      this.sortAsc = !this.sortAsc;
      sortBtn.textContent = this.sortAsc ? "A–Z" : "Z–A";
      this.renderGrid(this.currentTab);
    };

    const expandBtn = document.createElement("button");
    expandBtn.textContent = "⧉";
    expandBtn.onclick = () => this.toggleExpandAll();

    header.appendChild(sortBtn);
    header.appendChild(expandBtn);

    const grid = document.createElement("div");
    grid.className = "db-grid";
    grid.id = "db-grid";

    paneDB.appendChild(header);
    paneDB.appendChild(grid);

    content.appendChild(paneDB);
    content.appendChild(paneLegend);
    overlay.appendChild(content);
    document.body.appendChild(overlay);

    overlay.onclick = e => {
      if (e.target === overlay) {
        overlay.remove();
        this.isModalOpen = false;
      }
    };

    this.renderGrid(this.currentTab);
  }

  createTabs() {
    const wrap = document.createElement("div");
    wrap.className = "db-tabs";

    const tabs = {
      afflictions: "tabAfflictions",
      items: "tabItems",
      creatures: "tabCreatures"
    };

    Object.entries(tabs).forEach(([key, locKey]) => {
      const btn = document.createElement("button");
      btn.textContent = strictLoc(locKey);
      btn.className = "db-tab-btn";
      if (key === this.currentTab) btn.classList.add("active");

      btn.onclick = () => {
        document.querySelectorAll(".db-tab-btn")
          .forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        this.currentTab = key;
        this.renderGrid(key);
      };

      wrap.appendChild(btn);
    });

    return wrap;
  }

  createSearchInput() {
    const input = document.createElement("input");
    input.className = "db-search-input";
    input.placeholder = strictLoc("searchPlaceholder");
    input.oninput = e => this.filterGrid(e.target.value);
    return input;
  }

  /* =========================
     GRID
     ========================= */

  async renderGrid(type) {
    const grid = document.getElementById("db-grid");
    if (!grid) return;

    grid.innerHTML = "";

    let data = [...this[type]];
    data.sort((a, b) =>
      this.sortAsc
        ? (a.name || a.identifier).localeCompare(b.name || b.identifier)
        : (b.name || b.identifier).localeCompare(a.name || a.identifier)
    );

    const cards = await Promise.allSettled(
      data.map(e => this.createCard(e, type))
    );

    cards.forEach(r => {
      if (r.status === "fulfilled") grid.appendChild(r.value);
    });
  }

  async createCard(entry, type) {
    const card = document.createElement("div");
    card.className = "db-entry-btn";

    card.onclick = () => {
      navigator.clipboard.writeText(entry.identifier || entry.id || "");
    };

    const header = document.createElement("div");
    header.className = "db-card-header";

    const icon = await this.createIcon(entry.icon);
    header.appendChild(icon);

    const text = document.createElement("div");
    text.className = "db-main";

    const name = document.createElement("div");
    name.className = "db-title";
    name.textContent = entry.name || entry.identifier;

    const id = document.createElement("div");
    id.className = "db-id";
    id.textContent = entry.identifier || entry.id;

    text.appendChild(name);
    text.appendChild(id);
    header.appendChild(text);

    const info = document.createElement("div");
    info.className = "db-info";
    info.textContent = "ⓘ";
    info.onclick = e => {
      e.stopPropagation();
      card.classList.toggle("expanded");
    };

    header.appendChild(info);
    card.appendChild(header);

    const details = document.createElement("div");
    details.className = "db-details";

    if (type === "afflictions") {
      this.appendAfflictionDetails(details, entry);
    }

    card.appendChild(details);
    return card;
  }

  toggleExpandAll() {
    document.querySelectorAll(".db-entry-btn")
      .forEach(c => c.classList.toggle("expanded"));
  }

  /* =========================
     ICONS (UNCHANGED LOGIC)
     ========================= */

  async createIcon(icon) {
    const canvas = document.createElement("canvas");
    canvas.width = 48;
    canvas.height = 48;
    const ctx = canvas.getContext("2d");

    if (!icon || !icon.texture || !icon.sourcerect) {
      this.drawMissing(ctx);
      return canvas;
    }

    const atlas = await this.loadAtlas(icon.texture);
    if (!atlas) {
      this.drawMissing(ctx);
      return canvas;
    }

    this.drawFromAtlas(ctx, atlas, icon);
    return canvas;
  }

  async loadAtlas(path) {
    if (this.atlasCache.has(path)) return this.atlasCache.get(path);
    if (this.pendingAtlases.has(path)) return this.pendingAtlases.get(path);

    const promise = new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        this.atlasCache.set(path, img);
        this.pendingAtlases.delete(path);
        resolve(img);
      };
      img.onerror = () => resolve(null);
      img.src = path;
    });

    this.pendingAtlases.set(path, promise);
    return promise;
  }

  drawFromAtlas(ctx, img, icon) {
    const [sx, sy, sw, sh] = icon.sourcerect.split(",").map(Number);

    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, 48, 48);

    const key = icon.color_theme_key?.replace(/_/g, "-");
    const rgb = getComputedStyle(document.documentElement)
      .getPropertyValue(`--${key}-rgb`).trim();

    if (rgb) {
      ctx.globalCompositeOperation = "multiply";
      ctx.fillStyle = `rgb(${rgb})`;
      ctx.fillRect(0, 0, 48, 48);

      ctx.globalCompositeOperation = "destination-in";
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, 48, 48);
      ctx.globalCompositeOperation = "source-over";
    }
  }

  drawMissing(ctx) {
    ctx.drawImage(this.missingIconImg, 0, 0, 48, 48);
  }

  /* =========================
     DETAILS
     ========================= */

  appendAfflictionDetails(container, e) {
    const line = (l, v) => {
      const d = document.createElement("div");
      d.innerHTML = `<strong>${strictLoc(l)}:</strong> ${v}`;
      container.appendChild(d);
    };

    line("dbDetailType", e.type);
    line("dbDetailMaxStrength", e.maxstrength);
    line("dbDetailLimbSpecific", e.limbspecific ? strictLoc("yes") : strictLoc("no"));
    line("dbDetailIsBuff", e.isbuff ? strictLoc("yes") : strictLoc("no"));
  }

  /* =========================
     SEARCH
     ========================= */

  filterGrid(q) {
    const grid = document.getElementById("db-grid");
    if (!grid) return;

    grid.querySelectorAll(".db-entry-btn").forEach(c => {
      c.style.display = c.textContent.toLowerCase().includes(q.toLowerCase())
        ? ""
        : "none";
    });
  }
}

/* =========================
   GLOBAL
   ========================= */

window.dbManager = new DatabaseManager();

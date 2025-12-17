// js/db.js — v0.9.421_final_multiply

const DB_VERSION = "v0.9.421_final_multiply";
window.DB_VERSION = DB_VERSION;

/* =========================
   STRICT LOCALIZATION
   ========================= */

function strictLoc(key) {
  if (typeof window.loc !== "function") {
    console.error("[LOC] loc() is not defined");
    return "";
  }

  const value = window.loc(key);
  if (value === undefined || value === null || value === "") {
    console.error(`[LOC] Missing localization key: ${key}`);
    return "";
  }

  return value;
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

      if (!a.ok || !i.ok || !c.ok) {
        console.error("[DB] Failed to load JSON files");
        return;
      }

      this.afflictions = await a.json();
      this.items = await i.json();
      this.creatures = await c.json();
    } catch (e) {
      console.error("[DB] Fatal load error:", e);
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

    const header = document.createElement("div");
    header.className = "db-modal-header";

    const title = document.createElement("h2");
    title.textContent = strictLoc("dataBase");
    header.appendChild(title);

    header.appendChild(this.createTabs());
    header.appendChild(this.createSearchInput());

    const grid = document.createElement("div");
    grid.className = "db-grid";
    grid.id = "db-grid";

    content.appendChild(header);
    content.appendChild(grid);
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

    const data = this[type];
    if (!Array.isArray(data)) {
      console.error(`[DB] Invalid dataset: ${type}`);
      return;
    }

    if (data.length === 0) {
      const empty = document.createElement("div");
      empty.textContent = strictLoc("nothingFound");
      grid.appendChild(empty);
      return;
    }

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

    const header = document.createElement("div");
    header.style.display = "flex";
    header.style.alignItems = "center";
    header.style.gap = "12px";

    const icon = await this.createIcon(entry.icon);
    header.appendChild(icon);

    const name = document.createElement("div");
    name.textContent = entry.name || entry.identifier;
    name.style.fontWeight = "bold";
    header.appendChild(name);

    card.appendChild(header);

    const id = document.createElement("div");
    id.textContent = `${strictLoc("dbDetailID")}: ${entry.identifier}`;
    card.appendChild(id);

    if (type === "afflictions") {
      this.appendAfflictionDetails(card, entry);
    }

    return card;
  }

  /* =========================
     ICONS (MULTIPLY)
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
      img.onerror = () => {
        console.error(`[ICON] Failed to load atlas: ${path}`);
        this.pendingAtlases.delete(path);
        resolve(null);
      };
      img.src = path;
    });

    this.pendingAtlases.set(path, promise);
    return promise;
  }

  drawFromAtlas(ctx, img, icon) {
    const rect = icon.sourcerect.split(",").map(Number);
    if (rect.length !== 4) {
      console.error("[ICON] Invalid sourcerect:", icon.sourcerect);
      return;
    }

    const [sx, sy, sw, sh] = rect;

    ctx.clearRect(0, 0, 48, 48);

    // 1. draw white mask
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, 48, 48);

    const key = icon.color_theme_key?.replace(/_/g, "-");
    if (!key) return;

    const rgb = getComputedStyle(document.documentElement)
      .getPropertyValue(`--${key}-rgb`)
      .trim();

    if (!rgb) {
      console.error(`[ICON] Missing CSS var: --${key}-rgb`);
      return;
    }

    // 2. multiply color over mask
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = `rgb(${rgb})`;
    ctx.fillRect(0, 0, 48, 48);

    // 3. restore alpha (important!)
    ctx.globalCompositeOperation = "destination-in";
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, 48, 48);

    ctx.globalCompositeOperation = "source-over";
  }

  drawMissing(ctx) {
    if (this.missingIconImg.complete) {
      ctx.drawImage(this.missingIconImg, 0, 0, 48, 48);
    } else {
      ctx.fillStyle = "#900";
      ctx.fillRect(0, 0, 48, 48);
    }
  }

  /* =========================
     DETAILS
     ========================= */

  appendAfflictionDetails(card, e) {
    const line = (label, value) => {
      const d = document.createElement("div");
      d.innerHTML = `<strong>${strictLoc(label)}:</strong> ${value}`;
      card.appendChild(d);
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

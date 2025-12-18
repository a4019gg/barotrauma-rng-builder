// js/db.js — v0.9.435 — DATABASE (FINAL JS)

const DB_VERSION = "v0.9.435";
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
  if (v === undefined || v === null) {
    console.error(`[LOC] Missing localization key: ${key}`);
    return "";
  }
  return v;
}

/* =========================
   TOAST STUB
   ========================= */

function showToast(type, text) {
  // заделка под будущие попапы
  console.log(`[TOAST:${type}] ${text}`);
}

/* =========================
   DATABASE MANAGER
   ========================= */

class DatabaseManager {
  constructor() {
    this.afflictions = [];
    this.items = [];
    this.creatures = [];

    this.atlasCache = new Map();
    this.pendingAtlases = new Map();

    this.missingIconImg = new Image();
    this.missingIconImg.src = "assets/Missing_Texture_icon.png";

    this.currentTab = "afflictions";
    this.sortAsc = true;
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

      this.afflictions = a.ok ? await a.json() : [];
      this.items = i.ok ? await i.json() : [];
      this.creatures = c.ok ? await c.json() : [];
    } catch (e) {
      console.error("[DB] Load error:", e);
    }
  }

  /* =========================
     OPEN / CLOSE
     ========================= */

  openDB() {
    if (this.isModalOpen) return;
    this.isModalOpen = true;

    const overlay = document.createElement("div");
    overlay.className = "db-modal-overlay";

    const shell = document.createElement("div");
    shell.className = "db-modal-shell";
    shell.style.display = "flex";
    shell.style.width = "90%";
    shell.style.maxWidth = "1400px";
    shell.style.height = "85vh";

    /* ---------- DATABASE PANEL ---------- */

    const content = document.createElement("div");
    content.className = "db-modal-content";
    content.style.flex = "1";
    content.style.display = "flex";
    content.style.flexDirection = "column";

    const header = document.createElement("div");
    header.className = "db-modal-header";

    const title = document.createElement("h2");
    title.textContent = strictLoc("dataBase");
    header.appendChild(title);

    header.appendChild(this.createTabs());
    header.appendChild(this.createSearch());
    header.appendChild(this.createSortBtn());

    // Expand / Collapse all
    const expandBtn = document.createElement("button");
    expandBtn.className = "db-expand-all-btn";
    expandBtn.textContent = "⧉";
    expandBtn.title = "Expand / Collapse all";
    expandBtn.onclick = () => this.toggleExpandAll();
    header.appendChild(expandBtn);

    const grid = document.createElement("div");
    grid.className = "db-grid";
    grid.id = "db-grid";
    grid.style.flex = "1";
    grid.style.overflowY = "auto";

    content.appendChild(header);
    content.appendChild(grid);

    /* ---------- LEGEND PANEL ---------- */

    const legend = document.createElement("div");
    legend.className = "db-legend-panel";
    legend.style.width = "240px";
    legend.style.padding = "16px";
    legend.style.borderLeft = "1px solid var(--border)";
    legend.innerHTML = `
      <strong>Legend</strong><br><br>
      ⧉ — expand / collapse all<br>
      ⓘ — toggle details<br>
      Click card — copy ID<br><br>
      Click outside — close
    `;

    shell.appendChild(content);
    shell.appendChild(legend);
    overlay.appendChild(shell);
    document.body.appendChild(overlay);

    overlay.onclick = e => {
      if (e.target === overlay) {
        overlay.remove();
        this.isModalOpen = false;
      }
    };

    this.render();
  }

  /* =========================
     HEADER CONTROLS
     ========================= */

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
      btn.className = "db-tab-btn";
      btn.textContent = strictLoc(locKey);
      if (key === this.currentTab) btn.classList.add("active");

      btn.onclick = () => {
        document
          .querySelectorAll(".db-tab-btn")
          .forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        this.currentTab = key;
        this.render();
      };

      wrap.appendChild(btn);
    });

    return wrap;
  }

  createSearch() {
    const input = document.createElement("input");
    input.className = "db-search-input";
    input.placeholder = strictLoc("searchPlaceholder");
    input.oninput = () => this.render(input.value);
    return input;
  }

  createSortBtn() {
    const btn = document.createElement("button");
    btn.textContent = "A–Z";
    btn.onclick = () => {
      this.sortAsc = !this.sortAsc;
      this.render();
    };
    return btn;
  }

  /* =========================
     RENDER GRID
     ========================= */

  render(filter = "") {
    const grid = document.getElementById("db-grid");
    if (!grid) return;

    grid.innerHTML = "";

    let list = [...(this[this.currentTab] || [])];

    if (filter) {
      const q = filter.toLowerCase();
      list = list.filter(e =>
        (e.name || "").toLowerCase().includes(q) ||
        (e.id || "").toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      const an = a.name || a.id;
      const bn = b.name || b.id;
      return this.sortAsc ? an.localeCompare(bn) : bn.localeCompare(an);
    });

    list.forEach(entry => {
      grid.appendChild(this.createCard(entry));
    });
  }

  /* =========================
     EXPAND ALL
     ========================= */

  toggleExpandAll() {
    const cards = document.querySelectorAll(".db-entry");
    if (!cards.length) return;

    const allExpanded = [...cards].every(c =>
      c.classList.contains("expanded")
    );

    cards.forEach(card => {
      card.classList.toggle("expanded", !allExpanded);
    });
  }

  /* =========================
     CARD
     ========================= */

  createCard(entry) {
    const card = document.createElement("div");
    card.className = "db-entry";

    // Copy ID
    card.onclick = () => {
      if (!entry.id) return;
      navigator.clipboard.writeText(entry.id);
      showToast("info", `ID copied: ${entry.id}`);
    };

    /* ---------- HEADER ---------- */

    const header = document.createElement("div");
    header.className = "db-card-header";

    const iconWrap = document.createElement("div");
    iconWrap.className = "db-icon";
    iconWrap.appendChild(this.createIcon(entry.icon));

    const main = document.createElement("div");
    main.className = "db-main";

    const title = document.createElement("div");
    title.className = "db-title";
    title.textContent = entry.name || entry.id || "";

    const id = document.createElement("div");
    id.className = "db-id";
    id.textContent = entry.id || "";

    main.appendChild(title);
    main.appendChild(id);

    const info = document.createElement("div");
    info.className = "db-info";
    info.textContent = "ⓘ";

    header.appendChild(iconWrap);
    header.appendChild(main);
    header.appendChild(info);
    card.appendChild(header);

    /* ---------- DESCRIPTION ---------- */

    const desc = document.createElement("div");
    desc.className = "db-card-desc";
    desc.textContent = entry.description || "";
    card.appendChild(desc);
/* ---------- TAGS ---------- */

const tags = document.createElement("div");
tags.className = "db-card-tags";

/* priority: main semantic tags first */
const PRIMARY = ["DAMAGE", "STATUS", "BUFF", "DEBUFF", "POISON"];
const tagSet = new Set();

/* 1. main type */
if (entry.type) {
  tagSet.add(String(entry.type).toUpperCase());
}

/* 2. flags */
if (entry.isbuff) tagSet.add("BUFF");
if (entry.limbspecific) tagSet.add("LIMB");

/* 3. extra tags / category */
if (Array.isArray(entry.tags)) {
  entry.tags.forEach(t => tagSet.add(String(t).toUpperCase()));
}
if (entry.category) {
  tagSet.add(String(entry.category).toUpperCase());
}

/* sort: primary first, rest after */
const sorted = [
  ...PRIMARY.filter(t => tagSet.has(t)),
  ...[...tagSet].filter(t => !PRIMARY.includes(t))
];

/* render */
sorted.forEach(t => {
  tags.appendChild(this.makeTag(t));
});

card.appendChild(tags);


    /* ---------- DETAILS ---------- */

    const details = document.createElement("div");
    details.className = "db-card-details";

    if (entry.type)
      details.appendChild(this.detail("dbDetailType", entry.type));
    if (entry.maxstrength !== undefined)
      details.appendChild(
        this.detail("dbDetailMaxStrength", entry.maxstrength)
      );
    if (entry.limbspecific !== undefined)
      details.appendChild(
        this.detail(
          "dbDetailLimbSpecific",
          entry.limbspecific ? strictLoc("yes") : strictLoc("no")
        )
      );
    if (entry.isbuff !== undefined)
      details.appendChild(
        this.detail(
          "dbDetailIsBuff",
          entry.isbuff ? strictLoc("yes") : strictLoc("no")
        )
      );

    card.appendChild(details);

    // Info toggle
info.onclick = e => {
  e.stopPropagation();

  // закрываем все остальные
  document.querySelectorAll(".db-entry.expanded").forEach(c => {
    if (c !== card) c.classList.remove("expanded");
  });

  card.classList.toggle("expanded");
};


    return card;
  }

makeTag(tag) {
  const el = document.createElement("span");
  el.className = "db-tag";
  el.textContent = tag;
  el.dataset.tag = tag.toUpperCase();
  return el;
}


  detail(label, value) {
    const d = document.createElement("div");
    d.innerHTML = `<strong>${strictLoc(label)}:</strong> ${value}`;
    return d;
  }

  /* =========================
     ICONS (MULTIPLY)
     ========================= */

  createIcon(icon) {
    const canvas = document.createElement("canvas");
    canvas.width = 48;
    canvas.height = 48;
    const ctx = canvas.getContext("2d");

    if (!icon || !icon.texture || !icon.sourcerect) {
      this.drawMissing(ctx);
      return canvas;
    }

    this.loadAtlas(icon.texture).then(img => {
      if (!img) return this.drawMissing(ctx);
      this.drawFromAtlas(ctx, img, icon);
    });

    return canvas;
  }

  loadAtlas(path) {
    if (this.atlasCache.has(path))
      return Promise.resolve(this.atlasCache.get(path));
    if (this.pendingAtlases.has(path))
      return this.pendingAtlases.get(path);

    const p = new Promise(res => {
      const img = new Image();
      img.onload = () => {
        this.atlasCache.set(path, img);
        this.pendingAtlases.delete(path);
        res(img);
      };
      img.onerror = () => {
        console.error("[ICON] Failed to load:", path);
        this.pendingAtlases.delete(path);
        res(null);
      };
      img.src = path;
    });

    this.pendingAtlases.set(path, p);
    return p;
  }

  drawFromAtlas(ctx, img, icon) {
    const r = icon.sourcerect.split(",").map(Number);
    if (r.length !== 4) return;

    const [sx, sy, sw, sh] = r;

    ctx.clearRect(0, 0, 48, 48);
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, 48, 48);

    const key = icon.color_theme_key?.replace(/_/g, "-");
    if (!key) return;

    const rgb = getComputedStyle(document.documentElement)
      .getPropertyValue(`--${key}-rgb`)
      .trim();
    if (!rgb) return;

    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = `rgb(${rgb})`;
    ctx.fillRect(0, 0, 48, 48);

    ctx.globalCompositeOperation = "destination-in";
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, 48, 48);
    ctx.globalCompositeOperation = "source-over";
  }

  drawMissing(ctx) {
    if (this.missingIconImg.complete) {
      ctx.drawImage(this.missingIconImg, 0, 0, 48, 48);
    }
  }
}

/* =========================
   GLOBAL
   ========================= */

window.dbManager = new DatabaseManager();

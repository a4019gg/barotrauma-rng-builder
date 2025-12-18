// js/db.js — v0.9.436 — DB (AFFLICTION ADAPTER FINAL)

const DB_VERSION = "v0.9.436";
window.DB_VERSION = DB_VERSION;

/* =========================
   ADAPTERS
   ========================= */

function adaptAffliction(raw) {
  return {
    id: raw.identifier,
    identifier: raw.identifier,
    name: raw.name || raw.identifier,
    description: raw.description || "",

    // gameplay
    type: raw.type || "unknown",
    maxstrength: Number(raw.maxstrength) || 0,
    limbspecific: raw.limbspecific === true || raw.limbspecific === "true",
    isbuff: raw.isbuff === true || raw.isbuff === "true",

    // icon (DB understands this format)
    icon: raw.icon || null,

    // tags
    category: "Affliction",

    _raw: raw
  };
}

function adaptItem(raw) {
  return {
    id: raw.id,
    name: raw.name || raw.id,
    category: raw.category || "Item",
    tags: raw.tags || [],
    description: "",
    icon: null
  };
}

function adaptCreature(raw) {
  return {
    id: raw.id,
    name: raw.name || raw.id,
    category: raw.category || "Creature",
    description: "",
    icon: null
  };
}

/* =========================
   DATABASE MANAGER
   ========================= */

class DatabaseManager {
  constructor() {
    this.initialized = false;
    this.domReady = false;

    this.currentTab = "afflictions";
    this.sortAsc = true;
    this.expandedCard = null;

    this.data = {
      afflictions: [],
      items: [],
      creatures: []
    };
  }

  /* =========================
     PUBLIC
     ========================= */

  async openDB() {
    this.createModal();
    await this.init();
    document.querySelector(".db-modal-overlay").style.display = "flex";
  }

  closeDB() {
    const overlay = document.querySelector(".db-modal-overlay");
    if (overlay) overlay.remove();
    this.initialized = false;
    this.domReady = false;
    this.expandedCard = null;
  }

  /* =========================
     INIT
     ========================= */

  async init() {
    if (this.initialized) return;
    this.initialized = true;

    await this.loadData();
    this.bindUI();
    this.render();
  }

  /* =========================
     MODAL
     ========================= */

  createModal() {
    if (this.domReady) return;

    document.body.insertAdjacentHTML("beforeend", `
<div class="db-modal-overlay">
  <div class="db-modal-content">

    <div class="db-pane">
      <div class="db-modal-header">
        <div class="db-tabs">
          <button class="db-tab-btn active" data-tab="afflictions">${loc("tabAfflictions")}</button>
          <button class="db-tab-btn" data-tab="items">${loc("tabItems")}</button>
          <button class="db-tab-btn" data-tab="creatures">${loc("tabCreatures")}</button>
        </div>

        <input class="db-search-input" placeholder="${loc("searchPlaceholder")}">
        <button class="db-sort-btn">A–Z</button>
        <button class="db-expand-all-btn">⧉</button>
        <button class="db-close-btn">✕</button>
      </div>

      <div class="db-grid"></div>
    </div>

    <div class="db-legend-pane">
      <h3>Legend</h3>
      <div>ⓘ — open details</div>
      <div>Click card — copy ID</div>
      <div>⧉ — expand / collapse all</div>
    </div>

  </div>
</div>
    `);

    this.domReady = true;
  }

  /* =========================
     DATA
     ========================= */

  async loadData() {
    const load = async (url) => {
      const r = await fetch(url);
      if (!r.ok) throw new Error(url);
      return r.json();
    };

    try {
      const [aff, items, creatures] = await Promise.all([
        load("data/afflictions.json"),
        load("data/items.json"),
        load("data/creatures.json")
      ]);

      this.data.afflictions = aff.map(adaptAffliction);
      this.data.items = items.map(adaptItem);
      this.data.creatures = creatures.map(adaptCreature);
    } catch (e) {
      console.error("[DB] load error", e);
    }
  }

  /* =========================
     UI
     ========================= */

  bindUI() {
    const overlay = document.querySelector(".db-modal-overlay");
    const grid = overlay.querySelector(".db-grid");

    overlay.querySelector(".db-close-btn").onclick = () => this.closeDB();

    overlay.querySelector(".db-sort-btn").onclick = () => {
      this.sortAsc = !this.sortAsc;
      overlay.querySelector(".db-sort-btn").textContent = this.sortAsc ? "A–Z" : "Z–A";
      this.render();
    };

    overlay.querySelector(".db-expand-all-btn").onclick = () => {
      const cards = [...overlay.querySelectorAll(".db-entry")];
      const expand = !cards.every(c => c.querySelector(".db-details").style.display === "block");
      cards.forEach(c => c.querySelector(".db-details").style.display = expand ? "block" : "none");
      this.expandedCard = null;
    };

    overlay.querySelector(".db-search-input").oninput = () => {
      this.expandedCard = null;
      this.render();
    };

    overlay.querySelectorAll(".db-tab-btn").forEach(btn => {
      btn.onclick = () => {
        overlay.querySelectorAll(".db-tab-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        this.currentTab = btn.dataset.tab;
        this.expandedCard = null;
        this.render();
      };
    });

    grid.addEventListener("click", (e) => {
      const card = e.target.closest(".db-entry");
      if (!card) return;

      if (e.target.classList.contains("db-info")) {
        this.toggleCard(card);
        e.stopPropagation();
        return;
      }

      navigator.clipboard.writeText(card.dataset.id);
    });
  }

  /* =========================
     RENDER
     ========================= */

  render() {
    const grid = document.querySelector(".db-grid");
    const search = document.querySelector(".db-search-input").value.toLowerCase();
    let list = [...this.data[this.currentTab]];

    if (search) {
      list = list.filter(e =>
        e.name.toLowerCase().includes(search) ||
        e.id.toLowerCase().includes(search)
      );
    }

    list.sort((a, b) => {
      const r = a.name.localeCompare(b.name);
      return this.sortAsc ? r : -r;
    });

    grid.innerHTML = list.map(e => this.createCard(e)).join("");

    grid.querySelectorAll(".db-entry").forEach((card, i) => {
      const entry = list[i];
      const iconBox = card.querySelector(".db-icon");
      iconBox.innerHTML = "";

     if (this.currentTab === "afflictions" && entry.icon) {
  const img = document.createElement("img");
  img.src = entry.icon.texture;
  img.style.width = "32px";
  img.style.height = "32px";
  img.style.objectFit = "none";

  // sourcerect: "x,y,w,h"
  const [x, y, w, h] = entry.icon.sourcerect.split(",").map(Number);
  img.style.objectPosition = `-${x}px -${y}px`;
  img.style.clipPath = `inset(${y}px ${x + w}px ${y + h}px ${x}px)`;

  iconBox.appendChild(img);
} else {
  iconBox.innerHTML = `<img src="assets/Missing_Texture_icon.png">`;
}

    });
  }

  /* =========================
     CARDS
     ========================= */

  createCard(e) {
    return `
<div class="db-entry" data-id="${e.id}">
  <div class="db-card-header">
    <div class="db-icon"></div>

    <div class="db-main">
      <div class="db-title">${e.name}</div>
      <div class="db-id">${e.id}</div>
      <div class="db-desc">${e.description}</div>
    </div>

    <div class="db-info">ⓘ</div>
  </div>

  <div class="db-tags">${this.renderTags(e)}</div>
  <div class="db-details" style="display:none">${this.renderDetails(e)}</div>
</div>`;
  }

  toggleCard(card) {
    if (this.expandedCard && this.expandedCard !== card) {
      this.expandedCard.querySelector(".db-details").style.display = "none";
    }
    const box = card.querySelector(".db-details");
    const open = box.style.display === "block";
    box.style.display = open ? "none" : "block";
    this.expandedCard = open ? null : card;
  }

  /* =========================
     DETAILS
     ========================= */

  renderDetails(e) {
    return `
<div><strong>ID:</strong> ${e.id}</div>
<div><strong>Type:</strong> ${e.type}</div>
<div><strong>Max strength:</strong> ${e.maxstrength}</div>
<div><strong>Limb:</strong> ${e.limbspecific ? "yes" : "no"}</div>
<div><strong>Buff:</strong> ${e.isbuff ? "yes" : "no"}</div>
    `;
  }

  /* =========================
     TAGS
     ========================= */

  renderTags(e) {
    const tags = [];
    if (e.category) tags.push(`<span class="db-tag">${e.category}</span>`);
    if (e.isbuff) tags.push(`<span class="db-tag db-tag-green">Buff</span>`);
    if (e.type === "damage") tags.push(`<span class="db-tag db-tag-red">Damage</span>`);
    return tags.join("");
  }
}

/* =========================
   GLOBAL
   ========================= */

if (!window.dbManager) {
  window.dbManager = new DatabaseManager();
}

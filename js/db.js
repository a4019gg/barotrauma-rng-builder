// js/db.js — v0.9.431 — DATABASE MANAGER (ARCHITECTURE FIX)

const DB_VERSION = "v0.9.431";
window.DB_VERSION = DB_VERSION;

class DatabaseManager {
  constructor() {
    this.initialized = false;
    this.domReady = false;

    this.currentTab = "afflictions";
    this.sortAsc = true;
    this.expandByDefault = false;

    this.data = null;
  }

  /* =========================
     PUBLIC API
     ========================= */

  async openDB() {
    if (!this.domReady) {
      this.createModal();
      await this.init();
    }

    const overlay = document.querySelector(".db-modal-overlay");
    if (overlay) overlay.style.display = "flex";
  }

  closeDB() {
    const overlay = document.querySelector(".db-modal-overlay");
    if (overlay) overlay.style.display = "none";
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
     DOM CREATION
     ========================= */

  createModal() {
    if (document.querySelector(".db-modal-overlay")) {
      this.domReady = true;
      return;
    }

    document.body.insertAdjacentHTML(
      "beforeend",
      `
<div class="db-modal-overlay" style="display:none">
  <div class="db-modal-content">
    <div class="db-modal-header">
      <div class="db-tabs">
        <button class="db-tab-btn active" data-tab="afflictions">${loc("tabAfflictions")}</button>
        <button class="db-tab-btn" data-tab="items">${loc("tabItems")}</button>
        <button class="db-tab-btn" data-tab="creatures">${loc("tabCreatures")}</button>
      </div>

      <input class="db-search-input" placeholder="${loc("searchPlaceholder")}" />

      <button class="db-expand-all">⧉</button>
      <button class="db-sort">A–Z</button>
      <button class="db-close">✕</button>
    </div>

    <div class="db-grid"></div>
  </div>
</div>`
    );

    this.domReady = true;
  }

  /* =========================
     DATA
     ========================= */

  async loadData() {
    const load = async (url) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load " + url);
      return res.json();
    };

    try {
      const [aff, items, creatures] = await Promise.all([
        load("data/afflictions.json"),
        load("data/items.json"),
        load("data/creatures.json")
      ]);

      this.data = {
        afflictions: aff,
        items,
        creatures
      };
    } catch (e) {
      console.error("[DB] Data load error", e);
      alert(loc("dbError"));
    }
  }

  /* =========================
     UI BINDING
     ========================= */

  bindUI() {
    const overlay = document.querySelector(".db-modal-overlay");
    const grid = overlay.querySelector(".db-grid");

    overlay.querySelector(".db-close").onclick = () => this.closeDB();

    overlay.querySelector(".db-sort").onclick = () => {
      this.sortAsc = !this.sortAsc;
      overlay.querySelector(".db-sort").textContent = this.sortAsc ? "A–Z" : "Z–A";
      this.render();
    };

    overlay.querySelector(".db-expand-all").onclick = () => {
      this.toggleExpandAll();
    };

    overlay.querySelector(".db-search-input").oninput = () => this.render();

    overlay.querySelectorAll(".db-tab-btn").forEach(btn => {
      btn.onclick = () => {
        overlay.querySelectorAll(".db-tab-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        this.currentTab = btn.dataset.tab;
        this.render();
      };
    });

    grid.addEventListener("click", (e) => {
      const card = e.target.closest(".db-entry");
      if (!card) return;

      if (e.target.classList.contains("db-id")) {
        navigator.clipboard.writeText(card.dataset.id);
        return;
      }

      this.toggleCard(card);
    });
  }

  /* =========================
     RENDER
     ========================= */

  render() {
    const grid = document.querySelector(".db-grid");
    if (!grid || !this.data) return;

    const search = document.querySelector(".db-search-input").value.toLowerCase();
    let list = [...(this.data[this.currentTab] || [])];

    if (search) {
      list = list.filter(e =>
        e.name?.toLowerCase().includes(search) ||
        e.id?.toLowerCase().includes(search)
      );
    }

    list.sort((a, b) => {
      const r = a.name.localeCompare(b.name);
      return this.sortAsc ? r : -r;
    });

    grid.innerHTML = "";

    if (!list.length) {
      grid.innerHTML = `<div class="db-empty">${loc("nothingFound")}</div>`;
      return;
    }

    list.forEach(entry => {
      grid.insertAdjacentHTML("beforeend", this.createCard(entry));
    });
  }

  /* =========================
     CARDS
     ========================= */

  createCard(entry) {
    const desc = entry.description || loc("noDescription");
    return `
<div class="db-entry" data-id="${entry.id}">
  <div class="db-header">
    <strong>${entry.name}</strong>
    <span class="db-id">${entry.id}</span>
  </div>
  <div class="db-description">${desc}</div>
  <div class="db-details" style="display:none">
    ${this.renderDetails(entry)}
  </div>
</div>`;
  }

  toggleCard(card) {
    const box = card.querySelector(".db-details");
    box.style.display = box.style.display === "none" ? "block" : "none";
  }

  toggleExpandAll() {
    const cards = [...document.querySelectorAll(".db-entry")];
    const expand = !cards.every(c => c.querySelector(".db-details").style.display === "block");

    cards.forEach(c => {
      c.querySelector(".db-details").style.display = expand ? "block" : "none";
    });
  }

  renderDetails(entry) {
    return `
<div><strong>${loc("dbDetailID")}:</strong> ${entry.id}</div>
<div><strong>${loc("dbDetailType")}:</strong> ${entry.type || "-"}</div>
${entry.maxstrength ? `<div><strong>${loc("dbDetailMaxStrength")}:</strong> ${entry.maxstrength}</div>` : ""}
`;
  }
}

/* =========================
   GLOBAL
   ========================= */

if (!window.dbManager) {
  window.dbManager = new DatabaseManager();
}

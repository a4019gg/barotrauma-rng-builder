// js/db.js — v0.9.435 — DB FINAL STABLE

const DB_VERSION = "v0.9.435";
window.DB_VERSION = DB_VERSION;

class DatabaseManager {
  constructor() {
    this.domReady = false;
    this.initialized = false;

    this.currentTab = "afflictions";
    this.sortAsc = true;
    this.expandedCard = null;

    this.data = null;
  }

  /* =========================
     PUBLIC
     ========================= */

  async openDB() {
    this.createModal();
    await this.init();
    const overlay = document.querySelector(".db-modal-overlay");
    if (overlay) overlay.style.display = "flex";
  }

  closeDB() {
    const overlay = document.querySelector(".db-modal-overlay");
    if (overlay) overlay.remove();
    this.domReady = false;
    this.initialized = false;
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
      <div>ⓘ — open / close details</div>
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

      this.data = { afflictions: aff, items, creatures };
    } catch (e) {
      console.error("[DB] load error", e);
      this.toast("error", loc("dbError"));
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
      if (!cards.length) return;

      const expand = !cards.every(c =>
        c.querySelector(".db-details").style.display === "block"
      );

      cards.forEach(c => {
        c.querySelector(".db-details").style.display = expand ? "block" : "none";
      });

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

      const id = card.dataset.id;
      if (id) {
        navigator.clipboard.writeText(id);
        this.toast("success", `ID copied: ${id}`);
      }
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
        (e.name || "").toLowerCase().includes(search) ||
        (e.identifier || e.id || "").toLowerCase().includes(search)
      );
    }

    list.sort((a, b) => {
      const r = (a.name || "").localeCompare(b.name || "");
      return this.sortAsc ? r : -r;
    });

    grid.innerHTML = list.length
      ? list.map(e => this.createCard(e)).join("")
      : `<div class="db-empty">${loc("nothingFound")}</div>`;

    // ICON INSERT (DOM)
    grid.querySelectorAll(".db-entry").forEach((card, i) => {
      const entry = list[i];
      const iconBox = card.querySelector(".db-icon");
      if (!iconBox) return;

      iconBox.innerHTML = "";

      if (this.currentTab === "afflictions" && typeof createRealIcon === "function") {
        try {
          iconBox.appendChild(createRealIcon(entry));
          return;
        } catch (e) {
          console.warn("[DB] icon error", e);
        }
      }

      iconBox.innerHTML = `<img src="assets/Missing_Texture_icon.png" alt="">`;
    });
  }

  /* =========================
     CARDS
     ========================= */

  createCard(entry) {
    const id = entry.identifier || entry.id;
    const name = entry.name || id;

    return `
<div class="db-entry" data-id="${id}">
  <div class="db-card-header">
    <div class="db-icon"></div>

    <div class="db-main">
      <div class="db-title">${name}</div>
      <div class="db-id">${id}</div>
      <div class="db-desc">${entry.description || loc("noDescription")}</div>
    </div>

    <div class="db-info">ⓘ</div>
  </div>

  <div class="db-tags">${this.renderTags(entry)}</div>
  <div class="db-details" style="display:none">${this.renderDetails(entry)}</div>
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
    const rows = [];

    const id = e.identifier || e.id;
    if (id) rows.push(`<div><strong>ID:</strong> ${id}</div>`);

    if (e.type) rows.push(`<div><strong>Type:</strong> ${e.type}</div>`);
    if (e.maxstrength) rows.push(`<div><strong>Max strength:</strong> ${e.maxstrength}</div>`);
    if (typeof e.limbspecific === "boolean")
      rows.push(`<div><strong>Limb:</strong> ${e.limbspecific ? "yes" : "no"}</div>`);
    if (typeof e.isbuff === "boolean")
      rows.push(`<div><strong>Buff:</strong> ${e.isbuff ? "yes" : "no"}</div>`);

    return rows.join("");
  }

  /* =========================
     TAGS
     ========================= */

  renderTags(e) {
    const tags = [];

    if (e.category) tags.push(`<span class="db-tag">${e.category}</span>`);
    if (Array.isArray(e.tags)) e.tags.forEach(t => tags.push(`<span class="db-tag">${t}</span>`));

    if (e.type === "damage") tags.push(`<span class="db-tag db-tag-red">Damage</span>`);
    if (e.isbuff) tags.push(`<span class="db-tag db-tag-green">Buff</span>`);

    return tags.join("");
  }

  /* =========================
     TOAST
     ========================= */

  toast(type, msg) {
    if (typeof uiToast === "function") uiToast(type, msg);
    else console.warn("[Toast]", type, msg);
  }
}

if (!window.dbManager) {
  window.dbManager = new DatabaseManager();
}

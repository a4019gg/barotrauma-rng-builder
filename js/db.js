// js/db.js — v0.9.434 — DB FIX (ICONS / TAGS / LEGEND / TOAST)

const DB_VERSION = "v0.9.434";
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
     PUBLIC API
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
     DOM
     ========================= */

  createModal() {
    if (this.domReady) return;

    document.body.insertAdjacentHTML(
      "beforeend",
      `
<div class="db-modal-overlay">
  <div class="db-modal-content" style="display:flex">
    
    <!-- DB PANE -->
    <div class="db-pane">
      <div class="db-modal-header">
        <div class="db-tabs">
          <button class="db-tab-btn active" data-tab="afflictions">${loc("tabAfflictions")}</button>
          <button class="db-tab-btn" data-tab="items">${loc("tabItems")}</button>
          <button class="db-tab-btn" data-tab="creatures">${loc("tabCreatures")}</button>
        </div>

        <input class="db-search-input" placeholder="${loc("searchPlaceholder")}" />
        <button class="db-sort-btn">A–Z</button>
        <button class="db-close-btn">✕</button>
      </div>

      <div class="db-grid"></div>
    </div>

    <!-- LEGEND PANE -->
    <div class="db-legend-pane">
      <h3>Legend</h3>
      <div class="db-legend-item"><strong>ⓘ</strong> — open / close details</div>
      <div class="db-legend-item">Click card — copy ID</div>
    </div>

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
      if (!res.ok) throw new Error(url);
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
      console.error("[DB] Load error", e);
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
    let list = [...(this.data[this.currentTab] || [])].filter(Boolean);

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

    // ВСТАВКА ИКОНОК КАК DOM
    grid.querySelectorAll(".db-entry").forEach((card, i) => {
      const entry = list[i];
      const iconBox = card.querySelector(".db-icon");
      if (!iconBox) return;

      if (typeof createRealIcon === "function" && this.currentTab === "afflictions") {
        try {
          iconBox.appendChild(createRealIcon(entry));
        } catch (e) {
          console.warn("[DB] Icon error", e);
        }
      } else {
        iconBox.innerHTML = `<img src="assets/Missing_Texture_icon.png" alt="">`;
      }
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

  <div class="db-tags">
    ${this.renderTags(entry)}
  </div>

  <div class="db-details" style="display:none">
    ${this.renderDetails(entry)}
  </div>
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
    if (id) rows.push(`<div><strong>${loc("dbDetailID")}:</strong> ${id}</div>`);

    if (e.type)
      rows.push(`<div><strong>${loc("dbDetailType")}:</strong> ${e.type}</div>`);

    if (e.maxstrength)
      rows.push(`<div><strong>${loc("dbDetailMaxStrength")}:</strong> ${e.maxstrength}</div>`);

    if (typeof e.limbspecific === "boolean")
      rows.push(`<div><strong>${loc("dbDetailLimbSpecific")}:</strong> ${e.limbspecific ? loc("yes") : loc("no")}</div>`);

    if (typeof e.isbuff === "boolean")
      rows.push(`<div><strong>${loc("dbDetailIsBuff")}:</strong> ${e.isbuff ? loc("yes") : loc("no")}</div>`);

    if (e.description)
      rows.push(`<div><strong>Description:</strong><br>${e.description}</div>`);

    return rows.join("");
  }

  /* =========================
     TAGS
     ========================= */

  renderTags(e) {
    const tags = [];

    if (e.category)
      tags.push(`<span class="db-tag">${e.category}</span>`);

    if (Array.isArray(e.tags))
      e.tags.forEach(t => tags.push(`<span class="db-tag">${t}</span>`));

    if (e.type === "damage")
      tags.push(`<span class="db-tag db-tag-red">Damage</span>`);

    if (e.isbuff)
      tags.push(`<span class="db-tag db-tag-green">Buff</span>`);

    return tags.join("");
  }

  /* =========================
     TOAST
     ========================= */

  toast(type, msg) {
    if (typeof uiToast === "function") {
      uiToast(type, msg);
    } else {
      console.warn("[Toast]", type, msg);
    }
  }
}

if (!window.dbManager) {
  window.dbManager = new DatabaseManager();
}

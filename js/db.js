// js/db.js — v0.9.432 — FINAL DATABASE PASS

const DB_VERSION = "v0.9.432";
window.DB_VERSION = DB_VERSION;

class DatabaseManager {
  constructor() {
    this.initialized = false;
    this.domReady = false;

    this.currentTab = "afflictions";
    this.sortAsc = true;

    this.expandedCard = null; // только ОДНА раскрытая карточка
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
     DOM
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

      <button class="db-sort-btn">A–Z</button>
      <button class="db-close-btn">✕</button>
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

      // ⓘ — раскрытие
      if (e.target.classList.contains("db-info")) {
        this.toggleCard(card);
        e.stopPropagation();
        return;
      }

      // клик по карточке = копировать ID
      const id = card.dataset.id;
      if (id) navigator.clipboard.writeText(id);
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

    // фильтрация мусора
    list = list.filter(e => e && (e.name || e.identifier || e.id));

    if (search) {
      list = list.filter(e =>
        (e.name || "").toLowerCase().includes(search) ||
        (e.identifier || e.id || "").toLowerCase().includes(search)
      );
    }

    list.sort((a, b) => {
      const an = a.name || "";
      const bn = b.name || "";
      const r = an.localeCompare(bn);
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
    const id = entry.identifier || entry.id || "unknown";
    const name = entry.name || id;
    const desc = entry.description || loc("noDescription");

    return `
<div class="db-entry" data-id="${id}">
  <div class="db-card-header">
    <div class="db-icon">${this.createIcon(entry)}</div>
    <div class="db-main">
      <div class="db-title">${name}</div>
      <div class="db-desc">${desc}</div>
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
    const details = card.querySelector(".db-details");

    if (this.expandedCard && this.expandedCard !== card) {
      this.expandedCard.querySelector(".db-details").style.display = "none";
    }

    const isOpen = details.style.display === "block";
    details.style.display = isOpen ? "none" : "block";
    this.expandedCard = isOpen ? null : card;
  }

  /* =========================
     DETAILS
     ========================= */

  renderDetails(entry) {
    const rows = [];

    const id = entry.identifier || entry.id;
    if (id) rows.push(`<div><strong>${loc("dbDetailID")}:</strong> ${id}</div>`);

    if (entry.type)
      rows.push(`<div><strong>${loc("dbDetailType")}:</strong> ${entry.type}</div>`);

    if (entry.maxstrength)
      rows.push(`<div><strong>${loc("dbDetailMaxStrength")}:</strong> ${entry.maxstrength}</div>`);

    if (typeof entry.limbspecific === "boolean")
      rows.push(`<div><strong>${loc("dbDetailLimbSpecific")}:</strong> ${entry.limbspecific ? loc("yes") : loc("no")}</div>`);

    if (typeof entry.isbuff === "boolean")
      rows.push(`<div><strong>${loc("dbDetailIsBuff")}:</strong> ${entry.isbuff ? loc("yes") : loc("no")}</div>`);

    return rows.join("");
  }

  /* =========================
     TAGS
     ========================= */

  renderTags(entry) {
    const tags = [];

    if (entry.category)
      tags.push(`<span class="db-tag">${entry.category}</span>`);

    if (Array.isArray(entry.tags)) {
      entry.tags.forEach(t => {
        tags.push(`<span class="db-tag">${t}</span>`);
      });
    }

    if (entry.limbspecific)
      tags.push(`<span class="db-tag db-tag-accent">${loc("dbDetailLimbSpecificShort")}</span>`);

    if (entry.isbuff)
      tags.push(`<span class="db-tag db-tag-green">${loc("dbDetailIsBuffShort")}</span>`);

    return tags.join("");
  }

  /* =========================
     ICONS
     ========================= */

  createIcon(entry) {
    if (!window.createRealIcon) return "";

    try {
      return createRealIcon(entry);
    } catch (e) {
      console.warn("[DB] Icon error:", entry, e);
      return "";
    }
  }
}

/* =========================
   GLOBAL
   ========================= */

if (!window.dbManager) {
  window.dbManager = new DatabaseManager();
}

// js/db.js — 0A2.0.707 — DATABASE VIEW (STABLE, UI-ONLY)
window.DB_VERSION = "0A2.0.707";

/*
  DB — ТОЛЬКО viewer.
  Никакой логики, никаких вычислений.
  Только отображение данных.
*/

const dbManager = {
  data: {
    afflictions: [],
    items: [],
    creatures: []
  },

  currentTab: "afflictions",
  searchQuery: "",

  /* =========================
     OPEN / CLOSE
     ========================= */

  openDB() {
    if (document.querySelector(".db-modal-overlay")) return;
    this.renderModal();
    this.loadData();
  },

  closeDB() {
    document.querySelector(".db-modal-overlay")?.remove();
  },

  /* =========================
     DATA LOADING
     ========================= */

  async loadData() {
    try {
      const [aff, items, creatures] = await Promise.all([
        fetch("data/afflictions.json").then(r => r.json()),
        fetch("data/items.json").then(r => r.json()),
        fetch("data/creatures.json").then(r => r.json())
      ]);

      this.data.afflictions = aff.map(this.normalizeEntry);
      this.data.items = items;
      this.data.creatures = creatures;

      this.renderList();
    } catch (e) {
      console.error("[DB] Load error", e);
      alert(loc("dbError"));
    }
  },

  /* =========================
     NORMALIZATION (NEW FORMAT SAFE)
     ========================= */

  normalizeEntry(entry) {
    // Никакой логики — только страховка от нового формата
    return {
      id: entry.id || "unknown",
      name: entry.name || entry.id || "unknown",
      description: entry.description || loc("noDescription"),
      maxstrength: entry.maxstrength ?? null,
      limbspecific: !!entry.limbspecific,
      isbuff: !!entry.isbuff,

      // иконка — DB ТОЛЬКО ПОКАЗЫВАЕТ
      icon: entry.icon || {
        role: "status",
        colorMode: "fixed",
        fixedColorKey: "status-gray"
      },

      tags: this.buildTags(entry)
    };
  },

  buildTags(entry) {
    const tags = [];

    if (entry.isbuff) tags.push({ key: "BUFF", label: loc("dbDetailIsBuffShort") });
    if (entry.limbspecific) tags.push({ key: "LIMB", label: loc("dbDetailLimbSpecificShort") });

    return tags;
  },

  /* =========================
     RENDER
     ========================= */

  renderModal() {
    const overlay = document.createElement("div");
    overlay.className = "db-modal-overlay";
    overlay.innerHTML = `
      <div class="db-modal-content">
        <div class="db-modal-header">
          <strong>${loc("dataBase")}</strong>
          <button class="danger small" id="db-close">×</button>
        </div>

        <div class="db-tabs">
          <button class="db-tab-btn active" data-tab="afflictions">${loc("tabAfflictions")}</button>
          <button class="db-tab-btn" data-tab="items">${loc("tabItems")}</button>
          <button class="db-tab-btn" data-tab="creatures">${loc("tabCreatures")}</button>
        </div>

        <input class="db-search-input" placeholder="${loc("searchPlaceholder")}">

        <div class="db-list"></div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector("#db-close").onclick = () => this.closeDB();

    overlay.querySelectorAll(".db-tab-btn").forEach(btn => {
      btn.onclick = () => {
        overlay.querySelectorAll(".db-tab-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        this.currentTab = btn.dataset.tab;
        this.renderList();
      };
    });

    overlay.querySelector(".db-search-input").oninput = e => {
      this.searchQuery = e.target.value.toLowerCase();
      this.renderList();
    };
  },

  renderList() {
    const list = document.querySelector(".db-list");
    if (!list) return;

    list.innerHTML = "";

    const entries = this.data[this.currentTab] || [];
    const filtered = entries.filter(e =>
      e.id.toLowerCase().includes(this.searchQuery) ||
      e.name.toLowerCase().includes(this.searchQuery)
    );

    if (!filtered.length) {
      list.innerHTML = `<div class="db-empty">${loc("nothingFound")}</div>`;
      return;
    }

    filtered.forEach(entry => list.appendChild(this.renderEntry(entry)));
  },

  renderEntry(entry) {
    const el = document.createElement("div");
    el.className = "db-entry";

    el.innerHTML = `
      <div class="db-summary">
        <span class="db-id">${entry.id}</span>
        ${entry.tags.map(t => `<span class="db-tag" data-tag="${t.key}">${t.label}</span>`).join("")}
        <span class="info-toggle">ⓘ</span>
      </div>

      <div class="db-details">
        <div><strong>${loc("dbDetailID")}:</strong> ${entry.id}</div>
        ${entry.maxstrength !== null
          ? `<div><strong>${loc("dbDetailMaxStrength")}:</strong> ${entry.maxstrength}</div>`
          : ""
        }
        <div>${entry.description}</div>
      </div>
    `;

    el.querySelector(".info-toggle").onclick = () => {
      el.classList.toggle("expanded");
    };

    return el;
  }
};

/* =========================
   GLOBAL
   ========================= */

window.dbManager = dbManager;

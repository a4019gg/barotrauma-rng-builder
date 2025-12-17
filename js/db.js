// js/db.js — v0.9.421_final_multiply

const DB_VERSION = "v0.9.421_final_multiply";
window.DB_VERSION = DB_VERSION;

class DatabaseManager {
  constructor() {
    this.currentTab = "afflictions";
    this.sortAsc = true;
    this.expandByDefault = false; // читается из настроек, если есть

    this.data = {
      afflictions: [],
      items: [],
      creatures: []
    };
  }

  async init() {
    await this.loadData();
    this.bindUI();
    this.render();
  }

  async loadData() {
    const load = async (url) => {
      const r = await fetch(url);
      if (!r.ok) {
        console.error(`[DB] Failed to load ${url}`);
        return [];
      }
      return r.json();
    };

    this.data.afflictions = await load("data/afflictions.json");
    this.data.items        = await load("data/items.json");
    this.data.creatures    = await load("data/creatures.json");
  }

  bindUI() {
    const grid = document.querySelector(".db-grid");
    if (!grid) {
      console.error("[DB] .db-grid not found");
      return;
    }

    /* Event delegation */
    grid.addEventListener("click", (e) => {
      const card = e.target.closest(".db-entry");
      if (!card) return;

      if (e.target.classList.contains("info-toggle")) {
        e.stopPropagation();
        this.toggleCard(card);
        return;
      }

      // click on card = copy ID
      const id = card.dataset.id;
      if (id) navigator.clipboard.writeText(id);
    });

    const expandAllBtn = document.querySelector("[data-db-expand-all]");
    expandAllBtn?.addEventListener("click", () => this.toggleExpandAll());

    const sortBtn = document.querySelector("[data-db-sort]");
    sortBtn?.addEventListener("click", () => {
      this.sortAsc = !this.sortAsc;
      this.render();
    });

    document.querySelectorAll(".db-tab-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const tab = btn.dataset.tab;
        if (!tab || tab === this.currentTab) return;

        document.querySelector(".db-tab-btn.active")?.classList.remove("active");
        btn.classList.add("active");

        this.currentTab = tab;
        this.render();
      });
    });
  }

  render() {
    const grid = document.querySelector(".db-grid");
    if (!grid) return;

    grid.innerHTML = "";

    let list = [...(this.data[this.currentTab] || [])];

    list.sort((a, b) =>
      this.sortAsc
        ? a.id.localeCompare(b.id)
        : b.id.localeCompare(a.id)
    );

    if (!list.length) {
      grid.innerHTML = `<div class="db-empty">Nothing found</div>`;
      return;
    }

    const frag = document.createDocumentFragment();
    list.forEach(entry => frag.appendChild(this.createCard(entry)));
    grid.appendChild(frag);
  }

  createCard(entry) {
    const card = document.createElement("div");
    card.className = "db-entry";
    card.dataset.id = entry.id;

    if (this.expandByDefault) card.classList.add("expanded");

    card.innerHTML = `
      <div class="db-header">
        <div class="db-title">
          <strong>${entry.name || entry.id}</strong>
          <span class="db-id">${entry.id}</span>
        </div>
        <span class="info-toggle">ⓘ</span>
      </div>

      <div class="db-summary">
        ${entry.description || ""}
      </div>

      <div class="db-details"></div>

      <div class="db-tags">
        ${this.renderTags(entry)}
      </div>
    `;

    return card;
  }

  renderTags(entry) {
    const tags = [];

    if (entry.category) {
      tags.push(`<span class="db-tag">${entry.category}</span>`);
    }

    if (Array.isArray(entry.tags)) {
      entry.tags.forEach(t =>
        tags.push(`<span class="db-tag">${t}</span>`)
      );
    }

    // эффекты — семантические тэги
    if (this.currentTab === "afflictions") {
      if (entry.type) {
        tags.push(`<span class="db-tag" data-tag="${entry.type.toUpperCase()}">${entry.type}</span>`);
      }
      if (entry.limbspecific) {
        tags.push(`<span class="db-tag" data-tag="LIMB">LIMB</span>`);
      }
      if (entry.isbuff === true) {
        tags.push(`<span class="db-tag" data-tag="BUFF">BUFF</span>`);
      }
      if (entry.isbuff === false) {
        tags.push(`<span class="db-tag" data-tag="DEBUFF">DEBUFF</span>`);
      }
    }

    return tags.join("");
  }

  toggleCard(card) {
    const expanded = card.classList.toggle("expanded");
    if (expanded) this.ensureDetails(card);
  }

  toggleExpandAll() {
    const cards = [...document.querySelectorAll(".db-entry")];
    if (!cards.length) return;

    const expand = !cards.every(c => c.classList.contains("expanded"));
    let i = 0;

    const batch = () => {
      for (let n = 0; n < 20 && i < cards.length; n++, i++) {
        const c = cards[i];
        c.classList.toggle("expanded", expand);
        if (expand) this.ensureDetails(c);
      }
      if (i < cards.length) requestAnimationFrame(batch);
    };

    batch();
  }

  ensureDetails(card) {
    const box = card.querySelector(".db-details");
    if (!box || box.dataset.ready) return;

    const id = card.dataset.id;
    const entry = this.data[this.currentTab].find(e => e.id === id);
    if (!entry) return;

    box.dataset.ready = "1";
    box.innerHTML = this.renderDetails(entry);
  }

  renderDetails(entry) {
    if (this.currentTab === "afflictions") {
      return `
        <div><b>Type:</b> ${entry.type}</div>
        <div><b>Max strength:</b> ${entry.maxstrength}</div>
        <div><b>Limb specific:</b> ${entry.limbspecific ? "yes" : "no"}</div>
        <div><b>Buff:</b> ${entry.isbuff ? "yes" : "no"}</div>
      `;
    }

    if (this.currentTab === "items") {
      return `
        <div><b>ID:</b> ${entry.id}</div>
        <div><b>Category:</b> ${entry.category || "-"}</div>
      `;
    }

    if (this.currentTab === "creatures") {
      return `
        <div><b>ID:</b> ${entry.id}</div>
        <div><b>Category:</b> ${entry.category || "-"}</div>
      `;
    }

    return "";
  }
}

/* гарантированная инициализация после DOM */
document.addEventListener("DOMContentLoaded", () => {
  window.dbManager = new DatabaseManager();
  window.dbManager.init();
});

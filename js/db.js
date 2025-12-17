const DB_VERSION = "v0.9.422";
window.DB_VERSION = DB_VERSION;

// js/db.js — DB UI (final)

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
    this.init();
  }

  async init() {
    await this.loadData();
    this.bindUI();
    this.render();
  }

  async loadData() {
    const load = async (url) => {
      const r = await fetch(url);
      return r.ok ? r.json() : [];
    };

    this.data.afflictions = await load("data/afflictions.json");
    this.data.items = await load("data/items.json");
    this.data.creatures = await load("data/creatures.json");
  }

  bindUI() {
    const grid = document.getElementById("db-grid");

    grid.addEventListener("click", (e) => {
      const card = e.target.closest(".db-entry");
      if (!card) return;

      if (e.target.classList.contains("info-toggle")) {
        this.toggleCard(card);
        e.stopPropagation();
        return;
      }

      // click on card = copy ID
      const id = card.dataset.id;
      navigator.clipboard.writeText(id);
    });

    document.getElementById("db-expand-all")
      ?.addEventListener("click", () => this.toggleExpandAll());

    document.getElementById("db-sort")
      ?.addEventListener("click", () => {
        this.sortAsc = !this.sortAsc;
        this.render();
      });
  }

  render() {
    const grid = document.getElementById("db-grid");
    grid.innerHTML = "";

    let list = [...this.data[this.currentTab]];
    list.sort((a, b) =>
      this.sortAsc
        ? a.id.localeCompare(b.id)
        : b.id.localeCompare(a.id)
    );

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
    if (entry.category) tags.push(entry.category);
    if (Array.isArray(entry.tags)) tags.push(...entry.tags);

    return tags.map(t => `<span class="db-tag">${t}</span>`).join("");
  }

  toggleCard(card) {
    const expanded = card.classList.toggle("expanded");
    if (expanded) this.ensureDetails(card);
  }

  toggleExpandAll() {
    const cards = [...document.querySelectorAll(".db-entry")];
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
    if (box.dataset.ready) return;

    const id = card.dataset.id;
    const entry = this.data[this.currentTab].find(e => e.id === id);
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
        <div><b>Category:</b> ${entry.category}</div>
        <div><b>ID:</b> ${entry.id}</div>
      `;
    }

    if (this.currentTab === "creatures") {
      return `
        <div><b>Category:</b> ${entry.category}</div>
        <div><b>ID:</b> ${entry.id}</div>
      `;
    }

    return "";
  }
}

window.dbManager = new DatabaseManager();

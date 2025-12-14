// js/db.js — v0.9.201 — РЕФАКТОРИНГ: КЛАСС, БЕЗОПАСНЫЙ DOM, CSS-КЛАССЫ

const DB_VERSION = "v0.9.201";

class DatabaseManager {
  constructor() {
    this.dbVersion = DB_VERSION;
    this.items = [];
    this.creatures = [];
    this.afflictions = [];
    this.currentTab = 'items';
    this.databases = {
      items: this.items,
      creatures: this.creatures,
      afflictions: this.afflictions
    };
    this.cachePrefix = `${this.dbVersion}_`;
    this.presets = [
      { name: "Basic Loot", file: "presets/basic-loot.json" },
      { name: "Monster Encounter", file: "presets/monster-encounter.json" },
      { name: "Affliction Test", file: "presets/affliction-test.json" }
    ];
  }

  async loadData(type) {
    const cacheKey = `${this.cachePrefix}${type}`;
    let data = await this.loadFromCache(cacheKey);
    if (!data) {
      try {
        data = await this.fetchFromServer(`data/${type}.json`);
        await this.saveToCache(cacheKey, data);
      } catch (error) {
        console.error(`Failed to load ${type} database:`, error);
        data = [];
      }
    }
    this[type] = data;
    this.databases[type] = data;
  }

  async loadFromCache(key) {
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(`Corrupted cache for ${key}:`, e);
        localStorage.removeItem(key);
      }
    }
    return null;
  }

  async saveToCache(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error("Failed to save to cache:", e);
    }
  }

  async fetchFromServer(url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
  }

  async initialize() {
    await Promise.all([
      this.loadData('items'),
      this.loadData('creatures'),
      this.loadData('afflictions')
    ]);
  }

  openDB() {
    const currentData = this.databases[this.currentTab];

    if (currentData.length === 0) {
      alert(`ERROR: ${this.currentTab} database not loaded (check data/${this.currentTab}.json)`);
      return;
    }

    let filtered = currentData.slice();

    const modal = this.createModal();
    document.body.appendChild(modal);

    const grid = modal.querySelector('#db-grid');
    const empty = modal.querySelector('#db-empty');
    const searchInput = modal.querySelector('#db-search');
    const presetSelect = modal.querySelector('#db-presets');

    this.setupTabs(modal);
    this.setupSearch(searchInput, filtered, grid, empty);
    this.setupPresets(presetSelect, modal);
    this.renderGrid(grid, empty, filtered);

    searchInput.focus();
  }

  createModal() {
    const modal = document.createElement('div');
    modal.className = 'db-modal-overlay';

    const content = document.createElement('div');
    content.className = 'db-modal-content';

    const header = document.createElement('div');
    header.className = 'db-modal-header';

    const tabs = document.createElement('div');
    tabs.className = 'db-tabs';
    tabs.innerHTML = `
      <button class="db-tab-btn active" data-tab="items">${loc('tabItems', 'Items')}</button>
      <button class="db-tab-btn" data-tab="creatures">${loc('tabCreatures', 'Creatures')}</button>
      <button class="db-tab-btn" data-tab="afflictions">${loc('tabAfflictions', 'Afflictions')}</button>
    `;

    const search = document.createElement('input');
    search.type = 'text';
    search.id = 'db-search';
    search.placeholder = loc('searchPlaceholder', 'Search...');
    search.className = 'db-search-input';

    const presetsSelect = document.createElement('select');
    presetsSelect.id = 'db-presets';
    presetsSelect.className = 'db-presets-select';
    let options = `<option value="">${loc('presets', 'Presets & Examples')}</option>`;
    this.presets.forEach(p => {
      options += `<option value="${p.file}">${p.name}</option>`;
    });
    presetsSelect.innerHTML = options;

    header.appendChild(tabs);
    header.appendChild(search);
    header.appendChild(presetsSelect);

    const grid = document.createElement('div');
    grid.id = 'db-grid';
    grid.className = 'db-grid';

    const empty = document.createElement('div');
    empty.id = 'db-empty';
    empty.className = 'db-empty';
    empty.textContent = loc('nothingFound', 'Nothing found');

    content.appendChild(header);
    content.appendChild(grid);
    content.appendChild(empty);
    modal.appendChild(content);

    return modal;
  }

  setupTabs(modal) {
    modal.querySelectorAll('.db-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.currentTab = btn.dataset.tab;
        const currentData = this.databases[this.currentTab];
        let filtered = currentData.slice();

        modal.querySelectorAll('.db-tab-btn').forEach(b => b.classList.toggle('active', b === btn));
        this.renderGrid(modal.querySelector('#db-grid'), modal.querySelector('#db-empty'), filtered);
        modal.querySelector('#db-search').value = '';
      });
    });
  }

  setupSearch(input, filtered, grid, empty) {
    input.addEventListener('input', () => {
      const q = input.value.toLowerCase();
      const currentData = this.databases[this.currentTab];
      filtered = currentData.filter(entry =>
        (entry.name && entry.name.toLowerCase().includes(q)) ||
        entry.id.toLowerCase().includes(q) ||
        (entry.category && entry.category.toLowerCase().includes(q))
      );
      this.renderGrid(grid, empty, filtered);
    });
  }

  setupPresets(select, modal) {
    select.addEventListener('change', () => {
      const file = select.value;
      if (!file) return;
      fetch(file)
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(data => {
          document.getElementById('root-children').innerHTML = data.html || '';
          updateAll();
          modal.remove();
          alert(loc('presetLoaded', 'Preset loaded'));
        })
        .catch(() => alert(loc('presetError', 'Preset loading error')))
        .finally(() => select.value = '');
    });
  }

  renderGrid(grid, empty, data) {
    grid.innerHTML = '';
    if (data.length === 0) {
      empty.style.display = 'flex';
      grid.style.display = 'none';
      return;
    }
    empty.style.display = 'none';
    grid.style.display = 'grid';

    data.forEach(entry => {
      const button = document.createElement('button');
      button.className = 'db-entry-btn';
      button.dataset.entryId = entry.id;

      const name = document.createElement('div');
      name.className = 'db-entry-name';
      name.textContent = entry.name || entry.id;

      const id = document.createElement('div');
      id.className = 'db-entry-id';
      id.textContent = entry.id;

      const category = document.createElement('div');
      category.className = 'db-entry-category';
      category.textContent = entry.category || '';

      button.appendChild(name);
      button.appendChild(id);
      button.appendChild(category);

      button.addEventListener('click', () => {
        const active = document.activeElement;
        const classMap = {
          items: 'item-field',
          creatures: 'creature-field',
          afflictions: 'aff-field'
        };
        const targetClass = classMap[this.currentTab];
        if (active && active.classList.contains(targetClass)) {
          active.value = entry.id;
          updateAll();
        }
        button.closest('.db-modal-overlay').remove();
      });

      grid.appendChild(button);
    });
  }
}

// Глобальный экземпляр
const dbManager = new DatabaseManager();
window.openDB = () => dbManager.openDB();

document.addEventListener('DOMContentLoaded', () => dbManager.initialize());

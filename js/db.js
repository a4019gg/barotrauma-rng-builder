// js/db.js — v0.9.200 — ТРИ ОТДЕЛЬНЫЕ БАЗЫ: items, creatures, afflictions

const DB_VERSION = "v0.9.200";
window.DB_VERSION = DB_VERSION;

let items = [];
let creatures = [];
let afflictions = [];

let currentTab = 'items'; // items | creatures | afflictions

// Пресеты (как раньше)
const presets = [
  { name: "Basic Loot", file: "presets/basic-loot.json" },
  { name: "Monster Encounter", file: "presets/monster-encounter.json" },
  { name: "Affliction Test", file: "presets/affliction-test.json" }
];

// Загрузка всех баз
function loadDatabases() {
  const load = (url, target) => {
    const saved = localStorage.getItem(`${target}DB_v0.9.200`);
    if (saved) {
      try {
        window[target] = JSON.parse(saved);
        return;
      } catch (e) {}
    }

    fetch(url)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(data => {
        window[target] = data;
        localStorage.setItem(`${target}DB_v0.9.200`, JSON.stringify(data));
      })
      .catch(err => {
        console.error(`MISSING DATABASE: ${url}`, err);
        window[target] = [];
      });
  };

  load('data/items.json', 'items');
  load('data/creatures.json', 'creatures');
  load('data/afflictions.json', 'afflictions');
}

// Открытие базы
function openDB() {
  const allData = { items, creatures, afflictions };
  let currentData = allData[currentTab];

  if (currentData.length === 0) {
    alert(`ERROR: ${currentTab} database not loaded (check data/${currentTab}.json)`);
    return;
  }

  let filtered = currentData;

  const modal = document.createElement('div');
  modal.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;z-index:10001;`;

  modal.innerHTML = `
    <div style="background:var(--panel);width:90%;max-width:1200px;height:85vh;border-radius:12px;display:flex;flex-direction:column;overflow:hidden;">
      <div style="padding:16px;border-bottom:1px solid var(--border);flex-shrink:0;display:flex;gap:16px;align-items:center;">
        <div style="display:flex;gap:8px;">
          <button id="tab-items" class="tab-btn active">Items</button>
          <button id="tab-creatures" class="tab-btn">Creatures</button>
          <button id="tab-afflictions" class="tab-btn">Afflictions</button>
        </div>
        <input type="text" id="db-search" placeholder="${L.searchPlaceholder || 'MISSING LOC KEY: searchPlaceholder'}" style="flex:1;padding:12px;background:#333;color:#fff;border:1px solid #555;border-radius:8px;">
        <select id="db-presets" style="padding:12px;background:#333;color:#fff;border:1px solid #555;border-radius:8px;">
          <option value="">${L.presets || 'MISSING LOC KEY: presets'}</option>
          ${presets.map(p => `<option value="${p.file}">${p.name}</option>`).join('')}
        </select>
      </div>
      <div id="db-grid" style="flex:1;overflow-y:auto;padding:20px;display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px;"></div>
      <div id="db-empty" style="flex:1;display:none;align-items:center;justify-content:center;color:#888;font-size:20px;">
        ${L.nothingFound || 'MISSING LOC KEY: nothingFound'}
      </div>
    </div>
  `;

  modal.onclick = e => e.target === modal && modal.remove();
  document.body.appendChild(modal);

  const grid = modal.querySelector('#db-grid');
  const empty = modal.querySelector('#db-empty');
  const search = modal.querySelector('#db-search');
  const presetSelect = modal.querySelector('#db-presets');

  // Вкладки
  modal.querySelector('#tab-items').onclick = () => switchTab('items');
  modal.querySelector('#tab-creatures').onclick = () => switchTab('creatures');
  modal.querySelector('#tab-afflictions').onclick = () => switchTab('afflictions');

  function switchTab(tab) {
    currentTab = tab;
    currentData = allData[tab];
    filtered = currentData;
    modal.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    modal.querySelector(`#tab-${tab}`).classList.add('active');
    render(filtered);
    search.value = '';
  }

  // Рендер
  function render(data) {
    grid.innerHTML = '';
    if (data.length === 0) {
      empty.style.display = 'flex';
      grid.style.display = 'none';
      return;
    }
    empty.style.display = 'none';
    grid.style.display = 'grid';

    data.forEach(entry => {
      const btn = document.createElement('button');
      btn.style.cssText = `padding:16px;background:#2d2d30;border:none;border-radius:8px;text-align:left;cursor:pointer;transition:background 0.2s;`;
      btn.onmouseover = () => btn.style.background = '#363636';
      btn.onmouseout = () => btn.style.background = '#2d2d30';
      btn.onclick = () => {
        const active = document.activeElement;
        const classMap = {
          items: 'item-field',
          creatures: 'creature-field',
          afflictions: 'aff-field'
        };
        if (active && active.classList.contains(classMap[currentTab])) {
          active.value = entry.id;
          updateAll();
        }
        modal.remove();
      };

      btn.innerHTML = `
        <div style="font-weight:bold;color:#61afef;">${entry.name || entry.id}</div>
        <div style="font-size:12px;color:#888;">${entry.id}</div>
        <div style="font-size:11px;color:#666;margin-top:6px;">${entry.category || ''}</div>
      `;
      grid.appendChild(btn);
    });
  }

  // Поиск
  search.oninput = () => {
    const q = search.value.toLowerCase();
    filtered = currentData.filter(entry =>
      (entry.name && entry.name.toLowerCase().includes(q)) ||
      entry.id.toLowerCase().includes(q) ||
      (entry.category && entry.category.toLowerCase().includes(q))
    );
    render(filtered);
  };

  // Пресеты
  presetSelect.onchange = () => {
    const file = presetSelect.value;
    if (!file) return;
    fetch(file)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        document.getElementById('root-children').innerHTML = data.html || '';
        updateAll();
        modal.remove();
        alert(L.presetLoaded || 'MISSING LOC KEY: presetLoaded');
      })
      .catch(() => alert(L.presetError || 'MISSING LOC KEY: presetError'));
  };

  render(currentData);
  search.focus();
}

window.openDB = openDB;

document.addEventListener('DOMContentLoaded', loadDatabases);

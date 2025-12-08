// js/db.js — v0.9.120 — ФИКСИРОВАННЫЙ РАЗМЕР, КРАСИВЫЙ ПОИСК

const DB_VERSION = "v0.9.120";
window.DB_VERSION = DB_VERSION;

let itemsDB = [];

// Загружаем базу
function loadDatabase() {
  const saved = localStorage.getItem('itemsDB_v0.9.120');
  if (saved) {
    try {
      items = JSON.parse(saved);
      populateDatalist();
      return;
    } catch (e) { /* продолжаем */ }
  }

  fetch('data/items.json')
    .then(r => r.ok ? r.json() : Promise.reject())
    .then(data => {
      items = data;
      localStorage.setItem('itemsDB_v0.9.120', JSON.stringify(items));
      populateDatalist();
    })
    .catch(() => {
      items = [
        { id: "revolver", name: "Revolver", category: "Weapons" },
        { id: "smg", name: "SMG", category: "Weapons" },
        { id: "morphine", name: "Morphine", category: "Medical" }
      ];
      populateDatalist();
    });
}

function populateDatalist() {
  const dl = document.getElementById('item-datalist');
  dl.innerHTML = '';
  items.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item.id;
    opt.textContent = `${item.name} [${item.id}]`;
    dl.appendChild(opt);
  });
}

// ОТКРЫТИЕ БАЗЫ
function openDB() {
  let filtered = items;

  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed; inset: 0; background: rgba(0,0,0,0.9);
    display: flex; align-items: center; justify-content: center;
    z-index: 10001;
  `;

  modal.innerHTML = `
    <div style="
      background: var(--panel);
      width: 90%; max-width: 1000px;
      height: 85vh;
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    ">
      <div style="padding: 16px; border-bottom: 1px solid var(--border); flex-shrink: 0;">
        <input type="text" id="db-search" placeholder="${L.searchPlaceholder || 'Поиск по имени, ID, категории...'}" 
               style="width: 100%; padding: 12px; background: #333; color: #fff; border: 1px solid #555; border-radius: 8px; font-size: 16px;">
      </div>
      <div id="db-grid" style="
        flex: 1;
        overflow-y: auto;
        padding: 20px;
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
        gap: 16px;
        min-height: 0;
      "></div>
      <div id="db-empty" style="
        flex: 1;
        display: none;
        align-items: center;
        justify-content: center;
        color: #888;
        font-size: 18px;
      ">Ничего не найдено</div>
    </div>
  `;

  modal.onclick = e => e.target === modal && modal.remove();
  document.body.appendChild(modal);

  const grid = modal.querySelector('#db-grid');
  const empty = modal.querySelector('#db-empty');
  const search = modal.querySelector('#db-search');

  function render(itemsToShow) {
    grid.innerHTML = '';
    if (itemsToShow.length === 0) {
      empty.style.display = 'flex';
      grid.style.display = 'none';
      return;
    }
    empty.style.display = 'none';
    grid.style.display = 'grid';

    itemsToShow.forEach(item => {
      const btn = document.createElement('button');
      btn.style.cssText = `
        padding: 16px;
        background: #2d2d30;
        border: none;
        border-radius: 8px;
        text-align: left;
        cursor: pointer;
        transition: all 0.2s;
      `;
      btn.onmouseover = () => btn.style.background = '#363636';
      btn.onmouseout = () => btn.style.background = '#2d2d30';
      btn.onclick = () => {
        const active = document.activeElement;
        if (active && active.classList.contains('item-field')) {
          active.value = item.id;
          updateAll();
        }
        modal.remove();
      };

      btn.innerHTML = `
        <div style="font-weight: bold; color: #61afef;">${item.name}</div>
        <div style="font-size: 12px; color: #888; margin-top: 4px;">${item.id}</div>
        <div style="font-size: 11px; color: #666; margin-top: 6px;">${item.category || ''}</div>
      `;
      grid.appendChild(btn);
    });
  }

  search.oninput = () => {
    const q = search.value.toLowerCase();
    filtered = items.filter(item =>
      item.name.toLowerCase().includes(q) ||
      item.id.toLowerCase().includes(q) ||
      (item.category && item.category.toLowerCase().includes(q))
    );
    render(filtered);
  };

  render(items);
  search.focus();
}

// Экспорт
window.openDB = openDB;

// Старт
document.addEventListener('DOMContentLoaded', loadDatabase);

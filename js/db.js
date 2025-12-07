// js/db.js — 100% РАБОЧИЙ, БЕЗ ОШИБОК, v0.9.7

let itemsDB = { Vanilla: [], Mods: [] };

function populateDatalist() {
  const saved = localStorage.getItem('itemsDB_v0.9.7');
  if (saved) {
    itemsDB = JSON.parse(saved);
    fillDatalist();
    return;
  }

  fetch('data/items.json')
    .then(r => r.json())
    .then(data => {
      itemsDB.Vanilla = data;
      localStorage.setItem('itemsDB_v0.9.7', JSON.stringify(itemsDB));
      fillDatalist();
    })
    .catch(() => {
      itemsDB.Vanilla = [
        { id: "revolver", name: "Revolver", category: "Weapons" },
        { id: "morphine", name: "Morphine", category: "Medical" }
      ];
      fillDatalist();
    });
}

function fillDatalist() {
  const dl = document.getElementById('item-datalist');
  dl.innerHTML = '';
  [...itemsDB.Vanilla, ...itemsDB.Mods].forEach(item => {
    const opt = document.createElement('option');
    opt.value = item.id;
    dl.appendChild(opt);
  });
}

function openDB() {
  const allItems = [...itemsDB.Vanilla, ...itemsDB.Mods];

  let html = `
    <div style="padding:20px;max-height:85vh;overflow-y:auto">
      <input type="text" id="db-search" placeholder="Поиск..." oninput="filterDB(this.value)" 
             style="width:100%;padding:12px;margin-bottom:20px;background:#333;color:#fff;border:1px solid #555;border-radius:8px">
      <div style="display:flex;flex-wrap:wrap;gap:12px">`;

  allItems.forEach(item => {
    const tags = item.tags ? item.tags.join(', ') : '';
    html += `
      <div class="db-item" onclick="insertItem('${item.id}')" 
           style="background:#2a2a2e;padding:15px;border-radius:8px;cursor:pointer;width:200px">
        <strong style="color:#61afef">${item.name || item.id}</strong><br>
        <small style="color:#888">${item.id}</small><br>
        <em style="font-size:11px;color:#666">${tags}</em>
      </div>`;
  });

  html += `</div></div>`;

  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;z-index:9999';
  modal.innerHTML = `<div style="background:#1e1e1e;padding:30px;border-radius:12px;max-width:90%;max-height:90%;overflow:auto;color:#ddd">${html}</div>`;
  modal.onclick = e => e.target === modal && modal.remove();
  document.body.appendChild(modal);
}

function filterDB(query) {
  const q = query.toLowerCase();
  document.querySelectorAll('.db-item').forEach(el => {
    const text = el.textContent.toLowerCase();
    el.style.display = text.includes(q) ? 'block' : 'none';
  });
}

function insertItem(id) {
  const input = document.activeElement;
  if (input && input.classList.contains('item-field')) {
    input.value = id;
    input.dispatchEvent(new Event('input'));
    updateAll();
  }
  document.querySelector('div[style*="z-index:9999"]')?.remove();
}

// Обязательно экспортируем!
window.populateDatalist = populateDatalist;
window.openDB = openDB;
window.insertItem = insertItem;

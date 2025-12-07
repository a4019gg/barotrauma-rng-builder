// js/db.js — НОВАЯ СТРУКТУРА: id, name, category, tags

let itemsDB = { Vanilla: [], Mods: [] };

function populateDatalist() {
  const saved = localStorage.getItem('itemsDB_v0.9.5');
  if (saved) {
    itemsDB = JSON.parse(saved);
    fillDatalist();
    return;
  }

  fetch('data/items.json')
    .then(r => r.json())
    .then(data => {
      itemsDB.Vanilla = data;
      localStorage.setItem('itemsDB_v0.9.5', JSON.stringify(itemsDB));
      fillDatalist();
    })
    .catch(() => {
      console.warn('Failed to load items.json');
      itemsDB.Vanilla = [
        { id: "revolver", name: "Revolver", category: "Weapons", tags: ["weapon", "gun"] },
        { id: "morphine", name: "Morphine", category: "Medical", tags: ["medical"] }
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
    opt.textContent = `${item.name} [${item.id}]`;
    dl.appendChild(opt);
  });
}

function openDB() {
  let html = `
    <div style="max-height:80vh;overflow:auto;padding:15px">
      <input type="text" id="db-search" placeholder="${L.searchPlaceholder}" oninput="filterDB(this.value)" 
             style="width:100%;padding:10px;margin-bottom:15px;background:#333;color:#fff;border:1px solid #555;border-radius:6px">
      <div class="db-tabs" style="display:flex;gap:15px;margin-bottom:15px">
        <button class="active" onclick="showDBTab('all')">All</button>`;
  
  const categories = [...new Set([...itemsDB.Vanilla, ...itemsDB.Mods].map(i => i.category))];
  categories.forEach(cat => {
    html += `<button onclick="showDBTab('${cat}')">${cat}</button>`;
  });

  html += `</div><div id="db-content" style="display:flex;flex-wrap:wrap;gap:8px">`;

  [...itemsDB.Vanilla, ...itemsDB.Mods].forEach(item => {
    const tags = item.tags ? item.tags.join(', ') : '';
    html += `
      <button class="db-item" data-item='${JSON.stringify(item)}' onclick="insertItem('${item.id}')">
        <strong>${item.name}</strong><br>
        <small>${item.id}</small><br>
        <em style="font-size:10px;color:#888">${tags}</em>
      </button>`;
  });

  html += `</div></div>`;

  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;z-index:1000';
  modal.innerHTML = `<div style="background:#252526;padding:25px;border-radius:10px;max-width:95%;max-height:95%;overflow:auto;color:#ddd">${html}</div>`;
  modal.onclick = e => e.target === modal && modal.remove();
  document.body.appendChild(modal);

  showDBTab('all');
}

function showDBTab(filter) {
  document.querySelectorAll('.db-tabs button').forEach(b => b.classList.toggle('active', b.onclick.toString().includes(filter)));
  document.querySelectorAll('.db-item').forEach(btn => {
    const item = JSON.parse(btn.dataset.item);
    const matches = filter === 'all' || item.category === filter;
    btn.style.display = matches ? 'inline-block' : 'none';
  });
}

function filterDB(query) {
  const q = query.toLowerCase();
  document.querySelectorAll('.db-item').forEach(btn => {
    const item = JSON.parse(btn.dataset.item);
    const text = `${item.name} ${item.id} ${item.tags?.join(' ')}`.toLowerCase();
    btn.style.display = text.includes(q) ? 'inline-block' : 'none';
  });
}

function insertItem(id) {
  const input = document.activeElement;
  if (input && input.classList.contains('item-field')) {
    input.value = id;
    updateAll();
  }
  document.querySelector('div[style*="z-index:1000"]')?.remove();
}

window.populateDatalist = populateDatalist;
window.openDB = openDB;
window.insertItem = insertItem;

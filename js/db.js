// js/db.js — ПОЛНЫЙ v0.9.6

let itemsDB = { Vanilla: [], Mods: [] };

function populateDatalist() {
  const saved = localStorage.getItem('itemsDB_v0.9.6');
  if (saved) {
    itemsDB = JSON.parse(saved);
    fillDatalist();
    return;
  }

  fetch('data/items.json')
    .then(r => r.json())
    .then(data => {
      itemsDB.Vanilla = data;
      localStorage.setItem('itemsDB_v0.9.6', JSON.stringify(itemsDB));
      fillDatalist();
    })
    .catch(() => {
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
    <div style="max-height:80vh;overflow:auto;padding:20px">
      <input type="text" id="db-search" placeholder="${L.searchPlaceholder || 'Search...'}" 
             oninput="filterDB(this.value)" 
             style="width:100%;padding:12px;margin-bottom:20px;background:#333;color:#fff;border:1px solid #555;border-radius:8px;font-size:16px">
      
      <div style="display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap">
        <button onclick="showDBTab('all')" class="active">All</button>`;

  const categories = [...new Set([...itemsDB.Vanilla, ...itemsDB.Mods].map(i => i.category || 'Unknown'))];
  categories.forEach(cat => {
    html += `<button onclick="showDBTab('${cat}')">${cat}</button>`;
  });

  html += `</div><div id="db-content" style="display:flex;flex-wrap:wrap;gap:12px">`;

  [...itemsDB.Vanilla, ...itemsDB.Mods].forEach(item => {
    const tags = item.tags ? item.tags.join(', ') : '';
    html += `
      <button class="db-item" onclick="insertItem('${item.id}')" style="padding:12px;background:#2d2d30;border:1px solid #444;border-radius:8px;text-align:left">
        <strong style="color:#61afef">${item.name}</strong><br>
        <small style="color:#888">${item.id}</small><br>
        <em style="font-size:11px;color:#666">${tags}</em>
      </button>`;
  });

  html += `</div></div>`;

  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.95);display:flex;align-items:center;justify-content:center;z-index:10001';
  modal.innerHTML = `<div style="background:#1e1e1e;padding:30px;border-radius:12px;max-width:95%;max-height:95%;overflow:auto;color:#ddd;box-shadow:0 0 30px rgba(0,0,0,0.8)">${html}</div>`;
  modal.onclick = e => e.target === modal && modal.remove();
  document.body.appendChild(modal);

  showDBTab('all');
}

function showDBTab(filter) {
  document.querySelectorAll('.db-item').forEach(btn => {
    const item = JSON.parse(btn.getAttribute('onclick').match(/'(.+?)'/)[1]);
    const matches = filter === 'all' || item.category === filter;
    btn.style.display = matches ? 'inline-block' : 'none';
  });
  document.querySelectorAll('[onclick^="showDBTab"]').forEach(b => {
    b.classList.toggle('active', b.textContent === filter || (filter === 'all' && b.textContent === 'All'));
  });
}

function filterDB(query) {
  const q = query.toLowerCase();
  document.querySelectorAll('.db-item').forEach(btn => {
    const item = JSON.parse(btn.getAttribute('onclick').match(/'(.+?)'/)[1]);
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
  document.querySelector('div[style*="z-index:10001"]')?.remove();
}

window.populateDatalist = populateDatalist;
window.openDB = openDB;
window.insertItem = insertItem;

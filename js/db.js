// js/db.js — СВОЯ БАЗА С КАТЕГОРИЯМИ + ПОИСК ПО ИМЕНИ И ID

let itemsDB = { Vanilla: [], Mods: [] };

function populateDatalist() {
  const saved = localStorage.getItem('itemsDB_v1.0');
  if (saved) {
    itemsDB = JSON.parse(saved);
    fillDatalist();
    return;
  }

  fetch('data/items.json')
    .then(r => r.json())
    .then(data => {
      itemsDB.Vanilla = data;
      localStorage.setItem('itemsDB_v1.0', JSON.stringify(itemsDB));
      fillDatalist();
    })
    .catch(() => {
      console.warn('Failed to load items.json — using fallback');
      itemsDB.Vanilla = [
        { id: "revolver", name: "Revolver", category: "Weapons" },
        { id: "morphine", name: "Morphine", category: "Medical" },
        { id: "clownmask", name: "Clown Mask", category: "Fun" }
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
    opt.textContent = `${item.name} (${item.id})`;
    dl.appendChild(opt);
  });
}

function openDB() {
  let html = `<div style="max-height:80vh;overflow:auto;padding:15px">
    <input type="text" id="db-search" placeholder="Поиск по имени или ID..." oninput="filterDB(this.value)" style="width:100%;padding:10px;margin-bottom:15px;background:#333;color:#fff;border:1px solid #555;border-radius:6px">
    <div class="db-tabs" style="display:flex;gap:15px;margin-bottom:15px">`;

  const categories = [...new Set([...itemsDB.Vanilla, ...itemsDB.Mods].map(i => i.category))].sort();
  categories.forEach(cat => {
    html += `<button onclick="showDBTab('${cat}')">${cat}</button>`;
  });

  html += `</div>`;

  categories.forEach(cat => {
    const items = [...itemsDB.Vanilla, ...itemsDB.Mods].filter(i => i.category === cat);
    html += `<div id="cat-${cat}" class="db-category">
      <h3>${cat} (${items.length}</h3>
      <div style="display:flex;flex-wrap:wrap;gap:8px">`;
    items.forEach(item => {
      html += `<button class="db-item" onclick="insertItem('${item.id}')">${item.name}<br><small>${item.id}</small></button>`;
    });
    html += `</div></div>`;
  });

  html += `</div>`;

  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;z-index:1000';
  modal.innerHTML = `<div style="background:#252526;padding:25px;border-radius:10px;max-width:95%;max-height:95%;overflow:auto;color:#ddd">${html}</div>`;
  modal.onclick = e => e.target === modal && modal.remove();
  document.body.appendChild(modal);

  showDBTab(categories[0] || 'Vanilla');
}

function showDBTab(cat) {
  document.querySelectorAll('.db-category').forEach(div => {
    div.classList.toggle('hidden', !div.id.endsWith(cat));
  });
}

function filterDB(query) {
  const q = query.toLowerCase();
  document.querySelectorAll('.db-item').forEach(btn => {
    const text = btn.textContent.toLowerCase();
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

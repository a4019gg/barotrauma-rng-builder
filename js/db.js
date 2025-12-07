// js/db.js — БАЗА ДАННЫХ ИЗ data/items.json — v0.9.10

const DB_VERSION = "v0.9.10";
window.DB_VERSION = DB_VERSION;

let itemsDB = { Vanilla: [], Mods: [] };

function populateDatalist() {
  const saved = localStorage.getItem('itemsDB_v0.9.10');
  if (saved) {
    try {
      itemsDB = JSON.parse(saved);
      fillDatalist();
      return;
    } catch (e) {
      console.warn('Кэш базы повреждён — перезагружаем');
    }
  }

  fetch('data/items.json')
    .then(r => {
      if (!r.ok) throw new Error('items.json не найден');
      return r.json();
    })
    .then(data => {
      itemsDB.Vanilla = data;
      localStorage.setItem('itemsDB_v0.9.10', JSON.stringify(itemsDB));
      fillDatalist();
      console.log(`База загружена: ${data.length} предметов`);
    })
    .catch(err => {
      console.error('Ошибка загрузки data/items.json:', err);
      alert('Не удалось загрузить базу предметов. Проверьте файл data/items.json');
      // Минимальный fallback
      itemsDB.Vanilla = [
        { id: "revolver", name: "Revolver", category: "Weapons", tags: ["weapon", "gun"] },
        { id: "morphine", name: "Morphine", category: "Medical", tags: ["medical"] },
        { id: "clownmask", name: "Clown Mask", category: "Fun", tags: ["fun"] }
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
  const allItems = [...itemsDB.Vanilla, ...itemsDB.Mods];

  let html = `
    <div style="max-height:80vh;overflow:auto;padding:20px">
      <input type="text" id="db-search" placeholder="${L.searchPlaceholder || 'Поиск...'}" 
             oninput="filterDB(this.value)" 
             style="width:100%;padding:12px;margin-bottom:20px;background:#333;color:#fff;border:1px solid #555;border-radius:8px;font-size:16px">
      
      <div style="display:flex;flex-wrap:wrap;gap:12px">`;

  allItems.forEach(item => {
    const tags = item.tags ? item.tags.join(', ') : '';
    html += `
      <button class="db-item" onclick="insertItem('${item.id}')" 
              style="padding:15px;background:#2d2d30;border-radius:8px;width:220px;text-align:left;cursor:pointer">
        <strong style="color:#61afef">${item.name}</strong><br>
        <small style="color:#888">${item.id}</small><br>
        <em style="font-size:11px;color:#666">${item.category} • ${tags}</em>
      </button>`;
  });

  html += `</div></div>`;

  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;z-index:10001';
  modal.innerHTML = `<div style="background:#1e1e1e;padding:30px;border-radius:12px;max-width:90%;max-height:90%;overflow:auto;color:#ddd;box-shadow:0 0 30px rgba(0,0,0,0.8)">${html}</div>`;
  modal.onclick = e => e.target === modal && modal.remove();
  document.body.appendChild(modal);
}

function filterDB(query) {
  const q = query.toLowerCase();
  document.querySelectorAll('.db-item').forEach(btn => {
    const text = btn.textContent.toLowerCase();
    btn.style.display = text.includes(q) ? 'block' : 'none';
  });
}

function insertItem(id) {
  const input = document.activeElement;
  if (input && input.classList.contains('item-field')) {
    input.value = id;
    input.dispatchEvent(new Event('input'));
    updateAll();
  }
  document.querySelector('div[style*="z-index:10001"]')?.remove();
}

// Экспорт
window.populateDatalist = populateDatalist;
window.openDB = openDB;
window.insertItem = insertItem;

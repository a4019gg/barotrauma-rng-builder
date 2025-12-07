// js/db.js — ПОЛНЫЙ, РАБОЧИЙ, БЕРЁТ БАЗУ ИЗ data/items.json — v0.9.9

let itemsDB = { Vanilla: [], Mods: [] };

function populateDatalist() {
  const saved = localStorage.getItem('itemsDB_v0.9.9');
  if (saved) {
    try {
      itemsDB = JSON.parse(saved);
      fillDatalist();
      return;
    } catch (e) {
      console.warn('Кэш повреждён — загружаем заново');
    }
  }

  // БЕРЁМ БАЗУ ТОЛЬКО ИЗ data/items.json
  fetch('data/items.json')
    .then(r => {
      if (!r.ok) throw new Error('Файл не найден');
      return r.json();
    })
    .then(data => {
      itemsDB.Vanilla = data;
      localStorage.setItem('itemsDB_v0.9.9', JSON.stringify(itemsDB));
      fillDatalist();
      console.log(`Загружено ${data.length} предметов из data/items.json`);
    })
    .catch(err => {
      console.error('Ошибка загрузки data/items.json:', err);
      alert('Не удалось загрузить базу предметов. Проверьте файл data/items.json');
      // Минимальный fallback, чтобы не падало
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
    opt.textContent = `${item.name} [${item.id}]`;
    dl.appendChild(opt);
  });
}

function openDB() {
  const allItems = [...itemsDB.Vanilla, ...itemsDB.Mods];

  let html = `
    <div style="max-height:80vh;overflow:auto;padding:20px">
      <input type="text" id="db-search" placeholder="Поиск..." oninput="filterDB(this.value)" 
             style="width:100%;padding:12px;margin-bottom:20px;background:#333;color:#fff;border:1px solid #555;border-radius:8px">
      <div style="display:flex;flex-wrap:wrap;gap:12px">`;

  allItems.forEach(item => {
    const tags = item.tags ? item.tags.join(', ') : '';
    html += `
      <button class="db-item" onclick="insertItem('${item.id}')" 
              style="padding:15px;background:#2d2d30;border-radius:8px;width:220px;text-align:left">
        <strong style="color:#61afef">${item.name}</strong><br>
        <small style="color:#888">${item.id}</small><br>
        <em style="font-size:11px;color:#666">${item.category} ${tags}</em>
      </button>`;
  });

  html += `</div></div>`;

  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;z-index:10001';
  modal.innerHTML = `<div style="background:#1e1e1e;padding:30px;border-radius:12px;max-width:90%;max-height:90%;overflow:auto;color:#ddd">${html}</div>`;
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
    updateAll();
  }
  document.querySelector('div[style*="z-index:10001"]')?.remove();
}

window.populateDatalist = populateDatalist;
window.openDB = openDB;
window.insertItem = insertItem;

// js/db.js — база предметов + моды + модальное окно

let itemsDB = { Vanilla: [], Mods: [] };

// Прокси для обхода CORS
const PROXY = 'https://api.allorigins.win/raw?url=';
const ITEMS_SOURCE = 'https://barotrauma.game-vault.net/GameData/Items.json';

function populateDatalist() {
  const saved = localStorage.getItem('itemsDB_v0.8');
  if (saved) {
    try {
      itemsDB = JSON.parse(saved);
      fillDatalist();
      return;
    } catch (e) {
      console.warn('Corrupted cache, reloading...');
    }
  }

  // Основной источник
  fetch(PROXY + encodeURIComponent(ITEMS_SOURCE))
    .then(r => r.json())
    .then(data => {
      itemsDB.Vanilla = data
        .map(i => i.identifier || i.id)
        .filter(Boolean)
        .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
      localStorage.setItem('itemsDB_v0.8', JSON.stringify(itemsDB));
      fillDatalist();
      console.log(`Loaded ${itemsDB.Vanilla.length} vanilla items`);
    })
    .catch(() => {
      // Резервный источник (твой)
      fetch('https://barotrauma-db.vercel.app/items')
        .then(r => r.json())
        .then(data => {
          itemsDB.Vanilla = data.map(i => i.identifier || i.id).filter(Boolean).sort();
          localStorage.setItem('itemsDB_v0.8', JSON.stringify(itemsDB));
          fillDatalist();
        })
        .catch(() => {
          // Фолбэк на минимальный набор
          itemsDB.Vanilla = [
            'revolver','smg','rifle','shotgun','harpoongun','coilgun','railgun','chaingun','flamer',
            'morphine','fentanyl','antibiotics','bandage','plastiseal',
            'clownmask','toyhammer','balloon'
          ];
          fillDatalist();
        });
    });
}

function fillDatalist() {
  const dl = document.getElementById('item-datalist');
  dl.innerHTML = '';
  [...itemsDB.Vanilla, ...itemsDB.Mods].sort().forEach(item => {
    const opt = document.createElement('option');
    opt.value = item;
    dl.appendChild(opt);
  });
}

function openDB() {
  let html = `
    <div style="max-height:80vh;overflow:auto;padding:15px">
      <input type="text" id="db-search" placeholder="Search items..." oninput="filterDB(this.value)" style="width:100%;padding:10px;margin-bottom:15px;background:#333;color:#fff;border:1px solid #555;border-radius:4px">
      <div class="db-tabs">
        <button class="active" onclick="showDBTab('vanilla')">Vanilla (${itemsDB.Vanilla.length})</button>
        <button onclick="showDBTab('mods')">Mods (${itemsDB.Mods.length})</button>
      </div>
      <div id="db-vanilla" style="margin-top:15px">
        <div style="display:flex;flex-wrap:wrap;gap:8px">`;
  itemsDB.Vanilla.forEach(item => {
    html += `<button class="db-item" onclick="insertItem('${item}')">${item}</button>`;
  });
  html += `</div></div>
      <div id="db-mods" class="hidden" style="margin-top:15px">
        <div style="display:flex;flex-wrap:wrap;gap:8px">`;
  itemsDB.Mods.forEach(item => {
    html += `<button class="db-item" onclick="insertItem('${item}')">${item}</button>`;
  });
  html += `</div>
        <div style="margin-top:20px">
          <input type="file" id="mod-file-input" accept=".json">
          <button onclick="loadModItems()">Load Mod</button>
        </div>
      </div>
    </div>`;

  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;z-index:1000';
  modal.innerHTML = `<div style="background:#252526;padding:25px;border-radius:8px;max-width:95%;max-height:95%;overflow:auto;color:#ddd">${html}</div>`;
  modal.onclick = e => e.target === modal && modal.remove();
  document.body.appendChild(modal);
}

function showDBTab(tab) {
  document.getElementById('db-vanilla').classList.toggle('hidden', tab !== 'vanilla');
  document.getElementById('db-mods').classList.toggle('hidden', tab !== 'mods');
  document.querySelectorAll('.db-tabs button').forEach(b => b.classList.toggle('active', b.onclick.toString().includes(tab)));
}

function filterDB(query) {
  const q = query.toLowerCase();
  document.querySelectorAll('.db-item').forEach(btn => {
    btn.style.display = btn.textContent.toLowerCase().includes(q) ? 'inline-block' : 'none';
  });
}

function loadModItems() {
  const input = document.getElementById('mod-file-input');
  const file = input.files[0];
  if (!file) return alert('Выберите файл');
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const mod = JSON.parse(e.target.result);
      if (Array.isArray(mod)) {
        itemsDB.Mods = [...new Set([...itemsDB.Mods, ...mod.filter(i => typeof i === 'string')])];
        localStorage.setItem('itemsDB_v0.8', JSON.stringify(itemsDB));
        fillDatalist();
        openDB(); // обновляем окно
        alert(`Мод загружен! Добавлено ${mod.length} предметов.`);
      } else throw new Error('Invalid format');
    } catch (err) {
      alert('Ошибка загрузки мода: ' + err.message);
    }
  };
  reader.readAsText(file);
}

function insertItem(id) {
  const activeInput = document.activeElement;
  if (activeInput && activeInput.classList.contains('item-field')) {
    activeInput.value = id;
    activeInput.dispatchEvent(new Event('input'));
    updateAll();
  }
  document.querySelector('div[style*="z-index:1000"]')?.remove();
}

// Экспорт функций
window.populateDatalist = populateDatalist;
window.openDB = openDB;
window.insertItem = insertItem;

// js/db.js — ПОЛНЫЙ И РАБОЧИЙ v0.8.2

let itemsDB = { Vanilla: [], Mods: [] };

function populateDatalist() {
  const saved = localStorage.getItem('itemsDB_v0.8.2');
  if (saved) {
    try {
      itemsDB = JSON.parse(saved);
      fillDatalist();
      console.log(`Загружено из кэша: ${itemsDB.Vanilla.length} ванильных предметов`);
      return;
    } catch (e) {
      console.warn('Повреждён кэш, перезагружаем...');
    }
  }

  // Загружаем с твоего API: https://barotrauma-db.vercel.app/items
  fetch('https://barotrauma-db.vercel.app/items')
    .then(r => {
      if (!r.ok) throw new Error('API недоступен');
      return r.text();
    })
    .then(html => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // Ищем таблицу с предметами
      const rows = doc.querySelectorAll('table tr');
      const ids = [];

      rows.forEach(row => {
        const cell = row.querySelector('td:first-child');
        if (cell) {
          const text = cell.textContent.trim();
          if (text && !text.includes('#') && text.length > 0) {
            ids.push(text);
          }
        }
      });

      itemsDB.Vanilla = ids.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
      localStorage.setItem('itemsDB_v0.8.2', JSON.stringify(itemsDB));
      fillDatalist();
      console.log(`Успешно загружено ${itemsDB.Vanilla.length} предметов с barotrauma-db.vercel.app`);
    })
    .catch(err => {
      console.error('Ошибка загрузки базы:', err);
      // Fallback — минимальный набор
      itemsDB.Vanilla = [
        'revolver','smg','rifle','shotgun','harpoongun','coilgun','railgun','chaingun','flamer',
        'morphine','fentanyl','antibiotics','bandage','plastiseal','antirad','bloodpack',
        'clownmask','toyhammer','balloon','handcuffs','idcard'
      ];
      fillDatalist();
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
    <div style="max-height:85vh;overflow:auto;padding:15px">
      <input type="text" id="db-search" placeholder="Поиск предметов..." oninput="filterDB(this.value)" 
             style="width:100%;padding:10px;margin-bottom:15px;background:#333;color:#fff;border:1px solid #555;border-radius:6px;font-size:14px">
      
      <div class="db-tabs" style="display:flex;gap:15px;margin-bottom:15px;font-weight:bold">
        <button onclick="showDBTab('vanilla')" class="active">Vanilla (${itemsDB.Vanilla.length})</button>
        <button onclick="showDBTab('mods')">Mods (${itemsDB.Mods.length})</button>
      </div>

      <div id="vanilla-tab">
        <div style="display:flex;flex-wrap:wrap;gap:8px">`;
  
  itemsDB.Vanilla.forEach(item => {
    html += `<button class="db-item" onclick="insertItem('${item}')">${item}</button>`;
  });

  html += `</div></div>
      <div id="mods-tab" class="hidden">
        <div style="display:flex;flex-wrap:wrap;gap:8px">`;
  
  itemsDB.Mods.forEach(item => {
    html += `<button class="db-item" onclick="insertItem('${item}')">${item}</button>`;
  });

  html += `</div>
        <div style="margin-top:20px">
          <input type="file" id="mod-file-input" accept=".json">
          <button onclick="loadMod()">Загрузить мод</button>
        </div>
      </div>
    </div>`;

  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;z-index:10000';
  modal.innerHTML = `<div style="background:#252526;padding:25px;border-radius:10px;max-width:95%;max-height:95%;overflow:auto;color:#ddd;box-shadow:0 10px 30px rgba(0,0,0,0.5)">${html}</div>`;
  modal.onclick = e => e.target === modal && modal.remove();
  document.body.appendChild(modal);
}

function showDBTab(tab) {
  document.getElementById('vanilla-tab').classList.toggle('hidden', tab !== 'vanilla');
  document.getElementById('mods-tab').classList.toggle('hidden', tab !== 'mods');
  document.querySelectorAll('.db-tabs button').forEach(b => b.classList.toggle('active', b.onclick.toString().includes(tab)));
}

function filterDB(query) {
  const q = query.toLowerCase();
  document.querySelectorAll('.db-item').forEach(btn => {
    btn.style.display = btn.textContent.toLowerCase().includes(q) ? 'inline-block' : 'none';
  });
}

function loadMod() {
  const input = document.getElementById('mod-file-input');
  const file = input.files[0];
  if (!file) return alert('Выберите файл');
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const mod = JSON.parse(e.target.result);
      if (Array.isArray(mod)) {
        itemsDB.Mods = [...new Set([...itemsDB.Mods, ...mod.filter(i => typeof i === 'string')])];
        localStorage.setItem('itemsDB_v0.8.2', JSON.stringify(itemsDB));
        fillDatalist();
        openDB();
        alert(`Мод загружен! Добавлено ${mod.length} предметов.`);
      } else throw new Error('Ожидался массив строк');
    } catch (err) {
      alert('Ошибка загрузки мода: ${err.message}`);
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
  document.querySelector('div[style*="z-index:10000"]')?.remove();
}

// Экспорт функций
window.populateDatalist = populateDatalist;
window.openDB = openDB;
window.insertItem = insertItem;

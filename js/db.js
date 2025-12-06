// js/db.js — ПОЛНЫЙ, РАБОЧИЙ, с https://barotrauma-db.vercel.app/items

let itemsDB = { Vanilla: [], Mods: [] };

function populateDatalist() {
  const saved = localStorage.getItem('itemsDB_v0.7.2');
  if (saved) {
    try {
      itemsDB = JSON.parse(saved);
      fillDatalist();
      return;
    } catch (e) {
      console.warn('Corrupted DB cache, reloading...');
    }
  }

  // Загружаем с твоего API
  fetch('https://barotrauma-db.vercel.app/items')
    .then(r => {
      if (!r.ok) throw new Error('API offline');
      return r.json();
    })
    .then(data => {
      itemsDB.Vanilla = data
        .map(item => item.identifier || item.id)
        .filter(Boolean)
        .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

      localStorage.setItem('itemsDB_v0.7.2', JSON.stringify(itemsDB));
      fillDatalist();
      console.log(`Loaded ${itemsDB.Vanilla.length} vanilla items`);
    })
    .catch(err => {
      console.error('Failed to load items from API:', err);
      // Fallback на минимальный набор
      itemsDB.Vanilla = ['revolver', 'smg', 'rifle', 'shotgun', 'harpoongun', 'coilgun', 'morphine', 'fentanyl', 'clownmask', 'toyhammer'];
      fillDatalist();
    });
}

function fillDatalist() {
  const dl = document.getElementById('item-datalist');
  dl.innerHTML = '';
  [...itemsDB.Vanilla, ...itemsDB.Mods].forEach(item => {
    const opt = document.createElement('option');
    opt.value = item;
    dl.appendChild(opt);
  });
}

function openDB() {
  let html = `
    <div style="max-height:80vh;overflow:auto;padding:10px">
      <div style="margin-bottom:15px">
        <input type="text" id="db-search" placeholder="Search items..." oninput="filterItems(this.value)" style="width:100%;padding:8px;background:#333;color:#fff;border:1px solid #555;border-radius:4px">
      </div>
      <ul class="db-tabs">
        <li class="active" onclick="showTab('vanilla')">Vanilla (${itemsDB.Vanilla.length})</li>
        <li onclick="showTab('mods')">Mods (${itemsDB.Mods.length})</li>
      </ul>
      <div id="vanilla-tab">
        <div class="db-items">`;
  itemsDB.Vanilla.forEach(item => {
    html += `<button class="db-item" data-item="${item}" onclick="insertItem('${item}')">${item}</button>`;
  });
  html += `</div></div>
      <div id="mods-tab" class="hidden">
        <div class="db-items">`;
  itemsDB.Mods.forEach(item => {
    html += `<button class="db-item" data-item="${item}" onclick="insertItem('${item}')">${item}</button>`;
  });
  html += `</div>
        <div style="margin-top:15px">
          <input type="file" id="mod-file" accept=".json">
          <button onclick="loadMod()">Load Mod</button>
        </div>
      </div>
    </div>`;

  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;z-index:1000';
  modal.innerHTML = `<div style="background:#252526;padding:20px;border-radius:8px;max-width:90%;max-height:90%;overflow:auto;color:#ddd">${html}</div>`;
  modal.onclick = e => e.target === modal && modal.remove();
  document.body.appendChild(modal);
}

function showTab(tab) {
  document.querySelectorAll('#vanilla-tab, #mods-tab').forEach(t => t.classList.toggle('hidden', t.id !== tab + '-tab'));
  document.querySelectorAll('.db-tabs li').forEach(li => li.classList.toggle('active', li.onclick.toString().includes(tab)));
}

function filterItems(query) {
  const q = query.toLowerCase();
  document.querySelectorAll('.db-item').forEach(btn => {
    const visible = btn.dataset.item.toLowerCase().includes(q);
    btn.style.display = visible ? 'inline-block' : 'none';
  });
}

function loadMod() {
  const input = document.getElementById('mod-file');
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const mod = JSON.parse(e.target.result);
      if (Array.isArray(mod)) {
        itemsDB.Mods = [...new Set([...itemsDB.Mods, ...mod.filter(i => typeof i === 'string')])];
        localStorage.setItem('itemsDB_v0.7.2', JSON.stringify(itemsDB));
        fillDatalist();
        openDB();
        alert(`Mod loaded! ${mod.length} items added.`);
      } else {
        alert('Invalid mod format — expected array of strings');
      }
    } catch (err) {
      alert('Invalid JSON: ' + err.message);
    }
  };
  reader.readAsText(file);
}

function insertItem(id) {
  const active = document.activeElement;
  if (active && active.classList.contains('item-field')) {
    active.value = id;
    active.dispatchEvent(new Event('input'));
    updateAll();
  }
  document.querySelector('div[style*="z-index:1000"]')?.remove();
}

// Экспорт функций
window.populateDatalist = populateDatalist;
window.openDB = openDB;
window.insertItem = insertItem;

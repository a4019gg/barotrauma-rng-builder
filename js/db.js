// js/db.js — база предметов + моды + красивый DB

let itemsDB = { Vanilla: [], Mods: [] };

function populateDatalist() {
  const saved = localStorage.getItem('itemsDB_v0.7');
  if (saved) {
    itemsDB = JSON.parse(saved);
    fillDatalist();
    return;
  }

  // Надёжный источник ванильных предметов (официальный)
  fetch('https://barotrauma.game-vault.net/GameData/Items.json')
    .then(r => r.json())
    .then(data => {
      itemsDB.Vanilla = data
        .map(i => i.identifier)
        .filter(Boolean)
        .sort();
      localStorage.setItem('itemsDB_v0.7', JSON.stringify(itemsDB));
      fillDatalist();
    })
    .catch(() => {
      itemsDB.Vanilla = ['revolver', 'smg', 'rifle', 'shotgun', 'morphine', 'fentanyl', 'clownmask'];
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
    <div style="max-height:80vh;overflow:auto;padding:10px">
      <ul class="db-tabs">
        <li class="active" onclick="showTab('vanilla')">Vanilla (${itemsDB.Vanilla.length})</li>
        <li onclick="showTab('mods')">Mods (${itemsDB.Mods.length})</li>
      </ul>
      <div id="vanilla-tab">
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin:10px 0">
  `;
  itemsDB.Vanilla.forEach(item => {
    html += `<button class="db-item" onclick="insertItem('${item}')">${item}</button>`;
  });
  html += `</div></div><div id="mods-tab" class="hidden"><div style="display:flex;flex-wrap:wrap;gap:8px;margin:10px 0">`;
  itemsDB.Mods.forEach(item => {
    html += `<button class="db-item" onclick="insertItem('${item}')">${item}</button>`;
  });
  html += `</div>
    <input type="file" id="mod-file" accept=".json">
    <button onclick="loadMod()">Load Mod</button>
  </div></div>`;

  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;z-index:1000';
  modal.innerHTML = `<div style="background:#252526;padding:20px;border-radius:8px;max-width:90%;max-height:90%;overflow:auto;color:#ddd">${html}</div>`;
  modal.onclick = e => e.target === modal && modal.remove();
  document.body.appendChild(modal);
}

function showTab(tab) {
  document.querySelectorAll('#vanilla-tab, #mods-tab').forEach(t => t.classList.toggle('hidden', t.id !== tab + '-tab'));
  document.querySelectorAll('.db-tabs li').forEach(li => li.classList.toggle('active', li.textContent.includes(tab.charAt(0).toUpperCase() + tab.slice(1))));
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
        itemsDB.Mods = [...itemsDB.Mods, ...mod.filter(m => typeof m === 'string')];
        localStorage.setItem('itemsDB_v0.7', JSON.stringify(itemsDB));
        fillDatalist();
        openDB(); // обновляем окно
        alert('Mod loaded!');
      }
    } catch { alert('Invalid mod JSON'); }
  };
  reader.readAsText(file);
}

function insertItem(id) {
  const input = document.activeElement;
  if (input && input.classList.contains('item-field')) {
    input.value = id;
    input.dispatchEvent(new Event('input'));
    updateAll();
  }
  document.querySelector('div[style*="z-index:1000"]').remove();
}

window.populateDatalist = populateDatalist;
window.openDB = openDB;
window.insertItem = insertItem;

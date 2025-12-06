// db.js — АКТУАЛЬНЫЕ ванильные предметы + моды

let itemsDB = {};

function populateDatalist() {
  const saved = localStorage.getItem('itemsDB_v5');
  if (saved) {
    itemsDB = JSON.parse(saved);
    fillDatalist();
    return;
  }

  // Пытаемся загрузить живые данные с официального репо
  fetch('https://raw.githubusercontent.com/Regalis11/Barotrauma/master/Content/Items/items.xml')
    .then(r => r.text())
    .then(xml => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xml, 'text/xml');
      const items = [...doc.querySelectorAll('item[identifier]')];
      const db = {};

      items.forEach(item => {
        const id = item.getAttribute('identifier');
        const tags = (item.getAttribute('tags') || '').split(',').map(t => t.trim());
        const name = item.getAttribute('name') || id;

        let group = 'Misc';
        if (tags.includes('weapon') || tags.includes('meleeweapon')) group = 'Weapons';
        else if (tags.includes('medical')) group = 'Medical';
        else if (tags.includes('tool')) group = 'Tools';
        else if (tags.includes('ammo')) group = 'Ammo';
        else if (tags.includes('diving')) group = 'Diving Gear';
        else if (tags.includes('explosive')) group = 'Explosives';

        if (!db[group]) db[group] = [];
        db[group].push(id);
      });

      itemsDB = db;
      localStorage.setItem('itemsDB_v5', JSON.stringify(itemsDB));
      fillDatalist();
    })
    .catch(err => {
      console.warn('Live load failed, using fallback', err);
      // fallback — минимальный встроенный список
      itemsDB = {
        "Weapons": ["revolver","smg","rifle","shotgun","harpoongun"],
        "Medical": ["morphine","fentanyl","antibiotics"],
        "Tools": ["welder","screwdriver","wrench"],
        "Misc": ["clownmask","toyhammer","balloon"]
      };
      localStorage.setItem('itemsDB_v5', JSON.stringify(itemsDB));
      fillDatalist();
    });
}

function fillDatalist() {
  const datalist = document.getElementById('item-datalist');
  datalist.innerHTML = '';
  Object.values(itemsDB).flat().sort().forEach(item => {
    const opt = document.createElement('option');
    opt.value = item;
    datalist.appendChild(opt);
  });
}

function showDB() {
  let html = '<h3>Item Database (' + Object.values(itemsDB).flat().length + ' items)</h3><ul>';
  for (const [cat, items] of Object.entries(itemsDB)) {
    html += `<li><strong>${cat}</strong>: ${items.length} items</li>`;
  }
  html += '</ul>';
  alert(html);
}

function loadMod() {
  document.getElementById('mod-input').click();
}

document.getElementById('mod-input').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const modDB = JSON.parse(ev.target.result);
      Object.assign(itemsDB, modDB);
      localStorage.setItem('itemsDB_v5', JSON.stringify(itemsDB));
      fillDatalist();
      alert('Mod items loaded!');
    } catch { alert('Invalid JSON'); }
  };
  reader.readAsText(file);
});

window.populateDatalist = populateDatalist;
window.showDB = showDB;
window.loadMod = loadMod;

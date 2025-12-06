// db.js — база предметов

let itemsDB = {};

function populateDatalist() {
  const saved = localStorage.getItem('itemsDB_v5');
  if (saved) {
    itemsDB = JSON.parse(saved);
    fillDatalist();
    return;
  }

  // Живая загрузка ванильных предметов
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
        let group = 'Misc';
        if (tags.some(t => t.includes('weapon'))) group = 'Weapons';
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
    .catch(() => {
      // fallback
      itemsDB = { "Weapons": ["revolver","smg"], "Medical": ["morphine"], "Misc": ["clownmask"] };
      localStorage.setItem('itemsDB_v5', JSON.stringify(itemsDB));
      fillDatalist();
    });
}

function fillDatalist() {
  const dl = document.getElementById('item-datalist');
  dl.innerHTML = '';
  Object.values(itemsDB).flat().sort().forEach(item => {
    const opt = document.createElement('option');
    opt.value = item;
    dl.appendChild(opt);
  });
}

function showDB() {
  let html = `<h3>Items: ${Object.values(itemsDB).flat().length}</h3><ul>`;
  for (const [cat, items] of Object.entries(itemsDB)) {
    html += `<li><strong>${cat}</strong>: ${items.length}</li>`;
  }
  html += `</ul>`;
  alert(html);
}

window.populateDatalist = populateDatalist;
window.showDB = showDB;

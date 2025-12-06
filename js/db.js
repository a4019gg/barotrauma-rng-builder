// js/db.js — база предметов + моды + поиск

let itemsDB = {};
const PROXY = 'https://api.allorigins.win/raw?url=';
const VANILLA_URL = 'https://raw.githubusercontent.com/Regalis11/Barotrauma/master/Content/Items/items.xml';

function populateDatalist() {
  const saved = localStorage.getItem('itemsDB_v0.6');
  if (saved) {
    itemsDB = JSON.parse(saved);
    fillDatalist();
    return;
  }

  fetch(PROXY + encodeURIComponent(VANILLA_URL))
    .then(r => r.text())
    .then(xml => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xml, 'text/xml');
      const items = [...doc.querySelectorAll('item[identifier]')];
      const db = {};

      items.forEach(item => {
        const id = item.getAttribute('identifier');
        const tags = (item.getAttribute('tags') || '').toLowerCase();
        let group = 'Misc';
        if (tags.includes('weapon')) group = 'Weapons';
        else if (tags.includes('medical')) group = 'Medical';
        else if (tags.includes('tool')) group = 'Tools';
        else if (tags.includes('ammo')) group = 'Ammo';
        else if (tags.includes('diving')) group = 'Diving Gear';
        else if (tags.includes('explosive')) group = 'Explosives';
        if (!db[group]) db[group] = [];
        db[group].push(id);
      });

      itemsDB = db;
      localStorage.setItem('itemsDB_v0.6', JSON.stringify(itemsDB));
      fillDatalist();
    })
    .catch(() => {
      // fallback
      itemsDB = {
        Weapons: ['revolver', 'smg', 'rifle', 'shotgun'],
        Medical: ['morphine', 'fentanyl', 'antibiotics'],
        Tools: ['welder', 'screwdriver', 'wrench'],
        Misc: ['clownmask', 'toyhammer', 'balloon']
      };
      localStorage.setItem('itemsDB_v0.6', JSON.stringify(itemsDB));
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

function openItemPicker() {
  let html = '<div style="max-height:400px;overflow:auto"><h3>Выберите предмет</h3>';
  for (const [group, items] of Object.entries(itemsDB)) {
    html += `<h4>${group} (${items.length})</h4><div style="display:flex;flex-wrap:wrap;gap:8px">`;
    items.forEach(item => {
      html += `<button onclick="insertItem('${item}')" style="margin:2px;padding:4px 8px">${item}</button>`;
    });
    html += '</div>';
  }
  html += '</div>';
  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:1000';
  modal.innerHTML = `<div style="background:#252526;padding:20px;border-radius:8px;max-width:90%;max-height:90%;overflow:auto;color:#ddd">${html}</div>`;
  modal.onclick = e => e.target === modal && modal.remove();
  document.body.appendChild(modal);
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
window.openItemPicker = openItemPicker;
window.insertItem = insertItem;

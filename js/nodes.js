// js/nodes.js — v0.9.200 — CREATURE, AFFLICTION, DRAG&DROP, SNAP, COLLAPSE

const NODES_VERSION = "v0.9.200";
window.NODES_VERSION = NODES_VERSION;

let counter = 0;
const GRID_SIZE = 30;
const snapToGrid = () => localStorage.getItem('snapToGrid') === 'true';

// === RNG ACTION ===
function createRNG(chance = 0.5) {
  const id = counter++;
  const div = document.createElement('div');
  div.className = 'node rng draggable';
  div.dataset.id = id;
  div.dataset.type = 'rng';
  div.innerHTML = `
    <div class="header-node" ondblclick="toggleCollapse(this.parentNode)">
      <span>${L.rngAction || 'RNGAction'}</span>
      <input type="number" step="0.001" min="0" max="1" value="${chance}" class="chance" onchange="updateAll()">
      <button class="danger small" onclick="removeNode(this)">×</button>
      <span class="prob"><span class="global">0.000%</span><br><small class="local">0.0%</small></span>
      <span class="final-chance" style="margin-left:10px;color:#888"></span>
    </div>
    <div class="children">
      <div class="success-label">${L.successLabel || 'Success'}</div>
      <div style="margin:6px 0;display:flex;gap:6px;">
        <button class="small" onclick="addRNG('${id}-s')">${L.addRNG || '+ RNG'}</button>
        <button class="small" onclick="addSpawn('${id}-s')">${L.addItem || '+ Item'}</button>
        <button class="small" onclick="addCreature('${id}-s')">${L.addCreature || '+ Creature'}</button>
        <button class="small" onclick="addAffliction('${id}-s')">${L.addAffliction || '+ Affliction'}</button>
      </div>
      <div id="c-${id}-s"></div>
    </div>
    <div class="children">
      <div class="failure-label">${L.failureLabel || 'Failure'}</div>
      <div style="margin:6px 0;display:flex;gap:6px;">
        <button class="small" onclick="addRNG('${id}-f')">${L.addRNG || '+ RNG'}</button>
        <button class="small" onclick="addSpawn('${id}-f')">${L.addItem || '+ Item'}</button>
        <button class="small" onclick="addCreature('${id}-f')">${L.addCreature || '+ Creature'}</button>
        <button class="small" onclick="addAffliction('${id}-f')">${L.addAffliction || '+ Affliction'}</button>
      </div>
      <div id="c-${id}-f"></div>
    </div>`;
  makeDraggable(div);
  return div;
}

// === SPAWN ITEM ===
function createSpawn(item = 'revolver') {
  const div = document.createElement('div');
  div.className = 'node spawn draggable';
  div.dataset.type = 'spawn';
  div.innerHTML = `
    <div class="header-node" ondblclick="toggleCollapse(this.parentNode)">
      <span>${L.spawnItem || 'SpawnItem'}</span>
      <input type="text" class="item-field" list="item-datalist" value="${item}" placeholder="revolver">
      <button class="danger small" onclick="removeNode(this)">×</button>
      <span class="prob"><span class="global">0.000%</span><br><small class="local">100.0%</small></span>
      <span class="final-chance" style="margin-left:10px;color:#888"></span>
    </div>`;
  makeDraggable(div);
  return div;
}

// === SPAWN CREATURE ===
function createCreature(creature = 'crawler', count = 1, randomize = true, inside = true) {
  const div = document.createElement('div');
  div.className = 'node creature draggable';
  div.dataset.type = 'creature';
  div.innerHTML = `
    <div class="header-node" ondblclick="toggleCollapse(this.parentNode)">
      <span>${L.spawnCreature || 'SpawnCreature'}</span>
      <input type="text" class="creature-field" list="item-datalist" value="${creature}" placeholder="crawler">
      <input type="number" min="1" value="${count}" class="count-field" style="width:60px">
      <label><input type="checkbox" class="randomize-field" ${randomize ? 'checked' : ''}> ${L.randomizePosition || 'Randomize'}</label>
      <select class="location-field">
        <option value="inside" ${inside ? 'selected' : ''}>${L.insideSub || 'Inside'}</option>
        <option value="outside" ${!inside ? 'selected' : ''}>${L.outsideSub || 'Outside'}</option>
      </select>
      <button class="danger small" onclick="removeNode(this)">×</button>
      <span class="prob"><span class="global">0.000%</span><br><small class="local">100.0%</small></span>
      <span class="final-chance" style="margin-left:10px;color:#888"></span>
    </div>`;
  makeDraggable(div);
  return div;
}

// === APPLY AFFLICTION ===
function createAffliction(aff = 'bleeding', strength = 15, target = 'character') {
  const div = document.createElement('div');
  div.className = 'node affliction draggable';
  div.dataset.type = 'affliction';
  div.innerHTML = `
    <div class="header-node" ondblclick="toggleCollapse(this.parentNode)">
      <span>${L.applyAffliction || 'ApplyAffliction'}</span>
      <input type="text" class="aff-field" value="${aff}" placeholder="bleeding">
      <input type="number" value="${strength}" class="strength-field" style="width:60px">
      <select class="target-field">
        <option value="character" ${target === 'character' ? 'selected' : ''}>${L.targetCharacter || 'Character'}</option>
        <option value="randomcrew" ${target === 'randomcrew' ? 'selected' : ''}>${L.targetRandomCrew || 'Random Crew'}</option>
        <option value="allcrew" ${target === 'allcrew' ? 'selected' : ''}>${L.targetAllCrew || 'All Crew'}</option>
      </select>
      <button class="danger small" onclick="removeNode(this)">×</button>
      <span class="prob"><span class="global">0.000%</span><br><small class="local">100.0%</small></span>
      <span class="final-chance" style="margin-left:10px;color:#888"></span>
    </div>`;
  makeDraggable(div);
  return div;
}

// === ДОБАВЛЕНИЕ ===
function addRNG(path) { addNode(path, createRNG); }
function addSpawn(path) { addNode(path, createSpawn); }
function addCreature(path) { addNode(path, createCreature); }
function addAffliction(path) { addNode(path, createAffliction); }

function addNode(path, creator) {
  const container = path ? document.getElementById('c-' + path) : document.getElementById('root-children');
  if (!container) return;
  container.appendChild(creator());
  updateAll();
}

// === УДАЛЕНИЕ ===
function removeNode(btn) {
  btn.closest('.node').remove();
  updateAll();
}

// === COLLAPSE ===
function toggleCollapse(node) {
  node.classList.toggle('collapsed');
}

// === DRAG & DROP + SNAP ===
function makeDraggable(node) {
  let pos = { x: 0, y: 0, x0: 0, y0: 0 };

  node.querySelector('.header-node').onmousedown = e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
    e.preventDefault();
    pos.x0 = e.clientX;
    pos.y0 = e.clientY;
    document.onmousemove = dragMove;
    document.onmouseup = dragEnd;
  };

  function dragMove(e) {
    pos.x = e.clientX - pos.x0;
    pos.y = e.clientY - pos.y0;
    pos.x0 = e.clientX;
    pos.y0 = e.clientY;

    let newX = node.offsetLeft + pos.x;
    let newY = node.offsetTop + pos.y;

    if (snapToGrid()) {
      newX = Math.round(newX / GRID_SIZE) * GRID_SIZE;
      newY = Math.round(newY / GRID_SIZE) * GRID_SIZE;
    }

    node.style.left = newX + 'px';
    node.style.top = newY + 'px';
    node.style.position = 'absolute';
  }

  function dragEnd() {
    document.onmousemove = null;
    document.onmouseup = null;
    updateAll();
  }
}

// === ВЕРОЯТНОСТИ + ПОДСВЕТКА ===
function updateProbabilities() {
  // ... (твой старый код вероятностей)
  // Добавляем final chance и цвет
  document.querySelectorAll('.node:not(.rng)').forEach(node => {
    const final = node.querySelector('.final-chance');
    if (final) {
      const global = parseFloat(node.querySelector('.global').textContent);
      final.textContent = `${L.finalChance || 'Final'}: ${global.toFixed(1)}%`;
      if (global < 5) final.style.color = '#f44747';
      else if (global < 20) final.style.color = '#ff9800';
      else final.style.color = '#6a9955';
    }
  });
}

// Экспорт
window.addRNG = addRNG;
window.addSpawn = addSpawn;
window.addCreature = addCreature;
window.addAffliction = addAffliction;
window.updateAll = updateAll;

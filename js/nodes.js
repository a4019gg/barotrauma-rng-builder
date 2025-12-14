// js/nodes.js — v0.9.200 — CREATURE, AFFLICTION, DRAG&DROP, SNAP, COLLAPSE, FINAL CHANCE

const NODES_VERSION = "v0.9.200";
window.NODES_VERSION = NODES_VERSION;

let counter = 0;
const GRID_SIZE = 30;

// === RNG ACTION ===
function createRNG(chance = 0.5) {
  const id = counter++;
  const div = document.createElement('div');
  div.className = 'node rng draggable';
  div.dataset.id = id;
  div.dataset.type = 'rng';
  div.innerHTML = `
    <div class="header-node" ondblclick="toggleCollapse(this.parentNode)">
      <span>${L.rngAction || 'ГСЧ-событие'}</span>
      <input type="number" step="0.001" min="0" max="1" value="${chance}" class="chance" onchange="updateAll()">
      <button class="danger small" onclick="removeNode(this)">×</button>
      <span class="prob"><span class="global">0.000%</span><br><small class="local">0.0%</small></span>
      <span class="final-chance" style="margin-left:10px;color:#888"></span>
    </div>
    <div class="children">
      <div class="success-label">${L.successLabel || 'Успех'}</div>
      <div style="margin:6px 0;display:flex;gap:6px;flex-wrap:wrap;">
        <button class="small" onclick="addRNG('${id}-s')">${L.addRNG || '+ ГСЧ'}</button>
        <button class="small" onclick="addSpawn('${id}-s')">${L.addItem || '+ Предмет'}</button>
        <button class="small" onclick="addCreature('${id}-s')">${L.addCreature || '+ Существо'}</button>
        <button class="small" onclick="addAffliction('${id}-s')">${L.addAffliction || '+ Аффикшен'}</button>
      </div>
      <div id="c-${id}-s"></div>
    </div>
    <div class="children">
      <div class="failure-label">${L.failureLabel || 'Провал'}</div>
      <div style="margin:6px 0;display:flex;gap:6px;flex-wrap:wrap;">
        <button class="small" onclick="addRNG('${id}-f')">${L.addRNG || '+ ГСЧ'}</button>
        <button class="small" onclick="addSpawn('${id}-f')">${L.addItem || '+ Предмет'}</button>
        <button class="small" onclick="addCreature('${id}-f')">${L.addCreature || '+ Существо'}</button>
        <button class="small" onclick="addAffliction('${id}-f')">${L.addAffliction || '+ Аффикшен'}</button>
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
      <span>${L.spawnItem || 'Спавн предмета'}</span>
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
      <span>${L.spawnCreature || 'Спавн существа'}</span>
      <input type="text" class="creature-field" list="item-datalist" value="${creature}" placeholder="crawler">
      <input type="number" min="1" value="${count}" class="count-field" style="width:60px">
      <label><input type="checkbox" class="randomize-field" ${randomize ? 'checked' : ''}> ${L.randomizePosition || 'Случайная позиция'}</label>
      <select class="location-field" style="width:120px">
        <option value="inside" ${inside ? 'selected' : ''}>${L.insideSub || 'Внутри'}</option>
        <option value="outside" ${!inside ? 'selected' : ''}>${L.outsideSub || 'Снаружи'}</option>
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
      <span>${L.applyAffliction || 'Применить аффикшен'}</span>
      <input type="text" class="aff-field" value="${aff}" placeholder="bleeding">
      <input type="number" value="${strength}" class="strength-field" style="width:60px">
      <select class="target-field" style="width:150px">
        <option value="character" ${target === 'character' ? 'selected' : ''}>${L.targetCharacter || 'Персонаж'}</option>
        <option value="randomcrew" ${target === 'randomcrew' ? 'selected' : ''}>${L.targetRandomCrew || 'Случайный член экипажа'}</option>
        <option value="allcrew" ${target === 'allcrew' ? 'selected' : ''}>${L.targetAllCrew || 'Весь экипаж'}</option>
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
  saveState(); // undo
  container.appendChild(creator());
  updateAll();
}

// === УДАЛЕНИЕ ===
function removeNode(btn) {
  saveState();
  btn.closest('.node').remove();
  updateAll();
}

// === COLLAPSE ===
function toggleCollapse(node) {
  node.classList.toggle('collapsed');
}

// === DRAG & DROP + SNAP ===
function makeDraggable(node) {
  let pos = { x: 0, y: 0 };

  const header = node.querySelector('.header-node');
  header.style.cursor = 'move';

  header.onmousedown = e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.tagName === 'SELECT') return;
    e.preventDefault();

    pos.x = e.clientX - node.offsetLeft;
    pos.y = e.clientY - node.offsetTop;

    document.onmousemove = drag;
    document.onmouseup = stopDrag;
  };

  function drag(e) {
    let newX = e.clientX - pos.x;
    let newY = e.clientY - pos.y;

    if (localStorage.getItem('snapToGrid') === 'true') {
      newX = Math.round(newX / GRID_SIZE) * GRID_SIZE;
      newY = Math.round(newY / GRID_SIZE) * GRID_SIZE;
    }

    node.style.position = 'absolute';
    node.style.left = newX + 'px';
    node.style.top = newY + 'px';
  }

  function stopDrag() {
    document.onmousemove = null;
    document.onmouseup = null;
    updateAll();
  }
}

// === ИТОГОВЫЕ ШАНСЫ + ПОДСВЕТКА ===
function updateProbabilities() {
  // Простой расчёт глобального шанса (рекурсивно)
  function calcGlobal(container, parentChance = 1) {
    container.querySelectorAll(':scope > .node').forEach(node => {
      const globalSpan = node.querySelector('.global');
      const finalSpan = node.querySelector('.final-chance');

      if (node.dataset.type === 'rng') {
        const chance = parseFloat(node.querySelector('.chance')?.value) || 0.5;
        const localChance = chance * parentChance;
        globalSpan.textContent = (localChance * 100).toFixed(3) + '%';

        calcGlobal(node.querySelector(`#c-${node.dataset.id}-s`), localChance);
        calcGlobal(node.querySelector(`#c-${node.dataset.id}-f`), parentChance - localChance);
      } else {
        globalSpan.textContent = (parentChance * 100).toFixed(3) + '%';
        if (finalSpan) {
          const chance = parseFloat(globalSpan.textContent);
          finalSpan.textContent = `${L.finalChance || 'Итоговый шанс'}: ${chance.toFixed(1)}%`;
          if (chance < 5) finalSpan.style.color = '#f44747';
          else if (chance < 20) finalSpan.style.color = '#ff9800';
          else finalSpan.style.color = '#6a9955';
        }
      }
    });
  }

  calcGlobal(document.getElementById('root-children'));
}

// Вызов updateAll вызывает updateProbabilities
function updateAll() {
  updateProbabilities();
  if (isTreeView) renderTree();
}

// Экспорт
window.addRNG = addRNG;
window.addSpawn = addSpawn;
window.addCreature = addCreature;
window.addAffliction = addAffliction;
window.updateAll = updateAll;
window.saveState = saveState;

// js/nodes.js — v0.9.106

const NODES_VERSION = "v0.9.106";
window.NODES_VERSION = NODES_VERSION;

let counter = 0;

function createRNG(chance = 0.5) {
  const id = counter++;
  const div = document.createElement('div');
  div.className = 'node rng';
  div.dataset.id = id;
  div.innerHTML = `
    <div class="header-node" ondblclick="this.parentNode.classList.toggle('collapsed')">
      <span>RNGAction</span>
      <input type="number" step="0.001" min="0" max="1" value="${chance}" class="chance" onchange="updateAll()">
      <button class="danger small" onclick="this.closest('.node').remove();updateAll()">×</button>
      <span class="prob"><span class="global">0.000%</span><br><small class="local">0.0%</small></span>
    </div>
    <div class="children">
      <div class="success-label" style="color:var(--green);font-weight:bold;">${L.successLabel || 'Success'}</div>
      <div style="margin:6px 0;display:flex;gap:6px;">
        <button class="small" onclick="addRNG('${id}-s')">+ RNG</button>
        <button class="small" onclick="addSpawn('${id}-s')">+ Item</button>
      </div>
      <div id="c-${id}-s"></div>
    </div>
    <div class="children">
      <div class="failure-label" style="color:var(--red);font-weight:bold;">${L.failureLabel || 'Failure'}</div>
      <div style="margin:6px 0;display:flex;gap:6px;">
        <button class="small" onclick="addRNG('${id}-f')">+ RNG</button>
        <button class="small" onclick="addSpawn('${id}-f')">+ Item</button>
      </div>
      <div id="c-${id}-f"></div>
    </div>`;
  return div;
}

function createSpawn() {
  const div = document.createElement('div');
  div.className = 'node spawn';
  div.innerHTML = `
    <div class="header-node">
      <span>SpawnItem</span>
      <input type="text" class="item-field" list="item-datalist" placeholder="revolver">
      <button class="danger small" onclick="this.closest('.node').remove();updateAll()">×</button>
      <span class="prob"><span class="global">0.000%</span><br><small class="local">0.0%</small></span>
    </div>`;
  return div;
}

function addRNG(path) {
  const container = path.includes('-') ? document.getElementById('c-' + path) : document.getElementById('root-children');
  if (!container) return;
  container.appendChild(createRNG());
  updateAll();
}

function addSpawn(path) {
  const container = path.includes('-') ? document.getElementById('c-' + path) : document.getElementById('root-children');
  if (!container) return;
  container.appendChild(createSpawn());
  updateAll();
}

function updateProbabilities() {
  function calc(node, globalProb = 1.0, parentLocal = 1.0) {
    if (!node || !node.querySelector) return;
    const probEl = node.querySelector('.prob');
    if (!probEl) return;
    const globalEl = probEl.querySelector('.global');
    const localEl = probEl.querySelector('.local');

    if (node.classList.contains('spawn')) {
      globalEl.textContent = (globalProb * 100).toFixed(3) + '%';
      localEl.textContent = (parentLocal * 100).toFixed(1) + '%';
      probEl.dataset.tip = `Global: ${(globalProb*100).toFixed(3)}% | Local: ${(parentLocal*100).toFixed(1)}%`;
      return;
    }

    if (node.classList.contains('rng')) {
      const chance = parseFloat(node.querySelector('.chance')?.value) || 0.5;
      const sGlobal = globalProb * chance;
      const fGlobal = globalProb * (1 - chance);

      const sCont = node.querySelector(`#c-${node.dataset.id}-s`);
      const fCont = node.querySelector(`#c-${node.dataset.id}-f`);

      if (sCont) sCont.querySelectorAll(':scope > .node').forEach(n => calc(n, sGlobal, chance));
      if (fCont) fCont.querySelectorAll(':scope > .node').forEach(n => calc(n, fGlobal, 1 - chance));

      globalEl.textContent = (globalProb * 100).toFixed(3) + '%';
      localEl.textContent = (chance * 100).toFixed(1) + '% → ' + ((1 - chance) * 100).toFixed(1) + '%';
    }
  }
  document.querySelectorAll('#root-children > .node').forEach(n => calc(n));
}

function autoBalance() {
  const mode = prompt('1 — 50/50\n2 — По предметам', '2');
  if (!mode || !['1','2'].includes(mode)) return;

  document.querySelectorAll('.node.rng').forEach(rng => {
    const input = rng.querySelector('.chance');
    if (!input) return;
    if (mode === '1') {
      input.value = 0.5;
    } else {
      const s = rng.querySelector(`#c-${rng.dataset.id}-s`)?.querySelectorAll('.node.spawn').length || 0;
      const f = rng.querySelector(`#c-${rng.dataset.id}-f`)?.querySelectorAll('.node.spawn').length || 0;
      const total = s + f;
      input.value = total === 0 ? 0.5 : (s / total).toFixed(6);
    }
  });
  updateAll();
}

function updateAll() {
  updateProbabilities();
  if (typeof renderTree === 'function' && !document.getElementById('tree-container').classList.contains('hidden')) {
    renderTree();
  }
}

window.addRNG = addRNG;
window.addSpawn = addSpawn;
window.updateAll = updateAll;
window.autoBalance = autoBalance;

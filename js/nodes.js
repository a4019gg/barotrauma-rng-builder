// nodes.js — узлы, вероятности, Auto Balance

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
      <div class="success-label" style="color:var(--green);font-weight:bold;">Success</div>
      <div style="margin:6px 0;display:flex;gap:6px;">
        <button class="small" onclick="addRNG('${id}-s')">+ RNG</button>
        <button class="small" onclick="addSpawn('${id}-s')">+ Item</button>
      </div>
      <div id="c-${id}-s"></div>
    </div>
    <div class="children">
      <div class="failure-label" style="color:var(--red);font-weight:bold;">Failure</div>
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
  container.appendChild(createRNG());
  updateAll();
}

function addSpawn(path) {
  const container = path.includes('-') ? document.getElementById('c-' + path) : document.getElementById('root-children');
  container.appendChild(createSpawn());
  updateAll();
}

function updateProbabilities() {
  // ... полный код расчёта из предыдущих версий, но с двойными вероятностями ...
  // Для global — общий по событию, local — по ветке (используй рекурсию с аккумулятором)
  function calc(node, globalProb = 1.0, localProb = 1.0) {
    const el = node.querySelector('.prob');
    const g = (globalProb * 100).toFixed(3) + '%';
    const l = (localProb * 100).toFixed(1) + '%';
    el.querySelector('.global').textContent = g;
    el.querySelector('.local').textContent = l;
    el.dataset.tip = `Global: ${g} | Local: ${l}`;

    if (node.classList.contains('rng')) {
      const c = parseFloat(node.querySelector('.chance').value) || 0.5;
      const sGlobal = globalProb * c;
      const fGlobal = globalProb * (1 - c);
      const sLocal = c;
      const fLocal = 1 - c;

      const sc = node.querySelector(`#c-${node.dataset.id}-s`);
      const fc = node.querySelector(`#c-${node.dataset.id}-f`);
      sc && sc.querySelectorAll(':scope > .node').forEach(n => calc(n, sGlobal, sLocal));
      fc && fc.querySelectorAll(':scope > .node').forEach(n => calc(n, fGlobal, fLocal));
    }
  }
  document.querySelectorAll('#root-children > .node').forEach(n => calc(n, 1.0, 1.0));
}

function autoBalance() {
  const lang = localStorage.getItem('lang') || 'en';
  const txt = lang === 'ru' ? 'Режим баланса:\n1 — Равномерно\n2 — По предметам' : 'Balance mode:\n1 — Even\n2 — By items';
  const mode = prompt(txt, '2');
  // ... полный код из предыдущего, но с локализацией ...
}

function updateAll() {
  updateProbabilities();
  if (isTreeView) renderTree();
}

window.addRNG = addRNG;
window.addSpawn = addSpawn;
window.updateAll = updateAll;
window.autoBalance = autoBalance;

// nodes.js — создание узлов, расчёт вероятностей, Auto Balance

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
      <span class="prob" data-tip="">0.000%</span>
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
    </div>
  `;
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
      <span class="prob" data-tip="">0.000%</span>
    </div>
  `;
  return div;
}

function addRNG(path) {
  const container = path.includes('-') 
    ? document.getElementById('c-' + path) 
    : document.getElementById('root-children');
  container.appendChild(createRNG());
  updateAll();
}

function addSpawn(path) {
  const container = path.includes('-') 
    ? document.getElementById('c-' + path) 
    : document.getElementById('root-children');
  container.appendChild(createSpawn());
  updateAll();
}

// === ГЛАВНАЯ ФУНКЦИЯ — РАСЧЁТ ВЕРОЯТНОСТЕЙ ===
function updateProbabilities() {
  function calc(node, prob = 1.0) {
    if (!node || !node.classList) return;

    const probEl = node.querySelector('.prob');
    if (node.classList.contains('spawn')) {
      const p = (prob * 100).toFixed(3) + '%';
      probEl.textContent = p;
      probEl.dataset.tip = (prob * 100).toFixed(6) + '%';
      return;
    }

    if (node.classList.contains('rng')) {
      const chance = parseFloat(node.querySelector('.chance').value) || 0.5;
      const successP = prob * chance;
      const failureP = prob * (1 - chance);

      probEl.textContent = (prob * 100).toFixed(2) + '%';
      probEl.dataset.tip = `Success: ${(successP*100).toFixed(4)}% | Failure: ${(failureP*100).toFixed(4)}%`;

      const successCont = node.querySelector('#c-' + node.dataset.id + '-s');
      const failureCont = node.querySelector('#c-' + node.dataset.id + '-f');

      successCont && successCont.querySelectorAll(':scope > .node').forEach(n => calc(n, successP));
      failureCont && failureCont.querySelectorAll(':scope > .node').forEach(n => calc(n, failureP));
    }
  }

  document.querySelectorAll('#root-children > .node').forEach(node => calc(node, 1.0));
}

// === AUTO BALANCE ===
function autoBalance() {
  const root = document.getElementById('root-children');
  const rngNodes = root.querySelectorAll('.node.rng');

  if (rngNodes.length === 0) {
    alert('Добавьте хотя бы один RNG-узел!');
    return;
  }

  const mode = prompt(
    'Выберите режим баланса:\n1 — Равномерно (по 50%)\n2 — По количеству спавнов в Success/Failure\nВведите 1 или 2',
    '2'
  );

  rngNodes.forEach(rng => {
    const input = rng.querySelector('.chance');
    if (!input) return;

    if (mode === '1') {
      input.value = 0.5;
    } else {
      const successItems = rng.querySelector('#c-' + rng.dataset.id + '-s')?.querySelectorAll('.node.spawn').length || 0;
      const failureItems = rng.querySelector('#c-' + rng.dataset.id + '-f')?.querySelectorAll('.node.spawn').length || 0;
      const total = successItems + failureItems;
      if (total === 0) {
        input.value = 0.5;
      } else {
        input.value = (successItems / total).toFixed(4);
      }
    }
  });

  updateAll();
  alert('Auto Balance применён!');
}

// === Обновление всего ===
function updateAll() {
  updateProbabilities();
  if (window.renderTree && !document.getElementById('tree-container').classList.contains('hidden')) {
    renderTree();
  }
}

// Глобальные функции
window.addRNG = addRNG;
window.addSpawn = addSpawn;
window.updateAll = updateAll;
window.autoBalance = autoBalance;
window.createRNG = createRNG;
window.createSpawn = createSpawn;

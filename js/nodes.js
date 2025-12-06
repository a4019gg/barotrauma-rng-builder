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
      <span class="prob" data-tip="">0.000%</span>
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
  function calc(node, prob = 1.0) {
    if (!node) return;
    const el = node.querySelector('.prob');
    if (node.classList.contains('spawn')) {
      const p = (prob * 100).toFixed(3) + '%';
      el.textContent = p;
      el.dataset.tip = (prob * 100).toFixed(6) + '%';
      return;
    }
    if (node.classList.contains('rng')) {
      const c = parseFloat(node.querySelector('.chance').value) || 0.5;
      const s = prob * c, f = prob * (1 - c);
      el.textContent = (prob * 100).toFixed(2) + '%';
      el.dataset.tip = `Success: ${(s*100).toFixed(4)}% | Failure: ${(f*100).toFixed(4)}%`;
      const sc = node.querySelector(`#c-${node.dataset.id}-s`);
      const fc = node.querySelector(`#c-${node.dataset.id}-f`);
      sc && sc.querySelectorAll(':scope > .node').forEach(n => calc(n, s));
      fc && fc.querySelectorAll(':scope > .node').forEach(n => calc(n, f));
    }
  }
  document.querySelectorAll('#root-children > .node').forEach(n => calc(n, 1.0));
}

function autoBalance() {
  const lang = localStorage.getItem('lang') || 'en';
  const txt = lang === 'ru' ? {
    title: 'Режим баланса',
    even: 'Равномерно (50/50)',
    count: 'По количеству предметов',
    enter: 'Введите 1 или 2'
  } : {
    title: 'Balance mode',
    even: 'Even (50/50)',
    count: 'By item count',
    enter: 'Enter 1 or 2'
  };

  const mode = prompt(`${txt.even} — 1\n${txt.count} — 2\n\n${txt.enter}`, '2');
  if (!mode || !['1','2'].includes(mode)) return;

  document.querySelectorAll('.node.rng').forEach(rng => {
    const input = rng.querySelector('.chance');
    if (mode === '1') {
      input.value = 0.5;
    } else {
      const s = rng.querySelector(`#c-${rng.dataset.id}-s`)?.querySelectorAll('.node.spawn').length || 0;
      const f = rng.querySelector(`#c-${rng.dataset.id}-f`)?.querySelectorAll('.node.spawn').length || 0;
      const total = s + f || 1;
      input.value = (s / total).toFixed(4);
    }
  });
  updateAll();
  alert(lang === 'ru' ? 'Баланс применён!' : 'Balance applied!');
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

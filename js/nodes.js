// js/nodes.js — v0.9.200 — РЕФАКТОРИНГ: КЛАСС, БЕЗОПАСНЫЙ DOM, КОЛБЭКИ

const NODES_VERSION = "v0.9.200";
window.NODES_VERSION = NODES_VERSION;

const GRID_SIZE = 30;

class NodeFactory {
  constructor(updateCallback, saveStateCallback) {
    this.updateCallback = updateCallback;
    this.saveStateCallback = saveStateCallback;
    this.idCounter = 0;
  }

  generateId() {
    return this.idCounter++;
  }

  createRNG(chance = 0.5) {
    const id = this.generateId();
    const node = document.createElement('div');
    node.className = 'node rng draggable';
    node.dataset.id = id;
    node.dataset.type = 'rng';

    const header = document.createElement('div');
    header.className = 'header-node';

    const title = document.createElement('span');
    title.textContent = loc('rngAction', 'ГСЧ-событие');

    const chanceInput = document.createElement('input');
    chanceInput.type = 'number';
    chanceInput.step = '0.001';
    chanceInput.min = '0';
    chanceInput.max = '1';
    chanceInput.value = chance;
    chanceInput.className = 'chance';
    chanceInput.addEventListener('change', () => this.updateCallback());

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'danger small';
    deleteBtn.textContent = '×';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.saveStateCallback();
      node.remove();
      this.updateCallback();
    });

    const prob = document.createElement('span');
    prob.className = 'prob';
    prob.innerHTML = '<span class="global">0.000%</span><br><small class="local">0.0%</small>';

    const finalChance = document.createElement('span');
    finalChance.className = 'final-chance';
    finalChance.style.marginLeft = '10px';
    finalChance.style.color = '#888';

    header.appendChild(title);
    header.appendChild(chanceInput);
    header.appendChild(deleteBtn);
    header.appendChild(prob);
    header.appendChild(finalChance);

    const successSection = this.createBranch(id, '-s', 'success-label', loc('successLabel', 'Успех'));
    const failureSection = this.createBranch(id, '-f', 'failure-label', loc('failureLabel', 'Провал'));

    node.appendChild(header);
    node.appendChild(successSection);
    node.appendChild(failureSection);

    this.attachCommonBehaviors(node);
    return node;
  }

  createBranch(id, suffix, labelClass, labelText) {
    const section = document.createElement('div');
    section.className = 'children';

    const label = document.createElement('div');
    label.className = labelClass;
    label.textContent = labelText;

    const buttons = document.createElement('div');
    buttons.style.cssText = 'margin:6px 0;display:flex;gap:6px;flex-wrap:wrap;';

    const actions = [
      { text: loc('addRNG', '+ ГСЧ'), action: 'addRNG' },
      { text: loc('addItem', '+ Предмет'), action: 'addSpawn' },
      { text: loc('addCreature', '+ Существо'), action: 'addCreature' },
      { text: loc('addAffliction', '+ Аффикшен'), action: 'addAffliction' }
    ];

    actions.forEach(a => {
      const btn = document.createElement('button');
      btn.className = 'small';
      btn.textContent = a.text;
      btn.dataset.action = a.action;
      btn.dataset.target = id + suffix;
      btn.addEventListener('click', () => {
        this.saveStateCallback();
        // Вызов глобальной функции добавления (временный мостик)
        const func = window[a.action];
        if (typeof func === 'function') func(id + suffix);
        this.updateCallback();
      });
      buttons.appendChild(btn);
    });

    const container = document.createElement('div');
    container.id = `c-${id}${suffix}`;

    section.appendChild(label);
    section.appendChild(buttons);
    section.appendChild(container);

    return section;
  }

  createSpawn(item = 'revolver') {
    const node = document.createElement('div');
    node.className = 'node spawn draggable';
    node.dataset.type = 'spawn';

    const header = document.createElement('div');
    header.className = 'header-node';

    const title = document.createElement('span');
    title.textContent = loc('spawnItem', 'Спавн предмета');

    const itemInput = document.createElement('input');
    itemInput.type = 'text';
    itemInput.className = 'item-field';
    itemInput.list = 'item-datalist';
    itemInput.value = item;
    itemInput.placeholder = 'revolver';

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'danger small';
    deleteBtn.textContent = '×';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.saveStateCallback();
      node.remove();
      this.updateCallback();
    });

    const prob = document.createElement('span');
    prob.className = 'prob';
    prob.innerHTML = '<span class="global">0.000%</span><br><small class="local">100.0%</small>';

    const finalChance = document.createElement('span');
    finalChance.className = 'final-chance';
    finalChance.style.marginLeft = '10px';
    finalChance.style.color = '#888';

    header.appendChild(title);
    header.appendChild(itemInput);
    header.appendChild(deleteBtn);
    header.appendChild(prob);
    header.appendChild(finalChance);

    node.appendChild(header);
    this.attachCommonBehaviors(node);
    return node;
  }

  createCreature(creature = 'crawler', count = 1, randomize = true, inside = true) {
    const node = document.createElement('div');
    node.className = 'node creature draggable';
    node.dataset.type = 'creature';

    const header = document.createElement('div');
    header.className = 'header-node';

    const title = document.createElement('span');
    title.textContent = loc('spawnCreature', 'Спавн существа');

    const creatureInput = document.createElement('input');
    creatureInput.type = 'text';
    creatureInput.className = 'creature-field';
    creatureInput.list = 'item-datalist';
    creatureInput.value = creature;
    creatureInput.placeholder = 'crawler';

    const countInput = document.createElement('input');
    countInput.type = 'number';
    countInput.min = '1';
    countInput.value = count;
    countInput.className = 'count-field';
    countInput.style.width = '60px';

    const randomizeLabel = document.createElement('label');
    const randomizeCheckbox = document.createElement('input');
    randomizeCheckbox.type = 'checkbox';
    randomizeCheckbox.className = 'randomize-field';
    randomizeCheckbox.checked = randomize;
    randomizeLabel.appendChild(randomizeCheckbox);
    randomizeLabel.appendChild(document.createTextNode(loc('randomizePosition', 'Случайная позиция')));

    const locationSelect = document.createElement('select');
    locationSelect.className = 'location-field';
    const insideOption = document.createElement('option');
    insideOption.value = 'inside';
    insideOption.textContent = loc('insideSub', 'Внутри');
    const outsideOption = document.createElement('option');
    outsideOption.value = 'outside';
    outsideOption.textContent = loc('outsideSub', 'Снаружи');
    if (inside) insideOption.selected = true;
    else outsideOption.selected = true;
    locationSelect.appendChild(insideOption);
    locationSelect.appendChild(outsideOption);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'danger small';
    deleteBtn.textContent = '×';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.saveStateCallback();
      node.remove();
      this.updateCallback();
    });

    const prob = document.createElement('span');
    prob.className = 'prob';
    prob.innerHTML = '<span class="global">0.000%</span><br><small class="local">100.0%</small>';

    const finalChance = document.createElement('span');
    finalChance.className = 'final-chance';
    finalChance.style.marginLeft = '10px';
    finalChance.style.color = '#888';

    header.appendChild(title);
    header.appendChild(creatureInput);
    header.appendChild(countInput);
    header.appendChild(randomizeLabel);
    header.appendChild(locationSelect);
    header.appendChild(deleteBtn);
    header.appendChild(prob);
    header.appendChild(finalChance);

    node.appendChild(header);
    this.attachCommonBehaviors(node);
    return node;
  }

  createAffliction(aff = 'bleeding', strength = 15, target = 'character') {
    const node = document.createElement('div');
    node.className = 'node affliction draggable';
    node.dataset.type = 'affliction';

    const header = document.createElement('div');
    header.className = 'header-node';

    const title = document.createElement('span');
    title.textContent = loc('applyAffliction', 'Применить аффикшен');

    const affInput = document.createElement('input');
    affInput.type = 'text';
    affInput.className = 'aff-field';
    affInput.value = aff;
    affInput.placeholder = 'bleeding';

    const strengthInput = document.createElement('input');
    strengthInput.type = 'number';
    strengthInput.value = strength;
    strengthInput.className = 'strength-field';
    strengthInput.style.width = '60px';

    const targetSelect = document.createElement('select');
    targetSelect.className = 'target-field';
    const options = [
      { value: 'character', text: loc('targetCharacter', 'Персонаж') },
      { value: 'randomcrew', text: loc('targetRandomCrew', 'Случайный член экипажа') },
      { value: 'allcrew', text: loc('targetAllCrew', 'Весь экипаж') }
    ];
    options.forEach(o => {
      const opt = document.createElement('option');
      opt.value = o.value;
      opt.textContent = o.text;
      if (o.value === target) opt.selected = true;
      targetSelect.appendChild(opt);
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'danger small';
    deleteBtn.textContent = '×';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.saveStateCallback();
      node.remove();
      this.updateCallback();
    });

    const prob = document.createElement('span');
    prob.className = 'prob';
    prob.innerHTML = '<span class="global">0.000%</span><br><small class="local">100.0%</small>';

    const finalChance = document.createElement('span');
    finalChance.className = 'final-chance';
    finalChance.style.marginLeft = '10px';
    finalChance.style.color = '#888';

    header.appendChild(title);
    header.appendChild(affInput);
    header.appendChild(strengthInput);
    header.appendChild(targetSelect);
    header.appendChild(deleteBtn);
    header.appendChild(prob);
    header.appendChild(finalChance);

    node.appendChild(header);
    this.attachCommonBehaviors(node);
    return node;
  }

  attachCommonBehaviors(node) {
    const header = node.querySelector('.header-node');
    if (header) {
      header.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        node.classList.toggle('collapsed');
        this.updateCallback();
      });
      this.makeDraggable(node, header);
    }
  }

  makeDraggable(node, header) {
    let pos = { x: 0, y: 0 };

    const startDrag = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.tagName === 'SELECT') return;
      e.preventDefault();

      pos.x = e.clientX - node.offsetLeft;
      pos.y = e.clientY - node.offsetTop;

      document.addEventListener('mousemove', drag);
      document.addEventListener('mouseup', stopDrag);
    };

    const drag = (e) => {
      let newX = e.clientX - pos.x;
      let newY = e.clientY - pos.y;

      if (localStorage.getItem('snapToGrid') === 'true') {
        newX = Math.round(newX / GRID_SIZE) * GRID_SIZE;
        newY = Math.round(newY / GRID_SIZE) * GRID_SIZE;
      }

      node.style.position = 'absolute';
      node.style.left = newX + 'px';
      node.style.top = newY + 'px';
    };

    const stopDrag = () => {
      document.removeEventListener('mousemove', drag);
      document.removeEventListener('mouseup', stopDrag);
      this.updateCallback();
    };

    header.addEventListener('mousedown', startDrag);
  }
}

// Глобальный экземпляр (временный мостик к старой архитектуре)
const nodeFactory = new NodeFactory(updateAll, saveState);

// Глобальные функции добавления (для совместимости)
window.addRNG = (path) => {
  const container = path ? document.getElementById('c-' + path) : document.getElementById('root-children');
  if (container) {
    saveState();
    container.appendChild(nodeFactory.createRNG());
    updateAll();
  }
};

window.addSpawn = (path) => {
  const container = path ? document.getElementById('c-' + path) : document.getElementById('root-children');
  if (container) {
    saveState();
    container.appendChild(nodeFactory.createSpawn());
    updateAll();
  }
};

window.addCreature = (path) => {
  const container = path ? document.getElementById('c-' + path) : document.getElementById('root-children');
  if (container) {
    saveState();
    container.appendChild(nodeFactory.createCreature());
    updateAll();
  }
};

window.addAffliction = (path) => {
  const container = path ? document.getElementById('c-' + path) : document.getElementById('root-children');
  if (container) {
    saveState();
    container.appendChild(nodeFactory.createAffliction());
    updateAll();
  }
};

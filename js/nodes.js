// js/nodes.js — v0.9.301 — ПОЛНАЯ ПОДДЕРЖКА МОДЕЛИ ДАННЫХ

const NODES_VERSION = "v0.9.301";
window.NODES_VERSION = NODES_VERSION;

const GRID_SIZE = 30;

class NodeFactory {
  constructor() {
    this.idCounter = 0;
  }

  generateId() {
    return this.idCounter++;
  }

  // === СОЗДАНИЕ МОДЕЛИ УЗЛА ===
  createModel(type, params = {}) {
    const id = this.generateId();
    const base = {
      id,
      type,
      params
    };

    if (type === 'rng') {
      return {
        ...base,
        children: {
          success: [],
          failure: []
        }
      };
    }

    return base;
  }

  createModelRNG(chance = 0.5) {
    return this.createModel('rng', { chance });
  }

  createModelSpawn(item = 'revolver') {
    return this.createModel('spawn', { item });
  }

  createModelCreature(creature = 'crawler', count = 1, randomize = true, inside = true) {
    return this.createModel('creature', { creature, count, randomize, inside });
  }

  createModelAffliction(affliction = 'bleeding', strength = 15, target = 'character') {
    return this.createModel('affliction', { affliction, strength, target });
  }

  // === СОЗДАНИЕ DOM ИЗ МОДЕЛИ ===
  createFromModel(model) {
    const node = document.createElement('div');
    node.className = 'node ' + model.type + ' draggable';
    node.dataset.id = model.id;
    node.dataset.type = model.type;

    const header = document.createElement('div');
    header.className = 'header-node';

    const title = document.createElement('span');
    title.textContent = this.getTitle(model);

    header.appendChild(title);

    this.appendParams(header, model);

    // Кнопка удаления
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'danger small';
    deleteBtn.textContent = '×';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.editorState.removeNodeById(model.id);
    });
    header.appendChild(deleteBtn);

    // Вероятности
    const prob = document.createElement('span');
    prob.className = 'prob';
    prob.innerHTML = '<span class="global">0.000%</span><br><small class="local">100.0%</small>';
    header.appendChild(prob);

    const finalChance = document.createElement('span');
    finalChance.className = 'final-chance';
    finalChance.style.marginLeft = '10px';
    finalChance.style.color = '#888';
    header.appendChild(finalChance);

    node.appendChild(header);

    // Для RNG — ветки
    if (model.type === 'rng' && model.children) {
      const successSection = this.createBranch(model.id, '-s', 'success-label', loc('successLabel', 'Успех'));
      const failureSection = this.createBranch(model.id, '-f', 'failure-label', 'Провал'));

      const successContainer = successSection.querySelector(`#c-${model.id}-s`);
      const failureContainer = failureSection.querySelector(`#c-${model.id}-f`);

      model.children.success.forEach(childModel => {
        successContainer.appendChild(this.createFromModel(childModel));
      });
      model.children.failure.forEach(childModel => {
        failureContainer.appendChild(this.createFromModel(childModel));
      });

      node.appendChild(successSection);
      node.appendChild(failureSection);
    }

    this.attachCommonBehaviors(node, model);
    return node;
  }

  getTitle(model) {
    switch (model.type) {
      case 'rng': return loc('rngAction', 'ГСЧ-событие');
      case 'spawn': return loc('spawnItem', 'Спавн предмета');
      case 'creature': return loc('spawnCreature', 'Спавн существа');
      case 'affliction': return loc('applyAffliction', 'Применить аффикшен');
      default: return 'Unknown';
    }
  }

  appendParams(header, model) {
    const params = model.params || {};

    switch (model.type) {
      case 'rng':
        const chanceInput = document.createElement('input');
        chanceInput.type = 'number';
        chanceInput.step = '0.001';
        chanceInput.min = '0';
        chanceInput.max = '1';
        chanceInput.value = params.chance ?? 0.5;
        chanceInput.className = 'chance';
        chanceInput.addEventListener('change', () => {
          model.params.chance = parseFloat(chanceInput.value);
          updateAll();
        });
        header.appendChild(chanceInput);
        break;

      case 'spawn':
        const itemInput = document.createElement('input');
        itemInput.type = 'text';
        itemInput.className = 'item-field';
        itemInput.list = 'item-datalist';
        itemInput.value = params.item || 'revolver';
        itemInput.placeholder = 'revolver';
        itemInput.addEventListener('change', () => {
          model.params.item = itemInput.value.trim();
          updateAll();
        });
        header.appendChild(itemInput);
        break;

      case 'creature':
        const creatureInput = document.createElement('input');
        creatureInput.type = 'text';
        creatureInput.className = 'creature-field';
        creatureInput.list = 'item-datalist';
        creatureInput.value = params.creature || 'crawler';
        creatureInput.placeholder = 'crawler';
        creatureInput.addEventListener('change', () => {
          model.params.creature = creatureInput.value.trim();
          updateAll();
        });
        header.appendChild(creatureInput);

        const countInput = document.createElement('input');
        countInput.type = 'number';
        countInput.min = '1';
        countInput.value = params.count ?? 1;
        countInput.className = 'count-field';
        countInput.style.width = '60px';
        countInput.addEventListener('change', () => {
          model.params.count = parseInt(countInput.value);
          updateAll();
        });
        header.appendChild(countInput);

        const randomizeLabel = document.createElement('label');
        const randomizeCheckbox = document.createElement('input');
        randomizeCheckbox.type = 'checkbox';
        randomizeCheckbox.className = 'randomize-field';
        randomizeCheckbox.checked = params.randomize ?? true;
        randomizeCheckbox.addEventListener('change', () => {
          model.params.randomize = randomizeCheckbox.checked;
          updateAll();
        });
        randomizeLabel.appendChild(randomizeCheckbox);
        randomizeLabel.appendChild(document.createTextNode(loc('randomizePosition', 'Случайная позиция')));
        header.appendChild(randomizeLabel);

        const locationSelect = document.createElement('select');
        locationSelect.className = 'location-field';
        const insideOption = document.createElement('option');
        insideOption.value = 'inside';
        insideOption.textContent = loc('insideSub', 'Внутри');
        const outsideOption = document.createElement('option');
        outsideOption.value = 'outside';
        outsideOption.textContent = loc('outsideSub', 'Снаружи');
        locationSelect.appendChild(insideOption);
        locationSelect.appendChild(outsideOption);
        locationSelect.value = params.inside ?? true ? 'inside' : 'outside';
        locationSelect.addEventListener('change', () => {
          model.params.inside = locationSelect.value === 'inside';
          updateAll();
        });
        header.appendChild(locationSelect);
        break;

      case 'affliction':
        const affInput = document.createElement('input');
        affInput.type = 'text';
        affInput.className = 'aff-field';
        affInput.value = params.affliction || 'bleeding';
        affInput.placeholder = 'bleeding';
        affInput.addEventListener('change', () => {
          model.params.affliction = affInput.value.trim();
          updateAll();
        });
        header.appendChild(affInput);

        const strengthInput = document.createElement('input');
        strengthInput.type = 'number';
        strengthInput.value = params.strength ?? 15;
        strengthInput.className = 'strength-field';
        strengthInput.style.width = '60px';
        strengthInput.addEventListener('change', () => {
          model.params.strength = parseFloat(strengthInput.value);
          updateAll();
        });
        header.appendChild(strengthInput);

        const targetSelect = document.createElement('select');
        targetSelect.className = 'target-field';
        const targets = [
          { value: 'character', text: loc('targetCharacter', 'Персонаж') },
          { value: 'randomcrew', text: loc('targetRandomCrew', 'Случайный член экипажа') },
          { value: 'allcrew', text: loc('targetAllCrew', 'Весь экипаж') }
        ];
        targets.forEach(t => {
          const opt = document.createElement('option');
          opt.value = t.value;
          opt.textContent = t.text;
          if (t.value === (params.target || 'character')) opt.selected = true;
          targetSelect.appendChild(opt);
        });
        targetSelect.addEventListener('change', () => {
          model.params.target = targetSelect.value;
          updateAll();
        });
        header.appendChild(targetSelect);
        break;
    }
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
      { text: loc('addRNG', '+ ГСЧ'), type: 'rng' },
      { text: loc('addItem', '+ Предмет'), type: 'spawn' },
      { text: loc('addCreature', '+ Существо'), type: 'creature' },
      { text: loc('addAffliction', '+ Аффикшен'), type: 'affliction' }
    ];

    actions.forEach(a => {
      const btn = document.createElement('button');
      btn.className = 'small';
      btn.textContent = a.text;
      btn.dataset.branch = suffix;
      btn.dataset.parentId = id;
      btn.dataset.nodeType = a.type;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const parentModel = window.editorState.findNodeById(id);
        if (parentModel && parentModel.type === 'rng') {
          const branch = suffix === '-s' ? 'success' : 'failure';
          const newModel = nodeFactory['createModel' + a.type.charAt(0).toUpperCase() + a.type.slice(1)]();
          parentModel.children[branch].push(newModel);
          window.editorState.renderCurrentEvent();
        }
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

  attachCommonBehaviors(node, model) {
    const header = node.querySelector('.header-node');
    if (header) {
      header.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        node.classList.toggle('collapsed');
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
      updateAll();
    };

    header.addEventListener('mousedown', startDrag);
  }
}

// Глобальный экземпляр
const nodeFactory = new NodeFactory();

// Глобальные функции добавления корневых узлов
window.addRNG = () => {
  const newModel = nodeFactory.createModelRNG();
  window.editorState.events[window.editorState.currentEventIndex].model.push(newModel);
  window.editorState.renderCurrentEvent();
};

window.addSpawn = () => {
  const newModel = nodeFactory.createModelSpawn();
  window.editorState.events[window.editorState.currentEventIndex].model.push(newModel);
  window.editorState.renderCurrentEvent();
};

window.addCreature = () => {
  const newModel = nodeFactory.createModelCreature();
  window.editorState.events[window.editorState.currentEventIndex].model.push(newModel);
  window.editorState.renderCurrentEvent();
};

window.addAffliction = () => {
  const newModel = nodeFactory.createModelAffliction();
  window.editorState.events[window.editorState.currentEventIndex].model.push(newModel);
  window.editorState.renderCurrentEvent();
};

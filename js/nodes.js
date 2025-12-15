// js/nodes.js — v0.9.401 — ПОЛНАЯ ДЕКОМПОЗИЦИЯ, ДЕЛЕГИРОВАНИЕ, КОНСТАНТЫ, КОЛБЭКИ

const NODES_VERSION = "v0.9.401";
window.NODES_VERSION = NODES_VERSION;

// === КОНСТАНТЫ ===
const GRID_SIZE = 30;

const CLASS_NAMES = {
  NODE: 'node',
  DRAGGABLE: 'draggable',
  HEADER: 'header-node',
  CHILDREN: 'children',
  PROB: 'prob',
  FINAL_CHANCE: 'final-chance',
  SUCCESS_LABEL: 'success-label',
  FAILURE_LABEL: 'failure-label',
  SMALL_BTN: 'small',
  DANGER_SMALL: 'danger small'
};

const DATA_ATTR = {
  ACTION: 'data-action',
  ID: 'data-id',
  TYPE: 'data-type',
  PARENT_ID: 'data-parent-id',
  BRANCH: 'data-branch',
  NODE_TYPE: 'data-node-type'
};

const LOC_KEYS = {
  SUCCESS_LABEL: 'successLabel',
  FAILURE_LABEL: 'failureLabel',
  RNG_ACTION: 'rngAction',
  SPAWN_ITEM: 'spawnItem',
  SPAWN_CREATURE: 'spawnCreature',
  APPLY_AFFLICTION: 'applyAffliction',
  UNKNOWN_NODE: 'unknownNode',
  ADD_RNG: 'addRNG',
  ADD_ITEM: 'addItem',
  ADD_CREATURE: 'addCreature',
  ADD_AFFLICTION: 'addAffliction',
  ITEM_PLACEHOLDER: 'itemPlaceholder',
  CREATURE_PLACEHOLDER: 'creaturePlaceholder',
  AFFLICTION_PLACEHOLDER: 'afflictionPlaceholder',
  RANDOMIZE_POSITION: 'randomizePosition',
  INSIDE_SUB: 'insideSub',
  OUTSIDE_SUB: 'outsideSub',
  TARGET_CHARACTER: 'targetCharacter',
  TARGET_RANDOM_CREW: 'targetRandomCrew',
  TARGET_ALL_CREW: 'targetAllCrew'
};

class NodeFactory {
  constructor(dependencies = {}) {
    this.idCounter = 0;
    // Зависимости для полной развязки
    this.removeNode = dependencies.removeNode || (() => console.warn('removeNode not provided'));
    this.onParamChange = dependencies.onParamChange || (() => console.warn('onParamChange not provided'));
    this.render = dependencies.render || (() => console.warn('render not provided'));
  }

  generateId() {
    return this.idCounter++;
  }

  // === СОЗДАНИЕ МОДЕЛИ УЗЛА ===
  createModel(type, params = {}) {
    const id = this.generateId();
    const base = { id, type, params };

    if (type === 'rng') {
      return {
        ...base,
        children: { success: [], failure: [] }
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

  // === ОСНОВНАЯ ФУНКЦИЯ РЕНДЕРА ===
  createFromModel(model) {
    if (!model || !model.type) {
      console.warn('Invalid model', model);
      return document.createElement('div');
    }

    const node = document.createElement('div');
    node.className = `${CLASS_NAMES.NODE} ${model.type} ${CLASS_NAMES.DRAGGABLE}`;
    node.dataset.id = model.id;
    node.dataset.type = model.type;

    const header = this.createHeader(model);
    node.appendChild(header);

    if (model.type === 'rng' && model.children) {
      const successSection = this.createBranch(model.id, '-s', CLASS_NAMES.SUCCESS_LABEL, loc(LOC_KEYS.SUCCESS_LABEL));
      const failureSection = this.createBranch(model.id, '-f', CLASS_NAMES.FAILURE_LABEL, loc(LOC_KEYS.FAILURE_LABEL));

      const successContainer = successSection.querySelector(`#c-${model.id}-s`);
      const failureContainer = failureSection.querySelector(`#c-${model.id}-f`);

      (model.children.success || []).forEach(child => {
        if (child) successContainer.appendChild(this.createFromModel(child));
      });

      (model.children.failure || []).forEach(child => {
        if (child) failureContainer.appendChild(this.createFromModel(child));
      });

      node.appendChild(successSection);
      node.appendChild(failureSection);
    }

    this.attachCommonBehaviors(node, model);
    return node;
  }

  // === ЗАГОЛОВОК УЗЛА ===
  createHeader(model) {
    const header = document.createElement('div');
    header.className = CLASS_NAMES.HEADER;

    const title = document.createElement('span');
    title.textContent = this.getTitle(model);
    header.appendChild(title);

    this.appendTypeSpecificControls(header, model);

    // Кнопка удаления (делегирование через data-action)
    const deleteBtn = document.createElement('button');
    deleteBtn.className = CLASS_NAMES.DANGER_SMALL;
    deleteBtn.textContent = '×';
    deleteBtn.dataset.action = 'removeNode';
    deleteBtn.dataset.id = model.id;
    header.appendChild(deleteBtn);

    // Вероятности (заглушка, будет обновляться через selective update)
    const prob = document.createElement('span');
    prob.className = CLASS_NAMES.PROB;
    prob.innerHTML = '<span class="global">0.000%</span><br><small class="local">100.0%</small>';
    header.appendChild(prob);

    const finalChance = document.createElement('span');
    finalChance.className = CLASS_NAMES.FINAL_CHANCE;
    finalChance.style.marginLeft = '10px';
    finalChance.style.color = '#888';
    header.appendChild(finalChance);

    return header;
  }

  getTitle(model) {
    const titles = {
      rng: loc(LOC_KEYS.RNG_ACTION),
      spawn: loc(LOC_KEYS.SPAWN_ITEM),
      creature: loc(LOC_KEYS.SPAWN_CREATURE),
      affliction: loc(LOC_KEYS.APPLY_AFFLICTION)
    };
    return titles[model.type] || loc(LOC_KEYS.UNKNOWN_NODE);
  }

  // === ТИПОСПЕЦИФИЧНЫЕ КОНТРОЛЫ ===
  appendTypeSpecificControls(header, model) {
    const controls = {
      rng: () => this.createRNGControls(header, model.params),
      spawn: () => this.createSpawnControls(header, model.params),
      creature: () => this.createCreatureControls(header, model.params),
      affliction: () => this.createAfflictionControls(header, model.params)
    };

    const fn = controls[model.type];
    if (fn) fn();
  }

  createRNGControls(header, params) {
    this.createNumberInput(header, params, 'chance', 0, 1, 0.001, 0.5, 'chance');
  }

  createSpawnControls(header, params) {
    this.createTextInput(header, params, 'item', 'revolver', 'item-field', LOC_KEYS.ITEM_PLACEHOLDER);
  }

  createCreatureControls(header, params) {
    this.createTextInput(header, params, 'creature', 'crawler', 'creature-field', LOC_KEYS.CREATURE_PLACEHOLDER);
    this.createNumberInput(header, params, 'count', 1, null, 1, 1, 'count-field', '60px');
    this.createLabeledCheckbox(header, params, 'randomize', true, loc(LOC_KEYS.RANDOMIZE_POSITION));
    this.createLocationSelect(header, params);
  }

  createAfflictionControls(header, params) {
    this.createTextInput(header, params, 'affliction', 'bleeding', 'aff-field', LOC_KEYS.AFFLICTION_PLACEHOLDER);
    this.createNumberInput(header, params, 'strength', 0, null, 1, 15, 'strength-field', '60px');
    this.createTargetSelect(header, params);
  }

  // === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ДЛЯ КОНТРОЛОВ ===
  createTextInput(header, params, key, defaultValue, className, placeholderKey) {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = className;
    input.list = 'item-datalist';
    input.value = params[key] || defaultValue;
    input.placeholder = loc(placeholderKey);
    input.dataset.action = 'updateParam';
    input.dataset.key = key;
    input.dataset.id = params.id || ''; // будет установлен позже
    header.appendChild(input);
  }

  createNumberInput(header, params, key, min, max, step, defaultValue, className, width = null) {
    const input = document.createElement('input');
    input.type = 'number';
    input.min = min;
    if (max !== null) input.max = max;
    input.step = step;
    input.value = params[key] ?? defaultValue;
    input.className = className;
    if (width) input.style.width = width;
    input.dataset.action = 'updateParam';
    input.dataset.key = key;
    input.dataset.id = params.id || '';
    header.appendChild(input);
  }

  createLabeledCheckbox(header, params, key, defaultValue, labelText) {
    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = params[key] ?? defaultValue;
    checkbox.dataset.action = 'updateParam';
    checkbox.dataset.key = key;
    checkbox.dataset.id = params.id || '';
    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(labelText));
    header.appendChild(label);
  }

  createLocationSelect(header, params) {
    const select = document.createElement('select');
    select.className = 'location-field';

    const inside = document.createElement('option');
    inside.value = 'inside';
    inside.textContent = loc(LOC_KEYS.INSIDE_SUB);

    const outside = document.createElement('option');
    outside.value = 'outside';
    outside.textContent = loc(LOC_KEYS.OUTSIDE_SUB);

    select.appendChild(inside);
    select.appendChild(outside);
    select.value = params.inside ?? true ? 'inside' : 'outside';
    select.dataset.action = 'updateParam';
    select.dataset.key = 'inside';
    select.dataset.id = params.id || '';
    header.appendChild(select);
  }

  createTargetSelect(header, params) {
    const select = document.createElement('select');
    select.className = 'target-field';

    const targets = [
      { value: 'character', key: LOC_KEYS.TARGET_CHARACTER },
      { value: 'randomcrew', key: LOC_KEYS.TARGET_RANDOM_CREW },
      { value: 'allcrew', key: LOC_KEYS.TARGET_ALL_CREW }
    ];

    targets.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.value;
      opt.textContent = loc(t.key);
      if (t.value === (params.target || 'character')) opt.selected = true;
      select.appendChild(opt);
    });

    select.dataset.action = 'updateParam';
    select.dataset.key = 'target';
    select.dataset.id = params.id || '';
    header.appendChild(select);
  }

  // === ВЕТКИ RNG ===
  createBranch(id, suffix, labelClass, labelText) {
    const section = document.createElement('div');
    section.className = CLASS_NAMES.CHILDREN;

    const label = document.createElement('div');
    label.className = labelClass;
    label.textContent = labelText;

    const buttons = document.createElement('div');
    buttons.style.cssText = 'margin:6px 0;display:flex;gap:6px;flex-wrap:wrap;';

    const actions = [
      { text: loc(LOC_KEYS.ADD_RNG), type: 'rng' },
      { text: loc(LOC_KEYS.ADD_ITEM), type: 'spawn' },
      { text: loc(LOC_KEYS.ADD_CREATURE), type: 'creature' },
      { text: loc(LOC_KEYS.ADD_AFFLICTION), type: 'affliction' }
    ];

    actions.forEach(a => {
      const btn = document.createElement('button');
      btn.className = CLASS_NAMES.SMALL_BTN;
      btn.textContent = a.text;
      btn.dataset.action = 'addNodeToBranch';
      btn.dataset.parentId = id;
      btn.dataset.branch = suffix === '-s' ? 'success' : 'failure';
      btn.dataset.nodeType = a.type;
      buttons.appendChild(btn);
    });

    const container = document.createElement('div');
    container.id = `c-${id}${suffix}`;

    section.appendChild(label);
    section.appendChild(buttons);
    section.appendChild(container);

    return section;
  }

  // === ОБЩИЕ ПОВЕДЕНИЯ (ТОЛЬКО DRAG&DROP) ===
  attachCommonBehaviors(node, model) {
    const header = node.querySelector(`.${CLASS_NAMES.HEADER}`);
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
      this.onParamChange();
    };

    header.addEventListener('mousedown', startDrag);
  }
}

// Глобальный экземпляр с зависимостями
const nodeFactory = new NodeFactory();

// Глобальные функции добавления в корень (временные)
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

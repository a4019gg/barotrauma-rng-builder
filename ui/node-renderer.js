import { t } from './localization.js';
import { createIcon } from './icon-component.js';
import { formatChanceForInput } from './chance-utils.js';

const TITLES = {
  rng: 'RNG',
  spawn: 'Item',
  creature: 'Creature',
  affliction: 'Affliction'
};

function createParamInput(nodeId, key, value, type = 'text', step = null) {
  const input = document.createElement('input');
  input.type = type;
  input.value = value ?? '';
  if (step != null) input.step = String(step);
  input.dataset.action = 'updateParam';
  input.dataset.id = String(nodeId);
  input.dataset.key = key;
  return input;
}

function createParamSelect(nodeId, key, value, options) {
  const select = document.createElement('select');
  options.forEach(({ value: optValue, label }) => {
    const option = document.createElement('option');
    option.value = optValue;
    option.textContent = label;
    if (String(optValue) === String(value)) option.selected = true;
    select.appendChild(option);
  });

  select.dataset.action = 'updateParam';
  select.dataset.id = String(nodeId);
  select.dataset.key = key;
  return select;
}

function createNodeControls(model) {
  const body = document.createElement('div');
  body.className = 'node-body';

  if (model.type === 'rng') {
    const row = document.createElement('label');
    row.textContent = 'Chance';
    const chanceInput = createParamInput(model.id, 'chance', formatChanceForInput(model.params.chance), 'text');
    chanceInput.inputMode = 'decimal';
    row.appendChild(chanceInput);
    body.appendChild(row);
  }

  if (model.type === 'spawn') {
    const rowItem = document.createElement('label');
    rowItem.textContent = 'Identifier';
    rowItem.appendChild(createParamInput(model.id, 'item', model.params.item));

    const rowAmount = document.createElement('label');
    rowAmount.textContent = 'Amount';
    rowAmount.appendChild(createParamInput(model.id, 'amount', model.params.amount, 'number', 1));

    const rowQuality = document.createElement('label');
    rowQuality.textContent = 'Quality';
    rowQuality.appendChild(createParamInput(model.id, 'quality', model.params.quality, 'number', 1));

    body.append(rowItem, rowAmount, rowQuality);
  }

  if (model.type === 'creature') {
    const rowCreature = document.createElement('label');
    rowCreature.textContent = 'Identifier';
    rowCreature.appendChild(createParamInput(model.id, 'creature', model.params.creature));

    const rowCount = document.createElement('label');
    rowCount.textContent = 'Count';
    rowCount.appendChild(createParamInput(model.id, 'count', model.params.count, 'number', 1));

    const rowLocation = document.createElement('label');
    rowLocation.textContent = 'Spawn location';
    rowLocation.appendChild(
      createParamSelect(model.id, 'spawnLocation', model.params.spawnLocation, [
        { value: 'inside', label: 'inside' },
        { value: 'outside', label: 'outside' },
        { value: 'near', label: 'near' }
      ])
    );

    body.append(rowCreature, rowCount, rowLocation);
  }

  if (model.type === 'affliction') {
    const rowAffliction = document.createElement('label');
    rowAffliction.textContent = 'Identifier';
    rowAffliction.appendChild(createParamInput(model.id, 'affliction', model.params.affliction));

    const rowStrength = document.createElement('label');
    rowStrength.textContent = 'Strength';
    rowStrength.appendChild(createParamInput(model.id, 'strength', model.params.strength, 'number', 0.1));

    body.append(rowAffliction, rowStrength);
  }

  return body;
}

function createBranch(model, branch, renderer) {
  const section = document.createElement('div');
  section.className = `node-branch ${branch}`;

  const title = document.createElement('div');
  title.className = 'node-branch-title';
  title.textContent = branch === 'success' ? 'Success' : 'Failure';

  const addButtons = document.createElement('div');
  addButtons.className = 'node-branch-actions';
  ['rng', 'spawn', 'creature', 'affliction'].forEach(type => {
    const btn = document.createElement('button');
    btn.textContent = `+ ${TITLES[type]}`;
    btn.dataset.action = 'addChildNode';
    btn.dataset.parentId = String(model.id);
    btn.dataset.branch = branch;
    btn.dataset.type = type;
    addButtons.appendChild(btn);
  });

  const children = document.createElement('div');
  children.className = 'node-children';
  model.children[branch].forEach(child => children.appendChild(renderer(child)));

  section.append(title, addButtons, children);
  return section;
}

export function renderNode(model) {
  const node = document.createElement('article');
  node.className = `node node-${model.type}`;
  node.dataset.id = String(model.id);

  const header = document.createElement('div');
  header.className = 'node-header';

  const title = document.createElement('strong');
  title.textContent = TITLES[model.type] ?? model.type;

  const removeBtn = document.createElement('button');
  removeBtn.className = 'danger button-with-icon';
  removeBtn.append(createIcon('trash'));

  const removeLabel = document.createElement('span');
  removeLabel.textContent = t('removeNode');
  removeBtn.append(removeLabel);

  removeBtn.dataset.action = 'removeNode';
  removeBtn.dataset.id = String(model.id);

  header.append(title, removeBtn);
  node.append(header, createNodeControls(model));

  if (model.type === 'rng') {
    node.append(createBranch(model, 'success', renderNode), createBranch(model, 'failure', renderNode));
  }

  return node;
}

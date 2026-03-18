import { t } from './localization.js';
import { createIcon } from './icon-component.js';
import { formatChanceForInput } from './chance-utils.js';
import { getAppSetting } from '../state/app-settings.js';
import { canNodeAcceptChildren, findRngBranch, getAllowedNodeTypes, getModeDefinition, isContainerNode, isRngNode } from '../core/graph-utils.js';

const TITLES = {
  rng: 'RNG',
  event: 'Event',
  eventSet: 'EventSet',
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

function createCheckbox(nodeId, key, checked) {
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = !!checked;
  input.dataset.action = 'updateParam';
  input.dataset.id = String(nodeId);
  input.dataset.key = key;
  input.dataset.valueType = 'boolean';
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

function createLabeledControl(labelText, control) {
  const row = document.createElement('label');
  row.textContent = labelText;
  row.appendChild(control);
  return row;
}

function createNodeControls(model, editorMode) {
  const body = document.createElement('div');
  body.className = 'node-body';

  if (model.type === 'rng') {
    const modeSelect = createParamSelect(model.id, 'mode', model.params.mode || 'probability', [
      { value: 'probability', label: 'Probability' },
      { value: 'weight', label: 'Weight' }
    ]);
    modeSelect.disabled = editorMode === 'basic';
    body.appendChild(createLabeledControl('Mode', modeSelect));

    if ((model.params.mode || 'probability') === 'probability' && (model.branches?.length || 0) === 2 && editorMode === 'basic') {
      const chanceInput = createParamInput(model.id, 'chance', formatChanceForInput(model.params.chance), 'text');
      chanceInput.inputMode = 'decimal';
      body.appendChild(createLabeledControl('Chance', chanceInput));
    }
  }

  if (model.type === 'event') {
    body.appendChild(createLabeledControl('Identifier', createParamInput(model.id, 'identifier', model.params.identifier)));
  }

  if (model.type === 'eventSet') {
    [
      ['identifier', 'Identifier', 'text'],
      ['eventcount', 'Event count', 'number'],
      ['commonness', 'Commonness', 'number'],
      ['minintensity', 'Min intensity', 'number'],
      ['maxintensity', 'Max intensity', 'number'],
      ['minleveldifficulty', 'Min difficulty', 'number'],
      ['maxleveldifficulty', 'Max difficulty', 'number'],
      ['triggereventcooldown', 'Trigger cooldown', 'number']
    ].forEach(([key, label, type]) => body.appendChild(createLabeledControl(label, createParamInput(model.id, key, model.params[key], type, type === 'number' ? 1 : null))));

    ['chooserandom', 'allowatstart', 'perwreck', 'perruin', 'percave', 'ignorecooldown'].forEach(key => {
      const checkboxRow = document.createElement('label');
      checkboxRow.className = 'checkbox-row';
      checkboxRow.append(createCheckbox(model.id, key, model.params[key]), document.createTextNode(key));
      body.appendChild(checkboxRow);
    });
  }

  if (model.type === 'spawn') {
    body.append(
      createLabeledControl('Identifier', createParamInput(model.id, 'item', model.params.item)),
      createLabeledControl('Amount', createParamInput(model.id, 'amount', model.params.amount, 'number', 1)),
      createLabeledControl('Quality', createParamInput(model.id, 'quality', model.params.quality, 'number', 1))
    );
  }

  if (model.type === 'creature') {
    body.append(
      createLabeledControl('Identifier', createParamInput(model.id, 'creature', model.params.creature)),
      createLabeledControl('Count', createParamInput(model.id, 'count', model.params.count, 'number', 1)),
      createLabeledControl('Spawn location', createParamSelect(model.id, 'spawnLocation', model.params.spawnLocation, [
        { value: 'inside', label: 'inside' },
        { value: 'outside', label: 'outside' },
        { value: 'near', label: 'near' }
      ]))
    );
  }

  if (model.type === 'affliction') {
    body.append(
      createLabeledControl('Identifier', createParamInput(model.id, 'affliction', model.params.affliction)),
      createLabeledControl('Strength', createParamInput(model.id, 'strength', model.params.strength, 'number', 0.1))
    );
  }

  return body;
}

function createAddButtons(parentId, branchId = null) {
  const mode = getAppSetting('editorMode') || 'basic';
  const addButtons = document.createElement('div');
  addButtons.className = 'node-branch-actions';
  getAllowedNodeTypes(mode).forEach(type => {
    const btn = document.createElement('button');
    btn.textContent = `+ ${TITLES[type]}`;
    btn.dataset.action = 'addChildNode';
    btn.dataset.parentId = String(parentId);
    if (branchId) btn.dataset.branch = branchId;
    btn.dataset.type = type;
    addButtons.appendChild(btn);
  });
  return addButtons;
}

function createBranch(model, branch, renderer, editorMode) {
  const section = document.createElement('div');
  section.className = `node-branch ${branch.id}`;

  const title = document.createElement('div');
  title.className = 'node-branch-title';
  title.textContent = branch.label || branch.id;

  if (editorMode !== 'basic') {
    const branchMeta = document.createElement('div');
    branchMeta.className = 'node-branch-meta';

    const labelInput = createParamInput(model.id, `branch:${branch.id}:label`, branch.label || '', 'text');
    labelInput.dataset.action = 'updateBranch';
    labelInput.dataset.branchId = branch.id;
    labelInput.dataset.key = 'label';

    const valueInput = createParamInput(model.id, `branch:${branch.id}:value`, formatChanceForInput(branch.value ?? 0), 'text');
    valueInput.inputMode = 'decimal';
    valueInput.dataset.action = 'updateBranch';
    valueInput.dataset.branchId = branch.id;
    valueInput.dataset.key = 'value';

    branchMeta.append(createLabeledControl('Label', labelInput));
    branchMeta.append(createLabeledControl(model.params.mode === 'weight' ? 'Weight' : 'Value', valueInput));

    if ((model.branches?.length || 0) > 2) {
      const removeBtn = document.createElement('button');
      removeBtn.textContent = 'Remove branch';
      removeBtn.dataset.action = 'removeRngBranch';
      removeBtn.dataset.id = String(model.id);
      removeBtn.dataset.branchId = branch.id;
      branchMeta.append(removeBtn);
    }

    section.append(branchMeta);
  }

  const children = document.createElement('div');
  children.className = 'node-children';
  branch.children.forEach(child => children.appendChild(renderer(child, editorMode)));

  section.append(title);
  if (editorMode !== 'basic') section.append(createAddButtons(model.id, branch.id));
  section.append(children);
  return section;
}

function createContainerChildren(model, renderer, editorMode) {
  const section = document.createElement('div');
  section.className = 'node-branch node-branch-container';
  const title = document.createElement('div');
  title.className = 'node-branch-title';
  title.textContent = 'Children';
  const children = document.createElement('div');
  children.className = 'node-children';
  (model.children || []).forEach(child => children.appendChild(renderer(child, editorMode)));
  section.append(title);
  if (editorMode !== 'basic') section.append(createAddButtons(model.id));
  section.append(children);
  return section;
}

export function renderNode(model, editorMode = getAppSetting('editorMode') || 'basic') {
  const node = document.createElement('article');
  node.className = `node node-${model.type}`;
  node.dataset.id = String(model.id);

  const header = document.createElement('div');
  header.className = 'node-header';

  const title = document.createElement('strong');
  title.textContent = TITLES[model.type] ?? model.type;
  if (model.type === 'affliction') {
    const label = title.textContent;
    title.textContent = '';
    title.append(createIcon('alert-triangle'));
    title.append(` ${label}`);
  }

  const removeBtn = document.createElement('button');
  removeBtn.className = 'danger button-with-icon';
  removeBtn.append(createIcon('trash'));
  const removeLabel = document.createElement('span');
  removeLabel.textContent = t('removeNode');
  removeBtn.append(removeLabel);
  removeBtn.dataset.action = 'removeNode';
  removeBtn.dataset.id = String(model.id);

  header.append(title, removeBtn);
  node.append(header, createNodeControls(model, editorMode));

  if (isRngNode(model)) {
    (model.branches || []).forEach(branch => node.append(createBranch(model, branch, renderNode, editorMode)));
    const modeDef = getModeDefinition(editorMode);
    if ((model.branches?.length || 0) < modeDef.maxRngBranches) {
      const addBranchBtn = document.createElement('button');
      addBranchBtn.textContent = '+ Branch';
      addBranchBtn.dataset.action = 'addRngBranch';
      addBranchBtn.dataset.id = String(model.id);
      node.append(addBranchBtn);
    }
  }

  if (isContainerNode(model) && canNodeAcceptChildren(model, editorMode)) {
    node.append(createContainerChildren(model, renderNode, editorMode));
  }

  return node;
}

import { t } from './localization.js';
import { createIcon } from './icon-component.js';
import { formatChanceForInput } from './chance-utils.js';
import { getAppSetting } from '../state/app-settings.js';
import { setTooltip } from './tooltip.js';
import { canNodeAcceptChildren, getAllowedNodeTypes, getModeDefinition, isContainerNode, isRngNode } from '../core/graph-utils.js';

const TITLES = {
  rng: 'RNG',
  event: 'Event',
  eventSet: 'EventSet',
  spawn: 'Item',
  creature: 'Creature',
  affliction: 'Affliction'
};

const TOOLTIPS = {
  rng: {
    header: 'Random branch selector with configurable probabilities.',
    mode: 'Choose whether branches use direct probability or relative weight.',
    chance: 'Probability of this branch being selected (0–1 or % depending on mode).',
    addBranch: 'Add new outcome branch.'
  },
  event: {
    header: 'Event wrapper that groups event actions and nested logic.',
    identifier: 'Unique identifier for this event.'
  },
  eventSet: {
    header: 'Event set container with conditions and trigger behavior.',
    identifier: 'Unique identifier for this event set.',
    eventcount: 'How many events are selected when chooserandom is enabled.',
    commonness: 'Relative weight when choosing between multiple event sets.',
    minintensity: 'Required intensity range for activation.',
    maxintensity: 'Required intensity range for activation.',
    minleveldifficulty: 'Level difficulty range (0–100).',
    maxleveldifficulty: 'Level difficulty range (0–100).',
    chooserandom: 'Pick a random subset of events instead of running all children.',
    allowatstart: 'Allow triggering at level start.',
    perwreck: 'Apply this event set per wreck instance.',
    perruin: 'Apply this event set per ruin instance.',
    percave: 'Apply this event set per cave instance.',
    ignorecooldown: 'Ignore global event cooldown.',
    triggereventcooldown: 'Trigger cooldown after this event set runs.'
  },
  spawn: {
    header: 'Spawn item action.',
    item: 'Identifier of the spawned item.',
    amount: 'How many items to spawn.',
    quality: 'Item quality value applied on spawn.'
  },
  creature: {
    header: 'Spawn creature action.',
    creature: 'Identifier of the spawned creature.',
    count: 'How many creatures to spawn.',
    spawnLocation: 'Where the creature should appear.'
  },
  affliction: {
    header: 'Apply affliction action.',
    affliction: 'Identifier of the applied affliction.',
    strength: 'Strength applied to the affliction.'
  },
  general: {
    removeNode: 'Remove this node.',
    children: 'Child nodes contained by this node.',
    addNode: {
      rng: 'Add random branching logic.',
      event: 'Add event (defines what happens).',
      eventSet: 'Add nested event set (advanced use).',
      spawn: 'Add item action.',
      creature: 'Add creature action.',
      affliction: 'Add affliction action.'
    },
    branchLabel: 'Short branch label shown in advanced editing mode.',
    branchValue: 'Branch probability or weight value.',
    removeBranch: 'Remove this outcome branch.',
    branchTitle: 'Outcome branch for this RNG node.'
  }
};

function applyControlTooltip(control, message) {
  return setTooltip(control, message);
}

function createParamInput(nodeId, key, value, type = 'text', step = null, tooltip = '') {
  const input = document.createElement('input');
  input.type = type;
  input.value = value ?? '';
  if (step != null) input.step = String(step);
  input.dataset.action = 'updateParam';
  input.dataset.id = String(nodeId);
  input.dataset.key = key;
  applyControlTooltip(input, tooltip);
  return input;
}

function createCheckbox(nodeId, key, checked, tooltip = '') {
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = !!checked;
  input.dataset.action = 'updateParam';
  input.dataset.id = String(nodeId);
  input.dataset.key = key;
  input.dataset.valueType = 'boolean';
  applyControlTooltip(input, tooltip);
  return input;
}

function createParamSelect(nodeId, key, value, options, tooltip = '') {
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
  applyControlTooltip(select, tooltip);
  return select;
}

function createLabeledControl(labelText, control, tooltip = '') {
  const row = document.createElement('label');
  row.className = 'node-control';
  applyControlTooltip(row, tooltip);

  const label = document.createElement('span');
  label.className = 'node-label';
  label.textContent = labelText;
  applyControlTooltip(label, tooltip);

  row.append(label, control);
  return row;
}

function createCheckboxControl(nodeId, key, labelText, checked, tooltip) {
  const row = document.createElement('label');
  row.className = 'checkbox-row node-checkbox';
  const input = createCheckbox(nodeId, key, checked, tooltip);
  const text = document.createElement('span');
  text.textContent = labelText;
  applyControlTooltip(text, tooltip);
  applyControlTooltip(row, tooltip);
  row.append(input, text);
  return row;
}

function createSection(title, fields, { collapsible = false, open = true } = {}) {
  const wrapper = collapsible ? document.createElement('details') : document.createElement('section');
  wrapper.className = 'node-section';
  if (collapsible && open) wrapper.open = true;

  const heading = collapsible ? document.createElement('summary') : document.createElement('div');
  heading.className = 'node-section-title';
  heading.textContent = title;
  wrapper.appendChild(heading);

  const content = document.createElement('div');
  content.className = 'node-section-grid';
  fields.forEach(field => content.appendChild(field));
  wrapper.appendChild(content);
  return wrapper;
}

function createNodeControls(model, editorMode) {
  const body = document.createElement('div');
  body.className = 'node-body';

  if (model.type === 'rng') {
    const modeSelect = createParamSelect(model.id, 'mode', model.params.mode || 'probability', [
      { value: 'probability', label: 'Probability' },
      { value: 'weight', label: 'Weight' }
    ], TOOLTIPS.rng.mode);
    modeSelect.disabled = editorMode === 'basic';
    body.appendChild(createLabeledControl('Mode', modeSelect, TOOLTIPS.rng.mode));

    if ((model.params.mode || 'probability') === 'probability' && (model.branches?.length || 0) === 2 && editorMode === 'basic') {
      const chanceInput = createParamInput(model.id, 'chance', formatChanceForInput(model.params.chance), 'text', null, TOOLTIPS.rng.chance);
      chanceInput.inputMode = 'decimal';
      body.appendChild(createLabeledControl('Chance', chanceInput, TOOLTIPS.rng.chance));
    }
  }

  if (model.type === 'event') {
    body.appendChild(createLabeledControl('Identifier', createParamInput(model.id, 'identifier', model.params.identifier, 'text', null, TOOLTIPS.event.identifier), TOOLTIPS.event.identifier));
  }

  if (model.type === 'eventSet') {
    const identityFields = [
      createLabeledControl('Identifier', createParamInput(model.id, 'identifier', model.params.identifier, 'text', null, TOOLTIPS.eventSet.identifier), TOOLTIPS.eventSet.identifier),
      createLabeledControl('Commonness', createParamInput(model.id, 'commonness', model.params.commonness, 'number', 1, TOOLTIPS.eventSet.commonness), TOOLTIPS.eventSet.commonness),
      createLabeledControl('Event count', createParamInput(model.id, 'eventcount', model.params.eventcount, 'number', 1, TOOLTIPS.eventSet.eventcount), TOOLTIPS.eventSet.eventcount),
      createCheckboxControl(model.id, 'chooserandom', 'Choose random', model.params.chooserandom, TOOLTIPS.eventSet.chooserandom)
    ];

    const conditionFields = [
      createLabeledControl('Min intensity', createParamInput(model.id, 'minintensity', model.params.minintensity, 'number', 1, TOOLTIPS.eventSet.minintensity), TOOLTIPS.eventSet.minintensity),
      createLabeledControl('Max intensity', createParamInput(model.id, 'maxintensity', model.params.maxintensity, 'number', 1, TOOLTIPS.eventSet.maxintensity), TOOLTIPS.eventSet.maxintensity),
      createLabeledControl('Min difficulty', createParamInput(model.id, 'minleveldifficulty', model.params.minleveldifficulty, 'number', 1, TOOLTIPS.eventSet.minleveldifficulty), TOOLTIPS.eventSet.minleveldifficulty),
      createLabeledControl('Max difficulty', createParamInput(model.id, 'maxleveldifficulty', model.params.maxleveldifficulty, 'number', 1, TOOLTIPS.eventSet.maxleveldifficulty), TOOLTIPS.eventSet.maxleveldifficulty)
    ];

    const behaviorFields = [
      createCheckboxControl(model.id, 'allowatstart', 'Allow at start', model.params.allowatstart, TOOLTIPS.eventSet.allowatstart),
      createCheckboxControl(model.id, 'perwreck', 'Per wreck', model.params.perwreck, TOOLTIPS.eventSet.perwreck),
      createCheckboxControl(model.id, 'perruin', 'Per ruin', model.params.perruin, TOOLTIPS.eventSet.perruin),
      createCheckboxControl(model.id, 'percave', 'Per cave', model.params.percave, TOOLTIPS.eventSet.percave),
      createCheckboxControl(model.id, 'ignorecooldown', 'Ignore cooldown', model.params.ignorecooldown, TOOLTIPS.eventSet.ignorecooldown),
      createLabeledControl('Trigger cooldown', createParamInput(model.id, 'triggereventcooldown', model.params.triggereventcooldown, 'number', 1, TOOLTIPS.eventSet.triggereventcooldown), TOOLTIPS.eventSet.triggereventcooldown)
    ];

    body.classList.add('node-body-stacked');
    body.append(
      createSection('Identity', identityFields),
      createSection('Conditions', conditionFields),
      createSection('Behavior', behaviorFields, { collapsible: editorMode === 'advanced', open: editorMode !== 'advanced' })
    );
  }

  if (model.type === 'spawn') {
    body.append(
      createLabeledControl('Identifier', createParamInput(model.id, 'item', model.params.item, 'text', null, TOOLTIPS.spawn.item), TOOLTIPS.spawn.item),
      createLabeledControl('Amount', createParamInput(model.id, 'amount', model.params.amount, 'number', 1, TOOLTIPS.spawn.amount), TOOLTIPS.spawn.amount),
      createLabeledControl('Quality', createParamInput(model.id, 'quality', model.params.quality, 'number', 1, TOOLTIPS.spawn.quality), TOOLTIPS.spawn.quality)
    );
  }

  if (model.type === 'creature') {
    body.append(
      createLabeledControl('Identifier', createParamInput(model.id, 'creature', model.params.creature, 'text', null, TOOLTIPS.creature.creature), TOOLTIPS.creature.creature),
      createLabeledControl('Count', createParamInput(model.id, 'count', model.params.count, 'number', 1, TOOLTIPS.creature.count), TOOLTIPS.creature.count),
      createLabeledControl('Spawn location', createParamSelect(model.id, 'spawnLocation', model.params.spawnLocation, [
        { value: 'inside', label: 'inside' },
        { value: 'outside', label: 'outside' },
        { value: 'near', label: 'near' }
      ], TOOLTIPS.creature.spawnLocation), TOOLTIPS.creature.spawnLocation)
    );
  }

  if (model.type === 'affliction') {
    body.append(
      createLabeledControl('Identifier', createParamInput(model.id, 'affliction', model.params.affliction, 'text', null, TOOLTIPS.affliction.affliction), TOOLTIPS.affliction.affliction),
      createLabeledControl('Strength', createParamInput(model.id, 'strength', model.params.strength, 'number', 0.1, TOOLTIPS.affliction.strength), TOOLTIPS.affliction.strength)
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
    setTooltip(btn, TOOLTIPS.general.addNode[type]);
    addButtons.appendChild(btn);
  });
  return addButtons;
}

function createBranch(model, branch, renderer, editorMode) {
  const section = document.createElement('div');
  section.className = `node-branch ${branch.id}`;
  setTooltip(section, TOOLTIPS.general.branchTitle);

  const title = document.createElement('div');
  title.className = 'node-branch-title';
  title.textContent = branch.label || branch.id;
  setTooltip(title, TOOLTIPS.general.branchTitle);

  if (editorMode !== 'basic') {
    const branchMeta = document.createElement('div');
    branchMeta.className = 'node-branch-meta';

    const labelInput = createParamInput(model.id, `branch:${branch.id}:label`, branch.label || '', 'text', null, TOOLTIPS.general.branchLabel);
    labelInput.dataset.action = 'updateBranch';
    labelInput.dataset.branchId = branch.id;
    labelInput.dataset.key = 'label';

    const valueInput = createParamInput(model.id, `branch:${branch.id}:value`, formatChanceForInput(branch.value ?? 0), 'text', null, TOOLTIPS.general.branchValue);
    valueInput.inputMode = 'decimal';
    valueInput.dataset.action = 'updateBranch';
    valueInput.dataset.branchId = branch.id;
    valueInput.dataset.key = 'value';

    branchMeta.append(createLabeledControl('Label', labelInput, TOOLTIPS.general.branchLabel));
    branchMeta.append(createLabeledControl(model.params.mode === 'weight' ? 'Weight' : 'Value', valueInput, TOOLTIPS.general.branchValue));

    if ((model.branches?.length || 0) > 2) {
      const removeBtn = document.createElement('button');
      removeBtn.textContent = 'Remove branch';
      removeBtn.dataset.action = 'removeRngBranch';
      removeBtn.dataset.id = String(model.id);
      removeBtn.dataset.branchId = branch.id;
      setTooltip(removeBtn, TOOLTIPS.general.removeBranch);
      branchMeta.append(removeBtn);
    }

    section.append(branchMeta);
  }

  const children = document.createElement('div');
  children.className = 'node-children';
  children.setAttribute('role', 'group');
  setTooltip(children, TOOLTIPS.general.children);
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
  setTooltip(title, TOOLTIPS.general.children);
  const children = document.createElement('div');
  children.className = 'node-children';
  setTooltip(children, TOOLTIPS.general.children);
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
  setTooltip(header, TOOLTIPS[model.type]?.header || `${TITLES[model.type] ?? model.type} node`);

  const title = document.createElement('strong');
  title.className = 'node-title-text';
  title.textContent = TITLES[model.type] ?? model.type;
  setTooltip(title, TOOLTIPS[model.type]?.header || `${TITLES[model.type] ?? model.type} node`);
  if (model.type === 'affliction') {
    const label = title.textContent;
    title.textContent = '';
    const icon = createIcon('alert-triangle');
    setTooltip(icon, TOOLTIPS.affliction.header);
    title.append(icon);
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
  setTooltip(removeBtn, TOOLTIPS.general.removeNode);

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
      setTooltip(addBranchBtn, TOOLTIPS.rng.addBranch);
      node.append(addBranchBtn);
    }
  }

  if (isContainerNode(model) && canNodeAcceptChildren(model, editorMode)) {
    node.append(createContainerChildren(model, renderNode, editorMode));
  }

  return node;
}

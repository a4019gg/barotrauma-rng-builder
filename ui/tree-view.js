import { createIcon } from './icon-component.js';
import { setTooltip } from './tooltip.js';
import { getNodeCollections, isContainerNode, isRngNode } from '../core/graph-utils.js';
import { normalizeRngBranchProbabilities } from '../core/rng.js';

const TYPE_LABELS = {
  rng: 'RNG',
  event: 'Event',
  eventSet: 'EventSet',
  spawn: 'Action',
  creature: 'Action',
  affliction: 'Action'
};

const TYPE_ICONS = {
  rng: 'sliders-horizontal',
  event: 'doc',
  eventSet: 'archive',
  spawn: 'box',
  creature: 'hashtag',
  affliction: 'alert-triangle'
};

const defaultCollapsed = new Set();
const userExpanded = new Set();
const userCollapsed = new Set();

function hasChildren(node) {
  if (isRngNode(node)) return (node.branches || []).some(branch => (branch.children || []).length > 0);
  return getNodeCollections(node).some(children => (children || []).length > 0);
}

function ensureDefaultCollapsed(model) {
  const seen = new Set();
  const walk = (nodes, depth = 0) => {
    nodes.forEach(node => {
      seen.add(node.id);
      if (depth >= 2 && hasChildren(node) && !userExpanded.has(node.id) && !userCollapsed.has(node.id)) {
        defaultCollapsed.add(node.id);
      }
      if (isRngNode(node)) {
        (node.branches || []).forEach(branch => walk(branch.children || [], depth + 1));
        return;
      }
      getNodeCollections(node).forEach(children => walk(children || [], depth + 1));
    });
  };
  walk(model, 0);
  [...defaultCollapsed].forEach(id => { if (!seen.has(id)) defaultCollapsed.delete(id); });
  [...userExpanded].forEach(id => { if (!seen.has(id)) userExpanded.delete(id); });
  [...userCollapsed].forEach(id => { if (!seen.has(id)) userCollapsed.delete(id); });
}

function isCollapsed(nodeId) {
  if (userExpanded.has(nodeId)) return false;
  if (userCollapsed.has(nodeId)) return true;
  return defaultCollapsed.has(nodeId);
}

function toggleNode(nodeId) {
  if (isCollapsed(nodeId)) {
    userCollapsed.delete(nodeId);
    userExpanded.add(nodeId);
  } else {
    userExpanded.delete(nodeId);
    userCollapsed.add(nodeId);
  }
}

function createSummaryLine(label, value) {
  const row = document.createElement('div');
  row.className = 'tree-outline-meta';

  const key = document.createElement('span');
  key.className = 'tree-outline-meta-key';
  key.textContent = label;

  const text = document.createElement('span');
  text.className = 'tree-outline-meta-value';
  text.textContent = value;

  row.append(key, text);
  return row;
}

function summarizeNode(node) {
  if (node.type === 'rng') {
    const branches = normalizeRngBranchProbabilities(node);
    return [
      createSummaryLine('Chance', node.params.mode === 'weight' ? `${node.params.chance ?? 0} weight` : `${Math.round((Number(node.params.chance ?? 0.5) || 0) * 100)}%`),
      createSummaryLine('Branches', `${branches.length} branch${branches.length === 1 ? '' : 'es'}`)
    ];
  }
  if (node.type === 'eventSet') {
    const identifier = node.params.identifier || 'unnamed event set';
    const conditions = [
      [node.params.minintensity, node.params.maxintensity].some(value => value !== '' && value != null) ? `Intensity ${node.params.minintensity ?? 'any'}–${node.params.maxintensity ?? 'any'}` : null,
      [node.params.minleveldifficulty, node.params.maxleveldifficulty].some(value => value !== '' && value != null) ? `Difficulty ${node.params.minleveldifficulty ?? 'any'}–${node.params.maxleveldifficulty ?? 'any'}` : null
    ].filter(Boolean).join(' · ') || 'No conditions';
    return [
      createSummaryLine('Identifier', identifier),
      createSummaryLine('Conditions', conditions)
    ];
  }
  if (node.type === 'event') return [createSummaryLine('Identifier', node.params.identifier || 'unnamed event')];
  if (node.type === 'spawn') return [createSummaryLine('Action', `${node.params.item || 'unknown item'} × ${node.params.amount || 1}`)];
  if (node.type === 'creature') return [createSummaryLine('Action', `${node.params.creature || 'unknown creature'} × ${node.params.count || 1}`)];
  if (node.type === 'affliction') return [createSummaryLine('Action', `${node.params.affliction || 'unknown affliction'} (${node.params.strength || 1})`)];
  return [];
}

function appendChildren(container, node, depth, rerender) {
  if (isRngNode(node)) {
    const branchList = document.createElement('div');
    branchList.className = 'tree-outline-branches';

    (node.branches || []).forEach((branch, index) => {
      const branchEl = document.createElement('div');
      branchEl.className = 'tree-outline-branch';
      setTooltip(branchEl, `Branch ${branch.label || branch.id || index + 1}`);

      const branchHeader = document.createElement('div');
      branchHeader.className = 'tree-outline-branch-header';
      const label = branch.label || branch.id || `Branch ${index + 1}`;
      const probability = normalizeRngBranchProbabilities(node)[index]?.probability;
      branchHeader.textContent = `${label}${typeof probability === 'number' ? ` · ${Math.round(probability * 100)}%` : ''}`;
      branchEl.appendChild(branchHeader);

      const childList = document.createElement('div');
      childList.className = 'tree-outline-branch-children';
      (branch.children || []).forEach(child => childList.appendChild(renderOutlineNode(child, depth + 1, rerender)));
      branchEl.appendChild(childList);
      branchList.appendChild(branchEl);
    });

    container.appendChild(branchList);
    return;
  }

  if (isContainerNode(node)) {
    const childWrap = document.createElement('div');
    childWrap.className = 'tree-outline-children';
    (node.children || []).forEach(child => childWrap.appendChild(renderOutlineNode(child, depth + 1, rerender)));
    container.appendChild(childWrap);
  }
}

function renderOutlineNode(node, depth, rerender) {
  const item = document.createElement('div');
  item.className = 'tree-outline-item';
  item.style.setProperty('--tree-depth', String(depth));

  const card = document.createElement('div');
  card.className = 'tree-outline-card';

  const header = document.createElement('div');
  header.className = 'tree-outline-header';
  setTooltip(header, `${TYPE_LABELS[node.type] || node.type} node`);

  const left = document.createElement('div');
  left.className = 'tree-outline-title-wrap';

  const collapse = document.createElement('button');
  collapse.type = 'button';
  collapse.className = 'tree-outline-toggle';
  const collapsible = hasChildren(node);
  if (!collapsible) {
    collapse.disabled = true;
    collapse.classList.add('is-placeholder');
    collapse.textContent = '•';
    setTooltip(collapse, 'Leaf node');
  } else {
    collapse.textContent = isCollapsed(node.id) ? '+' : '−';
    setTooltip(collapse, isCollapsed(node.id) ? 'Expand children' : 'Collapse children');
    collapse.addEventListener('click', () => {
      toggleNode(node.id);
      rerender();
    });
  }

  const badge = document.createElement('span');
  badge.className = `tree-outline-type tree-outline-type-${node.type}`;
  badge.append(createIcon(TYPE_ICONS[node.type] || 'tag'), document.createTextNode(TYPE_LABELS[node.type] || node.type));
  setTooltip(badge, `Type: ${TYPE_LABELS[node.type] || node.type}`);

  left.append(collapse, badge);

  const idText = document.createElement('div');
  idText.className = 'tree-outline-node-id';
  idText.textContent = `#${node.id}`;
  setTooltip(idText, `Node identifier ${node.id}`);

  header.append(left, idText);
  card.appendChild(header);

  const summary = document.createElement('div');
  summary.className = 'tree-outline-summary';
  summarizeNode(node).forEach(row => summary.appendChild(row));
  card.appendChild(summary);

  item.appendChild(card);

  if (hasChildren(node) && !isCollapsed(node.id)) appendChildren(item, node, depth, rerender);

  return item;
}

export function renderTreeOutline(model, container) {
  if (!container) return;
  ensureDefaultCollapsed(model);
  container.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'tree-outline-toolbar';
  header.innerHTML = '<strong>Tree Summary</strong><span>Root expanded · deeper levels collapse automatically</span>';
  container.appendChild(header);

  if (!model.length) {
    const empty = document.createElement('div');
    empty.className = 'tree-outline-empty';
    empty.textContent = 'Add nodes to see the tree outline.';
    container.appendChild(empty);
    return;
  }

  const list = document.createElement('div');
  list.className = 'tree-outline-list';
  const rerender = () => renderTreeOutline(model, container);
  model.forEach(node => list.appendChild(renderOutlineNode(node, 0, rerender)));
  container.appendChild(list);
}

import { createIcon } from './icon-component.js';
import { formatL10n, t } from './localization.js';
import { setTooltip } from './tooltip.js';
import { getNodeCollections, isContainerNode, isRngNode } from '../core/graph-utils.js';
import { normalizeRngBranchProbabilities } from '../core/rng.js';

const TYPE_LABEL_KEYS = {
  rng: 'addRng',
  event: 'addEvent',
  eventSet: 'addEventSet',
  spawn: 'addItem',
  creature: 'addCreature',
  affliction: 'addAffliction'
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

function getTypeLabel(nodeType) {
  const key = TYPE_LABEL_KEYS[nodeType];
  const label = key ? t(key) : nodeType;
  return label.replace(/^\+\s*/, '');
}

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
    const branchCountKey = branches.length === 1 ? 'treeBranchCount' : 'treeBranchCountPlural';
    return [
      createSummaryLine(t('treeOutlineChance'), node.params.mode === 'weight' ? `${node.params.chance ?? 0} ${t('weight').toLowerCase()}` : `${Math.round((Number(node.params.chance ?? 0.5) || 0) * 100)}%`),
      createSummaryLine(t('treeOutlineBranches'), formatL10n(branchCountKey, { count: branches.length }))
    ];
  }
  if (node.type === 'eventSet') {
    const identifier = node.params.identifier || t('treeUnnamedEventSet');
    const conditions = [
      [node.params.minintensity, node.params.maxintensity].some(value => value !== '' && value != null) ? `${t('minIntensity')} ${node.params.minintensity ?? 'any'} – ${t('maxIntensity')} ${node.params.maxintensity ?? 'any'}` : null,
      [node.params.minleveldifficulty, node.params.maxleveldifficulty].some(value => value !== '' && value != null) ? `${t('minDifficulty')} ${node.params.minleveldifficulty ?? 'any'} – ${t('maxDifficulty')} ${node.params.maxleveldifficulty ?? 'any'}` : null
    ].filter(Boolean).join(' · ') || t('treeNoConditions');
    return [
      createSummaryLine(t('treeOutlineIdentifier'), identifier),
      createSummaryLine(t('treeOutlineConditions'), conditions)
    ];
  }
  if (node.type === 'event') return [createSummaryLine(t('treeOutlineIdentifier'), node.params.identifier || t('treeUnnamedEvent'))];
  if (node.type === 'spawn') return [createSummaryLine(t('treeOutlineAction'), `${node.params.item || t('treeUnknownItem')} × ${node.params.amount || 1}`)];
  if (node.type === 'creature') return [createSummaryLine(t('treeOutlineAction'), `${node.params.creature || t('treeUnknownCreature')} × ${node.params.count || 1}`)];
  if (node.type === 'affliction') return [createSummaryLine(t('treeOutlineAction'), `${node.params.affliction || t('treeUnknownAffliction')} (${node.params.strength || 1})`)];
  return [];
}

function appendChildren(container, node, depth, rerender) {
  if (isRngNode(node)) {
    const branchList = document.createElement('div');
    branchList.className = 'tree-outline-branches';
    const probabilities = normalizeRngBranchProbabilities(node);

    (node.branches || []).forEach((branch, index) => {
      const branchEl = document.createElement('div');
      branchEl.className = 'tree-outline-branch';
      setTooltip(branchEl, `${t('branch')} ${branch.label || branch.id || index + 1}`);

      const branchHeader = document.createElement('div');
      branchHeader.className = 'tree-outline-branch-header';
      const label = branch.label || branch.id || `${t('branch')} ${index + 1}`;
      const probability = probabilities[index]?.probability;
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
  setTooltip(header, formatL10n('treeTypeTooltip', { type: getTypeLabel(node.type) }));

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
    setTooltip(collapse, t('treeLeafNode'));
  } else {
    collapse.textContent = isCollapsed(node.id) ? '+' : '−';
    setTooltip(collapse, isCollapsed(node.id) ? t('treeExpandChildren') : t('treeCollapseChildren'));
    collapse.addEventListener('click', () => {
      toggleNode(node.id);
      rerender();
    });
  }

  const badge = document.createElement('span');
  badge.className = `tree-outline-type tree-outline-type-${node.type}`;
  badge.append(createIcon(TYPE_ICONS[node.type] || 'tag'), document.createTextNode(getTypeLabel(node.type)));
  setTooltip(badge, formatL10n('treeTypeTooltip', { type: getTypeLabel(node.type) }));

  left.append(collapse, badge);

  const idText = document.createElement('div');
  idText.className = 'tree-outline-node-id';
  idText.textContent = `#${node.id}`;
  setTooltip(idText, formatL10n('treeNodeIdTooltip', { id: node.id }));

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
  header.innerHTML = `<div><strong>${t('treeSummary')}</strong><span>${t('treeSummaryHint')}</span></div>`;
  const toggleBtn = document.createElement('button');
  toggleBtn.type = 'button';
  toggleBtn.className = 'icon-btn tree-panel-collapse-btn';
  toggleBtn.dataset.action = 'toggleTreeSummaryPanel';
  const hidden = container.closest('#tree-container')?.classList.contains('hide-tree-summary');
  toggleBtn.textContent = hidden ? '▶' : '◀';
  toggleBtn.title = hidden ? t('showTreeSummaryPanel') : t('hideTreeSummaryPanel');
  header.appendChild(toggleBtn);
  container.appendChild(header);

  if (!model.length) {
    const empty = document.createElement('div');
    empty.className = 'tree-outline-empty';
    empty.textContent = t('treeSummaryEmpty');
    container.appendChild(empty);
    return;
  }

  const list = document.createElement('div');
  list.className = 'tree-outline-list';
  const rerender = () => renderTreeOutline(model, container);
  model.forEach(node => list.appendChild(renderOutlineNode(node, 0, rerender)));
  container.appendChild(list);
}

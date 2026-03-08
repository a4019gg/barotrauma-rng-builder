import { editorStore } from '../state/store.js';
import { dispatch } from './action-dispatcher.js';
import { renderNode } from './node-renderer.js';
import { buildEventXML } from '../io/xml-export.js';
import { parseEventXML } from '../io/xml-import.js';
import { openDatabasePanel } from '../services/db/db-panel.js';
import { TreeService } from '../services/tree/tree-service.js';
import { showError, showSuccess, showNeutral } from './popup.js';
import { applyLocalization, onLangChange, t } from './localization.js';
import { initSettingsController } from './settings-controller.js';
import { appendIconLabel } from './icon-component.js';
import { onThemeChange } from './theme-manager.js';

let pendingDeleteEventIndex = null;
let pendingDeleteResetTimer = null;
const EVENT_DELETE_CONFIRM_TIMEOUT_MS = 5000;

let searchQuery = '';

let contextMenuEl = null;
const OUTPUT_COLLAPSE_STORAGE_KEY = 'outputPanelCollapsed';
function setOutputTab(tab) {
  const nextTab = tab === 'simulation' ? 'simulation' : 'xml';
  document.querySelectorAll('.output-tab').forEach(btn => {
    const active = btn.dataset.tab === nextTab;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-selected', active ? 'true' : 'false');
  });
  document.querySelectorAll('[data-output-pane]').forEach(pane => {
    pane.classList.toggle('active', pane.dataset.outputPane === nextTab);
  });
}

function setOutputCollapsed(collapsed) {
  const panel = document.getElementById('output-panel');
  const body = panel?.querySelector('.output-panel-body');
  const toggle = document.getElementById('output-collapse-toggle');
  if (!panel || !body || !toggle) return;
  panel.classList.toggle('is-collapsed', collapsed);
  body.hidden = collapsed;
  toggle.textContent = `${collapsed ? '▶' : '▼'} Output`;
  localStorage.setItem(OUTPUT_COLLAPSE_STORAGE_KEY, collapsed ? '1' : '0');
}

function sampleSimulationNode(nodes) {
  if (!nodes.length) return [];
  const out = [];
  const walk = list => {
    list.forEach(node => {
      if (node.type === 'rng') {
        const chance = Number(node.params.chance);
        const clampedChance = Number.isFinite(chance) ? Math.max(0, Math.min(1, chance)) : 0;
        const branch = Math.random() <= clampedChance ? 'success' : 'failure';
        walk(node.children[branch] || []);
        return;
      }
      if (['spawn', 'creature', 'affliction'].includes(node.type)) {
        const key = node.type === 'spawn'
          ? `SpawnItem ${node.params.item || 'unknown'}`
          : node.type === 'creature'
            ? `SpawnCreature ${node.params.creature || 'unknown'}`
            : `Affliction ${node.params.affliction || 'unknown'}`;
        out.push(key);
      }
    });
  };
  walk(nodes);
  return out;
}

function renderSimulationResults(results, iterations) {
  const body = document.getElementById('simulation-results');
  if (!body) return;
  body.innerHTML = '';
  if (!results.size) {
    const row = document.createElement('tr');
    row.innerHTML = '<td colspan="3">No terminal spawn nodes in tree</td>';
    body.appendChild(row);
    return;
  }
  [...results.entries()]
    .sort((a, b) => b[1] - a[1])
    .forEach(([result, count]) => {
      const row = document.createElement('tr');
      row.innerHTML = `<td>${result}</td><td>${count}</td><td>${((count / iterations) * 100).toFixed(2)}%</td>`;
      body.appendChild(row);
    });
}

function closeContextMenu() {
  if (contextMenuEl) contextMenuEl.remove();
  contextMenuEl = null;
}

function openNodeContextMenu(event) {
  const nodeEl = event.target.closest('.tree-node');
  if (!nodeEl || !window.d3) return;
  const datum = window.d3.select(nodeEl).datum();
  const nodeId = datum?.data?.id;
  if (!Number.isFinite(Number(nodeId))) return;
  event.preventDefault();
  closeContextMenu();
  const menu = document.createElement('div');
  menu.className = 'node-context-menu';
  menu.style.left = `${event.clientX}px`;
  menu.style.top = `${event.clientY}px`;
  const add = (label, fn) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = label;
    btn.onclick = () => { fn(); closeContextMenu(); };
    menu.appendChild(btn);
  };
  add('Add child (Success)', () => dispatch({ type: 'ADD_CHILD_NODE', parentId: Number(nodeId), branch: 'success', nodeType: 'rng' }));
  add('Duplicate', () => dispatch({ type: 'DUPLICATE_SUBTREE', id: Number(nodeId) }));
  add('Copy subtree', () => dispatch({ type: 'COPY_SUBTREE', id: Number(nodeId) }));
  add('Paste subtree', () => dispatch({ type: 'PASTE_SUBTREE', parentId: Number(nodeId), branch: 'success' }));
  add('Delete', () => dispatch({ type: 'REMOVE_NODE', id: Number(nodeId) }));
  document.body.appendChild(menu);
  contextMenuEl = menu;
}

const treeService = new TreeService({
  svgSelector: '#tree-svg',
  inspectorSelector: '#tree-inspector',
  onUpdateParam: (id, key, value) => dispatch({ type: 'UPDATE_NODE_PARAM', id, key, value }),
  onRemoveNode: id => dispatch({ type: 'REMOVE_NODE', id }),
  onAddChild: (parentId, branch, type) => dispatch({ type: 'ADD_CHILD_NODE', parentId, branch, nodeType: type }),
  onMoveNode: (nodeId, newParentId, branch) => {
    const moved = editorStore.moveNode ? editorStore.moveNode(nodeId, newParentId, branch) : false;
    if (moved) treeService.autoLayoutSubtree(nodeId);
  }
});

function initButtonIcons() {
  const iconMap = [
    ['#view-btn', 'compass', 'treeView'],
    ['button[data-action="openDB"]', 'folder', 'database'],
    ['#settings-toggle', 'gear', 'settings'],
    ['button[data-action="projectImport"]', 'import', 'projectImport'],
    ['button[data-action="projectExport"]', 'export', 'projectExport'],
    ['button[data-action="undo"]', 'minus-circle', 'undo'],
    ['button[data-action="redo"]', 'checkmark-circle', 'redo'],
    ['button[data-action="addNode"][data-type="rng"]', 'sliders-horizontal', 'addRng'],
    ['button[data-action="addNode"][data-type="spawn"]', 'box', 'addItem'],
    ['button[data-action="addNode"][data-type="creature"]', 'hashtag', 'addCreature'],
    ['button[data-action="addNode"][data-type="affliction"]', 'alert-circle', 'addAffliction'],
    ['button[data-action="generateXML"]', 'code', 'generateXML'],
    ['button[data-action="copyXML"]', 'copy', 'copyXML'],
    ['button[data-action="downloadXML"]', 'download-cloud', 'downloadXML'],
    ['button[data-action="importXML"]', 'upload-cloud', 'importXML'],
    ['button[data-action="openOutputTab"][data-tab="simulation"]', 'chart-pie', 'runSimulation'],
    ['button[data-action="validateTree"]', 'checkmark-square', 'validateTree'],
    ['button[data-action="toggleHeatmap"]', 'sun', 'toggleHeatmap'],
    ['button[data-action="searchNodes"]', 'search', 'searchNodes']
  ];

  iconMap.forEach(([selector, iconName, l10nKey]) => {
    const button = document.querySelector(selector);
    if (!button) return;
    appendIconLabel(button, { icon: iconName, l10nKey });
  });
}


function clearPendingEventDelete() {
  pendingDeleteEventIndex = null;
  if (pendingDeleteResetTimer) {
    clearTimeout(pendingDeleteResetTimer);
    pendingDeleteResetTimer = null;
  }
}

function schedulePendingEventDeleteReset() {
  if (pendingDeleteResetTimer) clearTimeout(pendingDeleteResetTimer);
  pendingDeleteResetTimer = setTimeout(() => {
    pendingDeleteEventIndex = null;
    pendingDeleteResetTimer = null;
    renderEvents();
  }, EVENT_DELETE_CONFIRM_TIMEOUT_MS);
}

function startEventRename(titleEl) {
  const parentTab = titleEl.closest('.event-tab');
  if (!parentTab) return;
  const index = Number(parentTab.dataset.index);
  if (!Number.isInteger(index)) return;

  const state = editorStore.getState();
  const currentTitle = state.events[index]?.id || '';
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'event-tab-edit-input';
  input.value = currentTitle;
  input.setAttribute('aria-label', t('eventId'));

  const commit = () => {
    const nextValue = input.value.trim() || `event_${index + 1}`;
    editorStore.updateEventId(index, nextValue);
  };

  const cancel = () => renderEvents();

  input.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      commit();
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      cancel();
    }
  });

  input.addEventListener('blur', commit, { once: true });

  titleEl.replaceWith(input);
  input.focus();
  input.select();
}

function renderEvents() {
  const state = editorStore.getState();
  if (pendingDeleteEventIndex != null && pendingDeleteEventIndex >= state.events.length) clearPendingEventDelete();
  const list = document.getElementById('events-tabs');
  list.innerHTML = '';

  state.events.forEach((event, index) => {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'event-tab';
    tab.dataset.action = 'selectEvent';
    tab.dataset.index = String(index);
    const pendingDelete = pendingDeleteEventIndex === index;
    tab.innerHTML = `<span class="event-tab-title" data-action="renameEvent" data-index="${index}" title="Double click to rename">${event.id}</span>${state.events.length > 1 ? `<span class="event-tab-close ${pendingDelete ? 'pending' : ''}" data-action="removeEvent" data-index="${index}" title="${pendingDelete ? t('confirmRemoveEvent') : t('removeNode')}">${pendingDelete ? '!' : '×'}</span>` : ''}`;
    if (index === state.currentEventIndex) tab.classList.add('active');
    list.appendChild(tab);
  });

  const addTab = document.createElement('button');
  addTab.type = 'button';
  addTab.className = 'event-tab event-tab-add';
  addTab.dataset.action = 'addEvent';
  addTab.textContent = '+';
  addTab.disabled = state.events.length >= 5;
  list.appendChild(addTab);

  document.getElementById('event-id').value = state.currentEvent.id;
}

function renderModel() {
  const root = document.getElementById('root-children');
  root.innerHTML = '';

  const state = editorStore.getState();
  state.currentEvent.model.forEach(node => root.appendChild(renderNode(node)));

  if (document.getElementById('tree-container').style.display === 'block') {
    treeService.renderQueued(state.currentEvent.model);
  }
}

function updateXML() {
  const { currentEvent } = editorStore.getState();
  document.getElementById('output').value = buildEventXML({
    eventId: currentEvent.id,
    model: currentEvent.model
  });
}

function toggleView() {
  const classic = document.getElementById('classic-view');
  const tree = document.getElementById('tree-container');
  const button = document.getElementById('view-btn');
  const isTree = tree.style.display === 'block';

  tree.style.display = isTree ? 'none' : 'block';
  classic.style.display = isTree ? 'block' : 'none';
  const label = button.querySelector('[data-l10n]');
  if (label) {
    label.dataset.l10n = isTree ? 'treeView' : 'classicView';
    label.textContent = t(label.dataset.l10n);
  }

  if (!isTree) treeService.renderQueued(editorStore.getState().currentEvent.model);
}

function handleProjectStub() {
  showNeutral(t('projectStub'));
}

function handleClick(event) {
  const actionEl = event.target.closest('[data-action]');
  if (!actionEl) return;

  const action = actionEl.dataset.action;
  const id = Number(actionEl.dataset.id);

  if (action === 'renameEvent') return;

  if (action === 'addEvent') dispatch({ type: 'ADD_EVENT' });
  if (action === 'removeEvent') {
    const index = Number(actionEl.dataset.index);
    if (pendingDeleteEventIndex !== index) {
      pendingDeleteEventIndex = index;
      schedulePendingEventDeleteReset();
      renderEvents();
      return;
    }
    clearPendingEventDelete();
    dispatch({ type: 'REMOVE_EVENT', index });
    return;
  }
  if (action === 'selectEvent') dispatch({ type: 'SET_CURRENT_EVENT', index: Number(actionEl.dataset.index) });
  if (action === 'addNode') dispatch({ type: 'ADD_ROOT_NODE', nodeType: actionEl.dataset.type });
  if (action === 'addChildNode') dispatch({ type: 'ADD_CHILD_NODE', parentId: Number(actionEl.dataset.parentId), branch: actionEl.dataset.branch, nodeType: actionEl.dataset.type });
  if (action === 'removeNode') dispatch({ type: 'REMOVE_NODE', id });
  if (action === 'clearAll') dispatch({ type: 'CLEAR_EVENT' });

  if (action === 'toggleView') toggleView();
  if (action === 'openDB') openDatabasePanel().catch(() => showError('DB load error'));

  if (action === 'generateXML') {
    updateXML();
    showSuccess(t('xmlGenerated'));
  }

  if (action === 'copyXML') {
    const out = document.getElementById('output');
    out.select();
    document.execCommand('copy');
    showSuccess(t('xmlCopied'));
  }

  if (action === 'downloadXML') {
    const out = document.getElementById('output');
    const blob = new Blob([out.value], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${editorStore.getState().currentEvent.id}.xml`;
    link.click();
    URL.revokeObjectURL(url);
    showSuccess(t('xmlDownloaded'));
  }

  if (action === 'importXML') {
    try {
      const parsed = parseEventXML(document.getElementById('output').value, () => editorStore.idCounter++);
      editorStore.updateCurrentEventId(parsed.eventId);
      dispatch({ type: 'SET_MODEL', model: parsed.model });
      showSuccess(t('xmlImported'));
    } catch (err) {
      showError(err.message || 'XML import failed');
    }
  }

  if (action === 'projectImport' || action === 'projectExport') handleProjectStub();

  if (action === 'undo') editorStore.undo();
  if (action === 'redo') editorStore.redo();
  if (action === 'openOutputTab') {
    setOutputTab(actionEl.dataset.tab);
    if (actionEl.dataset.tab === 'simulation') setOutputCollapsed(false);
  }
  if (action === 'toggleOutputCollapse') {
    const panel = document.getElementById('output-panel');
    setOutputCollapsed(!panel?.classList.contains('is-collapsed'));
  }
  if (action === 'runSimulation') runSimulation();
  if (action === 'validateTree') runValidation();
  if (action === 'toggleHeatmap') {
    const next = !actionEl.classList.contains('active');
    actionEl.classList.toggle('active', next);
    treeService.setHeatmapEnabled(next);
  }
  if (action === 'searchNodes') runSearch();
  if (action === 'quickAdd') runQuickAdd();
}

function handleChange(event) {
  const el = event.target;
  if (el.dataset.action === 'updateParam') {
    dispatch({ type: 'UPDATE_NODE_PARAM', id: Number(el.dataset.id), key: el.dataset.key, value: el.value });
  }
}


function handleDblClick(event) {
  const title = event.target.closest('.event-tab-title[data-action="renameEvent"]');
  if (!title) return;
  event.preventDefault();
  event.stopPropagation();
  startEventRename(title);
}

function handleInput(event) {
  if (event.target.id === 'event-id') {
    dispatch({ type: 'UPDATE_EVENT_ID', index: editorStore.getState().currentEventIndex, eventId: event.target.value }, { skipHistory: true });
  }
}


function runSimulation() {
  const model = editorStore.getState().currentEvent.model;
  const iterationsInput = document.getElementById('simulation-iterations');
  const iterationsValue = Number(iterationsInput?.value);
  const iterations = Number.isFinite(iterationsValue) ? Math.max(1, Math.min(200000, Math.floor(iterationsValue))) : 10000;
  if (iterationsInput) iterationsInput.value = String(iterations);

  const totals = new Map();
  for (let i = 0; i < iterations; i += 1) {
    sampleSimulationNode(model).forEach(result => {
      totals.set(result, (totals.get(result) || 0) + 1);
    });
  }

  renderSimulationResults(totals, iterations);
  setOutputTab('simulation');
  setOutputCollapsed(false);
  if (!model.length) showNeutral('Simulation completed: empty tree');
}

function runValidation() {
  const state = editorStore.getState();
  const model = state.currentEvent.model;
  const warnings = [];
  const visit = (nodes, reachable = true) => {
    nodes.forEach(node => {
      if (node.type === 'rng') {
        const chance = Number(node.params.chance);
        if (!Number.isFinite(chance) || chance < 0 || chance > 1) warnings.push(`Node #${node.id}: chance outside 0..1`);
        if (!node.children.success.length && !node.children.failure.length) warnings.push(`Node #${node.id}: empty branches`);
        visit(node.children.success, reachable);
        visit(node.children.failure, reachable);
      } else if (node.type === 'spawn' && !node.params.item) warnings.push(`Node #${node.id}: missing item id`);
      else if (node.type === 'creature' && !node.params.creature) warnings.push(`Node #${node.id}: missing creature id`);
      else if (node.type === 'affliction' && !node.params.affliction) warnings.push(`Node #${node.id}: missing affliction id`);
      if (!reachable) warnings.push(`Node #${node.id}: unreachable`);
    });
  };
  visit(model, true);
  showNeutral(warnings.length ? warnings.slice(0, 25).join('\n') : 'Validation: no issues found');
}

function runSearch() {
  const query = window.prompt('Find node by id/item/creature/affliction', searchQuery || '');
  if (query == null) return;
  searchQuery = query.trim().toLowerCase();
  if (!searchQuery) {
    treeService.setSearchHighlights([]);
    return;
  }
  const hits = [];
  editorStore.collectNodes().forEach(node => {
    const hay = [String(node.id), node.params.item, node.params.creature, node.params.affliction].filter(Boolean).join(' ').toLowerCase();
    if (hay.includes(searchQuery)) hits.push(node.id);
  });
  treeService.setSearchHighlights(hits);
  if (hits.length) treeService.centerOnNode(hits[0]);
  showNeutral(hits.length ? `Found ${hits.length} node(s)` : 'No matches');
}

function runQuickAdd() {
  const value = window.prompt('Quick add node type (rng/spawn/creature/affliction)', 'rng');
  if (!value) return;
  const type = value.trim().toLowerCase();
  if (!['rng', 'spawn', 'creature', 'affliction'].includes(type)) return showError('Unknown node type');
  dispatch({ type: 'ADD_ROOT_NODE', nodeType: type });
}

function handleKeyboardShortcuts(event) {
  const selectedId = treeService.getSelectedNodeId();
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); editorStore.undo(); }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') { event.preventDefault(); editorStore.redo(); }
  if (event.key === 'Delete' && selectedId != null) { event.preventDefault(); dispatch({ type: 'REMOVE_NODE', id: selectedId }); }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd' && selectedId != null) { event.preventDefault(); dispatch({ type: 'DUPLICATE_SUBTREE', id: selectedId }); }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); runQuickAdd(); }
}

export function initEditorUI() {
  document.addEventListener('click', handleClick);
  document.addEventListener('change', handleChange);
  document.addEventListener('input', handleInput);
  document.addEventListener('dblclick', handleDblClick);
  document.addEventListener('keydown', handleKeyboardShortcuts);
  document.addEventListener('contextmenu', openNodeContextMenu);
  document.addEventListener('click', closeContextMenu);

  initSettingsController();
  initButtonIcons();
  applyLocalization();

  onThemeChange(() => {
    renderModel();
  });

  onLangChange(() => {
    applyLocalization();
    const viewLabel = document.querySelector('#view-btn [data-l10n]');
    if (viewLabel) {
      viewLabel.textContent = document.getElementById('tree-container').style.display === 'block' ? t('classicView') : t('treeView');
    }
    treeService.renderQueued(editorStore.getState().currentEvent.model);
  });

  editorStore.subscribe(() => {
    renderEvents();
    renderModel();
    updateXML();
  });

  const collapsed = localStorage.getItem(OUTPUT_COLLAPSE_STORAGE_KEY) === '1';
  setOutputTab('xml');
  setOutputCollapsed(collapsed);

  renderEvents();
  renderModel();
  updateXML();
}

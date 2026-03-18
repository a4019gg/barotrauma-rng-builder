import { editorStore } from '../state/store.js';
import { dispatch } from './action-dispatcher.js';
import { renderNode } from './node-renderer.js';
import { buildEventXML } from '../io/xml-export.js';
import { openDatabasePanel } from '../services/db/db-panel.js';
import { TreeService } from '../services/tree/tree-service.js';
import { showError, showSuccess, showNeutral } from './popup.js';
import { applyLocalization, getLang, onLangChange, setLang, t } from './localization.js';
import { initSettingsController, openSettingsPanel } from './settings-controller.js';
import { appendIconLabel } from './icon-component.js';
import { getThemeState, onThemeChange, setBaseTheme, setThemeMode, setUiScale } from './theme-manager.js';
import { getAppSetting, setAppSetting, subscribeAppSettings } from '../state/app-settings.js';
import { getAllowedNodeTypes, getModeDefinition, getNodeCollections, isActionNode, isContainerNode, isRngNode } from '../core/graph-utils.js';
import { normalizeRngBranchProbabilities } from '../core/rng.js';

let pendingDeleteEventIndex = null;
let pendingDeleteResetTimer = null;
const EVENT_DELETE_CONFIRM_TIMEOUT_MS = 5000;

let searchQuery = '';
let simulationSortDirection = 'desc';

let contextMenuEl = null;
const OUTPUT_COLLAPSE_STORAGE_KEY = 'outputPanelCollapsed';

function confirmAction(messageKey) {
  return window.confirm(t(messageKey));
}

function requestNodeRemoval(id) {
  if (!Number.isFinite(Number(id))) return false;
  if (!confirmAction('confirmRemoveNode')) return false;
  dispatch({ type: 'REMOVE_NODE', id: Number(id) });
  return true;
}

function requestClearCurrentEvent() {
  if (!confirmAction('confirmClearEvent')) return false;
  dispatch({ type: 'CLEAR_EVENT' });
  return true;
}
function setOutputTab(tab) {
  const nextTab = tab === 'simulation' ? 'simulation' : 'xml';
  const tabs = document.querySelector('.output-tabs');
  if (tabs) tabs.dataset.activeTab = nextTab;
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

function setViewMode(mode) {
  const nextMode = mode === 'tree' ? 'tree' : 'node';
  const classic = document.getElementById('classic-view');
  const tree = document.getElementById('tree-container');
  const segmented = document.getElementById('view-segmented');
  if (!classic || !tree || !segmented) return;

  const isTree = nextMode === 'tree';
  document.body.dataset.viewMode = nextMode;
  tree.style.display = isTree ? 'block' : 'none';
  classic.style.display = isTree ? 'none' : 'block';
  segmented.dataset.viewMode = nextMode;

  segmented.querySelectorAll('.segmented-option').forEach(button => {
    const active = button.dataset.viewMode === nextMode;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', active ? 'true' : 'false');
  });

  if (isTree) treeService.renderQueued(editorStore.getState().currentEvent.model);
}

function createSeededRng(seedValue) {
  const parsed = Number(seedValue);
  if (!Number.isFinite(parsed)) return Math.random;
  let state = (Math.floor(parsed) >>> 0) || 0x6d2b79f5;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function nodeResultKey(node) {
  return node.type === 'spawn'
    ? `SpawnItem ${node.params.item || 'unknown'}`
    : node.type === 'creature'
      ? `SpawnCreature ${node.params.creature || 'unknown'}`
      : `Affliction ${node.params.affliction || 'unknown'}`;
}

function sampleSimulationNode(nodes, randomFn = Math.random) {
  if (!nodes.length) return [];
  const out = [];
  const walk = list => {
    list.forEach(node => {
      if (isRngNode(node)) {
        const branches = normalizeRngBranchProbabilities(node);
        let roll = randomFn();
        let picked = branches[branches.length - 1];
        for (const branch of branches) {
          roll -= branch.probability;
          if (roll <= 0) { picked = branch; break; }
        }
        walk(picked?.children || []);
        return;
      }
      if (isActionNode(node)) {
        out.push(nodeResultKey(node));
        return;
      }
      getNodeCollections(node).forEach(children => walk(children));
    });
  };
  walk(nodes);
  return out;
}

function calculateExactProbabilities(nodes) {
  const totals = new Map();
  const visit = (list, probability) => {
    list.forEach(node => {
      if (isRngNode(node)) {
        normalizeRngBranchProbabilities(node).forEach(branch => {
          visit(branch.children || [], probability * branch.probability);
        });
        return;
      }
      if (isActionNode(node)) {
        const key = nodeResultKey(node);
        totals.set(key, (totals.get(key) || 0) + probability);
        return;
      }
      getNodeCollections(node).forEach(children => visit(children, probability));
    });
  };
  visit(nodes, 1);
  return totals;
}

function formatPercent(value) {
  return `${(value * 100).toFixed(2)}%`;
}

function renderSimulationResults(results, exactResults, iterations) {
  const body = document.getElementById('simulation-results');
  if (!body) return;
  body.innerHTML = '';
  if (!results.size && !exactResults.size) {
    const row = document.createElement('tr');
    row.innerHTML = '<td colspan="4">No terminal spawn nodes in tree</td>';
    body.appendChild(row);
    return;
  }

  const keys = new Set([...results.keys(), ...exactResults.keys()]);
  const rows = [...keys].map(result => {
    const count = results.get(result) || 0;
    const simulatedProbability = count / iterations;
    const exactProbability = exactResults.get(result) || 0;
    return { result, count, simulatedProbability, exactProbability };
  });

  rows
    .sort((a, b) => {
      if (simulationSortDirection === 'asc') return a.simulatedProbability - b.simulatedProbability;
      return b.simulatedProbability - a.simulatedProbability;
    })
    .forEach(({ result, count, simulatedProbability, exactProbability }) => {
      const row = document.createElement('tr');
      row.innerHTML = `<td>${result}</td><td>${count}</td><td>${formatPercent(simulatedProbability)}</td><td>${formatPercent(exactProbability)}</td>`;
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
  add('Add child', () => dispatch({ type: 'ADD_CHILD_NODE', parentId: Number(nodeId), nodeType: 'rng' }));
  add('Duplicate', () => dispatch({ type: 'DUPLICATE_SUBTREE', id: Number(nodeId) }));
  add('Copy subtree', () => dispatch({ type: 'COPY_SUBTREE', id: Number(nodeId) }));
  add('Paste subtree', () => dispatch({ type: 'PASTE_SUBTREE', parentId: Number(nodeId) }));
  add('Delete', () => requestNodeRemoval(Number(nodeId)));
  document.body.appendChild(menu);
  contextMenuEl = menu;
}

const treeService = new TreeService({
  svgSelector: '#tree-svg',
  inspectorSelector: '#tree-inspector',
  onUpdateParam: (id, key, value) => dispatch({ type: 'UPDATE_NODE_PARAM', id, key, value }),
  onRemoveNode: id => requestNodeRemoval(id),
  onAddChild: (parentId, branch, type) => dispatch({ type: 'ADD_CHILD_NODE', parentId, branch, nodeType: type }),
  onMoveNode: (nodeId, newParentId, branch) => {
    const moved = editorStore.moveNode ? editorStore.moveNode(nodeId, newParentId, branch) : false;
    if (moved) treeService.autoLayoutSubtree(nodeId);
  }
});

function initButtonIcons() {
  const iconMap = [
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
    ['button[data-action="openImportXmlModal"]', 'upload-cloud', 'importXML'],
    ['button[data-action="openOutputTab"][data-tab="simulation"]', 'chart-pie', 'simulation'],
    ['button[data-action="runSimulation"]', 'chart-pie', 'runSimulation']
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
    tab.innerHTML = `<span class="event-tab-title" title="Double click to rename">${event.id}</span>${state.events.length > 1 ? `<span class="event-tab-close ${pendingDelete ? 'pending' : ''}" data-action="removeEvent" data-index="${index}" title="${pendingDelete ? t('confirmRemoveEvent') : t('removeNode')}">${pendingDelete ? '!' : '×'}</span>` : ''}`;
    if (index === state.currentEventIndex) tab.classList.add('active');
    list.appendChild(tab);
  });

  const addTab = document.createElement('button');
  addTab.type = 'button';
  addTab.className = 'event-tab event-tab-add';
  addTab.dataset.action = 'addEvent';
  addTab.textContent = '+';
  addTab.disabled = state.events.length >= 7;
  list.appendChild(addTab);

  document.getElementById('event-id').value = state.currentEvent.id;
}

function renderModel() {
  const root = document.getElementById('root-children');
  root.innerHTML = '';

  const state = editorStore.getState();
  state.currentEvent.model.forEach(node => root.appendChild(renderNode(node, state.editorMode)));

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

function handleProjectStub() {
  showNeutral(t('projectStub'));
}


function handleMenuStub(message) {
  showNeutral(message);
}

function updateMenuThemeStatus() {
  const theme = getThemeState();
  document.querySelectorAll('button[data-action="menuSetThemeMode"]').forEach(button => {
    const selected = button.dataset.value === theme.themeMode;
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-current', selected ? 'true' : 'false');
  });
  document.querySelectorAll('button[data-action="menuSetBaseTheme"]').forEach(button => {
    const selected = button.dataset.value === theme.baseTheme;
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-current', selected ? 'true' : 'false');
  });
  document.querySelectorAll('button[data-action="menuSetUiScale"]').forEach(button => {
    const selected = button.dataset.value === theme.uiScale;
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-current', selected ? 'true' : 'false');
  });
  document.querySelectorAll('button[data-action="menuSetLanguage"]').forEach(button => {
    const selected = button.dataset.value === getLang();
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-current', selected ? 'true' : 'false');
  });
}

function openImportXmlModal() {
  const modal = document.getElementById('import-xml-modal');
  const fileInput = document.getElementById('import-xml-file');
  const fileName = document.getElementById('import-xml-file-name');
  const textarea = document.getElementById('import-xml-textarea');
  if (!modal || !fileInput || !fileName || !textarea) return;
  modal.hidden = false;
  applyLocalization(modal);
  fileName.textContent = fileInput.files?.[0]?.name || t('importXmlNoFile');
  textarea.focus();
}

function closeImportXmlModal() {
  const modal = document.getElementById('import-xml-modal');
  if (modal) modal.hidden = true;
}

function openAboutPanel() {
  if (document.querySelector('.about-modal:not(.import-xml-modal)')) return;
  const modal = document.createElement('div');
  modal.className = 'about-modal';
  modal.innerHTML = `<div class="about-modal-backdrop" data-role="close"></div><section class="about-modal-panel" role="dialog" aria-modal="true" aria-label="About"><h3>Barotrauma RNG Builder</h3><p>Placeholder info panel.</p><p>Tree editor, XML generation and simulation tools for event balancing.</p><button type="button" data-role="close">Close</button></section>`;
  modal.addEventListener('click', event => {
    if (event.target.dataset.role === 'close') modal.remove();
  });
  document.body.appendChild(modal);
}

function handleMenuDeleteSelected() {
  const selectedId = treeService.getSelectedNodeId();
  if (selectedId == null) {
    showNeutral('Select a node to delete');
    return;
  }
  requestNodeRemoval(selectedId);
}

function handleMenuDuplicateSelected() {
  const selectedId = treeService.getSelectedNodeId();
  if (selectedId == null) {
    showNeutral('Select a node to duplicate');
    return;
  }
  dispatch({ type: 'DUPLICATE_SUBTREE', id: selectedId });
}

function handleClick(event) {
  const actionEl = event.target.closest('[data-action]');
  if (!actionEl) return;

  const action = actionEl.dataset.action;
  const id = Number(actionEl.dataset.id);

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
  if (action === 'setEditorMode') { setAppSetting('editorMode', actionEl.dataset.mode); editorStore.setEditorMode(actionEl.dataset.mode); applyEditorMode(); }
  if (action === 'addChildNode') dispatch({ type: 'ADD_CHILD_NODE', parentId: Number(actionEl.dataset.parentId), branch: actionEl.dataset.branch || null, nodeType: actionEl.dataset.type });
  if (action === 'addRngBranch') dispatch({ type: 'ADD_RNG_BRANCH', id });
  if (action === 'removeRngBranch') dispatch({ type: 'REMOVE_RNG_BRANCH', id, branchId: actionEl.dataset.branchId });
  if (action === 'removeNode') return void requestNodeRemoval(id);
  if (action === 'clearAll') return void requestClearCurrentEvent();

  if (action === 'setViewMode') setViewMode(actionEl.dataset.viewMode);
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

  if (action === 'openImportXmlModal') openImportXmlModal();

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
  if (action === 'menuDeleteSelected') handleMenuDeleteSelected();
  if (action === 'menuDuplicateSelected') handleMenuDuplicateSelected();
  if (action === 'menuSetThemeMode') setThemeMode(actionEl.dataset.value);
  if (action === 'menuSetBaseTheme') setBaseTheme(actionEl.dataset.value);
  if (action === 'menuSetUiScale') setUiScale(actionEl.dataset.value);
  if (action === 'openDocumentation') handleMenuStub('Documentation placeholder');
  if (action === 'openWiki') window.open('https://barotraumagame.com/wiki', '_blank', 'noopener');
  if (action === 'openGithub') window.open('https://github.com/a4019gg/barotrauma-rng-builder', '_blank', 'noopener');
  if (action === 'reportIssue') window.open('https://github.com/a4019gg/barotrauma-rng-builder/issues', '_blank', 'noopener');
  if (action === 'aboutApp') openAboutPanel();
  if (action === 'menuLangPlaceholder') handleMenuStub(t('localizationPlaceholder'));
  if (action === 'basePresetPlaceholder') handleMenuStub('Base preset placeholder');
  if (action === 'probabilityAnalysis' || action === 'loadPreset' || action === 'savePreset' || action === 'managePreset') {
    handleMenuStub('Feature available in upcoming updates');
  }
  if (action === 'openSettingsLanguage' || action === 'openSettingsXmlBehavior') openSettingsPanel();
  if (action === 'menuSetLanguage') setLang(actionEl.dataset.value);
  if (action === 'resetSettings') {
    localStorage.clear();
    location.reload();
  }
  if (action === 'toggleSimulationSort') {
    simulationSortDirection = simulationSortDirection === 'desc' ? 'asc' : 'desc';
    runSimulation();
  }
  if (action === 'quickAdd') runQuickAdd();
}

function handleChange(event) {
  const el = event.target;
  if (el.dataset.action === 'updateParam') {
    const value = el.dataset.valueType === 'boolean' ? el.checked : el.value;
    dispatch({ type: 'UPDATE_NODE_PARAM', id: Number(el.dataset.id), key: el.dataset.key, value });
  }
  if (el.dataset.action === 'updateBranch') {
    dispatch({ type: 'UPDATE_BRANCH', id: Number(el.dataset.id), branchId: el.dataset.branchId, key: el.dataset.key, value: el.value });
  }
}


function handleDblClick(event) {
  const title = event.target.closest('.event-tab-title');
  if (!title) return;
  event.preventDefault();
  event.stopPropagation();
  startEventRename(title);
}

function handleInput(event) {
  if (event.target.id === 'event-id') {
    dispatch({ type: 'UPDATE_EVENT_ID', index: editorStore.getState().currentEventIndex, eventId: event.target.value }, { skipHistory: true });
  }
  if (event.target.id === 'simulation-search') {
    runSearch(event.target.value);
  }
}


function runSimulation() {
  const model = editorStore.getState().currentEvent.model;
  const iterationsInput = document.getElementById('simulation-iterations');
  const iterationsValue = Number(iterationsInput?.value);
  const iterations = Number.isFinite(iterationsValue) ? Math.max(1, Math.min(200000, Math.floor(iterationsValue))) : 10000;
  if (iterationsInput) iterationsInput.value = String(iterations);
  const seedInput = document.getElementById('simulation-seed');
  const seed = seedInput?.value?.trim() || '';
  const randomFn = seed ? createSeededRng(seed) : Math.random;

  const totals = new Map();
  for (let i = 0; i < iterations; i += 1) {
    sampleSimulationNode(model, randomFn).forEach(result => {
      totals.set(result, (totals.get(result) || 0) + 1);
    });
  }

  const exactTotals = calculateExactProbabilities(model);
  renderSimulationResults(totals, exactTotals, iterations);
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
      if (isRngNode(node)) {
        if (!node.branches?.length) warnings.push(`Node #${node.id}: no branches`);
        node.branches?.forEach(branch => {
          if ((branch.children || []).length === 0) warnings.push(`Node #${node.id}: branch ${branch.label || branch.id} is empty`);
          visit(branch.children || [], reachable);
        });
      } else if (node.type === 'spawn' && !node.params.item) warnings.push(`Node #${node.id}: missing item id`);
      else if (node.type === 'creature' && !node.params.creature) warnings.push(`Node #${node.id}: missing creature id`);
      else if (node.type === 'affliction' && !node.params.affliction) warnings.push(`Node #${node.id}: missing affliction id`);
      else if (node.type === 'eventSet' && !node.children?.length) warnings.push(`Node #${node.id}: empty EventSet`);
      else if (node.type === 'event' && !node.children?.length) warnings.push(`Node #${node.id}: empty Event`);
      if (isContainerNode(node)) getNodeCollections(node).forEach(children => visit(children, reachable));
      if (!reachable) warnings.push(`Node #${node.id}: unreachable`);
    });
  };
  visit(model, true);
  showNeutral(warnings.length ? warnings.slice(0, 25).join('\n') : 'Validation: no issues found');
}

function runSearch(rawQuery) {
  searchQuery = String(rawQuery || '').trim().toLowerCase();
  if (!searchQuery) {
    treeService.setSearchHighlights([]);
    return;
  }
  const hits = [];
  editorStore.collectNodes().forEach(node => {
    const hay = [String(node.id), node.params.item, node.params.creature, node.params.affliction, node.params.identifier].filter(Boolean).join(' ').toLowerCase();
    if (hay.includes(searchQuery)) hits.push(node.id);
  });
  treeService.setSearchHighlights(hits);
  if (hits.length) treeService.centerOnNode(hits[0]);
}

function runQuickAdd() {
  const allowed = getAllowedNodeTypes(getAppSetting('editorMode') || 'basic');
  const value = window.prompt(`Quick add node type (${allowed.join('/')})`, allowed[0] || 'rng');
  if (!value) return;
  const type = value.trim().toLowerCase();
  if (!allowed.includes(type)) return showError('Unknown node type for current mode');
  dispatch({ type: 'ADD_ROOT_NODE', nodeType: type });
}

function handleKeyboardShortcuts(event) {
  const selectedId = treeService.getSelectedNodeId();
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); editorStore.undo(); }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') { event.preventDefault(); editorStore.redo(); }
  if (event.key === 'Delete' && selectedId != null) { event.preventDefault(); requestNodeRemoval(selectedId); }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd' && selectedId != null) { event.preventDefault(); dispatch({ type: 'DUPLICATE_SUBTREE', id: selectedId }); }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); runQuickAdd(); }
}

function initMenuBarBehavior() {
  const menuBar = document.querySelector('.menu-left[role="menubar"]');
  if (!menuBar) return;

  menuBar.addEventListener('pointerenter', event => {
    const hoveredItem = event.target.closest('.menu-item');
    if (!hoveredItem) return;
    const active = document.activeElement;
    if (!(active instanceof HTMLElement) || !menuBar.contains(active) || hoveredItem.contains(active)) return;
    active.blur();
  }, true);

  menuBar.addEventListener('click', event => {
    const menuAction = event.target.closest('.menu-dropdown [data-action]');
    if (!menuAction) return;
    const active = document.activeElement;
    if (active instanceof HTMLElement) active.blur();
  });

  document.addEventListener('click', event => {
    if (event.target.closest('.menu-item')) return;
    const active = document.activeElement;
    if (active instanceof HTMLElement && menuBar.contains(active)) active.blur();
  });
}

export function initEditorUI() {
  document.addEventListener('click', handleClick);
  document.addEventListener('change', handleChange);
  document.addEventListener('input', handleInput);
  document.addEventListener('dblclick', handleDblClick);
  document.addEventListener('keydown', handleKeyboardShortcuts);
  document.addEventListener('contextmenu', openNodeContextMenu);
  document.addEventListener('click', closeContextMenu);
  document.addEventListener('click', event => {
    const closeTrigger = event.target.closest('[data-role="close-import-xml"]');
    if (closeTrigger) closeImportXmlModal();
    const placeholderTrigger = event.target.closest('[data-role="import-xml-placeholder"]');
    if (placeholderTrigger) showNeutral(t('importXmlPlaceholderDescription'));
  });
  document.addEventListener('change', event => {
    if (event.target.id !== 'import-xml-file') return;
    const fileName = document.getElementById('import-xml-file-name');
    if (fileName) fileName.textContent = event.target.files?.[0]?.name || t('importXmlNoFile');
  });
  document.addEventListener('dragover', event => {
    const dropzone = event.target.closest('.import-xml-dropzone');
    if (!dropzone) return;
    event.preventDefault();
    dropzone.classList.add('is-dragover');
  });
  document.addEventListener('dragleave', event => {
    const dropzone = event.target.closest('.import-xml-dropzone');
    if (!dropzone) return;
    if (dropzone.contains(event.relatedTarget)) return;
    dropzone.classList.remove('is-dragover');
  });
  document.addEventListener('drop', event => {
    const dropzone = event.target.closest('.import-xml-dropzone');
    if (!dropzone) return;
    event.preventDefault();
    dropzone.classList.remove('is-dragover');
    const fileName = document.getElementById('import-xml-file-name');
    const files = event.dataTransfer?.files;
    if (files?.length && fileName) fileName.textContent = files[0].name;
  });

  initSettingsController();
  editorStore.setEditorMode(getAppSetting('editorMode') || 'basic');
  initMenuBarBehavior();
  initButtonIcons();
  applyLocalization();
  updateMenuThemeStatus();

  onThemeChange(() => {
    renderModel();
    updateMenuThemeStatus();
  });

  onLangChange(() => {
    applyLocalization();
    updateMenuThemeStatus();
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
  setViewMode('node');

  subscribeAppSettings(settings => {
    if (settings.editorMode !== editorStore.getState().editorMode) editorStore.setEditorMode(settings.editorMode || 'basic');
    applyEditorMode();
  });

  renderEvents();
  applyEditorMode();
  renderModel();
  updateXML();
}

function applyEditorMode() {
  const mode = getAppSetting('editorMode') || 'basic';
  const def = getModeDefinition(mode);
  document.body.dataset.editorMode = mode;
  document.querySelectorAll('[data-editor-mode-option]').forEach(button => {
    const active = button.dataset.mode === mode;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', active ? 'true' : 'false');
  });
  document.querySelectorAll('[data-node-type]').forEach(button => {
    const enabled = def.availableNodeTypes.includes(button.dataset.nodeType);
    button.hidden = !enabled;
  });
}


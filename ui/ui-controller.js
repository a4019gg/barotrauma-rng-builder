import { editorStore } from '../state/store.js';
import { dispatch } from './action-dispatcher.js';
import { renderNode } from './node-renderer.js';
import { buildEventXML } from '../io/xml-export.js';
import { openDatabasePanel } from '../services/db/db-panel.js';
import { TreeService } from '../services/tree/tree-service.js';
import { showConfirmPopup, showError, showSuccess, showNeutral } from './popup.js';
import { applyLocalization, formatL10n, getLang, onLangChange, setLang, t } from './localization.js';
import { initSettingsController, openSettingsPanel } from './settings-controller.js';
import { initDocumentationView, refreshDocumentationView } from '../services/docs/documentation-view.js';
import * as documentationStore from '../services/docs/documentation-store.js';
import { setDocumentationLanguage } from '../services/docs/docs-loc.js';
import { appendIconLabel } from './icon-component.js';
import { initTooltips, setTooltip } from './tooltip.js';
import { renderTreeOutline } from './tree-view.js';
import { getThemeState, onThemeChange, setBaseTheme, setSfAccentPreset, setThemeMode, setUiScale } from './theme-manager.js';
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
  return showConfirmPopup(t(messageKey), { confirmText: t('confirm'), cancelText: t('cancel') });
}

function getOutputToggleLabel(collapsed) {
  return formatL10n(collapsed ? 'outputPanelExpand' : 'outputPanelCollapse', { label: t('output') });
}

async function requestNodeRemoval(id) {
  if (!Number.isFinite(Number(id))) return false;
  if (!await confirmAction('confirmRemoveNode')) return false;
  dispatch({ type: 'REMOVE_NODE', id: Number(id) });
  return true;
}

async function requestClearCurrentEvent() {
  if (!await confirmAction('confirmClearEvent')) return false;
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
  toggle.textContent = getOutputToggleLabel(collapsed);
  localStorage.setItem(OUTPUT_COLLAPSE_STORAGE_KEY, collapsed ? '1' : '0');
}

function setViewMode(mode) {
  const nextMode = mode === 'tree' ? 'tree' : 'node';
  const classic = document.getElementById('classic-view');
  const tree = document.getElementById('tree-container');
  const segmented = document.getElementById('view-segmented');
  if (!classic || !tree || !segmented) return;

  const isTree = nextMode === 'tree';
  // Persist the active editor view so Tree mode can be restored after reloads.
  document.body.dataset.viewMode = nextMode;
  setAppSetting('viewMode', nextMode);
  tree.style.display = isTree ? 'block' : 'none';
  classic.style.display = isTree ? 'none' : 'block';
  segmented.dataset.viewMode = nextMode;
  segmented.style.setProperty('--active-index', nextMode === 'tree' ? '1' : '0');

  segmented.querySelectorAll('.segmented-option').forEach(button => {
    const active = button.dataset.viewMode === nextMode;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', active ? 'true' : 'false');
  });

  if (isTree) treeService.renderQueued(editorStore.getState().currentEvent.model);
}

function setTreePanelButtonsState() {
  const treeContainer = document.getElementById('tree-container');
  if (!treeContainer) return;
  const summaryHidden = treeContainer.classList.contains('hide-tree-summary');
  const settingsHidden = treeContainer.classList.contains('hide-tree-settings');
  const summaryButton = treeContainer.querySelector('button[data-action="toggleTreeSummaryPanel"]');
  const settingsButton = treeContainer.querySelector('button[data-action="toggleTreeSettingsPanel"]');
  if (summaryButton) {
    summaryButton.textContent = summaryHidden ? '▶' : '◀';
    summaryButton.title = t(summaryHidden ? 'showTreeSummaryPanel' : 'hideTreeSummaryPanel');
  }
  if (settingsButton) {
    settingsButton.textContent = settingsHidden ? '◀' : '▶';
    settingsButton.title = t(settingsHidden ? 'showTreeSettingsPanel' : 'hideTreeSettingsPanel');
  }
}

function initTreePanelToggles() {
  const treeContainer = document.getElementById('tree-container');
  if (!treeContainer) return;
  treeContainer.classList.toggle('hide-tree-summary', localStorage.getItem('treePanel.summaryHidden') === '1');
  treeContainer.classList.toggle('hide-tree-settings', localStorage.getItem('treePanel.settingsHidden') === '1');
  setTreePanelButtonsState();
}

function setActiveModule(moduleName) {
  const nextModule = moduleName === 'documentation' ? 'documentation' : 'editor';
  const editorArea = document.getElementById('editor-area');
  const documentationView = document.getElementById('documentation-view');
  const documentationButton = document.querySelector('button[data-action="openDocumentation"][data-action-tier="secondary"]');
  if (!editorArea || !documentationView) return;

  document.body.dataset.activeModule = nextModule;
  editorArea.hidden = nextModule !== 'editor';
  documentationView.hidden = nextModule !== 'documentation';

  if (documentationButton) {
    documentationButton.classList.toggle('is-selected', nextModule === 'documentation');
    documentationButton.setAttribute('aria-pressed', nextModule === 'documentation' ? 'true' : 'false');
  }

  if (nextModule === 'documentation') {
    initDocumentationView(documentationView);
    refreshDocumentationView();
    return;
  }

  renderModel();
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
    row.innerHTML = `<td colspan="4">${t('noTerminalSpawnNodes')}</td>`;
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
  add(t('addChild'), () => dispatch({ type: 'ADD_CHILD_NODE', parentId: Number(nodeId), nodeType: 'rng' }));
  add(t('duplicateNode'), () => {
    const result = dispatch({ type: 'DUPLICATE_SUBTREE', id: Number(nodeId) });
    if (document.body.dataset.viewMode === 'tree' && result?.nodeId != null) treeService.autoLayoutSubtree(result.nodeId);
  });
  add(t('copySubtree'), () => dispatch({ type: 'COPY_SUBTREE', id: Number(nodeId) }));
  add(t('pasteSubtree'), () => dispatch({ type: 'PASTE_SUBTREE', parentId: Number(nodeId) }));
  add(t('removeNode'), () => requestNodeRemoval(Number(nodeId)));
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
    ['button[data-action="openDocumentation"][data-action-tier="secondary"]', 'book-open', 'documentation'],
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

  const tooltipMap = [
    ['button[data-action="openDB"]', 'Open the Barotrauma database browser.'],
    ['button[data-action="openDocumentation"][data-action-tier="secondary"]', 'Open the built-in documentation module.'],
    ['#editor-mode-segmented', 'Switch between Basic and Advanced editing modes.'],
    ['button[data-mode="basic"]', 'Basic mode shows the simplest controls.'],
    ['button[data-mode="advanced"]', 'Advanced mode shows every available editor control.'],
    ['#view-segmented', 'Switch between node cards and the readable tree summary.'],
    ['button[data-view-mode="node"]', 'Open the node-card editor.'],
    ['button[data-view-mode="tree"]', 'Open the readable tree summary.'],
    ['button[data-action="addNode"][data-type="rng"]', 'Add random branching logic.'],
    ['button[data-action="addNode"][data-type="event"]', 'Add event (defines what happens).'],
    ['button[data-action="addNode"][data-type="eventSet"]', 'Add nested event set (advanced use).'],
    ['button[data-action="addNode"][data-type="spawn"]', 'Add item action.'],
    ['button[data-action="addNode"][data-type="creature"]', 'Add creature action.'],
    ['button[data-action="addNode"][data-type="affliction"]', 'Add affliction action.'],
    ['button[data-action="undo"]', 'Undo the last editor change.'],
    ['button[data-action="redo"]', 'Redo the last undone change.']
  ];

  tooltipMap.forEach(([selector, message]) => {
    document.querySelectorAll(selector).forEach(element => setTooltip(element, message));
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
    tab.innerHTML = `<span class="event-tab-title" title="${t('renameEventHint')}">${event.id}</span>${state.events.length > 1 ? `<span class="event-tab-close ${pendingDelete ? 'pending' : ''}" data-action="removeEvent" data-index="${index}" title="${pendingDelete ? t('confirmRemoveEvent') : t('removeNode')}">${pendingDelete ? '!' : '×'}</span>` : ''}`;
    if (index === state.currentEventIndex) tab.classList.add('active');
    list.appendChild(tab);
  });

  const addTab = document.createElement('button');
  addTab.type = 'button';
  addTab.className = 'event-tab event-tab-add';
  addTab.dataset.action = 'addEvent';
  addTab.textContent = '+';
  addTab.title = t('eventTabAdd');
  addTab.disabled = state.events.length >= 7;
  list.appendChild(addTab);

  document.getElementById('event-id').value = state.currentEvent.id;
}

function renderModel() {
  const root = document.getElementById('root-children');
  root.innerHTML = '';

  const state = editorStore.getState();
  state.currentEvent.model.forEach(node => root.appendChild(renderNode(node, state.editorMode)));

  renderTreeOutline(state.currentEvent.model, document.getElementById('tree-outline'));

  if (document.getElementById('tree-container').style.display === 'block') {
    treeService.renderQueued(state.currentEvent.model);
  }
  setTreePanelButtonsState();
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

function openProjectImportModal() {
  const modal = document.getElementById('import-project-modal');
  const fileInput = document.getElementById('import-project-file');
  const fileName = document.getElementById('import-project-file-name');
  if (!modal || !fileInput || !fileName) return;
  modal.hidden = false;
  applyLocalization(modal);
  fileName.textContent = fileInput.files?.[0]?.name || t('importXmlNoFile');
}

function closeProjectImportModal() {
  const modal = document.getElementById('import-project-modal');
  if (modal) modal.hidden = true;
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
  document.querySelectorAll('button[data-action="setSfAccentPreset"]').forEach(button => {
    const selected = button.dataset.value === theme.sfAccentPreset;
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-checked', selected ? 'true' : 'false');
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
  modal.innerHTML = `<div class="about-modal-backdrop" data-role="close"></div><section class="about-modal-panel" role="dialog" aria-modal="true" aria-label="${t('aboutTitle')}"><h3>${t('aboutHeading')}</h3><p>${t('aboutBody1')}</p><p>${t('aboutBody2')}</p><button type="button" data-role="close">${t('close')}</button></section>`;
  modal.addEventListener('click', event => {
    if (event.target.dataset.role === 'close') modal.remove();
  });
  document.body.appendChild(modal);
}

async function handleMenuDeleteSelected() {
  const selectedId = treeService.getSelectedNodeId();
  if (selectedId == null) {
    showNeutral(t('selectNodeDelete'));
    return;
  }
  await requestNodeRemoval(selectedId);
}

function handleMenuDuplicateSelected() {
  const selectedId = treeService.getSelectedNodeId();
  if (selectedId == null) {
    showNeutral(t('selectNodeDuplicate'));
    return;
  }
  const result = dispatch({ type: 'DUPLICATE_SUBTREE', id: selectedId });
  if (document.body.dataset.viewMode === 'tree' && result?.nodeId != null) treeService.autoLayoutSubtree(result.nodeId);
}

async function handleClick(event) {
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
  if (action === 'removeNode') {
    await requestNodeRemoval(id);
    return;
  }
  if (action === 'clearAll') {
    await requestClearCurrentEvent();
    return;
  }

  if (action === 'setViewMode') setViewMode(actionEl.dataset.viewMode);
  if (action === 'openEditorModule') setActiveModule('editor');
  if (action === 'openDB') openDatabasePanel().catch(() => showError(t('dbLoadError')));

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

  if (action === 'projectImport') openProjectImportModal();
  if (action === 'projectExport') handleProjectStub();
  if (action === 'toggleTreeSummaryPanel') {
    const treeContainer = document.getElementById('tree-container');
    if (!treeContainer) return;
    const hidden = treeContainer.classList.toggle('hide-tree-summary');
    localStorage.setItem('treePanel.summaryHidden', hidden ? '1' : '0');
    setTreePanelButtonsState();
  }
  if (action === 'toggleTreeSettingsPanel') {
    const treeContainer = document.getElementById('tree-container');
    if (!treeContainer) return;
    const hidden = treeContainer.classList.toggle('hide-tree-settings');
    localStorage.setItem('treePanel.settingsHidden', hidden ? '1' : '0');
    setTreePanelButtonsState();
  }

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
  if (action === 'menuDeleteSelected') await handleMenuDeleteSelected();
  if (action === 'menuDuplicateSelected') handleMenuDuplicateSelected();
  if (action === 'menuSetThemeMode') setThemeMode(actionEl.dataset.value);
  if (action === 'menuSetBaseTheme') setBaseTheme(actionEl.dataset.value);
  if (action === 'menuSetUiScale') setUiScale(actionEl.dataset.value);
  if (action === 'setSfAccentPreset') setSfAccentPreset(actionEl.dataset.value);
  if (action === 'openDocumentation') setActiveModule('documentation');
  if (action === 'openWiki') window.open('https://barotraumagame.com/wiki', '_blank', 'noopener');
  if (action === 'openGithub') window.open('https://github.com/a4019gg/barotrauma-rng-builder', '_blank', 'noopener');
  if (action === 'reportIssue') window.open('https://github.com/a4019gg/barotrauma-rng-builder/issues', '_blank', 'noopener');
  if (action === 'aboutApp') openAboutPanel();
  if (action === 'basePresetPlaceholder') handleMenuStub(t('basePresetPlaceholder'));
  if (action === 'probabilityAnalysis' || action === 'loadPreset' || action === 'savePreset' || action === 'managePreset') {
    handleMenuStub(t('featureUpcoming'));
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
  if (!model.length) showNeutral(t('simulationCompletedEmpty'));
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
  showNeutral(warnings.length ? warnings.slice(0, 25).join('\n') : t('validationNoIssues'));
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
  const value = window.prompt(formatL10n('quickAddPrompt', { types: allowed.join('/') }), allowed[0] || 'rng');
  if (!value) return;
  const type = value.trim().toLowerCase();
  if (!allowed.includes(type)) return showError(t('unknownNodeTypeForMode'));
  dispatch({ type: 'ADD_ROOT_NODE', nodeType: type });
}

function handleKeyboardShortcuts(event) {
  const selectedId = treeService.getSelectedNodeId();
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); editorStore.undo(); }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') { event.preventDefault(); editorStore.redo(); }
  if (event.key === 'Delete' && selectedId != null) { event.preventDefault(); requestNodeRemoval(selectedId); }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd' && selectedId != null) {
    event.preventDefault();
    const result = dispatch({ type: 'DUPLICATE_SUBTREE', id: selectedId });
    if (document.body.dataset.viewMode === 'tree' && result?.nodeId != null) treeService.autoLayoutSubtree(result.nodeId);
  }
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
    const closeProjectTrigger = event.target.closest('[data-role="close-import-project"]');
    if (closeProjectTrigger) closeProjectImportModal();
    const placeholderTrigger = event.target.closest('[data-role="import-xml-placeholder"]');
    if (placeholderTrigger) showNeutral(t('importXmlPlaceholderDescription'));
    const projectPlaceholderTrigger = event.target.closest('[data-role="import-project-placeholder"]');
    if (projectPlaceholderTrigger) showNeutral(t('projectImportPlaceholderDescription'));
  });
  document.addEventListener('change', event => {
    if (event.target.id === 'import-xml-file') {
      const fileName = document.getElementById('import-xml-file-name');
      if (fileName) fileName.textContent = event.target.files?.[0]?.name || t('importXmlNoFile');
    }
    if (event.target.id === 'import-project-file') {
      const fileName = document.getElementById('import-project-file-name');
      if (fileName) fileName.textContent = event.target.files?.[0]?.name || t('importXmlNoFile');
    }
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
    const fileName = dropzone.closest('#import-project-modal')
      ? document.getElementById('import-project-file-name')
      : document.getElementById('import-xml-file-name');
    const files = event.dataTransfer?.files;
    if (files?.length && fileName) fileName.textContent = files[0].name;
  });

  initSettingsController();
  initTreePanelToggles();
  initTooltips();
  editorStore.setEditorMode(getAppSetting('editorMode') || 'basic');
  initMenuBarBehavior();
  initButtonIcons();
  setDocumentationLanguage(getLang());
  documentationStore.init();
  initDocumentationView(document.getElementById('documentation-view'));
  applyLocalization();
  updateMenuThemeStatus();

  onThemeChange(() => {
    renderModel();
    updateMenuThemeStatus();
  });

  onLangChange(lang => {
    applyLocalization();
    requestAnimationFrame(() => {
      updateMenuThemeStatus();
      setOutputCollapsed(document.getElementById('output-panel')?.classList.contains('is-collapsed'));
      setDocumentationLanguage(lang);
      documentationStore.refreshLocalizedState();
      refreshDocumentationView();
      renderEvents();
      renderModel();
      treeService.renderQueued(editorStore.getState().currentEvent.model);
    });
  });

  editorStore.subscribe(() => {
    renderEvents();
    renderModel();
    updateXML();
  });

  const collapsed = localStorage.getItem(OUTPUT_COLLAPSE_STORAGE_KEY) === '1';
  setOutputTab('xml');
  setOutputCollapsed(collapsed);
  setViewMode(getAppSetting('viewMode') || 'node');
  setActiveModule('editor');

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
  const editorModeSegmented = document.getElementById('editor-mode-segmented');
  const activeModeIndex = { basic: 0, advanced: 1 }[mode] ?? 0;
  if (editorModeSegmented) {
    editorModeSegmented.dataset.editorMode = mode;
    editorModeSegmented.style.setProperty('--active-index', String(activeModeIndex));
  }
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

import { editorStore } from '../state/store.js';
import { dispatch } from './action-dispatcher.js';
import { renderNode } from './node-renderer.js';
import { buildEventXML } from '../modules/io/xml-export.js';
import { openDatabasePanel } from '../modules/db/db-panel.js';
import { TreeService } from '../modules/tree/tree-service.js';
import { showConfirmPopup, showError, showSuccess, showNeutral } from './popup.js';
import { applyLocalization, formatL10n, getLang, onLangChange, setLang, t } from './localization.js';
import { initSettingsController, openSettingsPanel } from './settings-controller.js';
import { initDocumentationView, refreshDocumentationView } from '../modules/docs/documentation-view.js';
import * as documentationStore from '../modules/docs/documentation-store.js';
import { setDocumentationLanguage } from '../modules/docs/docs-loc.js';
import { appendIconLabel } from './icon-component.js';
import { initTooltips, setTooltip } from './tooltip.js';
import { renderTreeOutline } from './tree-view.js';
import { XmlViewerService } from '../modules/xml/xml-viewer-service.js';
import { explainEventModel } from '../modules/xml/xml-explain-service.js';
import { getThemeState, onThemeChange, setBaseTheme, setChanceInputMode, setSfAccentPreset, setThemeAccentPreset, setThemeMode, setThemeStyle, setUiScale } from './theme-manager.js';
import { getAppSetting, setAppSetting, subscribeAppSettings } from '../state/app-settings.js';
import { getAllowedNodeTypes, getModeDefinition, getNodeCollections, isActionNode, isContainerNode, isRngNode } from '../core/graph-utils.js';
import { normalizeRngBranchProbabilities } from '../core/rng.js';
import { buildProjectFilename, parseProjectJson, serializeProject } from '../modules/io/project-io.js';
import { preloadInitialResources } from './resource-preload.js';
import { appendChildren, clearElement, createElement } from '../core/safe-dom.js';

let pendingDeleteEventIndex = null;
let pendingDeleteResetTimer = null;
const EVENT_DELETE_CONFIRM_TIMEOUT_MS = 5000;

let searchQuery = '';
let simulationSortDirection = 'desc';

let contextMenuEl = null;
const OUTPUT_COLLAPSE_STORAGE_KEY = 'outputPanelCollapsed';
const OUTPUT_HEIGHT_STORAGE_KEY = 'outputPanelHeight';
const OUTPUT_PANEL_COLLAPSED_HEIGHT = 42;
const OUTPUT_PANEL_MIN_HEIGHT = 140;
const OUTPUT_PANEL_MAX_HEIGHT = 560;
let pendingEventTabSelectTimer = null;
let activeEventRename = null;
let eventTabsCollapsed = localStorage.getItem('eventTabsCollapsed') === '1';

let xmlViewer = null;
let xmlFormatMode = 'pretty';
const nodeDomCache = new Map();
let classicVirtualState = { enabled: false, start: 0, end: Infinity, rafId: null };



function syncXmlHighlight(textarea, layer) {
  if (!textarea || !layer) return;
  const escaped = String(textarea.value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
  layer.innerHTML = escaped
    .replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="xml-comment">$1</span>')
    .replace(/(&lt;\/?)([A-Za-z0-9:_-]+)/g, '$1<span class="xml-tag">$2</span>')
    .replace(/([A-Za-z_:][A-Za-z0-9_.:-]*)(=)(&quot;[\s\S]*?&quot;)/g, '<span class="xml-attr">$1</span>$2<span class="xml-string">$3</span>');
  layer.scrollTop = textarea.scrollTop;
  layer.scrollLeft = textarea.scrollLeft;
}

function confirmAction(messageKey) {
  return showConfirmPopup(t(messageKey), { confirmText: t('confirm'), cancelText: t('cancel') });
}

function getOutputToggleLabel(collapsed) {
  return formatL10n(collapsed ? 'outputPanelExpand' : 'outputPanelCollapse', { label: t('output') });
}

function normalizeNodeId(rawId) {
  if (rawId == null) return null;
  const asText = String(rawId).trim();
  if (!asText) return null;
  return /^-?\d+$/.test(asText) ? Number(asText) : asText;
}

async function requestNodeRemoval(id) {
  const normalizedId = normalizeNodeId(id);
  if (normalizedId == null) return false;
  if (!await confirmAction('confirmRemoveNode')) return false;
  dispatch({ type: 'REMOVE_NODE', id: normalizedId });
  return true;
}

async function requestClearCurrentEvent() {
  if (!await confirmAction('confirmClearEvent')) return false;
  dispatch({ type: 'CLEAR_EVENT' });
  return true;
}
function setOutputTab(tab) {
  const nextTab = ['xml', 'explain', 'simulation'].includes(tab) ? tab : 'xml';
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
  if (collapsed) {
    const currentHeight = panel.getBoundingClientRect().height;
    if (currentHeight > OUTPUT_PANEL_COLLAPSED_HEIGHT + 8) {
      localStorage.setItem(OUTPUT_HEIGHT_STORAGE_KEY, String(Math.round(currentHeight)));
    }
    panel.style.height = `${OUTPUT_PANEL_COLLAPSED_HEIGHT}px`;
    panel.style.minHeight = `${OUTPUT_PANEL_COLLAPSED_HEIGHT}px`;
  } else {
    panel.style.minHeight = '';
    const savedHeight = Number(localStorage.getItem(OUTPUT_HEIGHT_STORAGE_KEY) || 0);
    if (savedHeight > OUTPUT_PANEL_MIN_HEIGHT) {
      panel.style.height = `${Math.min(OUTPUT_PANEL_MAX_HEIGHT, Math.round(savedHeight))}px`;
    } else {
      panel.style.height = '';
    }
  }
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
  const summaryRestoreButton = treeContainer.querySelector('button[data-action="showTreeSummaryPanel"]');
  const settingsRestoreButton = treeContainer.querySelector('button[data-action="showTreeSettingsPanel"]');
  if (summaryButton) {
    summaryButton.textContent = summaryHidden ? '▶' : '◀';
    summaryButton.title = t(summaryHidden ? 'showTreeSummaryPanel' : 'hideTreeSummaryPanel');
  }
  if (settingsButton) {
    settingsButton.textContent = settingsHidden ? '◀' : '▶';
    settingsButton.title = t(settingsHidden ? 'showTreeSettingsPanel' : 'hideTreeSettingsPanel');
  }
  if (summaryRestoreButton) summaryRestoreButton.hidden = !summaryHidden;
  if (settingsRestoreButton) settingsRestoreButton.hidden = !settingsHidden;
}

function initTreePanelToggles() {
  const treeContainer = document.getElementById('tree-container');
  if (!treeContainer) return;
  if (localStorage.getItem('treePanel.summaryHidden') == null) {
    localStorage.setItem('treePanel.summaryHidden', '1');
  }
  treeContainer.classList.toggle('hide-tree-summary', localStorage.getItem('treePanel.summaryHidden') === '1');
  treeContainer.classList.toggle('hide-tree-settings', localStorage.getItem('treePanel.settingsHidden') === '1');
  setTreePanelButtonsState();
}

function setActiveModule(moduleName) {
  const nextModule = moduleName === 'documentation' ? 'documentation' : 'editor';
  const editorArea = document.getElementById('editor-area');
  const documentationView = document.getElementById('documentation-view');
  const openDocumentationButton = document.querySelector('button[data-action="openDocumentation"][data-action-tier="secondary"]');
  const backToEditorButton = document.querySelector('button[data-action="openEditorModule"][data-action-tier="secondary"]');
  if (!editorArea || !documentationView) return;

  document.body.dataset.activeModule = nextModule;
  editorArea.hidden = nextModule !== 'editor';
  documentationView.hidden = nextModule !== 'documentation';
  const documentationOpen = !documentationView.hidden;

  if (openDocumentationButton) {
    openDocumentationButton.hidden = documentationOpen;
  }
  if (backToEditorButton) {
    backToEditorButton.hidden = !documentationOpen;
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
  clearElement(body);
  if (!results.size && !exactResults.size) {
    const row = createElement('tr');
    const cell = createElement('td', { text: t('noTerminalSpawnNodes'), attrs: { colspan: '4' } });
    row.appendChild(cell);
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
      const row = createElement('tr');
      appendChildren(
        row,
        createElement('td', { text: result }),
        createElement('td', { text: String(count) }),
        createElement('td', { text: formatPercent(simulatedProbability) }),
        createElement('td', { text: formatPercent(exactProbability) })
      );
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
  const nodeId = normalizeNodeId(datum?.data?.id);
  if (nodeId == null) return;
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
  add(t('addChild'), () => dispatch({ type: 'ADD_CHILD_NODE', parentId: nodeId, nodeType: 'rng' }));
  add(t('duplicateNode'), () => {
    const result = dispatch({ type: 'DUPLICATE_SUBTREE', id: nodeId });
    if (document.body.dataset.viewMode === 'tree' && result?.nodeId != null) treeService.autoLayoutSubtree(result.nodeId);
  });
  add(t('copySubtree'), () => dispatch({ type: 'COPY_SUBTREE', id: nodeId }));
  add(t('pasteSubtree'), () => dispatch({ type: 'PASTE_SUBTREE', parentId: nodeId }));
  add(t('removeNode'), () => requestNodeRemoval(nodeId));
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
  const iconsEnabled = getAppSetting('buttonIcons') !== false;
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
    ['.menu-dropdown button[data-action="runSimulation"][data-l10n="simulation"]', 'chart-pie', 'simulation'],
    ['#simulation-output-pane .simulation-run-btn[data-action="runSimulation"]', 'chart-pie', 'runSimulation']
  ];

  iconMap.forEach(([selector, iconName, l10nKey]) => {
    document.querySelectorAll(selector).forEach(button => {
      button.textContent = '';
      button.classList.remove('button-with-icon');
      const textEl = document.createElement('span');
      textEl.dataset.l10n = l10nKey;
      textEl.textContent = t(l10nKey);
      button.append(textEl);
      if (iconsEnabled) appendIconLabel(button, { icon: iconName, label: t(l10nKey), l10nKey });
    });
  });

  const tooltipMap = [
    ['button[data-action="openDB"]', t('tooltipOpenDatabase')],
    ['button[data-action="openDocumentation"][data-action-tier="secondary"]', t('tooltipOpenDocumentation')],
    ['button[data-action="openEditorModule"][data-action-tier="secondary"]', t('tooltipBackToEditor')],
    ['#editor-mode-segmented', t('tooltipSwitchEditorMode')],
    ['button[data-mode="basic"]', t('tooltipEditorModeBasic')],
    ['button[data-mode="advanced"]', t('tooltipEditorModeAdvanced')],
    ['#view-segmented', t('tooltipSwitchViewMode')],
    ['button[data-view-mode="node"]', t('tooltipViewModeNode')],
    ['button[data-view-mode="tree"]', t('tooltipViewModeTree')],
    ['button[data-action="addNode"][data-type="rng"]', t('tooltipAddRng')],
    ['button[data-action="addNode"][data-type="event"]', t('tooltipAddEvent')],
    ['button[data-action="addNode"][data-type="eventSet"]', t('tooltipAddEventSet')],
    ['button[data-action="addNode"][data-type="spawn"]', t('tooltipAddItem')],
    ['button[data-action="addNode"][data-type="creature"]', t('tooltipAddCreature')],
    ['button[data-action="addNode"][data-type="affliction"]', t('tooltipAddAffliction')],
    ['button[data-action="undo"]', t('tooltipUndo')],
    ['button[data-action="redo"]', t('tooltipRedo')]
  ];

  tooltipMap.forEach(([selector, message]) => {
    document.querySelectorAll(selector).forEach(element => setTooltip(element, message));
  });
}

function updateSoftStartMenuItem() {
  const toggle = document.getElementById('toggle-soft-start');
  if (!toggle) return;
  toggle.checked = getAppSetting('softStart') === true;
}

function applyXmlFeatureTooltips() {
  const xmlFeatureTooltipById = {
    'xml-feature-syntax': t('xmlFeatureSyntaxTooltip'),
    'xml-feature-warnings': t('xmlFeatureWarningsTooltip'),
    'xml-feature-tooltips': t('xmlFeatureTooltipsTooltip'),
    'xml-feature-inline-hints': t('xmlFeatureInlineHintsTooltip'),
    'toggle-grid': t('gridTooltip'),
    'toggle-button-icons': t('showButtonIconsTooltip'),
    'toggle-editable-labels': t('editableLabelsTooltip'),
    'toggle-soft-start': t('softStartTooltip')
  };
  Object.entries(xmlFeatureTooltipById).forEach(([id, message]) => {
    const input = document.getElementById(id);
    const labelText = input?.closest('label')?.querySelector('span');
    if (labelText) setTooltip(labelText, message);
  });
}

function finishEventRename({ commit = true } = {}) {
  if (!activeEventRename) return;
  const { input, index } = activeEventRename;
  activeEventRename = null;
  if (!input?.isConnected) return;
  if (commit) {
    const nextValue = input.value.trim() || `event_${index + 1}`;
    editorStore.updateEventId(index, nextValue);
    return;
  }
  renderEvents();
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
  finishEventRename({ commit: true });
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

  input.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      finishEventRename({ commit: true });
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      finishEventRename({ commit: false });
    }
  });

  titleEl.replaceWith(input);
  activeEventRename = { input, index };
  input.focus();
  input.select();
}



function renderEvents() {
  if (activeEventRename && !activeEventRename.input?.isConnected) activeEventRename = null;
  const state = editorStore.getState();
  if (pendingDeleteEventIndex != null && pendingDeleteEventIndex >= state.events.length) clearPendingEventDelete();
  const list = document.getElementById('events-tabs');
  if (!list) return;
  clearElement(list);
  list.classList.toggle('is-collapsed', eventTabsCollapsed);

  const toggleLabelKey = eventTabsCollapsed ? 'expandEventTabs' : 'collapseEventTabs';
  const collapseToggle = createElement('button', {
    className: 'event-tabs-toggle icon-btn',
    dataset: { action: 'toggleEventTabs' },
    attrs: { type: 'button', title: t(toggleLabelKey), 'aria-label': t(toggleLabelKey) },
    text: eventTabsCollapsed ? '⮞' : '⮜'
  });
  list.appendChild(collapseToggle);

  state.events.forEach((event, index) => {
    const tab = createElement('button', {
      className: 'event-tab',
      dataset: { action: 'selectEvent', index: String(index) },
      attrs: { type: 'button' }
    });

    const title = createElement('span', {
      className: 'event-tab-title',
      attrs: { title: t('renameEventHint') },
      text: event.id
    });
    tab.appendChild(title);

    const pendingDelete = pendingDeleteEventIndex === index;
    if (state.events.length > 1) {
      const close = createElement('span', {
        className: `event-tab-close${pendingDelete ? ' pending' : ''}`,
        dataset: { action: 'removeEvent', index: String(index) },
        attrs: { title: pendingDelete ? t('confirmRemoveEvent') : t('removeNode') },
        text: pendingDelete ? '!' : '×'
      });
      tab.appendChild(close);
    }

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
  addTab.hidden = eventTabsCollapsed;
  list.appendChild(addTab);

  document.getElementById('event-id').value = state.currentEvent.id;
  document.getElementById('event-id').classList.toggle('input-error', !String(state.currentEvent.id || '').trim());
}

function renderModel(options = {}) {
  const forceRebuild = !!options.forceRebuild;
  const root = document.getElementById('root-children');
  const state = editorStore.getState();
  if (!root) return;
  const view = document.getElementById('classic-view');
  const model = state.currentEvent.model || [];
  if (forceRebuild) nodeDomCache.clear();
  const liveIds = new Set(state.currentEvent.model.map(node => String(node.id)));
  [...nodeDomCache.keys()].forEach(id => {
    if (!liveIds.has(id)) nodeDomCache.delete(id);
  });
  const virtualizationEnabled = model.length > 180;

  if (virtualizationEnabled && !classicVirtualState.enabled && view) {
    const onScroll = () => {
      if (classicVirtualState.rafId) return;
      classicVirtualState.rafId = requestAnimationFrame(() => {
        classicVirtualState.rafId = null;
        renderModel();
      });
    };
    view.addEventListener('scroll', onScroll, { passive: true });
    classicVirtualState = { ...classicVirtualState, enabled: true, onScroll };
  } else if (!virtualizationEnabled && classicVirtualState.enabled && view && classicVirtualState.onScroll) {
    view.removeEventListener('scroll', classicVirtualState.onScroll);
    classicVirtualState = { enabled: false, start: 0, end: Infinity, rafId: null };
  }

  const start = virtualizationEnabled && view ? Math.max(0, Math.floor(view.scrollTop / 280) - 8) : 0;
  const end = virtualizationEnabled && view ? Math.min(model.length, start + Math.ceil((view.clientHeight || 900) / 280) + 18) : model.length;
  classicVirtualState.start = start;
  classicVirtualState.end = end;
  const visible = model.slice(start, end);
  const visibleIds = new Set(visible.map(node => String(node.id)));

  [...root.children].forEach(child => {
    if (!visibleIds.has(child.dataset.id)) child.remove();
  });

  const fragment = document.createDocumentFragment();
  visible.forEach(node => {
    const id = String(node.id);
    let record = nodeDomCache.get(id);
    const nextSignature = JSON.stringify({
      id: node.id,
      type: node.type,
      params: node.params,
      branchIds: (node.branches || []).map(branch => `${branch.id}:${branch.value}:${branch.label}:${(branch.children || []).map(child => child.id).join(',')}`),
      childIds: (node.children || []).map(child => child.id),
      editorMode: state.editorMode
    });
    if (!record || record.signature !== nextSignature) {
      const existingEl = root.querySelector(`[data-id="${CSS.escape(id)}"]`);
      if (existingEl && existingEl !== record?.el) existingEl.remove();
      record = { el: renderNode(node, state.editorMode), signature: nextSignature };
      nodeDomCache.set(id, record);
    }
    fragment.appendChild(record.el);
  });
  root.appendChild(fragment);

  renderTreeOutline(state.currentEvent.model, document.getElementById('tree-outline'));

  if (document.getElementById('tree-container').style.display === 'block') {
    treeService.renderQueued(state.currentEvent.model);
  }
  setTreePanelButtonsState();
}

function updateXML() {
  const { currentEvent } = editorStore.getState();
  const normalizedEventId = String(currentEvent.id || '').trim() || 'error';
  const xml = buildEventXML({
    eventId: normalizedEventId,
    model: currentEvent.model
  });
  xmlViewer?.setMode(xmlFormatMode);
  xmlViewer?.setXml(xml);
  const explainMode = document.getElementById('explain-mode')?.value || 'full';
  const explainOut = document.getElementById('explain-output');
  if (explainOut) explainOut.textContent = explainEventModel({ eventId: currentEvent.id, model: currentEvent.model, mode: explainMode });
}

async function importProjectFromFile(file) {
  if (!file) {
    showError(t('projectImportNoFile'));
    return;
  }
  try {
    const raw = await file.text();
    const projectState = parseProjectJson(raw);
    const loaded = editorStore.loadProject(projectState);
    if (!loaded) throw new Error('Project payload rejected');
    closeProjectImportModal();
    showSuccess(t('projectImported'));
  } catch (error) {
    console.error(error);
    showError(t('projectImportFailed'));
  }
}

function handleProjectExport() {
  try {
    const state = editorStore.getState();
    const json = serializeProject(state);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = buildProjectFilename(state.currentEvent?.id || 'project');
    link.click();
    URL.revokeObjectURL(url);
    showSuccess(t('projectExported'));
  } catch (error) {
    console.error(error);
    showError(t('projectExportFailed'));
  }
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


function applyThemeFlavor(flavor) {
  document.body.dataset.themeFlavor = '';
  if (flavor === 'synthwave') {
    setThemeMode('dark');
    setBaseTheme('neon-ops');
    setThemeStyle('soft');
    setThemeAccentPreset('plasma-magenta');
    document.body.dataset.themeFlavor = 'rainbow';
    return;
  }
  if (flavor === 'random') {
    const styles = ['compact', 'balanced', 'soft'];
    const accents = ['theme-base', 'terminal-green', 'amber-phosphor', 'ice-cyan', 'plasma-magenta', 'violet-glow', 'neon-blue', 'ember-red', 'phosphor-lime', 'mono-contrast'];
    const sf = ['emerald-crimson', 'mint-rose', 'neon-cherry', 'forest-ruby', 'lime-magenta', 'aqua-ember', 'teal-violet', 'sage-coral', 'sky-sun'];
    const pick = list => list[Math.floor(Math.random() * list.length)];
    setThemeStyle(pick(styles));
    setThemeAccentPreset(pick(accents));
    setSfAccentPreset(pick(sf));
  }
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
  document.querySelectorAll('.style-theme-item').forEach(item => {
    const selected = item.dataset.themeId === theme.baseTheme;
    item.classList.toggle('is-selected', selected);
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
  document.querySelectorAll('button[data-action="menuSetChanceInputMode"]').forEach(button => {
    const selected = button.dataset.value === theme.chanceInputMode;
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-current', selected ? 'true' : 'false');
  });
  document.querySelectorAll('button[data-action="menuSetAutoChanceMode"]').forEach(button => {
    const selected = button.dataset.value === (getAppSetting('autoChanceMode') || 'off');
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-current', selected ? 'true' : 'false');
  });
  document.querySelectorAll('button[data-action="setSfAccentPreset"]').forEach(button => {
    const selected = button.dataset.value === theme.sfAccentPreset;
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-checked', selected ? 'true' : 'false');
  });
  document.querySelectorAll('button[data-action="setThemeAccentPreset"]').forEach(button => {
    const selected = button.dataset.value === theme.themeAccentPreset;
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
  syncXmlHighlight(textarea, document.getElementById('import-xml-highlight'));
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
  const id = normalizeNodeId(actionEl.dataset.id);

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
  if (action === 'toggleEventTabs') {
    eventTabsCollapsed = !eventTabsCollapsed;
    localStorage.setItem('eventTabsCollapsed', eventTabsCollapsed ? '1' : '0');
    renderEvents();
    return;
  }
  if (action === 'selectEvent') {
    const clickedTitle = event.target.closest('.event-tab-title');
    if (clickedTitle) {
      if (pendingEventTabSelectTimer) clearTimeout(pendingEventTabSelectTimer);
      if (event.detail >= 2) return;
      pendingEventTabSelectTimer = setTimeout(() => {
        dispatch({ type: 'SET_CURRENT_EVENT', index: Number(actionEl.dataset.index) });
        pendingEventTabSelectTimer = null;
      }, 220);
      return;
    }
    dispatch({ type: 'SET_CURRENT_EVENT', index: Number(actionEl.dataset.index) });
  }
  if (action === 'addNode') dispatch({ type: 'ADD_ROOT_NODE', nodeType: actionEl.dataset.type });
  if (action === 'setEditorMode') { setAppSetting('editorMode', actionEl.dataset.mode); editorStore.setEditorMode(actionEl.dataset.mode); applyEditorMode(); }
  if (action === 'addChildNode') dispatch({ type: 'ADD_CHILD_NODE', parentId: normalizeNodeId(actionEl.dataset.parentId), branch: actionEl.dataset.branch || null, nodeType: actionEl.dataset.type });
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
    const xml = xmlViewer?.copyPlain() || document.getElementById('output')?.value || '';
    navigator.clipboard.writeText(xml).then(() => showSuccess(t('xmlCopied'))).catch(() => showError(t('copyFailed')));
  }

  if (action === 'downloadXML') {
    const blob = new Blob([xmlViewer?.copyPlain() || ''], { type: 'text/plain;charset=utf-8' });
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
  if (action === 'projectExport') handleProjectExport();
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
  if (action === 'xmlSearchNext') xmlViewer?.goToSearch(1);
  if (action === 'xmlSearchPrev') xmlViewer?.goToSearch(-1);
  if (action === 'toggleXmlFormat') {
    xmlFormatMode = xmlFormatMode === 'pretty' ? 'minify' : 'pretty';
    actionEl.textContent = t(xmlFormatMode === 'pretty' ? 'xmlFormatPretty' : 'xmlFormatMinify');
    updateXML();
  }
  if (action === 'validateTree') runValidation();
  if (action === 'menuDeleteSelected') await handleMenuDeleteSelected();
  if (action === 'menuDuplicateSelected') handleMenuDuplicateSelected();
  if (action === 'menuSetThemeMode') setThemeMode(actionEl.dataset.value);
  if (action === 'menuSetThemeFlavor') applyThemeFlavor(actionEl.dataset.value);
  if (action === 'menuSetBaseTheme') {
    setBaseTheme(actionEl.dataset.value);
  }
  if (action === 'menuSetUiScale') setUiScale(actionEl.dataset.value);
  if (action === 'menuSetChanceInputMode') setChanceInputMode(actionEl.dataset.value);
  if (action === 'menuSetAutoChanceMode') setAppSetting('autoChanceMode', actionEl.dataset.value);
  if (action === 'setSfAccentPreset') setSfAccentPreset(actionEl.dataset.value);
  if (action === 'setThemeAccentPreset') setThemeAccentPreset(actionEl.dataset.value);
  if (action === 'showTreeSummaryPanel') {
    const treeContainer = document.getElementById('tree-container');
    if (!treeContainer) return;
    treeContainer.classList.remove('hide-tree-summary');
    localStorage.setItem('treePanel.summaryHidden', '0');
    setTreePanelButtonsState();
  }
  if (action === 'showTreeSettingsPanel') {
    const treeContainer = document.getElementById('tree-container');
    if (!treeContainer) return;
    treeContainer.classList.remove('hide-tree-settings');
    localStorage.setItem('treePanel.settingsHidden', '0');
    setTreePanelButtonsState();
  }
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
    dispatch({ type: 'UPDATE_NODE_PARAM', id: normalizeNodeId(el.dataset.id), key: el.dataset.key, value });
  }
  if (el.dataset.action === 'updateBranch') {
    dispatch({ type: 'UPDATE_BRANCH', id: normalizeNodeId(el.dataset.id), branchId: el.dataset.branchId, key: el.dataset.key, value: el.value });
  }
}


function handleDblClick(event) {
  const title = event.target.closest('.event-tab-title');
  if (!title) return;
  if (pendingEventTabSelectTimer) {
    clearTimeout(pendingEventTabSelectTimer);
    pendingEventTabSelectTimer = null;
  }
  event.preventDefault();
  event.stopPropagation();
  startEventRename(title);
}

function handleInput(event) {
  if (event.target.id === 'event-id') {
    dispatch({ type: 'UPDATE_EVENT_ID', index: editorStore.getState().currentEventIndex, eventId: event.target.value }, { skipHistory: true });
  }
  if (event.target.id === 'import-xml-textarea') {
    syncXmlHighlight(event.target, document.getElementById('import-xml-highlight'));
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

function initOutputPanelUX() {
  const panel = document.getElementById('output-panel');
  const handle = document.getElementById('output-resize-handle');
  const output = document.getElementById('output');
  const outputHighlight = document.getElementById('output-highlight');
  const importTextarea = document.getElementById('import-xml-textarea');
  const importHighlight = document.getElementById('import-xml-highlight');
  const tooltip = document.getElementById('xml-hover-tooltip');
  const searchInput = document.getElementById('xml-search');
  const searchCount = document.getElementById('xml-search-count');
  if (!panel || !handle || !output || !outputHighlight || !importTextarea || !importHighlight) return;

  const savedHeight = Number(localStorage.getItem(OUTPUT_HEIGHT_STORAGE_KEY) || 0);
  if (savedHeight > OUTPUT_PANEL_MIN_HEIGHT) panel.style.height = `${Math.min(OUTPUT_PANEL_MAX_HEIGHT, savedHeight)}px`;

  const startResize = event => {
    event.preventDefault();
    if (panel.classList.contains('is-collapsed')) return;
    const startY = event.clientY;
    const startHeight = panel.getBoundingClientRect().height;
    const onMove = moveEvent => {
      const nextHeight = Math.max(OUTPUT_PANEL_MIN_HEIGHT, Math.min(OUTPUT_PANEL_MAX_HEIGHT, startHeight + (startY - moveEvent.clientY)));
      panel.style.height = `${Math.round(nextHeight)}px`;
      localStorage.setItem(OUTPUT_HEIGHT_STORAGE_KEY, String(Math.round(nextHeight)));
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };
  handle.addEventListener('pointerdown', startResize);

  xmlViewer = new XmlViewerService({
    textarea: output,
    layer: outputHighlight,
    tooltip,
    searchInput,
    searchCount,
    onElementClick: detail => {
      if (detail?.identifier) showNeutral(`XML click: ${detail.tag} → ${detail.identifier}`);
    }
  });
  syncXmlHighlight(importTextarea, importHighlight);

  const resizeObserver = new ResizeObserver(() => {
    xmlViewer?.syncScroll();
    syncXmlHighlight(importTextarea, importHighlight);
  });
  resizeObserver.observe(panel);
  resizeObserver.observe(importTextarea);
}

export async function initEditorUI() {
  if (getAppSetting('softStart') !== true) {
    await preloadInitialResources();
  }

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
    const projectImportTrigger = event.target.closest('[data-role="import-project-placeholder"]');
    if (projectImportTrigger) {
      const file = document.getElementById('import-project-file')?.files?.[0] || null;
      importProjectFromFile(file);
    }
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
  document.addEventListener('change', event => {
    if (event.target.id === 'explain-mode') updateXML();
    if (event.target.id === 'xml-feature-syntax') xmlViewer?.setFeatures({ syntax: event.target.checked });
    if (event.target.id === 'xml-feature-warnings') xmlViewer?.setFeatures({ warnings: event.target.checked });
    if (event.target.id === 'xml-feature-tooltips') xmlViewer?.setFeatures({ tooltips: event.target.checked });
    if (event.target.id === 'xml-feature-inline-hints') xmlViewer?.setFeatures({ inlineHints: event.target.checked });
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
    const isProjectDrop = Boolean(dropzone.closest('#import-project-modal'));
    const fileName = isProjectDrop
      ? document.getElementById('import-project-file-name')
      : document.getElementById('import-xml-file-name');
    const input = isProjectDrop
      ? document.getElementById('import-project-file')
      : document.getElementById('import-xml-file');
    const files = event.dataTransfer?.files;
    if (files?.length) {
      if (input) {
        const transfer = new DataTransfer();
        transfer.items.add(files[0]);
        input.files = transfer.files;
      }
      if (fileName) fileName.textContent = files[0].name;
    }
  });
  document.addEventListener('scroll', event => {
    if (event.target?.id === 'output') xmlViewer?.syncScroll();
    if (event.target?.id === 'import-xml-textarea') syncXmlHighlight(event.target, document.getElementById('import-xml-highlight'));
  }, true);

  initSettingsController();
  initTreePanelToggles();
  initTooltips();
  applyXmlFeatureTooltips();
  editorStore.setEditorMode(getAppSetting('editorMode') || 'basic');
  initMenuBarBehavior();
  initOutputPanelUX();
  setDocumentationLanguage(getLang());
  documentationStore.init();
  initDocumentationView(document.getElementById('documentation-view'));
  applyLocalization();
  initButtonIcons();
  updateSoftStartMenuItem();
  updateMenuThemeStatus();

  onThemeChange(() => {
    renderModel({ forceRebuild: true });
    updateMenuThemeStatus();
  });

  onLangChange(lang => {
    applyLocalization();
    requestAnimationFrame(() => {
      initButtonIcons();
      applyXmlFeatureTooltips();
      updateMenuThemeStatus();
      setOutputCollapsed(document.getElementById('output-panel')?.classList.contains('is-collapsed'));
      setDocumentationLanguage(lang);
      documentationStore.refreshLocalizedState();
      refreshDocumentationView();
      renderEvents();
      renderModel({ forceRebuild: true });
      treeService.renderQueued(editorStore.getState().currentEvent.model, { forceRebuild: true });
    });
  });

  document.addEventListener('pointerdown', event => {
    if (!activeEventRename) return;
    if (event.target === activeEventRename.input) return;
    finishEventRename({ commit: true });
  }, true);

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
    initButtonIcons();
    updateSoftStartMenuItem();
    applyEditorMode();
    updateMenuThemeStatus();
    renderModel();
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

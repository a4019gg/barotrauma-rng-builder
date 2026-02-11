import { editorStore } from '../state/store.js';
import { renderNode } from './node-renderer.js';
import { buildEventXML } from '../io/xml-export.js';
import { parseEventXML } from '../io/xml-import.js';
import { openDatabasePanel } from '../services/db/db-panel.js';
import { TreeService } from '../services/tree/tree-service.js';
import { showError, showSuccess, showNeutral } from './popup.js';
import { applyLocalization, onLangChange, t } from './localization.js';
import { initSettingsController } from './settings-controller.js';
import { appendIconLabel } from './icon-component.js';

const treeService = new TreeService({
  svgSelector: '#tree-svg',
  inspectorSelector: '#tree-inspector',
  onUpdateParam: (id, key, value) => editorStore.updateNodeParam(id, key, value),
  onRemoveNode: id => editorStore.removeNode(id),
  onAddChild: (parentId, branch, type) => editorStore.addChildNode(parentId, branch, type)
});

function initButtonIcons() {
  const iconMap = [
    ['#view-btn', 'compass', 'treeView'],
    ['button[data-action="openDB"]', 'folder', 'database'],
    ['#settings-toggle', 'gear', 'settings'],
    ['button[data-action="projectImport"]', 'import', 'projectImport'],
    ['button[data-action="projectExport"]', 'export', 'projectExport'],
    ['button[data-action="undo"]', 'minus-circle', null],
    ['button[data-action="redo"]', 'checkmark-circle', null],
    ['button[data-action="addNode"][data-type="rng"]', 'sliders-horizontal', 'addRng'],
    ['button[data-action="addNode"][data-type="spawn"]', 'box', 'addItem'],
    ['button[data-action="addNode"][data-type="creature"]', 'hashtag', 'addCreature'],
    ['button[data-action="addNode"][data-type="affliction"]', 'alert-circle', 'addAffliction'],
    ['button[data-action="addEvent"]', 'plus-square', 'addEvent'],
    ['button[data-action="clearAll"]', 'trash', 'clearEvent'],
    ['button[data-action="generateXML"]', 'code', 'generateXML'],
    ['button[data-action="copyXML"]', 'copy', 'copyXML'],
    ['button[data-action="downloadXML"]', 'download-cloud', 'downloadXML'],
    ['button[data-action="importXML"]', 'upload-cloud', 'importXML']
  ];

  iconMap.forEach(([selector, iconName, l10nKey]) => {
    const button = document.querySelector(selector);
    if (!button) return;
    appendIconLabel(button, { icon: iconName, l10nKey });
  });
}

function renderEvents() {
  const state = editorStore.getState();
  const list = document.getElementById('events-list');
  list.innerHTML = '';

  state.events.forEach((event, index) => {
    const btn = document.createElement('button');
    btn.textContent = `${index + 1}. ${event.id}`;
    btn.dataset.action = 'selectEvent';
    btn.dataset.index = String(index);
    if (index === state.currentEventIndex) btn.classList.add('active');
    list.appendChild(btn);
  });

  document.getElementById('event-id').value = state.currentEvent.id;
}

function renderModel() {
  const root = document.getElementById('root-children');
  root.innerHTML = '';

  const state = editorStore.getState();
  state.currentEvent.model.forEach(node => root.appendChild(renderNode(node)));

  if (document.getElementById('tree-container').style.display === 'block') {
    treeService.render(state.currentEvent.model);
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

  if (!isTree) treeService.render(editorStore.getState().currentEvent.model);
}

function handleProjectStub() {
  showNeutral(t('projectStub'));
}

function handleClick(event) {
  const actionEl = event.target.closest('[data-action]');
  if (!actionEl) return;

  const action = actionEl.dataset.action;
  const id = Number(actionEl.dataset.id);

  if (action === 'addEvent') editorStore.addEvent();
  if (action === 'selectEvent') editorStore.setCurrentEvent(Number(actionEl.dataset.index));
  if (action === 'addNode') editorStore.addRootNode(actionEl.dataset.type);
  if (action === 'addChildNode') editorStore.addChildNode(Number(actionEl.dataset.parentId), actionEl.dataset.branch, actionEl.dataset.type);
  if (action === 'removeNode') editorStore.removeNode(id);
  if (action === 'clearAll') editorStore.clearCurrentEvent();

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
      editorStore.setModel(parsed.model);
      showSuccess(t('xmlImported'));
    } catch (err) {
      showError(err.message || 'XML import failed');
    }
  }

  if (action === 'projectImport' || action === 'projectExport') handleProjectStub();

  if (action === 'undo') editorStore.undo();
  if (action === 'redo') editorStore.redo();
}

function handleChange(event) {
  const el = event.target;
  if (el.dataset.action === 'updateParam') {
    editorStore.updateNodeParam(Number(el.dataset.id), el.dataset.key, el.value);
  }
}

function handleInput(event) {
  if (event.target.id === 'event-id') {
    editorStore.updateCurrentEventId(event.target.value);
  }
}

export function initEditorUI() {
  document.addEventListener('click', handleClick);
  document.addEventListener('change', handleChange);
  document.addEventListener('input', handleInput);

  initSettingsController();
  initButtonIcons();
  applyLocalization();

  onLangChange(() => {
    applyLocalization();
    const viewLabel = document.querySelector('#view-btn [data-l10n]');
    if (viewLabel) {
      viewLabel.textContent = document.getElementById('tree-container').style.display === 'block' ? t('classicView') : t('treeView');
    }
    treeService.render(editorStore.getState().currentEvent.model);
  });

  editorStore.subscribe(() => {
    renderEvents();
    renderModel();
    updateXML();
  });

  renderEvents();
  renderModel();
  updateXML();
}

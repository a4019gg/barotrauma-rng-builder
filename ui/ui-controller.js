import { editorStore } from '../state/store.js';
import { renderNode } from './node-renderer.js';
import { buildEventXML } from '../io/xml-export.js';
import { parseEventXML } from '../io/xml-import.js';
import { openDatabasePanel } from '../services/db/db-panel.js';
import { TreeService } from '../services/tree/tree-service.js';
import { showError, showSuccess } from './popup.js';

const treeService = new TreeService('#tree-svg');

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

  const eventIdInput = document.getElementById('event-id');
  eventIdInput.value = state.currentEvent.id;
}

function renderModel() {
  const root = document.getElementById('root-children');
  root.innerHTML = '';

  const state = editorStore.getState();
  state.currentEvent.model.forEach(node => {
    root.appendChild(renderNode(node));
  });

  const treeVisible = document.getElementById('tree-container').style.display === 'block';
  if (treeVisible) {
    treeService.render(state.currentEvent.model);
  }
}

function updateXML() {
  const state = editorStore.getState();
  const xml = buildEventXML({
    eventId: state.currentEvent.id,
    model: state.currentEvent.model
  });
  document.getElementById('output').value = xml;
}

function toggleView() {
  const classic = document.getElementById('classic-view');
  const tree = document.getElementById('tree-container');
  const button = document.getElementById('view-btn');
  const treeVisible = tree.style.display === 'block';

  if (treeVisible) {
    tree.style.display = 'none';
    classic.style.display = 'block';
    button.textContent = 'Tree View';
  } else {
    tree.style.display = 'block';
    classic.style.display = 'none';
    button.textContent = 'Classic View';
    treeService.render(editorStore.getState().currentEvent.model);
  }
}

function onClick(event) {
  const actionEl = event.target.closest('[data-action]');
  if (!actionEl) return;

  const action = actionEl.dataset.action;
  const id = Number(actionEl.dataset.id);

  if (action === 'addEvent') editorStore.addEvent();
  if (action === 'selectEvent') editorStore.setCurrentEvent(Number(actionEl.dataset.index));
  if (action === 'addNode') editorStore.addRootNode(actionEl.dataset.type);
  if (action === 'addChildNode') editorStore.addChildNode(Number(actionEl.dataset.parentId), actionEl.dataset.branch, actionEl.dataset.type);
  if (action === 'removeNode') editorStore.removeNode(id);

  if (action === 'clearAll') {
    editorStore.clearCurrentEvent();
  }

  if (action === 'toggleView') toggleView();

  if (action === 'openDB') {
    openDatabasePanel().catch(err => {
      console.error(err);
      showError('Failed to open DB panel');
    });
  }

  if (action === 'generateXML') {
    updateXML();
    showSuccess('XML generated');
  }

  if (action === 'copyXML') {
    const out = document.getElementById('output');
    out.select();
    document.execCommand('copy');
    showSuccess('XML copied');
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
    showSuccess('XML downloaded');
  }

  if (action === 'importXML') {
    try {
      const input = document.getElementById('output').value;
      const parsed = parseEventXML(input, () => editorStore.idCounter++);
      editorStore.updateCurrentEventId(parsed.eventId);
      editorStore.setModel(parsed.model);
      showSuccess('XML imported');
    } catch (err) {
      showError(err.message || 'XML import failed');
    }
  }

  if (action === 'undo') editorStore.undo();
  if (action === 'redo') editorStore.redo();
}

function onChange(event) {
  const el = event.target;
  if (!el.dataset.action) return;

  if (el.dataset.action === 'updateParam') {
    editorStore.updateNodeParam(Number(el.dataset.id), el.dataset.key, el.value);
  }
}

function onInput(event) {
  const el = event.target;
  if (el.id === 'event-id') {
    editorStore.updateCurrentEventId(el.value);
  }
}

export function initEditorUI() {
  document.addEventListener('click', onClick);
  document.addEventListener('change', onChange);
  document.addEventListener('input', onInput);

  editorStore.subscribe(() => {
    renderEvents();
    renderModel();
    updateXML();
  });

  renderEvents();
  renderModel();
  updateXML();
}

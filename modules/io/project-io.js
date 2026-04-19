import { NODE_TYPES, ensureNodeShape } from '../../core/graph-utils.js';
import { normalizeEventId, normalizeNodeId, normalizeNodeType, normalizeStringParam, sanitizeParams } from '../../core/input-sanitizer.js';

const PROJECT_FILE_VERSION = 1;

function sanitizeEvent(event, index) {
  const fallbackId = `event_${index + 1}`;
  const eventId = normalizeEventId(event?.id, fallbackId);
  const rawRootNodes = Array.isArray(event?.rootNodes) ? event.rootNodes : [];
  return {
    id: eventId,
    model: rawRootNodes
      .map(node => ensureNodeShape(deserializeNode(node)))
      .filter(Boolean)
  };
}

export function buildProjectSnapshot(state) {
  const events = Array.isArray(state?.events) ? state.events : [];
  const normalizedEvents = events.length
    ? events.map((event, index) => sanitizeEvent(event, index))
    : [{ id: 'event_1', model: [] }];

  const selectedIndex = Number.isInteger(state?.currentEventIndex)
    ? Math.max(0, Math.min(state.currentEventIndex, normalizedEvents.length - 1))
    : 0;

  const editorMode = state?.editorMode === 'advanced' ? 'advanced' : 'basic';
  const projectName = normalizeEventId(state?.currentEvent?.id || normalizedEvents[selectedIndex]?.id || 'project', 'project');
  const idContext = { counters: {}, used: new Set() };

  return {
    type: 'barotrauma-rng-project',
    version: PROJECT_FILE_VERSION,
    projectName,
    editorMode,
    ui: {
      currentEventIndex: selectedIndex
    },
    events: normalizedEvents.map(event => ({
      id: event.id,
      rootNodes: serializeNodes(event.model, idContext)
    }))
  };
}

export function serializeProject(state) {
  return JSON.stringify(buildProjectSnapshot(state), null, 2);
}

export function parseProjectJson(raw) {
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object') throw new Error('Invalid project file format.');
  if (parsed.type !== 'barotrauma-rng-project') throw new Error('Unsupported project file type.');

  const events = Array.isArray(parsed.events) ? parsed.events : [];
  if (!events.length) throw new Error('Project file has no events.');

  const normalizedEvents = events.slice(0, 7).map((event, index) => sanitizeEvent(event, index));
  const currentEventIndex = Number.isInteger(parsed?.ui?.currentEventIndex)
    ? Math.max(0, Math.min(parsed.ui.currentEventIndex, normalizedEvents.length - 1))
    : 0;

  const editorMode = parsed.editorMode === 'advanced' ? 'advanced' : 'basic';

  return {
    events: normalizedEvents,
    currentEventIndex,
    editorMode,
    idCounter: findMaxNodeId(normalizedEvents) + 1
  };
}

function findMaxNodeId(events) {
  let maxId = 0;
  const walk = nodes => {
    nodes.forEach(node => {
      const numericId = Number(String(node?.id || '').match(/(\d+)$/)?.[1]);
      if (Number.isFinite(numericId)) maxId = Math.max(maxId, numericId);
      if (Array.isArray(node?.children)) walk(node.children);
      if (Array.isArray(node?.branches)) node.branches.forEach(branch => walk(Array.isArray(branch?.children) ? branch.children : []));
    });
  };
  events.forEach(event => walk(event.model));
  return maxId;
}

function serializeNodes(nodes, idContext) {
  return (Array.isArray(nodes) ? nodes : []).map(node => serializeNode(node, idContext));
}

function serializeNode(node, idContext) {
  const normalized = ensureNodeShape(structuredClone(node));
  const serializedId = createUniqueId(normalized?.type || 'node', idContext);
  const base = {
    id: serializedId,
    type: normalized.type
  };

  if (normalized.type === 'rng') {
    base.mode = normalized?.params?.mode === 'weight' ? 'weight' : 'probability';
    base.branches = (Array.isArray(normalized.branches) ? normalized.branches : []).map((branch, index) => ({
      id: normalizeNodeId(branch?.id, `branch_${index + 1}`),
      label: normalizeStringParam(branch?.label, ''),
      value: Number(String(branch?.value).replace(',', '.')) || 0,
      children: serializeNodes(branch?.children, idContext)
    }));
    return base;
  }

  const params = normalized?.params && typeof normalized.params === 'object' ? structuredClone(normalized.params) : {};
  if (Object.keys(params).length) base.params = params;
  if (Array.isArray(normalized.children)) base.children = serializeNodes(normalized.children, idContext);
  return base;
}

function deserializeNode(node) {
  if (!node || typeof node !== 'object') return null;
  const nodeType = normalizeNodeType(node.type, NODE_TYPES.spawn);
  const base = {
    id: normalizeNodeId(node.id, `${nodeType}_1`),
    type: nodeType
  };

  if (base.type === 'rng') {
    const mode = node.mode === 'weight' ? 'weight' : 'probability';
    const branches = Array.isArray(node.branches) ? node.branches : [];
    const normalizedBranches = branches.map((branch, index) => ({
      id: normalizeNodeId(branch?.id, `branch_${index + 1}`),
      label: normalizeStringParam(branch?.label, ''),
      value: Number(String(branch?.value).replace(',', '.')) || 0,
      children: Array.isArray(branch?.children) ? branch.children.map(deserializeNode).filter(Boolean) : []
    }));

    return {
      ...base,
      params: { mode },
      branches: normalizedBranches
    };
  }

  return {
    ...base,
    params: sanitizeParams(node?.params && typeof node.params === 'object' ? structuredClone(node.params) : {}),
    children: Array.isArray(node?.children) ? node.children.map(deserializeNode).filter(Boolean) : undefined
  };
}

function createUniqueId(type, idContext) {
  const prefix = `${String(type || 'node').toLowerCase().replace(/[^a-z0-9_]+/g, '_') || 'node'}_`;
  const counters = idContext.counters;
  counters[prefix] = (counters[prefix] || 0) + 1;
  let candidate = `${prefix}${counters[prefix]}`;
  while (idContext.used.has(candidate)) {
    counters[prefix] += 1;
    candidate = `${prefix}${counters[prefix]}`;
  }
  idContext.used.add(candidate);
  return candidate;
}

export function buildProjectFilename(projectName = 'project') {
  const safeName = String(projectName || 'project')
    .trim()
    .replace(/[\\/:*?"<>|%]+/g, '_')
    .replace(/\s+/g, '_') || 'project';
  return `${safeName}.baro-rng.json`;
}

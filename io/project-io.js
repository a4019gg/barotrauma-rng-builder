import { ensureNodeShape } from '../core/graph-utils.js';

const PROJECT_FILE_VERSION = 1;

function sanitizeEvent(event, index) {
  const fallbackId = `event_${index + 1}`;
  const eventId = String(event?.id || '').trim() || fallbackId;
  const rawModel = Array.isArray(event?.model) ? event.model : [];
  return {
    id: eventId,
    model: rawModel.map(node => ensureNodeShape(node))
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
  const projectName = String(state?.currentEvent?.id || normalizedEvents[selectedIndex]?.id || 'project').trim() || 'project';

  return {
    type: 'barotrauma-rng-project',
    version: PROJECT_FILE_VERSION,
    projectName,
    editorMode,
    currentEventIndex: selectedIndex,
    events: normalizedEvents
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
  const currentEventIndex = Number.isInteger(parsed.currentEventIndex)
    ? Math.max(0, Math.min(parsed.currentEventIndex, normalizedEvents.length - 1))
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
      const numericId = Number(node?.id);
      if (Number.isFinite(numericId)) maxId = Math.max(maxId, numericId);
      if (Array.isArray(node?.children)) walk(node.children);
      if (Array.isArray(node?.branches)) node.branches.forEach(branch => walk(Array.isArray(branch?.children) ? branch.children : []));
    });
  };
  events.forEach(event => walk(event.model));
  return maxId;
}

export function buildProjectFilename(projectName = 'project') {
  const safeName = String(projectName || 'project')
    .trim()
    .replace(/[\\/:*?"<>|%]+/g, '_')
    .replace(/\s+/g, '_') || 'project';
  return `${safeName}(event).baro-rng.json`;
}

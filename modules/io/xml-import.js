import { createDefaultParams, ensureNodeShape } from '../../core/graph-utils.js';
import { normalizeEventId, normalizeNodeId, normalizeStringParam, normalizeUnsafePayload, sanitizeParams } from '../../core/input-sanitizer.js';

function parseBooleanAttr(element, key, fallback = false) {
  const value = element.getAttribute(key);
  if (value == null) return fallback;
  return ['true', '1', 'yes'].includes(String(value).toLowerCase());
}

function nextSanitizedId(nextId, fallbackPrefix = 'node') {
  return normalizeNodeId(nextId(), `${fallbackPrefix}_1`);
}

function parseNode(element, nextId) {
  const tag = element.tagName.toLowerCase();

  if (tag === 'randomevent') {
    const chance = (Number(element.getAttribute('chance')) || 50) / 100;
    const node = ensureNodeShape({
      id: nextSanitizedId(nextId, 'rng'),
      type: 'rng',
      params: { mode: 'probability', chance },
      branches: [
        { id: 'success', label: 'Success', value: chance, children: [] },
        { id: 'failure', label: 'Failure', value: 1 - chance, children: [] }
      ]
    });

    const success = element.querySelector(':scope > Success');
    if (success) {
      Array.from(success.children).forEach(child => {
        const parsed = parseNode(child, nextId);
        if (parsed) node.branches[0].children.push(parsed);
      });
    }

    const failure = element.querySelector(':scope > Failure');
    if (failure) {
      Array.from(failure.children).forEach(child => {
        const parsed = parseNode(child, nextId);
        if (parsed) node.branches[1].children.push(parsed);
      });
    }

    node.params.chance = chance;
    node.branches[0].value = chance;
    node.branches[1].value = 1 - chance;
    return node;
  }

  if (tag === 'eventset') {
    const params = { ...createDefaultParams('eventSet') };
    Object.keys(params).forEach(key => {
      if (!element.hasAttribute(key)) return;
      const value = element.getAttribute(key);
      params[key] = typeof params[key] === 'boolean' ? parseBooleanAttr(element, key, params[key]) : (Number.isFinite(Number(params[key])) ? Number(value) : value);
    });
    const node = { id: nextSanitizedId(nextId, 'eventSet'), type: 'eventSet', params: sanitizeParams(params), children: [] };
    Array.from(element.children).forEach(child => {
      const parsed = parseNode(child, nextId);
      if (parsed) node.children.push(parsed);
    });
    return ensureNodeShape(node);
  }

  if (tag === 'event') {
    const node = { id: nextSanitizedId(nextId, 'event'), type: 'event', params: sanitizeParams({ identifier: normalizeStringParam(element.getAttribute('identifier') || '') }), children: [] };
    Array.from(element.children).forEach(child => {
      if (['Success', 'Failure'].includes(child.tagName)) return;
      const parsed = parseNode(child, nextId);
      if (parsed) node.children.push(parsed);
    });
    return ensureNodeShape(node);
  }

  if (tag === 'spawnitem') {
    return {
      id: nextSanitizedId(nextId, 'spawn'),
      type: 'spawn',
      params: {
        item: normalizeUnsafePayload(element.getAttribute('identifier') || ''),
        amount: Number(element.getAttribute('amount')) || 1,
        quality: Number(element.getAttribute('quality')) || 0
      }
    };
  }

  if (tag === 'spawncreature') {
    return {
      id: nextSanitizedId(nextId, 'creature'),
      type: 'creature',
      params: {
        creature: normalizeUnsafePayload(element.getAttribute('identifier') || ''),
        count: Number(element.getAttribute('count')) || 1,
        spawnLocation: normalizeStringParam(element.getAttribute('spawnlocation') || 'inside', 'inside')
      }
    };
  }

  if (tag === 'applyaffliction') {
    return {
      id: nextSanitizedId(nextId, 'affliction'),
      type: 'affliction',
      params: {
        affliction: normalizeUnsafePayload(element.getAttribute('identifier') || ''),
        strength: Number(element.getAttribute('strength')) || 10
      }
    };
  }

  return null;
}

export function parseEventXML(xmlText, nextId) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'application/xml');
  const parseError = doc.querySelector('parsererror');
  if (parseError) throw new Error('XML parse error');

  const event = doc.querySelector('Event');
  if (!event) throw new Error('Event tag not found');

  const model = [];
  Array.from(event.children).forEach(child => {
    if (['Success', 'Failure'].includes(child.tagName)) return;
    const parsed = parseNode(child, nextId);
    if (parsed) model.push(ensureNodeShape(parsed));
  });

  return {
    eventId: normalizeEventId(event.getAttribute('identifier') || 'new_event', 'new_event'),
    model
  };
}

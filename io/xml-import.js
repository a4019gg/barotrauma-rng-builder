import { createDefaultParams, ensureNodeShape } from '../core/graph-utils.js';

function parseBooleanAttr(element, key, fallback = false) {
  const value = element.getAttribute(key);
  if (value == null) return fallback;
  return ['true', '1', 'yes'].includes(String(value).toLowerCase());
}

function parseNode(element, nextId) {
  const tag = element.tagName.toLowerCase();

  if (tag === 'randomevent') {
    const chance = (Number(element.getAttribute('chance')) || 50) / 100;
    const node = ensureNodeShape({
      id: nextId(),
      type: 'rng',
      params: { mode: 'probability', chance },
      children: { success: [], failure: [] }
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
    const node = { id: nextId(), type: 'eventSet', params, children: [] };
    Array.from(element.children).forEach(child => {
      const parsed = parseNode(child, nextId);
      if (parsed) node.children.push(parsed);
    });
    return ensureNodeShape(node);
  }

  if (tag === 'event') {
    const node = { id: nextId(), type: 'event', params: { identifier: element.getAttribute('identifier') || '' }, children: [] };
    Array.from(element.children).forEach(child => {
      if (['Success', 'Failure'].includes(child.tagName)) return;
      const parsed = parseNode(child, nextId);
      if (parsed) node.children.push(parsed);
    });
    return ensureNodeShape(node);
  }

  if (tag === 'spawnitem') {
    return {
      id: nextId(),
      type: 'spawn',
      params: {
        item: element.getAttribute('identifier') || '',
        amount: Number(element.getAttribute('amount')) || 1,
        quality: Number(element.getAttribute('quality')) || 0
      }
    };
  }

  if (tag === 'spawncreature') {
    return {
      id: nextId(),
      type: 'creature',
      params: {
        creature: element.getAttribute('identifier') || '',
        count: Number(element.getAttribute('count')) || 1,
        spawnLocation: element.getAttribute('spawnlocation') || 'inside'
      }
    };
  }

  if (tag === 'applyaffliction') {
    return {
      id: nextId(),
      type: 'affliction',
      params: {
        affliction: element.getAttribute('identifier') || '',
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
    eventId: event.getAttribute('identifier') || 'new_event',
    model
  };
}

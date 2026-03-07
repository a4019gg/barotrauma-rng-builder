import { parseChanceInput } from '../ui/chance-utils.js';

const DEFAULT_PARAMS = {
  rng: { chance: 0.5 },
  spawn: { item: '', amount: 1, quality: 0 },
  creature: { creature: '', count: 1, spawnLocation: 'inside' },
  affliction: { affliction: '', strength: 10 }
};

export function createNode(type, nextId) {
  const node = {
    id: nextId(),
    type,
    params: { ...(DEFAULT_PARAMS[type] || {}) }
  };
  if (type === 'rng') node.children = { success: [], failure: [] };
  return node;
}

export function findNodeById(id, nodes) {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.type === 'rng') {
      const hit = findNodeById(id, node.children.success) || findNodeById(id, node.children.failure);
      if (hit) return hit;
    }
  }
  return null;
}

export function removeNodeById(id, nodes) {
  for (let i = 0; i < nodes.length; i += 1) {
    const node = nodes[i];
    if (node.id === id) return nodes.splice(i, 1)[0];
    if (node.type === 'rng') {
      const hit = removeNodeById(id, node.children.success) || removeNodeById(id, node.children.failure);
      if (hit) return hit;
    }
  }
  return null;
}

export function cloneWithFreshIds(node, nextId) {
  const copy = structuredClone(node);
  const remap = n => {
    n.id = nextId();
    if (n.type === 'rng') {
      n.children.success.forEach(remap);
      n.children.failure.forEach(remap);
    }
  };
  remap(copy);
  return copy;
}

export function normalizeParamValue(key, rawValue) {
  let value = rawValue;
  if (['chance', 'strength'].includes(key)) {
    if (key === 'chance') value = parseChanceInput(rawValue);
    else {
      value = Number(String(rawValue).replace(',', '.'));
      if (!Number.isFinite(value)) value = 0;
    }
  }
  if (['amount', 'count', 'quality'].includes(key)) {
    value = Number(String(rawValue).replace(',', '.'));
    if (!Number.isFinite(value)) value = 1;
  }
  return value;
}

export function collectNodes(nodes, acc = []) {
  nodes.forEach(node => {
    acc.push(node);
    if (node.type === 'rng') {
      collectNodes(node.children.success, acc);
      collectNodes(node.children.failure, acc);
    }
  });
  return acc;
}

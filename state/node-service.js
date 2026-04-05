import { parseChanceInput } from '../ui/chance-utils.js';
import {
  createNode as createGraphNode,
  ensureNodeShape,
  findRngBranch,
  getNodeCollections,
  isContainerNode,
  isRngNode,
  syncLegacyRngChildren
} from '../core/graph-utils.js';


const FLOAT_PARAM_KEYS = new Set(['chance', 'strength', 'minintensity', 'maxintensity', 'minleveldifficulty', 'maxleveldifficulty', 'commonness', 'triggereventcooldown']);
const INT_PARAM_KEYS = new Set(['amount', 'count', 'quality', 'eventcount']);
const BOOLEAN_PARAM_KEYS = new Set(['chooserandom', 'allowatstart', 'perwreck', 'perruin', 'percave', 'ignorecooldown']);

export function createNode(type, nextId) {
  return createGraphNode(type, nextId);
}

export function findNodeById(id, nodes) {
  for (const rawNode of nodes) {
    const node = ensureNodeShape(rawNode);
    if (node.id === id) return node;
    for (const children of getNodeCollections(node)) {
      const hit = findNodeById(id, children);
      if (hit) return hit;
    }
  }
  return null;
}

export function removeNodeById(id, nodes) {
  for (let i = 0; i < nodes.length; i += 1) {
    const node = ensureNodeShape(nodes[i]);
    if (node.id === id) return nodes.splice(i, 1)[0];
    for (const children of getNodeCollections(node)) {
      const hit = removeNodeById(id, children);
      if (hit) {
        syncLegacyRngChildren(node);
        return hit;
      }
    }
  }
  return null;
}

export function cloneWithFreshIds(node, nextId) {
  const copy = ensureNodeShape(structuredClone(node));
  const remap = n => {
    n.id = nextId();
    for (const children of getNodeCollections(n)) {
      children.forEach(remap);
    }
    syncLegacyRngChildren(n);
  };
  remap(copy);
  return copy;
}

export function normalizeParamValue(key, rawValue) {
  let value = rawValue;
  if (FLOAT_PARAM_KEYS.has(key)) {
    if (key === 'chance') value = parseChanceInput(rawValue);
    else {
      value = Number(String(rawValue).replace(',', '.'));
      if (!Number.isFinite(value)) value = 0;
    }
  }
  if (INT_PARAM_KEYS.has(key)) {
    value = Number(String(rawValue).replace(',', '.'));
    if (!Number.isFinite(value)) value = 1;
  }
  if (BOOLEAN_PARAM_KEYS.has(key)) {
    value = rawValue === true || rawValue === 'true';
  }
  return value;
}

export function collectNodes(nodes, acc = []) {
  nodes.forEach(rawNode => {
    const node = ensureNodeShape(rawNode);
    acc.push(node);
    for (const children of getNodeCollections(node)) {
      collectNodes(children, acc);
    }
  });
  return acc;
}

export function getChildList(parent, branchId = null) {
  const node = ensureNodeShape(parent);
  if (isRngNode(node)) {
    const branch = findRngBranch(node, branchId ?? node.branches?.[0]?.id);
    if (!branch) return null;
    syncLegacyRngChildren(node);
    return branch.children;
  }
  if (isContainerNode(node)) return node.children;
  return null;
}

import { parseChanceInput } from '../ui/chance-utils.js';
import {
  createNode as createGraphNode,
  findRngBranch,
  getNodeCollections,
  isContainerNode,
  isRngNode
} from '../core/graph-utils.js';


const FLOAT_PARAM_KEYS = new Set(['chance', 'strength', 'minintensity', 'maxintensity', 'minleveldifficulty', 'maxleveldifficulty', 'commonness', 'triggereventcooldown']);
const INT_PARAM_KEYS = new Set(['amount', 'count', 'quality', 'eventcount']);
const BOOLEAN_PARAM_KEYS = new Set(['chooserandom', 'allowatstart', 'perwreck', 'perruin', 'percave', 'ignorecooldown']);

export function createNode(type, nextId) {
  return createGraphNode(type, nextId);
}

export function findNodeById(id, nodes) {
  const targetId = String(id);
  for (const node of nodes) {
    if (String(node.id) === targetId) return node;
    for (const children of getNodeCollections(node)) {
      const hit = findNodeById(id, children);
      if (hit) return hit;
    }
  }
  return null;
}

export function removeNodeById(id, nodes) {
  const targetId = String(id);
  for (let i = 0; i < nodes.length; i += 1) {
    const node = nodes[i];
    if (String(node.id) === targetId) return nodes.splice(i, 1)[0];
    for (const children of getNodeCollections(node)) {
      const hit = removeNodeById(id, children);
      if (hit) return hit;
    }
  }
  return null;
}

export function cloneWithFreshIds(node, nextId) {
  const copy = structuredClone(node);
  const remap = n => {
    n.id = nextId();
    for (const children of getNodeCollections(n)) {
      children.forEach(remap);
    }
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
  nodes.forEach(node => {
    acc.push(node);
    for (const children of getNodeCollections(node)) {
      collectNodes(children, acc);
    }
  });
  return acc;
}

export function getChildList(parent, branchId = null) {
  const node = parent;
  if (isRngNode(node)) {
    const branch = findRngBranch(node, branchId ?? node.branches?.[0]?.id);
    if (!branch) return null;
    return branch.children;
  }
  if (isContainerNode(node)) return node.children;
  return null;
}

export function createNodeIndex(model) {
  const index = new Map();
  const stack = [{ list: model, parentId: null, branchId: null }];
  while (stack.length) {
    const { list, parentId, branchId } = stack.pop();
    if (!Array.isArray(list)) continue;
    for (const node of list) {
      const id = String(node.id);
      index.set(id, {
        node,
        parentId,
        branchId,
        containerRef: list
      });
      if (isRngNode(node)) {
        (node.branches || []).forEach(branch => {
          stack.push({ list: branch.children, parentId: node.id, branchId: branch.id });
        });
      } else if (isContainerNode(node)) {
        stack.push({ list: node.children, parentId: node.id, branchId: null });
      }
    }
  }
  return index;
}

export function isDescendantInIndex(index, ancestorId, maybeDescendantId) {
  const ancestorKey = String(ancestorId);
  let entry = index.get(String(maybeDescendantId));
  while (entry && entry.parentId != null) {
    if (String(entry.parentId) === ancestorKey) return true;
    entry = index.get(String(entry.parentId));
  }
  return false;
}

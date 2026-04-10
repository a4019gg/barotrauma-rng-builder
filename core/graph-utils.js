export const NODE_TYPES = {
  rng: 'rng',
  event: 'event',
  eventSet: 'eventSet',
  spawn: 'spawn',
  creature: 'creature',
  affliction: 'affliction'
};

export const MODE_DEFINITIONS = {
  basic: {
    label: 'Basic',
    availableNodeTypes: [NODE_TYPES.rng, NODE_TYPES.spawn, NODE_TYPES.creature, NODE_TYPES.affliction],
    maxRngBranches: 2,
    allowNestedContainers: false,
    allowEventSet: false
  },
  advanced: {
    label: 'Advanced',
    availableNodeTypes: [NODE_TYPES.rng, NODE_TYPES.event, NODE_TYPES.eventSet, NODE_TYPES.spawn, NODE_TYPES.creature, NODE_TYPES.affliction],
    maxRngBranches: Infinity,
    allowNestedContainers: true,
    allowEventSet: true
  }
};

export const ACTION_NODE_TYPES = [NODE_TYPES.spawn, NODE_TYPES.creature, NODE_TYPES.affliction];
export const CONTAINER_NODE_TYPES = [NODE_TYPES.event, NODE_TYPES.eventSet];

export function createDefaultRngBranches() {
  return [
    { id: 'success', label: 'Success', value: 0.5, children: [] },
    { id: 'failure', label: 'Failure', value: 0.5, children: [] }
  ];
}

export function createDefaultParams(type) {
  switch (type) {
    case NODE_TYPES.rng:
      return { mode: 'probability', chance: 0.5 };
    case NODE_TYPES.event:
      return { identifier: '' };
    case NODE_TYPES.eventSet:
      return {
        identifier: '',
        chooserandom: true,
        eventcount: 1,
        commonness: 1,
        minintensity: 0,
        maxintensity: 100,
        minleveldifficulty: 0,
        maxleveldifficulty: 100,
        allowatstart: false,
        perwreck: false,
        perruin: false,
        percave: false,
        ignorecooldown: false,
        triggereventcooldown: 0
      };
    case NODE_TYPES.spawn:
      return { item: '', amount: 1, quality: 0 };
    case NODE_TYPES.creature:
      return { creature: '', count: 1, spawnLocation: 'inside' };
    case NODE_TYPES.affliction:
      return { affliction: '', strength: 10 };
    default:
      return {};
  }
}

export function isRngNode(node) {
  return node?.type === NODE_TYPES.rng;
}

export function isContainerNode(node) {
  return CONTAINER_NODE_TYPES.includes(node?.type);
}

export function isActionNode(node) {
  return ACTION_NODE_TYPES.includes(node?.type);
}

export function normalizeBranchValue(value, fallback = 0) {
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function ensureBranch(branch, fallbackId, fallbackLabel) {
  if (!branch || typeof branch !== 'object') {
    return { id: fallbackId, label: fallbackLabel, value: 0, children: [] };
  }
  return {
    id: String(branch.id || fallbackId),
    label: String(branch.label || fallbackLabel),
    value: normalizeBranchValue(branch.value, 0),
    children: Array.isArray(branch.children) ? branch.children.map(ensureNodeShape) : []
  };
}

export function ensureNodeShape(node) {
  if (!node || typeof node !== 'object') return node;
  const normalized = node;
  normalized.params = { ...createDefaultParams(normalized.type), ...(normalized.params || {}) };

  if (normalized.type === NODE_TYPES.rng) {
    normalized.branches = Array.isArray(normalized.branches)
      ? normalized.branches.map((branch, index) => ensureBranch(branch, `branch_${index + 1}`, branch?.label || `Branch ${index + 1}`))
      : createDefaultRngBranches();
    normalized.params.mode = normalized.params.mode === 'weight' ? 'weight' : 'probability';
    normalized.params.chance = Number.isFinite(Number(normalized.params.chance)) ? Math.max(0, Math.min(1, Number(normalized.params.chance))) : 0.5;
  }

  if (isContainerNode(normalized)) {
    normalized.children = Array.isArray(normalized.children) ? normalized.children.map(ensureNodeShape) : [];
  }

  return normalized;
}

export function getNodeCollections(node) {
  if (!node) return [];
  if (isRngNode(node)) return (node.branches || []).map(branch => branch.children || []);
  if (isContainerNode(node)) return [node.children || []];
  return [];
}

export function visitNodeChildren(node, visitor) {
  getNodeCollections(node).forEach(list => list.forEach(child => visitor(child, list)));
}

export function findRngBranch(node, branchId) {
  if (!isRngNode(node)) return null;
  return (node.branches || []).find(branch => String(branch.id) === String(branchId)) || null;
}

export function createNode(type, nextId) {
  const node = {
    id: nextId(),
    type,
    params: createDefaultParams(type)
  };
  if (type === NODE_TYPES.rng) {
    node.branches = createDefaultRngBranches();
  }
  if (isContainerNode(node)) node.children = [];
  return node;
}

export function getAllowedNodeTypes(mode) {
  return MODE_DEFINITIONS[mode]?.availableNodeTypes || MODE_DEFINITIONS.basic.availableNodeTypes;
}

export function canNodeAcceptChildren(node, mode = 'advanced') {
  if (!node) return false;
  if (isRngNode(node)) return true;
  if (!isContainerNode(node)) return false;
  if (mode === 'basic') return false;
  if (node.type === NODE_TYPES.eventSet && mode !== 'advanced') return false;
  return true;
}

export function getModeDefinition(mode) {
  return MODE_DEFINITIONS[mode] || MODE_DEFINITIONS.basic;
}

export function convertLegacyRngToAdvanced(node) {
  const normalized = ensureNodeShape(node);
  if (!isRngNode(normalized)) return normalized;
  normalized.params.mode = 'probability';
  normalized.branches = (normalized.branches || []).map((branch, index) => ({
    ...branch,
    id: index === 0 ? 'branch_1' : index === 1 ? 'branch_2' : `branch_${index + 1}`,
    label: branch.label || `Branch ${index + 1}`
  }));
  return normalized;
}

export function canDowngradeNodeToBasic(node) {
  if (isActionNode(node)) return true;
  if (isRngNode(node)) {
    return (node.branches || []).length === 2
      && node.params?.mode !== 'weight'
      && (node.branches || []).every(branch => branch.children.every(canDowngradeNodeToBasic));
  }
  return false;
}

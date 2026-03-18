import { ensureNodeShape, isRngNode } from './graph-utils.js';

export function normalizeRngBranchProbabilities(node) {
  const normalized = ensureNodeShape(node);
  if (!isRngNode(normalized)) return [];
  const branches = normalized.branches || [];
  if (!branches.length) return [];

  if (normalized.params.mode === 'weight') {
    const totalWeight = branches.reduce((sum, branch) => sum + Math.max(0, Number(branch.value) || 0), 0);
    if (totalWeight <= 0) {
      const even = 1 / branches.length;
      return branches.map(branch => ({ ...branch, probability: even }));
    }
    return branches.map(branch => ({ ...branch, probability: Math.max(0, Number(branch.value) || 0) / totalWeight }));
  }

  if (branches.length === 2 && branches[0].id === 'success' && branches[1].id === 'failure') {
    const chance = Math.max(0, Math.min(1, Number(normalized.params.chance) || Number(branches[0].value) || 0));
    return [
      { ...branches[0], probability: chance },
      { ...branches[1], probability: 1 - chance }
    ];
  }

  const total = branches.reduce((sum, branch) => sum + Math.max(0, Number(branch.value) || 0), 0);
  if (total <= 0) {
    const even = 1 / branches.length;
    return branches.map(branch => ({ ...branch, probability: even }));
  }
  return branches.map(branch => ({ ...branch, probability: Math.max(0, Number(branch.value) || 0) / total }));
}

export function computeBranchProbability(parentProbability, branchProbability) {
  return parentProbability * Math.max(0, Math.min(1, Number(branchProbability) || 0));
}

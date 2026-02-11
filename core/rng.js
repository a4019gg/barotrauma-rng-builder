export function computeBranchProbability(parentProbability, chance, branch) {
  const safeChance = Math.max(0, Math.min(1, Number(chance) || 0));
  if (branch === 'success') return parentProbability * safeChance;
  return parentProbability * (1 - safeChance);
}

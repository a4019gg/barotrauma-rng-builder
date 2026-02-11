import { computeBranchProbability } from './rng.js';

export function flattenWithProbabilities(model, parentProbability = 1, acc = []) {
  model.forEach(node => {
    acc.push({ node, probability: parentProbability });

    if (node.type === 'rng') {
      const chance = node.params.chance ?? 0.5;
      flattenWithProbabilities(node.children.success, computeBranchProbability(parentProbability, chance, 'success'), acc);
      flattenWithProbabilities(node.children.failure, computeBranchProbability(parentProbability, chance, 'failure'), acc);
    }
  });

  return acc;
}

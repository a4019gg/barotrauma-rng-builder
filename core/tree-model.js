import { computeBranchProbability, normalizeRngBranchProbabilities } from './rng.js';
import { ensureNodeShape, getNodeCollections, isRngNode } from './graph-utils.js';

export function flattenWithProbabilities(model, parentProbability = 1, acc = []) {
  model.forEach(rawNode => {
    const node = ensureNodeShape(rawNode);
    acc.push({ node, probability: parentProbability });

    if (isRngNode(node)) {
      normalizeRngBranchProbabilities(node).forEach(branch => {
        flattenWithProbabilities(branch.children || [], computeBranchProbability(parentProbability, branch.probability), acc);
      });
      return;
    }

    getNodeCollections(node).forEach(children => {
      flattenWithProbabilities(children, parentProbability, acc);
    });
  });

  return acc;
}

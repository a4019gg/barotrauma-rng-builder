import { isRngNode } from '../../core/graph-utils.js';
import { normalizeRngBranchProbabilities } from '../../core/rng.js';

const LABELS = {
  spawn: 'Spawn item',
  creature: 'Spawn creature',
  affliction: 'Apply affliction'
};

function percent(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  const v = n <= 1 ? n * 100 : n;
  return `${v.toFixed(1).replace(/\.0$/, '')}%`;
}

function actionLine(node) {
  if (node.type === 'spawn') return `${LABELS.spawn}: ${node.params.item || 'unknown'} x${Number(node.params.amount) || 1}`;
  if (node.type === 'creature') return `${LABELS.creature}: ${node.params.creature || 'unknown'} x${Number(node.params.count) || 1}${node.params.spawnLocation ? ` (${node.params.spawnLocation})` : ''}`;
  if (node.type === 'affliction') return `${LABELS.affliction}: ${node.params.affliction || 'unknown'} (${Number(node.params.strength) || 0})`;
  return node.type;
}

function renderFull(nodes, depth = 0, debug = false) {
  const out = [];
  const indent = '  '.repeat(depth);
  nodes.forEach(node => {
    if (isRngNode(node)) {
      out.push(`${indent}When triggered:`);
      const branches = normalizeRngBranchProbabilities(node);
      branches.forEach(branch => {
        out.push(`${indent}  ${branch.label}: ${percent(branch.probability)}`);
        out.push(...renderFull(branch.children || [], depth + 2, debug));
      });
      return;
    }
    if (['spawn', 'creature', 'affliction'].includes(node.type)) {
      out.push(`${indent}• ${actionLine(node)}`);
      if (debug) {
        Object.entries(node.params || {}).forEach(([key, val]) => {
          out.push(`${indent}  - ${key}: ${val}`);
        });
      }
      return;
    }
    if (Array.isArray(node.children)) out.push(...renderFull(node.children, depth + 1, debug));
  });
  return out;
}

export function explainEventModel({ eventId, model, mode = 'full' }) {
  const normalizedMode = ['compact', 'debug', 'full'].includes(mode) ? mode : 'full';
  if (normalizedMode === 'compact') {
    const parts = [];
    model.forEach(node => {
      if (isRngNode(node)) parts.push(`${percent(node.params.chance)} trigger`);
      else if (['spawn', 'creature', 'affliction'].includes(node.type)) parts.push(actionLine(node));
    });
    return `Event: ${eventId}\n${parts.join(', ')}`;
  }
  const lines = [`Event: ${eventId}`, ''];
  lines.push(...renderFull(model, 0, normalizedMode === 'debug'));
  return lines.join('\n');
}

import { ensureNodeShape, isContainerNode, isRngNode } from '../core/graph-utils.js';
import { normalizeRngBranchProbabilities } from '../core/rng.js';

function esc(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function writeNodeList(nodes, indentLevel) {
  return nodes.map(node => generateNodeXML(node, indentLevel)).join('');
}

function buildRandomEventChain(branches, indentLevel) {
  if (!branches.length) return '';
  if (branches.length === 1) return writeNodeList(branches[0].children || [], indentLevel);

  const [current, ...rest] = branches;
  const indent = '  '.repeat(indentLevel);
  const remaining = branches.reduce((sum, branch) => sum + branch.probability, 0);
  const chance = remaining > 0 ? current.probability / remaining : 0;
  let xml = `${indent}<RandomEvent chance="${(chance * 100).toFixed(3)}">\n`;
  xml += `${indent}  <Success>\n${writeNodeList(current.children || [], indentLevel + 2)}${indent}  </Success>\n`;
  const failureBody = buildRandomEventChain(rest, indentLevel + 2);
  if (failureBody.trim()) {
    xml += `${indent}  <Failure>\n${failureBody}${indent}  </Failure>\n`;
  }
  xml += `${indent}</RandomEvent>\n`;
  return xml;
}

function generateEventSetAttributes(node) {
  const keys = ['identifier', 'chooserandom', 'eventcount', 'commonness', 'minintensity', 'maxintensity', 'minleveldifficulty', 'maxleveldifficulty', 'allowatstart', 'perwreck', 'perruin', 'percave', 'ignorecooldown', 'triggereventcooldown'];
  return keys
    .filter(key => node.params[key] !== '' && node.params[key] != null)
    .map(key => `${key}="${esc(node.params[key])}"`)
    .join(' ');
}

function generateNodeXML(rawNode, indentLevel = 2) {
  const node = ensureNodeShape(rawNode);
  const indent = '  '.repeat(indentLevel);

  if (isRngNode(node)) {
    const branches = normalizeRngBranchProbabilities(node).filter(branch => (branch.children || []).length || branch.probability > 0);
    if (branches.length === 2 && branches[0].id === 'success' && branches[1].id === 'failure' && node.params.mode !== 'weight') {
      let xml = `${indent}<RandomEvent chance="${((node.params.chance ?? branches[0].probability) * 100).toFixed(3)}">\n`;
      if (branches[0].children.length) xml += `${indent}  <Success>\n${writeNodeList(branches[0].children, indentLevel + 2)}${indent}  </Success>\n`;
      if (branches[1].children.length) xml += `${indent}  <Failure>\n${writeNodeList(branches[1].children, indentLevel + 2)}${indent}  </Failure>\n`;
      xml += `${indent}</RandomEvent>\n`;
      return xml;
    }
    return buildRandomEventChain(branches, indentLevel);
  }

  if (node.type === 'event') {
    const identifierValue = String(node.params.identifier || '').trim() || 'error';
    const identifier = ` identifier="${esc(identifierValue)}"`;
    return `${indent}<Event${identifier}>\n${writeNodeList(node.children || [], indentLevel + 1)}${indent}</Event>\n`;
  }

  if (node.type === 'eventSet') {
    const attrs = generateEventSetAttributes(node);
    return `${indent}<EventSet${attrs ? ` ${attrs}` : ''}>\n${writeNodeList(node.children || [], indentLevel + 1)}${indent}</EventSet>\n`;
  }

  if (node.type === 'spawn') {
    const identifier = String(node.params.item || '').trim() || 'error';
    return `${indent}<SpawnItem identifier="${esc(identifier)}" amount="${Number(node.params.amount) || 1}" quality="${Number(node.params.quality) || 0}" />\n`;
  }

  if (node.type === 'creature') {
    const identifier = String(node.params.creature || '').trim() || 'error';
    return `${indent}<SpawnCreature identifier="${esc(identifier)}" count="${Number(node.params.count) || 1}" spawnlocation="${esc(node.params.spawnLocation || 'inside')}" />\n`;
  }

  if (node.type === 'affliction') {
    const identifier = String(node.params.affliction || '').trim() || 'error';
    return `${indent}<ApplyAffliction identifier="${esc(identifier)}" strength="${Number(node.params.strength) || 10}" />\n`;
  }

  return `${indent}<!-- unsupported node ${esc(node.type)} -->\n`;
}

export function buildEventXML({ eventId, model }) {
  let xml = `<Event identifier="${esc(String(eventId || '').trim() || 'error')}">\n`;
  model.forEach(node => {
    xml += generateNodeXML(node, 1);
  });
  xml += '</Event>';
  return xml;
}

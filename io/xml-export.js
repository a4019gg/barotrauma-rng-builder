function esc(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function generateNodeXML(node, indentLevel = 2) {
  const indent = '  '.repeat(indentLevel);

  if (node.type === 'rng') {
    let xml = `${indent}<RandomEvent chance="${((node.params.chance ?? 0.5) * 100).toFixed(3)}">\n`;

    if (node.children.success.length) {
      xml += `${indent}  <Success>\n`;
      node.children.success.forEach(child => {
        xml += generateNodeXML(child, indentLevel + 2);
      });
      xml += `${indent}  </Success>\n`;
    }

    if (node.children.failure.length) {
      xml += `${indent}  <Failure>\n`;
      node.children.failure.forEach(child => {
        xml += generateNodeXML(child, indentLevel + 2);
      });
      xml += `${indent}  </Failure>\n`;
    }

    xml += `${indent}</RandomEvent>\n`;
    return xml;
  }

  if (node.type === 'spawn') {
    return `${indent}<SpawnItem identifier="${esc(node.params.item || 'revolver')}" amount="${Number(node.params.amount) || 1}" quality="${Number(node.params.quality) || 0}" />\n`;
  }

  if (node.type === 'creature') {
    return `${indent}<SpawnCreature identifier="${esc(node.params.creature || 'crawler')}" count="${Number(node.params.count) || 1}" spawnlocation="${esc(node.params.spawnLocation || 'inside')}" />\n`;
  }

  if (node.type === 'affliction') {
    return `${indent}<ApplyAffliction identifier="${esc(node.params.affliction || 'bleeding')}" strength="${Number(node.params.strength) || 10}" />\n`;
  }

  return `${indent}<!-- unsupported node ${esc(node.type)} -->\n`;
}

export function buildEventXML({ eventId, model }) {
  let xml = `<Event identifier="${esc(eventId || 'new_event')}">\n`;
  model.forEach(node => {
    xml += generateNodeXML(node, 1);
  });
  xml += '</Event>';
  return xml;
}

// js/xml.js — v0.9.401 — ГЕНЕРАЦИЯ И ИМПОРТ XML

const XML_VERSION = "v0.9.401";
window.XML_VERSION = XML_VERSION;

// === ГЕНЕРАЦИЯ XML ===
function generateXML() {
  const model = window.editorState.events[window.editorState.currentEventIndex].model;
  const eventId = document.getElementById('event-id').value.trim() || 'new_event';

  let xml = `<Event identifier="${eventId}">\n`;
  xml += `  <!-- ${loc('xmlGeneratedBy')} -->\n\n`;

  model.forEach(node => {
    xml += generateNodeXML(node, 2);
  });

  xml += `</Event>`;

  const output = document.getElementById('output');
  if (output) {
    output.value = xml;
  }
}

function generateNodeXML(node, indentLevel) {
  const indent = '  '.repeat(indentLevel);

  let xml = '';

  switch (node.type) {
    case 'rng':
      const chance = (node.params.chance ?? 0.5) * 100;
      xml += `${indent}<RandomEvent chance="${chance.toFixed(3)}">\n`;

      if (node.children.success.length > 0) {
        xml += `${indent}  <Success>\n`;
        node.children.success.forEach(child => {
          xml += generateNodeXML(child, indentLevel + 2);
        });
        xml += `${indent}  </Success>\n`;
      }

      if (node.children.failure.length > 0) {
        xml += `${indent}  <Failure>\n`;
        node.children.failure.forEach(child => {
          xml += generateNodeXML(child, indentLevel + 2);
        });
        xml += `${indent}  </Failure>\n`;
      }

      xml += `${indent}</RandomEvent>\n`;
      break;

    case 'spawn':
      const item = node.params.item || 'revolver';
      xml += `${indent}<SpawnItem identifier="${item}" />\n`;
      break;

    case 'creature':
      const creature = node.params.creature || 'crawler';
      const count = node.params.count ?? 1;
      const randomize = node.params.randomize ?? true;
      const inside = node.params.inside ?? true;
      xml += `${indent}<SpawnCreature identifier="${creature}" count="${count}" randomize="${randomize}" inside="${inside}" />\n`;
      break;

    case 'affliction':
      const affliction = node.params.affliction || 'bleeding';
      const strength = node.params.strength ?? 15;
      const target = node.params.target || 'character';
      xml += `${indent}<ApplyAffliction identifier="${affliction}" strength="${strength}" target="${target}" />\n`;
      break;

    default:
      xml += `${indent}<!-- Unknown node type: ${node.type} -->\n`;
  }

  return xml;
}

// === ИМПОРТ ИЗ XML ===
function importFromXML() {
  const output = document.getElementById('output');
  if (!output || !output.value.trim()) {
    alert('Нет XML для импорта');
    return;
  }

  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(output.value, 'text/xml');

  const event = xmlDoc.querySelector('Event');
  if (!event) {
    alert('Неверный формат XML');
    return;
  }

  const newModel = [];

  event.childNodes.forEach(child => {
    if (child.nodeType !== 1) return; // пропускаем текст/комментарии

    const tag = child.tagName.toLowerCase();
    let nodeModel = null;

    switch (tag) {
      case 'randomevent':
        const chance = parseFloat(child.getAttribute('chance')) / 100 || 0.5;
        nodeModel = nodeFactory.createModelRNG(chance);
        const success = child.querySelector('Success');
        if (success) {
          success.childNodes.forEach(sub => parseChild(sub, nodeModel.children.success));
        }
        const failure = child.querySelector('Failure');
        if (failure) {
          failure.childNodes.forEach(sub => parseChild(sub, nodeModel.children.failure));
        }
        break;

      case 'spawnitem':
        const item = child.getAttribute('identifier') || 'revolver';
        nodeModel = nodeFactory.createModelSpawn(item);
        break;

      case 'spawncreature':
        const creature = child.getAttribute('identifier') || 'crawler';
        const count = parseInt(child.getAttribute('count')) || 1;
        const randomize = child.getAttribute('randomize') !== 'false';
        const inside = child.getAttribute('inside') !== 'false';
        nodeModel = nodeFactory.createModelCreature(creature, count, randomize, inside);
        break;

      case 'applyaffliction':
        const affliction = child.getAttribute('identifier') || 'bleeding';
        const strength = parseFloat(child.getAttribute('strength')) || 15;
        const target = child.getAttribute('target') || 'character';
        nodeModel = nodeFactory.createModelAffliction(affliction, strength, target);
        break;
    }

    if (nodeModel) newModel.push(nodeModel);
  });

  function parseChild(child, targetArray) {
    if (child.nodeType !== 1) return;
    let subModel = null;

    switch (child.tagName.toLowerCase()) {
      case 'randomevent':
        const chance = parseFloat(child.getAttribute('chance')) / 100 || 0.5;
        subModel = nodeFactory.createModelRNG(chance);
        const success = child.querySelector('Success');
        if (success) success.childNodes.forEach(sub => parseChild(sub, subModel.children.success));
        const failure = child.querySelector('Failure');
        if (failure) failure.childNodes.forEach(sub => parseChild(sub, subModel.children.failure));
        break;

      case 'spawnitem':
        subModel = nodeFactory.createModelSpawn(child.getAttribute('identifier'));
        break;

      case 'spawncreature':
        subModel = nodeFactory.createModelCreature(
          child.getAttribute('identifier'),
          parseInt(child.getAttribute('count')) || 1,
          child.getAttribute('randomize') !== 'false',
          child.getAttribute('inside') !== 'false'
        );
        break;

      case 'applyaffliction':
        subModel = nodeFactory.createModelAffliction(
          child.getAttribute('identifier'),
          parseFloat(child.getAttribute('strength')) || 15,
          child.getAttribute('target') || 'character'
        );
        break;
    }

    if (subModel) targetArray.push(subModel);
  }

  // Заменяем текущую модель
  window.editorState.events[window.editorState.currentEventIndex].model = newModel;
  window.editorState.renderCurrentEvent();
  alert('XML импортирован');
}

// Глобальные функции
window.generateXML = generateXML;
window.importFromXML = importFromXML;

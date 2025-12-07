// js/xml.js — генерация XML — v0.9.5

function generateXML() {
  const eventId = document.getElementById('event-id').value.trim() || 'custom_event';

  let xml = `<ScriptedEvent identifier="${eventId}" commonness="100">\n`;

  function walk(container, indent = "  ") {
    container.querySelectorAll(':scope > .node').forEach(node => {
      if (node.classList.contains('spawn')) {
        const itemInput = node.querySelector('.item-field');
        const item = itemInput?.value.trim() || 'revolver';
        xml += `${indent}  <SpawnAction itemidentifier="${item}" targetinventory="player" />\n`;
      } else if (node.classList.contains('rng')) {
        const chanceInput = node.querySelector('.chance');
        const chance = chanceInput?.value.trim() || '0.5';
        xml += `${indent}  <RNGAction chance="${chance}">\n`;
        xml += `${indent}    <Success>\n`;
        const successCont = node.querySelector(`#c-${node.dataset.id}-s`);
        if (successCont) walk(successCont, indent + "      ");
        xml += `${indent}    </Success>\n`;
        xml += `${indent}    <Failure>\n`;
        const failureCont = node.querySelector(`#c-${node.dataset.id}-f`);
        if (failureCont) walk(failureCont, indent + "      ");
        xml += `${indent}    </Failure>\n`;
        xml += `${indent}  </RNGAction>\n`;
      }
    });
  }

  walk(document.getElementById('root-children'));
  xml += `</ScriptedEvent>`;

  const fullXML = `<Randomevents>\n  <EventPrefabs>\n    ${xml}\n  </EventPrefabs>\n</Randomevents>`;
  document.getElementById('output').value = fullXML;
}

function copyXML() {
  const text = document.getElementById('output').value;
  if (!text.trim()) {
    alert(L.generateFirst);
    return;
  }
  navigator.clipboard.writeText(text)
    .then(() => alert(L.xmlCopied))
    .catch(() => alert(L.xmlCopyFailed));
}

function downloadXML() {
  const text = document.getElementById('output').value;
  if (!text.trim()) {
    alert(L.generateFirst);
    return;
  }
  const blob = new Blob([text], { type: 'text/xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${document.getElementById('event-id').value.trim() || 'event'}.xml`;
  a.click();
  URL.revokeObjectURL(url);
}

// Экспорт функций
window.generateXML = generateXML;
window.copyXML = copyXML;
window.downloadXML = downloadXML;

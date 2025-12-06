// js/xml.js — генерация XML

function generateXML() {
  let xml = `<ScriptedEvent identifier="${document.getElementById('event-id').value || 'custom_event'}" commonness="100">\n`;

  function walk(container, indent = "  ") {
    container.querySelectorAll(':scope > .node').forEach(node => {
      if (node.classList.contains('spawn')) {
        const item = node.querySelector('.item-field').value.trim() || 'revolver';
        xml += `${indent}  <SpawnAction itemidentifier="${item}" targetinventory="player" />\n`;
      } else if (node.classList.contains('rng')) {
        const chance = node.querySelector('.chance').value || '0.5';
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
  if (!text.trim()) return alert('Сгенерируйте XML сначала!');
  navigator.clipboard.writeText(text).then(() => alert('XML скопирован!'));
}

function downloadXML() {
  const text = document.getElementById('output').value;
  if (!text.trim()) return alert('Сгенерируйте XML сначала!');
  const blob = new Blob([text], { type: 'text/xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${document.getElementById('event-id').value || 'event'}.xml`;
  a.click();
  URL.revokeObjectURL(url);
}

window.generateXML = generateXML;
window.copyXML = copyXML;
window.downloadXML = downloadXML;

function parseNode(element, nextId) {
  const tag = element.tagName.toLowerCase();

  if (tag === 'randomevent') {
    const chance = (Number(element.getAttribute('chance')) || 50) / 100;
    const node = {
      id: nextId(),
      type: 'rng',
      params: { chance },
      children: { success: [], failure: [] }
    };

    const success = element.querySelector(':scope > Success');
    if (success) {
      Array.from(success.children).forEach(child => {
        const parsed = parseNode(child, nextId);
        if (parsed) node.children.success.push(parsed);
      });
    }

    const failure = element.querySelector(':scope > Failure');
    if (failure) {
      Array.from(failure.children).forEach(child => {
        const parsed = parseNode(child, nextId);
        if (parsed) node.children.failure.push(parsed);
      });
    }

    return node;
  }

  if (tag === 'spawnitem') {
    return {
      id: nextId(),
      type: 'spawn',
      params: {
        item: element.getAttribute('identifier') || '',
        amount: Number(element.getAttribute('amount')) || 1,
        quality: Number(element.getAttribute('quality')) || 0
      }
    };
  }

  if (tag === 'spawncreature') {
    return {
      id: nextId(),
      type: 'creature',
      params: {
        creature: element.getAttribute('identifier') || '',
        count: Number(element.getAttribute('count')) || 1,
        spawnLocation: element.getAttribute('spawnlocation') || 'inside'
      }
    };
  }

  if (tag === 'applyaffliction') {
    return {
      id: nextId(),
      type: 'affliction',
      params: {
        affliction: element.getAttribute('identifier') || '',
        strength: Number(element.getAttribute('strength')) || 10
      }
    };
  }

  return null;
}

export function parseEventXML(xmlText, nextId) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'application/xml');
  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error('XML parse error');
  }

  const event = doc.querySelector('Event');
  if (!event) {
    throw new Error('Event tag not found');
  }

  const model = [];
  Array.from(event.children).forEach(child => {
    if (['Success', 'Failure'].includes(child.tagName)) return;
    const parsed = parseNode(child, nextId);
    if (parsed) model.push(parsed);
  });

  return {
    eventId: event.getAttribute('identifier') || 'new_event',
    model
  };
}

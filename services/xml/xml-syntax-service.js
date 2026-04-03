const ENTITY_LABELS = {
  SpawnItem: 'Spawn item',
  ApplyAffliction: 'Apply affliction',
  SpawnCreature: 'Spawn creature',
  Event: 'Event',
  RandomEvent: 'Random event',
  Success: 'Success branch',
  Failure: 'Failure branch'
};

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function encodeAttr(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function parseAttributes(raw = '') {
  const attrs = [];
  const regex = /([A-Za-z_:][A-Za-z0-9_.:-]*)\s*=\s*"([^"]*)"/g;
  let match = regex.exec(raw);
  while (match) {
    attrs.push({ name: match[1], value: match[2] });
    match = regex.exec(raw);
  }
  return attrs;
}

function makeWarning(name, value) {
  if ((name === 'chance') && (value === '0' || value === '0.000' || value === '100' || value === '100.000')) return 'Suspicious chance value';
  if (!String(value).trim()) return 'Empty value';
  return '';
}

function numberHint(name, value) {
  const parsed = Number(String(value).replace(',', '.'));
  if (!Number.isFinite(parsed)) return '';
  if (name === 'chance') return `(${parsed.toFixed(1).replace(/\.0$/, '')}%)`;
  if (parsed >= 0 && parsed <= 1 && /chance|probability/i.test(name)) return `(${(parsed * 100).toFixed(1).replace(/\.0$/, '')}%)`;
  return '';
}

function chanceColorHint(name, value) {
  if (name !== 'chance') return '';
  const parsed = Number(String(value).replace(',', '.'));
  if (!Number.isFinite(parsed)) return '';
  const clamped = Math.max(0, Math.min(100, parsed));
  const hue = (clamped / 100) * 60;
  return `hsl(${hue}deg 90% 58%)`;
}

export function formatXml(mode, xmlText = '') {
  const text = String(xmlText || '');
  if (mode === 'minify') return text.replace(/>\s+</g, '><').replace(/\n+/g, '').trim();
  return text;
}

export function buildHighlightedXml(xmlText = '', options = {}) {
  const searchQuery = String(options.searchQuery || '').trim();
  const queryLower = searchQuery.toLowerCase();
  const lines = String(xmlText || '').split('\n');
  const stack = [];
  const openLinesByTag = new Map();
  const blocks = new Map();

  lines.forEach((line, index) => {
    const m = line.match(/^\s*<\/?\s*([A-Za-z0-9:_-]+)/);
    if (!m) return;
    const tag = m[1];
    const isClosing = /^\s*<\//.test(line);
    const selfClose = /\/\s*>\s*$/.test(line);
    if (!isClosing && !selfClose) {
      stack.push({ tag, index });
      if (!openLinesByTag.has(index)) openLinesByTag.set(index, { start: index, end: index });
      return;
    }
    if (isClosing) {
      for (let i = stack.length - 1; i >= 0; i -= 1) {
        if (stack[i].tag === tag) {
          const open = stack.splice(i, 1)[0];
          blocks.set(open.index, { start: open.index, end: index, tag });
          blocks.set(index, { start: open.index, end: index, tag });
          break;
        }
      }
    }
  });

  const searchMatches = [];
  let activeMatchIndex = -1;
  let globalMatchCounter = 0;

  const htmlLines = lines.map((line, lineIndex) => {
    const indent = line.match(/^\s*/)?.[0]?.length || 0;
    const pad = '&nbsp;'.repeat(indent);
    const content = line.trimStart();
    const tagMatch = content.match(/^<(\/)?([A-Za-z0-9:_-]+)([^>]*)>/);
    if (!tagMatch) {
      const escapedPlain = escapeHtml(content);
      const hasMatch = queryLower && line.toLowerCase().includes(queryLower);
      return `<div class="xml-line${hasMatch ? ' xml-line-search-hit' : ''}" data-line="${lineIndex}" style="--xml-indent:${indent};">${pad}${escapedPlain}</div>`;
    }

    const [, closeSlash, tagName, attrRaw] = tagMatch;
    const isClosing = Boolean(closeSlash);
    const isSelfClosing = /\/\s*>$/.test(content);
    const entityLabel = ENTITY_LABELS[tagName] || `${tagName} entity`;
    const block = blocks.get(lineIndex);
    const blockData = block ? ` data-block-start="${block.start}" data-block-end="${block.end}"` : '';
    const attrs = parseAttributes(attrRaw);

    let attrsHtml = '';
    attrs.forEach(attr => {
      const warning = makeWarning(attr.name, attr.value);
      const warnClass = warning ? ' xml-warning' : '';
      const percentHint = numberHint(attr.name, attr.value);
      const chanceColor = chanceColorHint(attr.name, attr.value);
      const isErrorValue = attr.name === 'identifier' && String(attr.value || '').trim().toLowerCase() === 'error';
      const info = attr.name === 'identifier'
        ? `identifier: ${attr.value || 'empty'}`
        : `${attr.name}: ${attr.value || 'empty'}`;
      attrsHtml += ` <span class="xml-attr${warnClass}${isErrorValue ? ' xml-error-value' : ''}" data-tooltip="${encodeAttr(info)}">${escapeHtml(attr.name)}</span>=<span class="xml-string${warnClass}${isErrorValue ? ' xml-error-value' : ''}" data-tooltip="${encodeAttr(info)}">&quot;${escapeHtml(attr.value)}&quot;</span>`;
      if (percentHint) attrsHtml += `<span class="xml-inline-hint xml-inline-hint-chance"${chanceColor ? ` style="--chance-color:${chanceColor};"` : ''}>${escapeHtml(percentHint)}</span>`;
    });

    const startTag = `&lt;${isClosing ? '/' : ''}<span class="xml-tag-name" data-entity="${encodeAttr(entityLabel)}">${escapeHtml(tagName)}</span>${attrsHtml}${isSelfClosing ? ' /' : ''}&gt;`;

    let rendered = `${pad}<span class="xml-tag" data-tag="${escapeHtml(tagName)}" data-line="${lineIndex}"${blockData}>${startTag}</span>`;

    let hasMatch = false;
    if (queryLower) {
      const rawLine = line.toLowerCase();
      let cursor = 0;
      let next = rawLine.indexOf(queryLower, cursor);
      while (next >= 0) {
        hasMatch = true;
        searchMatches.push({ lineIndex, start: next, end: next + queryLower.length, index: globalMatchCounter });
        globalMatchCounter += 1;
        if (activeMatchIndex === -1) activeMatchIndex = 0;
        next = rawLine.indexOf(queryLower, next + queryLower.length);
      }
    }

    return `<div class="xml-line${hasMatch ? ' xml-line-search-hit' : ''}" data-line="${lineIndex}" style="--xml-indent:${indent};">${rendered}</div>`;
  });

  return {
    html: htmlLines.join(''),
    searchMatches,
    activeMatchIndex,
    lineCount: lines.length
  };
}

export function buildSearchDecorations(lines, searchMatches = [], activeIndex = -1) {
  if (!searchMatches.length) return lines;
  const grouped = new Map();
  searchMatches.forEach((match, index) => {
    const list = grouped.get(match.lineIndex) || [];
    list.push({ ...match, isActive: index === activeIndex });
    grouped.set(match.lineIndex, list);
  });
  return lines.map((lineHtml, lineIndex) => {
    const matches = grouped.get(lineIndex);
    if (!matches?.length) return lineHtml;
    return lineHtml.replace('</div>', `<span class="xml-search-marker">${matches.length}</span></div>`);
  });
}

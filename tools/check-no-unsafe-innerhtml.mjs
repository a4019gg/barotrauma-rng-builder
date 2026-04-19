import fs from 'node:fs';

const checks = [
  { file: 'ui/ui-controller.js', fn: 'renderEvents', kind: 'function' },
  { file: 'ui/ui-controller.js', fn: 'renderSimulationResults', kind: 'function' },
  { file: 'modules/tree/tree-service.js', fn: 'renderInspector', kind: 'method' }
];

function extractBlock(source, fromIndex) {
  let index = source.indexOf('{', fromIndex);
  if (index === -1) return null;
  let depth = 0;
  for (let i = index; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(index, i + 1);
    }
  }
  return null;
}

function getBody(source, fn, kind) {
  const pattern = kind === 'method'
    ? new RegExp(`\\n\\s*${fn}\\s*\\(`)
    : new RegExp(`function\\s+${fn}\\s*\\(`);
  const match = pattern.exec(source);
  if (!match) return null;
  return extractBlock(source, match.index);
}

const violations = [];
for (const entry of checks) {
  const source = fs.readFileSync(entry.file, 'utf8');
  const body = getBody(source, entry.fn, entry.kind);
  if (!body) {
    violations.push(`${entry.file}: ${entry.fn} not found`);
    continue;
  }
  if (body.includes('innerHTML')) {
    violations.push(`${entry.file}: ${entry.fn} contains innerHTML`);
  }
}

if (violations.length) {
  console.error('Unsafe innerHTML usage found in protected render paths:');
  violations.forEach(v => console.error(`- ${v}`));
  process.exit(1);
}

console.log('No unsafe innerHTML usage found in protected render paths.');

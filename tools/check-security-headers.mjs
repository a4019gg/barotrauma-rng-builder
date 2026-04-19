import fs from 'node:fs';

const html = fs.readFileSync('index.html', 'utf8');

if (!/Content-Security-Policy/i.test(html) || !/script-src\s+'self'/i.test(html)) {
  throw new Error('Missing strict CSP with script-src \'self\'.');
}

if (!/d3\.v7\.min\.js"\s+integrity="sha384-/i.test(html) || !/crossorigin="anonymous"/i.test(html)) {
  throw new Error('Missing SRI/crossorigin attributes for CDN d3 dependency.');
}

console.log('CSP and SRI checks passed.');

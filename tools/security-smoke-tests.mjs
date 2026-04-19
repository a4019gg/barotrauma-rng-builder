import assert from 'node:assert/strict';
import { parseProjectJson } from '../modules/io/project-io.js';
import { normalizeEventId, normalizeNodeId, normalizeNodeType, normalizeUnsafePayload } from '../core/input-sanitizer.js';

const maliciousProject = JSON.stringify({
  type: 'barotrauma-rng-project',
  events: [
    {
      id: 'evt<script>alert(1)</script>',
      rootNodes: [
        {
          id: 'x\" onclick=alert(1)',
          type: 'spawn<script>',
          params: { item: '<img src=x onerror=alert(1)>' }
        }
      ]
    }
  ],
  ui: { currentEventIndex: 0 }
});

const parsed = parseProjectJson(maliciousProject);
assert.equal(parsed.events.length, 1);
assert.equal(parsed.events[0].id, 'event_1');
assert.equal(parsed.events[0].model[0].type, 'spawn');
assert.ok(!String(parsed.events[0].model[0].params.item).includes('<'));

assert.equal(normalizeEventId('ok_event-1', 'fallback'), 'ok_event-1');
assert.equal(normalizeEventId('<svg/onload=1>', 'fallback'), 'fallback');
assert.equal(normalizeNodeId('node_123', 'node_1'), 'node_123');
assert.equal(normalizeNodeType('eventSet', 'spawn'), 'eventSet');
assert.equal(normalizeNodeType('evil<script>', 'spawn'), 'spawn');
assert.equal(normalizeUnsafePayload('javascript:alert(1)', 'clean'), 'clean');

console.log('Security smoke tests passed.');

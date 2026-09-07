import test from 'node:test';
import assert from 'node:assert/strict';
import { zoomAt, boundView } from '../../public/esthmr/chart-viewer.js';

test('zoom preserves the content point under the finger or cursor', () => {
  const before = { scale: 2, x: -140, y: -80 }, p = { x: 180, y: 230 };
  const after = zoomAt(before, 4, p);
  assert.equal((p.x - before.x) / before.scale, (p.x - after.x) / after.scale);
  assert.equal((p.y - before.y) / before.scale, (p.y - after.y) / after.scale);
});
test('zoom limits are one to eight times the fitted chart', () => {
  const s = { scale: 1, x: 0, y: 0 }, p = { x: 0, y: 0 };
  assert.equal(zoomAt(s, 100, p).scale, 8);
  assert.equal(zoomAt(s, .01, p).scale, 1);
});
test('zoom in then out returns to the original position', () => {
  const s = { scale: 1, x: 0, y: 50 }, p = { x: 220, y: 300 };
  assert.deepEqual(zoomAt(zoomAt(s, 2, p), 1, p), s);
});
test('panning cannot lose the chart beyond any viewport edge', () => {
  assert.deepEqual(boundView({ scale: 3, x: 999, y: -9999 }, 390, 600, 390, 300),
    { scale: 3, x: 0, y: -300 });
});
test('a fitted chart is centred on axes smaller than its viewport', () => {
  assert.deepEqual(boundView({ scale: 1, x: -20, y: 10 }, 390, 700, 390, 220),
    { scale: 1, x: 0, y: 240 });
});
test('pinch scaling and moving its midpoint preserves the touched content', () => {
  const before = { scale: 2, x: -100, y: -60 };
  const after = zoomAt(before, 3, { x: 100, y: 120 });
  after.x += 30; after.y += 40;
  assert.equal((130 - after.x) / 3, (100 - before.x) / 2);
  assert.equal((160 - after.y) / 3, (120 - before.y) / 2);
});

/* The market's line drawn behind one company's price.
 *
 * The comp captions the company chart "ghosted line = EGX 30 rebased", and
 * the reason it earns its place is that it answers the question a price chart
 * always raises and never settles: is this the company, or is it the market?
 *
 * Two ways of drawing it are wrong, and both are easy to reach by accident:
 *
 *   A SECOND Y-AXIS. 18.42 pounds and 55,498 points share no scale, so a
 *   second axis has to be positioned by hand — and wherever it is put decides
 *   whether the company appears to be beating the market. The chart would be
 *   an opinion with a grid behind it.
 *
 *   ZIPPING BY POSITION. A company suspended for three sessions has three
 *   fewer points than the index over the same fortnight. Lining the two
 *   arrays up by index slides the whole market line sideways and draws a
 *   divergence that is purely an off-by-three — a fabricated result that
 *   would look exactly like a real one.
 *
 * These tests pin the join to the date and the base to a shared session.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { installDom } from './dom-stub.mjs';

installDom();
const { rebaseTo } = await import('../../public/esthmr/logic.js');
const { benchmarkOf } = await import('../../public/esthmr/data.js');

const published = JSON.parse(await readFile(
  new URL('../../public/data/v1/market-history.json', import.meta.url), 'utf8'));

const bench = (pairs) => ({ id: 'EGX30', points: pairs.map(([date, close]) => ({ date, close })) });

test('the market line starts exactly where the company line starts', () => {
  const pts = [{ date: '2026-09-01', close: 20 }, { date: '2026-09-02', close: 22 }];
  const out = rebaseTo(pts, bench([['2026-09-01', 50000], ['2026-09-02', 51000]]));
  assert.equal(out.values[0], 20, 'the two lines do not begin at the same point');
  // The index rose 2%, so the rebased line sits 2% above the company's first
  // close — not at the company's second close, which rose 10%.
  assert.ok(Math.abs(out.values[1] - 20.4) < 1e-9, out.values[1]);
  assert.equal(out.from, '2026-09-01');
});

test('a session the company missed is a gap, not a slide', () => {
  /* The company did not trade on the 2nd. If the series were zipped by
     position, its close on the 3rd would be compared with the index's reading
     on the 2nd, and every later point would stay one session out of step. */
  const pts = [{ date: '2026-09-01', close: 20 }, { date: '2026-09-03', close: 20 }];
  const out = rebaseTo(pts, bench([
    ['2026-09-01', 50000], ['2026-09-02', 60000], ['2026-09-03', 50000]]));
  assert.equal(out.values.length, pts.length, 'the ghost is not aligned to the company');
  // The index ended the window exactly where it began, so the rebased line
  // must end where it began too. Zipping by position would end it at 24.
  assert.ok(Math.abs(out.values[1] - 20) < 1e-9,
    `zipped by position, not by date: ${out.values[1]}`);
});

test('a session the index did not record breaks the line rather than bridging it', () => {
  const pts = [{ date: '2026-09-01', close: 20 }, { date: '2026-09-02', close: 21 },
    { date: '2026-09-03', close: 22 }];
  const out = rebaseTo(pts, bench([['2026-09-01', 50000], ['2026-09-03', 55000]]));
  assert.equal(out.values[1], null, 'an unrecorded session was given a value');
  assert.ok(Math.abs(out.values[2] - 22) < 1e-9);
});

test('nothing is drawn when the two series never met', () => {
  const pts = [{ date: '2026-09-01', close: 20 }, { date: '2026-09-02', close: 21 }];
  assert.equal(rebaseTo(pts, bench([['2025-01-01', 50000], ['2025-01-02', 51000]])), null);
  assert.equal(rebaseTo(pts, null), null);
  assert.equal(rebaseTo(pts, { id: 'EGX30', points: [] }), null);
  // One shared session is a point, not a line.
  assert.equal(rebaseTo(pts, bench([['2026-09-01', 50000]])), null);
});

test('a zero or missing index level never becomes a division by zero', () => {
  const pts = [{ date: '2026-09-01', close: 20 }, { date: '2026-09-02', close: 21 }];
  assert.equal(rebaseTo(pts, bench([['2026-09-01', 0], ['2026-09-02', 51000]])), null);
});

test('benchmarkOf keeps the dates the sparkline throws away', () => {
  const history = { sessions: [
    { date: '2026-09-01', indices: { EGX30: 50000 } },
    { date: '2026-09-02', indices: {} },
    { date: '2026-09-03', indices: { EGX30: 51000 } },
  ] };
  const out = benchmarkOf(history);
  assert.deepEqual(out.points, [
    { date: '2026-09-01', close: 50000 }, { date: '2026-09-03', close: 51000 }]);
  assert.equal(out.id, 'EGX30');
  assert.equal(benchmarkOf({ sessions: [] }), null);
  assert.equal(benchmarkOf(null), null);
});

test('the published history really can feed this chart', () => {
  /* A guard against the whole feature passing on fixtures while the real
     document carries no index levels at all. */
  const out = benchmarkOf(published);
  assert.ok(out && out.points.length > 100,
    `market-history.json yielded ${out ? out.points.length : 0} dated index closes`);
});

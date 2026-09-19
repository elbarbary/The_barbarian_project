/* The workbench opens with the comparison, and states no verdict.
 *
 * The owner's call on 19 September, choosing between framings: "show every
 * model against the market as a scoreboard and let the reader draw the
 * conclusion, without a sentence stating it." So these pin two things — that
 * the drawing is there and is honest, and that no sentence does the reader's
 * concluding for them.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { installDom } from './dom-stub.mjs';

installDom();
const ROOT = new URL('../../', import.meta.url);
const read = (p) => readFile(new URL(p, ROOT), 'utf8');
const { modelScoreboard } = await import('../../public/esthmr/scenario-visuals.js');
const src = await read('public/esthmr/scenario-visuals.js');
const css = await read('public/esthmr/ai.css');

const all = (n) => (n ? [n, ...(n.children || []).flatMap(all)] : []);
const text = (n) => (n ? [n.text || '', ...(n.children || []).map(text)].join(' ') : '');
const byClass = (n, c) => all(n).filter((x) => String(x.attrs?.class || '').split(' ').includes(c));
// The legend carries a swatch of each dot, so counts are taken from the rows.
const inRows = (n, c) => byClass(byClass(n, 'sb-rows')[0], c);
// react-shim serialises the style object to a kebab-cased attribute string.
const startOf = (n) => parseFloat(/inset-inline-start:\s*([\d.]+)%/.exec(String(n.attrs?.style || ''))?.[1] ?? 'NaN');

const hz = (own, market, sessions) => ({ meanReturn: own, meanMarket: market, sessions, ahead: 1 });
const DOC = {
  minimumSessions: 5,
  models: {
    kronos: { label: 'Kronos-small', labelAr: 'Kronos-small', group: 'neural', horizons: { 5: hz(0.83, 1.38, 9) } },
    drift: { label: 'Drift', labelAr: 'الانجراف', group: 'baseline', horizons: { 5: hz(-4.48, 1.38, 9) } },
    flat: { label: 'Flat', labelAr: 'ثابت', group: 'baseline', horizons: { 5: hz(2.70, 1.38, 9) } },
    young: { label: 'Young', labelAr: 'جديد', group: 'neural', horizons: { 5: hz(9.9, 1.38, 2) } },
  },
};

test('a model with too few scored sessions is not plotted at all', () => {
  /* A dot at its return after two sessions would read as a result. The
     absence of one is the fact, and it is counted in words instead. */
  const node = modelScoreboard(DOC, 5, false);
  const rows = inRows(node, 'sb-row');
  assert.equal(rows.length, 3, 'the unscored model was plotted');
  assert.doesNotMatch(text(node), /Young/, 'an unscored model is named as though it had a record');
  assert.match(text(byClass(node, 'sb-note')[0]), /1 more model has not reached 5 scored sessions/);
});

test('every model is measured against its own benchmark, not one shared line', () => {
  /* Each is scored over its own set of sessions, so its market figure differs.
     A single vertical rule would be a small lie that made the picture tidier. */
  assert.equal(inRows(modelScoreboard(DOC, 5, false), 'sb-market').length, 3,
    'the market is drawn once for all rows rather than per model');
  assert.match(src, /drawn PER MODEL rather than as a single vertical rule/);
});

test('the rows share one scale, so lengths can be compared by eye', () => {
  const node = modelScoreboard(DOC, 5, false);
  const pos = (cls) => inRows(node, cls).map(startOf);
  const market = pos('sb-market');
  assert.equal(new Set(market.map((v) => v.toFixed(3))).size, 1,
    'identical market figures landed at different places, so the scale is not shared');
  const own = pos('sb-own');
  // Drift (-4.48) is the lowest and Flat (+2.70) the highest; on one scale the
  // lowest must sit nearest the start of the track.
  assert.ok(Math.min(...own) < market[0] && Math.max(...own) > market[0],
    'every model landed on the same side of the market, which the fixture does not say');
});

test('the drawing states no verdict, in either language', () => {
  /* The reader draws the conclusion. Nothing here may say the models did or
     did not beat the market — and §8 bans the directive vocabulary outright. */
  for (const ar of [false, true]) {
    const out = text(modelScoreboard(DOC, 5, ar));
    assert.doesNotMatch(out, /beat|beaten|outperform|better than the market|worse than the market/i, out.slice(0, 120));
    assert.doesNotMatch(out, /\b(buy|sell|hold|recommend\w*|should)\b/i);
    assert.doesNotMatch(out, /تتفوق|تغلب|ننصح|نوصي|يجب/);
  }
});

test('the sample is named every time, and the phone still gets a track to read', () => {
  const note = text(byClass(modelScoreboard(DOC, 5, false), 'sb-note')[0]);
  assert.match(note, /very small sample/);
  assert.match(note, /9 sessions/, 'the note does not say how many sessions it rests on');
  assert.match(text(byClass(modelScoreboard(DOC, 5, true), 'sb-note')[0]), /عينة صغيرة جداً/);
  // At 375px a four-column row leaves the track about 70px, which is not a
  // comparison; the name and figures stack above it instead.
  assert.match(css, /@media \(max-width: 720px\)[\s\S]{0,400}grid-template-areas: 'name fig vs' 'track track track'/);
});

test('it is the first thing on the workbench, and picking a model comes after', async () => {
  const screen = await read('public/esthmr/scenarios.js');
  const at = screen.indexOf('modelScoreboard(top5, horizon, ar');
  assert.ok(at > 0, 'the workbench does not draw the scoreboard');
  assert.ok(at < screen.indexOf("class: 'aix-bench-grid'"), 'the scoreboard is below the workbench body');
  assert.match(screen, /modelScoreboard\(top5, horizon, ar, \(id\) =>/, 'a row does not open its model');
});

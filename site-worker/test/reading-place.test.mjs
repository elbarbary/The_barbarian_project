/* The crash-warning reading, and the shape it may never take.
 *
 * §11.9 of the redesign states the rule twice, which is unusual for that
 * document: a distribution, never a gauge. A dial with a needle in a red arc
 * is read as a forecast — the needle is POINTING somewhere — and ESTHMR is
 * not licensed by the FRA to make one. A dot on the model's own history is a
 * measurement, which it is allowed to make.
 *
 * It is also the more informative drawing, which is the better argument:
 * 0.84 means nothing until a reader can see that the same model sits at 0.50
 * on a median session and has spent eighteen years between 0 and 1.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { installDom } from './dom-stub.mjs';

installDom();
const ROOT = new URL('../../', import.meta.url);
const read = (p) => readFile(new URL(p, ROOT), 'utf8');
const { placeOf } = await import('../../public/esthmr/logic.js');
const history = JSON.parse(await read('public/esthmr/backtest/reading_history.json'));
const reading = JSON.parse(await read('public/esthmr/backtest/model_reading.json'));

test('the history is the model’s own, and long enough to place a reading on', () => {
  assert.equal(history.quantiles.length, 101, 'the ladder is not a percentile per rung');
  // Sorted, or a bisection down it answers nonsense.
  for (let i = 1; i < history.quantiles.length; i += 1) {
    assert.ok(history.quantiles[i] >= history.quantiles[i - 1],
      `the ladder goes backwards at rung ${i}`);
  }
  assert.ok(history.sessions > 1000, `${history.sessions} sessions is not a history`);
  assert.equal(history.quantiles[0], history.min);
  assert.equal(history.quantiles[100], history.max);
  // It is frozen research: it ends where the research ends, not today.
  assert.match(history.from, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(history.to <= reading.date, 'the history runs past the reading it places');
});

test('a reading is placed where it actually falls', () => {
  /* Ties resolve to the TOP of the tied block: the model's quietest sessions
     all read exactly 0.00 and fill the first rungs, so a reading of 0.00 is
     "as quiet as the quietest N% of its history" rather than "the 0th
     percentile", which would claim it had never been this quiet. */
  const flat = history.quantiles.filter((v) => v === history.min).length;
  assert.equal(placeOf(history, history.min), Math.max(0, flat - 1));
  assert.equal(placeOf(history, history.max), 100);
  assert.equal(placeOf(history, history.median), 50);
  // A reading below everything the model has ever produced is still the floor.
  assert.equal(placeOf(history, history.min - 1), 0);
  // Below and above the whole history clamp rather than throw.
  assert.equal(placeOf(history, -5), 0);
  assert.equal(placeOf(history, 99), 100);
  // Today's reading, against the published ladder.
  const today = placeOf(history, reading.score);
  assert.ok(today >= 0 && today <= 100, String(today));
  assert.equal(today >= 75, reading.score >= history.p75,
    'the percentile and the published quartile disagree about the same reading');
});

test('it refuses rather than guesses when it has no history', () => {
  assert.equal(placeOf(null, 0.5), null);
  assert.equal(placeOf({ quantiles: [] }, 0.5), null);
  assert.equal(placeOf(history, null), null);
  assert.equal(placeOf(history, Number.NaN), null);
});

test('the reading is never drawn as a gauge', async () => {
  const logic = await read('public/esthmr/logic.js');
  const at = logic.indexOf('function readingPlace(');
  assert.ok(at > 0, 'the reading has no placement at all');
  const body = logic.slice(at, logic.indexOf('\n}\n', at));
  assert.match(body, /distributionDot\(/, 'the reading is not drawn on its own distribution');
  for (const banned of ['gauge', 'needle', 'dial', 'arc(', 'speedometer']) {
    assert.ok(!body.toLowerCase().includes(banned), `${banned} appears in the reading`);
  }
  // The alert line is a tick on the scale, not a red zone: the band either
  // side of it is not more or less dangerous, it is where the rule switches.
  assert.match(body, /priors:/, 'the alert line is not marked on the scale');
  assert.doesNotMatch(body, /var\(--down\)/, 'the reading is painted in the falling colour');
});

test('the strip says what the band and the tick are', async () => {
  const logic = await read('public/esthmr/logic.js');
  const at = logic.indexOf('function readingPlace(');
  const body = logic.slice(at, logic.indexOf('\n}\n', at));
  assert.match(body, /middle half/, 'the band is unexplained, so it reads as a safe zone');
  assert.match(body, /not a statement about what comes next/,
    'nothing stops the reading being read as a forecast');
  assert.match(body, /النصف الأوسط/, 'the Arabic strip does not explain its band');
  assert.match(body, /وليست تصريحاً عمّا سيأتي/, 'the Arabic strip drops the limit');
});

test('the strip is on the screen and styled', async () => {
  const template = await read('public/esthmr/template.html');
  assert.ok(template.includes('{{ fragilityData.readingStrip }}'), 'the strip is never rendered');
  const css = await read('public/esthmr/journal.css');
  for (const rule of ['.reading-place', '.rp-figures', '.rp-value']) {
    assert.ok(css.includes(rule), `${rule} has no styling`);
  }
});

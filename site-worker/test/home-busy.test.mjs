import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

/* Home's busiest-shares card: which session it measured, and where it ends.
 *
 * Two complaints, one card. The multiple was printed with no day attached, so
 * a reader watching the list across a week saw familiar names and concluded it
 * was frozen; and the card ran ~100px past the one beside it, leaving the two
 * columns of Home ending 360px apart.
 */
const here = (p) => new URL(`../../public/esthmr/${p}`, import.meta.url);
const tpl = await readFile(here('template.html'), 'utf8');
const logic = await readFile(here('logic.js'), 'utf8');
const shell = await readFile(here('shell.css'), 'utf8');

test('the volume multiple says which session it belongs to', () => {
  // The number is `session volume / median of the previous twenty sessions`,
  // so it is a fact about ONE day. Printed bare it reads as a property of the
  // share.
  assert.match(tpl, /\{\{ busyWhen \}\}/,
    'the busiest card draws no session date');
  assert.match(logic, /busyWhen:/, 'busyWhen is never computed');

  // Both languages, or half the readership gets a card with no date on it.
  const en = logic.slice(logic.indexOf("busiest:'Traded with abnormal volume'"));
  assert.match(en.slice(0, 2000), /busyOn:'Close of \{date\}'/, 'no English close phrasing');
  assert.match(en.slice(0, 2000), /busyOnLive:/, 'no English live-session phrasing');
  assert.equal((logic.match(/busyOn:'/g) || []).length, 2, 'busyOn is not in both languages');
  assert.equal((logic.match(/busyOnLive:'/g) || []).length, 2,
    'busyOnLive is not in both languages');
});

test('a live session is not described as a close', () => {
  /* Mid-session the volume is a PART of a day divided by twenty whole ones, so
   * the multiple can only climb until the bell. 3.2x at eleven o'clock and
   * 3.2x at the close are different readings, and calling the first one a
   * close would be the same class of error as the demo banner over live data.
   */
  const at = logic.indexOf('busyWhen:');
  const block = logic.slice(at, at + 420);
  assert.match(block, /D\.isClose/, 'busyWhen ignores whether the session settled');
  assert.match(block, /livePrices/, 'busyWhen ignores the live quote overlay');
  assert.match(block, /L\.busyOn\b[\s\S]{0,40}L\.busyOnLive|busyOn : L\.busyOnLive|\? L\.busyOn : L\.busyOnLive/,
    'the close and live phrasings are not chosen between');
});

test('no date is invented when the session date is unknown', () => {
  // `market.json` is not always there, and a multiple stamped with the wrong
  // day is worse than one carrying none.
  const at = logic.indexOf('busyWhen:');
  const block = logic.slice(at, at + 420);
  assert.match(block, /if \(!busy\.length \|\| !day\) return ''/,
    'busyWhen falls through to a stamp with no date behind it');
});

test('the cut line names the session instead of saying "today"', () => {
  // "...that traded at twice their own normal volume today" was the same
  // omission in prose: the exchange's last published session is often not the
  // current day.
  assert.doesNotMatch(logic, /normal volume today\./,
    'the English cut line still says "today"');
  assert.match(logic, /normal volume on \{date\}\./,
    'the English cut line does not name the session');
  assert.match(logic, /busyCut[\s\S]{0,220}replace\('\{date\}'/,
    '{date} is left unbound in busyCut, which would print the placeholder');
});

test("Home's two columns end together", () => {
  /* They were `align-items:start`, so each ran to its own length and the
   * shorter stopped ~360px early. Content closed most of it; the stretch takes
   * whatever a given day leaves over.
   */
  assert.match(tpl, /class="home-cols"/, 'the Home grid is not addressable');
  assert.equal((tpl.match(/class="home-col"/g) || []).length, 2,
    'both columns of the Home grid must be marked, not one');
  assert.match(shell, /\.home-cols\s*\{[^}]*align-items:\s*stretch\s*!important/,
    'the columns do not stretch to a shared height');
  assert.match(shell, /\.home-col > section:last-child[\s\S]{0,120}flex:\s*1/,
    'nothing absorbs the slack, so the shorter column still stops early');
});

test('the stretch is desktop-only, because a phone has one column', () => {
  const at = shell.indexOf('.home-cols');
  const before = shell.slice(0, at);
  const query = before.slice(before.lastIndexOf('@media'));
  assert.match(query, /min-width:\s*861px/,
    'the equal-height rule is not scoped to the width where two columns exist');
});

test('the grid string shell.css collapses on a phone is untouched', () => {
  /* shell.css stacks this grid by matching the inline value VERBATIM. Reformat
   * the declaration and the Home grid silently stays two columns at 375px.
   */
  const decl = 'grid-template-columns:minmax(0,1.4fr) minmax(280px,1fr)';
  assert.ok(tpl.includes(decl), 'the Home grid declaration was reformatted');
  assert.ok(shell.includes(`[style*="${decl}"]`),
    'the phone-stacking selector no longer matches the Home grid');
});

test('the busiest list is shorter than the eight it now shows', () => {
  // Read now can hold at most three cards — readNowCards builds a first-since,
  // a silence and the expected-filings count, and no fourth — so this card
  // cannot be met halfway by its neighbour growing.
  assert.match(logic, /const BUSY_SHOWN = 8;/, 'the busiest list is not eight rows');
  assert.match(logic, /\.slice\(0, 12\)\.map\(mkRow\)/,
    'the largest-by-value list no longer fills the short column');
});

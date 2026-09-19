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
// The evidence cards, where the volume multiple and its session date now live.
const ct = await readFile(here('changed-today.js'), 'utf8');

test('the volume multiple says which session it belongs to', () => {
  /* The number is `session volume / median of the previous twenty sessions`,
     so it is a fact about ONE day. Printed bare it reads as a property of the
     share.

     It used to be `busyWhen`, on Home's busiest card. That card left Home for
     the market screen's volume view on 19 September, and the multiple is now
     printed by the evidence card in changed-today.js — which carries the date
     in its own dateline, on the card, where the number is. */
  assert.match(ct, /dateline: t\(stamp\(\[day\(data\.marketDate\)/,
    'the volume card draws no session date');
  assert.match(ct, /\$\{lead\.rv\.toFixed\(1\)\}×/, 'the volume card prints no multiple');
  // Both languages, or half the readership gets a card with no date on it.
  assert.match(logic, /busyOn:'Close of \{date\}'/, 'no English close phrasing');
  assert.match(logic, /busyOnLive:'[^']*\{date\}/, 'no English live-session phrasing');
  assert.equal((logic.match(/busyOn:'/g) || []).length, 2, 'busyOn is not in both languages');
  assert.equal((logic.match(/busyOnLive:'/g) || []).length, 2,
    'busyOnLive is not in both languages');
});


test('a live session is not described as a close', () => {
  /* Mid-session the volume is a PART of a day divided by twenty whole ones, so
     the multiple can only climb until the bell. 3.2x at eleven o'clock and
     3.2x at the close are different readings, and calling the first one a
     close would be the same class of error as the demo banner over live data.

     This was `busyWhen` in logic.js. When the card moved, the datelines in
     changed-today.js said "close" unconditionally — the exact error — while
     the session state sat unread on the data the module was handed. The rule
     lives in `sessionWord` now. */
  assert.match(ct, /function sessionWord\(data, ar\)/, 'nothing decides what the session is');
  const block = ct.slice(ct.indexOf('function sessionWord'), ct.indexOf('function sessionWord') + 400);
  assert.match(block, /data\.isClose/, 'sessionWord ignores whether the session settled');
  assert.match(block, /data\.livePrices/, 'sessionWord ignores the live quote overlay');
  assert.match(block, /session so far/, 'there is no live-session wording');
  assert.match(block, /الجلسة حتى الآن/, 'the live-session wording is missing in Arabic');
  // And the cards that print a session figure use it rather than a literal.
  assert.equal((ct.match(/sessionWord\(data, (false|true)\)/g) || []).length, 4,
    'a dateline still hard-codes the word "close"');
  assert.ok(!/· close ·/.test(ct), 'a literal "close" is back in a dateline');
});


/* 'no date is invented when the session date is unknown' moved to
   changed-today.test.mjs on 19 September. It asserted the guard inside
   `busyWhen`, which no longer exists; the cards that carry a session figure
   are built in that module, so the rule is tested there against the rendered
   card rather than against a string in this file. */

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

test('Home is a single column', () => {
  /* It had two, and they ended at different heights until the last card in
     each was told to absorb the slack. Home was rebuilt on 19 September as
     one headline and its evidence — four blocks, one column — so there is no
     second column to end level with. The rules that squared the grid up are
     gone from shell.css with it; a selector matching nothing is
     indistinguishable from one that is quietly broken. */
  assert.ok(!tpl.includes('class="home-cols"'), 'the two-column grid is back on Home');
  assert.ok(!tpl.includes('class="home-col"'), 'a Home column is back');
  assert.ok(!shell.includes('.home-cols'), 'shell.css still squares up a grid that is gone');
  /* This absorbed 'the stretch is desktop-only, because a phone has one
     column', which checked that the equal-height rule sat inside a
     min-width:861px query. That rule is gone, so the check that matters is
     that it has not come back. */
  assert.ok(!shell.includes('.home-col '), 'the column stretch rule is back');
});


test('no phone-collapse selector is left matching nothing', () => {
  /* shell.css stacks inline grids by matching their declaration VERBATIM, so
     a reformatted declaration silently stays multi-column on a phone. Home's
     two-column grid is gone, and its selector went with it — the check is now
     that every such selector still has a grid to match, rather than that one
     particular string survives. */
  const selectors = [...shell.matchAll(/\[style\*="(grid-template-columns:[^"]+)"\]/g)].map((m) => m[1]);
  assert.ok(selectors.length > 4, 'the phone-collapse selectors are gone');
  const orphans = selectors.filter((decl) => !tpl.includes(decl));
  assert.deepEqual(orphans, [], `these collapse selectors match no grid: ${orphans.join(' | ')}`);
});


test('the busiest list is shorter than the eight it now shows', () => {
  // Read now can hold at most three cards — readNowCards builds a first-since,
  // a silence and the expected-filings count, and no fourth — so this card
  // cannot be met halfway by its neighbour growing.
  assert.match(logic, /const BUSY_SHOWN = 8;/, 'the busiest list is not eight rows');
  assert.match(logic, /\.slice\(0, 12\)\.map\(mkRow\)/,
    'the largest-by-value list no longer fills the short column');
});

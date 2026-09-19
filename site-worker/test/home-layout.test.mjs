/* The layout faults that shipped while 967 tests passed.
 *
 * Every one of these was visible on the page and invisible to this suite. The
 * tests here build components from fixtures and read `renderVals()` — they
 * check DATA. The dom stub has no `createDocumentFragment`, so `mount()` has
 * never executed in a test and the template has never been rendered through
 * dc.js outside a browser. Nothing in the loop could see an overlap, a
 * stretched card or an empty sparkline.
 *
 * The real fix for that is `scripts/dev/serve_signed_in.py`, which runs the
 * site locally with a reader signed in so a change can be LOOKED AT. These
 * assertions are the cheap half: they pin the four causes, in the files where
 * each one lived, so a regression fails here rather than on the owner's
 * screen.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const ROOT = new URL('../../', import.meta.url);
const read = (p) => readFile(new URL(p, ROOT), 'utf8');
const [home, shell, main] = await Promise.all([
  read('public/esthmr/home.css'), read('public/esthmr/shell.css'), read('public/esthmr/main.js'),
]);

test('the lead index card stretches, or its chart has nothing to grow into', () => {
  /* Measured before the fix: the card spanned two grid rows but `align-items:
     start` left it at content height, so `flex: 1` on the chart resolved to
     its own min-height — 132px inside a 334px card, with the bottom empty. */
  const grid = home.slice(home.indexOf('#app .market-head {'), home.indexOf('}', home.indexOf('#app .market-head {')));
  assert.match(grid, /align-items:\s*stretch/, 'the lead card is back at content height');
  assert.doesNotMatch(grid, /align-items:\s*start/);
});

test('the index chart fills its slot instead of its own aspect ratio', () => {
  /* The svg sized itself from its viewBox: 232px wide over a 100×28 box is
     65px, so neither the inline height nor a stretched cross-axis reached it.
     A block parent gives `height: 100%` something to resolve against. */
  const at = home.indexOf('> .idx-chart {');
  assert.notEqual(at, -1, 'the chart slot rule is gone');
  // To the end of that declaration block, not a fixed window: the comment
  // above it is longer than the rule and a character budget measured nothing.
  const rule = home.slice(at, home.indexOf('}', at));
  assert.match(rule, /display:\s*block/, 'the chart slot is a flex row again');
  assert.doesNotMatch(rule, /display:\s*flex/);
  const svgAt = home.indexOf('.idx-chart > svg');
  assert.notEqual(svgAt, -1, 'nothing sizes the chart svg');
  assert.match(home.slice(svgAt, home.indexOf('}', svgAt)), /height: 100% !important/);
});

test('the tape and the bar under it share one column', () => {
  /* The tape ran the full window while the toolbar stopped at the rail —
     1024 against 746 at desk width — so the two bars across the top of every
     page had different right edges. */
  assert.match(shell, /@media \(min-width: 900px\) \{\s*\.ticker-tape \{ margin-inline-start: 278px/);
});

test('the account controls are an overflow at every width', () => {
  /* They were `position: fixed` under the tape, which is where the toolbar
     is: the strip sat at y 54–98 and the toolbar at 38–107, so the reader's
     email and sign-out printed on top of the brand and the search box. */
  assert.match(shell, /@media \(min-width: 701px\)[\s\S]{0,200}body\[data-signed="yes"\] \.account \{ display: none !important; \}/);
  assert.match(shell, /body\[data-signed="yes"\]\[data-account-open\] \.account \{[\s\S]{0,120}display: flex !important;/);
  // Hung from the measured header bottom, never a guessed offset.
  assert.match(shell, /top: calc\(var\(--head-h[^)]*\)[^;]*\) !important;/);
});

test('signing in is never behind the overflow', () => {
  /* A signed-out visitor has one thing to do on that page. The desktop rule
     is scoped to `data-signed="yes"` precisely so it cannot hide #signin. */
  const desk = shell.slice(shell.indexOf('@media (min-width: 701px)'));
  const hides = [...desk.matchAll(/^\s*(body[^{\n]*\.account) \{ display: none/gm)].map((m) => m[1].trim());
  for (const sel of hides) {
    assert.match(sel, /data-signed="yes"/, `${sel} would hide the sign-in button too`);
  }
});

test('a followed company gets its line on Home, not only on the watchlist', () => {
  /* The series loader named one screen. The Home strip drew every card with
     an empty 32px box where its line should be, because the series were never
     asked for. */
  assert.match(main, /component\.state\.screen === 'watchlist' \|\| component\.state\.screen === 'home'/);
  assert.doesNotMatch(main, /component\.state\.screen !== 'watchlist' \|\| component\.data\(\)\.demo/,
    'the loader is gated to one screen again');
});

test('the three evidence cards share a bottom edge, and the tall one is held', () => {
  /* First answer: `align-items: start`, so a card with a 104px picture stopped
     stretching to 476px beside the taller one. That traded dead space inside
     two cards for three ragged bottom edges, and never touched the cause: the
     ownership card's rows were running to six lines each, so it stood at 767.
     Now the rows are held to three lines, the row stretches again, and each
     footer rule is anchored to the bottom so the slack sits above the source
     line rather than under it. All three parts, or the fault comes back in
     one of its two shapes. */
  assert.match(home, /#app \.ct-grid \{ align-items: stretch; \}/, 'the row no longer shares a bottom edge');
  assert.match(home, /#app \.ct-card > \.ct-rule:has\(\+ \.ct-foot\) \{ margin-top: auto; \}/,
    'the footer is not anchored, so the slack lands under the source line');
  assert.match(home, /#app \.ct-own-row \.ct-own-name \{ flex-wrap: nowrap; \}/,
    'the name row wraps again, so the ownership card grows past its neighbours');
  assert.match(home, /#app \.ct-own-row \.pv-share-keys \{[^}]*flex-wrap: nowrap/,
    'the legend stacks one holder per line again');
  assert.ok(!/#app \.ct-grid \{ align-items: start; \}/.test(home), 'the old start rule is back');
});

test('the local signed-in server is kept, because looking at the page is the fix', () => {
  /* The assertions above are the cheap half. None of them would have caught
     an overlap nobody looked at. */
  return readFile(new URL('scripts/dev/serve_signed_in.py', ROOT), 'utf8').then((src) => {
    assert.match(src, /serve_forever/);
    assert.match(src, /auth\/me/, 'the dev server no longer signs anybody in');
    assert.ok(!src.includes('esthmr.com'), 'the dev server points at production');
  });
});

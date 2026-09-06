import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

/* The bottom bar: an island, and one that stays on the bottom edge.
 *
 * Measured in Safari on an iPhone 17 Pro, flicking the home screen:
 *
 *                  peak offset   longest visible run   at rest
 *   before            154 pt            334 ms         10 pt off
 *   after              68 pt             50 ms         exact
 *
 * 334 ms with the bar 154 pt up a 754 pt screen is the reader's "the nav flies
 * to the middle of the screen". The cause is not our CSS: `bottom: 0` resolves
 * against the LAYOUT viewport, Safari grows that from 714 to 754 as its own
 * toolbar collapses under the scroll, and it re-resolves fixed elements only
 * when the gesture ends.
 */
const here = (p) => new URL(`../../public/esthmr/${p}`, import.meta.url);
const css = await readFile(here('journal.css'), 'utf8');
const nav = await readFile(here('navbar.js'), 'utf8');
const main = await readFile(here('main.js'), 'utf8');

test('the bar is an island, clear of all four edges', () => {
  /* The phone rule, not the desktop one. `#app .om-rail` is declared twice —
     the sidebar first, the bottom bar inside a media query further down — and
     taking the first made this fail against a stylesheet that was correct. */
  const blocks = [...css.matchAll(/#app \.om-rail \{([^}]*)\}/g)].map((m) => m[1]);
  const block = blocks.find((b) => /inset:\s*auto/.test(b));
  assert.ok(block, 'no #app .om-rail rule turns it into a bottom bar');
  assert.match(block, /inset:\s*auto\s+max\(10px/,
    'the bar is back on the left and right edges');
  assert.match(block, /calc\(10px \+ env\(safe-area-inset-bottom\)\)/,
    'the bar sits on the bottom edge rather than floating clear of it');
  // One radius, not two: "24px 24px 0 0" is a strip the page ends at.
  assert.match(block, /border-radius:\s*26px\s*!important/,
    'the corners are not all rounded, so it reads as a strip and not an island');
  assert.match(block, /border:\s*1px solid/,
    'an island needs an edge all the way round, not just along the top');
  assert.doesNotMatch(block, /border-top:\s*1px/,
    'a top-only border is left over from the edge-to-edge bar');
});

test('the page reserves room for a bar that floats', () => {
  // The bar is 10px off the bottom now, and the clearance has to cover that or
  // the last line of every screen hides underneath it.
  assert.match(css, /padding: 64px 16px calc\(110px \+ env\(safe-area-inset-bottom\)\)/,
    'the page clearance was not raised to match the floating bar');
});

test('the bar is corrected by measurement, not by prediction', () => {
  /* The first attempt computed where the bar OUGHT to be, from
   * `visualViewport` against `documentElement.clientHeight`. iOS anchors a
   * fixed element to `innerHeight` instead — the larger of the two — so that
   * version pushed the bar 30px BELOW the screen with the labels cut off.
   *
   * Reading the bar's real position back and closing the gap is correct
   * whichever viewport the browser anchors to, which is the point. */
  assert.match(nav, /getBoundingClientRect\(\)/,
    'the correction no longer reads the bar\'s actual position');
  assert.match(nav, /vv\.height - \(box\.bottom - vv\.offsetTop\)/,
    'the gap is not measured against the visual viewport');
  assert.match(nav, /shift \+ gap/,
    'the measured gap is not folded into the existing transform, so a wrong '
    + 'position is never corrected');
  // Comments stripped: navbar.js explains the failed first attempt in prose,
  // and that prose necessarily names the baseline it stopped using.
  const code = nav.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
  assert.doesNotMatch(code, /documentElement\.clientHeight/,
    'the predictive baseline is back; it put the bar below the screen');
});

test('the correction costs nothing when there is nothing to correct', () => {
  // Every desktop browser and Android has one viewport, and this must be inert
  // there rather than a frame loop that never stops.
  assert.match(nav, /if \(!vv \|\| typeof window\.matchMedia !== 'function'\) return/,
    'a browser without visualViewport is not left alone');
  assert.match(nav, /if \(!gap\) return/, 'a zero gap still writes a transform');
  assert.match(nav, /Date\.now\(\) < until/,
    'the frame loop has no stopping condition, so it runs for the life of the page');
  assert.match(nav, /narrow\.matches/,
    'the sidebar on a wide screen would be dragged vertically too');
  assert.match(nav, /LIMIT/, 'an odd viewport reading can fling the bar off the page');
});

test('the pin is actually started', () => {
  // navbar.js exporting a working function that nothing calls would leave the
  // bug exactly where it was.
  assert.match(main, /import \{ pinBottomBar \} from '\.\/navbar\.js'/,
    'main.js does not import the pin');
  assert.match(main, /^pinBottomBar\(\);$/m, 'main.js never starts the pin');
});

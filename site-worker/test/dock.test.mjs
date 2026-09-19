/* The dock: the desktop tab selector as a floating island at the bottom.
 *
 * The owner's brief, 19 Sep 2026: "move the tab selector on desktop to be
 * exactly like the mobile one in the bottom … clean floating like an island
 * by itself … on desktop make the icon expand showing its name."
 *
 * What these pin is the shape a reader meets, not the pixel values: the rail
 * is at the bottom and centred; the names are closed until hover, focus or
 * being the current place; the page is one column again with nothing left
 * over from the side rail; and the block is declared after the rail rules it
 * has to beat, because at equal specificity the later `!important` wins.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const ROOT = new URL('../../', import.meta.url);
const css = await readFile(new URL('public/esthmr/journal.css', ROOT), 'utf8');
const at = css.indexOf('THE DOCK');
const dock = css.slice(at);

test('the dock exists, and is declared after the rail rules it overrides', () => {
  assert.notEqual(at, -1, 'no dock block in journal.css');
  const lastRail = css.lastIndexOf('#app .om-rail { width:278px !important; }');
  assert.ok(lastRail !== -1 && lastRail < at, 'the dock is declared before a rail rule that would beat it');
  assert.match(dock, /@media \(min-width: 861px\)/, 'the dock is not scoped to desktop');
});

test('the island sits at the bottom, centred, clear of the edges', () => {
  const rail = /#app \.om-rail \{([^}]*)\}/.exec(dock)[1];
  assert.match(rail, /position: fixed !important/);
  assert.match(rail, /inset: auto auto 18px 50% !important/, 'the island is not hung from the bottom centre');
  assert.match(rail, /transform: translateX\(-50%\)/, 'the island is centred by its left edge, not its middle');
  assert.match(rail, /width: max-content !important/, 'the island stretches to a bar');
  assert.match(rail, /flex-direction: row !important/);
  assert.match(rail, /border-radius: 26px !important/, 'a strip, not an island');
  assert.match(rail, /backdrop-filter: blur/, 'the island is opaque over the content it floats on');
});

test('the signed-out rail offset cannot stretch the island', () => {
  assert.match(dock, /body\[data-signed="no"\] #app \.om-rail \{ inset-block-start: auto !important; \}/);
});

test('the brand and the session stamp are not on the dock', () => {
  assert.match(dock, /#app \.om-rail > \.om-brand, #app \.om-rail > \.om-session \{ display: none !important; \}/);
});

test('a name is closed until hover, focus, or being the current place', () => {
  const closed = /#app \.om-nav > button > span \{([^}]*)\}/.exec(dock);
  assert.ok(closed, 'the name has no closed state');
  assert.match(closed[1], /max-width: 0/);
  assert.match(closed[1], /opacity: 0/);
  assert.match(closed[1], /transition: max-width/, 'the name pops instead of sliding');
  const open = /#app \.om-nav > button:hover > span, #app \.om-nav > button:focus-visible > span,\s*#app \.om-nav > button\[aria-current="page"\] > span, #app \.om-nav > button\[aria-current="true"\] > span \{([^}]*)\}/.exec(dock);
  assert.ok(open, 'hover, focus and current do not all open the name');
  assert.match(open[1], /max-width: 180px/);
  assert.match(open[1], /opacity: 1/);
  // dc.js writes aria-current="page" (the ARIA value), so a selector on "true"
  // alone left the current tab closed and untinted.
  assert.match(dock, /#app \.om-nav > button\[aria-current="page"\], #app \.om-nav > button\[aria-current="true"\] \{[^}]*background: var\(--accTint\)/, 'the current place is not tinted');
  assert.match(dock, /button:focus-visible \{ outline: 2px solid var\(--accent\)/, 'keyboard focus has no visible state');
});

test('the dock holds places, not settings', () => {
  /* Language, theme and the data version were the rail's; on desktop the
     rail's tool strip is hidden and the same switches live in the toolbar's
     preferences popover. A first draft styled a settings tail onto the dock
     that could never render — dead rules that would have misled the next
     reader of this file. */
  assert.match(css, /#app \.om-tools \{ display: none !important; \}/, 'the rail tools are shown on desktop again');
  assert.doesNotMatch(dock, /\.om-tools[^\n]*\{/, 'the dock styles a settings tail that is display: none');
});

test('the page is one column again, clear of the island at the bottom', () => {
  const main = /#app \.om-main \{([^}]*)\}/.exec(dock)[1];
  assert.match(main, /margin-inline: auto !important/, 'the column still leaves the rail its 278px');
  assert.match(main, /padding-bottom: 128px !important/, 'the last card runs under the island');
  assert.match(dock, /\.ticker-tape \{ margin-inline-start: 0 !important; width: 100% !important; \}/);
});

test('motion is optional', () => {
  assert.match(dock, /@media \(prefers-reduced-motion: reduce\)[\s\S]*transition: none/);
});

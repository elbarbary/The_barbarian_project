/* The redesign's component layer, and the rules it exists to hold.
 *
 * `primitives.js` is the closed set of five charts plus the evidence chip and
 * the six data states. Most of what it is for is invisible in a screenshot —
 * that a gap is not a zero, that a stale price is not a current one, that an
 * unknown remainder is not absorbed — so those are the things tested here.
 *
 * Two of these rules are not stylistic. A reading drawn as a gauge is a
 * forecast, and ESTHMR is not FRA-licensed; a chart with a figure written
 * into its source is an invented figure about a named market. Both are §8
 * problems that would pass a visual review, which is why they are asserted
 * against the code rather than left to the eye.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const here = (p) => new URL(`../../public/esthmr/${p}`, import.meta.url);
const js = await readFile(here('primitives.js'), 'utf8');
const css = await readFile(here('primitives.css'), 'utf8');
const design = await readFile(here('design.css'), 'utf8');
const index = await readFile(here('index.html'), 'utf8');
/* The comments name the things the code must not do, so the rules read the
   code alone — the same trick `signed-out.test.mjs` needs. */
const code = js.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const sheet = css.replace(/\/\*[\s\S]*?\*\//g, '');

test('the stylesheet is actually loaded', () => {
  assert.match(index, /<link rel="stylesheet" href="\.\/primitives\.css">/,
    'primitives.css is not linked from index.html, so none of it renders');
});

test('every colour is a token, so both themes resolve', () => {
  const hex = code.match(/#[0-9a-fA-F]{3,8}\b/g) || [];
  assert.deepEqual(hex, [],
    `primitives.js hard-codes ${hex.join(', ')}; the design comp is one theme and the site has two`);
  const cssHex = sheet.match(/#[0-9a-fA-F]{3,8}\b/g) || [];
  assert.deepEqual(cssHex, [], `primitives.css hard-codes ${cssHex.join(', ')}`);
});

test('the tokens it spends are declared in both themes', () => {
  const used = new Set([...code.matchAll(/var\((--[\w-]+)\)/g)].map((m) => m[1]));
  for (const t of ['--hatch', '--hatchBg', '--stStale', '--stEstimated', '--stNone']) {
    assert.ok(used.has(t) || sheet.includes(`var(${t})`), `${t} is declared but never used`);
  }
  const light = design.slice(design.indexOf('[data-theme="light"]'), design.indexOf('[data-theme="dark"]'));
  const dark = design.slice(design.indexOf('[data-theme="dark"]'));
  for (const t of [...used].concat(['--hatch', '--hatchBg', '--stStale', '--stEstimated', '--stNone'])) {
    assert.ok(light.includes(`${t}:`), `${t} is used but never declared for the light theme`);
    assert.ok(dark.includes(`${t}:`), `${t} is used but never declared for the dark theme`);
  }
});

test('no figure is written into the component source', () => {
  /* A component may carry coordinates and sizes. What it may not carry is a
     price, a percentage or a company — those come from a published document
     or they do not appear. */
  assert.doesNotMatch(code, /\b\d{1,3}(,\d{3})+(\.\d+)?\b/,
    'a grouped number in the source is a figure nobody filed');
  assert.doesNotMatch(code, /[+-]\d+(\.\d+)?%/, 'a signed percentage is a claim about a market');
  for (const ticker of ['COMI', 'TMGH', 'SWDY', 'ABUK', 'EGX 30', 'EGX30']) {
    assert.ok(!code.includes(ticker), `${ticker} is named in a component that draws whatever it is given`);
  }
});

test('the fragility reading can never be drawn as a gauge', () => {
  /* A dial with a needle in a red arc reads as a prediction. The reading is a
     dot on its own history, which reads as a measurement — the only one of
     the two this product is allowed to make. */
  for (const banned of ['gauge', 'needle', 'dial', 'speedometer', 'trafficLight']) {
    assert.ok(!new RegExp(banned, 'i').test(code), `${banned} appears in the primitives`);
  }
  assert.match(code, /export function distributionDot/, 'the distribution dot is the only reading shape');
  /* An arc is how a gauge is drawn. There are no arcs in a closed set of
     five that contains no radial chart. */
  assert.doesNotMatch(code, /\bA\s*-?\d[\d.]*\s+-?\d[\d.]*\s+/, 'an SVG arc command suggests a dial');
});

test('the closed set is exactly five, plus the shared atoms', () => {
  const exported = [...js.matchAll(/export (?:function|const) (\w+)/g)].map((m) => m[1]);
  for (const shape of ['line', 'pairedBars', 'shareBar', 'distributionDot', 'datedTimeline']) {
    assert.ok(exported.includes(shape), `${shape} is missing from the closed set`);
  }
  for (const atom of ['evidenceChip', 'stateMark', 'densitySwitch', 'skeleton', 'dateline', 'figure']) {
    assert.ok(exported.includes(atom), `${atom} is missing`);
  }
});

test('a gap is a hole, not a line drawn across it', () => {
  /* Interpolating over a suspension draws a straight segment at prices
     nobody paid, on exactly the companies a reader is most wary of. */
  assert.match(code, /runs\.push\(run\)/, 'the line does not break its path at a gap');
  assert.match(code, /url\(#\$\{hatch\}\)/, 'the gap is not hatched');
});

test('stale and unchanged cannot look alike', () => {
  /* The highest-severity visual bug in the product before this file: a price
     six sessions old and a price that did not move rendered identically. */
  assert.match(sheet, /\.pv-chip\[data-state="stale"\][^}]*border-style:\s*dashed/,
    'the stale chip has no edge of its own');
  assert.ok(sheet.includes('[data-state="didNotTrade"]'), 'did-not-trade has no treatment');
  assert.notEqual(
    (sheet.match(/\.pv-chip\[data-state="stale"\]\s*\{([^}]*)\}/) || [])[1],
    (sheet.match(/\.pv-chip\[data-state="didNotTrade"\]\s*\{([^}]*)\}/) || [])[1],
    'stale and did-not-trade render the same');
});

test('the six states all exist and each has a distinct mark', () => {
  const states = ['present', 'unavailable', 'stale', 'didNotTrade', 'estimated', 'zero'];
  for (const s of states) assert.ok(code.includes(`${s}:`), `the ${s} state is missing`);
  const marks = [...code.matchAll(/mark:\s*'([^']*)'/g)].map((m) => m[1]).filter(Boolean);
  assert.equal(new Set(marks).size, marks.length, 'two states share a mark');
});

test('the unknown remainder is named, never absorbed', () => {
  /* Normalising the known parts to 100% is the commonest way a share bar
     turns "we know 52% of this" into "we know all of it". */
  assert.match(code, /const total = known \+ rest/, 'the share bar normalises away its remainder');
  assert.match(code, /not disclosed|غير معلن/, 'the remainder has no name');
});

test('a missing period is not a zero-height bar', () => {
  assert.match(code, /g\.missing/, 'paired bars have no missing-period case');
  assert.match(code, /strokeDasharray: '4 3'/, 'the missing period is not outlined');
});

test('a chart with nothing to draw says so in words', () => {
  const nothings = [...code.matchAll(/return nothing\(/g)];
  assert.ok(nothings.length >= 5, `only ${nothings.length} shapes refuse to draw an empty chart`);
});

test('every coordinate is checked finite', () => {
  /* A NaN in a path does not throw. It silently erases the line, which is
     the worst of both outcomes: no error and no chart. */
  assert.match(code, /export const finite/);
  for (const shape of ['function line', 'function pairedBars', 'function distributionDot']) {
    const at = code.indexOf(shape);
    assert.ok(at > 0, `${shape} not found`);
    assert.match(code.slice(at, at + 1400), /finite\(/, `${shape} writes coordinates unchecked`);
  }
});

test('controls are reachable by keyboard and big enough to hit', () => {
  assert.match(sheet, /min-height:\s*44px/, 'no 44px touch target anywhere');
  assert.match(sheet, /focus-visible/, 'nothing has a visible focus state');
  assert.match(code, /'aria-pressed'/, 'the density switch does not say which tab is on');
});

test('numbers inside Arabic prose stay attached to their sign', () => {
  /* Without the isolation a leading minus wanders to the far side of the
     sentence, where it reads as belonging to the next figure — a loss
     printed as a gain. */
  assert.match(sheet, /unicode-bidi:\s*isolate/, 'figures are not isolated in RTL');
  assert.match(code, /export function figure/);
});

/* ── the page is flat, and its accent is readable ───────────────────────── */

test('no reading surface is frosted glass', async () => {
  /* The comp is paper: a surface, an edge, a radius. `backdrop-filter` on a
     card is the look it replaced, and it is also the single most expensive
     thing to composite on a phone — the site had eight of them inline in one
     template. A scrim behind a modal is a different job and is left alone. */
  const template = await readFile(here('template.html'), 'utf8');
  assert.doesNotMatch(template, /backdrop-filter/, 'a card in the template is still frosted');
});

test('text on the accent is a token, not the palette ink', async () => {
  /* `#1B1917` was the ink for chips sitting ON the accent, back when the
     accent was a pale warm teal. It is #126B75 now and dark ink on it fails
     contrast — which is why a rule existed that repainted every such chip in
     the light theme and left the dark theme wrong. */
  for (const file of ['template.html', 'logic.js']) {
    const src = await readFile(here(file), 'utf8');
    assert.doesNotMatch(src, /#1B1917/, `${file} paints text with the old ink`);
  }
  const sheet = await readFile(here('journal.css'), 'utf8');
  assert.doesNotMatch(sheet, /#1B1917/, 'the light-theme patch for that ink is still here');
  const light = design.slice(design.indexOf('[data-theme="light"]'), design.indexOf('[data-theme="dark"]'));
  const dark = design.slice(design.indexOf('[data-theme="dark"]'));
  assert.ok(light.includes('--onAccent:'), '--onAccent is not declared for the light theme');
  assert.ok(dark.includes('--onAccent:'), '--onAccent is not declared for the dark theme');
});

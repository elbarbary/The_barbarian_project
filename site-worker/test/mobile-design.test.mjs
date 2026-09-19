import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../../public/esthmr/', import.meta.url);
const [html, template, css] = await Promise.all(
  ['index.html', 'template.html', 'journal.css'].map(file => readFile(new URL(file, root), 'utf8'))
);

test('mobile navigation reserves the phone safe area and keeps five named destinations', () => {
  assert.match(html, /name="viewport"[^>]*viewport-fit=cover/);
  // 110px, not 100px: the bar is an island now and floats 10px clear of the
  // bottom edge, so the page has to reserve that 10px as well or the last
  // line of every screen sits under it.
  assert.match(css, /padding: 64px 16px calc\(110px \+ env\(safe-area-inset-bottom\)\)/);
  assert.match(css, /grid-template-columns: repeat\(5,minmax\(0,1fr\)\)/);
  assert.match(template, /onClick="{{ n.go }}" aria-current="{{ n.current }}"/);
  assert.match(css, /min-height: 64px/);
});

test('mobile comparisons retain identity, the four measures, and the full-results action', () => {
  /* All three lived on Home and moved on 19 September: the mosaic to the heat
     screen, whose treemap is the fuller version of it, and the measures and
     the explorer's results action to the market screen. What matters is that
     a phone reader still gets a company's identity on a tile, the measures
     without expanding anything, and a way to the full results. */
  const heat = template.slice(template.indexOf('{{ isHeat }}'));
  assert.match(heat, /\{\{ h\.name \}\}|\{\{ m\.name \}\}/, 'the heat tiles carry no company identity');
  const market = template.indexOf('{{ isMarket }}');
  const summary = template.indexOf('class="market-measure-grid"');
  assert.ok(summary > market, 'the four measures are not on the market screen');
  assert.ok(!template.slice(market).includes('showHomeDetails'), 'the measures are behind a toggle');
  /* "Full results" was a button on Home's launcher, which showed controls and
     no rows: the action existed because the results were somewhere else. On
     the market screen the reader IS at the results, so what has to be true is
     that the rows are actually rendered rather than previewed. */
  assert.ok(template.slice(market).includes('explorer-table'), 'the market screen shows no results table');
  assert.ok(template.slice(market).includes('{{ explorer.metrics }}'), 'the measure controls are gone');
  assert.match(css, /\.market-measure-grid \{ grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
});


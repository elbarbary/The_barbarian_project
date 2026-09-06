import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../../public/esthmr/', import.meta.url);
const [html, template, css] = await Promise.all(
  ['index.html', 'template.html', 'journal.css'].map(file => readFile(new URL(file, root), 'utf8'))
);

test('mobile navigation reserves the phone safe area and keeps five named destinations', () => {
  assert.match(html, /name="viewport"[^>]*viewport-fit=cover/);
  assert.match(css, /padding: 64px 16px calc\(100px \+ env\(safe-area-inset-bottom\)\)/);
  assert.match(css, /grid-template-columns: repeat\(5,minmax\(0,1fr\)\)/);
  assert.match(template, /onClick="{{ n.go }}" aria-current="{{ n.current }}"/);
  assert.match(css, /min-height: 64px/);
});

test('mobile comparisons retain identity, the four measures, and the full-results action', () => {
  assert.match(template, /class="mosaic-company"[^>]*>{{ m.name }}/);
  const summary = template.indexOf('class="market-measure-grid"');
  assert.ok(summary > 0 && summary < template.indexOf('<sc-if value="{{ showHomeDetails }}">'));
  assert.match(template, /class="results-button" onClick="{{ explorer.open }}"/);
  assert.match(css, /\.market-measure-grid \{ grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
});

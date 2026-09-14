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

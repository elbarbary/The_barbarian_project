/* A heading that named a metric now asks the question the block answers.
 * 40 of 85 headings on the rendered page named a metric or a term of art
 * (Jev, 19 Sep 2026); a reader who does not know the word learned nothing
 * from the heading. The question is the heading; the metric's name follows
 * it as a small term, so the reader who knows it still finds it. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const ROOT = new URL('../../', import.meta.url);
const [logic, html, css] = await Promise.all(['public/esthmr/logic.js', 'public/esthmr/template.html', 'public/esthmr/journal.css']
  .map((p) => readFile(new URL(p, ROOT), 'utf8')));
const dict = (name) => { const at = logic.indexOf(`    const ${name} = {`); return logic.slice(at, logic.indexOf('\n    };', at)); };
const sites = [...html.matchAll(/<h([1-4])\b[^>]*>\{\{ L\.(\w+)Question \}\} <small class="h-term">\{\{ L\.(\w+) \}\}<\/small><\/h\1>/g)];

test('every question heading keeps its metric beside it, and exists in both languages', () => {
  assert.ok(sites.length >= 5, `only ${sites.length} question headings in the template`);
  for (const [, , q, k] of sites) {
    assert.equal(q, k, `${q}Question is paired with ${k}`);
    for (const name of ['en', 'ar']) {
      assert.match(dict(name), new RegExp(`\\b${k}Question:'`), `${name}.${k}Question missing`);
      assert.match(dict(name), new RegExp(`\\b${k}:'`), `${name}.${k} missing`);
    }
  }
});

test('the term is styled as a small term, not as a second heading', () => {
  assert.match(css, /#app h1 \.h-term, #app h2 \.h-term, #app h3 \.h-term \{[^}]*font-size: \.58em/);
  assert.match(css, /\.h-term \{[^}]*color: var\(--faint\)/);
});

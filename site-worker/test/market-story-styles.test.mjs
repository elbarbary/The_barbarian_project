import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = name => readFileSync(new URL(`../../public/esthmr/${name}`, import.meta.url), 'utf8');
test('the shared news and disclosures stylesheet is included in the page', () => {
  assert.match(read('index.html'), /href="\.\/market-story\.css"/);
});
test('every story component used by the template has a stylesheet rule', () => {
  const template = read('template.html'), css = read('market-story.css');
  const classes = new Set([...template.matchAll(/class="([^"]+)"/g)]
    .flatMap(match => match[1].split(/\s+/)).filter(name => name.startsWith('story-')));
  for (const name of classes) assert.ok(css.includes(`.${name}`), `Missing styling for ${name}`);
});
test('story styles retain small-screen reflow and visible selection and focus', () => {
  const css = read('market-story.css');
  assert.match(css, /@media\(max-width:700px\)/);
  assert.match(css, /grid-template-columns:minmax\(0,1fr\)/);
  assert.match(css, /aria-pressed=true/);
  assert.match(css, /:focus-visible/);
});

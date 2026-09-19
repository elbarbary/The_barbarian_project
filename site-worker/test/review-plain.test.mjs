/* The review card's sentence did two jobs — a plain statement, then the
 * expert caveat, in one paragraph — and no better opening could rescue that
 * shape (a Jev-picked lead moved revPbBody by +0.02). The dictionary may now
 * carry <base>Plain, one sentence a reader follows, and <base>Nuance, the
 * caveats, shown behind a disclosure. Nothing is dropped: the nuance keeps
 * every fact the old body carried, and a metric with no Plain yet still
 * shows its old body. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const ROOT = new URL('../../', import.meta.url);
const read = (p) => readFile(new URL(p, ROOT), 'utf8');
const [logic, html, css] = await Promise.all([
  read('public/esthmr/logic.js'), read('public/esthmr/template.html'), read('public/esthmr/journal.css'),
]);
const dict = (name) => {
  const at = logic.indexOf(`    const ${name} = {`);
  assert.notEqual(at, -1, `no ${name} dictionary`);
  return logic.slice(at, logic.indexOf('\n    };', at));
};
const words = (s) => s.trim().split(/\s+/).filter(Boolean).length;
// §8 (Law 95/1992): a plain sentence is the one a reader trusts most, so it
// is held to the same list as everything else.
const BAN = /اشترِ|اشتر\b|بِع\b|رخيص|غالي|فرصة|ننصح|يجب|مبالغ في|سعر مستهدف|\bbuy\b|\bsell\b|\bcheap\b|expensive|opportunit|recommend|\bshould\b|undervalued|overvalued|\btarget\b/i;

test('every review metric carries its base key, so a plain sentence can be looked up', () => {
  const entries = [...logic.matchAll(/(\w+): \[L\.(rev\w+), L\.\2Ask, L\.\2Body, L\.rev\w+, '(rev\w+)'\],/g)];
  assert.equal(entries.length, 10, 'a metric lost its base key');
  for (const m of entries) assert.equal(m[2], m[3], `${m[1]} names a base key that is not its own`);
});

test('the card shows the plain sentence when there is one, and never loses the old body', () => {
  assert.match(logic, /const plain = \(base && L\[base \+ 'Plain'\]\) \|\| '';/);
  assert.match(logic, /const nuance = \(base && L\[base \+ 'Nuance'\]\) \|\| '';/);
  assert.match(logic, /const body = plain \|\| body0;/, 'a metric with no Plain would show nothing');
  assert.match(logic, /key: m\.key, label, ask, nuance, hasNuance: Boolean\(nuance\),/);
});

test('the caveats sit behind a disclosure directly under the body', () => {
  const i = html.indexOf('{{ rt.body }}'), j = html.indexOf('{{ rt.nuance }}');
  assert.ok(i !== -1 && j > i, 'the nuance is not rendered after the body');
  assert.match(html.slice(i, j), /<sc-if value="\{\{ rt\.hasNuance \}\}">\s*<details class="rev-nuance"><summary>\{\{ L\.revNuanceLabel \}\}<\/summary><div>$/);
  assert.match(css, /#app \.rev-nuance > summary \{[^}]*cursor: pointer/, 'the summary does not look openable');
  assert.match(css, /#app \.rev-nuance > summary:focus-visible \{ outline/, 'keyboard focus has no visible state');
  assert.equal((logic.match(/revNuanceLabel:'/g) || []).length, 2, 'the label is not in both languages');
});

test('a plain sentence is short, holds no advice, and has its nuance and its metric beside it', () => {
  for (const name of ['en', 'ar']) {
    const d = dict(name);
    const plains = [...d.matchAll(/(rev\w+)Plain:'((?:[^'\\]|\\.)*)'/g)];
    for (const [, base, text] of plains) {
      assert.ok(words(text) <= 22, `${name}.${base}Plain runs to ${words(text)} words`);
      assert.doesNotMatch(text, BAN, `${name}.${base}Plain carries a directive`);
      assert.match(d, new RegExp(`${base}Nuance:'`), `${name}.${base}Plain has no ${base}Nuance`);
      assert.match(d, new RegExp(`${base}Body:'`), `${name}.${base}Plain names a metric that does not exist`);
    }
    const nuances = [...d.matchAll(/(rev\w+)Nuance:'/g)];
    for (const [, base] of nuances) assert.match(d, new RegExp(`${base}Plain:'`), `${name}.${base}Nuance has no plain sentence above it`);
  }
  const n = (name) => (dict(name).match(/rev\w+Plain:'/g) || []).length;
  assert.equal(n('en'), n('ar'), 'the plain sentences are not in both languages');
});

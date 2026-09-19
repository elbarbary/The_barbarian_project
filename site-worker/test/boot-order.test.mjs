/* The boot, and the one ordering rule it has to keep.
 *
 * `main.js` does two things at once: it fetches the page template, and it
 * asks the worker who is reading and loads that reader's data. Those two race
 * every time the page opens, and either can win.
 *
 * The bug this file exists for: `component.state.dataLoading = true` sat on
 * the line above `mount()`, which runs only after the template fetch has
 * resolved. When the DATA won that race — a warm cache, a slow template,
 * production rather than a local file server — `load()` had already finished
 * and set the flag false, and that line raised it again with nothing left to
 * lower it. The reader got "loading market data for your account" forever,
 * over a page whose data had already arrived: the ticker printed live prices
 * above a permanent spinner, and every card on Home was missing.
 *
 * It is not a hypothetical race. It is what esthmr.com served on
 * 18 September 2026.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const main = await readFile(new URL('../../public/esthmr/main.js', import.meta.url), 'utf8');
/* The rule is about code, and the comment above the fix necessarily quotes
   the thing the code must not do. */
const code = main.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

test('the loading flag is raised before the first await, and never after one', () => {
  const writes = [...code.matchAll(/component\.state\.dataLoading\s*=/g)].map((m) => m.index);
  assert.equal(writes.length, 1, `dataLoading is assigned directly ${writes.length} times; one initialiser is the whole budget`);
  const firstAwait = code.indexOf('await ');
  assert.ok(firstAwait > 0, 'main.js awaits nothing, so this test is reading the wrong file');
  assert.ok(writes[0] < firstAwait,
    'the page is marked loading after an await, so a load that finished first is overwritten');
  const mountAt = code.indexOf('mount(template');
  assert.ok(mountAt > 0 && writes[0] < mountAt, 'the flag is raised at mount time rather than at boot');
});

test('only load() lowers it, and it lowers it on every path it owns', () => {
  const at = code.indexOf('async function load(');
  const end = code.indexOf('\n}\n', code.indexOf('catch (error)', at));
  const body = code.slice(at, end);
  assert.ok(body.includes('dataLoading: true'), 'load() does not claim the flag');
  // The signed-out branch, the success path and the failure path each clear
  // it. A path that returns without clearing strands the spinner.
  assert.ok((body.match(/dataLoading:\s*false/g) || []).length >= 3,
    'a path through load() returns without clearing the loading state');
});

test('a component that has never been loaded does not claim to have data', async () => {
  // The flag is the whole signal: the initial state carries no `dataLoading`,
  // so if main.js stops setting it the page opens on an empty market with no
  // spinner and no error — which reads as "the exchange is empty today".
  const { Component } = await import('../../public/esthmr/logic.js');
  const c = new Component({});
  assert.equal(c.state.dataLoading, undefined,
    'the initial state now carries the flag, so main.js is no longer the only place it is set');
  assert.deepEqual(c.data().companies, []);
});

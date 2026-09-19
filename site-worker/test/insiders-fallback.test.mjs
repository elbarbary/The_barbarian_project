/* A failed document may not become five invented filings.
 *
 * `data.insiders()` used to end `return demo().insiders` — on a 401, a 429, a
 * 500, an empty document or a malformed one. Those five records carry
 * `filingId: '294408'`, `sourceType: 'bulletin'` and the attribution
 * "Official exchange disclosures filed under Capital Market Law Articles 29
 * & 38".
 *
 * WHAT WAS AND WAS NOT AT RISK. The companies are the demo exchange's own
 * DEMO01..DEMO16, named "Sample Company N", so no real security was ever
 * named by this path — the earlier fabricated-statements incident it rhymes
 * with was worse in exactly that respect. What was fabricated here is the
 * PROVENANCE: transactions that say they were filed under two named articles
 * of Egyptian law and were filed nowhere.
 *
 * It was also the last `demo()` fallback in the file, and since 18 September
 * the demo is served to nobody — signed out there is no dataset at all. So
 * every reader who could still reach it was a signed-in one, on a page whose
 * every other block held the real exchange.
 *
 * These tests drive the real `insiders()` against each failure the review
 * names and assert that nothing resembling a sample record comes back.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { installDom } from './dom-stub.mjs';

installDom();
const ROOT = new URL('../../', import.meta.url);
const read = (p) => readFile(new URL(p, ROOT), 'utf8');
const dataSrc = await read('public/esthmr/data.js');

/** Stand in for the network for one call, then put it back. */
async function withFetch(impl, run) {
  const held = globalThis.fetch;
  globalThis.fetch = impl;
  try { return await run(); } finally { globalThis.fetch = held; }
}
const respond = (status, body) => async () => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => {
    if (typeof body === 'function') return body();
    return body;
  },
});

const { insiders } = await import('../../public/esthmr/data.js');

test('the demo fallback is gone from the source, and it was the last one', () => {
  assert.doesNotMatch(dataSrc, /return demo\(\)\.insiders/);
  assert.equal(dataSrc.match(/return demo\(\)/g), null,
    'a demo fallback is back in a live data path');
});

for (const [name, impl] of [
  ['401 not signed in', respond(401, {})],
  ['403 forbidden', respond(403, {})],
  ['429 rate limited', respond(429, {})],
  ['500 upstream failure', respond(500, {})],
  ['a network that never answers', async () => { throw new Error('ECONNRESET'); }],
  ['an empty document', respond(200, { items: [] })],
  ['a document with no items at all', respond(200, {})],
  ['a malformed document', respond(200, () => { throw new SyntaxError('Unexpected token'); })],
  ['items that are not an array', respond(200, { items: { 0: 'x' } })],
  ['null', respond(200, null)],
]) {
  test(`${name} returns nothing, not a sample`, async () => {
    const out = await withFetch(impl, () => insiders());
    assert.equal(out, null, `${name} produced ${JSON.stringify(out)?.slice(0, 120)}`);
  });
}

test('a real document still comes back whole', async () => {
  /* The guard has to fail closed, not always. */
  const real = { asOf: '2026-09-17', items: [{ id: 'x', ticker: 'COMI', shares: 1 }] };
  const out = await withFetch(respond(200, real), () => insiders());
  assert.deepEqual(out, real);
});

test('no sample record can reach a screen through any of those paths', async () => {
  /* The specific strings a reader would have seen. If any of them can come
     back out of `insiders()`, the fallback is back in some form. */
  const tells = ['294408', 'Official EGX Daily Bulletins', 'Capital Market Law Articles 29',
    'demo-ins-1', 'Sample Company'];
  for (const impl of [respond(401, {}), respond(500, {}), respond(200, { items: [] }),
    async () => { throw new Error('offline'); }]) {
    const out = await withFetch(impl, () => insiders());
    const text = JSON.stringify(out ?? null);
    for (const tell of tells) {
      assert.ok(!text.includes(tell), `a failed fetch produced "${tell}"`);
    }
  }
});

test('the screen says the document failed, which is different from saying nothing matched', async () => {
  /* Two absences, two sentences. `insiderEmpty` tells a reader to widen the
     dates; no filter change fixes a failed fetch. Before this the failed case
     rendered nothing at all, so a broken document and a quiet week were
     indistinguishable. */
  const logic = await read('public/esthmr/logic.js');
  const template = await read('public/esthmr/template.html');
  assert.match(logic, /insidersUnavailable: \(investorTab === 'insiders' \|\| investorTab === 'both'\)/);
  assert.match(logic, /insidersDownTitle:'These filings could not be read'/);
  assert.match(logic, /insidersDownTitle:'تعذّرت قراءة هذه الإفصاحات'/);
  assert.match(template, /<sc-if value="\{\{ insidersUnavailable \}\}">/);
  assert.match(template, /\{\{ L\.insidersDownBody \}\}/);
  // And it can be retried, because that is the action that helps.
  assert.match(template, /class="insiders-down"[\s\S]{0,400}onClick="\{\{ retryData \}\}"/);
});

test('the tracker no longer carries a branch that could never fire', async () => {
  const logic = await read('public/esthmr/logic.js');
  assert.doesNotMatch(logic, /if \(!src && D\.demo && D\.insiders/,
    'the dead demo branch is back in the tracker');
});

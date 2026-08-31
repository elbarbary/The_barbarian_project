/* What the relay will and will not fetch.
 *
 * The allowlist and the secret are the whole difference between a build tool
 * and an open proxy sitting on a public URL, so they are the thing to pin.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const relay = (await import('../src/index.js')).default;
const { target } = await import('../src/index.js');

const TOKEN = 'a-test-token-of-some-length';
const env = { RELAY_TOKEN: TOKEN };
const ask = (u, { token = TOKEN, method = 'GET', headers = {} } = {}) =>
  relay.fetch(new Request(
    `https://barbarian-fetch.workers.dev/?u=${encodeURIComponent(u)}`,
    { method, headers: { authorization: `Bearer ${token}`, ...headers } },
  ), env);

test('only the two hosts the pipeline actually reads', () => {
  assert.equal(target('https://api.investing.com/api/x').error, undefined);
  assert.equal(target('https://beta.egx.com.eg/api/bff/egx/market-watch').error, undefined);
  // Everything else, including the plausible neighbours.
  for (const url of ['https://example.com/', 'https://foudalens.com/api/market-context',
                     'https://169.254.169.254/latest/meta-data/',
                     'https://api.investing.com.evil.test/x']) {
    assert.match(target(url).error || '', /^host /, url);
  }
  // http would carry the leg the relay does not control in the clear.
  assert.equal(target('http://api.investing.com/x').error, 'https only');
  assert.equal(target('').error, 'no url');
  assert.equal(target('not a url').error, 'url');
});

test('without the secret it fetches nothing', async () => {
  assert.equal((await ask('https://api.investing.com/x', { token: 'wrong' })).status, 401);
  assert.equal((await ask('https://api.investing.com/x', { token: '' })).status, 401);
  // A shorter guess must not be told it was close.
  assert.equal((await ask('https://api.investing.com/x', { token: TOKEN.slice(0, 5) })).status, 401);
  // And with no secret configured at all it refuses rather than opening up.
  const answer = await relay.fetch(
    new Request('https://x/?u=https://api.investing.com/x'), {});
  assert.equal(answer.status, 503);
});

test('GET only, and a refused host never reaches the network', async () => {
  const calls = [];
  globalThis.fetch = async (...args) => { calls.push(args); return new Response('nope'); };
  try {
    assert.equal((await ask('https://api.investing.com/x', { method: 'POST' })).status, 405);
    assert.equal((await ask('https://example.com/x')).status, 400);
    assert.equal(calls.length, 0, 'a refused request still went out');
  } finally { delete globalThis.fetch; }
});

test('it forwards the headers asked for and nothing else', async () => {
  let sent = null;
  globalThis.fetch = async (url, init) => {
    sent = { url, headers: Object.fromEntries(init.headers) };
    return new Response('{"ok":1}', { status: 200, headers: { 'content-type': 'application/json' } });
  };
  try {
    const answer = await ask('https://api.investing.com/api/financialdata/historical/166', {
      headers: {
        'x-relay-user-agent': 'Mozilla/5.0',
        'x-relay-domain-id': 'www',
        // Not on the pass list, and the sort of thing a relay must never carry.
        'x-relay-cookie': 'session=secret',
        'x-relay-authorization': 'Bearer someone-elses',
        cookie: 'session=secret',
      },
    });
    assert.equal(answer.status, 200);
    assert.deepEqual(sent.headers, { 'user-agent': 'Mozilla/5.0', 'domain-id': 'www' });
    assert.equal(sent.url, 'https://api.investing.com/api/financialdata/historical/166');
  } finally { delete globalThis.fetch; }
});

test('the upstream\'s own status comes back, so a block is still visible', async () => {
  globalThis.fetch = async () => new Response('blocked', { status: 403 });
  try {
    const answer = await ask('https://api.investing.com/x');
    assert.equal(answer.status, 403, 'a 403 must not be laundered into a 200');
    assert.equal(await answer.text(), 'blocked');
  } finally { delete globalThis.fetch; }
});

/* The reader's own list, on the server and on the way to it.
 *
 * Two things are worth a test here and neither is the happy path. The first is
 * that one account cannot read or write another's list — the key is derived
 * from a signed session, and the day it is derived from anything a caller
 * sends is the day every list is public. The second is the merge: a list that
 * lives in two places will resurrect a deletion unless one of them is the
 * truth, and that failure looks like a bug in the store rather than in the
 * sync, which is what makes it worth pinning down.
 *
 * The host mapping is here too. esthmr.com serves the same assets with the
 * /esthmr/ prefix implied, and the paths that must NOT be prefixed are the two
 * the client writes absolute.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const worker = (await import('../index.js')).default;
const { cleanTickers } = await import('../index.js');

const SECRET = 'a-test-secret';

/* The same construction the Worker signs with — written out rather than
   imported, so a change to the token format has to be a deliberate change to
   both and not a silent one to neither. */
const b64url = (bytes) => Buffer.from(bytes).toString('base64')
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function token(email, secret = SECRET) {
  const payload = { e: email, x: Math.floor(Date.now() / 1000) + 3600 };
  const body = b64url(new TextEncoder().encode(JSON.stringify(payload)));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  return `${body}.${b64url(new Uint8Array(mac))}`;
}

function kv() {
  const store = new Map();
  return {
    store,
    async get(key, type) {
      const held = store.get(key);
      if (held === undefined) return null;
      return type === 'json' ? JSON.parse(held) : held;
    },
    async put(key, value) { store.set(key, value); },
    async delete(key) { store.delete(key); },
  };
}

/* Only these exist as files. Everything else is a 404, which is what the
   fallback in the host mapping is there to survive. */
const ASSET = new Set(['/index.html', '/favicon.svg', '/esthmr/index.html',
  '/esthmr/logic.js', '/esthmr/template.html', '/data/v1/companies.json']);

function env(overrides) {
  return {
    SESSION_SECRET: SECRET,
    ESTHMR_AUTH: kv(),
    ASSETS: {
      async fetch(request) {
        const path = new URL(request.url).pathname.replace(/\/$/, '/index.html');
        return ASSET.has(path)
          ? new Response(`served ${path}`, { status: 200 })
          : new Response('not found', { status: 404 });
      },
    },
    ...overrides,
  };
}

const call = (e, url, init) => worker.fetch(new Request(url, init), e);
const bearer = async (email) => ({ authorization: `Bearer ${await token(email)}` });
const API = 'https://thebarbarianproject.com/esthmr/api/watchlist';

/* ── what is stored ────────────────────────────────────────────────────── */

test('a payload is cleaned to tickers, uppercased, deduped and capped', () => {
  assert.deepEqual(cleanTickers(['comi', 'ABUK', 'comi']), ['COMI', 'ABUK']);
  assert.deepEqual(cleanTickers([' swdy ', null, 42, '', 'a b']), ['SWDY']);
  assert.equal(cleanTickers(Array.from({ length: 90 }, (_, i) => `T${i}`)).length, 60);
  // Not a list at all is the caller's bug and answers as one; an empty list is
  // a reader who follows nothing, and is a perfectly good thing to store.
  assert.equal(cleanTickers({ tickers: ['COMI'] }), null);
  assert.equal(cleanTickers('COMI'), null);
  assert.deepEqual(cleanTickers([]), []);
});

test('the list round-trips against the account', async () => {
  const e = env();
  const headers = { ...(await bearer('reader@example.com')), 'content-type': 'application/json' };
  const put = await call(e, API, { method: 'PUT', headers, body: JSON.stringify({ tickers: ['comi', 'ABUK'] }) });
  assert.equal(put.status, 200);
  assert.deepEqual((await put.json()).tickers, ['COMI', 'ABUK']);

  const got = await call(e, API, { headers });
  assert.deepEqual((await got.json()).tickers, ['COMI', 'ABUK']);
  // The email is the key, and it came from the signature rather than the body.
  assert.ok(e.ESTHMR_AUTH.store.has('wl:reader@example.com'));
});

test('one account cannot see or overwrite another\'s list', async () => {
  const e = env();
  const mine = { ...(await bearer('mine@example.com')), 'content-type': 'application/json' };
  const yours = { ...(await bearer('yours@example.com')), 'content-type': 'application/json' };
  await call(e, API, { method: 'PUT', headers: mine, body: JSON.stringify({ tickers: ['COMI'] }) });
  assert.deepEqual((await (await call(e, API, { headers: yours })).json()).tickers, []);
  await call(e, API, { method: 'PUT', headers: yours, body: JSON.stringify({ tickers: ['ABUK'] }) });
  assert.deepEqual((await (await call(e, API, { headers: mine })).json()).tickers, ['COMI']);
});

test('a signed-out reader has no list to read or write', async () => {
  const e = env();
  assert.equal((await call(e, API)).status, 401);
  assert.equal((await call(e, API, { method: 'PUT', body: '{"tickers":[]}' })).status, 401);
  // And a token signed with something else is not a session.
  const forged = { authorization: `Bearer ${await token('reader@example.com', 'not-the-secret')}` };
  assert.equal((await call(e, API, { headers: forged })).status, 401);
});

test('a malformed write is refused rather than stored', async () => {
  const e = env();
  const headers = { ...(await bearer('reader@example.com')), 'content-type': 'application/json' };
  assert.equal((await call(e, API, { method: 'PUT', headers, body: 'not json' })).status, 400);
  assert.equal((await call(e, API, { method: 'PUT', headers, body: '{"tickers":"COMI"}' })).status, 400);
  assert.equal((await call(e, API, { method: 'POST', headers, body: '{}' })).status, 405);
  assert.deepEqual([...e.ESTHMR_AUTH.store.keys()].filter((k) => k.startsWith('wl:')), []);
});

/* ── esthmr.com ────────────────────────────────────────────────────────── */

const body = async (response) => (await response.text());

test('esthmr.com serves the product from the root', async () => {
  const e = env();
  assert.equal(await body(await call(e, 'https://esthmr.com/')), 'served /esthmr/index.html');
  assert.equal(await body(await call(e, 'https://esthmr.com/logic.js')), 'served /esthmr/logic.js');
  assert.equal(await body(await call(e, 'https://esthmr.com/template.html')), 'served /esthmr/template.html');
});

test('a file that only exists at the site root still answers on esthmr.com', async () => {
  // The favicon and the touch icons are shared with the rest of the site and
  // live at its root. Without the fallback this host alone would 404 them.
  const e = env();
  assert.equal(await body(await call(e, 'https://esthmr.com/favicon.svg')), 'served /favicon.svg');
});

test('the two absolute paths the client writes are not prefixed', async () => {
  const e = env();
  // The data gate still answers for what it is, rather than 404ing as
  // /esthmr/data/v1/companies.json.
  assert.equal((await call(e, 'https://esthmr.com/data/v1/companies.json')).status, 401);
  const signed = await call(e, 'https://esthmr.com/data/v1/companies.json',
    { headers: await bearer('reader@example.com') });
  assert.equal(await body(signed), 'served /data/v1/companies.json');
  // And the API is the same API on either host.
  const me = await call(e, 'https://esthmr.com/esthmr/api/auth/me',
    { headers: await bearer('reader@example.com') });
  assert.deepEqual(await me.json(), { email: 'reader@example.com' });
});

test('www is a second name for the same site, and says so once', async () => {
  const e = env();
  const answer = await call(e, 'https://www.esthmr.com/sectors');
  assert.equal(answer.status, 301);
  assert.equal(answer.headers.get('location'), 'https://esthmr.com/sectors');
});

test('the site\'s own host is untouched by any of it', async () => {
  const e = env();
  assert.equal(await body(await call(e, 'https://thebarbarianproject.com/')), 'served /index.html');
  // Not the product's front page: that is still at /esthmr/.
  assert.equal(await body(await call(e, 'https://thebarbarianproject.com/esthmr/index.html')),
    'served /esthmr/index.html');
});

/* ── the browser's half of it ──────────────────────────────────────────── */

/** A localStorage and a fetch, for the duration of one test. */
function browser({ stored = null, ok = true } = {}) {
  const local = {};
  const puts = [];
  globalThis.localStorage = {
    getItem: (k) => (k in local ? local[k] : null),
    setItem: (k, v) => { local[k] = v; },
  };
  globalThis.fetch = async (url, init) => {
    if (init && init.method === 'PUT') {
      puts.push(JSON.parse(init.body).tickers);
      return new Response('{}', { status: ok ? 200 : 500 });
    }
    if (stored === null) throw new Error('offline');
    return new Response(JSON.stringify({ tickers: stored }), { status: 200 });
  };
  return { local, puts, done: () => { delete globalThis.localStorage; delete globalThis.fetch; } };
}

test('an unfollow on another device is not undone by this one', async () => {
  // The bug this exists for: the browser holds COMI, the account no longer
  // does because it was unfollowed elsewhere, and a merge would push it back
  // and make the removal look broken. Once the guest list has been adopted,
  // the account decides.
  const w = await import('../../public/esthmr/watchlist.js');
  const b = browser({ stored: ['ABUK'] });
  try {
    b.local['esthmr:watchlist:me@x.com'] = JSON.stringify(['COMI', 'ABUK']);
    b.local['esthmr:watchlist:adopted:me@x.com'] = '1';
    assert.deepEqual(await w.sync('me@x.com'), ['ABUK']);
    assert.deepEqual(JSON.parse(b.local['esthmr:watchlist:me@x.com']), ['ABUK']);
    assert.deepEqual(b.puts, [], 'nothing to tell the account: it was already right');
  } finally { b.done(); }
});

test('what you followed before signing in joins the account, once', async () => {
  const w = await import('../../public/esthmr/watchlist.js');
  const b = browser({ stored: ['ABUK'] });
  try {
    b.local['esthmr:watchlist:guest'] = JSON.stringify(['COMI']);
    assert.deepEqual(await w.sync('me@x.com'), ['COMI', 'ABUK']);
    assert.deepEqual(b.puts, [['COMI', 'ABUK']]);
    // Second time round the account is the truth, so unfollowing COMI there
    // does not bring it back from the guest list it came from.
    b.puts.length = 0;
    globalThis.fetch = async (url, init) => (init && init.method === 'PUT'
      ? new Response('{}', { status: 200 })
      : new Response(JSON.stringify({ tickers: ['ABUK'] }), { status: 200 }));
    assert.deepEqual(await w.sync('me@x.com'), ['ABUK']);
  } finally { b.done(); }
});

test('no answer from the account leaves the list on screen alone', async () => {
  // An empty list and a failed request are different facts, and treating the
  // second as the first would wipe a reader's list every time a train went
  // into a tunnel.
  const w = await import('../../public/esthmr/watchlist.js');
  const b = browser({ stored: null });
  try {
    b.local['esthmr:watchlist:me@x.com'] = JSON.stringify(['COMI']);
    b.local['esthmr:watchlist:adopted:me@x.com'] = '1';
    assert.deepEqual(await w.sync('me@x.com'), ['COMI']);
  } finally { b.done(); }
});

test('signed out, nothing is asked of the server', async () => {
  const w = await import('../../public/esthmr/watchlist.js');
  const b = browser({ stored: ['NOPE'] });
  try {
    globalThis.fetch = () => { throw new Error('a signed-out reader has no account to sync with'); };
    b.local['esthmr:watchlist:guest'] = JSON.stringify(['COMI']);
    assert.deepEqual(await w.sync(null), ['COMI']);
  } finally { b.done(); }
});

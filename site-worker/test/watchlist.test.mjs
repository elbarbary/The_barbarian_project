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

/* The real asset server does not simply serve a file at whatever path is
   asked for. It canonicalises: /esthmr/index.html answers 307 to /esthmr/,
   and only the directory form serves the page. The stub has to do the same,
   or the test proves the mapping against a server that does not exist. */
function canonical(path) {
  if (path.endsWith('/index.html')) return { redirect: path.slice(0, -'index.html'.length) };
  return { path: path.replace(/\/$/, '/index.html') };
}

function env(overrides) {
  return {
    SESSION_SECRET: SECRET,
    ESTHMR_AUTH: kv(),
    ASSETS: {
      async fetch(request) {
        const asked = canonical(new URL(request.url).pathname);
        if (asked.redirect) {
          return new Response(null, { status: 307, headers: { location: asked.redirect } });
        }
        return ASSET.has(asked.path)
          ? new Response(`served ${asked.path}`, { status: 200 })
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

/* ── the challenge in front of the mail sender ─────────────────────────── */

test('a browser on our own page must solve the challenge; the app need not', async () => {
  // /auth/request sends an email per call — the one endpoint here where an
  // abuser spends somebody else's money and fills a stranger's inbox. A
  // browser cannot suppress Origin on a cross-origin POST, so a request
  // claiming to come from our own pages is held to it. The phone app signs in
  // through the same endpoint and sends none.
  const { mustSolve } = await import('../index.js');
  for (const origin of ['https://esthmr.com', 'https://www.esthmr.com',
                        'https://thebarbarianproject.com', 'HTTPS://ESTHMR.COM']) {
    assert.equal(mustSolve(origin, true), true, origin);
  }
  // No Origin at all — the app, and curl.
  assert.equal(mustSolve(null, true), false);
  assert.equal(mustSolve('', true), false);
  // Somebody else's page posting at us is not one of ours; it is refused by
  // CORS long before this, and is not what the challenge is for.
  assert.equal(mustSolve('https://evil.example', true), false);
  // And with no secret configured there is nothing to enforce — an
  // unconfigured challenge must not close the door on every reader.
  assert.equal(mustSolve('https://esthmr.com', false), false);
});

test('an unsolved challenge is rationed, not refused', async () => {
  // A hard 403 here locked out anyone whose Turnstile could not complete —
  // watched happen on a machine that could not resolve one of Cloudflare's own
  // challenge hosts. Ninety per cent less throughput for a bot, and a door
  // that still opens for a person.
  const e = env({ TURNSTILE_SECRET: 'shh', RESEND_API_KEYS: 'k1',
                  MAIL_FROM: 'ESTHMR <esthmr@thebarbarianproject.com>' });
  let mailed = false;
  globalThis.fetch = async () => { mailed = true; return new Response('{}', { status: 200 }); };
  try {
    // A different address each time, which is the shape the per-email ceiling
    // cannot see and this one is for: one machine spraying strangers' inboxes.
    let n = 0;
    const ask = () => call(e, 'https://esthmr.com/esthmr/api/auth/request', {
      method: 'POST',
      headers: { origin: 'https://esthmr.com', 'content-type': 'application/json' },
      body: JSON.stringify({ email: `someone${n++}@example.com` }),
    });
    // Unsolved is not locked out — Turnstile fails for reasons a reader cannot
    // control, and a sign-in they cannot complete is not the attack. It is
    // rationed: six an hour from that address instead of sixty.
    for (let i = 0; i < 6; i++) assert.equal((await ask()).status, 200, `send ${i + 1}`);
    const seventh = await ask();
    assert.equal(seventh.status, 429);
    assert.deepEqual(await seventh.json(), { error: 'too many requests' });
    assert.equal(mailed, true, 'the first six should have been sent');
  } finally { delete globalThis.fetch; }
});

/* ── the ceiling, and what it costs to enforce ─────────────────────────── */

test('reading the data costs no storage writes at all', async () => {
  // It used to cost one KV read and one KV WRITE per document. A signed-in
  // page load fetches 33 of them, and the free plan allows 1,000 writes a day
  // — thirty visits before `put()` throws inside a gate with no catch, and the
  // site's data 500s for everyone until midnight UTC.
  const e = env();
  const headers = await bearer('reader@example.com');
  for (let i = 0; i < 40; i++) {
    const answer = await call(e, 'https://thebarbarianproject.com/data/v1/companies.json', { headers });
    assert.equal(answer.status, 200);
  }
  assert.equal(e.ESTHMR_AUTH.store.size, 0,
    `forty document reads wrote ${e.ESTHMR_AUTH.store.size} KV keys`);
});

test('the limiter stops a caller who is over, and never the whole gate', async () => {
  const calls = [];
  const limited = env({ DATA_LIMIT: { limit: async ({ key }) => {
    calls.push(key);
    return { success: calls.length <= 2 };
  } } });
  const headers = await bearer('reader@example.com');
  const get = () => call(limited, 'https://thebarbarianproject.com/data/v1/companies.json', { headers });
  assert.equal((await get()).status, 200);
  assert.equal((await get()).status, 200);
  assert.equal((await get()).status, 429, 'the third should have been refused');
  // Keyed by the account, so one reader cannot spend another's allowance.
  assert.deepEqual([...new Set(calls)], ['data:reader@example.com']);

  // A limiter that throws must not take the data down with it — that failure
  // is the entire reason this moved off KV.
  const broken = env({ DATA_LIMIT: { limit: async () => { throw new Error('down'); } } });
  assert.equal((await call(broken, 'https://thebarbarianproject.com/data/v1/companies.json',
    { headers })).status, 200);

  // And the gate itself still refuses a reader with no session, limiter or no.
  assert.equal((await call(limited, 'https://thebarbarianproject.com/data/v1/companies.json')).status, 401);
});

test('a fresh account does not buy a fresh allowance from the same address', async () => {
  /* The hole this closes. The per-account ceiling bounds a credential, and a
     credential costs one email — the sign-in counters in the Worker allow six
     an hour from one unchallenged address. So 90/min per account was really
     540/min from one machine, simply by rotating who it claimed to be.

     Both limiters are asked on every read. The account key changes when the
     puller swaps accounts; the address key does not, and that is the one that
     has to refuse. */
  const seen = [];
  const e = env({
    DATA_LIMIT: { limit: async ({ key }) => { seen.push(key); return { success: true }; } },
    DATA_IP_LIMIT: { limit: async ({ key }) => { seen.push(key); return { success: false }; } },
  });
  const url = 'https://thebarbarianproject.com/data/v1/companies.json';
  const from = '198.51.100.7';

  for (const who of ['one@example.com', 'two@example.com', 'three@example.com']) {
    const answer = await call(e, url, {
      headers: { ...(await bearer(who)), 'cf-connecting-ip': from },
    });
    assert.equal(answer.status, 429, `${who} got through on a spent address`);
  }
  // Three different accounts, one address: the account key moved, the address
  // key stayed put.
  assert.deepEqual(seen.filter((k) => k.startsWith('data-ip:')),
    Array(3).fill(`data-ip:${from}`));
  assert.equal(new Set(seen.filter((k) => k.startsWith('data:'))).size, 3);
});

test('the address ceiling fails open and never outranks the session', async () => {
  const url = 'https://thebarbarianproject.com/data/v1/companies.json';
  const headers = { ...(await bearer('reader@example.com')), 'cf-connecting-ip': '203.0.113.9' };

  // A limiter that throws must not take the data down — the same promise the
  // account limiter above makes.
  const broken = env({ DATA_IP_LIMIT: { limit: async () => { throw new Error('down'); } } });
  assert.equal((await call(broken, url, { headers })).status, 200);

  // An absent binding is an absent limit, not a broken gate.
  assert.equal((await call(env(), url, { headers })).status, 200);

  // Under the ceiling, a signed-in reader is served and a stranger still is not.
  const under = env({ DATA_IP_LIMIT: { limit: async () => ({ success: true }) } });
  assert.equal((await call(under, url, { headers })).status, 200);
  assert.equal((await call(under, url)).status, 401);
});

test('robots.txt is the same file on both hosts, and names the gated paths', async () => {
  /* It is not served through the /esthmr/ mapping: a robots file for a path
     prefix is not a thing that exists. */
  const { readFileSync } = await import('node:fs');
  const text = readFileSync(new URL('../../public/robots.txt', import.meta.url), 'utf8');
  const rules = text.split('\n').filter((line) => line && !line.startsWith('#'));
  assert.ok(rules.includes('Disallow: /data/v1/'), 'the gated data is not declared');
  assert.ok(rules.includes('Disallow: /esthmr/api/'), 'the API is not declared');
  assert.ok(rules.some((line) => line.startsWith('User-agent:')),
    'directives without a User-agent line apply to nobody');
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

test('nothing on esthmr.com sends the reader to the prefix it hides', async () => {
  // The asset server canonicalises on its own — /index.html answers 307 to /
  // — and every one of those Locations names /esthmr/. Passed through, the
  // front page of this host redirected the reader to esthmr.com/esthmr/,
  // which is the one address the mapping exists to avoid.
  const e = env();
  const answer = await call(e, 'https://esthmr.com/index.html');
  assert.equal(answer.status, 307);
  assert.equal(answer.headers.get('location'), '/');
  // And the front page itself is served, not redirected.
  assert.equal(await body(await call(e, 'https://esthmr.com/')), 'served /esthmr/index.html');
});

test('esthmr.com is never served in the clear', async () => {
  // The zone was created without Always Use HTTPS, so http:// answered 200
  // with the whole site — and the session cookie is Secure, so signing in
  // over it could not work and nothing said why.
  const e = env();
  const answer = await call(e, 'http://esthmr.com/sectors?q=1');
  assert.equal(answer.status, 301);
  assert.equal(answer.headers.get('location'), 'https://esthmr.com/sectors?q=1');
  // www over http gets there in one hop of its own, not a chain of three.
  assert.equal((await call(e, 'http://www.esthmr.com/')).headers.get('location'),
    'https://www.esthmr.com/');
});

test('every answer on esthmr.com tells the browser not to try http again', async () => {
  const e = env();
  const headers = await bearer('reader@example.com');
  for (const path of ['/', '/logic.js', '/favicon.svg', '/data/v1/companies.json',
                      '/esthmr/api/watchlist', '/nothing-here']) {
    const answer = await call(e, `https://esthmr.com${path}`, { headers });
    assert.match(answer.headers.get('strict-transport-security') || '', /max-age=\d{6,}/,
      `${path} carries no HSTS`);
  }
  // Not asserted for a domain that is a day old: preload is a submission to a
  // list baked into browsers, and includeSubDomains is a promise made on
  // behalf of subdomains that do not exist yet.
  const one = await call(e, 'https://esthmr.com/', { headers });
  assert.doesNotMatch(one.headers.get('strict-transport-security'), /preload|includeSubDomains/);
  // And the site's own host is not signed up to any of it here.
  const other = await call(e, 'https://thebarbarianproject.com/', { headers });
  assert.equal(other.headers.get('strict-transport-security'), null);
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
  assert.equal(await body(await call(e, 'https://thebarbarianproject.com/esthmr/')),
    'served /esthmr/index.html');
  // And the asset server's own canonicalising is passed through as it is,
  // prefix and all — on this host the prefix is the address, not a detail to
  // be hidden.
  const canonicalised = await call(e, 'https://thebarbarianproject.com/esthmr/index.html');
  assert.equal(canonicalised.status, 307);
  assert.equal(canonicalised.headers.get('location'), '/esthmr/');
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

test('the redirects carry HSTS too', async () => {
  // Both 301s were built with a bare Response.redirect and never passed
  // through secure(), so no answer from www.esthmr.com — or from a plain
  // http request — ever carried strict-transport-security. The apex policy
  // deliberately omits includeSubDomains, so a browser that had only ever
  // seen www had no pin for it.
  const e = env();
  for (const url of ['http://esthmr.com/x', 'https://www.esthmr.com/x', 'http://www.esthmr.com/x']) {
    const a = await call(e, url);
    assert.equal(a.status, 301, url);
    assert.match(a.headers.get('strict-transport-security') || '', /max-age=\d{6,}/,
      `${url}: the redirect carries no HSTS`);
  }
});

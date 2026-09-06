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

test('storage failure is not returned as a successful empty watchlist', async () => {
  const e=env();
  e.ESTHMR_AUTH.get=async()=>{throw new Error('storage unavailable');};
  const result=await call(e,API,{headers:await bearer('reader@example.com')});
  assert.equal(result.status,503);
  assert.equal(result.headers.get('cache-control'),'no-store');
});

test('signout requires an explicit POST and never caches the session response', async () => {
  const url='https://esthmr.com/esthmr/api/auth/signout';
  assert.equal((await call(env(),url)).status,405);
  const result=await call(env(),url,{method:'POST'});
  assert.equal(result.status,200);
  assert.match(result.headers.get('set-cookie'),/Max-Age=0/);
  assert.equal(result.headers.get('cache-control'),'no-store');
});

test('malformed session cookies fail closed without crashing the data gate', async () => {
  for(const value of ['%E0%A4%A','not-a-token','x.y.z']) {
    const result=await call(env(),'https://esthmr.com/data/v1/companies.json',{headers:{cookie:`esthmr_session=${value}`}});
    assert.equal(result.status,401);
  }
  const valid=await token('reader@example.com');
  const result=await call(env(),API,{headers:{authorization:`Bearer ${valid}.extra`}});
  assert.equal(result.status,401,'extra token segments must not be silently ignored');
});

test('auth bodies must be bounded JSON objects and responses cannot be cached', async () => {
  for(const body of ['null','[]','42','broken']) {
    const result=await call(env(),'https://esthmr.com/esthmr/api/auth/request',{method:'POST',body});
    assert.equal(result.status,400);
    assert.equal(result.headers.get('cache-control'),'no-store');
  }
  const result=await call(env(),'https://esthmr.com/esthmr/api/auth/request',{
    method:'POST',body:JSON.stringify({email:'reader@example.com',padding:'x'.repeat(17000)})});
  assert.equal(result.status,413,'limit applies without a Content-Length header');
});

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

test('rapid watchlist changes serialize and a failed save remains retryable', async () => {
  const w=await import('../../public/esthmr/watchlist.js');
  const b=browser(); w.activate();
  const pending=[], calls=[], statuses=[];
  const tick=()=>new Promise(resolve=>setImmediate(resolve));
  try {
    globalThis.fetch=async(_,init)=> {
      calls.push(JSON.parse(init.body).tickers);
      return new Promise(resolve=>pending.push(resolve));
    };
    w.toggleSynced('me@x.com','COMI',null,s=>statuses.push(s)); await tick();
    w.toggleSynced('me@x.com','ABUK',null,s=>statuses.push(s));
    w.toggleSynced('me@x.com','SWDY',null,s=>statuses.push(s));
    assert.equal(calls.length,1,'only one write may be in flight');
    pending.shift()(new Response('{}',{status:500})); await tick();
    assert.deepEqual(calls,[['COMI'],['SWDY','ABUK','COMI']]);
    assert.deepEqual(w.read('me@x.com'),['SWDY','ABUK','COMI'],'old failure must not roll back newer clicks');
    pending.shift()(new Response('{}',{status:500})); await tick();
    assert.equal(statuses.at(-1),'error');
    const retry=w.retrySynced('me@x.com',s=>statuses.push(s)); await tick();
    pending.shift()(new Response('{}')); await retry;
    assert.equal(statuses.at(-1),'saved');
  } finally {w.activate();b.done();}
});

test('queued watchlist writes do not cross a login boundary', async () => {
  const w=await import('../../public/esthmr/watchlist.js');
  const b=browser(); w.activate();
  const tick=()=>new Promise(resolve=>setImmediate(resolve));
  let finish, calls=0;
  try {
    globalThis.fetch=()=>{calls++;return new Promise(resolve=>{finish=resolve;});};
    w.toggleSynced('me@x.com','COMI'); await tick();
    w.toggleSynced('me@x.com','ABUK'); w.activate();
    finish(new Response('{}')); await tick();
    assert.equal(calls,1);
  } finally {w.activate();b.done();}
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

/* ── the deployed fingerprint ──────────────────────────────────────────────
 *
 * An external watchdog has to be able to ask this deployment what it is
 * actually serving, and it cannot sign in. It used to read a committed file,
 * public/esthmr/stamp.json, which no workflow staged — so it never moved, the
 * watchdog read "deployed" as permanently behind "committed", and its alarm
 * latched open on a false positive and could never report anything real.
 * Everything else under /data/v1/ stays behind the gate.
 */
function versionEnv(manifest) {
  return env({
    ASSETS: {
      async fetch(request) {
        if (new URL(request.url).pathname === '/data/v1/manifest.json' && manifest) {
          return new Response(JSON.stringify(manifest), { status: 200 });
        }
        return new Response('not found', { status: 404 });
      },
    },
  });
}

const MANIFEST = {
  schema_version: 1,
  data_version: '4563348d009b2a12',
  generated_at: '2026-09-04T12:47:44+00:00',
  market_date: '2026-09-03',
  versions: { companies: 'aaa', prices: 'bbb' },
};

test('the deployed data_version is readable without signing in', async () => {
  for (const host of ['https://thebarbarianproject.com', 'https://esthmr.com']) {
    const a = await call(versionEnv(MANIFEST), `${host}/esthmr/api/version`);
    assert.equal(a.status, 200, host);
    assert.equal((await a.json()).data_version, '4563348d009b2a12', host);
  }
});

test('it discloses the fingerprint and nothing else', async () => {
  const a = await call(versionEnv(MANIFEST), 'https://esthmr.com/esthmr/api/version');
  // `versions` is a per-folder hash map and `market_date` is a trading fact.
  // Neither belongs on an ungated endpoint just because it was in the file.
  assert.deepEqual(Object.keys(await a.json()).sort(), ['data_version', 'generated_at']);
});

test('the gate over the rest of /data/v1/ is untouched', async () => {
  const a = await call(versionEnv(MANIFEST), 'https://esthmr.com/data/v1/manifest.json');
  assert.equal(a.status, 401, 'the manifest itself must still require a session');
});

test('a missing manifest refuses rather than reporting a null version', async () => {
  // Answering 200 with data_version null would read to the watchdog as "the
  // deployment has no version", which is indistinguishable from drift.
  const a = await call(versionEnv(null), 'https://esthmr.com/esthmr/api/version');
  assert.equal(a.status, 503);
});

/* ── the outlet's picture, fetched by us ───────────────────────────────────
 *
 * News thumbnails were hotlinked, so a picture loaded only if the READER's
 * network could reach the publisher. Al Borsa and Hapi — 266 of 400 items —
 * answer on Cloudflare addresses some routes cannot reach, and the request
 * hangs rather than failing, so even `onerror` could not hide the frame.
 */
function imgEnv(upstream) {
  const e = env();
  globalThis.fetch = upstream;
  return e;
}

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
const okImage = async () => new Response(PNG, {
  status: 200,
  headers: { 'content-type': 'image/png', 'content-length': '4' },
});

test('a carried outlet\'s picture is fetched and cached hard', async () => {
  const orig = globalThis.fetch;
  let asked = null;
  try {
    const e = imgEnv(async (input) => { asked = String(input); return okImage(); });
    const a = await call(e, 'https://esthmr.com/esthmr/api/img?u='
      + encodeURIComponent('https://images.alborsaanews.com/2026/09/x.jpeg'));
    assert.equal(a.status, 200);
    assert.equal(a.headers.get('content-type'), 'image/png');
    assert.match(a.headers.get('cache-control'), /max-age=604800/);
    assert.equal(a.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(asked, 'https://images.alborsaanews.com/2026/09/x.jpeg');
  } finally { globalThis.fetch = orig; }
});

test('hapijournal is carried too — it is half the reason this exists', async () => {
  const orig = globalThis.fetch;
  try {
    const e = imgEnv(okImage);
    const a = await call(e, 'https://esthmr.com/esthmr/api/img?u='
      + encodeURIComponent('https://hapijournal.com/wp-content/uploads/2026/09/31.png'));
    assert.equal(a.status, 200);
  } finally { globalThis.fetch = orig; }
});

test('it is not an open proxy', async () => {
  const orig = globalThis.fetch;
  let reached = false;
  try {
    const e = imgEnv(async () => { reached = true; return okImage(); });
    for (const u of [
      'https://example.com/cat.png',
      'https://evil.example/steal.png',
      'http://images.alborsaanews.com/x.jpeg',            // not https
      'https://images.alborsaanews.com.evil.test/x.jpeg', // suffix trick
      'https://hapijournal.com.attacker.test/x.png',
    ]) {
      const a = await call(e, 'https://esthmr.com/esthmr/api/img?u=' + encodeURIComponent(u));
      assert.equal(a.status, 403, `${u} was not refused`);
    }
    assert.equal(reached, false, 'a refused host must never be fetched');

    const bad = await call(e, 'https://esthmr.com/esthmr/api/img?u=not-a-url');
    assert.equal(bad.status, 400);
  } finally { globalThis.fetch = orig; }
});

test('anything that is not an image is refused, not passed through', async () => {
  const orig = globalThis.fetch;
  try {
    // Otherwise the route serves another site's HTML from this origin, which
    // is a redirect the address bar does not show.
    const e = imgEnv(async () => new Response('<h1>hello</h1>', {
      status: 200, headers: { 'content-type': 'text/html' },
    }));
    const a = await call(e, 'https://esthmr.com/esthmr/api/img?u='
      + encodeURIComponent('https://hapijournal.com/page.html'));
    assert.equal(a.status, 502);
  } finally { globalThis.fetch = orig; }
});

test('an upstream that hangs or fails answers quickly, so onerror can fire', async () => {
  const orig = globalThis.fetch;
  try {
    const e = imgEnv(async () => { throw new Error('ETIMEDOUT'); });
    const a = await call(e, 'https://esthmr.com/esthmr/api/img?u='
      + encodeURIComponent('https://hapijournal.com/wp-content/uploads/2026/09/31.png'));
    assert.equal(a.status, 502);
  } finally { globalThis.fetch = orig; }
});

test('a redirect off the allowlist is refused, not followed', async () => {
  const orig = globalThis.fetch;
  const seen = [];
  try {
    // `redirect: "follow"` validates the host you asked for and nothing after
    // it, so a carried outlet answering 302 could point this origin anywhere.
    const e = imgEnv(async (input) => {
      seen.push(String(input));
      if (String(input).includes('hapijournal.com')) {
        return new Response(null, { status: 302, headers: { location: 'https://evil.example/x.png' } });
      }
      return okImage();
    });
    const a = await call(e, 'https://esthmr.com/esthmr/api/img?u='
      + encodeURIComponent('https://hapijournal.com/wp-content/uploads/2026/09/31.png'));
    assert.equal(a.status, 403);
    assert.equal(seen.some((u) => u.includes('evil.example')), false,
      'the off-allowlist target must never be fetched');
  } finally { globalThis.fetch = orig; }
});

test('a redirect within the allowlist is followed', async () => {
  const orig = globalThis.fetch;
  try {
    const e = imgEnv(async (input) => (String(input).includes('www.hapijournal.com')
      ? okImage()
      : new Response(null, { status: 301, headers: { location: 'https://www.hapijournal.com/a.png' } })));
    const a = await call(e, 'https://esthmr.com/esthmr/api/img?u='
      + encodeURIComponent('https://hapijournal.com/a.png'));
    assert.equal(a.status, 200);
  } finally { globalThis.fetch = orig; }
});

test('a redirect loop terminates rather than hanging', async () => {
  const orig = globalThis.fetch;
  try {
    const e = imgEnv(async () => new Response(null, {
      status: 302, headers: { location: 'https://hapijournal.com/loop.png' },
    }));
    const a = await call(e, 'https://esthmr.com/esthmr/api/img?u='
      + encodeURIComponent('https://hapijournal.com/loop.png'));
    assert.equal(a.status, 502);
  } finally { globalThis.fetch = orig; }
});

/* The hole a host-only allowlist could not see.
 *
 * Jetpack's Photon CDN takes the ORIGIN HOST IN ITS PATH —
 * https://i0.wp.com/<any-host>/<any-path> — so allowing `i0.wp.com` by
 * hostname readmitted every host on the internet through the one entry that
 * was not a literal. Verified against real Photon: 4.7 MB of
 * upload.wikimedia.org served from this origin, cached immutable for a week.
 * The earlier "it is not an open proxy" test passed throughout, because it
 * only ever tried hosts OUTSIDE the list.
 */
test('Photon cannot be used to launder a host we do not carry', async () => {
  const orig = globalThis.fetch;
  let reached = false;
  try {
    const e = imgEnv(async () => { reached = true; return okImage(); });
    for (const u of [
      'https://i0.wp.com/upload.wikimedia.org/wikipedia/commons/x.jpg',
      'https://i0.wp.com/evil.example/payload.jpg',
      'https://i3.wp.com/169.254.169.254/latest/meta-data/',
      'https://i1.wp.com/www.google.com/images/branding/x.png',
      'https://i0.wp.com/',
    ]) {
      const a = await call(e, 'https://esthmr.com/esthmr/api/img?u=' + encodeURIComponent(u));
      assert.equal(a.status, 403, `${u} was laundered through Photon`);
    }
    assert.equal(reached, false, 'a laundered host must never be fetched');
  } finally { globalThis.fetch = orig; }
});

test('Photon still serves the outlet it was added for', async () => {
  const orig = globalThis.fetch;
  try {
    const e = imgEnv(okImage);
    const a = await call(e, 'https://esthmr.com/esthmr/api/img?u='
      + encodeURIComponent('https://i0.wp.com/ent.news/2026/09/27.jpg?fit=1024%2C1024&ssl=1'));
    assert.equal(a.status, 200);
  } finally { globalThis.fetch = orig; }
});

test('an SVG is not treated as a picture', async () => {
  const orig = globalThis.fetch;
  try {
    // SVG is a document that may carry script, and from this origin that
    // script would run as this origin.
    const e = imgEnv(async () => new Response('<svg xmlns="http://www.w3.org/2000/svg"/>', {
      status: 200, headers: { 'content-type': 'image/svg+xml' },
    }));
    const a = await call(e, 'https://esthmr.com/esthmr/api/img?u='
      + encodeURIComponent('https://hapijournal.com/x.svg'));
    assert.equal(a.status, 502);
  } finally { globalThis.fetch = orig; }
});

test('something far too large to be a thumbnail is refused', async () => {
  const orig = globalThis.fetch;
  try {
    const e = imgEnv(async () => new Response(PNG, {
      status: 200,
      headers: { 'content-type': 'image/png', 'content-length': String(64 * 1024 * 1024) },
    }));
    const a = await call(e, 'https://esthmr.com/esthmr/api/img?u='
      + encodeURIComponent('https://hapijournal.com/huge.png'));
    assert.equal(a.status, 502);
  } finally { globalThis.fetch = orig; }
});

test('an address hammering the route is slowed, and the limiter fails open', async () => {
  const orig = globalThis.fetch;
  try {
    const e = imgEnv(okImage);
    // No binding in the test env: an absent limiter must not close the gate.
    const open = await call(e, 'https://esthmr.com/esthmr/api/img?u='
      + encodeURIComponent('https://hapijournal.com/a.png'));
    assert.equal(open.status, 200);

    e.DATA_IP_LIMIT = { limit: async () => ({ success: false }) };
    const capped = await call(e, 'https://esthmr.com/esthmr/api/img?u='
      + encodeURIComponent('https://hapijournal.com/a.png'));
    assert.equal(capped.status, 429);
  } finally { globalThis.fetch = orig; }
});

/* The pipeline now rewrites `image` in the document itself, so an app already
   on somebody's phone is fixed by the next data fetch rather than by a release.
   A URL that has been through the rewrite must not go through it twice — the
   inner address would be esthmr.com, which the route's own allowlist refuses,
   and every picture on the site would 403. */
test('a picture already routed through us is not routed twice', async () => {
  // No `catch(() => null)` and no early return: a test that skips itself when
  // the import moves is a test that reports green while checking nothing,
  // which is the exact shape that let the open proxy ship.
  const logic = await import('../../public/esthmr/logic.js');
  const K = Object.values(logic).find((v) => typeof v === 'function' && v.prototype?.imageSrc);
  assert.ok(K, 'no class on logic.js exposes imageSrc');
  const f = K.prototype.imageSrc;
  const once = f('https://hapijournal.com/a.png');
  assert.equal(f(once), once, 'a proxied URL must pass through unchanged');
  assert.equal(f('https://esthmr.com/esthmr/api/img?u=x'),
    'https://esthmr.com/esthmr/api/img?u=x', 'the absolute form too');
});

/* Edge caching bounds the work, not the invocation count. On a Worker route
   the script runs in front of cache, so every thumbnail is billed whatever
   these tests assert — what is saved is the redirect walk, the upstream fetch
   and the outlet's bandwidth. */
test('a picture asked for twice is fetched upstream once', async () => {
  const orig = globalThis.fetch;
  const origCaches = globalThis.caches;
  const shelf = new Map();
  let upstreamCalls = 0;
  globalThis.caches = {
    default: {
      async match(req) { return shelf.get(new Request(req).url) || undefined; },
      async put(req, res) { shelf.set(new Request(req).url, res); },
    },
  };
  const kept = [];
  const ctx = { waitUntil: (p) => kept.push(p) };
  try {
    const e = imgEnv(async () => { upstreamCalls += 1; return okImage(); });
    const url = 'https://esthmr.com/esthmr/api/img?u='
      + encodeURIComponent('https://hapijournal.com/a.png');

    const first = await worker.fetch(new Request(url), e, ctx);
    assert.equal(first.status, 200);
    await Promise.all(kept);
    assert.equal(upstreamCalls, 1);

    const second = await worker.fetch(new Request(url), e, ctx);
    assert.equal(second.status, 200);
    assert.equal(upstreamCalls, 1, 'the second read must come from the edge');
  } finally { globalThis.fetch = orig; globalThis.caches = origCaches; }
});

test('a refusal is not cached for a week', async () => {
  const orig = globalThis.fetch;
  const origCaches = globalThis.caches;
  const stored = [];
  globalThis.caches = {
    default: { async match() { return undefined; }, async put(req) { stored.push(String(req)); } },
  };
  try {
    const e = imgEnv(async () => new Response('nope', { status: 404 }));
    const res = await worker.fetch(new Request('https://esthmr.com/esthmr/api/img?u='
      + encodeURIComponent('https://hapijournal.com/gone.png')), e, { waitUntil: () => {} });
    assert.equal(res.status, 502);
    assert.equal(stored.length, 0, 'a 502 kept for a week outlives its cause');
  } finally { globalThis.fetch = orig; globalThis.caches = origCaches; }
});

/* The cookie was rewritten to verify with Web Crypto instead of comparing two
 * base64 strings, and to check the payload's shape. Both halves need proving,
 * and the first one twice: a cookie minted by the sign() that is running in
 * production today must still open the door after this deploys, or every
 * signed-in reader is quietly logged out by an upgrade. */
test('a session minted by the deployed signer still opens the door, in either envelope', async () => {
  const live = await token('reader@example.com');
  const e = { SESSION_SECRET: SECRET, ESTHMR_AUTH: kv() };
  for (const headers of [
    { cookie: `esthmr_session=${live}` },
    { cookie: `esthmr_session=${encodeURIComponent(live)}` },   // as the Worker sets it
    { cookie: `cf_clearance=x; esthmr_session=${live}; other=1` },
    { authorization: `Bearer ${live}` },                        // the phone app's envelope
  ]) {
    const res = await worker.fetch(new Request('https://esthmr.com/esthmr/api/auth/me',
      { headers }), e, { waitUntil: () => {} });
    assert.equal(res.status, 200, `a valid session was refused: ${JSON.stringify(headers)}`);
    assert.equal((await res.json()).email, 'reader@example.com');
  }
});

test('a signed payload that is not a session is refused', async () => {
  // Signature valid, contents not: no address, an address that is not one, an
  // expiry that is not a number. Without the shape check the first two put
  // `undefined` where every downstream KV key expects an account — `wl:undefined`
  // is one shared watchlist for everyone holding such a token.
  const e = { SESSION_SECRET: SECRET, ESTHMR_AUTH: kv() };
  const forged = async (payload) => {
    const body = b64url(new TextEncoder().encode(JSON.stringify(payload)));
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(SECRET),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
    return `${body}.${b64url(new Uint8Array(mac))}`;
  };
  const soon = Math.floor(Date.now() / 1000) + 3600;
  for (const payload of [{ x: soon }, { e: 'not-an-address', x: soon },
    { e: 'reader@example.com', x: 'forever' }, { e: 'r'.repeat(300) + '@e.com', x: soon }]) {
    const res = await worker.fetch(new Request('https://esthmr.com/esthmr/api/auth/me',
      { headers: { cookie: `esthmr_session=${await forged(payload)}` } }), e, { waitUntil: () => {} });
    assert.equal(res.status, 401, `accepted as a session: ${JSON.stringify(payload)}`);
  }
});

/* What the ceiling counts.
 *
 * Both limiters used to run BEFORE the asset fetch, so a revalidation that
 * came back 304 — no body, nothing read — cost the account exactly what a
 * download did. The gate tells the browser to revalidate every read, and the
 * asset layer answers those with 304, so a reader returning to a screen they
 * had already seen was charged for data they were never sent: on a
 * 33-document boot against 90 a minute, a second look at the site was a 429.
 * A 304 delivers no data, and the ceiling guards data. */
function assetsAnswering(status) {
  return { async fetch() {
    return status === 304
      ? new Response(null, { status: 304, headers: { etag: '"same"' } })
      : new Response('served', { status: 200, headers: { etag: '"same"' } });
  } };
}

test('a 304 revalidation spends none of the allowance', async () => {
  const charged = [];
  const e = env({
    ASSETS: assetsAnswering(304),
    DATA_LIMIT: { limit: async ({ key }) => { charged.push(key); return { success: true }; } },
    DATA_IP_LIMIT: { limit: async ({ key }) => { charged.push(key); return { success: true }; } },
  });
  const headers = { ...(await bearer('reader@example.com')), 'if-none-match': '"same"' };
  const answer = await call(e, 'https://thebarbarianproject.com/data/v1/companies.json', { headers });
  assert.equal(answer.status, 304);
  assert.deepEqual(charged, [], 'a reader was charged for a document they were not sent');
  // The privacy header the author chose is still on it: revalidate every time.
  assert.equal(answer.headers.get('cache-control'), 'private, no-cache');
});

test('a delivered document still spends one, on both ceilings', async () => {
  const charged = [];
  const e = env({
    ASSETS: assetsAnswering(200),
    DATA_LIMIT: { limit: async ({ key }) => { charged.push(key); return { success: true }; } },
    DATA_IP_LIMIT: { limit: async ({ key }) => { charged.push(key); return { success: true }; } },
  });
  const answer = await call(e, 'https://thebarbarianproject.com/data/v1/companies.json',
    { headers: await bearer('reader@example.com') });
  assert.equal(answer.status, 200);
  assert.deepEqual(charged.map((k) => k.split(':')[0]).sort(), ['data', 'data-ip']);
});

test('over the ceiling, the reader gets the 429 and never the document the asset layer already produced', async () => {
  // Asking the asset layer first must not mean handing its answer over. The
  // body it produced is discarded; the reader sees the refusal.
  const e = env({
    ASSETS: assetsAnswering(200),
    DATA_LIMIT: { limit: async () => ({ success: false }) },
  });
  const answer = await call(e, 'https://thebarbarianproject.com/data/v1/companies.json',
    { headers: await bearer('reader@example.com') });
  assert.equal(answer.status, 429);
  assert.notEqual(await answer.text(), 'served', 'the document leaked past the ceiling');
  assert.equal(answer.headers.get('cache-control'), 'no-store');
});

test('the gate still refuses a reader with no session before touching the asset layer', async () => {
  let asked = 0;
  const e = env({ ASSETS: { async fetch() { asked += 1; return new Response('served', { status: 200 }); } } });
  const answer = await call(e, 'https://thebarbarianproject.com/data/v1/companies.json');
  assert.equal(answer.status, 401);
  assert.equal(asked, 0, 'the asset layer was consulted for an anonymous reader');
});

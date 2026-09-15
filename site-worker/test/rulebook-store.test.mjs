/* The reader's own rulebooks, on the server.
 *
 * The interesting tests here are not the happy path. They are the ones that
 * pin down what this endpoint must NEVER do.
 *
 * A rulebook is a reader's own definition of what they are looking for, and
 * that authorship is what makes the feature lawful for a publisher with no
 * advisory licence: the reader fixes the judgment and the cardinality. So the
 * server stores shape and nothing else. It must not evaluate a rulebook, rank
 * its results, reorder a reader's shelf, or reject a column it has never
 * heard of — the last one because columns get renamed, and a validator that
 * knows the column list would silently delete somebody's work the day one
 * changes.
 *
 * And, as with the watchlist: the key comes from a signed session and never
 * from anything a caller sends.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const worker = (await import('../index.js')).default;
const { cleanRulebook, cleanRulebooks } = await import('../index.js');

const SECRET = 'a-test-secret';

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

const env = (overrides) => ({ SESSION_SECRET: SECRET, ESTHMR_AUTH: kv(), ...overrides });
const call = (e, url, init) => worker.fetch(new Request(url, init), e);
const bearer = async (email) => ({ authorization: `Bearer ${await token(email)}` });
const API = 'https://thebarbarianproject.com/esthmr/api/rulebooks';

const RULE = {
  id: 'confirmation',
  name: 'Confirmation',
  match: 'all',
  conditions: [
    { column: 'relative_volume_20', op: '>=', value: 2 },
    { column: 'change_5', op: '>', value: 0 },
    { column: 'sessions_since_filing', op: '<=', value: 10 },
  ],
};

const put = async (e, email, rulebooks) => call(e, API, {
  method: 'PUT',
  headers: { ...(await bearer(email)), 'content-type': 'application/json' },
  body: JSON.stringify({ rulebooks }),
});

test('a shelf survives a round trip unchanged', async () => {
  const e = env();
  const written = await put(e, 'reader@example.com', [RULE]);
  assert.equal(written.status, 200);
  const read = await call(e, API, { headers: await bearer('reader@example.com') });
  const body = await read.json();
  assert.deepEqual(body.rulebooks, [RULE]);
});

test('one account cannot read another account rulebooks', async () => {
  const e = env();
  await put(e, 'one@example.com', [RULE]);
  const other = await call(e, API, { headers: await bearer('two@example.com') });
  assert.deepEqual((await other.json()).rulebooks, []);
});

test('the store is keyed by the signed session, not by anything sent', async () => {
  const e = env();
  await put(e, 'one@example.com', [RULE]);
  assert.ok(e.ESTHMR_AUTH.store.has('rules:one@example.com'));
});

test('a signed-out caller is refused', async () => {
  const result = await call(env(), API, {});
  assert.equal(result.status, 401);
});

test('a storage failure is not returned as an empty shelf', async () => {
  const e = env();
  e.ESTHMR_AUTH.get = async () => { throw new Error('storage unavailable'); };
  const result = await call(e, API, { headers: await bearer('reader@example.com') });
  assert.equal(result.status, 503);
  assert.equal(result.headers.get('cache-control'), 'no-store');
});

test('a rulebook is never cached', async () => {
  const e = env();
  const result = await call(e, API, { headers: await bearer('reader@example.com') });
  assert.equal(result.headers.get('cache-control'), 'no-store');
});

/* ---- what the validator must not do ---- */

test('a column the server has never heard of is stored, not refused', () => {
  // Columns are renamed and retired. A validator that knew the column list
  // would delete a reader's rulebook the day one changed.
  const out = cleanRulebook({
    conditions: [{ column: 'a_measure_invented_next_year', op: '>=', value: 1 }],
  });
  assert.equal(out.conditions[0].column, 'a_measure_invented_next_year');
});

test('the order the reader saved is the order stored', () => {
  const shelf = cleanRulebooks([
    { id: 'b', conditions: [{ column: 'x', op: 'has' }] },
    { id: 'a', conditions: [{ column: 'y', op: 'has' }] },
  ]);
  assert.deepEqual(shelf.map((r) => r.id), ['b', 'a']);
});

test('no verdict, weight or result count is ever computed server side', async () => {
  const e = env();
  const body = await (await put(e, 'reader@example.com', [RULE])).json();
  const stored = JSON.stringify(body.rulebooks);
  for (const word of ['verdict', 'matched', 'results', 'universe', 'shown', 'score']) {
    assert.ok(!stored.includes(word), `the server computed ${word}`);
  }
});

/* ---- shape ---- */

test('the stored key is the one the engine reads', () => {
  // The rule engine (public/esthmr/rulebook.js until the questions screen was
  // withdrawn) destructured `op`. Storing
  // `operator` would have made every saved question answer "unknown" for
  // every company — silently, because unknown is a legitimate answer.
  const out = cleanRulebook({ conditions: [{ column: 'revenue', op: '>=', value: 1 }] });
  assert.equal(out.conditions[0].op, '>=');
  assert.equal('operator' in out.conditions[0], false);
  assert.equal(cleanRulebook({
    conditions: [{ column: 'revenue', operator: '>=', value: 1 }],
  }), null);
});

test('an unknown operator is refused rather than stored', () => {
  assert.equal(cleanRulebook({
    conditions: [{ column: 'revenue', op: 'approximately', value: 1 }],
  }), null);
});

test('a rulebook with no usable condition is refused, not stored empty', () => {
  // The engine treats an empty rulebook as matching nothing, so storing one
  // hands the reader a rule that silently answers "none" forever.
  assert.equal(cleanRulebook({ name: 'Empty', conditions: [] }), null);
  assert.equal(cleanRulebook({
    name: 'All rubbish',
    conditions: [{ column: 'revenue', op: 'nope' }, 7, null],
  }), null);
});

test('one malformed rulebook does not lose the others', () => {
  const shelf = cleanRulebooks([RULE, { conditions: [] }, { ...RULE, id: 'second' }]);
  assert.equal(shelf.length, 2);
});

test('a payload that is not a list is a caller bug and says so', async () => {
  const e = env();
  const result = await call(e, API, {
    method: 'PUT',
    headers: { ...(await bearer('reader@example.com')), 'content-type': 'application/json' },
    body: JSON.stringify({ rulebooks: { id: 'not-an-array' } }),
  });
  assert.equal(result.status, 400);
});

test('has and missing store no value, so two equal rules are equal', () => {
  const out = cleanRulebook({
    conditions: [{ column: 'revenue', op: 'missing', value: 99 }],
  });
  assert.equal('value' in out.conditions[0], false);
});

test('in takes a bounded list and refuses an empty one', () => {
  const ok = cleanRulebook({
    conditions: [{ column: 'sector', op: 'in', value: ['Banks', 'Banks', 'Real Estate'] }],
  });
  assert.deepEqual(ok.conditions[0].value, ['Banks', 'Real Estate']);
  assert.equal(cleanRulebook({
    conditions: [{ column: 'sector', op: 'in', value: [] }],
  }), null);
});

test('a weight is kept only when it is a real number', () => {
  const out = cleanRulebook({
    conditions: [
      { column: 'a', op: 'has', weight: 2.5 },
      { column: 'b', op: 'has', weight: 'heavy' },
      { column: 'c', op: 'has', weight: Infinity },
    ],
  });
  assert.equal(out.conditions[0].weight, 2.5);
  assert.equal('weight' in out.conditions[1], false);
  assert.equal('weight' in out.conditions[2], false);
});

test('the shelf, the conditions and the choices are all bounded', () => {
  const many = (n, make) => Array.from({ length: n }, (_, i) => make(i));
  const shelf = cleanRulebooks(many(200, (i) => ({
    id: `r${i}`, conditions: [{ column: 'revenue', op: 'has' }],
  })));
  assert.equal(shelf.length, 24);
  const wide = cleanRulebook({
    conditions: many(200, (i) => ({ column: `c${i}`, op: 'has' })),
  });
  assert.equal(wide.conditions.length, 32);
  const listed = cleanRulebook({
    conditions: [{ column: 'sector', op: 'in', value: many(200, (i) => `s${i}`) }],
  });
  assert.equal(listed.conditions[0].value.length, 40);
});

test('a duplicate or missing id is replaced, never silently merged', () => {
  const shelf = cleanRulebooks([
    { id: 'same', conditions: [{ column: 'a', op: 'has' }] },
    { id: 'same', conditions: [{ column: 'b', op: 'has' }] },
    { conditions: [{ column: 'c', op: 'has' }] },
  ]);
  assert.equal(shelf.length, 3);
  assert.equal(new Set(shelf.map((r) => r.id)).size, 3);
  assert.deepEqual(shelf.map((r) => r.conditions[0].column), ['a', 'b', 'c']);
});

test('a sort direction is only ever asc or desc', () => {
  const out = cleanRulebook({
    sort: { column: 'market_cap', direction: 'sideways' },
    conditions: [{ column: 'a', op: 'has' }],
  });
  assert.equal(out.sort.direction, 'desc');
});

test('a name is trimmed and bounded, and an absent one is empty not undefined', () => {
  const long = cleanRulebook({
    name: `  ${'x'.repeat(200)}  `, conditions: [{ column: 'a', op: 'has' }],
  });
  assert.equal(long.name.length, 80);
  const none = cleanRulebook({ conditions: [{ column: 'a', op: 'has' }] });
  assert.equal(none.name, '');
});

/* ---- the research record is the one open thing under /data/v1/ ---- */

const DATA = 'https://thebarbarianproject.com/data/v1';

function assets(paths) {
  return {
    async fetch(request) {
      const path = new URL(request.url).pathname;
      return paths.has(path)
        ? new Response(`served ${path}`, { status: 200 })
        : new Response('not found', { status: 404 });
    },
  };
}

test('the exchange data still needs a session', async () => {
  const e = env({ ASSETS: assets(new Set(['/data/v1/market.json'])) });
  const result = await call(e, `${DATA}/market.json`, {});
  assert.equal(result.status, 401);
});

test('the research record is readable without an account', async () => {
  // The whole claim of a commitment is that a stranger can check it. A
  // reader who must take an account from this project before auditing this
  // project has been asked to trust the thing they came to verify.
  const paths = new Set([
    '/data/v1/research/commitments/2026-09-13.json',
    '/data/v1/research/reveals/2026-08-13.json',
    '/data/v1/research/leaderboard.json',
  ]);
  const e = env({ ASSETS: assets(paths) });
  for (const path of paths) {
    const result = await call(e, `https://thebarbarianproject.com${path}`, {});
    assert.equal(result.status, 200, `${path} answered ${result.status}`);
  }
});

test('an open document may be cached, a private one may not', async () => {
  const e = env({
    ASSETS: assets(new Set(['/data/v1/research/leaderboard.json', '/data/v1/market.json'])),
  });
  const open = await call(e, `${DATA}/research/leaderboard.json`, {});
  assert.match(open.headers.get('cache-control'), /public/);
  const gated = await call(e, `${DATA}/market.json`, { headers: await bearer('r@example.com') });
  assert.match(gated.headers.get('cache-control'), /private, no-cache/);
});

test('what the models said about named companies needs a session', async () => {
  // The lab's per-company documents name securities, so they sit beside the
  // exchange data behind the gate — never in research/, which is open. One
  // evening in September the scenarios document was published into research/
  // and served to anybody; these paths are where it lives now.
  const paths = new Set([
    '/data/v1/lab/scenarios.json',
    '/data/v1/lab/picks.json',
    '/data/v1/lab/rerank/filings-news-rulebook.json',
    '/data/v1/lab/rerank/models.json',
  ]);
  const e = env({ ASSETS: assets(paths) });
  for (const path of paths) {
    const result = await call(e, `https://thebarbarianproject.com${path}`, {});
    assert.equal(result.status, 401, `${path} answered ${result.status} without a session`);
  }
});

test('nothing outside research is opened by a path that merely contains it', async () => {
  // /data/v1/companies/research.json is exchange data with an unlucky name.
  const e = env({ ASSETS: assets(new Set(['/data/v1/companies/research.json'])) });
  const result = await call(e, `${DATA}/companies/research.json`, {});
  assert.equal(result.status, 401);
});

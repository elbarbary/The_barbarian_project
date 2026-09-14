/* The saved questions' store. Three things worth pinning down, none of them
 * the happy path: the key the engine reads, what a malformed question does to
 * the others, and that the account is the truth when there is one.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

/* A localStorage that behaves, and one that throws, because private windows
   and blocked storage both do and the store must not. */
function storage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)),
           removeItem: (k) => m.delete(k), clear: () => m.clear(), _m: m };
}
globalThis.localStorage = storage();
const store = await import('../../public/esthmr/questions-store.js');

const Q = { name: 'Busy', match: 'all',
            conditions: [{ column: 'relative_volume_20', op: '>=', value: 2 }] };

test('a clean question keeps the key the engine reads and nothing else', () => {
  const q = store.clean({ ...Q, conditions: [{ column: 'x', op: '>=', value: 1, junk: true }] });
  assert.equal(q.conditions[0].op, '>=');
  assert.equal('junk' in q.conditions[0], false);
  assert.equal('operator' in q.conditions[0], false);
});

test('a condition written with the wrong key is dropped, not stored', () => {
  // The engine destructures `op`. Stored as `operator` it answers "unknown"
  // for every company, silently.
  assert.equal(store.clean({ conditions: [{ column: 'x', operator: '>=', value: 1 }] }), null);
});

test('a question with no usable condition is refused rather than saved empty', () => {
  assert.equal(store.clean({ name: 'Empty', conditions: [] }), null);
  assert.equal(store.clean({ name: 'Rubbish', conditions: [{ column: 'x', op: 'about', value: 1 }] }), null);
});

test('an absence test carries no value and a numeric test needs one', () => {
  const has = store.clean({ conditions: [{ column: 'streak_break', op: 'has', value: 99 }] });
  assert.equal('value' in has.conditions[0], false);
  assert.equal(store.clean({ conditions: [{ column: 'x', op: '>=' }] }), null);
});

test('saving puts the newest first and replaces by id', () => {
  localStorage.clear();
  const a = store.save(null, { ...Q, id: 'a', name: 'A' });
  assert.deepEqual(a.map((q) => q.id), ['a']);
  const b = store.save(null, { ...Q, id: 'b', name: 'B' });
  assert.deepEqual(b.map((q) => q.id), ['b', 'a']);
  const again = store.save(null, { ...Q, id: 'a', name: 'A2' });
  assert.deepEqual(again.map((q) => [q.id, q.name]), [['a', 'A2'], ['b', 'B']]);
});

test('the shelf is bounded and one bad entry does not lose the rest', () => {
  localStorage.clear();
  for (let i = 0; i < store.MAX + 5; i++) store.save(null, { ...Q, id: `q${i}` });
  assert.equal(store.read(null).length, store.MAX);
  localStorage.setItem('esthmr:questions:guest', JSON.stringify([{ ...Q, id: 'ok' }, { conditions: [] }, 7]));
  assert.deepEqual(store.read(null).map((q) => q.id), ['ok']);
});

test('signed out and signed in are different shelves', () => {
  localStorage.clear();
  store.save(null, { ...Q, id: 'guest' });
  store.save('r@example.com', { ...Q, id: 'mine' });
  assert.deepEqual(store.read(null).map((q) => q.id), ['guest']);
  assert.deepEqual(store.read('r@example.com').map((q) => q.id), ['mine']);
});

test('reading never throws when storage does', () => {
  const keep = globalThis.localStorage;
  globalThis.localStorage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  try {
    assert.deepEqual(store.read(null), []);
    // A blocked store costs the persistence, not the page: the question is
    // still returned for the screen to show, the way a followed company is.
    const kept = store.save(null, Q);
    assert.equal(kept.length, 1);
    assert.equal(kept[0].name, 'Busy');
  } finally {
    globalThis.localStorage = keep;
  }
});

test('the account is the truth: a question deleted elsewhere does not come back', async () => {
  localStorage.clear();
  store.activate();
  const email = 'r@example.com';
  localStorage.setItem(`esthmr:questions:adopted:${email}`, '1');
  store.save(email, { ...Q, id: 'stale' });
  globalThis.fetch = async () => new Response(JSON.stringify({ rulebooks: [{ ...Q, id: 'kept' }] }), { status: 200 });
  const list = await store.sync(email);
  assert.deepEqual(list.map((q) => q.id), ['kept']);
});

test('no answer from the account keeps the mirror rather than wiping it', async () => {
  localStorage.clear();
  store.activate();
  const email = 'r@example.com';
  store.save(email, { ...Q, id: 'local' });
  globalThis.fetch = async () => { throw new Error('offline'); };
  const list = await store.sync(email);
  assert.deepEqual(list.map((q) => q.id), ['local']);
});

test('what a guest saved joins the account once, at the first sign-in', async () => {
  localStorage.clear();
  store.activate();
  const email = 'new@example.com';
  store.save(null, { ...Q, id: 'guest-q' });
  const sent = [];
  globalThis.fetch = async (url, init) => {
    if (init && init.method === 'PUT') { sent.push(JSON.parse(init.body).rulebooks); return new Response('{}', { status: 200 }); }
    return new Response(JSON.stringify({ rulebooks: [] }), { status: 200 });
  };
  const list = await store.sync(email);
  assert.deepEqual(list.map((q) => q.id), ['guest-q']);
  assert.equal(sent.length, 1);
  assert.equal(localStorage.getItem(`esthmr:questions:adopted:${email}`), '1');
});

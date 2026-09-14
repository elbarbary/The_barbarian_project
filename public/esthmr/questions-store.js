/* The reader's saved questions: where they live, and who is the truth.
 *
 * A question is a condition over the measurement table — "companies whose
 * volume is twice their own median and whose results are due within six
 * weeks" — with a name the reader gave it. It is the reader's authorship that
 * makes the feature lawful for a publisher with no advisory licence: they fixed
 * the test, and they fixed how many pass it. So this store keeps exactly what
 * they wrote and never reads it. Evaluation happens in `questions.js`, in the
 * browser, against a table this project publishes to everyone alike.
 *
 * THE SHAPE, AND THE ONE KEY THAT MATTERS
 * A condition is `{ column, op, value }`. `op`, not `operator`: the engine in
 * rulebook.js destructures `op`, and a question saved with the other key would
 * answer "unknown" for every company on the exchange — silently, because
 * unknown is a legitimate answer in a three-valued engine. The server-side
 * validator was written with the wrong key once and this comment is the
 * scar.
 *
 * WHERE IT LIVES
 * Same rule as the watchlist, for the same reasons. Signed in, the account is
 * the truth and this browser is a mirror — merging the two would resurrect a
 * question deleted on another device. Signed out, the browser is the whole of
 * it. Once, at the first sign-in on this browser, whatever was saved as a
 * guest joins the account, because losing it at the moment of signing in is
 * the one surprise a reader would blame on the feature.
 */
import { readResponse } from './requests.js';

const PREFIX = 'esthmr:questions:';
const API = '/esthmr/api/rulebooks';
export const MAX = 24;

const keyFor = (email) => PREFIX + (email ? String(email).trim().toLowerCase() : 'guest');
const OPS = new Set(['>=', '<=', '>', '<', '==', '!=', 'in', 'has', 'missing']);

/** One question as the store keeps it, or null if it is not one.
 *
 * Forgiving about the conditions and strict about the shape, the same way the
 * server is: one malformed condition is dropped, a question with no usable
 * condition is refused, because the engine treats an empty question as
 * matching nothing and saving one hands the reader a rule that silently
 * answers "none" forever.
 */
export function clean(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const conditions = [];
  for (const c of Array.isArray(raw.conditions) ? raw.conditions : []) {
    if (!c || typeof c !== 'object') continue;
    const column = typeof c.column === 'string' ? c.column.trim() : '';
    const op = typeof c.op === 'string' ? c.op.trim() : '';
    if (!column || !OPS.has(op)) continue;
    const out = { column, op };
    if (op !== 'has' && op !== 'missing') {
      if (op === 'in') {
        if (!Array.isArray(c.value) || !c.value.length) continue;
        out.value = c.value.slice(0, 40);
      } else if (typeof c.value === 'number' && Number.isFinite(c.value)) {
        out.value = c.value;
      } else if (typeof c.value === 'string' || typeof c.value === 'boolean') {
        out.value = c.value;
      } else {
        continue;
      }
    }
    if (c.negate === true) out.negate = true;
    conditions.push(out);
    if (conditions.length >= 32) break;
  }
  if (!conditions.length) return null;
  return {
    id: typeof raw.id === 'string' && /^[A-Za-z0-9_-]{1,48}$/.test(raw.id) ? raw.id : newId(),
    name: typeof raw.name === 'string' ? raw.name.trim().slice(0, 80) : '',
    match: raw.match === 'any' ? 'any' : 'all',
    conditions,
    updated: typeof raw.updated === 'number' ? raw.updated : Date.now(),
  };
}

export function newId() {
  return 'q' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

function cleanAll(list) {
  const seen = new Set();
  const out = [];
  for (const raw of Array.isArray(list) ? list : []) {
    const q = clean(raw);
    if (!q || seen.has(q.id)) continue;
    seen.add(q.id);
    out.push(q);
    if (out.length >= MAX) break;
  }
  return out;
}

/** Reading must never throw: private windows and blocked storage both do. */
export function read(email) {
  try {
    const raw = localStorage.getItem(keyFor(email));
    return cleanAll(raw ? JSON.parse(raw) : []);
  } catch {
    return [];
  }
}

function write(email, list) {
  const kept = cleanAll(list);
  try { localStorage.setItem(keyFor(email), JSON.stringify(kept)); }
  catch { /* a full or blocked store costs the change, not the page */ }
  return kept;
}

/** Save a question — new, or replacing the one with the same id. Newest first,
 *  so the last thing you asked is the first thing you see. */
export function save(email, question) {
  const q = clean(question);
  if (!q) return read(email);
  const list = read(email).filter((x) => x.id !== q.id);
  list.unshift({ ...q, updated: Date.now() });
  return write(email, list);
}

export function remove(email, id) {
  return write(email, read(email).filter((x) => x.id !== id));
}

/* ── the account's copy ──────────────────────────────────────────────────── */

/** The stored list, or null when there is no answer to be had. null and []
 *  are different facts: an empty list is a reader who saved nothing, and no
 *  answer is a reader whose network is down. */
async function pull() {
  try {
    return await readResponse(API, { credentials: 'same-origin' }, async (response) => {
      if (!response.ok) return null;
      const body = await response.json();
      return Array.isArray(body.rulebooks) ? body.rulebooks : null;
    });
  } catch {
    return null;
  }
}

async function put(list) {
  try {
    return await readResponse(API, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ rulebooks: list }),
    }, (response) => response.ok);
  } catch {
    return false;
  }
}

const adoptedKey = (email) => `${PREFIX}adopted:${String(email).trim().toLowerCase()}`;
function adopted(email) {
  try { return localStorage.getItem(adoptedKey(email)) === '1'; } catch { return true; }
}
function markAdopted(email) {
  try { localStorage.setItem(adoptedKey(email), '1'); } catch { /* nothing to keep */ }
}

/** Bring this browser into step with the account. Returns the list to show. */
export async function sync(email) {
  if (!email) return read(null);
  const state = stateFor(email);
  const revision = state.revision;
  const epoch = accountEpoch;
  const stored = await pull();
  if (epoch !== accountEpoch || revision !== state.revision || state.pending || state.failed) return read(email);
  if (stored === null) return read(email);

  if (!adopted(email)) {
    const ids = new Set(stored.map((q) => q.id));
    const guests = read(null).filter((q) => !ids.has(q.id));
    if (guests.length) {
      const merged = cleanAll(guests.concat(stored));
      write(email, merged);
      const ok = await enqueue(email, merged);
      if (ok && epoch === accountEpoch) markAdopted(email);
      return read(email);
    }
    markAdopted(email);
  }
  return write(email, stored);
}

/** Save and tell the account. The browser changes first so the screen reacts
 *  to the click rather than to the network. */
export function saveSynced(email, question, onStatus) {
  const list = save(email, question);
  if (email) void enqueue(email, list, onStatus);
  return list;
}

export function removeSynced(email, id, onStatus) {
  const list = remove(email, id);
  if (email) void enqueue(email, list, onStatus);
  return list;
}

// Serialize writes within this browser: a response for an older change must
// never roll back a newer one.
const states = new Map();
let accountEpoch = 0;
export function activate() {
  accountEpoch++;
  states.clear();
}
function stateFor(email) {
  const key = keyFor(email);
  if (!states.has(key)) states.set(key, { revision: 0, pending: false, failed: false, tail: Promise.resolve() });
  return states.get(key);
}
function enqueue(email, list, onStatus) {
  const state = stateFor(email);
  const revision = ++state.revision;
  const epoch = accountEpoch;
  state.pending = true;
  onStatus?.('saving');
  state.tail = state.tail.then(async () => {
    if (epoch !== accountEpoch || revision !== state.revision) return false;
    const ok = await put(list);
    if (epoch !== accountEpoch || revision !== state.revision) return ok;
    state.pending = false;
    state.failed = !ok;
    onStatus?.(ok ? 'saved' : 'error');
    return ok;
  });
  return state.tail;
}

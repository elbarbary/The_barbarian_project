/* The reader's own list of companies.
 *
 * The same shape the app keeps (user_repository.dart): **a ticker and nothing
 * else**. It records that somebody wants to follow a company, not that they
 * own it — no share count, no cost basis, no risk tolerance. Anything more
 * would be a holding, and a holding is a fact about a person's money that this
 * publisher has no business storing.
 *
 * WHERE IT LIVES, AND WHY THAT CHANGED
 * It used to live only in this browser, namespaced to whoever was signed in.
 * That kept the site free of any per-reader record, and it also meant the list
 * died with the device: follow eleven companies on a laptop and a phone shows
 * none of them. Signed in, it is now kept against the account — the same email
 * the session already proves — so it follows the reader. Signed out there is
 * no account to keep it against, and the browser store is still the whole of
 * it.
 *
 * THE SERVER IS THE TRUTH WHEN THERE IS ONE
 * Local storage is a mirror, not a second opinion. Merging the two would make
 * removal impossible: unfollow a company on the laptop, and the phone — still
 * holding it locally — would push it back on its next visit, and it would
 * reappear on the laptop looking like a bug in the store rather than the merge.
 * The one exception is deliberate and happens once: whatever was followed
 * before signing in is adopted into the account, because losing it at the
 * moment of signing in is the one surprise a reader would blame on the
 * feature.
 */
const PREFIX = 'esthmr:watchlist:';
const API = '/esthmr/api/watchlist';

/** The key for whoever is reading. Signed out gets its own list, kept. */
function keyFor(email) {
  return PREFIX + (email ? String(email).trim().toLowerCase() : 'guest');
}

/** Reading must never throw: private windows and blocked storage both do. */
export function read(email) {
  try {
    const raw = localStorage.getItem(keyFor(email));
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((t) => typeof t === 'string') : [];
  } catch {
    return [];
  }
}

function write(email, list) {
  // What was kept, not what was handed in. This persisted sixty and returned
  // all of it, so past the cap the star lit up for a company the store had
  // already dropped — until the next reload, when it went out.
  const kept = list.slice(0, 60);
  try {
    localStorage.setItem(keyFor(email), JSON.stringify(kept));
  } catch {
    /* a full or blocked store costs the change, not the page */
  }
  return kept;
}

export function has(email, ticker) {
  return read(email).includes(ticker);
}

/** Newest first, so the last thing you followed is the first thing you see. */
export function add(email, ticker) {
  if (!ticker) return read(email);
  const list = read(email).filter((t) => t !== ticker);
  list.unshift(ticker);
  return write(email, list);
}

export function remove(email, ticker) {
  return write(email, read(email).filter((t) => t !== ticker));
}

export function toggle(email, ticker) {
  return has(email, ticker) ? remove(email, ticker) : add(email, ticker);
}

export function clear(email) {
  return write(email, []);
}

/* ── the account's copy ──────────────────────────────────────────────────── */

/** The stored list, or null when there is no answer to be had.
 *
 * null and [] are different facts and the caller has to tell them apart: an
 * empty list is a reader who follows nothing, and no answer is a reader whose
 * network is down. Treating the second as the first would wipe the mirror.
 */
async function pull() {
  try {
    const response = await fetch(API, { credentials: 'same-origin' });
    if (!response.ok) return null;
    const body = await response.json();
    return Array.isArray(body.tickers) ? body.tickers : null;
  } catch {
    return null;
  }
}

/** Replace the stored list. Answers whether it took. */
async function put(tickers) {
  try {
    const response = await fetch(API, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ tickers }),
    });
    return response.ok;
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

/** Bring this browser into step with the account. Returns the list to show.
 *
 * Signed out there is nothing to be in step with, so the browser's own list is
 * the answer and no request is made.
 */
export async function sync(email) {
  if (!email) return read(null);
  const stored = await pull();
  if (stored === null) return read(email);      // no answer: keep the mirror

  // Once, at the first sign-in on this browser: whatever was followed as a
  // guest joins the account. After that the account decides, so that an
  // unfollow on another device is not undone here.
  if (!adopted(email)) {
    const guests = read(null).filter((t) => !stored.includes(t));
    markAdopted(email);
    if (guests.length) {
      const merged = guests.concat(stored).slice(0, 60);
      write(email, merged);
      await put(merged);
      return merged;
    }
  }
  return write(email, stored);
}

/** Follow or unfollow, and tell the account. Returns the list to show now.
 *
 * The browser changes first so the star reacts to the click rather than to the
 * network. `onSettled` is called with the list that actually took — the same
 * one when the write succeeded, and the account's own when it did not, so a
 * failed write corrects the screen instead of leaving it lying.
 */
export function toggleSynced(email, ticker, onSettled) {
  const list = toggle(email, ticker);
  if (email) {
    put(list).then(async (ok) => {
      if (ok) return;
      const stored = await pull();
      if (stored === null) return;              // still no network; keep the click
      onSettled && onSettled(write(email, stored));
    });
  }
  return list;
}

/** Empty the list, here and on the account. */
export function clearSynced(email) {
  const list = clear(email);
  if (email) put(list);
  return list;
}

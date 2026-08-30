/* The reader's own list of companies, on this device.
 *
 * The same shape the app keeps (user_repository.dart): **a ticker and nothing
 * else**. It records that somebody wants to follow a company, not that they
 * own it — no share count, no cost basis, no risk tolerance. Anything more
 * would be a holding, and a holding is a fact about a person's money that this
 * publisher has no business storing.
 *
 * On the device, namespaced to whoever is signed in, exactly as the app does
 * it: signing in as somebody else must not show you their list, and signing
 * out must not hand the next person yours. There is no server store — the
 * worker keeps sessions and nothing else, and a watchlist that left the
 * browser would be a per-reader record this site does not need to hold.
 *
 * Home's block used to be five tickers the design named, headed "Watchlist",
 * that nobody had chosen and nobody could change. This is the real thing; that
 * block is now honestly labelled "Largest by market value" beside it.
 */
const PREFIX = 'esthmr:watchlist:';

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
  try {
    localStorage.setItem(keyFor(email), JSON.stringify(list.slice(0, 60)));
  } catch {
    /* a full or blocked store costs the change, not the page */
  }
  return list;
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

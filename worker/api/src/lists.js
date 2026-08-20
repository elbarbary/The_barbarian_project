/**
 * A signed-in reader's watchlist and bookmarks (spec §30, §33).
 *
 * The shape mirrors `UserRepository` in the Flutter app one call per method, on
 * purpose: sync arrives as a second implementation behind an interface that
 * already exists, and no screen changes.
 *
 * Every write is a single row keyed by (user, item) and every operation is
 * idempotent, so adding a ticker twice is not an error and removing one that
 * was never there is not either. That matters more than it looks: it means a
 * phone that loses its connection mid-request can simply retry, and two devices
 * editing the same list converge instead of one silently overwriting the
 * other's list wholesale.
 */

/** EGX tickers are three to six capitals; nothing else is a ticker. */
const TICKER = /^[A-Z]{3,6}$/;

const BOOKMARK_KINDS = new Set(['cash_or_trash', 'opportunity', 'research']);

/**
 * Caps on everything a caller controls (§53).
 *
 * A watchlist is a reading list, not a database — anybody following two hundred
 * companies is not using the feature, and the cap keeps one account from
 * turning into unbounded storage.
 */
export const LIMITS = {
  watchlist: 200,
  bookmarks: 500,
  title: 300,
  subtitle: 500,
  url: 2048,
  itemId: 128,
};

export class BadRequest extends Error {
  constructor(message) {
    super(message);
    this.status = 400;
  }
}

export function assertTicker(ticker) {
  if (typeof ticker !== 'string' || !TICKER.test(ticker)) {
    throw new BadRequest('that is not a ticker');
  }
  return ticker;
}

function assertText(value, max, field, { required = true } = {}) {
  if (value == null || value === '') {
    if (required) throw new BadRequest(`${field} is required`);
    return null;
  }
  if (typeof value !== 'string') throw new BadRequest(`${field} must be text`);
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    if (required) throw new BadRequest(`${field} is required`);
    return null;
  }
  if (trimmed.length > max) throw new BadRequest(`${field} is too long`);
  return trimmed;
}

/**
 * A bookmark's link, or nothing.
 *
 * Only http and https are stored. A bookmark is rendered as something tappable,
 * and `javascript:` or `data:` in that position is a script the app would run
 * on the user's behalf (§53: do not allow arbitrary HTML, sanitize what is
 * rendered).
 */
function assertUrl(value) {
  const text = assertText(value, LIMITS.url, 'url', { required: false });
  if (text === null) return null;
  let parsed;
  try {
    parsed = new URL(text);
  } catch {
    throw new BadRequest('that is not a link');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new BadRequest('a bookmark link must be http or https');
  }
  return parsed.toString();
}

export async function readWatchlist(db, userId) {
  const { results } = await db
    .prepare(
      `SELECT ticker FROM watchlist WHERE user_id = ?
       ORDER BY position ASC, added_at ASC LIMIT ?`,
    )
    .bind(userId, LIMITS.watchlist)
    .all();
  return results.map((row) => row.ticker);
}

export async function addToWatchlist(db, userId, ticker, now = Date.now()) {
  assertTicker(ticker);
  const seconds = Math.floor(now / 1000);

  const count = await db
    .prepare('SELECT COUNT(*) AS n FROM watchlist WHERE user_id = ?')
    .bind(userId)
    .first();
  const already = await db
    .prepare('SELECT 1 FROM watchlist WHERE user_id = ? AND ticker = ?')
    .bind(userId, ticker)
    .first();
  if (!already && count.n >= LIMITS.watchlist) {
    throw new BadRequest(`a watchlist holds up to ${LIMITS.watchlist} companies`);
  }

  // New entries land at the end. `position` is only touched by an explicit
  // reorder, so adding a company never rearranges the ones already there.
  await db
    .prepare(
      `INSERT INTO watchlist (user_id, ticker, position, added_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT (user_id, ticker) DO NOTHING`,
    )
    .bind(userId, ticker, count.n, seconds)
    .run();
}

export async function removeFromWatchlist(db, userId, ticker) {
  assertTicker(ticker);
  await db
    .prepare('DELETE FROM watchlist WHERE user_id = ? AND ticker = ?')
    .bind(userId, ticker)
    .run();
}

/**
 * Reorder, ignoring anything the caller sent that is not already on their list.
 *
 * Treating an unknown ticker as an insert would let a reorder add companies,
 * which is a different operation with a different limit. Silently dropping it
 * keeps this one honest.
 */
export async function reorderWatchlist(db, userId, tickers) {
  if (!Array.isArray(tickers)) throw new BadRequest('send a list of tickers');
  if (tickers.length > LIMITS.watchlist) throw new BadRequest('too many tickers');
  tickers.forEach(assertTicker);

  const held = new Set(await readWatchlist(db, userId));
  const ordered = tickers.filter((ticker) => held.has(ticker));

  if (ordered.length === 0) return;
  await db.batch(
    ordered.map((ticker, index) =>
      db
        .prepare('UPDATE watchlist SET position = ? WHERE user_id = ? AND ticker = ?')
        .bind(index, userId, ticker),
    ),
  );
}

export async function readBookmarks(db, userId) {
  const { results } = await db
    .prepare(
      `SELECT kind, item_id, title, subtitle, url FROM bookmarks
       WHERE user_id = ? ORDER BY added_at DESC LIMIT ?`,
    )
    .bind(userId, LIMITS.bookmarks)
    .all();
  return results.map((row) => ({
    kind: row.kind,
    id: row.item_id,
    title: row.title,
    ...(row.subtitle ? { subtitle: row.subtitle } : {}),
    ...(row.url ? { url: row.url } : {}),
  }));
}

export async function addBookmark(db, userId, kind, itemId, body, now = Date.now()) {
  if (!BOOKMARK_KINDS.has(kind)) throw new BadRequest('unknown bookmark kind');
  const id = assertText(itemId, LIMITS.itemId, 'id');
  const title = assertText(body?.title, LIMITS.title, 'title');
  const subtitle = assertText(body?.subtitle, LIMITS.subtitle, 'subtitle', {
    required: false,
  });
  const url = assertUrl(body?.url);

  const count = await db
    .prepare('SELECT COUNT(*) AS n FROM bookmarks WHERE user_id = ?')
    .bind(userId)
    .first();
  const already = await db
    .prepare('SELECT 1 FROM bookmarks WHERE user_id = ? AND kind = ? AND item_id = ?')
    .bind(userId, kind, id)
    .first();
  if (!already && count.n >= LIMITS.bookmarks) {
    throw new BadRequest(`you can keep up to ${LIMITS.bookmarks} bookmarks`);
  }

  // Re-bookmarking refreshes the stored title: research gets retitled, and a
  // saved item showing a headline the article no longer carries is a small lie.
  await db
    .prepare(
      `INSERT INTO bookmarks (user_id, kind, item_id, title, subtitle, url, added_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (user_id, kind, item_id)
       DO UPDATE SET title = excluded.title,
                     subtitle = excluded.subtitle,
                     url = excluded.url`,
    )
    .bind(userId, kind, id, title, subtitle, url, Math.floor(now / 1000))
    .run();
}

export async function removeBookmark(db, userId, kind, itemId) {
  if (!BOOKMARK_KINDS.has(kind)) throw new BadRequest('unknown bookmark kind');
  await db
    .prepare('DELETE FROM bookmarks WHERE user_id = ? AND kind = ? AND item_id = ?')
    .bind(userId, kind, itemId)
    .run();
}

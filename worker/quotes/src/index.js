/**
 * Live-ish EGX quotes for The Barbarian app.
 *
 * The exchange feed the project can reach for free is *delayed*, not real time:
 * every row comes back tagged `delayed_streaming_900`, which is 900 seconds —
 * fifteen minutes — behind the tape. That number is passed through to the app in
 * `delay_seconds` rather than hidden, because a price shown without its age is a
 * lie the reader cannot detect (spec §49).
 *
 * What this Worker adds on top is freshness of *collection*: the published
 * `market.json` is rebuilt once a day, so a price in the app used to be up to
 * twenty-four hours old. Here the market is re-read at most once every five
 * minutes and the cached copy is handed to everyone in between.
 *
 * Why a Worker rather than letting the app call the vendor:
 *
 *   * one request per five minutes for the whole userbase instead of one per
 *     device, which is the difference between a polite client and a scraper;
 *   * the vendor stays server-side, so swapping feeds is a deploy and not an
 *     app release (spec §14);
 *   * a bad response upstream degrades to the last good snapshot instead of
 *     blanking every phone at once.
 *
 * Free tier throughout: no cron, no KV, no database. The cache is the Cache API,
 * which costs nothing and needs no binding.
 */

const SCANNER = 'https://scanner.tradingview.com/egypt/scan';

/** How long a snapshot is served before the market is re-read. */
const FRESH_FOR_SECONDS = 300;

/**
 * How long a snapshot may still be served after a failed refresh.
 *
 * Generous on purpose: a stale price that says how stale it is beats an error
 * card. The app is told `stale: true` and shows the age it was actually given.
 */
const SERVE_STALE_FOR_SECONDS = 3600;

/** Requested in this order; `d` comes back as a positional array. */
const COLUMNS = [
  'name',
  'close',
  'open',
  'high',
  'low',
  'volume',
  'change', // percent
  'change_abs', // in pounds — asked for so the previous close is read, not inferred
  'update_mode',
];

/** Cache key. A synthetic GET, because the upstream call is a POST. */
const CACHE_KEY = new Request('https://quotes.thebarbarianproject.com/__snapshot');

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors() });
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return json({ error: 'method not allowed' }, 405);
    }
    if (url.pathname !== '/quotes.json' && url.pathname !== '/') {
      return json({ error: 'not found' }, 404);
    }

    const cache = caches.default;
    const hit = await cache.match(CACHE_KEY);
    const age = hit ? Number(hit.headers.get('x-snapshot-age-basis')) : 0;
    const ageSeconds = hit ? (Date.now() - age) / 1000 : Infinity;

    if (hit && ageSeconds < FRESH_FOR_SECONDS) {
      return withHeaders(hit, Math.round(ageSeconds));
    }

    let snapshot;
    try {
      snapshot = await readMarket();
    } catch (err) {
      // Upstream is down or has changed shape. Keep serving what we have and
      // say so, rather than turning every price in the app into an error.
      if (hit && ageSeconds < SERVE_STALE_FOR_SECONDS) {
        const body = await hit.json();
        body.stale = true;
        body.stale_reason = String(err && err.message ? err.message : err);
        return json(body, 200, Math.round(ageSeconds));
      }
      return json({ error: 'quotes unavailable', reason: String(err) }, 503);
    }

    const response = json(snapshot, 200, 0);
    const stored = response.clone();
    stored.headers.set('x-snapshot-age-basis', String(Date.now()));
    ctx.waitUntil(cache.put(CACHE_KEY, stored));
    return response;
  },
};

async function readMarket() {
  const upstream = await fetch(SCANNER, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      filter: [{ left: 'exchange', operation: 'equal', right: 'EGX' }],
      options: { lang: 'en' },
      symbols: { query: { types: ['stock'] }, tickers: [] },
      columns: COLUMNS,
      range: [0, 500],
    }),
  });

  if (!upstream.ok) throw new Error(`upstream http ${upstream.status}`);
  const payload = await upstream.json();
  if (!payload || !Array.isArray(payload.data)) throw new Error('upstream shape changed');

  const quotes = {};
  const modes = new Set();
  for (const row of payload.data) {
    const v = Object.fromEntries(COLUMNS.map((c, i) => [c, row.d[i]]));
    // A name with no price is not a quote. Ten or so EGX rows come back keyed
    // by ISIN with nothing attached; they are dropped here as they are in the
    // daily build, so the app never has to reason about half-rows.
    if (!v.name || typeof v.close !== 'number') continue;
    if (v.update_mode) modes.add(v.update_mode);
    quotes[v.name] = {
      c: round(v.close),
      o: round(v.open),
      h: round(v.high),
      l: round(v.low),
      v: v.volume == null ? null : Math.round(v.volume),
      // Percent, as the feed gives it. The app divides by 100 — the published
      // documents store a fraction, and mixing the two silently multiplies
      // every move on the screen by a hundred.
      ch: v.change == null ? null : Number(v.change.toFixed(4)),
      // Previous close, from the feed's own absolute change rather than
      // reconstructed from a rounded percentage.
      pc:
        typeof v.close === 'number' && typeof v.change_abs === 'number'
          ? round(v.close - v.change_abs)
          : null,
    };
  }

  if (Object.keys(quotes).length === 0) throw new Error('upstream returned no quotes');

  return {
    as_of: new Date().toISOString(),
    // Derived from the feed's own tag rather than assumed. If the vendor ever
    // upgrades the tier this number drops on its own and the app's caption
    // follows it without a release.
    delay_seconds: delayFromModes(modes),
    update_modes: [...modes],
    session: cairoSession(new Date()),
    count: Object.keys(quotes).length,
    stale: false,
    quotes,
  };
}

/**
 * `delayed_streaming_900` → 900. `streaming`/`real_time` → 0.
 *
 * If several tiers come back at once the worst one wins: the caption has to be
 * true of every price on the screen, not of the best one.
 */
function delayFromModes(modes) {
  let worst = 0;
  for (const mode of modes) {
    const m = /(\d+)/.exec(String(mode));
    if (m) worst = Math.max(worst, Number(m[1]));
    else if (!/stream|real/i.test(String(mode))) worst = Math.max(worst, 900);
  }
  return worst;
}

/**
 * Whether the Egyptian Exchange is currently trading.
 *
 * EGX runs Sunday to Thursday, 10:00–14:30 Cairo time. Outside those hours the
 * "delayed" quote is simply the last close, and the app says so instead of
 * implying a live tape on a Friday afternoon.
 *
 * Holidays are not modelled — this Worker has no calendar — so on a public
 * holiday it reports `closed` only by weekday. The app never relies on this for
 * correctness, only for the wording of a caption.
 */
function cairoSession(now) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Cairo',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);
  const get = (t) => parts.find((p) => p.type === t)?.value ?? '';
  const weekday = get('weekday');
  const minutes = Number(get('hour')) * 60 + Number(get('minute'));

  const trading = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu'].includes(weekday);
  const open = trading && minutes >= 10 * 60 && minutes <= 14 * 60 + 30;
  return { open, weekday, cairo_minutes: minutes };
}

function round(n) {
  return typeof n === 'number' ? Number(n.toFixed(4)) : null;
}

function cors() {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, HEAD, OPTIONS',
    'access-control-max-age': '86400',
  };
}

function json(body, status = 200, ageSeconds = 0) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      // Edge and client may both hold it until the next refresh is due.
      'cache-control': `public, max-age=60, s-maxage=${FRESH_FOR_SECONDS}`,
      'x-snapshot-age': String(ageSeconds),
      ...cors(),
    },
  });
}

function withHeaders(cached, ageSeconds) {
  const response = new Response(cached.body, cached);
  response.headers.set('x-snapshot-age', String(ageSeconds));
  response.headers.delete('x-snapshot-age-basis');
  return response;
}

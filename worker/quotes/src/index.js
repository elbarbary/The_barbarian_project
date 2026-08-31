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

/* The exchange's own tape, asked first.
 *
 * It is NOT fresher. Both feeds are about fifteen minutes behind — measured
 * on 31 August 2026 with the market open, the two agreed to a few hundredths
 * minute after minute, and the exchange's own `writeTime` sat 14 minutes
 * behind the Cairo clock. Anyone expecting the exchange to be live should
 * know that before it is wired in: EGX publishes its public feed delayed, the
 * same as the vendor does.
 *
 * What it buys is three things the vendor cannot give:
 *
 *   * `writeTime` — the exchange stamps the row itself, so the delay stops
 *     being a tier name we assume and becomes a number we measure;
 *   * `trades` and `value` — how many times a share changed hands and for how
 *     much, neither of which is in the scanner;
 *   * the same source the market values already come from, so a company's
 *     price and its market capitalisation stop being two vendors' opinions.
 *
 * It covers 221 securities against a directory of 282, so the scanner stays
 * and fills the rest. Per ticker: the exchange where it has one, the vendor
 * where it does not.
 */
const EGX = 'https://beta.egx.com.eg/api/bff/egx/market-watch?Page=1&PageSize=500';

/** The header the exchange's gateway checks for. Without `x-egx-bff-request`
 *  it answers 404 to a Worker; with it, 200. */
const EGX_HEADERS = {
  'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    + ' (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
  accept: 'application/json',
  'accept-language': 'en-US,en;q=0.9',
  'x-egx-bff-request': '1',
  referer: 'https://beta.egx.com.eg/en',
};

/** How long a snapshot is served before the market is re-read. */
const FRESH_FOR_SECONDS = 300;

/**
 * The delay assumed when the feed does not state its tier.
 *
 * This is the tier the project actually reads today (`delayed_streaming_900`).
 * Guessing it is a claim, so it is deliberately the pessimistic one: overstating
 * the delay costs a reader nothing, understating it tells them a fifteen-minute
 * price is current.
 */
const ASSUMED_DELAY_SECONDS = 900;

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

/**
 * Tickers the app will accept. Mirrors TICKER in scripts/build_market_api.py.
 */
const TICKER = /^[A-Z]{3,6}$/;

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

    let shot;
    try {
      shot = await snapshot();
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

    const response = json(shot, 200, 0);
    const stored = response.clone();
    stored.headers.set('x-snapshot-age-basis', String(Date.now()));
    // The stored copy must outlive its own freshness, or the degradation path
    // below can never run: cloning the eyeball response carried its
    // `s-maxage=FRESH_FOR_SECONDS`, so the entry was evicted at the same instant
    // it stopped being fresh and every upstream outage past five minutes turned
    // into a 503 with no fallback. Keep it for the whole serve-stale window.
    stored.headers.set(
      'cache-control',
      `public, s-maxage=${SERVE_STALE_FOR_SECONDS}`,
    );
    ctx.waitUntil(cache.put(CACHE_KEY, stored));
    return response;
  },
};

/* ── the exchange ──────────────────────────────────────────────────────── */

/** "202608311218" against the same clock the exchange keeps, in seconds.
 *
 * Both sides are read as Cairo wall time and subtracted, so the offset never
 * has to be known and the summer change never has to be handled: EEST and EET
 * cancel. The one hour a year they do not cancel is the small hours of a
 * Friday, when the exchange is shut.
 */
export function stampAge(writeTime, now = new Date()) {
  const m = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(String(writeTime || ''));
  if (!m) return null;
  const written = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  // `now`, expressed in Cairo, as the same kind of naive wall-clock instant.
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(now).map((x) => [x.type, x.value]));
  const here = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute);
  const seconds = Math.round((here - written) / 1000);
  // A stamp from the future is a clock disagreement, not a negative delay.
  return seconds < 0 ? 0 : seconds;
}

/** The exchange's rows, keyed by ticker. Same shape the scanner produces. */
export function cleanEgx(rows) {
  const quotes = {};
  let writeTime = null;
  for (const row of rows || []) {
    const ticker = String(row.reuters || '').split('.')[0].trim().toUpperCase();
    const last = row.lastPrice;
    if (!TICKER.test(ticker) || typeof last !== 'number' || last <= 0) continue;
    if (row.writeTime) writeTime = String(row.writeTime);
    quotes[ticker] = {
      c: round(last),
      o: round(row.openPrice),
      h: round(row.high),
      l: round(row.low),
      v: typeof row.volume === 'number' ? Math.round(row.volume) : null,
      // Percent, as the exchange gives it — the same unit the scanner uses
      // and the opposite of the fraction the published documents store.
      ch: typeof row.chgPer === 'number' ? Number(row.chgPer.toFixed(4)) : null,
      pc: round(row.prevClose),
      // Two figures the scanner has no column for.
      t: typeof row.trades === 'number' ? Math.round(row.trades) : null,
      val: typeof row.value === 'number' ? Math.round(row.value) : null,
      s: 'egx',
    };
  }
  return { quotes, writeTime };
}

async function readEgx() {
  const response = await fetch(EGX, { headers: EGX_HEADERS });
  if (!response.ok) throw new Error(`egx http ${response.status}`);
  const payload = await response.json();
  const rows = ((payload || {}).data || {}).data;
  if (!Array.isArray(rows)) throw new Error('egx shape changed');
  const { quotes, writeTime } = cleanEgx(rows);
  if (!Object.keys(quotes).length) throw new Error('egx returned no quotes');
  return { quotes, writeTime };
}

/** The exchange where it has an answer, the vendor everywhere else.
 *
 * Per ticker, never per feed: taking the whole of one and discarding the other
 * would drop sixty-one companies the exchange does not carry, or throw away
 * the trade counts for the two hundred it does.
 */
export function mergeQuotes(vendor, exchange) {
  const quotes = { ...vendor };
  for (const [ticker, row] of Object.entries(exchange || {})) quotes[ticker] = row;
  const used = Object.values(quotes);
  return {
    quotes,
    from: {
      egx: used.filter((q) => q.s === 'egx').length,
      vendor: used.filter((q) => q.s !== 'egx').length,
    },
  };
}

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
    // A name with no price is not a quote, and a name that is really an ISIN is
    // not a ticker. Ten or so EGX rows come back keyed like `EGS385S1C012`.
    //
    // This must match TICKER in scripts/build_market_api.py exactly. The comment
    // here used to claim the rows were dropped while the code only checked for a
    // price, so the feed reintroduced ten listings the directory excludes —
    // `mergedOver` put them straight into the app's stock map and Home counted
    // them in its risers-and-fallers breadth.
    if (!v.name || typeof v.close !== 'number') continue;
    if (!TICKER.test(v.name)) continue;
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

  return { quotes, modes };
}

/** Both feeds, merged, with an age that is the worst of what is on the screen.
 *
 * The exchange is asked first and is allowed to fail: it answers a Worker with
 * an occasional 404 before it settles, and a quotes endpoint that goes down
 * with it would be worse than one carrying the vendor's numbers. The vendor is
 * NOT allowed to fail on its own — losing it costs the sixty-one companies the
 * exchange does not carry — but if the exchange answered, its 221 are still
 * worth serving alone.
 */
async function snapshot() {
  const [exchange, vendor] = await Promise.all([
    readEgx().catch((error) => ({ error: String(error && error.message) })),
    readMarket().catch((error) => ({ error: String(error && error.message) })),
  ]);
  if (exchange.error && vendor.error) {
    throw new Error(`egx: ${exchange.error} | vendor: ${vendor.error}`);
  }
  const { quotes, from } = mergeQuotes(vendor.quotes || {}, exchange.quotes || {});

  // The caption has to be true of EVERY price on the screen, so the delay is
  // the worst of the sources actually used — never the best. The exchange
  // stamps its own rows, so that half is measured rather than assumed; the
  // vendor's is the tier it declares. Where both are on screen, the larger
  // wins, which is the only honest answer to "how old is this page".
  const measured = exchange.writeTime ? stampAge(exchange.writeTime) : null;
  const vendorDelay = vendor.quotes ? delayFromModes(vendor.modes) : null;
  const worst = Math.max(
    from.egx && measured !== null ? measured : 0,
    from.vendor && vendorDelay !== null ? vendorDelay : 0,
  );

  return {
    as_of: new Date().toISOString(),
    delay_seconds: worst,
    // Kept apart so a reader — or a screen — can say WHICH half is which
    // rather than being handed one number for two different claims.
    egx_delay_seconds: measured,
    egx_write_time: exchange.writeTime || null,
    vendor_delay_seconds: vendorDelay,
    update_modes: [...(vendor.modes || [])],
    from,
    unavailable: [exchange.error && `egx: ${exchange.error}`,
                  vendor.error && `vendor: ${vendor.error}`].filter(Boolean),
    session: cairoSession(new Date()),
    count: Object.keys(quotes).length,
    stale: false,
    quotes,
  };
}

/**
 * `delayed_streaming_900` → 900. Real-time tiers → 0.
 *
 * If several tiers come back at once the worst one wins: the caption has to be
 * true of every price on the screen, not of the best one.
 *
 * **Fails closed.** An empty set means the feed stopped telling us its tier —
 * because the column was renamed, or removed, or came back null — and the one
 * answer that must never be produced in that case is zero, which the app renders
 * as "Real-time" beside prices that are still a quarter of an hour old. An
 * unknown tier is assumed to be the delayed one we actually license.
 *
 * The upstream does not error on an unknown column: requesting a renamed
 * `update_mode` returns HTTP 200 with `null` in that slot, so neither the status
 * check nor the shape check catches it. This is the only guard.
 */
function delayFromModes(modes) {
  if (modes.size === 0) return ASSUMED_DELAY_SECONDS;

  let worst = 0;
  let recognised = false;
  for (const mode of modes) {
    const text = String(mode);
    const m = /(\d+)/.exec(text);
    if (m) {
      worst = Math.max(worst, Number(m[1]));
      recognised = true;
    } else if (/^(streaming|real[_-]?time)$/i.test(text.trim())) {
      // An explicitly real-time tier is the only way to reach zero.
      recognised = true;
    } else {
      worst = Math.max(worst, ASSUMED_DELAY_SECONDS);
      recognised = true;
    }
  }
  return recognised ? worst : ASSUMED_DELAY_SECONDS;
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

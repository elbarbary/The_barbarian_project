// The chart socket's half of the market scan: split-adjusted daily history for
// every listing, and an honest account of the listings it could not get.
//
// Split out of `egx_scan.mjs` so the socket handling can be tested against a
// fake server. It imports nothing: the caller hands in the WebSocket class,
// which is `ws` in the scan and a script in the tests.
//
// WHY ~50 COMPANIES CAME BACK WITHOUT HISTORY (15 September 2026)
//
// Not rate limiting, not a slow socket, not paging. A listing that has never
// traded — ACFR, ELAB, GROV and about thirty others, most of them quoted at a
// par value with zero volume — has no bars, and while the market is open the
// socket says so with `series_completed` and `data_completed: "end"` and
// never sends a `timescale_update` at all. It was probed for twenty seconds:
// nothing more arrives.
//
// The scan used to advance to the next symbol only on a `timescale_update`.
// So one such listing held its socket until the ten-second batch timeout and
// every symbol queued behind it in that batch was lost — SWDY, ISPH, CLHO,
// ALCN, LUTS, GRCA. The retries grouped the survivors with the same dead
// listings and lost most of them again. Replaying that rule over the 15 Sep
// scan's own record order, with the thirty dead listings as the only input,
// reproduces 50 of its 53 empty histories. After the close the socket does
// send those listings an empty `timescale_update`, which is why every CI
// scan of 14 Sep had 263 companies with history and both of 15 Sep's, taken
// during the session, had 241 and 238.
//
// So a series is finished by whichever the socket sends first for it: bars,
// `series_completed`, or an error.

export const HISTORY_DEFAULTS = {
  // Daily candles asked of each series. The scan keeps 120; the Kronos
  // retraining pilot asks for thousands (scripts/lab/retrain/fetch_candles.mjs).
  bars: 120,
  // Symbols asked on one socket, pass by pass. The last pass asks one symbol
  // per socket, so a listing that never answers costs nothing but itself.
  // Five, as before: a chart session refuses a tenth series outright
  // ("exceed limit of series in the session"), removed ones included.
  passes: [5, 5, 5, 1],
  // Two sockets at a time, as the research script always did.
  sockets: 2,
  // How long ONE symbol may go unanswered. It used to be ten seconds for the
  // whole batch, so a slow symbol took the ones behind it too.
  symbolTimeoutMs: 10_000,
  // A short gap before the next symbol. Firing them back to back got series
  // dropped silently.
  gapMs: 20,
  // A breath before each retry pass.
  pauseMs: 3_000,
  // No pass starts after this long. A healthy fetch takes under a minute; a
  // socket that connects and then answers nothing at all would otherwise spend
  // ten seconds a socket for four passes.
  deadlineMs: 8 * 60_000,
};

// TradingView's chart socket speaks a length-prefixed framing of its own:
// `~m~<byte length>~m~<json payload>`. `payload.length` is the JavaScript
// UTF-16 length, which is not in general a byte count — it is only correct here
// because every method name and every EGX symbol is ASCII. Left as-is on
// purpose; "fixing" it to a real byte count would change nothing today and is
// not a change worth making blind against a protocol nobody documents.
export function frame(method, params) {
  const payload = JSON.stringify({ m: method, p: params });
  return `~m~${payload.length}~m~${payload}`;
}

// One TCP chunk routinely carries several frames, so the reader walks the
// length prefixes rather than assuming one message per event.
export function parseMessages(chunk) {
  const messages = [];
  const text = String(chunk);
  const regex = /~m~(\d+)~m~/g;
  let match;
  while ((match = regex.exec(text))) {
    const start = regex.lastIndex;
    const length = Number(match[1]);
    messages.push(text.slice(start, start + length));
    regex.lastIndex = start + length;
  }
  return messages;
}

function barsOf(points) {
  return points
    .map((point) => {
      const values = point?.v;
      if (!Array.isArray(values) || values.length < 6) return null;
      return {
        timestamp: values[0],
        open: values[1],
        high: values[2],
        low: values[3],
        close: values[4],
        volume: values[5],
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.timestamp - b.timestamp);
}

// Whether the scanner says this listing trades. A "no sessions" answer for a
// company whose own scanner row carries a thirty-day average volume is not
// the truth about that company; it is a failed read, and is treated as one.
export function traded(record) {
  return [record.scannerAverageVolume30d, record.volume]
    .some((value) => Number.isFinite(value) && value > 0);
}

// What became of one listing's history:
//   fetched   the socket returned its sessions;
//   none      the socket holds no sessions for it and the scanner agrees
//             nothing traded — a listing, not a series;
//   missing   no answer after every pass, or a "no sessions" answer the
//             scanner contradicts. Missing is not empty, and a consumer that
//             cannot tell the two apart publishes a smaller market.
export function statusOf(record, answers) {
  const bars = answers.get(record.symbol);
  if (Array.isArray(bars) && bars.length) return "fetched";
  if (Array.isArray(bars) && !traded(record)) return "none";
  return "missing";
}

// One socket, symbols asked one at a time. Resolves with `answers`, symbol →
// bars for every symbol it settled — an array (empty when the socket said there
// are none), or null for an error that is not an answer — and whether the
// socket connected at all.
export function fetchBatch(batch, options) {
  const settings = { ...HISTORY_DEFAULTS, ...options };
  const { WebSocket, url, origin, session, symbolTimeoutMs, gapMs, warn } = settings;
  const socket = new WebSocket(url, { headers: { Origin: origin } });
  const answers = new Map();
  let connected = false;
  let index = 0;
  let waiting = null;
  let done = false;
  let timer = null;

  return new Promise((resolve) => {
    const finish = (problem) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (problem) {
        warn({ symbols: batch.slice(index).map((record) => record.ticker), message: problem });
      }
      try {
        socket.close();
      } catch {
        // already closed
      }
      resolve({ answers, connected });
    };

    // Armed for the handshake and again for every symbol. When it fires the
    // socket is given up: what it was asked and what was queued behind it go
    // to the next pass, and the last pass asks each of them on its own.
    const expect = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        finish(`no answer for ${batch[index]?.ticker ?? "the socket"} within ${symbolTimeoutMs / 1000}s`);
      }, symbolTimeoutMs);
    };

    const ask = () => {
      if (done) return;
      if (index >= batch.length) {
        finish();
        return;
      }
      const record = batch[index];
      waiting = { record, seriesId: `series_${index}`, symbolId: `symbol_${index}` };
      expect();
      // `adjustment: "splits"` is the whole reason this series is trustworthy:
      // an unadjusted history turns a 10-for-1 split into a 90% crash and every
      // volume median downstream into fiction.
      const descriptor = `=${JSON.stringify({
        symbol: record.symbol,
        adjustment: "splits",
        session: "regular",
      })}`;
      socket.send(frame("resolve_symbol", [session, waiting.symbolId, descriptor]));
      socket.send(frame("create_series", [session, waiting.seriesId, waiting.seriesId, waiting.symbolId, "1D", settings.bars]));
    };

    // `remove` only for a series the server holds. Removing one it does not
    // is a `critical_error` that ends the whole session.
    const settle = (bars, remove) => {
      const { record, seriesId } = waiting;
      waiting = null;
      answers.set(record.symbol, bars);
      if (remove) socket.send(frame("remove_series", [session, seriesId]));
      index += 1;
      setTimeout(ask, gapMs);
    };

    expect();

    socket.addEventListener("open", () => {
      connected = true;
      socket.send(frame("set_auth_token", ["unauthorized_user_token"]));
      socket.send(frame("chart_create_session", [session, ""]));
      socket.send(frame("switch_timezone", [session, "Etc/UTC"]));
      ask();
    });

    socket.addEventListener("message", (event) => {
      const chunk = String(event.data);
      // Heartbeat frames are echoed back verbatim, before parsing. They are not
      // JSON and re-framing them gets the socket dropped.
      if (chunk.startsWith("~m~") && chunk.includes("~h~")) {
        socket.send(chunk);
      }
      for (const raw of parseMessages(chunk)) {
        let message;
        try {
          message = JSON.parse(raw);
        } catch {
          continue;
        }
        const params = Array.isArray(message.p) ? message.p : [];
        if (message.m === "critical_error" || message.m === "protocol_error") {
          finish(`${message.m}: ${JSON.stringify(params.slice(1)).slice(0, 200)}`);
          return;
        }
        // Everything below is about the symbol being waited on. What arrives
        // for an earlier one — the empty update that follows `remove_series`,
        // its `series_completed` — is not this symbol's answer.
        if (!waiting) continue;
        if (message.m === "timescale_update") {
          const update = params[1]?.[waiting.seriesId];
          if (Array.isArray(update?.s)) settle(barsOf(update.s), true);
        } else if (message.m === "series_completed" && params[1] === waiting.seriesId) {
          settle([], true);
        } else if (message.m === "symbol_error" && params[1] === waiting.symbolId) {
          // An answer: the chart does not know the symbol. Whether that is the
          // truth about the listing is `statusOf`'s question.
          warn({ symbols: [waiting.record.ticker], message: `symbol_error: ${JSON.stringify(params.slice(2))}` });
          settle([], false);
        } else if (message.m === "series_error" && params[1] === waiting.seriesId) {
          warn({ symbols: [waiting.record.ticker], message: `series_error: ${JSON.stringify(params.slice(2))}` });
          settle(null, false);
        }
      }
    });

    socket.addEventListener("error", (event) => {
      finish(event?.message || "socket error");
    });

    // Once the server has closed the connection no further data can arrive, so
    // settling here can only shorten a wait — it can never change a number. If
    // TradingView refuses this egress IP outright, every batch finds out at
    // once instead of sitting out its timeout.
    socket.addEventListener("close", () => {
      finish(index < batch.length ? "the server closed the socket" : undefined);
    });
  });
}

// Every listing's history, over as many passes as it takes and no more.
// Returns symbol → bars (see `fetchBatch`) and the warnings, each with its pass.
export async function fetchHistories(records, options) {
  const settings = { ...HISTORY_DEFAULTS, ...options };
  const answers = new Map();
  const warnings = [];
  // Asked again: never answered, answered with an error, or answered "no
  // sessions" for a listing the scanner says trades.
  const unsettled = (record) => {
    const bars = answers.get(record.symbol);
    return !Array.isArray(bars) || (!bars.length && traded(record));
  };
  let sessionNumber = 0;
  const started = Date.now();

  for (const [pass, size] of settings.passes.entries()) {
    const asking = records.filter(unsettled);
    if (!asking.length) break;
    if (pass > 0) {
      if (Date.now() - started > settings.deadlineMs) {
        warnings.push({ pass: pass + 1, symbols: asking.map((record) => record.ticker),
                        message: `not asked again: past the ${settings.deadlineMs / 60_000}-minute deadline` });
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, settings.pauseMs));
    }
    const batches = [];
    for (let at = 0; at < asking.length; at += size) batches.push(asking.slice(at, at + size));

    let reached = false;
    for (let at = 0; at < batches.length; at += settings.sockets) {
      const wave = await Promise.all(
        batches.slice(at, at + settings.sockets).map((batch) => {
          sessionNumber += 1;
          return fetchBatch(batch, {
            ...settings,
            session: `cs_daily_${sessionNumber}_${Math.random().toString(36).slice(2, 10)}`,
            warn: (warning) => warnings.push({ pass: pass + 1, ...warning }),
          });
        }),
      );
      for (const { answers: got, connected } of wave) {
        reached ||= connected;
        for (const [symbol, bars] of got) {
          const held = answers.get(symbol);
          // A later answer never replaces bars with fewer of them.
          if (!Array.isArray(held) || (Array.isArray(bars) && bars.length > held.length)) {
            answers.set(symbol, bars);
          }
        }
      }
    }
    // Not one socket of the pass connected: that is a refused connection, not
    // a bad batch, and asking again only spends the same minutes again. A
    // socket that connected and then heard nothing is different — the pass
    // after it may be the one that asks each symbol on its own.
    if (!reached) break;
  }
  return { answers, warnings };
}

// Chart snapshots can include a zero-volume placeholder for the capture day
// which disappears from the historical response the next morning. Keep the
// socket payload raw for diagnostics; normalize only completed trade history.
export function completedTradeBars(bars, runDate) {
  return bars.filter((bar) =>
    new Date(bar.timestamp * 1000).toISOString().slice(0, 10) < runDate && bar.volume !== 0);
}

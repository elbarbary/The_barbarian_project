// Fetch one day of EGX market data, for a machine that has nothing on it.
//
// This is a port of the research monitor's `daily_scan.mjs` — the script that
// has produced `../work/daily_scan_<date>.json` every morning — cut down to the
// part `scripts/build_market_api.py` actually reads, and stripped of every
// dependency on a local file. The research script opens five absolute paths on
// one particular laptop; a GitHub Actions runner is an empty checkout, so those
// paths are not "probably missing", they are certainly missing. Everything here
// comes from the network or from arithmetic on what the network returned.
//
// The two network calls, the batching, the frame format and every formula below
// are copied from the research script rather than rewritten. That script is the
// one whose output has been checked against the exchange for months; a cleaner
// reimplementation of it would be a new thing that has never been checked. Where
// this file deviates at all it says so in a comment and says why.
//
// WHAT WAS DELIBERATELY DROPPED, AND WHY
//
//   1. `work/egx.html` — a scraped Thndr quote page, the sole source of
//      `thndrScope` (is this name tradable on Thndr?) and `thndrDirectoryCount`.
//      There is no way to obtain it here, and the correct response to not
//      knowing is to omit the field, not to guess it. See the note on
//      `thndrScope` further down: omitting it is not free, and pretending
//      otherwise would be the exact failure this repository writes comments
//      about.
//
//   2. `work/fresh_official_filings_<date>.json` — feeds `sectorAlerts`,
//      `tapeCandidates` and `requiredReview`. `build_market_api.py` reads none
//      of the three.
//
//   3. The prior-scan archive. When the history socket refused a symbol, the
//      research script replayed that ticker's bars out of yesterday's scan file
//      and labelled them `historySource: "cached fallback: …"`. A runner has no
//      archive to replay, so this port will finish with more historyless
//      tickers than the laptop does — roughly 60 of 291 rather than 29. That
//      hole is filled from the other end, and better: `carry_forward()` in
//      `build_market_api.py` refills the six history-derived profile fields
//      from the last *published* company document and names what it carried in
//      a separate `profile_carried` key, instead of blending yesterday's
//      numbers into today's series where no reader could see them.
//
//   4. Everything the research script computes for the research script:
//      per-session abnormality scans, `preDisclosureVolumeTrail`, the pre-open
//      Scout tape readiness score, peer baskets, `closeLocation`, the
//      `perf1w/1m/3m` recomputations. None of it is read downstream, and each
//      one carried an interpretive claim that has no business being made by a
//      cron job.
//
// Only dependency is `ws`. That is not habit: Node's built-in WebSocket cannot
// set the `Origin` request header, and TradingView's data socket wants one.
//
// Usage:
//     node scripts/egx_scan.mjs                    # writes ../work
//     node scripts/egx_scan.mjs /some/other/dir
//     EGX_SCAN_OUT=/some/other/dir node scripts/egx_scan.mjs
//     EGX_RUN_DATE=2026-08-22 node scripts/egx_scan.mjs

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import WebSocket from "ws";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// `../work` relative to the repository is not a guess — it is literally where
// `build_market_api.py` looks (`WORK = REPO.parent / "work"`). The directory
// does not exist on a fresh runner, so it is created rather than assumed.
const outputDir = path.resolve(
  process.argv[2] ?? process.env.EGX_SCAN_OUT ?? path.join(repoRoot, "..", "work"),
);

const asOf = new Date();
const runDate = process.env.EGX_RUN_DATE ?? new Intl.DateTimeFormat("en-CA", {
  timeZone: "Africa/Cairo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(asOf);
const tradingViewDate = runDate.replaceAll("-", "_");

const columns = [
  "name",
  "description",
  "close",
  "open",
  "high",
  "low",
  "volume",
  "change",
  "Perf.W",
  "Perf.1M",
  "Perf.3M",
  "average_volume_30d_calc",
  "relative_volume_10d_calc",
  "market_cap_basic",
  "float_shares_outstanding",
  "total_shares_outstanding",
  "update_mode",
  "sector",
];

async function requestScannerPage(from, to) {
  const response = await fetch("https://scanner.tradingview.com/egypt/scan", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      filter: [{ left: "exchange", operation: "equal", right: "EGX" }],
      options: { lang: "en" },
      symbols: { query: { types: ["stock"] }, tickers: [] },
      columns,
      range: [from, to],
    }),
  });
  if (!response.ok) {
    throw new Error(`TradingView scanner failed: ${response.status}`);
  }
  return await response.json();
}

// The first request is byte-for-byte the one the research script has always
// sent, `range: [0, 500]` included. EGX lists 291 names, so one page has always
// been enough and the loop below has never run.
//
// It exists because "has always been enough" is a fact about today's exchange,
// not a property of the request. If EGX ever lists more than 500 names the
// unpaged version would quietly publish a partial market and nothing would look
// wrong. Rows are merged by `s` rather than concatenated because the query
// carries no `sort`, so the server is under no obligation to return rows in the
// same order twice — naive concatenation could duplicate some names and miss
// others. The loop is bounded and stops the moment a page adds nothing new, so
// an unstable ordering costs a few wasted requests instead of spinning forever.
const firstPage = await requestScannerPage(0, 500);
const scannerTotal = firstPage.totalCount;
const scannerRows = new Map();
for (const row of firstPage.data ?? []) scannerRows.set(row.s, row);

for (let attempt = 0; attempt < 5 && scannerRows.size < scannerTotal; attempt += 1) {
  const page = await requestScannerPage(scannerRows.size, scannerTotal);
  const before = scannerRows.size;
  for (const row of page.data ?? []) scannerRows.set(row.s, row);
  if (scannerRows.size === before) break;
}

// Refuse to write a file rather than write an empty one. `newest_scan()` picks
// the newest scan by filename and `build()` deletes and rewrites every company
// document from it, so an empty-but-present scan would publish an app with zero
// companies. No file at all is a state the consumer already handles gracefully:
// it prints "leaving published market data untouched" and returns 0. A stale
// price honestly labelled beats a blank exchange.
if (!scannerRows.size) {
  throw new Error("TradingView scanner returned no rows — refusing to write a scan file");
}

const records = [...scannerRows.values()].map((row) => {
  const values = Object.fromEntries(columns.map((column, index) => [column, row.d[index]]));
  // Nulls pass straight through. `clean()` downstream reads null and NaN alike
  // as "not reported" and simply omits the field, which is the honest rendering
  // — the app shows an em dash instead of a zero.
  return {
    symbol: row.s,
    ticker: values.name,
    company: values.description,
    // `thndrScope` is deliberately absent, not false. `build_market_api.py`
    // reads it as `bool(r.get("thndrScope"))`, so its absence is safe from a
    // crash but not from a claim: every company will publish as
    // `"tradable": false`, which reads as "we checked and you cannot trade
    // this" when the truth is "this runner had no Thndr directory to check
    // against". Writing `thndrScope: false` here would make that untruth ours
    // instead of the consumer's, and inventing a value would be worse still.
    // If the distinction matters to the app, the fix is for
    // `build_market_api.py` to omit `tradable` when the key is missing.
    close: values.close,
    open: values.open,
    high: values.high,
    low: values.low,
    volume: values.volume,
    change: values.change,
    scannerPerf1w: values["Perf.W"],
    scannerPerf1m: values["Perf.1M"],
    scannerPerf3m: values["Perf.3M"],
    scannerAverageVolume30d: values.average_volume_30d_calc,
    scannerRelativeVolume10d: values.relative_volume_10d_calc,
    marketCap: values.market_cap_basic,
    floatShares: values.float_shares_outstanding,
    sharesOutstanding: values.total_shares_outstanding,
    updateMode: values.update_mode,
    sector: values.sector,
  };
});

// TradingView's chart socket speaks a length-prefixed framing of its own:
// `~m~<byte length>~m~<json payload>`. `payload.length` is the JavaScript
// UTF-16 length, which is not in general a byte count — it is only correct here
// because every method name and every EGX symbol is ASCII. Left as-is on
// purpose; "fixing" it to a real byte count would change nothing today and is
// not a change worth making blind against a protocol nobody documents.
function frame(method, params) {
  const payload = JSON.stringify({ m: method, p: params });
  return `~m~${payload.length}~m~${payload}`;
}

// One TCP chunk routinely carries several frames, so the reader walks the
// length prefixes rather than assuming one message per event.
function parseMessages(chunk) {
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

const historyFetchWarnings = [];

// One socket per batch of five symbols, requesting them one at a time. The
// sequential-within-a-socket shape is the research script's and is kept: asking
// for five series at once got fewer answers back, not more.
async function fetchHistoryBatch(batch, batchNumber) {
  const chartSession = `cs_daily_${batchNumber}_${Math.random().toString(36).slice(2, 10)}`;
  const websocket = new WebSocket(
    `wss://data.tradingview.com/socket.io/websocket?from=screener%2F&date=${tradingViewDate}-00_00`,
    {
      headers: { Origin: "https://www.tradingview.com" },
    },
  );
  const histories = new Map();
  const expectedSeries = new Map();
  let currentIndex = 0;
  let settled = false;

  return await new Promise((resolve) => {
    // Ten seconds for the whole batch, not per symbol. Five symbols do not
    // always finish inside it, which is exactly why some tickers come back
    // empty and why the retry pass below exists. Kept at the proven value: a
    // longer timeout would raise coverage and lengthen every run, and that is a
    // judgement call for whoever owns the research pipeline, not a porting one.
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        websocket.close();
        resolve(histories);
      }
    }, 10_000);

    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      websocket.close();
      resolve(histories);
    };

    const requestNext = () => {
      if (currentIndex >= batch.length) {
        finish();
        return;
      }
      const record = batch[currentIndex];
      const symbolId = `symbol_${currentIndex}`;
      const seriesId = `series_${currentIndex}`;
      expectedSeries.set(seriesId, record.symbol);
      // `adjustment: "splits"` is the whole reason this series is trustworthy:
      // an unadjusted history turns a 10-for-1 split into a 90% crash and every
      // volume median downstream into fiction.
      const descriptor = `=${JSON.stringify({
        symbol: record.symbol,
        adjustment: "splits",
        session: "regular",
      })}`;
      websocket.send(frame("resolve_symbol", [chartSession, symbolId, descriptor]));
      websocket.send(
        frame("create_series", [
          chartSession,
          seriesId,
          seriesId,
          symbolId,
          "1D",
          120,
        ]),
      );
    };

    websocket.addEventListener("open", () => {
      websocket.send(frame("set_auth_token", ["unauthorized_user_token"]));
      websocket.send(frame("chart_create_session", [chartSession, ""]));
      websocket.send(frame("switch_timezone", [chartSession, "Etc/UTC"]));
      requestNext();
    });

    websocket.addEventListener("message", (event) => {
      const chunk = String(event.data);
      // Heartbeat frames are echoed back verbatim, before parsing. They are not
      // JSON and re-framing them gets the socket dropped.
      if (chunk.startsWith("~m~") && chunk.includes("~h~")) {
        websocket.send(chunk);
      }
      for (const raw of parseMessages(chunk)) {
        let message;
        try {
          message = JSON.parse(raw);
        } catch {
          continue;
        }
        if (message.m !== "timescale_update") continue;
        const updates = message.p?.[1] || {};
        for (const [seriesId, update] of Object.entries(updates)) {
          if (!expectedSeries.has(seriesId) || !Array.isArray(update?.s)) continue;
          const bars = update.s
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
          histories.set(expectedSeries.get(seriesId), bars);
          expectedSeries.delete(seriesId);
          websocket.send(frame("remove_series", [chartSession, seriesId]));
          currentIndex += 1;
          // A short gap before the next symbol. Firing them back to back got
          // series dropped silently.
          setTimeout(requestNext, 20);
        }
      }
    });

    websocket.addEventListener("error", (event) => {
      if (!settled) {
        historyFetchWarnings.push({
          batchNumber,
          symbols: batch.map((record) => record.ticker),
          message: event.message || "unknown",
        });
      }
      finish();
    });

    // The one addition to the research script's socket handling. Once the
    // server has closed the connection no further data can arrive, so settling
    // here can only shorten a wait — it can never change a number. It matters
    // on a runner in a way it does not on a laptop: if TradingView refuses this
    // egress IP outright, every one of the ~60 batches would otherwise sit out
    // its full ten-second timeout and the job would spend ten minutes
    // discovering it was blocked. This way it finds out immediately.
    websocket.addEventListener("close", () => {
      finish();
    });
  });
}

const histories = new Map();
const batchSize = 5;
const batches = [];
for (let index = 0; index < records.length; index += batchSize) {
  batches.push(records.slice(index, index + batchSize));
}
// Two sockets at a time. More was not faster — TradingView starts dropping
// series instead of serving them.
for (let index = 0; index < batches.length; index += 2) {
  const wave = await Promise.all(
    batches
      .slice(index, index + 2)
      .map((batch, offset) => fetchHistoryBatch(batch, index + offset)),
  );
  for (const batchHistories of wave) {
    for (const [symbol, bars] of batchHistories) histories.set(symbol, bars);
  }
}

// A series occasionally comes back empty even though the symbol is perfectly
// valid. Retry only those. A retry result is accepted only when it has at least
// two bars, so a second empty answer cannot overwrite a good first one.
for (let attempt = 1; attempt <= 2; attempt += 1) {
  const missing = records.filter(
    (record) => (histories.get(record.symbol) || []).length < 2,
  );
  if (!missing.length) break;
  const retryBatches = [];
  for (let index = 0; index < missing.length; index += batchSize) {
    retryBatches.push(missing.slice(index, index + batchSize));
  }
  for (let index = 0; index < retryBatches.length; index += 2) {
    const retryWave = await Promise.all(
      retryBatches
        .slice(index, index + 2)
        .map((batch, offset) =>
          fetchHistoryBatch(
            batch,
            batches.length + attempt * 100 + index + offset,
          ),
        ),
    );
    for (const batchHistories of retryWave) {
      for (const [symbol, bars] of batchHistories) {
        if (bars.length >= 2) histories.set(symbol, bars);
      }
    }
  }
}

// This is where the research script consulted its archive of previous scans for
// anything still missing. There is no archive here. Whatever the socket did not
// return stays missing, the ticker keeps all nineteen of its scanner fields and
// loses only the six derived from history, and `carry_forward()` downstream
// refills those from the last published profile under a name that says it did.
// Degrading a single ticker is fine; dropping its record would not be, because
// the scanner's close and volume for it are real and fresh.

function median(values) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function percentage(current, prior) {
  if (!Number.isFinite(current) || !Number.isFinite(prior) || prior === 0) return null;
  return (current / prior - 1) * 100;
}

// Bars are stamped in unix seconds and this slices the UTC calendar date off
// them. That is safe here and only here: EGX opens at 10:00 Cairo, so a daily
// bar lands at 07:00Z in summer and 08:00Z in winter — the middle of the UTC
// day either way, nowhere near a midnight that a timezone offset could push it
// across. Point this helper at an exchange that opens near 00:00 UTC and it
// will silently file bars under the wrong day.
function barDate(bar) {
  return new Date(bar.timestamp * 1000).toISOString().slice(0, 10);
}

for (const record of records) {
  const allBars = histories.get(record.symbol) || [];
  // The whole point of this split. A bar stamped with today's date is a session
  // still in progress: its volume is a few hours of trading, not a day's. Let
  // it into the twenty-day median and every "traded 3.4x its normal volume"
  // figure the app shows becomes a comparison between a partial day and twenty
  // whole ones. So every derived field below reads `completedBars`, and today's
  // bar is kept to one side, labelled, in `currentSessionBar`.
  const completedBars = allBars.filter((bar) => barDate(bar) < runDate);
  const currentSessionBar = allBars.find((bar) => barDate(bar) === runDate) || null;
  record.historyBars = allBars.length;
  record.completedHistoryBars = completedBars.length;
  // Constant, unlike the research script, which used this field to distinguish
  // live bars from ones replayed out of an older scan. Here there is only one
  // source, so the label states it plainly rather than being dropped.
  record.historySource = "live TradingView split-adjusted history";
  record.currentSessionBar = currentSessionBar
    ? { date: barDate(currentSessionBar), ...currentSessionBar }
    : null;
  record.recentSplitAdjustedBars = completedBars.slice(-120).map((bar) => ({
    date: barDate(bar),
    open: bar.open,
    high: bar.high,
    low: bar.low,
    close: bar.close,
    volume: bar.volume,
  }));
  // Below this line nothing is emitted at all when there is not enough history
  // to compute it honestly. Absent, not null and not zero: `build_market_api.py`
  // omits absent fields and the app renders an em dash, whereas a zero would be
  // read as a measurement.
  if (completedBars.length < 2) continue;
  const latest = completedBars.at(-1);
  // Both windows exclude `latest` itself — `slice(-21, -1)`, not `slice(-20)`.
  // The session being measured must not be part of the baseline it is measured
  // against, or a genuinely huge day drags up its own "normal" and reports
  // itself as less unusual than it was.
  const prior20 = completedBars.slice(-21, -1);
  const prior30 = completedBars.slice(-31, -1);
  const median20Volume = median(prior20.map((bar) => bar.volume));
  // Which session these figures describe. One string, and without it a reader
  // has no way to tell whether `rv20` is about Thursday or about three weeks
  // ago on a name that has not traded since.
  record.latestCompletedBarDate = barDate(latest);
  record.median20Volume = median20Volume;
  // A falsy check rather than a null check, so a zero median — a name that did
  // not trade at all for twenty sessions — yields null instead of Infinity.
  record.rv20 = median20Volume ? latest.volume / median20Volume : null;
  // Median traded value in pounds, which is what tells you whether a position
  // can actually be got out of. Volume alone does not: a million shares of a
  // 40-piastre stock is not liquidity.
  record.normal30dValue = median(
    prior30.map((bar) => bar.close * bar.volume).filter(Number.isFinite),
  );
  record.fiveSessionChange =
    completedBars.length >= 6
      ? percentage(latest.close, completedBars.at(-6).close)
      : null;
  // A ratio (0.3), not a percentage. `Number.isFinite(null)` is false, so a
  // company whose float the scanner does not report gets null here rather than
  // a fabricated one — about a third of the exchange.
  record.freeFloat =
    Number.isFinite(record.floatShares) &&
    Number.isFinite(record.sharesOutstanding) &&
    record.sharesOutstanding > 0
      ? record.floatShares / record.sharesOutstanding
      : null;
}

const unresolvedHistoryTickers = records
  .filter((record) => (histories.get(record.symbol) || []).length < 2)
  .map((record) => record.ticker);

const output = {
  // The real capture instant, which stays wall-clock even when EGX_RUN_DATE
  // moves `runDate`. `build_market_api.py` feeds this to `is_after_close()` to
  // decide whether the app says "Last close" or shows a session in progress, so
  // a doctored `asOf` would make the app assert a close that never happened.
  asOf: asOf.toISOString(),
  runDate,
  scannerTotal,
  // What was actually merged. Equal to `scannerTotal` on every run so far; if
  // it ever is not, the exchange came back short and the number says so instead
  // of the shortfall hiding inside a plausible-looking file.
  scannerReturned: records.length,
  historiesFetched: histories.size,
  historyFetchWarnings,
  unresolvedHistoryTickers,
  completedSessionRule:
    "All RV20, close-strength and return fields use bars strictly before runDate; any runDate bar is preserved separately as provisional currentSessionBar.",
  // Absent by design, both of them: `thndrDirectoryCount` and `matchedThndrCount`
  // (no Thndr directory on a runner), `historyFallbacks` (no scan archive to
  // fall back to), and the filings, sector alerts, scout candidates and tape
  // candidates the consumer never reads.
  records,
};

await fs.mkdir(outputDir, { recursive: true });
const outputPath = path.join(outputDir, `daily_scan_${runDate}.json`);
await fs.writeFile(outputPath, JSON.stringify(output, null, 2));

const withHistory = records.filter((record) => record.completedHistoryBars >= 2).length;
console.log(`wrote    ${outputPath}`);
console.log(`asOf     ${output.asOf}  (runDate ${runDate})`);
console.log(`listed   ${output.scannerReturned} of ${scannerTotal} scanner rows`);
console.log(`history  ${withHistory} companies with usable history, ${unresolvedHistoryTickers.length} without`);
if (historyFetchWarnings.length) {
  console.log(`warnings ${historyFetchWarnings.length} socket errors during history fetch`);
}
if (output.scannerReturned < scannerTotal) {
  console.log(`warning  scanner reported ${scannerTotal} listings but only ${output.scannerReturned} were returned`);
}
if (!withHistory) {
  // Not a reason to refuse the write: the scanner's closes and volumes are real
  // and fresh, and `carry_forward()` will refill the history-derived fields from
  // the last published profiles. But a whole exchange with no history at all is
  // a blocked socket rather than a bad day, and the log should say so out loud.
  console.log("warning  no history was fetched for any company — the data socket was probably unreachable");
}

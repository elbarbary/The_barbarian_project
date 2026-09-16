// Fetch one day of EGX market data, for a machine that has nothing on it.
//
// This is a port of the research monitor's `daily_scan.mjs` — the script that
// has produced `../work/daily_scan_<date>.json` every morning — cut down to the
// part `scripts/build_market_api.py` actually reads, and stripped of every
// dependency on a file outside this repository. The research script opens five
// absolute paths on one particular laptop; a GitHub Actions runner is an empty
// checkout, so those paths are not "probably missing", they are certainly
// missing. Everything here comes from the network or from arithmetic on what
// the network returned. The two files read are in this checkout: the published
// directory and the exchange's harvested market watch, to know which companies
// to ask for by name and which code the exchange gives a row the scanner names
// by an ISIN.
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
//      archive to replay. It turned out not to need one: the "refused" symbols
//      were almost all lost behind listings that have never traded, which
//      stalled their batch (see `egx_history.mjs`). What is left without
//      history now is those listings — about thirty — and anything the socket
//      really did not answer is named in `missingHistoryTickers` rather than
//      passed off as a company with no past. `carry_forward()` in
//      `build_market_api.py` still refills the six history-derived profile
//      fields from the last *published* company document and names what it
//      carried in a separate `profile_carried` key.
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
// The socket handling itself lives beside this file in `egx_history.mjs`,
// which imports nothing, so it can be tested against a fake server.
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
import { fetchHistories, statusOf, completedTradeBars } from "./egx_history.mjs";
import { completeListing, exchangeNames, nameByExchange } from "./egx_listing.mjs";

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

// The listing is not the market. It drops listed companies and brings them back
// hours later, and one it dropped on 10 September was still missing on the 16th
// while trading millions of shares a day (see `egx_listing.mjs`). So two lists
// of companies are asked for by name wherever the listing left one out, or
// listed it with no close:
//
//   * the published directory, so a company the app lists is not deleted
//     because the listing had a bad hour;
//   * the securities the exchange's own market watch reported trading
//     (`data-source/egx-beta/session.json`, harvested by the daily build), so a
//     company already lost that way comes back. EHDR is one: deleted on 10
//     September, and asked for by name it answers. A code the vendor spells
//     differently (AIHC is its AIH) gets no answer, which costs nothing: only
//     the directory's companies are acted on by absence.
//
// A code the vendor files under an ISIN (NAPR is its EGS370O1C013) is asked
// for under every spelling, and the rows the listing names by an ISIN are
// named by the code the exchange pairs with it (`session.json` `isins`, see
// `egx_listing.mjs`).
//
// Both are read from this checkout, which is not one of the laptop paths this
// port dropped: they are part of the repository every machine that runs the
// scan has checked out. Without them nothing is asked, and the scan says so.
async function readJson(file) {
  try {
    return JSON.parse(await fs.readFile(path.join(repoRoot, file), "utf8"));
  } catch {
    return null;
  }
}

function tickersOf(list) {
  const tickers = list.filter((ticker) => typeof ticker === "string" && /^[A-Z]{3,6}$/.test(ticker));
  return tickers.length ? tickers : null;
}

async function requestByName(symbols) {
  const response = await fetch("https://scanner.tradingview.com/egypt/scan", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ options: { lang: "en" }, symbols: { tickers: symbols }, columns }),
  });
  if (!response.ok) {
    throw new Error(`TradingView scanner failed: ${response.status}`);
  }
  return await response.json();
}

// What the listing itself sent, before anything was asked for by name. The
// short-scan guard compares this with `scannerTotal`, which is a question about
// the listing's own pages.
const listingRows = scannerRows.size;
const directory = await readJson(path.join("public", "data", "v1", "companies.json"));
const session = await readJson(path.join("data-source", "egx-beta", "session.json"));
const directoryTickers = tickersOf((directory?.companies ?? []).map((company) => company?.ticker));
const exchangeTickers = tickersOf(Object.keys(session?.securities ?? {}));
const names = exchangeNames(session?.isins);
const listing = await completeListing(
  scannerRows,
  directoryTickers || exchangeTickers
    ? [...new Set([...(directoryTickers ?? []), ...(exchangeTickers ?? [])])]
    : null,
  requestByName,
  { closeAt: columns.indexOf("close"), isinOf: names?.isinOf },
);
const named = nameByExchange(listing.rows, names?.codeOf,
  { closeAt: columns.indexOf("close"), nameAt: columns.indexOf("name") });

const records = named.rows.map(({ row, ticker }) => {
  const values = Object.fromEntries(columns.map((column, index) => [column, row.d[index]]));
  // Nulls pass straight through. `clean()` downstream reads null and NaN alike
  // as "not reported" and simply omits the field, which is the honest rendering
  // — the app shows an em dash instead of a zero.
  return {
    // The scanner's symbol, always: it is what the chart socket answers to,
    // including for a row published under the exchange's code.
    symbol: row.s,
    ticker,
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

// Every listing's split-adjusted daily history, in passes, over the chart
// socket. `egx_history.mjs` says how a series is read and why ~50 companies
// used to come back without one.
const { answers: histories, warnings: historyFetchWarnings } = await fetchHistories(records, {
  WebSocket,
  url: `wss://data.tradingview.com/socket.io/websocket?from=screener%2F&date=${tradingViewDate}-00_00`,
  origin: "https://www.tradingview.com",
});

// This is where the research script consulted its archive of previous scans for
// anything still missing. There is no archive here. Whatever the socket did not
// return stays missing and says so in `historyStatus`; the ticker keeps all
// nineteen of its scanner fields and loses only the six derived from history,
// and `carry_forward()` downstream refills those from the last published profile
// under a name that says it did. Degrading a single ticker is fine; dropping its
// record would not be, because the scanner's close and volume for it are real
// and fresh.

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
  // A zero-volume chart placeholder is not a traded session. Some chart
  // responses include these only overnight; do not let fetch time choose
  // the return/volume window. Preserve unknown volume as unknown.
  const completedBars = completedTradeBars(allBars, runDate);
  const currentSessionBar = allBars.find((bar) => barDate(bar) === runDate) || null;
  record.historyBars = allBars.length;
  record.completedHistoryBars = completedBars.length;
  // `fetched`, `none` (a listing with no sessions, and the scanner agrees) or
  // `missing` (history that exists and this scan does not carry). An empty
  // `recentSplitAdjustedBars` alone cannot tell the last two apart, and the
  // lab publishes a smaller market when it takes one for the other.
  record.historyStatus = statusOf(record, histories);
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
const missingHistoryTickers = records
  .filter((record) => record.historyStatus === "missing")
  .map((record) => record.ticker);

const output = {
  // The real capture instant, which stays wall-clock even when EGX_RUN_DATE
  // moves `runDate`. `build_market_api.py` feeds this to `is_after_close()` to
  // decide whether the app says "Last close" or shows a session in progress, so
  // a doctored `asOf` would make the app assert a close that never happened.
  asOf: asOf.toISOString(),
  runDate,
  scannerTotal,
  // What was actually merged from the listing's pages. Equal to `scannerTotal`
  // on every run so far; if it ever is not, the exchange came back short and
  // the number says so instead of the shortfall hiding inside a
  // plausible-looking file. Companies asked for by name are not in it.
  scannerReturned: listingRows,
  // The companies the listing left out or listed with no close, out of the
  // published directory and the exchange's market watch, and what asking for
  // each by name got (see `egx_listing.mjs`). `unknownToScanner` is the scanner
  // saying it has no such symbol; `unaskedByName` is a request that failed,
  // which says nothing. Each count is null when that list was not in the
  // checkout, and with neither nothing was asked.
  directoryTickers: directoryTickers ? directoryTickers.length : null,
  exchangeTickers: exchangeTickers ? exchangeTickers.length : null,
  askedByName: listing.asked,
  recoveredByName: listing.recovered,
  unpricedByName: listing.unpriced,
  unknownToScanner: listing.unknown,
  unaskedByName: listing.unasked,
  // Rows the scanner names by an ISIN. `namedByExchange` maps each one the
  // exchange's market watch pairs with a code to that code, which is its
  // record's `ticker`; `unnamedIsins` are the rest, left as they came, which
  // the market build skips. `duplicateRows` were set aside because another
  // row stands for the same code. `isinCodes` is how many pairings were read,
  // null when `session.json` carried none.
  isinCodes: names ? names.codeOf.size : null,
  namedByExchange: named.named,
  unnamedIsins: named.unnamed,
  duplicateRows: named.duplicates,
  // Listings the socket answered for: with sessions, or honestly without.
  historiesFetched: records.length - missingHistoryTickers.length,
  historyFetchWarnings,
  // Fewer than two bars, for whatever reason — `build_market_api.py`'s view.
  unresolvedHistoryTickers,
  // History this scan should carry and does not. Empty on a complete scan; the
  // lab refuses to rebuild its record from a scan where it is not
  // (`scripts/lab/panel.py`, `missing`).
  missingHistoryTickers,
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
{
  const published = new Set(directoryTickers ?? []);
  const named = (label, tickers) => (tickers.length ? `, ${tickers.length} ${label} (${tickers.join(", ")})` : "");
  const report = (who, tickers) => {
    const asked = listing.asked.filter((ticker) => tickers.has(ticker));
    const within = (list) => list.filter((ticker) => tickers.has(ticker));
    console.log(
      `by name  ${who}: ${asked.length} not priced by the listing` +
      named("recovered", within(listing.recovered)) +
      named("answered with no close", within(listing.unpriced)) +
      named("unknown to the scanner", within(listing.unknown)) +
      named("NOT ASKED, the request failed", within(listing.unasked)),
    );
  };
  if (directoryTickers === null) {
    console.log("by name  no published directory in this checkout, so no published company was asked for");
  } else {
    report(`${directoryTickers.length} published companies`, published);
  }
  if (exchangeTickers === null) {
    console.log("by name  no exchange market watch in this checkout");
  } else {
    const others = new Set(exchangeTickers.filter((ticker) => !published.has(ticker)));
    report(`${others.size} exchange-traded codes the directory does not have`, others);
  }
}
{
  const pairs = Object.entries(named.named).map(([symbol, code]) => `${code} ${symbol}`);
  const described = named.unnamed.map((symbol) => {
    const row = listing.rows.get(symbol);
    return `${symbol} ${row?.d?.[columns.indexOf("description")] ?? ""}`.trim();
  });
  console.log(
    names === null
      ? "isin     no pairing of ISIN and code in session.json, so no ISIN-named row was named"
      : `isin     ${pairs.length} ISIN-named rows published under the exchange's code` +
        (pairs.length ? ` (${pairs.join(", ")})` : "") +
        `, ${described.length} the exchange's market watch does not name` +
        (described.length ? ` (${described.join("; ")})` : ""),
  );
  if (named.duplicates.length) {
    console.log(`         ${named.duplicates.length} set aside, another row stands for the same code: ` +
      named.duplicates.join(", "));
  }
}
console.log(`history  ${withHistory} companies with usable history, ${unresolvedHistoryTickers.length} without`);
const withoutSessions = records.filter((record) => record.historyStatus === "none").length;
console.log(
  `         ${withoutSessions} listings with no sessions to fetch, ` +
  `${unresolvedHistoryTickers.length - withoutSessions - missingHistoryTickers.length} with too few, ` +
  `${missingHistoryTickers.length} missing`,
);
if (historyFetchWarnings.length) {
  console.log(`warnings ${historyFetchWarnings.length} socket warnings during history fetch`);
}
if (missingHistoryTickers.length) {
  // The number the lab refuses on. Said here too, so the step that fetched the
  // scan is where somebody reading the log first sees it.
  console.log(
    `warning  ${missingHistoryTickers.length} listings whose history exists are missing from this scan: ` +
    missingHistoryTickers.join(", "),
  );
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

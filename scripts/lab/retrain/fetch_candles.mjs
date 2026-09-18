// Deep daily candles for every listed EGX company, for the Kronos retraining
// pilot (docs/kronos-retraining-plan.md, stage 1).
//
// The companies are the ones a fresh `egx_scan.mjs` scan names, minus ISIN
// stand-ins (`run.listed`) and listings with no sessions. The candles come over
// the same chart socket the lab reads, split-adjusted, asking for 6,000 a
// company instead of the scan's 120 (`egx_history.HISTORY_DEFAULTS.bars`).
// Today's unfinished session is never kept. The pilot's own fetch on
// 17 September ran this code with `ws` resolved from a scratch install; the
// module it used is recorded in the manifest by SHA-256.
//
//   npm install ws --no-save
//   node fetch_candles.mjs <scan.json> <out-dir>
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import WebSocket from "ws";
import { fetchHistories, completedTradeBars } from "../../egx_history.mjs";

const [scanPath, outDir] = process.argv.slice(2);
const BARS = 6000;
const ISIN = /^[A-Z]{2}[A-Z0-9]{9}[0-9](-[A-Z]{3})?$/;

const scan = JSON.parse(await fs.readFile(scanPath, "utf8"));
const records = (scan.records || []).filter((r) => r.ticker && !ISIN.test(r.ticker) && r.symbol && r.historyStatus !== "none");
const now = new Date();
const runDate = now.toISOString().slice(0, 10);
const tvDate = runDate.replaceAll("-", "_");
const started = Date.now();
const { answers, warnings } = await fetchHistories(records, {
  WebSocket,
  url: `wss://data.tradingview.com/socket.io/websocket?from=screener%2F&date=${tvDate}-00_00`,
  origin: "https://www.tradingview.com",
  bars: BARS,
  symbolTimeoutMs: 30_000,
});

await fs.mkdir(path.join(outDir, "candles"), { recursive: true });
const companies = {};
for (const record of records) {
  const raw = answers.get(record.symbol);
  const bars = completedTradeBars(Array.isArray(raw) ? raw : [], runDate).map((bar) => ({
    date: new Date(bar.timestamp * 1000).toISOString().slice(0, 10),
    open: bar.open, high: bar.high, low: bar.low, close: bar.close, volume: bar.volume,
  }));
  if (!bars.length) {
    companies[record.ticker] = { symbol: record.symbol, candles: 0 };
    continue;
  }
  const body = JSON.stringify({ ticker: record.ticker, symbol: record.symbol, runDate, bars });
  await fs.writeFile(path.join(outDir, "candles", `${record.ticker}.json`), body);
  companies[record.ticker] = {
    symbol: record.symbol, candles: bars.length, first: bars[0].date, last: bars.at(-1).date,
    sha256: crypto.createHash("sha256").update(body).digest("hex"),
  };
}
const source = await fs.readFile(new URL("../../egx_history.mjs", import.meta.url));
await fs.writeFile(path.join(outDir, "fetch.json"), JSON.stringify({
  fetchedAt: now.toISOString(), runDate, scan: path.basename(scanPath), scanAsOf: scan.asOf,
  barsAsked: BARS, seconds: Math.round((Date.now() - started) / 1000),
  fetcherSha256: crypto.createHash("sha256").update(source).digest("hex"),
  asked: records.length, withCandles: Object.values(companies).filter((c) => c.candles).length,
  warnings, companies,
}, null, 1));
const counts = Object.values(companies).map((c) => c.candles).sort((a, b) => a - b);
console.log(`${records.length} asked in ${Math.round((Date.now() - started) / 1000)}s: ${counts.filter(Boolean).length} with candles; `
  + `median ${counts[counts.length >> 1]}, max ${counts.at(-1)}, total ${counts.reduce((s, n) => s + n, 0)}; ${warnings.length} warnings`);

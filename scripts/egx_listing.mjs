// The scanner's market listing, checked against the companies already published.
//
// Split out of `egx_scan.mjs` so it can be tested without the network. It
// imports nothing: the caller hands in the function that asks the scanner.
//
// THE LISTING LEAVES LISTED COMPANIES OUT (16 September 2026)
//
// `scanner.tradingview.com/egypt/scan` answers two kinds of request, and they
// do not agree. Asked for the market (a filter and a range) it lists the
// exchange, and `totalCount` is the size of that list. Asked for symbols by
// name (`symbols.tickers`) it answers for each one it carries.
//
// The list is not stable. On 16 September it held 296 names at 07:01 UTC, 295
// at 08:01 and 09:01, 293 at 10:01, 11:01 and 11:31, and 296 again from 11:59.
// The two it dropped at 10:01 were NBCC and POCO. Neither was suspended: NBCC
// is a temporary listing that has not traded yet, and POCO has not traded since
// 2023. The rows were not sent without a close; they were not sent at all.
// `scannerTotal` fell with them, so the short-scan guard in
// `build_market_api.py`, which compares the rows merged against that total,
// saw a complete scan. `market.json` published 282 quotes beside a
// 284-company directory, and the daily build at 11:57 deleted both company
// documents.
//
// It is not only dormant listings. EHDR traded more than 8 million shares on
// 16 September and is in no capture published since 21:41 UTC on 10
// September, the build that deleted its documents. Asked for by name at 12:30
// UTC on 16 September, the scanner answered with that session: a close of
// 2.73, down 2.15%, the figures the exchange's own market watch published.
//
// Asked for a symbol it no longer carries, the scanner sends no row: MKIT
// (mandatory delisting, EGX NewsID 292918, 12 August 2026), HAVC (renamed on
// 26 August), ACRO, DIFC, ESRS and GOCO. All fourteen final delistings the
// directory keeps with an over-the-counter note (NCGC and the rest of
// `listing_status.py`'s list) are still answered. So "not answered by name" is
// the scanner saying the symbol is gone, which the list's silence never was.
//
// WHAT THIS DOES
//
// Every published company the listing left out, or listed without a close, is
// asked for by name. Each lands in exactly one of four places:
//
//   recovered  answered with a close; the answer takes the row's place
//   unpriced   answered, but with no close
//   unknown    asked, and the scanner has no such symbol
//   unasked    the request failed, so there is no answer either way
//
// `unknown` and `unasked` must never be confused. A failed request is not a
// verdict, and the market build deletes nothing on the strength of one.
//
// Nor is an empty answer. A scanner having a bad minute could send
// `{"data": []}` for the whole request, and taking that at its word would
// delete every company in it, which is the 282-to-249 drop again under
// another name. So every request also asks for one published company the
// listing DID price (the control), and silence only counts when the same
// answer carries the control. Without it the request counts as failed. With
// no control to ask for, nothing is ever `unknown`.

export const LISTING_DEFAULTS = {
  // Symbols per request. The largest miss on record is two, and fifty keeps a
  // listing that comes back two thirds short to a handful of requests.
  chunk: 50,
  // Tries per request before its symbols are recorded as unasked.
  attempts: 3,
  pauseMs: 1_000,
};

export const symbolOf = (ticker) => `EGX:${ticker}`;

export async function completeListing(rows, tickers, ask, options = {}) {
  const { chunk, attempts, pauseMs, closeAt, sleep } = {
    ...LISTING_DEFAULTS,
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    ...options,
  };
  if (!Number.isInteger(closeAt)) throw new Error("completeListing needs closeAt");
  const priced = (row) => Number.isFinite(row?.d?.[closeAt]);
  const merged = new Map(rows);
  const result = { rows: merged, asked: [], recovered: [], unpriced: [], unknown: [], unasked: [] };
  if (!Array.isArray(tickers)) return result;

  const published = [...new Set(tickers)]
    .filter((ticker) => typeof ticker === "string" && ticker)
    .sort();
  result.asked = published.filter((ticker) => !priced(merged.get(symbolOf(ticker))));
  const control = published.find((ticker) => priced(merged.get(symbolOf(ticker))));

  for (let start = 0; start < result.asked.length; start += chunk) {
    const batch = result.asked.slice(start, start + chunk);
    const symbols = batch.map(symbolOf);
    if (control) symbols.push(symbolOf(control));
    let answered = null;
    for (let attempt = 1; attempt <= attempts && !answered; attempt += 1) {
      try {
        const body = await ask(symbols);
        if (!Array.isArray(body?.data)) throw new Error("no data in the answer");
        const rows = new Map(body.data.filter((row) => row && typeof row.s === "string")
          .map((row) => [row.s, row]));
        if (control && !rows.has(symbolOf(control))) {
          throw new Error(`the answer left out ${control}, which the listing priced`);
        }
        answered = rows;
      } catch {
        if (attempt < attempts) await sleep(pauseMs);
      }
    }
    if (!answered) {
      result.unasked.push(...batch);
      continue;
    }
    for (const ticker of batch) {
      const row = answered.get(symbolOf(ticker));
      if (!row) {
        (control ? result.unknown : result.unasked).push(ticker);
      } else if (priced(row)) {
        merged.set(row.s, row);
        result.recovered.push(ticker);
      } else {
        if (!merged.has(row.s)) merged.set(row.s, row);
        result.unpriced.push(ticker);
      }
    }
  }
  return result;
}

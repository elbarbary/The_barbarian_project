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
//
// LISTINGS THE SCANNER FILES UNDER AN ISIN (16 September 2026)
//
// Eleven rows in the listing carry an ISIN where the ticker goes:
// `EGX:EGS370O1C013` "National Printing", `EGX:EGS385S1C012` "Ferchem Misr".
// The market build keeps only records named like a ticker, so both companies,
// which trade on the exchange's main market (NAPR 1,882,239 shares at 42.10
// that day, FERC 54,726 at 77.53), had never been published. Asked for by
// name, `EGX:NAPR` gets no row; only the ISIN does.
//
// The exchange's own market watch names both: each of its rows carries the
// ISIN beside the Reuters code (`harvest_egx_session.py` keeps the pairing in
// `session.json`, under `isins`). So a row whose name is an ISIN that the
// exchange pairs with a code is published under that code, and keeps its own
// symbol, which is the one the chart socket knows it by. Nothing else names
// a row: the other nine ISINs are not in the market watch. Three of them are
// companies the exchange delisted (MKIT, Acrow Misr, International Dry Ice),
// and the filings pairing their ISINs with the old tickers is no reason to
// start publishing one; the rest have no notice and no code at all.
//
// And a company already published under such a code is asked for by every
// spelling the scanner might file it under, because it answers only an exact
// one: `EGX:EGS30AJ1C016` gets no row where `EGX:EGS30AJ1C016-EGP` does.
// `-EGP` is the only suffix any of the eleven carries.

export const LISTING_DEFAULTS = {
  // Symbols per request. The largest miss on record is two, and fifty keeps a
  // listing that comes back two thirds short to a handful of requests.
  chunk: 50,
  // Tries per request before its symbols are recorded as unasked.
  attempts: 3,
  pauseMs: 1_000,
};

export const symbolOf = (ticker) => `EGX:${ticker}`;

// A name that is an ISIN, bare or with the suffix: "EGS370O1C013",
// "EGS30AJ1C016-EGP". The first group is the ISIN.
export const ISIN_NAME = /^(EG[A-Z0-9]{10})(?:-[A-Z]{3})?$/;
const ISIN = /^EG[A-Z0-9]{10}$/;
const TICKER = /^[A-Z]{3,6}$/;

// The exchange's pairing of ISIN and code, as `session.json` carries it
// (`{"EGS370O1C013": {"code": "NAPR", "stated": …}}`), both ways round. A code
// two ISINs claim names neither: the harvest never writes one, and a guess
// between them would publish one company's price under another's name. Null
// when there is no pairing to read.
export function exchangeNames(isins) {
  if (!isins || typeof isins !== "object" || Array.isArray(isins)) return null;
  const claims = new Map();
  for (const [isin, entry] of Object.entries(isins)) {
    const code = entry?.code;
    if (!ISIN.test(isin) || typeof code !== "string" || !TICKER.test(code)) continue;
    claims.set(code, [...(claims.get(code) ?? []), isin]);
  }
  const codeOf = new Map();
  const isinOf = new Map();
  for (const [code, held] of claims) {
    if (held.length !== 1) continue;
    codeOf.set(held[0], code);
    isinOf.set(code, held[0]);
  }
  return codeOf.size ? { codeOf, isinOf } : null;
}

// Every spelling to ask the scanner for a company by: its code and, where the
// exchange pairs the code with an ISIN, that ISIN bare and suffixed.
export function symbolsOf(ticker, isinOf) {
  const isin = isinOf?.get(ticker);
  return isin ? [symbolOf(ticker), symbolOf(isin), symbolOf(`${isin}-EGP`)] : [symbolOf(ticker)];
}

export async function completeListing(rows, tickers, ask, options = {}) {
  const { chunk, attempts, pauseMs, closeAt, sleep, isinOf } = {
    ...LISTING_DEFAULTS,
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    ...options,
  };
  if (!Number.isInteger(closeAt)) throw new Error("completeListing needs closeAt");
  const priced = (row) => Number.isFinite(row?.d?.[closeAt]);
  const merged = new Map(rows);
  const result = { rows: merged, asked: [], recovered: [], unpriced: [], unknown: [], unasked: [] };
  if (!Array.isArray(tickers)) return result;

  const spellings = (ticker) => symbolsOf(ticker, isinOf);
  const pricedAs = (ticker) => spellings(ticker).find((symbol) => priced(merged.get(symbol)));
  const published = [...new Set(tickers)]
    .filter((ticker) => typeof ticker === "string" && ticker)
    .sort();
  result.asked = published.filter((ticker) => !pricedAs(ticker));
  // The control is a symbol the listing priced, spelled the way it priced it.
  const control = published.map(pricedAs).find(Boolean);

  for (let start = 0; start < result.asked.length; start += chunk) {
    const batch = result.asked.slice(start, start + chunk);
    const symbols = batch.flatMap(spellings);
    if (control) symbols.push(control);
    let answered = null;
    for (let attempt = 1; attempt <= attempts && !answered; attempt += 1) {
      try {
        const body = await ask(symbols);
        if (!Array.isArray(body?.data)) throw new Error("no data in the answer");
        const rows = new Map(body.data.filter((row) => row && typeof row.s === "string")
          .map((row) => [row.s, row]));
        if (control && !rows.has(control)) {
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
      const rows = spellings(ticker).map((symbol) => answered.get(symbol)).filter(Boolean);
      const row = rows.find(priced);
      if (!rows.length) {
        (control ? result.unknown : result.unasked).push(ticker);
      } else if (row) {
        merged.set(row.s, row);
        result.recovered.push(ticker);
      } else {
        for (const blank of rows) if (!merged.has(blank.s)) merged.set(blank.s, blank);
        result.unpriced.push(ticker);
      }
    }
  }
  return result;
}

// Which company each row is, by the exchange's own names.
//
// A row whose name is an ISIN the exchange pairs with a code is that code's
// row; every other row is named as the scanner named it. One row per code: if
// the scanner also sends the code under its own name, the priced one of the
// two stands, the code's own row when both are, and the other is set aside
// rather than published twice. An ISIN the exchange does not pair is left
// exactly as it came, and named in `unnamed`.
//
// Returns `{ rows, named, unnamed, duplicates }`: `rows` is `[{ row, ticker }]`
// in listing order, `named` maps a row's symbol to the code it was given, and
// `unnamed` and `duplicates` are symbols.
export function nameByExchange(rows, codeOf, { closeAt, nameAt }) {
  if (!Number.isInteger(closeAt) || !Number.isInteger(nameAt)) {
    throw new Error("nameByExchange needs closeAt and nameAt");
  }
  const priced = (row) => Number.isFinite(row?.d?.[closeAt]);
  const result = { rows: [], named: {}, unnamed: [], duplicates: [] };
  const entries = [...rows.values()].map((row) => {
    const name = row?.d?.[nameAt];
    const isin = typeof name === "string" ? ISIN_NAME.exec(name)?.[1] : undefined;
    const code = isin ? codeOf?.get(isin) : undefined;
    if (isin && !code) result.unnamed.push(row.s);
    return { row, ticker: code ?? name, byIsin: Boolean(code) };
  });
  const codes = new Set(entries.filter((entry) => entry.byIsin).map((entry) => entry.ticker));
  const kept = new Map();
  for (const entry of entries) {
    if (!codes.has(entry.ticker)) continue;
    const held = kept.get(entry.ticker);
    const better = !held
      || (priced(entry.row) && !priced(held.row))
      || (priced(entry.row) === priced(held.row) && held.byIsin && !entry.byIsin);
    if (better) kept.set(entry.ticker, entry);
  }
  for (const entry of entries) {
    if (codes.has(entry.ticker) && kept.get(entry.ticker) !== entry) {
      result.duplicates.push(entry.row.s);
      continue;
    }
    if (entry.byIsin) result.named[entry.row.s] = entry.ticker;
    result.rows.push({ row: entry.row, ticker: entry.ticker });
  }
  return result;
}

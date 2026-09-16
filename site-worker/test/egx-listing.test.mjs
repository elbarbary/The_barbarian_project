import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  completeListing, exchangeNames, nameByExchange, symbolOf, symbolsOf,
} from '../../scripts/egx_listing.mjs';

// Rows the way the scanner sends them: `s` the symbol, `d` the columns, and
// here the name is column 0 and the close column 1. Figures are 16 September
// 2026's.
const NAME_AT = 0;
const CLOSE_AT = 1;
const row = (ticker, close) => ({ s: symbolOf(ticker), d: [ticker, close] });
const listingOf = (...rows) => new Map(rows.map((r) => [r.s, r]));
const quick = { closeAt: CLOSE_AT, pauseMs: 0, sleep: async () => {} };
const COMI = row('COMI', 131.75);

// A scanner that answers by name for the symbols it carries (COMI always among
// them), and records what it was asked.
function scanner(carried = [], { failures = 0 } = {}) {
  const held = new Map([COMI, ...carried].map((r) => [r.s, r]));
  const asked = [];
  let failing = failures;
  const ask = async (symbols) => {
    asked.push(symbols);
    if (failing > 0) {
      failing -= 1;
      throw new Error('TradingView scanner failed: 502');
    }
    return { totalCount: 0, data: symbols.filter((s) => held.has(s)).map((s) => held.get(s)) };
  };
  return { ask, asked };
}

test('a company the listing left out is asked for by name and comes back with its quote', async () => {
  // 10:01 UTC: the listing sent COMI and not NBCC, POCO or EHDR.
  const { ask, asked } = scanner([row('NBCC', 5), row('POCO', 5), row('EHDR', 2.73)]);
  const out = await completeListing(listingOf(COMI), ['COMI', 'EHDR', 'NBCC', 'POCO'], ask, quick);
  // The three it left out, and COMI as the control.
  assert.deepEqual(asked, [['EGX:EHDR', 'EGX:NBCC', 'EGX:POCO', 'EGX:COMI']]);
  assert.deepEqual(out.recovered, ['EHDR', 'NBCC', 'POCO']);
  assert.deepEqual([out.unknown, out.unasked, out.unpriced], [[], [], []]);
  assert.deepEqual([...out.rows.keys()].sort(), ['EGX:COMI', 'EGX:EHDR', 'EGX:NBCC', 'EGX:POCO']);
  assert.equal(out.rows.get('EGX:EHDR').d[CLOSE_AT], 2.73);
});

test('nothing is asked when the listing priced every published company', async () => {
  const { ask, asked } = scanner();
  const out = await completeListing(listingOf(COMI, row('NBCC', 5)), ['COMI', 'NBCC'], ask, quick);
  assert.deepEqual(asked, []);
  assert.deepEqual(out.asked, []);
});

test('a symbol the scanner does not carry by name is unknown to it, not recovered', async () => {
  // MKIT: mandatory delisting 12 Aug 2026; the scanner sends no row for EGX:MKIT.
  const { ask } = scanner();
  const out = await completeListing(listingOf(COMI), ['COMI', 'MKIT'], ask, quick);
  assert.deepEqual(out.unknown, ['MKIT']);
  assert.deepEqual([out.recovered, out.unasked], [[], []]);
  assert.equal(out.rows.has('EGX:MKIT'), false);
});

test('an empty answer is no verdict: without the control in it, the request failed', async () => {
  // A scanner with a bad minute answers every request with no rows at all.
  // Believing it would call NBCC gone and delete it.
  const asked = [];
  const ask = async (symbols) => { asked.push(symbols); return { totalCount: 0, data: [] }; };
  const out = await completeListing(listingOf(COMI), ['COMI', 'NBCC'], ask, quick);
  assert.equal(asked.length, 3, 'retried like any other failure');
  assert.deepEqual(out.unasked, ['NBCC']);
  assert.deepEqual(out.unknown, []);
});

test('with no priced company to check the answer against, silence is never a verdict', async () => {
  const ask = async () => ({ totalCount: 0, data: [] });
  const out = await completeListing(listingOf(), ['MKIT'], ask, quick);
  assert.deepEqual(out.unknown, []);
  assert.deepEqual(out.unasked, ['MKIT']);
});

test('a failed request is no verdict: its symbols are unasked, never unknown', async () => {
  const { ask, asked } = scanner([row('NBCC', 5)], { failures: 3 });
  const out = await completeListing(listingOf(COMI), ['COMI', 'NBCC'], ask, quick);
  assert.equal(asked.length, 3, 'three tries, then it gives up');
  assert.deepEqual(out.unasked, ['NBCC']);
  assert.deepEqual(out.unknown, []);
  assert.equal(out.rows.has('EGX:NBCC'), false);
});

test('a request that fails and then answers is retried rather than given up on', async () => {
  const { ask } = scanner([row('NBCC', 5)], { failures: 2 });
  const out = await completeListing(listingOf(COMI), ['COMI', 'NBCC'], ask, quick);
  assert.deepEqual(out.recovered, ['NBCC']);
  assert.deepEqual(out.unasked, []);
});

test('an answer that is not a list of rows counts as a failed request', async () => {
  const out = await completeListing(listingOf(COMI), ['COMI', 'NBCC'], async () => ({ error: 'bad request' }), quick);
  assert.deepEqual(out.unasked, ['NBCC']);
  assert.deepEqual(out.unknown, []);
});

test('a row listed without a close is asked for again, and a priced answer replaces it', async () => {
  const { ask } = scanner([row('HALN', 0.1)]);
  const out = await completeListing(listingOf(COMI, row('HALN', null)), ['COMI', 'HALN'], ask, quick);
  assert.deepEqual(out.recovered, ['HALN']);
  assert.equal(out.rows.get('EGX:HALN').d[CLOSE_AT], 0.1);
});

test('answered with no close is its own verdict, and the row is kept for what else it says', async () => {
  const { ask } = scanner([row('HALN', null)]);
  const out = await completeListing(listingOf(COMI), ['COMI', 'HALN'], ask, quick);
  assert.deepEqual(out.unpriced, ['HALN']);
  assert.deepEqual([out.recovered, out.unknown, out.unasked], [[], [], []]);
  assert.equal(out.rows.has('EGX:HALN'), true);
});

test('every company asked lands in exactly one verdict, across chunks', async () => {
  const tickers = Array.from({ length: 7 }, (_, i) => `AB${String.fromCharCode(65 + i)}`);
  const held = new Map([COMI, ...tickers.slice(0, 4).map((t, i) => row(t, i === 3 ? null : 10))]
    .map((r) => [r.s, r]));
  const ask = async (symbols) => {
    // The second chunk, ABD to ABF, fails on every try.
    if (symbols.includes('EGX:ABD')) throw new Error('down');
    return { data: symbols.filter((s) => held.has(s)).map((s) => held.get(s)) };
  };
  const out = await completeListing(listingOf(COMI), ['COMI', ...tickers], ask, { ...quick, chunk: 3 });
  const verdicts = [...out.recovered, ...out.unpriced, ...out.unknown, ...out.unasked].sort();
  assert.deepEqual(verdicts, [...tickers].sort());
  assert.deepEqual(out.recovered, ['ABA', 'ABB', 'ABC']);
  assert.deepEqual(out.unasked, ['ABD', 'ABE', 'ABF']);
  assert.deepEqual(out.unknown, ['ABG']);
});

test('with no published directory nothing is asked and the listing stands as it came', async () => {
  const { ask, asked } = scanner();
  const out = await completeListing(listingOf(COMI), null, ask, quick);
  assert.deepEqual(asked, []);
  assert.deepEqual([...out.rows.keys()], ['EGX:COMI']);
});

test('the listing handed in is not changed underneath the caller', async () => {
  const listing = listingOf(COMI);
  const { ask } = scanner([row('NBCC', 5)]);
  await completeListing(listing, ['COMI', 'NBCC'], ask, quick);
  assert.deepEqual([...listing.keys()], ['EGX:COMI']);
});

// ── Listings the scanner files under an ISIN ────────────────────────────────
//
// The scanner names National Printing `EGX:EGS370O1C013` and Ferchem Misr
// `EGX:EGS385S1C012`; the exchange's market watch pairs those ISINs with NAPR
// and FERC. MKIT's `EGX:EGS659O1C015` is in no market-watch capture (delisted
// 12 Aug 2026), and neither is Egypt - South Africa for Communication's
// `EGX:EGS48271C018-EGP`.

// `session.json` `isins`, as harvest_egx_session.py writes it.
const ISINS = {
  EGS370O1C013: { code: 'NAPR', stated: '2026-09-16T11:32:51Z' },
  EGS385S1C012: { code: 'FERC', stated: '2026-09-16T11:32:51Z' },
  EGS60121C018: { code: 'COMI', stated: '2026-09-16T11:32:51Z' },
};
const NAMES = exchangeNames(ISINS);
const NAPR_ROW = row('EGS370O1C013', 42.1);
const FERC_ROW = row('EGS385S1C012', 77.53);
const MKIT_ROW = row('EGS659O1C015', 0.81);
const ESAC_ROW = row('EGS48271C018-EGP', 0.15);
const named = (rows, names = NAMES) =>
  nameByExchange(listingOf(...rows), names?.codeOf, { closeAt: CLOSE_AT, nameAt: NAME_AT });
const tickers = (out) => out.rows.map(({ ticker }) => ticker);

test('the exchange\'s pairing is read both ways round', () => {
  assert.equal(NAMES.codeOf.get('EGS370O1C013'), 'NAPR');
  assert.equal(NAMES.isinOf.get('FERC'), 'EGS385S1C012');
  assert.equal(NAMES.codeOf.size, 3);
});

test('a code two ISINs claim names neither, and a malformed entry names nothing', () => {
  const names = exchangeNames({
    ...ISINS,
    EGS99999C011: { code: 'NAPR' },            // a second claim on NAPR
    EGS370O1C0: { code: 'SHORT' },             // an ISIN cut short
    EGS11111C011: { code: 'LUTS_r1' },         // a subscription right, not a share
    EGS22222C011: 'FERC',                      // not an entry at all
  });
  assert.equal(names.codeOf.has('EGS370O1C013'), false);
  assert.equal(names.codeOf.has('EGS99999C011'), false);
  assert.equal(names.isinOf.has('NAPR'), false);
  assert.deepEqual([...names.codeOf.values()].sort(), ['COMI', 'FERC']);
});

test('with no pairing to read there are no names', () => {
  for (const isins of [undefined, null, {}, [], 'EGS370O1C013', { EGS370O1C013: {} }]) {
    assert.equal(exchangeNames(isins), null, JSON.stringify(isins));
  }
});

test('a row the exchange pairs with a code is that code, and keeps the scanner\'s symbol', () => {
  const out = named([COMI, NAPR_ROW, FERC_ROW]);
  assert.deepEqual(tickers(out), ['COMI', 'NAPR', 'FERC']);
  // The symbol is what the chart socket answers to, so it is never rewritten.
  assert.equal(out.rows[1].row, NAPR_ROW);
  assert.equal(out.rows[1].row.s, 'EGX:EGS370O1C013');
  assert.deepEqual(out.named, { 'EGX:EGS370O1C013': 'NAPR', 'EGX:EGS385S1C012': 'FERC' });
  assert.deepEqual([out.unnamed, out.duplicates], [[], []]);
});

test('an ISIN no market-watch row pairs is left as it came, and named as unnamed', () => {
  const out = named([COMI, ESAC_ROW]);
  assert.deepEqual(tickers(out), ['COMI', 'EGS48271C018-EGP']);
  assert.deepEqual(out.unnamed, ['EGX:EGS48271C018-EGP']);
  assert.deepEqual(out.named, {});
});

test('a delisted company\'s ISIN is not named: its old ticker comes from filings, not the market watch', () => {
  // The exchange's filings pair EGS659O1C015 with MKIT 354 times, and its
  // final notice (292918) delisted it on 12 Aug 2026. No market-watch row has
  // named it since, so it stays the vendor's ISIN and is published nowhere.
  const out = named([COMI, MKIT_ROW, NAPR_ROW]);
  assert.deepEqual(tickers(out), ['COMI', 'EGS659O1C015', 'NAPR']);
  assert.deepEqual(out.unnamed, ['EGX:EGS659O1C015']);
  assert.equal(Object.values(out.named).includes('MKIT'), false);
});

test('the suffix the scanner adds to some ISINs does not hide the pairing', () => {
  const names = exchangeNames({ EGS48271C018: { code: 'ESAC', stated: '2026-09-16T11:32:51Z' } });
  const out = named([COMI, ESAC_ROW], names);
  assert.deepEqual(tickers(out), ['COMI', 'ESAC']);
  assert.deepEqual(out.named, { 'EGX:EGS48271C018-EGP': 'ESAC' });
});

test('one row per code: the code\'s own priced row stands over the ISIN row, in either order', () => {
  for (const rows of [[row('NAPR', 42.1), NAPR_ROW], [NAPR_ROW, row('NAPR', 42.1)]]) {
    const out = named(rows);
    assert.deepEqual(tickers(out), ['NAPR']);
    assert.equal(out.rows[0].row.s, 'EGX:NAPR');
    assert.deepEqual(out.duplicates, ['EGX:EGS370O1C013']);
    assert.deepEqual(out.named, {});
  }
});

test('one row per code: a priced ISIN row stands over the code\'s row with no close', () => {
  for (const rows of [[row('NAPR', null), NAPR_ROW], [NAPR_ROW, row('NAPR', null)]]) {
    const out = named(rows);
    assert.deepEqual(tickers(out), ['NAPR']);
    assert.equal(out.rows[0].row, NAPR_ROW);
    assert.deepEqual(out.duplicates, ['EGX:NAPR']);
  }
});

test('with no pairing every row is named as the scanner named it', () => {
  const out = named([COMI, NAPR_ROW, MKIT_ROW], null);
  assert.deepEqual(tickers(out), ['COMI', 'EGS370O1C013', 'EGS659O1C015']);
  assert.deepEqual(out.unnamed, ['EGX:EGS370O1C013', 'EGX:EGS659O1C015']);
});

test('a code paired with an ISIN is asked for under every spelling', () => {
  assert.deepEqual(symbolsOf('NAPR', NAMES.isinOf),
    ['EGX:NAPR', 'EGX:EGS370O1C013', 'EGX:EGS370O1C013-EGP']);
  assert.deepEqual(symbolsOf('EHDR', NAMES.isinOf), ['EGX:EHDR']);
  assert.deepEqual(symbolsOf('EHDR', undefined), ['EGX:EHDR']);
});

test('a published company the listing priced under its ISIN is not asked for again', async () => {
  const { ask, asked } = scanner();
  const out = await completeListing(listingOf(COMI, NAPR_ROW), ['COMI', 'NAPR'], ask,
    { ...quick, isinOf: NAMES.isinOf });
  assert.deepEqual(asked, []);
  assert.deepEqual(out.asked, []);
});

test('left out of the listing, it is asked for by its ISIN and comes back under its code', async () => {
  // Asked as EGX:NAPR alone, the scanner sends no row and the daily build
  // would delete NAPR as a company the scanner no longer carries.
  const { ask, asked } = scanner([NAPR_ROW]);
  const out = await completeListing(listingOf(COMI), ['COMI', 'NAPR'], ask,
    { ...quick, isinOf: NAMES.isinOf });
  assert.deepEqual(asked, [['EGX:NAPR', 'EGX:EGS370O1C013', 'EGX:EGS370O1C013-EGP', 'EGX:COMI']]);
  assert.deepEqual(out.recovered, ['NAPR']);
  assert.deepEqual([out.unknown, out.unasked, out.unpriced], [[], [], []]);
  const records = nameByExchange(out.rows, NAMES.codeOf, { closeAt: CLOSE_AT, nameAt: NAME_AT });
  assert.deepEqual(tickers(records), ['COMI', 'NAPR']);
  assert.equal(records.rows[1].row.s, 'EGX:EGS370O1C013');
});

test('the suffixed spelling is recovered too', async () => {
  const names = exchangeNames({ EGS30AJ1C016: { code: 'DIFC', stated: '2026-09-16T11:32:51Z' } });
  const suffixed = row('EGS30AJ1C016-EGP', 13.96);
  const { ask } = scanner([suffixed]);
  const out = await completeListing(listingOf(COMI), ['COMI', 'DIFC'], ask,
    { ...quick, isinOf: names.isinOf });
  assert.deepEqual(out.recovered, ['DIFC']);
  assert.equal(out.rows.get('EGX:EGS30AJ1C016-EGP').d[CLOSE_AT], 13.96);
});

test('a paired code no spelling answers for is unknown to the scanner', async () => {
  const { ask } = scanner();
  const out = await completeListing(listingOf(COMI), ['COMI', 'FERC'], ask,
    { ...quick, isinOf: NAMES.isinOf });
  assert.deepEqual(out.unknown, ['FERC']);
  assert.deepEqual(out.recovered, []);
});

test('the control may be a company the listing priced under its ISIN', async () => {
  const { ask, asked } = scanner([FERC_ROW, NAPR_ROW]);
  const out = await completeListing(listingOf(NAPR_ROW), ['FERC', 'NAPR'], ask,
    { ...quick, isinOf: NAMES.isinOf });
  assert.deepEqual(asked, [['EGX:FERC', 'EGX:EGS385S1C012', 'EGX:EGS385S1C012-EGP', 'EGX:EGS370O1C013']]);
  assert.deepEqual(out.recovered, ['FERC']);
});

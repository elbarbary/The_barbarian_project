import { test } from 'node:test';
import assert from 'node:assert/strict';
import { completeListing, symbolOf } from '../../scripts/egx_listing.mjs';

// Rows the way the scanner sends them: `s` the symbol, `d` the columns, and
// here the close is column 1. Figures are 16 September 2026's.
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

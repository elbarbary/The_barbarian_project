/* The exchange's tape beside the vendor's, and the age claim over both.
 *
 * The measurement that motivated this is worth keeping written down, because
 * it is the opposite of what everyone expects: on 31 August 2026, with the
 * market open, the exchange's own feed was NOT fresher than the vendor's.
 * They agreed to a few hundredths minute after minute, and the exchange's own
 * `writeTime` sat fourteen minutes behind the Cairo clock. EGX publishes its
 * public feed delayed, exactly as the vendor does.
 *
 * What it buys is a stamp we can measure instead of a tier we assume, two
 * columns the vendor has no answer for, and one source for a company's price
 * and its market value. None of that is freshness, and none of it is a reason
 * to say the prices are live.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { cleanEgx, mergeQuotes, stampAge } = await import('../src/index.js');

const ROW = {
  reuters: 'COMI.CA', lastPrice: 137.4, openPrice: 138.1, high: 138.9, low: 137.1,
  volume: 1585899, chgPer: -0.51, prevClose: 138.1, trades: 1496,
  value: 216331843.52, writeTime: '202608311218',
};

test('a row becomes the same shape the vendor produces, plus what it adds', () => {
  const { quotes, writeTime } = cleanEgx([ROW]);
  assert.deepEqual(quotes.COMI, {
    c: 137.4, o: 138.1, h: 138.9, l: 137.1, v: 1585899,
    ch: -0.51, pc: 138.1, t: 1496, val: 216331844, s: 'egx',
  });
  assert.equal(writeTime, '202608311218');
  // Percent, like the scanner — NOT the fraction the published documents
  // store. Mixing the two multiplies every move on the exchange by a hundred.
  assert.equal(quotes.COMI.ch, -0.51);
});

test('what is not a quote is not kept', () => {
  const { quotes } = cleanEgx([
    { reuters: 'EGS60121C018', lastPrice: 10 },        // an ISIN, not a ticker
    { reuters: 'ABUK.CA' },                            // no price
    { reuters: 'SWDY.CA', lastPrice: 0 },              // nor is zero
    { reuters: 'HRHO.CA', lastPrice: 25.7, chgPer: null, volume: null },
  ]);
  assert.deepEqual(Object.keys(quotes), ['HRHO']);
  // A row with a price and nothing else keeps the price and says nothing it
  // does not know.
  assert.equal(quotes.HRHO.ch, null);
  assert.equal(quotes.HRHO.v, null);
});

test('the exchange wins per ticker, and the vendor fills the rest', () => {
  // Never per FEED: taking the whole of one would drop the sixty-one
  // companies the exchange does not carry, or throw away the trade counts for
  // the two hundred it does.
  const vendor = {
    COMI: { c: 137.39, ch: -0.52, v: 1228513 },
    ORWE: { c: 26.26, ch: 2.5781, v: 654737 },
  };
  const { quotes, from } = mergeQuotes(vendor, cleanEgx([ROW]).quotes);
  assert.equal(quotes.COMI.c, 137.4, 'the exchange should have won COMI');
  assert.equal(quotes.COMI.s, 'egx');
  assert.equal(quotes.COMI.t, 1496);
  assert.equal(quotes.ORWE.c, 26.26, 'the vendor should still fill ORWE');
  assert.equal(quotes.ORWE.s, undefined);
  assert.deepEqual(from, { egx: 1, vendor: 1 });

  // Either side alone still answers.
  assert.deepEqual(mergeQuotes({}, cleanEgx([ROW]).quotes).from, { egx: 1, vendor: 0 });
  assert.deepEqual(mergeQuotes(vendor, {}).from, { egx: 0, vendor: 2 });
});

test('the age is measured off the exchange\'s own stamp, on Cairo\'s clock', () => {
  // 12:18 written, 12:32 in Cairo: fourteen minutes. Both sides are read as
  // Cairo wall time and subtracted, so the summer hour never has to be known
  // — it cancels.
  const at = (iso) => new Date(iso);
  assert.equal(stampAge('202608311218', at('2026-08-31T09:32:00Z')), 14 * 60);
  // Winter, when Cairo is UTC+2 rather than +3, and the same arithmetic holds.
  assert.equal(stampAge('202601151018', at('2026-01-15T08:32:00Z')), 14 * 60);
  // A stamp from the future is two clocks disagreeing, not a negative delay.
  assert.equal(stampAge('202608311300', at('2026-08-31T09:32:00Z')), 0);
  assert.equal(stampAge('nonsense'), null);
  assert.equal(stampAge(null), null);
});

/* ── the tape ──────────────────────────────────────────────────────────── */

const { record } = await import('../src/index.js');

const SNAPSHOT = {
  as_of: '2026-09-01T09:35:12.000Z',
  session: { open: true },
  from: { egx: 2, vendor: 1 },
  egx_write_time: '202609011220',
  quotes: {
    COMI: { c: 137.4, o: 138.1, h: 138.9, l: 137.1, v: 1585899, ch: -0.51,
            pc: 138.1, t: 1496, val: 216331844, s: 'egx' },
    ORWE: { c: 26.26, ch: 2.5781, v: 654737 },
  },
};

function bucket() {
  const puts = [];
  return { puts, put: async (key, body, opts) => { puts.push({ key, body, opts }); } };
}

test('a fresh reading is written once, keyed by its own minute', async () => {
  const TAPE = bucket();
  await record({ TAPE }, SNAPSHOT);
  assert.equal(TAPE.puts.length, 1);
  // Partitioned by day, named for the minute — so a re-read inside the same
  // minute overwrites rather than doubling the row.
  assert.equal(TAPE.puts[0].key, 'quotes/2026-09-01/0935.ndjson');
  assert.equal(TAPE.puts[0].opts.httpMetadata.contentType, 'application/x-ndjson');
  // The exchange's own stamp rides along, so a row's real age survives into
  // the tape instead of being inferred from the filename later.
  assert.equal(TAPE.puts[0].opts.customMetadata.write_time, '202609011220');
  assert.equal(TAPE.puts[0].opts.customMetadata.egx, '2');
});

test('every row carries its ticker, its time and where it came from', async () => {
  const TAPE = bucket();
  await record({ TAPE }, SNAPSHOT);
  const rows = TAPE.puts[0].body.trim().split('\n').map((l) => JSON.parse(l));
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], {
    t: 'COMI', at: '2026-09-01T09:35:12.000Z', c: 137.4, o: 138.1, h: 138.9,
    l: 137.1, v: 1585899, ch: -0.51, pc: 138.1, tr: 1496, val: 216331844, s: 'egx',
  });
  // A vendor row has no trade count and says so with a null rather than a
  // zero — and says it is the vendor's.
  assert.equal(rows[1].tr, undefined);
  assert.equal(rows[1].s, 'tv');
});

test('nothing is recorded with the market shut, or with no bucket', async () => {
  // Outside the session the upstream repeats the same close, and a tape of
  // one row two hundred times is not a record of anything.
  const shut = bucket();
  await record({ TAPE: shut }, { ...SNAPSHOT, session: { open: false } });
  assert.equal(shut.puts.length, 0);
  // No binding, no tape — and no error either.
  await record({}, SNAPSHOT);
  await record({ TAPE: {} }, SNAPSHOT);
});

test('a bucket that fails costs the recording and never the reader', async () => {
  // The tape is a recording, not a dependency: nothing a reader is shown may
  // fail because a bucket did.
  const broken = { put: async () => { throw new Error('r2 down'); } };
  await record({ TAPE: broken }, SNAPSHOT);
  // An unparseable stamp is not a crash either.
  const TAPE = bucket();
  await record({ TAPE }, { ...SNAPSHOT, as_of: 'nonsense' });
  assert.equal(TAPE.puts.length, 0);
});

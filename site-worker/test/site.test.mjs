/* What the website is allowed to put on a screen.
 *
 * The site shipped the design canvas's mock-up as a fallback for every block,
 * and four blocks had no live source at all — so a signed-in reader was shown
 * EGX 30 at 44,883.36 on a session that closed at 55,106.50, a data_version of
 * 771314503e, a directory of "282" whatever the directory held, and a filing
 * claim about Ezz Steel that no document supports. None of it could fail,
 * because none of it was ever fetched.
 *
 * These tests exist so that class of bug is a red test rather than a live page.
 * The rule they encode: a signed-in screen shows a published figure or it
 * shows nothing, and the demo never names a real instrument.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installDom } from './dom-stub.mjs';

installDom();

const { Component } = await import('../../public/esthmr/logic.js');
const data = await import('../../public/esthmr/data.js');

/** The component as main.js drives it: construct, set a dataset, read a screen. */
function screen(dataset, lang = 'en') {
  const c = new Component({ accent: 'var(--accent)' });
  c.state.lang = lang;
  c.setData(dataset);
  return c.renderVals();
}

/** A minimal live dataset, shaped the way data.live() returns one. */
const LIVE = {
  demo: false,
  companies: [
    { ticker: 'AAAA', name: { en: 'A', ar: 'أ' }, sector: 'Banks', close: 10, pct: 1.5, cap: 100, pe: 8 },
    { ticker: 'BBBB', name: { en: 'B', ar: 'ب' }, sector: 'Banks', close: 20, pct: -2.5, cap: 200, pe: 9 },
  ],
  series: [], fins: [],
  marketDate: '2026-08-27',
  generatedAt: '2026-08-28T16:38:17+00:00',
  dataVersion: '14274003b1cf7c8d',
};

/* ── the bug that was live ─────────────────────────────────────────────── */

test('a signed-in screen never carries the design mock-up', () => {
  const v = screen(LIVE);
  const printed = JSON.stringify(v, (k, x) => (typeof x === 'function' ? undefined : x));
  // The mock-up's own figures and names. Any of these on a live screen means a
  // block fell back to the canvas instead of to nothing.
  for (const invented of ['44,883.36', '12,207.81', '15,940.12', '771314503e',
                          'Ezz Steel', 'KORRA', 'Commercial International Bank',
                          '48.31', '3,318.40', 'example.org']) {
    assert.ok(!printed.includes(invented), `live screen shows the mock-up's ${invented}`);
  }
});

test('an absent document empties its block rather than inventing one', () => {
  const v = screen(LIVE);
  for (const block of ['indices', 'readNow', 'feed', 'rates', 'macro', 'studies',
                       'filedEvents', 'expectedEvents', 'sectorCards', 'signals', 'filings']) {
    assert.deepEqual(v[block], [], `${block} was filled in without a document`);
  }
  // And each one says so, rather than leaving a heading over a blank frame.
  for (const flag of ['noIndices', 'noReadNow', 'noFeed', 'noRates', 'noMacro',
                      'noStudies', 'noDebt']) {
    assert.equal(v[flag], true, `${flag} is not set, so the screen shows a bare heading`);
  }
});

test('the session stamps come from the documents, not from a literal', () => {
  const v = screen(LIVE);
  assert.equal(v.marketDate, '27 August 2026');
  assert.equal(v.generatedAt, '2026-08-28T16:38:17+00:00');
  assert.equal(v.dataVersion, '14274003b1cf7c8d');
  assert.equal(v.totalCount, 2);          // the directory, not a hardcoded 282
  assert.equal(screen(LIVE, 'ar').marketDate.includes('٢٠٢٦'), true);
});

/* ── the index cards ───────────────────────────────────────────────────── */

const RATES = [
  { id: 'EGX30', label: 'EGX 30', label_ar: 'إيجي إكس 30', level: 55106.5,
    change_percent: -0.31, change_points: -170.5 },
];
const HISTORY = { sessions: [
  { date: '2026-08-25', indices: { EGX30: 55000 } },
  { date: '2026-08-26', indices: { EGX30: 55277 } },
  { date: '2026-08-27', indices: { EGX30: 55106.5 } },
] };

test('an index card prints the level that was published', () => {
  const [card] = data.indexCards(RATES, HISTORY);
  assert.equal(card.value, '55,106.50');
  assert.equal(card.pct, '−0.31%');
  assert.equal(card.chg, '−170.50');
  assert.equal(card.color, 'var(--down)');
  assert.deepEqual(card.points, [55000, 55277, 55106.5]);
});

test('an index with no history draws no line rather than an invented one', () => {
  const [card] = data.indexCards(RATES, null);
  assert.deepEqual(card.points, []);
  const c = new Component({});
  // Two points are the minimum that describes a path; below that, nothing.
  assert.equal(c.sparkOf([], true).children.length, 0);
  assert.equal(c.sparkOf([1], true).children.length, 0);
  assert.equal(c.sparkOf([1, 2, 3], true).children.length, 2);
});

test('a missing level says so instead of printing a number', () => {
  const [card] = data.indexCards([{ id: 'X', label: 'X', level: null }], HISTORY);
  assert.equal(card.value, '—');
  assert.equal(card.pct, '—');
  assert.equal(card.chg, '—');
});

/* ── what to read now ──────────────────────────────────────────────────── */

const SIGNALS = {
  firsts: [{ ticker: 'AMES', name: 'Alexandria New Medical Center Co.',
             title: 'Cash Capital Increase for AMES', title_ar: 'زيادة رأس المال',
             date: '2026-08-26', previous: '2018-01-10' }],
  quiet: [{ ticker: 'GTHE', name: 'Global Telecom Holding S.A.E.',
            last_filed: '2019-09-11', silent_days: 2543 }],
};

test('every read-now card is traceable to a row in a document', () => {
  const cards = data.readNowCards(SIGNALS, 37, '2026-10-06');
  assert.equal(cards.length, 3);
  assert.equal(cards[0].ticker, 'AMES');
  assert.ok(cards[0].stamp.includes('2018-01-10'));      // the date it is "first since"
  assert.ok(cards[1].title.includes('2019-09-11'));      // the date it last filed
  assert.ok(cards[2].title.startsWith('37 '));           // the count, untruncated
  assert.ok(cards[2].title.includes('2026-10-06'));      // and the date it counts from
  assert.ok(cards[2].stamp.includes('estimate'));        // and labelled an estimate
});

test('no signals and no calendar means no cards, not the design\'s three', () => {
  assert.deepEqual(data.readNowCards(null, 0), []);
  assert.deepEqual(data.readNowCards({}, undefined), []);
});

test('no expected filings means no card at all', () => {
  // The calendar's estimates cluster in filing season: for most of the year
  // the fortnight ahead is genuinely empty, and the card has to disappear
  // rather than print a confident zero.
  const cards = data.readNowCards(SIGNALS, 0, '');
  assert.equal(cards.length, 2);
  assert.ok(!cards.some((c) => c.kind === 'Results due'));
});

/* ── the demo ──────────────────────────────────────────────────────────── */

test('the demo names no real instrument and no real issuer', () => {
  const d = data.demo();
  const v = screen(d);
  const printed = JSON.stringify(v, (k, x) => (typeof x === 'function' ? undefined : x));
  for (const real of ['EGX 30', 'EGX 70', 'EGX 100', 'KORRA', 'Ezz Steel']) {
    assert.ok(!printed.includes(real), `the demo names ${real}`);
  }
  // Ticker-shaped tokens are the ones that slipped: the hand-written swap list
  // covered eight and the copy carried twenty.
  const tickers = printed.match(/\b[A-Z]{4}\b/g) || [];
  assert.deepEqual(tickers, [], `the demo names real tickers: ${[...new Set(tickers)].join(', ')}`);
});

test('the demo still fills every screen it can fill honestly', () => {
  const v = screen(data.demo());
  for (const block of ['indices', 'readNow', 'feed', 'rates', 'studies',
                       'filedEvents', 'expectedEvents', 'sectorCards']) {
    assert.ok(v[block].length > 0, `the demo left ${block} empty`);
  }
  assert.equal(v.indices.length, 3);
  assert.equal(v.dataVersion, 'demo');
  // Macro is the exception, and deliberately so: the design's rows invented
  // Egypt's inflation, GDP and remittances and named CAPMAS, the Ministry of
  // Planning and the Central Bank as the source. There is no way to write a
  // sample official statistic, so the demo shows none.
  assert.deepEqual(v.macro, []);
});

/* ── the company screen ────────────────────────────────────────────────── */

const DOC = {
  ticker: 'ACGC', name: { en: 'Arab Cotton', ar: 'القطن العربي' }, sector: 'Industrials',
  close: 10, pct: 1.5, pe: 8,
  profile: { market_cap: 4180, shares_outstanding: 337096774, perf_1w: -1.84,
             perf_1m: 6.21, avg_volume_30d: 118422 },
  debt: {
    period: '9M 2026 (to 31 Mar)', as_of: '2026-03-31', filing_id: 'egx-289686',
    frame: 'operating', borrowings: 7.243, short_term: 1.946, long_term: 5.298,
    cash: 7.75, finance_cost: 1.836, net_debt: -0.507, due_within_year: 0.269,
    cover: 19.758, gearing: 0.004,
    change: { since: '2025-06-30', basis: 'balance_sheet', borrowings: 8.659, delta: -1.416, direction: 'down' },
    movement: { operating_cash_flow: -82.811, investing_cash_flow: 63.616, financing_cash_flow: -13.311 },
    read: { read: 'During the period, the company repaid part of its borrowings.' },
  },
};

/** The component with a company open, the way main.js leaves it. */
function company(dataset, doc) {
  const c = new Component({ accent: 'var(--accent)' });
  c.setData(dataset);
  c.state.screen = 'company';
  c.state.ticker = doc ? doc.ticker : 'ACGC';
  if (doc) c._co = doc;
  return c.renderVals();
}

test('a company opened live shows its own borrowings, not the worked example', () => {
  const v = company(LIVE, DOC);
  assert.equal(v.hasDebt, true);
  assert.equal(v.debt.borrowings, '7.2');            // not the design's 1,869.1
  assert.equal(v.debt.shortTerm, '1.9');
  assert.equal(v.debt.stPct, '27%');
  assert.equal(v.debt.filingId, 'egx-289686');
  assert.equal(v.debt.metrics[3].value, '19.76×');   // cover, from the document
  assert.ok(v.debt.read.startsWith('During the period'));
  assert.equal(v.co.ticker, 'ACGC');
  assert.equal(v.co.nameEn, 'Arab Cotton');
});

test('a company whose filings state no borrowings says so', () => {
  const v = company(LIVE, Object.assign({}, DOC, { debt: null }));
  assert.equal(v.hasDebt, false);
  assert.equal(v.noDebt, true);
  assert.equal(v.debt, null);
});

test('a company screen before its document lands shows dashes, not KORRA', () => {
  const v = company(LIVE, null);
  assert.equal(v.co.nameEn, 'ACGC');
  assert.equal(v.co.close, '—');
  assert.deepEqual(v.co.stats, []);
  assert.equal(v.hasDebt, false);
  const printed = JSON.stringify(v, (k, x) => (typeof x === 'function' ? undefined : x));
  assert.ok(!printed.includes('KORRA'));
  assert.ok(!printed.includes('1,869.1'));
});

test('the header stats come from the profile the document carries', () => {
  const { co } = company(LIVE, DOC);
  const by = Object.fromEntries(co.stats.map((s) => [s.label, s.value]));
  assert.equal(by['Market cap'], '4,180');
  assert.equal(by['1W'], '-1.84%');
  assert.equal(by['1M'], '+6.21%');
  assert.equal(by['P/E'], '8.0');
  assert.equal(by.EPS, '—');                          // not in any document yet
  const facts = Object.fromEntries(co.briefFacts.map((f) => [f.label, f.value]));
  assert.equal(facts['Shares outstanding'], '337,096,774');
});

test('the nav counts what is loaded rather than what the design drew', () => {
  const v = screen(LIVE);
  const meta = Object.fromEntries(v.nav.map((n) => [n.label, n.meta]));
  assert.equal(meta.Market, '2');       // the directory, not 282
  assert.equal(meta.Today, '');         // no feed loaded, so no count
  assert.equal(meta.Company, '');       // nothing open, so no ticker
});

/* ── §8: the publisher is not licensed ─────────────────────────────────── */

/* The app enforces this in legal_voice_test.dart. The website publishes the
 * same figures to the same readers under the same licence — which is to say
 * none — and had no equivalent check at all. Every string the site can put on
 * a screen goes through here.
 */

/** Every rendered string, flattened. Functions and DOM nodes are not copy. */
function strings(value, out = [], seen = new Set()) {
  if (typeof value === 'string') { out.push(value); return out; }
  if (!value || typeof value !== 'object' || seen.has(value)) return out;
  if (typeof value === 'function' || value.tag !== undefined) return out;
  seen.add(value);
  for (const v of Object.values(value)) strings(v, out, seen);
  return out;
}

// A directive about a named security, in one word. These are the app's list.
const DIRECTIVE = /\b(buy|sell|hold|avoid|overvalued|undervalued|verdicts?|recommend\w*|target price|price target)\b/i;

test('§8 nothing the site can render tells a reader what to do', () => {
  const views = [screen(LIVE), screen(data.demo()), company(LIVE, DOC),
                 company(LIVE, Object.assign({}, DOC, { debt: null })),
                 screen(LIVE, 'ar'), screen(data.demo(), 'ar')];
  // The one sentence allowed to contain "buy" and "sell" is the one denying
  // that we do either. It is exempt by identity, not by pattern, so a new
  // sentence cannot smuggle itself in by quoting it.
  const denial = new Set(views.map((v) => v.L.legalNotLicensed));
  for (const view of views) {
    for (const line of strings(view)) {
      if (denial.has(line)) continue;
      // "Hold" appears legitimately inside "shareholder" and "holding"; the
      // word boundary is what separates the instruction from the noun.
      assert.ok(!DIRECTIVE.test(line), `§8: a screen can render "${line}"`);
    }
  }
});

test('§8 every borrowings pattern the pipeline emits has words to print', () => {
  // build_debt.py picks from a closed set. A token with no sentence here
  // renders as a heading with nothing under it, which is how the "PATTERN"
  // block shipped empty.
  const PATTERNS = ['raised_while_operations_consumed_cash', 'raised_and_invested',
                    'raised_and_held', 'repaid_from_operating_cash',
                    'repaid_without_operating_cash', 'funding_raised',
                    'funding_repaid', 'little_movement'];
  for (const pattern of PATTERNS) {
    const doc = Object.assign({}, DOC, { debt: Object.assign({}, DOC.debt, { pattern }) });
    const { debt } = company(LIVE, doc);
    assert.ok(debt.patternLine.length > 10, `${pattern} has no sentence`);
    assert.ok(!DIRECTIVE.test(debt.patternLine), `${pattern} reads as advice`);
  }
  // And an unknown token says nothing rather than guessing.
  const unknown = company(LIVE, Object.assign({}, DOC, {
    debt: Object.assign({}, DOC.debt, { pattern: 'something_new' }) }));
  assert.equal(unknown.debt.patternLine, '');
});

test('§8 the non-licence line is rendered, in both languages', async () => {
  for (const lang of ['en', 'ar']) {
    const v = screen(LIVE, lang);
    assert.ok(v.L.legalNotLicensed && v.L.legalNotLicensed.length > 40,
      `${lang} has no non-licence line`);
  }
  assert.match(screen(LIVE).L.legalNotLicensed, /not licensed by the Financial Regulatory Authority/i);
  // And the template actually prints it, rather than it merely existing.
  const { readFile } = await import('node:fs/promises');
  const template = await readFile(new URL('../../public/esthmr/template.html', import.meta.url), 'utf8');
  assert.match(template, /\{\{\s*L\.legalNotLicensed\s*\}\}/,
    'the template no longer prints the non-licence line');
});

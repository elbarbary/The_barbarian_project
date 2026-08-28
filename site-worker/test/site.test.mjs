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
  // The DATA the demo renders, not the phrasebook behind it. `L` carries a
  // sentence for every screen in both languages — including "Moved with the
  // EGX 30 …", which belongs to a macro row the demo has none of. What must
  // not name a real instrument is a value that reaches a card.
  const RENDERED = ['indices', 'readNow', 'feed', 'rates', 'ratesArrowed', 'macro',
                    'studies', 'sectorCards', 'filedEvents', 'expectedEvents',
                    'rows', 'movers', 'watchlist', 'co', 'fins', 'debt',
                    'signals', 'filings', 'marketDate', 'dataVersion'];
  const printed = JSON.stringify(Object.fromEntries(RENDERED.map((k) => [k, v[k]])),
    (k, x) => (typeof x === 'function' ? undefined : x));
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
  const withSignals = {
    ...LIVE,
    signals: { streaks: [{ kind: 'first_loss', period: 'Q1 2026', run: 7, since: '2024-01-01' }],
               firsts: [], quiet: null },
  };
  const views = [screen(LIVE), screen(data.demo()), company(LIVE, DOC),
                 company(LIVE, Object.assign({}, DOC, { debt: null })),
                 screen(withSignals), screen(withSignals, 'ar'),
                 screen(LIVE, 'ar'), screen(data.demo(), 'ar')];
  // Three sentences are allowed the forbidden words, and each is allowed
  // because it is REFUSING to advise rather than advising: the non-licence
  // line, the footnote saying a count off the filing record is not an
  // instruction, and the feed's note that a headline was withheld precisely
  // for carrying a recommendation. All three are exempt BY IDENTITY, not by
  // pattern, so a new sentence cannot smuggle itself in by quoting them.
  const denial = new Set(views.flatMap((v) => [
    v.L.legalNotLicensed, v.L.sigFootnote, v.L.newsWithheld,
  ]));
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

/* ── the chrome around the screens ─────────────────────────────────────── */

test('signing in actually takes the demo banner off the page', async () => {
  // It did not, for as long as the site has been up. main.js sets
  // `bar.hidden = true`, but `hidden` is only the user-agent rule
  // `[hidden] { display: none }`, and ANY author rule outranks it — .gate sets
  // `display: flex`. So the attribute flipped, nothing moved, and a signed-in
  // reader kept being told the figures below were invented while looking at
  // the exchange. Nothing in JS can catch that; the stylesheet has to.
  const { readFile } = await import('node:fs/promises');
  const css = await readFile(new URL('../../public/esthmr/shell.css', import.meta.url), 'utf8');

  // Anything the shell hides by toggling `hidden` needs a real rule behind it.
  for (const selector of ['.gate', '.account']) {
    const sets = new RegExp(`\\${selector}\\s*\\{[^}]*display\\s*:`).test(css);
    if (!sets) continue;   // no author display rule, so `hidden` works unaided
    const hides = new RegExp(
      `body\\[data-signed="(yes|no)"\\]\\s*\\${selector}\\s*\\{[^}]*display\\s*:\\s*none`).test(css);
    assert.ok(hides, `${selector} sets its own display, so "hidden" cannot hide it`);
  }
});

/* ── the news card ─────────────────────────────────────────────────────── */

const STORY = {
  id: 'x1', headline: 'A headline', published: '2026-08-28T16:34:38Z',
  image: 'https://example.org/a.png',
  event: 'macro', event_label: 'Economy and policy', event_label_ar: 'الاقتصاد',
  meaning: 'What this does to somebody holding shares.',
  meaning_ar: 'ما يعنيه هذا لحامل السهم.',
  because: 'Names no listed company we can match.',
  because_ar: 'لا يذكر شركة مقيدة.',
  sources: [{ id: 'hapi', link: 'https://hapijournal.com/x' }],
  tickers: [],
};

/** news() over a document, with fetch stubbed. */
async function newsFrom(items) {
  const real = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({ items }) });
  try { return await data.news(); } finally { globalThis.fetch = real; }
}

test('a story carries its picture and its plain-language line', async () => {
  // Both were dropped. `image` was mapped but never rendered — the design drew
  // a placeholder frame and the real URL was never wired into it. The summary
  // was worse: the template reads `f.why` and news() only ever produced
  // `because`, so the box under every live headline was empty.
  const [card] = await newsFrom([{ ...STORY, weight: 'company' }]);
  assert.equal(card.image, 'https://example.org/a.png');
  assert.equal(card.hasImage, true);
  assert.equal(card.why, 'What this does to somebody holding shares.');
  assert.equal(card.whyAr, 'ما يعنيه هذا لحامل السهم.');
});

test('the generic reason is withheld on market-weight stories', async () => {
  // `because` falls back to "Names no listed company we can match…" whenever
  // no listed company is involved, which is most of the feed. The app learned
  // not to print that apology on row after row; the web follows the same rule.
  const [market] = await newsFrom([{ ...STORY, weight: 'market' }]);
  assert.equal(market.because, '');
  assert.equal(market.becauseAr, '');
  const [company] = await newsFrom([{ ...STORY, weight: 'company' }]);
  assert.equal(company.because, 'Names no listed company we can match.');
});

test('a story with no picture keeps the frame rather than a broken image', async () => {
  const [card] = await newsFrom([{ ...STORY, image: null, weight: 'company' }]);
  assert.equal(card.hasImage, false);
  assert.equal(card.image, null);
});

test('the card knows which of its parts it has', () => {
  const feed = [
    { kind: 'K', headline: 'H', why: 'w', because: 'b', image: 'i', source: 'S', tickers: [] },
    { kind: 'K', headline: 'H', why: '', because: '', image: null, source: 'S', tickers: [] },
  ];
  const [full, bare] = screen({ ...LIVE, feed }).feed;
  assert.deepEqual([full.hasWhy, full.hasBecause, full.hasImage], [true, true, true]);
  assert.deepEqual([bare.hasWhy, bare.hasBecause, bare.hasImage], [false, false, false]);
});

test('the template renders the picture and both lines', async () => {
  const { readFile } = await import('node:fs/promises');
  const t = await readFile(new URL('../../public/esthmr/template.html', import.meta.url), 'utf8');
  assert.match(t, /<img src="\{\{ f\.image \}\}"/, 'the picture is not rendered');
  assert.match(t, /\{\{ f\.why \}\}/, 'the plain-language line is not rendered');
  assert.match(t, /\{\{ f\.because \}\}/, 'the measured reason is not rendered');
  // Layered, not swapped: a picture that fails to load must leave the frame.
  assert.match(t, /\{\{ L\.outletImage \}\}/, 'the fallback frame was removed');
  assert.match(t, /referrerpolicy="no-referrer"/, 'the reader is leaking their page to the outlet');
});

/* ── scale ─────────────────────────────────────────────────────────────── */

/** live() over real document shapes, with fetch stubbed. */
async function liveFrom(docs) {
  const real = globalThis.fetch;
  globalThis.fetch = async (url) => ({
    ok: true, status: 200,
    json: async () => docs[String(url).replace('/data/v1/', '')],
  });
  try { return await data.live(); } finally { globalThis.fetch = real; }
}

test('the day\'s move is a fraction in the document and a percentage on screen', async () => {
  // market.json states COMI's move as 0.011918. Printed straight, that reads
  // "-0.01%" for a share that fell 1.19% — a wrong figure under a real ticker,
  // on every row of the exchange. The app carries the same warning pointing
  // the other way: quote_snapshot.dart:119, "a hundred times too large".
  const base = await liveFrom({
    'companies.json': { companies: [{ ticker: 'COMI', name_en: 'CIB', sector: 'Banks', market_cap: 474267676058 }] },
    'market.json': { date: '2026-08-27', stocks: { COMI: { close: 139.28, change_percent: -0.011918 } } },
    'manifest.json': { data_version: 'v', generated_at: 'g', market_date: '2026-08-27' },
  });
  assert.equal(base.companies[0].pct, -1.1918);
  const v = screen(base);
  assert.equal(v.rows[0].pct, '-1.19%');
});

test('a missing move stays missing rather than becoming zero per cent', async () => {
  const base = await liveFrom({
    'companies.json': { companies: [{ ticker: 'X', name_en: 'X', sector: 'S' }] },
    'market.json': { date: '2026-08-27', stocks: { X: { close: 1 } } },
    'manifest.json': {},
  });
  assert.equal(base.companies[0].pct, null);
  assert.equal(screen(base).rows[0].pct, '—');
});

test('market cap is whole pounds, printed at a scale a person can read', () => {
  const c = new Component({});
  // The design divided by a thousand and suffixed "B", turning COMI's
  // 474,267,676,058 into "474267676.1B" — not a quantity at any scale.
  assert.equal(c.money(474267676058), '474.3bn');
  assert.equal(c.money(273816133123), '273.8bn');
  assert.equal(c.money(4190000000), '4.19bn');
  assert.equal(c.money(812000000), '812m');
  assert.equal(c.money(19043202), '19.0m');
  for (const empty of [null, undefined, 0, -5, NaN, Infinity, 'x']) {
    assert.equal(c.money(empty), '—', `money(${String(empty)}) should be a dash`);
  }
});

/* ── things that were rendering the wrong string ───────────────────────── */

const NEWSDOC = {
  sources: [{ id: 'alborsa', name: 'Al Borsa', name_ar: 'جريدة البورصة' },
            { id: 'hapi', name: 'Hapi Journal', name_ar: 'حابي' }],
  merged: 56, dropped_for_advice: 1,
  unavailable: [{ name: 'Mubasher' }, { name: 'Zawya' }],
  items: [
    { id: 'a', headline: 'عنوان', headline_en: 'A headline', published: '2026-08-28T10:00:00Z',
      event: 'results', event_label: 'Results', event_label_ar: 'نتائج', weight: 'named',
      sources: [{ id: 'alborsa', link: 'https://alborsaanews.com/a' }, { id: 'hapi', link: 'https://h/a' }],
      tickers: ['COMI', 'NOPE'] },
    { id: 'b', headline: 'ثان', published: '2026-08-28T09:00:00Z',
      event: 'other', event_label: 'Other', weight: 'market',
      sources: [{ id: 'hapi', link: 'https://h/b' }], tickers: [] },
  ],
};

test('the source pill names the outlet, not its slug', async () => {
  // Each item's `sources` entry carries only {id, link}; the names live once
  // at the top of the document. Without the join, `source.name || source.id`
  // always fell through and every card shouted ALBORSA, HAPI, ALMAL.
  const real = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => NEWSDOC });
  try {
    const [first, second] = await data.news();
    assert.equal(first.source, 'Al Borsa · Hapi Journal');   // both outlets credited
    assert.equal(first.sourceAr, 'جريدة البورصة · حابي');
    assert.equal(first.href, 'https://alborsaanews.com/a');  // link goes to the first
    assert.equal(second.source, 'Hapi Journal');
  } finally { globalThis.fetch = real; }
});

test('the meaningless event chip is not drawn', async () => {
  const real = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => NEWSDOC });
  try {
    const [results, other] = await data.news();
    assert.equal(results.hasKind, true);
    assert.equal(other.hasKind, false);      // "Other" is the event on 257 of 400
    assert.equal(other.kindAr, '');          // and never the English word in Arabic
  } finally { globalThis.fetch = real; }
});

test('the English headline is used where the cache has reached it', async () => {
  const real = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => NEWSDOC });
  try {
    const [a, b] = await data.news();
    assert.equal(a.headline, 'A headline');
    assert.equal(a.headlineAr, 'عنوان');
    assert.equal(b.headline, 'ثان');         // untranslated: the Arabic stands
  } finally { globalThis.fetch = real; }
});

test('a ticker pill opens the company, and only one the directory holds', () => {
  const feed = [{ kind: 'K', headline: 'H', source: 'S',
                  tickers: [{ ticker: 'AAAA' }, { ticker: 'NOPE' }] }];
  const [card] = screen({ ...LIVE, feed }).feed;
  // The design's pills carry an onClick; the live mapper emitted {ticker} only,
  // and dc.js attaches nothing to a non-function — so every pill was inert and
  // looked exactly like the demo's working ones.
  assert.equal(card.tickers.length, 1, 'a pill was offered for a company we do not hold');
  assert.equal(card.tickers[0].ticker, 'AAAA');
  assert.equal(typeof card.tickers[0].go, 'function');
});

test('the feed says where it came from and what it withheld', () => {
  const v = screen({ ...LIVE, feed: [{ kind: 'K', headline: 'H', source: 'S', tickers: [] }],
    newsProvenance: { outlets: ['Al Borsa', 'Hapi Journal'], outletsAr: ['جريدة البورصة', 'حابي'],
                      merged: 56, withheld: 1, unreachable: ['Mubasher', 'Zawya'] } });
  assert.match(v.feedProvenance, /Headlines from Al Borsa, Hapi Journal/);
  assert.match(v.feedProvenance, /56 duplicates merged/);
  // The §8 sentence, in the app's words. Not to be reworded.
  assert.match(v.feedProvenance, /1 withheld for carrying a recommendation/);
  assert.match(v.feedProvenance, /Not reachable today: Mubasher, Zawya/);
  assert.equal(screen({ ...LIVE, feed: [] }).feedProvenance, '');
});

test('a signal is a sentence, not the wire enum', () => {
  const signals = {
    streaks: [{ kind: 'back_to_profit', period: 'Q3 2025', run: 4, since: '2024-09-30',
                filed: '2026-01-13', id: 'egx-282099', link: 'https://egx/1' }],
    firsts: [{ label: 'capital increase', gap_days: 3150, date: '2026-08-26',
               previous: '2018-01-10', id: 'egx-1' }],
    quiet: { silent_days: 2543, typical_gap: 6, last_filed: '2019-09-11' },
  };
  const v = screen({ ...LIVE, signals });
  // It printed "0.137 Q1 2026" under a chip reading `back_to_profit`, with a
  // blank line beneath from a `stamp` nothing produced.
  assert.equal(v.signals[0].title, 'Q3 2025 returned to profit after 4 loss-making reported periods.');
  assert.equal(v.signals[0].because, 'The run had held since 2024.');
  assert.equal(v.signals[0].stamp, '2026-01-13 · egx-282099');
  assert.equal(v.signals[1].title, 'Its first capital increase in 9 years.');   // not 3150 days
  assert.match(v.signals[2].title, /filed nothing for 2543 days/);
  // §8: a count off the record must say it is not an instruction.
  assert.match(v.signalFootnote, /not a signal to sell/);
  assert.match(v.signalFootnote, /not a signal to buy/);
  assert.equal(screen(LIVE).signalFootnote, '');
});

test('a filed statement says when it was filed', () => {
  // logic.js read `filed_on` — 275 rows across the whole archive — while the
  // documents carry `filed` on 8,608. Nearly every expanded period printed
  // "Filed undefined".
  const fins = [{ period: 'FY 2014', filed: '2014-09-08', filing_id: 'egx-130053',
                  source: 'https://www.mubasher.info/x', revenue: 1 }];
  const [row] = screen({ ...LIVE, fins }).fins;
  assert.equal(row.filedOn, 'Filed 2014-09-08');
  // And attributed to the document it actually came from — a balance sheet
  // transcribed from Mubasher is not an exchange announcement.
  assert.equal(row.source, 'https://www.mubasher.info/x');
  const [none] = screen({ ...LIVE, fins: [{ period: 'X', revenue: 1 }] }).fins;
  assert.equal(none.filedOn, '', 'a row with no filing date must say nothing');
});

/* ── published, and previously never opened ────────────────────────────── */

/** exchange()/sectors()/calendar() over the real documents on disk. */
async function fromDisk(fn) {
  const { readFile } = await import('node:fs/promises');
  const real = globalThis.fetch;
  globalThis.fetch = async (url) => ({
    ok: true, status: 200,
    json: async () => JSON.parse(await readFile(
      new URL('../../public/data/v1/' + String(url).replace('/data/v1/', ''), import.meta.url), 'utf8')),
  });
  try { return await fn(); } finally { globalThis.fetch = real; }
}

test('the pound and the metals reach the Exchange screen', async () => {
  // rates/latest.json publishes five currencies and two metals. exchange()
  // read `indices` and `world` and stopped, so the screen showed the indices
  // and nothing about the currency in anybody's pocket.
  const ex = await fromDisk(() => data.exchange());
  const by = Object.fromEntries(ex.rates.map((r) => [r.label, r]));
  assert.ok(by['US dollar'], 'the dollar is not on the screen');
  assert.equal(by['US dollar'].unit, 'EGP');
  assert.match(by['US dollar'].plain, /costs .* pounds/);
  // Per gram, which is what an Egyptian shop window quotes — not per ounce.
  assert.equal(by.Gold.unit, 'EGP/g');
  assert.ok(by.Gold.karats.length >= 3, 'gold has no karat breakdown');
  assert.match(by.Gold.karats.map((k) => k.karat).join(' '), /21k/);
  // And each index keeps its own published sentence.
  assert.match(by['EGX 30'].plain, /EGX 30 (rose|fell)/);
});

test('a price with no session move gets no arrow rather than a red one', () => {
  const rates = [{ label: 'EGX 30', value: '1', pct: '-0.31%', color: 'var(--down)' },
                 { label: 'US dollar', value: '50.25', pct: '', color: 'var(--ink)' }];
  const [index, currency] = screen({ ...LIVE, rates }).ratesArrowed;
  assert.equal(index.arrow, '↘');
  assert.equal(currency.arrow, '', 'a currency has no session move to point at');
  assert.equal(currency.tint, 'var(--sunk)');
});

test('a macro reading carries its unit, its chain and how much it actually moves', async () => {
  const ex = await fromDisk(() => data.exchange());
  const v = screen({ ...LIVE, macro: ex.macro });
  const suez = v.macro.find((m) => /Suez/.test(m.label));
  assert.equal(suez.unit, 'vessels');          // "37" alone is a number waiting to be misread
  assert.equal(suez.hasUnit, true);
  assert.match(suez.chain, /dollars/);         // why a canal reaches an Egyptian share
  // Most of these barely move with the exchange, and saying so beats leaving a
  // reader to assume a connection the number denies.
  assert.match(suez.link, /Barely moved with the EGX 30 −0\.02 over 170 sessions\./);
  const fdi = v.macro.find((m) => /Foreign direct/.test(m.label));
  assert.equal(fdi.value, '15.45bn', 'a raw 15452700000 does not fit a cell or a head');
});

test('a sector card is not four blank lines', async () => {
  // The mapper emitted `companies`, `lead` and `pe`; the card binds `count`,
  // `read` and `medianPe`. Every card rendered its title and its bar over
  // nothing at all.
  const secs = await fromDisk(() => data.sectors());
  const finance = secs.find((s) => s.name === 'Finance');
  assert.equal(finance.count, '83');
  assert.equal(finance.upCount + finance.downCount + finance.flatCount, 83);
  assert.ok(finance.read.length > 40);
  assert.equal(finance.medianPe, '10.4');
  assert.match(finance.standout, /^[A-Z]+ · \d+\/\d+$/);
  // The per-sector document was never opened: eight medians and seven or eight
  // movement rows per sector, published and unread.
  assert.ok(finance.medians.length >= 6, 'no medians');
  assert.ok(finance.metrics.length >= 6, 'no movement rows');
  // Named, not keyed: a chip is too small to explain "debt_equity".
  const keys = finance.medians.map((m) => m.key);
  assert.ok(keys.includes('Debt to equity'), keys.join(','));
  assert.ok(!keys.some((k) => k.includes('_')), 'a wire key reached the screen');
});

test('a calendar entry says what it is, and an estimate says it is one', async () => {
  const cal = await fromDisk(() => data.calendar());
  const v = screen({ ...LIVE, filedEvents: cal.filed, expectedEvents: cal.expected });
  // Five kinds in the document; the site showed none, so a dividend payment
  // and a rights issue closing were identical-looking rows.
  const kinds = new Set(v.filedEvents.map((e) => e.kind));
  assert.ok(kinds.size > 1, `only one kind rendered: ${[...kinds]}`);
  assert.ok([...kinds].every((k) => k && !k.includes('_')), [...kinds].join(','));
  // An estimate names the window it sits in and how many past filings drew it.
  const est = v.expectedEvents.find((e) => e.basis);
  assert.match(est.basis, /Filed between \d{4}-\d{2}-\d{2} and \d{4}-\d{2}-\d{2} in \d+ past years\./);
  assert.equal(v.filedEvents.every((e) => !e.basis), true, 'a filed event is not an estimate');
});

test('Home says how widely the market moved, not just how far', async () => {
  // market-history.json records breadth for 26 of its 260 sessions, the most
  // recent included, and nothing had ever read it. Three index cards say what
  // the market did on average; only this says how many shares agreed.
  const att = await fromDisk(() => data.attention());
  assert.ok(att.breadth, 'no breadth found in the archive');
  const v = screen({ ...LIVE, breadth: att.breadth });
  assert.equal(v.hasBreadth, true);
  assert.match(v.breadthLine, /\d+ rose, \d+ fell and \d+ held, of \d+ counted in the .+ session\./);
  assert.equal(v.breadthBars.length, 3);
  // The bars are a share of what was counted, not of the directory.
  const total = v.breadthBars.reduce((n, b) => n + parseInt(b.width, 10), 0);
  assert.ok(Math.abs(total - 100) <= 2, `bars sum to ${total}%`);
  assert.equal(screen(LIVE).hasBreadth, false);
});

test('breadth from an archive that never counted it is absent, not zero', () => {
  assert.equal(data.breadthOf(null), null);
  assert.equal(data.breadthOf({ sessions: [{ date: '2026-01-01' }] }), null);
  assert.equal(data.breadthOf({ sessions: [{ breadth: { counted: 0 } }] }), null);
  // The most recent session that counted wins, not the last session.
  const b = data.breadthOf({ sessions: [
    { date: '2026-01-01', breadth: { up: 1, down: 2, flat: 3, counted: 6 } },
    { date: '2026-01-02' },
  ] });
  assert.equal(b.date, '2026-01-01');
  assert.equal(b.counted, 6);
});

test('the company chart gets the long series, not the short one', async () => {
  // The company document carries 260 sessions and prices/ carries 1,500. The
  // chart offers a 5Y range, which was showing the same 260 sessions as 1Y.
  const co = await fromDisk(() => data.company('ACGC'));
  assert.ok(co.series.length > 1000, `only ${co.series.length} sessions`);
  assert.ok(co.series[0].date < '2022-01-01', co.series[0].date);
});

test('the month pills are the months the archive holds', async () => {
  // Four hardcoded strings from the design — Jun to Sep 2026 — and clicking
  // one changed a state field nothing read.
  const months = await fromDisk(() => data.filedMonths());
  assert.ok(months.length >= 12, `${months.length} months`);
  assert.match(months[0].id, /^\d{4}-\d{2}$/);
  assert.ok(months[0].count > 100);
  const v = screen({ ...LIVE, filedMonths: months });
  assert.equal(v.months.length, months.length);
  assert.match(v.months[0].label, /^[A-Z][a-z]+t? \d{4}$/);
  assert.equal(v.months[0].count, months[0].count);
});

test('an open month shows that month, and says how much of it', async () => {
  const items = await fromDisk(() => data.filedMonth('2026-07'));
  assert.ok(items.length > 1000, `${items.length} filings`);
  const c = new Component({ accent: 'var(--accent)' });
  c.setData({ ...LIVE, filedArchive: items, filedArchiveMonth: '2026-07' });
  c.state.month = '2026-07';
  const v = c.renderVals();
  assert.equal(v.filedEvents.length, 60);
  // Sixty of 1,458 fit a column; saying which sixty is the difference between
  // a sample and a claim.
  assert.match(v.archiveNote, /Showing 60 of \d{4} filings published in Jul 2026\./);
  assert.ok(v.filedEvents[0].ticker.length >= 3);
  // A month the reader has not opened must not borrow another month's rows.
  c.state.month = '2026-06';
  assert.equal(c.renderVals().archiveNote, '');
});

/* ── what traded unusually ─────────────────────────────────────────────── */

/** A directory + quote pair, the shape live() reads. */
const busyDocs = (rows) => ({
  'companies.json': { companies: rows.map((r) => ({
    ticker: r.t, name_en: r.t, sector: 'S', median_volume_20d: r.median })) },
  'market.json': { date: '2026-08-27', stocks: Object.fromEntries(
    rows.map((r) => [r.t, { close: 10, change_percent: 0.01, volume: r.volume }])) },
  'manifest.json': {},
});

test('the busiest block is measured against each company\'s own normal', async () => {
  const base = await liveFrom(busyDocs([
    { t: 'AAAA', volume: 1000, median: 100 },    // 10.0x
    { t: 'BBBB', volume: 300, median: 100 },     // 3.0x
    { t: 'CCCC', volume: 199, median: 100 },     // 1.99x — under the line
    { t: 'DDDD', volume: 5000, median: 5000 },   // 1.0x
  ]));
  const v = screen(base);
  assert.deepEqual(v.busy.map((r) => r.ticker), ['AAAA', 'BBBB']);
  // Twice the median is the line; 1.99 is not "nearly" anything.
  assert.equal(v.busy[0].kicker, 'Traded 10.0× its usual volume');
  assert.equal(v.hasBusy, true);
  assert.equal(v.noBusy, false);
});

test('a company with no median is not counted as quiet', async () => {
  // 230 of the 282 listed carry both numbers. The other 52 cannot be measured
  // this way, and treating an absent median as a calm day would be inventing
  // an observation.
  const base = await liveFrom(busyDocs([
    { t: 'AAAA', volume: 1000, median: null },
    { t: 'BBBB', volume: 1000, median: 0 },
  ]));
  assert.equal(base.companies.every((c) => c.rv === null), true);
  const v = screen(base);
  assert.deepEqual(v.busy, []);
  // Nothing measurable means the block says nothing, not "nothing unusual".
  assert.equal(v.noBusy, false);
  assert.equal(v.busyNote, '');
});

test('a quiet day says so', async () => {
  const base = await liveFrom(busyDocs([{ t: 'AAAA', volume: 100, median: 100 }]));
  const v = screen(base);
  assert.deepEqual(v.busy, []);
  assert.equal(v.noBusy, true, 'a measured, quiet market must say "nothing unusual today"');
});

test('§8 the threshold is named as ours, not as the exchange\'s', () => {
  const base = { ...LIVE, companies: [{ ticker: 'AAAA', name: { en: 'A', ar: 'أ' }, sector: 'S',
                                        close: 10, pct: 1, rv: 4 }] };
  const v = screen(base);
  // The block must not present 2× as a fact about the market. Nobody publishes
  // an official line, and saying whose line it is is the whole disclosure.
  assert.match(v.busyNote, /median of the last 20 sessions/);
  // Curly apostrophes: the sentence is the app's, carried over character for
  // character rather than retyped.
  assert.match(v.busyNote, /this app\u2019s line rather than the exchange\u2019s/);
  assert.match(v.busyNote, /without anything being wrong/);
  // And it says what happened, never what to do about it.
  assert.ok(!DIRECTIVE.test(v.busyNote), v.busyNote);
  assert.ok(!DIRECTIVE.test(v.busy[0].kicker));
});

test('the busiest rows sit above the movers on Home', async () => {
  const { readFile } = await import('node:fs/promises');
  const t = await readFile(new URL('../../public/esthmr/template.html', import.meta.url), 'utf8');
  const busy = t.indexOf('{{ L.busiest }}');
  const movers = t.indexOf('{{ L.movers }}');
  assert.ok(busy > 0 && movers > 0, 'a block is missing');
  assert.ok(busy < movers, 'the movers come first — a big move on ordinary volume is just a price');
  // Both belong to ONE column. Three children in a two-column grid pushes the
  // movers into the rail and wraps the rail below it — which is exactly what
  // happened the first time this block went in.
  const grid = t.indexOf('grid-template-columns:minmax(0,1.4fr) minmax(280px,1fr)');
  assert.ok(grid > 0 && grid < busy, 'the Home grid moved');
  assert.match(t.slice(grid, busy), /flex-direction:column/,
    'the two sections are separate grid children');
});

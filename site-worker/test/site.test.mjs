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

const { Component, DIRECTIVE } = await import('../../public/esthmr/logic.js');
const data = await import('../../public/esthmr/data.js');

/** A component whose assertions are written in English.
 *
 * The site's default is Arabic — right for most readers of an Egyptian
 * exchange — so a test that checks an English string has to ask for English
 * rather than inherit it. Tests about Arabic set `lang` themselves.
 */
function fresh(lang = 'en') {
  const c = new Component({ accent: 'var(--accent)' });
  c.state.lang = lang;
  return c;
}

/** The component as main.js drives it: construct, set a dataset, read a screen. */
function screen(dataset, lang = 'en') {
  const c = fresh();
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
  const c = fresh();
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
  assert.equal(meta.News, '');          // no feed loaded, so no count
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
    // The app's own explanation of what price-to-book IS. It uses "bargain"
    // to WITHHOLD the judgement — "only a bargain if the assets are
    // productive" — which is teaching the word rather than applying it. The
    // app's forbidden list governs verdict labels; this is not one.
    v.L.revPbBody,
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

test('a label and the figure beside it keep the space between them', async () => {
  // `{{ label }} <span>{{ figure }}</span>` is six places in the template, and
  // every one of them rendered as one word: "Due within a yearEGP 4.2bn",
  // "data_versiondemo". The type-preserving branch matched the whitespace
  // around a lone binding and nothing put it back.
  const { interpolate } = await import('../../public/esthmr/dc.js');
  assert.equal(interpolate('{{ a }} ', { a: 'data_version' }), 'data_version ');
  assert.equal(interpolate(' {{ a }}', { a: 'x' }), ' x');
  assert.equal(interpolate('{{ a }} {{ b }}', { a: 'x', b: 'y' }), 'x y');

  // What the branch is FOR still holds: a handler stays callable, padding or
  // no padding, because `onClick=" {{ go }} "` must not become a string.
  const go = () => 'went';
  assert.equal(interpolate('{{ go }}', { go }), go);
  assert.equal(interpolate('  {{ go }}  ', { go }), go);
  // And a number stays a number when nothing is around it.
  assert.equal(interpolate('{{ n }}', { n: 0 }), 0);

  // Every place in the template that separates a binding from a sibling
  // element with a space still gets one.
  const { readFile } = await import('node:fs/promises');
  const template = await readFile(new URL('../../public/esthmr/template.html', import.meta.url), 'utf8');
  const separated = [...template.matchAll(/>\s*\{\{((?:(?!\}\})[\s\S])*)\}\} </g)];
  assert.ok(separated.length >= 6, `only ${separated.length} of these found`);
  for (const [, expr] of separated) {
    assert.match(interpolate(`{{${expr}}} `, { [expr.trim().split('.')[0]]: mockFor(expr) }), / $/);
  }
});

/** A stand-in for whatever the binding reads, deep enough to resolve it. */
function mockFor(expr) {
  const deep = { toString: () => 'value' };
  return new Proxy(deep, { get: (t, k) => (k in t ? t[k] : deep) });
}

/* ── the price on the screen, and how old it is ────────────────────────── */

/** The three documents live() reads, plus whatever the quotes feed answers. */
function served({ feed, market }) {
  const docs = {
    'companies.json': { companies: [
      { ticker: 'AAAA', name_en: 'A', name_ar: 'أ', sector: 'Banks', market_cap: 100, pe: 8 },
      { ticker: 'BBBB', name_en: 'B', name_ar: 'ب', sector: 'Banks', market_cap: 200, pe: 9 },
    ] },
    'market.json': market,
    'manifest.json': { generated_at: '2026-08-30T07:19:23Z', data_version: 'v1' },
  };
  globalThis.fetch = async (url) => {
    if (String(url).includes('quotes.thebarbarianproject.com')) {
      if (!feed) throw new Error('feed down');
      return new Response(JSON.stringify(feed), { status: 200 });
    }
    const name = String(url).split('/data/v1/')[1];
    return new Response(JSON.stringify(docs[name]), { status: 200 });
  };
  return () => { delete globalThis.fetch; };
}

const RUNNING = {
  date: '2026-08-30', captured_at: '2026-08-30T07:19:23.175Z', is_close: false,
  stocks: {
    AAAA: { close: 10, change_percent: 0.011918, volume: 100 },
    BBBB: { close: 20, change_percent: -0.025, volume: 200 },
  },
};

const FEED = {
  as_of: '2026-08-30T10:16:12.506Z', delay_seconds: 900, stale: false,
  session: { open: true }, count: 1,
  quotes: { AAAA: { c: 11.5, ch: 2.5781, v: 654737, pc: 11.21 } },
};

test('during a session the price on screen is the live one, in the right units', async () => {
  // The documents state a move as a FRACTION and the vendor as a PERCENT.
  // Mixing them multiplies every move on the exchange by a hundred, which is
  // the failure the merge exists to prevent — so it is checked from both.
  const stop = served({ feed: FEED, market: RUNNING });
  try {
    const d = await data.live();
    const a = d.companies.find((c) => c.ticker === 'AAAA');
    assert.equal(a.close, 11.5);
    assert.ok(Math.abs(a.pct - 2.5781) < 1e-9, `pct was ${a.pct}`);
    assert.equal(a.volume, 654737);
    // A company the feed does not carry keeps the published capture, still in
    // percent: 0.011918 of one is 1.19 per cent.
    const b = d.companies.find((c) => c.ticker === 'BBBB');
    assert.equal(b.close, 20);
    assert.ok(Math.abs(b.pct + 2.5) < 1e-9, `pct was ${b.pct}`);
    // And nothing struck at build time moves with it: a multiple computed
    // against the published close must not be shown beside a different price
    // as though it were the same fact.
    assert.equal(a.pe, 8);
  } finally { stop(); }
});

test('a feed that is down, stale or shut costs freshness and nothing else', async () => {
  for (const feed of [null,
                      { ...FEED, stale: true },
                      { ...FEED, session: { open: false } }]) {
    const stop = served({ feed, market: RUNNING });
    try {
      const d = await data.live();
      const a = d.companies.find((c) => c.ticker === 'AAAA');
      assert.equal(a.close, 10, 'fell back to the published capture');
      assert.ok(Math.abs(a.pct - 1.1918) < 1e-9);
      assert.equal(d.livePrices, false);
    } finally { stop(); }
  }
});

test('the session line says where the prices came from and when', async () => {
  const c = fresh();

  // Settled closes are the session's last word and need no clock.
  c.setData({ ...LIVE, isClose: true });
  assert.equal(c.renderVals().sessionState, c.renderVals().L.sessionClose);

  // The two flags disagree exactly when it matters. `is_close` belongs to the
  // last published capture, and the first hours of a session are spent under
  // yesterday's document — so a live feed over a closed capture was labelled
  // "Closing prices" while the numbers moved. The feed wins.
  c.setData({ ...LIVE, isClose: true, livePrices: true,
              liveAsOf: '2026-08-30T10:16:12.506Z', liveDelaySeconds: 900 });
  assert.match(c.renderVals().sessionState, /15 min/);
  assert.equal(c.renderVals().sessionColor, 'var(--accent)');

  // A running session on the published capture says how old it is. It used to
  // say only "prices not final" over a number three hours old.
  c.setData({ ...LIVE, isClose: false, livePrices: false,
              capturedAt: '2026-08-30T07:19:23.175Z' });
  let line = c.renderVals().sessionState;
  assert.match(line, /10:19/, `Cairo time, not UTC — got "${line}"`);

  // And on the feed it says the delay as well, because a fifteen-minute price
  // read four minutes ago is not a price from four minutes ago.
  c.setData({ ...LIVE, isClose: false, livePrices: true,
              liveAsOf: '2026-08-30T10:16:12.506Z', liveDelaySeconds: 900 });
  line = c.renderVals().sessionState;
  assert.match(line, /15 min/);
  assert.match(line, /13:16/);
});

/* ── the heat map ──────────────────────────────────────────────────────── */

const { squarify, heatColour } = await import('../../public/esthmr/logic.js');

test('the treemap fills its box exactly, once, in proportion', async () => {
  // Three properties, all invisible on a screenshot and all easy to break:
  // every tile inside the box, no two overlapping, and area proportional to
  // value. A map that fails the third is a picture that lies about size.
  const items = Array.from({ length: 60 }, (_, i) => ({ id: `T${i}`, value: Math.pow(1.3, 60 - i) }));
  const tiles = squarify(items, 0, 0, 100, 100);
  assert.equal(tiles.length, 60);
  const total = items.reduce((sum, i) => sum + i.value, 0);
  for (const t of tiles) {
    assert.ok(t.x >= -1e-9 && t.y >= -1e-9 && t.x + t.w <= 100 + 1e-9 && t.y + t.h <= 100 + 1e-9,
      `${t.id} escapes the box`);
    assert.ok(Math.abs((t.w * t.h) / 10000 - t.value / total) < 1e-9, `${t.id} is the wrong size`);
  }
  const area = tiles.reduce((sum, t) => sum + t.w * t.h, 0);
  assert.ok(Math.abs(area - 10000) < 1e-6, `the tiles cover ${area}, not the box`);
  for (let i = 0; i < tiles.length; i++) {
    for (let j = i + 1; j < tiles.length; j++) {
      const a = tiles[i], b = tiles[j];
      const over = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 1e-9
        && Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > 1e-9;
      assert.ok(!over, `${a.id} and ${b.id} overlap`);
    }
  }
  // A degenerate box draws nothing rather than throwing or drawing rubbish.
  assert.deepEqual(squarify(items, 0, 0, 0, 50), []);
  assert.deepEqual(squarify([{ id: 'x', value: 0 }], 0, 0, 100, 100), []);
});

test('no trade and no change are not the same colour', () => {
  // A company that did not trade has no price to move, and painting it the
  // neutral colour a flat close gets makes two opposite facts identical.
  assert.equal(heatColour(null), 'var(--hmNone)');
  assert.equal(heatColour(0), 'var(--hmZ)');
  assert.notEqual(heatColour(null), heatColour(0));
  assert.equal(heatColour(-4), 'var(--hmD3)');
  assert.equal(heatColour(4), 'var(--hmU3)');
  assert.equal(heatColour(-0.2), 'var(--hmD1)');
});

/** A directory wide enough to make sector blocks of very unequal size. */
function heatData(extra) {
  const sectors = ['Finance', 'Utilities', 'Miscellaneous', 'Electronic Technology'];
  const companies = [];
  for (let i = 0; i < 24; i++) {
    companies.push({
      ticker: `T${String(i).padStart(2, '0')}`,
      name: { en: `Company ${i}`, ar: `شركة ${i}` },
      // Four orders of magnitude, which is the exchange's own spread: one
      // sector ends up a fraction of a per cent wide.
      sector: i < 12 ? sectors[0] : sectors[1 + (i % 3)],
      close: 10, pct: (i % 7) - 3, cap: Math.pow(9, 6 - (i % 6)) * (i < 2 ? 900 : 1),
      pe: 8,
    });
  }
  return { demo: false, companies, series: [], fins: [], marketDate: '2026-08-30', ...extra };
}

test('every company the map counts is a company the map draws', () => {
  // The gap between sector blocks was a constant, and two of the exchange's
  // twenty sectors come out 0.585% wide — narrower than the gap on both
  // sides. Their width went negative, clamped to zero, and those companies
  // disappeared from a map whose own caption said it had drawn them.
  const c = fresh();
  c.setData(heatData());
  c.state.screen = 'heat';
  const v = c.renderVals();
  assert.equal(v.heatTiles.length, 24, v.heatDrawn);
  assert.match(v.heatDrawn, /All 24/);
  const drawn = new Set(v.heatTiles.map((t) => t.ticker));
  assert.equal(drawn.size, 24, 'a company drawn twice is a company counted twice');
  for (const t of v.heatTiles) {
    assert.ok(parseFloat(t.width) > 0 && parseFloat(t.height) > 0, `${t.ticker} has no size`);
  }
});

test('a tile too small to read opens its sector, not a company nobody chose', () => {
  // On the whole map the smallest names are a few pixels across. A click there
  // used to land on a company the reader could not read and did not choose,
  // with no way to tell whether they hit the one they aimed at.
  const c = fresh();
  c.setData(heatData());
  c.state.screen = 'heat';
  const v = c.renderVals();
  const click = (w, h) => ({ currentTarget: { getBoundingClientRect: () => ({ width: w, height: h }) } });

  const tile = v.heatTiles[v.heatTiles.length - 1];
  tile.go(click(9, 6));
  assert.equal(c.renderVals().heatZoomed, true, 'a 9x6 tile should have zoomed');
  assert.equal(c.renderVals().screen === 'company', false);

  // Zoomed, the same tile is readable and opens its company — the second click
  // is the one that means what it says.
  const big = c.renderVals().heatTiles.find((t) => t.ticker === tile.ticker);
  big.go(click(120, 80));
  assert.equal(c.state.screen, 'company');
  assert.equal(c.state.ticker, tile.ticker);

  // A tile a finger can hit was never the problem and still opens directly.
  const fresh2 = fresh();
  fresh2.setData(heatData());
  fresh2.state.screen = 'heat';
  const biggest = fresh2.renderVals().heatTiles[0];
  biggest.go(click(220, 180));
  assert.equal(fresh2.state.screen, 'company');
  assert.equal(fresh2.state.ticker, biggest.ticker);

  // And a click with no box to measure — a keyboard, a test, a browser that
  // will not say — opens the company rather than silently doing something else.
  const fresh3 = fresh();
  fresh3.setData(heatData());
  fresh3.state.screen = 'heat';
  fresh3.renderVals().heatTiles[0].go();
  assert.equal(fresh3.state.screen, 'company');
});

test('a company with no market value is named, not drawn at a made-up size', () => {
  const data0 = heatData();
  data0.companies[5].cap = null;
  data0.companies[6].cap = 0;
  const c = fresh();
  c.setData(data0);
  c.state.screen = 'heat';
  const v = c.renderVals();
  assert.equal(v.heatTiles.length, 22);
  assert.match(v.heatDrawn, /22 of 24/);
  assert.match(v.heatDrawn, /2 carry no market value/);
});

test('the index tabs are the exchange\'s membership or they do not exist', () => {
  // "The thirty biggest by market value" is a plausible rule and not the one
  // the exchange uses. A list computed here under a real index's name is an
  // invented fact about a real index, so with no document there is no tab.
  const bare = fresh();
  bare.setData(heatData());
  bare.state.screen = 'heat';
  let v = bare.renderVals();
  assert.deepEqual(v.heatTabs.map((t) => t.label), ['All EGX']);
  assert.equal(v.noHeatIndex, true);
  assert.equal(v.hasHeatSource, false);

  const c = fresh();
  c.setData(heatData({ indexMembers: [{ id: 'EGX30', label: 'EGX 30', labelAr: 'إيجي إكس 30',
    count: 3, asOf: '2026-08-30', carried: false, tickers: ['T00', 'T01', 'NOPE'] }] }));
  c.state.screen = 'heat';
  c.state.heat = 'EGX30';
  v = c.renderVals();
  assert.deepEqual(v.heatTabs.map((t) => t.label), ['All EGX', 'EGX 30']);
  assert.deepEqual(v.heatTiles.map((t) => t.ticker).sort(), ['T00', 'T01']);
  // A constituent this directory has never heard of is named rather than
  // quietly dropped from a picture captioned with the index's name.
  assert.equal(v.hasHeatAbsent, true);
  assert.match(v.heatAbsent, /NOPE/);
  assert.match(v.heatSource, /as published by the exchange/);

  // A list held from an earlier day says so instead of passing for today's.
  c.setData(heatData({ indexMembers: [{ id: 'EGX30', label: 'EGX 30', labelAr: 'إيجي إكس 30',
    count: 2, asOf: '2026-08-24', carried: true, tickers: ['T00', 'T01'] }] }));
  assert.match(c.renderVals().heatSource, /Held from 24 Aug 2026/);
});

test('zooming a sector changes the box, never the arithmetic', () => {
  // On the whole exchange the smallest tiles are a hairline, because the map
  // is to scale over a 25,000:1 spread. Inside one sector the same companies
  // come back at a readable size — and they have to come back at the same
  // RELATIVE size, or the zoom would be redrawing the market rather than
  // magnifying it.
  const c = fresh();
  c.setData(heatData());
  c.state.screen = 'heat';
  const whole = c.renderVals();
  const ratioIn = (v, a, b) => {
    const A = v.heatTiles.find((t) => t.ticker === a);
    const B = v.heatTiles.find((t) => t.ticker === b);
    return (parseFloat(A.width) * parseFloat(A.height))
      / (parseFloat(B.width) * parseFloat(B.height));
  };
  const before = ratioIn(whole, 'T00', 'T01');

  const block = whole.heatBlocks.find((b) => b.label === 'Finance');
  block.zoom();
  const zoomed = c.renderVals();
  assert.equal(zoomed.heatZoomed, true);
  assert.equal(zoomed.heatZoomLabel, 'Finance');
  assert.equal(zoomed.heatTiles.length, 12, 'only that sector is drawn');
  // Zoomed, the areas are the SQUARE ROOT of value, so a sector's smaller
  // companies are large enough to read. That is a deliberate break with the
  // whole map's contract and the screen says so — what must survive it is the
  // ORDER, and the exact relationship, which is checkable: an area ratio of
  // nine becomes three.
  const after = ratioIn(zoomed, 'T00', 'T01');
  assert.ok(Math.abs(after - Math.sqrt(before)) < 1e-3,
    `expected the root of ${before}, got ${after}`);
  assert.ok(after > 1, 'the bigger company is still the bigger tile');
  const order = (v) => v.heatTiles.map((t) => t.ticker);
  assert.deepEqual(order(zoomed).slice(0, 3), ['T00', 'T01', 'T06'],
    'the root reordered the sector');
  assert.ok(zoomed.heatRootNote.length > 40, 'the screen does not say the scale changed');
  assert.equal(whole.heatRootNote, '', 'the whole map must stay proportional');
  // And the sector now has the whole box rather than its share of it.
  const covered = (v) => v.heatTiles.reduce(
    (sum, t) => sum + parseFloat(t.width) * parseFloat(t.height), 0);
  assert.ok(covered(zoomed) > 9000, `one sector covers ${covered(zoomed)} of 10,000`);
  // And the point of the whole exercise. Strict proportionality left 27 of
  // Finance's 80 companies too small to carry their own ticker and two of them
  // five pixels wide; the root leaves two and nothing under eight. Asserted as
  // an improvement rather than a guarantee: over a wide enough spread — this
  // fixture's is far wider than any real sector's — some tail always stays
  // small, and a test that promised otherwise would be promising something
  // arithmetic cannot deliver.
  const finance = new Set(zoomed.heatTiles.map((t) => t.ticker));
  const unlabelled = (v) => v.heatTiles.filter(
    (t) => finance.has(t.ticker) && !t.showTicker).length;
  assert.ok(unlabelled(zoomed) < unlabelled(whole),
    `${unlabelled(whole)} unreadable before, ${unlabelled(zoomed)} after`);
  assert.ok(unlabelled(zoomed) <= zoomed.heatTiles.length / 4,
    'most of a zoomed sector should be readable');
  assert.match(zoomed.heatDrawn, /12 in Finance/);

  // And it comes back out — by the same control, and by the crumb.
  zoomed.heatBlocks[0].zoom();
  assert.equal(c.renderVals().heatZoomed, false);
  block.zoom();
  assert.equal(c.renderVals().heatZoomed, true);
  c.renderVals().heatZoomOut();
  assert.equal(c.renderVals().heatZoomed, false);
});

test('changing the index tab does not leave the map zoomed into nothing', () => {
  const c = fresh();
  c.setData(heatData({ indexMembers: [{ id: 'EGX30', label: 'EGX 30', labelAr: 'إيجي إكس 30',
    count: 2, asOf: '2026-08-30', carried: false, tickers: ['T12', 'T13'] }] }));
  c.state.screen = 'heat';
  c.renderVals().heatBlocks.find((b) => b.label === 'Finance').zoom();
  assert.equal(c.renderVals().heatZoomed, true);
  c.renderVals().heatTabs.find((t) => t.label === 'EGX 30').go();
  const v = c.renderVals();
  assert.equal(v.heatZoomed, false, 'a sector the new index has none of would draw an empty box');
  assert.ok(v.heatTiles.length > 0);
});

test('main.js never hands the component two values under one name', async () => {
  // `indices` was already the index CARDS Home draws when the heat map's
  // membership arrived under the same name in the same object literal. The
  // second key wins silently, and Home loses its three level cards.
  const { readFile } = await import('node:fs/promises');
  const main = await readFile(new URL('../../public/esthmr/main.js', import.meta.url), 'utf8');
  for (const [, body] of main.matchAll(/setData\(\{([\s\S]*?)\n\s*\}\);/g)) {
    const keys = [...body.matchAll(/^\s{6}([a-zA-Z_$][\w$]*):/gm)].map((m) => m[1]);
    const seen = new Set();
    for (const key of keys) {
      assert.ok(!seen.has(key), `main.js sets "${key}" twice in one setData`);
      seen.add(key);
    }
  }
});

test('the site opens in Arabic, and remembers being told otherwise', async () => {
  // The exchange is Egyptian and its filings are in Arabic, so an English
  // default made most readers change the language before they could start.
  const c = new Component({ accent: 'var(--accent)' });
  assert.equal(c.state.lang, 'ar');
  c.setData(LIVE);
  assert.equal(c.renderVals().dir, 'rtl');
  assert.equal(c.renderVals().L.marketTitle, screen(LIVE, 'ar').L.marketTitle);

  // A default that cannot be overruled for longer than one visit is not a
  // default, it is an argument — so main.js restores the reader's own choice
  // before the first draw, and writes it when they change it.
  const { readFile } = await import('node:fs/promises');
  const main = await readFile(new URL('../../public/esthmr/main.js', import.meta.url), 'utf8');
  assert.match(main, /localStorage\.getItem\(LANG\)/, 'the choice is never restored');
  assert.match(main, /localStorage\.setItem\(LANG, lastLang\)/, 'the choice is never kept');
  // Restored onto the component BEFORE it is mounted, or the first paint is
  // in the wrong language and then jumps.
  assert.ok(main.indexOf('component.state.lang = chosen') < main.indexOf('mount(template'),
    'the language is restored after the first draw');
  // And both halves are wrapped: a blocked store costs the preference, never
  // the page.
  for (const call of ['getItem(LANG)', 'setItem(LANG, lastLang)']) {
    const at = main.indexOf(call);
    assert.ok(main.lastIndexOf('try {', at) > main.lastIndexOf('} catch', at),
      `${call} is not inside a try`);
  }
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
  // The list is read out of main.js rather than written here, because the one
  // that broke was the one nobody thought to add: `.gate` grew a `display`
  // rule long after the attribute was first set on it.
  const main = await readFile(new URL('../../public/esthmr/main.js', import.meta.url), 'utf8');

  /* The same check for the sign-in sheet, which is built in auth.js and was
     never scanned — so it fell into the identical trap and nobody saw it:
     `.si-step` sets `display: grid`, so `f.hidden = true` flipped an attribute
     and moved nothing, and BOTH steps of the sheet were on screen at once,
     asking for an email and for a six-digit code that had not been sent yet.
     Any class auth.js hides by attribute needs a rule behind it. */
  const auth = await readFile(new URL('../../public/esthmr/auth.js', import.meta.url), 'utf8');
  const byClass = new Set();
  for (const [, cls] of auth.matchAll(/querySelector(?:All)?\('\.([\w-]+)'\)/g)) byClass.add(cls);
  for (const cls of byClass) {
    const styled = new RegExp(`\\.${cls}\\s*\\{[^}]*display\\s*:`).test(css);
    if (!styled) continue;
    // It only matters for a class the code actually hides.
    const hides = new RegExp(`\\.${cls}[\\s\\S]{0,400}?\\.hidden\\s*=`).test(auth)
      || new RegExp(`hidden`).test(auth);
    if (!hides) continue;
    assert.match(css, new RegExp(`\\.${cls}\\[hidden\\]\\s*\\{[^}]*display\\s*:\\s*none`),
      `.${cls} has an author display rule, so "hidden" cannot hide it`);
  }

  const ids = new Set([...main.matchAll(/getElementById\('([\w-]+)'\)\.hidden\s*=/g)].map((m) => m[1]));
  for (const [, id] of main.matchAll(/const (\w+) = document\.getElementById\('([\w-]+)'\)/g)) { /* below */ }
  // `const bar = getElementById('gate'); bar.hidden = …` — resolve the alias.
  const alias = new Map([...main.matchAll(/const (\w+) = document\.getElementById\('([\w-]+)'\)/g)]
    .map((m) => [m[1], m[2]]));
  for (const [, name] of main.matchAll(/\b(\w+)\.hidden\s*=/g)) {
    if (alias.has(name)) ids.add(alias.get(name));
  }
  assert.ok(ids.size >= 2, `the scanner found only ${[...ids]} toggling hidden`);

  for (const id of ids) {
    const sets = new RegExp(`(^|[,\\s])#${id}\\s*(,[^{]*)?\\{[^}]*display\\s*:`, 'm').test(css)
      // an id can also be styled through a class rule it belongs to
      || (id === 'gate' && /\.gate\s*\{[^}]*display\s*:/.test(css));
    if (!sets) continue;   // no author display rule, so `hidden` works unaided
    const hides = new RegExp(
      `body\\[data-signed="(yes|no)"\\][^{]*(#${id}|\\.${id})[^{]*\\{[^}]*display\\s*:\\s*none`).test(css);
    assert.ok(hides, `#${id} has an author display rule, so "hidden" cannot hide it`);
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
  // A dash means "the filing did not state it", so only genuine absence gets
  // one. This used to include every negative, which is how 41 companies' filed
  // losses became data gaps — a net-profit card reading "—" above a proof
  // graph of ten bars drawn below the zero line.
  for (const empty of [null, undefined, NaN, Infinity, 'x']) {
    assert.equal(c.money(empty), '—', `money(${String(empty)}) should be a dash`);
  }
  assert.equal(c.money(0), '0', 'a filed zero is a figure, not a gap');
  assert.equal(c.money(-24865000), '-24.9m', 'a filed loss is a figure, not a gap');
  assert.equal(c.money(-4190000000), '-4.19bn');
});

test('a market capitalisation is guarded where it is printed, not in the formatter', () => {
  // Moving the sign guard out of money() means the one caller that genuinely
  // cannot show a negative has to say so itself: a market cap below zero is a
  // units error, not a small company.
  const rows = screen({ ...LIVE, companies: [
    { ticker: 'AAAA', name: { en: 'A', ar: 'أ' }, sector: 'Finance', close: 10, pct: 1, cap: -100 },
    { ticker: 'BBBB', name: { en: 'B', ar: 'ب' }, sector: 'Finance', close: 10, pct: 1, cap: 0 },
    { ticker: 'CCCC', name: { en: 'C', ar: 'ج' }, sector: 'Finance', close: 10, pct: 1, cap: 4190000000 },
  ] }).rows;
  assert.equal(rows.find((r) => r.ticker === 'AAAA').cap, '—');
  assert.equal(rows.find((r) => r.ticker === 'BBBB').cap, '—');
  assert.equal(rows.find((r) => r.ticker === 'CCCC').cap, '4.19bn');
});

test('a return is a percentage on the site because it is one in the app', () => {
  // roe and roa are published with unit "ratio", so they fell through to the
  // multiple and 454 figures read "0.29×" where the app reads "29.1%" — on a
  // card whose own body calls it "profit as a share of shareholders' equity".
  const c = fresh();
  c.state.lang = 'en';
  const L = c.copy();
  const cards = c.ratioCards({ sector: 'Finance', metrics: [
    { key: 'roe', value: 0.2914, unit: 'ratio', peer_median: 0.166, peer: 'above',
      points: 2, series: [{ p: 'FY 2024', v: 0.2914 }, { p: 'FY 2025', v: 0.31 }] },
    { key: 'pe', value: 8.4, unit: 'ratio', points: 1, series: [] },
  ] }, L, false);
  const roe = cards.find((x) => x.key === 'roe');
  assert.equal(roe.value, '29.1%');
  assert.ok(roe.peerMedian.includes('16.6%'), `median reads ${roe.peerMedian}`);
  assert.equal(roe.proof[0].v, '29.1%');
  // and a genuine multiple is still a multiple
  assert.equal(cards.find((x) => x.key === 'pe').value, '8.40×');
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

  // Every reading on the screen, not one named one.
  //
  // This asserted on the Suez row, and PortWatch is a third party that owes
  // this project nothing: the day it answered 429 the indicator dropped out of
  // macro.json — correctly, under `unavailable` — and this test called the
  // pipeline's honest behaviour a defect. What must hold is that whatever
  // reaches the screen carries its unit and its chain, because "37" alone is a
  // number waiting to be misread.
  assert.ok(v.macro.length > 0, 'no macro reading reached the screen at all');
  for (const reading of v.macro) {
    assert.ok(reading.label, 'a reading with no label');
    assert.ok(reading.unit, `${reading.label} carries no unit`);
    assert.ok(reading.chain, `${reading.label} does not say why it reaches a share`);
    assert.ok(reading.value, `${reading.label} has no value`);
  }

  // And the two that carry a formatting rule, when the source answered.
  const suez = v.macro.find((m) => /Suez/.test(m.label));
  if (suez) {
    assert.equal(suez.unit, 'vessels');
    assert.equal(suez.hasUnit, true);
    assert.match(suez.chain, /dollars/);       // why a canal reaches an Egyptian share
    assert.match(suez.link, /EGX 30/);
  }
  const fdi = v.macro.find((m) => /Foreign direct/.test(m.label));
  if (fdi) {
    assert.match(fdi.value, /^\d+(\.\d+)?bn$/,
      `a raw 15452700000 does not fit a cell or a head: "${fdi.value}"`);
  }
});

test('a sector opens, and shows what the card was already reading', async () => {
  // The card fetched a four-sentence read, eight medians, eight movement rows,
  // four standouts and every member — and printed a teaser, one median and a
  // bar. The app has had a screen for all of it since it shipped.
  const c = fresh();
  const secs = await fromDisk(() => data.sectors());
  c.setData({ ...LIVE, sectorCards: secs });
  c.state.screen = 'sectors';

  // Closed, the grid is what shows.
  assert.equal(c.renderVals().noOpenSector, true);
  assert.equal(c.renderVals().hasOpenSector, false);

  // The biggest sector, not a named one — see the note on the card test.
  const finance = c.renderVals().sectorCards.slice()
    .sort((a, b) => Number(b.count) - Number(a.count))[0];
  finance.open();
  const open = c.renderVals().openSector;
  assert.ok(open, 'the card did not open');
  assert.equal(open.name, finance.name);
  assert.match(open.as, /^\d+ companies · read of /);

  // The full read, not the teaser the card shows.
  assert.ok(open.read.length > finance.read.length, 'the teaser reached the screen');
  assert.ok(open.hasMedians && open.medians.length >= 6);
  assert.ok(open.hasMembers && open.members.length > 5, `${open.members.length} members`);
  assert.ok(open.hasStandouts);

  // A member is a count off the filings and a place it stands — never a rank.
  const withPattern = open.members.find((m) => !m.dim);
  assert.match(withPattern.measures, /^\d+ of \d+ improving$/);
  assert.equal(typeof withPattern.go, 'function');
  const unread = open.members.find((m) => m.dim);
  if (unread) assert.match(unread.measures, /Not enough filed history/);

  // Every movement row says what its numbers mean rather than printing four
  // unlabelled colours.
  for (const m of open.metrics) {
    assert.ok(m.parts.length > 0, m.key);
    for (const part of m.parts) {
      assert.match(part.n, /^\d+$/);
      assert.ok(part.word.length > 2, `${m.key} has an unlabelled count`);
    }
  }

  // And it closes back to the grid.
  open.back();
  assert.equal(c.renderVals().noOpenSector, true);
});

test('a price in dollars says so, and one in pounds does not', () => {
  // Eleven of the exchange's listings are quoted in dollars. Printed in a
  // column where every other figure is pounds, CFGH at 0.117 reads as eleven
  // piastres and is eleven cents — and the market value beside it really is in
  // pounds, which is how `shares x close` came out 51.28 times smaller than
  // the published capitalisation. That number is the exchange rate, and it is
  // the only reason anybody noticed.
  const c = fresh();
  c.setData({ ...LIVE, companies: [
    { ticker: 'CFGH', name: { en: 'CI Capital', ar: 'سي آي' }, sector: 'Non-bank financial services',
      close: 0.117, pct: 1.2, cap: 2.83e9, pe: null, currency: 'US$', foreignCurrency: true },
    { ticker: 'COMI', name: { en: 'CIB', ar: 'التجاري' }, sector: 'Banks',
      close: 137.4, pct: -0.5, cap: 468e9, pe: 8.6 },
  ] });
  const rows = c.renderVals().rows;
  const cfgh = rows.find((r) => r.ticker === 'CFGH');
  const comi = rows.find((r) => r.ticker === 'COMI');
  assert.match(cfgh.close, /^US\$ /, `dollar price printed as "${cfgh.close}"`);
  // The pound is 216 of the 227 and does not need saying on every row.
  assert.doesNotMatch(comi.close, /[A-Z$]/, `pound price printed as "${comi.close}"`);
});

test('a dollar listing says which money each of its two figures is in', () => {
  // The market table was taught this and the company screen was not, so the
  // page a reader lands on printed 0.118 over a market value of 2.83 billion
  // with nothing between them. Divide one by the other and the company is a
  // fiftieth of its own size; the difference is the exchange rate, and the
  // screen never mentioned it. The exchange states every market value in
  // pounds, including for the listings it quotes in dollars.
  const c = fresh();
  c.setData(LIVE);
  c.state.ticker = 'CFGH';
  c._co = { ticker: 'CFGH', close: 0.118, pct: 1.2, currency: 'US$',
            profile: { market_cap: 2.83e9, shares_outstanding: 470250000 },
            name: { en: 'Concrete Fashion', ar: 'كونكريت' }, sector: 'Textile & Durables' };
  const co = c.renderVals().co;
  assert.match(co.close, /^US\$ /, `the price printed as "${co.close}"`);
  const cap = co.stats.find((s) => /Market cap/.test(s.label));
  assert.equal(cap.note, 'in EGP', 'the market value does not say which money it is in');

  // And a pound listing says neither, because saying it 273 times is noise.
  c.state.ticker = 'COMI';
  c._co = { ticker: 'COMI', close: 137.4, pct: -0.5,
            profile: { market_cap: 468e9 },
            name: { en: 'CIB', ar: 'التجاري' }, sector: 'Banks' };
  const comi = c.renderVals().co;
  assert.doesNotMatch(comi.close, /[A-Z$]/, `the price printed as "${comi.close}"`);
  assert.equal(comi.stats.find((s) => /Market cap/.test(s.label)).note, '');
});

test('a sector card is not four blank lines', async () => {
  // The mapper emitted `companies`, `lead` and `pe`; the card binds `count`,
  // `read` and `medianPe`. Every card rendered its title and its bar over
  // nothing at all.
  const secs = await fromDisk(() => data.sectors());
  // The biggest sector, whichever it is. This named "Finance", which was the
  // biggest only because the vendor filed seven industries under it — 83
  // companies, 25 of them property developers. The exchange's own taxonomy
  // leaves Finance with nine, and a test that names a sector is a test that
  // breaks when the classification gets better.
  const finance = secs.slice().sort((a, b) => Number(b.count) - Number(a.count))[0];
  // Counts, not a count. This asserted `'83'` and broke the day the exchange's
  // own market values landed and Finance gained a company — a red build that
  // reported a correct data change as a defect. What the card must not be is
  // empty; how many banks are listed this month is the pipeline's business.
  assert.match(finance.count, /^\d+$/);
  // Five is the floor the builder publishes at; the middle of four is not the
  // middle of a market.
  assert.ok(Number(finance.count) >= 5, `${finance.name} has ${finance.count}`);
  // `flat` is a published count, not "everything left over". Deriving it by
  // subtraction folded the companies whose metric could not be READ into the
  // ones that held STEADY: Finance said "10 flat" where the document says 3
  // held and 7 were unmeasurable, and 11 of the 15 cards overstated it. Every
  // card, not one — the arithmetic has to hold for all of them.
  for (const card of secs) {
    assert.equal(card.upCount + card.downCount + card.flatCount
                 + card.unknownCount, Number(card.count),
      `${card.name}: the four movement counts must account for every company`);
  }
  // And the distinction has to survive somewhere: at least one sector holds
  // companies nobody could measure, reported as unknown rather than as flat.
  const unmeasured = secs.filter((x) => x.unknownCount > 0);
  assert.ok(unmeasured.length > 0, 'no sector reports unmeasurable companies');
  assert.ok(unmeasured.every((x) => x.hasUnknown === true));
  // And the bar is drawn over what was measured, not over every listing, or
  // the grey segment is padded by the companies nobody could read.
  assert.ok(finance.bars.length <= 10);
  assert.ok(finance.read.length > 40);
  // A median P/E, not a specific one: this asserted `'10.4'` and failed at
  // `'10.3'` when the market values changed source — the figure moved because
  // the data got better, which is not something a test should call a failure.
  // A number, in the range a real one lives in, is the claim worth making.
  assert.match(finance.medianPe, /^\d+(\.\d)?$/, finance.medianPe);
  assert.ok(Number(finance.medianPe) > 1 && Number(finance.medianPe) < 200,
    `a median P/E of ${finance.medianPe} is not a P/E`);
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
  // Every pill carries a real count, and the archive as a whole holds a
  // year's worth. NOT "the newest month has more than 100": on the first of
  // the month it holds one day — 16 filings on 1 September — and this failed
  // every month-boundary for a reason that is the calendar, not a defect.
  assert.ok(months.every((m) => m.count > 0), 'a pill with no filings behind it');
  assert.ok(months.reduce((sum, m) => sum + m.count, 0) > 5000,
    'the archive should hold a year of filings');
  const v = screen({ ...LIVE, filedMonths: months });
  assert.equal(v.months.length, months.length);
  assert.match(v.months[0].label, /^[A-Z][a-z]+t? \d{4}$/);
  assert.equal(v.months[0].count, months[0].count);
});

test('an open month shows that month, and says how much of it', async () => {
  // A completed month, picked by name rather than by position, so this does
  // not start reading a half-finished one on the first of a month.
  const items = await fromDisk(() => data.filedMonth('2026-07'));
  assert.ok(items.length > 1000, `${items.length} filings`);
  const c = fresh();
  c.setData({ ...LIVE, filedArchive: items, filedArchiveMonth: '2026-07' });
  c.state.month = '2026-07';
  const v = c.renderVals();
  assert.equal(v.filedEvents.length, 60);
  // Sixty of 1,458 fit a column; saying which sixty is the difference between
  // a sample and a claim.
  assert.match(v.archiveNote,
    /Showing the 60 most recent of \d{4} filings published in Jul 2026\./);
  // Newest first, then cut. Cutting the document's order took the 60 OLDEST:
  // on 30 August the panel was 60 rows all dated 2 August, and nothing filed
  // between the 3rd and the 26th was reachable from it.
  const dates = v.filedEvents.map((e) => e.date).filter(Boolean);
  assert.deepEqual(dates, [...dates].sort().reverse(), 'the filed panel is not newest-first');
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

/* ── phones ────────────────────────────────────────────────────────────── */

test('the layout has a phone case, and the rail stops eating the screen', async () => {
  const { readFile } = await import('node:fs/promises');
  const css = await readFile(new URL('../../public/esthmr/shell.css', import.meta.url), 'utf8');
  const html = await readFile(new URL('../../public/esthmr/index.html', import.meta.url), 'utf8');
  const tpl = await readFile(new URL('../../public/esthmr/template.html', import.meta.url), 'utf8');

  // Without this the media query never matches on a real phone, whatever the
  // stylesheet says.
  assert.match(html, /<meta name="viewport" content="width=device-width/);

  const at = css.indexOf('@media (max-width: 860px)');
  assert.ok(at > 0, 'there is no phone case at all');
  const mobile = css.slice(at);
  // A fixed 250px rail on a 375px screen is two thirds of the width.
  assert.match(mobile, /\.om-rail\s*\{[^}]*position:\s*fixed\s*!important/);
  assert.match(mobile, /\.om-main\s*\{[^}]*margin-inline-start:\s*0\s*!important/);
  // The hooks the phone case leans on must exist in the markup.
  for (const hook of ['om-rail', 'om-main', 'om-nav', 'om-tools', 'om-brand',
                      'om-session', 'om-table']) {
    assert.ok(tpl.includes(hook), `the template has no ${hook} to hang the phone case on`);
  }
  // Seven columns of market data cannot fit a phone: the card scrolls, the
  // page does not. A page that scrolls sideways is the bug this prevents.
  assert.match(mobile, /\.om-table\s*\{[^}]*overflow-x:\s*auto/);
});

/* ── the ratios, and what may be said about them ───────────────────────── */

test('a company screen carries its ratios, each with its own history', async () => {
  const review = await fromDisk(async () => {
    const { readFile } = await import('node:fs/promises');
    return JSON.parse(await readFile(
      new URL('../../public/data/v1/review/COMI.json', import.meta.url), 'utf8'));
  });
  const v = screen({ ...LIVE, review });
  assert.ok(v.ratios.length >= 8, `only ${v.ratios.length} ratios`);
  const pe = v.ratios.find((r) => r.key === 'pe');
  assert.equal(pe.label, 'Price to earnings');
  assert.match(pe.value, /^[\d.]+×$/);
  // The direction is a sentence, not an arrow: an arrow beside a P/E invites
  // the reading that up is good, and for a P/E or a debt ratio it is not.
  assert.match(pe.now, /Right now it's (rising|falling)|holding steady/);
  assert.match(pe.peer, /(above|below) its sector/);
  assert.equal(pe.hasSpark, true, 'a ratio with a series must draw one');
  assert.ok(pe.proof.length > 1, 'the figures the direction was read from are missing');
});

test('price to book is published again', async () => {
  // build_review.py divided whole-pound market cap by EGP-MILLION equity, so
  // every company's price-to-book landed near 3.1e6, outside the sane band,
  // and was dropped from all 258 documents — while the app carried finished
  // copy for a row nothing ever produced.
  const { readFile } = await import('node:fs/promises');
  const review = JSON.parse(await readFile(
    new URL('../../public/data/v1/review/COMI.json', import.meta.url), 'utf8'));
  const pb = review.metrics.find((m) => m.key === 'pb');
  assert.ok(pb, 'price-to-book is still missing from the document');
  assert.ok(pb.value > 0.02 && pb.value < 50, `price-to-book is ${pb.value}`);
  const v = screen({ ...LIVE, review });
  assert.equal(v.ratios.find((r) => r.key === 'pb').label, 'Price to book');
});

test('§8 a generated answer that reads as advice is dropped, its figure is not', () => {
  const review = {
    sector: 'Finance',
    metrics: [
      { key: 'pe', value: 4.26, unit: 'ratio', direction: 'falling', points: 6,
        peer_median: 10.4, peer: 'below',
        series: [{ p: 'FY 24', v: 4.8 }, { p: 'FY 25', v: 4.26 }],
        answer: 'The shares look undervalued and investors should buy.' },
    ],
  };
  const [card] = screen({ ...LIVE, review }).ratios;
  // The prose goes; the filed figures stay, because a filed figure was never
  // the part at risk.
  assert.equal(card.answer, '');
  assert.equal(card.hasAnswer, false);
  assert.equal(card.value, '4.26×');
  assert.equal(card.hasSpark, true);
  assert.match(card.peer, /below its sector/);
});

test('§8 nothing in the ratio block tells a reader what to do', async () => {
  const { readFile, readdir } = await import('node:fs/promises');
  const dir = new URL('../../public/data/v1/review/', import.meta.url);
  const files = (await readdir(dir)).filter((f) => f.endsWith('.json'));
  for (const f of files) {
    const review = JSON.parse(await readFile(new URL(f, dir), 'utf8'));
    for (const card of screen({ ...LIVE, review }).ratios) {
      for (const text of [card.answer, card.ask, card.now, card.peer]) {
        assert.ok(!DIRECTIVE.test(text || ''), `${f}: ${text}`);
      }
    }
  }
  assert.ok(files.length > 200, `only ${files.length} review documents`);
});

test('a period with filed figures behind it says so on the row', async () => {
  // COMI's H1 2026 carries a full balance sheet and cash-flow statement and
  // displayed as "— — — 39,235.1": four dashes and a profit, with nothing to
  // say that eight more filed figures sat behind the plus. The exchange
  // announces a profit; the statement comes from the filing, and it was
  // invisible.
  const { readFile } = await import('node:fs/promises');
  const co = JSON.parse(await readFile(
    new URL('../../public/data/v1/companies/COMI.json', import.meta.url), 'utf8'));
  const fins = [...(co.financials.quarterly || []), ...(co.financials.annual || [])]
    .sort((a, b) => String(b.period_end || '').localeCompare(String(a.period_end || '')));
  const v = screen({ ...LIVE, fins });
  const h1 = v.fins.find((f) => f.period === 'H1 2026');
  assert.equal(h1.revenue, '—', 'the exchange did not announce revenue for this period');
  assert.equal(h1.hasMore, true, 'a full statement must announce itself on the row');
  assert.match(h1.more, /^\+\d+ filed$/);
  // A period the exchange only announced a profit for has nothing behind it,
  // and must not pretend otherwise.
  const bare = v.fins.find((f) => !f.groups.length);
  if (bare) { assert.equal(bare.hasMore, false); assert.equal(bare.more, ''); }
  assert.match(v.finsCoverage, /\d+ of \d+ periods carry a full statement\./);
  assert.equal(screen(LIVE).finsCoverage, '');
});

test('a line is compared only against periods of the same length', async () => {
  // The exchange files cumulatively: an H1 is six months, a 9M is nine, an FY
  // is twelve. Putting them in one row compares half a year with a whole one
  // and draws a saw-tooth that means nothing.
  const { readFile } = await import('node:fs/promises');
  const co = JSON.parse(await readFile(
    new URL('../../public/data/v1/companies/COMI.json', import.meta.url), 'utf8'));
  const fins = [...(co.financials.quarterly || []), ...(co.financials.annual || [])];
  const c = fresh();
  c.setData({ ...LIVE, fins });
  c.state.screen = 'company';
  const v = c.renderVals();
  assert.equal(v.hasCompare, true);
  assert.ok(v.compareRows.length > 4, `${v.compareRows.length} lines`);
  // every column in the view is the same period type
  const types = new Set(v.comparePeriods.map((p) => p.split(' ')[0]));
  assert.equal(types.size, 1, `mixed period lengths: ${[...types]}`);
  // and the columns run oldest to newest. Sorting on period_end alone put
  // "Q1 2014" between 2024 and 2025, because many rows carry no period_end at
  // all and sorted as an empty string.
  const years = v.comparePeriods.map((p) => Number(p.match(/(\d{4})/)[1]));
  assert.deepEqual(years, years.slice().sort((a, b) => a - b), v.comparePeriods.join(' '));
  // switching type switches the whole view, and never mixes
  c.state.compareType = 'FY';
  const fy = c.renderVals();
  assert.equal(new Set(fy.comparePeriods.map((p) => p.split(' ')[0])).size, 1);
  assert.match(fy.comparePeriods[0], /^FY /);
});

test('a company with one period of each length has nothing to compare', () => {
  const fins = [{ period: 'FY 2025', period_end: '2025-12-31', net_income: 5 },
                { period: 'H1 2026', period_end: '2026-06-30', net_income: 3 }];
  const c = fresh();
  c.setData({ ...LIVE, fins });
  c.state.screen = 'company';
  const v = c.renderVals();
  assert.equal(v.hasCompare, false, 'one period of a length is not a comparison');
});

test('an SVG keeps the attributes that are camelCase in SVG', async () => {
  // setAttribute(kebab(name)) turned `viewBox` into `view-box`, which is not an
  // attribute at all — so every chart and sparkline was drawn with NO viewBox.
  // Their coordinates are 0–1000, and without a viewBox those are CSS pixels
  // rather than a space to scale from. On a desktop column about a thousand
  // pixels wide that looked right by coincidence; on a phone the price chart
  // drew 1000px inside a 347px card and ran off the side.
  const { default: React } = await import('../../public/esthmr/react-shim.js');
  const svg = React.createElement('svg', {
    viewBox: '0 0 1000 260', preserveAspectRatio: 'none',
    strokeWidth: 1.5, vectorEffect: 'non-scaling-stroke',
  });
  assert.equal(svg.getAttribute('viewBox'), '0 0 1000 260');
  assert.equal(svg.getAttribute('preserveAspectRatio'), 'none');
  assert.equal(svg.getAttribute('view-box'), null, 'the hyphenated form is not an attribute');
  // presentation attributes ARE hyphenated, and must stay that way
  assert.equal(svg.getAttribute('stroke-width'), '1.5');
  assert.equal(svg.getAttribute('vector-effect'), 'non-scaling-stroke');

  // and the charts the site actually draws carry one
  const { Component } = await import('../../public/esthmr/logic.js');
  const c = fresh();
  const chart = c.buildChart([{ date: '2026-01-01', close: 1 }, { date: '2026-01-02', close: 2 }]);
  const found = chart.querySelector ? chart.querySelector('svg') : null;
  const el = (found || chart);
  assert.equal(el.getAttribute && el.getAttribute('viewBox'), '0 0 1000 260');
});

test('no block renders its heading over nothing', () => {
  // The busiest block was ungated: with nothing measurable it drew "TRADED
  // WITH ABNORMAL VOLUME" over an empty card — on the first screen a visitor
  // sees, because the demo carried no relative volume at all.
  const bare = screen({ ...LIVE, companies: [] });
  assert.equal(bare.showBusy, false, 'an unmeasurable market must show no block');
  // measured and quiet is different from unmeasurable, and says so
  const quiet = screen({ ...LIVE, companies: [
    { ticker: 'AAAA', name: { en: 'A', ar: 'أ' }, sector: 'S', close: 1, pct: 0, rv: 1 }] });
  assert.equal(quiet.showBusy, true);
  assert.equal(quiet.noBusy, true);
  // and the demo demonstrates the feature rather than leaving room for it
  const demo = screen(data.demo());
  assert.ok(demo.busy.length > 0, 'the demo shows an empty abnormal-volume card');
  assert.equal(demo.showBusy, true);
});

test('every binding in the template resolves to something', async () => {
  // dc.js renders an unresolved binding as an empty string and logs nothing,
  // so a renamed key is invisible until somebody notices a blank card.
  const { readFile } = await import('node:fs/promises');
  const tpl = await readFile(new URL('../../public/esthmr/template.html', import.meta.url), 'utf8');
  const loops = new Set([...tpl.matchAll(/<sc-for\s+list="\{\{\s*[^}]+?\s*\}\}"\s+as="(\w+)"/g)]
    .map((m) => m[1]));

  const c = fresh();
  c.setData(data.demo());
  const provided = new Set();
  const labels = new Set();
  for (const s of ['home', 'today', 'market', 'company', 'sectors', 'calendar', 'exchange', 'research']) {
    c.state.screen = s;
    const v = c.renderVals();
    Object.keys(v).forEach((k) => provided.add(k));
    Object.keys(v.L).forEach((k) => labels.add(k));
  }

  const unresolved = [];
  for (const raw of new Set([...tpl.matchAll(/\{\{([^}]+)\}\}/g)].map((m) => m[1].trim()))) {
    const root = raw.split(/[.[( ]/)[0];
    if (loops.has(root) || ['true', 'false', 'null'].includes(root)) continue;
    if (root === 'L') {
      const name = raw.includes('.') ? raw.split('.')[1].split('(')[0].trim() : '';
      if (name && !labels.has(name)) unresolved.push(`L.${name}`);
      continue;
    }
    if (!provided.has(root)) unresolved.push(raw);
  }
  assert.deepEqual(unresolved, [], 'these bindings render as an empty string');
});

test('every field a loop row is asked for exists on the row', async () => {
  // The test above deliberately skips loop-variable members, because it cannot
  // know what a row holds without one. That gap is where `{{ p.window }}` sat:
  // a field on 0 of 11,480 filed rows, drawing an empty line under every period
  // label on every company, for as long as the screen has existed. So resolve
  // the lists and ask the rows themselves.
  const { readFile } = await import('node:fs/promises');
  const tpl = await readFile(new URL('../../public/esthmr/template.html', import.meta.url), 'utf8');

  // Which list each loop variable iterates, and which loop encloses it.
  const scopes = [];                       // {varName, listExpr, parent, uses:Set}
  const stack = [];
  const TAG = /<sc-for\s+list="\{\{\s*([^}]+?)\s*\}\}"\s+as="(\w+)"|<\/sc-for>|\{\{([^}]+)\}\}/g;
  for (const m of tpl.matchAll(TAG)) {
    if (m[2]) {
      const scope = { varName: m[2], listExpr: m[1], parent: stack[stack.length - 1] || null, uses: new Set() };
      scopes.push(scope);
      stack.push(scope);
    } else if (m[0] === '</sc-for>') {
      stack.pop();
    } else if (m[3]) {
      const raw = m[3].trim();
      const root = raw.split(/[.[( ]/)[0];
      const dot = raw.indexOf('.');
      if (dot === -1) continue;
      for (let i = stack.length - 1; i >= 0; i--) {
        if (stack[i].varName === root) {
          stack[i].uses.add(raw.slice(dot + 1).split(/[.[( ]/)[0]);
          break;
        }
      }
    }
  }
  assert.ok(scopes.length > 20, 'the template scanner found no loops');

  // Every screen, so a list that only one of them fills is still seen.
  const c = fresh();
  c.setData(data.demo());
  const rowsFor = new Map();               // scope -> sample rows seen anywhere
  const collect = (scope, container) => {
    const list = scope.listExpr.split('.').reduce((o, k) => (o == null ? o : o[k.trim()]), container);
    if (!Array.isArray(list)) return [];
    const seen = rowsFor.get(scope) || [];
    rowsFor.set(scope, seen.concat(list));
    return list;
  };
  for (const s of ['home', 'today', 'market', 'company', 'sectors', 'calendar', 'exchange', 'research']) {
    c.state.screen = s;
    for (const opened of [{}, { ...c.state.open }]) {
      c.state.open = opened;
      const v = c.renderVals();
      // Outer loops read off renderVals; inner loops read off a row of their parent.
      for (const scope of scopes) {
        if (scope.parent) continue;
        const rows = collect(scope, v);
        const descend = (parent, parentRows) => {
          for (const child of scopes.filter((x) => x.parent === parent)) {
            const childRows = parentRows.flatMap((r) => collect(child, r));
            descend(child, childRows);
          }
        };
        descend(scope, rows);
      }
    }
    // Open the first period so the nested statement groups are reachable.
    const v = c.renderVals();
    if (Array.isArray(v.fins) && v.fins[0]) c.state.open = { [v.fins[0].period]: true };
  }

  const missing = [];
  for (const scope of scopes) {
    const rows = (rowsFor.get(scope) || []).filter((r) => r && typeof r === 'object');
    if (!rows.length) continue;            // an empty list says nothing either way
    for (const field of scope.uses) {
      if (!rows.some((r) => field in r)) {
        missing.push(`${scope.listExpr} → {{ ${scope.varName}.${field} }}`);
      }
    }
  }
  assert.deepEqual(missing, [], 'these rows never carry the field the markup asks for');
});

/* ── the P/E column ────────────────────────────────────────────────────── */

test('the market table publishes the P/E the pipeline published, or none', () => {
  // build_market_api refuses a multiple in four cases — a loss, no filed
  // profit, a share count that does not cohere with price and market cap, and
  // a ratio outside 1–200 — and omits the field. The site used to re-derive
  // close/eps over the top of every one of those refusals: AALR came out at
  // 34,048.9 on an EPS of 0.009, in a sortable column, so sorting by P/E put a
  // rounding artefact at the top of the exchange.
  const c = data.__marketRow
    ? null
    : null;
  const rows = screen({
    ...LIVE,
    companies: [
      { ticker: 'AAAA', name: { en: 'A', ar: 'أ' }, sector: 'Finance', close: 10, pct: 1, cap: 100, pe: 8.4, pePeriod: 'FY 2024' },
      // Published EPS, no published multiple: the pipeline refused it.
      { ticker: 'BBBB', name: { en: 'B', ar: 'ب' }, sector: 'Finance', close: 306.44, pct: 1, cap: 100, eps: 0.009, pe: null },
    ],
  }).rows;
  assert.equal(rows.find((r) => r.ticker === 'AAAA').pe, '8.4');
  assert.equal(rows.find((r) => r.ticker === 'BBBB').pe, '—');
});

test('a refused multiple is refused by the reader too', async () => {
  // The refusal has to survive the document reader, not just the screen —
  // the derivation that produced 34,048.9 lived in data.js.
  const { readFile } = await import('node:fs/promises');
  const src = await readFile(new URL('../../public/esthmr/data.js', import.meta.url), 'utf8');
  const body = src.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
  assert.ok(!/q\.close\s*\/\s*c\.eps/.test(body),
    'data.js derives a P/E instead of reading the published one');
});

test('a multiple says which year it is earned over', () => {
  const v = screen({ ...LIVE, companies: [
    { ticker: 'AAAA', name: { en: 'A', ar: 'أ' }, sector: 'Finance', close: 10, pct: 1, cap: 100,
      pe: 8.4, pePeriod: 'FY 2024', eps: 1.19, epsPeriod: 'FY 2024' },
  ] });
  // Before a document lands the screen shows dashes; the note is what the
  // company screen prints once the row is carried onto it.
  const printed = JSON.stringify(v.L);
  assert.ok(printed.includes('left blank'), 'the table never says why a P/E is missing');
});

/* ── a filed period says what it covers ────────────────────────────────── */

test('a filed period prints the dates it covers', () => {
  const v = screen({
    ...LIVE,
    fins: [{ period: 'FY 2014 (to 30 Jun)', period_start: '2013-07-01', period_end: '2014-06-30',
             net_income: -31.724 }],
  });
  assert.equal(v.fins[0].window, '1 Jul 2013 → 30 Jun 2014');
  // 3,478 of the filed rows carry only an end; those say so rather than lying
  // about where the count began.
  const only = screen({ ...LIVE, fins: [{ period: 'FY 2014', period_end: '2014-12-31' }] });
  assert.equal(only.fins[0].window, 'to 31 Dec 2014');
  const none = screen({ ...LIVE, fins: [{ period: 'FY 2014' }] });
  assert.equal(none.fins[0].window, '');
});

/* ── the header's move in pounds ───────────────────────────────────────── */

test('a company header shows the move in pounds, not an em dash', () => {
  const c = fresh();
  c.setData({ ...LIVE, companies: [
    { ticker: 'AAAA', name: { en: 'A', ar: 'أ' }, sector: 'Finance', close: 12.4, pct: -3.125, cap: 100 },
  ] });
  c.state.screen = 'company';
  c.state.ticker = 'AAAA';
  c._co = { ticker: 'AAAA', name: { en: 'A', ar: 'أ' }, sector: 'Finance',
            close: 12.4, pct: -3.125, profile: {} };
  const v = c.renderVals();
  assert.equal(v.co.pct, '-3.13%');
  assert.equal(v.co.chg, '-0.40');        // 12.40 against a previous 12.80
  // Both signs in the same header are the same glyph.
  assert.equal(v.co.chg[0], v.co.pct[0]);
  assert.notEqual(v.co.chg, '—');
});

/* ── whether the prices are final ──────────────────────────────────────── */

test('a session still running is not printed as a close', () => {
  assert.equal(screen({ ...LIVE, isClose: true }).sessionState, 'Closing prices');
  const live = screen({ ...LIVE, isClose: false });
  assert.equal(live.sessionState, 'Session in progress — prices not final');
  assert.notEqual(live.sessionColor, screen({ ...LIVE, isClose: true }).sessionColor);
  // market.json publishes the flag; the reader has to carry it.
  assert.equal(typeof data.demo().isClose, 'boolean');
});

/* ── the sector's name in Arabic ───────────────────────────────────────── */

test('an Arabic reader gets Arabic sector names, and English keys keep filtering', () => {
  const set = { ...LIVE, companies: [
    { ticker: 'AAAA', name: { en: 'A', ar: 'أ' }, sector: 'Process Industries',
      sectorAr: 'الصناعات التحويلية', close: 10, pct: 1, cap: 100, pe: 8 },
  ] };
  assert.equal(screen(set, 'ar').rows[0].sector, 'الصناعات التحويلية');
  assert.equal(screen(set, 'en').rows[0].sector, 'Process Industries');
  // The chip's label is translated; the state it sets is the filed name, or
  // the filter it drives would match nothing.
  const chip = screen(set, 'ar').sectorChips.find((s) => s.label === 'الصناعات التحويلية');
  assert.ok(chip, 'the Arabic screen has no Arabic sector chip');
  const c = fresh();
  c.state.lang = 'ar';
  c.setData(set);
  c.renderVals().sectorChips.find((s) => s.label === 'الصناعات التحويلية').go();
  assert.equal(c.state.sector, 'Process Industries');
  assert.equal(c.renderVals().rows.length, 1, 'the Arabic chip filtered the table to nothing');
});

test('the company rail groups on the filed sector, not the translated one', () => {
  const set = { ...LIVE, companies: [
    { ticker: 'AAAA', name: { en: 'A', ar: 'أ' }, sector: 'Process Industries',
      sectorAr: 'الصناعات التحويلية', close: 10, pct: 1, cap: 100, pe: 8 },
    { ticker: 'BBBB', name: { en: 'B', ar: 'ب' }, sector: 'Process Industries',
      sectorAr: 'الصناعات التحويلية', close: 20, pct: 1, cap: 200, pe: 8 },
  ] };
  const c = fresh();
  c.state.lang = 'ar';
  c.setData(set);
  c.state.screen = 'company';
  c.state.ticker = 'AAAA';
  c._co = { ticker: 'AAAA', name: { en: 'A', ar: 'أ' }, sector: 'Process Industries',
            close: 10, pct: 1, profile: {} };
  const v = c.renderVals();
  assert.equal(v.co.sector, 'الصناعات التحويلية');
  assert.equal(v.pickList.length, 2, 'the rail emptied itself against a translated key');
});

/* ── the demo names nobody ─────────────────────────────────────────────── */

test('the demo screens name no real company and no real outlet', () => {
  const c = fresh();
  c.setData(data.demo());
  for (const lang of ['en', 'ar']) {
    c.state.lang = lang;
    for (const s of ['home', 'today', 'market', 'company', 'sectors', 'calendar', 'exchange', 'research']) {
      c.state.screen = s;
      const printed = JSON.stringify(c.renderVals(), (k, x) => (typeof x === 'function' ? undefined : x));
      for (const real of ['KORRA', 'كورّة', 'El Sewedy', 'السويدي', 'Commercial International Bank',
                          'البنك التجاري', 'Alexandria Mineral Oils', 'Ezz Steel', 'Suez Canal',
                          'قناة السويس', 'Al Borsa', 'alborsaanews', 'Enterprise', 'hapijournal',
                          'egx.com.eg']) {
        assert.ok(!printed.includes(real), `the demo ${s} screen (${lang}) names ${real}`);
      }
      // And no real four-letter EGX ticker: the demo directory is DEMO01..16.
      for (const t of ['COMI', 'KORA', 'SWDY', 'AMOC', 'ETEL', 'TMGH', 'ABUK', 'ESRS']) {
        assert.ok(!printed.includes(`"${t}"`), `the demo ${s} screen (${lang}) names ${t}`);
      }
    }
  }
});

test('the calendar months are the archive\'s, and the design\'s only in the demo', () => {
  // A signed-in reader whose filedMonths document failed used to be offered
  // four months the archive may not hold, each drawing an empty grid.
  const v = screen({ ...LIVE, filedMonths: undefined });
  assert.deepEqual(v.months, []);
  const d = fresh();
  d.setData(data.demo());
  assert.ok(d.renderVals().months.length > 0, 'the demo lost its month pills');
});

test('the two P/Es on a company screen each say what they are', () => {
  // The header divides today's close by the last filed earnings; the ratio
  // card divides the close at that period's end, because it is the last point
  // of a series. For CIB they are 8.6 and 4.84×, and with no date on either
  // the pair reads as one of them being wrong.
  const c = fresh();
  c.setData({ ...LIVE, review: { sector: 'Finance', metrics: [
    { key: 'pe', value: 4.84, unit: 'ratio', points: 5, direction: 'flat',
      series: [{ p: 'FY 2023', v: 5.1 }, { p: 'FY 2024', v: 4.84 }] },
  ] } });
  c.state.screen = 'company';
  c.state.ticker = 'AAAA';
  c._co = { ticker: 'AAAA', name: { en: 'A', ar: 'أ' }, sector: 'Finance',
            close: 139.28, pct: -1.19, pe: 8.6, pePeriod: 'FY 2024', profile: {} };
  const v = c.renderVals();
  const header = v.co.stats.find((s) => s.label === 'P/E');
  assert.equal(header.value, '8.6');
  assert.equal(header.note, 'over FY 2024');
  const card = v.ratios.find((r) => r.key === 'pe');
  assert.equal(card.value, '4.84×');
  assert.ok(card.asAt.includes('FY 2024'), 'the ratio card does not date its P/E');
  // Only the price-struck ratio carries the caveat.
  assert.equal(v.ratios.filter((r) => r.asAt).length, 1);
});

test('the demo cites no filing it does not have', () => {
  // An invented filing id pointed at egx.com.eg is a citation to a document
  // that is not there.
  const c = fresh();
  c.setData(data.demo());
  for (const s of ['company', 'today', 'calendar']) {
    c.state.screen = s;
    const printed = JSON.stringify(c.renderVals(), (k, x) => (typeof x === 'function' ? undefined : x));
    assert.ok(!printed.includes('egx.com.eg'), `the demo ${s} screen cites the exchange`);
    assert.ok(!/"egx-\d+"/.test(printed), `the demo ${s} screen cites a real filing id`);
  }
  // A signed-in screen still cites it.
  const live = fresh();
  live.setData({ ...LIVE, fins: [{ period: 'FY 2024', period_end: '2024-12-31', net_income: 1 }] });
  assert.equal(live.renderVals().fins[0].source, 'https://www.egx.com.eg');
});

/* ── what ties these together ──────────────────────────────────────────── */

const CROSS = {
  days: 4, threshold: 2, axis: ['2026-08-24', '2026-08-25', '2026-08-26', '2026-08-27'],
  items: [{
    ticker: 'AAAA', name: 'A', nameAr: 'أ', sector: 'Finance', sectorAr: 'التمويل والخدمات المالية',
    kinds: ['filing', 'news', 'session'],
    why: 'AAAA filed, was written about and traded outside its own normal.',
    whyAr: 'أودعت وكُتب عنها وتداولت خارج المعتاد.',
    insight: 'This one filed two in the window.', insightAr: 'أودعت إفصاحين.',
    pct: 4.74, ratio: 7.26, peers: ['BBBB', 'CCCC'], sameSector: 1,
    strands: [
      { kind: 'filing', date: '2026-08-25', title: 'An insider dealing form', titleAr: 'إخطار', link: 'https://www.egx.com.eg/x' },
      { kind: 'news', date: '2026-08-26', title: 'A story', titleAr: 'خبر', link: 'https://example.test/s' },
      { kind: 'session', date: '2026-08-27', title: '', titleAr: '', ratio: 7.26, link: '' },
    ],
  }],
};

test('a crossing carries the company, the reason, the window and every thread', () => {
  const v = screen({ ...LIVE, crossings: CROSS });
  assert.equal(v.crossings.length, 1);
  const x = v.crossings[0];
  assert.equal(x.ticker, 'AAAA');
  assert.equal(x.why, CROSS.items[0].why);
  assert.equal(x.insight, CROSS.items[0].insight);
  assert.equal(x.hasInsight, true);
  assert.equal(x.pct, '+4.74%');
  assert.equal(x.threads, '3 threads');
  assert.ok(x.peers.includes('2') && x.peers.includes('1'));
  // The window is the document's, one cell a day, and a day nothing landed on
  // keeps its place — the gap is what makes the cluster mean anything.
  assert.equal(x.cells.length, 4);
  assert.deepEqual(x.cells.map((d) => d.dots.length), [0, 1, 1, 1]);
  assert.equal(x.cells[0].quiet, true);
  // Every thread is a link back to the document it came from.
  assert.deepEqual(x.strands.map((s) => s.label), ['Filing', 'In the press', 'That session']);
  assert.equal(x.strands[0].href, 'https://www.egx.com.eg/x');
  // A session is a number, not a headline it does not have.
  assert.equal(x.strands[2].title, '7.26× normal volume');
});

test('the volume figure is printed only where the session is one of the threads', () => {
  // Every crossing carries a ratio. Printing 1.09× beside a company whose
  // crossing was a filing and a headline contradicts the number the rest of
  // the site teaches: 2× is the line.
  const on = screen({ ...LIVE, crossings: CROSS }).crossings[0];
  assert.equal(on.volume, '7.26× normal volume');
  const off = screen({ ...LIVE, crossings: { ...CROSS, items: [
    { ...CROSS.items[0], kinds: ['filing', 'news'], ratio: 1.09 },
  ] } }).crossings[0];
  assert.equal(off.hasVolume, false);
  assert.equal(off.volume, '');
});

test('a crossing about a company the directory does not hold opens nothing', () => {
  const known = screen({ ...LIVE, crossings: CROSS }).crossings[0];
  assert.equal(typeof known.go, 'function');
  assert.equal(known.arrow, '↗');
  const stranger = screen({ ...LIVE, crossings: { ...CROSS, items: [
    { ...CROSS.items[0], ticker: 'ZZZZ' },
  ] } }).crossings[0];
  assert.equal(stranger.go, null);
  assert.equal(stranger.arrow, '');
});

test('an Arabic reader gets the pipeline\'s Arabic sentences', () => {
  const v = screen({ ...LIVE, crossings: CROSS }, 'ar').crossings[0];
  assert.equal(v.why, CROSS.items[0].whyAr);
  assert.equal(v.insight, CROSS.items[0].insightAr);
  assert.equal(v.name, 'أ');
  assert.equal(v.strands[0].title, 'إخطار');
  assert.equal(v.sector, 'التمويل والخدمات المالية');
});

test('the block is absent, not empty, when the document is', () => {
  const v = screen(LIVE);
  assert.deepEqual(v.crossings, []);
  assert.equal(v.noCrossings, true);
  assert.equal(v.crossBody, '');
});

test('§8 nothing a crossing renders tells a reader what to do', () => {
  const v = screen({ ...LIVE, crossings: CROSS });
  const printed = JSON.stringify({ c: v.crossings, b: v.crossBody, w: v.crossWorkings,
    y: v.L.dotsYardstick, s: v.L.dotsShare });
  assert.ok(!DIRECTIVE.test(printed), '§8: a crossing renders directive language');
});

test('the document reader keeps every thread and drops nothing', async () => {
  // Against the published document rather than a fixture: this is the one
  // block whose whole claim is that the strands are real.
  const { readFile } = await import('node:fs/promises');
  const raw = JSON.parse(await readFile(
    new URL('../../public/data/v1/connections.json', import.meta.url), 'utf8'));
  const seen = [];
  globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => raw });
  const doc = await data.connections();
  delete globalThis.fetch;
  assert.equal(doc.items.length, raw.items.length);
  assert.equal(doc.days, raw.window_days);
  // The window ends on the newest strand any crossing carries, so a document
  // read on a later day is not drawn as if nothing had happened since.
  const newest = raw.items.flatMap((i) => i.strands.map((s) => s.date)).sort().pop();
  assert.equal(doc.axis[doc.axis.length - 1], newest);
  assert.equal(doc.axis.length, raw.window_days);
  raw.items.forEach((row, i) => {
    assert.equal(doc.items[i].strands.length, row.strands.length,
      `${row.ticker} lost a thread`);
    assert.equal(doc.items[i].why, row.why);
  });
  // change_percent is a fraction on this document like everywhere else.
  const moved = raw.items.find((i) => typeof i.change_percent === 'number');
  if (moved) {
    const got = doc.items.find((i) => i.ticker === moved.ticker);
    assert.ok(Math.abs(got.pct - moved.change_percent * 100) < 1e-9,
      'the day\'s move is a hundred times too small');
  }
  assert.ok(seen.length === 0);
});

test('Arabic bidi marks reach the reader and never the stylesheet', async () => {
  // A figure set in an Arabic sentence needs a bidi isolate around it or the
  // sign, the digits and the unit come apart. That isolation used to be
  // applied to the whole of renderVals, which cannot tell a figure a reader
  // looks at from one the browser parses — so `width:43%` became
  // `width:\u2066\u200643%\u2069` (invalid CSS), every proportional bar on the
  // site drew itself full width, and on the Arabic screens a 0.13% move and a
  // 4% move were the same bar. Nine of them on the home screen alone.
  const MARK = /[\u2066-\u2069]/;
  const { readFile } = await import('node:fs/promises');
  const tpl = await readFile(new URL('../../public/esthmr/template.html', import.meta.url), 'utf8');

  // Every expression the template binds INTO a style attribute.
  const styled = new Set();
  for (const m of tpl.matchAll(/style="([^"]*)"/g)) {
    for (const b of m[1].matchAll(/\{\{([^}]+)\}\}/g)) styled.add(b[1].trim());
  }
  assert.ok(styled.size > 30, 'the scanner found no style bindings');

  const loops = new Map();
  for (const m of tpl.matchAll(/<sc-for\s+list="\{\{\s*([^}]+?)\s*\}\}"\s+as="(\w+)"/g)) {
    loops.set(m[2], m[1]);
  }

  const c = fresh();
  c.state.lang = 'ar';
  c.setData(data.demo());
  const offenders = [];
  const walk = (value, seen) => {
    if (typeof value === 'string') return MARK.test(value);
    if (!value || typeof value !== 'object' || seen.has(value)) return false;
    seen.add(value);
    return Object.values(value).some((v) => walk(v, seen));
  };
  for (const s of ['home', 'today', 'market', 'company', 'sectors', 'calendar', 'exchange']) {
    c.state.screen = s;
    const v = c.renderVals();
    for (const expr of styled) {
      const root = expr.split(/[.[( ]/)[0];
      const rest = expr.slice(root.length + 1).split(/[.[( ]/)[0];
      // A loop member is checked against every row the list holds.
      const rows = loops.has(root)
        ? (loops.get(root).split('.').reduce((o, k) => (o == null ? o : o[k.trim()]), v) || [])
        : null;
      const values = rows
        ? (Array.isArray(rows) ? rows.map((r) => (r && typeof r === 'object' ? r[rest] : null)) : [])
        : [expr.split('.').reduce((o, k) => (o == null ? o : o[k.trim()]), v)];
      for (const got of values) {
        if (typeof got === 'string' && MARK.test(got)) {
          offenders.push(`${s}: style="...{{ ${expr} }}..." is ${JSON.stringify(got)}`);
        }
      }
    }
  }
  assert.deepEqual([...new Set(offenders)], [],
    'these values are bound into a style attribute and carry a bidi mark');

  // The isolation itself is intact: it is now applied per text node, by dc.js,
  // through this hook and nowhere else.
  assert.equal(c.text('43%'), '\u206643%\u2069');
  assert.equal(c.text('var(--accent)'), 'var(--accent)');
  assert.equal(c.text(null), null);
  const en = fresh();
  assert.equal(en.text('43%'), '43%');

  // And dc.js applies it to text nodes only — the attribute branch takes the
  // raw value, which is the whole point.
  const dc = await readFile(new URL('../../public/esthmr/dc.js', import.meta.url), 'utf8');
  assert.match(dc, /TEXT_NODE[\s\S]{0,400}interpolate\(text, scope, TEXT\)/);
  assert.ok(!/interpolate\(attr\.value, scope, TEXT\)/.test(dc),
    'dc.js runs the text hook over attribute values');
});

test('a company that filed nine times does not get a card twice the height', () => {
  // One crossing in the published set carries nine threads and the rest carry
  // two or three. Uncapped, its card was 714px against 377px for its
  // neighbour, and the grid row it sat in took the tallest.
  const many = { ...CROSS, items: [{ ...CROSS.items[0], strands: Array.from(
    { length: 9 }, (_, i) => ({ kind: 'filing', date: '2026-08-26',
      title: `Filing ${i + 1}`, titleAr: `إفصاح ${i + 1}`, link: `https://www.egx.com.eg/${i}` })) }] };
  const c = fresh();
  c.setData({ ...LIVE, crossings: many });
  let x = c.renderVals().crossings[0];
  assert.equal(x.strands.length, 4, 'the thread list is not capped');
  assert.equal(x.hasMore, true);
  assert.equal(x.moreLabel, '5 more');
  // The count still reports every thread — the cap is a display cap, and a
  // card that says "4 threads" when nine were filed would be a wrong figure.
  assert.equal(x.threads, '9 threads');
  // The drawn line ends on the last row SHOWN, not the last row held.
  assert.equal(x.strands[3].tail, 'transparent');

  x.toggleMore();
  x = c.renderVals().crossings[0];
  assert.equal(x.strands.length, 9, 'expanding did not reveal the rest');
  assert.equal(x.moreLabel, 'Show fewer');
  assert.equal(x.strands[8].tail, 'transparent');
  assert.equal(x.strands[3].tail, 'var(--thread, var(--rule))');

  // A crossing under the cap is never asked to expand.
  const few = fresh();
  few.setData({ ...LIVE, crossings: CROSS });
  assert.equal(few.renderVals().crossings[0].hasMore, false);
});

test('the colours on the axis are named once, for the whole section', () => {
  // Eight axes of coloured dots say nothing until something names the
  // colours, and a key on every card would cost more room than the axes take.
  const v = screen({ ...LIVE, crossings: CROSS });
  assert.deepEqual(v.crossLegend.map((g) => g.label), ['Filing', 'In the press', 'That session']);
  // The legend and the dots have to agree, or the key is decoration.
  const onAxis = v.crossings[0].cells.flatMap((d) => d.dots.map((p) => p.color));
  for (const colour of onAxis) {
    assert.ok(v.crossLegend.some((g) => g.color === colour),
      `a dot is drawn in ${colour}, which the legend does not name`);
  }
  assert.deepEqual(screen(LIVE).crossLegend, []);
});

/* ── the trailing twelve months ────────────────────────────────────────── */

test('a company screen shows both P/Es, each saying what it is over', () => {
  // The annual one can be struck against earnings twenty months old. ARCC is
  // 24.4 on FY 2024 and 5.7 on its last twelve months — the same company, the
  // same price, a year of difference in the earnings. Undated, the pair reads
  // as one figure disagreeing with itself.
  const c = fresh();
  c.setData(LIVE);
  c.state.screen = 'company';
  c.state.ticker = 'AAAA';
  c._co = { ticker: 'AAAA', name: { en: 'A', ar: 'أ' }, sector: 'Finance', profile: {},
            close: 75.6, pct: 1, pe: 24.44, pePeriod: 'FY 2024',
            peTtm: 5.73, peTtmTo: 'H1 2026', epsTtm: 13.189,
            peTtmWindow: 'FY 2025 + H1 2026 - H1 2025',
            eps: 3.09, epsPeriod: 'FY 2024' };
  const v = c.renderVals();
  const annual = v.co.stats.find((s) => s.label === 'P/E');
  const twelve = v.co.stats.find((s) => s.label === 'P/E · 12M');
  assert.equal(annual.value, '24.4');
  assert.equal(annual.note, 'over FY 2024');
  assert.equal(twelve.value, '5.7');
  assert.equal(twelve.note, 'to H1 2026');
  // And the sum is printed, so the figure can be taken apart.
  assert.ok(v.co.ttmWorking.includes('FY 2025 + H1 2026 - H1 2025'));
  assert.ok(v.co.ttmWorking.includes('13.19'));
  assert.ok(/nothing here is forecast/.test(v.co.ttmWorking));
});

test('a company the pipeline refused a trailing P/E shows a dash, not the annual', () => {
  const c = fresh();
  c.setData(LIVE);
  c.state.screen = 'company';
  c.state.ticker = 'AAAA';
  c._co = { ticker: 'AAAA', name: { en: 'A', ar: 'أ' }, sector: 'Finance', profile: {},
            close: 10, pct: 1, pe: 8.4, pePeriod: 'FY 2024', peTtm: null };
  const v = c.renderVals();
  assert.equal(v.co.stats.find((s) => s.label === 'P/E · 12M').value, '—');
  assert.equal(v.co.ttmWorking, '', 'a refused figure still printed its working');
});

test('§8 the trailing figure is described as filed arithmetic, never a forecast', () => {
  const en = screen(LIVE).L.ttmWorking;
  const ar = screen(LIVE, 'ar').L.ttmWorking;
  for (const copy of [en, ar]) {
    assert.ok(!DIRECTIVE.test(copy), '§8: the trailing note reads as advice');
  }
  // The word that would make it a claim about the future.
  assert.ok(!/\b(estimate|estimated|projected|forecast to|expected to)\b/i.test(en),
    'the note calls a filed sum an estimate');
});

test('the reader carries the trailing figure and its window off the document', async () => {
  const { readFile } = await import('node:fs/promises');
  const raw = JSON.parse(await readFile(
    new URL('../../public/data/v1/companies.json', import.meta.url), 'utf8'));
  // Shape, not census. A hard minimum here is the same brittleness that took
  // the publish down when gold failed to resolve: a run whose checkout
  // predates a builder writes a directory without its field, and a test that
  // demands the field halts the publish over a race it cannot fix. The
  // pipeline's own test owns coverage; this one owns "whatever is published
  // is well formed".
  const withTtm = raw.companies.filter((c) => typeof c.pe_ttm === 'number');
  for (const company of withTtm) {
    assert.ok(company.pe_ttm_window, `${company.ticker} publishes a ratio with no working`);
    assert.match(company.pe_ttm_window, /.+ \+ .+ - .+/, company.ticker);
    assert.ok(company.pe_ttm >= 1 && company.pe_ttm <= 200,
      `${company.ticker} publishes ${company.pe_ttm}`);
  }
});

/* ── the audit's remaining confirmed findings ──────────────────────────── */

test('the session carries how many trades and how much money, or a dash', async () => {
  // Volume is shares and turnover is pounds, and one without the other says
  // nothing about size: a million shares of a two-pound company and a million
  // of a hundred-pound one are the same volume and fifty times the money.
  const c = fresh();
  c.setData(LIVE);
  c.state.screen = 'company';
  c.state.ticker = 'AAAA';
  const tileIn = (stats, label) => stats.find((t) => t.label === label);

  c._co = { ticker: 'AAAA', profile: { trades: 900, turnover: 12000000 },
            trades: 1986, turnover: 294469912, close: 10, pct: 1.5 };
  const live = c.renderVals().co.stats;
  assert.equal(tileIn(live, 'Trades').value, '1,986', 'the live feed should win');
  assert.match(tileIn(live, 'Turnover').value, /294/);
  assert.equal(tileIn(live, 'Trades').note, 'in the session');

  // After the close the feed carries neither, and the document's own — written
  // by the last harvest of the day — keeps the tiles from emptying every
  // afternoon.
  c._co = { ticker: 'AAAA', profile: { trades: 900, turnover: 12000000 },
            trades: null, turnover: null, close: 10, pct: 1.5 };
  assert.equal(tileIn(c.renderVals().co.stats, 'Trades').value, '900');

  // A company on the vendor half of the feed has neither anywhere. A dash,
  // never a nought: no trades and no figure are different facts.
  c._co = { ticker: 'AAAA', profile: {}, close: 10, pct: 1.5 };
  const none = c.renderVals().co.stats;
  assert.equal(tileIn(none, 'Trades').value, '\u2014');
  assert.equal(tileIn(none, 'Turnover').value, '\u2014');
  assert.equal(tileIn(none, 'Trades').note, '',
    'a dash must not be labelled "in the session"');

  // main.js has to hand both across, or every company prints a dash and
  // nothing fails — which is exactly how Volume broke.
  const { readFile } = await import('node:fs/promises');
  const main = await readFile(new URL('../../public/esthmr/main.js', import.meta.url), 'utf8');
  const co = main.slice(main.indexOf('component._co = {'), main.indexOf('component._co = {') + 700);
  for (const field of ['trades', 'turnover']) {
    assert.match(co, new RegExp(`\\b${field}: row\\.${field}\\b`),
      `${field} never reaches the company screen`);
  }
});

test('the header shows the session\'s volume, and says which is the average', () => {
  // This tile printed the THIRTY-DAY MEAN directly beside the close and the
  // session date, where it reads as that session's volume — COMI showed
  // 3,192,564 against an actual 5,780,737 already mapped onto the row.
  const c = fresh();
  c.setData(LIVE);
  c.state.screen = 'company';
  c.state.ticker = 'AAAA';
  c._co = { ticker: 'AAAA', name: { en: 'A', ar: 'أ' }, sector: 'Finance', close: 10, pct: 1,
            volume: 5780737, profile: { avg_volume_30d: 3192564, free_float: 0.68401 } };
  const stats = c.renderVals().co.stats;
  const session = stats.find((s) => s.label === 'Volume');
  assert.equal(session.value, '5,780,737');
  assert.equal(session.note, 'in the session');
  assert.equal(stats.find((s) => s.label === '30-day average').value, '3,192,564');
});

test('free float is a fact the document carries, not one the copy denies', () => {
  // The ratios note told every reader on 258 pages that free float "is not
  // published anywhere", while profile.free_float sat in the document the
  // page had already loaded for its market cap.
  const c = fresh();
  c.setData(LIVE);
  c.state.screen = 'company';
  c.state.ticker = 'AAAA';
  c._co = { ticker: 'AAAA', name: { en: 'A', ar: 'أ' }, sector: 'Finance', close: 10, pct: 1,
            profile: { free_float: 0.68401, shares_outstanding: 3405140000 } };
  const facts = c.renderVals().co.briefFacts;
  assert.equal(facts.find((f) => f.label === 'Free float').value, '68.4%');
  // A company whose document does not carry one gets no row rather than a dash.
  c._co = { ticker: 'AAAA', name: { en: 'A', ar: 'أ' }, sector: 'Finance', close: 10, pct: 1, profile: {} };
  assert.equal(c.renderVals().co.briefFacts.some((f) => f.label === 'Free float'), false);
});

test('Home\'s list is derived and says what it is, not a watchlist nobody chose', () => {
  // Five tickers the design named, padded from the largest companies, headed
  // "Watchlist" — every signed-in reader saw the identical list, none of them
  // had chosen it, and there was no control to change it.
  const v = screen({ ...LIVE, companies: [
    { ticker: 'AAAA', name: { en: 'A', ar: 'أ' }, sector: 'Finance', close: 10, pct: 1, cap: 300 },
    { ticker: 'BBBB', name: { en: 'B', ar: 'ب' }, sector: 'Finance', close: 10, pct: 1, cap: 900 },
    { ticker: 'CCCC', name: { en: 'C', ar: 'ج' }, sector: 'Finance', close: 10, pct: 1, cap: 600 },
  ] });
  assert.deepEqual(v.watchlist.map((w) => w.ticker), ['BBBB', 'CCCC', 'AAAA']);
  assert.equal(v.L.watchlist, 'Largest by market value');
  const printed = JSON.stringify(v, (k, x) => (typeof x === 'function' ? undefined : x));
  for (const design of ['COMI', 'KORA', 'ETEL', 'TMGH', 'AMOC']) {
    assert.ok(!printed.includes(`"${design}"`), `the design's ${design} is still named`);
  }
});

test('a commodity is priced in dollars and an index in points', () => {
  const world = [{ label: 'Oil', kind: 'commodity', level: 83.4, change_percent: -0.16 },
                 { label: 'S&P 500', kind: 'index', level: 7711.76, change_percent: 0.1 }];
  const c = fresh();
  c.setData({ ...LIVE, rates: world.map((x) => ({
    label: x.label, unit: x.kind === 'commodity' ? 'USD' : 'points', value: String(x.level), pct: '' })) });
  const by = Object.fromEntries(c.renderVals().ratesArrowed.map((r) => [r.label, r]));
  assert.equal(by.Oil.unit, 'USD', 'oil printed as a bare number on a page of pounds');
  assert.equal(by['S&P 500'].unit, 'points');
});

test('the borrowings panel is absent where the filing states no prior column', () => {
  // 49 of the 120 companies with a borrowings block drew the heading
  // "Movement since —", a 27px "—", a sentence "—" and an empty basis line.
  const c = fresh();
  const block = { period: 'H1 2026', as_of: '2026-06-30', borrowings: 100, short_term: 60,
                  long_term: 40, cash: 10, net_debt: 90 };
  c.setData(LIVE);
  c.state.screen = 'company';
  c.state.ticker = 'AAAA';
  // The block travels on the company document, which is where main.js puts it.
  c._co = { ticker: 'AAAA', name: { en: 'A', ar: 'أ' }, sector: 'Finance',
            close: 10, pct: 1, profile: {}, debt: block };
  assert.equal(c.renderVals().debt.hasChange, false);
  assert.equal(c.renderVals().debt.directionLine, '');

  c._co = { ...c._co, debt: { ...block,
    change: { since: '2025-12-31', delta: 21496, direction: 'up', borrowings: 62509.2 } } };
  const withChange = c.renderVals().debt;
  assert.equal(withChange.hasChange, true);
  // The date is printed once, by the heading, and read as a date.
  assert.equal(withChange.since, '31 December 2025');
  assert.equal(withChange.directionLine, 'Higher than they were, at 62,509.2.');
  assert.ok(!withChange.directionLine.includes('2025-12-31'), 'the sentence repeats the heading');
});

test('an unstated figure on the statements table recedes', () => {
  // `f.revenue === null` never fired because the field is ABSENT, not null,
  // on roughly 97% of those cells — so every em dash was drawn at full
  // strength and a table that is mostly unstated read as four equal columns.
  const v = screen({ ...LIVE, fins: [
    { period: 'FY 2025', period_end: '2025-12-31', net_income: 10 },
    { period: 'FY 2024', period_end: '2024-12-31', revenue: 624, net_income: 8 },
  ] });
  assert.equal(v.fins[0].revenue, '—');
  assert.ok(v.fins[0].revColor.includes('faint'), 'an absent figure is drawn at full strength');
  assert.ok(v.fins[1].revColor.includes('ink'));
});

test('the median company is not described as below itself', () => {
  const c = fresh();
  const cards = c.ratioCards({ sector: 'Finance', metrics: [
    { key: 'pe', value: 10.41, unit: 'ratio', peer_median: 10.41, peer: 'below', points: 1, series: [] },
    { key: 'pb', value: 2.0, unit: 'ratio', peer_median: 3.0, peer: 'below', points: 1, series: [] },
  ] }, c.copy(), false);
  assert.equal(cards.find((x) => x.key === 'pe').peer, 'level with its sector');
  assert.equal(cards.find((x) => x.key === 'pb').peer, 'below its sector');
});

test('the sort caret points the way the column is actually sorted', () => {
  // The string branch multiplies by -1 so text reads A-Z on the first click
  // while numbers put the largest first; the caret was read off `dir` alone,
  // so the three text columns pointed the wrong way and the four numeric ones
  // pointed the right way.
  const set = { ...LIVE, companies: [
    { ticker: 'ZZZZ', name: { en: 'Z', ar: 'ز' }, sector: 'Finance', close: 1, pct: 1, cap: 100 },
    { ticker: 'AAAA', name: { en: 'A', ar: 'أ' }, sector: 'Finance', close: 9, pct: 1, cap: 900 },
  ] };
  const c = fresh();
  c.setData(set);
  c.state.sort = 'ticker'; c.state.dir = -1;
  let v = c.renderVals();
  assert.equal(v.rows[0].ticker, 'AAAA', 'text sorts A-Z on the first click');
  assert.equal(v.cols[0].caret, ' ↑', 'A-Z is ascending and must point up');
  c.state.sort = 'cap';
  v = c.renderVals();
  assert.equal(v.rows[0].ticker, 'AAAA', 'numbers put the largest first');
  assert.equal(v.cols[5].caret, ' ↓', 'largest-first is descending and must point down');
});

test('a results-due expectation reaches the screen, labelled as an estimate', () => {
  // 200 companies publish one and no screen showed it: streaks and firsts are
  // usually empty and `quiet` is null for almost every ticker, so the block
  // rendered one card or none.
  const c = fresh();
  const cards = c.signalCards({ streaks: [], firsts: [], quiet: null, resultsDue: [
    { label: '9M', expected: '2026-11-14', window_start: '2026-10-19',
      window_end: '2026-11-16', observations: 12 },
  ] }, c.copy(), false);
  assert.equal(cards.length, 1);
  assert.equal(cards[0].kind, 'Results due');
  assert.match(cards[0].title, /9M filing is expected in November/);
  assert.match(cards[0].because, /12 past filings.*19 Oct.*16 Nov/);
  assert.match(cards[0].stamp, /estimate/);
});

test('the unclassified bucket gets a word rather than an em dash', () => {
  const set = { ...LIVE, companies: [
    { ticker: 'AAAA', name: { en: 'A', ar: 'أ' }, sector: 'Unclassified',
      sectorAr: 'غير مصنّف', close: 10, pct: 1, cap: 100 },
  ] };
  assert.equal(screen(set).rows[0].sector, 'Unclassified');
  assert.equal(screen(set, 'ar').rows[0].sector, 'غير مصنّف');
  assert.ok(!screen(set).sectorChips.some((s) => s.label === '—'),
    'a chip whose whole label is an em dash reads as a rendering fault');
});

test('the search box filters as you type and keeps the caret', async () => {
  // The design writes React's `onChange`, which fires per keystroke. Bound to
  // the DOM event of the same name it fires on blur or Enter instead, so the
  // Market screen's primary control did nothing at all while a reader typed —
  // and when it did commit, the full rebuild destroyed the input and took the
  // caret with it, so refining a search meant clicking back in every time.
  //
  // Driven in a real browser this reads 282 → 207 → 132 → 34 → 1 rows across
  // "c", "co", "com", "comi" with focus and selection intact. The DOM stub
  // here cannot mount, so this holds the two mechanisms in place instead.
  const { readFile } = await import('node:fs/promises');
  const dc = await readFile(new URL('../../public/esthmr/dc.js', import.meta.url), 'utf8');
  assert.match(dc, /addEventListener\('input', handler\)/,
    'onChange is not bound to the event React means by it');
  assert.match(dc, /addEventListener\('change', handler\)/,
    'a select or checkbox has only the change event');
  assert.match(dc, /selectionStart/,
    'the caret position is not recorded across the rebuild');
  assert.match(dc, /setSelectionRange/,
    'the caret is not restored after the rebuild');
  // And the click path must not have picked up the input listener.
  assert.ok(!/addEventListener\('input', handler\)[\s\S]{0,80}cursor = 'pointer'/.test(dc));
});

test('main.js hands the company screen every session field it reads', async () => {
  // The bug this exists for, and it was mine: the Volume tile was moved off
  // the thirty-day mean onto the session's own figure, and `volume` was never
  // added to the object main.js builds — so all 282 company pages printed an
  // em dash beside a "30-day average" that had a number in it, while the
  // figure sat in the directory row in memory. Nothing failed.
  //
  // The test that was supposed to cover it hand-wrote `c._co = { ..., volume:
  // 5780737 }`, which exercises logic.js in isolation and never touches the
  // wiring. So this reads the wiring itself: every `loaded.X` the company
  // screen reads must be a key the document supplies or a key main.js copies
  // off the directory row.
  const { readFile } = await import('node:fs/promises');
  const main = await readFile(new URL('../../public/esthmr/main.js', import.meta.url), 'utf8');
  const logic = await readFile(new URL('../../public/esthmr/logic.js', import.meta.url), 'utf8');

  // What the screen reads WITHOUT a fallback. `loaded.closeDate || D.marketDate`
  // degrades on purpose and is not this test's business; `whole(loaded.volume)`
  // has nowhere to go but a dash, and that is the shape that shipped.
  const all = [...logic.matchAll(/\bloaded\.([a-zA-Z_$][\w$]*)\s*(\|\||\?\?)?/g)];
  assert.ok(all.length > 20, 'the scanner found almost no loaded.* reads');
  const guarded = new Set(all.filter((m) => m[2]).map((m) => m[1]));
  const read = new Set(all.map((m) => m[1]).filter((k) => !guarded.has(k)));

  // What main.js copies off the directory row, plus whatever data.company()
  // spreads in.
  const literal = main.slice(main.indexOf('component._co = {'),
                             main.indexOf('component._d = {', main.indexOf('component._co = {')));
  assert.ok(literal.includes('...doc'), 'the company document is no longer spread in');
  const copied = new Set([...literal.matchAll(/(\w+)\s*:\s*row\.\w+/g)].map((m) => m[1]));
  copied.add('ticker');

  const c = fresh();
  c.setData(LIVE);
  // What `data.company()` actually spreads in, asked of the function rather
  // than copied from it. This was a hand-kept list of ten key names, so adding
  // a field to `company()` made this test fail on the field it had just been
  // given — the one shape of drift a wiring test must not have.
  const published = JSON.parse(await readFile(
    new URL('../../public/data/v1/companies.json', import.meta.url), 'utf8'));
  const real = published.companies.find((x) => x.ticker);
  const fromDoc = new Set(Object.keys(
    await fromDisk(() => data.company(real.ticker))));
  assert.ok(fromDoc.has('profile') && fromDoc.has('series'),
    'company() no longer returns the document it is read for');

  const dropped = [...read].filter((k) => k && !copied.has(k) && !fromDoc.has(k));
  assert.deepEqual(dropped, [],
    'the company screen reads these off `loaded` and main.js never puts them there — '
    + 'they render as an em dash on every company page');

  // And specifically the one that broke, end to end through the real wiring.
  assert.ok(/volume:\s*row\.volume/.test(literal),
    'the session volume is not threaded onto the company screen');
});

/* ── the audit's unverified half, once it had verdicts ─────────────────── */

test('the statements table is chronological, including the rows with no stated end', async () => {
  // 8,002 of 11,480 filed rows carry `period_end`; the rest carry only a
  // label, and sorting on the field alone dropped them into one unordered
  // block at the foot — AALR's last 21 rows read "Q3 2025, Q4 2022, Q4 2023,
  // Q4 2024" under a correctly ordered 49. 227 of the 249 companies with
  // statements had at least one.
  assert.equal(data.periodEnd({ period_end: '2026-06-30', period: 'H1 2026' }), '2026-06-30');
  // The label is enough, and "(to 30 Jun)" is the company telling us its
  // year-end — which a fixed quarter-end table would get wrong for the 408
  // annual filings here that do not end in December.
  assert.equal(data.periodEnd({ period: 'FY 2025 (to 30 Jun)' }), '2025-06-30');
  assert.equal(data.periodEnd({ period: '9M 2026 (to 31 Mar)' }), '2026-03-31');
  assert.equal(data.periodEnd({ period: 'Q4 2022' }), '2022-12-31');
  assert.equal(data.periodEnd({ period: 'H1 2024' }), '2024-06-30');
  assert.equal(data.periodEnd({ period: 'nothing dated' }), '');

  const doc = await fromDisk(() => data.company('AALR'));
  const keys = doc.fins.map(data.periodEnd);
  assert.ok(keys.length > 20);
  assert.deepEqual(keys, [...keys].sort().reverse(), 'AALR is out of order');
});

test('an open-filing link names where it actually goes', () => {
  // "Open filing →" was printed on all 11,480 rows: for 4,047 it opened a
  // Mubasher stock page — a third-party summary, not the signed document —
  // and for the exchange-sourced rows it opened egx.com.eg's FRONT PAGE.
  const v = screen({ ...LIVE, fins: [
    { period: 'H1 2026', period_end: '2026-06-30', net_income: 1,
      filing_id: 'egx-293904', source: 'https://www.egx.com.eg' },
    { period: 'FY 2025', period_end: '2025-12-31', net_income: 1,
      source: 'https://english.mubasher.info/markets/EGX/stocks/EOSB/financial-statements' },
    { period: 'FY 2024', period_end: '2024-12-31', net_income: 1, source: '' },
  ] });
  const [filed, mubasher, none] = v.fins;
  assert.equal(filed.openLabel, 'Open on the Egyptian Exchange');
  assert.equal(filed.openHref, 'https://www.egx.com.eg/en/NewsDetails.aspx?NewsID=293904',
    'a row with a filing id still points at the front page');
  assert.equal(mubasher.openLabel, 'Open on Mubasher');
  assert.equal(none.hasOpen, false, 'a row with no source still offers a link');
});

test('a signal card that names a filing can open it', () => {
  const c = fresh();
  const cards = c.signalCards({
    streaks: [{ kind: 'back_to_profit', period: 'Q3 2025', run: 4, since: '2024-01-01',
                filed: '2026-01-13', id: 'egx-282099',
                link: 'https://www.egx.com.eg/en/NewsDetails.aspx?NewsID=282099' }],
    firsts: [], quiet: null,
    // An estimate is read off signals.json, not off a document, so it gets no
    // anchor — the same line the calendar's expected entries keep.
    resultsDue: [{ label: '9M', expected: '2026-11-14', observations: 12,
                   window_start: '2026-10-19', window_end: '2026-11-16' }],
  }, c.copy(), false);
  const [streak, due] = cards;
  assert.equal(streak.hasHref, true);
  assert.match(streak.href, /NewsID=282099/);
  assert.equal(due.hasHref, false);
  assert.equal(due.href, '');
});

test('a share that did not move gets no arrow', () => {
  // 50 of the 282 closed exactly flat and every one carried a falling arrow
  // beside "0.00%", on a site whose Home screen counts them as held.
  const set = { ...LIVE, companies: [
    { ticker: 'FLAT', name: { en: 'F', ar: 'ف' }, sector: 'Finance', close: 24.99, pct: 0, cap: 100 },
    { ticker: 'UPPP', name: { en: 'U', ar: 'ي' }, sector: 'Finance', close: 10, pct: 1.2, cap: 100 },
    { ticker: 'DOWN', name: { en: 'D', ar: 'د' }, sector: 'Finance', close: 10, pct: -1.2, cap: 100 },
  ] };
  const rows = Object.fromEntries(screen(set).rows.map((r) => [r.ticker, r]));
  assert.equal(rows.FLAT.arrow, '', 'a flat share is drawn as falling');
  assert.equal(rows.UPPP.arrow, '↗');
  assert.equal(rows.DOWN.arrow, '↘');

  // and the same on the company header
  const c = fresh();
  c.setData(set);
  c.state.screen = 'company';
  c.state.ticker = 'FLAT';
  c._co = { ticker: 'FLAT', name: { en: 'F', ar: 'ف' }, sector: 'Finance',
            close: 24.99, pct: 0, profile: {} };
  assert.equal(c.renderVals().co.arrow, '');
});

test('a sector median chip is named, never keyed', async () => {
  // 11 of the 15 cards ended their median row with a chip reading "pb 2.59×"
  // — a lowercase wire key beside "P/E" and "Return on equity", still Latin
  // in the Arabic view.
  const secs = await fromDisk(() => data.sectors());
  const raw = secs.flatMap((s) => (s.medians || []).map((m) => m.key))
    .filter((k) => /^[a-z][a-z_]*$/.test(k));
  assert.deepEqual([...new Set(raw)], [], 'these wire keys reach a sector card');
  const finance = secs.find((s) => s.name === 'Finance');
  const pb = (finance.medians || []).find((m) => /Price to book/.test(m.key));
  if (pb) assert.match((finance.medians.find((m) => m.keyAr && /القيمة الدفترية/.test(m.keyAr)) || {}).keyAr, /السعر/);
});

test('an Arabic reader gets the sector name in Arabic on the median line', () => {
  // 1,848 median lines across 258 companies read "وسيط Finance 10.41×" — a
  // Latin sector name inside an Arabic sentence.
  const set = { ...LIVE, companies: [
    { ticker: 'AAAA', name: { en: 'A', ar: 'أ' }, sector: 'Finance',
      sectorAr: 'التمويل والخدمات المالية', close: 10, pct: 1, cap: 100 },
  ], review: { sector: 'Finance', metrics: [
    { key: 'pe', value: 8.4, unit: 'ratio', peer_median: 10.41, peer: 'below',
      points: 1, series: [] },
  ] } };
  const c = fresh();
  c.state.lang = 'ar';
  c.setData(set);
  c.state.screen = 'company';
  c.state.ticker = 'AAAA';
  c._co = { ticker: 'AAAA', name: { en: 'A', ar: 'أ' }, sector: 'Finance', close: 10, pct: 1, profile: {} };
  const pe = c.renderVals().ratios.find((r) => r.key === 'pe');
  assert.ok(pe.peerMedian.includes('التمويل والخدمات المالية'), pe.peerMedian);
  assert.ok(!pe.peerMedian.includes('Finance'), 'the Latin sector name is still there');
});

test('the calendar opens on a month the archive holds, not on a date in the source', () => {
  // '2026-08' was compiled into the state initialiser. Right until 1
  // September: the index rolls, the screen keeps opening on August, and once
  // 2026-08 leaves the twelve-month window it opens on a month with no pill
  // lit and 31 empty cells while 1,467 filings sit one click away.
  const c = fresh();
  assert.equal(c.state.month, '', 'the default month is hardcoded again');
  c.setData({ ...LIVE, filedMonths: [
    { id: '2026-09', count: 12 }, { id: '2026-08', count: 1467 },
  ] });
  assert.equal(c.openMonth(), '2026-09', 'it does not open on the newest month');
  c.state.month = '2026-08';
  assert.equal(c.openMonth(), '2026-08', 'it ignores the reader\'s pick');
  c.state.month = '2019-04';                    // rolled out of the window
  assert.equal(c.openMonth(), '2026-09', 'a month the archive lost is not reconciled');
});

test('the Research rail entry is offered only when something is published', () => {
  // `studies` is the demo's three mock-up papers and nothing else, so every
  // signed-in reader who clicked Research got a 50px heading and the line
  // "Nothing published for this yet." — every time.
  const live = screen(LIVE);
  assert.equal(live.studies.length, 0);
  assert.ok(!live.nav.some((n) => /Research/.test(n.label)),
    'the rail offers a destination that cannot answer');
  const c = fresh();
  c.setData(data.demo());
  assert.ok(c.renderVals().nav.some((n) => /Research/.test(n.label)),
    'the demo lost its Research entry');
});

test('the template closes every element it opens', async () => {
  // A stray `</div>` closed a screen early and every screen after it rendered
  // one level shallower — which the browser silently repairs, so the page
  // looks almost right and the bindings all still resolve. Nothing else here
  // would have caught it: dc.js builds elements from the parsed tree, so a
  // mis-nested template is a layout bug with no error attached.
  const { readFile } = await import('node:fs/promises');
  const tpl = await readFile(new URL('../../public/esthmr/template.html', import.meta.url), 'utf8');

  for (const tag of ['div', 'section', 'article', 'sc-for', 'sc-if', 'a', 'main', 'aside']) {
    const open = (tpl.match(new RegExp(`<${tag}[ >]`, 'g')) || []).length;
    const close = (tpl.match(new RegExp(`</${tag}>`, 'g')) || []).length;
    assert.equal(open, close, `<${tag}> is opened ${open} times and closed ${close}`);
  }

  // And every screen sits at the same nesting depth, which is the shape a
  // stray close actually breaks.
  const lines = tpl.split('\n');
  let depth = 0;
  const screens = [];
  for (const line of lines) {
    const isScreen = /<sc-if value="\{\{ is\w+ \}\}"/.exec(line);
    if (isScreen) screens.push([/is(\w+)/.exec(line)[1], depth]);
    depth += (line.match(/<div[ >]/g) || []).length - (line.match(/<\/div>/g) || []).length;
  }
  assert.ok(screens.length >= 8, `only ${screens.length} screens found`);
  const [, first] = screens[0];
  for (const [name, at] of screens) {
    assert.equal(at, first, `the ${name} screen opens at depth ${at}, not ${first}`);
  }
  assert.equal(depth, 0, 'the template does not close back to the root');
});

/* ── the six edits ─────────────────────────────────────────────────────── */

const INVDOC = {
  updated_at: '2026-08-30T09:00:00Z', source: 'beta.egx.com.eg /api/bff/egx/investor-full-statistics',
  currency: 'EGP', basis: 'period to date, as published by the exchange',
  by_nationality: [
    { party: 'Egyptians', party_ar: 'مصريين', percent: 60.27, net: 3827816945, buy: 1, sell: 1, combined: false },
    { party: 'Arab', party_ar: 'عرب', percent: 13.14, net: -4434018063, buy: 1, sell: 1, combined: false },
    { party: 'Non-Arab Foreigners', party_ar: 'أجانب', percent: 26.58, net: 606201118, buy: 1, sell: 1, combined: false },
    { party: 'Arabs & Foreigners', party_ar: 'عرب وأجانب', percent: 39.72, net: -3827816945, combined: true },
  ],
  individuals: [
    { party: 'Egyptians', net: 377553473, combined: false },
    { party: 'Arab', net: -38378118, combined: false },
    { party: 'Non-Arab Foreigners', net: 18511127, combined: false },
    { party: 'Arabs & Foreigners', net: -19866990, combined: true },
  ],
  institutions: [
    { party: 'Egyptians', net: 3450263472, combined: false },
    { party: 'Arab', net: -4395639946, combined: false },
    { party: 'Non-Arab Foreigners', net: 587689991, combined: false },
    { party: 'Arabs & Foreigners', net: -3807949955, combined: true },
  ],
};

test('the investor split keeps the exchange\'s parties and drops its combined row', async () => {
  // "Arabs & Foreigners" is the exchange's own convenience total — the sum of
  // the two beside it, not a fourth party. Counting it beside its parts
  // double-counts the market.
  globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => INVDOC });
  const inv = await data.investors();
  delete globalThis.fetch;
  assert.deepEqual(inv.parties.map((p) => p.party), ['Egyptians', 'Arab', 'Non-Arab Foreigners']);
  assert.equal(inv.arabsAndForeigners.party, 'Arabs & Foreigners');
  assert.deepEqual(inv.bands.map((b) => b.label), ['Individuals', 'Institutions']);
  // Every pound bought is a pound sold, so the two bands must cancel — to
  // within the rounding the exchange publishes at, not to the pound.
  const [ind, inst] = inv.bands;
  const drift = Math.abs(ind.net + inst.net) / Math.max(Math.abs(ind.net), Math.abs(inst.net));
  assert.ok(drift < 1e-6, `${ind.net} and ${inst.net} do not cancel (${drift})`);
  // and each band's cells follow the same party order as the header row
  assert.deepEqual(ind.cells.map((c) => c.party), inv.partyOrder);
});

test('the investors screen says what period the figures cover', () => {
  const v = screen({ ...LIVE, investors: {
    basis: 'period to date, as published by the exchange', source: 'beta.egx.com.eg',
    parties: [{ party: 'Egyptians', partyAr: 'مصريين', percent: 60.27, net: 3827816945 }],
    partyOrder: ['Egyptians'],
    bands: [{ label: 'Individuals', labelAr: 'أفراد', net: 1, cells: [{ party: 'Egyptians', net: 1 }] }],
  } });
  assert.equal(v.noInvestors, false);
  assert.equal(v.investors.parties[0].percent, '60.27%');
  // The exchange states this period-to-date. A screen that lets it read as
  // today's session is stating a different fact.
  assert.match(v.L.investorsBasis, /period to date/i);
  // And it does not draw a curve the exchange does not publish.
  assert.match(v.L.investorsNoIntraday, /no intraday/i);
  assert.equal(screen(LIVE).noInvestors, true);
});

test('the watchlist is a ticker and nothing else, kept per reader', async () => {
  const w = await import('../../public/esthmr/watchlist.js');
  const store = {};
  globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = v; } };
  try {
    w.add('a@b.c', 'COMI');
    w.add('A@B.C', 'ABUK');                       // the same reader, cased differently
    assert.deepEqual(w.read('a@b.c'), ['ABUK', 'COMI'], 'newest first');
    assert.deepEqual(w.read('other@x.com'), [], 'one reader can see another\'s list');
    assert.deepEqual(w.read(null), [], 'signing out hands over the previous reader\'s list');
    w.toggle('a@b.c', 'COMI');
    assert.deepEqual(w.read('a@b.c'), ['ABUK']);
    // A ticker and nothing else — no share count, no cost basis (§33).
    assert.ok(JSON.parse(store[Object.keys(store)[0]]).every((x) => typeof x === 'string'));
  } finally { delete globalThis.localStorage; }
});

test('the watchlist has a screen of its own, and Home no longer keeps one', async () => {
  // It was a block half way down Home, under the day's summary, being
  // scrolled past. A list a reader BUILDS is not a summary of the day, and a
  // place to go back to has to be somewhere you can go.
  const v = screen(LIVE);
  const entry = v.nav.find((n) => n.label === 'Watchlist');
  assert.ok(entry, 'the rail offers it');
  assert.equal(screen(LIVE, 'ar').nav.some((n) => n.label === 'المتابَعة'), true);

  const { readFile } = await import('node:fs/promises');
  const template = await readFile(new URL('../../public/esthmr/template.html', import.meta.url), 'utf8');
  assert.equal(template.includes('{{ isWatchlist }}'), true, 'the screen exists');
  // Exactly one loop over the list, so the same companies cannot be drawn in
  // two places and drift apart.
  assert.equal(template.split('list="{{ followed }}"').length - 1, 1);

  const c = fresh();
  c.setData(LIVE);
  c.state.screen = 'watchlist';
  assert.equal(c.renderVals().isWatchlist, true);
  assert.equal(c.renderVals().isHome, false);
});

test('there is a way to follow a company, on the two screens that say so', async () => {
  // The feature shipped write-only: every row computed `star`, `starColor` and
  // `follow`, the company screen computed `companyStar` and `companyFollow`,
  // and the template rendered none of them. The only star on the page was on
  // the followed block itself — which could unfollow what was already there,
  // and nothing could get there. The empty state promised "tap the star beside
  // any company, in the market table or on its own page" and neither existed.
  const { readFile } = await import('node:fs/promises');
  const template = await readFile(new URL('../../public/esthmr/template.html', import.meta.url), 'utf8');
  assert.ok(template.includes('onClick="{{ r.follow }}"'), 'the market table offers it');
  assert.ok(template.includes('onClick="{{ companyFollow }}"'), 'a company screen offers it');
  assert.ok(template.includes('{{ r.star }}') && template.includes('{{ companyStar }}'));

  // And pressing it reaches the handler main.js installs.
  const c = fresh();
  c.setData(LIVE);
  const asked = [];
  c.onWatch = (t) => asked.push(t);
  c.renderVals().rows.find((r) => r.ticker === 'BBBB').follow({ stopPropagation() {} });
  c.state.ticker = 'AAAA';
  c.renderVals().companyFollow();
  assert.deepEqual(asked, ['BBBB', 'AAAA']);

  // It follows the company the CARD is showing, not the ticker in the state.
  // On the demo every company opens the one worked example, so a control bound
  // to the state would put DEMO15 on the list from a card headed DEMO01.
  const d = fresh();
  d.setData(data.demo());
  d.state.ticker = 'DEMO15';
  const shown = d.renderVals();
  d.onWatch = (t) => asked.push(t);
  shown.companyFollow();
  assert.equal(asked[asked.length - 1], shown.co.ticker);

  // And with no company chosen there is nothing to follow, so no control.
  const none = fresh();
  none.setData(LIVE);
  assert.equal(none.renderVals().canFollowCompany, false);
  assert.equal(none.renderVals().co.ticker, '\u2014');
});

test('the demo answers a click with the company that was clicked', () => {
  // Every row on the demo led to the one worked example, so opening DEMO15
  // drew a card headed DEMO01, at DEMO01's close, with DEMO01's sector. On a
  // screen whose whole job is showing what the real one looks like, that is
  // the wrong company under the reader's own click.
  const c = fresh();
  c.setData(data.demo());
  const wanted = c.renderVals().rows[3];
  c.state.screen = 'company';
  c.state.ticker = wanted.ticker;
  const v = c.renderVals();
  assert.equal(v.co.ticker, wanted.ticker);
  assert.equal(v.co.nameEn, wanted.name);
  assert.equal(v.co.close, wanted.close);
  assert.equal(v.co.pct, wanted.pct);
  // And with nothing opened it still has a shape to show.
  const unopened = fresh();
  unopened.setData(data.demo());
  assert.ok(unopened.renderVals().co.ticker);
});

test('the watchlist screen is there before anything is in it', () => {
  // Empty is the state every reader meets first, and a screen that says only
  // "nothing here" is a dead end. It says what to press, and offers the way.
  const v = screen(LIVE);
  assert.equal(v.noFollowed, true);
  assert.equal(v.hasFollowed, false);
  assert.equal(v.followedCount, '');
  assert.match(v.L.followEmpty, /star/i);
  assert.equal(typeof v.goMarket, 'function');
  assert.equal(typeof v.clearWatch, 'function');
});

test('the list says where it is actually kept, which depends on who is reading', () => {
  // Signed in it follows the account to another browser; signed out there is
  // no account to keep it against. Telling a reader the wrong one of those is
  // telling them their list is somewhere it is not.
  const c = fresh();
  c.setData(LIVE);
  assert.equal(c.renderVals().followKept, c.renderVals().L.followKeptDevice);
  c._reader = 'me@example.com';
  assert.equal(c.renderVals().followKept, c.renderVals().L.followKeptAccount);
  assert.match(c.renderVals().L.followKeptAccount, /account/i);
});

test('the followed counters count prices, not arrows', () => {
  // A row draws no arrow both for a share that closed exactly flat and for one
  // with no price at all, and those are not the same fact. Counted off the
  // rows, an unpriced company would be reported as unchanged.
  const c = fresh();
  c.setData({ ...LIVE, companies: [
    ...LIVE.companies,
    { ticker: 'CCCC', name: { en: 'C', ar: 'ج' }, sector: 'Banks', close: 5, pct: 0, cap: 30, pe: 5 },
    { ticker: 'DDDD', name: { en: 'D', ar: 'د' }, sector: 'Banks', close: '—', pct: null, cap: 40, pe: null },
  ] });
  c._watch = ['AAAA', 'BBBB', 'CCCC', 'DDDD'];
  const v = c.renderVals();
  assert.equal(v.followedCount, '4');
  assert.equal(v.followUp, '1');
  assert.equal(v.followDown, '1');
  assert.equal(v.followFlatCount, '1');
  // Three of four are priced, and the total on the cards says three so that
  // the three figures add up to it.
  assert.equal(v.followOf, 'of 3');
});

test('a followed company that leaves the exchange drops out rather than showing dashes', () => {
  const c = fresh();
  c.setData(LIVE);
  c._watch = ['AAAA', 'GONE'];
  const v = c.renderVals();
  assert.deepEqual(v.followed.map((f) => f.ticker), ['AAAA']);
  assert.equal(v.followedCount, '1');   // a count for the chip, blank when none
  assert.equal(v.followed[0].watched, true);
  assert.equal(v.followed[0].star, '★');
  // and an unfollowed row offers the empty star
  assert.equal(v.rows.find((r) => r.ticker === 'BBBB').star, '☆');
});

test('a filing opens the document, and its ticker opens the company', () => {
  // The row had a hover state, a pointer and no handler at all: every filing
  // in the archive carries the exchange's own link — 1,467 of 1,467 in August
  // — and the panel bound none of them.
  const rows = [
    { date: '2026-08-24', ticker: 'AAAA', what: 'A results release', section: 'Results',
      href: 'https://example.egx/filing/1' },
    { date: '2026-08-23', ticker: 'BBBB', what: 'B board decisions', section: 'Board', href: null },
  ];
  const c = fresh();
  c.setData({ ...LIVE, filedMonths: [{ id: '2026-08', count: 2 }],
              filedArchive: rows, filedArchiveMonth: '2026-08' });
  c.state.screen = 'calendar';
  const events = c.renderVals().filedEvents;
  assert.equal(events[0].hasHref, true);
  assert.equal(events[0].href, 'https://example.egx/filing/1');
  // A filing with no document says so rather than rendering an empty link.
  assert.equal(events[1].hasHref, false);
  assert.equal(events[1].noHref, true);

  // The ticker is a separate target: a reader who wants the company should not
  // have to open the filing to get there.
  let stopped = false;
  events[0].go({ stopPropagation: () => { stopped = true; } });
  assert.equal(stopped, true, 'the ticker click must not also open the document');
  assert.equal(c.state.screen, 'company');
  assert.equal(c.state.ticker, 'AAAA');
});

test('the whole archive is fetched on the first search and never twice', async () => {
  // Twelve months is twelve requests and seven megabytes: the right price for
  // a search across a year, and far too high to pay on the way in.
  const { readFile } = await import('node:fs/promises');
  const main = await readFile(new URL('../../public/esthmr/main.js', import.meta.url), 'utf8');
  const fn = main.slice(main.indexOf('const loadWholeArchive'),
                        main.indexOf('// Opening a company loads its document'));
  assert.match(fn, /if \(wholeArchive \|\| component\.data\(\)\.demo\) return;/,
    'it would fetch the archive again on every redraw');
  assert.match(fn, /if \(!String\(component\.state\.filedQ \|\| ''\)\.trim\(\)\) return;/,
    'it would fetch seven megabytes for a reader who never searched');
  assert.match(fn, /filedAll/);
});

test('searching the disclosures looks through every month, not the open one', () => {
  // It searched the month on screen and nothing else, so a company with
  // eleven filings across the year answered "nothing" unless one of them
  // happened to land in the month showing.
  const august = [{ date: '2026-08-24', ticker: 'AAAA', what: 'A results release', section: 'Results' }];
  const wholeYear = august.concat([
    { date: '2026-03-11', ticker: 'AAAA', what: 'A capital increase', section: 'Capital' },
    { date: '2025-11-02', ticker: 'AAAA', what: 'A board change', section: 'Board' },
    { date: '2026-05-06', ticker: 'BBBB', what: 'B results release', section: 'Results' },
  ]);
  const c = fresh();
  c.setData({ ...LIVE, filedMonths: [{ id: '2026-08', count: 1 }],
              filedArchive: august, filedArchiveMonth: '2026-08', filedAll: wholeYear });
  c.state.screen = 'calendar';

  // Unsearched, the panel is the open month — the newest filings, which is
  // what it was already.
  assert.equal(c.renderVals().filedEvents.length, 1);

  // Searched, it is the whole archive, newest first.
  c.state.filedQ = 'AAAA';
  const found = c.renderVals().filedEvents;
  assert.deepEqual(found.map((e) => e.date), ['2026-08-24', '2026-03-11', '2025-11-02']);

  // A month is a filter on that, and only once the reader picks one.
  c.state.month = '2026-03';
  assert.deepEqual(c.renderVals().filedEvents.map((e) => e.date), ['2026-03-11']);
  c.state.month = '';
  assert.equal(c.renderVals().filedEvents.length, 3);

  // Until every month has landed it searches what it has rather than nothing.
  const partial = fresh();
  partial.setData({ ...LIVE, filedMonths: [{ id: '2026-08', count: 1 }],
                    filedArchive: august, filedArchiveMonth: '2026-08' });
  partial.state.screen = 'calendar';
  partial.state.filedQ = 'AAAA';
  assert.equal(partial.renderVals().filedEvents.length, 1);
});

test('the disclosures screen filters by day and by company', () => {
  const rows = [
    { date: '2026-08-24', ticker: 'AAAA', what: 'A results release', section: 'Results' },
    { date: '2026-08-24', ticker: 'BBBB', what: 'B board decisions', section: 'Board' },
    { date: '2026-08-25', ticker: 'AAAA', what: 'A treasury stock', section: 'Treasury' },
  ];
  const c = fresh();
  c.setData({ ...LIVE, filedMonths: [{ id: '2026-08', count: 3 }],
              filedArchive: rows, filedArchiveMonth: '2026-08' });
  c.state.screen = 'calendar';
  assert.equal(c.renderVals().filedEvents.length, 3);

  c.state.day = '2026-08-24';
  let v = c.renderVals();
  assert.equal(v.filedEvents.length, 2);
  assert.match(v.filedFilterNote, /2 filings match 24 August 2026/);

  // By company: the ticker, either language of the title, and the company's
  // own name — the archive row carries only the ticker.
  c.state.day = ''; c.state.filedQ = 'AAAA';
  v = c.renderVals();
  assert.equal(v.filedEvents.length, 2);
  c.state.filedQ = 'treasury';
  v = c.renderVals();
  assert.equal(v.filedEvents.length, 1);
  assert.match(v.filedFilterNote, /^1 filing matches/);

  c.state.filedQ = 'nothing here';
  v = c.renderVals();
  assert.equal(v.filedNoMatch, true);
  assert.equal(v.hasFiledFilter, true);
  v.clearFilters ? null : null;
  c.renderVals().clearFiled();
  assert.equal(c.state.filedQ, '');
  assert.equal(c.state.day, '');

  // and it is named for what it holds
  assert.equal(screen(LIVE).L.calendarTitle, 'Disclosures');
});

test('the crossings have a screen of their own and Today has the news', () => {
  const v = screen({ ...LIVE, crossings: CROSS, feed: [] });
  // "Crossings" in the rail and "What ties these together" on the screen were
  // one feature with two names. Both are "Connecting the dots" now, and the
  // rail's label and the screen's heading have to be the same string or the
  // pair drifts apart again.
  assert.ok(v.nav.some((n) => n.label === 'Connecting the dots'), 
    v.nav.map((n) => n.label).join(', '));
  assert.equal(v.L.dotsLabel, 'Connecting the dots');
  assert.ok(screen(LIVE, 'ar').nav.some((n) => n.label === 'ربط النقاط'));
  assert.ok(v.nav.some((n) => n.label === 'Disclosures'));
  // Investors is the fourth entry.
  assert.equal(v.nav[3].label, 'Investors');
  assert.equal(v.isCrossings, false);
  const c = fresh();
  c.setData({ ...LIVE, crossings: CROSS });
  c.state.screen = 'crossings';
  assert.equal(c.renderVals().isCrossings, true);
  assert.equal(c.renderVals().crossings.length, 1);
});

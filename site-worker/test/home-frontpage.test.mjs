import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { installDom } from './dom-stub.mjs';

/* Home's front page: the crossings, as rows.
 *
 * "What to read now" was two publisher-picked top-1 cards, each weeks stale,
 * each with a debug stamp under it. This island renders EVERY company that
 * turned up in more than one place inside the four newest published days —
 * a complete set, in two calendar tiers, alphabetical inside each — with the
 * builder's own past-tense sentence under each name. Nothing on the card is
 * composed on the client except date labels.
 *
 * Each test below is named for the reversion that makes it fail.
 */
installDom();

const { Component, DIRECTIVE } = await import('../../public/esthmr/logic.js');
const data = await import('../../public/esthmr/data.js');

const here = (p) => new URL(`../../public/esthmr/${p}`, import.meta.url);
const tpl = await readFile(here('template.html'), 'utf8');
const logic = await readFile(here('logic.js'), 'utf8');
const css = await readFile(here('journal.css'), 'utf8');

/** The component as main.js drives it, with the reader's date pinned. */
function screen(dataset, lang = 'en', today = '2026-09-07') {
  const c = new Component({ accent: 'var(--accent)' });
  c.state.lang = lang;
  c.state.today = today;
  c.setData(dataset);
  return c.renderVals();
}

/** A minimal live dataset, shaped the way data.live() returns one. */
const LIVE = {
  demo: false,
  companies: [
    { ticker: 'AAAA', name: { en: 'A', ar: 'أ' }, sector: 'Banks', close: 10, pct: 1.5, cap: 100, pe: 8 },
    { ticker: 'BBBB', name: { en: 'B', ar: 'ب' }, sector: 'Banks', close: 20, pct: -2.5, cap: 200, pe: 9 },
    { ticker: 'CCCC', name: { en: 'C', ar: 'ج' }, sector: 'Banks', close: 30, pct: 0.5, cap: 300, pe: 7 },
  ],
  series: [], fins: [], feed: [],
  marketDate: '2026-09-06',
  generatedAt: '2026-09-06T13:47:07+00:00',
  dataVersion: '14274003b1cf7c8d',
};

const NEWEST = '2026-09-06';

/** A crossing, shaped the way data.connections() returns one. */
function item(ticker, strands, extra = {}) {
  return {
    ticker, name: `${ticker} Company`, nameAr: `شركة ${ticker}`,
    sector: 'Banks', sectorAr: 'البنوك',
    kinds: [...new Set(strands.map((s) => s.kind))],
    why: `${ticker} filed with the exchange and was written about in the press, within four days.`,
    whyAr: `${ticker} أودعت إفصاحًا لدى البورصة وكُتب عنها في الصحافة، خلال أربعة أيام.`,
    insight: '', insightAr: '', eventLabel: '', eventLabelAr: '',
    pct: 1.23, ratio: 1.1, peers: [], sameSector: 0,
    strands: strands.map((s) => ({
      id: s.id || `${s.kind}-${ticker}-${s.date}`, title: `A ${s.kind} about ${ticker}`,
      titleAr: `مستند عن ${ticker}`, link: s.kind === 'session' ? '' : `https://example.test/${ticker}/${s.date}`,
      ratio: null, titleOk: true, ...s,
    })),
    ...extra,
  };
}
const filing = (date, more = {}) => ({ kind: 'filing', date, ...more });
const story = (date, more = {}) => ({ kind: 'news', date, ...more });
const session = (date, ratio = 2.5) => ({ kind: 'session', date, ratio, title: '', titleAr: '', link: '' });

/** The document, shaped the way data.connections() returns one. */
function doc(items, extra = {}) {
  return {
    days: 4, threshold: 2, updatedAt: '2026-09-06T13:47:07+00:00',
    axis: ['2026-09-03', '2026-09-04', '2026-09-05', '2026-09-06'],
    windowStart: '2026-09-03', windowEnd: NEWEST, total: items.length,
    frontpage: {
      newestDay: NEWEST,
      feeds: { news: { newest: NEWEST, oldest: '2026-09-01', items: 400 },
               filings: { newest: NEWEST, oldest: '2026-08-09', items: 434, companies: 138 },
               market: { date: NEWEST, is_close: true } },
      day: { date: NEWEST, filings: 20, stories: 189 },
      week: { from: '2026-08-31', to: NEWEST, filings: 178, stories: 400, news_from: '2026-09-01', both: 15 },
      since: { from: '2026-08-09', filings: 434, companies: 138 },
      touched: items.map((i) => i.ticker),
      sentences: {
        count: 'Twelve companies turned up in more than one place between {from} and {to}.',
        countAr: '12 شركة ظهرت في أكثر من مكان بين {from} و{to}.',
        day: '20 filings and 189 stories on {date}.',
        dayAr: '20 إفصاحًا و189 خبرًا يوم {date}.',
        week: '178 filings and 400 stories in the seven days to {date} (stories from {nfrom}). 15 companies appeared in both the stories and the filings.',
        weekAr: '178 إفصاحًا و400 خبر في الأيام السبعة حتى {date} (الأخبار من {nfrom}). 15 شركة وردت في الأخبار وفي الإفصاحات معًا.',
        since: '434 filings from 138 companies since {ffrom}.',
        sinceAr: '434 إفصاحًا من 138 شركة منذ {ffrom}.',
      },
    },
    items,
    ...extra,
  };
}

/** The template between the board's opening tag and the details toggle. */
const BOARD = tpl.slice(tpl.indexOf('<div class="island-board">'), tpl.indexOf('class="island-details-toggle"'));
/** The island itself. */
const ISLAND = tpl.slice(tpl.indexOf('<section class="island island-crossings">'),
  tpl.indexOf('</section>', tpl.indexOf('<section class="island island-crossings">')));
/** The fp block of renderVals. */
const FP_START = logic.indexOf('    const fp = (() => {');
const FP = logic.slice(FP_START, logic.indexOf('\n    })();\n', FP_START));

const dayLabel = (iso, lang = 'en') => new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-GB',
  { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(iso + 'T00:00:00Z'));
const clock = (iso, lang = 'en') => new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-GB',
  { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Africa/Cairo' }).format(new Date(iso));

const rowsOf = (v) => v.fpTiers.flatMap((t) => t.rows);

/* ── J1 ─────────────────────────────────────────────────────────────────── */
test('J1 the island-board carries the crossings, not two picked stories', () => {
  assert.ok(BOARD.length > 500, 'the island-board slice is empty — the scan is broken');
  assert.ok(FP.length > 500, 'the fp block was not found in logic.js');
  assert.doesNotMatch(BOARD, /snapshotStories/, 'the board still binds the two picked stories');
  assert.doesNotMatch(BOARD, /L\.readNow\b/, 'the board still carries the "What to read now" heading');
  for (const key of ['fpTiers', 'fpSentence', 'fpFresh', 'fpCounts', 'L.fpYardstick']) {
    assert.ok(BOARD.includes(`{{ ${key} }}`), `the board does not bind ${key}`);
  }
  assert.doesNotMatch(logic, /snapshotStories/, 'logic.js still computes snapshotStories');
});

/* ── J2 ─────────────────────────────────────────────────────────────────── */
test('J2 rows are complete and alphabetical inside calendar tiers', () => {
  const items = [
    item('CCCC', [filing('2026-09-04'), story(NEWEST)]),
    item('AAAA', [filing(NEWEST), story('2026-09-05')]),
    item('BBBB', [filing('2026-09-03'), story('2026-09-04')]),
  ];
  const v = screen({ ...LIVE, crossings: doc(items) });
  assert.deepEqual(v.fpTiers.map((t) => t.rows.map((r) => r.ticker)), [['AAAA', 'CCCC'], ['BBBB']]);
  assert.deepEqual(v.fpTiers.map((t) => t.cls), ['fp-today', 'fp-earlier']);

  // Forty crossings render forty rows: the set is the document's, not a cut.
  const many = Array.from({ length: 40 }, (_, i) => item('T' + String(i).padStart(3, '0'),
    [filing(i % 2 ? NEWEST : '2026-09-04'), story('2026-09-05')]));
  const big = screen({ ...LIVE, crossings: doc(many) });
  assert.equal(rowsOf(big).length, 40, 'a cap returned');
  assert.equal(rowsOf(big).length, doc(many).total);
  for (const tier of big.fpTiers) {
    const tickers = tier.rows.map((r) => r.ticker);
    assert.deepEqual(tickers, [...tickers].sort((a, b) => a.localeCompare(b)), 'a tier is not alphabetical');
  }
  // And the code cannot grow one quietly: no cut, and the rows' order is the
  // ticker alone. The only other sort in the block orders a row's own
  // documents by date and kind, and names no measure either.
  assert.ok(!FP.includes('.slice('), 'the fp block slices something');
  assert.match(FP, /items\.map\(row\)\.sort\(\(a, b\) => a\.ticker\.localeCompare\(b\.ticker\)\)/,
    'the rows are not ordered by ticker alone');
  for (const line of FP.split('\n').filter((l) => l.includes('.sort('))) {
    assert.doesNotMatch(line, /ratio|pct|weight|volume|kinds\.length|strands\.length|change/,
      `a measure orders the rows: ${line.trim()}`);
  }
});

/* ── J3 ─────────────────────────────────────────────────────────────────── */
test('J3 the tier split is a date, and an empty day says when it was built', () => {
  // A session on the newest day is a thread dated the newest day.
  const v = screen({ ...LIVE, crossings: doc([
    item('AAAA', [filing('2026-09-03'), session(NEWEST)]),
  ]) });
  assert.deepEqual(v.fpTiers.map((t) => [t.cls, t.rows.map((r) => r.ticker)]), [['fp-today', ['AAAA']]]);
  assert.equal(v.fpShowNone, false);
  assert.equal(v.fpTiers[0].label, `On ${dayLabel(NEWEST)}`);

  // Nothing dated the newest day: the today tier is absent and one line says
  // so as a fact about the document at its build time.
  const none = screen({ ...LIVE, crossings: doc([
    item('AAAA', [filing('2026-09-03'), story('2026-09-04')]),
    item('BBBB', [filing('2026-09-04'), story('2026-09-05')]),
  ]) });
  assert.deepEqual(none.fpTiers.map((t) => t.cls), ['fp-earlier']);
  assert.equal(none.fpTiers[0].label, `Earlier: ${dayLabel('2026-09-03')} – ${dayLabel('2026-09-05')}`);
  assert.equal(none.fpShowNone, true);
  assert.ok(none.fpNoneLine.includes(dayLabel(NEWEST)), none.fpNoneLine);
  assert.ok(none.fpNoneLine.includes(clock('2026-09-06T13:47:07+00:00')), none.fpNoneLine);
  assert.ok(!none.fpNoneLine.includes('{'), none.fpNoneLine);
  // In Arabic the clock reads in Arabic-Indic digits, as the rest of the site does.
  const ar = screen({ ...LIVE, crossings: doc([item('AAAA', [filing('2026-09-03'), story('2026-09-04')])]) }, 'ar');
  assert.ok(ar.fpNoneLine.includes(clock('2026-09-06T13:47:07+00:00', 'ar')), ar.fpNoneLine);
  // A one-day earlier tier reads as one date, not a range of one.
  const one = screen({ ...LIVE, crossings: doc([item('AAAA', [filing('2026-09-05'), story('2026-09-05')])],
    { windowStart: '2026-09-05', axis: ['2026-09-05', NEWEST] }) });
  assert.equal(one.fpTiers[0].label, `Earlier: ${dayLabel('2026-09-05')}`);
});

/* ── J4 ─────────────────────────────────────────────────────────────────── */
test('J4 the sentences are the builder\'s, with only the dates filled in', () => {
  for (const lang of ['en', 'ar']) {
    const v = screen({ ...LIVE, crossings: doc([item('AAAA', [filing(NEWEST), story(NEWEST)])]) }, lang);
    const fp = doc([]).frontpage;
    const S = fp.sentences;
    const expect = (s) => s.split('{from}').join(dayLabel('2026-09-03', lang)).split('{to}').join(dayLabel(NEWEST, lang))
      .split('{date}').join(dayLabel(NEWEST, lang)).split('{nfrom}').join(dayLabel('2026-09-01', lang))
      .split('{ffrom}').join(dayLabel('2026-08-09', lang));
    const ar = lang === 'ar';
    assert.equal(v.fpSentence, expect(ar ? S.countAr : S.count));
    assert.equal(v.fpCounts, [ar ? S.dayAr : S.day, ar ? S.weekAr : S.week, ar ? S.sinceAr : S.since].map(expect).join(' '));
    assert.equal(v.fpHasSentence, true);
    assert.equal(v.fpHasCounts, true);
    for (const text of [v.fpSentence, v.fpCounts, v.fpFresh, v.fpNoneLine, ...v.fpTiers.map((t) => t.label)]) {
      assert.ok(!text.includes('{'), `a placeholder was left in "${text}"`);
    }
  }
  // A lagging feed's sentence carries its own dates, and they are filled too.
  const lag = doc([item('AAAA', [filing(NEWEST), story(NEWEST)])]);
  lag.frontpage.feeds.filings.newest = '2026-09-05';
  lag.frontpage.sentences.day = '189 stories on {date}; filings to {fdate}.';
  const v = screen({ ...LIVE, crossings: lag });
  assert.ok(v.fpCounts.startsWith(`189 stories on ${dayLabel(NEWEST)}; filings to ${dayLabel('2026-09-05')}.`), v.fpCounts);
  // A sentence the builder refused (null) is simply absent, not a hole.
  const refused = doc([item('AAAA', [filing(NEWEST), story(NEWEST)])]);
  refused.frontpage.sentences.count = '';
  assert.equal(screen({ ...LIVE, crossings: refused }).fpHasSentence, false);
});

/* ── J5 ─────────────────────────────────────────────────────────────────── */
test('J5 no prose about counts is composed on the client', () => {
  for (const lang of ['en', 'ar']) {
    const { L } = screen(LIVE, lang);
    for (const key of Object.keys(L).filter((k) => /^fp[A-Z]/.test(k))) {
      assert.doesNotMatch(L[key], /\{(n|F|S|C|B)\}/, `L.${key} takes a count: "${L[key]}"`);
    }
  }
  // The block binds sentences; it does not write them. The words that would
  // be needed to write one are absent from its code.
  for (const word of ['turned up', 'ظهرت', 'filings and', 'إفصاحًا', 'stories on', 'خبرًا', 'companies appeared']) {
    assert.ok(!FP.includes(word), `the fp block composes prose: "${word}"`);
  }
  // And the only substitution it makes is a date label.
  assert.match(FP, /const fill = /, 'the date filler is gone');
  assert.ok(!/fill\([^)]*\{ n:/.test(FP), 'a count is filled on the client');
  assert.match(FP, /fdate: this\.dayLabel\(/, 'the lag date is not a dayLabel');
});

/* ── J6 ─────────────────────────────────────────────────────────────────── */
test('J6 the freshness line appears only when the reader is ahead of the feeds', () => {
  const d = doc([item('AAAA', [filing(NEWEST), story(NEWEST)])]);
  const behind = screen({ ...LIVE, crossings: d }, 'en', '2026-09-07');
  assert.equal(behind.fpHasFresh, true);
  assert.ok(behind.fpFresh.includes(`Newest published day: ${dayLabel(NEWEST)}`), behind.fpFresh);
  assert.ok(behind.fpFresh.includes(`Nothing published for ${dayLabel('2026-09-07')} yet.`), behind.fpFresh);
  const level = screen({ ...LIVE, crossings: d }, 'en', NEWEST);
  assert.equal(level.fpHasFresh, false);
  assert.equal(level.fpFresh, '');
  // Arabic reads Arabic.
  const ar = screen({ ...LIVE, crossings: d }, 'ar', '2026-09-07');
  assert.ok(ar.fpFresh.includes(`أحدث يوم منشور: ${dayLabel(NEWEST, 'ar')}`), ar.fpFresh);
  assert.ok(ar.fpFresh.includes(`لم يُنشر شيء عن ${dayLabel('2026-09-07', 'ar')} بعد.`), ar.fpFresh);
});

/* ── J7 ─────────────────────────────────────────────────────────────────── */
test('J7 a news feed newer than the card says so and suppresses the none-line', () => {
  const d = doc([item('AAAA', [filing('2026-09-04'), story('2026-09-05')])]);
  const feed = [{ kind: 'K', headline: 'H', source: 'S', tickers: [], date: '2026-09-07' }];
  const v = screen({ ...LIVE, feed, crossings: d }, 'en', '2026-09-07');
  assert.equal(v.fpTiers.some((t) => t.cls === 'fp-today'), false, 'the fixture has a today tier');
  assert.equal(v.fpShowNone, false, 'the none-line claims an absence the news feed contradicts');
  assert.ok(v.fpFresh.includes(`Stories to ${dayLabel('2026-09-07')} · this card to ${dayLabel(NEWEST)}.`), v.fpFresh);
  assert.ok(!v.fpFresh.includes('Nothing published'), v.fpFresh);
  // Without the newer feed the none-line is shown.
  const flat = screen({ ...LIVE, feed: [], crossings: d }, 'en', '2026-09-07');
  assert.equal(flat.fpShowNone, true);
});

/* ── J8 ─────────────────────────────────────────────────────────────────── */
test('J8 no percent, colour or ratio badge on a Home row', () => {
  const v = screen({ ...LIVE, crossings: doc([item('AAAA', [filing(NEWEST), session(NEWEST, 3.4)])]) });
  for (const row of rowsOf(v)) {
    for (const key of ['pct', 'color', 'volume', 'threads', 'ratio', 'hasPct', 'hasVolume']) {
      assert.ok(!(key in row), `a Home row carries ${key}`);
    }
  }
  for (const bind of ['x.pct', 'x.color', 'x.volume', 'x.threads', 'x.ratio', 'x.insight']) {
    assert.ok(!ISLAND.includes(`{{ ${bind} }}`), `the island binds ${bind}`);
  }
});

/* ── J9 ─────────────────────────────────────────────────────────────────── */
test('J9 the evidence line is the day\'s document, the exchange\'s own first', () => {
  const one = (strands) => rowsOf(screen({ ...LIVE, crossings: doc([item('AAAA', strands)]) }))[0];
  // A filing and a story on the same day: the filing.
  const tie = one([story(NEWEST, { title: 'S' }), filing(NEWEST, { title: 'F' })]);
  assert.equal(tie.hasEvidence, true);
  assert.equal(tie.evidenceLabel, 'Filing');
  assert.equal(tie.evidenceTitle, 'F');
  assert.equal(tie.evidenceDay, dayLabel(NEWEST));
  // A story alone on the day: the story.
  const press = one([filing('2026-09-04', { title: 'F' }), story(NEWEST, { title: 'S' })]);
  assert.equal(press.evidenceLabel, 'In the press');
  assert.equal(press.evidenceTitle, 'S');
  assert.equal(press.evidenceHref, 'https://example.test/AAAA/2026-09-06');
  // Documents older than the newest day are not the day's, even when the
  // session puts the row in the today tier.
  const old = one([filing('2026-09-04'), story('2026-09-05'), session(NEWEST)]);
  assert.equal(old.isToday, true);
  assert.equal(old.hasEvidence, false);
  assert.equal(old.evidenceTitle, '');
  // A refused title is not shown and not edited; the link stays.
  const refused = one([filing(NEWEST, { title: 'Investors should buy before results', titleOk: false })]);
  assert.equal(refused.hasEvidence, true);
  assert.equal(refused.hasEvidenceTitle, false);
  assert.equal(refused.evidenceTitle, '');
  assert.equal(refused.evidenceHref, 'https://example.test/AAAA/2026-09-06');
  // The reader's language picks the title.
  const ar = rowsOf(screen({ ...LIVE, crossings: doc([item('AAAA', [filing(NEWEST, { title: 'F', titleAr: 'ف' })])]) }, 'ar'))[0];
  assert.equal(ar.evidenceTitle, 'ف');
  assert.equal(ar.evidenceLabel, 'إفصاح');
});

/* ── J10 ────────────────────────────────────────────────────────────────── */
test('J10 a ticker the directory lacks keeps its row under a name that says so', () => {
  const d = doc([item('ZZZZ', [filing(NEWEST), story(NEWEST)], { name: '', nameAr: '' }),
                 item('AAAA', [filing(NEWEST), story(NEWEST)])]);
  const v = screen({ ...LIVE, crossings: d });
  assert.equal(rowsOf(v).length, 2, 'the row was dropped');
  const z = rowsOf(v).find((r) => r.ticker === 'ZZZZ');
  assert.equal(z.name, v.L.fpNoName);
  assert.equal(z.hasName, false);
  assert.equal(z.go, null);
  assert.equal(z.noGo, true);
  assert.equal(z.arrow, '');
  const a = rowsOf(v).find((r) => r.ticker === 'AAAA');
  assert.equal(typeof a.go, 'function');
  assert.equal(a.noGo, false);
  assert.equal(a.arrow, '↗');
  // In Arabic the fallback is Arabic, not the English string.
  const ar = rowsOf(screen({ ...LIVE, crossings: d }, 'ar')).find((r) => r.ticker === 'ZZZZ');
  assert.equal(ar.name, 'الاسم غير متاح في الدليل');
  assert.match(ar.name, /[\u0600-\u06FF]/);
});

/* ── J11 ────────────────────────────────────────────────────────────────── */
test('J11 §8 nothing the front page renders instructs, forecasts or explains a cause', async () => {
  const guards = JSON.parse(await readFile(new URL('./guards.json', import.meta.url), 'utf8'));
  for (const list of ['directive', 'speculative', 'causal']) {
    assert.ok(Array.isArray(guards[list]) && guards[list].length > 0, `guards.json has no ${list} list`);
  }
  const compiled = Object.entries(guards).flatMap(([list, rows]) =>
    rows.map(({ pattern, flags }) => ({ list, re: new RegExp(pattern, flags) })));
  const d = doc([item('AAAA', [filing(NEWEST), story(NEWEST), session(NEWEST)]),
                 item('BBBB', [filing('2026-09-04'), story('2026-09-05')])]);
  for (const lang of ['en', 'ar']) {
    const v = screen({ ...LIVE, crossings: d }, lang);
    const fp = Object.fromEntries(Object.entries(v).filter(([k]) => /^fp[A-Z]/.test(k)));
    const strings = Object.fromEntries(Object.entries(v.L).filter(([k]) => /^fp[A-Z]/.test(k)));
    const printed = JSON.stringify({ fp, rows: rowsOf(v), strings },
      (k, x) => (typeof x === 'function' ? undefined : x));
    assert.ok(!DIRECTIVE.test(printed), `${lang}: §8 the front page renders directive language`);
    for (const { list, re } of compiled) {
      const hit = printed.match(re);
      assert.ok(!hit, `${lang}: the ${list} guard /${re.source}/ finds "${hit && hit[0]}"`);
    }
    // The both-feeds join is a count, never a list of names: no ticker from
    // the fixture reaches the counts paragraph.
    for (const t of d.items.map((i) => i.ticker).concat(d.frontpage.touched)) {
      assert.ok(!v.fpCounts.includes(t), `${lang}: ${t} is named in the counts paragraph`);
      assert.ok(!v.fpSentence.includes(t), `${lang}: ${t} is named in the count sentence`);
    }
  }
});

/* ── J12 ────────────────────────────────────────────────────────────────── */
test('J12 every front-page string exists in both languages, and the Arabic is Arabic', () => {
  const keys = [...logic.matchAll(/^\s+(fp[A-Z]\w*):'/gm)].map((m) => m[1]);
  const seen = new Map();
  for (const k of keys) seen.set(k, (seen.get(k) || 0) + 1);
  assert.ok(seen.size >= 10, `only ${seen.size} fp* strings found`);
  for (const [k, n] of seen) assert.equal(n, 2, `L.${k} is defined ${n} time(s), not once per language`);
  const en = screen(LIVE, 'en').L, ar = screen(LIVE, 'ar').L;
  for (const k of seen.keys()) {
    assert.ok(typeof en[k] === 'string' && en[k].length, `L.en.${k} is empty`);
    assert.ok(typeof ar[k] === 'string' && ar[k].length, `L.ar.${k} is empty`);
    assert.match(ar[k], /[\u0600-\u06FF]/, `L.ar.${k} is not written in Arabic: "${ar[k]}"`);
    assert.notEqual(ar[k], en[k], `L.ar.${k} is the English string`);
  }
});

/* ── J13 ────────────────────────────────────────────────────────────────── */
test('J13 the negation is on the same card as the names', () => {
  assert.ok(ISLAND.includes('{{ L.fpYardstick }}'), 'the yardstick is not on the island');
  assert.match(screen(LIVE, 'en').L.fpYardstick, /not an answer/);
  assert.match(screen(LIVE, 'ar').L.fpYardstick, /وليس حكمًا/);
  // And it is rendered whenever the rows are — the same flag governs both:
  // the yardstick sits INSIDE the fpShow gate, with no closing </sc-if>
  // between the gate's opening tag and it. (A greedy [\s\S]* here matched a
  // yardstick moved out below the gate, via the fpEmpty block's own close.)
  assert.match(ISLAND,
    /<sc-if value="\{\{ fpShow \}\}">(?:(?!<\/sc-if>)[\s\S])*\{\{ L\.fpYardstick \}\}(?:(?!<sc-if)[\s\S])*<\/sc-if>/,
    'the yardstick is not inside the fpShow gate');
  const v = screen({ ...LIVE, crossings: doc([item('AAAA', [filing(NEWEST), story(NEWEST)])]) });
  assert.equal(v.fpShow, true);
  assert.equal(screen(LIVE).fpShow, false);
  assert.equal(screen(LIVE).fpEmpty, true);
});

/* ── J14 ────────────────────────────────────────────────────────────────── */
test('J14 the volume multiple on Home agrees with the crossing\'s sentence', () => {
  // One arithmetic: market.json volume ÷ companies.json median, the way
  // data.live() computes `rv`. The builder's ratio must be that number.
  const volume = 1_602_000, median = 600_000;
  const rv = volume / median;                      // 2.67
  const ratio = Math.round(rv * 100) / 100;
  const companies = [{ ticker: 'AMIA', name: { en: 'Amia', ar: 'أميا' }, sector: 'Finance',
    close: 10, pct: -2.47, cap: 100, pe: 8, rv, medianVolume: median }];
  const d = doc([item('AMIA', [filing(NEWEST), story(NEWEST), session(NEWEST, ratio)], {
    ratio, why: `AMIA filed, was written about in the press and traded ${ratio.toFixed(2)}× its own normal volume, closing down 2.47%, within four days.`,
  })]);
  const v = screen({ ...LIVE, companies, crossings: d, isClose: true });
  const busy = v.busy.find((b) => b.ticker === 'AMIA');
  assert.ok(busy, 'the busiest card does not carry AMIA');
  assert.equal(Number.parseFloat(busy.rv).toFixed(1), rv.toFixed(1));
  assert.equal(Math.abs(companies[0].rv - d.items[0].ratio) < 0.005, true);
  assert.ok(rowsOf(v)[0].why.includes(`${companies[0].rv.toFixed(2)}×`), rowsOf(v)[0].why);
  // Home's row computes no ratio of its own: the fp block reads none of the
  // inputs a second arithmetic would need.
  assert.doesNotMatch(FP, /\b(volume|median|rv|ratio)\b/, 'the fp block computes a ratio of its own');
});

/* ── J15 ────────────────────────────────────────────────────────────────── */
test('J15 the phone collapses the earlier tier by class + query, and never by hidden', () => {
  assert.match(css, /\.island-crossings \{ grid-column:1 \/ -1/, 'the island is not full width');
  assert.match(css, /^\.fp-rows \{ display:grid; grid-template-columns:1fr 1fr;/m, 'the rows are not two columns by default');
  assert.match(css, /#app \.fp-id \{[^}]*min-height:(4[4-9]|[5-9]\d)px/, 'the row button is under 44px');
  assert.match(css, /\.island-crossings \[hidden\] \{ display:none !important; \}/, 'the [hidden] guard is gone');
  assert.ok(!ISLAND.includes('hidden='), 'the island toggles hidden');

  // The phone rules live ONLY inside @media (max-width:860px). Outside it the
  // same rule would hide every earlier sentence on desktop.
  const inside = [], outside = [];
  const blocks = [...css.matchAll(/@media \(max-width:860px\) \{([\s\S]*?)\n\}/g)].map((m) => [m.index, m.index + m[0].length, m[1]]);
  assert.ok(blocks.length >= 1, 'no @media (max-width:860px) block');
  for (const m of css.matchAll(/\.fp-earlier \.fp-why, \.fp-earlier \.fp-evidence \{ display:none/g)) {
    (blocks.some(([a, b]) => m.index > a && m.index < b) ? inside : outside).push(m.index);
  }
  assert.equal(inside.length, 1, 'the earlier-tier collapse is not in the phone query');
  assert.equal(outside.length, 0, 'the earlier-tier collapse escapes the phone query');
  assert.ok(blocks.some(([, , body]) => /\.fp-rows \{ grid-template-columns:1fr;/.test(body)),
    'the rows do not go to one column on a phone');
  for (const m of css.matchAll(/\.fp-rows \{ grid-template-columns:1fr;/g)) {
    assert.ok(blocks.some(([a, b]) => m.index > a && m.index < b), 'a one-column rule escapes the phone query');
  }
  // The old section is gone from every sheet, not left as dead rules.
  assert.doesNotMatch(css, /island-stor(y|ies)/, 'the stories rules survive');
  assert.doesNotMatch(tpl, /island-stor(y|ies)/, 'the stories section survives');
});

/* ── J16 ────────────────────────────────────────────────────────────────── */
test('J16 the demo renders only demo companies and demo sentences', () => {
  for (const lang of ['en', 'ar']) {
    const v = screen(data.demo(), lang);
    assert.equal(v.fpShow, true, 'the demo has no front page');
    const rows = rowsOf(v);
    assert.ok(rows.length >= 2);
    for (const r of rows) {
      assert.match(r.ticker, /^DEMO\d\d$/, `${r.ticker} is not a demo ticker`);
      assert.match(r.name, lang === 'ar' ? /^شركة تجريبية \d+$/ : /^Sample Company \d+$/, r.name);
    }
    const prose = [v.fpSentence, v.fpCounts, v.fpFresh, v.fpNoneLine].join(' ');
    assert.ok(prose.length > 40);
    assert.doesNotMatch(prose, /\b[A-Z]{3,6}\b/, `the demo names a ticker: ${prose}`);
    assert.ok(!prose.includes('{'), prose);
    // Demo evidence points nowhere: an invented filing with a link to the
    // exchange would be a citation to a document that is not there.
    for (const r of rows) assert.equal(r.evidenceHref, null);
    assert.ok(!JSON.stringify(v.fpTiers, (k, x) => (typeof x === 'function' ? undefined : x)).includes('egx.com.eg'));
    // And the demo document's own sentences, not a live document's.
    assert.equal(v.fpSentence.includes(lang === 'ar' ? 'شركتان' : 'Two companies'), true, v.fpSentence);
  }
  // renderVals() swaps every four-capital token for a demo ticker on the way
  // out (demoise), so a real name planted in the demo tree would pass the
  // checks above. Read the tree itself: nothing in it names anything but
  // DEMO01..DEMO16.
  const tree = data.demo().crossings;
  const words = JSON.stringify([tree.frontpage.sentences, tree.frontpage.touched,
    tree.items.map((i) => [i.ticker, i.name, i.nameAr, i.why, i.whyAr, i.insight, i.insightAr,
      i.strands.map((s) => [s.title, s.titleAr, s.link])])]);
  for (const token of words.match(/\b[A-Z]{3,6}\d*\b/g) || []) {
    assert.match(token, /^DEMO\d\d$/, `the demo tree names ${token}`);
  }
  assert.equal(tree.windowStart, tree.axis[0]);
  assert.equal(tree.windowEnd, tree.axis[tree.axis.length - 1]);
  assert.equal(tree.frontpage.newestDay, tree.windowEnd);
});

/* ── J17 ────────────────────────────────────────────────────────────────── */
test('J17 the ticker tile grows for a five-letter ticker instead of clipping it', () => {
  // The row binds `monoSize` (10.5px for five letters, 9px for six), but the
  // sheet's legibility floor turns every inline 9–10.5px inside .om-scr back
  // into 12px !important. At 12px IBM Plex Mono a five-letter ticker (VLMRA)
  // is 36px wide; a FIXED 44px tile leaves a 34px content box, so the first
  // glyph (RTL) or the last (LTR) was cut off — measured in the browser at
  // 390 and 1440. The tile must be a minimum, and its grid column must be
  // free to follow it.
  const floor = css.match(/^#app \.om-scr :is\(\[style\*="font-size:9px"\][^\n]*\n\s*font-size: 12px !important/m);
  assert.ok(floor, 'the 12px floor that made this necessary is gone — re-measure before relaxing the tile');
  const tile = css.match(/^\.fp-tile \{([^}]*)\}/m);
  assert.ok(tile, 'no .fp-tile rule');
  assert.match(tile[1], /(^|[^-])min-width:44px/, 'the tile has no 44px minimum');
  assert.doesNotMatch(tile[1], /(^|[^-])width:44px/, 'the tile is a fixed 44px and clips a five-letter ticker');
  assert.match(tile[1], /height:44px/, 'the tile is under 44px tall');
  const id = css.match(/^#app \.fp-id \{([^}]*)\}/m);
  assert.ok(id, 'no #app .fp-id rule');
  assert.match(id[1], /grid-template-columns:auto minmax\(0,1fr\) auto/, 'the tile column is fixed, so a wider tile overlaps the name');
});

/* ── J18 ────────────────────────────────────────────────────────────────── */
test('J18 a title nobody vetted is not shown either — only the builder\'s true is', async () => {
  // data.connections() carries the builder's flag through. A strand without
  // one is a document no guard ever read; the safe reading of "unknown" is
  // "not shown", and the kind, the date and the link stay. `!== false` would
  // put an unvetted headline on the landing screen.
  const raw = {
    updated_at: '2026-09-06T13:47:07+00:00', window_days: 4, window_start: '2026-09-03', window_end: NEWEST,
    threshold: 2, total: 1,
    items: [{
      ticker: 'AAAA', name: 'A Company', name_ar: 'شركة أ', sector: 'Banks', kinds: ['filing', 'news'],
      why: 'AAAA filed with the exchange and was written about in the press, within four days.',
      why_ar: 'AAAA أودعت إفصاحًا لدى البورصة وكُتب عنها في الصحافة، خلال أربعة أيام.',
      insight: null, insight_ar: null, ratio: null, change_percent: null, peers: [], same_sector: 0,
      strands: [
        { kind: 'filing', id: 'f1', date: NEWEST, title: 'Nobody read this', title_ar: 'لم يقرأه أحد', link: 'https://example.test/f1' },
        { kind: 'news', id: 'n1', date: NEWEST, title: 'Vetted', title_ar: 'مفحوص', link: 'https://example.test/n1', title_ok: true },
        { kind: 'news', id: 'n2', date: '2026-09-05', title: 'Refused', title_ar: 'مرفوض', link: 'https://example.test/n2', title_ok: false },
      ],
    }],
  };
  globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => raw });
  const crossings = await data.connections();
  delete globalThis.fetch;
  const flags = Object.fromEntries(crossings.items[0].strands.map((s) => [s.id, s.titleOk]));
  assert.deepEqual(flags, { f1: false, n1: true, n2: false }, 'an absent flag reads as vetted');
  // On Home the day's document is the filing (the exchange's own first); its
  // title was never vetted, so the row shows the kind, the date and the link.
  const row = rowsOf(screen({ ...LIVE, crossings }))[0];
  assert.equal(row.hasEvidence, true);
  assert.equal(row.evidenceLabel, 'Filing');
  assert.equal(row.hasEvidenceTitle, false);
  assert.equal(row.evidenceTitle, '');
  assert.equal(row.evidenceHref, 'https://example.test/f1');
  // The published document carries the flag on every strand, so nothing
  // real is hidden by the stricter default.
  const live = JSON.parse(await readFile(new URL('../../public/data/v1/connections.json', import.meta.url), 'utf8'));
  for (const item of live.items) {
    for (const s of item.strands) assert.equal(typeof s.title_ok, 'boolean', `${item.ticker} ${s.id} has no title_ok`);
  }
});

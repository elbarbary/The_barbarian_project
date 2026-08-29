/* Where the numbers come from, and what a signed-out reader sees instead.
 *
 * Two sources, one shape. The screens never learn which one they are drawing.
 *
 *   demo()  an obviously invented exchange, for anyone not signed in
 *   live()  the real filings, from the same static JSON the app reads
 *
 * THE DEMO IS NOT THE REAL MARKET WITH THE NUMBERS CHANGED.
 * The design's mock-up carried invented figures against real tickers — COMI at
 * 88.40, ABUK at 58.10. That is fine inside a design tool and unpublishable on
 * a public page: a screenshot of an invented price under a real company's name
 * is a fabricated financial figure, which is the one thing this publisher must
 * never emit. So the demo runs on companies that visibly do not exist. Same
 * shapes, same code paths, no chance of being mistaken for the exchange.
 */

const SECTORS = ['Banks', 'Chemicals', 'Real Estate', 'Industrials', 'Consumer',
                 'Telecom', 'Utilities', 'Energy'];

/** A deterministic pseudo-random stream, so the demo is stable across loads. */
function stream(seed) {
  let s = seed >>> 0;
  return () => (((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296));
}

export function demo() {
  const rand = stream(20260828);
  const companies = SECTORS.flatMap((sector, s) =>
    [0, 1].map((i) => {
      const n = s * 2 + i + 1;
      const close = Math.round((6 + rand() * 120) * 100) / 100;
      return {
        ticker: 'DEMO' + String(n).padStart(2, '0'),
        name: { en: `Sample Company ${n}`, ar: `شركة تجريبية ${n}` },
        sector,
        close,
        pct: Math.round((rand() * 8 - 4) * 100) / 100,
        cap: Math.round(close * (2000 + rand() * 90000)),
        pe: Math.round((3 + rand() * 14) * 10) / 10,
        demo: true,
      };
    }));

  const series = [];
  let price = 20;
  for (let i = 0; i < 900; i++) {
    price = Math.max(4, price + Math.sin(i / 41) * 0.12 + (rand() - 0.5) * 0.3 + 0.004);
    series.push({
      date: new Date(Date.UTC(2023, 0, 3) + i * 86400000 * 1.4).toISOString().slice(0, 10),
      close: Math.round(price * 100) / 100,
    });
  }

  const fins = [
    ['H1 2026', '2026-06-30', 1, 1], ['Q1 2026', '2026-03-31', 0.47, 0.96],
    ['FY 2025', '2025-12-31', 1.82, 0.9], ['9M 2025 (to 30 Sep)', '2025-09-30', 1.33, 0.86],
    ['FY 2024', '2024-12-31', 1.54, 0.8],
  ].map(([period, end, rev, bal]) => ({
    period, period_end: end,
    revenue: Math.round(2100 * rev * 1000) / 1000,
    gross_profit: Math.round(600 * rev * 1000) / 1000,
    operating_income: Math.round(390 * rev * 1000) / 1000,
    net_income: Math.round(118 * rev * 1000) / 1000,
    assets: Math.round(8900 * bal * 100) / 100,
    liabilities: Math.round(6570 * bal * 100) / 100,
    equity: Math.round(2330 * bal * 100) / 100,
    debt: Math.round(1869 * bal * 1000) / 1000,
    short_term_debt: Math.round(1795 * bal * 1000) / 1000,
    long_term_debt: Math.round(74 * bal * 1000) / 1000,
    cash: Math.round(375 * bal * 1000) / 1000,
    finance_cost: Math.round(206 * rev * 1000) / 1000,
    operating_cash_flow: Math.round(88 * rev * 1000) / 1000,
    investing_cash_flow: -Math.round(55 * rev * 1000) / 1000,
    financing_cash_flow: Math.round(13 * rev * 1000) / 1000,
    net_change_in_cash: Math.round(45 * rev * 1000) / 1000,
    dividends_paid: null,
    filing_id: 'demo-' + end.replace(/-/g, ''),
    filed_on: end,
    demo: true,
  }));

  // Sample indices, not EGX 30/70/100. An invented level under a real index's
  // name is the same fabricated figure as an invented price under a real
  // company's name, and the banner at the top of the page is not enough:
  // a screenshot travels without it.
  const indices = [['Sample Index 30', 'مؤشر تجريبي ٣٠', 12800],
                   ['Sample Index 70', 'مؤشر تجريبي ٧٠', 4310],
                   ['Sample Index 100', 'مؤشر تجريبي ١٠٠', 6190]]
    .map(([label, labelAr, base]) => {
      const points = [];
      let v = base;
      for (let i = 0; i < 40; i++) { v += (rand() - 0.48) * base * 0.008; points.push(v); }
      const pct = Math.round((rand() * 3 - 1.2) * 100) / 100;
      const up = pct >= 0;
      return {
        id: label, label, labelAr,
        value: v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        chg: (up ? '+' : '−') + Math.abs(v * pct / 100).toFixed(2),
        pct: (up ? '+' : '−') + Math.abs(pct).toFixed(2) + '%',
        color: up ? 'var(--up)' : 'var(--down)',
        tint: up ? 'var(--upTint)' : 'var(--downTint)',
        arrow: up ? '↗' : '↘',
        up, points,
      };
    });

  const readNow = [
    { kind: 'Filing', kindAr: 'إفصاح', kindColor: 'var(--accent)', tint: 'var(--accTint)',
      title: `${companies[0].name.en} files H1 2026: borrowings EGP 252.1m higher than at 31 December`,
      titleAr: `${companies[0].name.ar} تُقدّم قوائم النصف الأول ٢٠٢٦: القروض أعلى منها في ٣١ ديسمبر بمقدار ٢٥٢٫١ مليون جنيه`,
      stamp: '2026-08-14 · demo-293566', ticker: companies[0].ticker },
    { kind: 'Silence', kindAr: 'صمت', kindColor: 'var(--iris)', tint: 'var(--irisTint)',
      title: `${companies[7].name.en} has had no closing price for four sessions`,
      titleAr: `${companies[7].name.ar} لم تُفصح عن سعر إغلاق في آخر أربع جلسات`,
      stamp: 'demo/signals · 2026-08-26', ticker: companies[7].ticker },
    { kind: 'Results due', kindAr: 'نتائج مرتقبة', kindColor: 'var(--iris)', tint: 'var(--irisTint)',
      title: 'Six half-year filings expected before 31 August on past filing history',
      titleAr: 'ستة إفصاحات نصف سنوية متوقعة قبل ٣١ أغسطس بحسب سجل الشركات',
      stamp: 'demo/calendar · estimate', screen: 'calendar' },
  ];

  return {
    demo: true, companies, series, fins, indices, readNow,
    marketDate: '2026-08-26', generatedAt: '2026-08-27 11:48 UTC', dataVersion: 'demo',
  };
}

/* ── the real thing ─────────────────────────────────────────────────────── */

const ROOT = '/data/v1';

/** One JSON document. 401 means the session went; the caller falls back. */
async function doc(path) {
  const response = await fetch(`${ROOT}/${path}`, {
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
  });
  if (response.status === 401 || response.status === 403) {
    const error = new Error('not signed in');
    error.unauthorized = true;
    throw error;
  }
  if (!response.ok) throw new Error(`${path}: ${response.status}`);
  return response.json();
}

export async function live() {
  const [directory, market, manifest] = await Promise.all([
    doc('companies.json'), doc('market.json'), doc('manifest.json'),
  ]);
  const quotes = market.stocks || {};
  const companies = (directory.companies || []).map((c) => {
    const q = quotes[c.ticker] || {};
    return {
      ticker: c.ticker,
      name: { en: c.name_en, ar: c.name_ar || c.name_en },
      sector: c.sector || '—',
      close: q.close ?? '—',
      // market.json states the day's move as a FRACTION — COMI fell 0.011918,
      // which is 1.19%. The site printed it straight, so every move on the
      // exchange read a hundred times too small: a real ticker with a wrong
      // figure beside it. The app carries the same warning at
      // quote_snapshot.dart:119, having been bitten in the other direction.
      pct: typeof q.change_percent === 'number' ? q.change_percent * 100 : null,
      // Whole pounds, not millions. COMI's 474,267,676,058 was being divided
      // by a thousand and suffixed "B" — "474267676.1B", which is not a
      // quantity anybody can read.
      cap: c.market_cap ?? null,
      pe: c.pe ?? null,
      eps: c.eps ?? null, epsPeriod: c.eps_period || '',
      volume: q.volume ?? null,
      // How busy the session was against this company's OWN normal. The median
      // of the last twenty sessions, not the mean: a median is not dragged by
      // one earlier spike, which matters most in the exact case this is
      // looking for. Both numbers are already on the two documents Home reads,
      // so this costs no extra request.
      rv: (typeof q.volume === 'number' && typeof c.median_volume_20d === 'number'
           && c.median_volume_20d > 0)
        ? q.volume / c.median_volume_20d : null,
      medianVolume: c.median_volume_20d ?? null,
    };
  });
  return {
    demo: false, companies, series: [], fins: [],
    // The stamps the sidebar and every screen header print. These used to be
    // frozen literals carried over from the design — "26 August 2026", built
    // "2026-08-27 11:48 UTC", data_version 771314503e — which meant the page
    // told every reader the same session date for ever, whatever the pipeline
    // had actually published.
    marketDate: market.date || manifest.market_date || null,
    generatedAt: manifest.generated_at || null,
    dataVersion: manifest.data_version || null,
  };
}

/* ── Home's own two blocks ──────────────────────────────────────────────────
 *
 * Both were design literals with no live source at all, which is the worst
 * shape a placeholder can take: it never fails, so nothing reveals it. A
 * signed-in reader was shown EGX 30 at 44,883.36 rising 0.70% on a session
 * that closed at 55,106.50 down 0.31%. Published under a real index name, that
 * is a fabricated financial figure — the one thing this publisher must never
 * emit — and it had no way of ever going away by itself.
 */

/** The documents Home needs beyond the directory: the index history, and the
 *  archive's own read of what is worth looking at. */
export async function attention() {
  const [history, signals] = await Promise.all([
    doc('market-history.json').catch(() => null),
    doc('signals.json').catch(() => null),
  ]);
  return { history, signals, breadth: breadthOf(history) };
}

/** How many shares rose, fell and held, in the last session that counted them.
 *
 * market-history.json records it for 26 of its 260 sessions, the most recent
 * included, and nothing on the site has ever read it — so the three index
 * cards said what the market did on average and nothing about how widely. */
export function breadthOf(history) {
  const sessions = (history && history.sessions) || [];
  for (let i = sessions.length - 1; i >= 0; i--) {
    const b = sessions[i].breadth;
    if (b && typeof b.counted === 'number' && b.counted > 0) {
      return { up: b.up || 0, down: b.down || 0, flat: b.flat || 0,
               counted: b.counted, date: sessions[i].date };
    }
  }
  return null;
}

/** Index cards from the published levels, sparked with the index's own closes.
 *
 * The design drew the spark from a seeded sine wave. Beside a real level that
 * is a made-up price path, so the line here is the last forty sessions the
 * archive actually holds for that index, and nothing is drawn when it holds
 * none. */
export function indexCards(indices, history) {
  const sessions = (history && history.sessions) || [];
  return (indices || []).map((x) => {
    const up = (x.change_percent || 0) >= 0;
    return {
      id: x.id,
      label: x.label, labelAr: x.label_ar || x.label,
      value: typeof x.level === 'number'
        ? x.level.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : '—',
      chg: typeof x.change_points === 'number'
        ? (x.change_points > 0 ? '+' : '−') + Math.abs(x.change_points).toLocaleString(
          'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : '—',
      pct: typeof x.change_percent === 'number'
        ? (x.change_percent > 0 ? '+' : '−') + Math.abs(x.change_percent).toFixed(2) + '%'
        : '—',
      color: up ? 'var(--up)' : 'var(--down)',
      tint: up ? 'var(--upTint)' : 'var(--downTint)',
      arrow: up ? '↗' : '↘',
      up,
      points: sessions.slice(-40)
        .map((s) => (s.indices || {})[x.id])
        .filter((v) => typeof v === 'number'),
    };
  });
}

/** "What to read now": a filing, a silence and the week ahead — each one a row
 *  that exists in a published document, or nothing at all. */
export function readNowCards(signals, expectedTotal, expectedFrom) {
  const cards = [];
  const first = ((signals && signals.firsts) || [])[0];
  if (first) {
    cards.push({
      kind: 'Filing', kindAr: 'إفصاح',
      kindColor: 'var(--accent)', tint: 'var(--accTint)',
      title: first.title || first.name, titleAr: first.title_ar || first.title || first.name_ar,
      // Why it is here at all: the exchange has not seen this kind of filing
      // from this company since that date. Both dates are in the record.
      stamp: `${first.date} · first since ${first.previous || '—'}`,
      ticker: first.ticker,
    });
  }
  // The longest silence the archive can see. A company that has not filed is a
  // fact about the filing record and says nothing about the company.
  const quiet = ((signals && signals.quiet) || [])[0];
  if (quiet) {
    cards.push({
      kind: 'Silence', kindAr: 'صمت',
      kindColor: 'var(--iris)', tint: 'var(--irisTint)',
      title: `${quiet.name || quiet.ticker} has filed nothing since ${quiet.last_filed}`,
      titleAr: `${quiet.name_ar || quiet.name || quiet.ticker} لم تُفصح عن شيء منذ ${quiet.last_filed}`,
      stamp: `signals.json · ${quiet.silent_days} days`,
      ticker: quiet.ticker,
    });
  }
  if (expectedTotal) {
    cards.push({
      kind: 'Results due', kindAr: 'نتائج مرتقبة',
      kindColor: 'var(--iris)', tint: 'var(--irisTint)',
      title: expectedFrom
        ? `${expectedTotal} filings expected from ${expectedFrom} on past filing rhythm`
        : `${expectedTotal} filings expected on past filing rhythm`,
      titleAr: expectedFrom
        ? `${expectedTotal} إفصاحاً متوقعاً اعتباراً من ${expectedFrom} بحسب سجل الشركات`
        : `${expectedTotal} إفصاحاً متوقعاً بحسب سجل الشركات`,
      stamp: 'calendar.json · estimate',
      screen: 'calendar',
    });
  }
  return cards;
}

/** The per-company document, loaded when a company screen opens. */
export async function company(ticker) {
  // The brief is what the header's description reads. Without it the screen
  // used to fall back to the design's account of a company called KORRA, which
  // sat under whichever real ticker was open; it is a separate document and
  // its absence costs the paragraph, not the screen.
  const [d, brief, prices, review] = await Promise.all([
    doc(`companies/${ticker}.json`),
    doc(`briefs/${ticker}.json`).catch(() => null),
    // The company document carries 260 sessions; prices/ carries 1,500. The
    // chart offers a 5Y range, which was quietly showing the same 260 sessions
    // as 1Y for every company on the exchange. 231 of 282 have this file; the
    // rest keep the shorter series rather than losing the chart.
    doc(`prices/${ticker}.json`).catch(() => null),
    // Eight ratios, each with its own history and the sector's middle company
    // beside it. 258 companies have one; the site had never opened the
    // directory.
    doc(`review/${ticker}.json`).catch(() => null),
  ]);
  const rows = [
    ...(d.financials?.annual || []),
    ...(d.financials?.quarterly || []),
  ].sort((a, b) => String(b.period_end || '').localeCompare(String(a.period_end || '')));
  return {
    series: ((prices && prices.price_history) || d.price_history || [])
      .map((p) => ({ date: p.date, close: p.close })),
    fins: rows,
    debt: d.debt || null,
    review: review || null,
    profile: d.profile || {},
    sector: d.sector,
    name: d.name,
    brief: brief ? (brief.story || brief.history || '') : '',
    briefAr: brief ? (brief.story_ar || brief.history_ar || '') : '',
    briefSource: brief ? `briefs/${ticker}.json` : null,
  };
}

export { doc };

/* ── the screens beyond home ────────────────────────────────────────────────
 *
 * Each of these turns one published document into the exact shape the design
 * already draws, so the screens themselves needed no changes. Where a document
 * carries an Arabic string beside its English one, both are kept and the
 * language switch picks — the site never translates anything itself.
 */

const TINT = {
  results: ['var(--accent)', 'var(--accTint)'],
  board: ['var(--iris)', 'var(--irisTint)'],
  funding: ['var(--iris)', 'var(--irisTint)'],
  halt: ['var(--down)', 'var(--downTint)'],
  resume: ['var(--up)', 'var(--upTint)'],
};
const tintFor = (event) => TINT[event] || ['var(--accent)', 'var(--accTint)'];

const hhmm = (iso) => {
  const when = new Date(iso);
  return Number.isNaN(when.getTime()) ? '' :
    String(when.getHours()).padStart(2, '0') + ':' + String(when.getMinutes()).padStart(2, '0');
};
const day = (iso) => {
  const when = new Date(iso);
  return Number.isNaN(when.getTime()) ? String(iso || '') :
    when.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

/** Today: headlines with their outlet, carried verbatim and linked back. */
export async function news() {
  const d = await doc('news/latest.json');
  // Each story's `sources` entry carries only {id, link}; the outlets' real
  // names live once, at the top of the document. Without the join every card
  // shouted its slug — ALBORSA, HAPI, ALMAL — because `source.name` was never
  // there to be found and the code fell through to the id.
  const outlets = new Map((d.sources || []).map((s) => [s.id, s]));
  // Every story, not the newest forty. The cut was invisible and it silently
  // excluded whole outlets: Enterprise files ten stories to Al Borsa's 158, so
  // none of its work ever reached the top of the pile — while the footer went
  // on naming it as a source. The screen still shows a page at a time; the
  // difference is that the rest is now reachable.
  return (d.items || []).map((it) => {
    const [kindColor, tint] = tintFor(it.event);
    const attributions = it.sources || [];
    const named = attributions.map((a) => outlets.get(a.id) || { name: a.id });
    return {
      // "Other" is the event on 257 of 400 stories and says nothing; the app
      // shows no pill at all rather than a coloured chip reading OTHER. The
      // Arabic label must not fall back to the English one — that hands an
      // Arabic reader a word in the wrong script — and there is no "Filing"
      // default, because this is a newspaper feed and not the exchange.
      kind: it.event_label || '', kindAr: it.event_label_ar || '',
      hasKind: it.event !== 'other' && Boolean(it.event_label),
      kindColor, tint,
      time: hhmm(it.published), date: String(it.published || '').slice(0, 10),
      // Eleven stories today were carried by more than one outlet; all of them
      // are credited, and the link goes to the first.
      source: named.map((s) => s.name).filter(Boolean).join(' · ') || 'EGX',
      sourceAr: named.map((s) => s.name_ar || s.name).filter(Boolean).join(' · ') || 'EGX',
      href: (attributions[0] || {}).link || '#',
      // The English headline where the translation cache has reached it — 14
      // stories today, and more as it fills. The site never translates.
      headline: it.headline_en || it.headline, headlineAr: it.headline,
      // The plain-language line: what the story does to somebody holding EGX
      // shares. The template calls it `why`; the document calls it `meaning`.
      // It was never mapped, so the box under every live headline was empty —
      // the template reads `f.why` and news() only ever produced `because`.
      why: it.meaning || '', whyAr: it.meaning_ar || '',
      // The measured reason, and only where it is measured. `because` falls
      // back to one generic sentence — "Names no listed company we can
      // match…" — whenever no listed company is involved, which is most of the
      // feed. The app learned to withhold it on market-weight stories rather
      // than print the same apology on row after row; same rule here.
      because: it.weight === 'market' ? '' : (it.because || ''),
      becauseAr: it.weight === 'market' ? '' : (it.because_ar || ''),
      image: it.image || null,
      hasImage: Boolean(it.image),
      tickers: (it.tickers || []).map((ticker) => ({ ticker })),
    };
  });
}

/** Who the feed was read from, what was merged, and what could not be reached.
 *
 * A feed that lists only what worked is marketing — the same argument
 * docs/data-sources.md makes one level up. The withheld count is the §8 line
 * and its wording is the app's, unchanged. */
export async function newsProvenance() {
  const d = await doc('news/latest.json');
  return {
    outlets: (d.sources || []).map((s) => s.name).filter(Boolean),
    outletsAr: (d.sources || []).map((s) => s.name_ar || s.name).filter(Boolean),
    merged: d.merged || 0,
    withheld: d.dropped_for_advice || 0,
    unreachable: (d.unavailable || []).map((u) => u.name).filter(Boolean),
  };
}

/** Calendar: what was filed, and what past filing rhythm says is due. */
export async function calendar() {
  const d = await doc('calendar.json');
  const events = d.events || [];
  // What the entry actually is. The document names five kinds and the site
  // showed none of them, so a dividend payment, an ex-dividend date and a
  // rights issue closing were three identical-looking rows.
  const KIND = {
    results_expected: ['Results expected', 'نتائج مرتقبة'],
    dividend_payment: ['Dividend paid', 'توزيع أرباح'],
    ex_dividend: ['Ex-dividend', 'بدون توزيع'],
    rights_open: ['Rights issue opens', 'فتح حق الاكتتاب'],
    rights_close: ['Rights issue closes', 'إغلاق حق الاكتتاب'],
  };
  const shape = (e) => {
    const kind = KIND[e.kind] || [e.kind || '', e.kind || ''];
    return {
      day: day(e.date), date: e.date, ticker: e.ticker || '—',
      what: e.title || e.note || e.kind, whatAr: e.title_ar || e.title || e.note || e.kind,
      kind: kind[0], kindAr: kind[1],
      href: e.link || null,
      // An estimate says so, says the window it is drawn inside, and says how
      // many past filings the window was drawn from. A date with none of that
      // reads as an announcement.
      estimated: Boolean(e.estimated),
      windowFrom: e.window_start || '', windowTo: e.window_end || '',
      observations: e.observations || 0,
    };
  };
  const expected = events.filter((e) => !e.filed);
  // Home says how many are due, and "394 expected" — every unfiled event the
  // calendar holds, out to next May — is true and useless. What it wants is
  // the next wave: the earliest date still ahead, and everything within a
  // fortnight of it. Filing seasons cluster, so a fixed window from today is
  // empty for most of the year; this one never is, and both ends of it come
  // out of the document.
  const today = String(d.generated || '').slice(0, 10);
  const ahead = expected.filter((e) => !today || e.date >= today)
    .map((e) => e.date).sort();
  const opens = ahead[0] || '';
  const closes = opens
    ? new Date(new Date(opens + 'T00:00:00Z').getTime() + 14 * 86400000).toISOString().slice(0, 10)
    : '';
  const soon = opens
    ? expected.filter((e) => e.date >= opens && e.date <= closes)
    : expected;
  return {
    filed: events.filter((e) => e.filed).slice(0, 12).map(shape),
    // An estimate is labelled as one; the design keeps them in their own list.
    expected: expected.slice(0, 12).map(shape),
    // The lists are cut at twelve for the screen; the count is not, because
    // Home prints it as a number and a truncated one would simply be wrong.
    expectedTotal: soon.length,
    expectedFrom: opens,
  };
}

/** The months the filed archive holds, newest first, with what each contains.
 *
 * The Calendar's month pills were four hardcoded strings from the design —
 * Jun through Sep 2026 — and clicking one changed a state field nothing read.
 * The archive holds twelve months and says how many filings are in each. */
export async function filedMonths() {
  const d = await doc('calendar/filed/index.json');
  return (d.months || []).map((m) => ({ id: m.month, count: m.count || 0,
                                        first: m.first, last: m.last }));
}

/** Everything the exchange published in one month. 1,467 filings in August. */
export async function filedMonth(month) {
  const d = await doc(`calendar/filed/${month}.json`);
  return (d.items || []).map((it) => ({
    date: it.date, ticker: it.ticker || '\u2014',
    // The exchange files in Arabic and the English title is its own, where the
    // exchange published one. Nothing here is translated on the site.
    what: it.title_en || it.title, whatAr: it.title,
    section: it.section || '', id: it.id, href: it.link || null,
  }));
}

/** What each recent filing MEANS, keyed by its exchange id.
 *
 * The archive months carry a filing's title and nothing else. This document
 * carries the plain-language line for the recent window — what a cash dividend
 * does to a share price, what a capital increase is — and joining the two is
 * what turns a list of Arabic titles into something readable. */
export async function disclosureMeanings() {
  const d = await doc('disclosures/latest.json');
  const out = new Map();
  for (const it of d.items || []) {
    if (!it.id) continue;
    out.set(it.id, {
      label: it.event_label || '', labelAr: it.event_label_ar || it.event_label || '',
      meaning: it.meaning || '', meaningAr: it.meaning_ar || it.meaning || '',
      titleEn: it.title_en || '',
    });
  }
  return out;
}

/** Exchange: index levels and the world prices beside them, plus macro. */
const ar_gram = 'EGP/g';

export async function exchange() {
  const [r, m] = await Promise.all([doc('rates/latest.json'), doc('macro.json')]);
  const level = (x) => ({
    label: x.label, labelAr: x.label_ar || x.label,
    value: typeof x.level === 'number' ? x.level.toLocaleString('en-US',
      { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : String(x.level ?? '—'),
    pct: x.change_percent === null || x.change_percent === undefined ? '—'
      : (x.change_percent > 0 ? '+' : '\u2212') + Math.abs(x.change_percent).toFixed(2) + '%',
    color: (x.change_percent || 0) >= 0 ? 'var(--up)' : 'var(--down)',
    // `token` is a combined display string, not a unit; the design wants the
    // word that follows the number.
    unit: x.kind ? '' : 'points',
    // "EGX 30 fell 0.31% in the session." — the document's own sentence, which
    // the site was throwing away in favour of the bare number.
    plain: x.plain || '', plainAr: x.plain_ar || '',
  });
  const money = (v, dp) => (typeof v === 'number'
    ? v.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp })
    : '—');
  // The pound against five currencies, and the two metals at the price
  // Egyptians actually buy them — per gram, not per ounce. Both blocks are
  // published and neither was ever read, so the Exchange screen showed the
  // indices and world prices and nothing about the currency in anybody's
  // pocket. Each carries its own published sentence; none of them is written
  // here.
  const currency = (x) => ({
    label: x.label, labelAr: x.label_ar || x.label,
    value: money(x.egp, 2), pct: '', color: 'var(--ink)',
    unit: 'EGP', plain: x.plain || '', plainAr: x.plain_ar || '',
  });
  const metal = (x) => ({
    label: x.label, labelAr: x.label_ar || x.label,
    value: money(x.egp_gram, 2), pct: '', color: 'var(--ink)',
    unit: ar_gram, plain: x.plain || '', plainAr: x.plain_ar || '',
    // 21-karat is what a Cairo shop window quotes; 24 and 18 come with it.
    karats: (x.karats || []).map((k) => ({ karat: k.karat + 'k', value: money(k.egp_gram, 2) })),
  });
  const rates = [
    ...(r.indices || []).map(level),
    ...(r.world || []).map(level),
    ...(r.currencies || []).map(currency),
    ...(r.metals || []).map(metal),
  ];
  // How strongly each series has actually moved with the exchange, and over
  // how many sessions. Published, and never shown — which left the reader to
  // assume a connection the number itself mostly denies.
  const linked = new Map((m.correlations || []).map((c) => [c.id, c]));
  const macro = [
    ...(m.series || []).map((s) => ({
      label: s.label, labelAr: s.label_ar || s.label,
      period: s.as_of || s.cadence || '', color: 'var(--ink)',
      // "37" over the word "ships" is a reading; "37" alone is a number
      // waiting to be misread.
      value: typeof s.latest === 'number' ? s.latest.toLocaleString('en-US') : String(s.latest ?? '—'),
      unit: s.unit || '',
      meaning: s.meaning || '', meaningAr: s.meaning_ar || s.meaning || '',
      // Why a canal, a metal or a barrel reaches an Egyptian share at all.
      chain: s.chain || '', chainAr: s.chain_ar || s.chain || '',
      correlation: linked.get(s.id) || null,
    })),
    ...(m.indicators || []).map((i) => ({
      label: i.label, labelAr: i.label_ar || i.label,
      period: String(i.year || ''), color: 'var(--ink)',
      value: typeof i.value !== 'number' ? String(i.value ?? '—')
        : Math.abs(i.value) >= 1e9 ? (i.value / 1e9).toFixed(2) + 'bn'
        : Math.abs(i.value) >= 1e6 ? (i.value / 1e6).toFixed(1) + 'm'
        : i.value.toLocaleString('en-US', { maximumFractionDigits: 2 }),
      unit: i.unit || '',
      meaning: i.meaning || '', meaningAr: i.meaning_ar || i.meaning || '',
      chain: i.chain || '', chainAr: i.chain_ar || i.chain || '',
      correlation: null,
    })),
  ];
  // `indexLevels` is the raw published block, kept so Home can build its cards
  // from the same document this screen already fetched rather than asking for
  // it twice.
  return { rates, macro, indexLevels: r.indices || [] };
}

/** Sectors: how each one moved, and the vetted read beneath it. */
export async function sectors() {
  const d = await doc('sectors.json');
  const list = d.sectors || [];
  // 17 files, 6 KB each. Fetched together because the screen shows all of them
  // at once and a per-card fetch on hover would spend a reader's hourly
  // allowance on scrolling. A detail that fails costs its own card's extra
  // lines, not the card.
  const details = await Promise.all(list.map(
    (s) => doc(`sectors/${s.slug}.json`).catch(() => null)));

  const UNIT = { percent: '%', ratio: '\u00d7', egp_m: 'm', egp: '' };
  // The document keys these by wire name. `debt_equity` and `cash_conversion`
  // are not words, and a chip is too small to explain itself.
  const METRIC = {
    pe: ['P/E', 'مكرر الربحية'], roe: ['Return on equity', 'العائد على حقوق الملكية'],
    roa: ['Return on assets', 'العائد على الأصول'], debt_equity: ['Debt to equity', 'الدين إلى حقوق الملكية'],
    dividend_yield: ['Dividend yield', 'عائد التوزيعات'], profit: ['Net profit', 'صافي الربح'],
    eps: ['Earnings per share', 'ربحية السهم'], assets: ['Total assets', 'إجمالي الأصول'],
    cash_conversion: ['Cash conversion', 'تحويل النقد'],
  };
  const median = (m) => {
    if (typeof m.value !== 'number') return '\u2014';
    const dp = m.unit === 'egp' ? 2 : m.unit === 'egp_m' ? 0 : m.unit === 'ratio' ? 2 : 1;
    return m.value.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp })
      + (UNIT[m.unit] || '');
  };

  return list.map((s, i) => {
    const detail = details[i] || {};
    // `movement` is one row per metric; `lead` is the one the sector's read is
    // written about, so the bar shows that rather than an average of eight.
    const move = s.lead
      || (s.movement || []).find((m) => m.key === 'assets')
      || (s.movement || [])[0] || {};
    const rising = move.rising || 0;
    const falling = move.falling || 0;
    const flat = Math.max(0, (s.companies || 0) - rising - falling);
    // Ten cells, filled in proportion — the design draws the row as bars.
    const bar = (n, color) => Array.from(
      { length: Math.round((n / Math.max(1, s.companies)) * 10) }, () => ({ color, op: 1 }));
    const top = (detail.standouts || [])[0];
    return {
      slug: s.slug, name: s.sector, nameAr: s.sector,
      // The names the template actually binds. The mapper used to emit
      // `companies`, `lead` and `pe`, while the card reads `count`, `read`
      // and `medianPe` — so every card rendered its title and its bar over
      // four blank lines.
      count: String(s.companies ?? '\u2014'),
      upCount: rising, downCount: falling, flatCount: flat,
      read: s.readTeaser || '', readAr: s.readTeaser || '',
      medianPe: s.medianPe ? Number(s.medianPe).toFixed(1) : '\u2014',
      yield: s.medianDividendYield ? Number(s.medianDividendYield).toFixed(1) + '%' : '\u2014',
      // The company with the most metrics improving. Named, never ranked:
      // "most improving lines" is a count off the filings, not a verdict.
      standout: top ? `${top.ticker} \u00b7 ${top.improving}/${top.readable}` : '',
      // The full four-sentence read, and the middle company on every metric
      // the sector can measure. Both published per sector and never opened.
      full: detail.read || '', fullAr: detail.read_ar || detail.read || '',
      medians: (detail.medians || []).map((m) => ({
        key: (METRIC[m.key] || [m.key])[0], keyAr: (METRIC[m.key] || [m.key, m.key])[1],
        value: median(m),
      })),
      metrics: (detail.movement || []).map((m) => ({
        key: (METRIC[m.key] || [m.key])[0], keyAr: (METRIC[m.key] || [m.key, m.key])[1],
        rising: m.rising || 0, falling: m.falling || 0,
        flat: m.flat || 0, unknown: m.unknown || 0,
      })),
      bars: [
        ...bar(rising, 'var(--up)'),
        ...bar(falling, 'var(--down)'),
        ...bar(flat, 'var(--rule2)'),
      ].slice(0, 10),
    };
  });
}

/** The per-company blocks the company screen shows under its statements. */
export async function companyExtras(ticker) {
  const [signals, filings] = await Promise.all([
    doc(`signals/${ticker}.json`).catch(() => null),
    doc(`disclosures/documents/${ticker}.json`).catch(() => null),
  ]);
  return {
    // The raw signal rows. They are turned into sentences in logic.js, which
    // is where the language lives — this used to render `${s.value} ${s.period}`
    // and print "0.137 Q1 2026" under a chip reading `back_to_profit`, the raw
    // wire enum, with an empty line beneath it because the card reads a
    // `stamp` nothing produced. It was wired to the demo's field names.
    signals: signals ? {
      streaks: signals.streaks || [],
      firsts: signals.firsts || [],
      quiet: signals.quiet || null,
      resultsDue: signals.results_due || [],
    } : null,
    filings: filings ? (filings.items || []).slice(0, 6).map((f) => ({
      date: f.date, title: f.title_en || f.title, titleAr: f.title,
      id: f.id, href: f.link || '#',
    })) : null,
  };
}

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

  return { demo: true, companies, series, fins, marketDate: null };
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
  const [directory, market] = await Promise.all([doc('companies.json'), doc('market.json')]);
  const quotes = market.stocks || {};
  const companies = (directory.companies || []).map((c) => {
    const q = quotes[c.ticker] || {};
    return {
      ticker: c.ticker,
      name: { en: c.name_en, ar: c.name_ar || c.name_en },
      sector: c.sector || '—',
      close: q.close ?? '—',
      pct: q.change_percent ?? null,
      cap: c.market_cap ?? null,
      pe: c.pe ?? null,
    };
  });
  return { demo: false, companies, series: [], fins: [], marketDate: market.date };
}

/** The per-company document, loaded when a company screen opens. */
export async function company(ticker) {
  const d = await doc(`companies/${ticker}.json`);
  const rows = [
    ...(d.financials?.annual || []),
    ...(d.financials?.quarterly || []),
  ].sort((a, b) => String(b.period_end || '').localeCompare(String(a.period_end || '')));
  return {
    series: (d.price_history || []).map((p) => ({ date: p.date, close: p.close })),
    fins: rows,
    debt: d.debt || null,
    profile: d.profile || {},
    sector: d.sector,
    name: d.name,
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
  return (d.items || []).slice(0, 40).map((it) => {
    const [kindColor, tint] = tintFor(it.event);
    const source = (it.sources || [])[0] || {};
    return {
      kind: it.event_label || 'Filing', kindAr: it.event_label_ar || it.event_label || '',
      kindColor, tint,
      time: hhmm(it.published), date: String(it.published || '').slice(0, 10),
      source: source.name || source.id || 'EGX',
      href: source.link || '#',
      headline: it.headline, headlineAr: it.headline,
      because: it.because || '', becauseAr: it.because_ar || '',
      image: it.image || null,
      tickers: (it.tickers || []).map((ticker) => ({ ticker })),
    };
  });
}

/** Calendar: what was filed, and what past filing rhythm says is due. */
export async function calendar() {
  const d = await doc('calendar.json');
  const events = d.events || [];
  const shape = (e) => ({
    day: day(e.date), ticker: e.ticker || '—',
    what: e.title || e.note || e.kind, whatAr: e.title_ar || e.title || e.note || e.kind,
    href: e.link || null,
  });
  return {
    filed: events.filter((e) => e.filed).slice(0, 12).map(shape),
    // An estimate is labelled as one; the design keeps them in their own list.
    expected: events.filter((e) => !e.filed).slice(0, 12).map(shape),
  };
}

/** Exchange: index levels and the world prices beside them, plus macro. */
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
  });
  const rates = [...(r.indices || []), ...(r.world || [])].map(level);
  const macro = [
    ...(m.series || []).map((s) => ({
      label: s.label, labelAr: s.label_ar || s.label,
      period: s.as_of || s.cadence || '', color: 'var(--ink)',
      value: String(s.latest ?? '—'),
      meaning: s.meaning || '', meaningAr: s.meaning_ar || s.meaning || '',
    })),
    ...(m.indicators || []).map((i) => ({
      label: i.label, labelAr: i.label_ar || i.label,
      period: String(i.year || ''), color: 'var(--ink)',
      value: String(i.value ?? '—'),
      meaning: i.meaning || '', meaningAr: i.meaning_ar || i.meaning || '',
    })),
  ];
  return { rates, macro };
}

/** Sectors: how each one moved, and the vetted read beneath it. */
export async function sectors() {
  const d = await doc('sectors.json');
  return (d.sectors || []).map((s) => {
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
      { length: Math.round((n / Math.max(1, s.companies)) * 10) }, () => ({ color }));
    return {
      slug: s.slug, name: s.sector, nameAr: s.sector,
      companies: s.companies,
      lead: s.readTeaser || '',
      pe: s.medianPe ? Number(s.medianPe).toFixed(1) : '—',
      yield: s.medianDividendYield ? Number(s.medianDividendYield).toFixed(1) + '%' : '—',
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
    signals: signals ? (signals.streaks || []).slice(0, 3).map((s) => ({
      kind: s.kind || 'Signal', kindAr: s.kind || 'Signal',
      title: `${s.value ?? ''} ${s.period || ''}`.trim(),
      because: s.filed ? `filed ${s.filed}` : '',
      becauseAr: s.filed ? `${s.filed}` : '',
    })) : null,
    filings: filings ? (filings.items || []).slice(0, 6).map((f) => ({
      date: f.date, title: f.title_en || f.title, titleAr: f.title,
      id: f.id, href: f.link || '#',
    })) : null,
  };
}

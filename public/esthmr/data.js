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

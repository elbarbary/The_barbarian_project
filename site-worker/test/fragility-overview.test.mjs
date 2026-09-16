/* The crash-warning research page: figures from the published run, no advice.
 *
 * The page it replaced contradicted itself (14.49% a year beside 14.62%, a
 * strategy that "WON" 2015–2019 beside a published series in which it made
 * half of what holding the index did) and told readers "Today's recommended
 * stance: 100% in Egyptian stocks" from a week-old snapshot. So these tests
 * hold the figures to the research's own documents, hold the words to the
 * rules every other screen keeps, and fail if a figure is typed in again.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const ROOT = new URL('../../', import.meta.url);
const read = (p) => readFile(new URL(p, ROOT), 'utf8');

const fo = await import('../../public/esthmr/fragility-overview.js');
const seriesDoc = JSON.parse(await read('public/esthmr/backtest/world_monitor_simulation_series.json'));
const episodes = JSON.parse(await read('public/esthmr/backtest/c_v2_alert_episodes.json'));
const attribution = JSON.parse(await read('public/esthmr/backtest/ladder_attribution_matrix.json'));
const ledger = JSON.parse(await read('public/esthmr/backtest/executed_trades_history.json')).systems;
const page = await read('public/esthmr/fragility.html');
const pageScript = await read('public/esthmr/fragility-overview.js');
const notebook = await read('public/esthmr/fragility-research.html');
const logic = await read('public/esthmr/logic.js');
const template = await read('public/esthmr/template.html');

const m = fo.model(seriesDoc, episodes, attribution);
const LEDGER = { hold: 'buy_and_hold', rule: 'cv2_cash_sma', ladder: 'cv2_ladder', s100: 's100', partial: 'cv5_p' };
const close = (a, b, eps, what) => assert.ok(Math.abs(a - b) <= eps, `${what}: ${a} vs ${b}`);

/* ── the figures are the published run's ───────────────────────────────── */

test('every approach ends where the research ledger says it ends', () => {
  for (const [key, name] of Object.entries(LEDGER)) {
    close(m.full[key].growth, ledger[name].final_multiplier, 1e-4, `${key} growth`);
    close(m.full[key].worstFall * 100, ledger[name].max_dd, 0.05, `${key} worst fall`);
  }
});

test('a year is a calendar year, not 4,518 sessions over 250', () => {
  // EGX opens about 242 days a year. Dividing by 250 is what put 14.49% a
  // year on the old page for a growth that took 18.7 calendar years.
  const span = fo.years(m.first, m.last);
  close(m.years, span, 1e-9, 'span');
  assert.ok(span > 18.5 && span < 19, `span ${span}`);
  for (const key of Object.keys(LEDGER)) {
    close(m.full[key].perYear, m.full[key].growth ** (1 / span) - 1, 1e-12, `${key} rate`);
    assert.ok(m.full[key].perYear * 100 < ledger[LEDGER[key]].cagr || ledger[LEDGER[key]].cagr === 0 || m.full[key].growth < 1,
      `${key} should not match the 250-session rate`);
  }
});

test('the switches counted are the ledger’s trades', () => {
  for (const key of ['rule', 'ladder', 's100']) {
    assert.equal(fo.switches(m.series, key), ledger[LEDGER[key]].trade_count, key);
  }
});

test('the three periods are the research’s cut and cover the whole history', () => {
  assert.equal(m.periods.length, 3);
  assert.equal(m.periods[0].from, 0);
  assert.equal(m.periods.at(-1).to, m.sessions - 1);
  for (let i = 1; i < m.periods.length; i += 1) assert.equal(m.periods[i].from, m.periods[i - 1].to + 1);
  assert.throws(() => fo.periods(m.series, { blocks: { block1: { sessions: 10 } } }), /cover/);
});

test('whether the rule did better in a period is read from the series, not written down', () => {
  // A copy of the series in which the rule is flat for good: every period
  // with a rising index must then say the rule did worse.
  const flat = structuredClone(seriesDoc);
  const col = flat.timeline_columns.indexOf('cum_cv2_cash_sma');
  for (const row of flat.timeline) row[col] = 1;
  const f = fo.model(flat, episodes, attribution);
  for (const p of f.periods) {
    if (p.hold.perYear > 0) assert.ok(p.rule.perYear < p.hold.perYear, p.id);
  }
});

/* ── warnings and crashes ───────────────────────────────────────────────── */

test('every published warning has a kind the page can name', () => {
  assert.equal(m.warnings.other, 0, 'a warning type the page does not know would be counted as nothing');
  assert.equal(m.warnings.total, episodes.length);
  assert.equal(m.warnings.early + m.warnings.during + m.warnings.false + m.warnings.smaller, episodes.length);
});

test('a crash is measured over the research window and no further', () => {
  const dates = Array.from({ length: 200 }, (_, i) => new Date(Date.UTC(2020, 0, 1 + i)).toISOString().slice(0, 10));
  const flat = dates.map(() => 100);
  const series = {
    dates, price: flat.map((v, i) => (i === 10 + fo.CRASH_WINDOW + 1 ? 50 : v)),
    alert: dates.map(() => false),
    value: { hold: flat.map(() => 1), rule: flat.map((_, i) => (i === 10 + fo.CRASH_WINDOW ? 0.8 : 1)) },
    weight: {},
  };
  const [crash] = fo.crashes(series, [{ id: 'C99', name: 'Test', onset: dates[10] }], []);
  assert.equal(crash.index, 0, 'a fall one session after the window is not the crash’s');
  close(crash.rule, -0.2, 1e-12, 'the window’s last session is');
});

test('each crash carries the research’s own earliest warning before it', () => {
  assert.equal(m.crashes.length, seriesDoc.crises.length);
  for (const crash of m.crashes) {
    const number = Number(crash.id.replace(/\D/g, ''));
    const early = episodes.filter((e) => e.crisis_id === number && fo.kindOf(e) === 'early' && e.lead > 0);
    if (early.length) assert.equal(crash.lead, early.sort((a, b) => (a.start < b.start ? -1 : 1))[0].lead, crash.id);
    else assert.equal(crash.lead, null, crash.id);
  }
  assert.equal(m.crashesLess + m.crashesMore <= m.crashes.length, true);
});

test('the tax line quotes the research’s own cash audit', () => {
  assert.equal(m.tax.gross, attribution.cash_sleeve_audit.gross_1y_tbill.wealth_100k);
  assert.equal(m.tax.taxed, attribution.cash_sleeve_audit.taxed_20pct_tbill.wealth_100k);
  assert.ok(m.tax.taxed < m.tax.gross);
});

test('the latest reading is dated to the run it came from', () => {
  assert.equal(m.latest.date, seriesDoc.latest_live.date);
  assert.equal(m.latest.date, m.last, 'the reading and the series end on the same session');
});

/* ── words ──────────────────────────────────────────────────────────────── */

test('both languages say the same things with the same blanks', () => {
  const keys = (lang) => Object.keys(fo.COPY[lang]).sort();
  assert.deepEqual(keys('ar'), keys('en'));
  const blanks = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((x) => x[1]).sort();
  for (const key of keys('en')) assert.deepEqual(blanks(fo.COPY.ar[key]), blanks(fo.COPY.en[key]), key);
  for (const crash of seriesDoc.crises) assert.ok(fo.CRASH_NAMES_AR[crash.id], `${crash.id} has no Arabic name`);
});

test('nothing on the page tells a reader what to do', () => {
  const instruction = [
    /recommended (stance|allocation|position)/i, /\byou should\b/i, /\b(buy|sell) now\b/i,
    /capture upside/i, /\bstay (fully )?invested\b/i, /\bget out\b/i, /\bmove (your|into cash)\b/i,
    /ننصح/, /نوصي/, /اشترِ/, /بِع/, /يجب (أن )?(تبيع|تشتري)/, /ابق مستثمر/,
  ];
  const legal = new Set([fo.COPY.en.legal, fo.COPY.ar.legal]);
  for (const lang of ['en', 'ar']) {
    for (const [key, text] of Object.entries(fo.COPY[lang])) {
      if (legal.has(text)) continue;
      for (const pattern of instruction) assert.ok(!pattern.test(text), `${lang}.${key} reads as an instruction: ${text}`);
    }
  }
  for (const pattern of instruction) assert.ok(!pattern.test(page), `fragility.html: ${pattern}`);
  assert.match(fo.COPY.en.notAdvice, /not advice/);
  assert.match(fo.COPY.ar.notAdvice, /ليس نصيحة/);
});

test('the numbers inside Arabic sentences keep their signs in front', () => {
  // "−50.4%" isolated whole; a unit word after the digits, not inside them.
  assert.equal(fo.money(1153800, 'ar'), '⁦1.15⁩ مليون');
  assert.equal(fo.pct(0.1398), '+14.0%');
  assert.equal(fo.fall(-0.5044), '−50.4%');
  assert.equal(fo.fall(0), '0.0%');
});

/* ── nothing typed in, anywhere the research is shown ───────────────────── */

test('no figure from a research run is typed into the page', () => {
  for (const literal of ['56,280', '0.4528', '1,153,799', '1,153,800', '14.49', '14.62', '18.07', '533,326']) {
    assert.ok(!page.includes(literal), `fragility.html carries ${literal}`);
    assert.ok(!pageScript.includes(literal), `fragility-overview.js carries ${literal}`);
  }
});

test('the Tools tab opens the research and carries none of its figures', () => {
  const block = logic.slice(logic.indexOf('fragilityData: {'), logic.indexOf('isToolsTabSim'));
  assert.ok(block.length > 0);
  for (const stale of ['liveScore', 'livePrice', 'recallMetric', 'hardFaMetric', 'occupancyMetric', 'leadMetric', 'utilityMetric', 'engineA']) {
    assert.ok(!block.includes(stale), `fragilityData.${stale} is back`);
  }
  assert.ok(!/\d+\.\d+|\d+ ?%/.test(block.replace(/100,000|2008|2026/g, '')), 'a typed figure in the Tools tab');
  assert.ok(!/fragilityData\.(live|engine|recall|stress)/.test(template), 'the template still reads a typed figure');
  assert.match(block, /openFullHref: 'fragility'/);
});

test('the research notebook no longer gives a stance or calls a snapshot live', () => {
  for (const phrase of ['Recommended Stance', 'Capture Upside', 'Real-time tape', 'zero reason to panic', "shouldn't I just sell"]) {
    assert.ok(!notebook.includes(phrase), `fragility-research.html still says "${phrase}"`);
  }
  assert.match(notebook, /href="fragility"/, 'the notebook points readers to the plain account');
});

test('the public copies of the research files are the published ones', async () => {
  // /data/v1/ is behind sign-in, so the page reads these; a rerun that
  // refreshes one and not the other would publish two different researches.
  for (const name of ['world_monitor_simulation_series.json', 'executed_trades_history.json', 'ladder_attribution_matrix.json', 'c_v2_alert_episodes.json']) {
    assert.equal(await read(`public/esthmr/backtest/${name}`), await read(`public/data/v1/backtest/${name}`), name);
  }
});

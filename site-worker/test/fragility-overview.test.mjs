/* The crash-warning research page: figures from the published run, no advice.
 *
 * The page it replaced contradicted itself (14.49% a year beside 14.62%, a
 * strategy that "WON" 2015–2019 beside a published series in which it made
 * half of what holding the index did) and told readers "Today's recommended
 * stance: 100% in Egyptian stocks" from a week-old snapshot. So these tests
 * hold the figures to the research's own documents, hold the words to the
 * rules every other screen keeps, and fail if a figure is typed in again.
 *
 * On 17 Sep 2026 the owner asked for what the rewrite had taken away: the
 * model's current reading, and the notebook's tables and charts. The notebook
 * is back in full below the account (fragility-notebook.*), and the Tools tab
 * shows its reading again, from backtest/model_reading.json. The tests below
 * hold both to the same rule: the research's own numbers, never a copy typed
 * somewhere they cannot move with it.
 *
 * The same day that file became the model run each day on that day's closes
 * (scripts/fragility/reading.py). Whether it is the research's model is held
 * in Python, where scripts/fragility/test_reading.py replays every published
 * session; here, that the page and the Tools tab read it, and that it
 * continues the research rather than contradicting it.
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
const notebookHtml = await read('public/esthmr/fragility-notebook.html');
const notebookJs = await read('public/esthmr/fragility-notebook.js');
const notebookCss = await read('public/esthmr/fragility-notebook.css');
const notebook = notebookHtml + notebookJs;
const oldAddress = await read('public/esthmr/fragility-research.html');
const readingDoc = JSON.parse(await read('public/esthmr/backtest/model_reading.json'));
const v5Series = JSON.parse(await read('public/esthmr/backtest/v5_simulation_series.json'));
const v5Results = JSON.parse(await read('public/data/v1/backtest/v5_experiment_results.json'));
const logic = await read('public/esthmr/logic.js');
const template = await read('public/esthmr/template.html');

const m = fo.model(seriesDoc, episodes, attribution, readingDoc);
const researchOnly = fo.model(seriesDoc, episodes, attribution);
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

test('the research run’s last reading stays dated to the run', () => {
  const live = seriesDoc.latest_live;
  assert.equal(m.research.date, m.last, 'the research reading and the series end on the same session');
  assert.deepEqual(m.research, {
    date: live.date, price: live.price, on: Boolean(live.al_v2), score: live.s_v4,
    outside: live.wm_p, gold: live.gold_stress, oil: live.petrol_stress, swings: live.vol_stress,
    vol20: live.vol20, brake: Boolean(live.vol_brake_active),
    rule: 100 * m.series.weight.rule.at(-1),
    equity: live.active_equity_exposure, partial: live.dynamic_hedge_p,
    daily: false, sessions: [],
  });
  // Without the daily file, the card falls back to it and says which it is.
  assert.deepEqual(researchOnly.latest, m.research);
});

test('the reading card carries the daily reading, whole', () => {
  const r = readingDoc;
  assert.deepEqual(m.latest, {
    date: r.date, price: r.egx30, on: r.warning, score: r.score,
    outside: r.outside, gold: r.gold, oil: r.oil, swings: r.swings,
    vol20: r.vol20, brake: r.volBrakeActive, rule: r.rulePercent,
    equity: r.equityPercent, partial: r.partialPercent,
    daily: true, researchEnd: r.researchEnd, sessions: r.sessions,
  });
  // A daily file older than the research is not a newer reading.
  const stale = fo.model(seriesDoc, episodes, attribution, { ...r, date: '2026-09-01' });
  assert.equal(stale.latest.daily, false);
});

test('the reading’s alert line and volatility brake are the notebook’s own', () => {
  const line = fo.ALERT_LINE.toFixed(3);
  assert.ok(notebookHtml.includes(`S<sub>v4</sub>[t] &ge; ${line} &amp;&amp; S<sub>v4</sub>[t&minus;1] &ge; ${line}`),
    `the notebook states a different trigger from ${line}`);
  assert.ok(notebookHtml.includes(`Re-entry Safe (&lt; ${fo.VOL_BRAKE}%)`), `the notebook states a different brake from ${fo.VOL_BRAKE}%`);
});

test('the daily reading file continues the research', () => {
  const production = v5Results.v5_recommended_production;
  assert.equal(readingDoc.schemaVersion, 2);
  assert.equal(readingDoc.researchEnd, seriesDoc.meta.end_date, 'the file names a different end for the research');
  assert.ok(readingDoc.date > readingDoc.researchEnd, 'the daily reading is not after the research');
  assert.equal(readingDoc.alertLine, fo.ALERT_LINE);
  // The sessions scored since the research, oldest first, ending on the reading's own.
  const days = readingDoc.sessions.map((s) => s.date);
  assert.ok(days.length > 0 && days.every((d, i) => d > readingDoc.researchEnd && (i === 0 || d > days[i - 1])));
  const newest = readingDoc.sessions.at(-1);
  assert.deepEqual([newest.date, newest.egx30, newest.score, newest.warning, newest.outside, newest.rulePercent, newest.equityPercent],
    [readingDoc.date, readingDoc.egx30, readingDoc.score, readingDoc.warning, readingDoc.outside, readingDoc.rulePercent, readingDoc.equityPercent]);
  for (const key of ['score', 'engineInternal', 'engineExternal', 'outside', 'gold', 'oil', 'swings']) {
    assert.ok(readingDoc[key] >= 0 && readingDoc[key] <= 1, `${key} is outside 0 to 1`);
  }
  assert.equal(readingDoc.score, Math.max(readingDoc.engineInternal, readingDoc.engineExternal), 'the score is the larger of its two halves');
  const counts = v5Series.series.map((row) => row[v5Series.columns.indexOf('stress_count')]);
  assert.ok(Math.max(...counts) <= readingDoc.stressGroupsOf, 'more stress groups counted than the engine has');
  assert.ok(readingDoc.stressGroups <= readingDoc.stressGroupsOf);
  // The research's test figures travel with it, copied, not recomputed.
  assert.deepEqual(readingDoc.v5, {
    model: v5Results.metadata.recommended_model_name,
    years: v5Results.metadata.eval_years,
    earlyHits: production.early,
    crises: production.total_crises,
    hardFalseAlarmsPerYear: production.hard_fa_yr,
    occupancyPercent: production.occ,
    precisionPercent: production.precision,
    leadSessions: production.lead,
    utility: production.utility,
  });
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
  // The notebook is on the same page now, so it keeps the same rule.
  for (const pattern of instruction) assert.ok(!pattern.test(notebook), `the notebook: ${pattern}`);
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

test('the Tools tab shows the model’s reading from the published file, with nothing typed in', () => {
  const block = logic.slice(logic.indexOf('fragilityData: (() => {'), logic.indexOf('isToolsTabSim'));
  assert.ok(block.length > 0, 'the Tools tab’s data moved');
  const tabStart = template.indexOf('TAB 4: CRASH WARNING RESEARCH');
  const tab = template.slice(tabStart, template.indexOf('</section>', template.indexOf('fragilityData.researchOpenLabel')));
  assert.ok(tabStart > 0 && tab.length > 0, 'the Tools tab’s markup moved');
  assert.match(logic, /fetch\('backtest\/model_reading\.json'\)/);
  // Every figure on the card is read off the loaded file…
  for (const field of ['r.score', 'r.alertLine', 'r.egx30', 'r.engineInternal', 'r.engineExternal', 'r.stressGroups', 'r.stressGroupsOf',
    'r.transmission', 'v5.earlyHits', 'v5.crises', 'v5.hardFalseAlarmsPerYear', 'v5.occupancyPercent', 'v5.leadSessions',
    'v5.precisionPercent', 'v5.utility', 'v5.years']) {
    assert.ok(block.includes(field), `the Tools tab no longer reads ${field}`);
  }
  for (const binding of ['score', 'engineA', 'engineB', 'stressGroups', 'transmission', 'recall', 'hardFa', 'occupancy', 'lead', 'precision', 'utility']) {
    assert.ok(tab.includes(`{{ fragilityData.${binding} }}`), `the Tools tab no longer shows ${binding}`);
  }
  // …and none is typed, in the data or the markup. These are the 9 Sep run's
  // own figures as the card prints them, which is how they were typed before.
  for (const literal of ['0.45', '0.4528', '0.2505', '56,280', '15 / 17', '88.2', '11.49', '52.9', '16.0', '76.55', '0.93', '0.92', '1 / 7']) {
    assert.ok(!block.includes(literal), `logic.js types ${literal} into the Tools tab`);
    assert.ok(!tab.includes(literal), `template.html types ${literal} into the Tools tab`);
  }
  assert.match(block, /openFullHref: 'fragility'/);
  assert.match(block, /researchHref: 'fragility#research'/);
});

test('the research notebook gives no stance and calls no snapshot live', () => {
  for (const phrase of ['Recommended Stance', 'Capture Upside', 'Real-time tape', 'zero reason to panic', "shouldn't I just sell"]) {
    assert.ok(!notebook.includes(phrase), `the notebook still says "${phrase}"`);
  }
});

/* ── the full research, on the same page ────────────────────────────────── */

test('the full research sits below the account, outside what re-renders', () => {
  const rootAt = page.indexOf('<div id="fo-root">');
  const researchAt = page.indexOf('<section id="research"');
  const endAt = page.indexOf('<div id="fo-end">');
  assert.ok(rootAt >= 0 && researchAt > rootAt && endAt > researchAt, 'the account, then the research, then the sources');
  assert.match(page.slice(researchAt, page.indexOf('>', researchAt)), /class="fe-notebook" data-theme="light"/);
  assert.ok(page.includes('<link rel="stylesheet" href="./fragility-notebook.css">'));
  assert.ok(page.includes('mount(root, { series, episodes, attribution, reading }, { lang, end });'), 'the account renders into #fo-root and #fo-end');
  assert.ok(page.includes("get('backtest/model_reading.json').catch(() => null)"), 'the page does not read the daily reading, or cannot stand without it');
  const loader = page.slice(page.indexOf('async function loadResearch'));
  const inserted = loader.indexOf('research.innerHTML = await response.text();');
  const scripted = loader.indexOf("script.src = 'fragility-notebook.js';");
  assert.ok(loader.includes("fetch('fragility-notebook.html')"));
  assert.ok(inserted > 0 && scripted > inserted, 'the notebook’s script looks its elements up as it runs, so it must come after them');
});

test('every element the notebook’s script looks for is in its markup', () => {
  const wanted = new Set([...notebookJs.matchAll(/getElementById\(\s*['"]([\w-]+)['"]\s*\)/g)].map((x) => x[1]));
  const present = new Set([...notebookHtml.matchAll(/\bid="([\w-]+)"/g)].map((x) => x[1]));
  assert.ok(wanted.size > 100, `only ${wanted.size} ids: the script was cut short`);
  // Three gauges the notebook had stopped drawing before 16 Sep 2026. Its
  // script checks for each one before it writes to it.
  const retired = ['liveCatComm', 'liveCatRisk', 'liveEngineB'];
  assert.deepEqual([...wanted].filter((id) => !present.has(id)).sort(), retired);
});

test('opening the quantitative view draws the timeline it was hiding', () => {
  // The timeline sizes itself to its box, which is 0 by 0 while this view is
  // hidden, and redraws only on a resize.
  const setMode = notebookJs.slice(notebookJs.indexOf('function setPageMode'), notebookJs.indexOf('window.setPageMode'));
  const quant = setMode.slice(setMode.indexOf("if (mode === 'quant')"), setMode.indexOf('} else {'));
  assert.ok(quant.includes("window.dispatchEvent(new Event('resize'))"), 'the quantitative view opens with a blank timeline');
  assert.match(notebookJs, /window\.addEventListener\('resize', \(\) => drawTimeline\(\)\)/);
});

test('the notebook’s styles stop at the notebook', () => {
  const css = notebookCss.replace(/\/\*[\s\S]*?\*\//g, '');
  const selectors = [...css.matchAll(/([^{}@;]+)\{/g)]
    .flatMap((x) => x[1].split(','))
    .map((s) => s.trim())
    .filter((s) => s && !/^(from|to|\d+%)$/.test(s) && !/^(media|keyframes|supports)\b/.test(s));
  const loose = selectors.filter((s) => !/^([.#]|body\.mode-)/.test(s));
  assert.deepEqual(loose, [], 'a rule here would restyle the account above the notebook');
  assert.ok(!/(^|[\s,}]):root\b/.test(css), 'the notebook’s colours must resolve inside its light section, not at :root');
});

test('every jump from the account lands on a section of the notebook', () => {
  const targets = [...pageScript.matchAll(/(?:jump\(|href: )'#([\w-]+)'/g)].map((x) => x[1]);
  assert.ok(targets.length >= 7, `only ${targets.length} jumps found`);
  for (const id of targets) assert.ok(notebookHtml.includes(`id="${id}"`), `#${id} is not in the notebook`);
});

test('the old notebook address forwards to the research on the page', () => {
  assert.ok(oldAddress.includes('<meta http-equiv="refresh" content="0; url=fragility#research">'));
  assert.ok(oldAddress.includes("location.replace('fragility#research')"));
  assert.ok(oldAddress.length < 2000, 'the notebook is being kept in two places again');
});

test('the public copies of the research files are the published ones', async () => {
  // /data/v1/ is behind sign-in, so the page reads these; a rerun that
  // refreshes one and not the other would publish two different researches.
  for (const name of ['world_monitor_simulation_series.json', 'executed_trades_history.json', 'ladder_attribution_matrix.json', 'c_v2_alert_episodes.json', 'v5_simulation_series.json']) {
    assert.equal(await read(`public/esthmr/backtest/${name}`), await read(`public/data/v1/backtest/${name}`), name);
  }
});

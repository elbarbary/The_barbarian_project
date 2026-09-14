/* The scenario workbench: ask the models a question, see what they said.
 *
 * WHAT IS ON IT
 * Saved model output, and nothing generated on the screen. Every forecaster's
 * estimate for every company was sealed after the close; every re-rank
 * reading — Gemini reading those forecasts with a chosen combination of
 * filings, news, the rule book and measurements — was asked and sealed the
 * same night. Switching the evidence on or off selects a DIFFERENT sealed
 * reading, fetched when the question is run; it does not re-draw one answer.
 *
 * WHAT IT MUST NOT BECOME
 * Lists of companies are alphabetical, always. The warning comes before any
 * figure is built, per reader. Loading is shown only while a document is
 * actually on its way: there is no timer on this screen, because a progress
 * bar over data already in memory is theatre.
 *
 * Disclosure and gating are safeguards, not a determination of legality.
 */
import { React as R } from './react-shim.js';
import * as RB from './rulebook.js';
import { asRulebook } from './ask.js';
import {
  finite, percent, points, day, shortDay, cairoTime, nextRun, summaryOf,
} from './ai-visuals.js';
import {
  companyPicker, savedRulePicker, returnsResults, rerankResults,
} from './scenario-visuals.js';

const h = R.createElement;

export const ACCEPTED_KEY = 'esthmr:scenarios:accepted:';
const acceptKey = (email) => ACCEPTED_KEY + (email ? String(email).trim().toLowerCase() : 'guest');

export function hasAccepted(email) {
  try { return localStorage.getItem(acceptKey(email)) === '1'; } catch { return false; }
}
export function accept(email) {
  try { localStorage.setItem(acceptKey(email), '1'); } catch { /* the gate holds for this visit only */ }
}

/* ── the warning ────────────────────────────────────────────────────────── */

/* Derive sample and timestamp caveats from the actual published record. */
export function warningLines(top5, ar, run) {
  const t = (en, arabic) => (ar ? arabic : en);
  const sessions = (top5 && Array.isArray(top5.dates)) ? top5.dates.length : 0;
  const scored = Object.values(top5?.models || {}).filter((m) => m.group !== 'baseline')
    .map((m) => m.horizons?.['5']).filter((r) => r?.sessions > 0 && finite(r.meanAdvantage));
  const behind = scored.filter((r) => r.meanAdvantage < 0).length;
  return [
    t('These are outputs from experimental models, not forecasts this publisher endorses and not investment advice. ESTHMR is not licensed to advise on securities.',
      'هذه مخرجات نماذج تجريبية، وليست توقعات يتبنّاها هذا الناشر ولا نصيحة استثمارية. إسثمر غير مرخّص لتقديم المشورة في الأوراق المالية.'),
    t(`The published record covers ${sessions} evaluation dates, with different sample sizes per model and horizon. Historical testing is not live investment performance.`,
      `يغطي السجل المنشور ${sessions} تاريخ تقييم، بأحجام عيّنات مختلفة لكل نموذج وفترة. الاختبار التاريخي ليس أداء استثمار فعلي.`),
    scored.length ? t(`${behind} of ${scored.length} scored models lag their market benchmark over five sessions. Check the sample and the losses, not just the average.`,
      `${behind} من ${scored.length} نموذجاً مقيّماً أقل من السوق المقارن خلال خمس جلسات. راجع العيّنة والخسائر، لا المتوسط فقط.`)
      : t('There are no completed five-session scores yet. Missing results are not zero returns.', 'لا توجد نتائج مكتملة لفترة خمس جلسات بعد. النتيجة المفقودة ليست عائداً صفرياً.'),
    run?.commitment?.timestamped ? t('This run reports an independent timestamp. A timestamp helps check when a record existed; it does not make it right or prove predictive skill.', 'هذا التشغيل يحمل توثيقاً زمنياً مستقلاً بحسب سجله. يساعد التوثيق في التحقق من وقت وجود السجل، ولا يثبت صحة التوقع أو قدرته التنبؤية.')
      : t('Independent timestamp evidence is unavailable for this run. Do not assume these outputs were verified before trading.', 'لا يتوفر دليل توثيق زمني مستقل لهذا التشغيل. لا تفترض أن هذه المخرجات تحقّق منها قبل التداول.'),
  ];
}

/** The experiment warning, as a native modal: focus is held inside it and
 *  Escape works on every device without this file managing either. */
export function warningDialog(component, data, ar, { onAccept, onClose, closeLabel } = {}) {
  const t = (en, arabic) => (ar ? arabic : en);
  const reader = component._reader || null;
  const close = onClose || (() => component.setState({ screen: 'home' }));
  const dialog = h('dialog', {
    class: 'aix-dialog sc-gate', 'aria-modal': 'true', 'aria-labelledby': 'aix-warning-title',
    onCancel: (event) => { if (event && typeof event.preventDefault === 'function') event.preventDefault(); close(); },
  },
  h('div', { class: 'aix-dialog-card sc-gate-card' },
    h('span', { class: 'aix-beta is-static' }, h('i', { 'aria-hidden': 'true' }), t('BETA · AI SYSTEM', 'تجريبي · نظام ذكاء اصطناعي')),
    h('h2', { id: 'aix-warning-title' }, t('This is an experiment, not advice', 'هذه تجربة، وليست نصيحة')),
    h('p', null, t('We run public AI models against public EGX data and publish what they output, including when they are wrong. Nothing here is a recommendation to buy, sell or hold any security.',
      'نشغّل نماذج ذكاء اصطناعي على بيانات البورصة المصرية العامة وننشر ما تُخرجه، حتى حين تخطئ. لا شيء هنا توصية بشراء أو بيع أو الاحتفاظ بأي ورقة مالية.')),
    h('ul', { class: 'sc-gate-list' }, warningLines(data.top5, ar, data.scenarios).map((line, i) => h('li', { key: i }, line))),
    h('p', null, t('Anything you do with this is your own decision and your own risk.', 'أي قرار تتخذه بناءً على هذا قرارك وعلى مسؤوليتك.')),
    h('div', { class: 'aix-dialog-actions q-actions' },
      h('button', { type: 'button', class: 'aix-cta q-save', autofocus: true,
        onClick: () => {
          accept(reader);
          component.setState({ scAccepted: Date.now(), scAcceptedReader: reader, scWarning: false });
          if (onAccept) onAccept();
        } }, t('I understand — show me the models', 'فهمت — اعرض النماذج')),
      h('button', { type: 'button', class: 'aix-quiet q-cancel', onClick: close },
        closeLabel || t('Take me back', 'عُد بي')))));
  // Native modality supplies focus containment and Escape on touch/desktop.
  queueMicrotask(() => { if (dialog.isConnected && !dialog.open && typeof dialog.showModal === 'function') dialog.showModal(); });
  return dialog;
}

/* ── the question ───────────────────────────────────────────────────────── */

export const SUBJECT = [
  { id: 'market', en: 'The whole market', ar: 'السوق كله' },
  { id: 'picked', en: 'Companies I pick', ar: 'شركات أختارها' },
  { id: 'rule', en: 'Companies that pass a screen', ar: 'شركات تجتاز سؤالاً' },
];

const LAYER_TEXT = {
  filings: { en: 'Latest filings', ar: 'أحدث الإفصاحات', of: { en: 'filings', ar: 'الإفصاحات' } },
  news: { en: 'News flow', ar: 'تدفق الأخبار', of: { en: 'the news', ar: 'الأخبار' } },
  rulebook: { en: 'The rule book', ar: 'دليل التقييم', of: { en: 'the rule book', ar: 'دليل التقييم' } },
  measures: { en: 'Its own measurements', ar: 'قياساتها', of: { en: 'measurements', ar: 'القياسات' } },
};

/** The key a set of layers is filed under — the same spelling `rerank.py`
 *  seals it under, in the order the published document gives. */
export function readingKey(layers, order) {
  const chosen = new Set(layers || []);
  const ordered = (order || []).filter((layer) => chosen.has(layer));
  return ordered.length ? ordered.join('-') : 'models';
}

/** Models that published a return for companies. */
export function returnModels(scenarios) {
  return Object.entries((scenarios && scenarios.models) || {})
    .filter(([, m]) => m && m.returns)
    .map(([id, m]) => ({ id, label: m.label || id, labelAr: m.labelAr || m.label || id,
      group: m.group, distinguishes: m.distinguishes !== false }));
}

/** What the MODEL chips offer: the re-rank when there are readings, and every
 *  forecaster that published a return and tells companies apart. A ranking
 *  rule has no return to draw, and a model that says the same thing about
 *  every company has no scenario. */
export function drawableModels(scenarios) {
  const out = [];
  const readings = scenarios && scenarios.rerank && scenarios.rerank.readings;
  if (readings && Object.values(readings).some((r) => r && r.answered)) {
    out.push({ id: 'rerank', label: 'Gemini re-rank', labelAr: 'إعادة ترتيب Gemini', group: 'rerank' });
  }
  return out.concat(returnModels(scenarios).filter((m) => m.distinguishes));
}

/** Which companies the reader is asking about, and why that set. */
export function universeFor(state, scenarios, measures) {
  const all = Object.keys((scenarios && scenarios.companies) || {}).sort();
  if (state.scSubject === 'picked') {
    const chosen = state.scTickers || [];
    return { tickers: all.filter((t) => chosen.includes(t)), how: 'picked' };
  }
  if (state.scSubject === 'rule' && state.scRule && measures) {
    const out = RB.run(measures, asRulebook(state.scRule));
    const matched = new Set(out.results.map((r) => r.ticker));
    return { tickers: all.filter((t) => matched.has(t)), how: 'rule', result: out };
  }
  if (state.scSubject === 'rule') return { tickers: [], how: 'rule' };
  return { tickers: all, how: 'market' };
}

/** One model's view of a set of companies: every company, no cut, alphabetical. */
export function viewFor(tickers, scenarios, model, horizon) {
  const companies = (scenarios && scenarios.companies) || {};
  const rows = [];
  for (const ticker of tickers) {
    const company = companies[ticker];
    const entry = company && company.models && company.models[model];
    const value = entry && entry.returns ? entry.returns[String(horizon)] : undefined;
    rows.push({ ticker, close: company && company.close,
      value: finite(value) ? value : null,
      spread: spreadOf(company, horizon) });
  }
  const numbers = rows.map((r) => r.value).filter(finite);
  const middle = summaryOf(numbers);
  return {
    rows,
    answered: numbers.length,
    silent: rows.length - numbers.length,
    median: numbers.length ? middle.median : null,
    up: middle.up,
    down: middle.down,
  };
}

/** How far apart the models are on one company. */
export function spreadOf(company, horizon) {
  const models = (company && company.models) || {};
  const values = Object.values(models)
    .map((m) => m.returns && m.returns[String(horizon)])
    .filter(finite);
  if (values.length < 2) return null;
  return { low: Math.min(...values), high: Math.max(...values), models: values.length,
    agree: values.every((v) => v > 0) || values.every((v) => v < 0) };
}

/** The question as the controls currently ask it. */
export function draftOf(state, scenarios) {
  const models = drawableModels(scenarios).map((m) => m.id);
  const model = models.includes(state.scModel) ? state.scModel : (models[0] || null);
  const horizons = ((scenarios && scenarios.horizons) || [1, 5, 20]).map(Number);
  const horizon = horizons.includes(Number(state.scHorizon)) ? Number(state.scHorizon)
    : (horizons.includes(5) ? 5 : horizons[0]);
  const order = scenarios?.rerank?.layers || [];
  const layers = Array.isArray(state.scLayers)
    ? order.filter((l) => state.scLayers.includes(l))
    : order.filter((l) => (scenarios?.rerank?.default || []).includes(l));
  const subject = SUBJECT.some((s) => s.id === state.scSubject) ? state.scSubject : 'market';
  return {
    model, horizon, layers, subject,
    tickers: subject === 'picked' ? [...(state.scTickers || [])].sort() : [],
    rule: subject === 'rule' ? (state.scRule?.id || null) : null,
  };
}

const sameQuestion = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/* ── numbers for the answer ─────────────────────────────────────────────── */

function median(values) {
  return summaryOf(values).median;
}

/** What a selection did before the basis: the mean, session by session, of
 *  each company's move measured from its own basis close. */
export function pathOf(scenarios, tickers) {
  const dates = (scenarios && scenarios.dates) || [];
  if (!dates.length) return [];
  return dates.map((_, i) => {
    const values = tickers.map((t) => scenarios.companies?.[t]?.path?.[i]).filter(finite);
    return values.length ? values.reduce((s, v) => s + v, 0) / values.length : null;
  });
}

export function returnsView(scenarios, draft, tickers) {
  const horizons = ((scenarios && scenarios.horizons) || []).map(Number);
  const companies = scenarios.companies || {};
  const models = returnModels(scenarios);
  // A model that says the same about every company takes no side, so it is
  // not counted as agreeing or disagreeing and does not widen the range.
  const telling = models.filter((m) => m.distinguishes);
  const at = (ticker, model, hz) => companies[ticker]?.models?.[model]?.returns?.[String(hz)];
  const rows = tickers.map((ticker) => {
    const value = at(ticker, draft.model, draft.horizon);
    const all = telling.map((m) => at(ticker, m.id, draft.horizon)).filter(finite);
    const own = finite(value) ? Math.sign(value) : null;
    return {
      ticker,
      value: finite(value) ? value : null,
      low: all.length ? Math.min(...all) : null,
      high: all.length ? Math.max(...all) : null,
      agree: own === null ? 0 : all.filter((v) => Math.sign(v) === own).length,
      of: all.length,
    };
  });
  const ahead = {};
  for (const hz of horizons) {
    const values = tickers.map((t) => at(t, draft.model, hz)).filter(finite);
    if (values.length) ahead[hz] = summaryOf(values);
  }
  const byModel = models.map((m) => ({
    ...m, median: median(tickers.map((t) => at(t, m.id, draft.horizon)).filter(finite)),
  }));
  return {
    model: draft.model, horizons, rows, ahead,
    summary: summaryOf(rows.map((r) => r.value)),
    past: pathOf(scenarios, tickers),
    byModel,
    pointingUp: byModel.filter((m) => m.distinguishes && finite(m.median) && m.median > 0).length,
  };
}

/** Position of each company in a reading, 1 first; ties by ticker — the
 *  order the evaluation takes a reading's kept companies in. */
export function positions(scores) {
  const order = Object.keys(scores || {}).filter((t) => finite(scores[t]))
    .sort((a, b) => (scores[b] - scores[a]) || a.localeCompare(b));
  return Object.fromEntries(order.map((t, i) => [t, i + 1]));
}

/** Where each company stands, 1 first, with a tie sharing the average place.
 *
 *  For measuring MOVEMENT. On 14 September the default reading gave 182 of
 *  257 companies the same lowest score; placed alphabetically, those
 *  companies "moved" by nothing but the alphabet, and the count of companies
 *  the evidence moved was mostly an artefact of ticker order. */
export function standing(scores) {
  const tickers = Object.keys(scores || {}).filter((t) => finite(scores[t]));
  const r = ranks(tickers.map((t) => -scores[t]));
  return Object.fromEntries(tickers.map((t, i) => [t, r[i]]));
}

function ranks(values) {
  const order = values.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]);
  const out = new Array(values.length);
  for (let i = 0; i < order.length;) {
    let j = i;
    while (j + 1 < order.length && order[j + 1][0] === order[i][0]) j += 1;
    for (let k = i; k <= j; k += 1) out[order[k][1]] = (i + j) / 2 + 1;
    i = j + 1;
  }
  return out;
}

/** Spearman's rank correlation, or null where it is undefined. */
export function spearman(pairs) {
  const usable = pairs.filter(([a, b]) => finite(a) && finite(b));
  if (usable.length < 3) return null;
  const xs = ranks(usable.map((p) => p[0])), ys = ranks(usable.map((p) => p[1]));
  const n = usable.length;
  const mx = xs.reduce((s, v) => s + v, 0) / n, my = ys.reduce((s, v) => s + v, 0) / n;
  let top = 0, bx = 0, by = 0;
  for (let i = 0; i < n; i += 1) {
    top += (xs[i] - mx) * (ys[i] - my);
    bx += (xs[i] - mx) ** 2;
    by += (ys[i] - my) ** 2;
  }
  return bx && by ? top / Math.sqrt(bx * by) : null;
}

export function rerankView(scenarios, draft, tickers, reading, plainReading) {
  const scores = reading?.scores || {};
  const pos = positions(scores);
  const count = Number.isInteger(reading?.count) ? reading.count : null;
  const models = returnModels(scenarios).filter((m) => m.distinguishes);
  const consensus = (ticker) => median(models
    .map((m) => scenarios.companies?.[ticker]?.models?.[m.id]?.returns?.[String(draft.horizon)])
    .filter(finite));
  const plainScores = draft.layers.length ? (plainReading?.scores || {}) : null;
  const plainPos = plainScores ? positions(plainScores) : null;
  const here = standing(scores);
  const plainStanding = plainScores ? standing(plainScores) : null;
  const consensusScores = Object.fromEntries(Object.keys(scores).map((t) => [t, consensus(t)]));
  const consensusStanding = standing(consensusScores);

  const rows = tickers.map((ticker) => ({
    ticker,
    score: finite(scores[ticker]) ? scores[ticker] : null,
    position: pos[ticker] ?? null,
    standing: here[ticker] ?? null,
    shift: plainStanding && finite(here[ticker]) && finite(plainStanding[ticker])
      ? Math.round(plainStanding[ticker] - here[ticker]) : null,
    consensus: consensus(ticker),
  }));
  const inScope = rows.filter((r) => finite(r.score));
  const from = plainStanding || consensusStanding;
  const pairs = inScope.filter((r) => finite(from[r.ticker])).map((r) => ({ from: from[r.ticker], to: r.standing }));
  const kept = (p) => count !== null && p <= count;
  const plainCount = Number.isInteger(plainReading?.count) ? plainReading.count : null;
  const lowest = inScope.length ? Math.min(...inScope.map((r) => r.score)) : null;
  const threshold = count ? (() => {
    const order = Object.keys(pos).sort((a, b) => pos[a] - pos[b]);
    return order[count - 1] !== undefined ? scores[order[count - 1]] : null;
  })() : null;
  return {
    layers: draft.layers,
    answered: reading?.answered ?? 0,
    abstained: reading?.abstained ?? 0,
    invented: reading?.invented || [],
    note: reading?.note || null,
    count,
    threshold,
    keptInScope: inScope.filter((r) => kept(r.position)).length,
    rhoForecasters: spearman(inScope.map((r) => [r.score, r.consensus])),
    rhoModels: plainScores ? spearman(inScope.map((r) => [r.score, plainScores[r.ticker]])) : null,
    moved: plainStanding ? inScope.filter((r) => finite(plainStanding[r.ticker])
      && Math.abs(plainStanding[r.ticker] - r.standing) > 20).length : 0,
    // How many it put at the very bottom of its scale — said beside the
    // histogram, because a reading that sets most of the market aside reads
    // very differently from one that orders it, and one tall bar does not say
    // which. On 14 September the default reading gave 180 of 257 companies a
    // score between 2 and 4.
    setAside: inScope.filter((r) => r.score <= 5).length,
    lowest,
    keptChanged: plainPos && count !== null && plainCount !== null
      ? inScope.filter((r) => plainPos[r.ticker] && kept(r.position) !== (plainPos[r.ticker] <= plainCount)).length : 0,
    pairs,
    rows,
  };
}

/* ── running a question ─────────────────────────────────────────────────── */

function loadReading(component, data, key) {
  const held = data.readings && data.readings[key];
  if (held) return Promise.resolve(held);
  if (typeof component.loadReading === 'function') return component.loadReading(key);
  return Promise.reject(new Error('this reading is not available'));
}

/**
 * Apply the question. The only waiting on this screen is here, and it is the
 * wait for a document: a re-rank reading is fetched the first time a reader
 * asks for that combination of evidence. Every other step is arithmetic over
 * what is already loaded and completes before the browser paints.
 */
export async function runScenario(component, data, draft) {
  if (component.state.scRunning) return;
  const order = data.scenarios?.rerank?.layers || [];
  component.setState({ scRunning: true, scRunStep: 1, scRunError: null, scRunDraft: draft });
  try {
    component.setState({ scRunStep: 2 });
    if (draft.model === 'rerank') {
      component.setState({ scRunStep: 3 });
      const keys = [readingKey(draft.layers, order)];
      if (draft.layers.length) keys.push('models');
      await Promise.all(keys.map((key) => loadReading(component, data, key)));
    }
    component.setState({ scRunning: false, scRunStep: 4, scApplied: draft, scShowAll: false,
      // The screen the question was asked with, kept with it: changing the
      // saved question afterwards makes the answer stale, not different.
      scAppliedRule: draft.subject === 'rule' ? (component.state.scRule || null) : null });
  } catch (error) {
    component.setState({ scRunning: false, scRunStep: 0,
      scRunError: (error && error.message) || String(error) });
  }
}

/* ── the screen ─────────────────────────────────────────────────────────── */

const horizonWords = (n, ar) => (ar
  ? (n === 1 ? 'الجلسة التالية' : `${n} جلسة`)
  : (n === 1 ? 'next session' : `${n} sessions`));

export function scenariosScreen(component, data, ar) {
  const t = (en, arabic) => (ar ? arabic : en);
  const st = component.state;
  const reader = component._reader || null;
  const scenarios = data.scenarios || null;
  const top5 = data.top5 || null;
  const measures = data.measures || null;

  if (!hasAccepted(reader) && !(st.scAccepted && st.scAcceptedReader === reader)) {
    return { screen: h('div', { class: 'home-screen sc-screen aix-bench' }, warningDialog(component, data, ar)) };
  }

  if (!scenarios) {
    return { screen: h('div', { class: 'home-screen sc-screen aix-bench' },
      h('header', { class: 'aix-bench-head' }, h('h1', null, t('Scenario workbench', 'مختبر السيناريوهات'))),
      h('div', { class: 'sc-loading', role: 'status' },
        h('div', { class: 'sc-skeleton', 'aria-hidden': 'true' }),
        h('p', { class: 'aix-note' }, t('Loading the saved model run—not generating a new forecast.', 'جارٍ تحميل تشغيل النموذج المحفوظ، وليس إنشاء توقع جديد.'))),
      h('button', { type: 'button', class: 'aix-quiet', onClick: () => component.onRetryData?.() }, t('Retry loading', 'إعادة التحميل'))) };
  }

  const models = drawableModels(scenarios);
  const draft = draftOf(st, scenarios);
  const applied = st.scApplied || null;
  const stale = applied ? !sameQuestion(draft, applied) : false;
  const order = scenarios.rerank?.layers || [];
  const readings = scenarios.rerank?.readings || {};
  const shownDraft = applied || draft;

  // The first visit asks the question the controls start on. A forecaster's
  // answer is already here and is applied at once; a re-rank reading has to
  // be fetched, and that fetch is the loading state below — not a pause
  // added to look busy.
  if (!applied && !st.scRunning && !st.scRunError && draft.model) {
    queueMicrotask(() => runScenario(component, data, draft));
  }

  const picked = universeFor({ ...st, scSubject: shownDraft.subject,
    scTickers: shownDraft.subject === 'picked' ? shownDraft.tickers : st.scTickers,
    scRule: applied ? st.scAppliedRule : st.scRule }, scenarios, measures);
  const tickers = picked.tickers;
  // The figures, built only past the gate above and only for the question
  // that was actually run.
  const view = viewFor(tickers, scenarios, shownDraft.model, shownDraft.horizon);

  const set = (patch) => component.setState({ scRunError: null, ...patch });
  const chip = (label, on, onClick, key) => h('button', {
    key, type: 'button', class: on ? 'aix-chip on' : 'aix-chip', 'aria-pressed': String(on), onClick,
  }, label);

  const evidence = scenarios.rerank?.evidence || {};
  const hints = {
    filings: evidence.filings
      ? t(`${evidence.filings.items} filings, ${day(evidence.filings.from, false)} to ${day(evidence.filings.to, false)}`,
        `${evidence.filings.items} إفصاحاً، من ${day(evidence.filings.from, true)} إلى ${day(evidence.filings.to, true)}`)
      : t('as filed with the exchange', 'كما أُفصح للبورصة'),
    news: evidence.news
      ? t(`${evidence.news.items} headlines from the 48 hours before`, `${evidence.news.items} عنواناً من 48 ساعة قبلها`)
      : t('recent headlines naming companies', 'عناوين حديثة تذكر الشركات'),
    rulebook: t('how this project weighs EGX evidence', 'كيف يزن هذا المشروع أدلة البورصة'),
    measures: evidence.measures
      ? t(`ratios from filings, ${evidence.measures.companies} companies`, `نسب من الإفصاحات، ${evidence.measures.companies} شركة`)
      : t('ratios from filings', 'نسب من الإفصاحات'),
  };

  const rerankOn = draft.model === 'rerank';
  const draftKey = readingKey(draft.layers, order);
  const draftReading = readings[draftKey];

  const controls = h('aside', { class: 'aix-controls' },
    h('div', { class: 'aix-group' },
      h('p', { class: 'aix-step' }, h('b', null, '01'), t('ASK ABOUT', 'اسأل عن')),
      h('div', { class: 'aix-chips' }, SUBJECT.map((s) => chip(ar ? s.ar : s.en, draft.subject === s.id,
        () => set({ scSubject: s.id }), s.id))),
      draft.subject === 'picked' ? companyPicker(component, data, scenarios, ar) : null,
      draft.subject === 'rule' ? savedRulePicker(component, ar) : null),
    h('div', { class: 'aix-group' },
      h('p', { class: 'aix-step' }, h('b', null, '02'), t('MODEL', 'النموذج')),
      h('div', { class: 'aix-chips' }, models.map((m) => chip(ar ? m.labelAr : m.label, draft.model === m.id,
        () => set({ scModel: m.id }), m.id)))),
    h('div', { class: 'aix-group' },
      h('p', { class: 'aix-step' }, h('b', null, '03'), t('HORIZON', 'المدى')),
      h('div', { class: 'aix-chips' }, ((scenarios.horizons || []).map(Number)).map((n) => chip(horizonWords(n, ar),
        draft.horizon === n, () => set({ scHorizon: n }), n)))),
    order.length ? h('div', { class: `aix-group aix-layers${rerankOn ? '' : ' is-off'}` },
      h('p', { class: 'aix-step' }, h('b', null, '04'), t('CONTEXT THE RE-RANK READS', 'السياق الذي تقرؤه إعادة الترتيب')),
      order.map((layer) => {
        const on = draft.layers.includes(layer);
        return h('button', {
          key: layer, type: 'button', class: 'aix-toggle', role: 'switch', 'aria-checked': String(on),
          disabled: !rerankOn,
          onClick: () => set({ scLayers: on ? draft.layers.filter((l) => l !== layer) : [...draft.layers, layer] }),
        },
        h('span', null, h('strong', null, LAYER_TEXT[layer]?.[ar ? 'ar' : 'en'] || layer), h('small', null, hints[layer])),
        h('i', { class: 'aix-switch', 'aria-hidden': 'true' }, h('b')));
      }),
      !rerankOn ? h('p', { class: 'aix-note' }, t('Only the re-rank reads context. The forecasters read prices alone, so these switches do not change them.',
        'إعادة الترتيب وحدها تقرأ السياق. النماذج الأخرى تقرأ الأسعار فقط، فلا تغيّرها هذه المفاتيح.')) : null,
      rerankOn && draftReading && !draftReading.answered
        ? h('p', { class: 'aix-note aix-warn' }, t(`This combination did not answer tonight${draftReading.reason ? `: ${draftReading.reason}` : ''}.`,
          `هذه التركيبة لم تُجب الليلة${draftReading.reason ? `: ${draftReading.reason}` : ''}.`)) : null) : null,
    h('button', {
      type: 'button', class: `aix-run${stale && !st.scRunning ? ' is-stale' : ''}`,
      disabled: !!st.scRunning || !draft.model,
      onClick: () => runScenario(component, data, draft),
    }, st.scRunning ? t('Running…', 'جارٍ التشغيل…') : stale ? t('Run this scenario', 'شغّل هذا السيناريو') : t('Run again', 'شغّل مجدداً')));

  // ── the answer ──
  const modelMeta = models.find((m) => m.id === shownDraft.model);
  const modelName = modelMeta ? (ar ? modelMeta.labelAr : modelMeta.label) : '—';
  const scopeWords = shownDraft.subject === 'market' ? t('the whole market', 'السوق كله')
    : shownDraft.subject === 'picked' ? t(`the ${tickers.length} companies you picked`, `الشركات الـ${tickers.length} التي اخترتها`)
      : t(`the ${tickers.length} companies that pass your screen`, `الشركات الـ${tickers.length} التي تجتاز سؤالك`);
  const evidenceWords = shownDraft.layers.map((l) => LAYER_TEXT[l]?.of?.[ar ? 'ar' : 'en'] || l);
  const words = {
    model: modelName, scope: scopeWords, horizon: horizonWords(shownDraft.horizon, ar),
    evidence: evidenceWords.length > 1 ? `${evidenceWords.slice(0, -1).join(ar ? '، ' : ', ')}${ar ? ' و' : ' and '}${evidenceWords.at(-1)}` : (evidenceWords[0] || ''),
    read: shownDraft.layers.length
      ? t(`This reading read the forecasts with ${evidenceWords.join(', ')}.`, `قرأت هذه القراءة التوقعات مع ${evidenceWords.join('، ')}.`)
      : t('This reading read the forecasts and nothing else.', 'قرأت هذه القراءة التوقعات فقط.'),
  };

  let results;
  if (!tickers.length) {
    results = [h('section', { class: 'aix-card aix-empty-card' },
      h('h3', null, shownDraft.subject === 'picked' ? t('Pick companies to ask about', 'اختر شركات لتسأل عنها')
        : shownDraft.subject === 'rule' ? t('No company passes this screen — or none is chosen yet', 'لا شركة تجتاز هذا السؤال، أو لم يُختر سؤال')
          : t('No companies in tonight’s run', 'لا شركات في تشغيل الليلة')),
      h('p', null, t('Choose companies or a saved question on the left, then run the scenario.', 'اختر شركات أو سؤالاً محفوظاً، ثم شغّل السيناريو.')))];
  } else if (shownDraft.model === 'rerank') {
    const key = readingKey(shownDraft.layers, order);
    const reading = data.readings?.[key];
    const plainReading = data.readings?.models;
    if (reading) {
      results = rerankResults(component, data, rerankView(scenarios, shownDraft, tickers, reading, plainReading), words, ar);
    } else {
      results = [h('section', { class: 'aix-card aix-empty-card' },
        h('h3', null, t('Reading not loaded', 'القراءة غير محمّلة')),
        h('p', null, st.scRunError ? t(`It could not be fetched: ${st.scRunError}.`, `تعذر جلبها: ${st.scRunError}.`)
          : t('Run the scenario to fetch this reading.', 'شغّل السيناريو لجلب هذه القراءة.')))];
    }
  } else if (shownDraft.model) {
    results = returnsResults(component, data, returnsView(scenarios, shownDraft, tickers), words, ar);
  } else {
    results = [h('section', { class: 'aix-card aix-empty-card' }, h('h3', null, t('No model answered tonight', 'لم يُجب أي نموذج الليلة')))];
  }

  // The record of what is on screen, beside it: the reading's own if it is a
  // re-rank reading, the model's otherwise.
  const recordId = shownDraft.model === 'rerank' ? null : shownDraft.model;
  const record = recordId
    ? top5?.models?.[recordId]?.horizons?.[String(shownDraft.horizon)]
    : top5?.readings?.[readingKey(shownDraft.layers, order)]?.horizons?.[String(shownDraft.horizon)];
  const minimum = finite(top5?.minimumSessions) ? top5.minimumSessions : 1;
  const recordLine = h('p', { class: 'aix-record' },
    record && record.sessions >= minimum && finite(record.meanAdvantage)
      ? t(`Its record at this horizon: its five returned ${percent(record.meanReturn)} against ${percent(record.meanMarket)} for the market, ${points(record.meanAdvantage)}, ahead on ${record.ahead} of ${record.sessions} scored sessions.`,
        `سجله عند هذا المدى: أعلى خمس لديه ${percent(record.meanReturn)} مقابل ${percent(record.meanMarket)} للسوق، ${points(record.meanAdvantage)}، متقدماً في ${record.ahead} من ${record.sessions} جلسات مُقيَّمة.`)
      : t(`No record at this horizon yet: ${record?.sessions || 0} of ${minimum} sessions scored. What it says tonight has not been tested.`,
        `لا سجل عند هذا المدى بعد: ${record?.sessions || 0} من ${minimum} جلسات مُقيَّمة. ما يقوله الليلة لم يُختبر.`));

  const staleBar = stale && st.scApplied && !st.scRunning
    ? h('p', { class: 'aix-stale', role: 'status' }, t('You changed the question. Run it to redraw.', 'غيّرت السؤال. شغّله لإعادة الرسم.')) : null;

  const from = st.scFrom && st.scFrom !== shownDraft.model && top5?.models?.[st.scFrom] && !models.some((m) => m.id === st.scFrom)
    ? h('p', { class: 'aix-note aix-from' }, t(`${top5.models[st.scFrom].label} ranks companies without predicting a return, so it has no scenario to draw. Showing ${modelName}.`,
      `${top5.models[st.scFrom].labelAr || top5.models[st.scFrom].label} يرتّب الشركات دون توقع عائد، فلا سيناريو له. نعرض ${modelName}.`)) : null;

  // ── the wait, while there is one ──
  const runDraft = st.scRunDraft || draft;
  const estimateCount = runDraft.model === 'rerank'
    ? Object.keys(scenarios.companies || {}).length
    : tickers.length * Math.max(returnModels(scenarios).length, 1);
  const runEvidence = runDraft.layers.map((l) => LAYER_TEXT[l]?.of?.[ar ? 'ar' : 'en'] || l);
  const steps = [
    t(`reading the close of ${day(scenarios.basisSession, false)}`, `قراءة إغلاق ${day(scenarios.basisSession, true)}`),
    runDraft.model === 'rerank'
      ? t(`finding the re-rank’s scores for ${estimateCount} companies`, `إيجاد درجات إعادة الترتيب لـ${estimateCount} شركة`)
      : t(`pulling ${estimateCount} saved estimates`, `سحب ${estimateCount} تقديراً محفوظاً`),
    runDraft.model === 'rerank'
      ? (runEvidence.length ? t(`fetching the reading with ${runEvidence.join(', ')}`, `جلب القراءة مع ${runEvidence.join('، ')}`)
        : t('fetching the reading of the forecasts alone', 'جلب قراءة التوقعات وحدها'))
      : t('no evidence to fetch — the forecasters read prices only', 'لا أدلة للجلب — النماذج تقرأ الأسعار فقط'),
    t(`drawing ${tickers.length} companies`, `رسم ${tickers.length} شركة`),
  ];
  const loading = st.scRunning ? h('div', { class: 'aix-loading', role: 'status', 'aria-live': 'polite' },
    h('div', { class: 'aix-loading-card' },
      h('strong', null, t('Assembling the scenario', 'تجميع السيناريو')),
      h('p', null, t('Saved after the close — this is a read, not a new forecast.', 'محفوظ بعد الإغلاق — هذه قراءة، لا توقع جديد.')),
      h('div', { class: 'aix-loading-track' }, h('b', { style: `width:${Math.min(100, (st.scRunStep || 0) * 25)}%` })),
      h('ol', null, steps.map((label, i) => {
        const state = i + 1 < (st.scRunStep || 0) ? 'done' : i + 1 === (st.scRunStep || 0) ? 'now' : '';
        return h('li', { key: i, class: state }, h('i', { 'aria-hidden': 'true' }), label);
      })))) : null;

  const rerank = scenarios.rerank;
  const last = rerank ? cairoTime(rerank.ranAt, ar) : null;
  const next = cairoTime(nextRun(scenarios.schedule?.cron)?.toISOString(), ar);
  const commitment = scenarios.commitment || {};

  const screen = h('div', { class: 'home-screen sc-screen aix-bench' },
    h('header', { class: 'aix-bench-head' },
      h('div', { class: 'aix-bench-title' },
        h('button', { type: 'button', class: 'aix-back', onClick: () => component.setState({ screen: 'home' }) },
          ar ? '→ العودة إلى الصفحة الرئيسية' : '← BACK TO THE HOME PAGE'),
        h('div', { class: 'aix-bench-name' },
          h('h1', null, t('Scenario workbench', 'مختبر السيناريوهات')),
          h('button', { type: 'button', class: 'aix-beta', onClick: () => component.setState({ scWarning: true }) },
            h('i', { 'aria-hidden': 'true' }), t('BETA · READ THIS', 'تجريبي · اقرأ هذا'))),
        h('p', null, t(`Pick a model and a question. Everything here was computed after the close of ${day(scenarios.basisSession, false)}, as a percentage of that close.`,
          `اختر نموذجاً وسؤالاً. كل ما هنا حُسب بعد إغلاق ${day(scenarios.basisSession, true)}، كنسبة من ذلك الإغلاق.`))),
      h('dl', { class: 'aix-bench-clock' },
        h('dt', null, t('LAST RE-RANK', 'آخر إعادة ترتيب')),
        // The date and the time isolated from each other: an Arabic month
        // inside a left-to-right run pulls the digits after it out of order.
        h('dd', null, last ? [h('bdi', null, shortDay(last.date, ar)), ' · ', h('bdi', { dir: 'ltr' }, last.time)]
          : t('not read tonight', 'لم تُقرأ الليلة')),
        h('dt', null, t('NEXT SCHEDULED', 'الموعد التالي')),
        h('dd', null, next ? [h('bdi', null, shortDay(next.date, ar)), ' · ', h('bdi', { dir: 'ltr' }, next.time)] : '—'),
        h('small', null, t('Cairo time · after the close, runs can start late', 'بتوقيت القاهرة · بعد الإغلاق، وقد يتأخر التشغيل')))),
    h('div', { class: 'aix-bench-grid' },
      controls,
      h('div', { class: 'aix-results' },
        from, staleBar,
        st.scRunError && shownDraft.model !== 'rerank' ? h('p', { class: 'aix-note aix-warn' }, st.scRunError) : null,
        recordLine,
        ...results,
        loading)),
    h('footer', { class: 'sc-proof aix-proof' },
      h('details', null,
        h('summary', null, t('About this saved run & its timestamp', 'عن هذا التشغيل المحفوظ وتوثيقه الزمني')),
        h('p', { class: 'aix-note' }, t('A published timestamp can help verify when a record existed. It does not prove the forecast is accurate, that this screen matches the signed record, or that the service has regulatory approval.',
          'يساعد التوثيق الزمني المنشور في التحقق من وقت وجود سجل. لا يثبت صحة التوقع أو مطابقة هذه الشاشة للسجل الموقّع أو حصول الخدمة على موافقة تنظيمية.')),
        h('p', null, t('Timestamp reported: ', 'توثيق زمني مسجّل: ') + (commitment.timestamped ? (commitment.authority || t('Authority unspecified', 'الجهة غير محددة')) : t('Unavailable', 'غير متاح'))),
        h('p', null, t('Recorded before open: ', 'مسجل قبل الافتتاح: ') + (commitment.committedBeforeOpen === true ? t('Yes, according to the run metadata', 'نعم، بحسب بيانات التشغيل') : t('Not established', 'غير مثبت'))),
        h('code', { class: 'sc-root' }, commitment.merkleRoot || t('No commitment hash supplied', 'لم يُرفق رمز تحقق')),
        rerank?.commitment ? h('p', null, t('Re-rank readings sealed separately: ', 'قراءات إعادة الترتيب مختومة منفصلة: ')
          + (rerank.commitment.timestamped ? (rerank.commitment.authority || '—') : t('no timestamp', 'بلا توثيق'))) : null,
        rerank?.commitment?.merkleRoot ? h('code', { class: 'sc-root' }, rerank.commitment.merkleRoot) : null),
      h('button', { type: 'button', class: 'aix-quiet',
        onClick: () => { try { localStorage.removeItem(acceptKey(reader)); } catch { /* nothing stored */ } component.setState({ scAccepted: 0, scAcceptedReader: null }); } },
      t('Show the warning again', 'أظهر التحذير مجدداً'))),
    st.scWarning ? warningDialog(component, data, ar, { onClose: () => component.setState({ scWarning: false }), closeLabel: t('Close', 'إغلاق') }) : null);

  return { screen, view };
}

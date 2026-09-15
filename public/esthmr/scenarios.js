/* The scenario workbench: a model's ranking, and the same companies after
 * Gemini re-reads them.
 *
 * HOW A READER USES IT
 *   1. Choose a model — Kronos, Chronos, a momentum baseline — and see the
 *      companies it ranks highest, with what it predicts for each.
 *   2. Switch on what the Gemini re-rank reads — filings, news, the rule book,
 *      measurements — and see the ranking after Gemini has re-read every
 *      model's forecasts with it: the same table, re-ordered, with where the
 *      chosen model had each company.
 *
 * The results sit under two rules and never run together:
 *
 *   FUTURE · NOT SCORED YET     the newest run: the ranking, and the model's
 *                               forecast for the whole market;
 *   PAST RUNS · ALREADY SCORED  the record so far, night by night, and every
 *                               model against the market.
 *
 * WHAT IS ON IT
 * Saved model output, and nothing generated on the screen. Every model's
 * number for every company was sealed after the close; every combination of
 * Gemini's evidence was asked and sealed the same night. Switching evidence
 * selects a DIFFERENT sealed reading; it does not re-draw one answer. The five
 * at the top of each ranking are the five the record averages — the same rule,
 * ties by ticker, in `publish.ranked`.
 *
 * The warning comes before any figure is built, per reader. Loading is shown
 * only while a document is actually on its way: there is no timer here.
 *
 * Disclosure and gating are safeguards, not a determination of legality.
 */
import { React as R } from './react-shim.js';
import { finite, day, shortDay, cairoTime, nextRun, summaryOf } from './ai-visuals.js';
import {
  divider, viewSwitch, rankingTiles, rankingCard, returnsCards, recordCard, nightsCard,
} from './scenario-visuals.js';
import { modelsCard } from './ai-record.js';
import { readingProblem, mixedSnapshot } from './lab-snapshot.js';

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
    h('div', { class: 'aix-dialog-actions' },
      h('button', { type: 'button', class: 'aix-cta', autofocus: true,
        onClick: () => {
          accept(reader);
          component.setState({ scAccepted: Date.now(), scAcceptedReader: reader, scWarning: false });
          if (onAccept) onAccept();
        } }, t('I understand — show me the models', 'فهمت — اعرض النماذج')),
      h('button', { type: 'button', class: 'aix-quiet', onClick: close },
        closeLabel || t('Take me back', 'عُد بي')))));
  // Native modality supplies focus containment and Escape on touch/desktop.
  queueMicrotask(() => { if (dialog.isConnected && !dialog.open && typeof dialog.showModal === 'function') dialog.showModal(); });
  return dialog;
}

/* ── what the reader chooses ────────────────────────────────────────────── */

export const LAYER_TEXT = {
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

/** An instrument the feed names by its ISIN rather than an exchange ticker —
 *  `run.ISIN` in the lab, which no longer asks about or publishes them. Held
 *  here too, so a document written before that rule cannot put one back. */
const ISIN = /^[A-Z]{2}[A-Z0-9]{9}[0-9](-[A-Z]{3})?$/;
export const listed = (ticker) => typeof ticker === 'string' && ticker !== '' && !ISIN.test(ticker);

/** What a model's number is, from its name, where no document says — the
 *  rule `publish.says` writes into the picks file. */
export function saysOf(id) {
  if (id === 'rerank' || /^rerank:/.test(String(id))) return { kind: 'score', outOf: 100 };
  const m = /^(momentum|reversal)(\d+)$/.exec(String(id));
  return m ? { kind: m[1], sessions: Number(m[2]) } : { kind: 'return' };
}

/** The models a reader can rank by, in the record's order. The Gemini
 *  re-rank is not one of them: it is what the context switches turn on, over
 *  whichever model is chosen. A model that says the same about every company
 *  ranks nothing, and is not offered. */
export function baseModels(picks, scenarios) {
  const out = [];
  const seen = new Set();
  const add = (id, m, says) => {
    if (seen.has(id) || id === 'rerank') return;
    seen.add(id);
    out.push({ id, label: m.label || id, labelAr: m.labelAr || m.label || id, group: m.group || 'baseline', says });
  };
  for (const [id, m] of Object.entries((picks && picks.models) || {})) add(id, m, m.says || saysOf(id));
  for (const [id, m] of Object.entries((scenarios && scenarios.models) || {})) {
    if (m && m.distinguishes !== false) add(id, m, saysOf(id));
  }
  return out;
}

/** The layers in the order readings are filed under. */
function layerOrder(picks, scenarios) {
  if (scenarios?.rerank?.layers?.length) return scenarios.rerank.layers;
  return Object.values(picks?.readings || {}).map((r) => r.layers || [])
    .reduce((longest, layers) => (layers.length > longest.length ? layers : longest), []);
}

/** What the controls currently choose. There is nothing to "run": every
 *  choice is a published document, and the screen follows the controls.
 *
 *  `gemini` is on when any evidence is switched on. An older link that asked
 *  for the re-rank as a model opens on the reading Home reports. */
export function choiceOf(state, picks, scenarios) {
  const models = baseModels(picks, scenarios);
  const ids = models.map((m) => m.id);
  const model = ids.includes(state.scModel) ? state.scModel : (ids[0] || null);
  const horizons = ((picks && picks.horizons) || (scenarios && scenarios.horizons) || [1, 5, 20]).map(Number);
  const horizon = horizons.includes(Number(state.scHorizon)) ? Number(state.scHorizon)
    : (horizons.includes(5) ? 5 : horizons[0]);
  const order = layerOrder(picks, scenarios);
  const standard = scenarios?.rerank?.default
    || Object.values(picks?.readings || {}).find((r) => r && r.default)?.layers || [];
  const readable = order.length > 0 && (Object.keys(picks?.readings || {}).length > 0
    || Object.values(scenarios?.rerank?.readings || {}).some((r) => r && r.answered));
  const layers = !readable ? []
    : Array.isArray(state.scLayers) ? order.filter((l) => state.scLayers.includes(l))
      : state.scModel === 'rerank' ? order.filter((l) => standard.includes(l)) : [];
  return {
    model, horizon, horizons, layers, order, standard, readable, models,
    gemini: layers.length > 0,
    key: readingKey(layers, order),
    meta: models.find((m) => m.id === model) || null,
  };
}

/* ── the fives ──────────────────────────────────────────────────────────── */

/** The picks-file entry for what is on screen: the reading when Gemini is on,
 *  the chosen model otherwise. */
export function entryOf(picks, choice) {
  if (!picks) return null;
  if (choice.gemini) return picks.readings?.[choice.key] || null;
  return choice.model ? picks.models?.[choice.model] || null : null;
}

/** The newest five if it is still waiting on sessions that have not
 *  happened, and every night before it, newest first. */
export function nightsOf(entry, horizon) {
  const held = entry?.horizons?.[String(horizon)] || null;
  const nights = (held && held.nights) || [];
  const newest = nights[0] || null;
  const next = newest && newest.status === 'waiting' ? newest : null;
  return { newest, next, earlier: next ? nights.slice(1) : nights, older: (held && held.older) || 0, listed: nights.length };
}

const mean = (values) => values.reduce((s, v) => s + v, 0) / values.length;

/** The record at this horizon: how many nights were scored, how many were
 *  ahead, and — only past the record's own minimum — the averages.
 *
 *  From the list itself when the list is complete, so the nights on screen
 *  and the averages above them are one set; from the public record when older
 *  nights have been left off the list. */
export function recordOf(entry, horizon, source, minimumSessions) {
  const minimum = finite(minimumSessions) ? minimumSessions : 1;
  const held = entry?.horizons?.[String(horizon)];
  const scored = ((held && held.nights) || []).filter((n) => n.status === 'scored'
    && finite(n.chosenReturn) && finite(n.marketReturn) && finite(n.advantage));
  // Every scored pick on the list, for the share that finished above zero.
  const picked = scored.flatMap((n) => (n.picks || []).filter((p) => finite(p.returned)));
  const partial = !!(held && held.older > 0);
  let sessions = 0, ahead = 0, meanReturn = null, meanMarket = null, meanAdvantage = null, signChanges = 0;
  if (held && !partial) {
    sessions = scored.length;
    ahead = scored.filter((n) => n.advantage > 0).length;
    if (sessions) {
      meanReturn = mean(scored.map((n) => n.chosenReturn));
      meanMarket = mean(scored.map((n) => n.marketReturn));
      meanAdvantage = mean(scored.map((n) => n.advantage));
    }
    // Oldest first, the way the record counts a flip from one night to the next.
    const signs = scored.map((n) => n.advantage > 0).reverse();
    signChanges = signs.slice(1).filter((up, i) => up !== signs[i]).length;
  } else {
    const one = source?.horizons?.[String(horizon)] || {};
    sessions = finite(one.sessions) ? one.sessions : 0;
    ahead = finite(one.ahead) ? one.ahead : 0;
    meanReturn = finite(one.meanReturn) ? one.meanReturn : null;
    meanMarket = finite(one.meanMarket) ? one.meanMarket : null;
    meanAdvantage = finite(one.meanAdvantage) ? one.meanAdvantage : null;
    signChanges = finite(one.signChanges) ? one.signChanges : 0;
  }
  return { sessions, ahead, minimum, enough: sessions >= minimum && finite(meanAdvantage),
    meanReturn, meanMarket, meanAdvantage, signChanges,
    picksUp: picked.filter((p) => p.returned > 0).length, picksTotal: picked.length, partial };
}

/* ── the ranking ────────────────────────────────────────────────────────── */

/** Models that published a return for companies. */
export function returnModels(scenarios) {
  return Object.entries((scenarios && scenarios.models) || {})
    .filter(([, m]) => m && m.returns)
    .map(([id, m]) => ({ id, label: m.label || id, labelAr: m.labelAr || m.label || id,
      group: m.group, distinguishes: m.distinguishes !== false }));
}

/** What a model said about one company at a horizon: its ranking number where
 *  it ranks without a return, as the evaluation sorts it. */
export function saidOf(scenarios, model, horizon, ticker) {
  const entry = scenarios?.companies?.[ticker]?.models?.[model];
  const hz = String(horizon);
  if (finite(entry?.rankedBy?.[hz])) return entry.rankedBy[hz];
  return finite(entry?.returns?.[hz]) ? entry.returns[hz] : null;
}

/** Highest first; a tie settled by ticker, as the record settles it. */
const byValue = (a, b) => (b[0] - a[0]) || (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0);

/**
 * The ranking on screen: the chosen model's, or Gemini's re-reading of every
 * model's forecasts when evidence is switched on — every company, highest
 * first, with where the chosen model put it.
 */
export function rankingOf(scenarios, choice, reading) {
  const companies = (scenarios && scenarios.companies) || {};
  const base = Object.keys(companies).filter(listed)
    .map((ticker) => [saidOf(scenarios, choice.model, choice.horizon, ticker), ticker])
    .filter(([value]) => finite(value)).sort(byValue);
  const baseRank = new Map(base.map(([, ticker], i) => [ticker, i + 1]));
  const baseValue = new Map(base.map(([value, ticker]) => [ticker, value]));
  const frequencies = (rows) => {
    const counts = new Map();
    for (const [value] of rows) counts.set(value, (counts.get(value) || 0) + 1);
    return counts;
  };
  const baseFrequency = frequencies(base);
  const scores = (reading && reading.scores) || {};
  const order = choice.gemini
    ? Object.keys(scores).filter(listed).map((ticker) => [scores[ticker], ticker]).filter(([value]) => finite(value)).sort(byValue)
    : base;
  const scoreFrequency = frequencies(order);
  // How many of the other forecasters point the same way as the chosen one.
  const others = returnModels(scenarios).filter((m) => m.distinguishes && m.id !== choice.model);
  const says = saysOf(choice.model);
  const rows = order.map(([value, ticker], i) => {
    const own = baseValue.get(ticker);
    const votes = says.kind === 'return' && finite(own)
      ? others.map((m) => companies[ticker]?.models?.[m.id]?.returns?.[String(choice.horizon)]).filter(finite)
      : [];
    return {
      rank: i + 1, ticker, value,
      tied: i > 0 && order[i - 1][0] === value,
      baseRank: baseRank.get(ticker) ?? null,
      baseValue: finite(own) ? own : null,
      baseTied: (baseFrequency.get(own) || 0) > 1,
      scoreTied: (scoreFrequency.get(value) || 0) > 1,
      agree: votes.filter((v) => Math.sign(v) === Math.sign(own)).length,
      of: votes.length,
    };
  });
  return { rows, baseTotal: base.length, baseTop: base.slice(0, 5).map(([, ticker]) => ticker) };
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

/** A forecaster's view of the whole market, for the charts under the ranking. */
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

/** Where each company stands, 1 first, with a tie sharing the average place.
 *
 *  For measuring MOVEMENT. On 14 September the default reading gave 182 of
 *  257 companies the same lowest score; placed alphabetically, those
 *  companies "moved" by nothing but the alphabet. */
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

/* ── fetching a reading ─────────────────────────────────────────────────── */

/**
 * The only waiting on this screen: a re-rank reading's own document — its
 * score for every company — fetched the first time a reader switches to that
 * combination of evidence.
 */
export function ensureReadings(component, data, keys) {
  if (typeof component.loadReading !== 'function') return;
  const st = component.state;
  const missing = keys.filter((key) => !(data.readings && data.readings[key])
    && !(st.scLoading && st.scLoading[key]) && !(st.scFailed && st.scFailed[key]));
  if (!missing.length) return;
  const settle = (key, patch = {}) => {
    const { [key]: done, ...rest } = component.state.scLoading || {};
    component.setState({ scLoading: rest, ...patch });
  };
  queueMicrotask(() => {
    component.setState({ scLoading: { ...(component.state.scLoading || {}),
      ...Object.fromEntries(missing.map((key) => [key, true])) } });
    for (const key of missing) {
      Promise.resolve().then(() => component.loadReading(key)).then(
        () => settle(key),
        (error) => settle(key, { scFailed: { ...(component.state.scFailed || {}),
          [key]: (error && error.message) || String(error) } }));
    }
  });
}

/* ── the screen ─────────────────────────────────────────────────────────── */

/** "5 جلسات", "20 جلسة": Arabic counts agree with the noun. */
const sessionsAr = (n) => (n === 1 ? 'جلسة واحدة' : n === 2 ? 'جلستين' : n >= 3 && n <= 10 ? `${n} جلسات` : `${n} جلسة`);

export const horizonWords = (n, ar) => (ar
  ? (n === 1 ? 'الجلسة التالية' : sessionsAr(n))
  : (n === 1 ? 'the next session' : `${n} sessions`));

const chipWords = (n, ar) => (ar ? (n === 1 ? 'الجلسة التالية' : sessionsAr(n)) : (n === 1 ? 'next session' : `${n} sessions`));

/** What the chosen model's number is, in a sentence under the chips. */
function aboutModel(meta, ar) {
  const t = (en, arabic) => (ar ? arabic : en);
  const says = meta?.says || { kind: 'return' };
  const n = says.sessions;
  if (says.kind === 'momentum') {
    return t(`Makes no forecast. It ranks companies by how much they rose over the last ${n} sessions.`,
      `لا يتوقع شيئاً. يرتّب الشركات حسب ارتفاعها خلال آخر ${sessionsAr(n)}.`);
  }
  if (says.kind === 'reversal') {
    return t(n === 1
      ? 'Makes no forecast. It ranks companies by how much they fell in the last session, on the idea that what fell comes back.'
      : `Makes no forecast. It ranks companies by how much they fell over the last ${n} sessions, on the idea that what fell comes back.`,
    n === 1
      ? 'لا يتوقع شيئاً. يرتّب الشركات حسب هبوطها في الجلسة الأخيرة، على فكرة أن ما هبط يعود.'
      : `لا يتوقع شيئاً. يرتّب الشركات حسب هبوطها خلال آخر ${sessionsAr(n)}، على فكرة أن ما هبط يعود.`);
  }
  return t('Forecasts a return for every company and ranks them by it.', 'يتوقع عائداً لكل شركة ويرتّبها به.');
}

export function scenariosScreen(component, data, ar) {
  const t = (en, arabic) => (ar ? arabic : en);
  const st = component.state;
  const reader = component._reader || null;
  const scenarios = data.scenarios || null;
  const picks = data.picks || null;
  const top5 = data.top5 || null;

  if (!hasAccepted(reader) && !(st.scAccepted && st.scAcceptedReader === reader)) {
    return { screen: h('div', { class: 'home-screen sc-screen aix-bench' }, warningDialog(component, data, ar)) };
  }

  if (!scenarios && !picks) {
    return { screen: h('div', { class: 'home-screen sc-screen aix-bench' },
      h('header', { class: 'aix-bench-head' }, h('h1', null, t('Scenario workbench', 'مختبر السيناريوهات'))),
      h('div', { class: 'sc-loading', role: 'status' },
        h('div', { class: 'sc-skeleton', 'aria-hidden': 'true' }),
        h('p', { class: 'aix-note' }, t('Loading the saved model run—not generating a new forecast.', 'جارٍ تحميل تشغيل النموذج المحفوظ، وليس إنشاء توقع جديد.'))),
      h('button', { type: 'button', class: 'aix-quiet', onClick: () => component.onRetryData?.() }, t('Retry loading', 'إعادة التحميل'))) };
  }

  // The labelled signed-out demo intentionally has invented scenarios beside
  // the public real-world model record; it is not a live publication bundle.
  if (!data.demo && mixedSnapshot(scenarios, picks, top5)) {
    return { screen: h('section', { class: 'aix-card aix-bench' },
      h('h2', null, t('A newer saved run is arriving', 'جارٍ وصول تشغيل محفوظ أحدث')),
      h('p', null, t('The forecasts and their record came from different updates. Reload them together; no AI model will be run.',
        'وصلت التوقعات وسجل الأداء من تحديثين مختلفين. أعد تحميلهما معاً؛ لن نشغّل أي نموذج.')),
      h('button', { type: 'button', class: 'aix-quiet', onClick: () => component.onRetryData?.() },
        t('Reload saved results', 'إعادة تحميل النتائج المحفوظة'))) };
  }

  const choice = choiceOf(st, picks, scenarios);
  const { model, horizon, layers, order, gemini, key } = choice;
  const index = scenarios?.rerank?.readings || {};

  // The reading's own score for every company is the ranking when Gemini is
  // on; it is fetched the first time that combination is switched on.
  if (gemini) ensureReadings(component, data, [key]);

  const entry = entryOf(picks, choice);
  const nights = nightsOf(entry, horizon);
  const source = gemini ? top5?.readings?.[key] : top5?.models?.[model];
  const record = recordOf(entry, horizon, source, picks?.minimumSessions ?? top5?.minimumSessions);
  const said = gemini && scenarios?.basisSession ? picks?.readings?.[key]?.notes?.[scenarios.basisSession] || null : null;
  const loadedReading = gemini ? data.readings?.[key] || null : null;
  const readingIssue = readingProblem(loadedReading, scenarios, key);
  const reading = readingIssue ? null : loadedReading;
  const next = cairoTime(nextRun(scenarios?.schedule?.cron)?.toISOString(), ar);

  const set = (patch) => component.setState({ scShowAll: false, scNightsAll: false, ...patch });
  const chip = (label, on, onClick, id) => h('button', {
    key: id, type: 'button', class: on ? 'aix-chip on' : 'aix-chip', 'aria-pressed': String(on), onClick,
  }, label);

  const evidence = scenarios?.rerank?.evidence || {};
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
  const indexed = index[key];
  const modelName = choice.meta ? (ar ? choice.meta.labelAr : choice.meta.label) : '—';

  const controls = h('aside', { class: 'aix-controls' },
    h('div', { class: 'aix-group' },
      h('p', { class: 'aix-step' }, h('b', null, '01'), t('CHOOSE A MODEL', 'اختر نموذجاً')),
      h('div', { class: 'aix-chips' }, choice.models.map((m) => chip(ar ? m.labelAr : m.label, model === m.id,
        () => set({ scModel: m.id, scFrom: null }), m.id))),
      choice.meta ? h('p', { class: 'aix-note aix-model-about' }, aboutModel(choice.meta, ar)) : null),
    h('div', { class: 'aix-group' },
      h('p', { class: 'aix-step' }, h('b', null, '02'), t('HORIZON', 'المدى')),
      h('div', { class: 'aix-chips' }, choice.horizons.map((n) => chip(chipWords(n, ar),
        horizon === n, () => set({ scHorizon: n }), n)))),
    order.length ? h('div', { class: `aix-group aix-layers${gemini ? ' is-on' : ''}` },
      h('p', { class: 'aix-step' }, h('b', null, '03'), t('CONTEXT THE RE-RANK READS', 'السياق الذي تقرؤه إعادة الترتيب')),
      h('p', { class: 'aix-note aix-layers-lead' }, choice.readable
        ? (gemini
          ? t(`Showing Gemini’s saved ranking. It combines all models with the selected evidence; ${modelName} remains the comparison. Turn everything off for the model’s original order.`,
            `نعرض ترتيب Gemini المحفوظ. يجمع كل النماذج مع الأدلة المختارة؛ ويظل ${modelName} مرجع المقارنة. أوقف الخيارات لترى ترتيب النموذج الأصلي.`)
          : t(`Switch any of these on to see the ranking after Gemini re-reads the models’ forecasts with it.`,
            'فعّل أياً منها لترى الترتيب بعد أن يعيد Gemini قراءة توقعات النماذج معه.'))
        : t('No Gemini re-rank was published for this run.', 'لم تُنشر إعادة ترتيب Gemini لهذا التشغيل.')),
      order.map((layer) => {
        const on = layers.includes(layer);
        return h('button', {
          key: layer, type: 'button', class: 'aix-toggle', role: 'switch', 'aria-checked': String(on),
          disabled: !choice.readable,
          onClick: () => set({ scLayers: on ? layers.filter((l) => l !== layer) : [...layers, layer] }),
        },
        h('span', null, h('strong', null, LAYER_TEXT[layer]?.[ar ? 'ar' : 'en'] || layer), h('small', null, hints[layer])),
        h('i', { class: 'aix-switch', 'aria-hidden': 'true' }, h('b')));
      }),
      gemini && indexed && !indexed.answered
        ? h('p', { class: 'aix-note aix-warn' }, t(`This combination did not answer that night${indexed.reason ? `: ${indexed.reason}` : ''}.`,
          `هذه التركيبة لم تُجب تلك الليلة${indexed.reason ? `: ${indexed.reason}` : ''}.`)) : null) : null);

  const evidenceWords = layers.map((l) => LAYER_TEXT[l]?.of?.[ar ? 'ar' : 'en'] || l);
  const words = {
    model: modelName, horizon: horizonWords(horizon, ar),
    evidence: evidenceWords.length > 1 ? `${evidenceWords.slice(0, -1).join(ar ? '، ' : ', ')}${ar ? ' و' : ' and '}${evidenceWords.at(-1)}` : (evidenceWords[0] || ''),
    view: gemini ? t(`Gemini re-rank with ${evidenceWords.length > 1 ? `${evidenceWords.slice(0, -1).join(', ')} and ${evidenceWords.at(-1)}` : (evidenceWords[0] || '')}`,
      `إعادة ترتيب Gemini مع ${evidenceWords.join('، ')}`) : modelName,
  };
  const ranking = scenarios ? rankingOf(scenarios, choice, reading) : null;
  const ctx = {
    choice, entry, nights, record, said, words, next, indexed, ranking, reading,
    // What the numbers in the past runs are: Gemini's scores when it is on.
    says: gemini ? saysOf('rerank') : (choice.meta?.says || { kind: 'return' }),
    topCount: picks?.topCount ?? top5?.topCount ?? 5,
    // Answered that night, but not ranked: no exchange ticker, or recent
    // closes with a long gap or a move no daily limit allows (`run.unreadable`).
    leftOut: Object.keys(scenarios?.leftOut || {}).length,
    loading: !picks && !!st.extrasLoading,
    readingLoading: gemini && !reading && !!(st.scLoading && st.scLoading[key]),
    readingFailed: readingIssue
      ? t('This reading belongs to another update or has invalid scores. Reload the saved results together.',
        'هذه القراءة من تحديث آخر أو بها درجات غير صالحة. أعد تحميل النتائج المحفوظة معاً.')
      : gemini && !reading ? (st.scFailed && st.scFailed[key]) || null : null,
    // A reading from another update is not fetched again on its own: the
    // whole saved run is, so the two cannot stay mismatched.
    retry: () => {
      if (readingIssue) { component.onRetryData?.(); return; }
      const { [key]: gone, ...rest } = st.scFailed || {};
      component.setState({ scFailed: rest });
    },
  };

  // The whole market as the chosen forecaster sees it, under its ranking.
  const tickers = Object.keys((scenarios && scenarios.companies) || {}).filter(listed).sort();
  const charts = scenarios && model && returnModels(scenarios).some((m) => m.id === model)
    ? returnsCards(component, data, returnsView(scenarios, choice, tickers), words, ar) : [];

  const from = st.scFrom && st.scFrom !== model && st.scFrom !== 'rerank' && top5?.models?.[st.scFrom] && !choice.models.some((m) => m.id === st.scFrom)
    ? h('p', { class: 'aix-note aix-from' }, t(`${top5.models[st.scFrom].label} ranks nothing of its own to show, so the workbench shows ${modelName}.`,
      `${top5.models[st.scFrom].labelAr || top5.models[st.scFrom].label} ليس لديه ترتيب خاص به، فيعرض المختبر ${modelName}.`)) : null;

  const rerank = scenarios?.rerank;
  const last = rerank ? cairoTime(rerank.ranAt, ar) : null;
  const commitment = scenarios?.commitment || {};
  const basis = scenarios?.basisSession || nights.newest?.basisSession;

  const screen = h('div', { class: 'home-screen sc-screen aix-bench' },
    h('header', { class: 'aix-bench-head' },
      h('div', { class: 'aix-bench-title' },
        h('button', { type: 'button', class: 'aix-back', onClick: () => component.setState({ screen: 'home' }) },
          ar ? '→ العودة إلى الصفحة الرئيسية' : '← BACK TO THE HOME PAGE'),
        h('div', { class: 'aix-bench-name' },
          h('h1', null, t('Scenario workbench', 'مختبر السيناريوهات')),
          h('button', { type: 'button', class: 'aix-beta', onClick: () => component.setState({ scWarning: true }) },
            h('i', { 'aria-hidden': 'true' }), t('BETA · READ THIS', 'تجريبي · اقرأ هذا'))),
        h('p', null, t(`Choose a model to see the companies it ranks highest and what it predicts for them. Switch on what Gemini reads to see the same companies after Gemini re-ranks them. Future is from the close${basis ? ` of ${day(basis, false)}` : ''} and not scored yet; past runs already are.`,
          `اختر نموذجاً لترى الشركات التي يضعها في المقدمة وما يتوقعه لها. فعّل ما يقرؤه Gemini لترى الشركات نفسها بعد أن يعيد ترتيبها. «المستقبل» من إغلاق${basis ? ` ${day(basis, true)}` : ''} ولم يُقيَّم بعد؛ و«التشغيلات السابقة» قُيّمت بالفعل.`))),
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
        from,
        divider('aix-future', t('FUTURE · NOT SCORED YET', 'المستقبل · لم يُقيَّم بعد'),
          basis ? t(`computed after the close of ${day(basis, false)}`, `حُسب بعد إغلاق ${day(basis, true)}`) : null),
        viewSwitch(component, ctx, ar),
        rankingTiles(ctx, ar),
        rankingCard(component, data, ctx, ar),
        ...charts,
        divider('aix-past', t('PAST RUNS · ALREADY SCORED', 'تشغيلات سابقة · قُيّمت بالفعل'),
          t('sessions that have closed', 'جلسات أُغلقت')),
        recordCard(component, data, ctx, ar),
        nightsCard(component, data, ctx, ar),
        // With Gemini on, its row is the reading on screen, not the default one.
        modelsCard(gemini && top5?.readings?.[key]
          ? { ...top5, models: { ...top5.models,
            rerank: { ...top5.readings[key], group: 'rerank', label: 'Gemini · selected context', labelAr: 'Gemini · السياق المختار' } } }
          : top5,
        ar, { horizon, selected: gemini ? 'rerank' : model,
          onPick: (id) => (id === 'rerank'
            ? set({ scLayers: layers.length ? layers : choice.standard, scFocus: 'future' })
            : set({ scModel: id, scLayers: [], scFrom: null, scFocus: 'future' })),
          onWindow: (n) => set({ scHorizon: n }) }))),
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

  // Where a way in asked to land: "See what they returned" on Home opens the
  // past runs; picking a model at the foot of the page loads it at the top.
  if (st.scFocus) {
    const target = st.scFocus === 'past' ? 'aix-past' : 'aix-future';
    queueMicrotask(() => {
      const el = typeof document !== 'undefined' && typeof document.getElementById === 'function'
        ? document.getElementById(target) : null;
      if (el && el.isConnected !== false && typeof el.scrollIntoView === 'function') el.scrollIntoView({ block: 'start', behavior: 'smooth' });
      component.setState({ scFocus: null });
    });
  }

  return { screen, choice };
}

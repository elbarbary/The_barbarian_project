/* The scenario workbench: what each model picked, and what its picks did.
 *
 * WHAT IS ON IT
 * Saved model output, and nothing generated on the screen. Every night after
 * the close each model — and each re-rank reading, Gemini reading those
 * forecasts with a chosen combination of filings, news, the rule book and
 * measurements — puts five companies highest. The screen shows two things and
 * never lets them run together:
 *
 *   NEXT      the newest five, waiting on sessions that have not happened;
 *   SO FAR    the earlier fives, each beside what it went on to return.
 *
 * Both come from `lab/picks.json`, built by the code that builds the public
 * record, so the five named here are the five the record averages. Switching
 * the evidence on or off selects a DIFFERENT sealed reading; it does not
 * re-draw one answer.
 *
 * WHAT IT MUST NOT BECOME
 * Lists of companies are alphabetical, always — the five included: the record
 * weighs them equally, and a numbered five would be a ranking this publisher
 * made. The warning comes before any figure is built, per reader. Loading is
 * shown only while a document is actually on its way: there is no timer on
 * this screen, because a progress bar over data already in memory is theatre.
 *
 * Disclosure and gating are safeguards, not a determination of legality.
 */
import { React as R } from './react-shim.js';
import { finite, day, shortDay, cairoTime, nextRun, summaryOf } from './ai-visuals.js';
import {
  nextCard, recordCard, returnsCards, rerankCards, companiesCard,
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

/** What a model's number is, from its name, where no document says — the
 *  rule `publish.says` writes into the picks file. */
export function saysOf(id) {
  if (id === 'rerank' || /^rerank:/.test(String(id))) return { kind: 'score', outOf: 100 };
  const m = /^(momentum|reversal)(\d+)$/.exec(String(id));
  return m ? { kind: m[1], sessions: Number(m[2]) } : { kind: 'return' };
}

/** The models a reader can choose, in the record's order: the re-rank first
 *  when there are readings, then every model with a five of its own. A model
 *  that says the same about every company has no five, and is not offered. */
export function choosableModels(picks, scenarios, top5) {
  const out = [];
  const readings = Object.values((picks && picks.readings) || {});
  const answered = Object.values(scenarios?.rerank?.readings || {}).some((r) => r && r.answered);
  if (readings.length || answered) {
    const named = readings.find((r) => r && r.default) || top5?.models?.rerank || {};
    out.push({ id: 'rerank', label: named.label || 'Gemini re-rank',
      labelAr: named.labelAr || named.label || 'إعادة ترتيب Gemini', group: 'rerank', says: saysOf('rerank') });
  }
  const seen = new Set(out.map((m) => m.id));
  const add = (id, m, says) => {
    if (seen.has(id)) return;
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
 *  choice is a published document, and the screen follows the controls. */
export function choiceOf(state, picks, scenarios, top5) {
  const models = choosableModels(picks, scenarios, top5);
  const ids = models.map((m) => m.id);
  const model = ids.includes(state.scModel) ? state.scModel : (ids[0] || null);
  const horizons = ((picks && picks.horizons) || (scenarios && scenarios.horizons) || [1, 5, 20]).map(Number);
  const horizon = horizons.includes(Number(state.scHorizon)) ? Number(state.scHorizon)
    : (horizons.includes(5) ? 5 : horizons[0]);
  const order = layerOrder(picks, scenarios);
  const standard = scenarios?.rerank?.default
    || Object.values(picks?.readings || {}).find((r) => r && r.default)?.layers || [];
  const layers = Array.isArray(state.scLayers)
    ? order.filter((l) => state.scLayers.includes(l))
    : order.filter((l) => standard.includes(l));
  return { model, horizon, horizons, layers, order, models, meta: models.find((m) => m.id === model) || null };
}

/* ── the fives ──────────────────────────────────────────────────────────── */

/** The chosen model's (or reading's) entry in the picks file. */
export function entryOf(picks, choice) {
  if (!picks || !choice.model) return null;
  if (choice.model === 'rerank') return picks.readings?.[readingKey(choice.layers, choice.order)] || null;
  return picks.models?.[choice.model] || null;
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
  let sessions = 0, ahead = 0, meanReturn = null, meanMarket = null, meanAdvantage = null;
  if (held && !(held.older > 0)) {
    const scored = (held.nights || []).filter((n) => n.status === 'scored'
      && finite(n.chosenReturn) && finite(n.marketReturn) && finite(n.advantage));
    sessions = scored.length;
    ahead = scored.filter((n) => n.advantage > 0).length;
    if (sessions) {
      meanReturn = mean(scored.map((n) => n.chosenReturn));
      meanMarket = mean(scored.map((n) => n.marketReturn));
      meanAdvantage = mean(scored.map((n) => n.advantage));
    }
  } else {
    const one = source?.horizons?.[String(horizon)] || {};
    sessions = finite(one.sessions) ? one.sessions : 0;
    ahead = finite(one.ahead) ? one.ahead : 0;
    meanReturn = finite(one.meanReturn) ? one.meanReturn : null;
    meanMarket = finite(one.meanMarket) ? one.meanMarket : null;
    meanAdvantage = finite(one.meanAdvantage) ? one.meanAdvantage : null;
  }
  return { sessions, ahead, minimum, enough: sessions >= minimum && finite(meanAdvantage),
    meanReturn, meanMarket, meanAdvantage };
}

/* ── every company behind the five ──────────────────────────────────────── */

/** Models that published a return for companies. */
export function returnModels(scenarios) {
  return Object.entries((scenarios && scenarios.models) || {})
    .filter(([, m]) => m && m.returns)
    .map(([id, m]) => ({ id, label: m.label || id, labelAr: m.labelAr || m.label || id,
      group: m.group, distinguishes: m.distinguishes !== false }));
}

/** What the chosen model said about one company at this horizon: its ranking
 *  number where it ranks without a return, as the evaluation sorts it. */
export function saidOf(scenarios, reading, choice, ticker) {
  if (choice.model === 'rerank') {
    const score = reading?.scores?.[ticker];
    return finite(score) ? score : null;
  }
  const entry = scenarios?.companies?.[ticker]?.models?.[choice.model];
  const hz = String(choice.horizon);
  if (finite(entry?.rankedBy?.[hz])) return entry.rankedBy[hz];
  return finite(entry?.returns?.[hz]) ? entry.returns[hz] : null;
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
    .sort((a, b) => (scores[b] - scores[a]) || (a < b ? -1 : a > b ? 1 : 0));
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
    pairs,
    rows,
  };
}

/* ── fetching a reading ─────────────────────────────────────────────────── */

/**
 * The only waiting on this screen: a re-rank reading's own document — its
 * score for every company — fetched the first time a reader switches to that
 * combination of evidence. The five and the record are already here, so they
 * never wait on it.
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

const chipWords = (n, ar) => (ar ? sessionsAr(n) : (n === 1 ? '1 session' : `${n} sessions`));

/** What the chosen model's number is, in a sentence under the chips. */
function aboutModel(meta, ar) {
  const t = (en, arabic) => (ar ? arabic : en);
  const says = meta?.says || { kind: 'return' };
  const n = says.sessions;
  if (says.kind === 'score') {
    return t('Gemini reads the other models’ forecasts, with the evidence switched on below, and scores every company out of 100. Its five are its highest scores.',
      'يقرأ Gemini توقعات النماذج الأخرى مع الأدلة المفعّلة أدناه، ويعطي كل شركة درجة من 100. اختياراته الخمسة أعلى درجاته.');
  }
  if (says.kind === 'momentum') {
    return t(`Makes no forecast. It ranks companies by how much they rose over the last ${n} sessions; its five rose the most.`,
      `لا يتوقع شيئاً. يرتّب الشركات حسب ارتفاعها خلال آخر ${sessionsAr(n)}؛ اختياراته الخمسة الأكثر ارتفاعاً.`);
  }
  if (says.kind === 'reversal') {
    return t(n === 1
      ? 'Makes no forecast. It ranks companies by how much they fell in the last session, on the idea that what fell comes back; its five fell the most.'
      : `Makes no forecast. It ranks companies by how much they fell over the last ${n} sessions, on the idea that what fell comes back; its five fell the most.`,
    n === 1
      ? 'لا يتوقع شيئاً. يرتّب الشركات حسب هبوطها في الجلسة الأخيرة، على فكرة أن ما هبط يعود؛ اختياراته الخمسة الأكثر هبوطاً.'
      : `لا يتوقع شيئاً. يرتّب الشركات حسب هبوطها خلال آخر ${sessionsAr(n)}، على فكرة أن ما هبط يعود؛ اختياراته الخمسة الأكثر هبوطاً.`);
  }
  return t('Forecasts a return for every company. Its five are its highest forecasts.',
    'يتوقع عائداً لكل شركة. اختياراته الخمسة أعلى توقعاته.');
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

  const choice = choiceOf(st, picks, scenarios, top5);
  const { model, horizon, layers, order } = choice;
  const rerankOn = model === 'rerank';
  const key = readingKey(layers, order);
  const index = scenarios?.rerank?.readings || {};

  // The five and the record are in the picks file. What is fetched is the
  // reading's own score for every company, for the list behind the five —
  // and, with evidence switched on, the forecasts-alone reading it is
  // compared with.
  if (rerankOn) ensureReadings(component, data, layers.length ? [key, 'models'] : [key]);

  const entry = entryOf(picks, choice);
  const nights = nightsOf(entry, horizon);
  const source = rerankOn ? top5?.readings?.[key] : top5?.models?.[model];
  const record = recordOf(entry, horizon, source, picks?.minimumSessions ?? top5?.minimumSessions);
  const plainEntry = rerankOn && layers.length ? picks?.readings?.models : null;
  const said = rerankOn && nights.newest ? entry?.notes?.[nights.newest.basisSession] || null : null;
  const reading = rerankOn ? data.readings?.[key] || null : null;
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

  const controls = h('aside', { class: 'aix-controls' },
    h('div', { class: 'aix-group' },
      h('p', { class: 'aix-step' }, h('b', null, '01'), t('MODEL', 'النموذج')),
      h('div', { class: 'aix-chips' }, choice.models.map((m) => chip(ar ? m.labelAr : m.label, model === m.id,
        () => set({ scModel: m.id, scFrom: null }), m.id))),
      choice.meta ? h('p', { class: 'aix-note aix-model-about' }, aboutModel(choice.meta, ar)) : null),
    h('div', { class: 'aix-group' },
      h('p', { class: 'aix-step' }, h('b', null, '02'), t('MEASURED OVER', 'مدة القياس')),
      h('div', { class: 'aix-chips' }, choice.horizons.map((n) => chip(chipWords(n, ar),
        horizon === n, () => set({ scHorizon: n }), n)))),
    order.length ? h('div', { class: `aix-group aix-layers${rerankOn ? '' : ' is-off'}` },
      h('p', { class: 'aix-step' }, h('b', null, '03'), t('WHAT THE RE-RANK READS', 'ما تقرؤه إعادة الترتيب')),
      order.map((layer) => {
        const on = layers.includes(layer);
        return h('button', {
          key: layer, type: 'button', class: 'aix-toggle', role: 'switch', 'aria-checked': String(on),
          disabled: !rerankOn,
          onClick: () => set({ scLayers: on ? layers.filter((l) => l !== layer) : [...layers, layer] }),
        },
        h('span', null, h('strong', null, LAYER_TEXT[layer]?.[ar ? 'ar' : 'en'] || layer), h('small', null, hints[layer])),
        h('i', { class: 'aix-switch', 'aria-hidden': 'true' }, h('b')));
      }),
      !rerankOn ? h('p', { class: 'aix-note' }, t('Only the re-rank reads these. The other models read prices alone, so the switches do not change them.',
        'إعادة الترتيب وحدها تقرأ هذه. النماذج الأخرى تقرأ الأسعار فقط، فلا تغيّرها المفاتيح.')) : null,
      rerankOn && indexed && !indexed.answered
        ? h('p', { class: 'aix-note aix-warn' }, t(`This combination did not answer that night${indexed.reason ? `: ${indexed.reason}` : ''}.`,
          `هذه التركيبة لم تُجب تلك الليلة${indexed.reason ? `: ${indexed.reason}` : ''}.`)) : null) : null);

  const modelName = choice.meta ? (ar ? choice.meta.labelAr : choice.meta.label) : '—';
  const evidenceWords = layers.map((l) => LAYER_TEXT[l]?.of?.[ar ? 'ar' : 'en'] || l);
  const words = {
    model: modelName, scope: t('the whole market', 'السوق كله'), horizon: horizonWords(horizon, ar),
    evidence: evidenceWords.length > 1 ? `${evidenceWords.slice(0, -1).join(ar ? '، ' : ', ')}${ar ? ' و' : ' and '}${evidenceWords.at(-1)}` : (evidenceWords[0] || ''),
  };
  const ctx = {
    choice, entry, nights, record, said, words, next, indexed,
    loading: !picks && !!st.extrasLoading,
    plainNext: plainEntry ? nightsOf(plainEntry, horizon).next : null,
  };

  // ── behind the five: every company in the newest run ──
  const tickers = Object.keys((scenarios && scenarios.companies) || reading?.scores || {}).sort();
  let behind = [];
  if (!scenarios) {
    behind = [];
  } else if (rerankOn) {
    const loadingReading = st.scLoading && st.scLoading[key];
    const failed = st.scFailed && st.scFailed[key];
    if (reading) {
      const view = rerankView(scenarios, choice, tickers, reading, layers.length ? data.readings?.models : null);
      behind = [...rerankCards(component, data, view, words, ar), companiesCard(component, data, { ...ctx, view, tickers, reading }, ar)];
    } else {
      behind = [h('section', { class: 'aix-card aix-empty-card', role: loadingReading ? 'status' : null },
        h('h3', null, failed ? t('This reading could not be fetched', 'تعذر جلب هذه القراءة')
          : t('Loading this reading’s score for every company…', 'جارٍ تحميل درجات هذه القراءة لكل الشركات…')),
        failed ? h('p', null, failed) : h('div', { class: 'sc-skeleton is-short', 'aria-hidden': 'true' }),
        failed ? h('button', { type: 'button', class: 'aix-quiet', onClick: () => {
          const { [key]: gone, ...rest } = st.scFailed || {};
          component.setState({ scFailed: rest });
        } }, t('Try again', 'حاول مجدداً')) : null)];
    }
  } else if (model) {
    const returns = returnModels(scenarios).some((m) => m.id === model);
    const view = returns ? returnsView(scenarios, choice, tickers) : null;
    behind = [...(view ? returnsCards(component, data, view, words, ar) : []),
      companiesCard(component, data, { ...ctx, view, tickers }, ar)];
  }

  const from = st.scFrom && st.scFrom !== model && top5?.models?.[st.scFrom] && !choice.models.some((m) => m.id === st.scFrom)
    ? h('p', { class: 'aix-note aix-from' }, t(`${top5.models[st.scFrom].label} has no five of its own to show, so the workbench shows ${modelName}.`,
      `${top5.models[st.scFrom].labelAr || top5.models[st.scFrom].label} ليس لديه خمس خاصة به، فيعرض المختبر ${modelName}.`)) : null;

  const rerank = scenarios?.rerank;
  const last = rerank ? cairoTime(rerank.ranAt, ar) : null;
  const commitment = scenarios?.commitment || {};
  const basis = nights.newest?.basisSession || scenarios?.basisSession;

  const screen = h('div', { class: 'home-screen sc-screen aix-bench' },
    h('header', { class: 'aix-bench-head' },
      h('div', { class: 'aix-bench-title' },
        h('button', { type: 'button', class: 'aix-back', onClick: () => component.setState({ screen: 'home' }) },
          ar ? '→ العودة إلى الصفحة الرئيسية' : '← BACK TO THE HOME PAGE'),
        h('div', { class: 'aix-bench-name' },
          h('h1', null, t('Scenario workbench', 'مختبر السيناريوهات')),
          h('button', { type: 'button', class: 'aix-beta', onClick: () => component.setState({ scWarning: true }) },
            h('i', { 'aria-hidden': 'true' }), t('BETA · READ THIS', 'تجريبي · اقرأ هذا'))),
        h('p', null, t(`After every close, each model picks the five companies it puts highest. Choose a model: first its newest five${basis ? `, from the close of ${day(basis, false)}` : ''}, which nobody can score yet — then how its earlier fives actually did.`,
          `بعد كل إغلاق، يختار كل نموذج الشركات الخمس التي يضعها في المقدمة. اختر نموذجاً: أولاً أحدث خمس${basis ? ` من إغلاق ${day(basis, true)}` : ''}، ولا يمكن تقييمها بعد — ثم كيف أدّت اختياراته السابقة فعلاً.`))),
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
        nextCard(component, data, ctx, ar),
        recordCard(component, data, ctx, ar),
        behind.length ? h('h2', { class: 'aix-section' }, t(`Behind the five: every company in the same run, ${horizonWords(horizon, false)} ahead`,
          `خلف الخمس: كل الشركات في التشغيل نفسه، بعد ${horizonWords(horizon, true)}`)) : null,
        ...behind)),
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

  return { screen, choice };
}

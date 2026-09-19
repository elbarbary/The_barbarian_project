/* The model lab, on Home: one card, and what it is allowed to say.
 *
 * WHAT THIS CARD SAYS
 * Three saved facts, side by side. A forecast still open — one company's own
 * closes, then the path a model saved for it and has not been allowed to
 * revise. The Gemini re-rank, which moves companies up and down an order and
 * changes no price. And the newest completed evaluation, where a window has
 * closed and the result is a measurement rather than a claim.
 *
 * IT NAMES COMPANIES, AND THAT IS A DECISION
 * It did not, until the owner asked for it on 18 September 2026. Every name
 * on it comes from `lab/picks.json` and `lab/scenarios.json`, which are
 * gated, behind a sign-in, and carry the run's own warning; the open
 * `research/top5.json` still names nobody and `the published record names no
 * security anywhere` still guards it. What keeps this the right side of the
 * line is the sentence in the lede — this is a saved record, we hold nothing
 * and we advise nothing — and it is not decoration. ESTHMR is not
 * FRA-licensed. If that sentence goes, the card has to go with it.
 *
 * NOTHING ON IT IS WRITTEN HERE
 * Every figure, count, date and ticker comes from a published document. Below
 * the record's own minimum it says how many sessions it still needs, and it
 * never draws an average it does not have.
 */
import { React as R } from './react-shim.js';
import { finite, percent, heroChart, savedPathChart, recordRows, recordChart, rowsEnd, day } from './ai-visuals.js';
import { warningDialog, statusStrip, entryOf, nightsOf, rankingOf, listed, ensureReadings } from './scenarios.js';
import { heroModel, countAr, sessionsLabel, word, Word } from './ai-record.js';

export { heroModel, countAr };

const h = R.createElement;

/** Into the workbench, on the same model and window the card was reading. */
function open(component, patch) {
  component.setState({ screen: 'scenarios', aiWarning: false, scShowAll: false, scNightsAll: false, scSearch: '', ...patch });
  if (typeof scrollTo === 'function') { try { scrollTo(0, 0); } catch { /* not in a browser */ } }
}

/** A figure inside a sentence, kept in its own direction.
 *  Without it an Arabic line carries a price's digits out of order. */
const fig = (v) => h('bdi', { dir: 'ltr', class: 'aix-n' }, v);

const price = (v) => (finite(v) ? v.toFixed(2) : null);

/**
 * The open forecast: one company, its own closes, and the path saved for it.
 *
 * The company is not chosen here. It is whatever the hero model put first on
 * the newest night it read — the same five the record is kept on — so the
 * card cannot quietly become a shop window for a name somebody liked.
 */
function openForecast(scenarios, picks, model, horizon) {
  const entry = entryOf(picks, { model, horizon });
  const { newest } = nightsOf(entry, horizon);
  const first = (newest && newest.picks && newest.picks[0]) || null;
  const ticker = first && listed(first.ticker) ? first.ticker : null;
  const company = ticker ? scenarios?.companies?.[ticker] : null;
  const held = company?.models?.[model] || null;
  const ahead = Array.isArray(held?.pricePath) ? held.pricePath.filter(finite) : [];
  const basis = finite(held?.basisClose) ? held.basisClose : null;
  if (!ticker || !ahead.length || basis === null) return null;
  // The past is published as a percentage of the basis close; the saved path
  // is published in pounds. One of the two has to be converted, and it is the
  // one whose conversion is exact.
  const moves = Array.isArray(company.path) ? company.path : [];
  const past = moves.map((v) => (finite(v) ? basis * (1 + v / 100) : null)).filter(finite);
  // Where every model's saved path ends for this company. The low and the
  // high are two models' endpoints, not a confidence band, which is what the
  // note under them says.
  const ends = Object.values(company.models || {})
    .map((m) => (Array.isArray(m.pricePath) ? m.pricePath.filter(finite).at(-1) : null))
    .filter(finite);
  const average = ends.length ? ends.reduce((a, b) => a + b, 0) / ends.length : null;
  return {
    ticker,
    past: past.length >= 2 ? past.concat([basis]) : [],
    ahead: [basis].concat(ahead),
    low: ends.length ? Math.min(...ends) : null,
    high: ends.length ? Math.max(...ends) : null,
    average,
    models: ends.length,
  };
}


export function aiCards(component, data, ar) {
  const t = (en, arabic) => (ar ? arabic : en);
  const top5 = data && data.top5;
  if (!top5 || !top5.models) return null;
  const st = component.state || {};
  const scenarios = data.scenarios || null;
  const picks = data.picks || null;

  // Home reads one window, the record's five-session one where it has it;
  // every window and every model is on the workbench.
  const horizons = (Array.isArray(top5.horizons) ? top5.horizons : []).map(String);
  const horizon = horizons.includes('5') ? '5' : horizons[0];
  const m = heroModel(top5, horizon);
  const system = m.system;
  const n = Number(horizon);
  const latest = m.latest || {};
  const forecasters = finite(latest.forecasters) ? latest.forecasters : null;
  const models = forecasters === null ? null : forecasters + (latest.readings ? 1 : 0);
  const basis = scenarios?.basisSession || top5.latestSession || null;

  const modelId = (picks && picks.models && Object.keys(picks.models)[0]) || null;
  const forecast = scenarios && picks && modelId
    ? openForecast(scenarios, picks, modelId, horizon) : null;

  // The re-rank's own reading is a 3 KB document and is not fetched with the
  // page. Ask for it only when there is a card that would draw it.
  const readingKey = Array.isArray(scenarios?.rerank?.default) && scenarios.rerank.default.length
    ? scenarios.rerank.default.join('-') : null;
  if (readingKey) ensureReadings(component, data, [readingKey]);
  const reading = readingKey ? data.readings?.[readingKey] || null : null;

  const warning = st.aiWarning ? warningDialog(component, data, ar, {
    onAccept: () => open(component, {}),
    onClose: () => component.setState({ aiWarning: false }),
    closeLabel: t('Close', 'إغلاق'),
  }) : null;
  const into = { scHorizon: n };

  /* ── the three saved facts ──────────────────────────────────────────── */

  const forecastCard = forecast ? h('div', { class: 'aix-fact' },
    h('span', { class: 'aix-fact-label' },
      t(`OPEN FORECAST · SAVED PATH · ${forecast.ticker}`, `توقّع قائم · مسار محفوظ · ${forecast.ticker}`)),
    savedPathChart(forecast, ar),
    h('div', { class: 'aix-fact-figures' },
      h('span', null, t('low ', 'أدنى '), fig(price(forecast.low))),
      h('span', null, t('average ', 'متوسط '), fig(price(forecast.average))),
      h('span', null, t('high ', 'أعلى '), fig(price(forecast.high)))),
    h('p', { class: 'aix-fact-note' }, t(
      'Where the saved paths end. Not probability bounds, and not drawn as a band.',
      'حيث تنتهي المسارات المحفوظة. ليست حدود احتمال، ولا تُرسم كنطاق.'))) : null;

  // The fact Home shows, and it has two states. A window has
  // closed, so the result is a measurement — or it has not, and the honest
  // thing to draw is how many sessions each night it is still holding has
  // left to run. Never a zero, and never an average it does not have.
  let scoredCard = null;
  if (system && system.scored && system.byDate.length >= 2) {
    const dates = system.byDate.map((d) => d.date).filter(Boolean);
    const span = dates.length ? `${day(dates[0], ar)} – ${day(dates[dates.length - 1], ar)}` : '';
    const windowWords = ar ? sessionsLabel(n, true) : `${word(n)} ${n === 1 ? 'session' : 'sessions'}`;
    const five = finite(m.topCount) ? m.topCount : null;
    scoredCard = h('div', { class: 'aix-fact aix-system' },
      h('span', { class: 'aix-fact-label' }, five
        ? t(`THE SYSTEM’S ${word(five).toUpperCase()} · ${windowWords.toUpperCase()} · ${span}`,
          `أعلى ${five} للنظام · ${windowWords} · ${span}`)
        : t(`COMPLETED EVALUATION · ${span}`, `تقييم مكتمل · ${span}`)),
      h('div', { class: 'aix-system-figure' },
        h('strong', { class: 'aix-system-value', dir: 'ltr' }, percent(system.ownReturn)),
        h('p', { class: 'aix-system-versus' }, t(
          `against ${percent(system.market)} for the market over the same ${windowWords} · ahead on ${system.ahead} of ${system.sessions}`,
          `مقابل ${percent(system.market)} للسوق خلال ${windowWords} نفسها · متقدم في ${system.ahead} من ${system.sessions}`))),
      heroChart(system.byDate, ar),
      h('p', { class: 'aix-fact-note' }, t(
        'The five solid · the market dashed. Each point is one night over its own window — every company scored, equally weighted, and not an index.',
        'الخمس المختارة متصل · السوق متقطّع. كل نقطة ليلة واحدة على نافذتها — كل شركة مُقيَّمة بأوزان متساوية، وليست مؤشراً.')));
  } else if (system) {
    // Below the minimum: how many NIGHTS are scored, and the nights still to
    // come drawn as the sessions each is held. "0/5 sessions scored" beside
    // "five sessions" used one word for two different fives.
    const minimum = m.minimum;
    const rows = system.waiting ? recordRows(system.waiting, Math.max(minimum - system.sessions, 0), n) : [];
    const next = rows[0] && rows[0].read ? n + rows[0].start : null;
    const last = rowsEnd(rows, n);
    const toRead = rows.some((r) => !r.read);
    const sessionsAfterAr = (k) => countAr(k, 'جلسة واحدة', 'جلستين', 'جلسات', 'جلسة');
    /* WHY THE BIG FIGURE IS A SENTENCE AND NOT "0 of 5".
       The design review's second P1: a dominant "0 of 5" is read by a novice
       as zero correct predictions out of five. It is not a score at all — it
       counts how many nights have aged far enough to be marked, which is a
       fact about the calendar, not about the model. A figure that large, in
       the position a headline number occupies, cannot be rescued by the words
       under it, so the headline is the words and the count moves into the
       supporting line where it reads as a tally of nights.

       The review gives the wording: "First evaluation pending · after N
       completed sessions". */
    const headWords = system.sessions
      ? t('Evaluation in progress', 'التقييم جارٍ')
      : t('First evaluation pending', 'التقييم الأول لم يبدأ بعد');
    const afterWords = last !== null
      ? t(`after ${sessionsLabel(last, false)} completed`, `بعد ${sessionsAfterAr(last)} مكتملة`)
      : '';
    const tally = t(`${system.sessions} of ${minimum} nights read`,
      `${system.sessions} من ${minimum} ليالٍ مقروءة`);
    const nextWords = next !== null
      ? (system.sessions
        ? t(`the next in ${sessionsLabel(next, false)}`, `التالية بعد ${sessionsAfterAr(next)}`)
        : t(`the first in ${sessionsLabel(next, false)}`, `الأولى بعد ${sessionsAfterAr(next)}`))
      : (system.nights ? '' : t('it has not read a night yet', 'لم يقرأ أي ليلة بعد'));
    const versus = [afterWords, tally, nextWords].filter(Boolean).join(' · ');
    const legend = rows.length
      ? t(`Each row is one night’s five, held ${word(n)} ${n === 1 ? 'session' : 'sessions'}: filled squares have closed${toRead ? ', dashed rows are nights still to read' : ''}.`,
        `كل صف أعلى خمس شركات في ليلة، تُتابَع ${sessionsLabel(n, true)}: المربعات الممتلئة أُغلقت${toRead ? '، والصفوف المتقطعة ليالٍ لم تُقرأ بعد' : ''}.`)
      : t(`No average until ${word(minimum)} nights are scored — a missing result is not a zero.`,
        `لا متوسط قبل تقييم ${countAr(minimum, 'ليلة واحدة', 'ليلتين', 'ليالٍ', 'ليلة')} — والنتيجة الغائبة ليست صفراً.`);
    // At the earliest: a night it skips, or one too few companies trade on,
    // only ever pushes the average later.
    const end = last !== null
      ? t(`average in ${sessionsLabel(last, false)} at the earliest`, `المتوسط بعد ${sessionsAfterAr(last)} على الأقل`)
      : '';
    scoredCard = h('div', { class: 'aix-fact aix-system aix-system-pending' },
      h('span', { class: 'aix-fact-label' }, t('EVALUATION IN PROGRESS', 'تقييم جارٍ')),
      h('div', { class: 'aix-system-figure' },
        h('strong', { class: 'aix-system-value is-words' }, headWords),
        h('p', { class: 'aix-system-versus' }, versus)),
      rows.length ? recordChart(rows, n, ar, { label: `${legend} ${end}`, end }) : null,
      h('p', { class: 'aix-fact-note' }, legend));
  }

  /* ONE VISUAL ON HOME, NOT THREE.
     The design review asks the homepage for "one forecast visual OR one
     completed comparison". Three fact tiles are what made this block a
     proposition rather than a preview — a reader met a forecast, a re-ranking
     and an evaluation counter before the market.

     Which one: the completed comparison whenever the record has enough
     scored nights to have one, and the evaluation-pending card otherwise.
     Both reviewers flagged the alternative — the named-company forecast with
     its low/average/high — as the figure most easily read as a price target,
     and it is the one card here that names a security. It keeps its place in
     the workbench, behind the warning, where a reader arrives having asked.
     The Gemini re-ranking goes with it, for the same reason: "12 → 3" beside
     a company name reads as advice however it is captioned. */
  const facts = [scoredCard || forecastCard].filter(Boolean);
  if (!facts.length) return warning;

  const record = system
    ? { sessions: system.sessions, minimum: m.minimum, enough: system.scored } : null;

  return h('div', { class: 'ai-cards', role: 'region', 'aria-labelledby': 'aix-lab-title' },
    h('section', { class: 'aix-lab' },
      h('div', { class: 'aix-lab-head' },
        h('p', { class: 'aix-dateline' }, basis
          ? t(`Saved record ${day(basis, false)} · ${models ? `${models} public models` : 'public models'}`,
            `سجل محفوظ ${day(basis, true)} · ${models ? `${models} نموذجًا عامًا` : 'نماذج عامة'}`)
          : t('Saved record', 'سجل محفوظ')),
        h('button', { type: 'button', class: 'aix-preview-pill', onClick: () => component.setState({ aiWarning: true }) },
          t('PREVIEW · BETA', 'معاينة · تجريبي'))),
      h('h2', { id: 'aix-lab-title', class: 'aix-lab-title' },
        t('Do forecasting models get it right? We test them in public', 'هل تُصيب نماذج التنبؤ؟ نختبرها علناً'), ' ',
        h('small', { class: 'h-term' }, t('The model lab', 'مختبر النماذج'))),
      h('p', { class: 'aix-lab-lead' }, t(
        `${models ? `${Word(models)} public models` : 'Public models'} rank every listed company after each close, and after five sessions we measure what they got right and what they got wrong. We read a saved record and run no new calculation; we hold nothing and we advise nothing.`,
        `${models ? countAr(models, 'نموذج عام واحد', 'نموذجان عامان', 'نماذج عامة', 'نموذجًا عامًا') : 'نماذج عامة'} ترتّب كل شركة مدرجة بعد كل إغلاق، وبعد خمس جلسات نقيس ما أصاب وما أخطأ. نقرأ سجلاً محفوظاً ولا نُجري حساباً جديداً؛ لا نملك شيئاً ولا نُقدّم نصيحة.`)),
      h('div', { class: 'aix-facts' }, facts),
      h('div', { class: 'aix-rule' }),
      h('div', { class: 'aix-lab-foot' },
        statusStrip(record, ar),
        h('div', { class: 'aix-lab-actions' },
          h('button', { type: 'button', class: 'aix-cta', onClick: () => open(component, { ...into, scLayers: [], scFocus: null }) },
            t('Explore model results', 'استكشف نتائج النماذج')),
          h('button', { type: 'button', class: 'aix-cta-quiet', onClick: () => open(component, { ...into, scFocus: 'past' }) },
            t('What came back?', 'ما الذي عاد؟'))))),
    warning);
}

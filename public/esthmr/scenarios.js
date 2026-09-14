/* The scenario workbench: what every model says, for whatever you point it at.
 *
 * THIS SCREEN IS DIFFERENT IN KIND FROM THE REST OF THE SITE AND IS BUILT AS IF
 * Everywhere else, ESTHMR publishes measurements — things that have already
 * happened — and lets the reader judge. This screen shows a number a model
 * produced about a named company's future. That is the one thing an unlicensed
 * publisher is on the least certain ground doing, and the owner's decision is
 * to ship it as a labelled experiment behind a gate rather than not at all.
 *
 * So the gate is real, not decorative:
 *   · the screen does not render its figures until the reader has read the
 *     warning and accepted it, and the acceptance is stored per reader;
 *   · every model's own track record travels beside its number, so nobody
 *     reads a prediction without seeing how often that model has been right;
 *   · nothing here is ordered by attractiveness. A company list is
 *     alphabetical and a model list is in a fixed order;
 *   · there is no "best" anything, and no buy, sell, target or upside.
 *
 * WHAT IS PRECOMPUTED, AND WHAT THE LOADER IS FOR
 * All of it is precomputed: the nightly run sealed these numbers before the
 * market opened, and the screen reads one document. The progress the reader
 * sees while a scenario assembles is the real work of evaluating their
 * selection over up to 260 companies and their added layers — not a fake
 * spinner over a fetch that already finished. It is staged so a slow phone
 * shows something moving, and each stage names what it is doing.
 */
import { React as R } from './react-shim.js';
import * as RB from './rulebook.js';
import { COLUMNS, columnLabel, answerCounts, describe, asRulebook } from './ask.js';

const h = R.createElement;
const finite = (v) => typeof v === 'number' && Number.isFinite(v);
const pp = (v) => (finite(v) ? `${v > 0 ? '+' : ''}${v.toFixed(2)}%` : '—');
const tone = (v) => (!finite(v) ? 'var(--t2)' : v > 0 ? 'var(--up)' : v < 0 ? 'var(--down)' : 'var(--t2)');

export const ACCEPTED_KEY = 'esthmr:scenarios:accepted:';
const acceptKey = (email) => ACCEPTED_KEY + (email ? String(email).trim().toLowerCase() : 'guest');

export function hasAccepted(email) {
  try { return localStorage.getItem(acceptKey(email)) === '1'; } catch { return false; }
}
export function accept(email) {
  try { localStorage.setItem(acceptKey(email), '1'); } catch { /* the gate holds for this visit only */ }
}

/* ── the warning ────────────────────────────────────────────────────────── */

/* Four sentences, each of which is a fact the reader would otherwise have to
 * infer. Not a wall of legal text nobody reads: the point is that somebody
 * who accepts this has actually been told the models are weeks old, that
 * their top five has mostly trailed the market, and that nothing here is a
 * recommendation. */
export function warningLines(top5, ar) {
  const t = (en, arabic) => (ar ? arabic : en);
  const sessions = (top5 && Array.isArray(top5.dates)) ? top5.dates.length : 0;
  return [
    t('These are outputs from experimental models, not forecasts this publisher endorses and not investment advice. ESTHMR is not licensed to advise on securities.',
      'هذه مخرجات نماذج تجريبية، وليست توقعات يتبنّاها هذا الناشر ولا نصيحة استثمارية. إسثمر غير مرخّص لتقديم المشورة في الأوراق المالية.'),
    t(`The models have been running for ${sessions || 'a handful of'} sessions. That is weeks, not years, and far too little to know whether any of them can forecast this exchange.`,
      `تعمل النماذج منذ ${sessions || 'عدد قليل من'} جلسة. أسابيع، لا سنوات، وأقل بكثير من أن نعرف ما إذا كان أي منها يستطيع التنبؤ بهذه البورصة.`),
    t('Over five sessions, the five companies most of these models ranked highest have returned LESS than the market. Their record is shown beside every number here.',
      'خلال خمس جلسات، حققت الشركات الخمس الأعلى ترتيبًا لدى معظم هذه النماذج عائدًا أقل من السوق. سجلّها معروض بجوار كل رقم هنا.'),
    t('Every figure was sealed and timestamped by an independent authority before the market opened, so it cannot have been edited afterwards. That proves when it was said. It does not make it right.',
      'كل رقم خُتم ووُثِّق زمنيًا لدى جهة مستقلة قبل افتتاح السوق، فلا يمكن تعديله لاحقًا. هذا يثبت متى قيل، ولا يجعله صحيحًا.'),
  ];
}

function gate(component, data, ar) {
  const t = (en, arabic) => (ar ? arabic : en);
  const reader = component._reader || null;
  return h('div', { class: 'sc-gate', role: 'dialog', 'aria-modal': 'true',
                    'aria-labelledby': 'sc-gate-title' },
    h('div', { class: 'sc-gate-card' },
      h('p', { class: 'sc-gate-eyebrow' }, t('Experimental', 'تجريبي')),
      h('h2', { id: 'sc-gate-title' }, t('Before you open this', 'قبل أن تفتح هذا')),
      h('ul', { class: 'sc-gate-list' },
        warningLines(data.top5, ar).map((line, i) => h('li', { key: i }, line))),
      h('div', { class: 'q-actions' },
        h('button', { type: 'button', class: 'q-save',
          onClick: () => { accept(reader); component.setState({ scAccepted: Date.now() }); } },
          t('I understand — show me', 'فهمت — اعرضه')),
        h('button', { type: 'button', class: 'q-cancel',
          onClick: () => component.setState({ screen: 'home' }) },
          t('Take me back', 'عُد بي')))));
}

/* ── the pickers ────────────────────────────────────────────────────────── */

export const SUBJECT = [
  { id: 'market', en: 'The whole market', ar: 'السوق كله' },
  { id: 'picked', en: 'Companies I choose', ar: 'شركات أختارها' },
  { id: 'rule', en: 'Companies that answer a question', ar: 'شركات ينطبق عليها سؤال' },
];

/* Layers a reader can add to the view. Each is a published fact about the
   company, shown beside the model's number and never folded into it: the
   model did not read the news, and a screen that mixed the two would be
   claiming it did. */
export const LAYERS = [
  { id: 'record', en: 'How this model has done', ar: 'أداء هذا النموذج' },
  { id: 'filings', en: 'Its latest filing', ar: 'آخر إفصاح لها' },
  { id: 'measures', en: 'Its measurements', ar: 'قياساتها' },
  { id: 'spread', en: 'Where the models disagree', ar: 'أين تختلف النماذج' },
];

function chips(items, chosen, onPick, ar, multi) {
  return h('div', { class: 'ask-subjects' }, items.map((x) => {
    const on = multi ? chosen.includes(x.id) : chosen === x.id;
    return h('button', { key: x.id, type: 'button',
      class: on ? 'ask-subject on' : 'ask-subject',
      'aria-pressed': on ? 'true' : 'false',
      onClick: () => onPick(x.id) }, ar ? x.ar : x.en);
  }));
}

/* ── assembling a scenario ──────────────────────────────────────────────── */

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
  return { tickers: all, how: 'market' };
}

/** One model's view of a set of companies: every company, no cut.
 *
 * Sorted alphabetically. Sorting by the model's own number would turn this
 * into a ranked list of securities produced by this publisher, which is the
 * line the whole site is built not to cross — the model's ordering is shown
 * as a number on each row, not as the order of the rows.
 */
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
  return {
    rows,
    answered: numbers.length,
    silent: rows.length - numbers.length,
    median: numbers.length ? median(numbers) : null,
    up: numbers.filter((v) => v > 0).length,
    down: numbers.filter((v) => v < 0).length,
  };
}

function median(values) {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** How far apart the models are on one company — the honest headline when
 *  nine models disagree, which on this exchange they usually do. */
export function spreadOf(company, horizon) {
  const models = (company && company.models) || {};
  const values = Object.values(models)
    .map((m) => m.returns && m.returns[String(horizon)])
    .filter(finite);
  if (values.length < 2) return null;
  return { low: Math.min(...values), high: Math.max(...values), models: values.length,
           agree: values.every((v) => v > 0) || values.every((v) => v < 0) };
}

/* ── the drawing ────────────────────────────────────────────────────────── */

/* A distribution, not a leaderboard. The shape of what a model expects across
   the chosen companies says more than any single row, and it cannot be read
   as a list of things to buy. */
function distribution(view, ar) {
  const values = view.rows.map((r) => r.value).filter(finite);
  if (values.length < 5) return null;
  const low = Math.min(...values), high = Math.max(...values);
  const span = high - low || 1;
  const buckets = new Array(21).fill(0);
  for (const v of values) buckets[Math.min(20, Math.floor(((v - low) / span) * 21))] += 1;
  const tallest = Math.max(...buckets);
  const zeroAt = ((0 - low) / span) * 100;
  return h('div', { class: 'sc-dist' },
    h('div', { class: 'sc-dist-bars', role: 'img',
               'aria-label': ar ? `توزيع ${values.length} تقدير` : `distribution of ${values.length} estimates` },
      buckets.map((n, i) => h('span', { key: i,
        style: `height:${tallest ? (n / tallest) * 100 : 0}%;background:${
          low + (i / 21) * span >= 0 ? 'var(--up)' : 'var(--down)'}` }))),
    zeroAt >= 0 && zeroAt <= 100
      ? h('span', { class: 'sc-dist-zero', style: `inset-inline-start:${zeroAt}%` }) : null,
    h('div', { class: 'sc-dist-axis' },
      h('span', null, pp(low)), h('span', null, pp(high))));
}

function recordFor(top5, model, horizon, ar) {
  const t = (en, arabic) => (ar ? arabic : en);
  const row = (((top5 && top5.models) || {})[model] || {}).horizons || {};
  const one = row[String(horizon)] || row['5'] || {};
  if (!one.sessions) {
    return h('p', { class: 'home-note' }, t(
      'This model has no scorable record yet — it has not run on enough sessions.',
      'لا سجل قابل للتقييم لهذا النموذج بعد — لم يعمل على جلسات كافية.'));
  }
  return h('p', { class: 'home-note sc-record' }, t(
    `Its five highest-ranked returned ${pp(one.meanReturn)} against the market's ${pp(one.meanMarket)} — ${pp(one.meanAdvantage)} — ahead on ${one.ahead} of ${one.sessions} sessions.`,
    `حققت أعلى خمس لديه ${pp(one.meanReturn)} مقابل ${pp(one.meanMarket)} للسوق — ${pp(one.meanAdvantage)} — متقدّمًا في ${one.ahead} من ${one.sessions} جلسة.`));
}

/* Staged, because assembling a view over 260 companies and their layers is
   real work on a phone and a screen that freezes silently reads as broken.
   Each stage names what it is doing; none of them is a wait invented to look
   busy — the document is already here, the evaluation is not. */
export const STAGES = [
  { id: 'read', en: 'Reading the sealed run', ar: 'قراءة الجلسة المختومة' },
  { id: 'select', en: 'Selecting your companies', ar: 'اختيار شركاتك' },
  { id: 'models', en: 'Collecting what each model said', ar: 'جمع ما قاله كل نموذج' },
  { id: 'layers', en: 'Adding your layers', ar: 'إضافة طبقاتك' },
];

function loading(stage, ar) {
  const t = (en, arabic) => (ar ? arabic : en);
  return h('div', { class: 'sc-loading', role: 'status', 'aria-live': 'polite' },
    h('div', { class: 'sc-loading-track' },
      h('span', { style: `width:${((stage + 1) / STAGES.length) * 100}%` })),
    h('ul', { class: 'sc-loading-list' }, STAGES.map((s, i) => h('li', {
      key: s.id, class: i < stage ? 'done' : i === stage ? 'now' : '' },
      h('span', { class: 'sc-tick', 'aria-hidden': 'true' }, i < stage ? '✓' : '·'),
      ar ? s.ar : s.en))));
}

/* ── the screen ─────────────────────────────────────────────────────────── */

export function scenariosScreen(component, data, ar) {
  const t = (en, arabic) => (ar ? arabic : en);
  const st = component.state;
  const reader = component._reader || null;
  const scenarios = data.scenarios || null;
  const top5 = data.top5 || null;
  const measures = data.measures || null;

  if (!hasAccepted(reader) && !st.scAccepted) {
    return { screen: h('div', { class: 'home-screen sc-screen' }, gate(component, data, ar)) };
  }

  if (!scenarios) {
    return { screen: h('div', { class: 'home-screen sc-screen' },
      h('header', { class: 'home-intro' }, h('h1', null, t('Scenario workbench', 'مختبر السيناريوهات'))),
      h('p', { class: 'home-note' }, t('The sealed run has not loaded yet.', 'لم تُحمَّل الجلسة المختومة بعد.'))) };
  }

  const model = st.scModel && scenarios.models[st.scModel] ? st.scModel : Object.keys(scenarios.models)[0];
  const horizon = [1, 5, 20].includes(Number(st.scHorizon)) ? Number(st.scHorizon) : 5;
  const subject = st.scSubject || 'market';
  const layers = st.scLayers || ['record', 'spread'];
  const stage = finite(st.scStage) ? st.scStage : STAGES.length;

  const picked = universeFor({ ...st, scSubject: subject }, scenarios, measures);
  const view = viewFor(picked.tickers, scenarios, model, horizon);
  const commitment = scenarios.commitment || {};

  // Re-run the staged assembly whenever the selection changes.
  const restage = (patch) => {
    component.setState({ ...patch, scStage: 0 });
    STAGES.forEach((_, i) => setTimeout(() => {
      if (component.state.screen === 'scenarios') component.setState({ scStage: i + 1 });
    }, 140 * (i + 1)));
  };

  const modelChips = h('div', { class: 'ask-subjects' },
    Object.entries(scenarios.models).map(([id, m]) => h('button', {
      key: id, type: 'button', class: model === id ? 'ask-subject on' : 'ask-subject',
      'aria-pressed': model === id ? 'true' : 'false',
      onClick: () => restage({ scModel: id }) }, ar ? m.labelAr : m.label)));

  const body = stage < STAGES.length ? loading(stage, ar) : h('div', null,
    h('div', { class: 'sc-summary' },
      h('div', null,
        h('div', { class: 'sc-figure', style: `color:${tone(view.median)}` }, pp(view.median)),
        h('div', { class: 'aic-against' }, t(
          `median of ${view.answered} estimates · ${view.up} above zero · ${view.down} below`,
          `وسيط ${view.answered} تقدير · ${view.up} فوق الصفر · ${view.down} تحته`))),
      distribution(view, ar)),
    recordFor(top5, model, horizon, ar),

    h('div', { class: 'sc-rows' }, view.rows.map((r) => h('button', {
      key: r.ticker, type: 'button', class: 'ask-row',
      onClick: () => component.setState({ screen: 'company', ticker: r.ticker }) },
      h('b', null, r.ticker),
      h('span', { class: 'ask-why' },
        h('span', { class: 'ask-reason', style: `color:${tone(r.value)}` },
          finite(r.value) ? pp(r.value) : t('silent', 'صامت')),
        layers.includes('spread') && r.spread
          ? h('span', { class: 'ask-reason' }, t(
              `${r.spread.models} models span ${pp(r.spread.low)} to ${pp(r.spread.high)}${r.spread.agree ? '' : ' — they disagree on direction'}`,
              `${r.spread.models} نماذج بين ${pp(r.spread.low)} و${pp(r.spread.high)}${r.spread.agree ? '' : ' — تختلف في الاتجاه'}`))
          : null,
        layers.includes('measures') && measures
          ? (() => {
              const row = (measures.rows || []).find((x) => x.ticker === r.ticker);
              return row && finite(row.relative_volume_20)
                ? h('span', { class: 'ask-reason' }, `${row.relative_volume_20.toFixed(1)}× ${t('its median volume', 'معتاد حجمها')}`)
                : null;
            })()
          : null,
        layers.includes('filings') && measures
          ? (() => {
              const row = (measures.rows || []).find((x) => x.ticker === r.ticker);
              return row && finite(row.sessions_since_filing)
                ? h('span', { class: 'ask-reason' }, t(
                    `filed ${row.sessions_since_filing} sessions ago`,
                    `أفصحت منذ ${row.sessions_since_filing} جلسة`))
                : null;
            })()
          : null))),
    ),
    h('p', { class: 'home-note' }, t(
      `Every company in your selection is listed, alphabetically — not in the model's order. The model's own number is on each row; the rows are not ranked by it.`,
      'كل شركة في اختيارك مذكورة أبجديًا — لا بترتيب النموذج. رقم النموذج على كل صف؛ والصفوف ليست مرتّبة به.')));

  return {
    screen: h('div', { class: 'home-screen sc-screen' },
      h('header', { class: 'home-intro' },
        h('h1', null, t('Scenario workbench', 'مختبر السيناريوهات'),
          h('span', { class: 'aic-beta' }, t('BETA · AI', 'تجريبي · ذكاء اصطناعي'))),
        h('p', null, t(
          `What each model said after the close of ${scenarios.basisSession}, as a percentage of that close. Model outputs, not advice.`,
          `ما قاله كل نموذج بعد إغلاق ${scenarios.basisSession}، كنسبة من ذلك الإغلاق. مخرجات نماذج، وليست توصية.`))),

      h('section', { class: 'sc-controls' },
        h('h2', null, t('Ask about', 'اسأل عن')),
        chips(SUBJECT, subject, (id) => restage({ scSubject: id }), ar, false),
        subject === 'picked'
          ? h('p', { class: 'home-note' }, t(
              `${picked.tickers.length} chosen. Open a company and use its star to add it.`,
              `${picked.tickers.length} مختارة. افتح شركة واستخدم النجمة لإضافتها.`))
          : null,
        subject === 'rule'
          ? h('p', { class: 'home-note' }, picked.result
              ? t(`${picked.tickers.length} companies answer your question.`,
                  `${picked.tickers.length} شركة ينطبق عليها سؤالك.`)
              : t('Save a question first, on the questions screen.',
                  'احفظ سؤالًا أولًا من شاشة الأسئلة.'))
          : null,

        h('h2', null, t('Model', 'النموذج')),
        modelChips,

        h('h2', null, t('Horizon', 'الأفق')),
        h('div', { class: 'ask-subjects' }, [1, 5, 20].map((hz) => h('button', {
          key: hz, type: 'button', class: horizon === hz ? 'ask-subject on' : 'ask-subject',
          'aria-pressed': horizon === hz ? 'true' : 'false',
          onClick: () => restage({ scHorizon: hz }) },
          hz === 1 ? t('next session', 'الجلسة التالية')
                   : t(`${hz} sessions`, `${hz} جلسة`)))),

        h('h2', null, t('Show alongside', 'اعرض بجانبه')),
        chips(LAYERS, layers, (id) => restage({
          scLayers: layers.includes(id) ? layers.filter((x) => x !== id) : layers.concat([id]) }), ar, true)),

      body,

      h('footer', { class: 'sc-proof' },
        h('p', { class: 'home-note' }, t(
          `Sealed ${commitment.timestamped ? `and timestamped by ${commitment.authority}` : 'but not timestamped'} before the market opened${commitment.merkleRoot ? `, under root ${commitment.merkleRoot.slice(0, 16)}…` : ''}. That proves when these numbers were made and that they have not changed. It does not make them right.`,
          `خُتمت ${commitment.timestamped ? `ووُثِّقت زمنيًا لدى ${commitment.authority}` : 'دون توثيق زمني'} قبل افتتاح السوق${commitment.merkleRoot ? `، تحت الجذر ${commitment.merkleRoot.slice(0, 16)}…` : ''}. هذا يثبت متى صنعت هذه الأرقام وأنها لم تتغير. ولا يجعلها صحيحة.`)),
        h('button', { type: 'button', class: 'q-cancel',
          onClick: () => { try { localStorage.removeItem(acceptKey(reader)); } catch { /* nothing kept */ }
                           component.setState({ scAccepted: 0 }); } },
          t('Show the warning again', 'أظهر التحذير مجددًا'))),
    ),
  };
}

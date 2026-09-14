/* Home: the market described, the models on record, the reader's question.
 *
 * WHAT THIS REPLACED
 * A five-hundred-line scroll of everything the project holds — index cards, a
 * busiest-four card, a twelve-company market-cap mosaic, a movers board, a
 * ranking panel, a news grid, a pulse strip, a dots grid. A table of contents.
 * Several of those were also the one shape this publisher may not make: a list
 * of companies whose LENGTH we chose. "Today's six biggest movers" is a list of
 * six we picked, and no wording around it changes that.
 *
 * WHAT IT WAS FIRST REPLACED WITH, AND WHY THAT WAS WRONG TOO
 * The first rebuild cut the busiest card entirely and shrank the model arena to
 * three lines. Both were over-corrections. The illegal part of "busiest" was
 * the FOUR, not the volume: every company trading at twice its own normal
 * volume — all of them, threshold stated — is exactly the shape the reader's
 * own questions take, and it is the most useful thing on the page. And the
 * arena is the reason the backend exists; a page that hid it was a page about
 * something else.
 *
 * (The cardinality line is this project's own boundary, drawn wide on purpose.
 * It is not a statutory safe harbour and no regulator has blessed it.)
 *
 * THE PAGE STANDS ON THREE THINGS
 *   1. Facts about the whole market, which select nothing. Breadth, and then
 *      the complete list of companies that traded at an unusual multiple of
 *      their own volume — the threshold is stated, the denominator is stated,
 *      and nothing is cut to a number.
 *   2. The models, as a ledger. Every forecaster's record so far, in a fixed
 *      order, with the dates and the uncertainty in plain sight, and the one
 *      sentence that there is not yet enough to judge. It names no security.
 *   3. The reader's own question, answered in full, and saveable.
 *
 * WHAT IT DOES NOT DO
 * It does not order the starter questions by their answers. It does not say a
 * saved question is watched — the engine runs in this browser when the page is
 * open. And it does not show the nightly layer's "N worth anything tonight":
 * that names no security and is still an opportunity gauge, and the evaluation
 * of that count belongs beside its definition, not on the front page.
 */

import { React as R } from './react-shim.js';
import * as RB from './rulebook.js';
import * as store from './questions-store.js';
import { SUBJECTS, questionFor, asRulebook, answerCounts, resultList, finite, whole } from './ask.js';

export { questionFor, asRulebook };
const h = R.createElement;
const signed = (v) => (finite(v) ? `${v > 0 ? '+' : ''}${v.toFixed(2)}%` : '—');

/* ── the session, described and not summarised ──────────────────────────── */

/* The same five states the builder computes, in the browser. Used for the
 * signed-out demo, which has rows and no published breadth; a test asserts
 * this reproduces the published block exactly on the real table. */
export function sessionStates(rows) {
  const out = { listed: 0, rose: 0, fell: 0, level: 0, idle: 0, unmeasured: 0 };
  for (const row of rows || []) {
    out.listed += 1;
    const volume = row.volume;
    const change = row.change_1;
    if (!finite(volume)) out.unmeasured += 1;
    else if (volume <= 0) out.idle += 1;
    else if (!finite(change)) out.unmeasured += 1;
    else if (change > 0) out.rose += 1;
    else if (change < 0) out.fell += 1;
    else out.level += 1;
  }
  out.traded = out.rose + out.fell + out.level;
  return out;
}

/* `idle` and `level` are kept apart on purpose: forty companies found no
 * buyer today and thirteen traded and closed where they opened. "53
 * unchanged" would report a share nobody would buy as a share that held
 * steady, and on this exchange that difference is most of what a newcomer
 * has to understand. */
function breadthStates(breadth, t) {
  if (!breadth || !finite(breadth.listed) || breadth.listed <= 0) return null;
  const rows = [
    { key: 'fell', n: breadth.fell, label: t('fell', 'تراجعت'), color: 'var(--down)' },
    { key: 'rose', n: breadth.rose, label: t('rose', 'ارتفعت'), color: 'var(--up)' },
    { key: 'level', n: breadth.level, label: t('traded, closed level', 'تداولت دون تغيّر'), color: 'var(--t2)' },
    { key: 'idle', n: breadth.idle, label: t('found no buyer', 'لم تتداول'), color: 'var(--faint)' },
    { key: 'unmeasured', n: breadth.unmeasured, label: t('not measured', 'غير مقيسة'), color: 'var(--rule)' },
  ].filter((r) => finite(r.n) && r.n > 0);
  const total = rows.reduce((s, r) => s + r.n, 0);
  return total === breadth.listed ? { rows, total } : null;
}

function breadthBlock(breadth, when, t) {
  const state = breadthStates(breadth, t);
  if (!state) return null;
  return h('section', { class: 'home-breadth' },
    h('h2', null, t('The market this session', 'السوق في هذه الجلسة')),
    h('p', { class: 'home-sub' }, when || ''),
    h('div', { class: 'breadth-bar', role: 'img',
               'aria-label': state.rows.map((r) => `${r.n} ${r.label}`).join(', ') },
      state.rows.map((r) => h('span', { key: r.key,
        style: `width:${(r.n / state.total) * 100}%;background:${r.color}` }))),
    h('ul', { class: 'breadth-list' }, state.rows.map((r) => h('li', { key: r.key },
      h('b', { style: `color:${r.color}` }, whole(r.n)),
      h('span', null, r.label)))),
    h('p', { class: 'home-note' },
      t(`of ${whole(state.total)} listed companies`, `من ${whole(state.total)} شركة مدرجة`)));
}

/* ── unusual volume: the complete list ──────────────────────────────────── */

export const UNUSUAL = 2;      // times its own 20-session median
export const HEAVY = 5;

/* Every company at the threshold, and not one fewer.
 *
 * This is the busiest card, re-formed. The old one showed four; four was our
 * choice, and a list of four we chose is a recommendation whatever it is
 * called. The threshold is still ours — stated, fixed, the same every day —
 * but the COUNT is the market's: today it is 37, tomorrow it may be 3, and
 * every one of them is shown. Alphabetical, because any other order is a
 * ranking with the column hidden. */
export function unusualVolume(table) {
  const rows = (table && table.rows) || [];
  const measured = rows.filter((r) => finite(r.relative_volume_20));
  const unusual = measured.filter((r) => r.relative_volume_20 >= UNUSUAL)
    .sort((a, b) => a.ticker.localeCompare(b.ticker));
  return {
    measured: measured.length,
    listed: rows.length,
    unusual,
    heavy: unusual.filter((r) => r.relative_volume_20 >= HEAVY).length,
  };
}

function volumeBlock(component, table, ar, t) {
  const v = unusualVolume(table);
  if (!v.measured) return null;
  const open = component.state.homeVolumeOpen !== false;   // open by default
  return h('section', { class: 'home-volume' },
    h('h2', null, t('Trading at an unusual volume', 'تداول بحجم غير معتاد')),
    h('p', { class: 'ask-counts' },
      h('b', null, whole(v.unusual.length)),
      h('span', null, t(
        `companies traded at ${UNUSUAL}× or more of their own 20-session median today · ${whole(v.heavy)} of them at ${HEAVY}× or more · of ${whole(v.measured)} with a median to compare against`,
        `شركة تداولت اليوم بـ${UNUSUAL}× أو أكثر من معتادها في 20 جلسة · ${whole(v.heavy)} منها بـ${HEAVY}× أو أكثر · من ${whole(v.measured)} لها معتاد يُقارَن به`))),
    v.unusual.length
      ? h('div', null,
          h('button', { type: 'button', class: 'q-cancel', 'aria-expanded': open ? 'true' : 'false',
            onClick: () => component.setState({ homeVolumeOpen: !open }) },
            open ? t('Hide the list', 'أخفِ القائمة') : t('Show all of them', 'اعرضها كلها')),
          open ? h('div', { class: 'ask-results' },
            v.unusual.map((r) => h('button', { key: r.ticker, type: 'button', class: 'ask-row',
              onClick: () => component.setState({ screen: 'company', ticker: r.ticker }) },
              h('b', null, r.ticker),
              h('span', { class: 'ask-why' },
                h('span', { class: 'ask-reason' }, `${r.relative_volume_20.toFixed(1)}× ${t('its median', 'معتادها')}`),
                h('span', { class: 'ask-reason', style: `color:${r.change_1 > 0 ? 'var(--up)' : r.change_1 < 0 ? 'var(--down)' : 'var(--t2)'}` }, signed(r.change_1))))),
            h('p', { class: 'home-note' }, t(
              'Every company at the threshold is listed, alphabetically. The threshold is the same every day; the count is whatever the market did. A multiple says a share was traded more than usual — not why, and not what it will do.',
              'كل شركة عند الحد مذكورة، أبجديًا. الحد ثابت كل يوم؛ والعدد هو ما فعله السوق. المضاعف يعني أن السهم تُدوول أكثر من المعتاد — لا لماذا، ولا ماذا سيفعل.'))) : null)
      : h('p', { class: 'home-note' }, t('No company traded at that multiple today.', 'لا شركة تداولت بذلك المضاعف اليوم.')));
}

/* ── the reader's question ──────────────────────────────────────────────── */

function askBlock(component, table, ar, t) {
  const st = component.state;
  const open = SUBJECTS.find((s) => s.id === st.homeSubject) || null;
  const chosen = open && (open.questions.find((q) => q.id === st.homeQuestion) || null);
  const reader = component._reader || null;

  const subjects = h('div', { class: 'ask-subjects' }, SUBJECTS.map((s) => h('button', {
    key: s.id, type: 'button',
    'aria-pressed': open && open.id === s.id ? 'true' : 'false',
    class: open && open.id === s.id ? 'ask-subject on' : 'ask-subject',
    onClick: () => component.setState({ homeSubject: open && open.id === s.id ? '' : s.id, homeQuestion: '' }),
  }, ar ? s.ar : s.en)));

  const mine = h('button', { type: 'button', class: 'q-cancel', onClick: () => component.setState({ screen: 'questions' }) },
    t(`My questions${(component._questions || []).length ? ` (${(component._questions || []).length})` : ''} →`,
      `أسئلتي${(component._questions || []).length ? ` (${(component._questions || []).length})` : ''} ←`));

  const head = [
    h('h2', null, t('What do you want to follow?', 'تحب تتابع إيه؟')),
    h('p', { class: 'home-sub' }, t(
      'Choose a subject, pick a question, and see every company that answers it — and why. Save the ones you want to keep.',
      'اختر موضوعًا، ثم سؤالًا، وشاهد كل شركة ينطبق عليها — ولماذا. احفظ ما تريد الاحتفاظ به.')),
  ];

  if (!table || !Array.isArray(table.rows) || !table.rows.length) {
    return h('section', { class: 'home-ask' }, ...head, subjects,
      h('p', { class: 'home-note' }, t('The measurements are still loading.', 'القياسات قيد التحميل.')), mine);
  }

  const listed = open ? open.questions.map((q) => {
    const result = RB.run(table, asRulebook(q));
    const isOpen = chosen && chosen.id === q.id;
    const saveIt = () => {
      const list = store.saveSynced(reader, { ...asRulebook(q), name: ar ? q.ar : q.en, id: store.newId() },
        (status) => component.setState({ qStatus: status }));
      component._questions = list;
      component.setState({ screen: 'questions', qOpen: list[0] && list[0].id });
    };
    return h('div', { key: q.id, class: 'ask-question' },
      h('button', { type: 'button', class: 'ask-open', 'aria-expanded': isOpen ? 'true' : 'false',
        onClick: () => component.setState({ homeQuestion: isOpen ? '' : q.id }) },
        h('span', { class: 'ask-sentence' }, ar ? q.ar : q.en),
        answerCounts(result, ar)),
      isOpen ? h('div', null,
        resultList(component, result, ar),
        h('div', { class: 'q-actions' },
          h('button', { type: 'button', class: 'q-save', onClick: saveIt }, t('Save this question', 'احفظ هذا السؤال')))) : null);
  }) : null;

  return h('section', { class: 'home-ask' }, ...head, subjects,
    listed ? h('div', { class: 'ask-questions' }, listed) : null,
    h('p', { class: 'home-note' }, t(
      'These are examples. Each is a condition you can change, and the answer is whatever the measurements say — including nothing.',
      'هذه أمثلة. كل واحد شرط يمكنك تغييره، والإجابة هي ما تقوله القياسات — بما في ذلك لا شيء.')),
    mine);
}

/* ── the models, as a ledger ────────────────────────────────────────────── */

/* Fixed order, not by score. The point of the table is that the numbers are
 * on record beside their uncertainty — not that one row sits on top. A reader
 * can see which is highest; the page does not say so for them. */
const MODEL_ROWS = [
  ['kronos', 'Kronos-small', 'Kronos-small', 'neural'],
  ['chronos2', 'Chronos-2', 'Chronos-2', 'neural'],
  ['timesfm25', 'TimesFM 2.5', 'TimesFM 2.5', 'neural'],
  ['rerank', 'Gemini, reading the other nine', 'Gemini يقرأ التسعة الآخرين', 'rerank'],
  ['momentum20', 'Momentum, 20 sessions', 'الزخم، 20 جلسة', 'baseline'],
  ['momentum60', 'Momentum, 60 sessions', 'الزخم، 60 جلسة', 'baseline'],
  ['reversal1', 'Reversal, 1 session', 'الانعكاس، جلسة', 'baseline'],
  ['reversal5', 'Reversal, 5 sessions', 'الانعكاس، 5 جلسات', 'baseline'],
  ['drift', 'Drift', 'الانجراف', 'baseline'],
  ['flat', 'Flat (says nothing)', 'ثابت (لا يقول شيئًا)', 'baseline'],
];

const ic = (v) => (finite(v) ? (v > 0 ? '+' : '') + v.toFixed(3) : '—');
const tstat = (v) => (finite(v) ? (v > 0 ? '+' : '') + v.toFixed(2) : '—');

export function arenaRows(arena, horizon = '1') {
  const models = (arena && arena.models) || {};
  return MODEL_ROWS.map(([id, en, ar, group]) => {
    const row = (models[id] || {})[horizon] || {};
    return { id, en, ar, group, present: Boolean(models[id]),
             dates: finite(row.dates) ? row.dates : 0, mean: row.mean, t: row.t,
             scored: row.scored, withheld: row.withheldDates };
  });
}

function arenaBlock(component, arena, ar, t) {
  if (!arena || !finite(arena.basisSessions) || arena.basisSessions <= 0) return null;
  const horizon = component.state.arenaHorizon === '5' ? '5' : '1';
  const rows = arenaRows(arena, horizon).filter((r) => r.present);
  const groupName = { neural: t('Time-series models', 'نماذج السلاسل الزمنية'),
                      rerank: t('After the rerank layer', 'بعد طبقة إعادة الترتيب'),
                      baseline: t('Baselines', 'المقارنات الأساسية') };
  let lastGroup = null;
  const body = [];
  for (const r of rows) {
    if (r.group !== lastGroup) {
      body.push(h('tr', { key: 'g' + r.group, class: 'arena-group' }, h('th', { colSpan: 5, scope: 'colgroup' }, groupName[r.group])));
      lastGroup = r.group;
    }
    body.push(h('tr', { key: r.id },
      h('th', { scope: 'row' }, ar ? r.ar : r.en),
      h('td', { class: 'arena-num' }, r.dates ? ic(r.mean) : t('not yet scored', 'لم يُقيَّم بعد')),
      h('td', { class: 'arena-num' }, r.dates ? tstat(r.t) : ''),
      h('td', { class: 'arena-num' }, r.dates ? whole(r.dates) : ''),
      h('td', { class: 'arena-num' }, r.dates && finite(r.scored) ? whole(r.scored) : '')));
  }
  const latest = arena.dates && arena.dates.length ? arena.dates[arena.dates.length - 1] : null;

  return h('section', { class: 'home-arena' },
    h('h2', null, t('The models, on record', 'النماذج، في السجل')),
    h('p', { class: 'home-sub' }, t(
      `Every evening after the close, ${whole(rows.length)} forecasters are run over every company and their forecasts are sealed — hashed, and timestamped by an independent authority — before the next session opens. When the horizons run out, they are scored against what the market did and opened in full.`,
      `كل مساء بعد الإغلاق، تُشغَّل ${whole(rows.length)} نماذج على كل شركة وتُختم توقعاتها — تُهشَّر وتُوثَّق زمنيًا لدى جهة مستقلة — قبل افتتاح الجلسة التالية. وحين تنتهي الآفاق، تُقيَّم مقابل ما فعله السوق وتُفتح كاملة.`)),
    h('div', { class: 'ask-subjects', role: 'group', 'aria-label': t('Horizon', 'الأفق') },
      ['1', '5'].map((hz) => h('button', { key: hz, type: 'button', class: horizon === hz ? 'ask-subject on' : 'ask-subject',
        'aria-pressed': horizon === hz ? 'true' : 'false', onClick: () => component.setState({ arenaHorizon: hz }) },
        hz === '1' ? t('Next session', 'الجلسة التالية') : t('Five sessions', 'خمس جلسات')))),
    h('div', { class: 'arena-scroll' },
      h('table', { class: 'arena-table' },
        h('thead', null, h('tr', null,
          h('th', { scope: 'col' }, t('Model', 'النموذج')),
          h('th', { scope: 'col', class: 'arena-num' }, t('Rank IC', 'ارتباط الترتيب')),
          h('th', { scope: 'col', class: 'arena-num' }, 't'),
          h('th', { scope: 'col', class: 'arena-num' }, t('Sessions', 'جلسات')),
          h('th', { scope: 'col', class: 'arena-num' }, t('Companies', 'شركات')))),
        h('tbody', null, body))),
    h('p', { class: 'home-note' }, t(
      `Rank IC is how well a model's ordering of the market matched what the market then did, one number per session, averaged. Above zero is better than random; ${whole(arena.basisSessions)} sessions is not enough to say any of these forecasts this exchange, and t says how far each mean is from noise. The Gemini row reads all the others' forecasts and forms its own ordering; it has been running since ${latest || '—'} and is scored on the same terms.`,
      `ارتباط الترتيب هو مدى تطابق ترتيب النموذج للسوق مع ما فعله السوق لاحقًا، رقم لكل جلسة، متوسطًا. فوق الصفر أفضل من العشوائي؛ و${whole(arena.basisSessions)} جلسات لا تكفي للقول إن أيًّا من هذه يتنبأ بهذه البورصة، وt تقول كم يبعد كل متوسط عن الضجيج. صف Gemini يقرأ توقعات الآخرين جميعًا ويكوّن ترتيبه الخاص؛ يعمل منذ ${latest || '—'} ويُقيَّم بالشروط نفسها.`)),
    h('p', { class: 'home-note' }, t(
      'A comparison of forecasters. It names no security, contains no forecast, and recommends nothing.',
      'مقارنة بين نماذج التنبؤ. لا تسمّي أي ورقة مالية، ولا تحوي توقعًا، ولا توصي بشيء.')));
}

/* ── the screen ─────────────────────────────────────────────────────────── */

export function homeScreen(component, data, ar) {
  const t = (en, arabic) => (ar ? arabic : en);
  const table = data.measures || null;
  const breadth = table && (table.breadth || sessionStates(table.rows));
  const when = table && table.market_date
    ? t(`Measurements as at the close of ${table.market_date}`, `القياسات حتى إغلاق ${table.market_date}`)
    : '';

  return {
    screen: h('div', { class: 'home-screen' },
      h('header', { class: 'home-intro' },
        h('h1', null, t('The Egyptian Exchange, measured — and the models on record',
                        'البورصة المصرية مقيسة — والنماذج في السجل')),
        h('p', null, t(
          'What the whole market did, which companies traded unusually, how the forecasters are doing, and any question you want to ask — answered in full.',
          'ماذا فعل السوق كله، أي الشركات تداولت بشكل غير معتاد، كيف تؤدي النماذج، وأي سؤال تريد طرحه — بإجابة كاملة.'))),
      breadthBlock(breadth, when, t),
      volumeBlock(component, table, ar, t),
      arenaBlock(component, data.arena, ar, t),
      askBlock(component, table, ar, t),
    ),
  };
}

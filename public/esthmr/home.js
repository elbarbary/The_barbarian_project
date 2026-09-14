/* Home: one question, asked of the whole market, answered completely.
 *
 * WHAT THIS REPLACED, AND WHY
 * ---------------------------
 * Home was a five-hundred-line scroll of everything the project holds: three
 * index cards, a busiest-four card, a twelve-company market-cap mosaic, a
 * movers board, a ranking panel, a news grid, a pulse strip, a dots grid. It
 * was a table of contents, and a reader arriving for the first time could not
 * tell from the first screen what the product was FOR.
 *
 * Several of those sections were also the one shape this publisher may not
 * make. ESTHMR is not licensed to advise, and the working line we hold is
 * about WHO FIXES THE CARDINALITY: a condition the reader states may
 * legitimately return none, three, or fifty companies, because the reader
 * chose both the test and how many pass it. "Today's six biggest movers" is a
 * list of six that we chose, and no wording around it changes that. The
 * mosaic was worse: it encoded our choice of twelve AND ranked them by area.
 *
 * (That line is this project's own boundary, drawn deliberately wide. It is
 * not a statutory safe harbour and no regulator has blessed it.)
 *
 * SO THE PAGE IS BUILT ON TWO THINGS ONLY
 * ---------------------------------------
 *   1. Facts about the WHOLE market, which select nothing. "170 of 283 fell"
 *      picks no company and cannot be read as a suggestion, and it is what a
 *      reader genuinely wants first: it says whether what they are about to
 *      look at is one company's move or the tide.
 *
 *   2. The reader's own question, answered in full. Every company that meets
 *      their condition, with the figures that put it there — and the two
 *      other counts beside it, because "five matched" means nothing without
 *      "and 248 did not, and 30 could not be judged at all".
 *
 * WHAT THIS DELIBERATELY DOES NOT DO
 * ----------------------------------
 * It does not order the starter questions by how many companies they return,
 * or mark one as interesting today. That would be us choosing again, through
 * the back door: the question with the most matches is not the best question,
 * and putting it first says that it is.
 *
 * It does not say a saved question is being WATCHED. The engine runs in the
 * reader's browser when they open the page. Until snapshots are stored, the
 * honest sentence is "applied to the latest data", and the copy here says
 * exactly that.
 */

import { React as R } from './react-shim.js';
import * as RB from './rulebook.js';

const h = R.createElement;
const finite = (v) => typeof v === 'number' && Number.isFinite(v);
const whole = (v) => (finite(v) ? new Intl.NumberFormat('en').format(Math.round(v)) : '—');
const signed = (v) => (finite(v) ? `${v > 0 ? '+' : ''}${v.toFixed(2)}%` : '—');

/* ── the session, described and not summarised ──────────────────────────── */

/* The five states every listing is in, exactly one each.
 *
 * `idle` and `level` are kept apart on purpose and it is the whole reason
 * this block is worth the space. Forty companies found no buyer today and
 * thirteen traded and closed where they opened. Reporting "53 unchanged"
 * would tell a reader that fifty-three companies were steady, when forty of
 * them could not be sold at any price. On this exchange that difference is
 * most of what a newcomer has to understand. */
/* The same five states the builder computes, in the browser.
 *
 * Used for the signed-out demo, which has rows and no published breadth. It
 * exists in two languages, which is a risk — so `home-screen.test.mjs`
 * asserts that this reproduces the published block exactly on the real table.
 * If the two ever disagree, that test says so on the next run.
 */
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
    // The denominator, always, and in the same breath as the counts.
    h('p', { class: 'home-note' },
      t(`of ${whole(state.total)} listed companies`,
        `من ${whole(state.total)} شركة مدرجة`)),
  );
}

/* ── the reader's question ──────────────────────────────────────────────── */

/* Starter questions, as QUESTIONS.
 *
 * The danger here is obvious and worth naming: a set of ready-made rules
 * chosen by us is our selection wearing the reader's clothes. Three things
 * keep it honest, and all three are load-bearing.
 *
 * They are phrased as questions about the market, not as things worth owning.
 * None of them is "companies worth buying"; every one of them is a condition
 * whose answer might be nothing.
 *
 * Every one shows its complete answer including zero, and including the two
 * counts beside the match count. A question that returns nothing today is
 * shown returning nothing.
 *
 * And the order is fixed. Sorting them by how many companies they return —
 * or marking one as interesting today — would be us choosing again, because
 * the question with the most matches is not the best question.
 */
const SUBJECTS = [
  {
    id: 'move', en: 'Price move', ar: 'حركة السعر',
    questions: [
      { id: 'up-today-down-month',
        en: 'Rose today but is lower than a month ago',
        ar: 'ارتفعت اليوم لكنها أقل من شهر مضى',
        conditions: [{ column: 'change_1', op: '>', value: 0 },
                     { column: 'change_20', op: '<', value: 0 }] },
      { id: 'moved-5',
        en: 'Moved more than 5% today',
        ar: 'تحركت أكثر من 5% اليوم',
        match: 'any',
        conditions: [{ column: 'change_1', op: '>=', value: 5 },
                     { column: 'change_1', op: '<=', value: -5 }] },
      { id: 'up-month',
        en: 'Is higher than it was twenty sessions ago',
        ar: 'أعلى مما كانت عليه قبل عشرين جلسة',
        conditions: [{ column: 'change_20', op: '>', value: 0 }] },
    ],
  },
  {
    id: 'volume', en: 'Trading volume', ar: 'حجم التداول',
    questions: [
      { id: 'twice-normal',
        en: 'Traded at twice its own normal volume',
        ar: 'تداولت بضعف حجمها المعتاد',
        conditions: [{ column: 'relative_volume_20', op: '>=', value: 2 }] },
      { id: 'five-times',
        en: 'Traded at five times its own normal volume',
        ar: 'تداولت بخمسة أضعاف حجمها المعتاد',
        conditions: [{ column: 'relative_volume_20', op: '>=', value: 5 }] },
      { id: 'no-buyer',
        en: 'Found no buyer at all today',
        ar: 'لم تتداول اليوم إطلاقًا',
        conditions: [{ column: 'volume', op: '<=', value: 0 }] },
    ],
  },
  {
    id: 'results', en: 'Results', ar: 'نتائج الأعمال',
    questions: [
      { id: 'profit-grew',
        en: 'Net profit grew against the same period last year',
        ar: 'نما صافي ربحها مقارنة بالعام الماضي',
        conditions: [{ column: 'net_income_growth', op: '>', value: 0 }] },
      { id: 'profit-fell',
        en: 'Net profit fell against the same period last year',
        ar: 'تراجع صافي ربحها مقارنة بالعام الماضي',
        conditions: [{ column: 'net_income_growth', op: '<', value: 0 }] },
      { id: 'due-soon',
        en: 'Results are expected within six weeks',
        ar: 'نتائجها متوقعة خلال ستة أسابيع',
        conditions: [{ column: 'results_due_in_days', op: '>=', value: 0 },
                     { column: 'results_due_in_days', op: '<=', value: 42 }] },
    ],
  },
  {
    id: 'filings', en: 'Disclosures', ar: 'الإفصاحات',
    questions: [
      { id: 'filed-recently',
        en: 'Filed something in the last five sessions',
        ar: 'أفصحت عن شيء خلال آخر خمس جلسات',
        conditions: [{ column: 'sessions_since_filing', op: '<=', value: 5 }] },
      { id: 'silent',
        en: 'Has filed nothing for thirty sessions',
        ar: 'لم تفصح عن شيء منذ ثلاثين جلسة',
        conditions: [{ column: 'sessions_since_filing', op: '>=', value: 30 }] },
      { id: 'streak',
        en: 'Broke a run its own filings had kept',
        ar: 'كسرت سلسلة حافظت عليها إفصاحاتها',
        conditions: [{ column: 'streak_break', op: 'has' }] },
    ],
  },
];

export function questionFor(subjectId, questionId) {
  const subject = SUBJECTS.find((s) => s.id === subjectId);
  const question = subject && subject.questions.find((q) => q.id === questionId);
  return question ? { subject, question } : null;
}

export function asRulebook(question) {
  return { conditions: question.conditions, match: question.match === 'any' ? 'any' : 'all' };
}

/* The three counts, always together.
 *
 * A reader looking at five matches is owed the difference between "248 did
 * not meet your condition" and "30 could not be judged because the figures
 * are not there". The second is a statement about this archive, not about
 * those companies, and collapsing them would let a gap in our data read as a
 * finding about the market. */
function answerCounts(result, t) {
  return h('p', { class: 'ask-counts' },
    h('b', null, whole(result.total)),
    h('span', null, t(
      `matched · ${whole(result.didNotMatch)} did not · ${whole(result.couldNotJudge)} could not be judged · of ${whole(result.universe)}`,
      `مطابقة · ${whole(result.didNotMatch)} غير مطابقة · ${whole(result.couldNotJudge)} تعذّر الحكم عليها · من ${whole(result.universe)}`)));
}

/* Why this company is here: the figures that put it there, and nothing else.
 *
 * Not why its price moved. A filing on the same day is context, not cause,
 * and this publisher is in no position to claim the second. */
function reasons(entry, table, ar) {
  return (entry.met || []).map((condition, i) => h('span', { key: i, class: 'ask-reason' },
    RB.explain(entry.row, condition, ar)));
}

function askBlock(component, table, ar, t) {
  const st = component.state;
  const open = SUBJECTS.find((s) => s.id === st.homeSubject) || null;
  const chosen = open && (open.questions.find((q) => q.id === st.homeQuestion) || null);

  const subjects = h('div', { class: 'ask-subjects' }, SUBJECTS.map((s) => h('button', {
    key: s.id, type: 'button',
    'aria-pressed': open && open.id === s.id ? 'true' : 'false',
    class: open && open.id === s.id ? 'ask-subject on' : 'ask-subject',
    onClick: () => component.setState({
      homeSubject: open && open.id === s.id ? '' : s.id, homeQuestion: '' }),
  }, ar ? s.ar : s.en)));

  if (!table || !Array.isArray(table.rows) || !table.rows.length) {
    return h('section', { class: 'home-ask' },
      h('h2', null, t('What do you want to follow?', 'تحب تتابع إيه؟')),
      h('p', { class: 'home-sub' }, t(
        'Choose a subject, pick a question, and see every company that answers it.',
        'اختر موضوعًا، ثم سؤالًا، وشاهد كل شركة ينطبق عليها.')),
      subjects,
      h('p', { class: 'home-note' }, t('The measurements are still loading.',
                                       'القياسات قيد التحميل.')));
  }

  const listed = open ? open.questions.map((q) => {
    const result = RB.run(table, asRulebook(q));
    const isOpen = chosen && chosen.id === q.id;
    return h('div', { key: q.id, class: 'ask-question' },
      h('button', { type: 'button', class: 'ask-open',
        'aria-expanded': isOpen ? 'true' : 'false',
        onClick: () => component.setState({ homeQuestion: isOpen ? '' : q.id }) },
        h('span', { class: 'ask-sentence' }, ar ? q.ar : q.en),
        answerCounts(result, t)),
      isOpen ? h('div', { class: 'ask-results' },
        result.results.length
          ? result.results.map((entry) => h('button', {
              key: entry.ticker, type: 'button', class: 'ask-row',
              onClick: () => component.setState({ screen: 'company', ticker: entry.ticker }),
            },
            h('b', null, entry.ticker),
            h('span', { class: 'ask-why' }, reasons(entry, table, ar))))
          // Zero is an answer and is shown as one.
          : h('p', { class: 'home-note' }, t('No company answers this today.',
                                             'لا توجد شركة ينطبق عليها هذا اليوم.')),
        h('p', { class: 'home-note' }, t(
          'Every company that answers is listed, in alphabetical order. Nothing is left out and nothing is ranked.',
          'كل شركة ينطبق عليها مذكورة، بالترتيب الأبجدي. لا شيء محذوف ولا شيء مرتّب بالأفضلية.')),
      ) : null);
  }) : null;

  return h('section', { class: 'home-ask' },
    h('h2', null, t('What do you want to follow?', 'تحب تتابع إيه؟')),
    h('p', { class: 'home-sub' }, t(
      'Choose a subject, pick a question, and see every company that answers it — and why.',
      'اختر موضوعًا، ثم سؤالًا، وشاهد كل شركة ينطبق عليها — ولماذا.')),
    subjects,
    listed ? h('div', { class: 'ask-questions' }, listed) : null,
    h('p', { class: 'home-note' }, t(
      'These questions are examples. Each one is a condition you can change, and the answer is whatever the measurements say — including nothing.',
      'هذه الأسئلة أمثلة. كل واحد منها شرط يمكنك تغييره، والإجابة هي ما تقوله القياسات — بما في ذلك لا شيء.')),
  );
}

/* ── the research ledger ────────────────────────────────────────────────── */

/* Deliberately not a leaderboard.
 *
 * Eight scorable dates demonstrate a process. They do not establish that any
 * model forecasts this exchange, and a podium on the home page would claim
 * they do. So this says how much evidence exists and links to the rest, and
 * the one sentence it commits to is that there is not yet enough to judge.
 *
 * The nightly layer's own count — "32 of 260 worth anything tonight" — is
 * kept off this page on purpose. It names no security and it is still an
 * opportunity gauge: "only 32 are worth anything" invites exactly the reading
 * this project must not invite, and its precision far exceeds what eight
 * dates can support. It belongs in the methodology, with its definition.
 */
function arenaBlock(arena, t) {
  if (!arena || !finite(arena.basisSessions) || arena.basisSessions <= 0) return null;
  return h('section', { class: 'home-arena' },
    h('h2', null, t('We test the models before relying on them',
                    'نختبر النماذج قبل أن نعتمد عليها')),
    h('p', { class: 'arena-count' },
      h('b', null, whole(arena.basisSessions)),
      h('span', null, t('sessions scored so far', 'جلسة مقيّمة حتى الآن'))),
    h('p', { class: 'home-note' }, t(
      'That is not yet enough evidence to say any model forecasts this exchange. Every forecast is sealed and timestamped by an independent authority on the night it is made, and opened in full once its horizons have run out.',
      'هذا ليس دليلًا كافيًا بعد للقول إن أي نموذج يتنبأ بهذه البورصة. كل تنبؤ يُختم ويُوثَّق زمنيًا لدى جهة مستقلة ليلة إصداره، ويُفتح كاملًا بعد انتهاء آفاقه.')),
    arena.dates && arena.dates.length
      ? h('p', { class: 'home-note' }, t(
          `Most recent sealed session: ${arena.dates[arena.dates.length - 1]}`,
          `آخر جلسة مختومة: ${arena.dates[arena.dates.length - 1]}`))
      : null,
  );
}

/* ── the screen ─────────────────────────────────────────────────────────── */

export function homeScreen(component, data, ar) {
  const t = (en, arabic) => (ar ? arabic : en);
  const table = data.measures || null;
  // The published block where there is one, and the same arithmetic in the
  // browser where there is not — which is the signed-out demo.
  const breadth = table && (table.breadth || sessionStates(table.rows));
  const when = table && table.market_date
    ? t(`Measurements as at the close of ${table.market_date}`,
        `القياسات حتى إغلاق ${table.market_date}`)
    : '';

  return {
    screen: h('div', { class: 'home-screen' },
      h('header', { class: 'home-intro' },
        h('h1', null, t('Understand the Egyptian Exchange on your own terms',
                        'افهم البورصة المصرية بشروطك')),
        h('p', null, t(
          'Choose what you want to follow. See every company that matches, and why.',
          'اختر ما تحب متابعته. شاهد كل شركة تنطبق عليها الشروط، واعرف السبب.'))),
      breadthBlock(breadth, when, t),
      askBlock(component, table, ar, t),
      arenaBlock(data.arena, t),
    ),
  };
}

/* What Home and the questions screen share: the starter questions, the columns
 * a reader may ask about, and the two renderings every answer is made of.
 *
 * THE THREE COUNTS, ALWAYS TOGETHER
 * A reader looking at five matches is owed the difference between "248 did
 * not meet your condition" and "30 could not be judged because the figures
 * are not there". The second is a statement about this archive, not about
 * those companies, and collapsing it into the first would let a gap in our
 * data read as a finding about the market.
 *
 * WHY THIS COMPANY IS HERE, AND ONLY THAT
 * The figures that put it in the answer. Not why its price moved: a filing on
 * the same day is context, not cause, and this publisher is in no position to
 * claim the second.
 */
import { React as R } from './react-shim.js';
import * as RB from './rulebook.js';

const h = R.createElement;
export const finite = (v) => typeof v === 'number' && Number.isFinite(v);
export const whole = (v) => (finite(v) ? new Intl.NumberFormat('en').format(Math.round(v)) : '—');

/* The columns a reader may build a question on, with words a person would
 * use. The published table carries an English description of every column;
 * these are the short labels the editor shows, in both languages, for the
 * ones worth offering. A column not listed here is still answerable — the
 * engine names no column — but the editor does not put it in front of a
 * reader who has not asked for it. */
export const COLUMNS = [
  { id: 'change_1', en: 'Change today (%)', ar: 'تغيّر اليوم (%)', kind: 'number' },
  { id: 'change_5', en: 'Change over 5 sessions (%)', ar: 'التغيّر خلال 5 جلسات (%)', kind: 'number' },
  { id: 'change_20', en: 'Change over 20 sessions (%)', ar: 'التغيّر خلال 20 جلسة (%)', kind: 'number' },
  { id: 'relative_volume_20', en: 'Volume vs its own 20-session median (×)', ar: 'الحجم نسبةً إلى معتاده في 20 جلسة (×)', kind: 'number' },
  { id: 'volume', en: 'Volume today (shares)', ar: 'حجم التداول اليوم (سهم)', kind: 'number' },
  { id: 'traded_value', en: 'Value traded today (EGP)', ar: 'قيمة التداول اليوم (جنيه)', kind: 'number' },
  { id: 'market_cap', en: 'Market value (EGP)', ar: 'القيمة السوقية (جنيه)', kind: 'number' },
  { id: 'revenue', en: 'Revenue, last filed (EGP)', ar: 'الإيرادات، آخر إفصاح (جنيه)', kind: 'number' },
  { id: 'net_income', en: 'Net profit, last filed (EGP)', ar: 'صافي الربح، آخر إفصاح (جنيه)', kind: 'number' },
  { id: 'net_income_growth', en: 'Net profit growth, year on year (%)', ar: 'نمو صافي الربح سنويًا (%)', kind: 'number' },
  { id: 'eps', en: 'Earnings per share', ar: 'ربحية السهم', kind: 'number' },
  { id: 'sessions_since_filing', en: 'Sessions since its last filing', ar: 'جلسات منذ آخر إفصاح', kind: 'number' },
  { id: 'filings_30d', en: 'Filings in the last 30 days', ar: 'إفصاحات آخر 30 يومًا', kind: 'number' },
  { id: 'results_due_in_days', en: 'Days until its results window opens', ar: 'أيام حتى نافذة نتائجها', kind: 'number' },
  { id: 'big_move_5', en: 'Sessions with a big move, last 5', ar: 'جلسات بحركة كبيرة، آخر 5', kind: 'number' },
  { id: 'streak_break', en: 'Broke a run its filings had kept', ar: 'كسرت سلسلة حافظت عليها', kind: 'event' },
  { id: 'first_in_years', en: 'Did something for the first time in years', ar: 'فعلت شيئًا لأول مرة منذ سنوات', kind: 'event' },
];

export const columnLabel = (id, ar) => {
  const c = COLUMNS.find((x) => x.id === id);
  return c ? (ar ? c.ar : c.en) : id;
};

/* Starter questions, as QUESTIONS.
 *
 * A set of ready-made rules chosen by us is our selection wearing the reader's
 * clothes, unless three things hold, and all three are load-bearing: they are
 * phrased as conditions about the market and never as things worth owning;
 * every one shows its complete answer, including nothing; and the order is
 * fixed — sorting them by how many companies they return would be us
 * choosing again, because the question with the most matches is not the
 * better question and the position would say it is. */
export const SUBJECTS = [
  {
    id: 'move', en: 'Price move', ar: 'حركة السعر',
    questions: [
      { id: 'up-today-down-month', en: 'Rose today but is lower than a month ago',
        ar: 'ارتفعت اليوم لكنها أقل من شهر مضى',
        conditions: [{ column: 'change_1', op: '>', value: 0 },
                     { column: 'change_20', op: '<', value: 0 }] },
      { id: 'moved-5', en: 'Moved more than 5% today', ar: 'تحركت أكثر من 5% اليوم',
        match: 'any',
        conditions: [{ column: 'change_1', op: '>=', value: 5 },
                     { column: 'change_1', op: '<=', value: -5 }] },
      { id: 'up-month', en: 'Is higher than it was twenty sessions ago',
        ar: 'أعلى مما كانت عليه قبل عشرين جلسة',
        conditions: [{ column: 'change_20', op: '>', value: 0 }] },
    ],
  },
  {
    id: 'volume', en: 'Trading volume', ar: 'حجم التداول',
    questions: [
      { id: 'twice-normal', en: 'Traded at twice its own normal volume',
        ar: 'تداولت بضعف حجمها المعتاد',
        conditions: [{ column: 'relative_volume_20', op: '>=', value: 2 }] },
      { id: 'five-times', en: 'Traded at five times its own normal volume',
        ar: 'تداولت بخمسة أضعاف حجمها المعتاد',
        conditions: [{ column: 'relative_volume_20', op: '>=', value: 5 }] },
      { id: 'no-buyer', en: 'Found no buyer at all today', ar: 'لم تتداول اليوم إطلاقًا',
        conditions: [{ column: 'volume', op: '<=', value: 0 }] },
    ],
  },
  {
    id: 'results', en: 'Results', ar: 'نتائج الأعمال',
    questions: [
      { id: 'profit-grew', en: 'Net profit grew against the same period last year',
        ar: 'نما صافي ربحها مقارنة بالعام الماضي',
        conditions: [{ column: 'net_income_growth', op: '>', value: 0 }] },
      { id: 'profit-fell', en: 'Net profit fell against the same period last year',
        ar: 'تراجع صافي ربحها مقارنة بالعام الماضي',
        conditions: [{ column: 'net_income_growth', op: '<', value: 0 }] },
      { id: 'due-soon', en: 'Results are expected within six weeks',
        ar: 'نتائجها متوقعة خلال ستة أسابيع',
        conditions: [{ column: 'results_due_in_days', op: '>=', value: 0 },
                     { column: 'results_due_in_days', op: '<=', value: 42 }] },
    ],
  },
  {
    id: 'filings', en: 'Disclosures', ar: 'الإفصاحات',
    questions: [
      { id: 'filed-recently', en: 'Filed something in the last five sessions',
        ar: 'أفصحت عن شيء خلال آخر خمس جلسات',
        conditions: [{ column: 'sessions_since_filing', op: '<=', value: 5 }] },
      { id: 'silent', en: 'Has filed nothing for thirty sessions',
        ar: 'لم تفصح عن شيء منذ ثلاثين جلسة',
        conditions: [{ column: 'sessions_since_filing', op: '>=', value: 30 }] },
      { id: 'streak', en: 'Broke a run its own filings had kept',
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

export const asRulebook = (q) => ({
  conditions: q.conditions, match: q.match === 'any' ? 'any' : 'all',
});

/** One condition in words a reader would use, both languages. */
export function describe(condition, ar) {
  const op = RB.OPERATORS[condition.op];
  const label = columnLabel(condition.column, ar);
  if (!op) return label;
  const word = ar ? op.label_ar : op.label;
  if (op.kind === 'absence') return `${label} — ${word}`;
  const value = Array.isArray(condition.value) ? condition.value.join(', ') : condition.value;
  return `${label} ${word} ${value}`;
}

/** A saved question as a sentence: its name, or its conditions joined. */
export function sentence(question, ar) {
  if (question.name) return question.name;
  const joiner = question.match === 'any' ? (ar ? ' أو ' : ' or ') : (ar ? ' و ' : ' and ');
  return question.conditions.map((c) => describe(c, ar)).join(joiner);
}

export function answerCounts(result, ar) {
  return h('p', { class: 'ask-counts' },
    h('b', null, whole(result.total)),
    h('span', null, ar
      ? `مطابقة · ${whole(result.didNotMatch)} غير مطابقة · ${whole(result.couldNotJudge)} تعذّر الحكم عليها · من ${whole(result.universe)}`
      : `matched · ${whole(result.didNotMatch)} did not · ${whole(result.couldNotJudge)} could not be judged · of ${whole(result.universe)}`));
}

export function reasons(entry, ar) {
  return (entry.met || []).map((condition, i) => h('span', { key: i, class: 'ask-reason' },
    RB.explain(entry.row, condition, ar)));
}

/** Every company that answers, alphabetically, with why. Nothing held back. */
export function resultList(component, result, ar) {
  if (!result.results.length) {
    return h('p', { class: 'home-note' },
      ar ? 'لا توجد شركة ينطبق عليها هذا اليوم.' : 'No company answers this today.');
  }
  return h('div', { class: 'ask-results' },
    result.results.map((entry) => h('button', {
      key: entry.ticker, type: 'button', class: 'ask-row',
      onClick: () => component.setState({ screen: 'company', ticker: entry.ticker }),
    }, h('b', null, entry.ticker), h('span', { class: 'ask-why' }, reasons(entry, ar)))),
    h('p', { class: 'home-note' }, ar
      ? 'كل شركة ينطبق عليها مذكورة، بالترتيب الأبجدي. لا شيء محذوف ولا شيء مرتّب بالأفضلية.'
      : 'Every company that answers is listed, in alphabetical order. Nothing is left out and nothing is ranked.'));
}

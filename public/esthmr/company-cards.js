/* The company's own business cards — turn 4, block 11.
 *
 * The comp gives the company screen the same card shape Home uses for ما
 * تغيّر اليوم: a dateline, the name of the shape it is drawn in, one
 * sentence, one picture, what the picture does NOT say, and the document it
 * came from. What changes is the scope — every figure here is about the one
 * company on screen.
 *
 * WHY THESE TWO, AND NOT A THIRD OF THE SAME SHAPE
 * The overview already draws this company's price (with the market rebased
 * behind it) and its financials period by period. Repeating either as a card
 * would be decoration. These two answer questions the screen does not:
 *
 *   How busy was this, for THIS company? A share that trades a few thousand
 *   lots a session and a share that trades millions both look like "volume:
 *   118,422" on a tile. Against its own twenty-session median it becomes a
 *   fact a reader can act on knowing.
 *
 *   How often does this company actually file? A list of six filings says
 *   nothing about cadence. Put on a dated axis, a company that files twice a
 *   year and one that filed four times last month look different at a glance.
 *
 * Every card that cannot find its own published figures is not drawn. There
 * is no placeholder card and no "—": an absent document is an absent card.
 */
import { React as R } from './react-shim.js';
import { pairedBars, datedTimeline, evidenceChip, finite } from './primitives.js';

const h = R.createElement;

const compact = (v) => (finite(v)
  ? new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(v)
  : '—');

/** The card frame, shared with ما تغيّر اليوم so the two read as one family. */
function card({ dateline, primitive, title, visual, limit, chip, key }) {
  if (!visual) return null;
  return h('article', { key, class: 'ct-card' },
    h('div', { class: 'ct-head' },
      h('span', { class: 'ct-dateline' }, dateline),
      h('span', { class: 'ct-primitive' }, primitive)),
    h('h3', { class: 'ct-title' }, title),
    h('div', { class: 'ct-rule' }),
    h('div', { class: 'ct-visual' }, visual),
    h('p', { class: 'ct-limit' }, limit),
    h('div', { class: 'ct-rule' }),
    h('div', { class: 'ct-foot' }, chip));
}

/** This session's volume against the company's own twenty-session median. */
function volumeCard(row, marketDate, ar, t) {
  if (!row || !finite(row.volume) || !finite(row.medianVolume) || !(row.medianVolume > 0)) return null;
  const times = row.volume / row.medianVolume;
  return card({
    key: 'co-volume',
    dateline: t(`${marketDate} · close`, `${marketDate} · إغلاق`),
    primitive: t('PAIRED BARS', 'أعمدة مزدوجة'),
    title: t(`This session it traded ${times.toFixed(1)}× its usual volume`,
      `تداولت في هذه الجلسة ${times.toFixed(1)}× حجمها المعتاد`),
    visual: pairedBars({ ar, height: 116, groups: [{
      prior: row.medianVolume, now: row.volume,
      priorLabel: t('usual', 'المعتاد'), nowPeriodLabel: t('this session', 'هذه الجلسة'),
      priorValue: compact(row.medianVolume), nowValue: compact(row.volume),
      unit: t('shares', 'سهم'),
    }] }),
    limit: t('Volume is activity, not interest. A busy session can be one holder leaving, and a quiet one can follow news nobody traded on.',
      'الحجم نشاط وليس اهتماماً. قد تكون الجلسة النشطة خروج مالك واحد، وقد تتبع الجلسة الهادئة خبراً لم يتداول عليه أحد.'),
    chip: evidenceChip({ ar, date: marketDate,
      basis: t('session volume ÷ median of 20 sessions', 'حجم الجلسة ÷ وسيط 20 جلسة'),
      source: 'EGX' }),
  });
}

/** When this company filed, on a dated axis. */
function filingsCard(filings, ar, t, kindOf, shortDate, day) {
  const rows = (filings || []).filter((f) => f && f.date)
    .slice().sort((a, b) => String(a.date).localeCompare(String(b.date)));
  /* One dot is a date, not a cadence. */
  if (rows.length < 3) return null;
  /* The axis places events evenly, so showing every filing a prolific company
     ever made would draw a hundred dots and say nothing. The most recent six
     is the window the comp uses, and the dateline says it is a window. */
  const shown = rows.slice(-6);
  return card({
    key: 'co-filings',
    dateline: t(`${shown.length} most recent filings · one document each`,
      `آخر ${shown.length} إفصاحات · مستند واحد لكل إفصاح`),
    primitive: t('DATED TIMELINE', 'خط زمني مؤرَّخ'),
    title: t('When this company filed', 'متى أفصحت هذه الشركة'),
    visual: datedTimeline({ ar, width: 460, height: 104,
      events: shown.map((f) => ({ date: shortDate(f.date), label: kindOf(f) || '' })),
      note: t('Evenly spaced on the axis by order, not by the time between them.',
        'موزّعة على المحور بالترتيب، لا بالمدة بين واحدة وأخرى.') }),
    limit: t('What was filed, not everything that happened. A company that files rarely is not a company where little happens.',
      'ما أُفصح عنه، لا كل ما حدث. الشركة التي تُفصح نادراً ليست شركة يحدث فيها القليل.'),
    chip: evidenceChip({ ar, date: day(shown[shown.length - 1].date),
      basis: t('EGX disclosure archive', 'أرشيف إفصاحات البورصة'), source: 'EGX' }),
  });
}

export function companyCards({ row, filings, marketDate, ar, heading, kindOf, shortDate, longDate }) {
  const t = (en, arabic) => (ar ? arabic : en);
  /* The dateline is prose, so it takes the site's long date — a bare ISO
     string in the middle of an Arabic sentence reads as a machine artefact.
     The timeline's own tick labels keep the short form, which is what fits
     under a dot. */
  const day = typeof longDate === 'function' ? longDate : (iso) => iso;
  const cards = [volumeCard(row, day(marketDate), ar, t),
    filingsCard(filings, ar, t, kindOf, shortDate, day)].filter(Boolean);
  if (!cards.length) return null;
  return h('section', { class: 'ct-shelf co-cards', 'aria-label': heading },
    h('div', { class: 'ct-shelf-head' }, h('h2', null, heading)),
    h('div', { class: 'ct-grid' }, cards));
}

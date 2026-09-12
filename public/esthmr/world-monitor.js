/* What moved outside Egypt, and which filings it reaches.
 *
 * The screen exists to be used rather than admired, so it is built around the
 * question a reader actually arrives with — *does this reach anything I hold?*
 * — and not around the prettiest way to draw a price.
 *
 * Three honesty rules are in the drawing rather than under it.
 *
 * A move is shown against its own history, never on its own. "Oil rose 8.6%"
 * means nothing without knowing that a typical week is 3.2%, and the bar
 * beside each figure is that comparison, not the size of the move.
 *
 * A company list is the COMPLETE set that filed the figure, in alphabetical
 * order. Ordering by size of exposure would be a leaderboard whichever words
 * sat above it, and the publisher would be the one choosing who is at the top.
 *
 * And nothing here says what any of it means for a share price. The channels
 * ask where a move LANDS — which is a fact about a balance sheet — and stop.
 */

import { React as R } from './react-shim.js';

const h = R.createElement;
const finite = (v) => typeof v === 'number' && Number.isFinite(v);
const pct = (v) => (finite(v) ? `${v > 0 ? '+' : ''}${v.toFixed(2)}%` : '—');
const money = (v) => (finite(v)
  ? new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 2 }).format(v)
  : '—');
/* Filings are stated in millions, so a compact format of the raw figure and an
   "m" after it gives ADPC "1.42Km" — one and a half thousand million, written
   as if it were a typo. The scale is applied before the formatter instead. */
const filed = (v) => (finite(v) ? `${money(v * 1e6)} EGP` : '—');
const tone = (v) => (v > 0 ? 'var(--up)' : v < 0 ? 'var(--down)' : 'var(--t2)');

export const WINDOWS = [
  ['week', 'This week', 'هذا الأسبوع'],
  ['month', 'This month', 'هذا الشهر'],
  ['quarter', 'This quarter', 'هذا الربع'],
];

/** How remarkable a move was, in words a reader can check against the number. */
export function remark(against, t) {
  if (!against || !finite(against.percentile)) {
    return t('not enough history to compare', 'لا يوجد تاريخ كافٍ للمقارنة');
  }
  return t(
    `bigger than ${against.percentile.toFixed(0)}% of them, where a typical one is ${against.typical}%`,
    `أكبر من ${against.percentile.toFixed(0)}٪ منها، والمعتاد ${against.typical}٪`);
}

function moveRow(row, window_, ar, t) {
  const move = (row.moves || {})[window_];
  if (!move) return null;
  const against = move.against;
  const share = against && finite(against.percentile) ? against.percentile : 0;
  return h('div', { key: row.id, className: 'wm-move' },
    h('div', { className: 'wm-move-name' },
      h('strong', null, row.label),
      h('small', { dir: 'ltr' }, `${row.asOf} · ${money(row.close)}`)
    ),
    h('strong', { className: 'wm-move-change', dir: 'ltr', style: { color: tone(move.change) } },
      pct(move.change)),
    // The bar is how UNUSUAL the move was, not how big. A reader who reads it
    // as size would have oil and the EGX 30 the wrong way round this week.
    h('div', { className: 'wm-move-bar', 'aria-hidden': 'true' },
      h('i', { style: { width: `${Math.max(2, Math.min(100, share))}%` } })),
    h('small', { className: 'wm-move-against' }, remark(against, t))
  );
}

/* Each channel names the three figures it shows and the words above them.
 *
 * This was a `rates ? ... : ...` while there were two of them, which is the
 * shape that quietly decides there will never be a third. A channel is a
 * question plus three filed numbers, so it is written as one. */
const CHANNELS = {
  rates: {
    eyebrow: ['THE COST OF MONEY', 'تكلفة الاقتراض'],
    figures: (c, t) => [
      [t('Borrowings', 'القروض'), filed(c.borrowings)],
      [t('Reprices within a year', 'تُسعّر خلال عام'),
        finite(c.repricingWithinAYear) ? `${c.repricingWithinAYear}%` : '—'],
      [t('Interest cover', 'تغطية الفوائد'),
        finite(c.cover) ? `${c.cover.toFixed(2)}×` : '—'],
    ],
    warn: (c, t) => c.costExceedsBorrowings && t(
      'filed a finance cost larger than the borrowings it pays for',
      'أودعت تكلفة تمويل أكبر من القروض التي تخصها'),
  },
  inputs: {
    eyebrow: ['THE COST OF THINGS', 'تكلفة المدخلات'],
    figures: (c, t) => [
      [t('Revenue', 'الإيرادات'), filed(c.revenue)],
      [t('Gross profit', 'مجمل الربح'), filed(c.grossProfit)],
      [t('Cushion', 'الفارق'), finite(c.grossMargin) ? `${c.grossMargin}%` : '—'],
    ],
  },
  currency: {
    eyebrow: ['THE PRICE OF THE POUND', 'سعر الجنيه'],
    figures: (c, t) => [
      [t('Currency result filed', 'فروق العملة المودعة'), filed(c.fxResult),
        tone(c.fxResult)],
      [t('Of the period’s profit', 'من ربح الفترة'),
        finite(c.shareOfNetIncome) ? `${c.shareOfNetIncome}%` : '—'],
      [t('Profit filed', 'الربح المودع'), filed(c.netIncome)],
    ],
    // The position is however many currencies the note printed, so it is a
    // row of its own rather than a fourth figure squeezed into three slots.
    extra: (c, t) => (c.position || []).length ? h('div', { className: 'wm-row-fx' },
      h('small', null, t('Held in', 'محتفظ به بـ')),
      c.position.map((p) => h('span', {
        key: p.currency, className: 'wm-fx-chip', dir: 'ltr',
        style: { color: tone(p.net) },
      // The note groups everything it did not name under one heading, and
      // "OTHER" printed beside USD and EUR reads as a currency code.
      }, `${p.currency === 'OTHER' ? t('Other', 'أخرى') : p.currency} `
         + `${p.net > 0 ? '+' : ''}${money(p.net * 1e6)}`
         + (c.denominatedIn === 'foreign' ? '' : ' EGP'))
      )) : null,
    warn: (c, t) => c.largerThanTheProfit && t(
      'the currency line filed is larger than the period’s whole profit',
      'فروق العملة المودعة أكبر من ربح الفترة كله'),
  },
};

function channelPanel(channel, query, onSearch, ar, t) {
  const needle = (query || '').trim().toLowerCase();
  const rows = (channel.companies || []).filter((c) => !needle
    || (c.ticker || '').toLowerCase().includes(needle)
    || (c.name || '').toLowerCase().includes(needle));
  const spec = CHANNELS[channel.id];
  if (!spec) return null;
  const warn = spec.warn || (() => null);
  const extra = spec.extra || (() => null);

  return h('section', { className: 'ft-detail wm-channel' },
    h('div', { className: 'ft-section-heading' },
      h('div', null,
        h('span', { className: 'ft-eyebrow' }, t(spec.eyebrow[0], spec.eyebrow[1])),
        h('h2', null, ar ? channel.questionAr : channel.question)
      ),
      h('span', { className: 'ft-range-badge', dir: 'ltr' }, `${channel.count}`)
    ),
    h('p', { className: 'ft-note' },
      t(`All ${channel.count} — ${channel.filter}. In alphabetical order, with the filing each number came from. Nothing here says what a move means for a share price.`,
        `كل الـ${channel.count} — ${channel.filterAr}. بالترتيب الأبجدي، ومع كل رقم الإفصاح الذي جاء منه. ولا شيء هنا يقول ماذا تعني أي حركة لسعر السهم.`)),
    // Deliberately a level and not a move. Every other figure on this screen
    // is placed against its own two years; the pound has no history kept here,
    // so it gets a date and no percentile — and says as much.
    channel.today && h('div', { className: 'wm-today' },
      h('div', { className: 'wm-today-rates' },
        channel.today.rates.map((r) => h('span', { key: r.code },
          h('small', null, ar ? r.labelAr : r.label),
          h('b', { dir: 'ltr' }, r.token)))),
      h('small', { className: 'wm-today-note' },
        `${channel.today.asOf} · ${ar ? channel.today.noteAr : channel.today.note}`)),
    h('input', {
      type: 'search', className: 'om-search',
      placeholder: t('Search a company', 'ابحث عن شركة'),
      'aria-label': t('Search a company', 'ابحث عن شركة'),
      value: query || '',
      onInput: (e) => onSearch(e.target.value),
    }),
    h('p', { className: 'om-register-count' },
      t(`${rows.length} of ${channel.count}`, `${rows.length} من ${channel.count}`)),
    h('div', { className: 'wm-rows' },
      rows.length ? rows.map((c) => h('div', { key: c.ticker, className: 'wm-row' },
        h('div', { className: 'wm-row-who' },
          h('strong', null, c.ticker),
          h('small', null, c.name || '')
        ),
        h('div', { className: 'wm-row-figures' },
          spec.figures(c, t).map(([label, value, colour]) => h('span', { key: label },
            h('small', null, label),
            h('b', { dir: 'ltr', style: colour ? { color: colour } : null }, value)))),
        // Before the extra, not after it: the extra spans the whole row, so a
        // filing date placed behind it starts a fresh grid row and lands under
        // the figures instead of beside them.
        h('small', { className: 'wm-row-filed', dir: 'ltr' }, c.period || ''),
        extra(c, t),
        // A company that filed two numbers which do not describe each other is
        // told on, rather than read as if one of them stood alone.
        warn(c, t) && h('small', { className: 'wm-row-warn' }, warn(c, t))
      )) : h('p', { className: 'om-reg-none' },
        t('No company here matches that.', 'لا شركة مطابقة هنا.'))
    )
  );
}

export function worldMonitor(component, data, ar) {
  const t = (en, arabic) => (ar ? arabic : en);
  const doc = data.worldMonitor;
  const st = component.state || {};
  const window_ = WINDOWS.some(([id]) => id === st.worldWindow) ? st.worldWindow : 'week';

  if (!doc) {
    return h('section', { className: 'ft-screen' },
      h('h1', null, t('World monitor', 'مرصد العالم')),
      h('p', { className: 'ft-empty', role: 'status' },
        data.demo
          ? t('Sign in to read what the world did and which filings it reaches.',
              'سجّل الدخول لقراءة ما فعله العالم وأي الإفصاحات يصل إليها.')
          : t('The world monitor has not arrived yet.', 'لم تصل بيانات المرصد بعد.')));
  }

  const setWindow = (id) => component.setState({ worldWindow: id });
  const search = (id, value) => component.setState({ [`world${id}Search`]: value });

  return h('section', { className: 'ft-screen wm-screen' },
    h('div', { className: 'ft-eyebrow-line' },
      h('span', { className: 'ft-eyebrow' }, t('WORLD MONITOR', 'مرصد العالم')),
      h('span', { className: 'ft-range-badge', dir: 'ltr' }, doc.generated.slice(0, 10))
    ),
    h('h1', null, t('What moved, and where it lands', 'ما الذي تحرك، وأين يصل')),
    h('p', { className: 'ft-note' }, ar ? doc.basisAr : doc.basis),

    h('div', { className: 'ft-pills wm-windows' },
      WINDOWS.map(([id, en, arabic]) => h('button', {
        key: id, type: 'button',
        // `ft-pill` and `aria-pressed`, the same two things every other pill
        // on this site uses. A private `-on` class here drew ink on ink.
        className: 'ft-pill',
        'aria-pressed': String(window_ === id),
        onClick: () => setWindow(id),
      }, t(en, arabic)))
    ),

    h('section', { className: 'ft-detail wm-block' },
      h('h2', null, t('Outside Egypt', 'خارج مصر')),
      h('div', { className: 'wm-moves' },
        (doc.world || []).map((row) => moveRow(row, window_, ar, t)).filter(Boolean))
    ),

    h('section', { className: 'ft-detail wm-block' },
      h('h2', null, t('This exchange, measured the same way', 'هذه البورصة، بالقياس نفسه')),
      h('p', { className: 'ft-note' },
        t('The comparison is the point: a week that was remarkable for oil and ordinary here is a different fact from one that was remarkable for both.',
          'المقارنة هي المقصد: أسبوع استثنائي للنفط وعادي هنا ليس كأسبوع استثنائي لكليهما.')),
      h('div', { className: 'wm-moves' },
        (doc.exchange || []).map((row) => moveRow(row, window_, ar, t)).filter(Boolean))
    ),

    (doc.channels || []).map((channel) => channelPanel(
      channel, st[`world${channel.id}Search`],
      (value) => search(channel.id, value), ar, t)),

    doc.foreignMoney && h('section', { className: 'ft-detail wm-block' },
      h('h2', null, t('Who was on each side', 'من كان في كل جانب')),
      h('div', { className: 'ft-metrics' },
        (doc.foreignMoney.byNationality || []).map((row) => h('div', {
          key: row.nationality || row.label, className: 'ft-metric',
        },
          h('span', null, ar ? (row.label_ar || row.nationality) : (row.label || row.nationality)),
          h('strong', { dir: 'ltr' }, finite(row.percent) ? `${row.percent.toFixed(2)}%` : '—')
        ))),
      h('p', { className: 'ft-note' }, doc.foreignMoney.note)
    )
  );
}

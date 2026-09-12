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

function channelPanel(channel, query, onSearch, ar, t) {
  const needle = (query || '').trim().toLowerCase();
  const rows = (channel.companies || []).filter((c) => !needle
    || (c.ticker || '').toLowerCase().includes(needle)
    || (c.name || '').toLowerCase().includes(needle));
  const rates = channel.id === 'rates';

  return h('section', { className: 'ft-detail wm-channel' },
    h('div', { className: 'ft-section-heading' },
      h('div', null,
        h('span', { className: 'ft-eyebrow' },
          rates ? t('THE COST OF MONEY', 'تكلفة الاقتراض') : t('THE COST OF THINGS', 'تكلفة المدخلات')),
        h('h2', null, ar ? channel.questionAr : channel.question)
      ),
      h('span', { className: 'ft-range-badge', dir: 'ltr' }, `${channel.count}`)
    ),
    h('p', { className: 'ft-note' },
      t(`All ${channel.count} — ${channel.filter}. In alphabetical order, with the filing each number came from. Nothing here says what a move means for a share price.`,
        `كل الـ${channel.count} — ${channel.filterAr}. بالترتيب الأبجدي، ومع كل رقم الإفصاح الذي جاء منه. ولا شيء هنا يقول ماذا تعني أي حركة لسعر السهم.`)),
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
        rates
          ? h('div', { className: 'wm-row-figures' },
              h('span', null, h('small', null, t('Borrowings', 'القروض')),
                h('b', { dir: 'ltr' }, filed(c.borrowings))),
              h('span', null, h('small', null, t('Reprices within a year', 'تُسعّر خلال عام')),
                h('b', { dir: 'ltr' }, finite(c.repricingWithinAYear)
                  ? `${c.repricingWithinAYear}%` : '—')),
              h('span', null, h('small', null, t('Interest cover', 'تغطية الفوائد')),
                h('b', { dir: 'ltr' }, finite(c.cover) ? `${c.cover.toFixed(2)}×` : '—'))
            )
          : h('div', { className: 'wm-row-figures' },
              h('span', null, h('small', null, t('Revenue', 'الإيرادات')),
                h('b', { dir: 'ltr' }, filed(c.revenue))),
              h('span', null, h('small', null, t('Gross profit', 'مجمل الربح')),
                h('b', { dir: 'ltr' }, filed(c.grossProfit))),
              h('span', null, h('small', null, t('Cushion', 'الفارق')),
                h('b', { dir: 'ltr' }, finite(c.grossMargin) ? `${c.grossMargin}%` : '—'))
            ),
        h('small', { className: 'wm-row-filed', dir: 'ltr' }, c.period || ''),
        // A company that filed two numbers which do not describe each other is
        // told on, rather than read as if one of them stood alone.
        c.costExceedsBorrowings && h('small', { className: 'wm-row-warn' },
          t('filed a finance cost larger than the borrowings it pays for',
            'أودعت تكلفة تمويل أكبر من القروض التي تخصها'))
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

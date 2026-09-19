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
const upper = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const tone = (v) => (v > 0 ? 'var(--up)' : v < 0 ? 'var(--down)' : 'var(--t2)');

/* What the rows are, in the order a reader meets them. */
export const GROUPS = [
  ['egypt', 'The price of money in Egypt', 'سعر المال في مصر'],
  ['currencies', 'Against the pound', 'مقابل الجنيه'],
  ['world', 'Commodities and indices', 'السلع والمؤشرات'],
  ['metals', 'Metals', 'المعادن'],
];

export const WINDOWS = [
  ['week', 'This week', 'هذا الأسبوع'],
  ['month', 'This month', 'هذا الشهر'],
  ['quarter', 'This quarter', 'هذا الربع'],
];

/** How remarkable a move was, in words a reader can check against the number.
 *
 * Says what it is measuring, because both halves were doing work the reader
 * could not see. "Bigger" is bigger IN SIZE — a fall of 6% and a rise of 6%
 * are the same move here, which is what stops every crash reading as ordinary.
 * And "typical" is the middle move of that history, not a mean, so a single
 * violent week cannot drag it.
 */
export function remark(against, t) {
  if (!against || !finite(against.percentile)) {
    return t('not enough history to compare', 'لا يوجد تاريخ كافٍ للمقارنة');
  }
  return t(
    `larger, up or down, than ${against.percentile.toFixed(0)}% of them; `
    + `the middle one moved ${against.typical}%`,
    `أكبر، صعوداً أو هبوطاً، من ${against.percentile.toFixed(0)}٪ منها؛ `
    + `وتحرك الأوسط ${against.typical}٪`);
}

/* Stated filters, never a ranking.
 *
 * The three channels arrived as 403 alphabetical rows a reader had to scroll
 * past to find anything — correct, and a wall. A filter that names its rule
 * and returns however many companies meet it is the §8-safe way to cut that
 * down: the rule does the choosing, and the count is whatever the market
 * makes it. A list cut to a fixed length would make the publisher the one
 * deciding who is at the top.
 */
export const FILTERS = {
  rates: [
    ['all', 'All of them', 'كلها', () => true],
    ['soon', 'More than half reprices within a year', 'أكثر من نصفها يُعاد تسعيره خلال عام',
      (c) => finite(c.repricingWithinAYear) && c.repricingWithinAYear > 50],
    ['thin', 'Earns less than twice what it pays to borrow', 'تكسب أقل من ضعف ما تدفعه فائدةً',
      (c) => finite(c.cover) && c.cover > 0 && c.cover < 2],
  ],
  inputs: [
    ['all', 'All of them', 'كلها', () => true],
    ['tight', 'Filed a gross margin under 10%', 'أودعت هامش ربح إجمالي أقل من ١٠٪',
      (c) => finite(c.grossMargin) && c.grossMargin < 10],
    ['wide', 'Filed a gross margin over 40%', 'أودعت هامش ربح إجمالي أكثر من ٤٠٪',
      (c) => finite(c.grossMargin) && c.grossMargin > 40],
  ],
  currency: [
    ['all', 'All of them', 'كلها', () => true],
    ['held', 'Holds a net position in another currency', 'تحتفظ بصافي مركز بعملة أخرى',
      (c) => (c.position || []).length > 0],
    ['tenth', 'Currency was more than a tenth of the period’s profit',
      'فروق العملة تجاوزت عُشر ربح الفترة',
      (c) => finite(c.shareOfNetIncome) && Math.abs(c.shareOfNetIncome) > 10],
  ],
};

export function filtersFor(id) {
  return FILTERS[id] || [['all', 'All of them', 'كلها', () => true]];
}

export function applyFilter(channel, key) {
  const rule = filtersFor(channel.id).find(([k]) => k === key)
    || filtersFor(channel.id)[0];
  return (channel.companies || []).filter(rule[3]);
}

/* The corridor the MPC set, with the rate banks actually paid inside it.
 *
 * Four of these five numbers are not series and never will be: a policy rate
 * does not move between decisions, so a line of it is flat and a percentile
 * of it is meaningless. Drawn as one figure instead — two walls and a marker
 * — because the relationship IS the fact. "19.433%" alone says nothing; the
 * same number shown sitting just above a floor of 19.00 says the market is
 * pricing money at the cheap end of what the committee allows.
 *
 * The two dates differ on purpose and both are printed. The walls were set in
 * February and are still in force; the marker is one day's trading.
 */
function corridorFigure(c, ar, t) {
  if (!c || !c.floor || !c.ceiling) return null;
  // Rows arrive from rates/latest.json with `label_ar`, not `labelAr`; the
  // first form alone left every instrument in English on the Arabic page.
  const name = (r) => (ar ? (r.labelAr || r.label_ar || r.label) : r.label);
  const at = finite(c.at) ? c.at : null;
  const other = [c.main, c.discount].filter(Boolean);
  return h('div', { className: 'wm-corridor' },
    h('div', { className: 'wm-corridor-head' },
      h('strong', null, t('What the committee set', 'ما حددته اللجنة')),
      h('small', { dir: 'ltr' }, c.floor.asOf)
    ),
    h('div', { className: 'wm-corridor-track', 'aria-hidden': 'true' },
      h('i', { className: 'wm-corridor-band' }),
      // Filled from the floor up to the rate, not just ticked at it. A tick
      // alone is a mark a reader has to measure against two ends by eye; a
      // fill is the distance itself, and "just above the floor" is the whole
      // thing this figure has to say.
      at === null ? null : h('i', {
        className: 'wm-corridor-fill',
        // Percent, not pixels: the track is fluid and a pixel width computed
        // against a size nobody measured lands wherever the column happens to
        // be wide today — and in a pane, where it is read before mount, at 0.
        style: { inlineSize: `${(at * 100).toFixed(2)}%` },
      }),
      at === null ? null : h('i', {
        className: 'wm-corridor-mark',
        style: { insetInlineStart: `${(at * 100).toFixed(2)}%` },
      })
    ),
    h('div', { className: 'wm-corridor-ends' },
      h('span', null, h('strong', { dir: 'ltr' }, c.floor.token),
        h('small', null, name(c.floor))),
      h('span', { className: 'wm-corridor-end-hi' },
        h('strong', { dir: 'ltr' }, c.ceiling.token),
        h('small', null, name(c.ceiling)))
    ),
    !c.paid ? null : h('p', { className: 'wm-corridor-paid' },
      h('strong', { dir: 'ltr' }, c.paid.token),
      h('span', null,
        t(` — what banks actually paid each other, ${c.paid.asOf}`,
          ` — ما أقرضت به البنوك بعضها فعلاً، ${c.paid.asOf}`))),
    !other.length ? null : h('div', { className: 'wm-corridor-rest' },
      other.map((r) => h('span', { key: r.label },
        h('small', null, name(r)), h('strong', { dir: 'ltr' }, r.token)))),
    // Said in words, because a reader who takes this for "the rate a company
    // pays its bank" has read the whole figure wrong.
    h('p', { className: 'ft-note' },
      t('The floor is what a bank earns leaving money at the central bank and '
        + 'the ceiling is what it pays to borrow there, so no bank deals with '
        + 'another outside them. None of these is the rate a company pays on '
        + 'its own loan.',
        'الحد الأدنى هو ما يكسبه البنك من إيداع أمواله لدى البنك المركزي، '
        + 'والحد الأقصى ما يدفعه للاقتراض منه، فلا يتعامل بنك مع آخر خارجهما. '
        + 'وليس أي منها السعر الذي تدفعه شركة على قرضها.')),
    // build_rates_api.py stamps "cbe.org.eg monetary policy, effective <date>"
    // on the corridor. It is a source line, so it arrives in English.
    (() => {
      const m = ar && /^cbe\.org\.eg monetary policy, effective (\S+)$/.exec(c.source || '');
      return m ? h('p', { className: 'ft-note' }, 'البنك المركزي المصري، السياسة النقدية السارية من ' + m[1])
               : h('p', { className: 'ft-note', dir: 'ltr' }, c.source);
    })()
  );
}

function moveRow(row, window_, ar, t) {
  const move = (row.moves || {})[window_];
  if (!move) return null;
  const against = move.against;
  const share = against && finite(against.percentile) ? against.percentile : 0;
  return h('div', { key: row.id, className: 'wm-move' },
    h('div', { className: 'wm-move-name' },
      // The document carries label_ar for every row; this printed the English.
      h('strong', null, ar ? (row.labelAr || row.label_ar || row.label) : row.label),
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

/* A channel, shut until it is asked for.
 *
 * The three of them arrived open, which put 403 alphabetical rows between the
 * reader and anything else on the page. Correct, and a wall — the screen
 * answered "what moved" and then made the reader assemble the rest. Shut, each
 * one is its question and the number of companies that filed an answer to it,
 * which is the part a reader chooses from.
 */
/* What the outside reaches ONE company through.
 *
 * The screen said oil moved unusually, and separately listed 147 companies
 * with a filed gross margin, and left the reader to join them. The join is the
 * product. Opening a company here puts all three channels' figures for it in
 * one place, with a sentence saying which of them actually reach it.
 *
 * The sentence is written by a model FROM THOSE FIGURES and may use no others:
 * every number in it is one of the figures printed underneath it, character
 * for character, and a sentence using any other number never left the builder.
 * See build_company_exposure.py — a rounded figure reading as the filed one is
 * the failure that guard exists for.
 */
function exposureCard(card, ar, t) {
  if (!card) return null;
  return h('div', { className: 'wm-card' },
    (card.says || []).map((said, i) => h('p', { key: i, className: 'wm-card-says' }, said)),
    h('dl', { className: 'wm-card-figures' },
      Object.entries(card.figures || {}).map(([label, shown]) => [
        h('dt', { key: `k${label}` }, label),
        h('dd', { key: `v${label}`, dir: 'ltr' }, shown),
      ])),
    h('p', { className: 'wm-card-note' },
      t('Every number above is one of the figures listed with it, as filed. Nothing here says what any of it means for a share price.',
        'كل رقم أعلاه هو أحد الأرقام المذكورة معه كما أُودعت. ولا شيء هنا يقول ماذا يعني أي منها لسعر أي سهم.'))
  );
}

function channelPanel(channel, state, on, ar, t) {
  const spec = CHANNELS[channel.id];
  if (!spec) return null;
  const open = !!state.open;
  const key = state.filter || 'all';
  const needle = (state.query || '').trim().toLowerCase();
  const warn = spec.warn || (() => null);
  const extra = spec.extra || (() => null);
  const rule = filtersFor(channel.id).find(([k]) => k === key);
  const matching = applyFilter(channel, key);
  const rows = matching.filter((c) => !needle
    || (c.ticker || '').toLowerCase().includes(needle)
    || (c.name || '').toLowerCase().includes(needle));

  return h('section', { className: `ft-detail wm-channel${open ? ' wm-open' : ''}` },
    h('button', {
      type: 'button', className: 'wm-channel-head',
      'aria-expanded': String(open),
      onClick: () => on.toggle(!open),
    },
      h('div', null,
        h('span', { className: 'ft-eyebrow' }, t(spec.eyebrow[0], spec.eyebrow[1])),
        h('h2', null, ar ? channel.questionAr : channel.question),
        h('small', null, t(`${channel.count} companies filed a figure`,
                           `${channel.count} شركة أودعت رقماً`))
      ),
      h('span', { className: 'wm-chevron', 'aria-hidden': 'true' }, open ? '−' : '+')
    ),
    open ? h('div', { className: 'wm-channel-body' },
      h('p', { className: 'ft-note' },
        // The filter reads as a sentence now that "All 119 —" no longer opens
        // it; the count moved to the header, where it is visible shut.
        t(`${upper(channel.filter)}. In alphabetical order, with the filing each number came from. Nothing here says what a move means for a share price.`,
          `${channel.filterAr}. بالترتيب الأبجدي، ومع كل رقم الإفصاح الذي جاء منه. ولا شيء هنا يقول ماذا تعني أي حركة لسعر السهم.`)),
      // Deliberately a level and not a move. Every other figure on this screen
      // is placed against its own two years; the pound has no history kept
      // here, so it gets a date and no percentile — and says as much.
      channel.today && h('div', { className: 'wm-today' },
        h('div', { className: 'wm-today-rates' },
          channel.today.rates.map((r) => h('span', { key: r.code },
            h('small', null, ar ? (r.labelAr || r.label_ar || r.label) : r.label),
            h('b', { dir: 'ltr' }, r.token)))),
        h('small', { className: 'wm-today-note' },
          `${channel.today.asOf} · ${ar ? channel.today.noteAr : channel.today.note}`)),
      // Each pill names its rule and returns however many meet it. The rule
      // chooses; the count is whatever the market makes it.
      h('div', { className: 'ft-pills wm-filters' },
        filtersFor(channel.id).map(([k, en, arabic]) => h('button', {
          key: k, type: 'button', className: 'ft-pill',
          'aria-pressed': String(k === key),
          onClick: () => on.filter(k),
        }, t(en, arabic)))
      ),
      h('input', {
        type: 'search', className: 'om-search',
        placeholder: t('Search a company', 'ابحث عن شركة'),
        'aria-label': t('Search a company', 'ابحث عن شركة'),
        value: state.query || '',
        onInput: (e) => on.search(e.target.value),
      }),
      h('p', { className: 'om-register-count' },
        key === 'all'
          ? t(`${rows.length} of ${channel.count}`, `${rows.length} من ${channel.count}`)
          : t(`${rows.length} of ${channel.count} — ${rule ? rule[1] : ''}`,
              `${rows.length} من ${channel.count} — ${rule ? rule[2] : ''}`)),
      h('div', { className: 'wm-rows' },
        rows.length ? rows.map((c) => h('div', {
          key: c.ticker,
          className: `wm-row${state.card === c.ticker ? ' wm-row-open' : ''}`,
          role: 'button', tabIndex: 0,
          'aria-expanded': String(state.card === c.ticker),
          onClick: () => on.card(state.card === c.ticker ? null : c.ticker),
          onKeyDown: (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              on.card(state.card === c.ticker ? null : c.ticker);
            }
          },
        },
          h('div', { className: 'wm-row-who' },
            h('strong', null, c.ticker),
            h('small', null, c.name || '')
          ),
          h('div', { className: 'wm-row-figures' },
            spec.figures(c, t).map(([label, value, colour]) => h('span', { key: label },
              h('small', null, label),
              h('b', { dir: 'ltr', style: colour ? { color: colour } : null }, value)))),
          h('small', { className: 'wm-row-filed', dir: 'ltr' }, c.period || ''),
          extra(c, t),
          warn(c, t) && h('small', { className: 'wm-row-warn' }, warn(c, t)),
          state.card === c.ticker
            ? exposureCard((state.cards || {})[c.ticker], ar, t)
            : null
        )) : h('p', { className: 'om-reg-none' },
          t('No company here matches that.', 'لا شركة مطابقة هنا.'))
      )
    ) : null
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

  // Keyed by ticker so a row can find its own card without a scan.
  const cards = Object.fromEntries(
    ((data.companyExposure || {}).companies || []).map((c) => [c.ticker, c]));

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
      // Grouped by what the thing is. Flat alphabetical put the euro between
      // copper and the FTSE, and twelve unrelated numbers read as a list
      // rather than as three kinds of thing — which is most of why this did
      // not feel like a monitor of anything.
      GROUPS.map(([id, en, arabic]) => {
        const rows = (doc.world || []).filter((r) => (r.group || 'world') === id);
        // Egypt keeps its heading when the corridor is all there is. The one
        // series in that group comes from a vendor that answers 403 from a
        // datacentre, and the four rates in the figure come from the central
        // bank's own page — so the day the series is missing is exactly the
        // day the walls are the only Egyptian numbers on the screen.
        const figure = id === 'egypt' ? corridorFigure(doc.corridor, ar, t) : null;
        if (!rows.length && !figure) return null;
        return h('div', { key: id, className: 'wm-group' },
          h('h3', { className: 'wm-group-head' }, t(en, arabic)),
          // Above the row, not beside it: the walls are what make the one
          // moving number legible, so a reader meets them first.
          figure,
          h('div', { className: 'wm-moves' },
            rows.map((row) => moveRow(row, window_, ar, t)).filter(Boolean)));
      })
    ),

    h('section', { className: 'ft-detail wm-block' },
      h('h2', null, t('This exchange, measured the same way', 'هذه البورصة، بالقياس نفسه')),
      h('p', { className: 'ft-note' },
        t('The comparison is the point: a week that was remarkable for oil and ordinary here is a different fact from one that was remarkable for both.',
          'المقارنة هي المقصد: أسبوع استثنائي للنفط وعادي هنا ليس كأسبوع استثنائي لكليهما.')),
      h('div', { className: 'wm-moves' },
        (doc.exchange || []).map((row) => moveRow(row, window_, ar, t)).filter(Boolean))
    ),

    (doc.channels || []).map((channel) => channelPanel(channel, {
      open: !!st[`world${channel.id}Open`],
      filter: st[`world${channel.id}Filter`],
      query: st[`world${channel.id}Search`],
      card: st[`world${channel.id}Card`],
      cards,
    }, {
      toggle: (v) => component.setState({ [`world${channel.id}Open`]: v }),
      filter: (k) => component.setState({ [`world${channel.id}Filter`]: k }),
      search: (v) => search(channel.id, v),
      card: (ticker) => component.setState({ [`world${channel.id}Card`]: ticker }),
    }, ar, t)),

    doc.foreignMoney && h('section', { className: 'ft-detail wm-block' },
      h('h2', null, t('Who was on each side', 'من كان في كل جانب')),
      h('div', { className: 'ft-metrics' },
        (doc.foreignMoney.byNationality || []).map((row) => h('div', {
          key: row.nationality || row.label, className: 'ft-metric',
        },
          h('span', null, ar ? (row.label_ar || row.nationality) : (row.label || row.nationality)),
          h('strong', { dir: 'ltr' }, finite(row.percent) ? `${row.percent.toFixed(2)}%` : '—')
        ))),
      h('p', { className: 'ft-note' }, ar ? (doc.foreignMoney.noteAr || doc.foreignMoney.note) : doc.foreignMoney.note)
    )
  );
}

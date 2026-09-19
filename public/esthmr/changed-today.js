/* ما تغيّر اليوم — what changed today, as three cards.
 *
 * The redesign's business card: a dateline, the name of the shape it is
 * drawn in, one sentence, one picture, then what the picture does NOT say,
 * then the document it came from. Three of them, and each uses a different
 * primitive on purpose — a reader who meets the same chart three times stops
 * reading the third one.
 *
 * WHY THE "LIMIT" LINE IS NOT DECORATION
 * Every card here is one measurement about one named company, which is the
 * closest this site gets to the line in §8. The limit line is the sentence
 * that keeps it a measurement: a volume multiple is activity and not
 * interest, an index below its own average is a description and not a
 * signal, a disclosed stake is a filing and not a holding. Take those
 * sentences out and three neutral facts start reading as three reasons.
 *
 * NOTHING HERE IS COMPUTED FROM NOTHING
 * A card that cannot find its two published figures is not drawn. There is
 * no "—" card and no placeholder: an absent document means an absent card,
 * and the row simply carries the two that are there.
 */
import { React as R } from './react-shim.js';
import { pairedBars, line, shareBar, evidenceChip, finite } from './primitives.js';

const h = R.createElement;

/* A session at twice a company's own usual volume. Chosen as the point where
   "it traded" becomes "it traded unusually" — see the note in volumeCard. */
const UNUSUAL = 2;
/* How recent an ownership filing has to be to count as today's news. */
const FILING_DAYS = 45;

/** The ISO date `days` before `iso`, or '' when the date is unreadable. */
function recentSince(iso, days) {
  const at = new Date(`${String(iso || '')}T00:00:00Z`);
  if (Number.isNaN(at.getTime())) return '';
  at.setUTCDate(at.getUTCDate() - days);
  return at.toISOString().slice(0, 10);
}

const compact = (v) => (finite(v)
  ? new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(v)
  : '—');

/** The card frame every one of the three shares. */
function card({ dateline, primitive, title, lede, visual, limit, chip, more, key }) {
  if (!visual) return null;
  return h('article', { key, class: 'ct-card' },
    h('div', { class: 'ct-head' },
      h('span', { class: 'ct-dateline' }, dateline),
      h('span', { class: 'ct-primitive' }, primitive)),
    h('h3', { class: 'ct-title' }, title),
    // One plain line before the drawing: what this card means for the reader.
    // The limit line below the drawing keeps its job of saying what it is not.
    lede ? h('p', { class: 'ct-lede' }, lede) : null,
    h('div', { class: 'ct-rule' }),
    h('div', { class: 'ct-visual' }, visual),
    h('p', { class: 'ct-limit' }, limit),
    h('div', { class: 'ct-rule' }),
    h('div', { class: 'ct-foot' }, chip, more));
}

/**
 * The busiest companies in the session, each against its own normal.
 *
 * WHY THE BARS ARE MULTIPLES AND NOT SHARE COUNTS
 * The obvious chart — four companies' session volumes on one axis — cannot be
 * drawn honestly. On this exchange the busiest name trades billions of shares
 * and the fourth-busiest trades hundreds of thousands, so a shared axis draws
 * three of the four as hairlines on the floor and the card says "one company
 * traded and the others did not", which is false.
 *
 * So each company is drawn against ITSELF: its own twenty-session median is
 * the bar of 1, and this session is however many times that it reached. Now
 * the four are comparable, because the question the card asks — how far above
 * its own normal did this go — is the same question for each of them. The real
 * share count sits under its own bar so the multiple is never the only number
 * a reader leaves with.
 */
function volumeCard(data, ar, t, open, day) {
  const rows = (data.companies || []).filter((c) => finite(c.rv) && finite(c.volume)
    && finite(c.medianVolume) && c.medianVolume > 0 && !c.listing
    /* UNUSUAL, OR IT IS NOT A CHANGE.
       This shelf is headed "what changed today". Every session has a busiest
       company, so drawing whichever one it is guarantees a card on the
       quietest day of the year — and a card on a page with that heading
       asserts that something happened. Twice its own usual volume is the bar;
       below it the company simply traded. */
    && c.rv >= UNUSUAL);
  if (!rows.length) return null;
  const top = rows.slice().sort((a, b) => b.rv - a.rv).slice(0, 4);
  const lead = top[0];
  /* A directory row carries its name as `{ en, ar }`, not as a string —
     `data.live()` builds it that way so a screen can pick a language without
     a second lookup. Reading it as a string printed "[object Object]" in the
     middle of an Arabic sentence. */
  const named = (row) => {
    const n = row && row.name;
    if (n && typeof n === 'object') return (ar ? n.ar : n.en) || row.ticker;
    return n || row.ticker;
  };
  const name = named(lead);
  return card({
    key: 'volume',
    dateline: t(`${day(data.marketDate)} · close · ${top.length} companies`,
      `${day(data.marketDate)} · إغلاق · ${top.length} شركات`),
    primitive: t('PAIRED BARS', 'أعمدة مزدوجة'),
    lede: t('Something drew attention to this share today; the filings and the news say what, the volume alone does not.',
      'شيء جذب الانتباه إلى هذا السهم اليوم؛ الإفصاحات والأخبار تقول ماذا، لا الحجم وحده.'),
    title: top.length > 1
      ? t(`${lead.ticker} · ${name} traded ${lead.rv.toFixed(1)}× its usual volume, and it was not alone`,
        `${lead.ticker} · ${name} تداولت ${lead.rv.toFixed(1)}× حجمها المعتاد، ولم تكن وحدها`)
      : t(`${lead.ticker} · ${name} traded ${lead.rv.toFixed(1)}× its usual volume`,
        `${lead.ticker} · ${name} تداولت ${lead.rv.toFixed(1)}× حجمها المعتاد`),
    visual: pairedBars({ ar, width: 460, height: 136, groups: top.map((c, i) => ({
      prior: 1, now: c.rv,
      priorValue: '1×', nowValue: `${c.rv.toFixed(1)}×`,
      priorLabel: c.ticker, nowPeriodLabel: compact(c.volume),
      unit: i === 0 ? t('× its own usual', '× حجمها المعتاد') : '',
    })) }),
    limit: t('Each bar is measured against that company’s own usual volume, never against another company’s. Volume is activity, not interest: a session can be busy because one holder sold.',
      'كل عمود يُقاس على الحجم المعتاد للشركة نفسها، لا على شركة أخرى. الحجم نشاط وليس اهتماماً: قد تكون الجلسة نشطة لأن مالكاً واحداً باع.'),
    chip: evidenceChip({ ar, date: day(data.marketDate),
      basis: t('session volume ÷ median of 20 sessions', 'حجم الجلسة ÷ وسيط 20 جلسة'),
      source: 'EGX' }),
    more: h('button', { type: 'button', class: 'ct-more', onClick: () => open(lead.ticker) },
      t('Open the company ↗', 'افتح الشركة ↗')),
  });
}

/**
 * The index against its own recent average.
 *
 * A description of where it sits, never a signal: the average is drawn as a
 * ghost line so it reads as a reference, and the limit line says the crossing
 * is not an event.
 */
function indexCard(data, ar, t, open, day) {
  const idx = (data.indices || []).find((i) => Array.isArray(i.points) && i.points.length >= 10);
  if (!idx) return null;
  const points = idx.points.filter(finite);
  if (points.length < 10) return null;
  const name = ar ? (idx.labelAr || idx.label) : idx.label;
  const mean = points.reduce((s, v) => s + v, 0) / points.length;
  const below = points[points.length - 1] < mean;
  /* A CROSSING, NOT A POSITION.
     An index is always on one side of its own average, and it was on that
     side yesterday too. Drawing where it sits makes a standing condition look
     like today's news — and since it is true every day, it filled a slot on
     this shelf every day. The card is drawn only on the session the index
     changed sides. Its own limit line still says a crossing is a description
     and not an event; what changed is that the drawing is now about something
     that happened today. */
  const priorBelow = points[points.length - 2] < mean;
  if (below === priorBelow) return null;
  return card({
    key: 'index',
    dateline: t(`${day(data.marketDate)} · close · ${points.length} sessions`,
      `${day(data.marketDate)} · إغلاق · ${points.length} جلسة`),
    primitive: t('LINE', 'خط'),
    lede: below
      ? t('The index sits below its recent average: the last weeks were weaker than their own average. Where it is, not where it goes.',
        'المؤشر اليوم تحت متوسطه في الأسابيع الأخيرة، أي إن الأيام الأخيرة كانت أضعف من المعتاد. يصف أين هو، لا إلى أين يذهب.')
      : t('The index sits above its recent average: the last weeks were better than their own average. Where it is, not where it goes.',
        'المؤشر اليوم فوق متوسطه في الأسابيع الأخيرة، أي إن الأيام الأخيرة كانت أفضل من المعتاد. يصف أين هو، لا إلى أين يذهب.'),
    title: below
      ? t(`${name} closed below its ${points.length}-session average`,
        `${name} أغلق أدنى من متوسط ${points.length} جلسة`)
      : t(`${name} closed above its ${points.length}-session average`,
        `${name} أغلق أعلى من متوسط ${points.length} جلسة`),
    visual: line({ ar, points, ghost: points.map(() => mean), height: 104,
      label: t(`points · ${points.length} sessions · average dashed`,
        `نقطة · ${points.length} جلسة · المتوسط متقطّع`) }),
    limit: t('Where it sits against its own recent closes. A crossing is a description, not an event.',
      'موضعه مقابل إغلاقاته الأخيرة. التقاطع وصف، وليس واقعة.'),
    chip: evidenceChip({ ar, date: day(data.marketDate),
      basis: t('official close', 'إغلاق رسمي'), source: t('EGX session bulletin', 'نشرة جلسة EGX') }),
    more: h('button', { type: 'button', class: 'ct-more', onClick: () => open(null) },
      t('The whole market ↗', 'السوق كله ↗')),
  });
}

/**
 * The newest disclosed cross-holdings — one bar per company.
 *
 * This is the card the share bar was built for. The disclosed stakes are
 * named; everything else is one hatched band that says "not disclosed" —
 * never normalised away, because "we know 12% of this" and "12% is all there
 * is" are opposite statements.
 *
 * THREE COMPANIES, THREE BARS, NOT ONE BAR OF THREE COMPANIES
 * Putting three companies in one bar would make the segments read as shares
 * of a single pot, and three companies' capital is not one pot. Each company
 * keeps its own bar, so each remainder is that company's own undisclosed
 * share rather than an average of three.
 */
function ownershipCard(data, ar, t, open, day) {
  const links = (data.sectorOwnership?.links || []).filter((l) => l && finite(l.percent) && l.held);
  if (!links.length) return null;

  /* Newest filing first, then one entry per company so the card never spends
     two of its three bars on the same name. */
  const byCompany = new Map();
  links.slice().sort((x, y) => String(y.asOf || '').localeCompare(String(x.asOf || '')))
    .forEach((l) => { if (!byCompany.has(l.held)) byCompany.set(l.held, []); byCompany.get(l.held).push(l); });

  /* Recent, or it is not "today".
     The archive always holds an ownership filing, so the newest one is drawn
     whether it landed this week or last spring. Outside this window the card
     is silent rather than presenting an old disclosure as a change. */
  const horizon = recentSince(data.marketDate, FILING_DAYS);
  const picked = [];
  for (const [held, all] of byCompany) {
    if (horizon && String(all[0].asOf || '') < horizon) continue;
    const parts = all.slice().sort((x, y) => y.percent - x.percent).slice(0, 3);
    const known = parts.reduce((sum, l) => sum + l.percent, 0);
    /* A company whose disclosed stakes already sum to 100% has no undisclosed
       remainder to show, and one at 0% has nothing to draw. Neither is a bar. */
    if (known <= 0 || known >= 100) continue;
    picked.push({ held, parts, known, asOf: all[0].asOf,
      name: ar ? (all[0].heldNameAr || all[0].heldName) : (all[0].heldName || held) });
    if (picked.length === 3) break;
  }
  if (!picked.length) return null;

  const newest = picked[0];
  return card({
    key: 'ownership',
    dateline: t(`${day(newest.asOf)} · ownership filings · ${picked.length} companies`,
      `${day(newest.asOf)} · إفصاحات ملكية · ${picked.length} شركات`),
    primitive: t('SHARE BAR', 'شريط نصيب'),
    lede: t('Whoever holds a large stake has filed it; the bar shows what is disclosed and what remains unknown.',
      'من يملك حصة كبيرة أفصح عنها؛ الشريط يريك المُعلن وما بقي مجهولاً.'),
    title: picked.length > 1
      ? t(`What is disclosed of ${picked.length} companies, and what is not`,
        `المُعلن من ${picked.length} شركات، وما ليس معلناً`)
      : t(`${newest.held} · ${newest.name}: ${newest.known.toFixed(2)}% is disclosed`,
        `${newest.held} · ${newest.name}: المُعلن ${newest.known.toFixed(2)}%`),
    visual: h('div', { class: 'ct-own-stack' }, picked.map((co) => h('div',
      { key: co.held, class: 'ct-own-row' },
      h('button', { type: 'button', class: 'ct-own-name', onClick: () => open(co.held) },
        h('span', { class: 'ct-own-code' }, co.held),
        h('span', { class: 'ct-own-label' }, co.name),
        h('span', { class: 'ct-own-known' }, t(`${co.known.toFixed(2)}% disclosed`,
          `المُعلن ${co.known.toFixed(2)}%`))),
      shareBar({ ar, parts: co.parts.map((l) => ({
        label: ar ? (l.ownerNameAr || l.ownerName) : l.ownerName, value: l.percent })) })))),
    limit: t('What is filed, not what is held. A stake under the disclosure threshold never appears here, and each bar is one company’s own capital.',
      'ما أُفصح عنه، لا ما هو مملوك. الحصة دون حدّ الإفصاح لا تظهر هنا أبداً، وكل شريط هو رأس مال شركة واحدة.'),
    chip: evidenceChip({ ar, date: day(newest.asOf),
      basis: t('Articles 29 & 38', 'إفصاحات المادتين 29 و 38'), source: 'EGX' }),
    more: h('button', { type: 'button', class: 'ct-more', onClick: () => open(newest.held) },
      t('Open the company ↗', 'افتح الشركة ↗')),
  });
}

export function changedToday(data, ar, { openCompany, openMarket, heading, note, longDate }) {
  const t = (en, arabic) => (ar ? arabic : en);
  /* Every other dateline on the site runs through `longDate`; these three
     were handed the raw ISO string, so a card headed "17 سبتمبر 2026 · إغلاق"
     everywhere else read "2026-09-17 · إغلاق" here — a bare machine date
     wedged into an Arabic sentence, with its digits fighting the RTL run
     around them. */
  const day = typeof longDate === 'function' ? longDate : (iso) => iso;
  const open = (ticker) => (ticker ? openCompany(ticker) : openMarket());
  const cards = [volumeCard(data, ar, t, open, day), indexCard(data, ar, t, open, day),
    ownershipCard(data, ar, t, open, day)].filter(Boolean);
  if (!cards.length) return null;
  /* THE QUIET DAY IS A REAL ANSWER.
     Three slots and three card builders is an arrangement that fills itself:
     whatever each builder found became a card, so the shelf said "three things
     changed today" on a session where nothing did. Each builder now has a bar
     it has to clear, which means the shelf can come back with one card, or
     two. Saying so is the honest end of the sentence — the alternative is
     lowering a bar until the row looks full, which is how a page that
     promises evidence starts manufacturing it.

     Drawn as a card in the empty slot rather than a footnote, because a row of
     two cards and a gap reads as something that failed to load. */
  const shy = cards.length < 3
    ? h('article', { key: 'none', class: 'ct-card ct-none' },
      h('p', { class: 'ct-none-line' },
        t('No further verified changes.', 'لا تغيّرات موثّقة أخرى.')),
      h('p', { class: 'ct-none-why' },
        t('Every card here rests on a published document. On a quiet session there are fewer, and this shelf does not fill the space with something that did not happen.',
          'كل بطاقة هنا تستند إلى مستند منشور. في الجلسات الهادئة تكون أقل، ولا يملأ هذا الرفّ الفراغ بما لم يحدث.')))
    : null;
  return h('section', { class: 'ct-shelf', 'aria-label': heading },
    h('div', { class: 'ct-shelf-head' },
      h('h2', null, heading),
      h('span', { class: 'ct-shelf-note' }, note)),
    h('p', { class: 'ct-shelf-lede' }, t(
      'What actually happened today, with a drawing and a document for each fact — no opinions: who traded far above usual, where the index stands, and who declared a stake.',
      'ما حدث فعلاً اليوم، برسم ومستند لكل واقعة — لا آراء: من تداول أكثر من عادته بكثير، وأين يقف المؤشر، ومن أعلن عن حصته.')),
    h('div', { class: 'ct-grid' }, shy ? cards.concat([shy]) : cards));
}

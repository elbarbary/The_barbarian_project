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

const compact = (v) => (finite(v)
  ? new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(v)
  : '—');

/** The card frame every one of the three shares. */
function card({ dateline, primitive, title, visual, limit, chip, more, key }) {
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
    h('div', { class: 'ct-foot' }, chip, more));
}

/**
 * The busiest company in the session, against its own normal.
 *
 * Two bars and nothing else: the median of its last twenty sessions, then
 * this one. The ratio is already on Home as a figure; the point of drawing
 * it is that "16×" means nothing until a reader sees what it was 16 times.
 */
function volumeCard(data, ar, t, open) {
  const rows = (data.companies || []).filter((c) => finite(c.rv) && finite(c.volume)
    && finite(c.medianVolume) && c.medianVolume > 0 && !c.listing);
  if (!rows.length) return null;
  const top = rows.reduce((best, c) => (c.rv > best.rv ? c : best), rows[0]);
  const name = ar ? (top.nameAr || top.name || top.ticker) : (top.name || top.ticker);
  return card({
    key: 'volume',
    dateline: t(`${data.marketDate} · close`, `${data.marketDate} · إغلاق`),
    primitive: t('PAIRED BARS', 'أعمدة مزدوجة'),
    title: t(`${top.ticker} · ${name} traded ${top.rv.toFixed(1)}× its usual volume`,
      `${top.ticker} · ${name} تداولت ${top.rv.toFixed(1)}× حجمها المعتاد`),
    visual: pairedBars({ ar, height: 104, groups: [{
      prior: top.medianVolume, now: top.volume,
      priorLabel: t('usual', 'المعتاد'), nowLabel: t('this session', 'هذه الجلسة'),
      priorValue: compact(top.medianVolume), nowValue: compact(top.volume),
      unit: t('shares', 'سهم'),
    }] }),
    limit: t('Volume is activity, not interest. A session can be busy because one holder sold.',
      'الحجم نشاط وليس اهتماماً. قد تكون الجلسة نشطة لأن مالكاً واحداً باع.'),
    chip: evidenceChip({ ar, date: data.marketDate,
      basis: t('session volume ÷ median of 20 sessions', 'حجم الجلسة ÷ وسيط 20 جلسة'),
      source: 'EGX' }),
    more: h('button', { type: 'button', class: 'ct-more', onClick: () => open(top.ticker) },
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
function indexCard(data, ar, t, open) {
  const idx = (data.indices || []).find((i) => Array.isArray(i.points) && i.points.length >= 10);
  if (!idx) return null;
  const points = idx.points.filter(finite);
  if (points.length < 10) return null;
  const name = ar ? (idx.labelAr || idx.label) : idx.label;
  const mean = points.reduce((s, v) => s + v, 0) / points.length;
  const below = points[points.length - 1] < mean;
  return card({
    key: 'index',
    dateline: t(`${data.marketDate} · close · ${points.length} sessions`,
      `${data.marketDate} · إغلاق · ${points.length} جلسة`),
    primitive: t('LINE', 'خط'),
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
    chip: evidenceChip({ ar, date: data.marketDate,
      basis: t('official close', 'إغلاق رسمي'), source: t('EGX session bulletin', 'نشرة جلسة EGX') }),
    more: h('button', { type: 'button', class: 'ct-more', onClick: () => open(null) },
      t('The whole market ↗', 'السوق كله ↗')),
  });
}

/**
 * The newest disclosed cross-holding, and how much of the company is not
 * disclosed at all.
 *
 * This is the card the share bar was built for. The disclosed stakes are
 * named; everything else is one hatched band that says "not disclosed" —
 * never normalised away, because "we know 12% of this" and "12% is all there
 * is" are opposite statements.
 */
function ownershipCard(data, ar, t, open) {
  const links = (data.sectorOwnership?.links || []).filter((l) => l && finite(l.percent) && l.held);
  if (!links.length) return null;
  const newest = links.reduce((best, l) => ((l.asOf || '') > (best.asOf || '') ? l : best), links[0]);
  const same = links.filter((l) => l.held === newest.held)
    .sort((a, b) => b.percent - a.percent).slice(0, 3);
  const heldName = ar ? (newest.heldNameAr || newest.heldName) : (newest.heldName || newest.held);
  const known = same.reduce((s, l) => s + l.percent, 0);
  if (known <= 0 || known >= 100) return null;
  return card({
    key: 'ownership',
    dateline: t(`${newest.asOf} · ownership filing`, `${newest.asOf} · إفصاح ملكية`),
    primitive: t('SHARE BAR', 'شريط نصيب'),
    title: t(`${newest.held} · ${heldName}: ${known.toFixed(2)}% is disclosed`,
      `${newest.held} · ${heldName}: المُعلن ${known.toFixed(2)}%`),
    visual: shareBar({ ar,
      parts: same.map((l) => ({ label: ar ? (l.ownerNameAr || l.ownerName) : l.ownerName, value: l.percent })),
      caption: t('of the company’s capital', 'من رأس مال الشركة') }),
    limit: t('What is filed, not what is held. A stake under the disclosure threshold never appears here.',
      'ما أُفصح عنه، لا ما هو مملوك. الحصة دون حدّ الإفصاح لا تظهر هنا أبداً.'),
    chip: evidenceChip({ ar, date: newest.asOf,
      basis: t('Articles 29 & 38', 'إفصاحات المادتين 29 و 38'), source: 'EGX' }),
    more: h('button', { type: 'button', class: 'ct-more', onClick: () => open(newest.held) },
      t('Open the company ↗', 'افتح الشركة ↗')),
  });
}

export function changedToday(data, ar, { openCompany, openMarket, heading, note }) {
  const t = (en, arabic) => (ar ? arabic : en);
  const open = (ticker) => (ticker ? openCompany(ticker) : openMarket());
  const cards = [volumeCard(data, ar, t, open), indexCard(data, ar, t, open),
    ownershipCard(data, ar, t, open)].filter(Boolean);
  if (!cards.length) return null;
  return h('section', { class: 'ct-shelf', 'aria-label': heading },
    h('div', { class: 'ct-shelf-head' },
      h('h2', null, heading),
      h('span', { class: 'ct-shelf-note' }, note)),
    h('div', { class: 'ct-grid' }, cards));
}

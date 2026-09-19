/* The exchange read sector by sector: money by month, where it rotated, and
 * which sectors own each other.
 *
 * Three questions, three drawings, one honesty rule running through all of
 * them — every figure here is a RECORD. Turnover is money that has already
 * changed hands; a share of turnover is how much of it did; a cross-holding is
 * a stake a form has already been filed on. None of them says where money is
 * going next, and the screen says so in as many words, because a sector chart
 * one tap from a price is read as advice unless it refuses to be.
 *
 * Two arithmetic rules that are easy to get wrong and worth naming:
 *
 * Turnover can be added across months and across companies. It is money. The
 * weighted daily MOVE cannot — compounding a month of moves at today's fixed
 * weights would state a sector return this project does not publish — so a
 * month here carries value, sessions and coverage, and no return at all.
 *
 * A stake percentage cannot be added across companies: 30% of one issuer and
 * 20% of another is not 50% of anything. A stake's market VALUE can, so the
 * ownership ring is weighted in EGP and never in points.
 */

import { React as R } from './react-shim.js';
import { hueOf } from './ownership-map.js';

const h = R.createElement;
const finite = (v) => typeof v === 'number' && Number.isFinite(v);
const money = (v) => (finite(v)
  ? new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 2 }).format(v)
  : '—');
const TAU = Math.PI * 2;

/** A month's label, short enough for an axis and unambiguous about the year. */
export function monthLabel(month, ar) {
  const [year, mm] = String(month || '').split('-');
  const names = ar
    ? ['ينا', 'فبر', 'مار', 'أبر', 'ماي', 'يون', 'يول', 'أغس', 'سبت', 'أكت', 'نوف', 'ديس']
    : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const name = names[Number(mm) - 1] || month;
  return { name, year: (year || '').slice(2) };
}

/* ── how much money moved, month by month ─────────────────────────────────── */

/** One row per published month: the exchange's total and one sector's part. */
export function monthRows(monthly, sector) {
  const mine = new Map((sector?.months || []).map((m) => [m.month, m]));
  return (monthly?.months || []).map((m) => {
    const part = mine.get(m.month);
    return {
      month: m.month,
      value: m.value,
      sessions: m.sessions,
      companies: m.companies,
      coverage: m.coverage,
      partial: m.partial === true,
      part: part ? part.value : null,
      share: part && m.value ? (part.value / m.value) * 100 : null,
    };
  });
}

/* ── where the money rotated ──────────────────────────────────────────────────
 *
 * Every sector, every time — not the ones that moved most. A list of sectors
 * cut at five and ordered by momentum is a recommendation whoever writes the
 * caption, so the cardinality here is the market's and the order is the
 * alphabet's. A reader who wants the biggest shift can see it; the publisher
 * never picked it out for them.
 */
export function rotation(monthly, sectors, month, ar) {
  const months = monthly?.months || [];
  const at = months.findIndex((m) => m.month === month);
  const now = at >= 0 ? months[at] : months[months.length - 1];
  const before = at > 0 ? months[at - 1] : (months.length > 1 ? months[months.length - 2] : null);
  if (!now) return { rows: [], now: null, before: null };
  const shareOf = (sector, bucket) => {
    if (!bucket || !bucket.value) return null;
    const mine = (sector.months || []).find((m) => m.month === bucket.month);
    return mine ? (mine.value / bucket.value) * 100 : null;
  };
  const rows = (sectors || []).map((sector) => {
    const share = shareOf(sector, now);
    const was = shareOf(sector, before);
    const mine = (sector.months || []).find((m) => m.month === now.month);
    return {
      id: sector.id,
      name: ar ? (sector.nameAr || sector.name) : (sector.name || sector.id),
      value: mine ? mine.value : null,
      share,
      was,
      change: finite(share) && finite(was) ? share - was : null,
    };
  }).filter((r) => finite(r.share) || finite(r.was));
  rows.sort((a, b) => a.name.localeCompare(b.name, ar ? 'ar' : 'en'));
  return { rows, now, before };
}

/* ── which sectors own each other ─────────────────────────────────────────── */

/** Sectors on a ring, and the stakes between them as arcs across it. */
export function ringLayout(doc, view = { w: 720, h: 520 }) {
  const flows = doc?.flows || [];
  const involved = new Map();
  const add = (id, ar) => {
    if (!involved.has(id)) involved.set(id, { id, nameAr: ar, holds: 0, held: 0, value: 0 });
    return involved.get(id);
  };
  flows.forEach((f) => {
    const from = add(f.fromSector, f.fromSectorAr);
    const to = add(f.toSector, f.toSectorAr);
    from.holds += f.links;
    to.held += f.links;
    from.value += f.value || 0;
    to.value += f.value || 0;
  });
  const list = [...involved.values()].sort((a, b) => a.id.localeCompare(b.id, 'en'));
  const cx = view.w / 2;
  const cy = view.h / 2;
  const ring = Math.min(view.w, view.h) * 0.36;
  const biggest = Math.max(1, ...list.map((n) => n.value));
  const nodes = new Map();
  list.forEach((node, i) => {
    const angle = -Math.PI / 2 + (i / list.length) * TAU;
    nodes.set(node.id, {
      ...node,
      angle,
      x: cx + Math.cos(angle) * ring,
      y: cy + Math.sin(angle) * ring,
      // Area with the money, floored so a small holding is still a node.
      r: 9 + Math.sqrt(node.value / biggest) * 15,
      outward: { x: Math.cos(angle), y: Math.sin(angle) },
    });
  });
  const widest = Math.max(1, ...flows.map((f) => f.value || 0));
  const links = flows.map((f) => {
    const from = nodes.get(f.fromSector);
    const to = nodes.get(f.toSector);
    const weight = 1 + Math.sqrt((f.value || 0) / widest) * 6;
    if (!from || !to) return null;
    if (from === to) {
      // A sector that owns itself: a loop standing off its own node, outside
      // the ring where it cannot be mistaken for a link to a neighbour.
      // Standing off INWARD, toward the middle of the ring: outward is where
      // the sector's name goes, and a loop under a label is a smudge.
      const reach = from.r + 34;
      const ox = from.x - from.outward.x * reach;
      const oy = from.y - from.outward.y * reach;
      const wide = 30;
      return {
        ...f, from, to, weight, self: true,
        d: `M ${from.x.toFixed(1)} ${from.y.toFixed(1)} `
           + `C ${(ox + from.outward.y * wide).toFixed(1)} ${(oy - from.outward.x * wide).toFixed(1)} `
           + `${(ox - from.outward.y * wide).toFixed(1)} ${(oy + from.outward.x * wide).toFixed(1)} `
           + `${from.x.toFixed(1)} ${from.y.toFixed(1)}`,
      };
    }
    // Bowed toward the middle, so two sectors facing each other across the
    // ring do not draw a chord straight through every node between them.
    const mx = (from.x + to.x) / 2;
    const my = (from.y + to.y) / 2;
    const pull = 0.45;
    return {
      ...f, from, to, weight, self: false,
      d: `M ${from.x.toFixed(1)} ${from.y.toFixed(1)} `
         + `Q ${(mx + (cx - mx) * pull).toFixed(1)} ${(my + (cy - my) * pull).toFixed(1)} `
         + `${to.x.toFixed(1)} ${to.y.toFixed(1)}`,
    };
  }).filter(Boolean);
  return { nodes: [...nodes.values()], links, view, cx, cy, ring };
}

/** The months chart: the exchange's turnover a month at a time, one sector lit. */
export function ownershipRing(doc, { ar, t, focus, onPick }) {
  const model = ringLayout(doc);
  if (!model.nodes.length) return null;
  const { view } = model;
  const lit = (id) => !focus || id === focus;
  const nameOf = (node) => (ar ? (node.nameAr || node.id) : node.id);

  return h('svg', {
    className: 'sl-ring', viewBox: `0 0 ${view.w} ${view.h}`,
    role: 'img', preserveAspectRatio: 'xMidYMid meet',
    'aria-label': t(
      `${doc.linkCount} filed stakes between listed companies, drawn sector to sector`,
      `${doc.linkCount} حصة مُفصح عنها بين شركات مقيدة، مرسومة من قطاع إلى قطاع`),
  },
    h('g', { className: 'sl-ring-links' },
      model.links.map((link) => {
        const on = lit(link.fromSector) || lit(link.toSector);
        const key = `${link.fromSector}>${link.toSector}`;
        return h('g', { key, className: `sl-flow${on ? '' : ' sl-dim'}` },
          h('title', null,
            `${(ar ? link.fromSectorAr : link.fromSector)} → `
            + `${(ar ? link.toSectorAr : link.toSector)} · ${link.links} `
            + t('filed stakes', 'حصة مُفصح عنها')
            + (link.value ? ` · ${money(link.value)} EGP` : '')),
          h('path', {
            d: link.d, fill: 'none', stroke: hueOf(link.fromSector),
            'stroke-width': link.weight, 'stroke-linecap': 'round',
            opacity: on ? 0.75 : 0.14,
          }),
          // The dot runs from owner to owned, which is the direction of the
          // claim: an arrowhead at this weight is a smudge.
          on && h('circle', { r: 2.6, fill: hueOf(link.fromSector) },
            h('animateMotion', {
              dur: `${(2.4 + (link.links % 3) * 0.5).toFixed(1)}s`,
              repeatCount: 'indefinite', path: link.d,
            }))
        );
      })
    ),
    h('g', { className: 'sl-ring-nodes' },
      model.nodes.map((node) => {
        const on = lit(node.id);
        const right = Math.cos(node.angle) > -0.2;
        return h('g', {
          key: node.id, className: `sl-node${on ? '' : ' sl-dim'}`,
          role: 'button', tabIndex: 0,
          onClick: () => onPick && onPick(focus === node.id ? null : node.id),
          onKeyDown: (e) => {
            if (onPick && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault(); onPick(focus === node.id ? null : node.id);
            }
          },
        },
          h('title', null, `${nameOf(node)} — ${t('holds', 'يملك')} ${node.holds}, `
            + `${t('held by', 'مملوك من')} ${node.held}`),
          h('circle', {
            cx: node.x, cy: node.y, r: node.r, fill: hueOf(node.id),
            stroke: 'var(--surface)', 'stroke-width': 2,
            opacity: on ? 1 : 0.3,
          }),
          // Painted on the page's own ground: a sector's name sits wherever
          // the ring has room, which is usually on top of somebody's line.
          h('text', {
            x: node.x + node.outward.x * (node.r + 13),
            y: node.y + node.outward.y * (node.r + 13) + 3,
            'text-anchor': right ? 'start' : 'end',
            'font-size': 9.5, 'font-weight': 600,
            fill: on ? 'var(--ink)' : 'var(--faint)',
            stroke: 'var(--surface)', 'stroke-width': 3.5,
            'paint-order': 'stroke', 'stroke-linejoin': 'round',
            direction: ar ? 'rtl' : 'ltr',
          }, nameOf(node).length > 26 ? `${nameOf(node).slice(0, 24)}…` : nameOf(node))
        );
      })
    )
  );
}

/* ── Changes in trading share ──────────────────────────────────────────────
 *
 * What replaced the months-of-money chart, and why.
 *
 * That chart plotted absolute turnover, which is two things added together: a
 * month where the whole market was busier, and a month where this sector took
 * a bigger slice of it. A reader cannot separate them by looking. It also
 * changed scale between two views, so the height of a bar meant one thing and
 * then another, and it hatched the months that could not be compared while
 * still drawing them the same height.
 *
 * This draws one thing: how many points of the exchange's traded value each
 * sector gained or lost against the month before. The number is printed in the
 * cell, so the colour is a second reading of it and never the only one.
 */

const MONTHS_SHOWN = 12;

/** The window of months on screen, newest last. */
export function windowOf(rows, size = MONTHS_SHOWN, end) {
  const withChange = rows.filter((r) => r && r.changes);
  if (!withChange.length) return [];
  const last = end ? withChange.findIndex((r) => r.month === end) : withChange.length - 1;
  const stop = last < 0 ? withChange.length - 1 : last;
  return withChange.slice(Math.max(0, stop - size + 1), stop + 1);
}

/** Sectors that actually moved in the window — a filter, never a ranking. */
export function movers(window_, sectors, notable) {
  const bar = finite(notable) ? notable : 1;
  return sectors.filter((s) =>
    window_.some((r) => Math.abs((r.changes || {})[s] || 0) >= bar));
}

/** How strongly to ink a cell: the number carries it, the colour agrees. */
export function inkFor(points, notable) {
  const bar = (finite(notable) ? notable : 1) * 3;
  const weight = Math.min(1, Math.abs(points || 0) / bar);
  if (!points || weight < 0.08) return null;
  return { colour: points > 0 ? 'var(--up)' : 'var(--down)', weight };
}

export function shareHeatmap(doc, { ar, t, onPick, month, focus }) {
  const rows = windowOf(doc.months, MONTHS_SHOWN, month);
  if (rows.length < 2) return null;
  const shown = movers(rows, doc.sectors || [], doc.notable);
  const quiet = (doc.sectors || []).length - shown.length;

  return h('div', { className: 'sl-heat-wrap' },
    h('table', { className: 'sl-heat' },
      h('caption', { className: 'sl-heat-cap' },
        t(`Points of the exchange's traded value gained or lost against the month before. `
          + `${shown.length} sectors moved at least ${doc.notable} point in these months; `
          + `${quiet} stayed inside it.`,
          `نقاط من قيمة تداول البورصة كسبها القطاع أو خسرها مقارنة بالشهر السابق. `
          + `تحرك ${shown.length} قطاعاً نقطة واحدة على الأقل في هذه الشهور، `
          + `وظل ${quiet} داخل هذا الحد.`)),
      h('thead', null, h('tr', null,
        h('th', { scope: 'col', className: 'sl-heat-side' }, t('Sector', 'القطاع')),
        rows.map((r) => h('th', {
          key: r.month, scope: 'col', className: 'sl-heat-month', dir: 'ltr',
        }, r.month.slice(2)))
      )),
      h('tbody', null, shown.map((s) => h('tr', {
        key: s,
        className: `sl-heat-row${focus === s ? ' sl-heat-on' : ''}`,
        onClick: () => onPick && onPick(s),
      },
        h('th', { scope: 'row', className: 'sl-heat-side', title: s }, s),
        rows.map((r) => {
          const v = (r.changes || {})[s];
          const ink = inkFor(v, doc.notable);
          return h('td', {
            key: r.month, dir: 'ltr',
            className: 'sl-heat-cell',
            style: ink ? { color: ink.colour, fontWeight: 600 } : null,
            title: `${s} · ${r.month} · ${finite(v) ? v.toFixed(2) : '0'} pp`,
          }, finite(v) && Math.abs(v) >= 0.05
            ? `${v > 0 ? '+' : ''}${v.toFixed(1)}` : '·');
        })
      )))
    )
  );
}

/** Every earlier month this sector gained share, and what the next month did. */
export function followedPanel(doc, sector, { ar, t }) {
  const record = (doc.followed || {})[sector];
  if (!record) return null;
  const cases = (record.cases || []).slice().reverse();

  return h('div', { className: 'sl-followed' },
    h('h3', null, t('What followed, the other times', 'ماذا تلا ذلك في المرات الأخرى')),
    h('p', { className: 'ft-note' },
      record.count === 0
        ? t(`This sector has not gained ${record.qualify} points of share in a single month in this record.`,
            `لم يكسب هذا القطاع ${record.qualify} نقطة من النصيب في شهر واحد في هذا السجل.`)
        : record.share === null
          // One case is a case. Rounding it to a percentage is how a single
          // month becomes a claim about the market.
          ? t(`${record.count} earlier month${record.count === 1 ? '' : 's'} in this record — too few to put a rate on. They are listed below.`,
              `${record.count} شهراً سابقاً في هذا السجل — أقل من أن يُبنى عليها معدل. وهي مذكورة أدناه.`)
          : t(`It gained at least ${record.qualify} points of share in ${record.count} earlier months. Its share fell the month after in ${record.gaveBack} of them.`,
              `كسب ما لا يقل عن ${record.qualify} نقطة من النصيب في ${record.count} شهراً سابقاً. وتراجع نصيبه في الشهر التالي في ${record.gaveBack} منها.`)),
    cases.length ? h('ul', { className: 'sl-cases' },
      cases.map((c) => h('li', { key: c.month },
        h('span', { dir: 'ltr' }, c.month),
        h('b', { dir: 'ltr', style: { color: 'var(--up)' } }, `+${c.rose.toFixed(1)}`),
        h('small', null, t('then', 'ثم')),
        h('b', { dir: 'ltr', style: { color: c.then < 0 ? 'var(--down)' : 'var(--up)' } },
          `${c.then > 0 ? '+' : ''}${c.then.toFixed(1)}`)
      ))) : null
  );
}

/* ── Trading share over time, one line a sector ─────────────────────────────
 *
 * The grid says what changed last month. This says the shape of it: a line
 * rising while another falls IS money moving between sectors, drawn without
 * anybody having to claim a transfer that the record cannot evidence.
 *
 * The lines are labelled at their own right-hand ends rather than in a legend.
 * A legend makes colour the key, and thirteen keyed colours is a memory test
 * a reader should not have to sit — worse for anyone who cannot separate two
 * of them. Labelled in place, the colour is only there to help the eye follow
 * one line across the others.
 */

// Every sector that has ever taken this much of a month's turnover. A stated
// filter: it returns however many clear it, and the rest are drawn as one
// muted line so the chart still adds to the whole market.
const LINE_FLOOR = 5;
const LINE_MONTHS = 36;

export function lineSectors(rows, sectors, floor = LINE_FLOOR) {
  const peak = (s) => Math.max(...rows.map((r) => (r.shares || {})[s] || 0));
  return sectors.filter((s) => peak(s) >= floor);
}

/** Evenly spread hues, assigned alphabetically so the colour never ranks. */
export function lineColour(index, total) {
  const step = 360 / Math.max(1, total);
  return `hsl(${Math.round((index * step + 12) % 360)} 62% 42%)`;
}

export function shareLines(doc, { ar, t, focus, onPick, months = LINE_MONTHS }) {
  const rows = (doc.months || []).slice(-months);
  if (rows.length < 3) return null;
  const drawn = lineSectors(rows, doc.sectors || []);
  if (!drawn.length) return null;

  const view = { w: 760, h: 340 };
  const pad = { l: 34, r: 168, t: 14, b: 26 };
  const top = Math.max(...drawn.map((s) =>
    Math.max(...rows.map((r) => (r.shares || {})[s] || 0)))) * 1.06 || 1;
  const xOf = (i) => pad.l + (i / (rows.length - 1)) * (view.w - pad.l - pad.r);
  const yOf = (v) => view.h - pad.b - (v / top) * (view.h - pad.t - pad.b);

  // Where each label sits, pushed apart so two lines ending together do not
  // print on top of one another.
  const ends = drawn.map((s, i) => ({
    sector: s, i, y: yOf((rows[rows.length - 1].shares || {})[s] || 0),
  })).sort((a, b) => a.y - b.y);
  let last = -99;
  ends.forEach((e) => { e.at = Math.max(e.y, last + 11); last = e.at; });

  const ticks = [0, 0.5, 1].map((f) => f * top);

  return h('div', { className: 'sl-lines-wrap' }, h('svg', {
    className: 'sl-lines', viewBox: `0 0 ${view.w} ${view.h}`,
    role: 'img', preserveAspectRatio: 'xMidYMid meet',
    'aria-label': t(
      `Each sector's share of the exchange's traded value, ${rows[0].month} to ${rows[rows.length - 1].month}`,
      `نصيب كل قطاع من قيمة تداول البورصة من ${rows[0].month} إلى ${rows[rows.length - 1].month}`),
  },
    ticks.map((v) => h('g', { key: `t${v}` },
      h('line', { x1: pad.l, x2: view.w - pad.r, y1: yOf(v), y2: yOf(v),
        stroke: 'var(--rule)', 'stroke-width': 0.6, opacity: 0.75 }),
      h('text', { x: pad.l - 5, y: yOf(v) + 3, 'text-anchor': 'end',
        'font-size': 8.5, fill: 'var(--faint)', direction: 'ltr' }, `${v.toFixed(0)}%`)
    )),
    h('text', { x: pad.l, y: view.h - 7, 'font-size': 8.5, fill: 'var(--faint)',
      direction: 'ltr' }, rows[0].month),
    h('text', { x: view.w - pad.r, y: view.h - 7, 'text-anchor': 'end',
      'font-size': 8.5, fill: 'var(--faint)', direction: 'ltr' },
      rows[rows.length - 1].month),

    drawn.map((s, i) => {
      const on = focus === s;
      const d = rows.map((r, n) =>
        `${n ? 'L' : 'M'}${xOf(n).toFixed(1)} ${yOf((r.shares || {})[s] || 0).toFixed(1)}`).join(' ');
      return h('path', {
        key: s, d, fill: 'none', stroke: lineColour(i, drawn.length),
        'stroke-width': on ? 2.6 : 1.3,
        'stroke-linejoin': 'round', 'stroke-linecap': 'round',
        opacity: !focus || on ? 1 : 0.22,
        className: 'sl-line',
        onClick: () => onPick && onPick(s),
      }, h('title', null, `${s} · ${((rows[rows.length - 1].shares || {})[s] || 0).toFixed(1)}%`));
    }),

    ends.map((e) => h('text', {
      key: e.sector, x: view.w - pad.r + 6, y: e.at + 3,
      'font-size': 10, className: 'sl-line-label',
      fill: !focus || focus === e.sector ? lineColour(e.i, drawn.length) : 'var(--faint)',
      'font-weight': focus === e.sector ? 700 : 500,
      onClick: () => onPick && onPick(e.sector),
    }, e.sector.length > 26 ? `${e.sector.slice(0, 25)}…` : e.sector))
  ));
}

/* ── the sectors, on aligned bars ───────────────────────────────────────── */

/**
 * Size, activity and movement, separated and aligned.
 *
 * The screen showed sectors as a grid of cards, and a card grid cannot answer
 * the question this table exists for: is this sector big, or is it busy?
 * Those are different facts and a card puts them in different places on every
 * tile. On one scale, down one column, a reader can see that a sector holding
 * a twentieth of the market's value took a fifth of its trading — which is
 * the whole observation.
 *
 * Three rules the numbers have to keep:
 *
 * Traded value is not money entering. Every trade has two sides; a sector
 * with high turnover had a lot of shares change hands, and the note under
 * the title says exactly that, because "activity" is read as "inflow" by
 * default.
 *
 * A company that did not trade is not a company that held steady. It gets
 * its own hatched band in the breadth bar, never the "unchanged" grey, and
 * it is counted in the denominator so the bar cannot silently rescale.
 *
 * The weighted return is the exchange's own arithmetic on this document
 * (`sizeWeightedReturn`), not something re-derived here from the members.
 */
export function sectorTable(doc, { ar, t }) {
  const sectors = (doc && Array.isArray(doc.sectors) ? doc.sectors : [])
    .filter((s) => s && Array.isArray(s.members) && s.members.length);
  if (!sectors.length) return null;

  const valueOf = (s) => s.members.reduce((sum, m) => sum + (finite(m.value) ? m.value : 0), 0);
  const capOf = (s) => (finite(s.cap) ? s.cap
    : s.members.reduce((sum, m) => sum + (finite(m.cap) ? m.cap : 0), 0));
  const totalCap = sectors.reduce((sum, s) => sum + capOf(s), 0);
  const totalValue = sectors.reduce((sum, s) => sum + valueOf(s), 0);
  if (!totalCap || !totalValue) return null;

  const pct = (v) => `${(v * 100).toFixed(1)}%`;
  const signed = (v) => (finite(v) ? `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(2)}%` : '—');

  const rows = sectors.map((s) => {
    const cap = capOf(s), value = valueOf(s);
    // A reading each way. `change === null` is a company the session has no
    // move for: it did not trade, which is the opposite fact to "unchanged".
    let up = 0, down = 0, flat = 0, none = 0;
    for (const m of s.members) {
      if (!finite(m.change)) none += 1;
      else if (m.change > 0) up += 1;
      else if (m.change < 0) down += 1;
      else flat += 1;
    }
    const counted = s.members.length || 1;
    const width = (n) => `${((n / counted) * 100).toFixed(2)}%`;
    return {
      id: s.id, name: ar ? (s.nameAr || s.name) : s.name,
      size: cap / totalCap, act: value / totalValue,
      ret: finite(s.sizeWeightedReturn) ? s.sizeWeightedReturn : null,
      up, down, flat, none, counted,
      upW: width(up), downW: width(down), flatW: width(flat), noneW: width(none),
    };
  }).sort((a, b) => b.act - a.act);

  // Both bars are drawn against the LARGEST sector, not against the whole
  // market: at 1% of the total every bar is a sliver and the column stops
  // being readable. The percentage beside it is the real share.
  const maxSize = Math.max(...rows.map((r) => r.size));
  const maxAct = Math.max(...rows.map((r) => r.act));

  const bar = (share, max, cls) => h('span', { class: 'sx-track' },
    h('span', { class: `sx-fill ${cls}`, style: `width:${((share / max) * 100).toFixed(2)}%` }));

  const head = h('div', { class: 'sx-head' },
    h('span', null, t('Sector', 'القطاع')),
    h('span', null, t('Size · share of covered market value', 'حجم · نصيب من القيمة السوقية المغطاة')),
    h('span', null, t('Activity · share of traded value', 'نشاط · نصيب من القيمة المتداولة')),
    h('span', null, t('Movement · weighted return and breadth', 'حركة · عائد مرجّح واتساع')));

  const body = rows.map((r) => h('div', { key: r.id, class: 'sx-row' },
    h('span', { class: 'sx-name' }, r.name),
    h('span', { class: 'sx-cell' }, bar(r.size, maxSize, 'is-size'),
      h('b', { dir: 'ltr' }, pct(r.size))),
    h('span', { class: 'sx-cell' }, bar(r.act, maxAct, 'is-act'),
      h('b', { dir: 'ltr' }, pct(r.act))),
    h('span', { class: 'sx-cell sx-move' },
      h('b', { class: r.ret > 0 ? 'up' : r.ret < 0 ? 'down' : '', dir: 'ltr' }, signed(r.ret)),
      h('span', { class: 'sx-breadth', role: 'img',
        'aria-label': ar
          ? `${r.up} صعدت · ${r.flat} بلا تغيّر · ${r.down} هبطت · ${r.none} لم تتداول`
          : `${r.up} rose · ${r.flat} unchanged · ${r.down} fell · ${r.none} did not trade` },
      h('i', { class: 'is-up', style: `width:${r.upW}` }),
      h('i', { class: 'is-flat', style: `width:${r.flatW}` }),
      h('i', { class: 'is-down', style: `width:${r.downW}` }),
      h('i', { class: 'is-none', style: `width:${r.noneW}` })),
      h('small', { dir: 'ltr' }, `${r.up}/${r.counted}`))));

  return h('section', { class: 'sx-table', 'aria-label': t('Sectors this session', 'القطاعات في هذه الجلسة') },
    h('p', { class: 'card-dateline' },
      h('span', null, doc.asOf
        ? t(`${doc.asOf} · ${doc.isClose ? 'completed session' : 'session in progress'} · ${sectors.length} sectors`,
          `${doc.asOf} · ${doc.isClose ? 'جلسة مكتملة' : 'جلسة جارية'} · ${sectors.length} قطاعاً`)
        : t(`${sectors.length} sectors`, `${sectors.length} قطاعاً`))),
    h('h2', { class: 'sx-title' }, t('Sectors', 'القطاعات')),
    h('p', { class: 'card-lead' }, t(
      'Traded value is trading, not money coming in — every trade has two sides.',
      'القيمة المتداولة قيمة تداول، لا «أموال داخلة» — لكل صفقة طرفان.')),
    head,
    h('div', { class: 'sx-rows' }, body),
    h('p', { class: 'sx-key' },
      h('span', null, h('i', { class: 'is-up' }), t('rose', 'صعدت')),
      h('span', null, h('i', { class: 'is-flat' }), t('unchanged', 'بلا تغيّر')),
      h('span', null, h('i', { class: 'is-down' }), t('fell', 'هبطت')),
      h('span', null, h('i', { class: 'is-none' }), t('did not trade', 'لم تتداول'))));
}

/* ── one company's disclosed ownership ──────────────────────────────────── */

/**
 * Who has filed a stake in this company, and how much of it nobody has.
 *
 * §11.5's ownership card. The disclosed holders are named and the rest is
 * one hatched band that says "not disclosed" — never normalised away, because
 * "we know a third of this" and "a third is all there is" are opposite
 * statements, and a bar that adds to 100% makes the second one silently.
 *
 * The threshold is the reason the remainder exists at all: a stake under the
 * disclosure floor is never filed, so it is not missing data, it is data that
 * was never required. The note says so rather than leaving a reader to assume
 * the gap is a gap in this site's coverage.
 */
export function companyOwnership(doc, ticker, { ar, t, shareBar }) {
  const links = (doc && Array.isArray(doc.links) ? doc.links : [])
    .filter((l) => l && l.held === ticker && finite(l.percent) && l.percent > 0)
    .sort((a, b) => b.percent - a.percent);
  if (!links.length) return null;
  const known = links.reduce((sum, l) => sum + l.percent, 0);
  if (known >= 100) return null;
  const newest = links.reduce((best, l) => ((l.asOf || '') > (best.asOf || '') ? l : best), links[0]);
  return h('section', { class: 'co-own' },
    h('p', { class: 'card-dateline' },
      h('span', null, newest.asOf
        ? t(`Latest ownership filing ${newest.asOf}`, `آخر إفصاح ملكية ${newest.asOf}`)
        : t('Ownership filings', 'إفصاحات الملكية'))),
    h('h3', { class: 'co-own-title' }, t('Ownership', 'الملكية')),
    shareBar({ ar,
      parts: links.slice(0, 4).map((l) => ({
        label: ar ? (l.ownerNameAr || l.ownerName || l.owner) : (l.ownerName || l.owner),
        value: l.percent })),
      caption: t('of the company’s capital', 'من رأس مال الشركة') }),
    h('p', { class: 'co-own-note' }, t(
      'Filed stakes only. A holding under the disclosure threshold is never filed, so the remainder is not a gap in this record — it is a part nobody was required to name.',
      'الحصص المُفصح عنها فقط. الحصة دون حدّ الإفصاح لا تُقدَّم أصلاً، فالباقي ليس نقصاً في هذا السجل — بل جزء لم يُلزَم أحد بتسميته.')));
}

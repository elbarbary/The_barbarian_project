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
export function monthsChart(monthly, sector, { ar, t, onPick, month, mode }) {
  const rows = monthRows(monthly, sector);
  if (rows.length < 2) return null;
  // Two scales, because one cannot answer both questions. Against the whole
  // exchange a sector worth a tenth of it is a tenth of a column — true, and
  // unreadable as a shape. On its own scale its own months are legible and the
  // market is gone. The reader picks; neither view is the default truth.
  const alone = mode === 'sector' && !!sector;
  const top = (alone
    ? Math.max(...rows.map((r) => r.part || 0))
    : Math.max(...rows.map((r) => r.value || 0))) * 1.08 || 1;
  const view = { w: 720, h: 230 };
  const pad = { l: 46, r: 8, t: 14, b: 34 };
  const band = (view.w - pad.l - pad.r) / rows.length;
  const width = Math.min(band * 0.62, 44);
  const floor = view.h - pad.b;
  const yOf = (v) => floor - (v / top) * (floor - pad.t);
  const ticks = [0, 0.5, 1].map((f) => f * top);
  const colour = sector ? hueOf(sector.id) : 'var(--accent)';

  return h('svg', {
    className: 'sl-months', viewBox: `0 0 ${view.w} ${view.h}`,
    role: 'img', preserveAspectRatio: 'xMidYMid meet',
    'aria-label': t(
      `Covered turnover by month, ${rows[0].month} to ${rows[rows.length - 1].month}`,
      `قيمة التداول المغطاة شهرياً من ${rows[0].month} إلى ${rows[rows.length - 1].month}`),
  },
    h('defs', null,
      // Hatching, not a lighter colour: a month that is still running or that
      // the archive joins halfway through cannot be compared with a full one,
      // and a legend nobody reads should not be the only place that says so.
      h('pattern', {
        id: 'sl-partial', width: 5, height: 5,
        patternTransform: 'rotate(45)', patternUnits: 'userSpaceOnUse',
      }, h('line', {
        x1: 0, y1: 0, x2: 0, y2: 5, stroke: 'var(--rule)', 'stroke-width': 2.4,
      }))
    ),
    ticks.map((v) => h('g', { key: `t${v}` },
      h('line', {
        x1: pad.l, x2: view.w - pad.r, y1: yOf(v), y2: yOf(v),
        stroke: 'var(--rule)', 'stroke-width': 0.6, opacity: 0.7,
      }),
      h('text', {
        x: pad.l - 6, y: yOf(v) + 3, 'text-anchor': 'end',
        'font-size': 8.5, fill: 'var(--faint)', direction: 'ltr',
      }, money(v))
    )),
    rows.map((r, i) => {
      const x = pad.l + band * i + (band - width) / 2;
      const ground = alone ? (r.part || 0) : (r.value || 0);
      const full = yOf(ground);
      const part = !alone && finite(r.part) ? yOf(r.part) : null;
      const label = monthLabel(r.month, ar);
      const on = month === r.month;
      return h('g', {
        key: r.month, className: `sl-col${on ? ' sl-col-on' : ''}`,
        role: 'button', tabIndex: 0,
        onClick: () => onPick && onPick(r.month),
        onKeyDown: (e) => {
          if (onPick && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onPick(r.month); }
        },
      },
        h('title', null,
          `${r.month} · ${money(ground)} EGP`
          + (alone ? ` (${finite(r.share) ? r.share.toFixed(1) : '—'}% `
                     + `${t('of the month', 'من الشهر')})` : '')
          + ` · ${r.sessions} ` + t('sessions', 'جلسة') + ` · ${r.companies} `
          + t('companies traded', 'شركة تداولت')
          + (r.partial ? ` · ${t('part month', 'شهر ناقص')}` : '')),
        h('rect', {
          x, y: full, width, height: Math.max(0, floor - full),
          rx: 2,
          fill: r.partial ? 'url(#sl-partial)' : (alone ? colour : 'var(--own-cell)'),
          opacity: alone && !r.partial ? 0.92 : 1,
          stroke: 'var(--rule)', 'stroke-width': 0.6,
        }),
        part !== null && r.part > 0 && h('rect', {
          x, y: part, width, height: Math.max(0.8, floor - part),
          rx: 2, fill: colour, opacity: 0.92,
        }),
        h('text', {
          x: x + width / 2, y: view.h - 14, 'text-anchor': 'middle',
          'font-size': 8.5, fill: on ? 'var(--ink)' : 'var(--faint)',
          'font-weight': on ? 700 : 400,
        }, label.name),
        (i === 0 || label.name === (ar ? 'ينا' : 'Jan')) && h('text', {
          x: x + width / 2, y: view.h - 4, 'text-anchor': 'middle',
          'font-size': 7.5, fill: 'var(--faint)', direction: 'ltr',
        }, `'${label.year}`)
      );
    })
  );
}

/** The ownership ring: sectors, and the stakes they hold in one another. */
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

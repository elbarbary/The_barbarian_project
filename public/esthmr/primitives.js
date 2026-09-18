/* The redesign's shared parts: the evidence chip, the six data states, and
 * the five charts everything else is drawn with.
 *
 * WHY A CLOSED SET
 * ----------------
 * Before this file the product invented a visual idiom per section, which is
 * why the newer screens read as assembled rather than designed: eleven ways
 * to draw a comparison teach a reader eleven times. There are five shapes
 * here and the heat map's treemap, which is its own and is not reused.
 * Anything outside them needs a reason, written down where it is used.
 *
 *   line              a series over time, optionally against a ghost
 *   pairedBars        this period beside its comparable prior
 *   shareBar          one 100% bar split into named parts
 *   distributionDot   today's value on its own history
 *   datedTimeline     events on a time axis
 *
 * WHY EACH ONE IS DRAWN TWICE IN THE DESIGN
 * -----------------------------------------
 * A chart that only survives its good case is a chart that lies on the days
 * that matter. Every shape here takes the hard case as an argument rather
 * than as an afterthought: a suspension gap, a loss crossing zero, a period
 * nobody filed, a remainder nobody disclosed, an input six sessions old.
 * None of those is allowed to look like a number.
 *
 * NO FIGURE IS WRITTEN INTO THIS FILE. A chart with nothing to draw draws
 * nothing and says so in words where it would have stood.
 *
 * Colours are token names, never the literals the design comp used. The comp
 * is one theme; the site has two, and `stroke="var(--accent)"` resolves in
 * both. Every coordinate is checked finite before it is written, because a
 * NaN in a path does not throw — it silently erases the line.
 */
import { React as R } from './react-shim.js';

const h = R.createElement;

export const finite = (v) => typeof v === 'number' && Number.isFinite(v);

/* Pattern and clip ids have to be unique per document or the first one wins
 * for every chart on the page. A module counter is enough: nothing here is
 * server-rendered, so there is no hydration mismatch to worry about. */
let uid = 0;
const nextId = (stem) => `${stem}-${++uid}`;

/** The stripe that means absence. Used for a gap, a stale span, an unknown
 *  remainder — never for a value. */
function hatchDef(id, opacity = 1) {
  return h('defs', { key: 'defs' },
    h('pattern', { id, width: 8, height: 8, patternTransform: 'rotate(45)',
      patternUnits: 'userSpaceOnUse', opacity },
      h('line', { x1: 0, y1: 0, x2: 0, y2: 8, stroke: 'var(--hatch)', strokeWidth: 3 })));
}

const MONO = "'IBM Plex Mono',monospace";

/** The caption every chart carries: unit, period, comparison basis. On the
 *  chart, because a basis in a footnote is a basis nobody read. */
const caption = (text, x, y, anchor = 'start', fill = 'var(--faint)', size = 10) =>
  (text ? h('text', { key: 'cap', x, y, textAnchor: anchor, fill, fontSize: size, fontFamily: MONO }, text) : null);

/** Words where a chart would have stood. */
function nothing(message) {
  return h('div', { className: 'pv-nothing' }, message);
}

/* ── the six data states ─────────────────────────────────────────────────
 *
 * "Stale" and "unchanged" looking alike was the highest-severity visual bug
 * in the product, and "did not trade" is not "did not move" — they are
 * opposite facts. Fixed once, here, so no screen can get it wrong on its own.
 */
export const STATES = {
  present:      { ar: 'موجود',      en: 'PRESENT',       mark: '',   ink: 'var(--ink)' },
  unavailable:  { ar: 'غير متاح',   en: 'UNAVAILABLE',   mark: '—',  ink: 'var(--faint)' },
  stale:        { ar: 'قديم',       en: 'STALE',         mark: '⟲',  ink: 'var(--stStale)' },
  didNotTrade:  { ar: 'لم يتداول',  en: 'DID NOT TRADE', mark: '▨',  ink: 'var(--stNone)' },
  estimated:    { ar: 'تقديري',     en: 'ESTIMATED',     mark: '≈',  ink: 'var(--stEstimated)' },
  zero:         { ar: 'صفر',        en: 'GENUINE ZERO',  mark: '0',  ink: 'var(--ink)' },
};

export const stateLabel = (name, ar) => (STATES[name] || STATES.present)[ar ? 'ar' : 'en'];

/** The state as a swatch: a fill, an edge and a mark, so it is told apart by
 *  shape and texture and not only by a shade. */
export function stateMark(name, ar = false) {
  const s = STATES[name] || STATES.present;
  return h('div', { className: `pv-state pv-state-${name}`, 'data-state': name },
    h('div', { className: 'pv-state-swatch', 'aria-hidden': 'true' }, s.mark),
    h('div', { className: 'pv-state-ar', dir: 'rtl' }, s.ar),
    h('div', { className: 'pv-state-en' }, s.en));
}

/* ── the evidence chip ───────────────────────────────────────────────────
 *
 * The product's whole claim is that every figure traces to a document, so
 * that claim is one small repeated element rather than a paragraph nobody
 * reads. Date, basis, source — one line, 44px, and it opens the source.
 *
 * A chip with no source is not decoration: it says which of the six states
 * the figure is in and stops. That is the honest version of a dash.
 */
export function evidenceChip({ date, basis, source, href, state = 'present', ar = false } = {}) {
  const s = STATES[state] || STATES.present;
  const parts = [date, basis].filter(Boolean).join(' · ');
  if (!parts && !source) return null;
  const inner = [
    h('span', { key: 'p', className: 'pv-chip-lead' }, parts || s[ar ? 'ar' : 'en']),
    source ? h('span', { key: 's', className: 'pv-chip-source' }, `${source} ↗`) : null,
  ];
  const props = { className: 'pv-chip', 'data-state': state, dir: ar ? 'rtl' : 'ltr' };
  return href
    ? h('a', { ...props, href, rel: 'noopener' }, inner)
    : h('div', props, inner);
}

/* ── density ─────────────────────────────────────────────────────────────
 *
 * The beginner and the researcher are the same person on different days, so
 * the answer is one card at three depths rather than two products. The
 * choice persists: it is a reading preference, not a per-card toggle.
 */
export const DENSITIES = [
  { id: 'glance', ar: 'نظرة', en: 'Glance' },
  { id: 'read',   ar: 'قراءة', en: 'Read' },
  { id: 'audit',  ar: 'تدقيق', en: 'Audit' },
];

export function densitySwitch({ value = 'glance', onChange, ar = false } = {}) {
  return h('div', { className: 'pv-density', role: 'group', dir: ar ? 'rtl' : 'ltr' },
    DENSITIES.map((d) => h('button', {
      key: d.id, type: 'button', className: 'pv-density-tab',
      'aria-pressed': value === d.id ? 'true' : 'false',
      onClick: onChange ? () => onChange(d.id) : undefined,
    }, ar ? d.ar : d.en)));
}

/* ── skeletons ───────────────────────────────────────────────────────────
 *
 * At the island's real size, so nothing reflows and "not published" never
 * flashes before a request has finished. A skeleton that is the wrong size
 * is a layout shift with extra steps.
 */
export function skeleton(kind = 'chart', rows = 3) {
  if (kind === 'rows') {
    return h('div', { className: 'pv-skel pv-skel-rows', role: 'status', 'aria-hidden': 'true' },
      h('div', { className: 'pv-skel-line', style: { width: '140px' } }),
      Array.from({ length: rows }, (_, i) => h('div', { key: i, className: 'pv-skel-row' })));
  }
  if (kind === 'table') {
    const widths = ['82%', '54%', '60%', '74%', '48%', '66%', '88%', '52%', '58%', '70%', '46%', '62%'];
    return h('div', { className: 'pv-skel pv-skel-table', role: 'status', 'aria-hidden': 'true' },
      h('div', { className: 'pv-skel-line', style: { width: '150px' } }),
      h('div', { className: 'pv-skel-grid' },
        widths.map((w, i) => h('div', { key: i, className: 'pv-skel-cell', style: { width: w } }))));
  }
  return h('div', { className: 'pv-skel pv-skel-chart', role: 'status', 'aria-hidden': 'true' },
    h('div', { className: 'pv-skel-line', style: { width: '170px' } }),
    h('div', { className: 'pv-skel-line pv-skel-strong', style: { width: '110px' } }),
    h('div', { className: 'pv-skel-plot' }),
    h('div', { className: 'pv-rule' }),
    h('div', { className: 'pv-skel-line', style: { width: '200px' } }));
}

/* ── 01 · line ───────────────────────────────────────────────────────────
 *
 * `points` is the series in order. A null close is a session the company did
 * not trade: the line BREAKS there rather than interpolating across it,
 * because a straight segment over a suspension is a price nobody paid.
 * `staleFrom` marks the tail that is no longer current — drawn dashed, with a
 * hollow endpoint, so a reader cannot mistake an old last price for today's.
 */
export function line({ points = [], ghost = [], width = 400, height = 120,
  label = '', staleFrom = null, gapLabel = '', staleLabel = '', ar = false } = {}) {
  const usable = points.filter((p) => finite(p));
  if (usable.length < 2) return nothing(ar ? 'لا توجد أسعار لرسمها.' : 'No prices to draw.');

  const all = usable.concat(ghost.filter((p) => finite(p)));
  const lo = Math.min(...all), hi = Math.max(...all);
  const span = hi - lo || 1;
  const pad = 14, floor = height - 20;
  const x = (i) => pad + (i * (width - pad * 2)) / Math.max(1, points.length - 1);
  const y = (v) => floor - ((v - lo) / span) * (floor - pad);

  // Break the path at every gap, so a run of nulls is a hole and not a line.
  const runs = [];
  let run = [];
  points.forEach((p, i) => {
    if (finite(p) && !(finite(staleFrom) && i > staleFrom)) run.push([x(i), y(p)]);
    else if (run.length) { runs.push(run); run = []; }
  });
  if (run.length) runs.push(run);

  const gaps = [];
  let from = null;
  points.forEach((p, i) => {
    if (!finite(p) && from === null) from = i;
    if (finite(p) && from !== null) { gaps.push([from, i]); from = null; }
  });
  if (from !== null) gaps.push([from, points.length - 1]);

  const hatch = nextId('pv-gap');
  const path = (pts) => pts.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)} ${py.toFixed(1)}`).join(' ');
  const ghostPts = ghost.map((v, i) => (finite(v) ? [x(i), y(v)] : null)).filter(Boolean);
  const last = runs.length ? runs[runs.length - 1][runs[runs.length - 1].length - 1] : null;
  const stale = finite(staleFrom) && staleFrom < points.length - 1;

  return h('svg', { viewBox: `0 0 ${width} ${height}`, width: '100%', height,
    className: 'pv-svg', role: 'img', 'aria-label': label },
    hatchDef(hatch),
    h('line', { key: 'base', x1: 0, y1: floor, x2: width, y2: floor, stroke: 'var(--rule)', strokeWidth: 1 }),
    gaps.map(([a, b], i) => h('rect', { key: `g${i}`, x: x(a), y: pad - 6,
      width: Math.max(2, x(b) - x(a)), height: floor - pad + 6, fill: `url(#${hatch})`, opacity: 0.5 })),
    stale ? h('rect', { key: 'st', x: x(staleFrom), y: pad - 6,
      width: width - x(staleFrom) - 2, height: floor - pad + 6, fill: `url(#${hatch})`, opacity: 0.28 }) : null,
    ghostPts.length > 1 ? h('path', { key: 'gh', d: path(ghostPts), fill: 'none',
      stroke: 'var(--thread)', strokeWidth: 1.5, strokeDasharray: '4 4' }) : null,
    runs.map((r, i) => (r.length > 1
      ? h('path', { key: `r${i}`, d: path(r), fill: 'none', stroke: 'var(--accent)',
        strokeWidth: 2.4, strokeLinejoin: 'round' })
      : null)),
    // Dashed continuation and a hollow dot: the last price is old, and the
    // shape says so without a sentence.
    stale && last ? h('path', { key: 'sl', d: `M${last[0]} ${last[1]} L${width - 4} ${last[1]}`,
      fill: 'none', stroke: 'var(--stStale)', strokeWidth: 2, strokeDasharray: '5 5' }) : null,
    last ? h('circle', { key: 'dot', cx: last[0], cy: last[1], r: 3.5,
      fill: stale ? 'none' : 'var(--accent)',
      stroke: stale ? 'var(--stStale)' : 'none', strokeWidth: 2 }) : null,
    gaps.length && gapLabel ? h('text', { key: 'gl', x: x(gaps[0][0]) + 2, y: pad + 4,
      fill: 'var(--t2)', fontSize: 9.5, fontFamily: MONO }, gapLabel) : null,
    stale && staleLabel ? h('text', { key: 'stl', x: width - 6, y: pad + 4, textAnchor: 'end',
      fill: 'var(--t2)', fontSize: 9.5, fontFamily: MONO }, staleLabel) : null,
    caption(label, 4, height - 5));
}

/* ── 02 · paired bars ────────────────────────────────────────────────────
 *
 * The workhorse: profit, operating cash against profit, debt, bought against
 * sold, usual activity against this session's.
 *
 * The zero line is always drawn and the scale always reaches it, so a loss
 * hangs below the axis instead of being flipped to a shorter positive bar. A
 * period nobody filed is hatched and outlined — it is not a zero, and a
 * missing bar drawn at height zero is a claim the company made no profit.
 */
export function pairedBars({ groups = [], width = 400, height = 120, ar = false } = {}) {
  const drawable = groups.filter((g) => g && (finite(g.prior) || finite(g.now) || g.missing));
  if (!drawable.length) return nothing(ar ? 'لا توجد فترة مقارنة منشورة.' : 'No comparable period published.');

  const values = [];
  drawable.forEach((g) => { if (finite(g.prior)) values.push(g.prior); if (finite(g.now)) values.push(g.now); });
  if (!values.length) return nothing(ar ? 'لا توجد أرقام منشورة.' : 'No published figures.');

  const hi = Math.max(0, ...values), lo = Math.min(0, ...values);
  const span = (hi - lo) || 1;
  const top = 18, floor = height - 24;
  const zero = floor - ((0 - lo) / span) * (floor - top);
  const yOf = (v) => floor - ((v - lo) / span) * (floor - top);

  const hatch = nextId('pv-miss');
  const slot = width / drawable.length;
  const barW = Math.min(52, slot / 3.2);

  return h('svg', { viewBox: `0 0 ${width} ${height}`, width: '100%', height,
    className: 'pv-svg', role: 'img' },
    hatchDef(hatch),
    drawable.flatMap((g, i) => {
      const mid = slot * i + slot / 2;
      const a = mid - barW - 4, b = mid + 4;
      const out = [];
      /* A bar is at least three pixels tall while its value is not zero.
         Two periods 143 times apart draw the smaller one as a hairline on
         the axis, and a reader sees ONE bar — which is the opposite of what
         a paired comparison is for. Three pixels says "there was one, and it
         was too small to see", which is the true statement. */
      const tall = (v) => Math.max(Math.abs(yOf(v) - zero), v === 0 ? 1 : 3);
      if (finite(g.prior)) {
        const yy = Math.min(yOf(g.prior), zero);
        out.push(h('rect', { key: `p${i}`, x: a, y: g.prior >= 0 ? zero - tall(g.prior) : yy,
          width: barW, height: tall(g.prior), fill: 'var(--sunk)', stroke: 'var(--rule)' }));
        out.push(h('text', { key: `pv${i}`, x: a + barW / 2, y: zero - tall(g.prior) - 5,
          textAnchor: 'middle', fill: 'var(--faint)', fontSize: 10, fontFamily: MONO },
        g.priorValue || ''));
      }
      if (g.missing) {
        out.push(h('rect', { key: `m${i}`, x: b, y: top, width: barW, height: floor - top,
          fill: `url(#${hatch})`, stroke: 'var(--thread)', strokeDasharray: '4 3' }));
      } else if (finite(g.now)) {
        const up = g.now >= 0;
        out.push(h('rect', { key: `n${i}`, x: b, y: up ? zero - tall(g.now) : zero, width: barW,
          height: tall(g.now), fill: up ? 'var(--up)' : 'var(--down)' }));
        out.push(h('text', { key: `nv${i}`, x: b + barW / 2,
          y: up ? zero - tall(g.now) - 5 : zero + tall(g.now) + 12, textAnchor: 'middle',
          fill: up ? 'var(--up)' : 'var(--down)', fontSize: 10, fontFamily: MONO },
        g.nowValue || ''));
      }
      out.push(h('text', { key: `la${i}`, x: a + barW / 2, y: height - 8, textAnchor: 'middle',
        fill: 'var(--faint)', fontSize: 10, fontFamily: MONO }, g.priorLabel || ''));
      out.push(h('text', { key: `lb${i}`, x: b + barW / 2, y: height - 8, textAnchor: 'middle',
        fill: 'var(--faint)', fontSize: 10, fontFamily: MONO },
        g.missing ? (ar ? 'لم يُنشر' : 'not filed') : (g.nowPeriodLabel || '')));
      if (g.unit) {
        out.push(h('text', { key: `u${i}`, x: slot * i + 4, y: 12, fill: 'var(--t2)',
          fontSize: 10, fontFamily: MONO }, g.unit));
      }
      return out;
    }),
    h('line', { key: 'zero', x1: 0, y1: zero, x2: width, y2: zero, stroke: 'var(--ink)', strokeWidth: 1.25 }),
    lo < 0 ? h('text', { key: 'z0', x: 4, y: zero - 4, fill: 'var(--faint)', fontSize: 9.5, fontFamily: MONO }, '0') : null);
}

/* ── 03 · share bar ──────────────────────────────────────────────────────
 *
 * One bar, named parts, and the remainder is ALWAYS a named part. A share
 * bar that normalises its known parts to 100% is the commonest way a chart
 * turns "we know 52% of this" into "we know all of it".
 */
export function shareBar({ parts = [], remainder = null, caption: note = '', ar = false } = {}) {
  const usable = parts.filter((p) => p && finite(p.value) && p.value > 0);
  if (!usable.length) return nothing(ar ? 'لا توجد حصص منشورة.' : 'No published shares.');

  const known = usable.reduce((t, p) => t + p.value, 0);
  const rest = finite(remainder) ? remainder : Math.max(0, 100 - known);
  const total = known + rest || 1;
  /* --accTint/--irisTint are 10% and disappear against --surface; a part a
     reader cannot see is a part the bar did not show. */
  const tint = ['var(--accent)', 'var(--iris)', 'var(--accMid)', 'var(--irisMid)'];

  return h('div', { className: 'pv-share', dir: ar ? 'rtl' : 'ltr' },
    h('div', { className: 'pv-share-bar' },
      usable.map((p, i) => h('div', { key: i, className: 'pv-share-part',
        style: { width: `${(p.value / total) * 100}%`, background: p.color || tint[i % tint.length] },
        title: `${p.label} ${p.value}%` })),
      rest > 0 ? h('div', { key: 'rest', className: 'pv-share-rest',
        style: { width: `${(rest / total) * 100}%` } }) : null),
    h('div', { className: 'pv-share-keys' },
      usable.map((p, i) => h('span', { key: i, className: 'pv-share-key' },
        h('i', { 'aria-hidden': 'true', style: { background: p.color || tint[i % tint.length] } }),
        `${p.label} ${p.value}%`)),
      rest > 0 ? h('span', { key: 'rest', className: 'pv-share-key pv-share-key-rest' },
        h('i', { 'aria-hidden': 'true' }),
        `${ar ? 'غير معلن' : 'not disclosed'} ${rest.toFixed(rest % 1 ? 1 : 0)}%`) : null),
    note ? h('div', { className: 'pv-note' }, note) : null);
}

/* ── 04 · distribution dot ───────────────────────────────────────────────
 *
 * Today's value on its own history, with the prior instances marked on the
 * same axis.
 *
 * NEVER A GAUGE. A dial with a needle in a red arc reads as a forecast; a
 * dot on a distribution reads as a measurement, which is the only one of the
 * two this product is allowed to make. That is a legal distinction carried
 * by a shape, not a caption — see the §8 rule in `scripts/lab/rulebook.md`.
 *
 * A reading computed from an input that has gone stale still stands, but the
 * dot is drawn hollow and dashed so the reader can see what it rests on.
 */
export function distributionDot({ min, max, low, high, value, priors = [],
  width = 400, height = 108, stale = false, valueLabel = '', note = '', ar = false } = {}) {
  if (![min, max, value].every(finite) || max <= min) {
    return nothing(ar ? 'لا يوجد تاريخ كافٍ لوضع القراءة عليه.' : 'Not enough history to place the reading on.');
  }
  const pad = 20, right = width - 20, band = 40, bandH = 18;
  const at = (v) => pad + ((Math.min(max, Math.max(min, v)) - min) / (max - min)) * (right - pad);
  const axis = band + bandH + 6;

  const svg = h('svg', { viewBox: `0 0 ${width} ${height}`, width: '100%', height,
    className: 'pv-svg', role: 'img', 'aria-label': valueLabel },
    h('rect', { key: 'all', x: pad, y: band, width: right - pad, height: bandH, fill: 'var(--sunk)', rx: 4 }),
    finite(low) && finite(high) && high > low
      ? h('rect', { key: 'mid', x: at(low), y: band, width: at(high) - at(low), height: bandH,
        fill: 'var(--accTint)', rx: 4 }) : null,
    h('line', { key: 'ax', x1: pad, y1: axis, x2: right, y2: axis, stroke: 'var(--thread)', strokeWidth: 1 }),
    priors.filter((p) => finite(p)).map((p, i) => h('line', { key: `t${i}`, x1: at(p), y1: band - 6,
      x2: at(p), y2: axis, stroke: 'var(--iris)', strokeWidth: 1.5, opacity: 0.65 })),
    h('circle', { key: 'now', cx: at(value), cy: band + bandH / 2, r: 7,
      fill: stale ? 'none' : 'var(--accent)',
      stroke: stale ? 'var(--stStale)' : 'none', strokeWidth: 2, strokeDasharray: stale ? '3 2' : undefined }),
    /* Anchored on the dot, this label runs off the drawing whenever the
       reading sits near either end — which is exactly when a reader most
       wants to read it. So the anchor swings with the dot's third. */
    valueLabel ? h('text', { key: 'vl',
      x: at(value) < width / 3 ? pad : at(value) > (width * 2) / 3 ? right : at(value),
      y: band - 14,
      textAnchor: at(value) < width / 3 ? 'start' : at(value) > (width * 2) / 3 ? 'end' : 'middle',
      fill: stale ? 'var(--t2)' : 'var(--accent)', fontSize: 11, fontFamily: MONO }, valueLabel) : null,
    caption(`min ${min}`, pad, axis + 16),
    caption(`max ${max}`, right, axis + 16, 'end'));
  return note ? h('div', null, svg, h('div', { className: 'pv-note' }, note)) : svg;
}

/* ── 05 · dated timeline ─────────────────────────────────────────────────
 *
 * Dividends, the calendar, a connected story's announcement → filing →
 * observed price.
 *
 * Three kinds of point, because they are three different claims: a paid one
 * is filled, a period that was SKIPPED is stated rather than left out (a
 * missing dot reads as missing data, not as a decision not to pay), and a
 * proposal stays outlined until the filing that confirms it exists.
 */
export function datedTimeline({ events = [], width = 420, height = 96, note = '', ar = false } = {}) {
  const usable = events.filter((e) => e && e.date);
  if (!usable.length) return nothing(ar ? 'لا توجد أحداث مؤرّخة.' : 'No dated events.');

  const pad = 40, span = width - pad * 2;
  const at = (i) => (usable.length === 1 ? width / 2 : pad + (i * span) / (usable.length - 1));
  const axis = 58;

  const svg = h('svg', { viewBox: `0 0 ${width} ${height}`, width: '100%', height,
    className: 'pv-svg', role: 'img' },
    h('line', { key: 'ax', x1: 16, y1: axis, x2: width - 16, y2: axis, stroke: 'var(--thread)', strokeWidth: 1 }),
    usable.flatMap((e, i) => {
      const x = at(i);
      const kind = e.kind || 'paid';
      const out = [];
      if (kind === 'skipped') {
        out.push(h('circle', { key: `c${i}`, cx: x, cy: axis, r: 5, fill: 'var(--iris)', opacity: 0.25 }));
        out.push(h('line', { key: `s${i}`, x1: x - 6, y1: axis - 6, x2: x + 6, y2: axis + 6,
          stroke: 'var(--t2)', strokeWidth: 1.5 }));
      } else if (kind === 'proposed') {
        out.push(h('circle', { key: `c${i}`, cx: x, cy: axis, r: 5.5, fill: 'none',
          stroke: 'var(--iris)', strokeWidth: 2, strokeDasharray: '3 2' }));
      } else {
        out.push(h('circle', { key: `c${i}`, cx: x, cy: axis, r: 5, fill: 'var(--accent)' }));
      }
      /* The first and last labels are wider than the padding they sit in, so
         a centred anchor pushes them off the drawing. Swing the end ones
         inward; an Arabic label like "مقترح · لم يُعتمد" is wide enough that
         this is the difference between reading it and losing its last word. */
      const edge = i === 0 ? 'start' : i === usable.length - 1 ? 'end' : 'middle';
      const lx = i === 0 ? 16 : i === usable.length - 1 ? width - 16 : x;
      out.push(h('text', { key: `v${i}`, x: lx, y: axis - 14, textAnchor: edge,
        fill: kind === 'paid' ? 'var(--ink)' : kind === 'proposed' ? 'var(--iris)' : 'var(--t2)',
        fontSize: kind === 'paid' ? 11 : 10, fontFamily: MONO }, e.label || ''));
      out.push(h('text', { key: `d${i}`, x: lx, y: axis + 18, textAnchor: edge,
        fill: 'var(--faint)', fontSize: 10, fontFamily: MONO }, e.date));
      return out;
    }),
  );
  return note ? h('div', null, svg, h('div', { className: 'pv-note' }, note)) : svg;
}

/** A number inside Arabic prose: mono, isolated, and its minus sign stays
 *  attached to it. Without the isolation a leading minus wanders to the far
 *  side of the sentence, which turns a loss into a gain. */
export function figure(text) {
  return h('span', { className: 'pv-figure', dir: 'ltr' }, String(text));
}

/** The dateline every island carries, in the same place, like a filing
 *  header. One repeated detail is what makes a set of cards read as a
 *  publication rather than a dashboard. */
export function dateline(text) {
  return text ? h('div', { className: 'pv-dateline' }, text) : null;
}

/* Who owns the Egyptian Exchange, as far as anybody has had to say — and what
 * moved in a given week.
 *
 * The picture is one board, not one board per period. Every company anybody
 * has filed a named stake in is drawn every time, at the stake that stands
 * now; choosing a week does not rebuild the market, it lights up the holdings
 * that changed in it. An earlier version of this screen accumulated filings
 * instead, so the first period showed a single company and read as a broken
 * map rather than a true one.
 *
 * Four honesty rules are in the drawing rather than written under it.
 *
 * The uncoloured part of a ring is NOT free float. It is ownership nobody has
 * had to disclose, which is most of every company on this exchange, and the
 * legend says so — calling it float would claim a fact about the register
 * that this project does not have.
 *
 * A stake is a percentage OF ONE COMPANY. Nothing here adds two of them
 * together: a holder who appears in three companies is drawn three times and
 * given no combined percentage, because 6% of one issuer and 2% of another do
 * not make 8% of anything.
 *
 * A standing stake is the closing figure of the last form filed on it, which
 * is a level the document prints. It is not a running total of movements, and
 * where the last form read it down to zero the holding is drawn as gone
 * rather than dropped — "sold out" and "never held" are different claims.
 *
 * And a company with no published market value keeps its ring at the floor
 * size with a dashed centre, rather than being guessed at or left out.
 */

import { squarify } from './logic.js';

const NS = 'http://www.w3.org/2000/svg';
const TAU = Math.PI * 2;
const finite = (v) => typeof v === 'number' && Number.isFinite(v);

export function svgEl(name, attrs = {}, parent) {
  const node = document.createElementNS(NS, name);
  for (const k in attrs) {
    if (attrs[k] === null || attrs[k] === undefined) continue;
    node.setAttribute(k, String(attrs[k]));
  }
  if (parent) parent.appendChild(node);
  return node;
}

/* A holder keeps their colour across weeks and across both languages, so the
 * hash is over the id — the name as filed — and never over a position in a
 * sorted list, which changes the moment somebody else files. */
export function hueOf(id) {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return `var(--own${(h % 6) + 1})`;
}

export const keyOf = (holder, ticker) => `${holder}|${ticker}`;

/** Every standing stake: the last filed level, zeros dropped from the board. */
export function standing(doc) {
  return ((doc && doc.positions) || []).filter((p) => (p.percent || 0) > 0);
}

/** The weeks that carry a filing, oldest first. */
export function periodsOf(doc) {
  return ((doc && doc.periods) || []).slice();
}

/** What moved in one week, keyed by holder and company. */
export function movesIn(doc, start) {
  const week = ((doc && doc.periods) || []).find((p) => p.start === start);
  const out = new Map();
  if (week) week.moves.forEach((m) => out.set(keyOf(m.holder, m.ticker), m));
  return out;
}


/* ── Where things sit ─────────────────────────────────────────────────────────
 *
 * Deterministic, and that is a requirement rather than a preference. A
 * force-directed layout settles somewhere slightly different on every render,
 * so a reader stepping from one week to the next would watch every company
 * drift and could not tell which movement was the data. Here the board never
 * moves; only the highlighting does.
 *
 * Sectors are squarified by how many companies they hold, not by their market
 * value, so every company gets about the same room to be read in. Value is
 * already carried by the radius of the ring, and letting it drive the cells
 * too would squeeze eleven small issuers into a corner to make space for one
 * big one.
 */
export const VIEW = { w: 1200, h: 760 };

const PAD = 10;
const CELL_LABEL = 15;
const BAND = 7;            // thickness of the slice band
const R_MIN = 15;
const R_MAX = 34;

export function layout(rows, view = VIEW) {
  const bySector = new Map();
  rows.forEach((r) => {
    if (!bySector.has(r.sector)) bySector.set(r.sector, []);
    bySector.get(r.sector).push(r);
  });

  const cells = squarify(
    [...bySector.entries()].map(([sector, list]) => ({ sector, list, value: list.length })),
    PAD, PAD, view.w - PAD * 2, view.h - PAD * 2);

  const capVals = rows.map((r) => r.cap).filter((v) => finite(v) && v > 0);
  const capMax = capVals.length ? Math.max(...capVals) : 0;
  const radiusOf = (cap) => (finite(cap) && cap > 0 && capMax > 0
    ? R_MIN + Math.sqrt(cap / capMax) * (R_MAX - R_MIN)
    : R_MIN);

  const nodes = new Map();
  const placed = [];
  cells.forEach((cell) => {
    const list = cell.list.slice().sort((a, b) => (b.disclosed - a.disclosed) || (b.cap - a.cap));
    const inner = { x: cell.x, y: cell.y + CELL_LABEL, w: cell.w, h: cell.h - CELL_LABEL };
    const cx = inner.x + inner.w / 2;
    const cy = inner.y + inner.h / 2;

    /* A sector is a ring of its companies, not a grid of them.
     *
     * The grid read as a spreadsheet: rows and columns say "row 2, column 3",
     * which is nothing about a sector. A ring says "these belong together" and
     * leaves the middle clear, which is where the sector's name now sits and
     * where a spoke can cross without landing on a company.
     *
     * The radius is whatever fits the cell, and the ring holds as many as can
     * stand on it without touching. Past that they go on a second ring inside
     * the first, still ordered by disclosed ownership, so a sector of thirty
     * is two rings rather than a crowd.
     */
    const spread = Math.min(inner.w, inner.h) / 2;

    /* A sector is a ring of its companies, not a grid of them.
     *
     * The grid read as a spreadsheet: "row 2, column 3" says nothing about a
     * sector. A ring says these belong together and leaves the middle clear —
     * which is where the sector's name sits and where a spoke can cross
     * without landing on a company.
     *
     * Rings are laid outside-in with a fixed gap, and only ONE company may
     * stand at the centre. An earlier version dropped everything that did not
     * fit into a ring of radius zero, which is not a ring: eleven companies
     * shared a point, and ICMI overlapped KASABF by nine pixels.
     */
    const rings = [];
    let left = list.slice();
    // Enough rings for everything, spaced evenly. A cell holding a whole
    // exchange gets many thin rings rather than one impossible circle; the
    // companies come out small, which is honest about the room they have.
    const perRing = (r) => Math.max(3, Math.floor((TAU * r) / (R_MIN * 1.7)));
    let ringCount = 1;
    while (ringCount < 24) {
      let room = 0;
      for (let k = 0; k < ringCount; k += 1) {
        room += perRing(spread * 0.64 * (1 - k / (ringCount + 0.6)));
      }
      if (room >= list.length - 1) break;      // -1: one may sit at the centre
      ringCount += 1;
    }
    for (let k = 0; k < ringCount && left.length; k += 1) {
      const r = spread * 0.64 * (1 - k / (ringCount + 0.6));
      if (left.length === 1 && k > 0) break;   // the last one takes the middle
      const take = Math.min(left.length, perRing(r));
      rings.push({ radius: r, list: left.slice(0, take) });
      left = left.slice(take);
    }
    if (left.length) rings.push({ radius: 0, list: left.slice(0, 1) });
    if (left.length > 1) rings[rings.length - 1].list = left;   // nowhere else

    rings.forEach((ring, depth) => {
      const step = ring.list.length ? TAU / ring.list.length : TAU;
      const nextIn = rings[depth + 1] ? rings[depth + 1].radius : 0;
      const inner_r = depth > 0 ? rings[depth - 1].radius : null;
      // Half the gap to the ring OUTSIDE this one as well. Capping only
      // against the ring inside let a wide innermost node meet a wide node on
      // the ring above it wherever their angles happened to line up — which
      // on the published board they nearly did, at 0.7px.
      const outward = inner_r === null ? Infinity : (inner_r - ring.radius) / 2 - 2;
      // The tightest of: half the chord to its neighbour on this ring, half
      // the gap to the ring inside, and the distance to the cell's edge.
      // Geometry decides the size, with only a hair of floor: a node that has
      // to be three pixels to avoid touching its neighbour is drawn at three
      // pixels. Flooring it higher draws a lie about the room a sector has.
      const room = ring.radius === 0
        ? Math.max(1, Math.min(inner_r === null ? spread : inner_r - 2,
                               outward === Infinity ? spread : outward * 2))
        : Math.max(1, Math.min(
          ring.list.length > 1 ? Math.sin(Math.PI / ring.list.length) * ring.radius - 2 : spread,
          (ring.radius - nextIn) / 2 - 2,
          outward,
          spread - ring.radius - 2));
      ring.list.forEach((r, i) => {
        // Start at the top and go clockwise, so the largest disclosed holding
        // in a sector is the first thing read.
        const angle = -Math.PI / 2 + i * step;
        const node = {
          ...r,
          x: ring.radius === 0 ? cx : cx + Math.cos(angle) * ring.radius,
          y: ring.radius === 0 ? cy : cy + Math.sin(angle) * ring.radius,
          r: Math.max(6, Math.min(room, radiusOf(r.cap))),
          hasCap: finite(r.cap) && r.cap > 0,
          sectorAt: { x: cx, y: cy },
        };
        nodes.set(r.ticker, node);
        placed.push(node);
      });
    });
  });

  return { cells, nodes, placed, view };
}

/* Where each holder's slice starts and stops on the band.
 *
 * Filings that add to more than the company happen: two spellings of one man's
 * name were read as two holders of HBCO and the ring came to 103.4%. Left
 * alone the last slice wraps past its own start and draws over the first, and
 * a ring simply truncated at a full circle looks exactly like a company wholly
 * in named hands. So the slices are scaled to fit AND the caller is told, which
 * is the more useful of the two facts.
 */
export function sliceAngles(list) {
  const claimed = list.reduce((sum, p) => sum + (p.percent || 0), 0);
  const over = claimed > 100.0001;
  const fit = over ? 100 / claimed : 1;
  let a0 = -Math.PI / 2;
  const arcs = list.map((p) => {
    const a1 = a0 + ((p.percent || 0) * fit) / 100 * TAU;
    const arc = { p, a0, a1 };
    a0 = a1;
    return arc;
  });
  return { claimed, over, arcs };
}

/* Where a holder's dot sits.
 *
 * On a small orbit around the company they hold, biggest first and clockwise
 * from the top, so a reader following a ring's slices round finds the dots in
 * the same order. A holder in more than one company gets a dot at each of
 * them: a stake is a percentage of ONE company and there is no point on this
 * board that means "all of what they own".
 */
export function placeHolders(model, holdings, opts = {}) {
  const gap = opts.gap ?? 9;
  const byTicker = new Map();
  holdings.forEach((p) => {
    if (!(p.percent > 0)) return;
    if (!byTicker.has(p.ticker)) byTicker.set(p.ticker, []);
    byTicker.get(p.ticker).push(p);
  });
  const dots = [];
  byTicker.forEach((list, ticker) => {
    const n = model.nodes.get(ticker);
    if (!n) return;
    const mine = list.slice().sort((a, b) => b.percent - a.percent);
    const orbit = n.r + BAND / 2 + gap;
    mine.forEach((p, i) => {
      const a = -Math.PI / 2 + (i / mine.length) * TAU;
      dots.push({
        ...p,
        x: n.x + Math.cos(a) * orbit,
        y: n.y + Math.sin(a) * orbit,
        r: 2.2 + Math.sqrt(Math.min(p.percent, 100) / 100) * 3.4,
        node: n,
      });
    });
  });
  return dots.sort((a, b) => b.percent - a.percent);
}

/* Nothing here decides WHICH holders get a name.
 *
 * An earlier version drew a name over every dot whose label box did not
 * collide with one already placed, which sounds adaptive and is not: at this
 * density it named nineteen of eight hundred and seventy-six, and a reader
 * cannot tell why those nineteen. It is a ranking produced by geometry, and a
 * ranking of named parties is exactly what this project does not publish.
 *
 * So no name is drawn at rest. Every holder has a dot, pointing at a dot
 * names it, and the register beside the board lists all of them in an order
 * that is stated. Zoom changes how big things are, never who is named.
 */


export function arcPath(cx, cy, r0, r1, a0, a1) {
  if (!(a1 - a0 > 0.0008)) return '';
  const large = (a1 - a0) > Math.PI ? 1 : 0;
  const P = (r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  const [x0, y0] = P(r1, a0); const [x1, y1] = P(r1, a1);
  const [x2, y2] = P(r0, a1); const [x3, y3] = P(r0, a0);
  return `M${x0} ${y0}A${r1} ${r1} 0 ${large} 1 ${x1} ${y1}`
       + `L${x2} ${y2}A${r0} ${r0} 0 ${large} 0 ${x3} ${y3}Z`;
}

/* Rim to rim rather than centre to centre, so a curve does not disappear
 * under the ring it points at. */
export function edgePath(a, b, bend = 0.18) {
  const dx = b.x - a.x; const dy = b.y - a.y;
  const d = Math.hypot(dx, dy) || 1;
  const ux = dx / d; const uy = dy / d;
  const s = { x: a.x + ux * (a.r + 4), y: a.y + uy * (a.r + 4) };
  const e = { x: b.x - ux * (b.r + 4), y: b.y - uy * (b.r + 4) };
  const m = { x: (s.x + e.x) / 2 - uy * d * bend, y: (s.y + e.y) / 2 + ux * d * bend };
  return {
    d: `M${s.x} ${s.y}Q${m.x} ${m.y} ${e.x} ${e.y}`,
    mid: { x: 0.25 * s.x + 0.5 * m.x + 0.25 * e.x,
           y: 0.25 * s.y + 0.5 * m.y + 0.25 * e.y },
  };
}

/* Trim a caption to the room it has.
 *
 * Measured rather than counted where the browser will measure: an Arabic
 * glyph at this size is about 3.7px wide and a spaced Latin capital about
 * 5.6, so one character estimate for both is wrong for one of them, and the
 * one it was wrong for was Arabic.
 */
export function fitText(node, text, room, ar) {
  node.textContent = text;
  // A detached element measures zero, which is not a measurement. The board is
  // built before it is mounted, so every caption "fitted" on the first paint
  // and SHIPPING & TRANSPORTATION SERVICES ran 48px out of its own cell.
  const estimate = () => node.textContent.length * (ar ? 3.9 : 5.8);
  const measure = () => {
    if (typeof node.getComputedTextLength !== 'function') return estimate();
    const width = node.getComputedTextLength();
    return width > 0 ? width : estimate();
  };
  if (measure() <= room) return node;
  let cut = text.length;
  while (cut > 1) {
    cut -= 1;
    node.textContent = `${text.slice(0, cut).trimEnd()}…`;
    if (measure() <= room) break;
  }
  return node;
}

/* A stake, as text. One place, because it was three: the tag on the board
 * said `<0.01%`, the dot's own tooltip said `0.00%`, and the panel beside
 * them said `0.00%` — all about the same three thousandths of a company. */
export const stakeText = (v) => (v > 0 && v < 0.01
  ? '<0.01%'
  : `${(v || 0).toFixed(2)}%`);

const compact = (v) => (finite(v) && v > 0
  ? new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(v)
  : '—');


/* ── The drawing ──────────────────────────────────────────────────────────── */

export function renderMap(svg, model, opts) {
  const { nodes, cells, view } = model;
  const { holdings, bridges, moves, labelOf, onPick, focus, t, ar } = opts;
  const dense = opts.dense === true;
  while (svg.firstChild) svg.removeChild(svg.firstChild);
  svg.setAttribute('viewBox', `0 0 ${view.w} ${view.h}`);

  const gCell = svgEl('g', { class: 'om-cells' }, svg);
  const gBridge = svgEl('g', { class: 'om-bridges' }, svg);
  const gCo = svgEl('g', { class: 'om-cos' }, svg);
  const gDot = svgEl('g', { class: 'om-dots' }, svg);
  const gName = svgEl('g', { class: 'om-names' }, svg);
  const gPop = svgEl('g', { class: 'om-pop' }, svg);

  // What the focus is related to: a company lights its holders, a holder
  // lights every company they are in.
  const lit = new Set();
  if (focus) {
    lit.add(focus);
    holdings.forEach((p) => {
      if (p.holder === focus) lit.add(p.ticker);
      if (p.ticker === focus) lit.add(p.holder);
    });
  }
  const on = (id) => !focus || lit.has(id);
  const cls = (...ids) => (focus && !ids.some(on) ? ' om-dim' : '');

  // ── sector regions ────────────────────────────────────────────────────────
  cells.forEach((cell) => {
    const g = svgEl('g', { class: 'om-cell' }, gCell);
    svgEl('rect', {
      x: cell.x + 1, y: cell.y + 1, width: Math.max(0, cell.w - 2),
      height: Math.max(0, cell.h - 2), rx: 12,
      fill: 'var(--own-cell)', stroke: 'var(--rule)', 'stroke-width': 0.7,
    }, g);
    // Centred, because `text-anchor: end` is resolved against the INLINE
    // direction: with `direction: rtl` it anchors the logical end — the left
    // side of the rendered text — so every Arabic sector caption ran out of
    // the right-hand side of its own cell. `middle` means the same thing in
    // both languages.
    const label = svgEl('text', {
      x: cell.x + cell.w / 2, y: cell.y + 13, fill: 'var(--faint)',
      'font-size': 8.5, 'letter-spacing': ar ? 0 : 0.7, 'font-weight': 600,
      'text-anchor': 'middle', direction: ar ? 'rtl' : 'ltr',
    }, g);
    fitText(label, ar ? cell.sector : cell.sector.toUpperCase(), cell.w - 14, ar);
  });

  /* Owner, and owned.
   *
   * A holder has a dot at every company they hold, because a stake is a
   * percentage of ONE company and there is no point on this board that means
   * "everything they own". But when one holder is asked about, the question
   * changes from "what is in this company" to "what does this person hold",
   * and for that they need somewhere to stand: a single node, with a line to
   * each company, each line tagged with the stake it carries.
   *
   * The travelling dot is the direction. A line between two things says they
   * are related; a dot leaving the owner and arriving at the company says
   * which way the holding runs. It is suppressed for readers who have asked
   * their machine for less motion.
   */
  const owned = focus ? holdings.filter((p) => p.holder === focus && p.percent > 0) : [];
  let seat = null;
  if (owned.length) {
    const ends = owned.map((p) => nodes.get(p.ticker)).filter(Boolean);
    if (ends.length) {
      // Where the owner stands: the middle of what they hold, pushed off any
      // company that happens to be there.
      let sx = ends.reduce((t, n) => t + n.x, 0) / ends.length;
      let sy = ends.reduce((t, n) => t + n.y, 0) / ends.length;
      const clash = model.placed.find((n) => Math.hypot(n.x - sx, n.y - sy) < n.r + 24);
      if (clash) {
        const away = Math.hypot(sx - clash.x, sy - clash.y) || 1;
        sx = clash.x + ((sx - clash.x) / away) * (clash.r + 26);
        sy = clash.y + ((sy - clash.y) / away) * (clash.r + 26);
      }
      seat = {
        x: Math.max(60, Math.min(view.w - 60, sx)),
        y: Math.max(26, Math.min(view.h - 26, sy)),
        r: 9,
      };
      ends.forEach((n, i) => {
        const p = owned[i];
        const { d } = edgePath(seat, n, 0.1);
        /* A line that CHANGED in the chosen week is drawn as a change:
         * dashed, and green or red for the direction it went. A holding that
         * did not move that week stays solid in the holder's own colour.
         *
         * An earlier attempt drew a separate dashed line per move, from the
         * holder's dot to the ring it already orbits — ten pixels of line
         * between two things that were touching. A line has to go somewhere.
         */
        const mv = moves && moves.get(keyOf(focus, p.ticker));
        const changed = mv && finite(mv.change) && Math.abs(mv.change) > 0.0005;
        const grew = changed && mv.change > 0;
        const colour = changed ? (grew ? 'var(--up)' : 'var(--down)') : hueOf(focus);
        const spoke = svgEl('path', {
          d, fill: 'none', stroke: colour, 'stroke-width': changed ? 1.9 : 1.7,
          'stroke-dasharray': changed ? '5 4' : null,
          'stroke-linecap': 'round', opacity: 0.88,
          class: `om-bridge${changed ? (grew ? ' om-bridge-up' : ' om-bridge-down') : ''}`,
        }, gBridge);
        const travel = svgEl('circle', {
          r: 2.6, fill: colour, class: 'om-flow-dot',
        }, gBridge);
        svgEl('animateMotion', {
          dur: `${(2.2 + (i % 3) * 0.35).toFixed(2)}s`,
          repeatCount: 'indefinite', path: d,
        }, travel);
        spoke.setAttribute('data-to', p.ticker);

        // The stake this line carries, at the end it arrives at. A line says
        // two things are related; the tag says how much of which.
        //
        // A stake read down to three thousandths of a company is not zero,
        // and "0.00%" says it is.
        const label = stakeText(p.percent);
        const w = label.length * 5.6 + 9;
        const tx = Math.min(view.w - w / 2 - 2, Math.max(w / 2 + 2, n.x));
        const ty = n.y + n.r + BAND / 2 + 12;
        const tag = svgEl('g', { class: 'om-stake-tag' }, gBridge);
        svgEl('rect', {
          x: tx - w / 2, y: ty - 9, width: w, height: 12.5, rx: 6,
          fill: colour, opacity: 0.94,
        }, tag);
        const text = svgEl('text', {
          x: tx, y: ty, 'text-anchor': 'middle', 'font-size': 8.5,
          'font-weight': 600, fill: 'var(--surface)', direction: 'ltr',
        }, tag);
        text.textContent = label;
        const title = svgEl('title', {}, tag);
        title.textContent = changed
          ? t(`${labelOf(focus)} holds ${p.percent}% of ${p.ticker}, `
              + `${grew ? 'up' : 'down'} ${Math.abs(mv.change).toFixed(2)} points that week`,
              `${labelOf(focus)} يملك ${p.percent}٪ من ${p.ticker}، `
              + `${grew ? 'بزيادة' : 'بنقصان'} ${Math.abs(mv.change).toFixed(2)} نقطة ذلك الأسبوع`)
          : t(`${labelOf(focus)} holds ${p.percent}% of ${p.ticker}`,
              `${labelOf(focus)} يملك ${p.percent}٪ من ${p.ticker}`);
      });

      // Where the owner stands, drawn last so the spokes run under it.
      const g = svgEl('g', { class: 'om-seat', 'data-id': focus }, gBridge);
      svgEl('circle', {
        cx: seat.x, cy: seat.y, r: seat.r, fill: hueOf(focus),
        stroke: 'var(--surface)', 'stroke-width': 2,
      }, g);
      const who = svgEl('text', {
        x: seat.x, y: seat.y - seat.r - 6, 'text-anchor': 'middle',
        'font-size': 10, 'font-weight': 600, fill: 'var(--ink)', direction: 'ltr',
      }, g);
      const full = labelOf(focus);
      who.textContent = full.length > 30 ? `${full.slice(0, 28)}…` : full;
      const seatTitle = svgEl('title', {}, g);
      seatTitle.textContent = full;
      g.addEventListener('click', (e) => { e.stopPropagation(); onPick(focus); });
    }
  }

  // ── the companies ─────────────────────────────────────────────────────────
  const byTicker = new Map();
  holdings.forEach((p) => {
    if (!byTicker.has(p.ticker)) byTicker.set(p.ticker, []);
    byTicker.get(p.ticker).push(p);
  });

  model.placed.forEach((n) => {
    const g = svgEl('g', { class: `om-co${cls(n.ticker)}`, 'data-id': n.ticker }, gCo);
    const r0 = n.r - BAND / 2;
    const r1 = n.r + BAND / 2;
    const mine = (byTicker.get(n.ticker) || []).slice().sort((a, b) => b.percent - a.percent);

    // Undisclosed first and whole, so a rounding error in the slices can never
    // leave a hairline of background showing through as if it meant something.
    svgEl('circle', {
      cx: n.x, cy: n.y, r: n.r, fill: 'none', stroke: 'var(--ownNone)',
      'stroke-width': BAND, class: 'om-undisclosed',
    }, g);

    const { claimed, over, arcs } = sliceAngles(mine);
    if (over) g.setAttribute('class', `${g.getAttribute('class')} om-over`);

    arcs.forEach(({ p, a0, a1 }) => {
      const d = arcPath(n.x, n.y, r0, r1, a0, a1);
      if (d) {
        svgEl('path', {
          d, fill: hueOf(p.holder),
          class: `om-slice${cls(p.holder, n.ticker)}`,
          'data-o': p.holder,
        }, g);
      }
      // What this holding did in the chosen week, as an arc riding outside
      // the band: the size of the change, in the same angular units as the
      // stake itself, so a two-point move looks like two points.
      const mv = moves && moves.get(keyOf(p.holder, n.ticker));
      if (mv && finite(mv.change) && Math.abs(mv.change) > 0.0005) {
        const span = Math.min(Math.abs(mv.change), 100) / 100 * TAU;
        const grew = mv.change > 0;
        // Anchored at the slice's leading edge: growth runs back over the
        // ground it took, a sale runs forward into the ground it gave up.
        // Neither is clipped to the slice — clipping the growth arc to the
        // slice's own start silently erased the whole movement wherever the
        // holder has since sold out, which is the one week a reader looking
        // at an empty ring actually wants.
        const arc = grew
          ? arcPath(n.x, n.y, r1 + 2, r1 + 5, a1 - span, a1)
          : arcPath(n.x, n.y, r1 + 2, r1 + 5, a1, a1 + span);
        if (arc) {
          svgEl('path', {
            d: arc, fill: grew ? 'var(--up)' : 'var(--down)',
            class: 'om-move',
          }, g);
        }
      }
    });

    svgEl('circle', {
      cx: n.x, cy: n.y, r: Math.max(1, r0 - 1), fill: 'var(--surface)',
      stroke: n.hasCap ? 'none' : 'var(--rule)',
      'stroke-dasharray': n.hasCap ? null : '2 3',
    }, g);

    const moved = mine.some((p) => moves && moves.get(keyOf(p.holder, n.ticker)));
    if (moved) {
      svgEl('circle', {
        cx: n.x, cy: n.y, r: r1 + 7.5, fill: 'none', stroke: 'var(--accent)',
        'stroke-width': 1, opacity: 0.55, class: 'om-moved-ring',
      }, g);
    }

    // The market value goes inside the ring only where the ring is big enough
    // to hold two lines. At 11 units apart they overlapped by two pixels on
    // ten of the forty-seven — measured, not eyeballed — and a ticker with a
    // number sitting on it is worse than a ticker with nothing under it.
    const wide = n.r > 26;
    const tk = svgEl('text', {
      x: n.x, y: n.y + (wide ? -3 : 1), 'text-anchor': 'middle',
      fill: 'var(--ink)', 'font-size': wide ? 11 : 9.5, 'font-weight': 700,
      direction: 'ltr',
    }, g);
    tk.textContent = n.ticker;
    if (wide) {
      const sub = svgEl('text', {
        x: n.x, y: n.y + 12, 'text-anchor': 'middle', fill: 'var(--faint)',
        'font-size': 8, direction: 'ltr',
      }, g);
      sub.textContent = n.hasCap ? compact(n.cap) : t('no size', 'بلا قيمة');
    }

    const title = svgEl('title', {}, g);
    title.textContent = over
      ? `${n.ticker} · ${n.name} — `
        + t(`the filings for this company add to ${claimed.toFixed(1)}%, which is more than the company`,
            `مجموع الإفصاحات لهذه الشركة ${claimed.toFixed(1)}٪، أي أكثر من الشركة نفسها`)
      : `${n.ticker} · ${n.name} — `
        + t(`${claimed.toFixed(1)}% in named hands`,
            `${claimed.toFixed(1)}٪ بأسماء معلومة`);
    const hit = svgEl('circle', {
      cx: n.x, cy: n.y, r: r1 + 8, fill: 'transparent', class: 'om-hit',
    }, g);
    hit.addEventListener('click', (e) => { e.stopPropagation(); onPick(n.ticker); });
  });

  // ── the holders themselves ────────────────────────────────────────────────
  //
  // A dot each, at every company they hold — and a name over as many of them
  // as the board has room for. The slices already carry the same fact as
  // colour; this is the half a reader can read out loud.
  const dots = placeHolders(model, holdings);
  const dotEls = [];
  dots.forEach((dot) => {
    const g = svgEl('g', {
      class: `om-dot${cls(dot.holder, dot.ticker)}`, 'data-id': dot.holder,
      tabindex: 0, role: 'button',
    }, gDot);
    svgEl('circle', {
      cx: dot.x, cy: dot.y, r: dot.r, fill: hueOf(dot.holder),
      stroke: 'var(--surface)', 'stroke-width': 1,
    }, g);
    const title = svgEl('title', {}, g);
    title.textContent = `${labelOf(dot.holder)} — ${stakeText(dot.percent)} ${t('of', 'من')} ${dot.ticker}`;
    g.addEventListener('click', (e) => { e.stopPropagation(); onPick(dot.holder); });
  });

  // A name may not land on a ring, on a ring's ticker, or on a sector's
  // caption. The reserved box is the RING, not the text inside it: reserving
  // only the ticker put "Wadi Lilistithmarat" straight across GGCC's band.
  // A name on demand, over the dot the pointer is on. Built once and moved,
  // because a label created per hover is a node per hover.
  const hover = svgEl('g', { class: 'om-hover', visibility: 'hidden' }, gName);
  const plate = svgEl('rect', { rx: 7, class: 'om-pin-plate' }, hover);
  const hoverText = svgEl('text', {
    'text-anchor': 'middle', 'font-size': 9.5, fill: 'var(--ink)', direction: 'ltr',
  }, hover);
  const nameAt = (dot) => {
    const label = `${stakeText(dot.percent)}  ${labelOf(dot.holder)}`;
    hoverText.textContent = label;
    const w = (typeof hoverText.getComputedTextLength === 'function'
      && hoverText.getComputedTextLength() > 0)
      ? hoverText.getComputedTextLength() : label.length * 5.2;
    const x = Math.max(w / 2 + 4, Math.min(view.w - w / 2 - 4, dot.x));
    const y = Math.max(14, dot.y - dot.r - 7);
    hoverText.setAttribute('x', x);
    hoverText.setAttribute('y', y);
    plate.setAttribute('x', x - w / 2 - 5);
    plate.setAttribute('y', y - 9.5);
    plate.setAttribute('width', w + 10);
    plate.setAttribute('height', 13);
    hover.setAttribute('visibility', 'visible');
  };
  const clearName = () => hover.setAttribute('visibility', 'hidden');
  // The elements as they were built, rather than queried back out of the
  // layer: the same order, no selector, and nothing to go stale.
  dotEls.forEach((g, i) => {
    const dot = dots[i];
    if (!dot) return;
    g.addEventListener('pointerenter', () => nameAt(dot));
    g.addEventListener('pointerleave', clearName);
    g.addEventListener('focus', () => nameAt(dot));
    g.addEventListener('blur', clearName);
  });
  if (opts.named) {
    const shown = dots.find((d) => d.holder === opts.named.holder
                                && d.ticker === opts.named.ticker);
    if (shown) nameAt(shown);
  }

  // ── who is in the company you picked ──────────────────────────────────────
  //
  // Names only for the focused company, and only then. Sixty-six of them
  // permanently on the board would bury the board.
  // Only for a company. A HOLDER in focus is already answered by the seat,
  // its spokes and the stake tag at each end; pinning the same name again
  // beside every company said it twice.
  if (focus && nodes.has(focus)) {
    popOut(gPop, nodes.get(focus), (byTicker.get(focus) || []), labelOf, onPick, view);
  }
}

/* One holder's name pinned beside the ring it belongs to.
 *
 * On a plate, because the label sits over whatever the board has in that
 * direction — another sector's cell, another company's ring — and a name read
 * against a ring is not read at all. The side is chosen by which one has more
 * room, and the plate is then pushed back inside the frame if it still hangs
 * over an edge.
 */
function popOut(layer, node, list, labelOf, onPick, view) {
  const sorted = list.slice().sort((a, b) => b.percent - a.percent).slice(0, 6);
  const right = node.x < view.w / 2;
  const top = Math.max(14, Math.min(view.h - 16 * sorted.length - 6,
                                    node.y - (sorted.length - 1) * 8));
  sorted.forEach((p, i) => {
    const y = top + i * 16;
    const g = svgEl('g', { class: 'om-pin' }, layer);
    const name = labelOf(p.holder);
    const label = `${p.percent.toFixed(2)}%  ${name.length > 28 ? `${name.slice(0, 26)}…` : name}`;
    const text = svgEl('text', {
      x: 0, y, 'text-anchor': right ? 'start' : 'end', 'font-size': 9.5,
      fill: 'var(--ink)', direction: 'ltr',
    });
    text.textContent = label;
    // Built detached, measured once it is in the layer: a detached element
    // reports a length of zero and the plate would come out empty.
    layer.appendChild(text);
    const width = (typeof text.getComputedTextLength === 'function'
      && text.getComputedTextLength() > 0)
      ? text.getComputedTextLength() : label.length * 5.2;
    let x = right ? node.x + node.r + 13 : node.x - node.r - 13;
    if (right) x = Math.min(x, view.w - width - 6);
    else x = Math.max(x, width + 6);
    text.setAttribute('x', x);
    g.appendChild(svgEl('rect', {
      x: (right ? x : x - width) - 5, y: y - 9.5, width: width + 10, height: 14,
      rx: 7, class: 'om-pin-plate',
    }));
    svgEl('line', {
      x1: right ? node.x + node.r + 2 : node.x - node.r - 2, y1: node.y,
      x2: right ? x - 6 : x + 6, y2: y - 3, stroke: hueOf(p.holder),
      'stroke-width': 0.9, opacity: 0.6,
    }, g);
    g.appendChild(text);
    const title = svgEl('title', {}, g);
    title.textContent = name;
    g.addEventListener('click', (e) => { e.stopPropagation(); onPick(p.holder); });
  });
}

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
  const radius = (cap) => (finite(cap) && cap > 0 && capMax > 0
    ? R_MIN + Math.sqrt(cap / capMax) * (R_MAX - R_MIN)
    : R_MIN);

  const nodes = new Map();
  const placed = [];
  cells.forEach((cell) => {
    const list = cell.list.slice().sort((a, b) => (b.disclosed - a.disclosed) || (b.cap - a.cap));
    const inner = { x: cell.x, y: cell.y + CELL_LABEL, w: cell.w, h: cell.h - CELL_LABEL };
    // Columns chosen so the slots come out near square, which is what keeps a
    // ring from being clipped by a slot that is tall and thin.
    const cols = Math.max(1, Math.min(list.length,
      Math.round(Math.sqrt(list.length * (inner.w / Math.max(inner.h, 1)))) || 1));
    const outRows = Math.ceil(list.length / cols);
    const slotW = inner.w / cols;
    const slotH = inner.h / outRows;
    const room = Math.max(6, Math.min(slotW, slotH) / 2 - 9);
    list.forEach((r, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      // The last row is centred rather than left-aligned, so a sector of five
      // in a three-wide grid does not hang two rings off one edge.
      const inRow = Math.min(cols, list.length - row * cols);
      const offset = (cols - inRow) * slotW / 2;
      const node = {
        ...r,
        x: inner.x + offset + slotW * (col + 0.5),
        y: inner.y + slotH * (row + 0.5),
        r: Math.min(room, radius(r.cap)),
        hasCap: finite(r.cap) && r.cap > 0,
      };
      nodes.set(r.ticker, node);
      placed.push(node);
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

/* How many of those dots can be named without a name landing on another.
 *
 * Not a top-N: the number that fits is whatever fits, and it changes with the
 * size of the board. A fixed count would show the same twelve names on a
 * phone and in full screen, and would quietly become a ranking of holders
 * rather than a consequence of the room available.
 */
export function labelWhatFits(dots, taken, view, opts = {}) {
  const size = opts.fontSize ?? 8;
  const per = opts.charWidth ?? 4.6;
  const lift = opts.lift ?? 5.5;
  const boxes = taken.slice();
  const hits = (box) => boxes.some((b) => box.x < b.x + b.w && b.x < box.x + box.w
                                       && box.y < b.y + b.h && b.y < box.y + box.h);
  const out = [];
  dots.forEach((dot) => {
    const text = opts.labelOf(dot.holder);
    if (!text) return;
    const trimmed = text.length > 24 ? `${text.slice(0, 22)}…` : text;
    const w = trimmed.length * per;
    const box = { x: dot.x - w / 2, y: dot.y - dot.r - lift - size, w, h: size + 1.5 };
    if (box.x < 2 || box.x + box.w > view.w - 2 || box.y < 2) return;
    if (hits(box)) return;
    boxes.push(box);
    out.push({ dot, text: trimmed, x: dot.x, y: box.y + size });
  });
  return out;
}


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

  // ── a holder who is in more than one company ──────────────────────────────
  //
  // The only genuinely graph-shaped thing in the data — 59 of the 66 named
  // holders appear in exactly one company, and for them the slice on the ring
  // already says everything a separate node would. These seven are drawn as
  // the curves they are.
  bridges.forEach((b) => {
    for (let i = 0; i < b.tickers.length - 1; i += 1) {
      const a = nodes.get(b.tickers[i]);
      const c = nodes.get(b.tickers[i + 1]);
      if (!a || !c) continue;
      const { d } = edgePath(a, c);
      svgEl('path', {
        d, fill: 'none', stroke: hueOf(b.holder), 'stroke-width': 1.6,
        'stroke-linecap': 'round', opacity: 0.75,
        class: `om-bridge${cls(b.holder)}`,
      }, gBridge);
    }
  });

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
  dots.forEach((dot) => {
    const g = svgEl('g', {
      class: `om-dot${cls(dot.holder, dot.ticker)}`, 'data-id': dot.holder,
    }, gDot);
    svgEl('circle', {
      cx: dot.x, cy: dot.y, r: dot.r, fill: hueOf(dot.holder),
      stroke: 'var(--surface)', 'stroke-width': 1,
    }, g);
    const title = svgEl('title', {}, g);
    title.textContent = `${labelOf(dot.holder)} — ${dot.percent.toFixed(2)}% ${t('of', 'من')} ${dot.ticker}`;
    g.addEventListener('click', (e) => { e.stopPropagation(); onPick(dot.holder); });
  });

  // A name may not land on a ring, on a ring's ticker, or on a sector's
  // caption. The reserved box is the RING, not the text inside it: reserving
  // only the ticker put "Wadi Lilistithmarat" straight across GGCC's band.
  const taken = model.placed.map((n) => {
    const reach = n.r + BAND / 2 + 2;
    return { x: n.x - reach, y: n.y - reach, w: reach * 2, h: reach * 2 };
  }).concat(cells.map((c) => ({ x: c.x, y: c.y, w: c.w, h: CELL_LABEL })));
  labelWhatFits(dots, taken, view, {
    labelOf, fontSize: dense ? 8.5 : 8, charWidth: dense ? 4.9 : 4.6,
  }).forEach(({ dot, text, x, y }) => {
    const g = svgEl('g', {
      class: `om-dot-name${cls(dot.holder, dot.ticker)}`, 'data-id': dot.holder,
    }, gDot);
    const label = svgEl('text', {
      x, y, 'text-anchor': 'middle', 'font-size': dense ? 8.5 : 8,
      fill: 'var(--t2)', direction: 'ltr',
    }, g);
    label.textContent = text;
    const title = svgEl('title', {}, g);
    title.textContent = labelOf(dot.holder);
    g.addEventListener('click', (e) => { e.stopPropagation(); onPick(dot.holder); });
  });

  // ── who is in the company you picked ──────────────────────────────────────
  //
  // Names only for the focused company, and only then. Sixty-six of them
  // permanently on the board would bury the board.
  if (focus && nodes.has(focus)) {
    popOut(gPop, nodes.get(focus), (byTicker.get(focus) || []), labelOf, onPick, view);
  } else if (focus) {
    holdings.filter((p) => p.holder === focus).forEach((p) => {
      const n = nodes.get(p.ticker);
      if (n) popOut(gPop, n, [p], labelOf, onPick, view);
    });
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

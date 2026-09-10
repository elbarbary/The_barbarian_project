/* Who holds what, and where a stake went.
 *
 * The people list beside this says the same facts in a sentence each. This
 * says them all at once: a company is a ring sized by market value and sliced
 * by the holders we can name; a holder is a node sized by everything they are
 * known to hold; a stake is the line between them, thick in proportion to the
 * percentage. Move between months and the slices move with the filings.
 *
 * Three honesty rules are built into the drawing rather than written under it.
 *
 * The unsliced part of a ring is NOT free float. It is ownership nobody has
 * had to disclose, which is most of every company on the exchange — the map
 * says "no disclosure" and colours it as absence, because calling it float
 * would claim a fact about the register that this project does not have.
 *
 * A stake is a percentage OF ONE COMPANY. A holder's size is a currency value,
 * never a summed percentage, because 6% of one issuer and 2% of another do not
 * add to 8% of anything.
 *
 * And a company with no market value published is drawn at the floor size with
 * its ring left hollow, rather than being dropped or guessed at.
 */

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

/* A holder keeps their colour across sessions and across the two languages, so
 * the hash is over the id — which is the folded name — and never over the
 * position in a sorted list, which changes the moment somebody files. */
export function hueOf(id) {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return `var(--own${(h % 6) + 1})`;
}

/** Months that actually carry a filing, oldest first. */
export function periodsOf(doc) {
  const months = new Set();
  (doc.people || []).forEach((p) => (p.trades || []).forEach((t) => {
    if (t.date) months.add(t.date.slice(0, 7));
  }));
  return [...months].sort();
}

/* What each holder held in each company AS AT the end of a month.
 *
 * `stakeAfter` from the person's latest filing in or before that month — not a
 * sum of their trades. A stake is a level the form states outright, and adding
 * up movements would drift away from it with every scan that could not be read.
 */
export function stakesAt(doc, period) {
  const latest = new Map();
  (doc.people || []).forEach((p) => {
    (p.trades || []).forEach((t) => {
      if (!t.date || !t.ticker || t.date.slice(0, 7) > period) return;
      if (!finite(t.stakeAfter)) return;
      const k = `${p.id}|${t.ticker}`;
      const held = latest.get(k);
      if (!held || t.date > held.date) latest.set(k, { date: t.date, pct: t.stakeAfter, person: p });
    });
  });
  const out = {};
  latest.forEach((v, k) => { if (v.pct > 0) out[k] = v.pct; });
  return out;
}

/** Trades filed inside one month, for the arrows. */
export function tradesIn(doc, period) {
  const rows = [];
  (doc.people || []).forEach((p) => (p.trades || []).forEach((t) => {
    if (t.date && t.date.slice(0, 7) === period) rows.push({ ...t, person: p });
  }));
  return rows.sort((a, b) => (b.value || 0) - (a.value || 0));
}


/* ── Where things sit ─────────────────────────────────────────────────────────
 *
 * Deterministic, and that is the requirement rather than a preference. A
 * force-directed layout would settle somewhere slightly different on every
 * render, so a reader stepping from July to August would watch every node
 * drift and be unable to tell which movement was the data. Here the only thing
 * that moves between months is a slice, an arc, and a node's radius.
 *
 * Companies sit on a ring, ordered by sector so that a sector reads as an arc
 * of the circle; holders sit on a wider ring, each placed at the angle of the
 * company they hold most of, so their line runs inward rather than across.
 */
export const VIEW = { w: 960, h: 640 };

const RING = 9;          // thickness of a company's slice band
const CO_MIN = 15;       // a company with no published market value
const CO_MAX = 44;
const OWN_MIN = 9;
const OWN_MAX = 30;

export function layout(doc, stakes, caps, limit = 9) {
  // Companies worth drawing: the ones carrying the most disclosed ownership.
  const held = {};
  Object.entries(stakes).forEach(([k, pct]) => {
    const ticker = k.split('|')[1];
    held[ticker] = (held[ticker] || 0) + pct;
  });
  const tickers = Object.keys(held)
    .sort((a, b) => (held[b] * (caps[b] || 0)) - (held[a] * (caps[a] || 0)))
    .slice(0, limit);
  const keep = new Set(tickers);

  const capVals = tickers.map((t) => caps[t]).filter(finite);
  const capMax = capVals.length ? Math.max(...capVals) : 0;
  const coR = (t) => (finite(caps[t]) && capMax > 0
    ? CO_MIN + Math.sqrt(caps[t] / capMax) * (CO_MAX - CO_MIN)
    : CO_MIN);

  // Sector order keeps same-sector companies adjacent on the ring.
  const bySector = {};
  tickers.forEach((t) => {
    const s = (caps.sectorOf && caps.sectorOf(t)) || '—';
    (bySector[s] = bySector[s] || []).push(t);
  });
  const ordered = [];
  Object.keys(bySector).sort().forEach((s) => {
    bySector[s].sort((a, b) => (caps[b] || 0) - (caps[a] || 0))
      .forEach((t) => ordered.push({ ticker: t, sector: s }));
  });

  const cx = VIEW.w / 2;
  const cy = VIEW.h / 2 - 6;
  const coRing = Math.min(VIEW.h, VIEW.w) * 0.30;
  const nodes = {};
  const angleOf = {};
  ordered.forEach((row, i) => {
    // Start at the top and go clockwise, so the first sector reads first.
    const a = -Math.PI / 2 + (i / ordered.length) * TAU;
    angleOf[row.ticker] = a;
    nodes[row.ticker] = {
      kind: 'company', ticker: row.ticker, sector: row.sector,
      x: cx + Math.cos(a) * coRing, y: cy + Math.sin(a) * coRing,
      r: coR(row.ticker), hasCap: finite(caps[row.ticker]),
    };
  });

  // Holders: value of what they hold, and an angle borrowed from their
  // largest holding so the line runs inward.
  const owners = {};
  Object.entries(stakes).forEach(([k, pct]) => {
    const [pid, ticker] = k.split('|');
    if (!keep.has(ticker)) return;
    const value = finite(caps[ticker]) ? (pct / 100) * caps[ticker] : 0;
    const o = owners[pid] = owners[pid] || { id: pid, value: 0, anchor: null, best: -1, links: [] };
    o.value += value;
    o.links.push({ ticker, pct, value });
    if (pct > o.best) { o.best = pct; o.anchor = ticker; }
  });
  const vals = Object.values(owners).map((o) => o.value).filter((v) => v > 0);
  const vMax = vals.length ? Math.max(...vals) : 0;
  const ownR = (v) => (vMax > 0 && v > 0
    ? OWN_MIN + Math.sqrt(v / vMax) * (OWN_MAX - OWN_MIN)
    : OWN_MIN);

  // Two rings so labels have somewhere to go: the busier holders outside.
  const byAnchor = {};
  Object.values(owners).forEach((o) => {
    (byAnchor[o.anchor] = byAnchor[o.anchor] || []).push(o);
  });
  Object.entries(byAnchor).forEach(([ticker, list]) => {
    const base = angleOf[ticker] ?? -Math.PI / 2;
    list.sort((a, b) => b.value - a.value);
    const spread = Math.min(0.30, 0.10 * list.length);
    list.forEach((o, i) => {
      const a = base + (list.length === 1 ? 0 : -spread / 2 + (i / (list.length - 1)) * spread);
      const ring = coRing + 118 + (i % 2) * 46;
      nodes[o.id] = {
        kind: 'holder', id: o.id, value: o.value, links: o.links,
        x: cx + Math.cos(a) * ring * (VIEW.w / VIEW.h) * 0.72,
        y: cy + Math.sin(a) * ring * 0.74,
        r: ownR(o.value), angle: a,
      };
    });
  });
  return { nodes, tickers: ordered, cx, cy, RING };
}


function arcPath(cx, cy, r0, r1, a0, a1) {
  if (a1 - a0 < 0.0006) return '';
  const large = (a1 - a0) > Math.PI ? 1 : 0;
  const P = (r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  const [x0, y0] = P(r1, a0); const [x1, y1] = P(r1, a1);
  const [x2, y2] = P(r0, a1); const [x3, y3] = P(r0, a0);
  return `M${x0} ${y0}A${r1} ${r1} 0 ${large} 1 ${x1} ${y1}`
       + `L${x2} ${y2}A${r0} ${r0} 0 ${large} 0 ${x3} ${y3}Z`;
}

/* Edge from rim to rim rather than centre to centre, so a thick line does not
 * bury the node it points at. */
function edgePath(a, b, bend = 0.16) {
  const dx = b.x - a.x; const dy = b.y - a.y;
  const d = Math.hypot(dx, dy) || 1;
  const ux = dx / d; const uy = dy / d;
  const s = { x: a.x + ux * a.r, y: a.y + uy * a.r };
  const e = { x: b.x - ux * b.r, y: b.y - uy * b.r };
  const m = { x: (s.x + e.x) / 2 - uy * d * bend, y: (s.y + e.y) / 2 + ux * d * bend };
  return { d: `M${s.x} ${s.y}Q${m.x} ${m.y} ${e.x} ${e.y}`,
           mid: { x: 0.25 * s.x + 0.5 * m.x + 0.25 * e.x,
                  y: 0.25 * s.y + 0.5 * m.y + 0.25 * e.y } };
}

const money = (v) => (finite(v) && v > 0
  ? new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(v)
  : '—');

export function renderMap(svg, model, opts) {
  const { nodes, cx, cy } = model;
  const { stakes, prevStakes, trades, labelOf, onPick, focused, t, ar } = opts;
  while (svg.firstChild) svg.removeChild(svg.firstChild);
  svg.setAttribute('viewBox', `0 0 ${VIEW.w} ${VIEW.h}`);

  const gEdge = svgEl('g', { class: 'om-edges' }, svg);
  const gCo = svgEl('g', { class: 'om-cos' }, svg);
  const gFlow = svgEl('g', { class: 'om-flows' }, svg);
  const gOwn = svgEl('g', { class: 'om-owners' }, svg);

  const related = new Set();
  if (focused) {
    related.add(focused);
    Object.keys(stakes).forEach((k) => {
      const [pid, ticker] = k.split('|');
      if (pid === focused) related.add(ticker);
      if (ticker === focused) related.add(pid);
    });
  }
  const dim = (id) => (focused && !related.has(id) ? 'om-dim' : '');

  // ── stakes ────────────────────────────────────────────────────────────────
  Object.entries(stakes).forEach(([k, pct]) => {
    const [pid, ticker] = k.split('|');
    const a = nodes[pid]; const b = nodes[ticker];
    if (!a || !b) return;
    const { d } = edgePath(a, b);
    svgEl('path', {
      d, fill: 'none', stroke: hueOf(pid),
      'stroke-width': 1 + Math.min(pct, 45) * 0.16,
      'stroke-linecap': 'round', opacity: 0.4,
      class: `om-edge ${dim(pid) && dim(ticker) ? 'om-dim' : ''}`,
    }, gEdge);
  });

  // ── companies ─────────────────────────────────────────────────────────────
  model.tickers.forEach(({ ticker }) => {
    const n = nodes[ticker];
    if (!n) return;
    const g = svgEl('g', { class: `om-co ${dim(ticker)}`, 'data-id': ticker }, gCo);
    const inner = n.r - RING / 2;
    const outer = n.r + RING / 2;

    const mine = Object.keys(stakes).filter((k) => k.split('|')[1] === ticker)
      .sort((x, y) => stakes[y] - stakes[x]);
    let a0 = -Math.PI / 2;
    mine.forEach((k) => {
      const pid = k.split('|')[0];
      const a1 = a0 + (stakes[k] / 100) * TAU;
      const d = arcPath(n.x, n.y, inner, outer, a0, a1);
      if (d) svgEl('path', { d, fill: hueOf(pid), class: 'om-slice', 'data-o': pid }, g);
      // Outside the band: did this stake grow or shrink since last month?
      const was = prevStakes ? prevStakes[k] : undefined;
      if (prevStakes) {
        const now = stakes[k];
        if (was === undefined) {
          svgEl('path', { d: arcPath(n.x, n.y, outer + 2.5, outer + 5, a0, a1),
                          fill: 'var(--up)', class: 'om-mark' }, g);
        } else if (now > was) {
          const grew = ((now - was) / 100) * TAU;
          svgEl('path', { d: arcPath(n.x, n.y, outer + 2.5, outer + 5, Math.max(a0, a1 - grew), a1),
                          fill: 'var(--up)', class: 'om-mark' }, g);
        } else if (now < was) {
          const shed = ((was - now) / 100) * TAU;
          svgEl('path', { d: arcPath(n.x, n.y, outer + 2.5, outer + 5, a1, a1 + shed),
                          fill: 'var(--down)', class: 'om-mark' }, g);
        }
      }
      a0 = a1;
    });
    // Everything nobody had to disclose. Not free float, and not coloured as
    // though it were a holder.
    svgEl('path', { d: arcPath(n.x, n.y, inner, outer, a0, Math.PI * 1.5 - 0.0001),
                    fill: 'var(--ownNone)', class: 'om-undisclosed' }, g);
    svgEl('circle', { cx: n.x, cy: n.y, r: inner - 1, fill: 'var(--surface)' }, g);
    if (!n.hasCap) {
      svgEl('circle', { cx: n.x, cy: n.y, r: inner - 1, fill: 'none',
                        stroke: 'var(--rule)', 'stroke-dasharray': '2 3' }, g);
    }
    const tk = svgEl('text', { x: n.x, y: n.y + 1, 'text-anchor': 'middle',
                               fill: 'var(--ink)', 'font-size': n.r > 26 ? 12 : 10,
                               'font-weight': 700, direction: 'ltr' }, g);
    tk.textContent = ticker;
    const cap = svgEl('text', { x: n.x, y: n.y + 13, 'text-anchor': 'middle',
                                fill: 'var(--faint)', 'font-size': 9, direction: 'ltr' }, g);
    cap.textContent = n.hasCap ? money(opts.caps[ticker]) : t('no cap', 'بلا قيمة');
    const hit = svgEl('circle', { cx: n.x, cy: n.y, r: outer + 7, fill: 'transparent',
                                  class: 'om-hit' }, g);
    hit.addEventListener('click', (e) => { e.stopPropagation(); onPick(ticker); });
  });

  // ── trades filed this month ───────────────────────────────────────────────
  trades.slice(0, 6).forEach((tr) => {
    const holder = nodes[tr.person.id];
    const co = nodes[tr.ticker];
    if (!holder || !co) return;
    const from = tr.action === 'buy' ? co : holder;
    const to = tr.action === 'buy' ? holder : co;
    const { d, mid } = edgePath(from, to, -0.24);
    const g = svgEl('g', { class: `om-flow ${dim(tr.person.id) && dim(tr.ticker) ? 'om-dim' : ''}` }, gFlow);
    svgEl('path', { d, fill: 'none', stroke: 'var(--accent)', 'stroke-width': 1,
                    'stroke-dasharray': '3 5', opacity: 0.55 }, g);
    if (finite(tr.value) && tr.value > 0) {
      const label = `${money(tr.value)} EGP`;
      const w = label.length * 5.9 + 12;
      svgEl('rect', { x: mid.x - w / 2, y: mid.y - 9, width: w, height: 18, rx: 9,
                      fill: 'var(--surface)', stroke: 'var(--rule)' }, g);
      const tx = svgEl('text', { x: mid.x, y: mid.y + 4, 'text-anchor': 'middle',
                                 fill: 'var(--t2)', 'font-size': 10, direction: 'ltr' }, g);
      tx.textContent = label;
    }
  });

  // ── holders ───────────────────────────────────────────────────────────────
  Object.values(nodes).filter((n) => n.kind === 'holder').forEach((n) => {
    const g = svgEl('g', { class: `om-owner ${dim(n.id)}`, 'data-id': n.id }, gOwn);
    svgEl('circle', { cx: n.x, cy: n.y, r: n.r, fill: hueOf(n.id), opacity: 0.92 }, g);
    // Two lines, 20 user units apart. 12 left them touching at exactly -0.1px
    // of gap once the 960-wide viewBox is scaled to its container, and 14 —
    // measured, not guessed — still left nothing between them. At 20 there is
    // about 4px of real space at the size this actually renders.
    const above = n.y < cy;
    const label = svgEl('text', {
      x: n.x, y: above ? n.y - n.r - 27 : n.y + n.r + 15,
      'text-anchor': 'middle', fill: 'var(--ink)', 'font-size': 10.5,
      direction: 'ltr',
    }, g);
    const full = labelOf(n.id);
    label.textContent = full.length > 22 ? `${full.slice(0, 20)}…` : full;
    const sub = svgEl('text', {
      x: n.x, y: above ? n.y - n.r - 8 : n.y + n.r + 35,
      'text-anchor': 'middle', fill: 'var(--faint)', 'font-size': 9, direction: 'ltr',
    }, g);
    sub.textContent = n.value > 0 ? `${money(n.value)} EGP` : t('value unknown', 'قيمة غير معروفة');
    const title = svgEl('title', {}, g);
    title.textContent = full;
    g.addEventListener('click', (e) => { e.stopPropagation(); onPick(n.id); });
  });
}

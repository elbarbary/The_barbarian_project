/* The ownership map draws a claim about who owns a real company.
 *
 * A ring that adds up to more than a company, a stake summed across two
 * issuers, a grey remainder described as free float — each of those is a
 * false statement about a named party's holding, and none of them looks wrong
 * on screen. So they are asserted here rather than looked at.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { installDom } from './dom-stub.mjs';
installDom();

const OM = await import('../../public/esthmr/ownership-map.js');
const { flowTrackers } = await import('../../public/esthmr/flow-trackers.js');
const { Component } = await import('../../public/esthmr/logic.js');

const file = (path) => readFile(new URL('../../' + path, import.meta.url), 'utf8');
const published = JSON.parse(await file('public/data/v1/insider-people.json'));

const text = (node) => [node?.text || '', ...(node?.children || []).map(text)].join(' ');
const all = (node, tag) => [
  ...(node?.tag === tag ? [node] : []),
  ...(node?.children || []).flatMap((n) => all(n, tag)),
];
function nodesWithClass(node, name) {
  const hit = String(node?.attrs?.class || '').split(/\s+/).includes(name) ? [node] : [];
  return [...hit, ...(node?.children || []).flatMap((n) => nodesWithClass(n, name))];
}

function board(rows) {
  return OM.layout(rows);
}

const ROWS = [
  { ticker: 'AAA', name: 'Alpha', sector: 'Banks', cap: 2e10, disclosed: 40 },
  { ticker: 'BBB', name: 'Beta', sector: 'Banks', cap: 5e9, disclosed: 12 },
  { ticker: 'CCC', name: 'Gamma', sector: 'Real Estate', cap: 1e9, disclosed: 60 },
  { ticker: 'DDD', name: 'Delta', sector: 'Real Estate', cap: null, disclosed: 3 },
  { ticker: 'EEE', name: 'Epsilon', sector: 'Food', cap: 8e8, disclosed: 7 },
];

const HOLDINGS = [
  { holder: 'one', ticker: 'AAA', percent: 40, asOf: '2026-08-20', kind: 'person' },
  { holder: 'two', ticker: 'BBB', percent: 12, asOf: '2026-08-21', kind: 'firm' },
  { holder: 'one', ticker: 'CCC', percent: 60, asOf: '2026-08-22', kind: 'person' },
  { holder: 'three', ticker: 'DDD', percent: 3, asOf: '2026-08-23', kind: 'person' },
  { holder: 'three', ticker: 'EEE', percent: 7, asOf: '2026-08-24', kind: 'person' },
];

function draw(over = {}) {
  const svg = document.createElementNS('', 'svg');
  const model = board(ROWS);
  OM.renderMap(svg, model, {
    holdings: HOLDINGS,
    bridges: [{ holder: 'one', tickers: ['AAA', 'CCC'] },
              { holder: 'three', tickers: ['DDD', 'EEE'] }],
    moves: null,
    labelOf: (id) => id,
    onPick: () => {},
    focus: null,
    t: (en) => en,
    ar: false,
    ...over,
  });
  return { svg, model };
}


test('no two company rings overlap and none escapes the frame', () => {
  const { placed, view } = board(ROWS);
  for (const n of placed) {
    assert.ok(n.x - n.r >= 0 && n.x + n.r <= view.w, `${n.ticker} escapes sideways`);
    assert.ok(n.y - n.r >= 0 && n.y + n.r <= view.h, `${n.ticker} escapes vertically`);
  }
  for (let i = 0; i < placed.length; i += 1) {
    for (let j = i + 1; j < placed.length; j += 1) {
      const a = placed[i]; const b = placed[j];
      const gap = Math.hypot(a.x - b.x, a.y - b.y) - (a.r + b.r);
      assert.ok(gap > 0, `${a.ticker} and ${b.ticker} overlap by ${(-gap).toFixed(1)}`);
    }
  }
});

test('the whole published market fits the board without a collision', () => {
  const positions = OM.standing(published);
  const byTicker = new Map();
  positions.forEach((p) => {
    const row = byTicker.get(p.ticker)
      || { ticker: p.ticker, name: p.ticker, sector: 'Unclassified', cap: 1e9, disclosed: 0 };
    row.disclosed += p.percent;
    byTicker.set(p.ticker, row);
  });
  const { placed } = board([...byTicker.values()]);
  assert.equal(placed.length, byTicker.size);
  for (let i = 0; i < placed.length; i += 1) {
    for (let j = i + 1; j < placed.length; j += 1) {
      const a = placed[i]; const b = placed[j];
      assert.ok(Math.hypot(a.x - b.x, a.y - b.y) > a.r + b.r,
                `${a.ticker} and ${b.ticker} overlap on the real data`);
    }
  }
});

test('a company nobody has published a market value for keeps the floor size', () => {
  const { nodes } = board(ROWS);
  assert.equal(nodes.get('DDD').hasCap, false);
  assert.ok(nodes.get('DDD').r <= nodes.get('AAA').r);
});

test('the board does not move when the week does', () => {
  const a = board(ROWS).placed.map((n) => `${n.ticker}:${n.x.toFixed(3)}:${n.y.toFixed(3)}:${n.r.toFixed(3)}`);
  const b = board(ROWS).placed.map((n) => `${n.ticker}:${n.x.toFixed(3)}:${n.y.toFixed(3)}:${n.r.toFixed(3)}`);
  assert.deepEqual(a, b);
});

test('every company is drawn whatever week is chosen', () => {
  const bare = nodesWithClass(draw().svg, 'om-co').length;
  const week = nodesWithClass(draw({ moves: new Map([[OM.keyOf('one', 'AAA'),
    { holder: 'one', ticker: 'AAA', change: -2.4 }]]) }).svg, 'om-co').length;
  assert.equal(bare, ROWS.length);
  assert.equal(week, ROWS.length);
});

test('a movement arc is drawn only for the holdings that moved that week', () => {
  const { svg } = draw({
    moves: new Map([[OM.keyOf('one', 'AAA'), { holder: 'one', ticker: 'AAA', change: -2.4 }]]),
  });
  const arcs = nodesWithClass(svg, 'om-move');
  assert.equal(arcs.length, 1);
  assert.equal(arcs[0].attrs.fill, 'var(--down)');
});

test('a holder who has since sold out still shows the week they moved', () => {
  // The growth arc used to be clipped to the slice it belonged to. On a
  // holding that has since gone to zero the slice has no width, so the clip
  // erased the movement entirely — on exactly the ring where it is the only
  // thing left to say.
  const { svg } = draw({
    holdings: [{ holder: 'gone', ticker: 'AAA', percent: 0, asOf: '2026-08-30' }],
    moves: new Map([[OM.keyOf('gone', 'AAA'), { holder: 'gone', ticker: 'AAA', change: 9.61 }]]),
  });
  const arcs = nodesWithClass(svg, 'om-move');
  assert.equal(arcs.length, 1, 'the movement was erased with the slice');
  assert.ok(!/NaN/.test(arcs[0].attrs.d));
});

test('a holding that moved this week is drawn as a change, not as a holding', () => {
  const { svg } = draw({
    focus: 'one',
    moves: new Map([
      [OM.keyOf('one', 'AAA'), { holder: 'one', ticker: 'AAA', change: -2.4 }],
      [OM.keyOf('one', 'CCC'), { holder: 'one', ticker: 'CCC', change: 1.8 }],
    ]),
  });
  const spokes = nodesWithClass(svg, 'om-bridge');
  assert.equal(spokes.length, 2);
  assert.ok(spokes.every((l) => l.attrs['stroke-dasharray']), 'a change is dashed');
  assert.deepEqual(spokes.map((l) => l.attrs.stroke).sort(),
                   ['var(--down)', 'var(--up)']);
});

test('a holding that did not move keeps the holder\u2019s own colour, solid', () => {
  const { svg } = draw({
    focus: 'one',
    moves: new Map([[OM.keyOf('one', 'AAA'), { holder: 'one', ticker: 'AAA', change: -2.4 }]]),
  });
  const solid = nodesWithClass(svg, 'om-bridge')
    .filter((l) => !l.attrs['stroke-dasharray']);
  assert.equal(solid.length, 1, 'CCC did not move that week');
  assert.equal(solid[0].attrs.stroke, OM.hueOf('one'));
});

test('the tag takes the colour of the line it ends, so the two agree', () => {
  const { svg } = draw({
    focus: 'one',
    moves: new Map([[OM.keyOf('one', 'AAA'), { holder: 'one', ticker: 'AAA', change: -2.4 }]]),
  });
  const fills = nodesWithClass(svg, 'om-stake-tag')
    .map((g) => g.children.find((c) => c.tag === 'rect').attrs.fill).sort();
  assert.deepEqual(fills, [OM.hueOf('one'), 'var(--down)'].sort());
});

test('a stake that grew is marked apart from one that shrank', () => {
  const { svg } = draw({
    moves: new Map([[OM.keyOf('two', 'BBB'), { holder: 'two', ticker: 'BBB', change: 1.8 }]]),
  });
  assert.equal(nodesWithClass(svg, 'om-move')[0].attrs.fill, 'var(--up)');
});

test('the standing board carries no movement marks at all', () => {
  assert.equal(nodesWithClass(draw().svg, 'om-move').length, 0);
});

test('every company ring carries the undisclosed remainder', () => {
  const { svg } = draw();
  assert.equal(nodesWithClass(svg, 'om-undisclosed').length, ROWS.length);
});

test('filings that add to more than a company mark the ring instead of clamping quietly', () => {
  // Two spellings of one holder's name did exactly this to HBCO: 47% and 45%
  // of the same company, read as two people. Scaled to fit and left unmarked,
  // the ring would be indistinguishable from a company wholly in named hands.
  const { svg } = draw({
    holdings: [{ holder: 'one', ticker: 'AAA', percent: 47.26, asOf: '2026-08-10' },
               { holder: 'two', ticker: 'AAA', percent: 45.39, asOf: '2026-08-20' },
               { holder: 'three', ticker: 'AAA', percent: 10.73, asOf: '2026-08-03' }],
  });
  const ring = nodesWithClass(svg, 'om-co').find((n) => n.attrs['data-id'] === 'AAA');
  assert.ok(String(ring.attrs.class).includes('om-over'), 'the contradiction is not marked');
  assert.match(text(ring), /103\.4%, which is more than the company/);
});

test('over-disclosed slices are scaled to fit rather than wrapping past each other', () => {
  const { claimed, over, arcs } = OM.sliceAngles(
    [{ percent: 47.26 }, { percent: 45.39 }, { percent: 10.73 }]);
  assert.ok(over);
  assert.ok(Math.abs(claimed - 103.38) < 0.01);
  const span = arcs[arcs.length - 1].a1 - arcs[0].a0;
  assert.ok(span <= Math.PI * 2 + 1e-9, `the band wraps ${(span / (Math.PI * 2)).toFixed(3)} times round`);
  arcs.forEach((a, i) => { if (i) assert.equal(a.a0, arcs[i - 1].a1); });
});

test('slices that fit are left at their own size', () => {
  const { over, arcs } = OM.sliceAngles([{ percent: 25 }, { percent: 25 }]);
  assert.equal(over, false);
  assert.ok(Math.abs((arcs[0].a1 - arcs[0].a0) - Math.PI / 2) < 1e-9);
});

test('an ordinary ring is not marked as over-disclosed', () => {
  const ring = nodesWithClass(draw().svg, 'om-co').find((n) => n.attrs['data-id'] === 'AAA');
  assert.ok(!String(ring.attrs.class).includes('om-over'));
  assert.match(text(ring), /40\.0% in named hands/);
});

test('every company whose filings exceed it is declared, not left to be noticed', () => {
  // Merging the registers in made this possible: a register in English and a
  // trade form in Arabic can name one firm twice, and no folding reaches
  // across a translation. The claim is not that it never happens — it is that
  // when it does, the file says so.
  const byTicker = new Map();
  OM.standing(published).forEach((p) => {
    byTicker.set(p.ticker, (byTicker.get(p.ticker) || 0) + p.percent);
  });
  const over = [...byTicker.entries()].filter(([, pct]) => pct > 100.0001)
    .map(([t]) => t).sort();
  const declared = (published.overDisclosed || []).map((r) => r.ticker).sort();
  assert.deepEqual(over, declared);
});

test('an over-disclosed company is marked on the board and named in the panel', () => {
  const over = (published.overDisclosed || [])[0];
  if (!over) return;                       // nothing to check today
  const out = panel();
  const ring = nodesWithClass(out, 'om-co').find((n) => n.attrs['data-id'] === over.ticker);
  assert.ok(String(ring.attrs.class).includes('om-over'),
            `${over.ticker} adds to ${over.percent}% and is not marked`);
  assert.match(text(ring), /which is more than the company/);
});

test('a crowded board still keeps its rings inside their slots', () => {
  // Six times the companies this file holds today, one of them the largest on
  // the exchange. Without the slot clamp the big ring swallows its neighbours.
  const sectors = ['Banks', 'Real Estate', 'Food', 'Health', 'Tech', 'Textile',
                   'Paper', 'Travel', 'Energy', 'Shipping', 'Basic', 'Education',
                   'Building', 'Finance', 'Contracting', 'Industrial'];
  const rows = Array.from({ length: 288 }, (_, i) => ({
    ticker: `T${i}`, name: `Company ${i}`, sector: sectors[i % sectors.length],
    cap: i === 0 ? 2e11 : 1e8 + (i * 7919) % 5e10, disclosed: 5,
  }));
  const { placed } = board(rows);
  for (let i = 0; i < placed.length; i += 1) {
    for (let j = i + 1; j < placed.length; j += 1) {
      const a = placed[i]; const b = placed[j];
      assert.ok(Math.hypot(a.x - b.x, a.y - b.y) > a.r + b.r,
                `${a.ticker} and ${b.ticker} overlap`);
    }
  }
});

test('a holding read down to zero leaves the board', () => {
  const doc = { positions: [{ holder: 'x', ticker: 'AAA', percent: 0 },
                            { holder: 'y', ticker: 'BBB', percent: 4 }] };
  assert.deepEqual(OM.standing(doc).map((p) => p.ticker), ['BBB']);
});

test('the market\u2019s cross-holdings are drawn at rest, faintly', () => {
  const rest = nodesWithClass(draw().svg, 'om-bridge-rest');
  assert.equal(rest.length, 2, 'two holders in two companies each');
  assert.ok(rest.every((l) => Number(l.attrs.opacity) < 0.5),
            'at rest a line is context, not an answer');
  assert.ok(rest.every((l) => Number(l.attrs['stroke-width']) < 1.2));
});

test('picking a holder replaces the resting web with that holder\u2019s own lines', () => {
  const { svg } = draw({ focus: 'one' });
  assert.equal(nodesWithClass(svg, 'om-bridge-rest').length, 0);
  const mine = nodesWithClass(svg, 'om-bridge');
  assert.equal(mine.length, 2);
  assert.ok(mine.every((l) => Number(l.attrs['stroke-width']) > 1.2));
});

test('every sector is a lake with its own coastline', () => {
  const { svg } = draw();
  const lakes = nodesWithClass(svg, 'om-lake');
  assert.equal(lakes.length, 3, 'Banks, Real Estate and Food');
  const shores = lakes.map((g) => g.children.find((c) => c.tag === 'path').attrs.d);
  assert.equal(new Set(shores).size, 3, 'two sectors share a coastline');
  shores.forEach((d) => assert.match(d, /^M[\d.]+ [\d.]+C/, 'a shore is not a curve'));
});

test('a sector\u2019s coastline is the same every time it is drawn', () => {
  // A random wobble would give the Banks a different shape on every render,
  // and the whole board is built on nothing moving unless the data moved.
  const shore = () => nodesWithClass(draw().svg, 'om-lake')
    .map((g) => g.children.find((c) => c.tag === 'path').attrs.d);
  assert.deepEqual(shore(), shore());
  assert.notEqual(OM.seedOf('Banks'), OM.seedOf('Real Estate'));
});

test('the holder in focus gets a line to each company they hold', () => {
  const { svg } = draw({ focus: 'one' });
  const drawn = nodesWithClass(svg, 'om-bridge');
  assert.equal(drawn.length, 2, 'one owner, two holdings, two lines');
  assert.deepEqual(drawn.map((p) => p.attrs['data-to']).sort(), ['AAA', 'CCC']);
  assert.equal(drawn[0].attrs.stroke, OM.hueOf('one'));
});

test('the owner has one place to stand, named', () => {
  const seats = nodesWithClass(draw({ focus: 'one' }).svg, 'om-seat');
  assert.equal(seats.length, 1, 'a holder in two companies still has one seat');
  assert.match(text(seats[0]), /one/);
});

test('each line carries a dot that travels it', () => {
  const { svg } = draw({ focus: 'one' });
  const dots = nodesWithClass(svg, 'om-flow-dot');
  assert.equal(dots.length, 2);
  const motion = dots[0].children.find((c) => c.tag === 'animateMotion');
  assert.ok(motion, 'the dot has nothing to travel along');
  assert.equal(motion.attrs.path, nodesWithClass(svg, 'om-bridge')[0].attrs.d,
               'the dot travels the line it belongs to');
});

test('focusing a company fades everything unrelated to it', () => {
  const { svg } = draw({ focus: 'AAA' });
  const dimmed = nodesWithClass(svg, 'om-dim');
  assert.ok(dimmed.length > 0, 'nothing was dimmed');
  const co = nodesWithClass(svg, 'om-co').find((n) => n.attrs['data-id'] === 'AAA');
  assert.ok(!String(co.attrs.class).includes('om-dim'), 'the focused company was dimmed');
});

test('focusing a company seats its holders where they can be read', () => {
  // Their dots already orbit the ring, so a line between them would be ten
  // pixels long and say nothing. The seats are out on the water.
  const { svg } = draw({ focus: 'AAA' });
  const seats = nodesWithClass(svg, 'om-seat');
  assert.equal(seats.length, 1, 'AAA has one named holder');
  assert.match(text(seats[0]), /40\.00%/);
  assert.match(text(seats[0]), /one/);
});

test('an owner is drawn above the companies, so pressing one selects the owner', () => {
  // The seats lived in the bridge layer, which is drawn first. Wherever a
  // seat landed over another company's ring, that ring's own hit circle was
  // on top and took the click: selecting an owner selected whatever company
  // happened to be behind them.
  const { svg } = draw({ focus: 'AAA' });
  const order = svg.children.map((g) => g.attrs.class);
  assert.ok(order.indexOf('om-seats') > order.indexOf('om-cos'),
            `the seat layer is under the companies: ${order.join(' < ')}`);
  // ...and every seat has to actually be IN it. Checking only the layer order
  // let a seat be drawn into the bridge layer and still pass.
  const layer = svg.children.find((g) => g.attrs.class === 'om-seats');
  assert.equal(nodesWithClass(layer, 'om-seat').length,
               nodesWithClass(svg, 'om-seat').length,
               'a seat was drawn outside the seat layer');
  assert.ok(nodesWithClass(layer, 'om-seat').length > 0, 'no seat was drawn');
  assert.ok(typeof nodesWithClass(layer, 'om-seat')[0].events.click === 'function',
            'the seat takes no click');

  // The same for the other direction: a HOLDER in focus has a seat too.
  const held = draw({ focus: 'one' }).svg;
  const heldLayer = held.children.find((g) => g.attrs.class === 'om-seats');
  assert.equal(nodesWithClass(heldLayer, 'om-seat').length,
               nodesWithClass(held, 'om-seat').length,
               'the owner\u2019s own seat was drawn outside the seat layer');
  assert.equal(nodesWithClass(heldLayer, 'om-seat').length, 1);
});

test('a company shows where its holders are ALSO invested', () => {
  // "Who is in this company" is half answered until you can see where else
  // they are. `one` holds AAA and CCC.
  const { svg } = draw({ focus: 'AAA' });
  const onward = nodesWithClass(svg, 'om-bridge-onward');
  assert.equal(onward.length, 1);
  assert.equal(onward[0].attrs['data-to'], 'CCC');
});

test('a company whose holder moved this week draws that line as a change', () => {
  const { svg } = draw({
    focus: 'AAA',
    moves: new Map([[OM.keyOf('one', 'AAA'), { holder: 'one', ticker: 'AAA', change: -2.4 }]]),
  });
  const inbound = nodesWithClass(svg, 'om-bridge')
    .filter((l) => l.attrs['data-to'] === 'AAA');
  assert.equal(inbound.length, 1);
  assert.equal(inbound[0].attrs.stroke, 'var(--down)');
  assert.ok(inbound[0].attrs['stroke-dasharray']);
});

test('nothing is named on the board until something is focused', () => {
  assert.equal(nodesWithClass(draw().svg, 'om-pin').length, 0);
});

test('a caption is trimmed even when the board has not been mounted yet', () => {
  // A detached SVG element reports a text length of zero, and the board is
  // built before it is put on the page. Believing that zero left every sector
  // caption at full length inside a cell too narrow to hold it.
  const detached = document.createElementNS('', 'text');
  detached.getComputedTextLength = () => 0;
  OM.fitText(detached, 'SHIPPING & TRANSPORTATION SERVICES', 80, false);
  assert.ok(detached.textContent.length < 'SHIPPING & TRANSPORTATION SERVICES'.length,
            `left at full length: ${detached.textContent}`);
  assert.match(detached.textContent, /…$/);
});

test('a caption that fits is left alone', () => {
  const node = document.createElementNS('', 'text');
  OM.fitText(node, 'REAL ESTATE', 400, false);
  assert.equal(node.textContent, 'REAL ESTATE');
});

/* ── the holders themselves ──────────────────────────────────────────────── */

test('every standing holding gets a dot, at the company it belongs to', () => {
  const model = board(ROWS);
  const dots = OM.placeHolders(model, HOLDINGS);
  assert.equal(dots.length, HOLDINGS.length);
  dots.forEach((d) => {
    const n = model.nodes.get(d.ticker);
    const away = Math.hypot(d.x - n.x, d.y - n.y);
    assert.ok(away > n.r, `${d.holder}'s dot sits inside ${d.ticker}'s ring`);
  });
});

test('a holder in two companies gets a dot at each, and no dot for the pair', () => {
  const dots = OM.placeHolders(board(ROWS), HOLDINGS);
  const mine = dots.filter((d) => d.holder === 'one');
  assert.deepEqual(mine.map((d) => d.ticker).sort(), ['AAA', 'CCC']);
});

test('a holding read down to zero gets no dot', () => {
  const dots = OM.placeHolders(board(ROWS),
    [{ holder: 'gone', ticker: 'AAA', percent: 0 }]);
  assert.equal(dots.length, 0);
});

test('no two holder names are drawn on top of each other', () => {
  // Crowded on purpose. Five holders across five companies never collide, so
  // a board that size proves nothing about the rule that stops them.
  const rows = Array.from({ length: 30 }, (_, i) => ({
    ticker: `T${i}`, name: `Company ${i}`, sector: `S${i % 6}`, cap: 1e9, disclosed: 24,
  }));
  const holdings = rows.flatMap((r, i) => [0, 1, 2, 3].map((k) => ({
    holder: `Sharikat Al Istithmarat Al Maliyyah ${i}-${k}`, ticker: r.ticker, percent: 6,
  })));
  const svg = document.createElementNS('', 'svg');
  OM.renderMap(svg, board(rows), {
    holdings, bridges: [], moves: null, labelOf: (id) => id,
    onPick: () => {}, focus: null, t: (en) => en, ar: false,
  });
  const boxes = nodesWithClass(svg, 'om-dot-name').map((g) => {
    const t = g.children[0];
    const w = t.text.length * 4.6;
    return { x: +t.attrs.x - w / 2, y: +t.attrs.y - 8, w, h: 9.5, t: t.text };
  });
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const a = boxes[i]; const b = boxes[j];
      assert.ok(!(a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h),
                `"${a.t}" and "${b.t}" overlap`);
    }
  }
});

test('no holder is named on the resting board', () => {
  // Naming whichever labels did not collide named nineteen of eight hundred
  // and seventy-six, and a reader cannot tell why those nineteen. A ranking
  // of named parties is not something this project publishes, and one
  // produced by geometry is still one.
  const rows = Array.from({ length: 30 }, (_, i) => ({
    ticker: `T${i}`, name: `Company ${i}`, sector: `S${i % 6}`, cap: 1e9, disclosed: 24,
  }));
  const holdings = rows.flatMap((r, i) => [0, 1, 2, 3].map((k) => ({
    holder: `Holder ${i}-${k}`, ticker: r.ticker, percent: 6,
  })));
  const svg = document.createElementNS('', 'svg');
  OM.renderMap(svg, board(rows), {
    holdings, bridges: [], moves: null, labelOf: (id) => id,
    onPick: () => {}, focus: null, t: (en) => en, ar: false,
  });
  assert.equal(nodesWithClass(svg, 'om-dot').length, holdings.length,
               'every holding still has a dot');
  assert.equal(nodesWithClass(svg, 'om-dot-name').length, 0);
});

test('a dot carries its holder and stake for the pointer to find', () => {
  const { svg } = draw();
  const titles = nodesWithClass(svg, 'om-dot').map((g) => text(g));
  assert.ok(titles.some((x) => /one — 40\.00% of AAA/.test(x)),
            `no dot named its holder: ${titles.slice(0, 3).join(' | ')}`);
});

test('a pinned name is drawn, and only the pinned one', () => {
  const { svg } = draw({ named: { holder: 'two', ticker: 'BBB' } });
  const shown = nodesWithClass(svg, 'om-hover');
  assert.equal(shown.length, 1);
  assert.equal(shown[0].attrs.visibility, 'visible');
  assert.match(text(shown[0]), /12\.00%\s+two/);
});

test('nothing is pinned unless it was asked for', () => {
  const hover = nodesWithClass(draw().svg, 'om-hover');
  assert.equal(hover.length, 1, 'the label exists, built once');
  assert.equal(hover[0].attrs.visibility, 'hidden');
});

test('the focused holder tags each company with the stake they hold of it', () => {
  // A curve says two companies are connected. It does not say who holds whom,
  // or how much, which is the whole question.
  const { svg } = draw({ focus: 'one' });
  const tags = nodesWithClass(svg, 'om-stake-tag');
  assert.equal(tags.length, 2, 'one holder, two holdings, two tags');
  const said = tags.map((g) => text(g)).join(' ');
  assert.match(said, /40\.00%/);
  assert.match(said, /60\.00%/);
  assert.match(said, /holds 40% of AAA/);
});

test('a stake too small to round is said to be small, not said to be zero', () => {
  const { svg } = draw({
    holdings: [{ holder: 'one', ticker: 'AAA', percent: 0.003, asOf: '2026-08-16' }],
    focus: 'one',
  });
  assert.match(text(nodesWithClass(svg, 'om-stake-tag')[0]), /<0\.01%/);
});

test('nothing is tagged until a holder is in focus', () => {
  assert.equal(nodesWithClass(draw().svg, 'om-stake-tag').length, 0);
});

test('a holder colour follows the name, not its place in a sorted list', () => {
  assert.equal(OM.hueOf('محمد اشرف عمر عمر'), OM.hueOf('محمد اشرف عمر عمر'));
  assert.match(OM.hueOf('anything'), /^var\(--own[1-6]\)$/);
});


/* ── the panel around it ─────────────────────────────────────────────────── */

function panel(lang = 'en') {
  const c = new Component({});
  Object.assign(c.state, { lang, screen: 'ownership' });
  c.setData({
    demo: false, series: [], fins: [],
    companies: [{ ticker: 'AAA', cap: 2e10, sector: 'Banks', sectorAr: 'بنوك',
                  name: { en: 'Alpha', ar: 'ألفا' } }],
    flowTrackers: { schemaVersion: 1, sectors: [], events: [], asOf: '2026-09-10' },
    insiderPeople: published,
  });
  return flowTrackers(c, c.data(), lang === 'ar').screen;
}

test('the grey remainder is never described as free float', () => {
  const out = text(panel());
  assert.match(out, /not free float/);
  assert.doesNotMatch(out, /free float is|available to trade/);
});

test('the panel says a stake belongs to one company and is not added up', () => {
  assert.match(text(panel()), /percentage of ONE company/);
});

test('the standing headline counts the companies that carry a stake, not the rings', () => {
  // Three rings are on the board only because a named holder has since sold
  // out of them; counting them as companies with a standing stake would state
  // a holding that nobody has.
  const withStake = new Set(OM.standing(published).map((p) => p.ticker)).size;
  const rings = new Set(published.positions.map((p) => p.ticker)).size;
  const out = text(panel());
  assert.match(out, new RegExp(`standing stakes across ${withStake} companies`));
  assert.match(out, new RegExp(`${rings - withStake} more a named holder has left`));
});

test('one formatter decides what a stake reads as', () => {
  // It was three: the tag on the board said `<0.01%`, the dot's own tooltip
  // said `0.00%`, and the panel beside them said `0.00%` — about the same
  // three thousandths of a company.
  assert.equal(OM.stakeText(0.003), '<0.01%');
  assert.equal(OM.stakeText(0.0099), '<0.01%');
  assert.equal(OM.stakeText(0.01), '0.01%');
  assert.equal(OM.stakeText(40), '40.00%');
  // A holding that really is gone is zero, and says so. "Sold out" and "too
  // small to round" are different facts.
  assert.equal(OM.stakeText(0), '0.00%');
});

test('a holding too small to round reaches the screen as such', () => {
  const tiny = published.positions.filter((p) => p.percent > 0 && p.percent < 0.01);
  assert.ok(tiny.length > 0, 'the published file has no sub-hundredth stake to check');
  const out = text(panel());
  assert.match(out, /<0\.01%/, 'nothing on the screen used the small-stake form');
});

test('the panel offers a standing view alongside the weeks', () => {
  const chips = nodesWithClass(panel(), 'om-period');
  assert.equal(chips.length, published.periods.length + 1);
  assert.match(text(chips[0]), /Standing/);
});

test('the Arabic panel reads in Arabic', () => {
  assert.match(text(panel('ar')), /ليس أسهماً حرة/);
});

test('the panel draws a ring for every company a form has named a holder in', () => {
  const named = new Set(published.positions.map((p) => p.ticker));
  assert.equal(nodesWithClass(panel(), 'om-co').length, named.size);
});

test('a company whose only named holder has sold out keeps an empty ring', () => {
  // Dropping it would say nobody ever disclosed a stake there, and would take
  // with it the week in which they left — the week a reader most wants.
  const exited = new Set(published.positions.filter((p) => !p.percent).map((p) => p.ticker));
  const live = new Set(OM.standing(published).map((p) => p.ticker));
  const gone = [...exited].filter((t) => !live.has(t));
  assert.ok(gone.length > 0, 'the published file has no fully exited company to check');
  const drawn = new Set(nodesWithClass(panel(), 'om-co').map((n) => n.attrs['data-id']));
  gone.forEach((t) => assert.ok(drawn.has(t), `${t} was dropped from the board`));
});

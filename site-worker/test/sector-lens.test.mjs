/* The sector lens publishes three claims about the exchange, and each one has
 * a way of going wrong that does not look wrong on screen.
 *
 * A month of turnover compared with a month the archive only half covers reads
 * as money arriving. A list of sectors cut at five and ordered by momentum is a
 * recommendation whatever the caption says. And a stake percentage added across
 * two companies is a number that means nothing at all. All three are asserted.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { installDom } from './dom-stub.mjs';
installDom();
Node.prototype.addEventListener = function (name, fn) { (this.events ||= {})[name] = fn; };

const SL = await import('../../public/esthmr/sector-lens.js');
const { flowTrackers } = await import('../../public/esthmr/flow-trackers.js');
const { Component } = await import('../../public/esthmr/logic.js');

const file = (path) => readFile(new URL('../../' + path, import.meta.url), 'utf8');
const published = JSON.parse(await file('public/data/v1/flow-trackers.json'));
const owned = JSON.parse(await file('public/data/v1/sector-ownership.json'));
const stylesheet = await file('public/esthmr/flow-trackers.css');

const text = (node) => [node?.text || '', ...(node?.children || []).map(text)].join(' ');
const all = (node, tag) => [
  ...(node?.tag === tag ? [node] : []),
  ...(node?.children || []).flatMap((n) => all(n, tag)),
];
function withClass(node, name) {
  const hit = String(node?.attrs?.class || '').split(/\s+/).includes(name) ? [node] : [];
  return [...hit, ...(node?.children || []).flatMap((n) => withClass(n, name))];
}

function screen(state = {}, lang = 'en') {
  const c = new Component({});
  Object.assign(c.state, { lang, screen: 'liquidity' }, state);
  c.setData({
    demo: false, companies: [], series: [], fins: [],
    flowTrackers: published, sectorOwnership: owned,
  });
  return flowTrackers(c, c.data(), lang === 'ar').screen;
}

// Deliberately arranged so the alphabet and the size of the shift disagree:
// Real Estate moves furthest, Banks comes first. A list that quietly reordered
// itself by movement would pass a fixture where the two agree.
const SECTORS = [
  { id: 'Banks', name: 'Banks', nameAr: 'بنوك', months: [
    { month: '2026-07', value: 30 }, { month: '2026-08', value: 25 }] },
  { id: 'Real Estate', name: 'Real Estate', nameAr: 'عقارات', months: [
    { month: '2026-07', value: 50 }, { month: '2026-08', value: 75 }] },
  { id: 'Textiles', name: 'Textiles', nameAr: 'نسيج', months: [
    { month: '2026-07', value: 20 }, { month: '2026-08', value: 0 }] },
];
const MONTHLY = { months: [
  { month: '2026-07', value: 100, sessions: 21, companies: 200, coverage: 90, partial: false },
  { month: '2026-08', value: 100, sessions: 10, companies: 200, coverage: 90, partial: true },
] };

test('a month the archive only half covers is drawn as uncomparable', () => {
  // 2026-08 holds ten sessions against July's twenty-one. Drawn identically,
  // a half month reads as the market halving.
  const rows = SL.monthRows(MONTHLY, SECTORS[0]);
  assert.equal(rows[1].partial, true);
  const svg = SL.monthsChart(MONTHLY, SECTORS[0], {
    ar: false, t: (en) => en, month: '2026-08', onPick: () => {},
  });
  const cols = withClass(svg, 'sl-col');
  assert.equal(cols.length, 2);
  const fills = cols.map((c) => all(c, 'rect')[0].attrs.fill);
  assert.equal(fills[0], 'var(--own-cell)');
  assert.match(fills[1], /url\(#sl-partial\)/);
  // And the hatch it points at exists, rather than resolving to nothing.
  assert.equal(all(svg, 'pattern').filter((p) => p.attrs.id === 'sl-partial').length, 1);
});

test('a sector never draws more of a month than the whole month held', () => {
  const rows = SL.monthRows(MONTHLY, SECTORS[1]);
  rows.forEach((r) => {
    assert.ok(r.part <= r.value, `${r.month}: ${r.part} of ${r.value}`);
    assert.ok(r.share >= 0 && r.share <= 100);
  });
  assert.equal(rows[1].share, 75);
});

test('a month with no figure for the chosen sector is a gap, not a zero', () => {
  const rows = SL.monthRows(MONTHLY, { id: 'Food', months: [] });
  rows.forEach((r) => {
    assert.equal(r.part, null);
    assert.equal(r.share, null);
  });
});

test('rotation lists every sector, in alphabetical order, ranked by nothing', () => {
  // The test that decides whether a list of named things is a leaderboard is
  // who fixes the cardinality. Here it is the market: every sector with a
  // figure in either month, and the order is the alphabet's.
  const { rows } = SL.rotation(MONTHLY, SECTORS, '2026-08', false);
  assert.equal(rows.length, SECTORS.length);
  assert.deepEqual(rows.map((r) => r.id), ['Banks', 'Real Estate', 'Textiles']);
  const byShift = [...rows].sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
  assert.equal(byShift[0].id, 'Real Estate');   // …and it is not drawn first
  assert.equal(rows[0].change, -5);             // 30% of July to 25% of August
  assert.equal(rows[1].change, 25);
  assert.equal(rows[2].change, -20);
});

test('rotation on the published file covers every sector that traded', () => {
  const { rows, now } = SL.rotation(published.monthly, published.sectors, null, false);
  const traded = published.sectors.filter((s) => (s.months || [])
    .some((m) => m.month === now.month && m.value > 0));
  assert.ok(traded.length > 5);
  const listed = new Set(rows.map((r) => r.id));
  traded.forEach((s) => assert.ok(listed.has(s.id), `${s.id} was left out`));
});

test('the rotation block refuses to name a next sector, and says it will not', () => {
  const out = text(screen());
  assert.match(out, /nothing here says which sector is next/i);
  assert.match(out, /not licensed by the Financial Regulatory Authority/i);
  // Never the shape of a forecast — but a sentence carrying its own negation
  // is the disclaimer, not the thing disclaimed, so those are set aside first.
  // Matched without the carve-out, this very refusal fails the test.
  const claims = out.split(/(?<=[.:;])\s+/)
    .filter((line) => !/\b(no|not|never|nothing|neither|refus\w*)\b/i.test(line));
  assert.ok(claims.length > 4, 'the carve-out set aside the whole block');
  claims.forEach((line) => assert.doesNotMatch(
    line, /\b(predict\w*|forecast\w*|will lead|expected to|due to rise|next sector is)\b/i,
    line));
});

test('the Arabic rotation block carries the same refusal', () => {
  const out = text(screen({}, 'ar'));
  assert.match(out, /لا شيء هنا يقول أي قطاع هو التالي/);
  assert.match(out, /غير مرخّص من الهيئة العامة للرقابة المالية/);
});

test('the ownership ring draws every filed pair and both of its ends', () => {
  const model = SL.ringLayout(owned);
  assert.equal(model.links.length, owned.flows.length);
  const ids = new Set(model.nodes.map((n) => n.id));
  owned.flows.forEach((f) => {
    assert.ok(ids.has(f.fromSector), f.fromSector);
    assert.ok(ids.has(f.toSector), f.toSector);
  });
  model.links.forEach((l) => {
    assert.doesNotMatch(l.d, /NaN|Infinity/);
    assert.equal(l.self, l.fromSector === l.toSector);
  });
  // A sector that owns itself is a loop that returns to its own node, not a
  // line to a neighbour.
  const loops = model.links.filter((l) => l.self);
  assert.ok(loops.length > 0, 'the published file has no self-owning sector to check');
  loops.forEach((l) => {
    const [, x, y] = l.d.match(/^M (\S+) (\S+)/);
    assert.ok(l.d.trimEnd().endsWith(`${x} ${y}`), l.d);
  });
});

test('a heavier stake is drawn heavier, and a stake with no size still draws', () => {
  const doc = { flows: [
    { fromSector: 'A', toSector: 'B', links: 1, value: 1e9 },
    { fromSector: 'A', toSector: 'C', links: 1, value: 1e6 },
    { fromSector: 'A', toSector: 'D', links: 1, value: null },
  ] };
  const [big, small, none] = SL.ringLayout(doc).links;
  assert.ok(big.weight > small.weight);
  assert.ok(none.weight >= 1);
  assert.doesNotMatch(none.d, /NaN/);
});

test('no percentage is ever summed across two companies', () => {
  // The board's rule, kept here: a sector pair carries money and a count of
  // filings. A percentage total would be a number that means nothing.
  owned.flows.forEach((flow) => {
    Object.keys(flow).forEach((key) => assert.doesNotMatch(key, /percent/i));
  });
  const out = text(withClass(screen(), 'sl-links')[0]);
  const percents = out.match(/\d+\.\d+%/g) || [];
  const filed = new Set(owned.links.map((l) => `${l.percent.toFixed(2)}%`));
  percents.forEach((p) => assert.ok(filed.has(p), `${p} is on no filed form`));
});

test('the liquidity screen draws all three blocks with the published files', () => {
  for (const lang of ['en', 'ar']) {
    const view = screen({}, lang);
    const out = text(view);
    assert.doesNotMatch(out, /NaN|undefined|Infinity/);
    assert.ok(withClass(view, 'sl-months').length, `${lang}: no months chart`);
    assert.ok(withClass(view, 'sl-rotation').length, `${lang}: no rotation list`);
    assert.ok(withClass(view, 'sl-ring').length, `${lang}: no ownership ring`);
    all(view, 'path').forEach((p) => assert.doesNotMatch(p.attrs.d || '', /NaN|Infinity/));
  }
});

test('the screen still draws when the ownership file never arrives', () => {
  const c = new Component({});
  Object.assign(c.state, { lang: 'en', screen: 'liquidity' });
  c.setData({ demo: false, companies: [], series: [], fins: [], flowTrackers: published });
  const view = flowTrackers(c, c.data(), false).screen;
  assert.ok(withClass(view, 'sl-months').length);
  assert.equal(withClass(view, 'sl-ring').length, 0);
  assert.doesNotMatch(text(view), /NaN|undefined/);
});

test('picking a month moves the chart and the rotation with it', () => {
  const c = new Component({});
  Object.assign(c.state, { lang: 'en', screen: 'liquidity' });
  c.setData({ demo: false, companies: [], series: [], fins: [], flowTrackers: published,
              sectorOwnership: owned });
  const view = flowTrackers(c, c.data(), false).screen;
  const cols = withClass(view, 'sl-col');
  assert.ok(cols.length > 3);
  const earlier = published.monthly.months[1].month;
  cols.find((col) => text(col).includes(earlier.slice(0, 4)) || true);
  const target = cols[1];
  target.events.click();
  assert.equal(c.state.flowMonth, published.monthly.months[1].month);
  const again = flowTrackers(c, c.data(), false).screen;
  const badge = withClass(again, 'ft-range-badge').map(text).join(' ');
  assert.match(badge, new RegExp(published.monthly.months[1].month));
});

test('a sector can be drawn on its own scale without leaving the market behind', () => {
  // Against the whole exchange a sector worth a tenth of it is a tenth of a
  // column — true, and unreadable. The toggle exists so both readings are
  // available; neither may quietly become the other.
  const market = SL.monthsChart(MONTHLY, SECTORS[0], {
    ar: false, t: (en) => en, month: '2026-08', mode: 'market', onPick: () => {},
  });
  const alone = SL.monthsChart(MONTHLY, SECTORS[0], {
    ar: false, t: (en) => en, month: '2026-08', mode: 'sector', onPick: () => {},
  });
  const rects = (svg) => withClass(svg, 'sl-col').map((c) => all(c, 'rect').length);
  // Two rects a column in the market view: the month, and the sector's part.
  assert.deepEqual(rects(market), [2, 2]);
  // One in the sector view — the sector IS the column, so a part of itself
  // drawn on top of it would be the same bar twice.
  assert.deepEqual(rects(alone), [1, 1]);
  const height = (svg, i) => Number(withClass(svg, 'sl-col')[i]
    .children.find((n) => n.tag === 'rect').attrs.height);
  // July is 30 of the market's 100 and August 25 of 100: on its own scale the
  // sector's July column is the taller one, which the market view cannot show.
  assert.ok(height(alone, 0) > height(alone, 1));
  assert.ok(height(market, 0) > height(market, 1) === false
            || Math.abs(height(market, 0) - height(market, 1)) < 1);
});

test('the scale toggle reaches the screen and moves', () => {
  const c = new Component({});
  Object.assign(c.state, { lang: 'en', screen: 'liquidity' });
  c.setData({ demo: false, companies: [], series: [], fins: [], flowTrackers: published,
              sectorOwnership: owned });
  const view = flowTrackers(c, c.data(), false).screen;
  const pills = withClass(view, 'sl-scale')[0];
  assert.ok(pills, 'no scale control on the months chart');
  const buttons = all(pills, 'button');
  assert.equal(buttons.length, 2);
  buttons[1].events.click();
  assert.equal(c.state.flowMonthView, 'sector');
  const again = flowTrackers(c, c.data(), false).screen;
  assert.equal(withClass(withClass(again, 'sl-months')[0], 'sl-col')[0]
    .children.filter((n) => n.tag === 'rect').length, 1);
});

test('the month a reader picks keeps its colour', () => {
  // Selection used to be drawn as a fill, and a fill in the stylesheet beats
  // the column's own: picking a month emptied it.
  const css = stylesheet;
  assert.doesNotMatch(css, /\.sl-col[^{]*(hover|-on)[^{]*\{[^}]*\bfill\s*:/,
    'the selected or hovered column is given a fill, which overrides its own');
  assert.match(css, /\.sl-col-on rect \{[^}]*stroke:/);
});

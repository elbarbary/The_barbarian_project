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
const rotation = JSON.parse(await file('public/data/v1/sector-rotation.json'));
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
    flowTrackers: published, sectorOwnership: owned, sectorRotation: rotation,
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

test('a month the archive only half covers is marked uncomparable', () => {
  // 2026-08 holds ten sessions against July's twenty-one. Counted identically,
  // a half month reads as the market halving. The chart that drew this with a
  // hatch is gone; the flag it drew is still what logic.js reads.
  const rows = SL.monthRows(MONTHLY, SECTORS[0]);
  assert.equal(rows[1].partial, true);
  assert.equal(rows[0].partial, false);
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
    assert.ok(withClass(view, 'sl-heat').length, `${lang}: no trading-share grid`);
    assert.ok(withClass(view, 'sl-rotation').length, `${lang}: no rotation list`);
    assert.ok(withClass(view, 'sl-ring').length, `${lang}: no ownership ring`);
    all(view, 'path').forEach((p) => assert.doesNotMatch(p.attrs.d || '', /NaN|Infinity/));
  }
});

test('the screen still draws when the ownership file never arrives', () => {
  const c = new Component({});
  Object.assign(c.state, { lang: 'en', screen: 'liquidity' });
  c.setData({ demo: false, companies: [], series: [], fins: [], flowTrackers: published,
              sectorRotation: rotation });
  const view = flowTrackers(c, c.data(), false).screen;
  assert.ok(withClass(view, 'sl-heat').length);
  assert.equal(withClass(view, 'sl-ring').length, 0);
  assert.doesNotMatch(text(view), /NaN|undefined/);
});


/* Changes in trading share — what replaced the months chart.
 *
 * The reader who commissioned the screen could not read the old one. These
 * hold the three things that made it unreadable from coming back: a mark whose
 * meaning changes between views, colour as the only carrier of a value, and a
 * shape that implies a transfer between two sectors the record cannot evidence.
 */

test('the grid shows change in share, not how busy the market was', () => {
  // The old chart's fault: a bar mixed "the whole market was busier" with
  // "this sector took a bigger slice", and no reader can separate them.
  const view = screen();
  const grid = withClass(view, 'sl-heat')[0];
  assert.ok(grid, 'no trading-share grid');
  const cells = withClass(grid, 'sl-heat-cell').map((c) => text(c).trim());
  assert.ok(cells.length > 10, `only ${cells.length} cells`);
  // Every cell is a signed point figure or the quiet marker — never EGP.
  cells.forEach((c) => assert.match(c, /^([+-]\d+\.\d|·)$/, `cell reads "${c}"`));
  assert.doesNotMatch(text(grid), /EGP|جنيه/);
});

test('the number is the reading and the colour only agrees with it', () => {
  // Colour as the sole carrier fails for a colour-blind reader and in print.
  const grid = withClass(screen(), 'sl-heat')[0];
  const styleOf = (n) => {
    const s = n.attrs?.style;
    return typeof s === 'string' ? s : JSON.stringify(s || '');
  };
  const inked = withClass(grid, 'sl-heat-cell')
    .filter((c) => /--(up|down)\b/.test(styleOf(c)));
  assert.ok(inked.length, 'nothing is inked at all');
  inked.forEach((c) => {
    const shown = text(c).trim();
    assert.match(shown, /^[+-]\d/, 'an inked cell with no number in it');
    const up = /--up\b/.test(styleOf(c));
    assert.equal(shown.startsWith('+'), up, `${shown} inked the wrong way`);
  });
});

test('the sectors shown are a stated filter, never a ranking', () => {
  // §8: a filter that returns however many it returns is a filter. A list cut
  // to a rank makes the publisher the one choosing who is at the top.
  const grid = withClass(screen(), 'sl-heat')[0];
  const names = withClass(grid, 'sl-heat-side')
    .map((n) => text(n).trim()).filter((n) => n && n !== 'Sector');
  assert.deepEqual(names, [...names].sort(), 'the grid is ordered by size');
  assert.match(text(grid), /moved at least/);
  assert.match(text(grid), /stayed inside it/);
});

test('no arrow, flow or pair between two sectors is drawn', () => {
  // Tested and refused: the strongest lead-lag pair in the record is the
  // median of shuffled noise. See build_sector_rotation.py.
  const view = screen();
  const out = text(view);
  assert.match(out, /No arrow, flow or pair between sectors is published/);
  assert.doesNotMatch(out, /moved from .* to .*sector/i);
});

test('the base rate names its cases and the halves of the record', () => {
  const out = text(screen());
  const rate = out.match(/in (\d+) of (\d+) cases/);
  assert.ok(rate, 'the headline frequency states no case count');
  assert.ok(Number(rate[2]) >= 30, `a rate over only ${rate[2]} cases`);
  assert.match(out, /Split in half so a reader can see whether it held/);
});

test('picking a sector row lists the months behind its own record', () => {
  const c = new Component({});
  Object.assign(c.state, { lang: 'en', screen: 'liquidity' });
  c.setData({ demo: false, companies: [], series: [], fins: [], flowTrackers: published,
              sectorOwnership: owned, sectorRotation: rotation });
  const view = flowTrackers(c, c.data(), false).screen;
  const rows = withClass(view, 'sl-heat-row');
  assert.ok(rows.length, 'no rows to pick');
  rows[0].events.click();
  assert.ok(c.state.flowShareSector, 'picking a row selected nothing');
  const again = flowTrackers(c, c.data(), false).screen;
  const panel = withClass(again, 'sl-followed')[0];
  assert.ok(panel, 'no record panel for the picked sector');
  const cases = withClass(panel, 'sl-cases');
  const said = text(panel);
  // Either it lists the cases, or it says there are too few to rate — never a
  // percentage with nothing behind it.
  assert.ok(cases.length || /too few|has not gained/.test(said), said.slice(0, 120));
});

test('a rate is never quoted over a single month', () => {
  const thin = { ...rotation, followed: { ...rotation.followed,
    Probe: { qualify: 2, count: 1, gaveBack: 1, share: null,
             cases: [{ month: '2024-02', rose: 3, next: '2024-03', then: -2 }] } } };
  const panel = SL.followedPanel(thin, 'Probe', { ar: false, t: (en) => en });
  const said = text(panel);
  assert.match(said, /too few to put a rate on/);
  assert.doesNotMatch(said, /100%/);
});

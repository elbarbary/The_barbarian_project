/* A screen built to be used, held to what it can evidence.
 *
 * The three ways this stops being honest: a bar that reads as the size of a
 * move rather than how unusual it was, a list of named companies that ranks
 * them, and language that tells a reader what to do about any of it.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { installDom } from './dom-stub.mjs';
installDom();
Node.prototype.addEventListener = function (name, fn) { (this.events ||= {})[name] = fn; };

const WM = await import('../../public/esthmr/world-monitor.js');
const { flowTrackers } = await import('../../public/esthmr/flow-trackers.js');
const { Component } = await import('../../public/esthmr/logic.js');
const { readRoute, routeKey } = await import('../../public/esthmr/navigation.js');

const file = (path) => readFile(new URL('../../' + path, import.meta.url), 'utf8');
const published = JSON.parse(await file('public/data/v1/world-monitor.json'));

const text = (node) => [node?.text || '', ...(node?.children || []).map(text)].join(' ');
const all = (node, tag) => [
  ...(node?.tag === tag ? [node] : []),
  ...(node?.children || []).flatMap((n) => all(n, tag)),
];
function withClass(node, name) {
  const hit = String(node?.attrs?.class || '').split(/\s+/).includes(name) ? [node] : [];
  return [...hit, ...(node?.children || []).flatMap((n) => withClass(n, name))];
}

function screen(state = {}, lang = 'en', doc = published) {
  const c = new Component({});
  Object.assign(c.state, { lang, screen: 'world' }, state);
  c.setData({ demo: false, companies: [], series: [], fins: [], worldMonitor: doc });
  screen.reader = c;
  return flowTrackers(c, c.data(), lang === 'ar').screen;
}

test('the world monitor survives a refresh and the Back button', () => {
  assert.equal(readRoute('?' + routeKey({ screen: 'world' })).screen, 'world');
});

test('every world series and the exchange are drawn the same way', () => {
  const view = screen();
  const moves = withClass(view, 'wm-move');
  assert.equal(moves.length, published.world.length + published.exchange.length);
  assert.doesNotMatch(text(view), /NaN|undefined|Infinity/);
});

test('the bar is how unusual a move was, never how big', () => {
  // Oil rose 8.6% this week and the EGX 30 moved 0.02%. Drawn by size, oil's
  // bar is four hundred times the exchange's; drawn by how unusual, oil is at
  // the 87th percentile of its own weeks and the EGX 30 at the 1st — which is
  // the fact a reader came for.
  const view = screen();
  const bars = withClass(view, 'wm-move-bar');
  const widths = bars.map((b) => {
    const inner = b.children.find((n) => n.tag === 'i');
    return Number(String(inner?.attrs?.style || '').match(/width:\s*([\d.]+)%/)?.[1]);
  });
  assert.ok(widths.every((w) => Number.isFinite(w) && w >= 0 && w <= 100), widths.join(','));
  const rows = [...published.world, ...published.exchange];
  rows.forEach((row, i) => {
    const against = (row.moves.week || {}).against;
    if (!against) return;
    assert.ok(Math.abs(widths[i] - Math.max(2, Math.min(100, against.percentile))) < 0.6,
              `${row.label}: bar ${widths[i]} against percentile ${against.percentile}`);
  });
});

test('a move with no history behind it says so instead of drawing a bar of nothing', () => {
  const t = (en) => en;
  assert.match(WM.remark(null, t), /not enough history/);
  assert.match(WM.remark({ percentile: 87.3, typical: 3.17 }, t), /87% of them/);
  assert.match(WM.remark({ percentile: 87.3, typical: 3.17 }, t), /typical one is 3.17%/);
});

test('every company list is complete and alphabetical, and ranks nobody', () => {
  // Asserted on what the SCREEN draws, not on what the document holds. A first
  // version of this test read the published file and a screen that reordered
  // its rows by size of exposure passed it without a murmur.
  const view = screen();
  const panels = withClass(view, 'wm-channel');
  assert.equal(panels.length, published.channels.length);
  panels.forEach((panel, i) => {
    const channel = published.channels[i];
    const drawn = withClass(panel, 'wm-row').map(
      (row) => text(withClass(row, 'wm-row-who')[0].children
        .find((n) => n.tag === 'strong')).trim());
    assert.equal(drawn.length, channel.count, channel.id);
    assert.deepEqual(drawn, [...drawn].sort(),
                     `${channel.id} is drawn in some order other than the alphabet`);
    assert.deepEqual(drawn, channel.companies.map((c) => c.ticker), channel.id);
    // And the screen says the count out loud, so a reader knows it is all of them.
    assert.match(text(panel), new RegExp(`All ${channel.count}`));
  });
});

test('searching a channel narrows it without reordering it', () => {
  const view = screen();
  const rates = published.channels.find((c) => c.id === 'rates');
  const box = all(view, 'input').find((n) => n.attrs.placeholder?.includes('company'));
  assert.ok(box, 'no search box on a channel');
  const wanted = rates.companies[3].ticker;
  box.events.input({ target: { value: wanted } });
  const again = flowTrackers(screen.reader, screen.reader.data(), false).screen;
  // Inside THAT channel's panel — the other one is not searched and still
  // holds all of its companies.
  const panel = withClass(again, 'wm-channel')[0];
  const shown = withClass(panel, 'wm-row').map((r) => text(r));
  assert.ok(shown.length >= 1 && shown.length < rates.count,
            `${shown.length} shown of ${rates.count}`);
  assert.ok(shown.some((row) => row.includes(wanted)));
  const other = withClass(again, 'wm-channel')[1];
  assert.equal(withClass(other, 'wm-row').length,
               published.channels[1].count, 'searching one channel filtered the other');
});

test('a company whose two filed numbers disagree is told on', () => {
  // HDBK filed 165.9m of borrowings against 3,171m of finance cost. Shown
  // without a mark, a reader judging rate exposure is reading one of two
  // numbers that do not describe each other.
  const odd = published.channels.flatMap((c) => c.companies)
    .filter((c) => c.costExceedsBorrowings);
  assert.ok(odd.length > 0, 'the published file has no contradiction to check');
  const out = text(screen());
  assert.match(out, /finile|finance cost larger than the borrowings/);
});

test('nothing on the screen tells a reader what to do', () => {
  const out = text(screen());
  const claims = out.split(/(?<=[.:;])\s+/)
    .filter((line) => !/\b(no|not|never|nothing|neither)\b/i.test(line));
  claims.forEach((line) => assert.doesNotMatch(
    line, /\b(should|buy|sell|expect\w*|will rise|will fall|predict\w*|forecast\w*)\b/i, line));
  // And it says in as many words that it is not doing that.
  assert.match(out, /Nothing here says what a move means for a share price/);
});

test('the Arabic screen carries the same refusal', () => {
  assert.match(text(screen({}, 'ar')), /ولا شيء هنا يقول ماذا تعني أي حركة لسعر السهم/);
});

test('without the document the screen says so rather than drawing an empty one', () => {
  const c = new Component({});
  Object.assign(c.state, { lang: 'en', screen: 'world' });
  c.setData({ demo: false, companies: [], series: [], fins: [] });
  const view = flowTrackers(c, c.data(), false).screen;
  assert.match(text(view), /has not arrived/);
  assert.equal(withClass(view, 'wm-move').length, 0);
});

test('a figure filed in millions is not printed as thousands of millions', () => {
  // ADPC filed borrowings of 1,420 million. Formatted compactly and given an
  // "m", that reached the screen as "1.42Km" — one and a half thousand
  // million, written as if it were a typo.
  const out = text(screen());
  assert.doesNotMatch(out, /\d[KMB]m\b/, 'a compact figure still carries a stray unit');
  assert.match(out, /\d+(\.\d+)?[KMBT]? EGP/, 'no figure carries its currency');
});

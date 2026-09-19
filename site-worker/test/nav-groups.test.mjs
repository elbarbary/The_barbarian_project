/* §4: five destinations, and Explore's eleven in three named groups.
 *
 * "Explore exposes 11 subsection choices before its search/filter/table
 * experience. Feature names compete; users must choose an analysis technique
 * before seeing an answer."
 *
 * The rule this file exists to protect is not the grouping — that is taste —
 * but the promise made alongside it: NOTHING WAS REMOVED. Every screen the
 * site had is still reachable from the rail, every old deep link still
 * resolves, and `fragility` still leaves the app at its own URL. A
 * reorganisation that quietly drops a destination is indistinguishable, from
 * the outside, from one that hides it well.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { installDom } from './dom-stub.mjs';

installDom();
const ROOT = new URL('../../', import.meta.url);
const read = (p) => readFile(new URL(p, ROOT), 'utf8');
const { Component } = await import('../../public/esthmr/logic.js');
const logic = await read('public/esthmr/logic.js');

const LIVE = {
  demo: false,
  companies: [{ ticker: 'AAAA', name: { en: 'A', ar: 'أ' }, sector: 'Banks', close: 10, pct: 1.5, cap: 100, pe: 8, volume: 5, medianVolume: 2 }],
  series: [], fins: [], marketDate: '2026-09-17',
  generatedAt: '2026-09-18T16:38:17+00:00', dataVersion: 'x',
};
const vals = (screen, lang = 'en', ticker = '') => {
  const c = new Component({});
  c.setData(LIVE);
  Object.assign(c.state, { screen, lang, ticker });
  return c.renderVals();
};

test('there are exactly five destinations, with the review’s names', () => {
  const nav = vals('home').primaryNav;
  assert.deepEqual(nav.map((n) => n.label),
    ['Today', 'Stocks', 'Following', 'Updates', 'More']);
  assert.deepEqual(vals('home', 'ar').primaryNav.map((n) => n.label),
    ['اليوم', 'الأسهم', 'متابعتي', 'المستجدات', 'المزيد']);
});

test('every screen the site has is inside exactly one destination', () => {
  /* The failure this catches is a screen that exists, has a route and a
     renderer, and appears in no destination — reachable only by typing its
     URL. Read off the navigation table rather than listed here, so a screen
     added later is covered without anyone remembering to add it. */
  const table = logic.slice(logic.indexOf('const navDef = ['),
    logic.indexOf('const nav = navDef.map'));
  assert.ok(table.length > 400 && table.length < 4000,
    `the navigation table was not found (${table.length} chars) — this test would pass vacuously`);
  const navDef = [...table.matchAll(/^ {6}\['([a-z]+)',/gm)].map((m) => m[1]);
  assert.ok(navDef.length > 12, `only ${navDef.length} screens found in navDef`);
  const groups = vals('home').primaryNav;
  const placed = groups.flatMap((g) => g.screens);
  for (const id of new Set(navDef)) {
    assert.equal(placed.filter((p) => p === id).length, 1,
      `${id} is in ${placed.filter((p) => p === id).length} destinations, not 1`);
  }
});

test('the Stocks strip arrives in three named groups, not eleven equal buttons', () => {
  const v = vals('market');
  assert.deepEqual(v.secondaryGroups.map((g) => g.label), ['Companies', 'Sectors', 'Maps']);
  assert.deepEqual(vals('market', 'ar').secondaryGroups.map((g) => g.label),
    ['الشركات', 'القطاعات', 'خرائط']);
  // And the flat strip stands down, so the two never render together.
  assert.deepEqual(v.secondaryNav, []);
});

test('a destination with one screen shows no strip at all', () => {
  /* A selector with nothing to select. Following holds only the watchlist. */
  const v = vals('watchlist');
  assert.deepEqual(v.secondaryNav, []);
  assert.deepEqual(v.secondaryGroups, []);
});

test('the company entry appears only once a company is open', () => {
  assert.ok(!vals('market').secondaryGroups[0].items.some((i) => i.id === 'company'),
    'an empty company tab is offered');
  assert.ok(vals('company', 'en', 'AAAA').secondaryGroups[0].items.some((i) => i.id === 'company'),
    'the open company is not in the strip');
});

test('the crash-warning research still leaves the app at its own URL', () => {
  /* It is served separately and always has been; routing it through `go()`
     would give a reader a blank screen. */
  const more = vals('tools').secondaryNav.find((n) => n.id === 'fragility');
  assert.ok(more, 'the crash-warning research is unreachable');
  assert.match(String(more.go), /window\.location\.href = 'fragility'/);
});

test('opening a screen lights its own destination, not another', () => {
  for (const [screen, expected] of [
    ['home', 'Today'], ['market', 'Stocks'], ['heat', 'Stocks'], ['ownership', 'Stocks'],
    ['liquidity', 'Stocks'], ['watchlist', 'Following'], ['today', 'Updates'],
    ['calendar', 'Updates'], ['crossings', 'Updates'], ['tools', 'More'],
    ['scenarios', 'More'], ['world', 'More'], ['valuation', 'More'],
  ]) {
    const on = vals(screen).primaryNav.find((n) => n.current === 'page');
    assert.equal(on && on.label, expected, `${screen} lights ${on && on.label}`);
  }
});

test('`today` is defined once, under one name', () => {
  /* It had two entries with different labels — "News" and "الموجز" — so the
     screen carried whichever the lookup happened to reach. */
  assert.equal((logic.match(/^ {6}\['today',/gm) || []).length, 1);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { installDom } from './dom-stub.mjs';
installDom();

/* Every screen must render, in both languages, whatever arrived.
 *
 * `renderVals()` throwing does not degrade one card — it takes the page. The
 * screen stops repainting and every control goes dead, which reads to a
 * reader as a site that has stopped responding. That is what one shorthand
 * property did: the company screen's insider block returned `actionColor`
 * while the variable was `actColor`, and 89 of 284 company screens died, by
 * every route to them. Nothing in the suite rendered a screen, so a plain
 * ReferenceError reached production.
 *
 * The sweep below is the cheap guard that would have caught it on the first
 * company, and it covers the other half of the problem too: a screen that
 * works with every document present and throws when one loader failed.
 * `main.js` loads eleven documents independently and tolerates any of them
 * failing, so each one absent is a state real readers reach.
 */
const ROOT = new URL('../../', import.meta.url);
globalThis.fetch = async (url) => {
  const path = new URL('public' + String(url).replace(/^https?:\/\/[^/]+/, '').split('?')[0], ROOT);
  try { return new Response(await readFile(path), { status: 200 }); }
  catch { return new Response('', { status: 404 }); }
};
const data = await import('../../public/esthmr/data.js');
const { Component } = await import('../../public/esthmr/logic.js');

/** Every screen the router will route to, and the sub-states that change what
 *  each draws. A view mode is a screen for this purpose: the bug that prompted
 *  this was only reachable through one. */
const SCREENS = ['home', 'market', 'company', 'today', 'investors', 'heat', 'watchlist',
  'sectors', 'calendar', 'exchange', 'tools', 'research', 'crossings', 'pairs', 'valuation'];
const SUB = {
  investors: [{ investorTab: 'insiders', insiderViewMode: 'table' },
              { investorTab: 'insiders', insiderViewMode: 'map' },
              { investorTab: 'insiders', insiderViewMode: 'flow' },
              { investorTab: 'both' }],
  tools: [{ toolsTab: 'sim' }, { toolsTab: 'calc' }, { toolsTab: 'guide' }],
  today: [{ storyPeriod: 'today' }, { storyPeriod: 'month' }, { storyKind: 'filing' }],
  heat: [{ heat: 'ALL' }],
  market: [{ sort: 'cap' }],
};

/** The dataset main.js assembles: the live base, then eleven documents that
 *  each load on their own and are each allowed to fail. */
async function dataset() {
  const D = await data.live();
  const add = async (fn, map) => { try { Object.assign(D, map(await fn())); } catch { /* optional */ } };
  await Promise.all([
    add(data.insiders, (v) => ({ insiders: v })),
    add(data.investors, (v) => ({ investors: v })),
    add(data.sectors, (v) => ({ sectorCards: v })),
    add(data.news, (v) => ({ feed: v })),
    add(data.connections, (v) => ({ crossings: v })),
    add(data.disclosureMeanings, (v) => ({ disclosureMeanings: v })),
    add(data.filedMonths, (v) => ({ filedMonths: v })),
    add(data.newsProvenance, (v) => ({ newsProvenance: v })),
    add(data.calendar, (c) => ({ filedEvents: c.filed, expectedEvents: c.expected })),
    add(data.exchange, (e) => ({ rates: e.rates, seriesTo: e.seriesTo, macro: e.macro })),
    add(data.attention, (a) => ({ breadth: a.breadth })),
    add(data.indices, (i) => ({ indexMembers: i.list })),
  ]);
  return D;
}

/** Render every screen and sub-state in both languages. Returns what threw. */
function sweep(D) {
  const dead = [];
  for (const screen of SCREENS) {
    for (const sub of (SUB[screen] || [{}])) {
      for (const lang of ['ar', 'en']) {
        const c = new Component({});
        Object.assign(c.state, { lang, screen }, sub);
        if (screen === 'company') {
          c.state.ticker = (D.companies && D.companies[0] && D.companies[0].ticker) || 'COMI';
        }
        const where = `${screen}${Object.keys(sub).length ? ' ' + JSON.stringify(sub) : ''} [${lang}]`;
        try { c.setData(D); c.renderVals(); }
        catch (error) { dead.push(`${where}: ${error.constructor.name}: ${error.message}`); }
      }
    }
  }
  return dead;
}

const FULL = await dataset();

test('every screen renders on the published documents', () => {
  assert.ok(FULL.companies.length > 100, 'the directory is too small to be a real test');
  assert.deepEqual(sweep(FULL).slice(0, 5), [], 'a screen threw, which blanks the whole page');
});

test('every screen renders for a signed-out reader', () => {
  assert.deepEqual(sweep(data.demo()).slice(0, 5), [], 'a screen threw on the demo tree');
});

/* Each of these is loaded on its own by main.js and each is allowed to fail.
 * A screen that dies when one is missing takes the page down with it, so the
 * reader loses every OTHER screen too because one document timed out. */
const OPTIONAL = ['insiders', 'investors', 'sectorCards', 'feed', 'crossings',
  'disclosureMeanings', 'filedMonths', 'newsProvenance', 'filedEvents',
  'expectedEvents', 'rates', 'macro', 'breadth', 'indexMembers', 'indices'];

for (const missing of OPTIONAL) {
  test(`every screen renders when ${missing} failed to load`, () => {
    const D = { ...FULL };
    delete D[missing];
    assert.deepEqual(sweep(D).slice(0, 5), [],
      `a screen threw with ${missing} absent; one failed document must not blank the site`);
  });
}

test('every screen renders on the barest dataset live() can leave', () => {
  // What a caught error in main.js leaves behind: the directory and nothing else.
  assert.deepEqual(sweep({ demo: false, companies: FULL.companies, series: [], fins: [] }).slice(0, 5), []);
  assert.deepEqual(sweep({ demo: false, companies: [], series: [], fins: [] }).slice(0, 5), []);
});

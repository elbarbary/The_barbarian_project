import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { installDom } from './dom-stub.mjs';
installDom();

const ROOT = new URL('../../', import.meta.url);
globalThis.fetch = async (url) => {
  const path = new URL('public' + String(url).replace(/^https?:\/\/[^/]+/, '').split('?')[0], ROOT);
  try { return new Response(await readFile(path), { status: 200 }); }
  catch { return new Response('', { status: 404 }); }
};
const data = await import('../../public/esthmr/data.js');
const { Component } = await import('../../public/esthmr/logic.js');
const store = await import('../../public/esthmr/filings-store.js');

/* The Filings tab showed six documents.
 *
 * `companyExtras` sliced the recent feed to `.slice(0, 6)` while the
 * exchange's own archive for the same company sat beside it with a link on
 * every row: 704 documents for CIB, 1,140 for Heliopolis Housing, 325 for
 * Pioneers Properties. All of them were already published and none reachable.
 */
const settle = () => new Promise((r) => setTimeout(r, 400));

async function filings(ticker, state = {}) {
  const D = await data.live();
  D.insiders = await data.insiders();
  const c = new Component({});
  Object.assign(c.state, { lang: 'ar', screen: 'company', ticker, companyPanel: 'filings' }, state);
  c.setData(D);
  c.renderVals();          // starts the fetch
  await settle();
  return { view: c.renderVals(), component: c, D };
}

test('the tab lists every filing the archive holds, not six', async () => {
  const { view } = await filings('COMI');
  assert.ok(Number(String(view.filingsTotal).replace(/,/g, '')) > 500,
    `only ${view.filingsTotal} filings reached the tab`);
  assert.ok(view.hasFilingGroups, 'nothing was grouped');
  const total = view.filingGroups.reduce((n, g) => n + Number(String(g.count).replace(/,/g, '')), 0);
  assert.equal(total, Number(String(view.filingsTotal).replace(/,/g, '')),
    'the groups do not add up to the archive: a filing was dropped');
});

test('filings are separated by what they are', async () => {
  const { view } = await filings('COMI');
  const labels = view.filingGroups.map((g) => g.label);
  assert.ok(view.filingGroups.length >= 5, `only ${labels.length} groups: ${labels}`);
  // The two the owner named, by their own kind rather than lumped together.
  assert.ok(labels.some((l) => /القوائم المالية/.test(l)), `no statements group: ${labels}`);
  assert.ok(labels.some((l) => /الداخليين/.test(l)), `no insider group: ${labels}`);
  /* The exchange's own section names classify the rows the pipeline left
     untyped. "Ownership" is the proof: no row anywhere carries
     `event: 'ownership'`, so the group exists only because 21 of CIB's rows
     carry the section "Shareholding Structure". Drop the fallback and the
     whole group vanishes and its filings fall into "other" — which a share
     threshold alone was too loose to notice (26% became 40%, both under a
     half). */
  assert.ok(view.filingGroups.some((g) => g.id === 'ownership'),
    `the section fallback is gone: no ownership group in ${labels}`);
  const other = view.filingGroups.find((g) => g.id === 'other');
  const count = (g) => Number(String(g.count).replace(/,/g, ''));
  assert.ok(other && count(other) < Number(String(view.filingsTotal).replace(/,/g, '')) * 0.33,
    `${other ? count(other) : 0} filings fell into "other"; the section fallback is not classifying`);
});

test('a group shows ten and says how many more, until it is opened', async () => {
  const { view } = await filings('COMI');
  const big = view.filingGroups.find((g) => Number(String(g.count).replace(/,/g, '')) > 20);
  assert.ok(big, 'no group large enough to test the cut');
  assert.equal(big.rows.length, 10, 'a closed group is not showing ten');
  assert.equal(big.hasMore, true, 'a cut group does not admit there is more');
  assert.match(big.showAllLabel, /\d/, 'the "show all" label does not name the count');

  const opened = await filings('COMI', { companyFilingGroup: big.id });
  const same = opened.view.filingGroups.find((g) => g.id === big.id);
  assert.equal(same.isOpen, true);
  assert.ok(same.rows.length > 10, 'opening a group did not reveal the rest');
});

test('clicking a tile in the activity map lands on that company insider filings', async () => {
  const D = await data.live();
  D.insiders = await data.insiders();
  const c = new Component({});
  Object.assign(c.state, { lang: 'ar', screen: 'investors', investorTab: 'insiders', insiderViewMode: 'map' });
  c.setData(D);
  const known = new Set(D.companies.map((x) => x.ticker));
  const tile = c.renderVals().insiderTracker.mapTiles.find((t) => known.has(t.ticker));
  assert.ok(tile, 'the treemap drew no tile for a company in the directory');

  tile.openCompany();
  assert.equal(c.state.screen, 'company');
  assert.equal(c.state.companyPanel, 'filings',
    'the tile still lands on the price overview, not the filings');
  assert.equal(c.state.companyFilingGroup, 'insider',
    'the insider group is not the one opened');

  c.renderVals(); await settle();
  const v = c.renderVals();
  assert.equal(v.companyFilings, true, 'the filings panel is not the one drawn');
  const insider = v.filingGroups.find((g) => g.id === 'insider');
  if (insider) assert.equal(insider.isOpen, true, 'the insider group is drawn closed');
});

test('the archive is fetched only when the tab is opened', async () => {
  store.reset();
  const asked = [];
  const real = globalThis.fetch;
  globalThis.fetch = async (url) => { asked.push(String(url)); return real(url); };
  try {
    const D = await data.live();
    const c = new Component({});
    Object.assign(c.state, { lang: 'ar', screen: 'company', ticker: 'COMI' });
    c.setData(D);
    asked.length = 0;
    c.renderVals();
    assert.equal(asked.filter((u) => /documents\/COMI/.test(u)).length, 0,
      'the overview fetched the archive; it is a median 346 KB and most readers never open the tab');
    c.state.companyPanel = 'filings';
    c.renderVals();
    await settle();
    assert.ok(asked.some((u) => /documents\/COMI-all\.json/.test(u)),
      'opening the tab did not fetch the archive');
  } finally { globalThis.fetch = real; store.reset(); }
});

test('a company with no archive still lists what it has', async () => {
  // 35 companies have only the recent document and 5 have neither; an empty
  // tab would be a worse answer than the handful the feed carries.
  const { view } = await filings('ACFR');
  assert.ok(view.hasFilingGroups || view.noFilingArchive,
    'the tab neither listed filings nor said there were none');
  assert.equal(view.filingsLoading, false, 'the tab is stuck loading');
});

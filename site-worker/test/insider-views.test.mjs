import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { installDom } from './dom-stub.mjs';
installDom();
const { Component } = await import('../../public/esthmr/logic.js');

/* The two insider views on the investors screen: the activity treemap and the
 * sector flow. All three faults below were visible on real data.
 */
const rows = (over = []) => over.map((r, i) => ({
  id: `r${i}`, date: '2026-09-08', ticker: r.ticker, company: r.ticker, companyAr: r.ticker,
  sector: r.sector, sectorAr: r.sectorAr ?? '', action: r.action,
  actionLabel: r.action, actionLabelAr: r.action,
  relationship: r.relationship || 'insider', shares: r.shares, link: 'https://egx/x',
}));

function tracker(items, state = {}) {
  const c = new Component({});
  c.state.lang = 'ar'; c.state.screen = 'investors'; c.state.investorTab = 'insiders';
  c.state.insiderViewMode = 'flow';
  Object.assign(c.state, state);
  c.setData({ demo: false, companies: [], series: [], fins: [],
    insiders: { items, summary: {}, asOf: '2026-09-08' } });
  return c.renderVals().insiderTracker;
}

test('the sector flow describes the records the map is drawing', () => {
  /* It walked the unfiltered list while the treemap walked the filtered one.
   * On real data, choosing "treasury" cut the map to six companies out of
   * twenty-three records and left all twenty sectors of all 345 standing. */
  const items = rows([
    { ticker: 'AAAA', sector: 'Banks', sectorAr: 'بنوك', action: 'treasury_purchase', shares: 100 },
    { ticker: 'BBBB', sector: 'Textiles', sectorAr: 'منسوجات', action: 'sold', shares: 200 },
    { ticker: 'CCCC', sector: 'Cement', sectorAr: 'أسمنت', action: 'sold', shares: 300 },
  ]);
  const all = tracker(items);
  assert.equal(all.sectorFlows.length, 3, 'the unfiltered view lost a sector');

  const treasury = tracker(items, { insiderFilter: 'treasury' });
  assert.equal(treasury.mapTiles.length, 1, 'the treemap did not narrow');
  assert.equal(treasury.sectorFlows.length, 1,
    'the sector flow still describes records the filter removed');
  assert.equal(treasury.sectorFlows[0].name, 'بنوك');
});

test('an Arabic reader gets Arabic sector names', () => {
  // Five tickers carry `sector` and no `sectorAr` (AIH, FIRE, FTNS, VERT,
  // UPMS), so English words appeared in the middle of an Arabic column.
  const t = tracker(rows([
    { ticker: 'AIH', sector: 'Finance', sectorAr: '', action: 'sold', shares: 10 },
    { ticker: 'VERT', sector: 'Technology Services', sectorAr: '', action: 'bought', shares: 20 },
    { ticker: 'UPMS', sector: 'Health Services', sectorAr: '', action: 'bought', shares: 5 },
  ]));
  const names = t.sectorFlows.map((s) => s.name);
  for (const name of names) {
    assert.doesNotMatch(name, /^[A-Za-z &]+$/, `"${name}" is English in the Arabic view`);
  }
  assert.ok(names.includes('التمويل والخدمات المالية'), `Finance was not translated: ${names}`);
});

test('a sector whose filings state no share count says so, not zero', () => {
  /* Four sectors carry filings with no number in them. The card printed a
   * bare "0" over three empty bars, which reads as data that failed to load. */
  const t = tracker(rows([
    { ticker: 'AAAA', sector: 'Finance', sectorAr: 'تمويل', action: 'disclosure', shares: null },
    { ticker: 'BBBB', sector: 'Finance', sectorAr: 'تمويل', action: 'disclosure', shares: null },
    { ticker: 'CCCC', sector: 'Banks', sectorAr: 'بنوك', action: 'sold', shares: 500 },
  ]));
  const quiet = t.sectorFlows.find((s) => s.name === 'تمويل');
  const loud = t.sectorFlows.find((s) => s.name === 'بنوك');
  assert.equal(quiet.noVolume, true, 'a sector with no disclosed shares is not marked');
  assert.equal(quiet.hasVolume, false);
  assert.equal(quiet.filingsCount, 2, 'the filings behind it are not counted');
  assert.equal(loud.hasVolume, true, 'a sector with volume was marked as having none');
  assert.equal(loud.noVolume, false);
});

test('the template draws the count instead of the zero', async () => {
  const tpl = await readFile(new URL('../../public/esthmr/template.html', import.meta.url), 'utf8');
  assert.match(tpl, /sec\.hasVolume[\s\S]{0,400}sec\.totalSharesFormatted/,
    'the shares line is drawn without checking there are any');
  assert.match(tpl, /sec\.noVolume[\s\S]{0,400}L\.insiderFlowNoVolume/,
    'a sector with no disclosed volume has nothing to say');
  const logic = await readFile(new URL('../../public/esthmr/logic.js', import.meta.url), 'utf8');
  assert.equal((logic.match(/insiderFlowNoVolume:/g) || []).length, 2,
    'the label is missing from one of the two dictionaries');
});

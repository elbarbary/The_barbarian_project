import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installDom } from './dom-stub.mjs';
import { readRoute, routeKey } from '../../public/esthmr/navigation.js';
installDom();
const { Component } = await import('../../public/esthmr/logic.js');
const company=(ticker,cap,profit,rv)=>({ticker,cap,profit,profitPeriod:'FY 2025',rv,
  name:{en:ticker,ar:ticker},sector:'Banks',close:10,pct:0,volume:300,medianVolume:100,
  ratios:{dividend_yield:0,debt_equity:0}});
function fixture(){
  const c=new Component({accent:'var(--accent)'});
  c.state.lang='en';
  c.setData({demo:false,companies:[company('AAA',100,0,3),company('BBB',200,-5,2),company('CCC',null,null,1)],series:[],fins:[]});
  return c;
}
test('rankings sort both directions, keep zero and losses, and sink missing data',()=>{
  const c=fixture();
  assert.deepEqual(c.renderVals().explorer.rows.map(r=>r.ticker),['BBB','AAA','CCC']);
  c.renderVals().explorer.metrics.find(m=>m.id==='profit').go();
  assert.deepEqual(c.renderVals().explorer.rows.map(r=>r.ticker),['AAA','BBB','CCC']);
  assert.equal(c.renderVals().explorer.rows[0].cells[0].value,'0.00');
  c.renderVals().explorer.toggleDirection();
  assert.deepEqual(c.renderVals().explorer.rows.map(r=>r.ticker),['BBB','AAA','CCC']);
});
test('metric pairs show values, without adding a hidden composite rank',()=>{
  const c=fixture();
  c.renderVals().explorer.pairs.find(m=>m.id==='debt_equity').go();
  const v=c.renderVals().explorer;
  assert.equal(v.rows[0].cells.length,2);
  assert.equal(v.rows[0].cells[1].value,'0.00×');
  assert.equal(v.rows[0].ticker,'BBB');
  v.open();
  assert.equal(c.state.marketMode,'rankings');
  c.renderVals().explorer.rows[0].go();
  assert.equal(c.state.ticker,'BBB');
  assert.equal(c.state.screen,'company');
});
test('volume action opens every qualifying stock with the underlying figures',()=>{
  const c=fixture();c.state.q='no match';
  c.renderVals().explorer.openVolume();
  const v=c.renderVals().explorer;
  assert.equal(c.state.screen,'market');assert.equal(v.isVolume,true);
  assert.deepEqual(v.rows.map(r=>r.ticker),['AAA','BBB']);
  assert.deepEqual(v.rows[0].cells.map(c=>c.value),['3.0×','300','100','EGP 10.00']);
  assert.equal(v.rankColumns[0].id,'cap');
});
test('rankings and pairs round-trip through reload and Back routes',()=>{
  const state={screen:'market',marketMode:'rankings',rankMetric:'profit',rankPair:'debt_equity',rankAscending:true};
  const route=readRoute(routeKey(state));
  for(const key of Object.keys(state))assert.equal(route[key],state[key]);
  assert.equal(readRoute('?view=market&mode=volume').marketMode,'volume');
  assert.equal(readRoute('?view=market&rank=unknown').rankMetric,'cap');
});
test('price ranking does not compare dollars as pounds, and the destination is named for all three things in it',()=>{
  const c=fixture();c.data().companies[1].foreignCurrency=true;c.data().companies[1].currency='USD';
  c.state.rankMetric='close';
  assert.equal(c.renderVals().explorer.rows.at(-1).ticker,'BBB');
  /* It was "News", which was accurate while the destination held the news
     feed and nothing else. §4 gives it three: the news, the official
     disclosure archive, and the connected stories. Naming a destination after
     one of the three things in it sends a reader looking for a filing to the
     wrong tab, so it takes the review's own label. */
  assert.equal(c.renderVals().primaryNav.find(n=>n.id==='today').label,'Updates');
  assert.deepEqual(c.renderVals().primaryNav.find(n=>n.id==='today').screens,
    ['today','calendar','crossings']);
  c.state.lang='ar';
  assert.equal(c.renderVals().primaryNav.find(n=>n.id==='today').label,'المستجدات');
});

/* §8.6, on the Home screen.
 *
 * The explorer used to hand Home a `preview`: the first five rows of whatever
 * ranking was selected, drawn as a numbered table beside the controls. Five
 * named companies in rank order on the landing screen is a shortlist rendered
 * as a lead — the shape the publisher may not put in front of a reader — and
 * "the reader chose the measure" does not change who fixed the list at five.
 * Home keeps the controls and the way in; the table lives only where all of
 * it is shown. Two independent reviews of this codebase scored the old panel
 * as compliant by checking its words, which is exactly how it shipped. */
test('§8 the explorer offers Home no shortlist, only the way to the whole table',()=>{
  const v=fixture().renderVals().explorer;
  assert.equal('preview' in v,false,'a five-row cut of a ranking is a shortlist');
  assert.ok(v.rows.length>=3,'the full table is still there for the market screen');
  assert.equal(typeof v.open,'function');
  assert.match(v.compareLabel,/Compare the market/);
});
test('§8 Home shows no ranked row, and the ranked table lives on the market screen', async () => {
  /* Home carried a LAUNCHER: the explorer's controls and a "show results"
     button, deliberately WITHOUT the ranked table, because a ranked list of
     companies on the front page is the publisher ranking securities.

     Home was rebuilt on 19 September and the launcher went with it — the
     navigation does that job now. The rule it existed to enforce is what
     matters, so it is asserted directly instead of through the panel: nothing
     on Home ranks companies, and the ranked table sits on the market screen
     where a reader has asked for it. */
  const {readFile}=await import('node:fs/promises');
  const html=await readFile(new URL('../../public/esthmr/template.html',import.meta.url),'utf8');
  const home=html.slice(html.indexOf('{{ isHome }}'),html.indexOf('{{ isToday }}'));
  assert.ok(!home.includes('explorer-table'),'a table of ranked companies is back on Home');
  assert.ok(!home.includes('columnheader">#'),'a rank column is back on Home');
  assert.ok(!home.includes('explorer.preview')&&!home.includes('explorer.rows'),'Home is drawing ranked rows');
  const market=html.slice(html.indexOf('{{ isMarket }}'));
  assert.ok(market.includes('explorer-table'),'the ranked table exists nowhere');
  assert.ok(market.includes('{{ explorer.metrics }}'),'the measure controls are gone');
});

test('the four measures are visible without expanding anything', async () => {
  /* They sat on Home above the details drawer so they could not be collapsed
     out of sight. They moved to the market screen on 19 September and the
     rule travels with them: in the markup unconditionally, not behind a
     toggle. */
  const {readFile}=await import('node:fs/promises');
  const html=await readFile(new URL('../../public/esthmr/template.html',import.meta.url),'utf8');
  const market=html.slice(html.indexOf('{{ isMarket }}'));
  const measures=market.indexOf('class="market-measures"');
  assert.ok(measures>0,'the four measures exist nowhere');
  assert.ok(market.includes('list="{{ screen.tests }}"'),'the measures draw no tests');
  assert.ok(!market.includes('showHomeDetails'),'the measures are behind a toggle again');

  /* This test also carried the investor party bars — `p.buy`, `p.sell` and
     the two widths — because on Home they shared the same "visible without
     expanding" rule. They were never part of the four measures. The bars went
     to the investors screen with the rest of that block, where the split is
     drawn per party and needs no toggle either. The widths are bound as
     `p.width` there rather than buyW/sellW, so the assertion follows the
     drawing rather than the old binding's name. */
  const investors = html.slice(html.indexOf('{{ isInvestors }}'), html.indexOf('{{ isHeat }}'));
  for (const field of ['investors.parties', 'p.buy', 'p.sell', 'p.width']) {
    assert.ok(investors.includes('{{ ' + field + ' }}'), `the investors screen lost ${field}`);
  }
  assert.ok(!investors.includes('showHomeDetails'), 'the party split is behind a toggle');
});

test('price trends view displays 52W highs, distance, momentum, and filters', () => {
  const c = fixture();
  c.data().companies[0].trends = {
    distHigh52: -1.5, high52: 12.0, low52: 6.0, chg1y: 66.7, chg3m: 20.0,
    aboveMa50: true, isNearHigh52: true, isNewHigh: false
  };
  c.data().companies[1].trends = {
    distHigh52: -0.2, high52: 10.0, low52: 5.0, chg1y: 100.0, chg3m: 25.0,
    aboveMa50: true, isNearHigh52: true, isNewHigh: true
  };
  c.renderVals().explorer.openTrends();
  assert.equal(c.state.screen, 'market');
  assert.equal(c.state.marketMode, 'trends');
  const v = c.renderVals().explorer;
  assert.equal(v.isTrends, true);
  assert.equal(v.isExplorer, true);
  assert.equal(v.columns.length, 4);
  assert.equal(v.rows.length, 2);
  // Default sort is closest to 52W high first (-0.2% before -1.5%)
  assert.deepEqual(v.rows.map(r => r.ticker), ['BBB', 'AAA']);
  assert.match(v.rows[0].cells[1].note, /New High/i);

  // Filter by near_high
  v.trendFilters.find(f => f.id === 'near_high').go();
  assert.equal(c.state.trendFilter, 'near_high');
});

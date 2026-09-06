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
test('price ranking does not compare dollars as pounds and News is named directly',()=>{
  const c=fixture();c.data().companies[1].foreignCurrency=true;c.data().companies[1].currency='USD';
  c.state.rankMetric='close';
  assert.equal(c.renderVals().explorer.rows.at(-1).ticker,'BBB');
  assert.equal(c.renderVals().primaryNav.find(n=>n.id==='today').label,'News');
  c.state.lang='ar';
  assert.equal(c.renderVals().primaryNav.find(n=>n.id==='today').label,'الأخبار');
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
test('§8 the Home ranking panel renders controls and a launcher, never a ranked row',async()=>{
  const {readFile}=await import('node:fs/promises');
  const html=await readFile(new URL('../../public/esthmr/template.html',import.meta.url),'utf8');
  const start=html.indexOf('<section class="ranking-panel">');
  assert.ok(start>0,'the Home ranking panel is gone entirely — the test needs updating, not deleting');
  const panel=html.slice(start,html.indexOf('</section>',start));
  assert.ok(!panel.includes('explorer-table'),'a table of ranked companies is back on Home');
  assert.ok(!panel.includes('columnheader">#'),'a rank column is back on Home');
  assert.ok(!panel.includes('explorer.preview')&&!panel.includes('explorer.rows'),'Home is drawing ranked rows');
  assert.ok(panel.includes('{{ explorer.resultsLabel }}'),'the explicit results action is missing');
  assert.match(panel, /<button[^>]*class="results-button"[^>]*onClick="{{ explorer.open }}"/, 'results must be a working keyboard-accessible button');
  assert.ok(panel.includes('{{ explorer.metrics }}'),'the measure controls should stay');
});

test('four market measures stay visible without expanding Home details',async()=>{
  const {readFile}=await import('node:fs/promises');
  const html=await readFile(new URL('../../public/esthmr/template.html',import.meta.url),'utf8');
  const measures=html.indexOf('class="market-measures"');
  const details=html.indexOf('<sc-if value="{{ showHomeDetails }}">');
  assert.ok(measures>0 && measures<details);
  assert.ok(html.slice(measures,details).includes('list="{{ screen.tests }}"'));
  const home=html.slice(0,details);
  for(const field of ['p.buy','p.sell','p.buyW','p.sellW']) assert.ok(home.includes('{{ '+field+' }}'),field);
});

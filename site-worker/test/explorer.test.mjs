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

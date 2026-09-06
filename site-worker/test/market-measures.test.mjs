import {test} from 'node:test';
import assert from 'node:assert/strict';
import {installDom} from './dom-stub.mjs';
installDom();
const {Component}=await import('../../public/esthmr/logic.js');
function fixture(events=[{ticker:'CCC',date:'2026-10-01'}]) {
  const c=new Component({accent:'var(--accent)'});
  c.state.lang='en';
  c.setData({demo:false,marketDate:'2026-09-06',isClose:true,expectedEvents:events,
    companies:['AAA','BBB','CCC'].map((ticker,i)=>({ticker,name:{en:ticker,ar:ticker},sector:'Banks',
      pe:4+i*4,avgVolume:100+i*100,volume:300,medianVolume:100,rv:3,close:10,pct:0,
      ratios:{cash_conversion:[2,1,0.5][i]}})),series:[],fins:[]});
  return c;
}
test('each measure opens exactly its own counted companies, with no hidden intersection',()=>{
  for(let i=0;i<4;i++) {
    const c=fixture();
    const t=c.renderVals().screen.tests[i];
    assert.equal(t.canOpen,true);
    assert.ok(t.threshold.length>10);
    c.state.marketMode='volume';c.state.q='missing';c.state.sector='missing';
    t.open();
    assert.equal(c.state.screen,'market');
    assert.equal(c.state.marketMode,'');
    assert.equal(c.state.rqs.length,1);
    assert.equal(c.renderVals().rows.length,Number(t.of.match(/\d+/)[0]));
  }
});
test('missing calendar is not shown as every company having no filing due',()=>{
  const t=fixture([]).renderVals().screen.tests[3];
  assert.equal(t.canOpen,false);
  assert.equal(t.width,'0%');
  assert.match(t.threshold,/No calendar data/);
});
test('the date beside a volume multiple comes from the market session, not the clock',()=>{
  const c=fixture();
  assert.equal(c.renderVals().insightBusyDate,c.shortDate('2026-09-06'));
});

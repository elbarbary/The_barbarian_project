import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {installDom} from './dom-stub.mjs';
installDom();
Node.prototype.addEventListener=function(name,fn){(this.events ||= {})[name]=fn;};
const {flowTrackers,sectorWindow,ownershipRows,linePath}=await import('../../public/esthmr/flow-trackers.js');
const {Component}=await import('../../public/esthmr/logic.js');
const {readRoute,routeKey}=await import('../../public/esthmr/navigation.js');
const file=path=>readFile(new URL('../../'+path,import.meta.url),'utf8');
const published=JSON.parse(await file('public/data/v1/flow-trackers.json'));
function text(node){return [node?.text||'',...(node?.children||[]).map(text)].join(' ');}
function all(node,tag){return [...(node?.tag===tag?[node]:[]),...(node?.children||[]).flatMap(n=>all(n,tag))];}
function fixture(state={}){
  const c=new Component({}); Object.assign(c.state,{lang:'en',screen:'liquidity'},state);
  c.setData({demo:false,companies:[],series:[],fins:[],flowTrackers:published});return c;
}

test('tracker routes survive refresh and Back',()=>{
  for(const screen of ['liquidity','ownership'])assert.equal(readRoute('?'+routeKey({screen})).screen,screen);
});
test('session ranges change totals and chart observations',()=>{
  const s={history:Array.from({length:30},(_,i)=>({date:String(i),value:10}))};
  assert.equal(sectorWindow(s,5).value,50);assert.equal(sectorWindow(s,20).value,200);
  assert.equal(sectorWindow({history:[{date:'a',value:null}]}).value,null);
});
test('missing chart points break lines instead of fabricating zero',()=>{
  const path=linePath([{value:2},{value:null},{value:4}], 'value');
  assert.equal((path.match(/M/g)||[]).length,2);assert.doesNotMatch(path,/NaN|Infinity/);
});
test('ownership filters distinguish companies, treasury and calendar windows',()=>{
  const d={asOf:'2026-09-10',events:[
    {ticker:'A',action:'bought',date:'2026-09-09'},
    {ticker:'A',action:'treasury_purchase',date:'2026-09-09'},
    {ticker:'B',action:'sold',date:'2026-01-01'},
    {ticker:'A',action:'sold',date:null},
    {ticker:'A',action:'sold',date:'2027-01-01'}]};
  assert.equal(ownershipRows(d,{ticker:'A',kind:'insiders',count:7}).length,1);
  assert.equal(ownershipRows(d,{kind:'treasury'}).length,1);
  assert.equal(ownershipRows(d,{count:365}).length,3);
});
test('published trackers render every company selection and Arabic without invalid SVG',()=>{
  for(const lang of ['en','ar']){
    for(const screen of ['liquidity','ownership']){
      const c=fixture({lang,screen});const v=c.renderVals();
      assert.equal(v.isFlowTracker,true);assert.ok(v.flowViews.screen);
      assert.doesNotMatch(text(v.flowViews.screen),/NaN|undefined|Infinity/);
      for(const path of all(v.flowViews.screen,'path'))assert.doesNotMatch(path.attrs.d,/NaN|Infinity/);
    }
  }
  for(const ticker of new Set(published.events.map(r=>r.ticker).filter(Boolean))){
    const c=fixture({screen:'ownership',ownershipTicker:ticker});
    assert.doesNotMatch(text(c.renderVals().flowViews.screen),/NaN|undefined|Infinity/);
  }
});
test('home entry cards navigate and do not require the large history file',()=>{
  const c=fixture({screen:'home'});
  const preview={schemaVersion:1,sectors:[],eventCount:353};
  c.setData({demo:false,companies:[],flowPreview:preview});
  const cards=all(flowTrackers(c,c.data(),false).home,'button');
  cards[0].events.click();assert.equal(c.state.screen,'liquidity');
  cards[1].events.click();assert.equal(c.state.screen,'ownership');
});
test('range, company and party controls update independent state',()=>{
  const c=fixture();let v=flowTrackers(c,c.data(),false);
  all(v.screen,'button').find(n=>text(n).trim()==='5 sessions').events.click();
  assert.equal(c.state.flowRange,5);
  c.state.screen='ownership';v=flowTrackers(c,c.data(),false);
  const selects=all(v.screen,'select');
  selects[0].events.change({target:{value:'BTFH'}});selects[1].events.change({target:{value:'treasury'}});
  assert.equal(c.state.ownershipTicker,'BTFH');assert.equal(c.state.ownershipKind,'treasury');
});
test('no verified dataset means an honest empty state, never demo holdings',()=>{
  const c=fixture({screen:'ownership'});
  for(const demo of [true,false]){
    const v=flowTrackers(c,{demo},false);
    assert.match(text(v.screen),demo?/Sign in/:/Retry/);
    assert.doesNotMatch(text(v.screen),/BTFH/);
  }
});
test('current reference percentages and marked values are explicitly qualified',()=>{
  const c=fixture({screen:'ownership'});const output=text(flowTrackers(c,c.data(),false).screen);
  assert.match(output,/not ownership change/);assert.match(output,/not a shareholder register/);
  assert.match(output,/not the execution amount/);
});
test('heavy histories are lazy-loaded and existing auth files are not involved',async()=>{
  const source=await file('public/esthmr/main.js');
  assert.match(source,/slice\(data\.flowPreview\(\)/);
  assert.doesNotMatch(source,/slice\(data\.flowTrackers\(\)/);
  assert.match(source,/\['liquidity', 'ownership'\]\.includes/);
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {installDom} from './dom-stub.mjs';
import {aiCards, averageOf} from '../../public/esthmr/ai-cards.js';
import {recordChart, horizonChart, points} from '../../public/esthmr/ai-visuals.js';
import {companyPicker,savedRulePicker} from '../../public/esthmr/scenario-visuals.js';
import {scenariosScreen,universeFor,warningLines,ACCEPTED_KEY} from '../../public/esthmr/scenarios.js';
installDom();
const all=n=>n?[n,...(n.children||[]).flatMap(all)]:[];
const text=n=>n?[n.text||'',...(n.children||[]).map(text)].join(' '):'';
const byClass=(n,c)=>all(n).filter(x=>String(x.attrs?.class||'').split(' ').includes(c));
const button=(n,label)=>all(n).find(x=>x.tag==='button'&&text(x).includes(label));
const component=(state={})=>({_reader:'reader@example.com',_questions:[],state:{scAccepted:1,scAcceptedReader:'reader@example.com',...state},setState(p){Object.assign(this.state,p);}});
const record={sessions:2,meanReturn:2,meanMarket:3,meanAdvantage:-1,ahead:1,byDate:[
  {basisSession:'2026-09-01',chosenReturn:4,marketReturn:3},
  {basisSession:'2026-09-02',chosenReturn:0,marketReturn:3}]};
const top5={dates:['2026-09-01','2026-09-02'],models:{kronos:{label:'Kronos',horizons:{5:record}},rerank:{label:'Gemini',horizons:{}}}};
const scenarios={basisSession:'2026-09-14',models:{kronos:{label:'Kronos',group:'neural'},chronos2:{label:'Chronos',group:'neural'},flat:{label:'Flat',group:'baseline'}},companies:{
  AAA:{models:{kronos:{returns:{1:2,5:-4,20:8}},chronos2:{returns:{5:3}},flat:{rankedBy:{5:1}}}},
  BBB:{models:{kronos:{returns:{5:1}}}}}};
const data={scenarios,top5,companies:[{ticker:'AAA',name:{en:'Alpha',ar:'ألفا'}},{ticker:'BBB',name:{en:'Beta',ar:'بيتا'}}],feed:[]};
const screen=c=>scenariosScreen(c,data,false).screen;

test('model cards open the clicked model at the selected horizon',()=>{
  const c=component({aiHorizon:'5'}),node=aiCards(c,data,false);
  const cards=byClass(node,'aic-card');
  assert.equal(cards.length,2);
  assert.match(text(cards[0]),/\+2.00%/);
  assert.match(text(cards[0]),/-1.00 pp/);
  assert.match(text(cards[1]),/No record yet/);
  assert.equal(all(cards[1]).filter(n=>n.tag==='svg').length,0);
  cards[1].events.click();
  assert.equal(c.state.screen,'scenarios');assert.equal(c.state.scModel,'rerank');assert.equal(c.state.scHorizon,5);
});
test('average ignores incomplete scores instead of producing NaN',()=>{
  assert.equal(averageOf([{sessions:1,advantage:2,ownReturn:null,market:1}]).scored,0);
  assert.equal(points(2),'\u002b2.00 pp');
});
test('stock search, selection, removal and saved-rule selection are wired',()=>{
  const c=component({scSubject:'picked'});let node=companyPicker(c,data,scenarios,false);
  all(node).find(x=>x.tag==='input').events.input({target:{value:'alpha'}});
  node=companyPicker(c,data,scenarios,false);
  assert.equal(byClass(node,'sc-picker-list')[0].children.length,1);
  button(node,'AAA').events.click();
  assert.deepEqual(universeFor(c.state,scenarios).tickers,['AAA']);
  node=companyPicker(c,data,scenarios,false);button(node,'AAA ×').events.click();
  assert.deepEqual(universeFor(c.state,scenarios).tickers,[]);
  assert.deepEqual(universeFor({scSubject:'rule'},scenarios).tickers,[]);
  c._questions=[{id:'one',name:'Active volume',conditions:[]}];
  node=savedRulePicker(c,false);all(node).find(x=>x.tag==='select').events.change({target:{value:'one'}});
  node=savedRulePicker(c,false);
  assert.equal(all(node).find(x=>x.tag==='option'&&x.attrs.value==='one').attrs.selected,'true');
});
test('rerank absence never substitutes a price model',()=>{
  const node=screen(component({scModel:'rerank'}));
  assert.match(text(node),/no Gemini return estimates/);
  assert.match(text(byClass(node,'sc-estimate')[0]),/Gemini/);
  assert.doesNotMatch(text(byClass(node,'sc-estimate')[0]),/-4.00%/);
});
test('twenty-session view does not silently show five-session historical scores',()=>{
  const node=screen(component({scHorizon:20}));
  assert.equal(byClass(node,'sc-record-panel').length,0);
  assert.match(text(node),/no scorable record/);
  assert.match(text(byClass(node,'sc-estimate')[0]),/\+8.00%/);
});
test('baseline ranking numbers are not shown as return estimates',()=>{
  const node=screen(component({scModel:'flat'}));
  assert.match(text(byClass(node,'sc-estimate')[0]),/no return estimate/);
  assert.doesNotMatch(text(byClass(node,'sc-estimate')[0]),/1.00%/);
});
test('context toggles preserve the saved prediction; unsafe news URLs are inert',()=>{
  const c=component({scLayers:['news','measures','rulebook','filings','spread']});
  const node=scenariosScreen(c,{...data,feed:[{headline:'Evidence',href:'javascript:alert(1)',tickers:[{ticker:'AAA'}]}]},false).screen;
  assert.match(text(byClass(node,'sc-estimate')[0]),/-4.00%/);
  assert.equal(byClass(node,'sc-news')[0].children.find(x=>x.tag==='a').attrs.href,undefined);
  assert.match(text(node),/awards no qualification points/);
  assert.match(text(node),/do not rerun or change the model/);
});
test('charts use finite SVG geometry, gaps, and separate endpoint estimates',()=>{
  const node=recordChart({byDate:[{basisSession:'a',chosenReturn:2,marketReturn:null},{basisSession:'b',chosenReturn:NaN},{basisSession:'c',chosenReturn:Infinity,marketReturn:0}]});
  for(const n of all(node))assert.doesNotMatch(JSON.stringify(n.attrs),/NaN|Infinity/);
  assert.equal(recordChart({byDate:[]}),null);
  const endpoints=horizonChart(scenarios.companies.AAA,'kronos',5,false);
  assert.equal(byClass(endpoints,'aiv-model').length,3);
  assert.match(text(endpoints),/\+8.00%/);
});
test('acceptance is scoped to the current reader and warning is a native modal',()=>{
  const saved=new Map();globalThis.localStorage={getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)};
  try{
    const c=component({scAcceptedReader:'someone-else@example.com'});let node=screen(c);
    assert.equal(byClass(node,'sc-estimate').length,0);
    assert.equal(all(node).filter(n=>n.tag==='dialog').length,1);
    all(node).find(n=>n.tag==='dialog').events.cancel();assert.equal(c.state.screen,'home');
    button(node,'I understand').events.click();
    assert.equal(saved.get(ACCEPTED_KEY+c._reader),'1');
    node=screen(c);assert.equal(byClass(node,'sc-estimate').length,1);
    button(node,'Show the warning again').events.click();
    assert.equal(byClass(screen(c),'sc-estimate').length,0);
  }finally{delete globalThis.localStorage;}
});
test('warning adapts to missing evidence and does not invent poor performance',()=>{
  assert.match(warningLines({},false,{}).join(' '),/no completed five-session/);
  assert.match(warningLines({},false,{}).join(' '),/timestamp evidence is unavailable/);
  const positive={dates:['x'],models:{a:{horizons:{5:{sessions:1,meanAdvantage:2}}}}};
  assert.match(warningLines(positive,false,{}).join(' '),/0 of 1 scored models lag/);
});
test('English, Arabic, empty documents and stale loading state render safely',()=>{
  for(const ar of [false,true])for(const d of [data,{scenarios:{companies:{}},top5:{}}]){
    const node=scenariosScreen(component({scStage:0}),d,ar).screen;
    assert.doesNotMatch(text(node),/undefined|NaN|Infinity/);
    assert.equal(byClass(node,'sc-loading').length,0);
  }
  let retries=0;const c=component();c.onRetryData=()=>retries++;
  const node=scenariosScreen(c,{},false).screen;button(node,'Retry loading').events.click();
  assert.equal(retries,1);assert.equal(byClass(node,'sc-skeleton').length,1);
});
test('mobile filters collapse by default and expand with keyboard-equivalent click',()=>{
  globalThis.matchMedia=()=>({matches:true});
  try{
    const c=component();let node=screen(c),panel=byClass(node,'sc-controls-shell')[0];
    assert.equal(panel.attrs.open,undefined);
    assert.equal(byClass(node,'sc-focus').length,1);
    panel.children[0].events.click({preventDefault(){}});
    node=screen(c);panel=byClass(node,'sc-controls-shell')[0];
    assert.equal(panel.attrs.open,'true');
  }finally{delete globalThis.matchMedia;}
});

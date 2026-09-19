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
test('home cards navigate and do not require the large history file',()=>{
  /* The point of this test is the SECOND clause: Home draws these from
     `flow-preview.json`, never from the full history document. What changed is
     that each card now needs its own rows — turn 6 gives them separate
     datelines and figures — so the fixture supplies the little each one reads,
     and the card with nothing to show is asserted absent below. */
  const c=fixture({screen:'home'});
  const preview={schemaVersion:1,eventCount:353,asOf:'2026-09-17',
    sectors:[{id:'Banks',name:'Banks',nameAr:'بنوك',sizeWeightedReturn:1.2,
      history:[{date:'2026-09-17',value:1e9,upValue:6e8,downValue:4e8}]}],
    topEvents:[{id:'e1',ticker:'COMI',date:'2026-09-16',referencePercent:0.31,
      relationshipLabel:'Insider / Board',relationshipLabelAr:'مجلس إدارة / داخلي'}]};
  c.setData({demo:false,companies:[],flowPreview:preview});
  const home=flowTrackers(c,c.data(),false).home;
  const open=all(home,'button').filter(n=>String(n.attrs?.class||n.attrs?.className||'').includes('ft-card-open'));
  assert.equal(open.length,3,'a card lost its way out');
  open[0].events.click();assert.equal(c.state.screen,'liquidity');
  open[1].events.click();assert.equal(c.state.screen,'ownership');
});

test('a card with nothing published is absent, not an empty frame',()=>{
  /* The portals this replaced rendered their chrome whatever the document
     held, so a reader could meet a headed, ruled card with no rows in it. */
  const c=fixture({screen:'home'});
  c.setData({demo:false,companies:[],flowPreview:{schemaVersion:1,sectors:[],topEvents:[]}});
  assert.equal(flowTrackers(c,c.data(),false).home,null);
});

test('turn 6 gives the three their own cards, and the liquidity limit survives',()=>{
  const c=fixture({screen:'home'});
  c.setData({demo:false,companies:[],flowPreview:{schemaVersion:1,asOf:'2026-09-17',
    sectors:[{id:'Banks',name:'Banks',nameAr:'بنوك',sizeWeightedReturn:1.2,
      history:[{date:'2026-09-17',value:1e9,upValue:6e8,downValue:4e8}]}],
    topEvents:[{id:'e1',ticker:'COMI',date:'2026-09-16',referencePercent:0.31,
      relationshipLabel:'Insider / Board'}]}});
  const home=flowTrackers(c,c.data(),false).home;
  const titles=all(home,'h2').map(n=>text(n).trim());
  // The heading is now the reader's question with the card's name after it as
  // a small term; the order of the three cards is what this pins.
  assert.deepEqual(titles.map((x) => x.replace(/^[^?]*\?\s*/, '').trim()),['Sector pulse','Ownership lens','Market liquidity'],
    `the three were folded together again: ${titles.join(', ')}`);
  /* The sentence that stops traded value in rising shares being read as money
     entering the market. Every executed trade has both sides. */
  assert.match(text(home),/NOT money entering or leaving/);
  assert.match(text(home),/every executed trade has a buyer and a seller/);
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
  // The screens whose documents are too heavy for the Home payload. Matched
  // one at a time rather than as a literal list, so adding a screen to the
  // lazy path does not fail a test about lazy loading.
  const lazy=source.match(/\[([^\]]*)\]\.includes\(component\.state\.screen\)/);
  assert.ok(lazy,'nothing is gated on the screen being open');
  for(const screen of ['liquidity','ownership','world'])
    assert.match(lazy[1],new RegExp(`'${screen}'`),screen);
});

/* ── §8: the latest session leads, the history is a second view ──────────── */

test('a sector opens on its latest session, not on a year of charts', async () => {
  /* "Sector Liquidity opens with stacked aggregate numbers and substantial
     method text; a large monthly matrix appears early."
     The panel was one scroll — four totals, four more, four history charts,
     then the companies — so a reader asking what a sector did today scrolled
     past a year of daily turnover to reach the rows that explain it. */
  const src = await readFile(new URL('../../public/esthmr/flow-trackers.js', import.meta.url), 'utf8');
  assert.match(src, /const detailTab = component\.state\.flowDetailTab === 'history' \? 'history' : 'latest'/,
    'the default is no longer the latest session');
  assert.match(src, /flowSector: id, flowDetailTab: 'latest'/,
    'opening a different sector keeps the previous sector’s view');
  // Both views exist and are named.
  assert.match(src, /t\('Latest session', 'آخر جلسة'\)/);
  assert.match(src, /t\('Historical', 'تاريخي'\)/);
});

test('nothing was removed from the sector panel, only separated', async () => {
  /* The charts and the methodology note are the study; they are one click
     away, not gone. A split that quietly drops a chart is indistinguishable
     from one that hides it well. */
  const src = await readFile(new URL('../../public/esthmr/flow-trackers.js', import.meta.url), 'utf8');
  for (const kept of [
    'Historical Liquidity & Move Trajectories',
    'Daily traded value',
    'Advancing market cap vs Declining market cap',
    'Stock Movements Relative to Size',
    'Companies & calculation notes',
  ]) assert.ok(src.includes(kept), `the split lost "${kept}"`);
  // And the constituent rows moved INTO the latest view, where they explain
  // the session's figures rather than trailing the history.
  const panel = src.slice(src.indexOf("detailTab === 'history' ? ["));
  const latest = panel.slice(panel.indexOf('] : ['));
  assert.ok(latest.indexOf('ft-stock-breakdown') > 0, 'the companies left the latest view');
});

test('the tab strip cannot reach the ownership lens', async () => {
  /* `.ft-detail` and `.ft-charts` serve the ownership lens too, and it has no
     tabs. An unscoped rule would grow it some. */
  const css = await readFile(new URL('../../public/esthmr/flow-trackers.css', import.meta.url), 'utf8');
  const rules = [...css.matchAll(/^(\.[^{\n]*ft-detail-tab[^{\n]*)\{/gm)].map((m) => m[1].trim());
  assert.ok(rules.length >= 2, 'the tab strip has no styles at all');
  for (const rule of rules) {
    assert.ok(rule.startsWith('.ft-detail '), `unscoped rule could reach ownership: ${rule}`);
  }
});

test('“activity, not net inflow” survives the split', async () => {
  /* The single most important sentence on this screen: every executed trade
     has both sides, so traded value in rising stocks is not money entering.
     It sits in the latest view, beside the figures it qualifies. */
  const src = await readFile(new URL('../../public/esthmr/flow-trackers.js', import.meta.url), 'utf8');
  assert.match(src, /Activity, not net inflow/);
  assert.match(src, /Every executed trade has a buyer and seller/);
});

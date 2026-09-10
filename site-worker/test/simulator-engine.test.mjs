import test from 'node:test';
import assert from 'node:assert/strict';
import { orderFee, regulatoryFee, runSimulation, subscriptionCycle } from '../../public/esthmr/simulator-engine.js';
import { simulatorExplorer } from '../../public/esthmr/simulator.js';

/* The store is filled from disk here, which is what the browser does over the
 * network. Before the split these prices arrived as an imported bundle; the
 * assertions below are unchanged, and they still run against the real series.
 */
import { readFileSync, existsSync } from 'node:fs';
import { prime } from '../../public/esthmr/simulator-store.js';
const SIM_DIR = new URL('../../public/esthmr/sim/', import.meta.url);
const readJson = (name) => JSON.parse(readFileSync(new URL(name, SIM_DIR), 'utf8'));
const companies = readJson('index.json').companies;
prime({
  index: companies,
  series: Object.fromEntries(companies
    .filter((c) => existsSync(new URL(`${c.ticker}.json`, SIM_DIR)))
    .map((c) => [c.ticker, readJson(`${c.ticker}.json`)])),
});

const broker = {id:'thndr',brokerPct:.001,brokerMin:0,ticketFee:2};
const dates = n => Array.from({length:n},(_,i)=>[new Date(Date.UTC(2026,6,1+i)).toISOString().slice(0,10),10,11,12]);
const run = extra => runSimulation({sessions:dates(28),broker,capital:100000,monthlyAmount:2500,strategy:'daily',entry:'open',exit:'close',hold:0,every:1,...extra});
test('official 5000 EGP single-fill example totals 11.75 EGP',()=>{
  assert.equal(regulatoryFee(5000),4.75);
  assert.equal(orderFee(5000,broker).total,11.75);
  assert.equal(orderFee(5000,broker,{waived:true}).total,4.75);
});
test('same-day stamp duty and FRA partial-fill minima are separate',()=>{
  assert.equal(regulatoryFee(5000,true),3.5);
  assert.equal(regulatoryFee(5000,false,2),5.75);
});
test('50-order quota counts buys and sells separately, then charges both commission parts',()=>{
  const r=run({subscribed:true});
  assert.equal(r.executionCount,56);
  assert.equal(r.waivedOrders,50);
  assert.equal(r.ledger[49].commission,0);
  assert.equal(r.ledger[50].ticket,2);
  assert.ok(r.ledger[50].commission>0);
  assert.equal(r.totalSubFee,245);
});
test('quota resets at 30 days from start, not a calendar-month boundary',()=>{
  assert.equal(subscriptionCycle('2026-08-01','2026-07-15'),0);
  assert.equal(subscriptionCycle('2026-08-14','2026-07-15'),1);
  const r=run({sessions:dates(32),subscribed:true});
  assert.equal(r.waivedOrders,54);
  assert.equal(r.totalSubFee,490);
});
test('every strategy ends its curve at the reported result including subscription',()=>{
  for(const strategy of ['daily','lump','dca']){
    const r=run({strategy,subscribed:true});
    assert.equal(r.trajectoryPoints.at(-1).netCash,r.netEndingCash);
    assert.ok(Math.abs(r.trajectoryPoints.at(-1).returnPct-r.netReturnPct)<1e-10);
    assert.equal(r.totalFees,r.totalBrokerFee+r.totalTicketFee+r.totalStatutoryFee+r.totalSubFee);
  }
});
test('fee-inclusive integer shares never exceed a tiny budget',()=>{
  const r=run({capital:5,subscribed:false});
  assert.equal(r.executionCount,0);
  assert.equal(r.totalFees,0);
  assert.equal(r.netEndingCash,5);
});
test('one custom date updates range; empty ranges do not use unrelated history',()=>{
  const c={state:{simTicker:'COMI',simRange:'1Y'},setState(p){Object.assign(this.state,p);}};
  let s=simulatorExplorer(c,{},false);
  s.onStartDateChange({target:{value:'2026-08-01'}});
  s=simulatorExplorer(c,{},false);
  assert.equal(s.startDate,'2026-08-01');
  c.setState({simStartDate:'2026-09-05',simEndDate:'2026-09-04'});
  s=simulatorExplorer(c,{},false);
  assert.equal(s.totalSessionsCount,0);
  assert.equal(s.lineD,'');
});
test('holding period and entry cadence change executions and curves',()=>{
  const fast=run({hold:1}), slow=run({hold:5,every:7});
  assert.ok(fast.executionCount>slow.executionCount);
  assert.notDeepEqual(fast.trajectoryPoints,slow.trajectoryPoints);
});
test('entry and exit controls preserve each other',()=>{
  const c={state:{simTicker:'SWDY',simTiming:'close_to_close'},setState(p){Object.assign(this.state,p);}};
  let s=simulatorExplorer(c,{},false);
  s.onEntryTimeChange({target:{value:'open'}});
  s=simulatorExplorer(c,{},false);
  s.onExitTimeChange({target:{value:'noon'}});
  s=simulatorExplorer(c,{},false);
  assert.equal(s.entryTime,'open'); assert.equal(s.exitTime,'noon');
});
test('BTFH one and two year windows use distinct sessions and results',()=>{
  const one=simulatorExplorer({state:{simTicker:'BTFH',simRange:'1Y'}},{},false);
  const two=simulatorExplorer({state:{simTicker:'BTFH',simRange:'2Y'}},{},false);
  assert.ok(two.totalSessionsCount>one.totalSessionsCount);
  assert.notEqual(two.brokerOutcomes[0].netReturnPct,one.brokerOutcomes[0].netReturnPct);
  assert.notEqual(two.multiChartLines[0].pathD,one.multiChartLines[0].pathD);
  const short=simulatorExplorer({state:{simTicker:'VALU',simRange:'2Y'}},{},false);
  assert.ok(short.rangeClipped);
  assert.match(short.clippedLabel,/Requested start/);
});
test('long history is used only for close-to-close, without inventing intraday prices',async(t)=>{
  t.mock.method(globalThis,'fetch',async()=>({ok:true,json:async()=>({price_history:[{date:'2020-01-01',close:2},{date:'2026-09-02',close:3}]})}));
  const c={state:{simTicker:'BTFH'},setState(p){Object.assign(this.state,p);}};
  await simulatorExplorer(c,{},false).loadCloseHistory();
  let s=simulatorExplorer(c,{},false);
  assert.equal(s.startDate,'2020-01-01');
  assert.equal(s.entryTime,'close'); assert.equal(s.exitTime,'close');
  assert.equal(c.state.simCloseHistory[0][2],null);
  s.onExitTimeChange({target:{value:'noon'}});
  s=simulatorExplorer(c,{},false);
  assert.ok(s.startDate>'2020-01-01');
});
test('11 AM uses recovered prices and differs from noon without changing entry',()=>{
  const c={state:{simTicker:'BTFH'},setState(p){Object.assign(this.state,p);}};
  let s=simulatorExplorer(c,{},false);
  assert.ok(s.exitTimeOptions.some(o=>o.id==='11:00'));
  s.onExitTimeChange({target:{value:'11:00'}});
  s=simulatorExplorer(c,{},false);
  assert.equal(s.entryTime,'close');
  assert.equal(s.resultsAvailable,true);
  assert.equal(s.missingExitPrices,false);
  assert.notEqual(s.sellPriceFmt,'—');
  const elevenReturn=s.brokerOutcomes[0].netReturnPct;
  assert.ok(s.brokerOutcomes.every(b=>b.executionCount>0));
  s.onExitTimeChange({target:{value:'noon'}});
  assert.equal(simulatorExplorer(c,{},false).resultsAvailable,true);
  assert.notEqual(simulatorExplorer(c,{},false).brokerOutcomes[0].netReturnPct,elevenReturn);
});
test('missing timed exits skip cycles without borrowing a later observation',()=>{
  const result=runSimulation({sessions:[['2026-08-01',10,12,11,9],['2026-08-02',10,12,11,null],['2026-08-03',10,12,11,9]],broker:{id:'custom',brokerPct:0,brokerMin:0,ticketFee:0},capital:10000,strategy:'daily',entry:'close',exit:'11:00',hold:1,every:1});
  assert.equal(result.skippedCycles,1);
  assert.equal(result.executionCount,2);
  assert.equal(result.ledger[0].date,'2026-08-02');
  assert.equal(result.ledger[1].date,'2026-08-03');
});
test('failed long-history fetch preserves the chosen strategy',async(t)=>{
  t.mock.method(globalThis,'fetch',async()=>({ok:false}));
  const c={state:{simTicker:'BTFH'},setState(p){Object.assign(this.state,p);}};
  await simulatorExplorer(c,{},false).loadCloseHistory();
  assert.ok(c.state.simHistoryError);
  assert.equal(c.state.simHistoryLoading,false);
  assert.equal(simulatorExplorer(c,{},false).exitTime,'11:00');
});

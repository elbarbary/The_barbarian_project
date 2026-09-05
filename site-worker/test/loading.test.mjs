import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { readResponse } from '../../public/esthmr/requests.js';

const source = (await readFile(new URL('../../public/esthmr/main.js', import.meta.url), 'utf8'))
  .replace(/^import .*;$/gm, '');
const defer = () => { let resolve, reject; const promise = new Promise((a,b) => { resolve=a; reject=b; }); return {promise,resolve,reject}; };
const tick = () => new Promise((resolve) => setImmediate(resolve));

function boot(overrides = {}) {
  let component, mounted = false;
  const identity = defer(), live = defer();
  const elements = new Map();
  const document = { body: { dataset:{} }, documentElement: {dataset:{}},
    getElementById(id) { if (!elements.has(id)) elements.set(id, {}); return elements.get(id); } };
  class Component {
    constructor() { component=this; this.state={lang:'en',screen:'home',ticker:''}; this._d={}; }
    data() { return this._d; }
    setState(p) { Object.assign(this.state,p); this.onChange?.(); }
    setData(d) { this._d=d; this.onChange?.(); }
    openMonth() { return ''; }
  }
  const data = { live:() => live.promise, demo:() => ({demo:true,companies:[]}),
    news:async()=>[], newsProvenance:async()=>({}), calendar:async()=>({}),
    exchange:async()=>({}), attention:async()=>({}), sectors:async()=>[],
    filedMonths:async()=>[], disclosureMeanings:async()=>[], connections:async()=>[],
    investors:async()=>({}), indices:async()=>({list:[]}), indexCards:()=>[],readNowCards:()=>[],
    companyExtras:async()=>({}), ...overrides };
  vm.runInNewContext(source, { Component, document, data,
    mount:()=> { mounted=true; component.onChange=()=>{}; },
    watch:{read:()=>[],sync:async()=>[],activate:()=>{}},
    readRoute:()=>({}),connectNavigation:()=>()=>{},
    readResponse:async()=>'<main></main>', whoami:()=>identity.promise,
    openSignIn:()=>{},signOut:async()=>{}, location:{search:''},
    localStorage:{getItem:()=>null,setItem:()=>{}},
    window:{addEventListener:()=>{}},console:{warn:()=>{}},
  });
  return { c:component, identity, live, document, mounted:()=>mounted,
    async ready() {
      identity.resolve('reader@example.com');
      live.resolve({demo:false,companies:[{ticker:'A'},{ticker:'B'}],series:[],fins:[]});
      await tick();
    } };
}

test('shell mounts before identity and a slow secondary feed does not hold market data', async () => {
  const sectors = defer();
  const app=boot({sectors:()=>sectors.promise});
  await tick();
  assert.equal(app.mounted(),true);
  assert.equal(app.c.state.dataLoading,true);
  await app.ready();
  assert.equal(app.c.state.dataLoading,false);
  assert.equal(app.c.data().companies.length,2);
  assert.equal(app.c.state.extrasLoading,true);
  app.c._d.fins=['company statement already loaded'];
  sectors.resolve([]); await tick();
  assert.deepEqual(app.c.data().fins,['company statement already loaded']);
  assert.equal(app.c.state.extrasLoading,false);
});

test('company requests reject stale A→B→A responses and can retry failure', async () => {
  const requests=[];
  const app=boot({company:(ticker)=> {const d=defer();requests.push({ticker,...d});return d.promise;}});
  await app.ready();
  app.c.setState({screen:'company',ticker:'A'});
  app.c.setState({ticker:'B'});
  app.c.setState({ticker:'A'});
  requests[0].resolve({fins:['old A']}); requests[1].resolve({fins:['B']});
  await tick(); assert.equal(app.c._co,null);
  requests[2].reject(new Error('offline')); await tick();
  assert.equal(app.c.state.companyError,true);
  assert.equal(app.c.state.companyLoading,false);
  app.c.onRetryCompany();
  requests[3].resolve({fins:['new A'],series:[]}); await tick();
  assert.deepEqual(app.c.data().fins,['new A']);
  assert.equal(app.c.state.companyError,false);
});

test('late company data cannot enter the signed-out demo', async () => {
  const pending=defer();
  const app=boot({company:()=>pending.promise}); await app.ready();
  app.c.setState({screen:'company',ticker:'A'});
  await app.document.getElementById('signout').onclick();
  pending.resolve({fins:['private']}); await tick();
  assert.equal(app.c.data().demo,true);
  assert.equal(app.c._co,null);
  assert.equal(app.c.data().fins,undefined);
});

test('partial archive search exposes failure and retries only missing months', async () => {
  const asked=[]; let failed=true;
  const app=boot({filedMonths:async()=>[{id:'2026-07'},{id:'2026-08'}],
    filedMonth:async(id)=> {asked.push(id);if(id==='2026-08'&&failed)throw new Error('offline');return [{month:id}];}});
  await app.ready();
  app.c.setState({screen:'calendar',filedQ:'A'}); await tick();
  assert.equal(app.c.state.archiveError,true);
  assert.equal(app.c.data().filedAll.length,1);
  app.c.onChange(); await tick(); assert.equal(asked.length,2);
  failed=false; app.c.onRetryArchive(); await tick();
  assert.equal(app.c.state.archiveError,false);
  assert.equal(app.c.data().filedAll.length,2);
  assert.deepEqual(asked,['2026-07','2026-08','2026-08']);
});

test('request deadline includes a stalled response body', async () => {
  const original=globalThis.fetch;
  try {
    globalThis.fetch=async(_,init)=>({json:()=>new Promise((_,reject)=>
      init.signal.addEventListener('abort',()=>reject(new Error('aborted'))))});
    await assert.rejects(readResponse('/slow',{},r=>r.json(),5),/aborted/);
  } finally {globalThis.fetch=original;}
});

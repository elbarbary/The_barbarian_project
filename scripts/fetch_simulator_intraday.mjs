// Public, unauthenticated TradingView chart feed. No credentials or entitlement bypass.
// Protocol reference: https://github.com/rongardF/tvdatafeed/blob/main/tvDatafeed/main.py
// Downloaded bars are raw research inputs, never automatically published as verified prices.
import { mkdir, writeFile } from 'node:fs/promises';
const {default:WebSocket} = await import(process.env.INTRADAY_WS_MODULE || 'ws');
const ticker = process.argv[2] || 'BTFH';
const resolution = process.argv[3] || '60';
if (!/^[A-Z0-9]{2,12}$/.test(ticker) || !['1','15','30','60','1D'].includes(resolution)) throw new Error('Invalid request');
const session = 'cs_' + crypto.randomUUID().replaceAll('-','').slice(0,12);
const socket = new WebSocket('wss://data.tradingview.com/socket.io/websocket', {headers:{Origin:'https://www.tradingview.com'}});
const rows = new Map();
let metadata = null, finished = false, buffer = '';
const send = (m,p) => { const body=JSON.stringify({m,p}); socket.send(`~m~${Buffer.byteLength(body)}~m~${body}`); };
async function finish(status) {
  if (finished) return;
  finished=true; clearTimeout(timer); socket.close();
  const bars=[...rows.values()].sort((a,b)=>a[0]-b[0]);
  const output={ticker, resolution, fetchedAt:new Date().toISOString(), source:'TradingView public chart feed', adjustment:'splits', status, metadata, columns:['unix_seconds','open','high','low','close','volume'], bars};
  const dir=new URL('../data-source/intraday-research/',import.meta.url);
  await mkdir(dir,{recursive:true});
  const name=`${ticker}-${resolution}-${Date.now()}.json`;
  await writeFile(new URL(name,dir),JSON.stringify(output));
  console.log(JSON.stringify({file:new URL(name,dir).pathname,status,count:bars.length,first:bars[0],last:bars.at(-1),timezone:metadata?.timezone}));
}
const timer=setTimeout(()=>finish('timeout'),25000);
socket.addEventListener('open',()=>{
  send('set_auth_token',['unauthorized_user_token']);
  send('chart_create_session',[session,'']);
  send('resolve_symbol',[session,'symbol_1','='+JSON.stringify({symbol:`EGX:${ticker}`,adjustment:'splits',session:'regular'})]);
  send('create_series',[session,'s1','s1','symbol_1',resolution,5000]);
  send('switch_timezone',[session,'exchange']);
});
socket.addEventListener('message',event=>{
  buffer+=event.data;
  while(buffer.startsWith('~m~')) {
    const end=buffer.indexOf('~m~',3); if(end<0) break;
    const length=Number(buffer.slice(3,end)), start=end+3;
    if(buffer.length<start+length) break;
    const body=buffer.slice(start,start+length); buffer=buffer.slice(start+length);
    if(body.startsWith('~h~')) {socket.send(`~m~${body.length}~m~${body}`);continue;}
    let msg;try{msg=JSON.parse(body);}catch{continue;}
    if(msg.m==='symbol_resolved') metadata=msg.p[2];
    if(msg.m==='timescale_update') for(const row of msg.p[1]?.s1?.s || []) rows.set(row.v[0],row.v);
    if(['symbol_error','series_error','critical_error','protocol_error'].includes(msg.m)) { console.log(JSON.stringify(msg));finish(msg.m); }
    if(msg.m==='series_completed') finish('complete');
  }
});
socket.addEventListener('error',()=>finish('connection_error'));
socket.addEventListener('close',()=>finish('closed'));

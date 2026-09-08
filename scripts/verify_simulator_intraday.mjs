import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import {INTRADAY_STOCKS as stocks} from '../data-source/simulator/intraday.js';
import {SIM_STOCKS as oldStocks} from '../data-source/simulator/directory.js';
const dir=new URL('../data-source/intraday-research/',import.meta.url);
// The downloads this checks against are research inputs and are deliberately
// not in the repository (see .gitignore). Say so and stop, rather than throw
// a scandir error at somebody who simply has not fetched them.
if (!existsSync(dir)) {
  console.log(JSON.stringify({ skipped: 'no data-source/intraday-research/ — run scripts/fetch_simulator_intraday.mjs first' }));
  process.exit(0);
}
const files=(await fs.readdir(dir)).filter(n=>/-30-\d+\.json$/.test(n));
const report={checkedAt:new Date().toISOString(),source:'TradingView public chart feed',scope:'structural and consistency checks, not independent certification',stocks:[],totalRawBars:0};
for(const ticker of Object.keys(stocks)){
  const raw=JSON.parse(await fs.readFile(new URL(files.filter(f=>f.startsWith(ticker+'-')).sort().at(-1),dir)));
  if(raw.metadata.name!==ticker||raw.metadata.exchange!=='EGX'||!raw.metadata.currency_code||raw.metadata.timezone!=='Africa/Cairo')throw new Error('Wrong symbol metadata: '+ticker);
  const invalid=raw.bars.filter(b=>!b.slice(0,5).every(Number.isFinite)||b[2]<Math.max(b[1],b[4])||b[3]>Math.min(b[1],b[4]));
  if(invalid.length)throw new Error('Invalid OHLC: '+ticker);
  report.totalRawBars+=raw.bars.length;
  const sessions=stocks[ticker].sessions, old=new Map(oldStocks[ticker].sessions.map(b=>[b[0],b[3]]));
  const overlap=sessions.filter(b=>old.has(b[0])).slice(-20);
  report.stocks.push({ticker,bars:raw.bars.length,sessions:sessions.length,first:sessions[0]?.[0],last:sessions.at(-1)?.[0],missing11:sessions.filter(b=>!(b[4]>0)).length,recentLegacyCloseComparison:{count:overlap.length,withinOnePercent:overlap.filter(b=>Math.abs(b[3]/old.get(b[0])-1)<=.01).length}});
}
const minuteFiles=(await fs.readdir(dir)).filter(n=>/^BTFH-1-\d+\.json$/.test(n)).sort();
if(minuteFiles.length){
  const minute=JSON.parse(await fs.readFile(new URL(minuteFiles.at(-1),dir)));
  const cairo=new Intl.DateTimeFormat('sv-SE',{timeZone:'Africa/Cairo',dateStyle:'short',timeStyle:'short'});
  const eleven=new Map(minute.bars.map(b=>[cairo.format(new Date(b[0]*1000)),b[1]]).filter(([t])=>t.endsWith('11:00')));
  const matches=stocks.BTFH.sessions.filter(b=>eleven.has(b[0]+' 11:00'));
  report.btfhMinuteCrosscheck={sameVendor:true,overlapDays:matches.length,matching11Opens:matches.filter(b=>Math.abs(b[4]-eleven.get(b[0]+' 11:00'))<1e-8).length};
}
const daily=JSON.parse(await fs.readFile(new URL('../public/data/v1/prices/BTFH.json',import.meta.url)));
const closeMap=new Map(daily.price_history.map(b=>[b.date,b.close]));
const recent=stocks.BTFH.sessions.filter(b=>closeMap.has(b[0])).slice(-20);
report.btfhPublishedDailyCrosscheck={overlapDays:recent.length,withinOnePercent:recent.filter(b=>Math.abs(b[3]/closeMap.get(b[0])-1)<=.01).length};
await fs.writeFile(new URL('verification.json',dir),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({stocks:report.stocks.length,bars:report.totalRawBars,minute:report.btfhMinuteCrosscheck,daily:report.btfhPublishedDailyCrosscheck,legacyDisagreements:report.stocks.filter(s=>s.recentLegacyCloseComparison.withinOnePercent<s.recentLegacyCloseComparison.count*.9).map(s=>s.ticker)}));

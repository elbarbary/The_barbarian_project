import {test} from 'node:test';
import assert from 'node:assert/strict';
import {marketStory} from '../../public/esthmr/market-story.js';
const now=new Date('2026-09-07T09:00:00Z');
const companies=[{ticker:'AAA',name:{en:'Alpha',ar:'ألفا'}},{ticker:'BBB',name:{en:'Beta',ar:'بيتا'}}];
const data={companies,feed:[
  {headline:'Alpha press report',date:'2026-09-07',href:'https://news.test/1',tickers:[{ticker:'AAA'}]},
  {headline:'Alpha another report',date:'2026-09-07',href:'https://news.test/2',tickers:[{ticker:'AAA'}]},
  {headline:'Older Beta report',date:'2026-09-02',href:'https://news.test/3',tickers:[{ticker:'BBB'}]},
  {headline:'Economy news',date:'2026-09-06',href:'https://news.test/4',tickers:[]},
],filedEvents:[{what:'Alpha filed results',date:'2026-09-06',ticker:'AAA',href:'https://egx.test/1'}],
crossings:{items:[{ticker:'AAA',strands:[{kind:'filing',title:'Alpha filed results',date:'2026-09-06',link:'https://egx.test/1'},{kind:'session',date:'2026-09-06',ratio:3}]}]}};
test('today, Egyptian trading week and month filter actual dated evidence independently',()=>{
  const today=marketStory(data,{period:'today',now});
  assert.equal(today.news,2);assert.equal(today.filings,0);assert.equal(today.linked,0);
  const week=marketStory(data,{period:'week',now});
  assert.equal(week.from,'2026-09-06');assert.equal(week.news,3);assert.equal(week.filings,1);assert.equal(week.linked,1);
  assert.equal(marketStory(data,{period:'month',now}).news,4);
});
test('a connected preview shows one news source and one filing, not two headlines',()=>{
  const v=marketStory(data,{now});
  assert.deepEqual(v.cards[0].preview.map(e=>e.type),['news','filing']);
  assert.equal(v.general.length,1);
  assert.equal(v.cards[0].evidence.length,3,'the same filing from Crossings must not be counted twice');
});
test('filing view keeps news context but shows only filing evidence',()=>{
  const v=marketStory(data,{kind:'filing',now});
  assert.equal(v.cards.length,1);assert.equal(v.cards[0].both,true);
  assert.ok(v.cards[0].evidence.every(e=>e.type==='filing'));
});
test('future and undated records are excluded; unsafe URLs are not clickable',()=>{
  const v=marketStory({companies,feed:[
    {headline:'No date',tickers:['AAA']},
    {headline:'Future',date:'2026-09-08',tickers:['AAA']},
    {headline:'Current',date:'2026-09-07',href:'javascript:alert(1)',tickers:['AAA']},
  ]},{now});
  assert.equal(v.news,1);assert.equal(v.cards[0].evidence[0].hasLink,false);
});
test('Cairo midnight and missing feeds do not turn stale prices into a news date',()=>{
  const v=marketStory({marketDate:'2026-08-20',companies},{now:new Date('2026-09-06T22:00:00Z'),period:'today'});
  assert.equal(v.to,'2026-09-07');assert.equal(v.empty,true);
  assert.match(v.coverage,/not a complete archive/);
  assert.match(v.relationNote,/does not establish/);
});

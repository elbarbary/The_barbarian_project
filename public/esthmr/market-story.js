// A dated index of evidence, not an inferred explanation of price movement.
// Counts describe the loaded documents, never the entire exchange archive.
export function marketStory(data, {period='week', kind='all', lang='en', now=new Date(), allowText=()=>true}={}) {
  const ar=lang==='ar';
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Cairo',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
  const anchor=new Date(today+'T00:00:00Z');
  const start=new Date(anchor);
  if(period==='month') start.setUTCDate(1);
  else if(period!=='today') start.setUTCDate(start.getUTCDate()-start.getUTCDay());
  const from=start.toISOString().slice(0,10);
  const day=value=> {
    const raw=String(value||'');
    if(!/^\d{4}-\d{2}-\d{2}/.test(raw)) return '';
    if(raw.length===10) return raw;
    const d=new Date(raw); if(Number.isNaN(+d)) return '';
    return new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Cairo',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
  };
  const pick=(x,en,arabic)=>String((ar&&x[arabic])||x[en]||'');
  const safeLink=v=> /^https?:\/\//i.test(v||'') || /^\/(?!\/)/.test(v||'') ? v : null;
  const docs=new Map();
  const add=(type,raw)=> {
    const date=day(raw.published||raw.date); if(!date||date<from||date>today) return;
    const title=pick(raw,'headline','headlineAr')||pick(raw,'what','whatAr')||pick(raw,'title','titleAr');
    if(!title||!allowText(title)) return;
    const href=safeLink(raw.href||raw.link);
    const tickers=[...new Set((raw.tickers||[raw.ticker]).map(t=>typeof t==='string'?t:t?.ticker).filter(t=>t&&t!=='—'))];
    const key=type+'|'+(href||raw.id||date+'|'+title);
    const previous=docs.get(key);
    if(previous) {previous.tickers=[...new Set([...previous.tickers,...tickers])];return;}
    docs.set(key,{type,date,title,href,hasLink:Boolean(href),noLink:!href,tickers,
      label:type==='news'?(ar?'خبر':'News'):(ar?'إفصاح رسمي':'Official filing'),
      source:type==='filing'?'EGX':pick(raw,'source','sourceAr'),
      color:type==='news'?'var(--iris)':'var(--accent)'});
  };
  for(const n of data.feed||[]) add(/filing|إفصاح/i.test(n.kind||'')?'filing':'news',n);
  for(const f of [...(data.filedEvents||[]),...(data.filedArchive||[]),...(data.filedAll||[])]) add('filing',f);
  for(const c of data.crossings?.items||[]) for(const s of c.strands||[]) {
    if(s.kind==='news'||s.kind==='filing') add(s.kind,{...s,ticker:c.ticker});
  }
  const all=[...docs.values()].sort((a,b)=>b.date.localeCompare(a.date)||a.title.localeCompare(b.title));
  const companies=new Map((data.companies||[]).map(c=>[c.ticker,c]));
  const groups=new Map();
  for(const d of all) for(const ticker of d.tickers) {
    if(!companies.has(ticker)) continue;
    if(!groups.has(ticker)) groups.set(ticker,[]);
    groups.get(ticker).push(d);
  }
  const cards=[...groups].map(([ticker,events])=> {
    const company=companies.get(ticker);
    const news=events.filter(e=>e.type==='news').length, filings=events.filter(e=>e.type==='filing').length;
    const visible=events.filter(e=>kind==='all'||e.type===kind);
    const session=(data.crossings?.items||[]).filter(c=>c.ticker===ticker)
      .flatMap(c=>c.strands||[]).filter(s=>s.kind==='session'&&day(s.date)>=from&&day(s.date)<=today&&Number.isFinite(s.ratio))
      .sort((a,b)=>String(b.date).localeCompare(String(a.date)))[0];
    return {ticker,name:typeof company.name==='object'?(company.name[ar?'ar':'en']||company.name.en||ticker):company.name||ticker,
      date:visible[0]?.date||'',news,filings,both:news>0&&filings>0,
      hasSession:Boolean(session),
      session:session?(ar?'نشاط جلسة '+day(session.date)+' · '+session.ratio.toFixed(2)+'× الحجم المعتاد':'Session activity '+day(session.date)+' · '+session.ratio.toFixed(2)+'× usual volume'):'',
      evidence:visible,preview:kind==='all'&&news&&filings
        ? [visible.find(e=>e.type==='news'),visible.find(e=>e.type==='filing')].sort((a,b)=>b.date.localeCompare(a.date))
        : visible.slice(0,2),hasMore:visible.length>2,
      relation:news&&filings?(ar?'وردت في الأخبار والإفصاحات':'Named in news and filings'):(ar?'وردت في مصدر واحد من المصدرين':'Present in one of the two feeds')};
  }).filter(c=>c.evidence.length).sort((a,b)=>b.date.localeCompare(a.date)||a.ticker.localeCompare(b.ticker));
  const news=all.filter(d=>d.type==='news').length, filings=all.filter(d=>d.type==='filing').length;
  const linked=[...groups.values()].filter(ds=>ds.some(d=>d.type==='news')&&ds.some(d=>d.type==='filing')).length;
  const general=all.filter(d=>!d.tickers.some(t=>companies.has(t))&&(kind==='all'||kind===d.type));
  return {from,to:today,news,filings,linked,cards,general,generalPreview:general.slice(0,2),noCompanyCards:cards.length===0,
    empty:!cards.length&&!general.length,
    title:ar?'ما الذي تقوله الأخبار والإفصاحات؟':'What news and filings are saying',
    subtitle:ar?'ابدأ بالفترة، ثم تتبّع ما ورد عن كل شركة في المصادر.':'Choose a period, then follow what the sources say about each company.',
    coverage:ar?'الأعداد تخص المستندات المحمّلة فقط؛ ليست أرشيفاً كاملاً للفترة. الأسبوع يبدأ الأحد بتوقيت القاهرة.':'Counts cover loaded documents, not a complete archive for the period. Weeks start Sunday, Cairo time.',
    relationNote:ar?'الربط يعني ورود الشركة في المصدرين خلال الفترة؛ لا يثبت أن الخبر أو الإفصاح سبّب حركة السعر.':'A connection means the company appears in both feeds during the period. It does not establish what caused a price move.',
    emptyLabel:ar?'لم تصل مستندات لهذه الفترة بعد. جرّب هذا الأسبوع أو هذا الشهر.':'No documents loaded for this period yet. Try this week or this month.',
    newsLabel:ar?'أخبار':'News',filingLabel:ar?'إفصاحات':'Filings',linkedLabel:ar?'شركات في المصدرين':'Companies in both',
    openLabel:ar?'افتح القصة والمصادر':'Open the story & sources',moreLabel:ar?'كل المصادر':'All sources',
    companyLabel:ar?'افتح الشركة':'Open company',generalLabel:ar?'أخبار السوق دون شركة محددة':'Market-wide sources',
    calendarLabel:ar?'أجندة الإفصاحات والمواعيد':'Release Calendar & Filings',
    legacyLabel:ar?'التسلسل الزمني الأصلي · نافذة مستقلة من أربعة أيام':'Original evidence timelines · separate four-day window'};
}

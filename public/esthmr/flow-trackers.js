import { React as R } from './react-shim.js';

const h = R.createElement;
const finite = v => typeof v === 'number' && Number.isFinite(v);
const signed = v => finite(v) ? `${v > 0 ? '+' : ''}${v.toFixed(2)}%` : '—';
const compact = v => finite(v) ? new Intl.NumberFormat('en', { notation:'compact', maximumFractionDigits:2 }).format(v) : '—';
const tone = v => v > 0 ? 'var(--up)' : v < 0 ? 'var(--down)' : 'var(--t2)';
const direction = action => ({bought:1, sold:-1, treasury_purchase:1, treasury_sale:-1})[action] || 0;
const safeLink = link => /^https:\/\/(www\.)?egx\.com\.eg\//i.test(link || '') ? link : null;

export function sectorWindow(sector, count = 20) {
  const history = (sector.history || []).slice(-count);
  const values = history.filter(b => finite(b.value));
  return { history, value:values.length ? values.reduce((s,b)=>s+b.value,0) : null,
    latest:history.at(-1) || {}, from:history[0]?.date || '', to:history.at(-1)?.date || '' };
}

export function ownershipRows(data, {ticker='', kind='all', investor='', count=90} = {}) {
  const end = data.insidersAsOf || data.asOf;
  const start = /^\d{4}-\d{2}-\d{2}$/.test(end || '')
    ? new Date(Date.parse(end+'T00:00:00Z') - (count-1)*86400000).toISOString().slice(0,10) : '';
  return (data.events || []).filter(r => (!ticker || r.ticker === ticker)
    && (!investor || r.investorName === investor)
    && (!start || (r.date && r.date >= start && r.date <= end))
    && (kind === 'all' || (kind === 'treasury' ? r.action?.startsWith('treasury_') : !r.action?.startsWith('treasury_'))))
    .sort((a,b)=>(b.date || '').localeCompare(a.date || '') || String(a.id).localeCompare(String(b.id)));
}

// One dated observation per column. Missing values break the line, never zero-fill.
export function linePath(points, key) {
  const vals=points.map(p=>p[key]).filter(finite);
  if (!vals.length) return '';
  const lo=Math.min(...vals), hi=Math.max(...vals), span=hi-lo || 1;
  let open=false;
  return points.map((p,i)=>{
    if (!finite(p[key])) { open=false; return ''; }
    const command=open?'L':'M'; open=true;
    return `${command}${(8+i/Math.max(1,points.length-1)*584).toFixed(2)} ${(108-(p[key]-lo)/span*96).toFixed(2)}`;
  }).join(' ');
}

function chart(points, key, title, format=compact) {
  const valid=points.filter(p=>finite(p[key]));
  if (valid.length < 2) return h('p',{className:'ft-empty'},title+' · —');
  const vals=valid.map(p=>p[key]);
  return h('div',{className:'ft-chart-shell'},h('figure',{className:'ft-chart','data-chart-title':title},
    h('figcaption',null,h('span',null,title),h('b',{dir:'ltr'},`${format(Math.min(...vals))} – ${format(Math.max(...vals))}`)),
    h('svg',{viewBox:'0 0 600 120',role:'img','aria-label':`${title}: ${points[0].date} → ${points.at(-1).date}`},
      [24,64,108].map(y=>h('line',{x1:8,x2:592,y1:y,y2:y,stroke:'var(--rule2)',strokeWidth:1})),
      h('path',{d:linePath(points,key),fill:'none',stroke:'var(--accent)',strokeWidth:2.5,vectorEffect:'non-scaling-stroke'})),
    h('div',{className:'ft-chart-dates',dir:'ltr'},h('span',null,points[0].date),h('span',null,points.at(-1).date))));
}

function metric(label, value, sub) {
  return h('div',{className:'ft-metric'},h('span',null,label),h('strong',{dir:'ltr'},value),sub&&h('small',null,sub));
}
function button(label, fn, active=false) {
  return h('button',{type:'button',className:'ft-pill',onClick:fn,'aria-pressed':String(active)},label);
}
function select(label,value,options,onChange) {
  return h('label',{className:'ft-select'},h('span',null,label),h('select',{value,onChange:e=>onChange(e.target.value)},
    options.map(([id,name])=>h('option',{value:id,selected:id===value?'selected':null},name))));
}
function band(sec, latest) {
  const total=sec.cap || 1;
  return h('div',{className:'ft-band','aria-hidden':'true'},
    h('i',{style:{width:Math.min(100,(latest.upCap||0)/total*100)+'%',background:'var(--up)'}}),
    h('i',{style:{width:Math.min(100,(latest.downCap||0)/total*100)+'%',background:'var(--down)'}}));
}

export function flowTrackers(component, data, ar) {
  const t=(en,arabic)=>ar?arabic:en, st=component.state, d=data.flowTrackers;
  const go=screen=>component.setState({screen});
  const sectorTitle=t('Sector pulse','نبض سيولة القطاعات');
  const ownerTitle=t('Ownership lens','عدسة الملكية');
  const ready=d?.schemaVersion===1;
  const preview=ready?d:data.flowPreview;
  const sectors=preview?.sectors || [];
  const titleOf=s=>ar?s.nameAr:s.name;
  const top=[...sectors].sort((a,b)=>(b.history.at(-1)?.value||0)-(a.history.at(-1)?.value||0)).slice(0,4);
  const home=h('section',{className:'ft-portals','aria-label':t('Follow the money and ownership','تتبّع التداول والملكية')},
    h('button',{type:'button',className:'ft-portal ft-portal-sector',onClick:()=>go('liquidity')},
      h('span',{className:'ft-eyebrow'},t('THE BIG PICTURE','الصورة الأوسع')),
      h('h2',null,sectorTitle),h('p',null,t('Where activity meets market size.','حجم التداول بجوار وزن القطاع.')),
      h('div',{className:'ft-preview'},top.length?top.map(s=>h('div',{className:'ft-preview-row'},
        h('span',null,titleOf(s)),band(s,s.history.at(-1)||{}),h('b',{dir:'ltr'},signed(s.history.at(-1)?.change)))):
        h('span',null,t('Sector size · trading value · price movement','حجم القطاع · قيمة التداول · حركة السعر'))),
      top.length>0&&h('small',{className:'ft-note'},t('Size in rising / falling stocks · ','الحجم في الأسهم الصاعدة / الهابطة · ')+(preview.asOf||'')),
      h('span',{className:'ft-portal-foot'},t('Explore sector liquidity','استكشف سيولة القطاعات'),h('span',{'aria-hidden':'true'},'↗'))),
    h('button',{type:'button',className:'ft-portal ft-portal-owner',onClick:()=>go('ownership')},
      h('span',{className:'ft-eyebrow'},t('BEHIND THE DISCLOSURE','ما وراء الإفصاح')),
      h('h2',null,ownerTitle),h('p',null,t('A million shares means more with context.','مليون سهم… لكن كام في المئة من الشركة؟')),
      h('div',{className:'ft-owner-preview'},h('div',{className:'ft-orbit','aria-hidden':'true'},h('span',null,'%')),
        h('div',null,h('strong',null,ready?compact(d.events.length):compact(preview?.eventCount)),h('span',null,t('disclosures to explore','إفصاح للاستكشاف')))),
      h('span',{className:'ft-portal-foot'},t('See stake & value context','شاهد سياق الحصة والقيمة'),h('span',{'aria-hidden':'true'},'↗'))));
  const header=title=>h('header',{className:'ft-heading'},h('span',{className:'ft-eyebrow'},'ESTHMR / '+t('MARKET OBSERVATORY','مرصد السوق')),
    h('h1',null,title),h('p',null,t('Published observations, not investment instructions.','بيانات منشورة، وليست توجيهات استثمارية.')));
  if (!ready) return {home,screen:h('section',{className:'ft-screen'},header(st.screen==='ownership'?ownerTitle:sectorTitle),
    h('div',{className:'ft-empty',role:'status'},data.demo
      ?t('Sign in to explore published sector and ownership data. No invented holdings are shown here.','سجّل الدخول لاستكشاف بيانات القطاعات والملكية المنشورة. لا نعرض حصصاً افتراضية هنا.')
      :st.flowLoading?t('Loading the published history…','جارٍ تحميل التاريخ المنشور…')
      :t('The tracker data has not arrived. Retry to load the published snapshot.','لم تصل بيانات المتتبّع بعد. أعد المحاولة لتحميل اللقطة المنشورة.')),
    !data.demo&&!st.flowLoading&&button(t('Retry data','إعادة التحميل'),()=>component.onRetryData?.()))};

  if (st.screen==='liquidity') {
    const count=[1,5,20,60,120].includes(st.flowRange)?st.flowRange:20;
    const sort=st.flowSort || 'value';
    const rows=sectors.map(s=>({...s,...sectorWindow(s,count)})).sort((a,b)=>
      sort==='cap'?(b.cap||0)-(a.cap||0):sort==='change'?(b.latest.change??-Infinity)-(a.latest.change??-Infinity):(b.latest.value||0)-(a.latest.value||0));
    const selected=rows.find(s=>s.id===st.flowSector)||rows[0];
    const details=selected&&h('section',{className:'ft-detail',id:'ft-sector-detail',tabIndex:'-1'},
      h('div',{className:'ft-section-heading'},h('h2',null,titleOf(selected)),h('span',{dir:'ltr'},`${selected.from} → ${selected.to}`)),
      h('div',{className:'ft-metrics'},
        metric(t('Market size · EGP','القيمة السوقية · ج.م'),compact(selected.cap),`${selected.capCount}/${selected.members.length} `+t('companies sized','شركة لها قيمة سوقية')),
        metric(t('Traded value · EGP','قيمة التداول · ج.م'),compact(selected.value),t('Selected window; estimates included','الفترة المختارة؛ تشمل تقديرات')),
        metric(t('Latest size-weighted move','آخر حركة مرجّحة بالحجم'),signed(selected.latest.change),t('Current market-cap weights','أوزان القيمة السوقية الحالية')),
        metric(t('Latest turnover / size','آخر تداول / حجم القطاع'),selected.cap&&finite(selected.latest.value)?(selected.latest.value/selected.cap*100).toFixed(2)+'%':'—',t('Activity, not net inflow','نشاط تداول، وليس صافي تدفق'))),
      h('div',{className:'ft-charts'},chart(selected.history,'value',t('Daily traded value · EGP (estimated where needed)','قيمة التداول اليومية · ج.م (تقديرية عند الحاجة)')),
        chart(selected.history,'change',t('Daily price move · current size weights','حركة السعر اليومية · بأوزان الحجم الحالي'),signed)),
      h('div',{className:'ft-balanced'},
        metric(t('Total matched purchases','إجمالي المشتريات المقابلة'),compact(selected.value)+' EGP'),
        h('b',{'aria-hidden':'true'},'='),metric(t('Total matched sales','إجمالي المبيعات المقابلة'),compact(selected.value)+' EGP')),
      h('p',{className:'ft-note'},t('Every executed trade has a buyer and seller. These are two sides of the same turnover, not separate inflows/outflows. Buyer-initiated versus seller-initiated value is not available in this feed.',
        'لكل صفقة منفذة مشترٍ وبائع. هذان جانبا قيمة التداول نفسها، وليسا تدفقاً داخلاً وخارجاً. لا يحدد المصدر قيمة الصفقات التي بدأها المشترون مقابل البائعين.')),
      h('details',null,h('summary',null,t('Companies & calculation notes','الشركات وتفاصيل الحساب')),
        h('div',{className:'ft-company-list'},selected.members.map(m=>button(m.ticker,()=>component.setState({screen:'company',ticker:m.ticker})))),
        h('p',null,t('Historical turnover uses close × volume when actual traded value is unavailable. Daily price moves use today’s fixed market-cap weights: this is not a historical sector index or investment return. Moves over 30% are withheld for corporate-action review. Missing observations stay missing.',
          'نقدّر التداول التاريخي بسعر الإغلاق × الحجم عند غياب القيمة الفعلية. حركة السعر اليومية تستخدم أوزان القيمة السوقية الحالية الثابتة: ليست مؤشراً تاريخياً للقطاع أو عائداً استثمارياً. تُحجب التحركات فوق ٣٠٪ لمراجعة إجراءات الشركات، وتظل البيانات المفقودة غير متاحة.')),
        h('p',null,`${t('Latest coverage','تغطية آخر جلسة')}: ${selected.latest.valueCount || 0}/${selected.members.length} · ${t('Estimated values','قيم تقديرية')}: ${selected.latest.estimatedCount || 0} · ${t('Weight coverage','تغطية الأوزان')}: ${compact(selected.latest.weightCoverage)}% · ${t('Flagged moves','تحركات للمراجعة')}: ${selected.latest.flagged || 0}`),
        h('p',null,t('Historical market size is not reconstructed without dated share-capital records. Non-EGP listings excluded: ','لا نعيد بناء الحجم السوقي التاريخي دون سجلات رأس مال مؤرخة. مستبعدة لاختلاف العملة: ')+d.excludedCurrencyCount)));
    const openSector=id=>{
      component.setState({flowSector:id});
      if (typeof requestAnimationFrame==='function') requestAnimationFrame(()=>{
        const panel=document.getElementById('ft-sector-detail');
        panel?.scrollIntoView({block:'start',behavior:'instant'});
        panel?.focus({preventScroll:true});
      });
    };
    return {home,screen:h('section',{className:'ft-screen'},header(sectorTitle),
      h('div',{className:'ft-toolbar'},h('div',{className:'ft-pills'},[1,5,20,60,120].map(n=>button(n+' '+t('sessions','جلسة'),()=>component.setState({flowRange:n}),count===n))),
        select(t('Sort sectors','ترتيب القطاعات'),sort,[['value',t('Latest trading value','آخر قيمة تداول')],['cap',t('Market size','القيمة السوقية')],['change',t('Latest weighted move','آخر حركة مرجّحة')]],v=>component.setState({flowSort:v}))),
      h('p',{className:'ft-note'},`${d.asOf} · ${d.isClose?t('Published close','إغلاق منشور'):t('Provisional snapshot','لقطة غير نهائية')} · `+t('Bars: market size in rising / falling stocks; grey includes flat or missing moves.','الشريط: الحجم السوقي للأسهم الصاعدة / الهابطة؛ الرمادي يشمل الثابت وغير المتاح.')),
      h('div',{className:'ft-sector-grid'},rows.map(s=>h('button',{type:'button',className:'ft-sector-tile',onClick:()=>openSector(s.id),'aria-pressed':String(selected?.id===s.id)},
        h('span',null,titleOf(s)),h('strong',{dir:'ltr',style:{color:tone(s.latest.change)}},signed(s.latest.change)),band(s,s.latest),
        h('div',{className:'ft-tile-meta'},h('span',null,t('Size','الحجم')+' '+compact(s.cap)),h('b',null,t('Traded','تداول')+' '+compact(s.latest.value))),
        h('small',null,(s.latest.date||'—')+' · '+t('Open breakdown ↓','افتح التفاصيل ↓'))))),details,
      selected&&h('details',{className:'ft-method'},h('summary',null,t('Read the chart values','اقرأ أرقام الرسم')),
        h('div',{className:'ft-table-wrap'},h('table',{className:'ft-table'},
          h('thead',null,h('tr',null,[t('Session','الجلسة'),t('Traded EGP','تداول ج.م'),t('Weighted move','حركة مرجّحة'),t('Companies with value','شركات بقيمة تداول')].map(label=>h('th',{scope:'col'},label)))),
          h('tbody',null,[...selected.history].reverse().map(b=>h('tr',null,h('th',{scope:'row'},b.date),h('td',null,compact(b.value)),h('td',null,signed(b.change)),h('td',null,b.valueCount))))))))};
  }

  if (st.screen !== 'ownership') return {home, screen:null};
  const profiles=d.profiles || {}, ticker=st.ownershipTicker || '', kind=st.ownershipKind || 'all';
  const count=[7,30,90,365].includes(st.ownershipRange)?st.ownershipRange:90;
  const investor=st.ownershipInvestor || '';
  const rows=ownershipRows(d,{ticker,kind,investor,count}), profile=profiles[ticker];
  const investors=[...new Set((d.events || []).filter(r=>!ticker || r.ticker===ticker).map(r=>r.investorName).filter(Boolean))].sort();
  const dates=[...new Set(rows.map(r=>r.date).filter(Boolean))].sort();
  const timeline=dates.map(date=>{
    const events=rows.filter(r=>r.date===date);
    const known=events.filter(r=>direction(r.action)&&finite(r.shares));
    const valued=known.filter(r=>finite(r.currentMarkedValue) && (profiles[r.ticker]?.currency==='EGP' || ticker));
    return {date, value:valued.length?valued.reduce((s,r)=>s+direction(r.action)*r.currentMarkedValue,0):null,
      change:profile?.shares&&known.length?known.reduce((s,r)=>s+direction(r.action)*r.shares,0)/profile.shares*100:null};
  });
  const stakeRows=rows.filter(r=>finite(r.ownershipAfterPercent));
  const stakeHistory=ticker&&investor?[...stakeRows].reverse().map(r=>({date:r.date,stake:r.ownershipAfterPercent})):[];
  const names=new Set(rows.map(r=>r.investorName).filter(Boolean));
  const currency=profile?.currency || 'EGP';
  const priceFrom = new Date(Date.parse(d.asOf+'T00:00:00Z')-(count-1)*86400000).toISOString().slice(0,10);
  const pricePoints=(profile?.prices || []).filter(p=>p.date>=priceFrom);
  const actions={bought:t('Purchase','مشتريات'),sold:t('Sale','مبيعات'),treasury_purchase:t('Treasury purchase','شراء خزينة'),treasury_sale:t('Treasury sale','بيع خزينة')};
  const tableRow=r=>{
    const p=profiles[r.ticker] || {}, pct=r.referencePercent;
    const actual=finite(r.ownershipBeforePercent)&&finite(r.ownershipAfterPercent);
    return h('article',{className:'ft-event'},
      h('div',{className:'ft-event-head'},h('time',null,r.date||t('Date not supplied','التاريخ غير متاح')),
        h('span',{className:'ft-direction',style:{color:tone(direction(r.action))}},actions[r.action]||t('Disclosure','إفصاح'))),
      h('div',{className:'ft-event-party'},h('button',{type:'button',className:'ft-company-link',disabled:!profiles[r.ticker],onClick:()=>component.setState({screen:'company',ticker:r.ticker,companyPanel:'filings'})},r.ticker||r.company||'—'),
        h('span',null,r.investorName||(r.action?.startsWith('treasury_')?t('Company treasury','خزينة الشركة'):t('Investor not named','اسم المتعامل غير منشور')))),
      h('p',null,ar?r.relationshipLabelAr||r.relationship:r.relationshipLabel||r.relationship),
      h('div',{className:'ft-event-numbers'},
        metric(actual?t('Disclosed ownership','الملكية المفصح عنها'):t('Trade / current share capital','الصفقة / عدد الأسهم الحالي'),actual?`${r.ownershipBeforePercent}% → ${r.ownershipAfterPercent}%`:finite(pct)?pct.toFixed(4)+'%':'—',actual?t('Before → after','قبل ← بعد'):t('Reference scale, not ownership change','مقياس مرجعي، وليس تغير الملكية')),
        metric(t('At latest published price','بسعر السهم المنشور الأخير'),compact(r.currentMarkedValue)+' '+(p.currency||''),p.date||''),
        metric(t('Disclosed shares','الأسهم المفصح عنها'),compact(r.shares))),
      h('div',{className:'ft-stake-track','aria-hidden':'true'},h('i',{style:{width:finite(pct)?Math.min(100,Math.max(0,pct))+'%':'0%',background:tone(direction(r.action))}})),
      h('small',{className:'ft-note'},t('Track is 0–100% of current shares. Marked value is not the execution amount.','الشريط من ٠–١٠٠٪ من الأسهم الحالية. القيمة بسعر اليوم ليست مبلغ التنفيذ.')),
      safeLink(r.link)&&h('a',{href:safeLink(r.link),target:'_blank',rel:'noopener noreferrer',className:'ft-source'},t('Official disclosure ↗','الإفصاح الرسمي ↗')));
  };
  const pageSize=24, page=Math.min(Math.max(0,st.ownershipPage||0),Math.max(0,Math.ceil(rows.length/pageSize)-1));
  return {home,screen:h('section',{className:'ft-screen'},header(ownerTitle),
    h('div',{className:'ft-toolbar'},
      select(t('Company','الشركة'),ticker,[['',t('All companies','كل الشركات')],...Object.keys(profiles).filter(k=>d.events.some(r=>r.ticker===k)).sort().map(k=>[k,k+' · '+(profiles[k].name?.[ar?'ar':'en']||k)])],v=>component.setState({ownershipTicker:v,ownershipInvestor:'',ownershipPage:0})),
      select(t('Party type','نوع الطرف'),kind,[['all',t('All disclosures','كل الإفصاحات')],['insiders',t('Insiders & shareholders','داخليون ومساهمون')],['treasury',t('Company treasury','خزينة الشركة')]],v=>component.setState({ownershipKind:v,ownershipPage:0})),
      investors.length>0&&select(t('Named investor','اسم المتعامل'),investor,[['',t('All disclosed names','كل الأسماء المنشورة')],...investors.map(name=>[name,name])],v=>component.setState({ownershipInvestor:v,ownershipPage:0})),
      h('div',{className:'ft-pills'},[7,30,90,365].map(n=>button(n+' '+t('days','يوماً'),()=>component.setState({ownershipRange:n,ownershipPage:0}),count===n)))),
    h('p',{className:'ft-note'},t('Window ends at latest disclosure: ','تنتهي الفترة عند أحدث إفصاح: ')+d.insidersAsOf),
    h('div',{className:'ft-metrics'},metric(t('Disclosures in view','إفصاحات في العرض'),compact(rows.length)),metric(t('Named investors','متعاملون بأسماء منشورة'),compact(names.size)),
      metric(t('Disclosed ownership stakes','حصص ملكية مفصح عنها'),compact(stakeRows.length)),metric(t('Current reference share count','عدد الأسهم المرجعي الحالي'),compact(profile?.shares),profile?.sharesDate||t('Choose a company','اختر شركة'))),
    h('div',{className:'ft-charts'},chart(timeline,'value',t('Daily disclosed net trades · marked at latest price, ','صافي الصفقات المفصح عنها يومياً · بسعر اليوم، ')+currency),
      ticker?chart(timeline,'change',t('Daily net shares / current share capital','صافي الأسهم اليومي / عدد الأسهم الحالي'),signed):h('div',{className:'ft-explain'},h('span',{className:'ft-orbit-small'},'%'),h('h2',null,t('Ownership needs a denominator.','النسبة أهم… وتحتاج مقاماً صحيحاً.')),
        h('p',null,t('Choose one company to compare disclosed trades with its current total shares. Percentages across different companies cannot be added.','اختر شركة لمقارنة صفقاتها بعدد أسهمها الحالي. لا يصح جمع نسب شركات مختلفة.')))),
    h('details',{className:'ft-method'},h('summary',null,t('What this can—and cannot—tell you','ما الذي توضحه هذه البيانات وما الذي لا توضحه؟')),
      h('p',null,t('This is a disclosure timeline, not a shareholder register. We do not reconstruct a person’s holdings from unnamed trades. Exact ownership changes require verified before/after stakes. A trade divided by today’s shares is only a scale reference: splits, capital changes and treasury cancellations can change that denominator.',
        'هذا تسلسل للإفصاحات وليس سجل المساهمين. لا نستنتج ملكية شخص من صفقات مجهولة الاسم. التغير الدقيق يحتاج نسباً موثقة قبل وبعد. قسمة الصفقة على أسهم اليوم مقياس للحجم فقط؛ التجزئة وزيادات رأس المال وإلغاء الخزينة قد تغير المقام.')),
      h('p',null,t('Charts include known share counts only. Missing amounts and days without disclosures are not zero activity. Current-price values are not execution proceeds or historical portfolio values. Cross-company EGP charts exclude non-EGP shares.','تشمل الرسوم أعداد الأسهم المتاحة فقط. غياب المبلغ أو الإفصاح لا يعني عدم التداول. قيم سعر اليوم ليست حصيلة التنفيذ أو قيمة محفظة تاريخية. رسوم الجنيه عبر الشركات تستبعد الأسهم بعملات أخرى.'))),
    ticker&&chart(pricePoints,'close',t('Published share price history · ','تاريخ سعر السهم المنشور · ')+currency,v=>v.toFixed(2)),
    stakeHistory.length>1&&chart(stakeHistory,'stake',t('Disclosed stake history · ','تاريخ الحصة المفصح عنها · ')+investor,v=>v.toFixed(2)+'%'),
    rows.length?h('div',{className:'ft-event-grid'},rows.slice(page*pageSize,(page+1)*pageSize).map(tableRow)):
      h('p',{className:'ft-empty'},t('No disclosures in this window. Try a longer period or another company.','لا توجد إفصاحات بهذه الفترة. جرّب فترة أطول أو شركة أخرى.')),
    h('div',{className:'ft-pagination'},h('button',{type:'button',disabled:page===0,onClick:()=>component.setState({ownershipPage:page-1})},t('Previous','السابق')),
      h('span',null,`${page+1} / ${Math.max(1,Math.ceil(rows.length/pageSize))}`),
      h('button',{type:'button',disabled:(page+1)*pageSize>=rows.length,onClick:()=>component.setState({ownershipPage:page+1})},t('Next','التالي'))))};
}

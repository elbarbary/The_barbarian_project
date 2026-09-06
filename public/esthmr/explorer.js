// Reader-selected rankings; no composite score or implied investment recommendation.
export function explorer(component, companies, ar) {
  const st = component.state;
  const finite = v => typeof v === 'number' && Number.isFinite(v);
  const metrics = [
    { id:'cap', label:ar?'القيمة السوقية':'Market cap', unit:'EGP', read:c=>c.cap>0?c.cap:null, money:true },
    { id:'close', label:ar?'سعر السهم':'Share price', unit:ar?'عملة التداول':'Quote currency', read:c=>c.foreignCurrency || !(c.close>0) ? null : c.close },
    { id:'dividend_yield', label:ar?'عائد التوزيعات':'Dividend yield', unit:'%', read:c=>c.ratios?.dividend_yield },
    { id:'profit', label:ar?'صافي الربح السنوي':'Annual net profit', unit:ar?'مليون جنيه · السنة المُعلنة':'EGP m · filed year', read:c=>c.profit },
    { id:'debt_equity', label:ar?'الدين / حقوق الملكية':'Debt / equity', unit:'×', read:c=>c.ratios?.debt_equity },
  ];
  const key = metrics.some(m=>m.id===st.rankMetric) ? st.rankMetric : 'cap';
  const secondary = metrics.find(m=>m.id===st.rankPair && m.id!==key);
  const primary = metrics.find(m=>m.id===key);
  const direction = st.rankAscending ? 1 : -1;
  const format = (c, m) => {
    const value=m.read(c);
    if (!finite(value)) return '—';
    return m.money ? component.money(value) : component.num(value,2) + (m.unit==='%'?'%':m.unit==='×'?'×':'');
  };
  const order = (a,b) => {
    const av=primary.read(a), bv=primary.read(b);
    if (!finite(av) || !finite(bv)) return Number(!finite(av))-Number(!finite(bv));
    return (av-bv)*direction || a.ticker.localeCompare(b.ticker);
  };
  const query=component.fold(st.screen==='home'?'':(st.q||''));
  const filtered=companies.filter(c=>(st.screen==='home' || !st.sector || st.sector==='All' || c.sector===st.sector)
    && (!query || component.fold(c.ticker+' '+c.name.en+' '+c.name.ar).includes(query)));
  const sorted=filtered.slice().sort(order);
  const active=[primary,...(secondary?[secondary]:[])];
  const row=(c,i)=>({ ticker:c.ticker, name:component.nm(c.name), rank:finite(primary.read(c))?String(i+1):'—',
    sector:ar?(c.sectorAr||c.sector):c.sector,
    go:()=>component.setState({screen:'company',ticker:c.ticker}),
    cells:active.map(m=>({value:format(c,m),note:m.id==='profit'?(c.profitPeriod||''):m.id==='close'?(c.currency||'EGP'):''})) });
  const open=(mode)=>component.setState({screen:'market',marketMode:mode,q:'',sector:'All',rqs:[]});
  const volume=filtered.filter(c=>finite(c.rv)&&c.rv>=2).sort((a,b)=>b.rv-a.rv);
  const volumeRows=volume.map((c,i)=>({ ...row(c,i),rank:String(i+1),cells:[
    {value:component.num(c.rv,1)+'×',note:ar?'مقارنة بالمعتاد':'versus usual'},
    {value:finite(c.volume)?component.num(c.volume,0):'—',note:ar?'سهم في الجلسة':'session shares'},
    {value:finite(c.medianVolume)?component.num(c.medianVolume,0):'—',note:ar?'وسيط ٢٠ جلسة':'20-session median'},
    {value:finite(c.close)?(c.currency||'EGP')+' '+component.num(c.close):'—',note:component.pct(c.pct)},
  ]}));
  const isVolume=st.marketMode==='volume';
  return {
    title:ar?'رتّب السوق بطريقتك':'The market, ranked your way',
    subtitle:ar?'اختر مقياساً للترتيب، وأضف مقياساً للمقارنة بجانبه.':'Choose a measure to rank stocks. Add a second to compare them side by side.',
    note:ar?'بيانات للمقارنة فقط. الشرطتان تعنيان غياب البيانات. الربح حسب السنة المُعلنة؛ الديون كنسبة إلى حقوق الملكية. ترتيب السعر يشمل الأسهم بالجنيه فقط.':'Descriptive figures only. — means unavailable. Profits use each filed year; debt is shown relative to equity. Price ranking includes EGP quotes only.',
    metrics:metrics.map(m=>({...m,selected:m.id===key,go:()=>component.setState({rankMetric:m.id,rankPair:st.rankPair===m.id?'':st.rankPair})})),
    pairs:metrics.filter(m=>m.id!==key).map(m=>({...m,selected:m.id===secondary?.id,go:()=>component.setState({rankPair:st.rankPair===m.id?'':m.id})})),
    pairLabel:ar?'قارنه مع':'Pair with',
    companyLabel:ar?'الشركة':'Company',
    directionLabel:st.rankAscending?(ar?'الأقل أولاً ↑':'Lowest first ↑'):(ar?'الأعلى أولاً ↓':'Highest first ↓'),
    toggleDirection:()=>component.setState({rankAscending:!st.rankAscending}),
    // No `preview` here any more. A five-row cut of a ranked list, on the
    // Home screen, is a shortlist of named companies rendered as a lead — the
    // shape the publisher may not put in front of a reader, whichever measure
    // the reader chose and however it is worded. Home keeps the controls and
    // the way in; the table lives only on the screen that shows all of it.
    rows:isVolume?volumeRows:sorted.map(row),
    compareLabel:ar?'قارن السوق':'Compare the market',
    resultsLabel:ar?'اعرض جدول النتائج':'Show results table',
    selectionLabel:primary.label+' · '+(st.rankAscending?(ar?'الأقل أولاً':'Lowest first'):(ar?'الأعلى أولاً':'Highest first'))+(secondary?' + '+secondary.label:''),
    rankColumns:active,
    columns:isVolume?[
      {label:ar?'الحجم النسبي':'Relative volume',unit:'×'}, {label:ar?'حجم الجلسة':'Session volume',unit:ar?'أسهم':'shares'},
      {label:ar?'الحجم المعتاد':'Usual volume',unit:ar?'أسهم':'shares'}, {label:ar?'السعر والتغير':'Price & change',unit:''},
    ]:active,
    empty:isVolume?!volumeRows.length:!sorted.length,
    coverage:ar?`${sorted.filter(c=>finite(primary.read(c))).length} من ${sorted.length} شركة لديها هذا المقياس`:`${sorted.filter(c=>finite(primary.read(c))).length} of ${sorted.length} companies report this measure`,
    count:isVolume?volumeRows.length:sorted.length,
    open:()=>open('rankings'), openVolume:()=>open('volume'),
    isVolume, isRanking:st.marketMode==='rankings', isExplorer:['rankings','volume'].includes(st.marketMode), isPrices:!['rankings','volume'].includes(st.marketMode),
    views:[['','الأسعار','Prices'],['rankings','الترتيب والمقارنة','Rank & compare'],['volume','حجم غير معتاد','Unusual volume']].map(([id,a,en])=>({label:ar?a:en,selected:(st.marketMode||'')===id,go:()=>component.setState({marketMode:id})})),
  };
}

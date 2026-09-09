// Reader-selected rankings; no composite score or implied investment recommendation.
export function explorer(component, companies, ar, trendsMap = null) {
  const st = component.state;
  const finite = v => typeof v === 'number' && Number.isFinite(v);
  const getTrend = c => c.trends || (trendsMap && trendsMap[c.ticker]) || null;
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
  const open=(mode)=>component.setState({screen:'market',marketMode:mode,trendFilter:'',q:'',sector:'All',rqs:[]});
  const volume=filtered.filter(c=>finite(c.rv)&&c.rv>=2).sort((a,b)=>b.rv-a.rv);
  const volumeRows=volume.map((c,i)=>({ ...row(c,i),rank:String(i+1),cells:[
    {value:component.num(c.rv,1)+'×',note:ar?'مقارنة بالمعتاد':'versus usual'},
    {value:finite(c.volume)?component.num(c.volume,0):'—',note:ar?'سهم في الجلسة':'session shares'},
    {value:finite(c.medianVolume)?component.num(c.medianVolume,0):'—',note:ar?'وسيط ٢٠ جلسة':'20-session median'},
    {value:finite(c.close)?(c.currency||'EGP')+' '+component.num(c.close):'—',note:component.pct(c.pct)},
  ]}));

  // Trends & 52-Week Highs
  const trendFilter = st.trendFilter || '';
  const trendList = filtered.filter(c => {
    const t = getTrend(c);
    return t && finite(t.distHigh52);
  });
  const filteredTrends = trendList.filter(c => {
    const t = getTrend(c);
    if (trendFilter === 'near_high') return t.isNearHigh52;
    if (trendFilter === 'new_high') return t.isNewHigh;
    if (trendFilter === 'gain_1y') return finite(t.chg1y) && t.chg1y > 0;
    if (trendFilter === 'gain_3m') return finite(t.chg3m) && t.chg3m > 0;
    if (trendFilter === 'above_ma50') return t.aboveMa50;
    return true;
  });

  const trendOrder = (a, b) => {
    const ta = getTrend(a), tb = getTrend(b);
    if (trendFilter === 'gain_1y') return (tb.chg1y || -999) - (ta.chg1y || -999);
    if (trendFilter === 'gain_3m') return (tb.chg3m || -999) - (ta.chg3m || -999);
    return (tb.distHigh52 || -999) - (ta.distHigh52 || -999);
  };

  const sortedTrends = filteredTrends.slice().sort(trendOrder);
  const trendRows = sortedTrends.map((c, i) => {
    const t = getTrend(c);
    const isNew = t.distHigh52 >= -0.5;
    const noteHigh = isNew
      ? (ar ? '🚀 قمة جديدة' : '🚀 New High')
      : (t.distHigh52 === 0 ? (ar ? 'عند القمة' : 'At High') : `${component.num(t.distHigh52, 1)}% ${ar ? 'من القمة' : 'from high'}`);
    const noteMa = t.aboveMa50
      ? (ar ? 'فوق متوسط ٥٠ يوم' : 'Above 50d MA')
      : (ar ? 'تحت متوسط ٥٠ يوم' : 'Below 50d MA');

    return {
      ...row(c, i),
      rank: String(i + 1),
      cells: [
        {
          value: finite(c.close) ? (c.currency || 'EGP') + ' ' + component.num(c.close, 2) : '—',
          note: noteMa,
        },
        {
          value: finite(t.high52) ? component.num(t.high52, 2) : '—',
          note: noteHigh,
        },
        {
          value: finite(t.chg1y) ? component.pct(t.chg1y) : '—',
          note: ar ? `أدنى: ${component.num(t.low52, 2)}` : `Low: ${component.num(t.low52, 2)}`,
        },
        {
          value: finite(t.chg3m) ? component.pct(t.chg3m) : '—',
          note: ar ? 'أداء ٣ أشهر' : '3M return',
        },
      ]
    };
  });

  const isVolume = st.marketMode === 'volume';
  const isTrends = st.marketMode === 'trends';
  const isRanking = st.marketMode === 'rankings';
  const isExplorer = ['rankings', 'volume', 'trends'].includes(st.marketMode);
  const isPrices = !isExplorer;

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
    rows:isTrends?trendRows:(isVolume?volumeRows:sorted.map(row)),
    compareLabel:ar?'قارن السوق':'Compare the market',
    resultsLabel:ar?'اعرض جدول النتائج':'Show results table',
    selectionLabel:primary.label+' · '+(st.rankAscending?(ar?'الأقل أولاً':'Lowest first'):(ar?'الأعلى أولاً':'Highest first'))+(secondary?' + '+secondary.label:''),
    rankColumns:active,
    columns:isTrends?[
      {label:ar?'السعر':'Price',unit:''},
      {label:ar?'القمة السنوية 52W':'52W High',unit:''},
      {label:ar?'أداء سنة (1Y)':'1Y Return',unit:'%'},
      {label:ar?'أداء ٣ أشهر':'3M Return',unit:'%'},
    ]:(isVolume?[
      {label:ar?'الحجم النسبي':'Relative volume',unit:'×'}, {label:ar?'حجم الجلسة':'Session volume',unit:ar?'أسهم':'shares'},
      {label:ar?'الحجم المعتاد':'Usual volume',unit:ar?'أسهم':'shares'}, {label:ar?'السعر والتغير':'Price & change',unit:''},
    ]:active),
    trendFilters:[
      {id:'',label:ar?'الجميع':'All',selected:!trendFilter,go:()=>component.setState({trendFilter:''})},
      {id:'near_high',label:ar?'قرب القمة السنوية (≤ 5%)':'Near 52W High (≤ 5%)',selected:trendFilter==='near_high',go:()=>component.setState({trendFilter:'near_high'})},
      {id:'new_high',label:ar?'قمم جديدة':'New Highs',selected:trendFilter==='new_high',go:()=>component.setState({trendFilter:'new_high'})},
      {id:'gain_1y',label:ar?'الأقوى صعوداً سنوياً':'Top 1Y Gainers',selected:trendFilter==='gain_1y',go:()=>component.setState({trendFilter:'gain_1y'})},
      {id:'gain_3m',label:ar?'زخم ٣ أشهر':'3M Momentum',selected:trendFilter==='gain_3m',go:()=>component.setState({trendFilter:'gain_3m'})},
      {id:'above_ma50',label:ar?'فوق متوسط ٥٠ يوم':'Above 50d MA',selected:trendFilter==='above_ma50',go:()=>component.setState({trendFilter:'above_ma50'})},
    ],
    empty:isTrends?!trendRows.length:(isVolume?!volumeRows.length:!sorted.length),
    coverage:ar?`${sorted.filter(c=>finite(primary.read(c))).length} من ${sorted.length} شركة لديها هذا المقياس`:`${sorted.filter(c=>finite(primary.read(c))).length} of ${sorted.length} companies report this measure`,
    count:isTrends?trendRows.length:(isVolume?volumeRows.length:sorted.length),
    open:()=>open('rankings'), openVolume:()=>open('volume'), openTrends:()=>open('trends'),
    isVolume, isTrends, isRanking:st.marketMode==='rankings', isExplorer, isPrices,
    views:[
      ['','الأسعار','Prices'],
      ['rankings','الترتيب والمقارنة','Rank & compare'],
      ['volume','حجم غير معتاد','Unusual volume'],
      ['trends','اتجاهات الأسعار','Price trends'],
    ].map(([id,a,en])=>({label:ar?a:en,selected:(st.marketMode||'')===id,go:()=>component.setState({marketMode:id,trendFilter:''})})),
  };
}

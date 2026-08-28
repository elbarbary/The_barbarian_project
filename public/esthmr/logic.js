/* The screens, ported from the Claude Design canvas.
 *
 * Everything below `class Component` is the design's own logic, carried over
 * unchanged: the bilingual copy, the derived rows, the sort and filter
 * behaviour, the chart maths. Two things were replaced — `data()`, which held
 * the mock-up's sample market and is now fed from data.js, and the base class,
 * which the design tool supplied and is written out here.
 *
 * Keeping the rest verbatim is the point: re-importing a revised design stays
 * a file copy rather than a translation.
 */

import React from './react-shim.js';

/** What the design tool called DCLogic: state, props, and a redraw hook. */
class Base {
  constructor(props) {
    this.props = props || {};
    this.onChange = null;
  }

  setState(patch) {
    Object.assign(this.state, typeof patch === 'function' ? patch(this.state) : patch);
    if (this.onChange) this.onChange();
  }

  /** The object the template's expressions are evaluated against. */
  scope() {
    return this.renderVals();
  }
}


export class Component extends Base {
  state = { screen:'home', theme:'light', lang:'en', range:'1Y', sort:'pct', dir:-1, sector:'All', q:'', open:{}, debtOpen:false, month:'2026-08' };

  // ── copy ──
  copy() {
    const en = {
      nothingYet:'Nothing published for this yet.',
      noBorrowings:'No filing held for this company states borrowings.',
      publisher:'Publisher · EGX filings', session:'Session', builtAt:'Built', theme:'Theme', dataVersion:'data_version',
      homeTitle:'The close', closeOf:'Official close of', movers:'Largest moves', readNow:'What to read now', watchlist:'Watchlist',
      closeNote:'Official close from market.json. Not a live price.',
      todayTitle:'Today', newestFirst:'Newest first', readAtSource:'Read at source', outletImage:'Outlet picture',
      marketTitle:'The market', searchPlaceholder:'Search 282 companies — English or Arabic',
      foldNote:'Search folds Arabic orthography: أ إ آ ٱ → ا, ة → ه, ى ئ → ي, ؤ → و, harakat and tatweel stripped on both sides.',
      marketFoot:'Sorting and filtering act on figures as filed. No ranking of companies is published.',
      noMatchTitle:'Nothing matches', noMatchBody:'No company in the filed set matches this search and this sector.', clearFilters:'Clear filters',
      lastClose:'Last close', asOf:'As of', priceHistory:'Price history', sessionsShown:'Sessions', whoTheyAre:'Who they are',
      asFiled:'Financials, as filed', egpMillions:'EGP millions unless stated', period:'Period', revenue:'Revenue',
      grossProfit:'Gross profit', operatingIncome:'Operating income', netIncome:'Net income',
      cumulativeWarning:'Periods are cumulative as the exchange files them. H1 and 9M are year-to-date and are not comparable to a single quarter. Nothing here is subtracted to synthesise a quarter, and a blank is a figure the filing did not state — not a zero.',
      openFiling:'Open filing', borrowingsTitle:'What it does with its borrowings', asAt:'As at', borrowings:'Borrowings', egpM:'EGP millions',
      dueWithinYear:'Due within a year', dueLater:'Due later', movementSince:'Movement since', pattern:'Pattern',
      whereFrom:'Where these figures come from',
      whereFromBody:'Read from the borrowing lines of the company’s own filed balance sheet — loans, bank facilities and lease liabilities, summed by maturity. Never from total liabilities, which also carry payables, provisions and customer advances that nobody lent the company.',
      sourceFiling:'Source filing', openSignedDoc:'Open the signed document', showSource:'Where these figures come from', hideSource:'Hide source',
      notCreditRating:'This is not a credit rating. The figures above are stated as filed, with no grade, band or colour attached to them.',
      whatIsUnusual:'What is unusual', itsFilings:'Its filings', egxArchive:'EGX archive', document:'Document',
      sectorsTitle:'Sectors', sectorsWord:'sectors', rose:'rose', fell:'fell', flat:'flat', medianPE:'Median P/E',
      calendarTitle:'Calendar', filed:'Filed', expected:'Expected', estimate:'Estimate',
      estimateNote:'Expected dates are estimated from each company’s own filing history. They are not announcements.',
      exchangeTitle:'Exchange', delayed15:'Quotes delayed ~15 minutes', macro:'Macro, in plain language',
      researchTitle:'Research', researchNote:'Bands describe the scorecard applied to a study. They describe no security.',
      readPaper:'Read the paper', scorecard:'Scorecard', publisherStamp:'ESTHMR · Publisher',
      legalNotLicensed:'ESTHMR is a publisher and is not licensed by the Financial Regulatory Authority. We do not buy, we do not sell, and we do not advise. Nothing here is a recommendation to trade any security.'
    };
    const ar = {
      nothingYet:'لم يُنشر شيء لهذا بعد.',
      noBorrowings:'لا يوجد إفصاح محفوظ لهذه الشركة يذكر قروضاً.',
      publisher:'ناشر · إفصاحات البورصة', session:'الجلسة', builtAt:'حُدِّث', theme:'المظهر', dataVersion:'إصدار البيانات',
      homeTitle:'الإغلاق', closeOf:'الإغلاق الرسمي ليوم', movers:'أكبر التحركات', readNow:'ما يُقرأ الآن', watchlist:'قائمة المتابعة',
      closeNote:'الإغلاق الرسمي من market.json، وليس سعراً لحظياً.',
      todayTitle:'اليوم', newestFirst:'الأحدث أولاً', readAtSource:'اقرأ في المصدر', outletImage:'صورة الجهة الناشرة',
      marketTitle:'السوق', searchPlaceholder:'ابحث في ٢٨٢ شركة — بالعربية أو الإنجليزية',
      foldNote:'يوحّد البحث الإملاء العربي: أ إ آ ٱ ← ا، ة ← ه، ى ئ ← ي، ؤ ← و، مع حذف الحركات والتطويل من الطرفين.',
      marketFoot:'الترتيب والتصفية يتمّان على الأرقام كما وردت في الإفصاح. لا يُنشر أي تصنيف للشركات.',
      noMatchTitle:'لا نتائج', noMatchBody:'لا توجد شركة في المجموعة المُفصح عنها تطابق هذا البحث وهذا القطاع.', clearFilters:'مسح التصفية',
      lastClose:'آخر إغلاق', asOf:'بتاريخ', priceHistory:'تاريخ السعر', sessionsShown:'جلسات', whoTheyAre:'من هي الشركة',
      asFiled:'القوائم المالية كما وردت', egpMillions:'بملايين الجنيهات ما لم يُذكر غير ذلك', period:'الفترة', revenue:'الإيرادات',
      grossProfit:'الربح الإجمالي', operatingIncome:'الربح التشغيلي', netIncome:'صافي الربح',
      cumulativeWarning:'الفترات تراكمية كما تُقدّمها البورصة. النصف الأول وتسعة أشهر أرقام من بداية العام ولا تُقارن بربع واحد. لا يُطرح شيء لاستخراج ربع، والخانة الفارغة رقم لم يذكره الإفصاح — وليست صفراً.',
      openFiling:'افتح الإفصاح', borrowingsTitle:'ما تفعله الشركة بقروضها', asAt:'كما في', borrowings:'القروض', egpM:'مليون جنيه',
      dueWithinYear:'يستحق خلال عام', dueLater:'يستحق لاحقاً', movementSince:'الحركة منذ', pattern:'النمط',
      whereFrom:'من أين جاءت هذه الأرقام',
      whereFromBody:'قُرئت من بنود القروض في الميزانية المُفصح عنها — القروض والتسهيلات البنكية والتزامات الإيجار، مجموعة بحسب تاريخ الاستحقاق. وليست من إجمالي الالتزامات الذي يضم دائنين ومخصصات ودفعات مقدمة من العملاء لم يقرضها أحد للشركة.',
      sourceFiling:'الإفصاح المصدر', openSignedDoc:'افتح المستند الموقّع', showSource:'من أين جاءت هذه الأرقام', hideSource:'إخفاء المصدر',
      notCreditRating:'هذا ليس تصنيفاً ائتمانياً. الأرقام أعلاه مذكورة كما وردت، دون درجة أو نطاق أو لون.',
      whatIsUnusual:'ما هو غير المعتاد', itsFilings:'إفصاحاتها', egxArchive:'أرشيف البورصة', document:'المستند',
      sectorsTitle:'القطاعات', sectorsWord:'قطاعاً', rose:'صعدت', fell:'هبطت', flat:'ثابتة', medianPE:'وسيط م/ر',
      calendarTitle:'التقويم', filed:'مُفصح عنه', expected:'متوقع', estimate:'تقدير',
      estimateNote:'التواريخ المتوقعة مُقدّرة من سجل إفصاحات كل شركة، وليست إعلانات.',
      exchangeTitle:'البورصة والاقتصاد', delayed15:'الأسعار متأخرة نحو ١٥ دقيقة', macro:'مؤشرات الاقتصاد بلغة واضحة',
      researchTitle:'الأبحاث', researchNote:'النطاقات تصف بطاقة تقييم الدراسة، ولا تصف أي ورقة مالية.',
      readPaper:'اقرأ الورقة', scorecard:'بطاقة التقييم', publisherStamp:'ESTHMR · ناشر',
      legalNotLicensed:'ESTHMR ناشر وغير مرخّص من الهيئة العامة للرقابة المالية. نحن لا نشتري ولا نبيع ولا نقدّم مشورة. لا شيء هنا توصية بالتعامل في أي ورقة مالية.'
    };
    return this.state.lang === 'ar' ? ar : en;
  }

  // ── helpers ──
  num(v, d) { if (v === null || v === undefined) return '—'; return v.toLocaleString('en-US',{minimumFractionDigits:d===undefined?2:d,maximumFractionDigits:d===undefined?2:d}); }
  signed(v, d) { if (v === null || v === undefined) return '—'; const s = v > 0 ? '+' : ''; return s + this.num(v, d); }
  pct(v) { if (v === null || v === undefined) return '—'; return (v>0?'+':'') + v.toFixed(2) + '%'; }
  dcol(v) { if (!v) return 'var(--faint)'; return v > 0 ? 'var(--up)' : 'var(--down)'; }
  fold(s) { return (s||'').toLowerCase().replace(/[أإآٱ]/g,'ا').replace(/ة/g,'ه').replace(/[ىئ]/g,'ي').replace(/ؤ/g,'و').replace(/[\u064B-\u0652\u0670\u0640]/g,''); }
  nm(o) { return this.state.lang === 'ar' ? (o.ar || o.en) : o.en; }
  go(screen) { return () => this.setState({ screen }); }

  // ── fixtures ──
  /** Whatever the page is currently allowed to show. Set by main.js. */
  data() {
    return this._d || { companies: [], series: [], fins: [] };
  }

  /** Replace the dataset and redraw — used when a sign-in changes the answer. */
  setData(next) {
    this._d = next;
    if (this.onChange) this.onChange();
  }

  renderVals() {
    const L = this.copy(), st = this.state, ar = st.lang === 'ar';
    const D = this.data();
    const acc = this.props.accent || 'var(--accent)';

    // Real documents carry both languages side by side; the design's literals
    // choose inline with `ar ? … : …`. This picks the same way for a mapped
    // record, so a wired screen and a placeholder one behave identically.
    const say = (rows, fields) => rows.map((row) => {
      const out = Object.assign({}, row);
      fields.forEach((f) => {
        if (row[f + 'Ar'] !== undefined) out[f] = ar ? row[f + 'Ar'] : row[f];
      });
      return out;
    });

    const ICON = {
      home:'M3.2 10.6 12 3.4l8.8 7.2M5.8 9.4V20a.6.6 0 0 0 .6.6h11.2a.6.6 0 0 0 .6-.6V9.4M9.9 20.6v-5.4h4.2v5.4',
      today:'M4.4 5.2h15.2v13.6H4.4zM7.4 8.6h5.6v4.2H7.4zM15.6 9h1.9M15.6 11.6h1.9M7.4 16.2h10.1',
      market:'M4.2 20V11.2M9.4 20V4.6M14.6 20v-6.6M19.8 20V7.8M3 20.8h18',
      company:'M6.2 20.8V4.2a.6.6 0 0 1 .6-.6h7a.6.6 0 0 1 .6.6v16.6M13.8 9.4h3.4a.6.6 0 0 1 .6.6v10.8M8.8 7.6h3M8.8 11.2h3M8.8 14.8h3M4.4 20.8h15.4',
      sectors:'M4.2 4.2h6.4v6.4H4.2zM13.4 4.2h6.4v6.4h-6.4zM4.2 13.4h6.4v6.4H4.2zM13.4 13.4h6.4v6.4h-6.4',
      calendar:'M4.4 6.4h15.2v13.4H4.4zM4.4 10.8h15.2M8.4 3.4v4M15.6 3.4v4M8 14.4h2M14 14.4h2',
      exchange:'M3.6 8.4h13.8l-3.4-3.6M20.4 15.6H6.6l3.4 3.6',
      research:'M6 3.4h7.4l4.2 4.2v3.8M6 3.4v17.2h6.2M14.2 15.9a3.4 3.4 0 1 0 6.8 0 3.4 3.4 0 0 0-6.8 0M20.6 18.6 22.4 20.6'
    };

    // market table
    const q = this.fold(st.q);
    let rows = D.companies.filter(c => (st.sector === 'All' || c.sector === st.sector))
      .filter(c => !q || this.fold(c.name.en).includes(q) || this.fold(c.name.ar).includes(q) || this.fold(c.ticker).includes(q));
    const key = st.sort;
    rows = rows.slice().sort((a,b) => {
      const va = key === 'ticker' ? a.ticker : key === 'name' ? this.nm(a.name) : key === 'sector' ? a.sector : a[key];
      const vb = key === 'ticker' ? b.ticker : key === 'name' ? this.nm(b.name) : key === 'sector' ? b.sector : b[key];
      if (va === null || va === '—') return 1; if (vb === null || vb === '—') return -1;
      if (typeof va === 'string') return va.localeCompare(vb) * st.dir * -1;
      return (va - vb) * st.dir;
    });

    const colDef = [['ticker',ar?'الرمز':'Ticker','start'],['name',ar?'الاسم':'Company','start'],['sector',ar?'القطاع':'Sector','start'],
      ['close',ar?'الإغلاق':'Close','end'],['pct','%','end'],['cap',ar?'القيمة':'Cap','end'],['pe','P/E','end']];
    const cols = colDef.map(([id,label,align]) => ({
      label, align, caret: st.sort === id ? (st.dir === -1 ? ' ↓' : ' ↑') : '',
      color: st.sort === id ? 'var(--ink)' : 'var(--faint)',
      go: () => this.setState(s => ({ sort:id, dir: s.sort === id ? -s.dir : -1 }))
    }));

    const sectorList = ['All'].concat(Array.from(new Set(D.companies.map(c => c.sector))));
    const sectorChips = sectorList.map(s => {
      const on = st.sector === s;
      return { label: s === 'All' ? (ar?'الكل':'All sectors') : s, go: () => this.setState({ sector:s }),
        border: on ? 'transparent' : 'var(--rule)', color: on ? '#1B1917' : 'var(--t2)', bg: on ? 'var(--accent)' : 'transparent', sh: on ? 'var(--shPill)' : 'none' };
    });

    const mkRow = c => ({ ticker:c.ticker, name:this.nm(c.name), sector:c.sector,
      close: c.close === '—' ? '—' : this.num(c.close), pct: this.pct(c.pct), color: this.dcol(c.pct),
      cap: c.cap ? (c.cap/1000).toFixed(1) + 'B' : '—', pe: c.pe ? c.pe.toFixed(1) : '—',
      arrow: (c.pct === null || c.pct === undefined) ? '' : (c.pct > 0 ? '\u2197' : '\u2198'),
      mag: (c.pct === null || c.pct === undefined) ? '0%' : Math.max(6, Math.min(100, Math.abs(c.pct) / 6 * 100)).toFixed(0) + '%',
      go: () => this.setState({ screen:'company', ticker: c.ticker }) });

    // home
    const byMove = D.companies.filter(c => c.pct !== null).slice().sort((a,b) => Math.abs(b.pct) - Math.abs(a.pct));
    const movers = byMove.slice(0,9).map(mkRow);
    // The design named five tickers; a real dataset may not contain them, and a
    // demo deliberately does not. Prefer the named ones when present, then fill
    // from the largest companies, so the block is never short or empty-handed.
    const wanted = ['COMI','KORA','ETEL','TMGH','AMOC'];
    const picked = wanted.map(t => D.companies.find(c => c.ticker === t)).filter(Boolean);
    const byCap = D.companies.slice().sort((a,b) => (b.cap||0) - (a.cap||0));
    for (const c of byCap) { if (picked.length >= 5) break; if (!picked.includes(c)) picked.push(c); }
    const watchlist = picked.slice(0,5).map(mkRow);

    // Both of these were design literals with no live source, so they never
    // failed and never went stale in a way anybody could see: a signed-in
    // reader was shown EGX 30 at 44,883.36 on a session that closed at
    // 55,106.50, and "Ezz Steel has had no closing price for four sessions"
    // about a company the archive says no such thing about. They now come from
    // the published documents, and a missing document leaves the block empty
    // rather than invented.
    const indices = say(D.indices || [], ['label']).map((ix) => Object.assign({}, ix, {
      spark: this.sparkOf(ix.points, ix.up),
    }));

    const readNow = say(D.readNow || [], ['kind', 'title']).map((r) => Object.assign({}, r, {
      go: r.ticker
        ? () => this.setState({ screen: 'company', ticker: r.ticker })
        : this.go(r.screen || 'calendar'),
    }));

    // today
    const feed = (D.feed ? say(D.feed, ['kind','headline','why','because']) : !D.demo ? [] : [
      { kind: ar?'إفصاح':'Filing', kindColor:'var(--accent)', tint:'var(--accTint)', time:'11:48', date:'2026-08-27', source:'EGX', href:'https://www.egx.com.eg',
        headline: ar?'كورّة: القوائم المالية المستقلة والمجمعة عن الفترة المنتهية ٣٠ يونيو ٢٠٢٦':'KORRA: standalone and consolidated statements for the period ended 30 June 2026',
        why: ar?'الميزانية تذكر قروضاً بـ ١٨٦٩٫١ مليون جنيه، منها ١٧٩٥٫٥ مليون تستحق خلال عام.':'The balance sheet states borrowings of EGP 1,869.1m, of which 1,795.5m falls due within a year.',
        tickers:[{ticker:'KORA',go:this.go('company')}] },
      { kind: ar?'خبر':'News', kindColor:'var(--t2)', tint:'var(--sunk)', time:'10:12', date:'2026-08-27', source:'Al Borsa', href:'https://alborsaanews.com',
        headline: ar?'السويدي إليكتريك توقّع عقداً لتوريد كابلات لمشروع نقل كهرباء':'El Sewedy Electric signs cable supply contract for power transmission project',
        why: ar?'الشركة لم تُفصح عن قيمة العقد للبورصة حتى وقت النشر.':'The company has not filed a contract value with the exchange as at publication.',
        tickers:[{ticker:'SWDY',go:this.go('company')}] },
      { kind: ar?'خبر':'News', kindColor:'var(--t2)', tint:'var(--sunk)', time:'09:35', date:'2026-08-27', source:'Enterprise', href:'https://enterprise.press',
        headline: ar?'إيرادات قناة السويس ترتفع للشهر الثالث على التوالي':'Suez Canal receipts rise for a third consecutive month',
        why: ar?'macro.json يذكر ٤٦١ مليون دولار لشهر يوليو، مقابل ٤٢٨ مليوناً في يونيو.':'macro.json states USD 461m for July against 428m in June.',
        tickers:[] },
      { kind: ar?'إفصاح':'Filing', kindColor:'var(--accent)', tint:'var(--accTint)', time:'16:02', date:'2026-08-26', source:'EGX', href:'https://www.egx.com.eg',
        headline: ar?'البنك التجاري الدولي: إفصاح عن توزيعات نقدية مرحلية':'Commercial International Bank: disclosure of an interim cash distribution',
        why: ar?'المستند الموقّع مُتاح في أرشيف الإفصاحات.':'The signed document is available in the disclosure archive.',
        tickers:[{ticker:'COMI',go:this.go('company')}] },
      { kind: ar?'خبر':'News', kindColor:'var(--t2)', tint:'var(--sunk)', time:'14:20', date:'2026-08-26', source:'Hapi Journal', href:'https://hapijournal.com',
        headline: ar?'الإسكندرية للزيوت المعدنية تنهي الجلسة بأعلى تحرك في القطاع':'Alexandria Mineral Oils ends the session with the sector’s largest move',
        why: ar?'market.json يذكر ٤٫٠٢٪ على حجم ١٫٢ مليون سهم.':'market.json states +4.02% on volume of 1.2m shares.',
        tickers:[{ticker:'AMOC',go:this.go('company')}] }
    ]).map((f) => Object.assign({}, f, {
      hasWhy: Boolean(f.why), hasBecause: Boolean(f.because),
      hasImage: Boolean(f.image),
    }));

    // company
    const co0 = D.companies.find(c => c.ticker === 'KORA');
    const rangeMap = { '1W':5, '1M':21, '3M':63, '1Y':250, '5Y':1250 };
    const ranges = Object.keys(rangeMap).map(k => ({ label:k, go: () => this.setState({ range:k }),
      color: st.range === k ? 'var(--ink)' : 'var(--t2)', bg: st.range === k ? 'var(--surface)' : 'transparent', sh: st.range === k ? 'var(--shPill)' : 'none' }));
    const slice = D.series.slice(-rangeMap[st.range]);
    const chart = this.buildChart(slice);

    // The company on screen. `this._co` is the loaded document, set by main.js
    // when a ticker is opened; the literal below is the design's worked
    // example and remains the shape everything else is written against.
    const loaded = this._co && this._co.ticker === st.ticker ? this._co : null;
    const coDesign = {
      ticker:'KORA', sector: ar?'المرافق':'Utilities', exchange:'EGX', nameEn:'KORRA', nameAr:'كورّة',
      close: this.num(12.40), chg:'−0.40', pct:'−3.12%', color:'var(--down)', arrow:'\u2198', closeDate:'2026-08-26',
      brief: ar?'كورّة شركة مرافق مقيدة في البورصة المصرية، تُشغّل أصول توليد وتوزيع وتُفصح عن نتائجها ربع سنوية بالجنيه المصري. النص أعلاه مأخوذ من briefs/KORA.json كما وُلّد في البناء اليومي.'
        :'KORRA is a utilities company listed on the Egyptian Exchange. It operates generation and distribution assets and files quarterly results in Egyptian pounds. This description is rendered from briefs/KORA.json as generated in the daily build.',
      briefFacts:[
        { label: ar?'القطاع':'Sector', value: ar?'المرافق':'Utilities' },
        { label: ar?'الأسهم المُصدرة':'Shares outstanding', value:'337,096,774' },
        { label: ar?'وحدة الإفصاح':'Filing currency', value:'EGP' }
      ],
      briefSource:'briefs/KORA.json · generated 2026-08-27',
      stats:[
        { label: ar?'القيمة السوقية':'Market cap', value:'4,180', color:'var(--ink)' },
        { label: ar?'أسبوع':'1W', value:'−1.84%', color:'var(--down)' },
        { label: ar?'شهر':'1M', value:'+6.21%', color:'var(--up)' },
        { label: ar?'الحجم':'Volume', value:'118,422', color:'var(--ink)' },
        { label:'P/E', value:'11.2', color:'var(--ink)' },
        { label: ar?'ربحية السهم':'EPS', value:'1.11', color:'var(--ink)' }
      ]
    };

    // Live, before a document lands — and live for a company whose document
    // carries none of these fields — the screen shows dashes. It used to show
    // the design's worked example: KORRA, a utilities company that does not
    // exist, at 12.40, with a description explaining what briefs/KORA.json
    // would have said. Under a real ticker in the header, that is an invented
    // company file.
    const co = D.demo ? Object.assign({}, coDesign) : {
      ticker: st.ticker || '—', sector:'—', exchange:'EGX',
      nameEn: st.ticker || '—', nameAr: st.ticker || '—',
      close:'—', chg:'—', pct:'—', color:'var(--faint)', arrow:'', closeDate:'—',
      brief: L.nothingYet, briefFacts: [], briefSource:'—', stats: [],
    };

    if (loaded) {
      const pct = loaded.pct === null || loaded.pct === undefined ? null : loaded.pct;
      const p = loaded.profile || {};
      const perf = (v) => (v === null || v === undefined ? '—' : this.pct(v));
      const whole = (v) => (v === null || v === undefined ? '—' : this.num(v, 0));
      Object.assign(co, {
        brief: (ar ? loaded.briefAr : loaded.brief) || L.nothingYet,
        briefFacts: [
          { label: ar?'القطاع':'Sector', value: loaded.sector || '—' },
          { label: ar?'الأسهم المُصدرة':'Shares outstanding', value: whole(p.shares_outstanding) },
          { label: ar?'وحدة الإفصاح':'Filing currency', value:'EGP' },
        ],
        stats: [
          { label: ar?'القيمة السوقية':'Market cap', value: whole(p.market_cap), color:'var(--ink)' },
          { label: ar?'أسبوع':'1W', value: perf(p.perf_1w), color: this.dcol(p.perf_1w) },
          { label: ar?'شهر':'1M', value: perf(p.perf_1m), color: this.dcol(p.perf_1m) },
          { label: ar?'الحجم':'Volume', value: whole(p.avg_volume_30d), color:'var(--ink)' },
          { label:'P/E', value: loaded.pe === null || loaded.pe === undefined ? '—' : this.num(loaded.pe, 1), color:'var(--ink)' },
          { label: ar?'ربحية السهم':'EPS', value:'—', color:'var(--faint)' },
        ],
        ticker: loaded.ticker,
        nameEn: loaded.name && loaded.name.en ? loaded.name.en : loaded.ticker,
        nameAr: loaded.name && loaded.name.ar ? loaded.name.ar : (loaded.name && loaded.name.en) || loaded.ticker,
        sector: loaded.sector || co.sector,
        close: loaded.close === null || loaded.close === undefined ? '—' : this.num(loaded.close),
        pct: pct === null ? '—' : this.pct(pct),
        color: this.dcol(pct),
        arrow: pct === null ? '' : (pct > 0 ? '\u2197' : '\u2198'),
        closeDate: loaded.closeDate || D.marketDate || co.closeDate,
        briefSource: loaded.briefSource || `companies/${loaded.ticker}.json`,
      });
    }

    const dense = (this.props.density || 'editorial') === 'dense';
    const fins = D.fins.map((f,i) => {
      const open = dense || !!st.open[f.period];
      const g = (label, items) => ({ label, items: items.filter(x => x[1] !== null && x[1] !== undefined)
        .map(([k,v,d]) => ({ k, v: this.num(v, d), color: (typeof v === 'number' && v < 0) ? 'var(--down)' : 'var(--ink)' })) });
      const groups = [
        g(ar?'الميزانية':'Balance sheet', [[ar?'الأصول':'Assets',f.assets],[ar?'الالتزامات':'Liabilities',f.liabilities],[ar?'حقوق الملكية':'Equity',f.equity]]),
        g(ar?'القروض':'Borrowings', [[ar?'إجمالي القروض':'Total',f.debt],[ar?'قصير الأجل':'Short-term',f.short_term_debt],[ar?'طويل الأجل':'Long-term',f.long_term_debt],[ar?'النقد':'Cash',f.cash],[ar?'تكلفة التمويل':'Finance cost',f.finance_cost]]),
        g(ar?'التدفقات النقدية':'Cash flow', [[ar?'تشغيلي':'Operating',f.operating_cash_flow],[ar?'استثماري':'Investing',f.investing_cash_flow],[ar?'تمويلي':'Financing',f.financing_cash_flow],[ar?'صافي التغير':'Net change',f.net_change_in_cash]]),
        g(ar?'التوزيعات':'Distributions', [[ar?'توزيعات مدفوعة':'Dividends paid',f.dividends_paid]])
      ].filter(x => x.items.length);
      const total = 15, present = groups.reduce((n,x) => n + x.items.length, 0);
      return {
        period:f.period, window:f.window, bg: i === 0 ? 'var(--sunk)' : 'transparent',
        revenue:this.num(f.revenue,1), grossProfit:this.num(f.gross_profit,1), operatingIncome:this.num(f.operating_income,1), netIncome:this.num(f.net_income,1),
        revColor: f.revenue === null ? 'var(--faint)' : 'var(--ink)', gpColor: f.gross_profit === null ? 'var(--faint)' : 'var(--ink)',
        opColor: f.operating_income === null ? 'var(--faint)' : 'var(--ink)', niColor: f.net_income === null ? 'var(--faint)' : 'var(--ink)',
        caret: open ? '−' : '+', open, groups,
        toggle: () => this.setState(s => ({ open: Object.assign({}, s.open, { [f.period]: !s.open[f.period] }) })),
        filingId:f.filing_id, filedOn:(ar?'أُودع ':'Filed ') + f.filed_on, source:'https://www.egx.com.eg',
        omitted: (total - present) > 0 ? ((ar?'':'') + (total-present) + (ar?' حقلاً لم يذكره الإفصاح':' fields not stated in this filing')) : (ar?'كل الحقول مذكورة':'All fields stated')
      };
    });

    const debtDesign = {
      period:'H1 2026', asOf:'2026-06-30', frame:'operating', basis:'balance_sheet', filingId:'egx-293566', source:'https://www.egx.com.eg',
      borrowings: this.num(1869.119,1), shortTerm: this.num(1795.468,1), longTerm: this.num(73.652,1), stPct: '96%',
      metrics:[
        { label: ar?'النقد':'Cash', value: this.num(375.378,1), note: ar?'كما في ٣٠ يونيو ٢٠٢٦':'As at 30 June 2026' },
        { label: ar?'صافي القروض':'Net debt', value: this.num(1493.741,1), note: ar?'القروض ناقص النقد':'Borrowings less cash' },
        { label: ar?'تكلفة التمويل':'Finance cost', value: this.num(206.506,1), note: ar?'لهذه الفترة، وليست سنوية':'For this period, not annualised' },
        { label: ar?'التغطية':'Cover', value:'1.92×', note: ar?'الربح التشغيلي ÷ تكلفة التمويل':'Operating profit ÷ finance cost' },
        { label: ar?'الرفع المالي':'Gearing', value:'1.22×', note: ar?'القروض ÷ حقوق الملكية':'Borrowings ÷ equity' },
        { label: ar?'يستحق خلال عام':'Due within a year', value:'96%', note: ar?'من إجمالي القروض':'Of total borrowings' }
      ],
      since: ar?'٣١ ديسمبر ٢٠٢٥':'31 December 2025',
      delta:'+252.1', deltaColor:'var(--ink)',
      directionLine: ar?'أعلى منها في ٣١ ديسمبر ٢٠٢٥، حيث كانت ١٦١٧٫٠ مليون جنيه':'Higher than at 31 December 2025, when they were 1,617.0',
      basisLine: ar?'الأساس: العمود المقارن في الميزانية نفسها (balance_sheet) — وليس مقارنة بالعام السابق.':'Basis: the statement’s own prior column (balance_sheet) — not a comparison with a year ago.',
      patternLine: ar?'جمعت الشركة أموالاً وأنفقت على أصول خلال الفترة نفسها.':'It raised money and spent on assets over the same period.',
      flows:[
        { label: ar?'تدفق تشغيلي':'Operating cash flow', value:this.signed(88.149,1), color:'var(--up)' },
        { label: ar?'تدفق استثماري':'Investing cash flow', value:this.signed(-55.781,1), color:'var(--down)' },
        { label: ar?'تدفق تمويلي':'Financing cash flow', value:this.signed(13.268,1), color:'var(--up)' }
      ],
      read: ar?'خلال الفترة، بلغت القروض المذكورة في الميزانية ١٨٦٩٫١ مليون جنيه، يستحق ١٧٩٥٫٥ مليون منها خلال عام، مقابل نقد قدره ٣٧٥٫٤ مليون. وكانت تكلفة التمويل ٢٠٦٫٥ مليون جنيه لهذه الفترة.'
        :'During the period, the balance sheet stated borrowings of 1,869.1, of which 1,795.5 falls due within a year, against cash of 375.4. Finance cost was 206.5 for the period.',
      open: st.debtOpen, toggle: () => this.setState(s => ({ debtOpen: !s.debtOpen })),
      toggleLabel: st.debtOpen ? L.hideSource : L.showSource, toggleCaret: st.debtOpen ? '↑' : '↓'
    };

    // Every company's borrowings block was this same worked example: 1,869.1
    // stated, 1,795.5 due within a year, cover 1.92×. Printed under a real
    // ticker that is a fabricated financial figure about a real issuer — the
    // exact thing scripts/build_debt.py exists to prevent — and the real block
    // was sitting unread in the company's own document all along.
    const d0 = loaded && loaded.debt;
    const debt = D.demo && !d0 ? debtDesign : !d0 ? null : {
      period: d0.period, asOf: d0.as_of, frame: d0.frame, basis: (d0.change || {}).basis,
      filingId: d0.filing_id, source: d0.source || 'https://www.egx.com.eg',
      borrowings: this.num(d0.borrowings, 1), shortTerm: this.num(d0.short_term, 1),
      longTerm: this.num(d0.long_term, 1),
      stPct: d0.due_within_year === null || d0.due_within_year === undefined
        ? '—' : Math.round(d0.due_within_year * 100) + '%',
      metrics: [
        { label: ar?'النقد':'Cash', value: this.num(d0.cash, 1), note: (ar?'كما في ':'As at ') + d0.as_of },
        { label: ar?'صافي القروض':'Net debt', value: this.num(d0.net_debt, 1), note: ar?'القروض ناقص النقد':'Borrowings less cash' },
        { label: ar?'تكلفة التمويل':'Finance cost', value: this.num(d0.finance_cost, 1), note: ar?'لهذه الفترة، وليست سنوية':'For this period, not annualised' },
        { label: ar?'التغطية':'Cover', value: d0.cover === null || d0.cover === undefined ? '—' : this.num(d0.cover, 2) + '×', note: ar?'الربح التشغيلي ÷ تكلفة التمويل':'Operating profit ÷ finance cost' },
        { label: ar?'الرفع المالي':'Gearing', value: d0.gearing === null || d0.gearing === undefined ? '—' : this.num(d0.gearing, 2) + '×', note: ar?'القروض ÷ حقوق الملكية':'Borrowings ÷ equity' },
        { label: ar?'يستحق خلال عام':'Due within a year', value: d0.due_within_year === null || d0.due_within_year === undefined ? '—' : Math.round(d0.due_within_year * 100) + '%', note: ar?'من إجمالي القروض':'Of total borrowings' },
      ],
      since: (d0.change || {}).since || '—',
      delta: (d0.change || {}).delta === null || (d0.change || {}).delta === undefined
        ? '—' : this.signed(d0.change.delta, 1),
      deltaColor: 'var(--ink)',
      // These three lines are the §8 boundary: they describe what the filing
      // states and what moved, never what to do about it. They are written by
      // build_debt_reads.py against the directions alone, and are carried here
      // verbatim rather than re-phrased.
      directionLine: (d0.change || {}).direction
        ? (ar ? 'مقارنةً بـ ' : 'Against ') + ((d0.change || {}).since || '') + ': '
          + this.num((d0.change || {}).borrowings, 1)
        : '—',
      basisLine: (d0.change || {}).basis === 'balance_sheet'
        ? (ar?'الأساس: العمود المقارن في الميزانية نفسها — وليس مقارنة بالعام السابق.'
             :'Basis: the statement\u2019s own prior column \u2014 not a comparison with a year ago.')
        : '',
      // The document names the shape from a closed set; these are the same
      // eight names in words. Each describes what the cash-flow statement
      // shows over the period and nothing about what it would mean to hold
      // the share (§8).
      patternLine: {
        raised_while_operations_consumed_cash: ar
          ? 'اقترضت الشركة بينما لم تولد عملياتها المعتادة نقداً خلال الفترة نفسها.'
          : 'It borrowed while its regular operations did not generate cash over the same period.',
        raised_and_invested: ar
          ? 'جمعت الشركة أموالاً وأنفقت على أصول خلال الفترة نفسها.'
          : 'It raised money and spent on assets over the same period.',
        raised_and_held: ar
          ? 'جمعت الشركة أموالاً دون إنفاق يُذكر على الأصول خلال الفترة نفسها.'
          : 'It raised money without notable spending on assets over the same period.',
        repaid_from_operating_cash: ar
          ? 'سددت الشركة من نقد ولّدته عملياتها المعتادة خلال الفترة نفسها.'
          : 'It repaid out of cash its regular operations generated over the same period.',
        repaid_without_operating_cash: ar
          ? 'سددت الشركة رغم أن عملياتها المعتادة لم تولد نقداً خلال الفترة نفسها.'
          : 'It repaid even though its regular operations did not generate cash over the same period.',
        funding_raised: ar ? 'صافي التمويل داخل خلال الفترة.'
          : 'Net funding came in over the period.',
        funding_repaid: ar ? 'صافي التمويل خارج خلال الفترة.'
          : 'Net funding went out over the period.',
        little_movement: ar ? 'لم يتحرك التمويل بشكل يُذكر خلال الفترة.'
          : 'Funding barely moved over the period.',
      }[d0.pattern] || '',
      flows: [
        { label: ar?'تدفق تشغيلي':'Operating cash flow', value: this.signed((d0.movement||{}).operating_cash_flow, 1), color: this.dcol((d0.movement||{}).operating_cash_flow) },
        { label: ar?'تدفق استثماري':'Investing cash flow', value: this.signed((d0.movement||{}).investing_cash_flow, 1), color: this.dcol((d0.movement||{}).investing_cash_flow) },
        { label: ar?'تدفق تمويلي':'Financing cash flow', value: this.signed((d0.movement||{}).financing_cash_flow, 1), color: this.dcol((d0.movement||{}).financing_cash_flow) },
      ],
      read: (ar ? (d0.read||{}).read_ar : (d0.read||{}).read) || '',
      open: st.debtOpen, toggle: () => this.setState((s) => ({ debtOpen: !s.debtOpen })),
      toggleLabel: st.debtOpen ? L.hideSource : L.showSource,
      toggleCaret: st.debtOpen ? '↑' : '↓',
    };

    const signals = D.signals ? say(D.signals, ['kind','title','because']) : !D.demo ? [] : [
      { kind: ar?'انقطاع نمط':'Streak break', title: ar?'أول جلسة هبوط بعد خمس جلسات صاعدة':'First falling session after five rising ones', because: ar?'market.json يذكر −٣٫١٢٪ يوم ٢٦ أغسطس، بعد خمس جلسات مغلقة على ارتفاع.':'market.json states −3.12% on 26 August, following five consecutive higher closes.', stamp:'signals/KORA · 2026-08-26' },
      { kind: ar?'حركة القروض':'Borrowings moved', title: ar?'القروض قصيرة الأجل أعلى بـ ٢٩٧٫١ مليون منها في ٣١ ديسمبر':'Short-term borrowings 297.1 higher than at 31 December', because: ar?'١٧٩٥٫٥ مقابل ١٤٩٨٫٣ في العمود المقارن للميزانية نفسها.':'1,795.5 against 1,498.3 in the statement’s own prior column.', stamp:'signals/KORA · egx-293566' },
      { kind: ar?'نتائج مرتقبة':'Results due', title: ar?'إفصاح تسعة أشهر متوقع في نوفمبر بحسب سجل الشركة':'A 9M filing is expected in November on the company’s own history', because: ar?'أُودعت الإفصاحات المكافئة في ١١ نوفمبر ٢٠٢٥ و١٢ نوفمبر ٢٠٢٤. تقدير، وليس إعلاناً.':'Equivalent filings landed on 11 November 2025 and 12 November 2024. An estimate, not an announcement.', stamp:'calendar.json · estimate' }
    ];

    const filings = D.filings ? say(D.filings, ['title']) : !D.demo ? [] : [
      { date:'2026-08-14', title: ar?'القوائم المالية للفترة المنتهية ٣٠ يونيو ٢٠٢٦':'Financial statements for the period ended 30 June 2026', id:'egx-293566', href:'https://www.egx.com.eg' },
      { date:'2026-05-12', title: ar?'القوائم المالية للربع الأول ٢٠٢٦':'Financial statements for Q1 2026', id:'egx-288104', href:'https://www.egx.com.eg' },
      { date:'2026-03-28', title: ar?'القوائم المالية السنوية ٢٠٢٥ وتقرير مراقب الحسابات':'Annual financial statements 2025 with auditor’s report', id:'egx-271340', href:'https://www.egx.com.eg' },
      { date:'2026-03-02', title: ar?'إفصاح عن دعوة الجمعية العامة العادية':'Notice convening the ordinary general assembly', id:'egx-269911', href:'https://www.egx.com.eg' },
      { date:'2025-11-11', title: ar?'القوائم المالية لتسعة أشهر ٢٠٢٥':'Financial statements for 9M 2025', id:'egx-264880', href:'https://www.egx.com.eg' }
    ];

    // sectors
    const secDef = [
      ['Banks','البنوك',12,8,3,1,4.9,'COMI'],['Real Estate','العقارات',31,19,10,2,6.2,'TMGH'],['Chemicals','الكيماويات',18,7,9,2,7.4,'ABUK'],
      ['Industrials','الصناعة',26,16,8,2,8.1,'SWDY'],['Basic Resources','الموارد الأساسية',14,5,7,2,9.0,'ESRS'],['Consumer','السلع الاستهلاكية',22,11,9,2,6.8,'EAST'],
      ['Telecom','الاتصالات',4,2,1,1,4.2,'ETEL'],['Utilities','المرافق',6,2,4,0,11.2,'KORA'],['Energy','الطاقة',9,6,2,1,9.1,'AMOC'],
      ['Financials','الخدمات المالية',17,6,9,2,5.6,'HRHO'],['Healthcare','الرعاية الصحية',11,7,3,1,12.4,'IDHC'],['Textiles','الغزل والنسيج',13,3,8,2,7.7,'ELSH'],
      ['Transport & Shipping','النقل والشحن',8,4,3,1,8.6,'CCAP'],['Travel & Leisure','السفر والترفيه',12,5,6,1,10.3,'ORHD'],['Media','الإعلام',5,2,2,1,9.4,'MEDI']
    ];
    const sectorCards = D.sectorCards ? say(D.sectorCards, ['name']) : !D.demo ? [] : secDef.map(([en,arn,count,up,down,flat,pe,standout]) => {
      const bars = [];
      for (let i = 0; i < 10; i++) {
        const isUp = i < Math.round(up/count*10);
        const isFlat = i >= Math.round((up+down)/count*10);
        bars.push({ color: isFlat ? 'var(--rule)' : isUp ? 'var(--up)' : 'var(--down)', op: isFlat ? 1 : (0.45 + 0.055*i) });
      }
      return { name: ar ? arn : en, count: count + (ar?' شركة':' listed'), bars, upCount:up, downCount:down, flatCount:flat,
        read: ar ? ('صعد ' + up + ' من ' + count + ' سهماً في القطاع في جلسة ٢٦ أغسطس. وسيط مضاعف الربحية ' + pe.toFixed(1) + '.')
                 : (up + ' of ' + count + ' listed names rose in the 26 August session. Median P/E ' + pe.toFixed(1) + '.'),
        medianPe: pe.toFixed(1), standout: (ar?'الأكبر تحركاً ':'Largest move ') + standout };
    });

    // calendar
    const monthDef = [['2026-06','Jun 2026'],['2026-07','Jul 2026'],['2026-08','Aug 2026'],['2026-09','Sep 2026']];
    const months = monthDef.map(([id,label]) => ({ label, go: () => this.setState({ month:id }),
      color: st.month === id ? 'var(--ink)' : 'var(--t2)', bg: st.month === id ? 'var(--surface)' : 'transparent', sh: st.month === id ? 'var(--shPill)' : 'none' }));
    const filedEvents = D.filedEvents ? say(D.filedEvents, ['what']) : !D.demo ? [] : [
      { day:'26 Aug', ticker:'COMI', what: ar?'إفصاح عن توزيعات نقدية مرحلية':'Interim cash distribution disclosure' },
      { day:'14 Aug', ticker:'KORA', what: ar?'قوائم النصف الأول ٢٠٢٦':'H1 2026 financial statements' },
      { day:'13 Aug', ticker:'SWDY', what: ar?'قوائم النصف الأول ٢٠٢٦':'H1 2026 financial statements' },
      { day:'11 Aug', ticker:'TMGH', what: ar?'قوائم النصف الأول ٢٠٢٦':'H1 2026 financial statements' },
      { day:'07 Aug', ticker:'ABUK', what: ar?'قوائم النصف الأول ٢٠٢٦':'H1 2026 financial statements' },
      { day:'04 Aug', ticker:'ETEL', what: ar?'إفصاح عن تعاقد':'Contract disclosure' }
    ];
    const expectedEvents = D.expectedEvents ? say(D.expectedEvents, ['what']) : !D.demo ? [] : [
      { day:'31 Aug', ticker:'ESRS', what: ar?'قوائم النصف الأول ٢٠٢٦ — الموعد النظامي':'H1 2026 statements — regulatory deadline' },
      { day:'30 Aug', ticker:'PHDC', what: ar?'قوائم النصف الأول ٢٠٢٦':'H1 2026 financial statements' },
      { day:'30 Aug', ticker:'SKPC', what: ar?'قوائم النصف الأول ٢٠٢٦':'H1 2026 financial statements' },
      { day:'28 Aug', ticker:'MFPC', what: ar?'قوائم النصف الأول ٢٠٢٦':'H1 2026 financial statements' },
      { day:'28 Aug', ticker:'CIEB', what: ar?'قوائم النصف الأول ٢٠٢٦':'H1 2026 financial statements' },
      { day:'27 Aug', ticker:'ORAS', what: ar?'قوائم النصف الأول ٢٠٢٦':'H1 2026 financial statements' }
    ];

    // exchange
    const rates = D.rates ? say(D.rates, ['label'])
      : (D.indices || []).map((ix) => ({ label: ix.label, labelAr: ix.labelAr,
          value: ix.value, pct: ix.pct, color: ix.color,
          unit: ar ? 'نقطة' : 'points' }));

    const macro = D.macro ? say(D.macro, ['label','meaning']) : [];

    const studies = !D.demo ? [] : [
      { venue:'Journal of Financial Economics', year:2024, score:82, band: ar?'منهجية موثّقة، بيانات متاحة':'Documented method, data available',
        title: ar?'الإفصاح المتأخر وتشتت الأسعار في الأسواق الناشئة':'Late disclosure and price dispersion in emerging markets',
        summary: ar?'تدرس الورقة الفارق بين تاريخ نهاية الفترة وتاريخ الإيداع في أربعة عشر سوقاً. تُلخّص هنا وصفاً للدراسة نفسها.':'The paper examines the gap between period end and filing date across fourteen markets. Summarised here as a description of the study itself.',
        href:'https://example.org', criteria:[{label:ar?'الشفافية':'Transparency',value:'22/25',pct:'88%'},{label:ar?'حجم العينة':'Sample size',value:'19/25',pct:'76%'},{label:ar?'قابلية التكرار':'Replicability',value:'21/25',pct:'84%'},{label:ar?'مراجعة الأقران':'Peer review',value:'20/25',pct:'80%'}] },
      { venue:'Emerging Markets Review', year:2025, score:64, band: ar?'عينة محدودة، بيانات جزئية':'Limited sample, partial data',
        title: ar?'مواعيد إفصاح الشركات المقيدة وسلوك أحجام التداول':'Filing timetables of listed companies and trading-volume behaviour',
        summary: ar?'عينة من ثمانٍ وثمانين شركة على مدى ست سنوات. بيانات الأحجام غير منشورة مع الورقة.':'A sample of eighty-eight companies over six years. Volume data is not published alongside the paper.',
        href:'https://example.org', criteria:[{label:ar?'الشفافية':'Transparency',value:'15/25',pct:'60%'},{label:ar?'حجم العينة':'Sample size',value:'14/25',pct:'56%'},{label:ar?'قابلية التكرار':'Replicability',value:'17/25',pct:'68%'},{label:ar?'مراجعة الأقران':'Peer review',value:'18/25',pct:'72%'}] },
      { venue:'Working paper', year:2026, score:38, band: ar?'غير محكّمة، بيانات غير متاحة':'Not peer reviewed, data unavailable',
        title: ar?'موسمية القروض قصيرة الأجل في القوائم المالية المصرية':'Seasonality in short-term borrowings across Egyptian filings',
        summary: ar?'مسودة عمل تعتمد على بيانات لم يُنشر مصدرها. النطاق يصف بطاقة التقييم، لا الشركات المذكورة فيها.':'A working draft resting on data whose source is not published. The band describes the scorecard, not the companies discussed in it.',
        href:'https://example.org', criteria:[{label:ar?'الشفافية':'Transparency',value:'9/25',pct:'36%'},{label:ar?'حجم العينة':'Sample size',value:'11/25',pct:'44%'},{label:ar?'قابلية التكرار':'Replicability',value:'7/25',pct:'28%'},{label:ar?'مراجعة الأقران':'Peer review',value:'11/25',pct:'44%'}] }
    ];

    // Built here rather than at the top because its counters are the lists
    // themselves — the design had 18 stories, 282 listings and KORA open,
    // whatever the documents actually held.
    const navDef = [
      ['home', ar?'الرئيسية':'Home', ''],
      ['today', ar?'اليوم':'Today', feed.length ? String(feed.length) : ''],
      ['market', ar?'السوق':'Market', String(D.companies.length)],
      ['company', ar?'شركة':'Company', st.ticker || ''],
      ['sectors', ar?'القطاعات':'Sectors', sectorCards.length ? String(sectorCards.length) : ''],
      ['calendar', ar?'التقويم':'Calendar', ''],
      ['exchange', ar?'البورصة':'Exchange', ''],
      ['research', ar?'الأبحاث':'Research', '']
    ];
    const nav = navDef.map(([id,label,meta]) => {
      const on = st.screen === id;
      return { label, meta, icon: ICON[id], go: this.go(id),
        color: on ? 'var(--ink)' : 'var(--t2)', weight: on ? 600 : 400,
        bg: on ? 'var(--activeBg)' : 'transparent',
        shadow: on ? 'var(--shPill)' : 'none',
        markH: on ? '18px' : '0px',
        dot: on ? acc : 'transparent' };
    });

    const out = {
      L, theme: st.theme, dir: ar ? 'rtl' : 'ltr',
      bodyFont: ar ? "'IBM Plex Sans Arabic','IBM Plex Sans',sans-serif" : "'IBM Plex Sans',sans-serif",
      marketDate: this.longDate(D.marketDate), generatedAt: D.generatedAt || '—',
      dataVersion: D.dataVersion || '—', totalCount: D.companies.length,
      noIndices: indices.length === 0, noReadNow: readNow.length === 0,
      noFeed: feed.length === 0, noRates: rates.length === 0,
      hasDebt: Boolean(debt), noDebt: !debt,
      noMacro: macro.length === 0,
      noStudies: studies.length === 0,
      nav, sectorCount: sectorCards.length, themeLabel: st.theme === 'light' ? (ar?'نهاري':'Light') : (ar?'ليلي':'Dark'),
      flipTheme: () => this.setState(s => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),
      toEn: () => this.setState({ lang:'en' }), toAr: () => this.setState({ lang:'ar' }),
      enBg: !ar ? 'var(--surface)' : 'transparent', enFg: !ar ? 'var(--ink)' : 'var(--t2)', enSh: !ar ? 'var(--shPill)' : 'none',
      arBg: ar ? 'var(--surface)' : 'transparent', arFg: ar ? 'var(--ink)' : 'var(--t2)', arSh: ar ? 'var(--shPill)' : 'none',
      themeIcon: st.theme === 'light' ? 'M12 4.6V2.8M12 21.2v-1.8M4.6 12H2.8M21.2 12h-1.8M6.8 6.8 5.5 5.5M18.5 18.5l-1.3-1.3M6.8 17.2l-1.3 1.3M18.5 5.5l-1.3 1.3M12 7.6a4.4 4.4 0 1 0 0 8.8 4.4 4.4 0 0 0 0-8.8' : 'M20.4 14.6A8.8 8.8 0 0 1 9.4 3.6a8.8 8.8 0 1 0 11 11',
      isHome: st.screen === 'home', isToday: st.screen === 'today', isMarket: st.screen === 'market',
      isCompany: st.screen === 'company', isSectors: st.screen === 'sectors', isCalendar: st.screen === 'calendar',
      isExchange: st.screen === 'exchange', isResearch: st.screen === 'research',
      indices, movers, watchlist, readNow, feed,
      rows: rows.map(mkRow), rowCount: rows.length, cols, sectorChips, query: st.q,
      noRows: rows.length === 0,
      clearFilters: () => this.setState({ q:'', sector:'All' }),
      onQuery: e => this.setState({ q: e.target.value }),
      co, ranges, chart, ratesArrowed: rates.map(r => Object.assign({}, r, { arrow: r.pct.charAt(0) === '+' ? '\u2197' : '\u2198', tint: r.pct.charAt(0) === '+' ? 'var(--upTint)' : 'var(--downTint)' })), chartFrom: slice.length ? slice[0].date : '—', chartTo: slice.length ? slice[slice.length-1].date : '—', chartCount: slice.length,
      fins, debt, signals, filings, sectorCards, months, filedEvents, expectedEvents, rates, macro, studies
    };
    // A demo must not put an invented event beside a real company's name.
    //
    // The design's worked examples name actual issuers — KORRA filing H1 2026,
    // Ezz Steel going quiet — which is right in a design tool and wrong on a
    // public page: a screenshot of an invented filing under a real name is a
    // fabricated financial claim, the one thing this publisher must never
    // emit. The app solves this by rewriting its fixtures into an obviously
    // fake market before a signed-out reader sees them; this is the same move.
    // Any screen still carrying design copy is therefore safe by construction
    // rather than by remembering to edit it.
    const out2 = D.demo ? this.demoise(out, D.companies) : out;
    return ar ? this.isolate(out2) : out2;
  }

  /** Swap every real issuer the design named for one from the demo set. */
  demoise(value, companies, seen) {
    if (!this._swap) {
      const pick = (i) => companies[i % Math.max(1, companies.length)] || {};
      const map = new Map();
      [['KORA', 0], ['COMI', 1], ['SWDY', 2], ['TMGH', 3], ['ETEL', 4],
       ['AMOC', 5], ['ABUK', 6], ['ESRS', 7]].forEach(([real, i]) => {
        const stand = pick(i);
        if (!stand.ticker) return;
        map.set(real, stand.ticker);
        map.set('KORRA', stand.name && stand.name.en);
      });
      const named = [['KORRA', 0], ['Ezz Steel', 7], ['Commercial International Bank', 1],
                     ['El Sewedy Electric', 2], ['Telecom Egypt', 4],
                     ['Alexandria Mineral Oils', 5], ['Talaat Moustafa Group', 3],
                     ['كورّة', 0], ['حديد عز', 7], ['البنك التجاري الدولي', 1],
                     ['السويدي إليكتريك', 2]];
      named.forEach(([real, i]) => {
        const stand = pick(i);
        if (!stand.name) return;
        map.set(real, /[\u0600-\u06FF]/.test(real) ? stand.name.ar : stand.name.en);
      });
      this._swap = [...map.entries()].filter(([, to]) => to)
        .sort((a, b) => b[0].length - a[0].length);
    }
    seen = seen || new Set();
    if (typeof value === 'string') {
      let out = value;
      for (const [from, to] of this._swap) out = out.split(from).join(to);
      // The named list above is hand-written and fell behind the design: the
      // calendar and sector copy still carried CIEB, MFPC, ORAS, PHDC, SKPC
      // and seven more real issuers beside invented dates and figures. A
      // ticker is four capitals on this exchange, so catch the shape rather
      // than keep a list that has already proved it goes stale. Demo tickers
      // are DEMO01..DEMO16 and do not match.
      out = out.replace(/\b[A-Z]{4}\b/g, (t) => {
        const stand = companies[[...t].reduce((a, c) => a + c.charCodeAt(0), 0)
          % Math.max(1, companies.length)];
        return stand && stand.ticker ? stand.ticker : t;
      });
      return out;
    }
    if (!value || typeof value !== 'object' || seen.has(value)) return value;
    if (typeof value === 'function' || value instanceof Node) return value;
    seen.add(value);
    if (Array.isArray(value)) return value.map((v) => this.demoise(v, companies, seen));
    const copy = {};
    for (const [k, v] of Object.entries(value)) copy[k] = this.demoise(v, companies, seen);
    return copy;
  }

  // ── figures, dates and Latin stamps are bidi-isolated so signs and date
  // segments keep their filed order inside an RTL paragraph.
  isolate(v, seen) {
    seen = seen || new Set();
    if (typeof v === 'string') {
      if (/^[+\-\u2212]?\d[\d\s.,:/()\-\u2212\u2013\u00d7%A-Za-z]*$/.test(v)) return '\u2066' + v + '\u2069';
      return v;
    }
    if (Array.isArray(v)) return v.map(x => this.isolate(x, seen));
    if (v && typeof v === 'object' && !React.isValidElement(v)) {
      if (seen.has(v)) return v;
      seen.add(v);
      const o = {};
      for (const k in v) o[k] = (k === 'L' || typeof v[k] === 'function') ? v[k] : this.isolate(v[k], seen);
      return o;
    }
    return v;
  }

  spark(seed, up) {
    const n = 38, pts = []; let v = 50;
    for (let i = 0; i < n; i++) {
      v += Math.sin((i + seed) / 4.3) * 3.1 + ((((i + 1) * seed * 2654435761) % 1000) / 1000 - 0.5) * 5.2 + (up ? 0.62 : -0.58);
      pts.push(v);
    }
    const lo = Math.min.apply(null, pts), hi = Math.max.apply(null, pts), sp = (hi - lo) || 1;
    const d = pts.map((p,i) => (i ? 'L' : 'M') + ((i/(n-1))*100).toFixed(2) + ' ' + (2 + (1-(p-lo)/sp)*24).toFixed(2)).join(' ');
    return React.createElement('svg', { viewBox:'0 0 100 28', preserveAspectRatio:'none', style:{ width:'100%', height:'32px', display:'block' } },
      React.createElement('path', { d: d + ' L100 28 L0 28 Z', fill: up ? 'var(--upTint)' : 'var(--downTint)' }),
      React.createElement('path', { d, fill:'none', stroke: up ? 'var(--up)' : 'var(--down)', strokeWidth:1.5, vectorEffect:'non-scaling-stroke', strokeLinejoin:'round', strokeLinecap:'round' })
    );
  }

  /** The same line as spark(), drawn from closes that actually happened.
   *
   * spark() invents its own path from a seed, which is fine under a demo
   * index and not fine under a real one: the shape would be a made-up price
   * history. With nothing to draw, this draws nothing. */
  sparkOf(points, up) {
    const pts = (points || []).filter((v) => typeof v === 'number');
    if (pts.length < 2) return React.createElement('div', { style: { height: '32px' } });
    const lo = Math.min.apply(null, pts), hi = Math.max.apply(null, pts), sp = (hi - lo) || 1;
    const d = pts.map((p, i) => (i ? 'L' : 'M') + ((i / (pts.length - 1)) * 100).toFixed(2)
      + ' ' + (2 + (1 - (p - lo) / sp) * 24).toFixed(2)).join(' ');
    return React.createElement('svg', { viewBox: '0 0 100 28', preserveAspectRatio: 'none',
      style: { width: '100%', height: '32px', display: 'block' } },
      React.createElement('path', { d: d + ' L100 28 L0 28 Z',
        fill: up ? 'var(--upTint)' : 'var(--downTint)' }),
      React.createElement('path', { d, fill: 'none', stroke: up ? 'var(--up)' : 'var(--down)',
        strokeWidth: 1.5, vectorEffect: 'non-scaling-stroke', strokeLinejoin: 'round',
        strokeLinecap: 'round' })
    );
  }

  /** "2026-08-27" as the session line reads it, in whichever language. */
  longDate(iso) {
    if (!iso) return '—';
    const at = new Date(iso + (iso.length === 10 ? 'T00:00:00Z' : ''));
    if (isNaN(at)) return iso;
    return new Intl.DateTimeFormat(this.state.lang === 'ar' ? 'ar-EG' : 'en-GB',
      { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(at);
  }

  buildChart(pts) {
    // A company's price series arrives after its document does, and the market
    // screens carry none at all. An empty chart is a blank frame, not a crash.
    if (!Array.isArray(pts) || pts.length === 0) {
      return React.createElement('div', {
        style: { height: '260px', display: 'grid', placeItems: 'center',
                 color: 'var(--faint)', fontSize: '13px' },
      }, '—');
    }
    const W = 1000, H = 260, pad = 4;
    const vals = pts.map(p => p.close);
    const lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals), sp = (hi - lo) || 1;
    const x = i => (i / Math.max(1, pts.length - 1)) * W;
    const y = v => pad + (1 - (v - lo) / sp) * (H - pad * 2);
    const line = pts.map((p,i) => (i ? 'L' : 'M') + x(i).toFixed(2) + ' ' + y(p.close).toFixed(2)).join(' ');
    const area = line + ' L' + W + ' ' + H + ' L0 ' + H + ' Z';
    const grid = this.props.showChartGrid === false ? [] : [0.25,0.5,0.75].map((f,i) =>
      React.createElement('line', { key:'g'+i, x1:0, x2:W, y1:H*f, y2:H*f, stroke:'var(--rule2)', strokeWidth:1 }));
    const last = pts[pts.length-1];
    return React.createElement('div', { style:{ position:'relative' } },
      React.createElement('svg', { viewBox:'0 0 '+W+' '+H, preserveAspectRatio:'none', style:{ width:'100%', height:'260px', display:'block', overflow:'visible' } },
        React.createElement('defs', null, React.createElement('linearGradient', { id:'esth-fade', x1:'0', y1:'0', x2:'0', y2:'1' },
          React.createElement('stop', { offset:'0%', stopColor:'var(--accent)', stopOpacity:0.16 }),
          React.createElement('stop', { offset:'100%', stopColor:'var(--accent)', stopOpacity:0 }))),
        grid,
        React.createElement('path', { d:area, fill:'url(#esth-fade)' }),
        React.createElement('path', { d:line, fill:'none', stroke:'var(--ink)', strokeWidth:1.7, vectorEffect:'non-scaling-stroke', strokeLinejoin:'round', strokeLinecap:'round' }),
        React.createElement('circle', { cx:x(pts.length-1), cy:y(last.close), r:9, fill:'var(--accent)', opacity:0.18 }),
        React.createElement('circle', { cx:x(pts.length-1), cy:y(last.close), r:3.6, fill:'var(--accent)' })
      ),
      React.createElement('div', { style:{ position:'absolute', top:0, insetInlineEnd:0, fontFamily:"'IBM Plex Mono','IBM Plex Sans Arabic',monospace", fontSize:'10.5px', color:'var(--faint)' } }, hi.toFixed(2)),
      React.createElement('div', { style:{ position:'absolute', bottom:0, insetInlineEnd:0, fontFamily:"'IBM Plex Mono','IBM Plex Sans Arabic',monospace", fontSize:'10.5px', color:'var(--faint)' } }, lo.toFixed(2))
    );
  }
}

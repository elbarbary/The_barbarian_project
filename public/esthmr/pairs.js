import { CURATED_PAIRS } from './pairs-data.js';

/**
 * Pairs & Spreads Explorer
 * Compares competing sector peers with user-selectable normalization:
 * 1. Price Return (Base = 100)
 * 2. Fundamental Valuation (P/E = Market Cap ÷ Net Profit)
 * 3. Valuation Ratio (P/E_A ÷ P/E_B) with Mean & Spread Bands
 */
export function pairsExplorer(component, D, ar, React) {
  const st = component.state;
  const pairId = st.pairId || 'fertilizers';
  const normMode = st.pairNorm || 'pe'; // 'pe' | 'price' | 'ratio'
  const range = st.pairRange || '2Y';   // '1Y' | '2Y' | '3Y' | 'ALL'

  // Curated pairs list
  const pairsList = [
    { id: 'fertilizers', t1: 'ABUK', t2: 'MFPC', nameEn: 'Fertilizers', nameAr: 'الأسمدة والكيماويات' },
    { id: 'urban_housing', t1: 'HELI', t2: 'MASR', nameEn: 'Urban Housing', nameAr: 'التطوير والإسكان' },
    { id: 'banking', t1: 'COMI', t2: 'CIEB', nameEn: 'Private Banking', nameAr: 'البنوك التجارية الخاصة' },
    { id: 'real_estate', t1: 'TMGH', t2: 'PHDC', nameEn: 'Luxury Real Estate', nameAr: 'العقارات الفاخرة' },
    { id: 'petrochem', t1: 'SKPC', t2: 'AMOC', nameEn: 'Petrochem & Refining', nameAr: 'البتروكيماويات والتكرير' },
    { id: 'fintech', t1: 'FWRY', t2: 'EFIH', nameEn: 'Fintech & Payments', nameAr: 'المدفوعات والتكنولوجيا' }
  ];

  const activePairDef = pairsList.find(p => p.id === pairId) || pairsList[0];
  const pairData = CURATED_PAIRS[activePairDef.id] || CURATED_PAIRS.fertilizers;

  // Companies details from directory
  const compMap = new Map((D.companies || []).map(c => [c.ticker, c]));
  const c1 = compMap.get(activePairDef.t1) || { ticker: activePairDef.t1, name: { en: activePairDef.t1, ar: activePairDef.t1 } };
  const c2 = compMap.get(activePairDef.t2) || { ticker: activePairDef.t2, name: { en: activePairDef.t2, ar: activePairDef.t2 } };

  // Filter series by selected range
  const allPts = pairData.points || [];
  const cutoffYear = range === '1Y' ? '2025-09-01' : range === '2Y' ? '2024-09-01' : range === '3Y' ? '2023-09-01' : '2023-01-01';
  const pts = allPts.filter(p => p.d >= cutoffYear);
  const activePts = pts.length >= 2 ? pts : allPts;

  // Normalization transformations
  const p1Base = activePts[0]?.p1 || 1;
  const p2Base = activePts[0]?.p2 || 1;

  let y1Vals = [];
  let y2Vals = [];
  let ratioVals = [];

  if (normMode === 'price') {
    y1Vals = activePts.map(p => (p.p1 / p1Base) * 100);
    y2Vals = activePts.map(p => (p.p2 / p2Base) * 100);
  } else if (normMode === 'pe') {
    y1Vals = activePts.map(p => p.pe1);
    y2Vals = activePts.map(p => p.pe2);
  } else {
    // Valuation ratio (P/E 1 / P/E 2)
    ratioVals = activePts.map(p => (p.pe2 > 0 ? p.pe1 / p.pe2 : 1));
  }

  // Statistical calculations for ratio/spread
  let ratioMean = 1;
  let ratioStd = 0.2;
  if (normMode === 'ratio') {
    const sum = ratioVals.reduce((a, b) => a + b, 0);
    ratioMean = sum / Math.max(1, ratioVals.length);
    const varSum = ratioVals.reduce((a, b) => a + Math.pow(b - ratioMean, 2), 0);
    ratioStd = Math.sqrt(varSum / Math.max(1, ratioVals.length));
  }

  // Current values & delta
  const curr1 = normMode === 'price' ? y1Vals[y1Vals.length - 1] : activePts[activePts.length - 1]?.pe1 || 0;
  const curr2 = normMode === 'price' ? y2Vals[y2Vals.length - 1] : activePts[activePts.length - 1]?.pe2 || 0;
  const currRatio = (curr2 > 0 ? curr1 / curr2 : 1);
  const spreadZ = ratioStd > 0 ? (currRatio - ratioMean) / ratioStd : 0;

  // Editorial Insights per pair
  const insights = {
    fertilizers: {
      en: "ABUK and MFPC experienced an extreme valuation decoupling in early 2024, when MOPCO traded at an irrational 23.0x multiple vs Abou Kir at 6.5x (a 72% fundamental discount). Over 2024-2026, the gap steadily mean-reverted back to identical parity (~11.6x vs ~11.7x), completing a textbook cyclical mean-reversion cycle.",
      ar: "شهد سهما أبوقير وموبكو فجوة تقييم حادة مطلع عام ٢٠٢٤، حين صعد مضاعف موبكو لمستوى ٢٣٫٠× مقارنة بـ ٦٫٥× لأبوقير (خصم أساسي ٧٢٪). وخلال ٢٠٢٤-٢٠٢٦ عادت الشركتان إلى التكافؤ التام عند ~١١٫٦× مقابل ~١١٫٧× مكملةً دورة ارتداد مثالية نحو المتوسط."
    },
    urban_housing: {
      en: "Madinet Masr (MASR) trades at an ultra-low 4.7x P/E despite generating 3.65B EGP in net profit (higher than Heliopolis Housing's 2.71B EGP). HELI commands a steep 12.1x multiple due to its massive East Cairo land bank, which investors treat as an inflation hedge. In relative earnings terms, MASR offers asymmetric fundamental value.",
      ar: "تتداول مدينة مصر (MASR) عند مكرر ٤٫٧× فقط رغم تحقيقها ٣٫٦٥ مليار جنيه أرباحاً (أعلى من أرباح مصر الجديدة البالغة ٢٫٧١ مليار جنيه). في المقابل، تحظى مصر الجديدة (HELI) بمضاعف ١٢٫١× لمخزون أراضيها الضخم شرق القاهرة كتحوط من التضخم. من زاوية الربحية المجردة، تمثل مدينة مصر فرصة قيمة غير متماثلة."
    },
    banking: {
      en: "CIB (COMI) trades at 5.8x P/E while Crédit Agricole (CIEB) trades at 4.6x. Both possess clean corporate balance sheets, with CIB commanding a steady liquidity and size premium. When CIB's multiple exceeds 1.8x of CIEB, rotation into CIEB has historically generated strong alpha.",
      ar: "يتداول البنك التجاري الدولي (COMI) عند ٥٫٨× مقارنة بـ ٤٫٦× لكريدي أجريكول (CIEB). كلاهما يتمتع بميزانية مصرفية صلبة، مع علاوة سيولة وحجم لصالح التجاري. تاريخياً، حين تتجاوز علاوة التجاري ضعف مكرر كريدي أجريكول، يحقق التحول نحو الأخير عائداً إضافياً قوياً."
    },
    real_estate: {
      en: "During the Ras El Hekma announcement (March 2024), TMGH surged to a peak 48.0x P/E multiple against Palm Hills at 6.5x. Subsequently, TMGH delivered massive operational net profit growth (expanding from 3.35B to 18.20B EGP), compressing its P/E back down to 11.1x to converge with Palm Hills at 9.6x.",
      ar: "إبان إعلان صفقة رأس الحكمة (مارس ٢٠٢٤)، قفز مكرر مجموعة طلعت مصطفى إلى ذروة ٤٨٫٠× مقابل ٦٫٥× لبالم هيلز. لاحقاً، تضاعفت أرباح طلعت مصطفى التشغيلية من ٣٫٣٥ إلى ١٨٫٢ مليار جنيه، مما أدى لانكماش مكررها تلقائياً إلى ١١٫١× ليلتقي مجدداً مع بالم هيلز (٩٫٦×)."
    },
    petrochem: {
      en: "Sidi Kerir (SKPC) consistently trades at a higher multiple (18.6x) than Alexandria Mineral Oils (AMOC at 11.3x) due to petrochemical export margins and ethylene pricing power versus lower oil-refining margins.",
      ar: "يتداول سيدي كرير (SKPC) بانتظام بمكرر أعلى (١٨٫٦×) من الإسكندرية للزيوت (AMOC عند ١١٫٣×) بفعل هوامش التصدير البتروكيماوي وتسعير الإيثيلين مقابل هوامش تكرير النفط المنخفضة."
    },
    fintech: {
      en: "Fawry's multiple compressed from over 50x in 2023 down to 21.0x as its bottom line expanded past 3.1B EGP, while e-finance (EFIH) commands 33.5x supported by its government payment monopoly and virtually zero debt.",
      ar: "انكمش مكرر فوري من فوق ٥٠× في ٢٠٢٣ إلى ٢١٫٠× مع قفزة أرباحها الصافية فوق ٣٫١ مليار جنيه، بينما تستقر إي فاينانس (EFIH) عند ٣٣٫٥× بدعم من حصانتها الاحتكارية في المدفوعات الحكومية وميزانيتها الخالية من الديون."
    }
  };

  const activeInsight = insights[activePairDef.id] || insights.fertilizers;

  // ── Build Interactive SVG Chart ──
  const W = 1000;
  const H = 340;
  const padL = 60;
  const padR = 25;
  const padT = 30;
  const padB = 40;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  let chartNode = null;

  if (activePts.length >= 2) {
    if (normMode === 'ratio') {
      const minVal = Math.min(...ratioVals, ratioMean - 2 * ratioStd);
      const maxVal = Math.max(...ratioVals, ratioMean + 2 * ratioStd);
      const span = (maxVal - minVal) || 1;

      const getX = (i) => padL + (i / (activePts.length - 1)) * innerW;
      const getY = (v) => padT + (1 - (v - minVal) / span) * innerH;

      const pathD = ratioVals.map((v, i) => `${i === 0 ? 'M' : 'L'}${getX(i).toFixed(1)},${getY(v).toFixed(1)}`).join(' ');
      const areaD = `${pathD} L${getX(ratioVals.length - 1).toFixed(1)},${getY(minVal).toFixed(1)} L${padL},${getY(minVal).toFixed(1)} Z`;

      const yMean = getY(ratioMean);
      const yPlus1 = getY(ratioMean + ratioStd);
      const yMinus1 = getY(ratioMean - ratioStd);
      const yPlus2 = getY(ratioMean + 2 * ratioStd);
      const yMinus2 = getY(ratioMean - 2 * ratioStd);

      const elements = [
        React.createElement('rect', { x: padL, y: padT, width: innerW, height: innerH, fill: 'var(--sunk)', rx: 8 }),
        React.createElement('rect', { x: padL, y: Math.min(yPlus1, yMinus1), width: innerW, height: Math.abs(yMinus1 - yPlus1), fill: 'var(--iris)', fillOpacity: 0.08 }),
        React.createElement('line', { x1: padL, y1: yPlus2, x2: W - padR, y2: yPlus2, stroke: 'var(--down)', strokeDasharray: '3 3', strokeOpacity: 0.4 }),
        React.createElement('line', { x1: padL, y1: yMinus2, x2: W - padR, y2: yMinus2, stroke: 'var(--up)', strokeDasharray: '3 3', strokeOpacity: 0.4 }),
        React.createElement('line', { x1: padL, y1: yMean, x2: W - padR, y2: yMean, stroke: 'var(--t2)', strokeDasharray: '4 4', strokeWidth: 1.4 }),
        React.createElement('path', { d: areaD, fill: 'var(--accent)', fillOpacity: 0.09 }),
        React.createElement('path', { d: pathD, fill: 'none', stroke: 'var(--accent)', strokeWidth: 2.2, strokeLinejoin: 'round' }),
        React.createElement('text', { x: padL - 8, y: yMean + 4, textAnchor: 'end', fill: 'var(--t2)', fontSize: 11, fontFamily: 'monospace' }, `${ratioMean.toFixed(2)}x (Mean)`),
        React.createElement('text', { x: padL - 8, y: yPlus2 + 4, textAnchor: 'end', fill: 'var(--down)', fontSize: 10.5, fontFamily: 'monospace' }, `+2σ (${(ratioMean + 2 * ratioStd).toFixed(2)}x)`),
        React.createElement('text', { x: padL - 8, y: yMinus2 + 4, textAnchor: 'end', fill: 'var(--up)', fontSize: 10.5, fontFamily: 'monospace' }, `-2σ (${(ratioMean - 2 * ratioStd).toFixed(2)}x)`),
        React.createElement('circle', { cx: getX(ratioVals.length - 1), cy: getY(ratioVals[ratioVals.length - 1]), r: 5, fill: 'var(--accent)' }),
        React.createElement('text', { x: padL, y: H - 12, fill: 'var(--faint)', fontSize: 11, fontFamily: 'monospace' }, activePts[0].d),
        React.createElement('text', { x: W - padR, y: H - 12, textAnchor: 'end', fill: 'var(--faint)', fontSize: 11, fontFamily: 'monospace' }, activePts[activePts.length - 1].d)
      ];

      chartNode = React.createElement('svg', {
        viewBox: `0 0 ${W} ${H}`,
        style: { width: '100%', height: 'auto', display: 'block', maxHeight: '340px', direction: 'ltr' }
      }, ...elements);

    } else {
      const allVals = [...y1Vals, ...y2Vals];
      const minVal = Math.min(...allVals) * 0.95;
      const maxVal = Math.max(...allVals) * 1.05;
      const span = (maxVal - minVal) || 1;

      const getX = (i) => padL + (i / (activePts.length - 1)) * innerW;
      const getY = (v) => padT + (1 - (v - minVal) / span) * innerH;

      const pathD1 = y1Vals.map((v, i) => `${i === 0 ? 'M' : 'L'}${getX(i).toFixed(1)},${getY(v).toFixed(1)}`).join(' ');
      const pathD2 = y2Vals.map((v, i) => `${i === 0 ? 'M' : 'L'}${getX(i).toFixed(1)},${getY(v).toFixed(1)}`).join(' ');

      const areaD1 = `${pathD1} L${getX(y1Vals.length - 1).toFixed(1)},${padT + innerH} L${padL},${padT + innerH} Z`;
      const areaD2 = `${pathD2} L${getX(y2Vals.length - 1).toFixed(1)},${padT + innerH} L${padL},${padT + innerH} Z`;

      const ticks = [0.2, 0.4, 0.6, 0.8];
      const gridElements = ticks.map((f, i) => {
        const val = minVal + f * span;
        const yPos = getY(val);
        return [
          React.createElement('line', { key: `g_${i}`, x1: padL, y1: yPos, x2: W - padR, y2: yPos, stroke: 'var(--rule2)', strokeWidth: 1, strokeDasharray: '3 3' }),
          React.createElement('text', { key: `gt_${i}`, x: padL - 8, y: yPos + 4, textAnchor: 'end', fill: 'var(--faint)', fontSize: 10.5, fontFamily: 'monospace' },
            normMode === 'price' ? `${Math.round(val)}%` : `${val.toFixed(1)}x`)
        ];
      }).flat();

      const dateMarks = [0, Math.floor(activePts.length / 3), Math.floor(activePts.length * 2 / 3), activePts.length - 1];
      const dateElements = dateMarks.map((idx, i) => {
        const pt = activePts[idx];
        const xPos = getX(idx);
        const anchor = i === 0 ? 'start' : i === dateMarks.length - 1 ? 'end' : 'middle';
        return React.createElement('text', {
          key: `d_${i}`,
          x: xPos, y: H - 12,
          textAnchor: anchor,
          fill: 'var(--faint)',
          fontSize: 11,
          fontFamily: 'monospace'
        }, pt ? pt.d : '');
      });

      const elements = [
        React.createElement('rect', { x: padL, y: padT, width: innerW, height: innerH, fill: 'var(--sunk)', rx: 8 }),
        ...gridElements,
        React.createElement('path', { d: areaD1, fill: 'var(--accent)', fillOpacity: 0.08 }),
        React.createElement('path', { d: areaD2, fill: 'var(--down)', fillOpacity: 0.06 }),
        React.createElement('path', { d: pathD1, fill: 'none', stroke: 'var(--accent)', strokeWidth: 2.8, strokeLinejoin: 'round', strokeLinecap: 'round' }),
        React.createElement('path', { d: pathD2, fill: 'none', stroke: 'var(--down)', strokeWidth: 2.6, strokeLinejoin: 'round', strokeLinecap: 'round' }),
        React.createElement('circle', { cx: getX(y1Vals.length - 1), cy: getY(y1Vals[y1Vals.length - 1]), r: 5.5, fill: 'var(--accent)' }),
        React.createElement('circle', { cx: getX(y2Vals.length - 1), cy: getY(y2Vals[y2Vals.length - 1]), r: 5.5, fill: 'var(--down)' }),
        ...dateElements
      ];

      chartNode = React.createElement('svg', {
        viewBox: `0 0 ${W} ${H}`,
        style: { width: '100%', height: 'auto', display: 'block', maxHeight: '340px', direction: 'ltr' }
      }, ...elements);
    }
  }

  // Scorecard metrics comparison table
  const r1 = c1.ratios || {};
  const r2 = c2.ratios || {};

  const scoreRows = [
    { label: ar ? 'سعر الإغلاق الأخير' : 'Last Close Price', v1: `${component.num(c1.close, 2)} EGP`, v2: `${component.num(c2.close, 2)} EGP` },
    { label: ar ? 'القيمة السوقية' : 'Market Capitalization', v1: `${component.num((c1.cap || 0) / 1e9, 2)}B EGP`, v2: `${component.num((c2.cap || 0) / 1e9, 2)}B EGP` },
    { label: ar ? 'صافي الربح السنوي' : 'Trailing Net Income', v1: `${component.num(c1.profit || 0, 1)}M EGP`, v2: `${component.num(c2.profit || 0, 1)}M EGP` },
    { label: ar ? 'مكرر الربحية (P/E)' : 'P/E Multiple', v1: `${component.num(c1.pe, 2)}x`, v2: `${component.num(c2.pe, 2)}x`, highlight: true },
    { label: ar ? 'مضاعف القيمة الدفترية (P/B)' : 'Price to Book (P/B)', v1: `${component.num(r1.pb || 0, 2)}x`, v2: `${component.num(r2.pb || 0, 2)}x` },
    { label: ar ? 'الدين / حقوق الملكية' : 'Debt to Equity', v1: `${component.num(r1.debt_equity || 0, 2)}x`, v2: `${component.num(r2.debt_equity || 0, 2)}x` },
    { label: ar ? 'العائد على حقوق الملكية (ROE)' : 'Return on Equity (ROE)', v1: `${component.num((r1.roe || 0) * 100, 1)}%`, v2: `${component.num((r2.roe || 0) * 100, 1)}%` },
    { label: ar ? 'عائد التوزيعات النقدية' : 'Dividend Yield', v1: `${component.num(r1.dividend_yield || 0, 1)}%`, v2: `${component.num(r2.dividend_yield || 0, 1)}%` }
  ];

  return {
    title: ar ? 'مقارنة الأزواج والفروق السعرية' : 'Pairs & Divergence Explorer',
    lead: ar
      ? 'مقارنة دقيقة بين الأسهم المتنافسة في نفس القطاع. عاير المسار بحسب عائد السعر أو مضاعف الربحية (P/E) لرصد الاختلالات السوقية والفرص النسبية.'
      : 'Analyze competing peers within the same sector. Normalize curves by price return or fundamental earnings multiple (P/E) to spot market inefficiencies.',
    normalizeLabel: ar ? 'المعايرة:' : 'NORMALIZE:',
    scorecardTitle: ar ? 'بطاقة المقارنة المالية' : 'Fundamentals Scorecard',
    ratioCardLabel: ar ? 'نسبة التقييم (P/E أ ÷ ب)' : 'VALUATION RATIO (P/E A ÷ B)',
    pairs: pairsList.map(p => ({
      id: p.id,
      label: ar ? `${p.nameAr} (${p.t1} / ${p.t2})` : `${p.nameEn} (${p.t1} / ${p.t2})`,
      selected: p.id === activePairDef.id,
      go: () => component.setState({ pairId: p.id })
    })),
    normModes: [
      { id: 'pe', label: ar ? 'مكرر الربحية (P/E)' : 'P/E Multiple (Cap ÷ Profit)', selected: normMode === 'pe', go: () => component.setState({ pairNorm: 'pe' }) },
      { id: 'price', label: ar ? 'عائد السعر (أساس ١٠٠)' : 'Price Return (Base 100)', selected: normMode === 'price', go: () => component.setState({ pairNorm: 'price' }) },
      { id: 'ratio', label: ar ? 'نسبة التقييم ومجال الانحراف' : 'Valuation Ratio & Z-Spread', selected: normMode === 'ratio', go: () => component.setState({ pairNorm: 'ratio' }) }
    ],
    ranges: ['1Y', '2Y', '3Y', 'ALL'].map(r => ({
      label: r,
      selected: r === range,
      go: () => component.setState({ pairRange: r })
    })),
    t1: activePairDef.t1,
    t2: activePairDef.t2,
    name1: component.nm(c1.name),
    name2: component.nm(c2.name),
    curr1: normMode === 'price' ? `${curr1.toFixed(1)}%` : `${curr1.toFixed(1)}x`,
    curr2: normMode === 'price' ? `${curr2.toFixed(1)}%` : `${curr2.toFixed(1)}x`,
    ratioText: `${currRatio.toFixed(2)}x`,
    zScoreText: `${spreadZ > 0 ? '+' : ''}${spreadZ.toFixed(2)}σ`,
    chartNode,
    scoreRows,
    insight: ar ? activeInsight.ar : activeInsight.en,
    insightTitle: ar ? 'قراءة في تباعد الأداء والتقييم' : 'Inefficiency & Valuation Analysis',
    normExplain: normMode === 'pe'
      ? (ar ? 'كل نقطة تمثل القيمة السوقية مقسومة على صافي أرباح آخر ١٢ شهراً للشركة في ذلك التاريخ.' : 'Each point plots Market Capitalization divided by Trailing 12-Month Net Profit on that date.')
      : normMode === 'price'
      ? (ar ? 'تمت معايرة السعرين ليبدآ من ١٠٠ عند بداية الفترة المحددة، مما يوضح العائد الرأسمالي المقارن.' : 'Prices are rebased to 100 at the start of the window, showing relative capital appreciation.')
      : (ar ? 'منحنى النسبة (مكرر السهم الأول ÷ مكرر السهم الثاني) مع خط المتوسط ومجال الانحراف المعياري ±٢σ.' : 'Valuation Ratio curve (Multiple A ÷ Multiple B) with historical mean and ±2σ standard deviation bands.')
  };
}

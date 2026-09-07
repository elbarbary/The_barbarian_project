import { BROKER_PROFILES, SIM_STOCKS } from './simulator-data.js';

/**
 * Trading & App Fee Simulation Explorer (محاكي عوائد ورسوم التداول)
 * Simulates buy and sell executions across real Egyptian investment apps and brokers,
 * factoring in exact commission rates, ticket minimums, MCDR clearing, and EGX/FRA regulatory fees.
 */
export function simulatorExplorer(component, D, ar, React) {
  const st = component.state;

  // Selected state
  const selectedTicker = st.simTicker && SIM_STOCKS[st.simTicker] ? st.simTicker : 'COMI';
  const strategy = st.simStrategy === 'dca' ? 'dca' : 'lump'; // 'lump' | 'dca'
  const range = st.simRange || '3Y'; // '1Y' | '2Y' | '3Y' | '5Y' | '10Y' | 'MAX' | 'CUSTOM'
  const capital = Math.max(1000, Number(st.simCapital) || 50000);
  const monthlyAmount = Math.max(200, Number(st.simMonthly) || 2500);

  const activeStock = SIM_STOCKS[selectedTicker] || SIM_STOCKS['COMI'];

  // Combine monthly series and recent daily series into unified chronological points
  const rawMonthly = activeStock.monthly || [];
  const rawDaily = activeStock.recentDaily || [];
  
  // Merge and deduplicate by date
  const ptsMap = new Map();
  for (const pt of rawMonthly) {
    ptsMap.set(pt[0], pt[1]);
  }
  for (const pt of rawDaily) {
    ptsMap.set(pt[0], pt[1]);
  }
  const allBars = Array.from(ptsMap.entries())
    .map(([date, close]) => ({ date, close }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  const totalBarsCount = allBars.length;
  const earliestDate = allBars[0]?.date || '2001-01-01';
  const latestDate = allBars[allBars.length - 1]?.date || '2026-09-06';

  // Calculate start and end date based on range
  let startDate = earliestDate;
  let endDate = latestDate;

  if (range === 'CUSTOM' && st.simStartDate && st.simEndDate) {
    startDate = st.simStartDate;
    endDate = st.simEndDate;
  } else if (range === '1Y') {
    startDate = getPastDate(latestDate, 1);
  } else if (range === '2Y') {
    startDate = getPastDate(latestDate, 2);
  } else if (range === '3Y') {
    startDate = getPastDate(latestDate, 3);
  } else if (range === '5Y') {
    startDate = getPastDate(latestDate, 5);
  } else if (range === '10Y') {
    startDate = getPastDate(latestDate, 10);
  } else if (range === 'MAX') {
    startDate = earliestDate;
  }

  // Filter bars in range
  let rangeBars = allBars.filter(b => b.date >= startDate && b.date <= endDate);
  if (rangeBars.length < 2) {
    // Fallback if range is too narrow
    rangeBars = allBars.slice(-24);
    if (rangeBars.length < 2) rangeBars = allBars;
  }

  const firstBar = rangeBars[0];
  const lastBar = rangeBars[rangeBars.length - 1];
  const buyPrice = firstBar.close;
  const sellPrice = lastBar.close;
  const rawPriceChangePct = ((sellPrice - buyPrice) / buyPrice) * 100;

  // ════════════════════════════════════════════════════════════════════════════
  // SIMULATION ENGINE
  // ════════════════════════════════════════════════════════════════════════════
  const brokerOutcomes = BROKER_PROFILES.map(broker => {
    let investedCapital = 0;
    let grossEndingValue = 0;
    let totalBrokerFee = 0;
    let totalRegFee = 0;
    let totalTicketFee = 0;
    let executionCount = 0;
    let sharesCount = 0;

    if (strategy === 'lump') {
      // ── Strategy A: Lump Sum Investment ──
      investedCapital = capital;
      executionCount = 2; // 1 Buy + 1 Sell

      // 1. Buy Execution
      const buyBrokerComm = Math.max(investedCapital * broker.brokerPct, broker.brokerMin);
      const buyTicket = broker.ticketFee;
      const buyReg = investedCapital * broker.regPct + broker.mcdrTicket;
      const buyFee = buyBrokerComm + buyTicket + buyReg;

      // Net capital deployed into shares
      const netBuyInvested = Math.max(0, investedCapital - buyFee);
      sharesCount = netBuyInvested / buyPrice;

      // 2. Sell Execution
      grossEndingValue = sharesCount * sellPrice;
      const sellBrokerComm = Math.max(grossEndingValue * broker.brokerPct, broker.brokerMin);
      const sellTicket = broker.ticketFee;
      const sellReg = grossEndingValue * broker.regPct + broker.mcdrTicket;
      const sellFee = sellBrokerComm + sellTicket + sellReg;

      // Net Cash after sale
      const netEndingCash = Math.max(0, grossEndingValue - sellFee);

      totalBrokerFee = buyBrokerComm + sellBrokerComm;
      totalTicketFee = buyTicket + sellTicket;
      totalRegFee = buyReg + sellReg;

      const totalFees = totalBrokerFee + totalTicketFee + totalRegFee;
      const netProfit = netEndingCash - investedCapital;
      const netReturnPct = (netProfit / investedCapital) * 100;
      const feeDragPct = (totalFees / investedCapital) * 100;

      return {
        ...broker,
        investedCapital,
        grossEndingValue,
        netEndingCash,
        sharesCount: Math.floor(sharesCount),
        totalFees,
        totalBrokerFee,
        totalRegFee: totalRegFee + totalTicketFee,
        netProfit,
        netReturnPct,
        feeDragPct,
        executionCount,
        avgCostPerShare: buyPrice
      };
    } else {
      // ── Strategy B: Monthly DCA Investment ──
      // Sample monthly tranches across the range
      const dcaBars = [];
      const seenMonths = new Set();
      for (const b of rangeBars) {
        const ym = b.date.slice(0, 7);
        if (!seenMonths.has(ym)) {
          seenMonths.add(ym);
          dcaBars.push(b);
        }
      }
      if (dcaBars.length < 2) dcaBars.push(lastBar);

      const monthsCount = dcaBars.length;
      investedCapital = monthlyAmount * monthsCount;
      executionCount = monthsCount + 1; // monthly buys + 1 final sell

      let totalShares = 0;
      let buyBrokerCommTotal = 0;
      let buyTicketTotal = 0;
      let buyRegTotal = 0;

      for (const bar of dcaBars) {
        const mBrokerComm = Math.max(monthlyAmount * broker.brokerPct, broker.brokerMin);
        const mTicket = broker.ticketFee;
        const mReg = monthlyAmount * broker.regPct + broker.mcdrTicket;
        const mFee = mBrokerComm + mTicket + mReg;

        buyBrokerCommTotal += mBrokerComm;
        buyTicketTotal += mTicket;
        buyRegTotal += mReg;

        const mNetBuy = Math.max(0, monthlyAmount - mFee);
        totalShares += mNetBuy / bar.close;
      }

      sharesCount = totalShares;
      grossEndingValue = totalShares * sellPrice;

      // Final Sell Execution
      const sellBrokerComm = Math.max(grossEndingValue * broker.brokerPct, broker.brokerMin);
      const sellTicket = broker.ticketFee;
      const sellReg = grossEndingValue * broker.regPct + broker.mcdrTicket;
      const sellFee = sellBrokerComm + sellTicket + sellReg;

      const netEndingCash = Math.max(0, grossEndingValue - sellFee);

      totalBrokerFee = buyBrokerCommTotal + sellBrokerComm;
      totalTicketFee = buyTicketTotal + sellTicket;
      totalRegFee = buyRegTotal + sellReg;

      const totalFees = totalBrokerFee + totalTicketFee + totalRegFee;
      const netProfit = netEndingCash - investedCapital;
      const netReturnPct = (netProfit / investedCapital) * 100;
      const feeDragPct = (totalFees / investedCapital) * 100;
      const avgCostPerShare = totalShares > 0 ? (investedCapital / totalShares) : buyPrice;

      return {
        ...broker,
        investedCapital,
        grossEndingValue,
        netEndingCash,
        sharesCount: Math.floor(sharesCount),
        totalFees,
        totalBrokerFee,
        totalRegFee: totalRegFee + totalTicketFee,
        netProfit,
        netReturnPct,
        feeDragPct,
        executionCount,
        avgCostPerShare
      };
    }
  });

  // Sort brokers: highest net return (lowest total fees) first
  brokerOutcomes.sort((a, b) => b.netEndingCash - a.netEndingCash);

  const bestBroker = brokerOutcomes[0];
  const worstBroker = brokerOutcomes[brokerOutcomes.length - 1];
  const feeDifference = Math.max(0, worstBroker.totalFees - bestBroker.totalFees);
  const netDifference = Math.max(0, bestBroker.netEndingCash - worstBroker.netEndingCash);

  // Normalization for visual progress bars
  const maxNetCash = Math.max(...brokerOutcomes.map(b => b.netEndingCash), 1);
  const maxFees = Math.max(...brokerOutcomes.map(b => b.totalFees), 1);

  const brokerCards = brokerOutcomes.map((b, idx) => {
    const isWinner = idx === 0;
    const netCashPct = Math.max(15, Math.round((b.netEndingCash / maxNetCash) * 100));
    const feeBarPct = Math.max(8, Math.round((b.totalFees / maxFees) * 100));

    return {
      id: b.id,
      name: ar ? b.nameAr : b.nameEn,
      type: ar ? b.typeAr : b.typeEn,
      badge: ar ? b.badgeAr : b.badge,
      tagline: ar ? b.taglineAr : b.taglineEn,
      color: b.color,
      bgTint: b.bgTint,
      borderTint: b.borderTint,
      isWinner,
      investedCapital: b.investedCapital,
      investedCapitalFmt: fmtNum(b.investedCapital),
      netEndingCash: b.netEndingCash,
      netEndingCashFmt: fmtNum(b.netEndingCash),
      netProfitFmt: (b.netProfit >= 0 ? '+' : '') + fmtNum(b.netProfit),
      netReturnPctFmt: (b.netReturnPct >= 0 ? '+' : '') + b.netReturnPct.toFixed(2) + '%',
      isProfitPositive: b.netProfit >= 0,
      totalFees: b.totalFees,
      totalFeesFmt: fmtNum(b.totalFees),
      brokerFeeFmt: fmtNum(b.totalBrokerFee),
      regFeeFmt: fmtNum(b.totalRegFee),
      feeDragPctFmt: b.feeDragPct.toFixed(2) + '%',
      sharesCountFmt: fmtNum(b.sharesCount),
      executionsFmt: b.executionCount,
      netCashBarWidth: `${netCashPct}%`,
      feeBarWidth: `${feeBarPct}%`,
      winnerBadgeText: ar ? 'الخيار الأوفر' : 'Best Value',
      rankNum: idx + 1
    };
  });

  // ════════════════════════════════════════════════════════════════════════════
  // SVG PRICE TRAJECTORY SPARKLINE WITH BUY & SELL PINS
  // ════════════════════════════════════════════════════════════════════════════
  const svgW = 600;
  const svgH = 140;
  const padX = 25;
  const padY = 20;

  const closes = rangeBars.map(b => b.close);
  const minP = Math.min(...closes);
  const maxP = Math.max(...closes);
  const pSpan = maxP - minP || 1;

  const pts = rangeBars.map((b, i) => {
    const x = padX + (i / (rangeBars.length - 1 || 1)) * (svgW - 2 * padX);
    const y = svgH - padY - ((b.close - minP) / pSpan) * (svgH - 2 * padY);
    return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, date: b.date, close: b.close };
  });

  const lineD = pts.length > 0
    ? 'M' + pts.map(p => `${p.x} ${p.y}`).join(' L')
    : '';

  const areaD = pts.length > 0
    ? `${lineD} L${pts[pts.length - 1].x} ${svgH} L${pts[0].x} ${svgH} Z`
    : '';

  const buyPin = pts[0] || { x: padX, y: svgH / 2, close: buyPrice, date: firstBar.date };
  const sellPin = pts[pts.length - 1] || { x: svgW - padX, y: svgH / 2, close: sellPrice, date: lastBar.date };

  // Stock selector options & Featured quick-pick tickers
  const FEATURED_TICKERS = ['COMI', 'SWDY', 'ABUK', 'MFPC', 'ETEL', 'FWRY', 'HRHO', 'TMGH', 'EAST', 'HELI', 'AMOC', 'JUFO', 'ISPH', 'SKPC', 'CLHO', 'CCAP', 'EFIH', 'ALCN', 'GBCO', 'DSCW', 'CIEB', 'ADIB', 'ORAS', 'PHDC', 'BTFH', 'OCDI', 'EMFD', 'ORWE', 'EGAL', 'EGCH', 'RAYA', 'RMDA', 'TAQA', 'VALU'];
  
  const featuredStocks = FEATURED_TICKERS.filter(t => SIM_STOCKS[t]).map(t => {
    const s = SIM_STOCKS[t];
    return {
      ticker: s.ticker,
      name: ar ? s.nameAr : s.nameEn,
      isSelected: s.ticker === selectedTicker,
      pick: () => component.setState({ simTicker: s.ticker, simSearchQuery: '' })
    };
  });

  const searchQuery = (st.simSearchQuery || '').trim().toLowerCase();
  const hasSearchQuery = searchQuery.length > 0;
  const searchMatches = searchQuery.length >= 1
    ? Object.values(SIM_STOCKS).filter(s => 
        s.ticker.toLowerCase().includes(searchQuery) ||
        (s.nameAr && s.nameAr.includes(searchQuery)) ||
        (s.nameEn && s.nameEn.toLowerCase().includes(searchQuery))
      ).slice(0, 10).map(s => ({
        ticker: s.ticker,
        name: ar ? s.nameAr : s.nameEn,
        sector: ar ? s.sectorAr : s.sector,
        years: `${s.firstDate.slice(0, 4)}-${s.lastDate.slice(0, 4)}`,
        pick: () => component.setState({ simTicker: s.ticker, simSearchQuery: '' })
      }))
    : [];

  const stockOptions = Object.values(SIM_STOCKS).map(s => ({
    ticker: s.ticker,
    name: ar ? s.nameAr : s.nameEn,
    sector: ar ? s.sectorAr : s.sector,
    firstYear: s.firstDate.slice(0, 4),
    lastYear: s.lastDate.slice(0, 4),
    isSelected: s.ticker === selectedTicker,
    pick: () => component.setState({ simTicker: s.ticker })
  })).sort((a, b) => a.ticker.localeCompare(b.ticker));

  // Horizon preset pills
  const rangePresets = [
    { id: '1Y', label: ar ? 'سنة واحدة' : '1 Year', active: range === '1Y', pick: () => component.setState({ simRange: '1Y' }) },
    { id: '2Y', label: ar ? 'سنتان' : '2 Years', active: range === '2Y', pick: () => component.setState({ simRange: '2Y' }) },
    { id: '3Y', label: ar ? '٣ سنوات' : '3 Years', active: range === '3Y', pick: () => component.setState({ simRange: '3Y' }) },
    { id: '5Y', label: ar ? '٥ سنوات' : '5 Years', active: range === '5Y', pick: () => component.setState({ simRange: '5Y' }) },
    { id: '10Y', label: ar ? '١٠ سنوات' : '10 Years', active: range === '10Y', pick: () => component.setState({ simRange: '10Y' }) },
    { id: 'MAX', label: ar ? 'أقصى مدى (' + earliestDate.slice(0, 4) + ')' : 'MAX (' + earliestDate.slice(0, 4) + ')', active: range === 'MAX', pick: () => component.setState({ simRange: 'MAX' }) }
  ];

  // Capital presets
  const capitalPresets = [10000, 25000, 50000, 100000, 250000, 500000].map(v => ({
    val: v,
    label: fmtNum(v),
    active: capital === v,
    pick: () => component.setState({ simCapital: v })
  }));

  // Handlers
  const setStock = (ticker) => component.setState({ simTicker: ticker });
  const setStrategy = (strat) => component.setState({ simStrategy: strat });
  const setRange = (rng) => component.setState({ simRange: rng });
  const setCapital = (val) => component.setState({ simCapital: val });
  const onCapitalChange = (e) => {
    const val = Number(e.target.value.replace(/[^0-9]/g, '')) || 0;
    component.setState({ simCapital: val });
  };
  const onMonthlyChange = (e) => {
    const val = Number(e.target.value.replace(/[^0-9]/g, '')) || 0;
    component.setState({ simMonthly: val });
  };

  return {
    // Current stock info
    ticker: activeStock.ticker,
    name: ar ? activeStock.nameAr : activeStock.nameEn,
    sector: ar ? activeStock.sectorAr : activeStock.sector,
    earliestYear: earliestDate.slice(0, 4),
    latestYear: latestDate.slice(0, 4),
    totalYearsAvailable: Math.max(1, Math.round((new Date(latestDate) - new Date(earliestDate)) / (365.25 * 86400000))),
    stockOptions,
    setStock,
    featuredStocks,
    searchQuery,
    hasSearchQuery,
    searchMatches,
    onSearchChange: (e) => component.setState({ simSearchQuery: e.target.value }),
    clearSearch: () => component.setState({ simSearchQuery: '' }),

    // Strategy & Inputs
    strategy,
    isLumpSum: strategy === 'lump',
    isDca: strategy === 'dca',
    setLumpStrategy: () => setStrategy('lump'),
    setDcaStrategy: () => setStrategy('dca'),
    capital,
    capitalFmt: fmtNum(capital),
    monthlyAmount,
    monthlyAmountFmt: fmtNum(monthlyAmount),
    onCapitalChange,
    onMonthlyChange,
    capitalPresets,
    setCapital,

    // Time horizon
    range,
    rangePresets,
    setRange,
    startDateFmt: firstBar.date,
    endDateFmt: lastBar.date,
    buyPriceFmt: buyPrice.toFixed(2),
    sellPriceFmt: sellPrice.toFixed(2),
    rawPriceChangePctFmt: (rawPriceChangePct >= 0 ? '+' : '') + rawPriceChangePct.toFixed(2) + '%',
    isPriceUp: rawPriceChangePct >= 0,

    // Broker outcomes & cards
    brokerCards,
    bestBrokerName: ar ? bestBroker.nameAr : bestBroker.nameEn,
    bestBrokerNetFmt: fmtNum(bestBroker.netEndingCash),
    worstBrokerName: ar ? worstBroker.nameAr : worstBroker.nameEn,
    feeDifferenceFmt: fmtNum(feeDifference),
    netDifferenceFmt: fmtNum(netDifference),
    hasSignificantFeeSpread: feeDifference > 50,

    // Chart data
    svgW,
    svgH,
    lineD,
    areaD,
    buyPin,
    sellPin,

    // Labels & UX copy
    L: {
      title: ar ? 'محاكي عوائد ورسوم التداول' : 'Trading & App Fee Simulator',
      lead: ar
        ? 'قارن عوائد الشراء والبيع بالجنيه عبر تطبيقات ومنصات السمسرة المصرية (ثندر، هيرميس، مباشر، بلتون، سي آي كابيتال، البنوك) بعد خصم العمولات والحد الأدنى ورسوم البورصة والمقاصة والرقابة.'
        : 'Compare net trading returns across Egyptian trading apps and brokers (Thndr, EFG Hermes, Mubasher, Beltone, CI Capital, Banks) factoring in exact commissions, ticket minimums, MCDR clearing, and EGX fees.',
      stockSelectLabel: ar ? 'اختر السهم من البورصة المصرية' : 'Select EGX Stock',
      strategyLabel: ar ? 'نمط الاستثمار والتكرار' : 'Investment Strategy & Frequency',
      lumpLabel: ar ? 'دفعة واحدة (شراء وبيع)' : 'Lump Sum (Entry & Liquidation)',
      dcaLabel: ar ? 'استثمار شهري دوري (DCA)' : 'Monthly Recurring DCA',
      capitalLabel: ar ? 'رأس المال المستثمر (جنيه)' : 'Invested Capital (EGP)',
      monthlyLabel: ar ? 'مبلغ الاستثمار الشهري (جنيه)' : 'Monthly Amount (EGP)',
      horizonLabel: ar ? 'الفترة الزمنية وتاريخ الشراء والبيع' : 'Time Horizon & Execution Window',
      comparisonTitle: ar ? 'مقارنة صافي العائد والمحفظة بين التطبيقات' : 'Net Outcome & Fee Comparison Across Apps',
      winnerNotice: ar
        ? `الخيار الأوفر لهذه العملية هو ${bestBroker.nameAr}، بفرق توفير رسوم ${fmtNum(feeDifference)} ج.م مقارنة بأعلى منصة.`
        : `Best value broker is ${bestBroker.nameEn}, saving ${fmtNum(feeDifference)} EGP in fees compared to the highest-cost platform.`,
      feeDragNote: ar
        ? 'تنبيه: في المبالغ الصغيرة أو الاستثمار الشهري المتكرر، الرسوم الثابتة والحد الأدنى للتذكرة (10-25 ج) تلتهم نسبة كبيرة من رأس المال، بينما في المبالغ الكبيرة تتفوق العمولات النسبية الأقل.'
        : 'Note: For small or frequent monthly trades, fixed ticket minimums (10-25 EGP) create severe fee drag, whereas for larger trades, lower percentage commissions dominate.',
      brokerCol: ar ? 'منصة التداول' : 'Trading Platform',
      netCashCol: ar ? 'صافي المبلغ عند البيع' : 'Net Cash at Exit',
      netReturnCol: ar ? 'صافي العائد (%)' : 'Net Return (%)',
      totalFeesCol: ar ? 'إجمالي الرسوم' : 'Total Fees Paid',
      brokerFeeLabel: ar ? 'عمولة سمسرة' : 'Broker Comm',
      regFeeLabel: ar ? 'رسوم بورصة ومقاصة' : 'Reg & MCDR',
      feeDragLabel: ar ? 'نسبة الهدر بالرسوم' : 'Fee Drag',
      sharesLabel: ar ? 'عدد الأسهم' : 'Shares Acquired',
      execLabel: ar ? 'عدد العمليات' : 'Executions',
      searchPlaceholder: ar ? 'ابحث باسم أو رمز أي سهم...' : 'Search stock name or ticker...',
      lumpDesc: ar ? 'عملية شراء واحدة في بداية الفترة وعملية بيع في نهايتها.' : 'Single entry execution at start, full liquidation at exit.',
      dcaDesc: ar ? 'شراء شهري منتظم في نهاية كل شهر، ثم تسييل المحفظة بالكامل.' : 'Periodic monthly acquisitions at month closes, liquidated at exit.',
      buyPrefix: ar ? 'دخول:' : 'Entry:',
      sellPrefix: ar ? 'خروج:' : 'Exit:',
      trajectoryTitle: ar ? 'مسار السهم السعري الفعلي خلال الفترة المحاكاة' : 'Actual Historical Stock Price Trajectory',
      rawPriceMove: ar ? 'تغير السعر الخام' : 'raw price move',
      firstBuyPrefix: ar ? 'نقطة الشراء الأولى: ' : 'First Entry: ',
      finalSellPrefix: ar ? 'نقطة البيع والتسييل: ' : 'Final Exit: ',
      savePrefix: ar ? 'وفر ' : 'Save '
    }
  };
}

// Helpers
function fmtNum(n) {
  if (typeof n !== 'number' || isNaN(n)) return '0';
  return Math.round(n).toLocaleString('en-US');
}

function getPastDate(referenceDateStr, yearsBack) {
  try {
    const d = new Date(referenceDateStr);
    d.setFullYear(d.getFullYear() - yearsBack);
    return d.toISOString().slice(0, 10);
  } catch {
    return '2020-01-01';
  }
}

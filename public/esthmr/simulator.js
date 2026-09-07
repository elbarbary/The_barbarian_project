import { BROKER_PROFILES, SIM_STOCKS, STANDARD_STATUTORY_FEES } from './simulator-data.js';

/**
 * Trading & App Fee Simulation Explorer (محاكي عوائد ورسوم التداول)
 * Simulates entry and liquidation executions across real Egyptian investment apps and brokers,
 * factoring in exact commission rates, ticket minimums, MCDR clearing, and EGX/FRA regulatory fees.
 */
export function simulatorExplorer(component, D, ar, React) {
  const st = (component && component.state) ? component.state : {};

  // Selected state: Default to Beltone (BTFH) daily trading for 2 years
  const defaultTicker = SIM_STOCKS['BTFH'] ? 'BTFH' : (SIM_STOCKS['COMI'] ? 'COMI' : Object.keys(SIM_STOCKS)[0]);
  const selectedTicker = st.simTicker && SIM_STOCKS[st.simTicker] ? st.simTicker : defaultTicker;
  const strategy = st.simStrategy || 'daily'; // 'daily' | 'lump' | 'dca'
  const range = st.simRange || '2Y'; // '1Y' | '2Y' | '3Y' | '5Y' | '10Y' | 'MAX' | 'CUSTOM'
  const capital = Math.max(1000, Number(st.simCapital) || 50000);
  const monthlyAmount = Math.max(200, Number(st.simMonthly) || 2500);
  const includeThndrSub = Boolean(st.includeThndrSub);

  const activeStock = SIM_STOCKS[selectedTicker] || SIM_STOCKS['BTFH'] || SIM_STOCKS['COMI'];

  // Combine monthly series and daily series into unified chronological points
  const rawMonthly = activeStock.monthly || [];
  const rawDaily2Y = activeStock.daily2Y || [];
  const rawDailyRecent = activeStock.recentDaily || [];

  const ptsMap = new Map();
  for (const pt of rawMonthly) {
    ptsMap.set(pt[0], pt[1]);
  }
  for (const pt of rawDailyRecent) {
    ptsMap.set(pt[0], pt[1]);
  }
  for (const pt of rawDaily2Y) {
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
    rangeBars = allBars.slice(-24);
    if (rangeBars.length < 2) rangeBars = allBars;
  }

  // Dedicated continuous daily bars for active daily strategy
  let dailyBars = (rawDaily2Y || [])
    .map(b => ({ date: b[0], close: b[1] }))
    .filter(b => b.date >= startDate && b.date <= endDate);

  if (dailyBars.length < 10) {
    dailyBars = rangeBars;
  }

  const activeBars = strategy === 'daily' ? dailyBars : rangeBars;
  const firstBar = activeBars[0];
  const lastBar = activeBars[activeBars.length - 1];
  const buyPrice = firstBar.close;
  const sellPrice = lastBar.close;
  const rawPriceChangePct = ((sellPrice - buyPrice) / buyPrice) * 100;

  // Approximate duration in months for subscription modeling
  const startYear = parseInt(firstBar.date.slice(0, 4), 10);
  const startMonth = parseInt(firstBar.date.slice(5, 7), 10);
  const endYear = parseInt(lastBar.date.slice(0, 4), 10);
  const endMonth = parseInt(lastBar.date.slice(5, 7), 10);
  const horizonMonths = Math.max(1, (endYear - startYear) * 12 + (endMonth - startMonth) + 1);

  // ════════════════════════════════════════════════════════════════════════════
  // SIMULATION ENGINE (Daily Turnover, Lump Sum, DCA)
  // ════════════════════════════════════════════════════════════════════════════
  const brokerOutcomes = BROKER_PROFILES.map(broker => {
    let investedCapital = 0;
    let grossEndingValue = 0;
    let netEndingCash = 0;
    let totalBrokerFee = 0;
    let totalStatutoryFee = 0;
    let totalTicketFee = 0;
    let totalSubFee = 0;
    let executionCount = 0;
    let sharesCount = 0;
    let netProfit = 0;
    let netReturnPct = 0;
    let feeDragPct = 0;
    let avgCostPerShare = buyPrice;
    let trajectoryPoints = []; // for plotting multi-line series

    if (strategy === 'daily') {
      // ── Strategy 1: Active Daily Turnover (Daily Entry & Exit) ──
      investedCapital = capital;
      const sessionCount = dailyBars.length;
      executionCount = sessionCount * 2; // 1 Entry + 1 Exit per session

      let cumNetPnl = 0;
      let cumGrossPnl = 0;

      for (let i = 0; i < sessionCount; i++) {
        const prevClose = i === 0 ? dailyBars[0].close : dailyBars[i - 1].close;
        const currClose = dailyBars[i].close;
        const ratio = prevClose > 0 ? (currClose / prevClose) : 1.0;

        // 1. Session Entry Execution
        const entryBrokerComm = Math.max(capital * broker.brokerPct, broker.brokerMin);
        const entryTicket = broker.ticketFee;
        const entryStatutory = capital * broker.regPct + broker.mcdrTicket;
        const entryTotalFee = entryBrokerComm + entryTicket + entryStatutory;

        // Net capital deployed in shares for the day
        const netCapitalDeployed = Math.max(0, capital - entryTotalFee);
        const dayShares = currClose > 0 ? (netCapitalDeployed / currClose) : 0;
        sharesCount += dayShares;

        // 2. Session Exit Execution at day close
        const grossSessionExit = netCapitalDeployed * ratio;
        const exitBrokerComm = Math.max(grossSessionExit * broker.brokerPct, broker.brokerMin);
        const exitTicket = broker.ticketFee;
        const exitStatutory = grossSessionExit * broker.regPct + broker.mcdrTicket;
        const exitTotalFee = exitBrokerComm + exitTicket + exitStatutory;

        const netSessionCash = Math.max(0, grossSessionExit - exitTotalFee);
        const dayNetPnl = netSessionCash - capital;
        const dayGrossPnl = capital * (ratio - 1.0);

        cumNetPnl += dayNetPnl;
        cumGrossPnl += dayGrossPnl;
        totalBrokerFee += entryBrokerComm + exitBrokerComm;
        totalStatutoryFee += entryStatutory + exitStatutory;
        totalTicketFee += entryTicket + exitTicket;

        trajectoryPoints.push({
          date: dailyBars[i].date,
          cumNetPnl,
          cumGrossPnl,
          returnPct: (cumNetPnl / capital) * 100
        });
      }

      // Thndr subscription if active
      if (broker.id === 'thndr' && includeThndrSub) {
        totalSubFee = horizonMonths * (broker.monthlySub || 55.0);
      }

      const totalFees = totalBrokerFee + totalStatutoryFee + totalTicketFee + totalSubFee;
      netProfit = cumNetPnl - totalSubFee;
      netEndingCash = Math.max(0, capital + netProfit);
      netReturnPct = (netProfit / capital) * 100;
      feeDragPct = (totalFees / capital) * 100;
      avgCostPerShare = sessionCount > 0 ? (sharesCount / sessionCount) : buyPrice;
      sharesCount = Math.round(sharesCount / (sessionCount || 1));

      return {
        ...broker,
        investedCapital,
        grossEndingValue: Math.max(0, capital + cumGrossPnl),
        netEndingCash,
        sharesCount,
        totalFees,
        totalBrokerFee,
        totalStatutoryFee,
        totalTicketFee,
        totalSubFee,
        netProfit,
        netReturnPct,
        feeDragPct,
        executionCount,
        avgCostPerShare,
        trajectoryPoints
      };
    } else if (strategy === 'lump') {
      // ── Strategy 2: Lump Sum (Single Entry & Single Liquidation) ──
      investedCapital = capital;
      executionCount = 2; // 1 Entry + 1 Exit

      // 1. Entry Execution
      const buyBrokerComm = Math.max(investedCapital * broker.brokerPct, broker.brokerMin);
      const buyTicket = broker.ticketFee;
      const buyStatutory = investedCapital * broker.regPct + broker.mcdrTicket;
      const buyTotalFee = buyBrokerComm + buyTicket + buyStatutory;

      const netBuyInvested = Math.max(0, investedCapital - buyTotalFee);
      sharesCount = buyPrice > 0 ? (netBuyInvested / buyPrice) : 0;

      // 2. Liquidation Execution
      grossEndingValue = sharesCount * sellPrice;
      const sellBrokerComm = Math.max(grossEndingValue * broker.brokerPct, broker.brokerMin);
      const sellTicket = broker.ticketFee;
      const sellStatutory = grossEndingValue * broker.regPct + broker.mcdrTicket;
      const sellTotalFee = sellBrokerComm + sellTicket + sellStatutory;

      // Thndr subscription if active
      if (broker.id === 'thndr' && includeThndrSub) {
        totalSubFee = horizonMonths * (broker.monthlySub || 55.0);
      }

      totalBrokerFee = buyBrokerComm + sellBrokerComm;
      totalTicketFee = buyTicket + sellTicket;
      totalStatutoryFee = buyStatutory + sellStatutory;
      const totalFees = totalBrokerFee + totalTicketFee + totalStatutoryFee + totalSubFee;

      netEndingCash = Math.max(0, grossEndingValue - sellTotalFee - totalSubFee);
      netProfit = netEndingCash - investedCapital;
      netReturnPct = (netProfit / investedCapital) * 100;
      feeDragPct = (totalFees / investedCapital) * 100;

      // Build trajectory series
      trajectoryPoints = rangeBars.map(b => {
        const estExitVal = sharesCount * b.close;
        const estExitComm = Math.max(estExitVal * broker.brokerPct, broker.brokerMin);
        const estExitStat = estExitVal * broker.regPct + broker.mcdrTicket;
        const estExitNet = Math.max(0, estExitVal - (estExitComm + estExitStat + broker.ticketFee));
        const estPnl = estExitNet - investedCapital;
        return {
          date: b.date,
          cumNetPnl: estPnl,
          returnPct: (estPnl / investedCapital) * 100
        };
      });

      return {
        ...broker,
        investedCapital,
        grossEndingValue,
        netEndingCash,
        sharesCount: Math.floor(sharesCount),
        totalFees,
        totalBrokerFee,
        totalStatutoryFee,
        totalTicketFee,
        totalSubFee,
        netProfit,
        netReturnPct,
        feeDragPct,
        executionCount,
        avgCostPerShare: buyPrice,
        trajectoryPoints
      };
    } else {
      // ── Strategy 3: Monthly Recurring DCA ──
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
      executionCount = monthsCount + 1; // monthly acquisitions + 1 final liquidation

      let totalShares = 0;
      let buyBrokerCommTotal = 0;
      let buyTicketTotal = 0;
      let buyStatutoryTotal = 0;

      for (const bar of dcaBars) {
        const mBrokerComm = Math.max(monthlyAmount * broker.brokerPct, broker.brokerMin);
        const mTicket = broker.ticketFee;
        const mStatutory = monthlyAmount * broker.regPct + broker.mcdrTicket;
        const mFee = mBrokerComm + mTicket + mStatutory;

        buyBrokerCommTotal += mBrokerComm;
        buyTicketTotal += mTicket;
        buyStatutoryTotal += mStatutory;

        const mNetBuy = Math.max(0, monthlyAmount - mFee);
        totalShares += bar.close > 0 ? (mNetBuy / bar.close) : 0;
      }

      sharesCount = totalShares;
      grossEndingValue = totalShares * sellPrice;

      // Final Liquidation Execution
      const sellBrokerComm = Math.max(grossEndingValue * broker.brokerPct, broker.brokerMin);
      const sellTicket = broker.ticketFee;
      const sellStatutory = grossEndingValue * broker.regPct + broker.mcdrTicket;
      const sellTotalFee = sellBrokerComm + sellTicket + sellStatutory;

      if (broker.id === 'thndr' && includeThndrSub) {
        totalSubFee = monthsCount * (broker.monthlySub || 55.0);
      }

      totalBrokerFee = buyBrokerCommTotal + sellBrokerComm;
      totalTicketFee = buyTicketTotal + sellTicket;
      totalStatutoryFee = buyStatutoryTotal + sellStatutory;
      const totalFees = totalBrokerFee + totalTicketFee + totalStatutoryFee + totalSubFee;

      netEndingCash = Math.max(0, grossEndingValue - sellTotalFee - totalSubFee);
      netProfit = netEndingCash - investedCapital;
      netReturnPct = (netProfit / investedCapital) * 100;
      feeDragPct = (totalFees / investedCapital) * 100;
      avgCostPerShare = totalShares > 0 ? (investedCapital / totalShares) : buyPrice;

      trajectoryPoints = rangeBars.map(b => {
        const estVal = totalShares * b.close;
        const estComm = Math.max(estVal * broker.brokerPct, broker.brokerMin);
        const estStat = estVal * broker.regPct + broker.mcdrTicket;
        const estNet = Math.max(0, estVal - (estComm + estStat + broker.ticketFee));
        const estPnl = estNet - investedCapital;
        return {
          date: b.date,
          cumNetPnl: estPnl,
          returnPct: (estPnl / investedCapital) * 100
        };
      });

      return {
        ...broker,
        investedCapital,
        grossEndingValue,
        netEndingCash,
        sharesCount: Math.floor(sharesCount),
        totalFees,
        totalBrokerFee,
        totalStatutoryFee,
        totalTicketFee,
        totalSubFee,
        netProfit,
        netReturnPct,
        feeDragPct,
        executionCount,
        avgCostPerShare,
        trajectoryPoints
      };
    }
  });

  // Sort brokers: highest net ending cash (lowest fee drag) first
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
    const isBeltone = b.id === 'beltone';
    const isTelda = b.id === 'telda';
    const isThndr = b.id === 'thndr';
    const netCashPct = Math.max(12, Math.round((b.netEndingCash / maxNetCash) * 100));
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
      isBeltone,
      isTelda,
      isThndr,
      hasSubFee: b.totalSubFee > 0,
      subFeeFmt: fmtNum(b.totalSubFee),
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
      statutoryFeeFmt: fmtNum(b.totalStatutoryFee),
      ticketFeeFmt: fmtNum(b.totalTicketFee),
      regFeeFmt: fmtNum(b.totalStatutoryFee + b.totalTicketFee),
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
  // MULTI-BROKER TRAJECTORY CHART (PLOTTING ALL BROKERS TOGETHER IN DISTINCT COLORS)
  // ════════════════════════════════════════════════════════════════════════════
  const svgW = 640;
  const svgH = 200;
  const padX = 35;
  const padY = 22;

  // Downsample trajectory points evenly for smooth SVG rendering
  const totalTrajectoryPoints = brokerOutcomes[0]?.trajectoryPoints?.length || 1;
  const targetSampleCount = Math.min(60, Math.max(12, totalTrajectoryPoints));
  const sampleIndices = [];
  for (let i = 0; i < targetSampleCount; i++) {
    const sIdx = Math.min(totalTrajectoryPoints - 1, Math.round((i / (targetSampleCount - 1 || 1)) * (totalTrajectoryPoints - 1)));
    if (!sampleIndices.includes(sIdx)) sampleIndices.push(sIdx);
  }

  // Collect all return percentages to calibrate global Y axis
  let globalMinReturn = 0;
  let globalMaxReturn = 0;

  brokerOutcomes.forEach(b => {
    sampleIndices.forEach(idx => {
      const pt = b.trajectoryPoints[idx];
      if (pt && typeof pt.returnPct === 'number') {
        if (pt.returnPct < globalMinReturn) globalMinReturn = pt.returnPct;
        if (pt.returnPct > globalMaxReturn) globalMaxReturn = pt.returnPct;
      }
    });
  });

  // Include 0% axis and buffer
  const yPaddingBuffer = Math.max(5, (globalMaxReturn - globalMinReturn) * 0.08);
  const chartYMin = Math.floor(globalMinReturn - yPaddingBuffer);
  const chartYMax = Math.ceil(globalMaxReturn + yPaddingBuffer);
  const chartYSpan = (chartYMax - chartYMin) || 1;

  const zeroAxisY = Math.round((svgH - padY - ((0 - chartYMin) / chartYSpan) * (svgH - 2 * padY)) * 10) / 10;
  const clampedZeroAxisY = Math.max(padY, Math.min(svgH - padY, zeroAxisY));

  // Compute SVG polyline path for each broker
  const multiChartLines = brokerOutcomes.map(b => {
    const coords = sampleIndices.map((sIdx, step) => {
      const pt = b.trajectoryPoints[sIdx] || { returnPct: 0 };
      const x = Math.round((padX + (step / (sampleIndices.length - 1 || 1)) * (svgW - 2 * padX)) * 10) / 10;
      const y = Math.round((svgH - padY - ((pt.returnPct - chartYMin) / chartYSpan) * (svgH - 2 * padY)) * 10) / 10;
      return `${x} ${y}`;
    });

    const pathD = coords.length > 0 ? 'M' + coords.join(' L') : '';
    const lastCoord = coords[coords.length - 1]?.split(' ') || [svgW - padX, zeroAxisY];

    return {
      id: b.id,
      name: ar ? b.nameAr : b.nameEn,
      color: b.color,
      pathD,
      endX: lastCoord[0],
      endY: lastCoord[1],
      isWinner: b.id === bestBroker.id,
      isBeltone: b.id === 'beltone',
      finalReturnPctFmt: (b.netReturnPct >= 0 ? '+' : '') + b.netReturnPct.toFixed(1) + '%',
      finalNetCashFmt: fmtNum(b.netEndingCash)
    };
  });

  // Single price sparkline trajectory for reference
  const closes = activeBars.map(b => b.close);
  const minP = Math.min(...closes);
  const maxP = Math.max(...closes);
  const pSpan = maxP - minP || 1;

  const sparkPts = activeBars.map((b, i) => {
    const x = padX + (i / (activeBars.length - 1 || 1)) * (svgW - 2 * padX);
    const y = svgH - padY - ((b.close - minP) / pSpan) * (svgH - 2 * padY);
    return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, date: b.date, close: b.close };
  });

  const lineD = sparkPts.length > 0 ? 'M' + sparkPts.map(p => `${p.x} ${p.y}`).join(' L') : '';
  const areaD = sparkPts.length > 0 ? `${lineD} L${sparkPts[sparkPts.length - 1].x} ${svgH} L${sparkPts[0].x} ${svgH} Z` : '';
  const buyPin = sparkPts[0] || { x: padX, y: svgH / 2, close: buyPrice, date: firstBar.date };
  const sellPin = sparkPts[sparkPts.length - 1] || { x: svgW - padX, y: svgH / 2, close: sellPrice, date: lastBar.date };

  // Stock selector options & Featured quick-pick tickers
  const FEATURED_TICKERS = ['BTFH', 'COMI', 'SWDY', 'ABUK', 'MFPC', 'ETEL', 'FWRY', 'HRHO', 'TMGH', 'EAST', 'HELI', 'AMOC', 'JUFO', 'ISPH', 'SKPC', 'CLHO', 'CCAP', 'EFIH', 'ALCN', 'GBCO', 'DSCW', 'CIEB', 'ADIB', 'ORAS', 'PHDC', 'OCDI', 'EMFD', 'ORWE', 'EGAL', 'EGCH', 'RAYA', 'RMDA', 'TAQA', 'VALU'];

  const featuredStocks = FEATURED_TICKERS.filter(t => SIM_STOCKS[t]).map(t => {
    const s = SIM_STOCKS[t];
    return {
      ticker: s.ticker,
      name: ar ? s.nameAr : s.nameEn,
      isSelected: s.ticker === selectedTicker,
      isBeltone: s.ticker === 'BTFH',
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
    { id: '2Y', label: ar ? 'سنتان (افتراضي)' : '2 Years (Default)', active: range === '2Y', pick: () => component.setState({ simRange: '2Y' }) },
    { id: '3Y', label: ar ? '٣ سنوات' : '3 Years', active: range === '3Y', pick: () => component.setState({ simRange: '3Y' }) },
    { id: '5Y', label: ar ? '٥ سنوات' : '5 Years', active: range === '5Y', pick: () => component.setState({ simRange: '5Y' }) },
    { id: '10Y', label: ar ? '١٠ سنوات' : '10 Years', active: range === '10Y', pick: () => component.setState({ simRange: '10Y' }) },
    { id: 'MAX', label: ar ? 'أقصى مدى (' + earliestDate.slice(0, 4) + ')' : 'MAX (' + earliestDate.slice(0, 4) + ')', active: range === 'MAX', pick: () => component.setState({ simRange: 'MAX' }) }
  ];

  // Strategy Presets
  const strategyPresets = [
    { id: 'daily', label: ar ? 'تداول يومي متكرر' : 'Daily Active Trading', active: strategy === 'daily', pick: () => component.setState({ simStrategy: 'daily' }) },
    { id: 'lump', label: ar ? 'دفعة واحدة (دخول وتسييل)' : 'Lump Sum (Entry & Liquidation)', active: strategy === 'lump', pick: () => component.setState({ simStrategy: 'lump' }) },
    { id: 'dca', label: ar ? 'استثمار شهري دوري (DCA)' : 'Monthly Recurring DCA', active: strategy === 'dca', pick: () => component.setState({ simStrategy: 'dca' }) }
  ];

  // Capital presets
  const capitalPresets = [10000, 25000, 50000, 100000, 250000, 500000].map(v => ({
    val: v,
    label: fmtNum(v),
    active: capital === v,
    pick: () => component.setState({ simCapital: v })
  }));

  // Statutory fee items with localized descriptions
  const statutoryItems = STANDARD_STATUTORY_FEES.items.map(item => ({
    id: item.id,
    name: ar ? item.nameAr : item.nameEn,
    pct: item.pct
  }));

  return {
    // Current stock info
    ticker: activeStock.ticker,
    name: ar ? activeStock.nameAr : activeStock.nameEn,
    sector: ar ? activeStock.sectorAr : activeStock.sector,
    earliestYear: earliestDate.slice(0, 4),
    latestYear: latestDate.slice(0, 4),
    totalYearsAvailable: Math.max(1, Math.round((new Date(latestDate) - new Date(earliestDate)) / (365.25 * 86400000))),
    stockOptions,
    setStock: (ticker) => component.setState({ simTicker: ticker }),
    featuredStocks,
    searchQuery,
    hasSearchQuery,
    searchMatches,
    onSearchChange: (e) => component.setState({ simSearchQuery: e.target.value }),
    clearSearch: () => component.setState({ simSearchQuery: '' }),

    // Strategy & Inputs
    strategy,
    isDaily: strategy === 'daily',
    isLumpSum: strategy === 'lump',
    isDca: strategy === 'dca',
    isCapitalMode: strategy !== 'dca',
    strategyPresets,
    setDailyStrategy: () => component.setState({ simStrategy: 'daily' }),
    setLumpStrategy: () => component.setState({ simStrategy: 'lump' }),
    setDcaStrategy: () => component.setState({ simStrategy: 'dca' }),
    capital,
    capitalFmt: fmtNum(capital),
    monthlyAmount,
    monthlyAmountFmt: fmtNum(monthlyAmount),
    onCapitalChange: (e) => {
      const val = Number(e.target.value.replace(/[^0-9]/g, '')) || 0;
      component.setState({ simCapital: val });
    },
    onMonthlyChange: (e) => {
      const val = Number(e.target.value.replace(/[^0-9]/g, '')) || 0;
      component.setState({ simMonthly: val });
    },
    capitalPresets,
    setCapital: (val) => component.setState({ simCapital: val }),

    // Thndr subscription toggle
    includeThndrSub,
    toggleThndrSub: () => component.setState({ includeThndrSub: !includeThndrSub }),
    horizonMonths,

    // Statutory fee breakdown (0.08% standard)
    statutoryRegPct: STANDARD_STATUTORY_FEES.regPctFmt,
    statutoryMcdrTicket: STANDARD_STATUTORY_FEES.mcdrTicket,
    statutoryItems,

    // Time horizon
    range,
    rangePresets,
    setRange: (rng) => component.setState({ simRange: rng }),
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

    // Multi-broker Trajectory Chart
    svgW,
    svgH,
    zeroAxisY: clampedZeroAxisY,
    chartYMaxFmt: (chartYMax >= 0 ? '+' : '') + chartYMax + '%',
    chartYMinFmt: chartYMin + '%',
    multiChartLines,

    // Stock price sparkline
    lineD,
    areaD,
    buyPin,
    sellPin,

    // Labels & UX copy (Strictly compliant with §8 non-directive standards)
    L: {
      title: ar ? 'محاكي عوائد ورسوم التداول' : 'Trading & App Fee Simulator',
      lead: ar
        ? 'قارن صافي عوائد العمليات بالجنيه عبر تطبيقات وشركات السمسرة المصرية (بلتون، ثندر، تيلدا، مباشر، هيرميس، سي آي كابيتال، البنوك) بعد خصم الرسوم التنظيمية الموحدة (0.08%) وعمولات كل منصة.'
        : 'Compare net transaction outcomes across Egyptian brokerage apps (Beltone, Thndr, Telda, Mubasher, EFG Hermes, CI Capital, Banks) factoring in standard 0.08% statutory fees and platform commissions.',
      stockSelectLabel: ar ? 'اختر السهم من البورصة المصرية' : 'Select EGX Stock',
      strategyLabel: ar ? 'نمط الاستثمار وتكرار التداول' : 'Trading Pattern & Frequency',
      dailyLabel: ar ? 'تداول يومي متكرر (افتراضي)' : 'Daily Active Trading (Default)',
      lumpLabel: ar ? 'دفعة واحدة (دخول وتسييل)' : 'Lump Sum (Entry & Liquidation)',
      dcaLabel: ar ? 'استثمار شهري دوري (DCA)' : 'Monthly Recurring DCA',
      capitalLabel: ar ? 'رأس المال المخصص للتداول (جنيه)' : 'Deployed Trading Capital (EGP)',
      monthlyLabel: ar ? 'مبلغ الاستثمار الشهري (جنيه)' : 'Monthly Amount (EGP)',
      horizonLabel: ar ? 'الفترة الزمنية وإطار التنفيذ' : 'Time Horizon & Execution Window',
      comparisonTitle: ar ? 'مقارنة صافي المحفظة والرسوم بين المنصات' : 'Net Portfolio & Fee Comparison Across Platforms',
      winnerNotice: ar
        ? `الخيار الأوفر لهذه العملية هو ${bestBroker.nameAr}، بفارق توفير رسوم ${fmtNum(feeDifference)} ج.م مقارنة بأعلى منصة.`
        : `Best value broker is ${bestBroker.nameEn}, saving ${fmtNum(feeDifference)} EGP in fees compared to the highest-cost platform.`,
      feeDragNote: ar
        ? 'تنبيه: التداول اليومي المتكرر أو المبالغ الصغيرة يضاعف أثر الحد الأدنى للتذكرة (10-25 ج)، مما يلتهم جزءاً كبيراً من رأس المال مع تراكم مئات العمليات.'
        : 'Note: Frequent daily trading or small order sizes amplify ticket minimums (10-25 EGP), compounding significant fee drag over hundreds of executions.',
      statutorySectionTitle: ar ? 'الرسوم التنظيمية الموحدة (0.08% + 2 ج) المطبقة على الجميع' : 'Standard 0.08% Statutory Regulatory Fees Applied Universally',
      statutorySectionDesc: ar
        ? 'تسدد هذه النسبة إلزامياً بموجب القانون في كل عملية منفذة لصالح البورصة والمقاصة والرقابة وصناديق الحماية وضمان التسويات، بالتساوي عبر جميع المنصات دون استثناء.'
        : 'Mandatory statutory fees levied on every transaction for EGX, MCDR clearing, FRA, and investor protection funds, applied equally across all brokers.',
      statutoryBadge: ar ? 'رسوم تنظيمية موحدة: 0.08% + 2 ج' : 'Statutory Standard: 0.08% + 2 EGP',
      thndrSubLabel: ar ? 'تضمين اشتراك ثندر إكسبريس (55 ج/شهرياً)' : 'Include Thndr Express Subscription (55 EGP/mo)',
      thndrSubDesc: ar ? 'يضيف 55 جنيهاً لكل شهر في الفترة الزمنية المحاكاة لحساب الأثر الحقيقي للاشتراك المدفوع.' : 'Adds 55 EGP per month across the horizon to calculate realistic subscription drag.',
      brokerCol: ar ? 'منصة التداول' : 'Trading Platform',
      netCashCol: ar ? 'صافي المبلغ بعد التسييل' : 'Net Cash at Liquidation',
      netReturnCol: ar ? 'صافي العائد (%)' : 'Net Return (%)',
      totalFeesCol: ar ? 'إجمالي الرسوم' : 'Total Fees Paid',
      brokerFeeLabel: ar ? 'عمولة السمسرة' : 'Broker Markup',
      statutoryFeeLabel: ar ? 'رسوم موحدة (0.08%)' : 'Statutory (0.08%)',
      ticketFeeLabel: ar ? 'رسوم الفاتورة' : 'Invoice Ticket',
      feeDragLabel: ar ? 'نسبة الهدر بالرسوم' : 'Fee Drag',
      sharesLabel: ar ? 'الأسهم المنفذة' : 'Executed Shares',
      execLabel: ar ? 'عدد العمليات' : 'Executions',
      searchPlaceholder: ar ? 'ابحث باسم أو رمز أي سهم...' : 'Search stock name or ticker...',
      dailyDesc: ar ? 'تنفيذ دخول وخروج يومي مع كل جلسة تداول (حوالي 480 جلسة و960 عملية خلال عامين).' : 'Daily entry and exit execution each market session (~480 sessions / 960 executions over 2 years).',
      lumpDesc: ar ? 'عملية دخول واحدة في بداية الفترة وعملية تسييل في نهايتها.' : 'Single entry execution at start, liquidation at exit.',
      dcaDesc: ar ? 'تنفيذ دخول شهري منتظم في نهاية كل شهر، ثم تسييل المحفظة بالكامل.' : 'Periodic monthly acquisitions at month closes, liquidated at exit.',
      buyPrefix: ar ? 'دخول:' : 'Entry:',
      sellPrefix: ar ? 'تسييل:' : 'Exit:',
      multiChartTitle: ar ? 'مقارنة مسار العائد الصافي بين مختلف المنصات عبر الزمن' : 'Net Return Trajectory Compared Across Broker Platforms',
      multiChartDesc: ar ? 'يوضح الرسم تباعد أداء المحفظة بمرور الوقت بسبب التفاوت في العمولات والحدود الدنيا ورسوم الفاتورة والاشتراكات.' : 'Illustrates how portfolio returns diverge over time due to commissions, ticket minimums, invoice fees, and subscriptions.',
      trajectoryTitle: ar ? 'مسار السهم السعري الفعلي خلال الفترة المحاكاة' : 'Actual Historical Stock Price Trajectory',
      rawPriceMove: ar ? 'تغير السعر الخام' : 'raw price move',
      firstBuyPrefix: ar ? 'نقطة الدخول الأولى: ' : 'First Entry: ',
      finalSellPrefix: ar ? 'نقطة التسييل الأخيرة: ' : 'Final Exit: ',
      savePrefix: ar ? 'وفر ' : 'Save ',
      zeroLineLabel: ar ? 'نقطة التعادل (0%)' : 'Break-even (0%)',
      beltoneLeadBadge: ar ? 'محاكاة بلتون الافتراضية' : 'Beltone Lead Simulation'
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

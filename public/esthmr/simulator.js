import { BROKER_PROFILES, SIM_STOCKS, STANDARD_STATUTORY_FEES } from './simulator-data.js';

/**
 * Catmull-Rom to Cubic Bézier Spline converter.
 * Eliminates polygonal line pixelation and produces vector-smooth, anti-aliased curves.
 */
function getCubicBezierSpline(points) {
  if (!points || points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  if (points.length === 2) return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)} L ${points[1].x.toFixed(1)} ${points[1].y.toFixed(1)}`;

  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  const tension = 0.20;

  for (let i = 0; i < points.length - 1; i++) {
    const pPrev = points[Math.max(0, i - 1)];
    const pCurr = points[i];
    const pNext = points[i + 1];
    const pAfter = points[Math.min(points.length - 1, i + 2)];

    const cp1x = (pCurr.x + (pNext.x - pPrev.x) * tension).toFixed(1);
    const cp1y = (pCurr.y + (pNext.y - pPrev.y) * tension).toFixed(1);
    const cp2x = (pNext.x - (pAfter.x - pCurr.x) * tension).toFixed(1);
    const cp2y = (pNext.y - (pAfter.y - pCurr.y) * tension).toFixed(1);

    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${pNext.x.toFixed(1)} ${pNext.y.toFixed(1)}`;
  }
  return d;
}

/**
 * Trading & App Fee Simulation Explorer (محاكي عوائد ورسوم التداول)
 * Simulates entry and liquidation executions across real Egyptian investment apps and brokers,
 * factoring in exact commission rates, ticket minimums, MCDR clearing, and EGX/FRA regulatory fees.
 */
export function simulatorExplorer(component, D, ar, React) {
  const st = (component && component.state) ? component.state : {};

  // Default state: Default to SWDY (+200% winner strategy) on daily Close -> 12pm Noon for 1 Year
  const defaultTicker = SIM_STOCKS['SWDY'] ? 'SWDY' : (SIM_STOCKS['BTFH'] ? 'BTFH' : (SIM_STOCKS['COMI'] ? 'COMI' : Object.keys(SIM_STOCKS)[0]));
  const selectedTicker = st.simTicker && SIM_STOCKS[st.simTicker] ? st.simTicker : defaultTicker;
  const strategy = st.simStrategy || 'daily'; // 'daily' | 'lump' | 'dca'
  const timing = st.simTiming || 'close_to_noon'; // 'close_to_noon' | 'close_to_open' | 'open_to_close' | 'close_to_close' | 'open_to_noon' | 'noon_to_close'
  const range = st.simRange || '1Y'; // '1M' | '3M' | '6M' | '1Y' | '2Y' | 'MAX' | 'CUSTOM'
  const capital = Math.max(1000, Number(st.simCapital) || 100000);
  const monthlyAmount = Math.max(200, Number(st.simMonthly) || 2500);
  const includeThndrSub = Boolean(st.includeThndrSub);

  const activeStock = SIM_STOCKS[selectedTicker] || SIM_STOCKS['SWDY'] || SIM_STOCKS['BTFH'] || SIM_STOCKS['COMI'];

  // Sessions dataset: [[date, open, noon, close], ...]
  const stockSessions = activeStock.sessions || [];
  const earliestDate = stockSessions[0]?.[0] || activeStock.firstDate || '2024-09-01';
  const latestDate = stockSessions[stockSessions.length - 1]?.[0] || activeStock.lastDate || '2026-09-02';

  // Calculate start and end date based on range or custom picker
  let startDate = earliestDate;
  let endDate = latestDate;

  if (range === 'CUSTOM' && st.simStartDate && st.simEndDate) {
    startDate = st.simStartDate;
    endDate = st.simEndDate;
  } else if (range === '1M') {
    startDate = getPastMonthsDate(latestDate, 1);
  } else if (range === '3M') {
    startDate = getPastMonthsDate(latestDate, 3);
  } else if (range === '6M') {
    startDate = getPastMonthsDate(latestDate, 6);
  } else if (range === '1Y') {
    startDate = getPastYearsDate(latestDate, 1);
  } else if (range === '2Y') {
    startDate = getPastYearsDate(latestDate, 2);
  } else if (range === 'MAX') {
    startDate = earliestDate;
  }

  // Clamping to stock's actual data bounds
  if (startDate < earliestDate) startDate = earliestDate;
  if (endDate > latestDate) endDate = latestDate;
  if (startDate > endDate) startDate = earliestDate;

  // Filter sessions within [startDate, endDate]
  let activeSessions = stockSessions.filter(s => s[0] >= startDate && s[0] <= endDate);
  if (activeSessions.length < 2) {
    activeSessions = stockSessions.slice(-30);
    if (activeSessions.length < 2) activeSessions = stockSessions;
  }

  // Compute actual price movement across the window
  const firstSession = activeSessions[0];
  const lastSession = activeSessions[activeSessions.length - 1];
  const buyPrice = firstSession[1] || firstSession[3]; // open or close
  const sellPrice = lastSession[3]; // close
  const rawPriceChangePct = buyPrice > 0 ? (((sellPrice - buyPrice) / buyPrice) * 100) : 0;

  // Approximate duration in months for subscription modeling
  const startY = parseInt(firstSession[0].slice(0, 4), 10);
  const startM = parseInt(firstSession[0].slice(5, 7), 10);
  const endY = parseInt(lastSession[0].slice(0, 4), 10);
  const endM = parseInt(lastSession[0].slice(5, 7), 10);
  const horizonMonths = Math.max(1, (endY - startY) * 12 + (endM - startM) + 1);

  // ════════════════════════════════════════════════════════════════════════════
  // SIMULATION ENGINE (Active Daily Turnover, Lump Sum, DCA)
  // ════════════════════════════════════════════════════════════════════════════
  const brokerOutcomes = BROKER_PROFILES.map(broker => {
    let investedCapital = capital;
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
      // ── Strategy 1: Active Daily Intraday / Overnight Turnover ──
      // Sessions are formatted as [date, open, noon, close]
      const totalSess = activeSessions.length;
      const isNextDay = (timing === 'close_to_noon' || timing === 'close_to_open' || timing === 'close_to_close');
      const stepCount = isNextDay ? Math.max(1, totalSess - 1) : totalSess;
      executionCount = stepCount * 2; // 1 Entry + 1 Liquidation per cycle

      let currentCash = capital;

      for (let i = 0; i < stepCount; i++) {
        let pBuy = 0;
        let pSell = 0;

        if (timing === 'close_to_noon') {
          // Buy at Close of day i (2:30 PM) -> Sell at Noon of day i+1 (12:00 PM)
          pBuy = activeSessions[i][3]; // close
          pSell = activeSessions[i + 1][2]; // noon
        } else if (timing === 'close_to_open') {
          // Buy at Close of day i (2:30 PM) -> Sell at Open of day i+1 (10:00 AM)
          pBuy = activeSessions[i][3]; // close
          pSell = activeSessions[i + 1][1]; // open
        } else if (timing === 'open_to_close') {
          // Buy at Open of day i (10:00 AM) -> Sell at Close of day i (2:30 PM)
          pBuy = activeSessions[i][1]; // open
          pSell = activeSessions[i][3]; // close
        } else if (timing === 'open_to_noon') {
          // Buy at Open of day i (10:00 AM) -> Sell at Noon of day i (12:00 PM)
          pBuy = activeSessions[i][1]; // open
          pSell = activeSessions[i][2]; // noon
        } else if (timing === 'noon_to_close') {
          // Buy at Noon of day i (12:00 PM) -> Sell at Close of day i (2:30 PM)
          pBuy = activeSessions[i][2]; // noon
          pSell = activeSessions[i][3]; // close
        } else {
          // Default: close_to_close (day i close -> day i+1 close)
          pBuy = activeSessions[i][3];
          pSell = activeSessions[i + 1][3];
        }

        if (!pBuy || pBuy <= 0) pBuy = buyPrice;
        if (!pSell || pSell <= 0) pSell = pBuy;
        const ratio = pSell / pBuy;

        // 1. Entry Execution
        const entryBrokerComm = Math.max(currentCash * broker.brokerPct, broker.brokerMin);
        const entryTicket = broker.ticketFee;
        const entryStatutory = currentCash * broker.regPct + broker.mcdrTicket;
        const entryTotalFee = entryBrokerComm + entryTicket + entryStatutory;

        const netCapitalDeployed = Math.max(0, currentCash - entryTotalFee);
        const dayShares = pBuy > 0 ? (netCapitalDeployed / pBuy) : 0;
        sharesCount += dayShares;

        // Gross value at liquidation point
        const grossLiquidation = netCapitalDeployed * ratio;

        // 2. Liquidation Execution
        const exitBrokerComm = Math.max(grossLiquidation * broker.brokerPct, broker.brokerMin);
        const exitTicket = broker.ticketFee;
        const exitStatutory = grossLiquidation * broker.regPct + broker.mcdrTicket;
        const exitTotalFee = exitBrokerComm + exitTicket + exitStatutory;

        const netAfterExit = Math.max(0, grossLiquidation - exitTotalFee);

        totalBrokerFee += (entryBrokerComm + exitBrokerComm);
        totalStatutoryFee += (currentCash * broker.regPct) + (grossLiquidation * broker.regPct);
        totalTicketFee += (entryTicket + exitTicket + broker.mcdrTicket * 2);

        currentCash = netAfterExit;

        const stepDate = isNextDay ? activeSessions[i + 1][0] : activeSessions[i][0];
        trajectoryPoints.push({
          date: stepDate,
          netCash: currentCash,
          returnPct: ((currentCash - capital) / capital) * 100
        });
      }

      // Thndr subscription if active
      if (broker.id === 'thndr' && includeThndrSub) {
        totalSubFee = horizonMonths * (broker.monthlySub || 55.0);
      }

      const totalFees = totalBrokerFee + totalStatutoryFee + totalTicketFee + totalSubFee;
      netEndingCash = Math.max(0, currentCash - totalSubFee);
      netProfit = netEndingCash - capital;
      netReturnPct = (netProfit / capital) * 100;
      feeDragPct = (totalFees / capital) * 100;
      avgCostPerShare = buyPrice;
      sharesCount = Math.round(sharesCount / (stepCount || 1));

      return {
        ...broker,
        investedCapital,
        grossEndingValue: Math.max(0, capital + netProfit + totalFees),
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

      // Trajectory points across sessions
      trajectoryPoints = activeSessions.map(s => {
        const estClose = s[3];
        const estExitVal = sharesCount * estClose;
        const estExitComm = Math.max(estExitVal * broker.brokerPct, broker.brokerMin);
        const estExitStat = estExitVal * broker.regPct + broker.mcdrTicket;
        const estExitNet = Math.max(0, estExitVal - (estExitComm + estExitStat + broker.ticketFee));
        const estPnl = estExitNet - investedCapital;
        return {
          date: s[0],
          netCash: estExitNet,
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
      // ── Strategy 3: Monthly DCA (Dollar-Cost Averaging) ──
      const monthlyBars = activeStock.monthly.filter(b => b[0] >= startDate && b[0] <= endDate);
      const dcaBars = monthlyBars.length >= 3 ? monthlyBars : activeStock.monthly.slice(-12);
      const intervalsCount = dcaBars.length;
      investedCapital = intervalsCount * monthlyAmount;
      executionCount = intervalsCount + 1; // monthly entries + 1 final liquidation

      let cumShares = 0;
      let cumInvested = 0;

      for (let i = 0; i < intervalsCount; i++) {
        const closeP = dcaBars[i][1];
        const comm = Math.max(monthlyAmount * broker.brokerPct, broker.brokerMin);
        const stat = monthlyAmount * broker.regPct + broker.mcdrTicket;
        const ticket = broker.ticketFee;
        const totalFee = comm + stat + ticket;

        totalBrokerFee += comm;
        totalStatutoryFee += stat;
        totalTicketFee += ticket;

        const netInv = Math.max(0, monthlyAmount - totalFee);
        const sh = closeP > 0 ? (netInv / closeP) : 0;
        cumShares += sh;
        cumInvested += monthlyAmount;

        const curVal = cumShares * closeP;
        trajectoryPoints.push({
          date: dcaBars[i][0],
          netCash: curVal,
          returnPct: cumInvested > 0 ? (((curVal - cumInvested) / cumInvested) * 100) : 0
        });
      }

      grossEndingValue = cumShares * sellPrice;
      const exitComm = Math.max(grossEndingValue * broker.brokerPct, broker.brokerMin);
      const exitStat = grossEndingValue * broker.regPct + broker.mcdrTicket;
      const exitTicket = broker.ticketFee;
      totalBrokerFee += exitComm;
      totalStatutoryFee += exitStat;
      totalTicketFee += exitTicket;

      if (broker.id === 'thndr' && includeThndrSub) {
        totalSubFee = intervalsCount * (broker.monthlySub || 55.0);
      }

      const totalFees = totalBrokerFee + totalStatutoryFee + totalTicketFee + totalSubFee;
      netEndingCash = Math.max(0, grossEndingValue - (exitComm + exitStat + exitTicket) - totalSubFee);
      netProfit = netEndingCash - investedCapital;
      netReturnPct = investedCapital > 0 ? ((netProfit / investedCapital) * 100) : 0;
      feeDragPct = investedCapital > 0 ? ((totalFees / investedCapital) * 100) : 0;
      avgCostPerShare = cumShares > 0 ? (investedCapital / cumShares) : buyPrice;
      sharesCount = Math.floor(cumShares);

      return {
        ...broker,
        investedCapital,
        grossEndingValue,
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
      netProfit: b.netProfit,
      netReturnPct: b.netReturnPct,
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
  // MULTI-BROKER TRAJECTORY CHART (SMOOTH CUBIC BEZIER SPLINE, VECTOR CRISP)
  // ════════════════════════════════════════════════════════════════════════════
  const svgW = 1000;
  const svgH = 280;
  const padX = 55;
  const padY = 28;

  // Sample trajectory points evenly (e.g. up to 140 points for ultra-smooth spline curve)
  const totalTrajectoryPoints = brokerOutcomes[0]?.trajectoryPoints?.length || 1;
  const targetSampleCount = Math.min(140, Math.max(16, totalTrajectoryPoints));
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
      if (pt && typeof pt.retPct === 'number') {
        if (pt.retPct < globalMinReturn) globalMinReturn = pt.retPct;
        if (pt.retPct > globalMaxReturn) globalMaxReturn = pt.retPct;
      } else if (pt && typeof pt.returnPct === 'number') {
        if (pt.returnPct < globalMinReturn) globalMinReturn = pt.returnPct;
        if (pt.returnPct > globalMaxReturn) globalMaxReturn = pt.returnPct;
      }
    });
  });

  // Y axis scale with padding buffer
  const yPaddingBuffer = Math.max(8, (globalMaxReturn - globalMinReturn) * 0.08);
  const chartYMin = Math.floor(globalMinReturn - yPaddingBuffer);
  const chartYMax = Math.ceil(globalMaxReturn + yPaddingBuffer);
  const chartYSpan = (chartYMax - chartYMin) || 1;

  const zeroAxisY = Math.round((svgH - padY - ((0 - chartYMin) / chartYSpan) * (svgH - 2 * padY)) * 10) / 10;
  const clampedZeroAxisY = Math.max(padY, Math.min(svgH - padY, zeroAxisY));

  // Compute smooth cubic Bezier spline for each broker
  const multiChartLines = brokerOutcomes.map(b => {
    const rawCoords = sampleIndices.map((sIdx, step) => {
      const pt = b.trajectoryPoints[sIdx] || { retPct: 0, returnPct: 0 };
      const val = typeof pt.retPct === 'number' ? pt.retPct : (pt.returnPct || 0);
      const x = padX + (step / (sampleIndices.length - 1 || 1)) * (svgW - 2 * padX);
      const y = svgH - padY - ((val - chartYMin) / chartYSpan) * (svgH - 2 * padY);
      return { x, y };
    });

    const pathD = getCubicBezierSpline(rawCoords);
    const lastCoord = rawCoords[rawCoords.length - 1] || { x: svgW - padX, y: clampedZeroAxisY };
    const firstCoord = rawCoords[0] || { x: padX, y: clampedZeroAxisY };

    // Closed area path under the curve
    const areaD = pathD
      ? `${pathD} L ${lastCoord.x.toFixed(1)} ${clampedZeroAxisY.toFixed(1)} L ${firstCoord.x.toFixed(1)} ${clampedZeroAxisY.toFixed(1)} Z`
      : '';

    return {
      id: b.id,
      name: ar ? b.nameAr : b.nameEn,
      color: b.color,
      pathD,
      areaD,
      endX: lastCoord.x.toFixed(1),
      endY: lastCoord.y.toFixed(1),
      isWinner: b.id === bestBroker.id,
      isBeltone: b.id === 'beltone',
      isTelda: b.id === 'telda',
      isThndr: b.id === 'thndr',
      finalReturnPctFmt: (b.netReturnPct >= 0 ? '+' : '') + b.netReturnPct.toFixed(1) + '%',
      finalNetCashFmt: fmtNum(b.netEndingCash)
    };
  });

  // Reference grid lines with percentage tags
  const gridSteps = [0.25, 0.5, 0.75];
  const gridLines = gridSteps.map(stRatio => {
    const retVal = Math.round(chartYMin + stRatio * chartYSpan);
    const y = Math.round((svgH - padY - ((retVal - chartYMin) / chartYSpan) * (svgH - 2 * padY)) * 10) / 10;
    return {
      y,
      label: (retVal >= 0 ? '+' : '') + retVal + '%'
    };
  });

  // ════════════════════════════════════════════════════════════════════════════
  // HISTORICAL STOCK PRICE SPARKLINE TRACK (SMOOTH CUBIC SPLINE)
  // ════════════════════════════════════════════════════════════════════════════
  const pW = 1000;
  const pH = 150;
  const pPadX = 40;
  const pPadY = 18;

  const priceTargetCount = Math.min(100, Math.max(12, activeSessions.length));
  const priceIndices = [];
  for (let i = 0; i < priceTargetCount; i++) {
    const idx = Math.min(activeSessions.length - 1, Math.round((i / (priceTargetCount - 1 || 1)) * (activeSessions.length - 1)));
    if (!priceIndices.includes(idx)) priceIndices.push(idx);
  }

  const sampledPrices = priceIndices.map(idx => activeSessions[idx][3]); // close prices
  const minP = Math.min(...sampledPrices, buyPrice, sellPrice);
  const maxP = Math.max(...sampledPrices, buyPrice, sellPrice);
  const pSpan = (maxP - minP) || 1;

  const priceCoords = priceIndices.map((sIdx, step) => {
    const closeP = activeSessions[sIdx][3];
    const x = pPadX + (step / (priceIndices.length - 1 || 1)) * (pW - 2 * pPadX);
    const y = pH - pPadY - ((closeP - minP) / pSpan) * (pH - 2 * pPadY);
    return { x, y };
  });

  const lineD = getCubicBezierSpline(priceCoords);
  const areaD = priceCoords.length > 0
    ? `${lineD} L ${priceCoords[priceCoords.length - 1].x.toFixed(1)} ${pH - pPadY} L ${priceCoords[0].x.toFixed(1)} ${pH - pPadY} Z`
    : '';

  const buyPin = priceCoords[0] || { x: pPadX, y: pH / 2 };
  const sellPin = priceCoords[priceCoords.length - 1] || { x: pW - pPadX, y: pH / 2 };

  // ════════════════════════════════════════════════════════════════════════════
  // CONTROLS & SELECTION HANDLERS
  // ════════════════════════════════════════════════════════════════════════════
  const FEATURED_TICKERS = ['SWDY', 'BTFH', 'TMGH', 'COMI', 'HRHO', 'PHDC', 'FWRY', 'ABUK', 'AMOC', 'SKPC', 'ETEL', 'EFIH', 'HELI', 'CCAP', 'EAST', 'JUFO', 'DSCW', 'RAYA', 'RMDA'];

  const featuredStocks = FEATURED_TICKERS.filter(t => SIM_STOCKS[t]).map(t => {
    const s = SIM_STOCKS[t];
    return {
      ticker: s.ticker,
      name: ar ? s.nameAr : s.nameEn,
      isSelected: s.ticker === selectedTicker,
      isBeltone: s.ticker === 'BTFH',
      isSwdy: s.ticker === 'SWDY',
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
    { id: '1M', label: ar ? 'شهر' : '1 Month', active: range === '1M', pick: () => component.setState({ simRange: '1M', simStartDate: '', simEndDate: '' }) },
    { id: '3M', label: ar ? '٣ أشهر' : '3 Months', active: range === '3M', pick: () => component.setState({ simRange: '3M', simStartDate: '', simEndDate: '' }) },
    { id: '6M', label: ar ? '٦ أشهر' : '6 Months', active: range === '6M', pick: () => component.setState({ simRange: '6M', simStartDate: '', simEndDate: '' }) },
    { id: '1Y', label: ar ? 'سنة (الأقوى +200%)' : '1 Year (Top +200%)', active: range === '1Y', pick: () => component.setState({ simRange: '1Y', simStartDate: '', simEndDate: '' }) },
    { id: '2Y', label: ar ? 'سنتان' : '2 Years', active: range === '2Y', pick: () => component.setState({ simRange: '2Y', simStartDate: '', simEndDate: '' }) },
    { id: 'MAX', label: ar ? 'أقصى مدى' : 'All History', active: range === 'MAX', pick: () => component.setState({ simRange: 'MAX', simStartDate: '', simEndDate: '' }) }
  ];

  // Strategy Presets
  const strategyPresets = [
    { id: 'daily', label: ar ? 'تداول يومي متكرر (افتراضي)' : 'Daily Active Trading (Default)', active: strategy === 'daily', pick: () => component.setState({ simStrategy: 'daily' }) },
    { id: 'lump', label: ar ? 'دفعة واحدة (دخول وتسييل)' : 'Lump Sum (Entry & Liquidation)', active: strategy === 'lump', pick: () => component.setState({ simStrategy: 'lump' }) },
    { id: 'dca', label: ar ? 'استثمار شهري دوري (DCA)' : 'Monthly Recurring DCA', active: strategy === 'dca', pick: () => component.setState({ simStrategy: 'dca' }) }
  ];

  // Intraday / Overnight Timing Presets (When to Buy & When to Sell)
  const timingPresets = [
    {
      id: 'close_to_noon',
      label: ar ? '🌟 شراء الإغلاق (2:30 م) ➔ تسييل الظهيرة (12:00 م) [+200% مميز]' : '🌟 Close (2:30 PM) ➔ Noon (12:00 PM) [+200% Top Performer]',
      active: timing === 'close_to_noon',
      desc: ar ? 'شراء عند إغلاق الجلسة وتسييل عند ذروة سيولة الظهيرة في اليوم التالي.' : 'Acquire at session close, liquidate at peak midday liquidity next day.',
      pick: () => component.setState({ simTiming: 'close_to_noon', simEntryTime: 'close', simExitTime: 'noon' })
    },
    {
      id: 'close_to_open',
      label: ar ? '🌅 شراء الإغلاق (2:30 م) ➔ تسييل الافتتاح (10:00 ص) [فجوة الصباح]' : '🌅 Close (2:30 PM) ➔ Open (10:00 AM) [Morning Gap]',
      active: timing === 'close_to_open',
      desc: ar ? 'شراء الإغلاق وتسييل مع جرس الافتتاح لاقتناص الفجوة السعرية الصباحية.' : 'Acquire at close, liquidate at opening bell to capture overnight gaps.',
      pick: () => component.setState({ simTiming: 'close_to_open', simEntryTime: 'close', simExitTime: 'open' })
    },
    {
      id: 'open_to_close',
      label: ar ? '☀️ شراء الافتتاح (10:00 ص) ➔ تسييل الإغلاق (2:30 م) [جلسة اليوم]' : '☀️ Open (10:00 AM) ➔ Close (2:30 PM) [Intraday]',
      active: timing === 'open_to_close',
      desc: ar ? 'تداول خلال ساعات الجلسة اليومية والتسييل قبل الإغلاق لمنع المخاطر الليلية.' : 'Day trade within the session, liquidating before close to eliminate overnight risk.',
      pick: () => component.setState({ simTiming: 'open_to_close', simEntryTime: 'open', simExitTime: 'close_same' })
    },
    {
      id: 'close_to_close',
      label: ar ? '🔄 شراء الإغلاق ➔ تسييل إغلاق الغد [تداول 24 ساعة]' : '🔄 Close ➔ Next Close [Full 24h]',
      active: timing === 'close_to_close',
      desc: ar ? 'دورة تداول يومية كاملة من إغلاق جلسة إلى إغلاق الجلسة التالية.' : 'Full daily holding cycle from session close to next session close.',
      pick: () => component.setState({ simTiming: 'close_to_close', simEntryTime: 'close', simExitTime: 'close_next' })
    }
  ];

  // Entry timing options
  const entryTimeOptions = [
    { id: 'close', label: ar ? 'عند إغلاق الجلسة (2:30 م)' : 'Market Close (2:30 PM)' },
    { id: 'open', label: ar ? 'عند افتتاح الجلسة (10:00 ص)' : 'Market Open (10:00 AM)' },
    { id: 'noon', label: ar ? 'عند منتصف التداول (12:00 م)' : 'Midday Noon (12:00 PM)' }
  ];

  // Exit timing options
  const exitTimeOptions = [
    { id: 'noon', label: ar ? 'عند ظهيرة اليوم التالي (12:00 م)' : 'Next Day Noon (12:00 PM)' },
    { id: 'open', label: ar ? 'عند افتتاح اليوم التالي (10:00 ص)' : 'Next Day Open (10:00 AM)' },
    { id: 'close_same', label: ar ? 'عند إغلاق نفس اليوم (2:30 م)' : 'Same Day Close (2:30 PM)' },
    { id: 'close_next', label: ar ? 'عند إغلاق اليوم التالي (2:30 م)' : 'Next Day Close (2:30 PM)' }
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
    totalSessionsCount: activeSessions.length,
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

    // Execution Timings (Choose When to Buy & When to Sell)
    timing,
    timingPresets,
    setTiming: (mode) => component.setState({ simTiming: mode }),
    entryTime: st.simEntryTime || (timing.startsWith('open') ? 'open' : (timing.startsWith('noon') ? 'noon' : 'close')),
    exitTime: st.simExitTime || (timing.includes('to_open') ? 'open' : (timing.includes('to_close') ? (timing === 'open_to_close' ? 'close_same' : 'close_next') : 'noon')),
    entryTimeOptions,
    exitTimeOptions,
    onEntryTimeChange: (e) => {
      const entry = e.target.value;
      let newTiming = 'close_to_noon';
      if (entry === 'open') newTiming = 'open_to_close';
      else if (entry === 'noon') newTiming = 'noon_to_close';
      component.setState({ simEntryTime: entry, simTiming: newTiming });
    },
    onExitTimeChange: (e) => {
      const exit = e.target.value;
      let newTiming = 'close_to_noon';
      if (exit === 'open') newTiming = 'close_to_open';
      else if (exit === 'close_same') newTiming = 'open_to_close';
      else if (exit === 'close_next') newTiming = 'close_to_close';
      component.setState({ simExitTime: exit, simTiming: newTiming });
    },

    // Capital & Recurring
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

    // Time horizon & Custom Calendar Pickers (Choose start date and end date)
    range,
    rangePresets,
    setRange: (rng) => component.setState({ simRange: rng, simStartDate: '', simEndDate: '' }),
    startDate,
    endDate,
    minDate: earliestDate,
    maxDate: latestDate,
    onStartDateChange: (e) => {
      const newStart = e.target.value;
      component.setState({ simStartDate: newStart, simRange: 'CUSTOM' });
    },
    onEndDateChange: (e) => {
      const newEnd = e.target.value;
      component.setState({ simEndDate: newEnd, simRange: 'CUSTOM' });
    },
    startDateFmt: firstSession[0],
    endDateFmt: lastSession[0],
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

    // Multi-broker Trajectory Chart (High-res, smooth spline, geometricPrecision)
    svgW,
    svgH,
    zeroAxisY: clampedZeroAxisY,
    chartYMaxFmt: (chartYMax >= 0 ? '+' : '') + chartYMax + '%',
    chartYMinFmt: chartYMin + '%',
    multiChartLines,
    gridLines,
    winnerAreaD: multiChartLines.find(l => l.isWinner)?.areaD || '',

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
      timingLabel: ar ? 'توقيت التنفيذ (وقت الدخول ووقت التسييل)' : 'Execution Timing (Entry & Liquidation)',
      entryTimeLabel: ar ? 'وقت الدخول (الشراء)' : 'Entry Timing',
      exitTimeLabel: ar ? 'وقت التسييل (الخروج)' : 'Liquidation Timing',
      dailyLabel: ar ? 'تداول متكرر (افتراضي)' : 'Active Trading (Default)',
      lumpLabel: ar ? 'دفعة واحدة (دخول وتسييل)' : 'Lump Sum (Entry & Liquidation)',
      dcaLabel: ar ? 'استثمار شهري دوري (DCA)' : 'Monthly Recurring DCA',
      capitalLabel: ar ? 'رأس المال المخصص للتداول (جنيه)' : 'Deployed Trading Capital (EGP)',
      monthlyLabel: ar ? 'مبلغ الاستثمار الشهري (جنيه)' : 'Monthly Amount (EGP)',
      horizonLabel: ar ? 'الفترة الزمنية وتواريخ التنفيذ' : 'Time Horizon & Execution Dates',
      startDateLabel: ar ? 'تاريخ الدخول:' : 'Entry Date:',
      endDateLabel: ar ? 'تاريخ التسييل:' : 'Exit Date:',
      comparisonTitle: ar ? 'مقارنة صافي المحفظة والرسوم بين المنصات' : 'Net Portfolio & Fee Comparison Across Platforms',
      winnerNotice: ar
        ? `الخيار الأوفر لهذه العملية هو ${bestBroker.nameAr}، بفارق توفير رسوم ${fmtNum(feeDifference)} ج.م مقارنة بأعلى منصة.`
        : `Best value broker is ${bestBroker.nameEn}, saving ${fmtNum(feeDifference)} EGP in fees compared to the highest-cost platform.`,
      feeDragNote: ar
        ? 'تنبيه: التداول المتكرر أو المبالغ الصغيرة يضاعف أثر الحد الأدنى للتذكرة (10-25 ج)، مما يلتهم جزءاً كبيراً من رأس المال مع تراكم مئات العمليات.'
        : 'Note: Frequent trading or small order sizes amplify ticket minimums (10-25 EGP), compounding significant fee drag over hundreds of executions.',
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
      dailyDesc: ar ? 'تنفيذ استراتيجية الدخول والتسييل المتكرر مع كل جلسة تداول لحساب العائد الفعلي وتأثير الرسوم التراكمية.' : 'Compounded entry and liquidation strategy executed across sessions to calculate true net return and fee drag.',
      lumpDesc: ar ? 'عملية دخول واحدة في بداية الفترة وعملية تسييل في نهايتها.' : 'Single entry execution at start, liquidation at exit.',
      dcaDesc: ar ? 'تنفيذ دخول شهري منتظم في نهاية كل شهر، ثم تسييل المحفظة بالكامل.' : 'Periodic monthly acquisitions at month closes, liquidated at exit.',
      buyPrefix: ar ? 'دخول:' : 'Entry:',
      sellPrefix: ar ? 'تسييل:' : 'Exit:',
      multiChartTitle: ar ? 'مقارنة مسار العائد الصافي بين مختلف المنصات عبر الزمن' : 'Net Return Trajectory Compared Across Broker Platforms',
      multiChartDesc: ar ? 'يوضح المنحنى تباعد أداء المحفظة بمرور الوقت بسبب التفاوت في العمولات والحدود الدنيا ورسوم الفاتورة والاشتراكات.' : 'Illustrates how portfolio returns diverge over time due to commissions, ticket minimums, invoice fees, and subscriptions.',
      trajectoryTitle: ar ? 'مسار السهم السعري الفعلي خلال الفترة المحاكاة' : 'Actual Historical Stock Price Trajectory',
      rawPriceMove: ar ? 'تغير السعر الخام' : 'raw price move',
      firstBuyPrefix: ar ? 'نقطة الدخول الأولى: ' : 'First Entry: ',
      finalSellPrefix: ar ? 'نقطة التسييل الأخيرة: ' : 'Final Exit: ',
      savePrefix: ar ? 'وفر ' : 'Save ',
      zeroLineLabel: ar ? 'نقطة التعادل (0%)' : 'Break-even (0%)',
      beltoneLeadBadge: ar ? 'محاكاة بلتون الافتراضية' : 'Beltone Lead Simulation',
      smoothNotice: ar ? 'منحنى بياني ناعم فائق الدقة' : 'High-Resolution Vector Curve'
    }
  };
}

// Helpers
function fmtNum(n) {
  if (typeof n !== 'number' || isNaN(n)) return '0';
  return Math.round(n).toLocaleString('en-US');
}

function getPastMonthsDate(referenceDateStr, monthsBack) {
  try {
    const d = new Date(referenceDateStr);
    d.setMonth(d.getMonth() - monthsBack);
    return d.toISOString().slice(0, 10);
  } catch {
    return '2025-01-01';
  }
}

function getPastYearsDate(referenceDateStr, yearsBack) {
  try {
    const d = new Date(referenceDateStr);
    d.setFullYear(d.getFullYear() - yearsBack);
    return d.toISOString().slice(0, 10);
  } catch {
    return '2024-01-01';
  }
}

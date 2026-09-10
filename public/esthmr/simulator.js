import { runSimulation } from './simulator-engine.js';
import {PRICE_COLUMN, TIME_ORDER} from './simulator-times.js';
import { BROKER_PROFILES, STANDARD_STATUTORY_FEES } from './simulator-brokers.js';
import { indexOfCompanies, seriesOf, loadFailed } from './simulator-store.js';

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

  /* The directory and the one company's prices, from the store.
   *
   * Both are fetched, so either can be missing for a frame. `waiting` says so
   * and the panel draws a line instead of an empty chart; every figure below
   * is computed from whatever actually arrived, never from a placeholder. */
  const redraw = () => { if (component && component.setState) component.setState({}); };
  const SIM_STOCKS = indexOfCompanies(redraw) || {};
  const haveIndex = Object.keys(SIM_STOCKS).length > 0;

  // User-selected default, not a performance-ranked or recommended strategy.
  const defaultTicker = SIM_STOCKS['BTFH'] ? 'BTFH' : (Object.keys(SIM_STOCKS)[0] || 'BTFH');
  const selectedTicker = st.simTicker && SIM_STOCKS[st.simTicker] ? st.simTicker : defaultTicker;
  const strategy = st.simStrategy || 'daily'; // 'daily' | 'lump' | 'dca'
  const timing = st.simTiming || 'close_to_11';
  const entryTime = st.simEntryTime || (timing.startsWith('open') ? 'open' : timing.startsWith('noon') ? 'noon' : 'close');
  // The default liquidation is 11:00. The clock times are carried in the
  // intraday set (30-minute bars, Cairo time), which every company in the
  // picker has; the four-column daily set has only open/noon/close, and a
  // company that fell back to it says so through `missingExitPrices` rather
  // than being quietly settled at noon.
  const exitTime = st.simExitTime
    || (timing.endsWith('_11') ? '11:00'
      : timing.endsWith('noon') ? 'noon'
      : timing.endsWith('open') ? 'open' : 'close');
  const requestedHold = Math.floor(Number(st.simHoldSessions ?? (timing.startsWith('close') ? 1 : 0)) || 0);
  const holdSessions = Math.max(TIME_ORDER[exitTime] <= TIME_ORDER[entryTime] ? 1 : 0, Math.min(60, requestedHold));
  const everySessions = Math.max(1, Math.min(60, Math.floor(Number(st.simEverySessions) || 1)));
  const fillCount = Math.max(1, Math.min(20, Math.floor(Number(st.simFillCount) || 1)));
  const range = st.simRange || '2Y';
  const capital = Math.max(1000, Number(st.simCapital) || 100000);
  const monthlyAmount = Math.max(200, Number(st.simMonthly) || 2500);
  const includeThndrSub = Boolean(st.includeThndrSub);

  // The index entry carries the names and the span; the company's own file
  // carries the prices. Merged so the rest of this function reads one object,
  // exactly as it did when both came from a single bundle.
  const companySeries = haveIndex ? seriesOf(selectedTicker, redraw) : null;
  const indexEntry = SIM_STOCKS[selectedTicker] || SIM_STOCKS['SWDY'] || SIM_STOCKS['BTFH'] || SIM_STOCKS['COMI'] || {};
  const activeStock = { ...indexEntry, sessions: (companySeries && companySeries.sessions) || [] };
  const waitingForData = !haveIndex || !companySeries;

  // Sessions dataset: [[date, open, noon, close], ...]
  const usingCloseHistory = st.simHistoryTicker === selectedTicker && entryTime === 'close' && exitTime === 'close';
  const recovered = (companySeries && companySeries.intraday) || null;
  const unsupportedCurrency = recovered?.currency && recovered.currency !== 'EGP';
  const stockSessions = usingCloseHistory ? st.simCloseHistory : (recovered?.sessions || activeStock.sessions || []);
  const earliestDate = stockSessions[0]?.[0] || activeStock.firstDate || '2024-09-01';
  const latestDate = stockSessions[stockSessions.length - 1]?.[0] || activeStock.lastDate || '2026-09-02';

  // Calculate start and end date based on range or custom picker
  let startDate = earliestDate;
  let endDate = latestDate;

  if (range === 'CUSTOM') {
    startDate = st.simStartDate || earliestDate;
    endDate = st.simEndDate || latestDate;
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

  const requestedStartDate = startDate;
  const requestedEndDate = endDate;
  // Clamping to stock's actual data bounds, disclosed alongside the controls.
  if (startDate < earliestDate) startDate = earliestDate;
  if (endDate > latestDate) endDate = latestDate;
  // An invalid or empty range stays empty instead of silently using other dates.

  // Filter sessions within [startDate, endDate]
  let activeSessions = stockSessions.filter(s => s[0] >= startDate && s[0] <= endDate);
  const hasSessions = activeSessions.length > 0;
  const missingExitPrices = hasSessions && (strategy === 'daily'
    ? !activeSessions.some((s,i)=>s[PRICE_COLUMN[entryTime]]>0 && activeSessions[i+holdSessions]?.[PRICE_COLUMN[exitTime]]>0)
    : !(activeSessions.at(-1)[PRICE_COLUMN[exitTime]]>0));
  const rangeClipped = startDate !== requestedStartDate || endDate !== requestedEndDate;

  // Compute actual price movement across the window
  const firstSession = activeSessions[0] || [startDate, 0, 0, 0];
  const lastSession = activeSessions.at(-1) || [endDate, 0, 0, 0];
  const buyPrice = firstSession[PRICE_COLUMN[entryTime]] ?? 0;
  const sellPrice = lastSession[PRICE_COLUMN[exitTime]] ?? 0;
  const rawPriceChangePct = buyPrice > 0 ? (((sellPrice - buyPrice) / buyPrice) * 100) : 0;

  // Approximate duration in months for subscription modeling
  const startY = parseInt(firstSession[0].slice(0, 4), 10);
  const startM = parseInt(firstSession[0].slice(5, 7), 10);
  const endY = parseInt(lastSession[0].slice(0, 4), 10);
  const endM = parseInt(lastSession[0].slice(5, 7), 10);
  const horizonMonths = hasSessions ? Math.floor((Date.parse(lastSession[0]) - Date.parse(firstSession[0])) / 86400000 / 30) + 1 : 0;

  // ════════════════════════════════════════════════════════════════════════════
  // SIMULATION ENGINE (Active Daily Turnover, Lump Sum, DCA)
  // ════════════════════════════════════════════════════════════════════════════
  const brokerOutcomes = BROKER_PROFILES.map(broker => runSimulation({
    sessions: missingExitPrices || unsupportedCurrency ? [] : activeSessions, broker, capital, monthlyAmount, strategy,
    entry: entryTime, exit: exitTime, hold: holdSessions, every: everySessions,
    subscribed: includeThndrSub, fills: fillCount
  }));

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
      tagline: (ar ? b.taglineAr : b.taglineEn) + (b.id === 'thndr' ? '' : (ar ? ' · تقدير غير موثق' : ' · unverified estimate')),
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
      winnerBadgeText: ar ? 'أعلى نتيجة بالمحاكاة' : 'Highest modelled',
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

  const priceTargetCount = Math.min(100, activeSessions.length);
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
    { id: '1Y', label: ar ? 'سنة' : '1 Year', active: range === '1Y', pick: () => component.setState({ simRange: '1Y', simStartDate: '', simEndDate: '' }) },
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
      id: 'close_to_11',
      label: ar ? '🌟 شراء الإغلاق (2:30 م) ➔ تسييل 11:00 ص' : '🌟 Close (2:30 PM) ➔ 11:00 AM',
      active: timing === 'close_to_11',
      desc: ar ? 'شراء عند إغلاق الجلسة وتسييل في الحادية عشرة صباح اليوم التالي.' : 'Acquire at session close, liquidate at 11:00 AM the next session.',
      pick: () => component.setState({ simTiming: 'close_to_11', simEntryTime: 'close', simExitTime: '11:00', simHoldSessions: 1 })
    },
    {
      id: 'close_to_noon',
      label: ar ? 'شراء الإغلاق (2:30 م) ➔ تسييل الظهيرة (12:00 م)' : 'Close (2:30 PM) ➔ Noon (12:00 PM)',
      active: timing === 'close_to_noon',
      desc: ar ? 'شراء عند إغلاق الجلسة وتسييل عند ذروة سيولة الظهيرة في اليوم التالي.' : 'Acquire at session close, liquidate at peak midday liquidity next day.',
      pick: () => component.setState({ simTiming: 'close_to_noon', simEntryTime: 'close', simExitTime: 'noon', simHoldSessions: 1 })
    },
    {
      id: 'close_to_open',
      label: ar ? '🌅 شراء الإغلاق (2:30 م) ➔ تسييل الافتتاح (10:00 ص) [فجوة الصباح]' : '🌅 Close (2:30 PM) ➔ Open (10:00 AM) [Morning Gap]',
      active: timing === 'close_to_open',
      desc: ar ? 'شراء الإغلاق وتسييل مع جرس الافتتاح لاقتناص الفجوة السعرية الصباحية.' : 'Acquire at close, liquidate at opening bell to capture overnight gaps.',
      pick: () => component.setState({ simTiming: 'close_to_open', simEntryTime: 'close', simExitTime: 'open', simHoldSessions: 1 })
    },
    {
      id: 'open_to_close',
      label: ar ? '☀️ شراء الافتتاح (10:00 ص) ➔ تسييل الإغلاق (2:30 م) [جلسة اليوم]' : '☀️ Open (10:00 AM) ➔ Close (2:30 PM) [Intraday]',
      active: timing === 'open_to_close',
      desc: ar ? 'تداول خلال ساعات الجلسة اليومية والتسييل قبل الإغلاق لمنع المخاطر الليلية.' : 'Day trade within the session, liquidating before close to eliminate overnight risk.',
      pick: () => component.setState({ simTiming: 'open_to_close', simEntryTime: 'open', simExitTime: 'close', simHoldSessions: 0 })
    },
    {
      id: 'close_to_close',
      label: ar ? '🔄 شراء الإغلاق ➔ تسييل إغلاق الغد [تداول 24 ساعة]' : '🔄 Close ➔ Next Close [Full 24h]',
      active: timing === 'close_to_close',
      desc: ar ? 'دورة تداول يومية كاملة من إغلاق جلسة إلى إغلاق الجلسة التالية.' : 'Full daily holding cycle from session close to next session close.',
      pick: () => component.setState({ simTiming: 'close_to_close', simEntryTime: 'close', simExitTime: 'close', simHoldSessions: 1 })
    }
  ];

  // Entry timing options
  const entryTimeOptions = [
    { id: 'close', label: ar ? 'عند إغلاق الجلسة (2:30 م)' : 'Market Close (2:30 PM)' },
    { id: 'open', label: ar ? 'عند افتتاح الجلسة (10:00 ص)' : 'Market Open (10:00 AM)' },
    { id: '10:30', label: '10:30 AM' },
    { id: '11:00', label: '11:00 AM' },
    { id: '11:30', label: '11:30 AM' },
    { id: 'noon', label: ar ? 'الظهيرة (12:00 م)' : 'Noon (12:00 PM)' },
    { id: '12:30', label: '12:30 PM' },
    { id: '13:00', label: '1:00 PM' },
    { id: '13:30', label: '1:30 PM' },
    { id: '14:00', label: '2:00 PM' }
  ];

  // There is no separate exit list. One stood here with ids `close_same` and
  // `close_next`, which `PRICE_COLUMN` has never had a column for — wiring the
  // dropdown to it would have priced every exit at `undefined`. Both menus
  // offer the same ten clock times; whether the exit falls on the same session
  // or the next is `holdSessions`, not the id.

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
    // True for the frame or two before the picked company's file lands, so
    // the panel says it is loading rather than drawing an empty chart.
    waitingForData,
    dataUnavailable: loadFailed(),
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
    entryTime, exitTime, holdSessions, everySessions, fillCount,
    entryTimeOptions: entryTimeOptions.map(o => ({...o, selected:o.id === entryTime})),
    exitTimeOptions: entryTimeOptions.map(o => ({...o, selected:o.id === exitTime})),
    missingExitPrices,
    resultsAvailable: hasSessions && !missingExitPrices && !unsupportedCurrency,
    unsupportedCurrency,
    currencyWarning: ar ? 'هذا السهم متداول بعملة غير الجنيه. أوقفنا محاكاة رسوم الجنيه حتى إضافة تحويل العملة والتعريفة المناسبة.' : 'This stock is quoted in a currency other than EGP. The EGP fee simulation is disabled until currency conversion and the applicable tariff are supported.',
    missingExitLabel: ar ? 'لا يمكن حساب نتيجة الخروج 11:00 صباحاً: لا توجد أسعار تاريخية موثقة لهذا التوقيت. لم نستبدلها بأسعار الظهيرة أو الإغلاق. نحتاج أسعاراً مؤرخة بتوقيت القاهرة لكل جلسة، مع مصدرها وتعديلات إجراءات الشركات.' : '11:00 AM return unavailable: no verified historical prices for this time are loaded. Noon and closing prices have not been substituted. Calculation requires dated Cairo-time quotes for each session, their source and corporate-action treatment.',
    onEntryTimeChange: e => component.setState({simEntryTime:e.target.value, simExitTime:exitTime, simTiming:'custom'}),
    onExitTimeChange: e => component.setState({simExitTime:e.target.value, simEntryTime:entryTime, simTiming:'custom'}),
    onHoldChange: e => component.setState({simHoldSessions:Number(e.target.value)}),
    onEveryChange: e => component.setState({simEverySessions:Number(e.target.value)}),
    onFillsChange: e => component.setState({simFillCount:Number(e.target.value)}),
    dataWarning: ar ? 'مصدر التوقيت: شموع TradingView نصف ساعة، معدّلة وفق طلب splits، بتوقيت القاهرة. سعر التوقيت هو أول تداول داخل الشمعة وليس ضمان تنفيذ في الثانية المحددة. الإغلاق آخر سعر شمعة متاحة. النتائج محاكاة لا عائداً تاريخياً موثقاً؛ التوزيعات وتأثيرات إجراءات الشركات تحتاج مراجعة.' : 'Timing source: TradingView 30-minute bars, requested with splits adjustment, in Africa/Cairo time. Clock-time prices are the first trade in that bar—not guaranteed fills at that exact instant. Close is the last available bar close. Results remain simulations; dividends and corporate-action effects require review.',
    coverageLabel: `${ar ? 'البيانات المستخدمة' : 'Data used'}: ${firstSession[0]} → ${lastSession[0]} · ${activeSessions.length} ${ar ? 'جلسة مختارة' : 'selected sessions'}`,
    rangeClipped,
    clippedLabel: ar ? `الفترة المطلوبة تبدأ ${requestedStartDate}، لكن بيانات التوقيت تبدأ ${earliestDate}. النتيجة للفترة المتاحة فقط.` : `Requested start: ${requestedStartDate}. This timing dataset begins ${earliestDate}; the result covers only the available dates.`,
    timingHelp: ar ? `اختر الدخول والخروج منفصلين بتوقيت القاهرة. الإغلاق ثم الظهيرة يعني الجلسة التالية. الدورات المتجاوزة لنقص سعر الدخول أو الخروج: ${bestBroker.skippedCycles || 0}. لا نعوض الأسعار المفقودة. الجلسات المختصرة قد لا تتضمن الأوقات المتأخرة.` : `Choose entry and exit independently in Cairo time. Close → noon means the next session. Cycles skipped for missing entry/exit prices: ${bestBroker.skippedCycles || 0}. No prices are interpolated. Shortened sessions may lack later times.`,
    historyLabel: st.simHistoryLoading ? (ar ? 'جارٍ تحميل التاريخ…' : 'Loading history…') : (ar ? 'تحميل التاريخ الأطول · إغلاق إلى إغلاق' : 'Load longer history · close to close'),
    historyStatus: st.simHistoryError ? (ar ? 'تعذّر تحميل التاريخ الأطول. حاول مجدداً.' : 'Longer history could not be loaded. Try again.') : usingCloseHistory ? (ar ? 'نستخدم الآن تاريخ الإغلاقات المنشور. اختيار الافتتاح أو الظهيرة يعود لمصدر التوقيت الأقصر.' : 'Using published closing-price history. Choosing open or noon returns to the shorter timing dataset.') : (ar ? 'التاريخ الأقدم متاح بأسعار الإغلاق فقط، وليس بأسعار الظهيرة.' : 'Older history is available at closing prices only—not noon prices.'),
    loadCloseHistory: async () => {
      if (component.state.simHistoryLoading) return;
      component.setState({simHistoryLoading:true, simHistoryError:false});
      try {
        const response = await fetch(`/data/v1/prices/${encodeURIComponent(selectedTicker)}.json`);
        if (!response.ok) throw new Error('History unavailable');
        const data = await response.json();
        const sessions = (data.price_history || []).filter(b => /^\d{4}-\d{2}-\d{2}$/.test(b.date) && Number.isFinite(b.close) && b.close > 0)
          .map(b => [b.date, null, null, b.close]).sort((a,b) => a[0].localeCompare(b[0]));
        if (!sessions.length) throw new Error('Empty history');
        if (component.state.simTicker && component.state.simTicker !== selectedTicker) return;
        component.setState({simHistoryTicker:selectedTicker, simCloseHistory:sessions, simEntryTime:'close', simExitTime:'close', simTiming:'close_to_close', simHoldSessions:1, simRange:'MAX', simStartDate:'', simEndDate:''});
      } catch { component.setState({simHistoryError:true}); }
      finally { component.setState({simHistoryLoading:false}); }
    },
    hasSessions,
    noSessions: !hasSessions,
    holdLabel: ar ? 'جلسات الاحتفاظ (0–60)' : 'Holding sessions (0–60)',
    everyLabel: ar ? 'بدء دورة كل كم جلسة؟' : 'Start a cycle every N sessions',
    fillsLabel: ar ? 'تنفيذات متساوية القيمة لكل أمر' : 'Equal-value fills per order',
    emptyLabel: ar ? 'لا توجد جلسات في الفترة المختارة. عدّل التواريخ.' : 'No sessions in this range. Adjust the dates.',
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
    toggleThndrSub: e => component.setState({ includeThndrSub: e?.target ? e.target.checked : !includeThndrSub }),
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
      component.setState({ simStartDate: newStart, simEndDate: endDate, simRange: 'CUSTOM' });
    },
    onEndDateChange: (e) => {
      const newEnd = e.target.value;
      component.setState({ simStartDate: startDate, simEndDate: newEnd, simRange: 'CUSTOM' });
    },
    startDateFmt: firstSession[0],
    endDateFmt: lastSession[0],
    buyPriceFmt: unsupportedCurrency ? '—' : buyPrice.toFixed(2),
    sellPriceFmt: missingExitPrices || unsupportedCurrency ? '—' : sellPrice.toFixed(2),
    rawPriceChangePctFmt: (rawPriceChangePct >= 0 ? '+' : '') + rawPriceChangePct.toFixed(2) + '%',
    isPriceUp: rawPriceChangePct >= 0,

    brokerOutcomes,
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
      lead: ar ? "قارن أثر تكرار التداول وافتراضات الرسوم الحالية على نفس السلسلة السعرية المستوردة." : "Explore how trading frequency and current fee assumptions affect the same imported price series.",
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
      winnerNotice: ar ? "أعلى رصيد محسوب بهذه الافتراضات، وليس مقارنة موثقة لتعريفات الوسطاء." : "Highest modelled ending cash under these assumptions—not a verified broker tariff comparison.",
      feeDragNote: ar
        ? 'تنبيه: التداول المتكرر أو المبالغ الصغيرة يضاعف أثر الحد الأدنى للتذكرة (10-25 ج)، مما يلتهم جزءاً كبيراً من رأس المال مع تراكم مئات العمليات.'
        : 'Note: Frequent trading or small order sizes amplify ticket minimums (10-25 EGP), compounding significant fee drag over hundreds of executions.',
      statutorySectionTitle: ar ? "افتراضات رسوم الجهات الخارجية الحالية" : "Current third-party fee assumptions",
      statutorySectionDesc: ar ? "وفق جدول رسوم ثندر المنشور: الدمغة تختلف للتداول في نفس الجلسة، وللرقابة حد أدنى لكل تنفيذ. هذه محاكاة بالرسوم الحالية لا بالقوانين التاريخية. عمولات الوسطاء الآخرين تقديرية غير موثقة. لا تشمل الحفظ السنوي والتوزيعات والانزلاق وتأخير الاسترداد." : "Using Thndr’s published Egypt order-fee table: T0 stamp duty differs from later settlement; FRA has a minimum per fill. Applied as a current-fee scenario, not historical tax rates. Other broker commissions are unverified estimates. Annual custody, dividends, slippage and refund delays are excluded.",
      statutoryBadge: ar ? "نفس الجلسة: 0.055% · لاحقاً: 0.08% قبل الحدود" : "T0: 0.055% · T1+: 0.08% before minima/caps",
      feeSourceNote: ar ? 'تختلف صفحتا ثندر في وصف العمولة؛ نعتمد جدول رسوم الأوامر: 2 ج + 0.1% خارج الإعفاء. راجع فاتورة التنفيذ للتكلفة الفعلية.' : 'Thndr’s help pages disagree on the commission wording. This model follows the dedicated order-fee table: EGP2 + 0.1% outside the allowance. Check your execution invoice for actual charges.',
      thndrSubLabel: ar ? "ثندر تريدر · 245 ج / 30 يوماً" : "Thndr Trader · 245 EGP / 30 days",
      thndrSubDesc: ar ? "50 أمراً مؤهلاً لكل دورة 30 يوماً تبدأ بأول جلسة. الشراء والبيع يُحسبان منفصلين. نحسب رد العمولة فورياً وتظل رسوم الجهات الخارجية. يُخصم الاشتراك من النتائج ويُدفع خارج ميزانية التداول." : "50 eligible orders each 30-day cycle, starting at the first session. Each buy and sell consumes one. Brokerage refunds are modelled immediately; third-party fees remain. Subscription cost is subtracted from results, paid outside the trading budget.",
      brokerCol: ar ? 'منصة التداول' : 'Trading Platform',
      netCashCol: ar ? 'صافي المبلغ بعد التسييل' : 'Net Cash at Liquidation',
      netReturnCol: ar ? 'صافي العائد (%)' : 'Net Return (%)',
      totalFeesCol: ar ? 'إجمالي الرسوم' : 'Total Fees Paid',
      brokerFeeLabel: ar ? 'عمولة السمسرة' : 'Broker Markup',
      statutoryFeeLabel: ar ? "رسوم الجهات الخارجية" : "Third-party fees",
      ticketFeeLabel: ar ? 'رسوم الفاتورة' : 'Invoice Ticket',
      feeDragLabel: ar ? 'نسبة الهدر بالرسوم' : 'Fee Drag',
      sharesLabel: ar ? 'الأسهم المنفذة' : 'Executed Shares',
      execLabel: ar ? 'عدد العمليات' : 'Executions',
      searchPlaceholder: ar ? 'ابحث باسم أو رمز أي سهم...' : 'Search stock name or ticker...',
      dailyDesc: ar ? "مراكز متكررة غير متداخلة. لا تموّل حصيلة التسييل دخولاً أسبق منها في نفس الجلسة. التنفيذ وإتاحة التداول في نفس اليوم افتراضات." : "Repeated, non-overlapping positions. Sale proceeds cannot fund an earlier entry in the same session. Execution and T0 availability are assumptions.",
      lumpDesc: ar ? 'عملية دخول واحدة في بداية الفترة وعملية تسييل في نهايتها.' : 'Single entry execution at start, liquidation at exit.',
      dcaDesc: ar ? "مساهمة في أول جلسة متاحة من كل شهر، والتسييل عند نهاية الفترة." : "Contribution on the first available session each month; liquidation at the selected end.",
      buyPrefix: ar ? 'دخول:' : 'Entry:',
      sellPrefix: ar ? 'تسييل:' : 'Exit:',
      multiChartTitle: ar ? 'مقارنة مسار العائد الصافي بين مختلف المنصات عبر الزمن' : 'Net Return Trajectory Compared Across Broker Platforms',
      multiChartDesc: ar ? 'يوضح المنحنى تباعد أداء المحفظة بمرور الوقت بسبب التفاوت في العمولات والحدود الدنيا ورسوم الفاتورة والاشتراكات.' : 'Illustrates how portfolio returns diverge over time due to commissions, ticket minimums, invoice fees, and subscriptions.',
      trajectoryTitle: ar ? "السلسلة السعرية المستوردة · لم تُراجع" : "Imported price series · not audited",
      rawPriceMove: ar ? 'تغير السعر الخام' : 'raw price move',
      firstBuyPrefix: ar ? 'نقطة الدخول الأولى: ' : 'First Entry: ',
      finalSellPrefix: ar ? 'نقطة التسييل الأخيرة: ' : 'Final Exit: ',
      savePrefix: ar ? 'فرق الرسوم ' : 'Fee difference ',
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

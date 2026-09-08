import {PRICE_COLUMN, TIME_ORDER} from './simulator-times.js';
// Current-fee scenario, not a reconstruction of historical tax legislation.
export function regulatoryFee(value, sameDay = false, fills = 1) {
  if (!(value > 0)) return 0;
  return Math.min(value * .0001, 5000) * 2
    + Math.min(Math.max(value * .00005 / fills, 1), 250) * fills
    + Math.min(value * .00005, 5000) + value * (.0005 - .00025 * Number(sameDay));
}
export function subscriptionCycle(date, start) {
  return Math.max(0, Math.floor((Date.parse(date) - Date.parse(start)) / 86400000 / 30));
}
export function orderFee(value, broker, { waived = false, sameDay = false, fills = 1 } = {}) {
  if (!(value > 0)) return { commission: 0, ticket: 0, regulatory: 0, total: 0 };
  const commission = waived ? 0 : Math.max(value * broker.brokerPct, broker.brokerMin);
  const ticket = waived ? 0 : broker.ticketFee;
  const regulatory = regulatoryFee(value, sameDay, fills);
  return { commission, ticket, regulatory, total: commission + ticket + regulatory };
}
export function runSimulation({ sessions, broker, capital, monthlyAmount, strategy,
  entry = 'close', exit = 'close', hold = 1, every = 1, subscribed = false, fills = 1 }) {
  let cash = strategy === 'dca' ? 0 : capital, invested = cash, shares = 0;
  let totalBrokerFee = 0, totalTicketFee = 0, totalStatutoryFee = 0;
  let executionCount = 0, sharesCount = 0, waivedOrders = 0;
  const quota = new Map(), trajectoryPoints = [], ledger = [];
  const first = sessions[0]?.[0];
  const sub = subscribed && broker.id === 'thndr';
  const subscriptionAt = date => sub && first ? (subscriptionCycle(date, first) + 1) * 245 : 0;
  const col = PRICE_COLUMN;
  const validSameSession = TIME_ORDER[entry] < TIME_ORDER[exit];
  let skippedCycles = 0;
  let nextEntry = 0, sellAt = -1, lastMonth = '';
  const charged = (value, date, sameDay, commit) => {
    const cycle = subscriptionCycle(date, first);
    const waived = sub && (quota.get(cycle) || 0) < 50;
    const fee = orderFee(value, broker, { waived, sameDay, fills });
    if (commit && value > 0) {
      quota.set(cycle, (quota.get(cycle) || 0) + 1);
      if (waived) waivedOrders++;
      totalBrokerFee += fee.commission; totalTicketFee += fee.ticket;
      totalStatutoryFee += fee.regulatory; executionCount++;
      ledger.push({ date, value, waived, ...fee });
    }
    return fee.total;
  };
  const buy = (s, sameDay) => {
    const price = s[col[entry]];
    if (!(price > 0)) return;
    // Integer shares, with fees calculated on executed value, not the budget.
    let lo = 0, hi = Math.max(0, Math.floor(cash / price));
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2), value = mid * price;
      if (value + charged(value, s[0], sameDay, false) <= cash) lo = mid;
      else hi = mid - 1;
    }
    if (!lo) return;
    const value = lo * price;
    cash -= value + charged(value, s[0], sameDay, true);
    shares += lo; sharesCount += lo;
  };
  const sell = (s, sameDay) => {
    const value = shares * s[col[exit]];
    if (!(value > 0)) return;
    cash += value - charged(value, s[0], sameDay, true); shares = 0;
  };
  for (let i = 0; i < sessions.length; i++) {
    const s = sessions[i];
    if (strategy === 'daily') {
      if (shares && i === sellAt) sell(s, hold === 0);
      if (!shares && i >= nextEntry && i + hold < sessions.length) {
        // Do not reuse proceeds earlier in a session than their exit.
        if (!(i === sellAt && TIME_ORDER[entry] < TIME_ORDER[exit])) {
          nextEntry = i + Math.max(every, hold || 1);
          if(s[col[entry]]>0 && sessions[i+hold][col[exit]]>0) {
            buy(s, hold === 0); sellAt = i + hold;
            if (!hold) sell(s, true);
          } else skippedCycles++;
        }
      }
    } else if (strategy === 'lump') {
      if (i === 0 && (sessions.length > 1 || validSameSession)) buy(s, sessions.length === 1);
      if (i === sessions.length - 1) sell(s, sessions.length === 1);
    } else {
      const month = s[0].slice(0, 7);
      const finalDay = i === sessions.length - 1;
      const previousShares = shares;
      if (month !== lastMonth) {
        cash += monthlyAmount; invested += monthlyAmount;
        if (!finalDay || validSameSession) buy(s, finalDay);
        lastMonth = month;
      }
      // Only the newly acquired part of a mixed final-day sale receives T0 stamp treatment.
      if (finalDay) sell(s, shares ? (shares - previousShares) / shares : 0);
    }
    const netCash = cash + shares * s[3] - subscriptionAt(s[0]);
    trajectoryPoints.push({ date: s[0], netCash, returnPct: invested ? (netCash / invested - 1) * 100 : 0 });
  }
  const totalSubFee = first ? subscriptionAt(sessions.at(-1)[0]) : 0;
  const netEndingCash = trajectoryPoints.at(-1)?.netCash ?? cash;
  const totalFees = totalBrokerFee + totalTicketFee + totalStatutoryFee + totalSubFee;
  return { ...broker, investedCapital: invested, netEndingCash, netProfit: netEndingCash - invested,
    netReturnPct: invested ? (netEndingCash / invested - 1) * 100 : 0,
    feeDragPct: invested ? totalFees / invested * 100 : 0, totalFees, totalBrokerFee,
    totalTicketFee, totalStatutoryFee, totalSubFee, executionCount, sharesCount,
    grossEndingValue: netEndingCash + totalFees, avgCostPerShare: 0,
    trajectoryPoints, ledger, waivedOrders, skippedCycles };
}

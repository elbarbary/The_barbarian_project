import test from 'node:test';
import assert from 'node:assert/strict';
import { simulatorExplorer } from '../../public/esthmr/simulator.js';

/* The store is filled from disk here, which is what the browser does over the
 * network. Before the split these prices arrived as an imported bundle; the
 * assertions below are unchanged, and they still run against the real series.
 */
import { readFileSync, existsSync } from 'node:fs';
import { prime } from '../../public/esthmr/simulator-store.js';
const SIM_DIR = new URL('../../public/esthmr/sim/', import.meta.url);
const readJson = (name) => JSON.parse(readFileSync(new URL(name, SIM_DIR), 'utf8'));
const companies = readJson('index.json').companies;
prime({
  index: companies,
  series: Object.fromEntries(companies
    .filter((c) => existsSync(new URL(`${c.ticker}.json`, SIM_DIR)))
    .map((c) => [c.ticker, readJson(`${c.ticker}.json`)])),
});


function createMockComponent(initialState = {}) {
  let state = {
    lang: 'ar',
    toolsTab: 'sim',
    simTicker: 'COMI',
    simStrategy: 'lump',
    simCapital: 100000,
    simMonthly: 5000,
    simRange: '1Y',
    simSearchQuery: '',
    ...initialState
  };
  return {
    state,
    setState(patch) {
      Object.assign(state, patch);
    }
  };
}

test('simulatorExplorer initializes with COMI and lump sum when specified in state', () => {
  const comp = createMockComponent();
  const sim = simulatorExplorer(comp, comp.state);

  assert.equal(sim.ticker, 'COMI');
  assert.equal(sim.strategy, 'lump');
  assert.equal(sim.isLumpSum, true);
  assert.equal(sim.isDca, false);
  assert.equal(sim.capital, 100000);
  assert.ok(sim.stockOptions.length >= 50, 'at least 50 EGX stocks loaded');
  assert.ok(sim.brokerCards.length === 7, '7 brokers compared (including Telda and Beltone)');
});

test('simulatorExplorer defaults to requested BTFH close-to-11:00 over two years', () => {
  const comp = { state: {}, setState(patch) { Object.assign(this.state, patch); } };
  const sim = simulatorExplorer(comp, comp.state);

  assert.equal(sim.ticker, 'BTFH');
  assert.equal(sim.strategy, 'daily', 'defaults to daily trading strategy');
  assert.equal(sim.timing, 'close_to_11');
  assert.equal(sim.exitTime, '11:00', 'liquidation defaults to 11:00 AM');
  // A default that cannot be priced is worse than the one it replaced. The
  // clock times live only in the intraday set; if the explorer ever falls
  // back to the four-column daily rows this goes red rather than showing
  // "11:00 AM return unavailable" to every reader who opens the tool.
  assert.equal(sim.missingExitPrices, false, '11:00 prices are loaded for the default stock');
  assert.equal(sim.resultsAvailable, true);
  assert.equal(sim.range, '2Y');
  assert.equal(sim.isDaily, true, 'isDaily flag is true');
  assert.ok(Number.isFinite(sim.brokerCards[0].netReturnPct), 'return is calculated rather than predetermined');
  assert.ok(sim.brokerCards.some(b => b.id === 'beltone'), 'Beltone broker is present');
  assert.ok(sim.brokerCards.some(b => b.id === 'telda'), 'Telda broker is present');
  assert.ok(sim.multiChartLines.length === 7, '7 colored trajectories plotted');
  assert.ok(sim.multiChartLines[0].pathD.includes(' C '), 'renders smooth cubic bezier spline');
});

test('simulatorExplorer supports custom date pickers and execution timing modes', () => {
  const comp = createMockComponent({
    simTicker: 'SWDY',
    simRange: 'CUSTOM',
    simStartDate: '2025-10-01',
    simEndDate: '2026-03-01',
    simTiming: 'close_to_open'
  });
  const sim = simulatorExplorer(comp, comp.state);

  assert.equal(sim.timing, 'close_to_open');
  assert.equal(sim.range, 'CUSTOM');
  assert.ok(sim.startDate >= '2025-10-01');
  assert.ok(sim.endDate <= '2026-03-01');
  assert.ok(sim.totalSessionsCount > 0, 'sessions filtered by custom date range');
});

test('broker cards rank by net ending cash and highlight the winner', () => {
  const comp = createMockComponent();
  const sim = simulatorExplorer(comp, comp.state);

  const cards = sim.brokerCards;
  assert.equal(cards[0].rankNum, 1);
  assert.equal(cards[0].isWinner, true);
  assert.ok(cards[0].netEndingCash >= cards[1].netEndingCash, 'ranked in descending order of net cash');
  assert.ok(sim.bestBrokerName, 'winner broker named');
  assert.ok(sim.feeDifferenceFmt !== undefined, 'fee difference calculated');
});

test('Telda has zero broker commission and standard statutory fees', () => {
  const comp = createMockComponent({ simStrategy: 'lump', simCapital: 100000 });
  const sim = simulatorExplorer(comp, comp.state);

  const telda = sim.brokerCards.find(b => b.id === 'telda');
  assert.ok(telda, 'Telda broker card exists');
  assert.equal(telda.brokerFeeFmt, '0', 'Telda broker markup is 0');
  assert.ok(telda.totalFees > 0, 'Telda still pays statutory fees (0.08% + 2 EGP)');
});

test('Thndr subscription toggle calculates realistic monthly drag', () => {
  const compFree = createMockComponent({ simRange: '2Y', includeThndrSub: false });
  const simFree = simulatorExplorer(compFree, compFree.state);
  const thndrFree = simFree.brokerCards.find(b => b.id === 'thndr');

  const compSub = createMockComponent({ simRange: '2Y', includeThndrSub: true });
  const simSub = simulatorExplorer(compSub, compSub.state);
  const thndrSub = simSub.brokerCards.find(b => b.id === 'thndr');

  assert.ok(thndrSub.hasSubFee, 'hasSubFee is true when subscription active');
  assert.ok(thndrSub.totalFees > thndrFree.totalFees, 'total fees higher with subscription');
  assert.ok(thndrSub.netEndingCash < thndrFree.netEndingCash, 'net cash lower with subscription');
});

test('monthly DCA simulation models periodic recurring executions and fees', () => {
  const comp = createMockComponent({ simStrategy: 'dca', simRange: '1Y', simMonthly: 2500 });
  const sim = simulatorExplorer(comp, comp.state);

  assert.equal(sim.strategy, 'dca');
  assert.equal(sim.isDca, true);
  assert.ok(sim.brokerCards[0].executionsFmt >= 12, 'at least 12 buy executions plus exit');
  assert.ok(sim.brokerCards[0].totalFees > 0, 'fees accumulated across DCA intervals');
});

test('stock searching matches ticker and company names across Arabic and English', () => {
  const comp = createMockComponent({ simSearchQuery: 'سويدي' });
  const simAr = simulatorExplorer(comp, comp.state);
  assert.ok(simAr.searchMatches.some(m => m.ticker === 'SWDY'), 'Arabic name search finds SWDY');

  comp.setState({ simSearchQuery: 'fawry' });
  const simEn = simulatorExplorer(comp, comp.state);
  assert.ok(simEn.searchMatches.some(m => m.ticker === 'FWRY'), 'English name search finds FWRY');
});

test('trajectory sparkline generates valid SVG path and buy/sell coordinates', () => {
  const comp = createMockComponent();
  const sim = simulatorExplorer(comp, comp.state);

  assert.ok(sim.lineD.startsWith('M'), 'line path starts with M');
  assert.ok(sim.areaD.includes('Z'), 'area path closed with Z');
  assert.ok(typeof sim.buyPin.x === 'number' && typeof sim.buyPin.y === 'number', 'buy pin coordinates valid');
  assert.ok(typeof sim.sellPin.x === 'number' && typeof sim.sellPin.y === 'number', 'sell pin coordinates valid');
});

test('multi-line trajectory plots each broker with a distinct color', () => {
  const comp = { state: { simTicker: 'BTFH', simRange: '2Y', simStrategy: 'daily' }, setState() {} };
  const sim = simulatorExplorer(comp, comp.state);

  assert.equal(sim.multiChartLines.length, 7, '7 broker lines generated');
  const colors = new Set(sim.multiChartLines.map(l => l.color));
  assert.equal(colors.size, 7, 'all 7 brokers have unique brand colors');
  for (const line of sim.multiChartLines) {
    assert.ok(line.pathD.startsWith('M'), `${line.id} path starts with M`);
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { simulatorExplorer } from '../../public/esthmr/simulator.js';

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

test('simulatorExplorer defaults to BTFH on daily trading for 2 years when no state is set', () => {
  const comp = { state: {}, setState(patch) { Object.assign(this.state, patch); } };
  const sim = simulatorExplorer(comp, comp.state);

  assert.equal(sim.ticker, 'BTFH', 'defaults to Beltone Financial Holding');
  assert.equal(sim.strategy, 'daily', 'defaults to daily trading strategy');
  assert.equal(sim.range, '2Y', 'defaults to 2-year range');
  assert.equal(sim.isDaily, true, 'isDaily flag is true');
  assert.ok(sim.brokerCards.some(b => b.id === 'beltone'), 'Beltone broker is present');
  assert.ok(sim.brokerCards.some(b => b.id === 'telda'), 'Telda broker is present');
  assert.ok(sim.multiChartLines.length === 7, '7 colored trajectories plotted');
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

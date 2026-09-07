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

test('simulatorExplorer initializes with COMI and lump sum defaults', () => {
  const comp = createMockComponent();
  const sim = simulatorExplorer(comp, comp.state);

  assert.equal(sim.ticker, 'COMI');
  assert.equal(sim.strategy, 'lump');
  assert.equal(sim.isLumpSum, true);
  assert.equal(sim.isDca, false);
  assert.equal(sim.capital, 100000);
  assert.ok(sim.stockOptions.length >= 50, 'at least 50 EGX stocks loaded');
  assert.ok(sim.brokerCards.length === 6, '6 brokers compared');
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

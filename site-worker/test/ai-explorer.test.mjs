/* The AI hero and the scenario workbench, driven the way a reader drives them.
 *
 * The owner's conditions for these screens are the spine of this file:
 * nothing on them is written into the code — every figure moves when the
 * record moves; switching the evidence the re-rank reads shows a different
 * re-rank, not the same answer re-drawn; and a reader can always tell what a
 * model picked for sessions that have not happened from what its earlier
 * picks actually did.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { installDom } from './dom-stub.mjs';
import { aiCards, heroModel } from '../../public/esthmr/ai-cards.js';
import { heroChart, histogram, fanChart, nextRun, reorderChart, nightsChart } from '../../public/esthmr/ai-visuals.js';
import { saidParts } from '../../public/esthmr/scenario-visuals.js';
import {
  scenariosScreen, warningLines, ACCEPTED_KEY, readingKey, choosableModels, choiceOf, recordOf, nightsOf,
  rerankView, returnsView, standing, spearman, saysOf,
} from '../../public/esthmr/scenarios.js';

installDom();
const ROOT = new URL('../../', import.meta.url);
const read = (p) => readFile(new URL(p, ROOT), 'utf8');

const all = (n) => (n ? [n, ...(n.children || []).flatMap(all)] : []);
const text = (n) => (n ? [n.text || '', ...(n.children || []).map(text)].join(' ') : '');
const byClass = (n, c) => all(n).filter((x) => String(x.attrs?.class || '').split(' ').includes(c));
const button = (n, label) => all(n).find((x) => x.tag === 'button' && text(x).includes(label));
const flush = () => new Promise((resolve) => setImmediate(resolve));

function component(state = {}, extra = {}) {
  return {
    _reader: 'reader@example.com',
    state: { scAccepted: 1, scAcceptedReader: 'reader@example.com', ...state },
    setState(p) { Object.assign(this.state, typeof p === 'function' ? p(this.state) : p); },
    ...extra,
  };
}

const byDate = (values) => values.map((v, i) => ({
  basisSession: `2026-09-0${i + 1}`, chosenReturn: v, marketReturn: 1, advantage: v - 1,
}));

function record(overrides = {}) {
  return {
    topCount: 5, minimumSessions: 3, horizons: [1, 5, 20], dates: ['a', 'b', 'c', 'd'],
    latest: { forecasters: 9, rerankReads: ['filings', 'news', 'rulebook'] },
    models: {
      rerank: { label: 'Gemini re-rank', labelAr: 'إعادة ترتيب Gemini', group: 'rerank', nights: 4, distinguishes: true,
        horizons: { 5: { sessions: 4, meanReturn: 3.5, meanMarket: 1, meanAdvantage: 2.5, ahead: 3, signChanges: 1, byDate: byDate([4, 2, 5, 3]) } } },
      kronos: { label: 'Kronos-small', labelAr: 'Kronos-small', group: 'neural', nights: 4, distinguishes: true,
        horizons: { 5: { sessions: 4, meanReturn: 0.5, meanMarket: 1, meanAdvantage: -0.5, ahead: 1, signChanges: 2, byDate: byDate([0, 1, 2, -1]) } } },
      chronos2: { label: 'Chronos-2', labelAr: 'Chronos-2', group: 'neural', nights: 1, distinguishes: true,
        horizons: { 5: { sessions: 1, meanReturn: 9, meanMarket: 1, meanAdvantage: 8, ahead: 1, byDate: byDate([9]) } } },
      flat: { label: 'Flat, says nothing', labelAr: 'ثابت', group: 'baseline', nights: 4, distinguishes: false,
        horizons: { 5: { sessions: 4, meanReturn: 2, meanMarket: 1, meanAdvantage: 1, ahead: 4, byDate: byDate([2, 2, 2, 2]) } } },
    },
    ...overrides,
  };
}

const LAYERS = ['filings', 'news', 'rulebook', 'measures'];
const scenarios = {
  basisSession: '2026-09-14', horizons: [1, 5, 20], dates: ['2026-09-10', '2026-09-11', '2026-09-14'],
  schedule: { cron: ['0 14 * * 0-4'] },
  commitment: { merkleRoot: 'ab'.repeat(32), timestamped: true, authority: 'freetsa', committedBeforeOpen: true },
  models: {
    kronos: { label: 'Kronos', labelAr: 'Kronos', group: 'neural', returns: true, distinguishes: true },
    drift: { label: 'Drift', labelAr: 'الانجراف', group: 'baseline', returns: true, distinguishes: true },
    flat: { label: 'Flat', labelAr: 'ثابت', group: 'baseline', returns: true, distinguishes: false },
    momentum20: { label: 'Momentum', labelAr: 'الزخم', group: 'baseline', returns: false, distinguishes: true },
  },
  rerank: {
    ranAt: '2026-09-14T18:00:00Z', layers: LAYERS, default: ['filings', 'news', 'rulebook'],
    evidence: { filings: { items: 12, companies: 3, from: '2026-09-01', to: '2026-09-14' }, news: { items: 3 }, measures: { companies: 3 } },
    commitment: { merkleRoot: 'cd'.repeat(32), timestamped: true, authority: 'freetsa' },
    readings: {
      models: { answered: 3, count: 1 },
      'filings-news-rulebook': { answered: 3, count: 1 },
      'filings-news-rulebook-measures': { answered: 3, count: 2 },
      news: { answered: 0, count: null, reason: 'TimeoutError: vertex did not answer' },
    },
  },
  companies: {
    AAA: { ticker: 'AAA', close: 10, path: [-2, -1, 0], models: { kronos: { returns: { 1: 1, 5: 2, 20: 4 } }, drift: { returns: { 1: 0.5, 5: 1, 20: 2 } }, flat: { returns: { 1: 0, 5: 0, 20: 0 } }, momentum20: { returns: {}, rankedBy: { 1: 9, 5: 9, 20: 9 } } } },
    BBB: { ticker: 'BBB', close: 20, path: [1, 0.5, 0], models: { kronos: { returns: { 1: -1, 5: -3, 20: -6 } }, drift: { returns: { 1: 0.2, 5: 0.4, 20: 0.8 } }, flat: { returns: { 1: 0, 5: 0, 20: 0 } }, momentum20: { returns: {}, rankedBy: { 1: -4, 5: -4, 20: -4 } } } },
    CCC: { ticker: 'CCC', close: 30, path: [0, 0, 0], models: { kronos: { returns: { 1: 0.1, 5: 0.5, 20: 1 } }, drift: { returns: { 1: -0.1, 5: -0.2, 20: -0.4 } }, flat: { returns: { 1: 0, 5: 0, 20: 0 } } } },
  },
};
const readings = {
  models: { scores: { AAA: 10, BBB: 90, CCC: 50 }, count: 1, answered: 3, abstained: 0, note: 'the forecasts alone' },
  'filings-news-rulebook': { scores: { AAA: 80, BBB: 20, CCC: 50 }, count: 1, answered: 3, abstained: 0, note: 'the filings moved it' },
  'filings-news-rulebook-measures': { scores: { AAA: 70, BBB: 60, CCC: 10 }, count: 2, answered: 3, abstained: 0, note: 'the measurements moved it' },
};

/* The picks file, in the shape publish.py writes it. Five companies a night
 * means five tickers; the fixture's market has more of them than the three
 * the scenarios carry, as the real one does not. */
const five = (tickers, said, returned) => tickers.map((ticker, i) => ({
  ticker, said: said[i], ...(returned ? { returned: returned[i] } : {}) }));
const waiting = (basis, tickers, said, closed = 0) => ({ basisSession: basis, sessionsClosed: closed, status: 'waiting', picks: five(tickers, said), tied: 0 });
const scored = (basis, tickers, said, returned, market) => {
  const chosen = returned.reduce((s, v) => s + v, 0) / returned.length;
  return { basisSession: basis, sessionsClosed: 5, status: 'scored', picks: five(tickers, said, returned),
    followed: 5, scored: 200, chosenReturn: chosen, marketReturn: market, advantage: chosen - market,
    beatTheMarket: chosen > market, skipped: [], tied: 0 };
};
const T = ['EEE', 'CCC', 'AAA', 'DDD', 'BBB'];
function picksFile(overrides = {}) {
  return {
    schemaVersion: 1, topCount: 5, minimumSessions: 3, horizons: [1, 5, 20], latestSession: '2026-09-14',
    models: {
      kronos: { label: 'Kronos-small', labelAr: 'Kronos-small', group: 'neural', says: { kind: 'return' }, horizons: {
        5: { older: 0, nights: [
          waiting('2026-09-14', T, [9.5, 8.25, 7, 6, 5]),
          waiting('2026-09-13', ['FFF', 'GGG', 'HHH', 'III', 'JJJ'], [4, 3, 2, 1, 0.5], 1),
          scored('2026-09-03', ['KKK', 'LLL', 'MMM', 'NNN', 'OOO'], [5, 4, 3, 2, 1], [4, -2, 1, 0, 2], 0.5),
          { basisSession: '2026-09-02', sessionsClosed: 5, status: 'withheld' },
          scored('2026-09-01', ['PPP', 'QQQ', 'RRR', 'SSS', 'TTT'], [5, 4, 3, 2, 1], [-3, -1, 0, 1, -2], 1),
          scored('2026-08-31', ['UUU', 'VVV', 'WWW', 'XXX', 'YYY'], [5, 4, 3, 2, 1], [6, 2, 1, 3, 3], 2),
        ] } } },
      momentum20: { label: 'Momentum, 20 sessions', labelAr: 'الزخم، 20 جلسة', group: 'baseline', says: { kind: 'momentum', sessions: 20 }, horizons: {
        5: { older: 0, nights: [waiting('2026-09-14', T, [31.5, 20, 18, 12, 11])] } } },
      reversal1: { label: 'Reversal, 1 session', labelAr: 'الانعكاس، جلسة', group: 'baseline', says: { kind: 'reversal', sessions: 1 }, horizons: {
        5: { older: 0, nights: [waiting('2026-09-14', T, [7.25, 6, 5, 4, 3])] } } },
    },
    readings: {
      models: { label: 'rerank:models', group: 'rerank', layers: [], default: false, says: { kind: 'score', outOf: 100 },
        notes: { '2026-09-14': { count: 1, note: 'the forecasts alone' } },
        horizons: { 5: { older: 0, nights: [waiting('2026-09-14', ['AAA', 'BBB', 'CCC', 'DDD', 'EEE'], [90, 80, 70, 60, 50])] } } },
      'filings-news-rulebook': { label: 'Gemini re-rank', labelAr: 'إعادة ترتيب Gemini', group: 'rerank', layers: ['filings', 'news', 'rulebook'], default: true,
        says: { kind: 'score', outOf: 100 }, notes: { '2026-09-14': { count: 1, note: 'the filings moved it' } },
        horizons: { 5: { older: 0, nights: [waiting('2026-09-14', ['AAA', 'BBB', 'CCC', 'DDD', 'EEE'], [88, 85, 82, 80, 78])] } } },
      'filings-news-rulebook-measures': { label: 'rerank:filings-news-rulebook-measures', group: 'rerank', layers: LAYERS, default: false,
        says: { kind: 'score', outOf: 100 }, notes: { '2026-09-14': { count: 2, note: 'the measurements moved it' } },
        horizons: { 5: { older: 0, nights: [waiting('2026-09-14', ['AAA', 'KKK', 'LLL', 'MMM', 'NNN'], [95, 91, 90, 87, 86])] } } },
    },
    ...overrides,
  };
}

const data = {
  top5: record(), scenarios, readings, picks: picksFile(),
  companies: [{ ticker: 'AAA', name: { en: 'Alpha', ar: 'ألفا' } }, { ticker: 'BBB', name: { en: 'Beta', ar: 'بيتا' } }, { ticker: 'CCC', name: { en: 'Gamma', ar: 'جاما' } }],
};
const screen = (c, d = data, ar = false) => scenariosScreen(c, d, ar).screen;
const tickersOf = (node) => byClass(node, 'aix-pick').map((p) => text(all(p).find((x) => x.tag === 'b')).trim());

/* ── the hero ───────────────────────────────────────────────────────────── */

test('the hero leads with the system and every figure on it comes from the record', () => {
  const node = aiCards(component(), data, false);
  const system = byClass(node, 'aix-system')[0];
  assert.match(text(system), /\+3\.50%/);
  assert.match(text(system), /\+1\.00% for the market/);
  assert.match(text(system), /ahead on 3 of 4/);
  const rows = byClass(node, 'aix-model-row');
  assert.match(text(rows[0]), /Gemini re-rank/);
  assert.match(text(rows[1]), /Kronos-small.*-0\.50 pp/s);
  // Moved in the record, moved on the screen: nothing here is a constant.
  const moved = record();
  moved.models.rerank.horizons[5].meanReturn = -7.25;
  moved.latest.forecasters = 6;
  const again = aiCards(component(), { ...data, top5: moved }, false);
  assert.match(text(byClass(again, 'aix-system')[0]), /-7\.25%/);
  assert.match(text(again), /Six models rank every company/);
  assert.doesNotMatch(text(again), /Nine models/);
});

test('below the record’s minimum a model shows what it has and what it needs', () => {
  const node = aiCards(component(), data, false);
  const chronos = byClass(node, 'aix-model-row').find((r) => /Chronos-2/.test(text(r)));
  assert.match(text(chronos), /1 OF 3 SESSIONS/);
  assert.match(text(chronos), /needs 2 more sessions to be scored/);
  assert.doesNotMatch(text(chronos), /\+8\.00/);
  const pending = record();
  pending.models.rerank.horizons[5].sessions = 2;
  const card = byClass(aiCards(component(), { ...data, top5: pending }, false), 'aix-system')[0];
  assert.match(text(card), /2\/3/);
  assert.doesNotMatch(text(card), /\+3\.50%/);
  assert.equal(all(card).filter((n) => n.tag === 'svg').length, 0);
});

test('a model that tells no companies apart is left off the list', () => {
  const m = heroModel(record(), '5');
  assert.deepEqual(m.rows.map((r) => r.id), ['rerank', 'kronos', 'chronos2']);
  assert.equal(m.pendingCount, 1);
});

test('the window chips are the record’s horizons and switch it', () => {
  const c = component({ aiHorizon: '5' });
  const node = aiCards(c, data, false);
  const chips = byClass(node, 'aix-seg')[0].children;
  assert.deepEqual(chips.map(text).map((s) => s.trim()), ['1 session', '5 sessions', '20 sessions']);
  button(node, '20 sessions').events.click();
  assert.equal(c.state.aiHorizon, '20');
  assert.match(text(aiCards(c, data, false)), /0 OF 3 SESSIONS/);
});

test('a model row opens the workbench on that model, and the call to action asks no question', () => {
  const c = component({ scSearch: 'old search', scShowAll: true });
  const node = aiCards(c, data, false);
  byClass(node, 'aix-model-row').find((r) => /Kronos/.test(text(r))).events.click();
  assert.equal(c.state.screen, 'scenarios');
  assert.equal(c.state.scModel, 'kronos');
  assert.equal(c.state.scFrom, 'kronos');
  assert.equal(c.state.scHorizon, 5);
  assert.equal(c.state.scSearch, '');
  assert.equal(c.state.scShowAll, false);
  const cta = byClass(node, 'aix-cta')[0];
  assert.match(text(cta), /picks and results/);
  assert.doesNotMatch(text(node), /question/i);
});

test('the beta pill opens the warning, and accepting it opens the workbench', () => {
  const saved = new Map();
  globalThis.localStorage = { getItem: (k) => saved.get(k), setItem: (k, v) => saved.set(k, v), removeItem: (k) => saved.delete(k) };
  try {
    const c = component({ scAccepted: 0 });
    let node = aiCards(c, data, false);
    byClass(node, 'aix-beta')[0].events.click();
    assert.equal(c.state.aiWarning, true);
    node = aiCards(c, data, false);
    assert.equal(all(node).filter((n) => n.tag === 'dialog').length, 1);
    button(node, 'I understand').events.click();
    assert.equal(saved.get(ACCEPTED_KEY + c._reader), '1');
    assert.equal(c.state.screen, 'scenarios');
    assert.equal(c.state.aiWarning, false);
  } finally { delete globalThis.localStorage; }
});

/* ── the workbench: what is offered ─────────────────────────────────────── */

test('the model chips are the re-rank and every model with a five of its own', () => {
  // Ranking baselines have a five and a record, so they are offered now; a
  // model that says the same about every company has no five and is not.
  assert.deepEqual(choosableModels(data.picks, scenarios, data.top5).map((m) => m.id),
    ['rerank', 'kronos', 'momentum20', 'reversal1', 'drift']);
  assert.deepEqual(choosableModels(null, { ...scenarios, rerank: null }).map((m) => m.id), ['kronos', 'drift', 'momentum20']);
  assert.equal(choosableModels(data.picks, scenarios)[0].label, 'Gemini re-rank');
});

test('a reading key is spelled the way the lab seals it', () => {
  assert.equal(readingKey(['measures', 'filings'], LAYERS), 'filings-measures');
  assert.equal(readingKey(['rulebook', 'news', 'filings'], LAYERS), 'filings-news-rulebook');
  assert.equal(readingKey([], LAYERS), 'models');
  assert.equal(readingKey(['gossip'], LAYERS), 'models');
});

test('the controls start where the re-rank Home reports starts, and there is nothing to run', async () => {
  const choice = choiceOf({}, data.picks, scenarios, data.top5);
  assert.equal(choice.model, 'rerank');
  assert.deepEqual(choice.layers, ['filings', 'news', 'rulebook']);
  assert.equal(choice.horizon, 5);
  const node = screen(component());
  assert.equal(byClass(node, 'aix-run').length, 0);
  assert.ok(!button(node, 'Run'), 'a run button came back');
  const src = await read('public/esthmr/scenarios.js') + await read('public/esthmr/scenario-visuals.js');
  assert.doesNotMatch(src, /setTimeout|setInterval|scStage|runScenario/);
});

test('what a model’s number is follows its name', () => {
  assert.deepEqual(saysOf('kronos'), { kind: 'return' });
  assert.deepEqual(saysOf('momentum60'), { kind: 'momentum', sessions: 60 });
  assert.deepEqual(saysOf('reversal5'), { kind: 'reversal', sessions: 5 });
  assert.deepEqual(saysOf('rerank:filings'), { kind: 'score', outOf: 100 });
});

/* ── the workbench: next, then what already happened ────────────────────── */

test('the screen opens on what comes next, and puts what already happened after it', () => {
  const node = screen(component({ scModel: 'kronos' }));
  const results = byClass(node, 'aix-results')[0].children.filter(Boolean);
  const order = results.map((n) => String(n.attrs?.class || ''));
  const next = order.findIndex((c) => c.includes('aix-next'));
  const sofar = order.findIndex((c) => c.includes('aix-sofar'));
  assert.ok(next >= 0 && sofar > next, 'the record came before the picks, or one is missing');
  assert.match(text(results[next]), /NOT KNOWN YET/);
  assert.match(text(results[next]), /nobody knows how they do/);
  assert.match(text(results[sofar]), /ALREADY HAPPENED/);
  assert.match(text(results[sofar]), /3 SCORED/);
});

test('the newest five are named alphabetically, each with what the model expects', () => {
  const node = screen(component({ scModel: 'kronos' }));
  const card = byClass(node, 'aix-next')[0];
  assert.deepEqual(tickersOf(card), ['AAA', 'BBB', 'CCC', 'DDD', 'EEE']);
  assert.match(text(card), /The five Kronos-small picked after the close of 14 Sep 2026/);
  assert.match(text(byClass(card, 'aix-pick')[2]), /expects.*\+8\.25%/s);
  assert.match(text(card), /once 5 more sessions close/);
  assert.match(text(card), /not a recommendation/);
  // A number, never a place: no rank column, no "#1".
  assert.doesNotMatch(text(card), /#\s?1|\b1st\b|best/i);
});

test('a ranking baseline shows the move it ranks by, never a forecast', () => {
  const momentum = byClass(screen(component({ scModel: 'momentum20' })), 'aix-next')[0];
  assert.match(text(momentum), /rose the most over the last 20 sessions/);
  assert.match(text(momentum), /last 20 sessions.*\+31\.50%/s);
  assert.doesNotMatch(text(momentum), /expects/);
  // Reversal ranks by the fall, stored with its sign turned over; the figure
  // printed is the fall itself.
  const reversal = byClass(screen(component({ scModel: 'reversal1' })), 'aix-next')[0];
  assert.match(text(reversal), /fell the most in the last session/);
  assert.match(text(reversal), /-7\.25%/);
  assert.deepEqual(saidParts({ kind: 'reversal', sessions: 1 }, 7.25, false).figure, '-7.25%');
});

test('switching on the measurements shows a different five and says what the evidence changed', () => {
  const c = component({ scModel: 'rerank' });
  let node = screen(c);
  let card = byClass(node, 'aix-next')[0];
  assert.deepEqual(tickersOf(card), ['AAA', 'BBB', 'CCC', 'DDD', 'EEE']);
  assert.match(text(card), /the filings moved it/);
  assert.match(text(card), /said 1 company was worth anything/);
  // Reading the forecasts alone gave the same five, and it says so.
  assert.match(text(card), /nothing in the five/);

  const on = button(node, 'Its own measurements');
  assert.equal(on.attrs['aria-checked'], 'false');
  on.events.click();
  assert.deepEqual(c.state.scLayers, LAYERS);
  node = screen(c);
  card = byClass(node, 'aix-next')[0];
  assert.deepEqual(tickersOf(card), ['AAA', 'KKK', 'LLL', 'MMM', 'NNN']);
  assert.match(text(card), /the measurements moved it/);
  assert.doesNotMatch(text(card), /the filings moved it/);
  assert.match(text(card), /said 2 companies were worth anything/);
  assert.match(text(card), /4 of the five above are not among them/);
});

test('the record counts scored nights and averages only past the minimum', () => {
  let card = byClass(screen(component({ scModel: 'kronos' })), 'aix-sofar')[0];
  // (4-2+1+0+2)/5 = 1, (-3-1+0+1-2)/5 = -1, (6+2+1+3+3)/5 = 3; markets .5, 1, 2.
  assert.match(text(card), /2\/3/);
  assert.match(text(card), /\+1\.00%/);
  assert.match(text(card), /\+1\.17%/);
  assert.match(text(card), /-0\.17 pp for its fives/);
  assert.ok(byClass(card, 'aix-nights-chart').length === 1);

  const strict = picksFile({ minimumSessions: 5 });
  card = byClass(screen(component({ scModel: 'kronos' }), { ...data, picks: strict }), 'aix-sofar')[0];
  assert.match(text(card), /an average needs 5 scored nights; 3 so far/);
  // Below the minimum the count stands and neither average does.
  const figures = all(byClass(card, 'aix-stats')[0]).filter((n) => n.tag === 'dd').map((n) => text(n).trim());
  assert.deepEqual(figures, ['2/3', '—', '—']);
});

test('a night still waiting shows what the model said in dashed chips, never as a result', () => {
  const card = byClass(screen(component({ scModel: 'kronos' })), 'aix-sofar')[0];
  const rows = byClass(card, 'aix-night');
  const waitingRow = rows.find((r) => /13 Sep 2026/.test(text(r)));
  assert.match(text(waitingRow), /WAITING · 1 OF 5/);
  assert.match(text(waitingRow), /Not scored yet — 4 more sessions to go/);
  assert.match(text(waitingRow), /not what happened/);
  assert.ok(byClass(waitingRow, 'aix-pick-chip').every((chip) => /is-said/.test(chip.attrs.class)));
  const scoredRow = rows.find((r) => /\b3 Sep 2026/.test(text(r)));
  assert.match(text(scoredRow), /AHEAD/);
  assert.ok(byClass(scoredRow, 'aix-pick-chip').every((chip) => !/is-said/.test(chip.attrs.class)));
  assert.deepEqual(byClass(scoredRow, 'aix-pick-chip').map((chip) => text(chip.children[0]).trim()), ['KKK', 'LLL', 'MMM', 'NNN', 'OOO']);
  // The newest five are on the card above, not repeated in the list.
  assert.ok(!rows.some((r) => /14 Sep 2026/.test(text(r))));
});

test('a night not counted names no company', () => {
  const card = byClass(screen(component({ scModel: 'kronos' })), 'aix-sofar')[0];
  const row = byClass(card, 'aix-night').find((r) => /\b2 Sep 2026/.test(text(r)));
  assert.match(text(row), /NOT COUNTED/);
  assert.equal(byClass(row, 'aix-pick-chip').length, 0);
});

test('long histories are behind a show-all, and older nights say they are in the averages', () => {
  const many = picksFile();
  const nights = many.models.kronos.horizons[5].nights;
  for (let i = 0; i < 6; i += 1) nights.push(scored(`2026-08-${10 + i}`, ['KKK', 'LLL', 'MMM', 'NNN', 'OOO'], [5, 4, 3, 2, 1], [1, 1, 1, 1, 1], 0));
  const c = component({ scModel: 'kronos' });
  let card = byClass(screen(c, { ...data, picks: many }), 'aix-sofar')[0];
  assert.equal(byClass(card, 'aix-night').length, 6);
  button(card, 'Show all 11 nights').events.click();
  card = byClass(screen(c, { ...data, picks: many }), 'aix-sofar')[0];
  assert.equal(byClass(card, 'aix-night').length, 11);

  // With older nights left off the list, the averages are the public record's.
  const held = { horizons: { 5: { older: 7, nights: nights.slice(0, 3) } } };
  const r = recordOf(held, 5, { horizons: { 5: { sessions: 12, ahead: 7, meanReturn: 2, meanMarket: 1, meanAdvantage: 1 } } }, 5);
  assert.equal(r.sessions, 12);
  assert.equal(r.enough, true);
  assert.equal(recordOf({ horizons: { 5: { older: 0, nights: nights.slice(0, 3) } } }, 5, null, 5).sessions, 1);
});

test('a model with nothing scored yet says when the first result comes', () => {
  const c = component({ scModel: 'rerank' });
  const card = byClass(screen(c), 'aix-sofar')[0];
  assert.match(text(card), /Nothing scored yet at 5 sessions/);
  assert.match(text(card), /first result comes once 5 more sessions close, for the five from 14 Sep 2026/);
  assert.equal(byClass(card, 'aix-nights-chart').length, 0);
});

test('with no five waiting the card says why instead of showing an old five as new', () => {
  const stale = picksFile();
  stale.models.kronos.horizons[5].nights.splice(0, 2);
  const card = byClass(screen(component({ scModel: 'kronos' }), { ...data, picks: stale }), 'aix-next')[0];
  assert.match(text(card), /No five waiting from Kronos-small/);
  assert.match(text(card), /have already been scored/);
  assert.equal(byClass(card, 'aix-pick').length, 0);
  assert.deepEqual(nightsOf(stale.models.kronos, 5).next, null);
});

test('a reading’s own scores are fetched for the list behind the five, and a failure says so', async () => {
  const asked = [];
  const c = component({ scModel: 'rerank' }, {
    loadReading: async (key) => { asked.push(key); throw new Error('offline'); },
  });
  const bare = { ...data, readings: {} };
  let node = screen(c, bare);
  // The five and the record do not wait for it.
  assert.equal(tickersOf(byClass(node, 'aix-next')[0]).length, 5);
  await flush(); await flush();
  assert.deepEqual(asked, ['filings-news-rulebook', 'models']);
  node = screen(c, bare);
  assert.match(text(node), /This reading could not be fetched/);
  assert.match(text(node), /offline/);
  button(node, 'Try again').events.click();
  assert.equal(c.state.scFailed['filings-news-rulebook'], undefined);
});

test('a combination that did not answer that night says so and why', () => {
  const c = component({ scModel: 'rerank', scLayers: ['news'] });
  assert.match(text(screen(c)), /did not answer that night: TimeoutError: vertex did not answer/);
});

test('a forecaster greys the switches out and says why', () => {
  const node = screen(component({ scModel: 'kronos' }));
  const toggles = byClass(node, 'aix-toggle');
  assert.equal(toggles.length, 4);
  assert.ok(toggles.every((t) => t.attrs.disabled === 'true'));
  assert.match(text(node), /Only the re-rank reads these/);
});

/* ── the workbench: every company behind the five ───────────────────────── */

test('every company is listed alphabetically, the five marked, and search narrows it', () => {
  const c = component({ scModel: 'kronos' });
  let list = byClass(screen(c), 'aix-company-card')[0];
  const rows = byClass(list, 'aix-company-row');
  assert.deepEqual(rows.map((r) => text(all(r).find((x) => x.tag === 'b')).trim().slice(0, 3)), ['AAA', 'BBB', 'CCC']);
  assert.equal(byClass(list, 'aix-five-badge').length, 3);
  all(list).find((x) => x.tag === 'input').events.input({ target: { value: 'beta' } });
  list = byClass(screen(c), 'aix-company-card')[0];
  assert.equal(byClass(list, 'aix-company-row').length, 1);
});

test('a forecaster’s view covers every company, alphabetically, and counts agreement honestly', () => {
  const view = returnsView(scenarios, { model: 'kronos', horizon: 5 }, ['AAA', 'BBB', 'CCC']);
  assert.deepEqual(view.rows.map((r) => r.ticker), ['AAA', 'BBB', 'CCC']);
  const aaa = view.rows[0];
  assert.equal(aaa.value, 2);
  // Flat says zero about everything and is counted neither way.
  assert.equal(aaa.of, 2);
  assert.equal(aaa.agree, 2);
  assert.equal(view.rows[1].agree, 1);
  assert.equal(view.summary.count, 3);
  assert.deepEqual(view.past, [-1 / 3, -1 / 6, 0]);
  assert.equal(view.byModel.find((m) => m.id === 'flat').median, 0);
  assert.equal(view.pointingUp, 2);
});

test('companies left tied are not moved by the alphabet', () => {
  assert.deepEqual(standing({ A: 5, B: 5, C: 1 }), { A: 1.5, B: 1.5, C: 3 });
  const tickers = Array.from({ length: 40 }, (_, i) => `T${String(i).padStart(2, '0')}`);
  const ordered = Object.fromEntries(tickers.map((t, i) => [t, i]));
  const lumped = Object.fromEntries(tickers.map((t) => [t, 0]));
  const many = { ...scenarios, companies: Object.fromEntries(tickers.map((t) => [t, { ticker: t, models: {} }])) };
  const view = rerankView(many, { model: 'rerank', horizon: 5, layers: ['filings'] }, tickers,
    { scores: lumped, count: 3, answered: 40 }, { scores: ordered, count: 3, answered: 40 });
  assert.equal(view.moved, 0);
  assert.equal(spearman([[1, 1], [2, 2], [3, 3]]), 1);
  assert.equal(spearman([[1, 1], [1, 2]]), null);
});

/* ── the gate, the proof, and what was taken away ───────────────────────── */

test('the gate comes before any figure, per reader, and can be brought back', () => {
  const saved = new Map();
  globalThis.localStorage = { getItem: (k) => saved.get(k), setItem: (k, v) => saved.set(k, v), removeItem: (k) => saved.delete(k) };
  try {
    const c = component({ scAcceptedReader: 'someone-else@example.com', scModel: 'kronos' });
    let node = screen(c);
    assert.equal(byClass(node, 'aix-next').length, 0);
    assert.equal(byClass(node, 'aix-pick').length, 0);
    assert.equal(all(node).filter((n) => n.tag === 'dialog').length, 1);
    all(node).find((n) => n.tag === 'dialog').events.cancel();
    assert.equal(c.state.screen, 'home');
    button(node, 'I understand').events.click();
    assert.equal(saved.get(ACCEPTED_KEY + c._reader), '1');
    node = screen(c);
    assert.equal(byClass(node, 'aix-pick').length, 5);
    button(node, 'Show the warning again').events.click();
    assert.equal(byClass(screen(c), 'aix-pick').length, 0);
  } finally { delete globalThis.localStorage; }
});

test('the warning adapts to the record and does not invent poor performance', () => {
  assert.match(warningLines({}, false, {}).join(' '), /no completed five-session/);
  assert.match(warningLines({}, false, {}).join(' '), /timestamp evidence is unavailable/);
  const positive = { dates: ['x'], models: { a: { horizons: { 5: { sessions: 1, meanAdvantage: 2 } } } } };
  assert.match(warningLines(positive, false, {}).join(' '), /0 of 1 scored models lag/);
});

test('both commitments are on screen, and neither is claimed to prove the numbers', () => {
  const node = screen(component({ scModel: 'rerank' }));
  assert.match(text(node), new RegExp('ab'.repeat(32)));
  assert.match(text(node), new RegExp('cd'.repeat(32)));
  assert.match(text(node), /does not prove the forecast is accurate/);
});

test('a Home row for a model with no five explains why the workbench shows another', () => {
  const c = component({ scModel: 'flat', scFrom: 'flat' });
  assert.match(text(screen(c)), /Flat, says nothing has no five of its own to show/);
});

test('the questions are gone: no screen, no route, no picker, no saved-question store', async () => {
  const nav = await read('public/esthmr/navigation.js');
  assert.doesNotMatch(nav, /'questions'/);
  const logic = await read('public/esthmr/logic.js');
  assert.doesNotMatch(logic, /questionsScreen|'questions'|My questions|أسئلتي/);
  const template = await read('public/esthmr/template.html');
  assert.doesNotMatch(template, /isQuestions|questionsView/);
  const main = await read('public/esthmr/main.js');
  assert.doesNotMatch(main, /questions-store|qstore|_questions/);
  for (const gone of ['questions.js', 'questions-store.js', 'ask.js', 'rulebook.js']) {
    await assert.rejects(access(new URL(`public/esthmr/${gone}`, ROOT)), `${gone} is still published`);
  }
  for (const ar of [false, true]) {
    const node = screen(component({ scModel: 'kronos' }), data, ar);
    assert.doesNotMatch(text(node), ar ? /سؤال|أسئلة/ : /question/i);
    assert.equal(all(node).filter((n) => n.tag === 'select').length, 0);
  }
});

/* ── drawing ────────────────────────────────────────────────────────────── */

test('charts never write NaN or Infinity into a shape', () => {
  const nodes = [
    heroChart([{ basisSession: 'a', chosenReturn: 2, marketReturn: NaN }, { basisSession: 'b', chosenReturn: 1, marketReturn: 1 }, { basisSession: 'c', chosenReturn: 3, marketReturn: 0 }]),
    histogram([1, 2, NaN, Infinity, -3, 4, 5]),
    fanChart({ past: [NaN, -1, 0], ahead: { 5: { median: 2, p10: -1, p25: 0, p75: 3, p90: NaN } }, horizons: [1, 5, 20] }),
    reorderChart([{ from: 1, to: 2 }, { from: 2, to: 1 }, { from: 3, to: NaN }, { from: 4, to: 4 }]),
    nightsChart([{ basisSession: '2026-09-01', chosenReturn: 2, marketReturn: 1 }, { basisSession: '2026-09-02', chosenReturn: NaN, marketReturn: 1 }]),
    nightsChart([{ basisSession: '2026-09-01', chosenReturn: 0, marketReturn: 0 }]),
  ];
  for (const node of nodes) {
    assert.ok(node, 'a chart with usable data drew nothing');
    for (const n of all(node)) assert.doesNotMatch(JSON.stringify(n.attrs), /NaN|Infinity/);
  }
  assert.equal(heroChart([]), null);
  assert.equal(histogram([1]), null);
  assert.equal(fanChart({ past: [], ahead: {}, horizons: [5] }), null);
  assert.equal(nightsChart([]), null);
});

test('the nights chart draws each night on its own and colours it by the outcome', () => {
  const node = nightsChart([
    { basisSession: '2026-09-01', chosenReturn: 3, marketReturn: 1 },
    { basisSession: '2026-09-02', chosenReturn: -2, marketReturn: 1 },
  ]);
  const groups = all(node).filter((n) => n.tag === 'g');
  assert.deepEqual(groups.map((g) => g.attrs.class), ['is-ahead', 'is-behind']);
  // Never joined night to night: no path at all.
  assert.equal(all(node).filter((n) => n.tag === 'path').length, 0);
  assert.match(text(node), /2 Sep/);
});

test('one extreme estimate does not flatten the histogram', () => {
  const values = Array.from({ length: 100 }, (_, i) => (i % 10) - 5).concat([173]);
  const axis = byClass(histogram(values), 'aix-hist-axis')[0];
  assert.match(text(axis), /≥ \+4\.\d%/);
  assert.doesNotMatch(text(axis), /173/);
});

test('the next scheduled run is read from the cron lines', () => {
  // Thursday 17 Sep after 14:00 UTC: the next Sunday-to-Thursday slot is Sunday.
  assert.equal(nextRun(['0 14 * * 0-4'], new Date('2026-09-17T15:00:00Z')).toISOString(), '2026-09-20T14:00:00.000Z');
  assert.equal(nextRun(['0 14 * * 0-4', '0 17 * * 0-4'], new Date('2026-09-15T15:00:00Z')).toISOString(), '2026-09-15T17:00:00.000Z');
  assert.equal(nextRun(['*/5 * * * *']), null);
});

test('English and Arabic render with nothing undefined, and empty documents are safe', () => {
  const empty = { top5: { models: {} }, scenarios: { companies: {}, horizons: [5] }, picks: { models: {}, readings: {} }, readings: {} };
  for (const ar of [false, true]) {
    for (const d of [data, empty, { ...data, picks: undefined }, { ...data, scenarios: undefined }]) {
      const hero = aiCards(component(), d, ar);
      if (hero) assert.doesNotMatch(text(hero), /undefined|NaN|Infinity|\[object/);
      for (const model of ['rerank', 'kronos', 'momentum20', 'reversal1']) {
        for (const scHorizon of [1, 5, 20]) {
          const node = screen(component({ scModel: model, scHorizon }), d, ar);
          assert.doesNotMatch(text(node), /undefined|NaN|Infinity|\[object/);
        }
      }
    }
  }
  let retries = 0;
  const c = component();
  c.onRetryData = () => retries++;
  const node = screen(c, {});
  button(node, 'Retry loading').events.click();
  assert.equal(retries, 1);
  assert.equal(byClass(node, 'sc-skeleton').length, 1);
});

test('the demo carries a picks file in the published shape, so both halves show signed out', async () => {
  const { demo } = await import('../../public/esthmr/data.js');
  const d = demo();
  assert.ok(d.picks && d.picks.demo);
  const node = screen(component({ scModel: 'kronos' }), d);
  assert.equal(byClass(node, 'aix-pick').length, 5);
  assert.ok(tickersOf(byClass(node, 'aix-next')[0]).every((t) => /^DEMO\d\d$/.test(t)));
  assert.match(text(byClass(node, 'aix-sofar')[0]), /SCORED/);
  const rerank = screen(component({ scModel: 'rerank' }), d);
  assert.equal(byClass(rerank, 'aix-pick').length, 5);
});

test('the workbench and hero carry a dark theme, not a light rectangle on a dark page', async () => {
  const css = await read('public/esthmr/ai.css');
  assert.match(css, /\[data-theme="dark"\] \.aix-hero, \[data-theme="dark"\] \.aix-bench/);
  // Site-wide button rules (#app button { color: inherit }) must not win.
  assert.match(css, /#app \.aix-seg button\.on/);
  assert.match(css, /#app \.aix-pick \{/);
  assert.match(css, /#app \.aix-pick-chip\.is-said/);
  assert.match(css, /#app \.aix-hero h1 \{[^}]*font-size: var\(--aix-h1\) !important/);
  assert.match(css, /#app \.aix-bench h2\.aix-section \{[^}]*font-size: 15px !important/);
});

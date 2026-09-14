/* The AI hero and the scenario workbench, driven the way a reader drives them.
 *
 * The owner's two conditions for these screens are the spine of this file:
 * nothing on them is written into the code — every figure moves when the
 * record moves — and switching the evidence the re-rank reads shows a
 * different re-rank, not the same answer re-drawn.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { installDom } from './dom-stub.mjs';
import { aiCards, heroModel } from '../../public/esthmr/ai-cards.js';
import { heroChart, histogram, fanChart, nextRun, reorderChart } from '../../public/esthmr/ai-visuals.js';
import { companyPicker, savedRulePicker } from '../../public/esthmr/scenario-visuals.js';
import {
  scenariosScreen, universeFor, warningLines, ACCEPTED_KEY, readingKey, drawableModels,
  rerankView, returnsView, runScenario, standing, spearman, draftOf,
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
    _reader: 'reader@example.com', _questions: [],
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
    AAA: { ticker: 'AAA', close: 10, path: [-2, -1, 0], models: { kronos: { returns: { 1: 1, 5: 2, 20: 4 } }, drift: { returns: { 1: 0.5, 5: 1, 20: 2 } }, flat: { returns: { 1: 0, 5: 0, 20: 0 } }, momentum20: { returns: {}, rankedBy: { 5: 9 } } } },
    BBB: { ticker: 'BBB', close: 20, path: [1, 0.5, 0], models: { kronos: { returns: { 1: -1, 5: -3, 20: -6 } }, drift: { returns: { 1: 0.2, 5: 0.4, 20: 0.8 } }, flat: { returns: { 1: 0, 5: 0, 20: 0 } } } },
    CCC: { ticker: 'CCC', close: 30, path: [0, 0, 0], models: { kronos: { returns: { 1: 0.1, 5: 0.5, 20: 1 } }, drift: { returns: { 1: -0.1, 5: -0.2, 20: -0.4 } }, flat: { returns: { 1: 0, 5: 0, 20: 0 } } } },
  },
};
const readings = {
  models: { scores: { AAA: 10, BBB: 90, CCC: 50 }, count: 1, answered: 3, abstained: 0, note: 'the forecasts alone' },
  'filings-news-rulebook': { scores: { AAA: 80, BBB: 20, CCC: 50 }, count: 1, answered: 3, abstained: 0, note: 'the filings moved it' },
  'filings-news-rulebook-measures': { scores: { AAA: 70, BBB: 60, CCC: 10 }, count: 2, answered: 3, abstained: 0, note: 'the measurements moved it' },
};
const data = {
  top5: record(), scenarios, readings,
  companies: [{ ticker: 'AAA', name: { en: 'Alpha', ar: 'ألفا' } }, { ticker: 'BBB', name: { en: 'Beta', ar: 'بيتا' } }, { ticker: 'CCC', name: { en: 'Gamma', ar: 'جاما' } }],
};

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

test('a model row opens the workbench asking about that model', () => {
  const c = component({ scApplied: { model: 'drift' } });
  const node = aiCards(c, data, false);
  byClass(node, 'aix-model-row').find((r) => /Kronos/.test(text(r))).events.click();
  assert.equal(c.state.screen, 'scenarios');
  assert.equal(c.state.scModel, 'kronos');
  assert.equal(c.state.scFrom, 'kronos');
  assert.equal(c.state.scHorizon, 5);
  assert.equal(c.state.scApplied, null);
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

test('the model chips are the re-rank and the forecasters that publish a return', () => {
  // A ranking rule has no return to draw; a model that says the same about
  // every company has no scenario.
  assert.deepEqual(drawableModels(scenarios).map((m) => m.id), ['rerank', 'kronos', 'drift']);
  assert.deepEqual(drawableModels({ ...scenarios, rerank: null }).map((m) => m.id), ['kronos', 'drift']);
});

test('a reading key is spelled the way the lab seals it', () => {
  assert.equal(readingKey(['measures', 'filings'], LAYERS), 'filings-measures');
  assert.equal(readingKey(['rulebook', 'news', 'filings'], LAYERS), 'filings-news-rulebook');
  assert.equal(readingKey([], LAYERS), 'models');
  assert.equal(readingKey(['gossip'], LAYERS), 'models');
});

test('the switches start where the re-rank Home reports starts', () => {
  const draft = draftOf({}, scenarios);
  assert.equal(draft.model, 'rerank');
  assert.deepEqual(draft.layers, ['filings', 'news', 'rulebook']);
  assert.equal(draft.horizon, 5);
});

/* ── the workbench: switching the evidence changes the answer ───────────── */

test('switching on the measurements fetches a different sealed reading, and the answer changes', async () => {
  const asked = [];
  const c = component({ scModel: 'rerank' }, {
    loadReading: async (key) => { asked.push(key); return readings[key]; },
  });
  const withoutReadings = { ...data, readings: {} };
  await runScenario(c, withoutReadings, draftOf(c.state, scenarios));
  assert.deepEqual(asked.sort(), ['filings-news-rulebook', 'models']);
  let node = scenariosScreen(c, data, false).screen;
  assert.match(text(node), /the filings moved it/);
  assert.match(text(byClass(node, 'aix-tile')[0]), /1 \/ 3/);

  const on = button(node, 'Its own measurements');
  assert.equal(on.attrs['aria-checked'], 'false');
  on.events.click();
  assert.deepEqual(c.state.scLayers, ['filings', 'news', 'rulebook', 'measures']);
  node = scenariosScreen(c, data, false).screen;
  assert.match(text(node), /You changed the question/);
  assert.match(button(node, 'Run this scenario').attrs.class, /is-stale/);

  asked.length = 0;
  await runScenario(c, withoutReadings, draftOf(c.state, scenarios));
  assert.ok(asked.includes('filings-news-rulebook-measures'));
  node = scenariosScreen(c, data, false).screen;
  assert.match(text(node), /the measurements moved it/);
  assert.doesNotMatch(text(node), /the filings moved it/);
  assert.match(text(byClass(node, 'aix-tile')[0]), /2 \/ 3/);
  assert.doesNotMatch(text(node), /You changed the question/);
});

test('a combination that did not answer tonight says so and why', () => {
  const c = component({ scModel: 'rerank', scLayers: ['news'] });
  const node = scenariosScreen(c, data, false).screen;
  assert.match(text(node), /did not answer tonight: TimeoutError: vertex did not answer/);
});

test('a forecaster greys the switches out and says why', () => {
  const c = component({ scModel: 'kronos', scApplied: null });
  const node = scenariosScreen(c, data, false).screen;
  const toggles = byClass(node, 'aix-toggle');
  assert.equal(toggles.length, 4);
  assert.ok(toggles.every((t) => t.attrs.disabled === 'true'));
  assert.match(text(node), /Only the re-rank reads context/);
});

test('loading is shown only while a reading is on its way', async () => {
  const waiting = [];
  const c = component({ scModel: 'rerank' }, {
    loadReading: (key) => new Promise((resolve) => { waiting.push(() => resolve(readings[key])); }),
  });
  const pending = runScenario(c, { ...data, readings: {} }, draftOf(c.state, scenarios));
  assert.equal(c.state.scRunning, true);
  assert.equal(byClass(scenariosScreen(c, data, false).screen, 'aix-loading').length, 1);
  await flush();
  waiting.forEach((resolve) => resolve());
  await pending;
  assert.equal(c.state.scRunning, false);
  assert.equal(byClass(scenariosScreen(c, data, false).screen, 'aix-loading').length, 0);

  // A forecaster's answer is already here: nothing to wait for.
  const k = component({ scModel: 'kronos' });
  await runScenario(k, data, draftOf(k.state, scenarios));
  assert.equal(k.state.scRunning, false);
  assert.equal(k.state.scApplied.model, 'kronos');
});

test('there is no timer anywhere on the workbench', async () => {
  const src = await read('public/esthmr/scenarios.js') + await read('public/esthmr/scenario-visuals.js');
  assert.doesNotMatch(src, /setTimeout|setInterval|scStage/);
});

test('a reading that cannot be fetched says so instead of waiting forever', async () => {
  const c = component({ scModel: 'rerank' }, { loadReading: async () => { throw new Error('offline'); } });
  await runScenario(c, { ...data, readings: {} }, draftOf(c.state, scenarios));
  assert.equal(c.state.scRunning, false);
  const node = scenariosScreen(c, { ...data, readings: {} }, false).screen;
  assert.match(text(node), /could not be fetched: offline/);
});

/* ── the workbench: what the answer is made of ──────────────────────────── */

test('a forecaster’s answer covers every company, alphabetically, and counts agreement honestly', () => {
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

test('the gate comes before any figure, per reader, and can be brought back', () => {
  const saved = new Map();
  globalThis.localStorage = { getItem: (k) => saved.get(k), setItem: (k, v) => saved.set(k, v), removeItem: (k) => saved.delete(k) };
  try {
    const c = component({ scAcceptedReader: 'someone-else@example.com', scModel: 'kronos' });
    let node = scenariosScreen(c, data, false).screen;
    assert.equal(byClass(node, 'aix-tile').length, 0);
    assert.equal(all(node).filter((n) => n.tag === 'dialog').length, 1);
    all(node).find((n) => n.tag === 'dialog').events.cancel();
    assert.equal(c.state.screen, 'home');
    button(node, 'I understand').events.click();
    assert.equal(saved.get(ACCEPTED_KEY + c._reader), '1');
    c.state.scApplied = draftOf(c.state, scenarios);
    node = scenariosScreen(c, data, false).screen;
    assert.ok(byClass(node, 'aix-tile').length > 0);
    button(node, 'Show the warning again').events.click();
    assert.equal(byClass(scenariosScreen(c, data, false).screen, 'aix-tile').length, 0);
  } finally { delete globalThis.localStorage; }
});

test('the warning adapts to the record and does not invent poor performance', () => {
  assert.match(warningLines({}, false, {}).join(' '), /no completed five-session/);
  assert.match(warningLines({}, false, {}).join(' '), /timestamp evidence is unavailable/);
  const positive = { dates: ['x'], models: { a: { horizons: { 5: { sessions: 1, meanAdvantage: 2 } } } } };
  assert.match(warningLines(positive, false, {}).join(' '), /0 of 1 scored models lag/);
});

test('both commitments are on screen, and neither is claimed to prove the numbers', () => {
  const c = component({ scModel: 'rerank' });
  const node = scenariosScreen(c, data, false).screen;
  assert.match(text(node), new RegExp('ab'.repeat(32)));
  assert.match(text(node), new RegExp('cd'.repeat(32)));
  assert.match(text(node), /does not prove the forecast is accurate/);
});

test('a Home row for a ranking rule explains why the workbench shows another model', () => {
  const top5 = record();
  top5.models.momentum20 = { label: 'Momentum, 20 sessions', group: 'baseline', nights: 4, distinguishes: true, horizons: {} };
  const c = component({ scModel: 'momentum20', scFrom: 'momentum20' });
  const node = scenariosScreen(c, { ...data, top5 }, false).screen;
  assert.match(text(node), /Momentum, 20 sessions ranks companies without predicting a return/);
});

test('the pickers still choose, remove and apply saved questions', () => {
  const c = component({ scSubject: 'picked' });
  let node = companyPicker(c, data, scenarios, false);
  all(node).find((x) => x.tag === 'input').events.input({ target: { value: 'alpha' } });
  node = companyPicker(c, data, scenarios, false);
  assert.equal(byClass(node, 'sc-picker-list')[0].children.length, 1);
  button(node, 'AAA').events.click();
  assert.deepEqual(universeFor(c.state, scenarios).tickers, ['AAA']);
  node = companyPicker(c, data, scenarios, false);
  button(node, 'AAA ×').events.click();
  assert.deepEqual(universeFor(c.state, scenarios).tickers, []);
  c._questions = [{ id: 'one', name: 'Active volume', conditions: [] }];
  node = savedRulePicker(c, false);
  all(node).find((x) => x.tag === 'select').events.change({ target: { value: 'one' } });
  assert.equal(c.state.scRule.id, 'one');
});

/* ── drawing ────────────────────────────────────────────────────────────── */

test('charts never write NaN or Infinity into a shape', () => {
  const nodes = [
    heroChart([{ basisSession: 'a', chosenReturn: 2, marketReturn: NaN }, { basisSession: 'b', chosenReturn: 1, marketReturn: 1 }, { basisSession: 'c', chosenReturn: 3, marketReturn: 0 }]),
    histogram([1, 2, NaN, Infinity, -3, 4, 5]),
    fanChart({ past: [NaN, -1, 0], ahead: { 5: { median: 2, p10: -1, p25: 0, p75: 3, p90: NaN } }, horizons: [1, 5, 20] }),
    reorderChart([{ from: 1, to: 2 }, { from: 2, to: 1 }, { from: 3, to: NaN }, { from: 4, to: 4 }]),
  ];
  for (const node of nodes) {
    assert.ok(node, 'a chart with usable data drew nothing');
    for (const n of all(node)) assert.doesNotMatch(JSON.stringify(n.attrs), /NaN|Infinity/);
  }
  assert.equal(heroChart([]), null);
  assert.equal(histogram([1]), null);
  assert.equal(fanChart({ past: [], ahead: {}, horizons: [5] }), null);
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
  for (const ar of [false, true]) {
    for (const d of [data, { top5: { models: {} }, scenarios: { companies: {}, horizons: [5] }, readings: {} }]) {
      const hero = aiCards(component(), d, ar);
      if (hero) assert.doesNotMatch(text(hero), /undefined|NaN|Infinity|\[object/);
      for (const model of ['rerank', 'kronos']) {
        const c = component({ scModel: model });
        c.state.scApplied = draftOf(c.state, d.scenarios);
        const node = scenariosScreen(c, d, ar).screen;
        assert.doesNotMatch(text(node), /undefined|NaN|Infinity|\[object/);
      }
    }
  }
  let retries = 0;
  const c = component();
  c.onRetryData = () => retries++;
  const node = scenariosScreen(c, {}, false).screen;
  button(node, 'Retry loading').events.click();
  assert.equal(retries, 1);
  assert.equal(byClass(node, 'sc-skeleton').length, 1);
});

test('the workbench and hero carry a dark theme, not a light rectangle on a dark page', async () => {
  const css = await read('public/esthmr/ai.css');
  assert.match(css, /\[data-theme="dark"\] \.aix-hero, \[data-theme="dark"\] \.aix-bench/);
  // Site-wide button rules (#app button { color: inherit }) must not win.
  assert.match(css, /#app \.aix-seg button\.on/);
  assert.match(css, /#app \.aix-hero h1 \{[^}]*font-size: var\(--aix-h1\) !important/);
});

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
import { heroChart, histogram, fanChart, nextRun, reorderChart, nightsChart, recordRows } from '../../public/esthmr/ai-visuals.js';
import { saidParts, forecastPrices, returnsCards, quoteWhen } from '../../public/esthmr/scenario-visuals.js';
import { readingProblem, mixedSnapshot } from '../../public/esthmr/lab-snapshot.js';
import {
  scenariosScreen, warningLines, ACCEPTED_KEY, readingKey, baseModels, choiceOf, recordOf, nightsOf,
  rankingOf, returnsView, standing, spearman, saysOf, listed, pullOf, statusStrip,
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
for (const [key, reading] of Object.entries(readings)) Object.assign(reading, {key, basisSession:scenarios.basisSession});

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
const rowsOf = (node) => byClass(node, 'aix-rank-row');
const tickersOf = (node) => rowsOf(node).map((p) => text(all(p).find((x) => x.tag === 'b')).trim());
const GEMINI = ['filings', 'news', 'rulebook'];

test('cached readings from another run never appear beside current forecasts', () => {
  const stale = { ...readings['filings-news-rulebook'], basisSession: '2026-09-13' };
  assert.equal(readingProblem(stale, scenarios, 'filings-news-rulebook'), 'run');
  const node = screen(component({ scLayers: GEMINI }), { ...data, readings: { 'filings-news-rulebook': stale } });
  assert.equal(rowsOf(node).length, 0);
  assert.match(text(node), /another update or has invalid scores/);
});

test('reload revalidates both the public scorecard and the private saved forecasts', async () => {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init) => { calls.push({ url, init }); return new Response('{}', { status: 200 }); };
  try {
    const loader = await import('../../public/esthmr/data.js');
    await loader.top5();
    await loader.scenarios();
    await loader.picks();
    await loader.rerankReading('news');
    assert.equal(calls.length, 4);
    assert.ok(calls.every((c) => c.init.cache === 'no-cache' && c.init.credentials === 'same-origin'));
  } finally {
    globalThis.fetch = original;
  }
});

test('publication mismatch is refused rather than mixing historical and current data', () => {
  assert.equal(mixedSnapshot({ publicationId: 'a' }, { publicationId: 'b' }), true);
  assert.equal(mixedSnapshot({ publicationId: 'a' }, {}), true);
  assert.equal(mixedSnapshot({ publicationId: 'a' }, { publicationId: 'a' }), false);
  const node = screen(component(), { ...data, scenarios: { ...scenarios, publicationId: 'a' }, picks: { ...data.picks, publicationId: 'b' } });
  assert.match(text(node), /newer saved run is arriving/);
  assert.equal(rowsOf(node).length, 0);
  const demo = screen(component(), { ...data, demo: true, top5: { ...data.top5, publicationId: 'public-record' } });
  assert.ok(rowsOf(demo).length > 0, 'the labelled demo must not be blocked by the public record');
});

test('Gemini explanation matches the current reading, not an older note', () => {
  const node = screen(component({ scLayers: GEMINI }), { ...data, picks: { ...data.picks, readings: { ...data.picks.readings,
    'filings-news-rulebook': { ...data.picks.readings['filings-news-rulebook'], notes: { '2026-09-13': { note: 'old story' } } } } } });
  const said = text(byClass(node, 'aix-reason')[0]);
  assert.match(said, /In Gemini’s own words/);
  assert.match(said, /the filings moved it/);
  assert.doesNotMatch(said, /old story/);
  assert.match(said, /not a checked reason for any one company/);
});

test('alphabetical tie breaking does not masquerade as Gemini rank movement', () => {
  const tied = { ...readings['filings-news-rulebook'], scores: { AAA: 50, BBB: 50, CCC: 50 } };
  const node = screen(component({ scLayers: GEMINI }), { ...data, readings: { 'filings-news-rulebook': tied } });
  assert.ok(rowsOf(node).every((row) => !/[▲▼]/.test(text(row))));
  assert.match(text(node), /Equal scores are ordered by ticker/);
});

/* ── Home: the card at the top ──────────────────────────────────────────── */

test('the card carries the system’s record, and every figure on it comes from the record', () => {
  const node = aiCards(component(), data, false);
  const system = byClass(node, 'aix-system')[0];
  assert.match(text(system), /THE SYSTEM’S FIVE · FIVE SESSIONS/);
  assert.match(text(system), /\+3\.50%/);
  assert.match(text(system), /\+1\.00% for the market/);
  assert.match(text(system), /ahead on 3 of 4/);
  // Moved in the record, moved on the screen: nothing here is a constant.
  const moved = record();
  moved.models.rerank.horizons[5].meanReturn = -7.25;
  moved.latest.forecasters = 6;
  const again = aiCards(component(), { ...data, top5: moved }, false);
  assert.match(text(byClass(again, 'aix-system')[0]), /-7\.25%/);
  assert.match(text(again), /Six public models rank every listed company/);
  assert.doesNotMatch(text(again), /Nine/);
});

test('the card is one card: three saved facts, no model list and no window chips', () => {
  /* The redesign's card. It replaced a hero with a headline, a three-step
     explainer and a separate record panel; what it must not grow back into
     is the workbench, which is a screen of its own behind a warning. */
  const node = aiCards(component(), data, false);
  const lab = byClass(node, 'aix-lab')[0];
  assert.ok(lab, 'the card is missing');
  assert.match(text(lab), /The model lab/);
  assert.equal(byClass(node, 'aix-model-row').length, 0);
  assert.equal(byClass(node, 'aix-seg').length, 0);
  assert.equal(byClass(node, 'aix-pipeline').length, 0, 'the explainer came back');
  assert.ok(byClass(node, 'aix-fact').length <= 3, 'the card grew a fourth fact');
  // The market here is every company scored, equally weighted — never named
  // as an index it is not.
  assert.doesNotMatch(text(node), /EGX 30/);
  assert.match(text(node), /not an index/);
  assert.doesNotMatch(text(node), /question/i);
});

test('the card says it is a saved record, and that this publisher neither holds nor advises', () => {
  /* It names companies now. What keeps that the right side of the line is
     this sentence, so it is asserted rather than left to a reviewer's eye. */
  const node = aiCards(component(), data, false);
  const lead = text(byClass(node, 'aix-lab-lead')[0]);
  assert.match(lead, /saved record/, 'the card does not say the record is saved');
  assert.match(lead, /run no new calculation/, 'it reads as if a model runs when the page opens');
  assert.match(lead, /hold nothing/);
  assert.match(lead, /advise nothing/);
  const ar = text(byClass(aiCards(component(), data, true), 'aix-lab-lead')[0]);
  // «نوصي» is on the Arabic §8 list (arabic-directive.test.mjs); the denial
  // says the same thing without the word, as the English one says "advise".
  assert.match(ar, /لا نملك شيئاً ولا نُقدّم نصيحة/, 'the Arabic card drops the disclaimer');
});

/* The system's card below the record's minimum, the way 15 Sep 2026 had it:
 * one night read, none scored, a minimum of five. */
function waitingRecord(waiting, { sessions = 0, minimum = 5 } = {}) {
  const pending = record({ minimumSessions: minimum });
  Object.assign(pending.models.rerank.horizons[5], { sessions, waiting });
  return pending;
}
const systemOf = (top5, ar = false) => byClass(aiCards(component(), { ...data, top5 }, ar), 'aix-system')[0];
const fillRows = (card) => byClass(card, 'aix-fill-row');
const squares = (row, cls) => all(row).filter((n) => n.tag === 'i' && (cls === undefined || (n.attrs.class || '') === cls));

test('below the record’s minimum the system counts nights, and draws the sessions each is held', () => {
  const card = systemOf(waitingRecord([{ basisSession: '2026-09-14', sessionsClosed: 0 }]));
  /* The count still has to be on the card — a reader is entitled to know how
     far along the evaluation is. What changed is where it sits: the headline
     is the review's wording and the tally is in the line under it, which is
     the difference between "this model scored 0" and "no night has aged far
     enough to mark yet". */
  assert.match(text(card), /First evaluation pending/);
  assert.match(text(card), /0 of 5 nights read/);
  assert.match(text(card), /after 9 sessions completed/);
  assert.match(text(card), /the first in 5 sessions/);
  // Never the word that also names the window: that was the confusion.
  assert.doesNotMatch(text(card), /sessions scored|\d\/\d/);
  assert.doesNotMatch(text(card), /\+3\.50%/);
  assert.equal(all(card).filter((n) => n.tag === 'svg').length, 0, 'no line before there is a record');
  // Five nights still needed: the one it read, and four it has yet to read.
  const rows = fillRows(card);
  assert.equal(rows.length, 5);
  assert.deepEqual(rows.map((r) => /is-read/.test(r.attrs.class)), [true, false, false, false, false]);
  assert.match(text(rows[0]), /14 Sep/);
  assert.equal(text(rows[1]).trim(), '');
  for (const row of rows) assert.equal(squares(row).length, 5, 'five squares: the five sessions it is held');
  assert.equal(rows.flatMap((r) => squares(r, 'is-closed')).length, 0);
  // Night k of the staircase starts k sessions later: 1–5, 2–6, … 5–9.
  assert.deepEqual(rows.map((r) => squares(r)[0].attrs.style), ['grid-column:1', 'grid-column:2', 'grid-column:3', 'grid-column:4', 'grid-column:5']);
  assert.match(byClass(card, 'aix-fill')[0].attrs.style, /--cols:9;--now:0/);
  assert.match(text(card), /average in 9 sessions at the earliest/);
  assert.match(text(card), /dashed rows are nights still to read/);
});

test('the next night moves the first result closer and fills a square', () => {
  const card = systemOf(waitingRecord([
    { basisSession: '2026-09-15', sessionsClosed: 0 }, { basisSession: '2026-09-14', sessionsClosed: 1 },
  ]));
  assert.match(text(card), /the first in 4 sessions/);
  const rows = fillRows(card);
  assert.deepEqual(rows.map((r) => text(byClass(r, 'aix-fill-label')[0]).trim()), ['14 Sep', '15 Sep', '', '', '']);
  assert.deepEqual(rows.map((r) => squares(r, 'is-closed').length), [1, 0, 0, 0, 0]);
  assert.match(byClass(card, 'aix-fill')[0].attrs.style, /--cols:9;--now:1/);
  assert.match(text(card), /average in 8 sessions at the earliest/);
});

test('with some nights scored it counts them, and only the nights still needed are drawn', () => {
  const card = systemOf(waitingRecord([
    { basisSession: '2026-09-10', sessionsClosed: 3 }, { basisSession: '2026-09-13', sessionsClosed: 1 },
  ], { sessions: 2, minimum: 3 }));
  assert.match(text(card), /2 of 3/);
  assert.match(text(card), /the next in 2 sessions/);
  const rows = fillRows(card);
  assert.equal(rows.length, 1, 'the one night still needed is the oldest it read');
  assert.equal(squares(rows[0], 'is-closed').length, 3);
  assert.match(text(card), /average in 2 sessions at the earliest/);
  assert.doesNotMatch(text(card), /dashed rows/);
  // Nights missed cannot be read afterwards: the next one starts no earlier than now.
  assert.deepEqual(recordRows([{ basisSession: '2026-09-10', sessionsClosed: 2 }], 3, 5).map((r) => r.start), [-2, 0, 1]);
  assert.deepEqual(recordRows([], 2, 5).map((r) => [r.start, r.read]), [[0, false], [1, false]]);
});

test('in Arabic the counts agree with their nouns and read the right way round', () => {
  const card = systemOf(waitingRecord([{ basisSession: '2026-09-14', sessionsClosed: 0 }]), true);
  const value = byClass(card, 'aix-system-value')[0];
  /* The headline is a sentence now, so there is no bare "0 من 5" for a
     right-to-left run to reverse into "five of none". The count keeps its
     Arabic agreement in the supporting line, which is what this test is for. */
  assert.equal(text(value).trim(), 'التقييم الأول لم يبدأ بعد');
  assert.match(text(card), /0 من 5 ليالٍ مقروءة/);
  assert.match(text(card), /الأولى بعد 5 جلسات/);
  assert.match(text(card), /المتوسط بعد 9 جلسات على الأقل/);
  assert.match(text(card), /14 سبتمبر/);
  assert.doesNotMatch(text(card), /undefined|NaN/);
});

test('a record published before the waiting nights were keeps the count and draws nothing it cannot place', () => {
  const card = systemOf(waitingRecord(undefined));
  assert.match(text(card), /0 of 5/);
  assert.equal(fillRows(card).length, 0);
  assert.match(text(card), /No average until five nights are scored — a missing result is not a zero/);
});

test('a model that tells no companies apart is left off the list', () => {
  const m = heroModel(record(), '5');
  assert.deepEqual(m.rows.map((r) => r.id), ['rerank', 'kronos', 'chronos2']);
  assert.equal(m.pendingCount, 1);
});

test('both ways in open the workbench, and one lands on what the picks returned', () => {
  const c = component({ scSearch: 'old search', scShowAll: true });
  const node = aiCards(c, data, false);
  /* §10: "The label 'Run a model' should become 'Explore model results' where
     the operation reads a precomputed document." There was no "Run a model"
     left to rename, but this one had the same defect in a quieter form —
     "See the model's results" still reads as a thing about to be produced.
     Nothing is produced: the document was sealed days ago. */
  button(node, 'Explore model results').events.click();
  assert.equal(c.state.screen, 'scenarios');
  // On a model's own ranking, with Gemini one switch away.
  assert.deepEqual(c.state.scLayers, []);
  assert.equal(c.state.scHorizon, 5);
  assert.equal(c.state.scSearch, '');
  assert.equal(c.state.scShowAll, false);
  assert.equal(c.state.scFocus, null);
  const d = component();
  button(aiCards(d, data, false), 'What came back?').events.click();
  assert.equal(d.state.screen, 'scenarios');
  assert.equal(d.state.scFocus, 'past');
});

test('the beta pill opens the warning, and accepting it opens the workbench', () => {
  const saved = new Map();
  globalThis.localStorage = { getItem: (k) => saved.get(k), setItem: (k, v) => saved.set(k, v), removeItem: (k) => saved.delete(k) };
  try {
    const c = component({ scAccepted: 0 });
    let node = aiCards(c, data, false);
    byClass(node, 'aix-preview-pill')[0].events.click();
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

test('the model chips are every model that ranks, and Gemini is not one of them', () => {
  // Gemini is what the context switches turn on over the chosen model. A
  // model that says the same about every company ranks nothing.
  assert.deepEqual(baseModels(data.picks, scenarios).map((m) => m.id), ['kronos', 'momentum20', 'reversal1', 'drift']);
  assert.deepEqual(baseModels(null, scenarios).map((m) => m.id), ['kronos', 'drift', 'momentum20']);
});

test('a reading key is spelled the way the lab seals it', () => {
  assert.equal(readingKey(['measures', 'filings'], LAYERS), 'filings-measures');
  assert.equal(readingKey(['rulebook', 'news', 'filings'], LAYERS), 'filings-news-rulebook');
  assert.equal(readingKey([], LAYERS), 'models');
  assert.equal(readingKey(['gossip'], LAYERS), 'models');
});

test('the workbench opens on a model’s own ranking, and there is nothing to run', async () => {
  const choice = choiceOf({}, data.picks, scenarios);
  assert.equal(choice.model, 'kronos');
  assert.equal(choice.gemini, false);
  assert.deepEqual(choice.layers, []);
  assert.equal(choice.horizon, 5);
  // An older link that asked for the re-rank as a model opens on Gemini.
  const legacy = choiceOf({ scModel: 'rerank' }, data.picks, scenarios);
  assert.equal(legacy.gemini, true);
  assert.deepEqual(legacy.layers, GEMINI);
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

test('the controls are a model, a horizon and the re-rank’s context, and ask no question', () => {
  const node = screen(component({ scModel: 'kronos' }));
  const steps = byClass(node, 'aix-step').map((n) => text(n).replace(/\s+/g, ' ').trim());
  /* THE NUMBERS ARE GONE, AND THAT IS THE POINT OF §10.
     They were right when the controls came first: three things to do, in
     order. But numbered steps are a form, and a form tells a reader the page
     cannot answer until they fill it in. Nothing here is computed on demand —
     every figure is read from a record sealed days ago, with a model and a
     window already chosen. So the answer comes first and these become what
     they are: a way to change an answer already on screen.
     The words still matter as much as the count. "Horizon" and "context the
     re-rank reads" are this project's vocabulary, not a reader's. */
  assert.deepEqual(steps, ['The model', 'The time window', 'What Gemini reads']);
  assert.ok(button(node, 'next session'));
  // The switches work over every model: they are how Gemini is turned on.
  const toggles = byClass(node, 'aix-toggle');
  assert.equal(toggles.length, 4);
  assert.ok(toggles.every((x) => x.attrs.disabled !== 'true'));
  assert.match(text(node), /Switch any of these on to see the ranking after Gemini re-reads/);
});

/* ── the workbench: the future ──────────────────────────────────────────── */

test('the results sit under two rules: the future first, then past runs', () => {
  const node = screen(component({ scModel: 'kronos' }));
  const results = byClass(node, 'aix-results')[0].children.filter(Boolean);
  const classes = results.map((n) => String(n.attrs?.class || '').split(' '));
  const at = (c) => classes.findIndex((x) => x.includes(c));
  const future = results.findIndex((n) => n.attrs?.id === 'aix-future');
  const past = results.findIndex((n) => n.attrs?.id === 'aix-past');
  assert.ok(future >= 0 && past > future, 'a rule is missing or out of order');
  assert.match(text(results[future]), /FUTURE · NOT SCORED YET/);
  assert.match(text(results[future]), /computed after the close of 14 Sep 2026/);
  assert.match(text(results[past]), /PAST RUNS · ALREADY SCORED/);
  for (const c of ['aix-view', 'aix-tiles', 'aix-ranking-card', 'aix-fan-card', 'aix-pair']) {
    const i = at(c);
    assert.ok(i > future && i < past, `${c} is not under the future rule`);
  }
  for (const c of ['aix-record-card', 'aix-nights-card', 'aix-models']) {
    assert.ok(at(c) > past, `${c} is not under past runs`);
  }
});

test('a model’s ranking is every company, highest first, with what it expects', () => {
  const node = screen(component({ scModel: 'kronos' }));
  const card = byClass(node, 'aix-ranking-card')[0];
  assert.match(text(card), /Ranked by Kronos-small/);
  assert.match(text(card), /not a recommendation/);
  // Kronos at five sessions: AAA +2, CCC +0.5, BBB -3.
  assert.deepEqual(tickersOf(card), ['AAA', 'CCC', 'BBB']);
  const rows = rowsOf(card);
  assert.match(text(rows[0]), /1.*AAA.*\+2\.00%.*1 of 1 agree/s);
  assert.match(text(rows[2]), /3.*BBB.*-3\.00%/s);
  assert.match(text(card), /EXPECTS · 5 SESSIONS/i);
  const tiles = byClass(node, 'aix-tile').map(text);
  assert.match(tiles[0], /TOP 5 · EXPECTED.*-0\.17%/s);
  assert.match(tiles[2], /COMPANIES RANKED.*3/s);
  // Moved in the document, moved on the screen.
  const moved = JSON.parse(JSON.stringify(scenarios));
  moved.companies.BBB.models.kronos.returns[5] = 9;
  assert.deepEqual(tickersOf(byClass(screen(component({ scModel: 'kronos' }), { ...data, scenarios: moved }), 'aix-ranking-card')[0]), ['BBB', 'AAA', 'CCC']);
});

test('a tie is settled by ticker, as the record settles it, and marked', () => {
  const tied = JSON.parse(JSON.stringify(scenarios));
  tied.companies.CCC.models.kronos.returns[5] = 2;
  const { rows } = rankingOf(tied, { model: 'kronos', horizon: 5, gemini: false }, null);
  assert.deepEqual(rows.map((r) => r.ticker), ['AAA', 'CCC', 'BBB']);
  assert.equal(rows[1].tied, true);
  assert.equal(rows[0].tied, false);
});

test('an instrument with no exchange ticker is never ranked', () => {
  assert.equal(listed('EGS659O1C015'), false);
  assert.equal(listed('EGS30AJ1C016-EGP'), false);
  assert.equal(listed('EGSA'), true);
  const withIsin = JSON.parse(JSON.stringify(scenarios));
  withIsin.companies.EGS659O1C015 = { ticker: 'EGS659O1C015', models: { kronos: { returns: { 5: 173.26 } } } };
  const node = screen(component({ scModel: 'kronos' }), { ...data, scenarios: withIsin });
  assert.doesNotMatch(text(node), /EGS659O1C015/);
  assert.deepEqual(tickersOf(byClass(node, 'aix-ranking-card')[0]), ['AAA', 'CCC', 'BBB']);
});

test('companies left out of the run are counted beside the ranking', () => {
  const withLeft = { ...scenarios, leftOut: { SUCE: 'no close for 98 days, 2026-06-03 to 2026-09-09', EGS659O1C015: 'no exchange ticker' } };
  const node = screen(component({ scModel: 'kronos' }), { ...data, scenarios: withLeft });
  const tiles = byClass(node, 'aix-tile').map(text);
  assert.match(tiles[2], /2 left out of the current view: known OTC\/delisted names, no exchange ticker, or broken price histories/);
  assert.doesNotMatch(text(byClass(node, 'aix-ranking-card')[0]), /SUCE/);
});

test('once the night is scored, a company that did not trade is marked and the line falls under the five scored', () => {
  // 15 Sep 2026, after the close: the 14 Sep night scored at one session, and
  // Kronos's WATP and GRCA had no close, so its record scored ranks 2, 4, 5, 6, 7.
  const tickers = ['ANA', 'BET', 'CAM', 'DEL', 'ECH', 'FOX', 'GOL', 'HOT'];
  const wide = { ...scenarios, companies: Object.fromEntries(tickers.map((t, i) => [t,
    { ticker: t, close: 10, path: [0, 0, 0], models: { kronos: { returns: { 1: 8 - i, 5: 8 - i, 20: 8 - i } } } }])) };
  const night = { ...scored(wide.basisSession, ['ANA', 'CAM', 'ECH', 'FOX', 'GOL'], [8, 6, 4, 3, 2], [1, 1, 1, 1, 1], 0.5),
    skipped: ['BET', 'DEL'] };
  const picks = picksFile();
  picks.models.kronos.horizons[5].nights = [night];
  const card = byClass(screen(component({ scModel: 'kronos', scHorizon: 5 }), { ...data, scenarios: wide, picks }), 'aix-ranking-card')[0];
  const rows = rowsOf(card);
  assert.deepEqual(tickersOf(card).slice(0, 8), tickers);
  assert.deepEqual(rows.filter((r) => /\bis-top\b/.test(r.attrs.class)).map((r) => text(all(r).find((x) => x.tag === 'b')).trim()),
    ['ANA', 'CAM', 'ECH', 'FOX', 'GOL']);
  assert.deepEqual(rows.filter((r) => /did not trade/.test(text(r))).map((r) => text(all(r).find((x) => x.tag === 'b')).trim()), ['BET', 'DEL']);
  // The line sits under GOL, the last of the five scored, not under rank 5.
  const list = byClass(card, 'aix-rank-list')[0].children;
  const cut = list.findIndex((n) => /\baix-rank-cut\b/.test(n.attrs?.class || ''));
  assert.match(text(list[cut - 1]), /GOL/);
  assert.match(text(list[cut]), /the five its record scored\. BET and DEL did not trade through the 5 sessions, so the next one down took each place/);
  // Before the window closes nobody has been passed over: the first five, as before.
  const open = screen(component({ scModel: 'kronos', scHorizon: 5 }), { ...data, scenarios: wide, picks: picksFile() });
  assert.deepEqual(rowsOf(byClass(open, 'aix-ranking-card')[0]).filter((r) => /\bis-top\b/.test(r.attrs.class)).length, 5);
  assert.doesNotMatch(text(open), /did not trade/);
});

test('a ranking baseline ranks by the move it saw, never a forecast', () => {
  const card = byClass(screen(component({ scModel: 'momentum20' })), 'aix-ranking-card')[0];
  assert.deepEqual(tickersOf(card), ['AAA', 'BBB']);
  assert.match(text(card), /MOVE · LAST 20 SESSIONS/i);
  assert.match(text(rowsOf(card)[0]), /\+9\.00%/);
  assert.doesNotMatch(text(card), /Expects/);
  // The line under its title says the same as the column: a move already made.
  assert.match(text(card), /Ranked by a move that has already happened — this rule makes no forecast/);
  assert.doesNotMatch(text(card), /forecasts, highest first|not realised returns/);
  // Reversal ranks by the fall, stored with its sign turned over; the figure
  // printed is the fall itself.
  assert.deepEqual(saidParts({ kind: 'reversal', sessions: 1 }, 7.25, false).figure, '-7.25%');
});

test('switching Gemini on shows its ranking in the same table, with where the model had each company', () => {
  const c = component({ scModel: 'kronos' });
  let node = screen(c);
  // One press on the second step: Gemini's ranking, with the reading Home reports.
  assert.equal(button(node, 'Re-ranked by Gemini').attrs['aria-pressed'], 'false');
  button(node, 'Re-ranked by Gemini').events.click();
  assert.deepEqual(c.state.scLayers, GEMINI);
  node = screen(c);
  button(node, 'Its own measurements').events.click();
  assert.deepEqual(c.state.scLayers, LAYERS);
  node = screen(c);
  const card = byClass(node, 'aix-ranking-card')[0];
  assert.match(text(card), /Ranked after Gemini re-reads Kronos-small and the other models/);
  // The measurements reading: AAA 70, BBB 60, CCC 10. Kronos had AAA, CCC, BBB.
  assert.deepEqual(tickersOf(card), ['AAA', 'BBB', 'CCC']);
  const rows = rowsOf(card);
  assert.match(text(rows[0]), /70\/100.*#1/s);
  assert.match(text(rows[1]), /60\/100.*#3.*▲1.*-3\.00%/s);
  assert.match(text(rows[2]), /10\/100.*#2.*▼1/s);
  assert.match(text(card), /the measurements moved it/);
  const tiles = byClass(node, 'aix-tile').map(text);
  assert.match(tiles[0], /TOP 5 · Kronos-small EXPECTS.*-0\.17%/s);
  assert.match(tiles[1], /NEW TO THE TOP 5.*0 \/ 3/s);
  assert.match(tiles[2], /GEMINI KEPT.*2.*companies it said were worth anything, of the 3 it scored/s);
  const gemini = button(node, 'Re-ranked by Gemini');
  assert.match(gemini.attrs.class, /\bon\b/);
  assert.equal(gemini.attrs['aria-pressed'], 'true');
  // Pressed again while on, it keeps the reading the switches chose.
  gemini.events.click();
  assert.deepEqual(c.state.scLayers, LAYERS);
  assert.match(text(node), /not a percentage return or a probability/);
  assert.match(text(node), /Gemini ranks for the next five sessions\. Choosing 5 sessions changes Kronos-small’s forecasts/);
  // One press on the first step: back to the model's own ranking.
  button(screen(c), 'Ranked by Kronos-small').events.click();
  assert.deepEqual(c.state.scLayers, []);
  assert.match(text(byClass(screen(c), 'aix-ranking-card')[0]), /Ranked by Kronos-small/);
  // The switches still turn it on one reading at a time.
  for (const name of ['Latest filings', 'News flow', 'The rule book']) button(screen(c), name).events.click();
  assert.deepEqual(c.state.scLayers, GEMINI);
  // Nothing to press into on a night no re-rank was published.
  const unread = screen(component({ scModel: 'kronos' }),
    { ...data, scenarios: { ...scenarios, rerank: null }, picks: { ...data.picks, readings: {} } });
  assert.equal(button(unread, 'Re-ranked by Gemini').attrs.disabled, 'true');
  assert.notEqual(button(unread, 'Ranked by Kronos-small').attrs.disabled, 'true');
});

test('Gemini’s ranking is fetched when it is switched on, and a failure says so', async () => {
  const asked = [];
  const c = component({ scModel: 'kronos', scLayers: GEMINI }, {
    loadReading: async (key) => { asked.push(key); throw new Error('offline'); },
  });
  const bare = { ...data, readings: {} };
  screen(c, bare);
  await flush(); await flush();
  assert.deepEqual(asked, ['filings-news-rulebook']);
  const node = screen(c, bare);
  assert.match(text(node), /Gemini’s ranking could not be fetched/);
  assert.match(text(node), /offline/);
  button(node, 'Try again').events.click();
  assert.equal(c.state.scFailed['filings-news-rulebook'], undefined);
});

test('a combination that did not answer that night says so and why', () => {
  const c = component({ scModel: 'kronos', scLayers: ['news'] });
  assert.match(text(screen(c)), /did not answer that night: TimeoutError: vertex did not answer/);
});

test('search finds a company and keeps its place in the ranking', () => {
  const c = component({ scModel: 'kronos' });
  const card = byClass(screen(c), 'aix-ranking-card')[0];
  all(card).find((x) => x.tag === 'input').events.input({ target: { value: 'beta' } });
  const found = rowsOf(byClass(screen(c), 'aix-ranking-card')[0]);
  assert.equal(found.length, 1);
  assert.match(text(found[0]), /3.*BBB/s);
});

test('a forecaster’s view of the whole market counts agreement honestly', () => {
  const view = returnsView(scenarios, { model: 'kronos', horizon: 5 }, ['AAA', 'BBB', 'CCC']);
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

test('the company outlook graph actually changes for 1, 5 and 20 sessions', () => {
  const paths = [];
  for (const horizon of [1, 5, 20]) {
    const view = returnsView(scenarios, { model: 'kronos', horizon }, ['AAA', 'BBB', 'CCC']);
    assert.equal(Math.max(...view.horizons), horizon);
    assert.equal(Math.max(...Object.keys(view.ahead).map(Number)), horizon);
    const chart = fanChart(view);
    paths.push(byClass(chart, 'aix-median')[0].attrs.d);
    const card = returnsCards(component(), {}, view, {model: 'Kronos', horizon: `${horizon} sessions`}, false)[0];
    assert.match(text(card), /Not an EGX index forecast/);
    assert.match(text(card), new RegExp(`${horizon} sessions`));
  }
  assert.equal(new Set(paths).size, 3);
});

test('a forecast that is mostly each company going back to its average says so, for that model and window only', () => {
  const d = structuredClone(data);
  // 16 Sep 2026 as published: Kronos-small's 20-session forecasts correlated
  // 0.95 with the move back to each company's 90-session average.
  d.scenarios.pull = { sessions: 90, companies: 239, above: 183, medianMove: -8.69, noteFrom: 0.8,
    models: { kronos: { 1: 0.27, 5: 0.48, 20: 0.95 }, drift: { 20: -0.82 } } };
  for (const layers of [[], GEMINI]) {
    for (const ar of [false, true]) {
      const node = screen(component({ scModel: 'kronos', scHorizon: 20, scLayers: layers }), d, ar);
      const notes = byClass(node, 'aix-pull-note');
      assert.equal(notes.length, 1);
      assert.match(text(notes[0]), /0\.95/);
      assert.match(text(notes[0]), /-8\.69%/);
      assert.match(text(notes[0]), ar ? /90 جلسة/ : /last 90 sessions/);
      assert.match(text(notes[0]), ar ? /239 شركة/ : /239 companies/);
      assert.match(text(byClass(node, 'aix-pull-compare')[0]), /-8\.69%/);
      assert.doesNotMatch(text(node), /undefined|NaN/);
    }
  }
  // Not where the figure is low, not for a drift that carries every trend on
  // (it correlates the other way), and not on a night published without it.
  for (const state of [{ scModel: 'kronos', scHorizon: 5 }, { scModel: 'kronos', scHorizon: 1 }, { scModel: 'drift', scHorizon: 20 }]) {
    const node = screen(component(state), d);
    assert.equal(byClass(node, 'aix-pull-note').length, 0, JSON.stringify(state));
    assert.equal(byClass(node, 'aix-pull-compare').length, 0, JSON.stringify(state));
  }
  const before = screen(component({ scModel: 'kronos', scHorizon: 20 }));
  assert.equal(byClass(before, 'aix-pull-note').length, 0);
  assert.equal(pullOf(scenarios, 'kronos', 20), null);
  assert.deepEqual(pullOf(d.scenarios, 'kronos', 20), { r: 0.95, sessions: 90, companies: 239, median: -8.69 });
});

test('forecast prices use a frozen basis, with true path low high and mean', () => {
  const company = {close: 200, latestClose: 300, models: {kronos: {
    basisClose: 100, pricePath: [101, 99, 102, 104, 103], returns: {'1': 1, '5': 3},
  }}};
  const five = forecastPrices(company, 'kronos', 5);
  assert.equal(five.basis, 100);
  assert.equal(five.point, 103);
  assert.equal(five.low, 99);
  assert.equal(five.high, 104);
  assert.equal(five.average, 101.8);
  assert.equal(forecastPrices(company, 'kronos', 1).average, 101);
  assert.equal(forecastPrices(company, 'kronos', 20).average, null);
  assert.equal(forecastPrices(scenarios.companies.AAA, 'kronos', 5).average, null);
  assert.equal(forecastPrices(scenarios.companies.AAA, 'momentum20', 5).point, null);
});

test('OTC names are hidden from raw and Gemini current rankings, even with old cached files', () => {
  const directory = [{ticker: 'AAA', listing: {status: 'delisted', market: 'OTC'}}];
  for (const gemini of [false, true]) {
    const rank = rankingOf(scenarios, {model: 'kronos', horizon: 5, gemini},
      {scores: {AAA: 100, BBB: 20, UNKNOWN: 100}}, directory);
    assert.ok(!rank.rows.some((r) => r.ticker === 'AAA' || r.ticker === 'UNKNOWN'));
  }
});

test('price cards show dated current quotes, frozen targets and bilingual risk warnings', () => {
  const d = structuredClone(data);
  Object.assign(d.companies[0], {close: 12, quoteAsOf: '2026-09-17T10:00:00Z'});
  d.scenarios.companies.AAA.models.kronos.pricePath = [10.1, 9.9, 10.2, 10.4, 10.3];
  d.scenarios.companies.AAA.models.kronos.basisClose = 10;
  d.scenarios.companies.AAA.models.kronos.note = 'adapter v2';
  d.scenarios.companies.AAA.risk = {flags: ['financial recency unverified'],
    flagsAr: ['حداثة القوائم غير موثّقة'], events: [{id: 291659, date: '2026-07-20'}]};
  for (const layers of [[], GEMINI]) {
    const c = component({scModel: 'kronos', scHorizon: 5, scLayers: layers});
    for (const ar of [false, true]) {
      const node = screen(c, d, ar);
      const prices = byClass(node, 'aix-price-detail')[0];
      assert.match(text(prices), /12\.00/);
      assert.match(text(prices), /9\.90/);
      assert.match(text(prices), /10\.40/);
      assert.match(text(prices), /10\.20/); // Frozen 2% endpoint, not 2% of today's 12.
      // The feed's UTC stamp, read on a Cairo clock.
      assert.match(text(prices), ar ? /17 .* 2026 · 13:00 بتوقيت القاهرة/ : /17 Sep 2026 · 13:00 Cairo/);
      assert.doesNotMatch(text(prices), /2026-09-17T10:00:00Z/);
      assert.match(text(node), /291659/);
      assert.doesNotMatch(text(node), /undefined|NaN|Infinity/);
    }
  }
});

test('a night saved without daily paths says so instead of printing three dashes', () => {
  // Every run sealed before 17 Sep 2026 kept three endpoint returns and no
  // path. The owner read the dashes that stood for low, average and high as
  // the numbers failing to load.
  const d = structuredClone(data);
  Object.assign(d.companies[0], {close: 12, quoteAsOf: '2026-09-17T10:00:00Z'});
  d.scenarios.companies.AAA.close = 10;
  delete d.scenarios.companies.AAA.models.kronos.pricePath;
  for (const ar of [false, true]) {
    const node = screen(component({scModel: 'kronos', scHorizon: 5}), d, ar);
    const words = text(byClass(node, 'aix-price-detail')[0]);
    assert.match(words, /12\.00/, 'the current price is there');
    assert.match(words, /10\.20/, 'the end of the window is there');
    assert.doesNotMatch(words, ar ? /أدنى توقع|أعلى توقع/ : /Predicted low|Predicted high/);
    assert.doesNotMatch(words, /—\s*—/);
    // Said once, above the ranking, not under every company.
    const notes = byClass(node, 'aix-note').map(text).filter((n) => (ar ? /المسار اليومي/ : /daily path/).test(n));
    assert.equal(notes.length, 1);
  }
  // No close on the night: the strip says the starting price is not in the file.
  delete d.scenarios.companies.AAA.close;
  const words = text(byClass(screen(component({scModel: 'kronos', scHorizon: 5}), d, false), 'aix-price-detail')[0]);
  assert.match(words, /did not trade that session/);
});

test('a quote stamp reads on a Cairo clock, and a bare day stays a day', () => {
  assert.equal(quoteWhen('2026-09-17T09:14:47.232Z', false), '17 Sep 2026 · 12:14 Cairo');
  assert.equal(quoteWhen('2026-09-16T22:30:00Z', false), '17 Sep 2026 · 01:30 Cairo');
  assert.equal(quoteWhen('2026-09-17', false), '17 Sep 2026');
  assert.equal(quoteWhen('', false), '—');
});

test('companies left tied share a place when movement is measured', () => {
  assert.deepEqual(standing({ A: 5, B: 5, C: 1 }), { A: 1.5, B: 1.5, C: 3 });
  assert.equal(spearman([[1, 1], [2, 2], [3, 3]]), 1);
  assert.equal(spearman([[1, 1], [1, 2]]), null);
});

/* ── the workbench: past runs ───────────────────────────────────────────── */

test('the record so far counts scored nights, and averages only past the minimum', () => {
  let card = byClass(screen(component({ scModel: 'kronos' })), 'aix-record-card')[0];
  const figures = (n) => byClass(n, 'aix-record-stat').map((x) => text(all(x).find((y) => y.tag === 'strong')).trim());
  assert.match(text(card), /Kronos-small, so far/);
  // Fives returned 1, -1 and 3 against markets of .5, 1 and 2: -0.17 on
  // average, ahead twice; nine of the fifteen picks finished above zero.
  assert.deepEqual(figures(card), ['-0.17 pp', '3', '60%']);
  assert.match(text(card), /its five were ahead of the market on 2 of them/);
  assert.match(text(card), /its five \+1\.00%, the market \+1\.17%, on average/);
  assert.match(text(card), /9 of 15 picks finished up/);
  // 31 Aug ahead, 1 Sep behind, 3 Sep ahead: the sign changed twice.
  assert.match(text(card), /5 companies a night over 3 nights is a small sample\. Its lead over the market has changed sign 2 times\./);
  assert.doesNotMatch(text(card), /EGX 30/);

  const strict = picksFile({ minimumSessions: 5 });
  card = byClass(screen(component({ scModel: 'kronos' }), { ...data, picks: strict }), 'aix-record-card')[0];
  // Below the minimum the count stands and the average does not.
  assert.deepEqual(figures(card), ['—', '3', '60%']);
  assert.match(text(card), /an average needs 5 scored nights; 3 so far/);
});

test('with Gemini on, the past runs are the reading’s own record', () => {
  const node = screen(component({ scModel: 'kronos', scLayers: GEMINI }));
  assert.match(text(byClass(node, 'aix-record-card')[0]), /Gemini re-rank with filings, the news and the rule book, so far/);
  const nights = byClass(node, 'aix-nights-card')[0];
  assert.match(text(nights), /Nothing scored yet at 5 sessions/);
  assert.match(text(nights), /first result comes once 5 more sessions close, for the five from 14 Sep 2026/);
  assert.equal(byClass(nights, 'aix-nights-chart').length, 0);
});

test('night by night draws each scored night and lists every night', () => {
  const card = byClass(screen(component({ scModel: 'kronos' })), 'aix-nights-card')[0];
  assert.equal(byClass(card, 'aix-nights-chart').length, 1);
  assert.equal(byClass(card, 'aix-night').length, 5);
});

test('a night still waiting shows what the model said in dashed chips, never as a result', () => {
  const card = byClass(screen(component({ scModel: 'kronos' })), 'aix-nights-card')[0];
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
  // The newest five are the top of the ranking above, not repeated in the list.
  assert.ok(!rows.some((r) => /14 Sep 2026/.test(text(r))));
});

test('a night not counted names no company', () => {
  const card = byClass(screen(component({ scModel: 'kronos' })), 'aix-nights-card')[0];
  const row = byClass(card, 'aix-night').find((r) => /\b2 Sep 2026/.test(text(r)));
  assert.match(text(row), /NOT COUNTED/);
  assert.equal(byClass(row, 'aix-pick-chip').length, 0);
});

test('long histories are behind a show-all, and older nights say they are in the averages', () => {
  const many = picksFile();
  const nights = many.models.kronos.horizons[5].nights;
  for (let i = 0; i < 6; i += 1) nights.push(scored(`2026-08-${10 + i}`, ['KKK', 'LLL', 'MMM', 'NNN', 'OOO'], [5, 4, 3, 2, 1], [1, 1, 1, 1, 1], 0));
  const c = component({ scModel: 'kronos' });
  let card = byClass(screen(c, { ...data, picks: many }), 'aix-nights-card')[0];
  assert.equal(byClass(card, 'aix-night').length, 6);
  button(card, 'Show all 11 nights').events.click();
  card = byClass(screen(c, { ...data, picks: many }), 'aix-nights-card')[0];
  assert.equal(byClass(card, 'aix-night').length, 11);

  // With older nights left off the list, the averages are the public record's.
  const held = { horizons: { 5: { older: 7, nights: nights.slice(0, 3) } } };
  const r = recordOf(held, 5, { horizons: { 5: { sessions: 12, ahead: 7, meanReturn: 2, meanMarket: 1, meanAdvantage: 1 } } }, 5);
  assert.equal(r.sessions, 12);
  assert.equal(r.enough, true);
  assert.equal(recordOf({ horizons: { 5: { older: 0, nights: nights.slice(0, 3) } } }, 5, null, 5).sessions, 1);
});

test('when the newest five have already been scored, the ranking says so', () => {
  const stale = picksFile();
  stale.models.kronos.horizons[5].nights.splice(0, 2);
  assert.equal(nightsOf(stale.models.kronos, 5).next, null);
  const card = byClass(screen(component({ scModel: 'kronos' }), { ...data, picks: stale }), 'aix-ranking-card')[0];
  assert.equal(rowsOf(card).length, 3);
});

test('every model against the market closes the past runs, and a row loads that model above', () => {
  const c = component({ scModel: 'kronos' });
  const card = byClass(screen(c), 'aix-models')[0];
  const rows = byClass(card, 'aix-model-row');
  assert.deepEqual(rows.map((r) => text(all(r).find((x) => x.tag === 'strong')).trim()), ['Gemini re-rank', 'Kronos-small', 'Chronos-2']);
  assert.match(text(rows[1]), /-0\.50 pp/);
  assert.match(text(rows[2]), /1 OF 3 SESSIONS/);
  assert.doesNotMatch(text(rows[2]), /\+8\.00/);
  assert.match(text(card), /ONE MODEL NOT YET SCORED/);
  assert.match(rows[1].attrs.class, /is-selected/);
  // The Gemini row turns Gemini on over the chosen model.
  rows[0].events.click();
  assert.deepEqual(c.state.scLayers, GEMINI);
  assert.equal(c.state.scFocus, 'future');
  rows[1].events.click();
  assert.equal(c.state.scModel, 'kronos');
  assert.deepEqual(c.state.scLayers, []);
  const chips = byClass(card, 'aix-seg')[0].children;
  assert.deepEqual(chips.map(text).map((x) => x.trim()), ['1 session', '5 sessions', '20 sessions']);
  button(card, '20 sessions').events.click();
  assert.equal(c.state.scHorizon, 20);
});

/* ── the gate, the proof, and what was taken away ───────────────────────── */

test('the gate comes before any figure, per reader, and can be brought back', () => {
  const saved = new Map();
  globalThis.localStorage = { getItem: (k) => saved.get(k), setItem: (k, v) => saved.set(k, v), removeItem: (k) => saved.delete(k) };
  try {
    const c = component({ scAcceptedReader: 'someone-else@example.com', scModel: 'kronos' });
    let node = screen(c);
    assert.equal(rowsOf(node).length, 0);
    assert.equal(all(node).filter((n) => n.tag === 'dialog').length, 1);
    all(node).find((n) => n.tag === 'dialog').events.cancel();
    assert.equal(c.state.screen, 'home');
    button(node, 'I understand').events.click();
    assert.equal(saved.get(ACCEPTED_KEY + c._reader), '1');
    node = screen(c);
    assert.equal(rowsOf(node).length, 3);
    button(node, 'Show the warning again').events.click();
    assert.equal(rowsOf(screen(c)).length, 0);
  } finally { delete globalThis.localStorage; }
});

test('the warning adapts to the record and does not invent poor performance', () => {
  assert.match(warningLines({}, false, {}).join(' '), /no completed five-session/);
  assert.match(warningLines({}, false, {}).join(' '), /timestamp evidence is unavailable/);
  const positive = { dates: ['x'], models: { a: { horizons: { 5: { sessions: 1, meanAdvantage: 2 } } } } };
  assert.match(warningLines(positive, false, {}).join(' '), /0 of 1 scored models lag/);
});

test('both commitments are on screen, and neither is claimed to prove the numbers', () => {
  const node = screen(component({ scModel: 'kronos' }));
  assert.match(text(node), new RegExp('ab'.repeat(32)));
  assert.match(text(node), new RegExp('cd'.repeat(32)));
  assert.match(text(node), /does not prove the forecast is accurate/);
});

test('a Home row for a model with nothing to rank explains why the workbench shows another', () => {
  const c = component({ scModel: 'flat', scFrom: 'flat' });
  assert.match(text(screen(c)), /Flat, says nothing ranks nothing of its own to show/);
});

test('the workbench is reachable from More, and is a screen rather than a preview', async () => {
  /* THIS REVERSES A RULE TWICE, AND BOTH REVERSALS HAD REASONS.
     The workbench first had no navigation entry, because it sat in a
     destination of its own beside Home and "a row of one tab under the header
     is a selector with nothing to select". §4 rebuilt the destinations into
     five and More now holds eight screens, so an entry became one of eight
     and the objection lapsed — §4 asked for the entry AND a compact preview
     on Home.

     On 19 September the owner rebuilt Home as one headline and its evidence,
     and the preview went with everything else that was a preview of another
     screen. The entry under More is what makes that safe: without it the lab
     would be reachable from nowhere. */
  const logic = await read('public/esthmr/logic.js');
  assert.match(logic, /\['scenarios', ar\?'مختبر النماذج':'Model lab'/);
  assert.match(logic, /id: 'tools', label: ar \? 'المزيد' : 'More'/);
  assert.match(logic, /screens: \['tools', 'scenarios'/);
  assert.match(logic, /secondaryNav: secondaryNav\.length > 1 \? secondaryNav : \[\]/);
  const template = await read('public/esthmr/template.html');
  const home = template.slice(template.indexOf('{{ isHome }}'), template.indexOf('{{ isToday }}'));
  assert.ok(!home.includes('{{ aiCards }}'), 'the lab is a Home preview again');
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
      for (const model of ['kronos', 'momentum20', 'reversal1', 'rerank']) {
        for (const scHorizon of [1, 5, 20]) {
          for (const scLayers of [[], GEMINI, LAYERS]) {
            const node = screen(component({ scModel: model, scHorizon, scLayers }), d, ar);
            assert.doesNotMatch(text(node), /undefined|NaN|Infinity|\[object/);
          }
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

test('the note under Gemini’s ranking counts sessions the way Arabic does, and never calls a past move a forecast', () => {
  const note = (state, ar) => text(byClass(screen(component({ scLayers: GEMINI, ...state }), data, ar), 'aix-window-note')[0]);
  assert.match(note({ scModel: 'kronos', scHorizon: 5 }, true), /اختيار 5 جلسات يغيّر توقعات/);
  assert.match(note({ scModel: 'kronos', scHorizon: 20 }, true), /اختيار 20 جلسة/);
  assert.doesNotMatch(note({ scModel: 'kronos', scHorizon: 5 }, true), /5 جلسة/);
  assert.match(note({ scModel: 'kronos', scHorizon: 1 }, false), /Choosing the next session changes Kronos-small’s forecasts/);
  const momentum = note({ scModel: 'momentum20', scHorizon: 5 }, false);
  assert.match(momentum, /changes the window the record below is scored over/);
  assert.doesNotMatch(momentum, /forecast/i);
});

test('the demo carries a picks file in the published shape, so both halves show signed out', async () => {
  const { demo } = await import('../../public/esthmr/data.js');
  const d = demo();
  assert.ok(d.picks && d.picks.demo);
  const node = screen(component({ scModel: 'kronos' }), d);
  const ranked = tickersOf(byClass(node, 'aix-ranking-card')[0]);
  assert.equal(ranked.length, 10);
  assert.ok(ranked.every((t) => /^DEMO\d\d$/.test(t)));
  assert.match(text(byClass(node, 'aix-record-card')[0]), /SESSIONS SCORED/);
  const gemini = screen(component({ scModel: 'kronos', scLayers: GEMINI }), d);
  assert.equal(tickersOf(byClass(gemini, 'aix-ranking-card')[0]).length, 10);
  assert.match(text(gemini), /Ranked after Gemini re-reads/);
});

test('the workbench and hero carry a dark theme, not a light rectangle on a dark page', async () => {
  const css = await read('public/esthmr/ai.css');
  assert.match(css, /\[data-theme="dark"\] \.aix-hero, \[data-theme="dark"\] \.aix-bench/);
  // Site-wide button rules (#app button { color: inherit }) must not win.
  assert.match(css, /#app \.aix-seg button\.on/);
  assert.match(css, /#app \.aix-rank-row \{/);
  assert.match(css, /#app \.aix-view-switch button\.on \{/);
  assert.match(css, /#app \.aix-view-switch button:focus-visible \{/);
  // Right-aligned and unwrapped, "Forecast: …" ran left over the Gemini score.
  assert.match(css, /\.aix-rank-was \{[^}]*flex-wrap: wrap/);
  assert.match(css, /#app \.aix-reason \{/);
  assert.doesNotMatch(css, /aix-rank-stages|!important\}/, 'no styles left for the markers that became buttons');
  assert.match(css, /#app \.aix-pick-chip\.is-said/);
  assert.match(css, /#app \.aix-hero h1 \{[^}]*font-size: var\(--aix-h1\) !important/);
  assert.match(css, /#app \.aix-cta-quiet \{/);
  assert.match(css, /\.aix-divider \{/);
  assert.match(css, /\.aix-card\.aix-record-card \{ background: var\(--aix-record-bg\)/);
});

test('the workbench says where the record stands before it shows numbers', () => {
  /* Maturity was a caption under a chart, which a reader reaches after they
     have already read the forecast as though it were scored. "0 of 5" is the
     sharpest case: it reads as nought right out of five when it means the
     opposite — nothing has been marked yet. */
  const pending = statusStrip({ sessions: 0, minimum: 5, enough: false }, false);
  const pendingText = text(pending);
  assert.match(pendingText, /First evaluation after/);
  assert.match(pendingText, /5/);
  assert.match(pendingText, /No measured accuracy yet/);
  assert.ok(!/\b0\s*(of|\/)\s*5\b/.test(pendingText), 'it still prints a nought out of five');

  const part = statusStrip({ sessions: 2, minimum: 5, enough: false }, false);
  assert.match(text(part), /After 3 more completed sessions|after\s*3\s*more/i);

  const arabic = statusStrip({ sessions: 0, minimum: 5, enough: false }, true);
  assert.match(text(arabic), /أول تقييم بعد/);
  assert.match(text(arabic), /لا توجد دقة مقيسة بعد/);

  const scored = statusStrip({ sessions: 7, minimum: 5, enough: true }, false);
  assert.match(text(scored), /Scored over/);
  assert.match(scored.className, /is-scored/);

  assert.equal(statusStrip(null, false), null, 'no record should draw no strip');
});

/* ── the forecast window, as one picture ────────────────────────────────── */

/* A night that saved the whole daily path — the only kind that has a low, an
   average and a high to draw. Nights sealed before 17 Sep 2026 kept three
   endpoints only, and those rows fall back to figures. */
function withPath() {
  const d = structuredClone(data);
  d.scenarios.companies.AAA.models.kronos.pricePath = [10.1, 9.9, 10.2, 10.4, 10.3];
  d.scenarios.companies.AAA.models.kronos.basisClose = 10;
  d.scenarios.companies.BBB.models.kronos.pricePath = [19.4, 19.1, 19.6, 19.2, 19.0];
  d.scenarios.companies.BBB.models.kronos.basisClose = 20;
  return d;
}

test('a ranking row draws the forecast window instead of five loose figures', () => {
  const node = screen(component({ scModel: 'kronos', scHorizon: 5 }), withPath());
  const bars = byClass(node, 'aix-range');
  assert.ok(bars.length > 0, 'no row draws its forecast window');
  const bar = bars[0];
  const marks = all(bar);
  /* Four things, and each one is a different fact: the band is the lowest and
     highest close on the saved path, the upright line is the price now, the
     dot is the average close. A band alone would read as a probability
     interval, which is the one thing it is not. */
  assert.equal(marks.filter((n) => (n.attrs.class || '') === 'aix-range-band').length, 1, 'no band');
  assert.equal(marks.filter((n) => (n.attrs.class || '') === 'aix-range-now').length, 1, 'the price now is not marked');
  assert.equal(marks.filter((n) => (n.attrs.class || '') === 'aix-range-avg').length, 1, 'the average close is not marked');
  assert.equal(marks.filter((n) => n.tag === 'text').length, 4, 'the four figures are not all labelled');
  // Every coordinate finite: a NaN in a path erases the drawing silently.
  for (const n of marks) {
    for (const k of ['x', 'y', 'x1', 'x2', 'y1', 'y2', 'cx', 'cy', 'width', 'height']) {
      if (n.attrs[k] === undefined) continue;
      assert.ok(Number.isFinite(Number(n.attrs[k])), `${n.tag}.${k} is ${n.attrs[k]}`);
    }
  }
  assert.ok(Number(marks.find((n) => n.attrs.class === 'aix-range-band').attrs.width) >= 0,
    'the band has a negative width, so the low and the high are the wrong way round');
});

test('the window says it is a saved path and not a probability bound', () => {
  const said = text(screen(component({ scModel: 'kronos', scHorizon: 5 }), withPath()));
  assert.match(said, /Not probability bounds/,
    'the band can be read as a confidence interval, which is a claim this run does not make');
  const ar = text(screen(component({ scModel: 'kronos', scHorizon: 5 }), withPath(), true));
  assert.match(ar, /ليست حدود احتمال/, 'the Arabic screen drops the limit');
});

test('a night that saved no path prints the figures it has instead of an empty drawing', () => {
  const node = screen(component({ scModel: 'kronos', scHorizon: 5 }));
  assert.equal(byClass(node, 'aix-range').length, 0, 'a window was drawn from figures that were never saved');
  assert.ok(byClass(node, 'aix-price-grid').length > 0, 'the row shows nothing at all');
});

/* ── §10: the answer before the form ─────────────────────────────────────── */

const BENCH_SRC = await read('public/esthmr/scenarios.js')
  + await read('public/esthmr/ai-cards.js');

test('the results come before the setup, in the DOM and not only in CSS', () => {
  /* "Show an already-computed model result immediately, with the chosen model
     visible." Ordering this with CSS alone would leave a screen reader, and
     anyone tabbing, still walking through the controls first. */
  const node = screen(component({ scModel: 'kronos' }));
  const kids = [...(node.children || [])];
  const grid = kids.find((n) => String(n.attrs?.class || '').includes('aix-bench-grid'));
  assert.ok(grid, 'the workbench lost its grid');
  const order = (grid.children || []).map((n) => String(n.attrs?.class || '').split(' ')[0]);
  assert.deepEqual(order, ['aix-results', 'aix-controls'],
    `setup is above the results again: ${order.join(', ')}`);
});

test('the setup says what is selected while it is shut', () => {
  /* The review asks for the chosen model to be VISIBLE, not one click away.
     A collapsed panel that says only "Change model and evidence" hides the
     one fact a reader needs to read the numbers above it. */
  const node = screen(component({ scModel: 'kronos', scHorizon: 5 }));
  const summary = byClass(node, 'aix-setup-now')[0];
  assert.ok(summary, 'the shut panel names nothing');
  const said = text(summary);
  assert.match(said, /Kronos/i, `the model is not named: ${said}`);
  assert.match(said, /session/i, `the window is not named: ${said}`);
  assert.match(said, /model only/i, 'the evidence state is not named');
});

test('the setup panel survives using it', () => {
  /* Picking a model calls setState, which redraws. An uncontrolled <details>
     would come back shut, so the panel would close the instant it was used —
     the reader would have to reopen it for every change. */
  const c = component({ scModel: 'kronos', scSetupOpen: true });
  const node = screen(c);
  const panel = byClass(node, 'aix-controls')[0];
  // The dom stub stringifies attributes, as a real setAttribute would.
  assert.equal(String(panel.attrs.open), 'true', 'the open panel renders shut');
  assert.ok(panel.events && panel.events.toggle, 'nothing records the reader opening it');
  panel.events.toggle({ target: { open: false } });
  assert.equal(c.state.scSetupOpen, false, 'closing it is not remembered');
});

test('nothing on the workbench says a model is about to run', () => {
  /* Every figure is read from a sealed document. A label in the future tense
     is a claim that something is being computed for this reader now. */
  const src = BENCH_SRC;
  for (const phrase of ['Run a model', 'Running the model', 'Calculating', 'جارٍ الحساب']) {
    assert.ok(!src.includes(phrase), `the workbench says "${phrase}"`);
  }
  assert.match(src, /Explore model results/);
  assert.match(src, /استكشف نتائج النماذج/);
});

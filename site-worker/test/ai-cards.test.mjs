/* The AI layer: what it may say, and what it must never become.
 *
 * This is the part of the site that is closest to the line. The cards are a
 * track record of MODELS and are safe ground; the workbench shows a number a
 * model produced about a named company and is not. These tests are mostly
 * about the second, and about the gate in front of it.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const ROOT = new URL('../../', import.meta.url);
const read = (p) => readFile(new URL(p, ROOT), 'utf8');

const cardsSrc = await read('public/esthmr/ai-cards.js') + await read('public/esthmr/ai-visuals.js');
const scSrc = await read('public/esthmr/scenarios.js');
const cards = await import('../../public/esthmr/ai-cards.js');
const top5 = JSON.parse(await read('public/data/v1/research/top5.json'));
const scenarios = JSON.parse(await read('public/data/v1/lab/scenarios.json'));
const measures = JSON.parse(await read('public/data/v1/measures.json'));
const universe = new Set(measures.rows.map((r) => r.ticker));

/* ── the cards are about models ─────────────────────────────────────────── */

test('the published record names no security anywhere', () => {
  // The moment a card can name the five, it is a list of five securities
  // chosen by this publisher.
  for (const word of JSON.stringify(top5).split(/[^A-Z0-9]+/)) {
    assert.ok(!universe.has(word), `top5.json names ${word}`);
  }
});

test('every row on Home carries its sample, not just its average', () => {
  const m = cards.heroModel(top5, '5');
  assert.ok(m.rows.length >= 5, 'the record lost its models');
  assert.equal(m.minimum, top5.minimumSessions);
  for (const r of m.rows) {
    assert.equal(typeof r.sessions, 'number');
    assert.ok(r.ahead <= r.sessions, `${r.id} is ahead on more sessions than it ran`);
    // No average below the record's own minimum: a coincidence with a
    // percentage on it is still a coincidence.
    if (r.scored) assert.ok(r.sessions >= m.minimum, `${r.id} shows an average from ${r.sessions} sessions`);
    else assert.equal(r.advantage, null);
  }
});

test('a model with no history says what it needs rather than showing a zero', () => {
  const m = cards.heroModel({ minimumSessions: 5, models: { kronos: { label: 'K', group: 'neural', nights: 2, horizons: {} } } }, '5');
  assert.equal(m.rows[0].sessions, 0);
  assert.equal(m.rows[0].scored, false);
  assert.equal(m.rows[0].advantage, null);
  assert.equal(m.rows[0].needed, 5);
  assert.match(cardsSrc, /needs \$\{r\.needed\} more/);
});

test('a model that tells no companies apart is not listed as if it chose five', () => {
  // Flat ranks every company alike; its "five" are whichever tickers sort
  // first, and its record is a record of the alphabet.
  const m = cards.heroModel(top5, '5');
  assert.ok(top5.models.flat, 'the fixture lost its null model');
  assert.equal(top5.models.flat.distinguishes, false);
  assert.ok(!m.rows.some((r) => r.id === 'flat'));
});

test('the copy does not promise, and the beta label is on the surface', () => {
  for (const word of ['best', 'top pick', 'buy', 'recommend', 'should', 'will return', 'guarantee']) {
    assert.ok(!cardsSrc.toLowerCase().includes(`'${word}`), `the hero says "${word}"`);
  }
  assert.match(cardsSrc, /ESTHMR AI · BETA · READ THIS/);
  assert.match(cardsSrc, /advise nothing/);
  assert.match(cardsSrc, /not an index/);
});

test('the cards sit at the top of Home on a phone', async () => {
  // chart-viewer.css reorders Home's children under 600px and puts anything
  // it does not name at order 3, so a new section lands below the fold
  // however early it is in the markup.
  const css = await read('public/esthmr/ai.css');
  assert.match(css, /#app \.journal-home > \.ai-cards \{ order: -1; \}/);
  const template = await read('public/esthmr/template.html');
  const home = template.indexOf('{{ isHome }}');
  assert.ok(template.indexOf('{{ aiCards }}', home) < template.indexOf('journal-intro', home),
            'the cards are not first in the markup either');
});

test('restoring Home did not cost it the sections it had', async () => {
  // The rebuild that replaced this page deleted the mosaic, the movers, the
  // busiest card and the ranking panel. They are the page the owner wants.
  const template = await read('public/esthmr/template.html');
  const home = template.slice(template.indexOf('{{ isHome }}'), template.indexOf('{{ isToday }}'));
  for (const kept of ['quick-paths', 'om-idx', 'insight-shelf', 'market-mosaic',
                      'island-board', 'ranking-panel', 'L.busiest', 'journal-pulse']) {
    assert.ok(home.includes(kept), `Home lost ${kept}`);
  }
});

/* ── the workbench is gated ─────────────────────────────────────────────── */

test('nothing is drawn until the warning has been accepted', () => {
  // The gate returns before any figure is built, rather than rendering the
  // screen with an overlay on top of it.
  const gateAt = scSrc.indexOf('if (!hasAccepted(reader) && !(st.scAccepted && st.scAcceptedReader === reader))');
  const viewAt = scSrc.indexOf('const view = viewFor(');
  assert.ok(gateAt > 0 && viewAt > gateAt, 'the screen builds its figures before the gate');
});

test('the warning states the actual sample and timestamp limits', async () => {
  const lines = (await import('../../public/esthmr/scenarios.js')).warningLines(top5, false, scenarios);
  assert.equal(lines.length, 4);
  const all = lines.join(' ');
  assert.match(all, /not licensed to advise/i);
  assert.match(all, /scored models lag their market benchmark/);
  assert.match(all, new RegExp(`${top5.dates.length} evaluation dates`));
  assert.match(all, /Historical testing is not live investment performance/);
  assert.match(all, /does not make it right/);
});

test('the reader can bring the warning back', () => {
  assert.match(scSrc, /Show the warning again/);
  assert.match(scSrc, /localStorage\.removeItem\(acceptKey\(reader\)\)/);
});

/* ── the workbench never ranks companies ────────────────────────────────── */

test('the company list is alphabetical, never in the model’s order', async () => {
  const sc = { companies: scenarios.companies, models: scenarios.models };
  const tickers = Object.keys(scenarios.companies).sort();
  const view = (await import('../../public/esthmr/scenarios.js')).viewFor(tickers, sc, 'kronos', 5);
  const shown = view.rows.map((r) => r.ticker);
  assert.deepEqual(shown, [...shown].sort((a, b) => a.localeCompare(b)));
  assert.ok(shown.length > 50);
});

test('every company in the selection is shown, none cut to a number', async () => {
  const mod = await import('../../public/esthmr/scenarios.js');
  const tickers = Object.keys(scenarios.companies).sort();
  const view = mod.viewFor(tickers, scenarios, 'kronos', 5);
  assert.equal(view.rows.length, tickers.length);
  assert.equal(view.answered + view.silent, tickers.length);
  const body = scSrc.slice(scSrc.indexOf('export function viewFor'), scSrc.indexOf('function median'));
  assert.ok(!/slice\(0,\s*\d/.test(body), 'the view is cut to a number');
});

test('a company no model answered is silent, not zero', async () => {
  const mod = await import('../../public/esthmr/scenarios.js');
  const view = mod.viewFor(['NOSUCH'], { companies: {}, models: {} }, 'kronos', 5);
  assert.equal(view.rows[0].value, null);
  assert.equal(view.answered, 0);
  assert.equal(view.silent, 1);
});

test('disagreement between models is reported, not averaged away', async () => {
  const mod = await import('../../public/esthmr/scenarios.js');
  const spread = mod.spreadOf({ models: { a: { returns: { 5: 3 } }, b: { returns: { 5: -2 } } } }, 5);
  assert.equal(spread.low, -2);
  assert.equal(spread.high, 3);
  assert.equal(spread.agree, false);
});

test('the screen carries the root the numbers were sealed under', () => {
  assert.ok(scenarios.commitment && scenarios.commitment.merkleRoot,
            'the published scenarios carry no commitment');
  assert.match(scSrc, /commitment.merkleRoot/);
  assert.match(scSrc, /does not prove the forecast is accurate/);
  assert.match(scSrc, /according to the run metadata/);
});

test('only missing data shows loading and there is no invented wait', () => {
  assert.match(scSrc, /Loading the saved model run—not generating a new forecast/);
  assert.doesNotMatch(scSrc, /setTimeout|setInterval|scStage/);
});

test('the scenario document is a forecast and is therefore gated data', async () => {
  // It names securities, so it must NOT be under the public research prefix
  // exemption the leaderboard uses. It lives with the exchange data.
  //
  // This test used to assert the loader fetched `research/scenarios.json` —
  // the one path the exemption opens — so it passed while the document it
  // guards was served to anybody. It now checks what its comment says.
  const worker = await read('site-worker/index.js');
  assert.match(worker, /const research = url\.pathname\.startsWith\('\/data\/v1\/research\/'\)/);
  const dataSrc = await read('public/esthmr/data.js');
  assert.match(dataSrc, /export async function scenarios\(\)\s*\{\s*return doc\('lab\/scenarios\.json'\)/);
  assert.match(dataSrc, /return doc\(`lab\/rerank\/\$\{key\}\.json`\)/);
  assert.doesNotMatch(dataSrc, /doc\(['`]research\/(scenarios|rerank)/);
  // And nothing naming companies sits in the open folder on disk.
  const { readdir } = await import('node:fs/promises');
  const open = await readdir(new URL('public/data/v1/research/', ROOT));
  assert.ok(!open.includes('scenarios.json'), 'research/scenarios.json is public — it names securities');
  assert.ok(!open.includes('rerank'), 'research/rerank/ is public — readings name securities');
});

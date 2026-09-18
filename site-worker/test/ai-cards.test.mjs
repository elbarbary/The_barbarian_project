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

const cardsSrc = await read('public/esthmr/ai-cards.js') + await read('public/esthmr/ai-visuals.js') + await read('public/esthmr/ai-record.js');
const scSrc = await read('public/esthmr/scenarios.js');
const cards = await import('../../public/esthmr/ai-cards.js');
const top5 = JSON.parse(await read('public/data/v1/research/top5.json'));
const scenarios = JSON.parse(await read('public/data/v1/lab/scenarios.json'));
const measures = JSON.parse(await read('public/data/v1/measures.json'));
const universe = new Set(measures.rows.map((r) => r.ticker));
const picks = JSON.parse(await read('public/data/v1/lab/picks.json'));

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
  assert.match(cardsSrc, /OF \$\{m\.minimum\} SESSIONS/);
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

test('the cards sit high on Home, under the market', async () => {
  /* They used to be FIRST, above the index levels, on a phone by `order: -1`
     and on a desktop by being first in the markup. That is the thing the
     review objected to: a visitor met the machinery before the market.
     The owner's call is market first, models immediately after — still above
     the fold, which is what the rule was for.

     chart-viewer.css reorders Home's children under 600px and puts anything
     it does not name last, so the markup order alone does not decide this. */
  const css = await read('public/esthmr/ai.css');
  assert.match(css, /#app \.journal-home > \.ai-cards \{ order: 2; \}/);
  const phone = await read('public/esthmr/chart-viewer.css');
  const order = (sel) => Number((phone.match(new RegExp(`\\.journal-home>\\${sel}\\{order:(\\d+)`)) || [])[1]);
  assert.equal(order('.om-idx'), 1, 'the indices are not first after the header');
  assert.ok(order('.quick-paths') > 2, 'the shortcuts still come before the record');
  assert.ok(Number((phone.match(/\.journal-home>\*\{order:(\d+)/) || [])[1]) > 2,
            'unnamed sections would land above the record');

  const template = await read('public/esthmr/template.html');
  const home = template.indexOf('{{ isHome }}');
  const at = (s) => template.indexOf(s, home);
  assert.ok(at('journal-intro') < at('om-idx'), 'the session header is not first');
  assert.ok(at('om-idx') < at('{{ aiCards }}'), 'the machinery is above the market again');
  assert.ok(at('{{ aiCards }}') < at('quick-paths'), 'the record fell below the shortcuts');
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
  const choiceAt = scSrc.indexOf('const choice = choiceOf(');
  const picksAt = scSrc.indexOf('const entry = entryOf(');
  assert.ok(gateAt > 0 && choiceAt > gateAt && picksAt > gateAt, 'the screen builds its figures before the gate');
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

/* ── the workbench's ranking is the record's own ─────────────────────────── */

test('every company in the run is shown, none cut to a number', async () => {
  const mod = await import('../../public/esthmr/scenarios.js');
  const tickers = Object.keys(scenarios.companies).sort();
  const view = mod.returnsView(scenarios, { model: 'kronos', horizon: 5 }, tickers);
  assert.equal(view.rows.length, tickers.length);
  const body = scSrc.slice(scSrc.indexOf('export function returnsView'), scSrc.indexOf('export function positions'));
  assert.ok(!/slice\(0,\s*\d/.test(body), 'the view is cut to a number');
  // The list on screen shows twelve and says how many more there are.
  const visuals = await read('public/esthmr/scenario-visuals.js');
  assert.match(visuals, /Show all \$\{rows\.length\} companies/);
});

test('a company no model answered is silent, not zero', async () => {
  const mod = await import('../../public/esthmr/scenarios.js');
  const view = mod.returnsView({ companies: {}, models: {} }, { model: 'kronos', horizon: 5 }, ['NOSUCH']);
  assert.equal(view.rows[0].value, null);
  assert.equal(view.summary.count, 0);
});

/* ── the fives, by name ─────────────────────────────────────────────────── */

test('the picks name the same fives the public record averages', () => {
  // Built by the code that builds top5.json, so the five a reader is shown
  // for a night are the five that night's result is the average of.
  let compared = 0;
  const check = (entry, source, name) => {
    for (const [hz, held] of Object.entries(entry.horizons)) {
      const rows = source?.horizons?.[hz]?.byDate || [];
      const listed = held.nights.filter((n) => n.status === 'scored');
      if (!held.older) assert.equal(listed.length, source.horizons[hz].sessions, `${name} at ${hz}`);
      for (const night of listed) {
        const row = rows.find((r) => r.basisSession === night.basisSession);
        assert.ok(row, `${name} lists ${night.basisSession} at ${hz} and the record does not`);
        for (const key of ['chosenReturn', 'marketReturn', 'advantage']) assert.equal(night[key], row[key], `${name} ${night.basisSession} ${key}`);
        assert.equal(night.picks.length, 5);
        const mean = night.picks.reduce((s, p) => s + p.returned, 0) / 5;
        assert.ok(Math.abs(mean - night.chosenReturn) < 1e-3, `${name} ${night.basisSession}: its five do not average to its result`);
        compared += 1;
      }
    }
  };
  for (const [id, entry] of Object.entries(picks.models)) check(entry, top5.models[id], id);
  for (const [key, entry] of Object.entries(picks.readings)) check(entry, top5.readings[key], key);
  assert.ok(compared > 0, 'nothing scored was compared');
});

test('the top of every model’s ranking on screen is the five its record follows', async () => {
  // The owner asked for each model's ranking, highest first. Its top five
  // must be the five the record averages — one rule, ties by ticker — or the
  // screen and the record would be about different companies.
  //
  // Once the night's window has closed, a company with no close at its end is
  // passed over and the next one down is scored (15 Sep 2026, after the close:
  // Kronos's WATP and GRCA). So the five are the ranking with those taken out,
  // and every one taken out ranked above the last of the five.
  //
  // From 17 Sep 2026 the current view also leaves out shares the exchange
  // delisted (scenarios.leftOut), and new runs never forecast them. A night
  // sealed before that can still hold one in its five: Kronos's WATP on
  // 16 Sep. The record keeps it, the screen says under the ranking that its
  // first five may differ, and every other name must still lead in order.
  // The same goes for a name the record passed over: after the close on
  // 17 Sep, WATP (OTC, Mondays and Wednesdays only) had no close for
  // Kronos's one-session night and is not on screen to rank above anything.
  const mod = await import('../../public/esthmr/scenarios.js');
  const excluded = new Set(Object.keys(scenarios.leftOut || {}));
  const same = (rows, night, label) => {
    const passed = new Set(night.skipped || []);
    const five = night.picks.map((p) => p.ticker).filter((t) => !excluded.has(t));
    assert.deepEqual(rows.filter((r) => !passed.has(r.ticker)).slice(0, five.length).map((r) => r.ticker), five, label);
    const last = Math.max(...rows.filter((r) => five.includes(r.ticker)).map((r) => r.rank));
    for (const t of passed) {
      if (excluded.has(t)) continue;
      assert.ok(rows.find((r) => r.ticker === t)?.rank < last, `${label}: ${t} was passed over but ranks below the five`);
    }
  };
  let compared = 0;
  for (const [id, entry] of Object.entries(picks.models)) {
    for (const [hz, held] of Object.entries(entry.horizons)) {
      const newest = held.nights[0];
      if (!newest || newest.basisSession !== scenarios.basisSession || !newest.picks) continue;
      const { rows } = mod.rankingOf(scenarios, { model: id, horizon: Number(hz), gemini: false }, null);
      same(rows, newest, `${id} at ${hz}`);
      compared += 1;
    }
  }
  const key = Object.keys(picks.readings).find((k) => picks.readings[k].default);
  const reading = JSON.parse(await read(`public/data/v1/lab/rerank/${key}.json`));
  const newest = picks.readings[key].horizons['5'].nights[0];
  if (newest && newest.picks && reading.basisSession === newest.basisSession) {
    const { rows } = mod.rankingOf(scenarios, { model: 'kronos', horizon: 5, gemini: true }, reading);
    same(rows, newest, 'the default reading');
    compared += 1;
  }
  assert.ok(compared > 0, 'nothing was compared');
});

test('no instrument without an exchange ticker reaches the workbench', () => {
  // 14 September: Kronos put Misr Kuwait Investment & Trading, known to the
  // feed only by its ISIN (EGS659O1C015), first in its five at +173%.
  const isin = /^[A-Z]{2}[A-Z0-9]{9}[0-9](-[A-Z]{3})?$/;
  assert.ok(!Object.keys(scenarios.companies).some((t) => isin.test(t)), 'scenarios.json carries an ISIN');
  for (const group of [picks.models, picks.readings]) {
    for (const entry of Object.values(group)) {
      for (const held of Object.values(entry.horizons)) {
        for (const night of held.nights) {
          for (const p of night.picks || []) assert.ok(!isin.test(p.ticker), `picks.json names ${p.ticker}`);
        }
      }
    }
  }
});

test('a company left out of the run is named with its reason and ranked nowhere', () => {
  // 14 September: Suez Cement resumed at 134.55 after three months at 19.00,
  // and momentum called it a 897% rise over twenty sessions.
  const left = scenarios.leftOut || {};
  for (const [ticker, why] of Object.entries(left)) {
    assert.equal(typeof why, 'string');
    assert.ok(why.length > 5, `${ticker} is left out with no reason`);
    assert.ok(!(ticker in scenarios.companies), `${ticker} is left out and still ranked`);
  }
  // Whatever is ranked moved less than a doubling between any two closes, so
  // no momentum figure can be the ten-fold jump of a restarted series.
  for (const c of Object.values(scenarios.companies)) {
    const move = c.models?.momentum20?.rankedBy?.['20'];
    if (typeof move === 'number') assert.ok(Math.abs(move) < 500, `${c.ticker} moved ${move}% in twenty closes`);
  }
});

test('a five is always five, and a night not counted names nobody', () => {
  for (const group of [picks.models, picks.readings]) {
    for (const entry of Object.values(group)) {
      for (const held of Object.values(entry.horizons)) {
        for (const night of held.nights) {
          if (night.status === 'withheld') assert.equal(night.picks, undefined);
          else assert.equal(night.picks.length, picks.topCount);
          if (night.status === 'waiting') assert.ok(night.picks.every((p) => p.returned === undefined));
        }
        const dates = held.nights.map((n) => n.basisSession);
        assert.deepEqual(dates, [...dates].sort().reverse(), 'nights are not newest first');
      }
    }
  }
  assert.ok(!picks.models.flat, 'a model that ranks every company alike was given a five');
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
  assert.match(dataSrc, /export async function picks\(\)\s*\{\s*return doc\('lab\/picks\.json'\)/);
  assert.doesNotMatch(dataSrc, /doc\(['`]research\/(scenarios|rerank|picks)/);
  // And nothing naming companies sits in the open folder on disk.
  const { readdir } = await import('node:fs/promises');
  const open = await readdir(new URL('public/data/v1/research/', ROOT));
  assert.ok(!open.includes('scenarios.json'), 'research/scenarios.json is public — it names securities');
  assert.ok(!open.includes('rerank'), 'research/rerank/ is public — readings name securities');
  assert.ok(!open.includes('picks.json'), 'research/picks.json is public — it names securities');
});

test('breadth is a bar beside the indices, not a ring in the board', async () => {
  /* It was a 160px conic-gradient ring at the far end of a four-island board.
     A ring is read by comparing arc lengths, which nobody can do, and the
     comparison it exists to make sat two screens below where the market's
     close is printed. */
  const template = await read('public/esthmr/template.html');
  const home = template.slice(template.indexOf('{{ isHome }}'), template.indexOf('{{ isToday }}'));
  assert.ok(!home.includes('island-breadth'), 'the ring is still in the board');
  assert.ok(!home.includes('{{ breadthRing }}'), 'the conic gradient is still bound');
  assert.ok(home.includes('breadth-strip'), 'the breadth bar is missing from Home');
  assert.ok(home.indexOf('om-idx') < home.indexOf('breadth-strip'),
            'breadth is above the index levels');
  assert.ok(home.indexOf('breadth-strip') < home.indexOf('quick-paths'),
            'breadth fell below the shortcuts');

  /* Every binding the bar reads has to exist, or it draws an empty bar and
     says nothing — which is how the ring's numbers would have gone stale. */
  const logic = await read('public/esthmr/logic.js');
  for (const bound of ['hasBreadth', 'breadthBars', 'breadthCounted', 'breadthNote']) {
    assert.ok(new RegExp(`${bound}\\s*[:,]`).test(logic), `${bound} is bound in the template but not built`);
  }
  for (const field of ['width', 'count', 'pct', 'color', 'label']) {
    assert.ok(home.includes(`{{ b.${field} }}`), `the bar does not read b.${field}`);
  }

  /* The third band is companies that TRADED and did not move. One that did not
     trade has no percentage and is not counted at all — opposite facts, and
     the note is what stops the band being read as "no trading". */
  assert.match(logic, /breadthNote:'“Unchanged” is a recorded reading, not an absence of trading\./);
  assert.match(logic, /breadthNote:'«بلا تغيّر» قراءة مسجّلة، وليست غياب تداول\./);
  assert.ok(home.includes('{{ L.breadthNote }}'), 'the note is never rendered');

  /* chart-viewer.css reorders Home's children on a phone and sends anything it
     does not name to the back, so a new section needs naming or it lands
     below the fold however early it is in the markup. */
  const phone = await read('public/esthmr/chart-viewer.css');
  assert.match(phone, /\.journal-home>\.breadth-strip\{order:1\}/,
               'the bar is not pinned beside the indices on a phone');
});

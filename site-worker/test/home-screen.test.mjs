/* What Home must be, now that it is the reader's question and not our list.
 *
 * The tests that used to live here described the old page — the ordering of
 * an insight shelf, an island board, a yardstick on a card. That page is gone
 * and those tests went with it. These describe the thing that replaced it,
 * and most of them exist to pin down what it must NEVER do again.
 *
 * The publisher is not licensed to advise. The line this project holds is
 * about who fixes the cardinality: a condition the reader states may return
 * none or fifty companies, because the reader chose the test and the count.
 * A list of six whose length we chose is a recommendation however it is
 * worded. So the page may lead with facts about the whole market, and with
 * answers to the reader's own question, and with nothing else.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const ROOT = new URL('../../', import.meta.url);
const read = (p) => readFile(new URL(p, ROOT), 'utf8');

const template = await read('public/esthmr/template.html');
const source = await read('public/esthmr/home.js');
const ask = await read('public/esthmr/ask.js');
const RB = await import('../../public/esthmr/rulebook.js');
const home = await import('../../public/esthmr/home.js');
const table = JSON.parse(await read('public/data/v1/measures.json'));
/* A publish that started from an older commit can rewrite the table after a
   builder change lands, and for the half hour until the next publish the
   artefact lags the code. A test that reads the artefact must say "stale"
   then, not "broken": `breadth` arrived with the change that revived four
   empty columns and stripped the nulls, so its absence dates the file. */
const stale = !table.breadth ? 'the published table predates its builder — the next publish rewrites it' : '';

const SUBJECTS = [
  ['move', ['up-today-down-month', 'moved-5', 'up-month']],
  ['volume', ['twice-normal', 'five-times', 'no-buyer']],
  ['results', ['profit-grew', 'profit-fell', 'due-soon']],
  ['filings', ['filed-recently', 'silent', 'streak']],
];

/* ── what must not come back ────────────────────────────────────────────── */

test('the lists whose length we chose are gone from Home', () => {
  const start = template.indexOf('{{ isHome }}');
  const end = template.indexOf('{{ isToday }}');
  assert.ok(start > 0 && end > start, 'the Home block is not where it was');
  const page = template.slice(start, end);
  for (const gone of ['market-mosaic', 'mosaicTiles', 'island-move-grid',
                      'ranking-panel', 'insight-volume', 'L.busiest',
                      'quick-paths', 'journal-pulse', 'om-dots']) {
    assert.ok(!page.includes(gone),
      `${gone} is back on Home — a list of companies whose length we chose`);
  }
});

test('no starter question is phrased as a thing worth owning', () => {
  // "Companies worth buying" and "top picks" are the same object as a
  // six-mover board with the count hidden inside the words.
  for (const word of ['buy', 'sell', 'best', 'top ', 'worth owning',
                      'opportunit', 'recommend', 'pick']) {
    assert.ok(!ask.toLowerCase().includes(`en: '${word}`),
              `a question is phrased around "${word}"`);
  }
});

test('the nightly layer\'s own count is not on Home', () => {
  // "32 of 260 worth anything tonight" names no security and is still an
  // opportunity gauge, and eight scored sessions cannot support its
  // precision. It belongs in the methodology.
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert.ok(!/worth anything/i.test(code),
            'the rerank layer\'s opportunity count reached the home screen');
});

/* ── the market, described ──────────────────────────────────────────────── */

test('breadth accounts for every listing and is published with it', (t) => {
  if (stale) return t.skip(stale);
  const b = table.breadth;
  assert.ok(b, 'the measurement table carries no breadth');
  assert.equal(b.rose + b.fell + b.level + b.idle + b.unmeasured, b.listed);
  assert.equal(b.listed, table.rows.length);
});

test('a company that found no buyer is never folded into unchanged', () => {
  // The distinction the block exists for: today 40 companies had no buyer at
  // any price and 13 traded and closed level. One number for both would
  // report the first as steady.
  assert.ok(/idle/.test(source) && /level/.test(source));
  assert.ok(source.includes('found no buyer'),
            'the idle state lost its own words');
  assert.ok(source.includes('traded, closed level'));
});

test('the browser and the builder agree on what the session did', (t) => {
  if (stale) return t.skip(stale);
  // The five states exist in two languages: Python publishes them with the
  // table, JavaScript computes them for the signed-out demo. Two
  // implementations of one rule drift, and the drift here would be silent —
  // a page showing counts that disagree with the document under it.
  const here = home.sessionStates(table.rows);
  const published = table.breadth;
  for (const key of ['listed', 'rose', 'fell', 'level', 'idle', 'unmeasured', 'traded']) {
    assert.equal(here[key], published[key],
                 `${key}: the browser says ${here[key]}, the table says ${published[key]}`);
  }
});

test('a signed-out visitor is shown a market to ask about', async () => {
  // Home's whole subject is asking the market a question. Without a demo
  // table the first screen a visitor is guaranteed to see had no market on
  // it, and the page taught them nothing about what the product is.
  const data = await import('../../public/esthmr/data.js');
  const demo = data.demo();
  assert.ok(demo.measures, 'the demo carries no measurement table');
  assert.ok(demo.measures.rows.length > 8);
  for (const row of demo.measures.rows) {
    assert.match(row.ticker, /^DEMO\d\d$/, 'the demo table names a real ticker');
    for (const [name, value] of Object.entries(row)) {
      assert.notEqual(value, null, `${row.ticker}.${name} is null in the demo`);
    }
  }
  // And the states add up there too.
  const states = home.sessionStates(demo.measures.rows);
  assert.equal(states.rose + states.fell + states.level + states.idle
               + states.unmeasured, states.listed);
});

/* ── the reader's question ──────────────────────────────────────────────── */

test('every starter question answers over the whole market', () => {
  for (const [subject, questions] of SUBJECTS) {
    for (const id of questions) {
      const found = home.questionFor(subject, id);
      assert.ok(found, `${subject}/${id} is missing`);
      const result = RB.run(table, home.asRulebook(found.question));
      assert.equal(result.total + result.didNotMatch + result.couldNotJudge,
                   result.universe,
                   `${id}: the three counts do not add up to the market`);
      assert.equal(result.universe, table.rows.length);
      // Nothing is held back. `run` without a limit returns every match.
      assert.equal(result.results.length, result.total);
    }
  }
});

test('the questions are in a fixed order, never sorted by their answers', () => {
  // Putting the question with the most matches first is us choosing again,
  // through the back door: the question with the most matches is not the
  // better question, and the position says that it is.
  const order = [...ask.matchAll(/id: '([a-z0-9-]+)', en: '/g)].map((m) => m[1]);
  const expected = SUBJECTS.flatMap(([, q]) => q);
  for (const id of expected) assert.ok(order.includes(id), `${id} not declared`);
  const positions = expected.map((id) => order.indexOf(id));
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b),
                   'the declared order does not match the intended one');
  assert.ok(!/sort\(.*total/.test(ask) && !/sort\(.*total/.test(source), 'questions are sorted by match count');
});

test('a question that answers nobody says so rather than disappearing', () => {
  const impossible = { conditions: [{ column: 'relative_volume_20', op: '>=', value: 1e9 }],
                       match: 'all' };
  const result = RB.run(table, impossible);
  assert.equal(result.total, 0);
  assert.equal(result.didNotMatch + result.couldNotJudge, result.universe);
  assert.ok(ask.includes('No company answers this today.'),
            'an empty answer has no words of its own');
});

test('an unjudgeable company is never counted as a company that failed', (t) => {
  if (stale) return t.skip(stale);
  // "103 could not be judged" is a statement about this archive, not about
  // those companies, and collapsing it into "did not match" would let a gap
  // in our data read as a finding about the market.
  const found = home.questionFor('results', 'profit-grew');
  const result = RB.run(table, home.asRulebook(found.question));
  assert.ok(result.couldNotJudge > 0, 'nothing is unjudgeable — check the fixture');
  const missing = table.rows.filter((r) => r.net_income_growth === undefined).length;
  assert.equal(result.couldNotJudge, missing);
});

test('every question names only columns the table actually has', (t) => {
  if (stale) return t.skip(stale);
  // A rule testing a column that does not exist matches nothing and looks
  // like an answer. Four columns in this table were empty for every company
  // for months because they read keys the source did not have.
  const columns = new Set(Object.keys(table.coverage || {}));
  for (const [subject, questions] of SUBJECTS) {
    for (const id of questions) {
      const { question } = home.questionFor(subject, id);
      for (const condition of question.conditions) {
        assert.ok(columns.has(condition.column),
                  `${id} asks about ${condition.column}, which the table lacks`);
      }
    }
  }
});

test('the engine reads the key the questions are written with', () => {
  // The engine destructures `op`. A question written with `operator` would
  // answer "unknown" for every company, silently, because unknown is a
  // legitimate answer in a three-valued engine.
  for (const [subject, questions] of SUBJECTS) {
    for (const id of questions) {
      const { question } = home.questionFor(subject, id);
      for (const condition of question.conditions) {
        assert.ok(typeof condition.op === 'string' && condition.op.length,
                  `${id} has a condition with no op`);
        assert.ok(!('operator' in condition), `${id} uses the wrong key`);
      }
    }
  }
});

/* ── unusual volume, re-formed ──────────────────────────────────────────── */

test('every company at the volume threshold is listed, never a top N', () => {
  // The old busiest card showed four. Four was our choice, and a list of
  // four we chose is a recommendation however it is called. The threshold
  // is still ours; the count is the market's, and all of it is shown.
  const v = home.unusualVolume(table);
  const expected = table.rows.filter((r) => typeof r.relative_volume_20 === 'number'
                                            && r.relative_volume_20 >= home.UNUSUAL).length;
  assert.equal(v.unusual.length, expected);
  assert.ok(v.unusual.length > 4, 'the fixture has too few to prove the list is uncapped');
  assert.ok(!/slice\(0,\s*\d/.test(source.slice(source.indexOf('function unusualVolume'), source.indexOf('function volumeBlock'))),
            'the volume list is cut to a number');
});

test('the volume list is alphabetical, not by multiple', () => {
  const v = home.unusualVolume(table);
  const tickers = v.unusual.map((r) => r.ticker);
  assert.deepEqual(tickers, [...tickers].sort((a, b) => a.localeCompare(b)));
});

test('the volume block states its threshold and its denominator', () => {
  const v = home.unusualVolume(table);
  assert.equal(v.measured, table.rows.filter((r) => typeof r.relative_volume_20 === 'number').length);
  assert.ok(source.includes('of ${whole(v.measured)} with a median to compare against'));
});

/* ── the questions screen ───────────────────────────────────────────────── */

test('the questions screen survives a refresh and the Back button', async () => {
  const nav = await import('../../public/esthmr/navigation.js');
  assert.equal(nav.readRoute('?view=questions').screen, 'questions');
  assert.equal(new URLSearchParams(nav.routeKey({ screen: 'questions' })).get('view'), 'questions');
});

test('the page column does not wrap, so one wide table cannot widen every section', async () => {
  // journal.css wraps the column's first child; a wrapping column is a
  // multi-line flex container, and a stretched item in one takes the width
  // of its line rather than the container's. 420px on a 375px phone.
  const css = await read('public/esthmr/home.css');
  // Specificity is the whole point: journal.css's rule is id + class +
  // pseudo-class + element, and a plainer selector loses to it silently.
  assert.match(css, /#app \.om-scr > div\.home-screen:first-child \{ flex-wrap: nowrap; \}/);
  assert.match(css, /\.arena-scroll \{[^}]*contain: inline-size/);
});

/* ── the arena ──────────────────────────────────────────────────────────── */

test('the model table is in a fixed order, not sorted by score', async () => {
  // A ledger, not a podium. A reader can see which row is highest; the page
  // does not put it on top for them.
  const leaderboard = JSON.parse(await read('public/data/v1/research/leaderboard.json'));
  const rows = home.arenaRows(leaderboard, '1');
  assert.deepEqual(rows.map((r) => r.id).slice(0, 4), ['kronos', 'chronos2', 'timesfm25', 'rerank']);
  const means = rows.filter((r) => r.present && r.dates).map((r) => r.mean);
  const sorted = [...means].sort((a, b) => b - a);
  assert.ok(means.length >= 5);
  assert.notDeepEqual(means, sorted, 'the rows happen to be in score order — the fixture cannot prove the order is fixed');
});

test('a model that has not been scored says so rather than showing a number', () => {
  const rows = home.arenaRows({ models: { rerank: { '1': {} } }, basisSessions: 8 }, '1');
  const r = rows.find((x) => x.id === 'rerank');
  assert.equal(r.present, true);
  assert.equal(r.dates, 0);
  assert.ok(source.includes("t('not yet scored'"));
});

test('the arena names ten forecasters and no security', () => {
  const body = source.slice(source.indexOf('const MODEL_ROWS'), source.indexOf('function arenaBlock'));
  assert.equal((body.match(/^\s*\['[a-z0-9]+',/gm) || []).length, 10);
  const universe = new Set(table.rows.map((r) => r.ticker));
  for (const word of body.split(/[^A-Z0-9]+/)) {
    assert.ok(!universe.has(word), `${word} is a listed security`);
  }
});


test('Home claims no model has been shown to forecast anything', () => {
  const body = source.slice(source.indexOf('function arenaBlock'));
  assert.ok(body.includes('is not enough to say any of these forecasts this exchange'),
            'the arena block dropped its own disclaimer');
  assert.ok(body.includes('names no security, contains no forecast, and recommends nothing'));
  for (const word of ['best model', 'winner', 'beat', 'champion', 'accuracy of']) {
    assert.ok(!body.toLowerCase().includes(word), `the arena block claims "${word}"`);
  }
});

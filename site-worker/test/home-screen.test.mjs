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
const RB = await import('../../public/esthmr/rulebook.js');
const home = await import('../../public/esthmr/home.js');
const table = JSON.parse(await read('public/data/v1/measures.json'));

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
    assert.ok(!source.toLowerCase().includes(`en: '${word}`),
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

test('breadth accounts for every listing and is published with it', () => {
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

test('the browser and the builder agree on what the session did', () => {
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
  const order = [...source.matchAll(/id: '([a-z0-9-]+)',\n\s+en: '/g)].map((m) => m[1]);
  const expected = SUBJECTS.flatMap(([, q]) => q);
  for (const id of expected) assert.ok(order.includes(id), `${id} not declared`);
  const positions = expected.map((id) => order.indexOf(id));
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b),
                   'the declared order does not match the intended one');
  assert.ok(!/sort\(.*total/.test(source), 'questions are sorted by match count');
});

test('a question that answers nobody says so rather than disappearing', () => {
  const impossible = { conditions: [{ column: 'relative_volume_20', op: '>=', value: 1e9 }],
                       match: 'all' };
  const result = RB.run(table, impossible);
  assert.equal(result.total, 0);
  assert.equal(result.didNotMatch + result.couldNotJudge, result.universe);
  assert.ok(source.includes('No company answers this today.'),
            'an empty answer has no words of its own');
});

test('an unjudgeable company is never counted as a company that failed', () => {
  // "103 could not be judged" is a statement about this archive, not about
  // those companies, and collapsing it into "did not match" would let a gap
  // in our data read as a finding about the market.
  const found = home.questionFor('results', 'profit-grew');
  const result = RB.run(table, home.asRulebook(found.question));
  assert.ok(result.couldNotJudge > 0, 'nothing is unjudgeable — check the fixture');
  const missing = table.rows.filter((r) => r.net_income_growth === undefined).length;
  assert.equal(result.couldNotJudge, missing);
});

test('every question names only columns the table actually has', () => {
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

/* ── the arena ──────────────────────────────────────────────────────────── */

test('Home claims no model has been shown to forecast anything', () => {
  const body = source.slice(source.indexOf('function arenaBlock'));
  assert.ok(body.includes('not yet enough evidence'),
            'the arena block dropped its own disclaimer');
  for (const word of ['best model', 'winner', 'beat', 'champion', 'accuracy of']) {
    assert.ok(!body.toLowerCase().includes(word), `the arena block claims "${word}"`);
  }
});

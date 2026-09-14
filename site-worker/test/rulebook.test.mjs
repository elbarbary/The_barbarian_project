/* A reader's rule, held to returning what they asked for and all of it.
 *
 * Two things make this engine the legal shape rather than the scanner that
 * was pulled: the reader fixes the judgment, and the reader fixes the
 * cardinality. So the tests are about exactly those — that nothing here
 * decides which companies are interesting, and that a count never disagrees
 * with the set behind it.
 *
 * The third is the one that would break it quietly: a company with no figure
 * for a column is not a company whose figure is zero, and 104 of 283 have no
 * revenue figure at all. A comparison that sweeps them in returns a list
 * selected by which documents have been read, dressed as a list selected by
 * the reader.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const RB = await import('../../public/esthmr/rulebook.js');

/* A table shaped like measures.json, small enough to reason about.
 *
 * AAA trades heavily and filed yesterday. BBB is quiet. CCC has no revenue
 * figure at all — the case the whole file is about. DDD is already extended.
 */
const TABLE = {
  columns: {
    ticker: 'code', sector: 'sector', relative_volume_20: 'rv',
    revenue: 'revenue', change_5: 'five-session change',
    sessions_since_filing: 'sessions since filing', big_move_5: 'near-limit sessions',
  },
  rows: [
    { ticker: 'AAA', sector: 'Banks', relative_volume_20: 4.2, revenue: 900,
      change_5: 3.1, sessions_since_filing: 1, big_move_5: 0 },
    { ticker: 'BBB', sector: 'Banks', relative_volume_20: 0.4, revenue: 120,
      change_5: -1.2, sessions_since_filing: 40, big_move_5: 0 },
    { ticker: 'CCC', sector: 'Textiles', relative_volume_20: 6.8,
      change_5: 2.0, sessions_since_filing: 2, big_move_5: 0 },
    { ticker: 'DDD', sector: 'Textiles', relative_volume_20: 9.1, revenue: 40,
      change_5: 44.0, sessions_since_filing: 3, big_move_5: 2 },
  ],
};

const rule = (conditions, extra = {}) => ({ conditions, ...extra });

test('a company with no figure for a column never matches a comparison on it', () => {
  // CCC has no revenue. `revenue < 500` must not sweep it in, because the
  // reader asked about companies with small revenue, not about companies
  // this project has not managed to read a statement for.
  const out = RB.run(TABLE, rule([{ column: 'revenue', op: '<', value: 500 }]));
  assert.deepEqual(out.results.map((r) => r.ticker), ['BBB', 'DDD']);
  assert.equal(out.total, 2);
});

test('"is not" does not reach an absence either', () => {
  // The subtler half of the same trap. "revenue is not 40" looks like it
  // should include a company whose revenue is unknown — it is certainly not
  // 40 — and including it publishes a data gap as a finding.
  const out = RB.run(TABLE, rule([{ column: 'revenue', op: '!=', value: 40 }]));
  assert.deepEqual(out.results.map((r) => r.ticker), ['AAA', 'BBB']);
});

test('absence is reachable, but only by asking about it', () => {
  const missing = RB.run(TABLE, rule([{ column: 'revenue', op: 'missing' }]));
  assert.deepEqual(missing.results.map((r) => r.ticker), ['CCC']);
  const has = RB.run(TABLE, rule([{ column: 'revenue', op: 'has' }]));
  assert.deepEqual(has.results.map((r) => r.ticker), ['AAA', 'BBB', 'DDD']);
});

test('a number comparison against a text column matches nothing', () => {
  // `sector < 500` is nonsense, and a compiler turning a reader's sentence
  // into a rule can produce it. Coercing the text to zero would make the
  // nonsense match every company in the market — an answer, confidently
  // wrong, with no sign anything went astray.
  const out = RB.run(TABLE, rule([{ column: 'sector', op: '<', value: 500 }]));
  assert.equal(out.total, 0);
  assert.equal(RB.run(TABLE, rule([{ column: 'sector', op: '>=', value: 0 }])).total, 0);
});

test('a reader is told why a company they expected is not there', () => {
  const condition = { column: 'revenue', op: '<', value: 500 };
  assert.match(RB.explain(TABLE.rows[2], condition), /no figure for revenue/);
  assert.match(RB.explain(TABLE.rows[1], condition), /revenue 120/);
  assert.match(RB.explain(TABLE.rows[2], condition, true), /لا توجد قيمة/);
});

test('a condition nobody can answer is unknown, and unknown is not false', () => {
  // The whole reason a condition has three answers. CCC has no revenue.
  assert.equal(RB.answer(TABLE.rows[2], { column: 'revenue', op: '<', value: 500 }),
               RB.UNKNOWN);
  assert.equal(RB.answer(TABLE.rows[1], { column: 'revenue', op: '<', value: 500 }),
               RB.TRUE);
  assert.equal(RB.answer(TABLE.rows[0], { column: 'revenue', op: '<', value: 500 }),
               RB.FALSE);
  // `has` and `missing` always know, because absence is what they ask about.
  assert.equal(RB.answer(TABLE.rows[2], { column: 'revenue', op: 'has' }), RB.FALSE);
});

test('negation cannot invent a match out of an absence', () => {
  // This is where two-valued logic breaks. "NOT revenue at least 100" against
  // a company with no revenue figure: if the inner condition were false, the
  // negation is true, and the reader is handed every company whose statements
  // have not been read as though they had small revenue.
  assert.equal(RB.not(RB.UNKNOWN), RB.UNKNOWN);
  const out = RB.run(TABLE, rule([
    { column: 'revenue', op: '>=', value: 100, negate: true },
  ]));
  assert.deepEqual(out.results.map((r) => r.ticker), ['DDD']);
  assert.equal(out.couldNotJudge, 1, 'CCC should be unjudgeable, not a match');
});

test('one failed condition settles an all, whatever is unknown beside it', () => {
  // false AND unknown is false — the company genuinely failed, and saying
  // "could not judge" would hide a real answer behind a missing figure.
  assert.equal(RB.every([RB.FALSE, RB.UNKNOWN]), RB.FALSE);
  assert.equal(RB.every([RB.TRUE, RB.UNKNOWN]), RB.UNKNOWN);
  assert.equal(RB.some([RB.TRUE, RB.UNKNOWN]), RB.TRUE);
  assert.equal(RB.some([RB.FALSE, RB.UNKNOWN]), RB.UNKNOWN);
});

test('the three counts add up to the market, every time', () => {
  // A reader looking at seven matches is owed the difference between "265 did
  // not meet your rule" and "11 could not be judged" — the second is a
  // statement about this archive, not about those companies.
  for (const conditions of [
    [{ column: 'revenue', op: '>', value: 100 }],
    [{ column: 'relative_volume_20', op: '>=', value: 3 },
     { column: 'revenue', op: '<', value: 500 }],
    [{ column: 'sector', op: '==', value: 'Banks' }],
  ]) {
    const out = RB.run(TABLE, rule(conditions));
    assert.equal(out.total + out.didNotMatch + out.couldNotJudge, out.universe,
                 JSON.stringify(conditions));
  }
});

test('a weighted condition nobody can answer leaves the score unknowable', () => {
  // Scoring it zero would rank a company with half its figures missing below
  // one that genuinely failed the same conditions — a data gap presented as
  // a worse company.
  const weighted = rule([
    { column: 'relative_volume_20', op: '>=', value: 3, weight: 3 },
    { column: 'revenue', op: '>', value: 1000, weight: 2 },
  ], { threshold: 3 });
  const out = RB.run(TABLE, weighted);
  assert.ok(!out.results.some((r) => r.ticker === 'CCC'),
            'CCC has no revenue and cannot be scored');
  assert.equal(out.couldNotJudge, 1);
  assert.deepEqual(out.results.map((r) => r.ticker), ['AAA', 'DDD']);
});

test('the count is the whole set, and the universe is published with it', () => {
  // "7 companies" means nothing without "of 283". A screen showing the first
  // few without saying how many there were is the publisher choosing again.
  const out = RB.run(TABLE, rule([{ column: 'relative_volume_20', op: '>=', value: 3 }]));
  assert.equal(out.total, 3);
  assert.equal(out.universe, 4);
  assert.equal(out.results.length, out.total);
});

test('a render limit reports itself instead of quietly truncating', () => {
  const out = RB.run(TABLE, rule([{ column: 'relative_volume_20', op: '>=', value: 3 }]),
                     { limit: 2 });
  assert.equal(out.total, 3, 'the true count changed because of a render limit');
  assert.equal(out.shown, 2);
  assert.equal(out.results.length, 2);
});

test('matches come back alphabetical unless the reader sorts them', () => {
  // Any publisher-chosen order is a ranking with the ranking column hidden.
  const out = RB.run(TABLE, rule([{ column: 'big_move_5', op: '>=', value: 0 }]));
  assert.deepEqual(out.results.map((r) => r.ticker), ['AAA', 'BBB', 'CCC', 'DDD']);
});

test('the reader may sort, and an absence sorts last in either direction', () => {
  // Treated as the smallest value, every company missing the column lands at
  // the top of an ascending sort and reads as though it scored lowest.
  const asc = RB.run(TABLE, rule([{ column: 'ticker', op: 'has' }],
                                 { sort: { column: 'revenue', direction: 'asc' } }));
  assert.deepEqual(asc.results.map((r) => r.ticker), ['DDD', 'BBB', 'AAA', 'CCC']);
  const desc = RB.run(TABLE, rule([{ column: 'ticker', op: 'has' }],
                                  { sort: { column: 'revenue', direction: 'desc' } }));
  assert.deepEqual(desc.results.map((r) => r.ticker), ['AAA', 'BBB', 'DDD', 'CCC']);
});

test('an empty rulebook matches nothing rather than the whole market', () => {
  // A rule somebody is still writing. Returning all 283 would put the entire
  // exchange on the screen as though it had been chosen.
  const out = RB.run(TABLE, rule([]));
  assert.equal(out.total, 0);
  assert.equal(out.universe, 4);
});

test('all, any, and at-least-N are the reader’s arithmetic', () => {
  const conditions = [
    { column: 'relative_volume_20', op: '>=', value: 3 },
    { column: 'sessions_since_filing', op: '<=', value: 5 },
    { column: 'change_5', op: '<', value: 20 },
  ];
  assert.deepEqual(RB.run(TABLE, rule(conditions)).results.map((r) => r.ticker),
                   ['AAA', 'CCC']);
  assert.equal(RB.run(TABLE, rule(conditions, { match: 'any' })).total, 4);
  // Two of the three, which is neither all nor any — and DDD meets exactly
  // two, so a threshold is a different question from both.
  const some = RB.run(TABLE, rule(conditions, { threshold: 2 }));
  assert.deepEqual(some.results.map((r) => r.ticker).sort(), ['AAA', 'CCC', 'DDD']);
});

test('weights are the reader’s own, and the engine supplies none', () => {
  const weighted = rule([
    { column: 'relative_volume_20', op: '>=', value: 3, weight: 3 },
    { column: 'sessions_since_filing', op: '<=', value: 5, weight: 1 },
  ], { threshold: 3 });
  const out = RB.run(TABLE, weighted);
  // BBB fails the volume condition and cannot reach 3 on the filing one.
  assert.deepEqual(out.results.map((r) => r.ticker), ['AAA', 'CCC', 'DDD']);
  assert.equal(out.results[0].weight, 4);
});

test('a rule naming a column the table does not have says so', () => {
  // A compiler turning a sentence into a rule can invent "debt_to_equity" —
  // a real thing to want, not a column here. A rule silently testing it
  // matches nothing and looks like an answer.
  const unknown = RB.unknownColumns(TABLE, rule([
    { column: 'debt_to_equity', op: '>', value: 1 },
    { column: 'revenue', op: '>', value: 1 },
  ]));
  assert.deepEqual(unknown, ['debt_to_equity']);
});

test('how many companies could even be asked each condition', () => {
  // A rule returning four names of 283 reads as a sharp filter. If a hundred
  // of them have no revenue figure, it is partly a statement about which
  // documents have been read, and the reader is owed that.
  const [rv, revenue] = RB.answerable(TABLE, rule([
    { column: 'relative_volume_20', op: '>=', value: 3 },
    { column: 'revenue', op: '>', value: 0 },
  ]));
  assert.equal(rv.answerable, 4);
  assert.equal(revenue.answerable, 3);
  assert.equal(revenue.universe, 4);
});

test('nothing in the engine knows which companies are interesting', () => {
  // No default rule, no preset weights, no threshold, no favoured column.
  // Every one of those would be the publisher's judgment arriving as a
  // default that most readers never change.
  const source = readFileSync(
    new URL('../../public/esthmr/rulebook.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /DEFAULT_RULE|PRESET|RECOMMENDED|defaultRulebook/);
  // And it names no measurement at all. A column mentioned in the engine is a
  // column the engine has an opinion about — the comments may discuss them,
  // the code may not.
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  for (const column of ['relative_volume_20', 'change_5', 'sessions_since_filing',
                        'revenue', 'market_cap', 'big_move_5']) {
    assert.ok(!code.includes(column),
              `the engine names ${column} — it should know no columns`);
  }
});

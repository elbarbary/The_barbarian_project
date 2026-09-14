/* A reader's own rule, run over the whole market, in the reader's own browser.
 *
 * WHAT THIS IS FOR
 * ----------------
 * `measures.json` is every listed company and every measurement that can be
 * made about it from what has been filed and traded. A rulebook is a reader's
 * own statement of what they are looking for — "volume at least three times
 * normal, a filing in the last week, not already up twenty per cent" — and
 * this evaluates it over every row and returns EVERY company that matches.
 *
 * The publisher does not choose which companies appear, how many appear, or
 * what order they are in beyond the reader's own sort. That is the whole
 * arrangement, and it is why this file returns a `total` alongside the rows:
 * a count that disagrees with the set behind it is how a complete answer
 * quietly becomes a selected one.
 *
 * It runs here rather than on a server for the same reason: the table is one
 * static document, so a rule costs nothing to run and there is nothing to
 * meter, queue or throttle. Nothing has to pretend to be working.
 *
 * THE TRAP: WHAT A MISSING MEASUREMENT DOES
 * -----------------------------------------
 * A company with no revenue figure is not a company with revenue of zero.
 * 104 of 283 have no revenue figure at all, and four have a twenty-session
 * median volume of nought, which makes their relative volume undefined rather
 * than infinite.
 *
 * So: **a condition on a measurement a company does not have never matches.**
 * Not `>` and not `<`, not `!=` either. `revenue < 100` must not sweep in the
 * hundred-odd companies whose revenue was never filed, and `revenue != 0`
 * must not quietly include them on the grounds that "absent" is not zero.
 * Every one of those would return a list of companies selected by which
 * documents this project has managed to read, presented as a list of
 * companies selected by the reader's rule.
 *
 * `has` and `missing` are the two operators that ask about absence itself,
 * and they are the only way to reach it.
 *
 * WHICH IS WHY A CONDITION HAS THREE ANSWERS, NOT TWO
 * ---------------------------------------------------
 * `true`, `false`, and `unknown`. A comparison against a measurement the
 * company does not have is `unknown` — and `unknown` is not `false`.
 *
 * The difference only shows up under negation, and then it is the whole
 * thing. `NOT(revenue >= 100)` against a company with no revenue figure: if
 * the inner condition were `false`, the negation would be `true` and the
 * reader would be handed every company whose statements have not been read,
 * as though they had small revenue. `unknown` negates to `unknown`, and the
 * company is left out of the answer and counted where a reader can see it.
 *
 * `false AND unknown` is `false` — one failed condition settles an `all`
 * whatever the others do. `true OR unknown` is `true`. Everything else with
 * an `unknown` in it stays `unknown`.
 *
 * So a run reports three counts that add up to the market: how many matched,
 * how many did not, and how many could not be judged at all.
 */

/* Every comparison a condition may make. Kept as data so the editor, the
   validator and the Arabic labels all read from one list rather than three. */
export const OPERATORS = {
  '>=': { label: 'at least', label_ar: 'لا يقل عن', kind: 'number' },
  '<=': { label: 'at most', label_ar: 'لا يزيد عن', kind: 'number' },
  '>': { label: 'more than', label_ar: 'أكثر من', kind: 'number' },
  '<': { label: 'less than', label_ar: 'أقل من', kind: 'number' },
  '==': { label: 'is', label_ar: 'يساوي', kind: 'any' },
  '!=': { label: 'is not', label_ar: 'لا يساوي', kind: 'any' },
  'in': { label: 'is one of', label_ar: 'من بين', kind: 'list' },
  'has': { label: 'has a figure for', label_ar: 'لديها قيمة لـ', kind: 'absence' },
  'missing': { label: 'has no figure for', label_ar: 'ليس لديها قيمة لـ', kind: 'absence' },
};

const finite = (v) => typeof v === 'number' && Number.isFinite(v);

export const TRUE = 'true';
export const FALSE = 'false';
export const UNKNOWN = 'unknown';

/** What one condition says about one company: 'true', 'false' or 'unknown'.
 *
 * `unknown` is the answer when the company has no figure for the column. It
 * is deliberately not `false`, because `false` negates to `true` and would
 * hand a reader every company whose statements have not been read.
 */
export function answer(row, condition) {
  const { column, op, value } = condition || {};
  if (!column || !OPERATORS[op]) return UNKNOWN;
  const present = Object.prototype.hasOwnProperty.call(row || {}, column);

  // The only two operators that can see an absence — and they always know.
  if (op === 'has') return present ? TRUE : FALSE;
  if (op === 'missing') return present ? FALSE : TRUE;

  if (!present) return UNKNOWN;

  const held = row[column];
  const both = (test) => (finite(held) && finite(value) ? (test() ? TRUE : FALSE)
                                                        : UNKNOWN);
  switch (op) {
    case '>=': return both(() => held >= value);
    case '<=': return both(() => held <= value);
    case '>': return both(() => held > value);
    case '<': return both(() => held < value);
    case '==': return held === value ? TRUE : FALSE;
    case '!=': return held !== value ? TRUE : FALSE;
    case 'in': return Array.isArray(value) && value.includes(held) ? TRUE : FALSE;
    default: return UNKNOWN;
  }
}

/** The two-valued view, for a caller that only wants the matches. */
export function matches(row, condition) {
  return answer(row, condition) === TRUE;
}

/** `all` over three-valued answers: one false settles it; otherwise unknown wins. */
export function every(answers) {
  if (answers.includes(FALSE)) return FALSE;
  return answers.includes(UNKNOWN) ? UNKNOWN : TRUE;
}

/** `any` over three-valued answers: one true settles it; otherwise unknown wins. */
export function some(answers) {
  if (answers.includes(TRUE)) return TRUE;
  return answers.includes(UNKNOWN) ? UNKNOWN : FALSE;
}

/** Negation that cannot invent a match out of an absence. */
export function not(value) {
  if (value === TRUE) return FALSE;
  if (value === FALSE) return TRUE;
  return UNKNOWN;
}

/** Why a condition came out the way it did, in the reader's own terms. */
export function explain(row, condition, ar = false) {
  const { column, op, value } = condition || {};
  const operator = OPERATORS[op];
  if (!operator) return ar ? 'شرط غير مفهوم' : 'a condition that is not understood';
  const present = Object.prototype.hasOwnProperty.call(row || {}, column);
  if (!present && op !== 'missing') {
    return ar ? `لا توجد قيمة لـ ${column}` : `no figure for ${column}`;
  }
  const shown = Array.isArray(value) ? value.join(', ') : value;
  const held = row[column];
  const word = ar ? operator.label_ar : operator.label;
  if (operator.kind === 'absence') return `${column} — ${word}`;
  return ar ? `${column} ${held} (${word} ${shown})`
            : `${column} ${held} (${word} ${shown})`;
}

/** Evaluate a whole rulebook over one row.
 *
 * `all` requires every condition, `any` requires one. A rulebook with no
 * conditions matches NOTHING rather than everything: an empty rule is a rule
 * somebody is still writing, and returning the entire market for it would
 * put 283 companies on the screen as though they had been chosen.
 */
export function evaluate(row, rulebook) {
  const conditions = (rulebook && rulebook.conditions) || [];
  if (!conditions.length) {
    return { verdict: FALSE, met: [], failed: [], unknown: [], weight: 0 };
  }

  const answers = [];
  const met = [];
  const failed = [];
  const unknown = [];
  let weight = 0;
  let weighable = true;
  for (const condition of conditions) {
    let value = answer(row, condition);
    if (condition.negate) value = not(value);
    answers.push(value);
    if (value === TRUE) {
      met.push(condition);
      weight += finite(condition.weight) ? condition.weight : 1;
    } else if (value === FALSE) {
      failed.push(condition);
    } else {
      unknown.push(condition);
      // A weighted condition nobody can answer leaves the total unknowable.
      // Scoring it as zero would quietly rank a company with half its figures
      // missing below one that genuinely failed the same conditions.
      if (finite(condition.weight)) weighable = false;
    }
  }

  const mode = rulebook.match === 'any' ? 'any' : 'all';
  let verdict = mode === 'any' ? some(answers) : every(answers);

  // A reader may also ask for "at least N of these", which is neither all nor
  // any. The threshold sums the weights the reader gave — their arithmetic,
  // not ours — and is unknowable when a weighted condition could not be asked.
  if (finite(rulebook.threshold)) {
    verdict = !weighable ? UNKNOWN
      : (weight >= rulebook.threshold ? TRUE : FALSE);
  }
  return { verdict, met, failed, unknown, weight: weighable ? weight : null };
}

/** Run a rulebook over the whole table.
 *
 * Returns every match and the size of the universe it was drawn from. Both,
 * always: "7 companies" means nothing without "of 283", and a screen that
 * shows the first few without saying how many there were is the publisher
 * choosing again.
 *
 * `limit` exists for rendering, never for selecting — it is reported back as
 * `shown` so the caller must say "showing 20 of 47" rather than quietly
 * truncating. `total` is always the true count.
 */
export function run(table, rulebook, { limit = 0 } = {}) {
  const rows = (table && table.rows) || [];
  const results = [];
  let didNotMatch = 0;
  let couldNotJudge = 0;
  for (const row of rows) {
    const outcome = evaluate(row, rulebook);
    if (outcome.verdict === TRUE) results.push({ ...outcome, row, ticker: row.ticker });
    else if (outcome.verdict === FALSE) didNotMatch += 1;
    else couldNotJudge += 1;
  }

  // Alphabetical unless the reader asked otherwise. Any publisher-chosen
  // order is a ranking with the ranking column hidden.
  const sort = rulebook && rulebook.sort;
  if (sort && sort.column) {
    const direction = sort.direction === 'asc' ? 1 : -1;
    results.sort((a, b) => {
      const x = a.row[sort.column];
      const y = b.row[sort.column];
      // A company with no figure for the sort column sorts LAST in either
      // direction, rather than being treated as the smallest value — which
      // would put every company missing the column at the top of an
      // ascending sort and read as though they scored lowest.
      const hasX = finite(x);
      const hasY = finite(y);
      if (hasX !== hasY) return hasX ? -1 : 1;
      if (!hasX) return a.ticker.localeCompare(b.ticker);
      return x === y ? a.ticker.localeCompare(b.ticker) : (x < y ? -direction : direction);
    });
  } else if (rulebook && finite(rulebook.threshold)) {
    results.sort((a, b) => ((b.weight || 0) - (a.weight || 0))
                           || a.ticker.localeCompare(b.ticker));
  } else {
    results.sort((a, b) => a.ticker.localeCompare(b.ticker));
  }

  // The three add up to the market, always. A reader looking at seven matches
  // is owed the difference between "265 did not meet your rule" and "11 could
  // not be judged because the figures are not there" — the second is a
  // statement about this archive, not about those companies.
  return {
    total: results.length,
    didNotMatch,
    couldNotJudge,
    universe: rows.length,
    shown: limit > 0 ? Math.min(limit, results.length) : results.length,
    results: limit > 0 ? results.slice(0, limit) : results,
  };
}

/** The columns a rulebook names that the table does not have.
 *
 * The compiler that turns a reader's sentence into a rule can invent a column
 * — "debt to equity" is a real thing to want and not a column here — and a
 * rule quietly testing a column that does not exist matches nothing and looks
 * like an answer. This is what the editor shows instead.
 */
export function unknownColumns(table, rulebook) {
  const known = new Set(Object.keys((table && table.columns) || {}));
  const named = [
    ...((rulebook && rulebook.conditions) || []).map((c) => c && c.column),
    rulebook && rulebook.sort && rulebook.sort.column,
  ].filter(Boolean);
  return [...new Set(named.filter((c) => !known.has(c)))];
}

/** How many companies could even be asked each of a rulebook's conditions.
 *
 * A rule that returns four companies out of 283 reads as a sharp filter. If
 * 104 of those 283 have no revenue figure, the rule is partly a statement
 * about which documents have been read, and the reader is owed that before
 * they conclude anything from the four.
 */
export function answerable(table, rulebook) {
  const rows = (table && table.rows) || [];
  return ((rulebook && rulebook.conditions) || []).map((condition) => ({
    column: condition.column,
    answerable: rows.filter((row) =>
      Object.prototype.hasOwnProperty.call(row, condition.column)).length,
    universe: rows.length,
  }));
}

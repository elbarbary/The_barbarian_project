/* §8 in Arabic.
 *
 * DIRECTIVE in logic.js is an English word list: buy, sell, cheap, bargain,
 * recommend. The Arabic page — the default — was never held to it, and two
 * independent reviews (codex and agy, 19 Sep 2026) each found «الأرخص» in
 * the ratio orientation text and «فرصة» in the P/B body. This is the same
 * list in the language the reader actually reads. It is flat on purpose: a
 * guard that reads negation can be talked around, so a denial that uses the
 * word is reworded clear of it. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const ROOT = new URL('../../', import.meta.url);
const logic = await readFile(new URL('public/esthmr/logic.js', ROOT), 'utf8');
const ar = logic.slice(logic.indexOf('    const ar = {'), logic.indexOf('\n    };', logic.indexOf('    const ar = {')));
export const AR_DIRECTIVE = /أرخص|الأرخص|رخيص|رخيصة|غالٍ|غالي|غالية|فرصة|فرص شراء|ننصح|نوصي|توصية بالشراء|توصية بالبيع|اشترِ|اشتر الآن|بِع الآن|سعر مستهدف|مستهدف سعري|مبالغ في تقييم|مقوّم بأقل|مقوّمة بأقل|أقل من قيمتها|أعلى من قيمتها|أفضل سهم|أسوأ سهم/;

test('the Arabic dictionary carries no directive word', () => {
  const hits = [];
  for (const m of ar.matchAll(/(\w+):'((?:[^'\\]|\\.)*)'/g)) {
    const w = AR_DIRECTIVE.exec(m[2]);
    if (w) hits.push(`${m[1]}: «${w[0]}» in "${m[2].slice(Math.max(0, w.index - 30), w.index + 30)}"`);
  }
  assert.deepEqual(hits, [], `§8 words on the Arabic page:\n  ${hits.join('\n  ')}`);
});

test('the modules that carry their own Arabic are held to the same list', async () => {
  const hits = [];
  for (const f of ['changed-today.js', 'flow-trackers.js', 'ai-cards.js', 'sector-lens.js', 'world-monitor.js', 'valuation.js', 'simulator.js', 'company-cards.js', 'pairs.js', 'scenarios.js']) {
    const src = await readFile(new URL('public/esthmr/' + f, ROOT), 'utf8');
    for (const m of src.matchAll(/'([^'\n]*[؀-ۿ][^'\n]*)'/g)) { const w = AR_DIRECTIVE.exec(m[1]); if (w) hits.push(`${f}: «${w[0]}» in "${m[1].slice(0, 70)}"`); }
  }
  assert.deepEqual(hits, [], `§8 words in module strings:\n  ${hits.join('\n  ')}`);
});

/* Western digits, everywhere a figure is written.
 *
 * The owner's call, and the redesign's: "17 سبتمبر 2026", not
 * "١٧ سبتمبر ٢٠٢٦". It is not a style preference — this site sets prices,
 * ranks and percentages in IBM Plex Mono with tabular figures, and Arabic-
 * Indic digits fall back to a different face at a different width, so a
 * column of numbers stops lining up and a date beside a price is set in two
 * different alphabets of digit.
 *
 * `Intl.DateTimeFormat('ar-EG')` uses Arabic-Indic by default. The Unicode
 * extension `-u-nu-latn` is the whole fix, and it has to be on every one of
 * them: one formatter left behind prints one date on the page in the other
 * numbering.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const ROOT = new URL('../../', import.meta.url);
const read = (p) => readFile(new URL(p, ROOT), 'utf8');

const sources = ['logic.js', 'main.js', 'data.js', 'ai-visuals.js', 'scenarios.js',
  'ownership-map.js', 'sector-lens.js', 'world-monitor.js', 'flow-trackers.js',
  'fragility-overview.js', 'valuation.js', 'explorer.js'];

test('no date formatter is left on Arabic-Indic digits', async () => {
  for (const file of sources) {
    const src = await read(`public/esthmr/${file}`);
    /* A locale tag inside a date or number formatter. The speech synthesiser
       also names 'ar-EG' and should: that is a voice, not a numeral set. */
    for (const m of src.matchAll(/(Intl\.(?:DateTimeFormat|NumberFormat)|toLocaleDateString|toLocaleTimeString|toLocaleString)\s*\(([^)]*)/g)) {
      const args = m[2];
      if (!/['"]ar/.test(args)) continue;
      assert.match(args, /ar[\w-]*-u-nu-latn/,
        `${file} formats a date in Arabic-Indic digits: ${m[0].slice(0, 80)}`);
    }
  }
});

test('the Arabic month names survive the numbering change', () => {
  // -u-nu-latn changes the digits and nothing else; if it ever changed the
  // calendar or the script the dates would read as English in an Arabic page.
  const at = new Date('2026-09-17T00:00:00Z');
  const out = new Intl.DateTimeFormat('ar-EG-u-nu-latn',
    { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(at);
  assert.match(out, /2026/, 'the year is not in Western digits');
  assert.match(out, /17/, 'the day is not in Western digits');
  assert.doesNotMatch(out, /[٠-٩]/, 'an Arabic-Indic digit survived');
  assert.match(out, /[؀-ۿ]/, 'the month name is no longer Arabic');
});

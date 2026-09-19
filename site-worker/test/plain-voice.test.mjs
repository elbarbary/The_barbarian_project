/* The voice the whole site is written in, locked against drift.
 *
 * WHY THIS TEST EXISTS
 * Two screens — Trends and the insider tracker — were written in a different
 * hand from everything else: "Comparative aggregate volume of insider
 * accumulation versus selling across economic sectors", "A structural trend
 * radar for relative strength analysis", section labels marked with 📊 and
 * 🗺️. That is not a style quibble. This publisher's readers are retail
 * investors on the Egyptian exchange, and a sentence they have to decode is a
 * sentence that does not inform them, however accurate it is.
 *
 * The rules below are the two that can be checked mechanically. The third —
 * is it actually plain — cannot be, and was done by reading every string.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { installDom } from './dom-stub.mjs';

installDom();

const logic = readFileSync(new URL('../../public/esthmr/logic.js', import.meta.url), 'utf8');
const { DIRECTIVE } = await import('../../public/esthmr/logic.js');

/* Every `      key:'value',` line in the two label dictionaries. */
const labels = [...logic.matchAll(/^ {6}([a-zA-Z][a-zA-Z0-9_]*):'((?:[^'\\]|\\.)*)',$/gm)]
  .map(([, key, value]) => ({ key, value }));

test('the label dictionaries were found at all', () => {
  /* A guard on the guard: if the dictionary is ever reformatted, the regex
     above matches nothing and every assertion below passes vacuously. */
  assert.ok(labels.length > 300, `only ${labels.length} labels matched`);
});

test('no emoji in a user-facing label', () => {
  /* Emoji as section markers were three of the insider screen's four view
     buttons. The comp marks sections with type and rules, and an emoji
     renders as a different glyph on every platform — including, on some
     Android builds, as a blank box beside an Arabic label. */
  const emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u;
  const bad = labels.filter((l) => emoji.test(l.value));
  assert.deepEqual(bad.map((l) => `${l.key}: ${l.value}`), []);
});

test('the trends screen still refuses to be a recommendation', () => {
  /* §8: ESTHMR is not FRA-licensed. The old copy called itself a "radar" with
     "breakout alerts", which is the vocabulary of a signal service. The
     replacement has to keep saying, in both languages, that it describes
     where a price has been and offers no view on where it goes. */
  const en = labels.find((l) => l.key === 'trendsYardstick' && /[A-Za-z]/.test(l.value));
  const ar = labels.filter((l) => l.key === 'trendsYardstick')
    .find((l) => /[؀-ۿ]/.test(l.value));
  assert.ok(en && ar, 'trendsYardstick missing in one language');
  assert.match(en.value, /not a view on where it goes/);
  assert.doesNotMatch(en.value, /radar|breakout|alert/i);
  assert.match(ar.value, /وليس رأياً في وجهته/);
  // Clear of the §8 word list, in the sentence that exists to honour it.
  assert.doesNotMatch(en.value, DIRECTIVE);
});

test('no label reintroduces the dense register', () => {
  /* The specific phrases that scored worst. Each is a term that describes the
     measurement to someone who already knows it, and describes nothing to
     anyone else. */
  const banned = [
    /comparative aggregate volume/i,
    /structural (price )?momentum/i,
    /relative strength analysis/i,
    /breakout candidates/i,
    /post-execution transaction forms/i,
  ];
  const bad = labels.filter((l) => banned.some((re) => re.test(l.value)));
  assert.deepEqual(bad.map((l) => l.key), []);
});

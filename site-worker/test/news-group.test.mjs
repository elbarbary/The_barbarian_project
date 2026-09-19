/* §7 / turn 4: one group, three jobs.
 *
 * "Disclosures and Connecting the Dots begin with effectively the same story
 * header, counts, period controls, and source controls. The two destinations
 * have no immediately visible difference in purpose."
 *
 * The comp is blunter: "Same group, three jobs: what happened / the archive /
 * the dated chain. Different first row each, at 390." A reader who lands on
 * the wrong one has to be able to tell from the first row, on a phone, before
 * scrolling.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const ROOT = new URL('../../', import.meta.url);
const read = (p) => readFile(new URL(p, ROOT), 'utf8');
const template = await read('public/esthmr/template.html');
const logic = await read('public/esthmr/logic.js');

const screenOf = (cls) => {
  const at = template.indexOf(`om-scr ${cls}`);
  assert.notEqual(at, -1, `${cls} is gone`);
  const next = template.indexOf('om-scr ', at + 10);
  return template.slice(at, next > 0 ? next : at + 20000);
};

test('each of the three opens with a head of its own', () => {
  for (const cls of ['screen-today', 'screen-calendar', 'screen-crossings']) {
    const s = screenOf(cls);
    assert.ok(s.indexOf('screen-head') > 0, `${cls} has no head`);
    // And the head is the FIRST thing, before any control strip.
    const head = s.indexOf('screen-head');
    const picker = s.indexOf('{{ months }}');
    if (picker > 0) {
      assert.ok(head < picker, `${cls} still opens on a date control`);
    }
  }
});

test('the three heads answer three different questions', () => {
  /* The datelines are what a reader reads first. If two of them say the same
     thing, the destinations are the same destination. */
  const lines = ['screen-today', 'screen-calendar', 'screen-crossings'].map((cls) => {
    const s = screenOf(cls);
    const at = s.indexOf('card-dateline');
    return s.slice(at, s.indexOf('</p>', at));
  });
  assert.equal(new Set(lines).size, 3, 'two destinations open with the same line');
  assert.match(lines[1], /archiveScale/, 'the archive does not say how big it is');
});

test('the story hub belongs to the dated chain, and appears once', () => {
  /* It counts news, filings, and the companies carrying both — which IS the
     dated chain. On Disclosures it was the same header twice. */
  assert.match(logic, /showStoryHub:!st\.dataLoading&&!st\.dataError&&st\.screen==='crossings'/);
  assert.doesNotMatch(logic, /st\.screen==='crossings'\|\|st\.screen==='calendar'/,
    'the hub is on two destinations again');
});

test('a disclosure row leads with what happened, and the title is the source', () => {
  /* A filing's own title is the exchange's filing language. It tells a reader
     who already knows the form what kind of form it is. */
  const s = screenOf('screen-calendar');
  const meaning = s.indexOf('{{ df.meaning }}');
  const title = s.indexOf('{{ df.what }}');
  assert.ok(meaning > 0 && title > 0, 'the disclosure row lost a field');
  assert.ok(meaning < title, 'the document title leads again');
  // Where nothing plain was extracted, the title still leads — a factual
  // title beats an invented reading.
  assert.match(s, /<sc-if value="\{\{ df\.hasMeaning \}\}">/);
});

test('the archive says one filing is one document, in both languages', () => {
  /* The exchange publishes the same NewsID on an Arabic page and an English
     one. Counting both doubles the archive, and a reader comparing counts
     with the exchange would find them wrong. */
  assert.match(logic, /archiveOneDoc:'The exchange publishes the same filing/);
  assert.match(logic, /archiveOneDoc:'تنشر البورصة الإفصاح نفسه/);
  assert.ok(screenOf('screen-calendar').includes('{{ L.archiveOneDoc }}'),
    'the note is written but never rendered');
});

test('the archive total is the archive, not the open month', () => {
  /* A reader landing in a quiet month should not be told the official record
     holds eleven documents. */
  assert.match(logic, /const archiveTotal = \(\(D\.filedMonths \|\| \[\]\)\.reduce/);
  assert.match(logic, /archiveScaleMonth/, 'there is no honest fallback when the index is absent');
  assert.match(logic, /archiveScaleNone/);
});

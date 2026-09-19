/* Home, against section 5 of the 18 September design review.
 *
 * The order on this page has now been set three times — lab first, then
 * market first, then lab first again from turn 6 of the comp. The review is
 * the latest and the only one of the three that argues its case, scoring
 * visual focus 1/10 and naming the cause: "Home starts with a large AI
 * proposition ... before the EGX cards. Visitors must understand the
 * machinery before seeing the market."
 *
 * So this file pins the order to the review's own diagram rather than to any
 * one of the reversals, and pins the two rules that make the order mean
 * something: a share that did not trade is not "unchanged", and a marker on a
 * followed company points at a document.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { installDom } from './dom-stub.mjs';

installDom();
const ROOT = new URL('../../', import.meta.url);
const read = (p) => readFile(new URL(p, ROOT), 'utf8');
const template = await read('public/esthmr/template.html');
const LOGIC = await read('public/esthmr/logic.js');
const home = template.indexOf('{{ isHome }}');
const at = (s) => {
  const i = template.indexOf(s, home);
  assert.notEqual(i, -1, `Home no longer contains ${s}`);
  return i;
};

test('the page runs in the order the review sets out', () => {
  const rows = [
    ['journal-intro', 'session and date'],
    ['om-idx', 'the index charts'],
    ['breadth-strip', 'the participation strip'],
    ['home-watch', 'what the reader follows'],
    ['{{ changedToday }}', 'what changed'],
    ['{{ aiCards }}', 'the lab preview'],
    ['insight-shelf', 'who traded it'],
    ['{{ flowViews.home }}', 'sector and ownership'],
    ['explore-further', 'everything optional'],
  ];
  const seen = rows.map(([mark]) => at(mark));
  const sorted = [...seen].sort((a, b) => a - b);
  assert.deepEqual(seen, sorted,
    `out of order: ${rows.map(([, name], i) => `${name}@${seen[i]}`).join(' ')}`);
});

test('the optional tools are one shelf, not four competing sections', () => {
  const open = at('explore-further');
  const close = template.indexOf('island-details-toggle', home);
  const inside = template.slice(open, close);
  for (const part of ['quick-paths', 'market-measures', 'ranking-panel', 'island-board']) {
    assert.ok(inside.includes(part), `${part} is outside the explore shelf`);
  }
  // And it says what it is, in both languages.
  assert.match(LOGIC, /exploreTitle:'Explore further'/);
  assert.match(LOGIC, /exploreTitle:'استكشف أكثر'/);
});

test('a share that did not trade is not a share that did not move', () => {
  /* On 17 September 2026 forty-six of the exchange's 288 companies had zero
     volume and a change of 0.00%. Every one of them was counted in the
     "unchanged" band — sixteen per cent of the bar was silence drawn as
     stillness. The review: "Stale quotes and unquoted companies are not
     'unchanged'." */
  assert.match(LOGIC, /const traded = priced\.filter\(\(c\) => c\.volume > 0\)/);
  assert.match(LOGIC, /idle: rows\.length - traded\.length/);
  // The band exists, is named, and the denominator still holds everyone.
  assert.match(LOGIC, /didNotTrade:'did not trade'/);
  assert.match(LOGIC, /didNotTrade:'لم تتداول'/);
  assert.match(LOGIC, /counted: rows\.length/);
  assert.match(template, /class="\{\{ b\.mark \}\}"/);
});

test('the published breadth block is still the fallback, not the source', () => {
  /* It carries three numbers and this needs four. A reader whose directory
     has no volumes still gets a bar rather than nothing. */
  assert.match(LOGIC, /const pub = D\.breadth;/);
  assert.match(LOGIC, /Object\.assign\(\{ idle: 0 \}, pub\)/);
});

test('a followed company’s marker points at a document, not at attention', () => {
  /* "Markers mean a real new event since a stored reading boundary, not a
     generic attention badge." There is no stored boundary yet — read-state is
     phase 5 — so the marker does not claim one: it names the filing's kind
     and its date, and a company with nothing filed in the window shows no
     mark at all. */
  assert.match(LOGIC, /markKind: mark \?/);
  assert.match(LOGIC, /markWhen: mark \? this\.shortDate\(mark\.date\) : ''/);
  assert.match(LOGIC, /hasMark: Boolean\(mark\)/);
  assert.match(template, /\{\{ w\.markKind \}\} · \{\{ w\.markWhen \}\}/);
  // Guarded, so a company with no filing draws nothing rather than a bare dot.
  const tile = template.slice(at('home-watch'), at('{{ changedToday }}'));
  assert.match(tile, /<sc-if value="\{\{ w\.hasMark \}\}">/);
});

test('an empty Following offers companies to follow, and says following is not owning', () => {
  const empty = template.slice(at('{{ noFollowed }}'), at('{{ hasFollowed }}'));
  assert.match(empty, /list="\{\{ watchlist \}\}"/, 'no recognisable companies are offered');
  assert.match(empty, /onClick="\{\{ w\.follow \}\}"/, 'there is no Follow button');
  assert.match(empty, /\{\{ L\.followNotOwning \}\}/);
  assert.match(LOGIC, /followNotOwning:'Following a company shows its close/);
  assert.match(LOGIC, /records nothing about what you own/);
  // The offered list is described as a published ranking, never as our pick.
  assert.match(LOGIC, /a published ranking, not our pick/);
  // And the two controls are siblings: a button inside a button is invalid
  // HTML that a keyboard cannot reach.
  assert.doesNotMatch(empty, /<button[^>]*>\s*<button/);
});

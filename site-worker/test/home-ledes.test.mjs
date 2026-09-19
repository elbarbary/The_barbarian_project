/* Home, measured on the rendered page (Jev, 19 Sep 2026): 71 of 72 blocks
 * were not plain — headings that named a feature, first lines that were
 * datelines or caveats, cards whose only sentence said what they were NOT.
 * This pass gave every Home block one plain line and turned the feature
 * names into the reader's question, with the name kept as a small term.
 * These pin that each piece is still there, in both languages. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const ROOT = new URL('../../', import.meta.url);
const read = (p) => readFile(new URL(p, ROOT), 'utf8');
const [logic, html, css, ct, ft, ai] = await Promise.all([
  read('public/esthmr/logic.js'), read('public/esthmr/template.html'), read('public/esthmr/journal.css'),
  read('public/esthmr/changed-today.js'), read('public/esthmr/flow-trackers.js'), read('public/esthmr/ai-cards.js'),
]);
const home = html.slice(html.indexOf('<sc-if value="{{ isHome }}"'), html.indexOf('<sc-if value="{{ isToday }}"'));
const dict = (name) => { const at = logic.indexOf(`    const ${name} = {`); return logic.slice(at, logic.indexOf('\n    };', at)); };
const both = (key) => { for (const n of ['en', 'ar']) assert.match(dict(n), new RegExp(`\\b${key}:'[^']{8,}'`), `${n}.${key} missing or empty`); };

test('the page opens with a line that says what it is', () => {
  assert.match(home, /<h1>\{\{ overviewTitle \}\}<\/h1>\s*<p class="journal-lead">\{\{ L\.overviewLead \}\}<\/p>/);
  both('overviewLead');
  assert.match(css, /#app \.journal-intro \.journal-lead \{[^}]*flex-basis: 100%/, 'the lead is not styled as its own row');
});

test('feature names became the reader’s question, name kept as a term', () => {
  for (const [q, k] of [['L.investorsWhoQuestion', 'L.investorsWho'], ['L.exploreTitleQuestion', 'L.exploreTitle'], ['L.fpTitleQuestion', 'L.fpTitle'], ['mosaicQuestion', 'mosaicTitle']]) {
    assert.match(home, new RegExp(`\\{\\{ ${q.replace('.', '\\.')} \\}\\} <small class="h-term">\\{\\{ ${k.replace('.', '\\.')} \\}\\}</small>`), `${q} is not paired with ${k} on Home`);
  }
  both('investorsWhoQuestion'); both('exploreTitleQuestion'); both('fpTitleQuestion');
  assert.match(logic, /mosaicQuestion: ar \? '[^']+' : '[^']+',/);
  // the investors screen asks the same question over the same block
  assert.match(html, /<h2>\{\{ L\.investorsWhoQuestion \}\} <small class="h-term">\{\{ L\.investorsWho \}\}<\/small><\/h2><span>\{\{ investors\.asOfLine \}\}<\/span>/);
});

test('the largest moves and the four measures say what the number means', () => {
  assert.match(home, /\{\{ snapshotMovesLabel \}\}<\/h2><\/header>\s*<p class="island-lede">\{\{ L\.moversLede \}\}<\/p>/);
  both('moversLede');
  for (const k of ['screenPeWhat', 'screenVolWhat', 'screenCashWhat', 'screenActionWhat']) both(k);
  assert.match(dict('ar'), /screenPeWhat:'كم سنة من ربح الشركة/);
  assert.match(logic, /insightBusyNote: ar \? 'كم مرة تجاوز تداول اليوم المعتاد/);
});

test('every evidence card carries a plain line before its drawing, and the shelf one under its heading', () => {
  assert.match(ct, /function card\(\{ dateline, primitive, title, lede, visual, limit, chip, more, key \}\)/);
  assert.match(ct, /h\('h3', \{ class: 'ct-title' \}, title\),[\s\S]{0,300}lede \? h\('p', \{ class: 'ct-lede' \}, lede\) : null,\s*h\('div', \{ class: 'ct-rule' \}\)/, 'the lede is not between the title and the drawing');
  assert.equal((ct.match(/^\s*lede: /gm) || []).length, 3, 'a card builder passes no lede');
  assert.match(ct, /h\('p', \{ class: 'ct-shelf-lede' \}, t\(/);
  assert.match(css, /#app \.ct-lede \{/); assert.match(css, /#app \.ct-shelf-lede \{/);
});

test('the three flow cards ask a question and keep their name as a term', () => {
  assert.match(ft, /flowCard = \(\{ key, dateline, link, go: onGo, title, question, lede, rows, limit \}\)/);
  assert.match(ft, /h\('h2', \{ className: 'ft-card-title' \}, question \|\| title, question \? ' ' : null, question \? h\('small', \{ className: 'h-term' \}, title\) : null\)/);
  assert.equal((ft.match(/^\s*question: t\(/gm) || []).length, 3, 'a flow card asks no question');
});

test('the lab card says what it tests, and keeps its name', () => {
  assert.match(ai, /class: 'aix-lab-title' \},\s*t\('Do forecasting models get it right\? We test them in public', 'هل تُصيب نماذج التنبؤ؟ نختبرها علناً'\), ' ',\s*h\('small', \{ class: 'h-term' \}, t\('The model lab', 'مختبر النماذج'\)\)/);
  assert.match(ai, /after five sessions we measure what they got right and what they got wrong/);
  assert.match(ai, /وبعد خمس جلسات نقيس ما أصاب وما أخطأ/);
});

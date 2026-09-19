/* ما تغيّر اليوم — three cards, three primitives, three limits.
 *
 * This shelf is the closest Home gets to §8: each card is one measurement
 * about one named company. What keeps a measurement from reading as a reason
 * is the limit line under the picture, so those sentences are asserted rather
 * than trusted. The other rule is that a card with no published figures is
 * not drawn at all — there is no placeholder card and no "—".
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { installDom } from './dom-stub.mjs';

installDom();
const { changedToday } = await import('../../public/esthmr/changed-today.js');

const ROOT = new URL('../../', import.meta.url);
const read = (p) => readFile(new URL(p, ROOT), 'utf8');
const all = (n) => (n ? [n, ...(n.children || []).flatMap(all)] : []);
const text = (n) => (n ? [n.text || '', ...(n.children || []).map(text)].join(' ') : '');
const byClass = (n, c) => all(n).filter((x) => String(x.attrs?.class || '').split(' ').includes(c));

const hooks = { openCompany() {}, openMarket() {}, heading: 'What changed today', note: 'a document for every one' };
const DATA = {
  marketDate: '17 September 2026',
  companies: [
    /* The shape `data.live()` really builds: the name is a record with a
       language in each field, not a string. Read as a string it printed
       "[object Object]" in the middle of an Arabic sentence. */
    { ticker: 'AAA', name: { en: 'Alpha', ar: 'ألفا' }, rv: 16.3, volume: 129552852, medianVolume: 7940108 },
    { ticker: 'BBB', name: 'Beta', rv: 1.1, volume: 100, medianVolume: 90 },
  ],
  indices: [{ label: 'EGX 30', labelAr: 'إيجي إكس 30',
    points: [100, 102, 101, 104, 106, 105, 103, 107, 108, 106, 104, 102] }],
  sectorOwnership: { links: [
    { held: 'CCC', heldName: 'Gamma', ownerName: 'A Bank', percent: 9.1, asOf: '2026-09-13' },
    { held: 'CCC', heldName: 'Gamma', ownerName: 'A Fund', percent: 3.4, asOf: '2026-09-02' },
  ] },
};

test('three cards, and each one is drawn in a different shape', () => {
  const node = changedToday(DATA, false, hooks);
  const cards = byClass(node, 'ct-card');
  assert.equal(cards.length, 3);
  const shapes = byClass(node, 'ct-primitive').map((n) => text(n).trim());
  assert.deepEqual(new Set(shapes).size, 3, `two cards share a shape: ${shapes.join(', ')}`);
});

test('every card says what its picture does not say', () => {
  const node = changedToday(DATA, false, hooks);
  const limits = byClass(node, 'ct-limit').map((n) => text(n));
  assert.equal(limits.length, 3, 'a card has no limit line');
  assert.match(limits.join(' '), /activity, not interest/, 'volume reads as interest');
  assert.match(limits.join(' '), /description, not an event/, 'a crossing reads as a signal');
  assert.match(limits.join(' '), /filed, not what is held/, 'a filing reads as a holding');
  const ar = byClass(changedToday(DATA, true, hooks), 'ct-limit').map((n) => text(n)).join(' ');
  assert.match(ar, /نشاط وليس اهتماماً/);
  assert.match(ar, /وصف، وليس واقعة/);
  assert.match(ar, /ما أُفصح عنه، لا ما هو مملوك/);
});

test('the volume card compares the session against the company’s own normal', () => {
  const node = changedToday(DATA, false, hooks);
  assert.match(text(byClass(node, 'ct-title')[0]), /AAA · Alpha traded 16\.3× its usual volume/);
  assert.doesNotMatch(text(node), /\[object /, 'the company name was read as a string');
  assert.match(text(byClass(changedToday(DATA, true, hooks), 'ct-title')[0]), /ألفا/,
    'the Arabic card shows the English name');
  // Both bars drawn, and the smaller one visible: 16× apart, a hairline on
  // the axis reads as one bar and no comparison at all.
  const bars = all(byClass(node, 'ct-visual')[0]).filter((n) => n.tag === 'rect');
  assert.ok(bars.length >= 2, 'only one bar was drawn');
  for (const bar of bars) assert.ok(Number(bar.attrs.height) >= 3, `a bar is ${bar.attrs.height}px tall`);
});

test('the ownership card names the part nobody has filed', () => {
  const node = changedToday(DATA, false, hooks);
  const share = byClass(node, 'ct-card')[2];
  assert.match(text(share), /12\.50% is disclosed/);
  // The remainder is the point of the card; absorbing it would turn "we know
  // an eighth of this" into "an eighth is all there is".
  assert.match(text(share), /not disclosed|غير معلن/);
});

test('a card with no published figures is absent, not empty', () => {
  const bare = changedToday({ marketDate: '17 September 2026', companies: [], indices: [], sectorOwnership: null },
    false, hooks);
  assert.equal(bare, null, 'an empty shelf was drawn anyway');
  const one = changedToday({ ...DATA, companies: [], sectorOwnership: null }, false, hooks);
  assert.equal(byClass(one, 'ct-card').length, 1, 'the missing cards left placeholders');
  // A stake set that already accounts for the whole company has no remainder
  // to name, and the card is about the remainder.
  const whole = changedToday({ ...DATA, companies: [], indices: [],
    sectorOwnership: { links: [{ held: 'C', heldName: 'G', ownerName: 'O', percent: 100, asOf: '2026-09-01' }] } },
  false, hooks);
  assert.equal(whole, null);
});

test('the shelf is on Home, ordered, and styled', async () => {
  const template = await read('public/esthmr/template.html');
  const home = template.indexOf('{{ isHome }}');
  assert.ok(template.indexOf('{{ changedToday }}', home) > template.indexOf('{{ aiCards }}', home),
    'the shelf is not placed after the record');
  const phone = await read('public/esthmr/chart-viewer.css');
  assert.match(phone, /\.journal-home>\.ct-shelf\{order:2\}/,
    'unnamed blocks fall to the bottom of the phone, and this one is not named');
  const css = await read('public/esthmr/home.css');
  for (const rule of ['.ct-card', '.ct-primitive', '.ct-limit']) {
    assert.ok(css.includes(rule), `${rule} has no styling`);
  }
});

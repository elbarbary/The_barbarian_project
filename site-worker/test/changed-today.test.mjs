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
  /* One real card, plus the quiet-day card that says so. `ct-none` is not a
     placeholder for a card that failed — it is the shelf's answer when there
     is nothing else verified, and the review asks for it in as many words. */
  const real = byClass(one, 'ct-card').filter((n) => !String(n.attrs.class).includes('ct-none'));
  assert.equal(real.length, 1, 'the missing cards left placeholders');
  assert.equal(byClass(one, 'ct-none').length, 1, 'the quiet day says nothing at all');
  assert.match(text(one), /No further verified changes/);
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
  /* It sat above the lab preview, because what changed today is evidence
     about the market and the lab was a reading of it. The lab left Home for
     its own screen on 19 September, so the shelf's neighbours are what pin
     it now: after the reader's own companies, and last on the page, because
     Home is the headline and then its evidence. */
  const shelf = template.indexOf('{{ changedToday }}', home);
  const watch = template.indexOf('home-watch', home);
  const end = template.indexOf('{{ isToday }}');
  assert.ok(shelf > 0 && shelf < end, 'the shelf is gone from Home');
  assert.ok(watch < shelf, 'the shelf rose above the reader’s own companies');
  assert.ok(!template.slice(home, end).includes('{{ aiCards }}'), 'the lab preview is back on Home');
  const phone = await read('public/esthmr/chart-viewer.css');
  assert.match(phone, /\.journal-home>\.ct-shelf\{order:4\}/,
    'unnamed blocks fall to the bottom of the phone, and this one is not named');
  const css = await read('public/esthmr/home.css');
  for (const rule of ['.ct-card', '.ct-primitive', '.ct-limit']) {
    assert.ok(css.includes(rule), `${rule} has no styling`);
  }
});

/* ── the bar each card has to clear ──────────────────────────────────────
 *
 * The shelf is headed "what changed today" and every session has a busiest
 * company, an index sitting on one side of its own average, and an ownership
 * filing somewhere in the archive. Three builders and three slots is an
 * arrangement that fills itself, so the shelf said three things changed on a
 * session where nothing did.
 *
 * The 18 September review: "Do not manufacture three stories on quiet days.
 * Show fewer with an honest 'No further verified changes.'"
 */
const quiet = (over) => changedToday({ ...DATA, ...over }, false, hooks);


test('an ordinary session is not a change', () => {
  /* 1.3x a company's own usual volume is a company trading. The card claims
     it traded unusually, and on this shelf that claim is the whole point. */
  const ordinary = quiet({
    companies: [{ ticker: 'AAA', name: { en: 'Alpha', ar: 'ألفا' }, rv: 1.3,
      volume: 1300000, medianVolume: 1000000 }],
    indices: [], sectorOwnership: null,
  });
  assert.equal(ordinary, null, 'an ordinary session was drawn as a change');
  const unusual = quiet({
    companies: [{ ticker: 'AAA', name: { en: 'Alpha', ar: 'ألفا' }, rv: 4.1,
      volume: 4100000, medianVolume: 1000000 }],
    indices: [], sectorOwnership: null,
  });
  assert.match(text(unusual), /4\.1× its usual volume/);
});

test('an index on the side of its average it was on yesterday is not news', () => {
  /* An index is always on one side of its own 30-session average, and it was
     on that side yesterday too. Drawn as a card it made a standing condition
     look like today's event — and being true every day, it took a slot every
     day. */
  const below = [10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 1, 1];
  const standing = quiet({ companies: [], sectorOwnership: null,
    indices: [{ label: 'EGX 30', points: below }] });
  assert.equal(standing, null, 'a standing condition was drawn as a change');

  // Same series, but the last session is the one that crossed.
  const crossing = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 10];
  const event = quiet({ companies: [], sectorOwnership: null,
    indices: [{ label: 'EGX 30', points: crossing }] });
  assert.ok(event, 'the session it crossed was not drawn');
  assert.match(text(event), /closed above its .* average/);
});

test('a filing from last spring is not today', () => {
  const co = (asOf) => ({ companies: [], indices: [], marketDate: '2026-09-17',
    sectorOwnership: { links: [
      { held: 'C', heldName: 'G', ownerName: 'O', percent: 30, asOf },
      { held: 'C', heldName: 'G', ownerName: 'P', percent: 12, asOf }] } });
  assert.equal(changedToday(co('2026-04-02'), false, hooks), null,
    'a filing five months old was drawn as today’s change');
  const fresh = changedToday(co('2026-09-14'), false, hooks);
  assert.ok(fresh, 'a filing from three days ago was dropped');
  assert.match(text(fresh), /is disclosed|companies/);
});

test('a quiet day says so instead of filling the row', () => {
  const one = quiet({
    companies: [{ ticker: 'AAA', name: { en: 'Alpha', ar: 'ألفا' }, rv: 9,
      volume: 9000000, medianVolume: 1000000 }],
    indices: [], sectorOwnership: null,
  });
  const cards = byClass(one, 'ct-card');
  const none = byClass(one, 'ct-none');
  assert.equal(cards.length - none.length, 1, 'more cards were drawn than had evidence');
  assert.equal(none.length, 1);
  assert.match(text(none[0]), /No further verified changes/);
  // And it explains itself rather than looking like a card that failed.
  assert.match(text(none[0]), /rests on a published document/);
});

test('the quiet day reads in Arabic too', () => {
  const one = changedToday({ ...DATA,
    companies: [{ ticker: 'AAA', name: { en: 'Alpha', ar: 'ألفا' }, rv: 9,
      volume: 9000000, medianVolume: 1000000 }],
    indices: [], sectorOwnership: null },
  true, { ...hooks, heading: 'ما تغيّر اليوم' });
  assert.match(text(one), /لا تغيّرات موثّقة أخرى/);
  assert.doesNotMatch(text(one), /No further verified/);
});

test('no date is invented when the session date is unknown', () => {
  /* `market.json` is not always there, and a multiple stamped with the wrong
     day is worse than one carrying none. This guarded `busyWhen` in logic.js
     until Home was rebuilt on 19 September; the cards carry the session date
     themselves now, so it is asserted against what they draw. */
  const none = changedToday({ ...DATA, marketDate: undefined }, false, hooks);
  for (const line of byClass(none, 'ct-dateline').map(text)) {
    assert.doesNotMatch(line, /undefined|NaN|Invalid/, `a date was invented: ${line}`);
  }
  // And the honest wording is still chosen — the absence of a date does not
  // silently turn a live session into a close.
  const live = changedToday({ ...DATA, isClose: false, livePrices: true }, false, hooks);
  const dl = byClass(live, 'ct-dateline').map(text).join(' | ');
  assert.match(dl, /session so far/, `a live session was labelled a close: ${dl}`);
  assert.doesNotMatch(dl, /· close ·/, `a live session was labelled a close: ${dl}`);
});

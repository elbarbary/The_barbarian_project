/* The company's own business cards — turn 4, block 11.
 *
 * Same family as ما تغيّر اليوم, same rules: every card is one measurement
 * about one company, the limit line under the picture is what keeps it a
 * measurement, and a card that cannot find its published figures is not
 * drawn rather than drawn empty.
 *
 * The one rule that is specific to this shelf: a dated timeline needs enough
 * events to be a cadence. Two dots on an axis is two dates with a line
 * between them, and a reader will read a trend off it.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installDom } from './dom-stub.mjs';

installDom();
const { companyCards } = await import('../../public/esthmr/company-cards.js');

const all = (n) => (n ? [n, ...(n.children || []).flatMap(all)] : []);
const text = (n) => (n ? [n.text || '', ...(n.children || []).map(text)].join(' ') : '');
const byClass = (n, c) => all(n).filter((x) => String(x.attrs?.class || '').split(' ').includes(c));

const ROW = { ticker: 'AAA', volume: 129552852, medianVolume: 7940108 };
const FILINGS = ['2026-03-04', '2026-05-11', '2026-06-30', '2026-08-02', '2026-09-01', '2026-09-15']
  .map((date, i) => ({ date, title: `Filing ${i}` }));
const base = {
  row: ROW, filings: FILINGS, marketDate: '17 September 2026', ar: false,
  heading: 'Two readings of this company',
  kindOf: () => 'Financial statement', shortDate: (d) => d,
};

test('both cards are drawn, each in its own primitive', () => {
  const node = companyCards(base);
  const primitives = byClass(node, 'ct-primitive').map(text).map((s) => s.trim());
  assert.deepEqual(primitives, ['PAIRED BARS', 'DATED TIMELINE']);
});

test('the volume card measures the company against itself, not the market', () => {
  const node = companyCards(base);
  const title = byClass(node, 'ct-title').map(text).join(' ');
  // 129,552,852 / 7,940,108 = 16.3
  assert.match(title, /16\.3× its usual volume/);
  assert.doesNotMatch(title, /market|index|sector/i);
});

test('every card says what its picture does not say', () => {
  const node = companyCards(base);
  const limits = byClass(node, 'ct-limit').map(text);
  assert.equal(limits.length, 2, 'a card was drawn without a limit line');
  assert.match(limits[0], /Volume is activity, not interest/);
  assert.match(limits[1], /What was filed, not everything that happened/);
});

test('a timeline is not drawn from two dates', () => {
  /* Evenly spaced dots invite a reader to see a rhythm. Two of them have no
     rhythm to show, so the card is absent rather than misleading. */
  const node = companyCards({ ...base, filings: FILINGS.slice(0, 2) });
  const primitives = byClass(node, 'ct-primitive').map(text).map((s) => s.trim());
  assert.deepEqual(primitives, ['PAIRED BARS']);
});

test('a company with no published volume gets no volume card', () => {
  const node = companyCards({ ...base, row: { ticker: 'AAA', volume: 129552852, medianVolume: 0 } });
  const primitives = byClass(node, 'ct-primitive').map(text).map((s) => s.trim());
  assert.deepEqual(primitives, ['DATED TIMELINE']);
  assert.doesNotMatch(text(node), /—/, 'an absent figure was drawn as a dash');
});

test('a company with neither draws no shelf at all', () => {
  assert.equal(companyCards({ ...base, row: null, filings: [] }), null);
});

test('the timeline says its spacing is order, not elapsed time', () => {
  /* The axis places events evenly however far apart they were, so two filings
     a year apart and two a day apart look identical. The note is the only
     thing standing between that and a reader inferring a pace. */
  const node = companyCards(base);
  assert.match(text(node), /Evenly spaced on the axis by order, not by the time between them/);
});

test('it reads in Arabic, with no object printed into a sentence', () => {
  const node = companyCards({ ...base, ar: true, heading: 'قراءتان عن هذه الشركة' });
  const body = text(node);
  assert.match(body, /حجمها المعتاد/);
  assert.match(body, /متى أفصحت هذه الشركة/);
  assert.doesNotMatch(body, /\[object/);
  // The multiple stays in Western digits, like every other figure on the site.
  assert.match(body, /16\.3/);
});

test('the dateline is the site’s own date, not a machine date', () => {
  /* Both shelves were handed the raw ISO string while every other dateline on
     the site runs through longDate, so an Arabic card read
     "2026-09-17 · إغلاق" — a bare machine date wedged into a sentence, its
     digits fighting the RTL run around them. */
  const node = companyCards({ ...base, marketDate: '2026-09-17',
    longDate: (iso) => (iso === '2026-09-17' ? '17 September 2026' : `long(${iso})`) });
  const datelines = byClass(node, 'ct-dateline').map(text).join(' ');
  assert.match(datelines, /17 September 2026/);
  assert.doesNotMatch(text(node).split('DATED TIMELINE')[0], /2026-09-17/,
    'the raw ISO date is still on the volume card');
});

/* The sectors, on aligned bars.
 *
 * The screen showed a grid of cards, and a card grid cannot answer the
 * question this table exists for — is this sector big, or is it busy? Those
 * are two facts and a card puts them in different places on every tile. The
 * tests here are about the three ways the table could lie while looking
 * right: by calling turnover an inflow, by drawing a company that did not
 * trade as one that held steady, and by rescaling the breadth bar so the
 * missing companies vanish out of the denominator.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { installDom } from './dom-stub.mjs';

installDom();
const { sectorTable } = await import('../../public/esthmr/sector-lens.js');

const ROOT = new URL('../../', import.meta.url);
const read = (p) => readFile(new URL(p, ROOT), 'utf8');
const t = (en, ar) => en;
const tAr = (en, ar) => ar;

/* The stub's own shape: text lives on `.text`, not in a string child. */
const all = (n) => (n ? [n, ...(n.children || []).flatMap(all)] : []);
const text = (n) => (n ? [n.text || '', ...(n.children || []).map(text)].join(' ') : '');
const byClass = (n, c) => all(n).filter((x) => String(x.attrs?.class || '').split(' ').includes(c));

const doc = {
  asOf: '2026-09-17', isClose: true,
  sectors: [
    { id: 'banks', name: 'Banks', nameAr: 'بنوك', cap: 800, sizeWeightedReturn: 1.25,
      members: [
        { ticker: 'AAA', cap: 500, value: 90, change: 1.2 },
        { ticker: 'BBB', cap: 300, value: 10, change: -0.4 },
        { ticker: 'CCC', cap: 0, value: 0, change: 0 },
        { ticker: 'DDD', cap: 0, value: 0, change: null },
      ] },
    { id: 'realestate', name: 'Real Estate', nameAr: 'عقارات', cap: 200, sizeWeightedReturn: -0.5,
      members: [{ ticker: 'EEE', cap: 200, value: 5, change: -0.5 }] },
  ],
};

test('size and activity are separate columns on one scale', () => {
  const node = sectorTable(doc, { ar: false, t });
  const rows = byClass(node, 'sx-row');
  assert.equal(rows.length, 2);
  // Ordered by activity, which is what the screen is asking about.
  assert.match(text(rows[0]), /Banks/);
  // Banks hold 80% of the covered value and took 95% of the trading; the two
  // figures are the point of the table and must not be the same number.
  const figures = byClass(rows[0], 'sx-cell').slice(0, 2).map((c) => text(c).trim());
  assert.match(figures[0], /80\.0%/, figures[0]);
  assert.match(figures[1], /95\.2%/, figures[1]);
});

test('a company that did not trade is hatched, never counted as unchanged', () => {
  const node = sectorTable(doc, { ar: false, t });
  const breadth = byClass(node, 'sx-breadth')[0];
  const widths = Object.fromEntries((breadth.children || []).map((i) =>
    [String(i.attrs.class), i.attrs.style]));
  assert.equal(widths['is-up'], 'width:25.00%', 'one of four rose');
  assert.equal(widths['is-flat'], 'width:25.00%', 'one of four was unchanged');
  assert.equal(widths['is-down'], 'width:25.00%', 'one of four fell');
  // The fourth is its own band, and the four add to the whole bar: a rescale
  // to the three that traded would make the absence disappear.
  assert.equal(widths['is-none'], 'width:25.00%', 'the company that did not trade was absorbed');
  const total = Object.values(widths).reduce((s, w) => s + parseFloat(w.replace('width:', '')), 0);
  assert.equal(Math.round(total), 100);
});

test('the table says what traded value is not', () => {
  // "Activity" is read as "inflow" by default, and a bar makes that reading
  // easier rather than harder.
  assert.match(text(sectorTable(doc, { ar: false, t })), /every trade has two sides/i);
  assert.match(text(sectorTable(doc, { ar: true, t: tAr })), /لكل صفقة طرفان/);
});

test('the weighted return is the document’s own, not re-derived here', () => {
  const node = sectorTable(doc, { ar: false, t });
  /* 1.25 is the document's `sizeWeightedReturn`; re-deriving it from the
     members here would give a different number, because two of the four did
     not trade and a mean over "everything with a change" is not a weighted
     return. */
  assert.match(text(byClass(node, 'sx-move')[0]), /\+1\.25%/);
  const missing = sectorTable({ sectors: [{ id: 'x', name: 'X', cap: 10,
    members: [{ cap: 10, value: 1, change: 2 }] }] }, { ar: false, t });
  assert.match(text(byClass(missing, 'sx-move')[0]), /—/,
    'a sector with no published weighted return shows a figure anyway');
});

test('an empty or unbuilt document draws nothing at all', () => {
  assert.equal(sectorTable(null, { ar: false, t }), null);
  assert.equal(sectorTable({ sectors: [] }, { ar: false, t }), null);
  // Every cap zero: a share of nothing is not 0%, it is unanswerable.
  assert.equal(sectorTable({ sectors: [{ id: 'x', name: 'X', members: [{ cap: 0, value: 0 }] }] },
    { ar: false, t }), null);
});

test('the sector table is on the screen and its styles are loaded', async () => {
  const template = await read('public/esthmr/template.html');
  const at = template.indexOf('{{ isSectors }}');
  assert.ok(at > 0);
  const screen = template.slice(at, at + 4000);
  assert.ok(screen.includes('{{ sectorTable }}'), 'the sectors screen does not render the table');
  const logic = await read('public/esthmr/logic.js');
  assert.match(logic, /sectorTable: st\.screen === 'sectors'/, 'the binding is never built');
  const css = await read('public/esthmr/journal.css');
  for (const rule of ['.sx-row', '.sx-breadth', '.sx-fill.is-act']) {
    assert.ok(css.includes(rule), `${rule} has no styling`);
  }
});

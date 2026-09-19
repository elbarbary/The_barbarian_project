/* One company's disclosed ownership, and the part nobody filed.
 *
 * This is the share bar's home case. The rule it exists for is arithmetic,
 * not style: normalising the named holders to 100% turns "we know a third of
 * this" into "a third is all there is", and a reader cannot tell the two
 * apart from a bar. The remainder is therefore drawn, hatched, and named.
 *
 * The second rule is about what the remainder MEANS. A stake under the
 * disclosure floor is never filed, so the gap is not a gap in this site's
 * coverage — it is a part nobody was required to name, and the card says so.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { installDom } from './dom-stub.mjs';

installDom();
const ROOT = new URL('../../', import.meta.url);
const read = (p) => readFile(new URL(p, ROOT), 'utf8');
const { companyOwnership } = await import('../../public/esthmr/sector-lens.js');
const { shareBar } = await import('../../public/esthmr/primitives.js');

const all = (n) => (n ? [n, ...(n.children || []).flatMap(all)] : []);
const text = (n) => (n ? [n.text || '', ...(n.children || []).map(text)].join(' ') : '');
const byClass = (n, c) => all(n).filter((x) => String(x.attrs?.class || '').split(' ').includes(c));
const t = (en) => en;
const tAr = (en, ar) => ar;

const DOC = { links: [
  { held: 'AAA', owner: 'B1', ownerName: 'A Bank', ownerNameAr: 'بنك', percent: 31, asOf: '2026-03-12' },
  { held: 'AAA', owner: 'F1', ownerName: 'A Fund', percent: 12, asOf: '2026-01-04' },
  { held: 'BBB', owner: 'X', ownerName: 'Elsewhere', percent: 40, asOf: '2026-05-01' },
] };

test('only this company’s filings, and the newest one dates the card', () => {
  const node = companyOwnership(DOC, 'AAA', { ar: false, t, shareBar });
  assert.ok(node, 'the card was not built');
  assert.doesNotMatch(text(node), /Elsewhere/, 'another company’s holder is on this card');
  assert.match(text(byClass(node, 'card-dateline')[0]), /2026-03-12/,
    'the card is dated by something other than its newest filing');
});

test('the part nobody filed is drawn and named, never absorbed', () => {
  const node = companyOwnership(DOC, 'AAA', { ar: false, t, shareBar });
  const parts = byClass(node, 'pv-share-part');
  const rest = byClass(node, 'pv-share-rest');
  assert.equal(parts.length, 2, 'the named holders are not both drawn');
  assert.equal(rest.length, 1, 'the undisclosed remainder was normalised away');
  // 43% is filed, so the remainder is 57% of the bar and not a rounding error.
  const width = parseFloat(String(rest[0].attrs.style).replace(/[^\d.]/g, ''));
  assert.ok(width > 50 && width < 60, `the remainder is ${width}% of the bar`);
});

test('the remainder is explained, in both languages', () => {
  assert.match(text(companyOwnership(DOC, 'AAA', { ar: false, t, shareBar })),
    /never filed|not required|was required to name/i,
    'the gap reads as missing coverage rather than as an unfiled stake');
  assert.match(text(companyOwnership(DOC, 'AAA', { ar: true, t: tAr, shareBar })),
    /لم يُلزَم أحد بتسميته/, 'the Arabic card drops the explanation');
});

test('nothing filed, or everything filed, draws nothing', () => {
  assert.equal(companyOwnership(DOC, 'ZZZ', { ar: false, t, shareBar }), null);
  assert.equal(companyOwnership(null, 'AAA', { ar: false, t, shareBar }), null);
  // A company already fully accounted for has no remainder, and the card is
  // about the remainder.
  const whole = { links: [{ held: 'AAA', ownerName: 'One', percent: 100, asOf: '2026-01-01' }] };
  assert.equal(companyOwnership(whole, 'AAA', { ar: false, t, shareBar }), null);
});

test('the card is on the company screen and styled', async () => {
  const template = await read('public/esthmr/template.html');
  const at = template.indexOf('{{ isCompany }}');
  assert.ok(template.indexOf('{{ companyOwnership }}', at) > at, 'the card is never rendered');
  const logic = await read('public/esthmr/logic.js');
  assert.match(logic, /companyOwnership: st\.screen === 'company'/, 'the binding is never built');
  const css = await read('public/esthmr/journal.css');
  assert.ok(css.includes('.co-own'), 'the card has no styling');
});

/* ── the last three documented events ───────────────────────────────────── */

test('the three changes are the most recent, never the most important', async () => {
  /* The comp calls this strip "the three most important changes". Nothing
     ESTHMR publishes says which of a company's filings mattered, and deciding
     here would be this publisher forming a view about a named security — the
     §8 line. Recency is a fact about the archive; importance is an opinion. */
  const logic = await read('public/esthmr/logic.js');
  const at = logic.indexOf('const recentChanges = (() => {');
  assert.ok(at > 0, 'the strip is not built');
  const body = logic.slice(at, logic.indexOf('\n    })();', at));
  assert.match(body, /localeCompare/, 'the rows are not ordered by date at all');
  assert.match(body, /slice\(0, 3\)/, 'the strip is not three');
  for (const word of ['important', 'best', 'biggest', 'score', 'rank']) {
    assert.ok(!body.toLowerCase().includes(word), `the strip ${word}s a company's filings`);
  }
  // English and Arabic both say what they are.
  assert.match(logic, /changesTitle:'The last three documented events'/);
  assert.match(logic, /changesTitle:'آخر ثلاث وقائع موثّقة'/);
});

test('every change carries a basis a reader can check', async () => {
  const logic = await read('public/esthmr/logic.js');
  // The kind of document, not a sentence about what it means.
  assert.match(logic, /changesBasis:'as filed with the exchange'/);
  assert.match(logic, /changesBasis:'كما أُفصح للبورصة'/);
  const template = await read('public/esthmr/template.html');
  const at = template.indexOf('co-changes-grid');
  assert.ok(at > 0, 'the strip is never rendered');
  const block = template.slice(at, at + 900);
  for (const field of ['ch.date', 'ch.text', 'ch.basis', 'ch.chip']) {
    assert.ok(block.includes(field), `a change row drops ${field}`);
  }
  // The link is only drawn when there is one: a chip that goes nowhere reads
  // as a document this site is hiding.
  assert.match(block, /sc-if value="\{\{ ch\.hasHref \}\}"/);
});

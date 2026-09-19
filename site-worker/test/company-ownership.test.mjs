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

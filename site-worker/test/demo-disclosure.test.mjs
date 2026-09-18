/* What the page may say about numbers it does not have.
 *
 * On 18 September 2026 a welcome pop-up replaced the banner that told a
 * signed-out reader the market on screen was invented, and shipped two more
 * things beside it: a ticker tape with EGX 30 at 55,664.80 and COMI at
 * 88.50 +1.15% written into the source — the live update never touched the
 * company rows — and a story-card generator that drew those same prices, plus
 * a "0.14 (very safe)" fragility score and "major shareholders buying", onto a
 * 1080x1920 card headed "the official trading session" with a download button
 * for Instagram.
 *
 * None of it was covered by a test, which is why the suite stayed green. These
 * are the three rules it broke.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const here = (p) => new URL(`../../public/esthmr/${p}`, import.meta.url);
const html = await readFile(here('index.html'), 'utf8');
const main = await readFile(here('main.js'), 'utf8');
/* The figures below are named in the comments that explain why they are gone,
   so the rules about them are read against the code alone. */
const code = main.replace(/\/\*[\s\S]*?\*\//g, '');
const shell = await readFile(here('shell.css'), 'utf8');
const worker = await readFile(new URL('../index.js', import.meta.url), 'utf8');

test('a signed-out reader is told the market is invented, and cannot dismiss it away', () => {
  assert.match(html, /id="demo-note"/, 'the disclosure strip is gone from the page');
  for (const id of ['demo-note-lead', 'demo-note-body']) {
    assert.match(html, new RegExp(`id="${id}"`), `${id} is missing`);
    assert.match(main, new RegExp(`setTxt\\('${id}'`), `${id} is never given words`);
  }
  // Both languages say it, and say what to do about it.
  assert.match(main, /demoLead: 'You are looking at an invented market\.'/);
  assert.match(main, /demoBody: 'Every ticker, price and figure below is made up for the demo\.'/);
  assert.match(main, /demoLead: 'أنت تنظر إلى سوق مُتخيَّلة\.'/);
  assert.match(main, /Sign in to read what companies actually filed/);

  // It is taken off screen by signing in, and by nothing else: `hidden` loses
  // to an author `display` rule, which is how the old banner once stayed up
  // over real data.
  assert.match(shell, /body\[data-signed="yes"\] \.demo-note \{ display: none; \}/);
  const dismissers = main.slice(main.indexOf('function dismissGate'), main.indexOf('function dismissGate') + 400);
  assert.doesNotMatch(dismissers, /demo-note/, 'dismissing the pop-up must not touch the disclosure');
  // And it is said inside the pop-up too, before anybody dismisses that.
  assert.match(html, /id="gate-demo"/);
  assert.match(main, /setTxt\('gate-demo'/);
});

test('the ticker tape ships no prices of its own', () => {
  const rows = main.slice(main.indexOf('const TICKER_ROWS = ['), main.indexOf('const TICKER_COMPANIES'));
  assert.ok(rows.includes("id: 'EGX30'"), 'the tape lost its rows');
  assert.doesNotMatch(rows, /val:|chg:/, 'a tape row carries a value written into the source');
  // The three prices that scrolled across the site for real companies.
  for (const invented of ['55,664.80', '88.50 ج.م', '68.20 ج.م', '49.50 ج.م', '21,192.70']) {
    assert.ok(!code.includes(invented), `${invented} is still written into main.js`);
  }
  // Nothing sourced yet means an empty tape, not a made-up one.
  assert.match(main, /var currentTickerData = \[\];/);
  assert.match(main, /if \(!currentTickerData\.length\)/);
  // A company row exists only while the reader's own market data holds it.
  assert.match(main, /function companyRows\(\) \{[\s\S]*?const d = realMarket\(\);[\s\S]*?if \(!d\) return \[\];/);
  assert.match(main, /function realMarket\(\)[\s\S]*?return d && !d\.demo/);
});

test('a story card is made of published figures, and is shut without them', () => {
  // The invented lines, gone: a fragility score, an insider sentence, a
  // liquidity word, for six named companies.
  for (const invented of ['fragility:', 'insider:', 'liquidity:', 'آمن جداً', 'شراء كبار مساهمين', 'STORY_INSTRUMENTS']) {
    assert.ok(!code.includes(invented), `${invented} is still in main.js`);
  }
  // What it draws now comes from the company's own row and the session it closed in.
  assert.match(main, /function storyInstruments\(\)[\s\S]*?const d = realMarket\(\);[\s\S]*?if \(!d\) return \{\};/);
  assert.match(main, /data\.session \? \{ label: '📅 جلسة الإغلاق'/);
  assert.match(main, /data\.volume \?/);
  assert.match(main, /data\.turnover \?/);
  // No card at all without a company: an empty canvas, never a fallback name.
  assert.match(main, /if \(!data\) \{[\s\S]*?ctx\.clearRect/);
  assert.match(main, /function setStoryReady\(\)[\s\S]*?btn\.disabled = !ready/);
  // The picker is filled from the data, so it cannot offer what has no close.
  assert.match(html, /<select id="story-select"><\/select>/);
  assert.match(main, /function fillStorySelect\(\)/);
  // The default note asserted a "safe financial position" for whoever was picked.
  assert.ok(!html.includes('تأكيد المركز المالي الآمن'), 'the default note still asserts a company is safe');
  assert.ok(!code.includes('تأكيد المركز المالي الآمن'));
});

test('admin by address has no lookalike domain on the list', () => {
  const block = worker.slice(worker.indexOf('export const SUPER_ADMIN_EMAILS'), worker.indexOf('export function isSuperAdmin'));
  const listed = [...block.matchAll(/'([^']+@[^']+)'/g)].map((m) => m[1]);
  assert.deepEqual(listed, ['elbarbary@aucegypt.edu', 'barbary@yozo.ai']);
  assert.ok(!block.includes('auceypt.edu'), 'a typo of the university domain is still an admin');
});

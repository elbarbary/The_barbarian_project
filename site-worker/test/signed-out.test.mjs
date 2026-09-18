/* What the page shows a reader who has not signed in, and what its numbers
 * may be made of.
 *
 * Until 18 September 2026 a signed-out reader was given `data.demo()`, an
 * openly invented exchange, and a banner said so. That day a welcome pop-up
 * replaced the banner and the suite stayed green — nothing had ever covered
 * the sentence — while a ticker tape shipped EGX 30 at 55,664.80 and COMI at
 * 88.50 +1.15% written into the source, and a story-card generator drew those
 * prices plus "0.14 (very safe)" and "major shareholders buying" onto an
 * Instagram card headed "the official trading session".
 *
 * The owner then closed the site: an open page is copied within hours by bots
 * and AI crawlers. So there is no demo to disclose any more — signed out
 * there is no dataset, no screens and no tape, and the door cannot be walked
 * around. These are the rules that hold that shut.
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
const auth = await readFile(here('auth.js'), 'utf8');
const worker = await readFile(new URL('../index.js', import.meta.url), 'utf8');

test('signed out there is nothing to read, and no way past the door', () => {
  // Nothing is fetched and nothing is kept: no demo, no companies.
  assert.match(main, /if \(!email\) \{[\s\S]*?component\.setData\(\{ demo: false, companies: \[\], series: \[\], fins: \[\] \}\);/);
  assert.ok(!code.includes('data.demo()'), 'the signed-out demo is loaded again');
  // And nothing of the app is on screen behind the gate.
  assert.match(shell, /body\[data-signed="no"\] #app,\s*\nbody\[data-signed="no"\] \.ticker-tape \{ display: none !important; \}/);

  // The gate goes away when a session says so, and for no other reason: the
  // close cross, "Browse as Guest", the scrim and Escape are gone with it.
  assert.match(main, /bar\.hidden = Boolean\(email\);/);
  for (const gone of ['dismissGate', 'gate_dismissed', 'gate-dismiss-btn', 'gate-close']) {
    assert.ok(!code.includes(gone), `${gone} still dismisses the gate`);
  }
  assert.ok(!html.includes('gate-dismiss-btn') && !html.includes('gate-close'),
    'the gate still has a way to close it');

  // Who the reader is comes from the worker, not from the address bar: a
  // `?login=<address>` parameter and its copy in localStorage are gone.
  assert.ok(!code.includes('session_user'), 'a client-side identity is still stored');
  assert.ok(!code.includes("q.get('login')"), 'the page still signs itself in by URL');
  assert.match(main, /void whoami\(\)\.then\(\(email\) => \{[\s\S]*?setSigned\(email\);\s*\n\s*return load\(email\);/);
});

test('the sign-in sheet opens above the gate it is the way through', () => {
  // The gate is permanent while signed out, so a sheet underneath it is a
  // door with no handle: at z-index 60 against the gate's 95 the reader
  // pressed "sign in" and typed into nothing.
  const z = (sel) => {
    const rule = shell.slice(shell.indexOf(sel));
    const found = rule.slice(0, rule.indexOf('}')).match(/z-index:\s*(\d+)/);
    return found ? Number(found[1]) : null;
  };
  const sheet = z('#esthmr-signin {');
  const gate = Number((shell.match(/z-index:\s*(\d+)\s*!important/) || [])[1]);
  assert.ok(sheet && gate, 'the gate or the sheet lost its stacking rule');
  assert.ok(sheet > gate, `the sign-in sheet (${sheet}) must sit above the gate (${gate})`);
});

test('the door says why it is there, in both languages', () => {
  assert.match(html, /id="gate-why"/);
  assert.match(main, /setTxt\('gate-why', words\.why\);/);
  // English and Arabic both name the reason and promise no password.
  assert.match(main, /why: 'Why sign in:[\s\S]*?bots and AI[\s\S]*?six-digit code/);
  assert.match(main, /why: 'لماذا التسجيل:[\s\S]*?الروبوتات وزواحف الذكاء[\s\S]*?بلا كلمة سر/);
  // The sign-in sheet says the same thing rather than the old demo sentence.
  assert.match(auth, /an open page is copied within hours by bots and AI crawlers/);
  assert.match(auth, /تُنسَخ خلال ساعات بواسطة الروبوتات وزواحف الذكاء الاصطناعي/);
  assert.ok(!auth.includes('You are looking at an invented market'),
    'the sheet still describes a demo that is no longer shown');
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

/* ── the door itself ──────────────────────────────────────────────────────
 *
 * Redesigned 18 September 2026 from the Claude Design project (turn 2). It
 * had been a modal with a stock photograph of a terminal, a headline calling
 * the product "the Bloomberg of the EGX", and three feature bullets — which
 * named another company, promised a terminal, and never said what the reader
 * would understand. It is now the promise the product is measured against,
 * three illustrative shapes, and the sign-in.
 *
 * Every rule below is about the fact that this is the ONLY page a signed-out
 * reader — or a crawler — can see.
 */

test('the door no longer claims to be another company\'s product', () => {
  /* Against `code`, not `main`: the comment that explains the removal has to
     name the thing it removed. */
  for (const source of [html, code]) {
    assert.ok(!/بلومبرج/.test(source), 'the Bloomberg claim is still in the door');
    assert.ok(!/Bloomberg of the EGX/i.test(source), 'the Bloomberg claim is still in the door');
  }
});

test('the one public page carries no figure about a named company', () => {
  /* The door is what a bot reads. A real ticker with a made-up number on it
     is the exact thing the door exists to prevent, and it would be read by
     everything that cannot get past it. */
  const doorStart = html.indexOf('<div id="gate"');
  const door = html.slice(doorStart, html.indexOf('</div>\n\n<!-- Signing in', doorStart));
  assert.ok(doorStart > 0, 'the door is gone');
  for (const ticker of ['COMI', 'TMGH', 'SWDY', 'ABUK', 'EGX 30', 'EGX30']) {
    assert.ok(!door.includes(ticker), `${ticker} is named on the signed-out door`);
  }
  assert.doesNotMatch(door, /\b\d{1,3}(,\d{3})+(\.\d+)?\b/, 'a price is written into the door');
  assert.doesNotMatch(door, /[+-]\d+(\.\d+)?%/, 'a signed percentage is written into the door');
});

test('every drawing on the door says it is illustrative, in both languages', () => {
  const marks = [...html.matchAll(/data-gate-illustrative/g)];
  const figures = [...html.matchAll(/<figure class="gate-shot">/g)];
  assert.equal(marks.length, figures.length,
    `${figures.length} drawings but ${marks.length} illustrative marks`);
  assert.ok(figures.length >= 2, 'the door lost its product visuals');
  assert.match(main, /illustrative: 'توضيحي · شركة أ'/);
  assert.match(main, /illustrative: 'illustrative · Company A'/);
  assert.match(main, /data-gate-illustrative/, 'the mark is never set from the copy table');
});

test('the door says it is not FRA-licensed, in both languages', () => {
  /* §8. Said where it is read, not only in a footer on a page behind the
     door. ESTHMR reports; it is not licensed to advise. */
  assert.match(html, /id="gate-legal"/);
  assert.match(main, /setTxt\('gate-legal', words\.legal\);/);
  assert.match(main, /legal: 'إستثمر جهة نشر بحثي وليست مرخّصة من الهيئة العامة للرقابة المالية/);
  assert.match(main, /not licensed by the Financial[\s\S]{0,40}Regulatory Authority/);
  assert.match(main, /We do not give investment advice/);
});

test('an English reader can turn the door around', () => {
  /* Arabic first — but the language switch used to live in the sidebar,
     which is behind the sign-in. An English reader met a page they could not
     read and no way out of it. */
  assert.match(html, /id="gate-lang"/);
  assert.match(main, /gateLang\.onclick/);
  assert.match(main, /lang: component\.state\.lang === 'ar' \? 'en' : 'ar'/);
  assert.match(main, /setTxt\('gate-lang', lang === 'ar' \? 'EN' : 'العربية'\);/);
});

test('the door is not forced left-to-right', () => {
  /* It was `direction: ltr !important`, and the door is Arabic: every
     sentence rendered with its full stop on the left-hand end. */
  const bare = shell.replace(/\/\*[\s\S]*?\*\//g, '');
  const gate = bare.slice(bare.indexOf('.gate {'), bare.indexOf('.gate[hidden]'));
  assert.ok(!/direction:\s*ltr/.test(gate), 'the door forces LTR onto Arabic copy');
});

test('signed out there is one sign-in, not two', () => {
  /* The account bar carries its own sign-in button and floated on top of the
     card. Signed out there is no account to show. */
  assert.match(shell, /body\[data-signed="no"\] \.account \{ display: none/);
});

test('the door stays flat, like every other island', () => {
  /* `design.css` switches shadows off on purpose: an island is told apart by
     its edge and its ground. The old card had a 28px radius and an 80px
     drop shadow. */
  const card = shell.slice(shell.indexOf('.gate-card {'), shell.indexOf('.gate-head {'));
  assert.match(card, /box-shadow:\s*none/, 'the door card has a shadow again');
  assert.match(card, /border-radius:\s*var\(--radius-island\)/, 'the door card sets its own radius');
});

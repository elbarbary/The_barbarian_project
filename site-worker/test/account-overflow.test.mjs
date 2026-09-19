/* §4: the mobile header is brand, search, account — and the rest is overflow.
 *
 * "At 390 px, the email/account controls crowd the header; the founder sees an
 * additional admin button." Both halves matter. The fixed corner strip took
 * space the header needed, and because the admin pill exists for exactly one
 * account, the person building the site saw a header no reader ever sees.
 *
 * The constraint that shapes the fix: those controls live OUTSIDE `#app`, and
 * dc.js rebuilds `#app` on every redraw (`root.replaceChildren(next)`). A node
 * relocated into it would come back without the listeners main.js binds by id
 * — sign-out would silently stop working. So nothing moves; CSS repositions
 * them, and an attribute on <body> opens the sheet.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const ROOT = new URL('../../', import.meta.url);
const read = (p) => readFile(new URL(p, ROOT), 'utf8');
const [template, shell, journal, logic, main, entry] = await Promise.all([
  read('public/esthmr/template.html'), read('public/esthmr/shell.css'),
  read('public/esthmr/journal.css'), read('public/esthmr/logic.js'),
  read('public/esthmr/main.js'), read('public/esthmr/index.html'),
]);

test('the header carries three things and the account is an icon', () => {
  const bar = template.slice(template.indexOf('<header class="journal-toolbar">'),
    template.indexOf('</header>'));
  assert.ok(bar.includes('journal-wordmark'), 'the brand left the header');
  assert.ok(bar.includes('journal-search'), 'the search left the header');
  assert.ok(bar.includes('journal-account'), 'there is no account control');
  assert.doesNotMatch(bar, />\{\{ preferencesLabel \}\}</,
    'the account control is still a text button');
  // An icon-only control still has to say what it is.
  assert.match(bar, /aria-label="\{\{ preferencesLabel \}\}"/);
  assert.match(bar, /aria-expanded="\{\{ preferencesOpen \}\}"/);
});

test('the account nodes are never moved into the rebuilt tree', () => {
  /* The whole reason this is a CSS problem and not a markup one. If these ids
     ever appear inside the template, they are inside `#app`, and the next
     redraw takes their listeners with it. */
  for (const id of ['id="who"', 'id="signout"', 'id="signin"', 'id="admin-link"', 'id="story-btn"']) {
    assert.ok(entry.includes(id), `${id} left index.html`);
    assert.ok(!template.includes(id), `${id} moved into the rebuilt template`);
  }
});

test('the sheet opens from an attribute, set in a handler and not in render', () => {
  assert.match(logic, /body\.setAttribute\('data-account-open', ''\)/);
  assert.match(logic, /body\.removeAttribute\('data-account-open'\)/);
  // In the click handler. A render that writes to the document renders again.
  const handler = logic.slice(logic.indexOf('togglePreferences: () => {'),
    logic.indexOf('togglePreferences: () => {') + 900);
  assert.match(handler, /setState\(\{ preferencesOpen: open \}\)/);
});

test('on a phone the controls are out of the layout until asked for', () => {
  const phone = shell.slice(shell.indexOf('@media (max-width: 700px)'));
  assert.match(phone, /body \.account \{ display: none !important; \}/);
  assert.match(phone, /body\[data-account-open\] \.account \{[\s\S]*?display: flex !important;/);
  // Hung from the measured bottom of the header, not a guessed offset.
  assert.match(phone, /top: calc\(var\(--head-h[^)]*\)[^;]*\) !important;/);
});

test('signing in never goes behind a menu', () => {
  /* A signed-out visitor has exactly one thing to do here. Putting it in an
     overflow they have to discover first would be the one change on this page
     that costs a reader the site. */
  const phone = shell.slice(shell.indexOf('@media (max-width: 700px)'));
  assert.match(phone, /body\[data-signed="no"\] \.account \{ display: flex !important; \}/);
});

test('the admin pill cannot shape a reader’s header', () => {
  /* It is display:none unless <body> carries `is-admin`, so it occupies no
     space for anybody else — and inside the sheet it costs the header nothing
     even for the one account that has it. */
  assert.match(shell, /\.account #admin-link \{\s*display: none !important;/);
  assert.match(shell, /body\.is-admin .*#admin-link:not\(\[hidden\]\)/);
});

test('the header measurement exists and updates with the page', () => {
  assert.match(main, /root\.style\.setProperty\('--head-h'/);
  assert.match(main, /querySelector\('\.journal-preferences-panel'\)/,
    'the sheet ignores the language panel and will open through it');
  // Re-measured on resize, like the tape height it sits beside.
  assert.match(main, /window\.addEventListener\('resize', measureTopChrome\)/);
});

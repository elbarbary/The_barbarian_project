import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

/* The way in to real data, and whether a finger or a keyboard can use it.
 *
 * Measured on an iPhone 13 viewport before this: the sign-in button 135x29,
 * the sheet's close 25x24, its input 43 tall and its submit 37. WCAG asks for
 * 44x44, and these are not incidental controls — they are the entrance. A
 * mis-tap on the close is a reader stuck in a dialog; a mis-tap on the submit
 * is a sign-in that did not happen.
 *
 * The sizes are asserted against the stylesheet rather than a rendered page so
 * they run everywhere the rest of the suite does. The numbers here are the
 * ones a browser actually reported afterwards: 151x44, 44x44, 48, 48.
 */
const css = await readFile(new URL('../../public/esthmr/shell.css', import.meta.url), 'utf8');
const auth = await readFile(new URL('../../public/esthmr/auth.js', import.meta.url), 'utf8');

/** The declared value of one property, from whichever rule declares it.
 *
 * Not "the first rule mentioning the selector": `#who` is mentioned by the
 * `[hidden]` guard several rules earlier, which declares no size, and taking
 * that one made this test fail against a stylesheet that was correct. */
function px(selector, property) {
  const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
  const found = rules.filter(([, head, body]) =>
    head.includes(selector) && new RegExp(`(^|[;\\s])${property}\\s*:`).test(body));
  assert.ok(found.length, `no rule sets ${property} on ${selector}`);
  const value = found[0][2].match(new RegExp(`${property}\\s*:\\s*(\\d+)px`));
  return value ? Number(value[1]) : null;
}

test('every control on the way in is big enough to hit', () => {
  // The account strip: the button that opens the sheet, and the one that
  // signs out again.
  assert.ok(px('.gate-cta', 'min-height') >= 44,
    'the sign-in button is under 44px; it was 135x29');
  assert.ok(px('#who', 'min-height') >= 44, 'the account chip is under 44px');

  // The sheet.
  assert.ok(px('.si-close', 'width') >= 44 && px('.si-close', 'height') >= 44,
    'the sheet close is under 44x44; it was 25x24, in a corner');
  assert.ok(px('.si-step input', 'min-height') >= 48,
    'the sign-in input is under 48px');
  assert.ok(px('.si-step button[type=submit]', 'min-height') >= 48,
    'the sign-in submit is under 48px');
  assert.ok(px('.si-back', 'min-height') >= 44, 'the back link is under 44px');
});

/* Anything given an author `display` stops answering to `hidden`.
 *
 * `site.test.mjs` guards the classes auth.js hides. These are the ids main.js
 * hides, which grew author `display` rules the moment they were made 44px —
 * the same trap that left the demo banner on screen over real data and both
 * steps of this sheet visible at once. Third time.
 */
test('the account controls that are hidden by attribute still disappear', () => {
  for (const id of ['who', 'signin', 'signout']) {
    assert.match(css, new RegExp(`#${id}\\[hidden\\][^{]*\\{[^}]*display\\s*:\\s*none`),
      `#${id} has an author display rule, so "hidden" cannot hide it`);
  }
});

/* Opening the sheet adds two things to `document`; closing it must remove
 * them. It used to remove the Escape listener ONLY when Escape was what
 * closed the sheet — so closing with the × or the scrim, which is how it is
 * usually closed, left one behind on every open, each holding a `close` bound
 * to a `wrap` no longer in the document.
 */
test('closing the sheet removes what opening it added, however it is closed', () => {
  const close = auth.slice(auth.indexOf('const close = ()'), auth.indexOf('function onKey'));
  assert.match(close, /removeEventListener\('keydown', onKey, true\)/,
    'close() leaves its keydown listener on document');
  const added = [...auth.matchAll(/document\.addEventListener\('(\w+)'/g)].map((m) => m[1]);
  const removed = [...auth.matchAll(/document\.removeEventListener\('(\w+)'/g)].map((m) => m[1]);
  assert.deepEqual([...new Set(added)].sort(), [...new Set(removed)].sort(),
    'every listener opening adds must be removed by close()');
  // And the sheet hands focus back, so dismissing it does not lose the reader's place.
  assert.match(close, /opener[\s\S]{0,120}focus\(\)/,
    'focus is not returned to whatever opened the sheet');
});

/* `aria-modal="true"` says the rest of the page is inert. Fifty-one focusable
 * controls behind the scrim were still in the tab ring, so a keyboard reader
 * tabbed out of a modal they had been told was modal.
 *
 * Two gentler versions failed first: wrapping at the ends of the list assumes
 * the browser's tab order matches `querySelectorAll`, and with the challenge
 * widget present it does not; a `focusin` backstop never fired at all, because
 * tabbing past the last control leaves the document and nothing receives
 * focus. So Tab is walked by hand, which is what this asserts.
 */
test('the sheet keeps the keyboard inside it', () => {
  assert.match(auth, /aria-modal="true"/, 'the sheet no longer claims to be modal');
  const at = auth.indexOf('function onKey');
  const onKey = auth.slice(at, auth.indexOf('loadTurnstile()', at));
  assert.match(onKey, /e\.key !== 'Tab'/, 'Tab is not handled');
  assert.match(onKey, /e\.preventDefault\(\)/, 'the browser still decides where Tab goes');
  assert.match(onKey, /%\s*inside\.length/, 'the ring does not wrap');
  assert.match(onKey, /e\.shiftKey/, 'Shift+Tab is not handled, so back leaves the sheet');
  assert.match(onKey, /'Escape'/, 'Escape no longer closes the sheet');
});

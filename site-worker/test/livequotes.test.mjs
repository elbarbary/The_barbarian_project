import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installDom } from './dom-stub.mjs';
installDom();
const data = await import('../../public/esthmr/data.js');

/* An optional feed must not be able to hold the page.
 *
 * `live()` awaits the quotes overlay in the same Promise.all as the company
 * directory and the market document, and the overlay was a bare fetch with no
 * deadline. A quotes Worker that accepted the connection and never answered
 * — a stalled upstream, a half-open socket on a phone that changed networks —
 * kept every signed-in screen blank behind it. Every other read in this file
 * had a deadline; the one that was allowed to fail did not. */
test('a stalled quotes feed gives up on its deadline and yields null', async () => {
  const orig = globalThis.fetch;
  // A faithful stall: never answers, and only lets go when told to. A fetch
  // that carries no signal — the bare one this replaces — hangs here for
  // good, which is exactly what it did to readers. The first version of this
  // mock threw on the missing signal, so the old code "failed fast" and the
  // test could not tell it from the fix.
  globalThis.fetch = (_url, init = {}) => new Promise((_, reject) => {
    if (init.signal) init.signal.addEventListener('abort', () => reject(new Error('aborted')));
  });
  const clock = new Promise((resolve) => setTimeout(() => resolve('still waiting'), 1500));
  try {
    const got = await Promise.race([data.liveQuotes(20), clock]);
    assert.equal(got, null, 'a dead feed must read as "no overlay", not hang the page');
  } finally { globalThis.fetch = orig; }
});

test('the deadline is short enough to be a deadline', () => {
  // Long enough for a slow phone, short enough that the exchange's own
  // numbers are never more than this far behind a dead overlay.
  assert.ok(data.QUOTES_DEADLINE_MS >= 2000 && data.QUOTES_DEADLINE_MS <= 10000,
    `${data.QUOTES_DEADLINE_MS}ms is not a deadline a reader would notice`);
});

test('a feed that answers in time still comes through', async () => {
  const orig = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    quotes: { COMI: { c: 1 } }, session: { open: true } }), { status: 200 });
  try {
    const got = await data.liveQuotes(1000);
    assert.equal(got.quotes.COMI.c, 1);
  } finally { globalThis.fetch = orig; }
});

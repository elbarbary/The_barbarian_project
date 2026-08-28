/* Who carries the sign-in code, and in what order.
 *
 * A code that never arrives is a reader who cannot get in, and the failure is
 * invisible from outside — the endpoint answers the same either way, on
 * purpose, so it cannot be used to test who has an inbox. That makes the
 * fallback order something to test rather than something to watch.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { providerChain, deliver, parseAddress } = await import('../index.js');

const FIVE = 'k1,k2,k3,k4,k5';
const SP = { SENDPULSE_ID: 'id', SENDPULSE_SECRET: 'shh' };
const FROM = { MAIL_FROM: 'ESTHMR <esthmr@thebarbarianproject.com>' };

const ids = (env) => providerChain(env).map((s) => s.id);

/* ── the order ─────────────────────────────────────────────────────────── */

test('SendPulse sits after the first Resend key, before the other four', () => {
  assert.deepEqual(ids({ RESEND_API_KEYS: FIVE, ...SP, ...FROM }),
    ['resend#1', 'sendpulse', 'resend#2', 'resend#3', 'resend#4', 'resend#5']);
});

test('without its credentials the chain is exactly what it was before', () => {
  assert.deepEqual(ids({ RESEND_API_KEYS: FIVE, ...FROM }),
    ['resend#1', 'resend#2', 'resend#3', 'resend#4', 'resend#5']);
  assert.deepEqual(ids({ RESEND_API_KEYS: FIVE, SENDPULSE_ID: 'id', ...FROM }),
    ['resend#1', 'resend#2', 'resend#3', 'resend#4', 'resend#5']);
});

test('SendPulse is dropped when there is no address it could send as', () => {
  // Resend's sandbox domain belongs to Resend. SendPulse would refuse it on
  // every send, so a chain that lists it is a chain with a guaranteed failure
  // in the middle of it.
  assert.deepEqual(ids({ RESEND_API_KEYS: 'k1', ...SP }), ['resend#1']);
  assert.deepEqual(ids({ RESEND_API_KEYS: 'k1', ...SP,
    MAIL_FROM: 'ESTHMR <onboarding@resend.dev>' }), ['resend#1']);
  // But its own verified sender counts, even when Resend's differs.
  assert.deepEqual(ids({ RESEND_API_KEYS: 'k1', ...SP,
    MAIL_FROM: 'ESTHMR <onboarding@resend.dev>',
    SENDPULSE_FROM: 'ESTHMR <me@example.com>' }), ['resend#1', 'sendpulse']);
});

test('SendPulse can be the only provider', () => {
  assert.deepEqual(ids({ ...SP, ...FROM }), ['sendpulse']);
  assert.deepEqual(ids({}), []);
});

/* ── giving up, and not giving up ──────────────────────────────────────── */

const CHAIN = providerChain({ RESEND_API_KEYS: FIVE, ...SP, ...FROM });

/** An attempt that answers from a script of statuses, and records the order. */
function scripted(byId) {
  const tried = [];
  return {
    tried,
    attempt: async (step) => {
      tried.push(step.id);
      const answer = byId[step.id] ?? byId.default ?? { ok: true };
      if (answer instanceof Error) throw answer;
      return answer;
    },
  };
}

test('the first key that takes it ends the walk', async () => {
  const s = scripted({});
  assert.equal(await deliver(CHAIN, s.attempt), 'resend#1');
  assert.deepEqual(s.tried, ['resend#1']);
});

test('a revoked first key falls through to SendPulse, not to the fifth key', async () => {
  const s = scripted({ 'resend#1': { ok: false, status: 401 } });
  assert.equal(await deliver(CHAIN, s.attempt), 'sendpulse');
  assert.deepEqual(s.tried, ['resend#1', 'sendpulse']);
});

test('a refused sender skips the remaining keys but still tries SendPulse', async () => {
  // This is the case the whole arrangement exists for. A 403 is Resend saying
  // the MESSAGE is not allowed — an unverified domain, a recipient this sender
  // may not reach — and all five keys answer it identically. SendPulse
  // verifies its sender separately, so it can still deliver.
  const s = scripted({ default: { ok: false, status: 403, detail: 'domain not verified' },
                       sendpulse: { ok: true } });
  assert.equal(await deliver(CHAIN, s.attempt), 'sendpulse');
  assert.deepEqual(s.tried, ['resend#1', 'sendpulse']);
});

test('a 403 on the first key does not spend the other four', async () => {
  const s = scripted({ default: { ok: false, status: 403 } });
  await assert.rejects(() => deliver(CHAIN, s.attempt));
  assert.deepEqual(s.tried, ['resend#1', 'sendpulse']);   // never resend#2..5
});

test('an exhausted account walks the whole chain', async () => {
  const s = scripted({ default: { ok: false, status: 429 }, 'resend#4': { ok: true } });
  assert.equal(await deliver(CHAIN, s.attempt), 'resend#4');
  assert.deepEqual(s.tried, ['resend#1', 'sendpulse', 'resend#2', 'resend#3', 'resend#4']);
});

test('SendPulse being down costs nothing but the attempt', async () => {
  const s = scripted({ 'resend#1': { ok: false, status: 500 },
                       sendpulse: new Error('connect ECONNREFUSED'),
                       'resend#2': { ok: true } });
  assert.equal(await deliver(CHAIN, s.attempt), 'resend#2');
  assert.deepEqual(s.tried, ['resend#1', 'sendpulse', 'resend#2']);
});

test('when everything refuses, the error names every attempt', async () => {
  const s = scripted({ default: { ok: false, status: 429, detail: 'rate limited' } });
  await assert.rejects(() => deliver(CHAIN, s.attempt), (error) => {
    for (const id of ['resend#1', 'sendpulse', 'resend#5']) {
      assert.ok(error.message.includes(id), `the failure does not mention ${id}`);
    }
    return true;
  });
});

/* ── the from address ──────────────────────────────────────────────────── */

test('an address is split the way SendPulse wants it', () => {
  assert.deepEqual(parseAddress('ESTHMR <esthmr@thebarbarianproject.com>'),
    { name: 'ESTHMR', email: 'esthmr@thebarbarianproject.com' });
  assert.deepEqual(parseAddress('"ESTHMR" <a@b.com>'), { name: 'ESTHMR', email: 'a@b.com' });
  assert.deepEqual(parseAddress('a@b.com'), { name: 'ESTHMR', email: 'a@b.com' });
  assert.deepEqual(parseAddress('<a@b.com>'), { name: 'ESTHMR', email: 'a@b.com' });
});

/* ── which credential SendPulse actually handed out ────────────────────── */

const { sendPulseCredential } = await import('../index.js');
const HEX = 'a'.repeat(32);

test('an OAuth pair is exchanged, an API token is presented as it is', () => {
  assert.deepEqual(sendPulseCredential({ SENDPULSE_ID: HEX, SENDPULSE_SECRET: HEX }),
    { kind: 'oauth', id: HEX, secret: HEX });
  assert.deepEqual(sendPulseCredential({ SENDPULSE_TOKEN: 'sp_abcdef_0123' }),
    { kind: 'token', token: 'sp_abcdef_0123' });
  assert.equal(sendPulseCredential({}), null);
});

test('a token pasted into SENDPULSE_SECRET is still a token', () => {
  // This is the live configuration, and the reason the integration failed for
  // two rounds: a 7-digit account number in SENDPULSE_ID and a 74-character
  // API token in SENDPULSE_SECRET. Exchanging those two is refused with
  // `invalid_client`, which reads exactly like a wrong password and is not one.
  // Neither value is half of a 32-hex pair, so the secret is the token.
  const live = { SENDPULSE_ID: '8123456', SENDPULSE_SECRET: 'sp_abcdef_' + 'x'.repeat(64) };
  assert.deepEqual(sendPulseCredential(live),
    { kind: 'token', token: live.SENDPULSE_SECRET });
  assert.deepEqual(ids({ RESEND_API_KEYS: 'k1', ...live, ...FROM }),
    ['resend#1', 'sendpulse']);
});

test('an explicit token wins over anything else set', () => {
  assert.deepEqual(
    sendPulseCredential({ SENDPULSE_TOKEN: 'tok', SENDPULSE_ID: HEX, SENDPULSE_SECRET: HEX }),
    { kind: 'token', token: 'tok' });
});

test('whitespace around a pasted value never reaches the wire', () => {
  // `wrangler secret put` keeps whatever it is handed, newline included.
  assert.deepEqual(sendPulseCredential({ SENDPULSE_TOKEN: '  tok\n' }),
    { kind: 'token', token: 'tok' });
  assert.deepEqual(sendPulseCredential({ SENDPULSE_ID: ` ${HEX} `, SENDPULSE_SECRET: `${HEX}\n` }),
    { kind: 'oauth', id: HEX, secret: HEX });
});

test('half a pair is not a pair', () => {
  // An id with no secret cannot be exchanged and is not a token either.
  assert.equal(sendPulseCredential({ SENDPULSE_ID: HEX }), null);
  // A secret with no id is treated as a token, which is the whole point.
  assert.deepEqual(sendPulseCredential({ SENDPULSE_SECRET: HEX }),
    { kind: 'token', token: HEX });
});

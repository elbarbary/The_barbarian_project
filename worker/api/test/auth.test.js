/**
 * Token verification (spec §53).
 *
 * These are the tests that matter most in the whole backend. Everything else
 * here is a list of tickers; this is the thing standing between one reader's
 * account and anybody who can construct an HTTP request. Each case below is a
 * real forgery attempt against the real verifier, using genuinely signed
 * tokens.
 */

import { env } from 'cloudflare:test';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { AuthError, verifyIdToken } from '../src/auth.js';
import { installJwks, makeKeypair, serveKeys, signToken, tamper } from './tokens.js';

const CONFIG = { GOOGLE_CLIENT_IDS: 'test-client-id', APPLE_CLIENT_IDS: 'com.barbarian.app' };

let keypair;

beforeAll(installJwks);

beforeEach(async () => {
  keypair = await makeKeypair();
  serveKeys([keypair.publicJwk], 'google');
  serveKeys([keypair.publicJwk], 'apple');
});

async function verify(token, provider = 'google', config = CONFIG) {
  return verifyIdToken(token, provider, { ...env, ...config });
}

describe('a token that checks out', () => {
  it('is accepted and yields its subject', async () => {
    const claims = await verify(await signToken(keypair));
    expect(claims.sub).toBe('subject-1');
  });

  it('accepts Google\'s other spelling of its own issuer', async () => {
    // Google has issued tokens under both `accounts.google.com` and
    // `https://accounts.google.com` for years. Accepting only one locks out an
    // unpredictable share of users.
    const claims = await verify(await signToken(keypair, { iss: 'accounts.google.com' }));
    expect(claims.sub).toBe('subject-1');
  });

  it('accepts an Apple token against the Apple audience', async () => {
    const token = await signToken(keypair, {
      iss: 'https://appleid.apple.com',
      aud: 'com.barbarian.app',
    });
    const claims = await verify(token, 'apple');
    expect(claims.sub).toBe('subject-1');
  });
});

describe('forgeries', () => {
  it('rejects a payload edited after signing', async () => {
    // The signature covers header and payload, so changing `sub` to somebody
    // else's is exactly the attack that must not work.
    const token = await tamper(await signToken(keypair), { sub: 'somebody-else' });
    await expect(verify(token)).rejects.toThrow(/signature/);
  });

  it('rejects alg: none without reaching for a key', async () => {
    const token = await signToken(keypair, {}, { alg: 'none' });
    await expect(
      verifyIdToken(token, 'google', { ...env, ...CONFIG }),
    ).rejects.toThrow(/algorithm/);
  });

  it('rejects HS256, where the public key would be the shared secret', async () => {
    const token = await signToken(keypair, {}, { alg: 'HS256' });
    await expect(
      verifyIdToken(token, 'google', { ...env, ...CONFIG }),
    ).rejects.toThrow(/algorithm/);
  });

  it('rejects a token signed by a different key', async () => {
    const attacker = await makeKeypair();
    const token = await signToken({ ...attacker, kid: keypair.kid });
    // The JWKS still serves *our* key under that kid.
    await expect(verify(token)).rejects.toThrow(/signature/);
  });

  it('rejects a token minted for another application', async () => {
    // A valid, correctly signed Google token from any other app in the world.
    const token = await signToken(keypair, { aud: 'someone-elses-app' });
    await expect(verify(token)).rejects.toThrow(/different application/);
  });

  it('rejects a token from the wrong issuer', async () => {
    const token = await signToken(keypair, { iss: 'https://evil.example' });
    await expect(verify(token)).rejects.toThrow(/issuer/);
  });

  it('rejects an Apple-issued token presented as a Google one', async () => {
    const token = await signToken(keypair, { iss: 'https://appleid.apple.com' });
    await expect(verify(token, 'google')).rejects.toThrow(/issuer/);
  });

  it('rejects an expired token', async () => {
    const past = Math.floor(Date.now() / 1000) - 7200;
    const token = await signToken(keypair, { iat: past, exp: past + 60 });
    await expect(verify(token)).rejects.toThrow(/expired/);
  });

  it('rejects a token dated in the future', async () => {
    const ahead = Math.floor(Date.now() / 1000) + 7200;
    const token = await signToken(keypair, { iat: ahead, exp: ahead + 3600 });
    await expect(verify(token)).rejects.toThrow(/future/);
  });

  it('rejects a token with no subject', async () => {
    const token = await signToken(keypair, { sub: undefined });
    await expect(verify(token)).rejects.toThrow(/subject/);
  });

  it('rejects gibberish without reaching for a key', async () => {
    await expect(
      verifyIdToken('not-a-token', 'google', { ...env, ...CONFIG }),
    ).rejects.toThrow(/malformed/);
  });

  it('rejects an unknown provider', async () => {
    await expect(
      verifyIdToken('a.b.c', 'facebook', { ...env, ...CONFIG }),
    ).rejects.toThrow(/unknown sign-in provider/);
  });
});

describe('deployment safety', () => {
  it('refuses every token when no client ids are configured', async () => {
    // An empty allow-list must fail closed. Read as "allow anything", this one
    // line would accept a correctly signed Google token from any app at all.
    const token = await signToken(keypair);
    await expect(verify(token, 'google', { GOOGLE_CLIENT_IDS: '' })).rejects.toThrow(
      /no client ids configured/,
    );
  });

  it('accepts any of several configured client ids', async () => {
    // iOS, Android and web builds each carry their own.
    const token = await signToken(keypair, { aud: 'android-client' });
    const claims = await verify(token, 'google', {
      GOOGLE_CLIENT_IDS: 'ios-client, android-client ,web-client',
    });
    expect(claims.sub).toBe('subject-1');
  });

  it('reports an unreachable provider as a server problem, not a bad token', async () => {
    serveKeys(null, 'google');
    // The provider now answers with a 500, standing in for an outage.
    // A signed-in user whose sign-in is perfectly good must not be told their
    // token is bad because Google had a bad minute.
    const error = await verifyIdToken(
      await signToken(keypair, { sub: `unreachable-${crypto.randomUUID()}` }),
      'google',
      { ...env, ...CONFIG },
    ).catch((e) => e);

    expect(error).toBeInstanceOf(AuthError);
    expect(error.status).toBe(503);
  });
});

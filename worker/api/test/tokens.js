/**
 * Real RSA-signed tokens for the auth tests.
 *
 * The tests mint genuine RS256 JWTs with a keypair generated here and serve the
 * matching public key from a stubbed JWKS endpoint. Nothing is mocked inside
 * the code under test — the signature is really verified, the issuer, audience
 * and expiry are really checked. A test that stubbed `verifyIdToken` itself
 * would pass just as happily against an implementation that trusted the token's
 * `alg` header, which is the exact bug it most needs to catch.
 */

import { fetchMock } from 'cloudflare:test';

export const GOOGLE_JWKS = 'https://www.googleapis.com/oauth2/v3/certs';
export const APPLE_JWKS = 'https://appleid.apple.com/auth/keys';

const encoder = new TextEncoder();

function base64Url(bytes) {
  const binary = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function encodeJson(value) {
  return base64Url(encoder.encode(JSON.stringify(value)));
}

/**
 * A fresh keypair with a unique `kid`.
 *
 * Unique because the verifier caches each provider's key set at the edge, and
 * that cache outlives a single test. Reusing one `kid` across tests means the
 * second test verifies against the first test's public key and fails for a
 * reason that has nothing to do with what it is checking.
 */
export async function makeKeypair(kid = `test-key-${crypto.randomUUID()}`) {
  const pair = await crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['sign', 'verify'],
  );
  const jwk = await crypto.subtle.exportKey('jwk', pair.publicKey);
  return {
    kid,
    privateKey: pair.privateKey,
    publicJwk: { ...jwk, kid, use: 'sig', alg: 'RS256' },
  };
}

let served = { google: [], apple: [] };
let installed = false;

/**
 * Install one persistent key endpoint per provider.
 *
 * Persistent and answered by a callback, rather than a fresh stub per request,
 * because the number of times the verifier actually fetches is not knowable
 * from the test: it caches key sets at the edge, so the first call in a test
 * fetches and the rest may not. Counting stubs meant either leaving unconsumed
 * ones behind — which undici hands to the *next* test, so it verifies against a
 * previous test's key — or starving a test that needed one more.
 */
export function installJwks() {
  if (installed) return;
  installed = true;
  for (const [provider, url] of [['google', GOOGLE_JWKS], ['apple', APPLE_JWKS]]) {
    const target = new URL(url);
    fetchMock
      .get(target.origin)
      .intercept({ path: target.pathname, method: 'GET' })
      .reply(() => {
        const keys = served[provider];
        // `null` stands for the provider being unreachable.
        if (keys === null) return { statusCode: 500, data: 'unavailable' };
        return {
          statusCode: 200,
          data: JSON.stringify({ keys }),
          responseOptions: { headers: { 'content-type': 'application/json' } },
        };
      })
      .persist();
  }
}

/** What the key endpoints answer with from now on. `null` = unreachable. */
export function serveKeys(keys, provider = 'google') {
  served[provider] = keys;
}

/**
 * A signed JWT. `header` and `claims` are merged over sane defaults so a test
 * can change exactly one thing and say what it is testing.
 */
export async function signToken(keypair, claims = {}, header = {}) {
  const fullHeader = { alg: 'RS256', kid: keypair.kid, typ: 'JWT', ...header };
  const now = Math.floor(Date.now() / 1000);
  const fullClaims = {
    iss: 'https://accounts.google.com',
    aud: 'test-client-id',
    sub: 'subject-1',
    iat: now,
    exp: now + 3600,
    ...claims,
  };

  const signingInput = `${encodeJson(fullHeader)}.${encodeJson(fullClaims)}`;
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    keypair.privateKey,
    encoder.encode(signingInput),
  );
  return `${signingInput}.${base64Url(signature)}`;
}

/** A token whose payload has been edited after signing. */
export async function tamper(token, claims) {
  const [header, , signature] = token.split('.');
  const original = JSON.parse(
    new TextDecoder().decode(
      Uint8Array.from(
        atob(token.split('.')[1].replaceAll('-', '+').replaceAll('_', '/')),
        (c) => c.charCodeAt(0),
      ),
    ),
  );
  return `${header}.${encodeJson({ ...original, ...claims })}.${signature}`;
}

export function authHeaders(token, provider = 'google') {
  return {
    authorization: `Bearer ${token}`,
    'x-auth-provider': provider,
    'content-type': 'application/json',
  };
}

/**
 * Who is calling, proved against Apple and Google (spec §30, §53).
 *
 * The app signs in with Apple or Google and sends the resulting **ID token** on
 * every write. This file verifies that token and turns it into a user id. There
 * is no session, no refresh token and no cookie anywhere in the system, and
 * that absence is the design rather than an omission:
 *
 *   * an ID token is already short-lived and already signed by a party we
 *     trust, so re-checking it costs one cached JWKS lookup and removes the
 *     entire class of bugs that comes with issuing and storing our own
 *     sessions — fixation, rotation, revocation, theft from local storage;
 *   * reads of public data never come here at all, so the per-request cost
 *     falls only on writes, which are rare;
 *   * "verify authentication server-side" (§53) becomes literally true on
 *     every request rather than true once at the start of a session.
 *
 * What we deliberately do not do is trust anything the client says about who it
 * is. The user id is derived from the token's `sub` claim after the signature
 * checks out; a caller cannot name themselves (§53, "prevent users from forging
 * another user's ID").
 */

/**
 * The two providers, their issuers and where their public keys live.
 *
 * `aud` is checked against configuration rather than hardcoded because the
 * audience differs per platform and per build. Client IDs are public values —
 * they ship inside every copy of the app — so they belong in `vars`, not in
 * secrets (§53: never put private secrets inside Flutter; the corollary is that
 * a value already inside Flutter is not a secret).
 */
export const PROVIDERS = {
  google: {
    // Google has issued tokens under both spellings for years and still does.
    issuers: ['https://accounts.google.com', 'accounts.google.com'],
    jwks: 'https://www.googleapis.com/oauth2/v3/certs',
    audienceVar: 'GOOGLE_CLIENT_IDS',
  },
  apple: {
    issuers: ['https://appleid.apple.com'],
    jwks: 'https://appleid.apple.com/auth/keys',
    audienceVar: 'APPLE_CLIENT_IDS',
  },
};

/** Tokens are rejected outright above this size, before any parsing. */
const MAX_TOKEN_BYTES = 8192;

/**
 * How far a token's clock may disagree with ours before we care.
 *
 * Phones drift. Thirty seconds absorbs ordinary skew without meaningfully
 * extending the life of an expired token.
 */
const CLOCK_SKEW_SECONDS = 30;

/** How long a provider's signing keys are reused before refetching. */
const JWKS_TTL_SECONDS = 3600;

export class AuthError extends Error {
  constructor(message, status = 401) {
    super(message);
    this.status = status;
  }
}

function base64UrlToBytes(value) {
  const padded = value.replaceAll('-', '+').replaceAll('_', '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

function base64UrlToJson(value) {
  return JSON.parse(new TextDecoder().decode(base64UrlToBytes(value)));
}

/**
 * A provider's current signing keys, cached at the edge.
 *
 * The Cache API rather than KV: it needs no binding, costs nothing, and a miss
 * is one HTTPS request to a highly available endpoint. Providers rotate keys on
 * their own schedule and publish the new one before they use it, so an hour of
 * staleness is safe — and a `kid` we do not recognise forces a refetch below.
 */
async function fetchKeys(url, { bypassCache = false } = {}) {
  const request = new Request(url, { cf: { cacheTtl: JWKS_TTL_SECONDS } });
  const cache = caches.default;

  if (!bypassCache) {
    const hit = await cache.match(request);
    if (hit) return (await hit.json()).keys ?? [];
  }

  // A provider being unreachable is our problem, not the caller's. Left to
  // propagate, a DNS blip or an outage at Google reaches the client as an
  // opaque 500 "something went wrong" — and a user who is signed in perfectly
  // correctly is told, in effect, that their sign-in is bad.
  let response;
  try {
    response = await fetch(request);
  } catch {
    throw new AuthError('the sign-in provider could not be reached', 503);
  }
  if (!response.ok) {
    throw new AuthError('the sign-in provider could not be reached', 503);
  }
  const body = await response.text();
  await cache.put(
    request,
    new Response(body, {
      headers: {
        'content-type': 'application/json',
        'cache-control': `max-age=${JWKS_TTL_SECONDS}`,
      },
    }),
  );
  return (JSON.parse(body).keys ?? []);
}

/**
 * The key this token says signed it — refetching once if we have not seen it.
 *
 * A rotation looks exactly like an attacker naming a key we do not hold, so the
 * unknown-`kid` path refetches once and only then gives up. Without that, every
 * rotation would lock every user out for up to an hour.
 */
async function signingKey(jwksUrl, kid) {
  for (const bypassCache of [false, true]) {
    const keys = await fetchKeys(jwksUrl, { bypassCache });
    const jwk = keys.find((k) => k.kid === kid);
    if (jwk) return jwk;
  }
  throw new AuthError('the token was signed with an unknown key');
}

/**
 * Verify an Apple or Google ID token and return its claims.
 *
 * Order matters: the signature is checked before any claim is believed, and the
 * algorithm is pinned to RS256 taken from *our* table rather than from the
 * token's own header. Reading `alg` from the header and honouring it is the
 * classic JWT forgery — `none` accepts anything, and `HS256` invites the public
 * key to be used as a shared secret.
 */
export async function verifyIdToken(token, provider, env, now = Date.now()) {
  const config = PROVIDERS[provider];
  if (!config) throw new AuthError('unknown sign-in provider', 400);
  if (typeof token !== 'string' || token.length > MAX_TOKEN_BYTES) {
    throw new AuthError('malformed token');
  }

  const parts = token.split('.');
  if (parts.length !== 3) throw new AuthError('malformed token');
  const [headerPart, payloadPart, signaturePart] = parts;

  let header;
  let claims;
  try {
    header = base64UrlToJson(headerPart);
    claims = base64UrlToJson(payloadPart);
  } catch {
    throw new AuthError('malformed token');
  }

  if (header.alg !== 'RS256') throw new AuthError('unsupported token algorithm');
  if (!header.kid) throw new AuthError('malformed token');

  const jwk = await signingKey(config.jwks, header.kid);
  const key = await crypto.subtle.importKey(
    'jwk',
    { ...jwk, alg: 'RS256', ext: true },
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  );
  const signed = new TextEncoder().encode(`${headerPart}.${payloadPart}`);
  const valid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    base64UrlToBytes(signaturePart),
    signed,
  );
  if (!valid) throw new AuthError('the token signature does not check out');

  // Only now are the claims worth reading.
  const seconds = Math.floor(now / 1000);
  if (!config.issuers.includes(claims.iss)) {
    throw new AuthError('the token came from the wrong issuer');
  }

  const audiences = String(env[config.audienceVar] ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  if (audiences.length === 0) {
    // Refusing is the only safe response: an empty allow-list that waves
    // everything through would accept a token minted for any other app.
    throw new AuthError('this deployment has no client ids configured', 500);
  }
  if (!audiences.includes(claims.aud)) {
    throw new AuthError('the token was issued for a different application');
  }

  if (typeof claims.exp !== 'number' || claims.exp + CLOCK_SKEW_SECONDS < seconds) {
    throw new AuthError('the sign-in has expired');
  }
  if (typeof claims.iat === 'number' && claims.iat - CLOCK_SKEW_SECONDS > seconds) {
    throw new AuthError('the token is dated in the future');
  }
  if (typeof claims.sub !== 'string' || claims.sub.length === 0) {
    throw new AuthError('the token names no subject');
  }

  return claims;
}

/**
 * The internal user id for a verified token, creating the row on first sight.
 *
 * Sign-up and sign-in are the same event here. There is no registration screen
 * and nothing to fill in, because there is nothing we need to know.
 */
export async function userIdFor(db, provider, subject, now = Date.now()) {
  const seconds = Math.floor(now / 1000);
  const existing = await db
    .prepare('SELECT id FROM users WHERE provider = ? AND subject = ?')
    .bind(provider, subject)
    .first();

  if (existing) {
    await db
      .prepare('UPDATE users SET seen_at = ? WHERE id = ?')
      .bind(seconds, existing.id)
      .run();
    return existing.id;
  }

  const id = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO users (id, provider, subject, created_at, seen_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (provider, subject) DO NOTHING`,
    )
    .bind(id, provider, subject, seconds, seconds)
    .run();

  // Two devices signing in at the same instant race here, and exactly one
  // insert wins. Re-reading rather than trusting our own id is what stops the
  // loser inventing a second account for the same person.
  const row = await db
    .prepare('SELECT id FROM users WHERE provider = ? AND subject = ?')
    .bind(provider, subject)
    .first();
  return row.id;
}

/**
 * The caller's user id, or a thrown AuthError.
 *
 * `Authorization: Bearer <id token>` with `X-Auth-Provider: apple|google`.
 */
export async function authenticate(request, env, now = Date.now()) {
  const header = request.headers.get('authorization') ?? '';
  const match = /^Bearer (.+)$/i.exec(header.trim());
  if (!match) throw new AuthError('sign in to do that');

  const provider = (request.headers.get('x-auth-provider') ?? '').toLowerCase();
  const claims = await verifyIdToken(match[1], provider, env, now);
  return userIdFor(env.DB, provider, claims.sub, now);
}

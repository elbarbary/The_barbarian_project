/* Signing in with Google, and the six ways a stranger could do it as you.
 *
 * The browser hands the Worker a string and says Google wrote it. If that is
 * taken on trust then anyone who can POST the endpoint can name any address
 * they like and be signed in as its owner — which is the entire thing the
 * sign-in exists to prevent. Each test here is one of those ways, closed.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, createSign } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const module_ = await import('../index.js');
const { verifyGoogleToken, resetGoogleKeys } = module_;
const worker = module_.default;

const CLIENT = '1234567890-abc.apps.googleusercontent.com';
const NOW = 1_760_000_000_000;                       // fixed; no wall clock
const now = () => NOW;
const seconds = Math.floor(NOW / 1000);

const pair = generateKeyPairSync('rsa', { modulusLength: 2048 });
const other = generateKeyPairSync('rsa', { modulusLength: 2048 });

const b64url = (buf) => Buffer.from(buf).toString('base64')
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

function jwkFor(publicKey, kid) {
  return { ...publicKey.export({ format: 'jwk' }),
           kid, alg: 'RS256', use: 'sig', kty: 'RSA' };
}

function token(claims = {}, { key = pair.privateKey, kid = 'k1', alg = 'RS256' } = {}) {
  const header = b64url(JSON.stringify({ alg, kid, typ: 'JWT' }));
  const body = b64url(JSON.stringify({
    iss: 'https://accounts.google.com', aud: CLIENT,
    sub: '117000000000000000001', email: 'reader@example.com',
    email_verified: true, iat: seconds - 30, exp: seconds + 3600,
    ...claims,
  }));
  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${body}`);
  return `${header}.${body}.${b64url(signer.sign(key))}`;
}

const serving = (keys) => async () => ({ ok: true, json: async () => ({ keys }) });
const google = serving([jwkFor(pair.publicKey, 'k1')]);
const verify = (t, opts = {}) => {
  resetGoogleKeys();
  // `??` would turn a deliberate `clientId: undefined` back into the real one,
  // which is the case this file most needs to be able to express.
  const clientId = 'clientId' in opts ? opts.clientId : CLIENT;
  return verifyGoogleToken(t, clientId,
                           { fetch: opts.fetch || google, now: opts.now || now });
};

test('a token Google really signed, for this site, signs the reader in', async () => {
  const who = await verify(token());
  assert.equal(who.email, 'reader@example.com');
  assert.equal(who.sub, '117000000000000000001');
});

test('a token signed by somebody else is refused', async () => {
  // The whole attack: write your own JWT naming any address, and post it.
  assert.equal(await verify(token({}, { key: other.privateKey })), null);
});

test('a token whose payload was edited after signing is refused', async () => {
  const good = token();
  const [h, , sig] = good.split('.');
  const swapped = b64url(JSON.stringify({
    iss: 'https://accounts.google.com', aud: CLIENT, sub: '1',
    email: 'someone.else@example.com', email_verified: true,
    iat: seconds - 30, exp: seconds + 3600,
  }));
  assert.equal(await verify(`${h}.${swapped}.${sig}`), null);
});

test('a valid Google token issued to a DIFFERENT application is refused', async () => {
  // Real signature, real Google, wrong audience. Without the `aud` check any
  // site's users could be replayed into this one.
  assert.equal(await verify(token({ aud: 'someone-elses-app.apps.googleusercontent.com' })), null);
});

test('a token from the wrong issuer is refused', async () => {
  assert.equal(await verify(token({ iss: 'https://accounts.evil.example' })), null);
});

test('an expired token is refused', async () => {
  assert.equal(await verify(token({ exp: seconds - 300 })), null);
});

test('a token issued in the future is refused', async () => {
  assert.equal(await verify(token({ iat: seconds + 900 })), null);
});

test('an unverified address is refused', async () => {
  // Google will issue one for a self-managed domain, and an unverified
  // address is a claim about somebody else's mailbox.
  assert.equal(await verify(token({ email_verified: false })), null);
  assert.equal(await verify(token({ email_verified: 'false' })), null);
});

test('the string "true" counts as verified, because some flows send it', async () => {
  assert.ok(await verify(token({ email_verified: 'true' })));
});

test('alg: none is refused rather than treated as unsigned-and-fine', async () => {
  const header = b64url(JSON.stringify({ alg: 'none', kid: 'k1', typ: 'JWT' }));
  const body = b64url(JSON.stringify({
    iss: 'https://accounts.google.com', aud: CLIENT, email: 'reader@example.com',
    email_verified: true, iat: seconds - 30, exp: seconds + 3600 }));
  assert.equal(await verify(`${header}.${body}.`), null);
});

test('a key id Google does not publish is refused', async () => {
  assert.equal(await verify(token({}, { kid: 'not-a-google-key' })), null);
});

test('with no client id configured nothing verifies', async () => {
  // The endpoint answers 501 in that case; this is the belt to that brace,
  // so a missing binding can never mean "accept anything".
  assert.equal(await verify(token(), { clientId: undefined }), null);
  assert.equal(await verify(token(), { clientId: '' }), null);
});

test('an unreachable JWKS refuses rather than letting the token through', async () => {
  assert.equal(await verify(token(), { fetch: async () => ({ ok: false, status: 503 }) }), null);
});

test('a malformed credential is refused without throwing', async () => {
  for (const bad of ['', 'not.a.token', 'a.b', 'a.b.c.d', null, 42, {}]) {
    assert.equal(await verify(bad), null, `${JSON.stringify(bad)} was accepted`);
  }
});


/* ── the endpoint around it ──────────────────────────────────────────────── */

function mockKv() {
  const store = new Map();
  return {
    async get(key, type) {
      const held = store.get(key);
      if (held === undefined) return null;
      return type === 'json' ? JSON.parse(held) : held;
    },
    async put(key, value) { store.set(key, typeof value === 'string' ? value : JSON.stringify(value)); },
    async delete(key) { store.delete(key); },
    async list() { return { keys: [] }; },
  };
}

const call = (env, body) => worker.fetch(new Request(
  'https://esthmr.com/esthmr/api/auth/google',
  { method: 'POST', headers: { 'content-type': 'application/json',
                               'cf-connecting-ip': '203.0.113.9' },
    body: JSON.stringify(body) }), env, { waitUntil() {} });

test('with no client id the endpoint says so instead of accepting anything', async () => {
  const response = await call({ ESTHMR_AUTH: mockKv(), SESSION_SECRET: 's' },
                              { credential: token() });
  assert.equal(response.status, 501);
  assert.equal((await response.json()).error, 'google sign-in is not configured');
});

test('an unverifiable credential is refused and sets no session cookie', async () => {
  const response = await call(
    { ESTHMR_AUTH: mockKv(), SESSION_SECRET: 's', GOOGLE_CLIENT_ID: CLIENT },
    { credential: 'not.a.real.token' });
  assert.equal(response.status, 401);
  assert.equal(response.headers.get('set-cookie'), null);
});

test('the config endpoint offers the client id and nothing else', async () => {
  const response = await worker.fetch(new Request(
    'https://esthmr.com/esthmr/api/auth/config'),
    { ESTHMR_AUTH: mockKv(), SESSION_SECRET: 'shhh', GOOGLE_CLIENT_ID: CLIENT,
      ADMIN_TOKEN: 'secret', RESEND_KEY: 'secret' }, { waitUntil() {} });
  const body = await response.json();
  assert.deepEqual(body, { google: CLIENT });
  assert.equal(JSON.stringify(body).includes('secret'), false);
});

/* ── what the deployment is configured with ──────────────────────────────── */

/** JSONC without a comment-stripper that eats `"/data/v1/*"`. */
function readJsonc(raw) {
  let out = '';
  let i = 0;
  let inString = false;
  while (i < raw.length) {
    const c = raw[i];
    if (inString) {
      out += c;
      if (c === '\\') { out += raw[i + 1]; i += 2; continue; }
      if (c === '"') inString = false;
      i += 1;
      continue;
    }
    if (c === '"') { inString = true; out += c; i += 1; continue; }
    if (raw.startsWith('//', i)) { const at = raw.indexOf('\n', i); i = at < 0 ? raw.length : at; continue; }
    if (raw.startsWith('/*', i)) { const at = raw.indexOf('*/', i + 2); i = at < 0 ? raw.length : at + 2; continue; }
    out += c;
    i += 1;
  }
  return JSON.parse(out);
}

test('the deployment carries a well-formed Google client id', async () => {
  // The button only appears when `/auth/config` has an id to give it, so a
  // typo here is a sign-in method that silently never renders. And a WRONG id
  // is worse than none: the button draws, Google signs a token for the wrong
  // audience, and `verifyGoogleToken` refuses every reader who presses it.
  const config = readJsonc(await readFile(
    new URL('../../public/wrangler.jsonc', import.meta.url), 'utf8'));
  const id = config.vars?.GOOGLE_CLIENT_ID;
  assert.ok(id, 'no GOOGLE_CLIENT_ID configured — the button will never render');
  assert.match(id, /^\d+-[a-z0-9]+\.apps\.googleusercontent\.com$/,
               `not a Google client id: ${id}`);
});

test('no client secret is stored anywhere on this site', async () => {
  // This is the ID-token flow: the Worker verifies Google's signature itself.
  // A client secret belongs to the authorization-code flow, which this site
  // does not use, so one sitting in the config would be a credential with no
  // job — and every credential with no job is a credential to leak.
  const files = ['public/wrangler.jsonc', 'site-worker/index.js', 'public/esthmr/auth.js'];
  for (const path of files) {
    const text = await readFile(new URL('../../' + path, import.meta.url), 'utf8');
    assert.doesNotMatch(text, /GOCSPX-[\w-]+/, `a Google client secret is in ${path}`);
    assert.doesNotMatch(text, /client[_ ]?secret\s*[:=]\s*["'][^"']{8,}/i,
                        `something is storing a client secret in ${path}`);
  }
});

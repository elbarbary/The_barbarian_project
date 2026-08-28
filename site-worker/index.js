/* thebarbarianproject.com — asset serving, sign-in, and the gate on the data.
 *
 * The published JSON under /data/v1/ used to be world-readable, which made it
 * trivially scrapeable: 282 company documents of filed financials, free to
 * anybody who guessed the path. It is now behind a session. A reader signs in
 * with an email and a six-digit code, and only then does the data answer.
 *
 * There is no password anywhere, and no account table. A code proves control
 * of an inbox; a signed cookie carries that proof afterwards. Nothing to leak,
 * nothing to reset.
 *
 * Codes go out through Resend, and nothing here belongs in the repository:
 *
 *   npx wrangler secret put RESEND_API_KEYS   # one key, or several comma-separated
 *   npx wrangler secret put MAIL_FROM         # "ESTHMR <esthmr@thebarbarianproject.com>"
 *   npx wrangler secret put SENDPULSE_ID      # the API id from SendPulse
 *   npx wrangler secret put SENDPULSE_SECRET  # and its secret
 *   npx wrangler secret put SENDPULSE_FROM    # only if its verified sender differs
 *
 * Without a key, a code request answers 502 rather than pretending a mail was
 * sent. Without MAIL_FROM it falls back to Resend's own sending domain, which
 * needs no DNS but only delivers to the account owner — enough to prove the
 * flow, not enough to serve readers.
 *
 * SendPulse is the second thing asked, between the first Resend key and the
 * rest; `providerChain` says why. Leaving its two secrets unset simply removes
 * it from the chain, which is the behaviour that was there before it existed.
 *
 * WHAT THIS DOES AND DOES NOT BUY
 * A gate stops indiscriminate crawling and casual copying. It does not make
 * the data unobtainable: anybody willing to sign up can read what they are
 * shown, and no client-side measure changes that. The per-session ceiling
 * below is the second half — it bounds how fast one account can pull, so
 * scraping through a signed-in session is slow and visible rather than free.
 */

const CODE_TTL = 10 * 60;              // a code is good for ten minutes
const SESSION_DAYS = 30;
const COOKIE = 'esthmr_session';

/* Ceilings. Generous for a person, tight for a crawler.
 *
 * The per-EMAIL limit is the one that matters: it is what stops somebody
 * pointing the endpoint at an inbox they do not own and burying it. Five an
 * hour is more than anyone signing in needs.
 *
 * The per-IP limit is a blunt burst guard and has to stay loose, because an
 * address is not a person. A university, an office behind one NAT, a mobile
 * carrier on CGNAT — all of those share an address between hundreds of
 * readers, and a tight per-IP ceiling locks every one of them out because of
 * what the others did. It was 20/hour, which this session exhausted by itself
 * in testing; that is a warning about real shared addresses, not about
 * testing.
 */
const LIMITS = {
  codePerEmail: { max: 5, window: 3600 },
  codePerIp: { max: 60, window: 3600 },
  verifyPerEmail: { max: 8, window: 900 },
  dataPerSession: { max: 1500, window: 3600 },
};

const enc = new TextEncoder();

const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
  });

function b64url(bytes) {
  let s = '';
  for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Standard base64, as SendPulse wants its HTML — not the URL-safe unpadded
 *  variant above, which its decoder rejects. */
function b64(text) {
  let s = '';
  for (const b of enc.encode(text)) s += String.fromCharCode(b);
  return btoa(s);
}

async function sha256(text) {
  return b64url(await crypto.subtle.digest('SHA-256', enc.encode(text)));
}

async function hmacKey(secret) {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign', 'verify']);
}

async function sign(payload, secret) {
  const body = b64url(enc.encode(JSON.stringify(payload)));
  const mac = b64url(await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(body)));
  return `${body}.${mac}`;
}

async function unsign(token, secret) {
  if (typeof token !== 'string' || !token.includes('.')) return null;
  const [body, mac] = token.split('.');
  const expected = b64url(await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(body)));
  // Constant-time-ish: compare full strings of equal length only.
  if (mac.length !== expected.length) return null;
  let diff = 0;
  for (let i = 0; i < mac.length; i++) diff |= mac.charCodeAt(i) ^ expected.charCodeAt(i);
  if (diff !== 0) return null;
  try {
    const payload = JSON.parse(atob(body.replace(/-/g, '+').replace(/_/g, '/')));
    return payload.x > Date.now() / 1000 ? payload : null;
  } catch {
    return null;
  }
}

function cookieValue(request, name) {
  const raw = request.headers.get('cookie') || '';
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}

async function session(request, env) {
  if (!env.SESSION_SECRET) return null;
  // A browser carries the session in an httpOnly cookie it cannot read. A
  // phone has no cookie jar worth the name, so the app holds the same signed
  // token and presents it as a bearer. Same token, same signature, same
  // expiry — only the envelope differs.
  const header = request.headers.get('authorization') || '';
  if (header.startsWith('Bearer ')) {
    const who = await unsign(header.slice(7).trim(), env.SESSION_SECRET);
    if (who) return who;
  }
  return unsign(cookieValue(request, COOKIE), env.SESSION_SECRET);
}

/** A fixed-window counter in KV. Returns true when the caller is over. */
async function overLimit(env, bucket, key, { max, window }) {
  const slot = Math.floor(Date.now() / 1000 / window);
  const id = `rl:${bucket}:${key}:${slot}`;
  const used = parseInt((await env.ESTHMR_AUTH.get(id)) || '0', 10);
  if (used >= max) return true;
  await env.ESTHMR_AUTH.put(id, String(used + 1), { expirationTtl: window + 60 });
  return false;
}

const EMAIL = /^[^@\s]+@[^@\s.]+\.[^@\s]+$/;
const normalise = (raw) => String(raw || '').trim().toLowerCase();

/** Every configured Resend key, in the order they should be tried.
 *
 * RESEND_API_KEYS takes a comma-separated list; RESEND_API_KEY takes one.
 * Resend's quota and its per-second rate limit are both per ACCOUNT, so five
 * keys on five accounts raise the ceiling and five on one raise neither. What
 * a second key always buys is surviving one being revoked or rotated without
 * the sign-in going down with it.
 */
function mailKeys(env) {
  return String(env.RESEND_API_KEYS || env.RESEND_API_KEY || '')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);
}

/** "ESTHMR <esthmr@example.com>" split into the two fields SendPulse wants. */
export function parseAddress(raw) {
  const match = String(raw || '').match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  if (!match) return { name: 'ESTHMR', email: String(raw || '').trim() };
  return { name: match[1].replace(/^"|"$/g, '') || 'ESTHMR', email: match[2].trim() };
}

/** The address SendPulse would send as, or null if there is nothing to use.
 *
 * SendPulse verifies an individual SENDER, where Resend verifies a domain, so
 * the two can legitimately differ — SENDPULSE_FROM exists for that. What it
 * can never be is Resend's sandbox domain: that address belongs to Resend, and
 * SendPulse would refuse it on every send.
 */
function sendPulseFrom(env) {
  const raw = String(env.SENDPULSE_FROM || env.MAIL_FROM || '').trim();
  return raw && !raw.includes('resend.dev') ? parseAddress(raw) : null;
}

function codeMessage(env, email, code) {
  const text = `Your ESTHMR sign-in code is ${code}.\n\n`
    + 'It works once and expires in ten minutes. If you did not ask for it, '
    + 'nothing has happened to your account and you can ignore this.';
  const html = '<div style="font:400 15px/1.55 -apple-system,Segoe UI,sans-serif;'
    + 'color:#1B1917"><p>Your ESTHMR sign-in code is</p>'
    + `<p style="font:600 30px/1 ui-monospace,monospace;letter-spacing:.22em">${code}</p>`
    + '<p>It works once and expires in ten minutes.</p>'
    + '<p style="color:#6E6761;font-size:13px">If you did not ask for it, nothing '
    + 'has happened to your account and you can ignore this.</p></div>';
  // Resend's own sending domain works with no DNS and no verification, which is
  // what makes it usable before a domain is set up. It only delivers to the
  // account owner's address, so it is for proving the flow, not for readers.
  const from = String(env.MAIL_FROM || '').trim() || 'ESTHMR <onboarding@resend.dev>';
  return {
    from,
    to: [email],
    subject: `${code} is your ESTHMR sign-in code`,
    text,
    html,
  };
}

/* ── who gets asked, and in what order ─────────────────────────────────────
 *
 * The first Resend key, then SendPulse, then the remaining Resend keys.
 *
 * Second rather than last is the whole point of having it. The failure worth
 * surviving is not an exhausted quota — it is Resend being down, or refusing
 * this sender, and every other Resend key answers that identically. A second
 * provider is the only thing in the list that can answer differently, so it
 * goes as early as it can while still leaving Resend the default path.
 */
export function providerChain(env) {
  const keys = mailKeys(env);
  const chain = keys.slice(0, 1).map((key) => ({ id: 'resend#1', provider: 'resend', key }));
  if (env.SENDPULSE_ID && env.SENDPULSE_SECRET && sendPulseFrom(env)) {
    chain.push({ id: 'sendpulse', provider: 'sendpulse' });
  }
  keys.slice(1).forEach((key, i) => {
    chain.push({ id: `resend#${i + 2}`, provider: 'resend', key });
  });
  return chain;
}

/** Walk the chain until one of them takes the message. Returns which did.
 *
 * `attempt` is passed in rather than called directly so the order and the
 * give-up rules can be tested without a network.
 */
export async function deliver(chain, attempt) {
  const failures = [];
  let resendRefusedTheMessage = false;
  for (const step of chain) {
    if (step.provider === 'resend' && resendRefusedTheMessage) {
      failures.push(`${step.id}: skipped`);
      continue;
    }
    let outcome;
    try {
      outcome = await attempt(step);
    } catch (error) {
      failures.push(`${step.id} network: ${error.message}`);
      continue;
    }
    if (outcome.ok) return step.id;
    failures.push(`${step.id} ${outcome.status}: ${String(outcome.detail || '').slice(0, 160)}`);
    // Move to the next KEY only when the key is the problem: 401 revoked, 429
    // exhausted, or Resend itself down. Anything else — a 403 for an
    // unverified sending domain, a 422 for a malformed address — is about the
    // message, and four more keys on the same provider buy four identical
    // refusals. A different provider is still worth asking, because its sender
    // is verified separately and its idea of a valid message is its own.
    if (step.provider === 'resend' && outcome.status !== 401
        && outcome.status !== 429 && outcome.status < 500) {
      resendRefusedTheMessage = true;
    }
  }
  throw new Error(failures.join(' | '));
}

async function postResend(key, message) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify(message),
  });
  if (response.ok) return { ok: true };
  return { ok: false, status: response.status, detail: await response.text().catch(() => '') };
}

/** SendPulse's bearer token, cached for as long as it is good for.
 *
 * SendPulse takes no API key on the send itself: an id and a secret are
 * exchanged for a token that lasts an hour. Fetching one per code would put a
 * second round trip in front of every sign-in, so it is held in KV and dropped
 * the moment a send says it is no longer good.
 */
async function sendPulseToken(env, fresh) {
  if (!fresh) {
    const held = await env.ESTHMR_AUTH.get('sp:token');
    if (held) return held;
  }
  const response = await fetch('https://api.sendpulse.com/oauth/access_token', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: env.SENDPULSE_ID,
      client_secret: env.SENDPULSE_SECRET,
    }),
  });
  if (!response.ok) {
    throw new Error(`token ${response.status}: ${(await response.text().catch(() => '')).slice(0, 120)}`);
  }
  const body = await response.json();
  if (!body.access_token) throw new Error('token: no access_token in the reply');
  // A minute short of what it claims, so a cached token never expires in
  // flight. KV will not hold anything for less than sixty seconds.
  const ttl = Math.max(60, Math.min(3600, (body.expires_in || 3600) - 60));
  await env.ESTHMR_AUTH.put('sp:token', body.access_token, { expirationTtl: ttl });
  return body.access_token;
}

async function postSendPulse(env, message) {
  const from = sendPulseFrom(env);
  const payload = JSON.stringify({
    email: {
      subject: message.subject,
      from: { name: from.name, email: from.email },
      to: message.to.map((email) => ({ email })),
      // SendPulse wants the HTML base64-encoded and the plain text as it is.
      html: b64(message.html),
      text: message.text,
    },
  });
  const post = async (token) => fetch('https://api.sendpulse.com/smtp/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: payload,
  });

  let response = await post(await sendPulseToken(env, false));
  // The cached token outlived its welcome — KV is eventually consistent and a
  // token can also be revoked under us. One retry with a fresh one, then stop.
  if (response.status === 401) response = await post(await sendPulseToken(env, true));

  if (!response.ok) {
    return { ok: false, status: response.status, detail: await response.text().catch(() => '') };
  }
  // A 200 is not the same as a send: SendPulse reports a refused message in the
  // body, and treating that as success loses the code silently.
  const body = await response.json().catch(() => ({}));
  if (body.result === false) {
    return { ok: false, status: 200, detail: body.message || JSON.stringify(body).slice(0, 160) };
  }
  return { ok: true };
}

async function sendCode(env, email, code) {
  const chain = providerChain(env);
  if (!chain.length) {
    // Refusing loudly beats pretending a code was sent that never was.
    throw new Error('no mail provider configured');
  }
  const message = codeMessage(env, email, code);
  const used = await deliver(chain, (step) => (step.provider === 'resend'
    ? postResend(step.key, message)
    : postSendPulse(env, message)));
  // Which provider actually carried it — the thing you want in `wrangler tail`
  // when somebody says the code never arrived.
  console.log('code sent via', used);
}

async function api(request, env, url) {
  const path = url.pathname.replace('/esthmr/api', '');
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';

  if (path === '/auth/me') {
    const who = await session(request, env);
    return who ? json({ email: who.e }) : json({ error: 'signed out' }, 401);
  }

  if (path === '/auth/signout') {
    return json({ ok: true }, 200, {
      'set-cookie': `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
    });
  }

  if (request.method !== 'POST') return json({ error: 'method' }, 405);
  let body = {};
  try { body = await request.json(); } catch { /* handled below */ }

  if (path === '/auth/request') {
    const email = normalise(body.email);
    if (!EMAIL.test(email) || email.length > 200) return json({ error: 'email' }, 400);
    if (await overLimit(env, 'ip', ip, LIMITS.codePerIp)
        || await overLimit(env, 'email', email, LIMITS.codePerEmail)) {
      return json({ error: 'too many requests' }, 429);
    }
    const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, '0');
    await env.ESTHMR_AUTH.put(`code:${email}`, await sha256(`${email}:${code}`),
      { expirationTtl: CODE_TTL });
    try {
      await sendCode(env, email, code);
    } catch (error) {
      // The reader gets nothing useful from a provider's error, but whoever is
      // reading `wrangler tail` needs the actual reason — a refused sender and
      // a wrong key look identical from the outside.
      console.warn('sendCode failed:', error && error.message);
      return json({ error: 'could not send the code' }, 502);
    }
    // Always the same answer, so this cannot be used to test who has an inbox.
    return json({ sent: true });
  }

  if (path === '/auth/verify') {
    const email = normalise(body.email);
    const code = String(body.code || '').trim();
    if (!EMAIL.test(email) || !/^\d{6}$/.test(code)) return json({ error: 'code' }, 400);
    if (await overLimit(env, 'verify', email, LIMITS.verifyPerEmail)) {
      return json({ error: 'too many attempts' }, 429);
    }
    const held = await env.ESTHMR_AUTH.get(`code:${email}`);
    if (!held || held !== await sha256(`${email}:${code}`)) {
      return json({ error: 'that code is not right' }, 401);
    }
    await env.ESTHMR_AUTH.delete(`code:${email}`);       // one use only
    const token = await sign(
      { e: email, x: Math.floor(Date.now() / 1000) + SESSION_DAYS * 86400 },
      env.SESSION_SECRET);
    // The cookie serves the website; the token in the body serves the app,
    // which has nowhere to put a cookie. A browser simply ignores it.
    return json({ email, token, expires_in: SESSION_DAYS * 86400 }, 200, {
      'set-cookie': `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; `
        + `Secure; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}`,
    });
  }

  return json({ error: 'no such endpoint' }, 404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/esthmr/api/')) {
      return api(request, env, url).catch(() => json({ error: 'server' }, 500));
    }

    // The gate. Everything the pipeline publishes lives under this prefix.
    if (url.pathname.startsWith('/data/v1/')) {
      const who = await session(request, env);
      if (!who) {
        return json({ error: 'sign in to read the exchange data' }, 401, {
          'cache-control': 'no-store',
          'www-authenticate': 'Session realm="esthmr"',
        });
      }
      if (await overLimit(env, 'data', who.e, LIMITS.dataPerSession)) {
        return json({ error: 'slow down' }, 429, { 'cache-control': 'no-store' });
      }
      const answer = await env.ASSETS.fetch(request);
      const headers = new Headers(answer.headers);
      // `private` keeps it out of shared caches, and `no-cache` means the
      // browser may keep a copy but must revalidate before using it — so every
      // read passes through the check above.
      //
      // It was `private, max-age=300`, which left the data readable for five
      // minutes AFTER signing out: the browser answered from its own cache and
      // never asked. On a shared machine that is somebody else reading it.
      // Revalidation still returns 304 for an unchanged document, so this
      // costs a round trip rather than the payload.
      headers.set('cache-control', 'private, no-cache');
      return new Response(answer.body, { status: answer.status, headers });
    }

    return env.ASSETS.fetch(request);
  },
};

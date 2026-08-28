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
 * Codes go out through SendPulse. Either credential works, and neither belongs
 * in this file or in the repository:
 *
 *   npx wrangler secret put SENDPULSE_KEY      # Settings > API > API keys
 *   npx wrangler secret put MAIL_FROM          # optional verified sender
 *
 * or, to use the OAuth pair from Settings > API > Client credentials instead:
 *
 *   npx wrangler secret put SENDPULSE_ID
 *   npx wrangler secret put SENDPULSE_SECRET
 *
 * With neither, a code request answers 502 rather than pretending a mail was
 * sent.
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

/* Ceilings. Generous for a person, tight for a crawler. */
const LIMITS = {
  codePerEmail: { max: 5, window: 3600 },
  codePerIp: { max: 20, window: 3600 },
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

/** Standard base64 of UTF-8 text — SendPulse wants the HTML part encoded. */
function b64utf8(text) {
  let s = '';
  for (const b of enc.encode(text)) s += String.fromCharCode(b);
  return btoa(s);
}

/** Whatever SendPulse will accept in an Authorization header.
 *
 * Two ways in, and the simpler one wins when it is available:
 *
 *   SENDPULSE_KEY               a permanent API key, used as the bearer as-is.
 *                               Nothing to refresh, nothing to cache.
 *   SENDPULSE_ID + _SECRET      the OAuth pair, exchanged for an hour-long
 *                               token which is cached until just before it
 *                               expires — their documentation asks for exactly
 *                               that, and it saves a round trip per send.
 */
async function mailAuth(env, { fresh = false } = {}) {
  if (env.SENDPULSE_KEY) return env.SENDPULSE_KEY;
  if (!fresh) {
    const held = await env.ESTHMR_AUTH.get('sendpulse:token');
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
  if (!response.ok) throw new Error(`sendpulse auth ${response.status}`);
  const { access_token: token, expires_in: ttl } = await response.json();
  if (!token) throw new Error('sendpulse returned no token');
  await env.ESTHMR_AUTH.put('sendpulse:token', token,
    { expirationTtl: Math.max(120, (ttl || 3600) - 60) });
  return token;
}

async function postMessage(env, token, email, code) {
  const text = `Your ESTHMR sign-in code is ${code}.\n\n`
    + 'It works once and expires in ten minutes. If you did not ask for it, '
    + 'nothing has happened to your account and you can ignore this.';
  const html = '<div style="font:400 15px/1.55 -apple-system,Segoe UI,sans-serif;'
    + 'color:#1B1917"><p>Your ESTHMR sign-in code is</p>'
    + `<p style="font:600 30px/1 ui-monospace,monospace;letter-spacing:.22em">${code}</p>`
    + '<p>It works once and expires in ten minutes.</p>'
    + '<p style="color:#6E6761;font-size:13px">If you did not ask for it, nothing '
    + 'has happened to your account and you can ignore this.</p></div>';
  return fetch('https://api.sendpulse.com/smtp/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      email: {
        subject: `${code} is your ESTHMR sign-in code`,
        from: {
          name: 'ESTHMR',
          email: env.MAIL_FROM || 'noreply@thebarbarianproject.com',
        },
        to: [{ email }],
        text,
        html: b64utf8(html),
      },
    }),
  });
}

async function sendCode(env, email, code) {
  if (!env.SENDPULSE_KEY && !(env.SENDPULSE_ID && env.SENDPULSE_SECRET)) {
    // Refusing loudly beats pretending a code was sent that never was.
    throw new Error('no mail provider configured');
  }
  let response = await postMessage(env, await mailAuth(env), email, code);
  if (response.status === 401 && !env.SENDPULSE_KEY) {
    // A cached token was rejected early — mint one and try once more. With a
    // permanent key a 401 means the key is wrong, and retrying it is noise.
    response = await postMessage(env, await mailAuth(env, { fresh: true }), email, code);
  }
  if (!response.ok) throw new Error(`sendpulse ${response.status}`);
  // SendPulse can answer 200 with a refusal in the body.
  const body = await response.json().catch(() => ({}));
  if (body && body.result === false) {
    throw new Error(`sendpulse refused: ${body.message || 'no reason given'}`);
  }
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
    return json({ email }, 200, {
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
      // Never let a shared cache hold a document that needed a session.
      const headers = new Headers(answer.headers);
      headers.set('cache-control', 'private, max-age=300');
      return new Response(answer.body, { status: answer.status, headers });
    }

    return env.ASSETS.fetch(request);
  },
};

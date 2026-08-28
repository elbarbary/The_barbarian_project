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
 *
 * Without a key, a code request answers 502 rather than pretending a mail was
 * sent. Without MAIL_FROM it falls back to Resend's own sending domain, which
 * needs no DNS but only delivers to the account owner — enough to prove the
 * flow, not enough to serve readers.
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

/** Every configured Resend key, in the order they should be tried.
 *
 * RESEND_API_KEYS takes a comma-separated list; RESEND_API_KEY takes one. Keys are tried in order
 * and the next is used on 401, 403, 429 or 5xx — Resend's quota and its per-second
 * rate limit are both per account, so a second key on the same account raises
 * neither. What it does is survive a key being revoked or rotated without the
 * sign-in going down with it.
 */
function mailKeys(env) {
  return String(env.RESEND_API_KEYS || env.RESEND_API_KEY || '')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);
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

async function sendCode(env, email, code) {
  const keys = mailKeys(env);
  if (!keys.length) {
    // Refusing loudly beats pretending a code was sent that never was.
    throw new Error('no mail provider configured');
  }
  const body = JSON.stringify(codeMessage(env, email, code));
  const failures = [];
  for (const key of keys) {
    let response;
    try {
      response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
        body,
      });
    } catch (error) {
      failures.push(`network: ${error.message}`);
      continue;
    }
    if (response.ok) return;
    const detail = await response.text().catch(() => '');
    failures.push(`${response.status}: ${detail.slice(0, 160)}`);
    // A rejected message is rejected for every key — a bad sender or a
    // malformed address will not become valid on the next one. Only move on
    // when the key itself is the problem.
    if (![401, 403, 429].includes(response.status) && response.status < 500) break;
  }
  throw new Error(`resend ${failures.join(' | ')}`);
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

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
 *   npx wrangler secret put MAIL_FROM         # "ESTHMR <sign-in@esthmr.com>"
 *   npx wrangler secret put BREVO_API_KEY     # Brevo API key (xkeysib-...)
 *   npx wrangler secret put BREVO_FROM        # optional: "ESTHMR <sign-in@esthmr.com>"
 *   npx wrangler secret put SENDPULSE_TOKEN   # an API token, presented as it is
 *     — or, for an account issued an OAuth pair instead —
 *   npx wrangler secret put SENDPULSE_ID      # 32 hex characters
 *   npx wrangler secret put SENDPULSE_SECRET  # 32 hex characters, exchanged for a token
 *   npx wrangler secret put SENDPULSE_FROM    # its verified sender, name included
 *
 * Without a key, a code request answers 502 rather than pretending a mail was
 * sent. Without MAIL_FROM it falls back to Resend's own sending domain, which
 * needs no DNS but only delivers to the account owner — enough to prove the
 * flow, not enough to serve readers.
 *
 * Brevo and SendPulse act as fallback and volume providers in the chain;
 * `providerChain` says why. Leaving their secrets unset simply removes them
 * from the chain, which is the behaviour that was there before they existed.
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
  // The same address without a solved challenge. Ten times tighter, and
  // deliberately not zero: an address is not a person — an office behind one
  // NAT or a carrier on CGNAT shares it between hundreds of readers, and the
  // comment above this list is there because a tight per-IP ceiling once
  // locked all of them out for what one of them did.
  codePerIpUnsolved: { max: 6, window: 3600 },
  verifyPerEmail: { max: 8, window: 900 },
  // The data gate is on the platform's limiter now (see `overRate`) and no
  // longer reads this. Kept as the record of what the ceiling used to be:
  // 1,500 an hour, at the cost of a KV write per document fetched.
  // dataPerSession: { max: 1500, window: 3600 },
  // Following and unfollowing is a click, and a reader may click a lot of
  // them in one sitting. This is here so a stuck client cannot write in a
  // loop, not to ration anybody's list.
  watchPerSession: { max: 400, window: 3600 },
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

export async function sha256(text) {
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
  if (typeof token !== 'string' || token.length > 2048
      || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const [body, mac] = token.split('.');
  try {
    const signature = Uint8Array.from(atob(mac.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
    if (!await crypto.subtle.verify('HMAC', await hmacKey(secret), signature, enc.encode(body))) return null;
    const payload = JSON.parse(atob(body.replace(/-/g, '+').replace(/_/g, '/')));
    return payload && typeof payload.e === 'string' && EMAIL.test(payload.e)
      && payload.e.length <= 200 && Number.isFinite(payload.x)
      && payload.x > Date.now() / 1000 ? payload : null;
  } catch {
    return null;
  }
}

function cookieValue(request, name) {
  const raw = request.headers.get('cookie') || '';
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) {
      try { return decodeURIComponent(v.join('=')); } catch { return null; }
    }
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

/** The platform's own limiter, where there is one. Returns true when over.
 *
 * Used for the data gate and nothing else. The sign-in paths keep the KV
 * counter below: they need an HOURLY window — five codes an email an hour —
 * which this binding cannot express, and they cost a handful of writes a day
 * rather than thirty-three a visit.
 *
 * An absent binding means an absent limit rather than a broken gate. The whole
 * reason for moving off KV was that a limiter must not be able to take the
 * site down; that has to be true of this one too, so it fails open and the
 * gate itself — which is what keeps the data behind a session — is untouched.
 */
async function overRate(env, key, binding = 'DATA_LIMIT') {
  const limiter = env[binding];
  if (!limiter || typeof limiter.limit !== 'function') return false;
  try {
    const { success } = await limiter.limit({ key });
    return !success;
  } catch {
    return false;
  }
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

/* ── the challenge on the way in ──────────────────────────────────────────
 *
 * /auth/request sends an EMAIL on every call. That makes it the one endpoint
 * here where an abuser spends somebody else's money — a mail quota, a sender
 * reputation, and a stranger's inbox. It has per-email and per-IP counters,
 * which bound how fast one address can be hit and do nothing at all about a
 * spread of addresses.
 *
 * WHAT IS ENFORCED, AND ON WHOM
 * The token is required of BROWSERS and not of the app. A browser cannot
 * suppress the `Origin` header on a cross-origin POST, so a request that
 * claims to come from one of this site's own pages must carry a solved
 * challenge or it is refused. The phone app signs in through this same
 * endpoint and sends no Origin, so it keeps working on the counters alone.
 *
 * That is a deliberate, partial answer and worth saying plainly: a script
 * that simply omits Origin skips the challenge. What it buys is that the
 * cheap attack — a browser, a headless one included, pointed at the sign-in
 * form — stops working, and the expensive one has to be written on purpose.
 * Closing the rest means requiring a token from the app too, which is an app
 * release, not a deploy.
 */
const TURNSTILE = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/** Hosts whose pages carry the widget. An Origin from one of these is a
 *  browser on our own site, and is held to the challenge. */
const CHALLENGED = new Set([
  'https://esthmr.com', 'https://www.esthmr.com',
  'https://thebarbarianproject.com',
  'http://localhost:8438', 'http://127.0.0.1:8438',
]);

/* Addresses that exist in order to be thrown away.
 *
 * The gate on this site is one email round trip, which the Worker has always
 * said out loud: "minting another costs an email round trip". A throwaway
 * inbox makes that cost nothing. On 6 Sep 2026 a headless Chrome on an
 * Alibaba Cloud address in Hong Kong signed up as
 * `esthmrexplore<unix timestamp>@uberip.com` — the site's own name, the word
 * explore, and a clock reading — read the overview documents for six hours,
 * and probed for an endpoint we do not have and a DELETE we do not allow.
 * It took no company data. The next one might.
 *
 * This is a floor, not a wall. These services rotate domains faster than any
 * committed list can follow, and the list is deliberately short: every entry
 * is a service whose whole purpose is disposability, so a real reader is
 * never refused by it. Anything cleverer — scoring the local part, demanding
 * an MX record — risks turning away somebody with an unusual but real
 * address, and a reader who cannot sign in is a worse outcome than a bot who
 * can.
 */
const DISPOSABLE = new Set([
  'uberip.com',
  'mailinator.com', 'guerrillamail.com', 'sharklasers.com', 'grr.la',
  '10minutemail.com', 'tempmail.com', 'temp-mail.org', 'yopmail.com',
  'trashmail.com', 'dispostable.com', 'maildrop.cc', 'getnada.com',
  'throwawaymail.com', 'fakemailgenerator.com', 'inboxkitten.com',
  'emailondeck.com', 'mohmal.com', 'moakt.com', 'tempmailo.com',
  'mailnesia.com', 'spamgourmet.com', 'discard.email', 'mailde.de',
  'burnermail.io', 'anonaddy.me', 'mytemp.email', 'tmpmail.org',
]);

/** The throwaway service this address belongs to, or null. */
export function disposable(email) {
  const at = String(email || '').lastIndexOf('@');
  if (at < 0) return null;
  const domain = String(email).slice(at + 1).trim().toLowerCase();
  if (!domain) return null;
  if (DISPOSABLE.has(domain)) return domain;
  // `mail.mailinator.com` is the same service as `mailinator.com`; matching
  // only the exact string would be a one-character bypass.
  for (const known of DISPOSABLE) {
    if (domain.endsWith(`.${known}`)) return known;
  }
  return null;
}

/* A client claiming to be a browser that cannot be one.
 *
 * `mustSolve` holds a request to the challenge when its Origin is one of our
 * own pages, because a browser cannot suppress Origin on a cross-origin POST.
 * The corollary was never enforced: a POST carrying `Mozilla/... Chrome/...`
 * and NO Origin is not a browser, whatever it says. The phone app is not
 * caught by this — it sends neither an Origin nor a browser user agent — and
 * neither is curl, which does not pretend to be Chrome.
 *
 * To be plain about what this does and does not do: it would NOT have stopped
 * the Hong Kong client above, which ran the page's own JavaScript and so sent
 * a real Origin. It closes the cheaper door beside it.
 */
export function spoofedBrowser(origin, userAgent) {
  if (String(origin || '').trim()) return false;
  return /\b(Mozilla|Chrome|Safari|Firefox|Edge?|OPR)\b/i.test(String(userAgent || ''));
}

/** Whether this request must present a solved challenge. */
export function mustSolve(origin, hasSecret) {
  if (!hasSecret) return false;              // unconfigured means unenforced
  return CHALLENGED.has(String(origin || '').trim().toLowerCase());
}

/** Whether the token is good for this action, from this site. Fails closed. */
async function solved(env, token, ip) {
  if (typeof token !== 'string' || !token || token.length > 2048) return false;
  let result;
  try {
    const answer = await fetch(TURNSTILE, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      signal: AbortSignal.timeout(10000),
      body: new URLSearchParams({
        secret: env.TURNSTILE_SECRET,
        response: token,
        ...(ip ? { remoteip: ip } : {}),
      }),
    });
    if (!answer.ok) return false;
    result = await answer.json();
  } catch {
    // A challenge service that cannot be reached refuses the request. The
    // alternative is an endpoint that sends mail whenever Cloudflare has a
    // bad minute, which is the thing being defended against.
    return false;
  }
  // The action pins the token to THIS form: one minted on some other page of
  // ours cannot be replayed here. The hostname pins it to our own domains.
  return result.success === true
    && result.action === 'signin'
    && CHALLENGED.has(`https://${result.hostname}`.toLowerCase());
}

const EMAIL = /^[^@\s]+@[^@\s.]+\.[^@\s]+$/;
const normalise = (raw) => String(raw || '').trim().toLowerCase();

/* ── the reader's own list ────────────────────────────────────────────────
 *
 * A ticker and nothing else. Not a holding: no share count, no cost basis, no
 * price paid. Those are facts about a person's money, and a publisher with no
 * licence to advise has no business holding them.
 *
 * It is kept against the email the session already proves, so the list follows
 * the reader to another browser instead of dying with one device's storage.
 * That is a per-reader record, which the browser-only version deliberately
 * avoided — so it is worth being exact about what it costs: this store now
 * knows that a given inbox follows a given set of tickers. It is not deleted
 * on sign-out, because a list that vanished when you signed out would not be
 * saved at all; the screen carries a control that empties it, and an empty
 * list is what is written.
 */
const WATCH_MAX = 60;
const TICKER = /^[A-Z0-9.]{1,12}$/;

/** The tickers in a payload, or null if it is not a list of them at all.
 *
 * Deliberately forgiving about the ITEMS and strict about the SHAPE: an
 * unknown ticker is a company that may list tomorrow or delist today, and
 * refusing the whole list over one of them would lose the other fifty-nine.
 * Something that is not an array is a bug in the caller, and says so.
 */
export function cleanTickers(raw) {
  if (!Array.isArray(raw)) return null;
  const out = [];
  for (const item of raw) {
    if (typeof item !== 'string') continue;
    const ticker = item.trim().toUpperCase();
    if (!TICKER.test(ticker) || out.includes(ticker)) continue;
    out.push(ticker);
    if (out.length >= WATCH_MAX) break;
  }
  return out;
}

/** Every configured Resend key, in the order they should be tried.
 *
 * RESEND_API_KEYS takes a comma-separated list; RESEND_API_KEY takes one.
 * Resend's quota and its per-second rate limit are both per ACCOUNT, so five
 * keys on five accounts raise the ceiling and five on one raise neither. What
 * a second key always buys is surviving one being revoked or rotated without
 * the sign-in going down with it.
 */
export function mailKeys(env) {
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

export function brevoKey(env) {
  return String(env.BREVO_API_KEY || '').trim();
}

export function brevoFrom(env) {
  const raw = String(env.BREVO_FROM || env.SENDPULSE_FROM || env.MAIL_FROM || '').trim();
  return raw && !raw.includes('resend.dev') ? parseAddress(raw) : null;
}

function codeMessage(env, email, code) {
  const text = `${code} هو رمز الدخول الخاص بك في منصة استثمر.\n`
    + 'صلاحية هذا الرمز عشر دقائق ويُستخدم لمرة واحدة فقط.\n\n'
    + `Your ESTHMR sign-in code is ${code}.\n`
    + 'It works once and expires in ten minutes. If you did not ask for it, '
    + 'nothing has happened to your account and you can ignore this.';
  const html = '<div style="font:400 15px/1.55 -apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif;color:#1B1917;max-width:440px;margin:0 auto;padding:24px;border-radius:16px;background:#FBF9F5;border:1px solid #E6E0D8">'
    + '<div style="direction:rtl;text-align:right;margin-bottom:18px">'
    + '<p style="font-size:15px;font-weight:600;margin:0 0 6px;color:#1B1917">رمز الدخول الخاص بك في منصة استثمر:</p>'
    + `<p style="font:700 32px/1.2 ui-monospace,monospace;letter-spacing:.25em;color:#C84E0E;margin:10px 0">${code}</p>`
    + '<p style="font-size:12.5px;color:#6E6761;margin:0">صلاحية هذا الرمز ١٠ دقائق ولا تشاركه مع أحد.</p>'
    + '</div>'
    + '<div style="border-top:1px solid #E6E0D8;padding-top:16px;direction:ltr;text-align:left">'
    + '<p style="font-size:14px;color:#1B1917;margin:0 0 4px">Your ESTHMR sign-in code is</p>'
    + `<p style="font:600 24px/1.2 ui-monospace,monospace;letter-spacing:.2em;color:#1B1917;margin:6px 0">${code}</p>`
    + '<p style="color:#6E6761;font-size:12px;margin:0">It works once and expires in ten minutes. If you did not ask for it, you can safely ignore this email.</p>'
    + '</div>'
    + '</div>';
  // Resend's own sending domain works with no DNS and no verification, which is
  // what makes it usable before a domain is set up. It only delivers to the
  // account owner's address, so it is for proving the flow, not for readers.
  const from = String(env.MAIL_FROM || '').trim() || 'ESTHMR <onboarding@resend.dev>';
  return {
    from,
    to: [email],
    subject: `${code} · رمز دخول استثمر / ESTHMR sign-in code`,
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
/* Which address each Resend key sends as.
 *
 * MAIL_FROMS is a comma list parallel to RESEND_API_KEYS; an empty slot means
 * MAIL_FROM. It exists because the keys do not all belong to one account, and
 * Resend verifies a domain PER ACCOUNT: probed on 2026-09-05, key #3's account
 * verifies esthmr.com and the other four refuse it with 403. One shared From
 * meant esthmr.com could never be the sender — the only key allowed to use it
 * was handed an address it had to reject.
 */
export function mailFroms(env) {
  const keys = mailKeys(env);
  const froms = String(env.MAIL_FROMS || '').split(',').map((s) => s.trim());
  const fallback = String(env.MAIL_FROM || '').trim() || 'ESTHMR <onboarding@resend.dev>';
  return keys.map((_, i) => froms[i] || fallback);
}

/* The chain in the order MAIL_ORDER asks for.
 *
 * A comma list of step ids. Steps it names come first, in that order; steps it
 * does not name follow in the default order; ids it names that do not exist
 * are ignored rather than fatal, so a typo cannot silence sign-in. Unset, the
 * chain is exactly what it was before this existed. */
function ordered(chain, spec) {
  const want = String(spec || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!want.length) return chain;
  const byId = new Map(chain.map((s) => [s.id, s]));
  const first = want.map((id) => byId.get(id)).filter(Boolean);
  const named = new Set(first.map((s) => s.id));
  return first.concat(chain.filter((s) => !named.has(s.id)));
}

export function providerChain(env) {
  const keys = mailKeys(env);
  const froms = mailFroms(env);
  const steps = keys.map((key, i) => ({ id: `resend#${i + 1}`, provider: 'resend', key, from: froms[i] }));
  const chain = steps.slice(0, 1);
  if (brevoKey(env) && brevoFrom(env)) {
    chain.push({ id: 'brevo', provider: 'brevo', key: brevoKey(env), from: brevoFrom(env) });
  }
  if (sendPulseCredential(env) && sendPulseFrom(env)) {
    chain.push({ id: 'sendpulse', provider: 'sendpulse' });
  }
  chain.push(...steps.slice(1));
  return ordered(chain, env.MAIL_ORDER);
}

/** Walk the chain until one of them takes the message. Returns which did.
 *
 * `attempt` is passed in rather than called directly so the order and the
 * give-up rules can be tested without a network.
 */
export async function deliver(chain, attempt) {
  const failures = [];
  /* The From addresses Resend has refused the message for. Scoped to the
     address rather than one flag for the provider, because keys now send as
     different addresses: a 403 for esthmr.com on key #3 says nothing about
     whether key #1 may send as thebarbarianproject.com, and a single flag would
     have skipped every remaining key on the first domain refusal. */
  const refusedFrom = new Set();
  for (const step of chain) {
    if (step.provider === 'resend' && refusedFrom.has(step.from || '')) {
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
      refusedFrom.add(step.from || '');
    }
  }
  throw new Error(failures.join(' | '));
}

async function postResend(key, message) {
  const response = await fetch('https://api.resend.com/emails', {
    signal: AbortSignal.timeout(10000),
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify(message),
  });
  if (response.ok) return { ok: true };
  return { ok: false, status: response.status, detail: await response.text().catch(() => '') };
}

const HEX32 = /^[0-9a-f]{32}$/i;

/** What this account was actually given to authenticate with.
 *
 * Two shapes exist and the account decides which you get, so the code has to
 * cope with both. An OAuth PAIR — a 32-hex id and a 32-hex secret — is
 * exchanged for a token that lasts an hour, which is worth caching. An API
 * TOKEN is simply presented as it is; there is nothing to exchange and nothing
 * to cache.
 *
 * They are told apart by shape rather than by which variable is set, because a
 * token lands in whichever variable was to hand when it was pasted. That is
 * not hypothetical: this account holds a 7-digit account number in
 * SENDPULSE_ID and a 74-character API token in SENDPULSE_SECRET, and
 * exchanging those two is refused with `invalid_client` — which reads exactly
 * like a mistyped password and is nothing of the kind.
 */
export function sendPulseCredential(env) {
  const token = String(env.SENDPULSE_TOKEN || '').trim();
  if (token) return { kind: 'token', token };
  const id = String(env.SENDPULSE_ID || '').trim();
  const secret = String(env.SENDPULSE_SECRET || '').trim();
  if (HEX32.test(id) && HEX32.test(secret)) return { kind: 'oauth', id, secret };
  if (secret) return { kind: 'token', token: secret };
  return null;
}

/** The bearer to put on a send. Exchanged and cached, or handed straight back. */
async function sendPulseToken(env, fresh) {
  const cred = sendPulseCredential(env);
  if (!cred) throw new Error('sendpulse: nothing configured');
  // A token is already the thing the API wants. Caching it would add a KV read
  // to every send in order to hand back what is already sitting in `env`.
  if (cred.kind === 'token') return cred.token;
  if (!fresh) {
    const held = await env.ESTHMR_AUTH.get('sp:token');
    if (held) return held;
  }
  const response = await fetch('https://api.sendpulse.com/oauth/access_token', {
    signal: AbortSignal.timeout(10000),
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: cred.id,
      client_secret: cred.secret,
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
    signal: AbortSignal.timeout(10000),
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: payload,
  });

  let response = await post(await sendPulseToken(env, false));
  // A CACHED token can outlive its welcome — KV is eventually consistent, and a
  // token can be revoked under us. One retry with a fresh one, then stop. An
  // API token is not cached, so re-fetching would present the same string again
  // and buy a second identical 401.
  if (response.status === 401 && sendPulseCredential(env).kind === 'oauth') {
    response = await post(await sendPulseToken(env, true));
  }

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

export async function postBrevo(key, message, fromAddress) {
  const sender = fromAddress || parseAddress(message.from);
  const payload = JSON.stringify({
    sender: { name: sender.name || 'ESTHMR', email: sender.email },
    to: message.to.map((email) => ({ email })),
    subject: message.subject,
    htmlContent: message.html,
    textContent: message.text,
  });
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    signal: AbortSignal.timeout(10000),
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': key,
      'content-type': 'application/json',
    },
    body: payload,
  });
  if (response.ok) return { ok: true };
  return { ok: false, status: response.status, detail: await response.text().catch(() => '') };
}

async function sendCode(env, email, code) {
  const chain = providerChain(env);
  if (!chain.length) {
    // Refusing loudly beats pretending a code was sent that never was.
    throw new Error('no mail provider configured');
  }
  const message = codeMessage(env, email, code);
  const used = await deliver(chain, (step) => {
    if (step.provider === 'resend') {
      return postResend(step.key, { ...message, from: step.from || message.from });
    }
    if (step.provider === 'brevo') {
      return postBrevo(step.key, message, step.from);
    }
    return postSendPulse(env, message);
  });
  // Which provider actually carried it — the thing you want in `wrangler tail`
  // when somebody says the code never arrived.
  console.log('code sent via', used);
}

// Enforce the limit on bytes actually received, including chunked bodies.
// A declared Content-Length alone is not a bound on an untrusted request.
async function smallJson(request) {
  const limit = 16384;
  const invalid = (status) => Object.assign(new Error('invalid request body'), { status });
  if (Number(request.headers.get('content-length')) > limit) throw invalid(413);
  if (!request.body) throw invalid(400);
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) { await reader.cancel(); throw invalid(413); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  let body;
  try { body = JSON.parse(new TextDecoder().decode(bytes)); } catch { throw invalid(400); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw invalid(400);
  return body;
}

/** Save verified user to KV directory and sync to Brevo Contacts. */
export async function recordUser(env, email, ctx) {
  const now = new Date().toISOString();
  const userKey = `user:${email}`;
  let record = { email, created_at: now, last_login: now, logins: 1 };
  try {
    if (env.ESTHMR_AUTH && typeof env.ESTHMR_AUTH.get === 'function') {
      const existing = await env.ESTHMR_AUTH.get(userKey, 'json');
      if (existing && typeof existing === 'object') {
        record = {
          email,
          created_at: existing.created_at || now,
          last_login: now,
          logins: (Number(existing.logins) || 1) + 1,
        };
      }
      await env.ESTHMR_AUTH.put(userKey, JSON.stringify(record));

      // Maintain master user directory index in KV:
      const indexKey = 'users:all';
      const held = await env.ESTHMR_AUTH.get(indexKey, 'json');
      const users = Array.isArray(held) ? held : [];
      if (!users.includes(email)) {
        users.push(email);
        await env.ESTHMR_AUTH.put(indexKey, JSON.stringify(users));
      }
    }
  } catch (err) {
    console.warn('[auth] recordUser KV write failed:', err && err.message);
  }

  // Sync to Brevo Contacts in the background:
  const brevo = brevoKey(env);
  if (brevo) {
    const sync = fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': brevo,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ email, updateEnabled: true }),
    }).catch((err) => console.warn('[auth] Brevo contact sync failed:', err && err.message));
    if (ctx && typeof ctx.waitUntil === 'function') {
      ctx.waitUntil(sync);
    }
  }
  return record;
}

/** Recover user emails from Resend API (sent emails and audiences) across all configured keys. */
export async function syncFromResend(env, ctx) {
  const keys = mailKeys(env);
  const found = new Map(); // email -> earliest created_at
  const details = [];

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const keyId = `resend#${i + 1}`;
    let emailCount = 0;
    let audienceCount = 0;
    const errors = [];

    // 1. Fetch sent emails from /emails
    try {
      const res = await fetch('https://api.resend.com/emails?limit=100', {
        headers: {
          authorization: `Bearer ${key}`,
          accept: 'application/json',
          'user-agent': 'ESTHMR/1.0',
        },
      });
      if (res.ok) {
        const json = await res.json();
        const list = Array.isArray(json?.data) ? json.data : (Array.isArray(json) ? json : []);
        for (const item of list) {
          const recipients = Array.isArray(item.to) ? item.to : (item.to ? [item.to] : []);
          for (const raw of recipients) {
            const addr = parseAddress(raw).email.toLowerCase().trim();
            if (EMAIL.test(addr)) {
              emailCount++;
              const prev = found.get(addr);
              if (!prev || (item.created_at && item.created_at < prev)) {
                found.set(addr, item.created_at || new Date().toISOString());
              }
            }
          }
        }
      } else {
        const body = await res.text().catch(() => '');
        errors.push(`emails: HTTP ${res.status} - ${body}`);
      }
    } catch (err) {
      errors.push(`emails: ${err && err.message}`);
    }

    // 2. Fetch audience contacts from /audiences
    try {
      const audRes = await fetch('https://api.resend.com/audiences', {
        headers: {
          authorization: `Bearer ${key}`,
          accept: 'application/json',
          'user-agent': 'ESTHMR/1.0',
        },
      });
      if (audRes.ok) {
        const audData = await audRes.json();
        const audiences = Array.isArray(audData?.data) ? audData.data : [];
        for (const aud of audiences) {
          if (!aud?.id) continue;
          const cRes = await fetch(`https://api.resend.com/audiences/${aud.id}/contacts`, {
            headers: {
              authorization: `Bearer ${key}`,
              accept: 'application/json',
              'user-agent': 'ESTHMR/1.0',
            },
          });
          if (cRes.ok) {
            const cData = await cRes.json();
            const contacts = Array.isArray(cData?.data) ? cData.data : [];
            for (const c of contacts) {
              const addr = (c.email || '').toLowerCase().trim();
              if (EMAIL.test(addr)) {
                audienceCount++;
                const prev = found.get(addr);
                if (!prev || (c.created_at && c.created_at < prev)) {
                  found.set(addr, c.created_at || new Date().toISOString());
                }
              }
            }
          } else {
            const cBody = await cRes.text().catch(() => '');
            errors.push(`contacts(${aud.id}): HTTP ${cRes.status} - ${cBody}`);
          }
        }
      } else {
        const audBody = await audRes.text().catch(() => '');
        errors.push(`audiences: HTTP ${audRes.status} - ${audBody}`);
      }
    } catch (err) {
      // Audiences optional
    }

    details.push({
      key: keyId,
      emails_seen: emailCount,
      audience_contacts: audienceCount,
      errors: errors.length ? errors : undefined,
    });
  }

  // 3. Save all found emails into KV and Brevo:
  const newlyAdded = [];
  const existingUsers = [];
  const now = new Date().toISOString();

  for (const [email, createdAt] of found.entries()) {
    const userKey = `user:${email}`;
    let existing = null;
    if (env.ESTHMR_AUTH && typeof env.ESTHMR_AUTH.get === 'function') {
      existing = await env.ESTHMR_AUTH.get(userKey, 'json');
    }
    if (!existing) {
      const record = {
        email,
        created_at: createdAt || now,
        last_login: createdAt || now,
        logins: 1,
      };
      if (env.ESTHMR_AUTH && typeof env.ESTHMR_AUTH.put === 'function') {
        await env.ESTHMR_AUTH.put(userKey, JSON.stringify(record));
      }
      newlyAdded.push(email);
    } else {
      existingUsers.push(email);
    }

    // Sync to Brevo Contacts in background:
    const brevo = brevoKey(env);
    if (brevo) {
      const sync = fetch('https://api.brevo.com/v3/contacts', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'api-key': brevo,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ email, updateEnabled: true }),
      }).catch((err) => console.warn('[auth] Brevo sync failed for', email, err && err.message));
      if (ctx && typeof ctx.waitUntil === 'function') ctx.waitUntil(sync);
    }
  }

  // 4. Update users:all in KV:
  if (env.ESTHMR_AUTH && typeof env.ESTHMR_AUTH.get === 'function') {
    const held = await env.ESTHMR_AUTH.get('users:all', 'json');
    const users = Array.isArray(held) ? held : [];
    let updated = false;
    for (const email of found.keys()) {
      if (!users.includes(email)) {
        users.push(email);
        updated = true;
      }
    }
    if (updated) {
      await env.ESTHMR_AUTH.put('users:all', JSON.stringify(users));
    }
  }

  return {
    total_recovered: found.size,
    newly_added: newlyAdded.length,
    already_in_db: existingUsers.length,
    new_emails: newlyAdded,
    all_recovered_emails: Array.from(found.keys()),
    details_per_key: details,
  };
}

async function api(request, env, url, ctx) {
  const path = url.pathname.replace('/esthmr/api', '');
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';

  /* The fingerprint of what this deployment is actually serving. Ungated.
   *
   * /data/v1/manifest.json is behind the session gate below, so nothing
   * outside can ask "is what you are serving the same as what was committed?"
   * — which is the only question an external watchdog exists to answer, and
   * the one a committed file cannot answer, because a committed file says what
   * was BUILT. This reads the manifest out of the asset bundle that is live.
   *
   * It discloses a sixteen-character hash and a build time. No company, no
   * price, no figure — nothing the gate is there to protect. */
  if (path === '/version') {
    const manifest = await env.ASSETS
      .fetch(new Request(new URL('/data/v1/manifest.json', url)))
      .then((answer) => (answer.ok ? answer.json() : null))
      .catch(() => null);
    return json({
      data_version: manifest?.data_version ?? null,
      generated_at: manifest?.generated_at ?? null,
    }, manifest ? 200 : 503, { 'cache-control': 'no-store' });
  }

  /* The outlet's picture, fetched by this site rather than by the reader.
   *
   * News thumbnails were hotlinked straight from the publisher, so a picture
   * appeared only if the READER's own network could reach that publisher's
   * host. Two of the five outlets we carry — Al Borsa and Hapi, 266 of 400
   * items — answer on Cloudflare addresses (188.114.96.7, 188.114.97.7) that
   * some routes cannot reach at all. From such a network the request does not
   * fail, it HANGS: measured at fifteen seconds with no response, so the
   * `onerror` that hides a broken picture never fires in time and the frame
   * sits empty. Two thirds of the news list, for anyone on those routes.
   *
   * Fetching it here makes the picture depend on a host the reader has already
   * reached — this one — and lets the edge cache each image once for everyone
   * instead of every reader pulling from the outlet.
   *
   * `no-referrer` on the tag stopped the outlet learning which story was being
   * read; that property is kept, because the fetch below sends no referrer
   * either.
   */
  if (path === '/img') {
    let target;
    try {
      target = new URL(url.searchParams.get('u') || '');
    } catch {
      return new Response('bad url', { status: 400 });
    }
    if (!imageAllowed(target)) {
      return new Response('host not carried', { status: 403 });
    }

    /* Served from the edge when it has been asked for before.
     *
     * This does NOT save the Worker invocation — on a Worker route the script
     * runs in front of cache, so every thumbnail is billed whatever this does,
     * and there is no arrangement of headers that changes it. What it saves is
     * everything after: the redirect walk, the upstream fetch, the outlet's
     * bandwidth and ours. A published article's picture never changes, so the
     * second reader of a story — and the same reader on a new device — gets it
     * from the colo rather than from Hapi.
     *
     * The key is the CANONICAL upstream URL rather than the request as it
     * arrived, so two encodings of the same picture are one cache entry
     * instead of two.
     */
    const shelf = typeof caches !== 'undefined' && caches.default ? caches.default : null;
    const key = new Request(`https://esthmr.com/esthmr/api/img?u=${encodeURIComponent(target.toString())}`);
    const known = shelf ? await shelf.match(key) : undefined;
    if (known) return known;

    /* The same address ceiling the data gate uses.
     *
     * This route is unauthenticated and every request is a Worker invocation
     * against a shared daily budget — the same budget the sign-in and the data
     * gate spend. A reader loading the news list costs about forty of them,
     * which is fine; a script looping on `?u=` with a cache-busting query is
     * not, and nothing else here would stop it. Fails open, for the reason
     * `overRate` gives. */
    if (await overRate(env, `img-ip:${ip}`, 'DATA_IP_LIMIT')) {
      return new Response('slow down', { status: 429 });
    }

    /* Redirects are followed by hand, one hop at a time, with the allowlist
       applied to every hop.
       `redirect: 'follow'` checks the host you asked for and nothing after it:
       a carried outlet answering 302 to anywhere would have this origin serve
       that instead, on this account's bandwidth. Two hops is more than any of
       these outlets uses and still terminates. */
    let upstream;
    let next = target;
    try {
      for (let hop = 0; ; hop += 1) {
        upstream = await fetch(next.toString(), {
          headers: { 'user-agent': IMAGE_UA, accept: 'image/*,*/*;q=0.8' },
          redirect: 'manual',
          // The same ten seconds `solved()` allows Turnstile. Without it a
          // slow outlet holds a Worker open for as long as it likes.
          signal: AbortSignal.timeout(10000),
          cf: { cacheEverything: true, cacheTtl: 604800 },
        });
        if (![301, 302, 303, 307, 308].includes(upstream.status)) break;
        if (hop >= 2) return new Response('too many redirects', { status: 502 });
        let moved;
        try {
          moved = new URL(upstream.headers.get('location') || '', next);
        } catch {
          return new Response('bad redirect', { status: 502 });
        }
        if (!imageAllowed(moved)) {
          return new Response('redirected off the allowlist', { status: 403 });
        }
        next = moved;
      }
    } catch {
      return new Response('upstream', { status: 502 });
    }

    const type = (upstream.headers.get('content-type') || '').toLowerCase();
    /* Anything that is not an image is refused rather than passed through.
       Without this the route would serve another site's HTML from this origin,
       which is a redirect the address bar does not show.

       SVG is excluded from "an image" on purpose: it is a document that may
       carry script, and served from this origin that script would run as this
       origin. None of these outlets illustrate a story with one. */
    if (!upstream.ok || !type.startsWith('image/') || type.startsWith('image/svg')) {
      return new Response('not an image', { status: 502 });
    }

    /* A thumbnail is tens of kilobytes; the largest in the current feed is
       under a megabyte. Anything claiming more than this is not a thumbnail,
       and streaming it would spend bandwidth and cache on one object. */
    const declared = Number(upstream.headers.get('content-length') || 0);
    if (declared > 8 * 1024 * 1024) {
      return new Response('too large', { status: 502 });
    }

    const headers = new Headers({
      'content-type': type,
      // A published article's picture does not change, which is what makes a
      // long immutable cache correct here rather than merely convenient.
      'cache-control': 'public, max-age=604800, immutable',
      'x-content-type-options': 'nosniff',
    });
    const length = upstream.headers.get('content-length');
    if (length) headers.set('content-length', length);
    const answer = new Response(upstream.body, { status: 200, headers });
    // Stored after the response is on its way, not before it: a reader waits
    // for the picture, not for our bookkeeping. Only 200s are kept — a refusal
    // cached for a week outlives whatever caused it.
    if (shelf && ctx && typeof ctx.waitUntil === 'function') ctx.waitUntil(shelf.put(key, answer.clone()));
    return answer;
  }

  if (path === '/auth/me') {
    if (request.method !== 'GET') return json({ error: 'method' }, 405, { allow: 'GET' });
    const who = await session(request, env);
    return who ? json({ email: who.e }) : json({ error: 'signed out' }, 401);
  }

  if (path === '/auth/signout') {
    if (request.method !== 'POST') return json({ error: 'method' }, 405, { allow: 'POST' });
    return json({ ok: true }, 200, {
      'set-cookie': `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
    });
  }

  /* Read and replace, rather than add and remove one at a time. The list is
     sixty short strings; sending all of it makes the client's copy and the
     stored one the same object, so they cannot drift apart, and a lost
     response costs one redraw instead of one silently dropped company. */
  if (path === '/watchlist') {
    const who = await session(request, env);
    if (!who) return json({ error: 'signed out' }, 401, { 'cache-control': 'no-store' });
    const key = `wl:${who.e}`;
    if (request.method === 'GET') {
      let held;
      try { held = await env.ESTHMR_AUTH.get(key, 'json'); }
      catch { return json({ error: 'watchlist unavailable' }, 503, { 'cache-control': 'no-store' }); }
      return json({ tickers: cleanTickers(held) || [] }, 200, { 'cache-control': 'no-store' });
    }
    if (request.method === 'PUT') {
      if (await overLimit(env, 'watch', who.e, LIMITS.watchPerSession)) {
        return json({ error: 'slow down' }, 429, { 'cache-control': 'no-store' });
      }
      const sent = await smallJson(request);
      const tickers = cleanTickers(sent && sent.tickers);
      if (!tickers) return json({ error: 'tickers' }, 400);
      await env.ESTHMR_AUTH.put(key, JSON.stringify(tickers));
      return json({ tickers }, 200, { 'cache-control': 'no-store' });
    }
    return json({ error: 'method' }, 405);
  }

  if (path === '/auth/users') {
    if (request.method !== 'GET') return json({ error: 'method' }, 405, { allow: 'GET' });
    const secret = env.STATUS_TOKEN || env.SESSION_SECRET;
    if (!secret) return json({ error: 'not configured' }, 503);
    const offered = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
      || url.searchParams.get('token') || '';
    if (!offered || offered !== secret) {
      return json({ error: 'unauthorized' }, 401);
    }
    const targetEmail = normalise(url.searchParams.get('email') || '');
    if (targetEmail) {
      const user = env.ESTHMR_AUTH ? await env.ESTHMR_AUTH.get(`user:${targetEmail}`, 'json') : null;
      if (!user) return json({ error: 'user not found' }, 404);
      return json(user, 200, { 'cache-control': 'no-store' });
    }
    const held = env.ESTHMR_AUTH ? await env.ESTHMR_AUTH.get('users:all', 'json') : [];
    const users = Array.isArray(held) ? held : [];
    return json({ count: users.length, users }, 200, { 'cache-control': 'no-store' });
  }

  if (path === '/auth/sync-resend') {
    const secret = env.STATUS_TOKEN || env.SESSION_SECRET;
    if (!secret) return json({ error: 'not configured' }, 503);
    const offered = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
      || url.searchParams.get('token') || '';
    if (!offered || offered !== secret) {
      return json({ error: 'unauthorized' }, 401);
    }
    const report = await syncFromResend(env, ctx);
    return json(report, 200, { 'cache-control': 'no-store' });
  }

  if (request.method !== 'POST') return json({ error: 'method' }, 405);
  const body = await smallJson(request);

  if (path === '/auth/request') {
    const email = normalise(body.email);
    if (!EMAIL.test(email) || email.length > 200) return json({ error: 'email' }, 400);
    /* A solved challenge buys the ordinary allowance. Failing to solve one
     * buys a much smaller allowance — it does not buy a locked door.
     *
     * The hard refusal this replaces was written before watching Turnstile
     * fail on a machine that could not resolve one of its own challenge hosts
     * — brunhild.challenges.cloudflare.com, no DNS answer, widget times out.
     * A reader behind that, or an aggressive blocker, or a network Cloudflare
     * is having a bad day with, could not sign in at all and could do nothing
     * about it. Their sign-in is not the attack.
     *
     * So an unsolved browser gets six sends an hour from its address instead
     * of sixty. A bot spraying addresses from one machine loses ninety per
     * cent of its throughput; a person who cannot render a widget waits, at
     * worst, and still gets in. The per-EMAIL ceiling is untouched either
     * way, because that is the one protecting a stranger's inbox.
     */
    // A throwaway address is refused outright rather than rationed: unlike a
    // reader whose challenge widget will not load, there is no version of this
    // request that deserves to succeed.
    const throwaway = disposable(email);
    if (throwaway) {
      console.log('refused a disposable address at', throwaway);
      return json({ error: 'disposable email' }, 403);
    }
    const challenged = Boolean(env.TURNSTILE_SECRET)
      && (mustSolve(request.headers.get('origin'), true)
        || spoofedBrowser(request.headers.get('origin'), request.headers.get('user-agent')));
    const passed = challenged ? await solved(env, body.turnstile, ip) : true;
    if (!passed && await overLimit(env, 'unsolved', ip, LIMITS.codePerIpUnsolved)) {
      return json({ error: 'too many requests' }, 429);
    }
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
    await recordUser(env, email, ctx);
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

/* ── esthmr.com ───────────────────────────────────────────────────────────
 *
 * The product lives at /esthmr/ inside this site's assets and now has a domain
 * of its own. Rather than copy the files to a second place — two copies of a
 * site drift, and the one nobody is watching drifts first — that host serves
 * the same assets with the prefix implied: esthmr.com/ is /esthmr/index.html,
 * and esthmr.com/logic.js is /esthmr/logic.js.
 *
 * Two paths are left alone. /esthmr/api/ and /data/v1/ are written absolute in
 * the client and answer identically on either host, and prefixing them would
 * ask for /esthmr/data/v1/, which does not exist.
 *
 * A path that has no file under the prefix falls back to the unprefixed one,
 * which is what keeps /favicon.svg and the touch icon — shared with the rest
 * of the site and living at its root — from 404ing on this host alone.
 */
/* The outlets whose pictures this site will fetch on a reader's behalf.
 *
 * An allowlist rather than "any image URL", because the route below fetches
 * whatever it is handed: without this it is an open proxy anyone can point at
 * any host, serving someone else's bytes from this origin and on this
 * account's bandwidth. A new outlet in the news pipeline needs a line here, and
 * until it gets one its pictures simply do not show — which is the safe way
 * round.
 */
const IMAGE_HOSTS = new Set([
  'alborsaanews.com', 'www.alborsaanews.com', 'images.alborsaanews.com',
  'hapijournal.com', 'www.hapijournal.com',
  'almalnews.com', 'www.almalnews.com', 'media.almalnews.com',
  'arabfinance.com', 'www.arabfinance.com',
  // Reached only through Photon below, never directly, but it belongs in the
  // same list because it is the same decision: an outlet whose pictures we
  // carry.
  'ent.news', 'www.ent.news',
]);

const PHOTON = /^i[0-3]\.wp\.com$/;

/* Is this a URL whose picture we carry?
 *
 * Takes the whole URL, not the hostname, and that is the entire point.
 * Checking only the host admitted Jetpack's Photon CDN — `i0.wp.com` — whose
 * public interface puts the ORIGIN HOST IN THE PATH:
 * `https://i0.wp.com/<any-host>/<any-path>`. So one entry on the allowlist
 * quietly readmitted every host on the internet, and this route served 4.7 MB
 * of upload.wikimedia.org from esthmr.com, on this account's bandwidth, pinned
 * in the edge cache for a week. The redirect loop below re-checks every hop
 * precisely so an outlet cannot point us elsewhere; Photon did it in one hop
 * with no redirect at all.
 *
 * The fix is not to drop wp.com — 14 items genuinely need it — but to require
 * that the host it is asked to fetch is itself one we carry.
 */
function imageAllowed(target) {
  if (!target || target.protocol !== 'https:') return false;
  const host = String(target.hostname || '').toLowerCase();
  if (IMAGE_HOSTS.has(host)) return true;
  if (!PHOTON.test(host)) return false;
  // Photon's first path segment is the origin host, optionally with a port.
  const first = target.pathname.split('/').filter(Boolean)[0] || '';
  return IMAGE_HOSTS.has(first.toLowerCase().split(':')[0]);
}

const IMAGE_UA = (
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
  + '(KHTML, like Gecko) Chrome/140.0 Safari/537.36'
);

const ESTHMR_HOSTS = new Set(['esthmr.com', 'www.esthmr.com']);
// '/robots.txt' is root-only by specification: there is no such thing as a
// robots file for a path prefix. Without it here, esthmr.com asks the asset
// server for /esthmr/robots.txt, takes a 404, and falls back — one wasted
// fetch to arrive at the same file.
const UNPREFIXED = ['/esthmr/', '/data/v1/', '/robots.txt'];

/* Six months, and no `preload`. The redirect above only helps a reader who has
 * already been sent over http once; this is what stops the browser trying it
 * again. `preload` is deliberately not asserted: it is a submission to a list
 * baked into browsers and effectively permanent, and this domain is a day old.
 * `includeSubDomains` is left off for the same reason — nothing is on a
 * subdomain of it yet, and the day something is, it inherits a promise nobody
 * made for it. */
const HSTS = 'max-age=15552000';

/** The same response, with the header that keeps the next visit encrypted. */
function secure(answer) {
  const headers = new Headers(answer.headers);
  headers.set('strict-transport-security', HSTS);
  return new Response(answer.body, {
    status: answer.status,
    statusText: answer.statusText,
    headers,
  });
}

function underEsthmr(url) {
  if (UNPREFIXED.some((prefix) => url.pathname.startsWith(prefix))) return null;
  const target = new URL(url);
  // '/esthmr/' rather than '/esthmr/index.html': the asset server's own
  // html_handling answers the explicit file with a 307 to the directory, and
  // that redirect would land the reader on esthmr.com/esthmr/ — the prefix
  // this host exists to hide, in the address bar of its own front page.
  target.pathname = '/esthmr' + (url.pathname === '/' ? '/' : url.pathname);
  return target;
}

/** A redirect from the prefixed fetch, said in this host's own terms.
 *
 * The asset server still redirects some paths on its own — /index.html to /,
 * a directory without its slash — and every one of those Locations names the
 * prefix. Left alone they walk the reader out of the clean URL one link at a
 * time.
 */
function unprefixLocation(answer, url) {
  const location = answer.headers.get('location');
  if (!location) return answer;
  const to = new URL(location, url);
  if (to.origin !== url.origin || !to.pathname.startsWith('/esthmr/')) return answer;
  const headers = new Headers(answer.headers);
  headers.set('location', to.pathname.slice('/esthmr'.length) + to.search + to.hash);
  return new Response(answer.body, { status: answer.status, headers });
}

/** Everything that is the same on either host: the API, the gate, the assets. */
async function serve(request, env, url, ctx) {
  if (url.pathname.startsWith('/esthmr/api/')) {
    const answer = await api(request, env, url, ctx).catch((error) =>
      json({ error: error.status === 413 ? 'request too large' : error.status === 400 ? 'invalid JSON object' : 'server' }, error.status || 500));
    if (url.pathname.includes('/auth/') || url.pathname.endsWith('/watchlist')) {
      const headers = new Headers(answer.headers);
      headers.set('cache-control', 'no-store');
      return new Response(answer.body, { status: answer.status, headers });
    }
    return answer;
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
    /* Two ceilings, because one account is not the unit an abuser is limited
     * to. Minting another costs an email round trip, and the sign-in counters
     * above say exactly how cheap that is: six an hour from one address
     * without solving the challenge, sixty with. So a per-account ceiling of
     * 90/min is really 540/min from one machine, or 5,400 if it solves — the
     * account limit does not bind the thing doing the pulling.
     *
     * The address does. It is deliberately much looser than the per-account
     * one for the reason this file keeps repeating: an address is not a
     * person. An office behind one NAT and a carrier on CGNAT put hundreds of
     * readers on a single address, and a tight ceiling there locks all of them
     * out for what one of them did. 300/min is around nine full page loads a
     * minute shared between everyone on that address — slack for a crowd,
     * still a hard stop for a machine rotating accounts.
     *
     * Both fail open, for the reason `overRate` gives: a limiter must not be
     * able to take the site down. The gate itself is the session, not this. */
    const ip = request.headers.get('cf-connecting-ip') || 'unknown';
    // Ask the asset layer FIRST, and only spend allowance on a document that
    // is actually delivered.
    //
    // The limiters used to run before this fetch, so a revalidation that came
    // back 304 — no body, nothing read — cost the account exactly what a full
    // download did. The header below tells the browser to revalidate every
    // read, and the asset layer answers those with 304 (ETags are emitted and
    // honoured), so a reader returning to a screen they had already seen was
    // charged for data they were never sent. On a 33-document boot against a
    // 90-a-minute ceiling that is what turned a second look at the site into
    // a 429. A 304 delivers no data, so it is not what the ceiling guards.
    //
    // The property that matters is unchanged: when the account IS over, the
    // body fetched here is discarded and the reader gets the 429, not the
    // document. The fetch itself is the platform's own asset store, not a
    // KV read or an upstream call — cheap enough that asking before charging
    // costs nothing worth counting.
    const answer = await env.ASSETS.fetch(request);
    if (answer.status !== 304) {
      if (await overRate(env, `data:${who.e}`)
          || await overRate(env, `data-ip:${ip}`, 'DATA_IP_LIMIT')) {
        // The document was produced and is not being sent. Say so to the
        // stream rather than dropping the reference: a discarded body is not
        // a cancelled one, and the platform keeps it open until it is.
        try { await answer.body?.cancel(); } catch { /* already closed */ }
        return json({ error: 'slow down' }, 429, { 'cache-control': 'no-store' });
      }
    }
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
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const host = url.hostname.toLowerCase();

    if (ESTHMR_HOSTS.has(host)) {
      /* Over http the whole site answered in the clear, which on this host is
         worse than it sounds: the session cookie is `Secure`, so signing in
         there could not work and nothing said why. thebarbarianproject.com has
         had Always Use HTTPS on at the zone since it went up; the new zone was
         created without it. Doing it here rather than in a dashboard setting
         means it is in the repository, it is tested, and it cannot be quietly
         turned off. */
      if (url.protocol === 'http:') {
        url.protocol = 'https:';
        // Through secure(): a bare Response.redirect carries no HSTS, so a
        // browser that had only ever seen www.esthmr.com had no pin for it.
        return secure(Response.redirect(url.toString(), 301));
      }
      // One address for one site: www is a second name for the same pages, and
      // two names mean two sets of cookies and two things to link to.
      if (host === 'www.esthmr.com') {
        url.hostname = 'esthmr.com';
        // Through secure(): a bare Response.redirect carries no HSTS, so a
        // browser that had only ever seen www.esthmr.com had no pin for it.
        return secure(Response.redirect(url.toString(), 301));
      }
      const mapped = underEsthmr(url);
      if (mapped) {
        const answer = await env.ASSETS.fetch(new Request(mapped, request));
        return secure(answer.status !== 404 ? unprefixLocation(answer, url)
          : await env.ASSETS.fetch(request));
      }
      return secure(await serve(request, env, url, ctx));
    }

    return serve(request, env, url, ctx);
  },
};

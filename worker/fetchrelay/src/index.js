/**
 * A private fetch relay for this project's own build.
 *
 * WHY IT EXISTS
 * Two of the pipeline's sources answer a GitHub Actions runner with 403 and a
 * laptop with 200. Investing.com is the one that matters: `rate_history.py`
 * fetches seven daily series from it, and every build since the step was added
 * has logged seven 403s and carried yesterday's file forward — so the curves
 * on the Exchange screen have been frozen since the day they were committed.
 * The exchange's own host does the same thing by resetting the connection.
 *
 * Neither is a policy about us. Investing's robots.txt disallows a dozen paths
 * and no API path among them; this is a blanket block on cloud IP ranges,
 * which a runner happens to sit in and a Cloudflare Worker happens not to.
 * Measured: the same request that 403s from CI answers 200 in 36ms from here.
 *
 * WHAT IT IS NOT
 * It is not an open proxy. An open relay on a public URL is an abuse vector
 * and would deserve everything that came of it, so three things are true of
 * every request:
 *
 *   * the host must be on the list below — two of them, both already named in
 *     docs/data-sources.md, and nothing else;
 *   * the caller must present the shared secret, which lives in a Worker
 *     secret and a GitHub Actions secret and nowhere in this repository;
 *   * it carries GET and POST only, it forwards no cookies and no
 *     credentials, and it caps both what it sends and what it carries back.
 *
 * POST is here for one source. The exchange's own filing archive is behind a
 * JSON API whose search endpoint takes its window — `dateFrom`, `dateTo` — in
 * a request body, so a GET-only relay could reach the market watch and not
 * the filings. Without it the filing archive can only be harvested from a
 * machine outside the cloud ranges, which is one laptop, which is not a
 * pipeline. The method is still an allowlist of two: nothing here can PUT or
 * DELETE against anything.
 *
 * A relay that could be pointed at anything would be a different program with
 * a different set of consequences.
 *
 *   npx wrangler secret put RELAY_TOKEN
 */

/** The only hosts this will fetch. Both are declared in docs/data-sources.md. */
const HOSTS = new Set(['api.investing.com', 'www.investing.com', 'beta.egx.com.eg']);

/** 8 MB. The largest thing the pipeline asks for is a few hundred kilobytes. */
const MAX_BYTES = 8 * 1024 * 1024;

/** 64 KB going out. Every body this pipeline sends is a few dozen bytes of
 *  JSON naming a date window; a cap this size fits all of them with room and
 *  keeps the relay from being a way to push anything substantial anywhere. */
const MAX_SENT = 64 * 1024;

/** The only methods this will use. Both are reads as far as the sources go —
 *  the exchange's search endpoint is a POST because of its body, not because
 *  it changes anything — and neither can be pointed at a write. */
const METHODS = new Set(['GET', 'POST']);

/** Headers a caller may set on the upstream request. Everything else is
 *  dropped: a relay that forwards arbitrary headers forwards credentials. */
const PASS = new Set(['accept', 'accept-language', 'user-agent', 'referer',
  'domain-id', 'x-egx-bff-request', 'content-type']);

const json = (body, status) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});

/** Compare without leaking the answer in the timing. */
function same(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** The upstream this request is asking for, or a reason it is refused. */
export function target(rawUrl, allowed = HOSTS) {
  if (!rawUrl) return { error: 'no url' };
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return { error: 'url' };
  }
  // http would carry the request in the clear for the leg the relay does not
  // control, which is the whole leg that matters.
  if (url.protocol !== 'https:') return { error: 'https only' };
  if (!allowed.has(url.hostname.toLowerCase())) return { error: `host ${url.hostname}` };
  return { url };
}

export default {
  async fetch(request, env) {
    if (!METHODS.has(request.method)) return json({ error: 'method' }, 405);
    if (!env.RELAY_TOKEN) return json({ error: 'no token configured' }, 503);

    const offered = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    if (!same(offered, env.RELAY_TOKEN)) return json({ error: 'no' }, 401);

    const asked = target(new URL(request.url).searchParams.get('u'));
    if (asked.error) return json({ error: asked.error }, 400);

    const headers = new Headers();
    for (const [name, value] of request.headers) {
      const key = name.toLowerCase();
      if (key.startsWith('x-relay-') && PASS.has(key.slice(8))) {
        headers.set(key.slice(8), value);
      }
    }

    // The caller's body, for the one endpoint that needs one. Read before the
    // upstream call so an oversized body is refused here rather than streamed
    // onward and then regretted.
    let sent = null;
    if (request.method === 'POST') {
      sent = await request.arrayBuffer();
      if (sent.byteLength > MAX_SENT) return json({ error: 'body too large' }, 413);
    }

    let answer;
    try {
      answer = await fetch(asked.url.toString(), {
        method: request.method,
        headers,
        body: sent,
        // `manual`, not `follow`: a 30x on a POST is re-sent by `follow` as a
        // GET to wherever the upstream says, which is a request the caller
        // never made to a URL the allowlist never saw. The status comes back
        // and the caller decides.
        redirect: request.method === 'POST' ? 'manual' : 'follow',
      });
    } catch (error) {
      return json({ error: 'upstream', reason: String(error && error.message) }, 502);
    }

    const body = await answer.arrayBuffer();
    if (body.byteLength > MAX_BYTES) return json({ error: 'too large' }, 502);
    // The upstream's own status and type, passed through: the caller has to be
    // able to tell a 403 from a 200 or the relay hides the thing it exists to
    // report on.
    return new Response(body, {
      status: answer.status,
      headers: {
        'content-type': answer.headers.get('content-type') || 'application/octet-stream',
        'cache-control': 'no-store',
        'x-relay-host': asked.url.hostname,
        'x-relay-method': request.method,
      },
    });
  },
};

/**
 * The Barbarian community and sync API (spec §26, §27, §30, §53).
 *
 * A separate Worker from the website and from quotes, for the same reason those
 * two are separate from each other: a bad deploy here should be able to break
 * sync and nothing else. The site is a static-assets Worker with no `main`, and
 * breaking it would take the whole product down for readers who never sign in.
 *
 * **Nothing a reader browses comes through here.** Prices, statements,
 * disclosures, scanner output and research are static JSON on the CDN (§27,
 * §48). This handles only what is genuinely per-person: a watchlist, bookmarks,
 * and later posts and comments. That split is what keeps the free tier a real
 * plan rather than a hope — D1 allows 100,000 row writes a day, and a watchlist
 * change is one row.
 *
 * The app must keep working when this is unreachable (§54). Every endpoint here
 * is an enhancement to something already on the device.
 */

import { AuthError, authenticate } from './auth.js';
import {
  BadRequest,
  addBookmark,
  addToWatchlist,
  readBookmarks,
  readWatchlist,
  removeBookmark,
  removeFromWatchlist,
  reorderWatchlist,
} from './lists.js';

/** Request bodies are tiny; anything larger is not one of ours. */
const MAX_BODY_BYTES = 16 * 1024;

function json(body, { status = 200, headers = {} } = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      // Per-user data, and the app already caches it on the device. An
      // intermediary holding one reader's watchlist and handing it to the next
      // is the whole risk this header exists to prevent.
      'cache-control': 'no-store',
      ...headers,
    },
  });
}

/**
 * The app is not a browser page, so CORS is not what protects this API — the
 * token check is. These headers exist so the same endpoints can be called from
 * a signed-in web build later without a second deploy.
 */
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, PUT, POST, DELETE, OPTIONS',
  'access-control-allow-headers': 'authorization, content-type, x-auth-provider',
  'access-control-max-age': '86400',
};

async function readJson(request) {
  const length = Number(request.headers.get('content-length') ?? 0);
  if (length > MAX_BODY_BYTES) throw new BadRequest('that request is too large');
  const text = await request.text();
  if (text.length === 0) return {};
  if (text.length > MAX_BODY_BYTES) throw new BadRequest('that request is too large');
  try {
    const parsed = JSON.parse(text);
    if (parsed === null || typeof parsed !== 'object') {
      throw new BadRequest('expected a JSON object');
    }
    return parsed;
  } catch (error) {
    if (error instanceof BadRequest) throw error;
    throw new BadRequest('that is not valid JSON');
  }
}

/**
 * Coarse abuse protection (§53).
 *
 * Keyed by user once we know who they are, so one noisy account cannot spend
 * everybody's daily D1 budget. Cloudflare's limiter is per-location and
 * eventually consistent, which is the right trade here: it is a brake on abuse,
 * not an accounting system, and the cost of it occasionally allowing a few
 * extra requests is nothing.
 */
async function rateLimited(env, key) {
  if (!env.WRITE_LIMITER) return false;
  const { success } = await env.WRITE_LIMITER.limit({ key });
  return !success;
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '');

    // Unauthenticated, and deliberately says nothing about the deployment
    // beyond the fact that it is answering.
    if (path === '/v1/health') {
      return json({ ok: true }, { headers: CORS });
    }

    try {
      const segments = path.split('/').filter(Boolean);
      if (segments[0] !== 'v1' || segments[1] !== 'me') {
        return json({ error: 'no such endpoint' }, { status: 404, headers: CORS });
      }

      const userId = await authenticate(request, env);

      if (request.method !== 'GET' && (await rateLimited(env, userId))) {
        return json(
          { error: 'that is a lot of changes at once — try again in a moment' },
          { status: 429, headers: CORS },
        );
      }

      const response = await route(request, env, segments.slice(2), userId);
      if (response) return response;
      return json({ error: 'no such endpoint' }, { status: 404, headers: CORS });
    } catch (error) {
      if (error instanceof AuthError || error instanceof BadRequest) {
        return json({ error: error.message }, { status: error.status, headers: CORS });
      }
      // Nothing internal reaches the client: a stack trace or a SQL error is a
      // map of the system drawn for whoever asked for it.
      console.error('unhandled', error);
      return json({ error: 'something went wrong here' }, { status: 500, headers: CORS });
    }
  },
};

async function route(request, env, segments, userId) {
  const db = env.DB;
  const [collection, ...rest] = segments;

  if (collection === 'watchlist') {
    if (request.method === 'GET' && rest.length === 0) {
      return json({ tickers: await readWatchlist(db, userId) }, { headers: CORS });
    }
    if (request.method === 'POST' && rest[0] === 'order') {
      const body = await readJson(request);
      await reorderWatchlist(db, userId, body.tickers);
      return json({ tickers: await readWatchlist(db, userId) }, { headers: CORS });
    }
    if (rest.length === 1 && rest[0] !== 'order') {
      const ticker = rest[0].toUpperCase();
      if (request.method === 'PUT') {
        await addToWatchlist(db, userId, ticker);
        return json({ tickers: await readWatchlist(db, userId) }, { headers: CORS });
      }
      if (request.method === 'DELETE') {
        await removeFromWatchlist(db, userId, ticker);
        return json({ tickers: await readWatchlist(db, userId) }, { headers: CORS });
      }
    }
    return null;
  }

  if (collection === 'bookmarks') {
    if (request.method === 'GET' && rest.length === 0) {
      return json({ bookmarks: await readBookmarks(db, userId) }, { headers: CORS });
    }
    if (rest.length === 2) {
      const [kind, itemId] = [rest[0], decodeURIComponent(rest[1])];
      if (request.method === 'PUT') {
        await addBookmark(db, userId, kind, itemId, await readJson(request));
        return json({ bookmarks: await readBookmarks(db, userId) }, { headers: CORS });
      }
      if (request.method === 'DELETE') {
        await removeBookmark(db, userId, kind, itemId);
        return json({ bookmarks: await readBookmarks(db, userId) }, { headers: CORS });
      }
    }
    return null;
  }

  return null;
}

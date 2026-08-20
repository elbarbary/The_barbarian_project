/**
 * The sync endpoints end to end (spec §30, §33, §53).
 *
 * Every request here goes through the real router, the real token verification
 * and the real D1 schema — the same migration files production runs. Nothing is
 * stubbed except the providers' public keys.
 */

import { SELF, env } from 'cloudflare:test';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { authHeaders, installJwks, makeKeypair, serveKeys, signToken } from './tokens.js';

let keypair;

beforeAll(installJwks);

beforeEach(async () => {
  keypair = await makeKeypair();
  serveKeys([keypair.publicJwk], 'google');
});

/** A request as a given person, signed with this test's key. */
async function as(subject, path, init = {}) {
  const token = await signToken(keypair, { sub: subject });
  return SELF.fetch(`https://api.test${path}`, {
    ...init,
    headers: { ...authHeaders(token), ...(init.headers ?? {}) },
  });
}

async function tickersOf(response) {
  expect(response.status).toBe(200);
  return (await response.json()).tickers;
}

describe('getting in', () => {
  it('answers health without a token', async () => {
    const response = await SELF.fetch('https://api.test/v1/health');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });

  it('refuses an unauthenticated read', async () => {
    const response = await SELF.fetch('https://api.test/v1/me/watchlist');
    expect(response.status).toBe(401);
  });

  it('refuses a request with no provider header', async () => {
    const token = await signToken(keypair);
    const response = await SELF.fetch('https://api.test/v1/me/watchlist', {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(response.status).toBe(400);
  });

  it('404s an unknown endpoint', async () => {
    const response = await as('someone', '/v1/me/nonsense');
    expect(response.status).toBe(404);
  });
});

describe('the watchlist', () => {
  it('starts empty and keeps what is added', async () => {
    expect(await tickersOf(await as('u1', '/v1/me/watchlist'))).toEqual([]);

    await as('u1', '/v1/me/watchlist/COMI', { method: 'PUT' });
    const after = await tickersOf(await as('u1', '/v1/me/watchlist/SWDY', { method: 'PUT' }));

    expect(after).toEqual(['COMI', 'SWDY']);
  });

  it('adding twice is not an error and does not duplicate', async () => {
    // A phone that loses signal mid-request retries. That must be harmless.
    await as('u2', '/v1/me/watchlist/COMI', { method: 'PUT' });
    const after = await tickersOf(await as('u2', '/v1/me/watchlist/COMI', { method: 'PUT' }));

    expect(after).toEqual(['COMI']);
  });

  it('removing something that was never there is not an error', async () => {
    const response = await as('u3', '/v1/me/watchlist/COMI', { method: 'DELETE' });
    expect(response.status).toBe(200);
  });

  it('removes what it is told to', async () => {
    await as('u4', '/v1/me/watchlist/COMI', { method: 'PUT' });
    await as('u4', '/v1/me/watchlist/SWDY', { method: 'PUT' });
    const after = await tickersOf(await as('u4', '/v1/me/watchlist/COMI', { method: 'DELETE' }));

    expect(after).toEqual(['SWDY']);
  });

  it('accepts a lowercase ticker in the path', async () => {
    const after = await tickersOf(await as('u5', '/v1/me/watchlist/comi', { method: 'PUT' }));
    expect(after).toEqual(['COMI']);
  });

  it('refuses something that is not a ticker', async () => {
    const response = await as('u6', '/v1/me/watchlist/NOT-A-TICKER', { method: 'PUT' });
    expect(response.status).toBe(400);
  });

  it('reorders, and adding afterwards does not disturb the order', async () => {
    for (const ticker of ['COMI', 'SWDY', 'ETEL']) {
      await as('u7', `/v1/me/watchlist/${ticker}`, { method: 'PUT' });
    }
    const reordered = await tickersOf(
      await as('u7', '/v1/me/watchlist/order', {
        method: 'POST',
        body: JSON.stringify({ tickers: ['ETEL', 'COMI', 'SWDY'] }),
      }),
    );
    expect(reordered).toEqual(['ETEL', 'COMI', 'SWDY']);

    const afterAdding = await tickersOf(
      await as('u7', '/v1/me/watchlist/TMGH', { method: 'PUT' }),
    );
    expect(afterAdding.slice(0, 3)).toEqual(['ETEL', 'COMI', 'SWDY']);
  });

  it('a reorder cannot smuggle in a company that is not on the list', async () => {
    // Reordering and adding are different operations with different limits.
    await as('u8', '/v1/me/watchlist/COMI', { method: 'PUT' });
    const after = await tickersOf(
      await as('u8', '/v1/me/watchlist/order', {
        method: 'POST',
        body: JSON.stringify({ tickers: ['SWDY', 'COMI'] }),
      }),
    );
    expect(after).toEqual(['COMI']);
  });

  it('refuses a reorder that is not a list', async () => {
    const response = await as('u9', '/v1/me/watchlist/order', {
      method: 'POST',
      body: JSON.stringify({ tickers: 'COMI' }),
    });
    expect(response.status).toBe(400);
  });
});

describe('one account cannot see another', () => {
  it('keeps two people\'s watchlists apart', async () => {
    // The user id comes from the verified token and nothing else, so there is
    // no parameter to tamper with — which is the point (§53).
    await as('alice', '/v1/me/watchlist/COMI', { method: 'PUT' });
    await as('bob', '/v1/me/watchlist/SWDY', { method: 'PUT' });

    expect(await tickersOf(await as('alice', '/v1/me/watchlist'))).toEqual(['COMI']);
    expect(await tickersOf(await as('bob', '/v1/me/watchlist'))).toEqual(['SWDY']);
  });

  it('gives the same person the same list on a second device', async () => {
    await as('carol', '/v1/me/watchlist/ETEL', { method: 'PUT' });
    // A different token, freshly signed, same subject: the second phone.
    expect(await tickersOf(await as('carol', '/v1/me/watchlist'))).toEqual(['ETEL']);
  });
});

describe('bookmarks', () => {
  const body = JSON.stringify({ title: 'Is EGX30 cheap?', url: 'https://example.com/a' });

  it('keeps what is saved', async () => {
    await as('b1', '/v1/me/bookmarks/research/abc', { method: 'PUT', body });
    const saved = (await (await as('b1', '/v1/me/bookmarks')).json()).bookmarks;

    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ kind: 'research', id: 'abc', title: 'Is EGX30 cheap?' });
  });

  it('re-saving refreshes the title rather than duplicating', async () => {
    await as('b2', '/v1/me/bookmarks/research/abc', { method: 'PUT', body });
    await as('b2', '/v1/me/bookmarks/research/abc', {
      method: 'PUT',
      body: JSON.stringify({ title: 'Retitled' }),
    });
    const saved = (await (await as('b2', '/v1/me/bookmarks')).json()).bookmarks;

    expect(saved).toHaveLength(1);
    expect(saved[0].title).toBe('Retitled');
  });

  it('refuses an unknown kind', async () => {
    const response = await as('b3', '/v1/me/bookmarks/whatever/abc', { method: 'PUT', body });
    expect(response.status).toBe(400);
  });

  it('refuses a bookmark with no title', async () => {
    const response = await as('b4', '/v1/me/bookmarks/research/abc', {
      method: 'PUT',
      body: JSON.stringify({ title: '   ' }),
    });
    expect(response.status).toBe(400);
  });

  it('refuses a javascript: link', async () => {
    // A bookmark is rendered as something tappable. Storing this would be
    // storing a script to run on the reader's behalf (§53).
    const response = await as('b5', '/v1/me/bookmarks/research/abc', {
      method: 'PUT',
      body: JSON.stringify({ title: 'ok', url: 'javascript:alert(1)' }),
    });
    expect(response.status).toBe(400);
  });

  it('refuses a data: link', async () => {
    const response = await as('b6', '/v1/me/bookmarks/research/abc', {
      method: 'PUT',
      body: JSON.stringify({ title: 'ok', url: 'data:text/html,<script>x</script>' }),
    });
    expect(response.status).toBe(400);
  });

  it('refuses an over-long title', async () => {
    const response = await as('b7', '/v1/me/bookmarks/research/abc', {
      method: 'PUT',
      body: JSON.stringify({ title: 'x'.repeat(5000) }),
    });
    expect(response.status).toBe(400);
  });

  it('refuses a body that is not JSON', async () => {
    const response = await as('b8', '/v1/me/bookmarks/research/abc', {
      method: 'PUT',
      body: 'not json at all',
    });
    expect(response.status).toBe(400);
  });

  it('removes what it is told to', async () => {
    await as('b9', '/v1/me/bookmarks/research/abc', { method: 'PUT', body });
    await as('b9', '/v1/me/bookmarks/research/abc', { method: 'DELETE' });
    const saved = (await (await as('b9', '/v1/me/bookmarks')).json()).bookmarks;

    expect(saved).toEqual([]);
  });
});

describe('what the responses give away', () => {
  it('never lets an intermediary cache one reader\'s list', async () => {
    const response = await as('c1', '/v1/me/watchlist');
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('says nothing internal when something breaks', async () => {
    // The user row is real but the table is dropped underneath the request, so
    // the handler throws for a reason the caller must not learn.
    await as('c2', '/v1/me/watchlist/COMI', { method: 'PUT' });
    await env.DB.prepare('DROP TABLE watchlist').run();

    const response = await as('c2', '/v1/me/watchlist');
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('something went wrong here');
    expect(JSON.stringify(body)).not.toMatch(/SQL|no such table|D1_/i);

    await env.DB.prepare(
      `CREATE TABLE watchlist (
         user_id TEXT NOT NULL, ticker TEXT NOT NULL,
         position INTEGER NOT NULL, added_at INTEGER NOT NULL,
         PRIMARY KEY (user_id, ticker))`,
    ).run();
  });
});

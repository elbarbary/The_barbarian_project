import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker, { recordUser, sha256 } from '../index.js';

function mockKv() {
  const store = new Map();
  return {
    store,
    async get(key, type) {
      const val = store.get(key);
      if (val === undefined) return null;
      return type === 'json' ? JSON.parse(val) : val;
    },
    async put(key, val) {
      store.set(key, typeof val === 'string' ? val : JSON.stringify(val));
    },
    async delete(key) {
      store.delete(key);
    },
  };
}

test('recordUser saves user profile and updates users:all index in KV', async () => {
  const kv = mockKv();
  const env = { ESTHMR_AUTH: kv };

  const res1 = await recordUser(env, 'user1@example.com');
  assert.equal(res1.email, 'user1@example.com');
  assert.equal(res1.logins, 1);
  assert.ok(res1.created_at);
  assert.equal(res1.created_at, res1.last_login);

  const stored1 = await kv.get('user:user1@example.com', 'json');
  assert.deepEqual(stored1, res1);

  const allUsers1 = await kv.get('users:all', 'json');
  assert.deepEqual(allUsers1, ['user1@example.com']);

  // Second login by same user:
  const res2 = await recordUser(env, 'user1@example.com');
  assert.equal(res2.email, 'user1@example.com');
  assert.equal(res2.created_at, res1.created_at);
  assert.equal(res2.logins, 2);

  // Second distinct user:
  await recordUser(env, 'user2@example.com');
  const allUsers2 = await kv.get('users:all', 'json');
  assert.deepEqual(allUsers2, ['user1@example.com', 'user2@example.com']);
});

test('recordUser syncs to Brevo contacts when BREVO_API_KEY is present', async () => {
  const kv = mockKv();
  const env = { ESTHMR_AUTH: kv, BREVO_API_KEY: 'xkeysib-testkey' };
  let brevoCalled = null;

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    if (url === 'https://api.brevo.com/v3/contacts') {
      brevoCalled = { url, opts };
      return new Response(null, { status: 204 });
    }
    return originalFetch(url, opts);
  };

  try {
    await recordUser(env, 'crm@example.com');
    assert.ok(brevoCalled, 'Brevo contacts endpoint should be called');
    assert.equal(brevoCalled.opts.headers['api-key'], 'xkeysib-testkey');
    const parsed = JSON.parse(brevoCalled.opts.body);
    assert.equal(parsed.email, 'crm@example.com');
    assert.equal(parsed.updateEnabled, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('/auth/verify saves verified user into KV', async () => {
  const kv = mockKv();
  const env = {
    ESTHMR_AUTH: kv,
    SESSION_SECRET: 'test-secret-key-1234567890',
  };
  const email = 'reader@esthmr.com';
  const code = '123456';
  const hashed = await sha256(`${email}:${code}`);
  await kv.put(`code:${email}`, hashed);

  const req = new Request('https://esthmr.com/esthmr/api/auth/verify', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, code }),
  });

  const res = await worker.fetch(req, env);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.email, email);
  assert.ok(data.token);

  // User should now be saved in KV
  const userRec = await kv.get(`user:${email}`, 'json');
  assert.ok(userRec);
  assert.equal(userRec.email, email);
  assert.equal(userRec.logins, 1);

  const usersList = await kv.get('users:all', 'json');
  assert.deepEqual(usersList, [email]);
});

test('/auth/users admin endpoint checks authorization and returns users list or user profile', async () => {
  const kv = mockKv();
  const env = {
    ESTHMR_AUTH: kv,
    STATUS_TOKEN: 'super-secret-admin-token',
    SESSION_SECRET: 'session-secret',
  };

  await kv.put('users:all', JSON.stringify(['alpha@esthmr.com', 'beta@esthmr.com']));
  await kv.put('user:alpha@esthmr.com', JSON.stringify({ email: 'alpha@esthmr.com', logins: 3 }));

  // 1. Unauthorized request
  const unauthReq = new Request('https://esthmr.com/esthmr/api/auth/users');
  const unauthRes = await worker.fetch(unauthReq, env);
  assert.equal(unauthRes.status, 401);

  // 2. Authorized via Bearer header
  const authReq = new Request('https://esthmr.com/esthmr/api/auth/users', {
    headers: { authorization: 'Bearer super-secret-admin-token' },
  });
  const authRes = await worker.fetch(authReq, env);
  assert.equal(authRes.status, 200);
  const authData = await authRes.json();
  assert.equal(authData.count, 2);
  assert.deepEqual(authData.users, ['alpha@esthmr.com', 'beta@esthmr.com']);

  // 3. The token in the URL is REFUSED, correct value or not.
  //
  // This asserted 200 when the endpoint accepted `?token=`. It is a 400 now:
  // a secret in a query string is a secret in shell history, in browser
  // history, in a referrer and in any log that keeps a query — and on
  // 6 Sep 2026 that was why nine successful reads of this list could not be
  // told apart, in analytics, from any other GET. The refusal deliberately
  // does not depend on whether the value was right, or the endpoint becomes
  // an oracle for the token it is refusing.
  const queryReq = new Request('https://esthmr.com/esthmr/api/auth/users?token=super-secret-admin-token');
  const queryRes = await worker.fetch(queryReq, env);
  assert.equal(queryRes.status, 400);
  assert.match((await queryRes.json()).error, /Authorization header/);

  // 4. Query specific user
  const userReq = new Request('https://esthmr.com/esthmr/api/auth/users?email=alpha@esthmr.com', {
    headers: { authorization: 'Bearer super-secret-admin-token' },
  });
  const userRes = await worker.fetch(userReq, env);
  assert.equal(userRes.status, 200);
  const userData = await userRes.json();
  assert.equal(userData.email, 'alpha@esthmr.com');
  assert.equal(userData.logins, 3);

  // 5. Query nonexistent user
  const notFoundReq = new Request('https://esthmr.com/esthmr/api/auth/users?email=unknown@esthmr.com', {
    headers: { authorization: 'Bearer super-secret-admin-token' },
  });
  const notFoundRes = await worker.fetch(notFoundReq, env);
  assert.equal(notFoundRes.status, 404);
});

test('syncFromResend recovers emails from Resend /emails and /audiences and updates KV and Brevo', async () => {
  const kv = mockKv();
  const env = {
    ESTHMR_AUTH: kv,
    RESEND_API_KEYS: 're_key1,re_key2',
    BREVO_API_KEY: 'xkeysib-brevo',
    STATUS_TOKEN: 'secret-token',
  };

  const originalFetch = globalThis.fetch;
  const brevoSynced = [];
  globalThis.fetch = async (url, opts) => {
    const u = String(url);
    if (u.includes('api.resend.com/emails')) {
      if (opts.headers.authorization === 'Bearer re_key1') {
        return new Response(JSON.stringify({
          data: [
            { to: ['recovered1@esthmr.com'], created_at: '2026-09-01T10:00:00Z' },
            { to: ['recovered2@esthmr.com'], created_at: '2026-09-02T10:00:00Z' },
          ],
        }), { status: 200 });
      }
      return new Response(JSON.stringify({ data: [] }), { status: 200 });
    }
    if (u.includes('api.resend.com/audiences')) {
      if (u.endsWith('/contacts')) {
        return new Response(JSON.stringify({
          data: [
            { email: 'audience1@esthmr.com', created_at: '2026-08-30T10:00:00Z' },
          ],
        }), { status: 200 });
      }
      return new Response(JSON.stringify({
        data: [{ id: 'aud_123' }],
      }), { status: 200 });
    }
    if (u.includes('api.brevo.com/v3/contacts')) {
      brevoSynced.push(JSON.parse(opts.body).email);
      return new Response(null, { status: 204 });
    }
    return originalFetch(url, opts);
  };

  try {
    const req = new Request('https://esthmr.com/esthmr/api/auth/sync-resend', {
      headers: { authorization: 'Bearer secret-token' },
    });
    const res = await worker.fetch(req, env);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.total_recovered, 3);
    assert.equal(data.newly_added, 3);
    assert.deepEqual(data.all_recovered_emails.sort(), ['audience1@esthmr.com', 'recovered1@esthmr.com', 'recovered2@esthmr.com']);

    const users = await kv.get('users:all', 'json');
    assert.equal(users.length, 3);
    assert.ok(await kv.get('user:recovered1@esthmr.com', 'json'));
    assert.ok(await kv.get('user:audience1@esthmr.com', 'json'));
    assert.equal(brevoSynced.length, 3);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

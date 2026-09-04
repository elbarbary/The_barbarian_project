import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';

const { cairo, SCHEDULE, STALE, default: worker } = await import('../src/index.js');

test('cairo() converts UTC date to Africa/Cairo time', () => {
  // 2026-09-04 10:30 UTC -> in Cairo (UTC+3 in summer) is 13:30
  const d = new Date('2026-09-04T10:30:00Z');
  const c = cairo(d);
  assert.equal(c.hhmm, '13:30');
  assert.equal(c.minutes, 13 * 60 + 30);
  assert.equal(c.day, 5); // Friday
});

test('SCHEDULE only references workflows that exist in .github/workflows', async () => {
  const files = await readdir(new URL('../../../.github/workflows', import.meta.url));
  const existing = new Set(files);
  for (const job of SCHEDULE) {
    assert.ok(existing.has(job.file), `SCHEDULE references missing workflow ${job.file}`);
  }
});

test('STALE map contains an entry for each scheduled workflow', () => {
  for (const job of SCHEDULE) {
    assert.ok(typeof STALE[job.file] === 'number', `Missing STALE threshold for ${job.file}`);
    assert.ok(STALE[job.file] > 0, `STALE threshold must be positive for ${job.file}`);
  }
});

test('fetch() returns operational status at /', async () => {
  const req = new Request('https://barbarian-clock.workers.dev/');
  const res = await worker.fetch(req, {});
  assert.equal(res.status, 200);
  const text = await res.text();
  assert.match(text, /barbarian-clock operational/);
});

test('fetch() returns json with cors headers on /status and /healthz', async () => {
  const env = { GITHUB_TOKEN: 'mock', DRY_RUN: '1' };
  // Mock global fetch for health check
  const origFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    return new Response(JSON.stringify({ workflow_runs: [] }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  try {
    for (const path of ['/status', '/healthz']) {
      const req = new Request(`https://barbarian-clock.workers.dev${path}`);
      const res = await worker.fetch(req, env);
      assert.equal(res.status, 200);
      assert.equal(res.headers.get('content-type'), 'application/json');
      assert.equal(res.headers.get('access-control-allow-origin'), '*');
      const body = await res.json();
      assert.ok(body.checked_at, 'health body should contain checked_at');
      assert.ok(body.workflows, 'health body should contain workflows');
    }
  } finally {
    globalThis.fetch = origFetch;
  }
});

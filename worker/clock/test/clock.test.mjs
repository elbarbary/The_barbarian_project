import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';

const { cairo, lastDue, staleness, alarmBody, SCHEDULE, STALE, default: worker } =
  await import('../src/index.js');

const job = (file) => SCHEDULE.find((j) => j.file === file);
const utc = (s) => Date.parse(s);

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
  for (const j of SCHEDULE) {
    assert.ok(existing.has(j.file), `SCHEDULE references missing workflow ${j.file}`);
  }
});

test('STALE map contains an entry for each scheduled workflow', () => {
  for (const j of SCHEDULE) {
    assert.ok(typeof STALE[j.file] === 'number', `Missing STALE grace for ${j.file}`);
    assert.ok(STALE[j.file] > 0, `STALE grace must be positive for ${j.file}`);
  }
});

test('every at: slot is a multiple of the 15-minute cron, or it can never fire', () => {
  for (const j of SCHEDULE) {
    for (const t of j.at || []) {
      const [hh, mm] = t.split(':').map(Number);
      assert.equal((hh * 60 + mm) % 15, 0, `${j.file} slot ${t} is unreachable by a */15 cron`);
    }
  }
});

/* The regression this file exists for.
 *
 * The thresholds used to be absolute ages, so on a Friday — the market shut on
 * Thursday — publish-prices read as four hours overdue and the watchdog
 * dispatched a price build into a closed exchange, then again every four hours
 * until Sunday. publish-app-data's real weekend gap is about 67 hours against
 * what was a 26-hour threshold. */
test('a closed market is not staleness: nothing is due on a Friday evening', () => {
  const friday = utc('2026-09-04T16:30:00Z'); // 19:30 Cairo, Friday

  const prices = staleness(job('publish-prices.yml'), utc('2026-09-03T12:23:07Z'), friday);
  assert.equal(prices.stale, false, 'prices must not be stale on a Friday');
  assert.equal(new Date(prices.due).toISOString(), '2026-09-03T12:00:00.000Z'); // Thu 15:00 Cairo

  const app = staleness(job('publish-app-data.yml'), utc('2026-09-03T12:00:00Z'), friday);
  assert.equal(app.stale, false, 'app data must not be stale on a Friday');
  assert.equal(new Date(app.due).toISOString(), '2026-09-03T11:45:00.000Z'); // Thu 14:45 Cairo
});

test('a genuinely missed trading slot is still caught', () => {
  // Sunday 12:00 Cairo (09:00 UTC), last success Thursday. The 120-minute
  // grace puts the cutoff at 10:00 Cairo, so 09:30 is the newest slot old
  // enough to judge — 10:30 has not yet earned its grace.
  const sunday = utc('2026-09-06T09:00:00Z');
  const got = staleness(job('publish-app-data.yml'), utc('2026-09-03T12:00:00Z'), sunday);
  assert.equal(got.stale, true);
  assert.equal(new Date(got.due).toISOString(), '2026-09-06T06:30:00.000Z'); // Sun 09:30 Cairo
});

/* Applying the grace after the slot instead of before it would exempt every
 * interval job forever, because the newest `every: 15` slot is always under
 * fifteen minutes old. */
test('an interval job can actually go stale', () => {
  const now = utc('2026-09-04T16:30:00Z');
  const fresh = staleness(job('publish-live-data.yml'), now - 20 * 60000, now);
  assert.equal(fresh.stale, false, '20 minutes is normal for a 15-minute job');

  const dead = staleness(job('publish-live-data.yml'), now - 3 * 3600000, now);
  assert.equal(dead.stale, true, 'three hours without a run must be reported');
});

test('lastDue skips days the job does not run on', () => {
  // Saturday 12:00 Cairo. publish-app-data runs Sunday-Thursday, so the most
  // recent slot is Thursday's 14:45, roughly 45 hours earlier.
  const saturday = utc('2026-09-05T09:00:00Z');
  const due = lastDue(job('publish-app-data.yml'), saturday);
  assert.equal(new Date(due).toISOString(), '2026-09-03T11:45:00.000Z');
});

test('lastDue survives the Cairo DST boundary', () => {
  // Egypt ends DST on the last Thursday of October; 2026-10-30 is the Friday
  // after. Asking on Friday must still resolve Thursday's 14:45 Cairo slot,
  // whichever offset was in force when it happened.
  const due = lastDue(job('publish-app-data.yml'), utc('2026-10-30T12:00:00Z'));
  const back = cairo(new Date(due));
  assert.equal(back.hhmm, '14:45');
  assert.equal(back.day, 4); // Thursday
});

test('/healthz answers liveness without spending a GitHub call', async () => {
  const origFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls += 1; return new Response('{}'); };
  try {
    const res = await worker.fetch(new Request('https://clock.workers.dev/healthz'), {});
    assert.equal(res.status, 200);
    assert.equal((await res.json()).ok, true);
    assert.equal(calls, 0, '/healthz must not call GitHub');
  } finally {
    globalThis.fetch = origFetch;
  }
});

/* /status was open to the internet and cost four authenticated GitHub calls
 * per hit, so roughly 1,250 anonymous requests an hour exhausted the token —
 * after which busy() stopped every serialised dispatch and the alarm could not
 * report it, because it spends the same token. */
test('/status refuses anonymous callers and spends nothing on them', async () => {
  const origFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls += 1; return new Response('{}'); };
  try {
    const env = { GITHUB_TOKEN: 'mock', STATUS_TOKEN: 'secret', DRY_RUN: '1' };

    const bare = await worker.fetch(new Request('https://clock.workers.dev/status'), env);
    assert.equal(bare.status, 401);

    const wrong = await worker.fetch(new Request('https://clock.workers.dev/status', {
      headers: { authorization: 'Bearer nope' },
    }), env);
    assert.equal(wrong.status, 401);

    assert.equal(calls, 0, 'an unauthorised /status must not reach GitHub');
  } finally {
    globalThis.fetch = origFetch;
  }
});

test('/status is closed, not open, when no STATUS_TOKEN is configured', async () => {
  const res = await worker.fetch(new Request('https://clock.workers.dev/status'),
    { GITHUB_TOKEN: 'mock' });
  assert.equal(res.status, 503);
});

test('/status answers an authorised caller', async () => {
  const origFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const href = typeof input === 'string' ? input : input.url;
    if (href.includes('api.github.com')) {
      return new Response(JSON.stringify({ workflow_runs: [] }), { status: 200 });
    }
    return new Response(JSON.stringify({ data_version: 'same' }), { status: 200 });
  };
  try {
    const res = await worker.fetch(new Request('https://clock.workers.dev/status', {
      headers: { authorization: 'Bearer secret' },
    }), { GITHUB_TOKEN: 'mock', STATUS_TOKEN: 'secret' });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.checked_at);
    assert.equal(body.publish.undeployed, false, 'matching versions are not a drift');
  } finally {
    globalThis.fetch = origFetch;
  }
});

test('fetch() still returns operational status at /', async () => {
  const res = await worker.fetch(new Request('https://clock.workers.dev/'), {});
  assert.equal(res.status, 200);
  assert.match(await res.text(), /barbarian-clock operational/);
});

/* The alarm body used to publish the Worker's own /status URL into an issue on
 * a PUBLIC repository — handing out the endpoint whose cost was the problem. */
test('the alarm body names no endpoint', () => {
  const body = alarmBody(['publish-live-data.yml: missed its slot']);
  assert.doesNotMatch(body, /workers\.dev|https?:\/\//,
    'the alarm must not publish a URL into a public repo');
  assert.match(body, /publish-live-data\.yml/);
});

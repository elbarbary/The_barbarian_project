const OWNER = 'elbarbary';
const REPO  = 'The_barbarian_project';
const API   = `https://api.github.com/repos/${OWNER}/${REPO}`;
const RAW   = `https://raw.githubusercontent.com/${OWNER}/${REPO}/main`;
const UA    = 'esthmr-clock/1.0';

/* What is DEPLOYED, asked of the deployment itself.
 *
 * This used to read public/esthmr/stamp.json, a file `build_fixtures.py`
 * writes and no workflow stages — so it never moved, `undeployed` was true on
 * every tick, and the alarm below latched open on a permanent false positive.
 * A committed file cannot answer this question anyway: it says what was BUILT.
 * `/esthmr/api/version` is served by the site Worker out of the asset bundle
 * that is actually live, which is the only thing worth comparing against. */
const VERSION = 'https://esthmr.com/esthmr/api/version';

// Africa/Cairo local time. The EGX trading week is Sunday (0) to Thursday (4).
export const SCHEDULE = [
  { file: 'publish-app-data.yml',         days: [0,1,2,3,4],     at: ['09:30','10:30','12:30','14:45'], serialize: true  },
  { file: 'publish-prices.yml',           days: [0,1,2,3,4],     at: ['10:00','11:00','12:00','13:00','14:00','15:00'], serialize: true },
  { file: 'publish-official-sources.yml', days: [0,1,2,3,4,5,6], at: ['08:30'],                         serialize: true  },
  { file: 'publish-live-data.yml',        days: [0,1,2,3,4,5,6], every: 15,                             serialize: false },
];

/* GRACE, in minutes, measured from the slot the job was DUE — not from the
 * wall clock.
 *
 * These were absolute ages, which cannot express a market that closes. On a
 * Friday `publish-prices` is four hours past its last run because the exchange
 * shut on Thursday, and the watchdog read that as a failure and dispatched a
 * price build into a closed market — then again every four hours until Sunday.
 * `publish-app-data`'s real weekend gap is Thursday 14:45 to Sunday 09:30,
 * about 67 hours, against a 26-hour threshold: three spurious 45-minute builds
 * every weekend, for a market that had not traded.
 *
 * Anchored to the due slot instead, the question becomes the one worth asking
 * — "has the job run SINCE the last time it was supposed to?" — and the number
 * is just how long to wait before believing it will not. So these are now the
 * build's own runtime plus room for the queue, rather than a guess at a cycle.
 */
export const STALE = {
  'publish-live-data.yml':         45,  // ~1 min build; tolerate three missed ticks
  'publish-prices.yml':            60,  // ~2 min build, hourly slots
  'publish-app-data.yml':         120,  // p50 45 min, max 102, and it queues
  'publish-official-sources.yml': 120,  // ~4 min build, once a day
};

const CAIRO = { timeZone: 'Africa/Cairo', hour12: false };
// Built once per isolate: a cron that fires every fifteen minutes cannot
// afford to construct formatters inside a loop under a 10 ms CPU ceiling.
const CLOCK_FMT = new Intl.DateTimeFormat('en-GB', {
  ...CAIRO, weekday: 'short', hour: '2-digit', minute: '2-digit',
});
const DATE_FMT = new Intl.DateTimeFormat('en-GB', {
  ...CAIRO, weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit',
});
const OFFSET_FMT = new Intl.DateTimeFormat('en-GB', {
  ...CAIRO, timeZoneName: 'longOffset',
});

const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export function cairo(date) {
  const parts = Object.fromEntries(
    CLOCK_FMT.formatToParts(date).map((p) => [p.type, p.value])
  );
  return {
    day: DAYS.indexOf(parts.weekday),
    hhmm: `${parts.hour}:${parts.minute}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

/** The Cairo calendar date and weekday an instant falls on. */
function cairoDate(ms) {
  const p = Object.fromEntries(
    DATE_FMT.formatToParts(new Date(ms)).map((x) => [x.type, x.value])
  );
  return { y: Number(p.year), m: Number(p.month), d: Number(p.day), day: DAYS.indexOf(p.weekday) };
}

/** Cairo's UTC offset in minutes at an instant. Egypt observes DST. */
function cairoOffset(ms) {
  const name = OFFSET_FMT.formatToParts(new Date(ms))
    .find((p) => p.type === 'timeZoneName')?.value || 'GMT+00:00';
  const m = /GMT([+-])(\d{2}):?(\d{2})?/.exec(name);
  if (!m) return 0;
  return (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] || 0));
}

/* The instant a Cairo wall-clock time on a Cairo date actually happened.
 *
 * Two passes: the offset has to be read at roughly the right moment, and the
 * only way to know which moment that is, is to guess once and correct. The
 * correction matters twice a year and is wrong by an hour if skipped. */
function cairoInstant(y, m, d, hh, mm) {
  const wall = Date.UTC(y, m - 1, d, hh, mm);
  const first = cairoOffset(wall);
  const ms = wall - first * 60000;
  const second = cairoOffset(ms);
  return second === first ? ms : wall - second * 60000;
}

/* The most recent moment this job was due at or before `cutoffMs`, or null if
 * it has not been due inside the lookback — a job that only runs on trading
 * days has not been due at all since Thursday. This is what makes staleness a
 * question about the schedule rather than about elapsed time. */
export function lastDue(job, cutoffMs, lookbackDays = 9) {
  if (job.every) {
    const step = job.every * 60000;
    let slot = Math.floor(cutoffMs / step) * step;
    const floor = cutoffMs - lookbackDays * 86400000;
    while (slot >= floor) {
      if (job.days.includes(cairoDate(slot).day)) return slot;
      slot -= step;
    }
    return null;
  }
  for (let back = 0; back < lookbackDays; back++) {
    const probe = cairoDate(cutoffMs - back * 86400000);
    if (!job.days.includes(probe.day)) continue;
    let best = null;
    for (const t of job.at) {
      const [hh, mm] = t.split(':').map(Number);
      const at = cairoInstant(probe.y, probe.m, probe.d, hh, mm);
      if (at <= cutoffMs && (best === null || at > best)) best = at;
    }
    if (best !== null) return best;
  }
  return null;
}

/* Has this job run since the last time it was due?
 *
 * The grace is spent moving the CUTOFF back, not on waiting after the slot.
 * Applied the other way round it silently exempts every interval job: the most
 * recent `every: 15` slot is by definition under fifteen minutes old, so a
 * grace of forty-five would have made publish-live-data permanently fresh no
 * matter how long it had been dead. */
export function staleness(job, lastSuccessMs, nowMs) {
  const due = lastDue(job, nowMs - STALE[job.file] * 60000);
  if (due === null) return { stale: false, due: null, reason: 'not due yet' };
  if (lastSuccessMs !== null && lastSuccessMs >= due) {
    return { stale: false, due, reason: 'ran for this slot' };
  }
  return { stale: true, due, reason: 'missed its slot' };
}

function gh(env, path, init = {}) {
  return fetch(API + path, {
    ...init,
    headers: {
      authorization: `Bearer ${env.GITHUB_TOKEN}`,
      accept: 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
      'user-agent': UA,
      ...(init.body ? { 'content-type': 'application/json' } : {}),
      ...(init.headers || {}),
    },
  });
}

/** Timing-safe string compare, the same one worker/fetchrelay uses. */
function same(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/* true / false / 'unknown'.
 *
 * This used to answer `true` when the API call itself failed, on the reasoning
 * that refusing to pile onto a broken queue is the safe side. It is not: every
 * caller reads `true` as "already running", so one 401 from a revoked token,
 * or one 403 from an exhausted rate limit, silently stops all dispatching —
 * and the alarm cannot report it, because the alarm spends the same token. A
 * third answer lets each caller decide, which is the only way "I cannot tell"
 * stops looking exactly like "everything is fine". */
async function busy(env, file) {
  const r = await gh(env, `/actions/workflows/${file}/runs?per_page=5`);
  if (!r.ok) {
    console.error(`busy(${file}): GitHub ${r.status} — cannot tell whether a run is in flight`);
    return 'unknown';
  }
  const runs = (await r.json()).workflow_runs || [];
  return runs.some((x) => ['queued','in_progress','waiting','pending','requested'].includes(x.status));
}

async function lastSuccess(env, file) {
  const r = await gh(env, `/actions/workflows/${file}/runs?status=success&per_page=1`);
  if (!r.ok) return { ok: false, at: null };
  const run = ((await r.json()).workflow_runs || [])[0];
  return { ok: true, at: run ? Date.parse(run.updated_at) : null };
}

async function dispatch(env, file, why) {
  if (env.DRY_RUN === '1') {
    console.log(`[DRY_RUN] would dispatch ${file} (${why})`);
    return null;
  }
  const r = await gh(env, `/actions/workflows/${file}/dispatches`, {
    method: 'POST',
    body: JSON.stringify({ ref: 'main', return_run_details: true }),
  });
  const body = r.ok ? await r.json().catch(() => ({})) : await r.text();
  console.log(`dispatch ${file} (${why}) -> ${r.status} ${JSON.stringify(body).slice(0, 300)}`);
  return r.ok ? body : null;
}

// Health probe answering "did it actually publish?"
async function health(env) {
  const out = { checked_at: new Date().toISOString(), github_ok: true, workflows: {}, publish: {} };
  const now = Date.now();
  for (const job of SCHEDULE) {
    const got = await lastSuccess(env, job.file);
    if (!got.ok) out.github_ok = false;
    const judged = got.ok
      ? staleness(job, got.at, now)
      : { stale: false, due: null, reason: 'github unreachable' };
    out.workflows[job.file] = {
      last_success: got.at ? new Date(got.at).toISOString() : null,
      age_minutes: got.at ? Math.round((now - got.at) / 60000) : null,
      due_at: judged.due ? new Date(judged.due).toISOString() : null,
      stale: judged.stale,
      reason: judged.reason,
    };
  }

  const committed = await fetch(`${RAW}/public/data/v1/manifest.json`, { headers: { 'user-agent': UA } })
    .then((r) => (r.ok ? r.json() : null)).catch(() => null);
  const deployed = await fetch(VERSION, { headers: { 'user-agent': UA } })
    .then((r) => (r.ok ? r.json() : null)).catch(() => null);

  out.publish = {
    committed_version: committed?.data_version ?? null,
    deployed_version: deployed?.data_version ?? null,
    undeployed: Boolean(committed && deployed && committed.data_version !== deployed.data_version),
  };
  return out;
}

/* One open issue, kept current — not one open issue, written once.
 *
 * `if (open) return` meant the first problem to appear owned the channel
 * forever: it could never close, and no later problem could ever be reported
 * through it. Patching the body instead keeps a single thread per outage while
 * still saying what is wrong right now. */
export function alarmBody(problems) {
  return `${problems.map((p) => `- ${p}`).join('\n')}\n\n` +
    'Raised by barbarian-clock. Closes itself once every probe is healthy.';
}

async function alarm(env, problems) {
  if (!env.GITHUB_TOKEN) return;
  const r = await gh(env, '/issues?labels=clock-alarm&state=open&per_page=1');
  if (!r.ok) {
    console.error(`alarm: cannot list issues (${r.status}) — nothing will be reported`);
    return;
  }
  const open = (await r.json())[0] || null;

  if (!problems.length) {
    if (open) await gh(env, `/issues/${open.number}`, { method: 'PATCH', body: JSON.stringify({ state: 'closed' }) });
    return;
  }

  const body = alarmBody(problems);
  if (open) {
    if ((open.body || '').trim() !== body.trim()) {
      const patched = await gh(env, `/issues/${open.number}`, { method: 'PATCH', body: JSON.stringify({ body }) });
      if (!patched.ok) console.error(`alarm: cannot update issue #${open.number} (${patched.status})`);
    }
    return;
  }

  /* The result is checked because the token is allowed to be narrower than
   * this call needs: dispatching wants Actions:write and this wants
   * Issues:write, and a token holding only the first fails here and nowhere
   * else. An unreported alarm is the one failure this whole Worker exists to
   * prevent, so it does not get to fail quietly. */
  const made = await gh(env, '/issues', {
    method: 'POST',
    body: JSON.stringify({ title: 'ESTHMR clock: publishing has gone stale', labels: ['clock-alarm'], body }),
  });
  if (!made.ok) {
    console.error(`alarm: cannot open issue (${made.status}) — the token may lack Issues:write. Problems: ${problems.join(' | ')}`);
  }
}

async function watchdog(env) {
  const h = await health(env);
  const problems = [];

  if (!h.github_ok) {
    // Nothing below can be trusted, and the alarm shares the failing
    // credential, so this is written where an unauthenticated reader can find
    // it: the Worker's own logs.
    console.error('watchdog: GitHub is not answering this token — staleness unknown, dispatch suspended');
    return;
  }

  for (const [file, w] of Object.entries(h.workflows)) {
    if (!w.stale) continue;
    problems.push(`${file}: due ${w.due_at}, last success ${w.last_success ?? '(never)'} (grace ${STALE[file]} min)`);
    // Only a definite `false` earns a re-dispatch. On 'unknown' the timer will
    // try again at its next slot; piling blind retries onto a queue we cannot
    // see is how a stuck watchdog becomes the outage.
    if ((await busy(env, file)) === false) {
      await dispatch(env, file, 'watchdog');
    }
  }

  if (h.publish.undeployed) {
    problems.push(`Committed data_version ${h.publish.committed_version} is not the deployed ${h.publish.deployed_version}`);
  }
  await alarm(env, problems);
}

// /status costs four authenticated GitHub calls to answer, so its result is
// held briefly: an authorised caller polling it cannot become the thing that
// exhausts the token.
let cached = { at: 0, value: null };
async function cachedHealth(env) {
  const now = Date.now();
  if (cached.value && now - cached.at < 60000) return cached.value;
  const value = await health(env);
  cached = { at: now, value };
  return value;
}

/* The slot a tick belongs to.
 *
 * Rounded to the nearest fifteen minutes so execution drift cannot miss an
 * hh:mm target — every `at:` time in SCHEDULE is a multiple of fifteen, which
 * a test pins, so this can only ever snap onto a real slot.
 */
export function slotOf(atMs) {
  const step = 15 * 60 * 1000;
  return Math.round(Number(atMs) / step) * step;
}

/* Which jobs are due at an instant, and whether the watchdog runs with them.
 *
 * Split out of `scheduled()` and exported so the decision can be tested
 * directly against a calendar rather than only through a live tick. It was
 * written when a second scheduler briefly existed on the Mac, and the reason it
 * stays after that was deleted is the same reason it was worth writing: this is
 * the rule a trading calendar gets silently wrong — a DST boundary, a Friday, a
 * slot no tick can land on — and none of those announce themselves. They show
 * up as a publish that did not happen.
 */
export function dueAt(atMs) {
  const c = cairo(new Date(slotOf(atMs)));
  const jobs = SCHEDULE.filter((job) => job.days.includes(c.day)
    && (job.every ? true : job.at.includes(c.hhmm)));
  return { cairo: c, jobs, watchdog: c.minutes % 30 === 0 };
}

export default {
  async scheduled(event, env, ctx) {
    const at = event && event.scheduledTime ? Number(event.scheduledTime) : Date.now();
    const { cairo: c, jobs, watchdog: alsoWatch } = dueAt(at);
    for (const job of jobs) {
      if (job.serialize) {
        const inFlight = await busy(env, job.file);
        // A due slot is a bounded, scheduled event: at worst four a day for
        // the heaviest job. When GitHub will not say whether one is running,
        // dispatching a duplicate costs a queued run the concurrency group
        // will settle; NOT dispatching costs the slot, silently.
        if (inFlight === true) {
          console.log(`skip ${job.file}: already running or queued`);
          continue;
        }
        if (inFlight === 'unknown') {
          console.warn(`dispatching ${job.file} without knowing the queue state`);
        }
      }
      await dispatch(env, job.file, 'timer');
    }
    if (alsoWatch) {
      ctx.waitUntil(watchdog(env));
    }
  },

  async fetch(request, env) {
    const url = new URL(request.url);

    /* Liveness, and deliberately nothing else.
     *
     * This answers "is the Worker up?" without spending a single GitHub call,
     * so an uptime monitor pointed at it costs nothing and can never become
     * the reason dispatching stops. */
    if (url.pathname === '/healthz') {
      return new Response(JSON.stringify({ ok: true, at: new Date().toISOString() }), {
        headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
      });
    }

    /* /status was open to the internet and spent the GitHub token on every
     * hit: four authenticated calls per anonymous request, against a 5,000/hr
     * limit. Roughly twenty minutes of casual scraping — or one uptime monitor
     * on a one-second interval — exhausted the token, at which point `busy()`
     * stopped every serialised dispatch and the alarm could not report it,
     * because it spends the same token. A crawler could have switched off
     * intraday publishing without meaning to. */
    if (url.pathname === '/status') {
      if (!env.STATUS_TOKEN) return new Response('status disabled: no STATUS_TOKEN\n', { status: 503 });
      const offered = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
      if (!same(offered, env.STATUS_TOKEN)) return new Response('no\n', { status: 401 });
      return new Response(JSON.stringify(await cachedHealth(env), null, 2), {
        headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
      });
    }

    return new Response('barbarian-clock operational', {
      headers: { 'content-type': 'text/plain' },
    });
  },
};

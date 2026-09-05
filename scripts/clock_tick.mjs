#!/usr/bin/env node
/* One tick of the clock, from this Mac, using the `gh` CLI already signed in.
 *
 * WHY THIS EXISTS
 * ---------------
 * A STANDBY. NOT INSTALLED. See the install block below to turn it on.
 *
 * GitHub delivers this repository's cron events 3.4-7.8 hours late (median
 * 4.7h over five trading days), which is a platform regression, not a
 * configuration fault. `worker/clock` moved the clock to Cloudflare and left
 * the compute on GitHub — and for about a day Cloudflare did not invoke it at
 * all: the trigger registered, its "Next" advanced every quarter hour, and
 * Observability recorded 15 invocations in 24 hours, every one an HTTP request
 * made by hand.
 *
 * Deleting the trigger in the dashboard and re-adding it FIXED it, but not
 * immediately: the first real firing came at 20:15Z, about eighteen minutes
 * after the save, and a check at 20:03Z had already concluded it had not
 * worked. It has fired every fifteen minutes since, landing 11-13 seconds past
 * each slot. So the Worker is the clock, and this exists because a scheduler
 * that silently did nothing for a day — while reporting itself scheduled — is
 * one worth having a spare for.
 *
 * Do not run both. Two schedulers dispatch the same slot twice; that is what
 * the paired 09:45:11 and 09:45:12 runs on 5 Sep were.
 *
 * WHAT IT SHARES WITH THE WORKER
 * ------------------------------
 * The schedule, the staleness rule and the "what is due now" decision are
 * imported from `worker/clock/src/index.js`, not restated. Two schedulers that
 * each carry their own copy of a trading calendar disagree on a DST boundary or
 * a holiday and nobody finds out until a publish is missed. `dueAt()` is the
 * one place that answers it, and the Worker's own tests cover it.
 *
 * The Worker is left deployed and harmless: `DRY_RUN` aside, it cannot dispatch
 * anything it is never invoked to dispatch, and if Cloudflare ever starts
 * running it, `busy()` and the concurrency groups mean the worst case is a
 * duplicate queued run rather than two publishes racing.
 *
 * WHAT IT DOES NOT SOLVE
 * ----------------------
 * A laptop asleep at 09:30 Cairo misses the pre-open publish. The GitHub crons
 * are deliberately still in place underneath — late, but there — so this is a
 * latency improvement with a floor, not a single point of failure. A temporary
 * outage reports itself on recovery, because the first tick after waking finds
 * the workflows stale and raises the alarm; a permanent one does not, and
 * nothing here pretends otherwise.
 *
 * AUTH
 * ----
 * `gh`, already authenticated for this account. No PAT is minted, stored or
 * read by this script — which is the main reason it uses the CLI rather than
 * the REST API directly.
 *
 * CLOCK_DRY_RUN=1 makes the tick read-only: it reports what it would dispatch
 * and what it would file, and writes nothing. That has to cover the ALARM as
 * well as the dispatch, or a rehearsal opens a real issue on a public
 * repository — which is exactly what the first version of this did.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { dueAt, staleness, STALE, SCHEDULE } from './clock.js';

const run = promisify(execFile);
const REPO = 'elbarbary/The_barbarian_project';
const DRY = process.env.CLOCK_DRY_RUN === '1';

const stamp = () => new Date().toISOString().replace('T', ' ').slice(0, 19);
const say = (...m) => console.log(`${stamp()}  ${m.join(' ')}`);

/** `gh` with a bounded wall clock, so a hung CLI cannot wedge the agent. */
async function gh(args, { timeout = 45000 } = {}) {
  try {
    const { stdout } = await run('gh', args, { timeout, maxBuffer: 8 << 20 });
    return { ok: true, out: stdout.trim() };
  } catch (error) {
    return { ok: false, out: '', why: String(error && error.message).slice(0, 300) };
  }
}

/* true / false / 'unknown' — the Worker's tri-state, for the Worker's reason.
 * Answering "busy" when the query itself failed makes an outage look exactly
 * like a healthy queue, and every slot is skipped in silence. */
async function busy(file) {
  const r = await gh(['run', 'list', '--repo', REPO, '--workflow', file,
    '--limit', '5', '--json', 'status']);
  if (!r.ok) return 'unknown';
  try {
    return JSON.parse(r.out).some((x) => ['queued', 'in_progress', 'waiting', 'pending', 'requested']
      .includes(x.status));
  } catch {
    return 'unknown';
  }
}

async function lastSuccess(file) {
  const r = await gh(['run', 'list', '--repo', REPO, '--workflow', file,
    '--status', 'success', '--limit', '1', '--json', 'updatedAt']);
  if (!r.ok) return { ok: false, at: null };
  try {
    const rows = JSON.parse(r.out);
    return { ok: true, at: rows.length ? Date.parse(rows[0].updatedAt) : null };
  } catch {
    return { ok: false, at: null };
  }
}

async function dispatch(file, why) {
  if (DRY) { say(`[dry] would dispatch ${file} (${why})`); return true; }
  const r = await gh(['workflow', 'run', file, '--repo', REPO, '--ref', 'main']);
  say(r.ok ? `dispatched ${file} (${why})` : `FAILED to dispatch ${file} (${why}): ${r.why}`);
  return r.ok;
}

/* One open issue, kept current — the same shape as the Worker's alarm, and for
 * the same reason: an issue written once and never updated owns the channel
 * forever and can report nothing that happens afterwards. */
async function alarm(problems) {
  const found = await gh(['issue', 'list', '--repo', REPO, '--label', 'clock-alarm',
    '--state', 'open', '--limit', '1', '--json', 'number,body']);
  if (!found.ok) { say(`alarm: cannot list issues — ${found.why}`); return; }
  let open = null;
  try { open = JSON.parse(found.out)[0] || null; } catch { open = null; }

  if (!problems.length) {
    if (open) {
      if (DRY) { say(`[dry] would close #${open.number}`); return; }
      await gh(['issue', 'close', String(open.number), '--repo', REPO]);
      say(`alarm cleared (closed #${open.number})`);
    }
    return;
  }

  const body = `${problems.map((p) => `- ${p}`).join('\n')}\n\n`
    + 'Raised by the local clock (scripts/clock_tick.mjs). Closes itself once every probe is healthy.';
  if (open) {
    if ((open.body || '').trim() !== body.trim()) {
      if (DRY) { say(`[dry] would update #${open.number}: ${problems.join(' | ')}`); return; }
      await gh(['issue', 'edit', String(open.number), '--repo', REPO, '--body', body]);
      say(`alarm updated (#${open.number})`);
    }
    return;
  }
  if (DRY) { say(`[dry] would raise an alarm: ${problems.join(' | ')}`); return; }
  const made = await gh(['issue', 'create', '--repo', REPO, '--label', 'clock-alarm',
    '--title', 'ESTHMR clock: publishing has gone stale', '--body', body]);
  say(made.ok ? 'alarm raised' : `alarm: cannot open issue — ${made.why}`);
}

async function watchdog(now) {
  const problems = [];
  let reachable = true;
  for (const job of SCHEDULE) {
    const got = await lastSuccess(job.file);
    if (!got.ok) { reachable = false; continue; }
    const judged = staleness(job, got.at, now);
    if (!judged.stale) continue;
    problems.push(`${job.file}: due ${new Date(judged.due).toISOString()},`
      + ` last success ${got.at ? new Date(got.at).toISOString() : '(never)'}`
      + ` (grace ${STALE[job.file]} min)`);
    if ((await busy(job.file)) === false) await dispatch(job.file, 'watchdog');
  }
  if (!reachable) {
    // Nothing below can be trusted and the alarm goes through the same CLI,
    // so this is written where an unauthenticated reader can find it: the log.
    say('watchdog: GitHub is not answering — staleness unknown, no alarm raised');
    return;
  }
  await alarm(problems);
}

const now = Date.now();
const { cairo: c, jobs, watchdog: alsoWatch } = dueAt(now);
say(`tick — Cairo ${c.hhmm} (day ${c.day});`
  + ` due: ${jobs.map((j) => j.file).join(', ') || 'nothing'}${alsoWatch ? '; watchdog' : ''}`);

for (const job of jobs) {
  if (job.serialize) {
    const inFlight = await busy(job.file);
    if (inFlight === true) { say(`skip ${job.file}: already running or queued`); continue; }
    if (inFlight === 'unknown') say(`dispatching ${job.file} without knowing the queue state`);
  }
  await dispatch(job.file, 'timer');
}

if (alsoWatch) await watchdog(now);

const OWNER = 'elbarbary';
const REPO  = 'The_barbarian_project';
const API   = `https://api.github.com/repos/${OWNER}/${REPO}`;
const RAW   = `https://raw.githubusercontent.com/${OWNER}/${REPO}/main`;
const STAMP = 'https://esthmr.com/stamp.json';
const UA    = 'esthmr-clock/1.0';

// Africa/Cairo local time. The EGX trading week is Sunday (0) to Thursday (4).
export const SCHEDULE = [
  { file: 'publish-app-data.yml',         days: [0,1,2,3,4],     at: ['09:30','10:30','12:30','14:45'], serialize: true  },
  { file: 'publish-prices.yml',           days: [0,1,2,3,4],     at: ['10:00','11:00','12:00','13:00','14:00','15:00'], serialize: true },
  { file: 'publish-official-sources.yml', days: [0,1,2,3,4,5,6], at: ['08:30'],                         serialize: true  },
  { file: 'publish-live-data.yml',        days: [0,1,2,3,4,5,6], every: 15,                             serialize: false },
];

// Staleness thresholds in minutes since last successful run
export const STALE = {
  'publish-live-data.yml':        75,
  'publish-prices.yml':          240,
  'publish-app-data.yml':     26 * 60,
  'publish-official-sources.yml': 30 * 60,
};

export function cairo(date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Cairo',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(date).map((p) => [p.type, p.value])
  );
  return {
    day: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(parts.weekday),
    hhmm: `${parts.hour}:${parts.minute}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
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

// Check if workflow run is already in flight
async function busy(env, file) {
  const r = await gh(env, `/actions/workflows/${file}/runs?per_page=5`);
  if (!r.ok) return true; // Fail closed: don't pile onto failing or unauthenticated queue
  const runs = (await r.json()).workflow_runs || [];
  return runs.some((x) => ['queued','in_progress','waiting','pending','requested'].includes(x.status));
}

async function lastSuccess(env, file) {
  const r = await gh(env, `/actions/workflows/${file}/runs?status=success&per_page=1`);
  if (!r.ok) return null;
  const run = ((await r.json()).workflow_runs || [])[0];
  return run ? Date.parse(run.updated_at) : null;
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
  const out = { checked_at: new Date().toISOString(), workflows: {}, publish: {} };
  const now = Date.now();
  for (const job of SCHEDULE) {
    const at = await lastSuccess(env, job.file);
    const age = at ? Math.round((now - at) / 60000) : null;
    out.workflows[job.file] = {
      last_success: at ? new Date(at).toISOString() : null,
      age_minutes: age,
      stale: age === null || age > STALE[job.file],
    };
  }

  const committed = await fetch(`${RAW}/public/data/v1/manifest.json`, { headers: { 'user-agent': UA } })
    .then((r) => (r.ok ? r.json() : null)).catch(() => null);
  const deployed = await fetch(STAMP, { headers: { 'user-agent': UA } })
    .then((r) => (r.ok ? r.json() : null)).catch(() => null);

  out.publish = {
    committed_version: committed?.data_version ?? null,
    deployed_version: deployed?.data_version ?? null,
    undeployed: Boolean(committed && deployed && committed.data_version !== deployed.data_version),
  };
  return out;
}

async function alarm(env, problems) {
  if (!env.GITHUB_TOKEN) return;
  const r = await gh(env, '/issues?labels=clock-alarm&state=open&per_page=1');
  const open = r.ok ? ((await r.json())[0] || null) : null;
  if (!problems.length) {
    if (open) await gh(env, `/issues/${open.number}`, { method: 'PATCH', body: JSON.stringify({ state: 'closed' }) });
    return;
  }
  if (open) return; // Already reported
  await gh(env, '/issues', {
    method: 'POST',
    body: JSON.stringify({
      title: 'ESTHMR clock: publishing has gone stale',
      labels: ['clock-alarm'],
      body: problems.map((p) => `- ${p}`).join('\n') +
        '\n\nRaised by barbarian-clock. Closes automatically once healthy.\nLive status: https://barbarian-clock.elbarbary.workers.dev/status',
    }),
  });
}

async function watchdog(env) {
  const h = await health(env);
  const problems = [];
  for (const [file, w] of Object.entries(h.workflows)) {
    if (!w.stale) continue;
    problems.push(`${file}: last success ${w.age_minutes ?? '(never)'} min ago (threshold ${STALE[file]} min)`);
    if (!(await busy(env, file))) {
      await dispatch(env, file, 'watchdog');
    }
  }
  if (h.publish.undeployed) {
    problems.push(`Committed data_version ${h.publish.committed_version} != deployed ${h.publish.deployed_version}`);
  }
  await alarm(env, problems);
}

export default {
  async scheduled(event, env, ctx) {
    // Round to nearest 15-minute slot so cloud execution drift cannot miss hh:mm targets
    const targetMs = event && event.scheduledTime
      ? Math.round(Number(event.scheduledTime) / (15 * 60 * 1000)) * (15 * 60 * 1000)
      : Date.now();
    const c = cairo(new Date(targetMs));
    for (const job of SCHEDULE) {
      if (!job.days.includes(c.day)) continue;
      const due = job.every ? true : job.at.includes(c.hhmm);
      if (!due) continue;
      if (job.serialize && (await busy(env, job.file))) {
        console.log(`skip ${job.file}: already running or queued`);
        continue;
      }
      await dispatch(env, job.file, 'timer');
    }
    if (c.minutes % 30 === 0) {
      ctx.waitUntil(watchdog(env));
    }
  },

  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/status' || url.pathname === '/healthz') {
      return new Response(JSON.stringify(await health(env), null, 2), {
        headers: {
          'content-type': 'application/json',
          'cache-control': 'no-store',
          'access-control-allow-origin': '*',
        },
      });
    }
    return new Response('barbarian-clock operational', {
      headers: { 'content-type': 'text/plain' },
    });
  },
};

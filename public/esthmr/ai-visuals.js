/* What the AI screens draw with: numbers, dates, and the charts.
 *
 * Every chart here is drawn from a published document and nothing else. No
 * figure on either screen is written into this file: a chart with no data
 * draws nothing, and says so in words where it would have stood.
 *
 * The charts are SVG in a fixed coordinate space scaled by the viewBox, and
 * every coordinate is checked finite before it is written — a NaN in a path
 * does not throw, it silently erases the line.
 */
import { React as R } from './react-shim.js';

const h = R.createElement;

export const finite = (v) => typeof v === 'number' && Number.isFinite(v);

/** A percentage the way the rest of the site prints one: signed, two places. */
export const percent = (v, places = 2) =>
  (finite(v) ? `${v > 0 ? '+' : ''}${v.toFixed(places)}%` : '—');

/** A difference between two percentages is in points, not percent. */
export const points = (v) => (finite(v) ? `${v > 0 ? '+' : ''}${v.toFixed(2)} pp` : '—');

export const plain = (v, places = 2) => (finite(v) ? v.toFixed(places) : '—');

const MONTHS = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  enLong: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
    'September', 'October', 'November', 'December'],
  ar: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر',
    'أكتوبر', 'نوفمبر', 'ديسمبر'],
};

/** "14 Sep 2026" / "14 سبتمبر 2026" from an ISO date, or the input unchanged. */
export function day(iso, ar = false, long = false) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  if (!m) return iso ? String(iso) : '—';
  const month = (ar ? MONTHS.ar : long ? MONTHS.enLong : MONTHS.en)[Number(m[2]) - 1];
  return `${Number(m[3])} ${month} ${m[1]}`;
}

/** "14 Sep" — the year is in the header already. */
export function shortDay(iso, ar = false) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  if (!m) return '—';
  return `${Number(m[3])} ${(ar ? MONTHS.ar : MONTHS.en)[Number(m[2]) - 1]}`;
}

/** A moment in Cairo's own time, which keeps summer time. */
export function cairoTime(iso, ar = false) {
  const when = new Date(String(iso || ''));
  if (Number.isNaN(when.getTime())) return null;
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Cairo', day: 'numeric', month: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(when);
    const get = (type) => parts.find((p) => p.type === type)?.value;
    const date = `${get('year')}-${String(get('month')).padStart(2, '0')}-${String(get('day')).padStart(2, '0')}`;
    return { date, time: `${get('hour')}:${get('minute')}`, label: `${shortDay(date, ar)} · ${get('hour')}:${get('minute')}` };
  } catch {
    return null;
  }
}

/* ── the schedule ─────────────────────────────────────────────────────────
 * The lab's cron lines are published with the scenarios, read from the
 * workflow itself. Only the shape the workflow uses is understood —
 * "minute hour * * day-range" — and anything else is not guessed at. */

function dayMatches(field, weekday) {
  if (field === '*') return true;
  return field.split(',').some((part) => {
    const range = /^(\d)-(\d)$/.exec(part);
    if (range) return weekday >= Number(range[1]) && weekday <= Number(range[2]);
    return /^\d$/.test(part) && Number(part) === weekday;
  });
}

/** The next time any of these crons fires after `now`, or null. */
export function nextRun(crons, now = new Date()) {
  let best = null;
  for (const line of crons || []) {
    const f = String(line).trim().split(/\s+/);
    if (f.length !== 5 || f[2] !== '*' || f[3] !== '*') continue;
    const minute = Number(f[0]), hour = Number(f[1]);
    if (!Number.isInteger(minute) || !Number.isInteger(hour)) continue;
    for (let add = 0; add < 8; add += 1) {
      const at = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(),
        now.getUTCDate() + add, hour, minute));
      if (at <= now || !dayMatches(f[4], at.getUTCDay())) continue;
      if (!best || at < best) best = at;
      break;
    }
  }
  return best;
}

/* ── numbers over a set ─────────────────────────────────────────────────── */

export function quantile(sorted, q) {
  if (!sorted.length) return null;
  const at = (sorted.length - 1) * q;
  const lo = Math.floor(at), hi = Math.ceil(at);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (at - lo);
}

/** The middle and the spread of a set of estimates, or nulls. */
export function summaryOf(values) {
  const s = values.filter(finite).sort((a, b) => a - b);
  return {
    count: s.length,
    median: quantile(s, 0.5),
    p10: quantile(s, 0.1), p25: quantile(s, 0.25),
    p75: quantile(s, 0.75), p90: quantile(s, 0.9),
    up: s.filter((v) => v > 0).length,
    down: s.filter((v) => v < 0).length,
  };
}

const fix = (v) => (finite(v) ? Number(v.toFixed(2)) : 0);

function path(points) {
  let out = '', gap = true;
  for (const p of points) {
    if (!p || !finite(p[0]) || !finite(p[1])) { gap = true; continue; }
    out += `${gap ? 'M' : 'L'}${fix(p[0])} ${fix(p[1])} `;
    gap = false;
  }
  return out.trim();
}

/* ── the hero's chart: the system's five against the market, run by run ── */

/** Per-run outcomes, never a compounded curve: each point is one night's five,
 *  measured over its own window, beside the market over the same window. */
export function heroChart(byDate, ar = false) {
  const rows = (Array.isArray(byDate) ? byDate : [])
    .filter((d) => d && finite(d.chosenReturn) && finite(d.marketReturn));
  if (rows.length < 2) return null;
  const W = 300, H = 80, PAD = 6;
  const values = rows.flatMap((d) => [d.chosenReturn, d.marketReturn]).concat([0]);
  const lo = Math.min(...values), hi = Math.max(...values);
  const span = hi - lo || 1;
  const x = (i) => PAD + (i / (rows.length - 1)) * (W - PAD * 2);
  const y = (v) => H - PAD - ((v - lo) / span) * (H - PAD * 2);
  const system = rows.map((d, i) => [x(i), y(d.chosenReturn)]);
  const market = rows.map((d, i) => [x(i), y(d.marketReturn)]);
  const zero = fix(y(0));
  const last = system[system.length - 1];
  return h('svg', {
    class: 'aix-hero-chart', viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'none',
    role: 'img', 'aria-label': ar ? 'نتيجة كل ليلة لأعلى خمس شركات مقابل السوق' : 'Each night’s five against the market',
  },
  h('line', { x1: 0, x2: W, y1: zero, y2: zero, class: 'aix-zero' }),
  h('path', { d: `${path(system)} L${fix(last[0])} ${zero} L${fix(system[0][0])} ${zero} Z`, class: 'aix-hero-area' }),
  h('path', { d: path(market), class: 'aix-hero-market' }),
  h('path', { d: path(system), class: 'aix-hero-system' }));
}

/* ── Home: a record still filling in ────────────────────────────────────── */

/**
 * The nights the system still needs before its average means anything.
 *
 * Positions count sessions from the last one in the record, which is 0. A
 * night read on that session holds its five over 1…n; one read two sessions
 * earlier holds them over -1…n-2, and two of its squares have closed. The
 * nights it has not read yet follow the newest one it has, never earlier than
 * the last session: a night that closed unread cannot be read any more.
 */
export function recordRows(waiting, needed, horizon) {
  const n = Math.max(1, Math.round(horizon));
  const read = (Array.isArray(waiting) ? waiting : [])
    .filter((w) => w && typeof w.basisSession === 'string' && finite(w.sessionsClosed))
    .map((w) => ({ date: w.basisSession, start: -Math.min(Math.max(w.sessionsClosed, 0), n), read: true }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const rows = read.slice(0, Math.max(needed, 0));
  let next = Math.max((read.length ? Math.max(...read.map((r) => r.start)) : -1) + 1, 0);
  while (rows.length < needed) rows.push({ date: null, start: next++, read: false });
  return rows;
}

/** How many sessions from the last one until the last of `rows` is scored. */
export const rowsEnd = (rows, horizon) =>
  (rows.length ? Math.max(...rows.map((r) => r.start)) + Math.max(1, Math.round(horizon)) : null);

/**
 * Those nights drawn as rows of sessions: one row per night's five, one
 * square per session it is held, filled where that session has closed, dashed
 * for a night still to be read. HTML rather than SVG so the dates keep their
 * size on a phone; left to right in both languages, like every chart here.
 * The words are the caller's: `label` for a screen reader, `end` under it.
 */
export function recordChart(rows, horizon, ar = false, { label = '', end = '' } = {}) {
  if (!Array.isArray(rows) || !rows.length) return null;
  const n = Math.max(1, Math.round(horizon));
  const lo = Math.min(...rows.map((r) => r.start)) + 1;
  const cols = rowsEnd(rows, n) - lo + 1;
  // Columns at or before the last session: the ones that have closed.
  const closed = Math.max(0, Math.min(cols, 1 - lo));
  return h('div', { class: 'aix-fill', dir: 'ltr', role: 'img', 'aria-label': label, style: `--cols:${cols};--now:${closed}` },
    h('div', { class: 'aix-fill-rows' },
      h('span', { class: 'aix-fill-now', 'aria-hidden': 'true' }, ar ? 'الآن' : 'now'),
      rows.map((r, i) => h('div', { key: i, class: `aix-fill-row${r.read ? ' is-read' : ''}` },
        h('span', { class: 'aix-fill-label' }, r.date ? h('bdi', null, shortDay(r.date, ar)) : ''),
        h('span', { class: 'aix-fill-track' },
          Array.from({ length: n }, (_, k) => {
            const at = r.start + 1 + k;
            return h('i', { key: k, class: at <= 0 ? 'is-closed' : '', style: `grid-column:${at - lo + 1}` });
          }))))),
    end ? h('div', { class: 'aix-fill-axis' }, h('span', { dir: ar ? 'rtl' : 'ltr' }, end)) : null);
}

/* ── the workbench's charts ─────────────────────────────────────────────── */

/** An axis step of 1, 2 or 5 times a power of ten. */
function niceStep(span, count) {
  const raw = span / Math.max(count, 1);
  if (!(raw > 0)) return 1;
  const power = 10 ** Math.floor(Math.log10(raw));
  const unit = raw / power;
  return (unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 5 ? 5 : 10) * power;
}

/**
 * What each scored night's five did, beside the market over the same window.
 *
 * One column per night, oldest on the left: a hollow dot where the market
 * ended, a filled dot where the five ended, and a stroke between them — teal
 * where the five came out ahead, red where they fell behind. The nights are
 * never joined into a line. Each is its own window, and a line from one to the
 * next would draw a running total that nobody held.
 */
export function nightsChart(nights, ar = false) {
  const rows = (Array.isArray(nights) ? nights : [])
    .filter((n) => n && finite(n.chosenReturn) && finite(n.marketReturn));
  if (!rows.length) return null;
  const W = 640, H = 180, TOP = 10, BOTTOM = 10, LEFT = 58, RIGHT = 14;
  const values = rows.flatMap((n) => [n.chosenReturn, n.marketReturn]).concat([0]);
  let lo = Math.min(...values), hi = Math.max(...values);
  const pad = (hi - lo) * 0.08 || 1;
  lo -= pad; hi += pad;
  const y = (v) => TOP + (1 - (v - lo) / (hi - lo)) * (H - TOP - BOTTOM);
  const inner = W - LEFT - RIGHT;
  const x = (i) => (rows.length > 1 ? LEFT + 14 + (i / (rows.length - 1)) * (inner - 28) : LEFT + inner / 2);
  const step = niceStep(hi - lo, 4);
  const ticks = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + step * 1e-6; v += step) ticks.push(Number(v.toFixed(6)));
  // The newest date always, then older ones wherever they clear the last.
  const dated = [];
  for (let i = rows.length - 1, edge = Infinity; i >= 0; i -= 1) {
    if (edge - x(i) >= 84) { dated.push(i); edge = x(i); }
  }
  return h('div', { class: 'aix-nights-chart', dir: 'ltr' },
    h('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img',
      'aria-label': ar ? 'نتيجة خمس كل ليلة مقابل السوق' : 'Each night’s five against the market' },
    ticks.map((v, i) => h('line', { key: `g${i}`, x1: LEFT, x2: W - RIGHT, y1: fix(y(v)), y2: fix(y(v)),
      class: Math.abs(v) < step * 1e-6 ? 'aix-nights-zero' : 'aix-grid' })),
    rows.map((n, i) => {
      const ahead = n.chosenReturn > n.marketReturn;
      return h('g', { key: n.basisSession || i, class: ahead ? 'is-ahead' : 'is-behind' },
        h('title', null, `${shortDay(n.basisSession, ar)} · ${ar ? 'الخمس' : 'five'} ${percent(n.chosenReturn)} · ${ar ? 'السوق' : 'market'} ${percent(n.marketReturn)}`),
        h('line', { x1: fix(x(i)), x2: fix(x(i)), y1: fix(y(n.marketReturn)), y2: fix(y(n.chosenReturn)), class: 'aix-nights-gap' }),
        h('circle', { cx: fix(x(i)), cy: fix(y(n.marketReturn)), r: 4.5, class: 'aix-nights-market' }),
        h('circle', { cx: fix(x(i)), cy: fix(y(n.chosenReturn)), r: 6, class: 'aix-nights-five' }));
    })),
    ticks.map((v, i) => h('span', { key: `t${i}`, class: 'aix-nights-tick', style: `top:${fix((y(v) / H) * 100)}%` },
      percent(v, step < 1 ? 1 : 0))),
    h('div', { class: 'aix-nights-dates' }, dated.reverse().map((i) => h('span', { key: i,
      style: `left:${fix((x(i) / W) * 100)}%` }, shortDay(rows[i].basisSession, ar)))));
}

/**
 * Where a model's estimates for a set of companies sit, beside what those
 * companies actually did before the basis.
 *
 *   past      what the selection did over the sessions before the basis, as a
 *             percentage of the basis close (one value per session, the last
 *             one zero)
 *   ahead     {horizon: summaryOf(estimates)} for each horizon the model answers
 *
 * The bands are the spread ACROSS COMPANIES — the middle half and the middle
 * 80% of the estimates — and the legend says exactly that. No model here
 * publishes its own uncertainty, and a band labelled as one would be invented.
 */
export function fanChart({ past, ahead, horizons }, ar = false) {
  const W = 800, H = 300, TOP = 16, BOTTOM = 34;
  const known = (horizons || []).filter((hz) => ahead && ahead[hz] && finite(ahead[hz].median));
  if (!known.length) return null;
  const history = (past || []).map((v) => (finite(v) ? v : null));
  const last = Math.max(...known);
  const nPast = Math.max(history.length - 1, 0);
  // Sessions before the basis on the left, sessions after it on the right, on
  // one scale, so a twenty-session horizon is as long as twenty sessions were.
  const total = nPast + last;
  const x = (session) => ((session + nPast) / (total || 1)) * (W - 70) + 10;
  const all = history.filter(finite).concat([0]);
  for (const hz of known) {
    const s = ahead[hz];
    all.push(...[s.p10, s.p90, s.median].filter(finite));
  }
  let lo = Math.min(...all), hi = Math.max(...all);
  const pad = (hi - lo) * 0.08 || 1;
  lo -= pad; hi += pad;
  const y = (v) => TOP + (1 - (v - lo) / (hi - lo)) * (H - TOP - BOTTOM);
  const at = (key) => [[0, 0], ...known.map((hz) => [hz, ahead[hz][key]])];
  const band = (upper, lower) => {
    const top = at(upper).map(([s, v]) => [x(s), y(v)]);
    const bottom = at(lower).map(([s, v]) => [x(s), y(v)]).reverse();
    return `${path(top)} ${path(bottom).replace(/^M/, 'L')} Z`;
  };
  const ticks = [];
  for (let k = 0; k < 4; k += 1) {
    const v = lo + ((hi - lo) * (k + 0.5)) / 4;
    ticks.push({ v, y: y(v) });
  }
  const end = ahead[last];
  const pastPoints = history.map((v, i) => [x(i - nPast), finite(v) ? y(v) : null]);
  return h('div', { class: 'aix-fan', dir: 'ltr' },
    h('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img',
      'aria-label': ar ? 'المسار السابق وتقديرات النموذج' : 'Past path and the model’s estimates' },
    ticks.map((t, i) => h('line', { key: i, x1: 0, x2: W, y1: fix(t.y), y2: fix(t.y), class: 'aix-grid' })),
    h('line', { x1: fix(x(0)), x2: fix(x(0)), y1: 8, y2: H - BOTTOM + 6, class: 'aix-split' }),
    h('path', { d: band('p90', 'p10'), class: 'aix-band80' }),
    h('path', { d: band('p75', 'p25'), class: 'aix-band50' }),
    h('path', { d: path(pastPoints), class: 'aix-past' }),
    h('path', { d: path(at('median').map(([s, v]) => [x(s), y(v)])), class: 'aix-median' }),
    known.map((hz) => h('circle', { key: hz, cx: fix(x(hz)), cy: fix(y(ahead[hz].median)), r: hz === last ? 5 : 3.5,
      class: hz === last ? 'aix-median-end' : 'aix-median-dot' }))),
    ticks.map((t, i) => h('span', { key: i, class: 'aix-fan-tick', style: `top:${fix((t.y / H) * 100)}%` }, percent(t.v, 1))),
    h('span', { class: 'aix-fan-today', style: `left:${fix((x(0) / W) * 100)}%` }, ar ? 'الإغلاق' : 'close'),
    h('span', { class: 'aix-fan-end', style: `top:${fix((y(end.median) / H) * 100)}%` }, percent(end.median)),
    // A horizon label too close to the close label, or to the one before it,
    // is left out rather than printed over it.
    known.filter((hz, i) => x(hz) - x(0) > 44 && (i === 0 || x(hz) - x(known[i - 1]) > 44))
      .map((hz) => h('span', { key: `l${hz}`, class: 'aix-fan-horizon', style: `left:${fix((x(hz) / W) * 100)}%` },
        `+${hz}`)));
}

/** Every value in a set, counted into bins; zero and a marker line drawn.
 *
 *  Without fixed ends the axis runs from the 2nd to the 98th percentile and
 *  the values beyond it are counted in the end bins, which say so (≤ / ≥).
 *  One company forecast to rise 173% otherwise squeezes 244 others into a
 *  single column, and the chart stops showing anything. */
export function histogram(values, { bins = 21, lo, hi, marker, markerLabel, ar = false, colour = 'sign' } = {}) {
  const v = values.filter(finite);
  if (v.length < 3) return null;
  const W = 360, H = 120;
  const sorted = [...v].sort((a, b) => a - b);
  let min = finite(lo) ? lo : quantile(sorted, 0.02), max = finite(hi) ? hi : quantile(sorted, 0.98);
  const clippedLow = !finite(lo) && sorted[0] < min, clippedHigh = !finite(hi) && sorted[sorted.length - 1] > max;
  if (min === max) { min -= 1; max += 1; }
  const width = (max - min) / bins;
  const counts = new Array(bins).fill(0);
  for (const value of v) counts[Math.min(bins - 1, Math.max(0, Math.floor((value - min) / width)))] += 1;
  const tallest = Math.max(...counts) || 1;
  const bw = W / bins;
  const xOf = (value) => ((value - min) / (max - min)) * W;
  const line = (value, cls) => (finite(value) && value >= min && value <= max
    ? h('line', { x1: fix(xOf(value)), x2: fix(xOf(value)), y1: 4, y2: H + 4, class: cls }) : null);
  return h('div', { class: 'aix-hist', dir: 'ltr' },
    h('svg', { viewBox: `0 0 ${W} ${H + 8}`, role: 'img',
      'aria-label': ar ? `توزيع ${v.length} قيمة` : `distribution of ${v.length} values` },
    h('line', { x1: 0, x2: W, y1: H, y2: H, class: 'aix-grid' }),
    counts.map((n, i) => {
      const barH = (n / tallest) * (H - 8);
      const mid = min + (i + 0.5) * width;
      const tone = colour === 'sign' ? (mid >= 0 ? 'aix-bin-up' : 'aix-bin-down')
        : (finite(marker) && mid >= marker ? 'aix-bin-up' : 'aix-bin-quiet');
      return h('rect', { key: i, x: fix(i * bw + 1.5), width: fix(Math.max(bw - 3, 1)), y: fix(H - barH),
        height: fix(barH), rx: 2, class: tone });
    }),
    colour === 'sign' ? line(0, 'aix-hist-zero') : null,
    line(marker, 'aix-hist-marker')),
    h('div', { class: 'aix-hist-axis' },
      h('span', null, `${clippedLow ? '≤ ' : ''}${colour === 'sign' ? percent(min, 1) : plain(min, 0)}`),
      colour === 'sign' && min < 0 && max > 0
        ? h('span', { class: 'aix-hist-mid', style: `left:${fix((xOf(0) / W) * 100)}%` }, '0%') : null,
      finite(marker) && markerLabel
        ? h('span', { class: 'aix-hist-mid', style: `left:${fix((xOf(marker) / W) * 100)}%` }, markerLabel) : null,
      h('span', null, `${clippedHigh ? '≥ ' : ''}${colour === 'sign' ? percent(max, 1) : plain(max, 0)}`)));
}

/** Bars from a centre line — for anything with a behind and an ahead. */
export function divergeBar(value, max, tone) {
  if (!finite(value) || !finite(max) || max <= 0) return h('span', { class: 'aix-track', dir: 'ltr' }, h('i', { class: 'aix-centre' }));
  const w = Math.min(Math.abs(value) / max, 1) * 48;
  return h('span', { class: 'aix-track', dir: 'ltr' },
    h('i', { class: 'aix-centre' }),
    h('b', { class: `aix-bar ${tone || (value >= 0 ? 'up' : 'down')}`,
      style: `left:${fix(value >= 0 ? 50 : 50 - w)}%;width:${fix(Math.max(w, 0.6))}%` }));
}

/**
 * How one ordering of the market maps onto another: one dot per company, the
 * reading with less evidence along the bottom and the reading with more up
 * the side. On the diagonal nothing moved. No company is labelled — this is
 * the shape of a reshuffle, not a list.
 */
export function reorderChart(pairs, ar = false) {
  const points = pairs.filter((p) => finite(p.from) && finite(p.to));
  if (points.length < 3) return null;
  const n = Math.max(...points.flatMap((p) => [p.from, p.to]));
  const S = 300, P = 10;
  const at = (rank) => P + ((rank - 1) / Math.max(n - 1, 1)) * (S - P * 2);
  return h('div', { class: 'aix-reorder', dir: 'ltr' },
    h('svg', { viewBox: `0 0 ${S} ${S}`, role: 'img',
      'aria-label': ar ? 'كيف تغيّر الترتيب' : 'How the order changed' },
    h('rect', { x: P, y: P, width: S - P * 2, height: S - P * 2, class: 'aix-reorder-frame' }),
    h('line', { x1: P, y1: P, x2: S - P, y2: S - P, class: 'aix-diagonal' }),
    points.map((p, i) => {
      const moved = Math.abs(p.from - p.to);
      return h('circle', { key: i, cx: fix(at(p.from)), cy: fix(at(p.to)), r: 2.6,
        class: moved > 20 ? 'aix-dot-moved' : 'aix-dot-still' });
    })));
}

/* ── the saved path, as the redesign draws it ───────────────────────────── */

/**
 * One company's own recent closes, then the path a model saved for it.
 *
 * Two facts this shape has to keep apart, because a single continuous line
 * would hide both. The left of the divider is what the exchange printed; the
 * right is what a model said on one night and has not been allowed to revise
 * since. So the past is solid and the saved path is dashed, and the divider
 * carries the session they were split on.
 *
 * Prices, not percentages: the card beside it names the low, the average and
 * the high of where the models' paths END, and a reader cannot compare those
 * to a line drawn in percent.
 */
export function savedPathChart({ past, ahead }, ar = false) {
  const left = (Array.isArray(past) ? past : []).filter(finite);
  const right = (Array.isArray(ahead) ? ahead : []).filter(finite);
  if (left.length < 2 || right.length < 2) return null;
  const W = 250, H = 64, PAD = 6, FLOOR = 54;
  const all = left.concat(right);
  const lo = Math.min(...all), hi = Math.max(...all);
  const span = hi - lo || 1;
  // The join is one point: the basis close ends the past and starts the path,
  // so the two lines meet rather than leaving a step at the divider.
  const total = left.length + right.length - 1;
  const x = (i) => PAD + (i / Math.max(total - 1, 1)) * (W - PAD * 2);
  const y = (v) => PAD + (1 - (v - lo) / span) * (FLOOR - PAD * 2);
  const split = fix(x(left.length - 1));
  const end = [x(total - 1), y(right[right.length - 1])];
  return h('svg', {
    class: 'aix-saved-chart', viewBox: `0 0 ${W} ${H}`, role: 'img', dir: 'ltr',
    'aria-label': ar ? 'إغلاقات سابقة، ثم مسار محفوظ' : 'Past closes, then a saved path',
  },
  h('line', { x1: 0, y1: FLOOR, x2: W, y2: FLOOR, class: 'aix-saved-floor' }),
  h('line', { x1: split, y1: PAD, x2: split, y2: FLOOR, class: 'aix-saved-split' }),
  h('path', { d: path(left.map((v, i) => [x(i), y(v)])), class: 'aix-saved-past' }),
  h('path', { d: path(right.map((v, i) => [x(left.length - 1 + i), y(v)])), class: 'aix-saved-ahead' }),
  h('circle', { cx: fix(end[0]), cy: fix(end[1]), r: 3.5, class: 'aix-saved-end' }));
}

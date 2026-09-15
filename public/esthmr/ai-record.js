/* The models' record, in the two places the site draws it: the system's
 * figure at the top of Home, and every model beside it in the workbench's
 * past runs.
 *
 * WHAT IT SAYS
 * A statement about MODELS: the five companies each one ranked highest on a
 * night, and what those five returned against what everything it scored
 * returned. It names no company and ranks no company.
 *
 * NOTHING ON IT IS WRITTEN HERE
 * Every figure, count and date comes from `research/top5.json`, which the lab
 * rebuilds every night. A model with fewer scored sessions than the record's
 * own minimum shows how many it has and how many it needs — never an average
 * of two nights, and never a zero standing in for "not yet".
 */
import { React as R } from './react-shim.js';
import { finite, points, divergeBar } from './ai-visuals.js';

const h = R.createElement;

const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen',
  'nineteen', 'twenty'];
export const word = (n) => (Number.isInteger(n) && n >= 0 && n < WORDS.length ? WORDS[n] : String(n));
export const Word = (n) => { const w = word(n); return w.charAt(0).toUpperCase() + w.slice(1); };

/** Arabic counts agree with their noun: one, two, three to ten, eleven up. */
export function countAr(n, one, two, few, many) {
  if (n === 1) return one;
  if (n === 2) return two;
  return n >= 3 && n <= 10 ? `${n} ${few}` : `${n} ${many}`;
}

export const sessionsLabel = (n, ar) => (ar ? countAr(n, 'جلسة واحدة', 'جلستان', 'جلسات', 'جلسة')
  : `${n} ${n === 1 ? 'session' : 'sessions'}`);

/** Everything the record says at one window, derived from it and nothing else. */
export function heroModel(top5, horizon) {
  const models = (top5 && top5.models) || {};
  const minimum = finite(top5?.minimumSessions) ? top5.minimumSessions : 1;
  const hz = String(horizon);
  const rows = Object.entries(models)
    .filter(([, m]) => m && m.distinguishes !== false)
    .map(([id, m]) => {
      const one = (m.horizons || {})[hz] || {};
      const sessions = finite(one.sessions) ? one.sessions : 0;
      const scored = sessions >= minimum && finite(one.meanAdvantage);
      return {
        id, label: m.label || id, labelAr: m.labelAr || m.label || id, group: m.group || 'baseline',
        nights: finite(m.nights) ? m.nights : 0,
        sessions, scored, needed: Math.max(minimum - sessions, 0),
        advantage: scored ? one.meanAdvantage : null,
        ownReturn: scored ? one.meanReturn : null,
        market: scored ? one.meanMarket : null,
        ahead: finite(one.ahead) ? one.ahead : 0,
        signChanges: finite(one.signChanges) ? one.signChanges : 0,
        byDate: scored && Array.isArray(one.byDate) ? one.byDate : [],
        // Nights read whose window is still open: a date and how many of its
        // sessions have closed. Null from a record published before it was.
        waiting: Array.isArray(one.waiting)
          ? one.waiting.filter((w) => w && typeof w.basisSession === 'string' && finite(w.sessionsClosed))
          : null,
      };
    });
  const system = rows.find((r) => r.group === 'rerank') || null;
  const others = rows.filter((r) => r !== system);
  const scored = others.filter((r) => r.scored).sort((a, b) => b.advantage - a.advantage);
  const pending = others.filter((r) => !r.scored).sort((a, b) => b.sessions - a.sessions);
  return {
    horizon: hz, minimum,
    topCount: finite(top5?.topCount) ? top5.topCount : null,
    nights: Array.isArray(top5?.dates) ? top5.dates.length : 0,
    horizons: (Array.isArray(top5?.horizons) ? top5.horizons : []).map(String),
    latest: top5?.latest || null,
    system,
    rows: [system, ...scored, ...pending].filter(Boolean),
    scoredCount: rows.filter((r) => r.scored).length,
    pendingCount: rows.filter((r) => !r.scored).length,
  };
}

export function kindLabel(row, latest, ar) {
  if (row.group === 'rerank') {
    const n = latest?.forecasters;
    return ar ? 'يقرأ النماذج الأخرى' : `READS THE OTHER ${finite(n) ? word(n).toUpperCase() : 'MODELS'}`;
  }
  if (row.group === 'neural') return ar ? 'نموذج أساس' : 'FOUNDATION';
  return ar ? 'مقارنة بسيطة' : 'BASELINE';
}

/**
 * Every model against the market at one window: the list that sat on Home
 * and now closes the workbench's past runs. A row loads that model above.
 */
export function modelsCard(top5, ar, { horizon, selected, onPick, onWindow } = {}) {
  const t = (en, arabic) => (ar ? arabic : en);
  if (!top5 || !top5.models) return null;
  const m = heroModel(top5, horizon);
  if (!m.rows.length) return null;
  const scoredRows = m.rows.filter((r) => r.scored);
  const max = Math.max(...scoredRows.map((r) => Math.abs(r.advantage)), 0) * 1.12 || 1;
  const latest = m.latest || {};
  const pending = m.pendingCount
    ? t(`${word(m.pendingCount).toUpperCase()} ${m.pendingCount === 1 ? 'MODEL' : 'MODELS'} NOT YET SCORED`,
      countAr(m.pendingCount, 'نموذج واحد لم يُقيَّم بعد', 'نموذجان لم يُقيَّما بعد', 'نماذج لم تُقيَّم بعد', 'نموذجاً لم يُقيَّم بعد'))
    : t('EVERY MODEL SCORED', 'كل النماذج مُقيَّمة');

  return h('section', { class: 'aix-card aix-models' },
    h('header', null,
      h('div', null,
        h('h3', null, t('Model by model, against the market', 'نموذجاً بنموذج، مقابل السوق')),
        h('p', null, t('Every model’s scored five over the same window, against every company it scored. Pick one to load it above.',
          'خمس كل نموذج المُقيَّمة خلال الفترة نفسها، مقابل كل شركة قيّمها. اختر واحداً لعرضه في الأعلى.'))),
      h('div', { class: 'aix-seg is-small', role: 'group', 'aria-label': t('Window', 'الفترة') },
        m.horizons.map((hz) => h('button', {
          key: hz, type: 'button', class: hz === m.horizon ? 'on' : '', 'aria-pressed': String(hz === m.horizon),
          onClick: () => onWindow && onWindow(Number(hz)),
        }, sessionsLabel(Number(hz), ar))))),
    h('div', { class: 'aix-model-list' }, m.rows.map((r) => h('button', {
      key: r.id, type: 'button',
      class: `aix-model-row${r === m.system ? ' is-system' : ''}${r.scored ? '' : ' is-pending'}${r.id === selected ? ' is-selected' : ''}`,
      'aria-pressed': String(r.id === selected),
      onClick: () => onPick && onPick(r.id),
      'aria-label': `${ar ? r.labelAr : r.label} · ${r.scored ? points(r.advantage) : t('not yet scored', 'لم يُقيَّم بعد')}`,
    },
    h('span', { class: 'aix-model-name' },
      h('strong', null, ar ? r.labelAr : r.label),
      h('small', null, `${kindLabel(r, latest, ar)} · ${r.scored
        ? t(`${r.sessions} SESSIONS`, `${r.sessions} جلسة`)
        : t(`${r.sessions} OF ${m.minimum} SESSIONS`, `${r.sessions} من ${m.minimum} جلسات`)}`)),
    h('span', { class: `aix-model-value ${r.scored ? (r.advantage >= 0 ? 'up' : 'down') : 'quiet'}`, dir: 'ltr' },
      r.scored ? points(r.advantage) : '—'),
    r.scored
      ? divergeBar(r.advantage, max, r === m.system ? 'system' : undefined)
      : h('span', { class: 'aix-track aix-track-pending' })))),
    h('p', { class: 'aix-models-foot' },
      h('span', { dir: 'ltr' }, t('BEHIND ◀ 0 ▶ AHEAD', 'متأخر ◀ 0 ▶ متقدم')), ' · ', pending));
}

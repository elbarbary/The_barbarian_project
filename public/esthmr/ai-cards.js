/* The models' own record, at the top of Home.
 *
 * WHAT A CARD SAYS, AND WHY IT IS ALLOWED TO
 * Each card is a statement about a MODEL: the five companies it ranked
 * highest on a session, and what those returned against what everything it
 * scored returned. It names no company, ranks no company, and is the same
 * category of claim as a fund's published track record.
 *
 * WHAT IT MUST NOT BECOME
 * The moment a card names the five, it is a list of five securities chosen by
 * this publisher, which is the one shape an unlicensed publisher may not make.
 * `namesNoSecurity` in the test file is the guard; this comment is why.
 *
 * THE NUMBERS ARE SMALL AND THE CARDS SAY SO
 * Five companies over eight sessions is forty observations. Every card carries
 * how many sessions are behind it and how many of them the model's five beat
 * the market on, because an average without its sample is a number pretending
 * to be a finding. Where a model has no scorable history the card says that
 * rather than showing a zero.
 */
import { React as R } from './react-shim.js';

const h = R.createElement;
const finite = (v) => typeof v === 'number' && Number.isFinite(v);
const pp = (v) => (finite(v) ? `${v > 0 ? '+' : ''}${v.toFixed(2)}%` : '—');
const tone = (v) => (!finite(v) ? 'var(--t2)' : v > 0 ? 'var(--up)' : v < 0 ? 'var(--down)' : 'var(--t2)');

/* The neural models and the layer that reads them. The baselines are the
   control group and belong on the detail screen, not on the front page:
   a card headed "Drift" would be answering a question nobody asked. */
export const FEATURED = ['kronos', 'chronos2', 'timesfm25', 'rerank'];

export function cardsFrom(top5, horizon = '5') {
  const models = (top5 && top5.models) || {};
  return FEATURED.filter((id) => models[id]).map((id) => {
    const model = models[id];
    const row = (model.horizons || {})[horizon] || {};
    return {
      id,
      label: model.label,
      labelAr: model.labelAr,
      sessions: finite(row.sessions) ? row.sessions : 0,
      advantage: row.meanAdvantage,
      ownReturn: row.meanReturn,
      market: row.meanMarket,
      ahead: finite(row.ahead) ? row.ahead : 0,
    };
  });
}

/** The average across the models that have a record, and how many that is.
 *
 * Reported as "1 of 4 have enough history" rather than averaging a zero in
 * for the three that have run once: a mean over models that cannot be scored
 * is a mean over an assumption. */
export function averageOf(cards) {
  const scored = cards.filter((c) => c.sessions > 0 && finite(c.advantage));
  if (!scored.length) return { scored: 0, of: cards.length, advantage: null, sessions: 0 };
  return {
    scored: scored.length,
    of: cards.length,
    advantage: scored.reduce((s, c) => s + c.advantage, 0) / scored.length,
    ownReturn: scored.reduce((s, c) => s + c.ownReturn, 0) / scored.length,
    market: scored.reduce((s, c) => s + c.market, 0) / scored.length,
    sessions: Math.max(...scored.map((c) => c.sessions)),
  };
}

/* A sparkline of the per-session advantage, so a mean is never the only thing
   on the card. Drawn from the dates the backtest actually scored; no line
   where there are fewer than two. */
function spark(row, width = 116, height = 30) {
  const dates = (row && row.byDate) || [];
  if (dates.length < 2) return null;
  const values = dates.map((d) => d.advantage);
  const low = Math.min(0, ...values);
  const high = Math.max(0, ...values);
  const span = high - low || 1;
  const x = (i) => (i / (values.length - 1)) * width;
  const y = (v) => height - ((v - low) / span) * height;
  const path = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  return h('svg', { class: 'aic-spark', viewBox: `0 0 ${width} ${height}`,
                    width, height, 'aria-hidden': 'true', preserveAspectRatio: 'none' },
    h('line', { x1: 0, x2: width, y1: y(0).toFixed(1), y2: y(0).toFixed(1),
                stroke: 'var(--rule)', 'stroke-width': 1 }),
    h('path', { d: path, fill: 'none', 'stroke-width': 1.6, 'stroke-linejoin': 'round',
                stroke: tone(values[values.length - 1]) }));
}

export function aiCards(component, data, ar) {
  const t = (en, arabic) => (ar ? arabic : en);
  const top5 = data.top5;
  const horizon = component.state.aiHorizon === '1' ? '1' : '5';
  const cards = top5 ? cardsFrom(top5, horizon) : [];
  if (!top5 || !cards.length) return null;
  const average = averageOf(cards);
  const open = () => component.setState({ screen: 'scenarios' });
  const span = horizon === '1' ? t('the next session', 'الجلسة التالية') : t('five sessions', 'خمس جلسات');

  return h('section', { class: 'ai-cards' },
    h('header', { class: 'aic-head' },
      h('div', null,
        h('h2', null,
          t('What the models’ top five actually did', 'ماذا فعلت أفضل خمس لدى النماذج'),
          // Said on the surface, not only behind the click.
          h('span', { class: 'aic-beta' }, t('BETA · AI', 'تجريبي · ذكاء اصطناعي'))),
        h('p', { class: 'aic-sub' }, t(
          `Each model ranks every company after the close. These are the five it ranked highest, and what they returned over ${span} against the market. Model outputs, not advice.`,
          `كل نموذج يرتّب الشركات بعد الإغلاق. هذه أعلى خمس لديه، وما حققته خلال ${span} مقارنةً بالسوق. مخرجات نماذج، وليست توصية.`))),
      h('div', { class: 'ask-subjects aic-horizon', role: 'group', 'aria-label': t('Horizon', 'الأفق') },
        ['1', '5'].map((hz) => h('button', { key: hz, type: 'button',
          class: horizon === hz ? 'ask-subject on' : 'ask-subject',
          'aria-pressed': horizon === hz ? 'true' : 'false',
          onClick: () => component.setState({ aiHorizon: hz }) },
          hz === '1' ? t('1 session', 'جلسة') : t('5 sessions', '5 جلسات'))))),

    h('div', { class: 'aic-grid' }, cards.map((c) => {
      const row = ((top5.models[c.id] || {}).horizons || {})[horizon] || {};
      return h('button', { key: c.id, type: 'button', class: 'aic-card', onClick: open,
        'aria-label': `${ar ? c.labelAr : c.label}: ${c.sessions ? pp(c.advantage) : t('not yet scored', 'لم يُقيَّم بعد')}` },
        h('div', { class: 'aic-name' }, ar ? c.labelAr : c.label),
        c.sessions
          ? h('div', null,
              h('div', { class: 'aic-figure', style: `color:${tone(c.advantage)}` }, pp(c.advantage)),
              h('div', { class: 'aic-against' }, t(
                `${pp(c.ownReturn)} against the market’s ${pp(c.market)}`,
                `${pp(c.ownReturn)} مقابل ${pp(c.market)} للسوق`)),
              spark(row),
              h('div', { class: 'aic-sample' }, t(
                `ahead on ${c.ahead} of ${c.sessions} sessions`,
                `متقدّم في ${c.ahead} من ${c.sessions} جلسة`)))
          : h('div', null,
              h('div', { class: 'aic-figure aic-quiet' }, t('No record yet', 'لا سجل بعد')),
              h('div', { class: 'aic-against' }, t(
                'It has not run on enough sessions to be scored.',
                'لم يعمل على جلسات كافية ليُقيَّم.'))),
        h('span', { class: 'aic-open' }, t('Open the workbench ↗', 'افتح المختبر ↗')));
    })),

    h('p', { class: 'aic-foot' },
      average.scored
        ? t(`Across the ${average.scored} of ${average.of} with a record, the five they ranked highest returned ${pp(average.ownReturn)} against the market's ${pp(average.market)} — ${pp(average.advantage)}. Five companies over ${average.sessions} sessions is a very small sample, and the sign of these numbers has changed from one week to the next.`,
            `عبر ${average.scored} من ${average.of} لديها سجل، حققت أعلى خمس لديها ${pp(average.ownReturn)} مقابل ${pp(average.market)} للسوق — ${pp(average.advantage)}. خمس شركات عبر ${average.sessions} جلسة عيّنة صغيرة جدًا، وإشارة هذه الأرقام تغيّرت من أسبوع لآخر.`)
        : t('None of them has run on enough sessions to be scored yet.',
            'لم يعمل أي منها على جلسات كافية ليُقيَّم بعد.')),
  );
}

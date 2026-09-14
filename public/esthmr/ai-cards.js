/* The models' own record, at the top of Home.
 *
 * WHAT A CARD SAYS
 * Each card is a statement about a MODEL: the five companies it ranked
 * highest on a session, and what those returned against what everything it
 * scored returned. It names no company and ranks no company. These safeguards
 * are not a determination of regulatory clearance.
 *
 * WHAT IT MUST NOT BECOME
 * The moment a card names the five, it is a list of five securities chosen by
 * this publisher, outside the intended model-level record.
 * `namesNoSecurity` in the test file is the guard; this comment is why.
 *
 * THE NUMBERS ARE SMALL AND THE CARDS SAY SO
 * Five companies over eight sessions is forty observations. Every card carries
 * how many sessions are behind it and how many of them the model's five beat
 * the market on, because an average without its sample is a number pretending
 * to be a finding. Where a model has no scorable history the card says that
 * rather than showing a zero.
 */
import { renderAiCards } from './ai-visuals.js';

const finite = (v) => typeof v === 'number' && Number.isFinite(v);

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
  const scored = cards.filter((c) => c.sessions > 0 && [c.advantage,c.ownReturn,c.market].every(finite));
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

export function aiCards(component, data, ar) {
  const horizon = component.state.aiHorizon === '1' ? '1' : '5';
  const cards = cardsFrom(data.top5, horizon);
  return cards.length ? renderAiCards(component, data.top5, cards, horizon, ar) : null;
}

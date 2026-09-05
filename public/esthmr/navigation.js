const SCREENS = new Set(['home', 'market', 'company', 'today', 'investors',
  'heat', 'watchlist', 'sectors', 'calendar', 'exchange', 'tools', 'research', 'crossings']);
const RANK_METRICS = new Set(['cap','close','dividend_yield','profit','debt_equity']);

export function readRoute(search) {
  const params = new URLSearchParams(search);
  const screen = SCREENS.has(params.get('view')) ? params.get('view') : 'home';
  const ticker = params.get('ticker') || '';
  const panel = params.get('panel');
  return { screen, ticker: /^[A-Za-z0-9._-]{1,24}$/.test(ticker) ? ticker : '',
    companyPanel: ['overview', 'financials', 'filings'].includes(panel) ? panel : 'overview',
    marketMode: ['rankings','volume'].includes(params.get('mode')) ? params.get('mode') : '',
    rankMetric: RANK_METRICS.has(params.get('rank')) ? params.get('rank') : 'cap',
    rankPair: RANK_METRICS.has(params.get('pair')) ? params.get('pair') : '',
    rankAscending: params.get('order') === 'asc' };
}

export function routeKey(state) {
  const p = new URLSearchParams();
  p.set('view', SCREENS.has(state.screen) ? state.screen : 'home');
  if (state.screen === 'market' && ['rankings','volume'].includes(state.marketMode)) {
    p.set('mode',state.marketMode);
    if (state.marketMode === 'rankings') {
      if (RANK_METRICS.has(state.rankMetric)) p.set('rank',state.rankMetric);
      if (RANK_METRICS.has(state.rankPair)) p.set('pair',state.rankPair);
      if (state.rankAscending) p.set('order','asc');
    }
  }
  if (state.screen === 'company' && state.ticker) {
    p.set('ticker', state.ticker);
    p.set('panel', state.companyPanel || 'overview');
  }
  return p.toString();
}

export function connectNavigation(component, host = window) {
  let current = routeKey(component.state);
  const navigateBack = () => {
    const route = readRoute(host.location.search);
    current = routeKey(route);
    component.setState(route);
    host.scrollTo({ top: 0, behavior: 'instant' });
  };
  host.addEventListener('popstate', navigateBack);
  return () => {
    const next = routeKey(component.state);
    if (next === current) return;
    current = next;
    const url = new URL(host.location.href);
    for (const k of ['view', 'ticker', 'panel','mode','rank','pair','order']) url.searchParams.delete(k);
    for (const [k, v] of new URLSearchParams(next)) url.searchParams.set(k, v);
    url.hash = '';
    host.history.pushState(null, '', url);
    host.scrollTo({ top: 0, behavior: 'instant' });
  };
}

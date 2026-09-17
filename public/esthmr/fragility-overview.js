/* The crash-warning research, told so a reader can follow it.
 *
 * The research notebook (fragility-notebook.html, shown in full below this
 * account on the same page since 17 Sep 2026) is the lab: seven models,
 * three annualisation conventions and tables from more than one rerun, side by
 * side. Read as a page it contradicted itself — one yearly rate for a strategy
 * in one box and another in the next, a strategy that "WON" the 2015–2019 rise
 * in a table
 * whose own published series has it returning half of what holding the index
 * did — and it told readers "Today's recommended stance: 100% in Egyptian
 * stocks" off a snapshot a week old.
 *
 * So every figure here is computed in this file from the published daily
 * series, with one convention, and nothing is typed in:
 *
 * - Growth is the series' own multiplier. "A year" is that growth over the
 *   calendar span between the dates it covers (18.7 years from January 2008),
 *   not over 4,518 sessions divided by 250, which is a US trading year and
 *   overstates every rate on an exchange that opens about 242 days a year.
 * - A worst fall is peak to trough on the same series the chart draws.
 * - A crash is the research's own list; how far each portfolio fell is
 *   measured over the research's own window, 60 trading days from its start.
 *
 * And nothing here tells a reader what to do. The latest reading is dated to
 * the research run it came from and labelled as not a signal.
 *
 * That reading has its own card near the top: the score, the outside
 * pressure, the volatility and where each approach stood on the last session
 * of the run. All of it comes from the series' `latest_live`. The page lost
 * it on 16 Sep 2026 along with the notebook's tables, and the owner asked for
 * both back the next day.
 */

export const SYSTEMS = {
  hold: 'cum_hold',
  rule: 'cum_cv2_cash_sma',
  ladder: 'cum_cv2_ladder',
  s100: 'cum_s100',
  partial: 'cum_cv5_p',
};
export const WEIGHTS = { rule: 'w_cv2_cash_sma', ladder: 'w_cv2_ladder', s100: 'w_s100' };
export const KINDS = {
  STRICT_EARLY: 'early',
  EARLY_FRAGILITY_BUILDUP: 'early',
  REACTIVE: 'during',
  HARD_FALSE_ALARM: 'false',
  NEAR_MISS: 'smaller',
};
export const KIND_ORDER = ['early', 'during', 'false', 'smaller'];
export const CRASH_WINDOW = 60;
export const START_CAPITAL = 100000;
// The rule's own settings, as the notebook states them. The warning switches
// on when the score is at or above ALERT_LINE on two sessions in a row. The
// volatility-brake variant does not buy back while 20-day volatility is
// above VOL_BRAKE percent.
export const ALERT_LINE = 0.93;
export const VOL_BRAKE = 28;

const DAY = 86400000;
export const years = (from, to) => (Date.parse(to) - Date.parse(from)) / DAY / 365.25;

/* ── reading the published documents ───────────────────────────────────── */

export function readSeries(doc) {
  const columns = doc?.timeline_columns;
  const rows = doc?.timeline;
  if (!Array.isArray(columns) || !Array.isArray(rows) || rows.length < 2) {
    throw new Error('the daily series has no timeline');
  }
  const at = Object.fromEntries(columns.map((name, i) => [name, i]));
  const wanted = ['date', 'price', 'al', ...Object.values(SYSTEMS), ...Object.values(WEIGHTS)];
  const missing = wanted.filter((name) => !(name in at));
  if (missing.length) throw new Error(`the daily series has no ${missing.join(', ')}`);
  const column = (name) => rows.map((row) => row[at[name]]);
  return {
    dates: column('date'),
    price: column('price'),
    alert: column('al').map((v) => Boolean(v)),
    value: Object.fromEntries(Object.entries(SYSTEMS).map(([key, name]) => [key, column(name)])),
    weight: Object.fromEntries(Object.entries(WEIGHTS).map(([key, name]) => [key, column(name)])),
  };
}

/* The multiplier, rate and worst fall of one approach between two sessions.
 *
 * A period starts from the close BEFORE its first session, so the first day's
 * move belongs to it; the full history starts from the capital itself, which
 * is 1 in a series of multipliers. */
export function stats(series, key, from = 0, to = series.dates.length - 1) {
  const values = key === 'price' ? series.price : series.value[key];
  const start = from > 0 ? values[from - 1] : (key === 'price' ? values[0] : 1);
  const startDate = from > 0 ? series.dates[from - 1] : series.dates[0];
  let peak = start;
  let worst = 0;
  for (let i = from; i <= to; i += 1) {
    peak = Math.max(peak, values[i]);
    worst = Math.min(worst, values[i] / peak - 1);
  }
  const growth = values[to] / start;
  const span = years(startDate, series.dates[to]);
  return { growth, perYear: span > 0 ? growth ** (1 / span) - 1 : null, worstFall: worst, years: span, from, to };
}

/* Three market regimes, as the research cut them: consecutive session counts
 * that must add up to the whole history, or the cut is not the research's. */
export function periods(series, meta) {
  const blocks = meta?.blocks || {};
  const order = ['block1', 'block2', 'block3'].filter((id) => blocks[id]);
  let from = 0;
  const out = order.map((id) => {
    const to = from + blocks[id].sessions - 1;
    const period = { id, from, to };
    from = to + 1;
    return period;
  });
  if (from !== series.dates.length) {
    throw new Error(`the research periods cover ${from} sessions, the series ${series.dates.length}`);
  }
  return out;
}

/* A switch is a session whose target weight differs from the one before. */
export function switches(series, key) {
  const weights = series.weight[key];
  let count = 0;
  for (let i = 1; i < weights.length; i += 1) if (weights[i] !== weights[i - 1]) count += 1;
  return count;
}

/* Runs of consecutive sessions with the warning on, as [first, last] indices. */
export function warningSpans(series, from = 0, to = series.dates.length - 1) {
  const spans = [];
  let open = null;
  for (let i = from; i <= to; i += 1) {
    if (series.alert[i] && open === null) open = i;
    if (!series.alert[i] && open !== null) { spans.push([open, i - 1]); open = null; }
  }
  if (open !== null) spans.push([open, to]);
  return spans;
}

export function kindOf(episode) {
  return KINDS[episode?.type] || 'other';
}

export function warningCounts(episodes, from = '0000', to = '9999') {
  const counts = { early: 0, during: 0, false: 0, smaller: 0, other: 0, total: 0 };
  for (const episode of episodes) {
    if (episode.start < from || episode.start > to) continue;
    counts[kindOf(episode)] += 1;
    counts.total += 1;
  }
  return counts;
}

/* How far each portfolio fell in the research's window after each crash began,
 * and how many trading days before it the earliest warning switched on. */
export function crashes(series, crises, episodes) {
  const worstFrom = (values, a, b) => {
    let peak = values[a];
    let worst = 0;
    for (let i = a; i <= b; i += 1) {
      peak = Math.max(peak, values[i]);
      worst = Math.min(worst, values[i] / peak - 1);
    }
    return worst;
  };
  return (crises || []).map((crisis) => {
    const start = series.dates.findIndex((d) => d >= crisis.onset);
    if (start < 0) return null;
    const end = Math.min(series.dates.length - 1, start + CRASH_WINDOW);
    const number = Number(String(crisis.id).replace(/\D/g, ''));
    const warned = episodes
      .filter((e) => e.crisis_id === number && kindOf(e) === 'early' && Number(e.lead) > 0)
      .sort((a, b) => (a.start < b.start ? -1 : 1));
    return {
      id: crisis.id,
      name: crisis.name,
      onset: crisis.onset,
      index: worstFrom(series.price, start, end),
      hold: worstFrom(series.value.hold, start, end),
      rule: worstFrom(series.value.rule, start, end),
      lead: warned.length ? Number(warned[0].lead) : null,
      warnedOn: warned.length ? warned[0].start : null,
    };
  }).filter(Boolean);
}

export function model(seriesDoc, episodes, attribution) {
  const series = readSeries(seriesDoc);
  const last = series.dates.length - 1;
  const full = Object.fromEntries(Object.keys(SYSTEMS).map((key) => [key, stats(series, key)]));
  const cuts = periods(series, seriesDoc.meta).map((period) => ({
    ...period,
    rule: stats(series, 'rule', period.from, period.to),
    hold: stats(series, 'hold', period.from, period.to),
    warnings: warningCounts(episodes, series.dates[period.from], series.dates[period.to]),
  }));
  const list = crashes(series, seriesDoc.crises, episodes);
  const audit = attribution?.cash_sleeve_audit || null;
  const latest = seriesDoc.latest_live || null;
  return {
    series,
    first: series.dates[0],
    last: series.dates[last],
    sessions: series.dates.length,
    years: years(series.dates[0], series.dates[last]),
    full,
    periods: cuts,
    switches: switches(series, 'rule'),
    warnings: warningCounts(episodes),
    episodes: [...episodes].sort((a, b) => (a.start < b.start ? -1 : 1)),
    crashes: list,
    crashesLess: list.filter((c) => c.rule > c.index).length,
    crashesMore: list.filter((c) => c.rule < c.index).length,
    tax: audit?.gross_1y_tbill && audit?.taxed_20pct_tbill
      ? { gross: audit.gross_1y_tbill.wealth_100k, taxed: audit.taxed_20pct_tbill.wealth_100k }
      : null,
    latest: latest && latest.date ? {
      date: latest.date,
      price: latest.price,
      on: Boolean(latest.al_v2),
      score: latest.s_v4,
      outside: latest.wm_p,
      gold: latest.gold_stress,
      oil: latest.petrol_stress,
      swings: latest.vol_stress,
      vol20: latest.vol20,
      brake: Boolean(latest.vol_brake_active),
      equity: latest.active_equity_exposure,
      partial: latest.dynamic_hedge_p,
    } : null,
  };
}

/* ── words ─────────────────────────────────────────────────────────────── */

/* Numbers sit inside left-to-right isolates, so "−50.4%" keeps its sign in
 * front of it in an Arabic sentence instead of trailing the digits. */
export const iso = (text) => `⁦${text}⁩`;

const MONTHS = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  ar: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
};

export function month(date, lang) {
  const [y, m] = String(date).split('-');
  return `${MONTHS[lang][Number(m) - 1]} ${y}`;
}

export function day(date, lang) {
  const [y, m, d] = String(date).split('-');
  return `${Number(d)} ${MONTHS[lang][Number(m) - 1]} ${y}`;
}

export function pct(value, digits = 1) {
  if (!Number.isFinite(value)) return '—';
  const text = Math.abs(value * 100).toFixed(digits);
  if (Number(text) === 0) return `${(0).toFixed(digits)}%`;
  return `${value > 0 ? '+' : '−'}${text}%`;
}

export function fall(value, digits = 1) {
  if (!Number.isFinite(value)) return '—';
  const text = Math.abs(value * 100).toFixed(digits);
  return Number(text) === 0 ? `${(0).toFixed(digits)}%` : `−${text}%`;
}

/* [digits, unit]. Arabic keeps its unit as a word after the digits; English
 * writes it as a suffix. The two are drawn apart so the digits can sit in a
 * left-to-right isolate while the word reads in the sentence's own direction —
 * isolating "1.15 مليون" whole puts مليون first for a reader going right to left. */
export function moneyParts(value, lang) {
  if (!Number.isFinite(value)) return ['—', ''];
  if (Math.abs(value) >= 1e6) {
    const m = (value / 1e6).toFixed(2);
    return lang === 'ar' ? [m, 'مليون'] : [`${m}M`, ''];
  }
  if (Math.abs(value) >= 1e3) {
    const k = String(Math.round(value / 1e3));
    return lang === 'ar' ? [k, 'ألف'] : [`${k}K`, ''];
  }
  return [Math.round(value).toLocaleString('en-US'), ''];
}

export function money(value, lang) {
  const [digits, unit] = moneyParts(value, lang);
  return unit ? `${iso(digits)} ${unit}` : iso(digits);
}

export const whole = (value) => (Number.isFinite(value) ? Math.round(value).toLocaleString('en-US') : '—');

export const COPY = {
  en: {
    docTitle: 'Crash warning research · ESTHMR',
    back: 'ESTHMR',
    pageName: 'Crash warning research',
    otherLang: 'العربية',
    notebook: 'Full research',
    eyebrow: 'Research · EGX 30 · {from} – {to}',
    title: 'Could an early warning have softened the EGX’s worst crashes?',
    lede: 'We tested one rule on {days} trading days. When the warning switches on, the money moves from the EGX 30 into Treasury bills. It moves back only after the index closes above its average of the last 20 days. Every switch happens at the next day’s open and pays a 0.20% fee.',
    notAdvice: 'A test on past prices, not advice',
    figGrowth: '100,000 EGP became',
    figFall: 'Worst fall along the way',
    figWarnings: 'Warnings in {years} years',
    withRule: 'with the rule',
    holding: 'holding the index',
    falseOfThem: 'of them false alarms',
    readingTitle: 'The model’s reading on the last session of the run',
    readingSub: 'Computed for {date}. It is shown as it was computed and does not update daily.',
    readingOff: 'No warning',
    readingOn: 'Warning on',
    readingScore: 'Stress inside the EGX',
    readingScoreNote: 'The warning switches on at {line} or higher on two sessions in a row.',
    readingOutside: 'Pressure from outside',
    readingOutsideNote: 'Gold, oil and market swings, each from 0 to 1, weighted 45, 35 and 20.',
    readingGold: 'Gold',
    readingOil: 'Oil',
    readingSwings: 'Swings',
    readingVol: 'Volatility over 20 days',
    readingVolNote: 'The volatility-brake version does not buy back while it is above {brake}.',
    readingPlaces: 'Where each approach stood',
    readingRule: 'The rule',
    readingRuleValue: '{eq} in the index · {bills} in Treasury bills',
    readingPartial: 'Partial protection',
    readingPartialValue: '{p} in Treasury bills',
    readingIndex: 'EGX 30 close',
    readingFoot: 'A reading from a test on past prices, not a signal to act on.',
    readingMore: 'Every gauge and the what-if scenarios',
    chartTitle: 'What 100,000 EGP became',
    chartSub: 'After fees. Shaded stripes are the days the warning was on.',
    periodAll: 'All years',
    period_block1: 'Crash years',
    period_block2: 'Calm rise',
    period_block3: 'Shocks',
    legendRule: 'The rule',
    legendHold: 'Holding the index',
    legendWarn: 'Warning on',
    ddTitle: 'How far below its previous high',
    periodSummary: 'From {from} to {to} the rule returned {r} a year against {h} for holding the index. Its worst fall was {rd}, against {hd}.',
    chartAria: 'Chart: 100,000 EGP became {rule} with the rule and {hold} holding the index between {from} and {to}.',
    ruleAt: 'Rule',
    indexAt: 'Index',
    howTitle: 'How the rule works',
    step1Title: 'The warning switches on',
    step1: 'It switches on when stress inside the Egyptian market stays very high for two days, or is high while oil or wheat prices jump or global markets take fright.',
    step2Title: 'The money waits in Treasury bills',
    step2: 'At the next day’s open everything moves into Treasury bills, which keep earning interest while shares fall.',
    step3Title: 'It returns when the trend turns',
    step3: 'The money goes back into the index only after it closes above its 20-day average, so a short bounce in the middle of a fall does not pull it back too early.',
    switches: '{n} switches in {years} years, about {per} a year.',
    periodsTitle: 'Where it helped, and where it hurt',
    periodsSub: 'The same rule in three very different markets.',
    periodName_block1: 'Crashes and a revolution',
    periodNote_block1: 'The global financial crisis, the 2011 revolution and the unrest that followed.',
    periodName_block2: 'A long rise',
    periodNote_block2: 'The pound’s 2016 flotation and a mostly calm climb.',
    periodName_block3: 'Shocks',
    periodNote_block3: 'COVID-19, the war in Ukraine and the pound’s later devaluations.',
    better: 'The rule did better',
    worse: 'The rule did worse',
    aYear: 'A year',
    worstFall: 'Worst fall',
    falseInPeriod: 'False alarms in these years: {n}',
    warnTitle: 'Every warning, {from}–{to}',
    warnSub: 'Each dot is one warning, on the day it switched on. A crash here means the EGX 30 falling at least 18% from a high within 60 trading days.',
    kind_crash: 'Crash began',
    kind_early: 'Before a crash',
    kind_during: 'During a crash',
    kind_false: 'False alarm',
    kind_smaller: 'Smaller fall',
    kind_other: 'Other',
    kindNote_early: 'Switched on before a crash began',
    kindNote_during: 'Switched on after the fall had begun',
    kindNote_false: 'No real fall followed',
    kindNote_smaller: 'A fall followed, under 18%',
    warnPick: 'Tap or hover a dot to read that warning.',
    warnDetail: '{kind}: {from} to {to}. In the weeks after it switched on, the index fell by up to {mae} and rose by up to {mfe}.',
    warnCrash: 'It belongs to: {name}.',
    warnList: 'Show every warning as a list',
    listBegan: 'Switched on',
    listEnded: 'Switched off',
    listKind: 'Kind',
    listFell: 'Index fell up to',
    listRose: 'Index rose up to',
    crashTitle: 'Each crash, one by one',
    crashSub: 'The worst fall of each portfolio in the 60 trading days after each crash began.',
    crashIndex: 'Index',
    crashRule: 'Rule',
    crashLead: 'Warning {n} trading days before',
    crashNoLead: 'No warning before it',
    crashSummary: 'The rule fell less than the index in {k} of these {n} crashes, and further in {w}.',
    compareTitle: 'Other ways to use the same warning',
    compareSub: 'Same warning, same fees, same {years} years.',
    colApproach: 'Approach',
    colBecame: '100,000 EGP became',
    colYear: 'A year',
    colFall: 'Worst fall',
    thisPage: 'This page',
    sys_hold: 'Hold the index',
    sysNote_hold: 'Never switches.',
    sys_s100: 'Sell on the warning, buy back when it ends',
    sysNote_s100: 'Back into shares as soon as the warning switches off.',
    sys_rule: 'The rule on this page',
    sysNote_rule: 'Treasury bills until the index closes above its 20-day average.',
    sys_ladder: 'The rule, buying back in steps',
    sysNote_ladder: 'Also buys back a quarter at a time after falls of 15%, 30%, 45% and 60%.',
    sys_partial: 'Partial protection',
    sysNote_partial: 'Moves 25% to 60% into Treasury bills, depending on gold, oil and volatility.',
    limitsTitle: 'What this test cannot tell you',
    limit1: 'It looks backwards. The rule was picked after trying many versions on this same history, so part of its lead may be a good fit to the past rather than a skill that lasts.',
    limit2: 'Every switch is assumed to fill at the next day’s opening price for a 0.20% fee.',
    limit3: 'Treasury-bill interest is counted before the 20% tax on it. With the tax taken off, the research’s test of the step-by-step version ends at {taxed} instead of {gross}.',
    limit4: 'The next crash will not look exactly like the last ones.',
    aboutTitle: 'About this data',
    aboutRun: 'Last research run: {date}. On that day the warning was {state} and the EGX 30 closed at {price}.',
    stateOn: 'on',
    stateOff: 'off',
    aboutNote: 'This page shows the research as it was last run. It does not update daily, and it is not a signal to act on.',
    researchersTitle: 'For researchers',
    dlSeries: 'Daily series for every approach (JSON)',
    dlWarnings: 'Every warning (JSON)',
    dlTrades: 'Every switch, trade by trade (JSON)',
    dlNotebook: 'Every model, table and chart, further down this page',
    researchTitle: 'The full research',
    researchSub: 'Every model, table and chart from the research runs, as they were published, in English. Some figures there are annualised over 250 trading days a year or come from earlier reruns, so they can differ from the account above, which works every figure out from the daily series.',
    researchJump: 'Go straight to',
    jumpReading: 'Every gauge of the model',
    jumpTable: 'The 18-year results table',
    jumpLab: 'Scenario lab and wealth chart',
    jumpTrades: 'Trades ledger',
    jumpAttribution: 'Where the return came from',
    jumpCrises: 'The 17 crises',
    jumpQuant: 'Simulator, false-alarm autopsy and all 76 warnings',
    legal: 'ESTHMR is a publisher and is not licensed by the Financial Regulatory Authority. We do not buy, we do not sell, and we do not advise. Nothing here is a recommendation to trade any security.',
    loading: 'Loading the research…',
    failed: 'The research data did not load.',
    retry: 'Try again',
    researchLoading: 'Loading the full research…',
    researchFailed: 'The full research did not load.',
  },
  ar: {
    docTitle: 'بحث إنذار الانهيارات · ESTHMR',
    back: 'ESTHMR',
    pageName: 'بحث إنذار الانهيارات',
    otherLang: 'English',
    notebook: 'البحث الكامل',
    eyebrow: 'بحث · مؤشر EGX 30 · {from} – {to}',
    title: 'هل كان إنذار مبكر سيخفّف أسوأ انهيارات البورصة المصرية؟',
    lede: 'اختبرنا قاعدة واحدة على {days} يوم تداول: عندما يعمل الإنذار تنتقل الأموال من مؤشر EGX 30 إلى أذون الخزانة، ولا تعود إلى المؤشر إلا بعد أن يغلق فوق متوسط آخر 20 يومًا. كل تحويل يتم عند افتتاح اليوم التالي ويدفع عمولة 0.20%.',
    notAdvice: 'اختبار على أسعار سابقة، وليس نصيحة استثمارية',
    figGrowth: 'أصبحت 100,000 جنيه',
    figFall: 'أسوأ تراجع على الطريق',
    figWarnings: 'الإنذارات خلال {years} سنة',
    withRule: 'بالقاعدة',
    holding: 'بالاحتفاظ بالمؤشر',
    falseOfThem: 'منها إنذارات كاذبة',
    readingTitle: 'قراءة النموذج في آخر جلسة من تشغيل البحث',
    readingSub: 'محسوبة ليوم {date}. تُعرض كما حُسبت ولا تُحدَّث يوميًا.',
    readingOff: 'لا يوجد إنذار',
    readingOn: 'الإنذار قائم',
    readingScore: 'الضغط داخل البورصة المصرية',
    readingScoreNote: 'يعمل الإنذار عند {line} أو أعلى في جلستين متتاليتين.',
    readingOutside: 'الضغط من الخارج',
    readingOutsideNote: 'الذهب والبترول وتقلبات الأسواق، كلٌّ من 0 إلى 1، بأوزان 45 و35 و20.',
    readingGold: 'الذهب',
    readingOil: 'البترول',
    readingSwings: 'التقلبات',
    readingVol: 'التقلب خلال 20 يومًا',
    readingVolNote: 'نسخة مكبح التقلب لا تعود إلى الأسهم ما دام أعلى من {brake}.',
    readingPlaces: 'أين كانت كل طريقة',
    readingRule: 'القاعدة',
    readingRuleValue: '{eq} في المؤشر · {bills} في أذون الخزانة',
    readingPartial: 'الحماية الجزئية',
    readingPartialValue: '{p} في أذون الخزانة',
    readingIndex: 'إغلاق EGX 30',
    readingFoot: 'قراءة من اختبار على أسعار سابقة، وليست إشارة للتصرّف.',
    readingMore: 'كل مقاييس النموذج وسيناريوهات «ماذا لو»',
    chartTitle: 'ماذا أصبحت 100,000 جنيه',
    chartSub: 'بعد خصم العمولات. الشرائط المظلّلة هي الأيام التي كان فيها الإنذار قائمًا.',
    periodAll: 'كل السنوات',
    period_block1: 'سنوات الانهيار',
    period_block2: 'صعود هادئ',
    period_block3: 'صدمات',
    legendRule: 'القاعدة',
    legendHold: 'الاحتفاظ بالمؤشر',
    legendWarn: 'الإنذار قائم',
    ddTitle: 'المسافة تحت أعلى مستوى سابق',
    periodSummary: 'من {from} إلى {to} حققت القاعدة {r} سنويًا مقابل {h} للاحتفاظ بالمؤشر، وكان أسوأ تراجع لها {rd} مقابل {hd}.',
    chartAria: 'رسم بياني: أصبحت 100,000 جنيه {rule} بالقاعدة و{hold} بالاحتفاظ بالمؤشر بين {from} و{to}.',
    ruleAt: 'القاعدة',
    indexAt: 'المؤشر',
    howTitle: 'كيف تعمل القاعدة',
    step1Title: 'يعمل الإنذار',
    step1: 'يعمل عندما يظل الضغط داخل السوق المصري مرتفعًا جدًا لمدة يومين، أو يكون مرتفعًا بينما تقفز أسعار البترول أو القمح أو يسود القلق الأسواق العالمية.',
    step2Title: 'تنتظر الأموال في أذون الخزانة',
    step2: 'عند افتتاح اليوم التالي تنتقل الأموال كلها إلى أذون الخزانة، التي تواصل تحقيق الفائدة بينما تتراجع الأسهم.',
    step3Title: 'تعود عندما يتحسّن الاتجاه',
    step3: 'لا تعود الأموال إلى المؤشر إلا بعد أن يغلق فوق متوسط آخر 20 يومًا، حتى لا يعيدها ارتداد قصير وسط الهبوط قبل الأوان.',
    switches: 'عدد التحويلات: {n} خلال {years} سنة، أي نحو {per} في السنة.',
    periodsTitle: 'أين ساعدت القاعدة، وأين أضرّت',
    periodsSub: 'القاعدة نفسها في ثلاث أسواق مختلفة تمامًا.',
    periodName_block1: 'انهيارات وثورة',
    periodNote_block1: 'الأزمة المالية العالمية، وثورة 2011 والاضطرابات التي تلتها.',
    periodName_block2: 'صعود طويل',
    periodNote_block2: 'تعويم الجنيه في 2016 وصعود هادئ في معظمه.',
    periodName_block3: 'صدمات',
    periodNote_block3: 'جائحة كورونا والحرب في أوكرانيا وتخفيضات الجنيه اللاحقة.',
    better: 'القاعدة كانت أفضل',
    worse: 'القاعدة كانت أسوأ',
    aYear: 'سنويًا',
    worstFall: 'أسوأ تراجع',
    falseInPeriod: 'الإنذارات الكاذبة في هذه السنوات: {n}',
    warnTitle: 'كل الإنذارات، {from}–{to}',
    warnSub: 'كل نقطة إنذار واحد في اليوم الذي بدأ فيه. الانهيار هنا يعني تراجع مؤشر EGX 30 بنسبة 18% على الأقل من قمته خلال 60 يوم تداول.',
    kind_crash: 'بداية انهيار',
    kind_early: 'قبل انهيار',
    kind_during: 'أثناء انهيار',
    kind_false: 'إنذار كاذب',
    kind_smaller: 'هبوط أصغر',
    kind_other: 'غير ذلك',
    kindNote_early: 'بدأ قبل بداية الانهيار',
    kindNote_during: 'بدأ بعد أن بدأ الهبوط',
    kindNote_false: 'لم يتبعه هبوط حقيقي',
    kindNote_smaller: 'تبعه هبوط أقل من 18%',
    warnPick: 'اضغط على نقطة أو مرّر المؤشر فوقها لقراءة الإنذار.',
    warnDetail: '{kind}: من {from} إلى {to}. في الأسابيع التالية لبدايته تراجع المؤشر حتى {mae} وارتفع حتى {mfe}.',
    warnCrash: 'مرتبط بـ: {name}.',
    warnList: 'عرض كل الإنذارات كقائمة',
    listBegan: 'البداية',
    listEnded: 'النهاية',
    listKind: 'النوع',
    listFell: 'أقصى تراجع للمؤشر',
    listRose: 'أقصى ارتفاع للمؤشر',
    crashTitle: 'كل انهيار على حدة',
    crashSub: 'أسوأ تراجع لكل محفظة خلال 60 يوم تداول بعد بداية كل انهيار.',
    crashIndex: 'المؤشر',
    crashRule: 'القاعدة',
    crashLead: 'إنذار مسبق: {n} يوم تداول',
    crashNoLead: 'بلا إنذار مسبق',
    crashSummary: 'تراجعت القاعدة أقل من المؤشر في {k} من {n} انهيارًا، وأكثر منه في {w}.',
    compareTitle: 'طرق أخرى لاستخدام الإنذار نفسه',
    compareSub: 'الإنذار نفسه، والعمولات نفسها، على مدى {years} سنة.',
    colApproach: 'الطريقة',
    colBecame: 'أصبحت 100,000 جنيه',
    colYear: 'سنويًا',
    colFall: 'أسوأ تراجع',
    thisPage: 'هذه الصفحة',
    sys_hold: 'الاحتفاظ بالمؤشر',
    sysNote_hold: 'بلا أي تحويل.',
    sys_s100: 'البيع مع الإنذار والعودة عند انتهائه',
    sysNote_s100: 'تعود إلى الأسهم بمجرد انطفاء الإنذار.',
    sys_rule: 'القاعدة في هذه الصفحة',
    sysNote_rule: 'أذون خزانة حتى يغلق المؤشر فوق متوسط آخر 20 يومًا.',
    sys_ladder: 'القاعدة مع العودة على مراحل',
    sysNote_ladder: 'تعود أيضًا ربعًا بعد ربع بعد تراجعات 15% و30% و45% و60%.',
    sys_partial: 'حماية جزئية',
    sysNote_partial: 'تنقل من 25% إلى 60% إلى أذون الخزانة حسب الذهب والبترول والتقلبات.',
    limitsTitle: 'ما لا يستطيع هذا الاختبار أن يخبرك به',
    limit1: 'هذا الاختبار ينظر إلى الماضي. اختيرت القاعدة بعد تجربة نسخ كثيرة على التاريخ نفسه، لذا قد يكون جزء من تفوّقها توافقًا مع الماضي لا مهارة تدوم.',
    limit2: 'يفترض أن كل تحويل نُفّذ بسعر افتتاح اليوم التالي مقابل عمولة 0.20%.',
    limit3: 'فائدة أذون الخزانة محسوبة قبل ضريبة الـ20% عليها. بعد خصم الضريبة تنتهي نسخة العودة على مراحل في اختبار البحث عند {taxed} بدلًا من {gross}.',
    limit4: 'الانهيار القادم لن يشبه تمامًا الانهيارات السابقة.',
    aboutTitle: 'عن هذه البيانات',
    aboutRun: 'آخر تشغيل للبحث: {date}. في ذلك اليوم كان الإنذار {state} وأغلق مؤشر EGX 30 عند {price}.',
    stateOn: 'قائمًا',
    stateOff: 'غير قائم',
    aboutNote: 'تعرض هذه الصفحة البحث كما شُغّل آخر مرة. لا تُحدَّث يوميًا، وليست إشارة للتصرّف.',
    researchersTitle: 'للباحثين',
    dlSeries: 'السلسلة اليومية لكل الطرق (JSON)',
    dlWarnings: 'كل الإنذارات (JSON)',
    dlTrades: 'كل تحويل، صفقة بصفقة (JSON)',
    dlNotebook: 'كل النماذج والجداول والرسوم، في أسفل هذه الصفحة',
    researchTitle: 'البحث الكامل',
    researchSub: 'كل النماذج والجداول والرسوم من تشغيلات البحث كما نُشرت، وبالإنجليزية. بعض الأرقام هناك محسوبة سنويًا على 250 يوم تداول أو مأخوذة من تشغيلات سابقة، لذا قد تختلف عن العرض أعلاه الذي يحسب كل رقم من السلسلة اليومية.',
    researchJump: 'انتقل مباشرةً إلى',
    jumpReading: 'كل مقاييس النموذج',
    jumpTable: 'جدول نتائج 18 سنة',
    jumpLab: 'مختبر السيناريوهات ورسم الثروة',
    jumpTrades: 'سجل الصفقات',
    jumpAttribution: 'من أين جاء العائد',
    jumpCrises: 'الأزمات الـ17',
    jumpQuant: 'المحاكي وتشريح الإنذارات الكاذبة وكل الإنذارات الـ76',
    legal: 'ESTHMR ناشر وغير مرخّص من الهيئة العامة للرقابة المالية. نحن لا نشتري ولا نبيع ولا نقدّم مشورة. لا شيء هنا توصية بالتعامل في أي ورقة مالية.',
    loading: 'جارٍ تحميل البحث…',
    failed: 'تعذّر تحميل بيانات البحث.',
    retry: 'حاول مرة أخرى',
    researchLoading: 'جارٍ تحميل البحث الكامل…',
    researchFailed: 'تعذّر تحميل البحث الكامل.',
  },
};

export const CRASH_NAMES_AR = {
  C12: 'الموجة الأولى للأزمة المالية 2008',
  C13: 'انهيار ليمان 2008',
  C14: 'توابع الأزمة المالية 2009',
  C15: 'تصحيح صيف 2009',
  C16: 'صدمة ديون دبي 2009',
  C17: 'أزمة منطقة اليورو 2010',
  C18: 'ثورة 25 يناير 2011',
  C19: 'التعديل الوزاري 2011',
  C20: 'خفض تصنيف أمريكا 2011',
  C21: 'تراجع ما قبل الانتخابات 2012',
  C22: 'الأزمة الدستورية 2012',
  C23: 'حرب أسعار أوبك 2015',
  C24: 'سقوط طائرة ميتروجيت 2015',
  C25: 'عدوى الأسواق الناشئة 2018',
  C26: 'جائحة كورونا 2020',
  C27: 'حرب أوكرانيا والتعويم 2022',
  C28: 'تصحيح ما بعد التعويم 2024',
};

export function t(lang, key, vars = {}) {
  const text = COPY[lang]?.[key] ?? COPY.en[key] ?? key;
  return text.replace(/\{(\w+)\}/g, (_, name) => (name in vars ? String(vars[name]) : `{${name}}`));
}

export const crashName = (crash, lang) => (lang === 'ar' && CRASH_NAMES_AR[crash.id]) || crash.name;

/* ── drawing ───────────────────────────────────────────────────────────── */

const SVG = 'http://www.w3.org/2000/svg';

const plainMoney = (value) => moneyParts(value, 'en')[0];

function el(tag, attrs, ...children) {
  const svg = tag.startsWith('svg:');
  const node = svg ? document.createElementNS(SVG, tag.slice(4)) : document.createElement(tag);
  for (const [name, value] of Object.entries(attrs || {})) {
    if (value === null || value === undefined || value === false) continue;
    if (name.startsWith('on') && typeof value === 'function') node.addEventListener(name.slice(2), value);
    else node.setAttribute(name, value === true ? '' : String(value));
  }
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

function moneyNode(value, lang) {
  const [digits, unit] = moneyParts(value, lang);
  return el('span', { class: 'fo-money' }, el('span', { class: 'fo-num', dir: 'ltr' }, digits), unit ? el('span', { class: 'fo-unit' }, unit) : null);
}

const numNode = (text) => el('span', { class: 'fo-num', dir: 'ltr' }, text);

const niceStep = (range, count) => {
  const raw = range / Math.max(1, count);
  const power = 10 ** Math.floor(Math.log10(raw));
  const unit = raw / power;
  return (unit >= 5 ? 10 : unit >= 2 ? 5 : unit >= 1 ? 2 : 1) * power;
};

/* Every column of pixels keeps its lowest and highest point, so a crash that
 * lasted a week still reaches its true trough on a 300-pixel phone chart. */
function thin(indices, values, buckets) {
  if (indices.length <= buckets * 2) return indices;
  const size = indices.length / buckets;
  const kept = [];
  for (let b = 0; b < buckets; b += 1) {
    const slice = indices.slice(Math.floor(b * size), Math.floor((b + 1) * size));
    if (!slice.length) continue;
    let lo = slice[0];
    let hi = slice[0];
    for (const i of slice) {
      if (values(i) < values(lo)) lo = i;
      if (values(i) > values(hi)) hi = i;
    }
    kept.push(...(lo < hi ? [lo, hi] : lo > hi ? [hi, lo] : [lo]));
  }
  if (kept[kept.length - 1] !== indices[indices.length - 1]) kept.push(indices[indices.length - 1]);
  return kept;
}

function growthChart(m, lang, range, host, readout) {
  const width = Math.max(300, Math.round(host.clientWidth || 720));
  const narrow = width < 560;
  const pad = { top: 14, right: narrow ? 58 : 76, bottom: 26, left: narrow ? 44 : 56 };
  const hTop = narrow ? 210 : 280;
  const hBottom = narrow ? 96 : 120;
  const gap = 28;
  const height = pad.top + hTop + gap + hBottom + pad.bottom;
  const s = m.series;
  const { from, to } = range;
  const base = (key) => (from > 0 ? s.value[key][from - 1] : 1);
  const val = (key, i) => (START_CAPITAL * s.value[key][i]) / base(key);
  const indices = [];
  for (let i = from; i <= to; i += 1) indices.push(i);
  const plotW = width - pad.left - pad.right;
  const x = (i) => pad.left + ((i - from) / Math.max(1, to - from)) * plotW;

  let top = START_CAPITAL;
  for (const i of indices) top = Math.max(top, val('rule', i), val('hold', i));
  const step = niceStep(top, narrow ? 3 : 4);
  const yMax = Math.ceil(top / step) * step;
  const y = (v) => pad.top + hTop - (v / yMax) * hTop;

  const peaks = { rule: base('rule'), hold: base('hold') };
  const draw = { rule: [], hold: [] };
  for (const i of indices) {
    for (const key of ['rule', 'hold']) {
      peaks[key] = Math.max(peaks[key], s.value[key][i]);
      draw[key][i] = s.value[key][i] / peaks[key] - 1;
    }
  }
  const ddTop = pad.top + hTop + gap;
  let deepest = -0.1;
  for (const i of indices) deepest = Math.min(deepest, draw.rule[i], draw.hold[i]);
  const ddStep = deepest < -0.5 ? 0.25 : 0.1;
  const ddMin = Math.floor(deepest / ddStep) * ddStep;
  const yd = (v) => ddTop + (v / ddMin) * hBottom;

  const buckets = Math.max(60, Math.floor(plotW / 1.5));
  const path = (key, fn, yFn) => thin(indices, (i) => fn(key, i), buckets)
    .map((i, n) => `${n ? 'L' : 'M'}${x(i).toFixed(1)},${yFn(fn(key, i)).toFixed(1)}`).join('');
  const valuePath = (key) => path(key, val, y);
  const ddPath = (key) => path(key, (k, i) => draw[k][i], yd);

  const svg = el('svg:svg', {
    viewBox: `0 0 ${width} ${height}`, width, height, class: 'fo-chart-svg', role: 'img',
    'aria-label': t(lang, 'chartAria', {
      rule: money(val('rule', to), lang), hold: money(val('hold', to), lang),
      from: month(s.dates[from], lang), to: month(s.dates[to], lang),
    }),
  });

  for (const [a, b] of warningSpans(s, from, to)) {
    svg.append(el('svg:rect', {
      x: x(a).toFixed(1), y: pad.top, width: Math.max(1, x(b + 1 > to ? to : b + 1) - x(a)).toFixed(1),
      height: hTop, class: 'fo-warn-band',
    }));
  }

  for (let v = 0; v <= yMax + 1; v += step) {
    svg.append(el('svg:line', { x1: pad.left, x2: width - pad.right, y1: y(v), y2: y(v), class: 'fo-grid' }));
    svg.append(el('svg:text', { x: pad.left - 8, y: y(v) + 4, class: 'fo-tick', 'text-anchor': 'end' }, plainMoney(v)));
  }
  for (let v = 0; v >= ddMin - 1e-9; v -= ddStep) {
    svg.append(el('svg:line', { x1: pad.left, x2: width - pad.right, y1: yd(v), y2: yd(v), class: v === 0 ? 'fo-axis' : 'fo-grid' }));
    svg.append(el('svg:text', { x: pad.left - 8, y: yd(v) + 4, class: 'fo-tick', 'text-anchor': 'end' }, `${Math.round(v * 100)}%`));
  }

  const firstYear = Number(s.dates[from].slice(0, 4));
  const lastYear = Number(s.dates[to].slice(0, 4));
  const every = (lastYear - firstYear) > 10 ? (narrow ? 4 : 2) : 1;
  for (let yr = firstYear + 1; yr <= lastYear; yr += 1) {
    if ((yr - firstYear) % every) continue;
    const i = s.dates.findIndex((d, k) => k >= from && d >= `${yr}-01-01`);
    if (i < 0 || i > to) continue;
    svg.append(el('svg:text', { x: x(i), y: height - 6, class: 'fo-tick', 'text-anchor': 'middle' }, String(yr)));
  }

  svg.append(el('svg:path', { d: `${ddPath('hold')}L${x(to).toFixed(1)},${yd(0).toFixed(1)}L${x(from).toFixed(1)},${yd(0).toFixed(1)}Z`, class: 'fo-dd-hold' }));
  svg.append(el('svg:path', { d: ddPath('rule'), class: 'fo-line-rule fo-thin' }));
  svg.append(el('svg:path', { d: valuePath('hold'), class: 'fo-line-hold' }));
  svg.append(el('svg:path', { d: valuePath('rule'), class: 'fo-line-rule' }));

  const endRule = y(val('rule', to));
  const endHold = y(val('hold', to));
  const apart = Math.abs(endRule - endHold) < 16 ? 16 - Math.abs(endRule - endHold) : 0;
  const ruleUp = endRule <= endHold;
  svg.append(el('svg:text', { x: width - pad.right + 6, y: endRule + 4 - (ruleUp ? apart / 2 : -apart / 2), class: 'fo-end fo-end-rule' }, plainMoney(val('rule', to))));
  svg.append(el('svg:text', { x: width - pad.right + 6, y: endHold + 4 + (ruleUp ? apart / 2 : -apart / 2), class: 'fo-end fo-end-hold' }, plainMoney(val('hold', to))));

  const cursor = el('svg:g', { class: 'fo-cursor', visibility: 'hidden' },
    el('svg:line', { y1: pad.top, y2: ddTop + hBottom, class: 'fo-cursor-line' }),
    el('svg:circle', { r: 4, class: 'fo-dot-rule' }),
    el('svg:circle', { r: 4, class: 'fo-dot-hold' }));
  svg.append(cursor);
  const [line, dotRule, dotHold] = cursor.children;

  const show = (i) => {
    const cx = x(i);
    line.setAttribute('x1', cx); line.setAttribute('x2', cx);
    dotRule.setAttribute('cx', cx); dotRule.setAttribute('cy', y(val('rule', i)));
    dotHold.setAttribute('cx', cx); dotHold.setAttribute('cy', y(val('hold', i)));
    cursor.setAttribute('visibility', 'visible');
    readout.replaceChildren(...[
      el('span', { class: 'fo-readout-date' }, day(s.dates[i], lang)),
      el('span', { class: 'fo-readout-item fo-c-rule' }, `${t(lang, 'ruleAt')} `, el('b', {}, moneyNode(val('rule', i), lang))),
      el('span', { class: 'fo-readout-item fo-c-hold' }, `${t(lang, 'indexAt')} `, el('b', {}, moneyNode(val('hold', i), lang))),
      s.alert[i] ? el('span', { class: 'fo-readout-warn' }, t(lang, 'legendWarn')) : null,
    ].filter(Boolean));
  };
  const hide = () => { cursor.setAttribute('visibility', 'hidden'); readout.replaceChildren(); };
  const pick = (event) => {
    const box = svg.getBoundingClientRect();
    const px = ((event.clientX - box.left) / box.width) * width;
    const share = Math.min(1, Math.max(0, (px - pad.left) / plotW));
    show(Math.round(from + share * (to - from)));
  };
  svg.addEventListener('pointermove', pick);
  svg.addEventListener('pointerdown', pick);
  svg.addEventListener('pointerleave', hide);
  return el('div', { class: 'fo-chart-wrap', dir: 'ltr' },
    svg,
    el('div', { class: 'fo-dd-label', dir: 'auto', style: `top:${ddTop - 21}px;left:${pad.left}px` }, t(lang, 'ddTitle')));
}

/* Labels sit beside the lanes where there is room and above them where there
 * is not; either way a lane is drawn at the width it is actually given, so a
 * dot is never stretched into an oval or pushed off the end. */
export const LANE_LABEL = 230;

function warningStrip(m, lang, host, detail) {
  const room = Math.round(host.clientWidth || 640);
  const side = room >= 760;
  host.classList.toggle('is-side', side);
  const width = Math.max(240, side ? room - LANE_LABEL - 16 : room);
  const s = m.series;
  const first = Date.parse(s.dates[0]);
  const last = Date.parse(s.dates[s.dates.length - 1]);
  const x = (date) => 8 + ((Date.parse(date) - first) / (last - first)) * (width - 16);
  const lanes = ['crash', ...KIND_ORDER];
  const laneH = 30;
  const rows = [];
  for (const lane of lanes) {
    const svg = el('svg:svg', { viewBox: `0 0 ${width} ${laneH}`, width, height: laneH, class: 'fo-lane-svg', 'aria-hidden': 'true' });
    svg.append(el('svg:line', { x1: 0, x2: width, y1: laneH / 2, y2: laneH / 2, class: 'fo-lane-line' }));
    if (lane === 'crash') {
      for (const crash of m.crashes) {
        const cx = x(crash.onset);
        svg.append(el('svg:path', { d: `M${cx - 5},${laneH / 2 - 6}L${cx + 5},${laneH / 2 - 6}L${cx},${laneH / 2 + 5}Z`, class: 'fo-crash-mark' }));
      }
    } else {
      for (const episode of m.episodes.filter((e) => kindOf(e) === lane)) {
        const dot = el('svg:circle', {
          cx: x(episode.start).toFixed(1), cy: laneH / 2, r: 5.5, class: `fo-kind-dot fo-k-${lane}`,
        });
        const say = () => {
          for (const other of host.querySelectorAll('.fo-kind-dot.is-picked')) other.classList.remove('is-picked');
          dot.classList.add('is-picked');
          const crash = m.crashes.find((c) => Number(String(c.id).replace(/\D/g, '')) === episode.crisis_id);
          detail.replaceChildren(
            el('span', { class: `fo-swatch fo-k-${lane}` }),
            el('span', {}, t(lang, 'warnDetail', {
              kind: t(lang, `kind_${lane}`), from: day(episode.start, lang), to: day(episode.end, lang),
              mae: iso(fall(Number(episode.mae) / 100)), mfe: iso(pct(Number(episode.mfe) / 100)),
            }), crash ? ` ${t(lang, 'warnCrash', { name: crashName(crash, lang) })}` : ''),
          );
        };
        dot.addEventListener('pointerenter', say);
        dot.addEventListener('pointerdown', say);
        svg.append(dot);
      }
    }
    const count = lane === 'crash' ? m.crashes.length : m.warnings[lane];
    rows.push(el('div', { class: 'fo-lane' },
      el('div', { class: 'fo-lane-label' },
        el('span', { class: `fo-swatch fo-k-${lane}` }),
        el('span', { class: 'fo-lane-name' }, t(lang, `kind_${lane}`)),
        el('b', { class: 'fo-lane-count', dir: 'ltr' }, whole(count)),
        lane === 'crash' ? null : el('span', { class: 'fo-lane-note' }, t(lang, `kindNote_${lane}`))),
      el('div', { class: 'fo-lane-plot' }, svg)));
  }
  const axis = el('svg:svg', { viewBox: `0 0 ${width} 18`, width, height: 18, class: 'fo-lane-svg', 'aria-hidden': 'true' });
  const y0 = Number(s.dates[0].slice(0, 4));
  const y1 = Number(s.dates[s.dates.length - 1].slice(0, 4));
  for (let yr = y0 + 1; yr <= y1; yr += width < 520 ? 4 : 2) {
    axis.append(el('svg:text', { x: x(`${yr}-01-01`), y: 13, class: 'fo-tick', 'text-anchor': 'middle' }, String(yr)));
  }
  rows.push(el('div', { class: 'fo-lane fo-lane-axis' }, el('div', { class: 'fo-lane-label' }), el('div', { class: 'fo-lane-plot' }, axis)));
  return rows;
}

export function mount(root, docs, options = {}) {
  const state = { lang: options.lang === 'en' ? 'en' : 'ar', range: 'full' };
  const m = model(docs.series, docs.episodes, docs.attribution);
  const links = options.links || {};

  const setLang = (lang) => {
    state.lang = lang;
    try { localStorage.setItem('esthmr:lang', lang); } catch { /* the choice is only lost */ }
    render();
  };

  function render() {
    const { lang } = state;
    const L = (key, vars) => t(lang, key, vars);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.title = L('docTitle');
    const full = m.full;
    const years1 = m.years.toFixed(1);

    const header = el('header', { class: 'fo-top' },
      el('a', { class: 'fo-brand', href: links.home || 'index.html' }, L('back')),
      el('span', { class: 'fo-top-name' }, L('pageName')),
      el('nav', { class: 'fo-top-links' },
        el('a', { href: links.notebook || '#research' }, L('notebook')),
        el('button', { type: 'button', class: 'fo-lang', lang: lang === 'ar' ? 'en' : 'ar', onclick: () => setLang(lang === 'ar' ? 'en' : 'ar') }, L('otherLang'))));

    const hero = el('section', { class: 'fo-hero' },
      el('p', { class: 'fo-eyebrow' }, L('eyebrow', { from: month(m.first, lang), to: month(m.last, lang) })),
      el('h1', { class: 'fo-title' }, L('title')),
      el('p', { class: 'fo-lede' }, L('lede', { days: iso(whole(m.sessions)) })),
      el('p', { class: 'fo-pill' }, L('notAdvice')));

    const figure = (label, main, mainNote, second, secondNote, tone) => el('div', { class: `fo-fig ${tone || ''}` },
      el('p', { class: 'fo-fig-label' }, label),
      el('p', { class: 'fo-fig-main' }, main, mainNote ? el('span', { class: 'fo-fig-note' }, mainNote) : null),
      el('p', { class: 'fo-fig-second' }, second, el('span', { class: 'fo-fig-note' }, secondNote)));

    const figures = el('section', { class: 'fo-figs', 'aria-label': L('chartTitle') },
      figure(L('figGrowth'), moneyNode(START_CAPITAL * full.rule.growth, lang), L('withRule'), moneyNode(START_CAPITAL * full.hold.growth, lang), L('holding')),
      figure(L('figFall'), numNode(fall(full.rule.worstFall, 0)), L('withRule'), numNode(fall(full.hold.worstFall, 0)), L('holding')),
      figure(L('figWarnings', { years: iso(years1) }), numNode(whole(m.warnings.total)), '', numNode(whole(m.warnings.false)), L('falseOfThem'), 'is-plain'));

    // The model's own reading on the last session of the run, from the
    // series' latest_live and nothing else.
    const reading = m.latest && Number.isFinite(m.latest.score) ? (() => {
      const r = m.latest;
      const two = (value) => Number(value).toFixed(2);
      const share = (value) => `${Math.max(0, Math.min(1, value)) * 100}%`;
      const meter = (value, line, tone) => el('span', { class: `fo-meter ${tone || ''}`, 'aria-hidden': 'true' },
        el('span', { class: 'fo-meter-fill', style: `--w:${share(value)}` }),
        el('span', { class: 'fo-meter-line', style: `--at:${share(line)}` }));
      const gauge = (label, value, extra, note) => el('div', { class: 'fo-gauge' },
        el('p', { class: 'fo-gauge-label' }, label),
        el('p', { class: 'fo-gauge-value' }, numNode(value)),
        extra,
        note ? el('p', { class: 'fo-gauge-note' }, note) : null);
      const mini = (label, value) => el('div', { class: 'fo-pair-row' },
        el('span', { class: 'fo-pair-who' }, label),
        el('span', { class: 'fo-bar-track' }, el('span', { class: 'fo-bar fo-c-rule', style: `--w:${share(value)}` })),
        el('b', { class: 'fo-num', dir: 'ltr' }, two(value)));
      const scale = 50;
      return el('section', { class: 'fo-panel fo-reading', id: 'model-reading', 'aria-labelledby': 'fo-reading-title' },
        el('div', { class: 'fo-panel-head' },
          el('div', {},
            el('h2', { id: 'fo-reading-title' }, L('readingTitle')),
            el('p', { class: 'fo-sub' }, L('readingSub', { date: day(r.date, lang) }))),
          el('p', { class: `fo-status ${r.on ? 'is-on' : 'is-off'}` },
            el('span', { class: 'fo-status-dot', 'aria-hidden': 'true' }),
            r.on ? L('readingOn') : L('readingOff'))),
        el('div', { class: 'fo-gauges' },
          gauge(L('readingScore'), two(r.score), meter(r.score, ALERT_LINE, r.on ? 'is-on' : ''),
            L('readingScoreNote', { line: iso(ALERT_LINE.toFixed(2)) })),
          gauge(L('readingOutside'), two(r.outside),
            el('div', { class: 'fo-minis' }, mini(L('readingGold'), r.gold), mini(L('readingOil'), r.oil), mini(L('readingSwings'), r.swings)),
            L('readingOutsideNote')),
          gauge(L('readingVol'), `${Number(r.vol20).toFixed(1)}%`, meter(r.vol20 / scale, VOL_BRAKE / scale, r.brake ? 'is-on' : ''),
            L('readingVolNote', { brake: iso(`${VOL_BRAKE}%`) })),
          el('div', { class: 'fo-gauge' },
            el('p', { class: 'fo-gauge-label' }, L('readingPlaces')),
            el('dl', { class: 'fo-places' },
              el('div', {}, el('dt', {}, L('readingRule')),
                el('dd', {}, L('readingRuleValue', { eq: iso(`${Math.round(r.equity)}%`), bills: iso(`${Math.round(100 - r.equity)}%`) }))),
              el('div', {}, el('dt', {}, L('readingPartial')),
                el('dd', {}, L('readingPartialValue', { p: iso(`${Number(r.partial).toFixed(1)}%`) }))),
              el('div', {}, el('dt', {}, L('readingIndex')),
                el('dd', {}, numNode(Number(r.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))))))),
        el('p', { class: 'fo-reading-foot' },
          el('span', {}, L('readingFoot')),
          el('a', { href: '#live-regime' }, L('readingMore'))));
    })() : null;

    const ranges = [{ id: 'full', from: 0, to: m.sessions - 1 }, ...m.periods];
    const current = ranges.find((r) => r.id === state.range) || ranges[0];
    const readout = el('div', { class: 'fo-readout', 'aria-live': 'polite' });
    const chartHost = el('div', { class: 'fo-chart-host' });
    const summary = el('p', { class: 'fo-period-summary' });
    const periodButtons = el('div', { class: 'fo-segment', role: 'group', 'aria-label': L('chartTitle') },
      ranges.map((r) => el('button', {
        type: 'button', class: 'fo-seg', 'aria-pressed': String(r.id === current.id),
        onclick: () => { state.range = r.id; drawChart(); },
      }, r.id === 'full' ? L('periodAll') : [
        el('span', { class: 'fo-seg-years', dir: 'ltr' }, `${m.series.dates[r.from].slice(0, 4)}–${m.series.dates[r.to].slice(0, 4)}`),
        el('span', { class: 'fo-seg-name' }, L(`period_${r.id}`)),
      ])));
    const drawChart = () => {
      const r = ranges.find((item) => item.id === state.range) || ranges[0];
      for (const button of periodButtons.children) button.setAttribute('aria-pressed', String(button === periodButtons.children[ranges.indexOf(r)]));
      chartHost.replaceChildren(growthChart(m, lang, r, chartHost, readout));
      const rule = stats(m.series, 'rule', r.from, r.to);
      const hold = stats(m.series, 'hold', r.from, r.to);
      summary.textContent = L('periodSummary', {
        from: month(m.series.dates[r.from], lang), to: month(m.series.dates[r.to], lang),
        r: iso(pct(rule.perYear)), h: iso(pct(hold.perYear)), rd: iso(fall(rule.worstFall)), hd: iso(fall(hold.worstFall)),
      });
      readout.replaceChildren();
    };

    const chart = el('section', { class: 'fo-panel fo-chart' },
      el('div', { class: 'fo-panel-head' },
        el('div', {}, el('h2', {}, L('chartTitle')), el('p', { class: 'fo-sub' }, L('chartSub'))),
        periodButtons),
      el('div', { class: 'fo-legend' },
        el('span', { class: 'fo-key' }, el('i', { class: 'fo-key-line fo-c-rule' }), L('legendRule')),
        el('span', { class: 'fo-key' }, el('i', { class: 'fo-key-line fo-c-hold' }), L('legendHold')),
        el('span', { class: 'fo-key' }, el('i', { class: 'fo-key-band' }), L('legendWarn')),
        readout),
      chartHost,
      summary);

    const step = (n, title, body) => el('li', { class: 'fo-step' },
      el('span', { class: 'fo-step-n', dir: 'ltr' }, String(n)),
      el('h3', {}, title),
      el('p', {}, body));
    const how = el('section', { class: 'fo-section' },
      el('h2', {}, L('howTitle')),
      el('ol', { class: 'fo-steps' },
        step(1, L('step1Title'), L('step1')),
        step(2, L('step2Title'), L('step2')),
        step(3, L('step3Title'), L('step3'))),
      el('p', { class: 'fo-foot' }, L('switches', {
        n: iso(whole(m.switches)), years: iso(years1), per: iso(Math.round(m.switches / m.years)),
      })));

    const barPair = (label, rule, hold, formatter, signed) => {
      const scale = Math.max(Math.abs(rule), Math.abs(hold), 1e-9);
      const bar = (value, cls) => el('span', { class: `fo-bar ${cls} ${signed && value < 0 ? 'is-neg' : ''}`, style: `--w:${(Math.abs(value) / scale) * 100}%` });
      return el('div', { class: 'fo-pair' },
        el('p', { class: 'fo-pair-label' }, label),
        el('div', { class: 'fo-pair-row' }, el('span', { class: 'fo-pair-who' }, L('legendRule')), el('span', { class: 'fo-bar-track' }, bar(rule, 'fo-c-rule')), el('b', { class: 'fo-num', dir: 'ltr' }, formatter(rule))),
        el('div', { class: 'fo-pair-row' }, el('span', { class: 'fo-pair-who' }, L('legendHold')), el('span', { class: 'fo-bar-track' }, bar(hold, 'fo-c-hold')), el('b', { class: 'fo-num', dir: 'ltr' }, formatter(hold))));
    };
    const periodCards = el('section', { class: 'fo-section' },
      el('h2', {}, L('periodsTitle')),
      el('p', { class: 'fo-sub' }, L('periodsSub')),
      el('div', { class: 'fo-periods' }, m.periods.map((p) => {
        const better = p.rule.perYear > p.hold.perYear;
        return el('article', { class: `fo-period ${better ? 'is-better' : 'is-worse'}` },
          el('p', { class: 'fo-period-years', dir: 'ltr' }, `${m.series.dates[p.from].slice(0, 4)}–${m.series.dates[p.to].slice(0, 4)}`),
          el('h3', {}, L(`periodName_${p.id}`)),
          el('p', { class: 'fo-period-note' }, L(`periodNote_${p.id}`)),
          el('p', { class: `fo-verdict ${better ? 'is-better' : 'is-worse'}` }, better ? L('better') : L('worse')),
          barPair(L('aYear'), p.rule.perYear, p.hold.perYear, (v) => pct(v), true),
          barPair(L('worstFall'), p.rule.worstFall, p.hold.worstFall, (v) => fall(v), false),
          el('p', { class: 'fo-foot' }, L('falseInPeriod', { n: iso(whole(p.warnings.false)) })));
      })));

    const detail = el('p', { class: 'fo-warn-detail', 'aria-live': 'polite' }, L('warnPick'));
    const laneHost = el('div', { class: 'fo-lanes' });
    const list = el('details', { class: 'fo-list' },
      el('summary', {}, L('warnList')),
      el('div', { class: 'fo-table-scroll' }, el('table', { class: 'fo-table' },
        el('thead', {}, el('tr', {}, [L('listBegan'), L('listEnded'), L('listKind'), L('listFell'), L('listRose')].map((h) => el('th', { scope: 'col' }, h)))),
        el('tbody', {}, m.episodes.map((e) => el('tr', {},
          el('td', {}, day(e.start, lang)),
          el('td', {}, day(e.end, lang)),
          el('td', {}, el('span', { class: `fo-swatch fo-k-${kindOf(e)}` }), t(lang, `kind_${kindOf(e)}`)),
          el('td', { class: 'fo-num', dir: 'ltr' }, fall(Number(e.mae) / 100)),
          el('td', { class: 'fo-num', dir: 'ltr' }, pct(Number(e.mfe) / 100))))))));
    const warnings = el('section', { class: 'fo-panel' },
      el('h2', {}, L('warnTitle', { from: m.first.slice(0, 4), to: m.last.slice(0, 4) })),
      el('p', { class: 'fo-sub' }, L('warnSub')),
      laneHost, detail, list);

    const deepest = Math.min(...m.crashes.map((c) => Math.min(c.index, c.rule)), -0.01);
    const crashRows = el('section', { class: 'fo-section' },
      el('h2', {}, L('crashTitle')),
      el('p', { class: 'fo-sub' }, L('crashSub')),
      el('p', { class: 'fo-callout' }, L('crashSummary', {
        k: iso(whole(m.crashesLess)), n: iso(whole(m.crashes.length)), w: iso(whole(m.crashesMore)),
      })),
      el('ol', { class: 'fo-crashes' }, m.crashes.map((c) => el('li', { class: `fo-crash ${c.rule < c.index ? 'is-worse' : ''}` },
        el('div', { class: 'fo-crash-head' },
          el('p', { class: 'fo-crash-date' }, day(c.onset, lang)),
          el('h3', {}, crashName(c, lang)),
          el('p', { class: 'fo-crash-lead' }, c.lead ? L('crashLead', { n: iso(whole(c.lead)) }) : L('crashNoLead'))),
        el('div', { class: 'fo-crash-bars' },
          ['index', 'rule'].map((who) => el('div', { class: 'fo-pair-row' },
            el('span', { class: 'fo-pair-who' }, who === 'index' ? L('crashIndex') : L('crashRule')),
            el('span', { class: 'fo-bar-track' }, el('span', { class: `fo-bar ${who === 'index' ? 'fo-c-hold' : 'fo-c-rule'}`, style: `--w:${(c[who] / deepest) * 100}%` })),
            el('b', { class: 'fo-num', dir: 'ltr' }, fall(c[who])))))))));

    const order = ['hold', 's100', 'rule', 'ladder', 'partial'];
    const compare = el('section', { class: 'fo-section' },
      el('h2', {}, L('compareTitle')),
      el('p', { class: 'fo-sub' }, L('compareSub', { years: iso(years1) })),
      el('div', { class: 'fo-table-scroll' }, el('table', { class: 'fo-table fo-compare' },
        el('thead', {}, el('tr', {}, [L('colApproach'), L('colBecame'), L('colYear'), L('colFall')].map((h) => el('th', { scope: 'col' }, h)))),
        el('tbody', {}, order.map((key) => el('tr', { class: key === 'rule' ? 'is-this' : '' },
          el('th', { scope: 'row' },
            el('span', { class: 'fo-sys-name' }, L(`sys_${key}`), key === 'rule' ? el('span', { class: 'fo-tag' }, L('thisPage')) : null),
            el('span', { class: 'fo-sys-note' }, L(`sysNote_${key}`))),
          el('td', { class: 'fo-cell-money' }, moneyNode(START_CAPITAL * full[key].growth, lang)),
          el('td', { class: 'fo-num', dir: 'ltr' }, pct(full[key].perYear)),
          el('td', { class: 'fo-num', dir: 'ltr' }, fall(full[key].worstFall))))))));

    const limits = el('section', { class: 'fo-section fo-limits' },
      el('h2', {}, L('limitsTitle')),
      el('ul', {},
        el('li', {}, L('limit1')),
        el('li', {}, L('limit2')),
        m.tax ? el('li', {}, L('limit3', { taxed: money(m.tax.taxed, lang), gross: money(m.tax.gross, lang) })) : null,
        el('li', {}, L('limit4'))));

    const about = el('section', { class: 'fo-about' },
      el('div', {},
        el('h2', {}, L('aboutTitle')),
        m.latest ? el('p', {}, L('aboutRun', {
          date: day(m.latest.date, lang), state: m.latest.on ? L('stateOn') : L('stateOff'), price: iso(m.latest.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })),
        })) : null,
        el('p', { class: 'fo-sub' }, L('aboutNote'))),
      el('div', {},
        el('h2', {}, L('researchersTitle')),
        el('ul', { class: 'fo-links' },
          el('li', {}, el('a', { href: links.series || 'backtest/world_monitor_simulation_series.json', download: '' }, L('dlSeries'))),
          el('li', {}, el('a', { href: links.episodes || 'backtest/c_v2_alert_episodes.json', download: '' }, L('dlWarnings'))),
          el('li', {}, el('a', { href: links.trades || 'backtest/executed_trades_history.json', download: '' }, L('dlTrades'))),
          el('li', {}, el('a', { href: links.notebook || '#research' }, L('dlNotebook'))))));

    // The notebook itself sits outside this root (a render here must not
    // throw it away), so this is only its door, in the reader's language.
    const jump = (href, label, onclick) => el('li', {}, el('a', { href, onclick }, label));
    const researchIntro = el('section', { class: 'fo-section fo-research-intro', 'aria-labelledby': 'fo-research-title' },
      el('h2', { id: 'fo-research-title' }, L('researchTitle')),
      el('p', { class: 'fo-sub' }, L('researchSub')),
      el('p', { class: 'fo-jump-label' }, L('researchJump')),
      el('ul', { class: 'fo-jumps' },
        jump('#live-regime', L('jumpReading')),
        jump('#executive-comparison', L('jumpTable')),
        jump('#scenarios-lab', L('jumpLab')),
        jump('#executedTradesSection', L('jumpTrades')),
        jump('#ladder-attribution-research', L('jumpAttribution')),
        jump('#crises', L('jumpCrises')),
        // Those three sit in the notebook's quantitative view.
        jump('#simulator', L('jumpQuant'), () => { if (typeof window.setPageMode === 'function') window.setPageMode('quant'); })));

    const footer = el('footer', { class: 'fo-legal' }, L('legal'));

    const main = el('main', { class: 'fo-main' }, hero, figures, reading, chart, how, periodCards, warnings, crashRows, compare, limits, researchIntro);
    if (options.end) {
      root.replaceChildren(header, main);
      options.end.replaceChildren(el('div', { class: 'fo-main fo-main-end' }, about), footer);
    } else {
      root.replaceChildren(header, main, el('div', { class: 'fo-main fo-main-end' }, about), footer);
    }
    drawChart();
    laneHost.replaceChildren(...warningStrip(m, lang, laneHost, detail));
  }

  render();
  let pending = 0;
  let lastWidth = root.clientWidth;
  window.addEventListener('resize', () => {
    if (pending || root.clientWidth === lastWidth) return;
    pending = requestAnimationFrame(() => {
      pending = 0;
      lastWidth = root.clientWidth;
      render();
    });
  });
  return m;
}

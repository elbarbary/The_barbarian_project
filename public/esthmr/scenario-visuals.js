/* The workbench's parts, in the order the screen reads them.
 *
 *   FUTURE · NOT SCORED YET     which ranking is on screen, three plain
 *                               numbers, the ranking itself, and the chosen
 *                               forecaster's view of the whole market;
 *   PAST RUNS · ALREADY SCORED  the record so far, night by night, and every
 *                               model against the market.
 *
 * The ranking is the model's own output, highest first, as the owner asked
 * for on 15 September: every company it ranked, the five its record follows
 * marked off, and each labelled model output and not a recommendation. After
 * Gemini, each row also says where the chosen model had that company.
 *
 * Inside the past runs, what a model SAID sits in a dashed chip and what a
 * company RETURNED in a solid one, so a forecast is never read as a result.
 */
import { React as R } from './react-shim.js';
import {
  finite, percent, points, plain, day, fanChart, histogram, divergeBar, nightsChart, summaryOf,
} from './ai-visuals.js';

const h = R.createElement;

export const title = (data, ticker, ar) => {
  const c = (data.companies || []).find((x) => x.ticker === ticker);
  return c?.name?.[ar ? 'ar' : 'en'] || c?.[ar ? 'nameAr' : 'nameEn'] || ticker;
};

const byTicker = (a, b) => (a.ticker < b.ticker ? -1 : a.ticker > b.ticker ? 1 : 0);
const tone = (v) => (!finite(v) ? 'quiet' : v > 0 ? 'up' : v < 0 ? 'down' : 'quiet');
const openCompany = (component, ticker) => () => component.setState({ screen: 'company', ticker, companyPanel: 'overview' });

/** All prices stay on the forecast's ORIGINAL basis, never today's quote. */
export function forecastPrices(company, model, horizon) {
  const saved = company?.models?.[model];
  const basis = saved?.basisClose ?? company?.close;
  const change = saved?.returns?.[String(horizon)];
  const point = finite(basis) && basis > 0 && finite(change) && change > -100
    ? basis * (1 + change / 100) : null;
  const path = saved?.pricePath;
  const complete = Array.isArray(path) && path.length >= horizon
    && path.slice(0, horizon).every((v) => finite(v) && v > 0);
  const window = complete ? path.slice(0, horizon) : [];
  return { basis, point, low: complete ? Math.min(...window) : null,
    high: complete ? Math.max(...window) : null,
    average: complete ? window.reduce((a, b) => a + b, 0) / window.length : null };
}

/** When a quote was read, as a reader in Cairo reads a clock: "17 Sep 2026 · 12:14 Cairo".
 *  The live feed stamps quotes in UTC, and the strip printed that stamp raw. */
export function quoteWhen(stamp, ar) {
  const text = String(stamp || '');
  if (!text) return '—';
  const at = text.length > 10 ? new Date(text) : null;
  if (!at || Number.isNaN(at.getTime())) return day(text, ar);
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(at).map((part) => [part.type, part.value]));
  return `${day(`${parts.year}-${parts.month}-${parts.day}`, ar)} · ${parts.hour}:${parts.minute} ${ar ? 'بتوقيت القاهرة' : 'Cairo'}`;
}

/**
 * One company's forecast window, as one picture.
 *
 * The row used to carry five loose figures in a grid — current, low, average,
 * high, end of window — and a reader had to hold four of them in their head
 * to see what the fifth meant. The redesign draws them instead: the band is
 * the lowest to the highest close the saved path reaches, the upright mark is
 * what the share costs now, and the dot is the average close.
 *
 * The band is NOT a confidence interval and the note under the card says so.
 * It is the range of a saved path, which is a different thing and a weaker
 * one: nothing here estimates how likely any of it is.
 */
function rangeBar(price, low, avg, high, ar) {
  const vals = [price, low, avg, high].filter(finite);
  if (vals.length < 4) return null;
  const lo = Math.min(price, low), hi = Math.max(price, high);
  const span = hi - lo || 1;
  const at = (v) => 42 + ((v - lo) / span) * 306;
  const fmt = (v) => plain(v, v < 1 ? 4 : 2);
  const round = (v) => Number(v.toFixed(2));
  // The price and the average can land on top of each other, and two labels
  // in the same place read as one wrong number. The second drops a line.
  const crowded = Math.abs(at(price) - at(avg)) < 52;
  return h('svg', {
    class: 'aix-range', viewBox: '0 0 390 62', dir: 'ltr', role: 'img',
    'aria-label': ar
      ? `السعر ${fmt(price)} · المسار المحفوظ من ${fmt(low)} إلى ${fmt(high)} · المتوسط ${fmt(avg)}`
      : `price ${fmt(price)} · saved path ${fmt(low)} to ${fmt(high)} · average ${fmt(avg)}`,
  },
  h('line', { x1: 8, y1: 28, x2: 382, y2: 28, class: 'aix-range-axis' }),
  h('rect', { x: round(at(low)), y: 22, width: round(at(high) - at(low)), height: 12, rx: 3, class: 'aix-range-band' }),
  h('line', { x1: round(at(price)), y1: 16, x2: round(at(price)), y2: 40, class: 'aix-range-now' }),
  h('circle', { cx: round(at(avg)), cy: 28, r: 5.5, class: 'aix-range-avg' }),
  h('text', { x: round(at(low)), y: 13, class: 'aix-range-edge', 'text-anchor': 'middle' }, fmt(low)),
  h('text', { x: round(at(high)), y: 13, class: 'aix-range-edge', 'text-anchor': 'middle' }, fmt(high)),
  h('text', { x: round(at(price)), y: 49, class: 'aix-range-price', 'text-anchor': 'middle' }, fmt(price)),
  h('text', { x: round(at(avg)), y: crowded ? 61 : 49, class: 'aix-range-mean', 'text-anchor': 'middle' }, fmt(avg)));
}

function priceStrip(company, model, horizon, basisDate, quote, ar) {
  const p = forecastPrices(company, model, horizon);
  const t = (en, arabic) => ar ? arabic : en;
  const hasQuote = finite(quote?.close) && quote.close > 0 && quote.quoteAsOf;
  const latest = hasQuote ? quote.close : company?.latestClose ?? company?.close;
  const date = hasQuote ? quoteWhen(quote.quoteAsOf, ar) : day(company?.latestSession || basisDate, ar);
  const price = (v) => finite(v) ? plain(v, v < 1 ? 4 : 2) : '—';
  // A low, an average and a high are read off the model's daily path. Runs
  // sealed before 17 Sep 2026 kept only the three endpoints, so for those
  // nights the three figures are left out and the strip says why, rather
  // than printing three dashes a reader takes for a fault.
  const pathSaved = finite(p.low) && finite(p.high) && finite(p.average);
  const cells = [[hasQuote ? t('Current price', 'السعر الحالي') : t('Latest saved close', 'آخر إغلاق محفوظ'), latest]];
  if (pathSaved) {
    cells.push([t('Predicted low', 'أدنى توقع'), p.low], [t('Average close', 'متوسط الإغلاق'), p.average],
      [t('Predicted high', 'أعلى توقع'), p.high]);
  }
  cells.push([t('End of window', 'نهاية المدة'), p.point]);
  // Why the night saved no path is said once, above the ranking. What is
  // particular to a company is said here.
  const why = finite(p.basis) ? null
    : t(`No close on ${day(basisDate)}: the company did not trade that session, so the price its forecast started from is not in this night’s file.`,
      `لا إغلاق يوم ${day(basisDate, true)}: لم تُتداول الشركة في تلك الجلسة، فسعر بداية توقعها غير موجود في ملف هذه الليلة.`);
  // With the whole path saved the row is the picture; without it there is
  // nothing to draw, and the two figures that DO exist are printed instead.
  const drawn = pathSaved ? rangeBar(latest, p.low, p.average, p.high, ar) : null;
  return h('span', { class: 'aix-price-detail' },
    drawn || h('span', { class: `aix-price-grid${pathSaved ? '' : ' is-short'}` },
      cells.map(([label, value]) => h('span', null, h('small', null, label), h('b', { dir: 'ltr' }, price(value))))),
    drawn ? h('small', { class: 'aix-price-caption' }, t(
      `The band is the lowest and highest close on the saved path, the mark is the price now, the dot is the average close. Not probability bounds. End of window ${price(p.point)}.`,
      `الشريط من أدنى إلى أعلى إغلاق على المسار المحفوظ، والعلامة هي السعر الآن، والنقطة متوسط الإغلاق. ليست حدود احتمال. نهاية المدة ${price(p.point)}.`)) : null,
    why ? h('small', { class: 'aix-price-caption' }, why) : null,
    h('small', { class: 'aix-price-caption' },
      `${quote?.currency || 'EGP'} · ${t('Price as of', 'السعر بتاريخ')} ${date || '—'} · ${t('Forecast basis', 'مرجع التوقع')} ${price(p.basis)} (${day(basisDate, ar)})`));
}

/** Arabic counts agree with their noun. */
const countAr = (n, one, two, few, many) => (n === 1 ? one : n === 2 ? two : n >= 3 && n <= 10 ? `${n} ${few}` : `${n} ${many}`);
/** "5 جلسات", "20 جلسة": a count of sessions, agreeing. */
const sessionsAr = (n) => countAr(n, 'جلسة واحدة', 'جلستين', 'جلسات', 'جلسة');

/**
 * A model's number in words that say what kind of number it is.
 *
 * A forecaster's is a return it expects; a momentum or reversal baseline's is
 * a move that ALREADY happened, which it ranks by (reversal's with the sign
 * turned back, so the figure is the fall itself); a reading's is a score.
 */
export function saidParts(says, value, ar) {
  const t = (en, arabic) => (ar ? arabic : en);
  const kind = says?.kind || 'return';
  const n = says?.sessions;
  if (!finite(value)) return { label: t('no figure', 'بلا رقم'), figure: '—', tone: 'quiet' };
  if (kind === 'score') return { label: t('score', 'الدرجة'), figure: `${plain(value, 0)}/100`, tone: 'quiet' };
  if (kind === 'momentum' || kind === 'reversal') {
    const move = kind === 'reversal' ? -value : value;
    return { label: n === 1 ? t('last session', 'الجلسة الأخيرة') : t(`last ${n} sessions`, `آخر ${sessionsAr(n)}`),
      figure: percent(move), tone: tone(move) };
  }
  return { label: t('expects', 'يتوقع'), figure: percent(value), tone: tone(value) };
}

/** A section rule: what the cards under it are, and when they are from. */
export function divider(id, label, note) {
  return h('div', { class: 'aix-divider', id },
    h('span', { class: 'aix-divider-label' }, label),
    h('i', { 'aria-hidden': 'true' }),
    note ? h('span', { class: 'aix-divider-note' }, note) : null);
}

function card(className, heading, sub, ...body) {
  return h('section', { class: `aix-card ${className || ''}` },
    h('header', null, h('div', null, h('h3', null, heading), sub ? h('p', null, sub) : null)),
    ...body);
}

export function tile(label, value, note, toneClass) {
  return h('div', { class: 'aix-tile' },
    h('span', { class: 'aix-eyebrow' }, label),
    h('strong', { class: `aix-tile-value ${toneClass || ''}`, dir: 'ltr' }, value),
    note ? h('p', null, note) : null);
}

/** A night's companies as chips. What they RETURNED sits in a solid chip;
 *  what the model SAID about them sits in a dashed one, so a forecast is
 *  never read as a result. */
function companyChips(component, data, picks, says, ar, returned) {
  return h('div', { class: 'aix-night-picks' }, [...(picks || [])].sort(byTicker).map((p) => {
    const parts = returned ? { figure: percent(p.returned), tone: tone(p.returned) } : saidParts(says, p.said, ar);
    return h('button', { key: p.ticker, type: 'button', class: `aix-pick-chip${returned ? '' : ' is-said'}`,
      onClick: openCompany(component, p.ticker), title: title(data, p.ticker, ar),
      'aria-label': `${p.ticker} · ${returned ? (ar ? 'حقق' : 'returned') : parts.label} ${parts.figure}` },
    h('b', null, p.ticker), h('span', { class: parts.tone, dir: 'ltr' }, parts.figure));
  }));
}

const listWords = (items, ar) => (items.length < 2 ? items.join('')
  : ar ? `${items.slice(0, -1).join('، ')} و${items.at(-1)}` : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`);

/* ── FUTURE: which ranking is on screen ─────────────────────────────────── */

/** Step one is the chosen model's ranking; step two is the same companies
 *  after Gemini re-ranks them. Both steps are buttons (the owner, 15 Sep
 *  2026): one press into Gemini's ranking with the reading Home reports, one
 *  press back. The context switches below still pick which reading it is. */
export function viewSwitch(component, ctx, ar, { onModel, onGemini } = {}) {
  const t = (en, arabic) => (ar ? arabic : en);
  const { choice, words } = ctx;
  const says = choice.meta?.says || { kind: 'return' };
  const by = says.kind === 'momentum'
    ? t(`how much each company rose over the last ${says.sessions} sessions`, `ارتفاع كل شركة خلال آخر ${sessionsAr(says.sessions)}`)
    : says.kind === 'reversal'
      ? t(says.sessions === 1 ? 'how much each company fell in the last session' : `how much each company fell over the last ${says.sessions} sessions`,
        says.sessions === 1 ? 'هبوط كل شركة في الجلسة الأخيرة' : `هبوط كل شركة خلال آخر ${sessionsAr(says.sessions)}`)
      : t(`what it expects each company to return over ${words.horizon}`, `ما يتوقعه لعائد كل شركة خلال ${words.horizon}`);
  return h('div', { class: 'aix-view' },
    h('div', { class: 'aix-view-switch', role: 'group', 'aria-label': t('What the ranking shows', 'ما يعرضه الترتيب') },
      h('button', { type: 'button', class: choice.gemini ? '' : 'on', 'aria-pressed': String(!choice.gemini), onClick: onModel },
        h('b', null, '1'), h('span', null, t(`Ranked by ${words.model}`, `ترتيب ${words.model}`))),
      h('i', { 'aria-hidden': 'true' }, ar ? '←' : '→'),
      h('button', { type: 'button', class: choice.gemini ? 'on' : '', 'aria-pressed': String(choice.gemini),
        disabled: !choice.readable, onClick: onGemini },
        h('b', null, '2'), h('span', null, t('Re-ranked by Gemini', 'بعد إعادة ترتيب Gemini')))),
    h('p', { class: 'aix-note' }, choice.gemini
      ? t(`Gemini combined all models with ${words.evidence}. Its score orders companies; it is not a percentage return or a probability. What ${words.model} said stays as it was.`,
        `جمع Gemini كل النماذج مع ${words.evidence}. درجته لترتيب الشركات وليست نسبة عائد أو احتمالاً. ما قاله ${words.model} يبقى كما هو.`)
      : t(`${words.model} ranks every company by ${by}.`, `${words.model} يرتّب كل الشركات حسب ${by}.`)),
    // Gemini is asked about five sessions only, so the horizon chips cannot
    // change its order — only what it is compared with and scored over.
    choice.gemini ? h('p', { class: 'aix-window-note' }, says.kind === 'return'
      ? t(`Gemini ranks for the next five sessions. Choosing ${words.horizon} changes ${words.model}’s forecasts and the window the record below is scored over — not Gemini’s order.`,
        `يرتّب Gemini للجلسات الخمس التالية. اختيار ${words.horizon} يغيّر توقعات ${words.model} والفترة التي يُقيَّم عليها السجل أدناه، لا ترتيب Gemini.`)
      : t(`Gemini ranks for the next five sessions. Choosing ${words.horizon} changes the window the record below is scored over — not Gemini’s order.`,
        `يرتّب Gemini للجلسات الخمس التالية. اختيار ${words.horizon} يغيّر الفترة التي يُقيَّم عليها السجل أدناه، لا ترتيب Gemini.`)) : null);
}

/** Said where a forecaster's numbers are mostly each company going back to
 *  its own recent average, measured that night (`publish.pull`). On 16 Sep
 *  2026 Kronos-small's 20-session forecasts correlated 0.95 with that move,
 *  which alone put its middle forecast near -10% after a rally. */
export function pullNote(ctx, ar) {
  const pull = ctx.pull;
  if (!pull) return null;
  const { words } = ctx;
  const r = h('bdi', { dir: 'ltr' }, pull.r.toFixed(2));
  const move = h('bdi', { dir: 'ltr' }, percent(pull.median));
  return h('p', { class: 'aix-note aix-pull-note', role: 'note' }, ar
    ? [`توقعات ${words.model} خلال ${words.horizon}، من هذا الإغلاق، تتبع رقماً واحداً تقريباً: الحركة التي تعيد كل شركة إلى متوسط سعرها خلال آخر ${sessionsAr(pull.sessions)} (معامل ارتباط `,
      r, ` عبر ${pull.companies} شركة، و1 يعني تطابقاً تاماً). للشركة في الوسط تبلغ هذه الحركة `, move,
      '. معظم ما يتوقعه هو هذه العودة إلى المتوسط، لا رؤية مستقلة لاتجاه الأسعار.']
    : [`${words.model}’s forecasts over ${words.horizon}, from this close, follow one number almost exactly: the move that would take each company back to its average price over the last ${pull.sessions} sessions (correlation `,
      r, ` across ${pull.companies} companies; 1 would mean exactly). For the middle company that move is `, move,
      '. Most of what it forecasts is that return to the average, not a separate view of where prices are heading.']);
}

const avg = (values) => (values.length ? values.reduce((s, v) => s + v, 0) / values.length : null);

/** Three plain numbers over the ranking — the same three places in both
 *  views, so Gemini's ranking reads like any model's. */
export function rankingTiles(ctx, ar) {
  const t = (en, arabic) => (ar ? arabic : en);
  const { choice, ranking, words, reading, said } = ctx;
  if (!ranking || !ranking.rows.length || (choice.gemini && !reading)) return null;
  const says = choice.meta?.says || { kind: 'return' };
  const move = (v) => (says.kind === 'reversal' ? -v : v);
  const top = ranking.rows.slice(0, 5);
  const topValues = top.map((r) => r.baseValue).filter(finite).map(move);
  const topFigure = avg(topValues);
  const first = says.kind === 'return'
    ? tile(choice.gemini ? t(`TOP 5 · ${words.model} EXPECTS`, `أعلى 5 · يتوقع ${words.model}`) : t('TOP 5 · EXPECTED', 'أعلى 5 · المتوقع'),
      percent(topFigure),
      choice.gemini
        ? t(`what ${words.model} expects for Gemini’s five, on average, over ${words.horizon}`, `ما يتوقعه ${words.model} لخمس Gemini في المتوسط خلال ${words.horizon}`)
        : t(`the five highest forecasts, on average, over ${words.horizon}`, `متوسط أعلى خمسة توقعات خلال ${words.horizon}`),
      tone(topFigure))
    : tile(t('TOP 5 · THEIR MOVE', 'أعلى 5 · حركتها'), percent(topFigure),
      says.kind === 'reversal'
        ? t(`their fall over the last ${says.sessions === 1 ? 'session' : `${says.sessions} sessions`}, on average`, `هبوطها خلال آخر ${sessionsAr(says.sessions)} في المتوسط`)
        : t(`their rise over the last ${says.sessions} sessions, on average`, `ارتفاعها خلال آخر ${sessionsAr(says.sessions)} في المتوسط`),
      tone(topFigure));
  if (choice.gemini) {
    const theirs = new Set(ranking.baseTop);
    const fresh = top.filter((r) => !theirs.has(r.ticker)).length;
    const count = Number.isInteger(reading?.count) ? reading.count : said?.count;
    return h('div', { class: 'aix-tiles' }, first,
      tile(t('NEW TO THE TOP 5', 'جديدة على أعلى 5'), `${fresh} / ${top.length}`,
        t(`companies in Gemini’s five that ${words.model} did not have in its own`, `شركات في خمس Gemini لم تكن في خمس ${words.model}`)),
      tile(t('GEMINI KEPT', 'أبقى Gemini'), Number.isInteger(count) ? String(count) : '—',
        Number.isInteger(count)
          ? t(`companies it said were worth anything, of the ${reading?.answered ?? ranking.rows.length} it scored`, `شركات قال إنها تستحق شيئاً، من ${reading?.answered ?? ranking.rows.length} قيّمها`)
          : t('it named no count that night', 'لم يحدد عدداً تلك الليلة')));
  }
  const whole = summaryOf(ranking.rows.map((r) => r.value).map(move)).median;
  return h('div', { class: 'aix-tiles' }, first,
    tile(says.kind === 'return' ? t('WHOLE MARKET · EXPECTED', 'السوق كله · المتوقع') : t('WHOLE MARKET · MOVE', 'السوق كله · الحركة'),
      percent(whole), t(`the middle of all ${ranking.rows.length} companies`, `الوسط بين ${ranking.rows.length} شركة`), tone(whole)),
    tile(t('COMPANIES RANKED', 'شركات مرتّبة'), String(ranking.rows.length),
      ctx.leftOut
        ? t(`${ctx.leftOut} left out of the current view: known OTC/delisted names, no exchange ticker, or broken price histories. Earlier records are not rewritten.`,
          `استُبعدت ${ctx.leftOut} من العرض الحالي: مشطوب أو خارج المقصورة، أو بلا رمز تداول، أو بسجل أسعار غير سليم. لا نعيد كتابة السجل السابق.`)
        : t('every company it had a number for in this run', 'كل شركة لديه رقم لها في هذا التشغيل')));
}

/** The ranking itself: every company, highest first, the five its record
 *  follows marked off, and — after Gemini — where the chosen model had each. */
export function rankingCard(component, data, ctx, ar) {
  const t = (en, arabic) => (ar ? arabic : en);
  const { choice, ranking, words, nights, reading, said } = ctx;
  const st = component.state;
  const says = choice.meta?.says || { kind: 'return' };
  const n = choice.horizon;

  if (ctx.loading) {
    return h('section', { class: 'aix-card aix-ranking-card', role: 'status' },
      h('h3', null, t('Loading the ranking…', 'جارٍ تحميل الترتيب…')),
      h('div', { class: 'sc-skeleton is-short', 'aria-hidden': 'true' }));
  }
  if (!ranking) {
    return h('section', { class: 'aix-card aix-ranking-card' },
      h('h3', null, t('The newest run has not loaded', 'لم يُحمَّل أحدث تشغيل')));
  }
  if (choice.gemini && !reading) {
    return h('section', { class: 'aix-card aix-ranking-card', role: ctx.readingFailed ? null : 'status' },
      h('h3', null, ctx.readingFailed ? t('Gemini’s ranking could not be fetched', 'تعذر جلب ترتيب Gemini')
        : t('Loading Gemini’s ranking…', 'جارٍ تحميل ترتيب Gemini…')),
      ctx.readingFailed ? h('p', { class: 'aix-note' }, ctx.readingFailed) : h('div', { class: 'sc-skeleton is-short', 'aria-hidden': 'true' }),
      ctx.readingFailed ? h('button', { type: 'button', class: 'aix-quiet', onClick: ctx.retry }, t('Try again', 'حاول مجدداً')) : null);
  }

  const q = String(st.scSearch || '').trim().toLowerCase();
  const rows = ranking.rows.filter((r) => !q || `${r.ticker} ${title(data, r.ticker, ar)}`.toLowerCase().includes(q));
  const limit = 10;
  const all = !!st.scShowAll;
  const shown = all || q ? rows : rows.slice(0, limit);
  const closed = nights.next?.sessionsClosed || 0;
  const scoredWhen = !nights.next
    ? t('once their window has closed', 'بعد إغلاق نافذتها')
    : n === 1 ? t('once the next session closes', 'بعد إغلاق الجلسة التالية')
      : t(`once ${n - closed} more ${n - closed === 1 ? 'session closes' : 'sessions close'}`, `بعد إغلاق ${sessionsAr(n - closed)} أخرى`);
  const move = (v) => (says.kind === 'reversal' ? -v : v);

  const valueHead = choice.gemini ? t('Gemini score', 'درجة Gemini')
    : says.kind === 'return' ? t(`Expects · ${n === 1 ? 'next session' : `${n} sessions`}`, `يتوقع · ${n === 1 ? 'الجلسة التالية' : sessionsAr(n)}`)
      : t(says.sessions === 1 ? 'Move · last session' : `Move · last ${says.sessions} sessions`, `الحركة · آخر ${sessionsAr(says.sessions)}`);
  const extraHead = choice.gemini ? t(`${words.model}: original rank & forecast`, `${words.model}: الترتيب والتوقع الأصليان`)
    : says.kind === 'return' ? t('Other models', 'النماذج الأخرى') : '';

  // The ranking's own night, once its window has closed. A company with no
  // close at the end of the window was passed over and the next one down
  // scored in its place, so the five the record scored are not always the
  // first five here: they are the ones marked, and the line falls under the
  // last of them. Before the window closes, nobody has been passed over yet.
  const own = nights.newest && nights.newest.basisSession === ctx.basis
    && nights.newest.status === 'scored' && Array.isArray(nights.newest.picks) ? nights.newest : null;
  const scoredFive = own ? new Set(own.picks.map((p) => p.ticker)) : null;
  const passed = new Set((own && own.skipped) || []);
  const scoredRanks = scoredFive ? ranking.rows.filter((r) => scoredFive.has(r.ticker)).map((r) => r.rank) : [];
  const lineAfter = scoredFive && scoredRanks.length === scoredFive.size ? Math.max(...scoredRanks) : 5;
  const top = (r) => (scoredFive && scoredRanks.length === scoredFive.size ? scoredFive.has(r.ticker) : r.rank <= 5);

  const cell = (r) => {
    const name = title(data, r.ticker, ar);
    const figure = choice.gemini ? `${plain(r.value, 0)}/100` : percent(move(r.value));
    let extra = null;
    if (choice.gemini) {
      const shift = finite(r.baseRank) && !r.baseTied && !r.scoreTied ? r.baseRank - r.rank : null;
      extra = h('span', { class: 'aix-rank-was' },
        h('bdi', { dir: 'ltr' }, finite(r.baseRank) ? `#${r.baseRank}` : '—'),
        finite(shift) && shift !== 0 ? h('em', { class: shift > 0 ? 'up' : 'down', dir: 'ltr' }, `${shift > 0 ? '▲' : '▼'}${Math.abs(shift)}`) : null,
        finite(r.baseValue) ? h('small', { dir: 'ltr', class: tone(move(r.baseValue)) },
          h('span', { class: 'aix-rank-origin-label' },
            says.kind === 'return' ? t('Forecast: ', 'التوقع: ') : t('Past move: ', 'الحركة السابقة: ')),
          percent(move(r.baseValue))) : null);
    } else if (says.kind === 'return') {
      /* How many of the other models point the same way, counted AND drawn.
         The count is the fact; the ticks are so a reader scanning ten rows
         can see which ones the models agree about without reading any of
         them. Filled is agreement, empty is a model that pointed elsewhere —
         never a model that had no figure, which is left out of `r.of`. */
      extra = r.of ? h('small', { class: 'aix-rank-agree' },
        h('span', { class: 'aix-agree-ticks', 'aria-hidden': 'true' },
          Array.from({ length: r.of }, (_, i) => h('i', { key: i, class: i < r.agree ? 'is-on' : '' }))),
        t(`${r.agree} of ${r.of} agree`, `${r.agree} من ${r.of} تتفق`)) : null;
    }
    const skipped = passed.has(r.ticker);
    return h('button', {
      key: r.ticker, type: 'button', class: `aix-rank-row${top(r) ? ' is-top' : ''}${skipped ? ' is-passed' : ''}`,
      onClick: openCompany(component, r.ticker),
      'aria-label': `${r.rank}. ${r.ticker} ${name !== r.ticker ? name : ''} · ${figure}${skipped ? t(' · did not trade', ' · لم تُتداول') : ''}`,
    },
    h('span', { class: 'aix-rank-n', dir: 'ltr' }, r.tied ? `=${r.rank}` : String(r.rank)),
    h('span', { class: 'aix-company-name' }, h('b', null, r.ticker), name !== r.ticker ? h('small', null, name) : null,
      skipped ? h('em', { class: 'aix-rank-passed' }, t('did not trade — passed over', 'لم تُتداول — تخطّاها السجل')) : null),
    h('strong', { class: choice.gemini ? '' : tone(move(r.value)), dir: 'ltr' }, figure),
    extra,
    says.kind === 'return' ? priceStrip(ctx.scenarios?.companies?.[r.ticker], choice.model, n,
      ctx.basis, data.companies?.find((c) => c.ticker === r.ticker), ar) : null,
    (ctx.scenarios?.companies?.[r.ticker]?.risk?.flags || []).length ? h('span', { class: 'aix-risk-note' },
      t('Risk context: ', 'سياق المخاطر: '),
      ar ? (ctx.scenarios.companies[r.ticker].risk.flagsAr || []).join(' · ')
        : ctx.scenarios.companies[r.ticker].risk.flags.join(' · '),
      (ctx.scenarios.companies[r.ticker].risk.events || []).map((event) =>
        h('small', null, ` · EGX #${event.id} · ${day(event.date, ar)}`))) : null);
  };

  const list = [];
  shown.forEach((r, i) => {
    list.push(cell(r));
    // The line under the five the record follows, where the list is whole.
    if (!q && r.rank === lineAfter && shown[i + 1]) {
      list.push(h('p', { key: 'cut', class: 'aix-rank-cut' }, ctx.venueExcluded
        ? t('Current view excludes known OTC/delisted shares. Its first five may differ from the original five in the unchanged historical record below.',
          'العرض الحالي يستبعد المشطوب وخارج المقصورة. أول خمس شركات هنا قد تختلف عن الخمس الأصلية في السجل التاريخي المحفوظ أدناه.')
        : passed.size
        ? t(`Above the line: the five its record scored. ${listWords([...passed], false)} did not trade through ${n === 1 ? 'the session' : `the ${n} sessions`}, so the next one down took ${passed.size === 1 ? 'its place' : 'each place'}.`,
          `فوق الخط: الخمس التي قيّمها السجل. ${listWords([...passed], true)} لم تُتداول طوال المدة، فحلّت التالية محلّ كل منها.`)
        : t(`Above the line: the five its record follows — scored against the market ${scoredWhen}.`,
          `فوق الخط: الخمس التي يتابعها السجل — تُقيَّم مقابل السوق ${scoredWhen}.`)));
    }
  });

  const note = choice.gemini ? (reading?.note || said?.note) : null;
  return h('section', { class: 'aix-card aix-ranking-card' },
    h('header', null,
      h('div', null,
        h('h3', null, choice.gemini
          ? t(`Ranked after Gemini re-reads ${words.model} and the other models`, `الترتيب بعد أن يعيد Gemini قراءة ${words.model} والنماذج الأخرى`)
          : t(`Ranked by ${words.model}`, `ترتيب ${words.model}`)),
        h('p', null, choice.gemini
          ? t('Saved Gemini scores, highest first, out of 100 — not expected returns. Check the dated record below for measured outcomes. Model output, not a recommendation.',
            'درجات Gemini المحفوظة، الأعلى أولاً، من 100 وليست عوائد متوقعة. راجع سجل النتائج المؤرخ أدناه. مخرجات نموذج وليست توصية.')
          : says.kind === 'return'
            ? t('Saved model forecasts, highest first — not realised returns. Check the dated record below for measured outcomes. Model output, not a recommendation.',
              'توقعات النموذج المحفوظة، الأعلى أولاً، وليست عوائد محققة. راجع سجل النتائج المؤرخ أدناه. مخرجات نموذج وليست توصية.')
            // A rule that ranks by a move already made: calling it a forecast
            // would say the opposite of the column beside it.
            : t('Ranked by a move that has already happened — this rule makes no forecast. Check the dated record below for how its top five did next. Model output, not a recommendation.',
              'مرتّبة حسب حركة حدثت بالفعل — هذه القاعدة لا تتوقع شيئاً. راجع السجل المؤرخ أدناه لترى كيف أدت الشركات الخمس الأولى بعدها. مخرجات نموذج وليست توصية.'))),
      h('label', { class: 'aix-search-label' },
        h('span', { class: 'aix-eyebrow' }, t('Find a company', 'ابحث عن شركة')),
        h('input', { class: 'aix-search', type: 'search', value: st.scSearch || '',
          placeholder: t('Name or ticker', 'الاسم أو الرمز'),
          onInput: (e) => component.setState({ scSearch: e.target.value }) }))),
    // Above the table, because it is what the order below was built on. Its
    // own sentence about the whole ranking, never a reason per company.
    choice.gemini ? h('div', { class: 'aix-said aix-reason' },
      h('span', { class: 'aix-eyebrow' }, t('In Gemini’s own words', 'بكلمات Gemini')),
      note ? h('blockquote', { class: 'aix-quote', dir: 'auto' }, note)
        : h('p', null, t('No explanation was saved for this reading. We do not invent one.', 'لم يُحفظ تفسير لهذه القراءة. لا نختلق تفسيراً.')),
      h('small', null, t('Gemini’s own summary of the whole ranking — not a checked reason for any one company.',
        'ملخص Gemini للترتيب كله، وليس سبباً موثّقاً لأي شركة بعينها.')),
      h('small', null, t('Price models cannot read company news. A high score is not proof of sound finances or a verified recovery. Known OTC/delisted names are excluded from this current view; historical records remain unchanged.',
        'نماذج الأسعار لا تقرأ أخبار الشركة. الدرجة المرتفعة ليست دليلاً على سلامة القوائم أو تعافٍ موثّق. نستبعد المشطوب وخارج المقصورة من العرض الحالي، ونحفظ السجل التاريخي كما هو.')),
      !reading?.riskContextRead ? h('small', null,
        t('This older reading predates the mandatory risk-context check. Any risk notes shown now were not necessarily read by Gemini.',
          'هذه القراءة أقدم من فحص المخاطر الإلزامي. ملاحظات المخاطر الظاهرة الآن لم يقرأها Gemini بالضرورة.')) : null) : null,
    says.kind === 'return' ? h('p', { class: 'aix-note' },
      Object.values(ctx.scenarios?.companies || {}).some((c) => Array.isArray(c?.models?.[choice.model]?.pricePath))
        ? t(`Price outlook · ${words.model} · ${words.horizon}. Low, average and high describe its predicted daily closes in this window—not probability bounds or intraday extremes. New quotes do not change a frozen forecast.`,
          `توقعات الأسعار · ${words.model} · ${words.horizon}. الأدنى والمتوسط والأعلى لإغلاقات النموذج اليومية خلال المدة، وليست حدود احتمال أو أسعاراً داخل الجلسة. الأسعار الجديدة لا تغيّر التوقع المحفوظ.`)
        : t(`Price outlook · ${words.model} · ${words.horizon}. This night’s run saved each forecast at 1, 5 and 20 sessions only, so each company shows today’s price and the price at the end of the window. A low, average and high are read off the model’s daily path, which runs save from 17 Sep 2026 on. New quotes do not change a frozen forecast.`,
          `توقعات الأسعار · ${words.model} · ${words.horizon}. حفظ تشغيل هذه الليلة كل توقع بعد 1 و5 و20 جلسة فقط، لذا تعرض كل شركة سعر اليوم والسعر في نهاية المدة. الأدنى والمتوسط والأعلى تُقرأ من المسار اليومي للنموذج، وتحفظه التشغيلات بدءاً من 17 سبتمبر 2026. الأسعار الجديدة لا تغيّر التوقع المحفوظ.`)) : null,
    choice.model === 'kronos' && ctx.scenarios && !Object.values(ctx.scenarios.companies || {})
      .some((c) => c.models?.kronos?.note?.includes('adapter v2')) ? h('p', { class: 'aix-note' },
      t('Legacy Kronos run: future timestamps used a Monday–Friday calendar. Corrected runs use Sunday–Thursday; the original forecast is retained for an honest record. Future holiday coverage remains unverified.',
        'تشغيل Kronos قديم: استُخدم تقويم الإثنين–الجمعة للتواريخ المستقبلية. التشغيل المصحح يستخدم الأحد–الخميس؛ نحفظ التوقع الأصلي لأمانة السجل. تغطية العطلات المستقبلية لم تُوثّق بعد.')) : null,
    rows.length ? h('div', { class: `aix-rank-head${choice.gemini ? ' is-gemini' : ''}`, 'aria-hidden': 'true' },
      h('span', null, '#'), h('span', null, t('Company', 'الشركة')), h('span', null, valueHead), h('span', null, extraHead)) : null,
    h('div', { class: `aix-rank-list${choice.gemini ? ' is-gemini' : ''}` }, list),
    choice.gemini && ranking.rows.some((r) => r.baseTied || r.scoreTied) ? h('p', { class: 'aix-note' },
      t('Equal scores are ordered by ticker. Movement arrows are hidden for tied scores so the alphabet is not mistaken for Gemini’s judgement.',
        'الدرجات المتساوية تُرتّب حسب الرمز. نخفي أسهم الحركة عند التعادل كي لا يُفهم الترتيب الأبجدي على أنه حكم Gemini.')) : null,
    !rows.length ? h('p', { class: 'aix-empty' }, q ? t('No company matches that.', 'لا شركة تطابق ذلك.')
      : t('This model ranked no company in this run.', 'لم يرتّب هذا النموذج أي شركة في هذا التشغيل.')) : null,
    rows.length > limit && !q ? h('button', { type: 'button', class: 'aix-more',
      onClick: () => component.setState({ scShowAll: !all }) },
    all ? t('Show the top 10', 'عرض أعلى 10') : t(`Show all ${rows.length} companies`, `عرض كل الشركات (${rows.length})`)) : null,
    nights.next?.tied ? h('p', { class: 'aix-note' }, t(`Fifth place was a tie with ${nights.next.tied} other ${nights.next.tied === 1 ? 'company' : 'companies'}; the record settles a tie alphabetically.`,
      `المركز الخامس تعادل مع ${countAr(nights.next.tied, 'شركة أخرى', 'شركتين أخريين', 'شركات أخرى', 'شركة أخرى')}؛ ويحسم السجل التعادل أبجدياً.`)) : null);
}

/* ── FUTURE: a forecaster's view of the whole market ────────────────────── */

export function returnsCards(component, data, view, words, ar) {
  const t = (en, arabic) => (ar ? arabic : en);
  const modelName = words.model;
  const { summary } = view;

  const fan = card('aix-fan-card',
    t(`${modelName} · company outlook · ${words.horizon}`, `${modelName} · توقعات الشركات · ${words.horizon}`),
    t('Not an EGX index forecast. Grey shows the companies’ average past move; the future line shows their median forecast. Bands show the middle 50% and 80% across companies—not confidence limits. The chart ends at your selected horizon.',
      'ليس توقعاً لمؤشر البورصة. الرمادي متوسط حركة الشركات السابقة؛ والخط المستقبلي وسيط توقعاتها. النطاقان يضمان 50% و80% الأوسط من الشركات، وليسا حدود ثقة. ينتهي الرسم عند المدة المختارة.'),
    h('div', { class: 'aix-legend' },
      h('span', null, h('i', { class: 'aix-key-band50' }), t('middle 50%', 'النصف الأوسط')),
      h('span', null, h('i', { class: 'aix-key-band80' }), t('middle 80%', '80% الأوسط')),
      h('span', null, h('i', { class: 'aix-key-past' }), t('before the close', 'قبل الإغلاق'))),
    fanChart({ past: view.past, ahead: view.ahead, horizons: view.horizons }, ar)
      || h('p', { class: 'aix-empty' }, t('This model gave no estimates for these companies.', 'لم يقدم هذا النموذج تقديرات لهذه الشركات.')),
    // Beside a line that is mostly a return to the average, what that return
    // alone would be (`pullNote` above the ranking says why).
    view.pull ? h('p', { class: 'aix-note aix-pull-compare' },
      t(`For comparison: going back to its average price over the last ${view.pull.sessions} sessions would be `,
        `للمقارنة: العودة إلى متوسط السعر خلال آخر ${sessionsAr(view.pull.sessions)} تعني `),
      h('bdi', { dir: 'ltr' }, percent(view.pull.median)),
      t(' for the middle company.', ' للشركة في الوسط.')) : null);

  const hist = card('aix-hist-card', t('Every estimate for this horizon', 'كل تقدير لهذه المدة'),
    t(`${summary.count} estimates across ${view.rows.length} companies · ${summary.up} above zero, ${summary.down} below`,
      `${summary.count} تقديراً عبر ${view.rows.length} شركة · ${summary.up} فوق الصفر و${summary.down} تحته`),
    histogram(view.rows.map((r) => r.value), { ar })
      || h('p', { class: 'aix-empty' }, t('Too few estimates to draw.', 'تقديرات أقل من أن تُرسم.')));

  const disagreeMax = Math.max(...view.byModel.map((m) => Math.abs(m.median || 0)), 0) * 1.1 || 1;
  const disagree = card('aix-disagree-card', t('Where the models disagree', 'أين تختلف النماذج'),
    t(`Every model’s middle estimate for the same companies, ${words.horizon} ahead.`,
      `التقدير الأوسط لكل نموذج للشركات نفسها، بعد ${words.horizon}.`),
    h('div', { class: 'aix-agree' }, view.byModel.map((m) => h('div', {
      key: m.id, class: `aix-agree-row${m.id === view.model ? ' is-selected' : ''}` },
    h('span', null, ar ? m.labelAr : m.label),
    divergeBar(m.median, disagreeMax),
    h('b', { class: tone(m.median), dir: 'ltr' }, percent(m.median))))));

  return [fan, h('div', { class: 'aix-pair' }, hist, disagree)];
}

/* ── PAST RUNS: the record so far ───────────────────────────────────────── */

export function recordCard(component, data, ctx, ar) {
  const t = (en, arabic) => (ar ? arabic : en);
  const { record, words } = ctx;
  if (ctx.loading) {
    return h('section', { class: 'aix-card aix-record-card', role: 'status' },
      h('h3', null, t('Loading the record…', 'جارٍ تحميل السجل…')),
      h('div', { class: 'sc-skeleton is-short', 'aria-hidden': 'true' }));
  }
  const nightsWord = (n) => (ar ? countAr(n, 'ليلة واحدة', 'ليلتين', 'ليالٍ', 'ليلة') : `${n} ${n === 1 ? 'night' : 'nights'}`);
  const stat = (label, value, note, toneClass) => h('div', { class: 'aix-record-stat' },
    h('span', { class: 'aix-eyebrow' }, label),
    h('strong', { class: toneClass || '', dir: 'ltr' }, value),
    h('small', null, note));
  const share = record.picksTotal ? Math.round((record.picksUp / record.picksTotal) * 100) : null;
  const small = record.sessions
    ? t(`${ctx.topCount || 5} companies a night over ${nightsWord(record.sessions)} is a small sample.`,
      `${ctx.topCount || 5} شركات في الليلة خلال ${nightsWord(record.sessions)} عيّنة صغيرة.`)
    : t('Nothing has been scored yet, and a missing result is not a zero.', 'لم يُقيَّم شيء بعد، والنتيجة الغائبة ليست صفراً.');
  const flipped = record.signChanges
    ? t(` Its lead over the market has changed sign ${record.signChanges} ${record.signChanges === 1 ? 'time' : 'times'}.`,
      ` تغيّرت إشارة تقدمه على السوق ${record.signChanges} مرة.`)
    : '';

  return h('section', { class: 'aix-card aix-record-card' },
    h('header', null, h('div', null,
      h('h3', null, t(`${words.view}, so far`, `${words.view} حتى الآن`)),
      h('p', null, t(`Its five against the market — every company it scored, equally weighted — over ${words.horizon}.`,
        `خمسته مقابل السوق — كل شركة قيّمها بأوزان متساوية — خلال ${words.horizon}.`)))),
    h('div', { class: 'aix-record-stats' },
      stat(t('VS THE MARKET', 'مقابل السوق'), record.enough ? points(record.meanAdvantage) : '—',
        record.enough
          ? t(`its five ${percent(record.meanReturn)}, the market ${percent(record.meanMarket)}, on average`,
            `خمسته ${percent(record.meanReturn)} والسوق ${percent(record.meanMarket)} في المتوسط`)
          : t(`an average needs ${record.minimum} scored nights; ${record.sessions} so far`,
            `المتوسط يحتاج ${record.minimum} ليالٍ مُقيَّمة؛ ${record.sessions} حتى الآن`),
        record.enough ? tone(record.meanAdvantage) : 'quiet'),
      stat(t('SESSIONS SCORED', 'جلسات مُقيَّمة'), String(record.sessions),
        record.sessions ? t(`its five were ahead of the market on ${record.ahead} of them`, `تفوقت خمسته على السوق في ${record.ahead} منها`)
          : t('no window has closed yet', 'لم تُغلق أي نافذة بعد')),
      stat(t('CALLS ABOVE ZERO', 'اختيارات فوق الصفر'), share === null ? '—' : `${share}%`,
        share === null ? t('no pick has finished its window', 'لم يُكمل أي اختيار نافذته')
          : t(`${record.picksUp} of ${record.picksTotal} picks finished up${record.partial ? ', newest nights listed' : ''}`,
            `${record.picksUp} من ${record.picksTotal} اختياراً انتهى مرتفعاً${record.partial ? '، في الليالي المعروضة' : ''}`))),
    h('p', { class: 'aix-record-foot' }, small + flipped));
}

/* ── PAST RUNS: night by night ──────────────────────────────────────────── */

function nightRow(component, data, night, ctx, ar) {
  const t = (en, arabic) => (ar ? arabic : en);
  const n = ctx.choice.horizon;
  const says = ctx.says;
  const rebuilt = night.reconstructed
    ? h('span', { class: 'aix-status is-rebuilt', title: t('Rebuilt later from saved files; it saw only prices up to that night.', 'أُعيد بناؤها لاحقاً من ملفات محفوظة؛ ولم ترَ إلا أسعاراً حتى تلك الليلة.') },
      t('REBUILT', 'أُعيد بناؤها')) : null;
  let status, body;
  if (night.status === 'scored') {
    const ahead = night.advantage > 0;
    status = h('span', { class: `aix-status ${ahead ? 'is-ahead' : 'is-behind'}` }, ahead ? t('▲ AHEAD', '▲ متقدم') : t('▼ BEHIND', '▼ متأخر'));
    body = [
      h('p', { class: 'aix-night-sum' },
        h('span', null, t('its five ', 'خمسته ')), h('b', { class: tone(night.chosenReturn), dir: 'ltr' }, percent(night.chosenReturn)),
        h('span', null, t(' · the market ', ' · السوق ')), h('b', { dir: 'ltr' }, percent(night.marketReturn)),
        h('span', null, ' · '), h('b', { class: ahead ? 'up' : 'down', dir: 'ltr' }, points(night.advantage))),
      companyChips(component, data, night.picks, says, ar, true),
      night.skipped && night.skipped.length
        ? h('p', { class: 'aix-note' }, t(`${listWords(night.skipped, false)} ranked higher but did not trade through the ${n === 1 ? 'session' : `${n} sessions`}, so the next one down was scored.`,
          `${listWords(night.skipped, true)} كانت أعلى ترتيباً لكنها لم تُتداول طوال المدة، فقُيّمت التالية.`)) : null,
    ];
  } else if (night.status === 'waiting') {
    const left = n - (night.sessionsClosed || 0);
    status = h('span', { class: 'aix-status is-waiting' }, t(`WAITING · ${night.sessionsClosed || 0} OF ${n}`, `بانتظار النتيجة · ${night.sessionsClosed || 0} من ${n}`));
    body = [h('p', { class: 'aix-night-sum' }, t(`Not scored yet — ${left} more ${left === 1 ? 'session' : 'sessions'} to go. What it ${says?.kind === 'return' ? 'expected' : 'ranked them by'}, not what happened:`,
      `لم تُقيَّم بعد — باقٍ ${countAr(left, 'جلسة واحدة', 'جلستان', 'جلسات', 'جلسة')}. ${says?.kind === 'return' ? 'ما توقعه' : 'ما رتّبها به'}، لا ما حدث:`)),
    companyChips(component, data, night.picks, says, ar, false)];
  } else if (night.status === 'withheld') {
    status = h('span', { class: 'aix-status' }, t('NOT COUNTED', 'لا تُحتسب'));
    body = [h('p', { class: 'aix-night-sum' }, t('Written after the session it is about had already closed, so it is not evidence and its companies are not listed.',
      'كُتبت بعد إغلاق الجلسة التي تخصها، فليست دليلاً ولا تُذكر شركاتها.'))];
  } else {
    status = h('span', { class: 'aix-status' }, t('COULD NOT BE SCORED', 'تعذر تقييمها'));
    body = [h('p', { class: 'aix-night-sum' }, t('Too few companies traded through the window to score it. What it said, not what happened:', 'تداولت شركات أقل من اللازم خلال المدة لتقييمها. ما قاله، لا ما حدث:')),
      companyChips(component, data, night.picks, says, ar, false)];
  }
  return h('li', { key: night.basisSession, class: `aix-night is-${night.status}` },
    h('div', { class: 'aix-night-when' }, h('b', null, h('bdi', null, day(night.basisSession, ar))), status, rebuilt),
    h('div', { class: 'aix-night-body' }, ...body));
}

export function nightsCard(component, data, ctx, ar) {
  const t = (en, arabic) => (ar ? arabic : en);
  const { choice, nights, record, words } = ctx;
  if (ctx.loading) return null;
  const n = choice.horizon;
  const scored = nights.earlier.filter((x) => x.status === 'scored');
  const all = !!component.state.scNightsAll;
  const limit = 6;
  const rows = all ? nights.earlier : nights.earlier.slice(0, limit);
  let empty = null;
  if (!record.sessions) {
    const waiting = [nights.next, ...nights.earlier].filter((x) => x && x.status === 'waiting')
      .sort((a, b) => ((n - (a.sessionsClosed || 0)) - (n - (b.sessionsClosed || 0))))[0];
    empty = h('p', { class: 'aix-empty' }, waiting
      ? t(`Nothing scored yet at ${words.horizon}. The first result comes once ${n - (waiting.sessionsClosed || 0)} more ${n - (waiting.sessionsClosed || 0) === 1 ? 'session closes' : 'sessions close'}, for the five from ${day(waiting.basisSession, false)}.`,
        `لا شيء مُقيَّم بعد عند ${words.horizon}. أول نتيجة بعد إغلاق ${sessionsAr(n - (waiting.sessionsClosed || 0))} أخرى، لخمس ${day(waiting.basisSession, true)}.`)
      : t(`Nothing scored yet at ${words.horizon}.`, `لا شيء مُقيَّم بعد عند ${words.horizon}.`));
  }
  const chart = scored.length ? nightsChart([...scored].reverse(), ar) : null;
  return h('section', { class: 'aix-card aix-nights-card' },
    h('header', null, h('div', null,
      h('h3', null, t('Night by night', 'ليلة بليلة')),
      h('p', null, t('Each night’s five, and what they returned against the market over the same window. Newest first; each night is its own window, not a running total.',
        'خمس كل ليلة، وما حققته مقابل السوق خلال النافذة نفسها. الأحدث أولاً؛ كل ليلة نافذة مستقلة، لا رصيد تراكمي.')))),
    empty,
    chart ? h('div', { class: 'aix-legend' },
      h('span', null, h('i', { class: 'aix-key-five' }), t('its five', 'خمسته')),
      h('span', null, h('i', { class: 'aix-key-market-dot' }), t('the market', 'السوق'))) : null,
    chart,
    rows.length ? h('ol', { class: 'aix-nights' }, rows.map((night) => nightRow(component, data, night, ctx, ar))) : null,
    nights.earlier.length > limit ? h('button', { type: 'button', class: 'aix-more',
      onClick: () => component.setState({ scNightsAll: !all }) },
    all ? t('Show fewer nights', 'عرض ليالٍ أقل') : t(`Show all ${nights.earlier.length} nights`, `عرض كل الليالي (${nights.earlier.length})`)) : null,
    nights.older ? h('p', { class: 'aix-note' }, t(`${nights.older} older ${nights.older === 1 ? 'night is' : 'nights are'} in the averages but not listed.`,
      `${nights.older} ليالٍ أقدم ضمن المتوسطات لكنها غير معروضة.`)) : null);
}

export function top5VsMarketChart(ctx, ar) {
  const t = (en, arabic) => (ar ? arabic : en);
  const { choice, ranking, words } = ctx;
  if (!ranking || !ranking.rows.length || choice.gemini) return null;
  const says = choice.meta?.says || { kind: 'return' };
  const move = (v) => (says.kind === 'reversal' ? -v : v);
  const top = ranking.rows.slice(0, 5);
  const topValues = top.map((r) => r.baseValue).filter(finite).map(move);
  const topFigure = avg(topValues);
  const whole = summaryOf(ranking.rows.map((r) => r.value).map(move)).median;
  if (!finite(topFigure) || !finite(whole)) return null;

  const maxAbs = Math.max(Math.abs(topFigure), Math.abs(whole), 4);
  const scale = 270 / maxAbs;
  const zeroX = 350;
  const topW = Math.max(Math.min(Math.abs(topFigure) * scale, 280), 4);
  const wholeW = Math.max(Math.min(Math.abs(whole) * scale, 280), 4);
  const topX = topFigure >= 0 ? zeroX : zeroX - topW;
  const wholeX = whole >= 0 ? zeroX : zeroX - wholeW;
  const topColor = topFigure >= 0 ? '#3F6B52' : '#A3402F';
  const wholeColor = whole >= 0 ? '#3F6B52' : '#A3402F';

  return h('section', { class: 'aix-card aix-compare-card' },
    h('header', null,
      h('span', { class: 'aix-compare-meta' },
        t(`Model forecast over ${words.horizon} · ${ranking.rows.length} companies with figures in this run`,
          `توقّع النموذج على ${words.horizon} · ${ranking.rows.length} شركة لها رقم في هذه الجولة`)),
      h('h3', null, t('Top 5 vs whole market', 'أعلى خمسة مقابل السوق كله'))),
    h('div', { class: 'aix-compare-graphic' },
      h('svg', { viewBox: '0 0 700 108', width: '100%', height: '108', style: { display: 'block', direction: 'ltr' } },
        h('line', { x1: zeroX, y1: 8, x2: zeroX, y2: 86, stroke: 'var(--ink, #192C3C)', 'stroke-width': 1.25 }),
        h('text', { x: zeroX, y: 102, fill: 'var(--faint, #607487)', 'font-size': 11, 'font-family': "'IBM Plex Mono', monospace", 'text-anchor': 'middle' }, '0%'),
        // Top 5 bar
        h('rect', { x: topX, y: 16, width: topW, height: 26, fill: topColor, rx: 4 }),
        h('text', {
          x: topFigure >= 0 ? topX + topW + 8 : topX - 8,
          y: 34, fill: topColor, 'font-size': 13, 'font-weight': 600,
          'font-family': "'IBM Plex Mono', monospace", 'text-anchor': topFigure >= 0 ? 'start' : 'end'
        }, percent(topFigure)),
        h('text', {
          x: topFigure >= 0 ? zeroX - 10 : zeroX + 10,
          y: 34, fill: 'var(--t2, #455B6E)', 'font-size': 12,
          'font-family': ar ? "'IBM Plex Sans Arabic', sans-serif" : "'IBM Plex Sans', sans-serif",
          'text-anchor': topFigure >= 0 ? 'end' : 'start'
        }, t('Top five', 'أعلى خمسة')),
        // Whole market bar
        h('rect', { x: wholeX, y: 52, width: wholeW, height: 26, fill: wholeColor, rx: 4 }),
        h('text', {
          x: whole >= 0 ? wholeX + wholeW + 8 : wholeX - 8,
          y: 70, fill: wholeColor, 'font-size': 13, 'font-weight': 600,
          'font-family': "'IBM Plex Mono', monospace", 'text-anchor': whole >= 0 ? 'start' : 'end'
        }, percent(whole)),
        h('text', {
          x: whole >= 0 ? zeroX - 10 : zeroX + 10,
          y: 70, fill: 'var(--t2, #455B6E)', 'font-size': 12,
          'font-family': ar ? "'IBM Plex Sans Arabic', sans-serif" : "'IBM Plex Sans', sans-serif",
          'text-anchor': whole >= 0 ? 'end' : 'start'
        }, t(`Whole market median (${ranking.rows.length})`, `وسيط الـ ${ranking.rows.length} شركة`)))),
    h('p', { class: 'aix-note' },
      t('Average of top 5 forecasts versus median of all companies, on the same horizon. Model figure, not realised return.',
        'متوسط أعلى خمسة توقعات مقابل وسيط كل الشركات، على نفس النافذة. رقم نموذج، وليس عائداً محققاً.')));
}

export function rerankComparisonCard(ctx, ar) {
  const t = (en, arabic) => (ar ? arabic : en);
  const { choice, ranking, words, reading } = ctx;
  if (!choice.gemini || !ranking || !ranking.rows.length || !reading) return null;
  const says = choice.meta?.says || { kind: 'return' };
  const move = (v) => (says.kind === 'reversal' ? -v : v);

  const geminiTop = ranking.rows.slice(0, 5);
  const modelTopTickers = ranking.baseTop || [];
  const modelTopRows = modelTopTickers.slice(0, 5).map((ticker, i) => {
    const r = ranking.rows.find((row) => row.ticker === ticker);
    return {
      rank: i + 1,
      ticker,
      name: r?.name || ticker,
      exp: r ? percent(move(r.baseValue)) : '—',
    };
  });

  const changedCount = geminiTop.filter((r) => r.baseRank !== r.rank).length;

  return h('section', { class: 'aix-card aix-rerank-card' },
    h('header', null,
      h('div', { class: 'aix-rerank-title-row' },
        h('h3', null, t('Re-rank effect', 'أثر إعادة الترتيب')),
        h('span', { class: 'aix-rerank-badge' }, t('Order only', 'الترتيب فقط'))),
      h('p', null,
        t(`Active context: ${words.evidence || 'selected layers'} · ${changedCount} positions moved`,
          `السياق المُشغَّل: ${words.evidence || 'الطبقات المختارة'} · ${changedCount} مواضع تغيّرت`))),
    h('div', { class: 'aix-rerank-cols' },
      h('div', { class: 'aix-rerank-col' },
        h('div', { class: 'aix-rerank-col-head' }, t(`Ranked by ${words.model}`, `كما رتّبها ${words.model}`)),
        modelTopRows.map((r) => h('div', { class: 'aix-rerank-row', key: r.ticker },
          h('span', { class: 'aix-rerank-pos' }, String(r.rank)),
          h('span', { class: 'aix-rerank-ticker' }, r.ticker),
          h('span', { class: 'aix-rerank-val' }, r.exp)))),
      h('div', { class: 'aix-rerank-arrow' }, h('span', null, ar ? '←' : '→')),
      h('div', { class: 'aix-rerank-col is-gemini' },
        h('div', { class: 'aix-rerank-col-head' }, t('After Gemini re-read', 'بعد إعادة قراءة Gemini')),
        geminiTop.map((r) => {
          const delta = finite(r.baseRank) ? r.baseRank - r.rank : 0;
          const deltaText = delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : (ar ? 'دون تغيير' : 'unchanged');
          const toneClass = delta > 0 ? 'is-up' : delta < 0 ? 'is-down' : 'is-flat';
          return h('div', { class: `aix-rerank-row ${toneClass}`, key: r.ticker },
            h('span', { class: 'aix-rerank-pos' }, String(r.rank)),
            h('span', { class: 'aix-rerank-ticker' }, r.ticker),
            h('span', { class: `aix-rerank-move ${toneClass}` }, deltaText));
        }))),
    h('p', { class: 'aix-note' },
      t('Re-ranking changes positions only, and never touches saved forecast prices.',
        'إعادة الترتيب تغيّر المواضع، ولا تمسّ الأسعار المتوقّعة المحفوظة.')));
}

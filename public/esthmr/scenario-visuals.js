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
        ? t(`every company with a clean price history; ${ctx.leftOut} left out — no exchange ticker, or gaps or impossible jumps in their prices`,
          `كل شركة لها سجل أسعار سليم؛ استُبعدت ${ctx.leftOut} — بلا رمز تداول، أو بفجوات أو قفزات مستحيلة في أسعارها`)
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
      extra = h('small', { class: 'aix-rank-agree' }, r.of ? t(`${r.agree} of ${r.of} agree`, `${r.agree} من ${r.of} تتفق`) : '');
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
    extra);
  };

  const list = [];
  shown.forEach((r, i) => {
    list.push(cell(r));
    // The line under the five the record follows, where the list is whole.
    if (!q && r.rank === lineAfter && shown[i + 1]) {
      list.push(h('p', { key: 'cut', class: 'aix-rank-cut' }, passed.size
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
        'ملخص Gemini للترتيب كله، وليس سبباً موثّقاً لأي شركة بعينها.'))) : null,
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
    t(`Where ${modelName} thinks the whole market goes`, `إلى أين يرى ${modelName} أن السوق كله يتجه`),
    t('Grey is what these companies did before the close. The line is the middle estimate after it; the bands hold the middle half and the middle 80% of the companies’ estimates — how far apart the companies are, not how sure the model is.',
      'الرمادي ما فعلته الشركات قبل الإغلاق. الخط هو التقدير الأوسط بعده؛ والنطاقان يضمان النصف الأوسط و80% الأوسط من تقديرات الشركات — أي مدى تباعد الشركات، لا مدى ثقة النموذج.'),
    h('div', { class: 'aix-legend' },
      h('span', null, h('i', { class: 'aix-key-band50' }), t('middle 50%', 'النصف الأوسط')),
      h('span', null, h('i', { class: 'aix-key-band80' }), t('middle 80%', '80% الأوسط')),
      h('span', null, h('i', { class: 'aix-key-past' }), t('before the close', 'قبل الإغلاق'))),
    fanChart({ past: view.past, ahead: view.ahead, horizons: view.horizons }, ar)
      || h('p', { class: 'aix-empty' }, t('This model gave no estimates for these companies.', 'لم يقدم هذا النموذج تقديرات لهذه الشركات.')));

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

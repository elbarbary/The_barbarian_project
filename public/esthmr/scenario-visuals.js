/* The workbench's parts, in the order the screen reads them.
 *
 *   FUTURE · NOT SCORED YET     the newest five, the whole market's numbers
 *                               and every company, from the newest close;
 *   PAST RUNS · ALREADY SCORED  the model's record so far, night by night,
 *                               and every model against the market.
 *
 * Lists of companies here are ALPHABETICAL, always — the five included.
 * Sorting named securities by what a model said about them turns a model's
 * output into a ranked list produced by this publisher, the line the whole
 * site is built not to cross. The model's number is on each row; the order of
 * the rows is the alphabet's.
 *
 * Inside the past runs, what a model SAID sits in a dashed chip and what a
 * company RETURNED in a solid one, so a forecast is never read as a result.
 */
import { React as R } from './react-shim.js';
import {
  finite, percent, points, plain, day, shortDay, fanChart, histogram, divergeBar, reorderChart, nightsChart,
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

/* ── FUTURE: the newest five ────────────────────────────────────────────── */

export function picksCard(component, data, ctx, ar) {
  const t = (en, arabic) => (ar ? arabic : en);
  const { choice, nights, said, words, next, indexed } = ctx;
  const n = choice.horizon;
  const says = choice.meta?.says;
  const when = next ? t(` The next run is scheduled for ${shortDay(next.date, false)} at ${next.time} Cairo time.`,
    ` التشغيل التالي مقرر ${shortDay(next.date, true)} الساعة ${next.time} بتوقيت القاهرة.`) : '';

  if (ctx.loading) {
    return h('section', { class: 'aix-card aix-picks-card', role: 'status' },
      h('h3', null, t('Loading the picks…', 'جارٍ تحميل الاختيارات…')),
      h('div', { class: 'sc-skeleton is-short', 'aria-hidden': 'true' }));
  }
  if (!nights.next) {
    const newest = nights.newest;
    const why = !ctx.entry
      ? t('No picks are published for this model yet.', 'لا اختيارات منشورة لهذا النموذج بعد.')
      : !newest
        ? t(`It has no five at ${words.horizon} yet.`, `ليس لديه خمس عند ${words.horizon} بعد.`)
        : newest.status === 'withheld'
          ? t(`Its newest five, from ${day(newest.basisSession, false)}, were written after the session they are about had already closed, so they are not counted at this horizon.`,
            `اختياراته الأحدث، من ${day(newest.basisSession, true)}، كُتبت بعد إغلاق الجلسة التي تخصها، فلا تُحتسب عند هذه المدة.`)
          : t(`Its newest five, from ${day(newest.basisSession, false)}, have already been scored — they are under past runs.`,
            `اختياراته الأحدث، من ${day(newest.basisSession, true)}، قُيّمت بالفعل — تجدها تحت التشغيلات السابقة.`);
    return h('section', { class: 'aix-card aix-picks-card' },
      h('h3', null, t(`No five waiting from ${words.model}`, `لا خمس بانتظار النتيجة من ${words.model}`)),
      h('p', { class: 'aix-note' }, why + when));
  }

  const night = nights.next;
  const five = [...night.picks].sort(byTicker);
  const closed = night.sessionsClosed || 0;
  const scoredWhen = n === 1
    ? t('once the next session closes', 'بعد إغلاق الجلسة التالية')
    : closed
      ? t(`once ${n - closed} more ${n - closed === 1 ? 'session closes' : 'sessions close'} (${closed} of ${n} have so far)`,
        `بعد إغلاق ${sessionsAr(n - closed)} أخرى (أُغلقت ${closed} من ${n} حتى الآن)`)
      : t(`once ${n} more sessions close`, `بعد إغلاق ${sessionsAr(n)} أخرى`);
  const back = says?.sessions;
  const these = says?.kind === 'score'
    ? t('These are its five highest scores, in alphabetical order.', 'هذه أعلى خمس درجات لديه، بترتيب أبجدي.')
    : says?.kind === 'momentum'
      ? t(`These five rose the most over the last ${back} sessions, in alphabetical order.`, `هذه الخمس الأكثر ارتفاعاً خلال آخر ${sessionsAr(back)}، بترتيب أبجدي.`)
      : says?.kind === 'reversal'
        ? (back === 1
          ? t('These five fell the most in the last session, in alphabetical order.', 'هذه الخمس الأكثر هبوطاً في الجلسة الأخيرة، بترتيب أبجدي.')
          : t(`These five fell the most over the last ${back} sessions, in alphabetical order.`, `هذه الخمس الأكثر هبوطاً خلال آخر ${sessionsAr(back)}، بترتيب أبجدي.`))
        : t('These are its five highest forecasts, in alphabetical order.', 'هذه أعلى خمسة توقعات لديه، بترتيب أبجدي.');

  const tiles = h('div', { class: 'aix-picks' }, five.map((p) => {
    const parts = saidParts(says, p.said, ar);
    const name = title(data, p.ticker, ar);
    return h('button', { key: p.ticker, type: 'button', class: 'aix-pick', onClick: openCompany(component, p.ticker),
      'aria-label': `${p.ticker} ${name !== p.ticker ? name : ''} · ${parts.label} ${parts.figure}` },
    h('b', null, p.ticker),
    name !== p.ticker ? h('small', null, name) : null,
    h('span', { class: 'aix-pick-said' }, h('em', null, parts.label), h('strong', { class: parts.tone, dir: 'ltr' }, parts.figure)));
  }));

  const extras = [];
  if (night.tied) {
    extras.push(h('p', { class: 'aix-note' }, t(`Fifth place was a tie with ${night.tied} other ${night.tied === 1 ? 'company' : 'companies'}; the record settles a tie alphabetically.`,
      `المركز الخامس تعادل مع ${countAr(night.tied, 'شركة أخرى', 'شركتين أخريين', 'شركات أخرى', 'شركة أخرى')}؛ ويحسم السجل التعادل أبجدياً.`)));
  }
  if (choice.model === 'rerank') {
    if (said && Number.isInteger(said.count)) {
      extras.push(h('p', { class: 'aix-note' }, t(`That night it also said ${said.count} ${said.count === 1 ? 'company was' : 'companies were'} worth anything. The record follows its five highest.`,
        `وقالت تلك الليلة أيضاً إن ${countAr(said.count, 'شركة واحدة تستحق', 'شركتين تستحقان', 'شركات تستحق', 'شركة تستحق')} شيئاً. السجل يتابع أعلى خمس.`)));
    }
    if (said && said.note) {
      extras.push(h('blockquote', { class: 'aix-quote', dir: 'auto' }, said.note));
    }
    if (choice.layers.length && ctx.plainNext) {
      const alone = new Set(ctx.plainNext.picks.map((p) => p.ticker));
      const changed = five.filter((p) => !alone.has(p.ticker)).length;
      extras.push(h('div', { class: 'aix-compare' },
        h('p', { class: 'aix-note' }, changed
          ? t(`What ${words.evidence} changed: reading the forecasts alone, it picked these five — ${changed} of the five above ${changed === 1 ? 'is' : 'are'} not among them.`,
            `ما غيّرته ${words.evidence}: بقراءة التوقعات وحدها اختار هذه الخمس — ${changed} من الخمس أعلاه ليست بينها.`)
          : t(`What ${words.evidence} changed: nothing in the five — reading the forecasts alone, it picked the same five.`,
            `ما غيّرته ${words.evidence}: لا شيء في الخمس — بقراءة التوقعات وحدها اختار الخمس نفسها.`)),
        changed ? companyChips(component, data, ctx.plainNext.picks, says, ar, false) : null));
    }
    if (indexed && !indexed.answered) {
      extras.push(h('p', { class: 'aix-note aix-warn' }, t('This combination did not answer that night.', 'هذه التركيبة لم تُجب تلك الليلة.')));
    }
  }

  return h('section', { class: 'aix-card aix-picks-card' },
    h('header', null, h('div', null,
      h('h3', null, t(`The five ${words.model} picked after the close of ${day(night.basisSession, false)}`,
        `الشركات الخمس التي اختارها ${words.model} بعد إغلاق ${day(night.basisSession, true)}`)),
      h('p', null, `${these} ${t(`They are scored against the market ${scoredWhen} — until then nobody knows how they do.`,
        `تُقيَّم مقابل السوق ${scoredWhen} — وحتى ذلك الحين لا أحد يعرف كيف ستؤدي.`)}`))),
    tiles,
    ...extras,
    h('p', { class: 'aix-fine' }, t('A model’s output, not a recommendation — published whether it turns out right or wrong.',
      'مخرجات نموذج، وليست توصية — تُنشر أياً كانت النتيجة.')));
}

/* ── FUTURE: a forecaster's view of the whole market ────────────────────── */

export function returnsTiles(view, words, ar) {
  const t = (en, arabic) => (ar ? arabic : en);
  const { summary } = view;
  const telling = view.byModel.filter((m) => m.distinguishes).length;
  return h('div', { class: 'aix-tiles' },
    tile(t('MIDDLE ESTIMATE', 'التقدير الأوسط'), percent(summary.median), t(
      `median of ${summary.count} estimates for ${words.horizon}`,
      `وسيط ${summary.count} تقديراً لـ${words.horizon}`), tone(summary.median)),
    tile(t('MODELS POINTING UP', 'نماذج تشير للصعود'), `${view.pointingUp} / ${telling}`,
      view.pointingUp * 2 > telling
        ? t('more expect a rise than a fall, at the middle', 'الأكثر يتوقع صعوداً عند الوسط')
        : t('they do not agree on direction', 'لا تتفق على الاتجاه')),
    tile(t('SPREAD, 10TH TO 90TH', 'النطاق من 10 إلى 90'), finite(summary.p90) && finite(summary.p10)
      ? `${(summary.p90 - summary.p10).toFixed(2)} pp` : '—',
    t('between the lower and upper tenth of the companies', 'بين العُشر الأدنى والعُشر الأعلى من الشركات')));
}

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

/* ── FUTURE: a re-rank reading of the whole market ──────────────────────── */

export function rerankTiles(view, words, ar) {
  const t = (en, arabic) => (ar ? arabic : en);
  const rho = (v) => (finite(v) ? `${v > 0 ? '+' : ''}${v.toFixed(2)}` : '—');
  return h('div', { class: 'aix-tiles' },
    tile(t('KEPT BY THE RE-RANK', 'أبقى عليها'), finite(view.count) ? `${view.keptInScope} / ${view.rows.length}` : '—',
      finite(view.count)
        ? t(`its own answer: ${view.count} of the ${view.answered} it scored are worth anything`, `إجابته: ${view.count} من ${view.answered} قيّمها تستحق شيئاً`)
        : t('it named no count that night', 'لم يحدد عدداً تلك الليلة')),
    tile(t('ORDER VS THE FORECASTERS', 'الترتيب مقابل النماذج'), rho(view.rhoForecasters),
      t('rank agreement with the forecasters’ middle estimate · 1 is the same order, 0 unrelated', 'اتفاق الترتيب مع التقدير الأوسط للنماذج · 1 نفس الترتيب و0 لا علاقة')),
    view.layers.length
      ? tile(t('WHAT THE EVIDENCE CHANGED', 'ما غيّرته الأدلة'), `${view.moved}`,
        t(`companies moved more than 20 places from the forecasts-alone reading · ${view.keptChanged} in or out of the kept set`,
          `شركة تحركت أكثر من 20 مركزاً عن قراءة النماذج وحدها · ${view.keptChanged} دخلت أو خرجت من المُبقاة`))
      : tile(t('WHAT IT READ', 'ما قرأه'), t('forecasts', 'التوقعات'),
        t('nothing else — switch on evidence to see what it changes', 'لا شيء غيرها — فعّل الأدلة لترى ما تغيّره')));
}

export function rerankCards(component, data, view, words, ar) {
  const t = (en, arabic) => (ar ? arabic : en);
  const rho = (v) => (finite(v) ? `${v > 0 ? '+' : ''}${v.toFixed(2)}` : '—');
  const scoredRows = view.rows.filter((r) => finite(r.score)).length;
  const lumped = view.setAside > 1 && view.setAside * 4 >= scoredRows
    ? t(` ${view.setAside} of them got 5 or less: it set much of the market aside rather than ordering it.`,
      ` ${view.setAside} منها حصلت على 5 أو أقل: وضع جزءاً كبيراً من السوق جانباً بدلاً من ترتيبه.`)
    : '';
  const scores = card('aix-hist-card', t('Every score it gave', 'كل درجة أعطاها'),
    (finite(view.threshold)
      ? t(`${scoredRows} companies scored 0–100. The line is the lowest score among the ${view.count} it said were worth anything.`,
        `${scoredRows} شركة بدرجات من 0 إلى 100. الخط أدنى درجة بين الـ${view.count} التي قال إنها تستحق شيئاً.`)
      : t(`${scoredRows} companies scored 0–100.`, `${scoredRows} شركة بدرجات من 0 إلى 100.`)) + lumped,
    histogram(view.rows.map((r) => r.score), { lo: 0, hi: 100, bins: 20, marker: view.threshold,
      markerLabel: finite(view.threshold) ? plain(view.threshold, 0) : null, colour: 'kept', ar })
      || h('p', { class: 'aix-empty' }, t('Too few scores to draw.', 'درجات أقل من أن تُرسم.')),
    h('ul', { class: 'aix-facts' },
      h('li', null, t(`Answered for ${view.answered} companies${view.abstained ? `, left out ${view.abstained}` : ''}.`,
        `أجاب عن ${view.answered} شركة${view.abstained ? ` وترك ${view.abstained}` : ''}.`)),
      view.invented && view.invented.length
        ? h('li', { class: 'aix-warn' }, t(`Named ${view.invented.length} tickers it was not asked about; they were dropped.`, `ذكر ${view.invented.length} رموز لم يُسأل عنها، فحُذفت.`))
        : null));

  if (!view.layers.length) return [scores];
  const reorder = card('aix-reorder-card',
    t(`How ${words.evidence} reordered it`, `كيف أعاد ${words.evidence} ترتيبه`),
    t('Each dot is a company: across, its place when the re-rank read the forecasts alone; up, its place with the evidence switched on. On the diagonal nothing moved.',
      'كل نقطة شركة: أفقياً مركزها حين قرأ التوقعات وحدها، ورأسياً مركزها مع الأدلة. على القطر لم يتحرك شيء.'),
    h('div', { class: 'aix-reorder-body' },
      reorderChart(view.pairs, ar) || h('p', { class: 'aix-empty' }, t('Too few companies to compare.', 'شركات أقل من أن تُقارن.')),
      h('dl', { class: 'aix-reorder-facts' },
        h('dt', null, t('order agreement', 'اتفاق الترتيب')), h('dd', { dir: 'ltr' }, rho(view.rhoModels)),
        h('dt', null, t('moved 20+ places', 'تحرك 20+ مركزاً')), h('dd', { dir: 'ltr' }, String(view.moved)),
        h('dt', null, t('companies compared', 'شركات مقارنة')), h('dd', { dir: 'ltr' }, String(view.pairs.length)))));
  return [reorder, scores];
}

/* ── FUTURE: company by company ─────────────────────────────────────────── */

export function companiesCard(component, data, ctx, ar) {
  const t = (en, arabic) => (ar ? arabic : en);
  const { choice, view, tickers, words } = ctx;
  const says = choice.meta?.says;
  const st = component.state;
  const five = new Set((ctx.nights.next?.picks || []).map((p) => p.ticker));
  const q = String(st.scSearch || '').trim().toLowerCase();
  const rows = (view?.rows || tickers.map((ticker) => ({ ticker })))
    .map((row) => ({ ...row, said: row.said ?? (choice.model === 'rerank' ? row.score
      : (() => {
        const entry = data.scenarios?.companies?.[row.ticker]?.models?.[choice.model];
        const hz = String(choice.horizon);
        return finite(entry?.rankedBy?.[hz]) ? entry.rankedBy[hz] : (finite(entry?.returns?.[hz]) ? entry.returns[hz] : null);
      })()) }))
    .filter((row) => !q || `${row.ticker} ${title(data, row.ticker, ar)}`.toLowerCase().includes(q));
  const limit = 12;
  const all = !!st.scShowAll;
  const shown = all || q ? rows : rows.slice(0, limit);

  // The scale is set by the 95th percentile of the numbers on the rows, not
  // by the single most extreme one; a range beyond it runs to the edge.
  const magnitudes = rows.flatMap((r) => [r.low, r.high, r.value]).filter(finite).map(Math.abs).sort((a, b) => a - b);
  const cMax = Math.max(magnitudes.length ? magnitudes[Math.floor((magnitudes.length - 1) * 0.95)] : 1, 1);
  const pos = (v) => Math.min(98, Math.max(2, 50 + (v / cMax) * 48));
  const kind = says?.kind || 'return';

  const sub = kind === 'score'
    ? t('Its score out of 100 for every company, and the forecasters’ middle estimate beside it.',
      'درجته من 100 لكل شركة، والتقدير الأوسط للنماذج بجانبها.')
    : kind === 'return'
      ? t(`The bar is the range every model allows over ${words.horizon}; the dot is ${words.model}’s estimate.`,
        `الشريط مدى ما تسمح به كل النماذج خلال ${words.horizon}، والنقطة تقدير ${words.model}.`)
      : t('The move it ranks every company by. It forecasts nothing.', 'الحركة التي يرتّب بها كل شركة. لا يتوقع شيئاً.');

  const row = (r) => {
    const parts = saidParts(says, r.said, ar);
    const badge = five.has(r.ticker) ? h('i', { class: 'aix-five-badge' }, t('IN ITS FIVE', 'ضمن الخمس')) : null;
    const name = h('span', { class: 'aix-company-name' }, h('b', null, r.ticker, badge), h('small', null, title(data, r.ticker, ar)));
    if (kind === 'score') {
      return h('button', { key: r.ticker, type: 'button', class: `aix-company-row is-score${five.has(r.ticker) ? ' is-five' : ''}`,
        onClick: openCompany(component, r.ticker), 'aria-label': `${r.ticker} ${parts.figure}` },
      name,
      h('strong', { dir: 'ltr' }, finite(r.score) ? plain(r.score, 0) : '—'),
      h('span', { class: 'aix-score', dir: 'ltr' },
        finite(r.score) ? h('b', { style: `width:${Math.max(Math.min(r.score, 100), 1).toFixed(1)}%` }) : null),
      h('small', { class: 'aix-company-note', dir: 'ltr' }, finite(r.consensus) ? percent(r.consensus) : ''));
    }
    if (kind === 'return') {
      return h('button', { key: r.ticker, type: 'button', class: `aix-company-row${five.has(r.ticker) ? ' is-five' : ''}`,
        onClick: openCompany(component, r.ticker), 'aria-label': `${r.ticker} ${parts.figure}` },
      name,
      h('strong', { class: tone(r.value), dir: 'ltr' }, percent(r.value)),
      h('span', { class: 'aix-range', dir: 'ltr' },
        h('i', { class: 'aix-centre' }),
        finite(r.low) && finite(r.high) ? h('em', { style: `left:${pos(Math.min(r.low, r.high)).toFixed(2)}%;width:${Math.max(pos(Math.max(r.low, r.high)) - pos(Math.min(r.low, r.high)), 1).toFixed(2)}%` }) : null,
        finite(r.value) ? h('b', { class: tone(r.value), style: `left:${pos(r.value).toFixed(2)}%` }) : null),
      h('small', { class: 'aix-company-note' }, r.of > 1 && finite(r.value)
        ? t(`${r.agree} of ${r.of} agree`, `${r.agree} من ${r.of} تتفق`)
        : t('no estimate', 'بلا تقدير')));
    }
    return h('button', { key: r.ticker, type: 'button', class: `aix-company-row is-plain${five.has(r.ticker) ? ' is-five' : ''}`,
      onClick: openCompany(component, r.ticker), 'aria-label': `${r.ticker} ${parts.figure}` },
    name,
    h('strong', { class: parts.tone, dir: 'ltr' }, parts.figure),
    h('small', { class: 'aix-company-note' }, parts.label));
  };

  return h('section', { class: 'aix-card aix-company-card' },
    h('header', null,
      h('div', null,
        h('h3', null, t('Company by company', 'شركة بشركة')),
        h('p', null, `${sub} ${t('Alphabetical, not an order of preference; its five are marked.', 'ترتيب أبجدي، لا ترتيب تفضيل؛ والخمس المختارة معلَّمة.')}`)),
      kind === 'return' ? h('span', { class: 'aix-legend-axis', dir: 'ltr' }, t('DOWN ◀ ▶ UP', 'هبوط ◀ ▶ صعود')) : null),
    h('label', { class: 'aix-search-label' },
      h('span', { class: 'aix-eyebrow' }, t('Find a company', 'ابحث عن شركة')),
      h('input', { class: 'aix-search', type: 'search', value: st.scSearch || '',
        placeholder: t('Name or ticker', 'الاسم أو الرمز'),
        onInput: (e) => component.setState({ scSearch: e.target.value }) })),
    h('div', { class: 'aix-company-list' }, shown.map(row)),
    !rows.length ? h('p', { class: 'aix-empty' }, t('No company matches that.', 'لا شركة تطابق ذلك.')) : null,
    rows.length > limit && !q ? h('button', { type: 'button', class: 'aix-more',
      onClick: () => component.setState({ scShowAll: !all }) },
    all ? t('Show fewer', 'عرض أقل') : t(`Show all ${rows.length} companies`, `عرض كل الشركات (${rows.length})`)) : null);
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
      h('h3', null, t(`${words.model}, so far`, `${words.model} حتى الآن`)),
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
  const says = ctx.choice.meta?.says;
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

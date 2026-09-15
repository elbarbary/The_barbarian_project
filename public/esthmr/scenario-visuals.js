/* The workbench's parts: the newest five, what the earlier fives did, and
 * every company behind them.
 *
 * Lists of companies here are ALPHABETICAL, always — the five included.
 * Sorting named securities by what a model said about them turns a model's
 * output into a ranked list produced by this publisher, the line the whole
 * site is built not to cross. The model's number is on each row; the order of
 * the rows is the alphabet's.
 *
 * Two looks, on purpose. What has not happened yet sits in a dashed card under
 * an amber "not known yet"; what already happened sits in a solid one with its
 * outcome in teal or red. A reader who only glances at the shape should still
 * not mistake one for the other.
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

function phase(label, pill, pillClass) {
  return h('div', { class: 'aix-phase' },
    h('span', { class: 'aix-phase-label' }, label),
    pill ? h('span', { class: `aix-phase-pill ${pillClass || ''}` }, pill) : null);
}

function card(className, heading, sub, ...body) {
  return h('section', { class: `aix-card ${className || ''}` },
    h('header', null, h('div', null, h('h3', null, heading), sub ? h('p', null, sub) : null)),
    ...body);
}

/** A night's companies as chips. What they RETURNED sits in a solid chip;
 *  what the model SAID about them sits in a dashed one, the look everything
 *  not yet known has on this screen, so a forecast is never read as a result. */
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

/* ── NEXT: the newest five ──────────────────────────────────────────────── */

export function nextCard(component, data, ctx, ar) {
  const t = (en, arabic) => (ar ? arabic : en);
  const { choice, nights, said, words, next, indexed } = ctx;
  const n = choice.horizon;
  const says = choice.meta?.says;
  const head = phase(
    t(n === 1 ? '→ THE NEXT SESSION' : `→ THE NEXT ${n} SESSIONS`, n === 1 ? '← الجلسة التالية' : `← الجلسات الـ${n} التالية`),
    t('NOT KNOWN YET', 'لم تُعرف بعد'), 'is-pending');
  const when = next ? t(` The next run is scheduled for ${shortDay(next.date, false)} at ${next.time} Cairo time.`,
    ` التشغيل التالي مقرر ${shortDay(next.date, true)} الساعة ${next.time} بتوقيت القاهرة.`) : '';

  if (ctx.loading) {
    return h('section', { class: 'aix-card aix-next', role: 'status' }, head,
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
          : t(`Its newest five, from ${day(newest.basisSession, false)}, have already been scored — they are under “Already happened”.`,
            `اختياراته الأحدث، من ${day(newest.basisSession, true)}، قُيّمت بالفعل — تجدها تحت «ما حدث بالفعل».`);
    return h('section', { class: 'aix-card aix-next' }, head,
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

  return h('section', { class: 'aix-card aix-next' }, head,
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

/* ── SO FAR: what the earlier fives did ─────────────────────────────────── */

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
    status = h('span', { class: 'aix-status is-waiting' }, t(`WAITING · ${night.sessionsClosed || 0} OF ${n}`, `بانتظار النتيجة · ${night.sessionsClosed || 0} من ${n}`));
    const left = n - (night.sessionsClosed || 0);
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

export function recordCard(component, data, ctx, ar) {
  const t = (en, arabic) => (ar ? arabic : en);
  const { choice, nights, record, words } = ctx;
  const n = choice.horizon;
  const head = phase(t('✓ ALREADY HAPPENED', '✓ ما حدث بالفعل'),
    t(`${record.sessions} SCORED`, `${record.sessions} مُقيَّمة`), 'is-done');
  if (ctx.loading) {
    return h('section', { class: 'aix-card aix-sofar', role: 'status' }, head,
      h('h3', null, t('Loading the record…', 'جارٍ تحميل السجل…')),
      h('div', { class: 'sc-skeleton is-short', 'aria-hidden': 'true' }));
  }

  const scored = nights.earlier.filter((x) => x.status === 'scored');
  const all = !!component.state.scNightsAll;
  const limit = 6;
  const rows = all ? nights.earlier : nights.earlier.slice(0, limit);

  let stats;
  if (!record.sessions) {
    const waiting = [nights.next, ...nights.earlier].filter((x) => x && x.status === 'waiting')
      .sort((a, b) => ((n - (a.sessionsClosed || 0)) - (n - (b.sessionsClosed || 0))))[0];
    stats = h('p', { class: 'aix-empty' }, waiting
      ? t(`Nothing scored yet at ${words.horizon}. The first result comes once ${n - (waiting.sessionsClosed || 0)} more ${n - (waiting.sessionsClosed || 0) === 1 ? 'session closes' : 'sessions close'}, for the five from ${day(waiting.basisSession, false)}.`,
        `لا شيء مُقيَّم بعد عند ${words.horizon}. أول نتيجة بعد إغلاق ${sessionsAr(n - (waiting.sessionsClosed || 0))} أخرى، لخمس ${day(waiting.basisSession, true)}.`)
      : t(`Nothing scored yet at ${words.horizon}.`, `لا شيء مُقيَّم بعد عند ${words.horizon}.`));
  } else {
    stats = h('dl', { class: 'aix-stats' },
      h('div', null, h('dt', null, t('Ahead of the market', 'متقدم على السوق')),
        h('dd', { dir: 'ltr' }, `${record.ahead}/${record.sessions}`),
        h('small', null, t(`nights its five beat the market`, `ليالٍ تفوقت فيها خمسته على السوق`))),
      h('div', null, h('dt', null, t('Its fives, on average', 'متوسط خمسته')),
        h('dd', { class: record.enough ? tone(record.meanReturn) : 'quiet', dir: 'ltr' }, record.enough ? percent(record.meanReturn) : '—'),
        h('small', null, record.enough ? t(`over ${words.horizon}, per night`, `خلال ${words.horizon}، لكل ليلة`)
          : t(`an average needs ${record.minimum} scored nights; ${record.sessions} so far`, `المتوسط يحتاج ${record.minimum} ليالٍ مُقيَّمة؛ ${record.sessions} حتى الآن`))),
      h('div', null, h('dt', null, t('The market, on average', 'متوسط السوق')),
        h('dd', { dir: 'ltr' }, record.enough ? percent(record.meanMarket) : '—'),
        h('small', null, record.enough ? t(`${points(record.meanAdvantage)} for its fives`, `${points(record.meanAdvantage)} لخمسته`)
          : t('shown with the average', 'يظهر مع المتوسط'))));
  }

  const chart = scored.length ? nightsChart([...scored].reverse(), ar) : null;
  return h('section', { class: 'aix-card aix-sofar' }, head,
    h('header', null, h('div', null,
      h('h3', null, t(`How ${words.model}’s earlier fives did over ${words.horizon}`, `كيف أدّت اختيارات ${words.model} السابقة خلال ${words.horizon}`)),
      h('p', null, t('Each night’s five, and what they returned against the market — every company the model scored that night, equally weighted. Not a running total: each night is its own window.',
        'خمس كل ليلة، وما حققته مقابل السوق — كل شركة قيّمها النموذج تلك الليلة بأوزان متساوية. ليس رصيداً تراكمياً: كل ليلة نافذة مستقلة.')))),
    stats,
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

/* ── behind the five: a forecaster's view of every company ──────────────── */

export function returnsCards(component, data, view, words, ar) {
  const t = (en, arabic) => (ar ? arabic : en);
  const modelName = words.model;

  const fan = card('aix-fan-card',
    t(`Where ${modelName} expects the whole market to go`, `إلى أين يتوقع ${modelName} أن يتجه السوق كله`),
    t('Grey is what these companies did before the close. The line is the middle forecast after it; the bands hold the middle half and the middle 80% of the companies’ forecasts — how far apart the companies are, not how sure the model is.',
      'الرمادي ما فعلته الشركات قبل الإغلاق. الخط هو التوقع الأوسط بعده؛ والنطاقان يضمان النصف الأوسط و80% الأوسط من توقعات الشركات — أي مدى تباعد الشركات، لا مدى ثقة النموذج.'),
    h('div', { class: 'aix-legend' },
      h('span', null, h('i', { class: 'aix-key-band50' }), t('middle 50%', 'النصف الأوسط')),
      h('span', null, h('i', { class: 'aix-key-band80' }), t('middle 80%', '80% الأوسط')),
      h('span', null, h('i', { class: 'aix-key-past' }), t('before the close', 'قبل الإغلاق'))),
    fanChart({ past: view.past, ahead: view.ahead, horizons: view.horizons }, ar)
      || h('p', { class: 'aix-empty' }, t('This model gave no forecasts for these companies.', 'لم يقدم هذا النموذج توقعات لهذه الشركات.')));

  const disagreeMax = Math.max(...view.byModel.map((m) => Math.abs(m.median || 0)), 0) * 1.1 || 1;
  const disagree = card('aix-disagree-card', t('Where the models disagree', 'أين تختلف النماذج'),
    t(`Every model’s middle forecast for the same companies, ${words.horizon} ahead.`,
      `التوقع الأوسط لكل نموذج للشركات نفسها، بعد ${words.horizon}.`),
    h('div', { class: 'aix-agree' }, view.byModel.map((m) => h('div', {
      key: m.id, class: `aix-agree-row${m.id === view.model ? ' is-selected' : ''}` },
    h('span', null, ar ? m.labelAr : m.label),
    divergeBar(m.median, disagreeMax),
    h('b', { class: tone(m.median), dir: 'ltr' }, percent(m.median))))));

  return [h('div', { class: 'aix-pair' }, fan, disagree)];
}

/* ── behind the five: a re-rank reading of every company ────────────────── */

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
      h('li', null, t(`Order against the forecasters’ middle forecast: ${rho(view.rhoForecasters)} (1 is the same order, 0 unrelated).`,
        `الترتيب مقابل التوقع الأوسط للنماذج: ${rho(view.rhoForecasters)} (1 الترتيب نفسه، 0 لا علاقة).`)),
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
  return [h('div', { class: 'aix-pair' }, scores, reorder)];
}

/* ── behind the five: every company, alphabetically ─────────────────────── */

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
    ? t('Its score out of 100 for every company, the bar beside it, and the forecasters’ middle forecast.',
      'درجته من 100 لكل شركة، مع شريطها، والتوقع الأوسط للنماذج.')
    : kind === 'return'
      ? t(`Its forecast for every company over ${words.horizon}. The bar spans every model’s forecast; the dot is ${words.model}’s.`,
        `توقعه لكل شركة خلال ${words.horizon}. الشريط يمتد عبر توقعات كل النماذج، والنقطة توقع ${words.model}.`)
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
        : t('no forecast', 'بلا توقع')));
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
        h('h3', null, t('Every company, alphabetically', 'كل الشركات، أبجدياً')),
        h('p', null, `${sub} ${t('Its five are marked.', 'الخمس المختارة معلَّمة.')}`)),
      h('label', { class: 'aix-search-label' },
        h('span', { class: 'aix-eyebrow' }, t('Find a company', 'ابحث عن شركة')),
        h('input', { class: 'aix-search', type: 'search', value: st.scSearch || '',
          placeholder: t('Name or ticker', 'الاسم أو الرمز'),
          onInput: (e) => component.setState({ scSearch: e.target.value }) }))),
    h('div', { class: 'aix-company-list' }, shown.map(row)),
    !rows.length ? h('p', { class: 'aix-empty' }, t('No company matches that.', 'لا شركة تطابق ذلك.')) : null,
    rows.length > limit && !q ? h('button', { type: 'button', class: 'aix-more',
      onClick: () => component.setState({ scShowAll: !all }) },
    all ? t('Show fewer', 'عرض أقل') : t(`Show all ${rows.length} companies`, `عرض كل الشركات (${rows.length})`)) : null);
}

/* The workbench's parts: who is asked about, and what the answer looks like.
 *
 * Lists of companies here are ALPHABETICAL, always. Sorting a list of named
 * securities by what a model said about them turns a model's output into a
 * ranked list produced by this publisher — the line the whole site is built
 * not to cross. The model's number is on each row; the order of the rows is
 * the alphabet's.
 */
import { React as R } from './react-shim.js';
import {
  finite, percent, plain, summaryOf, fanChart, histogram, divergeBar, reorderChart,
} from './ai-visuals.js';

const h = R.createElement;

export const title = (data, ticker, ar) => {
  const c = (data.companies || []).find((x) => x.ticker === ticker);
  return c?.name?.[ar ? 'ar' : 'en'] || c?.[ar ? 'nameAr' : 'nameEn'] || ticker;
};

/* ── who is asked about ─────────────────────────────────────────────────── */

export function companyPicker(component, data, scenarios, ar) {
  const t = (en, arabic) => (ar ? arabic : en);
  const st = component.state;
  const chosen = st.scTickers || [];
  const q = String(st.scSearch || '').trim().toLowerCase();
  const matches = Object.keys(scenarios.companies || {}).sort()
    .filter((ticker) => (`${ticker} ${title(data, ticker, ar)}`).toLowerCase().includes(q));
  const limit = st.scPickerLimit || 24;
  return h('div', { class: 'sc-picker' },
    h('label', { for: 'sc-company-search' }, t('Search by company or ticker', 'ابحث باسم الشركة أو رمزها')),
    h('input', { id: 'sc-company-search', type: 'search', value: st.scSearch || '',
      placeholder: t('Company name or ticker…', 'اسم الشركة أو رمزها…'),
      onInput: (e) => component.setState({ scSearch: e.target.value, scPickerLimit: 24 }) }),
    h('div', { class: 'sc-picked' }, chosen.map((ticker) => h('button', {
      key: ticker, type: 'button', 'aria-label': t(`Remove ${ticker}`, `إزالة ${ticker}`),
      onClick: () => component.setState({ scTickers: chosen.filter((x) => x !== ticker) }),
    }, `${ticker} ×`))),
    h('div', { class: 'sc-picker-list' }, matches.slice(0, limit).map((ticker) => h('button', {
      key: ticker, type: 'button', 'aria-pressed': String(chosen.includes(ticker)),
      onClick: () => component.setState({
        scTickers: chosen.includes(ticker) ? chosen.filter((x) => x !== ticker) : [...chosen, ticker],
      }),
    }, h('b', null, ticker), h('span', null, title(data, ticker, ar)),
    h('i', { 'aria-hidden': 'true' }, chosen.includes(ticker) ? '✓' : '+')))),
    !matches.length ? h('p', { class: 'aix-note' }, t('No matching company. Try another name.', 'لا توجد شركة مطابقة. جرّب اسماً آخر.')) : null,
    matches.length > limit ? h('button', { type: 'button', class: 'aix-more',
      onClick: () => component.setState({ scPickerLimit: limit + 24 }) },
    t(`Show more · ${matches.length} matches`, `عرض المزيد · ${matches.length} نتيجة`)) : null,
    h('p', { class: 'aix-note' }, t(`${chosen.length} selected.`, `${chosen.length} مختارة.`)));
}

export function savedRulePicker(component, ar) {
  const t = (en, arabic) => (ar ? arabic : en);
  const questions = component._questions || [];
  return h('div', { class: 'sc-rule-picker' },
    h('label', { for: 'sc-rule' }, t('Use a saved question', 'استخدم سؤالاً محفوظاً')),
    h('select', { id: 'sc-rule',
      onChange: (e) => component.setState({ scRule: questions.find((q) => q.id === e.target.value) || null }) },
    h('option', { value: '', selected: !component.state.scRule?.id }, t('Choose your question', 'اختر سؤالك')),
    questions.map((q) => h('option', { key: q.id, value: q.id, selected: q.id === component.state.scRule?.id },
      q.name || t('Saved question', 'سؤال محفوظ')))),
    h('button', { type: 'button', class: 'aix-more', onClick: () => component.setState({ screen: 'questions' }) },
      t('Create or edit a question ↗', 'أنشئ سؤالاً أو عدّله ↗')));
}

/* ── small parts ────────────────────────────────────────────────────────── */

export function tile(label, value, note, tone) {
  return h('div', { class: 'aix-tile' },
    h('span', { class: 'aix-eyebrow' }, label),
    h('strong', { class: `aix-tile-value ${tone || ''}`, dir: 'ltr' }, value),
    note ? h('p', null, note) : null);
}

function card(className, heading, sub, ...body) {
  return h('section', { class: `aix-card ${className || ''}` },
    h('header', null, h('div', null, h('h3', null, heading), sub ? h('p', null, sub) : null)),
    ...body);
}

const tone = (v) => (!finite(v) ? 'quiet' : v > 0 ? 'up' : v < 0 ? 'down' : 'quiet');

function showMore(component, rows, ar) {
  const t = (en, arabic) => (ar ? arabic : en);
  const limit = 12;
  const all = !!component.state.scShowAll;
  return {
    shown: all ? rows : rows.slice(0, limit),
    control: rows.length > limit ? h('button', { type: 'button', class: 'aix-more',
      onClick: () => component.setState({ scShowAll: !all }) },
    all ? t('Show fewer', 'عرض أقل') : t(`Show all ${rows.length} companies`, `عرض كل الشركات (${rows.length})`)) : null,
  };
}

/* ── a forecaster's answer ──────────────────────────────────────────────── */

export function returnsResults(component, data, view, words, ar) {
  const t = (en, arabic) => (ar ? arabic : en);
  const { summary } = view;
  const modelName = words.model;
  const scope = words.scope;

  const tiles = h('div', { class: 'aix-tiles' },
    tile(t('MIDDLE ESTIMATE', 'التقدير الأوسط'), percent(summary.median), t(
      `median of ${summary.count} estimates for ${words.horizon}`,
      `وسيط ${summary.count} تقديراً لـ${words.horizon}`), tone(summary.median)),
    tile(t('MODELS POINTING UP', 'نماذج تشير للصعود'), `${view.pointingUp} / ${view.byModel.filter((m) => m.distinguishes).length}`,
      view.pointingUp * 2 > view.byModel.filter((m) => m.distinguishes).length
        ? t('more expect a rise than a fall, at the middle', 'الأكثر يتوقع صعوداً عند الوسط')
        : t('they do not agree on direction', 'لا تتفق على الاتجاه')),
    tile(t('SPREAD, 10TH TO 90TH', 'النطاق من 10 إلى 90'), finite(summary.p90) && finite(summary.p10)
      ? `${(summary.p90 - summary.p10).toFixed(2)} pp` : '—',
    t('between the lower and upper tenth of the companies', 'بين العُشر الأدنى والعُشر الأعلى من الشركات')));

  const fan = card('aix-fan-card',
    t(`Where ${modelName} thinks ${scope} goes`, `إلى أين يرى ${modelName} ${scope}`),
    t('Grey is what these companies did before the close. The line is the middle estimate after it; the bands hold the middle half and the middle 80% of the companies’ estimates — how far apart the companies are, not how sure the model is.',
      'الرمادي ما فعلته الشركات قبل الإغلاق. الخط هو التقدير الأوسط بعده؛ والنطاقان يضمان النصف الأوسط و80% الأوسط من تقديرات الشركات — أي مدى تباعد الشركات، لا مدى ثقة النموذج.'),
    h('div', { class: 'aix-legend' },
      h('span', null, h('i', { class: 'aix-key-band50' }), t('middle 50%', 'النصف الأوسط')),
      h('span', null, h('i', { class: 'aix-key-band80' }), t('middle 80%', '80% الأوسط')),
      h('span', null, h('i', { class: 'aix-key-past' }), t('before the close', 'قبل الإغلاق'))),
    fanChart({ past: view.past, ahead: view.ahead, horizons: view.horizons }, ar)
      || h('p', { class: 'aix-empty' }, t('This model gave no estimates for this selection.', 'لم يقدم هذا النموذج تقديرات لهذا الاختيار.')));

  const hist = card('aix-hist-card', t('Every estimate it produced', 'كل تقدير أنتجه'),
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

  const rows = view.rows;
  // The scale is set by the 95th percentile of the numbers on the rows, not
  // by the single most extreme one; a range beyond it runs to the edge.
  const magnitudes = rows.flatMap((r) => [r.low, r.high, r.value]).filter(finite).map(Math.abs).sort((a, b) => a - b);
  const cMax = Math.max(magnitudes.length ? magnitudes[Math.floor((magnitudes.length - 1) * 0.95)] : 1, 1);
  const pos = (v) => Math.min(98, Math.max(2, 50 + (v / cMax) * 48));
  const { shown, control } = showMore(component, rows, ar);
  const companies = card('aix-company-card', t('Company by company', 'شركة بشركة'),
    t(`The bar spans every model’s estimate for the company; the dot is ${modelName}’s. Alphabetical — not an order of preference.`,
      `الشريط يمتد عبر تقديرات كل النماذج للشركة، والنقطة تقدير ${modelName}. ترتيب أبجدي، لا ترتيب تفضيل.`),
    h('div', { class: 'aix-company-list' }, shown.map((r) => h('button', {
      key: r.ticker, type: 'button', class: 'aix-company-row',
      onClick: () => component.setState({ screen: 'company', ticker: r.ticker, companyPanel: 'overview' }),
      'aria-label': `${r.ticker} ${percent(r.value)}`,
    },
    h('span', { class: 'aix-company-name' }, h('b', null, r.ticker), h('small', null, title(data, r.ticker, ar))),
    h('strong', { class: tone(r.value), dir: 'ltr' }, percent(r.value)),
    h('span', { class: 'aix-range', dir: 'ltr' },
      h('i', { class: 'aix-centre' }),
      finite(r.low) && finite(r.high) ? h('em', { style: `left:${pos(Math.min(r.low, r.high)).toFixed(2)}%;width:${Math.max(pos(Math.max(r.low, r.high)) - pos(Math.min(r.low, r.high)), 1).toFixed(2)}%` }) : null,
      finite(r.value) ? h('b', { class: tone(r.value), style: `left:${pos(r.value).toFixed(2)}%` }) : null),
    h('small', { class: 'aix-company-note' }, r.of > 1 && finite(r.value)
      ? t(`${r.agree} of ${r.of} agree`, `${r.agree} من ${r.of} تتفق`)
      : t('no estimate', 'بلا تقدير'))))),
    control);

  return [tiles, fan, h('div', { class: 'aix-pair' }, hist, disagree), companies];
}

/* ── a re-rank reading ──────────────────────────────────────────────────── */

export function rerankResults(component, data, view, words, ar) {
  const t = (en, arabic) => (ar ? arabic : en);
  const rho = (v) => (finite(v) ? `${v > 0 ? '+' : ''}${v.toFixed(2)}` : '—');

  const tiles = h('div', { class: 'aix-tiles' },
    tile(t('KEPT BY THE RE-RANK', 'أبقى عليها'), finite(view.count) ? `${view.keptInScope} / ${view.rows.length}` : '—',
      finite(view.count)
        ? t(`its own answer: ${view.count} of all ${view.answered} are worth anything tonight`, `إجابته: ${view.count} من ${view.answered} تستحق شيئاً الليلة`)
        : t('it named no count tonight', 'لم يحدد عدداً الليلة')),
    tile(t('ORDER VS THE FORECASTERS', 'الترتيب مقابل النماذج'), rho(view.rhoForecasters),
      t('rank agreement with the forecasters’ middle estimate · 1 is the same order, 0 unrelated', 'اتفاق الترتيب مع التقدير الأوسط للنماذج · 1 نفس الترتيب و0 لا علاقة')),
    view.layers.length
      ? tile(t('WHAT THE EVIDENCE CHANGED', 'ما غيّرته الأدلة'), `${view.moved}`,
        t(`companies moved more than 20 places from the forecasts-alone reading · ${view.keptChanged} in or out of the kept set`,
          `شركة تحركت أكثر من 20 مركزاً عن قراءة النماذج وحدها · ${view.keptChanged} دخلت أو خرجت من المُبقاة`))
      : tile(t('WHAT IT READ', 'ما قرأه'), t('forecasts', 'التوقعات'),
        t('nothing else — switch on evidence to see what it changes', 'لا شيء غيرها — فعّل الأدلة لترى ما تغيّره')));

  const reorder = card('aix-reorder-card',
    view.layers.length
      ? t(`How ${words.evidence} reordered it`, `كيف أعاد ${words.evidence} ترتيبه`)
      : t('How it reordered the forecasters', 'كيف أعاد ترتيب النماذج'),
    view.layers.length
      ? t('Each dot is a company: across, its place when the re-rank read the forecasts alone; up, its place with the evidence switched on. On the diagonal nothing moved.',
        'كل نقطة شركة: أفقياً مركزها حين قرأ التوقعات وحدها، ورأسياً مركزها مع الأدلة. على القطر لم يتحرك شيء.')
      : t('Each dot is a company: across, its place by the forecasters’ middle estimate; up, its place in the re-rank. On the diagonal nothing moved.',
        'كل نقطة شركة: أفقياً مركزها حسب التقدير الأوسط للنماذج، ورأسياً مركزها في إعادة الترتيب. على القطر لم يتحرك شيء.'),
    h('div', { class: 'aix-reorder-body' },
      reorderChart(view.pairs, ar) || h('p', { class: 'aix-empty' }, t('Too few companies to compare.', 'شركات أقل من أن تُقارن.')),
      h('dl', { class: 'aix-reorder-facts' },
        h('dt', null, t('order agreement', 'اتفاق الترتيب')), h('dd', { dir: 'ltr' }, rho(view.layers.length ? view.rhoModels : view.rhoForecasters)),
        h('dt', null, t('moved 20+ places', 'تحرك 20+ مركزاً')), h('dd', { dir: 'ltr' }, String(view.moved)),
        h('dt', null, t('companies compared', 'شركات مقارنة')), h('dd', { dir: 'ltr' }, String(view.pairs.length)))));

  const scoredRows = view.rows.filter((r) => finite(r.score)).length;
  const lumped = view.setAside > 1 && view.setAside * 4 >= scoredRows
    ? t(` ${view.setAside} of them got 5 or less: it set much of the market aside rather than ordering it.`,
      ` ${view.setAside} منها حصلت على 5 أو أقل: وضع جزءاً كبيراً من السوق جانباً بدلاً من ترتيبه.`)
    : '';
  const scores = card('aix-hist-card', t('Every score it gave', 'كل درجة أعطاها'),
    (finite(view.threshold)
      ? t(`${scoredRows} companies scored 0–100. The line is the lowest score it still kept.`, `${scoredRows} شركة بدرجات من 0 إلى 100. الخط أدنى درجة أبقى عليها.`)
      : t(`${scoredRows} companies scored 0–100.`, `${scoredRows} شركة بدرجات من 0 إلى 100.`)) + lumped,
    histogram(view.rows.map((r) => r.score), { lo: 0, hi: 100, bins: 20, marker: view.threshold,
      markerLabel: finite(view.threshold) ? plain(view.threshold, 0) : null, colour: 'kept', ar })
      || h('p', { class: 'aix-empty' }, t('Too few scores to draw.', 'درجات أقل من أن تُرسم.')));

  const said = card('aix-note-card', t('What it said drove the order', 'ما قال إنه قاد الترتيب'),
    t('One sentence, in its own words, sealed with the reading.', 'جملة واحدة بكلماته، مختومة مع القراءة.'),
    view.note ? h('blockquote', { class: 'aix-quote', dir: 'auto' }, view.note)
      : h('p', { class: 'aix-empty' }, t('It gave no reason tonight.', 'لم يذكر سبباً الليلة.')),
    h('ul', { class: 'aix-facts' },
      h('li', null, t(`Answered for ${view.answered} companies${view.abstained ? `, left out ${view.abstained}` : ''}.`,
        `أجاب عن ${view.answered} شركة${view.abstained ? ` وترك ${view.abstained}` : ''}.`)),
      view.invented && view.invented.length
        ? h('li', { class: 'aix-warn' }, t(`Named ${view.invented.length} tickers that were not in the question; they were dropped.`, `ذكر ${view.invented.length} رموز لم تكن في السؤال، فحُذفت.`))
        : null,
      h('li', null, words.read)));

  const { shown, control } = showMore(component, view.rows, ar);
  const companies = card('aix-company-card', t('Company by company', 'شركة بشركة'),
    t('Its score out of 100, how far that reading moved the company, and the forecasters’ middle estimate beside it. Alphabetical — not an order of preference.',
      'درجته من 100، وكم حرّكت القراءة الشركة، والتقدير الأوسط للنماذج بجانبها. ترتيب أبجدي، لا ترتيب تفضيل.'),
    h('div', { class: 'aix-company-list' }, shown.map((r) => h('button', {
      key: r.ticker, type: 'button', class: 'aix-company-row is-score',
      onClick: () => component.setState({ screen: 'company', ticker: r.ticker, companyPanel: 'overview' }),
      'aria-label': `${r.ticker} ${plain(r.score, 0)}`,
    },
    h('span', { class: 'aix-company-name' }, h('b', null, r.ticker), h('small', null, title(data, r.ticker, ar))),
    h('strong', { dir: 'ltr' }, finite(r.score) ? plain(r.score, 0) : '—'),
    h('span', { class: 'aix-score', dir: 'ltr' },
      finite(r.score) ? h('b', { style: `width:${Math.max(Math.min(r.score, 100), 1).toFixed(1)}%` }) : null),
    h('small', { class: 'aix-company-note', dir: 'ltr' }, [
      finite(r.shift) && r.shift !== 0 ? `${r.shift > 0 ? '▲' : '▼'}${Math.abs(r.shift)}` : (finite(r.shift) ? '＝' : ''),
      finite(r.consensus) ? percent(r.consensus) : '',
    ].filter(Boolean).join('  '))))),
    control);

  return [tiles, reorder, h('div', { class: 'aix-pair' }, scores, said), companies];
}

export { summaryOf };

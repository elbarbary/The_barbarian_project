/* Saved model outputs, with a per-reader experimental warning.
 * Lists are alphabetical, not recommendations. Context is displayed alongside
 * outputs and does not change them. Only a pending data fetch shows loading.
 * Disclosure and gating are safeguards, not a determination of legality. */
import { React as R } from './react-shim.js';
import * as RB from './rulebook.js';
import { asRulebook } from './ask.js';
import { recordChart, points, shortModel, modelInk } from './ai-visuals.js';
import { companyPicker, savedRulePicker, scenarioFocus } from './scenario-visuals.js';

const h = R.createElement;
const finite = (v) => typeof v === 'number' && Number.isFinite(v);
const pp = (v) => (finite(v) ? `${v > 0 ? '+' : ''}${v.toFixed(2)}%` : '—');
const tone = (v) => (!finite(v) ? 'var(--t2)' : v > 0 ? 'var(--up)' : v < 0 ? 'var(--down)' : 'var(--t2)');

export const ACCEPTED_KEY = 'esthmr:scenarios:accepted:';
const acceptKey = (email) => ACCEPTED_KEY + (email ? String(email).trim().toLowerCase() : 'guest');

export function hasAccepted(email) {
  try { return localStorage.getItem(acceptKey(email)) === '1'; } catch { return false; }
}
export function accept(email) {
  try { localStorage.setItem(acceptKey(email), '1'); } catch { /* the gate holds for this visit only */ }
}

/* ── the warning ────────────────────────────────────────────────────────── */

/* Derive sample and timestamp caveats from the actual published record. */
export function warningLines(top5, ar, run) {
  const t = (en, arabic) => (ar ? arabic : en);
  const sessions = (top5 && Array.isArray(top5.dates)) ? top5.dates.length : 0;
  const scored = Object.values(top5?.models || {}).filter(m => m.group !== 'baseline').map(m => m.horizons?.['5']).filter(r => r?.sessions > 0 && finite(r.meanAdvantage));
  const behind = scored.filter(r => r.meanAdvantage < 0).length;
  return [
    t('These are outputs from experimental models, not forecasts this publisher endorses and not investment advice. ESTHMR is not licensed to advise on securities.',
      'هذه مخرجات نماذج تجريبية، وليست توقعات يتبنّاها هذا الناشر ولا نصيحة استثمارية. إسثمر غير مرخّص لتقديم المشورة في الأوراق المالية.'),
    t(`The published record covers ${sessions} evaluation dates, with different sample sizes per model and horizon. Historical testing is not live investment performance.`,
      `يغطي السجل المنشور ${sessions} تاريخ تقييم، بأحجام عيّنات مختلفة لكل نموذج وفترة. الاختبار التاريخي ليس أداء استثمار فعلي.`),
    scored.length ? t(`${behind} of ${scored.length} scored models lag their market benchmark over five sessions. Check the sample and the losses, not just the average.`,`${behind} من ${scored.length} نموذجاً مقيّماً أقل من السوق المقارن خلال خمس جلسات. راجع العيّنة والخسائر، لا المتوسط فقط.`)
      : t('There are no completed five-session scores yet. Missing results are not zero returns.', 'لا توجد نتائج مكتملة لفترة خمس جلسات بعد. النتيجة المفقودة ليست عائداً صفرياً.'),
    run?.commitment?.timestamped ? t('This run reports an independent timestamp. A timestamp helps check when a record existed; it does not make it right or prove predictive skill.', 'هذا التشغيل يحمل توثيقاً زمنياً مستقلاً بحسب سجله. يساعد التوثيق في التحقق من وقت وجود السجل، ولا يثبت صحة التوقع أو قدرته التنبؤية.')
      : t('Independent timestamp evidence is unavailable for this run. Do not assume these outputs were verified before trading.', 'لا يتوفر دليل توثيق زمني مستقل لهذا التشغيل. لا تفترض أن هذه المخرجات تحقّق منها قبل التداول.'),
  ];
}

function gate(component, data, ar) {
  const t = (en, arabic) => (ar ? arabic : en);
  const reader = component._reader || null;
  const dialog = h('dialog', { class: 'sc-gate', 'aria-modal': 'true',
                    'aria-labelledby': 'sc-gate-title', onCancel: () => component.setState({screen:'home'}) },
    h('div', { class: 'sc-gate-card' },
      h('p', { class: 'sc-gate-eyebrow' }, t('Experimental', 'تجريبي')),
      h('h2', { id: 'sc-gate-title' }, t('Before you open this', 'قبل أن تفتح هذا')),
      h('ul', { class: 'sc-gate-list' },
        warningLines(data.top5, ar, data.scenarios).map((line, i) => h('li', { key: i }, line))),
      h('div', { class: 'q-actions' },
        h('button', { type: 'button', class: 'q-save',
          autofocus: true,
          onClick: () => { accept(reader); component.setState({ scAccepted: Date.now(), scAcceptedReader: reader }); } },
          t('I understand — show me', 'فهمت — اعرضه')),
        h('button', { type: 'button', class: 'q-cancel',
          onClick: () => component.setState({ screen: 'home' }) },
          t('Take me back', 'عُد بي')))));
  // Native modality supplies focus containment and Escape on touch/desktop.
  queueMicrotask(() => { if (dialog.isConnected && !dialog.open && typeof dialog.showModal === 'function') dialog.showModal(); });
  return dialog;
}

/* ── the pickers ────────────────────────────────────────────────────────── */

export const SUBJECT = [
  { id: 'market', en: 'The whole market', ar: 'السوق كله' },
  { id: 'picked', en: 'Companies I choose', ar: 'شركات أختارها' },
  { id: 'rule', en: 'Companies that answer a question', ar: 'شركات ينطبق عليها سؤال' },
];

/* Layers a reader can add to the view. Each is a published fact about the
   company, shown beside the model's number and never folded into it: the
   model did not read the news, and a screen that mixed the two would be
   claiming it did. */
export const LAYERS = [
  { id: 'record', en: 'How this model has done', ar: 'أداء هذا النموذج' },
  { id: 'filings', en: 'Its latest filing', ar: 'آخر إفصاح لها' },
  { id: 'measures', en: 'Its measurements', ar: 'قياساتها' },
  { id: 'spread', en: 'Where the models disagree', ar: 'أين تختلف النماذج' },
  { id: 'news', en: 'News', ar: 'الأخبار' },
  { id: 'rulebook', en: 'Research rules', ar: 'قواعد البحث' },
];

function chips(items, chosen, onPick, ar, multi) {
  return h('div', { class: 'ask-subjects' }, items.map((x) => {
    const on = multi ? chosen.includes(x.id) : chosen === x.id;
    return h('button', { key: x.id, type: 'button',
      class: on ? 'ask-subject on' : 'ask-subject',
      'aria-pressed': on ? 'true' : 'false',
      onClick: () => onPick(x.id) }, ar ? x.ar : x.en);
  }));
}

/* ── assembling a scenario ──────────────────────────────────────────────── */

/** Which companies the reader is asking about, and why that set. */
export function universeFor(state, scenarios, measures) {
  const all = Object.keys((scenarios && scenarios.companies) || {}).sort();
  if (state.scSubject === 'picked') {
    const chosen = state.scTickers || [];
    return { tickers: all.filter((t) => chosen.includes(t)), how: 'picked' };
  }
  if (state.scSubject === 'rule' && state.scRule && measures) {
    const out = RB.run(measures, asRulebook(state.scRule));
    const matched = new Set(out.results.map((r) => r.ticker));
    return { tickers: all.filter((t) => matched.has(t)), how: 'rule', result: out };
  }
  if (state.scSubject === 'rule') return { tickers: [], how: 'rule' };
  return { tickers: all, how: 'market' };
}

/** One model's view of a set of companies: every company, no cut.
 *
 * Sorted alphabetically. Sorting by the model's own number would turn this
 * into a ranked list of securities produced by this publisher, which is the
 * line the whole site is built not to cross — the model's ordering is shown
 * as a number on each row, not as the order of the rows.
 */
export function viewFor(tickers, scenarios, model, horizon) {
  const companies = (scenarios && scenarios.companies) || {};
  const rows = [];
  for (const ticker of tickers) {
    const company = companies[ticker];
    const entry = company && company.models && company.models[model];
    const value = entry && entry.returns ? entry.returns[String(horizon)] : undefined;
    rows.push({ ticker, close: company && company.close,
                value: finite(value) ? value : null,
                spread: spreadOf(company, horizon) });
  }
  const numbers = rows.map((r) => r.value).filter(finite);
  return {
    rows,
    answered: numbers.length,
    silent: rows.length - numbers.length,
    median: numbers.length ? median(numbers) : null,
    up: numbers.filter((v) => v > 0).length,
    down: numbers.filter((v) => v < 0).length,
  };
}

function median(values) {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** How far apart the models are on one company — the honest headline when
 *  nine models disagree, which on this exchange they usually do. */
export function spreadOf(company, horizon) {
  const models = (company && company.models) || {};
  const values = Object.values(models)
    .map((m) => m.returns && m.returns[String(horizon)])
    .filter(finite);
  if (values.length < 2) return null;
  return { low: Math.min(...values), high: Math.max(...values), models: values.length,
           agree: values.every((v) => v > 0) || values.every((v) => v < 0) };
}

/* ── the drawing ────────────────────────────────────────────────────────── */

/* A distribution, not a leaderboard. The shape of what a model expects across
   the chosen companies says more than any single row, and it cannot be read
   as a list of things to buy. */
function distribution(view, ar) {
  const values = view.rows.map((r) => r.value).filter(finite);
  if (values.length < 5) return null;
  const low = Math.min(...values), high = Math.max(...values);
  const span = high - low || 1;
  const buckets = new Array(21).fill(0);
  for (const v of values) buckets[Math.min(20, Math.floor(((v - low) / span) * 21))] += 1;
  const tallest = Math.max(...buckets);
  const zeroAt = ((0 - low) / span) * 100;
  return h('div', { class: 'sc-dist' },
    h('div', { class: 'sc-dist-bars', role: 'img',
               'aria-label': ar ? `توزيع ${values.length} تقدير` : `distribution of ${values.length} estimates` },
      buckets.map((n, i) => h('span', { key: i,
        style: `height:${tallest ? (n / tallest) * 100 : 0}%;background:${
          low + (i / 21) * span >= 0 ? 'var(--up)' : 'var(--down)'}` }))),
    zeroAt >= 0 && zeroAt <= 100
      ? h('span', { class: 'sc-dist-zero', style: `inset-inline-start:${zeroAt}%` }) : null,
    h('div', { class: 'sc-dist-axis' },
      h('span', null, pp(low)), h('span', null, pp(high))));
}

function recordFor(top5, model, horizon, ar) {
  const t = (en, arabic) => (ar ? arabic : en);
  const row = (((top5 && top5.models) || {})[model] || {}).horizons || {};
  const one = row[String(horizon)] || {};
  if (!one.sessions) {
    return h('p', { class: 'home-note' }, t(
      'This model has no scorable record yet — it has not run on enough sessions.',
      'لا سجل قابل للتقييم لهذا النموذج بعد — لم يعمل على جلسات كافية.'));
  }
  return h('section', {class:'sc-record-panel'},h('h3',null,t('How this model actually performed','كيف كان أداء هذا النموذج فعلياً')),
    recordChart(one,ar,modelInk(model)),h('p', { class: 'home-note sc-record' }, t(
    `Its five highest-ranked returned ${pp(one.meanReturn)} against its market benchmark's ${pp(one.meanMarket)} — ${points(one.meanAdvantage)} — ahead on ${one.ahead} of ${one.sessions} sessions. Historical test outcomes, not portfolio returns.`,
    `حققت أعلى خمس لديه ${pp(one.meanReturn)} مقابل ${pp(one.meanMarket)} للسوق المقارن — ${points(one.meanAdvantage)} — متقدّمًا في ${one.ahead} من ${one.sessions} جلسة. نتائج اختبارات تاريخية، لا عوائد محفظة.`)));
}

/* ── the screen ─────────────────────────────────────────────────────────── */

export function scenariosScreen(component, data, ar) {
  const t = (en, arabic) => (ar ? arabic : en);
  const st = component.state;
  const reader = component._reader || null;
  const scenarios = data.scenarios || null;
  const top5 = data.top5 || null;
  const measures = data.measures || null;

  if (!hasAccepted(reader) && !(st.scAccepted && st.scAcceptedReader === reader)) {
    return { screen: h('div', { class: 'home-screen sc-screen' }, gate(component, data, ar)) };
  }

  if (!scenarios) {
    return { screen: h('div', { class: 'home-screen sc-screen' },
      h('header', { class: 'home-intro' }, h('h1', null, t('Scenario workbench', 'مختبر السيناريوهات'))),
      h('div',{class:'sc-loading',role:'status'},h('div',{class:'sc-skeleton','aria-hidden':'true'}),h('p', { class: 'home-note' }, t('Loading the saved model run—not generating a new forecast.', 'جارٍ تحميل تشغيل النموذج المحفوظ، وليس إنشاء توقع جديد.'))),
      h('button',{type:'button',class:'q-cancel',onClick:()=>component.onRetryData?.()},t('Retry loading','إعادة التحميل'))) };
  }

  const models = scenarios.models || {};
  const model = st.scModel === 'rerank' ? 'rerank' : st.scModel && models[st.scModel] ? st.scModel : Object.keys(models)[0];
  const horizon = [1, 5, 20].includes(Number(st.scHorizon)) ? Number(st.scHorizon) : 5;
  const subject = st.scSubject || 'market';
  const layers = st.scLayers || ['record', 'spread'];

  const picked = universeFor({ ...st, scSubject: subject }, scenarios, measures);
  const view = viewFor(picked.tickers, scenarios, model, horizon);
  const commitment = scenarios.commitment || {};

  // Selection is synchronous work over a saved document. Do not invent a
  // timed AI run or let an earlier timer overwrite a later selection.
  const restage = (patch) => {
    component.setState(patch);
  };

  const modelButton = ([id,m]) => h('button', {
    key:id,type:'button',class:model===id?'sc-model-option on':'sc-model-option',
    'aria-pressed':String(model===id),onClick:()=>restage({scModel:id}),
    style:`--model-ink:${modelInk(id)}`
  }, h('i',{'aria-hidden':'true'}), h('span',null,shortModel(id,ar?m.labelAr:m.label)),
     h('small',null,m.group==='baseline'?t('Simple comparison','مقارنة بسيطة'):id==='rerank'?t('Context reranking','ترتيب بالسياق'):t('Price model','نموذج أسعار')));
  const modelEntries = Object.entries(scenarios.models || {});
  if (top5?.models?.rerank && !models.rerank) modelEntries.push(['rerank',{label:'Gemini',group:'rerank'}]);
  const narrow = typeof matchMedia === 'function' && matchMedia('(max-width: 760px)').matches;
  const controlsOpen = st.scControlsOpen ?? !narrow;
  const controls = h('details',{class:'sc-controls-shell',open:controlsOpen},
    h('summary',{onClick:e=>{e.preventDefault();component.setState({scControlsOpen:!controlsOpen});}},
      h('span',null,t('Adjust your comparison','عدّل المقارنة')),
      h('small',null,`${shortModel(model)} · ${horizon} ${t('sessions','جلسة')} · ${picked.tickers.length} ${t('companies','شركة')}`)),
    h('div',{class:'sc-controls'},
    h('section',{class:'sc-step'},h('h2',null,h('b',null,'01'),t('Choose what to explore','اختر ما تستكشفه')),
      chips(SUBJECT,subject,id=>restage({scSubject:id}),ar,false),
      subject==='picked'?companyPicker(component,data,scenarios,ar):null,
      subject==='rule'?savedRulePicker(component,ar):null),
    h('section',{class:'sc-step'},h('h2',null,h('b',null,'02'),t('Choose a model','اختر نموذجاً')),
      h('div',{class:'sc-model-options'},modelEntries.filter(([,m])=>m.group!=='baseline').map(modelButton)),
      h('details',{class:'sc-baselines'},h('summary',null,t('Simple comparison models','نماذج المقارنة البسيطة')),modelEntries.filter(([,m])=>m.group==='baseline').map(modelButton))),
    h('section',{class:'sc-step'},h('h2',null,h('b',null,'03'),t('Look how far ahead?','ما الفترة التي تريد استكشافها؟')),
      h('div',{class:'ask-subjects'},[1,5,20].map(hz=>h('button',{key:hz,type:'button',class:horizon===hz?'ask-subject on':'ask-subject','aria-pressed':String(horizon===hz),onClick:()=>restage({scHorizon:hz})},hz===1?t('Next session','الجلسة التالية'):t(`${hz} sessions`,`${hz} جلسة`))))),
    h('section',{class:'sc-step'},h('h2',null,t('Add context','أضف السياق')),
      chips(LAYERS,layers,id=>restage({scLayers:layers.includes(id)?layers.filter(x=>x!==id):[...layers,id]}),ar,true),
      h('p',{class:'home-note'},t('These switches add evidence beside the saved output. They do not rerun or change the model.','تضيف هذه الخيارات أدلة بجانب المخرجات المحفوظة. لا تعيد تشغيل النموذج ولا تغيّر نتيجته.')))));

  const body = h('div',{class:'sc-results'},
    model==='rerank'&&!models.rerank?h('p',{class:'sc-caution'},t('Gemini’s saved reranking record is shown below. This run contains no Gemini return estimates; none are substituted from another model.','سجل إعادة ترتيب جيميني المحفوظ معروض أدناه. لا يحتوي هذا التشغيل على تقديرات عائد لجيميني، ولا نستبدلها بنتائج نموذج آخر.')):null,
    scenarioFocus(component,data,scenarios,view,model,horizon,layers,ar),
    layers.includes('record')?recordFor(top5,model,horizon,ar):null,
    h('section',{class:'sc-overview'},h('h2',null,t('Across your selection','عبر اختيارك')),
      h('div',{class:'sc-summary'},h('div',null,h('strong',{class:'sc-figure',dir:'ltr'},pp(view.median)),
        h('p',{class:'aic-against'},t('Middle estimate—not an expected portfolio return','التقدير الأوسط، وليس عائد محفظة متوقعاً')),
        h('p',{class:'home-note'},t(`${view.answered} estimates · ${view.up} positive · ${view.down} negative · ${view.silent} unavailable`,`${view.answered} تقديراً · ${view.up} موجب · ${view.down} سالب · ${view.silent} غير متاح`))),distribution(view,ar))),
    h('section',{class:'sc-company-section'},h('h2',null,t('Explore a company','استكشف شركة')),
      h('p',{class:'home-note'},t('Alphabetical, not a recommendation ranking. Tap a company to compare its models above.','ترتيب أبجدي، وليس ترتيب توصيات. اضغط على شركة لمقارنة نماذجها بالأعلى.')),
      h('div',{class:'sc-stock-cards'},view.rows.map(r=>h('button',{key:r.ticker,type:'button',class:'sc-stock-card','aria-pressed':String(r.ticker===(view.rows.find(x=>x.ticker===st.scFocus)||view.rows[0])?.ticker),
        onClick:()=>{component.setState({scFocus:r.ticker});if(typeof requestAnimationFrame==='function')requestAnimationFrame(()=>document.getElementById('sc-focus')?.scrollIntoView({block:'start',behavior:'instant'}));}},
        h('b',null,r.ticker),h('strong',{dir:'ltr',style:`color:${tone(r.value)}`},pp(r.value)),
        h('span',null,finite(r.value)?t('Model estimate','تقدير النموذج'):t('No estimate','لا تقدير')),
        h('span',{'aria-hidden':'true'},'↗'))))));

  return {screen:h('div',{class:'home-screen sc-screen'},
    h('header',{class:'home-intro sc-intro'},h('div',null,h('span',{class:'aic-beta'},t('BETA · AI','تجريبي · ذكاء اصطناعي')),
      h('h1',null,t('Explore what AI sees.','استكشف ما تراه النماذج.')),
      h('p',null,t('Choose a company. Compare models. Read the evidence.','اختر شركة. قارن النماذج. اقرأ الأدلة.'))),
      h('div',{class:'sc-run-stamp'},h('span',null,t('Saved model run','تشغيل نموذج محفوظ')),h('b',{dir:'ltr'},scenarios.basisSession||'—'),h('small',null,t('Model outputs, not advice','مخرجات نماذج، وليست توصية')))),
    h('div',{class:'sc-layout'},controls,body),
    h('footer',{class:'sc-proof'},h('details',null,h('summary',null,t('About this saved run & its timestamp','عن هذا التشغيل المحفوظ وتوثيقه الزمني')),
      h('p',{class:'home-note'},t('A published timestamp can help verify when a record existed. It does not prove the forecast is accurate, that this screen matches the signed record, or that the service has regulatory approval.','يساعد التوثيق الزمني المنشور في التحقق من وقت وجود سجل. لا يثبت صحة التوقع أو مطابقة هذه الشاشة للسجل الموقّع أو حصول الخدمة على موافقة تنظيمية.')),
      h('p',null,t('Timestamp reported: ','توثيق زمني مسجّل: ')+(commitment.timestamped?(commitment.authority||t('Authority unspecified','الجهة غير محددة')):t('Unavailable','غير متاح'))),
      h('p',null,t('Recorded before open: ','مسجل قبل الافتتاح: ')+(commitment.committedBeforeOpen===true?t('Yes, according to the run metadata','نعم، بحسب بيانات التشغيل'):t('Not established','غير مثبت'))),
      h('code',{class:'sc-root'},commitment.merkleRoot||t('No commitment hash supplied','لم يُرفق رمز تحقق'))),
      h('button',{type:'button',class:'q-cancel',onClick:()=>{try{localStorage.removeItem(acceptKey(reader));}catch{}component.setState({scAccepted:0,scAcceptedReader:null});}},t('Show the warning again','أظهر التحذير مجددًا'))))};
}

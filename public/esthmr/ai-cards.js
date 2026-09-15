/* The models' own record, at the top of Home.
 *
 * WHAT THIS CARD SAYS
 * It is a statement about MODELS: the five companies each one ranked highest
 * on a night, and what those five returned against what everything it scored
 * returned. It names no company and ranks no company. The one it leads with is
 * the system — the Gemini re-rank that reads the other models — and every
 * other model sits beside it with its own record.
 *
 * WHAT IT MUST NOT BECOME
 * The moment the card names the five, it is a list of five securities chosen
 * by this publisher. `the published record names no security anywhere` in the
 * tests is the guard; this comment is why.
 *
 * NOTHING ON IT IS WRITTEN HERE
 * Every figure, count and date comes from `research/top5.json`, which the lab
 * rebuilds every night. A model with fewer scored sessions than the record's
 * own minimum shows how many it has and how many it needs — never an average
 * of two nights, and never a zero standing in for "not yet".
 */
import { React as R } from './react-shim.js';
import { finite, percent, points, heroChart, divergeBar } from './ai-visuals.js';
import { warningDialog } from './scenarios.js';

const h = R.createElement;

const WORDS = {
  en: ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
    'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen',
    'nineteen', 'twenty'],
};
const word = (n) => (Number.isInteger(n) && n >= 0 && n < WORDS.en.length ? WORDS.en[n] : String(n));
const Word = (n) => { const w = word(n); return w.charAt(0).toUpperCase() + w.slice(1); };

const LAYER_NAMES = {
  filings: { en: 'filings', ar: 'الإفصاحات' },
  news: { en: 'news', ar: 'الأخبار' },
  rulebook: { en: 'our rule book', ar: 'دليل التقييم' },
  measures: { en: 'its own measurements', ar: 'القياسات' },
};

function listOf(items, ar) {
  if (items.length < 2) return items.join('');
  return ar ? `${items.slice(0, -1).join('، ')} و${items.at(-1)}`
    : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;
}

/** Arabic counts agree with their noun: one, two, three to ten, eleven up. */
export function countAr(n, one, two, few, many) {
  if (n === 1) return one;
  if (n === 2) return two;
  return n >= 3 && n <= 10 ? `${n} ${few}` : `${n} ${many}`;
}

const sessionsLabel = (n, ar) => (ar ? countAr(n, 'جلسة واحدة', 'جلستان', 'جلسات', 'جلسة')
  : `${n} ${n === 1 ? 'session' : 'sessions'}`);

/** Everything the card shows, derived from the record and nothing else. */
export function heroModel(top5, horizon) {
  const models = (top5 && top5.models) || {};
  const minimum = finite(top5?.minimumSessions) ? top5.minimumSessions : 1;
  const hz = String(horizon);
  const rows = Object.entries(models)
    .filter(([, m]) => m && m.distinguishes !== false)
    .map(([id, m]) => {
      const one = (m.horizons || {})[hz] || {};
      const sessions = finite(one.sessions) ? one.sessions : 0;
      const scored = sessions >= minimum && finite(one.meanAdvantage);
      return {
        id, label: m.label || id, labelAr: m.labelAr || m.label || id, group: m.group || 'baseline',
        nights: finite(m.nights) ? m.nights : 0,
        sessions, scored, needed: Math.max(minimum - sessions, 0),
        advantage: scored ? one.meanAdvantage : null,
        ownReturn: scored ? one.meanReturn : null,
        market: scored ? one.meanMarket : null,
        ahead: finite(one.ahead) ? one.ahead : 0,
        signChanges: finite(one.signChanges) ? one.signChanges : 0,
        byDate: scored && Array.isArray(one.byDate) ? one.byDate : [],
      };
    });
  const system = rows.find((r) => r.group === 'rerank') || null;
  const others = rows.filter((r) => r !== system);
  const scored = others.filter((r) => r.scored).sort((a, b) => b.advantage - a.advantage);
  const pending = others.filter((r) => !r.scored).sort((a, b) => b.sessions - a.sessions);
  return {
    horizon: hz, minimum,
    topCount: finite(top5?.topCount) ? top5.topCount : null,
    nights: Array.isArray(top5?.dates) ? top5.dates.length : 0,
    horizons: (Array.isArray(top5?.horizons) ? top5.horizons : []).map(String),
    latest: top5?.latest || null,
    system,
    rows: [system, ...scored, ...pending].filter(Boolean),
    scoredCount: rows.filter((r) => r.scored).length,
    pendingCount: rows.filter((r) => !r.scored).length,
  };
}

function kindLabel(row, latest, ar) {
  if (row.group === 'rerank') {
    const n = latest?.forecasters;
    return ar ? 'يقرأ النماذج الأخرى' : `READS THE OTHER ${finite(n) ? word(n).toUpperCase() : 'MODELS'}`;
  }
  if (row.group === 'neural') return ar ? 'نموذج أساس' : 'FOUNDATION';
  return ar ? 'مقارنة بسيطة' : 'BASELINE';
}

function open(component, patch) {
  component.setState({ screen: 'scenarios', aiWarning: false, scShowAll: false, scNightsAll: false, scSearch: '', ...patch });
  if (typeof scrollTo === 'function') { try { scrollTo(0, 0); } catch { /* not in a browser */ } }
}

export function aiCards(component, data, ar) {
  const t = (en, arabic) => (ar ? arabic : en);
  const top5 = data && data.top5;
  if (!top5 || !top5.models) return null;
  const st = component.state || {};
  const horizons = (Array.isArray(top5.horizons) ? top5.horizons : []).map(String);
  const horizon = horizons.includes(String(st.aiHorizon)) ? String(st.aiHorizon)
    : horizons.includes('5') ? '5' : horizons[0];
  const m = heroModel(top5, horizon);
  const system = m.system;
  const n = Number(horizon);
  const latest = m.latest || {};
  const five = finite(m.topCount) ? m.topCount : null;

  const reads = (latest.rerankReads || []).map((id) => LAYER_NAMES[id]?.[ar ? 'ar' : 'en']).filter(Boolean);
  const forecasters = finite(latest.forecasters) ? latest.forecasters : null;

  const chips = h('div', { class: 'aix-seg', role: 'group', 'aria-label': t('Measured over', 'الفترة') },
    horizons.map((hz) => h('button', {
      key: hz, type: 'button', class: hz === horizon ? 'on' : '',
      'aria-pressed': String(hz === horizon),
      onClick: () => component.setState({ aiHorizon: hz }),
    }, sessionsLabel(Number(hz), ar))));

  const windowWords = ar ? sessionsLabel(n, true) : `${word(n)} ${n === 1 ? 'session' : 'sessions'}`;

  // ── the system's card ──
  let systemCard;
  if (system && system.scored) {
    systemCard = h('div', { class: 'aix-system' },
      h('div', { class: 'aix-system-head' },
        h('span', { class: 'aix-eyebrow' }, t(`THE SYSTEM’S ${word(five).toUpperCase()} · ${windowWords}`,
          `أعلى ${five} للنظام · ${windowWords}`)),
        h('strong', { class: 'aix-system-value', dir: 'ltr' }, percent(system.ownReturn)),
        h('p', { class: 'aix-system-versus' }, t(
          `against ${percent(system.market)} for the market over the same ${windowWords} · ahead on ${system.ahead} of ${system.sessions}`,
          `مقابل ${percent(system.market)} للسوق خلال ${windowWords} نفسها · متقدم في ${system.ahead} من ${system.sessions}`))),
      h('div', { class: 'aix-system-chart' }, heroChart(system.byDate, ar)),
      h('div', { class: 'aix-system-legend' },
        h('span', null, h('i', { class: 'aix-key-system' }), t('the system', 'النظام')),
        h('span', null, h('i', { class: 'aix-key-market' }), t('the market, equal weight', 'السوق بأوزان متساوية'))));
  } else if (system) {
    systemCard = h('div', { class: 'aix-system aix-system-pending' },
      h('div', { class: 'aix-system-head' },
        h('span', { class: 'aix-eyebrow' }, t(`THE SYSTEM’S ${word(five).toUpperCase()} · ${windowWords}`,
          `أعلى ${five} للنظام · ${windowWords}`)),
        h('strong', { class: 'aix-system-value', dir: 'ltr' }, `${system.sessions}/${m.minimum}`),
        h('p', { class: 'aix-system-versus' }, system.nights
          ? t(`sessions scored so far. It has read ${system.nights} ${system.nights === 1 ? 'night' : 'nights'}, and its figure appears once ${system.needed} more ${system.needed === 1 ? 'session is' : 'sessions are'} scored.`,
            `جلسات مُقيَّمة حتى الآن. قرأ ${countAr(system.nights, 'ليلة واحدة', 'ليلتين', 'ليالٍ', 'ليلة')}، ويظهر رقمه بعد تقييم ${countAr(system.needed, 'جلسة واحدة', 'جلستين', 'جلسات', 'جلسة')} أخرى.`)
          : t('sessions scored. It has not read a night yet, so there is nothing to score.',
            'جلسات مُقيَّمة. لم يقرأ أي ليلة بعد، فلا شيء لتقييمه.'))),
      h('div', { class: 'aix-progress', role: 'img', 'aria-label': t(`${system.sessions} of ${m.minimum} sessions scored`, `${system.sessions} من ${m.minimum} جلسات مُقيَّمة`) },
        Array.from({ length: m.minimum }, (_, i) => h('i', { key: i, class: i < system.sessions ? 'done' : '' }))),
      h('div', { class: 'aix-system-legend' },
        h('span', null, t('No number until there is a record — a missing result is not a zero.',
          'لا رقم قبل وجود سجل — النتيجة الغائبة ليست صفراً.'))));
  } else {
    systemCard = null;
  }

  // ── the pipeline, in the record's own counts ──
  const pipeline = h('ol', { class: 'aix-pipeline' },
    h('li', null, h('b', null, '1'), h('div', null,
      h('strong', null, t(`${forecasters ? Word(forecasters) : 'The'} models rank every company`,
        `${forecasters ? forecasters + ' نماذج' : 'النماذج'} ترتّب كل الشركات`)),
      h('span', null, t('Foundation forecasters and plain baselines, run on the same closing data.',
        'نماذج تنبؤ أساسية وخطوط مقارنة بسيطة، على بيانات الإغلاق نفسها.')))),
    h('li', null, h('b', null, '2'), h('div', null,
      h('strong', null, t(`Gemini re-reads the ${forecasters ? word(forecasters) : 'others'}`, 'Gemini يعيد قراءة النماذج')),
      h('span', null, reads.length
        ? t(`It weighs their calls against ${listOf(reads, false)}, then says how many are worth keeping.`,
          `يزن توقعاتها مقابل ${listOf(reads, true)}، ثم يحدد كم منها يستحق الإبقاء.`)
        : t('It weighs their calls, then says how many are worth keeping.', 'يزن توقعاتها، ثم يحدد كم منها يستحق الإبقاء.')))),
    h('li', null, h('b', null, '3'), h('div', null,
      h('strong', null, t('We score both, out loud', 'نقيّم الاثنين علناً')),
      h('span', null, t('Raw model output and the re-rank are tracked side by side, wins and losses.',
        'مخرجات النماذج وإعادة الترتيب تُتابَع جنباً إلى جنب، بالمكاسب والخسائر.')))));

  // ── model by model ──
  const scoredRows = m.rows.filter((r) => r.scored);
  const max = Math.max(...scoredRows.map((r) => Math.abs(r.advantage)), 0) * 1.12 || 1;
  const list = h('div', { class: 'aix-models' },
    h('header', null,
      h('h2', null, t('Model by model, against the market', 'نموذجاً بنموذج، مقابل السوق')),
      h('span', { class: 'aix-legend-axis', dir: 'ltr' }, t('BEHIND ◀ 0 ▶ AHEAD', 'متأخر ◀ 0 ▶ متقدم'))),
    h('div', { class: 'aix-model-list' }, m.rows.map((r) => h('button', {
      key: r.id, type: 'button', class: `aix-model-row${r === system ? ' is-system' : ''}${r.scored ? '' : ' is-pending'}`,
      onClick: () => open(component, { scModel: r.id, scFrom: r.id, scHorizon: n }),
      'aria-label': `${ar ? r.labelAr : r.label} · ${r.scored ? points(r.advantage) : t('not yet scored', 'لم يُقيَّم بعد')}`,
    },
    h('span', { class: 'aix-model-name' },
      h('strong', null, ar ? r.labelAr : r.label),
      h('small', null, `${kindLabel(r, latest, ar)} · ${r.scored
        ? t(`${r.sessions} SESSIONS`, `${r.sessions} جلسة`)
        : t(`${r.sessions} OF ${m.minimum} SESSIONS`, `${r.sessions} من ${m.minimum} جلسات`)}`)),
    h('span', { class: `aix-model-value ${r.scored ? (r.advantage >= 0 ? 'up' : 'down') : 'quiet'}`, dir: 'ltr' },
      r.scored ? points(r.advantage) : '—'),
    r.scored
      ? divergeBar(r.advantage, max, r === system ? 'system' : undefined)
      : h('span', { class: 'aix-track aix-track-pending' },
        h('em', null, r.nights
          ? t(`needs ${r.needed} more ${r.needed === 1 ? 'session' : 'sessions'} to be scored`,
            `يحتاج ${r.needed} جلسة أخرى ليُقيَّم`)
          : t('has not run yet', 'لم يعمل بعد')))))));

  // ── what the numbers cannot carry ──
  const flips = system && system.scored && system.signChanges
    ? t(`The system’s lead over the market has changed sign ${system.signChanges} ${system.signChanges === 1 ? 'time' : 'times'}.`,
      `تغيّرت إشارة تقدم النظام على السوق ${system.signChanges} مرة.`)
    : (() => {
      const flipped = scoredRows.filter((r) => r.signChanges > 0).length;
      return flipped ? t(`For ${flipped} of ${scoredRows.length} scored models the sign of this number has flipped from one night to the next.`,
        `لدى ${flipped} من ${scoredRows.length} نماذج مُقيَّمة انقلبت إشارة هذا الرقم من ليلة إلى أخرى.`) : '';
    })();
  const caveat = [
    five && m.nights ? t(`${Word(five)} companies over ${m.nights} nights is a small sample.`, `${five} شركات خلال ${m.nights} ليلة عيّنة صغيرة.`) : '',
    flips,
    m.pendingCount ? t(`${Word(m.pendingCount)} ${m.pendingCount === 1 ? 'model has' : 'models have'} not run long enough to be scored.`,
      `${m.pendingCount} نماذج لم تعمل مدة كافية لتُقيَّم.`) : '',
    t('The market is every company the model scored, equally weighted — not an index.', 'السوق هنا كل شركة قيّمها النموذج بأوزان متساوية، وليس مؤشراً.'),
  ].filter(Boolean).join(' ');

  const warning = st.aiWarning ? warningDialog(component, data, ar, {
    onAccept: () => open(component, {}),
    onClose: () => component.setState({ aiWarning: false }),
    closeLabel: t('Close', 'إغلاق'),
  }) : null;

  return h('section', { class: 'ai-cards aix-hero', 'aria-labelledby': 'aix-hero-title' },
    h('div', { class: 'aix-hero-top' },
      h('div', { class: 'aix-hero-intro' },
        h('button', { type: 'button', class: 'aix-beta', onClick: () => component.setState({ aiWarning: true }) },
          h('i', { 'aria-hidden': 'true' }), t('ESTHMR AI · BETA · READ THIS', 'إسثمر AI · تجريبي · اقرأ هذا')),
        h('h1', { id: 'aix-hero-title' },
          five ? t(`The AI picked ${word(five)} companies.`, `اختار الذكاء الاصطناعي ${five} شركات.`) : t('The AI picked its companies.', 'اختار الذكاء الاصطناعي شركاته.'),
          h('br'), t('Here is what they did next.', 'وهذا ما فعلته بعدها.')),
        h('p', { class: 'aix-hero-lead' }, t(
          `${forecasters ? Word(forecasters) : 'The'} models rank every EGX company after each close, and Gemini re-reads all of them${reads.length ? ` against ${listOf(reads, false)}` : ''}. We hold nothing and advise nothing — this is what their picks did, published either way.`,
          `${forecasters ? forecasters + ' نماذج' : 'النماذج'} ترتّب كل شركات البورصة المصرية بعد كل إغلاق، ويعيد Gemini قراءتها${reads.length ? ` مقابل ${listOf(reads, true)}` : ''}. لا نملك أسهماً ولا نقدّم نصيحة — هذا ما فعلته اختياراتها، يُنشر أياً كانت النتيجة.`))),
      chips),
    h('div', { class: 'aix-hero-grid' },
      h('div', { class: 'aix-hero-left' }, systemCard, pipeline),
      list),
    h('footer', { class: 'aix-hero-foot' },
      h('p', null, caveat),
      h('button', { type: 'button', class: 'aix-cta', onClick: () => open(component, { scModel: st.scModel || 'rerank', scHorizon: n }) },
        t('See each model’s picks and results', 'اطّلع على اختيارات كل نموذج ونتائجها'), h('span', { 'aria-hidden': 'true', dir: 'ltr' }, ar ? '←' : '→'))),
    warning);
}

/* The AI card at the top of Home: compact, and about the models.
 *
 * WHAT THIS CARD SAYS
 * Two things. On the left, what the AI system is and the two ways into it —
 * choose a model on the workbench, or read what the picks returned. On the
 * right, the system's own record: what the Gemini re-rank's five returned
 * against what everything it scored returned. It names no company and ranks
 * no company; every other model's record sits on the workbench beside it.
 *
 * WHAT IT MUST NOT BECOME
 * The moment the card names the five, it is a list of five securities chosen
 * by this publisher. `the published record names no security anywhere` in the
 * tests is the guard; this comment is why.
 *
 * NOTHING ON IT IS WRITTEN HERE
 * Every figure, count and date comes from `research/top5.json`. Below the
 * record's own minimum the system shows how many sessions it has and how many
 * it needs — never an average of two nights, and never a zero for "not yet".
 */
import { React as R } from './react-shim.js';
import { finite, percent, heroChart } from './ai-visuals.js';
import { warningDialog } from './scenarios.js';
import { heroModel, countAr, sessionsLabel, word, Word } from './ai-record.js';

export { heroModel, countAr };

const h = R.createElement;

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

function open(component, patch) {
  component.setState({ screen: 'scenarios', aiWarning: false, scShowAll: false, scNightsAll: false, scSearch: '', ...patch });
  if (typeof scrollTo === 'function') { try { scrollTo(0, 0); } catch { /* not in a browser */ } }
}

export function aiCards(component, data, ar) {
  const t = (en, arabic) => (ar ? arabic : en);
  const top5 = data && data.top5;
  if (!top5 || !top5.models) return null;
  const st = component.state || {};
  // Home shows one window, the record's five-session one where it has it;
  // every window and every model is on the workbench.
  const horizons = (Array.isArray(top5.horizons) ? top5.horizons : []).map(String);
  const horizon = horizons.includes('5') ? '5' : horizons[0];
  const m = heroModel(top5, horizon);
  const system = m.system;
  const n = Number(horizon);
  const latest = m.latest || {};
  const five = finite(m.topCount) ? m.topCount : null;

  const reads = (latest.rerankReads || []).map((id) => LAYER_NAMES[id]?.[ar ? 'ar' : 'en']).filter(Boolean);
  const forecasters = finite(latest.forecasters) ? latest.forecasters : null;
  // The forecasters, and the re-rank that reads them when it ran.
  const models = forecasters === null ? null : forecasters + (latest.readings ? 1 : 0);
  const windowWords = ar ? sessionsLabel(n, true) : `${word(n)} ${n === 1 ? 'session' : 'sessions'}`;
  const eyebrow = five
    ? t(`THE SYSTEM’S ${word(five).toUpperCase()} · ${windowWords.toUpperCase()}`, `أعلى ${five} للنظام · ${windowWords}`)
    : t(`THE SYSTEM · ${windowWords.toUpperCase()}`, `النظام · ${windowWords}`);

  // ── the system's record ──
  let systemCard = null;
  if (system && system.scored) {
    systemCard = h('div', { class: 'aix-system' },
      h('span', { class: 'aix-eyebrow' }, eyebrow),
      h('div', { class: 'aix-system-figure' },
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
      h('span', { class: 'aix-eyebrow' }, eyebrow),
      h('div', { class: 'aix-system-figure' },
        h('strong', { class: 'aix-system-value', dir: 'ltr' }, `${system.sessions}/${m.minimum}`),
        h('p', { class: 'aix-system-versus' }, system.nights
          ? t(`sessions scored. It has read ${system.nights} ${system.nights === 1 ? 'night' : 'nights'}; its figure appears once ${system.needed} more ${system.needed === 1 ? 'is' : 'are'} scored.`,
            `جلسات مُقيَّمة. قرأ ${countAr(system.nights, 'ليلة واحدة', 'ليلتين', 'ليالٍ', 'ليلة')}، ويظهر رقمه بعد تقييم ${countAr(system.needed, 'جلسة واحدة', 'جلستين', 'جلسات', 'جلسة')} أخرى.`)
          : t('sessions scored. It has not read a night yet.', 'جلسات مُقيَّمة. لم يقرأ أي ليلة بعد.'))),
      h('div', { class: 'aix-progress', role: 'img', 'aria-label': t(`${system.sessions} of ${m.minimum} sessions scored`, `${system.sessions} من ${m.minimum} جلسات مُقيَّمة`) },
        Array.from({ length: m.minimum }, (_, i) => h('i', { key: i, class: i < system.sessions ? 'done' : '' }))),
      h('div', { class: 'aix-system-legend' },
        h('span', null, t('No number until there is a record — a missing result is not a zero.',
          'لا رقم قبل وجود سجل — النتيجة الغائبة ليست صفراً.'))));
  }

  // ── how it works, in the record's own counts ──
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
      h('span', null, t('Wins and losses, side by side, against every company scored — equally weighted, not an index.',
        'المكاسب والخسائر جنباً إلى جنب، مقابل كل شركة مُقيَّمة — بأوزان متساوية، وليس مؤشراً.')))));

  const warning = st.aiWarning ? warningDialog(component, data, ar, {
    onAccept: () => open(component, {}),
    onClose: () => component.setState({ aiWarning: false }),
    closeLabel: t('Close', 'إغلاق'),
  }) : null;
  const into = { scModel: st.scModel || 'rerank', scHorizon: n };

  // A div, not a section: the journal styles give every section of Home its
  // own padding, radius and shadow, and this wrapper holds two surfaces that
  // carry their own.
  return h('div', { class: 'ai-cards', role: 'region', 'aria-labelledby': 'aix-hero-title' },
    h('div', { class: 'aix-hero' },
      h('div', { class: 'aix-hero-intro' },
        h('button', { type: 'button', class: 'aix-beta', onClick: () => component.setState({ aiWarning: true }) },
          h('i', { 'aria-hidden': 'true' }), t('ESTHMR AI · BETA · READ THIS', 'إسثمر AI · تجريبي · اقرأ هذا')),
        h('h1', { id: 'aix-hero-title' },
          t('Run AI models on the EGX.', 'شغّل نماذج الذكاء الاصطناعي على البورصة المصرية.'),
          h('br'), t('Or let us run them for you.', 'أو دعنا نشغّلها لك.')),
        h('p', { class: 'aix-hero-lead' }, t(
          `${models ? `${Word(models)} public models` : 'Public models'} rank every listed company after each close. Pick one of them yourself, or read the picks we publish either way. We hold nothing and advise nothing.`,
          `${models ? countAr(models, 'نموذج عام واحد', 'نموذجان عامان', 'نماذج عامة', 'نموذجاً عاماً') : 'نماذج عامة'} ترتّب كل الشركات المدرجة بعد كل إغلاق. اختر أحدها بنفسك، أو اقرأ الاختيارات التي ننشرها في كل الأحوال. لا نملك أسهماً ولا نقدّم نصيحة.`)),
        h('div', { class: 'aix-hero-actions' },
          h('button', { type: 'button', class: 'aix-cta', onClick: () => open(component, { ...into, scFocus: null }) },
            t('Run a model', 'شغّل نموذجاً'), h('span', { 'aria-hidden': 'true', dir: 'ltr' }, ar ? '←' : '→')),
          h('button', { type: 'button', class: 'aix-cta-quiet', onClick: () => open(component, { ...into, scFocus: 'past' }) },
            t('See what they returned', 'اطّلع على ما حققته')))),
      systemCard),
    pipeline,
    warning);
}

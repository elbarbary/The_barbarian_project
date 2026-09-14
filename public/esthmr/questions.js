/* The reader's saved questions: a shelf of conditions, each answered in full.
 *
 * THIS SCREEN NEVER CHOOSES
 * It lists the questions in the order the reader saved them, newest first —
 * not by how many companies answer, not by which looks interesting today.
 * Every answer shows all three counts and every matching company. The editor
 * offers columns and comparisons and nothing else: no "suggested" threshold,
 * no default that encodes a view. A blank question matches nothing, and the
 * editor says so rather than filling it in.
 *
 * WHAT "SAVED" MEANS, TRUTHFULLY
 * The question is kept; it is not watched. The engine runs in this browser
 * when the page is open, against the latest table published, and the copy
 * says "applied to the measurements as at <date>". Nothing here promises an
 * overnight run or an alert, because nothing here does one.
 */
import { React as R } from './react-shim.js';
import * as RB from './rulebook.js';
import * as store from './questions-store.js';
import { COLUMNS, columnLabel, answerCounts, resultList, sentence, describe, asRulebook, whole } from './ask.js';

const h = R.createElement;

const blank = () => ({ id: store.newId(), name: '', match: 'all',
                       conditions: [{ column: 'relative_volume_20', op: '>=', value: 2 }] });

function persist(component, list) {
  component._questions = list;
  if (component.onChange) component.onChange();
}

/* ── the editor ─────────────────────────────────────────────────────────── */

function conditionRow(component, draft, index, ar) {
  const c = draft.conditions[index];
  const column = COLUMNS.find((x) => x.id === c.column) || COLUMNS[0];
  const ops = column.kind === 'event'
    ? ['has', 'missing']
    : ['>=', '<=', '>', '<', '==', '!='];
  const set = (patch) => {
    const conditions = draft.conditions.map((x, i) => (i === index ? { ...x, ...patch } : x));
    component.setState({ qEdit: { ...draft, conditions } });
  };
  const remove = () => component.setState({
    qEdit: { ...draft, conditions: draft.conditions.filter((_, i) => i !== index) } });

  return h('div', { class: 'q-cond', key: index },
    h('select', { class: 'q-select', 'aria-label': ar ? 'القياس' : 'Measurement',
      value: c.column,
      onChange: (e) => {
        const next = COLUMNS.find((x) => x.id === e.target.value) || column;
        const op = next.kind === 'event' ? 'has' : (ops.includes(c.op) && column.kind !== 'event' ? c.op : '>=');
        set({ column: next.id, op, value: next.kind === 'event' ? undefined : (c.value ?? 0) });
      } },
      COLUMNS.map((x) => h('option', { key: x.id, value: x.id }, ar ? x.ar : x.en))),
    h('select', { class: 'q-select q-op', 'aria-label': ar ? 'المقارنة' : 'Comparison',
      value: c.op, onChange: (e) => set({ op: e.target.value }) },
      ops.map((op) => h('option', { key: op, value: op },
        ar ? RB.OPERATORS[op].label_ar : RB.OPERATORS[op].label))),
    column.kind === 'event' ? null : h('input', {
      class: 'q-value', type: 'number', step: 'any', inputMode: 'decimal',
      'aria-label': ar ? 'القيمة' : 'Value',
      value: c.value ?? '',
      onInput: (e) => set({ value: e.target.value === '' ? undefined : Number(e.target.value) }),
    }),
    draft.conditions.length > 1
      ? h('button', { type: 'button', class: 'q-remove', 'aria-label': ar ? 'حذف الشرط' : 'Remove condition', onClick: remove }, '×')
      : null,
  );
}

function editor(component, table, ar) {
  const draft = component.state.qEdit;
  if (!draft) return null;
  const t = (en, arabic) => (ar ? arabic : en);
  const usable = store.clean(draft);
  const preview = usable && table ? RB.run(table, asRulebook(usable)) : null;
  const reader = component._reader || null;

  const save = () => {
    if (!usable) return;
    const list = store.saveSynced(reader, { ...usable, name: draft.name.trim() },
      (status) => { component.setState({ qStatus: status }); });
    persist(component, list);
    component.setState({ qEdit: null, qOpen: usable.id });
  };

  return h('section', { class: 'q-editor' },
    h('h2', null, draft.name || t('A question', 'سؤال')),
    h('label', { class: 'q-field' },
      h('span', null, t('Name it', 'سمِّه')),
      h('input', { type: 'text', maxLength: 80, value: draft.name,
        placeholder: t('e.g. Busy and reporting soon', 'مثلًا: نشطة ونتائجها قريبة'),
        onInput: (e) => component.setState({ qEdit: { ...draft, name: e.target.value } }) })),
    h('div', { class: 'q-match', role: 'group', 'aria-label': t('How the conditions combine', 'كيف تجتمع الشروط') },
      ['all', 'any'].map((m) => h('button', { key: m, type: 'button',
        class: draft.match === m ? 'ask-subject on' : 'ask-subject',
        'aria-pressed': draft.match === m ? 'true' : 'false',
        onClick: () => component.setState({ qEdit: { ...draft, match: m } }) },
        m === 'all' ? t('All of these', 'كل هذه الشروط') : t('Any of these', 'أيّ من هذه الشروط')))),
    h('div', { class: 'q-conds' }, draft.conditions.map((_, i) => conditionRow(component, draft, i, ar))),
    h('button', { type: 'button', class: 'q-add',
      onClick: () => component.setState({ qEdit: { ...draft,
        conditions: draft.conditions.concat([{ column: 'change_1', op: '>', value: 0 }]) } }) },
      t('+ another condition', '+ شرط آخر')),
    // The answer while you type. A question with no usable condition has no
    // answer, and the editor says so rather than showing the whole market.
    preview
      ? h('div', { class: 'q-preview' }, answerCounts(preview, ar))
      : h('p', { class: 'home-note' }, t('Give it at least one complete condition.', 'أضف شرطًا واحدًا كاملًا على الأقل.')),
    h('div', { class: 'q-actions' },
      h('button', { type: 'button', class: 'q-save', disabled: !usable, onClick: save }, t('Save', 'احفظ')),
      h('button', { type: 'button', class: 'q-cancel', onClick: () => component.setState({ qEdit: null }) }, t('Cancel', 'إلغاء'))),
  );
}

/* ── the shelf ──────────────────────────────────────────────────────────── */

function shelf(component, table, ar) {
  const t = (en, arabic) => (ar ? arabic : en);
  const list = component._questions || [];
  const st = component.state;
  const reader = component._reader || null;

  if (!list.length) {
    return h('p', { class: 'home-note q-empty' }, t(
      'Nothing saved yet. Write a question above, or save one of the starter questions on the overview.',
      'لا شيء محفوظ بعد. اكتب سؤالًا أعلاه، أو احفظ أحد الأسئلة الجاهزة في النظرة العامة.'));
  }

  return h('div', { class: 'ask-questions' }, list.map((q) => {
    const result = table ? RB.run(table, asRulebook(q)) : null;
    const isOpen = st.qOpen === q.id;
    return h('div', { key: q.id, class: 'ask-question' },
      h('button', { type: 'button', class: 'ask-open', 'aria-expanded': isOpen ? 'true' : 'false',
        onClick: () => component.setState({ qOpen: isOpen ? '' : q.id }) },
        h('span', { class: 'ask-sentence' }, sentence(q, ar)),
        q.name ? h('span', { class: 'q-conditions' },
          q.conditions.map((c) => describe(c, ar)).join(q.match === 'any' ? t(' or ', ' أو ') : t(' and ', ' و '))) : null,
        result ? answerCounts(result, ar) : h('p', { class: 'home-note' }, t('The measurements are still loading.', 'القياسات قيد التحميل.'))),
      isOpen ? h('div', null,
        result ? resultList(component, result, ar) : null,
        h('div', { class: 'q-actions' },
          h('button', { type: 'button', class: 'q-cancel',
            onClick: () => component.setState({ qEdit: { ...q, conditions: q.conditions.map((c) => ({ ...c })) } }) },
            t('Edit', 'عدّل')),
          h('button', { type: 'button', class: 'q-cancel q-danger',
            onClick: () => { persist(component, store.removeSynced(reader, q.id,
              (status) => component.setState({ qStatus: status }))); component.setState({ qOpen: '' }); } },
            t('Delete', 'احذف')))) : null);
  }));
}

export function questionsScreen(component, data, ar) {
  const t = (en, arabic) => (ar ? arabic : en);
  const table = data.measures || null;
  const reader = component._reader || null;
  const count = (component._questions || []).length;
  const status = component.state.qStatus;

  return {
    screen: h('div', { class: 'home-screen q-screen' },
      h('header', { class: 'home-intro' },
        h('h1', null, t('My questions for the market', 'أسئلتي للسوق')),
        h('p', null, table && table.market_date
          ? t(`Applied to the measurements as at the close of ${table.market_date}. Nothing here is watched overnight; it is answered when you open it.`,
              `مطبّقة على القياسات حتى إغلاق ${table.market_date}. لا شيء هنا يُراقَب ليلًا؛ يُجاب عنه حين تفتحه.`)
          : t('Applied to the latest measurements when you open the page.', 'تُطبَّق على أحدث القياسات حين تفتح الصفحة.'))),
      h('p', { class: 'home-note' }, reader
        ? t(`Kept on your account, ${count} of ${store.MAX}.`, `محفوظة على حسابك، ${count} من ${store.MAX}.`)
        : t('Kept in this browser until you sign in.', 'محفوظة في هذا المتصفح حتى تسجّل الدخول.'),
        status === 'saving' ? ` · ${t('saving…', 'جارٍ الحفظ…')}` : status === 'error' ? ` · ${t('could not reach your account; kept here', 'تعذّر الوصول إلى حسابك؛ محفوظة هنا')}` : ''),
      component.state.qEdit
        ? editor(component, table, ar)
        : h('button', { type: 'button', class: 'q-new', onClick: () => component.setState({ qEdit: blank() }) },
            t('+ Write a question', '+ اكتب سؤالًا')),
      h('section', { class: 'home-ask' },
        h('h2', null, t('Saved', 'المحفوظة')),
        shelf(component, table, ar)),
      h('p', { class: 'home-note' }, t(
        `${whole(COLUMNS.length)} measurements can be asked about. Every one is a published figure; none is an opinion.`,
        `يمكن السؤال عن ${whole(COLUMNS.length)} قياسًا. كلها أرقام منشورة؛ لا رأي بينها.`)),
    ),
  };
}

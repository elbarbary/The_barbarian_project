import { React as R } from './react-shim.js';
const h=R.createElement;
export const finite=v=>typeof v==='number'&&Number.isFinite(v);
export const percent=v=>finite(v)?`${v>0?'+':''}${v.toFixed(2)}%`:'—';
export const points=v=>finite(v)?`${v>0?'+':''}${v.toFixed(2)} pp`:'—';
export const modelInk=id=>({kronos:'var(--accent)',chronos2:'var(--up)',timesfm25:'var(--ai-blue)',rerank:'var(--ai-coral)'})[id]||'var(--t2)';
export const shortModel=(id,fallback)=>({kronos:'Kronos',chronos2:'Chronos',timesfm25:'TimesFM',rerank:'Gemini'})[id]||fallback||id||'—';

/** Actual per-run outcomes, never a compounded portfolio curve. */
export function recordChart(row,ar=false,ink='var(--accent)') {
  const dates=(Array.isArray(row?.byDate)?row.byDate:[]).filter(d=>d&&typeof d.basisSession==='string');
  const values=dates.flatMap(d=>[d.chosenReturn,d.marketReturn]).filter(finite);
  if(!values.length)return null;
  const lo=Math.min(0,...values),hi=Math.max(0,...values),span=hi-lo||1;
  const x=i=>12+i/Math.max(1,dates.length-1)*276,y=v=>76-(v-lo)/span*60;
  const path=key=>{let gap=true;return dates.map((d,i)=>{if(!finite(d[key])){gap=true;return '';}
    const p=`${gap?'M':'L'}${x(i).toFixed(2)},${y(d[key]).toFixed(2)}`;gap=false;return p;}).join(' ');};
  return h('figure',{class:'aiv-record'},
    h('svg',{viewBox:'0 0 300 92',role:'img','aria-label':ar?'عائد اختيارات النموذج والسوق لكل اختبار':'Model selections and market return for each test'},
      h('line',{x1:8,x2:292,y1:y(0),y2:y(0),stroke:'var(--rule)','stroke-dasharray':'3 4'}),
      h('path',{d:path('marketReturn'),fill:'none',stroke:'var(--t2)','stroke-width':1.6,'stroke-dasharray':'4 4','vector-effect':'non-scaling-stroke'}),
      h('path',{d:path('chosenReturn'),fill:'none',stroke:ink,'stroke-width':2.2,'vector-effect':'non-scaling-stroke'}),
      dates.map((d,i)=>finite(d.chosenReturn)?h('circle',{key:i,cx:x(i),cy:y(d.chosenReturn),r:2.5,fill:ink},h('title',null,`${d.basisSession}: ${percent(d.chosenReturn)} / ${percent(d.marketReturn)}`)):null)),
    h('figcaption',null,h('span',{dir:'ltr'},dates[0].basisSession),h('span',{dir:'ltr'},dates.at(-1).basisSession)),
    h('div',{class:'aiv-legend'},h('span',null,h('i',{style:`background:${ink}`}),ar?'اختيارات النموذج':'Model selections'),h('span',null,h('i',{class:'aiv-dashed'}),ar?'السوق المقارن':'Market benchmark')));
}

function compareRows(rows,selected) {
  const max=Math.max(1,...rows.map(r=>finite(r.value)?Math.abs(r.value):0));
  return h('div',{class:'aiv-models'},rows.map(r=>h('div',{key:r.id,class:r.id===selected?'aiv-model selected':'aiv-model'},
    h('span',null,r.label),h('span',{class:'aiv-diverge','aria-hidden':'true'},finite(r.value)?h('i',{style:`width:${Math.abs(r.value)/max*50}%;left:${r.value<0?50-Math.abs(r.value)/max*50:50}%;background:${r.ink}`}):null),h('b',{dir:'ltr'},percent(r.value)))));
}
export function horizonChart(company,model,selected,ar) {
  return compareRows([1,5,20].map(day=>({id:day,label:ar?`${day} جلسة`:`${day} sessions`,value:company?.models?.[model]?.returns?.[String(day)],ink:modelInk(model)})),selected);
}
export function disagreementChart(company,models,horizon,selected,ar) {
  return compareRows(Object.entries(models||{}).filter(([,m])=>m.group!=='baseline').map(([id,m])=>({id,label:shortModel(id,ar?m.labelAr:m.label),value:company?.models?.[id]?.returns?.[String(horizon)],ink:modelInk(id)})),selected);
}

export function renderAiCards(component,top5,cards,horizon,ar) {
  const t=(en,arabic)=>ar?arabic:en;
  return h('section',{class:'ai-cards'},
    h('header',{class:'aic-head'},h('div',null,h('span',{class:'aic-beta'},t('BETA · AI','تجريبي · ذكاء اصطناعي')),
      h('h2',null,t('Can AI read the market?','هل يفهم الذكاء الاصطناعي السوق؟')),
      h('p',{class:'aic-sub'},t('Compare the models’ track records. Then explore their scenarios.','قارن سجلّ النماذج، ثم استكشف سيناريوهاتها.'))),
      h('div',{class:'ask-subjects aic-horizon',role:'group','aria-label':t('Return measured after','قياس العائد بعد')},['1','5'].map(hz=>h('button',{key:hz,type:'button',class:horizon===hz?'ask-subject on':'ask-subject','aria-pressed':String(horizon===hz),onClick:()=>component.setState({aiHorizon:hz})},hz==='1'?t('Next session','الجلسة التالية'):t('After 5 sessions','بعد ٥ جلسات'))))),
    h('div',{class:'aic-grid'},cards.map(c=>{
      const row=top5.models[c.id].horizons?.[horizon]||{},scored=c.sessions>0&&finite(c.ownReturn)&&finite(c.market);
      return h('button',{key:c.id,type:'button',class:`aic-card aic-${c.id}`,style:`--model-ink:${modelInk(c.id)}`,
        onClick:()=>component.setState({screen:'scenarios',scModel:c.id,scHorizon:Number(horizon)}),
        'aria-label':`${shortModel(c.id,c.label)} · ${t('Explore model scenarios','استكشف سيناريوهات النموذج')}`},
        h('div',{class:'aic-model-head'},h('span',{class:'aic-model-mark','aria-hidden':'true'},c.id==='rerank'?'✳':shortModel(c.id,c.label).slice(0,1)),h('div',null,h('strong',{class:'aic-name'},shortModel(c.id,ar?c.labelAr:c.label)),h('span',{class:'aic-kind'},c.id==='rerank'?t('Context reranking','إعادة ترتيب بالسياق'):t('Price model','نموذج أسعار'))),h('span',{class:'aic-arrow','aria-hidden':'true'},'↗')),
        scored?h('div',{class:'aic-result'},h('span',{class:'aic-caption'},t('Average return · top 5 selections','متوسط عائد أعلى ٥ اختيارات')),h('strong',{class:'aic-figure',dir:'ltr'},percent(c.ownReturn)),
          h('span',{class:'aic-against'},t('Market benchmark','السوق المقارن'),h('b',{dir:'ltr'},percent(c.market))),recordChart(row,ar,modelInk(c.id)),
          h('div',{class:'aic-scoreline'},h('span',null,t('Difference','الفارق')),h('b',{dir:'ltr',style:`color:${c.advantage<0?'var(--down)':'var(--up)'}`},points(c.advantage))),
          h('div',{class:'aic-sample'},t(`ahead on ${c.ahead} of ${c.sessions} sessions`,`متقدّم في ${c.ahead} من ${c.sessions} جلسة`)),
          h('small',{class:'aic-cost-note'},t('Historical test · before trading costs','اختبار تاريخي · قبل تكاليف التداول')))
          :h('div',{class:'aic-pending'},h('div',{class:'aic-observations','aria-hidden':'true'},[0,1,2,3,4].map(i=>h('i',{key:i}))),h('strong',null,t('No record yet','لا سجل بعد')),h('p',null,t('Waiting for completed outcomes. No performance curve is available.','بانتظار نتائج مكتملة. لا يتوفر منحنى أداء بعد.'))),
        h('span',{class:'aic-open'},t('Explore this model','استكشف هذا النموذج'),h('span',{'aria-hidden':'true'},'→')));
    })),
    h('details',{class:'aic-method'},h('summary',null,t('How to read these results','كيف تقرأ هذه النتائج')),
      h('p',null,t('Historical tests of each model’s five highest-ranked companies. Lines show individual test outcomes, not a growing investment balance. The benchmark is all companies that model scored—not the EGX index. Differences are percentage points (pp). Small samples, differing test dates and overlapping holding windows limit comparisons. Model outputs, not advice.','اختبارات تاريخية لأعلى خمس شركات رتّبها كل نموذج. الخطوط تعرض نتائج اختبارات منفردة، لا رصيد استثمار متراكم. المقارنة مع كل الشركات التي قيّمها النموذج وليست مؤشر البورصة. الفارق بالنقاط المئوية. العيّنات الصغيرة واختلاف التواريخ وتداخل فترات القياس تحدّ المقارنة. مخرجات نماذج، وليست توصية.'))));
}

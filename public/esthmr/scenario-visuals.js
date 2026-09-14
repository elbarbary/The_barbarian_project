import { React as R } from './react-shim.js';
import { finite, percent, modelInk, shortModel, horizonChart, disagreementChart } from './ai-visuals.js';
const h=R.createElement;
const title=(data,ticker,ar)=>{const c=(data.companies||[]).find(c=>c.ticker===ticker);return c?.name?.[ar?'ar':'en']||c?.[ar?'nameAr':'nameEn']||ticker;};

export function companyPicker(component,data,scenarios,ar) {
  const t=(en,arabic)=>ar?arabic:en,st=component.state;
  const chosen=st.scTickers||[],q=String(st.scSearch||'').trim().toLowerCase();
  const matches=Object.keys(scenarios.companies||{}).sort().filter(ticker=>(ticker+' '+title(data,ticker,ar)).toLowerCase().includes(q));
  const limit=st.scPickerLimit||24;
  return h('div',{class:'sc-picker'},h('label',{for:'sc-company-search'},t('Search by company or ticker','ابحث باسم الشركة أو رمزها')),
    h('input',{id:'sc-company-search',type:'search',value:st.scSearch||'',placeholder:t('Company name or ticker…','اسم الشركة أو رمزها…'),onInput:e=>component.setState({scSearch:e.target.value,scPickerLimit:24})}),
    h('div',{class:'sc-picked'},chosen.map(ticker=>h('button',{key:ticker,type:'button','aria-label':t(`Remove ${ticker}`,`إزالة ${ticker}`),onClick:()=>component.setState({scTickers:chosen.filter(x=>x!==ticker)})},ticker+' ×'))),
    h('div',{class:'sc-picker-list'},matches.slice(0,limit).map(ticker=>h('button',{key:ticker,type:'button','aria-pressed':String(chosen.includes(ticker)),onClick:()=>component.setState({scTickers:chosen.includes(ticker)?chosen.filter(x=>x!==ticker):[...chosen,ticker],scFocus:ticker})},h('b',null,ticker),h('span',null,title(data,ticker,ar)),h('i',{'aria-hidden':'true'},chosen.includes(ticker)?'✓':'+')))),
    !matches.length?h('p',{class:'home-note'},t('No matching company. Try another name.','لا توجد شركة مطابقة. جرّب اسماً آخر.')):null,
    matches.length>limit?h('button',{type:'button',class:'q-cancel',onClick:()=>component.setState({scPickerLimit:limit+24})},t(`Show more · ${matches.length} matches`,`عرض المزيد · ${matches.length} نتيجة`)):null,
    h('p',{class:'home-note'},t(`${chosen.length} selected. Select one to compare models, or several to explore together.`,`${chosen.length} مختارة. اختر شركة لمقارنة النماذج، أو عدة شركات للاستكشاف معاً.`)));
}

export function savedRulePicker(component,ar) {
  const t=(en,arabic)=>ar?arabic:en,questions=component._questions||[];
  return h('div',{class:'sc-rule-picker'},h('label',{for:'sc-rule'},t('Use a saved question','استخدم سؤالاً محفوظاً')),
    h('select',{id:'sc-rule',onChange:e=>component.setState({scRule:questions.find(q=>q.id===e.target.value)||null})},
      h('option',{value:'',selected:!component.state.scRule?.id},t('Choose your question','اختر سؤالك')),questions.map(q=>h('option',{key:q.id,value:q.id,selected:q.id===component.state.scRule?.id},q.name||t('Saved question','سؤال محفوظ')))),
    h('button',{type:'button',class:'q-cancel',onClick:()=>component.setState({screen:'questions'})},t('Create or edit a question ↗','أنشئ سؤالاً أو عدّله ↗')));
}

export function scenarioFocus(component,data,scenarios,view,model,horizon,layers,ar) {
  const t=(en,arabic)=>ar?arabic:en;
  const row=view.rows.find(r=>r.ticker===component.state.scFocus)||view.rows[0];
  if(!row)return h('section',{class:'sc-empty'},h('h2',null,t('Your comparison starts with a company','ابدأ المقارنة باختيار شركة')),h('p',null,t('Choose companies above, or switch to the whole market.','اختر شركات بالأعلى، أو انتقل إلى السوق كله.')));
  const co=scenarios.companies[row.ticker],m=scenarios.models?.[model]||{};
  const measured=(data.measures?.rows||[]).find(r=>r.ticker===row.ticker);
  const news=(Array.isArray(data.feed)?data.feed:[]).filter(n=>Array.isArray(n?.tickers)&&n.tickers.some(x=>(typeof x==='string'?x:x?.ticker)===row.ticker));
  return h('section',{class:'sc-focus',id:'sc-focus'},
    h('header',{class:'sc-focus-heading'},h('div',null,h('span',{class:'sc-eyebrow'},t('COMPANY IN FOCUS','الشركة تحت العدسة')),h('h2',null,row.ticker),h('p',null,title(data,row.ticker,ar))),
      h('button',{type:'button',class:'q-cancel',onClick:()=>component.setState({screen:'company',ticker:row.ticker,companyPanel:'overview'})},t('Company & sources ↗','الشركة والمصادر ↗'))),
    h('div',{class:'sc-focus-grid'},h('div',{class:'sc-estimate'},
      h('span',null,`${shortModel(model,ar?m.labelAr:m.label)} · ${t('model estimate','تقدير النموذج')}`),
      h('strong',{dir:'ltr',style:`color:${!finite(row.value)?'var(--t2)':row.value<0?'var(--down)':'var(--up)'}`},percent(row.value)),
      h('p',null,t(`Change from the ${scenarios.basisSession||'—'} close after ${horizon} trading sessions. This is an estimate, not an observed return.`,`التغيّر من إغلاق ${scenarios.basisSession||'—'} بعد ${horizon} جلسة تداول. هذا تقدير وليس عائداً محققاً.`)),
      !finite(row.value)?h('p',{class:'sc-caution'},t('This model supplied no return estimate for this selection.','لم يقدم هذا النموذج تقديراً للعائد لهذا الاختيار.')):null,
      finite(co?.close)?h('small',null,t('Reference close: ','إغلاق المرجع: ')+co.close):null),
      h('div',{class:'sc-chart-panel'},h('h3',null,t('One model, three time windows','نموذج واحد، ثلاث فترات')),horizonChart(co,model,horizon,ar),h('p',{class:'home-note'},t('Each bar is a separate endpoint estimate—not a daily price path.','كل شريط تقدير لنهاية فترة مستقلة، وليس مساراً يومياً للسعر.')))),
    layers.includes('spread')?h('section',{class:'sc-compare'},h('h3',null,t('Do the AI models see the same thing?','هل ترى نماذج الذكاء الاصطناعي الشيء نفسه؟')),
      disagreementChart(co,scenarios.models,horizon,model,ar),h('p',{class:'home-note'},t('Different models can disagree. This range is not a confidence interval.','قد تختلف النماذج. هذا النطاق ليس مجال ثقة إحصائياً.'))):null,
    h('div',{class:'sc-context-grid'},
      layers.includes('measures')?h('article',null,h('h3',null,t('Trading activity','نشاط التداول')),h('strong',null,finite(measured?.relative_volume_20)?measured.relative_volume_20.toFixed(1)+'×':'—'),h('p',null,t('Volume versus its previous 20-session median. Context only—not a buy signal.','حجم التداول مقارنة بوسيط ٢٠ جلسة سابقة. سياق فقط، وليس إشارة شراء.'))):null,
      layers.includes('filings')?h('article',null,h('h3',null,t('Company disclosures','إفصاحات الشركة')),h('strong',null,finite(measured?.sessions_since_filing)?t(`${measured.sessions_since_filing} sessions ago`,`منذ ${measured.sessions_since_filing} جلسة`):t('Date unavailable','التاريخ غير متاح')),
        h('button',{type:'button',class:'q-cancel',onClick:()=>component.setState({screen:'company',ticker:row.ticker,companyPanel:'filings'})},t('Read the filing evidence ↗','اقرأ الإفصاحات ↗'))):null,
      layers.includes('news')?h('article',{class:'sc-news'},h('h3',null,t('News mentioning this company','أخبار تذكر هذه الشركة')),
        news.length?news.slice(0,3).map((n,i)=>h('a',{key:n.id||i,href:/^https?:\/\//.test(n.href||'')?n.href:undefined,target:'_blank',rel:'noopener noreferrer'},h('strong',null,ar?n.headlineAr||n.headline:n.headline),h('small',null,`${n.date||n.published||'—'} · ${ar?n.sourceAr||n.source||'':n.source||''}`))):h('p',null,t('No matching item in the loaded feed. That does not prove there is no news.','لا يوجد خبر مطابق في الخلاصة المحمّلة. هذا لا يعني عدم وجود أخبار.'))):null),
    layers.includes('rulebook')?h('details',{class:'sc-rule-notes'},h('summary',null,t('How the research rulebook frames the evidence','كيف ينظّم دليل البحث الأدلة')),
      h('ol',null,[t('Verify the filing and its date before interpreting price movement.','تحقق من الإفصاح وتاريخه قبل تفسير حركة السعر.'),t('Check economic importance, ownership evidence and tradable liquidity.','افحص الأهمية الاقتصادية وأدلة الملكية والسيولة القابلة للتداول.'),t('Separate a confirmed setup, an accumulation watch and a speculative alert.','افصل الحالة المؤكدة عن مراقبة التجميع والتنبيه المضاربي.'),t('A model forecast awards no qualification points and never overrides missing evidence or risk gates.','توقع النموذج لا يمنح نقاط تأهيل، ولا يتجاوز نقص الأدلة أو ضوابط المخاطر.')].map(line=>h('li',null,line)))):null);
}

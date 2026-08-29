/* The screens, ported from the Claude Design canvas.
 *
 * Everything below `class Component` is the design's own logic, carried over
 * unchanged: the bilingual copy, the derived rows, the sort and filter
 * behaviour, the chart maths. Two things were replaced — `data()`, which held
 * the mock-up's sample market and is now fed from data.js, and the base class,
 * which the design tool supplied and is written out here.
 *
 * Keeping the rest verbatim is the point: re-importing a revised design stays
 * a file copy rather than a translation.
 */

import React from './react-shim.js';

/** Language this publisher may not use about a named security (§8).
 *
 * ESTHMR is not licensed by Egypt's FRA, so nothing it renders may tell a
 * reader what to do with a share. Most of the site's copy is written here and
 * is safe by construction; the review documents are GENERATED, and a future
 * pipeline run could word an answer badly. This is what stands between that and
 * a reader — the prose is dropped, the figures stay, because a filed figure was
 * never the part at risk.
 *
 * Exported so the tests assert against this exact expression rather than a
 * copy of it that can drift.
 */
export const DIRECTIVE = /\b(buy|sell|hold|avoid|accumulate|overweight|underweight|undervalued|overvalued|cheap|expensive|bargain|verdicts?|recommend\w*|target price|price target|should (buy|sell|own|avoid)|go (long|short)|(long|short) position|will (rise|fall|reach|hit))\b/i;

/** What the design tool called DCLogic: state, props, and a redraw hook. */
class Base {
  constructor(props) {
    this.props = props || {};
    this.onChange = null;
  }

  setState(patch) {
    Object.assign(this.state, typeof patch === 'function' ? patch(this.state) : patch);
    if (this.onChange) this.onChange();
  }

  /** The object the template's expressions are evaluated against. */
  scope() {
    return this.renderVals();
  }
}


export class Component extends Base {
  state = { screen:'home', theme:'light', lang:'en', range:'1Y', sort:'pct', dir:-1, sector:'All', q:'', open:{}, debtOpen:false, month:'2026-08' };

  // ── copy ──
  copy() {
    const en = {
      nothingYet:'Nothing published for this yet.',
      peNote:'P/E is the last close divided by the last earnings per share the company filed. A company with no profit to divide by has none.',
      compareTitle:'The same line, period by period',
      compareNote:'Only periods of the same length are put side by side. An H1 is six months and an FY is twelve, and the exchange files both cumulatively — lining them up in one row would compare half a year with a whole one.',
      compareNothing:'No line is filed for more than one period of the same length yet.',
      moreFigures:'+{n} filed',
      fullStatements:'{n} of {total} periods carry a full statement. The rest are announcements, where the exchange stated a profit and nothing else.',
      pickDay:'Pick a day',
      filedOnDay:'{n} filed on {date}',
      nothingFiledThatDay:'Nothing was filed that day.',
      whatItMeans:'What this kind of filing is',
      pickCompany:'Jump to a company',
      allSectors:'All',
      revGroupValuation:'What you pay',
      revGroupBusiness:'The business',
      revGroupReturns:'What it earns on',
      revGroupRisk:'How it\'s financed',
      revMeansTitle:'What it is',
      revProofNote:'These are the values the direction was read from — the exchange\'s filed figures, oldest first.',
      revProofTitle:'The figure, period by period',
      revOrientLabel:'Which way reads better',
      revPeBody:'Market value divided by profit: how much you pay for each pound the company earns. A falling P/E can mean the price got cheaper or the earnings got better — those are different stories. Rising with fast growth can mean the market is paying for what comes next; rising with flat growth is a stretch. Never read it without the earnings line below it.',
      revPbBody:'Market value divided by shareholders\' equity. Below 1 means the market values the company under its accounting equity — which is only a bargain if the assets are productive. Read it beside return on equity: low price to book with a high return is a different company from low price to book with a poor one.',
      revYieldBody:'The annual dividend against the share price, as the exchange publishes it. A yield can climb simply because the price collapsed, and a company paying out heavily may be keeping too little to invest. Read it beside profit and debt.',
      revProfitBody:'What the company filed as profit for the full year, as the exchange received it. Direction is read from the sign of each year\'s move rather than a percentage, because a percentage off a loss is meaningless: going from a loss to a profit is not growth of some number, it is a company that stopped losing money.',
      revEpsBody:'Profit divided by the shares in issue. This is the number that survives a company issuing more shares: total profit can climb while each share earns less. When you hear that profits increased, this is the follow-up question.',
      revAssetsBody:'What the company holds, from its filed balance sheet. This stands in for revenue growth, which no Egyptian source publishes: assets growing while profit does not is the same warning a falling margin would give — the company is putting more in to get the same out.',
      revCashBody:'Operating cash flow divided by reported profit. Above 1 means the company collected more cash than it booked as profit. This stands in for profit margin, which needs revenue nobody publishes — and it arguably answers the question better: when profit climbs and the cash does not follow, that is the thing worth investigating.',
      revRoeBody:'Profit as a share of shareholders\' equity: how much the company earns on the money its owners left in it. A high return is not automatically impressive — debt shrinks equity, which lifts the ratio without the business improving. Always read it beside debt to equity.',
      revRoaBody:'Profit as a share of total assets. Unlike return on equity, borrowing cannot flatter it — the assets stay on the books either way. The gap between the two is roughly how much of the return is coming from leverage.',
      revDebtBody:'Total liabilities against shareholders\' equity. The absolute amount of debt says surprisingly little: a company owing ten billion can be sounder than one owing one, depending on the size of the business behind it. Rising debt is not automatically a problem either — what matters is what moved alongside it. Debt up a fifth while earnings rose by half is borrowed money doing work. Debt up by four fifths while profit crept 5% is the case to look at.',
      revOrientPe:'Lower is the cheaper side. A P/E below its sector means you pay less than for similar companies for the same profit; above its sector means you pay more. Watch one thing: a very low reading can also mean the market expects the profit to drop.',
      revOrientPb:'Lower is the cheaper side. Below its sector means you pay less for each pound of the company\'s book value than its peers do; above its sector means more. A very low reading can also flag assets the market doubts are worth what the books say.',
      revOrientYield:'Higher pays you more. Above its sector means more cash back each year per pound than its peers pay; below its sector means less. But a very high yield often comes from a share price that has dropped, or a payout that may be cut — so higher is not always steadier.',
      revOrientHigherMore:'Higher is simply more — more profit, or more earnings for each share. Above its sector means more than its peers, but the direction over time matters most: rising reads better than falling.',
      revOrientCash:'Higher is healthier. Above its sector means more of the reported profit actually arrived as cash than for its peers — money in the bank, not just profit on paper; below its sector means more of it is still on paper.',
      revOrientReturn:'Higher is the stronger side. Above its sector means the company turns each pound put into it into more profit than its peers do; below its sector is weaker. Steady-and-high reads better than high-but-jumpy.',
      revOrientDebt:'Lower is the safer side. Below its sector means the company has borrowed less against its own money than its peers; above its sector carries more debt — which can fund growth but adds risk if conditions tighten.',
      revOrientAssets:'Higher just means bigger — more owned than its peers, nothing more. Size only counts if those assets earn a return, which the profit and return rows show; bigger is not automatically stronger.',
      revLabel:'The numbers, and what to ask',
      revRising:'rising',
      revFalling:'falling',
      revFlat:'flat',
      revAboveSector:'above its sector',
      revBelowSector:'below its sector',
      revSectorMedian:'{sector} median',
      revOverPeriods:'over {n} reported periods',
      revAgree:'{n} of {readable} readable metrics moved the same way.',
      revDisagree:'{up} moved one way, {down} the other.',
      revAgreeAsk:'When they all agree, ask what the market already knows that you do not.',
      revDisagreeAsk:'When they disagree, the disagreement is the story. Which one is early?',
      revMissingNote:'Revenue is not published by the exchange or by any data source reachable from Egypt, so revenue growth and profit margin cannot be shown. Asset growth and cash conversion ask the same questions of figures that are published. Free float is not published anywhere and has no substitute.',
      revAskTitle:'Worth asking',
      revAnswerTitle:'A probable answer',
      revProofTitle:'The figure, period by period',
      revProofNote:'These are the values the direction was read from — the exchange\'s filed figures, oldest first.',
      revNowRising:'Right now it\'s rising',
      revNowFalling:'Right now it\'s falling',
      revNowFlat:'Right now it\'s holding steady',
      revOnePoint:'One published figure — not enough history to read a direction.',
      revReadLabel:'The read',
      revCash:'Cash conversion',
      revCashAsk:'Of every pound of reported profit, how much actually arrived as cash?',
      revPb:'Price to book',
      revPbAsk:'You are paying this much for each pound of company equity. Are those assets earning anything?',
      revPe:'Price to earnings',
      revProfit:'Net profit',
      revEps:'Earnings per share',
      revAssets:'Total assets',
      revRoe:'Return on equity',
      revRoa:'Return on assets',
      revDebt:'Debt to equity',
      revYield:'Dividend yield',
      revPeAsk:'Why is it priced this way against its sector — and what are earnings doing underneath it?',
      revProfitAsk:'Where did the change come from — the business, or something that will not repeat?',
      revEpsAsk:'Profit rose — but did the earnings belonging to each share rise with it?',
      revAssetsAsk:'Is the business actually getting bigger, and is profit keeping pace with it?',
      revRoeAsk:'Good returns on shareholders\' money — or on borrowed money? Check the debt row.',
      revRoaAsk:'How hard is everything the company owns actually working?',
      revDebtAsk:'What did management do with the borrowed money — and is it earning more than it costs?',
      revYieldAsk:'Is the dividend supported by profit and cash — or by a share price that fell?',
      feedCount:'{shown} of {total} headlines, newest first.',
      showMore:'Show more',
      busiest:'Traded with abnormal volume',
      volumeKicker:'Traded {ratio}\u00d7 its usual volume',
      nothingUnusual:'Nothing unusual today',
      busyWorkings:'Shares traded in the session \u00f7 the median of the last 20 sessions. At 2.0 or above, this app says the day was unusual.',
      busyYardstick:'Twice the usual is the line, and it is this app\u2019s line rather than the exchange\u2019s \u2014 nobody publishes an official one. It is set where it is because a day at twice a company\u2019s normal volume is uncommon enough to be worth a look and common enough to happen without anything being wrong.',
      archiveNote:'Showing {shown} of {total} filings published in {month}.',
      breadthLine:'{up} rose, {down} fell and {flat} held, of {counted} counted in the {date} session.',
      breadthWord:'How widely',
      calWindow:'Filed between {from} and {to} in {n} past years.',
      yieldWord:'yield',
      macroMoved:'Moved with the EGX 30 {r} over {n} sessions.',
      macroBarely:'Barely moved with the EGX 30 {r} over {n} sessions.',
      sigFirstLoss:'{period} was its first loss after {run} profitable reported periods.',
      sigBackToProfit:'{period} returned to profit after {run} loss-making reported periods.',
      sigHeldSince:'The run had held since {year}.',
      sigFirstIn:'Its first {label} in {years} years.',
      sigPreviousWas:'The one before was in {year}.',
      sigQuiet:'It has filed nothing for {days} days, and normally files every {gap}.',
      sigLastFiling:'Last filing {date}.',
      sigStreak:'Streak', sigFirst:'First of its kind', sigSilence:'Silence',
      sigFootnote:'Counts off the exchange\u2019s own record. A first loss is not a signal to sell and a return to profit is not a signal to buy \u2014 this is what happened, and what you make of it is yours.',
      newsSourcedFrom:'Headlines from {outlets}, each linked to the outlet that ran it.',
      newsMerged:'{count} duplicates merged.',
      newsWithheld:'{count} withheld for carrying a recommendation.',
      newsUnreachable:'Not reachable today: {outlets}.',
      noBorrowings:'No filing held for this company states borrowings.',
      publisher:'Publisher · EGX filings', session:'Session', builtAt:'Built', theme:'Theme', dataVersion:'data_version',
      homeTitle:'The close', closeOf:'Official close of', movers:'Largest moves', readNow:'What to read now', watchlist:'Watchlist',
      closeNote:'Official close from market.json. Not a live price.',
      todayTitle:'Today', newestFirst:'Newest first', readAtSource:'Read at source', outletImage:'Outlet picture',
      marketTitle:'The market', searchPlaceholder:'Search 282 companies — English or Arabic',
      foldNote:'Search folds Arabic orthography: أ إ آ ٱ → ا, ة → ه, ى ئ → ي, ؤ → و, harakat and tatweel stripped on both sides.',
      marketFoot:'Sorting and filtering act on figures as filed. No ranking of companies is published.',
      noMatchTitle:'Nothing matches', noMatchBody:'No company in the filed set matches this search and this sector.', clearFilters:'Clear filters',
      lastClose:'Last close', asOf:'As of', priceHistory:'Price history', sessionsShown:'Sessions', whoTheyAre:'Who they are',
      asFiled:'Financials, as filed', egpMillions:'EGP millions unless stated', period:'Period', revenue:'Revenue',
      grossProfit:'Gross profit', operatingIncome:'Operating income', netIncome:'Net income',
      cumulativeWarning:'Periods are cumulative as the exchange files them. H1 and 9M are year-to-date and are not comparable to a single quarter. Nothing here is subtracted to synthesise a quarter, and a blank is a figure the filing did not state — not a zero.',
      openFiling:'Open filing', borrowingsTitle:'What it does with its borrowings', asAt:'As at', borrowings:'Borrowings', egpM:'EGP millions',
      dueWithinYear:'Due within a year', dueLater:'Due later', movementSince:'Movement since', pattern:'Pattern',
      whereFrom:'Where these figures come from',
      whereFromBody:'Read from the borrowing lines of the company’s own filed balance sheet — loans, bank facilities and lease liabilities, summed by maturity. Never from total liabilities, which also carry payables, provisions and customer advances that nobody lent the company.',
      sourceFiling:'Source filing', openSignedDoc:'Open the signed document', showSource:'Where these figures come from', hideSource:'Hide source',
      notCreditRating:'This is not a credit rating. The figures above are stated as filed, with no grade, band or colour attached to them.',
      whatIsUnusual:'What is unusual', itsFilings:'Its filings', egxArchive:'EGX archive', document:'Document',
      sectorsTitle:'Sectors', sectorsWord:'sectors', rose:'rose', fell:'fell', flat:'flat', medianPE:'Median P/E',
      calendarTitle:'Calendar', filed:'Filed', expected:'Expected', estimate:'Estimate',
      estimateNote:'Expected dates are estimated from each company’s own filing history. They are not announcements.',
      exchangeTitle:'Exchange', delayed15:'Quotes delayed ~15 minutes', macro:'Macro, in plain language',
      researchTitle:'Research', researchNote:'Bands describe the scorecard applied to a study. They describe no security.',
      readPaper:'Read the paper', scorecard:'Scorecard', publisherStamp:'ESTHMR · Publisher',
      legalNotLicensed:'ESTHMR is a publisher and is not licensed by the Financial Regulatory Authority. We do not buy, we do not sell, and we do not advise. Nothing here is a recommendation to trade any security.'
    };
    const ar = {
      nothingYet:'لم يُنشر شيء لهذا بعد.',
      peNote:'مكرر الربحية هو آخر إغلاق مقسوماً على آخر ربحية سهم أودعتها الشركة. والشركة التي لا ربح لها لا مكرر لها.',
      compareTitle:'السطر نفسه، فترة بفترة',
      compareNote:'لا تُقارَن إلا الفترات المتساوية في الطول. فالنصف الأول ستة أشهر والسنة اثنا عشر شهراً، والبورصة تودعهما تراكمياً — ووضعهما في صف واحد يقارن نصف عام بعام كامل.',
      compareNothing:'لا يوجد سطر مُودع لأكثر من فترة واحدة من الطول نفسه بعد.',
      moreFigures:'+{n} مُودعة',
      fullStatements:'{n} من {total} فترة تحمل قائمة كاملة. والباقي إعلانات، ذكرت فيها البورصة ربحاً ولا شيء غيره.',
      pickDay:'اختر يوماً',
      filedOnDay:'{n} إفصاحاً في {date}',
      nothingFiledThatDay:'لم يُنشر شيء في ذلك اليوم.',
      whatItMeans:'ما هذا النوع من الإفصاح',
      pickCompany:'انتقل إلى شركة',
      allSectors:'الكل',
      revGroupValuation:'ما تدفعه',
      revGroupBusiness:'النشاط',
      revGroupReturns:'عائده على',
      revGroupRisk:'كيف يُموَّل',
      revMeansTitle:'ما هو',
      revProofNote:'هذه هي القيم التي قُرئ منها الاتجاه — أرقام البورصة المودعة، من الأقدم إلى الأحدث.',
      revProofTitle:'الرقم، فترة بفترة',
      revOrientLabel:'أي اتجاه يُقرأ أفضل',
      revPeBody:'القيمة السوقية مقسومة على الربح: كم تدفع مقابل كل جنيه تربحه الشركة. انخفاض المضاعف قد يعني أن السعر رخص أو أن الأرباح تحسّنت، وهما حكايتان مختلفتان. وارتفاعه مع نمو سريع قد يعني أن السوق يدفع مقابل ما هو آتٍ؛ وارتفاعه مع نمو ثابت توسّع في التقييم. لا تقرأه أبداً بمعزل عن سطر الأرباح تحته.',
      revPbBody:'القيمة السوقية مقسومة على حقوق المساهمين. وأقل من 1 يعني أن السوق يقيّم الشركة دون حقوق ملكيتها الدفترية — وهذا لا يكون فرصة إلا إذا كانت الأصول مُنتِجة. اقرأه بجوار العائد على حقوق الملكية.',
      revYieldBody:'التوزيع السنوي منسوباً إلى سعر السهم، كما تنشره البورصة. وقد يرتفع العائد لمجرد أن السعر انهار، وقد توزّع الشركة بسخاء وتُبقي القليل للاستثمار. اقرأه بجوار الربح والمديونية.',
      revProfitBody:'ما أودعته الشركة كربح عن السنة كاملة، كما تسلّمته البورصة. والاتجاه يُقرأ من إشارة تغير كل سنة لا من نسبة مئوية، لأن النسبة المحسوبة على خسارة بلا معنى: الانتقال من خسارة إلى ربح ليس نمواً في رقم، بل شركة توقفت عن الخسارة.',
      revEpsBody:'الربح مقسوماً على عدد الأسهم المُصدرة. وهذا هو الرقم الذي يصمد أمام إصدار الشركة أسهماً جديدة: قد يرتفع إجمالي الربح بينما يربح كل سهم أقل. فحين تسمع أن الأرباح زادت، هذا هو السؤال التالي.',
      revAssetsBody:'ما تملكه الشركة، من ميزانيتها المودعة. وهذا يقوم مقام نمو الإيرادات الذي لا ينشره أي مصدر مصري: نمو الأصول دون نمو الربح هو التحذير نفسه الذي يعطيه تراجع الهامش — الشركة تضخّ أكثر لتخرج بالمثل.',
      revCashBody:'التدفق النقدي التشغيلي مقسوماً على الربح المعلن. وفوق 1 يعني أن الشركة حصّلت نقداً أكثر مما قيّدته ربحاً. وهذا يقوم مقام هامش الربح الذي يحتاج إيرادات لا يُنشرها أحد — بل لعله يجيب عن السؤال أفضل: حين يصعد الربح ولا يتبعه النقد، فذلك ما يستحق البحث.',
      revRoeBody:'الربح منسوباً إلى حقوق المساهمين: كم تربح الشركة على الأموال التي تركها ملّاكها فيها. والعائد المرتفع ليس مبهراً بالضرورة — فالاقتراض يُصغّر حقوق الملكية فترتفع النسبة دون أن يتحسّن النشاط. اقرأه دائماً بجوار نسبة الدين إلى حقوق الملكية.',
      revRoaBody:'الربح منسوباً إلى إجمالي الأصول. وخلافاً للعائد على حقوق الملكية، لا يستطيع الاقتراض تجميله — فالأصول تبقى في الدفاتر على أي حال. والفرق بين النسبتين هو تقريباً مقدار ما يأتي من الرافعة المالية.',
      revDebtBody:'إجمالي الالتزامات منسوباً إلى حقوق المساهمين. ورقم الدين المطلق يقول القليل بشكل مدهش: فشركة مدينة بعشرة مليارات قد تكون أمتن من أخرى مدينة بمليار، تبعاً لحجم النشاط خلفها. وارتفاع الدين ليس مشكلة تلقائياً كذلك — المهم ما تحرّك بجانبه. دين يرتفع الخُمس وأرباح ترتفع النصف يعني أن المال المقترض يعمل. أما دين يرتفع أربعة أخماس وربح يزحف 5% فتلك هي الحالة التي تستحق النظر.',
      revOrientPe:'الأقل هو الجانب الأرخص. مكرر ربحية أقل من القطاع يعني أنك تدفع أقل من نظائرها مقابل نفس الربح؛ والأعلى من القطاع يعني أنك تدفع أكثر. لكن انتبه: الرقم المنخفض جدًا قد يعني أن السوق يتوقع تراجع الربح.',
      revOrientPb:'الأقل هو الجانب الأرخص. أقل من القطاع يعني أنك تدفع أقل مقابل كل جنيه من القيمة الدفترية مقارنةً بنظائرها؛ والأعلى يعني أكثر. والرقم المنخفض جدًا قد يشير إلى أصول يشكّك السوق في قيمتها الدفترية.',
      revOrientYield:'الأعلى يدفع لك أكثر. أعلى من القطاع يعني نقدًا سنويًا أكبر لكل جنيه مقارنةً بنظائرها؛ والأقل أدنى. لكن العائد المرتفع جدًا غالبًا ينتج عن سعر سهم هبط، أو توزيع قد يُخفَّض — فالأعلى ليس دائمًا أكثر ثباتًا.',
      revOrientHigherMore:'الأعلى ببساطة أكثر — ربح أكبر أو أرباح أكبر لكل سهم. وأعلى من القطاع يعني أكثر من نظائرها، لكن الاتجاه بمرور الوقت هو الأهم: الصاعد أفضل قراءةً من الهابط.',
      revOrientCash:'الأعلى أصح. أعلى من القطاع يعني أن نصيبًا أكبر من الربح المُعلن وصل فعلًا كنقد مقارنةً بنظائرها — نقد في البنك لا ربح على الورق؛ والأقل يعني أن جزءًا أكبر لا يزال على الورق.',
      revOrientReturn:'الأعلى هو الجانب الأقوى. أعلى من القطاع يعني أن الشركة تحوّل كل جنيه موضوع فيها إلى ربح أكبر من نظائرها؛ والأقل أضعف. والثابت المرتفع أفضل قراءةً من المرتفع المتذبذب.',
      revOrientDebt:'الأقل هو الجانب الأكثر أمانًا. أقل من القطاع يعني أن الشركة اقترضت أقل مقابل أموالها الخاصة مقارنةً بنظائرها؛ والأعلى يحمل ديونًا أكثر — قد تموّل النمو لكنها تزيد المخاطر عند الضيق.',
      revOrientAssets:'الأعلى يعني ببساطة أكبر — تملك أكثر من نظائرها، لا أكثر. والحجم لا يفيد إلا إذا حققت الأصول عائدًا، وهو ما تُظهره صفوف الربح والعائد؛ فالأكبر ليس أقوى تلقائيًا.',
      revLabel:'الأرقام، وما ينبغي أن تسأله',
      revRising:'ترتفع',
      revFalling:'تنخفض',
      revFlat:'مستقرة',
      revAboveSector:'أعلى من قطاعها',
      revBelowSector:'أقل من قطاعها',
      revSectorMedian:'وسيط {sector}',
      revOverPeriods:'على مدى {n} فترة معلنة',
      revAgree:'{n} من {readable} مؤشرات مقروءة تحركت في الاتجاه نفسه.',
      revDisagree:'{up} تحرك في اتجاه و{down} في الاتجاه الآخر.',
      revAgreeAsk:'حين تتفق كلها، اسأل عمّا يعرفه السوق ولا تعرفه أنت.',
      revDisagreeAsk:'حين تختلف، فالاختلاف نفسه هو الحكاية. أيّها سبق الآخر؟',
      revMissingNote:'الإيرادات لا تنشرها البورصة ولا أي مصدر بيانات متاح من مصر، لذا لا يمكن عرض نمو الإيرادات ولا هامش الربح. ونمو الأصول وتحويل النقد يطرحان السؤال نفسه على أرقام منشورة فعلاً. أما نسبة الأسهم الحرة فلا تُنشر في أي مكان ولا بديل لها.',
      revAskTitle:'يستحق أن تسأل',
      revAnswerTitle:'إجابة مُرجَّحة',
      revProofTitle:'الرقم، فترة بفترة',
      revProofNote:'هذه هي القيم التي قُرئ منها الاتجاه — أرقام البورصة المودعة، من الأقدم إلى الأحدث.',
      revNowRising:'ترتفع الآن',
      revNowFalling:'تنخفض الآن',
      revNowFlat:'مستقرة الآن',
      revOnePoint:'رقم واحد منشور — لا يكفي من التاريخ لقراءة اتجاه.',
      revReadLabel:'القراءة',
      revCash:'تحويل الربح إلى نقد',
      revCashAsk:'من كل جنيه ربح معلن، كم وصل نقداً بالفعل؟',
      revPb:'السعر إلى القيمة الدفترية',
      revPbAsk:'أنت تدفع هذا مقابل كل جنيه من حقوق الملكية. فهل تُنتج هذه الأصول شيئاً؟',
      revPe:'مضاعف الربحية',
      revProfit:'صافي الربح',
      revEps:'ربحية السهم',
      revAssets:'إجمالي الأصول',
      revRoe:'العائد على حقوق الملكية',
      revRoa:'العائد على الأصول',
      revDebt:'الدين إلى حقوق الملكية',
      revYield:'عائد التوزيعات',
      revPeAsk:'لماذا يُسعَّر هكذا مقارنة بقطاعه — وماذا تفعل الأرباح تحته؟',
      revProfitAsk:'من أين جاء التغير — من النشاط، أم من شيء لن يتكرر؟',
      revEpsAsk:'ارتفع الربح — لكن هل ارتفع نصيب كل سهم منه؟',
      revAssetsAsk:'هل يكبر النشاط فعلاً، وهل يواكبه الربح؟',
      revRoeAsk:'عائد جيد على أموال المساهمين — أم على أموال مقترضة؟ راجع سطر المديونية.',
      revRoaAsk:'ما مدى كفاءة تشغيل كل ما تملكه الشركة؟',
      revDebtAsk:'ماذا فعلت الإدارة بالأموال المقترضة — وهل تُدرّ أكثر مما تكلّف؟',
      revYieldAsk:'هل التوزيع مدعوم بالربح والنقد — أم بسعر سهم هبط؟',
      feedCount:'{shown} من {total} عنواناً، الأحدث أولاً.',
      showMore:'عرض المزيد',
      busiest:'تداول بحجم غير معتاد',
      volumeKicker:'تداول {ratio}\u00d7 حجمه المعتاد',
      nothingUnusual:'لا شيء غير معتاد اليوم',
      busyWorkings:'الأسهم المتداولة في الجلسة \u00f7 وسيط آخر 20 جلسة. وعند 2.0 فأكثر، يصف هذا التطبيق اليوم بأنه غير معتاد.',
      busyYardstick:'الضعف هو الحد الفاصل، وهو حد يضعه هذا التطبيق لا البورصة \u2014 فلا أحد ينشر حدًا رسميًا. وهو عند هذا الرقم لأن يومًا بضعف حجم التداول المعتاد نادر بما يكفي ليستحق النظر، ومألوف بما يكفي ليحدث دون أن يكون هناك خطب ما.',
      archiveNote:'عرض {shown} من {total} إفصاحاً نُشرت في {month}.',
      breadthLine:'ارتفع {up} وتراجع {down} وثبت {flat}، من {counted} سهماً في جلسة {date}.',
      breadthWord:'ما اتساع الحركة',
      calWindow:'أُودعت بين {from} و{to} في {n} سنوات سابقة.',
      yieldWord:'العائد',
      macroMoved:'تحرك مع إيجي إكس 30 بمقدار {r} على مدى {n} جلسة.',
      macroBarely:'يكاد لا يتحرك مع إيجي إكس 30، {r} على مدى {n} جلسة.',
      sigFirstLoss:'{period} أول خسارة بعد {run} فترة معلنة رابحة.',
      sigBackToProfit:'{period} عودة إلى الربح بعد {run} فترة معلنة خاسرة.',
      sigHeldSince:'استمرت السلسلة منذ {year}.',
      sigFirstIn:'أول {label} منذ {years} سنوات.',
      sigPreviousWas:'وكانت السابقة في {year}.',
      sigQuiet:'لم تُفصح عن شيء منذ {days} يوماً، وهي تُفصح عادةً كل {gap}.',
      sigLastFiling:'آخر إفصاح {date}.',
      sigStreak:'سلسلة', sigFirst:'الأولى من نوعها', sigSilence:'صمت',
      sigFootnote:'أرقام محسوبة من سجل البورصة نفسه. أول خسارة ليست إشارة بيع، والعودة إلى الربح ليست إشارة شراء \u2014 هذا ما حدث، وما تراه فيه يخصك وحدك.',
      newsSourcedFrom:'عناوين من {outlets}، كل واحد منها موصول بالجهة التي نشرته.',
      newsMerged:'دُمج {count} خبرًا مكررًا.',
      newsWithheld:'حُجب {count} خبرًا لاحتوائه على توصية.',
      newsUnreachable:'تعذّر الوصول اليوم إلى: {outlets}.',
      noBorrowings:'لا يوجد إفصاح محفوظ لهذه الشركة يذكر قروضاً.',
      publisher:'ناشر · إفصاحات البورصة', session:'الجلسة', builtAt:'حُدِّث', theme:'المظهر', dataVersion:'إصدار البيانات',
      homeTitle:'الإغلاق', closeOf:'الإغلاق الرسمي ليوم', movers:'أكبر التحركات', readNow:'ما يُقرأ الآن', watchlist:'قائمة المتابعة',
      closeNote:'الإغلاق الرسمي من market.json، وليس سعراً لحظياً.',
      todayTitle:'اليوم', newestFirst:'الأحدث أولاً', readAtSource:'اقرأ في المصدر', outletImage:'صورة الجهة الناشرة',
      marketTitle:'السوق', searchPlaceholder:'ابحث في ٢٨٢ شركة — بالعربية أو الإنجليزية',
      foldNote:'يوحّد البحث الإملاء العربي: أ إ آ ٱ ← ا، ة ← ه، ى ئ ← ي، ؤ ← و، مع حذف الحركات والتطويل من الطرفين.',
      marketFoot:'الترتيب والتصفية يتمّان على الأرقام كما وردت في الإفصاح. لا يُنشر أي تصنيف للشركات.',
      noMatchTitle:'لا نتائج', noMatchBody:'لا توجد شركة في المجموعة المُفصح عنها تطابق هذا البحث وهذا القطاع.', clearFilters:'مسح التصفية',
      lastClose:'آخر إغلاق', asOf:'بتاريخ', priceHistory:'تاريخ السعر', sessionsShown:'جلسات', whoTheyAre:'من هي الشركة',
      asFiled:'القوائم المالية كما وردت', egpMillions:'بملايين الجنيهات ما لم يُذكر غير ذلك', period:'الفترة', revenue:'الإيرادات',
      grossProfit:'الربح الإجمالي', operatingIncome:'الربح التشغيلي', netIncome:'صافي الربح',
      cumulativeWarning:'الفترات تراكمية كما تُقدّمها البورصة. النصف الأول وتسعة أشهر أرقام من بداية العام ولا تُقارن بربع واحد. لا يُطرح شيء لاستخراج ربع، والخانة الفارغة رقم لم يذكره الإفصاح — وليست صفراً.',
      openFiling:'افتح الإفصاح', borrowingsTitle:'ما تفعله الشركة بقروضها', asAt:'كما في', borrowings:'القروض', egpM:'مليون جنيه',
      dueWithinYear:'يستحق خلال عام', dueLater:'يستحق لاحقاً', movementSince:'الحركة منذ', pattern:'النمط',
      whereFrom:'من أين جاءت هذه الأرقام',
      whereFromBody:'قُرئت من بنود القروض في الميزانية المُفصح عنها — القروض والتسهيلات البنكية والتزامات الإيجار، مجموعة بحسب تاريخ الاستحقاق. وليست من إجمالي الالتزامات الذي يضم دائنين ومخصصات ودفعات مقدمة من العملاء لم يقرضها أحد للشركة.',
      sourceFiling:'الإفصاح المصدر', openSignedDoc:'افتح المستند الموقّع', showSource:'من أين جاءت هذه الأرقام', hideSource:'إخفاء المصدر',
      notCreditRating:'هذا ليس تصنيفاً ائتمانياً. الأرقام أعلاه مذكورة كما وردت، دون درجة أو نطاق أو لون.',
      whatIsUnusual:'ما هو غير المعتاد', itsFilings:'إفصاحاتها', egxArchive:'أرشيف البورصة', document:'المستند',
      sectorsTitle:'القطاعات', sectorsWord:'قطاعاً', rose:'صعدت', fell:'هبطت', flat:'ثابتة', medianPE:'وسيط م/ر',
      calendarTitle:'التقويم', filed:'مُفصح عنه', expected:'متوقع', estimate:'تقدير',
      estimateNote:'التواريخ المتوقعة مُقدّرة من سجل إفصاحات كل شركة، وليست إعلانات.',
      exchangeTitle:'البورصة والاقتصاد', delayed15:'الأسعار متأخرة نحو ١٥ دقيقة', macro:'مؤشرات الاقتصاد بلغة واضحة',
      researchTitle:'الأبحاث', researchNote:'النطاقات تصف بطاقة تقييم الدراسة، ولا تصف أي ورقة مالية.',
      readPaper:'اقرأ الورقة', scorecard:'بطاقة التقييم', publisherStamp:'ESTHMR · ناشر',
      legalNotLicensed:'ESTHMR ناشر وغير مرخّص من الهيئة العامة للرقابة المالية. نحن لا نشتري ولا نبيع ولا نقدّم مشورة. لا شيء هنا توصية بالتعامل في أي ورقة مالية.'
    };
    return this.state.lang === 'ar' ? ar : en;
  }

  // ── helpers ──
  num(v, d) { if (v === null || v === undefined) return '—'; return v.toLocaleString('en-US',{minimumFractionDigits:d===undefined?2:d,maximumFractionDigits:d===undefined?2:d}); }
  signed(v, d) { if (v === null || v === undefined) return '—'; const s = v > 0 ? '+' : ''; return s + this.num(v, d); }
  pct(v) { if (v === null || v === undefined) return '—'; return (v>0?'+':'') + v.toFixed(2) + '%'; }
  dcol(v) { if (!v) return 'var(--faint)'; return v > 0 ? 'var(--up)' : 'var(--down)'; }
  fold(s) { return (s||'').toLowerCase().replace(/[أإآٱ]/g,'ا').replace(/ة/g,'ه').replace(/[ىئ]/g,'ي').replace(/ؤ/g,'و').replace(/[\u064B-\u0652\u0670\u0640]/g,''); }
  nm(o) { return this.state.lang === 'ar' ? (o.ar || o.en) : o.en; }
  /** The eight ratios, each with its own history and its sector beside it.
   *
   * This is the whole interpretive layer the pipeline publishes for 258
   * companies and the site had never opened. What makes it publishable by an
   * unlicensed publisher is the shape the app arrived at (§8): every card
   * states a figure, states which way it has been moving, says where the
   * sector's middle company sits, and then asks a QUESTION. The document's own
   * answer is printed under "A probable answer" and never as a conclusion.
   *
   * The prose is guarded at render rather than trusted. 1,452 strings in the
   * current corpus contain no directive, but the pipeline regenerates these and
   * a future run could word one badly. A card whose answer trips the guard
   * still shows its figure, its direction and its history — the numbers are
   * filed facts and are never the part at risk.
   */
  ratioCards(review, L, ar) {
    if (!review || !Array.isArray(review.metrics)) return [];
    // label, the question, what it is, and which way reads better.
    const NAME = {
      pe: [L.revPe, L.revPeAsk, L.revPeBody, L.revOrientPe],
      pb: [L.revPb, L.revPbAsk, L.revPbBody, L.revOrientPb],
      dividend_yield: [L.revYield, L.revYieldAsk, L.revYieldBody, L.revOrientYield],
      profit: [L.revProfit, L.revProfitAsk, L.revProfitBody, L.revOrientHigherMore],
      eps: [L.revEps, L.revEpsAsk, L.revEpsBody, L.revOrientHigherMore],
      assets: [L.revAssets, L.revAssetsAsk, L.revAssetsBody, L.revOrientAssets],
      cash_conversion: [L.revCash, L.revCashAsk, L.revCashBody, L.revOrientCash],
      roe: [L.revRoe, L.revRoeAsk, L.revRoeBody, L.revOrientReturn],
      roa: [L.revRoa, L.revRoaAsk, L.revRoaBody, L.revOrientReturn],
      debt_equity: [L.revDebt, L.revDebtAsk, L.revDebtBody, L.revOrientDebt],
    };
    const fmt = (v, unit) => {
      if (typeof v !== 'number' || !isFinite(v)) return '\u2014';
      if (unit === 'percent') return v.toFixed(1) + '%';
      if (unit === 'egp_m') return this.money(v * 1e6);
      if (unit === 'egp') return v.toFixed(2);
      return v.toFixed(2) + '\u00d7';
    };
    return review.metrics.map((m) => {
      const named = NAME[m.key];
      if (!named) return null;      // an unknown key degrades to nothing, never to a raw key
      const [label, ask, body, orient] = named;
      const rising = m.direction === 'rising';
      const falling = m.direction === 'falling';
      const answer = ar ? (m.answer_ar || m.answer) : m.answer;
      const safe = answer && !DIRECTIVE.test(answer) ? answer : '';
      const points = (m.series || []).map((x) => x.v).filter((v) => typeof v === 'number');
      return {
        key: m.key, label, ask,
        value: fmt(m.value, m.unit),
        // The direction is the app's sentence, not an arrow: an arrow beside a
        // ratio invites the reading that up is good, and for a P/E or a debt
        // ratio it is not.
        now: rising ? L.revNowRising : falling ? L.revNowFalling : L.revNowFlat,
        color: 'var(--t2)',
        periods: m.points ? L.revOverPeriods.replace('{n}', m.points) : '',
        onePoint: m.points === 1,
        peer: m.peer === 'above' ? L.revAboveSector : m.peer === 'below' ? L.revBelowSector : '',
        peerMedian: typeof m.peer_median === 'number'
          ? L.revSectorMedian.replace('{sector}', review.sector || '') + ' ' + fmt(m.peer_median, m.unit)
          : '',
        answer: safe, hasAnswer: Boolean(safe), hasAsk: Boolean(ask),
        spark: this.sparkFlat(points),
        hasSpark: points.length > 1,
        proof: (m.series || []).map((x) => ({ p: x.p, v: fmt(x.v, m.unit) })),
        // The same figures as a bar per period. A row of chips is a list you
        // read left to right; bars are a shape you take in at once, which is
        // the whole point of showing eleven quarters rather than the latest
        // one. Drawn from a zero baseline so a negative return on equity sits
        // BELOW the line rather than being flipped to look like a positive.
        bars: (() => {
          const vs = (m.series || []).map((x) => x.v).filter((v) => typeof v === 'number');
          if (vs.length < 2) return [];
          const hi = Math.max(0, ...vs), lo = Math.min(0, ...vs), span = (hi - lo) || 1;
          const zero = ((hi - 0) / span) * 100;
          return (m.series || []).map((x) => {
            const v = typeof x.v === 'number' ? x.v : 0;
            const top = ((hi - Math.max(v, 0)) / span) * 100;
            return {
              p: x.p, v: fmt(x.v, m.unit),
              // percentages inside the plot box, so the markup needs no maths
              top: top.toFixed(2) + '%',
              height: Math.max(1.5, (Math.abs(v) / span) * 100).toFixed(2) + '%',
              below: v < 0,
              fill: v < 0 ? 'var(--rule)' : 'var(--accent)',
            };
          });
        })(),
        zeroLine: (() => {
          const vs = (m.series || []).map((x) => x.v).filter((v) => typeof v === 'number');
          if (vs.length < 2) return null;
          const hi = Math.max(0, ...vs), lo = Math.min(0, ...vs), span = (hi - lo) || 1;
          return lo < 0 ? (((hi - 0) / span) * 100).toFixed(2) + '%' : null;
        })(),
        hasZeroLine: (() => {
          const vs = (m.series || []).map((x) => x.v).filter((v) => typeof v === 'number');
          return vs.length > 1 && Math.min(...vs) < 0;
        })(),
        hasProof: (m.series || []).length > 1,
        // What the ratio IS, and which way reads better — the two pieces of
        // teaching the app keeps one tap away rather than on the face.
        body: body || '', hasBody: Boolean(body),
        orient: orient || '', hasOrient: Boolean(orient),
      };
    }).filter(Boolean);
  }

  /** Signal rows as sentences, from the exchange's own filing record.
   *
   * Every number here is a count off the archive: how many reported periods a
   * run lasted, how many days of silence, how long since the last filing of
   * this kind. None of it is scored and none of it says what to do (§8) —
   * which is what the footnote under the block exists to say out loud. */
  signalCards(s, L, ar) {
    const fill = (t, vals) => Object.entries(vals)
      .reduce((out, [k, v]) => out.split('{' + k + '}').join(v), t);
    const year = (iso) => String(iso || '').slice(0, 4);
    const cards = [];
    for (const k of (s.streaks || []).slice(0, 3)) {
      cards.push({
        kind: L.sigStreak,
        title: fill(k.kind === 'first_loss' ? L.sigFirstLoss : L.sigBackToProfit,
          { period: k.period || '', run: k.run ?? '' }),
        because: k.since ? fill(L.sigHeldSince, { year: year(k.since) }) : '',
        stamp: [k.filed, k.id].filter(Boolean).join(' \u00b7 '),
        href: k.link || null,
      });
    }
    for (const f of (s.firsts || []).slice(0, 3 - cards.length)) {
      cards.push({
        kind: L.sigFirst,
        // gap_days is a raw count and reads as one; years is what a person
        // holds in their head.
        title: fill(L.sigFirstIn, { label: (ar ? f.label_ar : f.label) || f.label || '',
          years: Math.max(1, Math.round((f.gap_days || 0) / 365)) }),
        because: f.previous ? fill(L.sigPreviousWas, { year: year(f.previous) }) : '',
        stamp: [f.date, f.id].filter(Boolean).join(' \u00b7 '),
        href: f.link || null,
      });
    }
    const q = s.quiet;
    if (q && cards.length < 3) {
      cards.push({
        kind: L.sigSilence,
        title: fill(L.sigQuiet, { days: q.silent_days ?? '', gap: q.typical_gap ?? '' }),
        because: q.last_filed ? fill(L.sigLastFiling, { date: q.last_filed }) : '',
        stamp: 'signals.json',
        href: null,
      });
    }
    return cards;
  }

  /** The sentence under the feed. Empty when nothing was published about it. */
  provenance(p, L, ar) {
    if (!p || !(p.outlets || []).length) return '';
    const names = (ar ? p.outletsAr : p.outlets) || [];
    // Arabic takes the Arabic comma; English does not.
    const list = (xs) => xs.join(ar ? '\u060C ' : ', ');
    const parts = [L.newsSourcedFrom.replace('{outlets}', list(names))];
    if (p.merged) parts.push(L.newsMerged.replace('{count}', p.merged));
    if (p.withheld) parts.push(L.newsWithheld.replace('{count}', p.withheld));
    if ((p.unreachable || []).length) {
      parts.push(L.newsUnreachable.replace('{outlets}', list(p.unreachable)));
    }
    return parts.join(' ');
  }

  /** Whole pounds at a readable scale: 474.3bn, 4.19bn, 812m, 19.0m.
   *
   * companies.json states market_cap in whole EGP. The design divided by a
   * thousand and suffixed "B", which turned COMI's 474,267,676,058 into
   * "474267676.1B" — a string with no meaning at any scale. */
  money(v) {
    if (typeof v !== 'number' || !isFinite(v) || v <= 0) return '—';
    if (v >= 1e9) return (v / 1e9).toFixed(v >= 1e11 ? 1 : 2) + 'bn';
    if (v >= 1e6) return (v / 1e6).toFixed(v >= 1e8 ? 0 : 1) + 'm';
    return this.num(v, 0);
  }

  go(screen) { return () => this.setState({ screen }); }

  // ── fixtures ──
  /** Whatever the page is currently allowed to show. Set by main.js. */
  data() {
    return this._d || { companies: [], series: [], fins: [] };
  }

  /** Replace the dataset and redraw — used when a sign-in changes the answer. */
  setData(next) {
    this._d = next;
    if (this.onChange) this.onChange();
  }

  renderVals() {
    const L = this.copy(), st = this.state, ar = st.lang === 'ar';
    const D = this.data();
    const acc = this.props.accent || 'var(--accent)';

    // Real documents carry both languages side by side; the design's literals
    // choose inline with `ar ? … : …`. This picks the same way for a mapped
    // record, so a wired screen and a placeholder one behave identically.
    const say = (rows, fields) => rows.map((row) => {
      const out = Object.assign({}, row);
      fields.forEach((f) => {
        if (row[f + 'Ar'] !== undefined) out[f] = ar ? row[f + 'Ar'] : row[f];
      });
      return out;
    });

    const ICON = {
      home:'M3.2 10.6 12 3.4l8.8 7.2M5.8 9.4V20a.6.6 0 0 0 .6.6h11.2a.6.6 0 0 0 .6-.6V9.4M9.9 20.6v-5.4h4.2v5.4',
      today:'M4.4 5.2h15.2v13.6H4.4zM7.4 8.6h5.6v4.2H7.4zM15.6 9h1.9M15.6 11.6h1.9M7.4 16.2h10.1',
      market:'M4.2 20V11.2M9.4 20V4.6M14.6 20v-6.6M19.8 20V7.8M3 20.8h18',
      company:'M6.2 20.8V4.2a.6.6 0 0 1 .6-.6h7a.6.6 0 0 1 .6.6v16.6M13.8 9.4h3.4a.6.6 0 0 1 .6.6v10.8M8.8 7.6h3M8.8 11.2h3M8.8 14.8h3M4.4 20.8h15.4',
      sectors:'M4.2 4.2h6.4v6.4H4.2zM13.4 4.2h6.4v6.4h-6.4zM4.2 13.4h6.4v6.4H4.2zM13.4 13.4h6.4v6.4h-6.4',
      calendar:'M4.4 6.4h15.2v13.4H4.4zM4.4 10.8h15.2M8.4 3.4v4M15.6 3.4v4M8 14.4h2M14 14.4h2',
      exchange:'M3.6 8.4h13.8l-3.4-3.6M20.4 15.6H6.6l3.4 3.6',
      research:'M6 3.4h7.4l4.2 4.2v3.8M6 3.4v17.2h6.2M14.2 15.9a3.4 3.4 0 1 0 6.8 0 3.4 3.4 0 0 0-6.8 0M20.6 18.6 22.4 20.6'
    };

    // market table
    const q = this.fold(st.q);
    let rows = D.companies.filter(c => (st.sector === 'All' || c.sector === st.sector))
      .filter(c => !q || this.fold(c.name.en).includes(q) || this.fold(c.name.ar).includes(q) || this.fold(c.ticker).includes(q));
    const key = st.sort;
    rows = rows.slice().sort((a,b) => {
      const va = key === 'ticker' ? a.ticker : key === 'name' ? this.nm(a.name) : key === 'sector' ? a.sector : a[key];
      const vb = key === 'ticker' ? b.ticker : key === 'name' ? this.nm(b.name) : key === 'sector' ? b.sector : b[key];
      if (va === null || va === '—') return 1; if (vb === null || vb === '—') return -1;
      if (typeof va === 'string') return va.localeCompare(vb) * st.dir * -1;
      return (va - vb) * st.dir;
    });

    const colDef = [['ticker',ar?'الرمز':'Ticker','start'],['name',ar?'الاسم':'Company','start'],['sector',ar?'القطاع':'Sector','start'],
      ['close',ar?'الإغلاق':'Close','end'],['pct','%','end'],['cap',ar?'القيمة':'Cap','end'],['pe','P/E','end']];
    const cols = colDef.map(([id,label,align]) => ({
      label, align, caret: st.sort === id ? (st.dir === -1 ? ' ↓' : ' ↑') : '',
      color: st.sort === id ? 'var(--ink)' : 'var(--faint)',
      go: () => this.setState(s => ({ sort:id, dir: s.sort === id ? -s.dir : -1 }))
    }));

    const sectorList = ['All'].concat(Array.from(new Set(D.companies.map(c => c.sector))));
    const sectorChips = sectorList.map(s => {
      const on = st.sector === s;
      return { label: s === 'All' ? (ar?'الكل':'All sectors') : s, go: () => this.setState({ sector:s }),
        border: on ? 'transparent' : 'var(--rule)', color: on ? '#1B1917' : 'var(--t2)', bg: on ? 'var(--accent)' : 'transparent', sh: on ? 'var(--shPill)' : 'none' };
    });

    const mkRow = c => ({ ticker:c.ticker, name:this.nm(c.name), sector:c.sector,
      close: c.close === '—' ? '—' : this.num(c.close), pct: this.pct(c.pct), color: this.dcol(c.pct),
      cap: this.money(c.cap), pe: c.pe ? c.pe.toFixed(1) : '—',
      arrow: (c.pct === null || c.pct === undefined) ? '' : (c.pct > 0 ? '\u2197' : '\u2198'),
      mag: (c.pct === null || c.pct === undefined) ? '0%' : Math.max(6, Math.min(100, Math.abs(c.pct) / 6 * 100)).toFixed(0) + '%',
      go: () => this.setState({ screen:'company', ticker: c.ticker }) });

    // home
    const byMove = D.companies.filter(c => c.pct !== null).slice().sort((a,b) => Math.abs(b.pct) - Math.abs(a.pct));
    const movers = byMove.slice(0,9).map(mkRow);
    // The design named five tickers; a real dataset may not contain them, and a
    // demo deliberately does not. Prefer the named ones when present, then fill
    // from the largest companies, so the block is never short or empty-handed.
    const wanted = ['COMI','KORA','ETEL','TMGH','AMOC'];
    const picked = wanted.map(t => D.companies.find(c => c.ticker === t)).filter(Boolean);
    const byCap = D.companies.slice().sort((a,b) => (b.cap||0) - (a.cap||0));
    for (const c of byCap) { if (picked.length >= 5) break; if (!picked.includes(c)) picked.push(c); }
    const watchlist = picked.slice(0,5).map(mkRow);

    // Which shares changed hands far more than they usually do. Twice their
    // own twenty-session median is the line, and it is OURS rather than the
    // exchange's — which is why the block says so underneath rather than
    // presenting the threshold as a fact about the market. A busy day is a
    // question worth asking, not an answer (§8): nothing here says why the
    // volume was there or what to do about it.
    const BUSY_AT = 2;
    const busy = D.companies
      .filter((c) => typeof c.rv === 'number' && c.rv >= BUSY_AT)
      .sort((a, b) => b.rv - a.rv)
      .slice(0, 9)
      .map((c) => Object.assign({}, mkRow(c), {
        kicker: L.volumeKicker.replace('{ratio}', c.rv.toFixed(1)),
        rv: c.rv.toFixed(1) + '\u00d7',
      }));
    // 230 of the 282 listed carry both numbers; the rest cannot be measured
    // this way and are not silently counted as quiet.
    const busyMeasured = D.companies.filter((c) => typeof c.rv === 'number').length;

    // Both of these were design literals with no live source, so they never
    // failed and never went stale in a way anybody could see: a signed-in
    // reader was shown EGX 30 at 44,883.36 on a session that closed at
    // 55,106.50, and "Ezz Steel has had no closing price for four sessions"
    // about a company the archive says no such thing about. They now come from
    // the published documents, and a missing document leaves the block empty
    // rather than invented.
    const indices = say(D.indices || [], ['label']).map((ix) => Object.assign({}, ix, {
      spark: this.sparkOf(ix.points, ix.up),
    }));

    const readNow = say(D.readNow || [], ['kind', 'title']).map((r) => Object.assign({}, r, {
      go: r.ticker
        ? () => this.setState({ screen: 'company', ticker: r.ticker })
        : this.go(r.screen || 'calendar'),
    }));

    // today
    const allFeed = (D.feed ? say(D.feed, ['kind','headline','why','because','source']) : !D.demo ? [] : [
      { kind: ar?'إفصاح':'Filing', kindColor:'var(--accent)', tint:'var(--accTint)', time:'11:48', date:'2026-08-27', source:'EGX', href:'https://www.egx.com.eg',
        headline: ar?'كورّة: القوائم المالية المستقلة والمجمعة عن الفترة المنتهية ٣٠ يونيو ٢٠٢٦':'KORRA: standalone and consolidated statements for the period ended 30 June 2026',
        why: ar?'الميزانية تذكر قروضاً بـ ١٨٦٩٫١ مليون جنيه، منها ١٧٩٥٫٥ مليون تستحق خلال عام.':'The balance sheet states borrowings of EGP 1,869.1m, of which 1,795.5m falls due within a year.',
        tickers:[{ticker:'KORA',go:this.go('company')}] },
      { kind: ar?'خبر':'News', kindColor:'var(--t2)', tint:'var(--sunk)', time:'10:12', date:'2026-08-27', source:'Al Borsa', href:'https://alborsaanews.com',
        headline: ar?'السويدي إليكتريك توقّع عقداً لتوريد كابلات لمشروع نقل كهرباء':'El Sewedy Electric signs cable supply contract for power transmission project',
        why: ar?'الشركة لم تُفصح عن قيمة العقد للبورصة حتى وقت النشر.':'The company has not filed a contract value with the exchange as at publication.',
        tickers:[{ticker:'SWDY',go:this.go('company')}] },
      { kind: ar?'خبر':'News', kindColor:'var(--t2)', tint:'var(--sunk)', time:'09:35', date:'2026-08-27', source:'Enterprise', href:'https://enterprise.press',
        headline: ar?'إيرادات قناة السويس ترتفع للشهر الثالث على التوالي':'Suez Canal receipts rise for a third consecutive month',
        why: ar?'macro.json يذكر ٤٦١ مليون دولار لشهر يوليو، مقابل ٤٢٨ مليوناً في يونيو.':'macro.json states USD 461m for July against 428m in June.',
        tickers:[] },
      { kind: ar?'إفصاح':'Filing', kindColor:'var(--accent)', tint:'var(--accTint)', time:'16:02', date:'2026-08-26', source:'EGX', href:'https://www.egx.com.eg',
        headline: ar?'البنك التجاري الدولي: إفصاح عن توزيعات نقدية مرحلية':'Commercial International Bank: disclosure of an interim cash distribution',
        why: ar?'المستند الموقّع مُتاح في أرشيف الإفصاحات.':'The signed document is available in the disclosure archive.',
        tickers:[{ticker:'COMI',go:this.go('company')}] },
      { kind: ar?'خبر':'News', kindColor:'var(--t2)', tint:'var(--sunk)', time:'14:20', date:'2026-08-26', source:'Hapi Journal', href:'https://hapijournal.com',
        headline: ar?'الإسكندرية للزيوت المعدنية تنهي الجلسة بأعلى تحرك في القطاع':'Alexandria Mineral Oils ends the session with the sector’s largest move',
        why: ar?'market.json يذكر ٤٫٠٢٪ على حجم ١٫٢ مليون سهم.':'market.json states +4.02% on volume of 1.2m shares.',
        tickers:[{ticker:'AMOC',go:this.go('company')}] }
    ]).map((f) => Object.assign({}, f, {
      hasWhy: Boolean(f.why), hasBecause: Boolean(f.because),
      hasImage: Boolean(f.image),
      hasKind: f.hasKind === undefined ? Boolean(f.kind) : f.hasKind,
      // The design's ticker pills carry an onClick. On the live path the
      // mapper emitted {ticker} and nothing else, and dc.js attaches no
      // handler to a non-function — so every pill was inert and looked
      // exactly like the demo's working ones. Only offered for a company the
      // directory actually holds; a pill that opens an empty screen is worse
      // than no pill.
      tickers: (f.tickers || []).map((t) => (t.go ? t : Object.assign({}, t, {
        go: D.companies.some((c) => c.ticker === t.ticker)
          ? () => this.setState({ screen: 'company', ticker: t.ticker })
          : null,
      }))).filter((t) => t.go),
    }));

    // A page at a time. The list used to be cut at forty with nothing saying
    // so, which reads as "this is the news" rather than "this is some of it".
    const feed = allFeed.slice(0, st.feedShown || 40);

    // company
    const co0 = D.companies.find(c => c.ticker === 'KORA');
    const rangeMap = { '1W':5, '1M':21, '3M':63, '1Y':250, '5Y':1250 };
    const ranges = Object.keys(rangeMap).map(k => ({ label:k, go: () => this.setState({ range:k }),
      color: st.range === k ? 'var(--ink)' : 'var(--t2)', bg: st.range === k ? 'var(--surface)' : 'transparent', sh: st.range === k ? 'var(--shPill)' : 'none' }));
    const slice = D.series.slice(-rangeMap[st.range]);
    const chart = this.buildChart(slice);

    // The company on screen. `this._co` is the loaded document, set by main.js
    // when a ticker is opened; the literal below is the design's worked
    // example and remains the shape everything else is written against.
    const loaded = this._co && this._co.ticker === st.ticker ? this._co : null;
    const coDesign = {
      ticker:'KORA', sector: ar?'المرافق':'Utilities', exchange:'EGX', nameEn:'KORRA', nameAr:'كورّة',
      close: this.num(12.40), chg:'−0.40', pct:'−3.12%', color:'var(--down)', arrow:'\u2198', closeDate:'2026-08-26',
      brief: ar?'كورّة شركة مرافق مقيدة في البورصة المصرية، تُشغّل أصول توليد وتوزيع وتُفصح عن نتائجها ربع سنوية بالجنيه المصري. النص أعلاه مأخوذ من briefs/KORA.json كما وُلّد في البناء اليومي.'
        :'KORRA is a utilities company listed on the Egyptian Exchange. It operates generation and distribution assets and files quarterly results in Egyptian pounds. This description is rendered from briefs/KORA.json as generated in the daily build.',
      briefFacts:[
        { label: ar?'القطاع':'Sector', value: ar?'المرافق':'Utilities' },
        { label: ar?'الأسهم المُصدرة':'Shares outstanding', value:'337,096,774' },
        { label: ar?'وحدة الإفصاح':'Filing currency', value:'EGP' }
      ],
      briefSource:'briefs/KORA.json · generated 2026-08-27',
      stats:[
        { label: ar?'القيمة السوقية':'Market cap', value:'4,180', color:'var(--ink)' },
        { label: ar?'أسبوع':'1W', value:'−1.84%', color:'var(--down)' },
        { label: ar?'شهر':'1M', value:'+6.21%', color:'var(--up)' },
        { label: ar?'الحجم':'Volume', value:'118,422', color:'var(--ink)' },
        { label:'P/E', value:'11.2', color:'var(--ink)' },
        { label: ar?'ربحية السهم':'EPS', value:'1.11', color:'var(--ink)' }
      ]
    };

    // Live, before a document lands — and live for a company whose document
    // carries none of these fields — the screen shows dashes. It used to show
    // the design's worked example: KORRA, a utilities company that does not
    // exist, at 12.40, with a description explaining what briefs/KORA.json
    // would have said. Under a real ticker in the header, that is an invented
    // company file.
    const co = D.demo ? Object.assign({}, coDesign) : {
      ticker: st.ticker || '—', sector:'—', exchange:'EGX',
      nameEn: st.ticker || '—', nameAr: st.ticker || '—',
      close:'—', chg:'—', pct:'—', color:'var(--faint)', arrow:'', closeDate:'—',
      brief: L.nothingYet, briefFacts: [], briefSource:'—', stats: [],
    };

    if (loaded) {
      const pct = loaded.pct === null || loaded.pct === undefined ? null : loaded.pct;
      const p = loaded.profile || {};
      const perf = (v) => (v === null || v === undefined ? '—' : this.pct(v));
      const whole = (v) => (v === null || v === undefined ? '—' : this.num(v, 0));
      Object.assign(co, {
        brief: (ar ? loaded.briefAr : loaded.brief) || L.nothingYet,
        briefFacts: [
          { label: ar?'القطاع':'Sector', value: loaded.sector || '—' },
          { label: ar?'الأسهم المُصدرة':'Shares outstanding', value: whole(p.shares_outstanding) },
          { label: ar?'وحدة الإفصاح':'Filing currency', value:'EGP' },
        ],
        stats: [
          { label: ar?'القيمة السوقية':'Market cap', value: this.money(p.market_cap), color:'var(--ink)' },
          { label: ar?'أسبوع':'1W', value: perf(p.perf_1w), color: this.dcol(p.perf_1w) },
          { label: ar?'شهر':'1M', value: perf(p.perf_1m), color: this.dcol(p.perf_1m) },
          { label: ar?'الحجم':'Volume', value: whole(p.avg_volume_30d), color:'var(--ink)' },
          { label:'P/E',
            value: (() => {
              const fromReview = D.review && (D.review.metrics || [])
                .find((m) => m.key === 'pe' && typeof m.value === 'number');
              if (fromReview) return this.num(fromReview.value, 1);
              return typeof loaded.pe === 'number' ? this.num(loaded.pe, 1) : '\u2014';
            })(),
            color:'var(--ink)' },
          { label: ar?'ربحية السهم':'EPS',
            value: typeof loaded.eps === 'number' ? this.num(loaded.eps, 2) : '\u2014',
            color: typeof loaded.eps === 'number' ? 'var(--ink)' : 'var(--faint)' },
        ],
        ticker: loaded.ticker,
        nameEn: loaded.name && loaded.name.en ? loaded.name.en : loaded.ticker,
        nameAr: loaded.name && loaded.name.ar ? loaded.name.ar : (loaded.name && loaded.name.en) || loaded.ticker,
        sector: loaded.sector || co.sector,
        close: loaded.close === null || loaded.close === undefined ? '—' : this.num(loaded.close),
        pct: pct === null ? '—' : this.pct(pct),
        color: this.dcol(pct),
        arrow: pct === null ? '' : (pct > 0 ? '\u2197' : '\u2198'),
        closeDate: loaded.closeDate || D.marketDate || co.closeDate,
        briefSource: loaded.briefSource || `companies/${loaded.ticker}.json`,
      });
    }

    // A rail of every listed company, so changing company does not mean going
    // back to the market table and finding it again. Grouped by sector because
    // 282 tickers in one strip is a haystack, and the sector a reader is
    // already looking at is the one they are most likely to want another of.
    const pickSector = st.pickSector || (co.sector || 'All');
    const pickSectors = [L.allSectors].concat(
      Array.from(new Set(D.companies.map((c) => c.sector).filter(Boolean))).sort());
    const pickList = D.companies
      .filter((c) => pickSector === L.allSectors || pickSector === 'All' || c.sector === pickSector)
      .slice()
      .sort((a, b) => (b.cap || 0) - (a.cap || 0))
      .map((c) => ({
        ticker: c.ticker,
        name: this.nm(c.name),
        pct: c.pct === null || c.pct === undefined ? '' : this.pct(c.pct),
        color: this.dcol(c.pct),
        on: c.ticker === st.ticker,
        bg: c.ticker === st.ticker ? 'var(--accTint)' : 'var(--sunk)',
        fg: c.ticker === st.ticker ? 'var(--accent)' : 'var(--t2)',
        go: () => this.setState({ screen: 'company', ticker: c.ticker }),
      }));
    const pickChips = pickSectors.map((name) => ({
      name,
      on: name === pickSector,
      bg: name === pickSector ? 'var(--surface)' : 'transparent',
      fg: name === pickSector ? 'var(--ink)' : 'var(--t2)',
      sh: name === pickSector ? 'var(--shPill)' : 'none',
      go: () => this.setState({ pickSector: name }),
    }));

    // ── the same line, period by period ────────────────────────────────
    //
    // The table above is one row per period and four columns; everything else
    // a filing states is behind a plus, one period at a time. That is fine for
    // reading a filing and useless for seeing what a number has been DOING,
    // which is the question anybody looking at three years of statements
    // actually has.
    //
    // Periods are only lined up with periods of the SAME LENGTH. The exchange
    // files cumulatively — an H1 is six months, a 9M is nine, an FY is twelve
    // — so putting them in one row would compare half a year with a whole one
    // and draw a saw-tooth that means nothing. The type is chosen, and only
    // that type is compared.
    const LINES = [
      ['revenue', ar ? 'الإيرادات' : 'Revenue'],
      ['gross_profit', ar ? 'مجمل الربح' : 'Gross profit'],
      ['operating_income', ar ? 'الربح التشغيلي' : 'Operating income'],
      ['net_income', ar ? 'صافي الربح' : 'Net profit'],
      ['assets', ar ? 'الأصول' : 'Assets'],
      ['liabilities', ar ? 'الالتزامات' : 'Liabilities'],
      ['equity', ar ? 'حقوق الملكية' : 'Equity'],
      ['debt', ar ? 'إجمالي القروض' : 'Borrowings'],
      ['short_term_debt', ar ? 'قصير الأجل' : 'Short-term borrowings'],
      ['long_term_debt', ar ? 'طويل الأجل' : 'Long-term borrowings'],
      ['cash', ar ? 'النقد' : 'Cash'],
      ['finance_cost', ar ? 'تكلفة التمويل' : 'Finance cost'],
      ['operating_cash_flow', ar ? 'التدفق التشغيلي' : 'Operating cash flow'],
      ['investing_cash_flow', ar ? 'التدفق الاستثماري' : 'Investing cash flow'],
      ['financing_cash_flow', ar ? 'التدفق التمويلي' : 'Financing cash flow'],
      ['net_change_in_cash', ar ? 'صافي التغير في النقد' : 'Net change in cash'],
      ['dividends_paid', ar ? 'توزيعات مدفوعة' : 'Dividends paid'],
    ];
    const typeOf = (label) => {
      const m = /^(FY|H1|H2|9M|Q1|Q2|Q3|Q4)\b/.exec(String(label || ''));
      return m ? m[1] : '';
    };
    // Sorting on period_end alone put "Q1 2014" between 2024 and 2025: many
    // rows carry no period_end at all, sorted as an empty string, and landed
    // in a clump at the front. The label always carries the year and the type
    // always implies the month it ends in, so a missing date is recoverable
    // rather than fatal.
    const ENDS = { FY: '12-31', H1: '06-30', H2: '12-31', '9M': '09-30',
                   Q1: '03-31', Q2: '06-30', Q3: '09-30', Q4: '12-31' };
    const periodKey = (f) => {
      if (f.period_end) return String(f.period_end);
      const year = (/(\d{4})/.exec(String(f.period || '')) || [])[1];
      const t = typeOf(f.period);
      return year && ENDS[t] ? `${year}-${ENDS[t]}` : '';
    };
    const rowsByType = new Map();
    for (const f of D.fins) {
      const t = typeOf(f.period);
      if (!t) continue;
      if (!rowsByType.has(t)) rowsByType.set(t, []);
      rowsByType.get(t).push(f);
    }
    // Only a type with more than one period is worth comparing at all.
    const compareTypes = [...rowsByType.entries()]
      .filter(([, rows]) => rows.length > 1)
      .map(([t, rows]) => ({ t, n: rows.length,
        newest: rows.reduce((a, b) => (periodKey(a) > periodKey(b) ? a : b)) }))
      .sort((a, b) => periodKey(b.newest).localeCompare(periodKey(a.newest)));
    const compareType = st.compareType && rowsByType.has(st.compareType)
      ? st.compareType : (compareTypes[0] && compareTypes[0].t) || '';
    const comparePeriods = (rowsByType.get(compareType) || [])
      .slice()
      .sort((a, b) => periodKey(a).localeCompare(periodKey(b)))
      .slice(-8);                       // oldest to newest, the last eight                       // oldest to newest, the last eight
    const compareRows = LINES.map(([key, label]) => {
      const cells = comparePeriods.map((f) => f[key]);
      if (!cells.some((v) => typeof v === 'number')) return null;
      const nums = cells.filter((v) => typeof v === 'number');
      const hi = Math.max(0, ...nums), lo = Math.min(0, ...nums), span = (hi - lo) || 1;
      return {
        label,
        cells: cells.map((v, i) => ({
          period: comparePeriods[i].period,
          v: typeof v === 'number' ? this.num(v, 1) : '\u2014',
          has: typeof v === 'number',
          // a bar per period, from a real zero, so a negative cash flow reads
          // as one rather than as a small positive
          top: (((hi - Math.max(v || 0, 0)) / span) * 100).toFixed(2) + '%',
          height: Math.max(1.5, (Math.abs(v || 0) / span) * 100).toFixed(2) + '%',
          fill: (v || 0) < 0 ? 'var(--rule)' : 'var(--accent)',
          color: (typeof v === 'number' && v < 0) ? 'var(--down)' : 'var(--ink)',
        })),
      };
    }).filter(Boolean);
    const compareChips = compareTypes.map(({ t, n }) => ({
      name: t, count: n,
      on: t === compareType,
      bg: t === compareType ? 'var(--surface)' : 'transparent',
      fg: t === compareType ? 'var(--ink)' : 'var(--t2)',
      sh: t === compareType ? 'var(--shPill)' : 'none',
      go: () => this.setState({ compareType: t }),
    }));

    const dense = (this.props.density || 'editorial') === 'dense';
    const fins = D.fins.map((f,i) => {
      const open = dense || !!st.open[f.period];
      const g = (label, items) => ({ label, items: items.filter(x => x[1] !== null && x[1] !== undefined)
        .map(([k,v,d]) => ({ k, v: this.num(v, d), color: (typeof v === 'number' && v < 0) ? 'var(--down)' : 'var(--ink)' })) });
      const groups = [
        g(ar?'الميزانية':'Balance sheet', [[ar?'الأصول':'Assets',f.assets],[ar?'الالتزامات':'Liabilities',f.liabilities],[ar?'حقوق الملكية':'Equity',f.equity]]),
        g(ar?'القروض':'Borrowings', [[ar?'إجمالي القروض':'Total',f.debt],[ar?'قصير الأجل':'Short-term',f.short_term_debt],[ar?'طويل الأجل':'Long-term',f.long_term_debt],[ar?'النقد':'Cash',f.cash],[ar?'تكلفة التمويل':'Finance cost',f.finance_cost]]),
        g(ar?'التدفقات النقدية':'Cash flow', [[ar?'تشغيلي':'Operating',f.operating_cash_flow],[ar?'استثماري':'Investing',f.investing_cash_flow],[ar?'تمويلي':'Financing',f.financing_cash_flow],[ar?'صافي التغير':'Net change',f.net_change_in_cash]]),
        g(ar?'التوزيعات':'Distributions', [[ar?'توزيعات مدفوعة':'Dividends paid',f.dividends_paid]])
      ].filter(x => x.items.length);
      const total = 15, present = groups.reduce((n,x) => n + x.items.length, 0);
      return {
        period:f.period, window:f.window, bg: i === 0 ? 'var(--sunk)' : 'transparent',
        revenue:this.num(f.revenue,1), grossProfit:this.num(f.gross_profit,1), operatingIncome:this.num(f.operating_income,1), netIncome:this.num(f.net_income,1),
        revColor: f.revenue === null ? 'var(--faint)' : 'var(--ink)', gpColor: f.gross_profit === null ? 'var(--faint)' : 'var(--ink)',
        opColor: f.operating_income === null ? 'var(--faint)' : 'var(--ink)', niColor: f.net_income === null ? 'var(--faint)' : 'var(--ink)',
        caret: open ? '\u2212' : '+', open, groups,
        more: present ? L.moreFigures.replace('{n}', present) : '',
        hasMore: present > 0,
        toggle: () => this.setState(s => ({ open: Object.assign({}, s.open, { [f.period]: !s.open[f.period] }) })),
        filingId:f.filing_id, filedOn: (f.filed || f.filed_on) ? (ar?'أُودع ':'Filed ') + (f.filed || f.filed_on) : '',
        source: f.source || 'https://www.egx.com.eg',
        omitted: (total - present) > 0 ? ((ar?'':'') + (total-present) + (ar?' حقلاً لم يذكره الإفصاح':' fields not stated in this filing')) : (ar?'كل الحقول مذكورة':'All fields stated')
      };
    });

    const debtDesign = {
      period:'H1 2026', asOf:'2026-06-30', frame:'operating', basis:'balance_sheet', filingId:'egx-293566', source:'https://www.egx.com.eg',
      borrowings: this.num(1869.119,1), shortTerm: this.num(1795.468,1), longTerm: this.num(73.652,1), stPct: '96%',
      metrics:[
        { label: ar?'النقد':'Cash', value: this.num(375.378,1), note: ar?'كما في ٣٠ يونيو ٢٠٢٦':'As at 30 June 2026' },
        { label: ar?'صافي القروض':'Net debt', value: this.num(1493.741,1), note: ar?'القروض ناقص النقد':'Borrowings less cash' },
        { label: ar?'تكلفة التمويل':'Finance cost', value: this.num(206.506,1), note: ar?'لهذه الفترة، وليست سنوية':'For this period, not annualised' },
        { label: ar?'التغطية':'Cover', value:'1.92×', note: ar?'الربح التشغيلي ÷ تكلفة التمويل':'Operating profit ÷ finance cost' },
        { label: ar?'الرفع المالي':'Gearing', value:'1.22×', note: ar?'القروض ÷ حقوق الملكية':'Borrowings ÷ equity' },
        { label: ar?'يستحق خلال عام':'Due within a year', value:'96%', note: ar?'من إجمالي القروض':'Of total borrowings' }
      ],
      since: ar?'٣١ ديسمبر ٢٠٢٥':'31 December 2025',
      delta:'+252.1', deltaColor:'var(--ink)',
      directionLine: ar?'أعلى منها في ٣١ ديسمبر ٢٠٢٥، حيث كانت ١٦١٧٫٠ مليون جنيه':'Higher than at 31 December 2025, when they were 1,617.0',
      basisLine: ar?'الأساس: العمود المقارن في الميزانية نفسها (balance_sheet) — وليس مقارنة بالعام السابق.':'Basis: the statement’s own prior column (balance_sheet) — not a comparison with a year ago.',
      patternLine: ar?'جمعت الشركة أموالاً وأنفقت على أصول خلال الفترة نفسها.':'It raised money and spent on assets over the same period.',
      flows:[
        { label: ar?'تدفق تشغيلي':'Operating cash flow', value:this.signed(88.149,1), color:'var(--up)' },
        { label: ar?'تدفق استثماري':'Investing cash flow', value:this.signed(-55.781,1), color:'var(--down)' },
        { label: ar?'تدفق تمويلي':'Financing cash flow', value:this.signed(13.268,1), color:'var(--up)' }
      ],
      read: ar?'خلال الفترة، بلغت القروض المذكورة في الميزانية ١٨٦٩٫١ مليون جنيه، يستحق ١٧٩٥٫٥ مليون منها خلال عام، مقابل نقد قدره ٣٧٥٫٤ مليون. وكانت تكلفة التمويل ٢٠٦٫٥ مليون جنيه لهذه الفترة.'
        :'During the period, the balance sheet stated borrowings of 1,869.1, of which 1,795.5 falls due within a year, against cash of 375.4. Finance cost was 206.5 for the period.',
      open: st.debtOpen, toggle: () => this.setState(s => ({ debtOpen: !s.debtOpen })),
      toggleLabel: st.debtOpen ? L.hideSource : L.showSource, toggleCaret: st.debtOpen ? '↑' : '↓'
    };

    // Every company's borrowings block was this same worked example: 1,869.1
    // stated, 1,795.5 due within a year, cover 1.92×. Printed under a real
    // ticker that is a fabricated financial figure about a real issuer — the
    // exact thing scripts/build_debt.py exists to prevent — and the real block
    // was sitting unread in the company's own document all along.
    const d0 = loaded && loaded.debt;
    const debt = D.demo && !d0 ? debtDesign : !d0 ? null : {
      period: d0.period, asOf: d0.as_of, frame: d0.frame, basis: (d0.change || {}).basis,
      filingId: d0.filing_id, source: d0.source || 'https://www.egx.com.eg',
      borrowings: this.num(d0.borrowings, 1), shortTerm: this.num(d0.short_term, 1),
      longTerm: this.num(d0.long_term, 1),
      stPct: d0.due_within_year === null || d0.due_within_year === undefined
        ? '—' : Math.round(d0.due_within_year * 100) + '%',
      metrics: [
        { label: ar?'النقد':'Cash', value: this.num(d0.cash, 1), note: (ar?'كما في ':'As at ') + d0.as_of },
        { label: ar?'صافي القروض':'Net debt', value: this.num(d0.net_debt, 1), note: ar?'القروض ناقص النقد':'Borrowings less cash' },
        { label: ar?'تكلفة التمويل':'Finance cost', value: this.num(d0.finance_cost, 1), note: ar?'لهذه الفترة، وليست سنوية':'For this period, not annualised' },
        { label: ar?'التغطية':'Cover', value: d0.cover === null || d0.cover === undefined ? '—' : this.num(d0.cover, 2) + '×', note: ar?'الربح التشغيلي ÷ تكلفة التمويل':'Operating profit ÷ finance cost' },
        { label: ar?'الرفع المالي':'Gearing', value: d0.gearing === null || d0.gearing === undefined ? '—' : this.num(d0.gearing, 2) + '×', note: ar?'القروض ÷ حقوق الملكية':'Borrowings ÷ equity' },
        { label: ar?'يستحق خلال عام':'Due within a year', value: d0.due_within_year === null || d0.due_within_year === undefined ? '—' : Math.round(d0.due_within_year * 100) + '%', note: ar?'من إجمالي القروض':'Of total borrowings' },
      ],
      since: (d0.change || {}).since || '—',
      delta: (d0.change || {}).delta === null || (d0.change || {}).delta === undefined
        ? '—' : this.signed(d0.change.delta, 1),
      deltaColor: 'var(--ink)',
      // These three lines are the §8 boundary: they describe what the filing
      // states and what moved, never what to do about it. They are written by
      // build_debt_reads.py against the directions alone, and are carried here
      // verbatim rather than re-phrased.
      directionLine: (d0.change || {}).direction
        ? (ar ? 'مقارنةً بـ ' : 'Against ') + ((d0.change || {}).since || '') + ': '
          + this.num((d0.change || {}).borrowings, 1)
        : '—',
      basisLine: (d0.change || {}).basis === 'balance_sheet'
        ? (ar?'الأساس: العمود المقارن في الميزانية نفسها — وليس مقارنة بالعام السابق.'
             :'Basis: the statement\u2019s own prior column \u2014 not a comparison with a year ago.')
        : '',
      // The document names the shape from a closed set; these are the same
      // eight names in words. Each describes what the cash-flow statement
      // shows over the period and nothing about what it would mean to hold
      // the share (§8).
      patternLine: {
        raised_while_operations_consumed_cash: ar
          ? 'اقترضت الشركة بينما لم تولد عملياتها المعتادة نقداً خلال الفترة نفسها.'
          : 'It borrowed while its regular operations did not generate cash over the same period.',
        raised_and_invested: ar
          ? 'جمعت الشركة أموالاً وأنفقت على أصول خلال الفترة نفسها.'
          : 'It raised money and spent on assets over the same period.',
        raised_and_held: ar
          ? 'جمعت الشركة أموالاً دون إنفاق يُذكر على الأصول خلال الفترة نفسها.'
          : 'It raised money without notable spending on assets over the same period.',
        repaid_from_operating_cash: ar
          ? 'سددت الشركة من نقد ولّدته عملياتها المعتادة خلال الفترة نفسها.'
          : 'It repaid out of cash its regular operations generated over the same period.',
        repaid_without_operating_cash: ar
          ? 'سددت الشركة رغم أن عملياتها المعتادة لم تولد نقداً خلال الفترة نفسها.'
          : 'It repaid even though its regular operations did not generate cash over the same period.',
        funding_raised: ar ? 'صافي التمويل داخل خلال الفترة.'
          : 'Net funding came in over the period.',
        funding_repaid: ar ? 'صافي التمويل خارج خلال الفترة.'
          : 'Net funding went out over the period.',
        little_movement: ar ? 'لم يتحرك التمويل بشكل يُذكر خلال الفترة.'
          : 'Funding barely moved over the period.',
      }[d0.pattern] || '',
      flows: [
        { label: ar?'تدفق تشغيلي':'Operating cash flow', value: this.signed((d0.movement||{}).operating_cash_flow, 1), color: this.dcol((d0.movement||{}).operating_cash_flow) },
        { label: ar?'تدفق استثماري':'Investing cash flow', value: this.signed((d0.movement||{}).investing_cash_flow, 1), color: this.dcol((d0.movement||{}).investing_cash_flow) },
        { label: ar?'تدفق تمويلي':'Financing cash flow', value: this.signed((d0.movement||{}).financing_cash_flow, 1), color: this.dcol((d0.movement||{}).financing_cash_flow) },
      ],
      read: (ar ? (d0.read||{}).read_ar : (d0.read||{}).read) || '',
      open: st.debtOpen, toggle: () => this.setState((s) => ({ debtOpen: !s.debtOpen })),
      toggleLabel: st.debtOpen ? L.hideSource : L.showSource,
      toggleCaret: st.debtOpen ? '↑' : '↓',
    };

    const ratios = this.ratioCards(D.review, L, ar);
    // The app's four groups, in the app's order. A metric the document does
    // not carry drops out; a group with nothing left renders nothing rather
    // than an empty heading (review_sheet.dart, _groups).
    const byKey = new Map(ratios.map((r) => [r.key, r]));
    const ratioGroups = [
      [L.revGroupValuation, ['pe', 'pb', 'dividend_yield']],
      [L.revGroupBusiness, ['profit', 'eps', 'assets', 'cash_conversion']],
      [L.revGroupReturns, ['roe', 'roa']],
      [L.revGroupRisk, ['debt_equity']],
    ].map(([title, keys]) => ({
      title,
      items: keys.map((k) => byKey.get(k)).filter(Boolean)
        .map((r) => Object.assign({}, r, {
          open: Boolean(st.openRatio && st.openRatio[r.key]),
          caret: (st.openRatio && st.openRatio[r.key]) ? '\u2212' : '+',
          toggle: () => this.setState((x) => ({
            openRatio: Object.assign({}, x.openRatio, { [r.key]: !(x.openRatio || {})[r.key] }),
          })),
        })),
    })).filter((g) => g.items.length);
    const pat = (D.review && D.review.pattern) || null;
    const up = pat ? (pat.improving || []).length : 0;
    const down = pat ? (pat.deteriorating || []).length : 0;
    const readable = pat ? (pat.readable || up + down) : 0;
    const agreement = !pat ? ''
      : (down === 0 || up === 0)
        ? L.revAgree.replace('{n}', Math.max(up, down)).replace('{readable}', readable)
        : L.revDisagree.replace('{up}', up).replace('{down}', down);
    const agreementAsk = !pat ? '' : (down === 0 || up === 0) ? L.revAgreeAsk : L.revDisagreeAsk;

    const signals = (D.signals && !Array.isArray(D.signals))
      ? this.signalCards(D.signals, L, ar)
      : D.signals ? say(D.signals, ['kind','title','because']) : !D.demo ? [] : [
      { kind: ar?'انقطاع نمط':'Streak break', title: ar?'أول جلسة هبوط بعد خمس جلسات صاعدة':'First falling session after five rising ones', because: ar?'market.json يذكر −٣٫١٢٪ يوم ٢٦ أغسطس، بعد خمس جلسات مغلقة على ارتفاع.':'market.json states −3.12% on 26 August, following five consecutive higher closes.', stamp:'signals/KORA · 2026-08-26' },
      { kind: ar?'حركة القروض':'Borrowings moved', title: ar?'القروض قصيرة الأجل أعلى بـ ٢٩٧٫١ مليون منها في ٣١ ديسمبر':'Short-term borrowings 297.1 higher than at 31 December', because: ar?'١٧٩٥٫٥ مقابل ١٤٩٨٫٣ في العمود المقارن للميزانية نفسها.':'1,795.5 against 1,498.3 in the statement’s own prior column.', stamp:'signals/KORA · egx-293566' },
      { kind: ar?'نتائج مرتقبة':'Results due', title: ar?'إفصاح تسعة أشهر متوقع في نوفمبر بحسب سجل الشركة':'A 9M filing is expected in November on the company’s own history', because: ar?'أُودعت الإفصاحات المكافئة في ١١ نوفمبر ٢٠٢٥ و١٢ نوفمبر ٢٠٢٤. تقدير، وليس إعلاناً.':'Equivalent filings landed on 11 November 2025 and 12 November 2024. An estimate, not an announcement.', stamp:'calendar.json · estimate' }
    ];

    const filings = D.filings ? say(D.filings, ['title']) : !D.demo ? [] : [
      { date:'2026-08-14', title: ar?'القوائم المالية للفترة المنتهية ٣٠ يونيو ٢٠٢٦':'Financial statements for the period ended 30 June 2026', id:'egx-293566', href:'https://www.egx.com.eg' },
      { date:'2026-05-12', title: ar?'القوائم المالية للربع الأول ٢٠٢٦':'Financial statements for Q1 2026', id:'egx-288104', href:'https://www.egx.com.eg' },
      { date:'2026-03-28', title: ar?'القوائم المالية السنوية ٢٠٢٥ وتقرير مراقب الحسابات':'Annual financial statements 2025 with auditor’s report', id:'egx-271340', href:'https://www.egx.com.eg' },
      { date:'2026-03-02', title: ar?'إفصاح عن دعوة الجمعية العامة العادية':'Notice convening the ordinary general assembly', id:'egx-269911', href:'https://www.egx.com.eg' },
      { date:'2025-11-11', title: ar?'القوائم المالية لتسعة أشهر ٢٠٢٥':'Financial statements for 9M 2025', id:'egx-264880', href:'https://www.egx.com.eg' }
    ];

    // sectors
    const secDef = [
      ['Banks','البنوك',12,8,3,1,4.9,'COMI'],['Real Estate','العقارات',31,19,10,2,6.2,'TMGH'],['Chemicals','الكيماويات',18,7,9,2,7.4,'ABUK'],
      ['Industrials','الصناعة',26,16,8,2,8.1,'SWDY'],['Basic Resources','الموارد الأساسية',14,5,7,2,9.0,'ESRS'],['Consumer','السلع الاستهلاكية',22,11,9,2,6.8,'EAST'],
      ['Telecom','الاتصالات',4,2,1,1,4.2,'ETEL'],['Utilities','المرافق',6,2,4,0,11.2,'KORA'],['Energy','الطاقة',9,6,2,1,9.1,'AMOC'],
      ['Financials','الخدمات المالية',17,6,9,2,5.6,'HRHO'],['Healthcare','الرعاية الصحية',11,7,3,1,12.4,'IDHC'],['Textiles','الغزل والنسيج',13,3,8,2,7.7,'ELSH'],
      ['Transport & Shipping','النقل والشحن',8,4,3,1,8.6,'CCAP'],['Travel & Leisure','السفر والترفيه',12,5,6,1,10.3,'ORHD'],['Media','الإعلام',5,2,2,1,9.4,'MEDI']
    ];
    const sectorCards = D.sectorCards ? say(D.sectorCards, ['name','read','full'])
      .map((c) => Object.assign({}, c, { medians: say(c.medians || [], ['key']) }))
      : !D.demo ? [] : secDef.map(([en,arn,count,up,down,flat,pe,standout]) => {
      const bars = [];
      for (let i = 0; i < 10; i++) {
        const isUp = i < Math.round(up/count*10);
        const isFlat = i >= Math.round((up+down)/count*10);
        bars.push({ color: isFlat ? 'var(--rule)' : isUp ? 'var(--up)' : 'var(--down)', op: isFlat ? 1 : (0.45 + 0.055*i) });
      }
      return { name: ar ? arn : en, count: count + (ar?' شركة':' listed'), bars, upCount:up, downCount:down, flatCount:flat,
        read: ar ? ('صعد ' + up + ' من ' + count + ' سهماً في القطاع في جلسة ٢٦ أغسطس. وسيط مضاعف الربحية ' + pe.toFixed(1) + '.')
                 : (up + ' of ' + count + ' listed names rose in the 26 August session. Median P/E ' + pe.toFixed(1) + '.'),
        medianPe: pe.toFixed(1), standout: (ar?'الأكبر تحركاً ':'Largest move ') + standout };
    });

    // calendar
    // The design named four months and clicking one changed a state field
    // nothing read. The archive says which months it holds and how many
    // filings are in each.
    const monthDef = (D.filedMonths || []).length
      ? D.filedMonths.map((m) => [m.id, this.monthLabel(m.id), m.count])
      : [['2026-06','Jun 2026'],['2026-07','Jul 2026'],['2026-08','Aug 2026'],['2026-09','Sep 2026']];
    const months = monthDef.map(([id,label,count]) => ({ label, count: count || '', go: () => this.setState({ month:id }),
      color: st.month === id ? 'var(--ink)' : 'var(--t2)', bg: st.month === id ? 'var(--surface)' : 'transparent', sh: st.month === id ? 'var(--shPill)' : 'none' }));
    // A month as its days, the way the app draws it. A list of sixty rows says
    // nothing about the shape of a month; a grid shows at a glance that the
    // exchange files in bursts around results season and barely at all in
    // between. Every day of the month is drawn, including the empty ones —
    // a quiet Friday is a fact about the exchange, not a gap in the data.
    const inMonth = (D.filedArchive && D.filedArchiveMonth === st.month) ? D.filedArchive : [];
    const perDay = new Map();
    for (const e of inMonth) perDay.set(e.date, (perDay.get(e.date) || 0) + 1);
    const monthDays = [];
    if (st.month) {
      const [yy, mm] = st.month.split('-').map(Number);
      const last = new Date(Date.UTC(yy, mm, 0)).getUTCDate();
      const busiest = Math.max(1, ...perDay.values());
      for (let day = 1; day <= last; day++) {
        const iso = `${st.month}-${String(day).padStart(2, '0')}`;
        const n = perDay.get(iso) || 0;
        const on = st.day === iso;
        monthDays.push({
          day, iso, count: n || '',
          // Weight rather than colour: a busy day is darker, and nothing on
          // this grid is good or bad.
          bg: on ? 'var(--accent)' : n ? 'var(--sunk)' : 'transparent',
          fg: on ? 'var(--surface)' : n ? 'var(--ink)' : 'var(--faint)',
          weight: on ? 1 : n ? (0.25 + 0.75 * (n / busiest)).toFixed(2) : 0.45,
          go: () => this.setState({ day: st.day === iso ? '' : iso }),
        });
      }
    }
    const meanings = D.disclosureMeanings || null;
    const dayFilings = !st.day ? [] : inMonth
      .filter((e) => e.date === st.day)
      .map((e) => {
        const m = meanings && meanings.get ? meanings.get(e.id) : null;
        return Object.assign({}, e, {
          what: (m && m.titleEn && !ar) ? m.titleEn : (ar ? (e.whatAr || e.what) : e.what),
          kind: m ? (ar ? m.labelAr : m.label) : (e.section || ''),
          hasKind: Boolean(m || e.section),
          // The plain-language line, where the disclosure feed carries one.
          meaning: m ? (ar ? m.meaningAr : m.meaning) : '',
          hasMeaning: Boolean(m && (ar ? m.meaningAr : m.meaning)),
        });
      });
    const dayNote = !st.day ? '' : dayFilings.length
      ? L.filedOnDay.replace('{n}', dayFilings.length).replace('{date}', this.longDate(st.day))
      : L.nothingFiledThatDay;

    const archive = (D.filedArchive && D.filedArchiveMonth === st.month)
      ? say(D.filedArchive, ['what']).slice(0, 60).map((e) => Object.assign({}, e, {
          day: this.dayLabel(e.date), kind: e.section, hasKind: Boolean(e.section), basis: '',
        }))
      : null;
    const filedEvents = archive ? archive : D.filedEvents ? say(D.filedEvents, ['what','kind']).map((e) => Object.assign({}, e, {
      hasKind: Boolean(e.kind),
      basis: e.estimated && e.windowFrom ? L.calWindow.replace('{from}', e.windowFrom).replace('{to}', e.windowTo).replace('{n}', e.observations) : '',
    })) : !D.demo ? [] : [
      { day:'26 Aug', ticker:'COMI', what: ar?'إفصاح عن توزيعات نقدية مرحلية':'Interim cash distribution disclosure' },
      { day:'14 Aug', ticker:'KORA', what: ar?'قوائم النصف الأول ٢٠٢٦':'H1 2026 financial statements' },
      { day:'13 Aug', ticker:'SWDY', what: ar?'قوائم النصف الأول ٢٠٢٦':'H1 2026 financial statements' },
      { day:'11 Aug', ticker:'TMGH', what: ar?'قوائم النصف الأول ٢٠٢٦':'H1 2026 financial statements' },
      { day:'07 Aug', ticker:'ABUK', what: ar?'قوائم النصف الأول ٢٠٢٦':'H1 2026 financial statements' },
      { day:'04 Aug', ticker:'ETEL', what: ar?'إفصاح عن تعاقد':'Contract disclosure' }
    ];
    const expectedEvents = D.expectedEvents ? say(D.expectedEvents, ['what','kind']).map((e) => Object.assign({}, e, {
      hasKind: Boolean(e.kind),
      basis: e.estimated && e.windowFrom ? L.calWindow.replace('{from}', e.windowFrom).replace('{to}', e.windowTo).replace('{n}', e.observations) : '',
    })) : !D.demo ? [] : [
      { day:'31 Aug', ticker:'ESRS', what: ar?'قوائم النصف الأول ٢٠٢٦ — الموعد النظامي':'H1 2026 statements — regulatory deadline' },
      { day:'30 Aug', ticker:'PHDC', what: ar?'قوائم النصف الأول ٢٠٢٦':'H1 2026 financial statements' },
      { day:'30 Aug', ticker:'SKPC', what: ar?'قوائم النصف الأول ٢٠٢٦':'H1 2026 financial statements' },
      { day:'28 Aug', ticker:'MFPC', what: ar?'قوائم النصف الأول ٢٠٢٦':'H1 2026 financial statements' },
      { day:'28 Aug', ticker:'CIEB', what: ar?'قوائم النصف الأول ٢٠٢٦':'H1 2026 financial statements' },
      { day:'27 Aug', ticker:'ORAS', what: ar?'قوائم النصف الأول ٢٠٢٦':'H1 2026 financial statements' }
    ];

    // exchange
    const rates = D.rates ? say(D.rates, ['label','plain'])
      : (D.indices || []).map((ix) => ({ label: ix.label, labelAr: ix.labelAr,
          value: ix.value, pct: ix.pct, color: ix.color,
          unit: ar ? 'نقطة' : 'points' }));

    const macro = (D.macro ? say(D.macro, ['label','meaning','chain']) : []).map((m) => {
      // "Moved with the EGX 30 +0.13 over 163 sessions", or the honest version
      // of it. Most of these series barely move with the exchange at all, and
      // saying so is worth more than leaving a reader to assume a connection
      // the number itself denies.
      const c = m.correlation;
      const strong = c && Math.abs(c.r) >= 0.2;
      return Object.assign({}, m, {
        hasUnit: Boolean(m.unit), hasChain: Boolean(m.chain), hasLink: Boolean(c),
        link: !c ? '' : (strong ? L.macroMoved : L.macroBarely)
          .replace('{r}', (c.r > 0 ? '+' : '\u2212') + Math.abs(c.r).toFixed(2))
          .replace('{n}', c.sessions),
      });
    });

    const studies = !D.demo ? [] : [
      { venue:'Journal of Financial Economics', year:2024, score:82, band: ar?'منهجية موثّقة، بيانات متاحة':'Documented method, data available',
        title: ar?'الإفصاح المتأخر وتشتت الأسعار في الأسواق الناشئة':'Late disclosure and price dispersion in emerging markets',
        summary: ar?'تدرس الورقة الفارق بين تاريخ نهاية الفترة وتاريخ الإيداع في أربعة عشر سوقاً. تُلخّص هنا وصفاً للدراسة نفسها.':'The paper examines the gap between period end and filing date across fourteen markets. Summarised here as a description of the study itself.',
        href:'https://example.org', criteria:[{label:ar?'الشفافية':'Transparency',value:'22/25',pct:'88%'},{label:ar?'حجم العينة':'Sample size',value:'19/25',pct:'76%'},{label:ar?'قابلية التكرار':'Replicability',value:'21/25',pct:'84%'},{label:ar?'مراجعة الأقران':'Peer review',value:'20/25',pct:'80%'}] },
      { venue:'Emerging Markets Review', year:2025, score:64, band: ar?'عينة محدودة، بيانات جزئية':'Limited sample, partial data',
        title: ar?'مواعيد إفصاح الشركات المقيدة وسلوك أحجام التداول':'Filing timetables of listed companies and trading-volume behaviour',
        summary: ar?'عينة من ثمانٍ وثمانين شركة على مدى ست سنوات. بيانات الأحجام غير منشورة مع الورقة.':'A sample of eighty-eight companies over six years. Volume data is not published alongside the paper.',
        href:'https://example.org', criteria:[{label:ar?'الشفافية':'Transparency',value:'15/25',pct:'60%'},{label:ar?'حجم العينة':'Sample size',value:'14/25',pct:'56%'},{label:ar?'قابلية التكرار':'Replicability',value:'17/25',pct:'68%'},{label:ar?'مراجعة الأقران':'Peer review',value:'18/25',pct:'72%'}] },
      { venue:'Working paper', year:2026, score:38, band: ar?'غير محكّمة، بيانات غير متاحة':'Not peer reviewed, data unavailable',
        title: ar?'موسمية القروض قصيرة الأجل في القوائم المالية المصرية':'Seasonality in short-term borrowings across Egyptian filings',
        summary: ar?'مسودة عمل تعتمد على بيانات لم يُنشر مصدرها. النطاق يصف بطاقة التقييم، لا الشركات المذكورة فيها.':'A working draft resting on data whose source is not published. The band describes the scorecard, not the companies discussed in it.',
        href:'https://example.org', criteria:[{label:ar?'الشفافية':'Transparency',value:'9/25',pct:'36%'},{label:ar?'حجم العينة':'Sample size',value:'11/25',pct:'44%'},{label:ar?'قابلية التكرار':'Replicability',value:'7/25',pct:'28%'},{label:ar?'مراجعة الأقران':'Peer review',value:'11/25',pct:'44%'}] }
    ];

    // Built here rather than at the top because its counters are the lists
    // themselves — the design had 18 stories, 282 listings and KORA open,
    // whatever the documents actually held.
    const navDef = [
      ['home', ar?'الرئيسية':'Home', ''],
      ['today', ar?'اليوم':'Today', feed.length ? String(feed.length) : ''],
      ['market', ar?'السوق':'Market', String(D.companies.length)],
      ['company', ar?'شركة':'Company', st.ticker || ''],
      ['sectors', ar?'القطاعات':'Sectors', sectorCards.length ? String(sectorCards.length) : ''],
      ['calendar', ar?'التقويم':'Calendar', ''],
      ['exchange', ar?'البورصة':'Exchange', ''],
      ['research', ar?'الأبحاث':'Research', '']
    ];
    const nav = navDef.map(([id,label,meta]) => {
      const on = st.screen === id;
      return { label, meta, icon: ICON[id], go: this.go(id),
        color: on ? 'var(--ink)' : 'var(--t2)', weight: on ? 600 : 400,
        bg: on ? 'var(--activeBg)' : 'transparent',
        shadow: on ? 'var(--shPill)' : 'none',
        markH: on ? '18px' : '0px',
        dot: on ? acc : 'transparent' };
    });

    const out = {
      L, theme: st.theme, dir: ar ? 'rtl' : 'ltr',
      bodyFont: ar ? "'IBM Plex Sans Arabic','IBM Plex Sans',sans-serif" : "'IBM Plex Sans',sans-serif",
      marketDate: this.longDate(D.marketDate), generatedAt: D.generatedAt || '—',
      dataVersion: D.dataVersion || '—', totalCount: D.companies.length,
      noIndices: indices.length === 0, noReadNow: readNow.length === 0,
      noFeed: feed.length === 0, noRates: rates.length === 0,
      // Where the feed came from, what it merged, and what it could not reach.
      // A list of only what worked is marketing — the same argument
      // docs/data-sources.md makes about the pipeline as a whole.
      feedProvenance: this.provenance(D.newsProvenance, L, ar),
      hasDebt: Boolean(debt), noDebt: !debt,
      // An index says what the market did on average. Breadth says how widely,
      // which is the question the average cannot answer — and it was published
      // all along.
      // How much of the chosen month is on screen. 1,467 filings in August;
      // sixty of them fit a column, and saying which sixty is the difference
      // between a sample and a claim.
      monthDays, hasMonthDays: monthDays.length > 0,
      dayFilings, dayNote, hasDay: Boolean(st.day),
      archiveNote: (D.filedArchive && D.filedArchiveMonth === st.month)
        ? L.archiveNote.replace('{shown}', Math.min(60, D.filedArchive.length))
            .replace('{total}', D.filedArchive.length)
            .replace('{month}', this.monthLabel(st.month))
        : '',
      feedCount: allFeed.length
        ? L.feedCount.replace('{shown}', feed.length).replace('{total}', allFeed.length) : '',
      moreFeed: feed.length < allFeed.length,
      showMoreFeed: () => this.setState({ feedShown: feed.length + 40 }),
      busy, hasBusy: busy.length > 0, noBusy: busyMeasured > 0 && busy.length === 0,
      busyNote: busy.length ? L.busyWorkings + ' ' + L.busyYardstick : '',
      hasBreadth: Boolean(D.breadth),
      breadthBars: D.breadth ? [
        { n: D.breadth.up, color: 'var(--up)', label: L.rose },
        { n: D.breadth.down, color: 'var(--down)', label: L.fell },
        { n: D.breadth.flat, color: 'var(--rule2)', label: L.flat },
      ].map((b) => Object.assign({}, b, {
        width: Math.round((b.n / Math.max(1, D.breadth.counted)) * 100) + '%',
      })) : [],
      breadthLine: D.breadth ? L.breadthLine
        .replace('{up}', D.breadth.up).replace('{down}', D.breadth.down)
        .replace('{flat}', D.breadth.flat).replace('{counted}', D.breadth.counted)
        .replace('{date}', this.longDate(D.breadth.date)) : '',
      // The sector cards carry a fuller read and a median per metric when the
      // per-sector document came back; a card without one simply shows less.
      sectorsHaveDetail: sectorCards.some((c) => (c.medians || []).length),
      signalFootnote: signals.length ? L.sigFootnote : '',
      // The ratios, and the paragraph the pipeline writes over all of them.
      pickList, pickChips, hasPickList: pickList.length > 0,
      ratios, ratioGroups, hasRatios: ratios.length > 0,
      ratioRead: D.review ? (ar ? (D.review.read_ar || D.review.read) : D.review.read) || '' : '',
      // "Six of seven readable metrics moved the same way" — and then the
      // question that follows from it, which is the app's and not ours.
      ratioAgreement: agreement, ratioAsk: agreementAsk,
      ratioMissing: ratios.length ? L.revMissingNote : '',
      noMacro: macro.length === 0,
      noStudies: studies.length === 0,
      nav, sectorCount: sectorCards.length, themeLabel: st.theme === 'light' ? (ar?'نهاري':'Light') : (ar?'ليلي':'Dark'),
      flipTheme: () => this.setState(s => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),
      toEn: () => this.setState({ lang:'en' }), toAr: () => this.setState({ lang:'ar' }),
      enBg: !ar ? 'var(--surface)' : 'transparent', enFg: !ar ? 'var(--ink)' : 'var(--t2)', enSh: !ar ? 'var(--shPill)' : 'none',
      arBg: ar ? 'var(--surface)' : 'transparent', arFg: ar ? 'var(--ink)' : 'var(--t2)', arSh: ar ? 'var(--shPill)' : 'none',
      themeIcon: st.theme === 'light' ? 'M12 4.6V2.8M12 21.2v-1.8M4.6 12H2.8M21.2 12h-1.8M6.8 6.8 5.5 5.5M18.5 18.5l-1.3-1.3M6.8 17.2l-1.3 1.3M18.5 5.5l-1.3 1.3M12 7.6a4.4 4.4 0 1 0 0 8.8 4.4 4.4 0 0 0 0-8.8' : 'M20.4 14.6A8.8 8.8 0 0 1 9.4 3.6a8.8 8.8 0 1 0 11 11',
      isHome: st.screen === 'home', isToday: st.screen === 'today', isMarket: st.screen === 'market',
      isCompany: st.screen === 'company', isSectors: st.screen === 'sectors', isCalendar: st.screen === 'calendar',
      isExchange: st.screen === 'exchange', isResearch: st.screen === 'research',
      indices, movers, watchlist, readNow, feed,
      rows: rows.map(mkRow), rowCount: rows.length, cols, sectorChips, query: st.q,
      noRows: rows.length === 0,
      clearFilters: () => this.setState({ q:'', sector:'All' }),
      onQuery: e => this.setState({ q: e.target.value }),
      co, ranges, chart, ratesArrowed: rates.map((r) => { const flat = !r.pct || r.pct === '\u2014'; const up = String(r.pct).charAt(0) === '+'; return Object.assign({}, r, { arrow: flat ? '' : (up ? '\u2197' : '\u2198'), tint: flat ? 'var(--sunk)' : (up ? 'var(--upTint)' : 'var(--downTint)'), hasPlain: Boolean(r.plain), hasKarats: Boolean((r.karats || []).length) }); }), chartFrom: slice.length ? slice[0].date : '—', chartTo: slice.length ? slice[slice.length-1].date : '—', chartCount: slice.length,
      // How many of the periods on this table are a full statement rather than
      // a one-line profit announcement. Without it the table reads as mostly
      // empty, when what it mostly is, is honest.
      finsCoverage: fins.length
        ? L.fullStatements.replace('{n}', fins.filter((f) => f.hasMore).length)
            .replace('{total}', fins.length)
        : '',
      compareRows, compareChips, comparePeriods: comparePeriods.map((f) => f.period),
      hasCompare: compareRows.length > 0 && comparePeriods.length > 1,
      noCompare: D.fins.length > 0 && compareRows.length === 0,
      fins, debt, signals, filings, sectorCards, months, filedEvents, expectedEvents, rates, macro, studies
    };
    // A demo must not put an invented event beside a real company's name.
    //
    // The design's worked examples name actual issuers — KORRA filing H1 2026,
    // Ezz Steel going quiet — which is right in a design tool and wrong on a
    // public page: a screenshot of an invented filing under a real name is a
    // fabricated financial claim, the one thing this publisher must never
    // emit. The app solves this by rewriting its fixtures into an obviously
    // fake market before a signed-out reader sees them; this is the same move.
    // Any screen still carrying design copy is therefore safe by construction
    // rather than by remembering to edit it.
    const out2 = D.demo ? this.demoise(out, D.companies) : out;
    return ar ? this.isolate(out2) : out2;
  }

  /** Swap every real issuer the design named for one from the demo set. */
  demoise(value, companies, seen) {
    if (!this._swap) {
      const pick = (i) => companies[i % Math.max(1, companies.length)] || {};
      const map = new Map();
      [['KORA', 0], ['COMI', 1], ['SWDY', 2], ['TMGH', 3], ['ETEL', 4],
       ['AMOC', 5], ['ABUK', 6], ['ESRS', 7]].forEach(([real, i]) => {
        const stand = pick(i);
        if (!stand.ticker) return;
        map.set(real, stand.ticker);
        map.set('KORRA', stand.name && stand.name.en);
      });
      const named = [['KORRA', 0], ['Ezz Steel', 7], ['Commercial International Bank', 1],
                     ['El Sewedy Electric', 2], ['Telecom Egypt', 4],
                     ['Alexandria Mineral Oils', 5], ['Talaat Moustafa Group', 3],
                     ['كورّة', 0], ['حديد عز', 7], ['البنك التجاري الدولي', 1],
                     ['السويدي إليكتريك', 2]];
      named.forEach(([real, i]) => {
        const stand = pick(i);
        if (!stand.name) return;
        map.set(real, /[\u0600-\u06FF]/.test(real) ? stand.name.ar : stand.name.en);
      });
      this._swap = [...map.entries()].filter(([, to]) => to)
        .sort((a, b) => b[0].length - a[0].length);
    }
    seen = seen || new Set();
    if (typeof value === 'string') {
      let out = value;
      for (const [from, to] of this._swap) out = out.split(from).join(to);
      // The named list above is hand-written and fell behind the design: the
      // calendar and sector copy still carried CIEB, MFPC, ORAS, PHDC, SKPC
      // and seven more real issuers beside invented dates and figures. A
      // ticker is four capitals on this exchange, so catch the shape rather
      // than keep a list that has already proved it goes stale. Demo tickers
      // are DEMO01..DEMO16 and do not match.
      out = out.replace(/\b[A-Z]{4}\b/g, (t) => {
        const stand = companies[[...t].reduce((a, c) => a + c.charCodeAt(0), 0)
          % Math.max(1, companies.length)];
        return stand && stand.ticker ? stand.ticker : t;
      });
      return out;
    }
    if (!value || typeof value !== 'object' || seen.has(value)) return value;
    if (typeof value === 'function' || value instanceof Node) return value;
    seen.add(value);
    if (Array.isArray(value)) return value.map((v) => this.demoise(v, companies, seen));
    const copy = {};
    for (const [k, v] of Object.entries(value)) copy[k] = this.demoise(v, companies, seen);
    return copy;
  }

  // ── figures, dates and Latin stamps are bidi-isolated so signs and date
  // segments keep their filed order inside an RTL paragraph.
  isolate(v, seen) {
    seen = seen || new Set();
    if (typeof v === 'string') {
      if (/^[+\-\u2212]?\d[\d\s.,:/()\-\u2212\u2013\u00d7%A-Za-z]*$/.test(v)) return '\u2066' + v + '\u2069';
      return v;
    }
    if (Array.isArray(v)) return v.map(x => this.isolate(x, seen));
    if (v && typeof v === 'object' && !React.isValidElement(v)) {
      if (seen.has(v)) return v;
      seen.add(v);
      const o = {};
      for (const k in v) o[k] = (k === 'L' || typeof v[k] === 'function') ? v[k] : this.isolate(v[k], seen);
      return o;
    }
    return v;
  }

  spark(seed, up) {
    const n = 38, pts = []; let v = 50;
    for (let i = 0; i < n; i++) {
      v += Math.sin((i + seed) / 4.3) * 3.1 + ((((i + 1) * seed * 2654435761) % 1000) / 1000 - 0.5) * 5.2 + (up ? 0.62 : -0.58);
      pts.push(v);
    }
    const lo = Math.min.apply(null, pts), hi = Math.max.apply(null, pts), sp = (hi - lo) || 1;
    const d = pts.map((p,i) => (i ? 'L' : 'M') + ((i/(n-1))*100).toFixed(2) + ' ' + (2 + (1-(p-lo)/sp)*24).toFixed(2)).join(' ');
    return React.createElement('svg', { viewBox:'0 0 100 28', preserveAspectRatio:'none', style:{ width:'100%', height:'32px', display:'block' } },
      React.createElement('path', { d: d + ' L100 28 L0 28 Z', fill: up ? 'var(--upTint)' : 'var(--downTint)' }),
      React.createElement('path', { d, fill:'none', stroke: up ? 'var(--up)' : 'var(--down)', strokeWidth:1.5, vectorEffect:'non-scaling-stroke', strokeLinejoin:'round', strokeLinecap:'round' })
    );
  }

  /** The same line as spark(), drawn from closes that actually happened.
   *
   * spark() invents its own path from a seed, which is fine under a demo
   * index and not fine under a real one: the shape would be a made-up price
   * history. With nothing to draw, this draws nothing. */
  sparkOf(points, up) {
    const pts = (points || []).filter((v) => typeof v === 'number');
    if (pts.length < 2) return React.createElement('div', { style: { height: '32px' } });
    const lo = Math.min.apply(null, pts), hi = Math.max.apply(null, pts), sp = (hi - lo) || 1;
    const d = pts.map((p, i) => (i ? 'L' : 'M') + ((i / (pts.length - 1)) * 100).toFixed(2)
      + ' ' + (2 + (1 - (p - lo) / sp) * 24).toFixed(2)).join(' ');
    return React.createElement('svg', { viewBox: '0 0 100 28', preserveAspectRatio: 'none',
      style: { width: '100%', height: '32px', display: 'block' } },
      React.createElement('path', { d: d + ' L100 28 L0 28 Z',
        fill: up ? 'var(--upTint)' : 'var(--downTint)' }),
      React.createElement('path', { d, fill: 'none', stroke: up ? 'var(--up)' : 'var(--down)',
        strokeWidth: 1.5, vectorEffect: 'non-scaling-stroke', strokeLinejoin: 'round',
        strokeLinecap: 'round' })
    );
  }

  /** "2026-08-02" as the calendar's day column reads it. */
  dayLabel(iso) {
    const at = new Date(String(iso) + 'T00:00:00Z');
    if (isNaN(at)) return iso || '';
    return new Intl.DateTimeFormat(this.state.lang === 'ar' ? 'ar-EG' : 'en-GB',
      { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(at);
  }

  /** "2026-08" as a month pill reads it. */
  monthLabel(id) {
    const at = new Date(String(id) + '-01T00:00:00Z');
    if (isNaN(at)) return id;
    return new Intl.DateTimeFormat(this.state.lang === 'ar' ? 'ar-EG' : 'en-GB',
      { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(at);
  }

  /** A ratio's history, drawn in ONE colour whatever direction it took.
   *
   * sparkOf() paints green for rising and red for falling, which is right for
   * a share price and wrong for a ratio: it would draw a falling P/E in red
   * and rising debt-to-equity in green, and both readings are backwards. The
   * app passes an accent colour explicitly to defeat exactly that
   * (review_sheet.dart, _MetricTile). Direction is stated in words instead,
   * where it can be read rather than inferred from a colour. */
  sparkFlat(points) {
    const pts = (points || []).filter((v) => typeof v === 'number');
    if (pts.length < 2) return React.createElement('div', { style: { height: '24px' } });
    const lo = Math.min.apply(null, pts), hi = Math.max.apply(null, pts), sp = (hi - lo) || 1;
    const d = pts.map((p, i) => (i ? 'L' : 'M') + ((i / (pts.length - 1)) * 100).toFixed(2)
      + ' ' + (2 + (1 - (p - lo) / sp) * 20).toFixed(2)).join(' ');
    return React.createElement('svg', { viewBox: '0 0 100 24', preserveAspectRatio: 'none',
      style: { width: '100%', height: '24px', display: 'block' } },
      React.createElement('path', { d, fill: 'none', stroke: 'var(--accent)', strokeWidth: 1.5,
        vectorEffect: 'non-scaling-stroke', strokeLinejoin: 'round', strokeLinecap: 'round' })
    );
  }

  /** "2026-08-27" as the session line reads it, in whichever language. */
  longDate(iso) {
    if (!iso) return '—';
    const at = new Date(iso + (iso.length === 10 ? 'T00:00:00Z' : ''));
    if (isNaN(at)) return iso;
    return new Intl.DateTimeFormat(this.state.lang === 'ar' ? 'ar-EG' : 'en-GB',
      { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(at);
  }

  buildChart(pts) {
    // A company's price series arrives after its document does, and the market
    // screens carry none at all. An empty chart is a blank frame, not a crash.
    if (!Array.isArray(pts) || pts.length === 0) {
      return React.createElement('div', {
        style: { height: '260px', display: 'grid', placeItems: 'center',
                 color: 'var(--faint)', fontSize: '13px' },
      }, '—');
    }
    const W = 1000, H = 260, pad = 4;
    const vals = pts.map(p => p.close);
    const lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals), sp = (hi - lo) || 1;
    const x = i => (i / Math.max(1, pts.length - 1)) * W;
    const y = v => pad + (1 - (v - lo) / sp) * (H - pad * 2);
    const line = pts.map((p,i) => (i ? 'L' : 'M') + x(i).toFixed(2) + ' ' + y(p.close).toFixed(2)).join(' ');
    const area = line + ' L' + W + ' ' + H + ' L0 ' + H + ' Z';
    const grid = this.props.showChartGrid === false ? [] : [0.25,0.5,0.75].map((f,i) =>
      React.createElement('line', { key:'g'+i, x1:0, x2:W, y1:H*f, y2:H*f, stroke:'var(--rule2)', strokeWidth:1 }));
    const last = pts[pts.length-1];
    return React.createElement('div', { style:{ position:'relative' } },
      React.createElement('svg', { viewBox:'0 0 '+W+' '+H, preserveAspectRatio:'none', style:{ width:'100%', height:'260px', display:'block', overflow:'visible' } },
        React.createElement('defs', null, React.createElement('linearGradient', { id:'esth-fade', x1:'0', y1:'0', x2:'0', y2:'1' },
          React.createElement('stop', { offset:'0%', stopColor:'var(--accent)', stopOpacity:0.16 }),
          React.createElement('stop', { offset:'100%', stopColor:'var(--accent)', stopOpacity:0 }))),
        grid,
        React.createElement('path', { d:area, fill:'url(#esth-fade)' }),
        React.createElement('path', { d:line, fill:'none', stroke:'var(--ink)', strokeWidth:1.7, vectorEffect:'non-scaling-stroke', strokeLinejoin:'round', strokeLinecap:'round' }),
        React.createElement('circle', { cx:x(pts.length-1), cy:y(last.close), r:9, fill:'var(--accent)', opacity:0.18 }),
        React.createElement('circle', { cx:x(pts.length-1), cy:y(last.close), r:3.6, fill:'var(--accent)' })
      ),
      React.createElement('div', { style:{ position:'absolute', top:0, insetInlineEnd:0, fontFamily:"'IBM Plex Mono','IBM Plex Sans Arabic',monospace", fontSize:'10.5px', color:'var(--faint)' } }, hi.toFixed(2)),
      React.createElement('div', { style:{ position:'absolute', bottom:0, insetInlineEnd:0, fontFamily:"'IBM Plex Mono','IBM Plex Sans Arabic',monospace", fontSize:'10.5px', color:'var(--faint)' } }, lo.toFixed(2))
    );
  }
}

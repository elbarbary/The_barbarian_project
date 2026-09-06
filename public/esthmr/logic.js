import { explorer } from './explorer.js';
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
/* ── the treemap ──────────────────────────────────────────────────────────
 *
 * Squarified (Bruls, Huizing & van Wijk, 2000). A naive treemap slices one
 * axis and produces slivers — at 282 companies over four orders of magnitude
 * of market value, the small ones come out a pixel wide and a hundred tall,
 * which is a shape nobody can read a ticker in, let alone compare. Squarifying
 * lays each row along the shorter side and stops adding to it when the aspect
 * ratio would get worse, so tiles stay near square.
 *
 * Pure and exported so it can be tested against the properties that matter:
 * no overlap, nothing outside the box, and area proportional to value. Those
 * are hard to see and easy to break.
 */
export function squarify(items, x, y, w, h) {
  const out = [];
  const list = items.filter((i) => i.value > 0).sort((a, b) => b.value - a.value);
  const total = list.reduce((sum, i) => sum + i.value, 0);
  if (!list.length || total <= 0 || w <= 0 || h <= 0) return out;

  const scale = (w * h) / total;
  const areas = list.map((i) => i.value * scale);
  let i = 0;
  while (i < list.length) {
    const side = Math.min(w, h);
    const row = [];
    let rowArea = 0;
    let best = Infinity;
    // Grow the row while the WORST tile in it is getting squarer, and stop at
    // the first item that would make it worse.
    while (i + row.length < list.length) {
      const next = areas[i + row.length];
      const area = rowArea + next;
      const min = row.length ? Math.min(...row, next) : next;
      const max = row.length ? Math.max(...row, next) : next;
      const s2 = side * side;
      const ratio = Math.max((s2 * max) / (area * area), (area * area) / (s2 * min));
      if (row.length && ratio > best) break;
      best = ratio;
      row.push(next);
      rowArea = area;
    }
    const thick = rowArea / side;
    let along = 0;
    for (let k = 0; k < row.length; k++) {
      const len = row[k] / thick;
      out.push(w >= h
        ? Object.assign({}, list[i + k], { x, y: y + along, w: thick, h: len })
        : Object.assign({}, list[i + k], { x: x + along, y, w: len, h: thick }));
      along += len;
    }
    if (w >= h) { x += thick; w -= thick; } else { y += thick; h -= thick; }
    i += row.length;
  }
  return out;
}

/** A number as a CSS percentage, clamped out of the sub-pixel weeds. */
function pc(v) {
  return (Math.max(0, v)).toFixed(4) + '%';
}

/* Seven steps and a grey. The grey is for a company that did not trade at all
 * today, and it is deliberately NOT the neutral colour a flat close gets: "no
 * trade" and "no change" look identical on a map that paints them the same,
 * and they are opposite facts about a share.
 *
 * The steps are the same ones the market itself talks in — half a per cent,
 * one and a half, three — rather than a smooth gradient, because a reader
 * comparing two tiles can count steps and cannot count shades. */
export function heatColour(pct) {
  if (typeof pct !== 'number') return 'var(--hmNone)';
  if (pct <= -3) return 'var(--hmD3)';
  if (pct <= -1.5) return 'var(--hmD2)';
  if (pct < 0) return 'var(--hmD1)';
  if (pct === 0) return 'var(--hmZ)';
  if (pct < 1.5) return 'var(--hmU1)';
  if (pct < 3) return 'var(--hmU2)';
  return 'var(--hmU3)';
}

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
  // `month` is deliberately empty. It was the literal '2026-08', which is right
  // until 1 September: the archive index rolls, the Calendar keeps opening on
  // August, and once 2026-08 falls out of the twelve-month window the screen
  // opens on a month with no pill lit and 31 empty day cells while 1,467
  // filings sit one click away. renderVals falls back to the newest month the
  // archive actually publishes.
  // Arabic first. The exchange is Egyptian, the filings it publishes are in
  // Arabic, and most of the people reading about them read Arabic — an
  // English default made every one of them change the language before they
  // could start. main.js remembers whichever a reader chooses, so the default
  // is only ever the FIRST answer, never an argument.
  state = { screen:'home', theme:'light', lang:'ar', range:'1Y', sort:'pct', dir:-1, sector:'All', q:'', open:{}, debtOpen:false, month:'', sector1:'', heat:'ALL', heatSector:'', rateOpen:'',
    audioPlaying: false, audioItem: '', filtersOpen: false, sectorQuery: '', preferencesOpen: false,
    calcInvest: 100000, calcPrice: 50, calcDividend: 4.5,
    // One per search surface, so setting a test on the market table does not
    // silently reshape the filings list on another screen.
    // ARRAYS, and renamed from `rq`/`frq` on purpose.
    //
    // Renaming only the predicate would have left `ratioControl`, `shownRatio`
    // and `hasFiledFilter` reading `.m` off an array: `[].m` is undefined, so
    // every one of them degrades silently — the control draws empty, the
    // column disappears, the disclosures screen reports "not filtered" while
    // filtering. The whole suite still passes in that state. Renaming the slot
    // makes each missed reader an undefined, which shows up immediately.
    rqs: [], frqs: [],
    // The per-measure definitions on Home, folded away until asked for.
    linesHow: false };

  // ── Audio playback (Web Speech API) ──
  playSpeech(text, itemId) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (this.state.audioPlaying && this.state.audioItem === itemId) {
      try { window.speechSynthesis.cancel(); } catch (e) {}
      this.setState({ audioPlaying: false, audioItem: '' });
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utt = new window.SpeechSynthesisUtterance(text);
      const isAr = this.state.lang === 'ar';
      utt.lang = isAr ? 'ar-EG' : 'en-US';
      utt.rate = 1.0;
      utt.pitch = 1.0;
      if (window.speechSynthesis.getVoices) {
        const voices = window.speechSynthesis.getVoices() || [];
        if (isAr) {
          const v = voices.find(x => x.lang && (x.lang === 'ar-EG' || x.lang.startsWith('ar')));
          if (v) utt.voice = v;
        } else {
          const v = voices.find(x => x.lang && (x.lang === 'en-US' || x.lang.startsWith('en')));
          if (v) utt.voice = v;
        }
      }
      utt.onend = () => {
        this.setState({ audioPlaying: false, audioItem: '' });
      };
      utt.onerror = () => {
        this.setState({ audioPlaying: false, audioItem: '' });
      };
      this.setState({ audioPlaying: true, audioItem: itemId });
      window.speechSynthesis.speak(utt);
    } catch (e) {
      this.setState({ audioPlaying: false, audioItem: '' });
    }
  }

  stopSpeech() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch (e) {}
    }
    this.setState({ audioPlaying: false, audioItem: '' });
  }

  // ── copy ──
  copy() {
    const en = {
      nothingYet:'Nothing published for this yet.',
      peNote:'P/E is the last close divided by the last earnings per share the company filed. A company with no profit to divide by has none.',
      ttmWorking:'The 12-month figure is {window}, which is EGP {eps} a share. Three filed figures and a subtraction \u2014 nothing here is forecast.',
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
      revAssetsBody:'Assets reported in the filed balance sheet. Compare their growth with profit and cash flow; asset growth is not revenue growth.',
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
      revAtClose:'At the {period} close, not today\u2019s — so it can differ from the P/E in the header.',
      revAtSector:'level with its sector',
      revAboveSector:'above its sector',
      revBelowSector:'below its sector',
      revSectorMedian:'{sector} median',
      revOverPeriods:'over {n} reported periods',
      revAgree:'{n} of {readable} readable metrics moved the same way.',
      revDisagree:'{up} moved one way, {down} the other.',
      revAgreeAsk:'When they all agree, ask what the market already knows that you do not.',
      revDisagreeAsk:'When they disagree, the disagreement is the story. Which one is early?',
      revMissingNote:'Revenue appears in the financial statements when the retrieved filing contains it. Missing figures mean unavailable data, not zero. Each measure and free-float figure is shown only where its source supports it.',
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
      feedCount:'{shown} of {total} headlines, newest first.', volumeOn:'volume on',
      insightBadge:'Market Impact',
      showMore:'Show more',
      busiest:'Traded with abnormal volume',
      volumeKicker:'Traded {ratio}\u00d7 its usual volume',
      // WHICH SESSION THE MULTIPLE BELONGS TO.
      // The card printed "17.5\u00d7" beside a company name and nothing else.
      // A multiple with no day attached reads as a standing property of the
      // share rather than a fact about one session, and a reader checking
      // the list across a week sees familiar names and concludes it is
      // frozen. It is not: the volume is THIS session's, over the median of
      // the twenty before it.
      // Two phrasings, because the number means different things at the two
      // times. After the close it is one whole day against twenty whole
      // days. Mid-session it is PART of a day against twenty whole ones, so
      // it can only climb until the bell — 3.2\u00d7 at eleven and 3.2\u00d7 at
      // the close are not the same reading, and the card says which one is
      // on screen.
      busyOn:'Close of {date}',
      busyOnLive:'{date} session, so far',
      busyCut:'The {shown} busiest of {all} that traded at twice their own normal volume on {date}. Sorting the market table by volume shows the rest.',
      nothingUnusual:'Nothing unusual today',
      busyWorkings:'Shares traded in the session \u00f7 the median of the last 20 sessions. At 2.0 or above, this app says the day was unusual.',
      busyYardstick:'Twice the usual is the line, and it is this app\u2019s line rather than the exchange\u2019s \u2014 nobody publishes an official one. It is set where it is because a day at twice a company\u2019s normal volume is uncommon enough to be worth a look and common enough to happen without anything being wrong.',
      archiveNote:'Showing the {shown} most recent of {total} filings published in {month}.',
      archiveSearched:'Showing the {shown} most recent of {total} matches across {months} months of the archive, newest first. Pick a month above to narrow it.',
      archiveSearchedMonth:'Showing the {shown} most recent of {total} matches in {month}. Clear the month to search the whole archive.',
      filedShowing:'{n} filings match {what}.', filedShowingOne:'1 filing matches {what}.',
      filedSearch:'Filter by company or ticker',
      filedClear:'Clear', filedNothing:'No filing this month matches that.',
      breadthLine:'{up} rose, {down} fell and {flat} held, of {counted} counted in the {date} session.',
      breadthWord:'How widely', breadthOf:'{n} shares counted',
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
      sigDue:'Results due', sigEstimate:'estimate',
      sigDueOn:'A {label} filing is expected in {month} on the company\u2019s own history',
      sigDueWindow:'Drawn from {n} past filings, which put it between {from} and {to}.',
      sigFootnote:'Counts off the exchange\u2019s own record. A first loss is not a signal to sell and a return to profit is not a signal to buy \u2014 this is what happened, and what you make of it is yours.',
      newsSourcedFrom:'Headlines from {outlets}, each linked to the outlet that ran it.',
      newsMerged:'{count} duplicates merged.',
      newsWithheld:'{count} withheld for carrying a recommendation.',
      newsUnreachable:'Not reachable today: {outlets}.',
      noBorrowings:'No filing held for this company states borrowings.',
      publisher:'Publisher · EGX filings', session:'Session', builtAt:'Built', theme:'Theme', dataVersion:'data_version',
      sessionClose:'Closing prices', sessionLive:'Session in progress — prices not final',
      // A price with no age is the thing §49 forbids, and during a session
      // "not final" was the whole of what the screen said while showing a
      // capture three hours old.
      sessionFeed:'Session in progress — {delay} min delayed, read {at}',
      priceFrom:'{egx} of these prices are the exchange\u2019s own figures; {vendor} come from a market-data vendor, because the exchange does not publish them. Both are quoted delayed.',
      sessionHeld:'Session in progress — prices not final, captured {at}',
      investorsTitle:'Who is buying', investorsLead:'The exchange\u2019s own split of everything traded, by who traded it.',
      investorsShare:'Share of all value traded', investorsNet:'Bought less sold',
      investorsBought:'Bought', investorsSold:'Sold',
      investorsOfBuying:'{n} of all buying', investorsOfSelling:'{n} of all selling',
      investorsSides:'The exchange states each side separately, so each is shown against its own total. Buying and selling are not two halves of one bar: every pound bought is a pound sold, and the shares below answer who was on each side, not which side was larger.',
      investorsWho:'Who traded it', investorsTypeSplit:'Institutions against individuals',
      investorsOpen:'The full split',
      investorsTable:'By investor type', investorsType:'Type',
      investorsBuying:'a net buyer', investorsSelling:'a net seller',
      investorsEgpM:'EGP millions, bought less sold',
      investorsBasis:'The exchange states these period to date for its current reporting period, not for a single session. The period resets when the exchange starts a new one, and the date beside the figures is the exchange\u2019s own.',
      investorsAsOf:'Exchange figures as of', investorsTotal:'Value traded in the period:',
      investorsEquities:'The split above counts government bonds and T-bills too. Shares alone:',
      investorsNoIntraday:'The exchange publishes no intraday breakdown, so there is no curve here \u2014 only where the period stands.',
      homeTitle:'The close', homeTitleLive:'The session', closeOf:'Official close of', movers:'Largest moves', readNow:'What to read now', watchlist:'Largest by market value',
      following:'Following', follow:'Follow', unfollow:'Following',
      // ── the reader's own list ──
      followTitle:'Watchlist',
      followLead:'The companies you follow, carrying the same close and the same move they carry everywhere else on this site.',
      followEmptyTitle:'Nothing followed yet',
      followEmpty:'Tap the star beside any company \u2014 in the market table, or on its own page \u2014 and it appears here.',
      followBrowse:'Open the market',
      followClear:'Empty the list',
      followSessions:'{n} sessions',
      followNoSeries:'No published price series',
      followKeptAccount:'Kept to your account, so the same list opens in another browser. A ticker and nothing else: no share count, no price paid, nothing about what you own.',
      followKeptDevice:'Kept in this browser only, because there is no account to keep it against while you are signed out. Sign in and it follows you.',
      followRose:'Rose', followFell:'Fell', followFlat:'Unchanged',
      followOfCount:'of {n}',
      // ── one sector, opened ──
      secOpen:'Open the sector',
      secBack:'All sectors',
      secAsOf:'{n} companies \u00b7 read of {at}',
      secRead:'The read',
      secMoving:'How its companies are moving',
      secMedians:'Typical for the sector',
      secMedianNote:'The middle company on each measure, not an average \u2014 one very large or very odd company cannot drag a median the way it drags a mean.',
      secStandouts:'Most measures moving together',
      secMembers:'Every company in the sector',
      secImproving:'{n} of {of} improving',
      secNoHistory:'Not enough filed history to read',
      secAbove:'above the sector on {key}',
      secBelow:'below the sector on {key}',
      secRising:'rising', secFalling:'falling', secFlat:'flat', secUnknown:'unreadable',
      pulseTitle:'Today\'s Market Pulse',
      // 'Session liquidity' and 'Safety gates (Scanner)' were the other two
      // cells. The first was filled from `investors.hasTypeBar`, which says a
      // chart exists and nothing about liquidity; the second announced "No
      // qualified setups (Silence)" — this publisher passing on every listed
      // company at once, from a scanner that no longer exists.
      pulseLeaderLabel:'Largest move today',
      // ── the heat map ──
      heatTitle:'Heat map',
      heatLead:'Every company sized by what the market says it is worth, coloured by how it moved today. Grouped by sector, because a red block is a different fact from a red company.',
      heatAll:'All EGX',
      heatCount:'{n} companies',
      heatLegend:'Today\u2019s move',
      heatDrawn:'{drawn} of {total} drawn. {missing} carry no market value on file, so there is no size to give them.',
      heatAllDrawn:'All {drawn} sized and drawn.',
      heatNoPrice:'{n} state no change today. They are drawn grey rather than flat, because a share that did not trade and a share that closed level are different facts.',
      heatMissing:'{n} in the index are not in this directory and cannot be drawn: {which}.',
      heatFrom:'Index membership as published by the exchange, {at}.',
      heatCarried:'Held from {at} \u2014 the exchange did not answer on the last build.',
      heatNoIndex:'No membership document has been published, so the index tabs have nothing to draw. The whole market is unaffected.',
      rateSessions:'{n} sessions',
      rateOunce:'EGP {egp} an ounce \u00b7 USD {usd}',
      rateHow:'How this figure is reached',
      rateOunceSeries:'the dollar ounce',
      rateSeriesTo:'The world series run to {at}.',
      // A line is a claim about the past. Six of these rows have no
      // published series anywhere this pipeline can reach, and the
      // honest thing is a number with no line under it — said once,
      // rather than left as a gap a reader has to notice.
      rateNoSeries:'{n} of these carry a published daily series and are drawn with one. The rest \u2014 Tadawul and the five pound rates \u2014 are the latest reading only: no source this pipeline can reach publishes their history.',
      heatZoomIn:'Tap a sector to fill the map with it.',
      heatZoomDrawn:'{n} in {sector}, of {of} on this map.',
      heatRoot:'Inside a sector the tiles are sized by the square root of market value, so the smaller companies are large enough to read. The bigger companies are still the bigger ones; a tile is no longer its share of the sector. On the whole map, area is market value exactly.',
      heatUnsized:'{n} more in this sector carry no market value on file. There is no honest size to give them, so they are named rather than drawn:',
      heatZoomOut:'Showing one sector. Tap it again, or the name above, for the whole map.',
      heatSliver:'{n} are drawn as a hairline. The largest company here is worth {times} times the smallest and the map is to scale — putting a floor under the small ones would draw a rounding error at the weight of a real company. Use the market table to open those.',
      closeNote:'Official close from market.json. Not a live price.',
      closeNoteLive:'Live feed, delayed — not the official close.',
      todayTitle:'News', newestFirst:'Newest first', readAtSource:'Read at source', outletImage:'Outlet picture',
      // ── connecting the dots ──
      // One name for one feature: the rail said "Crossings", the screen said
      // "What ties these together", and the two were the same thing. The app
      // still carries the old wording in its own `dotsLabel`; it should be
      // brought over on the next release rather than left saying something
      // different about the same block on the same document.
      dotsLabel:'Connecting the dots',
      dotsBody:'Companies that turned up in more than one place in {days} days.',
      dotsFiling:'Filing', dotsNews:'In the press', dotsSession:'That session',
      dotsVolume:'{ratio}\u00d7 normal volume',
      dotsShare:'What they share',
      dotsWindow:'The {days}-day window',
      dotsLegend:'On the line:',
      dotsMore:'{n} more', dotsLess:'Show fewer',
      dotsThreads:'{n} threads', dotsOneThread:'1 thread',
      dotsPeers:'{n} other companies crossed in the same window, {same} of them in this sector',
      dotsPeersNone:'No other company crossed in this window',
      dotsHow:'How this is built',
      dotsWorkings:'Three feeds are read for the same {days} days: what the exchange published, what the press wrote, and what the shares did. A company is listed here when at least two of them carry it. Nothing on the card is new \u2014 every thread links back to the document it came from.',
      dotsYardstick:'Two threads is common. Three \u2014 a filing, a story and a session outside its own normal \u2014 happens to a handful of companies a week. A crossing is a question, not an answer: it says a company was busy in more than one way, and nothing about whether that was good.',
      dotsOpen:'Open the company',
      marketTitle:'The market', searchPlaceholder:'Search {n} companies — English or Arabic',
      foldNote:'Search folds Arabic orthography: أ إ آ ٱ → ا, ة → ه, ى ئ → ي, ؤ → و, harakat and tatweel stripped on both sides.',
      marketFoot:'Sorting and filtering act on figures as filed. No ranking of companies is published.',
      ratioFilter:'Filter on a filed ratio', ratioValue:'value', ratioAnd:'and', ratioClear:'Clear',
      screenTitle:'The market, on four measures',
      screenSub:'One panel per measure, drawn over the companies that published that figure, with the market\u2019s own middle marked.',
      screenBarsShort:'Each column counts the companies whose figure lands in that slice. The upright rule is the market\u2019s own middle.',
      screenLead:'Four lines drawn on the exchange\u2019s own medians, and how much of the market sits inside each. Every line is read from the market; none is chosen here.',
      screenUniverse:'{n} companies on file',
      screenPeShort:'Price to earnings', screenVolShort:'30-day volume',
      screenCashShort:'Cash conversion', screenActionShort:'No filing due',
      screenOver:'{n} outside the range drawn',
      screenNamedSide:'the side this measure names', screenMedianMark:'market median',
      screenBars:'Each column is how many companies fall in that slice of the measure, and the mark is the market\u2019s own middle. Filled columns are the side of the middle the line names. Nothing is ranked and no company is a column.',
      screenOf:'{n} of {of}',
      screenSilent:'{n} published no figure to test',
      screenQuestion:'Sitting on one side of the middle is a question, not an answer: it says where a figure falls against the rest of the market, and nothing about whether that is good. No company is named here. A measure is applied on the table, where it is the reader\u2019s to change.',
      screenPeWhat:'What a share costs against a year of the profit the company filed.',
      screenVolWhat:'How many shares changed hands on an average day over the past month.',
      screenCashWhat:'How much of the profit a company reported arrived as cash from its operations.',
      screenActionWhat:'Whether the company appears in the filing dates the calendar is carrying.',
      screenActionWhatNone:'The calendar has not loaded, so this measure excluded nobody.',
      screenPe:'Price-to-earnings at or below the market median, {v} — the median of every company that published one.',
      screenVol:'Thirty-day average volume at or above the market median, {v} shares — a figure a reader could act on without moving it.',
      screenCash:'Cash conversion of 1.0 or better where it is published: the company collected at least as much cash as it reported in profit.',
      screenCashNone:'Cash conversion is not published for any company in this set, so that test could not be applied.',
      screenActionNone:'The calendar has not loaded, so no expected filing could be excluded.',
      screenAction:'No filing expected in the calendar window — a price is hard to read against a rights issue or a distribution nobody has seen yet.',
      screenOpen:'Put the first measure on the table',
      screenHowOpen:'What these mean', screenHowClose:'Hide',
      chipsLabel:'Measures', chipAtMost:'at or below {v}', chipAtLeast:'at or above {v}',
      chipNotDue:'no filing expected',
      chipsNote:'Each measure is the market\u2019s own middle, and they narrow together. Switch one off and the table widens again.',
      screenBeside:'The same kind of question, asked of the whole market instead of one company. A crossing asks whether one company turned up in more than one place inside a few days; these four measures ask where the exchange\u2019s own middle falls, and how much of the market sits either side of it. Neither answers whether that is good.',
      screenNoBack:'No past return is shown for this. Testing it against history would need the exchange\u2019s rankings as they stood on each past date, and reconstructing them from today\u2019s figures would quietly drop the companies that have since delisted — a backtest that flatters itself. The tests are stated so a reader can judge them directly.',
      peFoot:'P/E is the last close over the last filed annual earnings per share. It is left blank — never estimated — where the company reported a loss, filed no annual profit, or where its share count, price and market capitalisation do not multiply out. That filing can be twenty months old, so each company\u2019s own page also carries the same ratio over the last twelve months it filed.',
      noMatchTitle:'Nothing matches', noMatchBody:'No company in the filed set matches this search and this sector.', clearFilters:'Clear filters',
      lastClose:'Last close', asOf:'As of', priceHistory:'Price history', sessionsShown:'Sessions', whoTheyAre:'Who they are',
      asFiled:'Financials, as filed', egpMillions:'EGP millions unless stated', period:'Period', revenue:'Revenue',
      grossProfit:'Gross profit', operatingIncome:'Operating income', netIncome:'Net income',
      cumulativeWarning:'Periods are cumulative as the exchange files them. H1 and 9M are year-to-date and are not comparable to a single quarter. Nothing here is subtracted to synthesise a quarter, and a blank is a figure the filing did not state — not a zero.',
      openFiling:'Open filing',
      openOnExchange:'Open on the Egyptian Exchange', openOnMubasher:'Open on Mubasher',
      mixedRow:'Net profit from this filing; the statement figures as published by Mubasher',
      restatedIn:'Stated as the year-earlier comparative inside the {period} filing.',
      finsInDollars:'This company files in US dollars. The exchange\u2019s own announcements are not merged into this pounds table, so it can lag the filings listed below.',
      borrowingsTitle:'What it does with its borrowings', asAt:'As at', borrowings:'Borrowings', egpM:'EGP millions',
      dueWithinYear:'Due within a year', dueLater:'Due later', movementSince:'Movement since', pattern:'Pattern',
      debtHigherThan:'Higher than they were, at {was}.',
      debtLowerThan:'Lower than they were, at {was}.',
      debtLevelWith:'Unchanged, at {was}.',
      whereFrom:'Where these figures come from',
      whereFromBody:'Read from the borrowing lines of the company’s own filed balance sheet — loans, bank facilities and lease liabilities, summed by maturity. Never from total liabilities, which also carry payables, provisions and customer advances that nobody lent the company.',
      sourceFiling:'Source filing', openSignedDoc:'Open the signed document', showSource:'Where these figures come from', hideSource:'Hide source',
      notCreditRating:'This is not a credit rating. The figures above are stated as filed, with no grade, band or colour attached to them.',
      whatIsUnusual:'What is unusual', itsFilings:'Its filings', egxArchive:'EGX archive', document:'Document',
      sectorsTitle:'Sectors', sectorsWord:'sectors', rose:'rose', fell:'fell', flat:'flat', medianPE:'Median P/E',
      notRead:'not measurable',
      calendarTitle:'Disclosures', filed:'Filed', expected:'Expected', estimate:'Estimate',
      estimateNote:'Expected dates are estimated from each company’s own filing history. They are not announcements.',
      exchangeTitle:'Exchange', delayed15:'Quotes delayed ~15 minutes', macro:'Macro, in plain language',
      researchTitle:'Research', researchNote:'Bands describe the scorecard applied to a study. They describe no security.',
      readPaper:'Read the paper', scorecard:'Scorecard', publisherStamp:'ESTHMR · Publisher',
      legalNotLicensed:'ESTHMR is a publisher and is not licensed by the Financial Regulatory Authority. We do not buy, we do not sell, and we do not advise. Nothing here is a recommendation to trade any security.',
      // ── Investor Tools ──
      toolsTitle:'Investor Tools',
      toolsLead:'Interactive financial calculators and valuation guides designed for Egyptian market investors.',
      calcDivTitle:'Dividend & Cash Flow Calculator',
      calcCompareTitle:'Asset Returns in Egypt (EGX vs Certificates vs Gold)',
      calcGuideTitle:'Egyptian Valuation & Ratios Guide',
      calcCompanyAction:'Calculate Dividend Yield',
      calcAmountLabel:'Investment Capital (EGP)',
      calcSharePriceLabel:'Share Price (EGP)',
      calcDividendLabel:'Annual Dividend Per Share (EGP)',
      calcSearchLabel:'Fill from a listed company',
      calcSearchHint:'Type a ticker or a name',
      calcNoDividend:'no dividend published',
      calcPickedFrom:'Filled from the exchange\u2019s filed figures for',
      calcNeedsDividend:'The exchange publishes no dividend for this company, so the payout box is yours to fill.',
      calcClearPick:'clear',
      calcSearchNote:'Matches are ordered by how the text matches, not by any measure of the company.',
      calcSharesCount:'Shares Owned',
      calcAnnualCash:'Annual Cash Dividend',
      calcMonthlyCash:'Monthly Cash Equivalent',
      calcYield:'Dividend Yield',
      calcPayback:'Capital Payback Period',
      calcCdComparison:'Comparison with Egyptian Bank Certificates (23.5% - 27%)',
      calcCdNote:'Bank certificates deliver fixed cash payments while underlying nominal principal stays vulnerable to purchasing power erosion. Cash-dividend stocks combine cash returns with equity ownership in productive business assets.',
      calcDisclaimer:'Calculations are mathematical representations based on user inputs for educational purposes, not financial advice or price targets under Law 95/1992 §8.'
    };
    const ar = {
      nothingYet:'لم يُنشر شيء لهذا بعد.',
      peNote:'مكرر الربحية هو آخر إغلاق مقسوماً على آخر ربحية سهم أودعتها الشركة. والشركة التي لا ربح لها لا مكرر لها.',
      ttmWorking:'رقم الاثني عشر شهراً هو {window}، أي {eps} جنيه للسهم. ثلاثة أرقام مُفصح عنها وطرح — لا شيء هنا متوقَّع.',
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
      revAssetsBody:'الأصول كما وردت بالميزانية المودعة. قارن نموها بالأرباح والتدفقات النقدية؛ نمو الأصول ليس نمو الإيرادات.',
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
      revAtClose:'محسوب على إغلاق {period}، لا إغلاق اليوم — لذا قد يختلف عن مضاعف الربحية في الترويسة.',
      revAtSector:'مطابق لوسيط قطاعه',
      revSectorMedian:'وسيط {sector}',
      revOverPeriods:'على مدى {n} فترة معلنة',
      revAgree:'{n} من {readable} مؤشرات مقروءة تحركت في الاتجاه نفسه.',
      revDisagree:'{up} تحرك في اتجاه و{down} في الاتجاه الآخر.',
      revAgreeAsk:'حين تتفق كلها، اسأل عمّا يعرفه السوق ولا تعرفه أنت.',
      revDisagreeAsk:'حين تختلف، فالاختلاف نفسه هو الحكاية. أيّها سبق الآخر؟',
      revMissingNote:'تظهر الإيرادات في القوائم المالية عندما يتضمنها الإفصاح المسترجع. الخانات الفارغة تعني بيانات غير متاحة، وليست صفراً. لا نعرض مقياساً أو نسبة تداول حر دون بيانات تدعمها.',
      revAskTitle:'يستحق أن تسأل',
      revAnswerTitle:'إجابة مُرجَّحة',
      revProofTitle:'الرقم، فترة بفترة',
      revProofNote:'هذه هي القيم التي قُرئ منها الاتجاه — أرقام البورصة المودعة، من الأقدم إلى الأحدث.',
      revNowRising:'ترتفع الآن',
      revNowFalling:'تنخفض الآن',
      revNowFlat:'مستقرة الآن',
      revOnePoint:'رقم واحد منشور — لا يكفي من التاريخ لقراءة اتجاه.',
      revReadLabel:'القراءة',
      revCash:'جودة الأرباح والتدفق النقدي',
      revCashAsk:'من كل جنيه ربح معلن، كم وصل نقداً وتشغيلياً بالفعل إلى البنك؟',
      revPb:'مضاعف القيمة الدفترية (P/B)',
      revPbAsk:'كم تدفع مقابل كل جنيه من صافي أصول الشركة وحقوق المساهمين؟',
      revPe:'مكرر الربحية (P/E)',
      revProfit:'صافي الربح',
      revEps:'ربحية السهم (EPS)',
      revAssets:'إجمالي الأصول',
      revRoe:'العائد على حقوق الملكية (ROE)',
      revRoa:'العائد على الأصول (ROA)',
      revDebt:'نسبة الدين إلى حقوق الملكية',
      revYield:'عائد الكوبون والتوزيعات النقدية',
      revPeAsk:'لماذا يُسعَّر هكذا مقارنة بنظائره في القطاع — وكيف تتحرك الأرباح التشغيلية؟',
      revProfitAsk:'من أين جاء التغير — من النشاط التشغيلي الأساسي، أم من بنود استثنائية لن تتكرر؟',
      revEpsAsk:'ارتفع الربح الإجمالي — لكن هل انعكس ذلك على نصيب كل سهم بعد أي زيادات في رأس المال؟',
      revAssetsAsk:'هل تتوسع أصول الشركة فعلاً، وهل يواكب ذلك نمو في الربحية؟',
      revRoeAsk:'عائد تشغيلي قوي على أموال المساهمين — أم ناتج عن اقتراض مكثف؟ راجع نسبة المديونية.',
      revRoaAsk:'ما مدى كفاءة إدارة الشركة في تشغيل كافة أصولها ومواردها؟',
      revDebtAsk:'كيف وُظفت أموال القروض — وهل تُدر عائداً يتجاوز تكلفة الفائدة البنكية؟',
      revYieldAsk:'هل التوزيع النقدي مدعوم بأرباح وتدفقات نقدية قوية — أم ناتج عن هبوط في سعر السهم؟',
      feedCount:'{shown} من {total} عنواناً، الأحدث أولاً.', volumeOn:'حجم التداول في',
      insightBadge:'الأثر المالي',
      showMore:'عرض المزيد',
      busiest:'أنشط الأسهم (أحجام تداول استثنائية)',
      volumeKicker:'تداول {ratio}\u00d7 حجمه المعتاد',
      busyOn:'إغلاق {date}',
      busyOnLive:'جلسة {date} حتى الآن',
      busyCut:'الأسهم الأكثر نشاطاً: {shown} من {all} شركة تداولت في جلسة {date} بأكثر من ضعف متوسط حجمها المعتاد.',
      nothingUnusual:'لا توجد أحجام تداول استثنائية اليوم',
      busyWorkings:'الأسهم المتداولة في الجلسة \u00f7 وسيط آخر 20 جلسة. وعند 2.0 فأكثر، يصف هذا التطبيق اليوم بأنه استثنائي.',
      busyYardstick:'الضعف هو الحد الفاصل، وهو حد إحصائي يضعه هذا التطبيق لا البورصة لتسليط الضوء على النشاط الاستثنائي دون أن يمثل ذلك حكماً أو توصية.',
      archiveNote:'عرض أحدث {shown} من {total} إفصاحاً نُشرت في {month}.',
      archiveSearched:'عرض أحدث {shown} من {total} نتيجة عبر {months} شهراً من الأرشيف، الأحدث أولاً. اختر شهراً بالأعلى لتضييق النطاق.',
      archiveSearchedMonth:'عرض أحدث {shown} من {total} نتيجة في {month}. ألغِ اختيار الشهر للبحث في الأرشيف كاملاً.',
      filedShowing:'{n} إفصاحاً يطابق {what}.', filedShowingOne:'إفصاح واحد يطابق {what}.',
      filedSearch:'تصفية بالشركة أو الرمز',
      filedClear:'مسح', filedNothing:'لا يوجد إفصاح هذا الشهر يطابق ذلك.',
      breadthLine:'صعد {up} سهماً وتراجع {down} وثبت {flat}، من إجمالي {counted} سهماً في جلسة {date}.',
      breadthWord:'اتساع حركة السوق', breadthOf:'{n} سهماً محسوباً',
      calWindow:'أُودعت بين {from} و{to} في {n} سنوات سابقة.',
      yieldWord:'عائد الكوبون',
      macroMoved:'تحرك مع إيجي إكس 30 بمقدار {r} على مدى {n} جلسة.',
      macroBarely:'يكاد لا يتحرك مع إيجي إكس 30، {r} على مدى {n} جلسة.',
      sigFirstLoss:'{period} أول خسارة بعد {run} فترة معلنة رابحة.',
      sigBackToProfit:'{period} عودة إلى الربح بعد {run} فترة معلنة خاسرة.',
      sigHeldSince:'استمرت السلسلة منذ {year}.',
      sigFirstIn:'أول {label} منذ {years} سنوات.',
      sigPreviousWas:'وكانت السابقة في {year}.',
      sigQuiet:'لم تُفصح عن شيء منذ {days} يوماً، وهي تُفصح عادةً كل {gap}.',
      sigLastFiling:'آخر إفصاح {date}.',
      sigStreak:'سلسلة', sigFirst:'الأولى من نوعها', sigSilence:'فترة سكون',
      sigDue:'نتائج مرتقبة', sigEstimate:'تقدير زمني',
      sigDueOn:'يُتوقع إيداع قوائم {label} في {month} بحسب سجل إفصاحات الشركة',
      sigDueWindow:'مبني على {n} إفصاحاً سابقاً، تضعه بين {from} و{to}.',
      sigFootnote:'أرقام محسوبة من سجل البورصة نفسه. أول خسارة ليست إشارة بيع، والعودة إلى الربح ليست إشارة شراء \u2014 هذا ما حدث، وما تراه فيه يخصك وحدك.',
      newsSourcedFrom:'عناوين من {outlets}، كل واحد منها موصول بالجهة التي نشرته.',
      newsMerged:'دُمج {count} خبرًا مكررًا.',
      newsWithheld:'حُجب {count} خبرًا لاحتوائه على توصية.',
      newsUnreachable:'تعذّر الوصول اليوم إلى: {outlets}.',
      noBorrowings:'لا يوجد إفصاح محفوظ لهذه الشركة يذكر قروضاً.',
      publisher:'ناشر · إفصاحات البورصة', session:'الجلسة', builtAt:'حُدِّث', theme:'المظهر', dataVersion:'إصدار البيانات',
      sessionClose:'أسعار إغلاق', sessionLive:'الجلسة جارية — الأسعار غير نهائية',
      sessionFeed:'الجلسة جارية — بتأخير {delay} دقيقة، قُرئت {at}',
      priceFrom:'{egx} من هذه الأسعار أرقام البورصة نفسها، و{vendor} من مزوّد بيانات لأن البورصة لا تنشرها. وكلاهما بتأخير.',
      sessionHeld:'الجلسة جارية — الأسعار غير نهائية، رُصدت {at}',
      investorsTitle:'تعاملات فئات المستثمرين', investorsLead:'بيانات البورصة الرسمية لتعاملات فئات المستثمرين وأحجام السيولة.',
      investorsShare:'نسبة الاستحواذ من إجمالي التداول', investorsNet:'صافي التعاملات (شراء / بيع)',
      investorsBought:'إجمالي الشراء', investorsSold:'إجمالي البيع',
      investorsOfBuying:'{n} من إجمالي الشراء', investorsOfSelling:'{n} من إجمالي البيع',
      investorsSides:'تُفصح البورصة عن قيم الشراء والبيع لكل فئة استثمارية على حدة. تُعرض النسب منسوبة إلى إجمالي جانبها لتوضيح حجم مشاركة كل فئة في حركة السيولة.',
      investorsWho:'فئات المتعاملين', investorsTypeSplit:'المؤسسات في مواجهة الأفراد',
      investorsOpen:'تفاصيل تعاملات الفئات',
      investorsTable:'تعاملات فئات المستثمرين', investorsType:'فئة المستثمر',
      investorsBuying:'صافي شراء', investorsSelling:'صافي بيع',
      investorsEgpM:'مليون جنيه (صافي تعاملات)',
      investorsBasis:'تنشر البورصة هذه الأرقام تراكمياً للفترة الحالية (منذ بداية العام أو بداية الشهر). وتُحدّث البيانات فور إعلان البورصة للفترة الجديدة، والتاريخ المجاور هو تاريخ البورصة نفسها.',
      investorsAsOf:'بيانات البورصة الرسمية كما في', investorsTotal:'إجمالي قيمة التداول في الفترة:',
      investorsEquities:'الجدول أعلاه يشمل الأسهم والسندات وأذون الخزانة. تعاملات الأسهم المقيدة فقط:',
      investorsNoIntraday:'لا تنشر البورصة تقسيماً لحظياً لفئات المستثمرين خلال ساعات الجلسة، لذا تُعرض أحدث فترة معلنة رسمياً.',
      homeTitle:'إغلاق السوق', homeTitleLive:'تداولات الجلسة', closeOf:'الإغلاق الرسمي ليوم', movers:'أنشط الأسهم تحركاً', readNow:'أبرز الأخبار والإفصاحات', watchlist:'الأكبر وزناً وقيمة سوقية',
      following:'في قائمة المتابعة', follow:'أضف للمتابعة', unfollow:'في قائمة المتابعة',
      // ── قائمة المتابعة ──
      followTitle:'المتابَعة',
      followLead:'الشركات التي تتابعها، بالإغلاق نفسه والتغير نفسه الظاهرين في باقي أنحاء الموقع.',
      followEmptyTitle:'قائمة المتابعة فارغة حالياً',
      followEmpty:'اضغط رمز النجمة بجوار أي سهم لإضافته إلى قائمة متابعتك الخاصة هنا.',
      followBrowse:'تصفح جدول السوق',
      followClear:'إفراغ القائمة بالكامل',
      followSessions:'{n} جلسة',
      followNoSeries:'لا توجد سلسلة أسعار منشورة',
      followKeptAccount:'محفوظة في حسابك، فتفتح القائمة نفسها في أي متصفح. يُحفظ الرمز فقط: لا عدد أسهم، ولا سعر شراء، ولا شيء عمّا تملكه.',
      followKeptDevice:'محفوظة في هذا المتصفح وحده. سجّل الدخول لتنتقل قائمتك معك تلقائياً.',
      followRose:'صعدت', followFell:'تراجعت', followFlat:'دون تغيّر',
      followOfCount:'من {n}',
      // ── قطاع واحد، مفتوحاً ──
      secOpen:'افتح القطاع',
      secBack:'كل القطاعات',
      secAsOf:'{n} شركة \u00b7 قراءة {at}',
      secRead:'القراءة',
      secMoving:'كيف تتحرك شركاته',
      secMedians:'المعتاد في القطاع',
      secMedianNote:'الشركة الوسطى في كل مقياس، لا المتوسط \u2014 شركة واحدة كبيرة جداً أو شاذة لا تجرّ الوسيط كما تجرّ المتوسط.',
      secStandouts:'الأكثر تحرّكاً في مقاييسها معاً',
      secMembers:'كل شركة في القطاع',
      secImproving:'{n} من {of} تتحسن',
      secNoHistory:'لا تاريخ مُفصح عنه يكفي للقراءة',
      secAbove:'أعلى من القطاع في {key}',
      secBelow:'أدنى من القطاع في {key}',
      secRising:'صاعدة', secFalling:'هابطة', secFlat:'ثابتة', secUnknown:'غير مقروءة',
      pulseTitle:'نبض السوق اليوم في ثوانٍ',
      pulseLeaderLabel:'أكبر صعود اليوم',
      // ── الخريطة الحرارية ──
      heatTitle:'الخريطة الحرارية',
      heatLead:'كل شركة بحجم ما تقول السوق إنها تساويه، وبلون تحرّكها اليوم. مجمّعة بالقطاع، لأن قطاعاً أحمر غير شركة حمراء.',
      heatAll:'البورصة كلها',
      heatCount:'{n} شركة',
      heatLegend:'تغيّر اليوم',
      heatDrawn:'رُسمت {drawn} من {total}. {missing} بلا قيمة سوقية مسجّلة، فلا حجم يُعطى لها.',
      heatAllDrawn:'رُسمت {drawn} جميعها.',
      heatNoPrice:'{n} منها بلا تغيّر مُعلن اليوم. تُرسم رمادية لا محايدة، لأن سهماً لم يُتداول وسهماً أغلق دون تغيّر أمران مختلفان.',
      heatMissing:'{n} من المؤشر غير موجودة في هذا الدليل ولا يمكن رسمها: {which}.',
      heatFrom:'مكوّنات المؤشر كما تنشرها البورصة، {at}.',
      heatCarried:'محفوظة من {at} \u2014 لم تُجب البورصة في آخر بناء.',
      heatNoIndex:'لم يُنشر مستند للمكوّنات، فلا شيء ترسمه تبويبات المؤشرات. السوق كاملةً غير متأثرة.',
      rateSessions:'{n} جلسة',
      rateOunce:'{egp} جنيه للأونصة \u00b7 {usd} دولار',
      rateHow:'كيف يُحسب هذا الرقم',
      rateOunceSeries:'الأونصة بالدولار',
      rateSeriesTo:'سلاسل العالم تمتد حتى {at}.',
      rateNoSeries:'{n} من هذه الصفوف لها سلسلة يومية منشورة وتُرسم بها. أما البقية \u2014 تداول وأسعار الجنيه الخمسة \u2014 فهي آخر قراءة فقط: لا مصدر تصله هذه المنظومة ينشر تاريخها.',
      heatZoomIn:'اضغط قطاعاً لتملأ به الخريطة.',
      heatZoomDrawn:'{n} في {sector}، من {of} على هذه الخريطة.',
      heatRoot:'داخل القطاع تُحسب مساحة المربع بالجذر التربيعي للقيمة السوقية، لتكبر الشركات الصغيرة بما يكفي لقراءتها. تبقى الكبرى هي الكبرى، لكن المربع لم يعد يمثل حصته من القطاع. أما على الخريطة كاملة فالمساحة هي القيمة السوقية تماماً.',
      heatUnsized:'{n} أخرى في هذا القطاع بلا قيمة سوقية مسجّلة. لا حجم صادق يُعطى لها، فتُذكر بالاسم بدل أن تُرسم:',
      heatZoomOut:'قطاع واحد معروض. اضغطه مرة أخرى، أو الاسم أعلاه، للخريطة كاملة.',
      heatSliver:'{n} تُرسم كخيط رفيع. أكبر شركة هنا تساوي {times} ضعف أصغرها والخريطة بالمقياس \u2014 ووضع حد أدنى للحجم يرسم فارقاً لا يُذكر بوزن شركة حقيقية. افتح تلك الشركات من جدول السوق.',
      closeNote:'الإغلاق الرسمي من market.json، وليس سعراً لحظياً.',
      closeNoteLive:'تغذية لحظية متأخرة — وليست الإغلاق الرسمي.',
      todayTitle:'الأخبار', newestFirst:'الأحدث أولاً', readAtSource:'اقرأ في المصدر', outletImage:'صورة الجهة الناشرة',
      // ── ربط النقاط ──
      dotsLabel:'ربط النقاط',
      dotsBody:'شركات ظهرت في أكثر من مكان خلال {days} أيام.',
      dotsFiling:'إفصاح', dotsNews:'في الصحافة', dotsSession:'تلك الجلسة',
      dotsVolume:'{ratio}\u00d7 الحجم المعتاد',
      dotsShare:'ما يجمع بينها',
      dotsWindow:'نافذة {days} أيام',
      dotsLegend:'على الخط:',
      dotsMore:'{n} أخرى', dotsLess:'عرض أقل',
      dotsThreads:'{n} خيوط', dotsOneThread:'خيط واحد',
      dotsPeers:'تقاطعت {n} شركة أخرى في الفترة نفسها، منها {same} في هذا القطاع',
      dotsPeersNone:'لم تتقاطع أي شركة أخرى في هذه الفترة',
      dotsHow:'كيف بُني هذا',
      dotsWorkings:'نقرأ ثلاثة مصادر عن {days} من الأيام نفسها: ما أفصحت عنه البورصة، وما كتبته الصحافة، وما فعله السهم. وتُدرج الشركة هنا إذا ظهرت في اثنين منها على الأقل. لا شيء في البطاقة جديد \u2014 كل خيط يعود إلى المستند الذي جاء منه.',
      dotsYardstick:'خيطان أمر معتاد. أما ثلاثة \u2014 إفصاح وخبر وتداول خارج المعتاد \u2014 فيحدث لعدد قليل من الشركات في الأسبوع. التقاطع سؤال وليس حكمًا: يقول إن الشركة كانت نشطة بأكثر من طريقة، ولا يقول إن ذلك جيد.',
      dotsOpen:'افتح صفحة الشركة',
      marketTitle:'السوق', searchPlaceholder:'ابحث في {n} شركة — بالعربية أو الإنجليزية',
      foldNote:'يوحّد البحث الإملاء العربي: أ إ آ ٱ ← ا، ة ← ه، ى ئ ← ي، ؤ ← و، مع حذف الحركات والتطويل من الطرفين.',
      marketFoot:'الترتيب والتصفية يتمّان على الأرقام كما وردت في الإفصاح. لا يُنشر أي تصنيف للشركات.',
      ratioFilter:'تصفية على نسبة مُفصح عنها', ratioValue:'القيمة', ratioAnd:'و', ratioClear:'مسح',
      screenTitle:'فحص السوق عبر ٤ مقاييس استثمارية',
      screenSub:'لوحة لكل مقياس، مرسومة على الشركات التي أفصحت عن ذلك الرقم، مع تحديد وسط السوق.',
      screenBarsShort:'كل عمود يعدّ الشركات التي يقع رقمها في تلك الشريحة، والخط القائم هو وسيط السوق نفسه.',
      screenUniverse:'{n} شركة في السجل',
      screenPeShort:'مكرر الربحية (P/E)', screenVolShort:'حجم التداول ٣٠ يوماً',
      screenCashShort:'جودة التدفق النقدي', screenActionShort:'لا إفصاح مرتقب',
      screenOver:'{n} خارج المدى المرسوم',
      screenNamedSide:'الجانب الذي يسمّيه المقياس', screenMedianMark:'وسيط السوق',
      screenBars:'كل عمود هو عدد الشركات الواقعة في تلك الشريحة من المقياس، والعلامة هي وسط السوق نفسه. الأعمدة المملوءة هي الجانب الذي يسمّيه الخط. لا ترتيب هنا، ولا عمود يمثل شركة بعينها.',
      screenOf:'{n} من {of}',
      screenSilent:'{n} لم تُفصح عن رقم يُختبر',
      screenQuestion:'الوقوع على جانب من الوسط سؤال وليس حكمًا: يوضح أين تقع أرقام الشركة بالنسبة لبقية السوق، ولا يمثل توصية. لا يُفضل هنا سهم على آخر، ويُطبق المقياس على الجدول حيث يملك القارئ كامل التحكم.',
      screenPeWhat:'كم يكلّف السهم مقابل ربح سنة كما أفصحت عنه الشركة.',
      screenVolWhat:'كم سهماً جرى تداوله في اليوم المتوسط خلال الشهر الماضي.',
      screenCashWhat:'كم من الربح الذي أعلنته الشركة وصل نقداً من نشاطها.',
      screenActionWhat:'هل تظهر الشركة ضمن مواعيد الإفصاح التي يحملها التقويم.',
      screenActionWhatNone:'لم يُحمّل التقويم، لذا لم يستبعد هذا المقياس أحداً.',
      screenPe:'مضاعف ربحية عند وسيط السوق أو أقل، {v} — وهو وسيط كل شركة أفصحت عنه.',
      screenVol:'متوسط حجم تداول ثلاثين يوماً عند وسيط السوق أو أعلى، {v} سهم — حجم يمكن التعامل معه دون تحريك السعر.',
      screenCash:'تحويل نقدي عند ١٫٠ أو أفضل حيثما أُفصح عنه: حصّلت الشركة نقداً لا يقل عمّا أعلنته ربحاً.',
      screenCashNone:'التحويل النقدي غير مُفصح عنه لأي شركة في هذه المجموعة، لذا تعذّر تطبيق هذا الاختبار.',
      screenActionNone:'لم يُحمّل التقويم بعد، لذا لم يُستبعد أي إفصاح مرتقب.',
      screenAction:'لا إفصاح مرتقب في نافذة التقويم — يصعب قراءة السعر أمام زيادة رأس مال أو توزيع لم يُعلن بعد.',
      screenOpen:'تطبيق أول مقياس على جدول الأسهم',
      screenHowOpen:'ما معنى هذه المقاييس', screenHowClose:'إخفاء',
      chipsLabel:'المقاييس', chipAtMost:'عند {v} أو أقل', chipAtLeast:'عند {v} أو أعلى',
      chipNotDue:'لا إفصاح مرتقب',
      chipsNote:'كل مقياس هو وسط السوق نفسه، وتضيق النتائج معاً. أطفئ واحداً فيتّسع الجدول من جديد.',
      screenBeside:'النوع نفسه من السؤال، مطروحاً على السوق كلها بدل شركة بعينها. التقاطع يسأل إن كانت شركة واحدة ظهرت في أكثر من مكان خلال أيام قليلة؛ وهذه المقاييس الأربعة تسأل أين يقع وسط البورصة نفسها، وكم من السوق يقع على كل جانب منه. ولا يجيب أيٌّ منهما عن كون ذلك جيداً.',
      screenNoBack:'لا يُعرض أي عائد سابق لهذه الاختبارات. قياسها تاريخياً يتطلب ترتيب البورصة كما كان في كل تاريخ ماضٍ، وإعادة بنائه من أرقام اليوم تُسقط الشركات التي شُطبت منذ ذلك الحين — وهو اختبار يُجمّل نفسه. الاختبارات مذكورة كي يحكم عليها القارئ مباشرة.',
      peFoot:'مضاعف الربحية = آخر إغلاق مقسوماً على ربحية السهم السنوية كما وردت في آخر إفصاح. ويُترك فارغاً — دون تقدير — إذا سجّلت الشركة خسارة، أو لم تُفصح عن ربح سنوي، أو إذا لم يتّسق عدد الأسهم مع السعر والقيمة السوقية. وقد يعود ذلك الإفصاح إلى عشرين شهراً مضت، لذا تحمل صفحة كل شركة النسبة نفسها محسوبة على آخر اثني عشر شهراً أفصحت عنها.',
      noMatchTitle:'لا نتائج', noMatchBody:'لا توجد شركة في المجموعة المُفصح عنها تطابق هذا البحث وهذا القطاع.', clearFilters:'مسح التصفية',
      lastClose:'آخر إغلاق', asOf:'بتاريخ', priceHistory:'تاريخ السعر', sessionsShown:'جلسات', whoTheyAre:'نبذة عن الشركة',
      asFiled:'القوائم المالية كما وردت', egpMillions:'بملايين الجنيهات ما لم يُذكر غير ذلك', period:'الفترة', revenue:'الإيرادات',
      grossProfit:'الربح الإجمالي', operatingIncome:'الربح التشغيلي', netIncome:'صافي الربح',
      cumulativeWarning:'الفترات تراكمية كما تُقدّمها البورصة. النصف الأول وتسعة أشهر أرقام من بداية العام ولا تُقارن بربع واحد. لا يُطرح شيء لاستخراج ربع، والخانة الفارغة رقم لم يذكره الإفصاح — وليست صفراً.',
      openFiling:'افتح الإفصاح',
      openOnExchange:'افتح في البورصة المصرية', openOnMubasher:'افتح في مباشر',
      mixedRow:'صافي الربح من هذا الإفصاح، وأرقام القوائم كما نشرتها مباشر',
      restatedIn:'مذكور كرقم مقارن للعام السابق داخل إفصاح {period}.',
      finsInDollars:'تودع هذه الشركة قوائمها بالدولار الأمريكي، ولا تُدمج إعلانات البورصة الخاصة بها في هذا الجدول المقوَّم بالجنيه، لذا قد يتأخر عن الإفصاحات المدرجة أدناه.',
      borrowingsTitle:'هيكل ديون الشركة والتزاماتها المالية', asAt:'كما في', borrowings:'القروض والتسهيلات', egpM:'مليون جنيه',
      dueWithinYear:'يستحق خلال عام', dueLater:'يستحق لاحقاً', movementSince:'الحركة منذ', pattern:'النمط',
      debtHigherThan:'أعلى مما كانت عليه، إذ بلغت {was}.',
      debtLowerThan:'أقل مما كانت عليه، إذ بلغت {was}.',
      debtLevelWith:'دون تغيّر، عند {was}.',
      whereFrom:'من أين جاءت هذه الأرقام',
      whereFromBody:'قُرئت من بنود القروض في الميزانية المُفصح عنها — القروض والتسهيلات البنكية والتزامات الإيجار، مجموعة بحسب تاريخ الاستحقاق. وليست من إجمالي الالتزامات الذي يضم دائنين ومخصصات ودفعات مقدمة من العملاء لم يقرضها أحد للشركة.',
      sourceFiling:'الإفصاح المصدر', openSignedDoc:'افتح المستند الموقّع', showSource:'من أين جاءت هذه الأرقام', hideSource:'إخفاء المصدر',
      notCreditRating:'هذا ليس تصنيفاً ائتمانياً. الأرقام أعلاه مذكورة كما وردت، دون درجة أو نطاق أو لون.',
      whatIsUnusual:'أحجام تداول استثنائية', itsFilings:'إفصاحاتها', egxArchive:'أرشيف البورصة', document:'المستند',
      sectorsTitle:'القطاعات', sectorsWord:'قطاعاً', rose:'صعدت', fell:'هبطت', flat:'ثابتة', medianPE:'وسيط م/ر',
      notRead:'غير قابلة للقياس',
      calendarTitle:'الإفصاحات', filed:'مُفصح عنه', expected:'متوقع', estimate:'تقدير',
      estimateNote:'التواريخ المتوقعة مُقدّرة من سجل إفصاحات كل شركة، وليست إعلانات.',
      exchangeTitle:'البورصة والاقتصاد', delayed15:'الأسعار متأخرة نحو ١٥ دقيقة', macro:'مؤشرات الاقتصاد بلغة واضحة',
      researchTitle:'الأبحاث', researchNote:'النطاقات تصف بطاقة تقييم الدراسة، ولا تصف أي ورقة مالية.',
      readPaper:'اقرأ الورقة', scorecard:'بطاقة التقييم', publisherStamp:'ESTHMR · ناشر',
      legalNotLicensed:'ESTHMR ناشر وغير مرخّص من الهيئة العامة للرقابة المالية. نحن لا نشتري ولا نبيع ولا نقدّم مشورة. لا شيء هنا توصية بالتعامل في أي ورقة مالية.',
      // ── Investor Tools & Calculators ──
      toolsTitle:'حاسبة وأدوات المستثمر',
      toolsLead:'أدوات وحاسبات مالية تفاعلية لمساعدة المستثمر في حساب عوائد الكوبونات النقدية ومقارنة بدائل الاستثمار في مصر.',
      calcDivTitle:'حاسبة الكوبونات والتدفق النقدي',
      calcCompareTitle:'مقارنة عوائد الاستثمار في مصر (البورصة vs الشهادات vs الذهب)',
      calcGuideTitle:'دليل مصطلحات البورصة والتقييم المبسط',
      calcCompanyAction:'احسب عائد الكوبون للسهم',
      calcAmountLabel:'المبلغ المستثمر (بالجنيه المصري)',
      calcSharePriceLabel:'سعر السهم (ج.م)',
      calcDividendLabel:'الكوبون السنوي الموزع للسهم (ج.م)',
      calcSearchLabel:'املأ البيانات من شركة مقيدة',
      calcSearchHint:'اكتب الكود أو اسم الشركة',
      calcNoDividend:'لا يوجد توزيع منشور',
      calcPickedFrom:'مملوء من الأرقام المقيدة لدى البورصة لـ',
      calcNeedsDividend:'البورصة لا تنشر توزيعاً لهذه الشركة، فخانة التوزيع متروكة لك.',
      calcClearPick:'مسح',
      calcSearchNote:'النتائج مرتبة حسب مطابقة النص، لا حسب أي مقياس من مقاييس الشركة.',
      calcSharesCount:'عدد الأسهم المملوكة',
      calcAnnualCash:'إجمالي الكوبونات السنوية كاش',
      calcMonthlyCash:'متوسط العائد الشهري المعادل',
      calcYield:'نسبة عائد التوزيع (Dividend Yield)',
      calcPayback:'فترة استرداد رأس المال من الكوبونات',
      calcCdComparison:'المقارنة مع شهادات الادخار البنكية (23.5% - 27%)',
      calcCdNote:'شهادات البنوك تمنح عائداً نقدياً ثابتاً مع تآكل القوة الشرائية للأصل بفعل التضخم؛ بينما الاستثمار في أسهم الشركات ذات التوزيعات النقدية يمنح تدفقاً نقدياً دورياً مع ملكية في أصول تشغيلية حقيقية قادرة على إعادة تسعير نفسها والنمو مع التضخم.',
      calcDisclaimer:'هذه الحسابات رياضية استرشادية بناءً على الأرقام المدخلة لأغراض المعرفة والمقارنة، ولا تمثل توصية بشراء أو بيع أي ورقة مالية وفقاً للمادة ٨ من قانون سوق رأس المال رقم ٩٥ لسنة ١٩٩٢.'
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
  /** An outlet's picture, asked of this site rather than of the outlet.
   *
   * Hotlinking made a thumbnail conditional on the READER reaching the
   * publisher's host. Al Borsa and Hapi — 266 of the 400 items — sit on
   * Cloudflare addresses some routes cannot reach, and the request hangs for
   * fifteen seconds rather than failing, so `onerror` cannot even hide the
   * frame. The /esthmr/api/img route fetches it instead, from a host the
   * reader has plainly reached, and the edge caches it once for everybody.
   * A host that route does not carry answers 403, which fires `onerror`
   * immediately and leaves the frame the design drew.
   */
  imageSrc(raw) {
    if (typeof raw !== 'string' || !raw) return '';
    if (!/^https:\/\//i.test(raw)) return raw;
    /* The pipeline rewrites `image` to this route in the document itself, so
       the app already on somebody's phone is fixed by the next data fetch
       rather than by a release. A URL that has been through it must not go
       through it twice: the inner address would then be esthmr.com, which the
       route's own allowlist refuses, and every picture would 403. */
    if (/\/esthmr\/api\/img\?u=/.test(raw)) return raw;
    return '/esthmr/api/img?u=' + encodeURIComponent(raw);
  }
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
  ratioCards(review, L, ar, sectorName) {
    // The median line interpolated `review.sector` raw, so an Arabic reader
    // read "وسيط Finance 10.41×" — a Latin sector name inside an Arabic
    // sentence, on all 1,848 median lines the 258 reviewed companies publish.
    const sectorLabel = sectorName || ((x) => x);
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
    const fmt = (v, unit, key) => {
      if (typeof v !== 'number' || !isFinite(v)) return '\u2014';
      if (unit === 'percent') return v.toFixed(1) + '%';
      if (unit === 'egp_m') return this.money(v * 1e6);
      if (unit === 'egp') return v.toFixed(2);
      // A return is a ratio in the document and a percentage to a reader. The
      // review publishes roe and roa with unit "ratio", so they fell through
      // to the multiple below and 454 figures across the exchange read as
      // "0.29×" where the app reads "29.1%" — on a card whose own body calls
      // it "profit as a share of shareholders' equity". A share is not a
      // multiple. review_sheet.dart:202 has carried this case all along.
      if (key === 'roe' || key === 'roa') return (v * 100).toFixed(1) + '%';
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
      // WHEN the headline figure was struck.
      //
      // A P/E on this card is not the one in the header above it, and for CIB
      // the two differ by nearly a factor of two — 8.6 against 4.84×. Both are
      // right: the header divides TODAY's close by the last filed earnings,
      // and this card divides the close AT THAT PERIOD'S END, because it is
      // the last point of a series and the rest of the series has to be struck
      // that way or it would be eleven copies of today's price. Printed with
      // no date on it, the pair simply reads as one of them being wrong.
      const priced = m.key === 'pe';
      const lastPeriod = ((m.series || [])[(m.series || []).length - 1] || {}).p || '';
      return {
        key: m.key, label, ask,
        value: fmt(m.value, m.unit, m.key),
        asAt: priced && lastPeriod
          ? L.revAtClose.replace('{period}', lastPeriod) : '',
        // The direction is the app's sentence, not an arrow: an arrow beside a
        // ratio invites the reading that up is good, and for a P/E or a debt
        // ratio it is not.
        now: rising ? L.revNowRising : falling ? L.revNowFalling : L.revNowFlat,
        color: 'var(--t2)',
        periods: m.points ? L.revOverPeriods.replace('{n}', m.points) : '',
        onePoint: m.points === 1,
        // 71 cards read "Below the sector" directly above a median identical
        // to the value they were describing — AMER's P/E card said 10.41× was
        // below a sector median of 10.41×. The median company is not below
        // itself.
        peer: (typeof m.value === 'number' && m.value === m.peer_median) ? L.revAtSector
          : m.peer === 'above' ? L.revAboveSector : m.peer === 'below' ? L.revBelowSector : '',
        peerMedian: typeof m.peer_median === 'number'
          ? L.revSectorMedian.replace('{sector}', sectorLabel(review.sector) || '') + ' ' + fmt(m.peer_median, m.unit, m.key)
          : '',
        answer: safe, hasAnswer: Boolean(safe), hasAsk: Boolean(ask),
        spark: this.sparkFlat(points),
        hasSpark: points.length > 1,
        proof: (m.series || []).map((x) => ({ p: x.p, v: fmt(x.v, m.unit, m.key) })),
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
              p: x.p, v: fmt(x.v, m.unit, m.key),
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
        href: k.link || '', hasHref: Boolean(k.link),
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
        href: f.link || '', hasHref: Boolean(f.link),
      });
    }
    // 200 companies publish a results-due expectation and no screen showed
    // one: streaks and firsts are usually empty and `quiet` is null for
    // almost every ticker, so the block rendered one card or none while this
    // sat unread in a document the page had already fetched. The demo has
    // advertised the card since the design landed.
    for (const r of (s.resultsDue || []).slice(0, 3 - cards.length)) {
      cards.push({
        kind: L.sigDue,
        title: fill(L.sigDueOn, { label: r.label || '', month: this.monthOf(r.expected) }),
        // An estimate says it is one, and says what it was drawn from — the
        // same discipline the calendar's expected entries keep.
        because: r.observations
          ? fill(L.sigDueWindow, { n: r.observations, from: this.dayLabel(r.window_start),
                                   to: this.dayLabel(r.window_end) })
          : '',
        stamp: 'signals.json \u00b7 ' + L.sigEstimate,
        href: '', hasHref: false,
      });
    }
    const q = s.quiet;
    if (q && cards.length < 3) {
      cards.push({
        kind: L.sigSilence,
        title: fill(L.sigQuiet, { days: q.silent_days ?? '', gap: q.typical_gap ?? '' }),
        because: q.last_filed ? fill(L.sigLastFiling, { date: q.last_filed }) : '',
        stamp: 'signals.json',
        href: '', hasHref: false,
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
    // An em dash on this site means "the filing did not state it". A filed
    // loss is a stated figure, and this returned the dash for every one of
    // them: 41 companies' net-profit cards showed "—" with a proof graph of
    // ten bars drawn correctly BELOW the zero line — the shape saying ten
    // years of losses while every number beside it said nothing was
    // published. The app's own _compact branches on the absolute value and
    // keeps the sign; so does this now, and '—' is reserved for what is
    // genuinely absent. A caller that must not show a negative — a market
    // capitalisation cannot be one — guards at its own call site.
    if (typeof v !== 'number' || !isFinite(v)) return '—';
    const a = Math.abs(v), sign = v < 0 ? '-' : '';
    if (a >= 1e9) return sign + (a / 1e9).toFixed(a >= 1e11 ? 1 : 2) + 'bn';
    if (a >= 1e6) return sign + (a / 1e6).toFixed(a >= 1e8 ? 0 : 1) + 'm';
    return this.num(v, 0);
  }

  go(screen) { return () => this.setState({ screen }); }

  /* ── filtering on a filed ratio ──────────────────────────────────────────
   *
   * The table could already be sorted by the four columns it draws. These are
   * the figures a reader actually asks a screen for — a P/E under ten, a
   * dividend yield over five — and they were published per company and
   * reachable only one company at a time.
   *
   * WHAT A NUMBER IN THE BOX MEANS. The documents do not agree with each
   * other on this: `dividend_yield` is stated as a percent (4.26 is 4.26%)
   * and `roe`/`roa` as fractions (0.3612 is 36.12%). A reader typing "20"
   * into a return-on-equity box means twenty per cent either way, so the
   * entered number is scaled to the unit the document uses and the box says
   * which unit it is in. Getting this wrong does not error — it silently
   * returns every company or none.
   */
  /** Every measure a clause can name — filed ratios AND the two that are not.
   *
   * `ratioMetrics` is the reader-facing list and stays at seven: the control
   * above it is headed "Filter on a filed ratio", and a thirty-day trading
   * average is a vendor's arithmetic over sessions, not a figure any company
   * filed. Putting it in that list would be a provenance lie on a site that
   * footnotes where every number came from — and it would appear on the
   * disclosures screen too, which never asked for it.
   *
   * So the registry is the union and `ratioMetrics` is the filed half of it.
   * A chip can name volume; the typed control cannot offer it.
   */
  measures(ar) {
    return this.filedRatios(ar).map((m) => Object.assign({}, m, {
      typed: true, read: (c) => this.ratioValue(c, m.id),
    })).concat([
      // Top-level on the row, not under `ratios` — `ratioValue` cannot reach
      // it, which is why the clause carries its own accessor.
      { id:'avgVolume', label:'30-day volume', labelAr:'حجم التداول ٣٠ يوماً',
        unit:'', scale:1, typed: false, whole: true,
        name: ar ? 'حجم التداول ٣٠ يوماً' : '30-day volume',
        read: (c) => (c && typeof c.avgVolume === 'number' && isFinite(c.avgVolume)
          ? c.avgVolume : null) },
    ]);
  }

  ratioMetrics(ar) {
    return this.filedRatios(ar);
  }

  filedRatios(ar) {
    return [
      { id:'pe', label:'P/E', labelAr:'مضاعف الربحية', unit:'', scale:1 },
      { id:'pb', label:'P/B', labelAr:'السعر/القيمة الدفترية', unit:'', scale:1 },
      { id:'roe', label:'ROE', labelAr:'العائد على حقوق الملكية', unit:'%', scale:0.01 },
      { id:'roa', label:'ROA', labelAr:'العائد على الأصول', unit:'%', scale:0.01 },
      { id:'debt_equity', label:'Debt / equity', labelAr:'الدين إلى حقوق الملكية', unit:'', scale:1 },
      { id:'dividend_yield', label:'Dividend yield', labelAr:'عائد التوزيعات', unit:'%', scale:1 },
      { id:'cash_conversion', label:'Cash conversion', labelAr:'التحويل النقدي', unit:'', scale:1 },
    ].map((m) => Object.assign({}, m, { name: ar ? m.labelAr : m.label }));
  }

  /** What the documents publish for one company on one ratio, or null.
   *
   * `pe` sits on the row itself and the rest under `ratios`, which
   * `apply_company_ratios` folds in from the per-company review documents.
   * Coverage is genuinely partial — a company that never published a
   * dividend has no dividend yield — and absent stays absent. */
  ratioValue(c, id) {
    if (!c) return null;
    const raw = id === 'pe' ? c.pe : (c.ratios || {})[id];
    return typeof raw === 'number' && isFinite(raw) ? raw : null;
  }

  /** The four lines, read off the market rather than chosen.
   *
   * Lifted out of Home's card because the market table filters on them too,
   * and a threshold computed in two places is how a card and a table quietly
   * start disagreeing about the same number.
   *
   * Returns null when the market cannot state a middle — a dataset with no
   * published multiple and no volume has no lines to draw, and inventing one
   * would be a threshold this publisher chose.
   */
  /** Tickers the calendar expects a filing from, in its window.
   *
   * Lifted out of `marketLines`, which returns null when either median is
   * missing — the calendar test must not vanish because a different measure
   * had no data.
   */
  dueTickers(D) {
    return new Set(((D && D.expectedEvents) || []).map((e) => e.ticker).filter(Boolean));
  }

  marketLines(D) {
    const all = (D && D.companies) || [];
    const mid = (xs) => {
      const v = xs.filter((x) => typeof x === 'number' && isFinite(x)).sort((a, b) => a - b);
      return v.length ? v[Math.floor((v.length - 1) / 2)] : null;
    };
    const pe = mid(all.map((c) => (typeof c.pe === 'number' && c.pe > 0 ? c.pe : null)));
    const vol = mid(all.map((c) => c.avgVolume));
    if (pe === null || vol === null) return null;
    return {
      all, pe, vol,
      due: this.dueTickers(D),
      cash: (c) => (c.ratios || {}).cash_conversion,
    };
  }

  /** Does this company pass the ratio test, if one is set.
   *
   * A company with no published figure for the ratio FAILS rather than
   * passes. Filtering for a P/E under ten and being handed companies that
   * have never published one would be answering a different question. */
  passesRatio(c, q, ar, ctx) {
    // The guard belongs here, not inherited from `ratioValue`. The disclosures
    // screen hands this `byTicker.get(e.ticker)` for a filing whose ticker is
    // not a listed company, which is `undefined` — and a row accessor or a set
    // test would throw on it where `ratioValue` merely returned null.
    if (!q) return true;
    if (q.k === 'absent') {
      // Absence is the PASS. A company clears "no filing due" by NOT being in
      // the calendar's window — the opposite rule to every numeric clause
      // below, which is why it is a kind of its own rather than an operator.
      const set = (ctx && ctx.sets && ctx.sets[q.set]) || null;
      if (!set) return true;                             // nothing to test against
      return Boolean(c && c.ticker) && !set.has(c.ticker);
    }
    if (!q.m) return true;
    const metric = this.measures(ar).find((x) => x.id === q.m);
    if (!metric) return true;
    const a = parseFloat(q.a);
    if (!isFinite(a)) return true;                       // nothing typed yet
    if (!c) return false;
    const value = metric.read(c);
    if (value === null) return false;
    const lo = a * metric.scale;
    // `gte` and `lte` exist for chips and are never offered in the typed
    // control. The reader's three operators stay strict: making `gt` inclusive
    // would silently reinterpret every number already typed into the box, so
    // "more than 10" would start returning a company sitting exactly at 10.
    // Only a chip has a drawn panel it has to agree with.
    if (q.op === 'lt') return value < lo;
    if (q.op === 'lte') return value <= lo;
    if (q.op === 'gte') return value >= lo;
    if (q.op === 'bt') {
      const b = parseFloat(q.b);
      if (!isFinite(b)) return value > lo;
      const hi = b * metric.scale;
      return value >= Math.min(lo, hi) && value <= Math.max(lo, hi);
    }
    return value > lo;
  }

  /** Every clause, ANDed. An empty list filters nothing.
   *
   * The list is never handed to `passesRatio` — that reads `.m` off whatever
   * it is given, and `[].m` is undefined, which returns true for everyone. A
   * half-migrated caller would therefore not throw; it would quietly stop
   * filtering and hand back the whole exchange looking perfectly normal.
   */
  passesClauses(c, qs, ar, ctx) {
    if (!Array.isArray(qs)) return true;
    return qs.every((q) => this.passesRatio(c, q, ar, ctx));
  }

  /** The control itself, built once and drawn on each search surface. */
  ratioControl(key, L, ar) {
    // The typed control owns exactly one clause — the one the reader types
    // into. Chips add and remove their own clauses beside it and never touch
    // this one, so the two controls cannot fight over a single slot.
    const list = Array.isArray(this.state[key]) ? this.state[key] : [];
    const rq = list.find((q) => q && q.src === 'typed') || { m:'', op:'gt', a:'', b:'' };
    // `Object.assign({}, s[key], patch)` was the old write path, and against an
    // array it produced `{0:{…}, m:'roe'}` — array no longer, every later
    // `.every`/`.map` over the clause list throwing or silently skipped. This
    // replaces the typed clause in place, or appends it if there is none.
    const set = (patch) => this.setState((s) => {
      const cur = Array.isArray(s[key]) ? s[key] : [];
      const typed = cur.find((q) => q && q.src === 'typed');
      const next = Object.assign({ src: 'typed', k: 'ratio', m: '', op: 'gt', a: '', b: '' },
        typed || {}, patch);
      // A metric cleared is a clause removed, not a clause with an empty name
      // sitting in the list forever.
      const rest = cur.filter((q) => q && q.src !== 'typed');
      return { [key]: next.m ? rest.concat([next]) : rest };
    });
    const metrics = this.ratioMetrics(ar);
    const chosen = metrics.find((m) => m.id === rq.m) || null;
    return {
      metrics: metrics.map((m) => ({
        label: m.name, on: rq.m === m.id,
        // Picking the ratio already on is how you turn the test off.
        go: () => set({ m: rq.m === m.id ? '' : m.id }),
        bg: rq.m === m.id ? 'var(--accent)' : 'transparent',
        color: rq.m === m.id ? '#1B1917' : 'var(--t2)',
        border: rq.m === m.id ? 'transparent' : 'var(--rule)',
      })),
      ops: [['gt', ar ? 'أكبر من' : 'more than'], ['lt', ar ? 'أقل من' : 'less than'],
            ['bt', ar ? 'بين' : 'between']].map(([id, label]) => ({
        label, on: rq.op === id, go: () => set({ op: id }),
        bg: rq.op === id ? 'var(--sunk)' : 'transparent',
        color: rq.op === id ? 'var(--ink)' : 'var(--faint)',
      })),
      hasMetric: Boolean(chosen),
      unit: chosen ? (chosen.unit || '') : '',
      a: rq.a, b: rq.b, showB: rq.op === 'bt',
      onA: (e) => set({ a: e.target.value }),
      onB: (e) => set({ b: e.target.value }),
      clear: () => set({ m:'', op:'gt', a:'', b:'' }),
      active: Boolean(rq.m && isFinite(parseFloat(rq.a))),
    };
  }

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
      research:'M6 3.4h7.4l4.2 4.2v3.8M6 3.4v17.2h6.2M14.2 15.9a3.4 3.4 0 1 0 6.8 0 3.4 3.4 0 0 0-6.8 0M20.6 18.6 22.4 20.6',
      tools:'M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm-7 2h6v2h-6V5zm-6 0h4v2H6V5zm0 4h4v2H6V9zm6 0h6v2h-6V9zm-6 4h4v2H6v-2zm6 0h6v2h-6v-2zm-6 4h4v2H6v-2zm6 0h6v2h-6v-2z',
      // Three figures side by side, which is what the screen is.
      investors:'M4.2 20.4V13M9.4 20.4V6.6M14.6 20.4v-9.6M19.8 20.4V9.2M3 20.8h18M9.4 3.4v3.2',
      // Two threads meeting a point.
      crossings:'M4.6 6.2h4.2l4 6h6.6M4.6 17.8h4.2l4-6M18.4 9.4l2 2.8-2 2.8',
      // The same star that follows a company, so the control and the screen it
      // fills are recognisably one thing.
      watchlist:'M12 3.6 14.6 9l5.8.8-4.2 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8L3.6 9.8 9.4 9z',
      // Tiles of unequal size, which is the whole idea of the screen.
      search:'M10.6 3.8a6.8 6.8 0 1 0 0 13.6 6.8 6.8 0 0 0 0-13.6M15.6 15.6 20.4 20.4',
      heat:'M3.6 3.6h9.6v7.2H3.6zM15 3.6h5.4v4.2H15zM15 9.6h5.4v10.8H15zM3.6 12.6h5.4v7.8H3.6zM10.8 12.6h2.4v7.8h-2.4z'
    };

    // market table
    const q = this.fold(st.q);
    // What a sector is called on screen. The documents publish sector in
    // English only, so an Arabic reader was reading "Process Industries" in
    // the middle of Arabic copy — on the table, the chips, the company header
    // and the company rail. data.js carries the app's own Arabic name beside
    // the English one; every label goes through here, and every filter, sort
    // key and piece of state stays on the English name, which is the one the
    // documents agree on.
    const sectorAr = new Map(D.companies
      .filter((c) => c.sector && c.sectorAr).map((c) => [c.sector, c.sectorAr]));
    const sectorName = (en) => (ar && sectorAr.get(en)) || en || '—';

    // Sets a clause can test membership against. Passed in rather than stored:
    // state holds data, and a Set of tickers rebuilt every render is not state.
    const rctx = { sets: { expectedFiling: this.dueTickers(D) } };

    // THE FOUR MEASURE CHIPS.
    //
    // Independent switches, ANDed with each other and with whatever the reader
    // typed into the box beside them. Every threshold is the market's own —
    // the two medians, and the point where a company collected as much cash as
    // it reported in profit — so switching one on is the reader asking a
    // question, not the publisher answering one.
    //
    // A chip is OFFERED only when the market can state its line. `marketLines`
    // returns null on a dataset with no published multiple or no volume (the
    // signed-out demo is one), and a chip lit over a line that does not exist
    // would filter nothing while claiming to. Not offered beats inert.
    const lines = this.marketLines(D);
    const dueSet = rctx.sets.expectedFiling;
    const chipDefs = [];
    if (lines) {
      chipDefs.push(
        { id: 'pe', label: L.screenPeShort,
          note: L.chipAtMost.replace('{v}', lines.pe.toFixed(1)),
          // `bt` from zero rather than `lte`: the card's own denominator is
          // the companies with a POSITIVE multiple, and a bare `lte median`
          // would hand back non-positive ones the panel never counted.
          clause: { src: 'line', k: 'ratio', m: 'pe', op: 'bt', a: '0', b: String(lines.pe) } },
        { id: 'vol', label: L.screenVolShort,
          note: L.chipAtLeast.replace('{v}', this.num(lines.vol, 0)),
          clause: { src: 'line', k: 'ratio', m: 'avgVolume', op: 'gte', a: String(lines.vol) } },
        // `gte`, not `gt`. The card counts `cash >= 1`; every operator the
        // typed box offers is strict on that side, so a `gt` chip would draw
        // one number and deliver one fewer — the 85-drawn/84-delivered bug
        // this file fixed for the multiple, rebuilt on a second measure.
        { id: 'cash', label: L.screenCashShort, note: L.chipAtLeast.replace('{v}', '1.0'),
          clause: { src: 'line', k: 'ratio', m: 'cash_conversion', op: 'gte', a: '1' } });
    }
    if (dueSet.size) {
      chipDefs.push({ id: 'due', label: L.screenActionShort, note: L.chipNotDue,
        clause: { src: 'line', k: 'absent', set: 'expectedFiling' } });
    }
    const onNow = (id) => (Array.isArray(st.rqs) ? st.rqs : [])
      .some((q) => q && q.src === 'line' && q.id === id);
    const measureChips = chipDefs.map((d) => ({
      label: d.label, note: d.note, on: onNow(d.id),
      bg: onNow(d.id) ? 'var(--accent)' : 'transparent',
      color: onNow(d.id) ? '#1B1917' : 'var(--t2)',
      border: onNow(d.id) ? 'transparent' : 'var(--rule)',
      go: () => this.setState((x) => {
        const cur = Array.isArray(x.rqs) ? x.rqs : [];
        const had = cur.some((q) => q && q.src === 'line' && q.id === d.id);
        const rest = cur.filter((q) => !(q && q.src === 'line' && q.id === d.id));
        return { rqs: had ? rest : rest.concat([Object.assign({ id: d.id }, d.clause)]) };
      }),
    }));
    const ratio = this.ratioControl('rqs', L, ar);
    let rows = D.companies.filter(c => (st.sector === 'All' || c.sector === st.sector))
      .filter(c => !q || this.fold(c.name.en).includes(q) || this.fold(c.name.ar).includes(q) || this.fold(c.ticker).includes(q))
      .filter(c => this.passesClauses(c, st.rqs, ar, rctx));
    const key = st.sort;
    // A ratio can be sorted on whether or not it is one of the drawn columns:
    // it lives under `ratios` rather than on the row, so `a[key]` finds
    // nothing and every company would tie.
    // Widened to the whole registry ONLY together with the accessor below.
    // Widening the Set alone would send a volume sort through `ratioValue`,
    // which reads `(c.ratios||{}).avgVolume` — null for all 284 — so every row
    // ties, the comparator sinks them all, and the column silently stops
    // sorting while looking fine.
    const MEASURES = this.measures(ar);
    const RATIO_KEYS = new Map(MEASURES.map((m) => [m.id, m]));
    const cell = (row) => key === 'ticker' ? row.ticker
      : key === 'name' ? this.nm(row.name)
      : key === 'sector' ? sectorName(row.sector)
      : RATIO_KEYS.has(key) ? RATIO_KEYS.get(key).read(row)
      : row[key];
    rows = rows.slice().sort((a,b) => {
      const va = cell(a);
      const vb = cell(b);
      if (va === null || va === '—') return 1; if (vb === null || vb === '—') return -1;
      if (typeof va === 'string') return va.localeCompare(vb) * st.dir * -1;
      return (va - vb) * st.dir;
    });

    // The ratio being tested becomes a column of its own, so a reader can see
    // the figure the filter acted on rather than take it on trust. P/E is
    // already drawn, so it is not drawn twice.
    // The figure a filter acted on becomes a column, so a reader can see it
    // rather than take it on trust — the principle this file already states
    // above. It now resolves through `measures()` rather than the filed seven,
    // because a volume chip filters on a number the table draws nowhere, which
    // is the invisible-filter version of the same trust problem.
    const shownClause = (Array.isArray(st.rqs) ? st.rqs : [])
      .find((q) => q && q.k !== 'absent' && q.m && q.m !== 'pe');
    const shownRatio = shownClause
      ? this.measures(ar).find((m) => m.id === shownClause.m) : null;
    const colDef = [['ticker',ar?'الرمز':'Ticker','start'],['name',ar?'الاسم':'Company','start'],['sector',ar?'القطاع':'Sector','start'],
      ['close',ar?'الإغلاق':'Close','end'],['pct','%','end'],['cap',ar?'القيمة':'Cap','end'],['pe','P/E','end']]
      .concat(shownRatio ? [[shownRatio.id, shownRatio.name, 'end']] : []);
    // A-Z under a down arrow, because the string branch below multiplies by
    // -1 to put text in reading order on the first click while the numeric
    // columns put the largest first. The caret was read off `st.dir` alone,
    // so Ticker, Company and Sector all pointed the wrong way while Close, %,
    // Cap and P/E pointed the right one.
    const TEXT_COL = new Set(['ticker', 'name', 'sector']);
    const cols = colDef.map(([id,label,align]) => ({
      label, align,
      caret: st.sort === id
        ? ((st.dir === -1) !== TEXT_COL.has(id) ? ' ↓' : ' ↑') : '',
      color: st.sort === id ? 'var(--ink)' : 'var(--faint)',
      go: () => this.setState(s => ({ sort:id, dir: s.sort === id ? -s.dir : -1 }))
    }));

    const sectorList = ['All'].concat(Array.from(new Set(D.companies.map(c => c.sector))));
    const sectorChips = sectorList.map(s => {
      const on = st.sector === s;
      return { label: s === 'All' ? (ar?'الكل':'All sectors') : sectorName(s), go: () => this.setState({ sector:s }),
        border: on ? 'transparent' : 'var(--rule)', color: on ? '#1B1917' : 'var(--t2)', bg: on ? 'var(--accent)' : 'transparent', sh: on ? 'var(--shPill)' : 'none' };
    });

    // Above mkRow, which reads it — and mkRow is called by the movers and the
    // watchlist alike, so it has to exist before the first of them.
    const watchedSet = new Set(this._watch || []);
    const mkRow = c => ({ ticker:c.ticker, name:this.nm(c.name), sector: sectorName(c.sector),
      // A price in another currency says which. It is one word, and without
      // it the figure is wrong by a factor of fifty.
      close: c.close === '\u2014' ? '\u2014'
        : (c.foreignCurrency ? c.currency + ' ' : '') + this.num(c.close),
      pct: this.pct(c.pct), color: this.dcol(c.pct),
      // A market capitalisation cannot be negative; anything that says so
      // is a units error, not a small company.
      cap: (typeof c.cap === 'number' && c.cap > 0) ? this.money(c.cap) : '—',
      pe: c.pe ? c.pe.toFixed(1) : '—',
      // The figure the filter acted on, in the same unit the box asks for, so
      // "ROE more than 20" and a column reading 36.1% are the same scale.
      extra: (() => {
        if (!shownRatio) return '';
        // Through the measure's own accessor, so a column can draw a figure
        // `ratioValue` cannot reach.
        const v = shownRatio.read(c);
        if (v === null) return '—';
        // `.toFixed(2)` on two million is not a volume.
        if (shownRatio.whole) return this.num(v, 0);
        return shownRatio.scale === 0.01 ? (v * 100).toFixed(1) + '%'
          : shownRatio.unit === '%' ? v.toFixed(2) + '%' : v.toFixed(2);
      })(),
      hasExtra: Boolean(shownRatio),
            // A share that closed exactly flat is not a share that fell. 50 of the
      // 282 did today, and each got a down arrow beside "0.00%" on the same
      // site whose Home screen counts them as held. `dcol(0)` already returns
      // the neutral colour, so only the glyph contradicted the figure.
      arrow: !c.pct ? '' : (c.pct > 0 ? '\u2197' : '\u2198'),
      mag: (c.pct === null || c.pct === undefined) ? '0%' : Math.max(6, Math.min(100, Math.abs(c.pct) / 6 * 100)).toFixed(0) + '%',
      go: () => this.setState({ screen:'company', ticker: c.ticker }),
      // A ticker and nothing else, which is all a watchlist entry is.
      watched: watchedSet.has(c.ticker),
      star: watchedSet.has(c.ticker) ? '\u2605' : '\u2606',
      starColor: watchedSet.has(c.ticker) ? 'var(--accent)' : 'var(--faint)',
      followLabel: watchedSet.has(c.ticker) ? L.unfollow : L.follow,
      follow: (e) => { if (e && e.stopPropagation) e.stopPropagation();
        this.onWatch && this.onWatch(c.ticker); } });

    // home
    const byMove = D.companies.filter(c => c.pct !== null).slice().sort((a,b) => Math.abs(b.pct) - Math.abs(a.pct));
    const movers = byMove.slice(0,9).map(mkRow);
    // The design named five tickers; a real dataset may not contain them, and a
    // demo deliberately does not. Prefer the named ones when present, then fill
    // from the largest companies, so the block is never short or empty-handed.
    // The reader's own list. `_watch` is the ticker array main.js keeps in
    // step with localStorage; the rows are the directory's, so a followed
    // company carries the same close and move it does everywhere else. A
    // ticker followed and later delisted simply drops out rather than
    // rendering a row of dashes.
    const followedCos = (this._watch || [])
      .map((t) => D.companies.find((c) => c.ticker === t))
      .filter(Boolean);
    // A card each, with the company's own closes under it. `_series` is what
    // main.js fetches per followed ticker; a company with no published series
    // keeps its card and loses its line rather than getting an invented one.
    const followed = followedCos.map((c) => {
      const row = mkRow(c);
      const points = ((this._series || {})[c.ticker] || []).slice(-90);
      const up = (c.pct || 0) >= 0;
      return Object.assign(row, {
        spark: this.sparkOf(points, up),
        hasSpark: points.length > 1,
        sparkNote: points.length > 1
          ? L.followSessions.replace('{n}', String(points.length)) : L.followNoSeries,
        tint: !c.pct ? 'var(--sunk)' : (up ? 'var(--upTint)' : 'var(--downTint)'),
      });
    });
    // Counted off the companies rather than off the rendered rows: a row shows
    // an empty arrow both for a share that closed exactly flat and for one
    // with no price at all, and those are not the same fact. Only the priced
    // ones are counted, and the total says so, so the three add up.
    const followPriced = followedCos.filter((c) => typeof c.pct === 'number');

    // Headed "Watchlist", this was five tickers the design happened to name —
    // COMI, KORA, ETEL, TMGH, AMOC — padded from the largest companies. All
    // five exist, so it looked entirely plausible; every signed-in reader saw
    // the identical list, none of them had chosen it, and there was no control
    // to change it. A heading that claims a personalisation the site does not
    // have is a claim about the reader, not about the exchange. It is derived
    // now, and says what it is.
    const watchlist = D.companies.slice()
      .sort((a, b) => (b.cap || 0) - (a.cap || 0))
      // Twelve rather than five. The column beside this one runs ~360px
      // longer, and the honest way to close that is more of a list that HAS
      // more — 284 companies are ranked here and five was an arbitrary cut —
      // rather than padding a card with empty space to meet it.
      .slice(0, 12).map(mkRow);

    // Which shares changed hands far more than they usually do. Twice their
    // own twenty-session median is the line, and it is OURS rather than the
    // exchange's — which is why the block says so underneath rather than
    // presenting the threshold as a fact about the market. A busy day is a
    // question worth asking, not an answer (§8): nothing here says why the
    // volume was there or what to do about it.
    const BUSY_AT = 2;
    // Eight, not nine: this card and "What to read now" sit side by side, and
    // Read now can only ever hold three (a first-since, a silence, and the
    // expected-filings count — `readNowCards` builds no fourth). One row less
    // here is most of what closed a 101px step between two cards on one line.
    const BUSY_SHOWN = 8;
    // Every company that cleared the line, before the block takes nine of
    // them. Counted because the nine were presented as though they were the
    // whole list: on 31 August sixty-four companies traded at twice their own
    // normal volume and Home showed the busiest nine, so a crossing could say
    // CPME went at 7.07x its usual and Home — which had it eleventh — showed
    // nothing. Two screens telling a reader different things about the same
    // company, and neither of them wrong.
    /* How widely the market moved, published if we have it and counted if we
       do not.
       `market-history.json` carries a breadth block, but a signed-out reader
       gets the demo tree, which has none — so the one genuinely visual answer
       on Home rendered for members and vanished for everybody meeting the
       product for the first time. The companies are already loaded either way
       and each carries the day's percentage, so the same three numbers can be
       counted from them. `counted` travels with the result and is drawn, so
       the denominator is never implied. */
    const breadth = (() => {
      const pub = D.breadth;
      if (pub && typeof pub.counted === 'number' && pub.counted > 0) return pub;
      const moved = (D.companies || []).filter((c) => typeof c.pct === 'number');
      if (!moved.length) return null;
      const up = moved.filter((c) => c.pct > 0).length;
      const down = moved.filter((c) => c.pct < 0).length;
      return { up, down, flat: moved.length - up - down, counted: moved.length, date: D.marketDate };
    })();

    const busyAll = D.companies
      .filter((c) => typeof c.rv === 'number' && c.rv >= BUSY_AT)
      .sort((a, b) => b.rv - a.rv);
    const busy = busyAll
      .slice(0, BUSY_SHOWN)
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
    // Home's index cards, keyed, so the Exchange screen can draw the same
    // series under the same number rather than a second reading of it.
    const indexById = new Map();
    const indices = say(D.indices || [], ['label']).map((ix) => {
      indexById.set(ix.id, ix);
      return Object.assign({}, ix, { spark: this.sparkOf(ix.points, ix.up), go: this.go('exchange') });
    });

    const readNow = say(D.readNow || [], ['kind', 'title', 'stamp']).map((r) => Object.assign({}, r, {
      go: r.ticker
        ? () => this.setState({ screen: 'company', ticker: r.ticker })
        : this.go(r.screen || 'calendar'),
    }));

    // today
    // The demo's stories run on the demo's companies, and are attributed to an
    // outlet that does not exist. They used to name El Sewedy Electric, CIB,
    // Alexandria Mineral Oils and the Suez Canal, each attributed to a real
    // Egyptian outlet, with a time and a date on it — five invented news items
    // about real listed companies, on the page every signed-out visitor lands
    // on. data.js opens by saying why the demo exchange is DEMO01..DEMO16 and
    // not COMI: "a screenshot of an invented price under a real company's name
    // is a fabricated financial figure". A fabricated headline is the same
    // thing with a byline on it. The feed had simply never been held to the
    // rule the market table was built around.
    const demoCo = (n) => {
      const c = D.companies[n];
      return c ? [{ ticker: c.ticker, go: () => this.setState({ screen:'company', ticker: c.ticker }) }] : [];
    };
    const demoWire = ar ? 'وكالة تجريبية' : 'Sample Wire';
    const allFeed = (D.feed ? say(D.feed, ['kind','headline','why','because','source']) : !D.demo ? [] : [
      { kind: ar?'إفصاح':'Filing', kindColor:'var(--accent)', tint:'var(--accTint)', time:'11:48', date:'2026-08-27', source: demoWire, href:'#',
        headline: ar?'شركة تجريبية ١: القوائم المالية المستقلة والمجمعة عن الفترة المنتهية ٣٠ يونيو ٢٠٢٦':'Sample Company 1: standalone and consolidated statements for the period ended 30 June 2026',
        why: ar?'الميزانية تذكر قروضاً بـ ١٨٦٩٫١ مليون جنيه، منها ١٧٩٥٫٥ مليون تستحق خلال عام.':'The balance sheet states borrowings of EGP 1,869.1m, of which 1,795.5m falls due within a year.',
        tickers: demoCo(0) },
      { kind: ar?'خبر':'News', kindColor:'var(--t2)', tint:'var(--sunk)', time:'10:12', date:'2026-08-27', source: demoWire, href:'#',
        headline: ar?'شركة تجريبية ٥ توقّع عقداً لتوريد كابلات لمشروع نقل كهرباء':'Sample Company 5 signs a cable supply contract for a power transmission project',
        why: ar?'الشركة لم تُفصح عن قيمة العقد للبورصة حتى وقت النشر.':'The company has not filed a contract value with the exchange as at publication.',
        tickers: demoCo(4) },
      { kind: ar?'خبر':'News', kindColor:'var(--t2)', tint:'var(--sunk)', time:'09:35', date:'2026-08-27', source: demoWire, href:'#',
        headline: ar?'مؤشر الشحن في السوق التجريبي يرتفع للشهر الثالث على التوالي':'Shipping receipts on the sample exchange rise for a third consecutive month',
        why: ar?'هذه بيانات تجريبية، وليست رقماً منشوراً عن أي جهة حقيقية.':'These are demonstration figures, not a published number about any real body.',
        tickers:[] },
      { kind: ar?'إفصاح':'Filing', kindColor:'var(--accent)', tint:'var(--accTint)', time:'16:02', date:'2026-08-26', source: demoWire, href:'#',
        headline: ar?'شركة تجريبية ٣: إفصاح عن توزيعات نقدية مرحلية':'Sample Company 3: disclosure of an interim cash distribution',
        why: ar?'المستند الموقّع مُتاح في أرشيف الإفصاحات.':'The signed document is available in the disclosure archive.',
        tickers: demoCo(2) },
      { kind: ar?'خبر':'News', kindColor:'var(--t2)', tint:'var(--sunk)', time:'14:20', date:'2026-08-26', source: demoWire, href:'#',
        headline: ar?'شركة تجريبية ١١ تُنهي الجلسة بأعلى تحرك في القطاع':'Sample Company 11 ends the session with the sector\u2019s largest move',
        why: ar?'بيانات العرض التجريبي تذكر ٤٫٠٢٪ على حجم ١٫٢ مليون سهم.':'The demonstration data states +4.02% on volume of 1.2m shares.',
        tickers: demoCo(10) }
    ]).map((f, idx) => Object.assign({}, f, {
      hasWhy: Boolean(f.why), hasBecause: Boolean(f.because),
      audioPlaying: Boolean(st.audioPlaying && st.audioItem === ('news-' + (f.id || f.headline || idx))),
      audioLabel: (st.audioPlaying && st.audioItem === ('news-' + (f.id || f.headline || idx)))
        ? (ar ? '⏸️ إيقاف' : '⏸️ Stop')
        : (ar ? '🔊 استمع' : '🔊 Listen'),
      toggleAudio: () => {
        const text = (f.headline || '') + '. ' + (f.why || f.because || '');
        this.playSpeech(text, 'news-' + (f.id || f.headline || idx));
      },
      // One stamp, through the same formatter the Crossings screen uses, so
      // the two screens side by side agree on how a date looks in Arabic.
      when: (f.date ? this.dayLabel(f.date) : '') + (f.time ? ' · ' + f.time : ''),
      becauseDate: f.evidenceDate && f.evidenceDate !== f.date ? this.dayLabel(f.evidenceDate) : '',
      because: f.because || '', image: this.imageSrc(f.image),
      hasImage: Boolean(f.image),
      loadingAttr: idx < 4 ? 'eager' : 'lazy',
      priorityAttr: idx < 4 ? 'high' : 'auto',
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
    const rangeMap = { '1W':5, '1M':21, '3M':63, '1Y':250, '5Y':1250 };
    const ranges = Object.keys(rangeMap).map(k => ({ label:k, go: () => this.setState({ range:k }),
      color: st.range === k ? 'var(--ink)' : 'var(--t2)', bg: st.range === k ? 'var(--surface)' : 'transparent', sh: st.range === k ? 'var(--shPill)' : 'none' }));
    const slice = D.series.slice(-rangeMap[st.range]);
    const chart = this.buildChart(slice);

    // The company on screen. `this._co` is the loaded document, set by main.js
    // when a ticker is opened; the block below is the demo's worked example and
    // remains the shape everything else is written against.
    //
    // It used to be a literal headed KORA / KORRA / Utilities, with a close of
    // 12.40, a market cap, a P/E, an EPS, a share count of 337,096,774 and a
    // paragraph describing the company's generation and distribution assets —
    // and KORA is not an invented ticker. It is قرة لمشروعات الطاقة والاستثمار,
    // listed on EGX, in exactly that sector. So the signed-out company screen
    // published a full invented profile, five periods of invented statements
    // included, under a real listed company's name. data.js:8 sets out why the
    // demo exchange is DEMO01..DEMO16; this screen had never been brought
    // inside that rule. It now runs on the demo's own first company, so the
    // worked example demonstrates the layout and asserts nothing about anyone.
    const loaded = this._co && this._co.ticker === st.ticker ? this._co : null;
    // The company the reader actually opened, not always the first one. The
    // demo has one worked example and every row led to it, so clicking DEMO15
    // gave a card headed DEMO01 — the site answering a click with a different
    // company than the one clicked. Its identity and its prices are the demo
    // exchange's own for that ticker; the rest of the tiles stay the worked
    // example, which the brief on the same card says in both languages is
    // generated and filed by nobody.
    const demoCo0 = (st.ticker && D.companies.find((c) => c.ticker === st.ticker))
      || D.companies[0] || {};
    const coDesign = {
      ticker: demoCo0.ticker || 'DEMO01', sector: sectorName(demoCo0.sector), sectorKey: demoCo0.sector || '',
      exchange: ar?'سوق تجريبي':'Sample exchange',
      nameEn: (demoCo0.name && demoCo0.name.en) || 'Sample Company 1',
      nameAr: (demoCo0.name && demoCo0.name.ar) || 'شركة تجريبية ١',
      primaryName: ar ? ((demoCo0.name && demoCo0.name.ar) || 'شركة تجريبية ١') : ((demoCo0.name && demoCo0.name.en) || 'Sample Company 1'),
      secondaryName: ar ? ((demoCo0.name && demoCo0.name.en) || 'Sample Company 1') : ((demoCo0.name && demoCo0.name.ar) || 'شركة تجريبية ١'),
      primaryFont: ar ? "'IBM Plex Sans Arabic',sans-serif" : "'Bricolage Grotesque',serif",
      close: this.num(demoCo0.close), chg: this.signed(typeof demoCo0.close === 'number' && typeof demoCo0.pct === 'number'
        ? demoCo0.close - demoCo0.close / (1 + demoCo0.pct / 100) : null),
      pct: this.pct(demoCo0.pct), color: this.dcol(demoCo0.pct),
      arrow: !demoCo0.pct ? '' : (demoCo0.pct > 0 ? '\u2197' : '\u2198'), closeDate: D.marketDate || '—',
      brief: ar?'هذه شركة تجريبية لا وجود لها، تُستخدم لعرض شكل الشاشة قبل تسجيل الدخول: أرقامها مولّدة، وليست مأخوذة من أي إفصاح. بعد تسجيل الدخول تقرأ هذه الفقرة من briefs/<الرمز>.json كما وُلّدت في البناء اليومي.'
        :'This is an invented company, shown so the screen has a shape before you sign in: its figures are generated, not filed by anyone. Once you are signed in this paragraph is rendered from briefs/<ticker>.json as generated in the daily build.',
      briefFacts:[
        { label: ar?'القطاع':'Sector', value: sectorName(demoCo0.sector) },
        { label: ar?'الأسهم المُصدرة':'Shares outstanding', value:'337,096,774' },
        { label: ar?'وحدة الإفصاح':'Filing currency', value:'EGP' }
      ],
      briefSource: ar?'بيانات عرض تجريبي':'demonstration data',
      stats:[
        { label: ar?'القيمة السوقية':'Market cap', value: this.money(demoCo0.cap), color:'var(--ink)', note:'' },
        { label: ar?'أسبوع':'1W', value:'−1.84%', color:'var(--down)', note:'' },
        { label: ar?'شهر':'1M', value:'+6.21%', color:'var(--up)', note:'' },
        { label: ar?'الحجم':'Volume', value:'118,422', color:'var(--ink)', note:'' },
        // The same two tiles the live screen carries, so the demo goes on
        // being a picture of the real screen rather than of most of it. The
        // turnover is this demo's own volume times its own close — invented,
        // like every figure here, and at least arithmetic a reader who checks
        // will find holds.
        { label: ar?'الصفقات':'Trades', value:'642', color:'var(--ink)',
          note: ar?'في الجلسة':'in the session' },
        { label: ar?'قيمة التداول':'Turnover', value: this.money(5956626),
          color:'var(--ink)', note: ar?'في الجلسة':'in the session' },
        { label:'P/E', value: typeof demoCo0.pe === 'number' ? this.num(demoCo0.pe, 1) : '\u2014', color:'var(--ink)',
          note: ar?'عن FY 2024':'over FY 2024' },
        { label: ar?'م/ر · ١٢ شهراً':'P/E · 12M', value:'9.4', color:'var(--ink)',
          note: ar?'حتى H1 2026':'to H1 2026' },
        { label: ar?'ربحية السهم':'EPS', value:'1.11', color:'var(--ink)', note:'FY 2024' }
      ],
      ttmWorking: ar
        ? 'رقم الاثني عشر شهراً هو FY 2025 + H1 2026 − H1 2025، أي ١٫٣٢ جنيه للسهم. ثلاثة أرقام مُفصح عنها وطرح — لا شيء هنا متوقَّع.'
        : 'The 12-month figure is FY 2025 + H1 2026 - H1 2025, which is EGP 1.32 a share. Three filed figures and a subtraction \u2014 nothing here is forecast.'
    };

    // Live, before a document lands — and live for a company whose document
    // carries none of these fields — the screen shows dashes. It used to show
    // the design's worked example: KORRA, a utilities company that does not
    // exist, at 12.40, with a description explaining what briefs/KORA.json
    // would have said. Under a real ticker in the header, that is an invented
    // company file.
    const co = D.demo ? Object.assign({}, coDesign) : {
      ticker: st.ticker || '—', sector:'—', sectorKey:'', exchange:'EGX',
      nameEn: st.ticker || '—', nameAr: st.ticker || '—',
      primaryName: st.ticker || '—', secondaryName: '',
      primaryFont: ar ? "'IBM Plex Sans Arabic',sans-serif" : "'Bricolage Grotesque',serif",
      close:'—', chg:'—', pct:'—', color:'var(--faint)', arrow:'', closeDate:'—',
      brief: L.nothingYet, briefFacts: [], briefSource:'—', stats: [], ttmWorking:'',
    };

    if (loaded) {
      const pct = loaded.pct === null || loaded.pct === undefined ? null : loaded.pct;
      const p = loaded.profile || {};
      // The live feed's figures while the session runs, the document's own —
      // written by the last harvest of the day — once it does not. Same
      // bargain the price makes one tile up.
      const num = (v) => (typeof v === 'number' ? v : null);
      const sessionTrades = num(loaded.trades) ?? num(p.trades);
      const sessionValue = num(loaded.turnover) ?? num(p.turnover);
      const perf = (v) => (v === null || v === undefined ? '—' : this.pct(v));
      const whole = (v) => (v === null || v === undefined ? '—' : this.num(v, 0));
      Object.assign(co, {
        brief: (() => { const b = (ar ? loaded.briefAr : loaded.brief) || ''; return (b && !DIRECTIVE.test(b) ? b : '') || L.nothingYet; })(),
        briefFacts: [
          { label: ar?'القطاع':'Sector', value: sectorName(loaded.sector) },
          { label: ar?'الأسهم المُصدرة':'Shares outstanding', value: whole(p.shares_outstanding) },
          { label: ar?'وحدة الإفصاح':'Filing currency', value:'EGP' },
          // The ratios section told every reader free float "is not published
          // anywhere and has no substitute", on 258 pages, while the profile
          // the same page had already loaded for its market cap carried it.
          ...(typeof p.free_float === 'number'
            ? [{ label: ar?'نسبة التداول الحر':'Free float',
                 value: (p.free_float * 100).toFixed(1) + '%' }]
            : []),
        ],
        // A tile always carries a `note`, even an empty one, so the markup can
        // ask every tile the same question. The two tiles built on a filing
        // fill it with the period that filing covers.
        stats: [
          // The exchange states every market value in pounds, including for
          // the listings it quotes in dollars. Unlabelled, the two figures on
          // this screen invite a reader to divide one by the other and get a
          // company a fiftieth of its own size.
          { label: ar?'القيمة السوقية':'Market cap', value: this.money(p.market_cap), color:'var(--ink)',
            note: loaded.currency ? (ar ? 'بالجنيه' : 'in EGP') : '' },
          { label: ar?'أسبوع':'1W', value: perf(p.perf_1w), color: this.dcol(p.perf_1w), note:'' },
          { label: ar?'شهر':'1M', value: perf(p.perf_1m), color: this.dcol(p.perf_1m), note:'' },
          // The session's own volume, which market.json publishes and data.js
          // has always mapped onto every directory row. This tile printed the
          // THIRTY-DAY MEAN directly beside the close and the session date,
          // where it reads as the volume for that session — COMI showed
          // 3,192,564 against an actual 5,780,737 already in memory. The
          // average is worth having and now says that it is one.
          { label: ar?'الحجم':'Volume', value: whole(loaded.volume), color:'var(--ink)',
            note: ar?'في الجلسة':'in the session' },
          { label: ar?'متوسط ٣٠ يوماً':'30-day average', value: whole(p.avg_volume_30d),
            color:'var(--t2)', note:'' },
          /* How many times the share changed hands, and for how much.
           *
           * Volume is shares and turnover is pounds, and the pair says
           * something neither says alone: a million shares of a two-pound
           * company and a million of a hundred-pound one are the same volume
           * and fifty times the money. The trade count is the third leg —
           * turnover divided by it is roughly what one buyer brought, which
           * is how a day of institutional blocks reads differently from a day
           * of retail.
           *
           * Both are the EXCHANGE's, and only 221 of 282 are on that half of
           * the feed; the rest show a dash rather than a nought, because no
           * trades and no figure are different facts about a session.
           */
          { label: ar?'الصفقات':'Trades',
            value: whole(sessionTrades), color: sessionTrades === null ? 'var(--faint)' : 'var(--ink)',
            note: sessionTrades === null ? '' : (ar?'في الجلسة':'in the session') },
          { label: ar?'قيمة التداول':'Turnover',
            value: sessionValue === null ? '\u2014' : this.money(sessionValue),
            color: sessionValue === null ? 'var(--faint)' : 'var(--ink)',
            note: sessionValue === null ? '' : (ar?'في الجلسة':'in the session') },
          // The multiple the pipeline published, beside the price it was struck
          // against. This used to prefer the review document's figure, which is
          // a different claim wearing the same two letters: the review divides
          // the close *at the last filed period end* by that period's earnings,
          // so it is a P/E as it stood a year ago, printed under today's close.
          // The historical series still belongs — it is in the ratios block
          // below, where every point carries its own period label.
          { label:'P/E',
            value: typeof loaded.pe === 'number' ? this.num(loaded.pe, 1) : '\u2014',
            color: typeof loaded.pe === 'number' ? 'var(--ink)' : 'var(--faint)',
            note: typeof loaded.pe === 'number' && loaded.pePeriod
              ? (ar ? 'عن ' + loaded.pePeriod : 'over ' + loaded.pePeriod) : '' },
          // The same price over the last twelve months the company FILED.
          // The annual tile beside it can be struck against earnings twenty
          // months old — most of the exchange is still on FY 2024 — so a
          // company whose profit has doubled since reads as twice as expensive
          // as it is. ARCC is 24.4 on its annual and 5.7 on its twelve months.
          // Three filed figures and a subtraction (build_ttm_pe.py), never a
          // forecast; the note names the window so two P/Es on one screen
          // cannot read as one figure disagreeing with itself.
          { label: ar?'م/ر · ١٢ شهراً':'P/E · 12M',
            value: typeof loaded.peTtm === 'number' ? this.num(loaded.peTtm, 1) : '\u2014',
            color: typeof loaded.peTtm === 'number' ? 'var(--ink)' : 'var(--faint)',
            note: typeof loaded.peTtm === 'number' && loaded.peTtmTo
              ? (ar ? 'حتى ' + loaded.peTtmTo : 'to ' + loaded.peTtmTo) : '' },
          { label: ar?'ربحية السهم':'EPS',
            value: typeof loaded.eps === 'number' ? this.num(loaded.eps, 2) : '\u2014',
            color: typeof loaded.eps === 'number' ? 'var(--ink)' : 'var(--faint)',
            note: typeof loaded.eps === 'number' && loaded.epsPeriod ? loaded.epsPeriod : '' },
        ],
        // The sum behind the twelve months, under the tiles, so the figure can
        // be taken apart without opening three filings.
        ttmWorking: typeof loaded.peTtm === 'number' && loaded.peTtmWindow
          ? L.ttmWorking.replace('{window}', loaded.peTtmWindow)
              .replace('{eps}', this.num(loaded.epsTtm, 2))
          : '',
        ticker: loaded.ticker,
        nameEn: loaded.name && loaded.name.en ? loaded.name.en : loaded.ticker,
        nameAr: loaded.name && loaded.name.ar ? loaded.name.ar : (loaded.name && loaded.name.en) || loaded.ticker,
        primaryName: ar
          ? (loaded.name && loaded.name.ar ? loaded.name.ar : ((loaded.name && loaded.name.en) || loaded.ticker))
          : (loaded.name && loaded.name.en ? loaded.name.en : loaded.ticker),
        secondaryName: ar
          ? (loaded.name && loaded.name.en ? loaded.name.en : '')
          : (loaded.name && loaded.name.ar ? loaded.name.ar : ''),
        primaryFont: ar ? "'IBM Plex Sans Arabic',sans-serif" : "'Bricolage Grotesque',serif",
        sector: sectorName(loaded.sector) || co.sector,
        sectorKey: loaded.sector || co.sectorKey || '',
        // Eleven listings are quoted in dollars. The market table says so;
        // this screen printed the bare number in a design where every other
        // figure is pounds.
        close: loaded.close === null || loaded.close === undefined
          ? '—'
          : (loaded.currency ? loaded.currency + ' ' : '') + this.num(loaded.close),
        pct: pct === null ? '—' : this.pct(pct),
        // The move in pounds, beside the move in percent. Every real company
        // printed a literal em dash here — the design's default, which the
        // loaded branch overwrote for close, percent, colour and arrow and
        // never for this — so the header read "— −1.19% ↘". market.json gives
        // the close and the fraction; the previous close is the one implied by
        // the pair, and the difference is what a reader can check against it.
        chg: (() => {
          const c = loaded.close;
          if (pct === null || typeof c !== 'number' || pct <= -100) return '—';
          // Signed the same way `pct` beside it is, so the header does not put
          // a typographic minus next to an arithmetic one.
          return (loaded.currency ? loaded.currency + ' ' : '') + this.signed(c - c / (1 + pct / 100));
        })(),
        color: this.dcol(pct),
        // As above: exactly flat is not a fall.
        arrow: !pct ? '' : (pct > 0 ? '\u2197' : '\u2198'),
        closeDate: loaded.closeDate || D.marketDate || co.closeDate,
        briefSource: loaded.briefSource || `companies/${loaded.ticker}.json`,
      });
    }

    // A rail of every listed company, so changing company does not mean going
    // back to the market table and finding it again. Grouped by sector because
    // 282 tickers in one strip is a haystack, and the sector a reader is
    // already looking at is the one they are most likely to want another of.
    const pickSector = st.pickSector || (co.sectorKey || 'All');
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
      name: name === L.allSectors ? name : sectorName(name),
      on: name === pickSector,
      bg: name === pickSector ? 'var(--surface)' : 'transparent',
      fg: name === pickSector ? 'var(--ink)' : 'var(--t2)',
      sh: name === pickSector ? 'var(--shPill)' : 'none',
      go: () => this.setState({ pickSector: name }),
    }));


    // ── what ties these together ─────────────────────────────────────────
    //
    // The app's block, on the same document, plus the one thing a wide screen
    // can show that a phone cannot: WHEN. A crossing is a claim about time —
    // a filing, a story and a session inside four days — and the app can only
    // print three dates and leave the reader to hold them. Here the window is
    // drawn, and each thread sits on the day it happened, so the shape of the
    // crossing is visible before a word of it is read.
    //
    // Nothing on a card is this site's own claim. Every thread is a link back
    // to the document it came from, and both sentences are the pipeline's,
    // written from fixed templates (build_connections_api.py).
    const STRAND = {
      filing: [L.dotsFiling, 'var(--accent)', 'var(--accTint)',
        'M6 3.4h7.4l4.2 4.2v13H6zM13.4 3.4v4.2h4.2M8.6 12h6.8M8.6 15.4h6.8'],
      news: [L.dotsNews, 'var(--iris)', 'var(--irisTint)',
        'M4.4 5.6h13v13H5.6a1.2 1.2 0 0 1-1.2-1.2zM17.4 8.4h2.2v8.8a1.2 1.2 0 0 1-2.2.7M7 8.8h7.4M7 12h7.4M7 15.2h4.6'],
      session: [L.dotsSession, 'var(--ink)', 'var(--sunk)',
        'M4.2 18.4 9 12.2l3.6 3 5.4-7.6M14.4 7.6h3.6v3.6'],
    };
    const crossings = (() => {
      const src = D.crossings;
      const rows = (src && src.items) || [];
      if (!rows.length) return [];
      const axis = (src.axis || []);
      const days = src.days || 4;
      return rows.map((item) => {
        const known = D.companies.some((c) => c.ticker === item.ticker);
        // Session first. The cap shows four, in document order, and CFGH's
        // four were all press — the "That session" thread that dates the
        // header's move and its volume ratio sat behind "1 more".
        const raw = item.strands || [];
        const ordered = raw.filter((s) => s.kind === 'session').concat(raw.filter((s) => s.kind !== 'session'));
        const strands = ordered.map((st, n) => {
          const [label, color, tint, icon] = STRAND[st.kind] || STRAND.filing;
          return {
            // A session is a number rather than a document, so it says the
            // number instead of a headline it does not have.
            title: st.kind === 'session'
              ? L.dotsVolume.replace('{ratio}', (st.ratio || item.ratio || 0).toFixed(2))
              : (ar ? st.titleAr : st.title),
            label, color, tint, icon,
            day: this.dayLabel(st.date), date: st.date,
            // null, not '': dc.js sets href="" verbatim, and an empty href is
            // a link to the page you are on, opened in a new tab. Every
            // "That session" strand did exactly that.
            href: st.link || null, hasLink: Boolean(st.link),
            first: n === 0, last: n === (item.strands || []).length - 1,
            // The gutter draws a line up to a dot and on to the next; the
            // first has nothing above it and the last nothing below.
            stub: n === 0 ? 'transparent' : 'var(--thread, var(--rule))',
            tail: n === (item.strands || []).length - 1 ? 'transparent' : 'var(--thread, var(--rule))',
            pad: n === (item.strands || []).length - 1 ? '0' : '13px',
          };
        });
        // The window, one cell a day, with a dot for every thread that landed
        // on it. A day nothing happened on is drawn empty rather than dropped:
        // the gap is what makes the cluster mean anything.
        const cells = axis.map((iso) => {
          const on = strands.filter((x) => x.date === iso);
          return {
            label: this.dayLabel(iso), iso,
            dots: on.map((x) => ({ color: x.color })),
            has: on.length > 0, quiet: on.length === 0,
            dayColor: on.length ? 'var(--t2)' : 'var(--faint)',
          };
        });
        const count = strands.length;
        // The thread list is capped so one company with nine filings does not
        // make a card twice the height of the seven beside it. The rest are a
        // tap away rather than gone.
        const CAP = 4;
        const open = Boolean(st.crossMore && st.crossMore[item.ticker]);
        const shown = open ? strands : strands.slice(0, CAP);
        // The last one drawn ends the line, whether or not it ends the list.
        shown.forEach((x, n) => {
          x.tail = n === shown.length - 1 ? 'transparent' : 'var(--thread, var(--rule))';
          x.pad = n === shown.length - 1 ? '0' : '13px';
        });
        return {
          ticker: item.ticker,
          mono: item.ticker,
          // EGX tickers run to four letters and occasionally six. The app
          // shrinks to fit (BTickerMonogram); a fixed size here clipped the
          // ends off the longer ones inside their own tile.
          monoSize: item.ticker.length <= 4 ? '12px'
            : item.ticker.length === 5 ? '10.5px' : '9px',
          name: ar ? item.nameAr : item.name,
          sector: (ar && item.sectorAr) || item.sector || '—',
          why: ar ? item.whyAr : item.why,
          insight: ar ? item.insightAr : item.insight,
          hasInsight: Boolean(ar ? item.insightAr : item.insight),
          pct: item.pct === null ? '' : this.pct(item.pct),
          hasPct: item.pct !== null,
          color: this.dcol(item.pct),
          // Only where the session is one of the threads. Every crossing
          // carries a ratio, and printing 1.09× beside a company whose
          // crossing was a filing and a headline contradicts the number the
          // rest of the site teaches: 2× is the line.
          volume: (item.kinds || []).includes('session') && item.ratio !== null
            ? L.dotsVolume.replace('{ratio}', item.ratio.toFixed(2)) : '',
          hasVolume: (item.kinds || []).includes('session') && item.ratio !== null,
          threads: count === 1 ? L.dotsOneThread : L.dotsThreads.replace('{n}', count),
          hasMore: count > CAP,
          moreLabel: open ? L.dotsLess : L.dotsMore.replace('{n}', count - CAP),
          moreCaret: open ? '\u2212' : '+',
          toggleMore: () => this.setState((x) => ({
            crossMore: Object.assign({}, x.crossMore, { [item.ticker]: !open }),
          })),
          peers: (item.peers || []).length
            ? L.dotsPeers.replace('{n}', item.peers.length).replace('{same}', item.sameSector)
            : L.dotsPeersNone,
          cells, strands: shown,
          // A crossing about a company the directory does not hold opens
          // nothing, rather than an empty screen.
          go: known ? () => this.setState({ screen: 'company', ticker: item.ticker }) : null,
          arrow: known ? '\u2197' : '',
        };
      });
    })();
    // One key for the whole section. Eight axes of coloured dots say nothing
    // until something names the colours, and naming them on every card would
    // cost more room than the axes take.
    const crossLegend = D.crossings
      ? ['filing', 'news', 'session'].map((k) => ({ label: STRAND[k][0], color: STRAND[k][1] }))
      : [];
    const crossWindow = D.crossings
      ? L.dotsWindow.replace('{days}', String(D.crossings.days || 4)) : '';
    const crossBody = D.crossings
      ? L.dotsBody.replace('{days}', String(D.crossings.days || 4)) : '';
    const crossWorkings = D.crossings
      ? L.dotsWorkings.replace('{days}', String(D.crossings.days || 4)) : '';

    // ── who bought and who sold ──────────────────────────────────────────
    //
    // The exchange's own split, which it has always published and nothing here
    // read. Two facts a reader cannot get from a price: which nationality was
    // a net buyer, and whether the money moving was individuals' or
    // institutions'. Stated by the exchange period-to-date, so the screen says
    // so rather than let it read as today's session.
    const investors = (() => {
      const d = D.investors;
      if (!d || !d.parties || !d.parties.length) return null;
      const money = (v) => (typeof v === 'number' ? this.money(v) : '\u2014');
      const pct = (v) => (typeof v === 'number' ? v.toFixed(2) + '%' : '\u2014');
      const partyName = (p) => (ar ? (p.partyAr || p.party) : p.party);
      const widest = Math.max(1, ...d.parties.map((p) => Math.abs(p.net || 0)));
      // Two stacked bars, which is what the split actually is: one whole,
      // divided. Three separate progress bars invite reading each against the
      // full width, and the three shares are parts of the same 100%.
      const PARTY_TINT = ['var(--accent)', 'var(--iris)', 'var(--up)'];
      const stack = (rowsIn, name, value) => rowsIn.map((r, i) => ({
        label: name(r),
        percent: (value(r) || 0).toFixed(2) + '%',
        width: (value(r) || 0).toFixed(3) + '%',
        color: PARTY_TINT[i % PARTY_TINT.length],
      }));

      return {
        basis: d.basis, source: d.source, updatedAt: d.updatedAt,
        // The exchange's own date on the figures — not the fetch time — and the
        // value traded in the window. Without these the screen showed
        // cumulative figures with no date at all, and "period to date" named
        // no period. The stamp is Cairo local time as the exchange publishes it.
        asOfLine: d.asOf ? L.investorsAsOf + ' ' + String(d.asOf).replace('T', ' ').slice(0, 16) + ' (Cairo)' : '',
        equitiesLine: (d.equities && d.equities.length)
          ? L.investorsEquities + ' ' + d.equities.map((p) => (ar ? p.partyAr : p.party) + ' ' + (p.percent === null ? '—' : p.percent.toFixed(2) + '%')).join(' · ')
          : '',
        totalLine: typeof d.totalValue === 'number'
          ? L.investorsTotal + ' EGP ' + this.num(d.totalValue / 1e9, 2) + 'bn' : '',
        // Egyptians against Arabs against non-Arab foreigners.
        nationalityBar: stack(d.parties, partyName, (r) => r.percent),
        // And institutions against individuals, over turnover — see data.js.
        typeBar: stack(d.byType || [], (t) => (ar ? t.typeAr : t.type), (t) => t.percent),
        hasTypeBar: (d.byType || []).length > 0,
        // The share-of-value row: a bar apiece, drawn to the same scale.
        parties: d.parties.map((p) => ({
          party: partyName(p),
          percent: pct(p.percent),
          width: Math.max(2, (p.percent || 0)).toFixed(2) + '%',
          net: this.signed(typeof p.net === 'number' ? p.net / 1e6 : null, 1),
          netColor: this.dcol(p.net),
          buy: money(p.buy), sell: money(p.sell),
          // Each side against its OWN total, which is the exchange's own pair
          // of percentages — not one shared axis. Bonds carry 69bn of buying
          // against 10bn for shares alone, so a single scale would draw the
          // equity market as a hairline; and bills sold 105bn against 39bn
          // bought, so a figure read off the wrong side is both very wrong and
          // entirely plausible-looking.
          buyShare: L.investorsOfBuying.replace('{n}', pct(p.buyPercent)),
          sellShare: L.investorsOfSelling.replace('{n}', pct(p.sellPercent)),
          // Widths for the paired bars: each side against its own 100%, never
          // against the other. A bar drawn to a shared maximum would say the
          // larger side was the market, which it is not — every pound bought
          // is a pound sold.
          buyW: Math.max(0, Math.min(100, p.buyPercent || 0)).toFixed(2) + '%',
          sellW: Math.max(0, Math.min(100, p.sellPercent || 0)).toFixed(2) + '%',
          hasSides: typeof p.buy === 'number' || typeof p.sell === 'number',
          // Net against the widest net on the row, so the three are comparable
          // at a glance and a net buyer reads differently from a net seller.
          bar: Math.max(2, (Math.abs(p.net || 0) / widest) * 100).toFixed(1) + '%',
          buying: (p.net || 0) >= 0,
          barColor: (p.net || 0) >= 0 ? 'var(--up)' : 'var(--down)',
        })),
        columns: d.parties.map(partyName),
        // A row per investor type, a column per nationality — the app's table.
        bands: d.bands.map((b) => ({
          label: ar ? b.labelAr : b.label,
          net: this.signed(b.net / 1e6, 1), netColor: this.dcol(b.net),
          cells: b.cells.map((c, i) => ({
            party: d.parties[i] ? partyName(d.parties[i]) : '',
            net: this.signed(typeof c.net === 'number' ? c.net / 1e6 : null, 1),
            color: this.dcol(c.net),
            buy: money(c.buy), sell: money(c.sell),
          })),
        })),
      };
    })();

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

    // Where a filing is cited from. The exchange, for a filing the exchange
    // actually holds — and nowhere at all in the demo, whose filings do not
    // exist: an invented filing id pointed at egx.com.eg is a citation to a
    // document that is not there, which is worse than no citation.
    const filingSource = (given) => (given || (D.demo ? '' : 'https://www.egx.com.eg'));

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
        period:f.period, window: this.filedWindow(f), bg: i === 0 ? 'var(--sunk)' : 'transparent',
        revenue:this.num(f.revenue,1), grossProfit:this.num(f.gross_profit,1), operatingIncome:this.num(f.operating_income,1), netIncome:this.num(f.net_income,1),
        revColor: typeof f.revenue !== 'number' ? 'var(--faint)' : 'var(--ink)', gpColor: typeof f.gross_profit !== 'number' ? 'var(--faint)' : 'var(--ink)',
        opColor: typeof f.operating_income !== 'number' ? 'var(--faint)' : 'var(--ink)', niColor: typeof f.net_income !== 'number' ? 'var(--faint)' : 'var(--ink)',
        caret: open ? '\u2212' : '+', open, groups,
        more: present ? L.moreFigures.replace('{n}', present) : '',
        hasMore: present > 0,
        toggle: () => this.setState(s => ({ open: Object.assign({}, s.open, { [f.period]: !s.open[f.period] }) })),
        filingId:f.filing_id, filedOn: (f.filed || f.filed_on) ? (ar?'أُودع ':'Filed ') + (f.filed || f.filed_on) : '',
        source: filingSource(f.source),
        // WHERE THE ROW'S FIGURES CAME FROM, when they did not all come from
        // one place.
        //
        // 575 rows carry a balance sheet Mubasher published and a net profit
        // the exchange filed, and the footer cited only the filing — "Open on
        // the Egyptian Exchange" under a row whose assets, cash flow and
        // revenue are not in that document. The app made the opposite mistake
        // with the same rows, naming Mubasher over a profit the exchange
        // filed. A citation that covers one line of a row and is printed
        // under all of them is the shape this repo already calls worse than
        // no citation.
        // A COMPARATIVE row: the figure is the year-earlier line restated
        // inside a later filing, so its citation is a document headlined with
        // a different period. ABUK's H1 2025 (4,568.416m) is the "Net
        // Comparative profit" of the H1 2026 announcement, and "Open on the
        // Egyptian Exchange" landed a reader on H1 2026 with nothing saying
        // why. Eight rows carry the mark.
        restated: f.comparative && f.restated_for
          ? L.restatedIn.replace('{period}', f.restated_for) : '',
        mixed: (f.net_income_source && /egx\.com\.eg/i.test(f.net_income_source)
                && /mubasher/i.test(String(f.source || ''))
                && (f.assets !== undefined && f.assets !== null
                    || f.equity !== undefined && f.equity !== null
                    || f.revenue !== undefined && f.revenue !== null))
          ? L.mixedRow : '',
        // Name the destination, and only offer it where there is one.
        //
        // "Open filing →" was printed on all 11,480 rows against whatever
        // `source` held. For 4,047 of them that is a Mubasher stock page — a
        // third-party summary, not the signed document — under a table headed
        // "as filed"; for the 7,433 exchange-sourced rows it is egx.com.eg's
        // FRONT PAGE, not the filing. Where the row carries an EGX filing id
        // the deep link exists and is used.
        ...(() => {
          const src = filingSource(f.source);
          const id = String(f.filing_id || '');
          const deep = /^egx-(\d+)$/.exec(id);
          if (deep) {
            return { openHref: `https://www.egx.com.eg/en/NewsDetails.aspx?NewsID=${deep[1]}`,
                     openLabel: L.openOnExchange, hasOpen: true };
          }
          if (/mubasher/i.test(src)) return { openHref: src, openLabel: L.openOnMubasher, hasOpen: true };
          // A bare host with no path is the exchange's front page, which is
          // not the filing and is where 7,417 of these rows pointed. No
          // destination is better than the wrong one.
          const deepEnough = /^https?:\/\/[^/]+\/.+/.test(src);
          if (deepEnough && /egx\.com\.eg/i.test(src)) {
            return { openHref: src, openLabel: L.openOnExchange, hasOpen: true };
          }
          return { openHref: '', openLabel: '', hasOpen: false };
        })(),
        omitted: (total - present) > 0 ? ((ar?'':'') + (total-present) + (ar?' حقلاً لم يذكره الإفصاح':' fields not stated in this filing')) : (ar?'كل الحقول مذكورة':'All fields stated')
      };
    });

    const debtDesign = {
      period:'H1 2026', asOf:'2026-06-30', frame:'operating', basis:'balance_sheet', filingId:'demo-000293', source:'',
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
      filingId: d0.filing_id, source: filingSource(d0.source),
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
      // 49 of the 120 companies with a borrowings block have no `change` at
      // all, and the panel rendered its heading as "Movement since —", a 27px
      // "—", a sentence "—" and an empty basis line. Four dashes in a box is
      // not a degraded reading; it is a box that should not be there.
      hasChange: Boolean(d0.change),
      since: this.longDate((d0.change || {}).since) || '—',
      delta: (d0.change || {}).delta === null || (d0.change || {}).delta === undefined
        ? '—' : this.signed(d0.change.delta, 1),
      deltaColor: 'var(--ink)',
      // These three lines are the §8 boundary: they describe what the filing
      // states and what moved, never what to do about it. They are written by
      // build_debt_reads.py against the directions alone, and are carried here
      // verbatim rather than re-phrased.
      // The heading already says the date; this said it again and then
      // stopped — "Movement since 2025-12-31 / +21,496.0  Against 2025-12-31:
      // 62,509.2" — where the demo has a sentence. Say what the borrowings
      // were, and let the heading date it.
      directionLine: (() => {
        const way = (d0.change || {}).direction;
        const key = way === 'up' ? 'debtHigherThan'
          : way === 'down' ? 'debtLowerThan'
          : way === 'flat' ? 'debtLevelWith' : null;
        return key ? L[key].replace('{was}', this.num((d0.change || {}).borrowings, 1)) : '';
      })(),
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

    const ratios = this.ratioCards(D.review, L, ar, sectorName);
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
      { kind: ar?'انقطاع نمط':'Streak break', title: ar?'أول جلسة هبوط بعد خمس جلسات صاعدة':'First falling session after five rising ones', because: ar?'market.json يذكر −٣٫١٢٪ يوم ٢٦ أغسطس، بعد خمس جلسات مغلقة على ارتفاع.':'market.json states −3.12% on 26 August, following five consecutive higher closes.', stamp:'signals/demo · 2026-08-26', href:'', hasHref:false },
      { kind: ar?'حركة القروض':'Borrowings moved', title: ar?'القروض قصيرة الأجل أعلى بـ ٢٩٧٫١ مليون منها في ٣١ ديسمبر':'Short-term borrowings 297.1 higher than at 31 December', because: ar?'١٧٩٥٫٥ مقابل ١٤٩٨٫٣ في العمود المقارن للميزانية نفسها.':'1,795.5 against 1,498.3 in the statement’s own prior column.', stamp:'signals/demo · demo-000293', href:'', hasHref:false },
      { kind: ar?'نتائج مرتقبة':'Results due', title: ar?'إفصاح تسعة أشهر متوقع في نوفمبر بحسب سجل الشركة':'A 9M filing is expected in November on the company’s own history', because: ar?'أُودعت الإفصاحات المكافئة في ١١ نوفمبر ٢٠٢٥ و١٢ نوفمبر ٢٠٢٤. تقدير، وليس إعلاناً.':'Equivalent filings landed on 11 November 2025 and 12 November 2024. An estimate, not an announcement.', stamp:'calendar.json · estimate' }
    ];

    const filings = D.filings ? say(D.filings, ['title']) : !D.demo ? [] : [
      { date:'2026-08-14', title: ar?'القوائم المالية للفترة المنتهية ٣٠ يونيو ٢٠٢٦':'Financial statements for the period ended 30 June 2026', id:'demo-293566', href:'' },
      { date:'2026-05-12', title: ar?'القوائم المالية للربع الأول ٢٠٢٦':'Financial statements for Q1 2026', id:'demo-288104', href:'' },
      { date:'2026-03-28', title: ar?'القوائم المالية السنوية ٢٠٢٥ وتقرير مراقب الحسابات':'Annual financial statements 2025 with auditor’s report', id:'demo-271340', href:'' },
      { date:'2026-03-02', title: ar?'إفصاح عن دعوة الجمعية العامة العادية':'Notice convening the ordinary general assembly', id:'demo-269911', href:'' },
      { date:'2025-11-11', title: ar?'القوائم المالية لتسعة أشهر ٢٠٢٥':'Financial statements for 9M 2025', id:'demo-264880', href:'' }
    ];

    // sectors
    // The same sector vocabulary the rest of the demo runs on. These names used
    // to be a second, invented taxonomy — Banks, Chemicals, Real Estate — so a
    // visitor moving from Market to Sectors was shown two different sets of
    // sectors for one exchange, neither of them the one the documents file
    // under.
    const secDef = [
      ['Finance','التمويل والخدمات المالية',12,8,3,1,4.9,'COMI'],['Process Industries','الصناعات التحويلية',31,19,10,2,6.2,'TMGH'],['Non-Energy Minerals','معادن ومواد بناء',18,7,9,2,7.4,'ABUK'],
      ['Producer Manufacturing','صناعات إنتاجية',26,16,8,2,8.1,'SWDY'],['Industrial Services','خدمات صناعية',14,5,7,2,9.0,'ESRS'],['Consumer Non-Durables','سلع استهلاكية غير معمّرة',22,11,9,2,6.8,'EAST'],
      ['Communications','الاتصالات',4,2,1,1,4.2,'ETEL'],['Utilities','المرافق',6,2,4,0,11.2,'KORA'],['Energy Minerals','موارد الطاقة',9,6,2,1,9.1,'AMOC'],
      ['Distribution Services','خدمات التوزيع',17,6,9,2,5.6,'HRHO'],['Health Technology','أدوية وتكنولوجيا طبية',11,7,3,1,12.4,'IDHC'],['Consumer Durables','سلع استهلاكية معمّرة',13,3,8,2,7.7,'ELSH'],
      ['Transportation','النقل',8,4,3,1,8.6,'CCAP'],['Consumer Services','خدمات استهلاكية',12,5,6,1,10.3,'ORHD'],['Technology Services','خدمات تكنولوجية',5,2,2,1,9.4,'MEDI']
    ];
    const sectorCards = D.sectorCards ? say(D.sectorCards, ['name','read','full'])
      .map((c) => Object.assign({}, c, { medians: say(c.medians || [], ['key']),
        open: () => this.setState({ sector1: c.slug }) }))
      : !D.demo ? [] : secDef.map(([en,arn,count,up,down,flat,pe,standout]) => {
      const bars = [];
      for (let i = 0; i < 10; i++) {
        const isUp = i < Math.round(up/count*10);
        const isFlat = i >= Math.round((up+down)/count*10);
        bars.push({ color: isFlat ? 'var(--rule)' : isUp ? 'var(--up)' : 'var(--down)', op: isFlat ? 1 : (0.45 + 0.055*i) });
      }
      return { name: ar ? arn : en, count: count + (ar?' شركة':' listed'), bars, upCount:up, downCount:down, flatCount:flat,
        unknownCount: 0, hasUnknown: false,
        read: ar ? ('صعد ' + up + ' من ' + count + ' سهماً في القطاع في جلسة ٢٦ أغسطس. وسيط مضاعف الربحية ' + pe.toFixed(1) + '.')
                 : (up + ' of ' + count + ' listed names rose in the 26 August session. Median P/E ' + pe.toFixed(1) + '.'),
        // The card prints the yield beside the median P/E without gating it, so
        // a demo card missing the field read "Median P/E 4.9 · Yield" with the
        // sentence stopping mid-air.
        medianPe: pe.toFixed(1), yield: (2.5 + (pe % 3)).toFixed(1) + '%',
        full: '', fullAr: '', medians: [], metrics: [], standouts: [], members: [],
        generated: '', slug: en.toLowerCase().replace(/[^a-z]+/g, '-'),
        // The demo's cards open too, or the screen a signed-out reader is
        // shown is a screen with a control that does nothing. What opens is
        // thinner than the real one — the demo has no per-sector document —
        // and every section that has nothing simply is not drawn.
        open: function () { this.setState({ sector1: en.toLowerCase().replace(/[^a-z]+/g, '-') }); }.bind(this),
        standout: (ar?'الأكبر تحركاً ':'Largest move ') + standout };
    });

    // calendar
    // The design named four months and clicking one changed a state field
    // nothing read. The archive says which months it holds and how many
    // filings are in each.
    // The four-month fallback is the design's, and it was reached by a
    // signed-in reader whenever filedMonths failed to load — four months the
    // archive may not hold, each of which then draws an empty grid, with
    // nothing saying the list was invented. It is the last design literal that
    // could reach live data; like every other it is now demo-only.
    const monthDef = (D.filedMonths || []).length
      ? D.filedMonths.map((m) => [m.id, this.monthLabel(m.id), m.count])
      : !D.demo ? []
      : [['2026-06','Jun 2026'],['2026-07','Jul 2026'],['2026-08','Aug 2026'],['2026-09','Sep 2026']];
    // The month on show: the reader's pick when it is one the archive holds,
    // and otherwise the newest month published (index.json is newest-first).
    // Reconciling here rather than in state means a month that rolls out of
    // the window silently corrects instead of drawing an empty grid.
    const monthIds = monthDef.map(([id]) => id);
    const openMonth = monthIds.includes(st.month) ? st.month
      : (this.openMonth() || monthIds[0] || '');
    const months = monthDef.map(([id,label,count]) => ({ label, count: count || '', go: () => this.setState({ month:id }),
      color: openMonth === id ? 'var(--ink)' : 'var(--t2)', bg: openMonth === id ? 'var(--surface)' : 'transparent', sh: openMonth === id ? 'var(--shPill)' : 'none' }));
    // A month as its days, the way the app draws it. A list of sixty rows says
    // nothing about the shape of a month; a grid shows at a glance that the
    // exchange files in bursts around results season and barely at all in
    // between. Every day of the month is drawn, including the empty ones —
    // a quiet Friday is a fact about the exchange, not a gap in the data.
    const inMonth = (D.filedArchive && D.filedArchiveMonth === openMonth) ? D.filedArchive : [];
    const perDay = new Map();
    for (const e of inMonth) perDay.set(e.date, (perDay.get(e.date) || 0) + 1);
    const monthDays = [];
    if (openMonth) {
      const [yy, mm] = openMonth.split('-').map(Number);
      const last = new Date(Date.UTC(yy, mm, 0)).getUTCDate();
      const busiest = Math.max(1, ...perDay.values());
      for (let day = 1; day <= last; day++) {
        const iso = `${openMonth}-${String(day).padStart(2, '0')}`;
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

    // What the reader is filtering the month down to: a day picked off the
    // grid, or a company typed into the box. The screen was named "Calendar"
    // and could only answer "what was filed on this day" — but a month holds
    // 1,467 filings and the other question a reader arrives with is "what has
    // THIS company filed", which the grid cannot express at all.
    // The same company test as the market table, applied to the company each
    // filing belongs to.
    const byTicker = new Map((D.companies || []).map((c) => [c.ticker, c]));
    const filedPassesRatio = (e) => this.passesClauses(byTicker.get(e && e.ticker), st.frqs, ar);
    const filedQuery = String(st.filedQ || '').trim();
    const filedFold = this.fold(filedQuery);
    /* What a search looks through.
     *
     * It used to be the open month and only the open month, so typing a
     * company's name found its filings if they happened to land in the month
     * on screen and nothing otherwise — a search that answers "no filings" for
     * a company with eleven of them in the other months. `filedAll` is every
     * month, fetched once and only when somebody actually searches: twelve
     * requests and seven megabytes is the right price for a search across a
     * year and much too high to pay on the way in.
     *
     * A month is a FILTER on that, applied when the reader picks one rather
     * than by default. The default is the newest filings on the exchange,
     * which is what the newest month already is.
     */
    const everything = filedQuery && Array.isArray(D.filedAll) && D.filedAll.length
      ? D.filedAll : null;
    const monthRows = everything ? everything
      : (D.filedArchive && D.filedArchiveMonth === openMonth) ? D.filedArchive : null;
    const matches = (e) => !filedFold
      || this.fold(e.ticker || '').includes(filedFold)
      || this.fold(e.what || '').includes(filedFold)
      || this.fold(e.whatAr || '').includes(filedFold)
      || (() => {
        // A reader typing a company's NAME should reach its filings; the
        // archive row carries only the ticker, and the directory has the rest.
        const co = D.companies.find((c) => c.ticker === e.ticker);
        return co ? (this.fold(co.name.en).includes(filedFold)
                     || this.fold(co.name.ar).includes(filedFold)) : false;
      })();

    const filtered = monthRows
      ? monthRows.filter((e) => (!st.day || e.date === st.day)
          // A chosen month narrows a search; an unchosen one must not. `month`
          // is empty until a pill is clicked, and `openMonth` falls back to
          // the newest for the list — so the filter reads the state, never the
          // fallback.
          && (!everything || !st.month || String(e.date || '').startsWith(st.month))
          && matches(e) && filedPassesRatio(e))
      : null;

    const archive = filtered
      // Newest first, THEN cut. Cutting the document's own order took the 60
      // OLDEST of the month: on 30 August the panel was 60 rows every one of
      // them dated 2 August, and nothing filed between the 3rd and the 26th
      // was reachable from it at all.
      ? say(filtered.slice().sort((a, b) =>
          String(b.date || '').localeCompare(String(a.date || ''))), ['what'])
        .slice(0, 60).map((e) => Object.assign({}, e, {
          // The exchange's own document. Every row in the archive carries one
          // — 1,467 of 1,467 in August — and the panel bound none of them, so
          // a row with a hover state and a pointer opened nothing at all.
          day: this.dayLabel(e.date), kind: e.section, hasKind: Boolean(e.section), basis: '',
          hasHref: Boolean(e.href), noHref: !e.href,
          // The ticker goes to the company; the row goes to the filing. Two
          // different questions about the same line, and a reader who wants
          // the company should not have to read the filing to get there.
          go: (ev) => { if (ev && ev.stopPropagation) ev.stopPropagation();
            this.setState({ screen: 'company', ticker: e.ticker }); },
        }))
      : null;
    const filedEvents = archive ? archive : D.filedEvents ? say(D.filedEvents.filter(filedPassesRatio), ['what','kind']).map((e) => Object.assign({}, e, {
      hasKind: Boolean(e.kind),
      // These are FILED events, and calendar() attached the exchange's own
      // link to each. This branch stripped it — under a comment written for
      // the expected-events branch, where there is no document yet — so until
      // the month archive loaded (or forever, if that fetch failed) no filed
      // row could be opened. The ticker still reaches the company.
      href: e.href || '', hasHref: Boolean(e.href), noHref: !e.href,
      go: (ev) => { if (ev && ev.stopPropagation) ev.stopPropagation();
        if (e.ticker) this.setState({ screen: 'company', ticker: e.ticker }); },
      basis: e.estimated && e.windowFrom ? L.calWindow.replace('{from}', e.windowFrom).replace('{to}', e.windowTo).replace('{n}', e.observations) : '',
    })) : !D.demo ? [] : [
      { day:'26 Aug', ticker:'COMI', what: ar?'إفصاح عن توزيعات نقدية مرحلية':'Interim cash distribution disclosure', kind:'', hasKind:false, basis:'' },
      { day:'14 Aug', ticker:'KORA', what: ar?'قوائم النصف الأول ٢٠٢٦':'H1 2026 financial statements', kind:'', hasKind:false, basis:'' },
      { day:'13 Aug', ticker:'SWDY', what: ar?'قوائم النصف الأول ٢٠٢٦':'H1 2026 financial statements', kind:'', hasKind:false, basis:'' },
      { day:'11 Aug', ticker:'TMGH', what: ar?'قوائم النصف الأول ٢٠٢٦':'H1 2026 financial statements', kind:'', hasKind:false, basis:'' },
      { day:'07 Aug', ticker:'ABUK', what: ar?'قوائم النصف الأول ٢٠٢٦':'H1 2026 financial statements', kind:'', hasKind:false, basis:'' },
      { day:'04 Aug', ticker:'ETEL', what: ar?'إفصاح عن تعاقد':'Contract disclosure', kind:'', hasKind:false, basis:'' }
    ].map((e) => Object.assign({}, e, {
      // The same fields the live rows carry. Written once here rather than
      // five times above, because a demo row that falls behind the markup is
      // how this list breaks: nothing fails, the binding renders empty.
      href: '', hasHref: false, noHref: true,
      go: (ev) => { if (ev && ev.stopPropagation) ev.stopPropagation();
        this.setState({ screen: 'company', ticker: e.ticker }); },
    }));
    const expectedEvents = D.expectedEvents ? say(D.expectedEvents, ['what','kind']).map((e) => Object.assign({}, e, {
      hasKind: Boolean(e.kind),
      basis: e.estimated && e.windowFrom ? L.calWindow.replace('{from}', e.windowFrom).replace('{to}', e.windowTo).replace('{n}', e.observations) : '',
    })) : !D.demo ? [] : [
      { day:'31 Aug', ticker:'ESRS', what: ar?'قوائم النصف الأول ٢٠٢٦ — الموعد النظامي':'H1 2026 statements — regulatory deadline', kind:'', hasKind:false, basis:'' },
      { day:'30 Aug', ticker:'PHDC', what: ar?'قوائم النصف الأول ٢٠٢٦':'H1 2026 financial statements', kind:'', hasKind:false, basis:'' },
      { day:'30 Aug', ticker:'SKPC', what: ar?'قوائم النصف الأول ٢٠٢٦':'H1 2026 financial statements', kind:'', hasKind:false, basis:'' },
      { day:'28 Aug', ticker:'MFPC', what: ar?'قوائم النصف الأول ٢٠٢٦':'H1 2026 financial statements', kind:'', hasKind:false, basis:'' },
      { day:'28 Aug', ticker:'CIEB', what: ar?'قوائم النصف الأول ٢٠٢٦':'H1 2026 financial statements', kind:'', hasKind:false, basis:'' },
      { day:'27 Aug', ticker:'ORAS', what: ar?'قوائم النصف الأول ٢٠٢٦':'H1 2026 financial statements', kind:'', hasKind:false, basis:'' }
    ];

    // exchange
    const rates = D.rates ? say(D.rates, ['label','plain'])
      : (D.indices || []).map((ix) => ({ label: ix.label, labelAr: ix.labelAr,
          value: ix.value, pct: ix.pct, color: ix.color, plain: '', plainAr: '',
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
        // The four world indices carry the unit word 'points' from data.js as
        // an English literal; the index cards a few lines up already say
        // نقطة in Arabic. Same word, same rule.
        unit: m.unit === 'points' ? (ar ? 'نقطة' : 'points') : m.unit,
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

    /* ── the heat map ────────────────────────────────────────────────────
     *
     * Two levels. Sectors first, because a map of 282 companies with no
     * grouping answers "what moved" and never "what moved TOGETHER", and the
     * second question is the one a map is better at than a table.
     *
     * Size is market value as the pipeline publishes it — whole pounds, and
     * NOT recomputed from the live price. Tiles that resized every five
     * minutes would make the map jump under the reader for a reason nothing
     * on screen explains, and the day's move is already the colour.
     */
    const HEAT_TABS = [['ALL', L.heatAll]].concat(
      (D.indexMembers || []).map((i) => [i.id, ar ? i.labelAr : i.label]));
    const heatOn = HEAT_TABS.some(([id]) => id === st.heat) ? st.heat : 'ALL';
    const heatDoc = (D.indexMembers || []).find((i) => i.id === heatOn) || null;
    const heatTabs = HEAT_TABS.map(([id, label]) => {
      const on = id === heatOn;
      const doc = (D.indexMembers || []).find((i) => i.id === id);
      return { label, count: doc ? String(doc.count) : String(D.companies.length),
        go: () => this.setState({ heat: id, heatSector: '' }),
        color: on ? '#1B1917' : 'var(--t2)', bg: on ? 'var(--accent)' : 'transparent',
        border: on ? 'transparent' : 'var(--rule)', sh: on ? 'var(--shPill)' : 'none' };
    });

    const heatPool = heatDoc
      ? heatDoc.tickers.map((t) => D.companies.find((c) => c.ticker === t)).filter(Boolean)
      : D.companies;
    // A company with no market value cannot be given a size. Saying so beats
    // drawing it at some arbitrary minimum, which would put a company the
    // pipeline knows nothing about beside one it does, at the same weight.
    const heatSized = heatPool.filter((c) => typeof c.cap === 'number' && c.cap > 0);
    // Named, because a constituent of a real index that this directory has
    // never heard of is a gap worth a reader knowing about rather than a row
    // quietly missing from a picture.
    const heatAbsent = heatDoc
      ? heatDoc.tickers.filter((t) => !D.companies.some((c) => c.ticker === t))
      : [];

    const bySector = new Map();
    for (const c of heatSized) {
      const key = c.sector || '';
      if (!bySector.has(key)) bySector.set(key, []);
      bySector.get(key).push(c);
    }
    /* Zoom is one sector filling the box.
     *
     * On the whole exchange the smallest tiles are a hairline, because the
     * largest company is worth twenty-five thousand times the smallest and
     * the map is to scale. Inside one sector the spread is a fraction of
     * that, so the same companies come back at a size a reader can read and a
     * thumb can hit — without the map ever having lied about a size to get
     * there. It is the box that changed, not the arithmetic.
     */
    const heatZoom = bySector.has(st.heatSector) ? st.heatSector : '';
    /* Zoomed, a tile's area is the SQUARE ROOT of market value.
     *
     * Filling the box with one sector was not enough. Strict proportionality
     * over Finance's own spread still left EOSB at five pixels by three and
     * twenty-seven of eighty companies too small to carry their own ticker —
     * a view of a sector that a reader cannot read the sector in.
     *
     * The root compresses that: the same eighty come back with two unlabelled
     * and nothing under eight pixels, and the largest is still five times the
     * linear size of the smallest, so which companies are the big ones
     * survives intact. What does not survive is proportion, and that is a real
     * cost — a tile is no longer a share of the sector. It is stated on the
     * screen rather than absorbed quietly, and it applies ONLY here: on the
     * whole map, where the claim is about the market's own weights, area is
     * market value exactly.
     */
    const heatRoot = Boolean(heatZoom);
    const heatSize = (cap) => (heatRoot ? Math.sqrt(cap) : cap);
    const heatDrawSectors = heatZoom
      ? [[heatZoom, bySector.get(heatZoom)]]
      : [...bySector.entries()];
    const heatBlocks = [];
    const heatTiles = [];
    const GAP = 0.32;          // per cent of the box, between sector blocks
    // The sector's name, where there is room for it. Per cent of the box, so
    // it is 19px on a desktop and 13px on a phone — the label has to fit the
    // smaller of those, and design.css hides it outright on a block too small
    // to hold it at all.
    const STRIP = 3.0;
    const sectorRects = squarify(
      heatDrawSectors.map(([key, list]) => ({
        key, list, value: list.reduce((sum, c) => sum + c.cap, 0) })),
      0, 0, 100, 100);
    for (const block of sectorRects) {
      // The gap has to be a fraction of the block, never a constant. Two of
      // the twenty sectors come out 0.585% wide — one company each — and a
      // fixed 0.32% on both sides is more than the whole block: the width went
      // negative, clamped to zero, and those companies vanished from a map
      // that had just told the reader it drew 239 of them. The neighbouring
      // slivers came from the same arithmetic.
      const gap = Math.min(GAP, block.w / 5, block.h / 5);
      const x = block.x + gap, y = block.y + gap;
      const w = Math.max(0, block.w - gap * 2), h = Math.max(0, block.h - gap * 2);
      const strip = h > STRIP * 3 && w > 7 ? STRIP : 0;
      heatBlocks.push({ label: sectorName(block.key), showLabel: strip > 0,
        count: String(block.list.length),
        left: pc(x), top: pc(y), width: pc(w), height: pc(h),
        // Clicking a sector fills the box with it; clicking it again, or the
        // crumb above the map, goes back out.
        // On the NAME only. It used to be on the block as well, and a click
        // on the name bubbled into the block and toggled the zoom straight
        // back off — one control firing twice looks exactly like a control
        // that does not work.
        zoom: () => this.setState((prev) => ({
          heatSector: prev.heatSector === block.key ? '' : block.key })) });
      for (const t of squarify(block.list.map((c) => ({ c, value: heatSize(c.cap) })),
                               x, y + strip, w, Math.max(0, h - strip))) {
        const priced = typeof t.c.pct === 'number';
        heatTiles.push({
          ticker: t.c.ticker, name: this.nm(t.c.name),
          pct: priced ? this.pct(t.c.pct) : '\u2014',
          bg: heatColour(t.c.pct), fg: 'var(--hmInk)',
          // A coarse gate only: it keeps four hundred label nodes out of the
          // DOM for tiles that are a hairline at any width. Whether a label
          // actually FITS is a question in pixels, and this side of the layout
          // has only per cent — the same 2.9% is 32px on a desktop and 10px
          // on a phone, which is how the map came out legible on one and a
          // smear on the other. design.css decides, per tile, in pixels.
          showTicker: t.w >= 1 && t.h >= 0.9,
          showPct: t.w >= 1.6 && t.h >= 1.6,
          left: pc(t.x), top: pc(t.y), width: pc(t.w), height: pc(t.h),
          title: `${t.c.ticker} \u00b7 ${this.nm(t.c.name)} \u00b7 ${priced ? this.pct(t.c.pct) : '\u2014'}`,
          /* A tile smaller than a fingertip opens its SECTOR, not its company.
           *
           * On the whole map the smallest names are a few pixels across, and
           * sending that straight to a company screen lands a reader on a
           * company they could not read and did not choose — with no way to
           * tell whether they hit the one they aimed at. Zooming first makes
           * it legible; the second click, on a tile that now says what it is,
           * opens the company.
           *
           * Measured at click time from the element's own box rather than
           * guessed from its percentage, because whether a tile is small is a
           * question in pixels and this side of the layout has only per cent
           * — the same 2% is 22px on a desktop and 7px on a phone. 44px is
           * the smallest thing a finger can be trusted to hit.
           */
          go: (ev) => {
            const box = ev && ev.currentTarget && ev.currentTarget.getBoundingClientRect
              ? ev.currentTarget.getBoundingClientRect() : null;
            const tiny = box ? (box.width < 44 || box.height < 28) : false;
            if (tiny && !heatZoom) this.setState({ heatSector: block.key });
            else this.setState({ screen: 'company', ticker: t.c.ticker });
          },
        });
      }
    }
    const heatUnsized = heatZoom
      ? heatPool.filter((c) => (c.sector || '') === heatZoom
          && !(typeof c.cap === 'number' && c.cap > 0))
        .map((c) => ({ ticker: c.ticker, name: this.nm(c.name),
          go: () => this.setState({ screen: 'company', ticker: c.ticker }) }))
      : [];
    const heatUnpriced = heatSized.filter((c) => typeof c.pct !== 'number').length;
    const heatMissingCount = heatPool.length - heatSized.length;
    // The map is to scale and the exchange is not evenly sized: the largest
    // company on it is worth twenty-five thousand times the smallest, so the
    // smallest come out a hairline. The alternative is a floor under the tile
    // size, which would draw a company worth a rounding error at the same
    // weight as one fifty times bigger — a prettier map that says something
    // false. The slivers stay and the screen says why.
    const heatSlivers = heatTiles.filter((t) => Math.min(
      parseFloat(t.width), parseFloat(t.height)) < 0.7).length;
    const heatCaps = heatSized.map((c) => c.cap);
    const heatSpread = heatCaps.length
      ? Math.max(...heatCaps) / Math.min(...heatCaps) : 0;

    /* One sector, opened.
     *
     * The card carried a four-sentence read, eight medians and eight movement
     * rows and showed a teaser, one median and a bar; the standouts and every
     * member were fetched and dropped on the floor. The app has had a screen
     * for this since it shipped. Same document, same sections, in the order
     * the app puts them: the read, then how the companies are moving, then
     * what is typical, then who is moving most, then all of them.
     */
    const sector1 = sectorCards.find((c) => c.slug === st.sector1) || null;
    const peerWord = (m) => (!m.peer || !m.peerKey ? ''
      : (m.peer === 'above' ? L.secAbove : L.secBelow)
        .replace('{key}', (ar ? m.peerKeyAr : m.peerKey) || ''));
    const memberRow = (m) => ({
      ticker: m.ticker, name: ar ? m.nameAr : m.name,
      // A count off the filings, never a rank. "Six of seven measures
      // improving" is arithmetic; "the best in the sector" would be a verdict
      // this publisher has no licence to reach (§8).
      measures: m.hasPattern
        ? L.secImproving.replace('{n}', String(m.improving)).replace('{of}', String(m.readable))
        : L.secNoHistory,
      dim: !m.hasPattern,
      peer: peerWord(m),
      go: () => this.setState({ screen: 'company', ticker: m.ticker }),
    });
    const openSector = !sector1 ? null : {
      name: sector1.name,
      as: L.secAsOf.replace('{n}', String(sector1.count))
        .replace('{at}', this.shortDate(sector1.generated) || sector1.generated || '\u2014'),
      read: (ar ? sector1.fullAr : sector1.full) || sector1.read || L.nothingYet,
      medians: sector1.medians || [],
      hasMedians: (sector1.medians || []).length > 0,
      // Every metric the sector can be read on, with what each count means
      // spelled out — "3 · 1 · 4 · 2" over four unlabelled colours is a row
      // nobody can read.
      metrics: (sector1.metrics || []).map((m) => Object.assign({}, m, {
        parts: [
          { n: String(m.rising), word: L.secRising, color: 'var(--up)' },
          { n: String(m.falling), word: L.secFalling, color: 'var(--down)' },
          { n: String(m.flat || 0), word: L.secFlat, color: 'var(--t2)' },
          { n: String(m.unknown || 0), word: L.secUnknown, color: 'var(--faint)' },
        ].filter((p) => p.n !== '0'),
      })),
      hasMetrics: (sector1.metrics || []).length > 0,
      standouts: (sector1.standouts || []).map(memberRow),
      hasStandouts: (sector1.standouts || []).length > 0,
      members: (sector1.members || []).map(memberRow),
      hasMembers: (sector1.members || []).length > 0,
      back: () => this.setState({ sector1: '' }),
    };

    // Built here rather than at the top because its counters are the lists
    // themselves — the design had 18 stories, 282 listings and KORA open,
    // whatever the documents actually held.
    const navDef = [
      ['home', ar?'الرئيسية':'Home', ''],
      // Named for what is on it. It was "Today", which described when
      // rather than what — and since the crossings moved to a screen of
      // their own, what is on it is the news and nothing else.
      ['today', ar?'الأخبار':'News', allFeed.length ? String(allFeed.length) : ''],
      ['market', ar?'السوق':'Market', String(D.companies.length)],
      // Fourth, and its own screen: who bought and who sold is a different
      // question from what moved, and the exchange answers it separately.
      ['investors', ar?'المستثمرون':'Investors', ''],
      // Beside Market, because it answers the same question — what did the
      // exchange do today — for a reader who would rather see it than read it.
      ['heat', ar?'الخريطة':'Heat map', String(heatTiles.length)],
      // Its own screen rather than a block on Home. A list a reader builds is
      // not a summary of the day, and it was sitting under the day's summary
      // being scrolled past — a place to go back to has to be somewhere you
      // can go.
      ['watchlist', ar?'المتابَعة':'Watchlist', followed.length ? String(followed.length) : ''],
      ['company', ar?'شركة':'Company', st.ticker || ''],
      ['sectors', ar?'القطاعات':'Sectors', sectorCards.length ? String(sectorCards.length) : ''],
      // "Calendar" described the grid; what a reader comes here for is the
      // filings, so it is named for them.
      ['calendar', ar?'الإفصاحات':'Disclosures', ''],
      // The crossings were a block on Today under the news. They are a
      // different claim — one company in more than one feed at once — and
      // reading them mixed into a headline list buried them.
      // Named for what it does rather than for the geometry of it. The app
      // has called this block "what ties these together" all along.
      ['crossings', ar?'ربط النقاط':'Connecting the dots', crossings.length ? String(crossings.length) : ''],
      ['exchange', ar?'البورصة':'Exchange', ''],
      ['tools', ar?'حاسبة المستثمر':'Tools', ''],
      // Only where there is something to open. `studies` is the demo's three
      // mock-up papers and nothing else — no research document is published —
      // so every signed-in reader who clicked this got a 50px heading and the
      // line "Nothing published for this yet.", every time.
      ...(studies.length ? [['research', ar?'الأبحاث':'Research', '']] : [])
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

    // Organize by the reader's task, keeping every existing screen reachable.
    const groups = [
      { id: 'home', label: ar ? 'نظرة عامة' : 'Overview', screens: ['home'] },
      { id: 'market', label: ar ? 'استكشف' : 'Explore', screens: ['market', 'heat', 'sectors', 'company', 'investors', 'exchange'] },
      { id: 'today', label: ar ? 'الأخبار' : 'News', screens: ['today', 'calendar', 'crossings', 'research'] },
      { id: 'watchlist', label: ar ? 'متابعتي' : 'Watchlist', screens: ['watchlist'] },
      { id: 'tools', label: ar ? 'الأدوات' : 'Tools', screens: ['tools'] },
    ];
    const activeGroup = groups.find(g => g.screens.includes(st.screen)) || groups[0];
    const primaryNav = groups.map(g => ({ ...g, icon: ICON[g.id],
      current: activeGroup.id === g.id ? 'page' : null,
      go: this.go(g.id) }));
    const secondaryNav = navDef.filter(([id]) => activeGroup.screens.includes(id)
      && (id !== 'company' || st.ticker)).map(([id, label]) => ({
        label, current: st.screen === id ? 'page' : null, go: this.go(id),
      }));

    const marketExplorer = explorer(this, D.companies, ar);
    const out = {
      L, theme: st.theme, dir: ar ? 'rtl' : 'ltr',
      primaryNav, secondaryNav: secondaryNav.length > 1 ? secondaryNav : [],
      navigationLabel: ar ? 'التنقل الرئيسي' : 'Main navigation',
      sectionNavigationLabel: ar ? 'أقسام الصفحة' : 'Section navigation',
      findCompany: ar ? 'ابحث عن شركة' : 'Find a company',
      journalLabel: ar ? 'البورصة المصرية، من المصدر' : 'The Egyptian Exchange, from the source',
      overviewTitle: ar ? 'السوق في لمحة' : 'Market at a glance',
      welcomeLabel: ar ? 'مساحتك لفهم البورصة' : 'Your space to understand the market',
      mosaicTitle: ar ? 'السوق بالألوان' : 'The market in colour',
      mosaicNote: ar ? 'الأكبر قيمة سوقية · اللون يعكس تغير الجلسة' : 'Largest by market value · colour shows session change',
      noMosaic: !D.companies.some(c => Number.isFinite(c.cap) && c.cap > 0),
      mosaicTiles: D.companies.filter(c => Number.isFinite(c.cap) && c.cap > 0)
        .sort((a, b) => b.cap - a.cap).slice(0, 12).map(c => ({...mkRow(c),
          tileBg: Number.isFinite(c.pct) && c.pct !== 0 ? (c.pct > 0 ? 'var(--mosaic-up)' : 'var(--mosaic-down)') : 'var(--sunk)',
          tileInk: Number.isFinite(c.pct) && c.pct !== 0 ? (c.pct > 0 ? 'var(--mosaic-up-ink)' : 'var(--mosaic-down-ink)') : 'var(--t2)',
        })),
      quickActions: [
        {label: ar ? 'استكشف الشركات' : 'Explore companies', note: ar ? 'أرقام، رسوم، وإفصاحات' : 'Figures, charts & filings', icon: ICON.market, go: this.go('market')},
        {label: ar ? 'قائمة متابعتك' : 'Your watchlist', note: ar ? 'شركاتك في مكان واحد' : 'Your companies, together', icon: ICON.watchlist, go: this.go('watchlist')},
      ],
      openHeat: this.go('heat'),
      insightHeading: ar ? 'وراء حركة السوق' : 'Behind the market moves',
      dataShellClass: st.dataLoading ? 'app-data-pending' : '',
      dataLoading: Boolean(st.dataLoading), dataError: Boolean(st.dataError),
      loadingLabel: ar ? 'نحمّل بيانات السوق لحسابك…' : 'Loading market data for your account…',
      dataErrorLabel: ar ? 'تعذّر تحميل بيانات السوق. أعد المحاولة؛ لم نستبدلها بأرقام تجريبية.' : 'Market data could not load. Please retry; it has not been replaced with demo figures.',
      retryLabel: ar ? 'إعادة المحاولة' : 'Try again',
      retryData: () => this.onRetryData && this.onRetryData(),
      extrasLoading: Boolean(st.extrasLoading), extrasError: Boolean(st.extrasError),
      extrasLabel: ar ? 'نستكمل المؤشرات والأخبار…' : 'Adding indices and insights…',
      extrasErrorLabel: ar ? 'بعض الأقسام لم تُحمّل. البيانات الظاهرة ما زالت متاحة.' : 'Some sections could not load. The available data is still here.',
      companyLoading: Boolean(st.companyLoading), companyError: Boolean(st.companyError),
      companyLoadingLabel: ar ? 'نحمّل بيانات هذه الشركة…' : 'Loading this company’s documents…',
      companyErrorLabel: ar ? 'تعذّر تحميل بيانات الشركة. حاول مرة أخرى.' : 'This company’s documents could not load. Please try again.',
      retryCompany: () => this.onRetryCompany && this.onRetryCompany(),
      archiveLoading: Boolean(st.archiveLoading), archiveError: Boolean(st.archiveError),
      archiveLoadingLabel: ar ? 'نبحث في جميع أشهر الأرشيف…' : 'Searching all archive months…',
      archiveErrorLabel: ar ? 'نتائج جزئية: بعض أشهر الأرشيف لم تُحمّل بعد.' : 'Partial results: some archive months could not load.',
      retryArchive: () => this.onRetryArchive && this.onRetryArchive(),
      watchStatus: st.watchStatus || '', watchSaveError: st.watchStatus === 'error',
      watchStatusLabel: ({ saving: ar ? 'جارٍ حفظ المتابعة…' : 'Saving watchlist…',
        saved: ar ? 'تم حفظ المتابعة' : 'Watchlist saved',
        error: ar ? 'التغييرات على هذا الجهاز فقط؛ لم تُحفظ في الحساب.' : 'Changes are on this device only; account save failed.' })[st.watchStatus] || '',
      retryWatch: () => this.onRetryWatch && this.onRetryWatch(),
      explorer: marketExplorer,
      comparisonNotesLabel: ar ? 'ملاحظات المقارنة' : 'Comparison notes',
      buyingLabel: ar ? 'شراء' : 'Buying', sellingLabel: ar ? 'بيع' : 'Selling',
      exchangeIntro: ar ? 'المؤشرات والعملات والسلع — الأرقام وسياقها في مكان واحد.' : 'Indices, currencies and commodities—the numbers and their context, together.',
      dotsIntro: ar ? 'تتبّع الأخبار والإفصاحات وحركة التداول حول الشركة، ثم افتح المستندات الأصلية.' : 'Follow the news, filings and trading activity around a company, then open the original evidence.',
      dotsSteps: ar ? ['١ · اختر شركة','٢ · اتبع التسلسل الزمني','٣ · اقرأ المصادر'] : ['1 · Choose a company','2 · Follow the timeline','3 · Read the sources'],
      marketVisibleCount: marketExplorer.isExplorer ? marketExplorer.count : rows.length,
      insightBusy: busy.slice(0, 4),
      insightBusyNote: ar ? 'حجم الجلسة ÷ الحجم المعتاد · مقياس للنشاط فقط' : 'Session volume ÷ usual volume · activity measure only',
      insightMissing: ar ? 'لم تصل بيانات هذا القسم بعد. افتحه للاطلاع على التغطية.' : 'No data loaded for this section yet. Open it to check coverage.',
      insightMeasuresNote: ar ? 'أين يقع متوسط السوق؟ وما الذي يتقاطع في البيانات؟' : 'Where does the market sit—and which signals overlap?',
      openConnections: this.go('crossings'),
      revealHomeDetails: () => this.setState({ showHomeDetails: true }),
      snapshotMoves: movers.slice(0, 6),
      snapshotStories: readNow.slice(0, 2),
      goToday: this.go('today'),
      detailLabel: ar ? 'التفاصيل والمصادر' : 'Details & sources',
      browseLabel: ar ? 'عرض الكل' : 'View all',
      snapshotMovesLabel: ar ? 'أكبر التحركات' : 'Largest moves',
      breadthRing: breadth ? `conic-gradient(var(--up) 0 ${breadth.up / breadth.counted * 100}%, var(--down) ${breadth.up / breadth.counted * 100}% ${(breadth.up + breadth.down) / breadth.counted * 100}%, var(--rule) ${(breadth.up + breadth.down) / breadth.counted * 100}% 100%)` : 'none',
      breadthTotal: breadth ? this.num(breadth.counted, 0) : '',
      noBreadth: !breadth,
      skipLabel: ar ? 'انتقل إلى المحتوى' : 'Skip to content',
      companyOverview: !st.companyPanel || st.companyPanel === 'overview',
      companyFinancials: st.companyPanel === 'financials',
      companyFilings: st.companyPanel === 'filings',
      companySections: [
        ['overview', ar ? 'نظرة عامة' : 'Overview', ICON.market, ar ? 'السعر ونشاط الشركة' : 'Price & profile'],
        ['financials', ar ? 'القوائم والتحليل' : 'Financials & analysis', ICON.sectors,
          D.fins?.length ? `${this.num(D.fins.length, 0)} ${ar ? 'فترة مالية' : 'financial periods'}` : (ar ? 'القوائم والنسب' : 'Statements & ratios')],
        ['filings', ar ? 'الإفصاحات' : 'Filings', ICON.today,
          D.filings?.length ? `${this.num(D.filings.length, 0)} ${ar ? 'إفصاح' : 'disclosures'}` : (ar ? 'المستندات والمصادر' : 'Documents & sources')],
      ].map(([id, label, icon, note]) => ({ label, icon, note, current: (st.companyPanel || 'overview') === id ? 'page' : null,
        go: () => this.setState({ companyPanel: id }) })),
      switchCompanyLabel: ar ? 'استكشف شركات أخرى' : 'Explore other companies',
      scenarioTitle: ar ? 'مقارنة افتراضية' : 'Hypothetical comparison',
      scenarioNote: ar ? 'أمثلة حسابية وليست توقعات أو أسعاراً حالية. الأسهم والذهب بفائدة مركبة؛ المثال البنكي دون إعادة استثمار. لا تشمل الرسوم والضرائب.' : 'Calculation examples, not forecasts or current rates. Equity and gold compound; the bank example does not reinvest. Fees and taxes excluded.',
      scenarioCards: [
        [ar ? 'أسهم · افتراض ٢٨٪' : 'Equity · assumed 28%', 1.28, Math.pow(1.28, 3)],
        [ar ? 'بنك · افتراض ٢٣٫٥٪' : 'Bank · assumed 23.5%', 1.235, 1 + .235 * 3],
        [ar ? 'ذهب · افتراض ٢٥٪' : 'Gold · assumed 25%', 1.25, Math.pow(1.25, 3)],
      ].map(([label, one, three]) => ({ label,
        one: Math.round((st.calcInvest ?? 100000) * one).toLocaleString('en-US'),
        three: Math.round((st.calcInvest ?? 100000) * three).toLocaleString('en-US'),
        width: (three / Math.pow(1.28, 3) * 100).toFixed(1) + '%' })),
      afterOne: ar ? 'بعد سنة · ج.م' : 'After 1 year · EGP',
      afterThree: ar ? 'بعد ٣ سنوات · ج.م' : 'After 3 years · EGP',
      breadthTotalLabel: ar ? 'سهم' : 'shares',
      showHomeDetails: Boolean(st.showHomeDetails),
      toggleHomeDetails: () => this.setState({ showHomeDetails: !st.showHomeDetails }),
      overviewIntro: ar ? 'ابدأ بملخص الجلسة، ثم انتقل إلى الشركة والدليل وراء أرقامها.' : 'Start with the session, then explore a company and the evidence behind its figures.',
      preferencesLabel: ar ? 'اللغة والمظهر' : 'Language & appearance',
      preferencesOpen: st.preferencesOpen,
      togglePreferences: () => this.setState({ preferencesOpen: !st.preferencesOpen }),
      filtersOpen: st.filtersOpen,
      filterLabel: ar ? 'القطاع والمقاييس' : 'Sector & measures',
      toggleFilters: () => this.setState({ filtersOpen: !st.filtersOpen }),
      resetFilters: () => this.setState({ sector: 'All', rqs: [], sectorQuery: '' }),
      resetFiltersLabel: ar ? 'مسح التصفية' : 'Reset filters',
      activeFiltersLabel: (ar ? 'القطاع: ' : 'Sector: ') + (st.sector === 'All' ? (ar ? 'الكل' : 'All') : sectorName(st.sector))
        + (ar ? ' · مقاييس مفعّلة: ' : ' · Active measures: ') + st.rqs.length,
      sectorSearchLabel: ar ? 'ابحث عن قطاع' : 'Find a sector',
      sectorQuery: st.sectorQuery,
      onSectorQuery: e => this.setState({ sectorQuery: e.target.value }),
      filteredSectorChips: sectorChips.filter(s => !st.sectorQuery || s.label.toLowerCase().includes(st.sectorQuery.toLowerCase())),
      bodyFont: ar ? "'IBM Plex Sans Arabic','IBM Plex Sans',sans-serif" : "'IBM Plex Sans',sans-serif",
      marketDate: this.longDate(D.marketDate),
      // "Built 14:11" rather than "2026-09-02T12:11:22+00:00": L.builtAt has
      // existed in both languages for exactly this line and was never bound.
      generatedAt: D.generatedAt ? L.builtAt + ' ' + this.clock(D.generatedAt) : '',
      // Whether the prices on every screen are settled closes or a session
      // still running. market.json has always said; nothing here had asked.
      sessionState: this.sessionLine(D, L),
      goMarket: this.go('market'),
      searchIcon: ICON.search,
      /* FOUR TESTS, AS FILED.
       *
       * A "cheapest by P/E" list is a screen anyone can build and nearly
       * everyone builds badly: it fills with companies nobody can trade, with
       * profits that never became cash, and with a price that is low because
       * a rights issue is about to change what a share is. So the same three
       * filters run beside the multiple.
       *
       * EVERY THRESHOLD IS READ, NOT CHOSEN. The P/E line and the volume line
       * are the market's own medians, computed here from the companies that
       * published each figure; the cash line is 1.0, which is the point where
       * a company collected as much cash as it reported in profit. Picking
       * numbers would make this an opinion about companies, and this
       * publisher does not hold one.
       *
       * It is a filter, not a verdict: it names the tests, shows how many
       * passed, and hands the reader the same table with the same tests on.
       * No company is ranked, and no return is claimed — see `screenNoBack`.
       */
      screen: (() => {
        const lines = this.marketLines(D);
        if (!lines) return null;
        const { all, pe, vol, due, cash } = lines;
        const cal = D.expectedEvents || [];

        // THE SHAPE OF THE EXCHANGE, NOT A PROPORTION OF IT.
        //
        // A single filled bar says how many companies sit inside a line and
        // nothing about how they are spread, which is the more interesting
        // half: a median with everything bunched against it is a different
        // market from one with two clusters either side. So each measure is
        // bucketed and drawn, with the median marked where it actually falls.
        //
        // Counts, not values, set the height — a column is how many companies
        // are in that bucket. Bars left of the line carry the accent and bars
        // right of it are faint, so the reading is "this much of the market,
        // shaped like this", and no column is a company anybody chose.
        const BUCKETS = 26;
        // The range is read off the data, not written here.
        //
        // Fixed bounds wasted the drawing — 1e3..1e8 on volume left the whole
        // left half empty — and plain percentiles were no better: the 98th
        // percentile of the multiple is 186.6, which put the median at 7% of
        // the width and squashed the market into a corner. These are Tukey
        // fences (a quartile either side, plus one and a half times the spread
        // between them) computed in the space the bars are drawn in, which is
        // log for the two measures that run over orders of magnitude. The
        // median then lands near the middle because that is where it is, and
        // what falls beyond the fences is counted and said rather than clipped
        // into the end column.
        const histogram = (values, line, below, log) => {
          const raw = values.filter((x) => typeof x === 'number' && isFinite(x)
                                           && (!log || x > 0));
          if (raw.length < 8) return null;
          const tx = (x) => (log ? Math.log10(x) : x);
          const t = raw.map(tx).sort((a, b) => a - b);
          const q = (f) => t[Math.min(t.length - 1, Math.max(0, Math.round((t.length - 1) * f)))];
          const q1 = q(0.25), q3 = q(0.75), reach = 1.5 * (q3 - q1);
          const lo = Math.max(t[0], q1 - reach), hi = Math.min(t[t.length - 1], q3 + reach);
          if (!(hi > lo)) return null;
          const at = (x) => Math.min(1, Math.max(0, (tx(x) - lo) / (hi - lo)));
          const counts = new Array(BUCKETS).fill(0);
          let outside = 0;
          for (const x of raw) {
            const y = tx(x);
            if (y < lo || y > hi) { outside += 1; continue; }
            counts[Math.min(BUCKETS - 1, Math.floor(at(x) * BUCKETS))] += 1;
          }
          const top = Math.max(1, ...counts);
          const cut = at(line) * BUCKETS;
          return {
            // A bucket holding one company must still be visible, or a thin
            // tail reads as an empty market rather than a thin one.
            bars: counts.map((n, i) => {
              const on = below ? i < cut : i + 1 > cut;
              return {
                h: (n === 0 ? 0 : Math.max(7, (n / top) * 100)).toFixed(1) + '%',
                on,
                // The colour travels with the bar: the template engine binds
                // values, not conditions, and a column that decided its own
                // shade in the markup would need an expression the engine has
                // no way to evaluate.
                c: on ? 'var(--accent)' : 'var(--rule)',
              };
            }),
            medianAt: (at(line) * 100).toFixed(1) + '%',
            over: outside ? L.screenOver.replace('{n}', this.num(outside, 0)) : '',
            hasOver: outside > 0,
          };
        };

        // EACH LINE AGAINST THE COMPANIES THAT CAN ANSWER IT.
        //
        // One shared denominator of every listing was the dishonest version:
        // only 170 companies have published a price-to-earnings figure at all,
        // so "at or below the median" drew at 30% of the exchange beside a
        // sentence calling it the median. A median of the companies that
        // published one is half of them, and the 114 that published nothing
        // are the other half of what this knows — named, not folded in.
        const havePe = all.filter((c) => typeof c.pe === 'number' && c.pe > 0);
        const haveVol = all.filter((c) => typeof c.avgVolume === 'number');
        const haveCash = all.filter((c) => typeof cash(c) === 'number');
        const line = (n, label, what, text, inside, base, dist) => {
          const silent = base < all.length
            ? L.screenSilent.replace('{n}', this.num(all.length - base, 0)) : '';
          // One short line under each drawing, carrying both the companies
          // that could not be tested and the ones beyond the fences. Kept to a
          // single line on purpose: the card is a graph, and a graph with a
          // paragraph under every panel is a paragraph.
          const foot = [silent, dist && dist.over].filter(Boolean).join(' · ');
          return {
            n, label, what, text,
            of: L.screenOf.replace('{n}', this.num(inside, 0)).replace('{of}', this.num(base, 0)),
            width: base ? ((inside / base) * 100).toFixed(1) + '%' : '0%',
            silent, hasSilent: Boolean(silent),
            foot, hasFoot: Boolean(foot),
            dist: dist || null, hasDist: Boolean(dist), noDist: !dist,
          };
        };
        return {
          universe: L.screenUniverse.replace('{n}', this.num(all.length, 0)),
          // The definitions fold away. The subtitle does not: the card was
          // opaque once already, and hiding the one sentence that says what it
          // is would put it straight back. What folds is the per-measure
          // detail — useful the first time, noise every time after.
          howOn: Boolean(st.linesHow),
          howLabel: st.linesHow ? L.screenHowClose : L.screenHowOpen,
          howCaret: st.linesHow ? '\u2013' : '+',
          toggleHow: () => this.setState((x) => ({ linesHow: !x.linesHow })),
          tests: [
            line('1', L.screenPeShort, L.screenPeWhat, L.screenPe.replace('{v}', pe.toFixed(1)),
                 havePe.filter((c) => c.pe <= pe).length, havePe.length,
                 histogram(havePe.map((c) => c.pe), pe, true, true)),
            line('2', L.screenVolShort, L.screenVolWhat, L.screenVol.replace('{v}', this.num(vol, 0)),
                 haveVol.filter((c) => c.avgVolume >= vol).length, haveVol.length,
                 histogram(haveVol.map((c) => c.avgVolume), vol, false, true)),
            line('3', L.screenCashShort, L.screenCashWhat, haveCash.length ? L.screenCash : L.screenCashNone,
                 haveCash.filter((c) => cash(c) >= 1).length, haveCash.length,
                 haveCash.length
                   ? histogram(haveCash.map(cash), 1, false, false) : null),
            line('4', L.screenActionShort, cal.length ? L.screenActionWhat : L.screenActionWhatNone, cal.length ? L.screenAction : L.screenActionNone,
                 all.filter((c) => !due.has(c.ticker)).length, all.length, null),
          ],
          // The same line, on the table, where the reader owns it.
          //
          // Full precision, not the rounded figure the card prints: the card
          // said 16.7 and the filter asked for 16.7, which quietly dropped the
          // company sitting at 16.72. And the sector chip and the search box
          // are cleared, or the filter arrives on top of whatever the reader
          // had narrowed to and returns a number matching nothing said here.
          // The table, filtered — and NOT ranked.
          //
          // This used to land on `sort:'pe', dir:1`: ascending multiple, so
          // the first row was the cheapest company that had passed a filter
          // this publisher chose. That is a pick rendered as a lead, and it
          // does not stop being one because the ranking is implicit in a sort
          // order. The table's own default ordering stands, and the reader
          // sorts by whatever they want to sort by.
          //
          // `bt` from zero, not `lt`: `lt` is strict, so the company sitting
          // exactly ON the median was counted in the panel and missing from
          // the table it handed you — 85 drawn, 84 delivered, every day. The
          // between branch is inclusive at both ends.
          // ONE measure, not four.
          //
          // Switching all four on from a single tap is a selection this
          // publisher made, not one the reader did — and run against the live
          // market the four ANDed collapse 284 companies to 15, a number that
          // appears nowhere on the card. The button says "put the FIRST
          // measure on the table" and that is exactly what it does; the other
          // three are chips the reader adds.
          open: () => this.setState({ screen: 'market',
            sector: 'All', q: '',
            rqs: [{ src: 'line', k: 'ratio', m: 'pe', op: 'bt', a: '0', b: String(pe) }] }),
        };
      })(),
      // ── 3-Second Market Pulse (Plain Language for Everyone) ──
      pulseTone: (() => {
        const mainIx = indices && indices[0];
        const pctVal = mainIx ? parseFloat(mainIx.pct) : 0;
        if (pctVal > 0.15) {
          return { bg: 'rgba(63, 107, 82, 0.12)', fg: '#3F6B52', border: 'rgba(63, 107, 82, 0.3)', icon: '↗', badge: ar ? 'جلسة خضراء · صعود' : 'Gaining Session' };
        } else if (pctVal < -0.15) {
          return { bg: 'rgba(163, 64, 47, 0.12)', fg: '#A3402F', border: 'rgba(163, 64, 47, 0.3)', icon: '↘', badge: ar ? 'جلسة حمراء · تراجع' : 'Pullback Session' };
        }
        return { bg: 'rgba(232, 98, 28, 0.12)', fg: '#E8621C', border: 'rgba(232, 98, 28, 0.3)', icon: '↔', badge: ar ? 'جلسة متوازنة' : 'Balanced Session' };
      })(),
      pulseTitle: L.pulseTitle,
      pulseDate: this.longDate(D.marketDate) || '',
      /* What the session did, from the two figures that were actually
         measured: the index level and the count of what moved with it.
         This paragraph used to add a cause to every move. A rising index was
         reported with "constructive institutional inflows across core
         sectors", a falling one with "selective profit-taking across cyclical
         names" — neither read from anything. The only input was the sign of
         one percentage, and no document here records why anybody bought. The
         reasons are gone; the numbers they were wrapped around are kept, and
         breadth is added because it is the part an index cannot say. */
      pulseBody: (() => {
        /* Two independent clauses, each written only if its own figures are
           there. Joining them the other way round — the index sentence with
           breadth appended — meant a market with no index level published
           dropped the breadth sentence too, and the reader was told nothing
           about a session both numbers described. */
        const said = [];
        const mainIx = indices && indices[0];
        if (mainIx) {
          said.push(ar
            ? `أغلق مؤشر ${mainIx.label} عند ${mainIx.value} نقطة بتغير ${mainIx.pct}.`
            : `${mainIx.label} closed at ${mainIx.value}, a change of ${mainIx.pct}.`);
        }
        if (breadth) {
          const [u, d, f, c] = [breadth.up, breadth.down, breadth.flat, breadth.counted]
            .map((n) => this.num(n, 0));
          said.push(ar
            ? `شهدت الجلسة صعود ${u} سهماً وتراجع ${d} واستقرار ${f} سهماً، من إجمالي ${c} سهماً جرى تداولها.`
            : `${u} rose, ${d} fell and ${f} held, of ${c} counted.`);
        }
        return said.join(' ');
      })(),
      /* The largest gain on the board, named as that and nothing more.
         It is a fact about one day's percentage, not a shortlist and not a
         judgement about the company — which is why it says "largest move
         today" rather than anything that would read as a pick. */
      pulseLeader: (() => {
        const topGainers = (D.companies || []).filter((c) => typeof c.pct === 'number' && c.pct > 0).sort((a,b) => b.pct - a.pct);
        const top = topGainers[0];
        if (!top) return ar ? 'لا صعود اليوم' : 'Nothing rose today';
        const name = this.nm(top.name) || top.ticker;
        return `${name} (${this.pct(top.pct)})`;
      })(),
      pulseExpanded: Boolean(st.pulseExpanded),
      togglePulse: () => this.setState({ pulseExpanded: !st.pulseExpanded }),
      pulseExpandLabel: st.pulseExpanded
        ? (ar ? 'إخفاء التحليل المكتوب ↑' : 'Hide commentary ↑')
        : (ar ? 'عرض التفاصيل والتحليل المكتوب ↓' : 'Read details & commentary ↓'),
      pulseAudioPlaying: Boolean(st.audioPlaying && st.audioItem === 'pulse'),
      pulseAudioLabel: (st.audioPlaying && st.audioItem === 'pulse')
        ? (ar ? '⏸️ إيقاف التلاوة' : '⏸️ Stop Audio')
        : (ar ? '🔊 استمع لملخص الجلسة' : '🔊 Audio Briefing'),
      togglePulseAudio: () => {
        const pMain = indices && indices[0];
        const pBody = ar
          ? `أغلق مؤشر ${pMain ? pMain.label : 'إيجي إكس 30'} عند ${pMain ? pMain.value : ''} نقطة بتغير ${pMain ? pMain.pct : ''}. صعد ${breadth ? breadth.up : 0} سهماً وتراجع ${breadth ? breadth.down : 0} وثبت ${breadth ? breadth.flat : 0} سهماً.`
          : `${pMain ? pMain.label : 'EGX30'} closed at ${pMain ? pMain.value : ''}, a change of ${pMain ? pMain.pct : ''}. ${breadth ? breadth.up : 0} rose, ${breadth ? breadth.down : 0} fell and ${breadth ? breadth.flat : 0} held.`;
        const text = (ar
          ? `ملخص جلسة البورصة المصرية ليوم ${this.longDate(D.marketDate) || ''}. ${pBody}`
          : `Egyptian Exchange market briefing for ${this.longDate(D.marketDate) || ''}. ${pBody}`);
        this.playSpeech(text, 'pulse');
      },
      // Home's headline and its pill said "The close — official close from
      // market.json, not a live price" as unconditional literals, including
      // through the whole trading session, while the sidebar beside them said
      // "live feed, delayed 15 min" from the same flags. During a session a
      // reader was told the moving number was an official close. Same test
      // sessionLine() makes: the live feed first, because `is_close` belongs
      // to the last capture and the first hours of a session sit under
      // yesterday's document.
      homeIsClose: Boolean(D.isClose && !D.livePrices),
      homeIsLive: !(D.isClose && !D.livePrices),
      homeTitle: (D.isClose && !D.livePrices) ? L.homeTitle : L.homeTitleLive,
      homeNote: (D.isClose && !D.livePrices) ? L.closeNote : L.closeNoteLive,
      hasPriceSource: Boolean(D.liveFrom && D.liveFrom.egx),
      priceSource: D.liveFrom
        ? L.priceFrom.replace('{egx}', String(D.liveFrom.egx))
            .replace('{vendor}', String(D.liveFrom.vendor))
        : '',
      sessionColor: (D.isClose && !D.livePrices) ? 'var(--faint)' : 'var(--accent)',
      dataVersion: D.dataVersion || '—', totalCount: D.companies.length,
      noIndices: indices.length === 0, noReadNow: readNow.length === 0,
      noFeed: feed.length === 0, noRates: rates.length === 0,
      hasRates: rates.length > 0,
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
      // Filter the month by a company as well as by a day. A month holds
      // 1,467 filings and the grid can only ask "what was filed on this day";
      // the other question a reader arrives with is "what has this company
      // filed", which the grid cannot express.
      filedQ: st.filedQ || '',
      onFiledQuery: (e) => this.setState({ filedQ: e.target.value }),
      clearFiled: () => this.setState({ filedQ: '', day: '', frqs: [] }),
      hasFiledFilter: Boolean((st.filedQ || '').trim() || st.day
        || (Array.isArray(st.frqs) && st.frqs.some((q) => q && q.m))),
      filedFilterNote: (() => {
        if (!filtered) return '';
        const bits = [];
        if (st.day) bits.push(this.longDate(st.day));
        const q = String(st.filedQ || '').trim();
        if (q) bits.push('\u201c' + q + '\u201d');
        if (!bits.length) return '';
        const what = bits.join(' \u00b7 ');
        return filtered.length === 1
          ? L.filedShowingOne.replace('{what}', what)
          : L.filedShowing.replace('{n}', filtered.length).replace('{what}', what);
      })(),
      filedNoMatch: Boolean(filtered && filtered.length === 0),
      dayFilings, dayNote, hasDay: Boolean(st.day),
      // Searching spans the year, so the note cannot go on naming one month.
      // It says what was actually looked through, which is the only way a
      // reader can tell "no filings" from "none in the month you are on".
      archiveNote: everything
        ? (st.month
          // Narrowed by a month the reader picked: say the month, not the
          // year it was picked out of.
          ? L.archiveSearchedMonth.replace('{shown}', String((archive || []).length))
              .replace('{total}', String(filtered ? filtered.length : 0))
              .replace('{month}', this.monthLabel(st.month))
          : L.archiveSearched.replace('{shown}', String((archive || []).length))
              .replace('{total}', String(filtered ? filtered.length : 0))
              .replace('{months}', String((D.filedMonths || []).length)))
        : (D.filedArchive && D.filedArchiveMonth === openMonth)
        ? L.archiveNote.replace('{shown}', Math.min(60, D.filedArchive.length))
            .replace('{total}', D.filedArchive.length)
            .replace('{month}', this.monthLabel(openMonth))
        : '',
      feedCount: allFeed.length
        ? L.feedCount.replace('{shown}', feed.length).replace('{total}', allFeed.length) : '',
      moreFeed: feed.length < allFeed.length,
      showMoreFeed: () => this.setState({ feedShown: feed.length + 40 }),
      busy, hasBusy: busy.length > 0, noBusy: busyMeasured > 0 && busy.length === 0,
      showBusy: busy.length > 0 || busyMeasured > 0,
      busyNote: busy.length ? L.busyWorkings + ' ' + L.busyYardstick : '',
      // The session these multiples were measured in, drawn on the card.
      // Empty when the date is unknown rather than filled with today's — the
      // exchange's last published session is often not the current day, and a
      // multiple stamped with the wrong day is worse than one with none.
      busyWhen: (() => {
        const day = this.longDate(D.marketDate);
        if (!busy.length || !day) return '';
        return (D.isClose && !D.livePrices ? L.busyOn : L.busyOnLive)
          .replace('{date}', day);
      })(),
      // Said out loud, because a list that is a slice and does not say so is a
      // list that claims to be all of them.
      busyCut: busyAll.length > busy.length
        ? L.busyCut.replace('{shown}', String(busy.length))
            .replace('{all}', String(busyAll.length))
            .replace('{date}', this.longDate(D.marketDate) || '—')
        : '',
      hasBusyCut: busyAll.length > busy.length,
      hasBreadth: Boolean(breadth),
      breadthBars: breadth ? [
        // `ink` travels with the band because the flat band is a pale rule and
        // the other two are saturated: one shared text colour is unreadable on
        // one of them whichever is chosen.
        { n: breadth.up, color: 'var(--up)', label: L.rose, ink: '#fff' },
        { n: breadth.down, color: 'var(--down)', label: L.fell, ink: '#fff' },
        { n: breadth.flat, color: 'var(--rule2)', label: L.flat, ink: 'var(--t2)' },
      ].map((b) => Object.assign({}, b, {
        width: Math.round((b.n / Math.max(1, breadth.counted)) * 100) + '%',
        // The count and its share travel with the band so the bar can be read
        // without the sentence under it. A stacked bar with no numbers on it
        // is a decoration.
        count: this.num(b.n, 0),
        pct: Math.round((b.n / Math.max(1, breadth.counted)) * 100) + '%',
      })) : [],
      breadthCounted: breadth
        ? L.breadthOf.replace('{n}', this.num(breadth.counted, 0)) : '',
      // `breadthLine` used to be drawn under the bar. It says in a sentence
      // what the bar says in a shape, and it now reads once, inside the
      // pulse commentary, where somebody who wanted the words has asked for
      // them. Computing it here and binding it nowhere is how a figure goes
      // stale unnoticed, so it is gone rather than merely unused.
      // The sector cards carry a fuller read and a median per metric when the
      // per-sector document came back; a card without one simply shows less.
      sectorsHaveDetail: sectorCards.some((c) => (c.medians || []).length),
      signalFootnote: signals.length ? L.sigFootnote : '',
      // The ratios, and the paragraph the pipeline writes over all of them.
      pickList, pickChips, hasPickList: pickList.length > 0,
      ratios, ratioGroups, hasRatios: ratios.length > 0,
      // The same §8 guard the metric answers pass through. This paragraph is
      // the most prominent generated prose on the screen and was the one
      // path that skipped it.
      ratioRead: (() => { const r = D.review ? (ar ? (D.review.read_ar || D.review.read) : D.review.read) || '' : ''; return r && !DIRECTIVE.test(r) ? r : ''; })(),
      // "Six of seven readable metrics moved the same way" — and then the
      // question that follows from it, which is the app's and not ours.
      ratioAgreement: agreement, ratioAsk: agreementAsk,
      ratioMissing: ratios.length ? L.revMissingNote : '',
      noMacro: macro.length === 0,
      noStudies: studies.length === 0,
      nav, sectorCount: sectorCards.length,
      openSector, hasOpenSector: Boolean(openSector),
      noOpenSector: !openSector, themeLabel: st.theme === 'light' ? (ar?'نهاري':'Light') : (ar?'ليلي':'Dark'),
      flipTheme: () => this.setState(s => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),
      toEn: () => this.setState({ lang:'en' }), toAr: () => this.setState({ lang:'ar' }),
      enBg: !ar ? 'var(--surface)' : 'transparent', enFg: !ar ? 'var(--ink)' : 'var(--t2)', enSh: !ar ? 'var(--shPill)' : 'none',
      arBg: ar ? 'var(--surface)' : 'transparent', arFg: ar ? 'var(--ink)' : 'var(--t2)', arSh: ar ? 'var(--shPill)' : 'none',
      themeIcon: st.theme === 'light' ? 'M12 4.6V2.8M12 21.2v-1.8M4.6 12H2.8M21.2 12h-1.8M6.8 6.8 5.5 5.5M18.5 18.5l-1.3-1.3M6.8 17.2l-1.3 1.3M18.5 5.5l-1.3 1.3M12 7.6a4.4 4.4 0 1 0 0 8.8 4.4 4.4 0 0 0 0-8.8' : 'M20.4 14.6A8.8 8.8 0 0 1 9.4 3.6a8.8 8.8 0 1 0 11 11',
      isHome: st.screen === 'home', isToday: st.screen === 'today', isMarket: st.screen === 'market',
      isCompany: st.screen === 'company', isSectors: st.screen === 'sectors', isCalendar: st.screen === 'calendar',
      isExchange: st.screen === 'exchange', isResearch: st.screen === 'research',
      isInvestors: st.screen === 'investors', isCrossings: st.screen === 'crossings',
      isWatchlist: st.screen === 'watchlist', isTools: st.screen === 'tools',
      goTools: this.go('tools'),
      isHeat: st.screen === 'heat',
      heatTabs, heatBlocks, heatTiles,
      heatZoomed: Boolean(heatZoom),
      heatRootNote: heatRoot ? L.heatRoot : '',
      heatUnsized, hasHeatUnsized: heatUnsized.length > 0,
      heatUnsizedNote: L.heatUnsized.replace('{n}', String(heatUnsized.length)),
      heatZoomLabel: heatZoom ? sectorName(heatZoom) : '',
      heatZoomOut: () => this.setState({ heatSector: '' }),
      heatZoomHint: heatZoom ? L.heatZoomOut : L.heatZoomIn,
      noHeat: heatTiles.length === 0,
      noHeatIndex: (D.indexMembers || []).length === 0,
      heatDrawn: (heatZoom
        ? L.heatZoomDrawn.replace('{n}', String(heatTiles.length))
            .replace('{sector}', sectorName(heatZoom))
            .replace('{of}', String(heatSized.length)) + ' '
        : '')
        + (heatMissingCount === 0
          ? L.heatAllDrawn.replace('{drawn}', String(heatSized.length))
          : L.heatDrawn.replace('{drawn}', String(heatSized.length))
              .replace('{total}', String(heatPool.length))
              .replace('{missing}', String(heatMissingCount))),
      hasHeatSliver: heatSlivers > 0,
      heatSliver: L.heatSliver.replace('{n}', String(heatSlivers))
        .replace('{times}', Math.round(heatSpread).toLocaleString('en-US')),
      hasHeatUnpriced: heatUnpriced > 0,
      heatUnpriced: L.heatNoPrice.replace('{n}', String(heatUnpriced)),
      hasHeatAbsent: heatAbsent.length > 0,
      heatAbsent: L.heatMissing.replace('{n}', String(heatAbsent.length))
        .replace('{which}', heatAbsent.join(', ')),
      hasHeatSource: Boolean(heatDoc),
      heatSource: heatDoc
        ? (heatDoc.carried
            ? L.heatCarried.replace('{at}', this.shortDate(heatDoc.asOf))
            : L.heatFrom.replace('{at}', this.shortDate(heatDoc.asOf)))
        : '',
      // The key under the map, in the map's own colours.
      heatKey: [-3.5, -2, -0.7, 0, 0.7, 2, 3.5].map((v) => ({
        bg: heatColour(v), label: v === 0 ? '0' : this.pct(v) })),
      indices, movers, watchlist, readNow, feed,
      followed, noFollowed: followed.length === 0, hasFollowed: followed.length > 0,
      followedCount: followed.length ? String(followed.length) : '',
      // How the followed companies closed — counted, not characterised. Three
      // of yours rose is a fact about the session; whether that is good news
      // depends on facts about the reader this site does not have and would
      // not be licensed to act on if it did (§8).
      followUp: String(followPriced.filter((c) => c.pct > 0).length),
      followDown: String(followPriced.filter((c) => c.pct < 0).length),
      followFlatCount: String(followPriced.filter((c) => c.pct === 0).length),
      followOf: L.followOfCount.replace('{n}', String(followPriced.length)),
      // The market table's own labels, minus the sort: the order here is the
      // order they were followed in, which is the reader's and not a ranking.
      followCols: colDef.map(([, label, align]) => ({ label, align })),
      // Where the list is actually kept, which is a different answer signed in
      // and signed out, and the reader is entitled to the right one.
      followKept: this._reader ? L.followKeptAccount : L.followKeptDevice,
      clearWatch: () => { this.onClearWatch && this.onClearWatch(); },
      goMarket: this.go('market'),
      goInvestors: this.go('investors'),
      investors, noInvestors: investors === null,
      // Bound to the company ON SCREEN rather than to the ticker in the state.
      // They are the same thing live. They are not on the demo, where every
      // company opens the one worked example — so following from there would
      // have put a different ticker on the list from the one whose card the
      // reader was looking at.
      companyWatched: watchedSet.has(co.ticker),
      companyStar: watchedSet.has(co.ticker) ? '\u2605' : '\u2606',
      // Says what it IS when following and what it OFFERS when not, which is
      // the way round a control has to read to be pressable without guessing.
      companyWatchLabel: watchedSet.has(co.ticker) ? L.unfollow : L.follow,
      companyWatchColor: watchedSet.has(co.ticker) ? 'var(--accent)' : 'var(--t2)',
      companyWatchBorder: watchedSet.has(co.ticker) ? 'var(--accent)' : 'var(--edgeIn)',
      // No company, nothing to follow: the screen before a ticker is chosen
      // shows dashes, and a star beside a dash would store one.
      canFollowCompany: co.ticker !== '\u2014',
      companyFollow: () => { if (co.ticker !== '\u2014') this.onWatch && this.onWatch(co.ticker); },
      companyAudioPlaying: Boolean(st.audioPlaying && st.audioItem === 'company'),
      companyAudioLabel: (st.audioPlaying && st.audioItem === 'company')
        ? (ar ? '⏸️ إيقاف التلاوة' : '⏸️ Stop Audio')
        : (ar ? '🔊 استمع لملخص الشركة' : '🔊 Company Briefing'),
      toggleCompanyAudio: () => {
        const coName = co.primaryName || co.ticker;
        const text = ar
          ? `ملخص شركة ${coName}، الرمز ${co.ticker}. الإغلاق ${co.close} جنيه، نسبة التغير ${co.pct}.`
          : `Company briefing for ${coName}, ticker ${co.ticker}. Last close ${co.close} EGP, change ${co.pct}.`;
        this.playSpeech(text, 'company');
      },
      openCalculatorForCompany: () => {
        const priceNum = parseFloat(String(co.close || '').replace(/,/g, '')) || 50;
        const yieldNum = parseFloat(String(co.yield || '').replace(/%/g, '')) || 0;
        const divNum = yieldNum > 0 ? Number(((priceNum * yieldNum) / 100).toFixed(2)) : 4.5;
        this.setState({ screen: 'tools', calcPrice: priceNum, calcDividend: divNum });
      },
      // ── Investor Tools & Calculators ──
      calc: {
        invest: (st.calcInvest ?? 100000).toLocaleString('en-US'),
        investRaw: st.calcInvest ?? 100000,
        price: (st.calcPrice || 50).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        priceRaw: st.calcPrice || 50,
        dividend: (st.calcDividend ?? 4.5).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        dividendRaw: st.calcDividend ?? 4.5,
        shares: Math.floor((st.calcInvest ?? 100000) / Math.max(0.01, st.calcPrice || 50)).toLocaleString('en-US'),
        annualCash: Math.round(Math.floor((st.calcInvest ?? 100000) / Math.max(0.01, st.calcPrice || 50)) * (st.calcDividend ?? 4.5)).toLocaleString('en-US'),
        monthlyCash: Math.round((Math.floor((st.calcInvest ?? 100000) / Math.max(0.01, st.calcPrice || 50)) * (st.calcDividend ?? 4.5)) / 12).toLocaleString('en-US'),
        yieldPct: (((st.calcDividend ?? 4.5) / Math.max(0.01, st.calcPrice || 50)) * 100).toFixed(2) + '%',
        paybackYears: (((st.calcDividend ?? 4.5) / Math.max(0.01, st.calcPrice || 50)) > 0)
          ? (100 / (((st.calcDividend ?? 4.5) / Math.max(0.01, st.calcPrice || 50)) * 100)).toFixed(1) + (ar ? ' سنة' : ' yrs')
          : '—',
        cdAnnualPayout: Math.round((st.calcInvest ?? 100000) * 0.235).toLocaleString('en-US'),
        cdMonthlyPayout: Math.round(((st.calcInvest ?? 100000) * 0.235) / 12).toLocaleString('en-US'),
        egx1Y: Math.round((st.calcInvest ?? 100000) * 1.28).toLocaleString('en-US'),
        egx3Y: Math.round((st.calcInvest ?? 100000) * Math.pow(1.28, 3)).toLocaleString('en-US'),
        cd1Y: Math.round((st.calcInvest ?? 100000) * 1.235).toLocaleString('en-US'),
        cd3Y: Math.round((st.calcInvest ?? 100000) * (1 + 0.235 * 3)).toLocaleString('en-US'),
        gold1Y: Math.round((st.calcInvest ?? 100000) * 1.25).toLocaleString('en-US'),
        gold3Y: Math.round((st.calcInvest ?? 100000) * Math.pow(1.25, 3)).toLocaleString('en-US'),
      },
      calcInvest: (st.calcInvest ?? 100000).toLocaleString('en-US'),
      calcInvestRaw: st.calcInvest ?? 100000,
      calcPrice: (st.calcPrice || 50).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      calcPriceRaw: st.calcPrice || 50,
      calcDividend: (st.calcDividend ?? 4.5).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      calcDividendRaw: st.calcDividend ?? 4.5,
      calcShares: Math.floor((st.calcInvest ?? 100000) / Math.max(0.01, st.calcPrice || 50)).toLocaleString('en-US'),
      calcAnnualCash: Math.round(Math.floor((st.calcInvest ?? 100000) / Math.max(0.01, st.calcPrice || 50)) * (st.calcDividend ?? 4.5)).toLocaleString('en-US'),
      calcMonthlyCash: Math.round((Math.floor((st.calcInvest ?? 100000) / Math.max(0.01, st.calcPrice || 50)) * (st.calcDividend ?? 4.5)) / 12).toLocaleString('en-US'),
      calcYieldPct: (((st.calcDividend ?? 4.5) / Math.max(0.01, st.calcPrice || 50)) * 100).toFixed(2) + '%',
      calcPaybackYears: (((st.calcDividend ?? 4.5) / Math.max(0.01, st.calcPrice || 50)) > 0)
        ? (100 / (((st.calcDividend ?? 4.5) / Math.max(0.01, st.calcPrice || 50)) * 100)).toFixed(1) + (ar ? ' سنة' : ' yrs')
        : '—',
      calcCdAnnualPayout: Math.round((st.calcInvest ?? 100000) * 0.235).toLocaleString('en-US'),
      calcCdMonthlyPayout: Math.round(((st.calcInvest ?? 100000) * 0.235) / 12).toLocaleString('en-US'),
      calcEgx1Y: Math.round((st.calcInvest ?? 100000) * 1.28).toLocaleString('en-US'),
      calcEgx3Y: Math.round((st.calcInvest ?? 100000) * Math.pow(1.28, 3)).toLocaleString('en-US'),
      calcCd1Y: Math.round((st.calcInvest ?? 100000) * 1.235).toLocaleString('en-US'),
      calcCd3Y: Math.round((st.calcInvest ?? 100000) * (1 + 0.235 * 3)).toLocaleString('en-US'),
      calcGold1Y: Math.round((st.calcInvest ?? 100000) * 1.25).toLocaleString('en-US'),
      calcGold3Y: Math.round((st.calcInvest ?? 100000) * Math.pow(1.25, 3)).toLocaleString('en-US'),
      /* Find a listed company and fill the two boxes from what is filed.
       *
       * The calculator opened on a made-up 50.00 and 4.50, so every figure it
       * produced was arithmetic about a share that does not exist. This puts a
       * real close and, where the exchange publishes one, a real dividend
       * behind it.
       *
       * Ordered by how well the text matches — ticker first, then name — and
       * deliberately NOT by yield, P/E or anything else a reader could read as
       * a ranking. A search box that sorts companies by an investment measure
       * is a shortlist with a text field in front of it (§8.6), which is the
       * one thing this must not become.
       *
       * A company with no filed dividend fills only the price and says so.
       * Carrying the previous company's payout under a new name would be the
       * worst outcome here: a plausible number, wrong, under a real ticker.
       */
      calcQuery: st.calcQuery || '',
      calcMatches: (() => {
        const q = this.fold((st.calcQuery || '').trim());
        if (q.length < 2) return [];
        const hits = [];
        for (const c of D.companies || []) {
          if (typeof c.close !== 'number') continue;
          const ticker = this.fold(c.ticker || '');
          const name = this.fold(this.nm(c.name) || '');
          const where = ticker.startsWith(q) ? 0
            : name.startsWith(q) ? 1
              : ticker.includes(q) ? 2
                : name.includes(q) ? 3 : -1;
          if (where < 0) continue;
          const yieldPct = ((c.ratios || {}).dividend_yield);
          hits.push({
            rank: where,
            ticker: c.ticker,
            name: this.nm(c.name),
            close: this.num(c.close),
            // `dividend_yield` is published as a percent (4.26 means 4.26%).
            perShare: typeof yieldPct === 'number' && yieldPct > 0
              ? Number((c.close * yieldPct / 100).toFixed(2)) : null,
            hasDividend: typeof yieldPct === 'number' && yieldPct > 0,
            note: typeof yieldPct === 'number' && yieldPct > 0 ? '' : L.calcNoDividend,
            pick: () => this.setState({
              calcPrice: c.close,
              calcDividend: typeof yieldPct === 'number' && yieldPct > 0
                ? Number((c.close * yieldPct / 100).toFixed(2)) : 0,
              calcPicked: `${c.ticker} · ${this.nm(c.name)}`,
              calcPickedHasDividend: Boolean(typeof yieldPct === 'number' && yieldPct > 0),
              calcQuery: '',
            }),
          });
        }
        hits.sort((a, b) => a.rank - b.rank
          || String(a.ticker).localeCompare(String(b.ticker)));
        return hits.slice(0, 8).map((h) => Object.assign({}, h, { rank: undefined }));
      })(),
      calcPicked: st.calcPicked || '',
      hasCalcPicked: Boolean(st.calcPicked),
      calcPickedNeedsDividend: Boolean(st.calcPicked) && !st.calcPickedHasDividend,
      onCalcQuery: (e) => this.setState({ calcQuery: e.target.value }),
      clearCalcPick: () => this.setState({ calcPicked: '', calcQuery: '' }),
      onCalcInvestChange: (e) => this.setState({ calcInvest: Math.max(0, parseFloat(e.target.value) || 0) }),
      onCalcPriceChange: (e) => this.setState({ calcPrice: Math.max(0.01, parseFloat(e.target.value) || 0) }),
      onCalcDividendChange: (e) => this.setState({ calcDividend: Math.max(0, parseFloat(e.target.value) || 0) }),
      setInvest50k: () => this.setState({ calcInvest: 50000 }),
      setInvest100k: () => this.setState({ calcInvest: 100000 }),
      setInvest250k: () => this.setState({ calcInvest: 250000 }),
      setInvest500k: () => this.setState({ calcInvest: 500000 }),
      rows: rows.map(mkRow), rowCount: rows.length, cols, sectorChips, query: st.q,
      ratio, filedRatio: this.ratioControl('frqs', L, ar),
      measureChips, hasMeasureChips: measureChips.length > 0,
      // The placeholder used to assert "282 companies" in both languages. The
      // exchange is not a constant — build_market_api has already moved it
      // once — so it counts what was actually loaded.
      searchPlaceholder: L.searchPlaceholder.replace('{n}', String(D.companies.length)),
      noRows: rows.length === 0,
      clearFilters: () => this.setState({ q:'', sector:'All' }),
      onQuery: e => this.setState({ q: e.target.value }),
      co, ranges, chart, rateSeriesNote: L.rateNoSeries.replace('{n}',
        String(rates.filter((r) => ((indexById.get(r.id) || {}).points || r.points || []).length > 1).length))
        + (D.seriesTo ? ' ' + L.rateSeriesTo.replace('{at}', this.shortDate(D.seriesTo)) : ''),
      ratesArrowed: rates.map((r) => {
        const flat = !r.pct || r.pct === '\u2014';
        const up = String(r.pct).charAt(0) === '+';
        // The three EGX indices have 260 sessions of closing levels in
        // market-history.json and had a bare number on this screen. The
        // series is joined by id to the cards Home already builds from it —
        // the same figures, so the two screens cannot disagree.
        // Two sources, joined the same way. The three EGX indices have their
        // series in market-history.json and Home already builds cards from
        // it; everything else has its own in rates/history.json. Whichever
        // answers, the line is drawn from published closes and never from a
        // shape invented to fill the space.
        const line = indexById.get(r.id);
        const points = (line && line.points) || r.points || [];
        const open = st.rateOpen === (r.id || r.label);
        return Object.assign({}, r, {
          arrow: flat ? '' : (up ? '\u2197' : '\u2198'),
          tint: flat ? 'var(--sunk)' : (up ? 'var(--upTint)' : 'var(--downTint)'),
          hasPlain: Boolean(r.plain), hasKarats: Boolean((r.karats || []).length),
          // A card opens onto the arithmetic the document already writes for
          // it — how the figure was reached, not a second figure.
          spark: this.sparkOf(points, up), hasSpark: points.length > 1,
          sessions: points.length
            ? L.rateSessions.replace('{n}', String(points.length))
              + (r.pointsAre === 'usdOunce' ? ' \u00b7 ' + L.rateOunceSeries : '')
            : '',
          open, caret: open ? '\u2212' : '+',
          hasWorkings: Boolean(ar ? r.workingsAr : r.workings),
          workings: (ar ? r.workingsAr : r.workings) || '',
          hasOunce: Boolean(r.ounceEgp),
          ounce: r.ounceEgp ? L.rateOunce.replace('{egp}', r.ounceEgp)
            .replace('{usd}', r.ounceUsd || '\u2014') : '',
          toggle: () => this.setState((prev) => ({
            rateOpen: prev.rateOpen === (r.id || r.label) ? '' : (r.id || r.label) })),
        });
      }), chartFrom: slice.length ? slice[0].date : '—', chartTo: slice.length ? slice[slice.length-1].date : '—', chartCount: slice.length,
      // How many of the periods on this table are a full statement rather than
      // a one-line profit announcement. Without it the table reads as mostly
      // empty, when what it mostly is, is honest.
      // Eleven listings file in dollars, and the merge correctly refuses to
      // put a dollar profit into a pounds column. The table then stops while
      // the filings list a scroll below keeps growing, and nothing said why:
      // CFGH's read "5 of 5 periods carry a full statement" over FY 2024 with
      // three newer results filed, the latest that morning.
      finsCurrencyNote: loaded && loaded.currency ? L.finsInDollars : '',
      finsCoverage: fins.length
        ? L.fullStatements.replace('{n}', fins.filter((f) => f.hasMore).length)
            .replace('{total}', fins.length)
        : '',
      compareRows, compareChips, comparePeriods: comparePeriods.map((f) => f.period),
      hasCompare: compareRows.length > 0 && comparePeriods.length > 1,
      noCompare: D.fins.length > 0 && compareRows.length === 0,
      fins, debt, signals, filings, sectorCards, months, filedEvents, expectedEvents, rates, macro, studies,
      crossings, crossWindow, crossBody, crossWorkings, crossLegend,
      crossCount: crossings.length
        ? (ar ? crossings.length + ' تقاطعاً' : crossings.length + (crossings.length === 1 ? ' crossing' : ' crossings'))
        : '',
      noCrossings: crossings.length === 0,
      crossOpen: Boolean(st.crossOpen),
      crossToggle: () => this.setState((x) => ({ crossOpen: !x.crossOpen })),
      crossCaret: st.crossOpen ? '\u2212' : '+'
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
    // The Arabic bidi isolation used to be applied to this whole object, which
    // cannot tell a figure a reader looks at from one the browser parses — so
    // the wrapping characters landed in `style` too and every proportional bar
    // on the site drew itself full width in Arabic. It is now applied by dc.js
    // to text nodes only, through `text()` below.
    return D.demo ? this.demoise(out, D.companies) : out;
  }

  /** One string, on its way into a text node. dc.js calls this; nothing else.
   *
   * A figure set in an Arabic sentence needs a bidi isolate around it or the
   * sign, the digits and the unit come apart — "‎-3.13%" reads as "%3.13-".
   * Anything that is not a plain string, and anything not shaped like a
   * figure, is returned untouched.
   */
  text(value) {
    if (typeof value !== 'string' || this.state.lang !== 'ar') return value;
    return this.isolate(value);
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

  /** The month an expected filing falls in — "November", not "2026-11-14". */
  monthOf(iso) {
    const at = new Date(String(iso || '') + 'T00:00:00Z');
    if (isNaN(at)) return '';
    return new Intl.DateTimeFormat(this.state.lang === 'ar' ? 'ar-EG' : 'en-GB',
      { month: 'long', timeZone: 'UTC' }).format(at);
  }

  /** The calendar month on show: the reader's pick, or the newest published.
   *
   * Both `renderVals` and main.js need this and must agree — main.js fetches
   * the month's filings, renderVals draws them, and if the two disagree the
   * grid is drawn for one month out of the archive of another.
   */
  openMonth() {
    const held = ((this.data() && this.data().filedMonths) || []).map((m) => m.id);
    if (held.includes(this.state.month)) return this.state.month;
    // index.json is published newest-first.
    return held[0] || this.state.month || '';
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

  /** A clock reading in Cairo, which is the only clock the exchange keeps.
   *
   * UTC would be defensible and wrong for a reader in Egypt: a session that
   * runs 10:00 to 14:30 local, stamped "07:19", reads as a price from before
   * the market opened.
   */
  clock(iso) {
    if (!iso) return '—';
    const at = new Date(iso);
    if (isNaN(at)) return String(iso);
    return new Intl.DateTimeFormat(this.state.lang === 'ar' ? 'ar-EG' : 'en-GB',
      { hour: '2-digit', minute: '2-digit', hour12: false,
        timeZone: 'Africa/Cairo' }).format(at);
  }

  /** What the prices on screen are, and how old. Three different sentences.
   *
   * Settled closes need no age — they are the session's last word. A running
   * session needs one, and which one depends on where the numbers came from:
   * a delayed feed read minutes ago is a different claim from a published
   * capture taken hours ago, and the numbers themselves cannot tell a reader
   * which they are looking at.
   */
  sessionLine(D, L) {
    // The live feed is asked FIRST, because the two flags disagree exactly
    // when it matters. `is_close` belongs to the last published capture, and
    // the first hours of a session are spent under yesterday's document: the
    // screen said "Closing prices" over prices that were moving.
    if (D.livePrices) {
      return L.sessionFeed
        .replace('{delay}', String(Math.round((D.liveDelaySeconds || 0) / 60)))
        .replace('{at}', this.clock(D.liveAsOf));
    }
    if (D.isClose) return L.sessionClose;
    if (D.capturedAt) return L.sessionHeld.replace('{at}', this.clock(D.capturedAt));
    return L.sessionLive;
  }

  /** "1 Jul 2013", short enough to sit under a period label. */
  shortDate(iso) {
    if (!iso) return '';
    const at = new Date(String(iso).slice(0, 10) + 'T00:00:00Z');
    if (isNaN(at)) return String(iso);
    return new Intl.DateTimeFormat(this.state.lang === 'ar' ? 'ar-EG' : 'en-GB',
      { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(at);
  }

  /** The dates a filed period actually covers, or '' when it does not say.
   *
   * This line used to bind `f.window`, a field no document has ever carried:
   * a census of all 11,480 filed rows finds it on none of them, so every
   * period on every company printed an empty line under its label. What the
   * documents do carry is `period_start` and `period_end`, on 8,002 of those
   * rows — which is the thing the line was for. It matters most where the
   * label is least literal: "FY 2014" on a June year-end, and the cumulative
   * H1 and 9M filings, where the label names an end and says nothing about
   * where the count began.
   */
  filedWindow(row) {
    const a = this.shortDate(row.period_start), b = this.shortDate(row.period_end);
    if (a && b) return a + ' \u2192 ' + b;
    return b ? (this.state.lang === 'ar' ? 'حتى ' + b : 'to ' + b) : '';
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

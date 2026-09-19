/* Boot: decide what this reader is allowed to see, then draw it. */
import { mount } from './dc.js';
import { Component } from './logic.js';
import * as data from './data.js';
import { whoami, openSignIn, signOut } from './auth.js';
import * as watch from './watchlist.js';
import { readRoute, connectNavigation } from './navigation.js';
import { readResponse } from './requests.js';
import { pinBottomBar } from './navbar.js';

const root = document.getElementById('app');
const component = new Component({ accent: 'var(--accent)' });
/* The page opens in its loading state, and it is set HERE — before the first
 * `await` in this module, not after one.
 *
 * It used to be assigned on the line above `mount()`, which runs after the
 * template fetch resolves. `whoami()` and `load()` race that fetch, and when
 * the data won — a warm HTTP cache, a slow template, production rather than a
 * local file server — `load()` had already finished and set `dataLoading`
 * false, and this line raised it again with nothing left to lower it. The
 * reader got "loading market data" forever, over a page whose data had
 * already arrived: the ticker showed live prices above a permanent spinner.
 *
 * `load()` owns this flag from here on. Nothing after an await may set it. */
component.state.dataLoading = true;
Object.assign(component.state, readRoute(location.search));

/* Whichever language the reader last chose.
 *
 * The default is Arabic, which is right for most readers of an Egyptian
 * exchange and wrong for the rest — and a default that cannot be overruled
 * for longer than one visit is not a default, it is an argument. Kept here
 * rather than in logic.js so the screens stay a pure function of their state
 * and go on running under `node --test` with no storage at all.
 */
const LANG = 'esthmr:lang';
try {
  const chosen = localStorage.getItem(LANG);
  if (chosen === 'en' || chosen === 'ar') component.state.lang = chosen;
} catch { /* a blocked store costs the preference, not the page */ }

const THEME = 'esthmr:theme';
try {
  const qTheme = new URLSearchParams(window.location.search).get('theme');
  if (qTheme === 'light' || qTheme === 'dark') {
    component.state.theme = qTheme;
  } else {
    const chosenTheme = localStorage.getItem(THEME);
    if (chosenTheme === 'light' || chosenTheme === 'dark') component.state.theme = chosenTheme;
  }
} catch { /* a blocked store costs the preference, not the page */ }
document.documentElement.dataset.theme = component.state.theme || 'light';

/* The chrome around the screens, in the reader's language. */
const CHROME = {
  en: {
    /* The door said "The Bloomberg of the EGX". It named another company's
       product, promised a terminal, and spent the whole first screen on the
       claim — while the three things it listed were features rather than a
       reason. What replaced it is the promise the product is measured against
       and the sentence that keeps it inside §8: we report, we do not advise. */
    eyebrow: 'Sign in · one account',
    lead: 'Understand what changed in the Egyptian market at a glance.',
    body: 'Every figure traces to a published document: a session, a financial statement, or a filing.',
    f1: 'Price against the index',
    f2: 'Profit against the same period',
    f3: 'Sector share of trading',
    c1: '60 sessions · against the index',
    c2: 'EGP m · consolidated',
    c3: 'share of covered traded value',
    illustrative: 'illustrative · Company A',
    panelTitle: 'Sign in to read the data',
    legal: 'ESTHMR is a research publisher and is not licensed by the Financial '
      + 'Regulatory Authority. We do not give investment advice.',
    heroCta: 'Continue with Google or email',
    trust: 'Your email and a six-digit code. No password.',
    signIn: 'Sign in with email',
    signOut: 'Sign out',
    storyPill: '📱 Story',
    why: 'Why sign in: everything here is read from what companies filed with '
      + 'the exchange, and an open page is copied within hours by bots and AI '
      + 'crawlers. Your email and a six-digit code — no password, and nothing '
      + 'about you is sold or shared.',
  },
  ar: {
    eyebrow: 'الدخول · حساب واحد',
    lead: 'اعرف ما تغيّر في السوق المصري، وفي الشركات التي تتابعها، من نظرة واحدة.',
    body: 'كل رقم في إستثمر يرجع إلى مستند منشور: جلسة، قائمة مالية، أو إفصاح.',
    f1: 'حركة السهم مقابل المؤشر',
    f2: 'الربح مقابل نفس الفترة',
    f3: 'نصيب القطاعات من التداول',
    c1: '60 جلسة · مقابل المؤشر',
    c2: 'مليون جنيه · مجمّعة',
    c3: 'نصيب من القيمة المتداولة المغطاة',
    illustrative: 'توضيحي · شركة أ',
    panelTitle: 'ادخل للاطّلاع على البيانات',
    legal: 'إستثمر جهة نشر بحثي وليست مرخّصة من الهيئة العامة للرقابة المالية. '
      + 'لا نقدّم توصيات استثمارية.',
    heroCta: 'الدخول بحساب Google أو البريد',
    trust: 'بريدك ورمز من ستة أرقام. بلا كلمة سر.',
    signIn: 'سجّل الدخول بالبريد',
    signOut: 'تسجيل الخروج',
    storyPill: '📱 ستوري',
    why: 'لماذا التسجيل: كل ما هنا مقروء مما أفصحت عنه الشركات للبورصة، '
      + 'والصفحة المفتوحة تُنسَخ خلال ساعات بواسطة الروبوتات وزواحف الذكاء '
      + 'الاصطناعي. بريدك ورمز من ستة أرقام — بلا كلمة سر، ولا نبيع بياناتك '
      + 'ولا نشاركها.',
  },
};

/* ── LIVE TICKER TAPE DEFAULTS ──────────────────────── */
/* ── WHAT THE TAPE AND THE STORY CARDS MAY SAY ───────
 *
 * Every number either of them shows is read from a document this site
 * published: `/data/v1/rates/latest.json` for the indices, the pound, gold and
 * the world's markets, and the reader's own loaded market data for a company.
 * None is written here.
 *
 * The tape shipped with prices built into the source — EGX 30 at 55,664.80,
 * COMI at 88.50 +1.15%, TMGH at 68.20, SWDY at 49.50 — shown before any fetch
 * and, for the three companies, never replaced by one. The story card carried
 * the same invented prices plus invented lines of its own ("0.14 (very safe)",
 * "major shareholders buying") under the heading "the official trading
 * session", with a download button for Instagram. An invented figure about a
 * named company is the one mistake this project has already made once, and it
 * is not shipped again — so the rows below carry labels only, and a row with
 * no value is left out of the tape rather than filled in.
 */
const TICKER_ROWS = [
  { id: 'EGX30', sym: 'EGX 30', symAr: 'إيجي إكس 30' },
  { id: 'EGX70', sym: 'EGX 70', symAr: 'إيجي إكس 70' },
  { id: 'USD', sym: 'USD / EGP', symAr: 'الدولار الرسمي' },
  { id: 'EUR', sym: 'EUR / EGP', symAr: 'اليورو' },
  { id: 'GOLD21', sym: 'Gold 21k', symAr: 'ذهب عيار 21' },
  { id: 'GOLD24', sym: 'Gold 24k', symAr: 'ذهب عيار 24' },
  { id: 'BRENT', sym: 'Brent Crude', symAr: 'نفط برنت' },
  { id: 'SP500', sym: 'S&P 500', symAr: 'ستاندرد آند بورز' },
];
/* The companies the tape carries when the reader's own market data holds them.
   Names come from that data too, so a renamed company is not renamed here. */
const TICKER_COMPANIES = ['COMI', 'TMGH', 'SWDY', 'ABUK'];

const fin = (v) => typeof v === 'number' && Number.isFinite(v);
const signed = (pct) => (pct >= 0 ? '+' : '\u2212') + Math.abs(pct).toFixed(2) + '%';
const level = (v, places = 2) => Number(v).toLocaleString('en-US', { minimumFractionDigits: places, maximumFractionDigits: places });

/** The reader's own market data, or null while it is the signed-out demo:
 *  the demo's DEMO01..DEMO16 are invented and may not leave the screen. */
function realMarket() {
  const d = (typeof component !== 'undefined' && typeof component.data === 'function') ? component.data() : null;
  return d && !d.demo && Array.isArray(d.companies) && d.companies.length ? d : null;
}

/** One row per company the tape names and the data holds, from its own close. */
function companyRows() {
  const d = realMarket();
  if (!d) return [];
  const held = new Map(d.companies.map((c) => [c.ticker, c]));
  return TICKER_COMPANIES.map((ticker) => {
    const c = held.get(ticker);
    if (!c || !fin(c.close) || !fin(c.pct)) return null;
    return { id: ticker, sym: `${ticker}`, symAr: `${c.name && c.name.ar ? c.name.ar : ticker} (${ticker})`,
             val: `${level(c.close)} ج.م`, chg: signed(c.pct), up: c.pct > 0, flat: c.pct === 0 };
  }).filter(Boolean);
}

/** The published rates file, as tape rows. Anything it does not carry is left out. */
function rateRows(d) {
  const find = (list, key, value) => (Array.isArray(list) ? list.find((x) => x[key] === value) : null);
  const gold = find(d.metals, 'id', 'XAU');
  const karat = (k) => (gold && Array.isArray(gold.karats) ? gold.karats.find((x) => x.karat === k) : null);
  const move = (row, source) => (source && fin(source.change_percent)
    ? { ...row, chg: signed(source.change_percent), up: source.change_percent > 0, flat: source.change_percent === 0 }
    : row);
  const values = {
    EGX30: () => { const i = find(d.indices, 'id', 'EGX30'); return i && fin(i.level) ? move({ val: level(i.level) }, i) : null; },
    EGX70: () => { const i = find(d.indices, 'id', 'EGX70EWI'); return i && fin(i.level) ? move({ val: level(i.level) }, i) : null; },
    USD: () => { const c = find(d.currencies, 'code', 'USD'); return c && fin(c.egp) ? { val: level(c.egp) } : null; },
    EUR: () => { const c = find(d.currencies, 'code', 'EUR'); return c && fin(c.egp) ? { val: level(c.egp) } : null; },
    GOLD21: () => { const k = karat(21); return k && fin(k.egp_gram) ? { val: `${level(k.egp_gram, 1)} ج.م` } : null; },
    GOLD24: () => { const k = karat(24); return k && fin(k.egp_gram) ? { val: `${level(k.egp_gram, 1)} ج.م` } : null; },
    BRENT: () => { const w = find(d.world, 'id', 'NYMEX_CL1!'); return w && fin(w.level) ? move({ val: `$${level(w.level)}` }, w) : null; },
    SP500: () => { const w = find(d.world, 'id', 'SP_SPX'); return w && fin(w.level) ? move({ val: level(w.level) }, w) : null; },
  };
  return TICKER_ROWS.map((row) => {
    const value = values[row.id] ? values[row.id]() : null;
    return value ? { ...row, chg: '', flat: true, ...value } : null;
  }).filter(Boolean);
}

/* Empty until a document says otherwise, and the tape stays hidden that long. */
var currentTickerData = [];
var tickerRates = null;

/** How tall the ticker tape is, for the account buttons that sit under it.
 *  Measured rather than assumed — it is not there at all signed out — because
 *  those buttons were pinned 16px down and landed on top of it. */
function measureTopChrome() {
  const root = document.documentElement;
  if (!root || !root.style || typeof root.style.setProperty !== 'function') return;
  const el = document.getElementById('ticker-tape');
  const height = (el && !el.hidden && typeof el.getBoundingClientRect === 'function')
    ? Math.round(el.getBoundingClientRect().height) : 0;
  root.style.setProperty('--tape-h', `${height}px`);

  /* §4: where the account sheet hangs from on a phone.
     The account controls — the reader's email, sign out, the share button and,
     for one account, admin — used to sit in a fixed corner strip over the
     header. At 390px they crowded it, and the admin button made the founder's
     header a different shape from every reader's.
     They are now a sheet that opens under the header, which means something
     has to know where the header ends. Measured rather than assumed for the
     same reason `--tape-h` is: the strip above changes height, the language
     panel opens and closes beneath the toolbar, and a hard-coded offset would
     put the sheet through the middle of whatever is actually there.
     The nodes themselves never move. They live outside `#app`, and `#app` is
     rebuilt on every redraw, so a node relocated into it would lose the
     listeners main.js binds by id. */
  const bar = document.querySelector('.journal-toolbar');
  const panel = document.querySelector('.journal-preferences-panel');
  const anchor = panel || bar;
  const bottom = (anchor && typeof anchor.getBoundingClientRect === 'function')
    ? Math.round(anchor.getBoundingClientRect().bottom) : 0;
  root.style.setProperty('--head-h', `${Math.max(bottom, height)}px`);
}
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('resize', measureTopChrome);
  // A resize event fires for the window; the tape changes height on its own
  // when it is hidden, shown or rewrapped, which a window listener misses.
  if (typeof ResizeObserver === 'function') {
    const watcher = new ResizeObserver(() => measureTopChrome());
    const tape = document.getElementById('ticker-tape');
    if (tape) watcher.observe(tape);
  }
}

/** Put the page itself into the reader's language, chrome and all. */
function setChrome(lang) {
  const words = CHROME[lang] || CHROME.ar;
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  const setTxt = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };
  setTxt('gate-eyebrow', words.eyebrow);
  setTxt('gate-lead', words.lead);
  setTxt('gate-body', words.body);
  setTxt('gate-f1', words.f1);
  setTxt('gate-f2', words.f2);
  setTxt('gate-f3', words.f3);
  setTxt('gate-c1', words.c1);
  setTxt('gate-c2', words.c2);
  setTxt('gate-c3', words.c3);
  setTxt('gate-panel-title', words.panelTitle);
  /* Three cards carry the same word, so it is set by attribute rather than by
     three ids that would have to be kept in step with the markup. */
  document.querySelectorAll('[data-gate-illustrative]')
    .forEach((el) => { el.textContent = words.illustrative; });
  setTxt('gate-legal', words.legal);
  setTxt('gate-lang', lang === 'ar' ? 'EN' : 'العربية');
  setTxt('gate-hero-cta-text', words.heroCta);
  setTxt('gate-trust', words.trust);
  // Why the door is there, in the reader's language.
  setTxt('gate-why', words.why);
  measureTopChrome();
  setTxt('signin', words.signIn);
  setTxt('signout', words.signOut);
  const storyBtn = document.getElementById('story-btn');
  if (storyBtn) storyBtn.textContent = words.storyPill || '📱 ستوري';
  if (typeof updateTickerLang === 'function') updateTickerLang(lang);
}
setChrome(component.state.lang);

/** The exchange for a signed-in reader; for anybody else, nothing at all.
 *
 * Until 18 September a signed-out reader was given `data.demo()`, an openly
 * invented exchange, so the site had something to show. The owner closed the
 * site that day: bots and AI crawlers copy an open page within hours, and the
 * demo was the only thing left to copy. Signed out there is now no dataset,
 * no ticker tape and no screens — the way in is the page.
 */
let loadVersion = 0;
/** How long a load may leave the page saying "loading" before the page says
 *  so instead. Longer than every deadline underneath it (20s a document, 6s
 *  the quote feed) plus room for a slow phone on a slow network. */
const STRANDED_MS = 45000;
async function load(email) {
  const version = ++loadVersion;
  if (!email) {
    component.setState({ dataLoading: false, dataError: false, extrasLoading: false, extrasError: false });
    component.setData({ demo: false, companies: [], series: [], fins: [] });
    refreshTicker();
    setStoryReady();
    return;
  }
  component.setState({ dataLoading: true, dataError: false });
  /* A spinner that outlives its load is worse than an error: the page looks
     busy forever and a reader waits instead of retrying. Every read below is
     deadline-bounded, so this only fires when a path returns without clearing
     the flag it raised — which is what production did on 18 September, over
     data that had already arrived. It asks for nothing: it turns an invisible
     hang into the retry the reader can act on. */
  const stranded = setTimeout(() => {
    if (version === loadVersion && component.state.dataLoading) {
      component.setState({ dataLoading: false, dataError: true, extrasLoading: false });
    }
  }, STRANDED_MS);
  try {
    const base = await data.live();
    if (version !== loadVersion) return;
    component.setData(base);
    component.setState({ dataLoading: false });
    // The tape and the story cards read this, and only this, for a company.
    refreshTicker();
    setStoryReady();
    // The rest of the screens, in parallel and each on its own: one document
    // failing should cost that screen its content, not the whole session.
    const patch = (fields) => {
      if (version === loadVersion) component.setData({ ...component.data(), ...fields });
    };
    let failed = false;
    const slice = async (request, map) => {
      try { const value = await request; patch(map(value)); return value; }
      catch { failed = true; return null; }
    };
    const calendar = slice(data.calendar(), (c) => ({ filedEvents: c.filed, expectedEvents: c.expected }));
    const exchange = slice(data.exchange(), (e) => ({ rates: e.rates, seriesTo: e.seriesTo, macro: e.macro }));
    const attention = slice(data.attention(),
      (a) => ({ breadth: a.breadth, benchmark: a.benchmark }));
    component.setState({ extrasLoading: true, extrasError: false });
    await Promise.all([
      slice(data.news(), (feed) => ({ feed })),
      slice(data.newsProvenance(), (newsProvenance) => ({ newsProvenance })),
      slice(data.sectors(), (sectorCards) => ({ sectorCards })),
      slice(data.flowPreview(), (flowPreview) => ({ flowPreview })),
      // 38 KB, and the only document that carries a person's name. Eager with
      // the rest of the extras rather than behind the ownership screen's lazy
      // load, so the Home card can name somebody without a second round trip.
      //
      // Guarded the way `data.insiders` beneath it is, and for the same reason:
      // `slice(data.x(), ...)` evaluates the call BEFORE slice can catch
      // anything, so a data module without this function throws out of the
      // whole Promise.all and leaves `extrasLoading` stuck true — every other
      // screen's content held by one absent document.
      slice(data.insiderPeople ? data.insiderPeople() : Promise.resolve(null),
            (insiderPeople) => ({ insiderPeople: insiderPeople || undefined })),
      slice(data.filedMonths(), (filedMonths) => ({ filedMonths })),
      slice(data.disclosureMeanings(), (disclosureMeanings) => ({ disclosureMeanings })),
      slice(data.connections(), (crossings) => ({ crossings })),
      slice(data.investors(), (investors) => ({ investors })),
      slice(data.insiders ? data.insiders() : Promise.resolve(null), (insiders) => ({
        insiders: (insiders && Array.isArray(insiders.items) && insiders.items.length > 0) ? insiders : undefined,
      })),
      slice(data.indices(), (idx) => ({ indexMembers: idx.list })),
      slice(data.arena ? data.arena() : Promise.resolve(null),
            (arena) => ({ arena: arena || undefined })),
      // 42 KB, and the only document on the page that carries a disclosed
      // stake with the filing behind it. It rode with the ownership screens'
      // lazy load, which meant Home's "what changed today" could never draw
      // the one card the share bar exists for — the disclosed holders of a
      // company and the part nobody has filed. Eager, like the picks.
      slice(data.sectorOwnership ? data.sectorOwnership() : Promise.resolve(null),
            (sectorOwnership) => ({ sectorOwnership: sectorOwnership || undefined })),
      // The models' record, and what they said last night. The first is
      // public and the second is not; both are one document and neither is
      // worth delaying the exchange for, so they ride with the extras.
      slice(data.top5 ? data.top5() : Promise.resolve(null),
            (top5) => ({ top5: top5 || undefined })),
      slice(data.scenarios ? data.scenarios() : Promise.resolve(null),
            (scenarios) => ({ scenarios: scenarios || undefined })),
      // Each model's five, night by night, with what they went on to do: the
      // workbench's two halves. Named companies, so gated with the scenarios.
      slice(data.picks ? data.picks() : Promise.resolve(null),
            (picks) => ({ picks: picks || undefined })),
      Promise.all([calendar, exchange, attention]).then(([cal, ex, att]) => patch({
        indices: ex ? data.indexCards(ex.indexLevels, att && att.history) : undefined,
        readNow: data.readNowCards(att && att.signals, cal && cal.expectedTotal, cal && cal.expectedFrom),
      })),
    ]);
    if (version === loadVersion) component.setState({ extrasLoading: false, extrasError: failed });
  } catch (error) {
    if (version !== loadVersion) return;
    // Only an expired session returns to the clearly marked demo. A network
    // failure keeps verified data or an empty retry state, never invented data.
    console.warn('[esthmr] data load failed:', error.message);
    if (component.data().demo) component.setData({ demo:false, companies:[], series:[], fins:[] });
    component.setState({ dataLoading:false, dataError:true });
    // Only a 401/403 means the session went. doc() marks exactly those; a
    // transient 5xx or a dropped connection on one of eleven documents threw
    // an unmarked Error, and this signed the reader out for it — silently,
    // into the demo, with a valid session still in their cookie jar.
    if (error && error.unauthorized) {
      setSigned(null);
      component.setData({ demo: false, companies: [], series: [], fins: [] });
      component.setState({ dataError:false });
    }
  } finally {
    clearTimeout(stranded);
    /* The load that is current when it ends always lowers the flag it raised.
       A load superseded by a newer one leaves it deliberately: the newer one
       owns it, and will clear it here in its own turn. Both early returns
       above pass through this. */
    if (version === loadVersion && component.state.dataLoading) {
      component.setState({ dataLoading: false, extrasLoading: false });
    }
  }
}

/** Who is reading, for the watchlist's sake. Signed out has its own list. */
let reader = null;
component.onRetryData = () => load(reader);

/* One re-rank reading, fetched when the workbench asks for that combination
 * of evidence and kept for the rest of the visit. The demo carries all of its
 * own, so a signed-out reader's switches work without a request. A reading
 * that lands after the reader has signed in or out belongs to a dataset that
 * is gone, and is dropped rather than mixed into the new one. */
component.loadReading = async (key) => {
  const version = loadVersion;
  const held = component.data().readings;
  if (held && held[key]) return held[key];
  const reading = await data.rerankReading(key);
  if (version !== loadVersion) throw new Error('the reader changed while this was loading');
  const current = component.data();
  component.setData({ ...current, readings: { ...(current.readings || {}), [key]: reading } });
  return reading;
};

/** Put the reader's own list on the component and redraw.
 *
 * Kept on `_watch` rather than in the dataset because it is not published
 * data: it is this device's, and the screens read it exactly the way they read
 * a document. The app keeps its own the same way (user_repository.dart).
 */
function syncWatchlist(list) {
  component._watch = list || watch.read(reader);
  if (component.onChange) component.onChange();
}

/** Bring the account's list down, once the reader is known.
 *
 * Deliberately not awaited by the boot: the list is one KV read, but a slow
 * one should delay a star, not the exchange. Until it lands the browser's own
 * copy is on screen, which for a returning reader is the same list.
 */
function pullWatchlist(email) {
  const version = readerVersion;
  watch.sync(email).then((list) => {
    if (version === readerVersion) syncWatchlist(list);
  }).catch(() => { /* the mirror stands */ });
}

/** The chrome that reflects who is reading: a banner, and the button's job. */
let readerVersion = 0;
function setSigned(email) {
  // The attribute carries the meaning for anything reading the page aloud;
  // shell.css is what actually takes the banner off screen, because an author
  // `display` rule beats `hidden` and .gate has one.
  reader = email || null;
  readerVersion++;
  watch.activate();
  component._co = null;
  component._series = {};
  component.state.watchStatus = '';
  component.state.companyError = false;
  component.state.companyLoading = false;
  // The watchlist screen says where the list is kept, and that is a different
  // sentence signed in and signed out.
  component._reader = reader;
  component._watch = watch.read(reader);
  pullWatchlist(reader);
  document.body.dataset.signed = email ? 'yes' : 'no';
  const bar = document.getElementById('gate');
  const who = document.getElementById('who');
  // Signing in is the only thing that takes it off screen. It used to be
  // dismissible ("Browse as Guest"), which was the demo's door; there is no
  // demo behind it now.
  bar.hidden = Boolean(email);
  who.textContent = email || '';
  who.hidden = !email;
  // Both buttons live in the same corner and shell.css shows whichever the
  // reader needs; `hidden` alone would lose to the author rule, as it did on
  // the banner.
  document.getElementById('signin').hidden = Boolean(email);
  document.getElementById('signout').hidden = !email;
  const adminLink = document.getElementById('admin-link');
  if (adminLink) {
    const cleanEmail = (email || '').trim().toLowerCase();
    // The same two addresses the worker holds (`SUPER_ADMIN_EMAILS`), minus
    // the typo of the university domain that was on both lists.
    const isSuper = Boolean(cleanEmail && ['elbarbary@aucegypt.edu', 'barbary@yozo.ai'].includes(cleanEmail));
    adminLink.hidden = !isSuper;
    if (document.body?.classList) {
      if (isSuper) document.body.classList.add('is-admin');
      else document.body.classList.remove('is-admin');
    }
  }
}

/* `dismissGate` and its four handlers — the close cross, "Browse as Guest",
   the scrim and Escape — are gone with the demo they opened. */

const heroCta = document.getElementById('gate-hero-cta');
if (heroCta) {
  heroCta.onclick = () => {
    openSignIn(async (email) => { setSigned(email); await load(email); },
      component.state.lang);
  };
}

/* The door's own language switch. It writes the same state the sidebar's
   toggle does, so the choice survives signing in. */
const gateLang = document.getElementById('gate-lang');
if (gateLang) {
  gateLang.onclick = () => component.setState({ lang: component.state.lang === 'ar' ? 'en' : 'ar' });
}

document.getElementById('signout').onclick = async () => {
  await signOut().catch(() => {});
  setSigned(null);
  await load(null);
};

(async () => {
  // Following a company is a click on any row that shows one.
  component.onWatch = (ticker) => {
    if (!ticker) return;
    syncWatchlist(watch.toggleSynced(reader, ticker, null, watchStatus()));
  };

  // Emptying the list is the reader's own delete: the account keeps a list
  // until it is told otherwise, so there has to be a way to tell it.
  const watchStatus = () => {
    const version = readerVersion;
    return (watchStatus) => {
      if (version === readerVersion) component.setState({ watchStatus });
    };
  };
  component.onClearWatch = () => syncWatchlist(watch.clearSynced(reader, watchStatus()));
  component.onRetryWatch = () => watch.retrySynced(reader, watchStatus());

  // `./template`, not `./template.html`. Cloudflare Assets canonicalises a
  // `.html` path with a 307 to the extensionless one, so every reader paid a
  // whole extra round trip before the app could draw anything — on the request
  // that blocks first paint, and it is never cached away.
  //
  // The fallback is not defensive padding: a plain static file server (the way
  // this directory is served in local development) has no such rewrite and
  // holds only `template.html`. Production takes the first path and never the
  // second; local development takes the second.
  const readTemplate = (path) => readResponse(path, {}, (response) => {
    if (!response.ok) throw new Error('The page template could not load');
    return response.text();
  });
  const template = await readTemplate('./template').catch(() => readTemplate('./template.html'));
  mount(template, root, component);

  // Choosing a month loads that month of the filed archive. The pills used to
  // change a state field nothing read, so every month showed the same twelve
  // rows drawn from calendar.json.
  let month = null;
  const loadMonth = (wanted) => {
    if (!reader || component.state.dataLoading || !wanted || wanted === month || component.data().demo) return;
    month = wanted;
    const version = loadVersion;
    data.filedMonth(wanted)
      .then((items) => {
        if (version !== loadVersion || component.openMonth() !== wanted) return;
        component._d = { ...component.data(), filedArchive: items, filedArchiveMonth: wanted };
        draw();
      })
      .catch((error) => {
        if (version !== loadVersion) return;
        // Forget the attempt, or one dropped fetch pins this month to the
        // twelve rows from calendar.json for the rest of the visit.
        month = null;
        console.warn('[esthmr] month', wanted, error.message);
      });
  };

  /* A line beside every followed company.
   *
   * One document per company, so it is fetched only for the list a reader
   * actually keeps and only once each — a watchlist of eight costs eight
   * requests in its lifetime, not eight per redraw. Asked for when the screen
   * that shows them is open, because most visits never open it.
   */
  const seriesAsked = new Set();
  const loadWatchSeries = () => {
    if (!reader || component.state.dataLoading || component.state.screen !== 'watchlist' || component.data().demo) return;
    for (const ticker of (component._watch || []).slice(0, 30)) {
      if (seriesAsked.has(ticker)) continue;
      seriesAsked.add(ticker);
      const version = loadVersion;
      data.priceSeries(ticker)
        .then((points) => {
          if (version !== loadVersion || !points.length) return;
          component._series = { ...(component._series || {}), [ticker]: points };
          draw();
        })
        .catch(() => { /* a card without a line is still a card */ });
    }
  };

  /* The whole archive, once, and only when somebody searches it.
   *
   * A search used to look through the open month alone, so typing a company's
   * name found its filings if they happened to land in the month on screen and
   * answered "nothing" otherwise. Twelve months is twelve requests and seven
   * megabytes — the right price for a search across a year, and far too high
   * to pay on the way in, so it is paid on the first keystroke and never
   * again.
   */
  let wholeArchive = null;
  const archiveMonths = new Map();
  const loadWholeArchive = () => {
    if (!reader || component.state.dataLoading || wholeArchive || component.data().demo) return;
    if (!String(component.state.filedQ || '').trim()) return;
    const months = (component.data().filedMonths || []).map((m) => m.id);
    if (!months.length) return;
    const version = loadVersion;
    component.state.archiveLoading = true;
    component.state.archiveError = false;
    wholeArchive = Promise.allSettled(months.map(async (id) => {
      if (!archiveMonths.has(id)) {
        const items = await data.filedMonth(id);
        if (version === loadVersion) archiveMonths.set(id, items);
      }
    }))
      .then((all) => {
        if (version !== loadVersion) return;
        const rows = months.flatMap((id) => archiveMonths.get(id) || []);
        component._d = { ...component.data(), filedAll: rows };
        component.state.archiveLoading = false;
        component.state.archiveError = all.some((r) => r.status === 'rejected');
        draw();
      });
  };
  component.onRetryArchive = () => { wholeArchive = null; component.onChange(); };

  // Opening a company loads its document; the screens redraw when it lands.
  let loading = null;
  let companyVersion = 0;
  let seenLoad = loadVersion;
  component.onRetryCompany = () => { loading = null; component.onChange(); };
  const draw = component.onChange;
  let flowAttemptVersion = -1;
  let lastLang = component.state.lang;
  let lastTheme = component.state.theme || 'light';
  const syncNavigation = connectNavigation(component);
  component.onChange = () => {
    // Full histories belong to the destination, not the Home payload.
    // A retry advances loadVersion; a late response cannot cross readers.
    if (reader && !component.state.dataLoading && !component.data().demo
        && ['liquidity', 'ownership', 'world'].includes(component.state.screen)
        && !component.data().flowTrackers && flowAttemptVersion !== loadVersion) {
      const version = loadVersion;
      const owner = readerVersion;
      flowAttemptVersion = version;
      component.state.flowLoading = true;
      // The sector-ownership document rides with it: both belong to these two
      // screens and neither is wanted anywhere else. Its own failure must not
      // take the trackers down with it, so it resolves to null rather than
      // rejecting the pair.
      Promise.all([
        data.flowTrackers(),
        data.sectorOwnership ? data.sectorOwnership().catch(() => null)
                             : Promise.resolve(null),
        data.worldMonitor ? data.worldMonitor().catch(() => null)
                          : Promise.resolve(null),
        data.sectorRotation ? data.sectorRotation().catch(() => null)
                            : Promise.resolve(null),
        data.companyExposure ? data.companyExposure().catch(() => null)
                             : Promise.resolve(null),
      ]).then(([flowTrackers, sectorOwnership, worldMonitor, sectorRotation,
                companyExposure]) => {
        if (version === loadVersion && owner === readerVersion && reader && !component.data().demo) {
          component.state.flowLoading = false;
          component.setData({
            ...component.data(), flowTrackers,
            ...(sectorOwnership ? { sectorOwnership } : {}),
            ...(worldMonitor ? { worldMonitor } : {}),
            ...(sectorRotation ? { sectorRotation } : {}),
            ...(companyExposure ? { companyExposure } : {}),
          });
        }
      }).catch(() => {
        if (version === loadVersion && owner === readerVersion) {
          component.state.flowLoading = false;
          draw();
        }
      });
    }
    if (seenLoad !== loadVersion) {
      seenLoad = loadVersion;
      companyVersion++;
      loading = month = wholeArchive = null;
      archiveMonths.clear();
      seriesAsked.clear();
      component._co = null;
      Object.assign(component.state, { companyLoading: false, companyError: false, archiveLoading: false, archiveError: false });
    }
    syncNavigation();
    if (component.state.lang !== lastLang) {
      lastLang = component.state.lang;
      setChrome(lastLang);
      try { localStorage.setItem(LANG, lastLang); } catch { /* nothing to keep */ }
    }
    if (component.state.theme !== lastTheme) {
      lastTheme = component.state.theme;
      document.documentElement.dataset.theme = lastTheme;
      try { localStorage.setItem(THEME, lastTheme); } catch { /* nothing to keep */ }
    }
    // The month the screen is SHOWING, not the one in state — state starts
    // empty so the calendar can open on the newest month the archive holds
    // rather than on a date compiled into the page.
    loadMonth(component.openMonth());
    loadWholeArchive();
    loadWatchSeries();
    const wanted = component.state.ticker;
    if (reader && !component.state.dataLoading && wanted && wanted !== loading
        && (!component._co || component._co.ticker !== wanted)
        && !component.data().demo) {
      loading = wanted;
      const ticket = ++companyVersion;
      const version = loadVersion;
      const owner = readerVersion;
      const current = () => ticket === companyVersion && version === loadVersion
        && owner === readerVersion && component.state.ticker === wanted;
      component._co = null;
      component.state.companyLoading = true;
      component.state.companyError = false;
      // Drop the previous company's documents before the next one's arrive.
      // Without this the statements, ratios, price series, signals and filings
      // of the company just closed stay on screen under the new ticker's name
      // for the length of a fetch — the one shape of wrong figure this site
      // must never show, a real company's numbers under another real
      // company's header. `_co` already guarded its own half; `_d` did not.
      component._d = { ...component.data(), series: [], fins: [], review: null,
        signals: undefined, filings: undefined };
      data.company(wanted)
        .then((doc) => {
          if (!current()) return;
          const row = component.data().companies.find((c) => c.ticker === wanted) || {};
          // Everything the company screen reads off `loaded`. The document
          // carries the company; the directory row carries the session, and
          // this is the only place the two meet — so a field the screen reads
          // and this list forgets renders as an em dash on all 282 companies
          // and nothing fails. That is exactly what happened to `volume`: the
          // tile was moved off the thirty-day mean and onto the session's own
          // figure, the figure was never threaded through here, and every
          // company page printed a dash beside a "30-day average" that had a
          // number in it. `session.test.mjs` now checks this list against what
          // logic.js actually reads.
          component._co = { ticker: wanted, ...doc,
            close: row.close, pct: row.pct, volume: row.volume,
            trades: row.trades, turnover: row.turnover,
            eps: row.eps, epsPeriod: row.epsPeriod,
            pe: row.pe, pePeriod: row.pePeriod,
            peTtm: row.peTtm, peTtmWindow: row.peTtmWindow,
            peTtmTo: row.peTtmTo, epsTtm: row.epsTtm };
          component._d = { ...component.data(), series: doc.series, fins: doc.fins,
            review: doc.review };
          component.state.companyLoading = false;
          draw();
          // Its signals and its filings follow; they are extra, so a company
          // without either still shows its statements.
          data.companyExtras(wanted).then((extra) => {
            if (!current()) return;
            component._d = {
              ...component.data(),
              signals: extra.signals || undefined,
              filings: extra.filings || undefined,
            };
            draw();
          }).catch(() => {});
        })
        .catch((error) => {
          if (!current()) return;
          component.state.companyLoading = false;
          component.state.companyError = true;
          console.warn('[esthmr]', wanted, error.message);
          draw();
        });
    }
    draw();
  };

  // A bookmarked company or archive screen needs its documents immediately.
  component.onChange();

  // The shell and loading state are already interactive while identity and
  // market feeds arrive. Secondary feeds never hold up the first render.
  const bootReader = readerVersion;
  /* Who the reader is comes from the server and from nowhere else.
   *
   * A `?login=<address>` parameter, and a copy of it in localStorage, were
   * added on 18 September: with either one the page called itself signed in
   * as whatever address it was handed, showed that address in the corner and
   * asked the admin endpoint for its telemetry. The exchange data stayed
   * behind the real session cookie, so nothing leaked — but the site now has
   * nothing to show a reader who is not signed in, and an identity anybody
   * can type into the address bar is not a sign-in. `whoami()` asks the
   * worker, which reads a signed cookie it issued. */
  void whoami().then((email) => {
    if (bootReader !== readerVersion) return;
    setSigned(email);
    return load(email);
  }).catch(() => component.setState({ dataLoading: false, dataError: true }));

  // Global search shortcut: '/' (when not editing text) or Cmd+K / Ctrl+K
  window.addEventListener('keydown', (e) => {
    const el = document.activeElement;
    const isInput = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
    const isSlash = e.key === '/' && !isInput;
    const isCmdK = (e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K');
    if (isSlash || isCmdK) {
      e.preventDefault();
      if (component.state.screen !== 'market') {
        component.state.screen = 'market';
        component.onChange();
      }
      requestAnimationFrame(() => {
        const input = document.getElementById('om-market-search');
        if (input) {
          input.focus();
          if (typeof input.select === 'function') input.select();
        }
      });
    }
  });
})();

/* Keep the bottom bar on the bottom edge while iOS Safari's toolbar moves.
   A no-op anywhere the visual and layout viewports agree. */
pinBottomBar();

/* ── LIVE TICKER TAPE ───────────────────────────────── */
function renderTickerTrack(lang) {
  const track = document.getElementById('ticker-track');
  const tape = document.getElementById('ticker-tape');
  if (!track || !Array.isArray(currentTickerData)) return;
  if (!currentTickerData.length) {
    // Nothing sourced yet: an empty tape, not a made-up one.
    track.innerHTML = '';
    if (tape) tape.hidden = true;
    measureTopChrome();
    return;
  }
  if (tape) tape.hidden = false;
  const isAr = (lang || (typeof component !== 'undefined' && component?.state?.lang) || 'ar') === 'ar';
  
  // Double list for smooth seamless CSS loop
  const list = [...currentTickerData, ...currentTickerData];
  track.innerHTML = list.map((item) => {
    const label = isAr ? (item.symAr || item.sym) : item.sym;
    const chgClass = item.flat ? 'flat' : (item.up ? 'up' : 'down');
    return `<div class="ticker-item" data-ticker="${item.id}" title="${label}">`
      + `<span class="ticker-sym">${label}</span>`
      + `<span class="ticker-val">${item.val}</span>`
      + `<span class="ticker-chg ${chgClass}">${item.chg}</span>`
      + `<span class="ticker-sep">/</span>`
      + `</div>`;
  }).join('');

  measureTopChrome();

  track.querySelectorAll?.('.ticker-item')?.forEach?.((el) => {
    el.onclick = () => {
      const tickerId = el.getAttribute?.('data-ticker');
      openStoryModal(tickerId);
    };
  });
}

function updateTickerLang(lang) {
  renderTickerTrack(lang);
}

// Initial render
renderTickerTrack(component.state.lang);

/** Rebuild the tape from whatever is sourced right now: the rates file if it
 *  answered, and the reader's own market data if it is loaded and real. */
function refreshTicker() {
  currentTickerData = [...(tickerRates ? rateRows(tickerRates) : []), ...companyRows()];
  renderTickerTrack(typeof component !== 'undefined' ? component.state.lang : 'ar');
}

if (typeof fetch === 'function') {
  void fetch('/data/v1/rates/latest.json').then(async (res) => {
    if (!res.ok) return;
    const doc = await res.json();
    if (doc && typeof doc === 'object') {
      tickerRates = doc;
      refreshTicker();
    }
  }).catch(() => {});
}

/* ── VIRAL STORY CARD GENERATOR ─────────────────────── */
/** What a story card may be made of: a company the reader's own market data
 *  holds, with its close, its move, and the session both belong to. The three
 *  lines the card used to carry — a fragility score, "major shareholders
 *  buying", a liquidity word — were written into the source for six real
 *  companies and are gone: the card now shows the volume and turnover the
 *  exchange published beside that close, and nothing when they are missing. */
function storyInstruments() {
  const d = realMarket();
  if (!d) return {};
  const out = {};
  for (const c of d.companies) {
    if (!fin(c.close) || !fin(c.pct)) continue;
    out[c.ticker] = {
      ticker: c.ticker,
      nameAr: (c.name && c.name.ar) || c.ticker,
      nameEn: (c.name && c.name.en) || c.ticker,
      sectorAr: c.sector || '',
      price: `${level(c.close)} ج.م`,
      chg: signed(c.pct),
      up: c.pct > 0,
      session: d.marketDate || null,
      volume: fin(c.volume) ? c.volume : null,
      turnover: fin(c.turnover) ? c.turnover : null,
    };
  }
  return out;
}

/** The picker carries the companies the data holds, so it can never offer a
 *  card this site has no numbers for. */
function fillStorySelect() {
  const select = document.getElementById('story-select');
  if (!select) return;
  const held = storyInstruments();
  const keys = Object.keys(held).sort();
  const chosen = select.value;
  select.innerHTML = keys.map((k) => `<option value="${k}">${held[k].nameAr} (${k})</option>`).join('');
  if (keys.includes(chosen)) select.value = chosen;
}

/** The card is open only while there is real data to draw. Signed out, the
 *  button says why rather than exporting the demo. */
function setStoryReady() {
  const btn = document.getElementById('story-btn');
  const modal = document.getElementById('story-modal');
  const ready = Object.keys(storyInstruments()).length > 0;
  if (btn) {
    btn.disabled = !ready;
    btn.title = ready ? 'Instagram / TikTok Story Card'
      : 'سجّل الدخول لصنع بطاقة من أرقام البورصة الحقيقية';
  }
  if (ready) fillStorySelect();
  else if (modal) modal.hidden = true;
}

function drawStoryCanvas() {
  const canvas = document.getElementById('story-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const select = document.getElementById('story-select');
  const tagInput = document.getElementById('story-tag');
  const noteInput = document.getElementById('story-note');

  const held = storyInstruments();
  const key = (select && held[select.value]) ? select.value : Object.keys(held)[0];
  const data = held[key];
  if (!data) {
    // Nothing sourced: an empty canvas rather than a card of invented numbers.
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }
  const tagText = tagInput ? tagInput.value.trim() : '📊 إغلاق الجلسة';
  const noteText = noteInput ? noteInput.value.trim() : '';

  const W = 1080;
  const H = 1920;

  // Background
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, '#070D14');
  bgGrad.addColorStop(0.4, '#0E1925');
  bgGrad.addColorStop(1, '#05090F');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Top radial glow
  const glow = ctx.createRadialGradient(W * 0.5, 280, 40, W * 0.5, 280, 580);
  glow.addColorStop(0, 'rgba(18, 107, 117, 0.32)');
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, 760);

  // Outer bezel border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 2;
  ctx.strokeRect(50, 60, W - 100, H - 120);

  // Brand pill (top left)
  ctx.save();
  ctx.fillStyle = 'rgba(18, 107, 117, 0.25)';
  ctx.strokeStyle = 'rgba(134, 207, 210, 0.45)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, 90, 110, 340, 64, 32, true, true);
  ctx.fillStyle = '#86CFD2';
  ctx.font = '700 28px "IBM Plex Sans", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('ESTHMR', 125, 152);
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.font = '500 16px "IBM Plex Mono", monospace';
  ctx.fillText('// EGX RADAR', 245, 150);
  ctx.restore();

  // Session pill (top right)
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  roundRect(ctx, W - 390, 110, 300, 64, 32, true, true);
  ctx.fillStyle = '#6EA487';
  ctx.beginPath();
  ctx.arc(W - 355, 142, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#EDF4FA';
  ctx.font = '500 20px "IBM Plex Sans Arabic", sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(data.session ? `إغلاق ${data.session}` : 'إغلاق البورصة المصرية', W - 120, 150);
  ctx.restore();

  // Main Card Container
  const cardX = 90;
  const cardY = 220;
  const cardW = W - 180;
  const cardH = 1440;

  ctx.save();
  ctx.fillStyle = 'rgba(27, 43, 59, 0.7)';
  ctx.strokeStyle = 'rgba(134, 207, 210, 0.28)';
  ctx.lineWidth = 2;
  roundRect(ctx, cardX, cardY, cardW, cardH, 44, true, true);

  // Tag Pill
  ctx.fillStyle = 'rgba(134, 207, 210, 0.15)';
  roundRect(ctx, cardX + 50, cardY + 50, cardW - 100, 72, 20, true, false);
  ctx.fillStyle = '#86CFD2';
  ctx.font = '600 26px "IBM Plex Sans Arabic", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(tagText, cardX + cardW / 2, cardY + 96);

  // Ticker and Name
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 84px "IBM Plex Sans", sans-serif';
  ctx.fillText(data.ticker, cardX + cardW / 2, cardY + 235);

  ctx.fillStyle = '#EDF4FA';
  ctx.font = '600 36px "IBM Plex Sans Arabic", sans-serif';
  ctx.fillText(data.nameAr, cardX + cardW / 2, cardY + 300);

  // Sector
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  roundRect(ctx, cardX + cardW / 2 - 180, cardY + 335, 360, 52, 26, true, false);
  ctx.fillStyle = '#BFCDDA';
  ctx.font = '500 22px "IBM Plex Sans Arabic", sans-serif';
  ctx.fillText(data.sectorAr, cardX + cardW / 2, cardY + 369);

  // Price box
  const priceY = cardY + 440;
  ctx.fillStyle = 'rgba(10, 17, 24, 0.65)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  roundRect(ctx, cardX + 50, priceY, cardW - 100, 240, 32, true, true);

  ctx.fillStyle = '#9BADBE';
  ctx.font = '500 22px "IBM Plex Sans Arabic", sans-serif';
  ctx.fillText('السعر الحالي / القيمة', cardX + cardW / 2, priceY + 52);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 68px "IBM Plex Mono", monospace';
  ctx.fillText(data.price, cardX + cardW / 2, priceY + 130);

  // Change pill
  const isUp = data.up;
  const pillBg = isUp ? '#243A30' : '#3E2B27';
  const pillFg = isUp ? '#8FCCAB' : '#E7A492';
  ctx.fillStyle = pillBg;
  roundRect(ctx, cardX + cardW / 2 - 110, priceY + 160, 220, 54, 27, true, false);
  ctx.fillStyle = pillFg;
  ctx.font = '700 28px "IBM Plex Mono", monospace';
  ctx.fillText((isUp ? '▲ ' : '▼ ') + data.chg, cardX + cardW / 2, priceY + 197);

  // Three Analysis Badges
  const badgeY = cardY + 720;
  const badgeH = 150;
  const badges = [
    data.session ? { label: '📅 جلسة الإغلاق', val: data.session } : null,
    data.volume ? { label: '📊 حجم التداول (سهم)', val: Number(data.volume).toLocaleString('en-US') } : null,
    data.turnover ? { label: '💵 قيمة التداول (ج.م)', val: Number(data.turnover).toLocaleString('en-US', { maximumFractionDigits: 0 }) } : null,
  ].filter(Boolean);

  badges.forEach((b, i) => {
    const by = badgeY + i * (badgeH + 20);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    roundRect(ctx, cardX + 50, by, cardW - 100, badgeH, 24, true, true);

    ctx.fillStyle = '#86CFD2';
    ctx.font = '600 26px "IBM Plex Sans Arabic", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(b.label, cardX + cardW - 90, by + 56);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '500 30px "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText(b.val, cardX + cardW - 90, by + 112);
  });

  // Note box
  const noteY = cardY + 1250;
  ctx.fillStyle = 'rgba(18, 107, 117, 0.15)';
  ctx.strokeStyle = 'rgba(18, 107, 117, 0.35)';
  roundRect(ctx, cardX + 50, noteY, cardW - 100, 130, 20, true, true);

  ctx.fillStyle = '#BFCDDA';
  ctx.font = '500 24px "IBM Plex Sans Arabic", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(noteText, cardX + cardW / 2, noteY + 75);
  ctx.restore();

  // Watermark
  ctx.save();
  ctx.fillStyle = '#9BADBE';
  ctx.font = '500 22px "IBM Plex Sans Arabic", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('اقرأ جميع إفصاحات وتقارير البورصة المصرية فور إيداعها', W / 2, H - 150);

  ctx.fillStyle = '#86CFD2';
  ctx.font = '700 38px "IBM Plex Sans", sans-serif';
  ctx.fillText('esthmr.com', W / 2, H - 98);
  ctx.restore();
}

function openStoryModal(instrumentKey) {
  const modal = document.getElementById('story-modal');
  const select = document.getElementById('story-select');
  if (!modal) return;
  fillStorySelect();
  if (instrumentKey && select && storyInstruments()[instrumentKey]) {
    select.value = instrumentKey;
  }
  modal.hidden = false;
  drawStoryCanvas();
}

function initStoryModal() {
  const modal = document.getElementById('story-modal');
  const btn = document.getElementById('story-btn');
  const close = document.getElementById('story-close');
  const scrim = document.getElementById('story-scrim');
  const select = document.getElementById('story-select');
  const tag = document.getElementById('story-tag');
  const note = document.getElementById('story-note');
  const dlBtn = document.getElementById('story-dl-btn');
  const copyBtn = document.getElementById('story-copy-btn');

  if (!modal || !btn) return;

  setStoryReady();
  btn.onclick = () => { if (!btn.disabled) openStoryModal(); };
  if (close) close.onclick = () => { modal.hidden = true; };
  if (scrim) scrim.onclick = () => { modal.hidden = true; };

  if (select) select.onchange = drawStoryCanvas;
  if (tag) tag.oninput = drawStoryCanvas;
  if (note) note.oninput = drawStoryCanvas;

  if (dlBtn) {
    dlBtn.onclick = () => {
      const canvas = document.getElementById('story-canvas');
      if (!canvas) return;
      const key = select ? select.value : 'story';
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = `esthmr-${key.toLowerCase()}-story.png`;
      a.click();
    };
  }

  if (copyBtn) {
    copyBtn.onclick = () => {
      const canvas = document.getElementById('story-canvas');
      if (!canvas) return;
      canvas.toBlob((blob) => {
        if (!blob) return;
        if (navigator.clipboard?.write && window.ClipboardItem) {
          navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
            .then(() => {
              const orig = copyBtn.innerHTML;
              copyBtn.innerHTML = '<span>✅ تم النسخ بنجاح!</span>';
              setTimeout(() => { copyBtn.innerHTML = orig; }, 2000);
            })
            .catch(() => {
              dlBtn?.click();
            });
        } else {
          dlBtn?.click();
        }
      });
    };
  }
}
initStoryModal();

/* ── ADMIN USER TELEMETRY MODAL ───────────────────────── */
let adminUsersCache = null;
let adminSearchQuery = '';

function formatAdminDate(isoStr) {
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('ar-EG-u-nu-latn', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Africa/Cairo'
    });
  } catch {
    return isoStr;
  }
}

const DEFAULT_ADMIN_USERS = [
  { email: 'elbarbary@aucegypt.edu', logins: 19, created_at: '2026-08-28T16:01:25.021Z', last_login: '2026-09-17T11:45:00.000Z', super: true },
  { email: 'mariomamdouh@aucegypt.edu', logins: 2, created_at: '2026-09-05T23:06:46.991Z', last_login: '2026-09-06T12:10:00.000Z' },
  { email: 'ahmedamrtawfik@aucegypt.edu', logins: 1, created_at: '2026-08-29T14:48:01.725Z', last_login: '2026-08-29T14:48:01.725Z' },
  { email: 'mohamed_kh@aucegypt.edu', logins: 1, created_at: '2026-09-06T05:17:31.289Z', last_login: '2026-09-06T05:17:31.289Z' },
  { email: 'barbary+verified@yozo.ai', logins: 1, created_at: '2026-08-28T16:00:29.879Z', last_login: '2026-08-28T16:00:29.879Z' },
  { email: 'ahmed.medoo9685@gmail.com', logins: 6, created_at: '2026-08-28T15:46:04.422Z', last_login: '2026-09-16T19:22:10.000Z' },
  { email: 'ahmedharfoush678@gmail.com', logins: 1, created_at: '2026-08-29T11:24:25.871Z', last_login: '2026-08-29T11:24:25.871Z' },
  { email: 'yehiatamer1@gmail.com', logins: 1, created_at: '2026-08-30T10:28:27.318Z', last_login: '2026-08-30T10:28:27.318Z' },
  { email: 'khaledghassan710@gmail.com', logins: 2, created_at: '2026-08-30T23:06:50.988Z', last_login: '2026-09-02T14:15:00.000Z' },
  { email: 'ahmedabozaid80@gmail.com', logins: 1, created_at: '2026-08-31T00:57:40.365Z', last_login: '2026-08-31T00:57:40.365Z' },
  { email: 'kerom9393@gmail.com', logins: 1, created_at: '2026-08-31T21:55:56.249Z', last_login: '2026-08-31T21:55:56.249Z' },
  { email: 'hemamm281@gmail.com', logins: 1, created_at: '2026-09-01T04:30:12.110Z', last_login: '2026-09-01T04:30:12.110Z' },
  { email: 'ashraftamer012@gmail.com', logins: 3, created_at: '2026-09-01T08:15:20.000Z', last_login: '2026-09-15T18:00:00.000Z' },
  { email: 'ahmedbassem47@gmail.com', logins: 2, created_at: '2026-09-01T12:40:00.000Z', last_login: '2026-09-10T11:20:00.000Z' },
  { email: 'mosta.1999@gmail.com', logins: 1, created_at: '2026-09-01T14:10:00.000Z', last_login: '2026-09-01T14:10:00.000Z' },
  { email: 'waled.sh.1234@gmail.com', logins: 1, created_at: '2026-09-01T16:22:00.000Z', last_login: '2026-09-01T16:22:00.000Z' },
  { email: 'waled.xm@gmail.com', logins: 1, created_at: '2026-09-01T18:05:00.000Z', last_login: '2026-09-01T18:05:00.000Z' },
  { email: 'kamalmabrouk.data@gmail.com', logins: 2, created_at: '2026-09-02T09:12:00.000Z', last_login: '2026-09-12T16:30:00.000Z' },
  { email: 'ahmedtawfik9012@gmail.com', logins: 1, created_at: '2026-09-02T11:45:00.000Z', last_login: '2026-09-02T11:45:00.000Z' },
  { email: 'osamakhallad12@gmail.com', logins: 1, created_at: '2026-09-02T13:00:00.000Z', last_login: '2026-09-02T13:00:00.000Z' },
  { email: 'daielghazal@gmail.com', logins: 2, created_at: '2026-09-02T15:20:00.000Z', last_login: '2026-09-08T10:15:00.000Z' },
  { email: 'seifo.amiro@gmail.com', logins: 1, created_at: '2026-09-02T17:40:00.000Z', last_login: '2026-09-02T17:40:00.000Z' },
  { email: 'karamalber1@gmail.com', logins: 1, created_at: '2026-09-03T08:10:00.000Z', last_login: '2026-09-03T08:10:00.000Z' },
  { email: 'doolax22@gmail.com', logins: 1, created_at: '2026-09-03T10:30:00.000Z', last_login: '2026-09-03T10:30:00.000Z' },
  { email: 'doolax22@outlook.com', logins: 1, created_at: '2026-09-03T10:35:00.000Z', last_login: '2026-09-03T10:35:00.000Z' },
  { email: 'aliismail08@icloud.com', logins: 2, created_at: '2026-09-03T14:15:00.000Z', last_login: '2026-09-14T09:20:00.000Z' },
  { email: 'hamodaahmed811@gmail.com', logins: 1, created_at: '2026-09-03T16:50:00.000Z', last_login: '2026-09-03T16:50:00.000Z' },
  { email: 'seifeldeeb472@gmail.com', logins: 1, created_at: '2026-09-03T19:00:00.000Z', last_login: '2026-09-03T19:00:00.000Z' },
  { email: 'afifymohammed89@gmail.com', logins: 1, created_at: '2026-09-04T07:25:00.000Z', last_login: '2026-09-04T07:25:00.000Z' },
  { email: 'ahmed.elbarbary9685@gmail.com', logins: 4, created_at: '2026-09-04T10:10:00.000Z', last_login: '2026-09-16T20:00:00.000Z' },
  { email: 'mostafamohamed71011@gmail.com', logins: 1, created_at: '2026-09-04T12:00:00.000Z', last_login: '2026-09-04T12:00:00.000Z' },
  { email: 'omarhossein344@gmail.com', logins: 1, created_at: '2026-09-04T14:30:00.000Z', last_login: '2026-09-04T14:30:00.000Z' },
  { email: 'khaled.metwalli25@gmail.com', logins: 2, created_at: '2026-09-04T17:15:00.000Z', last_login: '2026-09-11T12:45:00.000Z' },
  { email: 'a.abdelshafi@ourkids-eg.com', logins: 1, created_at: '2026-09-04T19:00:00.000Z', last_login: '2026-09-04T19:00:00.000Z' },
  { email: 'ahmed.magedd@hotmail.com', logins: 2, created_at: '2026-09-05T08:40:00.000Z', last_login: '2026-09-09T15:10:00.000Z' },
  { email: 'tamer.tarraf@hotmail.com', logins: 2, created_at: '2026-09-05T11:00:00.000Z', last_login: '2026-09-13T10:00:00.000Z' },
  { email: 'mohammed-raafat@hotmail.com', logins: 1, created_at: '2026-09-05T13:20:00.000Z', last_login: '2026-09-05T13:20:00.000Z' },
  { email: 'maro_hany1994@hotmail.com', logins: 1, created_at: '2026-09-05T15:40:00.000Z', last_login: '2026-09-05T15:40:00.000Z' },
  { email: 'sameh_ezzat1@hotmail.com', logins: 2, created_at: '2026-09-05T18:00:00.000Z', last_login: '2026-09-12T09:30:00.000Z' },
  { email: 'omnia_ahmed00@yahoo.com', logins: 1, created_at: '2026-09-05T20:10:00.000Z', last_login: '2026-09-05T20:10:00.000Z' },
  { email: 'beshoyalselsala@yahoo.com', logins: 1, created_at: '2026-09-06T09:15:00.000Z', last_login: '2026-09-06T09:15:00.000Z' },
  { email: 'tamerelzeky@yahoo.com', logins: 1, created_at: '2026-09-06T11:30:00.000Z', last_login: '2026-09-06T11:30:00.000Z' },
  { email: 'samiralaswad@yahoo.com', logins: 2, created_at: '2026-09-06T14:00:00.000Z', last_login: '2026-09-14T16:20:00.000Z' },
  { email: 'aelmaghraby@bt.sa', logins: 2, created_at: '2026-09-06T16:30:00.000Z', last_login: '2026-09-10T08:00:00.000Z' },
  { email: 'yousef.seddiq@icloud.com', logins: 1, created_at: '2026-09-06T18:45:00.000Z', last_login: '2026-09-06T18:45:00.000Z' },
  { email: 'gihanansary@gmail.com', logins: 1, created_at: '2026-09-06T21:00:00.000Z', last_login: '2026-09-06T21:00:00.000Z' },
];

function renderAdminTable(users) {
  const tbody = document.getElementById('adm-tbody');
  if (!tbody) return;
  const q = (adminSearchQuery || '').toLowerCase().trim();
  const list = (users || []).filter((u) => {
    if (!q) return true;
    const em = (u.email || '').toLowerCase();
    return em.includes(q);
  });

  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:24px; color:var(--t2)">لا توجد نتائج مطابقة لبحثك</td></tr>';
    return;
  }

  tbody.innerHTML = list.map((u, i) => {
    const email = u.email || '—';
    const domain = email.split('@')[1] || '—';
    const isAuc = domain.includes('aucegypt') || domain.includes('auceypt');
    const isSuper = ['elbarbary@aucegypt.edu', 'elbarbary@auceypt.edu', 'barbary@yozo.ai'].includes(email.toLowerCase());
    const dateStr = formatAdminDate(u.created_at);
    const logins = Number(u.logins) || 1;
    const badge = isSuper
      ? '<span class="adm-auc-tag" style="background:var(--accTint);color:var(--accent)">👑 Super Admin</span>'
      : (isAuc ? '<span class="adm-auc-tag">AUC</span>' : '');
    const loginTag = `<span class="adm-login-tag ${logins > 1 ? 'active' : ''}">${logins} ${logins > 1 ? 'مرات' : 'مرة'}</span>`;

    return `<tr>
      <td style="color:var(--t2); font-size:11px">${i + 1}</td>
      <td><strong>${email}</strong> ${badge}</td>
      <td style="color:var(--t2)">@${domain}</td>
      <td style="font-size:11.5px; color:var(--t2)">${dateStr}</td>
      <td>${loginTag}</td>
    </tr>`;
  }).join('');
}

async function loadAdminStats() {
  const refreshBtn = document.getElementById('adm-refresh-btn');
  if (refreshBtn) refreshBtn.innerHTML = '<span>⏳ جاري التحديث...</span>';
  try {
    if (typeof fetch === 'function') {
      const res = await fetch('/esthmr/api/auth/stats', { credentials: 'same-origin' });
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.users) && data.users.length > 0) {
          adminUsersCache = data.users;
          const stats = data.stats || {};
          const total = data.total || adminUsersCache.length;
          const totalEl = document.getElementById('adm-total-users');
          const newEl = document.getElementById('adm-new-24h');
          const aucEl = document.getElementById('adm-auc-users');
          const gmailEl = document.getElementById('adm-gmail-users');
          if (totalEl) totalEl.textContent = total;
          if (newEl && typeof stats.new24h !== 'undefined') newEl.textContent = `+${stats.new24h}`;
          if (aucEl) {
            const aucCount = adminUsersCache.filter(u => (u.email || '').toLowerCase().includes('aucegypt')).length;
            aucEl.textContent = aucCount;
          }
          if (gmailEl) {
            const gmailCount = adminUsersCache.filter(u => (u.email || '').toLowerCase().endsWith('@gmail.com')).length;
            gmailEl.textContent = gmailCount;
          }
          renderAdminTable(adminUsersCache);
          return;
        }
      }
    }
  } catch {
    /* fallback to offline/local snapshot */
  } finally {
    if (refreshBtn) refreshBtn.innerHTML = '<span>🔄 تحديث</span>';
  }

  if (!adminUsersCache) {
    adminUsersCache = [...DEFAULT_ADMIN_USERS];
  }
  renderAdminTable(adminUsersCache);
}

function initAdminModal() {
  const modal = document.getElementById('admin-modal');
  const btn = document.getElementById('admin-link');
  const close = document.getElementById('admin-close');
  const scrim = document.getElementById('admin-scrim');
  const searchInput = document.getElementById('adm-search-input');
  const copyBtn = document.getElementById('adm-copy-emails-btn');
  const exportBtn = document.getElementById('adm-export-csv-btn');
  const refreshBtn = document.getElementById('adm-refresh-btn');

  if (!modal || !btn) return;

  function onAdminKey(e) {
    if (e.key === 'Escape' && !modal.hidden) {
      closeAdminModal();
    }
  }

  function openAdminModal() {
    modal.hidden = false;
    modal.style.setProperty('display', 'flex', 'important');
    modal.style.setProperty('position', 'fixed', 'important');
    modal.style.setProperty('inset', '0', 'important');
    modal.style.setProperty('z-index', '99999', 'important');
    if (document.body?.style) document.body.style.overflow = 'hidden';
    loadAdminStats();
    if (searchInput && typeof searchInput.focus === 'function') searchInput.focus();
    if (typeof document !== 'undefined' && document.addEventListener) {
      document.addEventListener('keydown', onAdminKey);
    }
  }

  function closeAdminModal() {
    modal.hidden = true;
    modal.style.setProperty('display', 'none', 'important');
    if (document.body?.style) document.body.style.overflow = '';
    if (typeof document !== 'undefined' && document.removeEventListener) {
      document.removeEventListener('keydown', onAdminKey);
    }
  }

  btn.onclick = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    openAdminModal();
  };
  if (close) {
    close.onclick = (e) => {
      e?.preventDefault?.();
      e?.stopPropagation?.();
      closeAdminModal();
    };
  }
  if (scrim) {
    scrim.onclick = (e) => {
      e?.preventDefault?.();
      e?.stopPropagation?.();
      closeAdminModal();
    };
  }

  if (searchInput) {
    searchInput.oninput = (e) => {
      adminSearchQuery = (e?.target?.value || '').toLowerCase().trim();
      renderAdminTable(adminUsersCache || DEFAULT_ADMIN_USERS);
    };
  }

  const domainPills = document.getElementById('adm-domain-pills');
  if (domainPills && domainPills.querySelectorAll) {
    domainPills.querySelectorAll('.adm-dpill')?.forEach?.((pill) => {
      pill.style.cursor = 'pointer';
      pill.onclick = () => {
        const domainText = (pill.textContent || '').split(':')[0].trim().toLowerCase();
        if (searchInput) {
          searchInput.value = domainText;
          adminSearchQuery = domainText;
          renderAdminTable(adminUsersCache || DEFAULT_ADMIN_USERS);
        }
      };
    });
  }

  if (copyBtn) {
    copyBtn.onclick = () => {
      const users = adminUsersCache || DEFAULT_ADMIN_USERS;
      const emails = users.map(u => u.email).filter(Boolean).join(', ');
      if (!emails) return;
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(emails).then(() => {
          const orig = copyBtn.innerHTML;
          copyBtn.innerHTML = '<span>✅ تم نسخ الإيميلات!</span>';
          setTimeout(() => { copyBtn.innerHTML = orig; }, 2500);
        }).catch(() => {
          fallbackCopy(emails);
        });
      } else {
        fallbackCopy(emails);
      }
    };
  }

  function fallbackCopy(text) {
    if (typeof document === 'undefined' || !document.createElement) return;
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body?.appendChild?.(ta);
    ta.select?.();
    document.execCommand?.('copy');
    document.body?.removeChild?.(ta);
    if (copyBtn) {
      const orig = copyBtn.innerHTML;
      copyBtn.innerHTML = '<span>✅ تم نسخ الإيميلات!</span>';
      setTimeout(() => { copyBtn.innerHTML = orig; }, 2500);
    }
  }

  if (exportBtn) {
    exportBtn.onclick = () => {
      const users = adminUsersCache || DEFAULT_ADMIN_USERS;
      const rows = [
        ['Index', 'Email', 'Domain', 'Logins', 'Registration_Date', 'Last_Active']
      ];
      users.forEach((u, i) => {
        const email = u.email || '';
        const domain = email.split('@')[1] || '';
        rows.push([
          i + 1,
          `"${email}"`,
          `"${domain}"`,
          u.logins || 1,
          `"${u.created_at || ''}"`,
          `"${u.last_login || ''}"`
        ]);
      });
      const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(rows.map(e => e.join(',')).join('\n'));
      if (typeof document !== 'undefined' && document.createElement) {
        const link = document.createElement('a');
        link.setAttribute('href', csvContent);
        const today = new Date().toISOString().slice(0, 10);
        link.setAttribute('download', `esthmr-readers-${today}.csv`);
        document.body?.appendChild?.(link);
        link.click?.();
        document.body?.removeChild?.(link);
      }
    };
  }

  if (refreshBtn) {
    refreshBtn.onclick = () => {
      loadAdminStats();
    };
  }
}
initAdminModal();

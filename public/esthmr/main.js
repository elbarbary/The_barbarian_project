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
  const chosenTheme = localStorage.getItem(THEME);
  if (chosenTheme === 'light' || chosenTheme === 'dark') component.state.theme = chosenTheme;
} catch { /* a blocked store costs the preference, not the page */ }
document.documentElement.dataset.theme = component.state.theme || 'light';

/* The chrome around the screens, in the reader's language.
 *
 * The banner, the two account buttons and the sign-in sheet live in
 * index.html and auth.js rather than in the template, so they were written
 * once, in English, and stayed English. With Arabic the default that put an
 * English warning about invented figures above an Arabic exchange — and left
 * the way in written in the language the reader had just not chosen.
 */
const CHROME = {
  en: {
    lead: 'You are looking at an invented market.',
    body: 'Every ticker, price and figure below is made up for the demo.'
      + ' Sign in to read what companies actually filed.',
    signIn: 'Sign in with email',
    signOut: 'Sign out',
  },
  ar: {
    lead: 'أنت تنظر إلى سوق مُتخيَّلة.',
    body: 'كل رمز وسعر ورقم بالأسفل مُختلَق للعرض التجريبي.'
      + ' سجّل الدخول لتقرأ ما أفصحت عنه الشركات فعلاً.',
    signIn: 'سجّل الدخول بالبريد',
    signOut: 'تسجيل الخروج',
  },
};

/** Put the page itself into the reader's language, chrome and all. */
function setChrome(lang) {
  const words = CHROME[lang] || CHROME.ar;
  // On <html>, not on the app's own root: it is what a screen reader reads
  // the page as, and what the browser hyphenates and quotes by.
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.getElementById('gate-lead').textContent = words.lead;
  document.getElementById('gate-body').textContent = words.body;
  document.getElementById('signin').textContent = words.signIn;
  document.getElementById('signout').textContent = words.signOut;
}
setChrome(component.state.lang);

/** Swap the whole dataset — demo for signed-out, the exchange for signed-in. */
let loadVersion = 0;
async function load(email) {
  const version = ++loadVersion;
  if (!email) {
    component.setState({ dataLoading: false, dataError: false, extrasLoading: false, extrasError: false });
    component.setData(data.demo());
    return;
  }
  component.setState({ dataLoading: true, dataError: false });
  try {
    const base = await data.live();
    if (version !== loadVersion) return;
    component.setData(base);
    component.setState({ dataLoading: false });
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
    const attention = slice(data.attention(), (a) => ({ breadth: a.breadth }));
    component.setState({ extrasLoading: true, extrasError: false });
    await Promise.all([
      slice(data.news(), (feed) => ({ feed })),
      slice(data.newsProvenance(), (newsProvenance) => ({ newsProvenance })),
      slice(data.sectors(), (sectorCards) => ({ sectorCards })),
      slice(data.filedMonths(), (filedMonths) => ({ filedMonths })),
      slice(data.disclosureMeanings(), (disclosureMeanings) => ({ disclosureMeanings })),
      slice(data.connections(), (crossings) => ({ crossings })),
      slice(data.investors(), (investors) => ({ investors })),
      slice(data.indices(), (idx) => ({ indexMembers: idx.list })),
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
      component.setData(data.demo());
      component.setState({ dataError:false });
    }
  }
}

/** Who is reading, for the watchlist's sake. Signed out has its own list. */
let reader = null;
component.onRetryData = () => load(reader);

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
  bar.hidden = Boolean(email);
  who.textContent = email || '';
  who.hidden = !email;
  // Both buttons live in the same corner and shell.css shows whichever the
  // reader needs; `hidden` alone would lose to the author rule, as it did on
  // the banner.
  document.getElementById('signin').hidden = Boolean(email);
  document.getElementById('signout').hidden = !email;
}

document.getElementById('signin').onclick = () =>
  openSignIn(async (email) => { setSigned(email); await load(email); },
    component.state.lang);

document.getElementById('signout').onclick = async () => {
  await signOut();
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

  const template = await readResponse('./template.html', {}, (response) => {
    if (!response.ok) throw new Error('The page template could not load');
    return response.text();
  });
  component.state.dataLoading = true;
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
  let lastLang = component.state.lang;
  let lastTheme = component.state.theme || 'light';
  const syncNavigation = connectNavigation(component);
  component.onChange = () => {
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

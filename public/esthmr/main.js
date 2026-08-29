/* Boot: decide what this reader is allowed to see, then draw it. */
import { mount } from './dc.js';
import { Component } from './logic.js';
import * as data from './data.js';
import { whoami, openSignIn, signOut } from './auth.js';

const root = document.getElementById('app');
const component = new Component({ accent: 'var(--accent)' });

/** Swap the whole dataset — demo for signed-out, the exchange for signed-in. */
async function load(email) {
  if (!email) {
    component.setData(data.demo());
    return;
  }
  try {
    const base = await data.live();
    component.setData(base);
    // The rest of the screens, in parallel and each on its own: one document
    // failing should cost that screen its content, not the whole session.
    const [feed, prov, cal, ex, secs, att, months] = await Promise.all([
      data.news().catch(() => null),
      data.newsProvenance().catch(() => null),
      data.calendar().catch(() => null),
      data.exchange().catch(() => null),
      data.sectors().catch(() => null),
      data.attention().catch(() => null),
      data.filedMonths().catch(() => null),
    ]);
    component.setData({
      ...base,
      feed: feed || undefined,
      newsProvenance: prov || undefined,
      filedEvents: cal ? cal.filed : undefined,
      expectedEvents: cal ? cal.expected : undefined,
      rates: ex ? ex.rates : undefined,
      macro: ex ? ex.macro : undefined,
      sectorCards: secs || undefined,
      // Home's two headline blocks. Both are assembled here because each needs
      // documents two different screens already fetch, and asking for them
      // twice would spend a reader's hourly allowance on nothing.
      indices: ex ? data.indexCards(ex.indexLevels, att && att.history) : undefined,
      readNow: data.readNowCards(att && att.signals, cal && cal.expectedTotal,
        cal && cal.expectedFrom),
      breadth: att ? att.breadth : undefined,
      filedMonths: months || undefined,
    });
  } catch (error) {
    // A session that expired mid-visit drops back to the demo rather than an
    // empty screen, and says so.
    console.warn('[esthmr] falling back to the demo:', error.message);
    component.setData(data.demo());
    setSigned(null);
  }
}

/** The chrome that reflects who is reading: a banner, and the button's job. */
function setSigned(email) {
  // The attribute carries the meaning for anything reading the page aloud;
  // shell.css is what actually takes the banner off screen, because an author
  // `display` rule beats `hidden` and .gate has one.
  document.body.dataset.signed = email ? 'yes' : 'no';
  const bar = document.getElementById('gate');
  const who = document.getElementById('who');
  bar.hidden = Boolean(email);
  who.textContent = email || '';
  who.hidden = !email;
}

document.getElementById('signin').onclick = () =>
  openSignIn(async (email) => { setSigned(email); await load(email); });

document.getElementById('signout').onclick = async () => {
  await signOut();
  setSigned(null);
  await load(null);
};

(async () => {
  const template = await (await fetch('./template.html')).text();
  const email = await whoami();
  setSigned(email);
  await load(email);
  mount(template, root, component);

  // Choosing a month loads that month of the filed archive. The pills used to
  // change a state field nothing read, so every month showed the same twelve
  // rows drawn from calendar.json.
  let month = null;
  const loadMonth = (wanted) => {
    if (!wanted || wanted === month || component.data().demo) return;
    month = wanted;
    data.filedMonth(wanted)
      .then((items) => {
        if (component.state.month !== wanted) return;
        component._d = { ...component.data(), filedArchive: items, filedArchiveMonth: wanted };
        draw();
      })
      .catch((error) => console.warn('[esthmr] month', wanted, error.message));
  };

  // Opening a company loads its document; the screens redraw when it lands.
  let loading = null;
  const draw = component.onChange;
  component.onChange = () => {
    loadMonth(component.state.month);
    const wanted = component.state.ticker;
    if (wanted && wanted !== loading
        && (!component._co || component._co.ticker !== wanted)
        && !component.data().demo) {
      loading = wanted;
      data.company(wanted)
        .then((doc) => {
          const row = component.data().companies.find((c) => c.ticker === wanted) || {};
          component._co = { ticker: wanted, ...doc, close: row.close, pct: row.pct };
          component._d = { ...component.data(), series: doc.series, fins: doc.fins,
            review: doc.review };
          draw();
          // Its signals and its filings follow; they are extra, so a company
          // without either still shows its statements.
          data.companyExtras(wanted).then((extra) => {
            if (component.state.ticker !== wanted) return;
            component._d = {
              ...component.data(),
              signals: extra.signals || undefined,
              filings: extra.filings || undefined,
            };
            draw();
          }).catch(() => {});
        })
        .catch((error) => console.warn('[esthmr]', wanted, error.message));
    }
    draw();
  };
})();

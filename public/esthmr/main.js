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
    component.setData(await data.live());
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

  // Opening a company loads its document; the screens redraw when it lands.
  let loading = null;
  const draw = component.onChange;
  component.onChange = () => {
    const wanted = component.state.ticker;
    if (wanted && wanted !== loading
        && (!component._co || component._co.ticker !== wanted)
        && !component.data().demo) {
      loading = wanted;
      data.company(wanted)
        .then((doc) => {
          const row = component.data().companies.find((c) => c.ticker === wanted) || {};
          component._co = { ticker: wanted, ...doc, close: row.close, pct: row.pct };
          component._d = { ...component.data(), series: doc.series, fins: doc.fins };
          draw();
        })
        .catch((error) => console.warn('[esthmr]', wanted, error.message));
    }
    draw();
  };
})();

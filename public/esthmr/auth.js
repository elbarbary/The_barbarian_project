/* Sign in with an email and a six-digit code. No password, no account table.
 *
 * A code proves control of an inbox, which is all this needs to know. Nothing
 * is stored that could leak, and there is nothing for a reader to reset.
 *
 * The gate is deliberately not a wall in front of the product: a signed-out
 * reader gets the whole site running on an invented exchange, so they can see
 * exactly what they would be signing in for. The button says what changes.
 */
import { readResponse } from './requests.js';
const API = '/esthmr/api/auth';

/* The challenge in front of the mail sender.
 *
 * /auth/request sends an email on every call, which makes it the one place
 * here where an abuser spends somebody else's money and fills a stranger's
 * inbox. The widget is rendered explicitly rather than by class, because the
 * sheet stays on screen after a failed attempt and a Turnstile token is
 * redeemed exactly once — a second submit with the first token is refused,
 * and looks to the reader like a sign-in that stopped working.
 */
const SITEKEY = '0x4AAAAAAEjzvIH3DBUY0QbA';
const TURNSTILE_JS = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

/** The script, loaded once and only when somebody opens the sheet. */
let turnstileReady = null;
function loadTurnstile() {
  if (turnstileReady) return turnstileReady;
  turnstileReady = new Promise((resolve, reject) => {
    if (window.turnstile) return resolve(window.turnstile);
    const tag = document.createElement('script');
    tag.src = TURNSTILE_JS;
    tag.async = true;
    tag.defer = true;
    tag.onload = () => resolve(window.turnstile);
    tag.onerror = () => reject(new Error('turnstile'));
    document.head.appendChild(tag);
  });
  return turnstileReady;
}

async function post(path, body) {
  return readResponse(API + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(body || {}),
  }, async (response) => {
  let payload = {};
  try { payload = await response.json(); } catch { /* empty body is fine */ }
  if (!response.ok) throw new Error(payload.error || `signin failed (${response.status})`);
  return payload;
  }, 60000);
}

export async function whoami() {
  try {
    return await readResponse(API + '/me', { credentials: 'same-origin' }, async (response) => {
    return response.ok ? (await response.json()).email : null;
    });
  } catch {
    return null;
  }
}

export const requestCode = (email, turnstile) =>
  post('/request', turnstile ? { email, turnstile } : { email });
export const verifyCode = (email, code) => post('/verify', { email, code });
export const signOut = () => post('/signout');

/* The sheet, in both languages. It was written once in English and stayed
 * English after Arabic became the default — so the one screen standing between
 * a reader and the exchange was the one screen not in their language. */
const WORDS = {
  en: {
    title: 'See the real exchange',
    lead: 'You are looking at an invented market. Sign in with your email and we '
      + 'will send a six-digit code — no password to choose, and nothing to remember.',
    email: 'Email', send: 'Send me a code',
    code: 'The six digits we just sent', go: 'Sign in',
    back: 'Use a different email', busy: 'One moment…', close: 'Close',
  },
  ar: {
    title: 'اطّلع على البورصة الحقيقية',
    lead: 'أنت تنظر إلى سوق مُتخيَّلة. سجّل الدخول ببريدك ونرسل لك رمزاً من ستة '
      + 'أرقام \u2014 بلا كلمة سر تختارها ولا شيء تحفظه.',
    email: 'البريد الإلكتروني', send: 'أرسل لي الرمز',
    code: 'الأرقام الستة التي أرسلناها', go: 'تسجيل الدخول',
    back: 'استخدم بريداً آخر', busy: 'لحظة…', close: 'إغلاق',
  },
};

/* The reasons the worker gives, in the reader's language.
 *
 * The endpoint answers in short fixed strings, and every one of them reached
 * the sheet in English — so the only moment the site speaks to a reader
 * directly, when something has gone wrong, was the one moment it changed
 * language. Mapped by the exact reply, so an unmapped one still shows rather
 * than being swallowed: a reason nobody translated beats no reason at all.
 */
const REASONS = {
  ar: {
    email: 'هذا البريد لا يبدو صحيحاً.',
    code: 'الرمز ستة أرقام.',
    'that code is not right': 'هذا الرمز غير صحيح.',
    'too many requests': 'طلبات كثيرة. جرّب بعد قليل.',
    'too many attempts': 'محاولات كثيرة. جرّب بعد قليل.',
    'could not send the code': 'تعذّر إرسال الرمز. جرّب مرة أخرى.',
  },
  en: {
    email: 'That email does not look right.',
    code: 'The code is six digits.',
  },
};

/** The sign-in sheet. Resolves with the email once a code has been accepted. */
export function openSignIn(onDone, lang) {
  const t = WORDS[lang] || WORDS.ar;
  const existing = document.getElementById('esthmr-signin');
  if (existing) existing.remove();

  const wrap = document.createElement('div');
  wrap.id = 'esthmr-signin';
  // The sheet carries its own direction: it is appended to <body>, and a form
  // in Arabic under an English page reads with its labels on the wrong side.
  wrap.dir = (WORDS[lang] ? lang : 'ar') === 'ar' ? 'rtl' : 'ltr';
  wrap.innerHTML = `
    <div class="si-scrim"></div>
    <div class="si-sheet" role="dialog" aria-modal="true" aria-labelledby="si-title">
      <h2 id="si-title">${t.title}</h2>
      <p class="si-lead">${t.lead}</p>
      <form class="si-step" data-step="email">
        <label for="si-email">${t.email}</label>
        <input id="si-email" type="email" autocomplete="email" required dir="ltr"
               placeholder="you@example.com" />
        <div id="si-turnstile" class="si-turnstile"></div>
        <button type="submit">${t.send}</button>
      </form>
      <form class="si-step" data-step="code" hidden>
        <label for="si-code">${t.code}</label>
        <input id="si-code" inputmode="numeric" autocomplete="one-time-code" dir="ltr"
               pattern="\\d{6}" maxlength="6" required placeholder="000000" />
        <button type="submit">${t.go}</button>
        <button type="button" class="si-back">${t.back}</button>
      </form>
      <p class="si-error" role="alert" hidden></p>
      <button class="si-close" aria-label="${t.close}">×</button>
    </div>`;
  document.body.appendChild(wrap);

  const steps = wrap.querySelectorAll('.si-step');
  const error = wrap.querySelector('.si-error');
  /* Closing the sheet, and undoing everything opening it did.
   *
   * `close` used to be `wrap.remove()` and nothing else, while the Escape
   * handler below removed itself ONLY when Escape was the thing that closed
   * the sheet. Close it with the × or the scrim — which is how it is usually
   * closed — and the listener stayed on `document` for the life of the page,
   * one more each time the sheet was opened. Every one of them still held a
   * `close` bound to a `wrap` no longer in the document, so a later Escape
   * ran them all against detached nodes.
   *
   * Focus is put back where it came from, because a reader who dismisses a
   * dialog and finds the caret at the top of the document has lost their
   * place — and a keyboard reader has lost it completely. */
  const opener = document.activeElement;
  const close = () => {
    document.removeEventListener('keydown', onKey, true);
    wrap.remove();
    if (opener && document.contains(opener) && typeof opener.focus === 'function') {
      opener.focus();
    }
  };

  /* Escape closes; Tab stays inside.
   *
   * The sheet says `role="dialog"` and `aria-modal="true"`, which tells a
   * screen reader that the rest of the page is inert — but nothing was making
   * that true. Fifty-one focusable controls behind the scrim were still in the
   * tab order, so a keyboard or switch reader tabbed straight out of a modal
   * they were told was modal, into a page they could not see, and typed into a
   * search box behind a scrim. `aria-modal` is a promise; this keeps it.
   *
   * Captured, so it runs before anything inside the sheet can stop it. */
  const focusable = () => [...wrap.querySelectorAll(
    'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])',
  )].filter((el) => el.offsetParent !== null || el === document.activeElement);
  /* Tab is moved by hand, every time.
   *
   * Two gentler versions of this did not hold. Wrapping only at the first and
   * last of `focusable()` assumes the browser walks the sheet in the order
   * `querySelectorAll` returns, and with the challenge widget present it does
   * not: a Tab out of the email field went past the submit button to `body`,
   * because the widget's hidden input and iframe sit in the ring between them.
   * A `focusin` backstop then failed for a plainer reason — tabbing past the
   * last control leaves the document altogether, so nothing receives focus and
   * `focusin` never fires at all.
   *
   * So the ring is not predicted or corrected: it is the list below, walked
   * here, with the default suppressed. `aria-modal="true"` is on this sheet,
   * and this is what makes it true. */
  function onKey(e) {
    if (e.key === 'Escape') { close(); return; }
    if (e.key !== 'Tab') return;
    const inside = focusable();
    if (!inside.length) return;
    e.preventDefault();
    const at = inside.indexOf(document.activeElement);
    const step = e.shiftKey ? -1 : 1;
    // Focus outside the sheet enters at the near end rather than the far one.
    const next = at === -1
      ? (e.shiftKey ? inside.length - 1 : 0)
      : (at + step + inside.length) % inside.length;
    inside[next].focus();
  }

  document.addEventListener('keydown', onKey, true);

  /* The widget, rendered explicitly so its id can be kept and reset.
   *
   * Failing to load must not lock a reader out: the server only insists on a
   * token when the browser sends an Origin it recognises, so a challenge that
   * never appeared would refuse a sign-in the reader can do nothing about.
   * The submit goes ahead with no token and the server answers — which is the
   * same shape as any other outage, and visible rather than silent.
   */
  let widgetId = null;
  loadTurnstile()
    .then((ts) => {
      const slot = wrap.querySelector('#si-turnstile');
      if (!ts || !slot) return;
      widgetId = ts.render(slot, {
        sitekey: SITEKEY,
        action: 'signin',
        // The sheet's own language, so the challenge does not arrive in
        // English over an Arabic form.
        language: (WORDS[lang] ? lang : 'ar'),
        theme: 'light',
      });
    })
    .catch(() => { /* the server will say so */ });

  let email = '';
  const busy = (form, on, label) => {
    const button = form.querySelector('button[type=submit]');
    button.disabled = on;
    button.textContent = on ? t.busy : label;
  };

  steps[0].onsubmit = async (e) => {
    e.preventDefault();
    email = wrap.querySelector('#si-email').value.trim();
    busy(steps[0], true, t.send);
    try {
      await requestCode(email, token());
      step('code');
    } catch (err) {
      fail(err.message);
    } finally {
      // A token is redeemed exactly once. Whether the request succeeded or
      // not, the one on screen is now spent, and a reader who tries again
      // with it would be refused for a reason they cannot see.
      if (widgetId !== null && window.turnstile) window.turnstile.reset(widgetId);
      busy(steps[0], false, t.send);
    }
  };

  steps[1].onsubmit = async (e) => {
    e.preventDefault();
    busy(steps[1], true, t.go);
    try {
      const { email: who } = await verifyCode(email, wrap.querySelector('#si-code').value.trim());
      close();
      onDone(who);
    } catch (err) {
      fail(err.message);
    } finally {
      busy(steps[1], false, t.go);
    }
  };

  step('email');
}

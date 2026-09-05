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
  const close = () => wrap.remove();
  const said = (WORDS[lang] ? lang : 'ar');
  /** Whatever the widget currently holds, or '' if it holds nothing. */
  const token = () => {
    try {
      return (widgetId !== null && window.turnstile
        ? window.turnstile.getResponse(widgetId) : '') || '';
    } catch { return ''; }
  };
  const fail = (message) => {
    error.textContent = (REASONS[said] || {})[message] || message;
    error.hidden = false;
  };
  const step = (name) => {
    steps.forEach((f) => { f.hidden = f.dataset.step !== name; });
    error.hidden = true;
    wrap.querySelector(name === 'email' ? '#si-email' : '#si-code').focus();
  };

  wrap.querySelector('.si-close').onclick = close;
  wrap.querySelector('.si-scrim').onclick = close;
  wrap.querySelector('.si-back').onclick = () => step('email');
  document.addEventListener('keydown', function esc(e) {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); }
  });

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

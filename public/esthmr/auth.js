/* Sign in with an email and a six-digit code. No password, no account table.
 *
 * A code proves control of an inbox, which is all this needs to know. Nothing
 * is stored that could leak, and there is nothing for a reader to reset.
 *
 * The gate is deliberately not a wall in front of the product: a signed-out
 * reader gets the whole site running on an invented exchange, so they can see
 * exactly what they would be signing in for. The button says what changes.
 */
const API = '/esthmr/api/auth';

async function post(path, body) {
  const response = await fetch(API + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(body || {}),
  });
  let payload = {};
  try { payload = await response.json(); } catch { /* empty body is fine */ }
  if (!response.ok) throw new Error(payload.error || `signin failed (${response.status})`);
  return payload;
}

export async function whoami() {
  try {
    const response = await fetch(API + '/me', { credentials: 'same-origin' });
    return response.ok ? (await response.json()).email : null;
  } catch {
    return null;
  }
}

export const requestCode = (email) => post('/request', { email });
export const verifyCode = (email, code) => post('/verify', { email, code });
export const signOut = () => post('/signout');

/** The sign-in sheet. Resolves with the email once a code has been accepted. */
export function openSignIn(onDone) {
  const existing = document.getElementById('esthmr-signin');
  if (existing) existing.remove();

  const wrap = document.createElement('div');
  wrap.id = 'esthmr-signin';
  wrap.innerHTML = `
    <div class="si-scrim"></div>
    <div class="si-sheet" role="dialog" aria-modal="true" aria-labelledby="si-title">
      <h2 id="si-title">See the real exchange</h2>
      <p class="si-lead">You are looking at an invented market. Sign in with your
        email and we will send a six-digit code — no password to choose, and
        nothing to remember.</p>
      <form class="si-step" data-step="email">
        <label for="si-email">Email</label>
        <input id="si-email" type="email" autocomplete="email" required
               placeholder="you@example.com" />
        <button type="submit">Send me a code</button>
      </form>
      <form class="si-step" data-step="code" hidden>
        <label for="si-code">The six digits we just sent</label>
        <input id="si-code" inputmode="numeric" autocomplete="one-time-code"
               pattern="\\d{6}" maxlength="6" required placeholder="000000" />
        <button type="submit">Sign in</button>
        <button type="button" class="si-back">Use a different email</button>
      </form>
      <p class="si-error" role="alert" hidden></p>
      <button class="si-close" aria-label="Close">×</button>
    </div>`;
  document.body.appendChild(wrap);

  const steps = wrap.querySelectorAll('.si-step');
  const error = wrap.querySelector('.si-error');
  const close = () => wrap.remove();
  const fail = (message) => { error.textContent = message; error.hidden = false; };
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

  let email = '';
  const busy = (form, on, label) => {
    const button = form.querySelector('button[type=submit]');
    button.disabled = on;
    button.textContent = on ? 'One moment…' : label;
  };

  steps[0].onsubmit = async (e) => {
    e.preventDefault();
    email = wrap.querySelector('#si-email').value.trim();
    busy(steps[0], true, 'Send me a code');
    try {
      await requestCode(email);
      step('code');
    } catch (err) {
      fail(err.message);
    } finally {
      busy(steps[0], false, 'Send me a code');
    }
  };

  steps[1].onsubmit = async (e) => {
    e.preventDefault();
    busy(steps[1], true, 'Sign in');
    try {
      const { email: who } = await verifyCode(email, wrap.querySelector('#si-code').value.trim());
      close();
      onDone(who);
    } catch (err) {
      fail(err.message);
    } finally {
      busy(steps[1], false, 'Sign in');
    }
  };

  step('email');
}

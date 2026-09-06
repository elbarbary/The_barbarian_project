import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

/* Every function the sign-in sheet calls actually exists.
 *
 * `signin-controls.test.mjs` checks this file by matching source text, and
 * that is precisely why it passed while sign-in was dead: the commit that
 * added the focus trap deleted `step`, `fail` and `token`, the regexes it
 * asserts were all still present, and the suite stayed green for the whole
 * time no reader could get in.
 *
 * A missing function is invisible until the line runs. `node --check` will not
 * see it — the file parses perfectly — and neither will any test that reads
 * the source as a string. So this resolves the calls instead: every name
 * invoked as `name(...)` must be declared somewhere, imported, or a real
 * global. That is the whole bug class, not just the three that got deleted.
 */
const source = await readFile(
  new URL('../../public/esthmr/auth.js', import.meta.url), 'utf8');

/** Source with comments and string/template literals removed.
 *
 * Without this, prose in a comment ("a `focusin` backstop then failed...")
 * and the sheet's own HTML template both look like code, and the check drowns
 * in names that are not calls at all. */
function code(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ')
    .replace(/`(?:\\[\s\S]|\$\{[^}]*\}|[^\\`])*`/g, '``')
    .replace(/'(?:\\.|[^'\\])*'/g, "''")
    .replace(/"(?:\\.|[^"\\])*"/g, '""');
}

/** Names declared anywhere in the module: bindings, functions, params, imports. */
function declared(text) {
  const names = new Set();
  const add = (n) => { if (n) names.add(n); };
  for (const m of text.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g)) add(m[1]);
  for (const m of text.matchAll(/\bfunction\s*\*?\s*([A-Za-z_$][\w$]*)/g)) add(m[1]);
  for (const m of text.matchAll(/\bclass\s+([A-Za-z_$][\w$]*)/g)) add(m[1]);
  // import { a, b as c } from '...'  and  import d from '...'
  for (const m of text.matchAll(/\bimport\s*\{([^}]*)\}/g)) {
    for (const part of m[1].split(',')) {
      const bits = part.trim().split(/\s+as\s+/);
      add((bits[bits.length - 1] || '').trim());
    }
  }
  for (const m of text.matchAll(/\bimport\s+([A-Za-z_$][\w$]*)\s+from/g)) add(m[1]);
  // Destructured bindings: const { email: who } = ..., const [a, b] = ...
  for (const m of text.matchAll(/\b(?:const|let|var)\s*\{([^}]*)\}/g)) {
    for (const part of m[1].split(',')) {
      const bits = part.trim().split(':');
      add((bits[bits.length - 1] || '').trim().replace(/=.*$/, '').trim());
    }
  }
  // Parameters, including arrow-function ones.
  for (const m of text.matchAll(/(?:function\s*\*?\s*[\w$]*\s*)?\(([^()]*)\)\s*(?:=>|\{)/g)) {
    for (const part of m[1].split(',')) {
      const name = part.trim().replace(/=.*$/, '').replace(/^\.\.\./, '').trim();
      if (/^[A-Za-z_$][\w$]*$/.test(name)) add(name);
    }
  }
  for (const m of text.matchAll(/(?:^|[^\w$.])([A-Za-z_$][\w$]*)\s*=>/gm)) add(m[1]);
  for (const m of text.matchAll(/\bcatch\s*\(\s*([A-Za-z_$][\w$]*)/g)) add(m[1]);
  return names;
}

// Things the browser provides. Deliberately short: a name that belongs here
// and is missing shows up as a failure, which is the safe direction.
const GLOBALS = new Set([
  'window', 'document', 'fetch', 'Response', 'Request', 'Promise', 'Error',
  'JSON', 'Object', 'Array', 'String', 'Number', 'Boolean', 'Math', 'Date',
  'Set', 'Map', 'RegExp', 'Symbol', 'BigInt', 'AbortSignal', 'AbortController',
  'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'crypto',
  'console', 'navigator', 'location', 'localStorage', 'sessionStorage',
  'URL', 'URLSearchParams', 'FormData', 'Headers', 'TextEncoder', 'atob', 'btoa',
  'parseInt', 'parseFloat', 'isNaN', 'encodeURIComponent', 'decodeURIComponent',
  'requestAnimationFrame', 'queueMicrotask', 'structuredClone',
  // Control-flow keywords that are followed by "(" and are not calls.
  'if', 'for', 'while', 'switch', 'catch', 'return', 'typeof', 'function',
  'await', 'super', 'this', 'new', 'else', 'do', 'try', 'import', 'yield',
  'of', 'in', 'delete', 'void', 'instanceof', 'case', 'async',
]);

test('every function the sheet calls is defined', () => {
  const body = code(source);
  const known = declared(body);
  const missing = new Set();
  // `name(` not preceded by a dot — a bare call, not a method.
  for (const m of body.matchAll(/(^|[^\w$.?])([A-Za-z_$][\w$]*)\s*\(/gm)) {
    const name = m[2];
    if (known.has(name) || GLOBALS.has(name)) continue;
    missing.add(name);
  }
  assert.deepEqual([...missing].sort(), [],
    `called but never defined in auth.js: ${[...missing].sort().join(', ')}`);
});

test('the sheet still has the four pieces that were deleted', () => {
  /* Named individually as well, because the resolver above would also go
   * quiet if somebody deleted the CALLS rather than the definitions — which
   * would leave a sheet that opens on the email step and can never leave it. */
  const body = code(source);
  /* At the sheet's own level, which is two spaces in.
   *
   * A bare "is `step` declared anywhere?" is not enough, and this is the exact
   * hole the original bug hid in: `onKey` has its own `const step = e.shiftKey
   * ? -1 : 1` for walking the tab ring, four spaces in and invisible to the
   * submit handler. Deleting the real helper leaves that one behind, so a
   * file-wide search still finds the name and reports everything fine while
   * every click throws. The indent is what tells the two apart. */
  for (const [name, why] of [
    ['step', 'nothing switches the sheet to the code step'],
    ['fail', 'no error the server returns can ever be shown'],
    ['token', 'the challenge token is never read, and the submit throws'],
    ['said', 'the reasons have no language to be written in'],
  ]) {
    assert.match(body, new RegExp(`^  (?:const|let|function)\\s+${name}\\b`, 'm'),
      `${name} is not defined in the sheet's scope: ${why}`);
    const uses = (body.match(new RegExp(`(^|[^\\w$.])${name}\\b`, 'gm')) || []).length;
    assert.ok(uses >= 2,
      `${name} is defined but nothing uses it (${uses} mention)`);
  }
});

test('the sheet can be dismissed by every control that offers to dismiss it', () => {
  // The same commit dropped these three. The × and the scrim are the only ways
  // out for a reader who does not know Escape works.
  // Raw source, not `code()`: the selectors are string literals, and stripping
  // strings would take the very names this is looking for.
  for (const sel of ['si-close', 'si-scrim', 'si-back']) {
    assert.match(source, new RegExp(`${sel}[^;]{0,60}\\.onclick`),
      `.${sel} is drawn but wired to nothing`);
  }
});
